import React from 'react';
import { useAvatars } from '../contexts/AvatarContext';

// Avatar reutilizable: muestra la foto (miniatura) o cae a las iniciales.
// Al hacer clic, abre la foto grande (lightbox) si existe.
export default function Avatar({ username, initials, displayName, size = 30, colorClass = 'bg-red-800', className = '', style = {}, fontSize, clickable = true }) {
  const { avatars, openLightbox } = useAvatars();
  const url = username ? avatars[username.toLowerCase()] : null;
  const fs = fontSize ?? Math.round(size * 0.4);

  if (url) {
    return (
      <img
        src={url}
        alt={displayName || initials || ''}
        loading="lazy"
        decoding="async"
        onClick={clickable ? (e) => { e.stopPropagation(); openLightbox(username.toLowerCase(), displayName); } : undefined}
        className={`rounded-full object-cover flex-shrink-0 ${clickable ? 'cursor-pointer' : ''} ${className}`}
        style={{ width: size, height: size, ...style }}
        title={clickable ? 'Ver foto' : undefined}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-black text-white flex-shrink-0 ${colorClass} ${className}`}
      style={{ width: size, height: size, fontSize: fs, ...style }}>
      {initials || displayName?.substring(0, 2).toUpperCase() || '??'}
    </div>
  );
}
