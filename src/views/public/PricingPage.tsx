import React, { useState, useEffect } from 'react';
import { Check, ShieldCheck, Zap, ArrowRight, HelpCircle, Sparkles, Percent, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.js';
import { SubscriptionPlan } from '../../types/index.js';

export const PricingPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { isAuthenticated } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState<'all' | 'monthly' | 'quarterly' | 'biannual' | 'yearly' | 'profit_share'>('all');

  useEffect(() => {
    fetch('/api/billing/plans')
      .then(res => res.json())
      .then(data => {
        if (data.plans && data.plans.length > 0) {
          // Filter to the 5 distinct customer plans
          const validIntervals = ['monthly', 'quarterly', 'biannual', 'yearly', 'profit_share'];
          const filtered = data.plans.filter((p: SubscriptionPlan) => 
            validIntervals.includes(p.interval) &&
            p.id !== 'plan_starter' && p.id !== 'plan_pro' && p.id !== 'plan_elite'
          );
          setPlans(filtered.length > 0 ? filtered : data.plans.slice(0, 5));
        }
      })
      .catch(() => {
        // Fallback plans if server is temporarily unreachable
        setPlans([
          {
            id: 'plan_monthly',
            code: 'MONTHLY_PLAN',
            name: 'Monthly Quant Plan',
            description: 'Full automated execution on retail and prop accounts with 30-day flexibility.',
            interval: 'monthly',
            priceUsd: 99,
            profitSharePct: 0,
            maxMt5Accounts: 1,
            maxTradingVolumeLots: 25,
            features: [
              '1 Connected MT5 Account',
              'Alpha Trend Falcon Strategy',
              'Automated Daily Risk Stop-Loss',
              'Standard Execution Speed (London VPS)',
              'Daily Telegram Performance Reports',
              'No lock-in contract, cancel anytime',
            ],
            isActive: true,
          },
          {
            id: 'plan_quarterly',
            code: 'QUARTERLY_3M_PLAN',
            name: '3-Month Quant Plan',
            description: 'Quarterly commitment with 10% discount for consistent algorithmic compounding.',
            interval: 'quarterly',
            priceUsd: 269,
            profitSharePct: 0,
            maxMt5Accounts: 2,
            maxTradingVolumeLots: 50,
            features: [
              'Up to 2 MT5 Accounts (Demo & Live)',
              'Alpha Trend Falcon + Breakout Matrix',
              'Priority Equinix LD4 Sub-Millisecond VPS',
              'Automated Drawdown Guardian',
              'Instant Telegram Signals & Alerts',
              'Saves ~10% vs monthly billing',
            ],
            isActive: true,
          },
          {
            id: 'plan_biannual',
            code: 'BIANNUAL_6M_PLAN',
            name: '6-Month Quant Plan',
            description: 'Semi-annual portfolio allocation with advanced cross-market risk management.',
            interval: 'biannual',
            priceUsd: 499,
            profitSharePct: 0,
            maxMt5Accounts: 4,
            maxTradingVolumeLots: 100,
            features: [
              'Up to 4 MT5 Accounts',
              'All 3 Core Strategies Active',
              'Equinix LD4 Cross-Connect VPS',
              'Custom Risk Ceiling & Position Sizing Controls',
              'Multi-symbol correlation filter',
              'Saves ~16% vs monthly billing',
            ],
            isActive: true,
          },
          {
            id: 'plan_yearly',
            code: 'YEARLY_ANNUAL_PLAN',
            name: 'Yearly Institutional Plan',
            description: 'Maximum annual savings for high-capital traders, hedge accounts, and prop managers.',
            interval: 'yearly',
            priceUsd: 899,
            profitSharePct: 0,
            maxMt5Accounts: 10,
            maxTradingVolumeLots: 500,
            features: [
              'Up to 10 MT5 Accounts',
              'Dedicated VPS Worker Node per account',
              'Zero-Latency Cross-Connect in Equinix NY4/LD4',
              'Custom Risk Manager API & Kill-Switch Webhooks',
              'Multi-broker Aggregation & Copier Support',
              'Direct 24/7 Access to Quant Risk Lead',
              'Maximum 25% savings vs monthly billing',
            ],
            isActive: true,
          },
          {
            id: 'plan_profit_share',
            code: 'PERFORMANCE_PROFIT_SHARE',
            name: 'High-Water Mark Profit Share',
            description: '$0 upfront fee. We only succeed when your trading balance achieves new net profits.',
            interval: 'profit_share',
            priceUsd: 0,
            profitSharePct: 20,
            maxMt5Accounts: 2,
            maxTradingVolumeLots: 100,
            features: [
              'Zero Upfront Subscription Fee',
              '20% Monthly High-Water Mark Performance Fee',
              'Institutional Grade Algorithm Allocation',
              'Transparent Audit Statements & Invoicing',
              'Strict Drawdown Protection & Stop-Loss Safeguards',
            ],
            isActive: true,
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    localStorage.setItem('selected_plan', plan.id);
    if (isAuthenticated) {
      onNavigate(`/dashboard/subscription?plan=${plan.id}`);
    } else {
      onNavigate(`/signup?plan=${plan.id}`);
    }
  };

  const visiblePlans = selectedCycle === 'all'
    ? plans
    : plans.filter(p => p.interval === selectedCycle);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800 text-blue-400 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Configurable Institutional Pricing</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          Transparent, Predictable Algorithmic Access
        </h1>
        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Select from flexible fixed commitments (1, 3, 6, or 12 months) or choose our $0 upfront performance profit-share model. Billed securely via Stripe Test Mode.
        </p>

        {/* Filter Tabs */}
        <div className="pt-4 flex justify-center">
          <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 flex flex-wrap gap-1 shadow-inner">
            <button
              onClick={() => setSelectedCycle('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${selectedCycle === 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              All Plans (5)
            </button>
            <button
              onClick={() => setSelectedCycle('monthly')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${selectedCycle === 'monthly' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedCycle('quarterly')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${selectedCycle === 'quarterly' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              3-Month (-10%)
            </button>
            <button
              onClick={() => setSelectedCycle('biannual')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${selectedCycle === 'biannual' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              6-Month (-16%)
            </button>
            <button
              onClick={() => setSelectedCycle('yearly')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${selectedCycle === 'yearly' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Yearly (-25%)
            </button>
            <button
              onClick={() => setSelectedCycle('profit_share')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${selectedCycle === 'profit_share' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-400 hover:text-white'}`}
            >
              Profit-Share ($0)
            </button>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          Loading live subscription plans from database...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visiblePlans.map((plan) => {
            const isProfitShare = plan.interval === 'profit_share';
            const isYearly = plan.interval === 'yearly';
            const isQuarterly = plan.interval === 'quarterly';

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-7 flex flex-col justify-between transition-all duration-200 ${
                  isProfitShare
                    ? 'bg-gradient-to-b from-slate-900 to-emerald-950/30 border-2 border-emerald-500/50 shadow-xl'
                    : isYearly
                    ? 'bg-gradient-to-b from-slate-900 to-blue-950/40 border-2 border-blue-500 shadow-xl'
                    : 'bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-lg'
                }`}
              >
                {/* Badge */}
                {isYearly && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-blue-600 text-white font-mono text-[11px] font-bold tracking-wider uppercase shadow-md">
                    Best Value • 25% Off
                  </div>
                )}
                {isProfitShare && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-emerald-600 text-white font-mono text-[11px] font-bold tracking-wider uppercase shadow-md">
                    No Upfront Fee
                  </div>
                )}
                {isQuarterly && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[11px] font-bold tracking-wider uppercase">
                    Popular Retail
                  </div>
                )}

                <div className="space-y-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">{plan.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">{plan.description}</p>
                    </div>
                  </div>

                  {/* Price Block */}
                  <div className="pt-2 border-t border-slate-800/80">
                    {isProfitShare ? (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-extrabold text-emerald-400 font-mono">20%</span>
                          <span className="text-xs text-slate-400">of net profit</span>
                        </div>
                        <span className="text-xs text-emerald-400/80 font-medium block mt-0.5">
                          $0 upfront subscription fee
                        </span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-extrabold text-white font-mono">${plan.priceUsd}</span>
                          <span className="text-xs text-slate-400">
                            /{plan.interval === 'monthly' ? 'month' : plan.interval === 'quarterly' ? '3 months' : plan.interval === 'biannual' ? '6 months' : 'year'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 block mt-0.5">
                          {plan.interval === 'monthly' && 'Flexible 30-day billing cycle'}
                          {plan.interval === 'quarterly' && '$89.66/month equivalent'}
                          {plan.interval === 'biannual' && '$83.16/month equivalent'}
                          {plan.interval === 'yearly' && '$74.91/month equivalent'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Limits summary */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 px-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-mono">MT5 Accounts</span>
                      <span className="font-semibold text-slate-200">{plan.maxMt5Accounts} {plan.maxMt5Accounts === 1 ? 'Terminal' : 'Terminals'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-mono">Volume Cap</span>
                      <span className="font-semibold text-slate-200">{plan.maxTradingVolumeLots} Lots/mo</span>
                    </div>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-2 text-xs text-slate-300 pt-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Call to action */}
                <div className="pt-6 mt-6 border-t border-slate-800">
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-3 px-4 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
                      isProfitShare
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : isYearly
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    <span>{isProfitShare ? 'Activate Profit-Share Plan' : 'Select Plan & Checkout'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <p className="text-[10px] text-slate-500 text-center mt-2">
                    {isProfitShare ? 'High-Water Mark monthly settlement' : 'Stripe Test Mode • Cancel anytime in portal'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Feature & Security Assurance Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6">
        <h2 className="text-xl font-bold text-white text-center">Institutional Grade Security & Compliance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block text-sm mb-1">PCI-DSS Compliant Billing</strong>
              Card details are tokenized directly with Stripe. No sensitive payment or PAN data ever touches our application servers.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block text-sm mb-1">Instant Webhook Provisioning</strong>
              Sub-second webhook processing idempotently activates trading capabilities and allocates VPS server slots the second checkout finishes.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Percent className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block text-sm mb-1">No Lock-in Contracts</strong>
              Pause or cancel recurring billing at any time from your customer billing settings with zero penalty fees.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
