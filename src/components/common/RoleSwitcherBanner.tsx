import React from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import { Shield, User, RefreshCw, LogOut } from 'lucide-react';

export const RoleSwitcherBanner: React.FC<{ currentPath: string; onNavigate: (path: string) => void }> = ({ currentPath, onNavigate }) => {
  const { user, isAdmin, switchRoleDemo, logout } = useAuth();
  const isDev = Boolean(import.meta.env.DEV);

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-xs text-slate-300 py-1.5 px-4 flex flex-wrap items-center justify-between gap-2 z-50">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono font-medium bg-slate-800 text-emerald-400 border border-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Equinix LD4 MT5 Cluster Active
        </span>
        <span className="hidden sm:inline text-slate-400">|</span>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Active Role:</span>
          {user ? (
            <span className={`font-semibold px-2 py-0.5 rounded ${isAdmin ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-blue-950 text-blue-300 border border-blue-800'}`}>
              {user.role.toUpperCase()} ({user.firstName} {user.lastName})
            </span>
          ) : (
            <span className="font-semibold text-slate-400">Public Visitor</span>
          )}
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-1.5">
        {isDev ? (
          <>
            <span className="text-slate-400 hidden md:inline">Quick Test Roles (Dev):</span>
            <button
              onClick={() => {
                switchRoleDemo('customer_alex');
                if (!currentPath.startsWith('/dashboard')) onNavigate('/dashboard');
              }}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition flex items-center gap-1"
              title="Login as Alex Morgan (Pro Subscriber, IC Markets Live account)"
            >
              <User className="w-3 h-3 text-blue-400" />
              <span>Client: Alex</span>
            </button>

            <button
              onClick={() => {
                switchRoleDemo('customer_sarah');
                if (!currentPath.startsWith('/dashboard')) onNavigate('/dashboard');
              }}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition flex items-center gap-1"
              title="Login as Sarah Chen (Elite Subscriber, Pepperstone account)"
            >
              <User className="w-3 h-3 text-cyan-400" />
              <span>Client: Sarah</span>
            </button>

            <button
              onClick={() => {
                switchRoleDemo('super_admin');
                if (!currentPath.startsWith('/admin')) onNavigate('/admin');
              }}
              className="px-2 py-1 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-800/80 transition flex items-center gap-1"
              title="Login as Super Administrator with full permissions"
            >
              <Shield className="w-3 h-3 text-amber-400" />
              <span>Admin: Super</span>
            </button>

            <button
              onClick={() => {
                switchRoleDemo('risk_officer');
                if (!currentPath.startsWith('/admin')) onNavigate('/admin/risk');
              }}
              className="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/80 transition flex items-center gap-1"
              title="Login as Risk Officer (Emergency Kill Switches)"
            >
              <Shield className="w-3 h-3 text-rose-400" />
              <span>Risk Officer</span>
            </button>
          </>
        ) : (
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            Production Environment | RBAC Enforced
          </span>
        )}

        {user && (
          <button
            onClick={() => {
              logout();
              onNavigate('/');
            }}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-200 border border-slate-700 transition flex items-center gap-1"
            title="Sign out"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </div>
  );
};
