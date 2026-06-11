// Standalone mode: no backend needed. All data lives here + localStorage.
import { calculatePoints } from './scoring';

// Grupos del sorteo oficial FIFA (5 dic 2025)
const GROUPS_DATA = [
  {
    name: 'A',
    teams: [
      { name: 'México', code: 'mx' }, { name: 'Sudáfrica', code: 'za' },
      { name: 'Corea del Sur', code: 'kr' }, { name: 'Chequia', code: 'cz' },
    ],
    venues: ['Estadio Azteca', 'AT&T Stadium'],
    cities: ['Ciudad de México', 'Dallas'],
    md1: '2026-06-11', md2: '2026-06-18', md3: '2026-06-24',
  },
  {
    name: 'B',
    teams: [
      { name: 'Canadá', code: 'ca' }, { name: 'Bosnia-Herzegovina', code: 'ba' },
      { name: 'Qatar', code: 'qa' }, { name: 'Suiza', code: 'ch' },
    ],
    venues: ['BMO Field', 'BC Place'],
    cities: ['Toronto', 'Vancouver'],
    md1: '2026-06-12', md2: '2026-06-19', md3: '2026-06-25',
  },
  {
    name: 'C',
    teams: [
      { name: 'Brasil', code: 'br' }, { name: 'Marruecos', code: 'ma' },
      { name: 'Haití', code: 'ht' }, { name: 'Escocia', code: 'gb-sct' },
    ],
    venues: ['MetLife Stadium', 'SoFi Stadium'],
    cities: ['Nueva York', 'Los Ángeles'],
    md1: '2026-06-12', md2: '2026-06-19', md3: '2026-06-25',
  },
  {
    name: 'D',
    teams: [
      { name: 'USA', code: 'us' }, { name: 'Paraguay', code: 'py' },
      { name: 'Australia', code: 'au' }, { name: 'Turquía', code: 'tr' },
    ],
    venues: ['MetLife Stadium', 'AT&T Stadium'],
    cities: ['Nueva York', 'Dallas'],
    md1: '2026-06-13', md2: '2026-06-20', md3: '2026-06-26',
  },
  {
    name: 'E',
    teams: [
      { name: 'Alemania', code: 'de' }, { name: 'Curazao', code: 'cw' },
      { name: 'Costa de Marfil', code: 'ci' }, { name: 'Ecuador', code: 'ec' },
    ],
    venues: ['SoFi Stadium', 'NRG Stadium'],
    cities: ['Los Ángeles', 'Houston'],
    md1: '2026-06-13', md2: '2026-06-20', md3: '2026-06-26',
  },
  {
    name: 'F',
    teams: [
      { name: 'Países Bajos', code: 'nl' }, { name: 'Japón', code: 'jp' },
      { name: 'Suecia', code: 'se' }, { name: 'Túnez', code: 'tn' },
    ],
    venues: ['Arrowhead Stadium', 'Lincoln Financial Field'],
    cities: ['Kansas City', 'Filadelfia'],
    md1: '2026-06-14', md2: '2026-06-21', md3: '2026-06-27',
  },
  {
    name: 'G',
    teams: [
      { name: 'Bélgica', code: 'be' }, { name: 'Egipto', code: 'eg' },
      { name: 'Irán', code: 'ir' }, { name: 'Nueva Zelanda', code: 'nz' },
    ],
    venues: ['Estadio Akron', 'Lumen Field'],
    cities: ['Guadalajara', 'Seattle'],
    md1: '2026-06-14', md2: '2026-06-21', md3: '2026-06-27',
  },
  {
    name: 'H',
    teams: [
      { name: 'España', code: 'es' }, { name: 'Cabo Verde', code: 'cv' },
      { name: 'Arabia Saudita', code: 'sa' }, { name: 'Uruguay', code: 'uy' },
    ],
    venues: ['Hard Rock Stadium', "Levi's Stadium"],
    cities: ['Miami', 'San Francisco'],
    md1: '2026-06-15', md2: '2026-06-22', md3: '2026-06-28',
  },
  {
    name: 'I',
    teams: [
      { name: 'Francia', code: 'fr' }, { name: 'Senegal', code: 'sn' },
      { name: 'Irak', code: 'iq' }, { name: 'Noruega', code: 'no' },
    ],
    venues: ['NRG Stadium', 'BC Place'],
    cities: ['Houston', 'Vancouver'],
    md1: '2026-06-15', md2: '2026-06-22', md3: '2026-06-28',
  },
  {
    name: 'J',
    teams: [
      { name: 'Argentina', code: 'ar' }, { name: 'Argelia', code: 'dz' },
      { name: 'Austria', code: 'at' }, { name: 'Jordania', code: 'jo' },
    ],
    venues: ['MetLife Stadium', 'Hard Rock Stadium'],
    cities: ['Nueva York', 'Miami'],
    md1: '2026-06-16', md2: '2026-06-23', md3: '2026-06-29',
  },
  {
    name: 'K',
    teams: [
      { name: 'Portugal', code: 'pt' }, { name: 'Congo DR', code: 'cd' },
      { name: 'Uzbekistán', code: 'uz' }, { name: 'Colombia', code: 'co' },
    ],
    venues: ['Gillette Stadium', "Levi's Stadium"],
    cities: ['Boston', 'San Francisco'],
    md1: '2026-06-16', md2: '2026-06-23', md3: '2026-06-29',
  },
  {
    name: 'L',
    teams: [
      { name: 'Inglaterra', code: 'gb-eng' }, { name: 'Croacia', code: 'hr' },
      { name: 'Ghana', code: 'gh' }, { name: 'Panamá', code: 'pa' },
    ],
    venues: ['Gillette Stadium', 'SoFi Stadium'],
    cities: ['Boston', 'Los Ángeles'],
    md1: '2026-06-17', md2: '2026-06-24', md3: '2026-06-29',
  },
];

