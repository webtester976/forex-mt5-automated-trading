import React from 'react';
import { PerformanceStats } from '../../types/index.js';
import { TrendingUp, Award, Activity, ShieldAlert, BarChart3 } from 'lucide-react';

interface PerformanceChartProps {
  stats: PerformanceStats | null;
  equityCurve?: Array<{ date: string; balance: number; equity: number; profit: number }>;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ stats, equityCurve }) => {
  const defaultCurve = equityCurve || [
    { date: 'Sep 01', balance: 20000, equity: 20000, profit: 0 },
    { date: 'Sep 04', balance: 20640, equity: 20710, profit: 640 },
    { date: 'Sep 08', balance: 21350, equity: 21420, profit: 1350 },
    { date: 'Sep 12', balance: 22100, equity: 22050, profit: 2100 },
    { date: 'Sep 16', balance: 23420, equity: 23680, profit: 3420 },
    { date: 'Sep 19', balance: 24750, equity: 24900, profit: 4750 },
    { date: 'Sep 22', balance: 25480, equity: 26728, profit: 6728 },
  ];

  // SVG dimensions for high-resolution responsive canvas
  const minEquity = Math.min(...defaultCurve.map(d => d.equity)) * 0.98;
  const maxEquity = Math.max(...defaultCurve.map(d => d.equity)) * 1.02;
  const range = maxEquity - minEquity || 1;

  const points = defaultCurve.map((d, i) => {
    const x = (i / (defaultCurve.length - 1)) * 500;
    const y = 160 - ((d.equity - minEquity) / range) * 140;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,160 ${points} 500,160`;

  return (
    <div className="space-y-6">
      {/* Visual Chart Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-lg">Net Capital Growth & Equity Curve</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold font-mono">
                +27.4% MTD
              </span>
            </div>
            <p className="text-xs text-slate-400">Institutional tick-by-tick MT5 balance and floating equity reconciliation</p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-0.5 bg-blue-400 rounded"></span>
              Equity
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2.5 h-0.5 bg-slate-600 rounded"></span>
              Balance
            </span>
          </div>
        </div>

        {/* SVG Equity Area Chart */}
        <div className="w-full overflow-hidden bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
          <svg viewBox="0 0 500 170" className="w-full h-44 overflow-visible">
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid horizontal guidelines */}
            <line x1="0" y1="30" x2="500" y2="30" stroke="#1e293b" strokeDasharray="3 3" />
            <line x1="0" y1="80" x2="500" y2="80" stroke="#1e293b" strokeDasharray="3 3" />
            <line x1="0" y1="130" x2="500" y2="130" stroke="#1e293b" strokeDasharray="3 3" />

            {/* Filled Area */}
            <polygon points={areaPoints} fill="url(#equityGradient)" />

            {/* Curved Path */}
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              points={points}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points */}
            {defaultCurve.map((d, i) => {
              const x = (i / (defaultCurve.length - 1)) * 500;
              const y = 160 - ((d.equity - minEquity) / range) * 140;
              return (
                <g key={i}>
                  <circle cx={x} cy={y} r="3.5" fill="#1e293b" stroke="#60a5fa" strokeWidth="2" />
                </g>
              );
            })}
          </svg>

          {/* Date Axis */}
          <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-2 px-1">
            {defaultCurve.map((d, idx) => (
              <span key={idx}>{d.date}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Quantitative Trading Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-400 text-xs block mb-1">Win Rate</span>
          <div className="font-mono text-xl font-bold text-emerald-400">
            {stats ? `${stats.winRate}%` : '76.5%'}
          </div>
          <span className="text-[11px] text-slate-400">26W / 8L Trades</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-400 text-xs block mb-1">Profit Factor</span>
          <div className="font-mono text-xl font-bold text-blue-400">
            {stats ? stats.profitFactor.toFixed(2) : '2.45'}
          </div>
          <span className="text-[11px] text-slate-400">Gross W / Gross L</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-400 text-xs block mb-1">Max Drawdown</span>
          <div className="font-mono text-xl font-bold text-cyan-400">
            {stats ? `${stats.maxDrawdown}%` : '3.4%'}
          </div>
          <span className="text-[11px] text-slate-400">Protected by Stop</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-400 text-xs block mb-1">Average Win</span>
          <div className="font-mono text-xl font-bold text-emerald-400">
            {stats ? `+$${stats.averageWin.toFixed(2)}` : '+$224.60'}
          </div>
          <span className="text-[11px] text-slate-400">Per Winning Deal</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-400 text-xs block mb-1">Average Loss</span>
          <div className="font-mono text-xl font-bold text-rose-400">
            {stats ? `-$${stats.averageLoss.toFixed(2)}` : '-$193.75'}
          </div>
          <span className="text-[11px] text-slate-400">Tight SL Cut</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-slate-400 text-xs block mb-1">Total Net P&L</span>
          <div className="font-mono text-xl font-bold text-emerald-400">
            {stats ? `+$${stats.netPnl.toFixed(2)}` : '+$5,480.00'}
          </div>
          <span className="text-[11px] text-slate-400">Realized + Open</span>
        </div>
      </div>
    </div>
  );
};
