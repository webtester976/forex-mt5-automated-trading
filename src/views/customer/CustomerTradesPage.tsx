import React, { useState } from 'react';
import { useTrading } from '../../contexts/TradingContext.js';
import { TradeCard } from '../../components/customer/TradeCard.js';
import { 
  Layers, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  CheckCircle2, 
  Calendar,
  XCircle,
  Download
} from 'lucide-react';

export const CustomerTradesPage: React.FC<{ onNavigate: (path: string) => void }> = () => {
  const { openTrades, closedTrades, closePosition, effectiveManualClose } = useTrading();
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [symbolFilter, setSymbolFilter] = useState('ALL');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const displayedTrades = activeTab === 'open' ? openTrades : closedTrades;

  const filteredTrades = displayedTrades.filter(t => {
    if (symbolFilter !== 'ALL' && t.symbol !== symbolFilter) return false;
    if (directionFilter !== 'ALL' && t.type !== directionFilter) return false;
    if (searchQuery && !t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) && !t.positionTicket.toString().includes(searchQuery)) return false;
    return true;
  });

  const totalOpenPnl = openTrades.reduce((sum, t) => sum + (t.currentPnl || 0), 0);
  const totalClosedPnl = closedTrades.reduce((sum, t) => sum + (t.profit !== undefined ? t.profit : t.currentPnl || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Trade Ledger & Positions</h1>
          <p className="text-xs text-slate-400">
            Real-time tracking and verified execution history from your MT5 terminal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex text-xs">
            <button
              onClick={() => setActiveTab('open')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'open' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Live Open ({openTrades.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('closed')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'closed' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Closed History ({closedTrades.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search symbol, ticket..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
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

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Direction:</span>
            <select
              value={directionFilter}
              onChange={e => setDirectionFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none font-mono"
            >
              <option value="ALL">All Types</option>
              <option value="BUY">BUY Only</option>
              <option value="SELL">SELL Only</option>
            </select>
          </div>
        </div>

        <div className="font-mono text-xs">
          <span className="text-slate-400">Ledger P&L: </span>
          <span className={`font-bold ${
            (activeTab === 'open' ? totalOpenPnl : totalClosedPnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {(activeTab === 'open' ? totalOpenPnl : totalClosedPnl) >= 0 ? '+' : ''}$
            {(activeTab === 'open' ? totalOpenPnl : totalClosedPnl).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Content depending on Active Tab */}
      {activeTab === 'open' ? (
        filteredTrades.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <Layers className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-bold text-white text-base">No Matching Live Positions</h3>
            <p className="text-xs text-slate-400">No open trades match the selected search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrades.map(trade => (
              <TradeCard
                key={trade.id}
                trade={trade}
                onClose={effectiveManualClose ? closePosition : undefined}
                effectiveManualClose={effectiveManualClose}
              />
            ))}
          </div>
        )
      ) : (
        /* Closed Trades Table View */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-medium">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Symbol / Direction</th>
                  <th className="py-3 px-4">Lots</th>
                  <th className="py-3 px-4">Open Price</th>
                  <th className="py-3 px-4">Close Price</th>
                  <th className="py-3 px-4">Open Time</th>
                  <th className="py-3 px-4">Close Time</th>
                  <th className="py-3 px-4 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredTrades.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No closed deals found matching the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTrades.map(t => {
                    const isProfit = (t.profit || 0) >= 0;
                    return (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 text-slate-400">#{t.positionTicket}</td>
                        <td className="py-3 px-4 font-sans">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">{t.symbol}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              t.type === 'BUY' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                            }`}>
                              {t.type}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-200">{t.lots.toFixed(2)}</td>
                        <td className="py-3 px-4 text-slate-300">{t.openPrice.toFixed(5)}</td>
                        <td className="py-3 px-4 text-slate-300">{t.closePrice ? t.closePrice.toFixed(5) : t.currentPrice.toFixed(5)}</td>
                        <td className="py-3 px-4 text-slate-400">{new Date(t.openTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="py-3 px-4 text-slate-400">{t.closeTime ? new Date(t.closeTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                        <td className={`py-3 px-4 text-right font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? '+' : ''}${(t.profit || 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
