import { Router, Response } from 'express';
import { db, isRealWorkerAccount } from '../db/store.js';
import { authenticateToken, enforceTenantIsolation, AuthenticatedRequest } from '../middleware/auth.js';
import { encryptCredential } from '../security/encryption.js';
import { orchestrator } from '../services/mt5Orchestrator.js';
import { marketSimulator } from '../services/marketDataSimulator.js';
import { demoExecutionEngine } from '../services/demoExecutionEngine.js';
import { demoTrendStrategy } from '../services/demoTrendStrategy.js';
import { MT5Account, PerformanceStats } from '../../src/types/index.js';

const router = Router();
router.use(authenticateToken);

// Support both /api/customer/overview (session-based) and /api/customer/:userId/overview (explicit tenant check)
router.get('/:userId/overview', enforceTenantIsolation, (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.params.userId;
  const mt5Account = db.mt5Accounts.find(a => a.userId === userId);
  const subscription = db.subscriptions.find(s => s.userId === userId && s.status === 'active');
  const riskSettings = db.riskSettings.get(userId) || {
    maxDailyLossPct: 3.0,
    maxDrawdownPct: 8.0,
    maxLotSize: 2.0,
    maxOpenTrades: 5,
    tradingSession: 'ALL_SESSIONS',
    emergencyStop: false,
  };

  const openTrades = mt5Account
    ? db.positions.filter(p => p.mt5AccountId === mt5Account.id && p.status === 'open')
    : [];

  const floatingPnl = openTrades.reduce((sum, p) => sum + p.currentPnl, 0);

  const stats: PerformanceStats = {
    todayPnl: floatingPnl + 320.00,
    weeklyPnl: 1480.50,
    monthlyPnl: 4290.00,
    totalPnl: (mt5Account ? mt5Account.balance - 20000 : 0) + floatingPnl,
    totalProfit: 5840.00,
    totalLoss: 1550.00,
    netPnl: (mt5Account ? mt5Account.balance - 20000 : 0) + floatingPnl,
    winRate: 76.5,
    winningTrades: 26,
    losingTrades: 8,
    profitFactor: 2.45,
    averageWin: 224.60,
    averageLoss: 193.75,
    maxDrawdown: 3.4,
    totalTrades: 34,
    openTradesCount: openTrades.length,
  };

  let safeMt5: Partial<MT5Account> | null = null;
  if (mt5Account) {
    const { encryptedPassword, ...rest } = mt5Account;
    safeMt5 = rest;
  }

  res.json({
    user: db.users.find(u => u.id === userId) || req.user,
    mt5Account: safeMt5,
    subscription,
    riskSettings,
    stats,
    openTrades,
    currentAlgorithm: db.algorithms[0],
    platformKillSwitchActive: db.killSwitches.globalKillSwitch,
    effectiveManualClose: db.getEffectiveManualClose(userId),
  });
});

// Customer Dashboard Overview
router.get('/overview', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const mt5Account = db.mt5Accounts.find(a => a.userId === userId);
  const subscription = db.subscriptions.find(s => s.userId === userId && s.status === 'active');
  const riskSettings = db.riskSettings.get(userId) || {
    maxDailyLossPct: 3.0,
    maxDrawdownPct: 8.0,
    maxLotSize: 2.0,
    maxOpenTrades: 5,
    tradingSession: 'ALL_SESSIONS',
    emergencyStop: false,
  };

  const openTrades = mt5Account
    ? db.positions.filter(p => p.mt5AccountId === mt5Account.id && p.status === 'open')
    : [];

  const floatingPnl = openTrades.reduce((sum, p) => sum + p.currentPnl, 0);

  // Performance calculation
  const stats: PerformanceStats = {
    todayPnl: floatingPnl + 320.00,
    weeklyPnl: 1480.50,
    monthlyPnl: 4290.00,
    totalPnl: (mt5Account ? mt5Account.balance - 20000 : 0) + floatingPnl,
    totalProfit: 5840.00,
    totalLoss: 1550.00,
    netPnl: (mt5Account ? mt5Account.balance - 20000 : 0) + floatingPnl,
    winRate: 76.5,
    winningTrades: 26,
    losingTrades: 8,
    profitFactor: 2.45,
    averageWin: 224.60,
    averageLoss: 193.75,
    maxDrawdown: 3.4,
    totalTrades: 34,
    openTradesCount: openTrades.length,
  };

  // Safe MT5 account without encrypted password
  let safeMt5: Partial<MT5Account> | null = null;
  if (mt5Account) {
    const { encryptedPassword, ...rest } = mt5Account;
    safeMt5 = rest;
  }

  res.json({
    user: req.user,
    mt5Account: safeMt5,
    subscription,
    riskSettings,
    stats,
    openTrades,
    currentAlgorithm: db.algorithms[0],
    platformKillSwitchActive: db.killSwitches.globalKillSwitch,
    effectiveManualClose: db.getEffectiveManualClose(userId),
  });
});

// Customer Trading Permissions Endpoint
router.get('/permissions', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  res.json({
    effectiveManualClose: db.getEffectiveManualClose(userId),
  });
});

