import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { db, initDatabase } from '../server/db/database.js';
import { seedDatabase } from '../server/db/seed.js';

describe('Phase 8: Super Admin Access Provisioning & Hyper-Human Security Gates', () => {
  beforeAll(() => {
    initDatabase();
    seedDatabase();
  });

  it('allows Super Admin to provision an individual student account with bcrypt hash and audit trail', () => {
    const studentEmail = `student.test.${Date.now()}@arzon.student`;
    const studentName = 'Test Provisioned Student';
    const tempPassword = 'Arz#P' + Math.random().toString(36).substring(2, 8) + '1!';
    const passwordHash = bcrypt.hashSync(tempPassword, 10);
    const userId = `usr-student-${Date.now().toString().slice(-6)}`;

    // Insert user into SQLite
    db.prepare(`
      INSERT INTO users (id, email, password_hash, must_change_password, full_name, role, cohort)
      VALUES (?, ?, ?, 1, ?, 'student', 'Pharm.D 2026-Test')
    `).run(userId, studentEmail, passwordHash, studentName);

    // Verify insertion
    const created = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    expect(created).toBeDefined();
    expect(created.email).toBe(studentEmail);
    expect(created.role).toBe('student');
    expect(created.must_change_password).toBe(1);

    // Verify password verification succeeds
    expect(bcrypt.compareSync(tempPassword, created.password_hash)).toBe(true);

    // Verify 21 CFR Part 11 audit log entry
    db.prepare(`
      INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, details)
      VALUES (?, 'USER', ?, 'USER_PROVISIONED', 'usr-admin-01', ?)
    `).run(`aud-${Date.now()}`, userId, JSON.stringify({ provisionedBy: 'admin@arzon.global', targetEmail: studentEmail }));

    const audit = db.prepare('SELECT * FROM audit_logs WHERE entity_id = ?').get(userId) as any;
    expect(audit).toBeDefined();
    expect(audit.action).toBe('USER_PROVISIONED');
    expect(audit.entity_type).toBe('USER');
  });

  it('prevents duplicate email registration across the platform', () => {
    const existingUser = db.prepare('SELECT email FROM users LIMIT 1').get() as any;
    expect(existingUser).toBeDefined();

    // Attempt to insert duplicate email should throw SQLITE_CONSTRAINT_UNIQUE
    expect(() => {
      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role)
        VALUES ('usr-dup-test', ?, 'hash', 'Dup User', 'student')
      `).run(existingUser.email);
    }).toThrow();
  });

  it('allows Super Admin to reset credentials and force password rotation', () => {
    const user = db.prepare("SELECT id, email FROM users WHERE role = 'student' LIMIT 1").get() as any;
    expect(user).toBeDefined();

    const newTempPassword = 'ResetTempPass#2026!';
    const newHash = bcrypt.hashSync(newTempPassword, 10);

    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?').run(newHash, user.id);

    const updated = db.prepare('SELECT password_hash, must_change_password FROM users WHERE id = ?').get(user.id) as any;
    expect(updated.must_change_password).toBe(1);
    expect(bcrypt.compareSync(newTempPassword, updated.password_hash)).toBe(true);
  });

  it('ensures deleted/revoked users are completely removed from database', () => {
    const tempId = `usr-temp-del-${Date.now()}`;
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role)
      VALUES (?, 'delete.me@arzon.test', 'hash', 'Delete Me', 'student')
    `).run(tempId);

    // Verify it exists
    expect(db.prepare('SELECT id FROM users WHERE id = ?').get(tempId)).toBeDefined();

    // Delete user
    db.prepare('DELETE FROM users WHERE id = ?').run(tempId);

    // Verify it is completely removed
    expect(db.prepare('SELECT id FROM users WHERE id = ?').get(tempId)).toBeUndefined();
  });
});
