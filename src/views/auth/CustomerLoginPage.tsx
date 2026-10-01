import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import { TrendingUp, Lock, Mail, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

export const CustomerLoginPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('alex.morgan@example.com');
  const [password, setPassword] = useState('CustomerPass123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      onNavigate('/dashboard');
    } else {
      setError(result.error || 'Invalid credentials');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Client Portal Login</h2>
          <p className="text-xs text-slate-400">Access your MT5 trading terminal and real-time telemetry</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">Password</label>
              <button
                type="button"
                onClick={() => onNavigate('/contact')}
                className="text-[11px] text-blue-400 hover:text-blue-300"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Terminal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Quick-Fill */}
        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase font-mono">Demo Accounts Ready:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail('alex.morgan@example.com');
                setPassword('CustomerPass123!');
              }}
              className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition"
            >
              Alex (Pro Plan)
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('sarah.chen@example.com');
                setPassword('CustomerPass123!');
              }}
              className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition"
            >
              Sarah (Elite Plan)
            </button>
          </div>
        </div>

        <div className="text-center pt-2 text-xs text-slate-400">
          Don't have an account yet?{' '}
          <button
            onClick={() => onNavigate('/signup')}
            className="text-blue-400 hover:text-blue-300 font-semibold"
          >
            Create one now
          </button>
        </div>
      </div>
    </div>
  );
};
