import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import MatchCard from '../components/MatchCard';
import PredictionModal from '../components/PredictionModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { RefreshCw, Filter } from 'lucide-react';
import canchaBg from '../assets/andersen-cancha.jpg';

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'scheduled', label: 'Próximos' },
  { key: 'live', label: '🔴 En Vivo' },
  { key: 'finished', label: 'Finalizados' },
  { key: 'group', label: 'Por Grupo' },
];

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState('A');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      let matchUrl = '/matches?stage=group';
      if (filter === 'group') matchUrl += `&group=${selectedGroup}`;
      else if (filter !== 'all') matchUrl += `&status=${filter}`;

      const [matchRes, predRes] = await Promise.all([
        api.get(matchUrl),
        api.get('/predictions/my'),
      ]);

      setMatches(matchRes.data);

      const predMap = {};
      for (const p of predRes.data) predMap[p.match_id] = p;
      setPredictions(predMap);
    } catch (err) {
      console.error('Matches fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, selectedGroup]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30s when on live tab
  useEffect(() => {
    if (filter !== 'live') return;
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [filter, fetchData]);

  const handlePredictionSaved = (prediction) => {
    setPredictions((prev) => ({
      ...prev,
      [prediction.match_id]: prediction,
    }));
  };

  // Group matches by group_name for "all" view
  const groupedMatches = React.useMemo(() => {
    if (filter === 'group') {
      return { [selectedGroup]: matches };
    }
    const grouped = {};
    for (const m of matches) {
      if (!grouped[m.group_name]) grouped[m.group_name] = [];
      grouped[m.group_name].push(m);
    }
    return grouped;
  }, [matches, filter, selectedGroup]);

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)]"
      style={{ backgroundImage: `url(${canchaBg})`, backgroundSize: 'cover', backgroundPosition: 'center top', backgroundAttachment: 'fixed' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(10,0,0,0.72) 0%, rgba(10,0,0,0.78) 100%)' }} />
    <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Partidos ⚽</h1>
          <p className="text-white/40 text-sm mt-0.5">Fase de grupos · 72 partidos</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-lg transition-all"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === f.key
                ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Group selector */}
      {filter === 'group' && (
        <div className="flex flex-wrap gap-2 mb-6">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                selectedGroup === g
                  ? 'bg-andersen-blue text-yellow-400 border border-yellow-400/40 shadow-lg'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/15 border border-white/10'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSpinner size="lg" text="Cargando partidos..." />
      ) : matches.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-4xl mb-4">⚽</p>
          <p className="text-white/50 text-lg font-semibold">No hay partidos en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedMatches).map(([groupName, groupMatches]) => (
            <div key={groupName}>
              {/* Group header */}
              {(filter === 'all' || filter === 'group') && (
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-andersen-blue border border-yellow-400/30 flex items-center justify-center">
                    <span className="text-yellow-400 font-black text-sm">{groupName}</span>
                  </div>
                  <h2 className="text-white font-bold">Grupo {groupName}</h2>
                  <div className="h-px flex-1 bg-white/10"></div>
                  <span className="text-white/30 text-xs">{groupMatches.length} partidos</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={predictions[match.id]}
                    onPredict={(m) => setSelectedMatch(m)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live auto-refresh notice */}
      {filter === 'live' && (
        <p className="text-center text-white/30 text-xs mt-6">
          Actualización automática cada 30 segundos
        </p>
      )}

      {/* Prediction modal */}
      {selectedMatch && (
        <PredictionModal
          match={selectedMatch}
          prediction={predictions[selectedMatch.id]}
          onClose={() => setSelectedMatch(null)}
          onSaved={handlePredictionSaved}
        />
      )}
    </div>
    </div>
  );
}
