import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  googleId: string | null;
  timezone: string;
  units: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loginWithGoogle: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const oauthError = urlParams.get('error');
      const oauthAuth = urlParams.get('auth');

      if (oauthError) {
        let errorMsg = 'Google sign-in could not be completed. Please try again.';
        if (oauthError === 'OAUTH_NOT_CONFIGURED') {
          errorMsg = 'Google OAuth is not configured on the server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.';
        } else if (oauthError === 'CSRF_STATE_MISMATCH') {
          errorMsg = 'Authentication security check failed (CSRF state mismatch). Please try again.';
        } else if (oauthError === 'OAUTH_TOKEN_FAILED' || oauthError === 'OAUTH_USERINFO_FAILED') {
          errorMsg = 'Failed to retrieve profile from Google. Please try again.';
        } else if (oauthError === 'access_denied') {
          errorMsg = 'Google sign-in was cancelled. Please try again.';
        } else if (oauthError !== 'OAUTH_FAILED') {
          errorMsg = `Google sign-in error: ${oauthError}`;
        }
        setError(errorMsg);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (oauthAuth === 'success') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      try {
        const response = await authApi.me();
        setUser(response.data.user);
      } catch {
        // Not authenticated — fine
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const response = await authApi.login({ email, password });
      setUser(response.data.user);
      return true;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      return false;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string): Promise<boolean> => {
    setError(null);
    try {
      const response = await authApi.register({ name, email, password });
      setUser(response.data.user);
      return true;
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors on logout
    }
    setUser(null);
  }, []);

  const loginWithGoogle = useCallback(() => {
    window.location.href = authApi.googleLoginUrl();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
        loginWithGoogle,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
