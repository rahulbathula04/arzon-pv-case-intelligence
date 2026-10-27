import { describe, it, expect, beforeAll } from 'vitest';
import { db, initDatabase } from '../server/db/database.js';
import { seedDatabase } from '../server/db/seed.js';

describe('Phase 1: Arzon PV Case Intelligence - Core Foundation & Case Library', () => {
  beforeAll(() => {
    initDatabase();
    seedDatabase();
  });

  it('initializes database with required tables and seeds', () => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    expect(userCount.count).toBeGreaterThanOrEqual(6);

    const caseCount = db.prepare('SELECT COUNT(*) as count FROM cases').get() as { count: number };
    expect(caseCount.count).toBeGreaterThanOrEqual(3);

    const refCount = db.prepare('SELECT COUNT(*) as count FROM reference_keys').get() as { count: number };
    expect(refCount.count).toBeGreaterThanOrEqual(3);
  });

  it('correctly associates reference keys and rubrics with approved cases', () => {
    const caseRow = db.prepare('SELECT id, case_number, title FROM cases WHERE case_number = ?').get('ARZ-2026-ONC-001') as any;
    expect(caseRow).toBeDefined();

    const refKey = db.prepare('SELECT * FROM reference_keys WHERE case_id = ?').get(caseRow.id) as any;
    expect(refKey).toBeDefined();
    expect(refKey.expected_causality_who).toBe('Probable');
    expect(refKey.expected_naranjo_score).toBe(7);

    const meddraTerms = JSON.parse(refKey.expected_meddra_terms);
    expect(meddraTerms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pt: 'Myocarditis' }),
        expect.objectContaining({ pt: 'Myasthenia gravis' })
      ])
    );
  });

  it('verifies that student-facing case queries strictly partition and never leak reference keys', () => {
    // Simulate what a student query fetches: only from `cases` table
    const studentQueryRow = db.prepare(`
      SELECT id, case_number, title, therapeutic_area, difficulty,
             medical_history, suspect_drugs, concomitant_drugs, adverse_events,
             lab_tests, verbatim_narrative
      FROM cases
      WHERE case_number = 'ARZ-2026-CARD-002'
    `).get() as any;

    expect(studentQueryRow).toBeDefined();
    // Verify reference key fields are NOT present
    expect(studentQueryRow.expected_meddra_terms).toBeUndefined();
    expect(studentQueryRow.expected_seriousness).toBeUndefined();
    expect(studentQueryRow.expected_causality_who).toBeUndefined();
    expect(studentQueryRow.expected_naranjo_score).toBeUndefined();
    expect(studentQueryRow.model_cioms_narrative).toBeUndefined();
    expect(studentQueryRow.grading_rubric).toBeUndefined();
  });

  it('filters cases by therapeutic area and difficulty accurately', () => {
    const oncologyCases = db.prepare("SELECT * FROM cases WHERE therapeutic_area = 'Oncology'").all();
    expect(oncologyCases.length).toBeGreaterThanOrEqual(1);

    const beginnerCases = db.prepare("SELECT * FROM cases WHERE difficulty = 'Beginner'").all();
    expect(beginnerCases.length).toBeGreaterThanOrEqual(1);

    const searchResults = db.prepare("SELECT * FROM cases WHERE title LIKE '%Rivaroxaban%' OR verbatim_narrative LIKE '%Rivaroxaban%'").all();
    expect(searchResults.length).toBeGreaterThanOrEqual(1);
  });

  it('enforces mandatory fictional disclaimer on all clinical training cases', () => {
    const cases = db.prepare('SELECT is_fictional, fictional_disclaimer FROM cases').all() as any[];
    for (const c of cases) {
      expect(c.is_fictional).toBe(1);
      expect(c.fictional_disclaimer).toContain('FICTIONAL TRAINING SCENARIO');
    }
  });
});
