import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const AVATAR_COLORS = [
  'bg-purple-600', 'bg-blue-600', 'bg-emerald-600', 'bg-rose-600',
  'bg-orange-600', 'bg-teal-600', 'bg-indigo-600', 'bg-pink-600',
  'bg-cyan-600', 'bg-amber-600', 'bg-lime-600', 'bg-red-600',
];

const RANK_COLORS = {
  1: '#F59E0B',
  2: '#94a3b8',
  3: '#cd7f32',
};

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-xl">🥇</span>;
  if (rank === 2) return <span className="text-xl">🥈</span>;
  if (rank === 3) return <span className="text-xl">🥉</span>;
  return <span className="text-sm font-bold w-7 text-center block" style={{ color: 'rgba(255,255,255,0.4)' }}>#{rank}</span>;
}

export default function LeaderboardTable({ data }) {
  const { user } = useAuth();

  if (!data || data.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: '#0D1B30', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>No hay datos en la tabla aún</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#0D1B30', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Header */}
      <div
        className="grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider"
        style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)' }}
      >
        <div className="col-span-1 text-center">#</div>
        <div className="col-span-5">Jugador</div>
        <div className="col-span-2 text-center">Pts</div>
        <div className="col-span-2 text-center">Exactos</div>
        <div className="col-span-2 text-center">Correctos</div>
      </div>

      {/* Rows */}
      <div>
        {data.map((entry, idx) => {
          const isCurrentUser = user && entry.username === user.username;
          const colorIdx = entry.username.charCodeAt(0) % AVATAR_COLORS.length;
          const rankColor = RANK_COLORS[entry.rank] || 'white';

          return (
            <div
              key={entry.id}
              className="grid grid-cols-12 gap-2 px-4 py-3 items-center transition-colors"
              style={{
                borderTop: idx > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                background: isCurrentUser ? 'rgba(245,158,11,0.06)' : 'transparent',
                borderLeft: isCurrentUser ? '3px solid #F59E0B' : '3px solid transparent',
              }}
            >
              <div className="col-span-1 flex justify-center items-center gap-1">
                <RankBadge rank={entry.rank} />
                {entry.trend === 'up'   && <span style={{ color: '#34d399', fontSize: 11, fontWeight: 900 }}>▲</span>}
                {entry.trend === 'down' && <span style={{ color: '#f87171', fontSize: 11, fontWeight: 900 }}>▼</span>}
                {entry.trend === 'same' && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>–</span>}
              </div>

              <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                <div className={`avatar-circle ${AVATAR_COLORS[colorIdx]} text-white text-xs flex-shrink-0`} style={{ width: 30, height: 30 }}>
                  {entry.avatar_initials || entry.display_name?.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: isCurrentUser ? '#F59E0B' : 'white' }}
                  >
                    {entry.display_name}
                    {isCurrentUser && <span className="ml-1 text-xs" style={{ color: 'rgba(245,158,11,0.6)' }}>(tú)</span>}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{entry.department}</p>
                </div>
              </div>

              <div className="col-span-2 text-center">
                <span className="font-black text-base" style={{ color: rankColor }}>
                  {entry.total_points}
                </span>
              </div>

              <div className="col-span-2 text-center">
                <span className="text-sm font-semibold" style={{ color: '#34d399' }}>{entry.exact_scores}</span>
              </div>

              <div className="col-span-2 text-center">
                <span className="text-sm font-semibold" style={{ color: '#60a5fa' }}>{entry.correct_results}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
