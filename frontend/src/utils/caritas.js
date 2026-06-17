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

// GIFs para elegir (links directos)
export const GIFS = [
  { url: 'https://media.tenor.com/xqhHM6bEigUAAAAM/frustrating-work.gif', label: 'Frustración' },
  { url: 'https://media.tenor.com/isxtghQqQDQAAAAM/waiting-bored.gif',    label: 'Esperando' },
  { url: 'https://i.pinimg.com/originals/0c/f1/ef/0cf1efc81c39849dc98e35325d26967c.gif', label: 'No puede ser' },
  { url: 'https://media.tenor.com/-aELdZR5cMAAAAAM/gior-geshem.gif',      label: 'Nervioso' },
  { url: 'https://i.pinimg.com/originals/59/ef/14/59ef1489b4b1466d2bec8f62a12b3333.gif', label: 'Noooo' },
  { url: 'https://i.pinimg.com/originals/0f/d9/7b/0fd97b2454b20a0fee72080787bccfdf.gif', label: 'Alegría' },
  { url: 'https://usagif.com/wp-content/uploads/happy-person-26.gif',     label: 'Felicidad' },
];
