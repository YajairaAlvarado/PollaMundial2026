import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';

const AvatarContext = createContext({ avatars: {}, openLightbox: () => {}, ready: false });
export const useAvatars = () => useContext(AvatarContext);

const SIGNED_EXPIRY = 60 * 60 * 24 * 7; // 7 días

export function AvatarProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [avatars, setAvatars] = useState({});   // username -> signed thumb url
  const [ready,   setReady]   = useState(false);
  const [card,    setCard]    = useState(null);  // cromo del jugador

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancel = false;
    (async () => {
      try {
        const { data: files, error } = await supabase.storage.from('avatars').list('thumbs', { limit: 1000 });
        if (error || !files?.length) { setReady(true); return; }
        const paths = files.filter((f) => /\.(jpg|jpeg|png)$/i.test(f.name)).map((f) => `thumbs/${f.name}`);
        const { data: signed } = await supabase.storage.from('avatars').createSignedUrls(paths, SIGNED_EXPIRY);
        if (cancel) return;
        const map = {};
        (signed || []).forEach((s) => {
          if (!s.signedUrl) return;
          const m = s.path.match(/thumbs\/(.+)\.(jpg|jpeg|png)$/i);
          if (m) map[m[1].toLowerCase()] = s.signedUrl;
        });
        setAvatars(map);
        setReady(true);
      } catch { setReady(true); }
    })();
    return () => { cancel = true; };
  }, [isAuthenticated]);

  const openLightbox = useCallback(async (username, displayName) => {
    if (!username) return;
    username = username.toLowerCase();
    setCard({ loading: true, name: displayName });

    try {
      const { data: u } = await supabase.from('users')
        .select('id, department, display_name, avatar_initials').eq('username', username).single();

      const [imgRes, lbRes, fpRes, fmRes, totalRes] = await Promise.all([
        supabase.storage.from('avatars').createSignedUrl(`full/${username}.jpg`, SIGNED_EXPIRY),
        supabase.from('leaderboard').select('username, total_points, exact_scores, correct_results')
          .order('total_points', { ascending: false }).order('exact_scores', { ascending: false }).order('correct_results', { ascending: false }),
        u ? supabase.from('predictions').select('points_earned, match:matches!inner(id, status, match_date)').eq('user_id', u.id).eq('match.status', 'finished') : Promise.resolve({ data: [] }),
        supabase.from('matches').select('id, match_date').eq('status', 'finished'),
        u ? supabase.from('predictions').select('id', { count: 'exact', head: true }).eq('user_id', u.id) : Promise.resolve({ count: 0 }),
      ]);

      // Posición (dense rank) en el leaderboard
      const lb = lbRes.data || [];
      let rank = null, points = 0, exact = 0, correct = 0;
      {
        let r = 1;
        for (let i = 0; i < lb.length; i++) {
          if (i > 0) {
            const p = lb[i - 1], c = lb[i];
            if (c.total_points !== p.total_points || c.exact_scores !== p.exact_scores || c.correct_results !== p.correct_results) r += 1;
          }
          if (lb[i].username === username) {
            rank = r; points = lb[i].total_points; exact = lb[i].exact_scores; correct = lb[i].correct_results; break;
          }
        }
      }

      // Stats de partidos jugados
      const fp = fpRes.data || [];
      const incorrect = fp.filter((p) => p.points_earned === 0).length;
      const finishedDesc = (fmRes.data || []).slice().sort((a, b) => new Date(b.match_date) - new Date(a.match_date));

      // Aciertos de TODOS (paginado) para saber quién es el rey de la racha
      const hitsByUser = {};
      let fromP = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: pg } = await supabase.from('predictions')
          .select('user_id, match_id, match:matches!inner(status)')
          .eq('match.status', 'finished').gte('points_earned', 2)
          .range(fromP, fromP + 999);
        if (!pg || pg.length === 0) break;
        for (const p of pg) { (hitsByUser[p.user_id] ||= new Set()).add(p.match_id); }
        if (pg.length < 1000) break;
        fromP += 1000;
      }
      const streakOf = (uid) => { let s = 0; for (const m of finishedDesc) { if (hitsByUser[uid]?.has(m.id)) s++; else break; } return s; };
      let maxStreak = 0, kingId = null;
      for (const uid in hitsByUser) { const st = streakOf(uid); if (st > maxStreak) { maxStreak = st; kingId = uid; } }
      const streak = u ? streakOf(u.id) : 0;
      const isKing = !!u && u.id === kingId && maxStreak >= 2;

      setCard({
        loading: false,
        url: imgRes.data?.signedUrl || null,
        name: u?.display_name || displayName,
        dept: u?.department || '',
        initials: u?.avatar_initials,
        rank, points, exact, correct, incorrect,
        total: totalRes.count || 0,
        streak, isKing,
      });
    } catch {
      setCard((c) => ({ ...(c || {}), loading: false }));
    }
  }, []);

  const close = useCallback(() => setCard(null), []);

  return (
    <AvatarContext.Provider value={{ avatars, openLightbox, ready }}>
      {children}
      {card && <PlayerCard card={card} onClose={close} />}
    </AvatarContext.Provider>
  );
}

// ── Cromo estilo álbum del Mundial (colores de Ecuador) ───────────────────────
function Stat({ value, label, color }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 8.5, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{label}</div>
    </div>
  );
}

