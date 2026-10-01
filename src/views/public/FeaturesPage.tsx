import React from 'react';
import { 
  Zap, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  Activity, 
  Lock, 
  BarChart3, 
  Sliders, 
  RefreshCw, 
  AlertTriangle 
} from 'lucide-react';

export const FeaturesPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const featureList = [
    {
      title: 'Sub-Millisecond Direct MT5 Execution',
      desc: 'Dedicated worker instances located in Equinix LD4 (London) achieve 1.2ms direct bridge latency to major ECN brokers, eliminating requotes and slippage.',
      icon: Zap,
      tag: 'Infrastructure',
    },
    {
      title: 'Zero-Knowledge AES-256-GCM Encryption',
      desc: 'All MT5 credentials are encrypted at rest with hardware keys. Plaintext passwords never appear in logs, support dashboards, or admin queries.',
      icon: Lock,
      tag: 'Security',
    },
    {
      title: 'Pre-Trade Pre-Flight Risk Engine',
      desc: 'Every algorithm signal passes through a multi-factor risk validation gate: max daily drawdown check, exposure ceiling, news blackout filters, and margin verification.',
      icon: ShieldCheck,
      tag: 'Risk Management',
    },
    {
      title: 'Multi-Algorithm Regime Switching',
      desc: 'Dynamic strategy allocation between trend following (Falcon), volatility breakout (Matrix), and mean-reversion (Range Hunter) based on real-time market regimes.',
      icon: Cpu,
      tag: 'Quant Engine',
    },
    {
      title: 'Emergency Client Kill Switch',
      desc: 'Instant manual halt button allows you to immediately terminate all algorithmic execution and close all active positions with a single click.',
      icon: AlertTriangle,
      tag: 'User Control',
    },
    {
      title: 'Institutional Performance Reporting',
      desc: 'Tick-by-tick equity curve tracking, win/loss distributions, profit factor, Sharpe ratio, and downloadable PDF/CSV execution statements.',
      icon: BarChart3,
      tag: 'Analytics',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="text-xs uppercase font-mono font-semibold tracking-wider text-blue-400">Platform Capabilities</span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white">Full-Spectrum Institutional Trading Stack</h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Engineered to satisfy high-volume proprietary traders, quantitative funds, and individual investors demanding reliable, non-custodial automation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featureList.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-blue-950 text-blue-400 border border-blue-800 w-fit">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {f.tag}
                  </span>
                </div>
                <h3 className="font-bold text-white text-base">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Ready to automate your trading with zero friction?</h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
          Sign up today to explore our live verified track record and connect your MT5 account.
        </p>
        <button
          onClick={() => onNavigate('/signup')}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
        >
          Get Started Now
        </button>
      </div>
    </div>
  );
};
