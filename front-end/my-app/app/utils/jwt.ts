/**
 * JWT utility functions for client-side token management
 */

interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Decode JWT token without verification (client-side only)
 * Returns null if token is invalid
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 * Returns true if expired or invalid
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  // exp is in seconds, Date.now() is in milliseconds
  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
}

/**
 * Get time until token expires in seconds
 * Returns 0 if expired or invalid
 */
export function getTokenTimeRemaining(token: string): number {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return 0;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const remaining = decoded.exp - currentTime;
  return remaining > 0 ? remaining : 0;
}

/**
 * Extract user data from JWT token
 */
export function getUserFromToken(token: string): { id: string; email: string; role: string } | null {
  const decoded = decodeJWT(token);
  if (!decoded) {
    return null;
  }

  return {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
  };
}
