'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '../../utils/api';

interface MechanicProfile {
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
  address: string;
  city: string;
  state: string;
  zipCode: string;
  isActive: boolean;
}

interface MechanicRequest {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  messages: { senderId: string; senderName: string; senderRole: string; content: string; timestamp: string }[];
  status: 'pending' | 'active' | 'completed' | 'reopen-requested' | 'cancelled';
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
}

export default function MechanicDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<MechanicProfile | null>(null);
  const [pendingRequests, setPendingRequests] = useState<MechanicRequest[]>([]);
  const [requestHistory, setRequestHistory] = useState<MechanicRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'appointments'>('pending');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    shopName: '',
    specialties: [] as string[],
    availability: 'available' as 'available' | 'busy' | 'offline',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [specialtyInput, setSpecialtyInput] = useState('');

  useEffect(() => {
    if (authLoading) {
      return;
    }
    
    if (!user || user.role !== 'mechanic') {
      router.push('/');
    } else {
      loadProfile();
      loadPendingRequests();
      loadRequestHistory();
    }
  }, [user, authLoading, router]);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      // Find mechanic profile by email
      const response = await authenticatedFetch('http://localhost:3001/api/mechanics');
      
      if (response.ok) {
        const mechanics = await response.json();
        const myProfile = mechanics.find((m: MechanicProfile) => m.email === user?.email);
        
        if (myProfile) {
          setProfile(myProfile);
          setFormData({
            name: myProfile.name,
            phone: myProfile.phone,
            shopName: myProfile.shopName,
            specialties: myProfile.specialties,
            availability: myProfile.availability,
            address: myProfile.address || '',
            city: myProfile.city || '',
            state: myProfile.state || '',
            zipCode: myProfile.zipCode || '',
          });
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  const loadPendingRequests = async () => {
    try {
      console.log('Loading pending requests...');
      const response = await authenticatedFetch('http://localhost:3001/api/mechanic-requests/pending');
      
      console.log('Response status:', response.status);
      if (response.ok) {
        const requests = await response.json();
        console.log('Pending requests:', requests);
        setPendingRequests(requests);
      } else {
        console.error('Failed to fetch requests:', response.status);
      }
    } catch (error) {
      console.error('Failed to load pending requests:', error);
    }
  };

  const loadRequestHistory = async () => {
    try {
      const response = await authenticatedFetch('http://localhost:3001/api/mechanic-requests/my-chats');
      
      if (response.ok) {
        const history = await response.json();
        console.log('Request history:', history);
        setRequestHistory(history);
      }
    } catch (error) {
      console.error('Failed to load request history:', error);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    
    try {
      setSaving(true);
      const response = await authenticatedFetch(`http://localhost:3001/api/mechanics/${profile._id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        const updated = await response.json();
        setProfile(updated);
        setEditing(false);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAvailabilityChange = async (newAvailability: 'available' | 'busy' | 'offline') => {
    if (!profile) return;
    
    try {
      const response = await authenticatedFetch(`http://localhost:3001/api/mechanics/${profile._id}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ availability: newAvailability }),
      });
      
      if (response.ok) {
        const updated = await response.json();
        setProfile(updated);
        setFormData({ ...formData, availability: newAvailability });
      }
    } catch (error) {
      console.error('Failed to update availability:', error);
    }
  };

  const addSpecialty = () => {
    if (specialtyInput.trim() && !formData.specialties.includes(specialtyInput.trim())) {
      setFormData({
        ...formData,
        specialties: [...formData.specialties, specialtyInput.trim()],
      });
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (specialty: string) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.filter(s => s !== specialty),
    });
  };

  if (!user || user.role !== 'mechanic') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Setup Required</h2>
            <p className="text-gray-600 mb-6">
              Your mechanic profile needs to be created by an administrator before you can access this dashboard.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              What you need:
            </h3>
            <ul className="text-sm text-blue-900 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Contact your system administrator</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Provide your email: <strong>{user?.email}</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Admin will create your mechanic profile with shop details and specialties</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Go to Chat
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Refresh Page
            </button>
          </div>
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
              <h1 className="text-2xl font-bold text-gray-900">Mechanic Dashboard</h1>
              <p className="text-sm text-gray-500">Manage your profile and availability</p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back to Chat
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stats Cards */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rating</p>
                <p className="text-2xl font-bold text-gray-900">{profile.rating.toFixed(1)}</p>
              </div>
              <span className="text-3xl text-yellow-400">★</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">{profile.totalReviews} total reviews</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{profile.completedJobs}</p>
              </div>
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div>
              <p className="text-sm text-gray-500 mb-3">Availability</p>
              <div className="flex gap-2">
                {(['available', 'busy', 'offline'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleAvailabilityChange(status)}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      profile.availability === status
                        ? status === 'available'
                          ? 'bg-green-100 text-green-800'
                          : status === 'busy'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-200 text-gray-800'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'pending'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pending Requests
                {pendingRequests.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('appointments')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'appointments'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Appointments
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Request History
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'pending' && (
              <PendingRequestsTab requests={pendingRequests} />
            )}
            {activeTab === 'appointments' && (
              <AppointmentsTab mechanicId={profile._id} />
            )}
            {activeTab === 'history' && (
              <RequestHistoryTab history={requestHistory} />
            )}
          </div>
        </div>

        {/* Profile Information */}
        <div className="mt-6 bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      name: profile.name,
                      phone: profile.phone,
                      shopName: profile.shopName,
                      specialties: profile.specialties,
                      availability: profile.availability,
                      address: profile.address || '',
                      city: profile.city || '',
                      state: profile.state || '',
                      zipCode: profile.zipCode || '',
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          <div className="p-6">
            {!editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-gray-900">{profile.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{profile.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <p className="text-gray-900">{profile.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shop Name</label>
                  <p className="text-gray-900">{profile.shopName}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specialties</label>
                  <div className="flex flex-wrap gap-2">
                    {profile.specialties.map((specialty, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <p className="text-gray-900">{profile.address || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <p className="text-gray-900">{profile.city || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <p className="text-gray-900">{profile.state || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                  <p className="text-gray-900">{profile.zipCode || 'Not provided'}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shop Name</label>
                  <input
                    type="text"
                    value={formData.shopName}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specialties</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={specialtyInput}
                      onChange={(e) => setSpecialtyInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                      placeholder="Add specialty (e.g., Engine, Brakes)"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={addSpecialty}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.specialties.map((specialty, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm flex items-center gap-2"
                      >
                        {specialty}
                        <button
                          type="button"
                          onClick={() => removeSpecialty(specialty)}
                          className="text-blue-900 hover:text-blue-700"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab Components
function PendingRequestsTab({ requests }: { requests: MechanicRequest[] }) {
  const router = useRouter();

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p className="text-gray-500">No pending requests</p>
        <p className="text-sm text-gray-400 mt-1">New requests will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div key={request._id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                {request.userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{request.userName}</h3>
                <p className="text-sm text-gray-500">{new Date(request.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
              Pending
            </span>
          </div>

          {request.messages.length > 0 && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{request.messages[0].content}</p>
            </div>
          )}

          <button 
            onClick={() => router.push(`/mechanic-chat/${request._id}`)}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
          >
            View Full Request & Respond
          </button>
        </div>
      ))}
    </div>
  );
}

function RequestHistoryTab({ history }: { history: MechanicRequest[] }) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-gray-500">No request history yet</p>
        <p className="text-sm text-gray-400 mt-1">Accepted and declined requests will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((request) => (
        <div key={request._id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-white font-bold">
                {request.userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{request.userName}</h3>
                <p className="text-sm text-gray-500">{new Date(request.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              request.status === 'completed' ? 'bg-green-100 text-green-800' :
              request.status === 'active' ? 'bg-blue-100 text-blue-800' :
              request.status === 'cancelled' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AppointmentsTab({ mechanicId }: { mechanicId: string }) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed'>('all');

  useEffect(() => {
    loadAppointments();
  }, [filter]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const statusParam = filter !== 'all' ? `?status=${filter}` : '?status=all';
      const url = `http://localhost:3001/api/appointments/mechanic/${mechanicId}${statusParam}`;
      console.log('Loading appointments for mechanic:', mechanicId);
      console.log('Fetching URL:', url);
      
      const response = await authenticatedFetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('Appointments received:', data);
        setAppointments(data);
      } else {
        console.error('Failed to fetch appointments, status:', response.status);
      }
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      const response = await authenticatedFetch(
        `http://localhost:3001/api/appointments/${id}/confirm`,
        { method: 'PATCH' }
      );
      if (response.ok) {
        alert('Appointment confirmed!');
        loadAppointments();
      }
    } catch (error) {
      alert('Failed to confirm appointment');
    }
  };

  const handleDecline = async (id: string) => {
    const reason = prompt('Please provide a reason for declining:');
    if (!reason) return;

    try {
      const response = await authenticatedFetch(
        `http://localhost:3001/api/appointments/${id}/decline`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        }
      );
      if (response.ok) {
        alert('Appointment declined');
        loadAppointments();
      }
    } catch (error) {
      alert('Failed to decline appointment');
    }
  };

  const handleComplete = async (id: string) => {
    if (!confirm('Mark this appointment as completed?')) return;

    try {
      const response = await authenticatedFetch(
        `http://localhost:3001/api/appointments/${id}/complete`,
        { method: 'PATCH' }
      );
      if (response.ok) {
        alert('Appointment marked as completed!');
        loadAppointments();
      }
    } catch (error) {
      alert('Failed to complete appointment');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading appointments...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {['all', 'pending', 'confirmed', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {appointments.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-500">No appointments found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((apt) => (
            <div key={apt._id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{apt.userName}</h3>
                  <p className="text-sm text-gray-600">{apt.serviceType}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  apt.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  apt.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  apt.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                  apt.status === 'declined' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-500">Date:</span>
                  <span className="ml-2 font-medium">{new Date(apt.date).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">Time:</span>
                  <span className="ml-2 font-medium">{apt.timeSlot}</span>
                </div>
                <div>
                  <span className="text-gray-500">Duration:</span>
                  <span className="ml-2 font-medium">{apt.estimatedDuration} min</span>
                </div>
                <div>
                  <span className="text-gray-500">Booked:</span>
                  <span className="ml-2 font-medium">{new Date(apt.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {apt.notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 font-medium">Notes:</p>
                  <p className="text-sm text-gray-700">{apt.notes}</p>
                </div>
              )}

              {apt.cancellationReason && (
                <div className="mb-4 p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Decline Reason:</p>
                  <p className="text-sm text-red-700">{apt.cancellationReason}</p>
                </div>
              )}

              {/* Actions */}
              {apt.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirm(apt._id)}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => handleDecline(apt._id)}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
                  >
                    Decline
                  </button>
                </div>
              )}

              {apt.status === 'confirmed' && (
                <button
                  onClick={() => handleComplete(apt._id)}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Mark as Completed
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
