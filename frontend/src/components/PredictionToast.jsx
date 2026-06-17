import React, { useEffect, useState } from 'react';
import Avatar from './Avatar';

const AVATAR_COLORS = [
  'bg-purple-600','bg-blue-600','bg-emerald-600','bg-rose-600',
  'bg-orange-600','bg-teal-600','bg-indigo-600','bg-pink-600',
  'bg-cyan-600','bg-amber-600','bg-lime-600','bg-red-600',
];

function SingleToast({ toast, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Entrada con pequeño delay para que la animación se vea
    const t1 = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t1);
  }, []);

  const hide = () => {
    setVisible(false);
    setTimeout(onDismiss, 350);
  };

  const colorIdx = (toast.display_name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;

  return (
    <div
      onClick={hide}
      style={{
        transform:  visible ? 'translateY(0) scale(1)'    : 'translateY(-24px) scale(0.95)',
        opacity:    visible ? 1 : 0,
        transition: 'transform 0.35s cubic-bezier(.22,1,.36,1), opacity 0.3s ease',
        cursor: 'pointer',
      }}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
      style={{
        background:  'linear-gradient(135deg,#0f2318 0%,#0D1B30 100%)',
        border:      '1px solid rgba(52,211,153,0.35)',
        boxShadow:   '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(52,211,153,0.15)',
        minWidth:    280,
        maxWidth:    340,
      }}
    >
      {/* Avatar */}
      <Avatar username={toast.username} initials={toast.avatar_initials} displayName={toast.display_name} size={36} colorClass={AVATAR_COLORS[colorIdx]} clickable={false} />

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black" style={{ color: '#34d399' }}>⚽ Pronóstico registrado</p>
        <p className="text-white font-semibold text-sm leading-tight truncate">
          {toast.display_name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {toast.home_code && <img src={`https://flagcdn.com/16x12/${toast.home_code}.png`} alt="" className="rounded" />}
          <span className="text-xs font-bold text-white/70 truncate">{toast.home_team}</span>
          <span className="text-white/30 text-xs">vs</span>
          <span className="text-xs font-bold text-white/70 truncate">{toast.away_team}</span>
          {toast.away_code && <img src={`https://flagcdn.com/16x12/${toast.away_code}.png`} alt="" className="rounded" />}
        </div>
      </div>

      {/* Punto verde pulsante */}
      <div className="w-2.5 h-2.5 rounded-full bg-green-400 flex-shrink-0 animate-pulse" />
    </div>
  );
}

export default function PredictionToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div
      className="fixed z-[9990] flex flex-col gap-2 items-center"
      style={{ top: 64, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}
    >
      {toasts.map((t) => (
        <div key={t._toastId} style={{ pointerEvents: 'auto' }}>
          <SingleToast toast={t} onDismiss={() => onDismiss(t._toastId)} />
        </div>
      ))}
    </div>
  );
}
