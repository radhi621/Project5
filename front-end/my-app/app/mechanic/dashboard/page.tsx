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
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
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
              <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight truncate">
                {profile.shopName}
              </h1>
              <p className="text-xs text-gray-500 truncate">{profile.name} · Mechanic Dashboard</p>
            </div>
          </div>

          {/* Availability quick-toggle */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {(['available', 'busy', 'offline'] as const).map(status => (
              <button
                key={status}
                onClick={() => handleAvailabilityChange(status)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                  profile.availability === status
                    ? status === 'available' ? 'bg-green-100 text-green-700'
                    : status === 'busy'      ? 'bg-yellow-100 text-yellow-700'
                    :                          'bg-gray-200 text-gray-600'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
              >
                {profile.availability === status && (
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                    status === 'available' ? 'bg-green-500' : status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
                  }`} />
                )}
                {status}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Scrollable body ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center flex-shrink-0">
                <span className="text-yellow-400 text-lg leading-none">★</span>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 leading-tight">{profile.rating.toFixed(1)}</p>
                <p className="text-xs text-gray-500">{profile.totalReviews} reviews</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 leading-tight">{profile.completedJobs}</p>
                <p className="text-xs text-gray-500">Jobs done</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 leading-tight">{pendingRequests.length}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
            <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
              profile.availability === 'available' ? 'bg-green-50 border-green-200'
              : profile.availability === 'busy'    ? 'bg-yellow-50 border-yellow-200'
              :                                       'bg-gray-100 border-gray-200'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                profile.availability === 'available' ? 'bg-green-500' : profile.availability === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
              }`} />
              <div>
                <p className={`text-sm font-semibold capitalize ${
                  profile.availability === 'available' ? 'text-green-700' : profile.availability === 'busy' ? 'text-yellow-700' : 'text-gray-600'
                }`}>{profile.availability}</p>
                <p className="text-xs text-gray-500">Status</p>
              </div>
            </div>
          </div>

          {/* Tab card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Tab nav */}
            <div className="flex border-b border-gray-200">
              {(['pending', 'appointments', 'history'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab === 'pending' ? 'Pending Requests' : tab === 'appointments' ? 'Appointments' : 'Request History'}
                  {tab === 'pending' && pendingRequests.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-5 max-h-[420px] overflow-y-auto">
              {activeTab === 'pending' && <PendingRequestsTab requests={pendingRequests} />}
              {activeTab === 'appointments' && <AppointmentsTab mechanicId={profile._id} />}
              {activeTab === 'history' && <RequestHistoryTab history={requestHistory} />}
            </div>
          </div>

          {/* Profile card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Profile Information</h2>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(false);
                      setFormData({
                        name: profile.name, phone: profile.phone, shopName: profile.shopName,
                        specialties: profile.specialties, availability: profile.availability,
                        address: profile.address || '', city: profile.city || '',
                        state: profile.state || '', zipCode: profile.zipCode || '',
                      });
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            <div className="p-5">
              {!editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Name',      value: profile.name },
                    { label: 'Email',     value: profile.email },
                    { label: 'Phone',     value: profile.phone },
                    { label: 'Shop',      value: profile.shopName },
                    { label: 'Address',   value: profile.address || '—' },
                    { label: 'City',      value: profile.city    || '—' },
                    { label: 'State',     value: profile.state   || '—' },
                    { label: 'Zip Code',  value: profile.zipCode || '—' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
                      <p className="text-sm text-gray-900">{value}</p>
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Specialties</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.specialties.map((s, i) => (
                        <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Name',     key: 'name'     as const },
                    { label: 'Phone',    key: 'phone'    as const },
                    { label: 'Address',  key: 'address'  as const },
                    { label: 'City',     key: 'city'     as const },
                    { label: 'State',    key: 'state'    as const },
                    { label: 'Zip Code', key: 'zipCode'  as const },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                      <input
                        type="text"
                        value={formData[key]}
                        onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Shop Name</label>
                    <input
                      type="text"
                      value={formData.shopName}
                      onChange={e => setFormData({ ...formData, shopName: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Specialties</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={specialtyInput}
                        onChange={e => setSpecialtyInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                        placeholder="e.g. Engine, Brakes…"
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={addSpecialty}
                        className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {formData.specialties.map((s, i) => (
                        <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium">
                          {s}
                          <button type="button" onClick={() => removeSpecialty(s)} className="text-blue-500 hover:text-blue-800 leading-none">×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
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
      <div className="text-center py-10">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-600">No pending requests</p>
        <p className="text-xs text-gray-400 mt-1">New requests will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div key={request._id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${request.status === 'reopen-requested' ? 'bg-gradient-to-br from-yellow-500 to-amber-600' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}>
                {(request.userName ?? '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{request.userName ?? 'Unknown'}</h3>
                <p className="text-xs text-gray-500">{new Date(request.createdAt).toLocaleString()}</p>
              </div>
            </div>
            {request.status === 'reopen-requested' ? (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded-full text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                Reopen Request
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-full text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                Pending
              </span>
            )}
          </div>

          {request.messages.length > 0 && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2 bg-gray-50 rounded-lg px-3 py-2">
              {request.messages[0].content}
            </p>
          )}

          <button
            onClick={() => router.push(`/mechanic-chat/${request._id}`)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            View & Respond
          </button>
        </div>
      ))}
    </div>
  );
}

function RequestHistoryTab({ history }: { history: MechanicRequest[] }) {
  const STATUS_CFG: Record<string, { label: string; dot: string; badge: string }> = {
    completed:  { label: 'Completed',  dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700 border-green-100' },
    active:     { label: 'Active',     dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700 border-blue-100' },
    cancelled:  { label: 'Cancelled',  dot: 'bg-red-400',    badge: 'bg-red-50 text-red-600 border-red-100' },
    'reopen-requested': { label: 'Reopen', dot: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-600">No request history yet</p>
        <p className="text-xs text-gray-400 mt-1">Completed and declined requests will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((request) => {
        const cfg = STATUS_CFG[request.status] ?? { label: request.status, dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-600 border-gray-100' };
        return (
          <div key={request._id} className="border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {(request.userName ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{request.userName ?? 'Unknown'}</p>
              <p className="text-xs text-gray-500">{new Date(request.createdAt).toLocaleDateString()}</p>
            </div>
            <span className={`flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs font-medium flex-shrink-0 ${cfg.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>
        );
      })}
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
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {['all', 'pending', 'confirmed', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status}
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
        <div className="space-y-3">
          {appointments.map((apt) => (
            <div key={apt._id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{apt.userName}</h3>
                  <p className="text-xs text-gray-500">{apt.serviceType}</p>
                  {apt.userPhone && (
                    <a
                      href={`tel:${apt.userPhone}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-0.5"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {apt.userPhone}
                    </a>
                  )}
                </div>
                <span className={`flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs font-medium ${
                  apt.status === 'pending'   ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                  apt.status === 'confirmed' ? 'bg-green-50 text-green-700 border-green-100' :
                  apt.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                  apt.status === 'declined'  ? 'bg-red-50 text-red-600 border-red-100' :
                  'bg-gray-50 text-gray-600 border-gray-100'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    apt.status === 'pending' ? 'bg-yellow-400' : apt.status === 'confirmed' ? 'bg-green-500' :
                    apt.status === 'completed' ? 'bg-blue-500' : 'bg-red-400'
                  }`} />
                  {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                {[
                  { label: 'Date',   value: new Date(apt.date).toLocaleDateString() },
                  { label: 'Time',   value: apt.timeSlot },
                  { label: 'Booked', value: new Date(apt.createdAt).toLocaleDateString() },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-xs font-semibold text-gray-800 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>

              {apt.notes && (
                <div className="mb-3 px-3 py-2 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Notes</p>
                  <p className="text-xs text-gray-700">{apt.notes}</p>
                </div>
              )}

              {apt.cancellationReason && (
                <div className="mb-3 px-3 py-2 bg-red-50 rounded-lg">
                  <p className="text-xs font-medium text-red-500 mb-0.5">Decline Reason</p>
                  <p className="text-xs text-red-700">{apt.cancellationReason}</p>
                </div>
              )}

              {apt.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirm(apt._id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => handleDecline(apt._id)}
                    className="flex-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                  >
                    Decline
                  </button>
                </div>
              )}

              {apt.status === 'confirmed' && (
                <button
                  onClick={() => handleComplete(apt._id)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
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
