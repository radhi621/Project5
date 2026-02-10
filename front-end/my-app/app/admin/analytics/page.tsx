'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import AdminSidebar from '../components/AdminSidebar';
import { authenticatedFetch } from '../../utils/api';

interface Stats {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    avgChats: number;
  };
  mechanics: {
    total: number;
    available: number;
    avgRating: number;
    totalJobs: number;
  };
  appointments: {
    total: number;
    today: number;
    pending: number;
    confirmed: number;
    completed: number;
  };
  chats: {
    totalChats: number;
    totalMessages: number;
    avgMessagesPerChat: number;
  };
  documents: {
    total: number;
    processed: number;
    pending: number;
    processing: number;
    totalChunks: number;
    totalSize: number;
  };
  activity: {
    total: number;
    today: number;
    byType: { _id: string; count: number }[];
  };
  mechanicChats?: {
    total: number;
    pending: number;
    active: number;
    completed: number;
  };
}

interface Activity {
  _id: string;
  type: string;
  action: string;
  userName?: string;
  timestamp: string;
  metadata?: any;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('today');

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      router.push('/');
      return;
    }
    loadAnalytics();
  }, [user, authLoading, router]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all stats in parallel
      const [
        usersRes,
        mechanicsRes,
        appointmentsRes,
        chatsRes,
        documentsRes,
        activityStatsRes,
        recentActivityRes,
        mechanicChatsRes,
      ] = await Promise.all([
        authenticatedFetch('http://localhost:3001/api/users/stats'),
        authenticatedFetch('http://localhost:3001/api/mechanics/stats'),
        authenticatedFetch('http://localhost:3001/api/appointments/stats'),
        authenticatedFetch('http://localhost:3001/api/chat/stats'),
        authenticatedFetch('http://localhost:3001/api/rag-documents/stats'),
        authenticatedFetch('http://localhost:3001/api/activity/stats'),
        authenticatedFetch('http://localhost:3001/api/activity/recent?limit=20'),
        authenticatedFetch('http://localhost:3001/api/mechanic-requests/admin/all'),
      ]);

      const [users, mechanics, appointments, chats, documents, activityStats, activities, mechanicChatsData] =
        await Promise.all([
          usersRes.json(),
          mechanicsRes.json(),
          appointmentsRes.json(),
          chatsRes.json(),
          documentsRes.json(),
          activityStatsRes.json(),
          recentActivityRes.json(),
          mechanicChatsRes.json(),
        ]);

      // Calculate mechanic chat stats
      const mechanicChats = {
        total: mechanicChatsData.length,
        pending: mechanicChatsData.filter((c: any) => c.status === 'pending').length,
        active: mechanicChatsData.filter((c: any) => c.status === 'active').length,
        completed: mechanicChatsData.filter((c: any) => c.status === 'completed').length,
      };

      setStats({
        users,
        mechanics,
        appointments,
        chats,
        documents,
        activity: activityStats,
        mechanicChats,
      });
      setRecentActivity(activities);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, JSX.Element> = {
      user: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      ),
      mechanic: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 7H7v6h6V7z" />
        </svg>
      ),
      appointment: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
            clipRule="evenodd"
          />
        </svg>
      ),
      rag: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
        </svg>
      ),
      system: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
            clipRule="evenodd"
          />
        </svg>
      ),
    };
    return icons[type] || icons.system;
  };

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      user: 'bg-blue-100 text-blue-600',
      mechanic: 'bg-green-100 text-green-600',
      appointment: 'bg-purple-100 text-purple-600',
      rag: 'bg-orange-100 text-orange-600',
      system: 'bg-gray-100 text-gray-600',
    };
    return colors[type] || colors.system;
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-600">Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-500">Comprehensive system analytics and insights</p>
              </div>
            </div>
            <button
              onClick={loadAnalytics}
              className="px-3 sm:px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto px-3 sm:px-6 py-4 space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Users Card */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium opacity-90">Total Users</h3>
                <svg className="w-8 h-8 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
              <div className="text-3xl font-bold mb-2">{stats.users.total}</div>
              <div className="space-y-1 text-sm opacity-90">
                <div className="flex justify-between">
                  <span>Active:</span>
                  <span className="font-semibold">{stats.users.active}</span>
                </div>
                <div className="flex justify-between">
                  <span>New this month:</span>
                  <span className="font-semibold">{stats.users.newThisMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg chats:</span>
                  <span className="font-semibold">{stats.users.avgChats}</span>
                </div>
              </div>
            </div>

            {/* Mechanics Card */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium opacity-90">Mechanics</h3>
                <svg className="w-8 h-8 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="text-3xl font-bold mb-2">{stats.mechanics.total}</div>
              <div className="space-y-1 text-sm opacity-90">
                <div className="flex justify-between">
                  <span>Available:</span>
                  <span className="font-semibold">{stats.mechanics.available}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg rating:</span>
                  <span className="font-semibold">{stats.mechanics.avgRating} ⭐</span>
                </div>
                <div className="flex justify-between">
                  <span>Total jobs:</span>
                  <span className="font-semibold">{stats.mechanics.totalJobs}</span>
                </div>
              </div>
            </div>

            {/* Appointments Card */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium opacity-90">Appointments</h3>
                <svg className="w-8 h-8 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="text-3xl font-bold mb-2">{stats.appointments.total}</div>
              <div className="space-y-1 text-sm opacity-90">
                <div className="flex justify-between">
                  <span>Today:</span>
                  <span className="font-semibold">{stats.appointments.today}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending:</span>
                  <span className="font-semibold">{stats.appointments.pending}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completed:</span>
                  <span className="font-semibold">{stats.appointments.completed}</span>
                </div>
              </div>
            </div>

            {/* AI Chats Card */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium opacity-90">AI Chat Sessions</h3>
                <svg className="w-8 h-8 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                  <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                </svg>
              </div>
              <div className="text-3xl font-bold mb-2">{stats.chats.totalChats}</div>
              <div className="space-y-1 text-sm opacity-90">
                <div className="flex justify-between">
                  <span>Total messages:</span>
                  <span className="font-semibold">{stats.chats.totalMessages}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg per chat:</span>
                  <span className="font-semibold">{stats.chats.avgMessagesPerChat}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Mechanic Chats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                    clipRule="evenodd"
                  />
                </svg>
                Mechanic Chats
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="text-xl font-bold text-gray-900">{stats.mechanicChats?.total || 0}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-yellow-50 rounded p-2">
                    <div className="text-xs text-yellow-600 font-medium">Pending</div>
                    <div className="text-lg font-bold text-yellow-900">{stats.mechanicChats?.pending || 0}</div>
                  </div>
                  <div className="bg-blue-50 rounded p-2">
                    <div className="text-xs text-blue-600 font-medium">Active</div>
                    <div className="text-lg font-bold text-blue-900">{stats.mechanicChats?.active || 0}</div>
                  </div>
                  <div className="bg-green-50 rounded p-2">
                    <div className="text-xs text-green-600 font-medium">Done</div>
                    <div className="text-lg font-bold text-green-900">{stats.mechanicChats?.completed || 0}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* RAG Documents */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                  <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
                RAG Documents
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="text-xl font-bold text-gray-900">{stats.documents.total}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Processed:</span>
                    <span className="font-semibold text-green-600">{stats.documents.processed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Processing:</span>
                    <span className="font-semibold text-blue-600">{stats.documents.processing}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pending:</span>
                    <span className="font-semibold text-yellow-600">{stats.documents.pending}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total chunks:</span>
                    <span className="font-semibold text-gray-900">{stats.documents.totalChunks}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Storage:</span>
                    <span className="font-semibold text-gray-900">{stats.documents.totalSize} MB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* System Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
                System Activity
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total events:</span>
                  <span className="text-xl font-bold text-gray-900">{stats.activity.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Today:</span>
                  <span className="text-lg font-semibold text-blue-600">{stats.activity.today}</span>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-medium text-gray-500 mb-2">By Type:</div>
                  {stats.activity.byType.slice(0, 5).map((item) => (
                    <div key={item._id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 capitalize">{item._id}:</span>
                      <span className="font-semibold text-gray-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <p className="text-sm text-gray-500 mt-1">Latest system events and actions</p>
            </div>
            <div className="p-6">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentActivity.map((activity) => (
                  <div key={activity._id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      {activity.userName && (
                        <p className="text-xs text-gray-600 mt-0.5">by {activity.userName}</p>
                      )}
                      {activity.metadata && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {Object.entries(activity.metadata)
                            .slice(0, 2)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(' • ')}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{formatDate(activity.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
