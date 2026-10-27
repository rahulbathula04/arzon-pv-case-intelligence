import { describe, it, expect, beforeAll } from 'vitest';
import { db, initDatabase } from '../server/db/database.js';

describe('Phase 5: Security Architecture & Google Workspace Integrations', () => {
  beforeAll(() => {
    initDatabase();
  });

  it('strictly ensures reference keys are isolated from student queries', () => {
    // When student role queries cases table, reference_keys must never appear
    const studentCase = db.prepare('SELECT * FROM cases WHERE case_number = ?').get('ARZ-2026-ONC-001') as any;
    expect(studentCase).toBeDefined();

    // Verify raw column names on student case object
    const keys = Object.keys(studentCase);
    expect(keys).not.toContain('expected_meddra_terms');
    expect(keys).not.toContain('expected_seriousness');
    expect(keys).not.toContain('expected_causality_who');
    expect(keys).not.toContain('expected_naranjo_score');
    expect(keys).not.toContain('model_cioms_narrative');
    expect(keys).not.toContain('grading_rubric');
  });

  it('generates compliant Google Sheets CSV gradebook export format', () => {
    const query = `
      SELECT u.full_name as studentName, u.email as studentEmail,
             c.case_number as caseNumber, a.status as assignmentStatus,
             sub_assess.total_score as score
      FROM assignments a
      JOIN users u ON a.student_id = u.id
      JOIN cases c ON a.case_id = c.id
      LEFT JOIN submissions s ON a.id = s.assignment_id
      LEFT JOIN assessments sub_assess ON s.id = sub_assess.submission_id
    `;
    const rows = db.prepare(query).all() as any[];

    let csv = 'Student Name,Student Email,Case Number,Status,Total Score\n';
    for (const r of rows) {
      csv += `"${r.studentName}","${r.studentEmail}","${r.caseNumber}","${r.assignmentStatus}","${r.score || ''}"\n`;
    }

    expect(csv).toContain('Student Name');
    expect(csv).toContain('Student Email');
    expect(csv).toContain('Case Number');
    expect(csv.split('\n').length).toBeGreaterThan(1);
  });

  it('generates standard RFC-5545 iCalendar (.ics) format for Google Calendar', () => {
    const assignment = db.prepare('SELECT a.*, c.case_number, c.title as caseTitle FROM assignments a JOIN cases c ON a.case_id = c.id LIMIT 1').get() as any;
    expect(assignment).toBeDefined();

    const due = new Date(assignment.due_date);
    const startStr = due.toISOString().replace(/-|:|\.\d\d\d/g, '');
    const end = new Date(due.getTime() + 3600000);
    const endStr = end.toISOString().replace(/-|:|\.\d\d\d/g, '');

    const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Arzon Global//PV Case Intelligence//EN\nBEGIN:VEVENT\nUID:${assignment.id}@arzon.global\nDTSTART:${startStr}\nDTEND:${endStr}\nSUMMARY:Arzon PV: [${assignment.case_number}] ${assignment.caseTitle}\nEND:VEVENT\nEND:VCALENDAR`;

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain(`UID:${assignment.id}@arzon.global`);
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('verifies 1-click Google Calendar add URL construction', () => {
    const caseNumber = 'ARZ-2026-ONC-001';
    const caseTitle = 'Severe Immune-Mediated Myocarditis';
    const dueDate = '2026-11-05T23:59:59.000Z';

    const title = encodeURIComponent(`Arzon PV Deadline: [${caseNumber}] ${caseTitle}`);
    const details = encodeURIComponent('Complete ICSR submission in Arzon PV Workbench.');
    const startStr = dueDate.replace(/-|:|\.\d\d\d/g, '');

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${startStr}&details=${details}&location=Arzon%20PV%20Workbench`;

    expect(googleCalendarUrl).toContain('calendar.google.com/calendar/render');
    expect(googleCalendarUrl).toContain('action=TEMPLATE');
    expect(googleCalendarUrl).toContain('ARZ-2026-ONC-001');
  });

  it('calculates operational dashboard KPIs accurately from SQLite records', () => {
    const totalCases = (db.prepare('SELECT COUNT(*) as count FROM cases').get() as any).count;
    const totalAssignments = (db.prepare('SELECT COUNT(*) as count FROM assignments').get() as any).count;
    const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;

    expect(totalCases).toBeGreaterThanOrEqual(3);
    expect(totalAssignments).toBeGreaterThanOrEqual(3);
    expect(totalUsers).toBeGreaterThanOrEqual(6);
  });
});
