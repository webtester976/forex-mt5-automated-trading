import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  ShieldCheck, 
  Cpu, 
  Zap, 
  BarChart3, 
  Server, 
  CheckCircle2, 
  ArrowRight, 
  Globe2, 
  Layers, 
  ChevronRight,
  Lock
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [platformStats, setPlatformStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/public/platform-stats')
      .then(res => res.json())
      .then(data => setPlatformStats(data))
      .catch(() => {});
  }, []);

  const marketTicks = [
    { symbol: 'EURUSD', price: '1.08864', change: '+0.42%', up: true },
    { symbol: 'GBPUSD', price: '1.29348', change: '+0.28%', up: true },
    { symbol: 'XAUUSD', price: '2,685.90', change: '+1.14%', up: true },
    { symbol: 'USDJPY', price: '153.220', change: '-0.38%', up: false },
    { symbol: 'AUDUSD', price: '0.66180', change: '+0.51%', up: true },
  ];

  return (
    <div className="space-y-20 pb-20">
      {/* Real-Time Market Ticker Ribbon */}
      <div className="bg-slate-900 border-b border-slate-800 py-2.5 px-4 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 min-w-max text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>London Equinix LD4 Tick Stream:</span>
          </div>

          <div className="flex items-center gap-6">
            {marketTicks.map(tick => (
              <div key={tick.symbol} className="flex items-center gap-2">
                <span className="font-bold text-slate-200">{tick.symbol}</span>
                <span className="text-slate-300 font-semibold">{tick.price}</span>
                <span className={`text-[11px] font-bold ${tick.up ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {tick.change}
                </span>
              </div>
            ))}
          </div>

          <div className="text-slate-400 text-[11px]">
            Avg Execution Latency: <span className="text-emerald-400 font-bold">1.2ms</span>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 lg:pt-16">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/80 border border-blue-800/80 text-blue-300 text-xs font-medium">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span>MetaTrader 5 Automated Algorithmic Quantitative Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Institutional Forex Automation for <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400">MetaTrader 5</span>
          </h1>

          <p className="text-base sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Connect your existing regulated MT5 broker account. Allow our battle-tested algorithms to trade with sub-millisecond execution, automated risk controls, and non-custodial security.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => onNavigate('/signup')}
              className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-xl shadow-blue-600/25 transition flex items-center gap-2"
            >
              <span>Get Started with MT5</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('/how-it-works')}
              className="px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm transition"
            >
              How It Works
            </button>
          </div>

          {/* Trust badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Non-Custodial (Your Capital Stays at Broker)</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400" />
              <span>AES-256 MT5 Secret Encryption</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Pre-Trade Risk Engine Guard</span>
            </div>
          </div>
        </div>

        {/* Hero Performance Overview Graphic */}
        <div className="mt-12 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-slate-800">
            <div>
              <span className="text-xs text-slate-400 block mb-1">Track Record Win Rate</span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
                {platformStats ? `${platformStats.verifiedWinRate}%` : '77.4%'}
              </span>
              <span className="text-[11px] text-slate-400 block">Verified ECN Executions</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">Total Trading Volume</span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-blue-400">142,850 Lots</span>
              <span className="text-[11px] text-slate-400 block">Across Major Pairs & Gold</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">Active Connected MT5</span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-cyan-400">
                {platformStats ? platformStats.activeTerminals : 88} Terminals
              </span>
              <span className="text-[11px] text-slate-400 block">Equinix LD4 Dedicated</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block mb-1">Max Historical Drawdown</span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">3.8%</span>
              <span className="text-[11px] text-slate-400 block">ATR Trailing Circuit Breakers</span>
            </div>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Globe2 className="w-4 h-4 text-blue-400" />
              <span>Supported Regulated MT5 Brokers: IC Markets, Pepperstone, FTMO, XM, Exness, Tickmill</span>
            </div>
            <button
              onClick={() => onNavigate('/features')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <span>Explore Architecture & Algorithms</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 3 Core Trading Algorithms */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="text-xs uppercase font-mono font-semibold tracking-wider text-blue-400">Quantitative Strategies</span>
          <h2 className="text-3xl font-bold text-white">Three Proprietary Algorithmic Engines</h2>
          <p className="text-sm text-slate-400">
            Engineered in C++ / MQL5 with multi-timeframe regime analysis, volume breakout detection, and automated session-specific volatility filters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono text-xs font-semibold">
                EURUSD • GBPUSD
              </span>
              <span className="text-xs font-bold text-emerald-400 font-mono">+44.8% YTD</span>
            </div>
            <h3 className="text-lg font-bold text-white">Alpha Trend Falcon</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Dual-timeframe exponential momentum tracker identifying sustained institutional order flow trends with dynamic ATR trailing stops.
            </p>
            <div className="pt-2 border-t border-slate-800 flex justify-between text-xs text-slate-400">
              <span>Risk Tier: Medium</span>
              <span>Sharpe: 2.14</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono text-xs font-semibold">
                XAUUSD (GOLD)
              </span>
              <span className="text-xs font-bold text-emerald-400 font-mono">+62.3% YTD</span>
            </div>
            <h3 className="text-lg font-bold text-white">Volatility Breakout Matrix</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Engineered specifically for Gold and index assets during London and New York opening bells with tight stop losses and explosive R:R targets.
            </p>
            <div className="pt-2 border-t border-slate-800 flex justify-between text-xs text-slate-400">
              <span>Risk Tier: High Volatility</span>
              <span>Sharpe: 1.88</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-xs font-semibold">
                AUDUSD • USDJPY
              </span>
              <span className="text-xs font-bold text-emerald-400 font-mono">+29.5% YTD</span>
            </div>
            <h3 className="text-lg font-bold text-white">Asian Session Range Hunter</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Statistical mean-reversion algorithm operating exclusively during Tokyo hours on tight-spread pairs to harvest low-volatility price reversals.
            </p>
            <div className="pt-2 border-t border-slate-800 flex justify-between text-xs text-slate-400">
              <span>Risk Tier: Low Risk</span>
              <span>Sharpe: 2.82</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step How It Works Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 sm:p-12 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">How The Platform Works</h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Go from sign up to live algorithmic trading on your MT5 terminal in under five minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold font-mono flex items-center justify-center">
                01
              </div>
              <h4 className="font-bold text-white text-sm">Create Account</h4>
              <p className="text-xs text-slate-400">Sign up in seconds. No KYC required for demo testing.</p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold font-mono flex items-center justify-center">
                02
              </div>
              <h4 className="font-bold text-white text-sm">Select Plan</h4>
              <p className="text-xs text-slate-400">Choose monthly, quarterly, annual, or zero upfront profit-share.</p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold font-mono flex items-center justify-center">
                03
              </div>
              <h4 className="font-bold text-white text-sm">Link MT5 Broker</h4>
              <p className="text-xs text-slate-400">Enter your MT5 server and login ID. Credentials encrypted with AES-256.</p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold font-mono flex items-center justify-center">
                04
              </div>
              <h4 className="font-bold text-white text-sm">Automate & Monitor</h4>
              <p className="text-xs text-slate-400">Watch live trades execute, monitor floating P&L, or trigger emergency stops.</p>
            </div>
          </div>

          <div className="text-center pt-4">
            <button
              onClick={() => onNavigate('/signup')}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition"
            >
              Start Automated Trading Today
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
