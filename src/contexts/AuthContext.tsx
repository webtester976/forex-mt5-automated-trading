import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, RoleId } from '../types/index.js';
import { apiFetch, isCloudflarePagesStandalone, API_BASE_URL } from '../lib/api.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  apiBaseUrl: string;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  adminLogin: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signup: (firstName: string, lastName: string, email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRoleDemo: (roleTarget: 'customer_alex' | 'customer_sarah' | 'super_admin' | 'risk_officer' | 'support') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('forex_saas_token') || localStorage.getItem('auth_token') || null;
  });
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('forex_saas_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // If a saved token exists, hold initial route guards in loading state until verified
    return Boolean(localStorage.getItem('forex_saas_token') || localStorage.getItem('auth_token'));
  });

  const getNetworkErrorMessage = (serviceName: string): string => {
    if (isCloudflarePagesStandalone()) {
      return `Network error communicating with ${serviceName}: Frontend is deployed on Cloudflare Pages without VITE_API_BASE_URL. Please configure VITE_API_BASE_URL in Cloudflare Pages environment variables to your backend API URL.`;
    }
    return `Network error communicating with ${serviceName}. Please ensure the backend API server is online and CORS is configured.`;
  };

  // Restore and validate session on initial application load / browser refresh
  useEffect(() => {
    const savedToken = localStorage.getItem('forex_saas_token') || localStorage.getItem('auth_token');
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    setToken(savedToken);
    apiFetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${savedToken}` },
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(res.status === 401 || res.status === 403 ? 'EXPIRED_OR_INVALID' : 'VALIDATION_FAILED');
        }
        return res.json();
      })
      .then(data => {
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('forex_saas_user', JSON.stringify(data.user));
          localStorage.setItem('forex_saas_token', savedToken);
          localStorage.setItem('auth_token', savedToken);
        } else {
          throw new Error('NO_USER');
        }
      })
      .catch((err) => {
        if (err?.message === 'EXPIRED_OR_INVALID' || err?.message === 'NO_USER') {
          // Token is rejected or expired: clean up stored session
          localStorage.removeItem('forex_saas_token');
          localStorage.removeItem('auth_token');
          localStorage.removeItem('forex_saas_user');
          setToken(null);
          setUser(null);
        } else {
          console.warn('[Auth] Session validation error:', err);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('forex_saas_token', data.token);
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('forex_saas_user', JSON.stringify(data.user));
      return { success: true };
    } catch {
      return { success: false, error: getNetworkErrorMessage('authentication service') };
    }
  };

  const adminLogin = async (email: string, pass: string) => {
    try {
      const res = await apiFetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Admin login failed' };
      }
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('forex_saas_token', data.token);
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('forex_saas_user', JSON.stringify(data.user));
      return { success: true };
    } catch {
      return { success: false, error: getNetworkErrorMessage('administrative service') };
    }
  };

  const signup = async (firstName: string, lastName: string, email: string, pass: string) => {
    try {
      const res = await apiFetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Signup failed' };
      }
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('forex_saas_token', data.token);
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('forex_saas_user', JSON.stringify(data.user));
      return { success: true };
    } catch {
      return { success: false, error: getNetworkErrorMessage('customer registration service') };
    }
  };

  const logout = () => {
    const activeToken = token || localStorage.getItem('forex_saas_token') || localStorage.getItem('auth_token');
    if (activeToken) {
      apiFetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${activeToken}` },
      }).catch(() => {});
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('forex_saas_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('forex_saas_user');
  };

  // Quick switch demo helper for instant inspection between roles
  const switchRoleDemo = async (roleTarget: 'customer_alex' | 'customer_sarah' | 'super_admin' | 'risk_officer' | 'support') => {
    let email = 'alex.morgan@example.com';
    let pass = 'CustomerPass123!';
    let isAdminTarget = false;

    if (roleTarget === 'customer_sarah') {
      email = 'sarah.chen@example.com';
      pass = 'CustomerPass123!';
    } else if (roleTarget === 'super_admin') {
      email = 'superadmin@forexsaas.com';
      pass = 'SuperAdmin123!';
      isAdminTarget = true;
    } else if (roleTarget === 'risk_officer') {
      email = 'risk@forexsaas.com';
      pass = 'RiskManager123!';
      isAdminTarget = true;
    } else if (roleTarget === 'support') {
      email = 'support@forexsaas.com';
      pass = 'SupportDesk123!';
      isAdminTarget = true;
    }

    if (isAdminTarget) {
      await adminLogin(email, pass);
    } else {
      await login(email, pass);
    }
  };

  const isAdmin = user ? ['super_admin', 'admin', 'risk_officer', 'finance', 'support'].includes(user.role) : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAdmin,
        isAuthenticated: !!user,
        isLoading,
        apiBaseUrl: API_BASE_URL,
        login,
        adminLogin,
        signup,
        logout,
        switchRoleDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
