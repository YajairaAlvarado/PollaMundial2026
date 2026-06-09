import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { isStandalone } from '../utils/api';

const AuthContext = createContext(null);

function normalizeUser(u) {
  return {
    id: u.id,
    username: u.username,
    displayName: u.display_name || u.displayName || u.username,
    email: u.email || '',
    department: u.department || '',
    avatarInitials: u.avatar_initials || u.avatarInitials ||
      (u.display_name || u.displayName || u.username || '').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('wc2026_token');
    const storedUser = localStorage.getItem('wc2026_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        if (!isStandalone) {
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }
      } catch {
        localStorage.removeItem('wc2026_token');
        localStorage.removeItem('wc2026_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const { token: newToken, user: newUser } = response.data;
    const normalized = normalizeUser(newUser);

    setToken(newToken);
    setUser(normalized);
    localStorage.setItem('wc2026_token', newToken);
    localStorage.setItem('wc2026_user', JSON.stringify(normalized));
    if (!isStandalone) {
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    }
    return normalized;
  };

  const demoLogin = () => {
    const demoUser = normalizeUser({
      id: 0, username: 'demo', display_name: 'Visitante Demo',
      department: 'Andersen', avatar_initials: 'VD',
    });
    const demoToken = 'demo-mode';
    setToken(demoToken);
    setUser(demoUser);
    localStorage.setItem('wc2026_token', demoToken);
    localStorage.setItem('wc2026_user', JSON.stringify(demoUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('wc2026_token');
    localStorage.removeItem('wc2026_user');
    localStorage.removeItem('wc2026_mock_preds');
    if (!isStandalone) delete api.defaults.headers.common['Authorization'];
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('wc2026_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, demoLogin, logout, updateUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
