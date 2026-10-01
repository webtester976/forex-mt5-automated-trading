import { db } from '../db/store.js';
import { DemoOrderCommand, DemoAccount, MarketQuote } from '../../src/types/index.js';
import { marketSimulator } from './marketDataSimulator.js';

export interface DemoRiskValidationResult {
  allowed: boolean;
  reason?: string;
  ruleFailed?: string;
  code?: string;
}

export class DemoRiskEngine {
  /**
   * Pre-trade Risk Assessment for Demo Orders.
   * Ensures simulated trading strictly obeys all risk controls.
   */
  public static validateDemoOrder(
    command: DemoOrderCommand,
    account: DemoAccount,
    quote: MarketQuote
  ): DemoRiskValidationResult {
    const entryPrice = command.type === 'BUY' ? quote.ask : quote.bid;

    // 1. Global Demo Trading Engine Kill Switch
    if (db.demoGlobalKillSwitch || db.killSwitches.globalKillSwitch) {
      this.logRejection(account, command, 'GLOBAL_KILL_SWITCH', 'Global Demo Trading Engine Emergency Kill Switch is ACTIVE.');
      return {
        allowed: false,
        ruleFailed: 'GLOBAL_KILL_SWITCH',
        code: 'ERR_GLOBAL_KILL_SWITCH',
        reason: 'Execution rejected: Global Demo Trading Kill Switch is currently active across the platform.',
      };
    }

    // 2. Per-Customer Trading Pause / Emergency Halt
    if (account.tradingPaused || db.killSwitches.perAccount[account.id]) {
      this.logRejection(account, command, 'CUSTOMER_TRADING_PAUSED', 'Simulated demo trading is currently paused for this account.');
      return {
        allowed: false,
        ruleFailed: 'CUSTOMER_TRADING_PAUSED',
        code: 'ERR_CUSTOMER_PAUSED',
        reason: 'Execution rejected: Demo trading has been paused for your account by risk administration.',
      };
    }

    // 3. Per-Algorithm Kill Switch (if algorithm invoked)
    if (command.algorithmId && db.killSwitches.perAlgorithm[command.algorithmId]) {
      this.logRejection(account, command, 'ALGORITHM_HALTED', `Algorithm [${command.algorithmId}] has been halted by Risk Officers.`);
      return {
        allowed: false,
        ruleFailed: 'ALGORITHM_HALTED',
        code: 'ERR_ALGO_HALTED',
        reason: `Execution rejected: Algorithm [${command.algorithmId}] is halted.`,
      };
    }

    // 4. Duplicate Order / Idempotency Check (60-second window)
    if (command.idempotencyKey) {
      const lastSeen = db.demoProcessedIdempotencyKeys.get(command.idempotencyKey);
      const now = Date.now();
      if (lastSeen && now - lastSeen < 60000) {
        this.logRejection(account, command, 'DUPLICATE_ORDER', `Duplicate order rejected for idempotency key: ${command.idempotencyKey}`);
        return {
          allowed: false,
          ruleFailed: 'DUPLICATE_ORDER',
          code: 'ERR_DUPLICATE_ORDER',
          reason: 'Execution rejected: Duplicate order detected. Request with this idempotency key was recently processed.',
        };
      }
    }

    // 5. Lot Size Validation
    const customerRisk = db.riskSettings.get(command.userId);
    const maxAllowedLot = customerRisk?.maxLotSize || 5.0;
    if (command.lots <= 0) {
      return {
        allowed: false,
        ruleFailed: 'INVALID_LOT_SIZE',
        code: 'ERR_INVALID_LOT',
        reason: 'Order lot size must be greater than zero.',
      };
    }

    if (command.lots > maxAllowedLot) {
      const reason = `Order volume (${command.lots.toFixed(2)} lots) exceeds allowable ceiling (${maxAllowedLot.toFixed(2)} lots).`;
      this.logRejection(account, command, 'MAX_LOT_EXCEEDED', reason);
      return {
        allowed: false,
        ruleFailed: 'MAX_LOT_EXCEEDED',
        code: 'ERR_MAX_LOT_EXCEEDED',
        reason,
      };
    }

    // 6. Max Concurrent Open Trades Check
    const openTrades = db.demoPositions.filter(p => p.mt5AccountId === account.id && p.status === 'open');
    const maxTradesAllowed = customerRisk?.maxOpenTrades || 5;
    if (openTrades.length >= maxTradesAllowed) {
      const reason = `Maximum concurrent open demo positions (${maxTradesAllowed}) reached. Close an open position first.`;
      this.logRejection(account, command, 'MAX_OPEN_TRADES_REACHED', reason);
      return {
        allowed: false,
        ruleFailed: 'MAX_OPEN_TRADES_REACHED',
        code: 'ERR_MAX_OPEN_TRADES',
        reason,
      };
    }

    // 7. Maximum Daily Loss Check
    const maxDailyLossLimitUsd = -500.00; // $500 daily loss floor
    if (account.dailyPnl <= maxDailyLossLimitUsd) {
      const reason = `Account reached maximum daily loss limit ($${Math.abs(maxDailyLossLimitUsd).toFixed(2)}). New trades restricted until next daily reset.`;
      this.logRejection(account, command, 'MAX_DAILY_LOSS_EXCEEDED', reason);
      return {
        allowed: false,
        ruleFailed: 'MAX_DAILY_LOSS_EXCEEDED',
        code: 'ERR_MAX_DAILY_LOSS',
        reason,
      };
    }

    // 8. Maximum Drawdown Check (e.g. 10% peak-to-trough)
    const peak = account.peakBalance > 0 ? account.peakBalance : account.initialBalance;
    const currentDrawdownPct = peak > 0 ? ((peak - account.equity) / peak) * 100 : 0;
    const maxDrawdownAllowedPct = customerRisk?.maxDrawdownPct || 10.0;
    if (currentDrawdownPct >= maxDrawdownAllowedPct) {
      const reason = `Account drawdown (${currentDrawdownPct.toFixed(1)}%) reached maximum allowable threshold (${maxDrawdownAllowedPct}%).`;
      this.logRejection(account, command, 'MAX_DRAWDOWN_EXCEEDED', reason);
      return {
        allowed: false,
        ruleFailed: 'MAX_DRAWDOWN_EXCEEDED',
        code: 'ERR_MAX_DRAWDOWN',
        reason,
      };
    }

    // 9. Required Margin & Margin Level Check
    const requiredMargin = marketSimulator.calculateRequiredMargin(
      command.symbol,
      command.lots,
      entryPrice,
      account.leverage || 100
    );

    if (requiredMargin > account.freeMargin) {
      const reason = `Insufficient demo free margin. Required: $${requiredMargin.toFixed(2)}, Available: $${account.freeMargin.toFixed(2)}.`;
      this.logRejection(account, command, 'INSUFFICIENT_MARGIN', reason);
      return {
        allowed: false,
        ruleFailed: 'INSUFFICIENT_MARGIN',
        code: 'ERR_INSUFFICIENT_MARGIN',
        reason,
      };
    }

    const projectedUsedMargin = account.usedMargin + requiredMargin;
    const projectedMarginLevel = projectedUsedMargin > 0 ? (account.equity / projectedUsedMargin) * 100 : 9999;
    if (projectedMarginLevel < 150) {
      const reason = `Projected margin level (${projectedMarginLevel.toFixed(1)}%) is below safety threshold (150%).`;
      this.logRejection(account, command, 'MARGIN_LEVEL_CRITICAL', reason);
      return {
        allowed: false,
        ruleFailed: 'MARGIN_LEVEL_CRITICAL',
        code: 'ERR_MARGIN_CRITICAL',
        reason,
      };
    }

    // 10. Stop Loss Logic Check
    if (command.stopLoss && command.stopLoss > 0) {
      if (command.type === 'BUY' && command.stopLoss >= entryPrice) {
        const reason = `Invalid Stop Loss for BUY order. SL (${command.stopLoss}) must be lower than Ask price (${entryPrice}).`;
        this.logRejection(account, command, 'INVALID_STOP_LOSS', reason);
        return {
          allowed: false,
          ruleFailed: 'INVALID_STOP_LOSS',
          code: 'ERR_INVALID_SL',
          reason,
        };
      }
      if (command.type === 'SELL' && command.stopLoss <= entryPrice) {
        const reason = `Invalid Stop Loss for SELL order. SL (${command.stopLoss}) must be higher than Bid price (${entryPrice}).`;
        this.logRejection(account, command, 'INVALID_STOP_LOSS', reason);
        return {
          allowed: false,
          ruleFailed: 'INVALID_STOP_LOSS',
          code: 'ERR_INVALID_SL',
          reason,
        };
      }
    }

    // 11. Take Profit Logic Check
    if (command.takeProfit && command.takeProfit > 0) {
      if (command.type === 'BUY' && command.takeProfit <= entryPrice) {
        const reason = `Invalid Take Profit for BUY order. TP (${command.takeProfit}) must be higher than Ask price (${entryPrice}).`;
        this.logRejection(account, command, 'INVALID_TAKE_PROFIT', reason);
        return {
          allowed: false,
          ruleFailed: 'INVALID_TAKE_PROFIT',
          code: 'ERR_INVALID_TP',
          reason,
        };
      }
      if (command.type === 'SELL' && command.takeProfit >= entryPrice) {
        const reason = `Invalid Take Profit for SELL order. TP (${command.takeProfit}) must be lower than Bid price (${entryPrice}).`;
        this.logRejection(account, command, 'INVALID_TAKE_PROFIT', reason);
        return {
          allowed: false,
          ruleFailed: 'INVALID_TAKE_PROFIT',
          code: 'ERR_INVALID_TP',
          reason,
        };
      }
    }

    return { allowed: true };
  }

  private static logRejection(
    account: DemoAccount,
    command: DemoOrderCommand,
    ruleFailed: string,
    reason: string
  ) {
    const peak = account.peakBalance > 0 ? account.peakBalance : account.initialBalance;
    const drawdownPct = peak > 0 ? ((peak - account.equity) / peak) * 100 : 0;

    db.recordDemoRiskEvent({
      userId: command.userId,
      symbol: command.symbol,
      type: command.type,
      lots: command.lots,
      ruleFailed,
      reason,
      accountMetrics: {
        balance: account.balance,
        equity: account.equity,
        freeMargin: account.freeMargin,
        marginLevel: account.marginLevel,
        dailyPnl: account.dailyPnl,
        drawdownPct: Number(drawdownPct.toFixed(2)),
      },
    });

    db.recordAudit(
      command.userId,
      account.userId,
      'customer',
      'DEMO_ORDER_RISK_REJECTION',
      'demo_risk',
      `[${ruleFailed}] ${reason} - Symbol: ${command.symbol}, ${command.type} ${command.lots} lots`,
      '127.0.0.1',
      account.id
    );
  }
}
