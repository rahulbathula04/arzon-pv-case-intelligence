import { db, initDatabase } from './database.js';

export function seedDatabase() {
  initDatabase();

  // Check if users already exist
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (existingUsers.count > 0) {
    return; // Already seeded
  }

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, full_name, role, cohort)
    VALUES (?, ?, ?, ?, ?)
  `);

  const users = [
    { id: 'usr-admin-01', email: 'admin@arzon.global', full_name: 'Dr. Arzon Director', role: 'admin', cohort: 'Leadership' },
    { id: 'usr-mentor-01', email: 'priya.sharma@arzon.global', full_name: 'Dr. Priya Sharma, MD', role: 'mentor', cohort: 'PV Faculty' },
    { id: 'usr-mentor-02', email: 'vikram.kumar@arzon.global', full_name: 'Vikram Kumar, M.Pharm', role: 'mentor', cohort: 'Safety Operations' },
    { id: 'usr-student-01', email: 'rahul.varma@arzon.student', full_name: 'Rahul Varma', role: 'student', cohort: 'Pharm.D 2026-Q1' },
    { id: 'usr-student-02', email: 'ananya.sen@arzon.student', full_name: 'Ananya Sen', role: 'student', cohort: 'M.Pharm 2026-Q1' },
    { id: 'usr-student-03', email: 'rohit.mehta@arzon.student', full_name: 'Rohit Mehta', role: 'student', cohort: 'B.Pharm 2026-Q1' }
  ];

  for (const u of users) {
    insertUser.run(u.id, u.email, u.full_name, u.role, u.cohort);
  }

  // Insert Fictional ICSR Cases
  const insertCase = db.prepare(`
    INSERT INTO cases (
      id, case_number, title, therapeutic_area, difficulty, source_type,
      is_fictional, fictional_disclaimer, status, active_version,
      patient_initials, patient_age, patient_gender, patient_weight_kg,
      medical_history, suspect_drugs, concomitant_drugs, adverse_events,
      lab_tests, verbatim_narrative, reporter_type, receipt_date
    ) VALUES (
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  const insertRefKey = db.prepare(`
    INSERT INTO reference_keys (
      case_id, expected_meddra_terms, expected_seriousness,
      expected_causality_who, expected_naranjo_score, expected_naranjo_breakdown,
      model_cioms_narrative, grading_rubric
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertVersion = db.prepare(`
    INSERT INTO case_versions (id, case_id, version_number, snapshot_json, changelog, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // CASE 1: Oncology (Immune Checkpoint Inhibitor Myocarditis)
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

  insertCase.run(
    case1Data.id, case1Data.caseNumber, case1Data.title, case1Data.therapeuticArea,
    case1Data.difficulty, case1Data.sourceType, case1Data.isFictional,
    case1Data.fictionalDisclaimer, case1Data.status, case1Data.activeVersion,
    case1Data.patientInitials, case1Data.patientAge, case1Data.patientGender,
    case1Data.patientWeightKg, case1Data.medicalHistory, JSON.stringify(case1Data.suspectDrugs),
    JSON.stringify(case1Data.concomitantDrugs), JSON.stringify(case1Data.adverseEvents),
    JSON.stringify(case1Data.labTests), case1Data.verbatimNarrative, case1Data.reporterType,
    case1Data.receiptDate
  );

  insertRefKey.run(
    case1Id,
    JSON.stringify([
      { verbatim: 'acute heart inflammation and cardiogenic shock', pt: 'Myocarditis', soc: 'Cardiac disorders', llt: 'Acute myocarditis', rationale: 'Direct inflammatory myocardial injury caused by checkpoint inhibition.' },
      { verbatim: 'bilateral eyelid drooping and proximal muscle weakness', pt: 'Myasthenia gravis', soc: 'Nervous system disorders', llt: 'Ocular and generalized myasthenia gravis', rationale: 'Known immune-related adverse event frequently co-occurring with ICI myocarditis.' }
    ]),
    JSON.stringify({
      isSerious: true,
      criteria: ['life_threatening', 'hospitalization', 'disability'],
      justification: 'Patient experienced cardiogenic shock requiring CCU admission and inotropic support (life-threatening and required inpatient hospitalization). Proximal weakness caused temporary severe incapacity (disability).'
    }),
    'Probable',
    7,
    JSON.stringify({
      q1_previous_conclusive_reports: 1,
      q2_adverse_event_after_drug: 2,
      q3_adverse_event_improved_dechallenge: 1,
      q4_rechallenge_adverse_event: 0,
      q5_alternative_causes: 2,
      q6_placebo_reaction: 0,
      q7_drug_detected_body: 0,
      q8_dose_relationship: 0,
      q9_similar_reaction_in_past: 0,
      q10_objective_evidence_confirmed: 1
    }),
    'This medically confirmed spontaneous report from an oncologist describes a 62-year-old male patient (M.K., 78.5 kg) with metastatic melanoma who experienced life-threatening immune-mediated myocarditis and concomitant myasthenia gravis while receiving pembrolizumab (Keytruda).\n\nThe patient was initiated on pembrolizumab 200 mg IV every 3 weeks on 10-AUG-2026 for metastatic melanoma. Concomitant medications included amlodipine 5 mg daily for hypertension and atorvastatin 20 mg daily. The patient had no prior cardiac or autoimmune history.\n\nOn 21-SEP-2026, the patient received his 3rd cycle. On 26-SEP-2026 (Day 47 post first dose, Day 5 post 3rd cycle), he developed bilateral ptosis and muscle fatigue. On 28-SEP-2026, he presented with cardiogenic shock, marked troponin I elevation (4250 ng/L), CK elevation (1890 U/L), and an LVEF reduction to 35%. Cardiac MRI confirmed acute myocarditis. Anti-AChR antibodies were elevated (8.4 nmol/L).\n\nPembrolizumab was permanently withdrawn. The patient was hospitalized in the CCU, treated with IV pulse methylprednisolone 1000 mg/day, inotropic support, and plasma exchange. The patient improved and was discharged on 18-OCT-2026 with an LVEF of 48%. The reporting oncologist and company safety assessment consider the relationship between pembrolizumab and the events (myocarditis and myasthenia gravis) as probable according to WHO-UMC and Naranjo criteria (score 7).',
    JSON.stringify({
      meddraWeight: 25,
      seriousnessWeight: 25,
      causalityWeight: 25,
      narrativeWeight: 25,
      rubricPoints: [
        { category: 'MedDRA', criterion: 'Correct PT "Myocarditis" identified for cardiac inflammation', maxPoints: 15 },
        { category: 'MedDRA', criterion: 'Correct PT "Myasthenia gravis" identified for ptosis and muscle weakness', maxPoints: 10 },
        { category: 'Seriousness', criterion: 'Identified as Serious', maxPoints: 5 },
        { category: 'Seriousness', criterion: 'Correctly flagged Life-Threatening & Hospitalization criteria', maxPoints: 20 },
        { category: 'Causality', criterion: 'Assigned WHO-UMC category "Probable/Likely"', maxPoints: 15 },
        { category: 'Causality', criterion: 'Naranjo score between 6-8 with valid dechallenge credit', maxPoints: 10 },
        { category: 'Narrative', criterion: 'Chronological timeline (initial cycle -> onset -> hospitalization -> dechallenge -> resolution)', maxPoints: 15 },
        { category: 'Narrative', criterion: 'Inclusion of all essential ICSR data elements (age, gender, indications, doses, lab markers)', maxPoints: 10 }
      ]
    })
  );

  insertVersion.run('ver-case1-v1', case1Id, 1, JSON.stringify(case1Data), 'Initial approved clinical simulation case', 'usr-admin-01');

  // CASE 2: Cardiology (Drug-Drug Interaction Rivaroxaban + Clarithromycin -> Retroperitoneal Bleed)
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
      { testName: 'Serum Creatinine', value: '2.1', unit: 'mg/dL', normalRange: '0.6 - 1.1 mg/dL', testDate: '2026-10-04', interpretation: 'Elevated' },
      { testName: 'Abdominal CT Angiography', value: 'Large 12x8 cm left retroperitoneal hematoma with active extravasation', unit: '', normalRange: 'Normal', testDate: '2026-10-04', interpretation: 'Critical' }
    ],
    verbatimNarrative: 'Report from an emergency medicine physician: A 71-year-old female (D.B., 54 kg) on chronic rivaroxaban 20 mg daily for non-valvular AF was prescribed clarithromycin 500 mg BID for bronchitis by her primary care doctor on 30-SEP-2026. On 04-OCT-2026 (day 5 of antibiotic therapy), she collapsed at home with severe left flank pain, pallor, and diaphoresis. Upon EMS arrival, BP was 70/40 mmHg and pulse 135 bpm. In the emergency department, hemoglobin dropped from her baseline of 12.4 g/dL to 5.8 g/dL. Abdominal CT angiography confirmed a massive active retroperitoneal hematoma. Anti-Factor Xa activity was markedly elevated at 620 ng/mL, demonstrating severe drug accumulation caused by potent CYP3A4 and P-glycoprotein inhibition by clarithromycin in the setting of borderline renal impairment. The patient was resuscitated with 4 units of packed red blood cells and administered Andexanet alfa reversal agent. Urgent transcatheter arterial embolization was performed successfully. Both rivaroxaban and clarithromycin were withdrawn. The patient survived and was stabilized after 11 days of hospitalization.',
    reporterType: 'Emergency Medicine Physician',
    receiptDate: '2026-10-06'
  };

  insertCase.run(
    case2Data.id, case2Data.caseNumber, case2Data.title, case2Data.therapeuticArea,
    case2Data.difficulty, case2Data.sourceType, case2Data.isFictional,
    case2Data.fictionalDisclaimer, case2Data.status, case2Data.activeVersion,
    case2Data.patientInitials, case2Data.patientAge, case2Data.patientGender,
    case2Data.patientWeightKg, case2Data.medicalHistory, JSON.stringify(case2Data.suspectDrugs),
    JSON.stringify(case2Data.concomitantDrugs), JSON.stringify(case2Data.adverseEvents),
    JSON.stringify(case2Data.labTests), case2Data.verbatimNarrative, case2Data.reporterType,
    case2Data.receiptDate
  );

  insertRefKey.run(
    case2Id,
    JSON.stringify([
      { verbatim: 'massive retroperitoneal hemorrhage and severe hemorrhagic shock', pt: 'Retroperitoneal haematoma', soc: 'Vascular disorders', llt: 'Retroperitoneal hemorrhage', rationale: 'Bleeding into retroperitoneal space precipitated by DOAC overdose/interaction.' }
    ]),
    JSON.stringify({
      isSerious: true,
      criteria: ['life_threatening', 'hospitalization'],
      justification: 'Severe hemorrhagic shock with Hb dropping to 5.8 g/dL requiring immediate transfusion, CCU stay, and transcatheter embolization.'
    }),
    'Probable',
    6,
    JSON.stringify({
      q1_previous_conclusive_reports: 1,
      q2_adverse_event_after_drug: 2,
      q3_adverse_event_improved_dechallenge: 1,
      q4_rechallenge_adverse_event: 0,
      q5_alternative_causes: 1,
      q6_placebo_reaction: 0,
      q7_drug_detected_body: 1,
      q8_dose_relationship: 0,
      q9_similar_reaction_in_past: 0,
      q10_objective_evidence_confirmed: 1
    }),
    'This spontaneous ICSR from an emergency physician reports a case of life-threatening retroperitoneal hematoma in a 71-year-old female (D.B., 54 kg) receiving rivaroxaban (Xarelto) and clarithromycin (Biaxin).\n\nThe patient was maintained on rivaroxaban 20 mg once daily since 12-APR-2025 for non-valvular AF. On 30-SEP-2026, clarithromycin 500 mg twice daily was co-prescribed for bronchitis. Baseline serum creatinine was 1.3 mg/dL.\n\nOn 04-OCT-2026 (5 days post antibiotic introduction), the patient suffered acute circulatory collapse (BP 70/40 mmHg) and severe left flank pain. Hemoglobin was critically low at 5.8 g/dL. Anti-Factor Xa levels were severely supratherapeutic at 620 ng/mL, consistent with potent CYP3A4 and P-gp mediated clearance inhibition of rivaroxaban by clarithromycin.\n\nCT angiography revealed a 12x8 cm active retroperitoneal hematoma. Both medications were permanently withdrawn. The patient received 4 units PRBCs, andexanet alfa, and emergent arterial embolization. The patient recovered with sequelae. The causality between the drug interaction and the hemorrhage is considered Probable (WHO-UMC) with a Naranjo score of 6.',
    JSON.stringify({
      meddraWeight: 25,
      seriousnessWeight: 25,
      causalityWeight: 25,
      narrativeWeight: 25,
      rubricPoints: [
        { category: 'MedDRA', criterion: 'Correct PT "Retroperitoneal haematoma" or "Retroperitoneal haemorrhage"', maxPoints: 25 },
        { category: 'Seriousness', criterion: 'Correctly identified as Life-Threatening & Hospitalization', maxPoints: 25 },
        { category: 'Causality', criterion: 'Identified pharmacokinetic interaction mechanism (CYP3A4/P-gp)', maxPoints: 15 },
        { category: 'Causality', criterion: 'WHO-UMC Probable classification & Naranjo calculation', maxPoints: 10 },
        { category: 'Narrative', criterion: 'Clear chronological recounting of long-term DOAC, addition of clarithromycin, and acute bleed', maxPoints: 15 },
        { category: 'Narrative', criterion: 'Mention of anti-factor Xa lab level and andexanet alfa reversal', maxPoints: 10 }
      ]
    })
  );

  insertVersion.run('ver-case2-v1', case2Id, 1, JSON.stringify(case2Data), 'Initial approved clinical simulation case', 'usr-admin-01');

  // CASE 3: Dermatology / Immunology (Allopurinol Stevens-Johnson Syndrome)
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
    verbatimNarrative: 'Hospital dermatologist reporting: A 53-year-old male with chronic gout and CKD stage 3 was started on allopurinol 300 mg daily on 01-SEP-2026 without prior HLA-B*58:01 screening. On 16-SEP-2026 (Day 16 of therapy), he developed high fevers (39.2°C), sore throat, painful conjunctivitis, and a targetoid maculopapular rash on the trunk. Over the next 48 hours, flaccid bullae formed with positive Nikolsky sign and epidermal detachment involving 18% total body surface area, accompanied by severe hemorrhagic crusting of the lips and oral mucosa. Allopurinol was immediately stopped on 18-SEP-2026. The patient was admitted to the regional Burn ICU. High-dose IV immunoglobulin (IVIG) and systemic corticosteroids were administered. Genetic testing confirmed the presence of HLA-B*58:01. Skin re-epithelialization commenced on hospital day 10. The dermatologist classified the event as SJS/TEN overlap syndrome induced by allopurinol.',
    reporterType: 'Hospital Dermatologist',
    receiptDate: '2026-09-22'
  };

  insertCase.run(
    case3Data.id, case3Data.caseNumber, case3Data.title, case3Data.therapeuticArea,
    case3Data.difficulty, case3Data.sourceType, case3Data.isFictional,
    case3Data.fictionalDisclaimer, case3Data.status, case3Data.activeVersion,
    case3Data.patientInitials, case3Data.patientAge, case3Data.patientGender,
    case3Data.patientWeightKg, case3Data.medicalHistory, JSON.stringify(case3Data.suspectDrugs),
    JSON.stringify(case3Data.concomitantDrugs), JSON.stringify(case3Data.adverseEvents),
    JSON.stringify(case3Data.labTests), case3Data.verbatimNarrative, case3Data.reporterType,
    case3Data.receiptDate
  );

  insertRefKey.run(
    case3Id,
    JSON.stringify([
      { verbatim: 'severe skin detachment over 18% body surface area and painful oral mucosal sloughing', pt: 'Stevens-Johnson syndrome', soc: 'Skin and subcutaneous tissue disorders', llt: 'Stevens-Johnson syndrome', rationale: '18% BSA epidermal detachment corresponds to SJS/TEN overlap, correctly coded under SJS or Toxic epidermal necrolysis.' }
    ]),
    JSON.stringify({
      isSerious: true,
      criteria: ['life_threatening', 'hospitalization'],
      justification: 'Severe cutaneous adverse reaction requiring Burn ICU admission and carries high mortality risk.'
    }),
    'Probable',
    7,
    JSON.stringify({
      q1_previous_conclusive_reports: 1,
      q2_adverse_event_after_drug: 2,
      q3_adverse_event_improved_dechallenge: 1,
      q4_rechallenge_adverse_event: 0,
      q5_alternative_causes: 1,
      q6_placebo_reaction: 0,
      q7_drug_detected_body: 0,
      q8_dose_relationship: 1,
      q9_similar_reaction_in_past: 0,
      q10_objective_evidence_confirmed: 1
    }),
    'This spontaneous ICSR from a dermatologist describes a 53-year-old male patient (T.H., 82 kg) who developed severe Stevens-Johnson syndrome / Toxic Epidermal Necrolysis overlap following allopurinol therapy for chronic gout.\n\nAllopurinol 300 mg daily was initiated on 01-SEP-2026. On 16-SEP-2026 (Day 16), the patient developed high pyrexia, mucosal lesions, and widespread epidermal blistering covering 18% BSA with positive Nikolsky sign. Skin biopsy demonstrated full-thickness epidermal necrosis, and HLA-B*58:01 testing was positive.\n\nAllopurinol was withdrawn on 18-SEP-2026. The patient was admitted to a burn ICU and managed with IVIG. The patient improved. Causality is assessed as Probable (Naranjo score 7).',
    JSON.stringify({
      meddraWeight: 25,
      seriousnessWeight: 25,
      causalityWeight: 25,
      narrativeWeight: 25,
      rubricPoints: [
        { category: 'MedDRA', criterion: 'Correct PT "Stevens-Johnson syndrome" or "Toxic epidermal necrolysis"', maxPoints: 25 },
        { category: 'Seriousness', criterion: 'Correctly marked Serious (Hospitalization, Life-threatening)', maxPoints: 25 },
        { category: 'Causality', criterion: 'Recognized 2-3 week latency and HLA-B*58:01 pharmacogenomic risk factor', maxPoints: 15 },
        { category: 'Causality', criterion: 'WHO-UMC Probable categorization', maxPoints: 10 },
        { category: 'Narrative', criterion: 'Well-structured narrative detailing start date, latency, BSA %, ICU management', maxPoints: 25 }
      ]
    })
  );

  insertVersion.run('ver-case3-v1', case3Id, 1, JSON.stringify(case3Data), 'Initial approved clinical simulation case', 'usr-admin-01');

  // Insert initial assignments to student Rahul Varma
  const insertAssignment = db.prepare(`
    INSERT INTO assignments (id, case_id, student_id, assigned_by, due_date, instructions, status)
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
}
