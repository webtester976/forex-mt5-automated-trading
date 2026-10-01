import { pgTable, text, timestamp, boolean, integer, numeric, jsonb, uuid, primaryKey, index, uniqueIndex, date, bigint } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users & Profiles
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(),
  isEmailVerified: boolean('is_email_verified').default(false),
  status: text('status').default('active'),
  kycStatus: text('kyc_status').default('unverified'),
  manualTradeCloseEnabled: boolean('manual_trade_close_enabled').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phone: text('phone'),
  country: text('country'),
  timezone: text('timezone').default('UTC'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 2. Roles & Permissions
export const roles = pgTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
});

export const permissions = pgTable('permissions', {
  id: text('id').primaryKey(),
  category: text('category').notNull(),
  description: text('description'),
});

export const rolePermissions = pgTable('role_permissions', {
  roleId: text('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  permissionId: text('permission_id').references(() => permissions.id, { onDelete: 'cascade' }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.roleId, t.permissionId] }),
}));

export const userRoles = pgTable('user_roles', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  roleId: text('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.roleId] }),
}));

// 3. Brokers & MT5 Accounts
export const brokers = pgTable('brokers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  serverList: jsonb('server_list').notNull().default([]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const mt5Accounts = pgTable('mt5_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  brokerName: text('broker_name').notNull(),
  server: text('server').notNull(),
  loginId: text('login_id').notNull(),
  encryptedPassword: text('encrypted_password').notNull(),
  accountType: text('account_type').default('live'),
  currency: text('currency').default('USD'),
  leverage: integer('leverage').default(100),
  balance: numeric('balance', { precision: 14, scale: 2 }).default('0.00'),
  equity: numeric('equity', { precision: 14, scale: 2 }).default('0.00'),
  margin: numeric('margin', { precision: 14, scale: 2 }).default('0.00'),
  freeMargin: numeric('free_margin', { precision: 14, scale: 2 }).default('0.00'),
  marginLevel: numeric('margin_level', { precision: 10, scale: 2 }).default('0.00'),
  floatingPnl: numeric('floating_pnl', { precision: 14, scale: 2 }).default('0.00'),
  connectionStatus: text('connection_status').default('disconnected'),
  assignedWorkerId: text('assigned_worker_id'),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  userIdx: index('idx_mt5_accounts_user_id').on(t.userId),
  brokerLoginUnique: uniqueIndex('unique_broker_login').on(t.brokerName, t.server, t.loginId),
}));

export const mt5Connections = pgTable('mt5_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  mt5AccountId: uuid('mt5_account_id').references(() => mt5Accounts.id, { onDelete: 'cascade' }),
  workerNodeId: text('worker_node_id').notNull(),
  latencyMs: integer('latency_ms').default(0),
  ipAddress: text('ip_address'),
  connectedAt: timestamp('connected_at', { withTimezone: true }).defaultNow(),
  disconnectedAt: timestamp('disconnected_at', { withTimezone: true }),
});

// 4. Subscriptions & Payments
export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  interval: text('interval').notNull(),
  priceUsd: numeric('price_usd', { precision: 10, scale: 2 }).notNull(),
  profitSharePct: numeric('profit_share_pct', { precision: 5, scale: 2 }).default('0.00'),
  maxMt5Accounts: integer('max_mt5_accounts').default(1),
  maxTradingVolumeLots: numeric('max_trading_volume_lots', { precision: 10, scale: 2 }).default('50.00'),
  features: jsonb('features').notNull().default([]),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  planId: uuid('plan_id').references(() => subscriptionPlans.id).notNull(),
  status: text('status').notNull(),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  userStatusIdx: index('idx_subscriptions_user_status').on(t.userId, t.status),
}));

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
  provider: text('provider').default('stripe').notNull(),
  providerTransactionId: text('provider_transaction_id').unique(),
  idempotencyKey: text('idempotency_key').unique().notNull(),
  amountUsd: numeric('amount_usd', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('USD'),
  status: text('status').notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }).unique(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  invoiceNumber: text('invoice_number').unique().notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  tax: numeric('tax', { precision: 10, scale: 2 }).default('0.00'),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  issuedDate: date('issued_date').notNull(),
  pdfUrl: text('pdf_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 5. Algorithms & Versions
export const algorithms = pgTable('algorithms', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  strategyType: text('strategy_type').notNull(),
  riskTier: text('risk_tier').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const algorithmVersions = pgTable('algorithm_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  algorithmId: uuid('algorithm_id').references(() => algorithms.id, { onDelete: 'cascade' }).notNull(),
  versionString: text('version_string').notNull(),
  parameters: jsonb('parameters').notNull().default({}),
  changelog: text('changelog'),
  status: text('status').default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  uniqueAlgoVersion: uniqueIndex('unique_algo_version').on(t.algorithmId, t.versionString),
}));

export const algorithmAssignments = pgTable('algorithm_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  mt5AccountId: uuid('mt5_account_id').references(() => mt5Accounts.id, { onDelete: 'cascade' }).notNull(),
  algorithmVersionId: uuid('algorithm_version_id').references(() => algorithmVersions.id).notNull(),
  allocationPct: numeric('allocation_pct', { precision: 5, scale: 2 }).default('100.00'),
  status: text('status').default('active'),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow(),
});