// Match scores — populated as results come in during the tournament
const DEMO_SCORES = {};

// Generate all 72 group stage matches
function buildMatches() {
  let id = 1;
  const all = [];
  for (const g of GROUPS_DATA) {
    const [t0, t1, t2, t3] = g.teams;
    const pairs = [
      // MD1
      { home: t0, away: t1, date: g.md1 + 'T18:00:00Z', venue: g.venues[0], city: g.cities[0] },
      { home: t2, away: t3, date: g.md1 + 'T21:00:00Z', venue: g.venues[1], city: g.cities[1] },
      // MD2
      { home: t0, away: t2, date: g.md2 + 'T18:00:00Z', venue: g.venues[0], city: g.cities[0] },
      { home: t1, away: t3, date: g.md2 + 'T21:00:00Z', venue: g.venues[1], city: g.cities[1] },
      // MD3
      { home: t0, away: t3, date: g.md3 + 'T21:00:00Z', venue: g.venues[0], city: g.cities[0] },
      { home: t1, away: t2, date: g.md3 + 'T21:00:00Z', venue: g.venues[1], city: g.cities[1] },
    ];
    for (const p of pairs) {
      const score = DEMO_SCORES[id];
      const status = score ? 'finished' : 'scheduled';
      all.push({
        id,
        group_name: g.name,
        stage: 'group',
        home_team: p.home.name,
        away_team: p.away.name,
        home_code: p.home.code,
        away_code: p.away.code,
        match_date: p.date,
        venue: p.venue,
        city: p.city,
        home_score: score ? score.home : null,
        away_score: score ? score.away : null,
        status,
      });
      id++;
    }
  }
  return all;
}

export const ALL_MATCHES = buildMatches();

