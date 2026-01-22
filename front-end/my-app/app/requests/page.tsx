'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { authenticatedFetch } from '../utils/api';

interface Request {
  _id: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  mechanicName: string;
  mechanicEmail: string;
  status: 'pending' | 'active' | 'completed' | 'reopen-requested' | 'cancelled';
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  messages: { senderName: string; content: string; timestamp: string }[];
}

export default function MyRequestsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      return;
    }
    
    if (!user) {
      router.push('/login');
      return;
    }
    loadRequests();
  }, [user, authLoading, router]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('http://localhost:3001/api/mechanic-requests/my-requests');

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

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6">
          <div className="flex justify-between items-center">
            <div>
              <button
                onClick={() => router.push('/')}
                className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 mb-2 flex items-center gap-1"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Chat
              </button>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">My Mechanic Chats</h1>
              <p className="text-xs sm:text-sm text-gray-500">View and manage your conversations with mechanics</p>
            </div>
            <button
              onClick={() => router.push('/select-mechanic')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + New Chat
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Chats Yet</h3>
            <p className="text-gray-600 mb-6">Start a conversation with a mechanic to get help with your vehicle.</p>
            <button
              onClick={() => router.push('/select-mechanic')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Select a Mechanic
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request._id}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/user-chat/${request._id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.mechanicName}
                      </h3>
                      {request.status === 'pending' && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                          Pending Acceptance
                        </span>
                      )}
                      {request.status === 'active' && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                          ● Active
                        </span>
                      )}
                      {request.status === 'completed' && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">
                          Completed
                        </span>
                      )}
                      {request.status === 'reopen-requested' && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                          Reopen Requested
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      Started: {new Date(request.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      {request.mechanicEmail}
                    </p>
                  </div>
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>{request.messages?.length || 0} messages</span>
                  </div>
                  <span className="text-sm text-blue-600 font-medium">
                    Click to open chat →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
