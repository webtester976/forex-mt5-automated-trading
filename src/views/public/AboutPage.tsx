import React from 'react';
import { Shield, Server, Award, Cpu, TrendingUp, Users } from 'lucide-react';

export const AboutPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="text-xs uppercase font-mono font-semibold tracking-wider text-blue-400">Institutional Heritage</span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white">Engineering Algorithmic Precision for Retail Traders</h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          AURAMT5 was founded by quantitative algorithmic researchers and former Tier-1 bank FX market makers with a singular mission: democratize institutional execution speed, mathematical risk management, and multi-strategy automated portfolios for MetaTrader 5 users.
        </p>
      </div>

      {/* Core Values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="p-2.5 rounded-xl bg-blue-950 text-blue-400 w-fit border border-blue-800">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">Non-Custodial Architecture</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            We never hold client trading funds. Your capital remains stored with your selected regulated broker. Our software only delivers approved algorithmic execution signals through isolated worker terminals.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="p-2.5 rounded-xl bg-indigo-950 text-indigo-400 w-fit border border-indigo-800">
            <Server className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">Equinix Cross-Connects</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Our execution workers are co-located in London Equinix LD4, New York NY4, and Tokyo TY3 directly alongside major broker matching engines to ensure sub-millisecond execution with near-zero slippage.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="p-2.5 rounded-xl bg-emerald-950 text-emerald-400 w-fit border border-emerald-800">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base">Mathematical Risk Engine</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every trade is subjected to pre-execution capital checks, maximum drawdown caps, session volatility filters, and automated news pauses before touching your broker terminal.
          </p>
        </div>
      </div>

      {/* Security Statement */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 space-y-6">
        <h2 className="text-2xl font-bold text-white">Military-Grade Secret Isolation</h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl">
          Unlike ordinary trading bots or shady web tools that store broker credentials in cleartext databases, AURAMT5 encrypts every MT5 account password using hardware AES-256-GCM. Decryption occurs strictly inside isolated worker processes during the broker login handshake, completely hidden from platform administrators, customer support, and API endpoints.
        </p>
        <div className="pt-2">
          <button
            onClick={() => onNavigate('/signup')}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
          >
            Create Your Account
          </button>
        </div>
      </div>
    </div>
  );
};
