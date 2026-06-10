import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isStandalone } from '../utils/api';
import { Eye, EyeOff, LogIn, AlertCircle, ArrowRight } from 'lucide-react';


export default function Login() {
  const { login, demoLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('Completa todos los campos');
      return;
    }
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative" style={{ background: '#06101F' }}>
      {/* Subtle grid texture */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.035 }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
            <path d="M 44 0 L 0 0 0 44" fill="none" stroke="white" strokeWidth="0.8"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(27,58,107,0.35) 0%, transparent 70%)' }} />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Header */}
        <div className="text-center mb-8 fade-slide-in">
          <div className="leading-none mb-2">
            <div className="text-5xl md:text-6xl font-black text-white">POLLA</div>
            <div className="text-5xl md:text-6xl font-black" style={{ color: '#F59E0B' }}>MUNDIAL</div>
            <div className="text-3xl font-black" style={{ color: 'rgba(255,255,255,0.6)' }}>2026</div>
          </div>
        </div>

        {/* Quick access — solo en modo standalone */}
        {isStandalone && (
          <>
            <div className="mb-5 fade-slide-in" style={{ animationDelay: '0.15s' }}>
              <button
                onClick={() => { demoLogin(); navigate('/dashboard', { replace: true }); }}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: '#06101F',
                  boxShadow: '0 4px 20px rgba(245,158,11,0.32)',
                }}
              >
                ENTRAR A VER LA APP
                <ArrowRight size={20} />
              </button>
              <p className="text-center mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.22)' }}>
                Acceso rápido sin credenciales
              </p>
            </div>
            <div className="flex items-center gap-3 mb-5 fade-slide-in" style={{ animationDelay: '0.2s' }}>
              <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
              <span className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.22)' }}>
                o con cuenta corporativa
              </span>
              <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
            </div>
          </>
        )}

        {/* Login card */}
        <div
          className="rounded-2xl p-6 fade-slide-in"
          style={{ background: '#0D1B30', border: '1px solid rgba(255,255,255,0.08)', animationDelay: '0.25s' }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="nombre.apellido"
                autoComplete="username"
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  caretColor: '#F59E0B',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#60A5FA'; e.target.style.boxShadow = '0 0 0 3px rgba(96,165,250,0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
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
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    caretColor: '#F59E0B',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#60A5FA'; e.target.style.boxShadow = '0 0 0 3px rgba(96,165,250,0.15)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)' }}>
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#06101F' }}
            >
              <LogIn size={15} />
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-4 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.28)' }}>
              Usuario: <span style={{ color: 'rgba(245,158,11,0.6)' }}>nombre.apellido</span>
              <span className="mx-2" style={{ color: 'rgba(255,255,255,0.12)' }}>·</span>
              Contraseña: <span style={{ color: 'rgba(245,158,11,0.6)' }}>Mundial2026</span>
            </p>
          </div>
        </div>

        <div className="text-center mt-5 fade-slide-in" style={{ animationDelay: '0.3s' }}>
          <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>
            © Andersen Ecuador · World Cup 2026
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.18)' }}>
            Aplicación de uso interno
          </p>
        </div>
      </div>
    </div>
  );
}
