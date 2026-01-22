import { isTokenExpired } from './jwt';

/**
 * Utility function for making authenticated API requests
 * - Checks token expiration before making request
 * - Automatically handles 401 errors by redirecting to login
 * - Provides clear error messages for debugging
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('accessToken');
  
  // Check if token exists and is not expired before making request
  if (!token) {
    console.warn('No access token found');
    window.location.href = '/login';
    throw new Error('No authentication token found. Please login.');
  }

  if (isTokenExpired(token)) {
    console.warn('Access token has expired');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired. Please login again.');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If unauthorized, token might have been invalidated on server
    if (response.status === 401) {
      console.warn('Server returned 401 - token invalid or expired');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }

    return response;
  } catch (error) {
    // Re-throw fetch errors (network issues, etc.)
    if (error instanceof Error && error.message.includes('Session expired')) {
      throw error;
    }
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Helper to get auth headers for fetch requests
 */
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}
