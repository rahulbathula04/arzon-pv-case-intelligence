import { Router } from 'express';
import { db } from '../db/database.js';
import { setActiveUserId, getActiveUserId } from '../middleware/auth.js';

export const authRouter = Router();

// Get current active user
authRouter.get('/me', (req, res) => {
  res.json({ user: req.user });
});

// List all users for simulation testing
authRouter.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT id, email, full_name as fullName, role, cohort, created_at as createdAt
    FROM users
    ORDER BY role, full_name
  `).all();
  res.json({ users, activeUserId: getActiveUserId() });
});

// Switch active user in simulation
authRouter.post('/switch-user', (req, res) => {
  const { userId } = req.body;
  const user = db.prepare('SELECT id, email, full_name as fullName, role, cohort FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  setActiveUserId(userId);
  res.json({ success: true, user });
});
