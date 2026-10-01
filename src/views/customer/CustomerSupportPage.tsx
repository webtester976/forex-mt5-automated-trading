import React, { useState, useEffect } from 'react';
import { SupportTicket } from '../../types/index.js';
import { HelpCircle, MessageSquare, Plus, Send, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export const CustomerSupportPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newMessage, setNewMessage] = useState('');
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchTickets = () => {
    fetch('/api/customer/support', {
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

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/customer/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}`,
        },
        body: JSON.stringify({ subject: newSubject, message: newMessage, priority: newPriority }),
      });
      if (res.ok) {
        setNewTicketOpen(false);
        setNewSubject('');
        setNewMessage('');
        fetchTickets();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    try {
      const res = await fetch(`/api/customer/support/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}`,
        },
        body: JSON.stringify({ message: replyText }),
      });
      if (res.ok) {
        setReplyText('');
        fetchTickets();
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Helpdesk & Support Desk</h1>
          <p className="text-xs text-slate-400">
            Communicate directly with our quantitative risk engineers and VPS technical specialists.
          </p>
        </div>

        <button
          onClick={() => setNewTicketOpen(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Open Support Ticket</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Your Inquiries</h3>

          <div className="space-y-2">
            {tickets.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center">No open support tickets.</p>
            ) : (
              tickets.map(t => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      isSelected
                        ? 'bg-blue-950/50 border-blue-600 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-xs truncate">{t.subject}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold ${
                        t.status === 'open' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Priority: {t.priority}</span>
                      <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Ticket Thread */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-6">
          {selectedTicket ? (
            <>
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">{selectedTicket.subject}</h2>
                    <span className="text-xs text-slate-400 font-mono">Ticket ID: {selectedTicket.id}</span>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded font-mono font-semibold uppercase ${
                    selectedTicket.status === 'open' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    {selectedTicket.status}
                  </span>
                </div>

                {/* Message Thread */}
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {selectedTicket.messages.map((m, idx) => {
                    const isClient = m.senderRole === 'customer';
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-xl border text-xs leading-relaxed space-y-1 ${
                          isClient
                            ? 'bg-slate-950 border-slate-800 ml-6 text-slate-200'
                            : 'bg-blue-950/40 border-blue-900/60 mr-6 text-blue-100'
                        }`}
                      >
                        <div className="flex justify-between font-mono text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-300">{m.senderName} ({m.senderRole || m.senderType || 'support'})</span>
                          <span>{new Date(m.timestamp || m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p>{m.message}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reply Box */}
              <form onSubmit={handleReply} className="pt-4 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your response to support..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Reply</span>
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-20 text-slate-400 space-y-2">
              <MessageSquare className="w-10 h-10 mx-auto text-slate-400" />
              <p className="text-sm">Select a ticket from the left to view the communication thread.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {newTicketOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Submit Technical Support Ticket</h3>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  placeholder="e.g. Inquiring about slippage on gold during CPI"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="low">Low (General Inquiries)</option>
                  <option value="medium">Medium (Account/Strategy questions)</option>
                  <option value="high">High (Urgent MT5 connection issue)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Detailed Message</label>
                <textarea
                  rows={4}
                  required
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  placeholder="Please describe the issue, broker name, or trade ticket number..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setNewTicketOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
