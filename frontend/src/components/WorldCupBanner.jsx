import React, { useState, useEffect } from 'react';
import { differenceInDays, isPast } from 'date-fns';

const TOURNAMENT_START = new Date('2026-06-11T16:00:00Z');
const TOURNAMENT_END = new Date('2026-07-19T20:00:00Z');

const mascots = [
  { emoji: '🦌', name: 'Alce', country: 'Canadá', color: 'from-red-700 to-red-900' },
  { emoji: '🦅', name: 'Águila', country: 'USA', color: 'from-blue-700 to-blue-900' },
  { emoji: '🐆', name: 'Jaguar', country: 'México', color: 'from-green-700 to-green-900' },
];

const hostCities = ['Toronto', 'Vancouver', 'New York', 'Los Angeles', 'Dallas', 'Miami', 'Boston', 'Denver', 'Seattle', 'Ciudad de México', 'Monterrey', 'Guadalajara'];

export default function WorldCupBanner() {
  const [daysLeft, setDaysLeft] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    const now = new Date();
    setIsLive(now >= TOURNAMENT_START && now <= TOURNAMENT_END);
    setIsOver(now > TOURNAMENT_END);
    setDaysLeft(differenceInDays(TOURNAMENT_START, now));
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl mb-8 stadium-bg">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-andersen-blue via-blue-900 to-andersen-red opacity-90" />

      {/* Decorative football patterns */}
      <div className="absolute top-4 right-4 text-8xl opacity-5 select-none">⚽</div>
      <div className="absolute bottom-4 left-4 text-6xl opacity-5 select-none">⚽</div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[200px] opacity-[0.03] select-none">⚽</div>

      <div className="relative z-10 p-6 md:p-10">
        {/* Main title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/30 rounded-full px-4 py-1.5 mb-4">
            <span className="text-yellow-400 text-xs font-bold uppercase tracking-widest">FIFA World Cup</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black shimmer-text leading-none mb-2">
            MUNDIAL
          </h1>
          <h2 className="text-4xl md:text-6xl font-black text-white leading-none">
            2026
          </h2>
        </div>

        {/* Tournament status */}
        <div className="flex justify-center mb-6">
          {isOver ? (
            <div className="bg-gray-500/30 border border-gray-400/30 rounded-2xl px-6 py-3 text-center">
              <p className="text-gray-300 text-lg font-bold">Torneo Finalizado</p>
              <p className="text-gray-400 text-sm">¡Gracias por participar!</p>
            </div>
          ) : isLive ? (
            <div className="bg-green-500/20 border border-green-400/40 rounded-2xl px-6 py-3 text-center pulse-glow">
              <div className="flex items-center gap-2 justify-center">
                <span className="w-3 h-3 bg-green-400 rounded-full live-dot"></span>
                <p className="text-green-400 text-xl font-black">EN CURSO</p>
              </div>
              <p className="text-green-300/70 text-sm">¡El Mundial está en marcha!</p>
            </div>
          ) : (
            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl px-6 py-3 text-center">
              <p className="text-yellow-400 text-3xl md:text-4xl font-black">{daysLeft}</p>
              <p className="text-white/70 text-sm font-medium">días para el inicio</p>
              <p className="text-white/40 text-xs mt-1">11 junio 2026 — 19 julio 2026</p>
            </div>
          )}
        </div>

        {/* Mascots */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
          {mascots.map((m) => (
            <div
              key={m.country}
              className={`glass-card text-center p-3 md:p-4 float-anim`}
              style={{ animationDelay: mascots.indexOf(m) * 0.3 + 's' }}
            >
              <div className="text-3xl md:text-5xl mb-1 md:mb-2">{m.emoji}</div>
              <p className="text-yellow-400 font-bold text-sm md:text-base">{m.name}</p>
              <p className="text-white/60 text-xs">{m.country}</p>
            </div>
          ))}
        </div>

        {/* Host cities */}
        <div className="text-center">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2 font-semibold">Sedes</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {hostCities.map((city) => (
              <span
                key={city}
                className="bg-white/10 border border-white/15 rounded-full px-2.5 py-0.5 text-xs text-white/70"
              >
                {city}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
