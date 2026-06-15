import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Search, X } from 'lucide-react';

const AVATAR_COLORS = [
  'bg-purple-600','bg-blue-600','bg-emerald-600','bg-rose-600',
  'bg-orange-600','bg-teal-600','bg-indigo-600','bg-pink-600',
  'bg-cyan-600','bg-amber-600','bg-lime-600','bg-red-600',
];

function PlayerCard({ player, isLeft, onClear, label, accent }) {
  const colorIdx = player ? player.username?.charCodeAt(0) % AVATAR_COLORS.length : 0;
  return (
    <div className="flex-1 flex flex-col items-center gap-2 relative">
      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent }}>
        {label}
      </p>
      {player ? (
        <div className="flex flex-col items-center gap-1 w-full">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white ${AVATAR_COLORS[colorIdx]}`}
            style={{ border: `3px solid ${accent}`, boxShadow: `0 0 20px ${accent}44` }}>
            {player.avatar_initials}
          </div>
          <p className="text-white font-black text-sm text-center leading-tight">{player.display_name}</p>
          <p className="text-[10px] text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>{player.department}</p>
          {onClear && (
            <button onClick={onClear} className="text-[10px] underline mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
              cambiar
            </button>
          )}
        </div>
      ) : (
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
          style={{ border: `2px dashed ${accent}55`, background: `${accent}11` }}>
          ?
        </div>
      )}
    </div>
  );
}

function PlayerSearch({ onSelect, excludeId }) {
  const [query,   setQuery]   = useState('');
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setUsers([]); return; }
    setLoading(true);
    supabase
      .from('users')
      .select('id, display_name, username, avatar_initials, department')
      .ilike('display_name', `%${query}%`)
      .neq('id', excludeId || '')
      .limit(8)
      .then(({ data }) => { setUsers(data || []); setLoading(false); });
  }, [query, excludeId]);

  return (
    <div className="w-full max-w-xs">
      <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}>
        <Search size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
        <input
          type="text"
          placeholder="Buscar rival por nombre..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-transparent outline-none text-white text-sm w-full placeholder:text-white/30"
          autoFocus
        />
        {query && <button onClick={() => setQuery('')}><X size={13} style={{ color: 'rgba(255,255,255,0.3)' }} /></button>}
      </div>
      {(users.length > 0 || loading) && (
        <div className="mt-1 rounded-xl overflow-hidden" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}>
          {loading
            ? <p className="text-center text-xs py-3" style={{ color: 'rgba(255,255,255,0.3)' }}>Buscando...</p>
            : users.map((u) => {
              const ci = u.username.charCodeAt(0) % AVATAR_COLORS.length;
              return (
                <button key={u.id} onClick={() => { onSelect(u); setQuery(''); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-all hover:bg-white/5 text-left"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 ${AVATAR_COLORS[ci]}`}>
                    {u.avatar_initials}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{u.display_name}</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{u.department}</p>
                  </div>
                </button>
              );
            })
          }
        </div>
      )}
    </div>
  );
}

function MatchRow({ match, predA, predB, playerA, playerB }) {
  const ptsA = predA?.points_earned ?? null;
  const ptsB = predB?.points_earned ?? null;

  const winnerA = ptsA !== null && ptsB !== null && ptsA > ptsB;
  const winnerB = ptsA !== null && ptsB !== null && ptsB > ptsA;
  const tie     = ptsA !== null && ptsB !== null && ptsA === ptsB;

  const ptsColor = (p) => p === 3 ? '#34d399' : p === 2 ? '#60a5fa' : p === 0 ? '#f87171' : 'rgba(255,255,255,0.25)';
  const ptsLabel = (p) => p === 3 ? '+3 ✓✓' : p === 2 ? '+2 ✓' : p === 0 ? '+0 ✗' : '–';

  return (
    <div className="grid grid-cols-11 items-center px-3 py-2.5 gap-1 transition-all"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: winnerA ? 'rgba(96,165,250,0.04)' : winnerB ? 'rgba(244,114,182,0.04)' : 'transparent' }}>

      {/* Lado A */}
      <div className="col-span-3 flex flex-col items-center gap-0.5">
        {predA ? (
          <>
            <span className="font-black text-base text-white">{predA.home_score}–{predA.away_score}</span>
            <span className="text-[10px] font-bold" style={{ color: ptsColor(ptsA) }}>{ptsLabel(ptsA)}</span>
          </>
        ) : <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>sin pred.</span>}
        {winnerA && <span className="text-[9px] font-black" style={{ color: '#60a5fa' }}>🏆 GANÓ</span>}
      </div>

      {/* Centro — partido */}
      <div className="col-span-5 flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-1.5">
          {match.home_code && <img src={`https://flagcdn.com/16x12/${match.home_code}.png`} alt="" className="rounded" />}
          <span className="font-black text-white text-xs">{match.home_score}–{match.away_score}</span>
          {match.away_code && <img src={`https://flagcdn.com/16x12/${match.away_code}.png`} alt="" className="rounded" />}
        </div>
        <p className="text-[9px] text-center leading-tight" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {match.home_team} vs {match.away_team}
        </p>
        {tie && ptsA !== null && <span className="text-[9px] font-black" style={{ color: '#fbbf24' }}>🤝 EMPATE</span>}
      </div>

      {/* Lado B */}
      <div className="col-span-3 flex flex-col items-center gap-0.5">
        {predB ? (
          <>
            <span className="font-black text-base text-white">{predB.home_score}–{predB.away_score}</span>
            <span className="text-[10px] font-bold" style={{ color: ptsColor(ptsB) }}>{ptsLabel(ptsB)}</span>
          </>
        ) : <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>sin pred.</span>}
        {winnerB && <span className="text-[9px] font-black" style={{ color: '#f472b6' }}>🏆 GANÓ</span>}
      </div>
    </div>
  );
}

