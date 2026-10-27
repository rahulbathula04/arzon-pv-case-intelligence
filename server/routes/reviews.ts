import { Router } from 'express';
import { db } from '../db/database.js';
import { requireRole } from '../middleware/auth.js';

export const reviewsRouter = Router();

// GET /api/reviews/pending - List submissions awaiting review (Staff only)
reviewsRouter.get('/pending', requireRole(['admin', 'mentor']), (req, res) => {
  const query = `
    SELECT s.id as submissionId, s.assignment_id as assignmentId, s.student_id as studentId,
           s.case_id as caseId, s.version, s.status as submissionStatus, s.submitted_at as submittedAt,
           s.meddra_coding as meddraCoding, s.seriousness_criteria as seriousnessCriteria,
           s.causality_who as causalityWho, s.causality_naranjo as causalityNaranjo,
           s.causality_rationale as causalityRationale, s.cioms_narrative as ciomsNarrative,
           u.full_name as studentName, u.email as studentEmail, u.cohort as studentCohort,
           c.case_number as caseNumber, c.title as caseTitle, c.therapeutic_area as therapeuticArea,
           r.expected_meddra_terms as expectedMeddraTerms,
           r.expected_seriousness as expectedSeriousness,
           r.expected_causality_who as expectedCausalityWho,
           r.expected_naranjo_score as expectedNaranjoScore,
           r.model_cioms_narrative as modelCiomsNarrative,
           r.grading_rubric as gradingRubric,
           a.id as assessmentId, a.total_score as aiTotalScore,
           a.meddra_score as aiMeddraScore, a.seriousness_score as aiSeriousnessScore,
           a.causality_score as aiCausalityScore, a.narrative_score as aiNarrativeScore,
           a.score_breakdown as aiScoreBreakdown, a.omissions as aiOmissions,
           a.errors as aiErrors, a.strengths as aiStrengths, a.ai_rationale as aiRationale,
           a.status as assessmentStatus
    FROM submissions s
    JOIN users u ON s.student_id = u.id
    JOIN cases c ON s.case_id = c.id
    LEFT JOIN reference_keys r ON c.id = r.case_id
    LEFT JOIN assessments a ON s.id = a.submission_id
    ORDER BY s.submitted_at DESC
  `;

  const rows = db.prepare(query).all() as any[];

  const submissions = rows.map(r => ({
    submissionId: r.submissionId,
    assignmentId: r.assignmentId,
    studentId: r.studentId,
    studentName: r.studentName,
    studentEmail: r.studentEmail,
    studentCohort: r.studentCohort,
    caseId: r.caseId,
    caseNumber: r.caseNumber,
    caseTitle: r.caseTitle,
    therapeuticArea: r.therapeuticArea,
    version: r.version,
    submissionStatus: r.submissionStatus,
    submittedAt: r.submittedAt,
    studentWork: {
      meddraCoding: JSON.parse(r.meddraCoding || '[]'),
      seriousnessCriteria: JSON.parse(r.seriousnessCriteria || '{}'),
      causalityWho: r.causalityWho,
      causalityNaranjo: JSON.parse(r.causalityNaranjo || '{}'),
      causalityRationale: r.causalityRationale,
      ciomsNarrative: r.ciomsNarrative
    },
    referenceStandard: {
      expectedMeddraTerms: JSON.parse(r.expectedMeddraTerms || '[]'),
      expectedSeriousness: JSON.parse(r.expectedSeriousness || '{}'),
      expectedCausalityWho: r.expectedCausalityWho,
      expectedNaranjoScore: r.expectedNaranjoScore,
      modelCiomsNarrative: r.modelCiomsNarrative,
      gradingRubric: JSON.parse(r.gradingRubric || '{}')
    },
    aiAssessment: r.assessmentId ? {
      assessmentId: r.assessmentId,
      totalScore: r.aiTotalScore,
      meddraScore: r.aiMeddraScore,
      seriousnessScore: r.aiSeriousnessScore,
      causalityScore: r.aiCausalityScore,
      narrativeScore: r.aiNarrativeScore,
      scoreBreakdown: JSON.parse(r.aiScoreBreakdown || '{}'),
      omissions: JSON.parse(r.aiOmissions || '[]'),
      errors: JSON.parse(r.aiErrors || '[]'),
      strengths: JSON.parse(r.aiStrengths || '[]'),
      aiRationale: r.aiRationale,
      status: r.assessmentStatus
    } : null
  }));

  res.json({ submissions });
});

// POST /api/reviews/submit - Mentor submits evaluation decision
reviewsRouter.post('/submit', requireRole(['admin', 'mentor']), (req, res) => {
  const {
    submissionId,
    assessmentId,
    adjustedTotalScore,
    mentorComments,
    itemOverrides,
    decision // 'approved' | 'revision_requested'
  } = req.body;

  if (!submissionId || !decision) {
    return res.status(400).json({ error: 'Missing submissionId or decision' });
  }

  const mentorId = req.user?.id || 'usr-mentor-01';
  const reviewId = `rev-${Date.now()}`;

  // 1. Insert mentor review record
  db.prepare(`
    INSERT INTO mentor_reviews (
      id, assessment_id, submission_id, mentor_id,
      adjusted_total_score, mentor_comments, item_overrides,
      decision
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    reviewId, assessmentId || null, submissionId, mentorId,
    Number(adjustedTotalScore) || 85, mentorComments || 'Good work.',
    JSON.stringify(itemOverrides || {}), decision
  );

  // 2. Handle approval or revision requested
  const sub = db.prepare('SELECT assignment_id FROM submissions WHERE id = ?').get(submissionId) as any;

  if (decision === 'approved') {
    // Finalize assessment
    if (assessmentId) {
      db.prepare("UPDATE assessments SET status = 'finalized', total_score = ? WHERE id = ?").run(Number(adjustedTotalScore) || 85, assessmentId);
    }
    // Update assignment to completed
    if (sub?.assignment_id) {
      db.prepare("UPDATE assignments SET status = 'completed' WHERE id = ?").run(sub.assignment_id);
    }
  } else if (decision === 'revision_requested') {
    // Return submission to draft status for rework
    db.prepare("UPDATE submissions SET status = 'draft' WHERE id = ?").run(submissionId);
    if (sub?.assignment_id) {
      db.prepare("UPDATE assignments SET status = 'in_progress' WHERE id = ?").run(sub.assignment_id);
    }
  }

  // 3. Audit log
  db.prepare(`
    INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, details)
    VALUES (?, 'review', ?, 'MENTOR_REVIEW_SUBMIT', ?, ?)
  `).run(`log-${Date.now()}`, submissionId, mentorId, `Mentor recorded decision ${decision} with adjusted score ${adjustedTotalScore}%`);

  res.json({
    success: true,
    message: `Mentor review recorded successfully: ${decision.replace('_', ' ').toUpperCase()}.`,
    reviewId,
    decision
  });
});