export const MOCK_LEADERBOARD = [
  { rank: 1, username: 'raissa.aguila', display_name: 'Raissa Aguila', avatar_initials: 'RA', department: 'Administracion', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 2, username: 'sandy.alava', display_name: 'Sandy Alava', avatar_initials: 'SA', department: 'Capital Humano', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 3, username: 'yajaira.alvarado', display_name: 'Yajaira Alvarado', avatar_initials: 'YA', department: 'Nuevos Negocios', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 4, username: 'britney.alvarez', display_name: 'Britney Alvarez', avatar_initials: 'BA', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 5, username: 'astrid.alvarez', display_name: 'Astrid Alvarez', avatar_initials: 'AA', department: 'Comercial', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 6, username: 'zoila.andrade', display_name: 'Zoila Andrade', avatar_initials: 'ZA', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 7, username: 'abraham.anzules', display_name: 'Abraham Anzules', avatar_initials: 'AA', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 8, username: 'ana.aponte', display_name: 'Ana Aponte', avatar_initials: 'AA', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 9, username: 'ambar.aragundy', display_name: 'Ambar Aragundy', avatar_initials: 'AA', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 10, username: 'josue.arriaga', display_name: 'Josue Arriaga', avatar_initials: 'JA', department: 'Administracion', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 11, username: 'kristel.arriaga', display_name: 'Kristel Arriaga', avatar_initials: 'KA', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 12, username: 'diana.bajana', display_name: 'Diana Bajana', avatar_initials: 'DB', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 13, username: 'leandro.barona', display_name: 'Leandro Barona', avatar_initials: 'LB', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 14, username: 'aurelio.barreto', display_name: 'Aurelio Barreto', avatar_initials: 'AB', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 15, username: 'beatriz.bolanos', display_name: 'Beatriz Bolanos', avatar_initials: 'BB', department: 'Consultoria', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 16, username: 'raul.bolanos', display_name: 'Raul Bolanos', avatar_initials: 'RB', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 17, username: 'marlon.bonilla', display_name: 'Marlon Bonilla', avatar_initials: 'MB', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 18, username: 'francisco.briones', display_name: 'Francisco Briones', avatar_initials: 'FB', department: 'Economía Y Empresa', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 19, username: 'alfredo.bustos', display_name: 'Alfredo Bustos', avatar_initials: 'AB', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 20, username: 'daniel.bustos', display_name: 'Daniel Bustos', avatar_initials: 'DB', department: 'Consultoria', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 21, username: 'hector.calderon', display_name: 'Hector Calderon', avatar_initials: 'HC', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 22, username: 'mercedes.calderon', display_name: 'Mercedes Calderon', avatar_initials: 'MC', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 23, username: 'sofia.carranza', display_name: 'Sofia Carranza', avatar_initials: 'SC', department: 'Contabilidad/Finanzas', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 24, username: 'christian.castro', display_name: 'Christian Castro', avatar_initials: 'CC', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 25, username: 'kevin.castro', display_name: 'Kevin Castro', avatar_initials: 'KC', department: 'Nuevos Negocios', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 26, username: 'carlos.cedillo', display_name: 'Carlos Cedillo', avatar_initials: 'CC', department: 'Administracion', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 27, username: 'valentina.chavez', display_name: 'Valentina Chavez', avatar_initials: 'VC', department: 'Administracion', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 28, username: 'diego.chavez', display_name: 'Diego Chavez', avatar_initials: 'DC', department: 'Consultoria', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 29, username: 'lissette.chele', display_name: 'Lissette Chele', avatar_initials: 'LC', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 30, username: 'dexer.chinga', display_name: 'Dexer Chinga', avatar_initials: 'DC', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 31, username: 'gabriel.chiriboga', display_name: 'Gabriel Chiriboga', avatar_initials: 'GC', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 32, username: 'cristhian.contreras', display_name: 'Cristhian Contreras', avatar_initials: 'CC', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 33, username: 'jefferson.cordova', display_name: 'Jefferson Cordova', avatar_initials: 'JC', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 34, username: 'marlon.cruz', display_name: 'Marlon Cruz', avatar_initials: 'MC', department: 'Contabilidad/Finanzas', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 35, username: 'katherine.deloor', display_name: 'Katherine Deloor', avatar_initials: 'KD', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 36, username: 'fiorella.demori', display_name: 'Fiorella Demori', avatar_initials: 'FD', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 37, username: 'josue.demera', display_name: 'Josue Demera', avatar_initials: 'JD', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 38, username: 'ashley.endara', display_name: 'Ashley Endara', avatar_initials: 'AE', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 39, username: 'luis.escudero', display_name: 'Luis Escudero', avatar_initials: 'LE', department: 'Capital Humano', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 40, username: 'julio.fernandez', display_name: 'Julio Fernandez', avatar_initials: 'JF', department: 'Patrocinio', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 41, username: 'natalie.firmat', display_name: 'Natalie Firmat', avatar_initials: 'NF', department: 'Marketing', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 42, username: 'miguel.franco', display_name: 'Miguel Franco', avatar_initials: 'MF', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 43, username: 'kenia.franco', display_name: 'Kenia Franco', avatar_initials: 'KF', department: 'Marketing', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 44, username: 'freddy.garcia', display_name: 'Freddy Garcia', avatar_initials: 'FG', department: 'Economía Y Empresa', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 45, username: 'keila.gonzabay', display_name: 'Keila Gonzabay', avatar_initials: 'KG', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 46, username: 'paola.gonzalez', display_name: 'Paola Gonzalez', avatar_initials: 'PG', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 47, username: 'tais.guachambo', display_name: 'Tais Guachambo', avatar_initials: 'TG', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 48, username: 'douglas.gualpa', display_name: 'Douglas Gualpa', avatar_initials: 'DG', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 49, username: 'nayely.guaman', display_name: 'Nayely Guaman', avatar_initials: 'NG', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 50, username: 'jennifer.guasco', display_name: 'Jennifer Guasco', avatar_initials: 'JG', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 51, username: 'gabriela.guerrero', display_name: 'Gabriela Guerrero', avatar_initials: 'GG', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 52, username: 'dulce.guevara', display_name: 'Dulce Guevara', avatar_initials: 'DG', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 53, username: 'pablo.guevara', display_name: 'Pablo Guevara', avatar_initials: 'PG', department: 'Consultoria', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 54, username: 'anahi.gutierrez', display_name: 'Anahi Gutierrez', avatar_initials: 'AG', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 55, username: 'vianna.hermosa', display_name: 'Vianna Hermosa', avatar_initials: 'VH', department: 'Consultoria', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 56, username: 'irene.holguin', display_name: 'Irene Holguin', avatar_initials: 'IH', department: 'Contabilidad/Finanzas', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 57, username: 'madeleine.holguin', display_name: 'Madeleine Holguin', avatar_initials: 'MH', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 58, username: 'jhon.indio', display_name: 'Jhon Indio', avatar_initials: 'JI', department: 'Administracion', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 59, username: 'luis.iniga', display_name: 'Luis Iniga', avatar_initials: 'LI', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 60, username: 'gia.jimbo', display_name: 'Gia Jimbo', avatar_initials: 'GJ', department: 'Contabilidad/Finanzas', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 61, username: 'angelica.lainez', display_name: 'Angelica Lainez', avatar_initials: 'AL', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 62, username: 'stephany.lara', display_name: 'Stephany Lara', avatar_initials: 'SL', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 63, username: 'juliana.lazaro', display_name: 'Juliana Lazaro', avatar_initials: 'JL', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 64, username: 'hower.leon', display_name: 'Hower Leon', avatar_initials: 'HL', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 65, username: 'daniel.leon', display_name: 'Daniel Leon', avatar_initials: 'DL', department: 'Nuevos Negocios', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 66, username: 'jose.leon', display_name: 'Jose Leon', avatar_initials: 'JL', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 67, username: 'fiorella.limones', display_name: 'Fiorella Limones', avatar_initials: 'FL', department: 'Consultoria', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 68, username: 'sara.lopez', display_name: 'Sara Lopez', avatar_initials: 'SL', department: 'Consultoria', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 69, username: 'grace.lopez', display_name: 'Grace Lopez', avatar_initials: 'GL', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 70, username: 'jeancarlos.marcillo', display_name: 'Jeancarlos Marcillo', avatar_initials: 'JM', department: 'Consultoria', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 71, username: 'joao.marcillo', display_name: 'Joao Marcillo', avatar_initials: 'JM', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 72, username: 'romina.maridueña', display_name: 'Romina Maridueña', avatar_initials: 'RM', department: 'Patrocinio', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 73, username: 'karla.matamoros', display_name: 'Karla Matamoros', avatar_initials: 'KM', department: 'Capital Humano', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 74, username: 'amy.mendoza', display_name: 'Amy Mendoza', avatar_initials: 'AM', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 75, username: 'alejandro.merchan', display_name: 'Alejandro Merchan', avatar_initials: 'AM', department: 'Contabilidad/Finanzas', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 76, username: 'madelyne.meza', display_name: 'Madelyne Meza', avatar_initials: 'MM', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 77, username: 'jonathan.minga', display_name: 'Jonathan Minga', avatar_initials: 'JM', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 78, username: 'azael.mite', display_name: 'Azael Mite', avatar_initials: 'AM', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 79, username: 'camila.mora', display_name: 'Camila Mora', avatar_initials: 'CM', department: 'Patrocinio', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 80, username: 'oscar.morales', display_name: 'Oscar Morales', avatar_initials: 'OM', department: 'Administracion', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 81, username: 'melany.moreira', display_name: 'Melany Moreira', avatar_initials: 'MM', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 82, username: 'farina.morejon', display_name: 'Farina Morejon', avatar_initials: 'FM', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 83, username: 'abel.murillo', display_name: 'Abel Murillo', avatar_initials: 'AM', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 84, username: 'marcelo.murillo', display_name: 'Marcelo Murillo', avatar_initials: 'MM', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 85, username: 'jenniffer.narvaez', display_name: 'Jenniffer Narvaez', avatar_initials: 'JN', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 86, username: 'dennis.noboa', display_name: 'Dennis Noboa', avatar_initials: 'DN', department: 'Comercial', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 87, username: 'marcelo.orellana', display_name: 'Marcelo Orellana', avatar_initials: 'MO', department: 'Patrocinio', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 88, username: 'mario.orelllana', display_name: 'Mario Orelllana', avatar_initials: 'MO', department: 'Patrocinio', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 89, username: 'kleber.padilla', display_name: 'Kleber Padilla', avatar_initials: 'KP', department: 'Capital Humano', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 90, username: 'amina.palacios', display_name: 'Amina Palacios', avatar_initials: 'AP', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 91, username: 'andres.pardo', display_name: 'Andres Pardo', avatar_initials: 'AP', department: 'Contabilidad/Finanzas', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 92, username: 'daniela.paredes', display_name: 'Daniela Paredes', avatar_initials: 'DP', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 93, username: 'mariana.pastor', display_name: 'Mariana Pastor', avatar_initials: 'MP', department: 'Marketing', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 94, username: 'vicente.pazmino', display_name: 'Vicente Pazmino', avatar_initials: 'VP', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 95, username: 'yamilet.penaherrera', display_name: 'Yamilet Penaherrera', avatar_initials: 'YP', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 96, username: 'lesny.pico', display_name: 'Lesny Pico', avatar_initials: 'LP', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 97, username: 'angely.pincay', display_name: 'Angely Pincay', avatar_initials: 'AP', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 98, username: 'francisco.pita', display_name: 'Francisco Pita', avatar_initials: 'FP', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 99, username: 'lilibeth.plaza', display_name: 'Lilibeth Plaza', avatar_initials: 'LP', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 100, username: 'judith.pluas', display_name: 'Judith Pluas', avatar_initials: 'JP', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 101, username: 'alex.ponce', display_name: 'Alex Ponce', avatar_initials: 'AP', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 102, username: 'kevin.preciado', display_name: 'Kevin Preciado', avatar_initials: 'KP', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 103, username: 'isorela.puglla', display_name: 'Isorela Puglla', avatar_initials: 'IP', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 104, username: 'ninoska.quijano', display_name: 'Ninoska Quijano', avatar_initials: 'NQ', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 105, username: 'naomy.quimis', display_name: 'Naomy Quimis', avatar_initials: 'NQ', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 106, username: 'marcos.quinde', display_name: 'Marcos Quinde', avatar_initials: 'MQ', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 107, username: 'iveth.quinto', display_name: 'Iveth Quinto', avatar_initials: 'IQ', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 108, username: 'johnny.quinonez', display_name: 'Johnny Quinonez', avatar_initials: 'JQ', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 109, username: 'diana.quishpillo', display_name: 'Diana Quishpillo', avatar_initials: 'DQ', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 110, username: 'alexis.robayo', display_name: 'Alexis Robayo', avatar_initials: 'AR', department: 'Patrocinio', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 111, username: 'abraham.rodriguez', display_name: 'Abraham Rodriguez', avatar_initials: 'AR', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 112, username: 'sebastian.rodriguez', display_name: 'Sebastian Rodriguez', avatar_initials: 'SR', department: 'Consultoria', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 113, username: 'gabriela.romero', display_name: 'Gabriela Romero', avatar_initials: 'GR', department: 'Nuevos Negocios', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 114, username: 'luciana.salame', display_name: 'Luciana Salame', avatar_initials: 'LS', department: 'Consultoria', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 115, username: 'lissette.sanchez', display_name: 'Lissette Sanchez', avatar_initials: 'LS', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 116, username: 'gabriel.solis', display_name: 'Gabriel Solis', avatar_initials: 'GS', department: 'Administracion', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 117, username: 'karen.suarez', display_name: 'Karen Suarez', avatar_initials: 'KS', department: 'Administracion', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 118, username: 'samuel.suarez', display_name: 'Samuel Suarez', avatar_initials: 'SS', department: 'Comercial', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 119, username: 'ricardo.taipe', display_name: 'Ricardo Taipe', avatar_initials: 'RT', department: 'Administracion', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 120, username: 'jose.teran', display_name: 'Jose Teran', avatar_initials: 'JT', department: 'Consultoria', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 121, username: 'lady.toala', display_name: 'Lady Toala', avatar_initials: 'LT', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 122, username: 'carlos.torres', display_name: 'Carlos Torres', avatar_initials: 'CT', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 123, username: 'ruben.tubay', display_name: 'Ruben Tubay', avatar_initials: 'RT', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 124, username: 'allan.vargas', display_name: 'Allan Vargas', avatar_initials: 'AV', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 125, username: 'jose.vega', display_name: 'Jose Vega', avatar_initials: 'JV', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 126, username: 'maria.velastegui', display_name: 'Maria Velastegui', avatar_initials: 'MV', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 127, username: 'gabriela.verdesoto', display_name: 'Gabriela Verdesoto', avatar_initials: 'GV', department: 'Consultoria', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 128, username: 'joffre.villegas', display_name: 'Joffre Villegas', avatar_initials: 'JV', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 129, username: 'roger.yagual', display_name: 'Roger Yagual', avatar_initials: 'RY', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 130, username: 'briggitte.yupa', display_name: 'Briggitte Yupa', avatar_initials: 'BY', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 131, username: 'francisco.zabala', display_name: 'Francisco Zabala', avatar_initials: 'FZ', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 132, username: 'solange.zambrano', display_name: 'Solange Zambrano', avatar_initials: 'SZ', department: 'Contabilidad/Finanzas', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 133, username: 'daniela.zorrilla', display_name: 'Daniela Zorrilla', avatar_initials: 'DZ', department: 'Impuestos', total_points: 0, exact_scores: 0, correct_results: 0 },
  { rank: 134, username: 'german.zuniga', display_name: 'German Zuniga', avatar_initials: 'GZ', department: 'Administracion', total_points: 0, exact_scores: 0, correct_results: 0 }
];

