import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAlbumCtx } from '../contexts/AlbumContext';
import { rosterByDepartment, dailyState, DAILY_LIMIT, ATTEMPT_LIMIT, ALBUM_POINTS, isDT } from '../utils/album';
import { USERS, isExcluded } from '../utils/users';
import StickerCard from '../components/StickerCard';
import AlbumViewerModal from '../components/AlbumViewerModal';
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

// Hora (Ecuador) de la última ficha, para el desempate del premio del álbum
function fmtStickerTime(iso) {
  if (!iso) return '';
  const TZ = 'America/Guayaquil';
  const d = new Date(iso);
  const day = d.toLocaleString('es-EC', { timeZone: TZ, day: 'numeric' });
  const month = d.toLocaleString('es-EC', { timeZone: TZ, month: 'long' });
  const time = d.toLocaleString('es-EC', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
  return `${day}-${month.charAt(0).toUpperCase() + month.slice(1)}, ${time}`;
}

export default function Album() {
  const { user } = useAuth();
  const me = (user?.username || '').toLowerCase();
  const { beta, loading, dataReady, roster, ownedSet, total, owned, completed, challenges, openChallenge } = useAlbumCtx();
  const groups = useMemo(() => rosterByDepartment(roster), [roster]);

  // Trigger 2: al entrar a la sección Álbum, abrir el reto si hay oportunidad.
  // SOLO una vez por montaje y SOLO con datos reales cargados (dataReady).
  const openedRef = useRef(false);
  useEffect(() => {
    if (!dataReady || openedRef.current) return;
    openedRef.current = true;
    openChallenge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady]);

  // ¿Quién tiene MI ficha en su álbum? (set para marcar en el ranking)
  const [holdersSet, setHoldersSet] = useState(new Set());
  const [viewer, setViewer] = useState(null); // { username, displayName } del álbum que estoy mirando
  // Personas que NO te conocen: se equivocaron contigo en un reto (excluye DTs).
  // Mapa username → cuántas veces falló contigo.
  const [noConocen, setNoConocen] = useState({});
  useEffect(() => {
    if (!me) return;
    (async () => {
      const { data } = await supabase.from('album_stickers').select('owner_username').eq('sticker_username', me);
      setHoldersSet(new Set((data || []).map((r) => r.owner_username).filter((u) => u !== me)));

      // intentos donde alguien tenía MI ficha como objetivo y falló (lose/timeout)
      const { data: fails } = await supabase.from('album_challenges')
        .select('username, result').eq('target_username', me).neq('result', 'win');
      const counts = {};
      for (const r of (fails || [])) {
        if (r.username === me || isDT(r.username)) continue; // a los DT no los exponemos
        counts[r.username] = (counts[r.username] || 0) + 1;
      }
      setNoConocen(counts);
    })();
  }, [me]);

  // reloj para el contador regresivo
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((t) => t + 1), 1000); return () => clearInterval(id); }, []);

  // ranking de coleccionistas (completo, con búsqueda y "ver más")
  const [ranking, setRanking] = useState(null);
  const [rankQ, setRankQ] = useState('');
  const [rankLimit, setRankLimit] = useState(10);
  const [onlyHolders, setOnlyHolders] = useState(false);
  const [onlyNoConocen, setOnlyNoConocen] = useState(false);

  // Errores por persona (informativo) + con quién · intentos usados hoy
  const [errCount, setErrCount] = useState({});       // username -> #errores
  const [errTargets, setErrTargets] = useState({});   // username -> { target: count }
  const [attemptsByUser, setAttemptsByUser] = useState({}); // username -> intentos hoy
  const [errModal, setErrModal] = useState(null);     // popup "se equivocó con…"

  useEffect(() => {
    (async () => {
      // Errores = retos que NO fueron 'win' (lose / timeout), con su objetivo
      const ec = {}, et = {};
      let f = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: pg } = await supabase.from('album_challenges')
          .select('username, target_username, result').neq('result', 'win').range(f, f + 999);
        if (!pg || pg.length === 0) break;
        for (const r of pg) {
          ec[r.username] = (ec[r.username] || 0) + 1;
          if (r.target_username) {
            (et[r.username] ||= {});
            et[r.username][r.target_username] = (et[r.username][r.target_username] || 0) + 1;
          }
        }
        if (pg.length < 1000) break;
        f += 1000;
      }
      setErrCount(ec); setErrTargets(et);

      // Intentos usados HOY (hora de Ecuador) por persona → para saber cuántos les quedan
      const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());
      const startISO = new Date(`${ymd}T00:00:00-05:00`).toISOString();
      const at = {};
      let f2 = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: pg } = await supabase.from('album_challenges')
          .select('username').gte('created_at', startISO).range(f2, f2 + 999);
        if (!pg || pg.length === 0) break;
        for (const r of pg) at[r.username] = (at[r.username] || 0) + 1;
        if (pg.length < 1000) break;
        f2 += 1000;
      }
      setAttemptsByUser(at);
    })();
  }, []);

  const openErrModal = (r) => {
    const t = errTargets[r.username] || {};
    const targets = Object.entries(t)
      .map(([username, count]) => ({ username, count, displayName: USER_BY_NAME[username]?.displayName || username }))
      .sort((a, b) => b.count - a.count || a.displayName.localeCompare(b.displayName));
    setErrModal({ username: r.username, displayName: r.displayName, targets });
  };

  useEffect(() => {
    (async () => {
      // Paginar: Supabase devuelve máx 1000 filas por consulta y ya hay más
      // cromos que eso en total, lo que dejaba el ranking corto.
      const counts = {};
      const lastAt = {}; // username -> created_at de la ÚLTIMA ficha (para desempate)
      let from = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: pg } = await supabase.from('album_stickers').select('owner_username, created_at').range(from, from + 999);
        if (!pg || pg.length === 0) break;
        for (const r of pg) {
          counts[r.owner_username] = (counts[r.owner_username] || 0) + 1;
          if (!lastAt[r.owner_username] || r.created_at > lastAt[r.owner_username]) lastAt[r.owner_username] = r.created_at;
        }
        if (pg.length < 1000) break;
        from += 1000;
      }
      const list = Object.entries(counts)
        .filter(([username]) => !isExcluded(username))   // ocultar ex-empleados
        .map(([username, count]) => ({ username, count, last: lastAt[username], displayName: USER_BY_NAME[username]?.displayName || username }))
        // a igual número de cromos, va primero quien llegó ANTES (última ficha más temprana)
        .sort((a, b) => b.count - a.count || (new Date(a.last) - new Date(b.last)) || a.displayName.localeCompare(b.displayName))
        .map((r, i) => ({ ...r, rank: i + 1 }));
      setRanking(list);
    })();
  }, [owned]);

  // Reconciliación optimista: mi propio conteo refleja al instante lo que acabo de ganar
  const displayRanking = useMemo(() => {
    if (!ranking) return null;
    let list = ranking.map((r) => ({ ...r }));
    const mine = list.find((r) => r.username === me);
    if (mine) mine.count = Math.max(mine.count, owned);
    else if (owned > 0 && me) list.push({ username: me, count: owned, displayName: USER_BY_NAME[me]?.displayName || me });
    list.sort((a, b) => b.count - a.count || (new Date(a.last || 8e15) - new Date(b.last || 8e15)) || a.displayName.localeCompare(b.displayName));
    return list.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [ranking, owned, me]);

  if (!beta) return <Navigate to="/dashboard" replace />;
  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><LoadingSpinner size="lg" text="Abriendo tu álbum…" /></div>;
  }

  const pct = total ? Math.round((Math.min(owned, total) / total) * 100) : 0;
  const { winsToday, attemptsToday, cooldownLeft } = dailyState(challenges || []);
  const gotAllFichas = winsToday >= DAILY_LIMIT;
  const usedAllTries = attemptsToday >= ATTEMPT_LIMIT;

  // estado de la oportunidad
  let oppBox;
  if (gotAllFichas) {
    oppBox = { txt: `🏆 ¡Conseguiste tus ${DAILY_LIMIT} fichas de hoy! Vuelve mañana`, bg: 'rgba(52,211,153,0.14)', col: '#34d399', bd: 'rgba(52,211,153,0.45)' };
  } else if (usedAllTries) {
    oppBox = { txt: `😅 Se acabaron tus ${ATTEMPT_LIMIT} intentos de hoy · vuelve mañana`, bg: 'rgba(255,255,255,0.06)', col: 'rgba(255,255,255,0.55)', bd: 'rgba(255,255,255,0.12)' };
  } else if (cooldownLeft > 0) {
    oppBox = { txt: `⏳ Próximo intento en ${fmt(cooldownLeft)}`, bg: 'rgba(96,165,250,0.12)', col: '#93c5fd', bd: 'rgba(96,165,250,0.4)' };
  } else {
    oppBox = { txt: '🎉 ¡Tienes un intento disponible! Refresca para jugar', bg: 'rgba(52,211,153,0.14)', col: '#34d399', bd: 'rgba(52,211,153,0.45)' };
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
            Fichas hoy: <span style={{ color: '#FFD100' }}>{Math.min(winsToday, DAILY_LIMIT)}/{DAILY_LIMIT}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
            Intentos: <span style={{ color: '#93c5fd' }}>{Math.min(attemptsToday, ATTEMPT_LIMIT)}/{ATTEMPT_LIMIT}</span>
          </div>
        </div>

        {completed && (
          <div className="mt-4 rounded-xl p-3 album-reveal" style={{ background: 'linear-gradient(90deg,#FFD700,#FFA500)', color: '#3a2e00' }}>
            <p className="font-black">🏆 ¡Completaste el álbum! +{ALBUM_POINTS} pts (próximamente)</p>
          </div>
        )}
      </div>

      {/* Ranking de coleccionistas */}
      {displayRanking && displayRanking.length > 0 && (
        <div className="rounded-2xl p-4 mb-5" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h2 className="font-black text-white mb-3 flex items-center gap-2" style={{ fontSize: 15 }}>🏅 Top coleccionistas</h2>

          <input value={rankQ} onChange={(e) => { setRankQ(e.target.value); setRankLimit(10); }}
            placeholder="🔍 Buscar coleccionista por nombre…"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-2"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} />

          <div className="flex flex-wrap gap-2 mb-3">
            <button onClick={() => { setOnlyHolders((v) => !v); setOnlyNoConocen(false); setRankLimit(10); }}
              className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: onlyHolders ? 'rgba(52,211,153,0.22)' : 'rgba(255,255,255,0.06)',
                       color: onlyHolders ? '#34d399' : 'rgba(255,255,255,0.55)',
                       border: `1px solid ${onlyHolders ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.12)'}` }}>
              📸 Solo los que te tienen ({holdersSet.size})
            </button>
            <button onClick={() => { setOnlyNoConocen((v) => !v); setOnlyHolders(false); setRankLimit(10); }}
              className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: onlyNoConocen ? 'rgba(248,113,113,0.22)' : 'rgba(255,255,255,0.06)',
                       color: onlyNoConocen ? '#f87171' : 'rgba(255,255,255,0.55)',
                       border: `1px solid ${onlyNoConocen ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'}` }}>
              🙈 No te conocen ({Object.keys(noConocen).length})
            </button>
          </div>

          {onlyNoConocen && (
            <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
              😅 Estas personas se equivocaron contigo en un reto · ¡hazte amigo de ellas!
            </p>
          )}

          {(() => {
            const q = rankQ.trim().toLowerCase();
            let filtered;
            if (onlyNoConocen) {
              // base: todas las personas que fallaron contigo (estén o no en el ranking)
              const byUser = Object.fromEntries(displayRanking.map((r) => [r.username, r]));
              filtered = Object.keys(noConocen)
                .map((un) => byUser[un] || { username: un, displayName: USER_BY_NAME[un]?.displayName || un, count: 0, rank: null })
                .sort((a, b) => (noConocen[b.username] || 0) - (noConocen[a.username] || 0));
            } else {
              filtered = onlyHolders ? displayRanking.filter((r) => holdersSet.has(r.username)) : displayRanking;
            }
            if (q) filtered = filtered.filter((r) => r.displayName.toLowerCase().includes(q));
            const shown = filtered.slice(0, rankLimit);
            return (
          <div className="space-y-1.5">
            {shown.length === 0 && (
              <p className="text-sm text-center py-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Sin coincidencias</p>
            )}
            {shown.map((r) => {
              const u = USER_BY_NAME[r.username];
              const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : null;
              const tieneMiFicha = holdersSet.has(r.username);
              const left = Math.max(0, ATTEMPT_LIMIT - (attemptsByUser[r.username] || 0));
              return (
                <div key={r.username} className="px-2 py-1.5 rounded-lg" style={{ background: (r.rank && r.rank <= 3) ? 'rgba(255,209,0,0.06)' : 'transparent' }}>
                  {/* Línea 1: rank + avatar + nombre + botón abrir álbum */}
                  <div className="flex items-center gap-2.5">
                    <span style={{ width: 22, flexShrink: 0, textAlign: 'center', fontWeight: 900, fontSize: 13, color: r.rank === 1 ? '#FFD700' : r.rank === 2 ? '#C7CDD6' : r.rank === 3 ? '#cd7f32' : 'rgba(255,255,255,0.4)' }}>
                      {medal || r.rank || '·'}
                    </span>
                    <Avatar username={r.username} initials={u?.avatarInitials} displayName={r.displayName} size={30} clickable={false} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-white truncate block">{r.displayName}</span>
                      <span className="text-[10px] truncate block" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {r.last && <>🕐 {fmtStickerTime(r.last)} · </>}🎯 {left} intento{left === 1 ? '' : 's'} hoy
                      </span>
                    </div>
                    {r.username !== me && (
                      <button onClick={() => setViewer({ username: r.username, displayName: r.displayName })}
                        title={`Ver el álbum de ${r.displayName}`}
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(167,139,250,0.18)', border: '1px solid rgba(167,139,250,0.4)', touchAction: 'manipulation' }}>
                        📖
                      </button>
                    )}
                  </div>

                  {/* Línea 2: insignias (envuelven en móvil, alineadas bajo el nombre) */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1" style={{ paddingLeft: 54 }}>
                    {onlyNoConocen && (
                      <span title="Veces que se equivocó contigo" className="text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap" style={{ background: 'rgba(248,113,113,0.18)', color: '#f87171' }}>
                        ❌ {noConocen[r.username]}× {noConocen[r.username] === 1 ? 'vez' : 'veces'}
                      </span>
                    )}

                    {!onlyNoConocen && tieneMiFicha && r.username !== me && (
                      <span title="Tiene tu ficha" className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap" style={{ background: 'rgba(52,211,153,0.16)', color: '#34d399' }}>
                        📸 te tiene
                      </span>
                    )}

                    {/* Errores (informativo) — NO se muestra para los DT (socios) 😅 */}
                    {!onlyNoConocen && !isDT(r.username) && (errCount[r.username] > 0) && (
                      <button onClick={() => openErrModal(r)} title="Ver con quién se equivocó"
                        className="text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap"
                        style={{ background: 'rgba(248,113,113,0.16)', color: '#f87171', border: '1px solid rgba(248,113,113,0.4)', touchAction: 'manipulation' }}>
                        ❌ {errCount[r.username]} <span style={{ fontSize: 11 }}>👁️</span>
                      </button>
                    )}

                    {!onlyNoConocen && (
                      <span className="text-xs font-black px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: 'rgba(255,209,0,0.15)', color: '#FFD100' }}>{r.count} 📒</span>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length > rankLimit && (
              <button onClick={() => setRankLimit((n) => n + 10)}
                className="w-full mt-1 py-2 rounded-lg text-xs font-bold"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}>
                Ver más ({filtered.length - rankLimit} restantes)
              </button>
            )}
          </div>
            );
          })()}
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

      {viewer && (
        <AlbumViewerModal username={viewer.username} displayName={viewer.displayName} onClose={() => setViewer(null)} />
      )}

      {/* Popup: con quién se equivocó 😅 */}
      {errModal && (
        <div onClick={() => setErrModal(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: 360, maxWidth: '92vw', maxHeight: '80vh', overflow: 'auto', background: '#0a1730', border: '2px solid rgba(248,113,113,0.4)', borderRadius: 18, padding: 18, boxShadow: '0 24px 60px rgba(0,0,0,0.7)' }}>
            <p style={{ color: 'white', fontWeight: 900, fontSize: 16 }}>😅 {errModal.displayName} se equivocó con:</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 10 }}>Retos fallados (nombre incorrecto o tiempo agotado)</p>
            {errModal.targets.length === 0 && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Sin datos</p>}
            {errModal.targets.map((t) => (
              <div key={t.username} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 2px' }}>
                <Avatar username={t.username} initials={USER_BY_NAME[t.username]?.avatarInitials} displayName={t.displayName} size={30} clickable={false} />
                <span style={{ color: 'white', fontWeight: 700, fontSize: 13, flex: 1 }}>{t.displayName}</span>
                {t.count > 1 && (
                  <span style={{ background: 'rgba(248,113,113,0.18)', color: '#f87171', fontWeight: 900, fontSize: 12, padding: '2px 9px', borderRadius: 20 }}>×{t.count}</span>
                )}
              </div>
            ))}
            <button onClick={() => setErrModal(null)}
              style={{ width: '100%', marginTop: 14, padding: 11, borderRadius: 10, background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 700, fontSize: 13 }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
