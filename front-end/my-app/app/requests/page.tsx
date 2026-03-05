'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

type FilterTab = 'all' | 'active' | 'pending' | 'completed' | 'reopen-requested' | 'cancelled';

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  pending:           { label: 'Pending',        dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
  active:            { label: 'Active',          dot: 'bg-green-400',  badge: 'bg-green-50 text-green-700 ring-green-200' },
  completed:         { label: 'Completed',       dot: 'bg-gray-400',   badge: 'bg-gray-50 text-gray-600 ring-gray-200' },
  'reopen-requested':{ label: 'Reopen Requested',dot: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700 ring-yellow-200' },
  cancelled:         { label: 'Cancelled',       dot: 'bg-red-400',    badge: 'bg-red-50 text-red-600 ring-red-200' },
};

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',              label: 'All' },
  { key: 'active',           label: 'Active' },
  { key: 'pending',          label: 'Pending' },
  { key: 'reopen-requested', label: 'Reopen' },
  { key: 'completed',        label: 'Completed' },
  { key: 'cancelled',        label: 'Cancelled' },
];

export default function MyRequestsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    loadRequests();
  }, [user, authLoading, router]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch('http://localhost:3001/api/mechanic-requests/my-requests');
      if (response.ok) setRequests(await response.json());
    } catch (error) {
      console.error('Failed to load requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(
    () => activeTab === 'all' ? requests : requests.filter(r => r.status === activeTab),
    [requests, activeTab],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: requests.length };
    requests.forEach(r => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [requests]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
              title="Back to Home"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">My Mechanic Chats</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Your service conversations</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/select-mechanic')}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">New Chat</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Stats bar ──────────────────────────────────────────────────── */}
        {requests.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total',     value: requests.length,                           color: 'text-gray-900' },
              { label: 'Active',    value: counts['active'] || 0,                     color: 'text-green-600' },
              { label: 'Pending',   value: counts['pending'] || 0,                    color: 'text-blue-600' },
              { label: 'Completed', value: (counts['completed'] || 0) + (counts['cancelled'] || 0), color: 'text-gray-500' },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Filter tabs ────────────────────────────────────────────────── */}
        {requests.length > 0 && (
          <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 overflow-x-auto">
            {FILTER_TABS.map(tab => {
              const count = counts[tab.key] || 0;
              if (tab.key !== 'all' && count === 0) return null;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    activeTab === tab.key ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Content ────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 && requests.length === 0 ? (
          /* Empty state — no requests at all */
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No chats yet</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
              Start a conversation with a mechanic to get expert help with your vehicle.
            </p>
            <button
              onClick={() => router.push('/select-mechanic')}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Find a Mechanic
            </button>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty filtered state */
          <div className="bg-white rounded-xl border border-gray-200 py-12 text-center">
            <p className="text-gray-500 text-sm">No {activeTab} chats.</p>
            <button onClick={() => setActiveTab('all')} className="mt-2 text-sm text-blue-600 hover:underline">
              View all
            </button>
          </div>
        ) : (
          /* Request cards */
          <div className="space-y-3">
            {filtered.map(request => {
              const cfg = STATUS_CONFIG[request.status] ?? STATUS_CONFIG['pending'];
              const lastMsg = request.messages?.at(-1);
              const initials = getInitials(request.mechanicName);

              return (
                <div
                  key={request._id}
                  onClick={() => router.push(`/user-chat/${request._id}`)}
                  className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="p-4 sm:p-5 flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm">
                      {initials}
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                            {request.mechanicName ?? 'Unknown Mechanic'}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${cfg.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5">
                          {formatRelative(request.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 mb-2">{request.mechanicEmail ?? ''}</p>

                      {/* Last message preview */}
                      {lastMsg ? (
                        <p className="text-sm text-gray-600 truncate">
                          <span className="font-medium text-gray-700">{lastMsg.senderName}: </span>
                          {lastMsg.content}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No messages yet</p>
                      )}
                    </div>

                    {/* Arrow */}
                    <svg
                      className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  {/* Footer bar */}
                  <div className="px-4 sm:px-5 pb-3 flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
                      </svg>
                      {request.messages?.length || 0} {request.messages?.length === 1 ? 'message' : 'messages'}
                    </span>
                    {request.acceptedAt && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Accepted {formatRelative(request.acceptedAt)}
                      </span>
                    )}
                    {request.completedAt && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Completed {formatRelative(request.completedAt)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
