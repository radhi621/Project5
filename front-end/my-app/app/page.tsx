'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './contexts/AuthContext';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import Sidebar from './components/Sidebar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Chat {
  id: string;
  title: string;
  timestamp: string;
  messages: Message[];
}

export default function Home() {
  const router = useRouter();
  const { user, logout, isLoading: authLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showRequestMechanicModal, setShowRequestMechanicModal] = useState(false);
  const [requestingMechanic, setRequestingMechanic] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const loadChats = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const chatData = await response.json();
        setChats(chatData.map((chat: any) => ({
          id: chat._id,
          title: chat.title,
          timestamp: chat.createdAt,
          messages: [],
        })));
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  }, []);

  // Load user's chats on mount
  useEffect(() => {
    if (user) {
      loadChats();
    }
  }, [user, loadChats]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const currentChat = chats.find(chat => chat.id === currentChatId);
  const messages = currentChat?.messages || [];

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  const generateChatTitle = (firstMessage: string): string => {
    const words = firstMessage.split(' ').slice(0, 6).join(' ');
    return words.length < firstMessage.length ? words + '...' : words;
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setIsSidebarOpen(false);
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/chat/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        setChats(prev => prev.filter(chat => chat.id !== chatId));
        if (currentChatId === chatId) {
          setCurrentChatId(null);
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!content.trim() && (!files || files.length === 0)) return;

    try {
      setIsLoading(true);
      
      let chatId = currentChatId;

      // Create new chat if none exists
      if (!chatId) {
        const title = generateChatTitle(content || 'Image upload');
        const response = await fetch('http://localhost:3001/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({ title }),
        });

        if (!response.ok) throw new Error('Failed to create chat');
        
        const newChat = await response.json();
        chatId = newChat._id;

        setChats(prev => [{
          id: chatId,
          title,
          timestamp: new Date().toISOString(),
          messages: [],
        }, ...prev]);
        setCurrentChatId(chatId);
      }

      // Prepare FormData for file upload
      const formData = new FormData();
      formData.append('chatId', chatId);
      formData.append('content', content || 'Analyzing uploaded files...');
      
      if (files && files.length > 0) {
        files.forEach(file => {
          formData.append('files', file);
        });
      }

      // Send message and get AI response
      const messageResponse = await fetch('http://localhost:3001/api/chat/message', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: formData,
      });

      if (!messageResponse.ok) throw new Error('Failed to send message');
      
      const { userMessage, aiMessage } = await messageResponse.json();

      // Update chat with both messages
      setChats(prev => prev.map(chat => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: [
              ...chat.messages,
              {
                id: userMessage._id,
                role: 'user' as const,
                content: userMessage.content,
                timestamp: userMessage.createdAt,
              },
              {
                id: aiMessage._id,
                role: 'assistant' as const,
                content: aiMessage.content,
                timestamp: aiMessage.createdAt,
              },
            ],
          };
        }
        return chat;
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectChat = async (chatId: string) => {
    setCurrentChatId(chatId);
    setIsSidebarOpen(false);

    // Load messages if not already loaded
    const chat = chats.find(c => c.id === chatId);
    if (chat && chat.messages.length === 0) {
      try {
        const response = await fetch(`http://localhost:3001/api/chat/${chatId}/messages`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (response.ok) {
          const messages = await response.json();
          setChats(prev => prev.map(c => {
            if (c.id === chatId) {
              return {
                ...c,
                messages: messages.map((msg: any) => ({
                  id: msg._id,
                  role: msg.role,
                  content: msg.content,
                  timestamp: msg.createdAt,
                })),
              };
            }
            return c;
          }));
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    }
  };

  const handleRequestMechanic = async () => {
    if (!currentChatId || messages.length === 0) {
      alert('Please have a conversation before requesting mechanic help.');
      return;
    }

    try {
      setRequestingMechanic(true);
      const response = await fetch('http://localhost:3001/api/mechanic-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          userName: user.name,
          userEmail: user.email,
          userPhone: user.phone || '',
          chatHistory: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
          })),
        }),
      });

      if (response.ok) {
        setShowRequestMechanicModal(false);
        alert('Mechanic help requested successfully! Available mechanics will review your chat and respond.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        throw new Error(errorData.message || 'Failed to request mechanic');
      }
    } catch (error) {
      console.error('Error requesting mechanic:', error);
      alert(`Failed to request mechanic. ${error.message || 'Please try again.'}`);
    } finally {
      setRequestingMechanic(false);
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />

      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-semibold text-gray-900 truncate">
                {currentChat?.title || 'AutoDiag AI'}
              </h2>
              <p className="hidden sm:block text-xs text-gray-500">AI-powered automotive diagnostics</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button 
              onClick={() => router.push('/requests')}
              className="flex items-center gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="My Requests"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span className="hidden md:inline">My Requests</span>
            </button>
            {user.role === 'admin' && (
              <button 
                onClick={() => router.push('/admin')} 
                className="flex items-center gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                title="Admin Dashboard"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden lg:inline">Admin</span>
              </button>
            )}
            {user.role === 'mechanic' && (
              <button 
                onClick={() => router.push('/mechanic/dashboard')} 
                className="flex items-center gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                title="My Dashboard"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="hidden lg:inline">Dashboard</span>
              </button>
            )}
            <button 
              onClick={() => setShowRequestMechanicModal(true)}
              disabled={!currentChatId || messages.length === 0}
              className="flex items-center gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
              title="Request Mechanic"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <span className="hidden xl:inline">Mechanic</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full overflow-y-auto px-3 sm:px-4 py-4 sm:py-6">
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-4 sm:mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 mb-2 sm:mb-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl">
                    <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 7H7v6h6V7z" />
                      <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1.5 sm:mb-2">
                    Welcome to AutoDiag AI
                  </h1>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-4 sm:mb-6">
                    Your intelligent automotive diagnostic assistant. Describe your car issues and get instant, accurate diagnostics.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
                  {[
                    {
                      icon: (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ),
                      title: 'Accurate Diagnostics',
                      description: 'AI-powered analysis of your vehicle issues'
                    },
                    {
                      icon: (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ),
                      title: 'Save Time',
                      description: 'Get preliminary diagnosis before visiting'
                    },
                    {
                      icon: (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ),
                      title: 'Cost Estimates',
                      description: 'Understand potential repair costs upfront'
                    },
                    {
                      icon: (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      ),
                      title: 'Easy Scheduling',
                      description: 'Book appointments with trusted mechanics'
                    },
                  ].map((feature, index) => (
                    <div key={index} className="p-2.5 sm:p-3 lg:p-4 bg-gray-50 rounded-lg text-left">
                      <div className="text-blue-600 mb-1 sm:mb-1.5 flex items-center">
                        <div className="w-5 h-5 sm:w-6 sm:h-6">{feature.icon}</div>
                      </div>
                      <h3 className="text-xs sm:text-sm lg:text-base font-semibold text-gray-900 mb-0.5 sm:mb-1">{feature.title}</h3>
                      <p className="text-[11px] sm:text-xs lg:text-sm text-gray-600 leading-tight">{feature.description}</p>
                    </div>
                  ))}
                </div>

                <div className="text-left bg-blue-50 border border-blue-200 rounded-lg p-2.5 sm:p-3 lg:p-4">
                  <h3 className="text-xs sm:text-sm font-semibold text-blue-900 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Example Questions
                  </h3>
                  <ul className="text-[11px] sm:text-xs lg:text-sm text-blue-800 space-y-0.5 sm:space-y-1">
                    <li>• "My check engine light came on and the car is idling rough"</li>
                    <li>• "There's a squealing noise when I brake"</li>
                    <li>• "My car is overheating, what could be the problem?"</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <ChatMessage
                  key={`message-${message.id}-${index}`}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                />
              ))}
              {isLoading && (
                <div className="flex gap-4 px-4 py-6 bg-gray-50">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600 text-white">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 7H7v6h6V7z" />
                        <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-2">AutoDiag AI</div>
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
      </div>

      {/* Request Mechanic Modal */}
      {showRequestMechanicModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Request Mechanic Assistance</h2>
              <button onClick={() => setShowRequestMechanicModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 sm:p-4">
                <div className="flex gap-2 sm:gap-3">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-sm sm:text-base font-semibold text-orange-900 mb-1">How This Works</h3>
                    <ul className="text-xs sm:text-sm text-orange-800 space-y-0.5 sm:space-y-1">
                      <li>• Your complete chat history will be shared with available mechanics</li>
                      <li>• Mechanics can review your issue and provide professional advice</li>
                      <li>• The first mechanic to accept will be assigned to help you</li>
                      <li>• You'll be notified once a mechanic responds</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <h3 className="text-sm sm:text-base font-semibold text-blue-900 mb-2">Your Request Includes:</h3>
                <div className="text-xs sm:text-sm text-blue-800 space-y-0.5 sm:space-y-1">
                  <p>📝 <strong>{messages.length} messages</strong> from your conversation</p>
                  <p>👤 Your contact: <strong>{user.name}</strong> ({user.email})</p>
                  <p>⏰ Current time: <strong>{new Date().toLocaleString()}</strong></p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  onClick={() => setShowRequestMechanicModal(false)}
                  className="flex-1 px-4 py-2.5 sm:py-3 border border-gray-300 text-sm sm:text-base text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestMechanic}
                  disabled={requestingMechanic}
                  className="flex-1 px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 font-medium transition-colors"
                >
                  {requestingMechanic ? 'Requesting...' : 'Request Mechanic Help'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      {showAppointmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Book an Appointment</h2>
              <button onClick={() => setShowAppointmentModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="text-center py-6 sm:py-8">
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Browse our trusted mechanics and schedule your service</p>
              <button
                onClick={() => {
                  setShowAppointmentModal(false);
                  router.push('/mechanics');
                }}
                className="px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                View Available Mechanics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
