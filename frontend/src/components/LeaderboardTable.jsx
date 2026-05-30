import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Star, Target, CheckCircle } from 'lucide-react';

const AVATAR_COLORS = [
  'bg-purple-600', 'bg-blue-600', 'bg-emerald-600', 'bg-rose-600',
  'bg-orange-600', 'bg-teal-600', 'bg-indigo-600', 'bg-pink-600',
  'bg-cyan-600', 'bg-amber-600', 'bg-lime-600', 'bg-red-600',
];

function RankBadge({ rank }) {
  if (rank === 1) return <span className="text-2xl">🥇</span>;
  if (rank === 2) return <span className="text-2xl">🥈</span>;
  if (rank === 3) return <span className="text-2xl">🥉</span>;
  return (
    <span className="text-white/50 font-bold text-sm w-8 text-center">{rank}</span>
  );
}

export default function LeaderboardTable({ data, showTop = false }) {
  const { user } = useAuth();

  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-white/50">No hay datos en la tabla aún</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-white/5 border-b border-white/10 text-xs text-white/40 uppercase tracking-widest font-semibold">
        <div className="col-span-1 text-center">#</div>
        <div className="col-span-5">Jugador</div>
        <div className="col-span-2 text-center flex items-center justify-center gap-1">
          <Star size={11} className="text-yellow-400" />
          <span className="hidden sm:inline">Pts</span>
        </div>
        <div className="col-span-2 text-center flex items-center justify-center gap-1">
          <Target size={11} className="text-emerald-400" />
          <span className="hidden sm:inline">Exactos</span>
        </div>
        <div className="col-span-2 text-center flex items-center justify-center gap-1">
          <CheckCircle size={11} className="text-blue-400" />
          <span className="hidden sm:inline">Correctos</span>
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/5">
        {data.map((entry) => {
          const isCurrentUser = user && entry.username === user.username;
          const colorIdx = entry.username.charCodeAt(0) % AVATAR_COLORS.length;
          const avatarColor = AVATAR_COLORS[colorIdx];

          return (
            <div
              key={entry.id}
              className={`grid grid-cols-12 gap-2 px-4 py-3 items-center transition-all ${
                isCurrentUser
                  ? 'bg-andersen-blue/30 border-l-4 border-l-yellow-400'
                  : 'hover:bg-white/5'
              }`}
            >
              {/* Rank */}
              <div className="col-span-1 flex justify-center">
                <RankBadge rank={entry.rank} />
              </div>

              {/* Player info */}
              <div className="col-span-5 flex items-center gap-2.5">
                <div className={`avatar-circle ${avatarColor} text-white text-xs flex-shrink-0`}>
                  {entry.avatar_initials || entry.display_name?.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-yellow-400' : 'text-white'}`}>
                    {entry.display_name}
                    {isCurrentUser && <span className="ml-1 text-xs text-yellow-400/70">(tú)</span>}
                  </p>
                  <p className="text-white/40 text-xs truncate">{entry.department}</p>
                </div>
              </div>

              {/* Total points */}
              <div className="col-span-2 text-center">
                <span className={`text-lg font-black ${
                  entry.rank === 1 ? 'text-yellow-400' :
                  entry.rank === 2 ? 'text-slate-300' :
                  entry.rank === 3 ? 'text-amber-600' :
                  'text-white'
                }`}>
                  {entry.total_points}
                </span>
              </div>

              {/* Exact scores */}
              <div className="col-span-2 text-center">
                <span className="text-sm font-semibold text-emerald-400">{entry.exact_scores}</span>
              </div>

              {/* Correct results */}
              <div className="col-span-2 text-center">
                <span className="text-sm font-semibold text-blue-400">{entry.correct_results}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
