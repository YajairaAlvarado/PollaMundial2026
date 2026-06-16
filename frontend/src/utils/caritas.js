// Caritas para los guiños. Cada una tiene su animación grande.
export const CARITAS = [
  { e: '😂', label: 'Risa',   anim: 'emojiTada' },
  { e: '😍', label: 'Amor',   anim: 'emojiPulse' },
  { e: '😎', label: 'Cool',   anim: 'emojiBounce' },
  { e: '🤡', label: 'Payaso', anim: 'emojiSpin' },
  { e: '😱', label: 'Shock',  anim: 'emojiShake' },
  { e: '🔥', label: 'Fuego',  anim: 'emojiBounce' },
  { e: '💀', label: 'Savage', anim: 'emojiSpin' },
  { e: '👑', label: 'Crack',  anim: 'emojiPulse' },
  { e: '🤣', label: 'Burla',  anim: 'emojiShake' },
  { e: '😭', label: 'Llanto', anim: 'emojiBounce' },
];

export const caritaAnim = (emoji) =>
  CARITAS.find((c) => c.e === emoji)?.anim || 'emojiTada';
