import React, { useState, useEffect } from 'react';
import { User, MT5Account, Subscription } from '../../types/index.js';
import { 
  Users, 
  Search, 
  Filter, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Lock, 
  Server, 
  Layers, 
  CreditCard,
  UserCheck,
  AlertTriangle
} from 'lucide-react';

export const AdminUsersPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [globalManualCloseEnabled, setGlobalManualCloseEnabled] = useState<boolean>(false);
  const [isUpdatingGlobal, setIsUpdatingGlobal] = useState<boolean>(false);
  const [isUpdatingUserPermission, setIsUpdatingUserPermission] = useState<boolean>(false);

  const fetchGlobalSetting = () => {
    fetch('/api/admin/settings/manual-close', {
      headers: { Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}` },
    })
      .then(res => res.json())
      .then(data => {
        if (typeof data.globalManualTradeCloseEnabled === 'boolean') {
          setGlobalManualCloseEnabled(data.globalManualTradeCloseEnabled);
        }
      })
      .catch(() => {});
  };

  const fetchUsers = () => {
    fetch('/api/admin/users', {
      headers: { Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.users) setUsers(data.users);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchUsers();
    fetchGlobalSetting();
  }, []);

  const handleToggleGlobalManualClose = async () => {
    setIsUpdatingGlobal(true);
    const targetVal = !globalManualCloseEnabled;
    try {
      const res = await fetch('/api/admin/settings/manual-close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}`,
        },
        body: JSON.stringify({ enabled: targetVal, reason: 'Admin UI toggle' }),
      });
      const data = await res.json();
      if (res.ok) {
        setGlobalManualCloseEnabled(data.globalManualTradeCloseEnabled);
        setActionSuccess(`Global Manual Trade Close master switch turned ${targetVal ? 'ON (Active)' : 'OFF (Master Lock)'}`);
        fetchUsers();
        if (selectedUser) {
          setSelectedUser({
            ...selectedUser,
            effectiveManualClose: targetVal && Boolean(selectedUser.manualTradeCloseEnabled),
          });
        }
      }
    } catch {
      // ignore
    } finally {
      setIsUpdatingGlobal(false);
      setTimeout(() => setActionSuccess(null), 3500);
    }
  };

  const handleToggleUserManualClose = async (userId: string, currentVal: boolean) => {
    setIsUpdatingUserPermission(true);
    const targetVal = !currentVal;
    try {
      const res = await fetch(`/api/admin/users/${userId}/manual-close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}`,
        },
        body: JSON.stringify({ enabled: targetVal, reason: 'Admin per-customer permission toggle' }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionSuccess(`Manual Trade Close for this customer turned ${targetVal ? 'ON (Allowed)' : 'OFF (Disabled)'}`);
        fetchUsers();
        if (selectedUser?.id === userId) {
          setSelectedUser({
            ...selectedUser,
            manualTradeCloseEnabled: targetVal,
            effectiveManualClose: globalManualCloseEnabled && targetVal,
          });
        }
      }
    } catch {
      // ignore
    } finally {
      setIsUpdatingUserPermission(false);
      setTimeout(() => setActionSuccess(null), 3500);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await fetch(`/api/admin/users/${userId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}`,
      },
      body: JSON.stringify({ status: newStatus }),
    });
    setActionSuccess(`User status updated to ${newStatus.toUpperCase()}`);
    setTimeout(() => setActionSuccess(null), 3000);
    fetchUsers();
    if (selectedUser?.id === userId) {
      setSelectedUser({ ...selectedUser, status: newStatus });
    }
  };

  const filteredUsers = users.filter(u => {
    if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
    if (search && !u.email.toLowerCase().includes(search.toLowerCase()) && !`${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Customer Management & KYC Directory</h1>
          <p className="text-xs text-slate-400">
            Tenant-isolated client accounts, MT5 broker linkages, and subscription entitlements.
          </p>
        </div>
      </div>

      {/* Global Manual Trade Close Master Switch Banner */}
      <div className={`border rounded-2xl p-4 transition flex flex-wrap items-center justify-between gap-4 ${
        globalManualCloseEnabled
          ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
          : 'bg-slate-900 border-slate-800 text-slate-300'
      }`}>
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl border mt-0.5 ${
            globalManualCloseEnabled
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">Global Manual Trade Close</h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                globalManualCloseEnabled
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {globalManualCloseEnabled ? 'GLOBAL ON' : 'GLOBAL OFF (MASTER LOCK)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Master switch for allowing customers to manually close their own open trades.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">
            {globalManualCloseEnabled ? 'Per-Customer Permissions Active' : 'All Customer Closes Denied (Master Override)'}
          </span>
          <button
            type="button"
            disabled={isUpdatingGlobal}
            onClick={handleToggleGlobalManualClose}
            className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              globalManualCloseEnabled ? 'bg-amber-600' : 'bg-slate-700'
            } disabled:opacity-50`}
            role="switch"
            aria-checked={globalManualCloseEnabled}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                globalManualCloseEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center flex-wrap gap-3">
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by customer name or email..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
            >
              <option value="ALL">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="font-mono text-slate-400">
          Total Customers: <span className="font-bold text-white">{filteredUsers.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Table */}
        <div className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm ${selectedUser ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-4">Customer Name & Email</th>
                  <th className="py-3 px-4">MT5 Broker Account</th>
                  <th className="py-3 px-4">Subscription Plan</th>
                  <th className="py-3 px-4">Net P&L</th>
                  <th className="py-3 px-4">Manual Close</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No customer records match query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => {
                    const hasMt5 = u.mt5Account;
                    const isSelected = selectedUser?.id === u.id;
                    const effectiveClose = globalManualCloseEnabled && u.manualTradeCloseEnabled;
                    return (
                      <tr key={u.id} className={`hover:bg-slate-800/40 transition cursor-pointer ${isSelected ? 'bg-slate-800/60' : ''}`} onClick={() => setSelectedUser(u)}>
                        <td className="py-3 px-4">
                          <div className="font-sans font-bold text-slate-200">{u.firstName} {u.lastName}</div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {hasMt5 ? (
                            <span className="text-slate-300 font-mono text-[11px]">
                              {u.mt5Account.brokerName} ({u.mt5Account.loginId})
                            </span>
                          ) : (
                            <span className="text-slate-400">No MT5 Linked</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-300">
                          {u.subscription ? u.subscription.planName : 'Free Trial'}
                        </td>
                        <td className="py-3 px-4 text-emerald-400 font-bold">
                          +${u.mt5Account ? (u.mt5Account.equity - u.mt5Account.balance >= 0 ? '+' : '') + (u.mt5Account.equity - u.mt5Account.balance).toFixed(2) : '0.00'}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            effectiveClose
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : u.manualTradeCloseEnabled
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {effectiveClose
                              ? 'Allowed'
                              : u.manualTradeCloseEnabled
                              ? 'User ON (Global Lock)'
                              : 'Disabled'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.status === 'active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleToggleStatus(u.id, u.status)}
                            className={`px-2.5 py-1 rounded text-[11px] font-sans font-medium transition ${
                              u.status === 'active'
                                ? 'bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800'
                                : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-800'
                            }`}
                          >
                            {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected User Detail Pane (/admin/users/[id]) */}
        {selectedUser && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-white text-base">{selectedUser.firstName} {selectedUser.lastName}</h3>
                <span className="text-xs text-slate-400 font-mono">UID: {selectedUser.id}</span>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block text-[11px]">Primary Email</span>
                <span className="font-mono text-slate-200">{selectedUser.email}</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block text-[11px]">Connected MT5 Terminal</span>
                {selectedUser.mt5Account ? (
                  <div className="space-y-1 font-mono text-slate-200">
                    <div>Broker: {selectedUser.mt5Account.brokerName}</div>
                    <div>Server: {selectedUser.mt5Account.server}</div>
                    <div>Login: {selectedUser.mt5Account.loginId}</div>
                    <div>Balance: ${selectedUser.mt5Account.balance.toLocaleString()}</div>
                    <div>Equity: ${selectedUser.mt5Account.equity.toLocaleString()}</div>
                  </div>
                ) : (
                  <span className="text-slate-400">None connected</span>
                )}
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block text-[11px]">Active Plan & Billing</span>
                <span className="font-mono text-slate-200">
                  {selectedUser.subscription ? `${selectedUser.subscription.planName} ($${selectedUser.subscription.priceUsd}/mo)` : 'No active subscription'}
                </span>
              </div>

              {/* Customer Manual Trade Close Permission Control */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-white font-bold block text-xs">Manual Trade Close</span>
                    <span className="text-slate-400 block text-[11px] mt-0.5">
                      Allows this customer to fully close their own open trades.
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={isUpdatingUserPermission}
                    onClick={() => handleToggleUserManualClose(selectedUser.id, Boolean(selectedUser.manualTradeCloseEnabled))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      selectedUser.manualTradeCloseEnabled ? 'bg-amber-600' : 'bg-slate-700'
                    } disabled:opacity-50`}
                    role="switch"
                    aria-checked={Boolean(selectedUser.manualTradeCloseEnabled)}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        selectedUser.manualTradeCloseEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Effective Close Access:</span>
                  <span className={`font-bold ${
                    globalManualCloseEnabled && selectedUser.manualTradeCloseEnabled
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}>
                    {globalManualCloseEnabled && selectedUser.manualTradeCloseEnabled
                      ? 'ALLOWED (Full Close)'
                      : (!globalManualCloseEnabled ? 'BLOCKED (Global Switch OFF)' : 'BLOCKED (User Setting OFF)')}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => handleToggleStatus(selectedUser.id, selectedUser.status)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                {selectedUser.status === 'active' ? 'Suspend Customer Account' : 'Reactivate Customer Account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
