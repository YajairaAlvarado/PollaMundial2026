// Integración con football-data.org (tier gratuito) para datos en tiempo real.
// Fuente: https://www.football-data.org/
// Se activa cuando VITE_FOOTBALL_API_KEY está definido en el build.
// Si la API falla o no está disponible, cae automáticamente al mock local.

import { calculatePoints } from './scoring';
import { ALL_MATCHES as MOCK_MATCHES, MOCK_LEADERBOARD, MOCK_BRACKET } from './mockApi';

const API_KEY = import.meta.env.VITE_FOOTBALL_API_KEY;
const BASE_URL = 'https://api.football-data.org/v4';

// ── Traducción de nombres al español ──────────────────────────────────────────
const NOMBRES_ES = {
  'Mexico': 'México',
  'South Africa': 'Sudáfrica',
  'Korea Republic': 'Corea del Sur',
  'Czechia': 'Chequia',
  'Canada': 'Canadá',
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina',
  'Qatar': 'Qatar',
  'Switzerland': 'Suiza',
  'Brazil': 'Brasil',
  'Morocco': 'Marruecos',
  'Haiti': 'Haití',
  'Scotland': 'Escocia',
  'United States': 'USA',
  'Paraguay': 'Paraguay',
  'Australia': 'Australia',
  'Türkiye': 'Turquía',
  'Germany': 'Alemania',
  'Curaçao': 'Curazao',
  "Côte d'Ivoire": 'Costa de Marfil',
  'Ecuador': 'Ecuador',
  'Netherlands': 'Países Bajos',
  'Japan': 'Japón',
  'Sweden': 'Suecia',
  'Tunisia': 'Túnez',
  'Belgium': 'Bélgica',
  'Egypt': 'Egipto',
  'Iran': 'Irán',
  'New Zealand': 'Nueva Zelanda',
  'Spain': 'España',
  'Cape Verde': 'Cabo Verde',
  'Saudi Arabia': 'Arabia Saudita',
  'Uruguay': 'Uruguay',
  'France': 'Francia',
  'Senegal': 'Senegal',
  'Iraq': 'Irak',
  'Norway': 'Noruega',
  'Argentina': 'Argentina',
  'Algeria': 'Argelia',
  'Austria': 'Austria',
  'Jordan': 'Jordania',
  'Portugal': 'Portugal',
  'DR Congo': 'Congo DR',
  'Uzbekistan': 'Uzbekistán',
  'Colombia': 'Colombia',
  'England': 'Inglaterra',
  'Croatia': 'Croacia',
  'Ghana': 'Ghana',
  'Panama': 'Panamá',
};

// ── Códigos de bandera (flagcdn.com) ──────────────────────────────────────────
const FLAG_CODES = {
  'Mexico': 'mx',
  'South Africa': 'za',
  'Korea Republic': 'kr',
  'Czechia': 'cz',
  'Canada': 'ca',
  'Bosnia and Herzegovina': 'ba',
  'Qatar': 'qa',
  'Switzerland': 'ch',
  'Brazil': 'br',
  'Morocco': 'ma',
  'Haiti': 'ht',
  'Scotland': 'gb-sct',
  'United States': 'us',
  'Paraguay': 'py',
  'Australia': 'au',
  'Türkiye': 'tr',
  'Germany': 'de',
  'Curaçao': 'cw',
  "Côte d'Ivoire": 'ci',
  'Ecuador': 'ec',
  'Netherlands': 'nl',
  'Japan': 'jp',
  'Sweden': 'se',
  'Tunisia': 'tn',
  'Belgium': 'be',
  'Egypt': 'eg',
  'Iran': 'ir',
  'New Zealand': 'nz',
  'Spain': 'es',
  'Cape Verde': 'cv',
  'Saudi Arabia': 'sa',
  'Uruguay': 'uy',
  'France': 'fr',
  'Senegal': 'sn',
  'Iraq': 'iq',
  'Norway': 'no',
  'Argentina': 'ar',
  'Algeria': 'dz',
  'Austria': 'at',
  'Jordan': 'jo',
  'Portugal': 'pt',
  'DR Congo': 'cd',
  'Uzbekistan': 'uz',
  'Colombia': 'co',
  'England': 'gb-eng',
  'Croatia': 'hr',
  'Ghana': 'gh',
  'Panama': 'pa',
};

// ── Caché en memoria (10 minutos) ─────────────────────────────────────────────
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 10 * 60 * 1000;

// ── Mapeo del formato de la API al formato interno ───────────────────────────
function mapStatus(s) {
  if (['FINISHED', 'AWARDED'].includes(s)) return 'finished';
  if (['IN_PLAY', 'PAUSED', 'HALFTIME'].includes(s)) return 'live';
  return 'scheduled';
}

