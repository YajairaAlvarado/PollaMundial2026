const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/leaderboard
router.get('/', authenticateToken, (req, res) => {
  const leaderboard = db.prepare(`
    SELECT
      u.id,
      u.username,
      u.display_name,
      u.department,
      u.avatar_initials,
      COALESCE(SUM(p.points_earned), 0) as total_points,
      COUNT(CASE WHEN p.points_earned = 3 THEN 1 END) as exact_scores,
      COUNT(CASE WHEN p.points_earned = 2 THEN 1 END) as correct_results,
      COUNT(p.id) as predictions_made
    FROM users u
    LEFT JOIN predictions p ON u.id = p.user_id
    GROUP BY u.id
    ORDER BY total_points DESC, exact_scores DESC, correct_results DESC
  `).all();

  const ranked = leaderboard.map((user, idx) => ({
    ...user,
    rank: idx + 1
  }));

  res.json(ranked);
});

module.exports = router;
