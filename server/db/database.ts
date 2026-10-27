import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

// Store database file in project root or data directory
export const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Separate test database from production database to prevent test pollution
export const dbPath = process.env.DATABASE_PATH || 
  (isTestEnv ? path.join(dataDir, 'test_arzon_pv.sqlite') : path.join(dataDir, 'arzon_pv.sqlite'));

export const db = new Database(dbPath);

// Enable WAL mode, busy timeout, and foreign keys for high-concurrency throughput and integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 10000');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000');
db.pragma('temp_store = MEMORY');

// Normalizes and computes a clinical content fingerprint to detect duplicate clinical cases
export function computeClinicalFingerprint(data: {
  title?: string;
  therapeuticArea?: string;
  patientInitials?: string;
  patientAge?: number;
  patientGender?: string;
  suspectDrugs?: any[];
  adverseEvents?: any[];
}): string {
  const normTitle = (data.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const area = (data.therapeuticArea || '').toLowerCase().trim();
  const patient = [data.patientInitials || '', data.patientAge || '', data.patientGender || ''].join(':').toLowerCase();
  
  const drugs = (Array.isArray(data.suspectDrugs) ? data.suspectDrugs : [])
    .map((d: any) => (d.inn || d.name || '').toLowerCase().trim())
    .sort()
    .join(',');

  const events = (Array.isArray(data.adverseEvents) ? data.adverseEvents : [])
    .map((e: any) => (e.verbatim || e.meddraPt || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
    .sort()
    .join(',');

  return `${normTitle}|${area}|${patient}|${drugs}|${events}`;
}

export function initDatabase() {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      must_change_password INTEGER DEFAULT 0,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'mentor', 'student')),
      cohort TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Cases table (public/student-facing metadata and clinical intake details)
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      case_number TEXT UNIQUE NOT NULL,
      clinical_fingerprint TEXT UNIQUE,
      title TEXT NOT NULL,
      therapeutic_area TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK(difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
      source_type TEXT NOT NULL CHECK(source_type IN ('ai_generated', 'pdf_imported', 'curated')),
      is_fictional INTEGER NOT NULL DEFAULT 1,
      fictional_disclaimer TEXT NOT NULL DEFAULT 'CONTROLLED FICTIONAL TRAINING SCENARIO · NOT REAL PATIENT DATA',
      status TEXT NOT NULL CHECK(status IN ('draft', 'approved', 'archived')),
      active_version INTEGER NOT NULL DEFAULT 1,
      patient_initials TEXT NOT NULL,
      patient_age INTEGER NOT NULL,
      patient_gender TEXT NOT NULL,
      patient_weight_kg REAL,
      medical_history TEXT NOT NULL,
      suspect_drugs TEXT NOT NULL,       -- JSON array
      concomitant_drugs TEXT NOT NULL,   -- JSON array
      adverse_events TEXT NOT NULL,      -- JSON array
      lab_tests TEXT NOT NULL,           -- JSON array
      verbatim_narrative TEXT NOT NULL,
      reporter_type TEXT NOT NULL,
      receipt_date TEXT NOT NULL,
      generation_metadata TEXT,          -- JSON object (provider, model, timing, isFallback, promptVersion)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Ensure unique index exists on clinical_fingerprint
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cases_clinical_fingerprint ON cases(clinical_fingerprint);

    -- Case Versions table
    CREATE TABLE IF NOT EXISTS case_versions (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      changelog TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    -- Reference Keys table (RESTRICTED: Never exposed to students!)
    CREATE TABLE IF NOT EXISTS reference_keys (
      case_id TEXT PRIMARY KEY,
      expected_meddra_terms TEXT NOT NULL,      -- JSON array
      expected_seriousness TEXT NOT NULL,       -- JSON object
      expected_causality_who TEXT NOT NULL,
      expected_naranjo_score INTEGER NOT NULL,
      expected_naranjo_breakdown TEXT NOT NULL,  -- JSON object
      model_cioms_narrative TEXT NOT NULL,
      grading_rubric TEXT NOT NULL,             -- JSON object
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    -- Assignments table
    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      assigned_by TEXT NOT NULL,
      due_date TEXT NOT NULL,
      instructions TEXT,
      status TEXT NOT NULL CHECK(status IN ('assigned', 'in_progress', 'submitted', 'completed', 'overdue')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Submissions table
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      assignment_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      case_id TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      meddra_coding TEXT NOT NULL,         -- JSON array
      seriousness_criteria TEXT NOT NULL,  -- JSON object
      causality_who TEXT NOT NULL,
      causality_naranjo TEXT NOT NULL,     -- JSON object
      causality_rationale TEXT NOT NULL,
      cioms_narrative TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('draft', 'submitted')),
      submitted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    -- Assessments table (AI evaluation)
    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      submission_id TEXT UNIQUE NOT NULL,
      total_score REAL NOT NULL,
      meddra_score REAL NOT NULL,
      seriousness_score REAL NOT NULL,
      causality_score REAL NOT NULL,
      narrative_score REAL NOT NULL,
      score_breakdown TEXT NOT NULL,  -- JSON object
      omissions TEXT NOT NULL,        -- JSON array
      errors TEXT NOT NULL,           -- JSON array
      strengths TEXT NOT NULL,        -- JSON array
      ai_rationale TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('provisional', 'finalized')) DEFAULT 'provisional',
      evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
    );

    -- Mentor Reviews table
    CREATE TABLE IF NOT EXISTS mentor_reviews (
      id TEXT PRIMARY KEY,
      assessment_id TEXT NOT NULL,
      submission_id TEXT NOT NULL,
      mentor_id TEXT NOT NULL,
      adjusted_total_score REAL NOT NULL,
      mentor_comments TEXT NOT NULL,
      item_overrides TEXT,            -- JSON object
      decision TEXT NOT NULL CHECK(decision IN ('approved', 'revision_requested')),
      reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Audit Logs table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      user_id TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- System Settings table
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migration: Ensure clinical_fingerprint, password_hash, and generation_metadata exist
  try {
    db.exec('ALTER TABLE cases ADD COLUMN clinical_fingerprint TEXT;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_cases_clinical_fingerprint ON cases(clinical_fingerprint);');
  } catch {
    // Index already exists
  }
  try {
    db.exec('ALTER TABLE users ADD COLUMN password_hash TEXT;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0;');
  } catch {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE cases ADD COLUMN generation_metadata TEXT;');
  } catch {
    // Column already exists
  }

  // Performance Indexes for 10,000+ Concurrent Students and Assignments
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_assignments_student ON assignments(student_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_case ON assignments(case_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
      CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
      CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_case ON submissions(case_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
      CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
      CREATE INDEX IF NOT EXISTS idx_assessments_submission ON assessments(submission_id);
      CREATE INDEX IF NOT EXISTS idx_mentor_reviews_submission ON mentor_reviews(submission_id);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_cohort ON users(cohort);
      CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
      CREATE INDEX IF NOT EXISTS idx_cases_area ON cases(therapeutic_area);
      CREATE INDEX IF NOT EXISTS idx_cases_difficulty ON cases(difficulty);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
    `);
  } catch (err) {
    console.error('Failed to create performance indexes:', err);
  }
}
