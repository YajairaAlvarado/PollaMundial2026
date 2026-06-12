import React, { useEffect, useState, useMemo } from 'react';
import { Network, Eye, CheckCircle2, TrendingUp } from 'lucide-react';
import api from '../utils/api';
import canchaBg from '../assets/andersen-cancha.jpg';

// ── Dimensiones ───────────────────────────────────────────────────────────────
const CW      = 126;
const CH      = 50;
const ROW_H   = 25;
const SH      = 84;
const TH      = 8 * SH;
const LABEL_H = 40;
const TOTAL_H = TH + LABEL_H;
const G       = 38;
const CG      = 50;

const X = {
  r32L: 0,
  r16L: CW + G,
  qfL:  2*(CW + G),
  sfL:  3*(CW + G),
  fin:  4*(CW + G) - G + CG,
  sfR:  4*(CW + G) - G + CG + CW + CG,
  qfR:  4*(CW + G) - G + CG + CW + CG + CW + G,
  r16R: 4*(CW + G) - G + CG + CW + CG + 2*(CW + G),
  r32R: 4*(CW + G) - G + CG + CW + CG + 3*(CW + G),
};
const TOTAL_W = X.r32R + CW;

const MX = {
  r32r16L:  (X.r32L + CW + X.r16L) / 2,
  r16qfL:   (X.r16L + CW + X.qfL)  / 2,
  qfsfL:    (X.qfL  + CW + X.sfL)  / 2,
  sfqfR:    (X.sfR  + X.qfR + CW)  / 2,
  qfr16R:   (X.qfR  + X.r16R + CW) / 2,
  r16r32R:  (X.r16R + X.r32R + CW) / 2,
};

const cy32 = (i) => (i + 0.5) * SH;
const cy16 = (i) => (2*i + 1) * SH;
const cyQF = (i) => (4*i + 2) * SH;
const cySF = ()  => TH / 2;
const cardTop = (cy) => LABEL_H + cy - CH / 2;

function buildPaths() {
  const paths = [];
  const bracket = (x0, x1, x2, topY, botY, midY) => {
    paths.push(`M ${x0} ${LABEL_H+topY} H ${x1} V ${LABEL_H+botY} M ${x0} ${LABEL_H+botY} H ${x1} M ${x1} ${LABEL_H+midY} H ${x2}`);
  };
  for (let j = 0; j < 4; j++) bracket(X.r32L+CW, MX.r32r16L, X.r16L, cy32(2*j), cy32(2*j+1), cy16(j));
  for (let j = 0; j < 2; j++) bracket(X.r16L+CW, MX.r16qfL,  X.qfL,  cy16(2*j), cy16(2*j+1), cyQF(j));
  bracket(X.qfL+CW, MX.qfsfL, X.sfL, cyQF(0), cyQF(1), cySF());
  paths.push(`M ${X.sfL+CW} ${LABEL_H+cySF()} H ${X.fin}`);
  for (let j = 0; j < 4; j++) bracket(X.r32R, MX.r16r32R, X.r16R+CW, cy32(2*j), cy32(2*j+1), cy16(j));
  for (let j = 0; j < 2; j++) bracket(X.r16R, MX.qfr16R,  X.qfR+CW,  cy16(2*j), cy16(2*j+1), cyQF(j));
  bracket(X.qfR, MX.sfqfR, X.sfR+CW, cyQF(0), cyQF(1), cySF());
  paths.push(`M ${X.sfR} ${LABEL_H+cySF()} H ${X.fin+CW}`);
  return paths;
}
const CONNECTOR_PATHS = buildPaths();

// ── Calcular tabla de un grupo ────────────────────────────────────────────────
function calcStandings(matches) {
  const table = {};
  for (const m of matches) {
    const addTeam = (name, code) => {
      if (!table[name]) table[name] = { team: name, code, pts: 0, gd: 0, gf: 0, played: 0 };
    };
    addTeam(m.home_team, m.home_code);
    addTeam(m.away_team, m.away_code);
    if (m.status !== 'finished' || m.home_score === null) continue;
    const h = m.home_score, a = m.away_score;
    table[m.home_team].played++;
    table[m.away_team].played++;
    table[m.home_team].gf += h; table[m.home_team].gd += h - a;
    table[m.away_team].gf += a; table[m.away_team].gd += a - h;
    if (h > a)      { table[m.home_team].pts += 3; }
    else if (h < a) { table[m.away_team].pts += 3; }
    else            { table[m.home_team].pts += 1; table[m.away_team].pts += 1; }
  }
  return Object.values(table).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
}

