import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../data/arzon_pv.sqlite');
console.log('Connecting to database:', dbPath);
const db = new Database(dbPath);

const email = 'rahulbathula04@gmail.com';
const rawPassword = 'Arzon@123';
const hash = bcrypt.hashSync(rawPassword, 10);
const id = 'usr-admin-rahul';
const fullName = 'Rahul Bathula';
const role = 'admin';
const cohort = 'Super Administrator';

// Delete any existing user with this email or ID to avoid collisions
db.prepare('DELETE FROM users WHERE LOWER(email) = ? OR id = ?').run(email.toLowerCase(), id);

// Insert as Super Admin
db.prepare(`
  INSERT INTO users (id, email, password_hash, must_change_password, full_name, role, cohort)
  VALUES (?, ?, ?, 0, ?, ?, ?)
`).run(id, email.toLowerCase(), hash, fullName, role, cohort);

console.log('Verifying user in database:');
const user = db.prepare('SELECT id, email, full_name, role, cohort, must_change_password FROM users WHERE email = ?').get(email.toLowerCase());
console.log('User created:', user);

const isMatch = bcrypt.compareSync(rawPassword, hash);
console.log('Password verification check:', isMatch ? 'PASSED (Arzon@123 verified)' : 'FAILED');
process.exit(0);
