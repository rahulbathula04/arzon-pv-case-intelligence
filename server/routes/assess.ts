import { Router } from 'express';
import { db } from '../db/database.js';
import { requireRole } from '../middleware/auth.js';
import { AIAssessment } from '../../src/types/index.js';

export const assessRouter = Router();

// Evaluate a student submission against reference key
export function computeAIEvaluation(submission: any, referenceKey: any): AIAssessment {
  const omissions: string[] = [];
  const errors: string[] = [];
  const strengths: string[] = [];

  // Pillar 1: MedDRA Coding (Max 25 pts)
  let meddraScore = 0;
  const expectedTerms: Array<{ pt: string; soc: string; verbatim: string }> = JSON.parse(referenceKey.expected_meddra_terms || '[]');
  const studentTerms: Array<{ pt: string; soc: string; verbatim: string }> = JSON.parse(submission.meddra_coding || '[]');

  if (studentTerms.length === 0) {
    omissions.push('No MedDRA terms were coded by the student.');
  } else {
    let matchedPts = 0;
    for (const exp of expectedTerms) {
      const found = studentTerms.find(st => 
        st.pt?.toLowerCase().trim() === exp.pt?.toLowerCase().trim()
      );
      if (found) {
        matchedPts++;
        strengths.push(`Accurately identified and coded MedDRA PT: "${exp.pt}".`);
      } else {
        omissions.push(`Missed expected MedDRA Preferred Term (PT): "${exp.pt}" for verbatim "${exp.verbatim}".`);
      }
    }

    const matchRatio = expectedTerms.length > 0 ? (matchedPts / expectedTerms.length) : 1;
    meddraScore = Math.round(matchRatio * 25);
  }

  // Pillar 2: Seriousness Determination (Max 25 pts)
  let seriousnessScore = 25;
  const expectedSeriousness = JSON.parse(referenceKey.expected_seriousness || '{}');
  const studentSeriousness = JSON.parse(submission.seriousness_criteria || '{}');

  const studentIsSerious = studentSeriousness.isSerious;
  const expectedIsSerious = expectedSeriousness.isSerious;

  if (studentIsSerious !== expectedIsSerious) {
    seriousnessScore -= 15;
    errors.push(`Incorrect overall seriousness classification: marked as ${studentIsSerious ? 'Serious' : 'Non-Serious'} instead of ${expectedIsSerious ? 'Serious' : 'Non-Serious'}.`);
  } else {
    strengths.push(`Correctly identified overall case as ${expectedIsSerious ? 'Serious' : 'Non-Serious'}.`);
  }

  // Check specific criteria
  const expCriteria: string[] = expectedSeriousness.criteria || [];
  const studCriteria = studentSeriousness.criteria || {};
  for (const crit of expCriteria) {
    const key = crit === 'life_threatening' ? 'lifeThreatening' : crit;
    if (!studCriteria[key]) {
      seriousnessScore = Math.max(0, seriousnessScore - 5);
      omissions.push(`Omitted regulatory seriousness criterion: "${crit.replace('_', ' ')}".`);
    } else {
      strengths.push(`Correctly flagged seriousness criterion: "${crit.replace('_', ' ')}".`);
    }
  }

  // Pillar 3: Causality Assessment (Max 25 pts)
  let causalityScore = 20;
  const expectedWho = referenceKey.expected_causality_who;
  const studentWho = submission.causality_who;

  if (studentWho === expectedWho) {
    causalityScore += 5;
    strengths.push(`WHO-UMC causality category perfectly matches reference standard ("${expectedWho}").`);
  } else if ((studentWho === 'Probable' && expectedWho === 'Certain') || (studentWho === 'Certain' && expectedWho === 'Probable')) {
    causalityScore += 2;
    strengths.push(`Close alignment with WHO-UMC category (selected "${studentWho}", expected "${expectedWho}").`);
  } else {
    causalityScore -= 10;
    errors.push(`WHO-UMC category discrepancy: selected "${studentWho}" versus benchmark "${expectedWho}".`);
  }

  // Naranjo check
  const studentNaranjo = JSON.parse(submission.causality_naranjo || '{}');
  const expectedNaranjo = referenceKey.expected_naranjo_score;
  const scoreDiff = Math.abs((studentNaranjo.totalScore || 0) - expectedNaranjo);

  if (scoreDiff <= 1) {
    strengths.push(`Naranjo calculation (${studentNaranjo.totalScore}) aligns with reference standard (${expectedNaranjo}).`);
  } else {
    causalityScore = Math.max(0, causalityScore - Math.min(scoreDiff * 2, 8));
    errors.push(`Naranjo score divergence: calculated ${studentNaranjo.totalScore} vs expected score of ${expectedNaranjo}.`);
  }

  // Pillar 4: CIOMS Narrative Quality (Max 25 pts)
  let narrativeScore = 20;
  const narrative = (submission.cioms_narrative || '').trim();
  const wordCount = narrative ? narrative.split(/\s+/).length : 0;

  if (wordCount < 40) {
    narrativeScore = Math.min(10, Math.round(wordCount / 4));
    errors.push('CIOMS-I narrative is critically underdeveloped (fewer than 40 words).');
  } else if (wordCount >= 90) {
    narrativeScore = 25;
    strengths.push('Comprehensive, chronological CIOMS narrative incorporating patient history, drug kinetics, and dechallenge.');
  } else {
    narrativeScore = 21;
    strengths.push('Adequate narrative structure covering core chronological events.');
  }

  const totalScore = Math.min(100, Math.max(0, meddraScore + seriousnessScore + causalityScore + narrativeScore));

  const assessmentId = `assess-${Date.now()}`;
  return {
    id: assessmentId,
    submissionId: submission.id,
    totalScore,
    meddraScore,
    seriousnessScore,
    causalityScore,
    narrativeScore,
    scoreBreakdown: {
      meddra: { earned: meddraScore, max: 25, feedback: `${meddraScore}/25 pts based on MedDRA PT/SOC accuracy.` },
      seriousness: { earned: seriousnessScore, max: 25, feedback: `${seriousnessScore}/25 pts based on ICH E2A criteria identification.` },
      causality: { earned: causalityScore, max: 25, feedback: `${causalityScore}/25 pts based on WHO-UMC & Naranjo calculation.` },
      narrative: { earned: narrativeScore, max: 25, feedback: `${narrativeScore}/25 pts based on chronological narrative quality.` }
    },
    omissions,
    errors,
    strengths,
    aiRationale: `Automated 4-pillar evaluation against clinical reference key. Overall provisional score: ${totalScore}%. This assessment is provisional until confirmed or adjusted by a faculty mentor.`,
    status: 'provisional',
    evaluatedAt: new Date().toISOString()
  };
}

