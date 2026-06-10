import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import LeaderboardTable from '../components/LeaderboardTable';
import LoadingSpinner from '../components/LoadingSpinner';
import { Trophy } from 'lucide-react';

const AVATAR_COLORS = [
  'bg-purple-600', 'bg-blue-600', 'bg-emerald-600', 'bg-rose-600',
  'bg-orange-600', 'bg-teal-600', 'bg-indigo-600', 'bg-pink-600',
  'bg-cyan-600', 'bg-amber-600', 'bg-lime-600', 'bg-red-600',
];

const PODIUM = [
  { rank: 1, emoji: '🥇', label: '1°', height: 'h-16', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', textColor: '#F59E0B' },
  { rank: 2, emoji: '🥈', label: '2°', height: 'h-10', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', textColor: '#94a3b8' },
  { rank: 3, emoji: '🥉', label: '3°', height: 'h-6',  bg: 'rgba(205,127,50,0.12)',  border: 'rgba(205,127,50,0.3)',  textColor: '#cd7f32' },
];

function PodiumCard({ entry, config }) {
  const colorIdx = entry.username.charCodeAt(0) % AVATAR_COLORS.length;
  return (
    <div className="flex flex-col items-center gap-0">
      <div
        className="w-full rounded-xl p-4 text-center mb-0"
        style={{ background: config.bg, border: `1px solid ${config.border}` }}
      >
        <div className="text-2xl mb-2">{config.emoji}</div>
        <div className={`avatar-circle ${AVATAR_COLORS[colorIdx]} text-white text-xs mx-auto mb-2`}>
          {entry.avatar_initials}
        </div>
        <p className="text-white font-bold text-xs leading-tight truncate">{entry.display_name}</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.38)' }}>{entry.department}</p>
        <p className="font-black text-xl mt-2" style={{ color: config.textColor }}>{entry.total_points}</p>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {entry.exact_scores} exactos
        </p>
      </div>
      <div className={`w-full ${config.height} rounded-b-lg`} style={{ background: config.bg, opacity: 0.6 }} />
    </div>
  );
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/leaderboard')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const myRank = user ? data.find((e) => e.username === user.username) : null;

  if (loading) return <LoadingSpinner size="lg" text="Cargando tabla..." />;

  const top3 = data.slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
          <Trophy size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Tabla de Posiciones</h1>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>Predictor Mundial 2026</p>
        </div>
      </div>

      {/* My rank */}
      {myRank && (
        <div
          className="flex items-center justify-between rounded-xl p-4"
          style={{ background: '#0D1B30', border: '1px solid rgba(245,158,11,0.25)', borderLeft: '3px solid #F59E0B' }}
        >
          <div className="flex items-center gap-3">
            <div className={`avatar-circle ${AVATAR_COLORS[user.username.charCodeAt(0) % AVATAR_COLORS.length]} text-white text-xs`}>
              {user.avatarInitials}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{user.displayName}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.38)' }}>{user.department}</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center hidden sm:block">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.38)' }}>Pos.</p>
              <p className="font-black text-xl" style={{ color: '#F59E0B' }}>#{myRank.rank}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.38)' }}>Pts</p>
              <p className="text-white font-black text-xl">{myRank.total_points}</p>
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.38)' }}>Exactos</p>
              <p className="font-black text-xl" style={{ color: '#34d399' }}>{myRank.exact_scores}</p>
            </div>
          </div>
        </div>
      )}

      {/* Podium */}
      {top3.length >= 3 && (
        <div>
          <p className="text-center text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Podio
          </p>
          <div className="grid grid-cols-3 gap-3 items-end max-w-xl mx-auto">
            <PodiumCard entry={top3[1]} config={PODIUM[1]} />
            <PodiumCard entry={top3[0]} config={PODIUM[0]} />
            <PodiumCard entry={top3[2]} config={PODIUM[2]} />
          </div>
        </div>
      )}

      {/* Full table */}
      <div>
        <h2 className="text-white font-bold text-sm uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Clasificación Completa
        </h2>
        <LeaderboardTable data={data} />
      </div>
    </div>
  );
}
