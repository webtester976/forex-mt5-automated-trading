import React, { useState, useEffect } from 'react';
import { SignalProvider } from '../../types/index.js';
import { Users, Award, TrendingUp, CheckCircle2, ShieldCheck, Star } from 'lucide-react';

export const AdminSocialPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [providers, setProviders] = useState<SignalProvider[]>([]);

  useEffect(() => {
    fetch('/api/admin/social', {
      headers: { Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.providers) setProviders(data.providers);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Social & Copy Trading Signal Engine</h1>
          <p className="text-xs text-slate-400">
            Multi-Account Manager (MAM), master signal providers, performance fee reconciliation, and copiers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map(p => (
          <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">{p.name}</h3>
                  {p.isVerified && (
                    <span className="p-1 rounded-full bg-blue-950 text-blue-400 border border-blue-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{p.strategyDescription}</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block font-mono">Performance Fee</span>
                <span className="font-mono font-bold text-emerald-400 text-base">{p.performanceFeePercent}%</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono pt-2 border-t border-slate-800">
              <div className="bg-slate-950 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-sans">Active Copiers</span>
                <span className="text-white font-bold">{p.totalCopiers}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-sans">AUM Capital</span>
                <span className="text-blue-400 font-bold">${p.aumUsd.toLocaleString()}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-sans">Win Rate</span>
                <span className="text-emerald-400 font-bold">{p.winRate}%</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-400 block font-sans">Max DD</span>
                <span className="text-cyan-400 font-bold">{p.maxDrawdown}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
