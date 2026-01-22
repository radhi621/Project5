'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/app/utils/api';
import { useAuth } from '@/app/contexts/AuthContext';

interface Appointment {
  _id: string;
  mechanicId: string;
  mechanicName: string;
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
}

export default function AppointmentsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchAppointments();
  }, [authLoading, user, filter]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const statusParam = filter !== 'all' ? `?status=${filter}` : '?status=all';
      const response = await authenticatedFetch(
        `http://localhost:3001/api/appointments/user/${user?.id}${statusParam}`
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

  const handleCancel = async (id: string) => {
    if (!cancelReason.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }

    try {
      const response = await authenticatedFetch(
        `http://localhost:3001/api/appointments/${id}/cancel`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: cancelReason }),
        }
      );

      if (!response.ok) throw new Error('Failed to cancel appointment');
      
      alert('Appointment cancelled successfully');
      setCancellingId(null);
      setCancelReason('');
      fetchAppointments();
    } catch (err) {
      alert('Failed to cancel appointment');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
      declined: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading appointments...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900">My Appointments</h1>
          <button
            onClick={() => router.push('/mechanics')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Book New Appointment
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-800 hover:bg-blue-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Appointments List */}
        {appointments.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <p className="text-gray-700 text-lg mb-4">No appointments found</p>
            <button
              onClick={() => router.push('/mechanics')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Browse mechanics to book an appointment
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div key={appointment._id} className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-blue-900">
                      {appointment.mechanicName}
                    </h3>
                    <p className="text-gray-700">{appointment.serviceType}</p>
                  </div>
                  {getStatusBadge(appointment.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium text-gray-900">{formatDate(appointment.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Time</p>
                    <p className="font-medium text-gray-900">{appointment.timeSlot}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="font-medium text-gray-900">{appointment.estimatedDuration} minutes</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Booked</p>
                    <p className="font-medium text-gray-900">
                      {new Date(appointment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {appointment.notes && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Notes</p>
                    <p className="text-gray-800">{appointment.notes}</p>
                  </div>
                )}

                {appointment.cancellationReason && (
                  <div className="mb-4 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600 font-medium">Cancellation Reason:</p>
                    <p className="text-red-700">{appointment.cancellationReason}</p>
                  </div>
                )}

                {appointment.status === 'confirmed' && appointment.confirmedAt && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700">
                      ✓ Confirmed on {new Date(appointment.confirmedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                    <>
                      {cancellingId === appointment._id ? (
                        <div className="flex-1">
                          <input
                            type="text"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Reason for cancellation..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCancel(appointment._id)}
                              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                            >
                              Confirm Cancel
                            </button>
                            <button
                              onClick={() => {
                                setCancellingId(null);
                                setCancelReason('');
                              }}
                              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                            >
                              Keep Appointment
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setCancellingId(appointment._id)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                        >
                          Cancel Appointment
                        </button>
                      )}
                    </>
                  )}

                  {appointment.status === 'completed' && (
                    <button
                      onClick={() => router.push(`/user-chat/${appointment._id}`)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
