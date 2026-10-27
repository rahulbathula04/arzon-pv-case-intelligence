import { Router } from 'express';
import { db } from '../db/database.js';
import { isStaff, requireRole } from '../middleware/auth.js';
import { PVCase, ReferenceKey } from '../../src/types/index.js';

export const casesRouter = Router();

function mapCaseRow(row: any, includeReferenceKey = false): PVCase {
  const pvCase: PVCase = {
    id: row.id,
    caseNumber: row.case_number,
    title: row.title,
    therapeuticArea: row.therapeutic_area,
    difficulty: row.difficulty,
    sourceType: row.source_type,
    isFictional: Boolean(row.is_fictional),
    fictionalDisclaimer: row.fictional_disclaimer,
    status: row.status,
    activeVersion: row.active_version,
    patientInitials: row.patient_initials,
    patientAge: row.patient_age,
    patientGender: row.patient_gender,
    patientWeightKg: row.patient_weight_kg,
    medicalHistory: row.medical_history,
    suspectDrugs: JSON.parse(row.suspect_drugs || '[]'),
    concomitantDrugs: JSON.parse(row.concomitant_drugs || '[]'),
    adverseEvents: JSON.parse(row.adverse_events || '[]'),
    labTests: JSON.parse(row.lab_tests || '[]'),
    verbatimNarrative: row.verbatim_narrative,
    reporterType: row.reporter_type,
    receiptDate: row.receipt_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  if (includeReferenceKey && row.ref_case_id) {
    pvCase.referenceKey = {
      caseId: row.ref_case_id,
      expectedMeddraTerms: JSON.parse(row.expected_meddra_terms || '[]'),
      expectedSeriousness: JSON.parse(row.expected_seriousness || '{}'),
      expectedCausalityWho: row.expected_causality_who,
      expectedNaranjoScore: row.expected_naranjo_score,
      expectedNaranjoBreakdown: JSON.parse(row.expected_naranjo_breakdown || '{}'),
      modelCiomsNarrative: row.model_cioms_narrative,
      gradingRubric: JSON.parse(row.grading_rubric || '{}')
    };
  }

  return pvCase;
}

// GET /api/cases - List cases with filtering and search
casesRouter.get('/', (req, res) => {
  const { search, therapeuticArea, difficulty, status } = req.query;
  const user = req.user;
  const staff = isStaff(user?.role);

  let query = 'SELECT * FROM cases WHERE 1=1';
  const params: any[] = [];

  // Students can only see approved cases
  if (!staff) {
    query += ' AND status = ?';
    params.push('approved');
  } else if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (therapeuticArea && therapeuticArea !== 'All') {
    query += ' AND therapeutic_area = ?';
    params.push(therapeuticArea);
  }

  if (difficulty && difficulty !== 'All') {
    query += ' AND difficulty = ?';
    params.push(difficulty);
  }

  if (search) {
    query += ' AND (case_number LIKE ? OR title LIKE ? OR medical_history LIKE ? OR verbatim_narrative LIKE ?)';
    const searchWildcard = `%${search}%`;
    params.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard);
  }

  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params);
  // Never include reference key in list view
  const cases = rows.map((r: any) => mapCaseRow(r, false));

  res.json({ cases });
});

// GET /api/cases/:id - Get single case details
casesRouter.get('/:id', (req, res) => {
  const { id } = req.params;
  const user = req.user;
  const staff = isStaff(user?.role);

  let row: any;
  if (staff) {
    // Admin & Mentor: Join reference_keys
    row = db.prepare(`
      SELECT c.*, 
             r.case_id as ref_case_id,
             r.expected_meddra_terms,
             r.expected_seriousness,
             r.expected_causality_who,
             r.expected_naranjo_score,
             r.expected_naranjo_breakdown,
             r.model_cioms_narrative,
             r.grading_rubric
      FROM cases c
      LEFT JOIN reference_keys r ON c.id = r.case_id
      WHERE c.id = ?
    `).get(id);
  } else {
    // Student: Select only from cases table (NO reference key)
    row = db.prepare('SELECT * FROM cases WHERE id = ?').get(id);
  }

  if (!row) {
    return res.status(404).json({ error: 'Case not found' });
  }

  // If student tries to view unapproved case, reject
  if (!staff && row.status !== 'approved') {
    return res.status(403).json({ error: 'Access denied: Case is not published for student training.' });
  }

  const pvCase = mapCaseRow(row, staff);
  res.json({ case: pvCase });
});

