import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabase';
import detective from '../assets/detective.png';
import detectiveAlert from '../assets/detective-alert.png';

// Campaña "Gana puntos sobre Andersen":
// - Por ahora SOLO usuarios de prueba. Para abrir a todos: KNOWLEDGE_OPEN = true.
export const KNOWLEDGE_OPEN = false;
export const KNOWLEDGE_BETA = ['daniel.leon', 'yajaira.alvarado', 'kleber.padilla'];
export const canSeeKnowledge = (username) =>
  KNOWLEDGE_OPEN || KNOWLEDGE_BETA.includes((username || '').toLowerCase());
const canSee = canSeeKnowledge;

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
  const [consentChecked, setConsentChecked] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const lastIdxRef = useRef(null);
  const startedRef = useRef(false);
  const answeredRef = useRef(false);
  const qStartRef = useRef(0);
  const alertRef = useRef(false);
  const advanceRef = useRef(null);

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

  // ── Prompt de 20 segundos ──────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'prompt') return;
    setTimeLeft(20);
    const iv = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    const to = setTimeout(() => setPhase(null), 20000); // no responde → se cierra
    return () => { clearInterval(iv); clearTimeout(to); };
  }, [phase]);

  // ── "Scanner" de 4s antes de cada pregunta (detective 🕵️) ───────────────────
  useEffect(() => {
    if (phase !== 'scan') return;
    const to = setTimeout(() => setPhase(alertRef.current ? 'scanalert' : 'q'), 4000);
    return () => clearTimeout(to);
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

  // ── Anti-IA: si sale de la ventana / cambia de pestaña con la pregunta
  //    abierta, se marca como INCORRECTA automáticamente ────────────────────────
  useEffect(() => {
    if (phase !== 'q') return;
    // Solo 'visibilitychange' (cambio real de pestaña/app). NO usamos 'blur' porque
    // en móvil da falsos positivos al tocar la pantalla.
    const onVis = () => { if (document.hidden && !answeredRef.current) submit(-1); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, q]);

  // Limpieza del temporizador de avance al desmontar
  useEffect(() => () => clearTimeout(advanceRef.current), []);

  async function submit(idx) {
    if (answeredRef.current) return;
    answeredRef.current = true;
    lastIdxRef.current = idx;
    setSelected(idx);
    const maxMs = (q?.seconds || 0) * 1000;
    const ms = idx === -1 ? maxMs : Math.min(maxMs || 999999, Date.now() - qStartRef.current);
    const args = { p_user: userId, p_question: q.id, p_selected: idx, p_ms: ms };
    let data, error;
    try {
      ({ data, error } = await supabase.rpc('submit_andersen_trivia', args));
      if (error || !data || data.error) {
        // Reintentar una vez (la función es idempotente: si ya se grabó, devuelve el resultado)
        ({ data, error } = await supabase.rpc('submit_andersen_trivia', args));
      }
    } catch (e) {
      error = { message: String(e?.message || e) };
    }
    if (error || !data || data.error) {
      // Mostrar el error en pantalla (no perder el flujo) y permitir reintentar
      const msg = error?.message || data?.error || 'sin respuesta del servidor';
      console.error('submit trivia error definitivo:', msg);
      setErrMsg(msg);
      setPhase('error');
      return;
    }
    setResult(data);
    setMeta((m) => ({ ...(m || {}), total_bonus: data.total_bonus, at_cap: data.at_cap, attempts_left: data.attempts_left }));
    // SIN temporizadores: el resultado se queda en pantalla con sus botones
    // (así nunca se lo salta, sin importar cuántas preguntas seguidas juegue)
    setPhase('result');
  }

  // Primero verifica el consentimiento de ética del día; si no lo dio, lo pide.
  async function openQuestion() {
    const { data: consented } = await supabase.rpc('andersen_consent', { p_user: userId, p_accept: false });
    if (!consented) { setConsentChecked(false); setPhase('consent'); return; }
    reserveAndScan();
  }

  // Registra el consentimiento y continúa
  async function acceptConsent() {
    await supabase.rpc('andersen_consent', { p_user: userId, p_accept: true });
    reserveAndScan();
  }

  // Abre (reserva) una pregunta: queda registrada apenas se muestra (anti-F5)
  async function reserveAndScan() {
    clearTimeout(advanceRef.current);
    const { data, error } = await supabase.rpc('open_andersen_trivia', { p_user: userId });
    if (error || !data || !data.has_question) {
      setMeta((m) => ({ ...(m || {}), attempts_left: data?.attempts_left ?? 0 }));
      setPhase('nomore');
      return;
    }
    setMeta({ attempts_left: data.attempts_left, total_bonus: data.total_bonus, at_cap: data.at_cap });
    setQ(data.question);
    setResult(null);
    alertRef.current = Math.random() < 0.2; // ~1 de cada 5 (20%): alerta "despiste"
    setPhase('scan');
  }

  const close = () => { setPhase(null); setResult(null); };

  if (!phase) return null;
  const willWin = meta && !meta.at_cap;

  // ── UI ──────────────────────────────────────────────────────────────────────
  if (phase === 'prompt') {
    const RED = '#B3001F';
    const chips = [['🎯', '4 al día'], ['⭐', '+1 c/u'], ['🏆', 'hasta 20'], ['📅', '17 Jul']];
    return (
      <div style={OVERLAY}>
        <div style={{ width: 420, maxWidth: '94vw', maxHeight: '94vh', overflowY: 'auto', borderRadius: 20, position: 'relative',
          background: '#fbfbfb', boxShadow: '0 24px 70px rgba(0,0,0,0.6)', border: '1px solid rgba(0,0,0,0.06)' }}>

          {/* Cabecera roja */}
          <div style={{ background: `linear-gradient(90deg,${RED},#8f0018)`, padding: '10px 0 8px', textAlign: 'center' }}>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 12, letterSpacing: '0.22em' }}>ANDERSEN</div>
            <div style={{ height: 2, width: 50, background: '#fff', opacity: 0.85, margin: '4px auto 0', borderRadius: 2 }} />
          </div>

          <div style={{ padding: '14px 20px 18px', textAlign: 'center' }}>
            <h2 style={{ color: '#1a1a1a', fontWeight: 900, fontStyle: 'italic', fontSize: 25, lineHeight: 1, letterSpacing: '0.01em' }}>
              TRIVIA ANDERSEN
            </h2>
            <p style={{ color: RED, fontWeight: 900, fontStyle: 'italic', fontSize: 13, marginTop: 4, letterSpacing: '0.02em' }}>
              ¿CUÁNTO SABES DE ANDERSEN?
            </p>

            <p style={{ color: '#555', fontSize: 12.5, lineHeight: 1.4, margin: '8px auto 0', maxWidth: 360 }}>
              Responde preguntas sobre <b>Andersen Global</b> y <b>Andersen Ecuador</b> y gana puntos para escalar en el ranking.
            </p>

            {/* Chips compactos: reglas del juego de un vistazo */}
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', margin: '12px 0 0' }}>
              {chips.map(([e, t]) => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', border: `1px solid ${RED}33`,
                  color: '#333', fontSize: 11.5, fontWeight: 800, padding: '5px 10px', borderRadius: 20 }}>
                  <span>{e}</span>{t}
                </span>
              ))}
            </div>

            {/* Intentos restantes hoy (grande) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#fff4f5', border: `2px solid ${RED}`, borderRadius: 12, padding: '9px 14px', margin: '14px 0 0' }}>
              <span style={{ fontSize: 30, fontWeight: 900, color: RED, lineHeight: 1 }}>{meta?.attempts_left ?? 0}</span>
              <span style={{ textAlign: 'left', color: '#333', fontSize: 12.5, fontWeight: 800, lineHeight: 1.15 }}>
                pregunta{(meta?.attempts_left ?? 0) === 1 ? '' : 's'}<br />te quedan hoy
              </span>
            </div>

            <p style={{ color: '#888', fontSize: 11, lineHeight: 1.35, margin: '8px 0 0' }}>
              {willWin
                ? <>Tope de <b>20 puntos</b> por actividades adicionales{typeof meta?.total_bonus === 'number' ? ` · llevas ${meta.total_bonus}/20` : ''}.</>
                : <>Ya llegaste al tope de <b>20 puntos</b>. Puedes seguir por diversión (vale 0). 😎</>}
            </p>

            {/* Tiempo */}
            <div style={{ height: 5, borderRadius: 3, background: '#e6e6e6', overflow: 'hidden', margin: '12px 0 5px' }}>
              <div style={{ height: '100%', width: `${(timeLeft / 20) * 100}%`, background: RED, transition: 'width 1s linear' }} />
            </div>
            <p style={{ color: '#999', fontSize: 10.5, fontWeight: 700 }}>Se cierra en {timeLeft}s…</p>

            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button onClick={close} style={{ flex: 1, padding: '12px', borderRadius: 13, fontWeight: 800, fontSize: 13,
                background: '#efefef', color: '#666', border: '1px solid #ddd', touchAction: 'manipulation' }}>
                Ahora no
              </button>
              <button onClick={openQuestion} style={{ flex: 1.6, padding: '12px', borderRadius: 13, fontWeight: 900, fontSize: 15,
                background: RED, color: 'white', border: 'none', boxShadow: '0 6px 18px rgba(179,0,31,0.4)', touchAction: 'manipulation' }}>
                ¡JUGAR AHORA! 🎯
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'consent') {
    const RED = '#B3001F';
    return (
      <div style={OVERLAY}>
        <div style={{ ...CARD, textAlign: 'center' }}>
          <div style={{ fontSize: 40 }}>🤝</div>
          <p style={{ color: 'white', fontWeight: 900, fontSize: 18 }}>Compromiso de juego limpio</p>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11.5, marginTop: 4 }}>Solo una vez al día, antes de empezar.</p>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left', marginTop: 16,
            background: 'rgba(255,255,255,0.05)', border: `1px solid ${consentChecked ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.15)'}`,
            borderRadius: 12, padding: '12px 14px', cursor: 'pointer' }}>
            <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)}
              style={{ width: 20, height: 20, marginTop: 1, accentColor: '#34d399', flexShrink: 0, cursor: 'pointer' }} />
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 1.5 }}>
              Declaro que responderé por mis propios conocimientos. Entiendo que <b style={{ color: '#ff8a8a' }}>usar IA o recibir ayuda de otras personas es una falta grave a los principios de ética de la firma</b>, que todas mis respuestas quedan registradas, y que hacerlo puede <b>descalificarme</b> de la campaña.
            </span>
          </label>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={close} style={btn('ghost')}>Ahora no</button>
            <button onClick={acceptConsent} disabled={!consentChecked}
              style={{ flex: 1.6, padding: '12px', borderRadius: 14, fontWeight: 900, fontSize: 14.5,
                background: consentChecked ? RED : '#5a5a5a', color: 'white', border: 'none',
                opacity: consentChecked ? 1 : 0.6, cursor: consentChecked ? 'pointer' : 'not-allowed', touchAction: 'manipulation' }}>
              Acepto y continúo
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'scan') {
    return (
      <div style={OVERLAY}>
        <div style={{ ...CARD, textAlign: 'center', border: '2px solid rgba(179,0,31,0.6)' }}>
          <div style={{ position: 'relative', width: 150, height: 150, margin: '4px auto 6px' }}>
            <img src={detective} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', animation: 'trophyBounce 1.6s ease-in-out infinite', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.5))' }} />
            {/* Línea de escaneo */}
            <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,transparent,#ff3b3b,transparent)', boxShadow: '0 0 10px #ff3b3b', animation: 'triviaScan 1.4s linear infinite' }} />
          </div>
          <p style={{ color: '#ff5566', fontWeight: 900, fontSize: 15, letterSpacing: '0.02em' }}>🔍 MODO VIGILANCIA</p>
          <p style={{ color: 'white', fontSize: 13.5, fontWeight: 700, marginTop: 6 }}>
            Monitoreando pestañas abiertas y cámara<span style={{ animation: 'triviaBlink 1s steps(1) infinite' }}>…</span>
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 6, lineHeight: 1.4 }}>
            Nada de IA 😏 Prepárate… tu pregunta está por aparecer.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'scanalert') {
    return (
      <div style={OVERLAY}>
        <div style={{ ...CARD, textAlign: 'center', border: '3px solid #ff3b3b', boxShadow: '0 0 60px rgba(255,59,59,0.5), 0 24px 60px rgba(0,0,0,0.7)' }}>
          <img src={detectiveAlert} alt="" style={{ width: 150, height: 150, objectFit: 'contain', margin: '2px auto 4px', animation: 'trophyBounce 1.3s ease-in-out infinite', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.5))' }} />
          <p style={{ color: '#ff5566', fontWeight: 900, fontSize: 16, letterSpacing: '0.02em' }}>⚠️ ALERTA DE VIGILANCIA</p>
          <p style={{ color: 'white', fontSize: 13.5, fontWeight: 700, marginTop: 8, lineHeight: 1.45 }}>
            Hemos detectado <b style={{ color: '#ff8a8a' }}>páginas de IA abiertas</b>. Por favor ciérralas antes de continuar.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11.5, marginTop: 8, lineHeight: 1.4 }}>
            Recuerda que <b>todo queda registrado</b> y el uso de ayudas externas puede descalificarte.
          </p>
          <button onClick={() => setPhase('q')} style={{ width: '100%', marginTop: 16, padding: '13px', borderRadius: 14, fontWeight: 900, fontSize: 15,
            background: 'linear-gradient(90deg,#ff3b3b,#c40024)', color: 'white', border: 'none', boxShadow: '0 6px 18px rgba(255,59,59,0.45)', touchAction: 'manipulation' }}>
            Ya las cerré · Continuar
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'q' && q) {
    const pct = q.seconds ? (timeLeft / q.seconds) * 100 : 0;
    return (
      <div style={OVERLAY}>
        <div style={{ ...CARD, userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none', WebkitTouchCallout: 'none' }}
          onContextMenu={(e) => e.preventDefault()}
          onCopy={(e) => e.preventDefault()}
          onCut={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}>
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

          <p style={{ color: 'rgba(248,113,113,0.9)', fontSize: 10, fontWeight: 700, marginBottom: 8, lineHeight: 1.35 }}>
            🚫 Estamos <b>monitoreando el uso de IA</b>. Salir de la ventana, cambiar de pestaña o usar ayudas externas puede <b>descalificarte</b> · si sales, cuenta como incorrecta.
          </p>
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

  if (phase === 'result' && result) {
    const ok = result.is_correct;
    const left = result.attempts_left ?? meta?.attempts_left ?? 0;
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
                  <b style={{ marginRight: 6 }}>{'ABCD'[result.correct_index]}</b>{q?.options?.[result.correct_index] ?? ''}
                </p>
              </div>}

          {/* Botones en la misma tarjeta (sin auto-avance) */}
          {left > 0 ? (
            <>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginTop: 14 }}>
                Te quedan <b style={{ color: '#FFD100' }}>{left}</b> pregunta{left === 1 ? '' : 's'} hoy. ¿Otra?
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button onClick={close} style={btn('ghost')}>No, salir</button>
                <button onClick={openQuestion} style={btn('gold')}>¡Sí, otra! 🎯</button>
              </div>
            </>
          ) : (
            <>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginTop: 14 }}>
                Ya usaste tus preguntas del día. <b>Vuelve mañana</b> 🧠
              </p>
              <button onClick={close} style={{ ...btn('gold'), marginTop: 10, width: '100%' }}>Entendido</button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div style={OVERLAY}>
        <div style={{ ...CARD, textAlign: 'center', border: '2px solid rgba(251,191,36,0.5)' }}>
          <p style={{ fontSize: 38 }}>📡</p>
          <p style={{ color: '#fbbf24', fontWeight: 900, fontSize: 16 }}>No se pudo grabar tu respuesta</p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8, lineHeight: 1.4 }}>
            Tu respuesta quedó seleccionada, solo falta confirmarla. Toca <b>Reintentar</b>.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 8, wordBreak: 'break-word' }}>
            Detalle técnico: {errMsg}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={close} style={btn('ghost')}>Salir</button>
            <button onClick={() => { answeredRef.current = false; submit(lastIdxRef.current ?? -1); }} style={btn('gold')}>
              Reintentar 🔄
            </button>
          </div>
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
            <button onClick={openQuestion} style={btn('gold')}>¡Sí, otra! 🎯</button>
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
