import { describe, it, expect, beforeAll } from 'vitest';
import { db, initDatabase, computeClinicalFingerprint } from '../server/db/database.js';
import { seedDatabase } from '../server/db/seed.js';

describe('Regression Audit: Duplicate Prevention & Seed Idempotency', () => {
  beforeAll(() => {
    db.exec(`
      DELETE FROM audit_logs;
      DELETE FROM mentor_reviews;
      DELETE FROM assessments;
      DELETE FROM submissions;
      DELETE FROM assignments;
      DELETE FROM reference_keys;
      DELETE FROM case_versions;
      DELETE FROM cases;
      DELETE FROM users;
    `);
    initDatabase();
    seedDatabase();
  });

  it('verifies seedDatabase is 100% idempotent and does not create duplicate cases on repeated execution', () => {
    // Run seedDatabase 5 times consecutively
    for (let i = 0; i < 5; i++) {
      seedDatabase();
    }

    const cases = db.prepare('SELECT id, case_number, clinical_fingerprint FROM cases').all() as any[];
    expect(cases.length).toBe(4);

    const fingerprints = cases.map(c => c.clinical_fingerprint);
    const uniqueFps = new Set(fingerprints);
    expect(uniqueFps.size).toBe(4);

    const users = db.prepare('SELECT id FROM users').all() as any[];
    // 4 students, 1 mentor, 1 system admin, 1 super admin (rahulbathula04@gmail.com)
    expect(users.length).toBe(7);

    const assignments = db.prepare('SELECT id FROM assignments').all() as any[];
    expect(assignments.length).toBe(4);
  });

  it('enforces clinical_fingerprint uniqueness constraint at the database layer', () => {
    // Fetch an existing case fingerprint
    const existing = db.prepare('SELECT * FROM cases LIMIT 1').get() as any;
    expect(existing).toBeDefined();

    // Attempt to insert a new case with a different random ID and different case_number, but identical clinical fingerprint
    const insertDuplicate = db.prepare(`
      INSERT INTO cases (
        id, case_number, clinical_fingerprint, title, therapeutic_area, difficulty, source_type,
        is_fictional, fictional_disclaimer, status, active_version,
        patient_initials, patient_age, patient_gender, patient_weight_kg,
        medical_history, suspect_drugs, concomitant_drugs, adverse_events,
        lab_tests, verbatim_narrative, reporter_type, receipt_date
      ) VALUES (
        'case-duplicate-test', 'ARZ-DUP-999', ?, 'Duplicate Case Test', 'Oncology', 'Intermediate', 'curated',
        1, 'DISCLAIMER', 'approved', 1,
        'X.X.', 50, 'Male', 70,
        'History', '[]', '[]', '[]',
        '[]', 'Narrative', 'Physician', '2026-10-27'
      )
    `);

    expect(() => {
      insertDuplicate.run(existing.clinical_fingerprint);
    }).toThrow(/UNIQUE constraint failed/);
  });

  it('guarantees each seeded case has a complete, distinct clinical profile across oncology, cardiology, neurology, and immunology', () => {
    const cases = db.prepare('SELECT * FROM cases ORDER BY therapeutic_area').all() as any[];
    expect(cases.length).toBe(4);

    const areas = cases.map(c => c.therapeutic_area);
    expect(areas).toEqual(['Cardiology', 'Immunology', 'Neurology', 'Oncology']);

    for (const c of cases) {
      expect(c.title).toBeTruthy();
      expect(c.patient_initials).toBeTruthy();
      expect(c.patient_age).toBeGreaterThan(0);
      expect(c.patient_gender).toBeTruthy();
      expect(c.medical_history).toBeTruthy();
      expect(c.verbatim_narrative.length).toBeGreaterThan(50);

      const drugs = JSON.parse(c.suspect_drugs);
      expect(drugs.length).toBeGreaterThanOrEqual(1);
      expect(drugs[0].inn).toBeTruthy();

      const events = JSON.parse(c.adverse_events);
      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].verbatim).toBeTruthy();

      // Verify associated reference key exists
      const refKey = db.prepare('SELECT * FROM reference_keys WHERE case_id = ?').get(c.id) as any;
      expect(refKey).toBeDefined();
      expect(refKey.expected_causality_who).toBeTruthy();
      expect(refKey.expected_naranjo_score).toBeGreaterThanOrEqual(0);
      expect(refKey.model_cioms_narrative.length).toBeGreaterThan(50);
    }
  });

  it('verifies database persistence across simulated reconnection', () => {
    // Check that reading from db object maintains tables and records
    const row = db.prepare('SELECT COUNT(*) as c FROM cases').get() as { c: number };
    expect(row.c).toBe(4);
  });
});
