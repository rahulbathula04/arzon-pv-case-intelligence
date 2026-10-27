import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../data/arzon_pv.sqlite');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function computeClinicalFingerprint(data) {
  const normTitle = (data.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const area = (data.therapeutic_area || data.therapeuticArea || '').toLowerCase().trim();
  const patient = [data.patient_initials || data.patientInitials || '', data.patient_age || data.patientAge || '', data.patient_gender || data.patientGender || ''].join(':').toLowerCase();
  
  const drugs = (Array.isArray(data.suspectDrugs || data.suspect_drugs) ? (data.suspectDrugs || data.suspect_drugs) : (typeof data.suspect_drugs === 'string' ? JSON.parse(data.suspect_drugs) : []))
    .map(d => (d.inn || d.name || '').toLowerCase().trim())
    .sort()
    .join(',');

  const events = (Array.isArray(data.adverseEvents || data.adverse_events) ? (data.adverseEvents || data.adverse_events) : (typeof data.adverse_events === 'string' ? JSON.parse(data.adverse_events) : []))
    .map(e => (e.verbatim || e.meddraPt || '').toLowerCase().replace(/[^a-z0-9]/g, ''))
    .sort()
    .join(',');

  return `${normTitle}|${area}|${patient}|${drugs}|${events}`;
}

console.log('--- REPAIR & DUPLICATE CLEANUP START ---');

// 1. Ensure clinical_fingerprint column exists
try {
  db.exec('ALTER TABLE cases ADD COLUMN clinical_fingerprint TEXT;');
} catch (e) {
  // column already exists
}

// 2. Fetch all cases
const cases = db.prepare('SELECT * FROM cases ORDER BY created_at ASC').all();
console.log(`Total cases before repair: ${cases.length}`);

// Group by fingerprint
const fingerprintMap = new Map();
const duplicatesToRemove = [];

for (const c of cases) {
  const fp = computeClinicalFingerprint(c);
  if (!fingerprintMap.has(fp)) {
    fingerprintMap.set(fp, c);
    // Update clinical_fingerprint on the retained record
    db.prepare('UPDATE cases SET clinical_fingerprint = ? WHERE id = ?').run(fp, c.id);
  } else {
    // Duplicate detected
    duplicatesToRemove.push(c);
  }
}

console.log(`Duplicate cases identified by clinical fingerprint: ${duplicatesToRemove.length}`);
for (const dup of duplicatesToRemove) {
  console.log(`  -> Removing duplicate: ID=${dup.id}, Number=${dup.case_number}, Title="${dup.title}"`);
  
  // Clean up associated assignments/submissions if any
  db.prepare('DELETE FROM assignments WHERE case_id = ?').run(dup.id);
  db.prepare('DELETE FROM cases WHERE id = ?').run(dup.id);
}

// Ensure unique index
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_cases_clinical_fingerprint ON cases(clinical_fingerprint);');

// Clean up leftover test-generated assignments that do not belong to real seed cases
const testAssignments = db.prepare("SELECT id FROM assignments WHERE id LIKE 'test-asg%' OR id LIKE 'asg-overdue%' OR id LIKE 'asg-eval%' OR id LIKE 'asg-rev%'").all();
console.log(`Cleaning up test-generated assignment artifacts: ${testAssignments.length}`);
for (const asg of testAssignments) {
  db.prepare('DELETE FROM assignments WHERE id = ?').run(asg.id);
}

// Verify count after cleanup
const remainingCases = db.prepare('SELECT id, case_number, therapeutic_area, title, clinical_fingerprint FROM cases').all();
console.log(`Total cases after repair: ${remainingCases.length}`);
remainingCases.forEach((c, i) => {
  console.log(`  ${i + 1}. [${c.case_number}] (${c.therapeutic_area}) ${c.title}`);
});

console.log('--- REPAIR & DUPLICATE CLEANUP COMPLETE ---');
