import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import { useTrading } from '../../contexts/TradingContext.js';
import { 
  TrendingUp, 
  LayoutDashboard, 
  Server, 
  Layers, 
  BarChart3, 
  CreditCard, 
  Sliders, 
  HelpCircle, 
  Bell, 
  User,
  LogOut, 
  Menu, 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

interface CustomerLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export const CustomerLayout: React.FC<CustomerLayoutProps> = ({ currentPath, onNavigate, children }) => {
  const { user, logout } = useAuth();
  const { mt5Account, openTrades, stats, platformKillSwitchActive } = useTrading();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { label: 'Trading Overview', path: '/dashboard', icon: LayoutDashboard },
    { label: 'MT5 Broker Link', path: '/dashboard/mt5', icon: Server, badge: mt5Account ? (mt5Account.connectionStatus === 'connected' ? 'LIVE' : 'DISCONNECTED') : 'LINK MT5' },
    { label: 'Live Trades', path: '/dashboard/trades', icon: Layers, count: openTrades.length },
    { label: 'Performance Analytics', path: '/dashboard/performance', icon: BarChart3 },
    { label: 'Subscription & Billing', path: '/dashboard/subscription', icon: CreditCard },
    { label: 'Risk & Safety Limits', path: '/dashboard/risk', icon: Sliders },
    { label: 'Alerts & Notifications', path: '/dashboard/notifications', icon: Bell },
    { label: 'Helpdesk & Support', path: '/dashboard/support', icon: HelpCircle },
    { label: 'Profile', path: '/dashboard/profile', icon: User },
  ];

  const floatingPnl = openTrades.reduce((sum, p) => sum + p.currentPnl, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Platform Emergency Kill Switch Banner if Active */}
      {platformKillSwitchActive && (
        <div className="bg-rose-950 border-b border-rose-800 text-rose-200 px-4 py-2 text-xs flex items-center justify-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
          <span>GLOBAL RISK ENGINE HALT ACTIVE: Quantitative algorithmic order execution is currently paused by platform Risk Officers. Existing open positions remain monitored with tight server stop-loss guards.</span>
        </div>
      )}

      {/* Top Customer Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 h-16 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div
            onClick={() => onNavigate('/dashboard')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white">
                AURA<span className="text-blue-500 font-mono">MT5</span>
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">Client Portal</span>
            </div>
          </div>
        </div>

        {/* Live MT5 Status & Balances Ticker */}
        <div className="hidden md:flex items-center gap-4">
          {mt5Account ? (
            <div className="flex items-center gap-3 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${mt5Account.connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                <span className="font-medium text-slate-300 font-mono">
                  {mt5Account.brokerName} ({mt5Account.loginId})
                </span>
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/60">
                  1.2ms
                </span>
              </div>

              <div className="h-3 w-px bg-slate-800"></div>

              <div className="flex items-center gap-3 font-mono text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Balance</span>
                  <span className="font-bold text-slate-200">${mt5Account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Equity</span>
                  <span className="font-bold text-blue-400">${mt5Account.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Floating P&L</span>
                  <span className={`font-bold ${floatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {floatingPnl >= 0 ? '+' : ''}${floatingPnl.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onNavigate('/dashboard/mt5')}
              className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Server className="w-3.5 h-3.5 text-blue-400" />
              <span>Connect MT5 Broker Account</span>
            </button>
          )}
        </div>

        {/* User profile & actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => onNavigate('/dashboard/notifications')}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500"></span>
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-blue-900/60 border border-blue-700/60 text-blue-300 flex items-center justify-center font-bold text-xs">
              {user?.firstName?.[0] || 'C'}
            </div>
            <div className="hidden sm:block text-left text-xs">
              <span className="font-semibold text-slate-200 block">{user?.firstName} {user?.lastName}</span>
              <span className="text-[10px] text-slate-400 font-mono capitalize">{user?.role}</span>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              onNavigate('/');
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
            title="Sign out of Client Portal"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transform transition-transform duration-200 lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between lg:hidden">
            <span className="font-bold text-sm text-slate-300">Navigation Menu</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map(item => {
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
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                      item.badge === 'LIVE' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}

                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold bg-blue-500 text-white">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Support Ticket Card in Sidebar */}
          <div className="p-3 m-3 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <ShieldAlert className="w-4 h-4 text-blue-400" />
              <span>Capital Guardian</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Automated stops running on London Equinix LD4 host. 0.8% max slippage ceiling enforced.
            </p>
          </div>
        </aside>

        {/* Content View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};
