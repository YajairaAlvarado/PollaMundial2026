// Standalone mode: no backend needed. All data lives here + localStorage.
import { calculatePoints } from './scoring';

// Grupos del sorteo oficial FIFA (5 dic 2025)
const GROUPS_DATA = [
  {
    name: 'A',
    teams: [
      { name: 'México', code: 'mx' }, { name: 'Sudáfrica', code: 'za' },
      { name: 'Corea del Sur', code: 'kr' }, { name: 'Chequia', code: 'cz' },
    ],
    venues: ['Estadio Azteca', 'AT&T Stadium'],
    cities: ['Ciudad de México', 'Dallas'],
    md1: '2026-06-11', md2: '2026-06-18', md3: '2026-06-24',
  },
  {
    name: 'B',
    teams: [
      { name: 'Canadá', code: 'ca' }, { name: 'Bosnia-Herzegovina', code: 'ba' },
      { name: 'Qatar', code: 'qa' }, { name: 'Suiza', code: 'ch' },
    ],
    venues: ['BMO Field', 'BC Place'],
    cities: ['Toronto', 'Vancouver'],
    md1: '2026-06-12', md2: '2026-06-19', md3: '2026-06-25',
  },
  {
    name: 'C',
    teams: [
      { name: 'Brasil', code: 'br' }, { name: 'Marruecos', code: 'ma' },
      { name: 'Haití', code: 'ht' }, { name: 'Escocia', code: 'gb-sct' },
    ],
    venues: ['MetLife Stadium', 'SoFi Stadium'],
    cities: ['Nueva York', 'Los Ángeles'],
    md1: '2026-06-12', md2: '2026-06-19', md3: '2026-06-25',
  },
  {
    name: 'D',
    teams: [
      { name: 'USA', code: 'us' }, { name: 'Paraguay', code: 'py' },
      { name: 'Australia', code: 'au' }, { name: 'Turquía', code: 'tr' },
    ],
    venues: ['MetLife Stadium', 'AT&T Stadium'],
    cities: ['Nueva York', 'Dallas'],
    md1: '2026-06-13', md2: '2026-06-20', md3: '2026-06-26',
  },
  {
    name: 'E',
    teams: [
      { name: 'Alemania', code: 'de' }, { name: 'Curazao', code: 'cw' },
      { name: 'Costa de Marfil', code: 'ci' }, { name: 'Ecuador', code: 'ec' },
    ],
    venues: ['SoFi Stadium', 'NRG Stadium'],
    cities: ['Los Ángeles', 'Houston'],
    md1: '2026-06-13', md2: '2026-06-20', md3: '2026-06-26',
  },
  {
    name: 'F',
    teams: [
      { name: 'Países Bajos', code: 'nl' }, { name: 'Japón', code: 'jp' },
      { name: 'Suecia', code: 'se' }, { name: 'Túnez', code: 'tn' },
    ],
    venues: ['Arrowhead Stadium', 'Lincoln Financial Field'],
    cities: ['Kansas City', 'Filadelfia'],
    md1: '2026-06-14', md2: '2026-06-21', md3: '2026-06-27',
  },
  {
    name: 'G',
    teams: [
      { name: 'Bélgica', code: 'be' }, { name: 'Egipto', code: 'eg' },
      { name: 'Irán', code: 'ir' }, { name: 'Nueva Zelanda', code: 'nz' },
    ],
    venues: ['Estadio Akron', 'Lumen Field'],
    cities: ['Guadalajara', 'Seattle'],
    md1: '2026-06-14', md2: '2026-06-21', md3: '2026-06-27',
  },
  {
    name: 'H',
    teams: [
      { name: 'España', code: 'es' }, { name: 'Cabo Verde', code: 'cv' },
      { name: 'Arabia Saudita', code: 'sa' }, { name: 'Uruguay', code: 'uy' },
    ],
    venues: ['Hard Rock Stadium', "Levi's Stadium"],
    cities: ['Miami', 'San Francisco'],
    md1: '2026-06-15', md2: '2026-06-22', md3: '2026-06-28',
  },
  {
    name: 'I',
    teams: [
      { name: 'Francia', code: 'fr' }, { name: 'Senegal', code: 'sn' },
      { name: 'Irak', code: 'iq' }, { name: 'Noruega', code: 'no' },
    ],
    venues: ['NRG Stadium', 'BC Place'],
    cities: ['Houston', 'Vancouver'],
    md1: '2026-06-15', md2: '2026-06-22', md3: '2026-06-28',
  },
  {
    name: 'J',
    teams: [
      { name: 'Argentina', code: 'ar' }, { name: 'Argelia', code: 'dz' },
      { name: 'Austria', code: 'at' }, { name: 'Jordania', code: 'jo' },
    ],
    venues: ['MetLife Stadium', 'Hard Rock Stadium'],
    cities: ['Nueva York', 'Miami'],
    md1: '2026-06-16', md2: '2026-06-23', md3: '2026-06-29',
  },
  {
    name: 'K',
    teams: [
      { name: 'Portugal', code: 'pt' }, { name: 'Congo DR', code: 'cd' },
      { name: 'Uzbekistán', code: 'uz' }, { name: 'Colombia', code: 'co' },
    ],
    venues: ['Gillette Stadium', "Levi's Stadium"],
    cities: ['Boston', 'San Francisco'],
    md1: '2026-06-16', md2: '2026-06-23', md3: '2026-06-29',
  },
  {
    name: 'L',
    teams: [
      { name: 'Inglaterra', code: 'gb-eng' }, { name: 'Croacia', code: 'hr' },
      { name: 'Ghana', code: 'gh' }, { name: 'Panamá', code: 'pa' },
    ],
    venues: ['Gillette Stadium', 'SoFi Stadium'],
    cities: ['Boston', 'Los Ángeles'],
    md1: '2026-06-17', md2: '2026-06-24', md3: '2026-06-29',
  },
];

