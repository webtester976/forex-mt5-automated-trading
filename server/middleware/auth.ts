import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../security/encryption.js';
import { db } from '../db/store.js';
import { RoleId, User } from '../../src/types/index.js';
import { hasPermission, isAdminRole } from '../security/rbac.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

/**
 * Extracts and verifies token from Authorization: Bearer <token> or cookie
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc: Record<string, string>, item) => {
      const [key, val] = item.trim().split('=');
      acc[key] = val;
      return acc;
    }, {});
    token = cookies['auth_token'] || null;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. No session token provided.' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload || !payload.userId) {
    res.status(401).json({ error: 'Invalid or expired session token.' });
    return;
  }

  const user = db.users.find(u => u.id === payload.userId);
  if (!user || user.status === 'suspended') {
    res.status(403).json({ error: 'User account not found or suspended.' });
    return;
  }

  req.user = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    kycStatus: user.kycStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    manualTradeCloseEnabled: user.manualTradeCloseEnabled,
  };

  next();
}

/**
 * Ensures user possesses an administrative role
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || !isAdminRole(req.user.role)) {
    res.status(403).json({ 
      error: 'Access denied. Administrative role credentials required.',
      code: 'ERR_ADMIN_REQUIRED'
    });
    return;
  }
  next();
}

/**
 * Requires a specific RBAC permission
 */
export function requirePermission(permissionCode: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!hasPermission(req.user.role, permissionCode)) {
      res.status(403).json({ 
        error: `Access denied. Lacking required permission: ${permissionCode}`,
        code: 'ERR_INSUFFICIENT_PERMISSIONS' 
      });
      return;
    }
    next();
  };
}

/**
 * Enforces customer data isolation: customers can only query their own data
 */
export function enforceTenantIsolation(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Strict tenant isolation: customer-facing endpoints are strictly bound to the authenticated user's ID.
  // Admins must use dedicated /api/admin endpoints, preventing accidental leakage or viewing of customer private trading data.
  if (req.params.userId && req.params.userId !== req.user.id) {
    res.status(403).json({ 
      error: 'Access denied: Tenant isolation violation. You cannot access another customer’s records.',
      code: 'ERR_TENANT_ISOLATION'
    });
    return;
  }

  next();
}
