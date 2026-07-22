import React, { useState, useEffect, useRef, useMemo } from 'react';

// ── Juego del Jurado · Fiestas de Guayaquil ─────────────────────────────────
// Pantalla independiente (no usa el tema de la app). Pensada para una TABLET:
// los 3 jurados responden a la vez (multitouch). Gana el que acierte y sea el
// más rápido. Reutiliza la app solo como contenedor.

const TZ = 'America/Guayaquil';
const ROUND_SECONDS = 20;
const COUNTDOWN_SECONDS = 7; // tiempo entre preguntas para LEERLA en voz alta
const STORAGE = 'guayaquil_trivia_v3';

// Paleta Guayaquil (celeste + blanco + azul)
const C = {
  celeste: '#2BA9E0',
  celesteDark: '#0A6CB0',
  azul: '#083D77',
  blanco: '#FFFFFF',
  oro: '#FFC533',
};

// Opciones: { t: texto, img: foto en /fotosjuego, stars: N repite la estrella N veces }
const DEFAULT_QUESTIONS = [
  {
    q: '¿Cuál NO es un plato típico de Guayaquil?',
    options: [
      { t: 'Encebollado', img: 'encebollado.jpeg' },
      { t: 'Bolón de verde', img: 'bolonverde.jpg' },
      { t: 'Cangrejo criollo', img: 'cangrejo.jpg' },
      { t: 'Fritada', img: 'fritada.jpg' },
    ],
    correct: 'Fritada',
    explain: 'La fritada es ecuatoriana, pero se asocia principalmente con la región Sierra.',
  },
  {
    q: '¿Cuántas estrellas tiene la bandera de Guayaquil?',
    options: [
      { t: '2', stars: 2 },
      { t: '3', stars: 3 },
      { t: '4', stars: 4 },
      { t: '5', stars: 5 },
    ],
    correct: '3',
    explain: 'La bandera de Guayaquil tiene 3 estrellas, que representan los tres primeros cantones de la provincia.',
  },
  {
    q: '¿Quién NO nació en Guayaquil?',
    options: [
      { t: 'Julio Jaramillo', img: 'julioJaramillo.jpg' },
      { t: 'José Joaquín de Olmedo', img: 'olmedo.jpg' },
      { t: 'Eloy Alfaro', img: 'eloyalfaro.jpg' },
      { t: 'Carlos Rubira Infante', img: 'carlosrubirainfante.jpg' },
    ],
    correct: 'Eloy Alfaro',
    explain: 'Eloy Alfaro nació en Montecristi, Manabí.',
  },
  {
    q: '¿En qué año se fundó Guayaquil?',
    options: [
      { t: '1534' },
      { t: '1535' },
      { t: '1538' },
      { t: '1820' },
    ],
    correct: '1535',
    explain: 'Fue en 1535, concretamente el 25 de julio de 1535. La fundación fue un proceso con varios asentamientos, por eso a veces también aparece 1538 en algunas fuentes.',
  },
  {
    q: '¿Qué presidente NO nació en Guayaquil?',
    options: [
      { t: 'Jaime Roldós', img: 'roldos.jpg' },
      { t: 'Carlos Julio Arosemena Monroy', img: 'arosemena-monroy.jpg' },
      { t: 'Carlos Julio Arosemena Tola', img: 'arosemena-tola.jpg' },
      { t: 'Daniel Noboa', img: 'danielnoboa.jpg' },
    ],
    correct: 'Daniel Noboa',
    explain: 'Daniel Noboa no nació en Guayaquil; los otros tres presidentes sí son guayaquileños.',
  },
];

