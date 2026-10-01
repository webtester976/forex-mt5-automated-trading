import React from 'react';
import { UserPlus, CreditCard, Server, BarChart3, CheckCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export const HowItWorksPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const steps = [
    {
      step: '01',
      title: 'Create Your Account',
      description: 'Register with your email and basic details. Immediate access to your client dashboard shell with full transparency.',
      icon: UserPlus,
      details: ['Takes under 60 seconds', 'Zero deposit required to explore', 'Two-factor authentication ready'],
    },
    {
      step: '02',
      title: 'Choose a Subscription Plan',
      description: 'Select a monthly, quarterly, annual, or profit-share tier tailored to your account balance and risk preferences.',
      icon: CreditCard,
      details: ['Starter, Pro Quant, or Institutional', '20% High-Water Mark Profit Share option', 'Cancel or change plans anytime'],
    },
    {
      step: '03',
      title: 'Securely Connect Your MT5 Account',
      description: 'Provide your MT5 Broker Server Name, Account Number, and Password. Our AES-256-GCM encryption layer immediately secures your credentials.',
      icon: Server,
      details: ['Compatible with any regulated MT5 broker', 'IC Markets, Pepperstone, FTMO, XM, etc.', 'No VPS setup or software download required'],
    },
    {
      step: '04',
      title: 'Algorithmic Execution & Live Telemetry',
      description: 'Our London Equinix LD4 execution engine monitors real-time market regimes. Signals are reconciled and executed automatically with strict stop losses.',
      icon: BarChart3,
      details: ['Live floating P&L and trade cards', 'Custom drawdown & lot size limits', 'Manual kill switch & emergency close at your fingertips'],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="text-xs uppercase font-mono font-semibold tracking-wider text-blue-400">Onboarding Process</span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white">How AURAMT5 Automates Your Trading</h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Four straightforward steps from account creation to institutional algorithmic execution on your own broker account.
        </p>
      </div>

      <div className="space-y-8">
        {steps.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={item.step} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-slate-700 transition">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center font-mono font-bold text-lg shrink-0">
                  {item.step}
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{item.title}</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="w-full md:w-auto bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 min-w-[240px] space-y-2 text-xs">
                {item.details.map((d, dIdx) => (
                  <div key={dIdx} className="flex items-center gap-2 text-slate-400">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-4">
        <button
          onClick={() => onNavigate('/signup')}
          className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-xl shadow-blue-600/25 transition inline-flex items-center gap-2"
        >
          <span>Connect Your MT5 Account Now</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
