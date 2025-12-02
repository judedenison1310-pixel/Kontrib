import { User } from "@shared/schema";
import { apiRequest } from "./queryClient";

let currentUser: User | null = null;
let authInitialized = false;

const DEVICE_TOKEN_KEY = "kontrib_device_token";
const CURRENT_USER_KEY = "currentUser";
const LOGOUT_EVENT_KEY = "kontrib_logout_event";

export function getCurrentUser(): User | null {
  return currentUser;
}

export function setCurrentUser(user: User | null): void {
  currentUser = user;
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
  
  window.dispatchEvent(new CustomEvent('authStateChanged', { detail: user }));
}

export function getDeviceToken(): string | null {
  return localStorage.getItem(DEVICE_TOKEN_KEY);
}

export function setDeviceToken(token: string | null): void {
  if (token) {
    localStorage.setItem(DEVICE_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(DEVICE_TOKEN_KEY);
  }
}

// Setup cross-tab auth synchronization
export function setupAuthSync(onAuthChange: (user: User | null) => void): () => void {
  const handleStorageChange = (event: StorageEvent) => {
    // Handle logout event from another tab
    if (event.key === LOGOUT_EVENT_KEY) {
      console.log('[Auth] Logout detected from another tab');
      currentUser = null;
      onAuthChange(null);
      return;
    }
    
    // Handle user change from another tab
    if (event.key === CURRENT_USER_KEY) {
      if (event.newValue === null) {
        console.log('[Auth] User cleared from another tab');
        currentUser = null;
        onAuthChange(null);
      } else {
        try {
          const newUser = JSON.parse(event.newValue);
          console.log('[Auth] User changed from another tab:', newUser?.fullName);
          currentUser = newUser;
          onAuthChange(newUser);
        } catch (e) {
          console.warn('[Auth] Failed to parse user from storage:', e);
        }
      }
    }
    
    // Handle device token removal (logout)
    if (event.key === DEVICE_TOKEN_KEY && event.newValue === null) {
      console.log('[Auth] Device token cleared from another tab');
      currentUser = null;
      localStorage.removeItem(CURRENT_USER_KEY);
      onAuthChange(null);
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}

// Broadcast logout to other tabs
function broadcastLogout(): void {
  // Use a timestamp to ensure the storage event fires (same value doesn't trigger event)
  localStorage.setItem(LOGOUT_EVENT_KEY, Date.now().toString());
  localStorage.removeItem(LOGOUT_EVENT_KEY);
}

export function isAuthInitialized(): boolean {
  return authInitialized;
}

export async function initializeAuth(): Promise<User | null> {
  const deviceToken = getDeviceToken();
  
  if (deviceToken) {
    try {
      console.log('[Auth] Found device token, validating...');
      const response = await fetch('/api/auth/validate-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceToken }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.valid && data.user) {
          currentUser = data.user;
          localStorage.setItem('currentUser', JSON.stringify(data.user));
          console.log('[Auth] Device validated, user:', data.user.fullName || data.user.phoneNumber);
          authInitialized = true;
          return currentUser;
        }
      }
      
      console.log('[Auth] Device token invalid, clearing...');
      setDeviceToken(null);
      localStorage.removeItem('currentUser');
    } catch (error) {
      console.warn('[Auth] Device validation failed:', error);
    }
  }
  
  const stored = localStorage.getItem('currentUser');
  if (!stored) {
    authInitialized = true;
    return null;
  }
  
  try {
    const storedUser = JSON.parse(stored);
    currentUser = storedUser;
    
    try {
      console.log('[Auth] Validating session with backend...');
      const response = await fetch(`/api/auth/me?userId=${storedUser.id}`);
      
      if (response.ok) {
        const data = await response.json();
        currentUser = data.user;
        console.log('[Auth] Session validated:', currentUser?.fullName || 'Unknown');
      } else if (response.status === 401) {
        console.warn('[Auth] User not found, clearing session');
        localStorage.removeItem('currentUser');
        setDeviceToken(null);
        currentUser = null;
      } else {
        console.warn('[Auth] Session validation failed, using cached session');
      }
    } catch (fetchError) {
      console.warn('[Auth] Cannot reach server, using cached session:', fetchError);
    }
    
    authInitialized = true;
    return currentUser;
  } catch (error) {
    console.error('[Auth] Invalid session data, clearing:', error);
    localStorage.removeItem('currentUser');
    setDeviceToken(null);
    currentUser = null;
    authInitialized = true;
    return null;
  }
}

export function isAdmin(): boolean {
  return currentUser?.role === 'admin';
}

export function isMember(): boolean {
  return currentUser?.role === 'member';
}

export async function logout(): Promise<void> {
  const deviceToken = getDeviceToken();
  
  if (deviceToken) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceToken }),
      });
    } catch (error) {
      console.warn('[Auth] Logout API call failed:', error);
    }
  }
  
  // Clear local state
  setDeviceToken(null);
  setCurrentUser(null);
  
  // Broadcast logout to other tabs
  broadcastLogout();
}

export async function sendOtp(phoneNumber: string): Promise<{ success: boolean; expiresAt?: Date; developmentOtp?: string; message?: string }> {
  const response = await apiRequest('POST', '/api/auth/send-otp', { phoneNumber });
  const data = await response.json();
  
  return {
    success: true,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    developmentOtp: data.developmentOtp,
    message: data.message,
  };
}

export async function verifyOtp(phoneNumber: string, otp: string): Promise<{ 
  verified: boolean; 
  user?: User; 
  isNewUser?: boolean;
  deviceToken?: string;
  message?: string;
}> {
  const deviceInfo = navigator.userAgent;
  const response = await apiRequest('POST', '/api/auth/verify-otp', { 
    phoneNumber, 
    otp,
    deviceInfo,
  });
  
  const data = await response.json();
  
  if (data.verified && data.deviceToken) {
    setDeviceToken(data.deviceToken);
  }
  
  if (data.verified && data.user && !data.isNewUser) {
    setCurrentUser(data.user);
  }
  
  return {
    verified: data.verified,
    user: data.user,
    isNewUser: data.isNewUser,
    deviceToken: data.deviceToken,
    message: data.message,
  };
}

export async function updateProfile(userId: string, updates: { fullName?: string; role?: string }): Promise<User> {
  const response = await apiRequest('POST', '/api/auth/update-profile', { userId, ...updates });
  
  const data = await response.json();
  setCurrentUser(data.user);
  return data.user;
}

export function needsProfileCompletion(): boolean {
  return currentUser !== null && !currentUser.fullName;
}
