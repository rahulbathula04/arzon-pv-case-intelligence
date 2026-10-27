import { Router } from 'express';
import { db } from '../db/database.js';
import { StudentSubmission } from '../../src/types/index.js';

export const submissionsRouter = Router();

// GET /api/submissions/assignment/:assignmentId - Get current submission / draft
submissionsRouter.get('/assignment/:assignmentId', (req, res) => {
  const { assignmentId } = req.params;
  const user = req.user;

  let query = 'SELECT * FROM submissions WHERE assignment_id = ?';
  const params: any[] = [assignmentId];

  if (user?.role === 'student') {
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
  const studentId = user?.id || 'usr-student-01';

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

// POST /api/submissions/draft - Save student working draft
submissionsRouter.post('/draft', (req, res) => {
  const {
    assignmentId, caseId, meddraCoding, seriousnessCriteria,
    causalityWho, causalityNaranjo, causalityRationale, ciomsNarrative
  } = req.body;

  const studentId = req.user?.id || 'usr-student-01';

  // Check if draft already exists
  const existing = db.prepare('SELECT id, version FROM submissions WHERE assignment_id = ? AND student_id = ?').get(assignmentId, studentId) as any;

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

    // Update assignment status to in_progress if currently assigned
    db.prepare("UPDATE assignments SET status = 'in_progress' WHERE id = ? AND status = 'assigned'").run(assignmentId);

    return res.json({ success: true, submissionId: existing.id, status: 'draft' });
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
      id, assignmentId, studentId, caseId,
      JSON.stringify(meddraCoding || []),
      JSON.stringify(seriousnessCriteria || {}),
      causalityWho || 'Possible',
      JSON.stringify(causalityNaranjo || {}),
      causalityRationale || '',
      ciomsNarrative || ''
    );

    db.prepare("UPDATE assignments SET status = 'in_progress' WHERE id = ? AND status = 'assigned'").run(assignmentId);

    return res.status(201).json({ success: true, submissionId: id, status: 'draft' });
  }
});

// POST /api/submissions/submit - Final submission lock
submissionsRouter.post('/submit', (req, res) => {
  const {
    assignmentId, caseId, meddraCoding, seriousnessCriteria,
    causalityWho, causalityNaranjo, causalityRationale, ciomsNarrative
  } = req.body;

  const studentId = req.user?.id || 'usr-student-01';

  let submissionId = `sub-${Date.now()}`;
  const existing = db.prepare('SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?').get(assignmentId, studentId) as any;

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
      submissionId, assignmentId, studentId, caseId,
      JSON.stringify(meddraCoding || []),
      JSON.stringify(seriousnessCriteria || {}),
      causalityWho || 'Possible',
      JSON.stringify(causalityNaranjo || {}),
      causalityRationale || '',
      ciomsNarrative || ''
    );
  }

  // Update assignment status
  db.prepare("UPDATE assignments SET status = 'submitted' WHERE id = ?").run(assignmentId);

  // Audit log
  db.prepare(`
    INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, details)
    VALUES (?, 'submission', ?, 'FINAL_SUBMIT', ?, ?)
  `).run(`log-${Date.now()}`, submissionId, studentId, `Final submission locked for assignment ${assignmentId}`);

  res.json({
    success: true,
    message: 'ICSR Submission successfully finalized and locked. Ready for AI evaluation and mentor review.',
    submissionId,
    status: 'submitted'
  });
});
