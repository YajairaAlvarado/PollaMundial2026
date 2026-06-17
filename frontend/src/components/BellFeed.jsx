import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../utils/supabase';
import api from '../utils/api';
import Avatar from './Avatar';

const PAGE = 5;

export default function BellFeed({ unread, onOpen }) {
  const [open,    setOpen]    = useState(false);
  const [items,   setItems]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [rankMap, setRankMap] = useState({});  // display_name → rank
  const ref = useRef(null);

  // Carga ranking una sola vez al montar
  useEffect(() => {
    api.get('/leaderboard').then(({ data }) => {
      const map = {};
      let rank = 1;
      (data || []).forEach((e, i) => {
        if (i > 0) {
          const prev = data[i - 1];
          if (e.total_points !== prev.total_points || e.exact_scores !== prev.exact_scores) rank = i + 1;
        }
        map[e.display_name] = rank;
      });
      setRankMap(map);
    }).catch(() => {});
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadPage = async (p) => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data, count } = await supabase
      .from('prediction_broadcasts')
      .select('*', { count: 'exact' })
      .gte('created_at', today + 'T00:00:00Z')
      .order('created_at', { ascending: false })
      .range(p * PAGE, p * PAGE + PAGE - 1);
    setItems((prev) => p === 0 ? (data || []) : [...prev, ...(data || [])]);
    setTotal(count || 0);
    setPage(p);
    setLoading(false);
  };

  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      onOpen?.();
      loadPage(0);
    }
  };

  const hasMore = items.length < total;

  return (
    <div className="relative" ref={ref}>
      {/* Botón campanita */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-xl transition-all"
        style={{
          background: open ? 'rgba(52,211,153,0.12)' : 'transparent',
          color: open ? '#34d399' : 'rgba(255,255,255,0.45)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(52,211,153,0.08)'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent'; }}
        title="Predicciones de hoy"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white px-0.5"
            style={{ background: '#E4002B', boxShadow: '0 0 6px rgba(228,0,43,0.7)' }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 rounded-2xl shadow-2xl overflow-hidden z-50"
          style={{
            width: 320,
            background: '#0D1B30',
            border: '1px solid rgba(52,211,153,0.2)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-2">
              <Bell size={13} style={{ color: '#34d399' }} />
              <p className="text-white font-bold text-sm">Predicciones de hoy</p>
            </div>
            {total > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                {total}
              </span>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && !loading && (
              <p className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Ningún partido ha arrancado aún hoy
              </p>
            )}
            {items.map((item, i) => {
              const time = new Date(item.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={item.id}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/5"
                  style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <Avatar username={item.username} initials={item.avatar_initials} displayName={item.display_name} size={30} clickable={false} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold truncate">
                      {rankMap[item.display_name] && (
                        <span className="font-black mr-1" style={{ color: '#F59E0B' }}>
                          #{rankMap[item.display_name]}
                        </span>
                      )}
                      {item.display_name}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {item.home_code && <img src={`https://flagcdn.com/12x9/${item.home_code}.png`} alt="" className="rounded" />}
                      <span className="text-[10px] text-white/50 truncate">{item.home_team} vs {item.away_team}</span>
                      {item.away_code && <img src={`https://flagcdn.com/12x9/${item.away_code}.png`} alt="" className="rounded" />}
                    </div>
                  </div>
                  <span className="text-[10px] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>{time}</span>
                </div>
              );
            })}

            {/* Ver más */}
            {hasMore && (
              <button
                onClick={() => loadPage(page + 1)}
                disabled={loading}
                className="w-full py-2.5 text-xs font-semibold transition-all"
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  color: loading ? 'rgba(255,255,255,0.2)' : '#34d399',
                  background: 'rgba(52,211,153,0.04)',
                }}>
                {loading ? 'Cargando...' : `Ver ${Math.min(PAGE, total - items.length)} más`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
