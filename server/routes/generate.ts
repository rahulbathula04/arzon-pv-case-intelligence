import { Router } from 'express';
import { db, computeClinicalFingerprint } from '../db/database.js';
import { requireRole } from '../middleware/auth.js';
import { generateIcsrCasesPipeline, validateCaseConsistency, CaseGenerationInput } from '../services/llmCaseGenerator.js';
import { StagedCase, PVCase, ReferenceKey } from '../../src/types/index.js';

export const generateRouter = Router();

// GET /api/generate/status - Inspect active LLM provider and API key readiness
generateRouter.get('/status', (req, res) => {
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  const targetModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

  res.json({
    hasApiKey,
    provider: hasApiKey ? 'google-gemini' : 'fallback-deterministic',
    model: hasApiKey ? targetModel : 'pharmacology-synthesis-engine-v1',
    setupGuide: hasApiKey
      ? 'Gemini 3.8 Flash LLM pipeline active with live structured synthesis.'
      : 'GEMINI_API_KEY is not configured in the server environment. Synthesis is currently handled by the built-in clinical pharmacology engine fallback. Set GEMINI_API_KEY in .env to activate live Gemini 3.8 Flash generation.'
  });
});

// POST /api/generate/batch - Synthesize 1 to 5 fictional ICSR cases for admin review
generateRouter.post('/batch', requireRole(['admin', 'mentor']), async (req, res) => {
  try {
    const input: CaseGenerationInput = req.body;
    const result = await generateIcsrCasesPipeline(input);

    res.json({
      success: true,
      provider: result.provider,
      model: result.model,
      isFallback: result.isFallback,
      setupMessage: result.setupMessage,
      cases: result.cases
    });
  } catch (err: any) {
    console.error('Case generation batch error:', err);
    res.status(500).json({
      error: 'Generation Failed',
      message: err?.message || 'An error occurred during case generation.'
    });
  }
});

// POST /api/generate/validate - Dry-run validation of ICSR fields & chronology
generateRouter.post('/validate', requireRole(['admin', 'mentor']), (req, res) => {
  const validation = validateCaseConsistency(req.body);
  res.json(validation);
});

