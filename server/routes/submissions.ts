import { Router } from 'express';
import { db } from '../db/database.js';
import { isStaff } from '../middleware/auth.js';
import { computeAIEvaluation } from './assess.js';
import { StudentSubmission } from '../../src/types/index.js';

export const submissionsRouter = Router();

// GET /api/submissions/assignment/:assignmentId - Get current submission / draft with resource check
submissionsRouter.get('/assignment/:assignmentId', (req, res) => {
  const { assignmentId } = req.params;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Verify assignment existence and student authorization
  const assignment = db.prepare('SELECT id, student_id FROM assignments WHERE id = ?').get(assignmentId) as any;
  if (!assignment) {
    return res.json({ submission: null });
  }

  if (user.role === 'student' && assignment.student_id !== user.id) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied: You are not authorized to inspect another student\'s assignment.'
    });
  }

  let query = 'SELECT * FROM submissions WHERE assignment_id = ?';
  const params: any[] = [assignmentId];

  if (user.role === 'student') {
    query += ' AND student_id = ?';
    params.push(user.id);
  }

  const row = db.prepare(query).get(...params) as any;
  if (!row) {
    return res.json({ submission: null });
  }

  const submission: StudentSubmission = {
    id: row.id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    caseId: row.case_id,
    version: row.version,
    meddraCoding: JSON.parse(row.meddra_coding || '[]'),
    seriousnessCriteria: JSON.parse(row.seriousness_criteria || '{}'),
    causalityWho: row.causality_who,
    causalityNaranjo: JSON.parse(row.causality_naranjo || '{}'),
    causalityRationale: row.causality_rationale,
    ciomsNarrative: row.cioms_narrative,
    status: row.status,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  res.json({ submission });
});

