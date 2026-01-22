'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Mechanic {
  _id: string;
  name: string;
  email: string;
  phone: string;
  shopName: string;
  specialties: string[];
  rating: number;
  totalReviews: number;
  availability: 'available' | 'busy' | 'offline';
  completedJobs: number;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  isActive: boolean;
}

export default function MechanicsPage() {
  const router = useRouter();
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAvailability, setFilterAvailability] = useState('all');
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  const [sortBy, setSortBy] = useState('rating'); // rating, reviews, jobs

  useEffect(() => {
    loadMechanics();
  }, [filterAvailability]);

  const loadMechanics = async () => {
    try {
      setLoading(true);
      const url = filterAvailability !== 'all' 
        ? `http://localhost:3001/api/mechanics?availability=${filterAvailability}`
        : 'http://localhost:3001/api/mechanics';
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setMechanics(data);
      }
    } catch (error) {
      console.error('Failed to load mechanics:', error);
    } finally {
      setLoading(false);
    }
  };

  const allSpecialties = Array.from(
    new Set(mechanics.flatMap(m => m.specialties))
  ).sort();

  const filteredMechanics = mechanics.filter(mechanic => {
    const matchesSearch = 
      mechanic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mechanic.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mechanic.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mechanic.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSpecialty = filterSpecialty === 'all' || 
      mechanic.specialties.includes(filterSpecialty);
    
    return matchesSearch && matchesSpecialty;
  });

  const sortedMechanics = [...filteredMechanics].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'reviews':
        return b.totalReviews - a.totalReviews;
      case 'jobs':
        return b.completedJobs - a.completedJobs;
      default:
        return 0;
    }
  });

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800';
      case 'offline':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAvailabilityIcon = (availability: string) => {
    switch (availability) {
      case 'available':
        return '●';
      case 'busy':
        return '◐';
      case 'offline':
        return '○';
      default:
        return '○';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Find a Mechanic</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                Browse trusted mechanics and book your service
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => router.push('/appointments')}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                My Appointments
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back to Chat
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Search */}
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search mechanics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base text-gray-900 bg-white placeholder-gray-500"
              />
            </div>

            {/* Availability Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Availability
              </label>
              <select
                value={filterAvailability}
                onChange={(e) => setFilterAvailability(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base text-gray-900 bg-white"
              >
                <option value="all" className="text-gray-900">All</option>
                <option value="available" className="text-gray-900">Available</option>
                <option value="busy" className="text-gray-900">Busy</option>
                <option value="offline" className="text-gray-900">Offline</option>
              </select>
            </div>

            {/* Specialty Filter */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Specialty
              </label>
              <select
                value={filterSpecialty}
                onChange={(e) => setFilterSpecialty(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base text-gray-900 bg-white"
              >
                <option value="all" className="text-gray-900">All Specialties</option>
                {allSpecialties.map(specialty => (
                  <option key={specialty} value={specialty} className="text-gray-900">{specialty}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
            <span className="text-xs sm:text-sm font-medium text-gray-700">Sort by:</span>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {['rating', 'reviews', 'jobs'].map((sort) => (
                <button
                  key={sort}
                  onClick={() => setSortBy(sort)}
                  className={`px-3 py-1 text-xs sm:text-sm rounded-lg ${
                    sortBy === sort
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {sort.charAt(0).toUpperCase() + sort.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-4 sm:mb-6">
          <p className="text-sm text-gray-600">
            Showing {sortedMechanics.length} {sortedMechanics.length === 1 ? 'mechanic' : 'mechanics'}
          </p>
        </div>

        {/* Mechanics Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading mechanics...</p>
          </div>
        ) : sortedMechanics.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">No mechanics found matching your criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {sortedMechanics.map((mechanic) => (
              <div
                key={mechanic._id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{mechanic.name}</h3>
                    <p className="text-sm text-gray-600">{mechanic.shopName}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAvailabilityColor(mechanic.availability)}`}>
                    {getAvailabilityIcon(mechanic.availability)} {mechanic.availability}
                  </span>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    <span className="text-yellow-400 text-lg">★</span>
                    <span className="ml-1 text-lg font-semibold text-gray-900">{mechanic.rating.toFixed(1)}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    ({mechanic.totalReviews} reviews)
                  </span>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{mechanic.completedJobs} jobs</span>
                  </div>
                </div>

                {/* Specialties */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-700 mb-2">Specialties:</p>
                  <div className="flex flex-wrap gap-2">
                    {mechanic.specialties.slice(0, 3).map((specialty, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg"
                      >
                        {specialty}
                      </span>
                    ))}
                    {mechanic.specialties.length > 3 && (
                      <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-lg">
                        +{mechanic.specialties.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Location */}
                {mechanic.city && (
                  <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{mechanic.city}, {mechanic.state}</span>
                  </div>
                )}

                {/* Contact */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <p className="text-gray-600">
                        <a href={`tel:${mechanic.phone}`} className="hover:text-blue-600">
                          {mechanic.phone}
                        </a>
                      </p>
                      <p className="text-gray-600">
                        <a href={`mailto:${mechanic.email}`} className="hover:text-blue-600 text-xs">
                          {mechanic.email}
                        </a>
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/book-appointment/${mechanic._id}`)}
                      disabled={mechanic.availability === 'offline'}
                      className={`px-4 py-2 text-sm font-medium rounded-lg ${
                        mechanic.availability === 'offline'
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {mechanic.availability === 'offline' ? 'Offline' : 'Book Appointment'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
