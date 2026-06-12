import React, { useState, useEffect, useCallback } from 'react';
import { parseISO, differenceInSeconds, isSameDay, addDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const TZ = 'America/Guayaquil';
const TOURNAMENT_START = new Date('2026-06-11T19:00:00Z');
const TOURNAMENT_END   = new Date('2026-07-19T20:00:00Z');

/* Cuántos días hacia adelante mostrar según día de semana local */
function getWindowDays() {
  const nowLocal = toZonedTime(new Date(), TZ);
  const dow = nowLocal.getDay(); // 0=Dom,1=Lun,...,5=Vie,6=Sáb
  if (dow === 5) return [0, 1, 2]; // Vie+Sáb+Dom
  if (dow === 6) return [0, 1];    // Sáb+Dom
  return [0, 1];                   // resto: hoy+mañana
}

function getWindowLabel(dow) {
  if (dow === 5) return 'viernes, sábado y domingo';
  if (dow === 6) return 'sábado y domingo';
  return 'hoy y mañana';
}

function isInWindow(matchDateStr) {
  const nowLocal  = toZonedTime(new Date(), TZ);
  const matchLocal = toZonedTime(parseISO(matchDateStr), TZ);
  return getWindowDays().some((offset) => isSameDay(matchLocal, addDays(nowLocal, offset)));
}

function formatCountdown(secsLeft) {
  if (secsLeft <= 0) return '00:00';
  const h = Math.floor(secsLeft / 3600);
  const m = Math.floor((secsLeft % 3600) / 60);
  const s = secsLeft % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}h ${mm}m ${ss}s`;
  return `${mm}:${ss}`;
}

function urgencyLevel(secsLeft) {
  if (secsLeft <= 0)     return 'gone';
  if (secsLeft < 15*60)  return 'critical'; // < 15 min
  if (secsLeft < 30*60)  return 'high';     // < 30 min
  if (secsLeft < 2*3600) return 'medium';   // < 2h
  return 'low';
}

const URGENCY_STYLES = {
  gone:     { border: 'rgba(100,116,139,0.3)', bg: 'rgba(100,116,139,0.08)', text: '#94a3b8', pulse: '' },
  low:      { border: 'rgba(96,165,250,0.25)', bg: 'rgba(96,165,250,0.06)',  text: '#60a5fa', pulse: '' },
  medium:   { border: 'rgba(245,158,11,0.35)', bg: 'rgba(245,158,11,0.08)', text: '#F59E0B', pulse: 'pulse-slow' },
  high:     { border: 'rgba(251,146,60,0.45)', bg: 'rgba(251,146,60,0.10)', text: '#fb923c', pulse: 'pulse-medium' },
  critical: { border: 'rgba(239,68,68,0.6)',   bg: 'rgba(239,68,68,0.12)',  text: '#f87171', pulse: 'pulse-fast' },
};

function MatchCountdownRow({ match, hasPrediction, onPredict, now }) {
  const start    = parseISO(match.match_date);
  const secsLeft = differenceInSeconds(start, now);
  const level    = urgencyLevel(secsLeft);
  const style    = URGENCY_STYLES[level];
  const isPast   = secsLeft <= 0;

  const matchLocal = toZonedTime(start, TZ);
  const timeStr = matchLocal.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', timeZone: TZ });

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
      style={{ background: style.bg, border: `1px solid ${style.border}` }}
    >
      {/* Flags & teams */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="text-base">{match.home_flag || '⚽'}</span>
        <span className="text-white text-xs font-semibold truncate">{match.home_team}</span>
        <span className="text-white/30 text-xs">vs</span>
        <span className="text-white text-xs font-semibold truncate">{match.away_team}</span>
        <span className="text-base">{match.away_flag || '⚽'}</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {hasPrediction ? (
          <div className="flex items-center gap-1 text-green-400">
            <CheckCircle2 size={13} />
            <span className="text-[11px] font-semibold hidden sm:block">Listo</span>
          </div>
        ) : isPast ? (
          <span className="text-[11px] font-semibold" style={{ color: '#94a3b8' }}>Cerrado</span>
        ) : (
          <button
            onClick={() => onPredict(match)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${style.pulse}`}
            style={{ background: style.text, color: '#000' }}
          >
            <Clock size={11} />
            {formatCountdown(secsLeft)}
          </button>
        )}
        <span className="text-[10px] hidden sm:block" style={{ color: 'rgba(255,255,255,0.3)' }}>{timeStr}</span>
      </div>
    </div>
  );
}

