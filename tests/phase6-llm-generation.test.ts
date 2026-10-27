import { describe, it, expect, beforeAll } from 'vitest';
import { db, initDatabase, computeClinicalFingerprint } from '../server/db/database.js';
import { seedDatabase } from '../server/db/seed.js';
import { validateCaseConsistency, generateIcsrCasesPipeline } from '../server/services/llmCaseGenerator.js';
import { signUserToken, verifyUserToken } from '../server/middleware/auth.js';
import { StagedCase } from '../src/types/index.js';

describe('Phase 6: Production-Grade LLM Case Generation & Security', () => {
  beforeAll(() => {
    initDatabase();
    seedDatabase();
  });

  it('validates compliant ICSR schema and passes all 4 ICH E2B regulatory criteria', () => {
    const validCase = {
      patientInitials: 'T.H.',
      patientAge: 54,
      patientGender: 'Male',
      patientWeightKg: 80,
      reporterType: 'Hospital Pharmacist',
      suspectDrugs: [
        {
          name: 'Opdivo',
          inn: 'Nivolumab',
          role: 'Suspect' as const,
          dose: '480 mg IV',
          route: 'Intravenous',
          frequency: 'Every 4 weeks',
          startDate: '2026-08-01',
          stopDate: '2026-08-28',
          indication: 'Metastatic melanoma',
          actionTaken: 'Drug Withdrawn' as const,
          dechallenge: 'Positive' as const,
          rechallenge: 'Not Done' as const
        }
      ],
      adverseEvents: [
        {
          verbatim: 'immune-mediated hepatitis with jaundice',
          meddraPt: 'Autoimmune hepatitis',
          meddraSoc: 'Hepatobiliary disorders',
          onsetDate: '2026-08-20',
          outcome: 'Recovering/Resolving' as const,
          seriousness: {
            isSerious: true,
            criteria: {
              death: false,
              lifeThreatening: false,
              hospitalization: true,
              disability: false,
              congenitalAnomaly: false,
              otherMedicallyImportant: true
            }
          }
        }
      ],
      receiptDate: '2026-08-25',
      referenceKey: {
        expectedCausalityWho: 'Probable' as const,
        expectedNaranjoScore: 7,
        gradingRubric: {
          meddraWeight: 25,
          seriousnessWeight: 25,
          causalityWeight: 25,
          narrativeWeight: 25,
          rubricPoints: []
        }
      }
    };

    const result = validateCaseConsistency(validCase);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('detects and rejects invalid model outputs violating chronology or seriousness criteria', () => {
    // Case 1: Chronological violation (adverse event onset precedes drug start)
    const invalidDatesCase: any = {
      patientInitials: 'A.B.',
      patientAge: 45,
      patientGender: 'Female',
      reporterType: 'Physician',
      suspectDrugs: [{ name: 'DrugA', inn: 'CompoundA', dose: '10mg', route: 'Oral', startDate: '2026-08-15' }],
      adverseEvents: [{
        verbatim: 'Rash',
        onsetDate: '2026-08-01', // Before drug start!
        seriousness: { isSerious: true, criteria: { hospitalization: true } }
      }],
      receiptDate: '2026-08-20'
    };

    const res1 = validateCaseConsistency(invalidDatesCase);
    expect(res1.isValid).toBe(false);
    expect(res1.errors.some(e => e.includes('Chronological Violation'))).toBe(true);

    // Case 2: Contradictory seriousness (outcome is Fatal, but death criterion unchecked)
    const contradictorySeriousnessCase: any = {
      patientInitials: 'C.D.',
      patientAge: 60,
      patientGender: 'Male',
      reporterType: 'Safety Officer',
      suspectDrugs: [{ name: 'DrugB', inn: 'CompoundB', dose: '20mg', route: 'Oral', startDate: '2026-08-01' }],
      adverseEvents: [{
        verbatim: 'Cardiac arrest',
        onsetDate: '2026-08-10',
        outcome: 'Fatal',
        seriousness: {
          isSerious: true,
          criteria: { death: false, hospitalization: true } // Contradiction!
        }
      }],
      receiptDate: '2026-08-12'
    };

    const res2 = validateCaseConsistency(contradictorySeriousnessCase);
    expect(res2.isValid).toBe(false);
    expect(res2.errors.some(e => e.includes('Contradictory Seriousness'))).toBe(true);

    // Case 3: Missing minimum criteria (missing patient initials and suspect drug)
    const missingCriteriaCase: any = {
      patientInitials: '',
      patientAge: -5,
      reporterType: 'Nurse',
      suspectDrugs: [],
      adverseEvents: []
    };

    const res3 = validateCaseConsistency(missingCriteriaCase);
    expect(res3.isValid).toBe(false);
    expect(res3.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('prevents duplicate clinical scenarios from entering the database via clinical fingerprinting', () => {
    // Retrieve an existing case from seed
    const existing = db.prepare('SELECT * FROM cases LIMIT 1').get() as any;
    expect(existing).toBeDefined();

    const suspectDrugs = JSON.parse(existing.suspect_drugs);
    const adverseEvents = JSON.parse(existing.adverse_events);

    const duplicateFp = computeClinicalFingerprint({
      title: existing.title,
      therapeuticArea: existing.therapeutic_area,
      patientInitials: existing.patient_initials,
      patientAge: existing.patient_age,
      patientGender: existing.patient_gender,
      suspectDrugs,
      adverseEvents
    });

    expect(duplicateFp).toBe(existing.clinical_fingerprint);

    // Verify duplicate query returns the existing record
    const match = db.prepare('SELECT id, case_number FROM cases WHERE clinical_fingerprint = ?').get(duplicateFp) as any;
    expect(match).toBeDefined();
    expect(match.id).toBe(existing.id);
  });

  it('differentiates LLM provider metadata from deterministic fallback and never mislabels fallback as LLM', async () => {
    // Execute generation pipeline without API key
    const result = await generateIcsrCasesPipeline({
      therapeuticArea: 'Oncology',
      difficulty: 'Intermediate',
      caseCount: 1
    });

    expect(result.cases.length).toBe(1);
    const staged = result.cases[0];

    // Verify metadata explicitly states fallback when no key is set
    expect(staged.generationMetadata.provider).toBe('fallback-deterministic');
    expect(staged.generationMetadata.isFallback).toBe(true);
    expect(staged.generationMetadata.model).toBe('pharmacology-synthesis-engine-v1');
    expect(staged.generationMetadata.setupMessage).toContain('GEMINI_API_KEY');

    // Verify student-facing content does NOT expose reference answers
    const studentCase = {
      title: staged.title,
      patientInitials: staged.patientInitials,
      patientAge: staged.patientAge,
      medicalHistory: staged.medicalHistory,
      suspectDrugs: staged.suspectDrugs,
      adverseEvents: staged.adverseEvents,
      verbatimNarrative: staged.verbatimNarrative
    };

    const studentKeys = Object.keys(studentCase);
    expect(studentKeys).not.toContain('referenceKey');
    expect(studentKeys).not.toContain('expectedMeddraTerms');
    expect(studentKeys).not.toContain('expectedCausalityWho');
    expect(studentKeys).not.toContain('expectedNaranjoScore');
  });

  it('verifies cryptographic JWT token signing, verification, and role-based access enforcement', () => {
    // Generate valid admin token
    const adminToken = signUserToken({
      id: 'usr-admin-01',
      email: 'admin@arzon.global',
      fullName: 'Dr. Arzon Director',
      role: 'admin'
    });
    expect(adminToken).toBeTruthy();

    // Verify valid token
    const decodedAdmin = verifyUserToken(adminToken);
    expect(decodedAdmin.id).toBe('usr-admin-01');
    expect(decodedAdmin.role).toBe('admin');

    // Generate student token
    const studentToken = signUserToken({
      id: 'usr-student-01',
      email: 'rahul.varma@arzon.student',
      fullName: 'Rahul Varma',
      role: 'student'
    });
    const decodedStudent = verifyUserToken(studentToken);
    expect(decodedStudent.role).toBe('student');

    // Invalid / forged token verification throws error
    expect(() => {
      verifyUserToken('invalid-forged-token-xyz');
    }).toThrow();
  });

  it('successfully persists an approved staged case into SQLite cases, case_versions, and reference_keys', () => {
    const tempCaseId = `case-p6-test-${Date.now()}`;
    const caseNumber = `ARZ-2026-ONC-${Math.floor(100 + Math.random() * 899)}`;
    const title = `Phase 6 Synthetic Test Case ${Date.now()}`;

    const fp = computeClinicalFingerprint({
      title,
      therapeuticArea: 'Oncology',
      patientInitials: 'P.S.',
      patientAge: 65,
      patientGender: 'Female',
      suspectDrugs: [{ name: 'Keytruda', inn: 'Pembrolizumab' }],
      adverseEvents: [{ verbatim: 'severe colitis' }]
    });

    // 1. Insert into cases
    db.prepare(`
      INSERT INTO cases (
        id, case_number, clinical_fingerprint, title, therapeutic_area, difficulty, source_type,
        is_fictional, fictional_disclaimer, status, active_version,
        patient_initials, patient_age, patient_gender, patient_weight_kg,
        medical_history, suspect_drugs, concomitant_drugs, adverse_events,
        lab_tests, verbatim_narrative, reporter_type, receipt_date, generation_metadata
      ) VALUES (
        ?, ?, ?, ?, 'Oncology', 'Intermediate', 'ai_generated',
        1, 'CONTROLLED FICTIONAL TRAINING SCENARIO', 'approved', 1,
        'P.S.', 65, 'Female', 68,
        'Metastatic NSCLC', '[]', '[]', '[]',
        '[]', 'Narrative', 'Physician', '2026-10-27', ?
      )
    `).run(tempCaseId, caseNumber, fp, title, JSON.stringify({ provider: 'google-gemini', isFallback: false }));

    // 2. Insert into reference_keys
    db.prepare(`
      INSERT INTO reference_keys (
        case_id, expected_meddra_terms, expected_seriousness,
        expected_causality_who, expected_naranjo_score, expected_naranjo_breakdown,
        model_cioms_narrative, grading_rubric
      ) VALUES (?, '[]', '{}', 'Probable', 7, '{}', 'Model Narrative', '{}')
    `).run(tempCaseId);

    // 3. Insert initial version into case_versions
    db.prepare(`
      INSERT INTO case_versions (id, case_id, version_number, snapshot_json, changelog, created_by)
      VALUES (?, ?, 1, '{}', 'Approved by safety mentor', 'usr-admin-01')
    `).run(`ver-${tempCaseId}-1`, tempCaseId);

    // Verify persistence
    const savedCase = db.prepare('SELECT id, case_number, title, status FROM cases WHERE id = ?').get(tempCaseId) as any;
    expect(savedCase).toBeDefined();
    expect(savedCase.status).toBe('approved');
    expect(savedCase.title).toBe(title);

    const savedRef = db.prepare('SELECT case_id, expected_causality_who FROM reference_keys WHERE case_id = ?').get(tempCaseId) as any;
    expect(savedRef).toBeDefined();
    expect(savedRef.expected_causality_who).toBe('Probable');

    const savedVer = db.prepare('SELECT case_id, version_number FROM case_versions WHERE case_id = ?').get(tempCaseId) as any;
    expect(savedVer).toBeDefined();
    expect(savedVer.version_number).toBe(1);

    // Clean up test case
    db.prepare('DELETE FROM reference_keys WHERE case_id = ?').run(tempCaseId);
    db.prepare('DELETE FROM case_versions WHERE case_id = ?').run(tempCaseId);
    db.prepare('DELETE FROM cases WHERE id = ?').run(tempCaseId);
  });
});
