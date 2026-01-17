'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

interface Request {
  _id: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  status: 'pending' | 'accepted' | 'denied' | 'cancelled';
  acceptedByName?: string;
  acceptedByEmail?: string;
  responseMessage?: string;
  createdAt: string;
  respondedAt?: string;
  chatHistory: { role: string; content: string; timestamp: string }[];
}

export default function MyRequestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadRequests();
  }, [user, router]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:3001/api/mechanic-requests/my-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Loaded requests:', data);
        setRequests(data);
      }
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <button
                onClick={() => router.push('/')}
                className="text-sm text-gray-600 hover:text-gray-900 mb-2 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Chat
              </button>
              <h1 className="text-2xl font-bold text-gray-900">My Mechanic Requests</h1>
              <p className="text-sm text-gray-500">Track your help requests and mechanic responses</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Requests Yet</h3>
            <p className="text-gray-600 mb-6">You haven't requested any mechanic help yet.</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Start a Conversation
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request._id}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Request from {new Date(request.createdAt).toLocaleDateString()}
                      </h3>
                      {request.status === 'pending' && (
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
                          Pending
                        </span>
                      )}
                      {request.status === 'accepted' && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                          Accepted
                        </span>
                      )}
                      {request.status === 'denied' && (
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                          Declined
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Requested: {new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(request)}
                    className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium"
                  >
                    View Details
                  </button>
                </div>

                {request.status === 'pending' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm text-orange-800">
                      🕒 Waiting for a mechanic to respond. Available mechanics can review your conversation and accept your request.
                    </p>
                  </div>
                )}

                {request.status === 'accepted' && request.acceptedByName && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {request.acceptedByName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-green-900 mb-1">
                          ✅ {request.acceptedByName} accepted your request
                        </p>
                        {request.respondedAt && (
                          <p className="text-xs text-green-700 mb-2">
                            Responded: {new Date(request.respondedAt).toLocaleString()}
                          </p>
                        )}
                        {request.responseMessage && (
                          <div className="bg-white rounded-lg p-4 mb-3 border-l-4 border-green-600">
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Mechanic's Message:</p>
                            <p className="text-sm text-gray-900 font-medium">{request.responseMessage}</p>
                          </div>
                        )}
                        {!request.responseMessage && (
                          <p className="text-xs text-gray-500 italic mb-3">No message provided</p>
                        )}
                        {request.acceptedByEmail && (
                          <div className="flex flex-wrap gap-3 mt-3">
                            <a
                              href={`mailto:${request.acceptedByEmail}`}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium inline-flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Email Mechanic
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {request.status === 'denied' && request.responseMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="font-semibold text-red-900 mb-2">❌ Request Declined</p>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-sm text-gray-900">{request.responseMessage}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Request Details</h2>
                <p className="text-sm text-gray-500">Your conversation and request status</p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {selectedRequest.chatHistory.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                      <div className="flex items-start gap-3">
                        {message.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13 7H7v6h6V7z" />
                            </svg>
                          </div>
                        )}
                        <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                          <div
                            className={`inline-block rounded-lg px-4 py-3 ${
                              message.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(message.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {message.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                            {user.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
