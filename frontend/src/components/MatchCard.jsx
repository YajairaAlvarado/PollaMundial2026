import React from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Clock, Edit2, Plus } from 'lucide-react';

function FlagImg({ code, name, size = 48 }) {
  const h = Math.round(size * 0.75);
  return (
    <img
      src={`https://flagcdn.com/${size}x${h}/${code.toLowerCase()}.png`}
      alt={name}
      className="rounded shadow-md"
      style={{ width: size, height: h }}
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  );
}

export default function MatchCard({ match, prediction, onPredict }) {
  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';
  const isScheduled = match.status === 'scheduled';

  const matchDate = parseISO(match.match_date);
  const dateStr = format(matchDate, "d 'de' MMMM", { locale: es });
  const timeStr = format(matchDate, 'HH:mm');

  const hasPrediction = !!prediction;
  const canPredict = isScheduled && new Date() < matchDate;

  // Determine prediction result styling
  let predBg = '';
  if (isFinished && hasPrediction) {
    if (prediction.points_earned === 3) predBg = 'border-emerald-500/50 bg-emerald-500/5';
    else if (prediction.points_earned === 2) predBg = 'border-yellow-500/50 bg-yellow-500/5';
    else predBg = 'border-red-500/20';
  }

  return (
    <div className={`glass-card p-4 hover:scale-[1.01] transition-all duration-200 ${predBg || 'border-white/10'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="group-badge">Grupo {match.group_name}</span>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1 bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full live-dot"></span>
              EN VIVO
            </span>
          )}
          {isFinished && (
            <span className="bg-white/10 text-white/50 text-xs px-2 py-0.5 rounded-full">Final</span>
          )}
        </div>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-2 mb-3">
        {/* Home team */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <FlagImg code={match.home_code} name={match.home_team} size={48} />
          <p className="text-white text-xs font-semibold text-center leading-tight">{match.home_team}</p>
        </div>

        {/* Score / VS */}
        <div className="text-center px-2 min-w-[60px]">
          {isLive || isFinished ? (
            <div className="flex items-center gap-1">
              <span className="text-3xl font-black text-white">{match.home_score ?? '-'}</span>
              <span className="text-white/40 text-lg font-light">–</span>
              <span className="text-3xl font-black text-white">{match.away_score ?? '-'}</span>
            </div>
          ) : (
            <div>
              <p className="text-white/50 text-lg font-bold">VS</p>
              <p className="text-yellow-400/70 text-xs">{timeStr}</p>
            </div>
          )}
        </div>

        {/* Away team */}
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <FlagImg code={match.away_code} name={match.away_team} size={48} />
          <p className="text-white text-xs font-semibold text-center leading-tight">{match.away_team}</p>
        </div>
      </div>

      {/* Date & Venue */}
      <div className="flex items-center justify-center gap-3 text-white/40 text-xs mb-3">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {dateStr} · {timeStr}
        </span>
        {match.city && (
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {match.city}
          </span>
        )}
      </div>

      {/* Prediction section */}
      {hasPrediction && (
        <div className={`rounded-lg px-3 py-2 mb-2 text-center border ${
          isFinished
            ? prediction.points_earned === 3
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : prediction.points_earned === 2
                ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300'
                : 'bg-red-500/15 border-red-500/30 text-red-300'
            : 'bg-blue-500/15 border-blue-500/30 text-blue-300'
        }`}>
          <span className="text-xs font-medium">
            Mi predicción: {prediction.home_score} – {prediction.away_score}
            {isFinished && (
              <span className="ml-2 font-bold">
                {prediction.points_earned === 3 ? '⭐ ¡Exacto! +3' :
                 prediction.points_earned === 2 ? '✓ Correcto +2' : '✗ Incorrecto +0'}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Action button */}
      {canPredict && (
        <button
          onClick={() => onPredict && onPredict(match)}
          className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            hasPrediction
              ? 'bg-white/10 text-white/70 hover:bg-white/20 border border-white/20'
              : 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-blue-950 hover:from-yellow-300 hover:to-yellow-400 shadow-lg'
          }`}
        >
          {hasPrediction ? <><Edit2 size={12} /> Editar predicción</> : <><Plus size={12} /> Predecir resultado</>}
        </button>
      )}

      {isScheduled && !canPredict && (
        <div className="w-full py-2 rounded-lg text-xs text-center text-white/30 border border-white/10">
          Predicción cerrada
        </div>
      )}
    </div>
  );
}
