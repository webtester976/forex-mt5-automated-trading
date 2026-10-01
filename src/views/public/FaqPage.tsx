import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export const FaqPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Do you hold or manage my trading capital?',
      a: 'No. AURAMT5 is strictly non-custodial software. You maintain 100% control of your trading funds inside your regulated MetaTrader 5 broker account (e.g. IC Markets, Pepperstone, XM, FTMO). We cannot withdraw, deposit, or touch your broker funds.',
    },
    {
      q: 'How does the software connect to my MT5 terminal?',
      a: 'We operate dedicated execution workers inside London Equinix LD4. When you provide your MT5 Server and Login ID in your encrypted client portal, our worker initializes a low-latency terminal handshake. Credentials are encrypted with hardware-level AES-256-GCM.',
    },
    {
      q: 'Do I need to keep my computer or laptop turned on 24/7?',
      a: 'No. Everything runs on our enterprise cloud VPS infrastructure in London. You can close your laptop, turn off your phone, and monitor performance from any browser at your convenience.',
    },
    {
      q: 'What happens if a major unexpected geopolitical news event occurs?',
      a: 'Our Pre-Trade Risk Engine includes an automated economic calendar filter. High-impact news releases (NFP, CPI, FOMC, rate announcements) automatically pause algorithm execution 30 minutes before and after the event. Furthermore, platform Risk Officers maintain a 24/7 emergency kill switch.',
    },
    {
      q: 'Can I manually close a trade or disconnect whenever I want?',
      a: 'Yes, always. Inside your Client Dashboard, every open trade features an instant "Close Trade" action. You also have an emergency "Emergency Stop" toggle that immediately terminates algorithm execution on your account.',
    },
    {
      q: 'Which brokers are supported?',
      a: 'Any regulated broker supporting MetaTrader 5 (MT5). Popular brokers among our clients include IC Markets, Pepperstone, Tickmill, XM Global, Exness, and proprietary trading firms such as FTMO and The Funded Trader.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center space-y-4">
        <span className="text-xs uppercase font-mono font-semibold tracking-wider text-blue-400">Knowledge Base</span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white">Frequently Asked Questions</h1>
        <p className="text-sm sm:text-base text-slate-300">
          Everything you need to know about our non-custodial MT5 trading automation platform.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((f, i) => {
          const isOpen = openIdx === i;
          return (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-slate-800/40 transition"
              >
                <span className="font-bold text-white text-sm sm:text-base">{f.q}</span>
                {isOpen ? <ChevronUp className="w-5 h-5 text-blue-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
              </button>

              {isOpen && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 pt-4">
                  {f.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
        <h3 className="font-bold text-white text-base">Have additional questions?</h3>
        <p className="text-xs text-slate-400">Our quantitative specialists are available 24/5 to assist you.</p>
        <button
          onClick={() => onNavigate('/contact')}
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
        >
          Contact Support Team
        </button>
      </div>
    </div>
  );
};
