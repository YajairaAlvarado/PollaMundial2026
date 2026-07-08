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
        .from('andersen_points_board')
        .select('*')
        .order('recognized_pts', { ascending: false });
      setRows((data || []).filter((r) => !isExcluded(r.username)));
    })();
  }, [user?.id]);

  if (!rows) return <LoadingSpinner size="lg" text="Cargando estadísticas..." />;

  // Orden: más puntos reconocidos primero; luego total; luego correctas
  const sorted = [...rows].sort((a, b) =>
    (b.recognized_pts - a.recognized_pts) ||
    (b.total_pts - a.total_pts) ||
    (b.correct_count - a.correct_count) ||
    (a.display_name || '').localeCompare(b.display_name || '')
  );

  return (
    <div style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'radial-gradient(120% 60% at 50% 0%, #1a1330 0%, #0a0a1a 55%)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 44 }}>⭐</div>
          <h1 style={{ color: 'white', fontWeight: 900, fontSize: 22, lineHeight: 1.1 }}>Puntos Adicionales</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12.5, marginTop: 6 }}>
            Trivia Mundialista + Trivia de conocimiento Andersen · máximo <b style={{ color: '#FFD100' }}>20 puntos</b> reconocidos. 🤫 (no se muestran las preguntas)
          </p>
        </div>

        {/* Cómo funciona la campaña */}
        <div style={{ background: 'linear-gradient(160deg,#B3001F,#7d0016)', borderRadius: 16, padding: '16px 18px', marginBottom: 16, boxShadow: '0 8px 24px rgba(179,0,31,0.3)' }}>
          <p style={{ color: 'white', fontWeight: 900, fontStyle: 'italic', fontSize: 17 }}>🏆 TRIVIA ANDERSEN</p>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12.5, lineHeight: 1.5, marginTop: 6 }}>
            Contesta hasta <b>4 preguntas diarias</b> sobre Andersen Global y Andersen Ecuador. Cada acierto suma <b>+1 punto</b> a tu marcador del Pronóstico Mundialista.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {[['🎯', '4 preguntas / día'], ['⭐', 'Hasta 20 pts extra'], ['📅', 'Hasta el 17 de Julio'], ['⚡', 'Responde rápido']].map(([e, t]) => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 11.5, fontWeight: 700, padding: '5px 11px', borderRadius: 20 }}>
                {e} {t}
              </span>
            ))}
          </div>
        </div>

        {/* Tips (sin revelar respuestas) */}
        <p style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 900, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '4px 2px 10px' }}>
          💡 Cómo ganar
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 22 }}>
          {[
            ['🎯', 'Juega cada día', 'Tienes 4 preguntas nuevas por día. ¡No las dejes pasar!'],
            ['⚡', 'Responde a tiempo', 'Cada pregunta tiene su cronómetro: lee y elige sin demorar.'],
            ['📈', 'Sube posiciones', 'Cada acierto suma +1 a tu marcador del Pronóstico Mundialista.'],
            ['🔁', 'Sin repetir', 'Una pregunta que ya viste no vuelve a salir.'],
            ['⭐', 'Tope de 20', 'Puedes ganar hasta 20 puntos por actividades adicionales.'],
            ['📅', 'Hasta el 17 de Julio', 'Aprovecha antes de que se acabe este beneficio.'],
            ['🧠', 'Conoce la firma', 'Repasa sobre Andersen Global y Andersen Ecuador.'],
            ['🤝', 'Juego limpio', 'Monitoreamos el uso de IA. Salir de la ventana o usar ayudas externas puede descalificarte; salir cuenta como incorrecta.'],
          ].map(([e, t, d]) => (
            <div key={t} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 13px' }}>
              <div style={{ fontSize: 22 }}>{e}</div>
              <p style={{ color: '#FFD100', fontWeight: 800, fontSize: 12, marginTop: 5 }}>{t}</p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, lineHeight: 1.4, marginTop: 2 }}>{d}</p>
            </div>
          ))}
        </div>

        <p style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 900, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '4px 2px 10px' }}>
          📊 Tabla de puntos adicionales
        </p>

        {sorted.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 40 }}>Aún nadie tiene puntos adicionales.</p>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 620 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <th rowSpan={2} style={th('center', 34)}>#</th>
                  <th rowSpan={2} style={th('left')}>Jugador</th>
                  <th rowSpan={2} style={th('center')}>Trivia<br/>Mundialista</th>
                  <th colSpan={2} style={{ ...th('center'), borderLeft: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Conocimiento Andersen</th>
                  <th rowSpan={2} style={{ ...th('center'), borderLeft: '1px solid rgba(255,255,255,0.1)' }}>Total</th>
                  <th rowSpan={2} style={th('center')}>Puntos<br/>reconocidos</th>
                </tr>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <th style={{ ...th('center'), borderLeft: '1px solid rgba(255,255,255,0.1)' }}>Contestadas</th>
                  <th style={th('center')}>Correctas</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => {
                  const me = r.id === user?.id;
                  const capped = r.total_pts > 20;
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
                      <td style={td('center')}><span style={{ color: r.mundialista_pts ? '#FFD100' : 'rgba(255,255,255,0.3)', fontWeight: 800 }}>{r.mundialista_pts}</span></td>
                      <td style={{ ...td('center'), borderLeft: '1px solid rgba(255,255,255,0.06)' }}><span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{r.answered_count}</span></td>
                      <td style={td('center')}><span style={{ color: '#34d399', fontWeight: 900 }}>{r.correct_count}</span></td>
                      <td style={{ ...td('center'), borderLeft: '1px solid rgba(255,255,255,0.06)' }}><span style={{ color: 'white', fontWeight: 900, fontSize: 15 }}>{r.total_pts}</span></td>
                      <td style={td('center')}>
                        <span style={{ color: '#FFD100', fontWeight: 900, fontSize: 15 }}>{r.recognized_pts}</span>
                        {capped && <span style={{ display: 'block', color: '#f59e0b', fontSize: 9, fontWeight: 700 }}>tope 20</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'center', marginTop: 12 }}>
          Orden: más puntos reconocidos primero. Se reconocen como máximo <b>20 puntos</b> por actividades adicionales.
        </p>
      </div>
    </div>
  );
}

const th = (align, w) => ({ textAlign: align, padding: '9px 10px', color: 'rgba(255,255,255,0.55)', fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', width: w });
const td = (align) => ({ textAlign: align, padding: '8px 10px', verticalAlign: 'middle' });
