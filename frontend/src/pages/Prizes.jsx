import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAvatars } from '../contexts/AvatarContext';
import api from '../utils/api';
import { supabase } from '../utils/supabase';
import { trackPage } from '../utils/trackPage';
import { isExcluded } from '../utils/users';
import { computeTeams, isChampionRevealed, CHAMPION_REVEAL } from '../utils/aliveTeams';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';
import { Trophy, Plane, UtensilsCrossed, HeartPulse, Building2, BookOpen, Flame, Globe2, Gift, Lock, Sparkles } from 'lucide-react';

const AVATAR_COLORS = ['bg-purple-600','bg-blue-600','bg-emerald-600','bg-rose-600','bg-orange-600','bg-teal-600','bg-indigo-600','bg-pink-600'];
const colorFor = (u) => AVATAR_COLORS[(u?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

function Flag({ code, size = 26 }) {
  const h = Math.round(size * 0.75);
  if (!code) return <span style={{ fontSize: size * 0.7 }}>🏳️</span>;
  return <img src={`https://flagcdn.com/${size}x${h}/${code.toLowerCase()}.png`} alt="" style={{ width: size, height: h, borderRadius: 3, objectFit: 'cover', display: 'inline-block', verticalAlign: 'middle' }} onError={(e) => { e.target.style.display = 'none'; }} />;
}

// Cartel animado sostenido por una mano 😄
function TempSign() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
      <div style={{ transformOrigin: 'bottom center', animation: 'signWave 1.9s ease-in-out infinite' }}>
        <div style={{ background: 'linear-gradient(180deg,#ef2b45,#c40024)', color: '#fff', fontWeight: 900, fontSize: 15, lineHeight: 1.15, padding: '10px 20px', borderRadius: 7, boxShadow: '0 8px 20px rgba(228,0,43,0.45)', textAlign: 'center', letterSpacing: '0.04em', border: '2px solid rgba(255,255,255,0.85)', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
          RESULTADOS<br />TEMPORALES
        </div>
        <div style={{ width: 7, height: 30, background: 'linear-gradient(90deg,#5e3d1c,#8a5a2b,#5e3d1c)', margin: '0 auto', borderRadius: 4 }} />
        <div style={{ textAlign: 'center', fontSize: 38, marginTop: -8, lineHeight: 1 }}>✊</div>
      </div>
    </div>
  );
}

// Etiqueta "posición temporal"
function TempTag() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(251,191,36,0.14)', border: '1px solid rgba(251,191,36,0.4)', color: '#fbbf24', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
      🔄 Temporal
    </span>
  );
}

// Escena ilustrada del premio con la CARA del ganador metida adentro 😂
function PrizeScene({ variant, face, initials }) {
  const V = {
    plane:  { grad: 'linear-gradient(160deg,#7dd3fc,#0284c7)', main: '✈️', sub: '🗽', extra: '☁️', anim: 'planeFloat 3s ease-in-out infinite' },
    dinner: { grad: 'linear-gradient(160deg,#fcd34d,#c2410c)', main: '🍽️', sub: '🍷', extra: '✨', anim: 'sceneBob 3.2s ease-in-out infinite' },
    beach:  { grad: 'linear-gradient(160deg,#6ee7b7,#0d9488)', main: '🏖️', sub: '🌴', extra: '☀️', anim: 'sceneBob 3.4s ease-in-out infinite' },
    spa:    { grad: 'linear-gradient(160deg,#f9a8d4,#a855f7)', main: '💆', sub: '🕯️', extra: '🌸', anim: 'sceneBob 3.4s ease-in-out infinite' },
  }[variant];
  if (!V) return null;
  return (
    <div style={{ position: 'absolute', top: 12, right: 12, width: 78, height: 78, borderRadius: 16, background: V.grad, boxShadow: '0 6px 18px rgba(0,0,0,0.4)', overflow: 'hidden', zIndex: 1 }}>
      <span style={{ position: 'absolute', top: 4, left: 5, fontSize: 20, animation: V.anim, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))', zIndex: 3 }}>{V.main}</span>
      <span style={{ position: 'absolute', top: 4, right: 6, fontSize: 12, opacity: 0.85 }}>{V.extra}</span>
      <span style={{ position: 'absolute', bottom: -2, left: 2, fontSize: 22, zIndex: 3 }}>{V.sub}</span>
      {/* Cara del ganador */}
      <div style={{ position: 'absolute', left: '50%', top: '54%', transform: 'translate(-50%,-50%)', width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', border: '2px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.45)', background: '#0a1730', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, animation: 'sceneBob 2.8s ease-in-out infinite' }}>
        {face
          ? <img src={face} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ color: 'white', fontWeight: 900, fontSize: 13 }}>{initials || '?'}</span>}
      </div>
    </div>
  );
}

