import React, { useState, useEffect } from 'react';
import { MT5Account } from '../../types/index.js';
import { Server, Search, RefreshCw, AlertTriangle, ShieldCheck, Power, Activity } from 'lucide-react';

export const AdminAccountsPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('ALL');
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchAccounts = () => {
    fetch('/api/admin/accounts', {
      headers: { Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.accounts) setAccounts(data.accounts);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleSyncAccount = async (accountId: string) => {
    setSyncingId(accountId);
    await fetch(`/api/admin/accounts/${accountId}/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}` },
    });
    setTimeout(() => {
      setSyncingId(null);
      fetchAccounts();
    }, 600);
  };

  const filtered = accounts.filter(a => {
    if (brokerFilter !== 'ALL' && a.brokerName !== brokerFilter) return false;
    if (search && !a.loginId.includes(search) && !a.server.toLowerCase().includes(search.toLowerCase()) && !a.userName.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">MT5 Broker Terminals Master Registry</h1>
          <p className="text-xs text-slate-400">
            Real-time latency telemetry, terminal balances, and Equinix LD4 connection orchestration.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center flex-wrap gap-3">
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search login ID, broker server, customer..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Broker:</span>
            <select
              value={brokerFilter}
              onChange={e => setBrokerFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Brokers</option>
              <option value="IC Markets Global">IC Markets Global</option>
              <option value="Pepperstone Financial">Pepperstone Financial</option>
              <option value="FTMO Proprietary">FTMO Prop Trading</option>
              <option value="XM Global">XM Global</option>
            </select>
          </div>
        </div>

        <div className="font-mono text-slate-400">
          Connected Terminals: <span className="font-bold text-white">{filtered.length}</span>
        </div>
      </div>

      {/* Master Accounts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-sans">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Broker & Server</th>
                <th className="py-3 px-4">Login ID</th>
                <th className="py-3 px-4">Balance</th>
                <th className="py-3 px-4">Equity</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(acc => (
                <tr key={acc.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-sans text-slate-200 font-bold">
                    {acc.userName}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <span className="font-bold block text-slate-200">{acc.brokerName}</span>
                    <span className="text-[11px] text-slate-400">{acc.server}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-200 font-semibold">{acc.loginId}</td>
                  <td className="py-3 px-4 text-slate-200">${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4 text-blue-400 font-bold">${acc.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">{acc.pingLatencyMs}ms</td>
                  <td className="py-3 px-4 font-sans">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase">
                      {acc.connectionStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-sans">
                    <button
                      onClick={() => handleSyncAccount(acc.id)}
                      disabled={syncingId === acc.id}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition flex items-center gap-1 ml-auto"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncingId === acc.id ? 'animate-spin' : ''}`} />
                      <span>Sync</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
