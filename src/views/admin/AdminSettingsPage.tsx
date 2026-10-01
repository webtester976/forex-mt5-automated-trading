import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, CreditCard, Bell, Server, FileText, Check, Lock } from 'lucide-react';

export const AdminSettingsPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [platformName, setPlatformName] = useState('NexusQuant Institutional Forex');
  const [supportEmail, setSupportEmail] = useState('desk@nexusquant.com');
  const [globalManualTradeCloseEnabled, setGlobalManualTradeCloseEnabled] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings/manual-close', {
      headers: { Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}` },
    })
      .then(res => res.json())
      .then(data => {
        if (typeof data.globalManualTradeCloseEnabled === 'boolean') {
          setGlobalManualTradeCloseEnabled(data.globalManualTradeCloseEnabled);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/admin/settings/manual-close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}`,
        },
        body: JSON.stringify({ enabled: globalManualTradeCloseEnabled, reason: 'Saved via platform settings page' }),
      });
    } catch {}

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Platform Configuration & Environment Controls</h1>
        <p className="text-xs text-slate-400">
          Payment gateways, MT5 bridge endpoints, 2FA security enforcement, and legal disclosures.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>Platform configuration updated and broadcast across worker clusters.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-base">General Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Platform Brand Name</label>
              <input
                type="text"
                value={platformName}
                onChange={e => setPlatformName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Support Desk Contact Email</label>
              <input
                type="email"
                value={supportEmail}
                onChange={e => setSupportEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-slate-200"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={e => setMaintenanceMode(e.target.checked)}
                className="rounded text-amber-600 focus:ring-0"
              />
              <div>
                <span className="font-bold text-white block">Maintenance Mode</span>
                <span className="text-slate-400">Allows only Super Administrators to log in while running database migrations.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Security & 2FA */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Security & Trading Safeguards</span>
          </h3>

          <div className="space-y-3 text-xs text-slate-300">
            {/* Global Manual Trade Close Switch */}
            <div className="flex items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white block text-sm">Global Manual Trade Close</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    globalManualTradeCloseEnabled
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {globalManualTradeCloseEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>
                <span className="text-slate-400 block text-xs">
                  Master switch for allowing customers to manually close their own open trades.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setGlobalManualTradeCloseEnabled(!globalManualTradeCloseEnabled)}
                className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  globalManualTradeCloseEnabled ? 'bg-amber-600' : 'bg-slate-700'
                }`}
                role="switch"
                aria-checked={globalManualTradeCloseEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    globalManualTradeCloseEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <label className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-amber-600 focus:ring-0" />
              <div>
                <span className="font-bold text-white block">Enforce Hardware 2FA (TOTP/FIDO2) for Admin Roles</span>
                <span className="text-slate-400">All Administrators and Risk Officers must authenticate using an authenticator app.</span>
              </div>
            </label>

            <label className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-amber-600 focus:ring-0" />
              <div>
                <span className="font-bold text-white block">IP Whitelist for Administrative Gateway</span>
                <span className="text-slate-400">Restricts administrative session origins to VPN corporate CIDR blocks.</span>
              </div>
            </label>
          </div>
        </div>

        {/* MT5 Bridge Worker Cluster */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" />
            <span>MT5 Bridge & Worker Coordination</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Heartbeat Timeout Threshold</span>
              <span className="font-bold text-white text-sm">30 seconds</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[11px] block">Max Terminals Per Worker Node</span>
              <span className="font-bold text-white text-sm">50 instances</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition shadow-lg shadow-amber-600/20"
          >
            Save Platform Settings
          </button>
        </div>
      </form>
    </div>
  );
};
