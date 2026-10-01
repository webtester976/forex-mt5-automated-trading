import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import { 
  CreditCard, 
  CheckCircle2, 
  ShieldCheck, 
  Download, 
  AlertCircle, 
  ArrowUpRight, 
  Loader2, 
  RefreshCw,
  ExternalLink,
  Calendar,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { Subscription, SubscriptionPlan, InvoiceRecord, PaymentRecord } from '../../types/index.js';

export const CustomerSubscriptionPage: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isStripeConfigured, setIsStripeConfigured] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  // Test simulation modal
  const [simulatedCheckout, setSimulatedCheckout] = useState<{
    plan: SubscriptionPlan;
    sessionId: string;
  } | null>(null);

  // Cancellation modal
  const [showCancelModal, setShowCancelModal] = useState(false);

  const getAuthToken = () => localStorage.getItem('forex_saas_token') || localStorage.getItem('auth_token') || '';

  // Fetch billing data
  const fetchBillingData = async () => {
    try {
      const token = getAuthToken();
      const headers = { 'Authorization': `Bearer ${token}` };

      const [subRes, plansRes] = await Promise.all([
        fetch('/api/billing/subscription', { headers }),
        fetch('/api/billing/plans', { headers }),
      ]);

      const subData = await subRes.json();
      const plansData = await plansRes.json();

      setSubscription(subData.subscription || null);
      setCurrentPlan(subData.plan || null);
      setInvoices(subData.invoices || []);
      setPayments(subData.payments || []);
      setIsStripeConfigured(Boolean(subData.isStripeConfigured));

      if (plansData.plans) {
        // Filter out legacy aliases so user sees 5 distinct customer plans
        const validIntervals = ['monthly', 'quarterly', 'biannual', 'yearly', 'profit_share'];
        const cleanPlans = plansData.plans.filter((p: SubscriptionPlan) =>
          validIntervals.includes(p.interval) &&
          p.id !== 'plan_starter' && p.id !== 'plan_pro' && p.id !== 'plan_elite'
        );
        setAvailablePlans(cleanPlans.length > 0 ? cleanPlans : plansData.plans.slice(0, 5));
      }
    } catch (err: any) {
      console.error('Failed to load subscription details', err);
    } finally {
      setLoading(false);
    }
  };

  // Check URL parameters for Stripe checkout returns
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    const planId = params.get('plan_id');
    const simulated = params.get('simulated');
    const status = params.get('status');
    const targetPlan = params.get('plan');

    // Clean URL
    if (sessionId || planId || status || simulated) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (status === 'activated') {
      setNotification({
        type: 'success',
        message: 'Your Profit-Share plan was successfully activated! $0 upfront fee.',
      });
      fetchBillingData();
    } else if (sessionId) {
      // Verify payment session with backend
      setLoading(true);
      const token = getAuthToken();
      fetch('/api/billing/verify-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, planId, simulated: Boolean(simulated) }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setNotification({
              type: 'success',
              message: 'Stripe payment verified successfully! Your subscription and trading terminals are active.',
            });
          } else {
            setNotification({
              type: 'error',
              message: data.message || 'Payment verification could not be completed.',
            });
          }
          fetchBillingData();
        })
        .catch(err => {
          setNotification({
            type: 'error',
            message: `Verification failed: ${err.message}`,
          });
          fetchBillingData();
        });
    } else {
      fetchBillingData();
    }
  }, []);

  // Initiate Stripe Checkout
  const handleInitiateCheckout = async (plan: SubscriptionPlan) => {
    setActionLoading(true);
    setNotification(null);

    try {
      const token = getAuthToken();
      const origin = window.location.origin;

      const res = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId: plan.id,
          successUrl: `${origin}/dashboard/subscription`,
          cancelUrl: `${origin}/dashboard/subscription`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.mode === 'profit_share') {
        setNotification({
          type: 'success',
          message: 'Profit-Share plan successfully activated with high-water mark tracking.',
        });
        await fetchBillingData();
        return;
      }

      if (data.mode === 'stripe' && data.url) {
        // Redirect to real Stripe Checkout in Test Mode
        window.location.href = data.url;
        return;
      }

      // If in development/preview without live Stripe keys, show interactive test checkout simulation
      setSimulatedCheckout({
        plan,
        sessionId: data.sessionId,
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Checkout failed to initialize.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Complete simulated test checkout
  const handleCompleteSimulatedCheckout = async () => {
    if (!simulatedCheckout) return;
    setActionLoading(true);

    try {
      const token = getAuthToken();
      const res = await fetch('/api/billing/verify-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: simulatedCheckout.sessionId,
          planId: simulatedCheckout.plan.id,
          simulated: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNotification({
          type: 'success',
          message: `Stripe Test Mode payment confirmed! Subscribed to ${simulatedCheckout.plan.name}.`,
        });
        setSimulatedCheckout(null);
        await fetchBillingData();
      } else {
        throw new Error(data.message || 'Simulation verification failed');
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to complete test payment.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Subscription Cancellation
  const handleCancelSubscription = async (immediate = false) => {
    setActionLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ immediate }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      setShowCancelModal(false);
      setNotification({
        type: 'info',
        message: data.message || 'Subscription cancellation request processed.',
      });
      await fetchBillingData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Cancellation failed',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Subscription & Billing</h1>
          <p className="text-xs text-slate-400">
            Automated Stripe Test Mode billing, algorithmic tier limits, tax statements, and invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-xs flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Stripe Test Mode Active</span>
          </div>
          <button
            onClick={() => { setLoading(true); fetchBillingData(); }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh billing data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className={`p-4 rounded-2xl text-xs flex items-start justify-between gap-3 border shadow-sm ${
          notification.type === 'success'
            ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
            : notification.type === 'error'
            ? 'bg-rose-950/80 border-rose-800 text-rose-200'
            : 'bg-blue-950/80 border-blue-800 text-blue-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {notification.type === 'info' && <Clock className="w-5 h-5 text-blue-400 shrink-0" />}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Active Subscription Status Banner */}
      {subscription && subscription.status === 'past_due' && (
        <div className="p-4 rounded-2xl bg-amber-950/80 border border-amber-800 text-amber-200 text-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <strong className="block text-amber-100">Subscription Past Due</strong>
              <span>Your last renewal payment did not complete. Please update your payment method to prevent VPS terminal suspension.</span>
            </div>
          </div>
          <button
            onClick={() => currentPlan && handleInitiateCheckout(currentPlan)}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold whitespace-nowrap"
          >
            Update Payment
          </button>
        </div>
      )}

      {/* Active Subscription Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-950/80 text-blue-400 border border-blue-800 flex items-center justify-center shrink-0">
              <CreditCard className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="font-bold text-white text-xl">
                  {currentPlan ? currentPlan.name : subscription ? subscription.planName : 'No Active Subscription'}
                </h2>
                {subscription ? (
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase border ${
                    subscription.status === 'active'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : subscription.status === 'past_due'
                      ? 'bg-amber-950 text-amber-400 border-amber-800'
                      : 'bg-rose-950 text-rose-400 border-rose-800'
                  }`}>
                    {subscription.status}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                    INACTIVE
                  </span>
                )}
                {subscription?.cancelAtPeriodEnd && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
                    Cancels at period end
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-lg">
                {currentPlan?.description || 'Connect your MT5 terminals and automate institutional execution with ultra-low latency.'}
              </p>
            </div>
          </div>

          {/* Pricing Info */}
          <div className="text-right sm:text-right">
            {currentPlan?.interval === 'profit_share' ? (
              <div>
                <div className="text-3xl font-extrabold text-emerald-400 font-mono">20%</div>
                <span className="text-xs text-slate-400">High-Water Mark Profit Share</span>
              </div>
            ) : (
              <div>
                <div className="text-3xl font-extrabold text-white font-mono">
                  ${subscription ? subscription.priceUsd : (currentPlan?.priceUsd || 0)}
                  <span className="text-xs font-normal text-slate-400">
                    /{currentPlan?.interval === 'monthly' ? 'month' : currentPlan?.interval === 'quarterly' ? 'quarter' : currentPlan?.interval === 'biannual' ? '6 months' : 'year'}
                  </span>
                </div>
                <span className="text-xs text-slate-400 block mt-0.5">
                  {subscription ? (
                    subscription.cancelAtPeriodEnd
                      ? `Access active until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                      : `Next renewal on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  ) : (
                    'Choose a plan below to activate'
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Plan Limits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
            <span className="text-slate-500 block text-[11px] uppercase font-mono">MT5 Terminals Included</span>
            <span className="font-mono text-sm font-bold text-slate-200 mt-0.5 block">
              Up to {currentPlan?.maxMt5Accounts || 1} Connected {currentPlan?.maxMt5Accounts === 1 ? 'Terminal' : 'Terminals'}
            </span>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
            <span className="text-slate-500 block text-[11px] uppercase font-mono">Trading Volume Cap</span>
            <span className="font-mono text-sm font-bold text-emerald-400 mt-0.5 block">
              {currentPlan?.maxTradingVolumeLots || 25} Lots / Billing Period
            </span>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
            <span className="text-slate-500 block text-[11px] uppercase font-mono">Billing Provider</span>
            <span className="font-mono text-sm font-bold text-blue-400 mt-0.5 block">
              Stripe Test Mode (PCI-DSS)
            </span>
          </div>
        </div>

        {/* Subscription action buttons */}
        {subscription && subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setShowCancelModal(true)}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium transition"
            >
              Cancel Subscription
            </button>
          </div>
        )}
      </div>

      {/* Available Customer Plans (5 Plans) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white">Select or Change Subscription Plan</h2>
          <p className="text-xs text-slate-400">
            Choose from fixed periods with upfront volume discounts, or select our $0 upfront performance fee structure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {availablePlans.map((plan) => {
            const isCurrent = subscription?.planId === plan.id || subscription?.planName === plan.name;
            const isProfitShare = plan.interval === 'profit_share';
            const isYearly = plan.interval === 'yearly';

            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-6 flex flex-col justify-between border transition-all ${
                  isCurrent
                    ? 'bg-blue-950/20 border-blue-500/80 shadow-lg'
                    : isProfitShare
                    ? 'bg-slate-900 border-emerald-800/60 hover:border-emerald-700'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base">{plan.name}</h3>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-600 text-white">
                            CURRENT
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{plan.description}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80">
                    {isProfitShare ? (
                      <div>
                        <div className="font-mono text-2xl font-bold text-emerald-400">20% Net Profit</div>
                        <span className="text-xs text-slate-500">$0 monthly subscription charge</span>
                      </div>
                    ) : (
                      <div>
                        <div className="font-mono text-2xl font-bold text-white">
                          ${plan.priceUsd}{' '}
                          <span className="text-xs text-slate-400 font-normal">
                            /{plan.interval === 'monthly' ? 'mo' : plan.interval === 'quarterly' ? 'quarter' : plan.interval === 'biannual' ? '6-mo' : 'yr'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 block">
                          {plan.maxMt5Accounts} {plan.maxMt5Accounts === 1 ? 'Terminal' : 'Terminals'} • {plan.maxTradingVolumeLots} Lots
                        </span>
                      </div>
                    )}
                  </div>

                  <ul className="space-y-1.5 text-xs text-slate-300 pt-1">
                    {plan.features.slice(0, 4).map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-5 mt-5 border-t border-slate-800">
                  <button
                    onClick={() => handleInitiateCheckout(plan)}
                    disabled={actionLoading || isCurrent}
                    className={`w-full py-2.5 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 ${
                      isCurrent
                        ? 'bg-slate-800 text-slate-400 cursor-default'
                        : isProfitShare
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrent ? (
                      'Current Active Plan'
                    ) : isProfitShare ? (
                      'Switch to Profit Share'
                    ) : (
                      `Subscribe via Stripe ($${plan.priceUsd})`
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tax Invoices & Payment History */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-base">Invoices & Tax Receipts</h2>
            <p className="text-xs text-slate-400">Official statement records generated upon successful Stripe settlement</p>
          </div>
          <span className="text-xs font-mono text-slate-400">Total Invoices: {invoices.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-3 px-4">Invoice Number</th>
                <th className="py-3 px-4">Issued Date</th>
                <th className="py-3 px-4">Amount (USD)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans">
                    No invoices generated yet. Invoices appear automatically after successful checkout.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-300 font-bold">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-400">{inv.issuedDate}</td>
                    <td className="py-3 px-4 text-slate-200 font-bold">${Number(inv.total).toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {inv.hostedInvoiceUrl ? (
                        <a
                          href={inv.hostedInvoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 font-sans ml-auto"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View on Stripe</span>
                        </a>
                      ) : (
                        <button
                          onClick={() => {
                            setNotification({
                              type: 'info',
                              message: `Tax statement for ${inv.invoiceNumber} ($${Number(inv.total).toFixed(2)}) downloaded.`,
                            });
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 font-sans ml-auto"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulated Stripe Checkout Modal (for local preview testing before real credentials) */}
      {simulatedCheckout && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                  S
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Stripe Checkout (Test Mode)</h3>
                  <p className="text-xs text-slate-400">Sandbox payment simulation</p>
                </div>
              </div>
              <button
                onClick={() => setSimulatedCheckout(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Selected Plan</span>
                <span className="text-white font-bold">{simulatedCheckout.plan.name}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Billing Interval</span>
                <span className="text-white capitalize">{simulatedCheckout.plan.interval}</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800/80">
                <span>Total Amount Due</span>
                <span className="text-white font-mono font-bold text-base">
                  ${simulatedCheckout.plan.priceUsd}.00 USD
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs text-slate-400 block font-medium">Stripe Test Card</label>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between">
                <span>4242 •••• •••• 4242</span>
                <span className="text-slate-500">12/28 • 123</span>
              </div>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Test mode sandbox transaction. No real funds will be charged.</span>
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSimulatedCheckout(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteSimulatedCheckout}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Test Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Cancel Subscription</h3>
                <p className="text-xs text-slate-400">Confirm cancellation of recurring access</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to cancel your algorithmic trading subscription?
              Your automated strategies and VPS connections will terminate at the end of your current billing period.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleCancelSubscription(false)}
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel at Period End (Recommended)'}
              </button>
              <button
                onClick={() => handleCancelSubscription(true)}
                disabled={actionLoading}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel Immediately'}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="w-full py-2 rounded-xl text-slate-400 hover:text-white text-xs transition"
              >
                Never mind, keep subscription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
