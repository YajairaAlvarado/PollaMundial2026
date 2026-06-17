import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, Save, AlertTriangle, Lock, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../utils/api';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';

function FlagImg({ code, name }) {
  return (
    <img
      src={`https://flagcdn.com/64x48/${code.toLowerCase()}.png`}
      alt={name}
      className="rounded-lg shadow-lg mx-auto"
      style={{ width: 64, height: 48 }}
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  );
}

function ScoreControl({ value, onChange, label }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-white/50 text-xs uppercase tracking-widest">{label}</p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95"
        >
          <Minus size={14} />
        </button>
        <input
          type="number"
          min="0"
          max="20"
          value={value}
          onChange={(e) => {
            const v = parseInt(e.target.value) || 0;
            onChange(Math.min(20, Math.max(0, v)));
          }}
          className="score-input"
        />
        <button
          onClick={() => onChange(Math.min(20, value + 1))}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

export default function PredictionModal({ match, prediction, onClose, onSaved }) {
  const { user } = useAuth();
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [step, setStep] = useState('input'); // 'input' | 'confirm'
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const matchDate = parseISO(match.match_date);
  const dateStr = format(matchDate, "EEEE d 'de' MMMM", { locale: es });
  const timeStr = format(matchDate, 'HH:mm');
  const isPast = new Date() > matchDate;

  const getResultLabel = (home, away) => {
    if (home > away) return `Victoria ${match.home_team}`;
    if (away > home) return `Victoria ${match.away_team}`;
    return 'Empate';
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post(`/predictions/${match.id}`, { homeScore, awayScore });
      // Broadcast a todos los conectados (sin revelar marcador)
      if (user?.id) {
        supabase.from('prediction_broadcasts').upsert({
          user_id:         user.id,
          username:        user.username,
          display_name:    user.displayName,
          avatar_initials: user.avatarInitials,
          match_id:        match.id,
          home_team:       match.home_team,
          away_team:       match.away_team,
          home_code:       match.home_code,
          away_code:       match.away_code,
        }, { onConflict: 'match_id,user_id', ignoreDuplicates: false }).then(() => {});
      }
      onSaved && onSaved(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar predicción');
      setStep('input');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-card-dark w-full max-w-md rounded-2xl overflow-hidden fade-slide-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-andersen-blue to-blue-800 px-6 py-4 flex items-center justify-between">
          <div>
            <span className="group-badge text-xs">Grupo {match.group_name}</span>
            <h2 className="text-white font-bold text-lg mt-1">
              {prediction ? 'Tu Predicción' : step === 'confirm' ? 'Confirmar Predicción' : 'Predecir Resultado'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Teams display */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 text-center">
              <FlagImg code={match.home_code} name={match.home_team} />
              <p className="text-white font-semibold text-sm mt-2">{match.home_team}</p>
            </div>
            <div className="px-4 text-center">
              <p className="text-white/40 text-2xl font-black">VS</p>
            </div>
            <div className="flex-1 text-center">
              <FlagImg code={match.away_code} name={match.away_team} />
              <p className="text-white font-semibold text-sm mt-2">{match.away_team}</p>
            </div>
          </div>

          {/* Match info */}
          <div className="text-center text-white/40 text-xs mb-6">
            <p className="capitalize">{dateStr} · {timeStr} hrs</p>
            {match.city && <p>{match.venue} · {match.city}</p>}
          </div>

          {/* ── Ya predijo: bloqueado ── */}
          {prediction && (
            <div
              className="rounded-xl px-4 py-4 mb-4 text-center"
              style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Lock size={14} style={{ color: '#93c5fd' }} />
                <span className="text-sm font-semibold" style={{ color: '#93c5fd' }}>Predicción registrada</span>
              </div>
              <p className="text-white text-2xl font-black mb-1">
                {prediction.home_score} – {prediction.away_score}
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {getResultLabel(prediction.home_score, prediction.away_score)}
              </p>
              <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Las predicciones no se pueden modificar una vez guardadas.
              </p>
            </div>
          )}

          {/* ── Sin predicción previa: formulario o confirmación ── */}
          {!prediction && !isPast && (
            <>
              {step === 'input' && (
                <>
                  <div className="flex items-center justify-center gap-8 mb-4">
                    <ScoreControl value={homeScore} onChange={setHomeScore} label={match.home_team} />
                    <div className="text-white/30 text-2xl font-bold self-end pb-1">–</div>
                    <ScoreControl value={awayScore} onChange={setAwayScore} label={match.away_team} />
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-center mb-4">
                    <p className="text-yellow-400 text-sm font-semibold">
                      {homeScore} – {awayScore} · <span className="text-white/70">{getResultLabel(homeScore, awayScore)}</span>
                    </p>
                  </div>
                  {error && (
                    <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-2.5 mb-4">
                      <AlertTriangle size={15} className="text-red-400 flex-shrink-0" />
                      <p className="text-red-300 text-xs">{error}</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold bg-white/10 text-white/70 hover:bg-white/20 border border-white/10 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => setStep('confirm')}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 text-blue-950 hover:from-yellow-300 hover:to-yellow-400 transition-all shadow-lg"
                    >
                      Continuar
                    </button>
                  </div>
                </>
              )}

              {step === 'confirm' && (
                <>
                  <div
                    className="rounded-xl px-4 py-4 mb-4 text-center"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
                  >
                    <p className="text-yellow-400 text-3xl font-black mb-1">
                      {homeScore} – {awayScore}
                    </p>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {getResultLabel(homeScore, awayScore)}
                    </p>
                  </div>
                  <div
                    className="flex items-start gap-2 rounded-xl px-4 py-3 mb-4"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs" style={{ color: 'rgba(255,150,150,0.9)' }}>
                      <strong>Esta predicción no podrá modificarse</strong> una vez guardada. ¿Estás seguro?
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('input')}
                      className="flex-1 py-3 rounded-xl text-sm font-semibold bg-white/10 text-white/70 hover:bg-white/20 border border-white/10 transition-all"
                    >
                      Volver
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-400 hover:to-green-500 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg"
                    >
                      <CheckCircle size={15} />
                      {saving ? 'Guardando...' : 'Confirmar'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {!prediction && isPast && (
            <div className="flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 rounded-xl px-4 py-3 text-center justify-center">
              <AlertTriangle size={15} className="text-orange-400" />
              <p className="text-orange-300 text-sm">El plazo para predecir este partido ha vencido</p>
            </div>
          )}
        </div>

        {/* Scoring legend */}
        <div className="bg-black/20 px-6 py-3 border-t border-white/10">
          <div className="flex justify-center gap-4 text-xs text-white/40">
            <span>⭐ Exacto = 3 pts</span>
            <span>✓ Resultado = 2 pts</span>
            <span>✗ Incorrecto = 0 pts</span>
          </div>
        </div>
      </div>
    </div>
  );
}
