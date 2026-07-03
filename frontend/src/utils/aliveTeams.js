// ── Equipos vivos / eliminados del Mundial ───────────────────────────────────
// Se calcula TODO desde la tabla `matches`. Un equipo queda eliminado cuando
// pierde un partido de eliminatoria ya terminado. Empate terminado → penales →
// gana `advance_team` (el otro queda eliminado).

const KO_STAGES = ['r32', 'r16', 'qf', 'sf', 'third_place', 'final'];

// Etapas donde AÚN no se permite predecir (se abrirán cuando se defina el puntaje).
// Para reabrir octavos, quita 'r16' de esta lista.
export const LOCKED_STAGES = ['r16', 'qf', 'sf', 'third_place', 'final'];
export const isStageLocked = (stage) => LOCKED_STAGES.includes(stage);

// Fecha/hora desde la que se revelan los pronósticos de campeón (sábado 04/07/2026,
// 00:00 hora de Ecuador = 05:00 UTC). Fácil de cambiar.
export const CHAMPION_REVEAL = new Date('2026-07-04T05:00:00Z');
export const isChampionRevealed = () => Date.now() >= CHAMPION_REVEAL.getTime();

// Un nombre es de un equipo REAL si no es un placeholder ("Ganador …", "Perdedor …")
export function isRealTeam(name) {
  if (!name) return false;
  return !/^(ganador|perdedor)\b/i.test(name.trim());
}

// Ganador y perdedor de un partido de eliminatoria YA terminado (o null)
export function matchWinnerLoser(m) {
  if (m.status !== 'finished') return null;
  const { home_team, away_team, home_score, away_score, advance_team } = m;
  if (home_score == null || away_score == null) return null;
  if (home_score > away_score) return { winner: home_team, loser: away_team };
  if (away_score > home_score) return { winner: away_team, loser: home_team };
  // Empate → definido por penales (advance_team)
  if (!advance_team) return null;
  const loser = advance_team === home_team ? away_team : home_team;
  return { winner: advance_team, loser };
}

// Recibe el array de partidos y devuelve:
//   { participants:Set, eliminated:Set, teamCode:{team->code}, alive:[{team,code}] }
export function computeTeams(matches = []) {
  const teamCode = {};
  const participants = new Set();

  // Participantes y códigos de bandera desde la Ronda de 32 (todos equipos reales)
  for (const m of matches) {
    if (m.stage !== 'r32') continue;
    if (isRealTeam(m.home_team)) { participants.add(m.home_team); if (m.home_code) teamCode[m.home_team] = m.home_code; }
    if (isRealTeam(m.away_team)) { participants.add(m.away_team); if (m.away_code) teamCode[m.away_team] = m.away_code; }
  }

  const eliminated = new Set();
  for (const m of matches) {
    if (!KO_STAGES.includes(m.stage)) continue;
    const wl = matchWinnerLoser(m);
    if (wl && isRealTeam(wl.loser)) eliminated.add(wl.loser);
  }

  const alive = [...participants]
    .filter((t) => !eliminated.has(t))
    .map((t) => ({ team: t, code: teamCode[t] || null }))
    .sort((a, b) => a.team.localeCompare(b.team));

  return { participants, eliminated, teamCode, alive };
}
