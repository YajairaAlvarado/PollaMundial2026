import React, { useEffect, useState, useMemo } from 'react';
import { Network, ListOrdered } from 'lucide-react';
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

// ── Desempate Mundial 2026: enfrentamiento directo PRIMERO ────────────────────
function h2hStats(teamNames, matches) {
  const set = new Set(teamNames);
  const st = {};
  teamNames.forEach((n) => { st[n] = { pts: 0, gd: 0, gf: 0 }; });
  for (const m of matches) {
    if (m.status !== 'finished' || m.home_score === null) continue;
    if (!set.has(m.home_team) || !set.has(m.away_team)) continue;
    const h = m.home_score, a = m.away_score;
    st[m.home_team].gf += h; st[m.home_team].gd += h - a;
    st[m.away_team].gf += a; st[m.away_team].gd += a - h;
    if (h > a)      st[m.home_team].pts += 3;
    else if (h < a) st[m.away_team].pts += 3;
    else            { st[m.home_team].pts += 1; st[m.away_team].pts += 1; }
  }
  return st;
}

function sortGroupTeams(teams, matches) {
  const byPts = {};
  for (const t of teams) (byPts[t.pts] ||= []).push(t);
  const out = [];
  Object.keys(byPts).map(Number).sort((a, b) => b - a).forEach((pts) => {
    const tied = byPts[pts];
    if (tied.length === 1) { out.push(tied[0]); return; }
    const h = h2hStats(tied.map((t) => t.team), matches);
    tied.sort((a, b) =>
      h[b.team].pts - h[a.team].pts ||
      h[b.team].gd  - h[a.team].gd  ||
      h[b.team].gf  - h[a.team].gf  ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      a.team.localeCompare(b.team)
    );
    out.push(...tied);
  });
  return out;
}

function calcGroupTable(matches) {
  const table = {};
  const addTeam = (name, code) => {
    if (!table[name]) table[name] = { team: name, code, pts: 0, w: 0, d: 0, l: 0, gf: 0, gc: 0, gd: 0, played: 0, form: [] };
  };
  const sorted = [...matches].sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
  for (const m of sorted) {
    addTeam(m.home_team, m.home_code);
    addTeam(m.away_team, m.away_code);
    if (m.status !== 'finished' || m.home_score === null) continue;
    const h = m.home_score, a = m.away_score;
    const H = table[m.home_team], A = table[m.away_team];
    H.played++; A.played++;
    H.gf += h; H.gc += a; H.gd += h - a;
    A.gf += a; A.gc += h; A.gd += a - h;
    if (h > a)      { H.pts += 3; H.w++; A.l++; H.form.push('W'); A.form.push('L'); }
    else if (h < a) { A.pts += 3; A.w++; H.l++; A.form.push('W'); H.form.push('L'); }
    else            { H.pts++;    A.pts++; H.d++; A.d++; H.form.push('D'); A.form.push('D'); }
  }
  return sortGroupTeams(Object.values(table), matches);
}

function parseGroupSlot(text) {
  if (!text) return null;
  const m = text.match(/(\d+)[°º]\s*Grupo\s+([A-L])/i);
  if (!m) return null;
  return { pos: parseInt(m[1]), group: m[2].toUpperCase() };
}

function parseThirdSlot(text) {
  if (!text) return null;
  const m = text.match(/Mejor\s*3[°º]\s*\((\d+)\)/i);
  if (!m) return null;
  return parseInt(m[1]);
}

// Resuelve "Ganador R32 M1", "Ganador R16 M3", "Ganador QF M2", etc.
// desde los resultados reales del bracket ya terminados
function resolveWinnerFromBracket(slotText, bracketData) {
  if (!slotText || !bracketData) return null;
  const m = slotText.match(/Ganador\s+(R\d+|QF|SF)\s+M(\d+)/i);
  if (!m) return null;
  const roundStr = m[1].toLowerCase();
  const matchIdx = parseInt(m[2]) - 1;
  const matches = bracketData[roundStr] || [];
  const match = matches[matchIdx];
  if (!match || match.status !== 'finished' || match.home_score === null) return null;
  if (match.home_score > match.away_score) return { team: match.home_team, code: match.home_code };
  if (match.away_score > match.home_score) return { team: match.away_team, code: match.away_code };
  return null;
}

function isRealTeam(name) {
  if (!name) return false;
  return !(name.startsWith('Ganador') || name.startsWith('Perdedor') ||
           name.startsWith('1°') || name.startsWith('2°') || name.startsWith('Mejor'));
}

// ── TeamRow ───────────────────────────────────────────────────────────────────
function TeamRow({ team, code, score, isWinner, isTop }) {
  const isPlaceholder = !team || team.startsWith('Ganador') || team.startsWith('Perdedor') ||
    team.startsWith('1°') || team.startsWith('2°') || team.startsWith('Mejor');
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
          ? (isWinner ? '#F59E0B' : 'rgba(255,255,255,0.95)')
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
    </div>
  );
}