// Imagen de una opción (foto o fila de estrellas)
function OptionMedia({ opt, size = 76 }) {
  const B = import.meta.env.BASE_URL;
  if (opt.stars) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        {Array.from({ length: opt.stars }).map((_, i) => (
          <img key={i} src={`${B}fotosjuego/estrellas.jpg`} alt="" onError={(e) => { e.target.style.display = 'none'; }}
            style={{ height: size * 0.62, width: size * 0.62, objectFit: 'cover', borderRadius: 10, border: '2px solid rgba(255,255,255,0.6)' }} />
        ))}
      </div>
    );
  }
  if (!opt.img) return null;
  return (
    <img src={`${B}fotosjuego/${opt.img}`} alt="" onError={(e) => { e.target.style.display = 'none'; }}
      style={{ height: size, width: size, objectFit: 'cover', objectPosition: 'top', borderRadius: 12, border: '2px solid rgba(255,255,255,0.65)', boxShadow: '0 4px 10px rgba(0,0,0,0.3)', flexShrink: 0 }} />
  );
}

// Mismo color para los 3 jurados (el rojo/verde confundía: parecía correcto/incorrecto).
// El resultado se distingue con ✅/❌ y el dorado del ganador.
const JUROR_COLORS = ['#083D77', '#083D77', '#083D77'];

function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}

// Juan Pueblo (la mascota). Carga la imagen real desde /juan-pueblo.png;
// si aún no está subida, cae a un emoji para no romper.
function JuanPueblo({ size = 130 }) {
  const [ok, setOk] = useState(true);
  const src = `${import.meta.env.BASE_URL}juan-pueblo.png`;
  if (!ok) return <div style={{ fontSize: size * 0.5, animation: 'gyeWave 2.5s ease-in-out infinite' }}>🙋‍♂️</div>;
  return <img src={src} alt="Juan Pueblo" onError={() => setOk(false)}
    style={{ height: size, width: 'auto', filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.35))', animation: 'gyeWave 2.6s ease-in-out infinite', transformOrigin: 'bottom center' }} />;
}

// Peluche premio. Carga /peluche.png; si no está, emoji.
function Peluche({ size = 90 }) {
  const [ok, setOk] = useState(true);
  const src = `${import.meta.env.BASE_URL}peluche.png`;
  if (!ok) return <div style={{ fontSize: size * 0.6, animation: 'gyeWave 2.2s ease-in-out infinite' }}>🧸🍲</div>;
  return <img src={src} alt="Peluche" onError={() => setOk(false)}
    style={{ height: size, width: 'auto', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.3))', animation: 'gyeWave 2.2s ease-in-out infinite' }} />;
}

// Decoración con una MEZCLA de GIFs guayaquileños en las esquinas
// (Barcelona, Emelec, Guayaquil 3, ceviche, bolón, baile).
function GifDecor() {
  const B = import.meta.env.BASE_URL;
  const items = [
    { g: 'barcelona.gif',            s: { top: 10, left: 12, width: 135 } },
    { g: 'emelec.gif',               s: { top: 150, left: 16, width: 120 } },
    { g: 'baile-guayaquil.gif',      s: { bottom: 12, left: 14, width: 135 } },
    { g: 'guayaquil3.gif',           s: { top: 12, right: 12, width: 140 } },
    { g: 'ceviche.gif',              s: { bottom: 150, right: 16, width: 115 } },
    { g: 'bolon-bolon-de-verde.gif', s: { bottom: 14, right: 16, width: 120 } },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {items.map((it, i) => (
        <img key={i} src={`${B}${it.g}`} alt="" onError={(e) => { e.target.style.display = 'none'; }}
          style={{ position: 'absolute', borderRadius: 16, boxShadow: '0 8px 20px rgba(0,0,0,0.28)', border: '3px solid rgba(255,255,255,0.35)',
            opacity: 0.92, animation: `gyeSway ${3 + i * 0.6}s ease-in-out infinite`, ...it.s }} />
      ))}
    </div>
  );
}

