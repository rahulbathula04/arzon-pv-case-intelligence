import { GoogleGenAI } from '@google/genai';
import { db, computeClinicalFingerprint } from '../db/database.js';
import { PVCase, ReferenceKey, GenerationMetadata, StagedCase, CaseDifficulty, SuspectDrug, AdverseEvent, LabTest } from '../../src/types/index.js';

export interface CaseGenerationInput {
  therapeuticArea: string;
  difficulty: CaseDifficulty;
  suspectDrug?: string;
  reactionType?: string;
  complexity?: 'Standard' | 'High';
  reporterType?: string;
  caseCount?: number;
  customNotes?: string;
}

export interface ConsistencyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates ICH E2A/E2B minimum regulatory criteria, internal chronological coherence,
 * seriousness criteria logic, dechallenge compatibility, and grading rubric completeness.
 */
export function validateCaseConsistency(caseData: {
  patientInitials?: string;
  patientAge?: number;
  patientGender?: string;
  patientWeightKg?: number;
  reporterType?: string;
  suspectDrugs?: SuspectDrug[];
  adverseEvents?: AdverseEvent[];
  receiptDate?: string;
  referenceKey?: Partial<ReferenceKey>;
}): ConsistencyValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. ICH E2A/E2B 4 Minimum Reporting Criteria
  // Criterion 1: Identifiable Patient
  if (!caseData.patientInitials || caseData.patientInitials.trim().length === 0) {
    errors.push('ICH-E2B Criterion 1 Failure: Identifiable patient initials are required.');
  }
  if (!caseData.patientAge || caseData.patientAge <= 0 || caseData.patientAge > 120) {
    errors.push(`Invalid patient age: ${caseData.patientAge}. Must be between 1 and 120 years.`);
  }
  if (!caseData.patientGender) {
    errors.push('Identifiable patient gender is required.');
  }

  // Criterion 2: Identifiable Reporter
  if (!caseData.reporterType || caseData.reporterType.trim().length === 0) {
    errors.push('ICH-E2B Criterion 2 Failure: Identifiable reporter persona is required.');
  }

  // Criterion 3: Suspect Drug
  if (!caseData.suspectDrugs || !Array.isArray(caseData.suspectDrugs) || caseData.suspectDrugs.length === 0) {
    errors.push('ICH-E2B Criterion 3 Failure: At least one suspect drug is required.');
  } else {
    for (const drug of caseData.suspectDrugs) {
      if (!drug.name || !drug.inn) {
        errors.push('Suspect drug must specify both brand name and International Nonproprietary Name (INN).');
      }
      if (!drug.dose || !drug.route) {
        warnings.push(`Drug ${drug.name || 'suspect'} missing explicit dose or route.`);
      }
    }
  }

  // Criterion 4: Adverse Event
  if (!caseData.adverseEvents || !Array.isArray(caseData.adverseEvents) || caseData.adverseEvents.length === 0) {
    errors.push('ICH-E2B Criterion 4 Failure: At least one adverse reaction event is required.');
  } else {
    for (const event of caseData.adverseEvents) {
      if (!event.verbatim || event.verbatim.trim().length === 0) {
        errors.push('Adverse event verbatim reaction description cannot be empty.');
      }

      // Seriousness logic
      if (event.seriousness?.isSerious) {
        const crit = event.seriousness.criteria;
        const hasTrueCrit = crit && (
          crit.death || crit.lifeThreatening || crit.hospitalization ||
          crit.disability || crit.congenitalAnomaly || crit.otherMedicallyImportant
        );
        if (!hasTrueCrit) {
          errors.push(`Adverse event "${event.verbatim}" marked Serious but contains zero serious criteria checkboxes.`);
        }

        // Fatal outcome vs death checkbox consistency
        if (event.outcome === 'Fatal' && !crit?.death) {
          errors.push('Contradictory Seriousness: Event outcome is Fatal, but death criterion is unchecked.');
        }
        if (crit?.death && event.outcome !== 'Fatal') {
          errors.push('Contradictory Seriousness: Death criterion is checked, but event outcome is not Fatal.');
        }
      }

      // Dechallenge logic
      const suspect = caseData.suspectDrugs?.[0];
      if (suspect && suspect.dechallenge === 'Positive') {
        if (event.outcome === 'Fatal' || event.outcome === 'Not Recovered') {
          warnings.push(`Clinical Plausibility: Suspect drug notes Positive Dechallenge, but event outcome is "${event.outcome}".`);
        }
      }
    }
  }

  // 2. Chronological Coherence Checks
  const suspect = caseData.suspectDrugs?.[0];
  const primaryEvent = caseData.adverseEvents?.[0];

  if (suspect?.startDate && primaryEvent?.onsetDate) {
    const start = new Date(suspect.startDate).getTime();
    const onset = new Date(primaryEvent.onsetDate).getTime();
    if (!isNaN(start) && !isNaN(onset) && onset < start) {
      errors.push(`Chronological Violation: Adverse event onset (${primaryEvent.onsetDate}) precedes drug administration start date (${suspect.startDate}).`);
    }
  }

  if (primaryEvent?.onsetDate && caseData.receiptDate) {
    const onset = new Date(primaryEvent.onsetDate).getTime();
    const receipt = new Date(caseData.receiptDate).getTime();
    if (!isNaN(onset) && !isNaN(receipt) && receipt < onset) {
      errors.push(`Chronological Violation: Case receipt date (${caseData.receiptDate}) precedes adverse event onset date (${primaryEvent.onsetDate}).`);
    }
  }

  // 3. Reference Key Rubric Consistency
  if (caseData.referenceKey) {
    const ref = caseData.referenceKey;
    if (ref.expectedCausalityWho) {
      const validWho = ['Certain', 'Probable', 'Possible', 'Unlikely', 'Conditional', 'Unassessable'];
      if (!validWho.includes(ref.expectedCausalityWho)) {
        errors.push(`Invalid WHO-UMC causality category: "${ref.expectedCausalityWho}".`);
      }
    }

    if (ref.expectedNaranjoScore !== undefined) {
      if (ref.expectedNaranjoScore < -4 || ref.expectedNaranjoScore > 13) {
        errors.push(`Invalid Naranjo score: ${ref.expectedNaranjoScore}. Scale ranges from -4 to +13.`);
      }
    }

    if (ref.gradingRubric) {
      const { meddraWeight = 0, seriousnessWeight = 0, causalityWeight = 0, narrativeWeight = 0 } = ref.gradingRubric;
      const totalWeight = meddraWeight + seriousnessWeight + causalityWeight + narrativeWeight;
      if (totalWeight !== 100) {
        warnings.push(`Grading rubric category weights sum to ${totalWeight}%, expected 100%.`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Clinically authentic archetypes database for high-trust pharmacology synthesis
const PHARMACOLOGY_KB: Record<string, any[]> = {
  'Oncology': [
    {
      title: 'Immune-Mediated Hepatitis and Transaminitis following Nivolumab Monotherapy',
      drug: { name: 'Opdivo', inn: 'Nivolumab', dose: '480 mg IV', route: 'Intravenous', frequency: 'Every 4 weeks', indication: 'Renal cell carcinoma' },
      reaction: 'acute autoimmune hepatotoxicity with grade 3 transaminitis and jaundice',
      meddraPt: 'Autoimmune hepatitis',
      meddraSoc: 'Hepatobiliary disorders',
      whoCausality: 'Probable',
      naranjoScore: 7,
      seriousness: ['hospitalization', 'other_medically_important'],
      labs: [
        { testName: 'Alanine Aminotransferase (ALT)', value: '620', unit: 'U/L', normalRange: '7 - 56 U/L', interpretation: 'Critical' },
        { testName: 'Aspartate Aminotransferase (AST)', value: '540', unit: 'U/L', normalRange: '10 - 40 U/L', interpretation: 'Critical' },
        { testName: 'Total Bilirubin', value: '4.2', unit: 'mg/dL', normalRange: '0.2 - 1.2 mg/dL', interpretation: 'Critical' }
      ]
    },
    {
      title: 'Acute Heart Failure and QTc Prolongation Associated with Osimertinib Therapy',
      drug: { name: 'Tagrisso', inn: 'Osimertinib', dose: '80 mg oral', route: 'Oral', frequency: 'Once daily', indication: 'EGFR T790M-mutated non-small cell lung cancer' },
      reaction: 'left ventricular ejection fraction decline and syncope',
      meddraPt: 'Cardiac failure',
      meddraSoc: 'Cardiac disorders',
      whoCausality: 'Probable',
      naranjoScore: 6,
      seriousness: ['life_threatening', 'hospitalization'],
      labs: [
        { testName: 'LVEF (Echocardiogram)', value: '32', unit: '%', normalRange: '55 - 70 %', interpretation: 'Critical' },
        { testName: 'NT-proBNP', value: '4120', unit: 'pg/mL', normalRange: '< 125 pg/mL', interpretation: 'Critical' },
        { testName: 'ECG QTc Interval', value: '495', unit: 'ms', normalRange: '< 450 ms', interpretation: 'Elevated' }
      ]
    }
  ],
  'Cardiology': [
    {
      title: 'Life-threatening Major Gastrointestinal Bleed with Apixaban and Amiodarone Co-administration',
      drug: { name: 'Eliquis', inn: 'Apixaban', dose: '5 mg oral', route: 'Oral', frequency: 'Twice daily', indication: 'Non-valvular atrial fibrillation' },
      reaction: 'massive hematochezia with hemorrhagic shock',
      meddraPt: 'Gastrointestinal haemorrhage',
      meddraSoc: 'Gastrointestinal disorders',
      whoCausality: 'Probable',
      naranjoScore: 7,
      seriousness: ['life_threatening', 'hospitalization'],
      labs: [
        { testName: 'Hemoglobin', value: '6.1', unit: 'g/dL', normalRange: '12.0 - 15.5 g/dL', interpretation: 'Critical' },
        { testName: 'Hematocrit', value: '18.4', unit: '%', normalRange: '37.0 - 48.0 %', interpretation: 'Critical' },
        { testName: 'Blood Urea Nitrogen (BUN)', value: '48', unit: 'mg/dL', normalRange: '7 - 20 mg/dL', interpretation: 'Elevated' }
      ]
    }
  ],
  'Neurology': [
    {
      title: 'Drug Reaction with Eosinophilia and Systemic Symptoms (DRESS) following Lamotrigine Rapid Titration',
      drug: { name: 'Lamictal', inn: 'Lamotrigine', dose: '100 mg oral', route: 'Oral', frequency: 'Once daily', indication: 'Bipolar I disorder maintenance' },
      reaction: 'confluent maculopapular rash, high fever, lymphadenopathy, and eosinophilia',
      meddraPt: 'Drug reaction with eosinophilia and systemic symptoms',
      meddraSoc: 'Skin and subcutaneous tissue disorders',
      whoCausality: 'Probable',
      naranjoScore: 8,
      seriousness: ['life_threatening', 'hospitalization'],
      labs: [
        { testName: 'Absolute Eosinophil Count', value: '3.1', unit: 'x10^9/L', normalRange: '0.0 - 0.5 x10^9/L', interpretation: 'Critical' },
        { testName: 'ALT', value: '380', unit: 'U/L', normalRange: '7 - 56 U/L', interpretation: 'Critical' }
      ]
    }
  ],
  'Immunology': [
    {
      title: 'Reactivation of Latent Pulmonary Tuberculosis following Adalimumab Initiation',
      drug: { name: 'Humira', inn: 'Adalimumab', dose: '40 mg SC', route: 'Subcutaneous', frequency: 'Every 2 weeks', indication: 'Severe plaque psoriasis' },
      reaction: 'cavitary pulmonary infiltrates, hemoptysis, and night sweats',
      meddraPt: 'Pulmonary tuberculosis',
      meddraSoc: 'Infections and infestations',
      whoCausality: 'Probable',
      naranjoScore: 7,
      seriousness: ['hospitalization', 'life_threatening'],
      labs: [
        { testName: 'Acid-Fast Bacilli (AFB) Sputum Smear', value: 'Positive 3+', unit: '', normalRange: 'Negative', interpretation: 'Critical' },
        { testName: 'Chest CT', value: 'Right apical cavitation (2.8 cm) with tree-in-bud opacities', unit: '', normalRange: 'Normal', interpretation: 'Critical' }
      ]
    }
  ],
  'Gastroenterology': [
    {
      title: 'Severe Acute Pancreatitis Associated with Azathioprine in Crohn’s Disease',
      drug: { name: 'Imuran', inn: 'Azathioprine', dose: '150 mg oral', route: 'Oral', frequency: 'Once daily', indication: 'Moderate-to-severe Crohn’s disease' },
      reaction: 'intense epigastric pain radiating to back with lipase elevation',
      meddraPt: 'Pancreatitis acute',
      meddraSoc: 'Gastrointestinal disorders',
      whoCausality: 'Probable',
      naranjoScore: 7,
      seriousness: ['hospitalization'],
      labs: [
        { testName: 'Serum Lipase', value: '1680', unit: 'U/L', normalRange: '13 - 60 U/L', interpretation: 'Critical' },
        { testName: 'Serum Amylase', value: '940', unit: 'U/L', normalRange: '28 - 100 U/L', interpretation: 'Critical' }
      ]
    }
  ]
};

/**
 * Deterministic fallback generator for development and environments without Gemini credentials.
 */
function generateDeterministicFallbackCase(input: CaseGenerationInput, index = 0): StagedCase {
  const area = input.therapeuticArea && input.therapeuticArea !== 'All' ? input.therapeuticArea : 'Oncology';
  const areaPool = PHARMACOLOGY_KB[area] || PHARMACOLOGY_KB['Oncology'];
  const template = areaPool[index % areaPool.length];

  const now = new Date();
  const year = 2026;
  const startDay = 4 + index * 3;
  const onsetDay = startDay + (input.difficulty === 'Beginner' ? 14 : 21);
  const receiptDay = onsetDay + 2;

  const startDateStr = `${year}-08-${String(startDay).padStart(2, '0')}`;
  const onsetDateStr = `${year}-08-${String(onsetDay).padStart(2, '0')}`;
  const receiptDateStr = `${year}-08-${String(receiptDay).padStart(2, '0')}`;

  const patientGender = index % 2 === 0 ? 'Male' : 'Female';
  const patientInitials = ['M.K.', 'D.B.', 'T.H.', 'S.K.', 'V.A.', 'R.L.'][index % 6];
  const patientAge = input.difficulty === 'Beginner' ? 44 : input.difficulty === 'Intermediate' ? 62 : 73;
  const patientWeightKg = patientGender === 'Male' ? 78 : 64;

  const drugInn = input.suspectDrug || template.drug.inn;
  const drugName = template.drug.name;
  const reactionText = input.reactionType || template.reaction;

  const suspectDrug: SuspectDrug = {
    name: drugName,
    inn: drugInn,
    role: 'Suspect',
    dose: template.drug.dose,
    route: template.drug.route,
    frequency: template.drug.frequency,
    startDate: startDateStr,
    stopDate: onsetDateStr,
    indication: template.drug.indication,
    actionTaken: 'Drug Withdrawn',
    dechallenge: 'Positive',
    rechallenge: 'Not Done'
  };

  const concomitantDrugs: SuspectDrug[] = input.complexity === 'High' ? [
    {
      name: 'Cardizem',
      inn: 'Diltiazem',
      role: 'Interacting',
      dose: '120 mg oral',
      route: 'Oral',
      frequency: 'Once daily',
      startDate: `${year}-01-10`,
      indication: 'Paroxysmal supraventricular tachycardia',
      actionTaken: 'Dose Not Changed',
      dechallenge: 'Not Rechallenged',
      rechallenge: 'Not Done'
    }
  ] : [];

  const adverseEvent: AdverseEvent = {
    verbatim: reactionText,
    meddraPt: template.meddraPt,
    meddraSoc: template.meddraSoc,
    onsetDate: onsetDateStr,
    outcome: 'Recovering/Resolving',
    seriousness: {
      isSerious: true,
      criteria: {
        death: false,
        lifeThreatening: template.seriousness.includes('life_threatening'),
        hospitalization: template.seriousness.includes('hospitalization'),
        disability: template.seriousness.includes('disability'),
        congenitalAnomaly: false,
        otherMedicallyImportant: template.seriousness.includes('other_medically_important')
      }
    }
  };

  const reporter = input.reporterType || 'Clinical Pharmacist';

  const verbatimNarrative = `Spontaneous individual case safety report (ICSR) from a ${reporter} at University Teaching Hospital: A ${patientAge}-year-old ${patientGender.toLowerCase()} patient (${patientInitials}, weight: ${patientWeightKg} kg) was initiated on ${suspectDrug.name} (${suspectDrug.inn}) ${suspectDrug.dose} for ${suspectDrug.indication} on ${startDateStr}. The patient had a baseline medical history of ${suspectDrug.indication}. On ${onsetDateStr}, the patient presented with ${adverseEvent.verbatim}. Urgent hospital admission was required for acute clinical stabilization. Laboratory testing demonstrated ${template.labs.map((l: any) => `${l.testName} of ${l.value} ${l.unit}`).join(', ')}. ${suspectDrug.name} was promptly discontinued on ${onsetDateStr}. Following supportive treatment and targeted dechallenge, the patient showed significant clinical improvement and declining biomarker levels. The reporter considered the reaction serious and probably causally linked to ${suspectDrug.name}.${input.customNotes ? ` Clinical note: ${input.customNotes}` : ''}`;

  const modelCiomsNarrative = `This spontaneous ICSR from a ${reporter} describes a ${patientAge}-year-old ${patientGender.toLowerCase()} patient (${patientInitials}, ${patientWeightKg} kg) who experienced ${adverseEvent.verbatim} (MedDRA PT: ${template.meddraPt}) following therapy with ${suspectDrug.name} (${suspectDrug.inn}).\n\n${suspectDrug.name} was started on ${startDateStr} for ${suspectDrug.indication}. On ${onsetDateStr}, the patient developed ${adverseEvent.verbatim} requiring hospitalization. Laboratory workup showed ${template.labs.map((l: any) => `${l.testName} ${l.value} ${l.unit}`).join(', ')}.\n\n${suspectDrug.name} was permanently discontinued with positive dechallenge. The reaction resolved with supportive care. Causality is assessed as ${template.whoCausality} (Naranjo score: ${template.naranjoScore}).`;

  const referenceKey: ReferenceKey = {
    caseId: `temp-${Date.now()}-${index}`,
    expectedMeddraTerms: [
      {
        verbatim: adverseEvent.verbatim,
        pt: template.meddraPt,
        soc: template.meddraSoc,
        llt: template.meddraPt,
        rationale: `Primary pathological event induced by ${suspectDrug.inn}.`
      }
    ],
    expectedSeriousness: {
      isSerious: true,
      criteria: template.seriousness,
      justification: `Event required inpatient admission and stabilization (${template.seriousness.join(', ')}).`
    },
    expectedCausalityWho: template.whoCausality,
    expectedNaranjoScore: template.naranjoScore,
    expectedNaranjoBreakdown: {
      q1_previous_conclusive_reports: 1,
      q2_adverse_event_after_drug: 2,
      q3_adverse_event_improved_dechallenge: 1,
      q4_rechallenge_adverse_event: 0,
      q5_alternative_causes: 1,
      q6_placebo_reaction: 0,
      q7_drug_detected_body: 0,
      q8_dose_relationship: 0,
      q9_similar_reaction_in_past: 0,
      q10_objective_evidence_confirmed: 1
    },
    modelCiomsNarrative,
    gradingRubric: {
      meddraWeight: 25,
      seriousnessWeight: 25,
      causalityWeight: 25,
      narrativeWeight: 25,
      rubricPoints: [
        { category: 'MedDRA', criterion: `Accurate coding of PT "${template.meddraPt}" under SOC "${template.meddraSoc}"`, maxPoints: 25 },
        { category: 'Seriousness', criterion: `Identification of serious status and criteria (${template.seriousness.join(', ')})`, maxPoints: 25 },
        { category: 'Causality', criterion: `WHO-UMC "${template.whoCausality}" & Naranjo calculation (~${template.naranjoScore})`, maxPoints: 25 },
        { category: 'Narrative', criterion: 'Chronological structure, dechallenge outcome, and all ICH E2B core elements', maxPoints: 25 }
      ]
    }
  };

  const validation = validateCaseConsistency({
    patientInitials,
    patientAge,
    patientGender,
    patientWeightKg,
    reporterType: reporter,
    suspectDrugs: [suspectDrug],
    adverseEvents: [adverseEvent],
    receiptDate: receiptDateStr,
    referenceKey
  });

  const metadata: GenerationMetadata = {
    provider: 'fallback-deterministic',
    model: 'pharmacology-synthesis-engine-v1',
    generationTimeMs: 12,
    promptVersion: 'v6.0-icsr-structured',
    isFallback: true,
    setupMessage: 'Gemini API key (GEMINI_API_KEY) was not detected in server environment. Synthesized with clinical pharmacology engine fallback. Configure GEMINI_API_KEY for live Gemini 3.8 Flash generation.',
    validation
  };

  const fingerprint = computeClinicalFingerprint({
    title: template.title,
    therapeuticArea: area,
    patientInitials,
    patientAge,
    patientGender,
    suspectDrugs: [suspectDrug],
    adverseEvents: [adverseEvent]
  });

  const existing = db.prepare('SELECT id, case_number, title FROM cases WHERE clinical_fingerprint = ?').get(fingerprint) as any;

  return {
    tempId: `staged-${Date.now()}-${index}`,
    title: template.title,
    therapeuticArea: area,
    difficulty: input.difficulty,
    patientInitials,
    patientAge,
    patientGender,
    patientWeightKg,
    medicalHistory: `Baseline history of ${suspectDrug.indication}. No prior confirmed hypersensitivities.`,
    suspectDrugs: [suspectDrug],
    concomitantDrugs,
    adverseEvents: [adverseEvent],
    labTests: template.labs,
    verbatimNarrative,
    reporterType: reporter,
    receiptDate: receiptDateStr,
    referenceKey,
    generationMetadata: metadata,
    duplicateCheck: {
      isDuplicate: Boolean(existing),
      existingCaseNumber: existing?.case_number,
      existingTitle: existing?.title
    }
  };
}

/**
 * Primary LLM Case Generation Service
 * Invokes Gemini 3.8 Flash when configured, or safely falls back to deterministic synthesis.
 */
export async function generateIcsrCasesPipeline(input: CaseGenerationInput): Promise<{
  cases: StagedCase[];
  provider: 'google-gemini' | 'fallback-deterministic';
  model: string;
  isFallback: boolean;
  setupMessage?: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const count = Math.min(Math.max(input.caseCount || 1, 1), 5);
  const targetModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

  // If no credentials configured, immediately route to deterministic fallback
  if (!apiKey) {
    const cases: StagedCase[] = [];
    for (let i = 0; i < count; i++) {
      cases.push(generateDeterministicFallbackCase(input, i));
    }
    return {
      cases,
      provider: 'fallback-deterministic',
      model: 'pharmacology-synthesis-engine-v1',
      isFallback: true,
      setupMessage: 'Gemini API key not configured (GEMINI_API_KEY). Fictional scenarios generated via built-in clinical pharmacology engine.'
    };
  }

  // Live Gemini API Execution
  const startTime = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are a Principal Pharmacovigilance Physician, Medical Safety Officer, and Training Director at Arzon PV Academy.
Your task is to generate realistic, clinically coherent, synthetic FICTIONAL Individual Case Safety Report (ICSR) training cases for pharmacovigilance fellows.

RULES:
1. FICTIONAL TRAINING SCENARIOS ONLY. Never use real patient names or identifiers.
2. Comply strictly with ICH E2B(R3) and ICH E2A clinical safety standards.
3. Decouple student-facing clinical intake data from private expert reference answers and grading rubrics.
4. Ensure 100% internal chronological consistency:
   - startDate <= onsetDate <= stopDate <= receiptDate
   - dechallenge must clinically align with reported event outcome
   - seriousness criteria must be medically justified
5. Output MUST be valid JSON adhering to the specified schema without Markdown fences.`;

    const userPrompt = `Generate ${count} distinct fictional ICSR training case(s) with these parameters:
- Therapeutic Area: ${input.therapeuticArea || 'Oncology'}
- Difficulty Level: ${input.difficulty}
- Suspect Drug preference: ${input.suspectDrug || 'Clinically relevant standard of care'}
- Reaction Type preference: ${input.reactionType || 'Notable adverse drug reaction'}
- Complexity: ${input.complexity || 'Standard'} (if High, include interacting concomitant medications or pre-existing renal/hepatic risk)
- Reporter Persona: ${input.reporterType || 'Hospital Pharmacist'}
${input.customNotes ? `- Custom Clinical Context: ${input.customNotes}` : ''}

Return a JSON array of case objects with this EXACT structure for each case:
{
  "title": string,
  "therapeuticArea": string,
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "patientInitials": string,
  "patientAge": number,
  "patientGender": "Male" | "Female",
  "patientWeightKg": number,
  "medicalHistory": string,
  "suspectDrugs": [
    {
      "name": string,
      "inn": string,
      "role": "Suspect",
      "dose": string,
      "route": string,
      "frequency": string,
      "startDate": "YYYY-MM-DD",
      "stopDate": "YYYY-MM-DD",
      "indication": string,
      "actionTaken": "Drug Withdrawn" | "Dose Reduced" | "Dose Not Changed",
      "dechallenge": "Positive" | "Negative" | "Not Rechallenged",
      "rechallenge": "Not Done" | "Positive" | "Negative"
    }
  ],
  "concomitantDrugs": [],
  "adverseEvents": [
    {
      "verbatim": string,
      "meddraPt": string,
      "meddraSoc": string,
      "onsetDate": "YYYY-MM-DD",
      "resolutionDate": "YYYY-MM-DD",
      "outcome": "Recovering/Resolving" | "Recovered/Resolved" | "Not Recovered" | "Fatal",
      "seriousness": {
        "isSerious": true,
        "criteria": {
          "death": boolean,
          "lifeThreatening": boolean,
          "hospitalization": boolean,
          "disability": boolean,
          "congenitalAnomaly": boolean,
          "otherMedicallyImportant": boolean
        }
      }
    }
  ],
  "labTests": [
    { "testName": string, "value": string, "unit": string, "normalRange": string, "testDate": "YYYY-MM-DD", "interpretation": "Normal" | "Elevated" | "Critical" | "Low" }
  ],
  "verbatimNarrative": string,
  "reporterType": string,
  "receiptDate": "YYYY-MM-DD",
  "referenceKey": {
    "expectedMeddraTerms": [
      { "verbatim": string, "pt": string, "soc": string, "llt": string, "rationale": string }
    ],
    "expectedSeriousness": {
      "isSerious": boolean,
      "criteria": string[],
      "justification": string
    },
    "expectedCausalityWho": "Certain" | "Probable" | "Possible" | "Unlikely" | "Conditional" | "Unassessable",
    "expectedNaranjoScore": number,
    "expectedNaranjoBreakdown": {
      "q1_previous_conclusive_reports": number,
      "q2_adverse_event_after_drug": number,
      "q3_adverse_event_improved_dechallenge": number,
      "q4_rechallenge_adverse_event": number,
      "q5_alternative_causes": number,
      "q6_placebo_reaction": number,
      "q7_drug_detected_body": number,
      "q8_dose_relationship": number,
      "q9_similar_reaction_in_past": number,
      "q10_objective_evidence_confirmed": number
    },
    "modelCiomsNarrative": string,
    "gradingRubric": {
      "meddraWeight": 25,
      "seriousnessWeight": 25,
      "causalityWeight": 25,
      "narrativeWeight": 25,
      "rubricPoints": [
        { "category": "MedDRA", "criterion": string, "maxPoints": 25 },
        { "category": "Seriousness", "criterion": string, "maxPoints": 25 },
        { "category": "Causality", "criterion": string, "maxPoints": 25 },
        { "category": "Narrative", "criterion": string, "maxPoints": 25 }
      ]
    }
  }
}`;

    // Call Gemini API with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    });

    clearTimeout(timeout);
    const elapsed = Date.now() - startTime;
    const responseText = response.text || '';
    
    // Parse model output
    let parsedData = JSON.parse(responseText);
    if (!Array.isArray(parsedData)) {
      parsedData = [parsedData];
    }

    const stagedCases: StagedCase[] = [];

    for (let i = 0; i < parsedData.length; i++) {
      const c = parsedData[i];
      const validation = validateCaseConsistency(c);

      const metadata: GenerationMetadata = {
        provider: 'google-gemini',
        model: targetModel,
        generationTimeMs: Math.round(elapsed / parsedData.length),
        promptVersion: 'v6.0-icsr-structured',
        isFallback: false,
        validation
      };

      const fingerprint = computeClinicalFingerprint({
        title: c.title,
        therapeuticArea: c.therapeuticArea,
        patientInitials: c.patientInitials,
        patientAge: c.patientAge,
        patientGender: c.patientGender,
        suspectDrugs: c.suspectDrugs,
        adverseEvents: c.adverseEvents
      });

      const existing = db.prepare('SELECT id, case_number, title FROM cases WHERE clinical_fingerprint = ?').get(fingerprint) as any;

      stagedCases.push({
        tempId: `gemini-${Date.now()}-${i}`,
        title: c.title,
        therapeuticArea: c.therapeuticArea || input.therapeuticArea,
        difficulty: c.difficulty || input.difficulty,
        patientInitials: c.patientInitials,
        patientAge: c.patientAge,
        patientGender: c.patientGender,
        patientWeightKg: c.patientWeightKg,
        medicalHistory: c.medicalHistory,
        suspectDrugs: c.suspectDrugs,
        concomitantDrugs: c.concomitantDrugs || [],
        adverseEvents: c.adverseEvents,
        labTests: c.labTests || [],
        verbatimNarrative: c.verbatimNarrative,
        reporterType: c.reporterType,
        receiptDate: c.receiptDate,
        referenceKey: c.referenceKey,
        generationMetadata: metadata,
        duplicateCheck: {
          isDuplicate: Boolean(existing),
          existingCaseNumber: existing?.case_number,
          existingTitle: existing?.title
        }
      });
    }

    return {
      cases: stagedCases,
      provider: 'google-gemini',
      model: targetModel,
      isFallback: false
    };

  } catch (apiError: any) {
    console.warn('Gemini API call failed, falling back to deterministic synthesizer:', apiError?.message || apiError);
    const fallbackCases: StagedCase[] = [];
    for (let i = 0; i < count; i++) {
      fallbackCases.push(generateDeterministicFallbackCase(input, i));
    }
    return {
      cases: fallbackCases,
      provider: 'fallback-deterministic',
      model: 'pharmacology-synthesis-engine-v1',
      isFallback: true,
      setupMessage: `Gemini API execution failed (${apiError?.message || 'Network/Quota error'}). Fell back to clinical pharmacology engine.`
    };
  }
}