// ── BracketCard ───────────────────────────────────────────────────────────────
function BracketCard({ match, top, left, bracketData }) {
  if (!match) return null;
  const finished = match.status === 'finished';
  const homeWins = finished && match.home_score !== null && match.home_score > match.away_score;
  const awayWins = finished && match.away_score !== null && match.away_score > match.home_score;

  let homeTeam = match.home_team, homeCode = match.home_code;
  let awayTeam = match.away_team, awayCode = match.away_code;

  // Resolver ganadores de rondas anteriores ya terminadas
  const h = resolveWinnerFromBracket(match.home_team, bracketData);
  if (h) { homeTeam = h.team; homeCode = h.code; }
  const a = resolveWinnerFromBracket(match.away_team, bracketData);
  if (a) { awayTeam = a.team; awayCode = a.code; }

  const borderColor = finished ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.12)';
  const bgColor     = finished ? 'rgba(26,16,0,0.95)'   : 'rgba(10,20,42,0.95)';

  return (
    <div style={{
      position: 'absolute', top, left, width: CW, height: CH,
      background: bgColor,
      border: `1px solid ${borderColor}`,
      borderRadius: 8, overflow: 'hidden',
      boxShadow: finished ? '0 0 10px rgba(245,158,11,0.12)' : 'none',
    }}>
      <TeamRow team={homeTeam} code={homeCode} score={match.home_score} isWinner={homeWins} isTop />
      <TeamRow team={awayTeam} code={awayCode} score={match.away_score} isWinner={awayWins} isTop={false} />
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

// ── Vista de Grupos ─────────────────────────────────────────────────────────
function FormDots({ form }) {
  const last = form.slice(-5);
  const dots = [...last];
  while (dots.length < 5) dots.push(null);
  const color = (r) => r === 'W' ? '#22c55e' : r === 'L' ? '#ef4444' : r === 'D' ? '#9ca3af' : 'rgba(255,255,255,0.1)';
  return (
    <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
      {dots.map((r, i) => (
        <span key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: color(r), flexShrink: 0 }} />
      ))}
    </div>
  );
}

