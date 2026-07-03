import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { trackPage } from '../utils/trackPage';
import WorldCupBanner from '../components/WorldCupBanner';
import MatchCard from '../components/MatchCard';
import PredictionModal from '../components/PredictionModal';
import LoadingSpinner from '../components/LoadingSpinner';
import GlobalRace from '../components/GlobalRace';
import { Trophy, Target, CheckCircle, Calendar, ArrowRight } from 'lucide-react';
import { isStageLocked } from '../utils/aliveTeams';
import canchaBg from '../assets/andersen-cancha.jpg';

const STAT_CONFIGS = [
  { key: 'total',   label: 'Puntos',       color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',   icon: <Trophy size={18} />    },
  { key: 'exact',   label: 'Exactos',      color: '#34d399', bg: 'rgba(52,211,153,0.1)',   icon: <Target size={18} />    },
  { key: 'correct', label: 'Correctos',    color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   icon: <CheckCircle size={18}/> },
  { key: 'made',    label: 'Predicciones', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  icon: <Calendar size={18} />  },
];

function StatCard({ config, value }) {
  return (
    <div
      className="rounded-xl p-4 flex items-center gap-3"
      style={{ background: '#0D1B30', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: config.bg, color: config.color }}
      >
        {config.icon}
      </div>
      <div>
        <p className="text-white font-black text-2xl leading-none">{value}</p>
        <p className="text-xs font-semibold uppercase tracking-wider mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {config.label}
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [upcomingMatches,    setUpcomingMatches]    = useState([]);
  const [upcomingMatchesAll, setUpcomingMatchesAll] = useState([]);
  const [myPredictions, setMyPredictions] = useState({});
  const [stats, setStats] = useState({ total: 0, exact: 0, correct: 0, made: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [homeTab, setHomeTab] = useState('carrera'); // 'carrera' | 'partidos'

  // ¿Hay partidos próximos (≈2 días) sin predecir? → el cuadro va arriba; si todo al día, abajo
  const hasPending = (() => {
    const now = new Date();
    return upcomingMatchesAll.some((m) => {
      if (m.status !== 'scheduled' || isStageLocked(m.stage)) return false;
      const d = new Date(m.match_date);
      if (d <= now || myPredictions[m.id]) return false;
      return (d - now) / 3600000 <= 72;
    });
  })();

  useEffect(() => {
    if (user?.id) trackPage(user.id, 'inicio');
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [matchesRes, predsRes] = await Promise.all([
        api.get('/matches?status=scheduled'),
        api.get('/predictions/my'),
      ]);

      setUpcomingMatchesAll(matchesRes.data);
      setUpcomingMatches(matchesRes.data.slice(0, 6));

      const predMap = {};
      let totalPts = 0, exactCount = 0, correctCount = 0;
      for (const p of predsRes.data) {
        predMap[p.match_id] = p;
        totalPts += p.points_earned || 0;
        if (p.points_earned === 3) exactCount++;
        if (p.points_earned === 2) correctCount++;
      }
      setMyPredictions(predMap);
      setStats({ total: totalPts, exact: exactCount, correct: correctCount, made: predsRes.data.length });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePredictionSaved = (prediction) => {
    setMyPredictions((prev) => ({ ...prev, [prediction.match_id]: prediction }));
  };

  if (loading) return <LoadingSpinner size="lg" text="Cargando datos..." />;

  const firstName = user?.displayName?.split(' ')[0];

  return (
    <div
      className="relative min-h-[calc(100vh-3.5rem)]"
      style={{
        backgroundImage: `url(${canchaBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(10,0,0,0.72) 0%, rgba(10,0,0,0.78) 100%)' }} />

    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 relative z-10">
      {hasPending && (
        <WorldCupBanner
          matches={upcomingMatchesAll}
          predictions={myPredictions}
          onPredict={(m) => setSelectedMatch(m)}
        />
      )}

      {/* Welcome */}
      <div>
        <h2 className="text-xl font-bold text-white">
          Hola, <span style={{ color: '#F59E0B' }}>{firstName}</span> ⚽
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Realiza tus predicciones y sube en la tabla
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STAT_CONFIGS.map((cfg) => (
          <StatCard key={cfg.key} config={cfg} value={stats[cfg.key]} />
        ))}
      </div>

      {/* Tabs: Carrera (default) / Próximos partidos */}
      <div>
        <div className="flex rounded-xl overflow-hidden mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={() => setHomeTab('carrera')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-all"
            style={{ background: homeTab === 'carrera' ? 'rgba(245,158,11,0.15)' : 'transparent', color: homeTab === 'carrera' ? '#F59E0B' : 'rgba(255,255,255,0.4)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            🏁 La Carrera
          </button>
          <button onClick={() => setHomeTab('partidos')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-all"
            style={{ background: homeTab === 'partidos' ? 'rgba(96,165,250,0.15)' : 'transparent', color: homeTab === 'partidos' ? '#93c5fd' : 'rgba(255,255,255,0.4)' }}>
            <Calendar size={14} /> Próximos
          </button>
        </div>

        {homeTab === 'carrera' ? (
          <GlobalRace />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-base">Próximos Partidos</h3>
              <Link to="/matches" className="flex items-center gap-1 text-sm font-medium" style={{ color: 'rgba(245,158,11,0.7)' }}>
                Ver todos <ArrowRight size={14} />
              </Link>
            </div>
            {upcomingMatches.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ background: '#0D1B30', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)' }}>No hay partidos programados próximamente</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingMatches.map((match) => (
                  <MatchCard key={match.id} match={match} prediction={myPredictions[match.id]} onPredict={(m) => setSelectedMatch(m)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/matches"
          className="flex items-center gap-4 rounded-xl p-4 group transition-all"
          style={{ background: '#0D1B30', border: '1px solid rgba(255,255,255,0.08)' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(96,165,250,0.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa' }}>
            <Calendar size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">Ver Todos los Partidos</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>Fase de grupos + eliminatorias</p>
          </div>
          <ArrowRight size={15} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
        </Link>

        <Link
          to="/leaderboard"
          className="flex items-center gap-4 rounded-xl p-4 group transition-all"
          style={{ background: '#0D1B30', border: '1px solid rgba(255,255,255,0.08)' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
            <Trophy size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">Tabla de Posiciones</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>¿En qué posición estás?</p>
          </div>
          <ArrowRight size={15} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
        </Link>
      </div>

      {!hasPending && (
        <WorldCupBanner
          matches={upcomingMatchesAll}
          predictions={myPredictions}
          onPredict={(m) => setSelectedMatch(m)}
        />
      )}

      {selectedMatch && (
        <PredictionModal
          match={selectedMatch}
          prediction={myPredictions[selectedMatch.id]}
          onClose={() => setSelectedMatch(null)}
          onSaved={handlePredictionSaved}
        />
      )}
    </div>
    </div>
  );
}
