import { describe, it, expect, beforeAll } from 'vitest';
import { db, initDatabase } from '../server/db/database.js';
import { seedDatabase } from '../server/db/seed.js';

describe('Phase 3: Student Assignment Engine & PV Workbench Submissions', () => {
  beforeAll(() => {
    initDatabase();
    seedDatabase();
  });

  const studentId = 'usr-student-01';
  const caseId = 'case-2026-onc-001';
  const asgId = `test-asg-${Date.now()}`;
  const subId = `test-sub-${Date.now()}`;

  it('creates an assignment and links to student profile with deadline', () => {
    const dueDate = new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 19).replace('T', ' ');

    db.prepare(`
      INSERT INTO assignments (id, case_id, student_id, assigned_by, due_date, instructions, status)
      VALUES (?, ?, ?, 'usr-mentor-01', ?, 'Perform complete ICSR coding and narrative review', 'assigned')
    `).run(asgId, caseId, studentId, dueDate);

    const asg = db.prepare('SELECT * FROM assignments WHERE id = ?').get(asgId) as any;
    expect(asg).toBeDefined();
    expect(asg.case_id).toBe(caseId);
    expect(asg.student_id).toBe(studentId);
    expect(asg.status).toBe('assigned');
  });

  it('saves and updates a student working draft in the PV Workbench', () => {
    // 1. Initial draft creation
    db.prepare(`
      INSERT INTO submissions (
        id, assignment_id, student_id, case_id, version,
        meddra_coding, seriousness_criteria, causality_who,
        causality_naranjo, causality_rationale, cioms_narrative,
        status
      ) VALUES (
        ?, ?, ?, ?, 1,
        ?, ?, ?,
        ?, ?, ?,
        'draft'
      )
    `).run(
      subId, asgId, studentId, caseId,
      JSON.stringify([{ verbatim: 'acute heart inflammation', pt: 'Myocarditis', soc: 'Cardiac disorders' }]),
      JSON.stringify({ isSerious: true, criteria: { hospitalization: true, lifeThreatening: true } }),
      'Probable',
      JSON.stringify({ answers: { q1: 1, q2: 2 }, totalScore: 7, interpretation: 'Probable' }),
      'Reasonable latency and positive dechallenge with high-dose pulse steroids.',
      'This spontaneous report describes a 62-year-old male who developed acute myocarditis...'
    );

    // Update assignment to in_progress
    db.prepare("UPDATE assignments SET status = 'in_progress' WHERE id = ?").run(asgId);

    const draft = db.prepare('SELECT * FROM submissions WHERE id = ?').get(subId) as any;
    expect(draft).toBeDefined();
    expect(draft.status).toBe('draft');
    expect(JSON.parse(draft.meddra_coding)[0].pt).toBe('Myocarditis');

    const asg = db.prepare('SELECT status FROM assignments WHERE id = ?').get(asgId) as any;
    expect(asg.status).toBe('in_progress');
  });

  it('locks final submission and records submitted_at timestamp', () => {
    db.prepare(`
      UPDATE submissions SET
        status = 'submitted',
        submitted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(subId);

    db.prepare("UPDATE assignments SET status = 'submitted' WHERE id = ?").run(asgId);

    const sub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(subId) as any;
    expect(sub.status).toBe('submitted');
    expect(sub.submitted_at).not.toBeNull();

    const asg = db.prepare('SELECT status FROM assignments WHERE id = ?').get(asgId) as any;
    expect(asg.status).toBe('submitted');
  });

  it('accurately identifies overdue assignments', () => {
    const overdueAsgId = `asg-overdue-${Date.now()}`;
    const pastDueDate = '2026-01-01 12:00:00';

    db.prepare(`
      INSERT INTO assignments (id, case_id, student_id, assigned_by, due_date, instructions, status)
      VALUES (?, ?, ?, 'usr-mentor-01', ?, 'Overdue assignment test', 'assigned')
    `).run(overdueAsgId, caseId, studentId, pastDueDate);

    // Fetch and compute status like the backend endpoint
    const row = db.prepare('SELECT * FROM assignments WHERE id = ?').get(overdueAsgId) as any;
    const due = new Date(row.due_date);
    const now = new Date();
    const computedStatus = (row.status !== 'completed' && row.status !== 'submitted' && due < now) ? 'overdue' : row.status;

    expect(computedStatus).toBe('overdue');
  });
});
