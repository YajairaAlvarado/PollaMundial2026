import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/api';
import MatchCard from '../components/MatchCard';
import PredictionModal from '../components/PredictionModal';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';
import { RefreshCw, Users, Search } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import canchaBg from '../assets/andersen-cancha.jpg';

const AVATAR_COLORS = [
  'bg-purple-600','bg-blue-600','bg-emerald-600','bg-rose-600',
  'bg-orange-600','bg-teal-600','bg-indigo-600','bg-pink-600',
];

function FinishedMatchWithPanel({ match, prediction, onPredict }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <MatchCard match={match} prediction={prediction} onPredict={onPredict} />
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full mt-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
        style={{
          background: open
            ? 'rgba(52,211,153,0.12)'
            : 'linear-gradient(90deg, rgba(52,211,153,0.08), rgba(96,165,250,0.08))',
          color: open ? '#34d399' : '#6ee7b7',
          border: `1px solid ${open ? 'rgba(52,211,153,0.35)' : 'rgba(52,211,153,0.2)'}`,
          letterSpacing: '0.01em',
        }}>
        🐸 {open ? 'Ocultar sapada' : '¡Sapea a tus compañeros!'}
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform .2s' }}>▾</span>
      </button>
      {open && <LivePredictionsPanel match={match} />}
    </div>
  );
}

