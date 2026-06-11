import React, { useState, useEffect } from 'react';

const TOURNAMENT_START = new Date('2026-06-11T16:00:00Z');
const TOURNAMENT_END = new Date('2026-07-19T20:00:00Z');

function getCountdown() {
  const now = new Date();
  const diff = TOURNAMENT_START - now;
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes };
}

function CountUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="font-black tabular-nums leading-none"
        style={{ color: '#F59E0B', fontSize: '2rem' }}
      >
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-xs uppercase tracking-widest mt-1 font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>
        {label}
      </span>
    </div>
  );
}

export default function WorldCupBanner() {
  const [countdown, setCountdown] = useState(getCountdown());
  const [isLive, setIsLive] = useState(false);
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setIsLive(now >= TOURNAMENT_START && now <= TOURNAMENT_END);
      setIsOver(now > TOURNAMENT_END);
      setCountdown(getCountdown());
    };
    update();
    const interval = setInterval(update, 60000); // actualiza cada minuto
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden mb-6" style={{ background: '#0D1B30', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚽</span>
          <div>
            <p className="text-white font-black text-base leading-tight">FIFA World Cup 2026™</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>Canadá · USA · México · 11 jun – 19 jul</p>
          </div>
        </div>

        {isOver ? (
          <span className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: 'rgba(100,116,139,0.18)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.25)' }}>
            Finalizado
          </span>
        ) : isLive ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full live-dot" />
            EN CURSO
          </div>
        ) : null}
      </div>

      {/* Countdown o EN VIVO */}
      {!isOver && (
        <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {isLive ? (
            <div className="text-center">
              <p className="text-green-400 font-black text-xl">¡El Mundial está en marcha!</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.38)' }}>Realiza tus predicciones antes de cada partido</p>
            </div>
          ) : countdown ? (
            <div>
              <p className="text-center text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.28)' }}>
                Faltan para el inicio
              </p>
              <div className="flex items-start justify-center gap-6">
                <CountUnit value={countdown.days} label="días" />
                <span className="font-black text-2xl mt-1" style={{ color: 'rgba(245,158,11,0.4)' }}>:</span>
                <CountUnit value={countdown.hours} label="horas" />
                <span className="font-black text-2xl mt-1" style={{ color: 'rgba(245,158,11,0.4)' }}>:</span>
                <CountUnit value={countdown.minutes} label="minutos" />
              </div>
              <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.22)' }}>
                Primer partido: México vs Sudáfrica · 11 jun, 14:00 (COL/ECU)
              </p>
            </div>
          ) : null}
        </div>
      )}

      {/* Stats bar */}
      <div className="px-5 py-2.5 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="font-black text-sm" style={{ color: '#F59E0B' }}>48</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>equipos</span>
        </div>
        <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <div className="flex items-center gap-1.5">
          <span className="font-black text-sm" style={{ color: '#F59E0B' }}>12</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>grupos</span>
        </div>
        <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <div className="flex items-center gap-1.5">
          <span className="font-black text-sm" style={{ color: '#F59E0B' }}>104</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>partidos</span>
        </div>
        <div className="w-px h-3" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <div className="flex items-center gap-1.5">
          <span className="font-black text-sm" style={{ color: '#F59E0B' }}>3</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>países sede</span>
        </div>
      </div>
    </div>
  );
}