// Pre-defined demo scores for "finished" matches (Groups A-E matchday 1)
const DEMO_SCORES = {
  1: { home: 2, away: 1 }, // México vs Sudáfrica
  2: { home: 1, away: 0 }, // Corea del Sur vs Chequia
  3: { home: 0, away: 1 }, // Canadá vs Bosnia-Herzegovina
  4: { home: 1, away: 2 }, // Qatar vs Suiza
  5: { home: 3, away: 0 }, // Brasil vs Marruecos
  6: { home: 1, away: 1 }, // Haití vs Escocia
  7: { home: 2, away: 0 }, // USA vs Paraguay
  8: { home: 1, away: 2 }, // Australia vs Turquía
  9: { home: 4, away: 0 }, // Alemania vs Curazao
  10: { home: 2, away: 1 }, // Costa de Marfil vs Ecuador
};

// Generate all 72 group stage matches
function buildMatches() {
  let id = 1;
  const all = [];
  for (const g of GROUPS_DATA) {
    const [t0, t1, t2, t3] = g.teams;
    const pairs = [
      // MD1
      { home: t0, away: t1, date: g.md1 + 'T18:00:00Z', venue: g.venues[0], city: g.cities[0] },
      { home: t2, away: t3, date: g.md1 + 'T21:00:00Z', venue: g.venues[1], city: g.cities[1] },
      // MD2
      { home: t0, away: t2, date: g.md2 + 'T18:00:00Z', venue: g.venues[0], city: g.cities[0] },
      { home: t1, away: t3, date: g.md2 + 'T21:00:00Z', venue: g.venues[1], city: g.cities[1] },
      // MD3
      { home: t0, away: t3, date: g.md3 + 'T21:00:00Z', venue: g.venues[0], city: g.cities[0] },
      { home: t1, away: t2, date: g.md3 + 'T21:00:00Z', venue: g.venues[1], city: g.cities[1] },
    ];
    for (const p of pairs) {
      const score = DEMO_SCORES[id];
      const status = score ? 'finished' : (id <= 14 ? 'live' : 'scheduled');
      all.push({
        id,
        group_name: g.name,
        stage: 'group',
        home_team: p.home.name,
        away_team: p.away.name,
        home_code: p.home.code,
        away_code: p.away.code,
        match_date: p.date,
        venue: p.venue,
        city: p.city,
        home_score: score ? score.home : null,
        away_score: score ? score.away : null,
        status,
      });
      id++;
    }
  }
  return all;
}

export const ALL_MATCHES = buildMatches();

