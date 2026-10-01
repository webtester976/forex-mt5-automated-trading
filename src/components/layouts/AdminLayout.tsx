import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import { 
  ShieldAlert, 
  Users, 
  Server, 
  Layers, 
  CreditCard, 
  DollarSign,
  Cpu, 
  AlertTriangle, 
  Share2, 
  HelpCircle, 
  FileText, 
  Activity, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  LayoutDashboard,
  Lock,
  Power,
  BarChart3,
  Bell
} from 'lucide-react';

interface AdminLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ currentPath, onNavigate, children }) => {
  const { user, isAdmin, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalKillSwitchActive, setGlobalKillSwitchActive] = useState(false);
  const [killSwitchConfirmOpen, setKillSwitchConfirmOpen] = useState(false);

  // Poll kill switch status
  React.useEffect(() => {
    fetch('/api/admin/risk', {
      headers: { Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}` },
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.killSwitches) {
          setGlobalKillSwitchActive(data.killSwitches.globalKillSwitch);
        }
      })
      .catch(() => {});
  }, []);

  const toggleGlobalKillSwitch = async (activate: boolean) => {
    try {
      const res = await fetch('/api/admin/risk/kill-switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}`,
        },
        body: JSON.stringify({
          scope: 'global',
          active: activate,
          reason: activate ? 'Immediate manual administrator kill-switch engagement' : 'Normal trading operations resumed by admin',
        }),
      });
      if (res.ok) {
        setGlobalKillSwitchActive(activate);
        setKillSwitchConfirmOpen(false);
      }
    } catch (err) {
      console.error('Kill switch error:', err);
    }
  };

  const adminNav = [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'MT5 Accounts', path: '/admin/mt5-accounts', icon: Server },
    { label: 'Trades', path: '/admin/trades', icon: Layers },
    { label: 'Subscriptions', path: '/admin/subscriptions', icon: CreditCard },
    { label: 'Payments', path: '/admin/payments', icon: DollarSign },
    { label: 'Algorithms', path: '/admin/algorithms', icon: Cpu },
    { label: 'Risk', path: '/admin/risk', icon: ShieldAlert, badge: globalKillSwitchActive ? 'HALTED' : undefined },
    { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
    { label: 'Notifications', path: '/admin/notifications', icon: Bell },
    { label: 'Support', path: '/admin/support', icon: HelpCircle },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: FileText },
    { label: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Administrative Security Header */}
      <div className="bg-amber-950/80 border-b border-amber-800/80 text-amber-200 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between gap-2 font-mono">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold tracking-wider">RESTRICTED ADMINISTRATIVE SUITE</span>
          <span className="hidden sm:inline text-amber-400/80">|</span>
          <span className="text-amber-300">Server-Side RBAC Enforced: {user?.role.toUpperCase()}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Global Kill Switch:</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${globalKillSwitchActive ? 'bg-rose-900 text-rose-200 animate-pulse' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'}`}>
              {globalKillSwitchActive ? 'HALTED (ACTIVE)' : 'STANDBY (NORMAL)'}
            </span>
          </div>

          <button
            onClick={() => setKillSwitchConfirmOpen(true)}
            className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 ${
              globalKillSwitchActive
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
            }`}
          >
            <Power className="w-3 h-3" />
            <span>{globalKillSwitchActive ? 'Resume Trading' : 'Engage Emergency Halt'}</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Bar */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 h-16 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div
            onClick={() => onNavigate('/admin')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-600/30">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white">
                AURA<span className="text-amber-500 font-mono">ADMIN</span>
              </span>
              <span className="text-[10px] text-amber-400 block font-mono">Operations Console</span>
            </div>
          </div>
        </div>

        {/* Right Info */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('/dashboard')}
            className="hidden sm:inline-flex text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            Switch to Client View
          </button>

          <div className="flex items-center gap-2 pl-3 border-l border-slate-800 text-xs">
            <div className="w-8 h-8 rounded-full bg-amber-950 border border-amber-700 text-amber-300 flex items-center justify-center font-bold">
              {user?.firstName?.[0] || 'A'}
            </div>
            <div className="hidden sm:block text-left">
              <span className="font-semibold text-slate-200 block">{user?.firstName} {user?.lastName}</span>
              <span className="text-[10px] text-amber-400 font-mono">{user?.role}</span>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              onNavigate('/');
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
            title="Sign out of Administrative Console"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Admin Content with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transform transition-transform duration-200 lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4 border-b border-slate-800 flex items-center justify-between lg:hidden">
            <span className="font-bold text-sm text-slate-300">Admin Modules</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {adminNav.map(item => {
              const active = currentPath === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    onNavigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                    active
                      ? 'bg-amber-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-rose-900 text-rose-200 border border-rose-700 animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* View Surface */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Emergency Kill Switch Confirmation Modal */}
      {killSwitchConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-7 h-7 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-white">
                  {globalKillSwitchActive ? 'Resume Global Trading Operations?' : 'ENGAGE GLOBAL EMERGENCY KILL SWITCH?'}
                </h3>
                <p className="text-xs text-rose-300">High-Impact Platform Risk Command</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {globalKillSwitchActive
                ? 'Disengaging the global kill switch will permit algorithmic execution workers across Equinix LD4/NY4/TY3 to accept new customer trading signals.'
                : 'Engaging the global kill switch will INSTANTLY block all trading algorithms from executing any new orders across all customer MT5 terminals. All open positions will maintain active broker stop losses.'}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setKillSwitchConfirmOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => toggleGlobalKillSwitch(!globalKillSwitchActive)}
                className={`px-5 py-2 rounded-lg text-xs font-bold text-white transition ${
                  globalKillSwitchActive ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {globalKillSwitchActive ? 'Confirm Resume' : 'CONFIRM EMERGENCY HALT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