// Extrae "Grupo X" de strings como "1° Grupo A", "2° Grupo C"
function parseGroupSlot(text) {
  if (!text) return null;
  const m = text.match(/(\d+)[°º]\s*Grupo\s+([A-L])/i);
  if (!m) return null;
  return { pos: parseInt(m[1]), group: m[2].toUpperCase() };
}

// ── TeamRow ───────────────────────────────────────────────────────────────────
function TeamRow({ team, code, score, isWinner, isTop, isPreview, pts }) {
  const isPlaceholder = !team || team.startsWith('Ganador') || team.startsWith('Perdedor') || team.startsWith('1°') || team.startsWith('2°') || team.startsWith('Mejor');
  const hasTeam = !isPlaceholder;

  return (
    <div style={{
      height: ROW_H, display: 'flex', alignItems: 'center', gap: 5,
      paddingLeft: 8, paddingRight: 8,
      background: isWinner ? 'rgba(245,158,11,0.15)' : 'transparent',
      borderBottom: isTop ? '1px solid rgba(255,255,255,0.08)' : 'none',
    }}>
      {code ? (
        <img src={`https://flagcdn.com/16x12/${code.toLowerCase()}.png`} alt={team}
          style={{ width: 16, height: 12, borderRadius: 1, flexShrink: 0 }}
          onError={(e) => { e.target.style.display = 'none'; }} />
      ) : (
        <div style={{ width: 16, height: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 1, flexShrink: 0 }} />
      )}
      <span style={{
        flex: 1, fontSize: 9.5,
        fontWeight: hasTeam ? 700 : 400,
        color: hasTeam
          ? (isWinner ? '#F59E0B' : isPreview ? '#93c5fd' : 'rgba(255,255,255,0.95)')
          : 'rgba(255,255,255,0.2)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontStyle: hasTeam ? 'normal' : 'italic',
      }}>
        {team || 'Por definir'}
      </span>
      {score !== null && score !== undefined && (
        <span style={{ fontSize: 11, fontWeight: 800, color: isWinner ? '#F59E0B' : 'rgba(255,255,255,0.45)', minWidth: 14, textAlign: 'center' }}>
          {score}
        </span>
      )}
      {isPreview && pts !== undefined && hasTeam && (
        <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(147,197,253,0.6)', minWidth: 18, textAlign: 'right' }}>
          {pts}pt
        </span>
      )}
    </div>
  );
}

// ── BracketCard ───────────────────────────────────────────────────────────────
function BracketCard({ match, top, left, groupStandings, isPreview }) {
  if (!match) return null;
  const finished = match.status === 'finished';
  const homeWins = finished && match.home_score !== null && match.home_score > match.away_score;
  const awayWins = finished && match.away_score !== null && match.away_score > match.home_score;

  // En modo preview, resolver placeholders con standings actuales
  let homeTeam = match.home_team, homeCode = match.home_code;
  let awayTeam = match.away_team, awayCode = match.away_code;
  let homePts, awayPts;

  if (isPreview && groupStandings) {
    const homeSlot = parseGroupSlot(match.home_team);
    const awaySlot = parseGroupSlot(match.away_team);
    if (homeSlot && groupStandings[homeSlot.group]) {
      const entry = groupStandings[homeSlot.group][homeSlot.pos - 1];
      if (entry) { homeTeam = entry.team; homeCode = entry.code; homePts = entry.pts; }
    }
    if (awaySlot && groupStandings[awaySlot.group]) {
      const entry = groupStandings[awaySlot.group][awaySlot.pos - 1];
      if (entry) { awayTeam = entry.team; awayCode = entry.code; awayPts = entry.pts; }
    }
  }

  const borderColor = finished
    ? 'rgba(245,158,11,0.4)'
    : isPreview
    ? 'rgba(96,165,250,0.25)'
    : 'rgba(255,255,255,0.12)';

  const bgColor = finished ? 'rgba(26,16,0,0.95)' : isPreview ? 'rgba(13,27,60,0.95)' : 'rgba(10,20,42,0.95)';

  return (
    <div style={{
      position: 'absolute', top, left, width: CW, height: CH,
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 8, overflow: 'hidden',
      boxShadow: finished ? '0 0 10px rgba(245,158,11,0.12)' : isPreview ? '0 0 8px rgba(96,165,250,0.08)' : 'none',
    }}>
      <TeamRow team={homeTeam} code={homeCode} score={match.home_score} isWinner={homeWins} isTop isPreview={isPreview && !finished} pts={homePts} />
      <TeamRow team={awayTeam} code={awayCode} score={match.away_score} isWinner={awayWins} isTop={false} isPreview={isPreview && !finished} pts={awayPts} />
    </div>
  );
}