// GET /api/submissions/case/:caseId - Get submission by case ID for current student
submissionsRouter.get('/case/:caseId', (req, res) => {
  const { caseId } = req.params;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const studentId = user.id;
  const row = db.prepare('SELECT * FROM submissions WHERE case_id = ? AND student_id = ? ORDER BY created_at DESC LIMIT 1').get(caseId, studentId) as any;
  if (!row) {
    return res.json({ submission: null });
  }

  const submission: StudentSubmission = {
    id: row.id,
    assignmentId: row.assignment_id,
    studentId: row.student_id,
    caseId: row.case_id,
    version: row.version,
    meddraCoding: JSON.parse(row.meddra_coding || '[]'),
    seriousnessCriteria: JSON.parse(row.seriousness_criteria || '{}'),
    causalityWho: row.causality_who,
    causalityNaranjo: JSON.parse(row.causality_naranjo || '{}'),
    causalityRationale: row.causality_rationale,
    ciomsNarrative: row.cioms_narrative,
    status: row.status,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  res.json({ submission });
});

// POST /api/submissions/draft - Save student working draft with resource verification & practice auto-link
submissionsRouter.post('/draft', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required to save submission drafts.' });
  }

  const {
    assignmentId, caseId, meddraCoding, seriousnessCriteria,
    causalityWho, causalityNaranjo, causalityRationale, ciomsNarrative
  } = req.body;

  let targetAssignmentId = assignmentId;
  let assignment = db.prepare('SELECT id, student_id FROM assignments WHERE id = ?').get(targetAssignmentId) as any;

  // If practicing directly or assignment id not found, look up or create self-directed practice assignment
  if (!assignment) {
    const existingAsg = db.prepare('SELECT id, student_id FROM assignments WHERE case_id = ? AND student_id = ?').get(caseId, req.user.id) as any;
    if (existingAsg) {
      assignment = existingAsg;
      targetAssignmentId = existingAsg.id;
    } else {
      targetAssignmentId = `asg-prac-${Date.now()}`;
      const dueDate = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      db.prepare(`
        INSERT INTO assignments (id, case_id, student_id, assigned_by, due_date, instructions, status)
        VALUES (?, ?, ?, ?, ?, 'Self-directed PV training practice assignment', 'in_progress')
      `).run(targetAssignmentId, caseId, req.user.id, req.user.id, dueDate);
      assignment = { id: targetAssignmentId, student_id: req.user.id };
    }
  }

  if (req.user.role === 'student' && assignment.student_id !== req.user.id) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied: You cannot save draft submissions for an assignment allocated to another student.'
    });
  }

  const studentId = req.user.id;

  // Check if draft already exists
  const existing = db.prepare('SELECT id, version FROM submissions WHERE assignment_id = ? AND student_id = ?').get(targetAssignmentId, studentId) as any;

  if (existing) {
    db.prepare(`
      UPDATE submissions SET
        meddra_coding = ?,
        seriousness_criteria = ?,
        causality_who = ?,
        causality_naranjo = ?,
        causality_rationale = ?,
        cioms_narrative = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      JSON.stringify(meddraCoding || []),
      JSON.stringify(seriousnessCriteria || {}),
      causalityWho || 'Possible',
      JSON.stringify(causalityNaranjo || {}),
      causalityRationale || '',
      ciomsNarrative || '',
      existing.id
    );

    db.prepare("UPDATE assignments SET status = 'in_progress' WHERE id = ? AND status = 'assigned'").run(targetAssignmentId);

    return res.json({ success: true, submissionId: existing.id, assignmentId: targetAssignmentId, status: 'draft' });
  } else {
    const id = `sub-${Date.now()}`;
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
      id, targetAssignmentId, studentId, caseId,
      JSON.stringify(meddraCoding || []),
      JSON.stringify(seriousnessCriteria || {}),
      causalityWho || 'Possible',
      JSON.stringify(causalityNaranjo || {}),
      causalityRationale || '',
      ciomsNarrative || ''
    );

    db.prepare("UPDATE assignments SET status = 'in_progress' WHERE id = ? AND status = 'assigned'").run(targetAssignmentId);

    return res.status(201).json({ success: true, submissionId: id, assignmentId: targetAssignmentId, status: 'draft' });
  }
});

// POST /api/submissions/submit - Final submission lock with resource verification & auto AI evaluation
submissionsRouter.post('/submit', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required to finalize submission.' });
  }

  const {
    assignmentId, caseId, meddraCoding, seriousnessCriteria,
    causalityWho, causalityNaranjo, causalityRationale, ciomsNarrative
  } = req.body;

  let targetAssignmentId = assignmentId;
  let assignment = db.prepare('SELECT id, student_id FROM assignments WHERE id = ?').get(targetAssignmentId) as any;

  if (!assignment) {
    const existingAsg = db.prepare('SELECT id, student_id FROM assignments WHERE case_id = ? AND student_id = ?').get(caseId, req.user.id) as any;
    if (existingAsg) {
      assignment = existingAsg;
      targetAssignmentId = existingAsg.id;
    } else {
      targetAssignmentId = `asg-prac-${Date.now()}`;
      const dueDate = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);
      db.prepare(`
        INSERT INTO assignments (id, case_id, student_id, assigned_by, due_date, instructions, status)
        VALUES (?, ?, ?, ?, ?, 'Self-directed PV training practice assignment', 'in_progress')
      `).run(targetAssignmentId, caseId, req.user.id, req.user.id, dueDate);
      assignment = { id: targetAssignmentId, student_id: req.user.id };
    }
  }

  if (req.user.role === 'student' && assignment.student_id !== req.user.id) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied: You cannot finalize submission for an assignment allocated to another student.'
    });
  }

  const studentId = req.user.id;

  let submissionId = `sub-${Date.now()}`;
  const existing = db.prepare('SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?').get(targetAssignmentId, studentId) as any;

  if (existing) {
    submissionId = existing.id;
    db.prepare(`
      UPDATE submissions SET
        meddra_coding = ?,
        seriousness_criteria = ?,
        causality_who = ?,
        causality_naranjo = ?,
        causality_rationale = ?,
        cioms_narrative = ?,
        status = 'submitted',
        submitted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      JSON.stringify(meddraCoding || []),
      JSON.stringify(seriousnessCriteria || {}),
      causalityWho || 'Possible',
      JSON.stringify(causalityNaranjo || {}),
      causalityRationale || '',
      ciomsNarrative || '',
      submissionId
    );
  } else {
    db.prepare(`
      INSERT INTO submissions (
        id, assignment_id, student_id, case_id, version,
        meddra_coding, seriousness_criteria, causality_who,
        causality_naranjo, causality_rationale, cioms_narrative,
        status, submitted_at
      ) VALUES (
        ?, ?, ?, ?, 1,
        ?, ?, ?,
        ?, ?, ?,
        'submitted', CURRENT_TIMESTAMP
      )
    `).run(
      submissionId, targetAssignmentId, studentId, caseId,
      JSON.stringify(meddraCoding || []),
      JSON.stringify(seriousnessCriteria || {}),
      causalityWho || 'Possible',
      JSON.stringify(causalityNaranjo || {}),
      causalityRationale || '',
      ciomsNarrative || ''
    );
  }

  // Update assignment status
  db.prepare("UPDATE assignments SET status = 'submitted' WHERE id = ?").run(targetAssignmentId);

  // Auto-generate provisional AI assessment if reference key exists
  const refKey = db.prepare('SELECT * FROM reference_keys WHERE case_id = ?').get(caseId) as any;
  if (refKey) {
    const freshSubmission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId) as any;
    if (freshSubmission) {
      try {
        const assessment = computeAIEvaluation(freshSubmission, refKey);
        const existingAssess = db.prepare('SELECT id FROM assessments WHERE submission_id = ?').get(submissionId) as any;
        if (existingAssess) {
          db.prepare(`
            UPDATE assessments SET
              total_score = ?, meddra_score = ?, seriousness_score = ?,
              causality_score = ?, narrative_score = ?, score_breakdown = ?,
              omissions = ?, errors = ?, strengths = ?, ai_rationale = ?,
              status = 'provisional', evaluated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            assessment.totalScore, assessment.meddraScore, assessment.seriousnessScore,
            assessment.causalityScore, assessment.narrativeScore,
            JSON.stringify(assessment.scoreBreakdown),
            JSON.stringify(assessment.omissions),
            JSON.stringify(assessment.errors),
            JSON.stringify(assessment.strengths),
            assessment.aiRationale,
            existingAssess.id
          );
        } else {
          db.prepare(`
            INSERT INTO assessments (
              id, submission_id, total_score, meddra_score, seriousness_score,
              causality_score, narrative_score, score_breakdown, omissions,
              errors, strengths, ai_rationale, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'provisional')
          `).run(
            assessment.id, submissionId, assessment.totalScore,
            assessment.meddraScore, assessment.seriousnessScore,
            assessment.causalityScore, assessment.narrativeScore,
            JSON.stringify(assessment.scoreBreakdown),
            JSON.stringify(assessment.omissions),
            JSON.stringify(assessment.errors),
            JSON.stringify(assessment.strengths),
            assessment.aiRationale
          );
        }
      } catch (err) {
        console.warn('Auto AI assessment evaluation skipped:', err);
      }
    }
  }

  // Audit log
  db.prepare(`
    INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, details)
    VALUES (?, 'submission', ?, 'FINAL_SUBMIT', ?, ?)
  `).run(`log-${Date.now()}`, submissionId, studentId, `Final submission locked for assignment ${targetAssignmentId}`);

  res.json({
    success: true,
    message: 'ICSR Submission successfully finalized and locked. Ready for AI evaluation and mentor review.',
    submissionId,
    assignmentId: targetAssignmentId,
    status: 'submitted'
  });
});
