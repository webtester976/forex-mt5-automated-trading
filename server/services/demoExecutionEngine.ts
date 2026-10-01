import { db } from '../db/store.js';
import { 
  DemoAccount, 
  DemoOrderCommand, 
  Position, 
  MarketQuote,
  ExecutionStatus,
  OrderExecutionRecord
} from '../../src/types/index.js';
import { marketSimulator } from './marketDataSimulator.js';
import { DemoRiskEngine } from './demoRiskEngine.js';

export interface DemoOrderResult {
  success: boolean;
  position?: Position;
  account?: DemoAccount;
  message: string;
  errorCode?: string;
  reconciled?: boolean;
  executionStatus?: ExecutionStatus;
}

export class DemoExecutionEngine {
  private static instance: DemoExecutionEngine;
  private executionRecords: Map<string, OrderExecutionRecord> = new Map();

  private constructor() {
    // Listen to market ticks from simulator to update floating P&L and trigger SL/TP
    marketSimulator.subscribeTicks((quotes) => {
      this.onMarketTick(quotes);
    });
  }

  public static getInstance(): DemoExecutionEngine {
    if (!DemoExecutionEngine.instance) {
      DemoExecutionEngine.instance = new DemoExecutionEngine();
    }
    return DemoExecutionEngine.instance;
  }

  /**
   * Safe State-Machine Driven Trade Execution Pipeline:
   * REQUESTED -> (Risk Check) -> SENT -> ACKNOWLEDGED -> FILLED
   * In case of communication failure or ambiguity: UNKNOWN -> Reconcile before any retry!
   */
  public async openMarketOrder(command: DemoOrderCommand): Promise<DemoOrderResult> {
    const execId = `exec_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const idempotencyKey = command.idempotencyKey || `idem_${execId}`;

    // 1. Initial State: REQUESTED
    const execRecord: OrderExecutionRecord = {
      id: execId,
      mt5AccountId: command.userId,
      userId: command.userId,
      symbol: command.symbol,
      type: command.type,
      lots: command.lots,
      status: 'REQUESTED',
      idempotencyKey,
      reconciled: false,
      reconciliationAttempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.executionRecords.set(execId, execRecord);

    const account = db.getOrCreateDemoAccount(command.userId);
    const quote = marketSimulator.getQuote(command.symbol);

    // 2. Pre-execution Risk Validation
    const riskCheck = DemoRiskEngine.validateDemoOrder(command, account, quote);
    if (!riskCheck.allowed) {
      execRecord.status = 'REJECTED';
      execRecord.errorMessage = riskCheck.reason;
      execRecord.updatedAt = new Date().toISOString();
      return {
        success: false,
        message: riskCheck.reason || 'Order rejected by Demo Risk Engine.',
        errorCode: riskCheck.code || 'ERR_RISK_REJECTED',
        executionStatus: 'REJECTED',
      };
    }

    // 3. State Transition: SENT to simulated matching engine
    execRecord.status = 'SENT';
    execRecord.updatedAt = new Date().toISOString();

    // 4. State Transition: ACKNOWLEDGED by matching engine
    execRecord.status = 'ACKNOWLEDGED';
    execRecord.updatedAt = new Date().toISOString();

    // 5. Determine Entry Price (Ask for BUY, Bid for SELL)
    const entryPrice = command.type === 'BUY' ? quote.ask : quote.bid;
    const ticketNumber = Math.floor(98000000 + Math.random() * 1000000);
    const commission = -Number((command.lots * 7.00).toFixed(2)); // Standard $7/lot round turn

    // 6. Create Position & Transition to FILLED
    const positionId = `demo_pos_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newPosition: Position = {
      id: positionId,
      mt5AccountId: account.id,
      positionTicket: ticketNumber,
      symbol: command.symbol,
      type: command.type,
      lots: command.lots,
      openPrice: entryPrice,
      currentPrice: entryPrice,
      stopLoss: command.stopLoss || 0,
      takeProfit: command.takeProfit || 0,
      currentPnl: 0,
      swap: 0,
      commission,
      status: 'open',
      openTime: new Date().toISOString(),
      runtimeFormatted: '0m',
    };

    db.demoPositions.unshift(newPosition);

    // Record idempotency key if provided
    if (command.idempotencyKey) {
      db.demoProcessedIdempotencyKeys.set(command.idempotencyKey, Date.now());
    }

    // Update Execution Record
    execRecord.status = 'FILLED';
    execRecord.orderTicket = ticketNumber;
    execRecord.price = entryPrice;
    execRecord.reconciled = true;
    execRecord.updatedAt = new Date().toISOString();

    // 7. Recalculate Demo Account Financials
    this.recalculateAccount(account.id);

    // 8. Audit Logging
    db.recordAudit(
      command.userId,
      account.userId,
      'customer',
      'DEMO_ORDER_OPENED',
      'demo_positions',
      `Opened #${ticketNumber} ${command.symbol} ${command.type} ${command.lots} lots @ ${entryPrice}`,
      '127.0.0.1',
      newPosition.id
    );

    return {
      success: true,
      position: newPosition,
      account: db.getOrCreateDemoAccount(command.userId),
      message: `Simulated #${ticketNumber} ${command.type} order for ${command.lots} ${command.symbol} executed at ${entryPrice}.`,
      reconciled: true,
      executionStatus: 'FILLED',
    };
  }

