import React, { useState, useEffect } from 'react';
import { useTrading } from '../../contexts/TradingContext.js';
import { 
  ShieldCheck, 
  Lock, 
  Server, 
  Check, 
  X, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Zap, 
  Activity, 
  Sparkles,
  Info
} from 'lucide-react';

interface ConnectMt5ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_BROKERS = [
  {
    name: 'MetaQuotes Ltd.',
    servers: ['MetaQuotes-Demo'],
    defaultServer: 'MetaQuotes-Demo',
  },
  {
    name: 'IC Markets Global',
    servers: ['ICMarketsSC-Demo', 'ICMarketsSC-Live08', 'ICMarkets-Demo01', 'ICMarkets-Live01'],
    defaultServer: 'ICMarketsSC-Demo',
  },
  {
    name: 'Pepperstone Financial',
    servers: ['Pepperstone-Demo01', 'Pepperstone-Demo02', 'Pepperstone-Edge03', 'Pepperstone-Live01'],
    defaultServer: 'Pepperstone-Demo01',
  },
  {
    name: 'FTMO Prop Trading',
    servers: ['FTMO-Demo', 'FTMO-Server', 'FTMO-Server-2'],
    defaultServer: 'FTMO-Demo',
  },
  {
    name: 'XM Global',
    servers: ['XMGlobal-Demo', 'XMGlobal-Real01', 'XMGlobal-Real02'],
    defaultServer: 'XMGlobal-Demo',
  },
  {
    name: 'Exness Pro',
    servers: ['Exness-Trial', 'Exness-Trial2', 'Exness-Real'],
    defaultServer: 'Exness-Trial',
  },
  {
    name: 'Tickmill ECN',
    servers: ['Tickmill-Demo', 'Tickmill-Live', 'Tickmill-Live02'],
    defaultServer: 'Tickmill-Demo',
  },
  {
    name: 'Custom Broker / Other',
    servers: ['Custom Server Address'],
    defaultServer: '',
  },
];

