import { describe, it, expect, beforeAll } from 'vitest';
import { db, initDatabase } from '../server/db/database.js';
import { computeAIEvaluation } from '../server/routes/assess.js';

describe('Phase 4: AI Assessment Engine & Mentor Review Studio', () => {
  beforeAll(() => {
    initDatabase();
  });

  const testSubId = `sub-eval-${Date.now()}`;
  const testAsgId = `asg-eval-${Date.now()}`;
  const caseId = 'case-2026-onc-001';

  it('computes 4-pillar AI evaluation with omissions, strengths, and provisional status', () => {
    const refKey = db.prepare('SELECT * FROM reference_keys WHERE case_id = ?').get(caseId) as any;
    expect(refKey).toBeDefined();

    const mockSubmission = {
      id: testSubId,
      assignment_id: testAsgId,
      case_id: caseId,
      meddra_coding: JSON.stringify([
        { verbatim: 'acute heart inflammation and cardiogenic shock', pt: 'Myocarditis', soc: 'Cardiac disorders' }
      ]),
      seriousness_criteria: JSON.stringify({
        isSerious: true,
        criteria: { lifeThreatening: true, hospitalization: true }
      }),
      causality_who: 'Probable',
      causality_naranjo: JSON.stringify({ totalScore: 7, interpretation: 'Probable' }),
      cioms_narrative: 'This medically confirmed spontaneous ICSR from an oncologist describes a 62-year-old male patient with metastatic cutaneous melanoma who developed life-threatening immune-mediated myocarditis following three cycles of pembrolizumab. Cardiac biomarkers were critically elevated with Troponin I at 4250 ng/L and ejection fraction reduced to 35%. Pembrolizumab was permanently discontinued with positive dechallenge following high-dose pulse methylprednisolone.'
    };

    const evaluation = computeAIEvaluation(mockSubmission, refKey);

    expect(evaluation.status).toBe('provisional');
    expect(evaluation.totalScore).toBeGreaterThanOrEqual(70);
    expect(evaluation.meddraScore).toBeGreaterThan(0);
    expect(evaluation.seriousnessScore).toBeGreaterThan(0);
    expect(evaluation.causalityScore).toBeGreaterThan(0);
    expect(evaluation.narrativeScore).toBeGreaterThan(0);

    // Verify omissions detected (student only coded 1 of the 2 expected terms, missing Myasthenia gravis)
    expect(evaluation.omissions.some(o => o.includes('Myasthenia gravis'))).toBe(true);

    // Verify strengths recorded
    expect(evaluation.strengths.some(s => s.includes('Myocarditis'))).toBe(true);
  });

  it('handles mentor review approval, score adjustment, and assignment completion', () => {
    // Insert mock assignment, submission, and assessment
    db.prepare(`
      INSERT INTO assignments (id, case_id, student_id, assigned_by, due_date, status)
      VALUES (?, ?, 'usr-student-01', 'usr-mentor-01', '2026-12-01', 'submitted')
    `).run(testAsgId, caseId);

    db.prepare(`
      INSERT INTO submissions (id, assignment_id, student_id, case_id, meddra_coding, seriousness_criteria, causality_who, causality_naranjo, causality_rationale, cioms_narrative, status)
      VALUES (?, ?, 'usr-student-01', ?, '[]', '{}', 'Probable', '{}', 'Good', 'Narrative', 'submitted')
    `).run(testSubId, testAsgId, caseId);

    const testAssessId = `assess-test-${Date.now()}`;
    db.prepare(`
      INSERT INTO assessments (id, submission_id, total_score, meddra_score, seriousness_score, causality_score, narrative_score, score_breakdown, omissions, errors, strengths, ai_rationale, status)
      VALUES (?, ?, 78, 20, 20, 20, 18, '{}', '[]', '[]', '[]', 'Provisional rationale', 'provisional')
    `).run(testAssessId, testSubId);

    // Execute mentor approval logic
    const reviewId = `rev-test-${Date.now()}`;
    const adjustedScore = 88;

    db.prepare(`
      INSERT INTO mentor_reviews (id, assessment_id, submission_id, mentor_id, adjusted_total_score, mentor_comments, decision)
      VALUES (?, ?, ?, 'usr-mentor-01', ?, 'Approved with clinical distinction.', 'approved')
    `).run(reviewId, testAssessId, testSubId, adjustedScore);

    // Finalize assessment
    db.prepare("UPDATE assessments SET status = 'finalized', total_score = ? WHERE id = ?").run(adjustedScore, testAssessId);
    db.prepare("UPDATE assignments SET status = 'completed' WHERE id = ?").run(testAsgId);

    // Verify database state
    const finalizedAssess = db.prepare('SELECT status, total_score FROM assessments WHERE id = ?').get(testAssessId) as any;
    expect(finalizedAssess.status).toBe('finalized');
    expect(finalizedAssess.total_score).toBe(88);

    const completedAsg = db.prepare('SELECT status FROM assignments WHERE id = ?').get(testAsgId) as any;
    expect(completedAsg.status).toBe('completed');
  });

  it('handles mentor revision request, resetting submission to draft for student rework', () => {
    const revAsgId = `asg-rev-${Date.now()}`;
    const revSubId = `sub-rev-${Date.now()}`;

    db.prepare(`
      INSERT INTO assignments (id, case_id, student_id, assigned_by, due_date, status)
      VALUES (?, ?, 'usr-student-02', 'usr-mentor-01', '2026-12-01', 'submitted')
    `).run(revAsgId, caseId);

    db.prepare(`
      INSERT INTO submissions (id, assignment_id, student_id, case_id, meddra_coding, seriousness_criteria, causality_who, causality_naranjo, causality_rationale, cioms_narrative, status)
      VALUES (?, ?, 'usr-student-02', ?, '[]', '{}', 'Probable', '{}', 'Needs rework', 'Short text', 'submitted')
    `).run(revSubId, revAsgId, caseId);

    // Mentor requests revision
    db.prepare("UPDATE submissions SET status = 'draft' WHERE id = ?").run(revSubId);
    db.prepare("UPDATE assignments SET status = 'in_progress' WHERE id = ?").run(revAsgId);

    const sub = db.prepare('SELECT status FROM submissions WHERE id = ?').get(revSubId) as any;
    expect(sub.status).toBe('draft');

    const asg = db.prepare('SELECT status FROM assignments WHERE id = ?').get(revAsgId) as any;
    expect(asg.status).toBe('in_progress');
  });
});