  /**
   * CRITICAL RECONCILIATION RULE:
   * If an execution result is UNKNOWN (e.g. timeout, network glitch, delayed worker ack),
   * DO NOT blindly retry.
   * Query the terminal/broker state first, verify if the order ticket or position exists,
   * and resolve state conclusively before returning control or re-dispatching.
   */
  public async reconcileUnknownExecution(execId: string): Promise<OrderExecutionRecord | null> {
    const record = this.executionRecords.get(execId);
    if (!record) return null;

    record.reconciliationAttempts++;
    record.updatedAt = new Date().toISOString();

    // Query terminal memory for existing ticket matching idempotency or ticket
    const existingPosition = db.demoPositions.find(p => 
      (record.orderTicket && p.positionTicket === record.orderTicket) ||
      p.symbol === record.symbol && p.lots === record.lots && p.mt5AccountId === record.mt5AccountId
    );

    if (existingPosition) {
      // Order actually succeeded at the terminal
      record.status = 'FILLED';
      record.reconciled = true;
      record.orderTicket = existingPosition.positionTicket;
    } else if (record.reconciliationAttempts >= 3) {
      // Confirmed after 3 reconciliation attempts that terminal did not execute
      record.status = 'CANCELLED';
      record.reconciled = true;
      record.errorMessage = 'Reconciliation confirmed order never reached terminal execution queue.';
    }

    return record;
  }

  public getExecutionRecord(execId: string): OrderExecutionRecord | undefined {
    return this.executionRecords.get(execId);
  }

