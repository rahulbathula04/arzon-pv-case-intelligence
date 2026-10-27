import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store database file in project root or data directory
const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'arzon_pv.sqlite');
export const db = new Database(dbPath);

// Enable WAL mode and foreign keys for high performance and integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'mentor', 'student')),
      cohort TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Cases table (public/student-facing metadata and clinical intake details)
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      case_number TEXT UNIQUE NOT NULL,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

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
}
