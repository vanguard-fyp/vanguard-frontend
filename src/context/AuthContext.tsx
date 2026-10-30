import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, clearSession } from '../services/apiClient';
import type { UserRole, DisasterLevel } from '../types';
import { authService, WEB_ADMIN_ROLES, type UserProfile } from '../services/authService';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionError: string | null;
  validateSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateCurrentUser: (updates: Partial<UserProfile>) => void;
  hasPermission: (permission: string) => boolean;
  canManageLevel: (level?: DisasterLevel | string) => boolean;
  isLeadOfficer: boolean;
  isCommander: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => authService.getStoredUser());
  const [token, setToken] = useState<string | null>(() => authService.getToken());
  const [refreshToken, setRefreshToken] = useState<string | null>(() => authService.getRefreshToken());
  const [isLoading, setIsLoading] = useState(true);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const identityRef = useRef(user?.id);

  const validateSession = useCallback(async () => {
    setIsLoading(true);
    setSessionError(null);
    if (!authService.getToken()) {
      setUser(null); setToken(null); setRefreshToken(null);
      setSessionChecked(true); setIsLoading(false);
      return;
    }
    try {
      let profile: UserProfile;
      try {
        profile = await authService.getCurrentUser();
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401 || !authService.getRefreshToken()) throw error;
        await authService.refreshToken();
        profile = await authService.getCurrentUser();
      }
      localStorage.setItem('vanguard_user', JSON.stringify(profile));
      setUser(profile); setToken(authService.getToken()); setRefreshToken(authService.getRefreshToken());
      setSessionChecked(true);
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        clearSession(); setUser(null); setToken(null); setRefreshToken(null); queryClient.clear();
      } else {
        setSessionError('Your session could not be checked because the server is unavailable.');
      }
      setSessionChecked(false);
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  useEffect(() => {
    void validateSession();
    const sync = () => {
      const next = authService.getStoredUser();
      if (identityRef.current !== next?.id) queryClient.clear();
      identityRef.current = next?.id;
      setUser(next); setToken(authService.getToken()); setRefreshToken(authService.getRefreshToken());
      if (!authService.getToken()) { setSessionChecked(false); queryClient.clear(); }
    };
    window.addEventListener('vanguard:session-change', sync);
    return () => window.removeEventListener('vanguard:session-change', sync);
  }, [validateSession, queryClient]);

  // Proactive token refresh every 10 minutes to avoid mid-session expiry.
  useEffect(() => {
    if (!refreshToken) return;
    const interval = setInterval(() => {
      authService
        .refreshToken()
        .then((res) => {
          setToken(res.access_token);
          if (res.refresh_token) setRefreshToken(res.refresh_token);
          if (res.user) setUser(res.user);
        })
        .catch(() => {
          // Handled silently; the 401 interceptor in apiClient will redirect.
        });
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshToken]);

  /**
   * Sign in with real credentials via the FastAPI backend.
   * The backend validates the password through Supabase Auth and enforces the
   * admin-role gate before returning a token pair.
   */
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password);
      queryClient.clear();
      setSessionChecked(true);
      setSessionError(null);
      setUser(res.user);
      setToken(res.access_token);
      if (res.refresh_token) setRefreshToken(res.refresh_token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    clearSession();
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    setSessionChecked(false);
    queryClient.clear();
    try {
      await authService.logout();
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    try {
      const res = await authService.refreshToken();
      setUser(res.user);
      setToken(res.access_token);
      if (res.refresh_token) setRefreshToken(res.refresh_token);
    } catch {
      // Refresh failed — user will need to re-authenticate.
    }
  };

  /** Patch the local user without a full re-login (e.g. after profile save). */
  const updateCurrentUser = useCallback((updates: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...updates };
      localStorage.setItem('vanguard_user', JSON.stringify(merged));
      return merged;
    });
  }, []);

  /**
   * Permission check driven by the role returned from the backend.
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;

      // Lead Officer is superadmin — always granted.
      if (user.role === 'NADMA Lead Officer') return true;

      if (user.permissions?.includes(permission)) return true;

      // Fallback: hardcoded rules for Disaster Management Officer
      if (user.role === 'Disaster Management Officer') {
        const officerPerms = new Set([
          'MANAGE_INCIDENTS',
          'VERIFY_INCIDENT',
          'RESOLVE_INCIDENT',
          'DISPATCH_SQUADS',
          'MANAGE_MISSIONS',
          'APPROVE_RESOURCES',
          'DISPATCH_RESOURCES',
          'BROADCAST_ALERTS',
          'REQUEST_RESOURCES',
          'VIEW_ALL',
        ]);
        return officerPerms.has(permission);
      }

      return false;
    },
    [user],
  );

  const canManageLevel = useCallback(
    (_level?: DisasterLevel | string): boolean => {
      if (!user) return false;
      // Both admin roles can manage all disaster levels.
      return WEB_ADMIN_ROLES.has(user.role as UserRole);
    },
    [user],
  );

  const isLeadOfficer = user?.role === 'NADMA Lead Officer';
  const isCommander = user?.role === 'Disaster Management Officer' || isLeadOfficer;

  const isAuthenticated = sessionChecked && Boolean(user && token);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        isAuthenticated,
        isLoading,
        sessionError,
        validateSession,
        login,
        logout,
        refreshSession,
        updateCurrentUser,
        hasPermission,
        canManageLevel,
        isLeadOfficer,
        isCommander,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
