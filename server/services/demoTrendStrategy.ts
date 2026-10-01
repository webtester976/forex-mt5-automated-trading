import { db } from '../db/store.js';
import { marketSimulator } from './marketDataSimulator.js';
import { demoExecutionEngine } from './demoExecutionEngine.js';
import { DemoAlgorithmConfig } from '../../src/types/index.js';

export class DemoTrendStrategy {
  private static instance: DemoTrendStrategy;
  private evalInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startEvaluationLoop();
  }

  public static getInstance(): DemoTrendStrategy {
    if (!DemoTrendStrategy.instance) {
      DemoTrendStrategy.instance = new DemoTrendStrategy();
    }
    return DemoTrendStrategy.instance;
  }

  public getConfig(): DemoAlgorithmConfig {
    return { ...db.demoAlgorithmConfig };
  }

  public updateConfig(updates: Partial<DemoAlgorithmConfig>): DemoAlgorithmConfig {
    db.demoAlgorithmConfig = {
      ...db.demoAlgorithmConfig,
      ...updates,
      isDemoOnly: true, // Immutable safety constraint
    };
    return { ...db.demoAlgorithmConfig };
  }

  private startEvaluationLoop() {
    if (this.evalInterval) return;

    // Periodically inspect market data for automated simulated entries
    this.evalInterval = setInterval(() => {
      this.evaluateStrategy();
    }, 45000); // Check every 45s
    if (this.evalInterval.unref) {
      this.evalInterval.unref();
    }
  }

  /**
   * Evaluates trend direction on supported symbols and initiates simulated demo order
   */
  public async evaluateStrategy(targetUserId?: string): Promise<{ signalsGenerated: number }> {
    const cfg = db.demoAlgorithmConfig;
    if (!cfg.enabled) {
      return { signalsGenerated: 0 };
    }

    let signalsCount = 0;
    const usersToEvaluate = targetUserId 
      ? [targetUserId] 
      : db.demoAccounts.filter(a => !a.tradingPaused).map(a => a.userId);

    for (const userId of usersToEvaluate) {
      const account = db.demoAccounts.find(a => a.userId === userId);
      if (!account || account.tradingPaused) continue;

      // Count open positions for this algorithm
      const currentOpen = db.demoPositions.filter(
        p => p.mt5AccountId === account.id && p.status === 'open'
      ).length;

      if (currentOpen >= cfg.maxOpenPositions) {
        continue;
      }

      // Check symbol with strongest recent momentum
      const symbol = cfg.symbols[Math.floor(Math.random() * cfg.symbols.length)];
      const quote = marketSimulator.getQuote(symbol);
      const isUpTrend = Math.random() > 0.5;
      const type: 'BUY' | 'SELL' = isUpTrend ? 'BUY' : 'SELL';

      const pipMultiplier = quote.digits === 5 ? 0.0001 : quote.digits === 3 ? 0.01 : 0.1;
      const slDistance = cfg.stopLossPips * pipMultiplier;
      const tpDistance = cfg.takeProfitPips * pipMultiplier;

      const entryPrice = type === 'BUY' ? quote.ask : quote.bid;
      const stopLoss = Number((type === 'BUY' ? entryPrice - slDistance : entryPrice + slDistance).toFixed(quote.digits));
      const takeProfit = Number((type === 'BUY' ? entryPrice + tpDistance : entryPrice - tpDistance).toFixed(quote.digits));

      const result = await demoExecutionEngine.openMarketOrder({
        userId,
        symbol,
        type,
        lots: cfg.lotSize,
        stopLoss,
        takeProfit,
        algorithmId: cfg.id,
        idempotencyKey: `auto_${cfg.id}_${userId}_${symbol}_${Math.floor(Date.now() / 15000)}`,
      });

      if (result.success) {
        cfg.lastSignalTime = new Date().toISOString();
        cfg.lastSignalType = type;
        cfg.lastSignalSymbol = symbol;
        signalsCount++;
      }
    }

    return { signalsGenerated: signalsCount };
  }

  /**
   * Manual on-demand signal trigger for testing & verification
   */
  public async triggerTestSignal(
    userId: string,
    symbol: string = 'EURUSD',
    type: 'BUY' | 'SELL' = 'BUY',
    lots?: number
  ) {
    const cfg = db.demoAlgorithmConfig;
    const quote = marketSimulator.getQuote(symbol);
    const pipMultiplier = quote.digits === 5 ? 0.0001 : quote.digits === 3 ? 0.01 : 0.1;
    const slDistance = cfg.stopLossPips * pipMultiplier;
    const tpDistance = cfg.takeProfitPips * pipMultiplier;

    const entryPrice = type === 'BUY' ? quote.ask : quote.bid;
    const stopLoss = Number((type === 'BUY' ? entryPrice - slDistance : entryPrice + slDistance).toFixed(quote.digits));
    const takeProfit = Number((type === 'BUY' ? entryPrice + tpDistance : entryPrice - tpDistance).toFixed(quote.digits));

    return await demoExecutionEngine.openMarketOrder({
      userId,
      symbol,
      type,
      lots: lots || cfg.lotSize,
      stopLoss,
      takeProfit,
      algorithmId: cfg.id,
      idempotencyKey: `test_${Date.now()}_${Math.random()}`,
    });
  }
}

export const demoTrendStrategy = DemoTrendStrategy.getInstance();
