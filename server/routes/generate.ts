import { Router } from 'express';
import { db } from '../db/database.js';
import { requireRole } from '../middleware/auth.js';
import { PVCase, ReferenceKey } from '../../src/types/index.js';

export const generateRouter = Router();

interface GenerationRequest {
  therapeuticArea: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  archetype?: string;
  reporterType?: string;
  customNotes?: string;
}

// Clinically realistic archetypes library for high-trust ICSR synthesis
const CLINICAL_ARCHETYPES: Record<string, any> = {
  'dress_syndrome': {
    title: 'Drug Reaction with Eosinophilia and Systemic Symptoms (DRESS) following Carbamazepine Initiation',
    therapeuticArea: 'Neurology',
    drug: { name: 'Tegretol', inn: 'Carbamazepine', dose: '200 mg BID', route: 'Oral', indication: 'Focal epilepsy with impaired awareness' },
    reaction: 'diffuse exfoliative erythroderma, facial edema, high fever, and acute transaminitis',
    meddraPt: 'Drug reaction with eosinophilia and systemic symptoms',
    meddraSoc: 'Skin and subcutaneous tissue disorders',
    whoCausality: 'Probable',
    naranjoScore: 7,
    seriousness: ['life_threatening', 'hospitalization'],
    labs: [
      { testName: 'Absolute Eosinophil Count', value: '2.8', unit: 'x10^9/L', normalRange: '0.0 - 0.5 x10^9/L', interpretation: 'Critical' },
      { testName: 'Alanine Aminotransferase (ALT)', value: '480', unit: 'U/L', normalRange: '7 - 56 U/L', interpretation: 'Critical' },
      { testName: 'Aspartate Aminotransferase (AST)', value: '390', unit: 'U/L', normalRange: '10 - 40 U/L', interpretation: 'Critical' },
      { testName: 'Serum Creatinine', value: '1.8', unit: 'mg/dL', normalRange: '0.7 - 1.3 mg/dL', interpretation: 'Elevated' }
    ]
  },
  'acute_pancreatitis': {
    title: 'Severe Necrotizing Pancreatitis Associated with Empagliflozin Therapy in Type 2 Diabetes',
    therapeuticArea: 'Endocrinology',
    drug: { name: 'Jardiance', inn: 'Empagliflozin', dose: '25 mg once daily', route: 'Oral', indication: 'Type 2 Diabetes Mellitus' },
    reaction: 'intense epigastric pain radiating to back with vomiting and pancreatic necrosis',
    meddraPt: 'Pancreatitis acute',
    meddraSoc: 'Gastrointestinal disorders',
    whoCausality: 'Possible',
    naranjoScore: 5,
    seriousness: ['hospitalization', 'life_threatening'],
    labs: [
      { testName: 'Serum Lipase', value: '1420', unit: 'U/L', normalRange: '13 - 60 U/L', interpretation: 'Critical' },
      { testName: 'Serum Amylase', value: '890', unit: 'U/L', normalRange: '28 - 100 U/L', interpretation: 'Critical' },
      { testName: 'Abdominal CT', value: 'Peripancreatic fluid collections and 30% glandular non-enhancement', unit: '', normalRange: 'Normal', interpretation: 'Critical' }
    ]
  },
  'agranulocytosis': {
    title: 'Acute Agranulocytosis and Septic Shock following Clozapine Titration',
    therapeuticArea: 'Psychiatry',
    drug: { name: 'Clozaril', inn: 'Clozapine', dose: '300 mg daily', route: 'Oral', indication: 'Treatment-resistant schizophrenia' },
    reaction: 'severe neutropenia, high grade fever, and pseudomonas bacteremia',
    meddraPt: 'Agranulocytosis',
    meddraSoc: 'Blood and lymphatic system disorders',
    whoCausality: 'Probable',
    naranjoScore: 8,
    seriousness: ['life_threatening', 'hospitalization'],
    labs: [
      { testName: 'Absolute Neutrophil Count (ANC)', value: '0.2', unit: 'x10^9/L', normalRange: '1.5 - 8.0 x10^9/L', interpretation: 'Critical' },
      { testName: 'White Blood Cell Count', value: '1.1', unit: 'x10^9/L', normalRange: '4.0 - 11.0 x10^9/L', interpretation: 'Critical' },
      { testName: 'Blood Culture', value: 'Pseudomonas aeruginosa positive', unit: '', normalRange: 'No growth', interpretation: 'Critical' }
    ]
  },
  'anaphylaxis': {
    title: 'Immediate Biphasic Anaphylaxis following Intravenous Iron Carboxymaltose Infusion',
    therapeuticArea: 'Hematology',
    drug: { name: 'Ferinject', inn: 'Ferric carboxymaltose', dose: '1000 mg IV single dose', route: 'Intravenous', indication: 'Severe iron deficiency anemia' },
    reaction: 'acute bronchospasm, diffuse urticaria, angioedema, and hemodynamic collapse',
    meddraPt: 'Anaphylactic reaction',
    meddraSoc: 'Immune system disorders',
    whoCausality: 'Certain',
    naranjoScore: 9,
    seriousness: ['life_threatening', 'hospitalization'],
    labs: [
      { testName: 'Serum Tryptase (acute)', value: '38.5', unit: 'mcg/L', normalRange: '< 11.4 mcg/L', interpretation: 'Critical' },
      { testName: 'Oxygen Saturation (SpO2)', value: '82', unit: '%', normalRange: '95 - 100 %', interpretation: 'Critical' }
    ]
  },
  'acute_hepatic_failure': {
    title: 'Idiosyncratic Drug-Induced Liver Injury (DILI) with Jaundice following Amoxicillin-Clavulanate',
    therapeuticArea: 'Gastroenterology',
    drug: { name: 'Augmentin', inn: 'Amoxicillin-clavulanic acid', dose: '875/125 mg BID', route: 'Oral', indication: 'Sinusitis' },
    reaction: 'cholestatic jaundice, severe pruritus, dark urine, and acute liver injury',
    meddraPt: 'Drug-induced liver injury',
    meddraSoc: 'Hepatobiliary disorders',
    whoCausality: 'Probable',
    naranjoScore: 7,
    seriousness: ['hospitalization', 'other_medically_important'],
    labs: [
      { testName: 'Total Bilirubin', value: '9.2', unit: 'mg/dL', normalRange: '0.2 - 1.2 mg/dL', interpretation: 'Critical' },
      { testName: 'Alkaline Phosphatase (ALP)', value: '620', unit: 'U/L', normalRange: '44 - 147 U/L', interpretation: 'Critical' },
      { testName: 'Alanine Aminotransferase (ALT)', value: '340', unit: 'U/L', normalRange: '7 - 56 U/L', interpretation: 'Elevated' }
    ]
  }
};

