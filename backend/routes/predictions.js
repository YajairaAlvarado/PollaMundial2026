const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// All prediction routes require authentication
router.use(authenticateToken);

// POST /api/predictions/:matchId — create or update prediction
router.post('/:matchId', (req, res) => {
  const { homeScore, awayScore } = req.body;
  const matchId = parseInt(req.params.matchId);
  const userId = req.user.userId;

  if (homeScore === undefined || awayScore === undefined) {
    return res.status(400).json({ error: 'Se requiere homeScore y awayScore' });
  }

  if (homeScore < 0 || awayScore < 0 || homeScore > 20 || awayScore > 20) {
    return res.status(400).json({ error: 'Puntuación inválida (0-20)' });
  }

  // Check match exists and hasn't started
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
  if (!match) {
    return res.status(404).json({ error: 'Partido no encontrado' });
  }

  if (match.status !== 'scheduled') {
    return res.status(400).json({ error: 'No se pueden modificar predicciones para partidos en curso o finalizados' });
  }

  // Check deadline - match date
  const matchDate = new Date(match.match_date);
  if (new Date() > matchDate) {
    return res.status(400).json({ error: 'El plazo para predecir este partido ha vencido' });
  }

  // Upsert prediction
  const existing = db.prepare('SELECT * FROM predictions WHERE user_id = ? AND match_id = ?').get(userId, matchId);

  if (existing) {
    db.prepare(`
      UPDATE predictions SET home_score = ?, away_score = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND match_id = ?
    `).run(homeScore, awayScore, userId, matchId);
  } else {
    db.prepare(`
      INSERT INTO predictions (user_id, match_id, home_score, away_score)
      VALUES (?, ?, ?, ?)
    `).run(userId, matchId, homeScore, awayScore);
  }

  const prediction = db.prepare('SELECT * FROM predictions WHERE user_id = ? AND match_id = ?').get(userId, matchId);
  res.json({ message: existing ? 'Predicción actualizada' : 'Predicción guardada', prediction });
});

// GET /api/predictions/my — all predictions for logged-in user
router.get('/my', (req, res) => {
  const userId = req.user.userId;

  const predictions = db.prepare(`
    SELECT
      p.*,
      m.home_team, m.away_team, m.home_code, m.away_code,
      m.match_date, m.group_name, m.stage, m.status,
      m.home_score as actual_home, m.away_score as actual_away,
      m.venue, m.city
    FROM predictions p
    JOIN matches m ON p.match_id = m.id
    WHERE p.user_id = ?
    ORDER BY m.match_date ASC
  `).all(userId);

  res.json(predictions);
});

// GET /api/predictions/match/:matchId — prediction for a specific match
router.get('/match/:matchId', (req, res) => {
  const userId = req.user.userId;
  const matchId = parseInt(req.params.matchId);

  const prediction = db.prepare(`
    SELECT * FROM predictions WHERE user_id = ? AND match_id = ?
  `).get(userId, matchId);

  if (!prediction) {
    return res.status(404).json({ error: 'No hay predicción para este partido' });
  }

  res.json(prediction);
});

module.exports = router;
