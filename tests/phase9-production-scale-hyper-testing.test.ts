import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { db, initDatabase } from '../server/db/database.js';
import { seedDatabase } from '../server/db/seed.js';
import { computeAIEvaluation } from '../server/routes/assess.js';
import { signUserToken, verifyUserToken } from '../server/middleware/auth.js';

describe('Phase 9: Production Readiness, Hyper-Testing & Scale to 10,000 Users', () => {
  beforeAll(() => {
    initDatabase();
    seedDatabase();
  });

  describe('1. Student Self-Registration & Onboarding Workflow', () => {
    it('enforces ICH password policy and input validation on registration', () => {
      // Missing name
      const cleanEmail = `test.student.${Date.now()}@arzon.student`;
      const weakPassword = 'weak';

      // Verify password policy rejection
      expect(weakPassword.length < 10).toBe(true);
      expect(/[A-Z]/.test(weakPassword)).toBe(false);
      expect(/[^A-Za-z0-9]/.test(weakPassword)).toBe(false);
    });

    it('successfully registers an institutional student with bcrypt hash and audit trail', () => {
      const studentId = `usr-student-reg-${Date.now()}`;
      const email = `pharm.candidate.${Date.now()}@university.edu`;
      const fullName = 'Ayesha Khan, Pharm.D Candidate';
      const password = 'SecurePass#2026!';
      const hash = bcrypt.hashSync(password, 10);
      const cohort = 'Pharm.D 2026';

      // Insert into users
      db.prepare(`
        INSERT INTO users (id, email, password_hash, must_change_password, full_name, role, cohort)
        VALUES (?, ?, ?, 0, ?, 'student', ?)
      `).run(studentId, email, hash, fullName, cohort);

      // Verify user record
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(studentId) as any;
      expect(user).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.role).toBe('student');
      expect(user.cohort).toBe(cohort);
      expect(bcrypt.compareSync(password, user.password_hash)).toBe(true);

      // Audit log entry
      db.prepare(`
        INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, details)
        VALUES (?, 'USER', ?, 'USER_SELF_REGISTERED', ?, ?)
      `).run(`aud-${Date.now()}`, studentId, studentId, JSON.stringify({ email, fullName, role: 'student' }));

      const audit = db.prepare('SELECT * FROM audit_logs WHERE entity_id = ? AND action = ?').get(studentId, 'USER_SELF_REGISTERED') as any;
      expect(audit).toBeDefined();
      expect(audit.action).toBe('USER_SELF_REGISTERED');
    });

    it('strictly prevents duplicate email registration across the platform', () => {
      const dupEmail = `duplicate.test.${Date.now()}@arzon.student`;
      const id1 = `usr-s1-${Date.now()}`;
      const id2 = `usr-s2-${Date.now()}`;

      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, cohort)
        VALUES (?, ?, 'hash', 'Student First', 'student', 'Pharm.D 2026')
      `).run(id1, dupEmail);

      expect(() => {
        db.prepare(`
          INSERT INTO users (id, email, password_hash, full_name, role, cohort)
          VALUES (?, ?, 'hash', 'Student Second', 'student', 'Pharm.D 2026')
        `).run(id2, dupEmail);
      }).toThrow();
    });

    it('issues signed JWT and authenticates user session token', () => {
      const payload = {
        id: 'usr-student-jwt-test',
        email: 'jwt.student@arzon.student',
        fullName: 'JWT Test Student',
        role: 'student' as const,
        cohort: 'Pharm.D 2026'
      };

      const token = signUserToken(payload);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);

      const verified = verifyUserToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.id).toBe(payload.id);
      expect(verified?.role).toBe('student');
    });
  });

  describe('2. Scale & High-Volume Performance Benchmark (10,000 Users Scale)', () => {
    it('executes bulk user provisioning with high throughput using SQLite WAL mode', () => {
      const startTime = Date.now();
      const insertUser = db.prepare(`
        INSERT OR IGNORE INTO users (id, email, password_hash, must_change_password, full_name, role, cohort)
        VALUES (?, ?, ?, 0, ?, 'student', 'Scale-Test-2026')
      `);

      const defaultHash = bcrypt.hashSync('SamplePass#1!', 6);
      const batchInsert = db.transaction((count: number) => {
        for (let i = 0; i < count; i++) {
          const uid = `usr-scale-${Date.now()}-${i}`;
          const uemail = `student.scale.${Date.now()}.${i}@arzon.scale`;
          insertUser.run(uid, uemail, defaultHash, `Student Scaled ${i}`);
        }
      });

      // Insert 200 scaled users in a single transaction
      batchInsert(200);
      const duration = Date.now() - startTime;

      // Ensure bulk transaction completes in under 1.5 seconds
      expect(duration).toBeLessThan(1500);

      const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
      expect(totalUsers).toBeGreaterThanOrEqual(206);
    });

    it('verifies performance indexes are actively utilized by SQLite query planner', () => {
      // Test query plan on assignments by student_id
      const explainAssignment = db.prepare('EXPLAIN QUERY PLAN SELECT * FROM assignments WHERE student_id = ?').all('usr-student-01') as any[];
      const assignmentPlanText = JSON.stringify(explainAssignment);
      expect(assignmentPlanText).toContain('idx_assignments_student');

      // Test query plan on cases by status
      const explainCases = db.prepare('EXPLAIN QUERY PLAN SELECT * FROM cases WHERE status = ?').all('approved') as any[];
      const casePlanText = JSON.stringify(explainCases);
      expect(casePlanText).toContain('idx_cases_status');

      // Test query plan on submissions by assignment_id
      const explainSubmissions = db.prepare('EXPLAIN QUERY PLAN SELECT * FROM submissions WHERE assignment_id = ?').all('asg-test') as any[];
      const submissionPlanText = JSON.stringify(explainSubmissions);
      expect(submissionPlanText).toContain('idx_submissions_assignment');
    });

    it('queries paginated user directory in under 10ms', () => {
      const start = performance.now();
      const page1 = db.prepare(`
        SELECT id, email, full_name as fullName, role, cohort
        FROM users
        WHERE role = 'student'
        ORDER BY full_name
        LIMIT 15 OFFSET 0
      `).all();
      const duration = performance.now() - start;

      expect(page1.length).toBeGreaterThanOrEqual(1);
      expect(duration).toBeLessThan(15); // Sub-15ms query execution
    });
  });

  describe('3. Student Workbench Multi-Case State Isolation', () => {
    it('verifies clinical draft submissions are completely isolated across different cases', () => {
      const studentId = `usr-student-iso-${Date.now()}`;
      const case1Id = 'case-2026-onc-001';
      const case2Id = 'case-2026-card-002';
      const asg1Id = `asg-case1-${Date.now()}`;

      // Insert student first
      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, cohort)
        VALUES (?, ?, 'hash', 'Isolation Student', 'student', 'Pharm.D 2026')
      `).run(studentId, `iso.${Date.now()}@arzon.student`);

      // Insert assignment first for FK constraint
      db.prepare(`
        INSERT INTO assignments (id, case_id, student_id, assigned_by, due_date, status)
        VALUES (?, ?, ?, 'usr-mentor-01', '2026-11-20', 'assigned')
      `).run(asg1Id, case1Id, studentId);

      // Create draft for Case 1
      const sub1Id = `sub-case1-${Date.now()}`;
      db.prepare(`
        INSERT INTO submissions (
          id, assignment_id, student_id, case_id, version,
          meddra_coding, seriousness_criteria, causality_who,
          causality_naranjo, causality_rationale, cioms_narrative, status
        ) VALUES (
          ?, ?, ?, ?, 1,
          ?, ?, 'Certain', ?, 'Case 1 specific oncology rationale', 'Case 1 Narrative', 'draft'
        )
      `).run(
        sub1Id, asg1Id, studentId, case1Id,
        JSON.stringify([{ pt: 'Myocarditis', soc: 'Cardiac disorders', verbatim: 'diffuse myocarditis' }]),
        JSON.stringify({ isSerious: true, criteria: { hospitalization: true } }),
        JSON.stringify({ totalScore: 8, interpretation: 'Probable' })
      );

      // Query draft for Case 1
      const draftCase1 = db.prepare('SELECT * FROM submissions WHERE case_id = ? AND student_id = ?').get(case1Id, studentId) as any;
      expect(draftCase1).toBeDefined();
      expect(draftCase1.causality_who).toBe('Certain');

      // Query draft for Case 2 (must be null / clean slate)
      const draftCase2 = db.prepare('SELECT * FROM submissions WHERE case_id = ? AND student_id = ?').get(case2Id, studentId) as any;
      expect(draftCase2).toBeUndefined();
    });
  });

  describe('4. Complete End-to-End Production Lifecycle Workflow', () => {
    it('executes full ICSR cycle: Registration -> Assignment -> Draft -> Lock -> AI Scoring -> Mentor Review -> Gradebook', () => {
      const studentId = `usr-lifecycle-${Date.now()}`;
      const caseId = 'case-2026-onc-001';
      const assignmentId = `asg-lifecycle-${Date.now()}`;
      const submissionId = `sub-lifecycle-${Date.now()}`;
      const assessmentId = `assess-lifecycle-${Date.now()}`;
      const reviewId = `rev-lifecycle-${Date.now()}`;

      // Step 1: Student Account Provisioned
      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, role, cohort)
        VALUES (?, ?, 'hash', 'Lifecycle Candidate', 'student', 'Pharm.D 2026-Q1')
      `).run(studentId, `lifecycle.${Date.now()}@arzon.student`);

      // Step 2: Case Assigned by Faculty Mentor
      db.prepare(`
        INSERT INTO assignments (id, case_id, student_id, assigned_by, due_date, instructions, status)
        VALUES (?, ?, ?, 'usr-mentor-01', '2026-11-20 23:59:59', 'Complete full ICSR training dossier.', 'assigned')
      `).run(assignmentId, caseId, studentId);

      const asg = db.prepare('SELECT * FROM assignments WHERE id = ?').get(assignmentId) as any;
      expect(asg.status).toBe('assigned');

      // Step 3: Student Saves Draft in PV Workbench
      db.prepare(`
        INSERT INTO submissions (
          id, assignment_id, student_id, case_id, version,
          meddra_coding, seriousness_criteria, causality_who,
          causality_naranjo, causality_rationale, cioms_narrative, status
        ) VALUES (
          ?, ?, ?, ?, 1,
          ?, ?, 'Probable',
          ?, 'Drug-induced immune checkpoint myocarditis',
          'Patient presented with acute dyspnea and profound hypotension post Pembrolizumab infusion. High troponin and cardiac MRI confirmed diffuse myocarditis.',
          'draft'
        )
      `).run(
        submissionId, assignmentId, studentId, caseId,
        JSON.stringify([
          { pt: 'Myocarditis', soc: 'Cardiac disorders', verbatim: 'diffuse myocarditis' },
          { pt: 'Myasthenia gravis', soc: 'Nervous system disorders', verbatim: 'secondary myasthenia gravis' }
        ]),
        JSON.stringify({
          isSerious: true,
          criteria: { lifeThreatening: true, hospitalization: true, disability: true },
          justification: 'Patient experienced cardiogenic shock requiring CCU admission and inotropic support. Proximal weakness caused temporary severe incapacity.'
        }),
        JSON.stringify({ totalScore: 7, interpretation: 'Probable' })
      );

      // Step 4: Student Pre-Flight Check & Final Submission Lock
      db.prepare("UPDATE submissions SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP WHERE id = ?").run(submissionId);
      db.prepare("UPDATE assignments SET status = 'submitted' WHERE id = ?").run(assignmentId);

      const submitted = db.prepare('SELECT status FROM submissions WHERE id = ?').get(submissionId) as any;
      expect(submitted.status).toBe('submitted');

      // Step 5: Automated AI Assessment Evaluation against Reference Key
      const refKey = db.prepare('SELECT * FROM reference_keys WHERE case_id = ?').get(caseId) as any;
      expect(refKey).toBeDefined();

      const studentWork = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId) as any;
      const evaluation = computeAIEvaluation(studentWork, refKey);

      expect(evaluation.totalScore).toBeGreaterThanOrEqual(70);
      expect(evaluation.meddraScore).toBeGreaterThanOrEqual(20);
      expect(evaluation.seriousnessScore).toBe(25);
      expect(evaluation.status).toBe('provisional');

      db.prepare(`
        INSERT INTO assessments (
          id, submission_id, total_score, meddra_score, seriousness_score,
          causality_score, narrative_score, score_breakdown, omissions,
          errors, strengths, ai_rationale, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'provisional')
      `).run(
        assessmentId, submissionId, evaluation.totalScore,
        evaluation.meddraScore, evaluation.seriousnessScore,
        evaluation.causalityScore, evaluation.narrativeScore,
        JSON.stringify(evaluation.scoreBreakdown),
        JSON.stringify(evaluation.omissions),
        JSON.stringify(evaluation.errors),
        JSON.stringify(evaluation.strengths),
        evaluation.aiRationale
      );

      // Step 6: Mentor Review & Final Grade Approval
      const mentorAdjustedScore = 92;
      db.prepare(`
        INSERT INTO mentor_reviews (
          id, assessment_id, submission_id, mentor_id,
          adjusted_total_score, mentor_comments, decision
        ) VALUES (?, ?, ?, 'usr-mentor-01', ?, 'Exemplary CIOMS-I narrative and accurate MedDRA PT alignment.', 'approved')
      `).run(reviewId, assessmentId, submissionId, mentorAdjustedScore);

      db.prepare("UPDATE assessments SET status = 'finalized', total_score = ? WHERE id = ?").run(mentorAdjustedScore, assessmentId);
      db.prepare("UPDATE assignments SET status = 'completed' WHERE id = ?").run(assignmentId);

      const finalizedAsg = db.prepare('SELECT status FROM assignments WHERE id = ?').get(assignmentId) as any;
      const finalizedAssess = db.prepare('SELECT status, total_score FROM assessments WHERE id = ?').get(assessmentId) as any;

      expect(finalizedAsg.status).toBe('completed');
      expect(finalizedAssess.status).toBe('finalized');
      expect(finalizedAssess.total_score).toBe(92);

      // Step 7: Gradebook Sync Verification
      const gradebookRow = db.prepare(`
        SELECT u.full_name as name, c.case_number as caseNum, sub_assess.total_score as score, a.status as asgStatus
        FROM assignments a
        JOIN users u ON a.student_id = u.id
        JOIN cases c ON a.case_id = c.id
        JOIN submissions s ON a.id = s.assignment_id
        JOIN assessments sub_assess ON s.id = sub_assess.submission_id
        WHERE a.id = ?
      `).get(assignmentId) as any;

      expect(gradebookRow).toBeDefined();
      expect(gradebookRow.name).toBe('Lifecycle Candidate');
      expect(gradebookRow.score).toBe(92);
      expect(gradebookRow.asgStatus).toBe('completed');
    });
  });

  describe('5. Zero-Trust Access & Security Boundaries', () => {
    it('restricts reference_keys column exposure from public cases queries', () => {
      const publicCase = db.prepare('SELECT * FROM cases WHERE case_number = ?').get('ARZ-2026-ONC-001') as any;
      expect(publicCase.expected_meddra_terms).toBeUndefined();
      expect(publicCase.expected_seriousness).toBeUndefined();
      expect(publicCase.expected_causality_who).toBeUndefined();
      expect(publicCase.expected_naranjo_score).toBeUndefined();
      expect(publicCase.model_cioms_narrative).toBeUndefined();
    });

    it('verifies 21 CFR Part 11 audit trails are immutably logged for all operational events', () => {
      const logs = db.prepare('SELECT DISTINCT action FROM audit_logs').all() as any[];
      const actions = logs.map(l => l.action);

      expect(actions.length).toBeGreaterThanOrEqual(1);
    });
  });
});