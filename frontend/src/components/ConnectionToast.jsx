import React, { useEffect, useState } from 'react';
import Avatar from './Avatar';

const AVATAR_COLORS = [
  'bg-purple-600','bg-blue-600','bg-emerald-600','bg-rose-600',
  'bg-orange-600','bg-teal-600','bg-indigo-600','bg-pink-600',
  'bg-cyan-600','bg-amber-600','bg-lime-600','bg-red-600',
];

function SingleConnToast({ alert, onDismiss, onNudge }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 30);
    const t2 = setTimeout(() => hide(), 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hide = () => { setVisible(false); setTimeout(onDismiss, 350); };

  const colorIdx = (alert.display_name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;

  return (
    <div
      onClick={hide}
      style={{
        transform:  visible ? 'translateX(0)' : 'translateX(120%)',
        opacity:    visible ? 1 : 0,
        transition: 'transform 0.4s cubic-bezier(.22,1,.36,1), opacity 0.3s ease',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px',
        borderRadius: 18,
        background: 'linear-gradient(135deg,#0f2318 0%,#0D1B30 100%)',
        border: '1.5px solid rgba(52,211,153,0.5)',
        boxShadow: '0 10px 34px rgba(0,0,0,0.6)',
        minWidth: 300, maxWidth: 360,
      }}
    >
      <div className="relative flex-shrink-0">
        <Avatar username={alert.username} initials={alert.avatar_initials} displayName={alert.display_name}
          size={50} colorClass={AVATAR_COLORS[colorIdx]} clickable={false} />
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-400" style={{ border: '2.5px solid #0D1B30' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-white font-black leading-tight truncate" style={{ fontSize: 17 }}>{alert.display_name}</p>
        <p className="font-bold" style={{ color: '#34d399', fontSize: 13 }}>🟢 se acaba de conectar</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onNudge(alert); }}
        className="flex-shrink-0 text-[11px] font-black px-3 py-2 rounded-xl"
        style={{ background: 'rgba(167,139,250,0.3)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.6)' }}>
        👈 Guiño
      </button>
    </div>
  );
}

export default function ConnectionToastContainer({ alerts, onDismiss, onNudge }) {
  if (!alerts.length) return null;
  return (
    <div className="fixed z-[9985] flex flex-col gap-2" style={{ top: 64, right: 16, pointerEvents: 'none' }}>
      {alerts.map((a) => (
        <div key={a._alertId} style={{ pointerEvents: 'auto' }}>
          <SingleConnToast alert={a} onDismiss={() => onDismiss(a._alertId)} onNudge={onNudge} />
        </div>
      ))}
    </div>
  );
}
