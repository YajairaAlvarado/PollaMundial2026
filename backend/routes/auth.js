const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  // Try AD integration first if configured
  if (process.env.AD_API_URL) {
    try {
      const fetch = require('node-fetch');
      const adResponse = await fetch(process.env.AD_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        timeout: 5000
      });

      if (adResponse.ok) {
        const adData = await adResponse.json();
        if (adData.success && adData.user) {
          // Upsert user from AD
          const adUser = adData.user;
          const initials = (adUser.displayName || username)
            .split(' ')
            .map(w => w[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();

          const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

          let userId;
          if (!existingUser) {
            const result = db.prepare(`
              INSERT INTO users (username, password_hash, display_name, email, department, avatar_initials)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(username, '', adUser.displayName || username, adUser.email || '', adUser.department || 'General', initials);
            userId = result.lastInsertRowid;
          } else {
            userId = existingUser.id;
          }

          const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
          const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          return res.json({
            token,
            user: {
              id: user.id,
              username: user.username,
              displayName: user.display_name,
              email: user.email,
              department: user.department,
              avatarInitials: user.avatar_initials
            }
          });
        }
      }
    } catch (err) {
      console.log('AD auth failed, falling back to local auth:', err.message);
    }
  }

  // Local auth fallback
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      email: user.email,
      department: user.department,
      avatarInitials: user.avatar_initials
    }
  });
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').authenticateToken, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    email: user.email,
    department: user.department,
    avatarInitials: user.avatar_initials
  });
});

module.exports = router;
