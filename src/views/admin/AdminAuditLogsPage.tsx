import React, { useState, useEffect } from 'react';
import { AuditLog } from '../../types/index.js';
import { ShieldCheck, Search, Filter, Clock, Download } from 'lucide-react';

export const AdminAuditLogsPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.logs) setLogs(data.logs);
      })
      .catch(() => {});
  }, []);

  const filtered = logs.filter(l => {
    const actor = l.actorName || l.actorEmail || 'System';
    if (search && !l.action.toLowerCase().includes(search.toLowerCase()) && !l.details.toLowerCase().includes(search.toLowerCase()) && !actor.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Security & Compliance Audit Trail</h1>
          <p className="text-xs text-slate-400">
            Immutable log of all administrative actions, risk threshold modifications, and terminal executions.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
        <div className="relative min-w-[260px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search action, actor, target or details..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>
        <span className="font-mono text-slate-400">{filtered.length} Logged Audit Events</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-sans">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Type / ID</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(l => (
                <tr key={l.id} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 text-slate-400">{new Date(l.timestamp || l.createdAt || Date.now()).toLocaleString()}</td>
                  <td className="py-3 px-4 font-sans text-slate-200 font-semibold">{l.actorName || l.actorEmail || 'System'}</td>
                  <td className="py-3 px-4">
                    <span className="text-amber-400 font-bold">[{l.action}]</span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{l.targetType || l.resource || 'Entity'} #{(l.targetId || l.resourceId || '00000000').slice(0, 8)}</td>
                  <td className="py-3 px-4 font-sans text-slate-200">{l.details}</td>
                  <td className="py-3 px-4 text-slate-400">{l.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