// 6. Orders, Positions, Deals, Trades
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  mt5AccountId: uuid('mt5_account_id').references(() => mt5Accounts.id, { onDelete: 'cascade' }).notNull(),
  orderTicket: bigint('order_ticket', { mode: 'number' }),
  symbol: text('symbol').notNull(),
  orderType: text('order_type').notNull(),
  lots: numeric('lots', { precision: 10, scale: 2 }).notNull(),
  price: numeric('price', { precision: 14, scale: 5 }).notNull(),
  stopLoss: numeric('stop_loss', { precision: 14, scale: 5 }),
  takeProfit: numeric('take_profit', { precision: 14, scale: 5 }),
  status: text('status').notNull(),
  idempotencyKey: text('idempotency_key').unique().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  accountStatusIdx: index('idx_orders_account_status').on(t.mt5AccountId, t.status),
}));

export const positions = pgTable('positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  mt5AccountId: uuid('mt5_account_id').references(() => mt5Accounts.id, { onDelete: 'cascade' }).notNull(),
  positionTicket: bigint('position_ticket', { mode: 'number' }).unique().notNull(),
  symbol: text('symbol').notNull(),
  positionType: text('position_type').notNull(),
  lots: numeric('lots', { precision: 10, scale: 2 }).notNull(),
  openPrice: numeric('open_price', { precision: 14, scale: 5 }).notNull(),
  currentPrice: numeric('current_price', { precision: 14, scale: 5 }).notNull(),
  stopLoss: numeric('stop_loss', { precision: 14, scale: 5 }),
  takeProfit: numeric('take_profit', { precision: 14, scale: 5 }),
  currentPnl: numeric('current_pnl', { precision: 14, scale: 2 }).default('0.00'),
  swap: numeric('swap', { precision: 10, scale: 2 }).default('0.00'),
  commission: numeric('commission', { precision: 10, scale: 2 }).default('0.00'),
  status: text('status').default('open'),
  openedAt: timestamp('opened_at', { withTimezone: true }).notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
}, (t) => ({
  accountStatusIdx: index('idx_positions_account_status').on(t.mt5AccountId, t.status),
}));

export const deals = pgTable('deals', {
  id: uuid('id').primaryKey().defaultRandom(),
  positionId: uuid('position_id').references(() => positions.id, { onDelete: 'set null' }),
  dealTicket: bigint('deal_ticket', { mode: 'number' }).unique().notNull(),
  symbol: text('symbol').notNull(),
  entryType: text('entry_type').notNull(),
  price: numeric('price', { precision: 14, scale: 5 }).notNull(),
  profit: numeric('profit', { precision: 14, scale: 2 }).notNull(),
  executedAt: timestamp('executed_at', { withTimezone: true }).notNull(),
});

export const trades = pgTable('trades', {
  id: uuid('id').primaryKey().defaultRandom(),
  mt5AccountId: uuid('mt5_account_id').references(() => mt5Accounts.id, { onDelete: 'cascade' }).notNull(),
  ticket: bigint('ticket', { mode: 'number' }).unique().notNull(),
  symbol: text('symbol').notNull(),
  tradeType: text('trade_type').notNull(),
  lots: numeric('lots', { precision: 10, scale: 2 }).notNull(),
  openPrice: numeric('open_price', { precision: 14, scale: 5 }).notNull(),
  closePrice: numeric('close_price', { precision: 14, scale: 5 }).notNull(),
  stopLoss: numeric('stop_loss', { precision: 14, scale: 5 }),
  takeProfit: numeric('take_profit', { precision: 14, scale: 5 }),
  profit: numeric('profit', { precision: 14, scale: 2 }).notNull(),
  commission: numeric('commission', { precision: 10, scale: 2 }).default('0.00'),
  swap: numeric('swap', { precision: 10, scale: 2 }).default('0.00'),
  openTime: timestamp('open_time', { withTimezone: true }).notNull(),
  closeTime: timestamp('close_time', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  accountTimeIdx: index('idx_trades_account_time').on(t.mt5AccountId, t.closeTime),
}));

// 7. Snapshots & Statistics
export const accountSnapshots = pgTable('account_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  mt5AccountId: uuid('mt5_account_id').references(() => mt5Accounts.id, { onDelete: 'cascade' }).notNull(),
  balance: numeric('balance', { precision: 14, scale: 2 }).notNull(),
  equity: numeric('equity', { precision: 14, scale: 2 }).notNull(),
  margin: numeric('margin', { precision: 14, scale: 2 }).notNull(),
  floatingPnl: numeric('floating_pnl', { precision: 14, scale: 2 }).notNull(),
  openPositionsCount: integer('open_positions_count').notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow(),
});