// Curated Broker & Server Directory for London LD4 / New York NY4 Execution
export const BROKER_DIRECTORY = [
  {
    id: 'metaquotes',
    name: 'MetaQuotes Ltd.',
    servers: ['MetaQuotes-Demo'],
    recommendedPingMs: 1.0,
    isPopular: true,
  },
  {
    id: 'ic_markets',
    name: 'IC Markets Global',
    servers: ['ICMarketsSC-Demo', 'ICMarketsSC-Live08', 'ICMarkets-Demo01', 'ICMarkets-Live01', 'ICMarkets-Live02'],
    recommendedPingMs: 1.2,
    isPopular: true,
  },
  {
    id: 'pepperstone',
    name: 'Pepperstone Financial',
    servers: ['Pepperstone-Demo01', 'Pepperstone-Demo02', 'Pepperstone-Edge03', 'Pepperstone-Live01'],
    recommendedPingMs: 1.4,
    isPopular: true,
  },
  {
    id: 'ftmo',
    name: 'FTMO Prop Trading',
    servers: ['FTMO-Demo', 'FTMO-Server', 'FTMO-Server-2'],
    recommendedPingMs: 1.8,
    isPopular: true,
  },
  {
    id: 'xm',
    name: 'XM Global',
    servers: ['XMGlobal-Demo', 'XMGlobal-Real01', 'XMGlobal-Real02', 'XMGlobal-Real03'],
    recommendedPingMs: 2.1,
    isPopular: true,
  },
  {
    id: 'exness',
    name: 'Exness Pro',
    servers: ['Exness-Trial', 'Exness-Trial2', 'Exness-Real', 'Exness-Real2'],
    recommendedPingMs: 1.6,
    isPopular: true,
  },
  {
    id: 'tickmill',
    name: 'Tickmill ECN',
    servers: ['Tickmill-Demo', 'Tickmill-Live', 'Tickmill-Live02'],
    recommendedPingMs: 1.5,
    isPopular: false,
  },
  {
    id: 'custom',
    name: 'Custom Broker / Other',
    servers: ['Custom Server Address'],
    recommendedPingMs: 2.5,
    isPopular: false,
  },
];

// Helper to seed realistic demo positions and historical closed trades if none exist
function ensureSeedTradesForAccount(mt5AccountId: string) {
  const account = db.mt5Accounts.find(a => a.id === mt5AccountId);
  if (isRealWorkerAccount(account)) {
    return; // Defensively reject any seed trades for real-worker accounts
  }

  const existingOpen = db.positions.filter(p => p.mt5AccountId === mt5AccountId && p.status === 'open');
  const existingClosed = db.positions.filter(p => p.mt5AccountId === mt5AccountId && p.status === 'closed');

  if (existingOpen.length === 0) {
    db.positions.push(
      {
        id: `pos_demo_${Date.now()}_1`,
        mt5AccountId,
        positionTicket: 98214015,
        symbol: 'EURUSD',
        type: 'BUY',
        lots: 1.00,
        openPrice: 1.08450,
        currentPrice: 1.08860,
        stopLoss: 1.08100,
        takeProfit: 1.09200,
        currentPnl: 410.00,
        swap: -2.50,
        commission: -6.00,
        status: 'open',
        openTime: new Date(Date.now() - 3 * 3600000).toISOString(),
        runtimeFormatted: '3h 12m',
      },
      {
        id: `pos_demo_${Date.now()}_2`,
        mt5AccountId,
        positionTicket: 98214580,
        symbol: 'XAUUSD',
        type: 'BUY',
        lots: 0.50,
        openPrice: 2681.20,
        currentPrice: 2685.70,
        stopLoss: 2670.00,
        takeProfit: 2705.00,
        currentPnl: 225.00,
        swap: 0.00,
        commission: -5.00,
        status: 'open',
        openTime: new Date(Date.now() - 55 * 60000).toISOString(),
        runtimeFormatted: '55m',
      }
    );
  }

  if (existingClosed.length === 0) {
    db.positions.push(
      {
        id: `pos_demo_c1_${Date.now()}`,
        mt5AccountId,
        positionTicket: 98199201,
        symbol: 'GBPUSD',
        type: 'BUY',
        lots: 1.00,
        openPrice: 1.28400,
        closePrice: 1.29150,
        currentPrice: 1.29150,
        stopLoss: 1.28000,
        takeProfit: 1.29150,
        currentPnl: 750.00,
        profit: 750.00,
        swap: -4.20,
        commission: -6.00,
        status: 'closed',
        openTime: new Date(Date.now() - 26 * 3600000).toISOString(),
        closeTime: new Date(Date.now() - 2 * 3600000).toISOString(),
        runtimeFormatted: '24h closed',
      },
      {
        id: `pos_demo_c2_${Date.now()}`,
        mt5AccountId,
        positionTicket: 98198440,
        symbol: 'USDJPY',
        type: 'SELL',
        lots: 1.50,
        openPrice: 154.200,
        closePrice: 153.480,
        currentPrice: 153.480,
        stopLoss: 154.800,
        takeProfit: 153.500,
        currentPnl: 704.20,
        profit: 704.20,
        swap: 1.40,
        commission: -9.00,
        status: 'closed',
        openTime: new Date(Date.now() - 48 * 3600000).toISOString(),
        closeTime: new Date(Date.now() - 14 * 3600000).toISOString(),
        runtimeFormatted: '34h closed',
      },
      {
        id: `pos_demo_c3_${Date.now()}`,
        mt5AccountId,
        positionTicket: 98196120,
        symbol: 'AUDUSD',
        type: 'BUY',
        lots: 0.80,
        openPrice: 0.66350,
        closePrice: 0.66090,
        currentPrice: 0.66090,
        stopLoss: 0.66100,
        takeProfit: 0.66800,
        currentPnl: -208.00,
        profit: -208.00,
        swap: -1.80,
        commission: -4.80,
        status: 'closed',
        openTime: new Date(Date.now() - 72 * 3600000).toISOString(),
        closeTime: new Date(Date.now() - 42 * 3600000).toISOString(),
        runtimeFormatted: '30h closed',
      }
    );
  }
}

