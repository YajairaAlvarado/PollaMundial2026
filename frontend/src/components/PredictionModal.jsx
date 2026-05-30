import React, { useState, useEffect } from 'react';
import { X, Minus, Plus, Save, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../utils/api';

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
  const [homeScore, setHomeScore] = useState(prediction?.home_score ?? 0);
  const [awayScore, setAwayScore] = useState(prediction?.away_score ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const matchDate = parseISO(match.match_date);
  const dateStr = format(matchDate, "EEEE d 'de' MMMM", { locale: es });
  const timeStr = format(matchDate, 'HH:mm');
  const isPast = new Date() > matchDate;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post(`/predictions/${match.id}`, { homeScore, awayScore });
      onSaved && onSaved(res.data.prediction);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar predicción');
    } finally {
      setSaving(false);
    }
  };

  // Determine result label
  const getResultLabel = () => {
    if (homeScore > awayScore) return `Victoria ${match.home_team}`;
    if (awayScore > homeScore) return `Victoria ${match.away_team}`;
    return 'Empate';
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
            <h2 className="text-white font-bold text-lg mt-1">Predecir Resultado</h2>
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
            {/* Home */}
            <div className="flex-1 text-center">
              <FlagImg code={match.home_code} name={match.home_team} />
              <p className="text-white font-semibold text-sm mt-2">{match.home_team}</p>
              <p className="text-white/40 text-xs">Local</p>
            </div>

            {/* VS */}
            <div className="px-4 text-center">
              <p className="text-white/40 text-2xl font-black">VS</p>
            </div>

            {/* Away */}
            <div className="flex-1 text-center">
              <FlagImg code={match.away_code} name={match.away_team} />
              <p className="text-white font-semibold text-sm mt-2">{match.away_team}</p>
              <p className="text-white/40 text-xs">Visitante</p>
            </div>
          </div>

          {/* Match info */}
          <div className="text-center text-white/40 text-xs mb-6">
            <p className="capitalize">{dateStr} · {timeStr} hrs</p>
            {match.city && <p>{match.venue} · {match.city}</p>}
          </div>

          {/* Score inputs */}
          {!isPast ? (
            <>
              <div className="flex items-center justify-center gap-8 mb-4">
                <ScoreControl value={homeScore} onChange={setHomeScore} label="Local" />
                <div className="text-white/30 text-2xl font-bold self-end pb-1">–</div>
                <ScoreControl value={awayScore} onChange={setAwayScore} label="Visita" />
              </div>

              {/* Result preview */}
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-center mb-4">
                <p className="text-yellow-400 text-sm font-semibold">
                  {homeScore} – {awayScore} · <span className="text-white/70">{getResultLabel()}</span>
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-2.5 mb-4">
                  <AlertTriangle size={15} className="text-red-400 flex-shrink-0" />
                  <p className="text-red-300 text-xs">{error}</p>
                </div>
              )}

              {/* Existing prediction note */}
              {prediction && (
                <p className="text-white/40 text-xs text-center mb-3">
                  Predicción actual: {prediction.home_score} – {prediction.away_score}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold bg-white/10 text-white/70 hover:bg-white/20 border border-white/10 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-yellow-400 to-yellow-500 text-blue-950 hover:from-yellow-300 hover:to-yellow-400 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  <Save size={15} />
                  {saving ? 'Guardando...' : prediction ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </>
          ) : (
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
