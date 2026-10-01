import React, { useState } from 'react';
import { FileText, Download, BarChart2, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const AdminReportsPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const reportTemplates = [
    {
      id: 'financial_monthly',
      title: 'Monthly Financial & Revenue Statement',
      category: 'Accounting & Treasury',
      description: 'Breakdown of recurring SaaS subscription revenues, processing fees and platform net margin.',
      frequency: 'Monthly / On-Demand',
      format: 'PDF & CSV',
    },
    {
      id: 'algo_alpha',
      title: 'Quantitative Strategy Alpha Audit',
      category: 'Trading Algorithms',
      description: 'Sharpe ratio, Sortino, max drawdown, win rate and expectancy per quantitative algorithm version.',
      frequency: 'Weekly',
      format: 'PDF',
    },
    {
      id: 'risk_compliance',
      title: 'Risk Engine Incident & Circuit-Breaker Log',
      category: 'Risk Management',
      description: 'Complete audit log of slippage alerts, drawdown triggers and automatic kill-switch activations.',
      frequency: 'Daily',
      format: 'CSV / JSON',
    },
    {
      id: 'latency_telemetry',
      title: 'MT5 Broker Gateway Latency Analysis',
      category: 'Infrastructure',
      description: 'Sub-millisecond execution telemetry across broker bridges and regional worker nodes.',
      frequency: 'Real-time aggregated',
      format: 'CSV',
    },
  ];

  const handleDownload = (id: string) => {
    setDownloading(id);
    setTimeout(() => {
      setDownloading(null);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Executive Reports & Audits</h1>
        <p className="text-xs text-slate-400">Institutional regulatory exports, financial reconciliation statements and algorithm performance audits</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportTemplates.map(r => (
          <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition">
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-semibold border border-slate-700">
                  {r.category}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{r.frequency}</span>
              </div>
              <h3 className="text-base font-bold text-white">{r.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{r.description}</p>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">Format: {r.format}</span>
              <button
                onClick={() => handleDownload(r.id)}
                disabled={downloading === r.id}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{downloading === r.id ? 'Generating...' : 'Export Report'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