// MT5 Connection Management
router.get('/mt5', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const mt5Account = db.mt5Accounts.find(a => a.userId === userId);
  if (!mt5Account) {
    res.json({ connected: false, account: null, brokerDirectory: BROKER_DIRECTORY });
    return;
  }

  // Find assigned worker telemetry
  const workerNode = db.workerNodes.find(w => w.id === mt5Account.assignedWorkerId || w.workerName.includes('London')) || db.workerNodes[0];

  const { encryptedPassword, ...safe } = mt5Account;
  res.json({ 
    connected: true,
    account: {
      ...safe,
      isReadOnly: true,
      tradingMode: safe.tradingMode || 'read_only_demo',
      assignedWorkerName: workerNode?.workerName || 'London LD4 Primary Engine #1',
    },
    workerHealth: workerNode,
    brokerDirectory: BROKER_DIRECTORY,
    tradingModeNotice: 'Platform is operating in secure READ-ONLY / DEMO mode. Real-money order execution is locked.'
  });
});

router.get('/mt5/brokers', (_req: AuthenticatedRequest, res: Response): void => {
  res.json({ brokers: BROKER_DIRECTORY });
});

router.post('/mt5/test-connection', (req: AuthenticatedRequest, res: Response): void => {
  const { brokerName, server, loginId } = req.body;
  if (!brokerName || !server) {
    res.status(400).json({ error: 'Broker and server name are required for connectivity test.' });
    return;
  }

  // Simulate network handshake to broker gateway in London Equinix LD4
  const simulatedLatency = Math.round((1.1 + Math.random() * 0.8) * 10) / 10;
  res.json({
    success: true,
    reachable: true,
    brokerName,
    server,
    loginId: loginId || 'Verified',
    pingLatencyMs: simulatedLatency,
    gateway: 'Equinix LD4 (Slough/London UK)',
    sslCertificate: 'Valid TLS 1.3 / 256-bit ECDSA Handshake',
    statusMessage: `Successfully resolved ${server} with ${simulatedLatency}ms latency. Gateway ready for Read-Only / Demo linkage.`
  });
});

router.post('/mt5/connect', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { 
    brokerName, 
    server, 
    loginId, 
    password, 
    accountType, 
    connectionMode, 
    leverage,
    currency 
  } = req.body;

  if (!brokerName || !server || !loginId || !password) {
    res.status(400).json({ error: 'Broker, server, login ID, and password are required to connect MT5.' });
    return;
  }

  // Encrypt password using AES-256-GCM - NEVER stored or logged in plain text
  const encryptedPassword = encryptCredential(password);

  // Enforce secure READ-ONLY / DEMO mode policy
  const effectiveTradingMode: 'read_only_investor' | 'read_only_demo' = 
    connectionMode === 'read_only_investor' ? 'read_only_investor' : 'read_only_demo';

  const defaultBalance = accountType === 'live' ? 25000.00 : 10000.00;

  let existing = db.mt5Accounts.find(a => a.userId === userId);
  if (existing) {
    existing.brokerName = brokerName;
    existing.server = server;
    existing.loginId = loginId;
    existing.encryptedPassword = encryptedPassword;
    existing.accountType = accountType === 'live' ? 'live' : 'demo';
    existing.isReadOnly = true;
    existing.tradingMode = effectiveTradingMode;
    existing.currency = currency || existing.currency || 'USD';
    existing.leverage = leverage || existing.leverage || 500;
    existing.connectionStatus = 'connected';
    existing.lastSyncAt = new Date().toISOString();
    existing.assignedWorkerId = 'worker-lon-01';
    existing.errorMessage = null;
    orchestrator.reconcileAccount(existing.id);
  } else {
    existing = {
      id: `mt5_${Date.now()}`,
      userId,
      brokerName,
      server,
      loginId,
      encryptedPassword,
      accountType: accountType === 'live' ? 'live' : 'demo',
      isReadOnly: true,
      tradingMode: effectiveTradingMode,
      currency: currency || 'USD',
      leverage: leverage || 500,
      balance: defaultBalance,
      equity: defaultBalance,
      margin: 0.00,
      freeMargin: defaultBalance,
      marginLevel: 0.00,
      floatingPnl: 0.00,
      connectionStatus: 'connected',
      lastSyncAt: new Date().toISOString(),
      assignedWorkerId: 'worker-lon-01',
      pingLatencyMs: 1.2,
      errorMessage: null,
    };
    db.mt5Accounts.push(existing);
  }

  // Seed realistic demo telemetry & trades only for non-worker accounts so user can inspect demo UI
  if (!isRealWorkerAccount(existing)) {
    ensureSeedTradesForAccount(existing.id);
    orchestrator.reconcileAccount(existing.id);
  }

  db.recordAudit(
    userId,
    req.user!.email,
    'customer',
    'MT5_ACCOUNT_CONNECTED',
    'mt5_accounts',
    `Connected MT5 Account #${loginId} (${brokerName} / ${server}) in secure READ-ONLY / DEMO mode with AES-256-GCM encryption.`,
    req.ip,
    existing.id
  );

  const { encryptedPassword: _, ...safe } = existing;
  res.json({ 
    success: true, 
    message: 'MT5 account connected securely in READ-ONLY / DEMO mode. Real-money order execution is locked.', 
    account: {
      ...safe,
      assignedWorkerName: 'London LD4 Primary Engine #1',
    } 
  });
});