function mapMatch(m, idx) {
  const hn = m.homeTeam?.name || '';
  const an = m.awayTeam?.name || '';
  return {
    id: m.id,
    group_name: (m.group || '').replace('GROUP_', ''),
    stage: 'group',
    home_team: NOMBRES_ES[hn] || hn,
    away_team: NOMBRES_ES[an] || an,
    home_code: FLAG_CODES[hn] || 'xx',
    away_code: FLAG_CODES[an] || 'xx',
    match_date: m.utcDate,
    venue: m.venue || '',
    city: '',
    home_score: m.score?.fullTime?.home ?? null,
    away_score: m.score?.fullTime?.away ?? null,
    status: mapStatus(m.status),
  };
}

// ── Fetch con caché y fallback al mock ───────────────────────────────────────
async function fetchMatches() {
  const now = Date.now();
  if (_cache && now - _cacheAt < CACHE_TTL) return _cache;

  try {
    const res = await fetch(
      `${BASE_URL}/competitions/WC/matches?stage=GROUP_STAGE`,
      { headers: { 'X-Auth-Token': API_KEY } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    _cache = data.matches.map(mapMatch);
    _cacheAt = now;
    console.info(`[liveApi] ✓ ${_cache.length} partidos cargados desde football-data.org`);
  } catch (err) {
    console.warn('[liveApi] API no disponible, usando datos locales:', err.message);
    if (!_cache) _cache = MOCK_MATCHES;
    _cacheAt = now;
  }
  return _cache;
}

// ── LocalStorage ──────────────────────────────────────────────────────────────
function getPreds() {
  try { return JSON.parse(localStorage.getItem('wc2026_mock_preds') || '{}'); }
  catch { return {}; }
}
function savePreds(p) {
  localStorage.setItem('wc2026_mock_preds', JSON.stringify(p));
}

function parseQuery(url) {
  const [, qs] = url.split('?');
  if (!qs) return {};
  return Object.fromEntries(new URLSearchParams(qs));
}

// ── GET handler ───────────────────────────────────────────────────────────────
async function handleGet(url, matches) {
  const path = url.split('?')[0];
  const params = parseQuery(url);

  if (path === '/matches' || path === '/matches/') {
    let list = matches;
    if (params.stage) list = list.filter((m) => m.stage === params.stage);
    if (params.group) list = list.filter((m) => m.group_name === params.group);
    if (params.status) list = list.filter((m) => m.status === params.status);
    return list;
  }

  if (path === '/matches/live') return matches.filter((m) => m.status === 'live');

  if (path.match(/^\/matches\/\d+$/)) {
    const id = parseInt(path.split('/')[2]);
    return matches.find((m) => m.id === id) || null;
  }

  if (path === '/predictions/my') {
    const preds = getPreds();
    return matches
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
    return getPreds()[matchId] || null;
  }

  if (path === '/bracket') return MOCK_BRACKET;

  if (path === '/leaderboard') {
    const preds = getPreds();
    let myTotal = 0, myExact = 0, myCorrect = 0;
    for (const p of Object.values(preds)) {
      myTotal += p.points_earned || 0;
      if (p.points_earned === 3) myExact++;
      else if (p.points_earned === 2) myCorrect++;
    }
    const token = localStorage.getItem('wc2026_token') || '';
    const currentUsername = token.startsWith('standalone-') ? token.replace('standalone-', '') : '';
    return MOCK_LEADERBOARD
      .map((e) =>
        currentUsername && e.username === currentUsername
          ? { ...e, total_points: myTotal, exact_scores: myExact, correct_results: myCorrect }
          : e
      )
      .sort((a, b) => b.total_points - a.total_points || a.display_name.localeCompare(b.display_name))
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }

  return null;
}

// ── POST handler ──────────────────────────────────────────────────────────────
function handlePost(url, data, matches) {
  if (url.match(/^\/predictions\/\d+$/)) {
    const matchId = parseInt(url.split('/')[2]);
    const { homeScore, awayScore } = data;
    const match = matches.find((m) => m.id === matchId);
    let points = 0;
    if (match?.status === 'finished' && match.home_score !== null) {
      points = calculatePoints(
        { home_score: homeScore, away_score: awayScore },
        { home_score: match.home_score, away_score: match.away_score }
      );
    }
    const preds = getPreds();
    preds[matchId] = { match_id: matchId, home_score: homeScore, away_score: awayScore, points_earned: points };
    savePreds(preds);
    return { prediction: preds[matchId] };
  }
  return null;
}

// ── Interfaz pública (misma que axios) ───────────────────────────────────────
const liveApi = {
  get: async (url) => {
    const matches = await fetchMatches();
    return { data: await handleGet(url, matches) };
  },
  post: async (url, data) => {
    const matches = await fetchMatches();
    return { data: handlePost(url, data, matches) };
  },
  defaults: { headers: { common: {} } },
  interceptors: { request: { use: () => {} }, response: { use: () => {} } },
};

export default liveApi;
