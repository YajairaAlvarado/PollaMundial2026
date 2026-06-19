import { USERS } from './users';

// ── Quiénes ven el álbum ────────────────────────────────────────────────────
export const ALBUM_ENABLED   = true;           // true = abierto a toda la firma
export const ALBUM_BETA_USERS = ['daniel.leon', 'kevin.castro'];
export const isAlbumBeta = (username) => ALBUM_ENABLED || ALBUM_BETA_USERS.includes((username || '').toLowerCase());

// ── Reglas (fáciles de cambiar a futuro) ───────────────────────────────────
export const DAILY_LIMIT = 4;                   // oportunidades por día
export const COOLDOWN_MS  = 60 * 60 * 1000;     // 1 hora entre intentos
export const ANSWER_MS    = 10000;              // 10 seg para contestar
export const ALBUM_POINTS = 3;                  // puntos al completar (aún NO oficial)

// ── DT (socio líder) por departamento ──────────────────────────────────────
// Las claves deben coincidir EXACTO con los departamentos en users.js
export const DEPARTMENT_DTS = {
  'Nuevos Negocios':       'yajaira.alvarado',
  'Comercial':             'dennis.noboa',
  'Marketing':             'mariana.pastor',
  'Capital Humano':        'luis.escudero',
  'Impuestos':             'alfredo.bustos',
  'Economía Y Empresa':    'francisco.briones',
  'Consultoria':           'pablo.guevara',
  'Patrocinio':            'mario.orelllana',
  'Contabilidad/Finanzas': 'sofia.carranza',
  'Administracion':        'raissa.aguila',
};

// Orden bonito de los equipos en el álbum
export const DEPARTMENT_ORDER = [
  'Nuevos Negocios', 'Comercial', 'Marketing', 'Capital Humano', 'Impuestos',
  'Economía Y Empresa', 'Consultoria', 'Patrocinio', 'Contabilidad/Finanzas', 'Administracion',
];

export const isDT = (username) => Object.values(DEPARTMENT_DTS).includes((username || '').toLowerCase());

// ── Número de ficha fijo por persona (estilo Panini) ─────────────────────────
// Basado en TODOS los usuarios (no en quién tiene foto), para que el número
// nunca cambie aunque después se suban más fotos. Orden: depto → DT → alfabético.
export const STICKER_NUMBER = (() => {
  const byDept = {};
  for (const u of USERS) (byDept[u.department] ||= []).push(u);
  for (const d in byDept) {
    byDept[d].sort((a, b) => (isDT(b.username) - isDT(a.username)) || a.displayName.localeCompare(b.displayName));
  }
  const order = [...DEPARTMENT_ORDER, ...Object.keys(byDept).filter((d) => !DEPARTMENT_ORDER.includes(d))];
  const map = {}; let n = 1;
  for (const d of order) for (const u of (byDept[d] || [])) map[u.username] = n++;
  return map;
})();
export const stickerNumber = (username) => STICKER_NUMBER[(username || '').toLowerCase()] || STICKER_NUMBER[username];
export const TOTAL_STICKERS = Object.keys(STICKER_NUMBER).length;

// Peso para la rifa de fichas: los DT salen mucho menos seguido
const DT_WEIGHT = 1;
const NORMAL_WEIGHT = 12;

// ── Roster: solo integrantes CON foto (para que el álbum se pueda completar) ──
// avatars: { username -> url } (de AvatarContext)
export function buildRoster(avatars) {
  return USERS
    .filter((u) => avatars[u.username.toLowerCase()])
    .map((u) => ({
      username: u.username,
      displayName: u.displayName,
      department: u.department,
      initials: u.avatarInitials,
      isDT: isDT(u.username),
      number: stickerNumber(u.username),
      sex: u.sex || null,
      photo: avatars[u.username.toLowerCase()],
    }));
}