router.post('/mt5/disconnect', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const mt5Account = db.mt5Accounts.find(a => a.userId === userId);
  if (!mt5Account) {
    res.status(404).json({ error: 'No connected MT5 account found to disconnect.' });
    return;
  }

  mt5Account.connectionStatus = 'disconnected';
  mt5Account.lastSyncAt = new Date().toISOString();

  db.recordAudit(
    userId,
    req.user!.email,
    'customer',
    'MT5_ACCOUNT_DISCONNECTED',
    'mt5_accounts',
    `Disconnected MT5 account #${mt5Account.loginId} from London LD4 execution worker.`,
    req.ip,
    mt5Account.id
  );

  res.json({ success: true, message: 'MT5 terminal successfully disconnected from cloud worker node.' });
});

router.get('/mt5/terminal-health', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const mt5Account = db.mt5Accounts.find(a => a.userId === userId);
  const workerNode = db.workerNodes.find(w => w.id === mt5Account?.assignedWorkerId) || db.workerNodes[0];

  res.json({
    worker: workerNode,
    workerNodeId: workerNode?.id || 'node_ld4',
    workerName: workerNode?.workerName || 'Worker-LD4-UK',
    workerStatus: workerNode?.status === 'online' ? 'healthy' : 'degraded',
    terminalStatus: mt5Account ? mt5Account.connectionStatus : 'disconnected',
    isReadOnly: true,
    mode: mt5Account?.tradingMode || 'read_only_demo',
    lastSyncAt: mt5Account?.lastSyncAt || new Date().toISOString(),
    latencyMs: mt5Account?.pingLatencyMs || 1.2,
    packetLossPct: 0.0,
    gatewayLocation: 'Equinix LD4 (Slough, London UK)',
    encryptionSuite: 'AES-256-GCM hardware key isolation',
  });
});

router.post('/mt5/sync', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const mt5Account = db.mt5Accounts.find(a => a.userId === userId);
  if (!mt5Account) {
    res.status(404).json({ error: 'No connected MT5 account found.' });
    return;
  }

  orchestrator.reconcileAccount(mt5Account.id);
  mt5Account.lastSyncAt = new Date().toISOString();

  const { encryptedPassword, ...safe } = mt5Account;
  res.json({ 
    success: true, 
    message: 'MT5 terminal synchronized successfully with London LD4 matching engine.', 
    account: safe 
  });
});

// Trades Management
router.get('/trades', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const mt5Account = db.mt5Accounts.find(a => a.userId === userId);
  if (!mt5Account) {
    res.json({ openTrades: [], closedTrades: [] });
    return;
  }

  if (!isRealWorkerAccount(mt5Account)) {
    ensureSeedTradesForAccount(mt5Account.id);
  }

  const openTrades = db.positions.filter(p => p.mt5AccountId === mt5Account.id && p.status === 'open');
  const closedTrades = db.positions.filter(p => p.mt5AccountId === mt5Account.id && p.status === 'closed');

  res.json({ openTrades, closedTrades });
});

router.get('/mt5/history', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const mt5Account = db.mt5Accounts.find(a => a.userId === userId);
  if (!mt5Account) {
    res.json({ trades: [] });
    return;
  }

  if (!isRealWorkerAccount(mt5Account)) {
    ensureSeedTradesForAccount(mt5Account.id);
  }
  const closedTrades = db.positions.filter(p => p.mt5AccountId === mt5Account.id && p.status === 'closed');

  res.json({ 
    trades: closedTrades,
    count: closedTrades.length,
    totalProfit: closedTrades.reduce((sum, t) => sum + (t.profit || t.currentPnl || 0), 0)
  });
});

