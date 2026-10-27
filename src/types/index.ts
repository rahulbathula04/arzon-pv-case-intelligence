export type UserRole = 'admin' | 'mentor' | 'student';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  cohort?: string;
  mustChangePassword?: boolean;
  createdAt: string;
}

export type CaseDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type CaseStatus = 'draft' | 'approved' | 'archived';
export type CaseSourceType = 'ai_generated' | 'pdf_imported' | 'curated';

export interface SuspectDrug {
  name: string;
  inn: string;
  role: 'Suspect' | 'Concomitant' | 'Interacting';
  dose: string;
  route: string;
  frequency: string;
  startDate: string;
  stopDate?: string;
  indication: string;
  actionTaken: 'Drug Withdrawn' | 'Dose Reduced' | 'Dose Not Changed' | 'Unknown' | 'Not Applicable';
  dechallenge: 'Positive' | 'Negative' | 'Not Rechallenged' | 'Inconclusive';
  rechallenge: 'Positive' | 'Negative' | 'Not Done';
}

export interface AdverseEvent {
  verbatim: string;
  meddraPt?: string;
  meddraSoc?: string;
  onsetDate: string;
  resolutionDate?: string;
  outcome: 'Recovered/Resolved' | 'Recovering/Resolving' | 'Not Recovered' | 'Fatal' | 'Recovered with Sequelae' | 'Unknown';
  seriousness: {
    isSerious: boolean;
    criteria: {
      death: boolean;
      lifeThreatening: boolean;
      hospitalization: boolean;
      disability: boolean;
      congenitalAnomaly: boolean;
      otherMedicallyImportant: boolean;
    };
  };
}

export interface LabTest {
  testName: string;
  value: string;
  unit: string;
  normalRange: string;
  testDate: string;
  interpretation?: 'Normal' | 'Elevated' | 'Critical' | 'Low';
}

export interface PVCase {
  id: string;
  caseNumber: string;
  title: string;
  therapeuticArea: string;
  difficulty: CaseDifficulty;
  sourceType: CaseSourceType;
  isFictional: boolean;
  fictionalDisclaimer: string;
  status: CaseStatus;
  activeVersion: number;
  patientInitials: string;
  patientAge: number;
  patientGender: 'Male' | 'Female' | 'Other' | 'Unknown';
  patientWeightKg?: number;
  medicalHistory: string;
  suspectDrugs: SuspectDrug[];
  concomitantDrugs: SuspectDrug[];
  adverseEvents: AdverseEvent[];
  labTests: LabTest[];
  verbatimNarrative: string;
  reporterType: string;
  receiptDate: string;
  createdAt: string;
  updatedAt: string;
  generationMetadata?: GenerationMetadata;
  referenceKey?: ReferenceKey; // Populated only for Admin and Mentor roles
}

export interface GenerationMetadata {
  provider: 'google-gemini' | 'fallback-deterministic';
  model: string;
  generationTimeMs: number;
  promptVersion: string;
  isFallback: boolean;
  setupMessage?: string;
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface StagedCase {
  tempId: string;
  title: string;
  therapeuticArea: string;
  difficulty: CaseDifficulty;
  patientInitials: string;
  patientAge: number;
  patientGender: 'Male' | 'Female' | 'Other' | 'Unknown';
  patientWeightKg?: number;
  medicalHistory: string;
  suspectDrugs: SuspectDrug[];
  concomitantDrugs: SuspectDrug[];
  adverseEvents: AdverseEvent[];
  labTests: LabTest[];
  verbatimNarrative: string;
  reporterType: string;
  receiptDate: string;
  referenceKey: ReferenceKey;
  generationMetadata: GenerationMetadata;
  duplicateCheck?: {
    isDuplicate: boolean;
    existingCaseNumber?: string;
    existingTitle?: string;
  };
}

export interface CaseGenerationRequest {
  therapeuticArea: string;
  difficulty: CaseDifficulty;
  suspectDrug?: string;
  reactionType?: string;
  complexity?: 'Standard' | 'High';
  reporterType?: string;
  caseCount?: number;
  customNotes?: string;
}

export interface ReferenceKey {
  caseId: string;
  expectedMeddraTerms: Array<{
    verbatim: string;
    pt: string;
    soc: string;
    llt?: string;
    rationale?: string;
  }>;
  expectedSeriousness: {
    isSerious: boolean;
    criteria: string[];
    justification: string;
  };
  expectedCausalityWho: 'Certain' | 'Probable' | 'Possible' | 'Unlikely' | 'Conditional' | 'Unassessable';
  expectedNaranjoScore: number;
  expectedNaranjoBreakdown: Record<string, number>;
  modelCiomsNarrative: string;
  gradingRubric: {
    meddraWeight: number;      // e.g. 25
    seriousnessWeight: number; // e.g. 25
    causalityWeight: number;   // e.g. 25
    narrativeWeight: number;   // e.g. 25
    rubricPoints: Array<{
      category: string;
      criterion: string;
      maxPoints: number;
    }>;
  };
}

export interface CaseVersion {
  id: string;
  caseId: string;
  versionNumber: number;
  snapshotJson: string;
  changelog: string;
  createdBy: string;
  authorName?: string;
  createdAt: string;
}

export type AssignmentStatus = 'assigned' | 'in_progress' | 'submitted' | 'completed' | 'overdue';

export interface Assignment {
  id: string;
  caseId: string;
  caseNumber?: string;
  caseTitle?: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  assignedBy: string;
  dueDate: string;
  instructions?: string;
  status: AssignmentStatus;
  createdAt: string;
  submissionId?: string;
  score?: number;
}

export interface StudentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  caseId: string;
  version: number;
  meddraCoding: Array<{
    verbatim: string;
    pt: string;
    soc: string;
    llt?: string;
    justification: string;
  }>;
  seriousnessCriteria: {
    isSerious: boolean;
    criteria: {
      death: boolean;
      lifeThreatening: boolean;
      hospitalization: boolean;
      disability: boolean;
      congenitalAnomaly: boolean;
      otherMedicallyImportant: boolean;
    };
    justification: string;
  };
  causalityWho: 'Certain' | 'Probable' | 'Possible' | 'Unlikely' | 'Conditional' | 'Unassessable';
  causalityNaranjo: {
    answers: Record<string, number>;
    totalScore: number;
    interpretation: 'Definite' | 'Probable' | 'Possible' | 'Doubtful';
  };
  causalityRationale: string;
  ciomsNarrative: string;
  status: 'draft' | 'submitted';
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIAssessment {
  id: string;
  submissionId: string;
  totalScore: number;
  meddraScore: number;
  seriousnessScore: number;
  causalityScore: number;
  narrativeScore: number;
  scoreBreakdown: {
    meddra: { earned: number; max: number; feedback: string };
    seriousness: { earned: number; max: number; feedback: string };
    causality: { earned: number; max: number; feedback: string };
    narrative: { earned: number; max: number; feedback: string };
  };
  omissions: string[];
  errors: string[];
  strengths: string[];
  aiRationale: string;
  status: 'provisional' | 'finalized';
  evaluatedAt: string;
}

export interface MentorReview {
  id: string;
  assessmentId: string;
  submissionId: string;
  mentorId: string;
  mentorName?: string;
  adjustedTotalScore: number;
  mentorComments: string;
  itemOverrides?: Record<string, number>;
  decision: 'approved' | 'revision_requested';
  reviewedAt: string;
}
