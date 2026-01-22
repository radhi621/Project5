'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { authenticatedFetch } from '../utils/api';

interface Mechanic {
  _id: string;
  name: string;
  email: string;
  shopName: string;
  specialties: string[];
  rating: number;
  totalReviews: number;
  availability: 'available' | 'busy' | 'offline';
  city: string;
  state: string;
}

export default function SelectMechanicPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('all');

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      return;
    }
    
    if (!user) {
      router.push('/login');
      return;
    }
    loadMechanics();
  }, [user, authLoading, router]);

  const loadMechanics = async () => {
    try {
      const response = await authenticatedFetch('http://localhost:3001/api/mechanics');

      if (response.ok) {
        const data = await response.json();
        // Only show active mechanics
        setMechanics(data.filter((m: Mechanic) => m.availability !== 'offline'));
      }
    } catch (error) {
      console.error('Error loading mechanics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestMechanic = async (mechanic: Mechanic) => {
    if (!user) return;

    setRequesting(true);
    try {
      const response = await authenticatedFetch('http://localhost:3001/api/mechanic-requests', {
        method: 'POST',
        body: JSON.stringify({
          userName: user.name,
          userEmail: user.email,
          userPhone: user.phone || '',
          mechanicId: mechanic._id,
          mechanicName: mechanic.name,
          mechanicEmail: mechanic.email,
        }),
      });

      if (response.ok) {
        const request = await response.json();
        alert(`Request sent to ${mechanic.name}! You'll be notified when they accept.`);
        router.push('/requests');
      } else {
        alert('Failed to send request. Please try again.');
      }
    } catch (error) {
      console.error('Error sending request:', error);
      alert('Failed to send request. Please try again.');
    } finally {
      setRequesting(false);
    }
  };

  const filteredMechanics = mechanics.filter((mechanic) => {
    const matchesSearch =
      mechanic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mechanic.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mechanic.city.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSpecialty =
      filterSpecialty === 'all' ||
      mechanic.specialties.some((s) =>
        s.toLowerCase().includes(filterSpecialty.toLowerCase())
      );
    
    return matchesSearch && matchesSpecialty;
  });

  const allSpecialties = Array.from(
    new Set(mechanics.flatMap((m) => m.specialties))
  );

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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Select a Mechanic</h1>
            <p className="text-sm text-gray-400">Choose a mechanic to start a chat session</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            ← Back
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filter */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, shop, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filterSpecialty}
            onChange={(e) => setFilterSpecialty(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Specialties</option>
            {allSpecialties.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty}
              </option>
            ))}
          </select>
        </div>

        {/* Mechanics Grid */}
        {filteredMechanics.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p>No mechanics found</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMechanics.map((mechanic) => (
              <div
                key={mechanic._id}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {mechanic.name.charAt(0)}
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      mechanic.availability === 'available'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {mechanic.availability === 'available' ? '● Available' : '● Busy'}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-white mb-1">
                  {mechanic.name}
                </h3>
                <p className="text-sm text-blue-400 mb-3">{mechanic.shopName}</p>

                <div className="mb-3">
                  <div className="flex items-center text-sm text-gray-400 mb-2">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {mechanic.city}, {mechanic.state}
                  </div>
                  <div className="flex items-center text-sm text-yellow-400">
                    <svg
                      className="w-4 h-4 mr-1 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                    {mechanic.rating.toFixed(1)} ({mechanic.totalReviews} reviews)
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {mechanic.specialties.slice(0, 3).map((specialty) => (
                      <span
                        key={specialty}
                        className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleRequestMechanic(mechanic)}
                  disabled={requesting || mechanic.availability === 'busy'}
                  className={`w-full py-2 rounded-lg font-medium transition-colors ${
                    mechanic.availability === 'busy'
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {mechanic.availability === 'busy' ? 'Currently Busy' : 'Request Chat'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
