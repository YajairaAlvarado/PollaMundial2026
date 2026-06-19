import React, { useState, useEffect, useRef, useMemo } from 'react';
import StickerCard from './StickerCard';
import { ANSWER_MS } from '../utils/album';

const CONFETTI = ['🎉','✨','🏆','🥳','🔥','⭐','🎊','⚽'];
function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.7, dur: 1.6 + Math.random() * 1.4, emoji: CONFETTI[i % CONFETTI.length],
  })), []);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 5 }}>
      {pieces.map((p, i) => (
        <span key={i} style={{ position: 'absolute', top: -20, left: `${p.left}%`, fontSize: 22,
          animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards` }}>{p.emoji}</span>
      ))}
    </div>
  );
}

const Shell = ({ children }) => (
  <div style={{ position: 'fixed', inset: 0, zIndex: 100002, background: 'rgba(5,2,20,0.93)', backdropFilter: 'blur(6px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
    <div style={{ width: 360, maxWidth: '94vw', background: 'linear-gradient(160deg,#15103a,#0a1530)',
                  border: '2px solid rgba(255,209,0,0.45)', borderRadius: 22, padding: 18, position: 'relative',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.75)' }}>
      {children}
    </div>
  </div>
);

export default function AlbumChallenge({ challenge, onRecord, onClose }) {
  const { type, target, options, answer } = challenge;
  const [phase, setPhase]     = useState('q');     // 'q' | 'result'
  const [picked, setPicked]   = useState(null);    // valor elegido
  const [result, setResult]   = useState(null);    // 'win' | 'lose' | 'timeout'
  const [nowTs, setNowTs]     = useState(Date.now());
  const startRef = useRef(Date.now());
  const doneRef  = useRef(false);

  // Tick del cronómetro
  useEffect(() => {
    if (phase !== 'q') return;
    const id = setInterval(() => setNowTs(Date.now()), 100);
    return () => clearInterval(id);
  }, [phase]);

  const elapsed = nowTs - startRef.current;
  const tLeft   = Math.max(0, Math.ceil((ANSWER_MS - elapsed) / 1000));

  const finish = (res, val) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPicked(val ?? null);
    setResult(res);
    setPhase('result');
    onRecord(res, target);
  };

  // Tiempo agotado
  useEffect(() => {
    if (phase === 'q' && elapsed >= ANSWER_MS) finish('timeout');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, phase]);

  const pick = (val) => {
    if (phase !== 'q') return;
    finish(val === answer ? 'win' : 'lose', val);
  };

  // ── Resultado ──
  if (phase === 'result') {
    const win = result === 'win';
    const legendary = win && target.isDT;
    return (
      <Shell>
        {win && <Confetti />}
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 6 }}>
          <p className={legendary ? 'shimmer-gold' : ''} style={{ fontSize: legendary ? 15 : 13, fontWeight: 900, letterSpacing: '0.08em',
                      color: legendary ? '#FFD700' : win ? '#FFD700' : '#f87171' }}>
            {legendary ? '⭐ ¡FICHA LEGENDARIA! ⭐' : win ? '✨ ¡FICHA NUEVA! ✨' : result === 'timeout' ? '⏰ ¡SE ACABÓ EL TIEMPO!' : '😖 ¡CASI!'}
          </p>
          {legendary && (
            <p style={{ fontSize: 11, fontWeight: 800, color: '#FFA500', marginTop: 2 }}>
              Conseguiste a un DT · ¡súper difícil de sacar!
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: legendary ? '28px 0' : '14px 0', position: 'relative', minHeight: legendary ? 220 : undefined }}>
            {legendary && <span className="legend-halo" />}
            {legendary && <span className="legend-rays" />}
            <div className={legendary ? 'album-legendary' : win ? 'album-reveal' : 'album-fail'} style={{ position: 'relative', zIndex: 2 }}>
              <StickerCard player={target} owned={true} size="lg" />
            </div>
          </div>
          <p className="text-white" style={{ fontWeight: 900, fontSize: 18 }}>
            {win ? `¡${target.displayName.split(' ')[0]} es tuyo!` : 'No la conseguiste'}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>
            {win ? (legendary ? '¡Ficha estrella pegada en tu álbum! 🌟' : 'Pegada en tu álbum 📒') : 'Te aparecerá otra oportunidad pronto'}
          </p>
          <button onClick={onClose} className="mt-4 w-full py-3 rounded-2xl font-black"
            style={{ background: win ? 'linear-gradient(135deg,#FFD700,#FFA500)' : 'rgba(255,255,255,0.08)',
                     color: win ? '#3a2e00' : 'rgba(255,255,255,0.6)',
                     border: win ? 'none' : '1px solid rgba(255,255,255,0.15)',
                     touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
            {win ? '¡Genial! 🎉' : 'Cerrar'}
          </button>
        </div>
      </Shell>
    );
  }

  // ── Pregunta ──
  const barPct = Math.max(0, (1 - elapsed / ANSWER_MS) * 100);
  const prompt = type === 'photo-name' ? '¿Quién es este compañero?'
    : type === 'name-photo' ? '¿Cuál es su ficha?'
    : '¿De qué departamento es?';

  return (
    <Shell>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: '#FFD100', fontSize: 12, fontWeight: 900, letterSpacing: '0.05em' }}>📒 RETO DEL ÁLBUM</span>
        <span style={{ fontSize: 17, fontWeight: 900, color: tLeft <= 3 ? '#f87171' : '#FFD100' }}>⏱ {tLeft}s</span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ height: '100%', width: `${barPct}%`, background: tLeft <= 3 ? '#f87171' : '#FFD100', transition: 'width 0.1s linear' }} />
      </div>

      <p className="text-white" style={{ fontSize: 16, fontWeight: 800, textAlign: 'center', marginBottom: 14 }}>{prompt}</p>

      {/* Estímulo */}
      {(type === 'photo-name' || type === 'photo-dept') && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <StickerCard player={target} owned={true} hideName hideDept size="lg" />
        </div>
      )}
      {type === 'name-photo' && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,209,0,0.12)', border: '1px solid rgba(255,209,0,0.4)',
                        borderRadius: 14, padding: '12px 20px' }}>
            <div className="text-white" style={{ fontSize: 22, fontWeight: 900 }}>{target.displayName}</div>
          </div>
        </div>
      )}

      {/* Opciones */}
      {type === 'name-photo' ? (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {options.map((p) => (
            <StickerCard key={p.username} player={p} owned={true} hideName hideDept size="sm"
              selectable onClick={() => pick(p.username)} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {options.map((o) => {
            const val = o.username || o.value;
            return (
              <button key={val} onClick={() => pick(val)}
                style={{ padding: '13px 14px', borderRadius: 12, fontWeight: 800, fontSize: 14, textAlign: 'center',
                         background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', color: 'white',
                         touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', cursor: 'pointer' }}>
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
