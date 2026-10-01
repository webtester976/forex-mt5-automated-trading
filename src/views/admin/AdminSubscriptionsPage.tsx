import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  DollarSign, 
  CheckCircle2, 
  RefreshCw, 
  Download, 
  ArrowUpRight, 
  Sliders, 
  AlertCircle, 
  Clock, 
  XCircle,
  Save,
  Check
} from 'lucide-react';
import { SubscriptionPlan } from '../../types/index.js';

export const AdminSubscriptionsPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'subs' | 'plans'>('subs');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const getAuthToken = () => {
    return localStorage.getItem('auth_token') || localStorage.getItem('forex_saas_token') || '';
  };

  const fetchSubscriptionsAndPlans = async () => {
    setLoading(true);
    const token = getAuthToken();
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      const [subsRes, plansRes] = await Promise.all([
        fetch('/api/billing/admin/subscriptions', { headers }),
        fetch('/api/billing/plans', { headers }),
      ]);

      const subsData = await subsRes.json();
      const plansData = await plansRes.json();

      if (subsData.subscriptions) setSubscriptions(subsData.subscriptions);
      if (plansData.plans) {
        // Clean list for the 5 distinct tiers
        const validIntervals = ['monthly', 'quarterly', 'biannual', 'yearly', 'profit_share'];
        const cleanPlans = plansData.plans.filter((p: SubscriptionPlan) =>
          validIntervals.includes(p.interval) &&
          p.id !== 'plan_starter' && p.id !== 'plan_pro' && p.id !== 'plan_elite'
        );
        setPlans(cleanPlans.length > 0 ? cleanPlans : plansData.plans);
      }
    } catch (err: any) {
      console.error('Error fetching admin billing data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionsAndPlans();
  }, []);

  const handleUpdateStatus = async (subId: string, newStatus: string) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/billing/admin/subscriptions/${subId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Status update failed');
      setNotification({ type: 'success', message: `Subscription ${subId} status changed to ${newStatus}` });
      fetchSubscriptionsAndPlans();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setSavingPlan(true);

    try {
      const token = getAuthToken();
      const res = await fetch(`/api/billing/admin/plans/${editingPlan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceUsd: Number(editingPlan.priceUsd),
          profitSharePct: Number(editingPlan.profitSharePct),
          maxMt5Accounts: Number(editingPlan.maxMt5Accounts),
          maxTradingVolumeLots: Number(editingPlan.maxTradingVolumeLots),
          name: editingPlan.name,
          description: editingPlan.description,
          isActive: editingPlan.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update plan');

      setNotification({
        type: 'success',
        message: `Plan "${editingPlan.name}" pricing and parameters updated in PostgreSQL.`,
      });
      setEditingPlan(null);
      fetchSubscriptionsAndPlans();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setSavingPlan(false);
    }
  };

  const filteredSubs = subscriptions.filter(s => {
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchesSearch = 
      (s.userName || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.userEmail || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.planName || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.id || '').toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const activeCount = subscriptions.filter(s => s.status === 'active').length;
  const totalMRR = subscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (s.priceUsd || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Subscriptions & Pricing Control</h1>
          <p className="text-xs text-slate-400">
            Live PostgreSQL customer subscription states, Stripe integration, and dynamic plan price configuration.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex text-xs">
            <button
              onClick={() => setActiveTab('subs')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'subs' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active Subscriptions ({subscriptions.length})
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-3.5 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'plans' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configurable Plans ({plans.length})</span>
            </button>
          </div>

          <button
            onClick={fetchSubscriptionsAndPlans}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh from database"
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

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Active Subscribers</span>
          <div className="font-mono text-2xl font-bold text-emerald-400">{activeCount} Clients</div>
          <span className="text-[11px] text-slate-400">Total in PostgreSQL: {subscriptions.length}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Total Active Plan Value</span>
          <div className="font-mono text-2xl font-bold text-white">
            ${totalMRR.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">Real-time database sum</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-xs text-slate-400 block mb-1">Configured Customer Plans</span>
          <div className="font-mono text-2xl font-bold text-amber-400">{plans.length} Tiers</div>
          <span className="text-[11px] text-slate-400 font-mono">Editable from admin panel</span>
        </div>
      </div>

      {activeTab === 'subs' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search user, email, plan, or subscription ID..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div className="flex gap-1.5">
              {(['all', 'active', 'past_due', 'canceled'] as const).map(st => (
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

          {/* Subscriptions Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
                  <tr>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Plan Name</th>
                    <th className="py-3 px-4">Rate (USD)</th>
                    <th className="py-3 px-4">Period End</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Stripe Ref</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredSubs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No subscriptions match the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSubs.map(s => (
                      <tr key={s.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-white block">{s.userName || 'Trader'}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{s.userEmail || s.userId}</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-200">
                          {s.planName}
                          {s.cancelAtPeriodEnd && (
                            <span className="block text-[10px] text-rose-400 font-mono">Cancels on renewal</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-200">
                          ${s.priceUsd || 0}.00
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400 text-xs">
                          {new Date(s.currentPeriodEnd).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                            s.status === 'active'
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                              : s.status === 'past_due'
                              ? 'bg-amber-950 text-amber-400 border-amber-800'
                              : 'bg-rose-950 text-rose-400 border-rose-800'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {s.stripeSubscriptionId ? (
                            <span title={s.stripeSubscriptionId}>{s.stripeSubscriptionId.slice(0, 14)}...</span>
                          ) : (
                            <span className="text-slate-600">Simulated / Internal</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 font-sans">
                            {s.status !== 'active' ? (
                              <button
                                onClick={() => handleUpdateStatus(s.id, 'active')}
                                className="px-2 py-1 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[11px]"
                              >
                                Activate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateStatus(s.id, 'canceled')}
                                className="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[11px]"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Configurable Plans & Pricing Tab */
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
            <Sliders className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block font-medium mb-0.5">Database-Backed Dynamic Plan Configuration</strong>
              Modifying prices or allowances here immediately persists to PostgreSQL. Changes reflect on the public pricing page and customer checkout instantly without rebuilding or hardcoding frontend code.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div
                key={plan.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-white text-base">{plan.name}</h3>
                      <span className="text-[11px] font-mono text-amber-400 uppercase">{plan.interval}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                      plan.isActive ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {plan.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">{plan.description}</p>

                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Fixed Rate</span>
                      <span className="font-mono font-bold text-white">${plan.priceUsd}.00 USD</span>
                    </div>
                    {plan.profitSharePct > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Profit Share</span>
                        <span className="font-mono font-bold text-emerald-400">{plan.profitSharePct}% Net Profit</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Max MT5 Accounts</span>
                      <span className="font-mono text-slate-200">{plan.maxMt5Accounts} Terminals</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Volume Limit</span>
                      <span className="font-mono text-slate-200">{plan.maxTradingVolumeLots} Lots/mo</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setEditingPlan({ ...plan })}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Edit Plan & Pricing</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePlan}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-white text-lg">Edit Plan: {editingPlan.name}</h3>
                <p className="text-xs text-slate-400">Persist new prices & limits to PostgreSQL</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Plan Display Name</label>
                <input
                  type="text"
                  value={editingPlan.name}
                  onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <textarea
                  value={editingPlan.description}
                  onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Price (USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editingPlan.priceUsd}
                    onChange={e => setEditingPlan({ ...editingPlan, priceUsd: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Profit Share (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={editingPlan.profitSharePct}
                    onChange={e => setEditingPlan({ ...editingPlan, profitSharePct: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Max MT5 Terminals</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editingPlan.maxMt5Accounts}
                    onChange={e => setEditingPlan({ ...editingPlan, maxMt5Accounts: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Max Volume (Lots)</label>
                  <input
                    type="number"
                    min="1"
                    max="5000"
                    value={editingPlan.maxTradingVolumeLots}
                    onChange={e => setEditingPlan({ ...editingPlan, maxTradingVolumeLots: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={editingPlan.isActive}
                  onChange={e => setEditingPlan({ ...editingPlan, isActive: e.target.checked })}
                  className="rounded border-slate-800 bg-slate-950 text-amber-600 focus:ring-0"
                />
                <label htmlFor="isActiveCheck" className="text-slate-300">
                  Plan is Active (visible to customers on public pricing & billing)
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingPlan}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{savingPlan ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
