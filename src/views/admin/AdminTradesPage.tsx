import React, { useState, useEffect } from 'react';
import { Position } from '../../types/index.js';
import { Layers, Search, AlertTriangle, Power, XCircle, RefreshCw } from 'lucide-react';

export const AdminTradesPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const [trades, setTrades] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('ALL');
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeAllModal, setCloseAllModal] = useState(false);

  const fetchTrades = () => {
    fetch('/api/admin/trades', {
      headers: { Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.trades) setTrades(data.trades);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleForceClose = async (positionId: string) => {
    setClosingId(positionId);
    await fetch('/api/admin/trades/force-close', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('forex_saas_token')}`,
      },
      body: JSON.stringify({ positionId, reason: 'Administrator force-close override' }),
    });
    setClosingId(null);
    fetchTrades();
  };

  const handleForceCloseAllPlatform = async () => {
    for (const t of trades.filter(x => x.status === 'open')) {
      await handleForceClose(t.id);
    }
    setCloseAllModal(false);
  };

  const filtered = trades.filter(t => {
    if (symbolFilter !== 'ALL' && t.symbol !== symbolFilter) return false;
    if (search && !t.symbol.toLowerCase().includes(search.toLowerCase()) && !t.customerName?.toLowerCase().includes(search.toLowerCase()) && !t.positionTicket.toString().includes(search)) {
      return false;
    }
    return true;
  });

  const openCount = trades.filter(t => t.status === 'open').length;
  const totalFloating = trades.filter(t => t.status === 'open').reduce((sum, t) => sum + t.currentPnl, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Master Platform Trade Ledger</h1>
          <p className="text-xs text-slate-400">
            Real-time cross-tenant monitoring and emergency administrator execution overrides.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCloseAllModal(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-600/25"
          >
            <Power className="w-3.5 h-3.5" />
            <span>Emergency Force Close All Platform Trades</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center flex-wrap gap-3">
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search symbol, ticket, customer..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Symbol:</span>
            <select
              value={symbolFilter}
              onChange={e => setSymbolFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
            >
              <option value="ALL">All Symbols</option>
              <option value="EURUSD">EURUSD</option>
              <option value="GBPUSD">GBPUSD</option>
              <option value="XAUUSD">XAUUSD</option>
              <option value="USDJPY">USDJPY</option>
              <option value="AUDUSD">AUDUSD</option>
            </select>
          </div>
        </div>

        <div className="font-mono text-xs flex items-center gap-4">
          <span>Active Positions: <strong className="text-white">{openCount}</strong></span>
          <span>Floating P&L: <strong className={totalFloating >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{totalFloating >= 0 ? '+' : ''}${totalFloating.toFixed(2)}</strong></span>
        </div>
      </div>

      {/* Master Trades Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-sans">
              <tr>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Symbol / Type</th>
                <th className="py-3 px-4">Lots</th>
                <th className="py-3 px-4">Open Price</th>
                <th className="py-3 px-4">Current</th>
                <th className="py-3 px-4">SL / TP</th>
                <th className="py-3 px-4">Floating P&L</th>
                <th className="py-3 px-4 text-right">Emergency Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(t => {
                const isProfit = t.currentPnl >= 0;
                return (
                  <tr key={t.id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 text-slate-400">#{t.positionTicket}</td>
                    <td className="py-3 px-4 font-sans text-slate-200 font-medium">{t.customerName}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-slate-100">{t.symbol}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] ${t.type === 'BUY' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}>
                          {t.type}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-200">{t.lots.toFixed(2)}</td>
                    <td className="py-3 px-4 text-slate-300">{t.openPrice.toFixed(5)}</td>
                    <td className="py-3 px-4 text-slate-100 font-bold">{t.currentPrice.toFixed(5)}</td>
                    <td className="py-3 px-4 text-[11px] text-slate-400">
                      <div>SL: {t.stopLoss?.toFixed(5) || 'None'}</div>
                      <div>TP: {t.takeProfit?.toFixed(5) || 'None'}</div>
                    </td>
                    <td className={`py-3 px-4 font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isProfit ? '+' : ''}${t.currentPnl.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      {t.status === 'open' ? (
                        <button
                          onClick={() => handleForceClose(t.id)}
                          disabled={closingId === t.id}
                          className="px-2.5 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 text-[11px] font-medium transition"
                        >
                          {closingId === t.id ? 'Closing...' : 'Force Close'}
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Closed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emergency Modal */}
      {closeAllModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm Emergency Platform-Wide Close?</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will send immediate market-order liquidation requests for ALL {openCount} open positions across all customer MT5 accounts in London Equinix LD4.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setCloseAllModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleForceCloseAllPlatform}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                EXECUTE PLATFORM CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
