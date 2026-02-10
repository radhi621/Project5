'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import { authenticatedFetch } from '../../utils/api';

interface Message {
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'mechanic';
  content: string;
  timestamp: string;
}

interface ChatSession {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  mechanicId: string;
  mechanicName: string;
  mechanicEmail: string;
  status: 'pending' | 'active' | 'completed' | 'reopen-requested' | 'cancelled';
  messages: Message[];
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
}

export default function AdminChatsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<ChatSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }
    loadChats();
  }, [user, authLoading, router]);

  useEffect(() => {
    filterChats();
  }, [chats, searchTerm, statusFilter]);

  const loadChats = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('http://localhost:3001/api/mechanic-requests/admin/all');
      
      if (response.ok) {
        const data = await response.json();
        setChats(data);
      } else {
        console.error('Failed to load chats');
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterChats = () => {
    let filtered = [...chats];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (chat) =>
          chat.userName.toLowerCase().includes(term) ||
          chat.mechanicName.toLowerCase().includes(term) ||
          chat.userEmail.toLowerCase().includes(term) ||
          chat.mechanicEmail.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((chat) => chat.status === statusFilter);
    }

    setFilteredChats(filtered);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      'reopen-requested': 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const viewChatDetails = (chat: ChatSession) => {
    setSelectedChat(chat);
    setShowModal(true);
  };

  const getStats = () => {
    const total = chats.length;
    const active = chats.filter((c) => c.status === 'active').length;
    const completed = chats.filter((c) => c.status === 'completed').length;
    const pending = chats.filter((c) => c.status === 'pending').length;
    
    return { total, active, completed, pending };
  };

  const stats = getStats();

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chat history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Chat History</h1>
                <p className="text-xs sm:text-sm text-gray-500">All conversations between users and mechanics</p>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="px-3 sm:px-6 py-4 bg-white border-b border-gray-200">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
              <div className="text-xs sm:text-sm text-blue-600 font-medium mb-1">Total Chats</div>
              <div className="text-xl sm:text-2xl font-bold text-blue-900">{stats.total}</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg">
              <div className="text-xs sm:text-sm text-yellow-600 font-medium mb-1">Pending</div>
              <div className="text-xl sm:text-2xl font-bold text-yellow-900">{stats.pending}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
              <div className="text-xs sm:text-sm text-green-600 font-medium mb-1">Active</div>
              <div className="text-xl sm:text-2xl font-bold text-green-900">{stats.active}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
              <div className="text-xs sm:text-sm text-purple-600 font-medium mb-1">Completed</div>
              <div className="text-xl sm:text-2xl font-bold text-purple-900">{stats.completed}</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-3 sm:px-6 py-4 bg-white border-b border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <input
                type="text"
                placeholder="Search by user or mechanic name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="reopen-requested">Reopen Requested</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-auto px-3 sm:px-6 py-4">
          {filteredChats.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No chats found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredChats.map((chat) => (
                <div
                  key={chat._id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => viewChatDetails(chat)}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(chat.status)}`}>
                              {chat.status}
                            </span>
                            <span className="text-xs text-gray-500">{formatDate(chat.createdAt)}</span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-700">User:</span>
                              <span className="text-gray-900">{chat.userName}</span>
                              <span className="text-gray-500">({chat.userEmail})</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-700">Mechanic:</span>
                              <span className="text-gray-900">{chat.mechanicName}</span>
                              <span className="text-gray-500">({chat.mechanicEmail})</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {chat.messages.length} messages
                        </span>
                        {chat.acceptedAt && (
                          <span>Accepted: {formatDate(chat.acceptedAt)}</span>
                        )}
                        {chat.completedAt && (
                          <span>Completed: {formatDate(chat.completedAt)}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        viewChatDetails(chat);
                      }}
                      className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Details Modal */}
      {showModal && selectedChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Chat Details</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedChat.userName} ↔️ {selectedChat.mechanicName}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto px-6 py-4">
              {/* Chat Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedChat.status)}`}>
                      {selectedChat.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Created:</span>
                    <span className="ml-2 text-gray-900">{formatDate(selectedChat.createdAt)}</span>
                  </div>
                  {selectedChat.acceptedAt && (
                    <div>
                      <span className="font-medium text-gray-700">Accepted:</span>
                      <span className="ml-2 text-gray-900">{formatDate(selectedChat.acceptedAt)}</span>
                    </div>
                  )}
                  {selectedChat.completedAt && (
                    <div>
                      <span className="font-medium text-gray-700">Completed:</span>
                      <span className="ml-2 text-gray-900">{formatDate(selectedChat.completedAt)}</span>
                    </div>
                  )}
                  {selectedChat.userPhone && (
                    <div>
                      <span className="font-medium text-gray-700">User Phone:</span>
                      <span className="ml-2 text-gray-900">{selectedChat.userPhone}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-700">Total Messages:</span>
                    <span className="ml-2 text-gray-900">{selectedChat.messages.length}</span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Conversation</h3>
                {selectedChat.messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No messages exchanged yet
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {selectedChat.messages.map((message, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          message.senderRole === 'user'
                            ? 'bg-blue-50 border border-blue-100'
                            : 'bg-green-50 border border-green-100'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              message.senderRole === 'user'
                                ? 'bg-blue-200 text-blue-800'
                                : 'bg-green-200 text-green-800'
                            }`}>
                              {message.senderRole === 'user' ? 'User' : 'Mechanic'}
                            </span>
                            <span className="font-medium text-sm text-gray-900">
                              {message.senderName}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(message.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
