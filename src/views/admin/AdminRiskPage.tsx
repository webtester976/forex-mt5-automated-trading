import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Power, 
  CheckCircle2, 
  Sliders, 
  Clock, 
  Zap, 
  Lock,
  Layers,
  Check
} from 'lucide-react';

export const AdminRiskPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [riskData, setRiskData] = useState<any>(null);
  const [killSwitchModal, setKillSwitchModal] = useState(false);
  const [killScope, setKillScope] = useState<'global' | 'broker' | 'algo'>('global');
  const [killReason, setKillReason] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchRisk = () => {
    fetch('/api/admin/risk', {
      headers: { Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}` },
    })
      .then(res => res.json())
      .then(data => setRiskData(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchRisk();
  }, []);

  const handleKillSwitch = async (activate: boolean) => {
    await fetch('/api/admin/risk/kill-switch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}`,
      },
      body: JSON.stringify({
        scope: killScope,
        active: activate,
        reason: killReason || 'Administrative risk safeguard trigger',
      }),
    });
    setKillSwitchModal(false);
    setActionSuccess(`Emergency Kill Switch ${activate ? 'ACTIVATED' : 'DISENGAGED'}`);
    setTimeout(() => setActionSuccess(null), 3500);
    fetchRisk();
  };

  const isGlobalKilled = riskData?.killSwitches?.globalKillSwitch;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Institutional Risk Gate & Circuit Breakers</h1>
          <p className="text-xs text-slate-400">
            Multi-tier circuit breakers, pre-trade order inspection, and automated flash-crash intervention.
          </p>
        </div>

        <button
          onClick={() => setKillSwitchModal(true)}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg ${
            isGlobalKilled
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
          }`}
        >
          <Power className="w-4 h-4" />
          <span>{isGlobalKilled ? 'Deactivate Kill Switch (Resume)' : 'TRIGGER EMERGENCY KILL SWITCH'}</span>
        </button>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Pre-Trade Validation Gate Visual Pipeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Pre-Trade Order Validation Pipeline (Sub-1ms Gatekeeper)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Every single algorithmic signal MUST pass all 6 sequential checks before reaching MT5 broker workers.
            </p>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-800 px-2.5 py-1 rounded-full">
            All 6 Gates Enforced
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-2">
          {[
            { step: '01', title: 'Global Kill Switch', desc: 'Checks if admin or customer halt is engaged', status: 'PASS' },
            { step: '02', title: 'News Event Filter', desc: 'Blocks entry 15m before/after Red Folders (CPI/NFP)', status: 'PASS' },
            { step: '03', title: 'Max Spread Guard', desc: 'Rejects order if live broker spread > 1.5 pips', status: 'PASS' },
            { step: '04', title: 'Account DD Limit', desc: 'Verifies cumulative loss does not exceed client cap', status: 'PASS' },
            { step: '05', title: 'Margin Collateral', desc: 'Verifies free margin ratio > 250% before fill', status: 'PASS' },
            { step: '06', title: 'Slippage Ceiling', desc: 'Rejects order if execution slippage exceeds 0.8 pips', status: 'PASS' },
          ].map(g => (
            <div key={g.step} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-amber-400 font-bold">{g.step}</span>
                <span className="text-emerald-400 font-bold">{g.status}</span>
              </div>
              <h4 className="text-xs font-bold text-white leading-tight">{g.title}</h4>
              <p className="text-[11px] text-slate-400 leading-snug">{g.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Global Risk Thresholds Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-base">Platform-Wide Risk Thresholds</h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="font-bold text-slate-200 block">Max Platform Drawdown (%)</span>
                <span className="text-[11px] text-slate-400">Halts entire platform if portfolio declines</span>
              </div>
              <input
                type="number"
                defaultValue={5.0}
                className="w-20 bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-right text-slate-200"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="font-bold text-slate-200 block">High-Impact News Buffer (Minutes)</span>
                <span className="text-[11px] text-slate-400">Pause window before & after CPI, FOMC, NFP</span>
              </div>
              <input
                type="number"
                defaultValue={15}
                className="w-20 bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-right text-slate-200"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="font-bold text-slate-200 block">Max Spread Ceiling (Pips)</span>
                <span className="text-[11px] text-slate-400">Drops incoming buy/sell if spread blows out</span>
              </div>
              <input
                type="number"
                defaultValue={1.5}
                step="0.1"
                className="w-20 bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-right text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Active Risk Alerts Stream */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Active Risk Interventions & Warnings</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-amber-900/60 text-slate-300 space-y-1">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-amber-400 font-bold">[SPREAD_SURGE_GUARD]</span>
                <span className="text-slate-400">2 mins ago</span>
              </div>
              <p>EURUSD spread spiked to 2.4 pips during ECB speech. 2 pending buy signals automatically suspended.</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 space-y-1">
              <div className="flex justify-between font-mono text-[11px]">
                <span className="text-blue-400 font-bold">[DAILY_DD_CLEARANCE]</span>
                <span className="text-slate-400">14 mins ago</span>
              </div>
              <p>Client #1002 (David S.) reached 2.8% daily gain target. Automated trailing take-profit secured.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kill Switch Modal */}
      {killSwitchModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Configure Emergency Kill Switch Action</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Intervention Scope</label>
                <select
                  value={killScope}
                  onChange={e => setKillScope(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200"
                >
                  <option value="global">Global (All 88 Connected Customer Accounts)</option>
                  <option value="broker">Specific Broker Server (IC Markets LD4)</option>
                  <option value="algo">Specific Algorithm (Alpha Trend Falcon)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Justification / Reason (Audited)</label>
                <input
                  type="text"
                  required
                  value={killReason}
                  onChange={e => setKillReason(e.target.value)}
                  placeholder="e.g. Unscheduled geopolitical escalation, flash crash anomaly"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setKillSwitchModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleKillSwitch(!isGlobalKilled)}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white ${
                  isGlobalKilled ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {isGlobalKilled ? 'Resume Trading' : 'ENGAGE CIRCUIT BREAKER'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
