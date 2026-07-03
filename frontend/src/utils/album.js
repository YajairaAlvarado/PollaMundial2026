import { USERS, isExcluded } from './users';

// ── Quiénes ven el álbum ────────────────────────────────────────────────────
export const ALBUM_ENABLED   = true;           // true = abierto a toda la firma
export const ALBUM_BETA_USERS = ['daniel.leon', 'kevin.castro'];
export const isAlbumBeta = (username) => ALBUM_ENABLED || ALBUM_BETA_USERS.includes((username || '').toLowerCase());

// ── Reglas (fáciles de cambiar a futuro) ───────────────────────────────────
export const DAILY_LIMIT   = 6;                 // fichas (aciertos) máximos por día
export const ATTEMPT_LIMIT = 6;                 // intentos máximos por día (acierte o falle)
export const COOLDOWN_MS  = 60 * 60 * 1000;     // 1 hora entre intentos
export const ANSWER_MS    = 5000;               // 5 seg para contestar (más difícil)
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

// DTs adicionales (un mismo departamento puede tener más de un socio líder)
export const EXTRA_DTS = ['vicente.pazmino'];

const ALL_DTS = [...Object.values(DEPARTMENT_DTS), ...EXTRA_DTS];
export const isDT = (username) => ALL_DTS.includes((username || '').toLowerCase());

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
    .filter((u) => avatars[u.username.toLowerCase()] && !isExcluded(u.username))
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
// Devuelve { type: 'photo-name', target, options, answer } o null si ya no faltan.
// ÚNICO tipo: muestra la FOTO y 6 nombres (5 distractores + 1 correcto, MEZCLADOS).
// Los distractores usan el MISMO primer nombre del target + APELLIDOS reales de
// otras personas (ej. foto de "Daniel Leon" → Daniel Leon / Daniel Castro /
// Daniel Lopez / …), para que haya que saber el nombre exacto y no se pueda
// adivinar por eliminación.
const N_DISTRACTORS = 5;
const firstNameOf = (name) => (name || '').split(' ')[0];
const lastNameOf  = (name) => { const p = (name || '').split(' '); return p.slice(1).join(' ') || p[0] || ''; };

export function generateChallenge(roster, ownedSet, self) {
  self = (self || '').toLowerCase();
  const missing = roster.filter((p) => p.username !== self && !ownedSet.has(p.username));
  if (!missing.length) return null;

  const target = weightedPick(missing);
  const firstName  = firstNameOf(target.displayName);
  const targetLast = lastNameOf(target.displayName);

  // apellidos reales de OTRAS personas, distintos al del target
  const otherLasts = [...new Set(
    roster
      .filter((p) => p.username !== target.username)
      .map((p) => lastNameOf(p.displayName))
      .filter((ln) => ln && ln.toLowerCase() !== targetLast.toLowerCase())
  )];
  const distractorLabels = sample(otherLasts, N_DISTRACTORS).map((ln) => `${firstName} ${ln}`);

  // por si faltaran apellidos, rellenar con nombres completos de otras personas
  if (distractorLabels.length < N_DISTRACTORS) {
    const pool = shuffle(roster.filter((p) => p.username !== target.username).map((p) => p.displayName));
    for (const name of pool) {
      if (distractorLabels.length >= N_DISTRACTORS) break;
      if (name !== target.displayName && !distractorLabels.includes(name)) distractorLabels.push(name);
    }
  }

  // Barajado doble para asegurar que la correcta NO quede siempre en la misma posición
  const options = shuffle(shuffle([
    { username: target.username, label: target.displayName },
    ...distractorLabels.map((label, i) => ({ username: `__distractor_${i}`, label })),
  ]));

  return { type: 'photo-name', target, options, answer: target.username };
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
  const { winsToday, attemptsToday, cooldownLeft } = dailyState(challenges);
  // se acaba el día si: ya conseguiste 3 fichas, O ya usaste tus 6 intentos
  return winsToday < DAILY_LIMIT && attemptsToday < ATTEMPT_LIMIT && cooldownLeft <= 0;
}