function LivePredictionsPanel({ match }) {
  const [allPreds, setAllPreds]   = useState(null);
  const [loading,  setLoading]    = useState(true);
  const [search,   setSearch]     = useState('');
  const [view,     setView]       = useState('grouped'); // 'grouped' | 'person'
  const [rankMap,  setRankMap]    = useState({});

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/predictions/match/${match.id}/all`),
      api.get('/leaderboard'),
    ]).then(([predRes, lbRes]) => {
      setAllPreds(predRes.data);
      const map = {};
      let rank = 1;
      const lb = lbRes.data ?? [];
      lb.forEach((e, i) => {
        if (i > 0) {
          const prev = lb[i - 1];
          const tied = e.total_points === prev.total_points && e.exact_scores === prev.exact_scores;
          if (!tied) rank = i + 1;
        }
        map[e.username] = rank;
      });
      setRankMap(map);
    })
    .catch(() => setAllPreds([]))
    .finally(() => setLoading(false));
  }, [match.id]);

  const filtered = useMemo(() => {
    if (!allPreds) return [];
    if (!search.trim()) return allPreds;
    const q = search.toLowerCase();
    return allPreds.filter((p) => p.user?.display_name?.toLowerCase().includes(q));
  }, [allPreds, search]);

  // Agrupar por marcador
  const grouped = useMemo(() => {
    const map = {};
    for (const p of filtered) {
      const key = `${p.home_score}-${p.away_score}`;
      if (!map[key]) map[key] = { home: p.home_score, away: p.away_score, users: [] };
      map[key].users.push(p.user);
    }
    // ordenar usuarios dentro de cada grupo por ranking
    for (const g of Object.values(map)) {
      g.users.sort((a, b) => (rankMap[a.username] ?? 999) - (rankMap[b.username] ?? 999));
    }
    return Object.values(map).sort((a, b) => b.users.length - a.users.length);
  }, [filtered]);

  const total = allPreds?.length ?? 0;

  if (loading) return <div className="text-white/40 text-sm py-4 text-center">Cargando predicciones...</div>;
  if (total === 0) return <div className="text-white/40 text-sm py-4 text-center">Nadie predijo este partido.</div>;

  return (
    <div className="mt-4 rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <Users size={14} style={{ color: '#F59E0B' }} />
          <span className="text-white font-bold text-sm">Predicciones del grupo</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>{total}</span>
        </div>
        <div className="flex gap-1">
          {['grouped','person'].map((v) => (
            <button key={v} onClick={() => setView(v)}
              className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-all"
              style={{
                background: view === v ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                color: view === v ? '#F59E0B' : 'rgba(255,255,255,0.4)',
              }}>
              {v === 'grouped' ? 'Por marcador' : 'Por persona'}
            </button>
          ))}
        </div>
      </div>

      {/* Búsqueda */}
      <div className="px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <Search size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            type="text"
            placeholder="Buscar persona..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none text-white text-xs w-full placeholder:text-white/25"
          />
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        {view === 'grouped' ? (
          grouped.length === 0
            ? <p className="text-white/30 text-xs text-center">Sin resultados</p>
            : grouped.map((g) => (
              <div key={`${g.home}-${g.away}`} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-lg text-white">{g.home} – {g.away}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
                    {g.users.length} persona{g.users.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.users.map((u) => u && (
                    <div key={u.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      {rankMap[u.username] && (
                        <span className="text-[9px] font-black flex-shrink-0" style={{ color: '#F59E0B' }}>#{rankMap[u.username]}</span>
                      )}
                      <Avatar username={u.username} initials={u.avatar_initials} displayName={u.display_name} size={20} colorClass={AVATAR_COLORS[u.username?.charCodeAt(0) % AVATAR_COLORS.length]} fontSize={8} />
                      <span className="text-xs text-white/80">{u.display_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
        ) : (
          filtered.length === 0
            ? <p className="text-white/30 text-xs text-center">Sin resultados</p>
            : [...filtered].sort((a, b) => (rankMap[a.user?.username] ?? 999) - (rankMap[b.user?.username] ?? 999)).map((p) => p.user && (
              <div key={p.user.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center gap-2">
                  {rankMap[p.user.username] && (
                    <span className="text-xs font-black w-6 text-right flex-shrink-0" style={{ color: '#F59E0B' }}>#{rankMap[p.user.username]}</span>
                  )}
                  <Avatar username={p.user.username} initials={p.user.avatar_initials} displayName={p.user.display_name} size={28} colorClass={AVATAR_COLORS[p.user.username?.charCodeAt(0) % AVATAR_COLORS.length]} fontSize={9} />
                  <div>
                    <p className="text-white text-xs font-semibold">{p.user.display_name}</p>
                    <p className="text-white/30 text-[10px]">{p.user.department}</p>
                  </div>
                </div>
                <span className="font-black text-base text-white">{p.home_score} – {p.away_score}</span>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

const TZ = 'America/Guayaquil';

function dateLabel(dateStr) {
  const local = toZonedTime(parseISO(dateStr), TZ);
  if (isToday(local))    return 'Hoy';
  if (isTomorrow(local)) return 'Mañana';
  return format(local, "d 'de' MMMM", { locale: es, timeZone: TZ });
}

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'scheduled', label: 'Próximos' },
  { key: 'live', label: '🔴 En Vivo' },
  { key: 'finished', label: 'Finalizados' },
  { key: 'group', label: 'Por Grupo' },
];

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('finished');
  const [selectedGroup, setSelectedGroup] = useState('A');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      let matchUrl = '/matches';
      if (filter === 'group') matchUrl += `?stage=group&group=${selectedGroup}`;

      const [matchRes, predRes] = await Promise.all([
        api.get(matchUrl),
        api.get('/predictions/my'),
      ]);

      const now = new Date();
      const isMatchLive = (m) => {
        const start    = new Date(m.match_date);
        const liveUntil = new Date(start.getTime() + 145 * 60 * 1000);
        return m.status === 'live' || (m.status !== 'finished' && now >= start && now < liveUntil);
      };

      let allMatches = matchRes.data;
      if (filter === 'live')      allMatches = allMatches.filter((m) => isMatchLive(m));
      if (filter === 'finished')  allMatches = allMatches.filter((m) => m.status === 'finished');
      if (filter === 'scheduled') allMatches = allMatches.filter((m) => m.status === 'scheduled' && !isMatchLive(m));

      setMatches(allMatches);

      const predMap = {};
      for (const p of predRes.data) predMap[p.match_id] = p;
      setPredictions(predMap);
    } catch (err) {
      console.error('Matches fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, selectedGroup]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30s when on live tab
  useEffect(() => {
    if (filter !== 'live') return;
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [filter, fetchData]);

  const handlePredictionSaved = (prediction) => {
    setPredictions((prev) => ({
      ...prev,
      [prediction.match_id]: prediction,
    }));
  };

  const STAGE_LABELS = { r32: 'Ronda de 32', r16: 'Octavos de Final', qf: 'Cuartos de Final', sf: 'Semifinales', third_place: 'Tercer Puesto', final: 'Final' };

  // Agrupar partidos según el filtro activo
  const groupedMatches = React.useMemo(() => {
    if (filter === 'group') return { [selectedGroup]: matches };
    // Próximos: agrupar por fecha local (Hoy / Mañana / dd de mes), ascendente
    if (filter === 'scheduled') {
      const grouped = {};
      for (const m of matches) {
        const key = dateLabel(m.match_date);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(m);
      }
      return grouped;
    }
    // Finalizados: agrupar por día, los más recientes arriba
    if (filter === 'finished') {
      const sorted = [...matches].sort((a, b) => new Date(b.match_date) - new Date(a.match_date));
      const grouped = {};
      for (const m of sorted) {
        const key = dateLabel(m.match_date);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(m);
      }
      return grouped;
    }
    // Todos / En Vivo: agrupar por ronda/grupo
    const grouped = {};
    for (const m of matches) {
      const key = m.stage === 'group' ? (m.group_name || 'Grupo') : (STAGE_LABELS[m.stage] || m.stage);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    }
    return grouped;
  }, [matches, filter, selectedGroup]);

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)]"
      style={{ backgroundImage: `url(${canchaBg})`, backgroundSize: 'cover', backgroundPosition: 'center top', backgroundAttachment: 'fixed' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(10,0,0,0.72) 0%, rgba(10,0,0,0.78) 100%)' }} />
    <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Partidos ⚽</h1>
          <p className="text-white/40 text-sm mt-0.5">Copa Mundial 2026 · {matches.length} partidos</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-lg transition-all"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f.key
                ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Group selector */}
      {filter === 'group' && (
        <div className="flex flex-wrap gap-2 mb-6">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                selectedGroup === g
                  ? 'bg-andersen-blue text-yellow-400 border border-yellow-400/40 shadow-lg'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/15 border border-white/10'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSpinner size="lg" text="Cargando partidos..." />
      ) : matches.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-4xl mb-4">⚽</p>
          <p className="text-white/50 text-lg font-semibold">No hay partidos en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-8">
          {filter === 'live' ? (
            // Vista especial En Vivo: partido + panel de predicciones
            matches.map((match) => (
              <div key={match.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="animate-pulse text-red-400 text-xs font-bold">🔴 EN VIVO</span>
                  <span className="text-white/40 text-xs">· {match.group_name ? `Grupo ${match.group_name}` : (STAGE_LABELS[match.stage] || match.stage)}</span>
                </div>
                <MatchCard match={match} prediction={predictions[match.id]} onPredict={(m) => setSelectedMatch(m)} />
                <LivePredictionsPanel match={match} />
              </div>
            ))
          ) : (
            Object.entries(groupedMatches).map(([groupName, groupMatches]) => (
              <div key={groupName}>
                {filter === 'scheduled' || filter === 'finished' ? (
                  <div className="flex items-center gap-3 mb-3">
                    <div className="px-3 py-1 rounded-lg border"
                      style={{ background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' }}>
                      <span className="text-yellow-400 font-black text-sm">
                        {groupName === 'Hoy' ? '📅 Hoy' : groupName === 'Mañana' ? '📅 Mañana' : `📅 ${groupName}`}
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-white/30 text-xs">{groupMatches.length} partidos</span>
                  </div>
                ) : (filter === 'all' || filter === 'group') && (
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-andersen-blue border border-yellow-400/30 flex items-center justify-center">
                      <span className="text-yellow-400 font-black text-sm">{groupName.length <= 2 ? groupName : '⚡'}</span>
                    </div>
                    <h2 className="text-white font-bold">{groupName.length <= 2 ? `Grupo ${groupName}` : groupName}</h2>
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-white/30 text-xs">{groupMatches.length} partidos</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupMatches.map((match) => (
                    filter === 'finished'
                      ? <FinishedMatchWithPanel key={match.id} match={match} prediction={predictions[match.id]} onPredict={(m) => setSelectedMatch(m)} />
                      : <MatchCard key={match.id} match={match} prediction={predictions[match.id]} onPredict={(m) => setSelectedMatch(m)} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Live auto-refresh notice */}
      {filter === 'live' && (
        <p className="text-center text-white/30 text-xs mt-6">
          Actualización automática cada 30 segundos
        </p>
      )}

      {/* Prediction modal */}
      {selectedMatch && (
        <PredictionModal
          match={selectedMatch}
          prediction={predictions[selectedMatch.id]}
          onClose={() => setSelectedMatch(null)}
          onSaved={handlePredictionSaved}
        />
      )}
    </div>
    </div>
  );
}
