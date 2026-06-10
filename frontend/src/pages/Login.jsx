import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import andersenLogo from '../assets/andersen-logo-white-red.png';
import mundialistaLogo from '../assets/mundialista.png';
import canchaBg from '../assets/papelitos2.jpg';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername]       = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('Completa todos los campos'); return; }
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: '#F5F5F5',
    border: '1px solid #DDD',
    caretColor: '#E4002B',
    color: '#111',
  };
  const focusStyle   = { borderColor: '#E4002B', boxShadow: '0 0 0 3px rgba(228,0,43,0.15)', background: '#FFF' };
  const blurStyle    = { borderColor: '#DDD', boxShadow: 'none', background: '#F5F5F5' };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{
        backgroundImage: `url(${canchaBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#1C0000',
      }}
    >
      {/* Dark overlay for legibility */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(10,0,0,0.28) 0%, rgba(10,0,0,0.22) 35%, rgba(10,0,0,0.45) 100%)' }} />

<div className="w-full max-w-[420px] relative z-10">

        {/* ── Branding header ── */}
        <div className="text-center mb-5 fade-slide-in flex flex-col items-center gap-0">
          <img
            src={andersenLogo}
            alt="Andersen"
            className="w-72"
            style={{ filter: 'drop-shadow(0 3px 12px rgba(0,0,0,0.8))', marginBottom: '-8px' }}
          />
          <img
            src={mundialistaLogo}
            alt="Mundialista"
            className="w-[400px] max-w-full"
            style={{ filter: 'drop-shadow(0 3px 14px rgba(0,0,0,0.7))' }}
          />
        </div>

        {/* ── Login card ── */}
        <div
          className="rounded-2xl p-6 fade-slide-in"
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
            animationDelay: '0.2s',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: 'rgba(0,0,0,0.45)' }}>
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="nombre.apellido"
                autoComplete="username"
                className="w-full rounded-xl px-4 py-3 text-gray-800 text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                onBlur={(e)  => Object.assign(e.target.style, blurStyle)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: 'rgba(0,0,0,0.45)' }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-gray-800 text-sm outline-none transition-all"
                  style={inputStyle}
                  onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                  onBlur={(e)  => Object.assign(e.target.style, blurStyle)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgba(0,0,0,0.35)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(0,0,0,0.65)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(0,0,0,0.35)'; }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3"
                style={{ background: 'rgba(228,0,43,0.12)', border: '1px solid rgba(228,0,43,0.3)' }}>
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #E4002B, #B5001F)', color: '#FFFFFF' }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'linear-gradient(135deg, #FF1A3D, #E4002B)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #E4002B, #B5001F)'; }}
            >
              <LogIn size={15} />
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-4 rounded-xl p-3"
            style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)' }}>
            <p className="text-xs text-center" style={{ color: 'rgba(0,0,0,0.4)' }}>
              Usuario: <span style={{ color: '#E4002B' }}>nombre.apellido</span>
              <span className="mx-2" style={{ color: 'rgba(0,0,0,0.15)' }}>·</span>
              Contraseña: <span style={{ color: '#E4002B' }}>Cédula</span>
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="text-center mt-6 fade-slide-in" style={{ animationDelay: '0.3s' }}>
          <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.28)' }}>
            © Andersen Ecuador · Campaña Interna 2026
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.15)' }}>
            Aplicación de uso interno
          </p>
        </div>
      </div>
    </div>
  );
}
