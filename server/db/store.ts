import { 
  User, 
  MT5Account, 
  Position, 
  SubscriptionPlan, 
  Subscription, 
  SubscriptionStatus,
  PaymentRecord, 
  InvoiceRecord, 
  Algorithm, 
  AlgorithmVersion, 
  RiskSettings, 
  KillSwitchStatus, 
  SupportTicket, 
  NotificationItem, 
  AuditLogEntry, 
  WorkerHealthNode, 
  SocialPost,
  DemoAccount,
  DemoRiskEvent,
  DemoAlgorithmConfig,
  WorkerTradeCommand,
  WorkerExecutionReceipt
} from '../../src/types/index.js';
import { hashPassword, encryptCredential } from '../security/encryption.js';
import crypto from 'crypto';
import { pool } from '../../src/db/index.js';
import { seedPostgres } from './seedPostgres.js';

interface StoredUser extends User {
  passwordHash: string;
  salt: string;
}

/**
 * Determines if an MT5 account is actively synchronized by a real MT5 worker.
 * Checks the existing persisted account synchronization state:
 *   - assignedWorkerId exists
 *   - connectionStatus === 'connected'
 *   - lastSyncAt exists
 */
export function isRealWorkerAccount(account: {
  assignedWorkerId?: string | null;
  connectionStatus?: string | null;
  lastSyncAt?: string | null;
} | null | undefined): boolean {
  if (!account) return false;
  return Boolean(account.assignedWorkerId) &&
    account.connectionStatus === 'connected' &&
    Boolean(account.lastSyncAt);
}

class DatabaseStore {
  public users: StoredUser[] = [];
  public mt5Accounts: (MT5Account & { encryptedPassword?: string })[] = [];
  public positions: Position[] = [];
  public subscriptionPlans: SubscriptionPlan[] = [];
  public subscriptions: Subscription[] = [];
  public payments: PaymentRecord[] = [];
  public invoices: InvoiceRecord[] = [];
  public processedWebhookEvents: Set<string> = new Set();
  public algorithms: Algorithm[] = [];
  public algorithmVersions: AlgorithmVersion[] = [];
  public riskSettings: Map<string, RiskSettings> = new Map();
  public killSwitches: KillSwitchStatus = {
    globalKillSwitch: false,
    perAlgorithm: {},
    perAccount: {},
  };
  public supportTickets: SupportTicket[] = [];
  public notifications: NotificationItem[] = [];
  public auditLogs: AuditLogEntry[] = [];
  public workerNodes: WorkerHealthNode[] = [];
  public socialPosts: SocialPost[] = [];

  // Demo Trading Engine Storage
  public demoAccounts: DemoAccount[] = [];
  public demoPositions: Position[] = [];
  public demoRiskEvents: DemoRiskEvent[] = [];
  public demoAlgorithmConfig: DemoAlgorithmConfig = {
    id: 'algo_demo_trend',
    name: 'Demo Trend Strategy',
    description: 'Simulated momentum trend follower for demo testing. Operates strictly in sandbox environment.',
    isDemoOnly: true,
    enabled: true,
    symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'],
    lotSize: 0.10,
    maxOpenPositions: 3,
    stopLossPips: 30,
    takeProfitPips: 60,
    maxDailyLossUsd: 500,
    maxDrawdownPct: 8.0,
    timeframe: 'M15',
  };
  public demoProcessedIdempotencyKeys: Map<string, number> = new Map();
  public demoGlobalKillSwitch: boolean = false;

  // Real MT5 Worker Command Queue (Phase 1)
  public workerCommands: WorkerTradeCommand[] = [];
  public workerCommandIdempotencyKeys: Map<string, string> = new Map();

  // Manual Trade Close Permissions
  public globalManualTradeCloseEnabled: boolean = false;

  constructor() {
    this.seed();
  }

