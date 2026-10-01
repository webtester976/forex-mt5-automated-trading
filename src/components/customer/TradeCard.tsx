import React, { useState } from 'react';
import { Position } from '../../types/index.js';
import { ArrowUpRight, ArrowDownRight, Clock, ShieldAlert, CheckCircle2, X } from 'lucide-react';

interface TradeCardProps {
  trade: Position;
  onClose?: (positionId: string) => Promise<boolean>;
  effectiveManualClose?: boolean;
}

export const TradeCard: React.FC<TradeCardProps> = ({ trade, onClose, effectiveManualClose = false }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isProfit = trade.currentPnl >= 0;
  const isBuy = trade.type === 'BUY';

  const handleManualClose = async () => {
    if (!onClose || !effectiveManualClose) return;
    setIsClosing(true);
    await onClose(trade.id);
    setIsClosing(false);
    setConfirmOpen(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${isBuy ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'}`}>
            {isBuy ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-base">{trade.symbol}</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${isBuy ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                {trade.type} {trade.lots.toFixed(2)} LOTS
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">Ticket #{trade.positionTicket}</span>
          </div>
        </div>

        <div className="text-right">
          <div className={`font-mono text-lg font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isProfit ? '+' : ''}${trade.currentPnl.toFixed(2)}
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {trade.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Pricing and Levels Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 mb-3 text-xs">
        <div>
          <span className="text-slate-400 block text-[11px]">Entry Price</span>
          <span className="font-mono text-slate-200 font-medium">{trade.openPrice.toFixed(5)}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Current Market</span>
          <span className="font-mono text-slate-100 font-semibold">{trade.currentPrice.toFixed(5)}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Stop Loss</span>
          <span className="font-mono text-rose-300">{trade.stopLoss ? trade.stopLoss.toFixed(5) : 'None'}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Take Profit</span>
          <span className="font-mono text-emerald-300">{trade.takeProfit ? trade.takeProfit.toFixed(5) : 'None'}</span>
        </div>
      </div>

      {/* Footer details & Action */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2 pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            Runtime: {trade.runtimeFormatted || 'Live'}
          </span>
          <span className="hidden sm:inline text-slate-400 font-mono">
            Opened: {new Date(trade.openTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {effectiveManualClose && onClose && trade.status === 'open' && (
          <div>
            {!confirmOpen ? (
              <button
                onClick={() => setConfirmOpen(true)}
                className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-800 transition"
              >
                Close Trade
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={isClosing}
                  onClick={handleManualClose}
                  className="text-xs px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium transition disabled:opacity-50"
                >
                  {isClosing ? 'Closing...' : 'Confirm Close'}
                </button>
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
