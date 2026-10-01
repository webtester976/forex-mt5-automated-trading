import React, { useState } from 'react';
import { Bell, Send, CheckCircle2, AlertTriangle, ShieldCheck, Users } from 'lucide-react';

export const AdminNotificationsPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [broadcastType, setBroadcastType] = useState<'system' | 'risk_warning' | 'market_event'>('system');
  const [targetAudience, setTargetAudience] = useState<'all' | 'active_subscribers' | 'vip'>('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sentSuccess, setSentSuccess] = useState(false);

  const [notificationHistory, setNotificationHistory] = useState([
    {
      id: 'notif_1',
      title: 'US CPI Release High-Vol Protocol Active',
      message: 'Widened slippage parameters active across EURUSD and GBPUSD during Bureau of Labor Statistics release.',
      audience: 'All Connected Traders',
      type: 'Risk Alert',
      date: '2 hours ago',
    },
    {
      id: 'notif_2',
      title: 'Scheduled MT5 Bridge Maintenance',
      message: 'Routine infrastructure optimization completed across London LD4 cross-connects with 0 downtime.',
      audience: 'All Users',
      type: 'System Notice',
      date: 'Yesterday',
    },
  ]);

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;

    const newNotif = {
      id: `notif_${Date.now()}`,
      title,
      message,
      audience: targetAudience === 'all' ? 'All Users' : 'Active Subscribers',
      type: broadcastType === 'risk_warning' ? 'Risk Alert' : 'System Notice',
      date: 'Just now',
    };

    setNotificationHistory([newNotif, ...notificationHistory]);
    setSentSuccess(true);
    setTitle('');
    setMessage('');
    setTimeout(() => setSentSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Notification & Alert Center</h1>
        <p className="text-xs text-slate-400">Broadcast administrative notices, emergency risk alerts and market advisory messages to client portals</p>
      </div>

      {sentSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Broadcast dispatched successfully to active connected clients.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Broadcast Form */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-amber-400" />
            <span>Dispatch Broadcast</span>
          </h2>

          <form onSubmit={handleBroadcast} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Notification Category</label>
              <select
                value={broadcastType}
                onChange={e => setBroadcastType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="system">System Announcement</option>
                <option value="risk_warning">Risk / Circuit-Breaker Warning</option>
                <option value="market_event">High-Impact Market Advisory</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Audience</label>
              <select
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Registered Customers</option>
                <option value="active_subscribers">Active Paid Subscribers Only</option>
                <option value="vip">Enterprise VIP Tier</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Subject Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. FOMC Volatility Safety Notice"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Message Content</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Write advisory notice details..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition"
            >
              <Send className="w-4 h-4" />
              <span>Broadcast Now</span>
            </button>
          </form>
        </div>

        {/* Broadcast History */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" />
            <span>Broadcast Audit Log</span>
          </h2>

          <div className="space-y-3">
            {notificationHistory.map(n => (
              <div key={n.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{n.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono">
                      {n.type}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{n.date}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400">{n.message}</p>
                <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                  <Users className="w-3 h-3" />
                  <span>Audience: {n.audience}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
