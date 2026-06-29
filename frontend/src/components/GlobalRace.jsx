import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import Avatar from './Avatar';
import { Play, Pause, RotateCcw } from 'lucide-react';

const ROWH = 46;
const COLORS = ['#F59E0B','#34d399','#60a5fa','#f472b6','#a78bfa','#fb923c','#22d3ee','#4ade80','#f87171','#c084fc'];

export default function GlobalRace() {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [users, setUsers]     = useState([]);
  const [pointsMap, setPointsMap] = useState({});
  const [step, setStep]       = useState(0);
  const [playing, setPlaying] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const CACHE_KEY = 'wc2026_globalrace_v1';
    const TTL = 10 * 60 * 1000; // 10 min: evita re-bajar TODAS las predicciones en cada visita
    (async () => {
      // 1) caché de sesión (recorta egress de PostgREST)
      try {
        const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
        if (c && c.exp > Date.now()) {
          setMatches(c.fm || []); setUsers(c.us || []); setPointsMap(c.pm || {});
          setLoading(false); setStep(0); setPlaying(true);
          return;
        }
      } catch { /* noop */ }

      const { data: fm } = await supabase.from('matches')
        .select('id, match_date, home_team, away_team, home_code, away_code')
        .eq('status', 'finished').order('match_date', { ascending: true });
      const { data: us } = await supabase.from('users').select('id, username, display_name, avatar_initials');
      const pm = {}; let from = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: pg } = await supabase.from('predictions')
          .select('user_id, match_id, points_earned, match:matches!inner(status)')
          .eq('match.status', 'finished').range(from, from + 999);
        if (!pg || pg.length === 0) break;
        for (const p of pg) { (pm[p.user_id] ||= {})[p.match_id] = p.points_earned || 0; }
        if (pg.length < 1000) break;
        from += 1000;
      }
      setMatches(fm || []); setUsers(us || []); setPointsMap(pm);
      setLoading(false); setStep(0); setPlaying(true);
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ exp: Date.now() + TTL, fm, us, pm })); } catch { /* noop */ }
    })();
  }, []);

  const cum = useMemo(() => {
    const map = {};
    for (const u of users) {
      const arr = []; let a = 0;
      for (const m of matches) { a += (pointsMap[u.id]?.[m.id] || 0); arr.push(a); }
      map[u.id] = arr;
    }
    return map;
  }, [users, matches, pointsMap]);

  const maxFinal = useMemo(() => {
    let mx = 1;
    for (const u of users) { const arr = cum[u.id]; if (arr?.length) mx = Math.max(mx, arr[arr.length - 1]); }
    return mx;
  }, [cum, users]);

  // Color fijo por jugador (no por posición) → el movimiento se ve fluido
  const colorByUser = useMemo(() => {
    const m = {};
    users.forEach((u, i) => { m[u.id] = COLORS[i % COLORS.length]; });
    return m;
  }, [users]);

  useEffect(() => {
    if (loading || !playing) return;
    if (step >= matches.length) { setPlaying(false); return; }
    const t = setTimeout(() => setStep((s) => s + 1), 2300);
    return () => clearTimeout(t);
  }, [playing, step, matches.length, loading]);

  if (loading) return <div className="py-12 text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Preparando la carrera… 🏁</div>;
  if (!matches.length) return <div className="py-12 text-center text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Aún no hay partidos finalizados para la carrera.</div>;

  const idx = Math.max(0, step - 1);
  const cur = step > 0 ? matches[idx] : null;

  const standings = users
    .map((u) => ({ u, pts: step > 0 ? (cum[u.id]?.[idx] || 0) : 0 }))
    .sort((a, b) => b.pts - a.pts || (a.u.display_name || '').localeCompare(b.u.display_name || ''));

  const visibleCount = showAll ? standings.length : Math.min(10, standings.length);
  const ptsLabel = (p) => p === 3 ? '+3 ⭐' : p === 2 ? '+2' : p === 0 ? '+0' : '';
  const ptsColor = (p) => p === 3 ? '#34d399' : p === 2 ? '#60a5fa' : '#f87171';

  return (
    <div className="rounded-2xl p-4" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Título */}
      <div className="text-center mb-3">
        <h3 className="text-white font-black text-lg leading-tight">🏁 Carrera de Puntos</h3>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Mira cómo cada jugador sube y baja en el ranking partido a partido
        </p>
      </div>

      {/* Controles + partido */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button onClick={() => { if (step >= matches.length) setStep(0); setPlaying((p) => !p); }}
            className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.4)' }}>
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button onClick={() => { setStep(0); setPlaying(true); }}
            className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <RotateCcw size={14} />
          </button>
        </div>
        <div className="text-center flex-1 min-w-0">
          {cur ? (
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white">
              {cur.home_code && <img src={`https://flagcdn.com/20x15/${cur.home_code}.png`} alt="" className="rounded" />}
              <span className="truncate">{cur.home_team} vs {cur.away_team}</span>
              {cur.away_code && <img src={`https://flagcdn.com/20x15/${cur.away_code}.png`} alt="" className="rounded" />}
            </span>
          ) : <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>¡Listo para arrancar!</span>}
          <div className="text-[10px] mt-0.5 flex items-center justify-center gap-1.5 flex-wrap">
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>Partido {Math.min(step, matches.length)} de {matches.length}</span>
            {cur && (
              <span className="font-bold" style={{ color: '#F59E0B' }}>
                · {new Date(cur.match_date).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setShowAll((v) => !v)}
          className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {showAll ? 'Top 10' : 'Ver todos'}
        </button>
      </div>

      {/* Pista — el orden del DOM es FIJO; solo se anima la posición (sube y baja igual de suave) */}
      <div style={{ position: 'relative', height: visibleCount * ROWH, transition: 'height 0.4s ease', overflow: 'hidden' }}>
        {(() => {
          const rankByUser = {}, ptsNow = {};
          standings.forEach((s, rank) => { rankByUser[s.u.id] = rank; ptsNow[s.u.id] = s.pts; });
          return users.map((u) => {
            const rank = rankByUser[u.id] ?? 999;
            const pts = ptsNow[u.id] ?? 0;
            const visible = showAll || rank < 10;
            const last = cur ? pointsMap[u.id]?.[cur.id] : undefined;
            const isExact = last === 3;
            const barColor = colorByUser[u.id];
            return (
              <div key={u.id}
                style={{ position: 'absolute', left: 0, right: 0, height: ROWH - 8, display: 'flex', alignItems: 'center', gap: 7,
                         transform: `translateY(${rank * ROWH}px)`, opacity: visible ? 1 : 0,
                         pointerEvents: visible ? 'auto' : 'none', zIndex: visible ? 1 : 0,
                         transition: 'transform 1.4s cubic-bezier(.4,0,.2,1), opacity 0.7s ease' }}>
                <span style={{ width: 18, textAlign: 'center', fontSize: 12, fontWeight: 900, color: rank === 0 ? '#FFD700' : rank === 1 ? '#C7CDD6' : rank === 2 ? '#cd7f32' : 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                  {rank + 1}
                </span>
                <Avatar username={u.username} initials={u.avatar_initials} displayName={u.display_name} size={30} colorClass="bg-rose-700" clickable={false}
                  style={isExact ? { animation: 'raceFlash 0.7s ease' } : undefined} />
                <span className="text-xs font-semibold text-white truncate" style={{ width: 78, flexShrink: 0 }}>{u.display_name?.split(' ')[0]}</span>
                <div style={{ flex: 1, height: 22, background: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'hidden', minWidth: 20 }}>
                  <div style={{ height: '100%', width: `${(pts / maxFinal) * 100}%`, background: barColor, borderRadius: 6, transition: 'width 1.4s cubic-bezier(.4,0,.2,1)' }} />
                </div>
                <span className="font-black text-sm" style={{ color: barColor, width: 26, textAlign: 'right', flexShrink: 0 }}>{pts}</span>
                <div style={{ width: 34, flexShrink: 0, position: 'relative', height: 18 }}>
                  {cur && last !== undefined && (
                    <span key={step} style={{ position: 'absolute', right: 0, fontSize: 11, fontWeight: 900, color: ptsColor(last), animation: 'racePop 1.3s ease forwards' }}>
                      {ptsLabel(last)}
                    </span>
                  )}
                </div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
