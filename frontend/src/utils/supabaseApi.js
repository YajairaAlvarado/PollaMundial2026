import { supabase } from './supabase';
import { calculatePoints } from './scoring';
import { isExcluded } from './users';

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

  // GET /predictions/match/:matchId/all — todas las predicciones del partido con info de usuario
  const predByMatchAll = path.match(/^\/predictions\/match\/(\d+)\/all$/);
  if (predByMatchAll) {
    const { data, error } = await supabase
      .from('predictions')
      .select('home_score, away_score, user:users(id, display_name, username, avatar_initials, department)')
      .eq('match_id', predByMatchAll[1]);
    if (error) throw error;
    return { data };
  }

  // GET /bracket
  if (path === '/bracket') {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .in('stage', ['r32', 'r16', 'qf', 'sf', 'final', 'third_place'])
      .order('id');
    if (error) throw error;
    const byStage = (s) => data.filter((m) => m.stage === s);
    return {
      data: {
        r32:        byStage('r32'),
        r16:        byStage('r16'),
        qf:         byStage('qf'),
        sf:         byStage('sf'),
        final:      byStage('final')[0] || null,
        thirdPlace: byStage('third_place')[0] || null,
      },
    };
  }

  // GET /leaderboard
  if (path === '/leaderboard') {
    const [{ data, error }, { data: predCounts }] = await Promise.all([
      supabase
        .from('leaderboard')
        .select('*')
        .order('total_points',   { ascending: false })
        .order('exact_scores',   { ascending: false })
        .order('correct_results',{ ascending: false })
        .order('display_name',   { ascending: true }),
      supabase
        .from('predictions')
        .select('user_id, match:matches!inner(stage)')
        .eq('match.stage', 'group'),
    ]);
    if (error) throw error;
    // contar predicciones de grupo por user_id
    const countMap = {};
    for (const p of (predCounts ?? [])) {
      countMap[p.user_id] = (countMap[p.user_id] ?? 0) + 1;
    }
    // enriquecer leaderboard con total_predictions (excluyendo ex-empleados)
    const enriched = (data ?? [])
      .filter((e) => !isExcluded(e.username))
      .map((e) => ({ ...e, total_predictions: countMap[e.id] ?? 0 }));
    return { data: enriched };
  }

  // GET /users — todos los usuarios (para promedios por departamento)
  if (path === '/users') {
    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, username, avatar_initials, department')
      .order('display_name', { ascending: true });
    if (error) throw error;
    return { data: (data ?? []).filter((u) => !isExcluded(u.username)) };
  }

  // GET /leaderboard/snapshot — último snapshot (captura el estado PRE-resultado)
  if (path === '/leaderboard/snapshot') {
    const { data: dates } = await supabase
      .from('leaderboard_snapshots')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(1);
    if (!dates || dates.length === 0) return { data: [] };
    const lastDate = dates[0].snapshot_date;
    const { data, error } = await supabase
      .from('leaderboard_snapshots')
      .select('username, rank, total_points, exact_scores, snapshot_date')
      .eq('snapshot_date', lastDate);
    if (error) throw error;
    return { data: (data ?? []).filter((r) => !isExcluded(r.username)) };
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

  // POST /leaderboard/snapshot — guarda la "foto" del ranking UNA sola vez al día.
  // Así las flechas comparan contra el estado del día anterior (no contra el último resultado).
  if (url === '/leaderboard/snapshot') {
    const today = new Date().toISOString().slice(0, 10);
    // Si ya hay foto de hoy, no la sobreescribas (conserva el estado previo del día)
    const { data: existing } = await supabase
      .from('leaderboard_snapshots').select('id').eq('snapshot_date', today).limit(1);
    if (existing && existing.length > 0) {
      return { data: { skipped: true, date: today } };
    }
    const rows = body.entries.map((e) => ({
      username:     e.username,
      rank:         e.rank,
      total_points: e.total_points,
      exact_scores: e.exact_scores ?? 0,
      snapshot_date: today,
    }));
    const { error } = await supabase.from('leaderboard_snapshots').insert(rows);
    if (error) throw error;
    return { data: { saved: rows.length, date: today } };
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
    const matchId = parseInt(matchResult[1]);

    // 1. Actualizar el partido
    const { data: match, error } = await supabase
      .from('matches')
      .update({ home_score: body.homeScore, away_score: body.awayScore, status: 'finished' })
      .eq('id', matchId)
      .select()
      .single();
    if (error) throw error;

    // 2. Recalcular puntos de todas las predicciones de este partido
    const { data: preds } = await supabase
      .from('predictions')
      .select('id, home_score, away_score')
      .eq('match_id', matchId);

    if (preds && preds.length > 0) {
      await Promise.all(preds.map((p) =>
        supabase
          .from('predictions')
          .update({
            points_earned: calculatePoints(
              { home_score: p.home_score, away_score: p.away_score },
              { home_score: body.homeScore, away_score: body.awayScore }
            ),
          })
          .eq('id', p.id)
      ));
    }

    return { data: { ...match, predictionsUpdated: preds?.length ?? 0 } };
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