// GET /api/cases/:id/versions - View case audit history (Staff only)
casesRouter.get('/:id/versions', requireRole(['admin', 'mentor']), (req, res) => {
  const { id } = req.params;
  const versions = db.prepare(`
    SELECT v.id, v.case_id as caseId, v.version_number as versionNumber,
           v.changelog, v.created_by as createdBy, v.created_at as createdAt,
           u.full_name as authorName
    FROM case_versions v
    LEFT JOIN users u ON v.created_by = u.id
    WHERE v.case_id = ?
    ORDER BY v.version_number DESC
  `).all(id);

  res.json({ versions });
});

// POST /api/cases - Admin creates a new case
casesRouter.post('/', requireRole(['admin']), (req, res) => {
  const {
    caseNumber, title, therapeuticArea, difficulty, sourceType,
    patientInitials, patientAge, patientGender, patientWeightKg,
    medicalHistory, suspectDrugs, concomitantDrugs, adverseEvents,
    labTests, verbatimNarrative, reporterType, receiptDate, status,
    referenceKey
  } = req.body;

  if (!title || !therapeuticArea || !verbatimNarrative) {
    return res.status(400).json({ error: 'Missing required case fields' });
  }

  const id = `case-${Date.now()}`;
  const genCaseNumber = caseNumber || `ARZ-${new Date().getFullYear()}-${therapeuticArea.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  const insertCase = db.prepare(`
    INSERT INTO cases (
      id, case_number, title, therapeutic_area, difficulty, source_type,
      is_fictional, fictional_disclaimer, status, active_version,
      patient_initials, patient_age, patient_gender, patient_weight_kg,
      medical_history, suspect_drugs, concomitant_drugs, adverse_events,
      lab_tests, verbatim_narrative, reporter_type, receipt_date
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      1, 'CONTROLLED FICTIONAL TRAINING SCENARIO · NOT REAL PATIENT DATA', ?, 1,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  insertCase.run(
    id, genCaseNumber, title, therapeuticArea, difficulty || 'Intermediate', sourceType || 'curated',
    status || 'approved', patientInitials || 'P.X.', Number(patientAge) || 45, patientGender || 'Unknown',
    patientWeightKg ? Number(patientWeightKg) : null, medicalHistory || 'None reported',
    JSON.stringify(suspectDrugs || []), JSON.stringify(concomitantDrugs || []),
    JSON.stringify(adverseEvents || []), JSON.stringify(labTests || []),
    verbatimNarrative, reporterType || 'Healthcare Professional', receiptDate || new Date().toISOString().slice(0, 10)
  );

  // If reference key is provided, store in reference_keys table
  if (referenceKey) {
    const insertRefKey = db.prepare(`
      INSERT INTO reference_keys (
        case_id, expected_meddra_terms, expected_seriousness,
        expected_causality_who, expected_naranjo_score, expected_naranjo_breakdown,
        model_cioms_narrative, grading_rubric
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertRefKey.run(
      id,
      JSON.stringify(referenceKey.expectedMeddraTerms || []),
      JSON.stringify(referenceKey.expectedSeriousness || {}),
      referenceKey.expectedCausalityWho || 'Possible',
      Number(referenceKey.expectedNaranjoScore) || 5,
      JSON.stringify(referenceKey.expectedNaranjoBreakdown || {}),
      referenceKey.modelCiomsNarrative || '',
      JSON.stringify(referenceKey.gradingRubric || {})
    );
  }

  // Create version 1 record
  db.prepare(`
    INSERT INTO case_versions (id, case_id, version_number, snapshot_json, changelog, created_by)
    VALUES (?, ?, 1, ?, 'Initial case creation', ?)
  `).run(`ver-${id}-1`, id, JSON.stringify(req.body), req.user?.id || 'usr-admin-01');

  // Audit log
  db.prepare(`
    INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, details)
    VALUES (?, 'case', ?, 'CREATE_CASE', ?, ?)
  `).run(`log-${Date.now()}`, id, req.user?.id || 'usr-admin-01', `Created case ${genCaseNumber}`);

  res.status(201).json({ success: true, caseId: id, caseNumber: genCaseNumber });
});

// POST /api/cases/:id/publish - Publish a draft case
casesRouter.post('/:id/publish', requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id, case_number FROM cases WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Case not found' });
  }

  db.prepare("UPDATE cases SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);

  db.prepare(`
    INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, details)
    VALUES (?, 'case', ?, 'PUBLISH_CASE', ?, ?)
  `).run(`log-${Date.now()}`, id, req.user?.id || 'usr-admin-01', `Published case ${existing.case_number}`);

  res.json({ success: true, message: `Case ${existing.case_number} published to student training library.` });
});