  private seed() {
    // 1. Seed Users (Admins and Customers)
    const superAdminAuth = hashPassword('SuperAdmin123!');
    const superAdmin: StoredUser = {
      id: 'usr_super_admin',
      email: 'superadmin@forexsaas.com',
      firstName: 'Chief',
      lastName: 'Administrator',
      role: 'super_admin',
      status: 'active',
      kycStatus: 'verified',
      manualTradeCloseEnabled: false,
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      passwordHash: superAdminAuth.hash,
      salt: superAdminAuth.salt,
    };

    const riskOfficerAuth = hashPassword('RiskManager123!');
    const riskOfficer: StoredUser = {
      id: 'usr_risk_officer',
      email: 'risk@forexsaas.com',
      firstName: 'Marcus',
      lastName: 'Vance',
      role: 'risk_officer',
      status: 'active',
      kycStatus: 'verified',
      manualTradeCloseEnabled: false,
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      passwordHash: riskOfficerAuth.hash,
      salt: riskOfficerAuth.salt,
    };

    const supportLeadAuth = hashPassword('SupportDesk123!');
    const supportLead: StoredUser = {
      id: 'usr_support_lead',
      email: 'support@forexsaas.com',
      firstName: 'Elena',
      lastName: 'Rostova',
      role: 'support',
      status: 'active',
      kycStatus: 'verified',
      manualTradeCloseEnabled: false,
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      passwordHash: supportLeadAuth.hash,
      salt: supportLeadAuth.salt,
    };

    const customerAlexAuth = hashPassword('CustomerPass123!');
    const customerAlex: StoredUser = {
      id: 'usr_customer_alex',
      email: 'alex.morgan@example.com',
      firstName: 'Alex',
      lastName: 'Morgan',
      role: 'customer',
      status: 'active',
      kycStatus: 'verified',
      manualTradeCloseEnabled: false,
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      passwordHash: customerAlexAuth.hash,
      salt: customerAlexAuth.salt,
    };

    const customerSarahAuth = hashPassword('CustomerPass123!');
    const customerSarah: StoredUser = {
      id: 'usr_customer_sarah',
      email: 'sarah.chen@example.com',
      firstName: 'Sarah',
      lastName: 'Chen',
      role: 'customer',
      status: 'active',
      kycStatus: 'verified',
      manualTradeCloseEnabled: false,
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      passwordHash: customerSarahAuth.hash,
      salt: customerSarahAuth.salt,
    };

    this.users.push(superAdmin, riskOfficer, supportLead, customerAlex, customerSarah);

    // 2. Seed Subscription Plans (5 Required Plans + Legacy Mappings)
    this.subscriptionPlans = [
      {
        id: 'plan_monthly',
        code: 'MONTHLY_PLAN',
        name: 'Monthly Quant Plan',
        description: 'Full automated execution on retail and prop firm accounts with 30-day flexibility.',
        interval: 'monthly',
        priceUsd: 99,
        profitSharePct: 0,
        maxMt5Accounts: 1,
        maxTradingVolumeLots: 25,
        features: [
          '1 Connected MT5 Account',
          'Alpha Trend Falcon Strategy',
          'Automated Daily Risk Stop-Loss',
          'Standard Execution Speed (London VPS)',
          'Daily Telegram Performance Reports',
          'No lock-in contract, cancel anytime',
        ],
        isActive: true,
      },
      {
        id: 'plan_quarterly',
        code: 'QUARTERLY_3M_PLAN',
        name: '3-Month Quant Plan',
        description: 'Quarterly commitment with 10% discount for consistent algorithmic compounding.',
        interval: 'quarterly',
        priceUsd: 269,
        profitSharePct: 0,
        maxMt5Accounts: 2,
        maxTradingVolumeLots: 50,
        features: [
          'Up to 2 MT5 Accounts (Demo & Live)',
          'Alpha Trend Falcon + Breakout Matrix',
          'Priority Equinix LD4 Sub-Millisecond VPS',
          'Automated Drawdown Guardian',
          'Instant Telegram Signals & Trade Notifications',
          'Saves ~10% vs monthly billing',
        ],
        isActive: true,
      },
      {
        id: 'plan_biannual',
        code: 'BIANNUAL_6M_PLAN',
        name: '6-Month Quant Plan',
        description: 'Half-year semi-annual portfolio allocation with advanced risk management.',
        interval: 'biannual',
        priceUsd: 499,
        profitSharePct: 0,
        maxMt5Accounts: 4,
        maxTradingVolumeLots: 100,
        features: [
          'Up to 4 MT5 Accounts',
          'All 3 Core Strategies Active',
          'Equinix LD4 Cross-Connect VPS',
          'Custom Risk Ceiling & Position Sizing Controls',
          'Multi-symbol correlation filter',
          'Saves ~16% vs monthly billing',
        ],
        isActive: true,
      },
      {
        id: 'plan_yearly',
        code: 'YEARLY_ANNUAL_PLAN',
        name: 'Yearly Institutional Plan',
        description: 'Maximum annual savings for high-capital traders, hedge accounts, and prop managers.',
        interval: 'yearly',
        priceUsd: 899,
        profitSharePct: 0,
        maxMt5Accounts: 10,
        maxTradingVolumeLots: 500,
        features: [
          'Up to 10 MT5 Accounts',
          'Dedicated VPS Worker Node per account',
          'Zero-Latency Cross-Connect in Equinix NY4/LD4',
          'Custom Risk Manager API & Kill-Switch Webhooks',
          'Multi-broker Aggregation & Copier Support',
          'Direct 24/7 Access to Quant Risk Lead',
          'Maximum 25% savings vs monthly billing',
        ],
        isActive: true,
      },
      {
        id: 'plan_profit_share',
        code: 'PERFORMANCE_PROFIT_SHARE',
        name: 'High-Water Mark Profit Share',
        description: '$0 upfront fee. We only succeed when your trading balance achieves new net profits.',
        interval: 'profit_share',
        priceUsd: 0,
        profitSharePct: 20,
        maxMt5Accounts: 2,
        maxTradingVolumeLots: 100,
        features: [
          'Zero Upfront Subscription Fee',
          '20% Monthly High-Water Mark Performance Fee',
          'Institutional Grade Algorithm Allocation',
          'Transparent Audit Statements & Invoicing',
          'Strict Drawdown Protection & Stop-Loss Safeguards',
        ],
        isActive: true,
      },
      {
        id: 'plan_starter',
        code: 'STARTER_MONTHLY',
        name: 'Starter Trader',
        description: 'Ideal for small retail trading accounts up to $10,000 balance.',
        interval: 'monthly',
        priceUsd: 99,
        profitSharePct: 0,
        maxMt5Accounts: 1,
        maxTradingVolumeLots: 10,
        features: [
          '1 Connected MT5 Account',
          'Alpha Trend Falcon Strategy',
          'Automated Daily Risk Stop-Loss',
          'Standard Execution Speed (London VPS)',
          'Daily Telegram Performance Reports',
        ],
        isActive: true,
      },
      {
        id: 'plan_pro',
        code: 'PRO_QUANT_MONTHLY',
        name: 'Pro Quant Suite',
        description: 'For active traders running diversified strategies up to $50,000 balance.',
        interval: 'monthly',
        priceUsd: 199,
        profitSharePct: 0,
        maxMt5Accounts: 3,
        maxTradingVolumeLots: 50,
        features: [
          'Up to 3 MT5 Accounts (Demo & Live)',
          'Access to All 3 Core Algorithms',
          'Real-time Equinix LD4 Sub-Millisecond Execution',
          'Customizable Risk Parameter Dashboard',
          'Instant Trade Open/Close Webhooks & SMS',
          'Priority Helpdesk & Technical Support',
        ],
        isActive: true,
      },
      {
        id: 'plan_elite',
        code: 'INSTITUTIONAL_ANNUAL',
        name: 'Institutional Elite',
        description: 'Dedicated institutional infrastructure for large capital & prop firm accounts.',
        interval: 'yearly',
        priceUsd: 1899,
        profitSharePct: 0,
        maxMt5Accounts: 10,
        maxTradingVolumeLots: 500,
        features: [
          'Up to 10 MT5 Accounts',
          'Prop Firm Challenge Guardian (DD Prevention)',
          'Dedicated Private Windows Server VPS',
          'White-glove 1-on-1 Risk Architecture Review',
          'Custom Algo Parameter Optimization Engine',
          '24/7 Direct Dedicated WhatsApp/Phone Support',
        ],
        isActive: true,
      },
    ];

    // 3. Seed Subscriptions
    this.subscriptions.push({
      id: 'sub_alex_001',
      userId: customerAlex.id,
      planId: 'plan_pro',
      planName: 'Pro Quant Suite',
      status: 'active',
      stripeCustomerId: 'cus_test_alex_9921',
      stripeSubscriptionId: 'sub_test_alex_8812',
      currentPeriodStart: new Date(Date.now() - 10 * 86400000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 20 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      priceUsd: 199,
      interval: 'monthly',
    });

    this.subscriptions.push({
      id: 'sub_sarah_002',
      userId: customerSarah.id,
      planId: 'plan_elite',
      planName: 'Institutional Elite',
      status: 'active',
      stripeCustomerId: 'cus_test_sarah_4410',
      stripeSubscriptionId: 'sub_test_sarah_1109',
      currentPeriodStart: new Date(Date.now() - 5 * 86400000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 360 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      priceUsd: 1899,
      interval: 'yearly',
    });

    // 4. Seed Payments
    this.payments.push(
      {
        id: 'pay_001',
        userId: customerAlex.id,
        subscriptionId: 'sub_alex_001',
        provider: 'stripe',
        transactionId: 'ch_3N8k2vH9823hJk2',
        amountUsd: 199,
        currency: 'USD',
        status: 'succeeded',
        invoiceNumber: 'INV-2026-0891',
        stripeCustomerId: 'cus_test_alex_9921',
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
      {
        id: 'pay_002',
        userId: customerSarah.id,
        subscriptionId: 'sub_sarah_002',
        provider: 'stripe',
        transactionId: 'ch_9M2k1xQ8831bAa1',
        amountUsd: 1899,
        currency: 'USD',
        status: 'succeeded',
        invoiceNumber: 'INV-2026-0902',
        stripeCustomerId: 'cus_test_sarah_4410',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      }
    );

    // 4b. Seed Invoices
    this.invoices.push(
      {
        id: 'inv_001',
        paymentId: 'pay_001',
        userId: customerAlex.id,
        subscriptionId: 'sub_alex_001',
        invoiceNumber: 'INV-2026-0891',
        subtotal: 199.00,
        tax: 0.00,
        total: 199.00,
        status: 'paid',
        issuedDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
      },
      {
        id: 'inv_002',
        paymentId: 'pay_002',
        userId: customerSarah.id,
        subscriptionId: 'sub_sarah_002',
        invoiceNumber: 'INV-2026-0902',
        subtotal: 1899.00,
        tax: 0.00,
        total: 1899.00,
        status: 'paid',
        issuedDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
      }
    );

    // 5. Seed MT5 Accounts
    this.mt5Accounts.push(
      {
        id: 'mt5_alex_01',
        userId: customerAlex.id,
        brokerName: 'IC Markets Global',
        server: 'ICMarketsSC-Live08',
        loginId: '8092415',
        encryptedPassword: encryptCredential('SecurePassIC#2026'),
        accountType: 'live',
        currency: 'USD',
        leverage: 500,
        balance: 25480.00,
        equity: 26728.50,
        margin: 1420.00,
        freeMargin: 25308.50,
        marginLevel: 1882.28,
        floatingPnl: 1248.50,
        connectionStatus: 'connected',
        lastSyncAt: new Date().toISOString(),
        assignedWorkerId: 'Worker-LD4-UK',
      },
      {
        id: 'mt5_sarah_01',
        userId: customerSarah.id,
        brokerName: 'Pepperstone Financial',
        server: 'Pepperstone-Edge03',
        loginId: '4491209',
        encryptedPassword: encryptCredential('PepperP@ss992'),
        accountType: 'live',
        currency: 'USD',
        leverage: 200,
        balance: 52140.00,
        equity: 53890.00,
        margin: 2840.00,
        freeMargin: 51050.00,
        marginLevel: 1897.53,
        floatingPnl: 1750.00,
        connectionStatus: 'connected',
        lastSyncAt: new Date().toISOString(),
        assignedWorkerId: 'Worker-NY4-US',
      }
    );

    // 6. Seed Open Positions (Trade Cards)
    this.positions.push(
      {
        id: 'pos_101',
        mt5AccountId: 'mt5_alex_01',
        positionTicket: 98124012,
        symbol: 'EURUSD',
        type: 'BUY',
        lots: 1.50,
        openPrice: 1.08420,
        currentPrice: 1.08860,
        stopLoss: 1.08150,
        takeProfit: 1.09200,
        currentPnl: 660.00,
        swap: -4.50,
        commission: -9.00,
        status: 'open',
        openTime: new Date(Date.now() - 4 * 3600000).toISOString(),
        runtimeFormatted: '4h 12m',
      },
      {
        id: 'pos_102',
        mt5AccountId: 'mt5_alex_01',
        positionTicket: 98124883,
        symbol: 'GBPUSD',
        type: 'BUY',
        lots: 1.00,
        openPrice: 1.28910,
        currentPrice: 1.29340,
        stopLoss: 1.28500,
        takeProfit: 1.29800,
        currentPnl: 430.00,
        swap: -2.10,
        commission: -6.00,
        status: 'open',
        openTime: new Date(Date.now() - 2 * 3600000).toISOString(),
        runtimeFormatted: '2h 08m',
      },
      {
        id: 'pos_103',
        mt5AccountId: 'mt5_alex_01',
        positionTicket: 98125410,
        symbol: 'XAUUSD',
        type: 'BUY',
        lots: 0.50,
        openPrice: 2682.40,
        currentPrice: 2685.70,
        stopLoss: 2674.00,
        takeProfit: 2700.00,
        currentPnl: 165.00,
        swap: 0.00,
        commission: -5.00,
        status: 'open',
        openTime: new Date(Date.now() - 45 * 60000).toISOString(),
        runtimeFormatted: '45m',
      },
      {
        id: 'pos_201',
        mt5AccountId: 'mt5_sarah_01',
        positionTicket: 98126001,
        symbol: 'USDJPY',
        type: 'SELL',
        lots: 2.00,
        openPrice: 153.850,
        currentPrice: 153.220,
        stopLoss: 154.500,
        takeProfit: 152.000,
        currentPnl: 820.00,
        swap: 1.80,
        commission: -12.00,
        status: 'open',
        openTime: new Date(Date.now() - 6 * 3600000).toISOString(),
        runtimeFormatted: '6h 32m',
      },
      {
        id: 'pos_202',
        mt5AccountId: 'mt5_sarah_01',
        positionTicket: 98126540,
        symbol: 'AUDUSD',
        type: 'BUY',
        lots: 2.50,
        openPrice: 0.65800,
        currentPrice: 0.66172,
        stopLoss: 0.65400,
        takeProfit: 0.66700,
        currentPnl: 930.00,
        swap: -3.20,
        commission: -15.00,
        status: 'open',
        openTime: new Date(Date.now() - 3 * 3600000).toISOString(),
        runtimeFormatted: '3h 15m',
      }
    );

    // 7. Seed Algorithms & Versions
    this.algorithms = [
      {
        id: 'algo_alpha_falcon',
        code: 'ALPHA_FALCON',
        name: 'Alpha Trend Falcon',
        description: 'Multi-timeframe momentum trend-following system on major FX pairs with dynamic ATR volatility trailing stops.',
        strategyType: 'Trend Following / ATR Trailing',
        riskTier: 'medium',
        activeVersion: 'v2.4.1',
        isActive: true,
        totalReturnPct: 44.8,
        sharpeRatio: 2.14,
        assignedAccountsCount: 28,
      },
      {
        id: 'algo_breakout_matrix',
        code: 'BREAKOUT_MATRIX',
        name: 'Volatility Breakout Matrix',
        description: 'High-frequency breakout model on Gold (XAUUSD) and NASDAQ with London & New York opening bell volume filters.',
        strategyType: 'Breakout / Volume Spread',
        riskTier: 'high',
        activeVersion: 'v1.8.0',
        isActive: true,
        totalReturnPct: 62.3,
        sharpeRatio: 1.88,
        assignedAccountsCount: 19,
      },
      {
        id: 'algo_asian_hunter',
        code: 'ASIAN_HUNTER',
        name: 'Asian Session Range Hunter',
        description: 'Consolidation mean-reversion algorithm operating exclusively during Tokyo session on low-spread crosses.',
        strategyType: 'Mean Reversion / Range',
        riskTier: 'low',
        activeVersion: 'v3.1.2',
        isActive: true,
        totalReturnPct: 29.5,
        sharpeRatio: 2.82,
        assignedAccountsCount: 34,
      },
    ];

    this.algorithmVersions = [
      {
        id: 'ver_af_241',
        algorithmId: 'algo_alpha_falcon',
        versionString: 'v2.4.1',
        parameters: { emaFast: 21, emaSlow: 55, atrPeriod: 14, riskPerTradePct: 1.0 },
        changelog: 'Added dynamic Friday market close exposure reduction; improved slippage tolerance filter.',
        status: 'production',
        deployedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      },
      {
        id: 'ver_af_240',
        algorithmId: 'algo_alpha_falcon',
        versionString: 'v2.4.0',
        parameters: { emaFast: 20, emaSlow: 50, atrPeriod: 14, riskPerTradePct: 1.2 },
        changelog: 'Initial v2 architecture with multi-symbol correlation guard.',
        status: 'deprecated',
        deployedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      },
      {
        id: 'ver_bm_180',
        algorithmId: 'algo_breakout_matrix',
        versionString: 'v1.8.0',
        parameters: { volumeThreshold: 1.8, breakoutPips: 15, maxDailyTrades: 3 },
        changelog: 'Calibrated for elevated central bank policy volatility.',
        status: 'production',
        deployedAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      },
      {
        id: 'ver_ah_312',
        algorithmId: 'algo_asian_hunter',
        versionString: 'v3.1.2',
        parameters: { bollingerBands: 20, deviation: 2.2, sessionStartUtc: '23:00', sessionEndUtc: '07:00' },
        changelog: 'Enhanced spread-spike rejection circuit breaker.',
        status: 'production',
        deployedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
    ];

    // 8. Seed Risk Settings
    this.riskSettings.set(customerAlex.id, {
      maxDailyLossPct: 3.0,
      maxDrawdownPct: 8.0,
      maxLotSize: 2.0,
      maxOpenTrades: 5,
      tradingSession: 'ALL_SESSIONS',
      emergencyStop: false,
    });

    this.riskSettings.set(customerSarah.id, {
      maxDailyLossPct: 4.0,
      maxDrawdownPct: 10.0,
      maxLotSize: 5.0,
      maxOpenTrades: 8,
      tradingSession: 'LONDON_AND_NEW_YORK',
      emergencyStop: false,
    });

    // 9. Seed Worker Nodes Health
    this.workerNodes = [
      {
        id: 'node_ld4',
        workerName: 'Worker-LD4-UK',
        region: 'London (Equinix LD4)',
        status: 'online',
        activeTerminals: 14,
        cpuPercent: 18.4,
        memoryPercent: 32.1,
        pingLatencyMs: 1,
        lastHeartbeat: new Date().toISOString(),
      },
      {
        id: 'node_ny4',
        workerName: 'Worker-NY4-US',
        region: 'New York (Equinix NY4)',
        status: 'online',
        activeTerminals: 19,
        cpuPercent: 24.2,
        memoryPercent: 41.0,
        pingLatencyMs: 2,
        lastHeartbeat: new Date().toISOString(),
      },
      {
        id: 'node_ty3',
        workerName: 'Worker-TY3-JP',
        region: 'Tokyo (Equinix TY3)',
        status: 'online',
        activeTerminals: 8,
        cpuPercent: 12.0,
        memoryPercent: 26.5,
        pingLatencyMs: 3,
        lastHeartbeat: new Date().toISOString(),
      },
    ];

    // 10. Seed Notifications
    this.notifications.push(
      {
        id: 'notif_01',
        userId: customerAlex.id,
        type: 'trade_alert',
        title: 'New Position Executed',
        message: 'Alpha Trend Falcon triggered BUY 1.50 lots EURUSD @ 1.08420. SL: 1.08150, TP: 1.09200.',
        isRead: false,
        createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      },
      {
        id: 'notif_02',
        userId: customerAlex.id,
        type: 'connection',
        title: 'MT5 Heartbeat Verified',
        message: 'IC Markets Global terminal synchronized successfully. Ping: 1.4ms via Worker-LD4-UK.',
        isRead: true,
        createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
      },
      {
        id: 'notif_03',
        userId: customerSarah.id,
        type: 'trade_alert',
        title: 'Profit Target Approaching',
        message: 'AUDUSD BUY position is currently +$930.00 (+37.2 pips).',
        isRead: false,
        createdAt: new Date(Date.now() - 1 * 3600000).toISOString(),
      }
    );

    // 11. Seed Support Tickets
    this.supportTickets.push({
      id: 'tick_001',
      userId: customerAlex.id,
      userEmail: customerAlex.email,
      userName: `${customerAlex.firstName} ${customerAlex.lastName}`,
      subject: 'Inquiry regarding news event volatility filter',
      category: 'algorithm',
      status: 'open',
      priority: 'medium',
      assignedAdmin: 'Elena Rostova',
      createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      messages: [
        {
          id: 'msg_001',
          senderId: customerAlex.id,
          senderType: 'customer',
          senderName: 'Alex Morgan',
          message: 'Hello, does Alpha Trend Falcon pause trades during US CPI and NFP news releases?',
          createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
        },
        {
          id: 'msg_002',
          senderId: supportLead.id,
          senderType: 'admin',
          senderName: 'Elena Rostova (Support)',
          message: 'Hi Alex! Yes, all algorithmic entries are automatically restricted 15 minutes before and 15 minutes after red-folder high-impact economic news.',
          createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
        },
      ],
    });

    // 12. Seed Social Posts for Automation & Approval
    this.socialPosts.push(
      {
        id: 'post_001',
        platform: 'telegram',
        title: 'Daily Platform Trading Performance Snapshot',
        summaryText: '🔥 Today’s Algorithmic Trading Performance: +$3,840.50 combined net return across all connected MT5 subscriber accounts. Win rate 78.4%. EURUSD trend following executed flawlessly.',
        stats: {
          dailyProfit: 3840.50,
          winRate: 78.4,
          tradesExecuted: 14,
          bestSymbol: 'EURUSD',
        },
        status: 'pending_approval',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'post_002',
        platform: 'instagram',
        title: 'Weekly Institutional Return Card',
        summaryText: 'Weekly Recap: Over $24,190.00 realized profit with 0.8% maximum drawdown. Multi-strategy execution in London & NY sessions.',
        stats: {
          dailyProfit: 24190.00,
          winRate: 82.1,
          tradesExecuted: 56,
          bestSymbol: 'XAUUSD',
        },
        status: 'approved',
        approvedBy: 'Chief Administrator',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        publishedAt: new Date(Date.now() - 80000000).toISOString(),
      }
    );

    // 13. Seed Audit Logs
    this.auditLogs.push(
      {
        id: 'aud_001',
        actorId: superAdmin.id,
        actorEmail: superAdmin.email,
        actorRole: 'super_admin',
        action: 'ALGORITHM_VERSION_DEPLOYED',
        resource: 'algorithm_versions',
        resourceId: 'ver_af_241',
        details: 'Promoted Alpha Trend Falcon v2.4.1 to production after 30-day staging backtest verification.',
        ipAddress: '194.26.29.11',
        createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      },
      {
        id: 'aud_002',
        actorId: riskOfficer.id,
        actorEmail: riskOfficer.email,
        actorRole: 'risk_officer',
        action: 'RISK_THRESHOLD_MODIFIED',
        resource: 'risk_profiles',
        resourceId: customerAlex.id,
        details: 'Verified account balance increase to $25k; approved max lot size upgrade to 2.0 lots.',
        ipAddress: '185.12.94.8',
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      }
    );

    // 14. Seed Demo Accounts
    this.demoAccounts.push(
      {
        id: 'demo_acc_alex',
        userId: customerAlex.id,
        accountNumber: 'DEMO-8092415',
        brokerName: 'AURA Simulated Liquidity',
        serverName: 'AuraSim-Demo01',
        currency: 'USD',
        leverage: 100,
        initialBalance: 10000.00,
        balance: 10450.00,
        equity: 10685.00,
        usedMargin: 217.72,
        freeMargin: 10467.28,
        marginLevel: 4907.68,
        unrealizedPnl: 235.00,
        realizedPnl: 450.00,
        dailyPnl: 310.00,
        totalPnl: 685.00,
        peakBalance: 10685.00,
        maxDrawdownPct: 1.2,
        winRatePct: 75.0,
        winningTrades: 3,
        losingTrades: 1,
        totalTrades: 4,
        tradingPaused: false,
        status: 'active',
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'demo_acc_sarah',
        userId: customerSarah.id,
        accountNumber: 'DEMO-4491209',
        brokerName: 'AURA Simulated Liquidity',
        serverName: 'AuraSim-Demo01',
        currency: 'USD',
        leverage: 100,
        initialBalance: 10000.00,
        balance: 10200.00,
        equity: 10200.00,
        usedMargin: 0,
        freeMargin: 10200.00,
        marginLevel: 0,
        unrealizedPnl: 0,
        realizedPnl: 200.00,
        dailyPnl: 120.00,
        totalPnl: 200.00,
        peakBalance: 10250.00,
        maxDrawdownPct: 0.8,
        winRatePct: 66.7,
        winningTrades: 2,
        losingTrades: 1,
        totalTrades: 3,
        tradingPaused: false,
        status: 'active',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      }
    );

    // Seed Demo Open Positions
    this.demoPositions.push(
      {
        id: 'demo_pos_001',
        mt5AccountId: 'demo_acc_alex',
        positionTicket: 98450121,
        symbol: 'EURUSD',
        type: 'BUY',
        lots: 0.20,
        openPrice: 1.08500,
        currentPrice: 1.08860,
        stopLoss: 1.08100,
        takeProfit: 1.09300,
        currentPnl: 72.00,
        swap: 0,
        commission: -1.40,
        status: 'open',
        openTime: new Date(Date.now() - 90 * 60000).toISOString(),
        runtimeFormatted: '1h 30m',
      },
      {
        id: 'demo_pos_002',
        mt5AccountId: 'demo_acc_alex',
        positionTicket: 98450148,
        symbol: 'GBPUSD',
        type: 'BUY',
        lots: 0.10,
        openPrice: 1.28950,
        currentPrice: 1.29340,
        stopLoss: 1.28450,
        takeProfit: 1.29950,
        currentPnl: 39.00,
        swap: 0,
        commission: -0.70,
        status: 'open',
        openTime: new Date(Date.now() - 45 * 60000).toISOString(),
        runtimeFormatted: '45m',
      },
      {
        id: 'demo_pos_closed_001',
        mt5AccountId: 'demo_acc_alex',
        positionTicket: 98449010,
        symbol: 'EURUSD',
        type: 'BUY',
        lots: 0.20,
        openPrice: 1.08100,
        closePrice: 1.08650,
        currentPrice: 1.08650,
        stopLoss: 1.07800,
        takeProfit: 1.08650,
        currentPnl: 0,
        profit: 110.00,
        swap: -0.50,
        commission: -1.40,
        status: 'closed',
        openTime: new Date(Date.now() - 24 * 3600000).toISOString(),
        closeTime: new Date(Date.now() - 20 * 3600000).toISOString(),
        runtimeFormatted: '4h 00m',
      },
      {
        id: 'demo_pos_closed_002',
        mt5AccountId: 'demo_acc_alex',
        positionTicket: 98449155,
        symbol: 'USDJPY',
        type: 'SELL',
        lots: 0.15,
        openPrice: 154.500,
        closePrice: 153.200,
        currentPrice: 153.200,
        stopLoss: 155.200,
        takeProfit: 153.200,
        currentPnl: 0,
        profit: 127.20,
        swap: 0,
        commission: -1.05,
        status: 'closed',
        openTime: new Date(Date.now() - 18 * 3600000).toISOString(),
        closeTime: new Date(Date.now() - 14 * 3600000).toISOString(),
        runtimeFormatted: '4h 00m',
      },
      {
        id: 'demo_pos_closed_003',
        mt5AccountId: 'demo_acc_alex',
        positionTicket: 98449230,
        symbol: 'XAUUSD',
        type: 'BUY',
        lots: 0.05,
        openPrice: 2670.00,
        closePrice: 2685.00,
        currentPrice: 2685.00,
        stopLoss: 2655.00,
        takeProfit: 2685.00,
        currentPnl: 0,
        profit: 75.00,
        swap: 0,
        commission: -0.50,
        status: 'closed',
        openTime: new Date(Date.now() - 12 * 3600000).toISOString(),
        closeTime: new Date(Date.now() - 8 * 3600000).toISOString(),
        runtimeFormatted: '4h 00m',
      },
      {
        id: 'demo_pos_closed_004',
        mt5AccountId: 'demo_acc_alex',
        positionTicket: 98449412,
        symbol: 'EURUSD',
        type: 'SELL',
        lots: 0.10,
        openPrice: 1.08400,
        closePrice: 1.08700,
        currentPrice: 1.08700,
        stopLoss: 1.08700,
        takeProfit: 1.07800,
        currentPnl: 0,
        profit: -30.00,
        swap: 0,
        commission: -0.70,
        status: 'closed',
        openTime: new Date(Date.now() - 6 * 3600000).toISOString(),
        closeTime: new Date(Date.now() - 5 * 3600000).toISOString(),
        runtimeFormatted: '1h 00m',
      }
    );
  }

  public getOrCreateDemoAccount(userId: string): DemoAccount {
    let account = this.demoAccounts.find(a => a.userId === userId);
    if (!account) {
      const user = this.users.find(u => u.id === userId);
      const accNum = `DEMO-${Math.floor(1000000 + Math.random() * 9000000)}`;
      account = {
        id: `demo_acc_${userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}_${Date.now()}`,
        userId,
        accountNumber: accNum,
        brokerName: 'AURA Simulated Liquidity',
        serverName: 'AuraSim-Demo01',
        currency: 'USD',
        leverage: 100,
        initialBalance: 10000.00,
        balance: 10000.00,
        equity: 10000.00,
        usedMargin: 0,
        freeMargin: 10000.00,
        marginLevel: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        dailyPnl: 0,
        totalPnl: 0,
        peakBalance: 10000.00,
        maxDrawdownPct: 0.0,
        winRatePct: 0.0,
        winningTrades: 0,
        losingTrades: 0,
        totalTrades: 0,
        tradingPaused: false,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.demoAccounts.push(account);
    }
    return account;
  }

  public recordDemoRiskEvent(event: Omit<DemoRiskEvent, 'id' | 'timestamp'>): DemoRiskEvent {
    const record: DemoRiskEvent = {
      ...event,
      id: `drisk_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    this.demoRiskEvents.unshift(record);
    if (this.demoRiskEvents.length > 200) {
      this.demoRiskEvents.pop();
    }
    return record;
  }

  public async initPostgres(): Promise<void> {
    try {
      console.log('[PostgreSQL] Initializing Cloud SQL database connection and sync...');
      await seedPostgres();

      // Safe, idempotent schema updates for Manual Trade Close permissions
      try {
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS manual_trade_close_enabled BOOLEAN NOT NULL DEFAULT FALSE;`);
        await pool.query(`CREATE TABLE IF NOT EXISTS system_settings (key VARCHAR(100) PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);`);
      } catch (migErr) {
        console.warn('[PostgreSQL Migration Warning]:', migErr);
      }

      // Synchronize users from PostgreSQL
      const res = await pool.query(`
        SELECT 
          u.id, 
          u.email, 
          u.password_hash, 
          u.salt, 
          u.status, 
          u.kyc_status, 
          COALESCE(u.manual_trade_close_enabled, false) as manual_trade_close_enabled,
          u.created_at, 
          u.updated_at,
          COALESCE(up.first_name, 'User') as first_name,
          COALESCE(up.last_name, '') as last_name,
          COALESCE(ur.role_id, 'customer') as role
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        WHERE u.deleted_at IS NULL
      `);

      if (res.rows && res.rows.length > 0) {
        this.users = res.rows.map(row => ({
          id: row.id,
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name,
          role: row.role as any,
          status: row.status as any,
          kycStatus: row.kyc_status as any,
          manualTradeCloseEnabled: Boolean(row.manual_trade_close_enabled),
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
          updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
          passwordHash: row.password_hash,
          salt: row.salt,
        }));
        console.log(`[PostgreSQL] Synchronized ${this.users.length} active users from Cloud SQL into application state.`);
      }

      // Synchronize global manual trade close setting from PostgreSQL
      try {
        const settingsRes = await pool.query(`SELECT value FROM system_settings WHERE key = 'global_manual_trade_close' LIMIT 1`);
        if (settingsRes.rows && settingsRes.rows.length > 0) {
          const val = settingsRes.rows[0].value;
          if (val && typeof val.enabled === 'boolean') {
            this.globalManualTradeCloseEnabled = val.enabled;
          }
        }
      } catch (settingsErr) {
        console.warn('[PostgreSQL Settings Sync Warning]:', settingsErr);
      }

      // Synchronize subscription plans
      const plansRes = await pool.query(`SELECT * FROM subscription_plans WHERE is_active = true`);
      if (plansRes.rows && plansRes.rows.length > 0) {
        this.subscriptionPlans = plansRes.rows.map(row => ({
          id: row.id,
          code: row.code,
          name: row.name,
          description: row.description,
          interval: row.interval,
          priceUsd: Number(row.price_usd),
          profitSharePct: Number(row.profit_share_pct || 0),
          maxMt5Accounts: row.max_mt5_accounts,
          maxTradingVolumeLots: Number(row.max_trading_volume_lots),
          features: Array.isArray(row.features) ? row.features : [],
          isActive: row.is_active,
        }));
      }

      // Synchronize algorithms
      const algosRes = await pool.query(`SELECT * FROM algorithms WHERE is_active = true`);
      if (algosRes.rows && algosRes.rows.length > 0) {
        this.algorithms = algosRes.rows.map(row => ({
          id: row.id,
          code: row.code,
          name: row.name,
          description: row.description,
          strategyType: row.strategy_type,
          riskTier: row.risk_tier,
          isActive: row.is_active,
          winRatePct: 78.4,
          monthlyReturnPct: 14.8,
          maxDrawdownPct: 2.1,
        }));
      }

      // Synchronize risk profiles
      const riskRes = await pool.query(`SELECT * FROM risk_profiles`);
      if (riskRes.rows && riskRes.rows.length > 0) {
        for (const row of riskRes.rows) {
          this.riskSettings.set(row.user_id, {
            maxDailyLossPct: Number(row.max_daily_loss_pct),
            maxDrawdownPct: Number(row.max_drawdown_pct),
            maxLotSize: Number(row.max_lot_size),
            maxOpenTrades: row.max_open_trades,
            tradingSession: 'ALL_SESSIONS',
            emergencyStop: row.emergency_stop,
          });
        }
      }

      // Execute safe DDL migrations for Stripe integration
      try {
        await pool.query(`
          ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
          ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
          ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
          ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255);
          ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_invoice_id VARCHAR(255);
          ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;
          ALTER TABLE invoices ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'paid';
          ALTER TABLE invoices ADD COLUMN IF NOT EXISTS hosted_invoice_url TEXT;
          ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
          ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255);
          CREATE TABLE IF NOT EXISTS processed_webhook_events (
            event_id VARCHAR(255) PRIMARY KEY,
            event_type VARCHAR(100),
            processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } catch (ddlErr) {
        console.warn('[PostgreSQL DDL Migration Warning]:', ddlErr);
      }

      // Synchronize processed webhook events
      try {
        const eventsRes = await pool.query(`SELECT event_id FROM processed_webhook_events`);
        if (eventsRes.rows) {
          for (const row of eventsRes.rows) {
            this.processedWebhookEvents.add(row.event_id);
          }
        }
      } catch {
        // Table may be fresh
      }

      // Synchronize subscriptions from PostgreSQL
      try {
        const subsRes = await pool.query(`
          SELECT s.*, p.name as plan_name, p.price_usd as plan_price, p.interval as plan_interval
          FROM subscriptions s
          LEFT JOIN subscription_plans p ON s.plan_id = p.id
          ORDER BY s.created_at DESC
        `);
        if (subsRes.rows && subsRes.rows.length > 0) {
          for (const row of subsRes.rows) {
            const subObj: Subscription = {
              id: row.id,
              userId: row.user_id,
              planId: row.plan_id,
              planName: row.plan_name || 'Quant Plan',
              status: row.status as SubscriptionStatus,
              stripeCustomerId: row.stripe_customer_id,
              stripeSubscriptionId: row.stripe_subscription_id,
              currentPeriodStart: new Date(row.current_period_start).toISOString(),
              currentPeriodEnd: new Date(row.current_period_end).toISOString(),
              cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
              canceledAt: row.canceled_at ? new Date(row.canceled_at).toISOString() : undefined,
              priceUsd: Number(row.plan_price || 99),
              interval: row.plan_interval,
            };
            const existingIdx = this.subscriptions.findIndex(s => s.id === subObj.id);
            if (existingIdx >= 0) {
              this.subscriptions[existingIdx] = subObj;
            } else {
              this.subscriptions.push(subObj);
            }
          }
        }
      } catch (subErr) {
        console.warn('[PostgreSQL Subscriptions Sync Warning]:', subErr);
      }

      // Synchronize payments from PostgreSQL
      try {
        const payRes = await pool.query(`SELECT * FROM payments ORDER BY created_at DESC LIMIT 500`);
        if (payRes.rows && payRes.rows.length > 0) {
          for (const row of payRes.rows) {
            const pObj: PaymentRecord = {
              id: row.id,
              userId: row.user_id,
              subscriptionId: row.subscription_id,
              provider: row.provider,
              transactionId: row.provider_transaction_id,
              amountUsd: Number(row.amount_usd),
              currency: row.currency || 'USD',
              status: row.status as any,
              invoiceNumber: `INV-${row.id.substring(0, 8).toUpperCase()}`,
              idempotencyKey: row.idempotency_key,
              stripeCustomerId: row.stripe_customer_id,
              stripePaymentIntentId: row.stripe_payment_intent_id,
              createdAt: new Date(row.created_at).toISOString(),
            };
            const pIdx = this.payments.findIndex(p => p.id === pObj.id || (pObj.idempotencyKey && p.idempotencyKey === pObj.idempotencyKey));
            if (pIdx >= 0) {
              this.payments[pIdx] = pObj;
            } else {
              this.payments.unshift(pObj);
            }
          }
        }
      } catch (payErr) {
        console.warn('[PostgreSQL Payments Sync Warning]:', payErr);
      }

      // Synchronize invoices from PostgreSQL
      try {
        const invRes = await pool.query(`SELECT * FROM invoices ORDER BY created_at DESC LIMIT 500`);
        if (invRes.rows && invRes.rows.length > 0) {
          for (const row of invRes.rows) {
            const invObj: InvoiceRecord = {
              id: row.id,
              paymentId: row.payment_id,
              userId: row.user_id,
              subscriptionId: row.subscription_id,
              invoiceNumber: row.invoice_number,
              subtotal: Number(row.subtotal),
              tax: Number(row.tax || 0),
              total: Number(row.total),
              status: (row.status || 'paid') as any,
              issuedDate: row.issued_date ? new Date(row.issued_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
              pdfUrl: row.pdf_url,
              stripeInvoiceId: row.stripe_invoice_id,
              hostedInvoiceUrl: row.hosted_invoice_url,
            };
            const iIdx = this.invoices.findIndex(i => i.id === invObj.id);
            if (iIdx >= 0) {
              this.invoices[iIdx] = invObj;
            } else {
              this.invoices.unshift(invObj);
            }
          }
        }
      } catch (invErr) {
        console.warn('[PostgreSQL Invoices Sync Warning]:', invErr);
      }

      console.log('[PostgreSQL] Cloud SQL database initialization, DDL migrations, and sync complete.');
    } catch (err) {
      console.error('[PostgreSQL Init Error]', err);
    }
  }

  public isWebhookProcessed(eventId: string): boolean {
    return this.processedWebhookEvents.has(eventId);
  }

  public async markWebhookProcessed(eventId: string, eventType: string): Promise<void> {
    this.processedWebhookEvents.add(eventId);
    try {
      await pool.query(
        `INSERT INTO processed_webhook_events (event_id, event_type, processed_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (event_id) DO NOTHING`,
        [eventId, eventType]
      );
    } catch (err) {
      console.warn('[PostgreSQL Error] Failed to record processed webhook event:', err);
    }
  }

  public async createOrUpdateSubscription(sub: Subscription): Promise<Subscription> {
    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sub.userId);
    const isPlanUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sub.planId);
    const isSubUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sub.id);

    const dbSubId = isSubUuid ? sub.id : crypto.randomUUID();
    const finalSub = { ...sub, id: dbSubId };

    try {
      if (isUserUuid) {
        let targetPlanId = isPlanUuid ? sub.planId : null;
        if (!targetPlanId) {
          const matchedPlan = this.subscriptionPlans.find(p => p.id === sub.planId || p.code === sub.planId);
          if (matchedPlan && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(matchedPlan.id)) {
            targetPlanId = matchedPlan.id;
          } else {
            targetPlanId = this.subscriptionPlans[0]?.id;
          }
        }

        // Cancel other active subscriptions for this user in PostgreSQL
        await pool.query(
          `UPDATE subscriptions SET status = 'canceled', updated_at = NOW() WHERE user_id = $1 AND status = 'active' AND id != $2`,
          [sub.userId, dbSubId]
        );

        await pool.query(
          `INSERT INTO subscriptions (
            id, user_id, plan_id, status, stripe_customer_id, stripe_subscription_id,
            current_period_start, current_period_end, cancel_at_period_end, canceled_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
            stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, subscriptions.stripe_subscription_id),
            current_period_start = EXCLUDED.current_period_start,
            current_period_end = EXCLUDED.current_period_end,
            cancel_at_period_end = EXCLUDED.cancel_at_period_end,
            canceled_at = EXCLUDED.canceled_at,
            updated_at = NOW()`,
          [
            dbSubId,
            sub.userId,
            targetPlanId,
            sub.status,
            sub.stripeCustomerId || null,
            sub.stripeSubscriptionId || null,
            new Date(sub.currentPeriodStart),
            new Date(sub.currentPeriodEnd),
            sub.cancelAtPeriodEnd || false,
            sub.canceledAt ? new Date(sub.canceledAt) : null,
          ]
        );
      }
    } catch (err) {
      console.error('[PostgreSQL Error] createOrUpdateSubscription failed:', err);
    }

    // Cancel other active subscriptions in memory for this user
    for (const s of this.subscriptions) {
      if (s.userId === sub.userId && s.id !== sub.id && s.id !== dbSubId && s.status === 'active') {
        s.status = 'canceled';
        s.canceledAt = new Date().toISOString();
      }
    }

    const idx = this.subscriptions.findIndex(s => s.id === sub.id || s.id === dbSubId);
    if (idx >= 0) {
      this.subscriptions[idx] = finalSub;
    } else {
      this.subscriptions.unshift(finalSub);
    }

    return finalSub;
  }

  public async recordPayment(payment: PaymentRecord): Promise<PaymentRecord> {
    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payment.userId);
    const isSubUuid = payment.subscriptionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payment.subscriptionId);
    const isPayUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payment.id);

    const dbPayId = isPayUuid ? payment.id : crypto.randomUUID();
    const finalPayment = { ...payment, id: dbPayId };

    try {
      if (isUserUuid) {
        await pool.query(
          `INSERT INTO payments (
            id, user_id, subscription_id, provider, provider_transaction_id,
            idempotency_key, amount_usd, currency, status, stripe_customer_id, stripe_payment_intent_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
          ON CONFLICT (idempotency_key) DO UPDATE SET
            status = EXCLUDED.status,
            provider_transaction_id = COALESCE(EXCLUDED.provider_transaction_id, payments.provider_transaction_id)`,
          [
            dbPayId,
            payment.userId,
            isSubUuid ? payment.subscriptionId : null,
            payment.provider || 'stripe',
            payment.transactionId,
            payment.idempotencyKey || `idem_${dbPayId}`,
            payment.amountUsd,
            payment.currency || 'USD',
            payment.status,
            payment.stripeCustomerId || null,
            payment.stripePaymentIntentId || null,
          ]
        );
      }
    } catch (err) {
      console.error('[PostgreSQL Error] recordPayment failed:', err);
    }

    const idx = this.payments.findIndex(p => p.id === payment.id || p.id === dbPayId || (payment.idempotencyKey && p.idempotencyKey === payment.idempotencyKey));
    if (idx >= 0) {
      this.payments[idx] = finalPayment;
    } else {
      this.payments.unshift(finalPayment);
    }

    return finalPayment;
  }

  public async recordInvoice(invoice: InvoiceRecord): Promise<InvoiceRecord> {
    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invoice.userId);
    const isPayUuid = invoice.paymentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invoice.paymentId);
    const isSubUuid = invoice.subscriptionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invoice.subscriptionId);
    const isInvUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invoice.id);

    const dbInvId = isInvUuid ? invoice.id : crypto.randomUUID();
    const finalInvoice = { ...invoice, id: dbInvId };

    try {
      if (isUserUuid) {
        await pool.query(
          `INSERT INTO invoices (
            id, payment_id, user_id, subscription_id, invoice_number,
            subtotal, tax, total, status, issued_date, pdf_url, stripe_invoice_id, hosted_invoice_url, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
          ON CONFLICT (invoice_number) DO UPDATE SET
            status = EXCLUDED.status,
            total = EXCLUDED.total`,
          [
            dbInvId,
            isPayUuid ? invoice.paymentId : null,
            invoice.userId,
            isSubUuid ? invoice.subscriptionId : null,
            invoice.invoiceNumber,
            invoice.subtotal,
            invoice.tax || 0,
            invoice.total,
            invoice.status || 'paid',
            invoice.issuedDate || new Date().toISOString().split('T')[0],
            invoice.pdfUrl || null,
            invoice.stripeInvoiceId || null,
            invoice.hostedInvoiceUrl || null,
          ]
        );
      }
    } catch (err) {
      console.error('[PostgreSQL Error] recordInvoice failed:', err);
    }

    const idx = this.invoices.findIndex(i => i.id === invoice.id || i.id === dbInvId || i.invoiceNumber === invoice.invoiceNumber);
    if (idx >= 0) {
      this.invoices[idx] = finalInvoice;
    } else {
      this.invoices.unshift(finalInvoice);
    }

    return finalInvoice;
  }

  public async updateSubscriptionStatus(subIdOrStripeId: string, status: SubscriptionStatus, currentPeriodEnd?: string): Promise<Subscription | null> {
    const sub = this.subscriptions.find(s => s.id === subIdOrStripeId || s.stripeSubscriptionId === subIdOrStripeId);
    if (!sub) return null;

    sub.status = status;
    if (status === 'canceled') {
      sub.canceledAt = new Date().toISOString();
      sub.cancelAtPeriodEnd = false;
    }
    if (currentPeriodEnd) {
      sub.currentPeriodEnd = currentPeriodEnd;
    }

    try {
      await pool.query(
        `UPDATE subscriptions
         SET status = $1,
             current_period_end = COALESCE($2, current_period_end),
             canceled_at = CASE WHEN $1 = 'canceled' THEN NOW() ELSE canceled_at END,
             updated_at = NOW()
         WHERE id = $3 OR stripe_subscription_id = $3`,
        [status, currentPeriodEnd ? new Date(currentPeriodEnd) : null, subIdOrStripeId]
      );
    } catch (err) {
      console.error('[PostgreSQL Error] updateSubscriptionStatus failed:', err);
    }

    return sub;
  }

  public async cancelSubscription(userId: string, cancelAtPeriodEnd = true): Promise<Subscription | null> {
    const sub = this.subscriptions.find(s => s.userId === userId && s.status === 'active');
    if (!sub) return null;

    if (cancelAtPeriodEnd) {
      sub.cancelAtPeriodEnd = true;
    } else {
      sub.status = 'canceled';
      sub.canceledAt = new Date().toISOString();
    }

    try {
      await pool.query(
        `UPDATE subscriptions
         SET cancel_at_period_end = $1,
             status = CASE WHEN $1 = FALSE THEN 'canceled' ELSE status END,
             canceled_at = CASE WHEN $1 = FALSE THEN NOW() ELSE canceled_at END,
             updated_at = NOW()
         WHERE id = $2`,
        [cancelAtPeriodEnd, sub.id]
      );
    } catch (err) {
      console.error('[PostgreSQL Error] cancelSubscription failed:', err);
    }

    return sub;
  }

  public async updatePlan(planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | null> {
    const plan = this.subscriptionPlans.find(p => p.id === planId || p.code === planId);
    if (!plan) return null;

    Object.assign(plan, updates);

    try {
      await pool.query(
        `UPDATE subscription_plans
         SET price_usd = COALESCE($1, price_usd),
             name = COALESCE($2, name),
             description = COALESCE($3, description),
             features = COALESCE($4, features),
             profit_share_pct = COALESCE($5, profit_share_pct),
             max_mt5_accounts = COALESCE($6, max_mt5_accounts),
             is_active = COALESCE($7, is_active)
         WHERE id = $8 OR code = $8`,
        [
          updates.priceUsd !== undefined ? updates.priceUsd : null,
          updates.name || null,
          updates.description || null,
          updates.features ? JSON.stringify(updates.features) : null,
          updates.profitSharePct !== undefined ? updates.profitSharePct : null,
          updates.maxMt5Accounts !== undefined ? updates.maxMt5Accounts : null,
          updates.isActive !== undefined ? updates.isActive : null,
          planId,
        ]
      );
    } catch (err) {
      console.error('[PostgreSQL Error] updatePlan failed:', err);
    }

    return plan;
  }

  public async createUser(newUser: StoredUser): Promise<StoredUser> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(newUser.id);
    const userId = isUuid ? newUser.id : crypto.randomUUID();
    newUser.id = userId;

    try {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, salt, is_email_verified, status, kyc_status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [userId, newUser.email, newUser.passwordHash, newUser.salt, true, newUser.status, newUser.kycStatus]
      );

      await pool.query(
        `INSERT INTO user_profiles (user_id, first_name, last_name, country, timezone, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [userId, newUser.firstName, newUser.lastName, 'US', 'UTC']
      );

      await pool.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_at)
         VALUES ($1, $2, NOW())`,
        [userId, newUser.role]
      );

      await pool.query(
        `INSERT INTO risk_profiles (id, user_id, risk_tier, max_daily_loss_pct, max_drawdown_pct, max_lot_size, max_open_trades, emergency_stop, updated_at)
         VALUES ($1, $2, 'moderate', 3.00, 8.00, 1.00, 5, false, NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [crypto.randomUUID(), userId]
      );
    } catch (err) {
      console.error('[PostgreSQL Error] Failed to persist user in DB:', err);
    }

    const idx = this.users.findIndex(u => u.email.toLowerCase() === newUser.email.toLowerCase());
    if (idx >= 0) {
      this.users[idx] = newUser;
    } else {
      this.users.push(newUser);
    }

    this.riskSettings.set(userId, {
      maxDailyLossPct: 3.0,
      maxDrawdownPct: 8.0,
      maxLotSize: 1.0,
      maxOpenTrades: 5,
      tradingSession: 'ALL_SESSIONS',
      emergencyStop: false,
    });

    return newUser;
  }

  public async updateUserStatus(userId: string, status: 'active' | 'suspended' | 'pending_verification'): Promise<void> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
    try {
      if (isUuid) {
        await pool.query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2', [status, userId]);
      }
    } catch (err) {
      console.error('[PostgreSQL Error] updateUserStatus failed:', err);
    }
    const u = this.users.find(u => u.id === userId);
    if (u) u.status = status;
  }

  public recordAudit(actorId: string, actorEmail: string, actorRole: string, action: string, resource: string, details: string, ip = '127.0.0.1', resourceId?: string) {
    const isActorUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actorId);
    const isResUuid = resourceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(resourceId);

    // Asynchronously insert into PostgreSQL audit_logs
    pool.query(
      `INSERT INTO audit_logs (id, actor_id, actor_role, action, resource, resource_id, changes, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        crypto.randomUUID(),
        isActorUuid ? actorId : null,
        actorRole,
        action,
        resource,
        isResUuid ? resourceId : null,
        JSON.stringify({ details, rawActor: actorId, rawResource: resourceId }),
        ip,
      ]
    ).catch(err => {
      // Non-blocking log warning
    });

    this.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      actorId,
      actorEmail,
      actorRole,
      action,
      resource,
      resourceId,
      details,
      ipAddress: ip,
      createdAt: new Date().toISOString(),
    });
    // Keep log manageable
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
  }

  /**
   * Synchronize account telemetry, open positions, and worker health from an external MT5 Worker.
   * Performs atomic updates in PostgreSQL and keeps in-memory state synchronized.
   */
  public async syncWorkerAccountData(payload: {
    workerId: string;
    workerName: string;
    account: {
      loginId: string;
      server: string;
      brokerName?: string;
      balance: number;
      equity: number;
      margin: number;
      freeMargin: number;
      marginLevel: number;
      currency?: string;
      leverage?: number;
    };
    positions: Array<{
      ticket: number;
      symbol: string;
      type: 'BUY' | 'SELL';
      lots: number;
      openPrice: number;
      currentPrice: number;
      stopLoss?: number | null;
      takeProfit?: number | null;
      currentPnl: number;
      swap?: number | null;
      commission?: number | null;
      openTime?: string | null;
    }>;
    heartbeat?: {
      cpuPercent?: number;
      memoryPercent?: number;
      pingLatencyMs?: number;
      activeTerminals?: number;
    };
  }): Promise<{
    mt5AccountId: string;
    globalKillSwitch: boolean;
    accountKillSwitch: boolean;
    syncedPositionsCount: number;
  }> {
    const { workerId, workerName, account: accData, positions: posData, heartbeat } = payload;

    // 1. Resolve MT5 Account in Database
    let mt5AccountId: string | null = null;

    try {
      let query = 'SELECT id, user_id FROM mt5_accounts WHERE login_id = $1 AND LOWER(server) = LOWER($2)';
      let params: any[] = [accData.loginId, accData.server];

      if (accData.brokerName) {
        query += ' AND LOWER(broker_name) = LOWER($3)';
        params.push(accData.brokerName);
      }
      query += ' LIMIT 1';

      let result = await pool.query(query, params);

      // If not matched with broker name, fall back to login_id + server
      if ((!result.rows || result.rows.length === 0) && accData.brokerName) {
        result = await pool.query(
          'SELECT id, user_id FROM mt5_accounts WHERE login_id = $1 AND LOWER(server) = LOWER($2) LIMIT 1',
          [accData.loginId, accData.server]
        );
      }

      if (result.rows && result.rows.length > 0) {
        mt5AccountId = result.rows[0].id;
      }
    } catch (dbErr) {
      console.warn('[WorkerSync] PostgreSQL lookup error:', dbErr);
    }

    // Fallback: check in-memory accounts if DB query did not find it
    if (!mt5AccountId) {
      const memoryAcc = this.mt5Accounts.find(
        a => a.loginId === accData.loginId && a.server.toLowerCase() === accData.server.toLowerCase()
      );
      if (memoryAcc) {
        mt5AccountId = memoryAcc.id;
      }
    }

    if (!mt5AccountId) {
      const error: any = new Error(
        `MT5 Account with Login ID "${accData.loginId}" on server "${accData.server}" was not found. Please connect this MT5 account in the customer portal first.`
      );
      error.statusCode = 404;
      throw error;
    }

    // Calculate total floating PnL from positions
    const calculatedFloatingPnl = posData.reduce((sum, p) => sum + (p.currentPnl || 0), 0);

    // 2. Update mt5_accounts in PostgreSQL
    try {
      await pool.query(
        `UPDATE mt5_accounts
         SET balance = $1,
             equity = $2,
             margin = $3,
             free_margin = $4,
             margin_level = $5,
             floating_pnl = $6,
             currency = COALESCE($7, currency),
             connection_status = 'connected',
             assigned_worker_id = $8,
             last_sync_at = NOW(),
             updated_at = NOW()
         WHERE id = $9`,
        [
          accData.balance,
          accData.equity,
          accData.margin,
          accData.freeMargin,
          accData.marginLevel,
          calculatedFloatingPnl,
          accData.currency || null,
          workerId,
          mt5AccountId
        ]
      );
    } catch (updateErr) {
      console.warn('[WorkerSync] Failed to update mt5_accounts row in DB:', updateErr);
    }

    // Update in-memory mt5Accounts
    const memoryAcc = this.mt5Accounts.find(a => a.id === mt5AccountId);
    if (memoryAcc) {
      memoryAcc.balance = accData.balance;
      memoryAcc.equity = accData.equity;
      memoryAcc.margin = accData.margin;
      memoryAcc.freeMargin = accData.freeMargin;
      memoryAcc.marginLevel = accData.marginLevel;
      memoryAcc.floatingPnl = calculatedFloatingPnl;
      if (accData.currency) memoryAcc.currency = accData.currency;
      memoryAcc.connectionStatus = 'connected';
      memoryAcc.assignedWorkerId = workerId;
      memoryAcc.lastSyncAt = new Date().toISOString();
    }

    // 3. Synchronize positions in PostgreSQL
    const incomingTickets = posData.map(p => p.ticket);

    for (const p of posData) {
      try {
        const openedAtTime = p.openTime ? new Date(p.openTime).toISOString() : new Date().toISOString();
        await pool.query(
          `INSERT INTO positions (
             id, mt5_account_id, position_ticket, symbol, position_type,
             lots, open_price, current_price, stop_loss, take_profit,
             current_pnl, swap, commission, status, opened_at
           )
           VALUES (
             gen_random_uuid(), $1, $2, $3, $4,
             $5, $6, $7, $8, $9,
             $10, $11, $12, 'open', $13
           )
           ON CONFLICT (position_ticket) DO UPDATE SET
             current_price = EXCLUDED.current_price,
             stop_loss = EXCLUDED.stop_loss,
             take_profit = EXCLUDED.take_profit,
             current_pnl = EXCLUDED.current_pnl,
             swap = EXCLUDED.swap,
             commission = EXCLUDED.commission,
             status = 'open',
             lots = EXCLUDED.lots,
             symbol = EXCLUDED.symbol`,
          [
            mt5AccountId,
            p.ticket,
            p.symbol,
            p.type,
            p.lots,
            p.openPrice,
            p.currentPrice,
            p.stopLoss ?? null,
            p.takeProfit ?? null,
            p.currentPnl,
            p.swap ?? 0,
            p.commission ?? 0,
            openedAtTime
          ]
        );
      } catch (posErr) {
        console.warn(`[WorkerSync] Failed to upsert position ticket ${p.ticket}:`, posErr);
      }
    }

    // Mark missing positions as closed in PostgreSQL
    try {
      if (incomingTickets.length > 0) {
        await pool.query(
          `UPDATE positions
           SET status = 'closed',
               closed_at = NOW()
           WHERE mt5_account_id = $1
             AND status = 'open'
             AND position_ticket != ALL($2::bigint[])`,
          [mt5AccountId, incomingTickets]
        );
      } else {
        await pool.query(
          `UPDATE positions
           SET status = 'closed',
               closed_at = NOW()
           WHERE mt5_account_id = $1
             AND status = 'open'`,
          [mt5AccountId]
        );
      }
    } catch (closeErr) {
      console.warn('[WorkerSync] Failed to close absent positions in DB:', closeErr);
    }

    // Remove any seeded demo positions for this real account (IDs starting with 'pos_demo_')
    // We do NOT delete any real MT5 positions (e.g. pos_sync_ or real tickets).
    this.positions = this.positions.filter(
      pos => !(pos.mt5AccountId === mt5AccountId && pos.id.startsWith('pos_demo_'))
    );

    // Synchronize in-memory positions for immediate reactivity
    for (const p of posData) {
      const existing = this.positions.find(pos => pos.positionTicket === p.ticket);
      if (existing) {
        existing.currentPrice = p.currentPrice;
        existing.currentPnl = p.currentPnl;
        existing.stopLoss = p.stopLoss ?? existing.stopLoss;
        existing.takeProfit = p.takeProfit ?? existing.takeProfit;
        existing.swap = p.swap ?? existing.swap;
        existing.commission = p.commission ?? existing.commission;
        existing.lots = p.lots;
        existing.symbol = p.symbol;
        existing.status = 'open';
      } else {
        this.positions.push({
          id: `pos_sync_${p.ticket}`,
          mt5AccountId,
          positionTicket: p.ticket,
          symbol: p.symbol,
          type: p.type,
          lots: p.lots,
          openPrice: p.openPrice,
          currentPrice: p.currentPrice,
          stopLoss: p.stopLoss ?? 0,
          takeProfit: p.takeProfit ?? 0,
          currentPnl: p.currentPnl,
          swap: p.swap ?? 0,
          commission: p.commission ?? 0,
          status: 'open',
          openTime: p.openTime ? new Date(p.openTime).toISOString() : new Date().toISOString(),
        });
      }
    }

    // Mark in-memory positions closed if absent from incoming payload
    for (const pos of this.positions) {
      if (pos.mt5AccountId === mt5AccountId && pos.status === 'open' && !incomingTickets.includes(pos.positionTicket)) {
        pos.status = 'closed';
        pos.closeTime = new Date().toISOString();
      }
    }

    // 4. Update worker_health
    const cpu = heartbeat?.cpuPercent ?? 10.0;
    const mem = heartbeat?.memoryPercent ?? 25.0;
    const latency = heartbeat?.pingLatencyMs ?? 5;
    const terminals = heartbeat?.activeTerminals ?? 1;

    try {
      await pool.query(
        `INSERT INTO worker_health (
           id, worker_name, region, status, active_terminals,
           cpu_percent, memory_percent, ping_latency_ms, last_heartbeat
         )
         VALUES ($1, $2, 'windows-worker', 'online', $3, $4, $5, $6, NOW())
         ON CONFLICT (id) DO UPDATE SET
           worker_name = EXCLUDED.worker_name,
           status = 'online',
           active_terminals = EXCLUDED.active_terminals,
           cpu_percent = EXCLUDED.cpu_percent,
           memory_percent = EXCLUDED.memory_percent,
           ping_latency_ms = EXCLUDED.ping_latency_ms,
           last_heartbeat = NOW()`,
        [workerId, workerName, terminals, cpu, mem, latency]
      );
    } catch (healthErr) {
      console.warn('[WorkerSync] Failed to update worker_health in DB:', healthErr);
    }

    // In-memory workerNodes update
    let node = this.workerNodes.find(n => n.id === workerId || n.workerName === workerName);
    if (node) {
      node.status = 'online';
      node.workerName = workerName;
      node.cpuPercent = cpu;
      node.memoryPercent = mem;
      node.activeTerminals = terminals;
      node.pingLatencyMs = latency;
      node.lastHeartbeat = new Date().toISOString();
    } else {
      this.workerNodes.push({
        id: workerId,
        workerName,
        region: 'Windows VPS',
        status: 'online',
        activeTerminals: terminals,
        cpuPercent: cpu,
        memoryPercent: mem,
        pingLatencyMs: latency,
        lastHeartbeat: new Date().toISOString(),
      });
    }

    // 5. Account snapshot record (non-blocking)
    pool.query(
      `INSERT INTO account_snapshots (
         id, mt5_account_id, balance, equity, margin, floating_pnl, open_positions_count, recorded_at
       )
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())`,
      [mt5AccountId, accData.balance, accData.equity, accData.margin, calculatedFloatingPnl, posData.length]
    ).catch(() => {});

    // 6. Return status and active kill switches
    const globalKillSwitch = Boolean(this.killSwitches.globalKillSwitch);
    const accountKillSwitch = Boolean(this.killSwitches.perAccount[mt5AccountId]);

    return {
      mt5AccountId,
      globalKillSwitch,
      accountKillSwitch,
      syncedPositionsCount: posData.length,
    };
  }

  // -------------------------------------------------------------
  // MT5 WORKER COMMAND QUEUE (PHASE 1)
  // -------------------------------------------------------------

  /**
   * Enqueues a trade command for an active MT5 worker.
   * Safety guarantees:
   * - Enforces idempotency via idempotencyKey
   * - Strictly prohibits live-money accounts (accountType === 'live')
   * - Enforces that only MetaQuotes-Demo / demo accounts receive trading commands
   * - Ensures target account exists and is assigned to the specified worker
   * - Never creates fake positions
   * - Sets initial status to 'QUEUED'
   */
  public enqueueWorkerCommand(params: {
    mt5AccountId: string;
    workerId: string;
    symbol: string;
    action: 'BUY' | 'SELL' | 'CLOSE';
    volume?: number;
    stopLoss?: number;
    takeProfit?: number;
    positionTicket?: number;
    idempotencyKey?: string;
  }): { success: boolean; command?: WorkerTradeCommand; reason?: string } {
    const { mt5AccountId, workerId, symbol, action, volume, stopLoss, takeProfit, positionTicket } = params;
    const idempotencyKey = params.idempotencyKey || `cmd_idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 1. Idempotency Check: prevent duplicate command queuing
    if (this.workerCommandIdempotencyKeys.has(idempotencyKey)) {
      const existingCmdId = this.workerCommandIdempotencyKeys.get(idempotencyKey);
      const existingCmd = this.workerCommands.find(c => c.commandId === existingCmdId);
      if (existingCmd) {
        return {
          success: true,
          command: existingCmd,
          reason: 'Command already enqueued (idempotent duplicate).',
        };
      }
    }

    // 2. Validate Account Exists
    const account = this.mt5Accounts.find(a => a.id === mt5AccountId);
    if (!account) {
      return {
        success: false,
        reason: `MT5 account ${mt5AccountId} not found.`,
      };
    }

    // 3. Safety Check: Strictly Reject Live Accounts
    if (account.accountType === 'live') {
      return {
        success: false,
        reason: 'Live-money trading commands are strictly prohibited. The platform operates exclusively on demo accounts in this phase.',
      };
    }

    // 4. Safety Check: Verify account server is MetaQuotes-Demo or demo account
    const isDemoServer = account.server.toLowerCase().includes('demo');
    if (!isDemoServer && account.accountType !== 'demo') {
      return {
        success: false,
        reason: `Only MetaQuotes-Demo or demo accounts may receive trading commands (Current server: ${account.server}).`,
      };
    }

    // 5. Verify worker ID matches assigned worker
    if (account.assignedWorkerId && account.assignedWorkerId !== workerId) {
      return {
        success: false,
        reason: `Account is assigned to worker ${account.assignedWorkerId}, but command was queued for ${workerId}.`,
      };
    }

    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const newCommand: WorkerTradeCommand = {
      commandId,
      mt5AccountId,
      workerId,
      symbol: symbol.toUpperCase(),
      action,
      volume: volume !== undefined ? Number(volume) : undefined,
      stopLoss: stopLoss !== undefined ? Number(stopLoss) : undefined,
      takeProfit: takeProfit !== undefined ? Number(takeProfit) : undefined,
      positionTicket: positionTicket !== undefined ? Number(positionTicket) : undefined,
      idempotencyKey,
      status: 'QUEUED',
      createdAt: now,
      updatedAt: now,
    };

    this.workerCommands.push(newCommand);
    this.workerCommandIdempotencyKeys.set(idempotencyKey, commandId);

    return {
      success: true,
      command: newCommand,
    };
  }

  /**
   * Retrieves pending QUEUED commands for a specific worker and MT5 account.
   */
  public getPendingWorkerCommands(workerId: string, mt5AccountId: string): WorkerTradeCommand[] {
    return this.workerCommands.filter(
      c => c.workerId === workerId && c.mt5AccountId === mt5AccountId && c.status === 'QUEUED'
    );
  }

  /**
   * Transitions a QUEUED command to DISPATCHED upon delivery to the worker.
   */
  public markWorkerCommandDispatched(commandId: string, workerId: string): boolean {
    const cmd = this.workerCommands.find(c => c.commandId === commandId && c.workerId === workerId);
    if (!cmd) return false;
    if (cmd.status === 'QUEUED') {
      cmd.status = 'DISPATCHED';
      cmd.dispatchedAt = new Date().toISOString();
      cmd.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Acknowledges command execution result from the worker (FILLED / REJECTED / FAILED).
   * Note: NEVER creates fake positions. Real positions are ingested via worker sync.
   */
  public acknowledgeWorkerCommand(
    receipt: WorkerExecutionReceipt,
    workerId: string,
    mt5AccountId?: string
  ): { success: boolean; command?: WorkerTradeCommand; message: string } {
    const cmd = this.workerCommands.find(c => c.commandId === receipt.commandId);
    if (!cmd) {
      return { success: false, message: `Worker command ${receipt.commandId} not found.` };
    }

    if (cmd.workerId !== workerId) {
      return { success: false, message: `Worker ${workerId} is not authorized for command ${receipt.commandId}.` };
    }

    if (mt5AccountId && cmd.mt5AccountId !== mt5AccountId) {
      return { success: false, message: `Account mismatch for command ${receipt.commandId}.` };
    }

    const now = new Date().toISOString();
    cmd.executedAt = receipt.executedAt || now;
    cmd.updatedAt = now;
    cmd.retcode = receipt.retcode;
    cmd.message = receipt.message;

    if (receipt.status === 'FILLED') {
      cmd.status = 'EXECUTED';
      cmd.ticket = receipt.ticket;
      cmd.fillPrice = receipt.fillPrice;
      return {
        success: true,
        command: cmd,
        message: `Command ${receipt.commandId} successfully EXECUTED (Ticket #${receipt.ticket}).`,
      };
    } else {
      cmd.status = 'FAILED';
      return {
        success: true,
        command: cmd,
        message: `Command ${receipt.commandId} marked as FAILED (${receipt.message || 'Worker execution failed'}).`,
      };
    }
  }

  /**
   * Fails a worker command explicitly.
   */
  public failWorkerCommand(commandId: string, workerId: string, reason: string): boolean {
    const cmd = this.workerCommands.find(c => c.commandId === commandId && c.workerId === workerId);
    if (!cmd) return false;
    cmd.status = 'FAILED';
    cmd.message = reason;
    cmd.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Evaluates the effective manual close permission for a customer.
   * Master safety switch:
   * When globalManualTradeCloseEnabled is false, returns false for all customers.
   * When globalManualTradeCloseEnabled is true, individual customer setting decides.
   */
  public getEffectiveManualClose(userId: string): boolean {
    if (!this.globalManualTradeCloseEnabled) {
      return false;
    }
    const user = this.users.find(u => u.id === userId);
    return Boolean(user && user.manualTradeCloseEnabled);
  }

  /**
   * Sets the global master manual close switch.
   * Persists to PostgreSQL system_settings and records an audit log.
   */
  public async setGlobalManualTradeClose(
    enabled: boolean,
    adminActor: { id: string; email: string; role: string; ip: string },
    reason?: string
  ): Promise<boolean> {
    const prev = this.globalManualTradeCloseEnabled;
    this.globalManualTradeCloseEnabled = Boolean(enabled);

    try {
      await pool.query(
        `INSERT INTO system_settings (key, value, updated_at)
         VALUES ('global_manual_trade_close', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [JSON.stringify({ enabled: this.globalManualTradeCloseEnabled })]
      );
    } catch {
      // non-blocking for in-memory / testing
    }

    this.recordAudit(
      adminActor.id,
      adminActor.email,
      adminActor.role,
      'GLOBAL_MANUAL_CLOSE_TOGGLE',
      'system_settings',
      `Changed globalManualTradeCloseEnabled from ${prev} to ${this.globalManualTradeCloseEnabled}. ${reason ? 'Reason: ' + reason : ''}`.trim(),
      adminActor.ip,
      'global_manual_close'
    );

    return this.globalManualTradeCloseEnabled;
  }

  /**
   * Sets individual customer manual trade close permission.
   * Persists to PostgreSQL users table and records an audit log.
   */
  public async setUserManualTradeClose(
    userId: string,
    enabled: boolean,
    adminActor: { id: string; email: string; role: string; ip: string },
    reason?: string
  ): Promise<boolean> {
    const user = this.users.find(u => u.id === userId);
    if (!user) return false;

    const prev = Boolean(user.manualTradeCloseEnabled);
    user.manualTradeCloseEnabled = Boolean(enabled);
    user.updatedAt = new Date().toISOString();

    try {
      await pool.query(
        `UPDATE users
         SET manual_trade_close_enabled = $1, updated_at = NOW()
         WHERE id = $2`,
        [user.manualTradeCloseEnabled, user.id]
      );
    } catch {
      // non-blocking for in-memory / testing
    }

    this.recordAudit(
      adminActor.id,
      adminActor.email,
      adminActor.role,
      'USER_MANUAL_CLOSE_PERMISSION_CHANGE',
      'users',
      `Changed manualTradeCloseEnabled for ${user.email} from ${prev} to ${user.manualTradeCloseEnabled}. ${reason ? 'Reason: ' + reason : ''}`.trim(),
      adminActor.ip,
      user.id
    );

    return user.manualTradeCloseEnabled;
  }
}

export const db = new DatabaseStore();
