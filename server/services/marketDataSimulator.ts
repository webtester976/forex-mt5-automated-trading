import { MarketQuote } from '../../src/types/index.js';

type TickListener = (quotes: Record<string, MarketQuote>) => void;

interface SymbolConfig {
  digits: number;
  contractSize: number;
  pipValue: number;
  spreadPips: number;
  baseBid: number;
  minPrice: number;
  maxPrice: number;
}

const SYMBOL_CONFIGS: Record<string, SymbolConfig> = {
  EURUSD: {
    digits: 5,
    contractSize: 100000,
    pipValue: 10,
    spreadPips: 0.8,
    baseBid: 1.08860,
    minPrice: 1.05000,
    maxPrice: 1.12000,
  },
  GBPUSD: {
    digits: 5,
    contractSize: 100000,
    pipValue: 10,
    spreadPips: 1.2,
    baseBid: 1.29340,
    minPrice: 1.25000,
    maxPrice: 1.34000,
  },
  USDJPY: {
    digits: 3,
    contractSize: 100000,
    pipValue: 6.53,
    spreadPips: 1.2,
    baseBid: 153.220,
    minPrice: 145.000,
    maxPrice: 160.000,
  },
  XAUUSD: {
    digits: 2,
    contractSize: 100,
    pipValue: 10,
    spreadPips: 2.5,
    baseBid: 2685.70,
    minPrice: 2500.00,
    maxPrice: 2850.00,
  },
};

export class MarketDataSimulator {
  private static instance: MarketDataSimulator;
  private quotes: Record<string, MarketQuote> = {};
  private tickInterval: NodeJS.Timeout | null = null;
  private listeners: Set<TickListener> = new Set();
  private isDeterministic: boolean = false;

  private constructor() {
    this.initQuotes();
    this.startSimulation();
  }

  public static getInstance(): MarketDataSimulator {
    if (!MarketDataSimulator.instance) {
      MarketDataSimulator.instance = new MarketDataSimulator();
    }
    return MarketDataSimulator.instance;
  }

  private initQuotes() {
    const now = new Date().toISOString();
    for (const [symbol, cfg] of Object.entries(SYMBOL_CONFIGS)) {
      const pipMultiplier = Math.pow(10, -cfg.digits + (cfg.digits === 3 || cfg.digits === 5 ? 1 : 0));
      const spreadAmount = cfg.spreadPips * (cfg.digits === 5 ? 0.0001 : cfg.digits === 3 ? 0.01 : 0.1);
      const bid = cfg.baseBid;
      const ask = Number((bid + spreadAmount).toFixed(cfg.digits));

      this.quotes[symbol] = {
        symbol,
        bid,
        ask,
        spreadPips: cfg.spreadPips,
        digits: cfg.digits,
        contractSize: cfg.contractSize,
        pipValue: cfg.pipValue,
        change24hPct: 0.18,
        high24h: Number((bid * 1.004).toFixed(cfg.digits)),
        low24h: Number((bid * 0.996).toFixed(cfg.digits)),
        updatedAt: now,
      };
    }
  }

  private startSimulation() {
    if (this.tickInterval) return;

    this.tickInterval = setInterval(() => {
      if (this.isDeterministic) return;
      this.generateTick();
    }, 2000);
    if (this.tickInterval.unref) {
      this.tickInterval.unref();
    }
  }

