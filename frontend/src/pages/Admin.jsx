import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Users, ChevronDown, ChevronUp, Search, Trophy, Target, CheckCircle, Clock } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Admin() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [users,        setUsers]        = useState([]);
  const [search,       setSearch]       = useState('');
  const [expanded,     setExpanded]     = useState(null);
  const [predictions,  setPredictions]  = useState({});
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingPreds, setLoadingPreds] = useState(false);

  // Redirigir si no es admin
  useEffect(() => {
    if (user && !user.isAdmin) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    supabase
      .from('users')
      .select('id, username, display_name, avatar_initials, is_admin')
      .order('display_name')
      .then(({ data }) => {
        setUsers(data || []);
        setLoadingUsers(false);
      });
  }, []);

  const toggleUser = useCallback(async (userId) => {
    if (expanded === userId) { setExpanded(null); return; }
    setExpanded(userId);
    if (predictions[userId]) return;

    setLoadingPreds(true);
    const { data } = await supabase
      .from('predictions')
      .select('*, match:matches(home_team, away_team, home_code, away_code, group_name, match_date, home_score, away_score, status)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    setPredictions((prev) => ({ ...prev, [userId]: data || [] }));
    setLoadingPreds(false);
  }, [expanded, predictions]);

  const filtered = users.filter((u) =>
    u.display_name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const statsFor = (preds) => ({
    total:   preds.reduce((s, p) => s + (p.points_earned || 0), 0),
    exact:   preds.filter((p) => p.points_earned === 3).length,
    correct: preds.filter((p) => p.points_earned === 2).length,
    made:    preds.length,
  });

  if (loadingUsers) return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" text="Cargando usuarios..." />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl" style={{ background: 'rgba(228,0,43,0.15)' }}>
          <Users size={20} style={{ color: '#E4002B' }} />
        </div>
        <div>
          <h1 className="text-white font-bold text-xl">Panel de Administración</h1>
          <p className="text-white/40 text-sm">{users.length} usuarios registrados</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
        <input
          type="text"
          placeholder="Buscar por nombre o usuario..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl pl-10 pr-4 py-3 text-sm outline-none"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
        />
      </div>

      {/* Lista de usuarios */}
      <div className="space-y-2">
        {filtered.map((u) => {
          const preds    = predictions[u.id] || [];
          const isOpen   = expanded === u.id;
          const stats    = isOpen ? statsFor(preds) : null;

          return (
            <div key={u.id} className="rounded-xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>

              {/* Fila del usuario */}
              <button
                onClick={() => toggleUser(u.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-white/5"
              >
                <div className="w-8 h-8 rounded-full bg-red-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {u.avatar_initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{u.display_name}</p>
                  <p className="text-white/40 text-xs">{u.username}{u.is_admin && <span className="ml-2 text-yellow-400">★ Admin</span>}</p>
                </div>
                {isOpen && stats && (
                  <div className="hidden sm:flex items-center gap-4 mr-2">
                    <span className="text-yellow-400 text-sm font-bold">{stats.total} pts</span>
                    <span className="text-white/40 text-xs">{stats.made} pred.</span>
                  </div>
                )}
                {isOpen ? <ChevronUp size={16} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />}
              </button>

              {/* Predicciones del usuario */}
              {isOpen && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {loadingPreds && !predictions[u.id] ? (
                    <div className="py-6 flex justify-center"><LoadingSpinner size="sm" /></div>
                  ) : preds.length === 0 ? (
                    <p className="text-white/30 text-sm text-center py-6">Sin predicciones aún</p>
                  ) : (
                    <>
                      {/* Stats resumen */}
                      <div className="grid grid-cols-4 gap-2 px-4 py-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
                        {[
                          { icon: <Trophy size={13} />, label: 'Puntos',    value: stats.total,   color: '#FBBF24' },
                          { icon: <CheckCircle size={13} />, label: 'Exactos', value: stats.exact, color: '#34D399' },
                          { icon: <Target size={13} />, label: 'Correctos', value: stats.correct,  color: '#60A5FA' },
                          { icon: <Clock size={13} />, label: 'Predicciones', value: stats.made,   color: 'rgba(255,255,255,0.4)' },
                        ].map((s) => (
                          <div key={s.label} className="text-center">
                            <div className="flex justify-center mb-0.5" style={{ color: s.color }}>{s.icon}</div>
                            <p className="text-white font-bold text-sm">{s.value}</p>
                            <p className="text-white/30 text-[10px]">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Tabla de predicciones */}
                      <div className="px-4 py-3 space-y-1.5 max-h-72 overflow-y-auto">
                        {preds.map((p) => {
                          const m       = p.match;
                          const dateStr = format(parseISO(m.match_date), "d MMM HH:mm", { locale: es });
                          const ptsCls  = p.points_earned === 3 ? '#34D399' : p.points_earned === 2 ? '#60A5FA' : p.points_earned === 0 ? '#F87171' : 'rgba(255,255,255,0.3)';
                          const savedAt = format(parseISO(p.created_at), "d MMM HH:mm", { locale: es });

                          return (
                            <div key={p.id} className="flex items-center gap-2 text-xs rounded-lg px-3 py-2"
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              {/* Banderas */}
                              <img src={`https://flagcdn.com/16x12/${m.home_code}.png`} alt="" className="rounded" />
                              <span className="text-white/60 truncate hidden sm:inline">{m.home_team}</span>
                              <span className="text-white font-bold">{p.home_score}–{p.away_score}</span>
                              <span className="text-white/60 truncate hidden sm:inline">{m.away_team}</span>
                              <img src={`https://flagcdn.com/16x12/${m.away_code}.png`} alt="" className="rounded" />

                              {/* Resultado real */}
                              {m.status === 'finished' && (
                                <span className="text-white/40 ml-1">({m.home_score}–{m.away_score})</span>
                              )}

                              <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                                <span style={{ color: ptsCls }} className="font-bold">
                                  {p.points_earned !== null ? `${p.points_earned} pts` : '–'}
                                </span>
                                <span className="text-white/25">{savedAt}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