  /**
   * Close a demo position manually or via admin
   */
  public async closePosition(
    positionId: string,
    actorUserId: string,
    isAdmin: boolean = false,
    reason: string = 'manual_close'
  ): Promise<DemoOrderResult> {
    const position = db.demoPositions.find(p => p.id === positionId && p.status === 'open');
    if (!position) {
      return {
        success: false,
        message: 'Open demo position not found or already closed.',
        errorCode: 'ERR_POSITION_NOT_FOUND',
      };
    }

    const account = db.demoAccounts.find(a => a.id === position.mt5AccountId);
    if (!account) {
      return {
        success: false,
        message: 'Associated demo account not found.',
        errorCode: 'ERR_ACCOUNT_NOT_FOUND',
      };
    }

    // Strict Tenant Isolation check (unless admin)
    if (!isAdmin && account.userId !== actorUserId) {
      return {
        success: false,
        message: 'Unauthorized: You do not have permission to close this position.',
        errorCode: 'ERR_FORBIDDEN_TENANT',
      };
    }

    const quote = marketSimulator.getQuote(position.symbol);
    const closePrice = position.type === 'BUY' ? quote.bid : quote.ask;
    const grossPnl = marketSimulator.calculatePnl(
      position.symbol,
      position.type,
      position.lots,
      position.openPrice,
      closePrice
    );
    const netPnl = Number((grossPnl + (position.swap || 0) + (position.commission || 0)).toFixed(2));

    // Update position
    position.status = 'closed';
    position.closePrice = closePrice;
    position.closeTime = new Date().toISOString();
    position.profit = netPnl;
    position.currentPnl = 0;

    // Update Account Stats
    account.balance = Number((account.balance + netPnl).toFixed(2));
    account.realizedPnl = Number((account.realizedPnl + netPnl).toFixed(2));
    account.dailyPnl = Number((account.dailyPnl + netPnl).toFixed(2));
    account.totalPnl = Number((account.totalPnl + netPnl).toFixed(2));
    account.totalTrades++;
    if (netPnl > 0) {
      account.winningTrades++;
    } else {
      account.losingTrades++;
    }
    account.winRatePct = Number(((account.winningTrades / account.totalTrades) * 100).toFixed(1));
    account.peakBalance = Math.max(account.peakBalance, account.balance);
    account.updatedAt = new Date().toISOString();

    // Recalculate remaining open margins
    this.recalculateAccount(account.id);

    db.recordAudit(
      actorUserId,
      account.userId,
      isAdmin ? 'admin' : 'customer',
      'DEMO_POSITION_CLOSED',
      'demo_positions',
      `Closed #${position.positionTicket} ${position.symbol} @ ${closePrice} (${reason}). Net P&L: $${netPnl.toFixed(2)}`,
      '127.0.0.1',
      position.id
    );

    return {
      success: true,
      position,
      account,
      message: `Position #${position.positionTicket} successfully closed at ${closePrice}. Realized P&L: $${netPnl.toFixed(2)}.`,
    };
  }

  /**
   * Recalculates Used Margin, Free Margin, Equity, and Margin Level for an account
   */
  public recalculateAccount(accountId: string): void {
    const account = db.demoAccounts.find(a => a.id === accountId);
    if (!account) return;

    const openPositions = db.demoPositions.filter(p => p.mt5AccountId === account.id && p.status === 'open');

    let totalFloatingPnl = 0;
    let totalUsedMargin = 0;

    for (const pos of openPositions) {
      totalFloatingPnl += (pos.currentPnl || 0);
      const reqMargin = marketSimulator.calculateRequiredMargin(
        pos.symbol,
        pos.lots,
        pos.openPrice,
        account.leverage || 100
      );
      totalUsedMargin += reqMargin;
    }

    account.unrealizedPnl = Number(totalFloatingPnl.toFixed(2));
    account.equity = Number((account.balance + account.unrealizedPnl).toFixed(2));
    account.usedMargin = Number(totalUsedMargin.toFixed(2));
    account.freeMargin = Number((account.equity - account.usedMargin).toFixed(2));
    account.marginLevel = account.usedMargin > 0
      ? Number(((account.equity / account.usedMargin) * 100).toFixed(1))
      : 0;

    // Peak Balance & Drawdown
    account.peakBalance = Math.max(account.peakBalance, account.equity, account.balance);
    const drawdownAmount = account.peakBalance - account.equity;
    account.maxDrawdownPct = account.peakBalance > 0
      ? Number(((drawdownAmount / account.peakBalance) * 100).toFixed(1))
      : 0;
    if (account.maxDrawdownPct < 0) account.maxDrawdownPct = 0;

    account.updatedAt = new Date().toISOString();
  }

