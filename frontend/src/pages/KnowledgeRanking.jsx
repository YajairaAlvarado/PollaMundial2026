import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../contexts/AuthContext';
import { isExcluded } from '../utils/users';
import { trackPage } from '../utils/trackPage';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';

const COLORS = ['bg-purple-600','bg-blue-600','bg-emerald-600','bg-rose-600','bg-orange-600','bg-teal-600','bg-indigo-600','bg-pink-600'];
const colorFor = (u) => COLORS[(u?.charCodeAt(0) || 0) % COLORS.length];

export default function KnowledgeRanking() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (user?.id) trackPage(user.id, 'conocimiento');
    (async () => {
      const { data } = await supabase
        .from('andersen_trivia_ranking')
        .select('*')
        .order('correct_count', { ascending: false });
      setRows((data || []).filter((r) => !isExcluded(r.username)));
    })();
  }, [user?.id]);

  if (!rows) return <LoadingSpinner size="lg" text="Cargando ranking..." />;

  // dense rank por aciertos
  let rank = 0, prev = null;
  const ranked = rows.map((r, i) => {
    if (prev === null || r.correct_count !== prev) { rank = i + 1; prev = r.correct_count; }
    return { ...r, rank };
  });

  return (
    <div style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'radial-gradient(120% 60% at 50% 0%, #1a1330 0%, #0a0a1a 55%)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 44 }}>🧠</div>
          <h1 style={{ color: 'white', fontWeight: 900, fontSize: 22, lineHeight: 1.1 }}>Quién más sabe de Andersen</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12.5, marginTop: 6 }}>
            Ranking por respuestas correctas de la campaña de conocimiento. 🤫 (no se muestran las preguntas)
          </p>
        </div>

        {ranked.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 40 }}>Aún nadie ha contestado.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ranked.map((r) => {
              const medal = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : null;
              const me = r.id === user?.id;
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 12,
                  background: me ? 'rgba(255,209,0,0.1)' : (r.rank <= 3 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)'),
                  border: `1px solid ${me ? 'rgba(255,209,0,0.4)' : 'rgba(255,255,255,0.07)'}` }}>
                  <span style={{ width: 26, textAlign: 'center', fontWeight: 900, fontSize: 14,
                    color: r.rank === 1 ? '#FFD700' : r.rank === 2 ? '#C7CDD6' : r.rank === 3 ? '#cd7f32' : 'rgba(255,255,255,0.4)' }}>
                    {medal || r.rank}
                  </span>
                  <Avatar username={r.username} initials={r.avatar_initials} displayName={r.display_name} size={34} colorClass={colorFor(r.username)} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'white', fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.display_name}{me ? ' (tú)' : ''}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{r.department}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: '#34d399', fontWeight: 900, fontSize: 18, lineHeight: 1 }}>{r.correct_count}</div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' }}>aciertos</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
