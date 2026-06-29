import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { supabase } from '../utils/supabase';
import { trackPage } from '../utils/trackPage';
import LeaderboardTable from '../components/LeaderboardTable';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';
import { Trophy, User, Building2, ChevronDown, ChevronUp, Star, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { es } from 'date-fns/locale';

const TZ = 'America/Guayaquil';
// Fecha yyyy-MM-dd en hora de Ecuador
function ecuadorDateStr(dateInput) {
  return formatTz(toZonedTime(dateInput, TZ), 'yyyy-MM-dd', { timeZone: TZ });
}

const AVATAR_COLORS = [
  'bg-purple-600', 'bg-blue-600', 'bg-emerald-600', 'bg-rose-600',
  'bg-orange-600', 'bg-teal-600', 'bg-indigo-600', 'bg-pink-600',
  'bg-cyan-600', 'bg-amber-600', 'bg-lime-600', 'bg-red-600',
];

const DEPT_COLORS = [
  '#F59E0B','#34d399','#60a5fa','#f472b6','#a78bfa',
  '#fb923c','#22d3ee','#4ade80','#f87171','#c084fc',
  '#fbbf24','#38bdf8',
];

function assignRanks(data) {
  let rank = 1;
  return data.map((entry, idx) => {
    if (idx === 0) return { ...entry, rank: 1 };
    const prev = data[idx - 1];
    const tied =
      entry.total_points    === prev.total_points &&
      entry.exact_scores    === prev.exact_scores &&
      entry.correct_results === prev.correct_results;
    if (!tied) rank += 1;
    return { ...entry, rank };
  });
}

function assignDeptRanks(data) {
  let rank = 1;
  return data.map((entry, idx) => {
    if (idx === 0) return { ...entry, rank: 1 };
    const prev = data[idx - 1];
    const tied = Math.abs(entry.avg_points - prev.avg_points) < 0.001;
    if (!tied) rank += 1;
    return { ...entry, rank };
  });
}

const PODIUM_CONFIG = [
  { rank: 1, emoji: '🥇', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.4)',  textColor: '#F59E0B', height: 'h-16' },
  { rank: 2, emoji: '🥈', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', textColor: '#94a3b8', height: 'h-10' },
  { rank: 3, emoji: '🥉', bg: 'rgba(205,127,50,0.12)',  border: 'rgba(205,127,50,0.3)',  textColor: '#cd7f32', height: 'h-6'  },
];

// ── Podio individual ──────────────────────────────────────────────────────────
function PodiumGroup({ entries, config }) {
  return (
    <div className="flex flex-col items-center gap-0">
      <div className="w-full rounded-xl p-3 text-center"
        style={{ background: config.bg, border: `1px solid ${config.border}` }}>
        <div className="text-4xl mb-1">{config.emoji}</div>
        {entries.map((entry) => {
          const colorIdx = entry.username.charCodeAt(0) % AVATAR_COLORS.length;
          return (
            <div key={entry.id || entry.username} className="flex flex-col items-center mb-1">
              <Avatar username={entry.username} initials={entry.avatar_initials} displayName={entry.display_name} size={38} colorClass={AVATAR_COLORS[colorIdx]} className="mx-auto" />
              <p className="text-white font-bold text-xs leading-tight truncate mt-1 max-w-full px-1">
                {entry.display_name}
              </p>
            </div>
          );
        })}
        <p className="font-black text-xl mt-1" style={{ color: config.textColor }}>
          {entries[0]?.total_points ?? 0}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {entries[0]?.exact_scores ?? 0} exactos
          {entries.length > 1 && <span className="ml-1 font-bold" style={{ color: config.textColor }}>×{entries.length}</span>}
        </p>
      </div>
      <div className={`w-full ${config.height} rounded-b-lg`} style={{ background: config.bg, opacity: 0.5 }} />
    </div>
  );
}

// ── Podio departamentos ───────────────────────────────────────────────────────
function DeptPodiumCard({ dept, config, colorIdx }) {
  const color = DEPT_COLORS[colorIdx % DEPT_COLORS.length];
  return (
    <div className="flex flex-col items-center gap-0">
      <div className="w-full rounded-xl p-3 text-center"
        style={{ background: config.bg, border: `1px solid ${config.border}` }}>
        <div className="text-4xl mb-2">{config.emoji}</div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
          style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
          <Building2 size={18} style={{ color }} />
        </div>
        <p className="text-white font-black text-xs leading-tight px-1 mb-1">{dept.department}</p>
        <p className="font-black text-xl" style={{ color: config.textColor }}>
          {dept.avg_points.toFixed(2)}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          pts promedio
        </p>
        <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {dept.active_members}/{dept.total_members} participando
        </p>
      </div>
      <div className={`w-full ${config.height} rounded-b-lg`} style={{ background: config.bg, opacity: 0.5 }} />
    </div>
  );
}

// ── Panel de predicciones de un usuario ──────────────────────────────────────
function UserPredictionsPanel({ userId }) {
  const [rows,    setRows]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      // Todos los partidos finalizados (orden cronológico) + las predicciones de este usuario
      const [{ data: matches }, { data: preds }] = await Promise.all([
        supabase.from('matches')
          .select('id, home_team, away_team, home_code, away_code, home_score, away_score, match_date')
          .eq('status', 'finished')
          .order('match_date', { ascending: false }),
        supabase.from('predictions')
          .select('match_id, home_score, away_score, points_earned')
          .eq('user_id', userId),
      ]);
      if (cancel) return;
      const predMap = {};
      (preds || []).forEach((p) => { predMap[p.match_id] = p; });
      const merged = (matches || []).map((m) => ({ m, p: predMap[m.id] || null }));
      setRows(merged);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [userId]);

  if (loading) return <div className="py-3 text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Cargando...</div>;
  if (!rows || rows.length === 0) return <div className="py-3 text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Aún no hay partidos finalizados.</div>;

  return (
    <div className="mt-1 rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Header */}
      <div className="grid grid-cols-12 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="col-span-5">Partido</div>
        <div className="col-span-3 text-center">Su pred.</div>
        <div className="col-span-2 text-center">Real</div>
        <div className="col-span-2 text-center">Pts</div>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {rows.map(({ m, p }, i) => {
          const noPred   = !p;
          const pts      = p?.points_earned;
          const ptsColor = noPred ? '#f87171' : pts === 3 ? '#34d399' : pts === 2 ? '#60a5fa' : pts === 0 ? '#f87171' : 'rgba(255,255,255,0.3)';
          const ptsLabel = noPred ? '✗ +0' : pts === 3 ? '✓✓ +3' : pts === 2 ? '✓ +2' : pts === 0 ? '✗ +0' : '–';
          return (
            <div key={i} className="grid grid-cols-12 px-3 py-2 items-center text-xs"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: noPred ? 'rgba(248,113,113,0.06)' : 'transparent' }}>
              {/* Partido */}
              <div className="col-span-5 flex items-center gap-1 min-w-0">
                {m.home_code && <img src={`https://flagcdn.com/16x12/${m.home_code}.png`} alt="" className="rounded flex-shrink-0" />}
                <span className="text-white/50 truncate hidden sm:inline text-[10px]">{m.home_team}</span>
                <span className="text-white/30 text-[10px] flex-shrink-0">vs</span>
                <span className="text-white/50 truncate hidden sm:inline text-[10px]">{m.away_team}</span>
                {m.away_code && <img src={`https://flagcdn.com/16x12/${m.away_code}.png`} alt="" className="rounded flex-shrink-0" />}
              </div>
              {/* Su predicción */}
              <div className="col-span-3 text-center">
                {noPred
                  ? <span className="text-[10px] font-bold" style={{ color: '#f87171' }}>No pronosticó</span>
                  : <span className="font-black text-sm text-white">{p.home_score}–{p.away_score}</span>}
              </div>
              {/* Resultado real */}
              <div className="col-span-2 text-center">
                <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>{m.home_score}–{m.away_score}</span>
              </div>
              {/* Puntos */}
              <div className="col-span-2 text-center">
                <span className="text-xs font-black" style={{ color: ptsColor }}>{ptsLabel}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tabla de personas expandible ─────────────────────────────────────────────
const RANK_COLORS = { 1: '#F59E0B', 2: '#94a3b8', 3: '#cd7f32' };

function BonusModal({ entry, onClose }) {
  const [events, setEvents] = useState(null);
  useEffect(() => {
    supabase
      .from('bonus_points')
      .select('points, position, event:bonus_events(name, description, event_date)')
      .eq('user_id', entry.id)
      .order('created_at')
      .then(({ data }) => setEvents(data || []));
  }, [entry.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}
        style={{ background: '#0D1B30', border: '1px solid rgba(245,158,11,0.3)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <p className="text-white font-black text-base">⭐ Puntos Especiales</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{entry.display_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {!events ? (
            <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Cargando...</p>
          ) : events.map((bp, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm leading-tight">{bp.event.name}</p>
                  {bp.event.description && <p className="text-xs mt-0.5 leading-tight" style={{ color: 'rgba(255,255,255,0.4)' }}>{bp.event.description}</p>}
                  <p className="text-xs mt-1.5 font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    📅 {new Date(bp.event.event_date).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  {bp.position && (
                    <p className="text-xs mt-0.5 font-bold" style={{ color: '#F59E0B' }}>
                      {bp.position === 1 ? '🥇 1er lugar' : bp.position === 2 ? '🥈 2do lugar' : bp.position === 3 ? '🥉 3er lugar' : `#${bp.position}`}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-2xl font-black" style={{ color: '#F59E0B' }}>+{bp.points}</span>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>pts</p>
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Total especiales</span>
            <span className="font-black text-lg" style={{ color: '#F59E0B' }}>+{entry.bonus_points} pts</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaderboardTableExpandable({ data }) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('puntos'); // 'puntos' | 'racha'
  const [streakMode, setStreakMode] = useState('actual'); // 'actual' | 'historica'
  const [bonusModal, setBonusModal] = useState(null);

  const filtered = useMemo(() => {
    let list = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => e.display_name?.toLowerCase().includes(q));
    }
    if (sortBy === 'racha') {
      const key = streakMode === 'historica' ? 'maxStreak' : 'streak';
      list = [...list].sort((a, b) => (b[key] || 0) - (a[key] || 0) || (b.total_points || 0) - (a.total_points || 0));
    }
    return list;
  }, [data, search, sortBy, streakMode]);

  if (!data || data.length === 0) return (
    <div className="rounded-xl p-8 text-center" style={{ background: '#0D1B30', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)' }}>No hay datos en la tabla aún</p>
    </div>
  );

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#0D1B30', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Búsqueda */}
      <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar jugador por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent outline-none text-white text-xs w-full placeholder:text-white/25"
          />
          {search && <button onClick={() => setSearch('')} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, lineHeight: 1 }}>×</button>}
        </div>
        {/* Ordenar por */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Ordenar:</span>
          {[{ k: 'puntos', l: '🏆 Puntos' }, { k: 'racha', l: '🔥 Racha' }].map((o) => (
            <button key={o.k} onClick={() => setSortBy(o.k)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
              style={{
                background: sortBy === o.k ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${sortBy === o.k ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: sortBy === o.k ? '#F59E0B' : 'rgba(255,255,255,0.5)',
              }}>
              {o.l}
            </button>
          ))}
        </div>
        {/* Sub-filtro de racha: actual vs histórica */}
        {sortBy === 'racha' && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>Racha:</span>
            {[{ k: 'actual', l: '🔥 Actual' }, { k: 'historica', l: '🏆 Histórica (mejor de todas)' }].map((o) => (
              <button key={o.k} onClick={() => setStreakMode(o.k)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
                style={{
                  background: streakMode === o.k ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${streakMode === o.k ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  color: streakMode === o.k ? '#F59E0B' : 'rgba(255,255,255,0.5)',
                }}>
                {o.l}
              </button>
            ))}
          </div>
        )}
        {sortBy === 'racha' && streakMode === 'historica' && (
          <p className="text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            🏆 Ranking de la mejor racha de aciertos seguidos que cada quien ha logrado (premiable más adelante).
          </p>
        )}
      </div>
      <div className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
        style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)' }}>
        <div className="col-span-1 text-center">#</div>
        <div className="col-span-4">Jugador</div>
        <div className="col-span-2 text-center">Pts</div>
        <div className="col-span-1 text-center" title="Puntos de eventos especiales">⭐</div>
        <div className="col-span-2 text-center">Exactos</div>
        <div className="col-span-2 text-center">Correctos</div>
      </div>
      <div>
        {filtered.length === 0
          ? <p className="text-center py-6 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No se encontró "{search}"</p>
          : filtered.map((entry, idx) => {
          const isCurrentUser = user && entry.username === user.username;
          const colorIdx      = entry.username.charCodeAt(0) % AVATAR_COLORS.length;
          const rankColor     = RANK_COLORS[entry.rank] || 'white';
          const isOpen        = expanded === entry.id;

          return (
            <div key={entry.id} style={{ borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              {/* Fila principal — clickeable */}
              <div
                onClick={() => setExpanded(isOpen ? null : entry.id)}
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center cursor-pointer transition-colors hover:bg-white/5"
                style={{
                  background: isOpen ? 'rgba(245,158,11,0.05)' : isCurrentUser ? 'rgba(245,158,11,0.06)' : 'transparent',
                  borderLeft: isCurrentUser ? '3px solid #F59E0B' : '3px solid transparent',
                }}>
                <div className="col-span-1 flex justify-center items-center gap-1">
                  {entry.rank === 1 ? <span className="text-xl">🥇</span>
                   : entry.rank === 2 ? <span className="text-xl">🥈</span>
                   : entry.rank === 3 ? <span className="text-xl">🥉</span>
                   : <span className="text-sm font-bold w-7 text-center block" style={{ color: 'rgba(255,255,255,0.4)' }}>#{entry.rank}</span>}
                  {entry.trend === 'up'   && <span style={{ color: '#34d399', fontSize: 11, fontWeight: 900 }}>▲</span>}
                  {entry.trend === 'down' && <span style={{ color: '#f87171', fontSize: 11, fontWeight: 900 }}>▼</span>}
                  {entry.trend === 'same' && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>–</span>}
                </div>
                <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                  <Avatar username={entry.username} initials={entry.avatar_initials} displayName={entry.display_name} size={30} colorClass={AVATAR_COLORS[colorIdx]} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate" style={{ color: isCurrentUser ? '#F59E0B' : 'white' }}>
                        {entry.display_name}
                        {isCurrentUser && <span className="ml-1 text-xs" style={{ color: 'rgba(245,158,11,0.6)' }}>(tú)</span>}
                      </p>
                      {sortBy === 'racha' && streakMode === 'historica' ? (
                        (entry.maxStreak >= 2) && (
                          <span className="flex-shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(245,158,11,0.18)', color: '#FFD100', border: '1px solid rgba(245,158,11,0.45)' }}
                            title={`Mejor racha histórica: ${entry.maxStreak} aciertos seguidos`}>
                            🏆 {entry.maxStreak}
                          </span>
                        )
                      ) : (
                        entry.streak >= 2 && (
                          <span className="flex-shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(249,115,22,0.18)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.4)' }}
                            title={`${entry.streak} aciertos seguidos`}>
                            🔥 {entry.streak}
                          </span>
                        )
                      )}
                    </div>
                    {(() => {
                      const isSameDept = user && entry.department === user.department;
                      const [emoji, label, color] = isCurrentUser
                        ? ['🐸', '¡Sapeate a ti mismo!', '#a78bfa']
                        : isSameDept
                        ? ['🐸', '¡Sapea a tu compañero!', '#34d399']
                        : ['🐸', '¡Sapea a tu competencia!', '#f472b6'];
                      return <p className="text-[9px] font-bold" style={{ color }}>{emoji} {label}</p>;
                    })()}
                  </div>
                  {isOpen ? <ChevronUp size={13} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} /> : <ChevronDown size={13} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />}
                </div>
                <div className="col-span-2 text-center">
                  <span className="font-black text-base" style={{ color: rankColor }}>{entry.total_points}</span>
                </div>
                <div className="col-span-1 text-center">
                  {entry.bonus_points > 0 ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setBonusModal(entry); }}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-xs font-black transition-all hover:scale-110"
                      style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.4)' }}
                      title="Ver puntos de eventos especiales"
                    >
                      +{entry.bonus_points}
                    </button>
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.15)' }}>—</span>
                  )}
                </div>
                <div className="col-span-2 text-center">
                  <span className="text-sm font-semibold" style={{ color: '#34d399' }}>{entry.exact_scores}</span>
                </div>
                <div className="col-span-2 text-center">
                  <span className="text-sm font-semibold" style={{ color: '#60a5fa' }}>{entry.correct_results}</span>
                </div>
              </div>
              {/* Panel expandido */}
              {isOpen && (
                <div className="px-4 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <UserPredictionsPanel userId={entry.id} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {bonusModal && <BonusModal entry={bonusModal} onClose={() => setBonusModal(null)} />}
    </div>
  );
}

// ── Tab Personas ──────────────────────────────────────────────────────────────
function TabPersonas({ data, user }) {
  const myEntry = user ? data.find((e) => e.username === user.username) : null;

  const podiumGroups = [1, 2, 3].map((r) => ({
    config:  PODIUM_CONFIG.find((c) => c.rank === r),
    entries: data.filter((e) => e.rank === r),
  })).filter((g) => g.entries.length > 0);

  const showPodium = podiumGroups.length > 0 && data.some((e) => e.total_points > 0);

  return (
    <div className="space-y-6">
      {/* Mi posición */}
      {myEntry && (
        <div className="flex items-center justify-between rounded-xl p-4"
          style={{ background: '#0D1B30', border: '1px solid rgba(245,158,11,0.25)', borderLeft: '3px solid #F59E0B' }}>
          <div className="flex items-center gap-3">
            <Avatar username={user.username} initials={user.avatarInitials} displayName={user.displayName} size={38} colorClass={AVATAR_COLORS[user.username.charCodeAt(0) % AVATAR_COLORS.length]} />
            <div>
              <p className="text-white font-semibold text-sm">{user.displayName}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>{user.department}</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center hidden sm:block">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.38)' }}>Pos.</p>
              <p className="font-black text-xl" style={{ color: '#F59E0B' }}>#{myEntry.rank}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.38)' }}>Pts</p>
              <p className="text-white font-black text-xl">{myEntry.total_points}</p>
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.38)' }}>Exactos</p>
              <p className="font-black text-xl" style={{ color: '#34d399' }}>{myEntry.exact_scores}</p>
            </div>
          </div>
        </div>
      )}

      {/* Podio */}
      {showPodium && (
        <div>
          <p className="text-center text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Podio</p>
          <div className="grid grid-cols-3 gap-3 items-end max-w-xl mx-auto">
            <div>{podiumGroups.find((g) => g.config.rank === 2) ? <PodiumGroup entries={podiumGroups.find((g) => g.config.rank === 2).entries} config={PODIUM_CONFIG[1]} /> : <div />}</div>
            <div>{podiumGroups.find((g) => g.config.rank === 1) ? <PodiumGroup entries={podiumGroups.find((g) => g.config.rank === 1).entries} config={PODIUM_CONFIG[0]} /> : <div />}</div>
            <div>{(() => {
              const bronze = podiumGroups.find((g) => g.config.rank === 3) || podiumGroups.find((g) => g.config.rank !== 1 && g.config.rank !== 2);
              return bronze ? <PodiumGroup entries={bronze.entries} config={PODIUM_CONFIG[2]} /> : <div />;
            })()}</div>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="text-white font-bold text-sm uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Clasificación Completa
          </h2>
          <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(249,115,22,0.12)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.3)' }}>
            🔥 = racha de aciertos seguidos (aparece desde 2 o más)
          </span>
        </div>
        <LeaderboardTableExpandable data={data} />
      </div>
    </div>
  );
}

// ── Tab Departamentos ─────────────────────────────────────────────────────────
function TrendArrow({ trend, size = 10 }) {
  if (trend === 'up')   return <span style={{ color: '#34d399', fontSize: size, fontWeight: 900 }}>▲</span>;
  if (trend === 'down') return <span style={{ color: '#f87171', fontSize: size, fontWeight: 900 }}>▼</span>;
  if (trend === 'same') return <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: size - 1 }}>–</span>;
  return null;
}

function useTodayMatches() {
  const [todayMatches, setTodayMatches] = useState([]);
  useEffect(() => {
    supabase
      .from('matches')
      .select('id, match_date, home_team, away_team')
      .eq('status', 'scheduled')
      .then(({ data }) => {
        if (!data) return;
        const now   = new Date();
        // "Hoy" en hora de Ecuador (no UTC), para que partidos de 23:00 ECU cuenten hoy
        const today = ecuadorDateStr(now);
        const upcoming = data.filter((m) => {
          const d = new Date(m.match_date);
          return ecuadorDateStr(d) === today && d > now;
        });
        setTodayMatches(upcoming);
      });
  }, []);
  return todayMatches;
}

function timeUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function LiveCountdown({ dateStr }) {
  const [label, setLabel] = useState(() => timeUntil(dateStr));
  useEffect(() => {
    const id = setInterval(() => setLabel(timeUntil(dateStr)), 1000);
    return () => clearInterval(id);
  }, [dateStr]);
  return <span>{label ?? '¡Ya cerró!'}</span>;
}

function DeptAccordion({ dept, idx, ranked, user, deptColorMap, pointsMap, totalGroupMatches, snapMap }) {
  const [open,         setOpen]         = useState(false);
  const [expandedUser, setExpandedUser] = useState(null);
  const [todayPredMap, setTodayPredMap] = useState({});
  const todayMatches = useTodayMatches();
  const color     = DEPT_COLORS[deptColorMap[dept.department] % DEPT_COLORS.length];
  const isMyDept  = user && dept.department === user.department;
  const noPartic  = dept.active_members === 0;
  const hasTodayMatches = todayMatches.length > 0;

  // Cuando se abre el acordeón, carga qué usuarios ya pronosticaron hoy
  useEffect(() => {
    if (!open || !hasTodayMatches) return;
    const matchIds = todayMatches.map((m) => m.id);
    const userIds  = dept.members.map((m) => m.id);
    supabase
      .from('predictions')
      .select('user_id, match_id')
      .in('match_id', matchIds)
      .in('user_id', userIds)
      .then(({ data }) => {
        const map = {};
        for (const p of (data ?? [])) {
          if (!map[p.user_id]) map[p.user_id] = new Set();
          map[p.user_id].add(p.match_id);
        }
        setTodayPredMap(map);
      });
  }, [open, todayMatches, dept.members, hasTodayMatches]);

  // Miembros ordenados por puntos actuales
  const sortedMembers = [...dept.members].sort((a, b) => {
    const A = pointsMap[a.username], B = pointsMap[b.username];
    return (B?.total_points ?? 0)   - (A?.total_points ?? 0)        // puntos
        || (B?.exact_scores ?? 0)   - (A?.exact_scores ?? 0)        // luego exactos
        || (B?.correct_results ?? 0)- (A?.correct_results ?? 0)     // luego correctos
        || (a.display_name || '').localeCompare(b.display_name || ''); // estable
  });

  // Rank anterior de cada miembro dentro del departamento (por puntos del snapshot)
  const prevMemberRankMap = useMemo(() => {
    if (!snapMap || Object.keys(snapMap).length === 0) return {};
    const prevSorted = [...dept.members].sort((a, b) =>
      (snapMap[b.username]?.points ?? 0) - (snapMap[a.username]?.points ?? 0)
    );
    const map = {};
    prevSorted.forEach((m, i) => { map[m.username] = i + 1; });
    return map;
  }, [dept.members, snapMap]);

  return (
    <div style={{
      borderBottom: idx < ranked.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
      background: isMyDept ? 'rgba(245,158,11,0.04)' : 'transparent',
      borderLeft: isMyDept ? '2px solid rgba(245,158,11,0.4)' : '2px solid transparent',
    }}>
      {/* Fila principal — clickeable */}
      <div
        onClick={() => setOpen((o) => !o)}
        className="grid grid-cols-12 px-4 py-3 items-center cursor-pointer transition-all hover:bg-white/5 select-none">
        {/* Rank + flecha dept */}
        <div className="col-span-1 flex items-center gap-0.5">
          {dept.rank === 1 ? <span className="text-base">🥇</span>
           : dept.rank === 2 ? <span className="text-base">🥈</span>
           : dept.rank === 3 ? <span className="text-base">🥉</span>
           : <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>#{dept.rank}</span>}
          <TrendArrow trend={dept.dept_trend} size={9} />
        </div>
        {/* Nombre */}
        <div className="col-span-5 flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}33` }}>
            <Building2 size={13} style={{ color }} />
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{dept.department}</p>
            {noPartic && <p className="text-[10px]" style={{ color: '#f87171' }}>Sin participantes</p>}
          </div>
        </div>
        {/* Promedio */}
        <div className="col-span-2 text-center">
          <p className="font-black text-sm" style={{ color: noPartic ? 'rgba(255,255,255,0.2)' : color }}>
            {dept.avg_points.toFixed(2)}
          </p>
        </div>
        {/* Participación */}
        <div className="col-span-2 text-center hidden sm:flex items-center justify-center gap-1">
          <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full" style={{
              width: `${dept.participation}%`,
              background: dept.participation === 100 ? '#34d399' : dept.participation > 50 ? '#F59E0B' : '#f87171'
            }} />
          </div>
          <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>{dept.participation}%</span>
        </div>
        {/* Miembros + chevron */}
        <div className="col-span-2 flex items-center justify-end gap-2">
          <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {dept.active_members}<span style={{ color: 'rgba(255,255,255,0.25)' }}>/{dept.total_members}</span>
          </span>
          <span className="text-[10px] transition-transform duration-200" style={{
            color: 'rgba(255,255,255,0.3)',
            display: 'inline-block',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>▼</span>
        </div>
      </div>

      {/* Acordeón — lista de miembros */}
      {open && (
        <div className="px-4 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Cabecera mini-tabla */}
          <div className="grid grid-cols-12 py-2 text-[9px] font-bold uppercase tracking-wider"
            style={{ color: 'rgba(255,255,255,0.25)' }}>
            <div className="col-span-5">Miembro</div>
            <div className="col-span-2 text-center">Pts</div>
            <div className="col-span-2 text-center">Exactos</div>
            {hasTodayMatches
              ? <><div className="col-span-2 text-center">Pronóstico hoy</div><div className="col-span-1 text-center">Estado</div></>
              : <div className="col-span-3 text-center">Estado</div>}
          </div>
          {sortedMembers.map((m, memberIdx) => {
            const entry   = pointsMap[m.username];
            const pts     = entry?.total_points  ?? 0;
            const exact   = entry?.exact_scores  ?? 0;
            const correct = entry?.correct_results ?? 0;
            const participated = pts > 0 || (entry?.total_predictions ?? 0) > 0;
            const colorIdx = m.username.charCodeAt(0) % AVATAR_COLORS.length;
            const isMe = user && m.username === user.username;
            // Flecha dentro del departamento
            const currentMemberRank = memberIdx + 1;
            const prevMemberRank = prevMemberRankMap[m.username];
            const memberTrend = prevMemberRank == null ? null
              : prevMemberRank > currentMemberRank ? 'up'
              : prevMemberRank < currentMemberRank ? 'down'
              : 'same';
            const isMemberOpen = expandedUser === m.id;
            return (
              <div key={m.username}>
                <div
                  onClick={() => setExpandedUser(isMemberOpen ? null : m.id)}
                  className="grid grid-cols-12 py-1.5 items-center rounded-lg px-1 cursor-pointer transition-colors hover:bg-white/5"
                  style={{ background: isMe ? 'rgba(245,158,11,0.06)' : 'transparent' }}>
                  <div className="col-span-5 flex items-center gap-2 min-w-0">
                    <Avatar username={m.username} initials={m.avatar_initials} displayName={m.display_name} size={24} colorClass={AVATAR_COLORS[colorIdx]} fontSize={9} />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs truncate block" style={{ color: isMe ? '#F59E0B' : participated ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)', fontWeight: isMe ? 700 : 400 }}>
                        {entry?.rank && <span className="font-black mr-1" style={{ color: '#F59E0B' }}>#{entry.rank}</span>}
                        {m.display_name}
                      </span>
                      {(() => {
                        const isSameDept = user && m.department === user.department;
                        const [emoji, label, color] = isMe
                          ? ['🐸', '¡Sapeate a ti mismo!', '#a78bfa']
                          : isSameDept
                          ? ['🐸', '¡Sapea a tu compañero!', '#34d399']
                          : ['🐸', '¡Sapea a tu competencia!', '#f472b6'];
                        return (
                          <span className="text-[9px] font-bold" style={{ color }}>
                            {emoji} {label}
                          </span>
                        );
                      })()}
                    </div>
                    <TrendArrow trend={memberTrend} size={9} />
                    {isMemberOpen ? <ChevronUp size={11} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} /> : <ChevronDown size={11} style={{ color: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />}
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-xs font-black" style={{ color: pts > 0 ? '#F59E0B' : 'rgba(255,255,255,0.2)' }}>{pts}</span>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-xs font-semibold" style={{ color: exact > 0 ? '#34d399' : 'rgba(255,255,255,0.2)' }}>{exact}</span>
                  </div>
                  {hasTodayMatches && (() => {
                    const preds    = todayPredMap[m.id];
                    const done     = preds ? todayMatches.every((tm) => preds.has(tm.id)) : false;
                    const pending  = todayMatches.filter((tm) => !preds?.has(tm.id));
                    const nearest  = pending[0];
                    const timeLeft = nearest ? timeUntil(nearest.match_date) : null;
                    return done ? (
                      <div className="col-span-2 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                          style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                          ✓ Al día
                        </span>
                      </div>
                    ) : (
                      <div className="col-span-2 text-center relative" onClick={(e) => {
                          e.stopPropagation();
                          setExpandedUser(expandedUser === `today_${m.id}` ? null : `today_${m.id}`);
                        }}>
                        <span className="inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer"
                          style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.5)' }}>
                          ⚠ {pending.length === 1 ? 'Falta 1 partido' : `Faltan ${pending.length} partidos`}
                          {nearest && <span style={{ fontSize: 9, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>⏱ <LiveCountdown dateStr={nearest.match_date} /></span>}
                        </span>
                        {expandedUser === `today_${m.id}` && (
                          <div className="absolute z-50 left-1/2 mt-1 text-left shadow-2xl"
                            style={{ transform: 'translateX(-50%)', minWidth: 210, top: '100%' }}>
                            <div className="rounded-lg px-3 py-2"
                              style={{ background: '#0f172a', border: '1px solid rgba(245,158,11,0.4)' }}>
                              <p className="text-[10px] font-bold mb-1.5" style={{ color: '#F59E0B' }}>⚽ Partidos sin pronosticar hoy:</p>
                              {pending.map((tm) => (
                                <div key={tm.id} className="flex items-center justify-between gap-3 mb-1">
                                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
                                    {tm.home_team} vs {tm.away_team}
                                  </p>
                                  <span className="text-[9px] font-bold flex-shrink-0 font-mono" style={{ color: '#F59E0B' }}>
                                    <LiveCountdown dateStr={tm.match_date} />
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div className={hasTodayMatches ? 'col-span-1 text-center' : 'col-span-3 text-center'}>
                    <span className="text-[9px] font-semibold px-1 py-0.5 rounded-full"
                      style={{
                        background: participated ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)',
                        color: participated ? '#34d399' : 'rgba(255,255,255,0.3)',
                      }}>
                      {entry?.total_predictions ?? 0}/{totalGroupMatches}
                    </span>
                  </div>
                </div>
                {isMemberOpen && (
                  <div className="px-2 pb-2">
                    <UserPredictionsPanel userId={m.id} />
                  </div>
                )}
              </div>
            );
          })}
          {/* Fórmula del promedio */}
          <div className="mt-2 pt-2 flex items-center justify-end gap-1 text-[10px]"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
            <span>Promedio:</span>
            <span className="font-bold" style={{ color }}>{dept.sum_points} pts</span>
            <span>÷ {dept.total_members} miembros =</span>
            <span className="font-black" style={{ color }}>{dept.avg_points.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TabDepartamentos({ leaderboard, allUsers, user, totalGroupMatches, snapMap }) {
  // Calcular promedio por departamento incluyendo usuarios sin predicciones
  const deptData = useMemo(() => {
    // Mapa username → puntos del leaderboard
    const pointsMap = {};
    for (const e of leaderboard) pointsMap[e.username] = e;

    // Agrupar todos los usuarios por departamento
    const byDept = {};
    for (const u of allUsers) {
      const dept = u.department || 'Sin área';
      if (!byDept[dept]) byDept[dept] = [];
      byDept[dept].push(u);
    }

    return Object.entries(byDept).map(([department, members]) => {
      const total_members  = members.length;
      const active_members = members.filter((m) => pointsMap[m.username]?.total_points > 0).length;
      const sum_points     = members.reduce((acc, m) => acc + (pointsMap[m.username]?.total_points ?? 0), 0);
      const sum_exact      = members.reduce((acc, m) => acc + (pointsMap[m.username]?.exact_scores ?? 0), 0);
      const avg_points     = total_members > 0 ? sum_points / total_members : 0;
      const avg_exact      = total_members > 0 ? sum_exact  / total_members : 0;
      const participation  = total_members > 0 ? Math.round((active_members / total_members) * 100) : 0;
      return { department, total_members, active_members, sum_points, avg_points, avg_exact, participation, members };
    }).sort((a, b) => b.avg_points - a.avg_points || b.participation - a.participation);
  }, [leaderboard, allUsers]);

  const pointsMap = useMemo(() => {
    const map = {};
    for (const e of leaderboard) map[e.username] = e;
    return map;
  }, [leaderboard]);

  // Rank anterior de cada departamento usando snapshot
  const prevDeptRankMap = useMemo(() => {
    if (!snapMap || Object.keys(snapMap).length === 0) return {};
    const byDept = {};
    for (const u of allUsers) {
      const dept = u.department || 'Sin área';
      if (!byDept[dept]) byDept[dept] = [];
      byDept[dept].push(u);
    }
    const prevAvgs = Object.entries(byDept).map(([dept, members]) => ({
      dept,
      prevAvg: members.length > 0
        ? members.reduce((s, m) => s + (snapMap[m.username]?.points ?? 0), 0) / members.length
        : 0,
    })).sort((a, b) => b.prevAvg - a.prevAvg);
    const map = {};
    let rank = 1;
    prevAvgs.forEach((d, i) => {
      if (i > 0 && Math.abs(d.prevAvg - prevAvgs[i - 1].prevAvg) >= 0.001) rank = i + 1;
      map[d.dept] = rank;
    });
    return map;
  }, [allUsers, snapMap]);

  const ranked = assignDeptRanks(deptData).map((dept) => {
    const prev = prevDeptRankMap[dept.department];
    const trend = prev == null ? null : prev > dept.rank ? 'up' : prev < dept.rank ? 'down' : 'same';
    return { ...dept, dept_trend: trend };
  });

  const podium = [1, 2, 3].map((r) => ({
    config: PODIUM_CONFIG.find((c) => c.rank === r),
    dept:   ranked.find((d) => d.rank === r),
  })).filter((p) => p.dept);

  const showPodium = ranked.some((d) => d.avg_points > 0);

  // Mi departamento
  const myDept = user ? ranked.find((d) => d.department === user.department) : null;

  // Color estable por índice en ranking ordenado alfabéticamente
  const deptColorMap = useMemo(() => {
    const sorted = [...deptData].sort((a, b) => a.department.localeCompare(b.department));
    const map = {};
    sorted.forEach((d, i) => { map[d.department] = i; });
    return map;
  }, [deptData]);

  return (
    <div className="space-y-6">
      {/* Nota explicativa */}
      <div className="rounded-xl px-4 py-3 flex items-start gap-2"
        style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
        <Building2 size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#93c5fd' }} />
        <p className="text-xs" style={{ color: 'rgba(147,197,253,0.85)' }}>
          El puntaje del departamento es el <span className="font-bold text-blue-300">promedio de todos sus miembros</span>, incluyendo quienes no han predicho (cuentan como 0). ¡Anima a tu equipo a participar!
        </p>
      </div>

      {/* Mi departamento */}
      {myDept && (
        <div className="flex items-center justify-between rounded-xl p-4"
          style={{ background: '#0D1B30', border: '1px solid rgba(245,158,11,0.25)', borderLeft: '3px solid #F59E0B' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${DEPT_COLORS[deptColorMap[myDept.department] % DEPT_COLORS.length]}22` }}>
              <Building2 size={16} style={{ color: DEPT_COLORS[deptColorMap[myDept.department] % DEPT_COLORS.length] }} />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{myDept.department}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {myDept.active_members}/{myDept.total_members} participando · {myDept.participation}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center hidden sm:block">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.38)' }}>Pos.</p>
              <p className="font-black text-xl" style={{ color: '#F59E0B' }}>#{myDept.rank}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.38)' }}>Prom.</p>
              <p className="text-white font-black text-xl">{myDept.avg_points.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Podio departamentos */}
      {showPodium && podium.length > 0 && (
        <div>
          <p className="text-center text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>Podio por Área</p>
          <div className="grid grid-cols-3 gap-3 items-end max-w-xl mx-auto">
            <div>{podium.find((p) => p.config.rank === 2)
              ? <DeptPodiumCard dept={podium.find((p) => p.config.rank === 2).dept} config={PODIUM_CONFIG[1]} colorIdx={deptColorMap[podium.find((p) => p.config.rank === 2).dept.department]} />
              : <div />}</div>
            <div>{podium.find((p) => p.config.rank === 1)
              ? <DeptPodiumCard dept={podium.find((p) => p.config.rank === 1).dept} config={PODIUM_CONFIG[0]} colorIdx={deptColorMap[podium.find((p) => p.config.rank === 1).dept.department]} />
              : <div />}</div>
            <div>{podium.find((p) => p.config.rank === 3)
              ? <DeptPodiumCard dept={podium.find((p) => p.config.rank === 3).dept} config={PODIUM_CONFIG[2]} colorIdx={deptColorMap[podium.find((p) => p.config.rank === 3).dept.department]} />
              : <div />}</div>
          </div>
        </div>
      )}

      {/* Banner motivacional */}
      <div className="rounded-xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="text-4xl flex-shrink-0 select-none" style={{ filter: 'grayscale(0.2)' }}>⛓️</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Trabajo en equipo</p>
            <p className="font-black leading-tight" style={{ color: 'white', fontSize: 15 }}>
              Una cadena es tan fuerte como su{' '}
              <span style={{ color: '#f59e0b' }}>eslabón más débil</span>
            </p>
            <p className="text-xs mt-1 font-semibold italic" style={{ color: 'rgba(255,255,255,0.4)' }}>¿Qué eslabón eres tú?</p>
          </div>
        </div>
      </div>

      {/* Tabla departamentos */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Clasificación por Área
        </h2>
        <div className="rounded-xl overflow-hidden" style={{ background: '#0D1B30', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Header */}
          <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="col-span-1">#</div>
            <div className="col-span-5">Área</div>
            <div className="col-span-2 text-center">Prom.</div>
            <div className="col-span-2 text-center hidden sm:block">Partic.</div>
            <div className="col-span-2 text-center">Miembros</div>
          </div>
          {/* Rows — acordeón */}
          {ranked.map((dept, idx) => (
            <DeptAccordion
              key={dept.department}
              dept={dept}
              idx={idx}
              ranked={ranked}
              user={user}
              deptColorMap={deptColorMap}
              pointsMap={pointsMap}
              totalGroupMatches={totalGroupMatches}
              snapMap={snapMap}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard,        setLeaderboard]        = useState([]);
  const [allUsers,           setAllUsers]           = useState([]);
  const [totalGroupMatches,  setTotalGroupMatches]  = useState(48);
  const [snapMap,            setSnapMap]            = useState({});
  const [loading,            setLoading]            = useState(true);
  const [tab,                setTab]                = useState('personas');

  useEffect(() => {
    if (user?.id) trackPage(user.id, 'posiciones');
    (async () => {
      try {
        const [lbRes, usersRes, matchesRes, snapRes] = await Promise.all([
          api.get('/leaderboard'),
          api.get('/users'),
          api.get('/matches?stage=group'),
          api.get('/leaderboard/snapshot'),
        ]);

        // Partidos finalizados (orden cronológico inverso)
        const { data: fm } = await supabase.from('matches').select('id, match_date').eq('status', 'finished');
        const finishedDesc = (fm ?? []).slice().sort((a, b) => new Date(b.match_date) - new Date(a.match_date));

        // ACIERTOS (>=2 pts) de TODOS, paginando para no toparnos con el límite de 1000 filas
        const hitsByUser = {}; // user_id -> Set(match_id)
        let from = 0; const size = 1000;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data: page } = await supabase
            .from('predictions')
            .select('user_id, match_id, match:matches!inner(status)')
            .eq('match.status', 'finished')
            .gte('points_earned', 2)
            .range(from, from + size - 1);
          if (!page || page.length === 0) break;
          for (const p of page) { (hitsByUser[p.user_id] ||= new Set()).add(p.match_id); }
          if (page.length < size) break;
          from += size;
        }
        const calcStreak = (uid) => {
          let s = 0;
          for (const m of finishedDesc) {
            if (hitsByUser[uid]?.has(m.id)) s++; else break; // fallo o sin pronosticar corta la racha
          }
          return s;
        };
        // Racha MÁXIMA histórica: la mejor seguidilla de aciertos que tuvo (aunque ya se haya cortado)
        const calcMaxStreak = (uid) => {
          let best = 0, cur = 0;
          for (const m of finishedDesc) {
            if (hitsByUser[uid]?.has(m.id)) { cur++; if (cur > best) best = cur; } else cur = 0;
          }
          return best;
        };

        const ranked = assignRanks(lbRes.data);
        const snapMap = {};
        for (const s of (snapRes.data ?? [])) snapMap[s.username] = { rank: s.rank, points: s.total_points };
        const withTrend = ranked.map((e) => {
          const prev = snapMap[e.username]?.rank;
          const trend = prev == null ? null : prev > e.rank ? 'up' : prev < e.rank ? 'down' : 'same';
          return { ...e, prev_rank: prev ?? null, trend, streak: calcStreak(e.id), maxStreak: calcMaxStreak(e.id) };
        });
        setLeaderboard(withTrend);
        setAllUsers(usersRes.data);
        setTotalGroupMatches(matchesRes.data?.length ?? 48);
        setSnapMap(snapMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner size="lg" text="Cargando tabla..." />;

  return (
    <div className="min-h-[calc(100vh-3.5rem)]"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1a2744 40%, #0f2318 100%)' }}>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
            <Trophy size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Tabla de Posiciones</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>Predictor Mundial 2026</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => setTab('personas')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-all"
            style={{
              background: tab === 'personas' ? 'rgba(245,158,11,0.15)' : 'transparent',
              color: tab === 'personas' ? '#F59E0B' : 'rgba(255,255,255,0.4)',
              borderRight: '1px solid rgba(255,255,255,0.08)',
            }}>
            <User size={14} />
            Por Persona
          </button>
          <button
            onClick={() => setTab('departamentos')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-all"
            style={{
              background: tab === 'departamentos' ? 'rgba(96,165,250,0.15)' : 'transparent',
              color: tab === 'departamentos' ? '#93c5fd' : 'rgba(255,255,255,0.4)',
            }}>
            <Building2 size={14} />
            Por Departamento
          </button>
        </div>

        {/* Contenido */}
        {tab === 'personas'
          ? <TabPersonas data={leaderboard} user={user} />
          : <TabDepartamentos leaderboard={leaderboard} allUsers={allUsers} user={user} totalGroupMatches={totalGroupMatches} snapMap={snapMap} />
        }
      </div>
    </div>
  );
}