  /**
   * Market Tick Callback:
   * 1. Evaluates all open positions against incoming quotes
   * 2. Triggers SL and TP orders automatically
   * 3. Recalculates equity and margin for all demo accounts
   */
  public onMarketTick(quotes: Record<string, MarketQuote>): void {
    const openPositions = db.demoPositions.filter(p => p.status === 'open');
    if (openPositions.length === 0) return;

    const touchedAccounts = new Set<string>();

    for (const pos of openPositions) {
      const q = quotes[pos.symbol];
      if (!q) continue;

      const evalPrice = pos.type === 'BUY' ? q.bid : q.ask;
      pos.currentPrice = evalPrice;

      const rawPnl = marketSimulator.calculatePnl(
        pos.symbol,
        pos.type,
        pos.lots,
        pos.openPrice,
        evalPrice
      );
      pos.currentPnl = Number((rawPnl + (pos.swap || 0) + (pos.commission || 0)).toFixed(2));
      touchedAccounts.add(pos.mt5AccountId);

      // Check Stop Loss Trigger
      let triggerSl = false;
      if (pos.stopLoss && pos.stopLoss > 0) {
        if (pos.type === 'BUY' && evalPrice <= pos.stopLoss) triggerSl = true;
        if (pos.type === 'SELL' && evalPrice >= pos.stopLoss) triggerSl = true;
      }

      // Check Take Profit Trigger
      let triggerTp = false;
      if (pos.takeProfit && pos.takeProfit > 0) {
        if (pos.type === 'BUY' && evalPrice >= pos.takeProfit) triggerTp = true;
        if (pos.type === 'SELL' && evalPrice <= pos.takeProfit) triggerTp = true;
      }

      if (triggerSl) {
        this.closePosition(pos.id, 'system_engine', true, 'Stop Loss Triggered');
      } else if (triggerTp) {
        this.closePosition(pos.id, 'system_engine', true, 'Take Profit Triggered');
      }
    }

    for (const accId of touchedAccounts) {
      this.recalculateAccount(accId);
    }
  }

  /**
   * Reset Demo Account back to pristine initial capital ($10,000)
   */
  public resetAccount(userId: string): DemoAccount {
    const account = db.getOrCreateDemoAccount(userId);

    // Archive / Close open demo positions
    const openPositions = db.demoPositions.filter(p => p.mt5AccountId === account.id && p.status === 'open');
    for (const p of openPositions) {
      p.status = 'closed';
      p.closePrice = p.openPrice;
      p.closeTime = new Date().toISOString();
      p.profit = 0;
    }

    // Reset financial metrics
    account.initialBalance = 10000.00;
    account.balance = 10000.00;
    account.equity = 10000.00;
    account.usedMargin = 0;
    account.freeMargin = 10000.00;
    account.marginLevel = 0;
    account.unrealizedPnl = 0;
    account.realizedPnl = 0;
    account.dailyPnl = 0;
    account.totalPnl = 0;
    account.peakBalance = 10000.00;
    account.maxDrawdownPct = 0;
    account.winRatePct = 0;
    account.winningTrades = 0;
    account.losingTrades = 0;
    account.totalTrades = 0;
    account.tradingPaused = false;
    account.status = 'reset';
    account.updatedAt = new Date().toISOString();

    db.recordAudit(
      userId,
      userId,
      'customer',
      'DEMO_ACCOUNT_RESET',
      'demo_accounts',
      `Reset demo account balance to $10,000.00 and cleared open positions.`,
      '127.0.0.1',
      account.id
    );

    return account;
  }

  /**
   * Pause or Resume trading for a specific customer demo account
   */
  public setTradingPaused(userId: string, paused: boolean, adminActorId?: string): DemoAccount {
    const account = db.getOrCreateDemoAccount(userId);
    account.tradingPaused = paused;
    account.status = paused ? 'paused' : 'active';
    account.updatedAt = new Date().toISOString();

    db.recordAudit(
      adminActorId || userId,
      userId,
      adminActorId ? 'admin' : 'customer',
      paused ? 'DEMO_TRADING_PAUSED' : 'DEMO_TRADING_RESUMED',
      'demo_accounts',
      `Demo trading ${paused ? 'PAUSED' : 'RESUMED'} for account ${account.accountNumber}`,
      '127.0.0.1',
      account.id
    );

    return account;
  }
}

export const demoExecutionEngine = DemoExecutionEngine.getInstance();
