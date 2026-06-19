import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { TRIVIA } from '../utils/triviaQuestions';
import { NUM_Q, QUESTION_MS } from '../hooks/useTrivia';

const CONFETTI = ['🎉','⚽','🏆','✨','🥳','🔥','🎊'];

function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    dur: 1.6 + Math.random() * 1.4,
    emoji: CONFETTI[i % CONFETTI.length],
  })), []);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {pieces.map((p, i) => (
        <span key={i} style={{ position: 'absolute', top: -20, left: `${p.left}%`, fontSize: 22,
          animation: `confettiFall ${p.dur}s ${p.delay}s ease-in infinite` }}>{p.emoji}</span>
      ))}
    </div>
  );
}

export default function TriviaGame({ match, currentUser, onClose }) {
  const amSender = match.from_user_id === currentUser.id;
  const myField  = amSender ? 'from_answers' : 'to_answers';
  const start    = new Date(match.start_at).getTime();
  const qids     = match.questions || [];

  const [nowTs, setNowTs] = useState(Date.now());
  const [answers, setAnswers] = useState({});   // { qPos: optionIndex }
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState(null);   // { mine, opp, win, oppName, record }
  const answeredRef = useRef({});

  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  const elapsed = nowTs - start;
  const inCountdown = elapsed < 0;
  const qPos = Math.floor(elapsed / QUESTION_MS); // 0..NUM_Q-1, luego >=NUM_Q = fin
  const totalMs = NUM_Q * QUESTION_MS;

  // Guardar respuesta
  const answer = async (opt) => {
    if (answeredRef.current[qPos] !== undefined) return;
    answeredRef.current[qPos] = opt;
    const next = { ...answers, [qPos]: opt };
    setAnswers(next);
    await supabase.from('trivia_matches').update({ [myField]: next }).eq('id', match.id);
  };

  // Fin del juego → calcular resultado
  useEffect(() => {
    if (finished || elapsed < totalMs) return;
    setFinished(true);
    (async () => {
      const { data: m } = await supabase.from('trivia_matches').select('*').eq('id', match.id).single();
      const fa = m?.from_answers || {}, ta = m?.to_answers || {};
      const score = (ans) => qids.reduce((s, qid, pos) => s + (ans[pos] === TRIVIA[qid].answer ? 2 : 0), 0);
      const fromScore = score(fa), toScore = score(ta);
      const mine = amSender ? fromScore : toScore;
      const opp  = amSender ? toScore : fromScore;
      const win  = mine > opp;
      const tie  = mine === opp;
      const oppName = amSender ? (m?.to_username || 'rival') : (m?.from_username || 'rival');

      // Guardar récord (solo el retador inserta, para no duplicar)
      if (amSender) {
        const winnerId = tie ? null : (fromScore > toScore ? m.from_user_id : m.to_user_id);
        await supabase.from('trivia_results').insert({
          match_id: m.id,
          a_user_id: m.from_user_id, a_username: m.from_username, a_score: fromScore,
          b_user_id: m.to_user_id,   b_username: m.to_username,   b_score: toScore,
          winner_user_id: winnerId,
        });
      }
      setResult({ mine, opp, win, tie, oppName });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, totalMs, finished]);

  // ── Render ──
  const Shell = ({ children }) => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100001, background: 'rgba(5,2,20,0.92)', backdropFilter: 'blur(6px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 380, maxWidth: '94vw', background: 'linear-gradient(160deg,#15103a,#0a1530)', border: '2px solid rgba(167,139,250,0.5)',
                    borderRadius: 22, padding: 22, position: 'relative', boxShadow: '0 24px 60px rgba(0,0,0,0.7)' }}>
        {children}
      </div>
    </div>
  );

  if (inCountdown) {
    const secs = Math.ceil(-elapsed / 1000);
    return <Shell>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#a78bfa', fontWeight: 900, fontSize: 14, letterSpacing: '0.1em' }}>⚔️ DUELO DE TRIVIA</p>
        <p className="text-white" style={{ fontSize: 64, fontWeight: 900, margin: '10px 0', animation: 'triviaPulse 1s infinite' }}>{secs}</p>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>¡Prepárate!</p>
      </div>
    </Shell>;
  }

  if (finished) {
    return <Shell>
      {result?.win && <Confetti />}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: 56 }}>{result ? (result.tie ? '🤝' : result.win ? '🏆' : '😢') : '⏳'}</p>
        <p className="text-white" style={{ fontSize: 24, fontWeight: 900 }}>
          {result ? (result.tie ? '¡Empate!' : result.win ? '¡GANASTE!' : 'Perdiste') : 'Calculando…'}
        </p>
        {result && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, margin: '16px 0' }}>
              <div><div style={{ fontSize: 30, fontWeight: 900, color: '#34d399' }}>{result.mine}</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Tú</div></div>
              <div style={{ fontSize: 26, color: 'rgba(255,255,255,0.3)', alignSelf: 'center' }}>–</div>
              <div><div style={{ fontSize: 30, fontWeight: 900, color: '#f87171' }}>{result.opp}</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{result.oppName}</div></div>
            </div>
          </>
        )}
        <button onClick={onClose} className="mt-2 w-full py-3 rounded-2xl font-black"
          style={{ background: 'rgba(167,139,250,0.3)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.5)' }}>
          Cerrar
        </button>
      </div>
    </Shell>;
  }

  // Jugando
  const qid = qids[qPos];
  const q = TRIVIA[qid];
  const tLeft = Math.ceil((QUESTION_MS - (elapsed % QUESTION_MS)) / 1000);
  const myAns = answers[qPos];
  if (!q) return null;

  return <Shell>
    <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700 }}>Pregunta {qPos + 1}/{NUM_Q}</span>
        <span style={{ fontSize: 18, fontWeight: 900, color: tLeft <= 2 ? '#f87171' : '#a78bfa' }}>⏱ {tLeft}s</span>
      </div>
      {/* barra de tiempo */}
      <div style={{ height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ height: '100%', width: `${(1 - (elapsed % QUESTION_MS) / QUESTION_MS) * 100}%`, background: '#a78bfa', transition: 'width 0.2s linear' }} />
      </div>

      {q.type === 'flag' && (
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <img src={`https://flagcdn.com/96x72/${q.code}.png`} alt="bandera" style={{ width: 96, height: 72, borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }} />
        </div>
      )}
      <p className="text-white" style={{ fontSize: 17, fontWeight: 800, textAlign: 'center', marginBottom: 16, lineHeight: 1.25 }}>{q.q}</p>

      <div style={{ display: 'grid', gap: 8 }}>
        {q.options.map((opt, i) => {
          const chosen = myAns === i;
          return (
            <button key={i} onClick={() => answer(i)} disabled={myAns !== undefined}
              style={{ padding: '12px 14px', borderRadius: 12, fontWeight: 700, fontSize: 14, textAlign: 'left',
                       background: chosen ? 'rgba(167,139,250,0.35)' : 'rgba(255,255,255,0.06)',
                       border: `1px solid ${chosen ? 'rgba(167,139,250,0.7)' : 'rgba(255,255,255,0.12)'}`,
                       color: 'white', opacity: myAns !== undefined && !chosen ? 0.5 : 1, transition: 'all 0.15s',
                       touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', userSelect: 'none', cursor: 'pointer' }}>
              {opt}
            </button>
          );
        })}
      </div>
      {myAns !== undefined && (
        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#34d399', fontWeight: 700 }}>✓ Respuesta enviada — espera la siguiente</p>
      )}
    </div>
  </Shell>;
}
