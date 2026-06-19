import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import { useAlbum } from '../hooks/useAlbum';

const AlbumContext = createContext(null);
export const useAlbumCtx = () => useContext(AlbumContext);

// Una sola instancia de useAlbum para toda la app, así el popup del reto y
// la página del álbum comparten el mismo estado (la ficha ganada aparece al instante).
export function AlbumProvider({ children }) {
  const { user } = useAuth();
  const album = useAlbum(user);
  return <AlbumContext.Provider value={album}>{children}</AlbumContext.Provider>;
}
