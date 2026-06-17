import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { caritaAnim } from '../utils/caritas';

const AVATAR_COLORS = [
  'bg-purple-600','bg-blue-600','bg-emerald-600','bg-rose-600',
  'bg-orange-600','bg-teal-600','bg-indigo-600','bg-pink-600',
  'bg-cyan-600','bg-amber-600','bg-lime-600','bg-red-600',
];

function playNudgeSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // doble "toc" tipo zumbido MSN
    [0, 0.18].forEach((delay) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(330, ctx.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + delay + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.16);
    });
  } catch {}
}

function FullScreenNudge({ nudge, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    playNudgeSound();
    // Sacudir toda la pantalla (estilo zumbido MSN)
    document.body.classList.add('nudge-shaking');
    const tShake = setTimeout(() => document.body.classList.remove('nudge-shaking'), 800);
    const tShow  = setTimeout(() => setVisible(true), 20);
    // Auto-cierre a los 9s
    const tAuto  = setTimeout(() => hide(), 9000);
    return () => {
      clearTimeout(tShake); clearTimeout(tShow); clearTimeout(tAuto);
      document.body.classList.remove('nudge-shaking');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hide = () => { setVisible(false); setTimeout(onDismiss, 350); };

  const colorIdx = (nudge.from_name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
  const isFree   = nudge.type === 'free';
  const emoji    = nudge.tone || '😂';
  const isGif    = /^https?:\/\//.test(emoji);
  const animName = caritaAnim(emoji);
  const noMsg    = isFree && !nudge.message; // guiño solo con carita/GIF

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) hide(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        background: visible ? 'rgba(5,2,20,0.78)' : 'rgba(5,2,20,0)',
        backdropFilter: visible ? 'blur(6px)' : 'blur(0px)',
        transition: 'background 0.3s ease, backdrop-filter 0.3s ease',
      }}
    >
      <div
        style={{
          transform:  visible ? 'scale(1) translateY(0)' : 'scale(0.7) translateY(40px)',
          opacity:    visible ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(.18,1.4,.4,1), opacity 0.3s ease',
          width: '100%', maxWidth: 460,
          background: 'linear-gradient(160deg,#15103a 0%,#0a1535 60%,#1a0f30 100%)',
          border: '2px solid rgba(167,139,250,0.55)',
          borderRadius: 28,
          boxShadow: '0 0 80px rgba(167,139,250,0.4), 0 30px 60px rgba(0,0,0,0.7)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Cerrar */}
        <button onClick={hide}
          style={{ position: 'absolute', top: 14, right: 14, color: 'rgba(255,255,255,0.4)', zIndex: 2 }}>
          <X size={20} />
        </button>

        {/* Carita / GIF gigante animado */}
        <div style={{ paddingTop: 26, textAlign: 'center' }}>
          {isGif ? (
            <img src={emoji} alt="guiño"
              style={{
                maxWidth: noMsg ? '95%' : '85%', maxHeight: noMsg ? 340 : 240, margin: '0 auto', borderRadius: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                animation: 'emojiPulse 1.6s ease-in-out infinite',
              }}
              onError={(e) => { e.target.style.display = 'none'; }} />
          ) : (
            <div style={{
              fontSize: noMsg ? 170 : 110, lineHeight: 1,
              animation: `${animName} 1s ease-in-out infinite`,
              filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))',
            }}>
              {emoji}
            </div>
          )}
        </div>

        {/* Header */}
        <div style={{ padding: '14px 24px 10px', textAlign: 'center' }}>
          <div className={`mx-auto flex items-center justify-center text-lg font-black text-white ${AVATAR_COLORS[colorIdx]}`}
            style={{ width: 52, height: 52, borderRadius: '50%', border: '2px solid rgba(167,139,250,0.6)', boxShadow: '0 0 20px rgba(167,139,250,0.4)' }}>
            {nudge.from_initials}
          </div>
          <p className="text-white font-black mt-2" style={{ fontSize: 20, lineHeight: 1.1 }}>{nudge.from_name}</p>
          <p className="font-bold mt-1" style={{ color: '#a78bfa', fontSize: 12, letterSpacing: '0.05em' }}>
            💬 ¡TE MANDÓ UN GUIÑO!
          </p>
        </div>

        {/* Contenido grande */}
        <div style={{ padding: '0 28px 8px', textAlign: 'center' }}>
          {isFree ? (
            nudge.message ? (
              <p className="text-white font-bold" style={{ fontSize: 26, lineHeight: 1.25, padding: '8px 0 14px', wordBreak: 'break-word' }}>
                "{nudge.message}"
              </p>
            ) : <div style={{ height: 8 }} />
          ) : (
            <div style={{ padding: '6px 0 12px' }}>
              <div className="flex items-center justify-center gap-3 mb-2">
                {nudge.home_code && <img src={`https://flagcdn.com/40x30/${nudge.home_code}.png`} alt="" style={{ borderRadius: 3 }} />}
                <span className="text-white font-black" style={{ fontSize: 18 }}>{nudge.home_team}</span>
                <span className="font-black" style={{ fontSize: 34, color: '#fbbf24' }}>
                  {nudge.suggested_home}–{nudge.suggested_away}
                </span>
                <span className="text-white font-black" style={{ fontSize: 18 }}>{nudge.away_team}</span>
                {nudge.away_code && <img src={`https://flagcdn.com/40x30/${nudge.away_code}.png`} alt="" style={{ borderRadius: 3 }} />}
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
                Te sugiere que apuestes a este resultado
              </p>
              {nudge.message && (
                <p className="italic mt-2" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16 }}>
                  "{nudge.message}"
                </p>
              )}
            </div>
          )}

        </div>

        {/* Cerrar */}
        <div style={{ padding: '0 24px 24px' }}>
          <button onClick={hide}
            className="w-full py-3 rounded-2xl font-black transition-all"
            style={{ background: 'rgba(167,139,250,0.25)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.5)', fontSize: 14 }}>
            Cerrar
          </button>
        </div>

        {/* Barra de tiempo */}
        <div style={{ height: 4, background: 'rgba(167,139,250,0.15)' }}>
          <div style={{ height: '100%', background: '#a78bfa', animation: 'nudgeTimer 9s linear forwards' }} />
        </div>
      </div>
    </div>
  );
}

export default function NudgePopupContainer({ nudges, onDismiss }) {
  if (!nudges.length) return null;
  // Mostrar uno a la vez (el más reciente)
  const current = nudges[nudges.length - 1];
  return (
    <FullScreenNudge
      key={current._popupId}
      nudge={current}
      onDismiss={() => onDismiss(current._popupId)}
    />
  );
}
