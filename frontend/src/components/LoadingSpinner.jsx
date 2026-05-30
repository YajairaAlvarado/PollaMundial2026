import React from 'react';

export default function LoadingSpinner({ size = 'md', text = 'Cargando...' }) {
  const sizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className={`${sizes[size]} ball-spin select-none`}>⚽</div>
      {text && (
        <p className="text-white/60 text-sm font-medium">{text}</p>
      )}
    </div>
  );
}
