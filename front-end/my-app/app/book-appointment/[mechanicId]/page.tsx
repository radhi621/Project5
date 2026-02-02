'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/app/utils/api';
import { useAuth } from '@/app/contexts/AuthContext';

interface Mechanic {
  _id: string;
  name: string;
  email: string;
  phone: string;
  shopName: string;
  specialties: string[];
  experience: number;
  certifications: string[];
  rating: number;
  location: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function BookAppointmentPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const mechanicId = params.mechanicId as string;

  const [mechanic, setMechanic] = useState<Mechanic | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(60);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchMechanic();
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
  }, [authLoading, user]);

  useEffect(() => {
    if (selectedDate && mechanicId) {
      fetchAvailableSlots();
    }
  }, [selectedDate, mechanicId]);

  const fetchMechanic = async () => {
    try {
      const response = await authenticatedFetch(`http://localhost:3001/api/mechanics/${mechanicId}`);
      if (!response.ok) throw new Error('Failed to fetch mechanic');
      const data = await response.json();
      setMechanic(data);
      if (data.specialties && data.specialties.length > 0) {
        setSelectedService(data.specialties[0]);
      }
    } catch (err) {
      setError('Failed to load mechanic details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const response = await authenticatedFetch(
        `http://localhost:3001/api/appointments/mechanic/${mechanicId}/availability?date=${selectedDate}`
      );
      if (!response.ok) throw new Error('Failed to fetch slots');
      const slots = await response.json();
      setAvailableSlots(slots);
      setSelectedSlot('');
    } catch (err) {
      setError('Failed to load available time slots');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !selectedService) {
      setError('Please select a time slot and service');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Convert YYYY-MM-DD to full ISO date string
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
      
      const payload = {
        mechanicId,
        mechanicName: mechanic?.name,
        shopName: mechanic?.shopName || mechanic?.name,
        userId: user?.id,
        userName: user?.name,
        date: appointmentDate.toISOString(),
        timeSlot: selectedSlot,
        serviceType: selectedService,
        notes,
        estimatedDuration,
      };
      
      console.log('Sending appointment payload:', payload);
      
      const response = await authenticatedFetch(`http://localhost:3001/api/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorData;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          const text = await response.text();
          errorData = { message: text || 'Failed to book appointment' };
        }
        console.error('Appointment booking error:', errorData);
        throw new Error(errorData.message || 'Failed to book appointment');
      }

      alert('Appointment booked successfully! The mechanic will confirm soon.');
      router.push('/appointments');
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const getNextDays = (count: number) => {
    const days = [];
    const today = new Date();
    for (let i = 1; i <= count; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      });
    }
    return days;
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!mechanic) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Mechanic not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-6 text-blue-600 hover:text-blue-800 flex items-center gap-2"
        >
          ← Back
        </button>

        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Book Appointment</h1>

          {/* Mechanic Info */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg">
            <h2 className="text-2xl font-semibold mb-2 text-black">{mechanic.name}</h2>
            <p className="text-gray-600 mb-2">⭐ {mechanic.rating.toFixed(1)} Rating</p>
            <p className="text-gray-600 mb-2">📍 {mechanic.location}</p>
            <p className="text-gray-600 mb-2">📞 {mechanic.phone}</p>
            <p className="text-gray-600 mb-4">💼 {mechanic.experience} years experience</p>
            <div className="flex flex-wrap gap-2">
              {mechanic.specialties.map((specialty, idx) => (
                <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {specialty}
                </span>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {getNextDays(14).map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => setSelectedDate(day.value)}
                    className={`p-3 text-center rounded-lg border-2 transition-colors ${
                      selectedDate === day.value
                        ? 'border-blue-600 bg-blue-50 text-blue-900'
                        : 'border-gray-300 hover:border-blue-400 text-gray-700'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slot Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Time Slots
              </label>
              {availableSlots.length === 0 ? (
                <p className="text-gray-500 p-4 bg-gray-50 rounded-lg">
                  No available slots for this date. Please select another date.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 text-center rounded-lg border-2 transition-colors ${
                        selectedSlot === slot
                          ? 'border-blue-600 bg-blue-50 text-blue-900'
                          : 'border-gray-300 hover:border-blue-400 text-gray-700'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Service Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Type
              </label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a service</option>
                {mechanic.specialties.map((specialty, idx) => (
                  <option key={idx} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>

            {/* Estimated Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Duration
              </label>
              <select
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
                <option value={240}>4 hours</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe the issue or specific requirements..."
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !selectedSlot || !selectedService}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {submitting ? 'Booking...' : 'Book Appointment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
