'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import { ApiError, authApi, clearTokens, getAccessToken } from '@/lib/api';
import { User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void refreshSession();
  }, []);

  async function refreshSession() {
    try {
      // If we have a stored token, try /auth/me first
      if (getAccessToken()) {
        const currentUser = await authApi.me();
        setUser(currentUser);
        return currentUser;
      }

      // No token — try refreshing (will use stored refresh token if available)
      const refreshedSession = await authApi.refresh();
      setUser(refreshedSession.user);
      return refreshedSession.user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // Access token expired — try refresh
        try {
          const refreshedSession = await authApi.refresh();
          setUser(refreshedSession.user);
          return refreshedSession.user;
        } catch {
          setUser(null);
          clearTokens();
          return null;
        }
      }

      setUser(null);
      clearTokens();
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await authApi.login(email, password);
    setUser(response.user);
    return response.user;
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      clearTokens();
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
