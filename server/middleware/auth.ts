import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, isTestEnv } from '../db/database.js';
import { User, UserRole } from '../../src/types/index.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'arzon-pv-secure-jwt-secret-key-2026-production';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: User;
      authToken?: string;
    }
  }
}

export function signUserToken(
  user: { id: string; email: string; fullName: string; role: UserRole; cohort?: string },
  expiresIn: string = process.env.JWT_EXPIRES_IN || '12h'
): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      cohort: user.cohort
    },
    JWT_SECRET,
    { expiresIn: expiresIn as any }
  );
}

export function verifyUserToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
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
  const authHeader = req.headers['authorization'];
  let verifiedFromJwt = false;

  // 1. Check Bearer Token (Cryptographically verified)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    try {
      const decoded = verifyUserToken(token);
      if (decoded && decoded.id) {
        const userRow = db.prepare('SELECT id, email, full_name, role, cohort, created_at FROM users WHERE id = ?').get(decoded.id) as any;
        if (userRow) {
          req.user = {
            id: userRow.id,
            email: userRow.email,
            fullName: userRow.full_name,
            role: userRow.role as UserRole,
            cohort: userRow.cohort,
            createdAt: userRow.created_at
          };
          req.authToken = token;
          verifiedFromJwt = true;
        }
      }
    } catch {
      // Invalid or expired token: do not set req.user
    }
  }

  // 2. Fallback to header or simulation in development/test environments
  if (!verifiedFromJwt) {
    const headerUserId = req.headers['x-user-id'] as string;
    const targetId = headerUserId || (isTestEnv ? activeUserId : undefined);

    if (targetId) {
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
        }
      } catch (err) {
        console.error('Auth fallback error:', err);
      }
    }
  }

  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required. Please provide a valid Bearer token.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}. Current role: ${req.user.role}.`
      });
    }
    next();
  };
}

export function isStaff(role?: UserRole): boolean {
  return role === 'admin' || role === 'mentor';
}