function GroupCard({ group, rows, qualifiedThirdTeams }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(8,16,36,0.92)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="px-3 py-2 flex items-center justify-between" style={{ background: 'rgba(245,158,11,0.1)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span className="text-sm font-black text-white">Grupo {group}</span>
        <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {rows.reduce((s, r) => s + r.played, 0) / 2 | 0} / 6 jugados
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 360 }}>
          <thead>
            <tr style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ textAlign: 'left', padding: '5px 4px 5px 8px' }}>Equipo</th>
              <th style={{ padding: '5px 3px' }}>PJ</th>
              <th style={{ padding: '5px 3px' }}>G</th>
              <th style={{ padding: '5px 3px' }}>E</th>
              <th style={{ padding: '5px 3px' }}>P</th>
              <th style={{ padding: '5px 3px' }}>GF</th>
              <th style={{ padding: '5px 3px' }}>GC</th>
              <th style={{ padding: '5px 3px' }}>DG</th>
              <th style={{ padding: '5px 3px', color: '#F59E0B' }}>PTS</th>
              <th style={{ padding: '5px 8px 5px 3px', textAlign: 'right' }}>Últimos 5</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const pos = idx + 1;
              const isReal = isRealTeam(r.team);
              let accent = null, badge = null;
              if (pos <= 2)                                              { accent = '#22c55e'; badge = null; }
              else if (pos === 3 && qualifiedThirdTeams.has(r.team))   { accent = '#3b82f6'; badge = '3°✓'; }
              else if (pos === 3)                                        { accent = '#ef4444'; badge = '3°✗'; }
              else                                                       { accent = 'rgba(255,255,255,0.08)'; }
              return (
                <tr key={r.team} style={{
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  background: pos <= 2 ? 'rgba(34,197,94,0.05)' : (pos === 3 && qualifiedThirdTeams.has(r.team)) ? 'rgba(59,130,246,0.05)' : 'transparent',
                }}>
                  <td style={{ padding: '6px 4px 6px 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 3, height: 18, borderRadius: 2, background: accent, flexShrink: 0 }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', minWidth: 10 }}>{pos}</span>
                      {r.code
                        ? <img src={`https://flagcdn.com/16x12/${r.code.toLowerCase()}.png`} alt="" style={{ width: 16, height: 12, borderRadius: 1, flexShrink: 0 }} onError={(e) => { e.target.style.display = 'none'; }} />
                        : <span style={{ width: 16, height: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 1, display: 'inline-block', flexShrink: 0 }} />}
                      <span style={{ fontSize: 11, fontWeight: 600, color: isReal ? 'white' : 'rgba(255,255,255,0.3)', fontStyle: isReal ? 'normal' : 'italic', whiteSpace: 'nowrap' }}>
                        {r.team}
                      </span>
                      {badge && <span style={{ fontSize: 8, fontWeight: 800, color: accent, marginLeft: 2 }}>{badge}</span>}
                    </div>
                  </td>
                  {[r.played, r.w, r.d, r.l, r.gf, r.gc].map((v, i) => (
                    <td key={i} style={{ textAlign: 'center', padding: '6px 3px', fontSize: 10.5, color: 'rgba(255,255,255,0.6)' }}>{v}</td>
                  ))}
                  <td style={{ textAlign: 'center', padding: '6px 3px', fontSize: 10.5, fontWeight: 700, color: r.gd > 0 ? '#22c55e' : r.gd < 0 ? '#ef4444' : 'rgba(255,255,255,0.6)' }}>
                    {r.gd > 0 ? `+${r.gd}` : r.gd}
                  </td>
                  <td style={{ textAlign: 'center', padding: '6px 3px', fontSize: 12, fontWeight: 900, color: '#F59E0B' }}>{r.pts}</td>
                  <td style={{ padding: '6px 8px 6px 3px' }}><FormDots form={r.form} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GroupsView({ groupStandings, rankedThirds, qualifiedThirdTeams }) {
  const groups = Object.keys(groupStandings).sort();

  if (groups.length === 0) {
    return <p className="text-center py-12 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Aún no hay grupos cargados.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2.5 rounded-xl text-[11px]"
        style={{ background: 'rgba(8,16,36,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <span className="flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e' }} /> 1° y 2° clasifican
        </span>
        <span className="flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#3b82f6' }} /> Mejor 3° (clasifica)
        </span>
        <span className="flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444' }} /> 3° eliminado / 4°
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {groups.map((g) => (
          <GroupCard key={g} group={g} rows={groupStandings[g]} qualifiedThirdTeams={qualifiedThirdTeams} />
        ))}
      </div>

      {rankedThirds.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(8,16,36,0.92)', border: '1px solid rgba(59,130,246,0.3)' }}>
          <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'rgba(59,130,246,0.1)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-sm font-black text-white">🥉 Tabla de Mejores Terceros</span>
            <span className="text-[10px] font-semibold ml-auto" style={{ color: 'rgba(147,197,253,0.8)' }}>Clasifican los 8 mejores de 12</span>
          </div>
          <div>
            {rankedThirds.map((t, idx) => {
              const qualifies = idx < 8;
              const isReal = isRealTeam(t.team);
              return (
                <div key={t.team} className="flex items-center gap-3 px-4 py-2"
                  style={{
                    borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    background: qualifies ? 'rgba(59,130,246,0.06)' : 'transparent',
                    opacity: qualifies ? 1 : 0.5,
                  }}>
                  <span className="text-xs font-black" style={{ color: qualifies ? '#3b82f6' : 'rgba(255,255,255,0.3)', minWidth: 18 }}>
                    {idx + 1}
                  </span>
                  {t.code
                    ? <img src={`https://flagcdn.com/16x12/${t.code.toLowerCase()}.png`} alt="" style={{ width: 16, height: 12, borderRadius: 1 }} onError={(e) => { e.target.style.display = 'none'; }} />
                    : <span style={{ width: 16, height: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 1, display: 'inline-block' }} />}
                  <span className="text-xs font-semibold flex-1 truncate" style={{ color: isReal ? 'white' : 'rgba(255,255,255,0.3)', fontStyle: isReal ? 'normal' : 'italic' }}>
                    {t.team} <span style={{ color: 'rgba(255,255,255,0.3)' }}>· Grupo {t.group}</span>
                  </span>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {t.pts} pts · {t.gd > 0 ? `+${t.gd}` : t.gd} DG
                  </span>
                  {qualifies
                    ? <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.2)', color: '#93c5fd' }}>CLASIFICA</span>
                    : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>FUERA</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Bracket() {
  const [bracket,      setBracket]      = useState(null);
  const [groupMatches, setGroupMatches] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState('llaves');

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
      result[g] = calcGroupTable(matches);
    }
    return result;
  }, [groupMatches]);

  const rankedThirds = useMemo(() => {
    return Object.entries(groupStandings)
      .map(([g, rows]) => (rows[2] ? { ...rows[2], group: g } : null))
      .filter(Boolean)
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
  }, [groupStandings]);

  const qualifiedThirdTeams = useMemo(
    () => new Set(rankedThirds.slice(0, 8).map((t) => t.team)),
    [rankedThirds]
  );

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

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)]"
      style={{ backgroundImage: `url(${canchaBg})`, backgroundSize: 'cover', backgroundPosition: 'center top', backgroundAttachment: 'fixed' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(5,0,0,0.82)' }} />

      <div className="px-4 py-6 max-w-[1500px] mx-auto relative z-10">

        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <Network size={20} style={{ color: '#F59E0B' }} />
          <div>
            <h1 className="text-white font-black text-xl leading-none">Llaves · FIFA World Cup 2026™</h1>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Fase eliminatoria · 28 jun – 19 jul
            </p>
          </div>
        </div>

        {/* Tabs Llaves / Grupos */}
        <div className="mb-4 flex rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', width: 'fit-content' }}>
          <button onClick={() => setTab('llaves')}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold transition-all"
            style={{ background: tab === 'llaves' ? 'rgba(245,158,11,0.15)' : 'transparent', color: tab === 'llaves' ? '#F59E0B' : 'rgba(255,255,255,0.4)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <Network size={12} /> Llaves
          </button>
          <button onClick={() => setTab('grupos')}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold transition-all"
            style={{ background: tab === 'grupos' ? 'rgba(34,197,94,0.15)' : 'transparent', color: tab === 'grupos' ? '#22c55e' : 'rgba(255,255,255,0.4)' }}>
            <ListOrdered size={12} /> Grupos
          </button>
        </div>

        {/* ════ TAB GRUPOS ════ */}
        {tab === 'grupos' && (
          <GroupsView groupStandings={groupStandings} rankedThirds={rankedThirds} qualifiedThirdTeams={qualifiedThirdTeams} />
        )}

        {/* ════ TAB LLAVES ════ */}
        {tab === 'llaves' && (<>

        {/* Bracket container */}
        <div className="rounded-2xl" style={{
          background: 'rgba(8,16,36,0.92)',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '16px 16px 20px',
          backdropFilter: 'blur(8px)',
        }}>
          {/* Hint desliza solo en móvil */}
          <p className="text-center text-[11px] mb-3 sm:hidden" style={{ color: 'rgba(255,255,255,0.28)' }}>
            ← Desliza para ver el bracket →
          </p>

          <div style={{ position: 'relative' }}>
            <div style={{ overflowX: 'auto', paddingBottom: 6, WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}>
              <div style={{ position: 'relative', width: TOTAL_W, height: TOTAL_H, minWidth: TOTAL_W }}>

                {/* SVG connectors */}
                <svg style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} width={TOTAL_W} height={TOTAL_H}>
                  {CONNECTOR_PATHS.map((d, i) => (
                    <path key={i} d={d} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="none" />
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
                {r32L.map((m, i) => <BracketCard key={m.id} match={m} top={cardTop(cy32(i))} left={X.r32L} bracketData={bracket} />)}
                {r16L.map((m, i) => <BracketCard key={m.id} match={m} top={cardTop(cy16(i))} left={X.r16L} bracketData={bracket} />)}
                {qfL.map((m, i)  => <BracketCard key={m.id} match={m} top={cardTop(cyQF(i))} left={X.qfL}  bracketData={bracket} />)}
                {sfL && <BracketCard match={sfL} top={cardTop(cySF())} left={X.sfL} bracketData={bracket} />}

                {/* FINAL */}
                <FinalCard match={bracket.final} />

                {/* RIGHT */}
                {r32R.map((m, i) => <BracketCard key={m.id} match={m} top={cardTop(cy32(i))} left={X.r32R} bracketData={bracket} />)}
                {r16R.map((m, i) => <BracketCard key={m.id} match={m} top={cardTop(cy16(i))} left={X.r16R} bracketData={bracket} />)}
                {qfR.map((m, i)  => <BracketCard key={m.id} match={m} top={cardTop(cyQF(i))} left={X.qfR}  bracketData={bracket} />)}
                {sfR && <BracketCard match={sfR} top={cardTop(cySF())} left={X.sfR} bracketData={bracket} />}

              </div>
            </div>
            {/* Gradiente de scroll hint en móvil */}
            <div className="sm:hidden pointer-events-none" style={{
              position: 'absolute', top: 0, right: 0, bottom: 6, width: 32,
              background: 'linear-gradient(to right, transparent, rgba(8,16,36,0.85))',
              borderRadius: '0 2px 2px 0',
            }} />
          </div>
        </div>

        {/* Tercer puesto */}
        {bracket.thirdPlace && (
          <div className="mt-5 flex flex-col items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Tercer Puesto</p>
            <div style={{ position: 'relative', width: CW, height: CH }}>
              <BracketCard match={bracket.thirdPlace} top={0} left={0} bracketData={bracket} />
            </div>
          </div>
        )}

        <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.18)' }}>
          Fase eliminatoria: 28 jun – 19 jul · Final: 19 jul, MetLife Stadium
        </p>
        </>)}
      </div>
    </div>
  );
}
