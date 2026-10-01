import { RoleId } from '../../src/types/index.js';

export interface PermissionDefinition {
  code: string;
  category: 'system' | 'users' | 'trading' | 'risk' | 'billing' | 'support' | 'social';
  description: string;
}

export const PERMISSIONS: Record<string, PermissionDefinition> = {
  // System & Worker Controls
  'system:manage': { code: 'system:manage', category: 'system', description: 'Configure system settings, view worker node telemetry' },
  'system:audit': { code: 'system:audit', category: 'system', description: 'View full audit logs' },
  
  // Users & Accounts
  'users:read': { code: 'users:read', category: 'users', description: 'Search and inspect user accounts' },
  'users:write': { code: 'users:write', category: 'users', description: 'Modify user status (suspend, reactivate)' },
  'accounts:manage': { code: 'accounts:manage', category: 'users', description: 'Manage customer MT5 connections and force synchronization' },
  
  // Trading & Algorithms
  'trading:view_all': { code: 'trading:view_all', category: 'trading', description: 'View all trades across the platform' },
  'trading:override': { code: 'trading:override', category: 'trading', description: 'Force close open positions or cancel pending orders' },
  'algorithms:manage': { code: 'algorithms:manage', category: 'trading', description: 'Deploy, rollback or configure algorithm versions' },
  
  // Risk Engine
  'risk:kill_switch': { code: 'risk:kill_switch', category: 'risk', description: 'Trigger global, per-algorithm, or per-account emergency kill switch' },
  'risk:manage_limits': { code: 'risk:manage_limits', category: 'risk', description: 'Modify risk parameters, drawdown thresholds, and max lots' },
  
  // Billing & Subscriptions
  'billing:manage': { code: 'billing:manage', category: 'billing', description: 'Manage subscription plans, review payments and process refunds' },
  
  // Support & Helpdesk
  'support:tickets': { code: 'support:tickets', category: 'support', description: 'Reply, assign, and update customer support tickets' },
  
  // Social Media Automation
  'social:approve': { code: 'social:approve', category: 'social', description: 'Review, edit, and approve automated social media performance posts' },
};

export const ROLE_PERMISSIONS: Record<RoleId, string[]> = {
  super_admin: [
    'system:manage',
    'system:audit',
    'users:read',
    'users:write',
    'accounts:manage',
    'trading:view_all',
    'trading:override',
    'algorithms:manage',
    'risk:kill_switch',
    'risk:manage_limits',
    'billing:manage',
    'support:tickets',
    'social:approve',
  ],
  admin: [
    'users:read',
    'users:write',
    'accounts:manage',
    'trading:view_all',
    'trading:override',
    'algorithms:manage',
    'risk:kill_switch',
    'risk:manage_limits',
    'billing:manage',
    'support:tickets',
    'social:approve',
  ],
  risk_officer: [
    'trading:view_all',
    'trading:override',
    'risk:kill_switch',
    'risk:manage_limits',
    'accounts:manage',
    'system:audit',
  ],
  finance: [
    'billing:manage',
    'users:read',
    'system:audit',
  ],
  support: [
    'support:tickets',
    'users:read',
    'accounts:manage',
    'trading:view_all',
  ],
  customer: [],
};

export function hasPermission(role: RoleId, requiredPermission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(requiredPermission);
}

export function isAdminRole(role: RoleId): boolean {
  return ['super_admin', 'admin', 'risk_officer', 'finance', 'support'].includes(role);
}
