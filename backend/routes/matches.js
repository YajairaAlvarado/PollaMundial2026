const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/matches/live
router.get('/live', (req, res) => {
  const matches = db.prepare(`
    SELECT * FROM matches WHERE status = 'live' ORDER BY match_date ASC
  `).all();
  res.json(matches);
});

// GET /api/matches
router.get('/', (req, res) => {
  const { stage, group, status } = req.query;

  let query = 'SELECT * FROM matches WHERE 1=1';
  const params = [];

  if (stage) {
    query += ' AND stage = ?';
    params.push(stage);
  }
  if (group) {
    query += ' AND group_name = ?';
    params.push(group);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY match_date ASC';

  const matches = db.prepare(query).all(...params);
  res.json(matches);
});

// GET /api/matches/:id
router.get('/:id', (req, res) => {
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) {
    return res.status(404).json({ error: 'Partido no encontrado' });
  }
  res.json(match);
});

// PUT /api/matches/:id/result (admin endpoint to update match score and calculate points)
router.put('/:id/result', authenticateToken, (req, res) => {
  const { homeScore, awayScore, status } = req.body;

  if (homeScore === undefined || awayScore === undefined) {
    return res.status(400).json({ error: 'Se requiere homeScore y awayScore' });
  }

  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) {
    return res.status(404).json({ error: 'Partido no encontrado' });
  }

  const matchStatus = status || 'finished';

  // Update match
  db.prepare(`
    UPDATE matches SET home_score = ?, away_score = ?, status = ? WHERE id = ?
  `).run(homeScore, awayScore, matchStatus, req.params.id);

  // Calculate points for all predictions if finished
  if (matchStatus === 'finished') {
    const predictions = db.prepare('SELECT * FROM predictions WHERE match_id = ?').all(req.params.id);

    const updatePoints = db.prepare('UPDATE predictions SET points_earned = ? WHERE id = ?');

    const calcPoints = db.transaction(() => {
      for (const pred of predictions) {
        let points = 0;
        const actualHome = parseInt(homeScore);
        const actualAway = parseInt(awayScore);
        const predHome = pred.home_score;
        const predAway = pred.away_score;

        if (predHome === actualHome && predAway === actualAway) {
          // Exact score
          points = 3;
        } else {
          // Check winner
          const actualWinner = actualHome > actualAway ? 'home' : actualHome < actualAway ? 'away' : 'draw';
          const predWinner = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
          if (actualWinner === predWinner) {
            points = 2;
          }
        }

        updatePoints.run(points, pred.id);
      }
    });

    calcPoints();
  }

  const updatedMatch = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  res.json({ message: 'Resultado actualizado', match: updatedMatch });
});

// PUT /api/matches/:id/status
router.put('/:id/status', authenticateToken, (req, res) => {
  const { status } = req.body;
  if (!['scheduled', 'live', 'finished'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  db.prepare('UPDATE matches SET status = ? WHERE id = ?').run(status, req.params.id);
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  res.json(match);
});

module.exports = router;