export const MOCK_BRACKET = {
  r32: Array.from({ length: 16 }, (_, i) => ({
    id: `r32_${i + 1}`,
    home_team: null, home_code: null,
    away_team: null, away_code: null,
    home_score: null, away_score: null,
    status: 'scheduled',
    home_label: `Clasificado ${2 * i + 1}`,
    away_label: `Clasificado ${2 * i + 2}`,
  })),
  r16: Array.from({ length: 8 }, (_, i) => ({
    id: `r16_${i + 1}`,
    home_team: null, home_code: null,
    away_team: null, away_code: null,
    home_score: null, away_score: null,
    status: 'scheduled',
    home_label: `G. R32-${2 * i + 1}`,
    away_label: `G. R32-${2 * i + 2}`,
  })),
  qf: Array.from({ length: 4 }, (_, i) => ({
    id: `qf_${i + 1}`,
    home_team: null, home_code: null,
    away_team: null, away_code: null,
    home_score: null, away_score: null,
    status: 'scheduled',
    home_label: `G. Octavo ${2 * i + 1}`,
    away_label: `G. Octavo ${2 * i + 2}`,
  })),
  sf: Array.from({ length: 2 }, (_, i) => ({
    id: `sf_${i + 1}`,
    home_team: null, home_code: null,
    away_team: null, away_code: null,
    home_score: null, away_score: null,
    status: 'scheduled',
    home_label: `G. Cuarto ${2 * i + 1}`,
    away_label: `G. Cuarto ${2 * i + 2}`,
  })),
  final: [{
    id: 'final_1',
    home_team: null, home_code: null,
    away_team: null, away_code: null,
    home_score: null, away_score: null,
    status: 'scheduled',
    home_label: 'G. Semifinal 1',
    away_label: 'G. Semifinal 2',
  }],
  thirdPlace: {
    id: 'third_1',
    home_team: null, home_code: null,
    away_team: null, away_code: null,
    home_score: null, away_score: null,
    status: 'scheduled',
    home_label: 'Perd. Semifinal 1',
    away_label: 'Perd. Semifinal 2',
  },
};

