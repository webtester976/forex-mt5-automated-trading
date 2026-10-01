import { db } from '../db/store.js';

export interface PreExecutionRiskCheckResult {
  allowed: boolean;
  reason?: string;
  code?: string;
}

export class RiskEngine {
  /**
   * Pre-trade risk validation: executed BEFORE any command is dispatched to MT5 workers.
   */
  public static validateTradeExecution(
    userId: string,
    mt5AccountId: string,
    algorithmId: string,
    symbol: string,
    lots: number
  ): PreExecutionRiskCheckResult {
    // 1. Check Global Emergency Kill Switch
    if (db.killSwitches.globalKillSwitch) {
      return {
        allowed: false,
        reason: 'Execution blocked: Global Platform Emergency Kill Switch is ACTIVE.',
        code: 'ERR_GLOBAL_KILL_SWITCH_ACTIVE',
      };
    }

    // 2. Check Per-Algorithm Kill Switch
    if (db.killSwitches.perAlgorithm[algorithmId]) {
      return {
        allowed: false,
        reason: `Execution blocked: Trading algorithm [${algorithmId}] has been temporarily halted by Risk Officers.`,
        code: 'ERR_ALGO_HALTED',
      };
    }

    // 3. Check Per-Account Kill Switch
    if (db.killSwitches.perAccount[mt5AccountId]) {
      return {
        allowed: false,
        reason: 'Execution blocked: Emergency halt active on this specific MT5 account.',
        code: 'ERR_ACCOUNT_HALTED',
      };
    }

    // 4. Retrieve and inspect customer's risk profile
    const profile = db.riskSettings.get(userId) || {
      maxDailyLossPct: 3.0,
      maxDrawdownPct: 8.0,
      maxLotSize: 2.0,
      maxOpenTrades: 5,
      tradingSession: 'ALL_SESSIONS',
      emergencyStop: false,
    };

    if (profile.emergencyStop) {
      return {
        allowed: false,
        reason: 'Execution blocked: Customer emergency stop toggle is enabled in settings.',
        code: 'ERR_CUSTOMER_EMERGENCY_STOP',
      };
    }

    // 5. Lot Size Ceiling Check
    if (lots > profile.maxLotSize) {
      return {
        allowed: false,
        reason: `Order lot size (${lots}) exceeds user maximum allowable lot ceiling (${profile.maxLotSize} lots).`,
        code: 'ERR_MAX_LOT_EXCEEDED',
      };
    }

    // 6. Max Concurrent Open Trades Check
    const openTrades = db.positions.filter(p => p.mt5AccountId === mt5AccountId && p.status === 'open');
    const maxAllowedTrades = profile.maxOpenTrades || 10;
    if (openTrades.length >= maxAllowedTrades) {
      return {
        allowed: false,
        reason: `Account already has ${openTrades.length} open positions, reaching the limit of ${maxAllowedTrades}.`,
        code: 'ERR_MAX_OPEN_POSITIONS_REACHED',
      };
    }

    // 7. Verify MT5 Account Health & Margin
    const account = db.mt5Accounts.find(a => a.id === mt5AccountId);
    if (!account) {
      return {
        allowed: false,
        reason: 'MT5 account not found.',
        code: 'ERR_ACCOUNT_NOT_FOUND',
      };
    }

    if (account.connectionStatus !== 'connected') {
      return {
        allowed: false,
        reason: `Cannot execute order: MT5 terminal is currently ${account.connectionStatus}.`,
        code: 'ERR_MT5_NOT_CONNECTED',
      };
    }

    // Check Margin Level (Safety buffer: minimum 200% margin level)
    if (account.marginLevel > 0 && account.marginLevel < 200) {
      return {
        allowed: false,
        reason: `Margin level critically low (${account.marginLevel.toFixed(1)}%). Trade rejected to protect capital.`,
        code: 'ERR_MARGIN_CRITICAL',
      };
    }

    return { allowed: true };
  }
}
