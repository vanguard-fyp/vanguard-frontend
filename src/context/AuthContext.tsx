import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserRole, DisasterLevel } from '../types';
import { authService, type UserProfile } from '../services/authService';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  loginWithRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateCurrentUser: (updates: Partial<UserProfile>) => void;
  hasPermission: (permission: string) => boolean;
  canManageLevel: (level?: DisasterLevel | string) => boolean;
  isLeadOfficer: boolean;
  isCommander: boolean;
  isCitizen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => authService.getStoredUser());
  const [token, setToken] = useState<string | null>(() => authService.getToken());
  const [refreshToken, setRefreshToken] = useState<string | null>(() => authService.getRefreshToken());
  const [isLoading, setIsLoading] = useState(false);

  // Sync token / user state
  const syncStateFromStorage = useCallback(() => {
    const storedUser = authService.getStoredUser();
    const storedToken = authService.getToken();
    const storedRefresh = authService.getRefreshToken();
    setUser(storedUser);
    setToken(storedToken);
    setRefreshToken(storedRefresh);
  }, []);

  useEffect(() => {
    syncStateFromStorage();
  }, [syncStateFromStorage]);

  // Periodic proactive token refresh (every 10 minutes if refresh token exists)
  useEffect(() => {
    if (!refreshToken) return;
    const interval = setInterval(() => {
      authService.refreshToken().then((res) => {
        setToken(res.access_token);
        if (res.refresh_token) setRefreshToken(res.refresh_token);
        if (res.user) setUser(res.user);
      }).catch(() => {
        // Handled silently or by 401 interceptor
      });
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshToken]);

  const login = async (email: string, password: string = 'password') => {
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

  const loginWithRole = async (role: UserRole) => {
    setIsLoading(true);
    try {
      const res = await authService.getDemoToken(role);
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
      // Refresh failed
    }
  };

  // Patch the local auth user without a full re-login (used after profile save)
  const updateCurrentUser = useCallback((updates: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...updates };
      // Persist back to localStorage so page refresh keeps the change
      localStorage.setItem('vanguard_user', JSON.stringify(merged));
      return merged;
    });
  }, []);

  // TODO: Permission Checks
  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'NADMA Lead Officer') return true;
    if (user.permissions && user.permissions.includes(permission)) return true;

    // Fallback role rules
    switch (permission) {
      case 'MANAGE_INCIDENTS':
      case 'VERIFY_INCIDENT':
      case 'RESOLVE_INCIDENT':
        return user.role === 'Disaster Management Officer';
      case 'DISPATCH_SQUADS':
        return user.role === 'Disaster Management Officer' || user.role === 'Rescue Coordinator';
      case 'APPROVE_RESOURCES':
        return user.role === 'Resource Manager';
      case 'BROADCAST_ALERTS':
        return user.role === 'Government Administrator';
      case 'SYSTEM_ADMIN':
        return false;
      case 'CREATE_REPORT':
        return true;
      default:
        return false;
    }
  }, [user]);

  const canManageLevel = useCallback((level?: DisasterLevel | string): boolean => {
    if (!user) return false;
    if (user.role === 'NADMA Lead Officer') return true;
    if (user.role === 'Disaster Management Officer') return true; // Level 1, 2, 3
    if (user.role === 'Rescue Coordinator' || user.role === 'Resource Manager') {
      return level !== 'Level 3: Federal';
    }
    return false;
  }, [user]);

  const isLeadOfficer = user?.role === 'NADMA Lead Officer';
  const isCommander = user?.role === 'Disaster Management Officer' || isLeadOfficer;
  const isCitizen = user?.role === 'Citizen Reporter';
  const isAuthenticated = Boolean(user && (token || localStorage.getItem('vanguard_user')));

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        isAuthenticated,
        isLoading,
        login,
        loginWithRole,
        logout,
        refreshSession,
        updateCurrentUser,
        hasPermission,
        canManageLevel,
        isLeadOfficer,
        isCommander,
        isCitizen,
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