// Tarjeta contenedora de cada premio
function PrizeCard({ icon, accent, title, prizeLabel, children, ribbon, temp, scene, sceneFace, sceneInitials }) {
  return (
    <div style={{ position: 'relative', background: 'linear-gradient(160deg,#0f1a30,#0b1424)', border: `1px solid ${accent}44`, borderRadius: 18, padding: 16, overflow: 'hidden' }}>
      {!scene && <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${accent}22, transparent 70%)`, pointerEvents: 'none' }} />}
      {scene && <PrizeScene variant={scene} face={sceneFace} initials={sceneInitials} />}
      {ribbon && !scene && (
        <div style={{ position: 'absolute', top: 12, right: -34, transform: 'rotate(38deg)', background: accent, color: '#0a0a0a', fontWeight: 900, fontSize: 9, padding: '3px 40px', letterSpacing: '0.05em' }}>{ribbon}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, position: 'relative', paddingRight: scene ? 84 : 0 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${accent}22`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ color: 'white', fontWeight: 900, fontSize: 15, lineHeight: 1.15 }}>{title}</h3>
          <p style={{ color: accent, fontSize: 12, fontWeight: 700, marginTop: 1 }}>{prizeLabel}</p>
        </div>
      </div>
      {temp && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, position: 'relative' }}>
          <TempTag />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Van ganando ahora · <b>nadie ha ganado aún</b>, puede cambiar</span>
        </div>
      )}
      <div style={{ marginTop: 12, position: 'relative' }}>{children}</div>
    </div>
  );
}

