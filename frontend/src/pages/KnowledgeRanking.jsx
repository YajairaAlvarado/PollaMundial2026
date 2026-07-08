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

  if (!rows) return <LoadingSpinner size="lg" text="Cargando estadísticas..." />;

  const fmtTime = (ms) => {
    if (!ms && ms !== 0) return '—';
    const s = ms / 1000;
    return s < 10 ? `${s.toFixed(1)}s` : `${Math.round(s)}s`;
  };

  // Orden estadístico: más aciertos primero; a igualdad, quien respondió más rápido (menor promedio)
  const sorted = [...rows].sort((a, b) =>
    (b.correct_count - a.correct_count) ||
    ((a.avg_ms ?? 9e9) - (b.avg_ms ?? 9e9)) ||
    (a.display_name || '').localeCompare(b.display_name || '')
  );

  return (
    <div style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'radial-gradient(120% 60% at 50% 0%, #1a1330 0%, #0a0a1a 55%)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 44 }}>🧠</div>
          <h1 style={{ color: 'white', fontWeight: 900, fontSize: 22, lineHeight: 1.1 }}>Quién más sabe de Andersen</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12.5, marginTop: 6 }}>
            Estadísticas de la campaña de conocimiento. 🤫 (no se muestran las preguntas)
          </p>
        </div>

        {sorted.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 40 }}>Aún nadie ha contestado.</p>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <th style={th('left', 34)}>#</th>
                  <th style={th('left')}>Jugador</th>
                  <th style={th('center')}>Contestadas</th>
                  <th style={th('center')}>Correctas</th>
                  <th style={th('center')}>Tiempo prom.</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => {
                  const me = r.id === user?.id;
                  return (
                    <tr key={r.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: me ? 'rgba(255,209,0,0.08)' : 'transparent' }}>
                      <td style={td('center')}><span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 800 }}>{i + 1}</span></td>
                      <td style={td('left')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <Avatar username={r.username} initials={r.avatar_initials} displayName={r.display_name} size={30} colorClass={colorFor(r.username)} />
                          <div style={{ minWidth: 0 }}>
                            <p style={{ color: 'white', fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>{r.display_name}{me ? ' (tú)' : ''}</p>
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{r.department}</p>
                          </div>
                        </div>
                      </td>
                      <td style={td('center')}><span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>{r.answered_count}</span></td>
                      <td style={td('center')}><span style={{ color: '#34d399', fontWeight: 900, fontSize: 15 }}>{r.correct_count}</span></td>
                      <td style={td('center')}><span style={{ color: '#60a5fa', fontWeight: 700 }}>{fmtTime(r.avg_ms)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'center', marginTop: 12 }}>
          Orden: más correctas primero; a igualdad, menor tiempo promedio de respuesta.
        </p>
      </div>
    </div>
  );
}

const th = (align, w) => ({ textAlign: align, padding: '9px 10px', color: 'rgba(255,255,255,0.55)', fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', width: w });
const td = (align) => ({ textAlign: align, padding: '8px 10px', verticalAlign: 'middle' });
