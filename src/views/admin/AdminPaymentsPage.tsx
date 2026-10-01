import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Download, 
  RefreshCw,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { PaymentRecord } from '../../types/index.js';

export const AdminPaymentsPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'succeeded' | 'pending' | 'failed' | 'refunded'>('all');
  const [search, setSearch] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const getAuthToken = () => {
    return localStorage.getItem('auth_token') || localStorage.getItem('forex_saas_token') || '';
  };

  const fetchPayments = () => {
    setLoading(true);
    fetch('/api/billing/admin/payments', {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.payments) {
          setPayments(data.payments);
        }
      })
      .catch(err => {
        console.error('Failed to load payments', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleRefund = async (paymentId: string) => {
    if (!confirm('Are you sure you want to issue a refund for this transaction?')) return;

    try {
      const res = await fetch(`/api/billing/admin/payments/${paymentId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refund failed');

      setNotification({ type: 'success', message: `Transaction ${paymentId} refunded successfully.` });
      fetchPayments();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  const filtered = payments.filter(p => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesSearch = 
      (p.id || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.transactionId || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.userEmail || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.userName || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.invoiceNumber || '').toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalCollected = payments
    .filter(p => p.status === 'succeeded')
    .reduce((sum, p) => sum + (Number(p.amountUsd) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Payments & Settlement Ledger</h1>
          <p className="text-xs text-slate-400">Merchant billing transactions, invoices and settlement ledger recorded via Stripe.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            Total Succeeded: <span className="font-bold text-emerald-400 font-mono">${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          <button
            onClick={fetchPayments}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh payments"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-2xl text-xs flex items-center justify-between border ${
          notification.type === 'success'
            ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
            : 'bg-rose-950/80 border-rose-800 text-rose-200'
        }`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search transaction ID, invoice, user email..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'succeeded', 'refunded', 'failed'] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                filterStatus === st
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
              <tr>
                <th className="py-3 px-4">Transaction / Invoice</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4">
                    <span className="font-mono font-medium text-slate-200 text-xs block">
                      {p.transactionId || p.id}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">{p.invoiceNumber || 'No Invoice #'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-white font-medium block">{p.userName || 'Customer'}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{p.userEmail || p.userId}</span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-white">
                    ${Number(p.amountUsd).toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                      p.status === 'succeeded'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : p.status === 'refunded'
                        ? 'bg-purple-950 text-purple-400 border-purple-800'
                        : 'bg-rose-950 text-rose-400 border-rose-800'
                    }`}>
                      {p.status === 'succeeded' ? <CheckCircle2 className="w-3 h-3" /> : null}
                      <span>{p.status}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px] uppercase">
                    {p.provider || 'Stripe'}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs font-mono">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {p.status === 'succeeded' ? (
                      <button
                        onClick={() => handleRefund(p.id)}
                        className="text-xs text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 font-sans px-2 py-1 rounded hover:bg-slate-800"
                        title="Issue full refund"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Refund</span>
                      </button>
                    ) : (
                      <span className="text-slate-600 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    No transactions found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
