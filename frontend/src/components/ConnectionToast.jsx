import React, { useEffect, useState } from 'react';

const AVATAR_COLORS = [
  'bg-purple-600','bg-blue-600','bg-emerald-600','bg-rose-600',
  'bg-orange-600','bg-teal-600','bg-indigo-600','bg-pink-600',
  'bg-cyan-600','bg-amber-600','bg-lime-600','bg-red-600',
];

function SingleConnToast({ alert, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 30);
    const t2 = setTimeout(() => hide(), 5000);
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
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        borderRadius: 14,
        background: 'linear-gradient(135deg,#0f2318 0%,#0D1B30 100%)',
        border: '1px solid rgba(52,211,153,0.4)',
        boxShadow: '0 8px 28px rgba(0,0,0,0.55)',
        minWidth: 240, maxWidth: 300,
      }}
    >
      <div className="relative flex-shrink-0">
        <div className={`flex items-center justify-center text-xs font-black text-white ${AVATAR_COLORS[colorIdx]}`}
          style={{ width: 34, height: 34, borderRadius: '50%' }}>
          {alert.avatar_initials}
        </div>
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400" style={{ border: '2px solid #0D1B30' }} />
      </div>
      <div className="min-w-0">
        <p className="text-white font-bold text-sm leading-tight truncate">{alert.display_name}</p>
        <p className="text-xs font-semibold" style={{ color: '#34d399' }}>🟢 se acaba de conectar</p>
      </div>
    </div>
  );
}

export default function ConnectionToastContainer({ alerts, onDismiss }) {
  if (!alerts.length) return null;
  return (
    <div className="fixed z-[9985] flex flex-col gap-2" style={{ top: 64, right: 16, pointerEvents: 'none' }}>
      {alerts.map((a) => (
        <div key={a._alertId} style={{ pointerEvents: 'auto' }}>
          <SingleConnToast alert={a} onDismiss={() => onDismiss(a._alertId)} />
        </div>
      ))}
    </div>
  );
}
