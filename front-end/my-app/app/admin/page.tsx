'use client';

import React, { useState, useEffect } from 'react';
import AdminSidebar from './components/AdminSidebar';

interface Stats {
  users: { total: number };
  mechanics: { total: number; available: number };
  documents: { total: number; processed: number };
  appointments: { today: number; pending: number };
}

interface Activity {
  _id: string;
  type: string;
  action: string;
  userName?: string;
  timestamp: string;
}

interface Health {
  status: string;
  uptime: string;
  database: {
    status: string;
    responseTime: string;
  };
  memory: {
    used: string;
    total: string;
  };
}

export default function AdminDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      // Fetch all data in parallel
      const [usersRes, mechanicsRes, docsRes, appointmentsRes, activityRes, healthRes] = await Promise.all([
        fetch('http://localhost:3001/users/stats', { headers }),
        fetch('http://localhost:3001/mechanics/stats', { headers }),
        fetch('http://localhost:3001/rag-documents/stats', { headers }),
        fetch('http://localhost:3001/appointments/stats', { headers }),
        fetch('http://localhost:3001/activity/recent?limit=5', { headers }),
        fetch('http://localhost:3001/health', { headers }),
      ]);

      const [users, mechanics, documents, appointments, activity, healthData] = await Promise.all([
        usersRes.json(),
        mechanicsRes.json(),
        docsRes.json(),
        appointmentsRes.json(),
        activityRes.json(),
        healthRes.json(),
      ]);

      setStats({ users, mechanics, documents, appointments });
      setRecentActivity(activity);
      setHealth(healthData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Welcome back, Admin</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="hidden sm:flex px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                Quick Actions
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading dashboard data...</div>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-4 sm:mb-6">
                <div className="bg-white rounded-lg shadow p-3 sm:p-6">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg text-blue-600">
                      <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-0.5 sm:mb-1">{stats?.users.total || 0}</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Total Users</p>
                </div>

                <div className="bg-white rounded-lg shadow p-3 sm:p-6">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg text-green-600">
                      <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-0.5 sm:mb-1">{stats?.mechanics.total || 0}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Mechanics <span className="hidden sm:inline">({stats?.mechanics.available || 0} available)</span></p>
                </div>

                <div className="bg-white rounded-lg shadow p-3 sm:p-6">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg text-purple-600">
                      <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-0.5 sm:mb-1">{stats?.documents.total || 0}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Documents <span className="hidden sm:inline">({stats?.documents.processed || 0} proc.)</span></p>
                </div>

                <div className="bg-white rounded-lg shadow p-3 sm:p-6">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg text-orange-600">
                      <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-0.5 sm:mb-1">{stats?.appointments.today || 0}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Today <span className="hidden sm:inline">({stats?.appointments.pending || 0} pending)</span></p>
                </div>
              </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Recent Activity</h2>
              </div>
              <div className="p-3 sm:p-6">
                <div className="space-y-4">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <div key={`activity-${activity._id}-${index}`} className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          activity.type === 'user' ? 'bg-blue-100 text-blue-600' :
                          activity.type === 'mechanic' ? 'bg-green-100 text-green-600' :
                          activity.type === 'rag' ? 'bg-purple-100 text-purple-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          {activity.type === 'user' && (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          )}
                          {activity.type === 'mechanic' && (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13 7H7v6h6V7z" />
                            </svg>
                          )}
                          {activity.type === 'rag' && (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          )}
                          {activity.type === 'appointment' && (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                          <p className="text-sm text-gray-500">{activity.userName || 'System'}</p>
                        </div>
                        <span className="text-xs text-gray-400">{formatTime(activity.timestamp)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No recent activity</p>
                  )}
                </div>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
              </div>
              <div className="p-6">
                {health ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">System Status</span>
                        <span className={`text-sm font-semibold ${health?.status === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                          {health?.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Uptime: {health?.uptime || 'N/A'}</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Database Status</span>
                        <span className={`text-sm font-semibold ${health?.database?.status === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                          {health?.database?.status ? health.database.status.charAt(0).toUpperCase() + health.database.status.slice(1) : 'Unknown'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Response: {health?.database?.responseTime || 'N/A'}</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Memory Usage</span>
                        <span className="text-sm font-semibold text-blue-600">{health?.memory?.used || '0MB'} / {health?.memory?.total || '0MB'}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${health?.memory?.used && health?.memory?.total ? (parseInt(health.memory.used) / parseInt(health.memory.total)) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Loading health data...</p>
                )}
              </div>
            </div>
          </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
