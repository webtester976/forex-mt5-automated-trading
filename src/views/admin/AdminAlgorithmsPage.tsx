import React, { useState, useEffect } from 'react';
import { Algorithm } from '../../types/index.js';
import { Cpu, Play, Pause, Settings, BarChart2, ShieldCheck, CheckCircle2, Sliders } from 'lucide-react';

export const AdminAlgorithmsPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([]);
  const [selectedAlgo, setSelectedAlgo] = useState<Algorithm | null>(null);
  const [toggleSuccess, setToggleSuccess] = useState<string | null>(null);

  const fetchAlgos = () => {
    fetch('/api/admin/algorithms', {
      headers: { Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.algorithms) {
          setAlgorithms(data.algorithms);
          if (!selectedAlgo && data.algorithms.length > 0) {
            setSelectedAlgo(data.algorithms[0]);
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchAlgos();
  }, []);

  const handleToggleAlgo = async (algoId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    await fetch(`/api/admin/algorithms/${algoId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });
    setToggleSuccess(`Algorithm status changed to ${newStatus.toUpperCase()}`);
    setTimeout(() => setToggleSuccess(null), 3000);
    fetchAlgos();
    if (selectedAlgo?.id === algoId) {
      setSelectedAlgo({ ...selectedAlgo, status: newStatus });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Algorithmic Engine & Bot Management</h1>
          <p className="text-xs text-slate-400">
            Institutional quant strategies, execution rules, volatility thresholds, and global bot deployment.
          </p>
        </div>
      </div>

      {toggleSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{toggleSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Algorithms List */}
        <div className="space-y-4">
          {algorithms.map(algo => {
            const isSelected = selectedAlgo?.id === algo.id;
            return (
              <div
                key={algo.id}
                onClick={() => setSelectedAlgo(algo)}
                className={`bg-slate-900 border rounded-2xl p-5 cursor-pointer transition space-y-3 ${
                  isSelected ? 'border-amber-500 shadow-lg shadow-amber-500/10' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-950 text-amber-400 border border-amber-800 flex items-center justify-center">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{algo.name}</h3>
                      <span className="text-xs font-mono text-slate-400">v{algo.version} • {algo.strategyType}</span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    algo.status === 'active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    {algo.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-2 border-t border-slate-800">
                  <div className="bg-slate-950 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block font-sans">Win Rate</span>
                    <span className="text-emerald-400 font-bold">{algo.winRate}%</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block font-sans">Profit Factor</span>
                    <span className="text-white font-bold">{algo.profitFactor}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg">
                    <span className="text-[10px] text-slate-400 block font-sans">Max DD</span>
                    <span className="text-cyan-400 font-bold">{algo.maxDrawdown}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Algorithm Deep-Dive Inspector */}
        {selectedAlgo && (
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">{selectedAlgo.name}</h2>
                  <span className="text-xs font-mono text-amber-400 font-bold">v{selectedAlgo.version}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">{selectedAlgo.description}</p>
              </div>

              <button
                onClick={() => handleToggleAlgo(selectedAlgo.id, selectedAlgo.status || 'active')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow ${
                  selectedAlgo.status === 'active'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {selectedAlgo.status === 'active' ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause Strategy Globally</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Deploy & Activate Strategy</span>
                  </>
                )}
              </button>
            </div>

            {/* Target Pairs & Timeframes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs text-slate-400 block font-medium">Approved Instruments</span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedAlgo.targetPairs || ['EURUSD', 'GBPUSD', 'XAUUSD']).map(p => (
                    <span key={p} className="px-2 py-1 rounded bg-slate-900 text-blue-300 font-mono text-xs border border-slate-800">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs text-slate-400 block font-medium">Candlestick Resolution</span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedAlgo.timeframes || ['M15', 'H1', 'H4']).map(t => (
                    <span key={t} className="px-2 py-1 rounded bg-slate-900 text-emerald-300 font-mono text-xs border border-slate-800">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Parameter Inspector */}
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Quant Strategy Parameters & Volatility Filters</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="flex justify-between p-2.5 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400">ATR Period:</span>
                  <span className="text-slate-200">{selectedAlgo.parameters?.atrPeriod || 14}</span>
                </div>
                <div className="flex justify-between p-2.5 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400">Breakout Lookback:</span>
                  <span className="text-slate-200">{selectedAlgo.parameters?.breakoutBars || 20} bars</span>
                </div>
                <div className="flex justify-between p-2.5 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400">Trailing Stop ATR Multiplier:</span>
                  <span className="text-slate-200">{selectedAlgo.parameters?.trailingStopMultiplier || 1.8}x</span>
                </div>
                <div className="flex justify-between p-2.5 rounded bg-slate-900 border border-slate-800/80">
                  <span className="text-slate-400">Max Spread Slippage:</span>
                  <span className="text-slate-200">{selectedAlgo.parameters?.maxSpreadPips || 1.2} pips</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
