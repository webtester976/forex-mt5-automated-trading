import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import { ShieldAlert, Lock, Mail, Key, ArrowRight, AlertCircle, AlertTriangle } from 'lucide-react';

export const AdminLoginPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState('superadmin@forexsaas.com');
  const [password, setPassword] = useState('SuperAdmin123!');
  const [totpCode, setTotpCode] = useState('849201');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await adminLogin(email, password);
    setLoading(false);

    if (result.success) {
      onNavigate('/admin');
    } else {
      setError(result.error || 'Access Denied: Invalid Administrative Credentials');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-slate-900 border border-amber-800/80 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Warning Accent Border */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500"></div>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-950 text-amber-400 border border-amber-700/60 flex items-center justify-center mx-auto mb-2">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Administrative Authentication</h2>
          <p className="text-xs text-amber-400 font-mono">RESTRICTED ACCESS • RBAC VERIFICATION REQUIRED</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Administrative Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@forexsaas.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Master Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Hardware / TOTP 2FA Token</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={totpCode}
                onChange={e => setTotpCode(e.target.value)}
                placeholder="6-digit code"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono tracking-widest"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-amber-600/25 disabled:opacity-50"
          >
            <span>{loading ? 'Validating Cryptographic Keys...' : 'Authenticate & Enter Console'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Role Switcher Shortcuts for testing */}
        <div className="p-3 bg-slate-950/80 border border-amber-900/60 rounded-xl text-xs space-y-2">
          <span className="text-[11px] font-semibold text-amber-400 block uppercase font-mono">
            Direct RBAC Roles for Testing:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail('superadmin@forexsaas.com');
                setPassword('SuperAdmin123!');
              }}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-800 text-center transition"
            >
              Super Admin
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('risk@forexsaas.com');
                setPassword('RiskManager123!');
              }}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-800 text-center transition"
            >
              Risk Officer
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('support@forexsaas.com');
                setPassword('SupportDesk123!');
              }}
              className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-800 text-center transition"
            >
              Support Rep
            </button>
          </div>
        </div>

        <div className="text-center pt-2">
          <button
            onClick={() => onNavigate('/login')}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            &larr; Return to Customer Client Login
          </button>
        </div>
      </div>
    </div>
  );
};
