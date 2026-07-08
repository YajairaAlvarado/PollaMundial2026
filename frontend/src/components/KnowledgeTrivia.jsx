import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabase';

// Campaña "Gana puntos sobre Andersen":
// - Arranca el 9-jul-2026 (00:00 Ecuador) para todos.
// - daniel.leon la ve desde antes (preview).
const START = new Date('2026-07-09T05:00:00Z');
const canSee = (username) =>
  Date.now() >= START.getTime() || (username || '').toLowerCase() === 'daniel.leon';

const OVERLAY = {
  position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(5,2,20,0.86)',
  backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
};
const CARD = {
  width: 400, maxWidth: '94vw', background: 'linear-gradient(160deg,#12183a,#0a1024)',
  border: '2px solid rgba(255,209,0,0.4)', borderRadius: 22, padding: 22,
  boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
};

export default function KnowledgeTrivia({ userId, username, enabled = true }) {
  const [phase, setPhase]   = useState(null);   // null|prompt|q|result|choice|nomore
  const [meta, setMeta]     = useState(null);   // {attempts_left,total_bonus,at_cap}
  const [q, setQ]           = useState(null);   // {id,question,options,seconds}
  const [result, setResult] = useState(null);   // respuesta enviada
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const startedRef = useRef(false);
  const answeredRef = useRef(false);
  const qStartRef = useRef(0);

  // ── Entrada a la app: una sola vez por sesión ──────────────────────────────
  useEffect(() => {
    if (!enabled || !userId || startedRef.current || !canSee(username)) return;
    startedRef.current = true;
    (async () => {
      const st = await fetchState();
      if (st && st.has_question && st.attempts_left > 0) setPhase('prompt');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, userId, username]);

  async function fetchState() {
    const { data, error } = await supabase.rpc('get_andersen_trivia', { p_user: userId });
    if (error || !data) return null;
    setMeta({ attempts_left: data.attempts_left, total_bonus: data.total_bonus, at_cap: data.at_cap });
    setQ(data.has_question ? data.question : null);
    return data;
  }

  // ── Prompt de 7 segundos ───────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'prompt') return;
    setTimeLeft(7);
    const iv = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    const to = setTimeout(() => setPhase(null), 7000); // no responde → se cierra
    return () => { clearInterval(iv); clearTimeout(to); };
  }, [phase]);

  // ── Cronómetro de la pregunta ──────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'q' || !q) return;
    answeredRef.current = false;
    setSelected(null);
    setTimeLeft(q.seconds);
    qStartRef.current = Date.now();
    const iv = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(iv); submit(-1); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, q]);

  // ── Tras el resultado: mostrar y pasar a "¿otra?" ──────────────────────────
  useEffect(() => {
    if (phase !== 'result' || !result) return;
    const delay = result.is_correct ? 1600 : 2000; // mal → 2s viendo la correcta
    const to = setTimeout(() => {
      setPhase((result.attempts_left ?? 0) > 0 ? 'choice' : 'nomore');
    }, delay);
    return () => clearTimeout(to);
  }, [phase, result]);

  async function submit(idx) {
    if (answeredRef.current) return;
    answeredRef.current = true;
    setSelected(idx);
    const maxMs = (q.seconds || 0) * 1000;
    const ms = idx === -1 ? maxMs : Math.min(maxMs || 999999, Date.now() - qStartRef.current);
    const { data } = await supabase.rpc('submit_andersen_trivia',
      { p_user: userId, p_question: q.id, p_selected: idx, p_ms: ms });
    if (!data || data.error) { setPhase(null); return; }
    setResult(data);
    setMeta((m) => ({ ...(m || {}), total_bonus: data.total_bonus, at_cap: data.at_cap, attempts_left: data.attempts_left }));
    setPhase('result');
  }

  async function nextQuestion() {
    const st = await fetchState();
    if (st && st.has_question && st.attempts_left > 0) { setResult(null); setPhase('q'); }
    else setPhase('nomore');
  }

  const close = () => { setPhase(null); setResult(null); };

  if (!phase) return null;
  const willWin = meta && !meta.at_cap;

  // ── UI ──────────────────────────────────────────────────────────────────────
  if (phase === 'prompt') {
    return (
      <div style={OVERLAY}>
        <div style={{ width: 460, maxWidth: '94vw', borderRadius: 26, overflow: 'hidden', position: 'relative',
          background: 'linear-gradient(160deg,#E4002B 0%,#b3001f 42%,#12183a 100%)',
          border: '3px solid #FFD100', boxShadow: '0 0 70px rgba(255,209,0,0.45), 0 24px 70px rgba(0,0,0,0.75)' }}>

          {/* Cinta superior */}
          <div style={{ background: 'linear-gradient(90deg,#FFD100,#ffb700,#FFD100)', color: '#3a2200', textAlign: 'center',
            fontWeight: 900, fontSize: 12.5, letterSpacing: '0.12em', padding: '6px 0' }}>
            ⭐ ANDERSEN MUNDIALISTA · RETO EXPRÉS ⭐
          </div>

          <div style={{ padding: '22px 24px 24px', textAlign: 'center', position: 'relative' }}>
            {/* Monedas */}
            <div style={{ fontSize: 52, lineHeight: 1, animation: 'trophyBounce 2s ease-in-out infinite' }}>🎁</div>
            <div style={{ position: 'absolute', top: 18, left: 26, fontSize: 26, animation: 'trophyBounce 2.4s ease-in-out infinite' }}>🪙</div>
            <div style={{ position: 'absolute', top: 24, right: 28, fontSize: 22, animation: 'trophyBounce 2.7s ease-in-out infinite' }}>✨</div>

            <h2 style={{ color: '#FFD100', fontWeight: 900, fontSize: 30, lineHeight: 1, margin: '10px 0 2px', textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>
              ¡GANA UN PUNTO!
            </h2>
            <p style={{ color: 'white', fontSize: 16, fontWeight: 800, lineHeight: 1.25 }}>
              {willWin ? '¿Deseas ganar un punto adicional?' : '¡Sigue jugando por diversión!'}
            </p>

            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13.5, lineHeight: 1.45, margin: '10px auto 0', maxWidth: 340 }}>
              {willWin
                ? <>Contesta <b style={{ color: '#FFD100' }}>1 pregunta</b> sobre Andersen y suma <b style={{ color: '#FFD100' }}>+1 punto</b> a tu marcador. ¡Cada punto te acerca a los premios! 🚀</>
                : <>Ya llegaste al tope de <b style={{ color: '#FFD100' }}>20 puntos</b> extra. Puedes seguir contestando por diversión (vale 0). 😎</>}
            </p>

            {/* Barra de tiempo del prompt */}
            <div style={{ height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.18)', overflow: 'hidden', margin: '18px 0 6px' }}>
              <div style={{ height: '100%', width: `${(timeLeft / 7) * 100}%`, background: '#FFD100', transition: 'width 1s linear' }} />
            </div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700 }}>Se cierra en {timeLeft}s…</p>

            <div style={{ display: 'flex', gap: 11, marginTop: 16 }}>
              <button onClick={close} style={{ flex: 1, padding: '13px', borderRadius: 15, fontWeight: 800, fontSize: 13.5,
                background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.25)', touchAction: 'manipulation' }}>
                Ahora no
              </button>
              <button onClick={() => setPhase('q')} style={{ flex: 1.6, padding: '13px', borderRadius: 15, fontWeight: 900, fontSize: 16,
                background: 'linear-gradient(90deg,#FFD100,#ffb200)', color: '#3a2200', border: 'none',
                boxShadow: '0 6px 20px rgba(255,209,0,0.5)', touchAction: 'manipulation' }}>
                ¡SÍ, JUGAR! 🎯
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'q' && q) {
    const pct = q.seconds ? (timeLeft / q.seconds) * 100 : 0;
    return (
      <div style={OVERLAY}>
        <div style={CARD}>
          {/* Banner: gana punto o no */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            background: willWin ? 'rgba(255,209,0,0.12)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${willWin ? 'rgba(255,209,0,0.35)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 10, padding: '7px 11px', marginBottom: 12 }}>
            <span style={{ color: willWin ? '#FFD100' : 'rgba(255,255,255,0.6)', fontSize: 11.5, fontWeight: 800 }}>
              {willWin ? '🎁 Si aciertas: +1 punto' : '🔒 Ya tienes 20 pts · vale 0'}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700 }}>
              {meta?.total_bonus ?? 0}/20 extra
            </span>
          </div>

          {/* Barra de tiempo */}
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: 4 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: timeLeft <= 2 ? '#f87171' : '#FFD100', transition: 'width 1s linear' }} />
          </div>
          <p style={{ textAlign: 'right', color: timeLeft <= 2 ? '#f87171' : 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 800, marginBottom: 10 }}>{timeLeft}s</p>

          <p style={{ color: 'white', fontSize: 15, fontWeight: 800, lineHeight: 1.3, marginBottom: 14 }}>{q.question}</p>

          <div style={{ display: 'grid', gap: 8 }}>
            {q.options.map((opt, i) => (
              <button key={i} onClick={() => submit(i)}
                style={{ textAlign: 'left', padding: '11px 13px', borderRadius: 12, background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)', fontSize: 13.5, fontWeight: 600,
                  touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
                <b style={{ color: '#FFD100', marginRight: 7 }}>{'ABCD'[i]}</b>{opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'result' && result && q) {
    const ok = result.is_correct;
    return (
      <div style={OVERLAY}>
        <div style={{ ...CARD, border: `2px solid ${ok ? 'rgba(52,211,153,0.5)' : 'rgba(248,113,113,0.5)'}` }}>
          <p style={{ fontSize: 44, textAlign: 'center' }}>{ok ? '✅' : '❌'}</p>
          <p style={{ color: ok ? '#34d399' : '#f87171', fontSize: 20, fontWeight: 900, textAlign: 'center' }}>
            {ok ? '¡Correcto!' : '¡Incorrecto!'}
          </p>
          {ok
            ? <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', marginTop: 6 }}>
                {result.awarded ? <>Ganaste <b style={{ color: '#FFD100' }}>+1 punto</b> 🎉 (llevas {result.total_bonus}/20)</> : 'Bien hecho (ya tienes tus 20 pts, no suma)'}
              </p>
            : <div style={{ marginTop: 8, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10, padding: '9px 12px' }}>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 700, marginBottom: 3 }}>Respuesta correcta:</p>
                <p style={{ color: '#6ee7b7', fontSize: 13.5, fontWeight: 800 }}>
                  <b style={{ marginRight: 6 }}>{'ABCD'[result.correct_index]}</b>{q.options[result.correct_index]}
                </p>
              </div>}
        </div>
      </div>
    );
  }

  if (phase === 'choice') {
    return (
      <div style={OVERLAY}>
        <div style={CARD}>
          <p style={{ fontSize: 36, textAlign: 'center' }}>🎯</p>
          <p style={{ color: 'white', fontSize: 17, fontWeight: 900, textAlign: 'center' }}>¿Otra pregunta?</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12.5, textAlign: 'center', marginTop: 6 }}>
            Te quedan <b style={{ color: '#FFD100' }}>{meta?.attempts_left ?? 0}</b> pregunta{(meta?.attempts_left ?? 0) === 1 ? '' : 's'} hoy.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={close} style={btn('ghost')}>No, salir</button>
            <button onClick={nextQuestion} style={btn('gold')}>¡Sí, otra! 🎯</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'nomore') {
    return (
      <div style={OVERLAY}>
        <div style={CARD}>
          <p style={{ fontSize: 40, textAlign: 'center' }}>👋</p>
          <p style={{ color: 'white', fontSize: 17, fontWeight: 900, textAlign: 'center' }}>¡Eso es todo por hoy!</p>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, textAlign: 'center', marginTop: 6 }}>
            Ya usaste tus preguntas del día. <b>Vuelve mañana</b> por más puntos 🧠
          </p>
          <button onClick={close} style={{ ...btn('gold'), marginTop: 16, width: '100%' }}>Entendido</button>
        </div>
      </div>
    );
  }

  return null;
}

function btn(kind) {
  const base = { flex: 1, padding: '12px', borderRadius: 14, fontWeight: 900, fontSize: 14, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' };
  if (kind === 'gold') return { ...base, background: 'linear-gradient(90deg,#FFD100,#f59e0b)', color: '#3a2e00', border: 'none' };
  return { ...base, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.14)' };
}