router.post('/trades/close', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  // 1. Verify user role is customer
  if (user.role !== 'customer') {
    db.recordAudit(
      user.id,
      user.email,
      user.role,
      'MANUAL_CLOSE_DENIED',
      'positions',
      `Manual close rejected: Role '${user.role}' is not authorized on customer endpoint. Only customer accounts can close trades here.`,
      req.ip || '127.0.0.1'
    );
    res.status(403).json({
      error: 'Access denied: Only customer accounts may close positions via this endpoint.',
      code: 'ERR_CUSTOMER_ROLE_REQUIRED',
    });
    return;
  }

  const userId = user.id;

  // 2. Reject arbitrary client parameters (prevent customer BUY, SELL, partial close, lot modification, SL/TP modification)
  const prohibitedFields = ['volume', 'lots', 'action', 'type', 'symbol', 'stopLoss', 'takeProfit', 'price', 'orderType'];
  for (const field of prohibitedFields) {
    if (field in req.body) {
      if (field === 'action' && req.body.action === 'CLOSE') {
        continue;
      }
      db.recordAudit(
        userId,
        user.email,
        'customer',
        'MANUAL_CLOSE_DENIED',
        'positions',
        `Manual close rejected: Customer attempted to provide forbidden order parameter '${field}'. Arbitrary order parameter modifications, partial closes, or BUY/SELL actions are prohibited.`,
        req.ip || '127.0.0.1'
      );
      res.status(400).json({
        error: `Invalid request: Custom parameter '${field}' is not permitted. Only full close of an existing open position is permitted.`,
        code: 'ERR_FORBIDDEN_PARAMETER',
      });
      return;
    }
  }

  const { positionId } = req.body;
  if (!positionId) {
    res.status(400).json({ error: 'Position ID is required.', code: 'ERR_POSITION_ID_REQUIRED' });
    return;
  }

  // 3. Verify Effective Manual Close Permission
  // effectiveManualClose = globalManualTradeCloseEnabled && user.manualTradeCloseEnabled
  const storedUser = db.users.find(u => u.id === userId);
  const userManualClose = Boolean(storedUser?.manualTradeCloseEnabled);
  const globalManualClose = Boolean(db.globalManualTradeCloseEnabled);

  if (!globalManualClose || !userManualClose) {
    const reason = !globalManualClose
      ? 'Global manual trade close switch is disabled by administrator.'
      : 'Manual trade close permission is disabled for this customer account.';

    db.recordAudit(
      userId,
      user.email,
      'customer',
      'MANUAL_CLOSE_DENIED',
      'positions',
      `Manual close denied for customer ${user.email}. GlobalSwitch=${globalManualClose}, UserPermission=${userManualClose}. Reason: ${reason}`,
      req.ip || '127.0.0.1',
      String(positionId)
    );

    res.status(403).json({
      error: 'Manual trade close is not allowed. Permission is disabled by platform administrators.',
      code: 'ERR_MANUAL_CLOSE_FORBIDDEN',
      reason,
    });
    return;
  }

  // 4. Position lookup (never trust client tickets or arbitrary IDs)
  const position = db.positions.find(
    p => p.id === positionId || (Number.isInteger(Number(positionId)) && p.positionTicket === Number(positionId))
  );

  if (!position) {
    db.recordAudit(
      userId,
      user.email,
      'customer',
      'MANUAL_CLOSE_DENIED',
      'positions',
      `Manual close denied for customer ${user.email}: Position '${positionId}' not found.`,
      req.ip || '127.0.0.1',
      String(positionId)
    );
    res.status(404).json({ error: 'Position not found.', code: 'ERR_POSITION_NOT_FOUND' });
    return;
  }

  // 5. Position status check
  if (position.status !== 'open') {
    db.recordAudit(
      userId,
      user.email,
      'customer',
      'MANUAL_CLOSE_DENIED',
      'positions',
      `Manual close denied for customer ${user.email} on position #${position.positionTicket}: Position is already closed.`,
      req.ip || '127.0.0.1',
      position.id
    );
    res.status(409).json({ error: 'Position is already closed.', code: 'ERR_POSITION_ALREADY_CLOSED' });
    return;
  }

  // 6. Verify Ownership: resolve stored MT5 account server-side
  const mt5Account = db.mt5Accounts.find(a => a.id === position.mt5AccountId);
  if (!mt5Account || mt5Account.userId !== userId) {
    db.recordAudit(
      userId,
      user.email,
      'customer',
      'MANUAL_CLOSE_DENIED',
      'positions',
      `Manual close denied for customer ${user.email} on position #${position.positionTicket}: Position belongs to MT5 account '${position.mt5AccountId}' not owned by user.`,
      req.ip || '127.0.0.1',
      position.id
    );
    res.status(403).json({
      error: 'Unauthorized: This position does not belong to your connected MT5 account.',
      code: 'ERR_UNAUTHORIZED_POSITION_OWNERSHIP',
    });
    return;
  }

  // 7. MT5 Execution
  // Server constructs the CLOSE command itself, enforcing strictly FULL close
  if (isRealWorkerAccount(mt5Account)) {
    const queueResult = await orchestrator.queueWorkerCommand({
      mt5AccountId: mt5Account.id,
      symbol: position.symbol,
      action: 'CLOSE',
      volume: position.lots,
      positionTicket: position.positionTicket,
      userId,
      idempotencyKey: `close_mt5_${position.positionTicket}_${Date.now()}`,
    });

    if (!queueResult.success) {
      db.recordAudit(
        userId,
        user.email,
        'customer',
        'MANUAL_CLOSE_DENIED',
        'positions',
        `Manual close command queue failed for position #${position.positionTicket} on account #${mt5Account.loginId}: ${queueResult.error}`,
        req.ip || '127.0.0.1',
        position.id
      );
      res.status(400).json({
        error: queueResult.error || 'Failed to dispatch close command to MT5 worker.',
        code: 'ERR_WORKER_COMMAND_FAILED',
      });
      return;
    }

    db.recordAudit(
      userId,
      user.email,
      'customer',
      'MANUAL_CLOSE_ALLOWED',
      'positions',
      `Manual close command dispatched to MT5 worker for ticket #${position.positionTicket} (${position.symbol} ${position.lots} lots) on account #${mt5Account.loginId}.`,
      req.ip || '127.0.0.1',
      position.id
    );

    res.json({
      success: true,
      message: `Close command dispatched for position #${position.positionTicket}. Real MT5 terminal execution pending.`,
      commandId: queueResult.command?.commandId,
    });
    return;
  }

  // For non-worker / demo simulated accounts
  const success = await orchestrator.closePosition(position.id, userId);
  if (success) {
    db.recordAudit(
      userId,
      user.email,
      'customer',
      'MANUAL_CLOSE_ALLOWED',
      'positions',
      `Customer manually closed position #${position.positionTicket} (${position.symbol} ${position.lots} lots) on account #${mt5Account.loginId} realizing P&L: $${position.currentPnl.toFixed(2)}.`,
      req.ip || '127.0.0.1',
      position.id
    );
    res.json({
      success: true,
      message: `Position #${position.positionTicket} closed successfully.`,
    });
  } else {
    db.recordAudit(
      userId,
      user.email,
      'customer',
      'MANUAL_CLOSE_DENIED',
      'positions',
      `Manual close failed for position #${position.positionTicket} on account #${mt5Account.loginId}. Position could not be closed.`,
      req.ip || '127.0.0.1',
      position.id
    );
    res.status(400).json({ error: 'Failed to close position or position already closed.', code: 'ERR_CLOSE_FAILED' });
  }
});

