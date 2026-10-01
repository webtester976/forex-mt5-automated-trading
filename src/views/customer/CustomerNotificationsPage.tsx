import React, { useState, useEffect } from 'react';
import { Notification } from '../../types/index.js';
import { Bell, CheckCircle2, AlertTriangle, ShieldAlert, Layers, Check } from 'lucide-react';

export const CustomerNotificationsPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'trade' | 'risk' | 'account' | 'system'>('all');

  const fetchNotifs = () => {
    fetch('/api/customer/notifications', {
      headers: { Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.notifications) setNotifications(data.notifications);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const markAsRead = async (id: string) => {
    await fetch(`/api/customer/notifications/${id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}` },
    });
    setNotifications(notifications.map(n => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllAsRead = async () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const filtered = notifications.filter(n => (typeFilter === 'all' ? true : n.type === typeFilter));

  const getIcon = (type: string) => {
    switch (type) {
      case 'trade':
        return <Layers className="w-4 h-4 text-blue-400" />;
      case 'risk':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'account':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Alerts & System Notifications</h1>
          <p className="text-xs text-slate-400">
            Real-time trade fills, pre-trade risk engine alerts, and terminal connectivity notices.
          </p>
        </div>

        <button
          onClick={markAllAsRead}
          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Mark All as Read</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex flex-wrap gap-1 text-xs w-fit">
        {(['all', 'trade', 'risk', 'account', 'system'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg capitalize font-medium transition ${
              typeFilter === t ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t} Alerts
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-xs">
            No notifications found in this category.
          </div>
        ) : (
          filtered.map(n => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition flex items-start justify-between gap-4 ${
                n.isRead
                  ? 'bg-slate-950/60 border-slate-800/80 text-slate-400'
                  : 'bg-slate-900 border-slate-700/80 text-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">{n.title}</span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {n.type}
                    </span>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                  <span className="text-[10px] text-slate-400 font-mono block">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {!n.isRead && (
                <button
                  onClick={() => markAsRead(n.id)}
                  className="text-[11px] text-blue-400 hover:text-blue-300 whitespace-nowrap font-medium"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