// POST /api/generate/approve-staged - Admin approves a reviewed/edited staged case into the assignable library
generateRouter.post('/approve-staged', requireRole(['admin', 'mentor']), (req, res) => {
  const staged: StagedCase = req.body;

  if (!staged || !staged.title || !staged.patientInitials) {
    return res.status(400).json({ error: 'Invalid staged case payload.' });
  }

  // 1. Validate ICSR and clinical consistency
  const validation = validateCaseConsistency(staged);
  if (!validation.isValid) {
    return res.status(422).json({
      error: 'Clinical Consistency Violation',
      details: validation.errors
    });
  }

  // 2. Compute clinical fingerprint and prevent duplicates
  const fingerprint = computeClinicalFingerprint({
    title: staged.title,
    therapeuticArea: staged.therapeuticArea,
    patientInitials: staged.patientInitials,
    patientAge: staged.patientAge,
    patientGender: staged.patientGender,
    suspectDrugs: staged.suspectDrugs,
    adverseEvents: staged.adverseEvents
  });

  const existing = db.prepare('SELECT id, case_number FROM cases WHERE clinical_fingerprint = ?').get(fingerprint) as any;
  if (existing) {
    return res.status(409).json({
      error: 'Duplicate Case Detected',
      message: `A case with an identical clinical profile already exists in the library (${existing.case_number}).`,
      existingCaseNumber: existing.case_number,
      existingCaseId: existing.id
    });
  }

  const caseId = `case-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const areaCode = (staged.therapeuticArea || 'GEN').slice(0, 3).toUpperCase();
  const year = 2026;
  const caseNumber = `ARZ-${year}-${areaCode}-${Math.floor(100 + Math.random() * 899)}`;

  // 3. Save into SQLite `cases`
  const insertCase = db.prepare(`
    INSERT INTO cases (
      id, case_number, clinical_fingerprint, title, therapeutic_area, difficulty, source_type,
      is_fictional, fictional_disclaimer, status, active_version,
      patient_initials, patient_age, patient_gender, patient_weight_kg,
      medical_history, suspect_drugs, concomitant_drugs, adverse_events,
      lab_tests, verbatim_narrative, reporter_type, receipt_date, generation_metadata
    ) VALUES (
      ?, ?, ?, ?, ?, ?, 'ai_generated',
      1, 'CONTROLLED FICTIONAL TRAINING SCENARIO · NOT REAL PATIENT DATA', 'approved', 1,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  insertCase.run(
    caseId, caseNumber, fingerprint, staged.title, staged.therapeuticArea, staged.difficulty,
    staged.patientInitials, staged.patientAge, staged.patientGender, staged.patientWeightKg || null,
    staged.medicalHistory,
    JSON.stringify(staged.suspectDrugs),
    JSON.stringify(staged.concomitantDrugs || []),
    JSON.stringify(staged.adverseEvents),
    JSON.stringify(staged.labTests || []),
    staged.verbatimNarrative,
    staged.reporterType,
    staged.receiptDate,
    JSON.stringify(staged.generationMetadata)
  );

  // 4. Save into restricted `reference_keys`
  const ref = staged.referenceKey;
  const insertRefKey = db.prepare(`
    INSERT INTO reference_keys (
      case_id, expected_meddra_terms, expected_seriousness,
      expected_causality_who, expected_naranjo_score, expected_naranjo_breakdown,
      model_cioms_narrative, grading_rubric
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRefKey.run(
    caseId,
    JSON.stringify(ref.expectedMeddraTerms || []),
    JSON.stringify(ref.expectedSeriousness || {}),
    ref.expectedCausalityWho || 'Probable',
    ref.expectedNaranjoScore !== undefined ? ref.expectedNaranjoScore : 7,
    JSON.stringify(ref.expectedNaranjoBreakdown || {}),
    ref.modelCiomsNarrative || '',
    JSON.stringify(ref.gradingRubric || {})
  );

  // 5. Save initial version in `case_versions`
  db.prepare(`
    INSERT INTO case_versions (id, case_id, version_number, snapshot_json, changelog, created_by)
    VALUES (?, ?, 1, ?, 'Initial LLM Case Approval by Safety Officer', ?)
  `).run(`ver-${caseId}-1`, caseId, JSON.stringify({ caseId, caseNumber, staged }), req.user?.id || 'usr-admin-01');

  // 6. Audit log entry
  db.prepare(`
    INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, details)
    VALUES (?, 'case', ?, 'LLM_CASE_APPROVED', ?, ?)
  `).run(
    `log-${Date.now()}`,
    caseId,
    req.user?.id || 'usr-admin-01',
    `Approved and published AI-generated case ${caseNumber} (${staged.title}) via ${staged.generationMetadata.provider}`
  );

  res.status(201).json({
    success: true,
    message: 'Case successfully verified, approved, and added to the assignable library.',
    caseId,
    caseNumber,
    title: staged.title
  });
});

// Backward-compatible single case generation endpoint
generateRouter.post('/case', requireRole(['admin', 'mentor']), async (req, res) => {
  try {
    const input: CaseGenerationInput = {
      therapeuticArea: req.body.therapeuticArea || 'Oncology',
      difficulty: req.body.difficulty || 'Intermediate',
      suspectDrug: req.body.suspectDrug,
      reactionType: req.body.reactionType,
      complexity: req.body.complexity || 'Standard',
      reporterType: req.body.reporterType || 'Hospital Pharmacist',
      customNotes: req.body.customNotes,
      caseCount: 1
    };

    const result = await generateIcsrCasesPipeline(input);
    const staged = result.cases[0];

    // Compute fingerprint
    const fingerprint = computeClinicalFingerprint({
      title: staged.title,
      therapeuticArea: staged.therapeuticArea,
      patientInitials: staged.patientInitials,
      patientAge: staged.patientAge,
      patientGender: staged.patientGender,
      suspectDrugs: staged.suspectDrugs,
      adverseEvents: staged.adverseEvents
    });

    const existing = db.prepare('SELECT id, case_number, title FROM cases WHERE clinical_fingerprint = ?').get(fingerprint) as any;
    if (existing) {
      return res.status(200).json({
        success: true,
        message: `An identical case scenario already exists in the library (${existing.case_number}).`,
        caseId: existing.id,
        caseNumber: existing.case_number,
        title: existing.title,
        status: 'approved',
        therapeuticArea: staged.therapeuticArea,
        difficulty: staged.difficulty,
        verbatimNarrative: staged.verbatimNarrative,
        provider: result.provider,
        isFallback: result.isFallback
      });
    }

    const caseId = `case-ai-${Date.now()}`;
    const areaCode = staged.therapeuticArea.slice(0, 3).toUpperCase();
    const caseNumber = `ARZ-2026-${areaCode}-${Math.floor(100 + Math.random() * 899)}`;

    // Insert as draft
    db.prepare(`
      INSERT INTO cases (
        id, case_number, clinical_fingerprint, title, therapeutic_area, difficulty, source_type,
        is_fictional, fictional_disclaimer, status, active_version,
        patient_initials, patient_age, patient_gender, patient_weight_kg,
        medical_history, suspect_drugs, concomitant_drugs, adverse_events,
        lab_tests, verbatim_narrative, reporter_type, receipt_date, generation_metadata
      ) VALUES (
        ?, ?, ?, ?, ?, ?, 'ai_generated',
        1, 'CONTROLLED FICTIONAL TRAINING SCENARIO · NOT REAL PATIENT DATA', 'draft', 1,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `).run(
      caseId, caseNumber, fingerprint, staged.title, staged.therapeuticArea, staged.difficulty,
      staged.patientInitials, staged.patientAge, staged.patientGender, staged.patientWeightKg || null,
      staged.medicalHistory,
      JSON.stringify(staged.suspectDrugs),
      JSON.stringify(staged.concomitantDrugs || []),
      JSON.stringify(staged.adverseEvents),
      JSON.stringify(staged.labTests || []),
      staged.verbatimNarrative,
      staged.reporterType,
      staged.receiptDate,
      JSON.stringify(staged.generationMetadata)
    );

    // Insert reference key
    db.prepare(`
      INSERT INTO reference_keys (
        case_id, expected_meddra_terms, expected_seriousness,
        expected_causality_who, expected_naranjo_score, expected_naranjo_breakdown,
        model_cioms_narrative, grading_rubric
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      caseId,
      JSON.stringify(staged.referenceKey.expectedMeddraTerms),
      JSON.stringify(staged.referenceKey.expectedSeriousness),
      staged.referenceKey.expectedCausalityWho,
      staged.referenceKey.expectedNaranjoScore,
      JSON.stringify(staged.referenceKey.expectedNaranjoBreakdown),
      staged.referenceKey.modelCiomsNarrative,
      JSON.stringify(staged.referenceKey.gradingRubric)
    );

    res.status(201).json({
      success: true,
      message: 'Fictional ICSR case generated and staged as draft.',
      caseId,
      caseNumber,
      title: staged.title,
      status: 'draft',
      therapeuticArea: staged.therapeuticArea,
      difficulty: staged.difficulty,
      verbatimNarrative: staged.verbatimNarrative,
      provider: result.provider,
      isFallback: result.isFallback,
      stagedCase: staged
    });
  } catch (err: any) {
    console.error('Case generation error:', err);
    res.status(500).json({ error: 'Generation Failed', message: err?.message || 'Error generating case.' });
  }
});
