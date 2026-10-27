import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { setActiveUserId, getActiveUserId, signUserToken } from '../middleware/auth.js';
import { UserRole } from '../../src/types/index.js';

export const authRouter = Router();

// POST /api/auth/login - Verified credential authentication
authRouter.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare(`
    SELECT id, email, password_hash, must_change_password, full_name as fullName, role, cohort, created_at as createdAt
    FROM users
    WHERE LOWER(email) = LOWER(?)
  `).get(email) as any;

  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Strict bcrypt password verification (zero plaintext bypass)
  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signUserToken({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role as UserRole,
    cohort: user.cohort
  });

  setActiveUserId(user.id);

  res.json({
    success: true,
    token,
    mustChangePassword: Boolean(user.must_change_password),
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      cohort: user.cohort,
      mustChangePassword: Boolean(user.must_change_password),
      createdAt: user.createdAt
    }
  });
});

// POST /api/auth/register - Self-service registration for healthcare students & associates
authRouter.post('/register', (req, res) => {
  const { fullName, email, password, program, cohort } = req.body;

  if (!fullName || !fullName.trim() || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Full name is required (minimum 2 characters).' });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Institutional email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please enter a valid institutional email address.' });
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  // Password Policy: min 10 chars, uppercase, lowercase, number, symbol
  if (password.length < 10) {
    return res.status(422).json({ error: 'Password must be at least 10 characters in length.' });
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return res.status(422).json({
      error: 'Password must contain at least one uppercase letter, one lowercase letter, one numeric digit, and one symbol.'
    });
  }

  // Prevent duplicate registration
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
  if (existing) {
    return res.status(409).json({
      error: 'An account with this institutional email address already exists. Please sign in instead.'
    });
  }

  const userRole: UserRole = 'student';
  const chosenProgram = (program && program.trim()) || 'Pharm.D';
  const userCohort = (cohort && cohort.trim()) || `${chosenProgram} ${new Date().getFullYear()}`;
  const newId = `usr-student-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  const passwordHash = bcrypt.hashSync(password, 10);

  // Insert student user record
  db.prepare(`
    INSERT INTO users (id, email, password_hash, must_change_password, full_name, role, cohort)
    VALUES (?, ?, ?, 0, ?, ?, ?)
  `).run(newId, cleanEmail, passwordHash, fullName.trim(), userRole, userCohort);

  // Auto-assign first available approved training case so student has immediate hands-on case
  try {
    const firstApprovedCase = db.prepare("SELECT id, case_number FROM cases WHERE status = 'approved' ORDER BY case_number ASC LIMIT 1").get() as any;
    if (firstApprovedCase) {
      const asgId = `asg-init-${Date.now()}`;
      const dueDate = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      db.prepare(`
        INSERT INTO assignments (id, case_id, student_id, assigned_by, due_date, instructions, status)
        VALUES (?, ?, ?, 'usr-admin-01', ?, 'Welcome to Arzon PV! Complete your onboarding ICSR scenario: MedDRA coding, Seriousness criteria, Naranjo causality, and CIOMS narrative.', 'assigned')
      `).run(asgId, firstApprovedCase.id, newId, dueDate);
    }
  } catch (err) {
    console.warn('Initial onboarding case auto-assignment notice:', err);
  }

  // 21 CFR Part 11 Audit Trail Logging
  try {
    db.prepare(`
      INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, details)
      VALUES (?, 'USER', ?, 'USER_SELF_REGISTERED', ?, ?)
    `).run(
      `aud-${Date.now()}`,
      newId,
      newId,
      JSON.stringify({
        email: cleanEmail,
        fullName: fullName.trim(),
        role: userRole,
        program: chosenProgram,
        cohort: userCohort,
        registeredAt: new Date().toISOString()
      })
    );
  } catch (err) {
    console.error('Audit log write error:', err);
  }

  const token = signUserToken({
    id: newId,
    email: cleanEmail,
    fullName: fullName.trim(),
    role: userRole,
    cohort: userCohort
  });

  setActiveUserId(newId);

  res.status(201).json({
    success: true,
    message: `Account created successfully. Welcome to Arzon PV Case Intelligence, ${fullName.trim()}!`,
    token,
    user: {
      id: newId,
      email: cleanEmail,
      fullName: fullName.trim(),
      role: userRole,
      cohort: userCohort,
      mustChangePassword: false,
      createdAt: new Date().toISOString()
    }
  });
});

// POST /api/auth/change-password - Force password rotation & policy compliance
authRouter.post('/change-password', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required to rotate password.' });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both currentPassword and newPassword are required.' });
  }

  const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(req.user.id) as any;
  if (!user || !user.password_hash) {
    return res.status(404).json({ error: 'User record not found.' });
  }

  // Verify current password
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(403).json({ error: 'Current password verification failed.' });
  }

  // Password Policy: min 10 chars, uppercase, lowercase, number, symbol
  if (newPassword.length < 10) {
    return res.status(422).json({ error: 'New password must be at least 10 characters in length.' });
  }
  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
    return res.status(422).json({ error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.' });
  }
  if (bcrypt.compareSync(newPassword, user.password_hash)) {
    return res.status(422).json({ error: 'New password cannot be identical to the previous password.' });
  }

  // Hash new password and clear must_change_password flag
  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(newHash, req.user.id);

  // Issue refreshed token
  const refreshedToken = signUserToken(req.user);

  res.json({
    success: true,
    message: 'Password successfully rotated and policy compliance verified.',
    token: refreshedToken
  });
});

// GET /api/auth/me - Get current active user and refreshed token
authRouter.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const userRow = db.prepare('SELECT must_change_password FROM users WHERE id = ?').get(req.user.id) as any;
  const token = signUserToken(req.user);

  res.json({
    user: {
      ...req.user,
      mustChangePassword: Boolean(userRow?.must_change_password)
    },
    token
  });
});

// GET /api/auth/users - List users (Staff & Authenticated Directory)
authRouter.get('/users', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required to access user directory.' });
  }

  // If student queries, only return student colleagues/directory without administrative metadata
  const isStaffUser = req.user.role === 'admin' || req.user.role === 'mentor';
  const query = isStaffUser
    ? `SELECT id, email, full_name as fullName, role, cohort, must_change_password as mustChangePassword, created_at as createdAt FROM users ORDER BY role, full_name`
    : `SELECT id, email, full_name as fullName, role, cohort, created_at as createdAt FROM users WHERE role = 'student' ORDER BY full_name`;

  const users = db.prepare(query).all();
  res.json({ users, activeUserId: req.user.id });
});

// POST /api/auth/switch-user - Super Admin clearance or automated test harness
authRouter.post('/switch-user', (req, res) => {
  const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
  if (!isTest && (!req.user || req.user.role !== 'admin')) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Zero-Trust Gate: User switching requires Super Administrator privileges.'
    });
  }

  const { userId } = req.body;
  const user = db.prepare('SELECT id, email, full_name as fullName, role, cohort, must_change_password as mustChangePassword FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  setActiveUserId(userId);
  const token = signUserToken({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role as UserRole,
    cohort: user.cohort
  });

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      cohort: user.cohort,
      mustChangePassword: Boolean(user.mustChangePassword)
    }
  });
});

// POST /api/auth/users/create - Super Admin User Provisioning Gate
authRouter.post('/users/create', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Hyper-human security gate: Only Super Administrators can provision new user accounts.'
    });
  }

  const { fullName, email, role, cohort, password, mustChangePassword } = req.body;

  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ error: 'Full name is required.' });
  }
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email address is required.' });
  }
  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Invalid email address format.' });
  }
  if (!['student', 'mentor', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Role must be student, mentor, or admin.' });
  }

  // Check duplicate email
  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email address already exists in the system.' });
  }

  // Generate strong password if none provided
  let finalPassword = password;
  if (!finalPassword || finalPassword.trim().length === 0) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    finalPassword = 'Arz#' + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') + '1!';
  }

  // Validate password complexity
  if (finalPassword.length < 10) {
    return res.status(422).json({ error: 'Password must be at least 10 characters in length.' });
  }
  if (!/[A-Z]/.test(finalPassword) || !/[a-z]/.test(finalPassword) || !/[0-9]/.test(finalPassword) || !/[^A-Za-z0-9]/.test(finalPassword)) {
    return res.status(422).json({ error: 'Password must contain uppercase, lowercase, numeric digit, and symbol.' });
  }

  const newId = `usr-${role}-${Date.now().toString().slice(-6)}`;
  const passwordHash = bcrypt.hashSync(finalPassword, 10);
  const forceRotation = mustChangePassword !== false ? 1 : 0;
  const userCohort = (cohort && cohort.trim()) || (role === 'admin' ? 'Leadership' : role === 'mentor' ? 'PV Faculty' : 'General Cohort');

  db.prepare(`
    INSERT INTO users (id, email, password_hash, must_change_password, full_name, role, cohort)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(newId, cleanEmail, passwordHash, forceRotation, fullName.trim(), role, userCohort);

  // 21 CFR Part 11 Audit Trail Logging
  try {
    db.prepare(`
      INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, details)
      VALUES (?, 'USER', ?, 'USER_PROVISIONED', ?, ?)
    `).run(
      `aud-${Date.now()}`,
      newId,
      req.user.id,
      JSON.stringify({
        provisionedBy: req.user.email,
        targetEmail: cleanEmail,
        role,
        cohort: userCohort,
        forcePasswordRotation: Boolean(forceRotation)
      })
    );
  } catch (err) {
    console.error('Audit log write error:', err);
  }

  res.status(201).json({
    success: true,
    message: `Account for ${fullName.trim()} (${cleanEmail}) successfully provisioned.`,
    user: {
      id: newId,
      email: cleanEmail,
      fullName: fullName.trim(),
      role,
      cohort: userCohort,
      mustChangePassword: Boolean(forceRotation),
      createdAt: new Date().toISOString()
    },
    temporaryPassword: finalPassword
  });
});

