import { Router } from 'express';
import { db } from '../db/database.js';
import { requireRole } from '../middleware/auth.js';

export const workspaceRouter = Router();

// GET /api/workspace/status - Google Workspace & Antigravity Plugins Integration Health
workspaceRouter.get('/status', (req, res) => {
  res.json({
    authoritativeDatabase: 'SQLite (Internal Enterprise Engine)',
    googleWorkspaceStatus: {
      drive: { status: 'available', capability: 'Dossier storage & supporting document attachments' },
      sheets: { status: 'available', capability: 'Gradebook CSV sync & case library batch export' },
      docs: { status: 'available', capability: 'Executive case briefs & audit reports in clean HTML/Markdown' },
      slides: { status: 'available', capability: 'Case conference slide deck outline generator' },
      calendar: { status: 'available', capability: 'Live Google Calendar links & iCal .ics event export' }
    },
    antigravityPlugins: {
      gdrive: 'Installed at C:\\Users\\Rahul\\.gemini\\config\\plugins\\gdrive',
      gsheets: 'Installed at C:\\Users\\Rahul\\.gemini\\config\\plugins\\gsheets',
      gdocs: 'Installed at C:\\Users\\Rahul\\.gemini\\config\\plugins\\gdocs',
      gslides: 'Installed at C:\\Users\\Rahul\\.gemini\\config\\plugins\\gslides',
      gcalendar: 'Installed at C:\\Users\\Rahul\\.gemini\\config\\plugins\\gcalendar'
    },
    notice: 'Application database is authoritative. Antigravity plugin access remains decoupled from cloud user credentials.'
  });
});

// GET /api/workspace/sheets/gradebook.csv - Export gradebook for Google Sheets
workspaceRouter.get('/sheets/gradebook.csv', requireRole(['admin', 'mentor']), (req, res) => {
  const query = `
    SELECT u.full_name as studentName, u.email as studentEmail, u.cohort,
           c.case_number as caseNumber, c.title as caseTitle,
           a.due_date as dueDate, a.status as assignmentStatus,
           s.submitted_at as submittedAt,
           sub_assess.total_score as score,
           sub_assess.meddra_score as meddraScore,
           sub_assess.seriousness_score as seriousnessScore,
           sub_assess.causality_score as causalityScore,
           sub_assess.narrative_score as narrativeScore,
           sub_assess.status as assessmentStatus
    FROM assignments a
    JOIN users u ON a.student_id = u.id
    JOIN cases c ON a.case_id = c.id
    LEFT JOIN submissions s ON a.id = s.assignment_id
    LEFT JOIN assessments sub_assess ON s.id = sub_assess.submission_id
    ORDER BY u.full_name, c.case_number
  `;

  const rows = db.prepare(query).all() as any[];

  let csv = 'Student Name,Student Email,Cohort,Case Number,Case Title,Due Date,Status,Submitted At,Total Score %,MedDRA Score,Seriousness Score,Causality Score,Narrative Score,Assessment Status\n';
  for (const r of rows) {
    csv += `"${r.studentName}","${r.studentEmail}","${r.cohort || ''}","${r.caseNumber}","${(r.caseTitle || '').replace(/"/g, '""')}","${r.dueDate}","${r.assignmentStatus}","${r.submittedAt || ''}","${r.score !== null ? r.score : ''}","${r.meddraScore || ''}","${r.seriousnessScore || ''}","${r.causalityScore || ''}","${r.narrativeScore || ''}","${r.assessmentStatus || ''}"\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="Arzon_PV_Gradebook_Google_Sheets.csv"');
  res.send(csv);
});

// GET /api/workspace/sheets/cases.csv - Export case library for Google Sheets
workspaceRouter.get('/sheets/cases.csv', (req, res) => {
  const rows = db.prepare('SELECT case_number, title, therapeutic_area, difficulty, status, patient_initials, patient_age, patient_gender, receipt_date, created_at FROM cases ORDER BY case_number').all() as any[];

  let csv = 'Case Number,Title,Therapeutic Area,Difficulty,Status,Patient Initials,Age,Gender,Receipt Date,Created At\n';
  for (const r of rows) {
    csv += `"${r.case_number}","${(r.title || '').replace(/"/g, '""')}","${r.therapeutic_area}","${r.difficulty}","${r.status}","${r.patient_initials}","${r.patient_age}","${r.patient_gender}","${r.receipt_date}","${r.created_at}"\n`;
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="Arzon_PV_Case_Library_Google_Sheets.csv"');
  res.send(csv);
});

