import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAlbum } from '../hooks/useAlbum';
import { rosterByDepartment, ALBUM_POINTS } from '../utils/album';
import StickerCard from '../components/StickerCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { Navigate } from 'react-router-dom';

export default function Album() {
  const { user } = useAuth();
  const { beta, loading, roster, ownedSet, total, owned, completed } = useAlbum(user);

  const groups = useMemo(() => rosterByDepartment(roster), [roster]);

  if (!beta) return <Navigate to="/dashboard" replace />;
  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><LoadingSpinner size="lg" text="Abriendo tu álbum…" /></div>;
  }

  const pct = total ? Math.round((owned / total) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Cabecera */}
      <div className="rounded-2xl p-5 mb-5 text-center" style={{ background: 'linear-gradient(160deg,#15103a,#0a1530)', border: '1px solid rgba(255,209,0,0.3)' }}>
        <h1 className="font-black text-white" style={{ fontSize: 26 }}>📒 Álbum de la Firma</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Colecciona a todos tus compañeros · cada equipo es un departamento
        </p>

        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="font-black" style={{ color: '#FFD100', fontSize: 22 }}>{owned}</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>/ {total} fichas</span>
          <span className="font-black px-2.5 py-1 rounded-full text-xs" style={{ background: 'rgba(255,209,0,0.15)', color: '#FFD100', border: '1px solid rgba(255,209,0,0.4)' }}>{pct}%</span>
        </div>
        <div style={{ height: 10, background: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden', marginTop: 10 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#FFD100,#FFA500)', borderRadius: 6, transition: 'width 0.6s ease' }} />
        </div>

        {completed && (
          <div className="mt-4 rounded-xl p-3 album-reveal" style={{ background: 'linear-gradient(90deg,#FFD700,#FFA500)', color: '#3a2e00' }}>
            <p className="font-black">🏆 ¡Completaste el álbum! +{ALBUM_POINTS} pts (próximamente)</p>
          </div>
        )}
      </div>

      {/* Equipos */}
      {groups.map(([dept, players]) => {
        const dOwned = players.filter((p) => ownedSet.has(p.username)).length;
        return (
          <div key={dept} className="mb-6">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="font-black text-white flex items-center gap-2" style={{ fontSize: 17 }}>
                <span style={{ color: '#FFD100' }}>⚽</span> {dept}
              </h2>
              <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: dOwned === players.length ? '#34d399' : 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {dOwned}/{players.length}{dOwned === players.length ? ' ✓' : ''}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10, justifyItems: 'center' }}>
              {players.map((p) => (
                <StickerCard key={p.username} player={p} owned={ownedSet.has(p.username)} size="sm" style={{ width: '100%', maxWidth: 130 }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
