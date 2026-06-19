import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAlbumCtx } from '../contexts/AlbumContext';
import { rosterByDepartment, dailyState, DAILY_LIMIT, ALBUM_POINTS } from '../utils/album';
import { USERS } from '../utils/users';
import StickerCard from '../components/StickerCard';
import Avatar from '../components/Avatar';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../utils/supabase';
import { Navigate } from 'react-router-dom';

const USER_BY_NAME = Object.fromEntries(USERS.map((u) => [u.username, u]));

function fmt(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60), ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

export default function Album() {
  const { user } = useAuth();
  const me = (user?.username || '').toLowerCase();
  const { beta, loading, roster, ownedSet, total, owned, completed, challenges, openChallenge } = useAlbumCtx();
  const groups = useMemo(() => rosterByDepartment(roster), [roster]);

  // Trigger 2: al entrar a la sección Álbum, abrir el reto si hay oportunidad
  useEffect(() => { if (!loading) openChallenge(); }, [loading, openChallenge]);

  // ¿Quién tiene MI ficha en su álbum?
  const [holders, setHolders] = useState(null);
  const [showHolders, setShowHolders] = useState(false);
  useEffect(() => {
    if (!me) return;
    (async () => {
      const { data } = await supabase.from('album_stickers').select('owner_username').eq('sticker_username', me);
      const list = (data || [])
        .map((r) => r.owner_username).filter((u) => u !== me)
        .map((u) => ({ username: u, displayName: USER_BY_NAME[u]?.displayName || u }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
      setHolders(list);
    })();
  }, [me]);

  // reloj para el contador regresivo
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((t) => t + 1), 1000); return () => clearInterval(id); }, []);

  // ranking de coleccionistas
  const [ranking, setRanking] = useState(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('album_stickers').select('owner_username');
      const counts = {};
      for (const r of (data || [])) counts[r.owner_username] = (counts[r.owner_username] || 0) + 1;
      const list = Object.entries(counts)
        .map(([username, count]) => ({ username, count, displayName: USER_BY_NAME[username]?.displayName || username }))
        .sort((a, b) => b.count - a.count || a.displayName.localeCompare(b.displayName))
        .slice(0, 10);
      setRanking(list);
    })();
  }, [owned]);

  if (!beta) return <Navigate to="/dashboard" replace />;
  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><LoadingSpinner size="lg" text="Abriendo tu álbum…" /></div>;
  }

  const pct = total ? Math.round((owned / total) * 100) : 0;
  const { winsToday, cooldownLeft } = dailyState(challenges || []);
  const remaining = DAILY_LIMIT - winsToday;

  // estado de la oportunidad
  let oppBox;
  if (remaining <= 0) {
    oppBox = { txt: '✅ Ya conseguiste tus 3 fichas de hoy · vuelve mañana', bg: 'rgba(255,255,255,0.06)', col: 'rgba(255,255,255,0.55)', bd: 'rgba(255,255,255,0.12)' };
  } else if (cooldownLeft > 0) {
    oppBox = { txt: `⏳ Próxima oportunidad de ficha en ${fmt(cooldownLeft)}`, bg: 'rgba(96,165,250,0.12)', col: '#93c5fd', bd: 'rgba(96,165,250,0.4)' };
  } else {
    oppBox = { txt: '🎉 ¡Tienes una oportunidad de ficha nueva! Refresca para jugar', bg: 'rgba(52,211,153,0.14)', col: '#34d399', bd: 'rgba(52,211,153,0.45)' };
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Cabecera */}
      <div className="rounded-2xl p-5 mb-4 text-center" style={{ background: 'linear-gradient(160deg,#15103a,#0a1530)', border: '1px solid rgba(255,209,0,0.3)' }}>
        <h1 className="font-black text-white" style={{ fontSize: 26 }}>📒 Álbum de la Firma</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Colecciona a todos tus compañeros · cada equipo es un departamento
        </p>

        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="font-black" style={{ color: '#FFD100', fontSize: 22 }}>{owned}</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>/ {total} fichas</span>
          <span className="font-black px-2.5 py-1 rounded-full text-xs" style={{ background: 'rgba(255,209,0,0.15)', color: '#FFD100', border: '1px solid rgba(255,209,0,0.4)' }}>{pct}%</span>
        </div>
        <div style={{ height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden', marginTop: 10 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#FFD100,#FFA500)', borderRadius: 6, transition: 'width 0.6s ease' }} />
        </div>

        {/* Timer + fichas conseguidas hoy */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
          <div className="rounded-xl px-3 py-2 text-xs font-bold" style={{ background: oppBox.bg, color: oppBox.col, border: `1px solid ${oppBox.bd}` }}>
            {oppBox.txt}
          </div>
          <div className="rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1.5" style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}>
            Fichas conseguidas hoy:
            <span style={{ color: '#FFD100' }}>{winsToday} de {DAILY_LIMIT}</span>
          </div>
        </div>

        {completed && (
          <div className="mt-4 rounded-xl p-3 album-reveal" style={{ background: 'linear-gradient(90deg,#FFD700,#FFA500)', color: '#3a2e00' }}>
            <p className="font-black">🏆 ¡Completaste el álbum! +{ALBUM_POINTS} pts (próximamente)</p>
          </div>
        )}
      </div>

      {/* Ranking de coleccionistas */}
      {ranking && ranking.length > 0 && (
        <div className="rounded-2xl p-4 mb-5" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="font-black text-white mb-3 flex items-center gap-2" style={{ fontSize: 15 }}>🏅 Top coleccionistas</h2>
          <div className="space-y-1.5">
            {ranking.map((r, i) => {
              const u = USER_BY_NAME[r.username];
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
              return (
                <div key={r.username} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg" style={{ background: i < 3 ? 'rgba(255,209,0,0.06)' : 'transparent' }}>
                  <span style={{ width: 22, textAlign: 'center', fontWeight: 900, fontSize: 13, color: i === 0 ? '#FFD700' : i === 1 ? '#C7CDD6' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.4)' }}>
                    {medal || i + 1}
                  </span>
                  <Avatar username={r.username} initials={u?.avatarInitials} displayName={r.displayName} size={30} clickable={false} />
                  <span className="text-sm font-semibold text-white truncate flex-1">{r.displayName}</span>
                  <span className="text-xs font-black px-2 py-1 rounded-full" style={{ background: 'rgba(255,209,0,0.15)', color: '#FFD100' }}>{r.count} 📒</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ¿Quién tiene mi ficha? */}
      {holders && (
        <div className="rounded-2xl p-4 mb-5" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => setShowHolders((v) => !v)} className="w-full flex items-center justify-between" style={{ background: 'transparent' }}>
            <h2 className="font-black text-white flex items-center gap-2" style={{ fontSize: 15 }}>
              📸 ¿Quién tiene tu ficha?
            </h2>
            <span className="flex items-center gap-2">
              <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ background: 'rgba(52,211,153,0.18)', color: '#34d399' }}>
                {holders.length} {holders.length === 1 ? 'persona' : 'personas'}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{showHolders ? '▲' : '▼'}</span>
            </span>
          </button>

          {showHolders && (
            holders.length === 0 ? (
              <p className="text-sm text-center mt-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Todavía nadie tiene tu ficha 😅 ¡a ver quién te consigue primero!
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-3">
                {holders.map((h) => (
                  <div key={h.username} className="flex items-center gap-2 px-2 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Avatar username={h.username} initials={USER_BY_NAME[h.username]?.avatarInitials} displayName={h.displayName} size={26} clickable={false} />
                    <span className="text-xs font-semibold text-white pr-1">{h.displayName}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Equipos */}
      {groups.map(([dept, players]) => {
        const dOwned = players.filter((p) => ownedSet.has(p.username)).length;
        return (
          <div key={dept} className="mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="font-black text-white flex items-center gap-2" style={{ fontSize: 17 }}>
                <span style={{ color: '#FFD100' }}>⚽</span> {dept}
              </h2>
              <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: dOwned === players.length ? '#34d399' : 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {dOwned}/{players.length}{dOwned === players.length ? ' ✓' : ''}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: 12, justifyItems: 'center' }}>
              {players.map((p) => (
                <StickerCard key={p.username} player={p} owned={ownedSet.has(p.username)} size="md" showNumber style={{ width: '100%', maxWidth: 150 }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