  public subscribeTicks(listener: TickListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private generateTick() {
    const symbols = Object.keys(this.quotes);
    // Randomly pick 1-2 symbols to nudge each cycle
    const affected = symbols.filter(() => Math.random() > 0.3);

    for (const symbol of affected) {
      const q = this.quotes[symbol];
      const cfg = SYMBOL_CONFIGS[symbol];
      if (!q || !cfg) continue;

      const pipUnit = cfg.digits === 5 ? 0.0001 : cfg.digits === 3 ? 0.01 : 0.1;
      // Step between -1.5 and +1.5 pips
      const step = (Math.random() - 0.49) * 3 * pipUnit;
      let newBid = Number((q.bid + step).toFixed(cfg.digits));

      // Guard rails
      if (newBid < cfg.minPrice) newBid = cfg.minPrice + pipUnit;
      if (newBid > cfg.maxPrice) newBid = cfg.maxPrice - pipUnit;

      const spreadAmount = cfg.spreadPips * (cfg.digits === 5 ? 0.0001 : cfg.digits === 3 ? 0.01 : 0.1);
      const newAsk = Number((newBid + spreadAmount).toFixed(cfg.digits));

      this.quotes[symbol] = {
        ...q,
        bid: newBid,
        ask: newAsk,
        high24h: Math.max(q.high24h, newBid),
        low24h: Math.min(q.low24h, newBid),
        updatedAt: new Date().toISOString(),
      };
    }

    this.notifyListeners();
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.quotes);
      } catch (err) {
        console.error('[MarketDataSimulator] Error in tick listener:', err);
      }
    }
  }

  public getQuotes(): Record<string, MarketQuote> {
    return { ...this.quotes };
  }

  public getQuote(symbol: string): MarketQuote {
    const q = this.quotes[symbol];
    if (!q) {
      const cfg = SYMBOL_CONFIGS[symbol] || SYMBOL_CONFIGS['EURUSD'];
      return {
        symbol,
        bid: cfg.baseBid,
        ask: cfg.baseBid + 0.0001,
        spreadPips: cfg.spreadPips,
        digits: cfg.digits,
        contractSize: cfg.contractSize,
        pipValue: cfg.pipValue,
        change24hPct: 0.0,
        high24h: cfg.baseBid,
        low24h: cfg.baseBid,
        updatedAt: new Date().toISOString(),
      };
    }
    return { ...q };
  }

  /**
   * Deterministic price setting for automated tests and unit testing
   */
  public setDeterministicQuote(symbol: string, bid: number, ask?: number) {
    this.isDeterministic = true;
    const cfg = SYMBOL_CONFIGS[symbol] || { digits: 5, contractSize: 100000, pipValue: 10, spreadPips: 1.0 };
    const spreadAmount = cfg.spreadPips * (cfg.digits === 5 ? 0.0001 : cfg.digits === 3 ? 0.01 : 0.1);
    const finalAsk = ask !== undefined ? ask : Number((bid + spreadAmount).toFixed(cfg.digits));

    this.quotes[symbol] = {
      symbol,
      bid,
      ask: finalAsk,
      spreadPips: cfg.spreadPips,
      digits: cfg.digits,
      contractSize: cfg.contractSize,
      pipValue: cfg.pipValue,
      change24hPct: 0,
      high24h: Math.max(bid, finalAsk),
      low24h: Math.min(bid, finalAsk),
      updatedAt: new Date().toISOString(),
    };

    this.notifyListeners();
  }

  public resetQuotes() {
    this.isDeterministic = false;
    this.initQuotes();
    this.notifyListeners();
  }

  /**
   * Accurate Forex / Commodity P&L calculation:
   * BUY: (currentPrice - openPrice) * lots * contractSize
   * SELL: (openPrice - currentPrice) * lots * contractSize
   * For USDJPY (where USD is base), converted to quote currency / current rate.
   */
  public calculatePnl(symbol: string, type: 'BUY' | 'SELL', lots: number, openPrice: number, currentPrice: number): number {
    const cfg = SYMBOL_CONFIGS[symbol] || { digits: 5, contractSize: 100000 };
    const priceDiff = type === 'BUY' ? (currentPrice - openPrice) : (openPrice - currentPrice);

    if (symbol === 'USDJPY') {
      // (diff in JPY * lots * 100,000) / currentPrice
      const rawJpy = priceDiff * lots * cfg.contractSize;
      return Number((rawJpy / (currentPrice || 153.0)).toFixed(2));
    }

    // Direct USD pairs: EURUSD, GBPUSD, XAUUSD
    const rawUsd = priceDiff * lots * cfg.contractSize;
    return Number(rawUsd.toFixed(2));
  }

  /**
   * Required Margin calculation:
   * Margin = (lots * contractSize * openPrice) / leverage
   */
  public calculateRequiredMargin(symbol: string, lots: number, entryPrice: number, leverage: number): number {
    const cfg = SYMBOL_CONFIGS[symbol] || { contractSize: 100000 };
    const lev = leverage > 0 ? leverage : 100;

    if (symbol === 'USDJPY') {
      // USD is base: (lots * 100,000) / leverage
      return Number(((lots * cfg.contractSize) / lev).toFixed(2));
    }

    // EURUSD, GBPUSD, XAUUSD: (lots * contractSize * entryPrice) / leverage
    return Number(((lots * cfg.contractSize * entryPrice) / lev).toFixed(2));
  }
}

export const marketSimulator = MarketDataSimulator.getInstance();
