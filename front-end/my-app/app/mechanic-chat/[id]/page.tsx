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
  userName: string;
  userEmail: string;
  userPhone?: string;
  status: string;
  messages: Message[];
  createdAt: string;
}

export default function MechanicChatPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const { socket, isConnected } = useSocket();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [completing, setCompleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const requestId = params?.id as string;

  useEffect(() => {
    if (authLoading) {
      return;
    }
    
    if (!user || user.role !== 'mechanic') {
      router.push('/');
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

    return () => {
      socket.off('new-message');
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
        router.push('/mechanic/dashboard');
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      alert('Failed to load chat session');
      router.push('/mechanic/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!confirm('Accept this service request?')) return;

    try {
      const response = await authenticatedFetch(
        `http://localhost:3001/api/mechanic-requests/${requestId}/accept`,
        {
          method: 'PATCH',
        }
      );

      if (response.ok) {
        const updated = await response.json();
        setSession(updated);
      }
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept request');
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
        senderRole: 'mechanic',
        content,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleCompleteChat = async () => {
    if (!confirm('Mark this chat as completed? The user can request to reopen it later.')) return;

    setCompleting(true);
    try {
      const response = await authenticatedFetch(
        `http://localhost:3001/api/mechanic-requests/${requestId}/complete`,
        {
          method: 'PATCH',
        }
      );

      if (response.ok) {
        const updated = await response.json();
        setSession(updated);
        alert('Chat marked as completed');
      }
    } catch (error) {
      console.error('Error completing chat:', error);
      alert('Failed to complete chat');
    } finally {
      setCompleting(false);
    }
  };

  const handleAcceptReopen = async () => {
    if (!confirm('Accept reopen request?')) return;

    try {
      const response = await authenticatedFetch(
        `http://localhost:3001/api/mechanic-requests/${requestId}/accept-reopen`,
        {
          method: 'PATCH',
        }
      );

      if (response.ok) {
        const updated = await response.json();
        setSession(updated);
        alert('Chat reopened');
      }
    } catch (error) {
      console.error('Error accepting reopen:', error);
      alert('Failed to accept reopen');
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

  const isPending = session.status === 'pending';
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
              onClick={() => router.push('/mechanic/dashboard')}
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
              <h1 className="text-xl font-bold text-white">{session.userName}</h1>
              <p className="text-sm text-gray-400">{session.userEmail}</p>
              {session.userPhone && (
                <p className="text-sm text-gray-400">{session.userPhone}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
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
              {session.status === 'pending' && 'Pending'}
            </span>
            {canSendMessages && (
              <button
                onClick={handleCompleteChat}
                disabled={completing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 text-white rounded-lg transition-colors"
              >
                {completing ? 'Completing...' : 'Complete Chat'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Pending Action Banner */}
      {isPending && (
        <div className="bg-blue-900 border-b border-blue-700 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-blue-100 font-semibold">New Service Request</p>
            <p className="text-blue-200 text-sm">
              {session.userName} is requesting your assistance
            </p>
          </div>
          <button
            onClick={handleAcceptRequest}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Accept Request
          </button>
        </div>
      )}

      {/* Reopen Request Banner */}
      {isReopenRequested && (
        <div className="bg-yellow-900 border-b border-yellow-700 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-yellow-100 font-semibold">Reopen Request</p>
            <p className="text-yellow-200 text-sm">
              {session.userName} wants to reopen this chat
            </p>
          </div>
          <button
            onClick={handleAcceptReopen}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Accept Reopen
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {session.messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p>{isPending ? 'Accept the request to start chatting' : 'No messages yet'}</p>
          </div>
        ) : (
          session.messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.senderRole === 'mechanic' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  message.senderRole === 'mechanic'
                    ? 'bg-green-600 text-white'
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

      {/* Completed Banner */}
      {isCompleted && (
        <div className="bg-gray-800 border-t border-gray-700 px-6 py-3">
          <p className="text-gray-300 text-center">
            This chat has been marked as completed. The user can request to reopen if needed.
          </p>
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
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={sending || !isConnected}
            />
            <button
              type="submit"
              disabled={!messageInput.trim() || sending || !isConnected}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
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