// POST /api/generate/case - Synthesize fictional ICSR with reference keys & rubrics
generateRouter.post('/case', requireRole(['admin', 'mentor']), (req, res) => {
  const { 
    therapeuticArea, 
    difficulty = 'Intermediate', 
    archetype, 
    reporterType = 'Clinical Pharmacist', 
    customNotes 
  }: GenerationRequest = req.body;

  // Select archetype or fallback to matching area
  let selectedArchKey = archetype;
  if (!selectedArchKey || !CLINICAL_ARCHETYPES[selectedArchKey]) {
    const keys = Object.keys(CLINICAL_ARCHETYPES);
    selectedArchKey = keys[Math.floor(Math.random() * keys.length)];
  }

  const baseArch = CLINICAL_ARCHETYPES[selectedArchKey];
  const targetArea = therapeuticArea && therapeuticArea !== 'All' ? therapeuticArea : baseArch.therapeuticArea;

  // Synthesize realistic patient demographics
  const genders: ('Male' | 'Female')[] = ['Male', 'Female'];
  const patientGender = genders[Math.floor(Math.random() * genders.length)];
  const initialsList = ['A.R.', 'S.M.', 'V.K.', 'D.P.', 'J.L.', 'R.T.', 'K.B.'];
  const patientInitials = initialsList[Math.floor(Math.random() * initialsList.length)];
  const patientAge = difficulty === 'Beginner' ? 42 : difficulty === 'Intermediate' ? 58 : 72;
  const patientWeightKg = patientGender === 'Male' ? 76 + Math.floor(Math.random() * 12) : 62 + Math.floor(Math.random() * 10);

  const year = 2026;
  const startDay = 5 + Math.floor(Math.random() * 10);
  const eventDay = startDay + (selectedArchKey === 'anaphylaxis' ? 0 : difficulty === 'Beginner' ? 14 : 21);
  const receiptDay = eventDay + 2;

  const startDateStr = `${year}-08-${String(startDay).padStart(2, '0')}`;
  const eventDateStr = `${year}-08-${String(eventDay).padStart(2, '0')}`;
  const receiptDateStr = `${year}-08-${String(receiptDay).padStart(2, '0')}`;

  const caseId = `case-ai-${Date.now()}`;
  const areaCode = targetArea.slice(0, 3).toUpperCase();
  const caseNumber = `ARZ-${year}-${areaCode}-${Math.floor(100 + Math.random() * 899)}`;

  // Construct Suspect Drug
  const suspectDrug = {
    name: baseArch.drug.name,
    inn: baseArch.drug.inn,
    role: 'Suspect' as const,
    dose: baseArch.drug.dose,
    route: baseArch.drug.route,
    frequency: 'Per clinical protocol',
    startDate: startDateStr,
    stopDate: eventDateStr,
    indication: baseArch.drug.indication,
    actionTaken: 'Drug Withdrawn' as const,
    dechallenge: 'Positive' as const,
    rechallenge: 'Not Done' as const
  };

  // Construct Adverse Event
  const adverseEvent = {
    verbatim: baseArch.reaction,
    meddraPt: baseArch.meddraPt,
    meddraSoc: baseArch.meddraSoc,
    onsetDate: eventDateStr,
    outcome: 'Recovering/Resolving' as const,
    seriousness: {
      isSerious: true,
      criteria: {
        death: false,
        lifeThreatening: baseArch.seriousness.includes('life_threatening'),
        hospitalization: baseArch.seriousness.includes('hospitalization'),
        disability: false,
        congenitalAnomaly: false,
        otherMedicallyImportant: baseArch.seriousness.includes('other_medically_important')
      }
    }
  };

  // Generate Chronological Verbatim Narrative
  const verbatimNarrative = `Spontaneous safety report from a ${reporterType} at University Teaching Hospital: A ${patientAge}-year-old ${patientGender.toLowerCase()} patient (${patientInitials}, weight: ${patientWeightKg} kg) was prescribed ${suspectDrug.name} (${suspectDrug.inn}) ${suspectDrug.dose} for ${suspectDrug.indication} starting on ${startDateStr}. The patient had no prior documented drug allergies. On ${eventDateStr}, the patient developed ${adverseEvent.verbatim}. The patient was admitted to the inpatient ward for urgent medical stabilization. Laboratory testing confirmed ${baseArch.labs.map((l: any) => `${l.testName} of ${l.value} ${l.unit}`).join(', ')}. ${suspectDrug.name} was promptly discontinued on ${eventDateStr}. Following targeted supportive pharmacotherapy and dechallenge, clinical symptoms and laboratory markers demonstrated progressive recovery. The reporter assessed the event as serious and probably related to ${suspectDrug.name}.${customNotes ? ` Additional clinical context: ${customNotes}` : ''}`;

  // Model CIOMS Narrative
  const modelCiomsNarrative = `This spontaneous ICSR from a ${reporterType} describes a ${patientAge}-year-old ${patientGender.toLowerCase()} patient (${patientInitials}, ${patientWeightKg} kg) who experienced ${adverseEvent.verbatim} (MedDRA PT: ${baseArch.meddraPt}) following administration of ${suspectDrug.name} (${suspectDrug.inn}).\n\nTherapy with ${suspectDrug.name} ${suspectDrug.dose} was commenced on ${startDateStr} for ${suspectDrug.indication}. On ${eventDateStr}, the patient developed ${adverseEvent.verbatim} requiring urgent inpatient hospitalization. Pertinent laboratory investigations revealed ${baseArch.labs.map((l: any) => `${l.testName}: ${l.value} ${l.unit}`).join(', ')}.\n\n${suspectDrug.name} was permanently withdrawn with positive dechallenge. The patient was treated supportively and improved. Causality is assessed as ${baseArch.whoCausality} (Naranjo score: ${baseArch.naranjoScore}).`;

  // Insert case into SQLite as 'draft'
  const insertCase = db.prepare(`
    INSERT INTO cases (
      id, case_number, title, therapeutic_area, difficulty, source_type,
      is_fictional, fictional_disclaimer, status, active_version,
      patient_initials, patient_age, patient_gender, patient_weight_kg,
      medical_history, suspect_drugs, concomitant_drugs, adverse_events,
      lab_tests, verbatim_narrative, reporter_type, receipt_date
    ) VALUES (
      ?, ?, ?, ?, ?, 'ai_generated',
      1, 'CONTROLLED FICTIONAL TRAINING SCENARIO · NOT REAL PATIENT DATA', 'draft', 1,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  insertCase.run(
    caseId, caseNumber, baseArch.title, targetArea, difficulty,
    patientInitials, patientAge, patientGender, patientWeightKg,
    `No documented prior drug allergies. Mild baseline medical history consistent with ${suspectDrug.indication}.`,
    JSON.stringify([suspectDrug]),
    JSON.stringify([]),
    JSON.stringify([adverseEvent]),
    JSON.stringify(baseArch.labs),
    verbatimNarrative,
    reporterType,
    receiptDateStr
  );

  // Store reference keys in restricted table
  const insertRefKey = db.prepare(`
    INSERT INTO reference_keys (
      case_id, expected_meddra_terms, expected_seriousness,
      expected_causality_who, expected_naranjo_score, expected_naranjo_breakdown,
      model_cioms_narrative, grading_rubric
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRefKey.run(
    caseId,
    JSON.stringify([{
      verbatim: adverseEvent.verbatim,
      pt: baseArch.meddraPt,
      soc: baseArch.meddraSoc,
      rationale: `Direct clinical manifestation of ${suspectDrug.inn}-induced adverse event.`
    }]),
    JSON.stringify({
      isSerious: true,
      criteria: baseArch.seriousness,
      justification: `Event required inpatient admission and was ${baseArch.seriousness.join(', ')}.`
    }),
    baseArch.whoCausality,
    baseArch.naranjoScore,
    JSON.stringify({
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
    }),
    modelCiomsNarrative,
    JSON.stringify({
      meddraWeight: 25,
      seriousnessWeight: 25,
      causalityWeight: 25,
      narrativeWeight: 25,
      rubricPoints: [
        { category: 'MedDRA', criterion: `Correct PT "${baseArch.meddraPt}" identified`, maxPoints: 25 },
        { category: 'Seriousness', criterion: `Flagged Seriousness and criteria (${baseArch.seriousness.join(', ')})`, maxPoints: 25 },
        { category: 'Causality', criterion: `WHO-UMC "${baseArch.whoCausality}" & Naranjo calculation (~${baseArch.naranjoScore})`, maxPoints: 25 },
        { category: 'Narrative', criterion: 'Chronological timeline, dechallenge outcome, and all required ICSR fields', maxPoints: 25 }
      ]
    })
  );

  // Create initial version record
  db.prepare(`
    INSERT INTO case_versions (id, case_id, version_number, snapshot_json, changelog, created_by)
    VALUES (?, ?, 1, ?, 'AI Synthesis Draft - Pending Human Verification', ?)
  `).run(`ver-${caseId}-1`, caseId, JSON.stringify({ caseId, caseNumber, baseArch }), req.user?.id || 'usr-admin-01');

  // Audit log
  db.prepare(`
    INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, details)
    VALUES (?, 'case', ?, 'AI_GENERATE_CASE', ?, ?)
  `).run(`log-${Date.now()}`, caseId, req.user?.id || 'usr-admin-01', `Generated AI ICSR ${caseNumber} (${baseArch.title})`);

  res.status(201).json({
    success: true,
    message: 'Fictional ICSR case generated and staged as draft.',
    caseId,
    caseNumber,
    title: baseArch.title,
    status: 'draft',
    therapeuticArea: targetArea,
    difficulty,
    verbatimNarrative
  });
});