// ── FinalCard ─────────────────────────────────────────────────────────────────
function FinalCard({ match }) {
  if (!match) return null;
  const finished = match.status === 'finished';
  const homeWins = finished && match.home_score !== null && match.home_score > match.away_score;
  const awayWins = finished && match.away_score !== null && match.away_score > match.home_score;
  return (
    <div style={{
      position: 'absolute', top: cardTop(cySF()), left: X.fin, width: CW, height: CH,
      background: finished ? 'rgba(26,12,0,0.98)' : 'rgba(15,22,48,0.98)',
      border: `1px solid ${finished ? 'rgba(245,158,11,0.6)' : 'rgba(245,158,11,0.3)'}`,
      borderRadius: 8, overflow: 'hidden',
      boxShadow: finished ? '0 0 20px rgba(245,158,11,0.25)' : '0 0 12px rgba(245,158,11,0.1)',
    }}>
      <TeamRow team={match.home_team} code={match.home_code} score={match.home_score} isWinner={homeWins} isTop />
      <TeamRow team={match.away_team} code={match.away_code} score={match.away_score} isWinner={awayWins} isTop={false} />
    </div>
  );
}

const LABELS = [
  { x: X.r32L, label: 'Ronda de 32' },
  { x: X.r16L, label: 'Octavos' },
  { x: X.qfL,  label: 'Cuartos' },
  { x: X.sfL,  label: 'Semifinal' },
  { x: X.fin,  label: '⭐ Final', isCenter: true },
  { x: X.sfR,  label: 'Semifinal' },
  { x: X.qfR,  label: 'Cuartos' },
  { x: X.r16R, label: 'Octavos' },
  { x: X.r32R, label: 'Ronda de 32' },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Bracket() {
  const [bracket,       setBracket]       = useState(null);
  const [groupMatches,  setGroupMatches]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [viewMode,      setViewMode]      = useState('preview'); // 'preview' | 'oficial'

  useEffect(() => {
    Promise.all([
      api.get('/bracket'),
      api.get('/matches?stage=group'),
    ]).then(([bracketRes, matchesRes]) => {
      setBracket(bracketRes.data);
      setGroupMatches(matchesRes.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Calcular standings por grupo
  const groupStandings = useMemo(() => {
    const byGroup = {};
    for (const m of groupMatches) {
      const g = m.group_name;
      if (!g) continue;
      if (!byGroup[g]) byGroup[g] = [];
      byGroup[g].push(m);
    }
    const result = {};
    for (const [g, matches] of Object.entries(byGroup)) {
      result[g] = calcStandings(matches);
    }
    return result;
  }, [groupMatches]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Cargando llaves...</p>
    </div>
  );

  if (!bracket) return null;

  const r32 = bracket.r32 || [];
  const r16 = bracket.r16 || [];
  const qf  = bracket.qf  || [];
  const sf  = bracket.sf  || [];

  const r32L = r32.slice(0, 8);  const r32R = r32.slice(8, 16);
  const r16L = r16.slice(0, 4);  const r16R = r16.slice(4, 8);
  const qfL  = qf.slice(0, 2);   const qfR  = qf.slice(2, 4);
  const sfL  = sf[0] || null;    const sfR  = sf[1] || null;

  const isPreview = viewMode === 'preview';

  // Contar grupos con al menos 1 partido jugado
  const groupsWithData = Object.values(groupStandings).filter((s) => s.some((e) => e.played > 0)).length;

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)]"
      style={{ backgroundImage: `url(${canchaBg})`, backgroundSize: 'cover', backgroundPosition: 'center top', backgroundAttachment: 'fixed' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(5,0,0,0.82)' }} />

      <div className="px-4 py-6 max-w-[1500px] mx-auto relative z-10">

        {/* Header */}
        <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Network size={20} style={{ color: '#F59E0B' }} />
            <div>
              <h1 className="text-white font-black text-xl leading-none">Llaves · FIFA World Cup 2026™</h1>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Fase eliminatoria · 28 jun – 19 jul
              </p>
            </div>
          </div>

          {/* Toggle vista */}
          <div className="flex items-center rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setViewMode('preview')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-all"
              style={{
                background: isPreview ? 'rgba(96,165,250,0.18)' : 'transparent',
                color: isPreview ? '#93c5fd' : 'rgba(255,255,255,0.4)',
                borderRight: '1px solid rgba(255,255,255,0.08)',
              }}>
              <TrendingUp size={12} />
              Proyección actual
              {groupsWithData > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black"
                  style={{ background: 'rgba(96,165,250,0.2)', color: '#93c5fd' }}>
                  {groupsWithData} grupos
                </span>
              )}
            </button>
            <button
              onClick={() => setViewMode('oficial')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-all"
              style={{
                background: !isPreview ? 'rgba(245,158,11,0.15)' : 'transparent',
                color: !isPreview ? '#F59E0B' : 'rgba(255,255,255,0.4)',
              }}>
              <CheckCircle2 size={12} />
              Resultados oficiales
            </button>
          </div>
        </div>

        {/* Leyenda del modo */}
        {isPreview && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
            <Eye size={13} style={{ color: '#93c5fd', flexShrink: 0 }} />
            <p className="text-xs" style={{ color: 'rgba(147,197,253,0.8)' }}>
              <span className="font-bold text-blue-300">Proyección actual</span> — muestra qué equipos clasificarían según la tabla de grupos en este momento.
              Los equipos en <span className="font-bold text-blue-300">azul</span> aún no están confirmados oficialmente.
            </p>
          </div>
        )}

        {/* Bracket container */}
        <div className="rounded-2xl" style={{
          background: 'rgba(8,16,36,0.92)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '20px 20px 24px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ position: 'relative', width: TOTAL_W, height: TOTAL_H, minWidth: TOTAL_W }}>

              {/* SVG connectors */}
              <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} width={TOTAL_W} height={TOTAL_H}>
                <defs>
                  <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(96,165,250,0.3)" />
                    <stop offset="100%" stopColor="rgba(245,158,11,0.3)" />
                  </linearGradient>
                </defs>
                {CONNECTOR_PATHS.map((d, i) => (
                  <path key={i} d={d} stroke={isPreview ? 'rgba(96,165,250,0.18)' : 'rgba(255,255,255,0.12)'} strokeWidth="1.5" fill="none" />
                ))}
              </svg>

              {/* Column labels */}
              {LABELS.map(({ x, label, isCenter }) => (
                <div key={x} style={{ position: 'absolute', top: 0, left: x, width: CW, height: LABEL_H, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
                    color: isCenter ? 'rgba(245,158,11,0.9)' : 'rgba(255,255,255,0.35)',
                  }}>{label}</span>
                </div>
              ))}

              {/* LEFT */}
              {r32L.map((m, i) => <BracketCard key={m.id} match={m} top={cardTop(cy32(i))} left={X.r32L} groupStandings={groupStandings} isPreview={isPreview} />)}
              {r16L.map((m, i) => <BracketCard key={m.id} match={m} top={cardTop(cy16(i))} left={X.r16L} groupStandings={groupStandings} isPreview={isPreview} />)}
              {qfL.map((m, i)  => <BracketCard key={m.id} match={m} top={cardTop(cyQF(i))} left={X.qfL}  groupStandings={groupStandings} isPreview={isPreview} />)}
              {sfL && <BracketCard match={sfL} top={cardTop(cySF())} left={X.sfL} groupStandings={groupStandings} isPreview={isPreview} />}

              {/* FINAL */}
              <FinalCard match={bracket.final} />

              {/* RIGHT */}
              {r32R.map((m, i) => <BracketCard key={m.id} match={m} top={cardTop(cy32(i))} left={X.r32R} groupStandings={groupStandings} isPreview={isPreview} />)}
              {r16R.map((m, i) => <BracketCard key={m.id} match={m} top={cardTop(cy16(i))} left={X.r16R} groupStandings={groupStandings} isPreview={isPreview} />)}
              {qfR.map((m, i)  => <BracketCard key={m.id} match={m} top={cardTop(cyQF(i))} left={X.qfR}  groupStandings={groupStandings} isPreview={isPreview} />)}
              {sfR && <BracketCard match={sfR} top={cardTop(cySF())} left={X.sfR} groupStandings={groupStandings} isPreview={isPreview} />}

            </div>
          </div>
        </div>

        {/* Tercer puesto */}
        {bracket.thirdPlace && (
          <div className="mt-5 flex flex-col items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Tercer Puesto</p>
            <div style={{ position: 'relative', width: CW, height: CH }}>
              <BracketCard match={bracket.thirdPlace} top={0} left={0} groupStandings={groupStandings} isPreview={false} />
            </div>
          </div>
        )}

        <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.18)' }}>
          Fase eliminatoria: 28 jun – 19 jul · Final: 19 jul, MetLife Stadium
        </p>
      </div>
    </div>
  );
}