export default function Guayaquil() {
  const [phase, setPhase]   = useState('setup'); // setup | countdown | question | reveal | final
  const [jurors, setJurors] = useState(['Jurado 1', 'Jurado 2', 'Jurado 3']);
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [qIndex, setQIndex] = useState(0);
  const [orders, setOrders] = useState([[], [], []]); // opciones barajadas por jurado
  const [answers, setAnswers] = useState([null, null, null]); // {text, ms} por jurado
  const [scores, setScores] = useState([{ wins: 0, ms: 0 }, { wins: 0, ms: 0 }, { wins: 0, ms: 0 }]);
  const [count, setCount]   = useState(3);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const startRef = useRef(0);
  const revealedRef = useRef(false);

  // Cargar config guardada
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE) || 'null');
      if (s?.jurors) setJurors(s.jurors);
      if (s?.questions?.length) setQuestions(s.questions);
    } catch { /* noop */ }
  }, []);
  const saveConfig = (j, qs) => { try { localStorage.setItem(STORAGE, JSON.stringify({ jurors: j, questions: qs })); } catch { /* noop */ } };

  // Precargar TODAS las fotos al abrir la página (quedan en caché y salen al instante con la pregunta)
  useEffect(() => {
    const B = import.meta.env.BASE_URL;
    const srcs = new Set([`${B}fotosjuego/estrellas.jpg`]);
    for (const q of questions) for (const o of q.options) if (o.img) srcs.add(`${B}fotosjuego/${o.img}`);
    srcs.forEach((s) => { const im = new Image(); im.src = s; });
  }, [questions]);

  const question = questions[qIndex];

  // Cuenta regresiva de 7s antes de cada pregunta (tiempo para LEERLA en voz alta)
  useEffect(() => {
    if (phase !== 'countdown') return;
    setCount(COUNTDOWN_SECONDS);
    const iv = setInterval(() => setCount((c) => c - 1), 1000);
    const to = setTimeout(() => { clearInterval(iv); beginQuestion(); }, COUNTDOWN_SECONDS * 1000);
    return () => { clearInterval(iv); clearTimeout(to); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIndex]);

  function beginQuestion() {
    setOrders([shuffle(question.options), shuffle(question.options), shuffle(question.options)]);
    setAnswers([null, null, null]);
    revealedRef.current = false;
    startRef.current = Date.now();
    setTimeLeft(ROUND_SECONDS);
    setPhase('question');
  }

  // Cronómetro de la ronda
  useEffect(() => {
    if (phase !== 'question') return;
    const iv = setInterval(() => {
      const left = Math.max(0, ROUND_SECONDS - (Date.now() - startRef.current) / 1000);
      setTimeLeft(left);
      if (left <= 0) doReveal();
    }, 80);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const pick = (jurorIdx, text) => {
    setAnswers((prev) => {
      if (prev[jurorIdx]) return prev; // ya respondió
      const next = prev.slice();
      next[jurorIdx] = { text, ms: Date.now() - startRef.current };
      // ¿todos respondieron? → revelar
      if (next.every(Boolean)) setTimeout(doReveal, 350);
      return next;
    });
  };

  function doReveal() {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setPhase('reveal');
  }

  // Ganador de la ronda: acertó y fue el más rápido
  const roundResult = useMemo(() => {
    if (phase !== 'reveal' && phase !== 'final') return null;
    const correct = answers
      .map((a, i) => ({ i, a }))
      .filter((x) => x.a && x.a.text === question.correct)
      .sort((a, b) => a.a.ms - b.a.ms);
    return { winner: correct.length ? correct[0].i : null };
  }, [phase, answers, question]);

  const nextQuestion = () => {
    // sumar puntaje de esta ronda
    setScores((prev) => {
      const next = prev.map((s) => ({ ...s }));
      answers.forEach((a, i) => { if (a) next[i].ms += a.ms; });
      if (roundResult?.winner != null) next[roundResult.winner].wins += 1;
      return next;
    });
    if (qIndex + 1 < questions.length) { setQIndex(qIndex + 1); setPhase('countdown'); }
    else setPhase('final');
  };

  const finalRanking = useMemo(() => {
    return jurors.map((name, i) => ({ name, i, ...scores[i] }))
      .sort((a, b) => b.wins - a.wins || a.ms - b.ms);
  }, [jurors, scores]);

  const restart = () => {
    setScores([{ wins: 0, ms: 0 }, { wins: 0, ms: 0 }, { wins: 0, ms: 0 }]);
    setQIndex(0); setAnswers([null, null, null]); setPhase('setup');
  };

  // ── Estilos base de pantalla ──
  const screen = {
    position: 'fixed', inset: 0, zIndex: 200000,
    // Sin scroll durante el juego (confunde en la tablet); solo el setup puede scrollear
    overflow: (phase === 'setup' || phase === 'final') ? 'auto' : 'hidden',
    background: `linear-gradient(160deg, ${C.celeste} 0%, ${C.celesteDark} 55%, ${C.azul} 100%)`,
    color: 'white', fontFamily: "'Inter', system-ui, sans-serif", userSelect: 'none', WebkitUserSelect: 'none',
    touchAction: 'manipulation',
  };

  return (
    <div style={screen}>
      <style>{`
        @keyframes gyeFly { from { transform: translateX(0) translateY(0);} 50%{ transform: translateX(55vw) translateY(-18px);} to { transform: translateX(116vw) translateY(0);} }
        @keyframes gyePop { 0%{ transform: scale(0.6); opacity:0;} 60%{ transform: scale(1.15);} 100%{ transform: scale(1); opacity:1;} }
        @keyframes gyePulse { 0%,100%{ transform: scale(1);} 50%{ transform: scale(1.06);} }
        @keyframes gyeWave { 0%,100%{ transform: rotate(-6deg);} 50%{ transform: rotate(8deg);} }
        @keyframes gyeBounce { 0%,100%{ transform: translateY(0) rotate(-2deg);} 50%{ transform: translateY(-22px) rotate(3deg);} }
        @keyframes gyeSway { 0%,100%{ transform: translateY(0) scale(1);} 50%{ transform: translateY(-10px) scale(1.03);} }
        @keyframes gyeConfetti { to { transform: translateY(105vh) rotate(540deg); } }
        .gye-btn { transition: transform .08s ease, box-shadow .12s ease; }
        .gye-btn:active { transform: scale(0.97); }
      `}</style>
      <GifDecor />

      {/* Franja decorativa (bandera celeste-blanco-celeste) arriba */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: `linear-gradient(90deg, ${C.celeste} 0 33%, #fff 33% 66%, ${C.celeste} 66% 100%)`, zIndex: 1 }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1500, margin: '0 auto',
        padding: phase === 'question' ? '14px 14px 12px' : (phase === 'countdown' || phase === 'reveal') ? '16px 20px 16px' : '28px 20px 40px',
        height: (phase === 'question' || phase === 'countdown' || phase === 'reveal') ? '100vh' : 'auto',
        minHeight: (phase === 'question' || phase === 'countdown' || phase === 'reveal') ? 0 : '100vh',
        display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>

        {/* ── SETUP ── */}
        {phase === 'setup' && (
          <SetupScreen jurors={jurors} setJurors={setJurors} questions={questions} setQuestions={setQuestions}
            onStart={() => { saveConfig(jurors, questions); setQIndex(0); setPhase('countdown'); }} saveConfig={saveConfig} />
        )}

        {/* ── COUNTDOWN ── */}
        {phase === 'countdown' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 800, opacity: 0.9 }}>Pregunta {qIndex + 1} de {questions.length}</p>
            <h2 style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.2, maxWidth: 900, margin: '10px auto 6px', textShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
              🎙️ {question.q}
            </h2>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.oro }}>El presentador lee la pregunta en voz alta…</p>
            <div key={count} style={{ fontSize: 120, fontWeight: 900, animation: 'gyePop 0.6s ease', textShadow: '0 8px 30px rgba(0,0,0,0.3)', lineHeight: 1.1 }}>
              {count > 0 ? count : '¡YA!'}
            </div>
            <p style={{ fontSize: 20 }}>🦜 ¡Prepárense jurados! 🦜</p>
          </div>
        )}

        {/* ── QUESTION (multitouch) ── */}
        {phase === 'question' && (
          <QuestionScreen question={question} qIndex={qIndex} total={questions.length}
            jurors={jurors} orders={orders} answers={answers} timeLeft={timeLeft} onPick={pick} />
        )}

        {/* ── REVEAL de la ronda ── */}
        {phase === 'reveal' && (
          <RevealScreen question={question} jurors={jurors} answers={answers} winner={roundResult?.winner}
            isLast={qIndex + 1 >= questions.length} onNext={nextQuestion} />
        )}

        {/* ── FINAL ── */}
        {phase === 'final' && (
          <FinalScreen ranking={finalRanking} onRestart={restart} />
        )}
      </div>
    </div>
  );
}

