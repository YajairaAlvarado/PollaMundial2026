import { supabase } from './supabase';
import { calculatePoints } from './scoring';

function parseQuery(url) {
  const qs = url.includes('?') ? url.split('?')[1] : '';
  return Object.fromEntries(new URLSearchParams(qs));
}

async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw Object.assign(new Error('No autenticado'), { response: { status: 401 } });
  return user;
}

async function get(url) {
  const path = url.split('?')[0];
  const params = parseQuery(url);

  // GET /matches
  if (path === '/matches' || path === '/matches/') {
    let q = supabase.from('matches').select('*').order('match_date');
    if (params.stage)  q = q.eq('stage', params.stage);
    if (params.group)  q = q.eq('group_name', params.group);
    if (params.status) q = q.eq('status', params.status);
    const { data, error } = await q;
    if (error) throw error;
    return { data };
  }

  // GET /matches/live
  if (path === '/matches/live') {
    const { data, error } = await supabase.from('matches').select('*').eq('status', 'live').order('match_date');
    if (error) throw error;
    return { data };
  }

  // GET /matches/:id
  const matchById = path.match(/^\/matches\/(\d+)$/);
  if (matchById) {
    const { data, error } = await supabase.from('matches').select('*').eq('id', matchById[1]).single();
    if (error) throw error;
    return { data };
  }

  // GET /predictions/my
  if (path === '/predictions/my') {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from('predictions')
      .select('*, match:matches(*)')
      .eq('user_id', user.id);
    if (error) throw error;
    const normalized = data.map((p) => ({
      id: p.id,
      match_id: p.match_id,
      home_team: p.match.home_team,
      away_team: p.match.away_team,
      home_code: p.match.home_code,
      away_code: p.match.away_code,
      group_name: p.match.group_name,
      match_date: p.match.match_date,
      status: p.match.status,
      home_score: p.home_score,
      away_score: p.away_score,
      actual_home: p.match.home_score,
      actual_away: p.match.away_score,
      points_earned: p.points_earned,
    }));
    return { data: normalized };
  }

  // GET /predictions/match/:matchId
  const predByMatch = path.match(/^\/predictions\/match\/(\d+)$/);
  if (predByMatch) {
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from('predictions')
      .select('*')
      .eq('user_id', user.id)
      .eq('match_id', predByMatch[1])
      .maybeSingle();
    if (error) throw error;
    return { data };
  }

  // GET /leaderboard
  if (path === '/leaderboard') {
    const { data, error } = await supabase.from('leaderboard').select('*');
    if (error) throw error;
    return { data };
  }

  // GET /auth/me
  if (path === '/auth/me') {
    const user = await getCurrentUser();
    const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
    return { data: profile };
  }

  throw new Error(`[supabaseApi] Ruta desconocida GET: ${path}`);
}

async function post(url, body = {}) {
  // POST /predictions/:matchId
  const predPost = url.match(/^\/predictions\/(\d+)$/);
  if (predPost) {
    const matchId = parseInt(predPost[1]);
    const user = await getCurrentUser();
    const { homeScore, awayScore } = body;

    const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single();
    const points = match?.status === 'finished'
      ? calculatePoints(
          { home_score: homeScore, away_score: awayScore },
          { home_score: match.home_score, away_score: match.away_score }
        )
      : null;

    const { data, error } = await supabase
      .from('predictions')
      .upsert(
        { user_id: user.id, match_id: matchId, home_score: homeScore, away_score: awayScore, points_earned: points, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,match_id' }
      )
      .select()
      .single();
    if (error) throw error;
    return { data };
  }

  throw new Error(`[supabaseApi] Ruta desconocida POST: ${url}`);
}

async function put(url, body = {}) {
  // PUT /auth/password
  if (url === '/auth/password') {
    const { error } = await supabase.auth.updateUser({ password: body.newPassword });
    if (error) throw { response: { data: { error: error.message } } };
    return { data: { success: true } };
  }

  // PUT /matches/:id/result  (admin)
  const matchResult = url.match(/^\/matches\/(\d+)\/result$/);
  if (matchResult) {
    const { data, error } = await supabase
      .from('matches')
      .update({ home_score: body.homeScore, away_score: body.awayScore, status: 'finished' })
      .eq('id', matchResult[1])
      .select()
      .single();
    if (error) throw error;
    return { data };
  }

  // PUT /matches/:id/status  (admin)
  const matchStatus = url.match(/^\/matches\/(\d+)\/status$/);
  if (matchStatus) {
    const { data, error } = await supabase
      .from('matches')
      .update({ status: body.status })
      .eq('id', matchStatus[1])
      .select()
      .single();
    if (error) throw error;
    return { data };
  }

  throw new Error(`[supabaseApi] Ruta desconocida PUT: ${url}`);
}

const supabaseApi = {
  get,
  post,
  put,
  defaults: { headers: { common: {} } },
  interceptors: { request: { use: () => {} }, response: { use: () => {} } },
};

export default supabaseApi;
