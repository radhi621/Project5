'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { authenticatedFetch } from '../../../utils/api';

interface MechanicRequest {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  messages: { senderId: string; senderName: string; senderRole: string; content: string; timestamp: string }[];
  status: 'pending' | 'active' | 'completed' | 'reopen-requested' | 'cancelled';
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
}

export default function RequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const [request, setRequest] = useState<MechanicRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseAction, setResponseAction] = useState<'accept' | 'deny' | null>(null);
  const [responseMessage, setResponseMessage] = useState('');

  useEffect(() => {
    if (authLoading) {
      return;
    }
    
    if (!user || user.role !== 'mechanic') {
      router.push('/');
      return;
    }
    loadRequest();
  }, [params.id, user, authLoading]);

  const loadRequest = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(`http://localhost:3001/api/mechanic-requests/${params.id}`);

      if (response.ok) {
        const data = await response.json();
        setRequest(data);
      } else {
        alert('Failed to load request');
        router.push('/mechanic/dashboard');
      }
    } catch (error) {
      console.error('Error loading request:', error);
      alert('Failed to load request');
      router.push('/mechanic/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!responseMessage.trim()) {
      alert('Please provide a message explaining your decision.');
      return;
    }

    try {
      setResponding(true);
      const token = localStorage.getItem('accessToken');
      const endpoint = responseAction === 'accept' ? 'accept' : 'deny';
      
      console.log('Sending response:', { responseMessage, endpoint });
      
      const response = await fetch(`http://localhost:3001/api/mechanic-requests/${params.id}/${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ responseMessage }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Response result:', result);
        alert(`Request ${responseAction}ed successfully!`);
        router.push('/mechanic/dashboard');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to respond to request');
      }
    } catch (error) {
      console.error('Error responding to request:', error);
      alert('Failed to respond to request. Please try again.');
    } finally {
      setResponding(false);
    }
  };

  if (!user || user.role !== 'mechanic') {
    return null;
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!request) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/mechanic/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Help Request Details</h1>
              <p className="text-sm text-gray-500">Review the conversation and respond</p>
            </div>
            {request.status === 'pending' && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setResponseAction('deny');
                    setShowResponseModal(true);
                  }}
                  className="px-6 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 font-medium"
                >
                  Decline Request
                </button>
                <button
                  onClick={() => {
                    setResponseAction('accept');
                    setShowResponseModal(true);
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Accept & Help
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                  {request.userName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{request.userName}</h3>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    request.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                    request.status === 'active' ? 'bg-blue-100 text-blue-800' :
                    request.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{request.userEmail}</p>
                </div>
                {request.userPhone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-gray-900">{request.userPhone}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Request Time</label>
                  <p className="text-gray-900">{new Date(request.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conversation Length</label>
                  <p className="text-gray-900">{request.messages?.length || 0} messages</p>
                </div>
              </div>
            </div>
          </div>

          {/* Chat History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Conversation History</h2>
                <p className="text-sm text-gray-500 mt-1">Complete chat between user and AI assistant</p>
              </div>

              <div className="p-6 space-y-4 max-h-[600px] overflow-y-auto">
                {request.messages?.map((message, index) => (
                  <div 
                    key={index}
                    className={`flex gap-3 ${message.senderRole === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-lg p-4 ${
                      message.senderRole === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold opacity-75">
                          {message.senderName}
                        </span>
                        <span className="text-xs opacity-60">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Response Modal */}
      {showResponseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {responseAction === 'accept' ? 'Accept Request' : 'Decline Request'}
            </h2>

            <div className={`mb-4 p-4 rounded-lg ${
              responseAction === 'accept' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm ${responseAction === 'accept' ? 'text-green-800' : 'text-red-800'}`}>
                {responseAction === 'accept'
                  ? 'You will be assigned to help this customer. Provide details on how you can assist.'
                  : 'Let the customer know why you cannot take this request at this time.'}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message to Customer <span className="text-red-500">*</span>
              </label>
              <textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder={responseAction === 'accept'
                  ? "e.g., I'd be happy to help! Based on your chat, I can diagnose this issue. Please contact me at..."
                  : "e.g., I'm currently fully booked. I recommend contacting..."}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResponseModal(false);
                  setResponseMessage('');
                  setResponseAction(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRespond}
                disabled={responding || !responseMessage.trim()}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium disabled:bg-gray-400 ${
                  responseAction === 'accept' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {responding ? 'Submitting...' : `Confirm ${responseAction === 'accept' ? 'Accept' : 'Decline'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