export function rosterByDepartment(roster) {
  const groups = {};
  for (const p of roster) (groups[p.department] ||= []).push(p);
  // ordenar: DT primero, luego alfabético
  for (const d in groups) {
    groups[d].sort((a, b) => (b.isDT - a.isDT) || a.displayName.localeCompare(b.displayName));
  }
  const ordered = [];
  for (const d of DEPARTMENT_ORDER) if (groups[d]) ordered.push([d, groups[d]]);
  // cualquier depto no listado, al final
  for (const d in groups) if (!DEPARTMENT_ORDER.includes(d)) ordered.push([d, groups[d]]);
  return ordered;
}

// ── Helpers de aleatoriedad ─────────────────────────────────────────────────
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function sample(arr, n) { return shuffle(arr).slice(0, n); }

function weightedPick(candidates) {
  const weights = candidates.map((c) => (c.isDT ? DT_WEIGHT : NORMAL_WEIGHT));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) { r -= weights[i]; if (r <= 0) return candidates[i]; }
  return candidates[candidates.length - 1];
}

// ── Generar un reto ──────────────────────────────────────────────────────────
// roster: array completo · ownedSet: Set de usernames que ya tengo · self: mi username
// Devuelve { type, target, options, answer } o null si ya no faltan fichas.
//   type 'photo-name'  → muestro foto, 4 nombres
//   type 'name-photo'  → muestro nombre, 3 fotos (cromos sin nombre)
//   type 'photo-dept'  → muestro foto, 4 departamentos
export function generateChallenge(roster, ownedSet, self) {
  self = (self || '').toLowerCase();
  const missing = roster.filter((p) => p.username !== self && !ownedSet.has(p.username));
  if (!missing.length) return null;

  const target = weightedPick(missing);
  const others = roster.filter((p) => p.username !== target.username);
  // En "foto→nombre" y "nombre→foto" el sexo de la foto/nombre es una pista
  // visual gratis, así que los distractores deben ser del mismo sexo que el
  // target (si hay suficientes candidatos; si no, se completa con cualquiera).
  const sameSex = others.filter((p) => p.sex && p.sex === target.sex);
  const pickDistractors = (n) => {
    if (sameSex.length >= n) return sample(sameSex, n);
    const rest = others.filter((p) => !sameSex.includes(p));
    return [...sameSex, ...sample(rest, n - sameSex.length)];
  };

  const types = [];
  if (others.length >= 3) types.push('photo-name');
  if (others.length >= 2) types.push('name-photo');
  types.push('photo-dept');
  const type = types[Math.floor(Math.random() * types.length)];

  if (type === 'photo-name') {
    const distractors = pickDistractors(3);
    const options = shuffle([target, ...distractors]).map((p) => ({ username: p.username, label: p.displayName }));
    return { type, target, options, answer: target.username };
  }

  if (type === 'name-photo') {
    const distractors = pickDistractors(2);
    const options = shuffle([target, ...distractors]); // se renderizan como cromos sin nombre
    return { type, target, options, answer: target.username };
  }

  // photo-dept
  const otherDepts = DEPARTMENT_ORDER.filter((d) => d !== target.department);
  const distractors = sample(otherDepts, 3);
  const options = shuffle([target.department, ...distractors]).map((d) => ({ value: d, label: d }));
  return { type, target, options, answer: target.department };
}

// ── Estado del día desde la lista de intentos ────────────────────────────────
// challenges: array de { created_at, result } del usuario.
// Los fallos NO cuentan para el límite: el tope es 3 fichas GANADAS por día.
// El cooldown de 1h aplica tras CUALQUIER intento (acierto o fallo).
export function dailyState(challenges) {
  const now = Date.now();
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const todays = challenges.filter((c) => new Date(c.created_at) >= startOfDay);
  const winsToday = todays.filter((c) => c.result === 'win').length;
  const attemptsToday = todays.length;
  const last = challenges.reduce((mx, c) => Math.max(mx, new Date(c.created_at).getTime()), 0);
  const cooldownLeft = last ? Math.max(0, COOLDOWN_MS - (now - last)) : 0;
  return { winsToday, attemptsToday, cooldownLeft };
}

export function canPlay(challenges, missingCount) {
  if (missingCount <= 0) return false;
  const { winsToday, cooldownLeft } = dailyState(challenges);
  return winsToday < DAILY_LIMIT && cooldownLeft <= 0;
}
