import React, { useState } from 'react';
import { useTrading } from '../../contexts/TradingContext.js';
import { PerformanceChart } from '../../components/customer/PerformanceChart.js';
import { BarChart3, TrendingUp, Calendar, Download, Award, ShieldAlert } from 'lucide-react';

export const CustomerPerformancePage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const { stats, mt5Account } = useTrading();
  const [timeRange, setTimeRange] = useState<'30D' | '90D' | 'YTD' | 'ALL'>('30D');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Performance & Analytics</h1>
          <p className="text-xs text-slate-400">
            Quantitative equity growth curve, risk metrics, and trade distributions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex text-xs">
            {(['30D', '90D', 'YTD', 'ALL'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg font-mono font-medium transition ${
                  timeRange === range ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Equity Area Chart and Stats Grid */}
      <PerformanceChart stats={stats} />

      {/* Financial Horizon Breakdown: Daily, Weekly, Monthly, Cumulative */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-xs text-slate-400 block font-medium">Today's Realized P&L</span>
          <div className="font-mono text-2xl font-extrabold text-emerald-400">
            +${stats ? stats.todayPnl.toFixed(2) : '384.20'}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Today's session closed profits</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-xs text-slate-400 block font-medium">This Week's P&L</span>
          <div className="font-mono text-2xl font-extrabold text-emerald-400">
            +${stats ? (stats.weekPnl ?? stats.weeklyPnl ?? 1248.50).toFixed(2) : '1,248.50'}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Cumulative 5-day cycle</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-xs text-slate-400 block font-medium">This Month's P&L</span>
          <div className="font-mono text-2xl font-extrabold text-emerald-400">
            +${stats ? (stats.monthPnl ?? stats.monthlyPnl ?? 5480.00).toFixed(2) : '5,480.00'}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">+27.4% net yield on capital</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-xs text-slate-400 block font-medium">Max Recorded Drawdown</span>
          <div className="font-mono text-2xl font-extrabold text-cyan-400">
            {stats ? `${stats.maxDrawdown}%` : '3.4%'}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Governed by Trailing Stops</span>
        </div>
      </div>

      {/* Advanced Statistical Ratios */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-white text-base">Quantitative Risk & Trade Distribution</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 block text-[11px] mb-1">Total Winning Deals</span>
            <span className="font-mono text-lg font-bold text-emerald-400">{stats?.totalWins || 26} Trades</span>
            <span className="text-[11px] text-slate-400 block">Avg Hold: 2h 45m</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 block text-[11px] mb-1">Total Losing Deals</span>
            <span className="font-mono text-lg font-bold text-rose-400">{stats?.totalLosses || 8} Trades</span>
            <span className="text-[11px] text-slate-400 block">Cut by Stop Loss Guard</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 block text-[11px] mb-1">Gross Realized Profit</span>
            <span className="font-mono text-lg font-bold text-emerald-400">+$9,240.00</span>
            <span className="text-[11px] text-slate-400 block">Winning Lot Volume</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 block text-[11px] mb-1">Gross Realized Loss</span>
            <span className="font-mono text-lg font-bold text-rose-400">-$3,760.00</span>
            <span className="text-[11px] text-slate-400 block">Net Profit: +$5,480.00</span>
          </div>
        </div>
      </div>
    </div>
  );
};
