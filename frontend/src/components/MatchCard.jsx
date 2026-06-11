import React from 'react';
import { parseISO } from 'date-fns';
import { format, toZonedTime } from 'date-fns-tz';
import { es } from 'date-fns/locale';

const TZ = 'America/Guayaquil';
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

  const matchDate = toZonedTime(parseISO(match.match_date), TZ);
  const dateStr = format(matchDate, "d MMM", { locale: es, timeZone: TZ });
  const timeStr = format(matchDate, 'HH:mm', { timeZone: TZ });

  const hasPrediction = !!prediction;
  const canPredict = isScheduled && new Date() < parseISO(match.match_date);

  let borderAccent = 'rgba(255,255,255,0.08)';
  if (isFinished && hasPrediction) {
    if (prediction.points_earned === 3) borderAccent = 'rgba(52,211,153,0.35)';
    else if (prediction.points_earned === 2) borderAccent = 'rgba(245,158,11,0.35)';
    else borderAccent = 'rgba(239,68,68,0.25)';
  } else if (isLive) {
    borderAccent = 'rgba(239,68,68,0.35)';
  }

  return (
    <div
      className="rounded-xl p-4 transition-all duration-150 hover:translate-y-[-1px]"
      style={{ background: '#0D1B30', border: `1px solid ${borderAccent}` }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <span className="group-badge">Grupo {match.group_name}</span>
        <div className="flex items-center gap-1.5">
          {isLive && (
            <span
              className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
            >
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full live-dot" />
              EN VIVO
            </span>
          )}
          {isFinished && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
            >
              Final
            </span>
          )}
          {isScheduled && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: 'rgba(147,197,253,0.8)' }}
            >
              {dateStr} · {timeStr}
            </span>
          )}
        </div>
      </div>

      {/* Teams & score */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex flex-col items-center gap-1.5 flex-1">
          <FlagImg code={match.home_code} name={match.home_team} size={48} />
          <p className="text-white text-xs font-semibold text-center leading-tight">{match.home_team}</p>
        </div>

        <div className="text-center px-2 min-w-[56px]">
          {isLive || isFinished ? (
            <div className="flex items-center gap-1.5">
              <span className="text-3xl font-black text-white tabular-nums">{match.home_score ?? '-'}</span>
              <span className="text-lg font-light" style={{ color: 'rgba(255,255,255,0.3)' }}>–</span>
              <span className="text-3xl font-black text-white tabular-nums">{match.away_score ?? '-'}</span>
            </div>
          ) : (
            <p className="text-lg font-black" style={{ color: 'rgba(255,255,255,0.35)' }}>VS</p>
          )}
        </div>

        <div className="flex flex-col items-center gap-1.5 flex-1">
          <FlagImg code={match.away_code} name={match.away_team} size={48} />
          <p className="text-white text-xs font-semibold text-center leading-tight">{match.away_team}</p>
        </div>
      </div>

      {/* Venue */}
      {match.city && (
        <div className="flex items-center justify-center gap-1 mb-3 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          <MapPin size={10} />
          <span>{match.city}</span>
        </div>
      )}

      {/* Prediction badge */}
      {hasPrediction && (
        <div
          className="rounded-lg px-3 py-2 mb-2 text-center text-xs font-medium"
          style={
            isFinished
              ? prediction.points_earned === 3
                ? { background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: '#6ee7b7' }
                : prediction.points_earned === 2
                  ? { background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#fcd34d' }
                  : { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', color: '#fca5a5' }
              : { background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', color: '#93c5fd' }
          }
        >
          Mi predicción: {prediction.home_score} – {prediction.away_score}
          {isFinished && (
            <span className="ml-2 font-bold">
              {prediction.points_earned === 3 ? '⭐ ¡Exacto! +3' :
               prediction.points_earned === 2 ? '✓ Correcto +2' : '✗ Incorrecto +0'}
            </span>
          )}
        </div>
      )}

      {/* Action button */}
      {canPredict && (
        <button
          onClick={() => onPredict && onPredict(match)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all"
          style={
            hasPrediction
              ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }
              : { background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#06101F', boxShadow: '0 2px 10px rgba(245,158,11,0.25)' }
          }
        >
          {hasPrediction ? <><Edit2 size={11} /> Editar predicción</> : <><Plus size={11} /> Predecir resultado</>}
        </button>
      )}

      {isScheduled && !canPredict && (
        <div
          className="w-full py-2 rounded-lg text-xs text-center"
          style={{ color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          Predicción cerrada
        </div>
      )}
    </div>
  );
}