// --- LocalStorage helpers ---
function getPreds() {
  try { return JSON.parse(localStorage.getItem('wc2026_mock_preds') || '{}'); }
  catch { return {}; }
}
function savePreds(p) {
  localStorage.setItem('wc2026_mock_preds', JSON.stringify(p));
}

function calcPredPoints(matchId, homeScore, awayScore) {
  const match = ALL_MATCHES.find((m) => m.id === matchId);
  if (!match || match.status !== 'finished') return 0;
  return calculatePoints(
    { home_score: homeScore, away_score: awayScore },
    { home_score: match.home_score, away_score: match.away_score }
  );
}

// --- Mock API handlers ---
function filterMatches(params) {
  let list = ALL_MATCHES;
  if (params.stage) list = list.filter((m) => m.stage === params.stage);
  if (params.group) list = list.filter((m) => m.group_name === params.group);
  if (params.status) list = list.filter((m) => m.status === params.status);
  return list;
}

function parseQuery(url) {
  const [, qs] = url.split('?');
  if (!qs) return {};
  return Object.fromEntries(new URLSearchParams(qs));
}

function mockGet(url) {
  const path = url.split('?')[0];
  const params = parseQuery(url);

  if (path === '/matches' || path === '/matches/') {
    return filterMatches(params);
  }
  if (path === '/matches/live') {
    return ALL_MATCHES.filter((m) => m.status === 'live');
  }
  if (path.match(/^\/matches\/\d+$/)) {
    const id = parseInt(path.split('/')[2]);
    return ALL_MATCHES.find((m) => m.id === id) || null;
  }
  if (path === '/predictions/my') {
    const preds = getPreds();
    return ALL_MATCHES
      .filter((m) => preds[m.id])
      .map((m) => ({
        id: m.id,
        match_id: m.id,
        home_team: m.home_team,
        away_team: m.away_team,
        home_code: m.home_code,
        away_code: m.away_code,
        group_name: m.group_name,
        match_date: m.match_date,
        status: m.status,
        home_score: preds[m.id].home_score,
        away_score: preds[m.id].away_score,
        actual_home: m.home_score,
        actual_away: m.away_score,
        points_earned: preds[m.id].points_earned,
      }));
  }
  if (path.match(/^\/predictions\/match\/\d+$/)) {
    const matchId = parseInt(path.split('/')[3]);
    const preds = getPreds();
    return preds[matchId] || null;
  }
  if (path === '/bracket') return MOCK_BRACKET;
  if (path === '/leaderboard') {
    const preds = getPreds();
    let myTotal = 0, myExact = 0, myCorrect = 0;
    for (const p of Object.values(preds)) {
      myTotal += p.points_earned || 0;
      if (p.points_earned === 3) myExact++;
      else if (p.points_earned === 2) myCorrect++;
    }
    const token = localStorage.getItem('wc2026_token') || '';
    const currentUsername = token.startsWith('standalone-') ? token.replace('standalone-', '') : '';
    return MOCK_LEADERBOARD.map((e) => {
      if (currentUsername && e.username === currentUsername) {
        return { ...e, total_points: myTotal, exact_scores: myExact, correct_results: myCorrect };
      }
      return { ...e };
    }).sort((a, b) => b.total_points - a.total_points || a.display_name.localeCompare(b.display_name))
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }
  return null;
}

function mockPost(url, data) {
  if (url.match(/^\/predictions\/\d+$/)) {
    const matchId = parseInt(url.split('/')[2]);
    const { homeScore, awayScore } = data;
    const points = calcPredPoints(matchId, homeScore, awayScore);
    const preds = getPreds();
    preds[matchId] = { match_id: matchId, home_score: homeScore, away_score: awayScore, points_earned: points };
    savePreds(preds);
    return preds[matchId];
  }
  return null;
}

// --- Public mock API object (same interface as axios) ---
const mockApi = {
  get: (url) => Promise.resolve({ data: mockGet(url) }),
  post: (url, data) => Promise.resolve({ data: mockPost(url, data) }),
  defaults: { headers: { common: {} } },
  interceptors: {
    request: { use: () => {} },
    response: { use: () => {} },
  },
};

export default mockApi;