// ── Pantalla de configuración ────────────────────────────────────────────────
function SetupScreen({ jurors, setJurors, questions, setQuestions, onStart, saveConfig }) {
  const [showQ, setShowQ] = useState(false);
  const setJ = (i, v) => { const n = jurors.slice(); n[i] = v; setJurors(n); };
  const setQField = (qi, field, v) => {
    const n = questions.map((q) => ({ ...q, options: q.options.map((o) => ({ ...o })) }));
    if (field === 'q') n[qi].q = v;
    else if (field === 'explain') n[qi].explain = v;
    else if (field.startsWith('opt')) { const oi = +field.slice(3); const old = n[qi].options[oi].t; n[qi].options[oi].t = v; if (n[qi].correct === old) n[qi].correct = v; }
    else if (field === 'correct') n[qi].correct = v;
    setQuestions(n);
  };
  const addQ = () => setQuestions([...questions, { q: 'Nueva pregunta', options: [{ t: 'Opción A' }, { t: 'Opción B' }, { t: 'Opción C' }, { t: 'Opción D' }], correct: 'Opción A', explain: '' }]);
  const delQ = (qi) => setQuestions(questions.filter((_, i) => i !== qi));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <JuanPueblo size={150} />
      <h1 style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.05, textShadow: '0 6px 20px rgba(0,0,0,0.25)', marginTop: 6 }}>El Reto del Jurado</h1>
      <p style={{ fontSize: 18, fontWeight: 700, color: C.oro }}>🎉 Fiestas de Guayaquil 🦜</p>
      <p style={{ opacity: 0.9, marginTop: 6, maxWidth: 520 }}>Los 3 jurados responden a la vez en la tablet. Gana quien acierte y sea el más rápido. ¡Toquen todos al mismo tiempo!</p>

      {/* Nombres de jurados */}
      <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap', justifyContent: 'center' }}>
        {jurors.map((j, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.14)', border: `2px solid ${JUROR_COLORS[i]}`, borderRadius: 16, padding: '10px 14px' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: JUROR_COLORS[i], marginBottom: 4 }}>JURADO {i + 1}</p>
            <input value={j} onChange={(e) => setJ(i, e.target.value)}
              style={{ background: 'rgba(255,255,255,0.9)', color: '#083D77', border: 'none', borderRadius: 8, padding: '6px 10px', fontWeight: 800, textAlign: 'center', width: 140 }} />
          </div>
        ))}
      </div>

      <button onClick={() => setShowQ((s) => !s)}
        style={{ marginTop: 18, background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 20, padding: '8px 18px', fontWeight: 700, fontSize: 13 }}>
        {showQ ? 'Ocultar preguntas ▲' : `✏️ Editar preguntas (${questions.length}) ▼`}
      </button>

      {showQ && (
        <div style={{ marginTop: 14, width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {questions.map((q, qi) => (
            <div key={qi} style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 14, padding: 14, textAlign: 'left' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 900, color: C.oro }}>#{qi + 1}</span>
                <input value={q.q} onChange={(e) => setQField(qi, 'q', e.target.value)}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.95)', color: '#083D77', border: 'none', borderRadius: 8, padding: '7px 10px', fontWeight: 700 }} />
                {questions.length > 1 && <button onClick={() => delQ(qi)} style={{ color: '#ffb4b4', fontWeight: 900, fontSize: 18 }}>×</button>}
              </div>
              {q.options.map((o, oi) => (
                <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <button onClick={() => setQField(qi, 'correct', o.t)} title="Marcar como correcta"
                    style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: q.correct === o.t ? C.oro : 'rgba(255,255,255,0.2)', color: q.correct === o.t ? '#083D77' : 'white', fontWeight: 900 }}>
                    {q.correct === o.t ? '✓' : ''}
                  </button>
                  <input value={o.t} onChange={(e) => setQField(qi, `opt${oi}`, e.target.value)}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.9)', color: '#083D77', border: 'none', borderRadius: 8, padding: '6px 10px', fontWeight: 600 }} />
                </div>
              ))}
              <input value={q.explain || ''} onChange={(e) => setQField(qi, 'explain', e.target.value)} placeholder="Explicación de la respuesta (la lee el expositor)"
                style={{ width: '100%', background: 'rgba(255,255,255,0.75)', color: '#083D77', border: 'none', borderRadius: 8, padding: '6px 10px', fontWeight: 600, fontSize: 12, marginTop: 2 }} />
              <p style={{ fontSize: 10.5, opacity: 0.75, marginTop: 4 }}>Toca el círculo para marcar la respuesta correcta.</p>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={addQ} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 12, padding: '8px 16px', fontWeight: 700 }}>+ Agregar pregunta</button>
            <button onClick={() => saveConfig(jurors, questions)} style={{ background: C.oro, color: '#083D77', borderRadius: 12, padding: '8px 16px', fontWeight: 800 }}>Guardar</button>
          </div>
        </div>
      )}

      <button onClick={onStart} className="gye-btn"
        style={{ marginTop: 26, background: C.oro, color: '#083D77', border: 'none', borderRadius: 999, padding: '16px 48px', fontWeight: 900, fontSize: 22, boxShadow: '0 10px 30px rgba(0,0,0,0.3)', animation: 'gyePulse 1.8s ease-in-out infinite' }}>
        ▶ COMENZAR
      </button>
    </div>
  );
}

