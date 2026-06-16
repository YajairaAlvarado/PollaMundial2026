import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import api from '../utils/api';
import { format, parseISO, startOfDay, endOfDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, ChevronDown, ChevronUp, Search, Trophy, Target, CheckCircle, Clock, Activity, Zap, RefreshCw, Save, Minus, Plus } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { getMatchResultFromApi } from '../utils/footballApi';

// ─── Pestaña Usuarios ────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { key: 'nombre',    label: 'Nombre A–Z' },
  { key: 'puntos',    label: 'Más puntos' },
  { key: 'hechas',    label: 'Más predicciones' },
  { key: 'faltantes', label: 'Menos predicciones' },
];

function TabUsuarios({ users }) {
  const [search,      setSearch]      = useState('');
  const [sortBy,      setSortBy]      = useState('puntos');
  const [expanded,    setExpanded]    = useState(null);
  const [predictions, setPredictions] = useState({});
  const [loadingPreds,setLoadingPreds]= useState(false);
  const [summaries,   setSummaries]   = useState({}); // { [userId]: { points, made } }
  const [pastMatches, setPastMatches] = useState(0);

  // Cargar resumen de predicciones de todos los usuarios al montar
  useEffect(() => {
    // Solo partidos ya iniciados (no futuros)
    supabase.from('matches')
      .select('id', { count: 'exact', head: true })
      .lt('match_date', new Date().toISOString())
      .then(({ count }) => setPastMatches(count || 0));

    supabase.from('predictions').select('user_id, points_earned')
      .then(({ data }) => {
        const map = {};
        (data || []).forEach((p) => {
          if (!map[p.user_id]) map[p.user_id] = { points: 0, made: 0 };
          map[p.user_id].points += p.points_earned || 0;
          map[p.user_id].made   += 1;
        });
        setSummaries(map);
      });
  }, []);

  const toggleUser = useCallback(async (userId) => {
    if (expanded === userId) { setExpanded(null); return; }
    setExpanded(userId);
    if (predictions[userId]) return;
    setLoadingPreds(true);
    const { data } = await supabase
      .from('predictions')
      .select('*, match:matches(home_team, away_team, home_code, away_code, group_name, match_date, home_score, away_score, status)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setPredictions((prev) => ({ ...prev, [userId]: data || [] }));
    setLoadingPreds(false);
  }, [expanded, predictions]);

  const statsFor = (preds) => ({
    total:   preds.reduce((s, p) => s + (p.points_earned || 0), 0),
    exact:   preds.filter((p) => p.points_earned === 3).length,
    correct: preds.filter((p) => p.points_earned === 2).length,
    made:    preds.length,
  });

  const filtered = users
    .filter((u) =>
      u.display_name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const sa = summaries[a.id] || { points: 0, made: 0 };
      const sb = summaries[b.id] || { points: 0, made: 0 };
      if (sortBy === 'nombre')    return a.display_name.localeCompare(b.display_name);
      if (sortBy === 'puntos')    return sb.points - sa.points;
      if (sortBy === 'hechas')    return sb.made - sa.made;
      if (sortBy === 'faltantes') return sa.made - sb.made;
      return 0;
    });

  return (
    <>
      {/* Búsqueda + ordenamiento */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            type="text"
            placeholder="Buscar por nombre o usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {SORT_OPTIONS.map((s) => (
            <button key={s.key} onClick={() => setSortBy(s.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: sortBy === s.key ? 'rgba(228,0,43,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${sortBy === s.key ? 'rgba(228,0,43,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: sortBy === s.key ? '#FF4466' : 'rgba(255,255,255,0.4)',
              }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((u, idx) => {
          const sum    = summaries[u.id] || { points: 0, made: 0 };
          const missing= Math.max(0, pastMatches - sum.made);
          const preds  = predictions[u.id] || [];
          const isOpen = expanded === u.id;
          const stats  = isOpen && preds.length > 0 ? statsFor(preds) : null;

          return (
            <div key={u.id} className="rounded-xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>

              <button onClick={() => toggleUser(u.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/5">

                {/* Posición */}
                <span className="text-white/20 text-xs w-5 text-right flex-shrink-0">{idx + 1}</span>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-red-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {u.avatar_initials}
                </div>

                {/* Nombre */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">
                    {u.display_name}
                    {u.is_admin && <span className="ml-2 text-yellow-400 text-xs">★</span>}
                  </p>
                  <p className="text-white/35 text-xs">{u.username}</p>
                </div>

                {/* Stats resumen — siempre visibles */}
                <div className="flex items-center gap-3 mr-1 flex-shrink-0">
                  <div className="text-center hidden sm:block">
                    <p className="text-yellow-400 text-sm font-black leading-none">{sum.points}</p>
                    <p className="text-white/30 text-[10px]">pts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-green-400 text-sm font-bold leading-none">{sum.made}</p>
                    <p className="text-white/30 text-[10px]">pred.</p>
                  </div>
                  <div className="text-center">
                    <p className="text-red-400 text-sm font-bold leading-none">{missing < 0 ? 0 : missing}</p>
                    <p className="text-white/30 text-[10px]">falt.</p>
                  </div>
                </div>

                {isOpen ? <ChevronUp size={16} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />}
              </button>

              {isOpen && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {loadingPreds && !predictions[u.id] ? (
                    <div className="py-6 flex justify-center"><LoadingSpinner size="sm" /></div>
                  ) : preds.length === 0 ? (
                    <p className="text-white/30 text-sm text-center py-6">Sin predicciones aún</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-4 gap-2 px-4 py-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
                        {[
                          { icon: <Trophy size={13} />,      label: 'Puntos',       value: stats?.total,   color: '#FBBF24' },
                          { icon: <CheckCircle size={13} />, label: 'Exactos',      value: stats?.exact,   color: '#34D399' },
                          { icon: <Target size={13} />,      label: 'Correctos',    value: stats?.correct, color: '#60A5FA' },
                          { icon: <Clock size={13} />,       label: 'Predicciones', value: stats?.made,    color: 'rgba(255,255,255,0.4)' },
                        ].map((s) => (
                          <div key={s.label} className="text-center">
                            <div className="flex justify-center mb-0.5" style={{ color: s.color }}>{s.icon}</div>
                            <p className="text-white font-bold text-sm">{s.value ?? '–'}</p>
                            <p className="text-white/30 text-[10px]">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="px-4 py-3 space-y-1.5 max-h-72 overflow-y-auto">
                        {preds.map((p) => {
                          const m       = p.match;
                          const ptsCls  = p.points_earned === 3 ? '#34D399' : p.points_earned === 2 ? '#60A5FA' : p.points_earned === 0 ? '#F87171' : 'rgba(255,255,255,0.3)';
                          const savedAt = format(parseISO(p.created_at), "d MMM HH:mm", { locale: es });
                          return (
                            <div key={p.id} className="flex items-center gap-2 text-xs rounded-lg px-3 py-2"
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <img src={`https://flagcdn.com/16x12/${m.home_code}.png`} alt="" className="rounded" />
                              <span className="text-white/60 truncate hidden sm:inline">{m.home_team}</span>
                              <span className="text-white font-bold">{p.home_score}–{p.away_score}</span>
                              <span className="text-white/60 truncate hidden sm:inline">{m.away_team}</span>
                              <img src={`https://flagcdn.com/16x12/${m.away_code}.png`} alt="" className="rounded" />
                              {m.status === 'finished' && (
                                <span className="text-white/40 ml-1">({m.home_score}–{m.away_score})</span>
                              )}
                              <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                                <span style={{ color: ptsCls }} className="font-bold">
                                  {p.points_earned !== null ? `${p.points_earned} pts` : '–'}
                                </span>
                                <span className="text-white/25">{savedAt}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Pestaña Accesos ─────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Hoy',             days: 0    },
  { label: 'Últimos 7 días',  days: 7    },
  { label: 'Últimos 30 días', days: 30   },
  { label: 'Todo',            days: null },
];

const PAGE_LABELS = {
  inicio:          { label: 'Inicio',      icon: '🏠' },
  partidos:        { label: 'Partidos',    icon: '⚽' },
  posiciones:      { label: 'Posiciones',  icon: '🏆' },
  vs:              { label: 'VS (visita)', icon: '👊' },
  vs_comparacion:  { label: 'VS (comparó)',icon: '⚡' },
};

function AccesosUserDetail({ userId, desde, hasta, users }) {
  const [data,    setData]    = useState(null);
  const [nudges,  setNudges]  = useState([]);
  const [loading, setLoading] = useState(true);

  const nameMap = React.useMemo(() => {
    const m = {};
    (users || []).forEach((u) => { m[u.id] = u.display_name; });
    return m;
  }, [users]);

  useEffect(() => {
    const from = startOfDay(new Date(desde + 'T00:00:00')).toISOString();
    const to   = endOfDay(new Date(hasta + 'T00:00:00')).toISOString();
    Promise.all([
      supabase.from('page_views')
        .select('page, metadata, created_at')
        .eq('user_id', userId)
        .gte('created_at', from).lte('created_at', to)
        .order('created_at', { ascending: false }),
      supabase.from('nudges')
        .select('to_user_id, type, message, tone, created_at')
        .eq('from_user_id', userId)
        .gte('created_at', from).lte('created_at', to)
        .order('created_at', { ascending: false }),
    ]).then(([pvRes, ndRes]) => {
      if (pvRes.error) { setData(null); setLoading(false); return; }
      setData(pvRes.data || []);
      setNudges(ndRes.data || []);
      setLoading(false);
    });
  }, [userId, desde, hasta]);

  if (loading) return <div className="py-3 flex justify-center"><LoadingSpinner size="sm" /></div>;
  if (!data) return <p className="text-xs py-3 text-center" style={{ color: '#f87171' }}>No se pudo cargar (tabla page_views no existe aún)</p>;
  if (data.length === 0 && nudges.length === 0) return <p className="text-xs py-3 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin actividad en este período</p>;

  // Agrupar por página
  const byPage = {};
  data.forEach((r) => {
    if (!byPage[r.page]) byPage[r.page] = [];
    byPage[r.page].push(r);
  });

  const vsComps = byPage['vs_comparacion'] || [];

  return (
    <div className="space-y-2 py-2">
      {/* Resumen por página */}
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(byPage).map(([page, rows]) => {
          const cfg = PAGE_LABELS[page] || { label: page, icon: '📄' };
          return (
            <div key={page} className="rounded-lg px-3 py-2 flex items-center gap-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-base flex-shrink-0">{cfg.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-semibold truncate">{cfg.label}</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {rows.length} {rows.length === 1 ? 'vez' : 'veces'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparaciones VS */}
      {vsComps.length > 0 && (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.25)' }}>
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
            ⚡ Comparaciones VS ({vsComps.length})
          </div>
          <div className="max-h-36 overflow-y-auto">
            {vsComps.map((r, i) => {
              const meta = r.metadata || {};
              const dateStr = format(parseISO(r.created_at), "d MMM · HH:mm", { locale: es });
              return (
                <div key={i} className="flex items-center justify-between px-3 py-1.5 text-xs"
                  style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ color: 'rgba(255,255,255,0.75)' }}>
                    <span style={{ color: '#60a5fa' }}>{meta.jugador_a || '?'}</span>
                    <span className="mx-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>vs</span>
                    <span style={{ color: '#f472b6' }}>{meta.jugador_b || '?'}</span>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>{dateStr}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Guiños enviados */}
      {nudges.length > 0 && (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(167,139,250,0.3)' }}>
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>
            💬 Guiños enviados ({nudges.length})
          </div>
          <div className="max-h-40 overflow-y-auto">
            {nudges.map((n, i) => {
              const dateStr = format(parseISO(n.created_at), "d MMM · HH:mm", { locale: es });
              const dest = nameMap[n.to_user_id] || 'usuario';
              return (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs"
                  style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ fontSize: 15 }}>{n.tone || '💬'}</span>
                  <div className="min-w-0 flex-1">
                    <p style={{ color: 'rgba(255,255,255,0.8)' }}>
                      a <span style={{ color: '#c4b5fd', fontWeight: 600 }}>{dest}</span>
                      {n.type === 'match_wink' && <span style={{ color: 'rgba(255,255,255,0.4)' }}> · guiño de partido</span>}
                    </p>
                    {n.message && <p className="truncate" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>"{n.message}"</p>}
                  </div>
                  <span className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>{dateStr}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const ACTION_FILTERS = [
  { key: 'inicio',         label: '🏠 Inicio' },
  { key: 'partidos',       label: '⚽ Partidos' },
  { key: 'posiciones',     label: '🏆 Posiciones' },
  { key: 'vs',             label: '👊 VS (visita)' },
  { key: 'vs_comparacion', label: '⚡ VS (comparó)' },
  { key: 'nudges',         label: '💬 Guiños' },
];

function TabAccesos({ users }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [desde,     setDesde]     = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [hasta,     setHasta]     = useState(today);
  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [preset,    setPreset]    = useState(1);
  const [expanded,  setExpanded]  = useState(null);
  const [actFilter, setActFilter] = useState([]); // acciones seleccionadas (OR)

  const toggleAction = (key) =>
    setActFilter((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  const rowHasAction = (r, key) =>
    key === 'nudges' ? r.nudgeCount > 0 : r.pages?.has(key);

  const filteredRows = actFilter.length === 0
    ? rows
    : rows.filter((r) => actFilter.some((k) => rowHasAction(r, k)));

  const applyPreset = (idx) => {
    setPreset(idx);
    const p = PRESETS[idx];
    if (p.days === null) {
      setDesde('2026-01-01');
      setHasta(today);
    } else if (p.days === 0) {
      setDesde(today);
      setHasta(today);
    } else {
      setDesde(format(subDays(new Date(), p.days), 'yyyy-MM-dd'));
      setHasta(today);
    }
  };

  useEffect(() => {
    setExpanded(null);
    async function load() {
      setLoading(true);
      const from = startOfDay(new Date(desde + 'T00:00:00')).toISOString();
      const to   = endOfDay(new Date(hasta + 'T00:00:00')).toISOString();

      // logins
      const { data: logs } = await supabase
        .from('login_logs')
        .select('user_id, logged_in_at')
        .gte('logged_in_at', from)
        .lte('logged_in_at', to);

      // page_views summary
      const { data: pvRows } = await supabase
        .from('page_views')
        .select('user_id, page, created_at')
        .gte('created_at', from)
        .lte('created_at', to);

      // guiños enviados
      const { data: ndRows } = await supabase
        .from('nudges')
        .select('from_user_id, created_at')
        .gte('created_at', from)
        .lte('created_at', to);

      const loginCounts = {}, lastAccess = {};
      (logs || []).forEach((l) => {
        loginCounts[l.user_id] = (loginCounts[l.user_id] || 0) + 1;
        if (!lastAccess[l.user_id] || l.logged_in_at > lastAccess[l.user_id]) lastAccess[l.user_id] = l.logged_in_at;
      });

      const pvCounts = {}, pvLast = {}, pagesByUser = {};
      (pvRows || []).forEach((r) => {
        pvCounts[r.user_id] = (pvCounts[r.user_id] || 0) + 1;
        if (!pvLast[r.user_id] || r.created_at > pvLast[r.user_id]) pvLast[r.user_id] = r.created_at;
        if (!pagesByUser[r.user_id]) pagesByUser[r.user_id] = new Set();
        pagesByUser[r.user_id].add(r.page);
      });

      const nudgeCounts = {};
      (ndRows || []).forEach((n) => {
        nudgeCounts[n.from_user_id] = (nudgeCounts[n.from_user_id] || 0) + 1;
      });

      const result = users.map((u) => ({
        ...u,
        loginCount: loginCounts[u.id] || 0,
        pvCount:    pvCounts[u.id]    || 0,
        nudgeCount: nudgeCounts[u.id] || 0,
        pages:      pagesByUser[u.id] || new Set(),
        lastAt:     lastAccess[u.id] || pvLast[u.id] || null,
      })).sort((a, b) => (b.loginCount + b.pvCount) - (a.loginCount + a.pvCount));

      setRows(result);
      setLoading(false);
    }
    load();
  }, [desde, hasta, users]);

  const conAcceso = rows.filter((r) => r.loginCount > 0).length;
  const sinAcceso = rows.filter((r) => r.loginCount === 0).length;

  return (
    <>
      {/* Filtros */}
      <div className="mb-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => applyPreset(i)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: preset === i ? 'rgba(228,0,43,0.25)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${preset === i ? 'rgba(228,0,43,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: preset === i ? '#FF4466' : 'rgba(255,255,255,0.5)',
              }}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-xs">Desde</span>
            <input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPreset(-1); }}
              className="rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', colorScheme: 'dark' }} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/40 text-xs">Hasta</span>
            <input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPreset(-1); }}
              className="rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', colorScheme: 'dark' }} />
          </div>
        </div>

        {/* Filtro por acción */}
        <div className="flex gap-2 flex-wrap items-center pt-1">
          <span className="text-white/40 text-xs mr-1">Acción:</span>
          {ACTION_FILTERS.map((a) => {
            const on = actFilter.includes(a.key);
            return (
              <button key={a.key} onClick={() => toggleAction(a.key)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: on ? 'rgba(96,165,250,0.22)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${on ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  color: on ? '#93c5fd' : 'rgba(255,255,255,0.5)',
                }}>
                {a.label}
              </button>
            );
          })}
          {actFilter.length > 0 && (
            <button onClick={() => setActFilter([])}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
              ✕ Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Total usuarios', value: rows.length, color: 'rgba(255,255,255,0.6)' },
          { label: 'Con acceso',     value: conAcceso,   color: '#34D399' },
          { label: 'Sin acceso',     value: sinAcceso,   color: '#F87171' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl px-4 py-3 text-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="font-bold text-xl" style={{ color: s.color }}>{s.value}</p>
            <p className="text-white/30 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabla con acordeón */}
      {loading ? (
        <div className="py-10 flex justify-center"><LoadingSpinner size="md" text="Cargando accesos..." /></div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="grid grid-cols-12 px-4 py-2 text-xs font-semibold uppercase tracking-wider"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
            <span className="col-span-1 text-center">#</span>
            <span className="col-span-4">Usuario</span>
            <span className="col-span-2 text-center">Logins</span>
            <span className="col-span-2 text-center">Acciones</span>
            <span className="col-span-3">Último acceso</span>
          </div>

          {filteredRows.length === 0 && (
            <p className="text-center py-6 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Nadie usó {actFilter.length > 1 ? 'esas acciones' : 'esa acción'} en este período
            </p>
          )}
          {filteredRows.map((r, idx) => {
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button
                  onClick={() => setExpanded(isOpen ? null : r.id)}
                  className="w-full grid grid-cols-12 px-4 py-3 items-center text-left transition-all hover:bg-white/5"
                  style={{ background: r.loginCount === 0 ? 'rgba(248,113,113,0.03)' : 'transparent' }}>
                  <span className="col-span-1 text-center text-white/30 text-xs">{idx + 1}</span>
                  <div className="col-span-4 flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-red-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {r.avatar_initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{r.display_name}</p>
                      <p className="text-white/30 text-xs truncate">{r.username}</p>
                    </div>
                  </div>
                  <div className="col-span-2 text-center">
                    {r.loginCount > 0
                      ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399' }}>
                          {r.loginCount}×
                        </span>
                      : <span className="inline-block px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171' }}>0</span>}
                  </div>
                  <div className="col-span-2 text-center">
                    {r.pvCount > 0
                      ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}>
                          {r.pvCount}×
                        </span>
                      : <span className="text-white/20 text-xs">—</span>}
                  </div>
                  <div className="col-span-3 flex items-center justify-between">
                    {r.lastAt
                      ? <span className="text-white/50 text-xs">{format(parseISO(r.lastAt), "d MMM · HH:mm", { locale: es })}</span>
                      : <span className="text-white/20 text-xs">—</span>}
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                    <AccesosUserDetail userId={r.id} desde={desde} hasta={hasta} users={users} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── Pestaña Resultados ──────────────────────────────────────────────────────

// Estado del flujo por partido: 'idle' | 'fetching' | 'fetched' | 'manual' | 'saving' | 'saved'
function TabResultados() {
  const [matches,  setMatches]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [scores,   setScores]   = useState({});  // { [id]: { home, away } }
  const [state,    setState]    = useState({});  // { [id]: 'idle'|'fetching'|'fetched'|'manual'|'saving'|'saved' }
  const [error,    setError]    = useState({});  // { [id]: string }
  const [done,     setDone]     = useState({});  // { [id]: { predictionsUpdated } }

  useEffect(() => {
    supabase
      .from('matches')
      .select('*')
      .lt('match_date', new Date().toISOString())
      .neq('status', 'finished')
      .order('match_date')
      .then(({ data }) => {
        setMatches(data || []);
        const initScores = {}, initState = {};
        (data || []).forEach((m) => {
          initScores[m.id] = { home: 0, away: 0 };
          initState[m.id]  = 'idle';
        });
        setScores(initScores);
        setState(initState);
        setLoading(false);
      });
  }, []);

  const setMatchState = (id, s) => setState((p) => ({ ...p, [id]: s }));
  const setMatchError = (id, e) => setError((p) => ({ ...p, [id]: e }));

  const fetchFromApi = async (match) => {
    setMatchState(match.id, 'fetching');
    setMatchError(match.id, '');
    try {
      const result = await getMatchResultFromApi(match);
      if (result) {
        setScores((p) => ({ ...p, [match.id]: { home: result.home, away: result.away } }));
        setMatchState(match.id, 'fetched');
      } else {
        setMatchError(match.id, 'No encontrado en la API — ingresa el resultado manualmente.');
        setMatchState(match.id, 'manual');
      }
    } catch (e) {
      setMatchError(match.id, e.message + ' — ingresa el resultado manualmente.');
      setMatchState(match.id, 'manual');
    }
  };

  const saveResult = async (match) => {
    setMatchState(match.id, 'saving');
    setMatchError(match.id, '');
    try {
      // 1. Guardar snapshot ANTES del resultado (captura estado previo)
      try {
        const { data: lb } = await api.get('/leaderboard');
        await api.post('/leaderboard/snapshot', { entries: lb });
      } catch { /* snapshot falla silenciosamente, no bloquea */ }
      // 2. Guardar el resultado (recalcula puntos)
      const { home, away } = scores[match.id];
      const res = await api.put(`/matches/${match.id}/result`, { homeScore: home, awayScore: away });
      setDone((p) => ({ ...p, [match.id]: { predictionsUpdated: res.data.predictionsUpdated } }));
      setMatches((prev) => prev.filter((m) => m.id !== match.id));
    } catch {
      setMatchError(match.id, 'Error guardando resultado');
      setMatchState(match.id, 'fetched');
    }
  };

  const changeScore = (id, side, delta) =>
    setScores((p) => ({ ...p, [id]: { ...p[id], [side]: Math.max(0, (p[id]?.[side] ?? 0) + delta) } }));

  if (loading) return <div className="py-10 flex justify-center"><LoadingSpinner size="md" text="Cargando partidos..." /></div>;

  if (matches.length === 0 && Object.keys(done).length === 0)
    return (
      <div className="py-16 text-center">
        <CheckCircle size={32} className="mx-auto mb-3" style={{ color: '#34D399' }} />
        <p className="text-white font-semibold">Todos los resultados están al día</p>
        <p className="text-white/40 text-sm mt-1">No hay partidos jugados sin resultado pendiente</p>
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Resumen de guardados */}
      {Object.keys(done).length > 0 && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-2"
          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
          <CheckCircle size={14} style={{ color: '#34D399' }} />
          <p className="text-sm" style={{ color: '#6EE7B7' }}>
            {Object.keys(done).length} resultado{Object.keys(done).length > 1 ? 's' : ''} guardado{Object.keys(done).length > 1 ? 's' : ''} · {Object.values(done).reduce((s, d) => s + d.predictionsUpdated, 0)} predicciones actualizadas
          </p>
        </div>
      )}

      {matches.map((match) => {
        const sc      = scores[match.id] ?? { home: 0, away: 0 };
        const st      = state[match.id] ?? 'idle';
        const errMsg  = error[match.id];
        const dateStr = format(parseISO(match.match_date), "d MMM · HH:mm", { locale: es });
        const isBusy  = st === 'fetching' || st === 'saving';
        const showManual = st === 'fetched' || st === 'manual';

        return (
          <div key={match.id} className="rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>

            {/* Header del partido */}
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2 min-w-0">
                {match.home_code && <img src={`https://flagcdn.com/20x15/${match.home_code}.png`} alt="" className="rounded flex-shrink-0" />}
                <span className="text-white text-sm font-bold truncate">{match.home_team}</span>
                <span className="text-white/30 text-xs flex-shrink-0">vs</span>
                <span className="text-white text-sm font-bold truncate">{match.away_team}</span>
                {match.away_code && <img src={`https://flagcdn.com/20x15/${match.away_code}.png`} alt="" className="rounded flex-shrink-0" />}
              </div>
              <span className="text-white/35 text-xs flex-shrink-0 ml-2">{dateStr}</span>
            </div>

            {/* Estado idle: botón principal "Buscar resultado en internet" */}
            {st === 'idle' && (
              <div className="px-4 py-4 flex flex-col items-center gap-3">
                <button
                  onClick={() => fetchFromApi(match)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all"
                  style={{ background: 'linear-gradient(135deg,rgba(96,165,250,0.2),rgba(139,92,246,0.2))', border: '1px solid rgba(96,165,250,0.4)', color: '#93c5fd' }}>
                  <Zap size={15} />
                  Buscar resultado en internet
                </button>
                <button
                  onClick={() => setMatchState(match.id, 'manual')}
                  className="text-xs font-medium transition-all"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}>
                  Ingresar manualmente
                </button>
              </div>
            )}

            {/* Estado fetching */}
            {st === 'fetching' && (
              <div className="px-4 py-5 flex items-center justify-center gap-2" style={{ color: '#93c5fd' }}>
                <RefreshCw size={16} className="animate-spin" />
                <span className="text-sm font-semibold">Buscando resultado en football-data.org...</span>
              </div>
            )}

            {/* Estado fetched o manual: mostrar marcador + guardar */}
            {showManual && (
              <div className="px-4 py-4 space-y-3">

                {/* Tag de origen */}
                {st === 'fetched' && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap size={11} style={{ color: '#34D399' }} />
                    <span className="text-xs font-semibold" style={{ color: '#34D399' }}>Resultado obtenido automáticamente — verifica antes de guardar</span>
                  </div>
                )}
                {st === 'manual' && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Ingreso manual</span>
                    <button onClick={() => fetchFromApi(match)} className="text-xs underline" style={{ color: '#93c5fd' }}>
                      Intentar API de nuevo
                    </button>
                  </div>
                )}

                {/* Score inputs */}
                <div className="flex items-center gap-3">
                  {/* Home */}
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => changeScore(match.id, 'home', -1)}
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <Minus size={13} className="text-white" />
                    </button>
                    <input type="number" min="0" max="20" value={sc.home}
                      onChange={(e) => setScores((p) => ({ ...p, [match.id]: { ...p[match.id], home: Math.max(0, parseInt(e.target.value) || 0) } }))}
                      className="w-14 text-center text-white text-2xl font-black rounded-lg py-1.5 outline-none"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }} />
                    <button onClick={() => changeScore(match.id, 'home', 1)}
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <Plus size={13} className="text-white" />
                    </button>
                  </div>

                  <span className="text-white/30 text-2xl font-bold">–</span>

                  {/* Away */}
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => changeScore(match.id, 'away', -1)}
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <Minus size={13} className="text-white" />
                    </button>
                    <input type="number" min="0" max="20" value={sc.away}
                      onChange={(e) => setScores((p) => ({ ...p, [match.id]: { ...p[match.id], away: Math.max(0, parseInt(e.target.value) || 0) } }))}
                      className="w-14 text-center text-white text-2xl font-black rounded-lg py-1.5 outline-none"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }} />
                    <button onClick={() => changeScore(match.id, 'away', 1)}
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <Plus size={13} className="text-white" />
                    </button>
                  </div>

                  {/* Guardar */}
                  <button
                    onClick={() => saveResult(match)}
                    disabled={isBusy}
                    className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-50"
                    style={{ background: 'rgba(52,211,153,0.18)', border: '1px solid rgba(52,211,153,0.35)', color: '#34D399' }}>
                    {st === 'saving' ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    {st === 'saving' ? 'Guardando...' : 'Guardar resultado'}
                  </button>
                </div>

                {/* Cancelar / volver */}
                <button onClick={() => { setMatchState(match.id, 'idle'); setMatchError(match.id, ''); }}
                  className="text-xs transition-all"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.25)'; }}>
                  ← Volver
                </button>
              </div>
            )}

            {/* Error */}
            {errMsg && (
              <div className="px-4 pb-3">
                <p className="text-xs rounded-lg px-3 py-2" style={{ color: '#FCA5A5', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  ⚠ {errMsg}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function Admin() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [tab,       setTab]        = useState('usuarios');
  const [users,     setUsers]      = useState([]);
  const [loadingUsers,  setLoadingUsers]  = useState(true);
  const [savingSnap,    setSavingSnap]    = useState(false);
  const [snapMsg,       setSnapMsg]       = useState('');

  const handleSnapshot = async () => {
    setSavingSnap(true);
    setSnapMsg('');
    try {
      const { data: lb } = await api.get('/leaderboard');
      await api.post('/leaderboard/snapshot', { entries: lb });
      setSnapMsg(`✓ Ranking guardado — ${lb.length} posiciones`);
    } catch (e) {
      setSnapMsg('✗ Error al guardar el ranking');
    } finally {
      setSavingSnap(false);
      setTimeout(() => setSnapMsg(''), 4000);
    }
  };

  useEffect(() => {
    if (user && !user.isAdmin) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    supabase
      .from('users')
      .select('id, username, display_name, avatar_initials, is_admin')
      .order('display_name')
      .then(({ data }) => {
        setUsers(data || []);
        setLoadingUsers(false);
      });
  }, []);

  if (loadingUsers) return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" text="Cargando usuarios..." />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: 'rgba(228,0,43,0.15)' }}>
            <Users size={20} style={{ color: '#E4002B' }} />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl">Panel de Administración</h1>
            <p className="text-white/40 text-sm">{users.length} usuarios registrados</p>
          </div>
        </div>
        <div />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', width: 'fit-content' }}>
        {[
          { key: 'usuarios',   icon: <Users size={14} />,    label: 'Usuarios' },
          { key: 'resultados', icon: <Zap size={14} />,      label: 'Resultados' },
          { key: 'accesos',    icon: <Activity size={14} />, label: 'Accesos' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: tab === t.key ? 'rgba(228,0,43,0.2)' : 'transparent',
              color: tab === t.key ? '#FF4466' : 'rgba(255,255,255,0.4)',
              border: tab === t.key ? '1px solid rgba(228,0,43,0.3)' : '1px solid transparent',
            }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'usuarios'   && <TabUsuarios users={users} />}
      {tab === 'resultados' && <TabResultados />}
      {tab === 'accesos'    && <TabAccesos  users={users} />}
    </div>
  );
}
