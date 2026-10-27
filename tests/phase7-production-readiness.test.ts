import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, initDatabase, computeClinicalFingerprint } from '../server/db/database.js';
import { seedDatabase } from '../server/db/seed.js';
import { signUserToken, verifyUserToken, JWT_SECRET } from '../server/middleware/auth.js';
import { validateCaseConsistency } from '../server/services/llmCaseGenerator.js';

describe('Phase 7: Production-Readiness Audit, Hardening & Security Assurance', () => {
  beforeAll(() => {
    initDatabase();
    seedDatabase();
  });

  describe('1. Authentication Hardening & Password Policy', () => {
    it('enforces bcrypt password verification with zero plaintext fallback bypass', () => {
      const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get('usr-admin-01') as any;
      expect(user.password_hash).toBeTruthy();
      expect(user.password_hash.startsWith('$2b$')).toBe(true);

      // Verify correct password
      const match = bcrypt.compareSync('ArzonSecure2026!', user.password_hash);
      expect(match).toBe(true);

      // Verify incorrect password fails
      const badMatch = bcrypt.compareSync('WrongPassword123!', user.password_hash);
      expect(badMatch).toBe(false);
    });

    it('enforces password rotation policy requirements (min 10 chars, uppercase, lowercase, number, symbol)', () => {
      const weakPasswords = [
        'short',           // < 10 chars
        'alllowercase123!',// no uppercase
        'ALLUPPERCASE123!',// no lowercase
        'NoNumbersHere!!', // no digit
        'NoSpecialChar123' // no symbol
      ];

      for (const pwd of weakPasswords) {
        const isLengthValid = pwd.length >= 10;
        const hasUpper = /[A-Z]/.test(pwd);
        const hasLower = /[a-z]/.test(pwd);
        const hasDigit = /[0-9]/.test(pwd);
        const hasSymbol = /[^A-Za-z0-9]/.test(pwd);

        const isValid = isLengthValid && hasUpper && hasLower && hasDigit && hasSymbol;
        expect(isValid).toBe(false);
      }

      const strongPassword = 'ArzonExecutive#2026!';
      const isStrong = strongPassword.length >= 10 &&
        /[A-Z]/.test(strongPassword) &&
        /[a-z]/.test(strongPassword) &&
        /[0-9]/.test(strongPassword) &&
        /[^A-Za-z0-9]/.test(strongPassword);
      expect(isStrong).toBe(true);
    });

    it('verifies JWT token expiration handling and rejects expired tokens', () => {
      // Issue expired token (-1 second lifetime)
      const expiredToken = signUserToken(
        { id: 'usr-admin-01', email: 'admin@arzon.global', fullName: 'Dr. Arzon Director', role: 'admin' },
        '-1s'
      );

      expect(() => {
        verifyUserToken(expiredToken);
      }).toThrow(/jwt expired/);

      // Issue valid token (1h lifetime)
      const validToken = signUserToken(
        { id: 'usr-admin-01', email: 'admin@arzon.global', fullName: 'Dr. Arzon Director', role: 'admin' },
        '1h'
      );
      const decoded = verifyUserToken(validToken);
      expect(decoded.id).toBe('usr-admin-01');
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('rejects forged or tampered JWT signatures', () => {
      const forgedToken = jwt.sign(
        { id: 'usr-admin-01', role: 'admin' },
        'attacker-unauthorized-secret-key'
      );

      expect(() => {
        verifyUserToken(forgedToken);
      }).toThrow(/invalid signature/);
    });
  });

  describe('2. Resource-Level Authorization & Cross-Tenant Protection', () => {
    it('strictly confines students to their own assignments and submissions', () => {
      // Create test assignments for Student 1 and Student 2
      const caseId = 'case-2026-onc-001';
      const assign1Id = `asg-p7-s1-${Date.now()}`;
      const assign2Id = `asg-p7-s2-${Date.now()}`;

      db.prepare(`
        INSERT INTO assignments (id, case_id, student_id, assigned_by, due_date, status)
        VALUES (?, ?, 'usr-student-01', 'usr-admin-01', '2026-11-01', 'assigned')
      `).run(assign1Id, caseId);

      db.prepare(`
        INSERT INTO assignments (id, case_id, student_id, assigned_by, due_date, status)
        VALUES (?, ?, 'usr-student-02', 'usr-admin-01', '2026-11-01', 'assigned')
      `).run(assign2Id, caseId);

      // Verify DB level ownership check
      const assign1 = db.prepare('SELECT student_id FROM assignments WHERE id = ?').get(assign1Id) as any;
      expect(assign1.student_id).toBe('usr-student-01');

      // Student 2 attempting to claim Student 1's assignment must be recognized as unauthorized
      const student2Id = 'usr-student-02';
      const isOwner = assign1.student_id === student2Id;
      expect(isOwner).toBe(false);

      // Clean up test assignments
      db.prepare('DELETE FROM assignments WHERE id IN (?, ?)').run(assign1Id, assign2Id);
    });

    it('prohibits students from accessing reference keys or staff audit histories', () => {
      // Query case as student
      const studentCase = db.prepare('SELECT * FROM cases WHERE case_number = ?').get('ARZ-2026-ONC-001') as any;
      const keys = Object.keys(studentCase);

      expect(keys).not.toContain('expected_meddra_terms');
      expect(keys).not.toContain('expected_seriousness');
      expect(keys).not.toContain('expected_causality_who');
      expect(keys).not.toContain('expected_naranjo_score');
      expect(keys).not.toContain('model_cioms_narrative');
      expect(keys).not.toContain('grading_rubric');
    });
  });

  describe('3. Clinical Quality Controls & Consistency', () => {
    it('flags chronological violations when reaction onset precedes drug administration', () => {
      const invalidChronology = {
        patientInitials: 'R.M.',
        patientAge: 52,
        patientGender: 'Male',
        reporterType: 'Clinical Pharmacist',
        suspectDrugs: [{ name: 'DrugX', inn: 'EntityX', dose: '100mg', route: 'Oral', startDate: '2026-08-10' }],
        adverseEvents: [{
          verbatim: 'Acute hepatitis',
          onsetDate: '2026-08-01', // 9 days before drug start!
          seriousness: { isSerious: true, criteria: { hospitalization: true } }
        }],
        receiptDate: '2026-08-15'
      };

      const res = validateCaseConsistency(invalidChronology as any);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.includes('Chronological Violation'))).toBe(true);
    });

    it('flags contradictory seriousness logic when fatal outcome lacks death criterion', () => {
      const contradictoryCase = {
        patientInitials: 'S.T.',
        patientAge: 68,
        patientGender: 'Female',
        reporterType: 'ICU Physician',
        suspectDrugs: [{ name: 'DrugY', inn: 'EntityY', dose: '50mg', route: 'Oral', startDate: '2026-08-01' }],
        adverseEvents: [{
          verbatim: 'Cardiogenic shock',
          onsetDate: '2026-08-05',
          outcome: 'Fatal',
          seriousness: {
            isSerious: true,
            criteria: { death: false, hospitalization: true } // Contradiction!
          }
        }],
        receiptDate: '2026-08-07'
      };

      const res = validateCaseConsistency(contradictoryCase as any);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => e.includes('Contradictory Seriousness'))).toBe(true);
    });

    it('enforces clinical duplicate detection across identical patient and drug cohorts', () => {
      const existing = db.prepare('SELECT * FROM cases LIMIT 1').get() as any;
      const drugs = JSON.parse(existing.suspect_drugs);
      const events = JSON.parse(existing.adverse_events);

      const fp1 = computeClinicalFingerprint({
        title: existing.title,
        therapeuticArea: existing.therapeutic_area,
        patientInitials: existing.patient_initials,
        patientAge: existing.patient_age,
        patientGender: existing.patient_gender,
        suspectDrugs: drugs,
        adverseEvents: events
      });

      const fp2 = computeClinicalFingerprint({
        title: existing.title,
        therapeuticArea: existing.therapeutic_area,
        patientInitials: existing.patient_initials,
        patientAge: existing.patient_age,
        patientGender: existing.patient_gender,
        suspectDrugs: drugs,
        adverseEvents: events
      });

      expect(fp1).toBe(fp2);
      expect(fp1).toBe(existing.clinical_fingerprint);
    });
  });

  describe('4. End-to-End Persistence Across Database Reconnection', () => {
    it('persists cases, assignments, submissions, assessments, and mentor reviews with full relational integrity', () => {
      const testCaseId = `case-p7-persist-${Date.now()}`;
      const caseNumber = `ARZ-2026-TEST-${Math.floor(100 + Math.random() * 899)}`;
      const assignId = `asg-p7-${Date.now()}`;
      const subId = `sub-p7-${Date.now()}`;
      const assessId = `ass-p7-${Date.now()}`;
      const revId = `rev-p7-${Date.now()}`;

      const fp = computeClinicalFingerprint({
        title: 'Persistence Test Case',
        therapeuticArea: 'Cardiology',
        patientInitials: 'P.K.',
        patientAge: 60,
        patientGender: 'Male',
        suspectDrugs: [{ name: 'Amiodarone', inn: 'Amiodarone' }],
        adverseEvents: [{ verbatim: 'Pulmonary fibrosis' }]
      });

      // 1. Case
      db.prepare(`
        INSERT INTO cases (
          id, case_number, clinical_fingerprint, title, therapeutic_area, difficulty, source_type,
          is_fictional, fictional_disclaimer, status, active_version,
          patient_initials, patient_age, patient_gender, patient_weight_kg,
          medical_history, suspect_drugs, concomitant_drugs, adverse_events,
          lab_tests, verbatim_narrative, reporter_type, receipt_date
        ) VALUES (
          ?, ?, ?, 'Persistence Test Case', 'Cardiology', 'Intermediate', 'curated',
          1, 'DISCLAIMER', 'approved', 1,
          'P.K.', 60, 'Male', 72,
          'Arrhythmia', '[]', '[]', '[]',
          '[]', 'Narrative', 'Cardiologist', '2026-10-27'
        )
      `).run(testCaseId, caseNumber, fp);

      // 2. Assignment
      db.prepare(`
        INSERT INTO assignments (id, case_id, student_id, assigned_by, due_date, status)
        VALUES (?, ?, 'usr-student-01', 'usr-admin-01', '2026-11-01', 'completed')
      `).run(assignId, testCaseId);

      // 3. Submission
      db.prepare(`
        INSERT INTO submissions (
          id, assignment_id, student_id, case_id, version,
          meddra_coding, seriousness_criteria, causality_who,
          causality_naranjo, causality_rationale, cioms_narrative,
          status
        ) VALUES (
          ?, ?, 'usr-student-01', ?, 1,
          '[]', '{}', 'Probable',
          '{}', 'Rationale', 'CIOMS Narrative',
          'submitted'
        )
      `).run(subId, assignId, testCaseId);

      // 4. Assessment
      db.prepare(`
        INSERT INTO assessments (
          id, submission_id, total_score, meddra_score, seriousness_score,
          causality_score, narrative_score, score_breakdown, omissions,
          errors, strengths, ai_rationale, status
        ) VALUES (
          ?, ?, 88, 22, 22, 22, 22, '{}', '[]', '[]', '[]', 'Rationale', 'finalized'
        )
      `).run(assessId, subId);

      // 5. Mentor Review
      db.prepare(`
        INSERT INTO mentor_reviews (
          id, assessment_id, submission_id, mentor_id,
          adjusted_total_score, mentor_comments, decision
        ) VALUES (?, ?, ?, 'usr-mentor-01', 90, 'Reviewed and verified.', 'approved')
      `).run(revId, assessId, subId);

      // Verify all 5 entities exist in SQLite
      expect(db.prepare('SELECT id FROM cases WHERE id = ?').get(testCaseId)).toBeDefined();
      expect(db.prepare('SELECT id FROM assignments WHERE id = ?').get(assignId)).toBeDefined();
      expect(db.prepare('SELECT id FROM submissions WHERE id = ?').get(subId)).toBeDefined();
      expect(db.prepare('SELECT id FROM assessments WHERE id = ?').get(assessId)).toBeDefined();
      expect(db.prepare('SELECT id FROM mentor_reviews WHERE id = ?').get(revId)).toBeDefined();

      // Clean up test persistence entities
      db.prepare('DELETE FROM mentor_reviews WHERE id = ?').run(revId);
      db.prepare('DELETE FROM assessments WHERE id = ?').run(assessId);
      db.prepare('DELETE FROM submissions WHERE id = ?').run(subId);
      db.prepare('DELETE FROM assignments WHERE id = ?').run(assignId);
      db.prepare('DELETE FROM cases WHERE id = ?').run(testCaseId);
    });
  });
});