// ── Pantalla de pregunta (3 columnas, multitouch) ────────────────────────────
function QuestionScreen({ question, qIndex, total, jurors, orders, answers, timeLeft, onPick }) {
  const pct = (timeLeft / ROUND_SECONDS) * 100;
  const urgent = timeLeft <= 5;
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Cabecera compacta: la pregunta se LEE en voz alta → letra pequeña, foco en botones */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', opacity: 0.8 }}>PREGUNTA {qIndex + 1}/{total}</span>
        <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.85, maxWidth: 560, lineHeight: 1.15, textAlign: 'center' }}>🎙️ {question.q}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 180, height: 10, background: 'rgba(255,255,255,0.25)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: urgent ? '#E4002B' : C.oro, transition: 'width .1s linear' }} />
          </div>
          <span style={{ fontSize: 24, fontWeight: 900, color: urgent ? '#ffd0d0' : 'white', minWidth: 44 }}>{Math.ceil(timeLeft)}s</span>
        </div>
      </div>

      {/* 3 columnas de jurados a pantalla completa */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {jurors.map((name, ji) => {
          const answered = answers[ji];
          return (
            <div key={ji} style={{ background: 'rgba(255,255,255,0.1)', border: `3px solid ${JUROR_COLORS[ji]}`, borderRadius: 18, padding: 10, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ textAlign: 'center', marginBottom: 8, flexShrink: 0 }}>
                <span style={{ display: 'inline-block', background: JUROR_COLORS[ji], color: 'white', fontWeight: 900, fontSize: 14, padding: '3px 16px', borderRadius: 999 }}>
                  {name} {answered ? `· ✔ ${(answered.ms / 1000).toFixed(2)}s` : ''}
                </span>
              </div>
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {orders[ji].map((opt, oi) => {
                  const chosen = answered?.text === opt.t;
                  const letter = String.fromCharCode(65 + oi);
                  return (
                    <button key={oi} className="gye-btn"
                      onPointerDown={() => onPick(ji, opt.t)}
                      disabled={!!answered}
                      style={{
                        flex: 1, minHeight: 0,
                        display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                        padding: '8px 14px', borderRadius: 16, fontWeight: 900, fontSize: 22, lineHeight: 1.1,
                        background: chosen ? JUROR_COLORS[ji] : '#ffffff',
                        color: chosen ? 'white' : '#083D77',
                        border: chosen ? '4px solid #fff' : `3px solid ${JUROR_COLORS[ji]}`,
                        opacity: answered && !chosen ? 0.3 : 1,
                        boxShadow: '0 6px 16px rgba(0,0,0,0.22)', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
                      }}>
                      <span style={{ flexShrink: 0, width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: chosen ? 'rgba(255,255,255,0.3)' : JUROR_COLORS[ji], color: '#fff', fontSize: 18, fontWeight: 900 }}>{letter}</span>
                      <OptionMedia opt={opt} size={Math.min(96, window.innerHeight / 9)} />
                      <span style={{ flex: 1 }}>{opt.t}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Reveal de la ronda ───────────────────────────────────────────────────────
function RevealScreen({ question, jurors, answers, winner, isLast, onNext }) {
  const correctOpt = question.options.find((o) => o.t === question.correct) || { t: question.correct };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      {/* Respuesta correcta con foto + explicación (el expositor la LEE antes de continuar) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: C.oro, color: '#083D77', borderRadius: 18, padding: '12px 24px', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', animation: 'gyePop 0.5s ease' }}>
        <OptionMedia opt={correctOpt} size={86} />
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: 12, fontWeight: 800, opacity: 0.75, letterSpacing: '0.05em' }}>RESPUESTA CORRECTA</p>
          <p style={{ fontWeight: 900, fontSize: 26, lineHeight: 1.1 }}>✓ {question.correct}</p>
        </div>
      </div>
      {question.explain && (
        <div style={{ maxWidth: 760, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 14, padding: '10px 20px', margin: '12px 0 4px' }}>
          <p style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35 }}>📢 {question.explain}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, width: '100%', maxWidth: 960, marginTop: 14 }}>
        {jurors.map((name, ji) => {
          const a = answers[ji];
          const ok = a && a.text === question.correct;
          const isWin = winner === ji;
          return (
            <div key={ji} style={{ overflow: 'hidden', borderRadius: 20, border: `4px solid ${isWin ? C.oro : JUROR_COLORS[ji]}`, background: isWin ? 'rgba(255,197,51,0.18)' : 'rgba(255,255,255,0.1)', boxShadow: isWin ? '0 0 30px rgba(255,197,51,0.5)' : 'none' }}>
              {/* Cabecera con el nombre */}
              <div style={{ background: isWin ? C.oro : JUROR_COLORS[ji], color: isWin ? '#083D77' : '#fff', padding: '8px', fontWeight: 900, fontSize: 17 }}>
                {isWin && '👑 '}{name}
              </div>
              {/* Cuerpo: resultado */}
              <div style={{ padding: '12px 12px', textAlign: 'center' }}>
                <p style={{ fontSize: 42, margin: 0, lineHeight: 1 }}>{ok ? '✅' : a ? '❌' : '⌛'}</p>
                <p style={{ fontSize: 14, opacity: 0.9, marginTop: 6 }}>{a ? `Respondió "${a.text}"` : 'No respondió'}</p>
                {a && <p style={{ fontSize: 20, fontWeight: 900, color: ok ? '#c9ffdf' : '#ffd0d0', marginTop: 2 }}>⏱ {(a.ms / 1000).toFixed(2)}s</p>}
              </div>
              {/* Franja ganador (abajo, sin encimar nada) */}
              {isWin && <div style={{ background: C.oro, color: '#083D77', fontWeight: 900, fontSize: 13, padding: '6px', letterSpacing: '0.03em' }}>🏆 GANÓ LA RONDA</div>}
            </div>
          );
        })}
      </div>

      <button onClick={onNext} className="gye-btn"
        style={{ marginTop: 20, background: C.oro, color: '#083D77', border: 'none', borderRadius: 999, padding: '15px 44px', fontWeight: 900, fontSize: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
        {isLast ? '🏁 Ver ganador' : 'Siguiente pregunta ▶'}
      </button>
    </div>
  );
}

// ── Pantalla final ───────────────────────────────────────────────────────────
function FinalScreen({ ranking, onRestart }) {
  const champ = ranking[0];
  const confetti = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.8, dur: 2 + Math.random() * 2, e: ['🎉', '🎊', '⭐', '🦜', '🏆'][i % 5],
  })), []);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', position: 'relative' }}>
      {confetti.map((c, i) => (
        <span key={i} style={{ position: 'fixed', top: -30, left: `${c.left}%`, fontSize: 26, animation: `gyeConfetti ${c.dur}s ${c.delay}s ease-in forwards` }}>{c.e}</span>
      ))}
      <p style={{ fontSize: 20, fontWeight: 800 }}>🏆 ¡Tenemos ganador! 🏆</p>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, margin: '6px 0' }}>
        <JuanPueblo size={120} />
        <div style={{ fontSize: 56, animation: 'gyePop 0.6s ease' }}>👑</div>
      </div>
      <h1 style={{ fontSize: 46, fontWeight: 900, color: C.oro, textShadow: '0 6px 20px rgba(0,0,0,0.3)' }}>{champ.name}</h1>
      <p style={{ opacity: 0.9 }}>{champ.wins} ronda{champ.wins === 1 ? '' : 's'} ganada{champ.wins === 1 ? '' : 's'} · {(champ.ms / 1000).toFixed(2)}s en total</p>

      {/* Premio */}
      <div style={{ marginTop: 18, background: 'rgba(255,255,255,0.14)', border: `2px solid ${C.oro}`, borderRadius: 20, padding: '16px 26px' }}>
        <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', opacity: 0.85 }}>PREMIO</p>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}><Peluche size={110} /></div>
        <p style={{ fontWeight: 900, fontSize: 18 }}>¡Peluche de encebollado! 🍲</p>
      </div>

      {/* Tabla completa */}
      <div style={{ marginTop: 22, width: '100%', maxWidth: 460 }}>
        {ranking.map((r, i) => (
          <div key={r.i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: i === 0 ? 'rgba(255,197,51,0.18)' : 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 14px', marginBottom: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 900, width: 30 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
            <span style={{ flex: 1, textAlign: 'left', fontWeight: 800 }}>{r.name}</span>
            <span style={{ fontWeight: 900, color: C.oro }}>{r.wins} pts</span>
            <span style={{ opacity: 0.7, fontSize: 13, minWidth: 64, textAlign: 'right' }}>{(r.ms / 1000).toFixed(2)}s</span>
          </div>
        ))}
      </div>

      <button onClick={onRestart} className="gye-btn"
        style={{ marginTop: 22, background: 'rgba(255,255,255,0.16)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 999, padding: '13px 36px', fontWeight: 800, fontSize: 16 }}>
        🔄 Jugar de nuevo
      </button>
    </div>
  );
}
