import { Router } from 'express';
import multer from 'multer';
import * as pdfParseModule from 'pdf-parse';
import { db, computeClinicalFingerprint } from '../db/database.js';
import { requireRole } from '../middleware/auth.js';

export const importPdfRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

async function extractTextFromPdf(dataBuffer: Buffer): Promise<string> {
  try {
    // pdf-parse v2+ class API
    const PDFParseClass = (pdfParseModule as any).PDFParse || (pdfParseModule as any).default?.PDFParse;
    if (typeof PDFParseClass === 'function') {
      const parser = new PDFParseClass({ data: dataBuffer });
      const res = await parser.getText();
      await parser.destroy();
      return res?.text || '';
    }
    // pdf-parse v1 function API
    if (typeof (pdfParseModule as any).default === 'function') {
      const res = await (pdfParseModule as any).default(dataBuffer);
      return res?.text || '';
    }
    if (typeof (pdfParseModule as any) === 'function') {
      const res = await (pdfParseModule as any)(dataBuffer);
      return res?.text || '';
    }
  } catch (parseErr: any) {
    console.error('Inner PDF parser error:', parseErr);
    throw new Error('PDF parsing failed: ' + (parseErr.message || 'Corrupt or unreadable PDF document'));
  }
  throw new Error('No compatible PDF parser available');
}

