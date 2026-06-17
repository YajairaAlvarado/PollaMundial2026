import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from './AuthContext';

const AvatarContext = createContext({ avatars: {}, openLightbox: () => {}, ready: false });
export const useAvatars = () => useContext(AvatarContext);

const SIGNED_EXPIRY = 60 * 60 * 24 * 7; // 7 días

export function AvatarProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [avatars, setAvatars] = useState({});   // username -> signed thumb url
  const [ready,   setReady]   = useState(false);
  const [lightbox, setLightbox] = useState(null); // { username, url, loading }

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancel = false;
    (async () => {
      try {
        const { data: files, error } = await supabase.storage.from('avatars').list('thumbs', { limit: 1000 });
        if (error || !files?.length) { setReady(true); return; }
        const paths = files
          .filter((f) => /\.(jpg|jpeg|png)$/i.test(f.name))
          .map((f) => `thumbs/${f.name}`);
        const { data: signed } = await supabase.storage.from('avatars').createSignedUrls(paths, SIGNED_EXPIRY);
        if (cancel) return;
        const map = {};
        (signed || []).forEach((s) => {
          if (!s.signedUrl) return;
          const m = s.path.match(/thumbs\/(.+)\.(jpg|jpeg|png)$/i);
          if (m) map[m[1].toLowerCase()] = s.signedUrl;
        });
        setAvatars(map);
        setReady(true);
      } catch {
        setReady(true);
      }
    })();
    return () => { cancel = true; };
  }, [isAuthenticated]);

  const openLightbox = useCallback(async (username, displayName) => {
    if (!username) return;
    setLightbox({ username, displayName, url: null, loading: true });
    const { data } = await supabase.storage.from('avatars').createSignedUrl(`full/${username}.jpg`, SIGNED_EXPIRY);
    setLightbox((lb) => (lb && lb.username === username ? { ...lb, url: data?.signedUrl || null, loading: false } : lb));
  }, []);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  return (
    <AvatarContext.Provider value={{ avatars, openLightbox, ready }}>
      {children}
      {lightbox && (
        <div
          onClick={closeLightbox}
          style={{
            position: 'fixed', inset: 0, zIndex: 100000,
            background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}>
          <div onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '90vw', maxHeight: '90vh' }}>
            {lightbox.loading ? (
              <p style={{ color: 'white' }}>Cargando…</p>
            ) : lightbox.url ? (
              <img src={lightbox.url} alt={lightbox.displayName || ''}
                style={{ maxWidth: '90vw', maxHeight: '82vh', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.8)' }} />
            ) : (
              <p style={{ color: 'white' }}>No se pudo cargar la foto</p>
            )}
            {lightbox.displayName && (
              <p style={{ color: 'white', fontWeight: 800, marginTop: 12, fontSize: 16 }}>{lightbox.displayName}</p>
            )}
          </div>
        </div>
      )}
    </AvatarContext.Provider>
  );
}
