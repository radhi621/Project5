'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { authenticatedFetch } from '../../utils/api';

interface Message {
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'mechanic';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  _id: string;
  mechanicName: string;
  mechanicEmail: string;
  status: string;
  messages: Message[];
  createdAt: string;
}

export default function UserChatPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const { socket, isConnected } = useSocket();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const requestId = params?.id as string;

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      return;
    }
    
    if (!user) {
      router.push('/login');
      return;
    }
    if (!requestId) return;

    loadChatSession();
  }, [user, authLoading, requestId, router]);

  useEffect(() => {
    if (!socket || !requestId) return;

    // Join chat room
    socket.emit('join-chat', { requestId });

    // Listen for new messages
    socket.on('new-message', (data) => {
      if (data.requestId === requestId) {
        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            messages: [...prev.messages, data.message],
          };
        });
      }
    });

    // Listen for chat completed
    socket.on('chat-completed', (data) => {
      if (data.requestId === requestId) {
        setSession((prev) => {
          if (!prev) return prev;
          return { ...prev, status: 'completed' };
        });
      }
    });

    return () => {
      socket.off('new-message');
      socket.off('chat-completed');
    };
  }, [socket, requestId]);

  useEffect(() => {
    scrollToBottom();
  }, [session?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatSession = async () => {
    try {
      const response = await authenticatedFetch(
        `http://localhost:3001/api/mechanic-requests/${requestId}`
      );

      if (response.ok) {
        const data = await response.json();
        setSession(data);
      } else {
        alert('Failed to load chat session');
        router.push('/requests');
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      alert('Failed to load chat session');
      router.push('/requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !socket || !user || !session) return;

    const content = messageInput.trim();
    setMessageInput('');
    setSending(true);

    try {
      socket.emit('send-message', {
        requestId,
        senderId: user.id,
        senderName: user.name,
        senderRole: 'user',
        content,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleRequestReopen = async () => {
    if (!confirm('Do you want to reopen this chat?')) return;

    try {
      const response = await authenticatedFetch(
        `http://localhost:3001/api/mechanic-requests/${requestId}/reopen`,
        {
          method: 'PATCH',
        }
      );

      if (response.ok) {
        const updated = await response.json();
        setSession(updated);
        alert('Reopen request sent to mechanic');
      }
    } catch (error) {
      console.error('Error requesting reopen:', error);
      alert('Failed to request reopen');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white">Chat session not found</div>
      </div>
    );
  }

  const canSendMessages = session.status === 'active';
  const isCompleted = session.status === 'completed';
  const isReopenRequested = session.status === 'reopen-requested';

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/requests')}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">{session.mechanicName}</h1>
              <p className="text-sm text-gray-400">{session.mechanicEmail}</p>
            </div>
          </div>
          <div>
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                session.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : session.status === 'completed'
                  ? 'bg-gray-100 text-gray-800'
                  : session.status === 'reopen-requested'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {session.status === 'active' && '● Active'}
              {session.status === 'completed' && 'Completed'}
              {session.status === 'reopen-requested' && 'Reopen Requested'}
              {session.status === 'pending' && 'Waiting for Mechanic'}
            </span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {session.messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          session.messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.senderRole === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  message.senderRole === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-white'
                }`}
              >
                <p className="text-xs font-semibold mb-1 opacity-75">
                  {message.senderName}
                </p>
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-75 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Status Banner */}
      {isCompleted && !isReopenRequested && (
        <div className="bg-yellow-900 border-t border-yellow-700 px-6 py-3 flex items-center justify-between">
          <p className="text-yellow-100">
            This chat has been completed by the mechanic.
          </p>
          <button
            onClick={handleRequestReopen}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
          >
            Request Reopen
          </button>
        </div>
      )}

      {isReopenRequested && (
        <div className="bg-blue-900 border-t border-blue-700 px-6 py-3">
          <p className="text-blue-100">Waiting for mechanic to accept reopen request...</p>
        </div>
      )}

      {/* Input */}
      {canSendMessages && (
        <form
          onSubmit={handleSendMessage}
          className="bg-gray-800 border-t border-gray-700 px-6 py-4"
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending || !isConnected}
            />
            <button
              type="submit"
              disabled={!messageInput.trim() || sending || !isConnected}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
          {!isConnected && (
            <p className="text-xs text-red-400 mt-2">
              Disconnected. Trying to reconnect...
            </p>
          )}
        </form>
      )}
    </div>
  );
}
