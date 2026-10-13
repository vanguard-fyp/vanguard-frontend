import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserRole, DisasterLevel } from '../types';
import { authService, WEB_ADMIN_ROLES, type UserProfile } from '../services/authService';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(false);

  // Keep React state in sync with what's in localStorage on mount.
  useEffect(() => {
    setUser(authService.getStoredUser());
    setToken(authService.getToken());
    setRefreshToken(authService.getRefreshToken());
  }, []);

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
      setUser(res.user);
      setToken(res.access_token);
      if (res.refresh_token) setRefreshToken(res.refresh_token);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setToken(null);
      setRefreshToken(null);
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
   * The full permission set is in security.py; this mirrors only the checks
   * the frontend UI actually needs to gate actions.
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;

      // Lead Officer is superadmin — always granted.
      if (user.role === 'NADMA Lead Officer') return true;

      // Use server-returned permissions list when available.
      if (user.permissions?.includes(permission)) return true;

      // Fallback: hardcoded rules for Disaster Management Officer
      // (covers everything the removed roles used to do).
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
  // isCommander is true for both web admin roles.
  const isCommander = user?.role === 'Disaster Management Officer' || isLeadOfficer;

  // Consider authenticated only when we have a stored profile AND a token.
  const isAuthenticated =
    Boolean(user && token) ||
    // Tolerate a brief re-hydration window where token is set but state hasn't
    // been applied yet — check localStorage directly.
    Boolean(authService.getStoredUser() && authService.getToken());

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        isAuthenticated,
        isLoading,
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