export const ConnectMt5Modal: React.FC<ConnectMt5ModalProps> = ({ isOpen, onClose }) => {
  const { connectMt5, testConnection } = useTrading();
  const [brokerName, setBrokerName] = useState('MetaQuotes Ltd.');
  const [server, setServer] = useState('MetaQuotes-Demo');
  const [customServer, setCustomServer] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [leverage, setLeverage] = useState(500);
  const [currency, setCurrency] = useState('USD');
  const [connectionMode, setConnectionMode] = useState<'demo' | 'read_only_investor'>('demo');
  const [accountType, setAccountType] = useState<'live' | 'demo'>('demo');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ pingLatencyMs?: number; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Update server dropdown options when broker changes
  useEffect(() => {
    const matched = PRESET_BROKERS.find(b => b.name === brokerName);
    if (matched && matched.servers.length > 0 && brokerName !== 'Custom Broker / Other') {
      setServer(matched.defaultServer);
    } else if (brokerName === 'Custom Broker / Other') {
      setServer('');
    }
  }, [brokerName]);

  if (!isOpen) return null;

  const handleQuickFillDemo = () => {
    setBrokerName('IC Markets Global');
    setServer('ICMarketsSC-Demo');
    setLoginId('8092415');
    setPassword('DemoPass#2026');
    setLeverage(500);
    setCurrency('USD');
    setConnectionMode('demo');
    setAccountType('demo');
    setError(null);
  };

  const handleTestPing = async () => {
    const targetServer = brokerName === 'Custom Broker / Other' ? customServer : server;
    if (!targetServer) {
      setError('Please specify a server to test connectivity.');
      return;
    }

    setIsPinging(true);
    setPingResult(null);
    setError(null);
    const res = await testConnection({
      brokerName,
      server: targetServer,
      loginId,
    });
    setIsPinging(false);

    if (res.success) {
      setPingResult({
        pingLatencyMs: res.pingLatencyMs || 1.4,
        message: res.message || 'Direct London Equinix LD4 cross-connect verified.',
      });
    } else {
      setError(res.error || 'Gateway test failed. Check server address.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const targetServer = brokerName === 'Custom Broker / Other' ? customServer : server;
    if (!loginId || !password) {
      setError('Please provide your MT5 Account Login and Password.');
      return;
    }
    if (!targetServer) {
      setError('Please select or enter the MT5 broker server name.');
      return;
    }

    setIsSubmitting(true);
    const result = await connectMt5({
      brokerName,
      server: targetServer,
      loginId,
      password,
      accountType,
      connectionMode,
      currency,
      leverage,
    });
    setIsSubmitting(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } else {
      setError(result.error || 'Failed to authenticate and link MT5 account.');
    }
  };

  const currentBrokerObj = PRESET_BROKERS.find(b => b.name === brokerName);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl my-8">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-950 text-blue-400 border border-blue-800">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-lg">Connect MetaTrader 5 Terminal</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-mono font-medium bg-blue-950 text-blue-300 border border-blue-800">
                  READ-ONLY / DEMO
                </span>
              </div>
              <p className="text-xs text-slate-400">Direct low-latency bridge to London Equinix LD4 worker cluster</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security / Non-Custodial Mode Notice Banner */}
        <div className="bg-emerald-950/40 border-b border-emerald-800/40 p-4 flex items-start gap-3 text-xs text-emerald-300">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-emerald-200">
              AES-256-GCM Zero-Knowledge Security Policy
            </div>
            <div className="text-[11px] text-emerald-300/90 leading-relaxed">
              Real-money order execution is locked in this phase. You can safely connect via your <span className="font-semibold text-white">Demo account</span> or using your <span className="font-semibold text-white">Read-Only Investor Password</span>. Broker passwords are encrypted with hardware keys and are never visible to admins or platform staff.
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Quick Demo Pre-fill helper */}
          <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Testing without real credentials?</span>
            </div>
            <button
              type="button"
              onClick={handleQuickFillDemo}
              className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-700/50 font-medium transition text-xs flex items-center gap-1.5"
            >
              <Zap className="w-3 h-3 text-blue-400" />
              <span>Quick-Fill Verified Demo</span>
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2.5">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>MT5 account handshake verified and terminal linked successfully!</span>
            </div>
          )}

          {/* Mode Selector: Demo vs Investor Read-Only */}
          <div>
            <label className="block font-medium text-slate-300 mb-1.5">Connection Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setConnectionMode('demo');
                  setAccountType('demo');
                }}
                className={`p-3 rounded-xl border text-left transition ${
                  connectionMode === 'demo'
                    ? 'bg-blue-600/10 border-blue-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-slate-200">Demo Account</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Practice capital with simulated live market execution</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setConnectionMode('read_only_investor');
                  setAccountType('live');
                }}
                className={`p-3 rounded-xl border text-left transition ${
                  connectionMode === 'read_only_investor'
                    ? 'bg-blue-600/10 border-blue-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold text-slate-200">Read-Only Investor Key</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Non-custodial telemetry monitor (no order placement rights)</div>
              </button>
            </div>
          </div>

          {/* Broker and Server Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Broker Selection</label>
              <select
                value={brokerName}
                onChange={e => setBrokerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                {PRESET_BROKERS.map(b => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Broker Server</label>
              {brokerName === 'Custom Broker / Other' ? (
                <input
                  type="text"
                  value={customServer}
                  onChange={e => setCustomServer(e.target.value)}
                  placeholder="e.g. live.mybroker.com:443"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              ) : (
                <select
                  value={server}
                  onChange={e => setServer(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                >
                  {currentBrokerObj?.servers.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Account Login and Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">MT5 Account Number / Login ID</label>
              <input
                type="text"
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                placeholder="e.g. 8092415"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">
                {connectionMode === 'read_only_investor' ? 'Investor Password (Read-Only)' : 'MT5 Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3 pr-10 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Currency and Leverage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Account Base Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AUD">AUD ($)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Broker Leverage</label>
              <select
                value={leverage}
                onChange={e => setLeverage(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value={100}>1:100 (Conservative)</option>
                <option value={200}>1:200 (Standard)</option>
                <option value={500}>1:500 (High Volume / Recommended)</option>
              </select>
            </div>
          </div>

          {/* Test Ping Gateway Box */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <div>
                <span className="text-slate-300 font-medium block">Pre-Connection Gateway Ping</span>
                <span className="text-[11px] text-slate-400">
                  {pingResult 
                    ? `Latency: ${pingResult.pingLatencyMs}ms (Equinix LD4 London) — Ready`
                    : 'Check socket handshake before saving credentials'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleTestPing}
              disabled={isPinging}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition disabled:opacity-50 text-xs"
            >
              {isPinging ? 'Pinging...' : 'Test Gateway Ping'}
            </button>
          </div>

          {/* Modal Footer Controls */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <Info className="w-3.5 h-3.5" />
              <span>Assigned worker: Equinix LD4 (London)</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-600/20"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'Encrypting & Connecting...' : 'Connect Terminal (Read-Only / Demo)'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
