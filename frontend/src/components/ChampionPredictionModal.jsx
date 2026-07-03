import React, { useState, useEffect } from 'react';
import { Trophy, Minus, Plus, CheckCircle, AlertTriangle, ChevronLeft, Gift } from 'lucide-react';

// Bandera pequeña reutilizable
function Flag({ code, size = 34 }) {
  const h = Math.round(size * 0.75);
  if (!code) return (
    <div style={{ width: size, height: h, borderRadius: 3, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: size * 0.5 }}>🏳️</span>
    </div>
  );
  return (
    <img src={`https://flagcdn.com/${size}x${h}/${code.toLowerCase()}.png`} alt=""
      style={{ width: size, height: h, borderRadius: 3, objectFit: 'cover', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
      onError={(e) => { e.target.style.display = 'none'; }} />
  );
}

// Grilla de selección de equipo
function TeamGrid({ teams, selected, onPick, disabledTeam }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8, maxHeight: '46vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 2 }}>
      {teams.map(({ team, code }) => {
        const isSel = selected === team;
        const isDisabled = disabledTeam === team;
        return (
          <button key={team} disabled={isDisabled}
            onClick={() => onPick(team, code)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 4px',
              borderRadius: 12, cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.28 : 1,
              background: isSel ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.04)',
              border: isSel ? '2px solid #F59E0B' : '1px solid rgba(255,255,255,0.1)',
              transition: 'all 0.12s', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
            }}>
            <Flag code={code} size={40} />
            <span style={{ color: isSel ? '#FCD34D' : 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 700, textAlign: 'center', lineHeight: 1.1 }}>{team}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function ChampionPredictionModal({ aliveTeams = [], onSave }) {
  const [step, setStep]         = useState('intro'); // intro | champion | runner | score | confirm
  const [champion, setChampion] = useState(null);
  const [champCode, setChampCode] = useState(null);
  const [runner, setRunner]     = useState(null);
  const [runnerCode, setRunnerCode] = useState(null);
  const [champScore, setChampScore] = useState(1);
  const [runnerScore, setRunnerScore] = useState(0);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const isDraw = champScore === runnerScore;

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await onSave({
        champion, champion_code: champCode,
        runner_up: runner, runner_up_code: runnerCode,
        champ_score: champScore, runner_score: runnerScore,
      });
      // el hook actualiza `prediction` → el modal desaparece solo
    } catch (e) {
      setError(e?.message || 'No se pudo guardar. Intenta de nuevo.');
      setSaving(false);
    }
  };

  const Header = ({ title, sub, onBack }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      {onBack && (
        <button onClick={onBack} style={{ color: 'rgba(255,255,255,0.6)', padding: 4 }}><ChevronLeft size={22} /></button>
      )}
      <div>
        <h2 style={{ color: 'white', fontWeight: 900, fontSize: 18, lineHeight: 1.1 }}>{title}</h2>
        {sub && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200000, background: 'rgba(3,1,15,0.92)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
      <div style={{ width: 460, maxWidth: '96vw', maxHeight: '94vh', display: 'flex', flexDirection: 'column', borderRadius: 22, overflow: 'hidden', background: 'linear-gradient(165deg,#141033,#0a1226)', border: '2px solid rgba(245,158,11,0.45)', boxShadow: '0 24px 70px rgba(0,0,0,0.75)' }}>

        {/* Banda superior dorada */}
        <div style={{ background: 'linear-gradient(90deg,#F59E0B,#FCD34D,#F59E0B)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trophy size={18} style={{ color: '#3a2600' }} />
          <span style={{ color: '#3a2600', fontWeight: 900, fontSize: 13, letterSpacing: '0.03em' }}>PRONÓSTICO CAMPEÓN DEL MUNDIAL 2026</span>
        </div>

        <div style={{ padding: 18, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

          {/* ── Intro ── */}
          {step === 'intro' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 54, marginBottom: 6 }}>🏆</div>
              <h2 style={{ color: 'white', fontWeight: 900, fontSize: 21 }}>¿Quién levantará la Copa?</h2>
              <div style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 14, padding: '12px 14px', margin: '16px 0', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
                <Gift size={26} style={{ color: '#34d399', flexShrink: 0 }} />
                <p style={{ color: '#a7f3d0', fontSize: 13, fontWeight: 600 }}>Acierta el <b>campeón</b> y llévate una <b>Gift Card de $50</b> 🎁</p>
              </div>
              <div style={{ textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontSize: 12.5, lineHeight: 1.6, marginBottom: 8 }}>
                Vas a elegir:
                <ul style={{ marginTop: 6, paddingLeft: 4, listStyle: 'none' }}>
                  <li>🥇 <b style={{ color: 'white' }}>Campeón</b> del Mundial</li>
                  <li>🥈 <b style={{ color: 'white' }}>Subcampeón</b></li>
                  <li>⚽ <b style={{ color: 'white' }}>Marcador exacto</b> de la final (120 min)</li>
                </ul>
                <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 10, padding: '9px 11px', marginTop: 10 }}>
                  <p style={{ color: '#bfdbfe', fontSize: 11.5, lineHeight: 1.45 }}>
                    💡 El premio lo gana quien acierte el <b>campeón</b>. El <b>subcampeón</b> y el <b>marcador</b> solo se usan como <b>desempate</b>: si varias personas aciertan el mismo campeón, gana quien también acierte el subcampeón y, si sigue el empate, el marcador exacto de la final.
                  </p>
                </div>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-start', textAlign: 'left', marginBottom: 4 }}>
                <AlertTriangle size={15} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
                <p style={{ color: 'rgba(255,180,180,0.95)', fontSize: 11.5, lineHeight: 1.4 }}>
                  Solo aparecen los equipos que <b>siguen con vida</b>. Una vez guardado <b>no podrás cambiarlo</b>.
                </p>
              </div>
              <button onClick={() => setStep('champion')}
                style={{ width: '100%', marginTop: 16, padding: '14px', borderRadius: 14, fontWeight: 900, fontSize: 15, background: 'linear-gradient(90deg,#F59E0B,#FCD34D)', color: '#3a2600', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
                Empezar →
              </button>
            </div>
          )}

          {/* ── Campeón ── */}
          {step === 'champion' && (
            <>
              <Header title="🥇 Elige al Campeón" sub={`${aliveTeams.length} equipos siguen con vida`} />
              <TeamGrid teams={aliveTeams} selected={champion}
                onPick={(t, c) => { setChampion(t); setChampCode(c); if (runner === t) { setRunner(null); setRunnerCode(null); } setStep('runner'); }} />
            </>
          )}

          {/* ── Subcampeón ── */}
          {step === 'runner' && (
            <>
              <Header title="🥈 Elige al Subcampeón" sub="El finalista que perderá la final" onBack={() => setStep('champion')} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Campeón:</span>
                <Flag code={champCode} size={24} />
                <b style={{ color: '#FCD34D', fontSize: 13 }}>{champion}</b>
              </div>
              <TeamGrid teams={aliveTeams} selected={runner} disabledTeam={champion}
                onPick={(t, c) => { setRunner(t); setRunnerCode(c); setStep('score'); }} />
            </>
          )}

          {/* ── Marcador ── */}
          {step === 'score' && (
            <>
              <Header title="⚽ Marcador de la Final" sub="Resultado dentro de los 120 minutos" onBack={() => setStep('runner')} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around', gap: 8, margin: '10px 0 4px' }}>
                {[{ label: champion, code: champCode, val: champScore, set: setChampScore, medal: '🥇' },
                  { label: runner, code: runnerCode, val: runnerScore, set: setRunnerScore, medal: '🥈' }].map((s, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Flag code={s.code} size={46} />
                    <span style={{ color: 'white', fontSize: 12, fontWeight: 800, textAlign: 'center', lineHeight: 1.1 }}>{s.medal} {s.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button onClick={() => s.set(Math.max(0, s.val - 1))} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}><Minus size={16} /></button>
                      <span style={{ color: 'white', fontSize: 30, fontWeight: 900, minWidth: 30, textAlign: 'center' }}>{s.val}</span>
                      <button onClick={() => s.set(Math.min(20, s.val + 1))} style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'manipulation' }}><Plus size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.22)', borderRadius: 12, padding: '10px 12px', margin: '14px 0 8px' }}>
                <p style={{ color: '#93c5fd', fontSize: 12.5, fontWeight: 700, textAlign: 'center' }}>
                  ⏱ Marcador dentro de los <b>120 minutos</b> (incluye tiempo suplementario)
                </p>
                {isDraw && (
                  <p style={{ color: '#FCD34D', fontSize: 12, textAlign: 'center', marginTop: 6, fontWeight: 700 }}>
                    🥅 Empate {champScore}–{runnerScore} → <b>{champion} campeón en penales</b>
                  </p>
                )}
              </div>
              <button onClick={() => setStep('confirm')}
                style={{ width: '100%', marginTop: 8, padding: '14px', borderRadius: 14, fontWeight: 900, fontSize: 15, background: 'linear-gradient(90deg,#F59E0B,#FCD34D)', color: '#3a2600', touchAction: 'manipulation' }}>
                Continuar →
              </button>
            </>
          )}

          {/* ── Confirmar ── */}
          {step === 'confirm' && (
            <>
              <Header title="Confirma tu pronóstico" sub="No podrás cambiarlo después" onBack={() => setStep('score')} />
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 16, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 10 }}>
                  <div style={{ textAlign: 'center' }}>
                    <Flag code={champCode} size={52} />
                    <p style={{ color: '#FCD34D', fontWeight: 900, fontSize: 12, marginTop: 4 }}>🥇 {champion}</p>
                  </div>
                  <div style={{ color: 'white', fontWeight: 900, fontSize: 26 }}>{champScore}–{runnerScore}</div>
                  <div style={{ textAlign: 'center' }}>
                    <Flag code={runnerCode} size={52} />
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 800, fontSize: 12, marginTop: 4 }}>🥈 {runner}</p>
                  </div>
                </div>
                {isDraw && (
                  <p style={{ color: '#FCD34D', fontSize: 11.5, textAlign: 'center', fontWeight: 700 }}>Campeón en penales</p>
                )}
              </div>

              {error && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 12px', marginTop: 12 }}>
                  <AlertTriangle size={15} style={{ color: '#f87171' }} />
                  <p style={{ color: '#fca5a5', fontSize: 12 }}>{error}</p>
                </div>
              )}

              <button onClick={handleSave} disabled={saving}
                style={{ width: '100%', marginTop: 16, padding: '15px', borderRadius: 14, fontWeight: 900, fontSize: 15, background: saving ? 'rgba(52,211,153,0.4)' : 'linear-gradient(90deg,#10b981,#34d399)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, touchAction: 'manipulation' }}>
                <CheckCircle size={18} /> {saving ? 'Guardando…' : 'Confirmar pronóstico'}
              </button>
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 10 }}>
                🔒 Este pronóstico es definitivo
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
