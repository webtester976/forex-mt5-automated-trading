import React, { useState, useEffect } from 'react';
import { SupportTicket } from '../../types/index.js';
import { MessageSquare, Send, CheckCircle2, Clock } from 'lucide-react';

export const AdminSupportPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [reply, setReply] = useState('');

  const fetchTickets = () => {
    fetch('/api/admin/support', {
      headers: { Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.tickets) {
          setTickets(data.tickets);
          if (!selectedTicket && data.tickets.length > 0) {
            setSelectedTicket(data.tickets[0]);
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !reply.trim()) return;

    await fetch(`/api/admin/support/${selectedTicket.id}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}`,
      },
      body: JSON.stringify({ message: reply }),
    });

    setReply('');
    fetchTickets();
  };

  const handleResolve = async (ticketId: string) => {
    await fetch(`/api/admin/support/${ticketId}/resolve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}` },
    });
    fetchTickets();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Support Desk & Incident Management</h1>
        <p className="text-xs text-slate-400">
          Customer support queues, technical inquiries, and VPS connection resolution.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket list */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">All Open Inquiries</h3>
            <span className="text-xs font-mono text-amber-400">{tickets.length} Total</span>
          </div>

          <div className="space-y-2">
            {tickets.map(t => {
              const isSelected = selectedTicket?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`w-full text-left p-3.5 rounded-xl border transition ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-600 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs truncate">{t.subject}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono uppercase font-semibold ${
                      t.status === 'open' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>{t.userName || 'Client'}</span>
                    <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected ticket thread */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-6">
          {selectedTicket ? (
            <>
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedTicket.subject}</h2>
                    <span className="text-xs text-slate-400 font-mono">
                      Client: {selectedTicket.userName} • ID: {selectedTicket.id}
                    </span>
                  </div>
                  <button
                    onClick={() => handleResolve(selectedTicket.id)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                  >
                    Mark Resolved
                  </button>
                </div>

                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {selectedTicket.messages.map((m: any, idx: number) => {
                    const isClient = m.senderRole === 'customer';
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1 ${
                          isClient
                            ? 'bg-slate-950 border-slate-800 mr-6 text-slate-200'
                            : 'bg-amber-950/30 border-amber-900/60 ml-6 text-amber-100'
                        }`}
                      >
                        <div className="flex justify-between font-mono text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-300">{m.senderName} ({m.senderRole})</span>
                          <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p>{m.message}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleAdminReply} className="pt-4 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Type official admin reply to customer..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-20 text-slate-400">Select an inquiry to view dialogue.</div>
          )}
        </div>
      </div>
    </div>
  );
};
