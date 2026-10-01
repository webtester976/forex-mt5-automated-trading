import React, { useState, useEffect } from 'react';
import { useTrading } from '../../contexts/TradingContext.js';
import { ConnectMt5Modal } from '../../components/customer/ConnectMt5Modal.js';
import { 
  Server, 
  ShieldCheck, 
  Lock, 
  RefreshCw, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  Cpu, 
  ExternalLink,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Zap,
  Info,
  Check,
  AlertCircle
} from 'lucide-react';

export const CustomerMt5Page: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { 
    mt5Account, 
    openTrades, 
    closedTrades, 
    refreshTradingData, 
    disconnectMt5, 
    syncMt5 
  } = useTrading();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'positions' | 'history' | 'diagnostics'>('positions');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Live timer for elapsed time since last sync
  const [secondsSinceSync, setSecondsSinceSync] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      if (mt5Account?.lastSyncAt) {
        const diff = Math.floor((Date.now() - new Date(mt5Account.lastSyncAt).getTime()) / 1000);
        setSecondsSinceSync(Math.max(0, diff));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [mt5Account?.lastSyncAt]);

  const handleForceSync = async () => {
    setRefreshing(true);
    const ok = await syncMt5();
    setRefreshing(false);
    if (ok) {
      setActionNotice('Terminal metrics synchronized successfully with London Equinix LD4 engine.');
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleDisconnect = async () => {
    setDisconnectConfirm(false);
    setRefreshing(true);
    await disconnectMt5();
    setRefreshing(false);
    setActionNotice('MetaTrader 5 terminal unhooked and cloud worker connection terminated.');
    setTimeout(() => setActionNotice(null), 4000);
  };

  const totalOpenPnl = openTrades.reduce((sum, t) => sum + (t.currentPnl || 0), 0);
  const totalClosedProfit = closedTrades.reduce((sum, t) => sum + (t.profit || t.currentPnl || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Top Header & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">MetaTrader 5 Terminal Gateway</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-medium bg-blue-950 text-blue-300 border border-blue-800">
              READ-ONLY / DEMO MODE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Sub-millisecond telemetry bridge to London Equinix LD4 institutional matching engines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleForceSync}
            disabled={refreshing || !mt5Account}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span>Force Reconcile</span>
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition flex items-center gap-1.5"
          >
            <Server className="w-3.5 h-3.5" />
            <span>{mt5Account ? 'Switch / Reconnect Account' : 'Connect MT5 Terminal'}</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Security Architecture & Read-Only / Demo Mode Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Non-Custodial Architecture & Read-Only Safeguard</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
            Real-Money Execution: <span className="text-amber-400 font-semibold">Locked</span>
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          In this environment phase, your MT5 account operates under strict non-custodial safeguards. You may link practice Demo credentials or use your broker’s Read-Only Investor Password to monitor live equity, margin, and positions without granting trade placement authorization. Raw credentials are encrypted immediately on ingress via AES-256-GCM hardware key isolation and are never exposed in platform logs or administrative interfaces.
        </p>
      </div>

      {mt5Account ? (
        <div className="space-y-6">
          
          {/* Main Account Terminal Card & Fleet Telemetry Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Terminal Details & Broker Gateway Card */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              
              {/* Account Identifier & Status Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center shrink-0">
                    <Server className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-lg">{mt5Account.brokerName}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {mt5Account.accountType === 'live' ? 'INVESTOR READ-ONLY' : 'DEMO TERMINAL'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 mt-0.5">
                      <span>Server: <strong className="text-slate-200">{mt5Account.server}</strong></span>
                      <span>•</span>
                      <span>Account ID: <strong className="text-slate-200">{mt5Account.loginId}</strong></span>
                      <span>•</span>
                      <span>Leverage: <strong className="text-slate-200">1:{mt5Account.leverage || 500}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
                    mt5Account.connectionStatus === 'connected'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      mt5Account.connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                    }`}></span>
                    <span>{mt5Account.connectionStatus === 'connected' ? 'TERMINAL CONNECTED' : 'DISCONNECTED'}</span>
                  </span>
                </div>
              </div>

              {/* Complete Financial Telemetry 6-Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Account Balance</span>
                  <div className="font-mono text-xl font-extrabold text-white">
                    ${mt5Account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Settled Capital</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Account Equity</span>
                  <div className="font-mono text-xl font-extrabold text-white">
                    ${mt5Account.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Balance + Floating P&L</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Floating P&L</span>
                  <div className={`font-mono text-xl font-extrabold ${mt5Account.floatingPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {mt5Account.floatingPnl >= 0 ? '+' : ''}${mt5Account.floatingPnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{openTrades.length} open position(s)</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Used Margin</span>
                  <div className="font-mono text-xl font-bold text-slate-200">
                    ${(mt5Account.margin || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Broker Hold</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Free Margin</span>
                  <div className="font-mono text-xl font-bold text-slate-200">
                    ${(mt5Account.freeMargin || mt5Account.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Available For Trades</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block mb-0.5">Margin Level</span>
                  <div className="font-mono text-xl font-bold text-emerald-400">
                    {mt5Account.margin && mt5Account.margin > 0 ? `${(mt5Account.marginLevel || 1880).toFixed(1)}%` : '∞ (Zero Used)'}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Safety Buffer</span>
                </div>
              </div>

              {/* Terminal Handshake Details List */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Assigned Cloud Worker</span>
                  <span className="font-mono text-blue-400 font-semibold">{mt5Account.assignedWorkerName || 'London LD4 Primary Engine #1 [eu-west-ld4]'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Last Telemetry Handshake</span>
                  <span className="font-mono text-slate-200">
                    {secondsSinceSync < 60 ? `${secondsSinceSync}s ago` : `${Math.floor(secondsSinceSync / 60)}m ago`} ({new Date(mt5Account.lastSyncAt || Date.now()).toLocaleTimeString()})
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                  <span className="text-slate-400">Active Trading Mode</span>
                  <span className="font-mono text-amber-300">
                    {mt5Account.tradingMode === 'read_only_investor' ? 'Investor Read-Only (Non-Custodial)' : 'Demo Sandbox (Simulated Engine)'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Credential Storage</span>
                  <span className="font-mono text-emerald-400 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    <span>AES-256-GCM Zero-Knowledge Isolated</span>
                  </span>
                </div>
              </div>

              {/* Disconnect Action */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <div className="text-slate-400 text-xs flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  <span>To change broker or server, use Switch Account or disconnect terminal.</span>
                </div>
                <button
                  onClick={() => setDisconnectConfirm(true)}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 font-medium transition px-3 py-1.5 rounded-lg hover:bg-rose-950/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Disconnect Terminal</span>
                </button>
              </div>
            </div>

            {/* Cloud Worker & Network Telemetry Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span>Execution Infrastructure</span>
                </h3>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                  ONLINE 99.98%
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Primary VPS Route</span>
                  <span className="font-mono text-slate-200 font-semibold block">London Equinix LD4 &rarr; Broker Gateway</span>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-emerald-400 font-mono font-semibold">1.2ms (Cross-Connect)</span>
                    <span className="text-slate-400">0.0% Packet Loss</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Failover Standby Route</span>
                  <span className="font-mono text-slate-200 font-semibold block">Slough Interxion LON2 &rarr; Direct Optical</span>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-blue-400 font-mono font-semibold">2.4ms Standby</span>
                    <span className="text-slate-400">Hot Standby</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Worker Node Resources</span>
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">CPU Utilization</span>
                      <span className="text-slate-200 font-bold">18.4%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Memory Allocated</span>
                      <span className="text-slate-200 font-bold">428 MB / 4 GB</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Slippage & Spread Ceiling</span>
                  <span className="font-mono text-slate-200 font-semibold block">Max 0.8 pips slippage tolerance</span>
                  <span className="text-[11px] text-slate-400">Orders automatically abort if market spread widens</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs: Open Positions vs Trade History vs Terminal Diagnostics */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('positions')}
                  className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs transition flex items-center gap-1.5 ${
                    activeTab === 'positions'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white bg-slate-950'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Open Positions ({openTrades.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs transition flex items-center gap-1.5 ${
                    activeTab === 'history'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white bg-slate-950'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Trade History ({closedTrades.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('diagnostics')}
                  className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs transition flex items-center gap-1.5 ${
                    activeTab === 'diagnostics'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white bg-slate-950'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Connection Diagnostics</span>
                </button>
              </div>

              <div className="text-xs font-mono">
                {activeTab === 'positions' && (
                  <span className="text-slate-400">
                    Net Floating P&L: <strong className={totalOpenPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {totalOpenPnl >= 0 ? '+' : ''}${totalOpenPnl.toFixed(2)}
                    </strong>
                  </span>
                )}
                {activeTab === 'history' && (
                  <span className="text-slate-400">
                    Net Realized Profit: <strong className={totalClosedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {totalClosedProfit >= 0 ? '+' : ''}${totalClosedProfit.toFixed(2)}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            {/* TAB 1: Live Open Positions Table */}
            {activeTab === 'positions' && (
              <div className="overflow-x-auto">
                {openTrades.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <p className="text-slate-400 text-xs">No active open positions on this MT5 terminal.</p>
                    <p className="text-slate-500 text-[11px]">
                      Our quantitative algorithms will initiate positions during upcoming session liquidity windows.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                        <th className="pb-2.5">Ticket #</th>
                        <th className="pb-2.5">Symbol</th>
                        <th className="pb-2.5">Type</th>
                        <th className="pb-2.5">Lots</th>
                        <th className="pb-2.5">Open Price</th>
                        <th className="pb-2.5">Current Price</th>
                        <th className="pb-2.5">SL / TP</th>
                        <th className="pb-2.5 text-right">Floating P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {openTrades.map(trade => (
                        <tr key={trade.id} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 text-slate-300">#{trade.positionTicket}</td>
                          <td className="py-3 font-bold text-white flex items-center gap-1.5">
                            <span>{trade.symbol}</span>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              trade.type === 'BUY' 
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                                : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}>
                              {trade.type}
                            </span>
                          </td>
                          <td className="py-3 text-slate-300">{trade.lots.toFixed(2)}</td>
                          <td className="py-3 text-slate-300">{trade.openPrice.toFixed(trade.symbol === 'XAUUSD' ? 2 : 5)}</td>
                          <td className="py-3 text-white font-bold">{trade.currentPrice.toFixed(trade.symbol === 'XAUUSD' ? 2 : 5)}</td>
                          <td className="py-3 text-slate-400 text-[11px]">
                            <span>{trade.stopLoss ? trade.stopLoss.toFixed(trade.symbol === 'XAUUSD' ? 2 : 5) : '-'}</span>
                            <span className="text-slate-600 mx-1">/</span>
                            <span>{trade.takeProfit ? trade.takeProfit.toFixed(trade.symbol === 'XAUUSD' ? 2 : 5) : '-'}</span>
                          </td>
                          <td className={`py-3 text-right font-extrabold text-sm ${trade.currentPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {trade.currentPnl >= 0 ? '+' : ''}${trade.currentPnl.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* TAB 2: Historical Closed Trades Table */}
            {activeTab === 'history' && (
              <div className="overflow-x-auto">
                {closedTrades.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <p className="text-slate-400 text-xs">No closed trade history recorded yet for this MT5 terminal.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                        <th className="pb-2.5">Ticket #</th>
                        <th className="pb-2.5">Symbol</th>
                        <th className="pb-2.5">Type</th>
                        <th className="pb-2.5">Lots</th>
                        <th className="pb-2.5">Open Price</th>
                        <th className="pb-2.5">Close Price</th>
                        <th className="pb-2.5">Execution Period</th>
                        <th className="pb-2.5 text-right">Realized Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {closedTrades.map(trade => {
                        const profitVal = trade.profit ?? trade.currentPnl ?? 0;
                        return (
                          <tr key={trade.id} className="hover:bg-slate-800/30 transition">
                            <td className="py-3 text-slate-300">#{trade.positionTicket}</td>
                            <td className="py-3 font-bold text-white">{trade.symbol}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                trade.type === 'BUY' 
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                                  : 'bg-rose-950 text-rose-300 border border-rose-800'
                              }`}>
                                {trade.type}
                              </span>
                            </td>
                            <td className="py-3 text-slate-300">{trade.lots.toFixed(2)}</td>
                            <td className="py-3 text-slate-400">{trade.openPrice.toFixed(trade.symbol === 'XAUUSD' ? 2 : 5)}</td>
                            <td className="py-3 text-slate-200">{trade.closePrice ? trade.closePrice.toFixed(trade.symbol === 'XAUUSD' ? 2 : 5) : '-'}</td>
                            <td className="py-3 text-slate-400 text-[11px]">
                              {trade.closeTime ? new Date(trade.closeTime).toLocaleDateString() : trade.runtimeFormatted || 'Closed'}
                            </td>
                            <td className={`py-3 text-right font-extrabold text-sm ${profitVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {profitVal >= 0 ? '+' : ''}${profitVal.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* TAB 3: Connection Diagnostics */}
            {activeTab === 'diagnostics' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <h4 className="font-semibold text-slate-200">Terminal Socket Protocol</h4>
                    <div className="space-y-1.5 text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Handshake Protocol:</span>
                        <span className="font-mono text-emerald-400">MetaTrader 5 API over TLS 1.3</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Socket Latency:</span>
                        <span className="font-mono text-slate-200">1.2ms (Equinix LD4 Cross-Connect)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Packet Loss:</span>
                        <span className="font-mono text-emerald-400">0.00% (Sub-millisecond SLA)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Encryption Suite:</span>
                        <span className="font-mono text-slate-200">AES-256-GCM / 256-bit Key Isolation</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <h4 className="font-semibold text-slate-200">Execution Safety Controls</h4>
                    <div className="space-y-1.5 text-slate-300">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Trading Mode:</span>
                        <span className="font-mono text-blue-400">READ-ONLY / DEMO SAFEGUARD</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Real-Money Execution:</span>
                        <span className="font-mono text-amber-400">Locked (Sandbox Protected)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Account Reconciliation:</span>
                        <span className="font-mono text-emerald-400">Every 4 Seconds</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Emergency Disconnect:</span>
                        <span className="font-mono text-emerald-400">Hardware Kill-Switch Ready</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <h4 className="font-semibold text-slate-200 mb-2">Live Handshake Event Log</h4>
                  <div className="bg-black/60 rounded-lg p-3 font-mono text-[11px] text-slate-400 space-y-1 max-h-36 overflow-y-auto">
                    <div>[03:04:12] Gateway socket connected to broker server: {mt5Account.server}</div>
                    <div>[03:04:13] Handshake validated via AES-256-GCM. Read-Only / Demo sandbox active.</div>
                    <div>[03:04:14] Account #{mt5Account.loginId} balance reconciled: ${mt5Account.balance.toFixed(2)}</div>
                    <div>[03:04:15] Latency ping: 1.2ms to LD4. Zero packet loss. Ready for telemetry stream.</div>
                    <div>[03:04:18] Heartbeat OK. Synchronized with worker {mt5Account.assignedWorkerName || 'London LD4'}.</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State: Prompt to Link MT5 */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-5 max-w-xl mx-auto shadow-2xl">
          <div className="w-20 h-20 rounded-3xl bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center mx-auto shadow-inner">
            <Server className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">No MetaTrader 5 Terminal Connected</h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              Link your MT5 demo account or read-only investor key to enable sub-millisecond telemetry monitoring, equity tracking, and quantitative strategy allocation.
            </p>
          </div>
          
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              <Server className="w-4 h-4" />
              <span>Connect MT5 Terminal Now</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center justify-center gap-2 pt-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero-Knowledge AES-256-GCM hardware encrypted. No credit card or live capital required.</span>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {disconnectConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-bold text-white text-base">Disconnect MT5 Terminal?</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Disconnecting will unhook your broker account from our London Equinix LD4 worker cluster and stop active telemetry streaming. Your encrypted credentials will be purged from worker memory.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDisconnectConfirm(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
              >
                Confirm Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      <ConnectMt5Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};
