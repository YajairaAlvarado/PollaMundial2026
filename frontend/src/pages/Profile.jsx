import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { User, Trophy, Target, CheckCircle, Calendar, Star, Lock, Eye, EyeOff } from 'lucide-react';

const AVATAR_COLORS = [
  'bg-purple-600', 'bg-blue-600', 'bg-emerald-600', 'bg-rose-600',
  'bg-orange-600', 'bg-teal-600', 'bg-indigo-600', 'bg-pink-600',
];

function PredictionRow({ pred }) {
  const matchDate = parseISO(pred.match_date);
  const dateStr = format(matchDate, "d MMM", { locale: es });

  let rowClass = 'result-pending border';
  let statusLabel = 'Pendiente';
  let ptsLabel = '–';

  if (pred.status === 'finished') {
    if (pred.points_earned === 3) {
      rowClass = 'result-exact border';
      statusLabel = '⭐ Exacto';
      ptsLabel = '+3';
    } else if (pred.points_earned === 2) {
      rowClass = 'result-correct border';
      statusLabel = '✓ Correcto';
      ptsLabel = '+2';
    } else {
      rowClass = 'result-wrong border';
      statusLabel = '✗ Incorrecto';
      ptsLabel = '+0';
    }
  } else if (pred.status === 'live') {
    statusLabel = '🔴 En Vivo';
  }

  return (
    <div className={`rounded-xl px-4 py-3 ${rowClass} flex items-center gap-3 text-sm`}>
      {/* Date */}
      <div className="text-xs text-white/40 w-12 flex-shrink-0">{dateStr}</div>

      {/* Match */}
      <div className="flex-1 flex items-center gap-1.5 min-w-0">
        <img
          src={`https://flagcdn.com/20x15/${pred.home_code}.png`}
          alt={pred.home_team}
          className="rounded"
        />
        <span className="text-white/70 text-xs truncate hidden sm:inline">{pred.home_team}</span>
        <span className="text-white/30 text-xs">vs</span>
        <img
          src={`https://flagcdn.com/20x15/${pred.away_code}.png`}
          alt={pred.away_team}
          className="rounded"
        />
        <span className="text-white/70 text-xs truncate hidden sm:inline">{pred.away_team}</span>
        <span className="group-badge text-xs ml-1">{pred.group_name}</span>
      </div>

      {/* Prediction */}
      <div className="text-center text-xs flex-shrink-0">
        <span className="text-white/50">Pred:</span>
        <span className="text-white font-bold ml-1">{pred.home_score}–{pred.away_score}</span>
      </div>

      {/* Actual (if finished) */}
      {pred.status === 'finished' && (
        <div className="text-center text-xs flex-shrink-0">
          <span className="text-white/50">Real:</span>
          <span className="text-white font-bold ml-1">{pred.actual_home}–{pred.actual_away}</span>
        </div>
      )}

      {/* Status & points */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs">{statusLabel}</span>
        {pred.status === 'finished' && (
          <span className="font-black text-sm">{ptsLabel}</span>
        )}
      </div>
    </div>
  );
}

function ChangePasswordForm() {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) { setMsg({ ok: false, text: 'Las contraseñas nuevas no coinciden' }); return; }
    if (next.length < 6) { setMsg({ ok: false, text: 'La contraseña debe tener al menos 6 caracteres' }); return; }
    setSaving(true);
    try {
      await changePassword(current, next);
      setMsg({ ok: true, text: 'Contraseña actualizada correctamente' });
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.error || 'Error al cambiar la contraseña' });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    caretColor: '#F59E0B',
  };

  return (
    <div className="glass-card p-6">
      <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
        <Lock size={18} className="text-yellow-400" />
        Cambiar Contraseña
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
        {[
          { label: 'Contraseña actual', val: current, set: setCurrent, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
          { label: 'Nueva contraseña', val: next, set: setNext, show: showNext, toggle: () => setShowNext(v => !v) },
          { label: 'Confirmar nueva contraseña', val: confirm, set: setConfirm, show: showNext, toggle: null },
        ].map(({ label, val, set, show, toggle }) => (
          <div key={label}>
            <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {label}
            </label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={val}
                onChange={e => set(e.target.value)}
                required
                className="w-full rounded-xl px-4 py-2.5 pr-10 text-white text-sm outline-none transition-all"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#60A5FA'; e.target.style.boxShadow = '0 0 0 3px rgba(96,165,250,0.15)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
              />
              {toggle && (
                <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              )}
            </div>
          </div>
        ))}

        {msg && (
          <div className="rounded-xl px-4 py-2.5 text-sm" style={{ background: msg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, color: msg.ok ? '#6ee7b7' : '#fca5a5' }}>
            {msg.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#06101F' }}
        >
          <Lock size={14} />
          {saving ? 'Guardando...' : 'Cambiar Contraseña'}
        </button>
      </form>
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/predictions/my')
      .then((res) => setPredictions(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Compute stats
  const stats = React.useMemo(() => {
    let total = 0, exact = 0, correct = 0, wrong = 0, pending = 0;
    for (const p of predictions) {
      if (p.status === 'finished') {
        total += p.points_earned || 0;
        if (p.points_earned === 3) exact++;
        else if (p.points_earned === 2) correct++;
        else wrong++;
      } else {
        pending++;
      }
    }
    return { total, exact, correct, wrong, pending, made: predictions.length };
  }, [predictions]);

  const colorIdx = user ? user.username.charCodeAt(0) % AVATAR_COLORS.length : 0;
  const avatarColor = AVATAR_COLORS[colorIdx];

  if (loading) return <LoadingSpinner size="lg" text="Cargando perfil..." />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Profile header */}
      <div className="glass-card p-6 flex items-center gap-5">
        <div className={`w-20 h-20 rounded-2xl ${avatarColor} flex items-center justify-center text-white text-2xl font-black flex-shrink-0`}>
          {user?.avatarInitials}
        </div>
        <div>
          <h1 className="text-2xl font-black text-white">{user?.displayName}</h1>
          <p className="text-white/50 text-sm">@{user?.username}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="bg-andersen-blue/40 border border-andersen-blue/60 text-blue-300 text-xs px-2.5 py-0.5 rounded-full">
              {user?.department}
            </span>
            {user?.email && (
              <span className="bg-white/5 border border-white/10 text-white/40 text-xs px-2.5 py-0.5 rounded-full">
                {user.email}
              </span>
            )}
          </div>
        </div>
        <div className="ml-auto text-center hidden sm:block">
          <div className="flex items-center gap-1 justify-center">
            <Trophy size={20} className="text-yellow-400" />
          </div>
          <p className="text-4xl font-black text-yellow-400">{stats.total}</p>
          <p className="text-white/40 text-xs">puntos</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {[
          { icon: <Star size={16} className="text-yellow-400" />, label: 'Puntos', value: stats.total, color: 'text-yellow-400' },
          { icon: <Target size={16} className="text-emerald-400" />, label: 'Exactos', value: stats.exact, color: 'text-emerald-400' },
          { icon: <CheckCircle size={16} className="text-blue-400" />, label: 'Correctos', value: stats.correct, color: 'text-blue-400' },
          { icon: <User size={16} className="text-red-400" />, label: 'Incorrectos', value: stats.wrong, color: 'text-red-400' },
          { icon: <Calendar size={16} className="text-purple-400" />, label: 'Pendientes', value: stats.pending, color: 'text-purple-400' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <div className="flex justify-center mb-1">{s.icon}</div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-white/40 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Change password */}
      <ChangePasswordForm />

      {/* Prediction history */}
      <div>
        <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
          <Calendar size={18} className="text-yellow-400" />
          Historial de Predicciones
          <span className="bg-white/10 text-white/50 text-xs px-2 py-0.5 rounded-full">{predictions.length}</span>
        </h2>

        {predictions.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-4xl mb-3">⚽</p>
            <p className="text-white/50">Aún no has realizado predicciones</p>
            <p className="text-white/30 text-sm mt-1">Ve a Partidos para empezar a predecir</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-3">
              <span className="flex items-center gap-1.5 text-xs text-emerald-300">
                <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50"></span>
                Exacto (+3)
              </span>
              <span className="flex items-center gap-1.5 text-xs text-yellow-300">
                <span className="w-3 h-3 rounded bg-yellow-500/30 border border-yellow-500/50"></span>
                Correcto (+2)
              </span>
              <span className="flex items-center gap-1.5 text-xs text-red-300">
                <span className="w-3 h-3 rounded bg-red-500/30 border border-red-500/50"></span>
                Incorrecto (+0)
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-300">
                <span className="w-3 h-3 rounded bg-slate-500/30 border border-slate-500/50"></span>
                Pendiente
              </span>
            </div>

            {predictions.map((pred) => (
              <PredictionRow key={pred.id} pred={pred} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