// Intelligent clinical entity parser for PDF text
export function parseClinicalEntitiesFromText(text: string, filename: string) {
  // 1. Patient Age & Gender heuristics
  const ageMatch = text.match(/(\b\d{1,2}\b)[ -]?(years?([ -]old)?|yo|yr|y\.o\.)/i) || text.match(/age[:\s]+(\d{1,2})/i);
  const patientAge = ageMatch ? parseInt(ageMatch[1], 10) : 56;

  const genderMatch = text.match(/\b(male|female|man|woman)\b/i);
  let patientGender: 'Male' | 'Female' | 'Other' | 'Unknown' = 'Unknown';
  if (genderMatch) {
    const g = genderMatch[1].toLowerCase();
    patientGender = (g === 'male' || g === 'man') ? 'Male' : (g === 'female' || g === 'woman') ? 'Female' : 'Unknown';
  }

  const initialsMatch = text.match(/(?:patient(?:\s+initials)?|\binitials)[:\s\(\]]*([A-Z]\.[A-Z]\.?)/) || text.match(/\b([A-Z]\.[A-Z]\.)\b/);
  const patientInitials = initialsMatch ? initialsMatch[1] : 'P.T.';

  const weightMatch = text.match(/weight[:\s]+(\d{2,3}(?:\.\d)?)\s*(?:kg|kilos)/i);
  const patientWeightKg = weightMatch ? parseFloat(weightMatch[1]) : 70.0;

  // 2. Suspect Drug Identification
  const drugMatches = [
    { name: 'Keytruda', inn: 'Pembrolizumab', area: 'Oncology' },
    { name: 'Xarelto', inn: 'Rivaroxaban', area: 'Cardiology' },
    { name: 'Eliquis', inn: 'Apixaban', area: 'Cardiology' },
    { name: 'Humira', inn: 'Adalimumab', area: 'Immunology' },
    { name: 'Zyloprim', inn: 'Allopurinol', area: 'Immunology' },
    { name: 'Clozaril', inn: 'Clozapine', area: 'Psychiatry' },
    { name: 'Tegretol', inn: 'Carbamazepine', area: 'Neurology' },
    { name: 'Augmentin', inn: 'Amoxicillin-clavulanic acid', area: 'Gastroenterology' },
    { name: 'Jardiance', inn: 'Empagliflozin', area: 'Endocrinology' },
    { name: 'Opdivo', inn: 'Nivolumab', area: 'Oncology' }
  ];

  let detectedDrug = drugMatches.find(d => 
    new RegExp(`\\b(${d.name}|${d.inn})\\b`, 'i').test(text)
  ) || { name: 'Suspect Investigational Product', inn: 'Active Pharmacological Entity', area: 'General Medicine' };

  // 3. Seriousness Criteria Markers
  const hasDeath = /\b(fatal|death|died|succumbed)\b/i.test(text);
  const hasLifeThreat = /\b(life[- ]threatening|shock|cardiac arrest|resuscitat|hemodynamic collapse|circulatory collapse)\b/i.test(text);
  const hasHosp = /\b(hospitali[sz]ed|admission|admitted to|icu|ccu|inpatient)\b/i.test(text);
  const hasDisability = /\b(disabilit|incapacit|permanent impairment)\b/i.test(text);

  // 4. Lab Values Extraction
  const labs: any[] = [];
  const labPatterns = [
    { regex: /(?:troponin[ -]?[I|T]?|cTnI)(?:[\s:]+(?:was|is|of)?)?\s*([\d\.]+)\s*(ng\/L|ng\/mL|mcg\/L)?/i, name: 'Cardiac Troponin' },
    { regex: /(?:creatinine|Cr)(?:[\s:]+(?:was|is|of)?)?\s*([\d\.]+)\s*(mg\/dL|umol\/L)?/i, name: 'Serum Creatinine' },
    { regex: /(?:hemoglobin|hb)(?:[\s:]+(?:was|is|of)?)?\s*([\d\.]+)\s*(g\/dL)?/i, name: 'Hemoglobin' },
    { regex: /alt(?:[\s:]+(?:was|is|of)?)?\s*([\d\.]+)\s*(U\/L)?/i, name: 'Alanine Aminotransferase (ALT)' },
    { regex: /ast(?:[\s:]+(?:was|is|of)?)?\s*([\d\.]+)\s*(U\/L)?/i, name: 'Aspartate Aminotransferase (AST)' },
    { regex: /platelet[s]?(?:[\s:]+(?:was|is|of|count)?)?\s*([\d\.]+)\s*(x10\^9\/L)?/i, name: 'Platelet Count' },
    { regex: /bilirubin(?:[\s:]+(?:was|is|of)?)?\s*([\d\.]+)\s*(mg\/dL)?/i, name: 'Total Bilirubin' }
  ];

  for (const lp of labPatterns) {
    const match = text.match(lp.regex);
    if (match) {
      labs.push({
        testName: lp.name,
        value: match[1],
        unit: match[2] || '',
        normalRange: 'Standard Reference',
        testDate: new Date().toISOString().slice(0, 10),
        interpretation: 'Reported'
      });
    }
  }

  // 5. Derive Verbatim Adverse Event
  let verbatimAE = 'Adverse drug reaction following pharmaceutical administration';
  const aePatterns = [
    /experienced\s+([^\.]+?(?:reaction|syndrome|toxicity|rash|pain|failure|hemorrhage|haematoma|infarction|shock))/i,
    /presented with\s+([^\.]+?(?:dyspnea|fever|jaundice|rash|edema|bleeding|collapse|weakness))/i,
    /developed\s+([^\.]+?(?:symptoms|blistering|ulcers|damage|injury|myocarditis))/i
  ];

  for (const ap of aePatterns) {
    const match = text.match(ap);
    if (match) {
      verbatimAE = match[1].trim().slice(0, 120);
      break;
    }
  }

  return {
    sourceFilename: filename,
    therapeuticArea: detectedDrug.area,
    patientInitials,
    patientAge,
    patientGender,
    patientWeightKg,
    suspectDrug: {
      name: detectedDrug.name,
      inn: detectedDrug.inn,
      role: 'Suspect' as const,
      dose: 'Standard Therapeutic Dose',
      route: 'Oral / Systemic',
      frequency: 'Once Daily',
      startDate: '2026-07-01',
      stopDate: '2026-07-20',
      indication: 'Primary disease state',
      actionTaken: 'Drug Withdrawn' as const,
      dechallenge: 'Positive' as const,
      rechallenge: 'Not Done' as const
    },
    adverseEvent: {
      verbatim: verbatimAE,
      meddraPt: 'Adverse drug reaction',
      meddraSoc: 'General disorders and administration site conditions',
      onsetDate: '2026-07-18',
      outcome: 'Recovering/Resolving' as const,
      seriousness: {
        isSerious: hasDeath || hasLifeThreat || hasHosp || hasDisability,
        criteria: {
          death: hasDeath,
          lifeThreatening: hasLifeThreat,
          hospitalization: hasHosp || true,
          disability: hasDisability,
          congenitalAnomaly: false,
          otherMedicallyImportant: false
        }
      }
    },
    labs,
    rawTextPreview: text.slice(0, 3000),
    title: `Safety Case Study: ${detectedDrug.name} (${detectedDrug.inn}) - ${verbatimAE.slice(0, 60)}`
  };
}

// POST /api/import/pdf - Process uploaded PDF and stage extracted entities
importPdfRouter.post('/pdf', requireRole(['admin', 'mentor']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided in request' });
    }

    const dataBuffer = req.file.buffer;
    const rawText = await extractTextFromPdf(dataBuffer);

    if (!rawText.trim()) {
      return res.status(422).json({ error: 'PDF contained no readable text. It may be scanned or empty.' });
    }

    const extracted = parseClinicalEntitiesFromText(rawText, req.file.originalname);

    res.json({
      success: true,
      message: 'PDF extracted successfully. Review and verify structured fields before saving to library.',
      extracted
    });
  } catch (err: any) {
    console.error('PDF parsing error:', err);
    res.status(500).json({ error: 'Failed to extract PDF', details: err.message });
  }
});