/* ── Banner principal ── */
export default function WorldCupBanner({ matches = [], predictions = {}, onPredict }) {
  const [now, setNow] = useState(new Date());
  const [isLive, setIsLive] = useState(false);
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNow(n);
      setIsLive(n >= TOURNAMENT_START && n <= TOURNAMENT_END);
      setIsOver(n > TOURNAMENT_END);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const nowLocal = toZonedTime(now, TZ);
  const dow = nowLocal.getDay();

  // Partidos en la ventana temporal
  const windowMatches = matches
    .filter((m) => m.status === 'scheduled' && isInWindow(m.match_date))
    .sort((a, b) => new Date(a.match_date) - new Date(b.match_date));

  const unpredicted = windowMatches.filter((m) => !predictions[m.id]);
  const predicted   = windowMatches.filter((m) =>  predictions[m.id]);
  const allDone     = windowMatches.length > 0 && unpredicted.length === 0;

  // Partido más urgente (próximo sin predecir)
  const mostUrgent = unpredicted.find((m) => differenceInSeconds(parseISO(m.match_date), now) > 0);
  const urgentSecs = mostUrgent ? differenceInSeconds(parseISO(mostUrgent.match_date), now) : null;
  const topLevel   = urgentSecs !== null ? urgencyLevel(urgentSecs) : 'low';

  return (
    <div className="rounded-2xl overflow-hidden mb-6" style={{ background: '#0D1B30', border: '1px solid rgba(255,255,255,0.08)' }}>

      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <span className="text-xl">⚽</span>
          <div>
            <p className="text-white font-black text-sm leading-tight">FIFA World Cup 2026™</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Canadá · USA · México · 11 jun – 19 jul</p>
          </div>
        </div>
        {isOver ? (
          <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: 'rgba(100,116,139,0.18)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.25)' }}>
            Finalizado
          </span>
        ) : isLive ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full live-dot" />
            EN CURSO
          </div>
        ) : null}
      </div>

      {/* Cuerpo principal */}
      {isLive && !isOver && (
        <div className="px-4 py-4">
          {windowMatches.length === 0 ? (
            /* Sin partidos en la ventana */
            <div className="text-center py-2">
              <p className="text-green-400 font-black text-base">✅ Todo al día</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>No hay partidos próximos para predecir</p>
            </div>
          ) : allDone ? (
            /* Todo predicho */
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
                <p className="text-green-400 font-black text-sm">
                  ¡Tienes todo predicho para {getWindowLabel(dow)}!
                </p>
              </div>
              <div className="space-y-2">
                {predicted.slice(0, 4).map((m) => {
                  const p = predictions[m.id];
                  const local = toZonedTime(parseISO(m.match_date), TZ);
                  const timeStr = local.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
                  return (
                    <div key={m.id} className="flex items-center gap-2 rounded-lg px-3 py-2"
                      style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                      <span className="text-sm">{m.home_flag || '⚽'}</span>
                      <span className="text-white text-xs font-semibold truncate flex-1">{m.home_team} vs {m.away_team}</span>
                      <span className="text-xs font-black" style={{ color: '#4ade80' }}>
                        {p.home_score}–{p.away_score}
                      </span>
                      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{timeStr}</span>
                    </div>
                  );
                })}
                {predicted.length > 4 && (
                  <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    + {predicted.length - 4} más predichos
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Hay partidos sin predecir */
            <div>
              <div className="flex items-center gap-2 mb-3">
                {topLevel === 'critical' || topLevel === 'high' ? (
                  <AlertCircle size={15} style={{ color: URGENCY_STYLES[topLevel].text, flexShrink: 0 }} className={URGENCY_STYLES[topLevel].pulse} />
                ) : (
                  <Clock size={15} style={{ color: URGENCY_STYLES[topLevel].text, flexShrink: 0 }} />
                )}
                <p className="text-sm font-bold" style={{ color: URGENCY_STYLES[topLevel].text }}>
                  {unpredicted.length} partido{unpredicted.length > 1 ? 's' : ''} sin predecir · {getWindowLabel(dow)}
                </p>
              </div>

              <div className="space-y-2">
                {windowMatches.map((m) => (
                  <MatchCountdownRow
                    key={m.id}
                    match={m}
                    hasPrediction={!!predictions[m.id]}
                    onPredict={onPredict}
                    now={now}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats bar */}
      <div className="px-5 py-2 flex items-center gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {[['48','equipos'],['12','grupos'],['104','partidos'],['3','países sede']].map(([n, l]) => (
          <React.Fragment key={l}>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xs" style={{ color: '#F59E0B' }}>{n}</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.32)' }}>{l}</span>
            </div>
            {l !== 'países sede' && <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.1)' }} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
