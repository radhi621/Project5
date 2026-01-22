'use client';

import React, { useEffect, useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import { authenticatedFetch } from '../../utils/api';

interface Appointment {
  _id: string;
  mechanicId: string;
  mechanicName: string;
  shopName: string;
  userId: string;
  userName: string;
  date: string;
  timeSlot: string;
  serviceType: string;
  estimatedDuration: number;
  notes: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'declined';
  cancellationReason?: string;
  confirmedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminAppointmentsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'declined'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, [filter]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const response = await authenticatedFetch(
        `http://localhost:3001/api/appointments${statusParam}`
      );
      if (!response.ok) throw new Error('Failed to fetch appointments');
      const data = await response.json();
      setAppointments(data);
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    const searchLower = searchTerm.toLowerCase();
    return (
      apt.userName.toLowerCase().includes(searchLower) ||
      apt.mechanicName.toLowerCase().includes(searchLower) ||
      apt.serviceType.toLowerCase().includes(searchLower) ||
      apt.shopName.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
      declined: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
    declined: appointments.filter(a => a.status === 'declined').length,
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
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Appointments</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">View and manage all appointments</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading appointments...</div>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-white rounded-lg shadow p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-500">Total</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-500">Pending</p>
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-500">Confirmed</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.confirmed}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-500">Completed</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.completed}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-500">Cancelled</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.cancelled}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-500">Declined</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-600">{stats.declined}</p>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search
                    </label>
                    <input
                      type="text"
                      placeholder="Search by user, mechanic, service..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter by Status
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['all', 'pending', 'confirmed', 'completed', 'cancelled', 'declined'].map((status) => (
                        <button
                          key={status}
                          onClick={() => setFilter(status as any)}
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                            filter === status
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Appointments Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mechanic
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                          Service
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                          Duration
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                          Created
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAppointments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                            No appointments found
                          </td>
                        </tr>
                      ) : (
                        filteredAppointments.map((appointment) => (
                          <tr key={appointment._id} className="hover:bg-gray-50">
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <div className="text-xs sm:text-sm font-medium text-gray-900">{appointment.userName}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <div className="text-xs sm:text-sm text-gray-900">{appointment.mechanicName}</div>
                              <div className="text-xs text-gray-500">{appointment.shopName}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                              <div className="text-xs sm:text-sm text-gray-900">{appointment.serviceType}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <div className="text-xs sm:text-sm text-gray-900">{formatDate(appointment.date)}</div>
                              <div className="text-xs text-gray-500">{appointment.timeSlot}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                              <div className="text-xs sm:text-sm text-gray-900">{appointment.estimatedDuration} min</div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(appointment.status)}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden xl:table-cell">
                              <div className="text-xs sm:text-sm text-gray-900">{formatDateTime(appointment.createdAt)}</div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Results count */}
              <div className="mt-4 text-xs sm:text-sm text-gray-500 text-center">
                Showing {filteredAppointments.length} of {appointments.length} appointments
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
