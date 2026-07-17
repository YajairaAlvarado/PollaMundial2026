// ── Equipos vivos / eliminados del Mundial ───────────────────────────────────
// Se calcula TODO desde la tabla `matches`. Un equipo queda eliminado cuando
// pierde un partido de eliminatoria ya terminado. Empate terminado → penales →
// gana `advance_team` (el otro queda eliminado).

const KO_STAGES = ['r32', 'r16', 'qf', 'sf', 'third_place', 'final'];

// Etapas donde AÚN no se permite predecir (se abrirán cuando se defina el puntaje).
// Tercer lugar y final YA están abiertos a pronóstico.
export const LOCKED_STAGES = [];
export const isStageLocked = (stage) => LOCKED_STAGES.includes(stage);

// Fecha/hora desde la que se revelan los pronósticos de campeón (sábado 04/07/2026,
// 00:00 hora de Ecuador = 05:00 UTC). Fácil de cambiar.
export const CHAMPION_REVEAL = new Date('2026-07-04T05:00:00Z');
export const isChampionRevealed = () => Date.now() >= CHAMPION_REVEAL.getTime();

// Ingreso de pronósticos de campeón CERRADO (los octavos ya empezaron).
// Quien no pronosticó quedó fuera de ese premio.
export const CHAMPION_CLOSED = true;

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
  const teamSide = {}; // 'L' (izquierda) | 'R' (derecha) del cuadro
  const participants = new Set();

  // Participantes, códigos y LADO del cuadro desde la Ronda de 32.
  // El bracket separa los primeros 8 partidos (por id) a la izquierda y los
  // últimos 8 a la derecha — mismo criterio que la página de Llaves.
  const r32Sorted = matches.filter((m) => m.stage === 'r32').sort((a, b) => a.id - b.id);
  r32Sorted.forEach((m, idx) => {
    const side = idx < 8 ? 'L' : 'R';
    if (isRealTeam(m.home_team)) { participants.add(m.home_team); if (m.home_code) teamCode[m.home_team] = m.home_code; teamSide[m.home_team] = side; }
    if (isRealTeam(m.away_team)) { participants.add(m.away_team); if (m.away_code) teamCode[m.away_team] = m.away_code; teamSide[m.away_team] = side; }
  });

  const eliminated = new Set();
  for (const m of matches) {
    if (!KO_STAGES.includes(m.stage)) continue;
    const wl = matchWinnerLoser(m);
    if (wl && isRealTeam(wl.loser)) eliminated.add(wl.loser);
  }

  const alive = [...participants]
    .filter((t) => !eliminated.has(t))
    .map((t) => ({ team: t, code: teamCode[t] || null, side: teamSide[t] || null }))
    .sort((a, b) => a.team.localeCompare(b.team));

  return { participants, eliminated, teamCode, teamSide, alive };
}
