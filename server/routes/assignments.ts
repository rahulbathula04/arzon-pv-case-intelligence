import { Router } from 'express';
import { db } from '../db/database.js';
import { isStaff, requireRole } from '../middleware/auth.js';
import { Assignment, AssignmentStatus } from '../../src/types/index.js';

export const assignmentsRouter = Router();

// GET /api/assignments - List assignments
assignmentsRouter.get('/', (req, res) => {
  const user = req.user;
  const staff = isStaff(user?.role);

  let query = `
    SELECT a.id, a.case_id as caseId, a.student_id as studentId,
           a.assigned_by as assignedBy, a.due_date as dueDate,
           a.instructions, a.status, a.created_at as createdAt,
           c.case_number as caseNumber, c.title as caseTitle,
           u.full_name as studentName, u.email as studentEmail,
           s.id as submissionId,
           sub_assess.total_score as score
    FROM assignments a
    JOIN cases c ON a.case_id = c.id
    JOIN users u ON a.student_id = u.id
    LEFT JOIN submissions s ON a.id = s.assignment_id
    LEFT JOIN assessments sub_assess ON s.id = sub_assess.submission_id
  `;

  const params: any[] = [];
  if (!staff && user) {
    query += ' WHERE a.student_id = ?';
    params.push(user.id);
  }

  query += ' ORDER BY a.due_date ASC';

  const rows = db.prepare(query).all(...params) as any[];

  // Compute live overdue status
  const now = new Date();
  const assignments: Assignment[] = rows.map(r => {
    let currentStatus = r.status as AssignmentStatus;
    const due = new Date(r.dueDate);
    if (currentStatus !== 'completed' && currentStatus !== 'submitted' && due < now) {
      currentStatus = 'overdue';
    }

    return {
      id: r.id,
      caseId: r.caseId,
      caseNumber: r.caseNumber,
      caseTitle: r.caseTitle,
      studentId: r.studentId,
      studentName: r.studentName,
      studentEmail: r.studentEmail,
      assignedBy: r.assignedBy,
      dueDate: r.dueDate,
      instructions: r.instructions,
      status: currentStatus,
      createdAt: r.createdAt,
      submissionId: r.submissionId,
      score: r.score
    };
  });

  res.json({ assignments });
});

// POST /api/assignments - Staff assigns a case to student(s)
assignmentsRouter.post('/', requireRole(['admin', 'mentor']), (req, res) => {
  const { caseId, studentIds, dueDate, instructions } = req.body;

  if (!caseId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'Missing caseId or studentIds' });
  }

  const assignedBy = req.user?.id || 'usr-admin-01';
  const finalDueDate = dueDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19);

  const insertAssignment = db.prepare(`
    INSERT INTO assignments (id, case_id, student_id, assigned_by, due_date, instructions, status)
    VALUES (?, ?, ?, ?, ?, ?, 'assigned')
  `);

  const createdIds: string[] = [];
  const insertMany = db.transaction((sIds: string[]) => {
    for (const sId of sIds) {
      const asgId = `asg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      insertAssignment.run(asgId, caseId, sId, assignedBy, finalDueDate, instructions || null);
      createdIds.push(asgId);
    }
  });

  insertMany(studentIds);

  // Audit log
  db.prepare(`
    INSERT INTO audit_logs (id, entity_type, entity_id, action, user_id, details)
    VALUES (?, 'assignment', ?, 'CREATE_ASSIGNMENT', ?, ?)
  `).run(`log-${Date.now()}`, caseId, assignedBy, `Assigned case ${caseId} to ${studentIds.length} students`);

  res.status(201).json({
    success: true,
    message: `Case successfully assigned to ${studentIds.length} student(s).`,
    assignmentIds: createdIds
  });
});
