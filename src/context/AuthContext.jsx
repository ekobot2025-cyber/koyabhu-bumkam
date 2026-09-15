import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('koyabhu_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    async function initAuth() {
      const savedToken = localStorage.getItem('koyabhu_token');
      if (savedToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.user);
          setToken(savedToken);
        } catch {
          localStorage.removeItem('koyabhu_token');
          localStorage.removeItem('koyabhu_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    }

    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    localStorage.setItem('koyabhu_token', res.token);
    localStorage.setItem('koyabhu_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('koyabhu_token');
    localStorage.removeItem('koyabhu_user');
    setUser(null);
    setToken(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('koyabhu_user', JSON.stringify(updatedUser));
  };

  const isAdmin = user?.role === 'ADMIN';
  const isPetugasKandang = user?.role === 'PETUGAS_KANDANG' || user?.role === 'PETUGAS';
  const isPetugasPenjualan = user?.role === 'PETUGAS_PENJUALAN';

  const allowedTabs = isAdmin
    ? ['dashboard', 'sales', 'recording', 'cashbook', 'income', 'expenses', 'reports', 'settings']
    : isPetugasPenjualan
    ? ['sales']
    : ['recording'];

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isAdmin,
        isPetugasKandang,
        isPetugasPenjualan,
        allowedTabs,
        loading,
        login,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