export const performanceSnapshots = pgTable('performance_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  mt5AccountId: uuid('mt5_account_id').references(() => mt5Accounts.id, { onDelete: 'cascade' }),
  winRate: numeric('win_rate', { precision: 5, scale: 2 }).default('0.00'),
  profitFactor: numeric('profit_factor', { precision: 6, scale: 2 }).default('0.00'),
  totalPnl: numeric('total_pnl', { precision: 14, scale: 2 }).default('0.00'),
  maxDrawdown: numeric('max_drawdown', { precision: 5, scale: 2 }).default('0.00'),
  winningTrades: integer('winning_trades').default(0),
  losingTrades: integer('losing_trades').default(0),
  totalTrades: integer('total_trades').default(0),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  userIdx: index('idx_performance_snapshots_user').on(t.userId, t.recordedAt),
}));

export const dailyStatistics = pgTable('daily_statistics', {
  id: uuid('id').primaryKey().defaultRandom(),
  mt5AccountId: uuid('mt5_account_id').references(() => mt5Accounts.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  startingBalance: numeric('starting_balance', { precision: 14, scale: 2 }).notNull(),
  endingBalance: numeric('ending_balance', { precision: 14, scale: 2 }).notNull(),
  netProfit: numeric('net_profit', { precision: 14, scale: 2 }).notNull(),
  totalTrades: integer('total_trades').default(0),
  winningTrades: integer('winning_trades').default(0),
  losingTrades: integer('losing_trades').default(0),
  maxDrawdownPct: numeric('max_drawdown_pct', { precision: 6, scale: 2 }).default('0.00'),
}, (t) => ({
  uniqueAccountDaily: uniqueIndex('unique_account_daily').on(t.mt5AccountId, t.date),
}));

// 8. Risk Management
export const riskProfiles = pgTable('risk_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).unique().notNull(),
  riskTier: text('risk_tier').default('moderate'),
  maxDailyLossPct: numeric('max_daily_loss_pct', { precision: 5, scale: 2 }).default('3.00'),
  maxDrawdownPct: numeric('max_drawdown_pct', { precision: 5, scale: 2 }).default('8.00'),
  maxLotSize: numeric('max_lot_size', { precision: 10, scale: 2 }).default('2.00'),
  maxOpenTrades: integer('max_open_trades').default(5),
  emergencyStop: boolean('emergency_stop').default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const riskEvents = pgTable('risk_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  mt5AccountId: uuid('mt5_account_id').references(() => mt5Accounts.id, { onDelete: 'set null' }),
  severity: text('severity').notNull(),
  ruleViolated: text('rule_violated').notNull(),
  details: text('details'),
  actionTaken: text('action_taken').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 9. Notifications
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  userUnreadIdx: index('idx_notifications_user_unread').on(t.userId, t.isRead),
}));

export const notificationPreferences = pgTable('notification_preferences', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  emailTradeOpened: boolean('email_trade_opened').default(false),
  emailTradeClosed: boolean('email_trade_closed').default(true),
  emailDailyDigest: boolean('email_daily_digest').default(true),
  emailRiskAlerts: boolean('email_risk_alerts').default(true),
  emailSubscriptionRenewal: boolean('email_subscription_renewal').default(true),
});

// 10. Support
export const supportTickets = pgTable('support_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  subject: text('subject').notNull(),
  category: text('category').notNull(),
  status: text('status').default('open'),
  priority: text('priority').default('medium'),
  assignedAdminId: uuid('assigned_admin_id').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const supportMessages = pgTable('support_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id').references(() => supportTickets.id, { onDelete: 'cascade' }).notNull(),
  senderId: uuid('sender_id').references(() => users.id).notNull(),
  senderType: text('sender_type').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 11. Audit Logs & System Health
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  changes: jsonb('changes'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  actorCreatedIdx: index('idx_audit_logs_actor_created').on(t.actorId, t.createdAt),
}));

export const workerHealth = pgTable('worker_health', {
  id: text('id').primaryKey(),
  workerName: text('worker_name').notNull(),
  region: text('region').notNull(),
  status: text('status').notNull(),
  activeTerminals: integer('active_terminals').default(0),
  cpuPercent: numeric('cpu_percent', { precision: 5, scale: 2 }).default('0.00'),
  memoryPercent: numeric('memory_percent', { precision: 5, scale: 2 }).default('0.00'),
  pingLatencyMs: integer('ping_latency_ms').default(1),
  lastHeartbeat: timestamp('last_heartbeat', { withTimezone: true }).defaultNow(),
});

// 12. Asynchronous Jobs Queue
export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  queueName: text('queue_name').default('default').notNull(),
  jobType: text('job_type').notNull(),
  payload: jsonb('payload').default({}).notNull(),
  status: text('status').default('pending').notNull(),
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(3),
  errorMessage: text('error_message'),
  runAt: timestamp('run_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => ({
  statusRunIdx: index('idx_jobs_status_run').on(t.status, t.runAt),
}));

export const systemSettings = pgTable('system_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