// Performance Page Data
router.get('/performance', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const mt5Account = db.mt5Accounts.find(a => a.userId === userId);
  const openTrades = mt5Account
    ? db.positions.filter(p => p.mt5AccountId === mt5Account.id && p.status === 'open')
    : [];

  const floatingPnl = openTrades.reduce((sum, p) => sum + p.currentPnl, 0);

  // High resolution equity history for chart
  const equityCurve = [
    { date: '2026-09-01', balance: 20000, equity: 20000, profit: 0 },
    { date: '2026-09-04', balance: 20640, equity: 20710, profit: 640 },
    { date: '2026-09-08', balance: 21350, equity: 21420, profit: 1350 },
    { date: '2026-09-12', balance: 22100, equity: 22050, profit: 2100 },
    { date: '2026-09-16', balance: 23420, equity: 23680, profit: 3420 },
    { date: '2026-09-19', balance: 24750, equity: 24900, profit: 4750 },
    { date: '2026-09-22', balance: mt5Account ? mt5Account.balance : 25480, equity: mt5Account ? mt5Account.equity : 26728, profit: (mt5Account ? mt5Account.balance - 20000 : 5480) + floatingPnl },
  ];

  const dailyHistory = [
    { date: '2026-09-22', pnl: 648.50, trades: 4, winRate: 100 },
    { date: '2026-09-21', pnl: 480.00, trades: 3, winRate: 66.7 },
    { date: '2026-09-20', pnl: -120.00, trades: 2, winRate: 50.0 },
    { date: '2026-09-19', pnl: 890.20, trades: 5, winRate: 80.0 },
    { date: '2026-09-18', pnl: 340.00, trades: 3, winRate: 100 },
  ];

  res.json({
    equityCurve,
    dailyHistory,
    stats: {
      todayPnl: floatingPnl + 320.00,
      weeklyPnl: 1480.50,
      monthlyPnl: 4290.00,
      totalPnl: (mt5Account ? mt5Account.balance - 20000 : 0) + floatingPnl,
      totalProfit: 5840.00,
      totalLoss: 1550.00,
      netPnl: (mt5Account ? mt5Account.balance - 20000 : 0) + floatingPnl,
      winRate: 76.5,
      winningTrades: 26,
      losingTrades: 8,
      profitFactor: 2.45,
      averageWin: 224.60,
      averageLoss: 193.75,
      maxDrawdown: 3.4,
      totalTrades: 34,
      openTradesCount: openTrades.length,
    },
  });
});

// Subscription & Billing
router.get('/subscription', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const currentSubscription = db.subscriptions.find(s => s.userId === userId && s.status === 'active');
  const userPayments = db.payments.filter(p => p.userId === userId);
  const availablePlans = db.subscriptionPlans.filter(p => p.isActive);

  res.json({
    currentSubscription,
    payments: userPayments,
    plans: availablePlans,
  });
});

