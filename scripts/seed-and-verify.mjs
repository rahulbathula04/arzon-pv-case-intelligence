import { seedDatabase } from '../server/db/seed.js';
import { db } from '../server/db/database.js';

// Remove obsolete test case if present
db.prepare("DELETE FROM cases WHERE case_number = 'ARZ-2026-NEU-TEST'").run();

// Seed database
seedDatabase();

// Re-run seedDatabase() to verify idempotency on restarts!
seedDatabase();

const cases = db.prepare('SELECT id, case_number, therapeutic_area, difficulty, title, clinical_fingerprint FROM cases ORDER BY case_number').all();
console.log(`Verified Cases Count after 2x seed execution: ${cases.length}`);
cases.forEach(c => {
  console.log(`  [${c.case_number}] (${c.therapeutic_area} · ${c.difficulty}) ${c.title}`);
  console.log(`     Fingerprint: ${c.clinical_fingerprint}`);
});

const asgs = db.prepare('SELECT id, case_id, student_id, status FROM assignments ORDER BY id').all();
console.log(`Verified Assignments Count: ${asgs.length}`);
asgs.forEach(a => console.log(`  - ${a.id}: Case ${a.case_id} -> Student ${a.student_id} (${a.status})`));
