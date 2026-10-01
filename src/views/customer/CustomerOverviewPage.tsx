import React, { useState } from 'react';
import { useTrading } from '../../contexts/TradingContext.js';
import { TradeCard } from '../../components/customer/TradeCard.js';
import { ConnectMt5Modal } from '../../components/customer/ConnectMt5Modal.js';
import { 
  TrendingUp, 
  Server, 
  Layers, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  Activity, 
  Clock, 
  Sliders, 
  ArrowUpRight, 
  Award,
  Zap
} from 'lucide-react';

export const CustomerOverviewPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { 
    mt5Account, 
    openTrades, 
    stats, 
    riskSettings, 
    subscription, 
    platformKillSwitchActive, 
    effectiveManualClose,
    closePosition, 
    refreshTradingData 
  } = useTrading();

  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshTradingData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const floatingPnl = openTrades.reduce((sum, t) => sum + t.currentPnl, 0);

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Trading Command Center</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-medium bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time synchronization with London Equinix LD4 MetaTrader 5 execution cluster.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span>Sync MT5</span>
          </button>

          {!mt5Account ? (
            <button
              onClick={() => setConnectModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition flex items-center gap-1.5"
            >
              <Server className="w-3.5 h-3.5" />
              <span>Link MT5 Terminal</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('/dashboard/mt5')}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono flex items-center gap-2 transition"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{mt5Account.brokerName} ({mt5Account.loginId})</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Financial Overview Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Balance */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Account Balance</span>
          <div className="font-mono text-2xl font-extrabold text-slate-100">
            ${mt5Account ? mt5Account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '25,480.00'}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Settled Broker Capital</span>
        </div>

        {/* Equity */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Account Equity</span>
          <div className="font-mono text-2xl font-extrabold text-blue-400">
            ${mt5Account ? mt5Account.equity.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '26,728.50'}
          </div>
          <span className="text-[11px] text-blue-300 font-mono">Balance + Floating P&L</span>
        </div>

        {/* Floating P&L */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Floating Live P&L</span>
          <div className={`font-mono text-2xl font-extrabold ${floatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {floatingPnl >= 0 ? '+' : ''}${floatingPnl.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">{openTrades.length} Active Market Positions</span>
        </div>

        {/* Today's Realized P&L */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Today's P&L</span>
          <div className="font-mono text-2xl font-extrabold text-emerald-400">
            +${stats ? stats.todayPnl.toFixed(2) : '384.20'}
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">Closed Profits Today</span>
        </div>

        {/* Margin */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Used Margin</span>
          <div className="font-mono text-lg font-bold text-slate-200">
            ${mt5Account ? mt5Account.margin.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '1,120.00'}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Committed Lot Collateral</span>
        </div>

        {/* Free Margin */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Free Margin</span>
          <div className="font-mono text-lg font-bold text-slate-200">
            ${mt5Account ? mt5Account.freeMargin.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '25,608.50'}
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">Available for New Orders</span>
        </div>

        {/* Margin Level % */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Margin Level %</span>
          <div className="font-mono text-lg font-bold text-emerald-400">
            {mt5Account ? `${mt5Account.marginLevel.toFixed(1)}%` : '2,386.4%'}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Safe (Stopout @ 50%)</span>
        </div>

        {/* Win/Loss Stats */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Win Rate / Total Deals</span>
          <div className="font-mono text-lg font-bold text-slate-200">
            {stats ? `${stats.winRate}%` : '76.5%'}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">26W / 8L • PF {stats ? stats.profitFactor.toFixed(2) : '2.45'}</span>
        </div>
      </div>

      {/* Auxiliary Metadata Strip: Last Sync, Subscription, Active Algorithm, Risk Profile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-950 text-blue-400 border border-blue-900">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Last Sync with MT5</span>
            <span className="font-mono text-slate-200 font-medium">
              {mt5Account ? new Date(mt5Account.lastSyncAt || mt5Account.lastSync || Date.now()).toLocaleTimeString() : 'Live Stream Continuous'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-900">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Subscription Tier</span>
            <span className="font-semibold text-indigo-300 font-mono">
              {subscription ? subscription.planName : 'Pro Quant Plan'} (Active)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-900">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Active Algorithmic Engine</span>
            <span className="font-semibold text-emerald-300 font-mono">
              {mt5Account?.currentAlgorithmName || 'Alpha Trend Falcon (v2.4)'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-950 text-amber-400 border border-amber-900">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Active Risk Profile</span>
            <span className="font-semibold text-amber-300 font-mono capitalize">
              {riskSettings ? riskSettings.riskTolerance : 'Moderate'} ({riskSettings?.maxDailyLossPercent || 3}% Max DD)
            </span>
          </div>
        </div>
      </div>

      {/* Live Open Trades Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Live Open Positions ({openTrades.length})</h2>
            <span className="text-xs text-slate-400">Continuous broker position stream</span>
          </div>
          <button
            onClick={() => onNavigate('/dashboard/trades')}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
          >
            View Trade Ledger &rarr;
          </button>
        </div>

        {openTrades.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">No Open Trades Currently Running</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Our quantitative engine is analyzing market order books and waiting for high-probability institutional breakout criteria to execute.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {openTrades.map(trade => (
              <TradeCard
                key={trade.id}
                trade={trade}
                onClose={effectiveManualClose ? closePosition : undefined}
                effectiveManualClose={effectiveManualClose}
              />
            ))}
          </div>
        )}
      </div>

      {/* Connect MT5 Modal */}
      <ConnectMt5Modal isOpen={connectModalOpen} onClose={() => setConnectModalOpen(false)} />
    </div>
  );
};
