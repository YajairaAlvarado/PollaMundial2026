import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';

const mascots = [
  { emoji: '🦌', name: 'Alce', flag: '🇨🇦', country: 'Canadá' },
  { emoji: '🦅', name: 'Águila', flag: '🇺🇸', country: 'USA' },
  { emoji: '🐆', name: 'Jaguar', flag: '🇲🇽', country: 'México' },
];

export default function Login() {
  const { login, isAuthenticated } = useAuth();
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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background balls */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 text-6xl opacity-5 ball-spin">⚽</div>
        <div className="absolute top-1/4 right-20 text-8xl opacity-5 ball-spin" style={{ animationDelay: '0.5s', animationDirection: 'reverse' }}>⚽</div>
        <div className="absolute bottom-20 left-1/4 text-4xl opacity-5 ball-spin" style={{ animationDelay: '1s' }}>⚽</div>
        <div className="absolute bottom-10 right-10 text-5xl opacity-5 ball-spin" style={{ animationDelay: '1.5s', animationDirection: 'reverse' }}>⚽</div>
        {/* Gradient orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-andersen-blue/30 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-andersen-red/30 rounded-full filter blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-yellow-400/10 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8 fade-slide-in">
          <div className="ball-bounce inline-block mb-4">⚽</div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-1">
            MUNDIAL <span className="shimmer-text">2026</span>
          </h1>
          <p className="text-white/60 text-lg font-semibold">Predictor Oficial</p>
        </div>

        {/* Mascots */}
        <div className="grid grid-cols-3 gap-3 mb-8 fade-slide-in" style={{ animationDelay: '0.1s' }}>
          {mascots.map((m) => (
            <div key={m.country} className="glass-card p-3 text-center float-anim" style={{ animationDelay: mascots.indexOf(m) * 0.4 + 's' }}>
              <div className="text-3xl mb-1">{m.emoji}</div>
              <p className="text-yellow-400 font-bold text-xs">{m.name}</p>
              <p className="text-white/50 text-xs">{m.flag} {m.country}</p>
            </div>
          ))}
        </div>

        {/* Login card */}
        <div className="glass-card-dark rounded-2xl p-6 md:p-8 fade-slide-in" style={{ animationDelay: '0.2s' }}>
          <div className="text-center mb-6">
            <h2 className="text-white font-bold text-xl mb-1">Bienvenido</h2>
            <p className="text-white/50 text-sm">Ingresar con credenciales corporativas</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-widest mb-1.5">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="nombre.apellido"
                autoComplete="username"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/20 transition-all text-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-widest mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 pr-11 text-white placeholder-white/30 focus:outline-none focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/20 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3">
                <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-yellow-400 to-yellow-500 text-blue-950 hover:from-yellow-300 hover:to-yellow-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-xl mt-6"
            >
              <LogIn size={17} />
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="text-white/40 text-xs text-center">
              Demo: <span className="text-yellow-400/70">admin</span> / <span className="text-yellow-400/70">admin123</span>
              <span className="mx-2 text-white/20">|</span>
              <span className="text-yellow-400/70">user1</span> / <span className="text-yellow-400/70">pass123</span>
            </p>
          </div>
        </div>

        {/* Footer branding */}
        <div className="text-center mt-6 fade-slide-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="h-px flex-1 bg-white/10 max-w-[60px]"></div>
            <p className="text-white/30 text-xs uppercase tracking-widest font-semibold">Andersen</p>
            <div className="h-px flex-1 bg-white/10 max-w-[60px]"></div>
          </div>
          <p className="text-white/20 text-xs">Competencia interna · World Cup 2026</p>
        </div>
      </div>
    </div>
  );
}
