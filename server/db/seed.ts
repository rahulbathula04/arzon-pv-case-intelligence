import bcrypt from 'bcryptjs';
import { db, initDatabase, computeClinicalFingerprint } from './database.js';

export function seedDatabase() {
  initDatabase();

  const defaultPasswordHash = bcrypt.hashSync('ArzonSecure2026!', 8);

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, must_change_password, full_name, role, cohort)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      full_name = excluded.full_name,
      role = excluded.role,
      cohort = excluded.cohort,
      password_hash = COALESCE(users.password_hash, excluded.password_hash)
  `);

  const users = [
    { id: 'usr-admin-rahul', email: 'rahulbathula04@gmail.com', full_name: 'Rahul Bathula', role: 'admin', cohort: 'Super Administrator', mustChangePassword: 0, passwordHash: bcrypt.hashSync('Arzon@123', 10) },
    { id: 'usr-admin-01', email: 'admin@arzon.global', full_name: 'Dr. Arzon Director', role: 'admin', cohort: 'Leadership', mustChangePassword: 0 },
    { id: 'usr-mentor-01', email: 'priya.sharma@arzon.global', full_name: 'Dr. Priya Sharma, MD', role: 'mentor', cohort: 'PV Faculty', mustChangePassword: 0 },
    { id: 'usr-mentor-02', email: 'vikram.kumar@arzon.global', full_name: 'Vikram Kumar, M.Pharm', role: 'mentor', cohort: 'Safety Operations', mustChangePassword: 0 },
    { id: 'usr-student-01', email: 'rahul.varma@arzon.student', full_name: 'Rahul Varma', role: 'student', cohort: 'Pharm.D 2026-Q1', mustChangePassword: 0 },
    { id: 'usr-student-02', email: 'ananya.sen@arzon.student', full_name: 'Ananya Sen', role: 'student', cohort: 'M.Pharm 2026-Q1', mustChangePassword: 0 },
    { id: 'usr-student-03', email: 'rohit.mehta@arzon.student', full_name: 'Rohit Mehta', role: 'student', cohort: 'B.Pharm 2026-Q1', mustChangePassword: 0 }
  ];

  for (const u of users) {
    insertUser.run(u.id, u.email, (u as any).passwordHash || defaultPasswordHash, u.mustChangePassword, u.full_name, u.role, u.cohort);
  }

  // Idempotent case upsert statement
  const upsertCase = db.prepare(`
    INSERT INTO cases (
      id, case_number, clinical_fingerprint, title, therapeutic_area, difficulty, source_type,
      is_fictional, fictional_disclaimer, status, active_version,
      patient_initials, patient_age, patient_gender, patient_weight_kg,
      medical_history, suspect_drugs, concomitant_drugs, adverse_events,
      lab_tests, verbatim_narrative, reporter_type, receipt_date
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      case_number = excluded.case_number,
      clinical_fingerprint = excluded.clinical_fingerprint,
      title = excluded.title,
      therapeutic_area = excluded.therapeutic_area,
      difficulty = excluded.difficulty,
      patient_initials = excluded.patient_initials,
      patient_age = excluded.patient_age,
      patient_gender = excluded.patient_gender,
      patient_weight_kg = excluded.patient_weight_kg,
      medical_history = excluded.medical_history,
      suspect_drugs = excluded.suspect_drugs,
      concomitant_drugs = excluded.concomitant_drugs,
      adverse_events = excluded.adverse_events,
      lab_tests = excluded.lab_tests,
      verbatim_narrative = excluded.verbatim_narrative,
      reporter_type = excluded.reporter_type,
      receipt_date = excluded.receipt_date,
      updated_at = CURRENT_TIMESTAMP
  `);

  const upsertRefKey = db.prepare(`
    INSERT INTO reference_keys (
      case_id, expected_meddra_terms, expected_seriousness,
      expected_causality_who, expected_naranjo_score, expected_naranjo_breakdown,
      model_cioms_narrative, grading_rubric
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(case_id) DO UPDATE SET
      expected_meddra_terms = excluded.expected_meddra_terms,
      expected_seriousness = excluded.expected_seriousness,
      expected_causality_who = excluded.expected_causality_who,
      expected_naranjo_score = excluded.expected_naranjo_score,
      expected_naranjo_breakdown = excluded.expected_naranjo_breakdown,
      model_cioms_narrative = excluded.model_cioms_narrative,
      grading_rubric = excluded.grading_rubric
  `);

  const insertVersion = db.prepare(`
    INSERT OR IGNORE INTO case_versions (id, case_id, version_number, snapshot_json, changelog, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // ==========================================
  // CASE 1: ONCOLOGY (Pembrolizumab Myocarditis)
  // ==========================================
  const case1Id = 'case-2026-onc-001';
  const case1Data = {
    id: case1Id,
    caseNumber: 'ARZ-2026-ONC-001',
    title: 'Severe Immune-Mediated Myocarditis following Pembrolizumab in Metastatic Melanoma',
    therapeuticArea: 'Oncology',
    difficulty: 'Advanced',
    sourceType: 'curated',
    isFictional: 1,
    fictionalDisclaimer: 'CONTROLLED FICTIONAL TRAINING SCENARIO · NOT REAL PATIENT DATA',
    status: 'approved',
    activeVersion: 1,
    patientInitials: 'M.K.',
    patientAge: 62,
    patientGender: 'Male',
    patientWeightKg: 78.5,
    medicalHistory: 'Stage IV Metastatic Cutaneous Melanoma (BRAF wild-type), Hypertension (controlled with Amlodipine), Dyslipidemia. No prior cardiovascular history or autoimmune disorder.',
    suspectDrugs: [
      {
        name: 'Keytruda',
        inn: 'Pembrolizumab',
        role: 'Suspect',
        dose: '200 mg',
        route: 'Intravenous',
        frequency: 'Every 3 weeks',
        startDate: '2026-08-10',
        stopDate: '2026-09-21',
        indication: 'Metastatic malignant melanoma',
        actionTaken: 'Drug Withdrawn',
        dechallenge: 'Positive',
        rechallenge: 'Not Done'
      }
    ],
    concomitantDrugs: [
      {
        name: 'Norvasc',
        inn: 'Amlodipine besylate',
        role: 'Concomitant',
        dose: '5 mg',
        route: 'Oral',
        frequency: 'Once daily',
        startDate: '2022-03-15',
        indication: 'Essential hypertension',
        actionTaken: 'Dose Not Changed',
        dechallenge: 'Not Rechallenged',
        rechallenge: 'Not Done'
      },
      {
        name: 'Lipitor',
        inn: 'Atorvastatin',
        role: 'Concomitant',
        dose: '20 mg',
        route: 'Oral',
        frequency: 'Once daily at bedtime',
        startDate: '2023-01-20',
        indication: 'Hypercholesterolemia',
        actionTaken: 'Dose Not Changed',
        dechallenge: 'Not Rechallenged',
        rechallenge: 'Not Done'
      }
    ],
    adverseEvents: [
      {
        verbatim: 'acute heart inflammation and cardiogenic shock',
        meddraPt: 'Myocarditis',
        meddraSoc: 'Cardiac disorders',
        onsetDate: '2026-09-28',
        resolutionDate: '2026-10-18',
        outcome: 'Recovered with Sequelae',
        seriousness: {
          isSerious: true,
          criteria: {
            death: false,
            lifeThreatening: true,
            hospitalization: true,
            disability: false,
            congenitalAnomaly: false,
            otherMedicallyImportant: false
          }
        }
      },
      {
        verbatim: 'bilateral eyelid drooping and proximal muscle weakness',
        meddraPt: 'Myasthenia gravis',
        meddraSoc: 'Nervous system disorders',
        onsetDate: '2026-09-26',
        outcome: 'Recovering/Resolving',
        seriousness: {
          isSerious: true,
          criteria: {
            death: false,
            lifeThreatening: false,
            hospitalization: true,
            disability: true,
            congenitalAnomaly: false,
            otherMedicallyImportant: false
          }
        }
      }
    ],
    labTests: [
      { testName: 'High-Sensitivity Cardiac Troponin I', value: '4250', unit: 'ng/L', normalRange: '< 34 ng/L', testDate: '2026-09-28', interpretation: 'Critical' },
      { testName: 'Creatine Kinase (Total CK)', value: '1890', unit: 'U/L', normalRange: '38 - 174 U/L', testDate: '2026-09-28', interpretation: 'Critical' },
      { testName: 'NT-proBNP', value: '3840', unit: 'pg/mL', normalRange: '< 125 pg/mL', testDate: '2026-09-29', interpretation: 'Elevated' },
      { testName: 'Left Ventricular Ejection Fraction (Echo)', value: '35', unit: '%', normalRange: '55 - 70 %', testDate: '2026-09-29', interpretation: 'Low' },
      { testName: 'Anti-AChR Antibody', value: '8.4', unit: 'nmol/L', normalRange: '< 0.4 nmol/L', testDate: '2026-09-30', interpretation: 'Elevated' }
    ],
    verbatimNarrative: 'Spontaneous report from an oncologist at City Cancer Institute: A 62-year-old male with metastatic melanoma was initiated on Pembrolizumab 200 mg IV Q3W on 10-AUG-2026. He received his third infusion on 21-SEP-2026. On 26-SEP-2026 (Day 47), the patient developed progressive bilateral ptosis and neck extensor fatigue. Two days later (28-SEP-2026), he presented to the emergency room with acute dyspnea, orthopnea, chest tightness, and profound hypotension (BP 78/48 mmHg). ECG revealed sinus tachycardia with complete right bundle branch block. High-sensitivity Troponin I was markedly elevated at 4250 ng/L and total CK was 1890 U/L. Cardiac MRI demonstrated late gadolinium enhancement consistent with acute diffuse myocarditis. Echo showed a reduced LVEF of 35%. Patient was admitted to the CCU for cardiogenic shock and placed on IV inotropic support and pulse methylprednisolone 1000 mg daily for 3 days followed by oral tapering. Plasma exchange was performed for concomitant anti-AChR antibody positive myasthenic crisis. Pembrolizumab was permanently discontinued. Following high-dose steroid therapy, cardiac enzymes trended downward and the patient was discharged on 18-OCT-2026 with an improved LVEF of 48%. The reporting physician assessed the event as life-threatening immune checkpoint inhibitor-induced myocarditis and secondary myasthenia gravis.',
    reporterType: 'Physician (Oncologist)',
    receiptDate: '2026-10-02'
  };

  const case1Fp = computeClinicalFingerprint(case1Data);
  upsertCase.run(
    case1Data.id, case1Data.caseNumber, case1Fp, case1Data.title, case1Data.therapeuticArea,
    case1Data.difficulty, case1Data.sourceType, case1Data.isFictional,
    case1Data.fictionalDisclaimer, case1Data.status, case1Data.activeVersion,
    case1Data.patientInitials, case1Data.patientAge, case1Data.patientGender,
    case1Data.patientWeightKg, case1Data.medicalHistory, JSON.stringify(case1Data.suspectDrugs),
    JSON.stringify(case1Data.concomitantDrugs), JSON.stringify(case1Data.adverseEvents),
    JSON.stringify(case1Data.labTests), case1Data.verbatimNarrative, case1Data.reporterType,
    case1Data.receiptDate
  );

  upsertRefKey.run(
    case1Id,
    JSON.stringify([
      { verbatim: 'acute heart inflammation and cardiogenic shock', pt: 'Myocarditis', soc: 'Cardiac disorders', llt: 'Acute myocarditis', rationale: 'Direct inflammatory myocardial injury caused by checkpoint inhibition.' },
      { verbatim: 'bilateral eyelid drooping and proximal muscle weakness', pt: 'Myasthenia gravis', soc: 'Nervous system disorders', llt: 'Ocular and generalized myasthenia gravis', rationale: 'Known immune-related adverse event frequently co-occurring with ICI myocarditis.' }
    ]),
    JSON.stringify({
      isSerious: true,
      criteria: ['life_threatening', 'hospitalization', 'disability'],
      justification: 'Patient experienced cardiogenic shock requiring CCU admission and inotropic support. Proximal weakness caused temporary severe incapacity.'
    }),
    'Probable',
    7,
    JSON.stringify({
      q1_previous_conclusive_reports: 1, q2_adverse_event_after_drug: 2, q3_adverse_event_improved_dechallenge: 1,
      q4_rechallenge_adverse_event: 0, q5_alternative_causes: 2, q6_placebo_reaction: 0,
      q7_drug_detected_body: 0, q8_dose_relationship: 0, q9_similar_reaction_in_past: 0,
      q10_objective_evidence_confirmed: 1
    }),
    'This medically confirmed spontaneous report from an oncologist describes a 62-year-old male patient (M.K., 78.5 kg) with metastatic melanoma who experienced life-threatening immune-mediated myocarditis and concomitant myasthenia gravis while receiving pembrolizumab (Keytruda).\n\nThe patient was initiated on pembrolizumab 200 mg IV every 3 weeks on 10-AUG-2026. On 26-SEP-2026, he developed bilateral ptosis and muscle fatigue. On 28-SEP-2026, he presented with cardiogenic shock, marked troponin I elevation (4250 ng/L), and CK elevation (1890 U/L). Cardiac MRI confirmed acute myocarditis.\n\nPembrolizumab was permanently withdrawn with positive dechallenge following pulse corticosteroids. Causality is assessed as Probable (Naranjo score 7).',
    JSON.stringify({
      meddraWeight: 25, seriousnessWeight: 25, causalityWeight: 25, narrativeWeight: 25,
      rubricPoints: [
        { category: 'MedDRA', criterion: 'Correct PT "Myocarditis" identified for cardiac inflammation', maxPoints: 15 },
        { category: 'MedDRA', criterion: 'Correct PT "Myasthenia gravis" identified for ptosis and muscle weakness', maxPoints: 10 },
        { category: 'Seriousness', criterion: 'Identified as Serious', maxPoints: 5 },
        { category: 'Seriousness', criterion: 'Correctly flagged Life-Threatening & Hospitalization criteria', maxPoints: 20 },
        { category: 'Causality', criterion: 'Assigned WHO-UMC category "Probable/Likely"', maxPoints: 15 },
        { category: 'Causality', criterion: 'Naranjo score between 6-8 with valid dechallenge credit', maxPoints: 10 },
        { category: 'Narrative', criterion: 'Chronological timeline and essential ICSR elements', maxPoints: 25 }
      ]
    })
  );

  insertVersion.run('ver-case1-v1', case1Id, 1, JSON.stringify(case1Data), 'Initial approved clinical simulation case', 'usr-admin-01');

  // ==========================================
  // CASE 2: CARDIOLOGY (Rivaroxaban + Clarithromycin Bleed)
  // ==========================================
  const case2Id = 'case-2026-card-002';
  const case2Data = {
    id: case2Id,
    caseNumber: 'ARZ-2026-CARD-002',
    title: 'Life-threatening Retroperitoneal Hemorrhage due to Rivaroxaban and Clarithromycin Interaction',
    therapeuticArea: 'Cardiology',
    difficulty: 'Intermediate',
    sourceType: 'curated',
    isFictional: 1,
    fictionalDisclaimer: 'CONTROLLED FICTIONAL TRAINING SCENARIO · NOT REAL PATIENT DATA',
    status: 'approved',
    activeVersion: 1,
    patientInitials: 'D.B.',
    patientAge: 71,
    patientGender: 'Female',
    patientWeightKg: 54.0,
    medicalHistory: 'Non-valvular Atrial Fibrillation (CHA2DS2-VASc score 4), Mild Chronic Kidney Disease (baseline serum creatinine 1.3 mg/dL, eGFR 42 mL/min/1.73m2), Osteoarthritis.',
    suspectDrugs: [
      {
        name: 'Xarelto',
        inn: 'Rivaroxaban',
        role: 'Suspect',
        dose: '20 mg',
        route: 'Oral',
        frequency: 'Once daily with evening meal',
        startDate: '2025-04-12',
        stopDate: '2026-10-04',
        indication: 'Prevention of stroke in non-valvular atrial fibrillation',
        actionTaken: 'Drug Withdrawn',
        dechallenge: 'Positive',
        rechallenge: 'Not Done'
      },
      {
        name: 'Biaxin',
        inn: 'Clarithromycin',
        role: 'Interacting',
        dose: '500 mg',
        route: 'Oral',
        frequency: 'Twice daily',
        startDate: '2026-09-30',
        stopDate: '2026-10-04',
        indication: 'Community-acquired bronchitis',
        actionTaken: 'Drug Withdrawn',
        dechallenge: 'Positive',
        rechallenge: 'Not Done'
      }
    ],
    concomitantDrugs: [
      {
        name: 'Tylenol',
        inn: 'Paracetamol',
        role: 'Concomitant',
        dose: '650 mg',
        route: 'Oral',
        frequency: 'As needed for joint pain',
        startDate: '2024-06-01',
        indication: 'Osteoarthritis',
        actionTaken: 'Dose Not Changed',
        dechallenge: 'Not Rechallenged',
        rechallenge: 'Not Done'
      }
    ],
    adverseEvents: [
      {
        verbatim: 'massive retroperitoneal hemorrhage and severe hemorrhagic shock',
        meddraPt: 'Retroperitoneal haematoma',
        meddraSoc: 'Vascular disorders',
        onsetDate: '2026-10-04',
        resolutionDate: '2026-10-15',
        outcome: 'Recovered with Sequelae',
        seriousness: {
          isSerious: true,
          criteria: {
            death: false,
            lifeThreatening: true,
            hospitalization: true,
            disability: false,
            congenitalAnomaly: false,
            otherMedicallyImportant: false
          }
        }
      }
    ],
    labTests: [
      { testName: 'Hemoglobin', value: '5.8', unit: 'g/dL', normalRange: '12.0 - 15.5 g/dL', testDate: '2026-10-04', interpretation: 'Critical' },
      { testName: 'Platelet Count', value: '210', unit: 'x10^9/L', normalRange: '150 - 450 x10^9/L', testDate: '2026-10-04', interpretation: 'Normal' },
      { testName: 'Anti-Factor Xa Activity (Rivaroxaban calibrated)', value: '620', unit: 'ng/mL', normalRange: '20 - 250 ng/mL', testDate: '2026-10-04', interpretation: 'Critical' },
      { testName: 'Serum Creatinine', value: '2.1', unit: 'mg/dL', normalRange: '0.6 - 1.1 mg/dL', testDate: '2026-10-04', interpretation: 'Elevated' }
    ],
    verbatimNarrative: 'Report from an emergency medicine physician: A 71-year-old female (D.B., 54 kg) on chronic rivaroxaban 20 mg daily for non-valvular AF was prescribed clarithromycin 500 mg BID for bronchitis on 30-SEP-2026. On 04-OCT-2026, she presented with acute left flank pain and circulatory collapse (BP 70/40 mmHg). Hemoglobin dropped to 5.8 g/dL. CT confirmed massive active retroperitoneal hematoma. Anti-Factor Xa was 620 ng/mL, demonstrating severe drug accumulation caused by CYP3A4 and P-gp inhibition by clarithromycin. The patient was stabilized with blood transfusions and Andexanet alfa. Both drugs were discontinued.',
    reporterType: 'Emergency Medicine Physician',
    receiptDate: '2026-10-06'
  };

  const case2Fp = computeClinicalFingerprint(case2Data);
  upsertCase.run(
    case2Data.id, case2Data.caseNumber, case2Fp, case2Data.title, case2Data.therapeuticArea,
    case2Data.difficulty, case2Data.sourceType, case2Data.isFictional,
    case2Data.fictionalDisclaimer, case2Data.status, case2Data.activeVersion,
    case2Data.patientInitials, case2Data.patientAge, case2Data.patientGender,
    case2Data.patientWeightKg, case2Data.medicalHistory, JSON.stringify(case2Data.suspectDrugs),
    JSON.stringify(case2Data.concomitantDrugs), JSON.stringify(case2Data.adverseEvents),
    JSON.stringify(case2Data.labTests), case2Data.verbatimNarrative, case2Data.reporterType,
    case2Data.receiptDate
  );

  upsertRefKey.run(
    case2Id,
    JSON.stringify([
      { verbatim: 'massive retroperitoneal hemorrhage and severe hemorrhagic shock', pt: 'Retroperitoneal haematoma', soc: 'Vascular disorders', llt: 'Retroperitoneal hemorrhage', rationale: 'Bleeding into retroperitoneal space precipitated by DOAC interaction.' }
    ]),
    JSON.stringify({
      isSerious: true,
      criteria: ['life_threatening', 'hospitalization'],
      justification: 'Severe hemorrhagic shock with Hb dropping to 5.8 g/dL requiring ICU stay and arterial embolization.'
    }),
    'Probable',
    6,
    JSON.stringify({
      q1_previous_conclusive_reports: 1, q2_adverse_event_after_drug: 2, q3_adverse_event_improved_dechallenge: 1,
      q4_rechallenge_adverse_event: 0, q5_alternative_causes: 1, q6_placebo_reaction: 0,
      q7_drug_detected_body: 1, q8_dose_relationship: 0, q9_similar_reaction_in_past: 0,
      q10_objective_evidence_confirmed: 1
    }),
    'This spontaneous ICSR describes a 71-year-old female patient (D.B., 54 kg) who suffered life-threatening retroperitoneal hemorrhage secondary to a drug interaction between chronic rivaroxaban and co-prescribed clarithromycin. Discontinuation of both medications, transfusion, and andexanet alfa resulted in patient stabilization. Causality is assessed as Probable (Naranjo score 6).',
    JSON.stringify({
      meddraWeight: 25, seriousnessWeight: 25, causalityWeight: 25, narrativeWeight: 25,
      rubricPoints: [
        { category: 'MedDRA', criterion: 'Correct PT "Retroperitoneal haematoma" or "Retroperitoneal haemorrhage"', maxPoints: 25 },
        { category: 'Seriousness', criterion: 'Correctly identified Life-Threatening & Hospitalization', maxPoints: 25 },
        { category: 'Causality', criterion: 'Identified CYP3A4/P-gp pharmacokinetic interaction mechanism', maxPoints: 15 },
        { category: 'Causality', criterion: 'WHO-UMC Probable classification & Naranjo calculation', maxPoints: 10 },
        { category: 'Narrative', criterion: 'Clear chronological recounting of DOAC, antibiotic addition, and bleed', maxPoints: 25 }
      ]
    })
  );

  insertVersion.run('ver-case2-v1', case2Id, 1, JSON.stringify(case2Data), 'Initial approved clinical simulation case', 'usr-admin-01');

  // ==========================================
  // CASE 3: IMMUNOLOGY (Allopurinol SJS/TEN Overlap)
  // ==========================================
  const case3Id = 'case-2026-derm-003';
  const case3Data = {
    id: case3Id,
    caseNumber: 'ARZ-2026-DERM-003',
    title: 'Stevens-Johnson Syndrome / Toxic Epidermal Necrolysis Overlap following Allopurinol Initiation',
    therapeuticArea: 'Immunology',
    difficulty: 'Beginner',
    sourceType: 'curated',
    isFictional: 1,
    fictionalDisclaimer: 'CONTROLLED FICTIONAL TRAINING SCENARIO · NOT REAL PATIENT DATA',
    status: 'approved',
    activeVersion: 1,
    patientInitials: 'T.H.',
    patientAge: 53,
    patientGender: 'Male',
    patientWeightKg: 82.0,
    medicalHistory: 'Recurrent Gouty Arthritis, Stage 3 Chronic Kidney Disease (eGFR 48 mL/min).',
    suspectDrugs: [
      {
        name: 'Zyloprim',
        inn: 'Allopurinol',
        role: 'Suspect',
        dose: '300 mg',
        route: 'Oral',
        frequency: 'Once daily',
        startDate: '2026-09-01',
        stopDate: '2026-09-18',
        indication: 'Chronic gouty arthritis',
        actionTaken: 'Drug Withdrawn',
        dechallenge: 'Positive',
        rechallenge: 'Not Done'
      }
    ],
    concomitantDrugs: [],
    adverseEvents: [
      {
        verbatim: 'severe skin detachment over 18% body surface area and painful oral mucosal sloughing',
        meddraPt: 'Stevens-Johnson syndrome',
        meddraSoc: 'Skin and subcutaneous tissue disorders',
        onsetDate: '2026-09-16',
        outcome: 'Recovering/Resolving',
        seriousness: {
          isSerious: true,
          criteria: {
            death: false,
            lifeThreatening: true,
            hospitalization: true,
            disability: false,
            congenitalAnomaly: false,
            otherMedicallyImportant: false
          }
        }
      }
    ],
    labTests: [
      { testName: 'Skin Biopsy', value: 'Full-thickness epidermal necrosis with subepidermal bullae formation', unit: '', normalRange: 'Normal', testDate: '2026-09-18', interpretation: 'Critical' },
      { testName: 'HLA-B*58:01 Allele', value: 'Positive', unit: '', normalRange: 'Negative', testDate: '2026-09-19', interpretation: 'Critical' },
      { testName: 'Total Bilirubin', value: '2.4', unit: 'mg/dL', normalRange: '0.2 - 1.2 mg/dL', testDate: '2026-09-18', interpretation: 'Elevated' }
    ],
    verbatimNarrative: 'Hospital dermatologist reporting: A 53-year-old male with chronic gout and CKD stage 3 was started on allopurinol 300 mg daily on 01-SEP-2026 without prior HLA-B*58:01 screening. On 16-SEP-2026 (Day 16), he developed high fevers (39.2°C), sore throat, painful conjunctivitis, and a targetoid maculopapular rash on the trunk. Over the next 48 hours, flaccid bullae formed with positive Nikolsky sign and epidermal detachment involving 18% BSA, accompanied by severe mucosal sloughing. Allopurinol was immediately stopped on 18-SEP-2026. The patient was admitted to the Burn ICU and managed with IVIG. Genetic testing confirmed HLA-B*58:01 positivity.',
    reporterType: 'Hospital Dermatologist',
    receiptDate: '2026-09-22'
  };

  const case3Fp = computeClinicalFingerprint(case3Data);
  upsertCase.run(
    case3Data.id, case3Data.caseNumber, case3Fp, case3Data.title, case3Data.therapeuticArea,
    case3Data.difficulty, case3Data.sourceType, case3Data.isFictional,
    case3Data.fictionalDisclaimer, case3Data.status, case3Data.activeVersion,
    case3Data.patientInitials, case3Data.patientAge, case3Data.patientGender,
    case3Data.patientWeightKg, case3Data.medicalHistory, JSON.stringify(case3Data.suspectDrugs),
    JSON.stringify(case3Data.concomitantDrugs), JSON.stringify(case3Data.adverseEvents),
    JSON.stringify(case3Data.labTests), case3Data.verbatimNarrative, case3Data.reporterType,
    case3Data.receiptDate
  );

  upsertRefKey.run(
    case3Id,
    JSON.stringify([
      { verbatim: 'severe skin detachment over 18% body surface area and painful oral mucosal sloughing', pt: 'Stevens-Johnson syndrome', soc: 'Skin and subcutaneous tissue disorders', llt: 'Stevens-Johnson syndrome', rationale: '18% BSA epidermal detachment corresponds to SJS/TEN overlap.' }
    ]),
    JSON.stringify({
      isSerious: true,
      criteria: ['life_threatening', 'hospitalization'],
      justification: 'Severe cutaneous adverse reaction requiring Burn ICU admission with high mortality risk.'
    }),
    'Probable',
    7,
    JSON.stringify({
      q1_previous_conclusive_reports: 1, q2_adverse_event_after_drug: 2, q3_adverse_event_improved_dechallenge: 1,
      q4_rechallenge_adverse_event: 0, q5_alternative_causes: 1, q6_placebo_reaction: 0,
      q7_drug_detected_body: 0, q8_dose_relationship: 1, q9_similar_reaction_in_past: 0,
      q10_objective_evidence_confirmed: 1
    }),
    'This spontaneous ICSR describes a 53-year-old male patient (T.H., 82 kg) who developed severe Stevens-Johnson syndrome / Toxic Epidermal Necrolysis overlap following allopurinol therapy for chronic gout. Latency was 16 days. Genetic testing confirmed HLA-B*58:01. Dechallenge was positive following ICU admission and IVIG. Causality is assessed as Probable (Naranjo score 7).',
    JSON.stringify({
      meddraWeight: 25, seriousnessWeight: 25, causalityWeight: 25, narrativeWeight: 25,
      rubricPoints: [
        { category: 'MedDRA', criterion: 'Correct PT "Stevens-Johnson syndrome" or "Toxic epidermal necrolysis"', maxPoints: 25 },
        { category: 'Seriousness', criterion: 'Correctly marked Serious (Hospitalization, Life-threatening)', maxPoints: 25 },
        { category: 'Causality', criterion: 'Recognized 2-3 week latency and HLA-B*58:01 risk factor', maxPoints: 15 },
        { category: 'Causality', criterion: 'WHO-UMC Probable categorization', maxPoints: 10 },
        { category: 'Narrative', criterion: 'Well-structured narrative detailing start date, latency, BSA %, ICU management', maxPoints: 25 }
      ]
    })
  );

  insertVersion.run('ver-case3-v1', case3Id, 1, JSON.stringify(case3Data), 'Initial approved clinical simulation case', 'usr-admin-01');

  // ==========================================
  // CASE 4: NEUROLOGY (Carbamazepine DRESS Syndrome)
  // ==========================================
  const case4Id = 'case-2026-neu-004';
  const case4Data = {
    id: case4Id,
    caseNumber: 'ARZ-2026-NEU-004',
    title: 'Drug Reaction with Eosinophilia and Systemic Symptoms (DRESS) following Carbamazepine Initiation',
    therapeuticArea: 'Neurology',
    difficulty: 'Intermediate',
    sourceType: 'curated',
    isFictional: 1,
    fictionalDisclaimer: 'CONTROLLED FICTIONAL TRAINING SCENARIO · NOT REAL PATIENT DATA',
    status: 'approved',
    activeVersion: 1,
    patientInitials: 'S.K.',
    patientAge: 48,
    patientGender: 'Male',
    patientWeightKg: 74.0,
    medicalHistory: 'Newly diagnosed focal epilepsy with impaired awareness. No prior drug allergies or known hepatic disease.',
    suspectDrugs: [
      {
        name: 'Tegretol',
        inn: 'Carbamazepine',
        role: 'Suspect',
        dose: '200 mg',
        route: 'Oral',
        frequency: 'Twice daily',
        startDate: '2026-08-04',
        stopDate: '2026-08-25',
        indication: 'Focal epilepsy with impaired awareness',
        actionTaken: 'Drug Withdrawn',
        dechallenge: 'Positive',
        rechallenge: 'Not Done'
      }
    ],
    concomitantDrugs: [],
    adverseEvents: [
      {
        verbatim: 'diffuse exfoliative erythroderma, facial edema, high fever, and acute transaminitis',
        meddraPt: 'Drug reaction with eosinophilia and systemic symptoms',
        meddraSoc: 'Skin and subcutaneous tissue disorders',
        onsetDate: '2026-08-25',
        outcome: 'Recovering/Resolving',
        seriousness: {
          isSerious: true,
          criteria: {
            death: false,
            lifeThreatening: true,
            hospitalization: true,
            disability: false,
            congenitalAnomaly: false,
            otherMedicallyImportant: false
          }
        }
      }
    ],
    labTests: [
      { testName: 'Absolute Eosinophil Count', value: '2.8', unit: 'x10^9/L', normalRange: '0.0 - 0.5 x10^9/L', testDate: '2026-08-26', interpretation: 'Critical' },
      { testName: 'Alanine Aminotransferase (ALT)', value: '480', unit: 'U/L', normalRange: '7 - 56 U/L', testDate: '2026-08-26', interpretation: 'Critical' },
      { testName: 'Aspartate Aminotransferase (AST)', value: '390', unit: 'U/L', normalRange: '10 - 40 U/L', testDate: '2026-08-26', interpretation: 'Critical' },
      { testName: 'Serum Creatinine', value: '1.8', unit: 'mg/dL', normalRange: '0.7 - 1.3 mg/dL', testDate: '2026-08-26', interpretation: 'Elevated' }
    ],
    verbatimNarrative: 'Hospital neurologist reporting: A 48-year-old male with newly diagnosed focal epilepsy was prescribed Carbamazepine 200 mg BID on 04-AUG-2026. On 25-AUG-2026 (three weeks post initiation), he developed a high fever of 39.5°C, periorbital edema, cervical lymphadenopathy, and a morbilliform exanthem rapidly coalescing into exfoliative erythroderma. Laboratory evaluation revealed pronounced eosinophilia (AEC 2.8 x 10^9/L) and acute hepatocellular injury with ALT 480 U/L and AST 390 U/L. The patient was admitted to the high dependency unit and carbamazepine was permanently withdrawn. Systemic pulse corticosteroids (IV methylprednisolone 500 mg daily) were administered. Following dechallenge and steroid therapy, eosinophil counts and transaminases demonstrated marked progressive improvement. The neurologist diagnosed severe Carbamazepine-induced DRESS syndrome.',
    reporterType: 'Hospital Neurologist',
    receiptDate: '2026-08-28'
  };

  const case4Fp = computeClinicalFingerprint(case4Data);
  upsertCase.run(
    case4Data.id, case4Data.caseNumber, case4Fp, case4Data.title, case4Data.therapeuticArea,
    case4Data.difficulty, case4Data.sourceType, case4Data.isFictional,
    case4Data.fictionalDisclaimer, case4Data.status, case4Data.activeVersion,
    case4Data.patientInitials, case4Data.patientAge, case4Data.patientGender,
    case4Data.patientWeightKg, case4Data.medicalHistory, JSON.stringify(case4Data.suspectDrugs),
    JSON.stringify(case4Data.concomitantDrugs), JSON.stringify(case4Data.adverseEvents),
    JSON.stringify(case4Data.labTests), case4Data.verbatimNarrative, case4Data.reporterType,
    case4Data.receiptDate
  );

  upsertRefKey.run(
    case4Id,
    JSON.stringify([
      { verbatim: 'diffuse exfoliative erythroderma, facial edema, high fever, and acute transaminitis', pt: 'Drug reaction with eosinophilia and systemic symptoms', soc: 'Skin and subcutaneous tissue disorders', llt: 'DRESS syndrome', rationale: 'RegiSCAR criteria satisfied: fever > 38.5C, eosinophilia > 1.5, rash > 50% BSA, transaminitis > 2x ULN.' }
    ]),
    JSON.stringify({
      isSerious: true,
      criteria: ['life_threatening', 'hospitalization'],
      justification: 'Severe multiorgan systemic hypersensitivity requiring HDU admission and systemic corticosteroids.'
    }),
    'Probable',
    7,
    JSON.stringify({
      q1_previous_conclusive_reports: 1, q2_adverse_event_after_drug: 2, q3_adverse_event_improved_dechallenge: 1,
      q4_rechallenge_adverse_event: 0, q5_alternative_causes: 1, q6_placebo_reaction: 0,
      q7_drug_detected_body: 0, q8_dose_relationship: 0, q9_similar_reaction_in_past: 0,
      q10_objective_evidence_confirmed: 1
    }),
    'This spontaneous ICSR from a neurologist describes a 48-year-old male patient (S.K., 74 kg) who developed life-threatening DRESS syndrome following carbamazepine therapy for focal epilepsy. Onset occurred 21 days after drug initiation. Eosinophils peaked at 2.8 x 10^9/L and ALT at 480 U/L. Carbamazepine was permanently withdrawn with positive dechallenge under corticosteroid therapy. Causality is assessed as Probable (Naranjo score 7).',
    JSON.stringify({
      meddraWeight: 25, seriousnessWeight: 25, causalityWeight: 25, narrativeWeight: 25,
      rubricPoints: [
        { category: 'MedDRA', criterion: 'Correct PT "Drug reaction with eosinophilia and systemic symptoms"', maxPoints: 25 },
        { category: 'Seriousness', criterion: 'Correctly identified Life-Threatening & Hospitalization', maxPoints: 25 },
        { category: 'Causality', criterion: 'Identified classic 2-6 week delayed hypersensitivity latency', maxPoints: 15 },
        { category: 'Causality', criterion: 'WHO-UMC Probable classification & Naranjo calculation (~7)', maxPoints: 10 },
        { category: 'Narrative', criterion: 'Chronological detailing of initiation, 3-week onset, organ involvement, and dechallenge', maxPoints: 25 }
      ]
    })
  );

  insertVersion.run('ver-case4-v1', case4Id, 1, JSON.stringify(case4Data), 'Initial approved clinical simulation case', 'usr-admin-01');

  // Insert initial assignments to students (Idempotent with INSERT OR IGNORE)
  const insertAssignment = db.prepare(`
    INSERT OR IGNORE INTO assignments (id, case_id, student_id, assigned_by, due_date, instructions, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertAssignment.run(
    'asg-2026-001',
    case1Id,
    'usr-student-01',
    'usr-mentor-01',
    '2026-11-05 23:59:59',
    'Perform complete ICSR intake analysis: MedDRA PT coding for both cardiac and neurological manifestations, ICH E2A seriousness criteria justification, Naranjo causality calculation, and draft an E2B-compliant CIOMS-I narrative.',
    'assigned'
  );

  insertAssignment.run(
    'asg-2026-002',
    case2Id,
    'usr-student-01',
    'usr-mentor-01',
    '2026-11-12 23:59:59',
    'Evaluate drug-drug interaction mechanism between Rivaroxaban and Clarithromycin. Code adverse events, evaluate seriousness, and explain why dechallenge is positive.',
    'assigned'
  );

  insertAssignment.run(
    'asg-2026-003',
    case3Id,
    'usr-student-02',
    'usr-mentor-02',
    '2026-11-08 23:59:59',
    'Focus on pharmacogenomic risk factors (HLA-B*58:01) in causality assessment and draft standard CIOMS summary.',
    'assigned'
  );

  insertAssignment.run(
    'asg-2026-004',
    case4Id,
    'usr-student-03',
    'usr-mentor-01',
    '2026-11-15 23:59:59',
    'Analyze multiorgan systemic involvement (skin, liver, hematology) in carbamazepine-induced DRESS syndrome. Complete MedDRA coding and Naranjo calculation.',
    'assigned'
  );
}
