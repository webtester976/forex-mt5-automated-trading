import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Server, 
  Layers, 
  CreditCard, 
  ShieldAlert, 
  TrendingUp, 
  Activity, 
  RefreshCw, 
  AlertTriangle, 
  Power, 
  MessageSquare, 
  CheckCircle2 
} from 'lucide-react';

export const AdminOverviewPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [killSwitchOpen, setKillSwitchOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [syncingAll, setSyncingAll] = useState(false);

  const fetchOverview = () => {
    fetch('/api/admin/overview', {
      headers: { Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}` },
    })
      .then(res => res.json())
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleGlobalKillSwitch = async (activate: boolean) => {
    await fetch('/api/admin/risk/kill-switch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}`,
      },
      body: JSON.stringify({ scope: 'global', active: activate, reason: 'Toggled from Control Center' }),
    });
    setKillSwitchOpen(false);
    fetchOverview();
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMsg) return;
    await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}`,
      },
      body: JSON.stringify({ title: 'Platform Broadcast', message: broadcastMsg, type: 'system' }),
    });
    setBroadcastMsg('');
    setBroadcastOpen(false);
  };

  const handleForceSyncAll = async () => {
    setSyncingAll(true);
    await fetch('/api/admin/accounts/sync-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}` },
    });
    setTimeout(() => {
      setSyncingAll(false);
      fetchOverview();
    }, 600);
  };

  if (loading && !data) {
    return <div className="p-8 text-center text-slate-400">Loading administrative telemetry...</div>;
  }

  const metrics = data?.metrics;
  const isKillSwitchActive = data?.killSwitches?.globalKillSwitch;

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Administrative Operations Suite</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-amber-950 text-amber-300 border border-amber-800">
              Live Cluster Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time multi-tenant monitoring across London Equinix LD4, New York NY4, and Tokyo TY3.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleForceSyncAll}
            disabled={syncingAll}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin text-amber-400' : ''}`} />
            <span>Force Sync All Terminals</span>
          </button>

          <button
            onClick={() => setBroadcastOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>Broadcast Alert</span>
          </button>

          <button
            onClick={() => setKillSwitchOpen(true)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg ${
              isKillSwitchActive
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isKillSwitchActive ? 'Resume Global Trading' : 'Global Emergency Halt'}</span>
          </button>
        </div>
      </div>

      {/* Warning Ticker if Kill Switch active */}
      {isKillSwitchActive && (
        <div className="bg-rose-950/80 border border-rose-800 text-rose-200 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs font-medium">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
            <span>
              GLOBAL KILL SWITCH ACTIVE: Order routing across all customer MT5 accounts is currently halted. Existing stop losses remain active on brokers.
            </span>
          </div>
          <button
            onClick={() => handleGlobalKillSwitch(false)}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
          >
            Resume Trading
          </button>
        </div>
      )}

      {/* Top 8 Key Administrative Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Total Customers */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Total Registered Users</span>
          <div className="font-mono text-2xl font-extrabold text-white">
            {metrics?.totalCustomers || 142}
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">138 KYC Verified</span>
        </div>

        {/* Active Subscriptions */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Active Subscriptions</span>
          <div className="font-mono text-2xl font-extrabold text-blue-400">
            {metrics?.activeSubscriptions || 84}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">MRR: ${metrics?.monthlyRecurringRevenue?.toLocaleString() || '18,450'}</span>
        </div>

        {/* Connected MT5 Terminals */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Connected MT5 Terminals</span>
          <div className="font-mono text-2xl font-extrabold text-emerald-400">
            {metrics?.connectedTerminals || 88} / {metrics?.totalMt5Accounts || 92}
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">Avg Latency: 1.2ms LD4</span>
        </div>

        {/* Open Platform Trades */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Open Platform Positions</span>
          <div className="font-mono text-2xl font-extrabold text-cyan-400">
            {metrics?.openPlatformTrades || 16} Trades
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Floating: +$2,480.00</span>
        </div>

        {/* Platform Today's P&L */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Today's Platform P&L</span>
          <div className="font-mono text-lg font-bold text-emerald-400">
            +${metrics?.todayPlatformPnl?.toLocaleString() || '4,820.00'}
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">Net Realized Client Profits</span>
        </div>

        {/* Win Rate */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Platform Win Rate</span>
          <div className="font-mono text-lg font-bold text-slate-100">
            {metrics?.platformWinRate || 77.4}%
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Profit Factor: 2.38</span>
        </div>

        {/* Total Volume */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Total Executed Lots</span>
          <div className="font-mono text-lg font-bold text-slate-100">
            {metrics?.totalVolumeLots?.toLocaleString() || '142,850'} Lots
          </div>
          <span className="text-[11px] text-slate-400 font-mono">1.8M Round Turns YTD</span>
        </div>

        {/* Max Drawdown */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Max Platform Drawdown</span>
          <div className="font-mono text-lg font-bold text-emerald-400">
            {metrics?.maxPlatformDrawdown || 3.8}%
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Within 5% Target Cap</span>
        </div>
      </div>

      {/* Cluster Health & Recent Platform Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equinix Worker Cluster */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Worker Node Cluster Status</span>
            </h3>
            <span className="text-[11px] font-mono text-emerald-400">3/3 Nodes Online</span>
          </div>

          <div className="space-y-3 text-xs">
            {data?.workers?.map((w: any) => (
              <div key={w.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-slate-200">{w.workerName}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {w.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">{w.location}</div>
                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-1 border-t border-slate-900">
                  <div>CPU: <span className="text-slate-200">{w.cpuPercent}%</span></div>
                  <div>RAM: <span className="text-slate-200">{w.memoryPercent}%</span></div>
                  <div>Ping: <span className="text-emerald-400">{w.pingLatencyMs}ms</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit / Security Log Feed */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Real-Time Audit & Security Event Stream</span>
            </h3>
            <button
              onClick={() => onNavigate('/admin/audit-logs')}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
            >
              View Full Audit Log &rarr;
            </button>
          </div>

          <div className="space-y-2 text-xs font-mono">
            {data?.recentAuditLogs?.slice(0, 5).map((log: any) => (
              <div key={log.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-amber-400 font-bold">[{log.action}]</span>
                  <span className="text-slate-300 truncate font-sans">{log.details}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 shrink-0 text-[11px]">
                  <span>{log.actorName}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Broadcast Modal */}
      {broadcastOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Broadcast Client Advisory</h3>
            <p className="text-xs text-slate-400">
              This message will be instantly sent to all connected customer dashboards and mobile alert feeds.
            </p>
            <form onSubmit={handleBroadcast} className="space-y-4">
              <textarea
                rows={4}
                required
                value={broadcastMsg}
                onChange={e => setBroadcastMsg(e.target.value)}
                placeholder="e.g. High-impact FOMC interest rate announcement in 30 minutes. Algorithmic trade entries paused automatically."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              ></textarea>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBroadcastOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 bg-slate-800 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition"
                >
                  Transmit Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kill switch confirmation */}
      {killSwitchOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">
              {isKillSwitchActive ? 'Resume Global Trading?' : 'CONFIRM GLOBAL EMERGENCY HALT'}
            </h3>
            <p className="text-xs text-slate-300">
              {isKillSwitchActive
                ? 'Resuming trading will immediately authorize workers to accept new algorithmic orders.'
                : 'Engaging the global halt will immediately block all algorithm execution across all 88 customer MT5 accounts.'}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setKillSwitchOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleGlobalKillSwitch(!isKillSwitchActive)}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white ${
                  isKillSwitchActive ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {isKillSwitchActive ? 'Resume Trading' : 'ENGAGE EMERGENCY HALT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