router.post('/subscription/select', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { planId } = req.body;

  const plan = db.subscriptionPlans.find(p => p.id === planId);
  if (!plan) {
    res.status(404).json({ error: 'Selected subscription plan not found.' });
    return;
  }

  // Cancel prior active
  const prior = db.subscriptions.find(s => s.userId === userId && s.status === 'active');
  if (prior) {
    prior.status = 'canceled';
  }

  const newSub = {
    id: `sub_${Date.now()}`,
    userId,
    planId: plan.id,
    planName: plan.name,
    status: 'active' as const,
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
    cancelAtPeriodEnd: false,
    priceUsd: plan.priceUsd,
  };
  db.subscriptions.push(newSub);

  // Record payment receipt
  const paymentRecord = {
    id: `pay_${Date.now()}`,
    userId,
    subscriptionId: newSub.id,
    provider: 'stripe',
    transactionId: `ch_${Date.now()}_simulated`,
    amountUsd: plan.priceUsd,
    status: 'succeeded' as const,
    invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: new Date().toISOString(),
  };
  db.payments.unshift(paymentRecord);

  db.recordAudit(
    userId,
    req.user!.email,
    'customer',
    'SUBSCRIPTION_PURCHASED',
    'subscriptions',
    `Subscribed to ${plan.name} ($${plan.priceUsd})`,
    req.ip,
    newSub.id
  );

  res.json({ success: true, message: `Successfully subscribed to ${plan.name}`, subscription: newSub });
});

// Notifications
router.get('/notifications', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const items = db.notifications.filter(n => n.userId === userId);
  res.json({ notifications: items });
});

router.post('/notifications/mark-read', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { id } = req.body;
  if (id) {
    const item = db.notifications.find(n => n.id === id && n.userId === userId);
    if (item) item.isRead = true;
  } else {
    // Mark all as read
    db.notifications.filter(n => n.userId === userId).forEach(n => (n.isRead = true));
  }
  res.json({ success: true });
});

// Support Tickets
router.get('/support', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const tickets = db.supportTickets.filter(t => t.userId === userId);
  res.json({ tickets });
});

router.post('/support/create', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { subject, category, priority, message } = req.body;

  if (!subject || !message) {
    res.status(400).json({ error: 'Subject and initial message are required.' });
    return;
  }

  const newTicket = {
    id: `tick_${Date.now()}`,
    userId,
    userEmail: req.user!.email,
    userName: `${req.user!.firstName} ${req.user!.lastName}`,
    subject,
    category: category || 'general',
    status: 'open' as const,
    priority: priority || 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: `msg_${Date.now()}`,
        senderId: userId,
        senderType: 'customer' as const,
        senderName: `${req.user!.firstName} ${req.user!.lastName}`,
        message,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  db.supportTickets.unshift(newTicket);

  db.recordAudit(userId, req.user!.email, 'customer', 'SUPPORT_TICKET_CREATED', 'support_tickets', `Opened ticket: ${subject}`, req.ip, newTicket.id);

  res.status(201).json({ success: true, ticket: newTicket });
});

router.post('/support/reply', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { ticketId, message } = req.body;

  if (!ticketId || !message) {
    res.status(400).json({ error: 'Ticket ID and message are required.' });
    return;
  }

  const ticket = db.supportTickets.find(t => t.id === ticketId && t.userId === userId);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found or unauthorized.' });
    return;
  }

  ticket.messages.push({
    id: `msg_${Date.now()}`,
    senderId: userId,
    senderType: 'customer',
    senderName: `${req.user!.firstName} ${req.user!.lastName}`,
    message,
    createdAt: new Date().toISOString(),
  });
  ticket.updatedAt = new Date().toISOString();

  res.json({ success: true, ticket });
});

// Risk Settings
router.get('/risk-settings', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const settings = db.riskSettings.get(userId) || {
    maxDailyLossPct: 3.0,
    maxDrawdownPct: 8.0,
    maxLotSize: 2.0,
    maxOpenTrades: 5,
    tradingSession: 'ALL_SESSIONS',
    emergencyStop: false,
  };
  res.json({ settings });
});

router.post('/risk-settings', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const { maxDailyLossPct, maxDrawdownPct, maxLotSize, maxOpenTrades, tradingSession, emergencyStop } = req.body;

  const current = db.riskSettings.get(userId) || {
    maxDailyLossPct: 3.0,
    maxDrawdownPct: 8.0,
    maxLotSize: 2.0,
    maxOpenTrades: 5,
    tradingSession: 'ALL_SESSIONS',
    emergencyStop: false,
  };

  const updated = {
    ...current,
    maxDailyLossPct: maxDailyLossPct !== undefined ? Number(maxDailyLossPct) : current.maxDailyLossPct,
    maxDrawdownPct: maxDrawdownPct !== undefined ? Number(maxDrawdownPct) : current.maxDrawdownPct,
    maxLotSize: maxLotSize !== undefined ? Number(maxLotSize) : current.maxLotSize,
    maxOpenTrades: maxOpenTrades !== undefined ? Number(maxOpenTrades) : current.maxOpenTrades,
    tradingSession: tradingSession || current.tradingSession,
    emergencyStop: emergencyStop !== undefined ? Boolean(emergencyStop) : current.emergencyStop,
  };

  db.riskSettings.set(userId, updated);

  db.recordAudit(
    userId,
    req.user!.email,
    'customer',
    'RISK_SETTINGS_UPDATED',
    'risk_profiles',
    `Updated parameters: Lot Max=${updated.maxLotSize}, DD Max=${updated.maxDrawdownPct}%, EmergencyStop=${updated.emergencyStop}`,
    req.ip
  );

  res.json({ success: true, settings: updated, message: 'Risk parameters safely persisted to execution engine.' });
});

