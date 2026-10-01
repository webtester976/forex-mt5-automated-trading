export type RoleId = 'super_admin' | 'admin' | 'risk_officer' | 'support' | 'finance' | 'customer';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleId;
  status: 'active' | 'suspended' | 'pending_verification';
  kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  manualTradeCloseEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ManualCloseSettings {
  globalManualTradeCloseEnabled: boolean;
}

export interface UserManualClosePermission {
  userId: string;
  manualTradeCloseEnabled: boolean;
  effectiveManualClose: boolean;
}

export interface MT5Account {
  id: string;
  userId: string;
  brokerName: string;
  server: string;
  loginId: string;
  accountType: 'live' | 'demo';
  isReadOnly?: boolean;
  tradingMode?: 'read_only_demo' | 'read_only_investor' | 'demo';
  currency: string;
  leverage: number;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  floatingPnl: number;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error' | 'maintenance';
  errorMessage?: string | null;
  lastSyncAt: string;
  lastSync?: string;
  assignedWorkerId?: string;
  workerNodeId?: string;
  assignedWorkerName?: string;
  pingLatencyMs?: number;
  currentAlgorithmName?: string;
}

export interface BrokerDirectoryItem {
  id: string;
  name: string;
  servers: string[];
  recommendedPingMs: number;
  isPopular: boolean;
}

export interface Position {
  id: string;
  mt5AccountId: string;
  positionTicket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  lots: number;
  openPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  currentPnl: number;
  profit?: number;
  closePrice?: number;
  closeTime?: string;
  swap: number;
  commission: number;
  status: 'open' | 'closed';
  openTime: string;
  runtimeFormatted?: string;
}

export interface PerformanceStats {
  todayPnl: number;
  weeklyPnl: number;
  weekPnl?: number;
  monthlyPnl: number;
  monthPnl?: number;
  totalPnl: number;
  totalProfit: number;
  totalLoss: number;
  netPnl: number;
  winRate: number;
  winningTrades: number;
  totalWins?: number;
  losingTrades: number;
  totalLosses?: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  maxDrawdown: number;
  totalTrades: number;
  openTradesCount: number;
}

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'expired';

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  interval: 'monthly' | 'quarterly' | 'biannual' | 'yearly' | 'profit_share';
  priceUsd: number;
  profitSharePct: number;
  maxMt5Accounts: number;
  maxTradingVolumeLots: number;
  features: string[];
  stripePriceId?: string;
  isActive: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  priceUsd: number;
  interval?: 'monthly' | 'quarterly' | 'biannual' | 'yearly' | 'profit_share';
}

export interface PaymentRecord {
  id: string;
  userId: string;
  subscriptionId?: string;
  provider: string;
  transactionId: string;
  amountUsd: number;
  currency?: string;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  invoiceNumber: string;
  createdAt: string;
  idempotencyKey?: string;
  stripePaymentIntentId?: string;
  stripeCustomerId?: string;
}

export type Payment = PaymentRecord;

export interface InvoiceRecord {
  id: string;
  paymentId?: string;
  userId: string;
  subscriptionId?: string;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  issuedDate: string;
  pdfUrl?: string;
  stripeInvoiceId?: string;
  hostedInvoiceUrl?: string;
}

export type Invoice = InvoiceRecord;

export interface Algorithm {
  id: string;
  code?: string;
  name: string;
  description: string;
  strategyType: string;
  riskTier?: 'low' | 'medium' | 'high';
  activeVersion?: string;
  version?: string;
  isActive?: boolean;
  status?: 'active' | 'paused' | 'testing';
  totalReturnPct?: number;
  sharpeRatio?: number;
  assignedAccountsCount?: number;
  winRate?: number;
  profitFactor?: number;
  maxDrawdown?: number;
  targetPairs?: string[];
  timeframes?: string[];
  parameters?: Record<string, any>;
}

export interface AlgorithmVersion {
  id: string;
  algorithmId: string;
  versionString: string;
  parameters: Record<string, any>;
  changelog: string;
  status: 'draft' | 'staging' | 'production' | 'deprecated';
  deployedAt: string;
}

export interface RiskSettings {
  maxDailyLossPct?: number;
  maxDailyLossPercent?: number;
  maxDrawdownPct?: number;
  maxDrawdownPercent?: number;
  maxLotSize: number;
  maxOpenTrades?: number;
  tradingSession?: string;
  emergencyStop: boolean;
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
  sessions?: string[];
  allowedPairs?: string[];
}

export interface KillSwitchStatus {
  globalKillSwitch: boolean;
  perAlgorithm: Record<string, boolean>;
  perAccount: Record<string, boolean>;
  lastTriggeredBy?: string;
  lastTriggeredAt?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  category: 'mt5_connection' | 'billing' | 'algorithm' | 'risk_issue' | 'other';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedAdmin?: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    senderId: string;
    senderType: 'customer' | 'admin' | 'system';
    senderRole?: 'customer' | 'admin' | 'system';
    senderName: string;
    message: string;
    createdAt: string;
    timestamp?: string;
  }>;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export type Notification = NotificationItem;

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail?: string;
  actorRole?: string;
  actorName?: string;
  action: string;
  resource?: string;
  targetType?: string;
  resourceId?: string;
  targetId?: string;
  details: string;
  ipAddress: string;
  timestamp?: string;
  createdAt: string;
}