const CARD_THEMES = {
  king:    { border: '#ff6a00', glow: 'rgba(249,115,22,0.65)', accent: '#fb923c', band: 'linear-gradient(90deg,#fb923c,#ef4444,#fb923c)', ribbon: '🔥 EN LLAMAS 🔥', ribbonBg: 'linear-gradient(90deg,#ef4444,#fb923c)', ribbonColor: '#fff', medal: '🔥' },
  gold:    { border: '#FFD700', glow: 'rgba(255,215,0,0.55)', accent: '#FFD700', band: 'linear-gradient(90deg,#FFD700,#FFA500,#FFD700)', ribbon: '🥇 LÍDER ACTUAL · ORO TEMPORAL', ribbonBg: 'linear-gradient(90deg,#FFA500,#FFD700)', ribbonColor: '#3a2e00', medal: '🥇' },
  silver:  { border: '#C7CDD6', glow: 'rgba(199,205,214,0.5)',  accent: '#C7CDD6', band: 'linear-gradient(90deg,#C7CDD6,#9aa3ad,#C7CDD6)', ribbon: '🥈 2° LUGAR · PLATA TEMPORAL', ribbonBg: 'linear-gradient(90deg,#9aa3ad,#C7CDD6)', ribbonColor: '#2b2f36', medal: '🥈' },
  bronze:  { border: '#cd7f32', glow: 'rgba(205,127,50,0.5)',  accent: '#e0a060', band: 'linear-gradient(90deg,#cd7f32,#a8642a,#cd7f32)', ribbon: '🥉 3° LUGAR · BRONCE TEMPORAL', ribbonBg: 'linear-gradient(90deg,#a8642a,#cd7f32)', ribbonColor: '#3a230d', medal: '🥉' },
  default: { border: '#FFD100', glow: 'rgba(255,209,0,0.35)', accent: '#FFD100', band: 'linear-gradient(90deg,#FFD100 0%,#FFD100 50%,#0072CE 50%,#0072CE 78%,#EF3340 78%)', ribbon: null, medal: null },
};

function PlayerCard({ card, onClose }) {
  const t = card.isKing ? CARD_THEMES.king
    : card.rank === 1 ? CARD_THEMES.gold
    : card.rank === 2 ? CARD_THEMES.silver
    : card.rank === 3 ? CARD_THEMES.bronze
    : CARD_THEMES.default;
  const medal = card.isKing ? '🔥' : card.rank <= 3 ? CARD_THEMES[['', 'gold', 'silver', 'bronze'][card.rank]].medal : null;

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(5px)',
               display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: 300, maxWidth: '92vw', borderRadius: 20, overflow: 'hidden', position: 'relative',
                 background: '#0a1730', border: `3px solid ${t.border}`,
                 boxShadow: `0 0 55px ${t.glow}, 0 24px 60px rgba(0,0,0,0.7)` }}>

        {/* Cinta especial (campeón / en llamas) */}
        {t.ribbon && (
          <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 900, letterSpacing: '0.06em',
                        padding: '5px 0', background: t.ribbonBg, color: t.ribbonColor }}>
            {t.ribbon}
          </div>
        )}

        {/* Banda superior */}
        <div style={{ height: 8, background: t.band }} />

        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px',
                      background: `${t.accent}22` }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: t.accent, letterSpacing: '0.05em' }}>🇪🇨 MUNDIAL 2026</span>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Escenario: foto + número gigante de fondo (estilo cromo) */}
        <div style={{ position: 'relative', overflow: 'hidden',
                      background: `linear-gradient(160deg, ${t.accent}40 0%, rgba(0,114,206,0.22) 55%, #0a1730 100%)` }}>
          {card.rank != null && (
            <span style={{ position: 'absolute', top: -22, right: -8, fontSize: 150, fontWeight: 900, fontStyle: 'italic',
                           lineHeight: 1, color: 'rgba(255,255,255,0.10)', zIndex: 0, pointerEvents: 'none' }}>
              {card.rank}
            </span>
          )}
          {medal && <span style={{ position: 'absolute', top: 8, left: 10, fontSize: 30, zIndex: 2 }}>{medal}</span>}
          {card.loading ? (
            <div style={{ height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', position: 'relative', zIndex: 1 }}>Cargando…</div>
          ) : card.url ? (
            <img src={card.url} alt={card.name} style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block', position: 'relative', zIndex: 1 }} />
          ) : (
            <div style={{ height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, fontWeight: 900, color: 'rgba(255,255,255,0.85)', position: 'relative', zIndex: 1 }}>
              {card.initials || '?'}
            </div>
          )}
        </div>

        {/* Banda del nombre (marco de color + interior oscuro) */}
        <div style={{ background: t.band, padding: 2 }}>
          <div style={{ background: '#0a1730', padding: '9px 14px', textAlign: 'center' }}>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 18, lineHeight: 1.1 }}>{card.name}</div>
            <div style={{ color: t.accent, fontSize: 10.5, fontWeight: 800, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {card.dept}{card.rank != null ? ` · #${card.rank}` : ''}
            </div>
          </div>
        </div>

        {/* Stats */}
        {!card.loading && (
          <>
            <div style={{ display: 'flex', padding: '10px 8px', background: '#0a1730', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <Stat value={card.points} label="Puntos"    color="#FFD100" />
              <Stat value={card.exact}  label="Exactos"   color="#34d399" />
              <Stat value={card.correct} label="Correctos" color="#60a5fa" />
              <Stat value={card.incorrect} label="Fallos"  color="#f87171" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '8px 10px 12px',
                          background: '#0a1730', fontSize: 11, fontWeight: 700 }}>
              <span style={{ color: '#fb923c' }}>🔥 Racha: {card.streak || 0}</span>
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>🎯 {card.total} pronosticados</span>
            </div>
          </>
        )}
        {/* Banda inferior */}
        <div style={{ height: 8, background: t.band }} />
      </div>
    </div>
  );
}