export default function Vs() {
  const { user: authUser } = useAuth();
  const [allUsers,  setAllUsers]  = useState([]);
  const [matches,   setMatches]   = useState([]);
  const [predsA,    setPredsA]    = useState({});
  const [predsB,    setPredsB]    = useState({});
  const [playerA,   setPlayerA]   = useState(null);
  const [playerB,   setPlayerB]   = useState(null);
  const [searching, setSearching] = useState(false);
  const [loading,   setLoading]   = useState(true);

  // Cargar usuarios y partidos finalizados
  useEffect(() => {
    Promise.all([
      api.get('/users'),
      supabase.from('matches').select('*').eq('status', 'finished').order('match_date'),
    ]).then(([usersRes, { data: matchData }]) => {
      setAllUsers(usersRes.data || []);
      setMatches(matchData || []);
      // Default: jugador A = tú
      const me = (usersRes.data || []).find((u) => u.username === authUser?.username);
      if (me) setPlayerA(me);
      setLoading(false);
    });
  }, [authUser]);

  // Cargar predicciones de A
  useEffect(() => {
    if (!playerA) { setPredsA({}); return; }
    supabase.from('predictions').select('match_id, home_score, away_score, points_earned')
      .eq('user_id', playerA.id)
      .then(({ data }) => {
        const map = {};
        (data || []).forEach((p) => { map[p.match_id] = p; });
        setPredsA(map);
      });
  }, [playerA]);

  // Cargar predicciones de B
  useEffect(() => {
    if (!playerB) { setPredsB({}); return; }
    supabase.from('predictions').select('match_id, home_score, away_score, points_earned')
      .eq('user_id', playerB.id)
      .then(({ data }) => {
        const map = {};
        (data || []).forEach((p) => { map[p.match_id] = p; });
        setPredsB(map);
      });
  }, [playerB]);

  // Marcador global
  const score = useMemo(() => {
    let winsA = 0, winsB = 0, ties = 0;
    for (const m of matches) {
      const pA = predsA[m.id]?.points_earned ?? null;
      const pB = predsB[m.id]?.points_earned ?? null;
      if (pA === null || pB === null) continue;
      if (pA > pB) winsA++;
      else if (pB > pA) winsB++;
      else ties++;
    }
    return { winsA, winsB, ties };
  }, [matches, predsA, predsB]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="Cargando arena..." /></div>;

  const hasB = !!playerB;

  return (
    <div className="min-h-[calc(100vh-3.5rem)]" style={{ background: 'linear-gradient(160deg, #0f0a1e 0%, #1a0a2e 40%, #0a0f1e 100%)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-0 mb-1 select-none">
            <span className="text-5xl" style={{ transform: 'scaleX(-1) rotate(-15deg)', display: 'inline-block' }}>🥊</span>
            <span className="text-2xl font-black mx-1" style={{ color: '#ef4444', textShadow: '0 0 10px #ef444488' }}>⚡</span>
            <span className="text-5xl" style={{ transform: 'rotate(15deg)', display: 'inline-block' }}>🥊</span>
          </div>
          <h1 className="text-2xl font-black text-white">Cara a Cara</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Compara tus predicciones con otro participante</p>
        </div>

        {/* Arena de selección */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-3">
            <PlayerCard player={playerA} isLeft label="Esquina Azul 🔵" accent="#60a5fa"
              onClear={playerA?.username !== authUser?.username ? () => {
                const me = allUsers.find((u) => u.username === authUser?.username);
                setPlayerA(me || null);
              } : null} />

            {/* VS central */}
            <div className="flex flex-col items-center flex-shrink-0 gap-1">
              {hasB && (
                <div className="text-center mb-1">
                  <p className="font-black text-2xl" style={{ color: '#60a5fa' }}>{score.winsA}</p>
                  <p className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>victorias</p>
                </div>
              )}
              <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-lg"
                style={{ background: 'linear-gradient(135deg, #60a5fa22, #f472b822)', border: '2px solid rgba(255,255,255,0.15)', color: 'white' }}>
                VS
              </div>
              {hasB && (
                <div className="text-center mt-1">
                  <p className="font-black text-2xl" style={{ color: '#f472b6' }}>{score.winsB}</p>
                  <p className="text-[9px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>victorias</p>
                </div>
              )}
              {hasB && score.ties > 0 && (
                <p className="text-[10px] font-bold mt-1" style={{ color: '#fbbf24' }}>🤝 {score.ties} empates</p>
              )}
            </div>

            <PlayerCard player={playerB} isLeft={false} label="Esquina Roja 🔴" accent="#f472b6"
              onClear={playerB ? () => setPlayerB(null) : null} />
          </div>

          {/* Buscar rival */}
          {!playerB && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>¿A quién quieres desafiar?</p>
              <PlayerSearch onSelect={setPlayerB} excludeId={playerA?.id} />
            </div>
          )}
          {playerB && (
            <div className="mt-3 flex justify-center">
              <button onClick={() => setPlayerB(null)}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                style={{ background: 'rgba(244,114,182,0.1)', color: '#f472b6', border: '1px solid rgba(244,114,182,0.2)' }}>
                🔄 Cambiar rival
              </button>
            </div>
          )}
        </div>

        {/* Resultado global */}
        {hasB && matches.length > 0 && (
          <div className="rounded-xl px-4 py-3 text-center"
            style={{ background: score.winsA > score.winsB ? 'rgba(96,165,250,0.1)' : score.winsB > score.winsA ? 'rgba(244,114,182,0.1)' : 'rgba(251,191,36,0.1)', border: `1px solid ${score.winsA > score.winsB ? 'rgba(96,165,250,0.3)' : score.winsB > score.winsA ? 'rgba(244,114,182,0.3)' : 'rgba(251,191,36,0.3)'}` }}>
            {score.winsA > score.winsB
              ? <p className="font-black text-sm" style={{ color: '#60a5fa' }}>🏆 {playerA?.display_name} va ganando el duelo</p>
              : score.winsB > score.winsA
              ? <p className="font-black text-sm" style={{ color: '#f472b6' }}>🏆 {playerB?.display_name} va ganando el duelo</p>
              : <p className="font-black text-sm" style={{ color: '#fbbf24' }}>⚖️ ¡Están empatados! Duelo parejo</p>}
          </div>
        )}

        {/* Tabla de partidos */}
        {hasB ? (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Partido por partido</p>
              <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <div className="rounded-xl overflow-hidden" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Header */}
              <div className="grid grid-cols-11 px-3 py-2 text-[9px] font-black uppercase tracking-widest items-center"
                style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}>
                <div className="col-span-3 text-center" style={{ color: '#60a5fa' }}>
                  {playerA?.display_name?.split(' ')[0]}
                </div>
                <div className="col-span-5 text-center">Partido</div>
                <div className="col-span-3 text-center" style={{ color: '#f472b6' }}>
                  {playerB?.display_name?.split(' ')[0]}
                </div>
              </div>

              {matches.length === 0
                ? <p className="text-center text-sm py-8" style={{ color: 'rgba(255,255,255,0.3)' }}>Aún no hay partidos finalizados</p>
                : matches.map((m) => (
                  <MatchRow key={m.id} match={m} predA={predsA[m.id]} predB={predsB[m.id]} playerA={playerA} playerB={playerB} />
                ))
              }
            </div>
          </div>
        ) : (
          <div className="rounded-xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-5xl mb-3">🥊</p>
            <p className="text-white font-bold text-lg">Elige a tu rival</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Busca a alguien por nombre y compara predicción por predicción</p>
          </div>
        )}
      </div>
    </div>
  );
}
