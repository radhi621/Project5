'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import { authenticatedFetch } from '../../utils/api';

interface AiChatUser {
  _id: string;
  name: string;
  email: string;
}

interface AiChat {
  _id: string;
  userId: AiChatUser | string;
  title: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AiMessage {
  _id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  sources: string[];
  attachments: { filename: string; originalName: string; mimetype: string }[];
  createdAt: string;
}

export default function AdminAiChatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chats, setChats] = useState<AiChat[]>([]);
  const [filteredChats, setFilteredChats] = useState<AiChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<AiChat | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // URL params for pre-filtering
  const filterUserId = searchParams.get('userId') ?? '';
  const filterUserName = searchParams.get('userName') ?? '';
  const prefillChatId = searchParams.get('chatId') ?? '';

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Load chats
  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      let url = 'http://localhost:3001/api/chat/admin/all';
      if (filterUserId) {
        url = `http://localhost:3001/api/chat/admin/user/${filterUserId}`;
      }
      const response = await authenticatedFetch(url);
      if (response.ok) {
        const data: AiChat[] = await response.json();
        setChats(data);
      }
    } catch (error) {
      console.error('Error loading AI chats:', error);
    } finally {
      setLoading(false);
    }
  }, [filterUserId]);

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      loadChats();
    }
  }, [loadChats, authLoading, user]);

  // Filter chats by search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredChats(chats);
      return;
    }
    const term = searchTerm.toLowerCase();
    setFilteredChats(chats.filter((c) => c.title.toLowerCase().includes(term)));
  }, [chats, searchTerm]);

  // Auto-select chat from URL param
  useEffect(() => {
    if (prefillChatId && chats.length > 0 && !selectedChat) {
      const found = chats.find((c) => c._id === prefillChatId);
      if (found) selectChat(found);
    }
  }, [chats, prefillChatId]);

  const selectChat = async (chat: AiChat) => {
    setSelectedChat(chat);
    setMessages([]);
    setLoadingMessages(true);
    try {
      const response = await authenticatedFetch(`http://localhost:3001/api/chat/${chat._id}/messages`);
      if (response.ok) {
        const data: AiMessage[] = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const getChatUser = (chat: AiChat): AiChatUser | null =>
    typeof chat.userId === 'object' ? chat.userId : null;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <AdminSidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-1 rounded hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Chat History</h1>
            {filterUserName ? (
              <p className="text-sm text-gray-500">
                Showing chats for{' '}
                <span className="font-medium text-blue-600">{filterUserName}</span>
                &nbsp;·&nbsp;
                <button
                  onClick={() => router.push('/admin/ai-chats')}
                  className="text-gray-400 hover:text-gray-600 underline text-xs"
                >
                  show all
                </button>
              </p>
            ) : (
              <p className="text-sm text-gray-500">All AI diagnostic conversations</p>
            )}
          </div>
        </div>

        {/* Main content: split panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left panel: chat list */}
          <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                />
              </div>
            </div>

            {/* Chat list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="text-sm text-gray-400">No AI chats found</p>
                </div>
              ) : (
                filteredChats.map((chat) => (
                  <button
                    key={chat._id}
                    onClick={() => selectChat(chat)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedChat?._id === chat._id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{chat.title}</p>
                        {getChatUser(chat) && (
                          <p className="text-xs text-blue-600 font-medium truncate mt-0.5">
                            {getChatUser(chat)!.name}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(chat.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400 text-center">
                {filteredChats.length} conversation{filteredChats.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Right panel: messages */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedChat ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-1">Select a conversation</h3>
                <p className="text-sm text-gray-400">Choose a chat from the list to view the full AI conversation</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-gray-900 truncate">{selectedChat.title}</h2>
                      <div className="flex items-center gap-3 mt-0.5">
                        {getChatUser(selectedChat) ? (
                          <>
                            <span className="text-xs font-medium text-blue-600">{getChatUser(selectedChat)!.name}</span>
                            <span className="text-xs text-gray-400">{getChatUser(selectedChat)!.email}</span>
                          </>
                        ) : null}
                        <span className="text-xs text-gray-400">Started {formatDate(selectedChat.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-sm text-gray-400">No messages in this conversation</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg._id}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                        )}

                        <div className={`max-w-[70%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                          <div
                            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                              msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-sm'
                                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                            }`}
                          >
                            {/* Images */}
                            {msg.attachments?.length > 0 && (
                              <div className="mb-2 space-y-2">
                                {msg.attachments.map((att, i) =>
                                  att.mimetype?.startsWith('image/') ? (
                                    <img
                                      key={i}
                                      src={`http://localhost:3001/uploads/chat-files/${att.filename}`}
                                      alt={att.originalName}
                                      className="max-w-full rounded-lg max-h-48 object-contain"
                                    />
                                  ) : (
                                    <div key={i} className="flex items-center gap-2 text-xs bg-black/10 rounded px-2 py-1">
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                      </svg>
                                      {att.originalName}
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>

                          {/* Sources */}
                          {msg.role === 'assistant' && msg.sources?.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {msg.sources.map((src, i) => (
                                <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                  {src}
                                </span>
                              ))}
                            </div>
                          )}

                          <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-right text-blue-200' : 'text-gray-400'}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>

                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