// POST /api/import/verify-and-save - Save human-verified case into SQLite database
importPdfRouter.post('/verify-and-save', requireRole(['admin', 'mentor']), (req, res) => {
  const {
    title, therapeuticArea, difficulty, patientInitials, patientAge,
    patientGender, patientWeightKg, medicalHistory, suspectDrugs,
    concomitantDrugs, adverseEvents, labTests, verbatimNarrative,
    reporterType, receiptDate, referenceKey, sourceFilename
  } = req.body;

  if (!title || !therapeuticArea || !verbatimNarrative) {
    return res.status(400).json({ error: 'Missing mandatory verified case fields' });
  }

  // Check duplicate via clinical fingerprint
  const fingerprint = computeClinicalFingerprint({
    title, therapeuticArea, patientInitials, patientAge: Number(patientAge),
    patientGender, suspectDrugs, adverseEvents
  });

  const existingByFp = db.prepare('SELECT id, case_number, title FROM cases WHERE clinical_fingerprint = ?').get(fingerprint) as any;
  if (existingByFp) {
    return res.status(409).json({
      error: 'Duplicate case detected',
      message: `An identical case already exists in the library (${existingByFp.case_number}: "${existingByFp.title}").`,
      existingCaseNumber: existingByFp.case_number,
      existingCaseId: existingByFp.id
    });
  }

  const caseId = `case-pdf-${Date.now()}`;
  const areaCode = therapeuticArea.slice(0, 3).toUpperCase();
  const caseNumber = `ARZ-${new Date().getFullYear()}-${areaCode}-PDF${Math.floor(100 + Math.random() * 899)}`;

  // Save case
  const insertCase = db.prepare(`
    INSERT INTO cases (
      id, case_number, clinical_fingerprint, title, therapeutic_area, difficulty, source_type,
      is_fictional, fictional_disclaimer, status, active_version,
      patient_initials, patient_age, patient_gender, patient_weight_kg,
      medical_history, suspect_drugs, concomitant_drugs, adverse_events,
      lab_tests, verbatim_narrative, reporter_type, receipt_date
    ) VALUES (
      ?, ?, ?, ?, ?, ?, 'pdf_imported',
      1, 'CONTROLLED FICTIONAL TRAINING SCENARIO · SOURCED FROM VERIFIED CASE STUDY LITERATURE', 'approved', 1,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?
    )
  `);

  insertCase.run(
    caseId, caseNumber, fingerprint, title, therapeuticArea, difficulty || 'Intermediate',
    patientInitials || 'P.X.', Number(patientAge) || 50, patientGender || 'Unknown',
    patientWeightKg ? Number(patientWeightKg) : 70,
    medicalHistory || 'Extracted from source case study.',
    JSON.stringify(suspectDrugs || []), JSON.stringify(concomitantDrugs || []),
    JSON.stringify(adverseEvents || []), JSON.stringify(labTests || []),
    verbatimNarrative, reporterType || 'Medical Journal Case Report',
    receiptDate || new Date().toISOString().slice(0, 10)
  );

  // Save reference keys
  if (referenceKey) {
    const insertRefKey = db.prepare(`
      INSERT INTO reference_keys (
        case_id, expected_meddra_terms, expected_seriousness,
        expected_causality_who, expected_naranjo_score, expected_naranjo_breakdown,
        model_cioms_narrative, grading_rubric
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertRefKey.run(
      caseId,
      JSON.stringify(referenceKey.expectedMeddraTerms || []),
      JSON.stringify(referenceKey.expectedSeriousness || { isSerious: true, criteria: ['hospitalization'] }),
      referenceKey.expectedCausalityWho || 'Probable',
      Number(referenceKey.expectedNaranjoScore) || 6,
      JSON.stringify(referenceKey.expectedNaranjoBreakdown || {}),
      referenceKey.modelCiomsNarrative || verbatimNarrative,
      JSON.stringify(referenceKey.gradingRubric || {
        meddraWeight: 25,
        seriousnessWeight: 25,
        causalityWeight: 25,
        narrativeWeight: 25
      })
    );
  }

  // Version 1 record
  db.prepare(`
    INSERT INTO case_versions (id, case_id, version_number, snapshot_json, changelog, created_by)
    VALUES (?, ?, 1, ?, ?, ?)
  `).run(`ver-${caseId}-1`, caseId, JSON.stringify(req.body), `Imported and verified from ${sourceFilename || 'PDF Case'}`, req.user?.id || 'usr-admin-01');

  // Audit log
  db.prepare(`
    INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, details)
    VALUES (?, 'case', ?, 'PDF_IMPORT_VERIFY', ?, ?)
  `).run(`log-${Date.now()}`, caseId, req.user?.id || 'usr-admin-01', `Imported & verified ${caseNumber} from ${sourceFilename}`);

  res.status(201).json({
    success: true,
    message: `Case ${caseNumber} verified and published to Case Library.`,
    caseId,
    caseNumber
  });
});