// POST /api/auth/users/:id/reset-password - Super Admin Password Reset
authRouter.post('/users/:id/reset-password', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Super Admin privileges required.' });
  }
  const { id } = req.params;
  const user = db.prepare('SELECT id, email, full_name, role FROM users WHERE id = ?').get(id) as any;
  if (!user) {
    return res.status(404).json({ error: 'User record not found.' });
  }

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const tempPassword = 'Arz#' + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') + '9!';
  const hash = bcrypt.hashSync(tempPassword, 10);

  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?').run(hash, id);

  try {
    db.prepare(`
      INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, details)
      VALUES (?, 'USER', ?, 'PASSWORD_RESET_ADMIN', ?, ?)
    `).run(
      `aud-${Date.now()}`,
      id,
      req.user.id,
      JSON.stringify({ admin: req.user.email, targetEmail: user.email })
    );
  } catch (err) {
    console.error('Audit log write error:', err);
  }

  res.json({
    success: true,
    message: `Temporary credentials generated for ${user.full_name}.`,
    temporaryPassword: tempPassword
  });
});

// DELETE /api/auth/users/:id - Super Admin User Revocation
authRouter.delete('/users/:id', (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Super Admin privileges required.' });
  }
  const { id } = req.params;
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Security constraint: Cannot revoke your own active administrator account.' });
  }
  const target = db.prepare('SELECT id, email, full_name, role FROM users WHERE id = ?').get(id) as any;
  if (!target) {
    return res.status(404).json({ error: 'User not found.' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);

  try {
    db.prepare(`
      INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, details)
      VALUES (?, 'USER', ?, 'USER_DELETED', ?, ?)
    `).run(
      `aud-${Date.now()}`,
      id,
      req.user.id,
      JSON.stringify({ admin: req.user.email, targetEmail: target.email, role: target.role })
    );
  } catch (err) {
    console.error('Audit log write error:', err);
  }

  res.json({ success: true, message: `Account for ${target.full_name} (${target.email}) revoked.` });
});

// POST /api/auth/logout - Terminate session
authRouter.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Session successfully terminated.' });
});