// POST /api/assess/evaluate/:submissionId - Trigger AI assessment for a submission
assessRouter.post('/evaluate/:submissionId', (req, res) => {
  const { submissionId } = req.params;

  const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId) as any;
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  const refKey = db.prepare('SELECT * FROM reference_keys WHERE case_id = ?').get(submission.case_id) as any;
  if (!refKey) {
    return res.status(404).json({ error: 'Reference key for case not found' });
  }

  const assessment = computeAIEvaluation(submission, refKey);

  // Upsert into assessments table
  const existing = db.prepare('SELECT id FROM assessments WHERE submission_id = ?').get(submissionId) as any;
  if (existing) {
    db.prepare(`
      UPDATE assessments SET
        total_score = ?,
        meddra_score = ?,
        seriousness_score = ?,
        causality_score = ?,
        narrative_score = ?,
        score_breakdown = ?,
        omissions = ?,
        errors = ?,
        strengths = ?,
        ai_rationale = ?,
        status = 'provisional',
        evaluated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      assessment.totalScore, assessment.meddraScore, assessment.seriousnessScore,
      assessment.causalityScore, assessment.narrativeScore,
      JSON.stringify(assessment.scoreBreakdown),
      JSON.stringify(assessment.omissions),
      JSON.stringify(assessment.errors),
      JSON.stringify(assessment.strengths),
      assessment.aiRationale,
      existing.id
    );
    assessment.id = existing.id;
  } else {
    db.prepare(`
      INSERT INTO assessments (
        id, submission_id, total_score, meddra_score, seriousness_score,
        causality_score, narrative_score, score_breakdown, omissions,
        errors, strengths, ai_rationale, status
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, 'provisional'
      )
    `).run(
      assessment.id, assessment.submissionId, assessment.totalScore,
      assessment.meddraScore, assessment.seriousnessScore,
      assessment.causalityScore, assessment.narrativeScore,
      JSON.stringify(assessment.scoreBreakdown),
      JSON.stringify(assessment.omissions),
      JSON.stringify(assessment.errors),
      JSON.stringify(assessment.strengths),
      assessment.aiRationale
    );
  }

  res.json({ success: true, assessment });
});

// GET /api/assess/submission/:submissionId - Fetch assessment
assessRouter.get('/submission/:submissionId', (req, res) => {
  const { submissionId } = req.params;
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Verify student ownership
  if (user.role === 'student') {
    const sub = db.prepare('SELECT student_id FROM submissions WHERE id = ?').get(submissionId) as any;
    if (sub && sub.student_id !== user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: You cannot view evaluation reports for another student\'s submission.'
      });
    }
  }

  const row = db.prepare('SELECT * FROM assessments WHERE submission_id = ?').get(submissionId) as any;
  if (!row) {
    return res.json({ assessment: null });
  }

  // If student and assessment is still provisional, hide until mentor approved
  if (user?.role === 'student' && row.status === 'provisional') {
    return res.json({
      assessment: {
        status: 'provisional',
        message: 'Your submission is undergoing mentor review. Scores and evaluation feedback will be released upon mentor approval.'
      }
    });
  }

  const assessment: AIAssessment = {
    id: row.id,
    submissionId: row.submission_id,
    totalScore: row.total_score,
    meddraScore: row.meddra_score,
    seriousnessScore: row.seriousness_score,
    causalityScore: row.causality_score,
    narrativeScore: row.narrative_score,
    scoreBreakdown: JSON.parse(row.score_breakdown || '{}'),
    omissions: JSON.parse(row.omissions || '[]'),
    errors: JSON.parse(row.errors || '[]'),
    strengths: JSON.parse(row.strengths || '[]'),
    aiRationale: row.ai_rationale,
    status: row.status,
    evaluatedAt: row.evaluated_at
  };

  res.json({ assessment });
});
