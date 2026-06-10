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

// Seed employees (INSERT OR IGNORE — preserves password changes across redeploys)
seedUsers();

// Seed matches only if none exist
const matchCount = db.prepare('SELECT COUNT(*) as count FROM matches').get();
if (matchCount.count === 0) {
  seedMatches();
}

function cap(s) { return s[0].toUpperCase() + s.slice(1); }

const EMPLOYEE_MAILS = [
  'raissa.aguila@ec.Andersen.com','sandy.alava@ec.Andersen.com','saray.aleman@ec.Andersen.com',
  'ingrid.almeida@ec.Andersen.com','cristina.altamirano@ec.Andersen.com','yajaira.alvarado@ec.Andersen.com',
  'britney.alvarez@ec.Andersen.com','juan.alvarez@ec.Andersen.com','luis.andrade@ec.Andersen.com',
  'zoila.andrade@ec.Andersen.com','abraham.anzules@ec.Andersen.com','ana.aponte@ec.Andersen.com',
  'ambar.aragundy@ec.Andersen.com','adriana.arcos@ec.Andersen.com','vanessa.arguello@ec.Andersen.com',
  'nohelia.arreaga@ec.Andersen.com','kristel.arriaga@ec.Andersen.com','diana.bajana@ec.Andersen.com',
  'domenica.baldeon@ec.Andersen.com','Daniela.Banegas@ec.Andersen.com','dante.bardellini@ec.Andersen.com',
  'leandro.barona@ec.Andersen.com','aurelio.barreto@ec.Andersen.com','emilio.bazurto@ec.Andersen.com',
  'beatriz.bolanos@ec.Andersen.com','raul.bolanos@ec.Andersen.com','marlon.bonilla@ec.Andersen.com',
  'joselin.borja@ec.Andersen.com','francisco.briones@ec.Andersen.com','gabriela.burgos@ec.Andersen.com',
  'alfredo.bustos@ec.Andersen.com','daniel.bustos@ec.Andersen.com','mercedes.calderon@ec.Andersen.com',
  'hector.calderon@ec.Andersen.com','milena.canote@ec.Andersen.com','sofia.carranza@ec.Andersen.com',
  'christian.castro@ec.Andersen.com','kevin.castro@ec.Andersen.com','adrian.cercado@ec.Andersen.com',
  'noemi.cevallos@ec.Andersen.com','johnny.chacon@ec.Andersen.com','diego.chavez@ec.Andersen.com',
  'Indira.Siongtay@ec.Andersen.com','lissette.chele@ec.Andersen.com','aleida.cherres@ec.Andersen.com',
  'dexer.chinga@ec.Andersen.com','gabriel.chiriboga@ec.Andersen.com','wilson.cobo@ec.Andersen.com',
  'cristhian.contreras@ec.Andersen.com','jefferson.cordova@ec.Andersen.com','kenya.crespin@ec.Andersen.com',
  'marlon.cruz@ec.Andersen.com','katherine.deloor@ec.Andersen.com','fiorella.demori@ec.Andersen.com',
  'josue.demera@ec.Andersen.com','ashley.endara@ec.Andersen.com','ivan.enriquez@ec.Andersen.com',
  'luis.escudero@ec.Andersen.com','gloria.fernandez@ec.Andersen.com','julio.fernandez@ec.Andersen.com',
  'miguel.franco@ec.Andersen.com','andy.garces@ec.Andersen.com','freddy.garcia@ec.Andersen.com',
  'emilio.garzon@ec.Andersen.com','keila.gonzabay@ec.Andersen.com','paola.gonzalez@ec.Andersen.com',
  'pierina.granados@ec.Andersen.com','tais.guachambo@ec.Andersen.com','douglas.gualpa@ec.Andersen.com',
  'nayely.guaman@ec.Andersen.com','jennifer.guasco@ec.Andersen.com','gabriela.guerrero@ec.Andersen.com',
  'dulce.guevara@ec.Andersen.com','pablo.guevara@ec.Andersen.com','anahi.gutierrez@ec.Andersen.com',
  'jorge.heupel@ec.Andersen.com','irene.holguin@ec.Andersen.com','madeleine.holguin@ec.Andersen.com',
  'luis.iniga@ec.Andersen.com','angelica.lainez@ec.Andersen.com','stephany.lara@ec.Andersen.com',
  'gianpaolo.lauri@ec.Andersen.com','Juliana.Lazaro@ec.Andersen.com','hower.leon@ec.Andersen.com',
  'daniel.leon@ec.Andersen.com','wellington.leon@ec.Andersen.com','jose.leon@ec.Andersen.com',
  'fiorella.limones@ec.Andersen.com','arianna.lindao@ec.Andersen.com','julio.loayza@ec.Andersen.com',
  'sara.lopez@ec.Andersen.com','grace.lopez@ec.Andersen.com','belen.luces@ec.Andersen.com',
  'Michelle.Moran@ec.Andersen.com','jeancarlos.marcillo@ec.Andersen.com','joao.marcillo@ec.Andersen.com',
  'romina.mariduena@ec.Andersen.com','francisco.mena@ec.Andersen.com','amy.mendoza@ec.Andersen.com',
  'alejandro.merchan@ec.Andersen.com','madelyne.meza@ec.Andersen.com','Jonathan.Minga@ec.Andersen.com',
  'azael.mite@ec.Andersen.com','allisson.monar@ec.Andersen.com','carlos.montiel@ec.Andersen.com',
  'camila.mora@ec.Andersen.com','sindy.moran@ec.Andersen.com','melany.moreira@ec.Andersen.com',
  'jemima.moreira@ec.Andersen.com','farina.morejon@ec.Andersen.com','gustavo.moreno@ec.Andersen.com',
  'jhon.munoz@ec.Andersen.com','abel.murillo@ec.Andersen.com','marcelo.murillo@ec.Andersen.com',
  'jenniffer.narvaez@ec.Andersen.com','dennis.noboa@ec.Andersen.com','mario.orellana@ec.Andersen.com',
  'marcelo.orellana@ec.Andersen.com','miguel.orozco@ec.Andersen.com','Adriana.Paguay@ec.Andersen.com',
  'amina.palacios@ec.Andersen.com','Andres.Pardo@ec.Andersen.com','gabriel.paredes@ec.Andersen.com',
  'daniela.paredes@ec.Andersen.com','mariana.pastor@ec.Andersen.com','vicente.pazmino@ec.Andersen.com',
  'daniel.penafiel@ec.Andersen.com','isabel.penaherrera@ec.Andersen.com','yamilet.penaherrera@ec.Andersen.com',
  'aracely.pesantez@ec.Andersen.com','lesny.pico@ec.Andersen.com','melanny.pincay@ec.Andersen.com',
  'angely.pincay@ec.Andersen.com','sofia.pinduisaca@ec.Andersen.com','francisco.pita@ec.Andersen.com',
  'lilibeth.plaza@ec.Andersen.com','judith.pluas@ec.Andersen.com','alex.ponce@ec.Andersen.com',
  'kevin.preciado@ec.Andersen.com','isorela.puglla@ec.Andersen.com','ninoska.quijano@ec.Andersen.com',
  'Naomy.Quimis@ec.Andersen.com','michelle.quinde@ec.Andersen.com','marcos.quinde@ec.Andersen.com',
  'johnny.quinonez@ec.Andersen.com','iveth.quinto@ec.Andersen.com','john.quiroz@ec.Andersen.com',
  'josua.quirumbay@ec.Andersen.com','diana.quishpillo@ec.Andersen.com','isabella.raymond@ec.Andersen.com',
  'mauricio.reyes@ec.Andersen.com','alfonso.rios@ec.Andersen.com','genesis.rizzo@ec.Andersen.com',
  'alexis.robayo@ec.Andersen.com','abraham.rodriguez@ec.Andersen.com','sebastian.rodriguez@ec.Andersen.com',
  'gabriela.romero@ec.Andersen.com','willian.rosado@ec.Andersen.com','naomy.rosas@ec.Andersen.com',
  'luciana.salame@ec.Andersen.com','lissette.sanchez@ec.Andersen.com','denisse.sares@ec.Andersen.com',
  'luis.sarmiento@ec.Andersen.com','miguel.silva@ec.Andersen.com','milena.soledispa@ec.Andersen.com',
  'rosalinda.soriano@ec.Andersen.com','karen.suarez@ec.Andersen.com','samuel.suarez@ec.Andersen.com',
  'ricardo.taipe@ec.Andersen.com','selene.tapia@ec.Andersen.com','paulina.tirsio@ec.Andersen.com',
  'lady.toala@ec.Andersen.com','veronica.tomala@ec.Andersen.com','melanny.tomala@ec.Andersen.com',
  'kevin.torres@ec.Andersen.com','carlos.torres@ec.Andersen.com','ruben.tubay@ec.Andersen.com',
  'allan.vargas@ec.Andersen.com','jose.vega@ec.Andersen.com','samira.velastegui@ec.Andersen.com',
  'maria.velastegui@ec.Andersen.com','gabriela.verdesoto@ec.Andersen.com','samantha.villacis@ec.Andersen.com',
  'joffre.villegas@ec.Andersen.com','joyce.villon@ec.Andersen.com','erick.vitores@ec.Andersen.com',
  'cindy.vivar@ec.Andersen.com','roger.yagual@ec.Andersen.com','briggitte.yupa@ec.Andersen.com',
  'francisco.zabala@ec.Andersen.com','solange.zambrano@ec.Andersen.com','tonny.zambrano@ec.Andersen.com',
  'belen.zambrano@ec.Andersen.com','daniela.zorrilla@ec.Andersen.com',
];

function seedUsers() {
  const defaultHash = bcrypt.hashSync('Mundial2026', 10);
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (username, password_hash, display_name, email, department, avatar_initials)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const seed = db.transaction(() => {
    for (const mail of EMPLOYEE_MAILS) {
      const username = mail.split('@')[0].toLowerCase();
      const parts = username.split('.');
      const displayName = parts.map(cap).join(' ');
      const initials = parts.map(p => p[0].toUpperCase()).join('').slice(0, 2);
      insertUser.run(username, defaultHash, displayName, mail.toLowerCase(), 'Andersen Ecuador', initials);
    }
  });
  seed();
  console.log('Usuarios Andersen Ecuador verificados/sincronizados.');
}

function seedMatches() {
  console.log('Sembrando partidos...');

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

  const runInsert = db.transaction(() => {
    groupKeys.forEach((groupName, groupIdx) => {
      const teams = groups[groupName];
      const venue = venues[groupIdx % venues.length];

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
  runInsert();

  console.log('Partidos sembrados correctamente.');
}

module.exports = db;
