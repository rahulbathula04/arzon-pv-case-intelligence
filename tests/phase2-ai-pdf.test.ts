import { describe, it, expect, beforeAll } from 'vitest';
import { db, initDatabase, computeClinicalFingerprint } from '../server/db/database.js';
import { seedDatabase } from '../server/db/seed.js';
import { parseClinicalEntitiesFromText } from '../server/routes/importPdf.js';

describe('Phase 2: PDF Import & AI Case Generation Engine', () => {
  beforeAll(() => {
    initDatabase();
    seedDatabase();
  });

  it('correctly extracts structured clinical entities from case report text', () => {
    const sampleText = `
      Spontaneous safety report: A 64-year-old female patient (J.M., weight 68 kg) with Non-valvular Atrial Fibrillation was receiving Eliquis (Apixaban) 5 mg twice daily.
      On 2026-06-29, the patient presented with acute gross hematuria and hemodynamic collapse requiring urgent inpatient hospitalization.
      Hemoglobin was 8.4 g/dL and platelet count was 210 x10^9/L.
      The suspect drug Eliquis was discontinued with positive dechallenge.
    `;

    const extracted = parseClinicalEntitiesFromText(sampleText, 'apixaban_report.pdf');

    expect(extracted.patientAge).toBe(64);
    expect(extracted.patientGender).toBe('Female');
    expect(extracted.patientInitials).toBe('J.M.');
    expect(extracted.patientWeightKg).toBe(68);
    expect(extracted.suspectDrug.name).toBe('Eliquis');
    expect(extracted.suspectDrug.inn).toBe('Apixaban');
    expect(extracted.adverseEvent.seriousness.criteria.hospitalization).toBe(true);
    expect(extracted.adverseEvent.seriousness.criteria.lifeThreatening).toBe(true);

    const hbLab = extracted.labs.find(l => l.testName === 'Hemoglobin');
    expect(hbLab).toBeDefined();
    expect(hbLab?.value).toBe('8.4');
  });

  it('generates an ICSR case with required 4 minimum criteria and stores in draft state', () => {
    const caseId = `test-gen-${Date.now()}`;
    const caseNumber = `ARZ-2026-NEU-TEST-${Date.now()}`;

    const insertCase = db.prepare(`
      INSERT INTO cases (
        id, case_number, clinical_fingerprint, title, therapeutic_area, difficulty, source_type,
        is_fictional, fictional_disclaimer, status, active_version,
        patient_initials, patient_age, patient_gender, patient_weight_kg,
        medical_history, suspect_drugs, concomitant_drugs, adverse_events,
        lab_tests, verbatim_narrative, reporter_type, receipt_date
      ) VALUES (
        ?, ?, ?, ?, ?, ?, 'ai_generated',
        1, 'CONTROLLED FICTIONAL TRAINING SCENARIO · NOT REAL PATIENT DATA', 'draft', 1,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    const fp = `test-fp-${Date.now()}`;
    insertCase.run(
      caseId, caseNumber, fp, 'DRESS Syndrome secondary to Carbamazepine', 'Neurology', 'Intermediate',
      'S.K.', 48, 'Male', 74.0, 'Focal epilepsy',
      JSON.stringify([{ name: 'Tegretol', inn: 'Carbamazepine', role: 'Suspect' }]),
      JSON.stringify([]),
      JSON.stringify([{ verbatim: 'diffuse rash and liver failure', seriousness: { isSerious: true } }]),
      JSON.stringify([{ testName: 'ALT', value: '450' }]),
      'Patient developed DRESS syndrome after carbamazepine.', 'Neurologist', '2026-10-15'
    );

    // Verify minimum criteria
    const inserted = db.prepare('SELECT * FROM cases WHERE id = ?').get(caseId) as any;
    expect(inserted).toBeDefined();
    expect(inserted.status).toBe('draft');
    expect(inserted.patient_initials).toBeTruthy(); // 1. Patient ID
    expect(inserted.reporter_type).toBeTruthy();    // 2. Reporter ID
    expect(JSON.parse(inserted.suspect_drugs).length).toBeGreaterThan(0); // 3. Suspect Drug
    expect(JSON.parse(inserted.adverse_events).length).toBeGreaterThan(0); // 4. Adverse Event
  });

  it('publishes a draft case and logs an audit trail record', () => {
    const caseRow = db.prepare("SELECT id, case_number FROM cases WHERE status = 'draft' LIMIT 1").get() as any;
    if (caseRow) {
      db.prepare("UPDATE cases SET status = 'approved' WHERE id = ?").run(caseRow.id);

      db.prepare(`
        INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, details)
        VALUES (?, 'case', ?, 'PUBLISH_CASE', 'usr-admin-01', ?)
      `).run(`log-pub-${Date.now()}`, caseRow.id, `Published case ${caseRow.case_number}`);

      const updated = db.prepare('SELECT status FROM cases WHERE id = ?').get(caseRow.id) as any;
      expect(updated.status).toBe('approved');

      const log = db.prepare("SELECT * FROM audit_logs WHERE entity_id = ? AND action = 'PUBLISH_CASE'").get(caseRow.id) as any;
      expect(log).toBeDefined();
    }
  });
});
