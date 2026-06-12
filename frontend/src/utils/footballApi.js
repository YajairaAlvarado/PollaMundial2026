// Supabase Edge Function como proxy (evita CORS)
const EDGE_PROXY = 'https://sumnuonoaysauakylokf.supabase.co/functions/v1/hyper-worker';
const BASE       = 'https://api.football-data.org/v4';


function dateClose(apiUtcDate, ourMatchDate, thresholdMs = 3 * 60 * 60 * 1000) {
  return Math.abs(new Date(apiUtcDate) - new Date(ourMatchDate)) <= thresholdMs;
}

export async function getMatchResultFromApi(match) {
  const key = import.meta.env.VITE_FOOTBALL_DATA_KEY;
  if (!key) throw new Error('Falta VITE_FOOTBALL_DATA_KEY en .env.local');

  // Search ±1 day around match date to handle timezone edge cases
  const matchDay = new Date(match.match_date);
  const from = new Date(matchDay); from.setDate(from.getDate() - 1);
  const to   = new Date(matchDay); to.setDate(to.getDate() + 1);

  const dateFrom = from.toISOString().slice(0, 10);
  const dateTo   = to.toISOString().slice(0, 10);

  const apiUrl  = `${BASE}/competitions/WC/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=FINISHED`;
  const res = await fetch(`${EDGE_PROXY}?url=${encodeURIComponent(apiUrl)}`, {
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
  });

  if (res.status === 403) throw new Error('API key inválida o sin permisos para el Mundial');
  if (res.status === 429) throw new Error('Límite de peticiones alcanzado. Intenta en un momento.');
  if (!res.ok) throw new Error(`Error API football-data.org: ${res.status}`);

  const data = await res.json();
  const apiMatches = data.matches || [];

  // Find the match by date proximity (±3h) — avoids name translation issues
  const found = apiMatches.find((m) => dateClose(m.utcDate, match.match_date));

  if (!found) return null;

  const { home, away } = found.score.fullTime;
  if (home === null || away === null) return null;

  return { home, away, apiMatchDay: found.utcDate };
}
