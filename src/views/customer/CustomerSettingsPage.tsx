import React, { useState } from 'react';
import { useTrading } from '../../contexts/TradingContext.js';
import { Sliders, ShieldAlert, AlertTriangle, Check, Save } from 'lucide-react';

export const CustomerSettingsPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const { riskSettings, updateRiskSettings } = useTrading();

  const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'moderate' | 'aggressive'>(
    riskSettings?.riskTolerance || 'moderate'
  );
  const [maxDailyLossPercent, setMaxDailyLossPercent] = useState<number>(riskSettings?.maxDailyLossPercent || 3);
  const [maxDrawdownPercent, setMaxDrawdownPercent] = useState<number>(riskSettings?.maxDrawdownPercent || 6);
  const [maxLotSize, setMaxLotSize] = useState<number>(riskSettings?.maxLotSize || 1.0);
  const [emergencyStop, setEmergencyStop] = useState<boolean>(riskSettings?.emergencyStop || false);

  // Sessions
  const [sessionLondon, setSessionLondon] = useState(riskSettings?.sessions?.includes('london') ?? true);
  const [sessionNewYork, setSessionNewYork] = useState(riskSettings?.sessions?.includes('newyork') ?? true);
  const [sessionAsian, setSessionAsian] = useState(riskSettings?.sessions?.includes('asian') ?? false);

  // Symbols
  const [pairs, setPairs] = useState<string[]>(riskSettings?.allowedPairs || ['EURUSD', 'GBPUSD', 'XAUUSD']);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const togglePair = (symbol: string) => {
    if (pairs.includes(symbol)) {
      setPairs(pairs.filter(p => p !== symbol));
    } else {
      setPairs([...pairs, symbol]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const activeSessions: string[] = [];
    if (sessionLondon) activeSessions.push('london');
    if (sessionNewYork) activeSessions.push('newyork');
    if (sessionAsian) activeSessions.push('asian');

    const success = await updateRiskSettings({
      riskTolerance,
      maxDailyLossPercent,
      maxDrawdownPercent,
      maxLotSize,
      emergencyStop,
      sessions: activeSessions,
      allowedPairs: pairs,
    });

    setSaving(false);
    if (success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Risk Controls & Safety Limits</h1>
        <p className="text-xs text-slate-400">
          Configure pre-trade circuit breakers, lot constraints, trading sessions, and client-level emergency stop.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>Risk parameters successfully synchronized to London Equinix LD4 Pre-Trade Risk Engine!</span>
        </div>
      )}

      {/* Emergency Stop Hero Card */}
      <div className={`p-6 rounded-2xl border transition ${emergencyStop ? 'bg-rose-950/60 border-rose-800' : 'bg-slate-900 border-slate-800'}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${emergencyStop ? 'bg-rose-900 text-rose-300' : 'bg-slate-800 text-slate-300'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Client Emergency Stop Switch</h3>
              <p className="text-xs text-slate-400 max-w-xl">
                When toggled ON, our pre-trade validation gate immediately drops all incoming execution signals for your MT5 account.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEmergencyStop(!emergencyStop)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg ${
              emergencyStop
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{emergencyStop ? 'EMERGENCY STOP ENGAGED' : 'Disengaged (Normal Trading)'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Risk Tolerance Profile */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-base">Risk Tolerance Profile</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                setRiskTolerance('conservative');
                setMaxDailyLossPercent(1.5);
                setMaxDrawdownPercent(3.5);
                setMaxLotSize(0.5);
              }}
              className={`p-4 rounded-xl border text-left transition ${
                riskTolerance === 'conservative'
                  ? 'bg-blue-950/60 border-blue-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="font-bold text-sm block mb-1">Conservative</span>
              <p className="text-xs text-slate-400">Strict capital preservation, 1.5% max daily loss, 0.5 lot limit.</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setRiskTolerance('moderate');
                setMaxDailyLossPercent(3.0);
                setMaxDrawdownPercent(6.0);
                setMaxLotSize(1.0);
              }}
              className={`p-4 rounded-xl border text-left transition ${
                riskTolerance === 'moderate'
                  ? 'bg-blue-950/60 border-blue-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="font-bold text-sm block mb-1">Moderate (Default)</span>
              <p className="text-xs text-slate-400">Balanced growth, 3.0% max daily loss, 1.0 lot limit.</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setRiskTolerance('aggressive');
                setMaxDailyLossPercent(5.0);
                setMaxDrawdownPercent(10.0);
                setMaxLotSize(2.5);
              }}
              className={`p-4 rounded-xl border text-left transition ${
                riskTolerance === 'aggressive'
                  ? 'bg-blue-950/60 border-blue-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <span className="font-bold text-sm block mb-1">Aggressive</span>
              <p className="text-xs text-slate-400">Higher volume & volatility capture, 5.0% max daily loss, 2.5 lots.</p>
            </button>
          </div>
        </div>

        {/* Quantitative Limits Grid */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-base">Quantitative Circuit Breakers</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Max Daily Loss Limit (%)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="10"
                value={maxDailyLossPercent}
                onChange={e => setMaxDailyLossPercent(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Trading pauses if reached in 24h</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Max Total Drawdown Limit (%)</label>
              <input
                type="number"
                step="0.5"
                min="1.0"
                max="25"
                value={maxDrawdownPercent}
                onChange={e => setMaxDrawdownPercent(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Hard equity ceiling stop</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Max Single Lot Size</label>
              <input
                type="number"
                step="0.1"
                min="0.01"
                max="10.0"
                value={maxLotSize}
                onChange={e => setMaxLotSize(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Absolute lot volume ceiling</span>
            </div>
          </div>
        </div>

        {/* Trading Sessions and Pairs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-base">Active Trading Sessions & Symbols</h3>

          <div className="space-y-2">
            <span className="text-xs text-slate-400 block font-medium">Session Filter</span>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sessionLondon}
                  onChange={e => setSessionLondon(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <span>London Session (08:00 - 16:30 GMT)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sessionNewYork}
                  onChange={e => setSessionNewYork(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <span>New York Session (13:00 - 21:00 GMT)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sessionAsian}
                  onChange={e => setSessionAsian(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <span>Tokyo / Asian Session (00:00 - 08:00 GMT)</span>
              </label>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <span className="text-xs text-slate-400 block font-medium">Allowed Symbols</span>
            <div className="flex flex-wrap gap-2">
              {['EURUSD', 'GBPUSD', 'XAUUSD', 'USDJPY', 'AUDUSD', 'USDCAD'].map(sym => {
                const active = pairs.includes(sym);
                return (
                  <button
                    type="button"
                    key={sym}
                    onClick={() => togglePair(sym)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition border ${
                      active
                        ? 'bg-blue-950 text-blue-300 border-blue-700'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {sym} {active ? '✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-blue-600/25 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Synchronizing Limits...' : 'Save & Enforce Risk Parameters'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
