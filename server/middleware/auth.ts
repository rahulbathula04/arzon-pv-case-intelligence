import { Request, Response, NextFunction } from 'express';
import { db } from '../db/database.js';
import { User, UserRole } from '../../src/types/index.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Current active simulation user ID (persisted in DB or default to admin)
let activeUserId = 'usr-admin-01';

export function setActiveUserId(id: string) {
  activeUserId = id;
}

export function getActiveUserId(): string {
  return activeUserId;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Support custom header from frontend or use active simulation user
  const headerUserId = req.headers['x-user-id'] as string;
  const targetId = headerUserId || activeUserId;

  try {
    const userRow = db.prepare('SELECT id, email, full_name, role, cohort, created_at FROM users WHERE id = ?').get(targetId) as any;
    if (userRow) {
      req.user = {
        id: userRow.id,
        email: userRow.email,
        fullName: userRow.full_name,
        role: userRow.role as UserRole,
        cohort: userRow.cohort,
        createdAt: userRow.created_at
      };
    } else {
      // Fallback student user if not found
      req.user = {
        id: 'usr-student-01',
        email: 'rahul.varma@arzon.student',
        fullName: 'Rahul Varma',
        role: 'student',
        cohort: 'Pharm.D 2026-Q1',
        createdAt: new Date().toISOString()
      };
    }
  } catch (err) {
    console.error('Auth middleware error:', err);
  }
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}. Current role: ${req.user?.role || 'unauthenticated'}.`
      });
    }
    next();
  };
}

export function isStaff(role?: UserRole): boolean {
  return role === 'admin' || role === 'mentor';
}
