import React, { createContext, useContext, useState, useEffect } from 'react';
import { isStandalone } from '../utils/api';
import { findUser } from '../utils/users';
import { supabase, toEmail } from '../utils/supabase';

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
    mustChangePassword: u.must_change_password ?? false,
    isAdmin: u.is_admin ?? false,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isStandalone) {
      // Standalone: restore from localStorage
      const storedUser  = localStorage.getItem('wc2026_user');
      const storedToken = localStorage.getItem('wc2026_token');
      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } catch {
          localStorage.removeItem('wc2026_token');
          localStorage.removeItem('wc2026_user');
        }
      }
      setLoading(false);
      return;
    }

    // Supabase: restore session and listen for changes.
    // Red de seguridad: a veces getSession() no resuelve en la primera carga
    // (bug del cliente de Supabase) y la app se queda en "Iniciando…".
    // Liberamos loading por lo que ocurra primero: getSession, el evento de
    // auth, o un timeout.
    let done = false;
    const finish = () => { if (!done) { done = true; setLoading(false); } };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const profile = await loadProfile(session.user);
        setToken(session.access_token);
        setUser(profile);
      }
      finish();
    }).catch(finish);

    const safety = setTimeout(finish, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const profile = await loadProfile(session.user);
        setToken(session.access_token);
        setUser(profile);
      } else {
        setToken(null);
        setUser(null);
      }
      finish();
    });

    return () => { clearTimeout(safety); subscription.unsubscribe(); };
  }, []);

  async function loadProfile(authUser) {
    const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
    if (profile) return normalizeUser(profile);
    // Perfil no existe aún — crear uno básico con los datos del token
    const username = authUser.email.split('@')[0].toLowerCase();
    const parts    = username.split('.');
    const display  = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    const initials = parts.map((p) => p[0].toUpperCase()).join('').slice(0, 2);
    const newProfile = { id: authUser.id, username, display_name: display, email: authUser.email, avatar_initials: initials, must_change_password: true };
    await supabase.from('users').insert(newProfile);
    return normalizeUser(newProfile);
  }

  const login = async (username, password) => {
    if (isStandalone) {
      const found = findUser(username, password);
      if (!found) {
        const err = new Error('Usuario o contraseña incorrectos');
        err.response = { data: { error: 'Usuario o contraseña incorrectos' } };
        throw err;
      }
      const normalized = normalizeUser({ id: found.id, username: found.username, display_name: found.displayName, email: found.email, avatar_initials: found.avatarInitials });
      const fakeToken  = `standalone-${found.username}`;
      setToken(fakeToken);
      setUser(normalized);
      localStorage.setItem('wc2026_token', fakeToken);
      localStorage.setItem('wc2026_user', JSON.stringify(normalized));
      return normalized;
    }

    const email = toEmail(username);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const err = new Error('Usuario o contraseña incorrectos');
      err.response = { data: { error: 'Usuario o contraseña incorrectos' } };
      throw err;
    }
    const profile = await loadProfile(data.user);
    // Registrar acceso
    supabase.from('login_logs').insert({ user_id: data.user.id }).then(() => {});
    // Setear de inmediato (no esperar a onAuthStateChange, que llega tarde y
    // dejaba la pantalla en "Ingresando…" hasta refrescar manualmente)
    if (data.session) setToken(data.session.access_token);
    setUser(profile);
    return profile;
  };

  const demoLogin = () => {
    const demoUser  = normalizeUser({ id: 0, username: 'demo', display_name: 'Visitante Demo', department: 'Andersen', avatar_initials: 'VD' });
    const demoToken = 'demo-mode';
    setToken(demoToken);
    setUser(demoUser);
    localStorage.setItem('wc2026_token', demoToken);
    localStorage.setItem('wc2026_user', JSON.stringify(demoUser));
  };

  const logout = async () => {
    if (!isStandalone) await supabase.auth.signOut();
    setToken(null);
    setUser(null);
    localStorage.removeItem('wc2026_token');
    localStorage.removeItem('wc2026_user');
    localStorage.removeItem('wc2026_mock_preds');
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (isStandalone) {
      const found = findUser(user.username, currentPassword);
      if (!found) {
        const err = new Error('La contraseña actual es incorrecta');
        err.response = { data: { error: 'La contraseña actual es incorrecta' } };
        throw err;
      }
      const overrides = JSON.parse(localStorage.getItem('wc2026_pw_overrides') || '{}');
      overrides[user.username] = newPassword;
      localStorage.setItem('wc2026_pw_overrides', JSON.stringify(overrides));
      return;
    }
    // Verificar contraseña actual re-autenticando
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: toEmail(user.username), password: currentPassword });
    if (signInError) {
      const err = new Error('La contraseña actual es incorrecta');
      err.response = { data: { error: 'La contraseña actual es incorrecta' } };
      throw err;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      const err = new Error(error.message);
      err.response = { data: { error: error.message } };
      throw err;
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('wc2026_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, demoLogin, logout, updateUser, changePassword, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