// GET /api/workspace/docs/case-brief/:caseId - Google Docs formatted Executive Case Brief
workspaceRouter.get('/docs/case-brief/:caseId', (req, res) => {
  const { caseId } = req.params;
  const row = db.prepare('SELECT * FROM cases WHERE id = ?').get(caseId) as any;
  if (!row) {
    return res.status(404).json({ error: 'Case not found' });
  }

  const suspectDrugs = JSON.parse(row.suspect_drugs || '[]');
  const adverseEvents = JSON.parse(row.adverse_events || '[]');
  const labTests = JSON.parse(row.lab_tests || '[]');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${row.case_number} - Executive Case Brief</title>
  <style>
    body { font-family: 'Times New Roman', serif; line-height: 1.6; color: #111; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { font-size: 22pt; margin-bottom: 4px; color: #0B1325; }
    h2 { font-size: 14pt; border-bottom: 1.5pt solid #1B3F8B; padding-bottom: 4px; margin-top: 24px; color: #1B3F8B; }
    .meta { font-family: 'Courier New', monospace; font-size: 10pt; color: #555; margin-bottom: 20px; }
    .warning { background: #FFFBEB; border: 1pt solid #D97706; padding: 10px; font-size: 10pt; margin-bottom: 20px; font-weight: bold; color: #92400E; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
    th, td { border: 1pt solid #DDD; padding: 8px; text-align: left; }
    th { background: #F8F9FA; font-weight: bold; }
    blockquote { border-left: 3pt solid #0B1325; margin: 15px 0; padding: 10px 15px; background: #F8F9FA; font-style: italic; }
  </style>
</head>
<body>
  <div class="warning">
    ● ${row.fictional_disclaimer} · FOR HEALTHCARE EDUCATION & TRAINING PURPOSES ONLY
  </div>
  <h1>${row.title}</h1>
  <div class="meta">
    CASE IDENTIFIER: ${row.case_number} | THERAPEUTIC AREA: ${row.therapeutic_area} | DIFFICULTY: ${row.difficulty} | RECEIPT DATE: ${row.receipt_date}
  </div>

  <h2>1. Patient Demographics & Baseline Medical History (ICH E2B B.1)</h2>
  <table>
    <tr><th>Patient Initials</th><th>Age</th><th>Gender</th><th>Weight</th></tr>
    <tr><td>${row.patient_initials}</td><td>${row.patient_age} Years</td><td>${row.patient_gender}</td><td>${row.patient_weight_kg ? row.patient_weight_kg + ' kg' : 'Not documented'}</td></tr>
  </table>
  <p><strong>Medical History & Pre-existing Conditions:</strong> ${row.medical_history}</p>

  <h2>2. Suspect Medicinal Products (ICH E2B B.4)</h2>
  <table>
    <tr><th>Product Name</th><th>Active INN</th><th>Dose & Route</th><th>Dates</th><th>Indication</th><th>Dechallenge</th></tr>
    ${suspectDrugs.map((d: any) => `<tr><td>${d.name}</td><td>${d.inn}</td><td>${d.dose} (${d.route})</td><td>${d.startDate} to ${d.stopDate || 'Ongoing'}</td><td>${d.indication}</td><td>${d.dechallenge}</td></tr>`).join('')}
  </table>

  <h2>3. Adverse Events & Verbatim Findings (ICH E2B B.2)</h2>
  <table>
    <tr><th>Reported Verbatim</th><th>Onset Date</th><th>Outcome</th><th>Seriousness</th></tr>
    ${adverseEvents.map((ae: any) => `<tr><td>"${ae.verbatim}"</td><td>${ae.onsetDate}</td><td>${ae.outcome}</td><td>${ae.seriousness?.isSerious ? 'SERIOUS' : 'Non-Serious'}</td></tr>`).join('')}
  </table>

  <h2>4. Laboratory & Diagnostic Procedures (ICH E2B B.3)</h2>
  <table>
    <tr><th>Test Procedure</th><th>Value</th><th>Unit</th><th>Reference Range</th><th>Clinical Status</th></tr>
    ${labTests.map((l: any) => `<tr><td>${l.testName}</td><td>${l.value}</td><td>${l.unit}</td><td>${l.normalRange || 'N/A'}</td><td>${l.interpretation || 'Normal'}</td></tr>`).join('')}
  </table>

  <h2>5. Initial Reporter Verbatim Narrative (ICH E2B B.5.1)</h2>
  <blockquote>
    ${row.verbatim_narrative}
  </blockquote>

  <div style="margin-top: 40px; border-top: 1pt solid #DDD; padding-top: 10px; font-size: 9pt; color: #777;">
    Arzon PV Case Intelligence · Pharmacovigilance Operational Ledger & Training Architecture · Generated: ${new Date().toISOString()}
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `inline; filename="${row.case_number}_Case_Brief.html"`);
  res.send(html);
});

// GET /api/workspace/slides/deck-outline/:caseId - Google Slides presentation outline
workspaceRouter.get('/slides/deck-outline/:caseId', (req, res) => {
  const { caseId } = req.params;
  const row = db.prepare('SELECT * FROM cases WHERE id = ?').get(caseId) as any;
  if (!row) {
    return res.status(404).json({ error: 'Case not found' });
  }

  const suspectDrugs = JSON.parse(row.suspect_drugs || '[]');
  const adverseEvents = JSON.parse(row.adverse_events || '[]');

  const deckOutline = {
    title: `PV Case Conference: ${row.title}`,
    caseNumber: row.case_number,
    therapeuticArea: row.therapeutic_area,
    fictionalDisclaimer: row.fictional_disclaimer,
    slides: [
      {
        slideNumber: 1,
        type: 'Title Slide',
        headline: row.title,
        subhead: `Case Identification: ${row.case_number} · Therapeutic Track: ${row.therapeutic_area}`,
        speakerNotes: 'Introduce the ICSR case scenario, clinical background, and training objectives.'
      },
      {
        slideNumber: 2,
        type: 'Patient Profile & Baseline Regimen',
        bullets: [
          `Patient: ${row.patient_initials}, ${row.patient_age}-year-old ${row.patient_gender}`,
          `Baseline History: ${row.medical_history}`,
          `Suspect Medication: ${suspectDrugs.map((d: any) => `${d.name} (${d.inn}) ${d.dose} for ${d.indication}`).join('; ')}`
        ],
        speakerNotes: 'Review baseline demographics, organ function, and pharmacological indication.'
      },
      {
        slideNumber: 3,
        type: 'Adverse Reaction & Timeline Kinetics',
        bullets: [
          `Reported Verbatim: "${adverseEvents.map((ae: any) => ae.verbatim).join('; ')}"`,
          `Onset Latency: Post-initiation timeline kinetics`,
          `Action Taken: Discontinuation with positive dechallenge kinetics`
        ],
        speakerNotes: 'Analyze the latency from drug commencement to event presentation.'
      },
      {
        slideNumber: 4,
        type: 'Causality Assessment & Regulatory Seriousness',
        bullets: [
          'ICH E2A Seriousness Criteria justification (Hospitalization, Life-threatening)',
          'WHO-UMC Causality Algorithm application',
          'Naranjo ADR Probability Scale tally'
        ],
        speakerNotes: 'Lead audience discussion through differential diagnoses and evidence weighting.'
      },
      {
        slideNumber: 5,
        type: 'Key Educational Takeaways',
        bullets: [
          'Standardized MedDRA PT selection rules',
          'Expedited reporting timelines (7-day vs 15-day rules)',
          'High-quality CIOMS-I narrative drafting best practices'
        ],
        speakerNotes: 'Summarize clinical and regulatory lessons for student cohort.'
      }
    ]
  };

  res.json({ deckOutline });
});

// GET /api/workspace/calendar/links/:assignmentId - Direct 1-click Google Calendar add link
workspaceRouter.get('/calendar/links/:assignmentId', (req, res) => {
  const { assignmentId } = req.params;
  const row = db.prepare(`
    SELECT a.*, c.case_number, c.title as caseTitle
    FROM assignments a
    JOIN cases c ON a.case_id = c.id
    WHERE a.id = ?
  `).get(assignmentId) as any;

  if (!row) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  const title = encodeURIComponent(`Arzon PV Deadline: [${row.case_number}] ${row.caseTitle}`);
  const details = encodeURIComponent(`Pharmacovigilance ICSR submission due for case ${row.case_number}.\nInstructions: ${row.instructions || 'Complete MedDRA coding, Seriousness criteria, Naranjo causality, and CIOMS narrative in the Arzon PV Workbench.'}`);
  
  // Format dates: YYYYMMDDTHHMMSSZ
  const due = new Date(row.due_date);
  const startStr = due.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const end = new Date(due.getTime() + 3600000);
  const endStr = end.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=Arzon%20PV%20Workbench`;

  res.json({
    assignmentId,
    caseNumber: row.case_number,
    dueDate: row.due_date,
    googleCalendarUrl
  });
});

// GET /api/workspace/calendar/assignment/:assignmentId.ics - Download standard iCal .ics file
workspaceRouter.get('/calendar/assignment/:assignmentId.ics', (req, res) => {
  const { assignmentId } = req.params;
  const row = db.prepare(`
    SELECT a.*, c.case_number, c.title as caseTitle
    FROM assignments a
    JOIN cases c ON a.case_id = c.id
    WHERE a.id = ?
  `).get(assignmentId) as any;

  if (!row) {
    return res.status(404).json({ error: 'Assignment not found' });
  }

  const due = new Date(row.due_date);
  const startStr = due.toISOString().replace(/-|:|\.\d\d\d/g, '');
  const end = new Date(due.getTime() + 3600000);
  const endStr = end.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Arzon Global//PV Case Intelligence//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${row.id}@arzon.global
DTSTAMP:${new Date().toISOString().replace(/-|:|\.\d\d\d/g, '')}
DTSTART:${startStr}
DTEND:${endStr}
SUMMARY:Arzon PV Deadline: [${row.case_number}] ${row.caseTitle}
DESCRIPTION:Pharmacovigilance ICSR submission due for case ${row.case_number}. Complete MedDRA coding, Seriousness, Naranjo, and CIOMS narrative.
LOCATION:Arzon PV Workbench
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${row.case_number}_Deadline.ics"`);
  res.send(ics);
});