// Fila de ganador temporal
function WinnerRow({ pos, name, sub, avatarUser, initials, right, dim }) {
  const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 4px', opacity: dim ? 0.45 : 1 }}>
      {medal ? <span style={{ fontSize: 18, width: 22, textAlign: 'center' }}>{medal}</span> : <span style={{ width: 22 }} />}
      {avatarUser !== undefined && (
        <Avatar username={avatarUser} initials={initials || '?'} displayName={name} size={30} colorClass={colorFor(avatarUser)} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: 'white', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</p>
        {sub && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{sub}</p>}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}

export default function Prizes() {
  const { user } = useAuth();
  const { avatars } = useAvatars();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const revealed = isChampionRevealed();

  useEffect(() => {
    if (user?.id) trackPage(user.id, 'premios');
    // Supabase corta a 1000 filas por consulta → paginamos para no truncar conteos
    const fetchAll = async (build) => {
      const all = []; let from = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await build(from, from + 999);
        if (error || !data) break;
        all.push(...data);
        if (data.length < 1000) break;
        from += 1000;
      }
      return all;
    };
    (async () => {
      try {
        const [lbRes, usersRes, matchesRes, champRes, stickers, hits] = await Promise.all([
          api.get('/leaderboard'),
          api.get('/users'),
          api.get('/matches'),
          supabase.from('champion_predictions').select('*, u:users(display_name, username, avatar_initials, department)'),
          fetchAll((a, b) => supabase.from('album_stickers').select('owner_username').range(a, b)),
          fetchAll((a, b) => supabase.from('predictions').select('user_id, match_id, match:matches!inner(status)').eq('match.status', 'finished').gte('points_earned', 2).range(a, b)),
        ]);
        setData({
          leaderboard: lbRes.data || [],
          users: (usersRes.data || []).filter((u) => !isExcluded(u.username)),
          matches: matchesRes.data || [],
          champions: (champRes.data || []),
          stickers: stickers || [],
          hits: hits || [],
        });
      } catch (e) {
        console.error('Prizes fetch error:', e);
        setData({ leaderboard: [], users: [], matches: [], champions: [], stickers: [], hits: [] });
      } finally { setLoading(false); }
    })();
  }, []);

  const derived = useMemo(() => {
    if (!data) return null;
    const { leaderboard, users, matches, champions, stickers, hits } = data;

    // Podio individual
    const podium = leaderboard.slice(0, 3);
    // Los 1°/2°/3° individuales NO participan en Álbum, Racha ni Campeón (condición #3)
    const top3Ids = new Set(podium.map((e) => e.id));
    const top3Usernames = new Set(podium.map((e) => (e.username || '').toLowerCase()));
    const isTop3 = (u) => !!u && (top3Ids.has(u.id) || top3Usernames.has((u.username || '').toLowerCase()));
    const top3Names = podium.map((e) => e.display_name);

    // Departamento campeón (promedio de puntos)
    const deptMap = {};
    for (const e of leaderboard) {
      const d = e.department || 'Sin departamento';
      (deptMap[d] ||= { dept: d, total: 0, count: 0 });
      deptMap[d].total += e.total_points || 0;
      deptMap[d].count += 1;
    }
    const depts = Object.values(deptMap)
      .map((d) => ({ ...d, avg: d.count ? d.total / d.count : 0 }))
      .sort((a, b) => b.avg - a.avg);

    // Álbum: top coleccionistas (excluye a los 1°/2°/3° individuales → sube el siguiente)
    const stickerCount = {};
    for (const s of stickers) stickerCount[s.owner_username] = (stickerCount[s.owner_username] || 0) + 1;
    const albumTop = Object.entries(stickerCount)
      .map(([username, count]) => ({ username, count, u: users.find((x) => x.username === username) }))
      .filter((x) => x.u && !isTop3(x.u))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Mejor racha HISTÓRICA (la mejor seguidilla de aciertos, aunque ya se haya cortado)
    // — misma fórmula que la tabla de posiciones (racha "Histórica / mejor de todas").
    const finishedChrono = matches.filter((m) => m.status === 'finished').sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
    const hitsByUser = {};
    for (const p of hits) (hitsByUser[p.user_id] ||= new Set()).add(p.match_id);
    const maxStreakOf = (uid) => {
      let best = 0, cur = 0;
      for (const m of finishedChrono) { if (hitsByUser[uid]?.has(m.id)) { cur++; if (cur > best) best = cur; } else cur = 0; }
      return best;
    };
    const streakBoard = users
      .map((u) => ({ u, streak: maxStreakOf(u.id) }))
      .filter((x) => x.streak >= 2 && !isTop3(x.u)) // excluye a los 1°/2°/3° individuales
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 3);

    // Campeón del Mundial
    const { eliminated, teamCode } = computeTeams(matches);
    // Señuelos: equipos YA eliminados (con bandera) para despistar antes del sábado
    const decoyPool = [...eliminated].map((t) => ({ team: t, code: teamCode[t] })).filter((x) => x.code);
    const hashStr = (s) => { let h = 0; for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
    const predByUser = {};
    for (const c of champions) predByUser[c.user_id] = c;
    const predicted = champions
      .filter((c) => c.u && !isExcluded(c.u.username))
      .map((c) => ({
        ...c,
        out: eliminated.has(c.champion),
        excluded: isTop3(c.u), // va en el podio individual → no participa en este premio
        decoy: decoyPool.length ? decoyPool[hashStr(c.user_id) % decoyPool.length] : { team: '¿?', code: null },
      }))
      .sort((a, b) => {
        const ra = a.excluded ? 2 : a.out ? 1 : 0;
        const rb = b.excluded ? 2 : b.out ? 1 : 0;
        return ra - rb || (a.u.display_name || '').localeCompare(b.u.display_name || '');
      });
    const notPredicted = users.filter((u) => !predByUser[u.id]);

    return { podium, depts, albumTop, streakBoard, predicted, notPredicted, eliminated, top3Names };
  }, [data]);

  if (loading) return <LoadingSpinner size="lg" text="Cargando premios..." />;

  return (
    <div style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'radial-gradient(120% 60% at 50% 0%, #16112e 0%, #0a0a1a 55%)' }}>
      <div className="max-w-3xl mx-auto px-4 py-6" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
          <div style={{ fontSize: 46, animation: 'trophyBounce 2.2s ease-in-out infinite' }}>🏆</div>
          <h1 style={{ color: 'white', fontWeight: 900, fontSize: 24, lineHeight: 1.1 }}>Premios Andersen<br />Mundialista 2026</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 6, maxWidth: 420, margin: '6px auto 0' }}>
            La firma premia tu esfuerzo. Estos son los reconocimientos en juego y quiénes van ganando ahora mismo ✨
          </p>
        </div>

        {/* Cartel animado */}
        <TempSign />

        {/* Aviso: todo es temporal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.35)', borderRadius: 14, padding: '11px 14px' }}>
          <span style={{ fontSize: 22 }}>⚠️</span>
          <p style={{ color: '#fde68a', fontSize: 12.5, fontWeight: 600, lineHeight: 1.4 }}>
            Estas posiciones son <b>temporales</b> y cambian con cada partido. <b>Nadie ha ganado todavía</b>: los premios se entregan al final del Mundial con los resultados oficiales.
          </p>
        </div>

        {/* ── Podio individual ── */}
        <div>
          <h2 style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '4px 2px 10px' }}>🏅 Pronóstico Individual · Podio</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <PrizeCard icon={<Plane size={22} />} accent="#FFD700" title="🥇 Primer Lugar" prizeLabel="Millas Andersen · viaje hasta $500" scene="plane" sceneFace={avatars[derived.podium[0]?.username?.toLowerCase()]} sceneInitials={derived.podium[0]?.avatar_initials} temp>
              {derived.podium[0]
                ? <WinnerRow pos={1} name={derived.podium[0].display_name} sub={`${derived.podium[0].total_points} pts`} avatarUser={derived.podium[0].username} initials={derived.podium[0].avatar_initials} />
                : <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Aún sin datos</p>}
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 6, lineHeight: 1.4 }}>Viaje obligatorio, puede ir acompañado. Boletos comprados por Andersen (hasta $500), a usar en 2026. Personal e intransferible.</p>
            </PrizeCard>

            <PrizeCard icon={<UtensilsCrossed size={22} />} accent="#C7CDD6" title="🥈 Segundo Lugar" prizeLabel="Experiencia gastronómica para 2" scene="dinner" sceneFace={avatars[derived.podium[1]?.username?.toLowerCase()]} sceneInitials={derived.podium[1]?.avatar_initials} temp>
              {derived.podium[1]
                ? <WinnerRow pos={2} name={derived.podium[1].display_name} sub={`${derived.podium[1].total_points} pts`} avatarUser={derived.podium[1].username} initials={derived.podium[1].avatar_initials} />
                : <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Aún sin datos</p>}
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 6, lineHeight: 1.4 }}>Cena para 2 en un reconocido restaurante de Guayaquil elegido por la firma. Sujeto a disponibilidad.</p>
            </PrizeCard>

            <PrizeCard icon={<HeartPulse size={22} />} accent="#cd7f32" title="🥉 Tercer Lugar" prizeLabel="Experiencia de bienestar" scene="spa" sceneFace={avatars[derived.podium[2]?.username?.toLowerCase()]} sceneInitials={derived.podium[2]?.avatar_initials} temp>
              {derived.podium[2]
                ? <WinnerRow pos={3} name={derived.podium[2].display_name} sub={`${derived.podium[2].total_points} pts`} avatarUser={derived.podium[2].username} initials={derived.podium[2].avatar_initials} />
                : <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Aún sin datos</p>}
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 6, lineHeight: 1.4 }}>Sesión de masajes para 2 personas. Sujeto a disponibilidad del proveedor.</p>
            </PrizeCard>
          </div>
        </div>

        {/* ── Departamento ── */}
        <div>
          <h2 style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '8px 2px 10px' }}>🏢 Pronóstico por Departamento</h2>
          <PrizeCard icon={<Building2 size={22} />} accent="#34d399" title="Departamento Campeón" prizeLabel="Orden de consumo grupal hasta $100" ribbon="EQUIPO" temp>
            {derived.depts[0] && (
              <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                <p style={{ fontSize: 24 }}>🏆</p>
                <p style={{ color: 'white', fontWeight: 900, fontSize: 17, marginTop: 2 }}>{derived.depts[0].dept}</p>
                <p style={{ color: '#34d399', fontSize: 12.5, fontWeight: 700, marginTop: 2 }}>Promedio {derived.depts[0].avg.toFixed(1)} pts · {derived.depts[0].count} participantes</p>
              </div>
            )}
            {derived.depts.length > 1 && (
              <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                Le persiguen: {derived.depts.slice(1, 3).map((d) => `${d.dept} (${d.avg.toFixed(1)})`).join(' · ')}
              </p>
            )}
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 8, lineHeight: 1.4 }}>Gana <b>un solo</b> departamento: el de mayor <b>promedio</b> de puntos. Almuerzo, pizza u otra experiencia para compartir en equipo.</p>
          </PrizeCard>
        </div>

        {/* ── Especiales ── */}
        <div>
          <h2 style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 900, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '8px 2px 10px' }}>🎯 Premios Especiales</h2>

          {/* Los 1°/2°/3° individuales no participan en estos premios */}
          {derived.top3Names?.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 12, padding: '10px 12px', marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>ℹ️</span>
              <p style={{ color: '#bfdbfe', fontSize: 11.5, lineHeight: 1.45 }}>
                No participan en estos premios quienes van <b>1°, 2° o 3°</b> en la tabla individual (ya tienen su premio): <b>{derived.top3Names.join(' · ')}</b>. Por eso sube el siguiente en cada categoría.
              </p>
            </div>
          )}

          <div style={{ display: 'grid', gap: 12 }}>

            {/* Álbum */}
            <PrizeCard icon={<BookOpen size={22} />} accent="#a78bfa" title="📸 Álbum Completo" prizeLabel="Gift Card Sweet & Coffee $20 c/u (×3)" temp>
              {derived.albumTop.length ? derived.albumTop.map((a, i) => (
                <WinnerRow key={a.username} pos={i + 1} name={a.u.display_name} sub={`${a.count} cromos`} avatarUser={a.username} initials={a.u.avatar_initials} />
              )) : <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Aún nadie ha pegado cromos</p>}
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 6, lineHeight: 1.4 }}>Los <b>3 primeros</b> en completar el álbum ganan. Empate → sorteo. (Aquí se muestra quién va liderando.)</p>
            </PrizeCard>

            {/* Racha — UN SOLO ganador (solo el #1) */}
            <PrizeCard icon={<Flame size={22} />} accent="#fb923c" title="⚡ Mejor Racha de Aciertos" prizeLabel="Gift Card $50" ribbon="🔥" temp>
              {derived.streakBoard.length ? derived.streakBoard.slice(0, 1).map((s) => (
                <WinnerRow key={s.u.id} pos={1} name={s.u.display_name} sub={`Racha de ${s.streak} aciertos`} avatarUser={s.u.username} initials={s.u.avatar_initials}
                  right={<span style={{ color: '#fb923c', fontWeight: 900, fontSize: 14 }}>🔥 {s.streak}</span>} />
              )) : <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Aún sin rachas</p>}
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 6, lineHeight: 1.4 }}>Solo <b>1 ganador</b>: la mejor racha de aciertos <b>consecutivos</b>. Empate → más puntos en rachas; si persiste → sorteo.</p>
            </PrizeCard>

            {/* Campeón del Mundial */}
            <PrizeCard icon={<Globe2 size={22} />} accent="#F59E0B" title="⚽ Campeón del Mundial" prizeLabel="Gift Card $50" ribbon="🌎">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: revealed ? 'rgba(52,211,153,0.1)' : 'rgba(96,165,250,0.1)', border: `1px solid ${revealed ? 'rgba(52,211,153,0.3)' : 'rgba(96,165,250,0.3)'}`, borderRadius: 10, padding: '8px 12px', marginBottom: 10 }}>
                {revealed ? <Sparkles size={15} style={{ color: '#34d399' }} /> : <Lock size={15} style={{ color: '#93c5fd' }} />}
                <p style={{ color: revealed ? '#a7f3d0' : '#bfdbfe', fontSize: 11.5, fontWeight: 600 }}>
                  {revealed
                    ? 'Los pronósticos ya son visibles para todos 👀'
                    : 'Los pronósticos se revelan el sábado, cuando cierra el sorteo. ¡Ve el sábado para descubrir qué puso cada quién! 🤫'}
                </p>
              </div>

              {/* Ya pronosticaron */}
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '4px 2px' }}>
                ✅ Ya pronosticaron ({derived.predicted.length})
              </p>
              {derived.predicted.length === 0 && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, padding: '4px 2px' }}>Nadie todavía</p>}
              {derived.predicted.map((c) => (
                <div key={c.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 4px', opacity: (c.out || c.excluded) ? 0.5 : 1 }}>
                  <Avatar username={c.u.username} initials={c.u.avatar_initials || '?'} displayName={c.u.display_name} size={30} colorClass={colorFor(c.u.username)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: 13, textDecoration: (c.out || c.excluded) ? 'line-through' : 'none' }}>{c.u.display_name}</p>
                    {c.excluded
                      ? <p style={{ color: '#93c5fd', fontSize: 10.5, fontWeight: 700 }}>🏅 No participa · va en el podio individual</p>
                      : c.out && <p style={{ color: '#f87171', fontSize: 10.5, fontWeight: 700 }}>❌ Fuera · su campeón quedó eliminado</p>}
                  </div>
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, filter: revealed ? 'none' : 'blur(7px)', userSelect: revealed ? 'auto' : 'none', pointerEvents: revealed ? 'auto' : 'none' }}>
                    {/* Antes del sábado mostramos un equipo SEÑUELO (ya eliminado) para despistar 😈 */}
                    <Flag code={revealed ? c.champion_code : c.decoy.code} size={24} />
                    <span style={{ color: '#FCD34D', fontWeight: 800, fontSize: 12 }}>{revealed ? c.champion : c.decoy.team}</span>
                  </div>
                </div>
              ))}

              {/* Aún no pronostican */}
              {derived.notPredicted.length > 0 && (
                <>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '12px 2px 4px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }}>
                    ⏳ Aún no pronostican ({derived.notPredicted.length})
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {derived.notPredicted.map((u) => (
                      <span key={u.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '3px 10px 3px 4px' }}>
                        <Avatar username={u.username} initials={u.avatar_initials || '?'} displayName={u.display_name} size={22} colorClass={colorFor(u.username)} />
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{u.display_name?.split(' ')[0]}</span>
                      </span>
                    ))}
                  </div>
                </>
              )}

              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 12, lineHeight: 1.4 }}>
                Acierta el <b>campeón</b> y ganas. Desempates: (1) subcampeón, (2) marcador exacto de la final en 120 min. Quien puso un campeón ya eliminado queda <b>fuera</b> de este premio.
              </p>
            </PrizeCard>
          </div>
        </div>

        {/* Condiciones */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>📋 Condiciones generales</p>
          <ul style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11, lineHeight: 1.7, paddingLeft: 16, listStyle: 'disc' }}>
            <li>Premios asignados según resultados oficiales en la app.</li>
            <li>Todos personales e intransferibles; no canjeables por dinero.</li>
            <li>Álbum, Racha y Campeón no aplican para los ganadores del 1°, 2° o 3° lugar individual.</li>
            <li>En caso de empate, tras los criterios de cada categoría, se define por sorteo.</li>
            <li>Consultas: área de Capital Humano.</li>
          </ul>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11, padding: '4px 0 8px' }}>
          ¡Participa, acumula puntos y conviértete en ganador! ⚽🏆
        </p>
      </div>
    </div>
  );
}