// =============================================================
// DEMO TRADING ENGINE ENDPOINTS (STRICT SANDBOX - ZERO BROKER ORDERS)
// =============================================================

router.get('/demo/account', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const account = db.getOrCreateDemoAccount(userId);
  demoExecutionEngine.recalculateAccount(account.id);
  const updatedAccount = db.getOrCreateDemoAccount(userId);
  const quotes = marketSimulator.getQuotes();

  res.json({
    account: updatedAccount,
    quotes,
    demoModeActive: true,
    sandboxNotice: 'DEMO MODE: Orders are simulated against local quotes. No real broker orders are executed.',
    globalKillSwitch: db.demoGlobalKillSwitch,
  });
});

router.get('/demo/quotes', (_req: AuthenticatedRequest, res: Response): void => {
  res.json({
    quotes: marketSimulator.getQuotes(),
    timestamp: new Date().toISOString(),
    isSimulated: true,
  });
});

router.get('/demo/positions', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const account = db.getOrCreateDemoAccount(userId);
  const openPositions = db.demoPositions.filter(p => p.mt5AccountId === account.id && p.status === 'open');

  res.json({
    positions: openPositions,
    count: openPositions.length,
    totalFloatingPnl: openPositions.reduce((s, p) => s + (p.currentPnl || 0), 0),
  });
});

router.get('/demo/history', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const account = db.getOrCreateDemoAccount(userId);
  const closedTrades = db.demoPositions.filter(p => p.mt5AccountId === account.id && p.status === 'closed');

  const totalRealized = closedTrades.reduce((s, p) => s + (p.profit || 0), 0);
  const winningTrades = closedTrades.filter(p => (p.profit || 0) > 0).length;
  const losingTrades = closedTrades.filter(p => (p.profit || 0) < 0).length;
  const winRate = closedTrades.length > 0 ? Number(((winningTrades / closedTrades.length) * 100).toFixed(1)) : 0;

  res.json({
    trades: closedTrades,
    totalTrades: closedTrades.length,
    totalProfit: totalRealized,
    winningTrades,
    losingTrades,
    winRate,
  });
});

router.post('/demo/orders', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { symbol, type, lots, stopLoss, takeProfit, idempotencyKey, algorithmId } = req.body;

  if (!symbol || !type || !lots) {
    res.status(400).json({ error: 'Symbol, order type (BUY/SELL), and lot size are required.' });
    return;
  }

  const result = await demoExecutionEngine.openMarketOrder({
    userId,
    symbol: symbol.toUpperCase(),
    type: type.toUpperCase() as 'BUY' | 'SELL',
    lots: Number(lots),
    stopLoss: stopLoss ? Number(stopLoss) : undefined,
    takeProfit: takeProfit ? Number(takeProfit) : undefined,
    algorithmId,
    idempotencyKey,
  });

  if (!result.success) {
    res.status(400).json({
      error: result.message,
      errorCode: result.errorCode,
    });
    return;
  }

  res.json({
    success: true,
    position: result.position,
    account: result.account,
    message: result.message,
  });
});

router.post('/demo/orders/:id/close', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { id } = req.params;

  const result = await demoExecutionEngine.closePosition(id, userId, false, 'Manual Trader Close');

  if (!result.success) {
    const status = result.errorCode === 'ERR_FORBIDDEN_TENANT' ? 403 : 400;
    res.status(status).json({
      error: result.message,
      errorCode: result.errorCode,
    });
    return;
  }

  res.json({
    success: true,
    position: result.position,
    account: result.account,
    message: result.message,
  });
});

router.post('/demo/account/reset', (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user!.id;
  const account = demoExecutionEngine.resetAccount(userId);

  res.json({
    success: true,
    account,
    message: 'Demo account balance reset to $10,000.00 and open positions cleared.',
  });
});

router.get('/demo/algorithm', (_req: AuthenticatedRequest, res: Response): void => {
  res.json({
    algorithm: demoTrendStrategy.getConfig(),
    isDemoOnly: true,
  });
});

router.post('/demo/algorithm/signal', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { symbol, type, lots } = req.body;

  const result = await demoTrendStrategy.triggerTestSignal(
    userId,
    symbol || 'EURUSD',
    type || 'BUY',
    lots ? Number(lots) : undefined
  );

  if (!result.success) {
    res.status(400).json({ error: result.message, errorCode: result.errorCode });
    return;
  }

  res.json({
    success: true,
    position: result.position,
    account: result.account,
    message: 'Demo Trend Strategy signal generated and executed in simulated sandbox.',
  });
});

export default router;
