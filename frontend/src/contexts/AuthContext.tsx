// Auth Context for Match Sport 24
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { apiClient } from '../api/client';
import { User } from '../types';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;  // New: Guest mode flag
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: string, referralCode?: string) => Promise<void>;
  googleAuth: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<{ success: boolean; message: string }>;
  refreshUser: () => Promise<void>;
  enterGuestMode: () => void;  // New: Enter guest mode
  exitGuestMode: () => void;   // New: Exit guest mode
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isGuest, setIsGuest] = useState(false);  // New: Guest mode state

  const refreshUser = useCallback(async () => {
    try {
      const userData = await apiClient.getMe();
      setUser(userData);
    } catch (error) {
      console.log('RefreshUser error (expected if not logged in):', error);
      setUser(null);
    }
  }, []);

  // Initialize auth on mount - runs only once
  useEffect(() => {
    if (isInitialized) return;
    
    let isMounted = true;
    
    const initAuth = async () => {
      // Immediate timeout fallback - never wait more than 3 seconds
      const timeout = setTimeout(() => {
        if (isMounted) {
          console.log('[Auth] Timeout reached - forcing loading complete');
          setIsLoading(false);
          setIsInitialized(true);
        }
      }, 3000);

      try {
        // Check for existing token
        let token: string | null = null;
        
        if (Platform.OS === 'web') {
          try {
            token = localStorage.getItem('auth_token');
          } catch (e) {
            console.log('[Auth] localStorage not available');
          }
        } else {
          try {
            token = await SecureStore.getItemAsync('auth_token');
          } catch (e) {
            console.log('[Auth] SecureStore error:', e);
          }
        }

        if (token && isMounted) {
          try {
            await refreshUser();
          } catch (e) {
            console.log('[Auth] Refresh user failed:', e);
          }
        }
      } catch (error) {
        console.log('[Auth] Init error:', error);
      } finally {
        clearTimeout(timeout);
        if (isMounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [isInitialized, refreshUser]);

  // Setup push notifications only on native platforms and when user is logged in
  useEffect(() => {
    if (!user || Platform.OS === 'web') return;
    
    // Lazy load push notification service only when needed
    const setupPushNotifications = async () => {
      try {
        const { pushNotificationService } = await import('../services/pushNotifications');
        pushNotificationService.registerTokenWithBackend();
        pushNotificationService.setupNotificationListeners();
        
        return () => {
          pushNotificationService.removeListeners();
        };
      } catch (error) {
        console.log('[Auth] Push notifications not available:', error);
      }
    };
    
    setupPushNotifications();
  }, [user]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.login(email, password);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string, role: string = 'player', referralCode?: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.register(email, password, name, role, referralCode);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const googleAuth = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.googleAuth(sessionId);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.log('Logout error:', error);
    } finally {
      setUser(null);
      setIsGuest(false);  // Exit guest mode on logout
    }
  };

  const deleteAccount = async (password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await apiClient.deleteAccount(password);
      setUser(null);
      setIsGuest(false);
      return result;
    } catch (error: any) {
      console.error('Delete account error:', error);
      throw error;
    }
  };

  // Guest mode functions
  const enterGuestMode = () => {
    setIsGuest(true);
  };

  const exitGuestMode = () => {
    setIsGuest(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isGuest,
        login,
        register,
        googleAuth,
        logout,
        deleteAccount,
        refreshUser,
        enterGuestMode,
        exitGuestMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
