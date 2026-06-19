import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import { useAlbumCtx } from '../contexts/AlbumContext';
import { rosterByDepartment } from '../utils/album';
import StickerCard from './StickerCard';
import Avatar from './Avatar';

// Visor de SOLO LECTURA del álbum de otra persona.
export default function AlbumViewerModal({ username, displayName, onClose }) {
  const { roster } = useAlbumCtx();
  const groups = useMemo(() => rosterByDepartment(roster), [roster]);
  const [ownedSet, setOwnedSet] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('album_stickers').select('sticker_username').eq('owner_username', username);
      setOwnedSet(new Set((data || []).map((r) => r.sticker_username)));
    })();
  }, [username]);

  const total = roster.length;
  const owned = ownedSet ? roster.filter((p) => ownedSet.has(p.username)).length : 0;
  const pct = total ? Math.round((owned / total) * 100) : 0;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100003, background: 'rgba(5,2,20,0.9)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 760, maxWidth: '96vw', margin: '24px 0', background: 'linear-gradient(160deg,#15103a,#0a1530)', border: '2px solid rgba(255,209,0,0.4)', borderRadius: 20, padding: 18, boxShadow: '0 24px 60px rgba(0,0,0,0.7)' }}>
        {/* Cabecera bien clara de quién es */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Avatar username={username} displayName={displayName} size={44} clickable={false} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#FFD100', letterSpacing: '0.05em' }}>📒 ESTÁS VIENDO EL ÁLBUM DE</p>
            <p className="text-white" style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.1 }}>{displayName}</p>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 26, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 16px' }}>
          <span className="font-black" style={{ color: '#FFD100', fontSize: 18 }}>{owned}</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>/ {total}</span>
          <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#FFD100,#FFA500)', borderRadius: 5 }} />
          </div>
          <span style={{ color: '#FFD100', fontSize: 12, fontWeight: 800 }}>{pct}%</span>
        </div>

        {ownedSet === null ? (
          <p className="text-center py-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Cargando álbum…</p>
        ) : (
          groups.map(([dept, players]) => {
            const dOwned = players.filter((p) => ownedSet.has(p.username)).length;
            return (
              <div key={dept} className="mb-5">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="font-black text-white flex items-center gap-2" style={{ fontSize: 14 }}>
                    <span style={{ color: '#FFD100' }}>⚽</span> {dept}
                  </h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: dOwned === players.length ? '#34d399' : 'rgba(255,255,255,0.5)' }}>
                    {dOwned}/{players.length}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10, justifyItems: 'center' }}>
                  {players.map((p) => (
                    <StickerCard key={p.username} player={p} owned={ownedSet.has(p.username)} size="sm" showNumber style={{ width: '100%', maxWidth: 130 }} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
