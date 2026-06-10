import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

function AndersenLogo({ className = '' }) {
  return (
    <svg viewBox="0 0 240 82" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Andersen">
      <defs>
        <linearGradient id="al-main" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#5A0000" />
          <stop offset="30%"  stopColor="#C0001C" />
          <stop offset="65%"  stopColor="#E4002B" />
          <stop offset="100%" stopColor="#8B0015" />
        </linearGradient>
        <linearGradient id="al-shine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="rgba(255,140,140,0.35)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      {/* Main swoosh */}
      <path d="M 5,27 C 30,8 88,1 232,5 C 237,5 237,9 232,10 C 88,8 34,19 9,40 Z" fill="url(#al-main)" />
      {/* Highlight stripe */}
      <path d="M 5,27 C 30,8 88,1 232,5 C 155,3 65,13 12,32 Z" fill="url(#al-shine)" />
      {/* ANDERSEN */}
      <text x="2" y="72" fontFamily="Georgia,'Times New Roman',serif" fontSize="31" fontWeight="bold" fill="#FFFFFF" letterSpacing="4">ANDERSEN</text>
      {/* ® */}
      <text x="225" y="57" fontFamily="Georgia,serif" fontSize="10" fill="rgba(255,255,255,0.65)">®</text>
    </svg>
  );
}

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
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    caretColor: '#E4002B',
  };
  const focusStyle   = { borderColor: '#E4002B', boxShadow: '0 0 0 3px rgba(228,0,43,0.15)' };
  const blurStyle    = { borderColor: 'rgba(255,255,255,0.1)', boxShadow: 'none' };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #1C0000 0%, #2E0000 55%, #1A0000 100%)' }}
    >
      {/* Diagonal line texture */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.04 }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="lines" width="44" height="44" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="44" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lines)" />
      </svg>

      {/* Top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[380px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(228,0,43,0.16) 0%, transparent 70%)' }} />
      {/* Bottom-right glow */}
      <div className="absolute bottom-0 right-0 w-[450px] h-[320px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at right bottom, rgba(228,0,43,0.1) 0%, transparent 70%)' }} />

      {/* Ecuador flag stripe at very top */}
      <div className="absolute top-0 left-0 right-0 flex" style={{ height: '4px' }}>
        <div style={{ flex: 2, background: '#FFD100' }} />
        <div style={{ flex: 1, background: '#003DA5' }} />
        <div style={{ flex: 1, background: '#EF3340' }} />
      </div>

      <div className="w-full max-w-[420px] relative z-10">

        {/* ── Branding header ── */}
        <div className="text-center mb-7 fade-slide-in">
          <div className="flex justify-center mb-5">
            <AndersenLogo className="w-56" />
          </div>
          <div className="leading-none space-y-1">
            <div
              className="text-[68px] font-black text-white uppercase"
              style={{ fontFamily: "'Barlow Condensed', Impact, sans-serif", fontStyle: 'italic', lineHeight: 0.88, letterSpacing: '0.02em' }}
            >
              MUNDIALISTA
            </div>
            <div
              className="text-3xl font-black uppercase tracking-widest flex items-center justify-center gap-2"
              style={{ fontFamily: "'Barlow Condensed', Impact, sans-serif", color: '#E4002B' }}
            >
              2026 <span className="text-2xl">🇪🇨</span>
            </div>
          </div>
        </div>

        {/* ── Login card ── */}
        <div
          className="rounded-2xl p-6 fade-slide-in"
          style={{
            background: 'rgba(45, 0, 0, 0.75)',
            border: '1px solid rgba(228,0,43,0.25)',
            backdropFilter: 'blur(10px)',
            animationDelay: '0.2s',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: 'rgba(255,255,255,0.38)' }}>
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="nombre.apellido"
                autoComplete="username"
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                onBlur={(e)  => Object.assign(e.target.style, blurStyle)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: 'rgba(255,255,255,0.38)' }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-white text-sm outline-none transition-all"
                  style={inputStyle}
                  onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                  onBlur={(e)  => Object.assign(e.target.style, blurStyle)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.32)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.32)'; }}
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
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.28)' }}>
              Usuario: <span style={{ color: 'rgba(228,0,43,0.7)' }}>nombre.apellido</span>
              <span className="mx-2" style={{ color: 'rgba(255,255,255,0.1)' }}>·</span>
              Contraseña: <span style={{ color: 'rgba(228,0,43,0.7)' }}>tu número de cédula</span>
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