export type AuditLog = AuditLogEntry;

export interface SignalProvider {
  id: string;
  name: string;
  strategyDescription: string;
  performanceFeePercent: number;
  totalCopiers: number;
  aumUsd: number;
  winRate: number;
  maxDrawdown: number;
  isVerified: boolean;
}

export interface WorkerHealthNode {
  id: string;
  workerName: string;
  region: string;
  status: 'online' | 'offline' | 'connecting' | 'error' | 'maintenance';
  activeTerminals: number;
  cpuPercent: number;
  memoryPercent: number;
  pingLatencyMs: number;
  lastHeartbeat: string;
}

export interface SocialPost {
  id: string;
  platform: 'telegram' | 'instagram' | 'x';
  title: string;
  summaryText: string;
  imageUrl?: string;
  stats: {
    dailyProfit: number;
    winRate: number;
    tradesExecuted: number;
    bestSymbol: string;
  };
  status: 'pending_approval' | 'approved' | 'published' | 'rejected';
  approvedBy?: string;
  createdAt: string;
  publishedAt?: string;
}

// -------------------------------------------------------------
// DEMO TRADING ENGINE TYPES
// -------------------------------------------------------------

export interface DemoAccount {
  id: string;
  userId: string;
  accountNumber: string;
  brokerName: string;
  serverName: string;
  currency: string;
  leverage: number;
  initialBalance: number;
  balance: number;
  equity: number;
  usedMargin: number;
  freeMargin: number;
  marginLevel: number;
  unrealizedPnl: number;
  realizedPnl: number;
  dailyPnl: number;
  totalPnl: number;
  peakBalance: number;
  maxDrawdownPct: number;
  winRatePct: number;
  winningTrades: number;
  losingTrades: number;
  totalTrades: number;
  tradingPaused: boolean;
  status: 'active' | 'paused' | 'reset';
  createdAt: string;
  updatedAt: string;
}

export type ExecutionStatus =
  | 'REQUESTED'
  | 'SENT'
  | 'ACKNOWLEDGED'
  | 'FILLED'
  | 'PARTIALLY_FILLED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'UNKNOWN';

export interface OrderExecutionRecord {
  id: string;
  orderTicket?: number;
  mt5AccountId: string;
  userId: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  lots: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  status: ExecutionStatus;
  idempotencyKey: string;
  reconciled: boolean;
  reconciliationAttempts: number;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

export interface DemoOrderCommand {
  userId: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  lots: number;
  stopLoss?: number;
  takeProfit?: number;
  algorithmId?: string;
  idempotencyKey?: string;
}

export interface DemoRiskEvent {
  id: string;
  userId: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  lots: number;
  ruleFailed: string;
  reason: string;
  accountMetrics: {
    balance: number;
    equity: number;
    freeMargin: number;
    marginLevel: number;
    dailyPnl: number;
    drawdownPct: number;
  };
  timestamp: string;
}

export interface DemoAlgorithmConfig {
  id: string;
  name: string;
  description: string;
  isDemoOnly: boolean;
  enabled: boolean;
  symbols: string[];
  lotSize: number;
  maxOpenPositions: number;
  stopLossPips: number;
  takeProfitPips: number;
  maxDailyLossUsd: number;
  maxDrawdownPct: number;
  timeframe: string;
  lastSignalTime?: string;
  lastSignalType?: 'BUY' | 'SELL';
  lastSignalSymbol?: string;
}

export interface MarketQuote {
  symbol: string;
  bid: number;
  ask: number;
  spreadPips: number;
  digits: number;
  contractSize: number;
  pipValue: number;
  change24hPct: number;
  high24h: number;
  low24h: number;
  updatedAt: string;
}

// -------------------------------------------------------------
// REAL MT5 WORKER COMMAND & EXECUTION TYPES (PHASE 1)
// -------------------------------------------------------------

export type WorkerCommandStatus = 'QUEUED' | 'DISPATCHED' | 'EXECUTED' | 'FAILED' | 'CANCELLED';

export interface WorkerTradeCommand {
  commandId: string;
  mt5AccountId: string;
  workerId: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'CLOSE';
  volume?: number;
  stopLoss?: number;
  takeProfit?: number;
  positionTicket?: number;
  idempotencyKey: string;
  status: WorkerCommandStatus;
  ticket?: number;
  fillPrice?: number;
  retcode?: number;
  message?: string;
  createdAt: string;
  dispatchedAt?: string;
  executedAt?: string;
  updatedAt: string;
}

export interface WorkerExecutionReceipt {
  commandId: string;
  ticket?: number;
  fillPrice?: number;
  status: 'FILLED' | 'REJECTED' | 'FAILED';
  retcode?: number;
  message?: string;
  executedAt?: string;
}