export const MOCK_LEADERBOARD = [
  { rank: 1, username: 'ana.garcia', display_name: 'Ana García', avatar_initials: 'AG', department: 'Tax', total_points: 18, exact_scores: 4, correct_results: 3 },
  { rank: 2, username: 'carlos.lopez', display_name: 'Carlos López', avatar_initials: 'CL', department: 'Audit', total_points: 15, exact_scores: 3, correct_results: 3 },
  { rank: 3, username: 'maria.torres', display_name: 'María Torres', avatar_initials: 'MT', department: 'Advisory', total_points: 14, exact_scores: 2, correct_results: 5 },
  { rank: 4, username: 'luis.mendez', display_name: 'Luis Méndez', avatar_initials: 'LM', department: 'Legal', total_points: 12, exact_scores: 2, correct_results: 4 },
  { rank: 5, username: 'sofia.ruiz', display_name: 'Sofía Ruiz', avatar_initials: 'SR', department: 'Tax', total_points: 11, exact_scores: 1, correct_results: 5 },
  { rank: 6, username: 'pedro.vargas', display_name: 'Pedro Vargas', avatar_initials: 'PV', department: 'Audit', total_points: 10, exact_scores: 2, correct_results: 2 },
  { rank: 7, username: 'laura.jimenez', display_name: 'Laura Jiménez', avatar_initials: 'LJ', department: 'Advisory', total_points: 9, exact_scores: 1, correct_results: 4 },
  { rank: 8, username: 'jorge.castro', display_name: 'Jorge Castro', avatar_initials: 'JC', department: 'Legal', total_points: 8, exact_scores: 0, correct_results: 4 },
  { rank: 9, username: 'isabela.mora', display_name: 'Isabela Mora', avatar_initials: 'IM', department: 'HR', total_points: 7, exact_scores: 1, correct_results: 2 },
  { rank: 10, username: 'andres.rios', display_name: 'Andrés Ríos', avatar_initials: 'AR', department: 'IT', total_points: 6, exact_scores: 0, correct_results: 3 },
  { rank: 11, username: 'valeria.luna', display_name: 'Valeria Luna', avatar_initials: 'VL', department: 'Tax', total_points: 5, exact_scores: 1, correct_results: 1 },
  { rank: 12, username: 'demo', display_name: 'Visitante Demo', avatar_initials: 'VD', department: 'Andersen', total_points: 0, exact_scores: 0, correct_results: 0 },
];

export const MOCK_BRACKET = {
  r32: Array.from({ length: 16 }, (_, i) => ({
    id: `r32_${i + 1}`,
    home_team: null, home_code: null,
    away_team: null, away_code: null,
    home_score: null, away_score: null,
    status: 'scheduled',
    home_label: `Clasificado ${2 * i + 1}`,
    away_label: `Clasificado ${2 * i + 2}`,
  })),
  r16: Array.from({ length: 8 }, (_, i) => ({
    id: `r16_${i + 1}`,
    home_team: null, home_code: null,
    away_team: null, away_code: null,
    home_score: null, away_score: null,
    status: 'scheduled',
    home_label: `G. R32-${2 * i + 1}`,
    away_label: `G. R32-${2 * i + 2}`,
  })),
  qf: Array.from({ length: 4 }, (_, i) => ({
    id: `qf_${i + 1}`,
    home_team: null, home_code: null,
    away_team: null, away_code: null,
    home_score: null, away_score: null,
    status: 'scheduled',
    home_label: `G. Octavo ${2 * i + 1}`,
    away_label: `G. Octavo ${2 * i + 2}`,
  })),
  sf: Array.from({ length: 2 }, (_, i) => ({
    id: `sf_${i + 1}`,
    home_team: null, home_code: null,
    away_team: null, away_code: null,
    home_score: null, away_score: null,
    status: 'scheduled',
    home_label: `G. Cuarto ${2 * i + 1}`,
    away_label: `G. Cuarto ${2 * i + 2}`,
  })),
  final: [{
    id: 'final_1',
    home_team: null, home_code: null,
    away_team: null, away_code: null,
    home_score: null, away_score: null,
    status: 'scheduled',
    home_label: 'G. Semifinal 1',
    away_label: 'G. Semifinal 2',
  }],
  thirdPlace: {
    id: 'third_1',
    home_team: null, home_code: null,
    away_team: null, away_code: null,
    home_score: null, away_score: null,
    status: 'scheduled',
    home_label: 'Perd. Semifinal 1',
    away_label: 'Perd. Semifinal 2',
  },
};

