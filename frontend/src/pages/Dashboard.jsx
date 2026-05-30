import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import WorldCupBanner from '../components/WorldCupBanner';
import MatchCard from '../components/MatchCard';
import PredictionModal from '../components/PredictionModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { Trophy, Target, CheckCircle, Calendar, ArrowRight, Zap } from 'lucide-react';

function StatCard({ icon, label, value, color }) {
  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-3xl font-black text-white">{value}</p>
        <p className="text-white/50 text-xs font-medium uppercase tracking-widest">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [myPredictions, setMyPredictions] = useState({});
  const [stats, setStats] = useState({ total: 0, exact: 0, correct: 0, made: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [matchesRes, predsRes] = await Promise.all([
        api.get('/matches?stage=group&status=scheduled'),
        api.get('/predictions/my'),
      ]);

      // Get next 6 upcoming matches
      const upcoming = matchesRes.data.slice(0, 6);
      setUpcomingMatches(upcoming);

      // Build prediction map
      const predMap = {};
      let totalPts = 0, exactCount = 0, correctCount = 0;
      for (const p of predsRes.data) {
        predMap[p.match_id] = p;
        totalPts += p.points_earned || 0;
        if (p.points_earned === 3) exactCount++;
        if (p.points_earned === 2) correctCount++;
      }
      setMyPredictions(predMap);
      setStats({
        total: totalPts,
        exact: exactCount,
        correct: correctCount,
        made: predsRes.data.length,
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePredictionSaved = (prediction) => {
    setMyPredictions((prev) => ({
      ...prev,
      [prediction.match_id]: prediction,
    }));
  };

  if (loading) return <LoadingSpinner size="lg" text="Cargando datos..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      {/* Banner */}
      <WorldCupBanner />

      {/* Welcome */}
      <div className="fade-slide-in">
        <h2 className="text-2xl font-bold text-white">
          ¡Hola, <span className="text-yellow-400">{user?.displayName?.split(' ')[0]}</span>! ⚽
        </h2>
        <p className="text-white/50 text-sm mt-1">Realiza tus predicciones y sube en la tabla</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 fade-slide-in">
        <StatCard
          icon={<Trophy size={22} className="text-yellow-400" />}
          label="Puntos totales"
          value={stats.total}
          color="bg-yellow-400/10"
        />
        <StatCard
          icon={<Target size={22} className="text-emerald-400" />}
          label="Exactos"
          value={stats.exact}
          color="bg-emerald-400/10"
        />
        <StatCard
          icon={<CheckCircle size={22} className="text-blue-400" />}
          label="Correctos"
          value={stats.correct}
          color="bg-blue-400/10"
        />
        <StatCard
          icon={<Calendar size={22} className="text-purple-400" />}
          label="Predicciones"
          value={stats.made}
          color="bg-purple-400/10"
        />
      </div>

      {/* Upcoming matches */}
      <div className="fade-slide-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-yellow-400" />
            <h3 className="text-white font-bold text-lg">Próximos Partidos</h3>
          </div>
          <Link
            to="/matches"
            className="flex items-center gap-1 text-yellow-400/70 hover:text-yellow-400 text-sm transition-colors"
          >
            Ver todos <ArrowRight size={15} />
          </Link>
        </div>

        {upcomingMatches.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-white/50">No hay partidos programados próximamente</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={myPredictions[match.id]}
                onPredict={(m) => setSelectedMatch(m)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 fade-slide-in">
        <Link
          to="/matches"
          className="glass-card p-5 flex items-center gap-4 group hover:border-yellow-400/30 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Calendar size={22} className="text-blue-400" />
          </div>
          <div>
            <p className="text-white font-bold">Ver Todos los Partidos</p>
            <p className="text-white/40 text-xs mt-0.5">72 partidos de fase de grupos</p>
          </div>
          <ArrowRight size={18} className="text-white/30 ml-auto group-hover:text-yellow-400 transition-colors" />
        </Link>

        <Link
          to="/leaderboard"
          className="glass-card p-5 flex items-center gap-4 group hover:border-yellow-400/30 transition-all"
        >
          <div className="w-12 h-12 rounded-xl bg-yellow-400/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Trophy size={22} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-white font-bold">Tabla de Posiciones</p>
            <p className="text-white/40 text-xs mt-0.5">¿En qué posición estás?</p>
          </div>
          <ArrowRight size={18} className="text-white/30 ml-auto group-hover:text-yellow-400 transition-colors" />
        </Link>
      </div>

      {/* Prediction modal */}
      {selectedMatch && (
        <PredictionModal
          match={selectedMatch}
          prediction={myPredictions[selectedMatch.id]}
          onClose={() => setSelectedMatch(null)}
          onSaved={handlePredictionSaved}
        />
      )}
    </div>
  );
}
