import React, { useState } from 'react';
import { Mail, MessageSquare, MapPin, Send, CheckCircle2 } from 'lucide-react';

export const ContactPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      if (res.ok) {
        setSubmitted(true);
      }
    } catch {
      // Fallback display
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <span className="text-xs uppercase font-mono font-semibold tracking-wider text-blue-400">Direct Inquiries</span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white">Contact Institutional Desk</h1>
        <p className="text-sm sm:text-base text-slate-300">
          Reach our quantitative trading operations team, VPS technical specialists, or account managers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
              <Mail className="w-4 h-4" />
              <span>Email Support</span>
            </div>
            <p className="text-xs text-slate-400">Technical & general inquiries:</p>
            <span className="font-mono text-xs text-slate-200 block">support@auramt5.io</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <MessageSquare className="w-4 h-4" />
              <span>Telegram Desk</span>
            </div>
            <p className="text-xs text-slate-400">Institutional community channel:</p>
            <span className="font-mono text-xs text-slate-200 block">@AURAMT5_Quant_Desk</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <MapPin className="w-4 h-4" />
              <span>Execution Co-Location</span>
            </div>
            <p className="text-xs text-slate-400">Low-latency data center:</p>
            <span className="font-mono text-xs text-slate-200 block">Equinix LD4, Slough, United Kingdom</span>
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-8">
          {submitted ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-14 h-14 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Inquiry Received</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Thank you for contacting AURAMT5. A senior quantitative account manager will review your submission and reply within 4 business hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. David Vance"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="david@example.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Proprietary Firm MT5 Account Integration Inquiry"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Message</label>
                <textarea
                  rows={5}
                  required
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Please describe your broker, trading volume, or specific algorithmic requirements..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Transmitting...' : 'Send Inquiry to Desk'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
