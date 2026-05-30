import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import LeaderboardTable from '../components/LeaderboardTable';
import LoadingSpinner from '../components/LoadingSpinner';
import { Trophy, Star } from 'lucide-react';

const AVATAR_COLORS = [
  'bg-purple-600', 'bg-blue-600', 'bg-emerald-600', 'bg-rose-600',
  'bg-orange-600', 'bg-teal-600', 'bg-indigo-600', 'bg-pink-600',
  'bg-cyan-600', 'bg-amber-600', 'bg-lime-600', 'bg-red-600',
];

function PodiumCard({ entry, podiumClass, emoji, heightClass }) {
  const colorIdx = entry.username.charCodeAt(0) % AVATAR_COLORS.length;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`glass-card p-4 text-center w-full ${podiumClass} hover:scale-105 transition-all duration-300`}>
        <div className="text-3xl mb-2">{emoji}</div>
        <div className={`avatar-circle ${AVATAR_COLORS[colorIdx]} text-white text-sm mx-auto mb-2`}>
          {entry.avatar_initials}
        </div>
        <p className="text-white font-bold text-sm leading-tight">{entry.display_name}</p>
        <p className="text-white/40 text-xs mb-2">{entry.department}</p>
        <div className="flex items-center justify-center gap-1">
          <Star size={14} className="text-yellow-400" />
          <span className="text-yellow-400 font-black text-lg">{entry.total_points}</span>
        </div>
        <p className="text-white/40 text-xs mt-1">
          {entry.exact_scores} exactos · {entry.correct_results} correctos
        </p>
      </div>
      {/* Podium block */}
      <div className={`w-full rounded-b-lg ${heightClass} ${
        podiumClass.includes('podium-1st') ? 'bg-yellow-400/30' :
        podiumClass.includes('podium-2nd') ? 'bg-slate-400/30' :
        'bg-amber-700/30'
      }`} />
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
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Trophy size={28} className="text-yellow-400" />
          <h1 className="text-3xl font-black text-white">Tabla de Posiciones</h1>
          <Trophy size={28} className="text-yellow-400" />
        </div>
        <p className="text-white/40 text-sm">Predictor Mundial 2026</p>
      </div>

      {/* My rank card */}
      {myRank && (
        <div className="glass-card p-4 border-yellow-400/30 bg-andersen-blue/20 flex items-center justify-between fade-slide-in">
          <div className="flex items-center gap-3">
            <div className={`avatar-circle ${AVATAR_COLORS[user.username.charCodeAt(0) % AVATAR_COLORS.length]} text-white`}>
              {user.avatarInitials}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{user.displayName}</p>
              <p className="text-white/40 text-xs">{user.department}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center hidden sm:block">
              <p className="text-white/40 text-xs">Posición</p>
              <p className="text-yellow-400 font-black text-2xl">#{myRank.rank}</p>
            </div>
            <div className="text-center">
              <p className="text-white/40 text-xs">Puntos</p>
              <p className="text-white font-black text-2xl">{myRank.total_points}</p>
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-white/40 text-xs">Exactos</p>
              <p className="text-emerald-400 font-black text-2xl">{myRank.exact_scores}</p>
            </div>
          </div>
        </div>
      )}

      {/* Podium */}
      {top3.length >= 3 && (
        <div className="fade-slide-in">
          <h2 className="text-center text-white/40 text-xs uppercase tracking-widest mb-6 font-semibold">
            Podio
          </h2>
          <div className="grid grid-cols-3 gap-3 items-end max-w-2xl mx-auto">
            {/* 2nd place */}
            <PodiumCard
              entry={top3[1]}
              podiumClass="podium-2nd border border-slate-400/30"
              emoji="🥈"
              heightClass="h-12"
            />
            {/* 1st place */}
            <PodiumCard
              entry={top3[0]}
              podiumClass="podium-1st border border-yellow-400/40 pulse-glow"
              emoji="🥇"
              heightClass="h-20"
            />
            {/* 3rd place */}
            <PodiumCard
              entry={top3[2]}
              podiumClass="podium-3rd border border-amber-700/40"
              emoji="🥉"
              heightClass="h-8"
            />
          </div>
        </div>
      )}

      {/* Full table */}
      <div className="fade-slide-in">
        <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
          <Trophy size={18} className="text-yellow-400" />
          Clasificación Completa
        </h2>
        <LeaderboardTable data={data} />
      </div>
    </div>
  );
}
