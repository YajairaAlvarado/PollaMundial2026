const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'worldcup.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT,
    department TEXT DEFAULT 'General',
    avatar_initials TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name TEXT,
    stage TEXT NOT NULL DEFAULT 'group',
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    home_code TEXT NOT NULL,
    away_code TEXT NOT NULL,
    match_date DATETIME NOT NULL,
    venue TEXT,
    city TEXT,
    home_score INTEGER,
    away_score INTEGER,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'live', 'finished')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    match_id INTEGER NOT NULL,
    home_score INTEGER NOT NULL,
    away_score INTEGER NOT NULL,
    points_earned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, match_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (match_id) REFERENCES matches(id)
  );
`);

// Check if data already seeded
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
  seedData();
}

function seedData() {
  console.log('Seeding database...');

  // Seed users
  const insertUser = db.prepare(`
    INSERT INTO users (username, password_hash, display_name, email, department, avatar_initials)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const testUsers = [
    { username: 'admin', password: 'admin123', name: 'Admin Demo', email: 'admin@empresa.com', dept: 'IT', initials: 'AD' },
    { username: 'user1', password: 'pass123', name: 'Ana García', email: 'ana.garcia@empresa.com', dept: 'Finanzas', initials: 'AG' },
    { username: 'user2', password: 'pass123', name: 'Carlos López', email: 'carlos.lopez@empresa.com', dept: 'Contabilidad', initials: 'CL' },
    { username: 'mrodriguez', password: 'pass123', name: 'María Rodríguez', email: 'maria.rodriguez@empresa.com', dept: 'RRHH', initials: 'MR' },
    { username: 'jperez', password: 'pass123', name: 'José Pérez', email: 'jose.perez@empresa.com', dept: 'Auditoría', initials: 'JP' },
    { username: 'lmartinez', password: 'pass123', name: 'Laura Martínez', email: 'laura.martinez@empresa.com', dept: 'Impuestos', initials: 'LM' },
    { username: 'rherrera', password: 'pass123', name: 'Roberto Herrera', email: 'roberto.herrera@empresa.com', dept: 'Finanzas', initials: 'RH' },
    { username: 'sjimenez', password: 'pass123', name: 'Sandra Jiménez', email: 'sandra.jimenez@empresa.com', dept: 'Legal', initials: 'SJ' },
    { username: 'fmorales', password: 'pass123', name: 'Fernando Morales', email: 'fernando.morales@empresa.com', dept: 'Consultoría', initials: 'FM' },
    { username: 'ptorres', password: 'pass123', name: 'Patricia Torres', email: 'patricia.torres@empresa.com', dept: 'Contabilidad', initials: 'PT' },
    { username: 'dcervantes', password: 'pass123', name: 'Diego Cervantes', email: 'diego.cervantes@empresa.com', dept: 'IT', initials: 'DC' },
    { username: 'iflores', password: 'pass123', name: 'Isabel Flores', email: 'isabel.flores@empresa.com', dept: 'Auditoría', initials: 'IF' },
    { username: 'aconcha', password: 'pass123', name: 'Andrés Concha', email: 'andres.concha@empresa.com', dept: 'Impuestos', initials: 'AC' },
  ];

  const seedUsers = db.transaction(() => {
    for (const u of testUsers) {
      const hash = bcrypt.hashSync(u.password, 10);
      insertUser.run(u.username, hash, u.name, u.email, u.dept, u.initials);
    }
  });
  seedUsers();

  // Seed matches - all 72 group stage matches
  // Groups: A through L, 4 teams each, 6 matches per group
  const groups = {
    A: [
      { team: 'USA', code: 'us' },
      { team: 'Germany', code: 'de' },
      { team: 'Morocco', code: 'ma' },
      { team: 'Japan', code: 'jp' }
    ],
    B: [
      { team: 'Mexico', code: 'mx' },
      { team: 'France', code: 'fr' },
      { team: 'Senegal', code: 'sn' },
      { team: 'South Korea', code: 'kr' }
    ],
    C: [
      { team: 'Canada', code: 'ca' },
      { team: 'England', code: 'gb-eng' },
      { team: 'Ivory Coast', code: 'ci' },
      { team: 'Australia', code: 'au' }
    ],
    D: [
      { team: 'Spain', code: 'es' },
      { team: 'Brazil', code: 'br' },
      { team: 'Ghana', code: 'gh' },
      { team: 'Iran', code: 'ir' }
    ],
    E: [
      { team: 'Portugal', code: 'pt' },
      { team: 'Argentina', code: 'ar' },
      { team: 'Egypt', code: 'eg' },
      { team: 'Saudi Arabia', code: 'sa' }
    ],
    F: [
      { team: 'Netherlands', code: 'nl' },
      { team: 'Colombia', code: 'co' },
      { team: 'Cameroon', code: 'cm' },
      { team: 'Uzbekistan', code: 'uz' }
    ],
    G: [
      { team: 'Belgium', code: 'be' },
      { team: 'Italy', code: 'it' },
      { team: 'South Africa', code: 'za' },
      { team: 'Iraq', code: 'iq' }
    ],
    H: [
      { team: 'Croatia', code: 'hr' },
      { team: 'Uruguay', code: 'uy' },
      { team: 'Algeria', code: 'dz' },
      { team: 'Jordan', code: 'jo' }
    ],
    I: [
      { team: 'Switzerland', code: 'ch' },
      { team: 'Ecuador', code: 'ec' },
      { team: 'Nigeria', code: 'ng' },
      { team: 'Costa Rica', code: 'cr' }
    ],
    J: [
      { team: 'Denmark', code: 'dk' },
      { team: 'Paraguay', code: 'py' },
      { team: 'Honduras', code: 'hn' },
      { team: 'Panama', code: 'pa' }
    ],
    K: [
      { team: 'Austria', code: 'at' },
      { team: 'Scotland', code: 'gb-sct' },
      { team: 'Jamaica', code: 'jm' },
      { team: 'El Salvador', code: 'sv' }
    ],
    L: [
      { team: 'Turkey', code: 'tr' },
      { team: 'Poland', code: 'pl' },
      { team: 'Serbia', code: 'rs' },
      { team: 'Guatemala', code: 'gt' }
    ]
  };

  // Venues for the 3 host nations
  const venues = [
    { venue: 'MetLife Stadium', city: 'New York/New Jersey' },
    { venue: 'AT&T Stadium', city: 'Dallas' },
    { venue: 'SoFi Stadium', city: 'Los Angeles' },
    { venue: 'Levi\'s Stadium', city: 'San Francisco' },
    { venue: 'Hard Rock Stadium', city: 'Miami' },
    { venue: 'Gillette Stadium', city: 'Boston' },
    { venue: 'Empower Field', city: 'Denver' },
    { venue: 'Estadio Azteca', city: 'Ciudad de México' },
    { venue: 'Estadio BBVA', city: 'Monterrey' },
    { venue: 'Estadio Akron', city: 'Guadalajara' },
    { venue: 'BMO Field', city: 'Toronto' },
    { venue: 'BC Place', city: 'Vancouver' },
  ];

  const insertMatch = db.prepare(`
    INSERT INTO matches (group_name, stage, home_team, away_team, home_code, away_code, match_date, venue, city)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Match combinations: [0,1],[2,3],[0,2],[1,3],[0,3],[1,2]
  const matchPairs = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]];

  // Match days distribution: Jun 11-27 = 17 days
  // 72 matches total, ~4 per day
  // Day 1-6: groups A-F matchday 1 (rounds 1,2)
  // Day 7-12: groups G-L matchday 1
  // Day 13-17: matchday 2 and 3
  const groupKeys = Object.keys(groups);
  let matchDayIndex = 0;

  // Starting date: June 11, 2026
  const startDate = new Date('2026-06-11T16:00:00Z');

  // Create a schedule
  // Matchday 1: rounds [0,1] for all groups -> days 1-12 (2 groups per day, 2 matches each = 4 per day... actually 1 match per timeslot)
  // Let's distribute: 72 matches / 17 days = ~4.2 matches per day
  // We'll do 4-5 per day

  const schedule = [];

  // Matchday 1 (pairs [0,1] and [2,3]): 12 groups * 2 matches = 24 matches
  // Matchday 2 (pairs [0,2] and [1,3]): 12 groups * 2 matches = 24 matches
  // Matchday 3 (pairs [0,3] and [1,2]): 12 groups * 2 matches = 24 matches

  // MD1: June 11-15 (3 groups per day)
  // MD2: June 16-20
  // MD3: June 22-27

  const md1Dates = [
    '2026-06-11', '2026-06-11', '2026-06-11',
    '2026-06-12', '2026-06-12', '2026-06-12',
    '2026-06-13', '2026-06-13', '2026-06-13',
    '2026-06-14', '2026-06-14', '2026-06-14'
  ];
  const md2Dates = [
    '2026-06-16', '2026-06-16', '2026-06-16',
    '2026-06-17', '2026-06-17', '2026-06-17',
    '2026-06-18', '2026-06-18', '2026-06-18',
    '2026-06-19', '2026-06-19', '2026-06-19'
  ];
  const md3Dates = [
    '2026-06-22', '2026-06-22', '2026-06-22',
    '2026-06-23', '2026-06-23', '2026-06-23',
    '2026-06-25', '2026-06-25', '2026-06-25',
    '2026-06-26', '2026-06-26', '2026-06-26'
  ];
  const times = ['16:00:00', '19:00:00', '22:00:00'];

  const seedMatches = db.transaction(() => {
    groupKeys.forEach((groupName, groupIdx) => {
      const teams = groups[groupName];
      const venue = venues[groupIdx % venues.length];

      // MD1: match 0 ([0,1]) and match 1 ([2,3])
      // MD2: match 2 ([0,2]) and match 3 ([1,3])
      // MD3: match 4 ([0,3]) and match 5 ([1,2])

      const matchData = [
        { pair: matchPairs[0], dateStr: md1Dates[groupIdx], time: times[groupIdx % 3] },
        { pair: matchPairs[1], dateStr: md1Dates[groupIdx], time: times[(groupIdx + 1) % 3] },
        { pair: matchPairs[2], dateStr: md2Dates[groupIdx], time: times[groupIdx % 3] },
        { pair: matchPairs[3], dateStr: md2Dates[groupIdx], time: times[(groupIdx + 1) % 3] },
        { pair: matchPairs[4], dateStr: md3Dates[groupIdx], time: times[groupIdx % 3] },
        { pair: matchPairs[5], dateStr: md3Dates[groupIdx], time: times[(groupIdx + 1) % 3] },
      ];

      matchData.forEach(({ pair, dateStr, time }) => {
        const home = teams[pair[0]];
        const away = teams[pair[1]];
        const dateTime = `${dateStr}T${time}Z`;
        insertMatch.run(
          groupName, 'group',
          home.team, away.team,
          home.code, away.code,
          dateTime,
          venue.venue, venue.city
        );
      });
    });
  });
  seedMatches();

  console.log('Database seeded successfully!');
}

module.exports = db;
