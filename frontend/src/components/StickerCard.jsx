import React from 'react';

// Cromo estilo álbum Panini. Reutilizable para el álbum y para el quiz.
// player: { username, displayName, department, initials, isDT, photo }
// props:
//   owned     → si está pegada en el álbum (a color) o bloqueada (silueta)
//   hideName  → ocultar el nombre (quiz)
//   hideDept  → ocultar el departamento (quiz)
//   size      → 'sm' | 'md' | 'lg'
//   selectable/selected/wrong → estados visuales en el quiz
//   onClick

const SIZES = {
  sm: { w: 96,  nameFs: 10,   deptFs: 7.5,  pad: 5, nameH: 26 },
  md: { w: 134, nameFs: 12.5, deptFs: 9,    pad: 7, nameH: 32 },
  lg: { w: 200, nameFs: 16,   deptFs: 11,   pad: 8, nameH: 40 },
};

const NORMAL_BAND = 'linear-gradient(90deg,#FFD100 0%,#FFD100 45%,#0072CE 45%,#0072CE 74%,#EF3340 74%)';
const DT_BAND     = 'linear-gradient(90deg,#FFD700,#FFA500,#FFD700,#FFA500)';

export default function StickerCard({
  player, owned = true, hideName = false, hideDept = false, showNumber = false,
  size = 'md', selectable = false, selected = false, wrong = false,
  onClick, style = {},
}) {
  const s = SIZES[size] || SIZES.md;
  const dt = player.isDT;
  const border = dt ? '#FFD700' : owned ? '#FFD100' : 'rgba(255,255,255,0.14)';
  const band   = dt ? DT_BAND : NORMAL_BAND;
  const glow   = dt ? '0 0 18px rgba(255,215,0,0.55)' : owned ? '0 6px 20px rgba(0,0,0,0.45)' : 'none';

  const ring = selected ? '0 0 0 3px #34d399, 0 0 22px rgba(52,211,153,0.6)'
    : wrong ? '0 0 0 3px #f87171, 0 0 22px rgba(248,113,113,0.6)' : glow;

  return (
    <div
      onClick={onClick}
      style={{
        width: s.w, borderRadius: 14, overflow: 'hidden', position: 'relative',
        background: '#0a1730', border: `2.5px solid ${border}`,
        boxShadow: ring, cursor: (selectable || onClick) ? 'pointer' : 'default',
        transition: 'transform 0.15s, box-shadow 0.2s',
        opacity: owned || hideName ? 1 : 0.96,
        ...style,
      }}
      className={dt && owned ? 'sticker-dt-shine' : ''}
    >
      {/* Cinta DT */}
      {dt && (
        <div style={{ position: 'absolute', top: 6, left: -26, transform: 'rotate(-45deg)', zIndex: 3,
                      background: 'linear-gradient(90deg,#FFA500,#FFD700)', color: '#3a2e00',
                      fontWeight: 900, fontSize: 8, letterSpacing: '0.08em', padding: '2px 26px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}>
          DT
        </div>
      )}

      {/* Banda superior */}
      <div style={{ height: 5, background: band }} />

      {/* Foto / silueta */}
      <div style={{ position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden',
                    background: `linear-gradient(160deg, ${dt ? 'rgba(255,215,0,0.25)' : 'rgba(255,209,0,0.18)'} 0%, rgba(0,114,206,0.18) 55%, #0a1730 100%)` }}>
        {showNumber && player.number != null && (
          <span style={{ position: 'absolute', top: 5, left: 5, zIndex: 3, fontSize: Math.max(9, s.w * 0.085),
                         fontWeight: 900, color: dt ? '#3a2e00' : '#0a1730', lineHeight: 1,
                         background: dt ? 'linear-gradient(90deg,#FFD700,#FFA500)' : '#FFD100',
                         padding: '2px 5px', borderRadius: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
            {player.number}
          </span>
        )}
        {dt && owned && <span style={{ position: 'absolute', top: 4, right: 6, fontSize: s.w * 0.16, zIndex: 2 }}>⭐</span>}
        {owned || hideName ? (
          <img src={player.photo} alt={hideName ? 'cromo' : player.displayName}
               style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                        filter: dt ? 'saturate(1.1)' : 'none' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: s.w * 0.34, fontWeight: 900, color: 'rgba(255,255,255,0.18)' }}>?</span>
            <span style={{ fontSize: s.w * 0.13 }}>🔒</span>
          </div>
        )}
      </div>

      {/* Banda del nombre */}
      <div style={{ background: band, padding: 2 }}>
        <div style={{ background: '#0a1730', padding: `${s.pad}px ${s.pad + 2}px`, textAlign: 'center', minHeight: hideName && hideDept ? s.pad * 2 + 6 : undefined }}>
          {!hideName && (
            <div style={{ color: owned ? 'white' : 'rgba(255,255,255,0.35)', fontWeight: 900,
                          fontSize: s.nameFs, lineHeight: 1.1, minHeight: s.nameH,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          wordBreak: 'break-word', hyphens: 'auto' }}>
              {owned ? player.displayName : '— — —'}
            </div>
          )}
          {!hideDept && (
            <div style={{ color: dt ? '#FFD700' : '#FFD100', fontSize: s.deptFs, fontWeight: 800,
                          marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.04em',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {dt ? '★ DT · ' : ''}{owned || hideName ? player.department : '???'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
