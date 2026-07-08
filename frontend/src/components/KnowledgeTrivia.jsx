import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../utils/supabase';
import detective from '../assets/detective.png';
import detectiveAlert from '../assets/detective-alert.png';

// Campaña "Gana puntos sobre Andersen":
// - Arranca el 9-jul-2026 (00:00 Ecuador) para todos.
// - daniel.leon la ve desde antes (preview).
const START = new Date('2026-07-09T05:00:00Z');
const PREVIEW = ['daniel.leon', 'yajaira.alvarado', 'kleber.padilla'];
const canSee = (username) =>
  Date.now() >= START.getTime() || PREVIEW.includes((username || '').toLowerCase());

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
  const startedRef = useRef(false);
  const answeredRef = useRef(false);
  const qStartRef = useRef(0);
  const alertRef = useRef(false);

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
    const { data, error } = await supabase.rpc('submit_andersen_trivia',
      { p_user: userId, p_question: q.id, p_selected: idx, p_ms: ms });
    if (error || !data || data.error) {
      // No cerrar en blanco: reintentar el flujo con "¿otra pregunta?"
      console.error('submit trivia error:', error || data?.error);
      answeredRef.current = false;
      setPhase('choice');
      return;
    }
    setResult(data);
    setMeta((m) => ({ ...(m || {}), total_bonus: data.total_bonus, at_cap: data.at_cap, attempts_left: data.attempts_left }));
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
    return (
      <div style={OVERLAY}>
        <div style={{ width: 480, maxWidth: '94vw', maxHeight: '92vh', overflowY: 'auto', borderRadius: 22, position: 'relative',
          background: '#fbfbfb', boxShadow: '0 24px 70px rgba(0,0,0,0.6)', border: '1px solid rgba(0,0,0,0.06)' }}>

          {/* Cabecera roja */}
          <div style={{ background: `linear-gradient(90deg,${RED},#8f0018)`, padding: '14px 0 12px', textAlign: 'center' }}>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 13, letterSpacing: '0.22em' }}>ANDERSEN</div>
            <div style={{ height: 2, width: 60, background: '#fff', opacity: 0.85, margin: '5px auto 0', borderRadius: 2 }} />
          </div>

          <div style={{ padding: '18px 22px 22px', textAlign: 'center' }}>
            <h2 style={{ color: '#1a1a1a', fontWeight: 900, fontStyle: 'italic', fontSize: 30, lineHeight: 1, letterSpacing: '0.01em' }}>
              TRIVIA ANDERSEN
            </h2>
            <p style={{ color: RED, fontWeight: 900, fontStyle: 'italic', fontSize: 15, marginTop: 6, letterSpacing: '0.02em' }}>
              ¿CUÁNTO SABES DE ANDERSEN?
            </p>

            <p style={{ color: '#444', fontSize: 13, lineHeight: 1.45, margin: '10px auto 0', maxWidth: 380 }}>
              Pon a prueba tus conocimientos sobre <b>Andersen Global</b> y <b>Andersen Ecuador</b> y gana puntos adicionales para mejorar tu posición en el ranking del Pronóstico Mundialista.
            </p>

            {/* Cómo participar + premio */}
            <div style={{ display: 'flex', gap: 14, textAlign: 'left', margin: '16px 0 4px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 160px' }}>
                <p style={{ color: RED, fontWeight: 900, fontSize: 13.5, marginBottom: 5 }}>👥 ¿Cómo participar?</p>
                <ul style={{ color: '#333', fontSize: 12, lineHeight: 1.6, paddingLeft: 16, listStyle: 'disc', margin: 0 }}>
                  <li>Ingresa a Andersen Mundialista</li>
                  <li>Responde las <b>4 preguntas diarias</b>, cada pregunta vale un punto.</li>
                </ul>
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <p style={{ color: RED, fontWeight: 900, fontSize: 13, marginBottom: 6, lineHeight: 1.2 }}>🏆 ¡Gana hasta 20 puntos adicionales!</p>
                <div style={{ background: RED, color: 'white', fontWeight: 900, fontSize: 12.5, textAlign: 'center', padding: '8px 10px', borderRadius: 8 }}>
                  📅 Fecha máxima: 17 de Julio
                </div>
              </div>
            </div>

            {/* Ánimo a los que van atrás */}
            <div style={{ borderTop: '1px solid #e6e6e6', margin: '14px 0 10px', paddingTop: 12 }}>
              <p style={{ color: RED, fontWeight: 900, fontStyle: 'italic', fontSize: 13.5, marginBottom: 4 }}>
                ¡AÚN ESTÁS A TIEMPO DE ESCALAR POSICIONES!
              </p>
              <p style={{ color: '#555', fontSize: 12, lineHeight: 1.45 }}>
                {willWin
                  ? 'Participa en la Trivia Andersen, responde correctamente las preguntas y gana puntos adicionales para mejorar tu posición.'
                  : 'Ya llegaste al tope de 20 puntos adicionales. Puedes seguir jugando por diversión (vale 0). 😎'}
              </p>
            </div>

            {/* Recuerda */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0f0f0', borderRadius: 10, padding: '9px 12px', textAlign: 'left' }}>
              <span style={{ fontSize: 16 }}>⭐</span>
              <p style={{ color: '#555', fontSize: 11, lineHeight: 1.35 }}>
                <b style={{ color: '#333' }}>Recuerda:</b> el puntaje acumulado por actividades adicionales no podrá superar los <b>20 puntos</b>{typeof meta?.total_bonus === 'number' ? ` (llevas ${meta.total_bonus}/20)` : ''}.
              </p>
            </div>

            {/* Intentos restantes hoy (grande) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#fff4f5', border: `2px solid ${RED}`, borderRadius: 12, padding: '10px 14px', margin: '14px 0 4px' }}>
              <span style={{ fontSize: 32, fontWeight: 900, color: RED, lineHeight: 1 }}>{meta?.attempts_left ?? 0}</span>
              <span style={{ textAlign: 'left', color: '#333', fontSize: 12.5, fontWeight: 800, lineHeight: 1.15 }}>
                pregunta{(meta?.attempts_left ?? 0) === 1 ? '' : 's'}<br />te quedan hoy
              </span>
            </div>

            {/* Tiempo */}
            <div style={{ height: 6, borderRadius: 3, background: '#e6e6e6', overflow: 'hidden', margin: '12px 0 6px' }}>
              <div style={{ height: '100%', width: `${(timeLeft / 20) * 100}%`, background: RED, transition: 'width 1s linear' }} />
            </div>
            <p style={{ color: '#999', fontSize: 11, fontWeight: 700 }}>Se cierra en {timeLeft}s…</p>

            <div style={{ display: 'flex', gap: 11, marginTop: 14 }}>
              <button onClick={close} style={{ flex: 1, padding: '13px', borderRadius: 13, fontWeight: 800, fontSize: 13.5,
                background: '#efefef', color: '#666', border: '1px solid #ddd', touchAction: 'manipulation' }}>
                Ahora no
              </button>
              <button onClick={openQuestion} style={{ flex: 1.6, padding: '13px', borderRadius: 13, fontWeight: 900, fontSize: 15.5,
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