// --- LocalStorage helpers ---
function getPreds() {
  try { return JSON.parse(localStorage.getItem('wc2026_mock_preds') || '{}'); }
  catch { return {}; }
}
function savePreds(p) {
  localStorage.setItem('wc2026_mock_preds', JSON.stringify(p));
}

function calcPredPoints(matchId, homeScore, awayScore) {
  const match = ALL_MATCHES.find((m) => m.id === matchId);
  if (!match || match.status !== 'finished') return 0;
  return calculatePoints(
    { home_score: homeScore, away_score: awayScore },
    { home_score: match.home_score, away_score: match.away_score }
  );
}

// --- Mock API handlers ---
function filterMatches(params) {
  let list = ALL_MATCHES;
  if (params.stage) list = list.filter((m) => m.stage === params.stage);
  if (params.group) list = list.filter((m) => m.group_name === params.group);
  if (params.status) list = list.filter((m) => m.status === params.status);
  return list;
}

function parseQuery(url) {
  const [, qs] = url.split('?');
  if (!qs) return {};
  return Object.fromEntries(new URLSearchParams(qs));
}

function mockGet(url) {
  const path = url.split('?')[0];
  const params = parseQuery(url);

  if (path === '/matches' || path === '/matches/') {
    return filterMatches(params);
  }
  if (path === '/matches/live') {
    return ALL_MATCHES.filter((m) => m.status === 'live');
  }
  if (path.match(/^\/matches\/\d+$/)) {
    const id = parseInt(path.split('/')[2]);
    return ALL_MATCHES.find((m) => m.id === id) || null;
  }
  if (path === '/predictions/my') {
    const preds = getPreds();
    return ALL_MATCHES
      .filter((m) => preds[m.id])
      .map((m) => ({
        id: m.id,
        match_id: m.id,
        home_team: m.home_team,
        away_team: m.away_team,
        home_code: m.home_code,
        away_code: m.away_code,
        group_name: m.group_name,
        match_date: m.match_date,
        status: m.status,
        home_score: preds[m.id].home_score,
        away_score: preds[m.id].away_score,
        actual_home: m.home_score,
        actual_away: m.away_score,
        points_earned: preds[m.id].points_earned,
      }));
  }
  if (path.match(/^\/predictions\/match\/\d+$/)) {
    const matchId = parseInt(path.split('/')[3]);
    const preds = getPreds();
    return preds[matchId] || null;
  }
  if (path === '/bracket') return MOCK_BRACKET;
  if (path === '/leaderboard') {
    // Inject demo user's real points
    const preds = getPreds();
    let demoTotal = 0, demoExact = 0, demoCorrect = 0;
    for (const p of Object.values(preds)) {
      demoTotal += p.points_earned || 0;
      if (p.points_earned === 3) demoExact++;
      else if (p.points_earned === 2) demoCorrect++;
    }
    return MOCK_LEADERBOARD.map((e, i) => {
      if (e.username === 'demo') {
        return { ...e, total_points: demoTotal, exact_scores: demoExact, correct_results: demoCorrect };
      }
      return { ...e, rank: i + 1 };
    }).sort((a, b) => b.total_points - a.total_points).map((e, i) => ({ ...e, rank: i + 1 }));
  }
  return null;
}

function mockPost(url, data) {
  if (url.match(/^\/predictions\/\d+$/)) {
    const matchId = parseInt(url.split('/')[2]);
    const { homeScore, awayScore } = data;
    const points = calcPredPoints(matchId, homeScore, awayScore);
    const preds = getPreds();
    preds[matchId] = { match_id: matchId, home_score: homeScore, away_score: awayScore, points_earned: points };
    savePreds(preds);
    return preds[matchId];
  }
  return null;
}

// --- Public mock API object (same interface as axios) ---
const mockApi = {
  get: (url) => Promise.resolve({ data: mockGet(url) }),
  post: (url, data) => Promise.resolve({ data: mockPost(url, data) }),
  defaults: { headers: { common: {} } },
  interceptors: {
    request: { use: () => {} },
    response: { use: () => {} },
  },
};

export default mockApi;
