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
            if (c.total_points !== p.total_points || c.exact_scores !== p.exact_scores || c.correct_results !== p.correct_results) r = i + 1;
          }
          if (lb[i].username === username) {
            rank = r; points = lb[i].total_points; exact = lb[i].exact_scores; correct = lb[i].correct_results; break;
          }
        }
      }

      // Stats de partidos jugados
      const fp = fpRes.data || [];
      const incorrect = fp.filter((p) => p.points_earned === 0).length;
      const hits = new Set(fp.filter((p) => p.points_earned >= 2).map((p) => p.match?.id));
      const finishedDesc = (fmRes.data || []).slice().sort((a, b) => new Date(b.match_date) - new Date(a.match_date));
      let streak = 0;
      for (const m of finishedDesc) { if (hits.has(m.id)) streak++; else break; }

      setCard({
        loading: false,
        url: imgRes.data?.signedUrl || null,
        name: u?.display_name || displayName,
        dept: u?.department || '',
        initials: u?.avatar_initials,
        rank, points, exact, correct, incorrect,
        total: totalRes.count || 0,
        streak,
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

function PlayerCard({ card, onClose }) {
  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(5px)',
               display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: 300, maxWidth: '92vw', borderRadius: 20, overflow: 'hidden', position: 'relative',
                 background: '#0a1730', border: '3px solid #FFD100',
                 boxShadow: '0 0 50px rgba(255,209,0,0.35), 0 24px 60px rgba(0,0,0,0.7)' }}>

        {/* Banda superior tricolor (Ecuador) */}
        <div style={{ height: 10, background: 'linear-gradient(90deg,#FFD100 0%,#FFD100 50%,#0072CE 50%,#0072CE 78%,#EF3340 78%)' }} />

        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px',
                      background: 'linear-gradient(180deg, rgba(255,209,0,0.18), transparent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {card.rank != null && (
              <div style={{ background: '#FFD100', color: '#0a1730', fontWeight: 900, fontSize: 16, borderRadius: 8, padding: '2px 8px', lineHeight: 1.1, textAlign: 'center' }}>
                #{card.rank}
                <div style={{ fontSize: 6.5, fontWeight: 800, letterSpacing: '0.08em' }}>POS</div>
              </div>
            )}
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#FFD100', letterSpacing: '0.05em' }}>🇪🇨 MUNDIAL 2026</span>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.55)', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        {/* Foto */}
        <div style={{ position: 'relative', padding: '4px 0 0',
                      background: 'radial-gradient(circle at 50% 30%, rgba(0,114,206,0.35), transparent 70%)' }}>
          {card.loading ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}>Cargando…</div>
          ) : card.url ? (
            <img src={card.url} alt={card.name} style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, fontWeight: 900, color: 'rgba(255,255,255,0.85)' }}>
              {card.initials || '?'}
            </div>
          )}
        </div>

        {/* Nombre + departamento */}
        <div style={{ padding: '10px 14px 8px', background: 'linear-gradient(180deg, #0072CE, #0a1730)', textAlign: 'center' }}>
          <div style={{ color: 'white', fontWeight: 900, fontSize: 18, lineHeight: 1.1 }}>{card.name}</div>
          {card.dept && <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10.5, fontWeight: 600, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.dept}</div>}
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
        {/* Banda inferior tricolor */}
        <div style={{ height: 8, background: 'linear-gradient(90deg,#FFD100 0%,#FFD100 50%,#0072CE 50%,#0072CE 78%,#EF3340 78%)' }} />
      </div>
    </div>
  );
}
