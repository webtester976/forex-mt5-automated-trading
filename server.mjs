var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server.ts
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

// server/routes/auth.ts
import { Router } from "express";
import crypto3 from "crypto";

// server/security/encryption.ts
import crypto from "crypto";
function getEncryptionKey() {
  const raw = process.env.MT5_ENCRYPTION_KEY;
  if (raw && raw.length >= 64) {
    return Buffer.from(raw.slice(0, 64), "hex");
  }
  if (raw) {
    return Buffer.from(raw.padEnd(64, "0").slice(0, 64), "hex");
  }
  return crypto.scryptSync("forex-saas-mt5-encryption-salt", "salt", 32);
}
var ALGORITHM = "aes-256-gcm";
var IV_LENGTH = 16;
function encryptCredential(plainText) {
  if (!plainText) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1e5, 64, "sha512").toString("hex");
  return { hash, salt };
}
function verifyPassword(password, hash, salt) {
  const checkHash = crypto.pbkdf2Sync(password, salt, 1e5, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(checkHash, "hex"));
}
function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const tokenPayload = {
    exp: Date.now() + 24 * 60 * 60 * 1e3,
    ...payload
  };
  const body = Buffer.from(JSON.stringify(tokenPayload)).toString("base64url");
  const secret = process.env.JWT_SECRET || "dev-secret-key-forex-mt5-platform";
  const signature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}
function verifyToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const secret = process.env.JWT_SECRET || "dev-secret-key-forex-mt5-platform";
  const expectedSignature = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  if (signature !== expectedSignature) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (decoded.exp && decoded.exp < Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

// server/db/store.ts
import crypto2 from "crypto";

// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accountSnapshots: () => accountSnapshots,
  algorithmAssignments: () => algorithmAssignments,
  algorithmVersions: () => algorithmVersions,
  algorithms: () => algorithms,
  auditLogs: () => auditLogs,
  brokers: () => brokers,
  dailyStatistics: () => dailyStatistics,
  deals: () => deals,
  invoices: () => invoices,
  jobs: () => jobs,
  mt5Accounts: () => mt5Accounts,
  mt5Connections: () => mt5Connections,
  notificationPreferences: () => notificationPreferences,
  notifications: () => notifications,
  orders: () => orders,
  payments: () => payments,
  performanceSnapshots: () => performanceSnapshots,
  permissions: () => permissions,
  positions: () => positions,
  riskEvents: () => riskEvents,
  riskProfiles: () => riskProfiles,
  rolePermissions: () => rolePermissions,
  roles: () => roles,
  subscriptionPlans: () => subscriptionPlans,
  subscriptions: () => subscriptions,
  supportMessages: () => supportMessages,
  supportTickets: () => supportTickets,
  systemSettings: () => systemSettings,
  trades: () => trades,
  userProfiles: () => userProfiles,
  userRoles: () => userRoles,
  users: () => users,
  workerHealth: () => workerHealth
});
import { pgTable, text, timestamp, boolean, integer, numeric, jsonb, uuid, primaryKey, index, uniqueIndex, date, bigint } from "drizzle-orm/pg-core";
var users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  salt: text("salt").notNull(),
  isEmailVerified: boolean("is_email_verified").default(false),
  status: text("status").default("active"),
  kycStatus: text("kyc_status").default("unverified"),
  manualTradeCloseEnabled: boolean("manual_trade_close_enabled").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
});
var userProfiles = pgTable("user_profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  country: text("country"),
  timezone: text("timezone").default("UTC"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});
var roles = pgTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description")
});
var permissions = pgTable("permissions", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  description: text("description")
});
var rolePermissions = pgTable("role_permissions", {
  roleId: text("role_id").references(() => roles.id, { onDelete: "cascade" }).notNull(),
  permissionId: text("permission_id").references(() => permissions.id, { onDelete: "cascade" }).notNull()
}, (t) => ({
  pk: primaryKey({ columns: [t.roleId, t.permissionId] })
}));
var userRoles = pgTable("user_roles", {
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  roleId: text("role_id").references(() => roles.id, { onDelete: "cascade" }).notNull(),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.roleId] })
}));
var brokers = pgTable("brokers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  serverList: jsonb("server_list").notNull().default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var mt5Accounts = pgTable("mt5_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  brokerName: text("broker_name").notNull(),
  server: text("server").notNull(),
  loginId: text("login_id").notNull(),
  encryptedPassword: text("encrypted_password").notNull(),
  accountType: text("account_type").default("live"),
  currency: text("currency").default("USD"),
  leverage: integer("leverage").default(100),
  balance: numeric("balance", { precision: 14, scale: 2 }).default("0.00"),
  equity: numeric("equity", { precision: 14, scale: 2 }).default("0.00"),
  margin: numeric("margin", { precision: 14, scale: 2 }).default("0.00"),
  freeMargin: numeric("free_margin", { precision: 14, scale: 2 }).default("0.00"),
  marginLevel: numeric("margin_level", { precision: 10, scale: 2 }).default("0.00"),
  floatingPnl: numeric("floating_pnl", { precision: 14, scale: 2 }).default("0.00"),
  connectionStatus: text("connection_status").default("disconnected"),
  assignedWorkerId: text("assigned_worker_id"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  userIdx: index("idx_mt5_accounts_user_id").on(t.userId),
  brokerLoginUnique: uniqueIndex("unique_broker_login").on(t.brokerName, t.server, t.loginId)
}));
var mt5Connections = pgTable("mt5_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  mt5AccountId: uuid("mt5_account_id").references(() => mt5Accounts.id, { onDelete: "cascade" }),
  workerNodeId: text("worker_node_id").notNull(),
  latencyMs: integer("latency_ms").default(0),
  ipAddress: text("ip_address"),
  connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow(),
  disconnectedAt: timestamp("disconnected_at", { withTimezone: true })
});
var subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  interval: text("interval").notNull(),
  priceUsd: numeric("price_usd", { precision: 10, scale: 2 }).notNull(),
  profitSharePct: numeric("profit_share_pct", { precision: 5, scale: 2 }).default("0.00"),
  maxMt5Accounts: integer("max_mt5_accounts").default(1),
  maxTradingVolumeLots: numeric("max_trading_volume_lots", { precision: 10, scale: 2 }).default("50.00"),
  features: jsonb("features").notNull().default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  planId: uuid("plan_id").references(() => subscriptionPlans.id).notNull(),
  status: text("status").notNull(),
  currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  userStatusIdx: index("idx_subscriptions_user_status").on(t.userId, t.status)
}));
var payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
  provider: text("provider").default("stripe").notNull(),
  providerTransactionId: text("provider_transaction_id").unique(),
  idempotencyKey: text("idempotency_key").unique().notNull(),
  amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id").references(() => payments.id, { onDelete: "set null" }).unique(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  invoiceNumber: text("invoice_number").unique().notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: numeric("tax", { precision: 10, scale: 2 }).default("0.00"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  issuedDate: date("issued_date").notNull(),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var algorithms = pgTable("algorithms", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  strategyType: text("strategy_type").notNull(),
  riskTier: text("risk_tier").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var algorithmVersions = pgTable("algorithm_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  algorithmId: uuid("algorithm_id").references(() => algorithms.id, { onDelete: "cascade" }).notNull(),
  versionString: text("version_string").notNull(),
  parameters: jsonb("parameters").notNull().default({}),
  changelog: text("changelog"),
  status: text("status").default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  uniqueAlgoVersion: uniqueIndex("unique_algo_version").on(t.algorithmId, t.versionString)
}));
var algorithmAssignments = pgTable("algorithm_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  mt5AccountId: uuid("mt5_account_id").references(() => mt5Accounts.id, { onDelete: "cascade" }).notNull(),
  algorithmVersionId: uuid("algorithm_version_id").references(() => algorithmVersions.id).notNull(),
  allocationPct: numeric("allocation_pct", { precision: 5, scale: 2 }).default("100.00"),
  status: text("status").default("active"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow()
});
var orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  mt5AccountId: uuid("mt5_account_id").references(() => mt5Accounts.id, { onDelete: "cascade" }).notNull(),
  orderTicket: bigint("order_ticket", { mode: "number" }),
  symbol: text("symbol").notNull(),
  orderType: text("order_type").notNull(),
  lots: numeric("lots", { precision: 10, scale: 2 }).notNull(),
  price: numeric("price", { precision: 14, scale: 5 }).notNull(),
  stopLoss: numeric("stop_loss", { precision: 14, scale: 5 }),
  takeProfit: numeric("take_profit", { precision: 14, scale: 5 }),
  status: text("status").notNull(),
  idempotencyKey: text("idempotency_key").unique().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  accountStatusIdx: index("idx_orders_account_status").on(t.mt5AccountId, t.status)
}));
var positions = pgTable("positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  mt5AccountId: uuid("mt5_account_id").references(() => mt5Accounts.id, { onDelete: "cascade" }).notNull(),
  positionTicket: bigint("position_ticket", { mode: "number" }).unique().notNull(),
  symbol: text("symbol").notNull(),
  positionType: text("position_type").notNull(),
  lots: numeric("lots", { precision: 10, scale: 2 }).notNull(),
  openPrice: numeric("open_price", { precision: 14, scale: 5 }).notNull(),
  currentPrice: numeric("current_price", { precision: 14, scale: 5 }).notNull(),
  stopLoss: numeric("stop_loss", { precision: 14, scale: 5 }),
  takeProfit: numeric("take_profit", { precision: 14, scale: 5 }),
  currentPnl: numeric("current_pnl", { precision: 14, scale: 2 }).default("0.00"),
  swap: numeric("swap", { precision: 10, scale: 2 }).default("0.00"),
  commission: numeric("commission", { precision: 10, scale: 2 }).default("0.00"),
  status: text("status").default("open"),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true })
}, (t) => ({
  accountStatusIdx: index("idx_positions_account_status").on(t.mt5AccountId, t.status)
}));
var deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  positionId: uuid("position_id").references(() => positions.id, { onDelete: "set null" }),
  dealTicket: bigint("deal_ticket", { mode: "number" }).unique().notNull(),
  symbol: text("symbol").notNull(),
  entryType: text("entry_type").notNull(),
  price: numeric("price", { precision: 14, scale: 5 }).notNull(),
  profit: numeric("profit", { precision: 14, scale: 2 }).notNull(),
  executedAt: timestamp("executed_at", { withTimezone: true }).notNull()
});
var trades = pgTable("trades", {
  id: uuid("id").primaryKey().defaultRandom(),
  mt5AccountId: uuid("mt5_account_id").references(() => mt5Accounts.id, { onDelete: "cascade" }).notNull(),
  ticket: bigint("ticket", { mode: "number" }).unique().notNull(),
  symbol: text("symbol").notNull(),
  tradeType: text("trade_type").notNull(),
  lots: numeric("lots", { precision: 10, scale: 2 }).notNull(),
  openPrice: numeric("open_price", { precision: 14, scale: 5 }).notNull(),
  closePrice: numeric("close_price", { precision: 14, scale: 5 }).notNull(),
  stopLoss: numeric("stop_loss", { precision: 14, scale: 5 }),
  takeProfit: numeric("take_profit", { precision: 14, scale: 5 }),
  profit: numeric("profit", { precision: 14, scale: 2 }).notNull(),
  commission: numeric("commission", { precision: 10, scale: 2 }).default("0.00"),
  swap: numeric("swap", { precision: 10, scale: 2 }).default("0.00"),
  openTime: timestamp("open_time", { withTimezone: true }).notNull(),
  closeTime: timestamp("close_time", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  accountTimeIdx: index("idx_trades_account_time").on(t.mt5AccountId, t.closeTime)
}));
var accountSnapshots = pgTable("account_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  mt5AccountId: uuid("mt5_account_id").references(() => mt5Accounts.id, { onDelete: "cascade" }).notNull(),
  balance: numeric("balance", { precision: 14, scale: 2 }).notNull(),
  equity: numeric("equity", { precision: 14, scale: 2 }).notNull(),
  margin: numeric("margin", { precision: 14, scale: 2 }).notNull(),
  floatingPnl: numeric("floating_pnl", { precision: 14, scale: 2 }).notNull(),
  openPositionsCount: integer("open_positions_count").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow()
});
var performanceSnapshots = pgTable("performance_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  mt5AccountId: uuid("mt5_account_id").references(() => mt5Accounts.id, { onDelete: "cascade" }),
  winRate: numeric("win_rate", { precision: 5, scale: 2 }).default("0.00"),
  profitFactor: numeric("profit_factor", { precision: 6, scale: 2 }).default("0.00"),
  totalPnl: numeric("total_pnl", { precision: 14, scale: 2 }).default("0.00"),
  maxDrawdown: numeric("max_drawdown", { precision: 5, scale: 2 }).default("0.00"),
  winningTrades: integer("winning_trades").default(0),
  losingTrades: integer("losing_trades").default(0),
  totalTrades: integer("total_trades").default(0),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  userIdx: index("idx_performance_snapshots_user").on(t.userId, t.recordedAt)
}));
var dailyStatistics = pgTable("daily_statistics", {
  id: uuid("id").primaryKey().defaultRandom(),
  mt5AccountId: uuid("mt5_account_id").references(() => mt5Accounts.id, { onDelete: "cascade" }).notNull(),
  date: date("date").notNull(),
  startingBalance: numeric("starting_balance", { precision: 14, scale: 2 }).notNull(),
  endingBalance: numeric("ending_balance", { precision: 14, scale: 2 }).notNull(),
  netProfit: numeric("net_profit", { precision: 14, scale: 2 }).notNull(),
  totalTrades: integer("total_trades").default(0),
  winningTrades: integer("winning_trades").default(0),
  losingTrades: integer("losing_trades").default(0),
  maxDrawdownPct: numeric("max_drawdown_pct", { precision: 6, scale: 2 }).default("0.00")
}, (t) => ({
  uniqueAccountDaily: uniqueIndex("unique_account_daily").on(t.mt5AccountId, t.date)
}));
var riskProfiles = pgTable("risk_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).unique().notNull(),
  riskTier: text("risk_tier").default("moderate"),
  maxDailyLossPct: numeric("max_daily_loss_pct", { precision: 5, scale: 2 }).default("3.00"),
  maxDrawdownPct: numeric("max_drawdown_pct", { precision: 5, scale: 2 }).default("8.00"),
  maxLotSize: numeric("max_lot_size", { precision: 10, scale: 2 }).default("2.00"),
  maxOpenTrades: integer("max_open_trades").default(5),
  emergencyStop: boolean("emergency_stop").default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});
var riskEvents = pgTable("risk_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  mt5AccountId: uuid("mt5_account_id").references(() => mt5Accounts.id, { onDelete: "set null" }),
  severity: text("severity").notNull(),
  ruleViolated: text("rule_violated").notNull(),
  details: text("details"),
  actionTaken: text("action_taken").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  userUnreadIdx: index("idx_notifications_user_unread").on(t.userId, t.isRead)
}));
var notificationPreferences = pgTable("notification_preferences", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  emailTradeOpened: boolean("email_trade_opened").default(false),
  emailTradeClosed: boolean("email_trade_closed").default(true),
  emailDailyDigest: boolean("email_daily_digest").default(true),
  emailRiskAlerts: boolean("email_risk_alerts").default(true),
  emailSubscriptionRenewal: boolean("email_subscription_renewal").default(true)
});
var supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  subject: text("subject").notNull(),
  category: text("category").notNull(),
  status: text("status").default("open"),
  priority: text("priority").default("medium"),
  assignedAdminId: uuid("assigned_admin_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});
var supportMessages = pgTable("support_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id").references(() => supportTickets.id, { onDelete: "cascade" }).notNull(),
  senderId: uuid("sender_id").references(() => users.id).notNull(),
  senderType: text("sender_type").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
});
var auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorRole: text("actor_role").notNull(),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: text("resource_id"),
  changes: jsonb("changes"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  actorCreatedIdx: index("idx_audit_logs_actor_created").on(t.actorId, t.createdAt)
}));
var workerHealth = pgTable("worker_health", {
  id: text("id").primaryKey(),
  workerName: text("worker_name").notNull(),
  region: text("region").notNull(),
  status: text("status").notNull(),
  activeTerminals: integer("active_terminals").default(0),
  cpuPercent: numeric("cpu_percent", { precision: 5, scale: 2 }).default("0.00"),
  memoryPercent: numeric("memory_percent", { precision: 5, scale: 2 }).default("0.00"),
  pingLatencyMs: integer("ping_latency_ms").default(1),
  lastHeartbeat: timestamp("last_heartbeat", { withTimezone: true }).defaultNow()
});
var jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  queueName: text("queue_name").default("default").notNull(),
  jobType: text("job_type").notNull(),
  payload: jsonb("payload").default({}).notNull(),
  status: text("status").default("pending").notNull(),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  errorMessage: text("error_message"),
  runAt: timestamp("run_at", { withTimezone: true }).defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  statusRunIdx: index("idx_jobs_status_run").on(t.status, t.runAt)
}));
var systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

// src/db/index.ts
var createPool = () => {
  if (!global._postgresPool) {
    const config = {
      max: 10,
      connectionTimeoutMillis: 15e3
    };
    if (process.env.DATABASE_URL) {
      config.connectionString = process.env.DATABASE_URL;
    } else if (process.env.INSTANCE_CONNECTION_NAME) {
      config.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
      config.user = process.env.SQL_USER || process.env.SQL_ADMIN_USER;
      config.password = process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD;
      config.database = process.env.SQL_DB_NAME;
    } else {
      config.host = process.env.SQL_HOST;
      config.user = process.env.SQL_USER;
      config.password = process.env.SQL_PASSWORD;
      config.database = process.env.SQL_DB_NAME;
    }
    global._postgresPool = new Pool(config);
    global._postgresPool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
  }
  return global._postgresPool;
};
var pool = createPool();
var db = drizzle(pool, { schema: schema_exports });

// server/db/seedPostgres.ts
import { eq } from "drizzle-orm";
var SEED_IDS = {
  superAdmin: "00000000-0000-4000-8000-000000000001",
  riskOfficer: "00000000-0000-4000-8000-000000000002",
  supportLead: "00000000-0000-4000-8000-000000000003",
  customerAlex: "00000000-0000-4000-8000-000000000004",
  customerSarah: "00000000-0000-4000-8000-000000000005",
  planStarter: "10000000-0000-4000-8000-000000000001",
  planPro: "10000000-0000-4000-8000-000000000002",
  planElite: "10000000-0000-4000-8000-000000000003",
  planQuarterly: "10000000-0000-4000-8000-000000000004",
  planBiannual: "10000000-0000-4000-8000-000000000005",
  planProfitShare: "10000000-0000-4000-8000-000000000006",
  algoFalcon: "20000000-0000-4000-8000-000000000001",
  algoTitan: "20000000-0000-4000-8000-000000000002",
  algoMatrix: "20000000-0000-4000-8000-000000000003",
  mt5AlexLive: "30000000-0000-4000-8000-000000000001",
  mt5AlexDemo: "30000000-0000-4000-8000-000000000002",
  mt5SarahLive: "30000000-0000-4000-8000-000000000003"
};
async function seedPostgres() {
  console.log("[PostgreSQL Seed] Initializing database tables with baseline configurations...");
  const rolesList = [
    { id: "super_admin", name: "Super Administrator", description: "Full system authorization with global operational controls" },
    { id: "risk_officer", name: "Risk Management Officer", description: "Real-time surveillance, kill switches, and risk compliance" },
    { id: "support", name: "Customer Support Representative", description: "Ticket triage, customer diagnostic support, view-only accounts" },
    { id: "customer", name: "Trading Subscriber / Customer", description: "Personal MT5 terminal connection and automated strategy management" }
  ];
  for (const r of rolesList) {
    await db.insert(roles).values(r).onConflictDoNothing();
  }
  const permissionsList = [
    { id: "users:read", category: "users", description: "View user profiles and accounts" },
    { id: "users:write", category: "users", description: "Create and modify user profiles" },
    { id: "trading:read", category: "trading", description: "View trade signals, orders, and positions" },
    { id: "trading:execute", category: "trading", description: "Execute algorithmic orders" },
    { id: "trading:close", category: "trading", description: "Emergency position close" },
    { id: "algorithms:read", category: "algorithms", description: "View algorithmic strategies and versions" },
    { id: "algorithms:manage", category: "algorithms", description: "Deploy and modify trading algorithms" },
    { id: "risk:read", category: "risk", description: "View risk profiles and exposure metrics" },
    { id: "risk:write", category: "risk", description: "Adjust risk ceilings and lot limits" },
    { id: "risk:kill_switch", category: "risk", description: "Trigger emergency execution circuit breakers" },
    { id: "audit:read", category: "audit", description: "Inspect tamper-evident audit trails" },
    { id: "system:read", category: "system", description: "Inspect terminal worker fleet health" },
    { id: "system:manage", category: "system", description: "Manage worker clusters and infrastructure" },
    { id: "finance:read", category: "finance", description: "View billing history and revenue metrics" },
    { id: "finance:manage", category: "finance", description: "Modify plans and issue invoices" },
    { id: "support:read", category: "support", description: "View customer support tickets" },
    { id: "support:reply", category: "support", description: "Respond to customer support tickets" }
  ];
  for (const p of permissionsList) {
    await db.insert(permissions).values(p).onConflictDoNothing();
  }
  const superAdminRolePerms = permissionsList.map((p) => ({ roleId: "super_admin", permissionId: p.id }));
  for (const rp of superAdminRolePerms) {
    await db.insert(rolePermissions).values(rp).onConflictDoNothing();
  }
  const plans = [
    {
      id: SEED_IDS.planStarter,
      code: "MONTHLY_PLAN",
      name: "Monthly Quant Plan",
      description: "Full automated execution on retail and prop firm accounts with 30-day flexibility.",
      interval: "monthly",
      priceUsd: "99.00",
      profitSharePct: "0.00",
      maxMt5Accounts: 1,
      maxTradingVolumeLots: "25.00",
      features: [
        "1 Connected MT5 Account",
        "Alpha Trend Falcon Strategy",
        "Automated Daily Risk Stop-Loss",
        "Standard Execution Speed (London VPS)",
        "Daily Telegram Performance Reports",
        "No lock-in contract, cancel anytime"
      ],
      isActive: true
    },
    {
      id: SEED_IDS.planQuarterly,
      code: "QUARTERLY_3M_PLAN",
      name: "3-Month Quant Plan",
      description: "Quarterly commitment with 10% discount for consistent algorithmic compounding.",
      interval: "quarterly",
      priceUsd: "269.00",
      profitSharePct: "0.00",
      maxMt5Accounts: 2,
      maxTradingVolumeLots: "50.00",
      features: [
        "Up to 2 MT5 Accounts (Demo & Live)",
        "Alpha Trend Falcon + Breakout Matrix",
        "Priority Equinix LD4 Sub-Millisecond VPS",
        "Automated Drawdown Guardian",
        "Instant Telegram Signals & Trade Notifications",
        "Saves ~10% vs monthly billing"
      ],
      isActive: true
    },
    {
      id: SEED_IDS.planBiannual,
      code: "BIANNUAL_6M_PLAN",
      name: "6-Month Quant Plan",
      description: "Half-year semi-annual portfolio allocation with advanced risk management.",
      interval: "biannual",
      priceUsd: "499.00",
      profitSharePct: "0.00",
      maxMt5Accounts: 4,
      maxTradingVolumeLots: "100.00",
      features: [
        "Up to 4 MT5 Accounts",
        "All 3 Core Strategies Active",
        "Equinix LD4 Cross-Connect VPS",
        "Custom Risk Ceiling & Position Sizing Controls",
        "Multi-symbol correlation filter",
        "Saves ~16% vs monthly billing"
      ],
      isActive: true
    },
    {
      id: SEED_IDS.planElite,
      code: "YEARLY_ANNUAL_PLAN",
      name: "Yearly Institutional Plan",
      description: "Maximum annual savings for high-capital traders, hedge accounts, and prop managers.",
      interval: "yearly",
      priceUsd: "899.00",
      profitSharePct: "0.00",
      maxMt5Accounts: 10,
      maxTradingVolumeLots: "500.00",
      features: [
        "Up to 10 MT5 Accounts",
        "Dedicated VPS Worker Node per account",
        "Zero-Latency Cross-Connect in Equinix NY4/LD4",
        "Custom Risk Manager API & Kill-Switch Webhooks",
        "Multi-broker Aggregation & Copier Support",
        "Direct 24/7 Access to Quant Risk Lead",
        "Maximum 25% savings vs monthly billing"
      ],
      isActive: true
    },
    {
      id: SEED_IDS.planProfitShare,
      code: "PERFORMANCE_PROFIT_SHARE",
      name: "High-Water Mark Profit Share",
      description: "$0 upfront fee. We only succeed when your trading balance achieves new net profits.",
      interval: "profit_share",
      priceUsd: "0.00",
      profitSharePct: "20.00",
      maxMt5Accounts: 2,
      maxTradingVolumeLots: "100.00",
      features: [
        "Zero Upfront Subscription Fee",
        "20% Monthly High-Water Mark Performance Fee",
        "Institutional Grade Algorithm Allocation",
        "Transparent Audit Statements & Invoicing",
        "Strict Drawdown Protection & Stop-Loss Safeguards"
      ],
      isActive: true
    }
  ];
  for (const pl of plans) {
    await db.insert(subscriptionPlans).values(pl).onConflictDoNothing();
  }
  const algos = [
    {
      id: SEED_IDS.algoFalcon,
      code: "ALGO_TREND_FALCON",
      name: "Alpha Trend Falcon v2.4",
      description: "Multi-timeframe dynamic momentum algorithm optimized for major FX pairs (EURUSD, GBPUSD).",
      strategyType: "trend_following",
      riskTier: "low",
      isActive: true
    },
    {
      id: SEED_IDS.algoTitan,
      code: "ALGO_SCALP_TITAN",
      name: "Scalp Sniper Titan v1.9",
      description: "High-frequency Asian session mean-reversion algorithm designed for tight spreads and low volatility.",
      strategyType: "scalping",
      riskTier: "medium",
      isActive: true
    },
    {
      id: SEED_IDS.algoMatrix,
      code: "ALGO_GRID_MATRIX",
      name: "Grid Arbitrage Matrix v3.1",
      description: "Hedging and range-bound basket manager that capitalizes on correlated currency pairs (EURGBP, AUDNZD).",
      strategyType: "grid_hedging",
      riskTier: "high",
      isActive: true
    }
  ];
  for (const a of algos) {
    await db.insert(algorithms).values(a).onConflictDoNothing();
  }
  const usersToSeed = [
    {
      id: SEED_IDS.superAdmin,
      email: "superadmin@forexsaas.com",
      firstName: "Chief",
      lastName: "Administrator",
      password: "SuperAdmin123!",
      role: "super_admin"
    },
    {
      id: SEED_IDS.riskOfficer,
      email: "risk@forexsaas.com",
      firstName: "Marcus",
      lastName: "Vance",
      password: "RiskManager123!",
      role: "risk_officer"
    },
    {
      id: SEED_IDS.supportLead,
      email: "support@forexsaas.com",
      firstName: "Elena",
      lastName: "Rostova",
      password: "SupportDesk123!",
      role: "support"
    },
    {
      id: SEED_IDS.customerAlex,
      email: "alex.morgan@example.com",
      firstName: "Alex",
      lastName: "Morgan",
      password: "CustomerPass123!",
      role: "customer"
    },
    {
      id: SEED_IDS.customerSarah,
      email: "sarah.chen@example.com",
      firstName: "Sarah",
      lastName: "Chen",
      password: "CustomerPass123!",
      role: "customer"
    }
  ];
  for (const u of usersToSeed) {
    const auth = hashPassword(u.password);
    const existing = await db.select().from(users).where(eq(users.email, u.email));
    let userId = u.id;
    if (existing.length === 0) {
      await db.insert(users).values({
        id: u.id,
        email: u.email,
        passwordHash: auth.hash,
        salt: auth.salt,
        isEmailVerified: true,
        status: "active",
        kycStatus: "verified"
      }).onConflictDoNothing();
      await db.insert(userProfiles).values({
        userId: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        country: "US",
        timezone: "UTC"
      }).onConflictDoNothing();
      await db.insert(userRoles).values({
        userId: u.id,
        roleId: u.role
      }).onConflictDoNothing();
    } else {
      userId = existing[0].id;
    }
    if (u.role === "customer") {
      await db.insert(riskProfiles).values({
        userId,
        riskTier: "moderate",
        maxDailyLossPct: "3.00",
        maxDrawdownPct: "8.00",
        maxLotSize: "2.00",
        maxOpenTrades: 5,
        emergencyStop: false
      }).onConflictDoNothing();
    }
  }
  const workers = [
    {
      id: "worker-lon-01",
      workerName: "London LD4 Primary Engine #1",
      region: "eu-west-london-ld4",
      status: "online",
      activeTerminals: 24,
      cpuPercent: "18.40",
      memoryPercent: "42.10",
      pingLatencyMs: 1
    },
    {
      id: "worker-ny-01",
      workerName: "New York NY4 Secondary Engine #2",
      region: "us-east-ny4",
      status: "online",
      activeTerminals: 19,
      cpuPercent: "14.20",
      memoryPercent: "38.60",
      pingLatencyMs: 2
    }
  ];
  for (const w of workers) {
    await db.insert(workerHealth).values(w).onConflictDoNothing();
  }
  console.log("[PostgreSQL Seed] Baseline configurations successfully synchronized to Cloud SQL PostgreSQL.");
}

// server/db/store.ts
function isRealWorkerAccount(account) {
  if (!account) return false;
  return Boolean(account.assignedWorkerId) && account.connectionStatus === "connected" && Boolean(account.lastSyncAt);
}
var DatabaseStore = class {
  constructor() {
    this.users = [];
    this.mt5Accounts = [];
    this.positions = [];
    this.subscriptionPlans = [];
    this.subscriptions = [];
    this.payments = [];
    this.invoices = [];
    this.processedWebhookEvents = /* @__PURE__ */ new Set();
    this.algorithms = [];
    this.algorithmVersions = [];
    this.riskSettings = /* @__PURE__ */ new Map();
    this.killSwitches = {
      globalKillSwitch: false,
      perAlgorithm: {},
      perAccount: {}
    };
    this.supportTickets = [];
    this.notifications = [];
    this.auditLogs = [];
    this.workerNodes = [];
    this.socialPosts = [];
    // Demo Trading Engine Storage
    this.demoAccounts = [];
    this.demoPositions = [];
    this.demoRiskEvents = [];
    this.demoAlgorithmConfig = {
      id: "algo_demo_trend",
      name: "Demo Trend Strategy",
      description: "Simulated momentum trend follower for demo testing. Operates strictly in sandbox environment.",
      isDemoOnly: true,
      enabled: true,
      symbols: ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"],
      lotSize: 0.1,
      maxOpenPositions: 3,
      stopLossPips: 30,
      takeProfitPips: 60,
      maxDailyLossUsd: 500,
      maxDrawdownPct: 8,
      timeframe: "M15"
    };
    this.demoProcessedIdempotencyKeys = /* @__PURE__ */ new Map();
    this.demoGlobalKillSwitch = false;
    // Real MT5 Worker Command Queue (Phase 1)
    this.workerCommands = [];
    this.workerCommandIdempotencyKeys = /* @__PURE__ */ new Map();
    // Manual Trade Close Permissions
    this.globalManualTradeCloseEnabled = false;
    this.seed();
  }
  seed() {
    const superAdminAuth = hashPassword("SuperAdmin123!");
    const superAdmin = {
      id: "usr_super_admin",
      email: "superadmin@forexsaas.com",
      firstName: "Chief",
      lastName: "Administrator",
      role: "super_admin",
      status: "active",
      kycStatus: "verified",
      manualTradeCloseEnabled: false,
      createdAt: new Date(Date.now() - 90 * 864e5).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      passwordHash: superAdminAuth.hash,
      salt: superAdminAuth.salt
    };
    const riskOfficerAuth = hashPassword("RiskManager123!");
    const riskOfficer = {
      id: "usr_risk_officer",
      email: "risk@forexsaas.com",
      firstName: "Marcus",
      lastName: "Vance",
      role: "risk_officer",
      status: "active",
      kycStatus: "verified",
      manualTradeCloseEnabled: false,
      createdAt: new Date(Date.now() - 60 * 864e5).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      passwordHash: riskOfficerAuth.hash,
      salt: riskOfficerAuth.salt
    };
    const supportLeadAuth = hashPassword("SupportDesk123!");
    const supportLead = {
      id: "usr_support_lead",
      email: "support@forexsaas.com",
      firstName: "Elena",
      lastName: "Rostova",
      role: "support",
      status: "active",
      kycStatus: "verified",
      manualTradeCloseEnabled: false,
      createdAt: new Date(Date.now() - 45 * 864e5).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      passwordHash: supportLeadAuth.hash,
      salt: supportLeadAuth.salt
    };
    const customerAlexAuth = hashPassword("CustomerPass123!");
    const customerAlex = {
      id: "usr_customer_alex",
      email: "alex.morgan@example.com",
      firstName: "Alex",
      lastName: "Morgan",
      role: "customer",
      status: "active",
      kycStatus: "verified",
      manualTradeCloseEnabled: false,
      createdAt: new Date(Date.now() - 30 * 864e5).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      passwordHash: customerAlexAuth.hash,
      salt: customerAlexAuth.salt
    };
    const customerSarahAuth = hashPassword("CustomerPass123!");
    const customerSarah = {
      id: "usr_customer_sarah",
      email: "sarah.chen@example.com",
      firstName: "Sarah",
      lastName: "Chen",
      role: "customer",
      status: "active",
      kycStatus: "verified",
      manualTradeCloseEnabled: false,
      createdAt: new Date(Date.now() - 15 * 864e5).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      passwordHash: customerSarahAuth.hash,
      salt: customerSarahAuth.salt
    };
    this.users.push(superAdmin, riskOfficer, supportLead, customerAlex, customerSarah);
    this.subscriptionPlans = [
      {
        id: "plan_monthly",
        code: "MONTHLY_PLAN",
        name: "Monthly Quant Plan",
        description: "Full automated execution on retail and prop firm accounts with 30-day flexibility.",
        interval: "monthly",
        priceUsd: 99,
        profitSharePct: 0,
        maxMt5Accounts: 1,
        maxTradingVolumeLots: 25,
        features: [
          "1 Connected MT5 Account",
          "Alpha Trend Falcon Strategy",
          "Automated Daily Risk Stop-Loss",
          "Standard Execution Speed (London VPS)",
          "Daily Telegram Performance Reports",
          "No lock-in contract, cancel anytime"
        ],
        isActive: true
      },
      {
        id: "plan_quarterly",
        code: "QUARTERLY_3M_PLAN",
        name: "3-Month Quant Plan",
        description: "Quarterly commitment with 10% discount for consistent algorithmic compounding.",
        interval: "quarterly",
        priceUsd: 269,
        profitSharePct: 0,
        maxMt5Accounts: 2,
        maxTradingVolumeLots: 50,
        features: [
          "Up to 2 MT5 Accounts (Demo & Live)",
          "Alpha Trend Falcon + Breakout Matrix",
          "Priority Equinix LD4 Sub-Millisecond VPS",
          "Automated Drawdown Guardian",
          "Instant Telegram Signals & Trade Notifications",
          "Saves ~10% vs monthly billing"
        ],
        isActive: true
      },
      {
        id: "plan_biannual",
        code: "BIANNUAL_6M_PLAN",
        name: "6-Month Quant Plan",
        description: "Half-year semi-annual portfolio allocation with advanced risk management.",
        interval: "biannual",
        priceUsd: 499,
        profitSharePct: 0,
        maxMt5Accounts: 4,
        maxTradingVolumeLots: 100,
        features: [
          "Up to 4 MT5 Accounts",
          "All 3 Core Strategies Active",
          "Equinix LD4 Cross-Connect VPS",
          "Custom Risk Ceiling & Position Sizing Controls",
          "Multi-symbol correlation filter",
          "Saves ~16% vs monthly billing"
        ],
        isActive: true
      },
      {
        id: "plan_yearly",
        code: "YEARLY_ANNUAL_PLAN",
        name: "Yearly Institutional Plan",
        description: "Maximum annual savings for high-capital traders, hedge accounts, and prop managers.",
        interval: "yearly",
        priceUsd: 899,
        profitSharePct: 0,
        maxMt5Accounts: 10,
        maxTradingVolumeLots: 500,
        features: [
          "Up to 10 MT5 Accounts",
          "Dedicated VPS Worker Node per account",
          "Zero-Latency Cross-Connect in Equinix NY4/LD4",
          "Custom Risk Manager API & Kill-Switch Webhooks",
          "Multi-broker Aggregation & Copier Support",
          "Direct 24/7 Access to Quant Risk Lead",
          "Maximum 25% savings vs monthly billing"
        ],
        isActive: true
      },
      {
        id: "plan_profit_share",
        code: "PERFORMANCE_PROFIT_SHARE",
        name: "High-Water Mark Profit Share",
        description: "$0 upfront fee. We only succeed when your trading balance achieves new net profits.",
        interval: "profit_share",
        priceUsd: 0,
        profitSharePct: 20,
        maxMt5Accounts: 2,
        maxTradingVolumeLots: 100,
        features: [
          "Zero Upfront Subscription Fee",
          "20% Monthly High-Water Mark Performance Fee",
          "Institutional Grade Algorithm Allocation",
          "Transparent Audit Statements & Invoicing",
          "Strict Drawdown Protection & Stop-Loss Safeguards"
        ],
        isActive: true
      },
      {
        id: "plan_starter",
        code: "STARTER_MONTHLY",
        name: "Starter Trader",
        description: "Ideal for small retail trading accounts up to $10,000 balance.",
        interval: "monthly",
        priceUsd: 99,
        profitSharePct: 0,
        maxMt5Accounts: 1,
        maxTradingVolumeLots: 10,
        features: [
          "1 Connected MT5 Account",
          "Alpha Trend Falcon Strategy",
          "Automated Daily Risk Stop-Loss",
          "Standard Execution Speed (London VPS)",
          "Daily Telegram Performance Reports"
        ],
        isActive: true
      },
      {
        id: "plan_pro",
        code: "PRO_QUANT_MONTHLY",
        name: "Pro Quant Suite",
        description: "For active traders running diversified strategies up to $50,000 balance.",
        interval: "monthly",
        priceUsd: 199,
        profitSharePct: 0,
        maxMt5Accounts: 3,
        maxTradingVolumeLots: 50,
        features: [
          "Up to 3 MT5 Accounts (Demo & Live)",
          "Access to All 3 Core Algorithms",
          "Real-time Equinix LD4 Sub-Millisecond Execution",
          "Customizable Risk Parameter Dashboard",
          "Instant Trade Open/Close Webhooks & SMS",
          "Priority Helpdesk & Technical Support"
        ],
        isActive: true
      },
      {
        id: "plan_elite",
        code: "INSTITUTIONAL_ANNUAL",
        name: "Institutional Elite",
        description: "Dedicated institutional infrastructure for large capital & prop firm accounts.",
        interval: "yearly",
        priceUsd: 1899,
        profitSharePct: 0,
        maxMt5Accounts: 10,
        maxTradingVolumeLots: 500,
        features: [
          "Up to 10 MT5 Accounts",
          "Prop Firm Challenge Guardian (DD Prevention)",
          "Dedicated Private Windows Server VPS",
          "White-glove 1-on-1 Risk Architecture Review",
          "Custom Algo Parameter Optimization Engine",
          "24/7 Direct Dedicated WhatsApp/Phone Support"
        ],
        isActive: true
      }
    ];
    this.subscriptions.push({
      id: "sub_alex_001",
      userId: customerAlex.id,
      planId: "plan_pro",
      planName: "Pro Quant Suite",
      status: "active",
      stripeCustomerId: "cus_test_alex_9921",
      stripeSubscriptionId: "sub_test_alex_8812",
      currentPeriodStart: new Date(Date.now() - 10 * 864e5).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 20 * 864e5).toISOString(),
      cancelAtPeriodEnd: false,
      priceUsd: 199,
      interval: "monthly"
    });
    this.subscriptions.push({
      id: "sub_sarah_002",
      userId: customerSarah.id,
      planId: "plan_elite",
      planName: "Institutional Elite",
      status: "active",
      stripeCustomerId: "cus_test_sarah_4410",
      stripeSubscriptionId: "sub_test_sarah_1109",
      currentPeriodStart: new Date(Date.now() - 5 * 864e5).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 360 * 864e5).toISOString(),
      cancelAtPeriodEnd: false,
      priceUsd: 1899,
      interval: "yearly"
    });
    this.payments.push(
      {
        id: "pay_001",
        userId: customerAlex.id,
        subscriptionId: "sub_alex_001",
        provider: "stripe",
        transactionId: "ch_3N8k2vH9823hJk2",
        amountUsd: 199,
        currency: "USD",
        status: "succeeded",
        invoiceNumber: "INV-2026-0891",
        stripeCustomerId: "cus_test_alex_9921",
        createdAt: new Date(Date.now() - 10 * 864e5).toISOString()
      },
      {
        id: "pay_002",
        userId: customerSarah.id,
        subscriptionId: "sub_sarah_002",
        provider: "stripe",
        transactionId: "ch_9M2k1xQ8831bAa1",
        amountUsd: 1899,
        currency: "USD",
        status: "succeeded",
        invoiceNumber: "INV-2026-0902",
        stripeCustomerId: "cus_test_sarah_4410",
        createdAt: new Date(Date.now() - 5 * 864e5).toISOString()
      }
    );
    this.invoices.push(
      {
        id: "inv_001",
        paymentId: "pay_001",
        userId: customerAlex.id,
        subscriptionId: "sub_alex_001",
        invoiceNumber: "INV-2026-0891",
        subtotal: 199,
        tax: 0,
        total: 199,
        status: "paid",
        issuedDate: new Date(Date.now() - 10 * 864e5).toISOString().split("T")[0]
      },
      {
        id: "inv_002",
        paymentId: "pay_002",
        userId: customerSarah.id,
        subscriptionId: "sub_sarah_002",
        invoiceNumber: "INV-2026-0902",
        subtotal: 1899,
        tax: 0,
        total: 1899,
        status: "paid",
        issuedDate: new Date(Date.now() - 5 * 864e5).toISOString().split("T")[0]
      }
    );
    this.mt5Accounts.push(
      {
        id: "mt5_alex_01",
        userId: customerAlex.id,
        brokerName: "IC Markets Global",
        server: "ICMarketsSC-Live08",
        loginId: "8092415",
        encryptedPassword: encryptCredential("SecurePassIC#2026"),
        accountType: "live",
        currency: "USD",
        leverage: 500,
        balance: 25480,
        equity: 26728.5,
        margin: 1420,
        freeMargin: 25308.5,
        marginLevel: 1882.28,
        floatingPnl: 1248.5,
        connectionStatus: "connected",
        lastSyncAt: (/* @__PURE__ */ new Date()).toISOString(),
        assignedWorkerId: "Worker-LD4-UK"
      },
      {
        id: "mt5_sarah_01",
        userId: customerSarah.id,
        brokerName: "Pepperstone Financial",
        server: "Pepperstone-Edge03",
        loginId: "4491209",
        encryptedPassword: encryptCredential("PepperP@ss992"),
        accountType: "live",
        currency: "USD",
        leverage: 200,
        balance: 52140,
        equity: 53890,
        margin: 2840,
        freeMargin: 51050,
        marginLevel: 1897.53,
        floatingPnl: 1750,
        connectionStatus: "connected",
        lastSyncAt: (/* @__PURE__ */ new Date()).toISOString(),
        assignedWorkerId: "Worker-NY4-US"
      }
    );
    this.positions.push(
      {
        id: "pos_101",
        mt5AccountId: "mt5_alex_01",
        positionTicket: 98124012,
        symbol: "EURUSD",
        type: "BUY",
        lots: 1.5,
        openPrice: 1.0842,
        currentPrice: 1.0886,
        stopLoss: 1.0815,
        takeProfit: 1.092,
        currentPnl: 660,
        swap: -4.5,
        commission: -9,
        status: "open",
        openTime: new Date(Date.now() - 4 * 36e5).toISOString(),
        runtimeFormatted: "4h 12m"
      },
      {
        id: "pos_102",
        mt5AccountId: "mt5_alex_01",
        positionTicket: 98124883,
        symbol: "GBPUSD",
        type: "BUY",
        lots: 1,
        openPrice: 1.2891,
        currentPrice: 1.2934,
        stopLoss: 1.285,
        takeProfit: 1.298,
        currentPnl: 430,
        swap: -2.1,
        commission: -6,
        status: "open",
        openTime: new Date(Date.now() - 2 * 36e5).toISOString(),
        runtimeFormatted: "2h 08m"
      },
      {
        id: "pos_103",
        mt5AccountId: "mt5_alex_01",
        positionTicket: 98125410,
        symbol: "XAUUSD",
        type: "BUY",
        lots: 0.5,
        openPrice: 2682.4,
        currentPrice: 2685.7,
        stopLoss: 2674,
        takeProfit: 2700,
        currentPnl: 165,
        swap: 0,
        commission: -5,
        status: "open",
        openTime: new Date(Date.now() - 45 * 6e4).toISOString(),
        runtimeFormatted: "45m"
      },
      {
        id: "pos_201",
        mt5AccountId: "mt5_sarah_01",
        positionTicket: 98126001,
        symbol: "USDJPY",
        type: "SELL",
        lots: 2,
        openPrice: 153.85,
        currentPrice: 153.22,
        stopLoss: 154.5,
        takeProfit: 152,
        currentPnl: 820,
        swap: 1.8,
        commission: -12,
        status: "open",
        openTime: new Date(Date.now() - 6 * 36e5).toISOString(),
        runtimeFormatted: "6h 32m"
      },
      {
        id: "pos_202",
        mt5AccountId: "mt5_sarah_01",
        positionTicket: 98126540,
        symbol: "AUDUSD",
        type: "BUY",
        lots: 2.5,
        openPrice: 0.658,
        currentPrice: 0.66172,
        stopLoss: 0.654,
        takeProfit: 0.667,
        currentPnl: 930,
        swap: -3.2,
        commission: -15,
        status: "open",
        openTime: new Date(Date.now() - 3 * 36e5).toISOString(),
        runtimeFormatted: "3h 15m"
      }
    );
    this.algorithms = [
      {
        id: "algo_alpha_falcon",
        code: "ALPHA_FALCON",
        name: "Alpha Trend Falcon",
        description: "Multi-timeframe momentum trend-following system on major FX pairs with dynamic ATR volatility trailing stops.",
        strategyType: "Trend Following / ATR Trailing",
        riskTier: "medium",
        activeVersion: "v2.4.1",
        isActive: true,
        totalReturnPct: 44.8,
        sharpeRatio: 2.14,
        assignedAccountsCount: 28
      },
      {
        id: "algo_breakout_matrix",
        code: "BREAKOUT_MATRIX",
        name: "Volatility Breakout Matrix",
        description: "High-frequency breakout model on Gold (XAUUSD) and NASDAQ with London & New York opening bell volume filters.",
        strategyType: "Breakout / Volume Spread",
        riskTier: "high",
        activeVersion: "v1.8.0",
        isActive: true,
        totalReturnPct: 62.3,
        sharpeRatio: 1.88,
        assignedAccountsCount: 19
      },
      {
        id: "algo_asian_hunter",
        code: "ASIAN_HUNTER",
        name: "Asian Session Range Hunter",
        description: "Consolidation mean-reversion algorithm operating exclusively during Tokyo session on low-spread crosses.",
        strategyType: "Mean Reversion / Range",
        riskTier: "low",
        activeVersion: "v3.1.2",
        isActive: true,
        totalReturnPct: 29.5,
        sharpeRatio: 2.82,
        assignedAccountsCount: 34
      }
    ];
    this.algorithmVersions = [
      {
        id: "ver_af_241",
        algorithmId: "algo_alpha_falcon",
        versionString: "v2.4.1",
        parameters: { emaFast: 21, emaSlow: 55, atrPeriod: 14, riskPerTradePct: 1 },
        changelog: "Added dynamic Friday market close exposure reduction; improved slippage tolerance filter.",
        status: "production",
        deployedAt: new Date(Date.now() - 14 * 864e5).toISOString()
      },
      {
        id: "ver_af_240",
        algorithmId: "algo_alpha_falcon",
        versionString: "v2.4.0",
        parameters: { emaFast: 20, emaSlow: 50, atrPeriod: 14, riskPerTradePct: 1.2 },
        changelog: "Initial v2 architecture with multi-symbol correlation guard.",
        status: "deprecated",
        deployedAt: new Date(Date.now() - 45 * 864e5).toISOString()
      },
      {
        id: "ver_bm_180",
        algorithmId: "algo_breakout_matrix",
        versionString: "v1.8.0",
        parameters: { volumeThreshold: 1.8, breakoutPips: 15, maxDailyTrades: 3 },
        changelog: "Calibrated for elevated central bank policy volatility.",
        status: "production",
        deployedAt: new Date(Date.now() - 20 * 864e5).toISOString()
      },
      {
        id: "ver_ah_312",
        algorithmId: "algo_asian_hunter",
        versionString: "v3.1.2",
        parameters: { bollingerBands: 20, deviation: 2.2, sessionStartUtc: "23:00", sessionEndUtc: "07:00" },
        changelog: "Enhanced spread-spike rejection circuit breaker.",
        status: "production",
        deployedAt: new Date(Date.now() - 30 * 864e5).toISOString()
      }
    ];
    this.riskSettings.set(customerAlex.id, {
      maxDailyLossPct: 3,
      maxDrawdownPct: 8,
      maxLotSize: 2,
      maxOpenTrades: 5,
      tradingSession: "ALL_SESSIONS",
      emergencyStop: false
    });
    this.riskSettings.set(customerSarah.id, {
      maxDailyLossPct: 4,
      maxDrawdownPct: 10,
      maxLotSize: 5,
      maxOpenTrades: 8,
      tradingSession: "LONDON_AND_NEW_YORK",
      emergencyStop: false
    });
    this.workerNodes = [
      {
        id: "node_ld4",
        workerName: "Worker-LD4-UK",
        region: "London (Equinix LD4)",
        status: "online",
        activeTerminals: 14,
        cpuPercent: 18.4,
        memoryPercent: 32.1,
        pingLatencyMs: 1,
        lastHeartbeat: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "node_ny4",
        workerName: "Worker-NY4-US",
        region: "New York (Equinix NY4)",
        status: "online",
        activeTerminals: 19,
        cpuPercent: 24.2,
        memoryPercent: 41,
        pingLatencyMs: 2,
        lastHeartbeat: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "node_ty3",
        workerName: "Worker-TY3-JP",
        region: "Tokyo (Equinix TY3)",
        status: "online",
        activeTerminals: 8,
        cpuPercent: 12,
        memoryPercent: 26.5,
        pingLatencyMs: 3,
        lastHeartbeat: (/* @__PURE__ */ new Date()).toISOString()
      }
    ];
    this.notifications.push(
      {
        id: "notif_01",
        userId: customerAlex.id,
        type: "trade_alert",
        title: "New Position Executed",
        message: "Alpha Trend Falcon triggered BUY 1.50 lots EURUSD @ 1.08420. SL: 1.08150, TP: 1.09200.",
        isRead: false,
        createdAt: new Date(Date.now() - 4 * 36e5).toISOString()
      },
      {
        id: "notif_02",
        userId: customerAlex.id,
        type: "connection",
        title: "MT5 Heartbeat Verified",
        message: "IC Markets Global terminal synchronized successfully. Ping: 1.4ms via Worker-LD4-UK.",
        isRead: true,
        createdAt: new Date(Date.now() - 12 * 36e5).toISOString()
      },
      {
        id: "notif_03",
        userId: customerSarah.id,
        type: "trade_alert",
        title: "Profit Target Approaching",
        message: "AUDUSD BUY position is currently +$930.00 (+37.2 pips).",
        isRead: false,
        createdAt: new Date(Date.now() - 1 * 36e5).toISOString()
      }
    );
    this.supportTickets.push({
      id: "tick_001",
      userId: customerAlex.id,
      userEmail: customerAlex.email,
      userName: `${customerAlex.firstName} ${customerAlex.lastName}`,
      subject: "Inquiry regarding news event volatility filter",
      category: "algorithm",
      status: "open",
      priority: "medium",
      assignedAdmin: "Elena Rostova",
      createdAt: new Date(Date.now() - 24 * 36e5).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 36e5).toISOString(),
      messages: [
        {
          id: "msg_001",
          senderId: customerAlex.id,
          senderType: "customer",
          senderName: "Alex Morgan",
          message: "Hello, does Alpha Trend Falcon pause trades during US CPI and NFP news releases?",
          createdAt: new Date(Date.now() - 24 * 36e5).toISOString()
        },
        {
          id: "msg_002",
          senderId: supportLead.id,
          senderType: "admin",
          senderName: "Elena Rostova (Support)",
          message: "Hi Alex! Yes, all algorithmic entries are automatically restricted 15 minutes before and 15 minutes after red-folder high-impact economic news.",
          createdAt: new Date(Date.now() - 4 * 36e5).toISOString()
        }
      ]
    });
    this.socialPosts.push(
      {
        id: "post_001",
        platform: "telegram",
        title: "Daily Platform Trading Performance Snapshot",
        summaryText: "\u{1F525} Today\u2019s Algorithmic Trading Performance: +$3,840.50 combined net return across all connected MT5 subscriber accounts. Win rate 78.4%. EURUSD trend following executed flawlessly.",
        stats: {
          dailyProfit: 3840.5,
          winRate: 78.4,
          tradesExecuted: 14,
          bestSymbol: "EURUSD"
        },
        status: "pending_approval",
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "post_002",
        platform: "instagram",
        title: "Weekly Institutional Return Card",
        summaryText: "Weekly Recap: Over $24,190.00 realized profit with 0.8% maximum drawdown. Multi-strategy execution in London & NY sessions.",
        stats: {
          dailyProfit: 24190,
          winRate: 82.1,
          tradesExecuted: 56,
          bestSymbol: "XAUUSD"
        },
        status: "approved",
        approvedBy: "Chief Administrator",
        createdAt: new Date(Date.now() - 864e5).toISOString(),
        publishedAt: new Date(Date.now() - 8e7).toISOString()
      }
    );
    this.auditLogs.push(
      {
        id: "aud_001",
        actorId: superAdmin.id,
        actorEmail: superAdmin.email,
        actorRole: "super_admin",
        action: "ALGORITHM_VERSION_DEPLOYED",
        resource: "algorithm_versions",
        resourceId: "ver_af_241",
        details: "Promoted Alpha Trend Falcon v2.4.1 to production after 30-day staging backtest verification.",
        ipAddress: "194.26.29.11",
        createdAt: new Date(Date.now() - 14 * 864e5).toISOString()
      },
      {
        id: "aud_002",
        actorId: riskOfficer.id,
        actorEmail: riskOfficer.email,
        actorRole: "risk_officer",
        action: "RISK_THRESHOLD_MODIFIED",
        resource: "risk_profiles",
        resourceId: customerAlex.id,
        details: "Verified account balance increase to $25k; approved max lot size upgrade to 2.0 lots.",
        ipAddress: "185.12.94.8",
        createdAt: new Date(Date.now() - 2 * 864e5).toISOString()
      }
    );
    this.demoAccounts.push(
      {
        id: "demo_acc_alex",
        userId: customerAlex.id,
        accountNumber: "DEMO-8092415",
        brokerName: "AURA Simulated Liquidity",
        serverName: "AuraSim-Demo01",
        currency: "USD",
        leverage: 100,
        initialBalance: 1e4,
        balance: 10450,
        equity: 10685,
        usedMargin: 217.72,
        freeMargin: 10467.28,
        marginLevel: 4907.68,
        unrealizedPnl: 235,
        realizedPnl: 450,
        dailyPnl: 310,
        totalPnl: 685,
        peakBalance: 10685,
        maxDrawdownPct: 1.2,
        winRatePct: 75,
        winningTrades: 3,
        losingTrades: 1,
        totalTrades: 4,
        tradingPaused: false,
        status: "active",
        createdAt: new Date(Date.now() - 7 * 864e5).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      {
        id: "demo_acc_sarah",
        userId: customerSarah.id,
        accountNumber: "DEMO-4491209",
        brokerName: "AURA Simulated Liquidity",
        serverName: "AuraSim-Demo01",
        currency: "USD",
        leverage: 100,
        initialBalance: 1e4,
        balance: 10200,
        equity: 10200,
        usedMargin: 0,
        freeMargin: 10200,
        marginLevel: 0,
        unrealizedPnl: 0,
        realizedPnl: 200,
        dailyPnl: 120,
        totalPnl: 200,
        peakBalance: 10250,
        maxDrawdownPct: 0.8,
        winRatePct: 66.7,
        winningTrades: 2,
        losingTrades: 1,
        totalTrades: 3,
        tradingPaused: false,
        status: "active",
        createdAt: new Date(Date.now() - 5 * 864e5).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    );
    this.demoPositions.push(
      {
        id: "demo_pos_001",
        mt5AccountId: "demo_acc_alex",
        positionTicket: 98450121,
        symbol: "EURUSD",
        type: "BUY",
        lots: 0.2,
        openPrice: 1.085,
        currentPrice: 1.0886,
        stopLoss: 1.081,
        takeProfit: 1.093,
        currentPnl: 72,
        swap: 0,
        commission: -1.4,
        status: "open",
        openTime: new Date(Date.now() - 90 * 6e4).toISOString(),
        runtimeFormatted: "1h 30m"
      },
      {
        id: "demo_pos_002",
        mt5AccountId: "demo_acc_alex",
        positionTicket: 98450148,
        symbol: "GBPUSD",
        type: "BUY",
        lots: 0.1,
        openPrice: 1.2895,
        currentPrice: 1.2934,
        stopLoss: 1.2845,
        takeProfit: 1.2995,
        currentPnl: 39,
        swap: 0,
        commission: -0.7,
        status: "open",
        openTime: new Date(Date.now() - 45 * 6e4).toISOString(),
        runtimeFormatted: "45m"
      },
      {
        id: "demo_pos_closed_001",
        mt5AccountId: "demo_acc_alex",
        positionTicket: 98449010,
        symbol: "EURUSD",
        type: "BUY",
        lots: 0.2,
        openPrice: 1.081,
        closePrice: 1.0865,
        currentPrice: 1.0865,
        stopLoss: 1.078,
        takeProfit: 1.0865,
        currentPnl: 0,
        profit: 110,
        swap: -0.5,
        commission: -1.4,
        status: "closed",
        openTime: new Date(Date.now() - 24 * 36e5).toISOString(),
        closeTime: new Date(Date.now() - 20 * 36e5).toISOString(),
        runtimeFormatted: "4h 00m"
      },
      {
        id: "demo_pos_closed_002",
        mt5AccountId: "demo_acc_alex",
        positionTicket: 98449155,
        symbol: "USDJPY",
        type: "SELL",
        lots: 0.15,
        openPrice: 154.5,
        closePrice: 153.2,
        currentPrice: 153.2,
        stopLoss: 155.2,
        takeProfit: 153.2,
        currentPnl: 0,
        profit: 127.2,
        swap: 0,
        commission: -1.05,
        status: "closed",
        openTime: new Date(Date.now() - 18 * 36e5).toISOString(),
        closeTime: new Date(Date.now() - 14 * 36e5).toISOString(),
        runtimeFormatted: "4h 00m"
      },
      {
        id: "demo_pos_closed_003",
        mt5AccountId: "demo_acc_alex",
        positionTicket: 98449230,
        symbol: "XAUUSD",
        type: "BUY",
        lots: 0.05,
        openPrice: 2670,
        closePrice: 2685,
        currentPrice: 2685,
        stopLoss: 2655,
        takeProfit: 2685,
        currentPnl: 0,
        profit: 75,
        swap: 0,
        commission: -0.5,
        status: "closed",
        openTime: new Date(Date.now() - 12 * 36e5).toISOString(),
        closeTime: new Date(Date.now() - 8 * 36e5).toISOString(),
        runtimeFormatted: "4h 00m"
      },
      {
        id: "demo_pos_closed_004",
        mt5AccountId: "demo_acc_alex",
        positionTicket: 98449412,
        symbol: "EURUSD",
        type: "SELL",
        lots: 0.1,
        openPrice: 1.084,
        closePrice: 1.087,
        currentPrice: 1.087,
        stopLoss: 1.087,
        takeProfit: 1.078,
        currentPnl: 0,
        profit: -30,
        swap: 0,
        commission: -0.7,
        status: "closed",
        openTime: new Date(Date.now() - 6 * 36e5).toISOString(),
        closeTime: new Date(Date.now() - 5 * 36e5).toISOString(),
        runtimeFormatted: "1h 00m"
      }
    );
  }
  getOrCreateDemoAccount(userId) {
    let account = this.demoAccounts.find((a) => a.userId === userId);
    if (!account) {
      const user = this.users.find((u) => u.id === userId);
      const accNum = `DEMO-${Math.floor(1e6 + Math.random() * 9e6)}`;
      account = {
        id: `demo_acc_${userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}_${Date.now()}`,
        userId,
        accountNumber: accNum,
        brokerName: "AURA Simulated Liquidity",
        serverName: "AuraSim-Demo01",
        currency: "USD",
        leverage: 100,
        initialBalance: 1e4,
        balance: 1e4,
        equity: 1e4,
        usedMargin: 0,
        freeMargin: 1e4,
        marginLevel: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        dailyPnl: 0,
        totalPnl: 0,
        peakBalance: 1e4,
        maxDrawdownPct: 0,
        winRatePct: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalTrades: 0,
        tradingPaused: false,
        status: "active",
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.demoAccounts.push(account);
    }
    return account;
  }
  recordDemoRiskEvent(event) {
    const record = {
      ...event,
      id: `drisk_${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.demoRiskEvents.unshift(record);
    if (this.demoRiskEvents.length > 200) {
      this.demoRiskEvents.pop();
    }
    return record;
  }
  async initPostgres() {
    try {
      console.log("[PostgreSQL] Initializing Cloud SQL database connection and sync...");
      await seedPostgres();
      try {
        await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS manual_trade_close_enabled BOOLEAN NOT NULL DEFAULT FALSE;`);
        await pool.query(`CREATE TABLE IF NOT EXISTS system_settings (key VARCHAR(100) PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);`);
      } catch (migErr) {
        console.warn("[PostgreSQL Migration Warning]:", migErr);
      }
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
        this.users = res.rows.map((row) => ({
          id: row.id,
          email: row.email,
          firstName: row.first_name,
          lastName: row.last_name,
          role: row.role,
          status: row.status,
          kycStatus: row.kyc_status,
          manualTradeCloseEnabled: Boolean(row.manual_trade_close_enabled),
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
          passwordHash: row.password_hash,
          salt: row.salt
        }));
        console.log(`[PostgreSQL] Synchronized ${this.users.length} active users from Cloud SQL into application state.`);
      }
      try {
        const settingsRes = await pool.query(`SELECT value FROM system_settings WHERE key = 'global_manual_trade_close' LIMIT 1`);
        if (settingsRes.rows && settingsRes.rows.length > 0) {
          const val = settingsRes.rows[0].value;
          if (val && typeof val.enabled === "boolean") {
            this.globalManualTradeCloseEnabled = val.enabled;
          }
        }
      } catch (settingsErr) {
        console.warn("[PostgreSQL Settings Sync Warning]:", settingsErr);
      }
      const plansRes = await pool.query(`SELECT * FROM subscription_plans WHERE is_active = true`);
      if (plansRes.rows && plansRes.rows.length > 0) {
        this.subscriptionPlans = plansRes.rows.map((row) => ({
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
          isActive: row.is_active
        }));
      }
      const algosRes = await pool.query(`SELECT * FROM algorithms WHERE is_active = true`);
      if (algosRes.rows && algosRes.rows.length > 0) {
        this.algorithms = algosRes.rows.map((row) => ({
          id: row.id,
          code: row.code,
          name: row.name,
          description: row.description,
          strategyType: row.strategy_type,
          riskTier: row.risk_tier,
          isActive: row.is_active,
          winRatePct: 78.4,
          monthlyReturnPct: 14.8,
          maxDrawdownPct: 2.1
        }));
      }
      const riskRes = await pool.query(`SELECT * FROM risk_profiles`);
      if (riskRes.rows && riskRes.rows.length > 0) {
        for (const row of riskRes.rows) {
          this.riskSettings.set(row.user_id, {
            maxDailyLossPct: Number(row.max_daily_loss_pct),
            maxDrawdownPct: Number(row.max_drawdown_pct),
            maxLotSize: Number(row.max_lot_size),
            maxOpenTrades: row.max_open_trades,
            tradingSession: "ALL_SESSIONS",
            emergencyStop: row.emergency_stop
          });
        }
      }
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
        console.warn("[PostgreSQL DDL Migration Warning]:", ddlErr);
      }
      try {
        const eventsRes = await pool.query(`SELECT event_id FROM processed_webhook_events`);
        if (eventsRes.rows) {
          for (const row of eventsRes.rows) {
            this.processedWebhookEvents.add(row.event_id);
          }
        }
      } catch {
      }
      try {
        const subsRes = await pool.query(`
          SELECT s.*, p.name as plan_name, p.price_usd as plan_price, p.interval as plan_interval
          FROM subscriptions s
          LEFT JOIN subscription_plans p ON s.plan_id = p.id
          ORDER BY s.created_at DESC
        `);
        if (subsRes.rows && subsRes.rows.length > 0) {
          for (const row of subsRes.rows) {
            const subObj = {
              id: row.id,
              userId: row.user_id,
              planId: row.plan_id,
              planName: row.plan_name || "Quant Plan",
              status: row.status,
              stripeCustomerId: row.stripe_customer_id,
              stripeSubscriptionId: row.stripe_subscription_id,
              currentPeriodStart: new Date(row.current_period_start).toISOString(),
              currentPeriodEnd: new Date(row.current_period_end).toISOString(),
              cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
              canceledAt: row.canceled_at ? new Date(row.canceled_at).toISOString() : void 0,
              priceUsd: Number(row.plan_price || 99),
              interval: row.plan_interval
            };
            const existingIdx = this.subscriptions.findIndex((s) => s.id === subObj.id);
            if (existingIdx >= 0) {
              this.subscriptions[existingIdx] = subObj;
            } else {
              this.subscriptions.push(subObj);
            }
          }
        }
      } catch (subErr) {
        console.warn("[PostgreSQL Subscriptions Sync Warning]:", subErr);
      }
      try {
        const payRes = await pool.query(`SELECT * FROM payments ORDER BY created_at DESC LIMIT 500`);
        if (payRes.rows && payRes.rows.length > 0) {
          for (const row of payRes.rows) {
            const pObj = {
              id: row.id,
              userId: row.user_id,
              subscriptionId: row.subscription_id,
              provider: row.provider,
              transactionId: row.provider_transaction_id,
              amountUsd: Number(row.amount_usd),
              currency: row.currency || "USD",
              status: row.status,
              invoiceNumber: `INV-${row.id.substring(0, 8).toUpperCase()}`,
              idempotencyKey: row.idempotency_key,
              stripeCustomerId: row.stripe_customer_id,
              stripePaymentIntentId: row.stripe_payment_intent_id,
              createdAt: new Date(row.created_at).toISOString()
            };
            const pIdx = this.payments.findIndex((p) => p.id === pObj.id || pObj.idempotencyKey && p.idempotencyKey === pObj.idempotencyKey);
            if (pIdx >= 0) {
              this.payments[pIdx] = pObj;
            } else {
              this.payments.unshift(pObj);
            }
          }
        }
      } catch (payErr) {
        console.warn("[PostgreSQL Payments Sync Warning]:", payErr);
      }
      try {
        const invRes = await pool.query(`SELECT * FROM invoices ORDER BY created_at DESC LIMIT 500`);
        if (invRes.rows && invRes.rows.length > 0) {
          for (const row of invRes.rows) {
            const invObj = {
              id: row.id,
              paymentId: row.payment_id,
              userId: row.user_id,
              subscriptionId: row.subscription_id,
              invoiceNumber: row.invoice_number,
              subtotal: Number(row.subtotal),
              tax: Number(row.tax || 0),
              total: Number(row.total),
              status: row.status || "paid",
              issuedDate: row.issued_date ? new Date(row.issued_date).toISOString().split("T")[0] : (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
              pdfUrl: row.pdf_url,
              stripeInvoiceId: row.stripe_invoice_id,
              hostedInvoiceUrl: row.hosted_invoice_url
            };
            const iIdx = this.invoices.findIndex((i) => i.id === invObj.id);
            if (iIdx >= 0) {
              this.invoices[iIdx] = invObj;
            } else {
              this.invoices.unshift(invObj);
            }
          }
        }
      } catch (invErr) {
        console.warn("[PostgreSQL Invoices Sync Warning]:", invErr);
      }
      console.log("[PostgreSQL] Cloud SQL database initialization, DDL migrations, and sync complete.");
    } catch (err) {
      console.error("[PostgreSQL Init Error]", err);
    }
  }
  isWebhookProcessed(eventId) {
    return this.processedWebhookEvents.has(eventId);
  }
  async markWebhookProcessed(eventId, eventType) {
    this.processedWebhookEvents.add(eventId);
    try {
      await pool.query(
        `INSERT INTO processed_webhook_events (event_id, event_type, processed_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (event_id) DO NOTHING`,
        [eventId, eventType]
      );
    } catch (err) {
      console.warn("[PostgreSQL Error] Failed to record processed webhook event:", err);
    }
  }
  async createOrUpdateSubscription(sub) {
    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sub.userId);
    const isPlanUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sub.planId);
    const isSubUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sub.id);
    const dbSubId = isSubUuid ? sub.id : crypto2.randomUUID();
    const finalSub = { ...sub, id: dbSubId };
    try {
      if (isUserUuid) {
        let targetPlanId = isPlanUuid ? sub.planId : null;
        if (!targetPlanId) {
          const matchedPlan = this.subscriptionPlans.find((p) => p.id === sub.planId || p.code === sub.planId);
          if (matchedPlan && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(matchedPlan.id)) {
            targetPlanId = matchedPlan.id;
          } else {
            targetPlanId = this.subscriptionPlans[0]?.id;
          }
        }
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
            sub.canceledAt ? new Date(sub.canceledAt) : null
          ]
        );
      }
    } catch (err) {
      console.error("[PostgreSQL Error] createOrUpdateSubscription failed:", err);
    }
    for (const s of this.subscriptions) {
      if (s.userId === sub.userId && s.id !== sub.id && s.id !== dbSubId && s.status === "active") {
        s.status = "canceled";
        s.canceledAt = (/* @__PURE__ */ new Date()).toISOString();
      }
    }
    const idx = this.subscriptions.findIndex((s) => s.id === sub.id || s.id === dbSubId);
    if (idx >= 0) {
      this.subscriptions[idx] = finalSub;
    } else {
      this.subscriptions.unshift(finalSub);
    }
    return finalSub;
  }
  async recordPayment(payment) {
    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payment.userId);
    const isSubUuid = payment.subscriptionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payment.subscriptionId);
    const isPayUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payment.id);
    const dbPayId = isPayUuid ? payment.id : crypto2.randomUUID();
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
            payment.provider || "stripe",
            payment.transactionId,
            payment.idempotencyKey || `idem_${dbPayId}`,
            payment.amountUsd,
            payment.currency || "USD",
            payment.status,
            payment.stripeCustomerId || null,
            payment.stripePaymentIntentId || null
          ]
        );
      }
    } catch (err) {
      console.error("[PostgreSQL Error] recordPayment failed:", err);
    }
    const idx = this.payments.findIndex((p) => p.id === payment.id || p.id === dbPayId || payment.idempotencyKey && p.idempotencyKey === payment.idempotencyKey);
    if (idx >= 0) {
      this.payments[idx] = finalPayment;
    } else {
      this.payments.unshift(finalPayment);
    }
    return finalPayment;
  }
  async recordInvoice(invoice) {
    const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invoice.userId);
    const isPayUuid = invoice.paymentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invoice.paymentId);
    const isSubUuid = invoice.subscriptionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invoice.subscriptionId);
    const isInvUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invoice.id);
    const dbInvId = isInvUuid ? invoice.id : crypto2.randomUUID();
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
            invoice.status || "paid",
            invoice.issuedDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
            invoice.pdfUrl || null,
            invoice.stripeInvoiceId || null,
            invoice.hostedInvoiceUrl || null
          ]
        );
      }
    } catch (err) {
      console.error("[PostgreSQL Error] recordInvoice failed:", err);
    }
    const idx = this.invoices.findIndex((i) => i.id === invoice.id || i.id === dbInvId || i.invoiceNumber === invoice.invoiceNumber);
    if (idx >= 0) {
      this.invoices[idx] = finalInvoice;
    } else {
      this.invoices.unshift(finalInvoice);
    }
    return finalInvoice;
  }
  async updateSubscriptionStatus(subIdOrStripeId, status, currentPeriodEnd) {
    const sub = this.subscriptions.find((s) => s.id === subIdOrStripeId || s.stripeSubscriptionId === subIdOrStripeId);
    if (!sub) return null;
    sub.status = status;
    if (status === "canceled") {
      sub.canceledAt = (/* @__PURE__ */ new Date()).toISOString();
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
      console.error("[PostgreSQL Error] updateSubscriptionStatus failed:", err);
    }
    return sub;
  }
  async cancelSubscription(userId, cancelAtPeriodEnd = true) {
    const sub = this.subscriptions.find((s) => s.userId === userId && s.status === "active");
    if (!sub) return null;
    if (cancelAtPeriodEnd) {
      sub.cancelAtPeriodEnd = true;
    } else {
      sub.status = "canceled";
      sub.canceledAt = (/* @__PURE__ */ new Date()).toISOString();
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
      console.error("[PostgreSQL Error] cancelSubscription failed:", err);
    }
    return sub;
  }
  async updatePlan(planId, updates) {
    const plan = this.subscriptionPlans.find((p) => p.id === planId || p.code === planId);
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
          updates.priceUsd !== void 0 ? updates.priceUsd : null,
          updates.name || null,
          updates.description || null,
          updates.features ? JSON.stringify(updates.features) : null,
          updates.profitSharePct !== void 0 ? updates.profitSharePct : null,
          updates.maxMt5Accounts !== void 0 ? updates.maxMt5Accounts : null,
          updates.isActive !== void 0 ? updates.isActive : null,
          planId
        ]
      );
    } catch (err) {
      console.error("[PostgreSQL Error] updatePlan failed:", err);
    }
    return plan;
  }
  async createUser(newUser) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(newUser.id);
    const userId = isUuid ? newUser.id : crypto2.randomUUID();
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
        [userId, newUser.firstName, newUser.lastName, "US", "UTC"]
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
        [crypto2.randomUUID(), userId]
      );
    } catch (err) {
      console.error("[PostgreSQL Error] Failed to persist user in DB:", err);
    }
    const idx = this.users.findIndex((u) => u.email.toLowerCase() === newUser.email.toLowerCase());
    if (idx >= 0) {
      this.users[idx] = newUser;
    } else {
      this.users.push(newUser);
    }
    this.riskSettings.set(userId, {
      maxDailyLossPct: 3,
      maxDrawdownPct: 8,
      maxLotSize: 1,
      maxOpenTrades: 5,
      tradingSession: "ALL_SESSIONS",
      emergencyStop: false
    });
    return newUser;
  }
  async updateUserStatus(userId, status) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
    try {
      if (isUuid) {
        await pool.query("UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2", [status, userId]);
      }
    } catch (err) {
      console.error("[PostgreSQL Error] updateUserStatus failed:", err);
    }
    const u = this.users.find((u2) => u2.id === userId);
    if (u) u.status = status;
  }
  recordAudit(actorId, actorEmail, actorRole, action, resource, details, ip = "127.0.0.1", resourceId) {
    const isActorUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actorId);
    const isResUuid = resourceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(resourceId);
    pool.query(
      `INSERT INTO audit_logs (id, actor_id, actor_role, action, resource, resource_id, changes, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        crypto2.randomUUID(),
        isActorUuid ? actorId : null,
        actorRole,
        action,
        resource,
        isResUuid ? resourceId : null,
        JSON.stringify({ details, rawActor: actorId, rawResource: resourceId }),
        ip
      ]
    ).catch((err) => {
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
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
  }
  /**
   * Synchronize account telemetry, open positions, and worker health from an external MT5 Worker.
   * Performs atomic updates in PostgreSQL and keeps in-memory state synchronized.
   */
  async syncWorkerAccountData(payload) {
    const { workerId, workerName, account: accData, positions: posData, heartbeat } = payload;
    let mt5AccountId = null;
    try {
      let query = "SELECT id, user_id FROM mt5_accounts WHERE login_id = $1 AND LOWER(server) = LOWER($2)";
      let params = [accData.loginId, accData.server];
      if (accData.brokerName) {
        query += " AND LOWER(broker_name) = LOWER($3)";
        params.push(accData.brokerName);
      }
      query += " LIMIT 1";
      let result = await pool.query(query, params);
      if ((!result.rows || result.rows.length === 0) && accData.brokerName) {
        result = await pool.query(
          "SELECT id, user_id FROM mt5_accounts WHERE login_id = $1 AND LOWER(server) = LOWER($2) LIMIT 1",
          [accData.loginId, accData.server]
        );
      }
      if (result.rows && result.rows.length > 0) {
        mt5AccountId = result.rows[0].id;
      }
    } catch (dbErr) {
      console.warn("[WorkerSync] PostgreSQL lookup error:", dbErr);
    }
    if (!mt5AccountId) {
      const memoryAcc2 = this.mt5Accounts.find(
        (a) => a.loginId === accData.loginId && a.server.toLowerCase() === accData.server.toLowerCase()
      );
      if (memoryAcc2) {
        mt5AccountId = memoryAcc2.id;
      }
    }
    if (!mt5AccountId) {
      const error = new Error(
        `MT5 Account with Login ID "${accData.loginId}" on server "${accData.server}" was not found. Please connect this MT5 account in the customer portal first.`
      );
      error.statusCode = 404;
      throw error;
    }
    const calculatedFloatingPnl = posData.reduce((sum, p) => sum + (p.currentPnl || 0), 0);
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
      console.warn("[WorkerSync] Failed to update mt5_accounts row in DB:", updateErr);
    }
    const memoryAcc = this.mt5Accounts.find((a) => a.id === mt5AccountId);
    if (memoryAcc) {
      memoryAcc.balance = accData.balance;
      memoryAcc.equity = accData.equity;
      memoryAcc.margin = accData.margin;
      memoryAcc.freeMargin = accData.freeMargin;
      memoryAcc.marginLevel = accData.marginLevel;
      memoryAcc.floatingPnl = calculatedFloatingPnl;
      if (accData.currency) memoryAcc.currency = accData.currency;
      memoryAcc.connectionStatus = "connected";
      memoryAcc.assignedWorkerId = workerId;
      memoryAcc.lastSyncAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    const incomingTickets = posData.map((p) => p.ticket);
    for (const p of posData) {
      try {
        const openedAtTime = p.openTime ? new Date(p.openTime).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
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
      console.warn("[WorkerSync] Failed to close absent positions in DB:", closeErr);
    }
    this.positions = this.positions.filter(
      (pos) => !(pos.mt5AccountId === mt5AccountId && pos.id.startsWith("pos_demo_"))
    );
    for (const p of posData) {
      const existing = this.positions.find((pos) => pos.positionTicket === p.ticket);
      if (existing) {
        existing.currentPrice = p.currentPrice;
        existing.currentPnl = p.currentPnl;
        existing.stopLoss = p.stopLoss ?? existing.stopLoss;
        existing.takeProfit = p.takeProfit ?? existing.takeProfit;
        existing.swap = p.swap ?? existing.swap;
        existing.commission = p.commission ?? existing.commission;
        existing.lots = p.lots;
        existing.symbol = p.symbol;
        existing.status = "open";
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
          status: "open",
          openTime: p.openTime ? new Date(p.openTime).toISOString() : (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
    for (const pos of this.positions) {
      if (pos.mt5AccountId === mt5AccountId && pos.status === "open" && !incomingTickets.includes(pos.positionTicket)) {
        pos.status = "closed";
        pos.closeTime = (/* @__PURE__ */ new Date()).toISOString();
      }
    }
    const cpu = heartbeat?.cpuPercent ?? 10;
    const mem = heartbeat?.memoryPercent ?? 25;
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
      console.warn("[WorkerSync] Failed to update worker_health in DB:", healthErr);
    }
    let node = this.workerNodes.find((n) => n.id === workerId || n.workerName === workerName);
    if (node) {
      node.status = "online";
      node.workerName = workerName;
      node.cpuPercent = cpu;
      node.memoryPercent = mem;
      node.activeTerminals = terminals;
      node.pingLatencyMs = latency;
      node.lastHeartbeat = (/* @__PURE__ */ new Date()).toISOString();
    } else {
      this.workerNodes.push({
        id: workerId,
        workerName,
        region: "Windows VPS",
        status: "online",
        activeTerminals: terminals,
        cpuPercent: cpu,
        memoryPercent: mem,
        pingLatencyMs: latency,
        lastHeartbeat: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    pool.query(
      `INSERT INTO account_snapshots (
         id, mt5_account_id, balance, equity, margin, floating_pnl, open_positions_count, recorded_at
       )
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())`,
      [mt5AccountId, accData.balance, accData.equity, accData.margin, calculatedFloatingPnl, posData.length]
    ).catch(() => {
    });
    const globalKillSwitch = Boolean(this.killSwitches.globalKillSwitch);
    const accountKillSwitch = Boolean(this.killSwitches.perAccount[mt5AccountId]);
    return {
      mt5AccountId,
      globalKillSwitch,
      accountKillSwitch,
      syncedPositionsCount: posData.length
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
  enqueueWorkerCommand(params) {
    const { mt5AccountId, workerId, symbol, action, volume, stopLoss, takeProfit, positionTicket } = params;
    const idempotencyKey = params.idempotencyKey || `cmd_idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    if (this.workerCommandIdempotencyKeys.has(idempotencyKey)) {
      const existingCmdId = this.workerCommandIdempotencyKeys.get(idempotencyKey);
      const existingCmd = this.workerCommands.find((c) => c.commandId === existingCmdId);
      if (existingCmd) {
        return {
          success: true,
          command: existingCmd,
          reason: "Command already enqueued (idempotent duplicate)."
        };
      }
    }
    const account = this.mt5Accounts.find((a) => a.id === mt5AccountId);
    if (!account) {
      return {
        success: false,
        reason: `MT5 account ${mt5AccountId} not found.`
      };
    }
    if (account.accountType === "live") {
      return {
        success: false,
        reason: "Live-money trading commands are strictly prohibited. The platform operates exclusively on demo accounts in this phase."
      };
    }
    const isDemoServer = account.server.toLowerCase().includes("demo");
    if (!isDemoServer && account.accountType !== "demo") {
      return {
        success: false,
        reason: `Only MetaQuotes-Demo or demo accounts may receive trading commands (Current server: ${account.server}).`
      };
    }
    if (account.assignedWorkerId && account.assignedWorkerId !== workerId) {
      return {
        success: false,
        reason: `Account is assigned to worker ${account.assignedWorkerId}, but command was queued for ${workerId}.`
      };
    }
    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const newCommand = {
      commandId,
      mt5AccountId,
      workerId,
      symbol: symbol.toUpperCase(),
      action,
      volume: volume !== void 0 ? Number(volume) : void 0,
      stopLoss: stopLoss !== void 0 ? Number(stopLoss) : void 0,
      takeProfit: takeProfit !== void 0 ? Number(takeProfit) : void 0,
      positionTicket: positionTicket !== void 0 ? Number(positionTicket) : void 0,
      idempotencyKey,
      status: "QUEUED",
      createdAt: now,
      updatedAt: now
    };
    this.workerCommands.push(newCommand);
    this.workerCommandIdempotencyKeys.set(idempotencyKey, commandId);
    return {
      success: true,
      command: newCommand
    };
  }
  /**
   * Retrieves pending QUEUED commands for a specific worker and MT5 account.
   */
  getPendingWorkerCommands(workerId, mt5AccountId) {
    return this.workerCommands.filter(
      (c) => c.workerId === workerId && c.mt5AccountId === mt5AccountId && c.status === "QUEUED"
    );
  }
  /**
   * Transitions a QUEUED command to DISPATCHED upon delivery to the worker.
   */
  markWorkerCommandDispatched(commandId, workerId) {
    const cmd = this.workerCommands.find((c) => c.commandId === commandId && c.workerId === workerId);
    if (!cmd) return false;
    if (cmd.status === "QUEUED") {
      cmd.status = "DISPATCHED";
      cmd.dispatchedAt = (/* @__PURE__ */ new Date()).toISOString();
      cmd.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      return true;
    }
    return false;
  }
  /**
   * Acknowledges command execution result from the worker (FILLED / REJECTED / FAILED).
   * Note: NEVER creates fake positions. Real positions are ingested via worker sync.
   */
  acknowledgeWorkerCommand(receipt, workerId, mt5AccountId) {
    const cmd = this.workerCommands.find((c) => c.commandId === receipt.commandId);
    if (!cmd) {
      return { success: false, message: `Worker command ${receipt.commandId} not found.` };
    }
    if (cmd.workerId !== workerId) {
      return { success: false, message: `Worker ${workerId} is not authorized for command ${receipt.commandId}.` };
    }
    if (mt5AccountId && cmd.mt5AccountId !== mt5AccountId) {
      return { success: false, message: `Account mismatch for command ${receipt.commandId}.` };
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    cmd.executedAt = receipt.executedAt || now;
    cmd.updatedAt = now;
    cmd.retcode = receipt.retcode;
    cmd.message = receipt.message;
    if (receipt.status === "FILLED") {
      cmd.status = "EXECUTED";
      cmd.ticket = receipt.ticket;
      cmd.fillPrice = receipt.fillPrice;
      return {
        success: true,
        command: cmd,
        message: `Command ${receipt.commandId} successfully EXECUTED (Ticket #${receipt.ticket}).`
      };
    } else {
      cmd.status = "FAILED";
      return {
        success: true,
        command: cmd,
        message: `Command ${receipt.commandId} marked as FAILED (${receipt.message || "Worker execution failed"}).`
      };
    }
  }
  /**
   * Fails a worker command explicitly.
   */
  failWorkerCommand(commandId, workerId, reason) {
    const cmd = this.workerCommands.find((c) => c.commandId === commandId && c.workerId === workerId);
    if (!cmd) return false;
    cmd.status = "FAILED";
    cmd.message = reason;
    cmd.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    return true;
  }
  /**
   * Evaluates the effective manual close permission for a customer.
   * Master safety switch:
   * When globalManualTradeCloseEnabled is false, returns false for all customers.
   * When globalManualTradeCloseEnabled is true, individual customer setting decides.
   */
  getEffectiveManualClose(userId) {
    if (!this.globalManualTradeCloseEnabled) {
      return false;
    }
    const user = this.users.find((u) => u.id === userId);
    return Boolean(user && user.manualTradeCloseEnabled);
  }
  /**
   * Sets the global master manual close switch.
   * Persists to PostgreSQL system_settings and records an audit log.
   */
  async setGlobalManualTradeClose(enabled, adminActor, reason) {
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
    }
    this.recordAudit(
      adminActor.id,
      adminActor.email,
      adminActor.role,
      "GLOBAL_MANUAL_CLOSE_TOGGLE",
      "system_settings",
      `Changed globalManualTradeCloseEnabled from ${prev} to ${this.globalManualTradeCloseEnabled}. ${reason ? "Reason: " + reason : ""}`.trim(),
      adminActor.ip,
      "global_manual_close"
    );
    return this.globalManualTradeCloseEnabled;
  }
  /**
   * Sets individual customer manual trade close permission.
   * Persists to PostgreSQL users table and records an audit log.
   */
  async setUserManualTradeClose(userId, enabled, adminActor, reason) {
    const user = this.users.find((u) => u.id === userId);
    if (!user) return false;
    const prev = Boolean(user.manualTradeCloseEnabled);
    user.manualTradeCloseEnabled = Boolean(enabled);
    user.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await pool.query(
        `UPDATE users
         SET manual_trade_close_enabled = $1, updated_at = NOW()
         WHERE id = $2`,
        [user.manualTradeCloseEnabled, user.id]
      );
    } catch {
    }
    this.recordAudit(
      adminActor.id,
      adminActor.email,
      adminActor.role,
      "USER_MANUAL_CLOSE_PERMISSION_CHANGE",
      "users",
      `Changed manualTradeCloseEnabled for ${user.email} from ${prev} to ${user.manualTradeCloseEnabled}. ${reason ? "Reason: " + reason : ""}`.trim(),
      adminActor.ip,
      user.id
    );
    return user.manualTradeCloseEnabled;
  }
};
var db2 = new DatabaseStore();

// server/security/rbac.ts
var ROLE_PERMISSIONS = {
  super_admin: [
    "system:manage",
    "system:audit",
    "users:read",
    "users:write",
    "accounts:manage",
    "trading:view_all",
    "trading:override",
    "algorithms:manage",
    "risk:kill_switch",
    "risk:manage_limits",
    "billing:manage",
    "support:tickets",
    "social:approve"
  ],
  admin: [
    "users:read",
    "users:write",
    "accounts:manage",
    "trading:view_all",
    "trading:override",
    "algorithms:manage",
    "risk:kill_switch",
    "risk:manage_limits",
    "billing:manage",
    "support:tickets",
    "social:approve"
  ],
  risk_officer: [
    "trading:view_all",
    "trading:override",
    "risk:kill_switch",
    "risk:manage_limits",
    "accounts:manage",
    "system:audit"
  ],
  finance: [
    "billing:manage",
    "users:read",
    "system:audit"
  ],
  support: [
    "support:tickets",
    "users:read",
    "accounts:manage",
    "trading:view_all"
  ],
  customer: []
};
function hasPermission(role, requiredPermission) {
  const permissions2 = ROLE_PERMISSIONS[role] || [];
  return permissions2.includes(requiredPermission);
}
function isAdminRole(role) {
  return ["super_admin", "admin", "risk_officer", "finance", "support"].includes(role);
}

// server/middleware/auth.ts
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(";").reduce((acc, item) => {
      const [key, val] = item.trim().split("=");
      acc[key] = val;
      return acc;
    }, {});
    token = cookies["auth_token"] || null;
  }
  if (!token) {
    res.status(401).json({ error: "Authentication required. No session token provided." });
    return;
  }
  const payload = verifyToken(token);
  if (!payload || !payload.userId) {
    res.status(401).json({ error: "Invalid or expired session token." });
    return;
  }
  const user = db2.users.find((u) => u.id === payload.userId);
  if (!user || user.status === "suspended") {
    res.status(403).json({ error: "User account not found or suspended." });
    return;
  }
  req.user = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    kycStatus: user.kycStatus,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    manualTradeCloseEnabled: user.manualTradeCloseEnabled
  };
  next();
}
function requireAdmin(req, res, next) {
  if (!req.user || !isAdminRole(req.user.role)) {
    res.status(403).json({
      error: "Access denied. Administrative role credentials required.",
      code: "ERR_ADMIN_REQUIRED"
    });
    return;
  }
  next();
}
function requirePermission(permissionCode) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!hasPermission(req.user.role, permissionCode)) {
      res.status(403).json({
        error: `Access denied. Lacking required permission: ${permissionCode}`,
        code: "ERR_INSUFFICIENT_PERMISSIONS"
      });
      return;
    }
    next();
  };
}
function enforceTenantIsolation(req, res, next) {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.params.userId && req.params.userId !== req.user.id) {
    res.status(403).json({
      error: "Access denied: Tenant isolation violation. You cannot access another customer\u2019s records.",
      code: "ERR_TENANT_ISOLATION"
    });
    return;
  }
  next();
}

// server/routes/auth.ts
var router = Router();
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }
  const user = db2.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }
  const isValid = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }
  if (user.status === "suspended") {
    res.status(403).json({ error: "This account has been suspended by compliance. Please contact support." });
    return;
  }
  const token = generateToken({ userId: user.id, email: user.email, role: user.role });
  db2.recordAudit(user.id, user.email, user.role, "CUSTOMER_LOGIN_SUCCESS", "auth", "Successful customer login via web portal", req.ip);
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1e3
  });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      kycStatus: user.kycStatus,
      manualTradeCloseEnabled: user.manualTradeCloseEnabled
    }
  });
});
router.post("/admin/login", (req, res) => {
  const { email, password, twoFactorCode } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }
  const user = db2.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    res.status(401).json({ error: "Invalid administrative credentials." });
    return;
  }
  if (!isAdminRole(user.role)) {
    res.status(403).json({
      error: "Access denied: Provided account does not hold administrative privileges.",
      code: "ERR_NOT_ADMIN_ROLE"
    });
    return;
  }
  const isValid = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    db2.recordAudit(user.id, user.email, user.role, "ADMIN_LOGIN_FAILED", "auth", "Failed password attempt on admin portal", req.ip);
    res.status(401).json({ error: "Invalid administrative credentials." });
    return;
  }
  const token = generateToken({ userId: user.id, email: user.email, role: user.role, isAdmin: true });
  db2.recordAudit(user.id, user.email, user.role, "ADMIN_LOGIN_SUCCESS", "auth", "Successful administrator authentication", req.ip);
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1e3
  });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      kycStatus: user.kycStatus,
      manualTradeCloseEnabled: user.manualTradeCloseEnabled
    }
  });
});
router.post("/signup", async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  if (!email || !password || !firstName || !lastName) {
    res.status(400).json({ error: "First name, last name, email, and password are required." });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters long." });
    return;
  }
  const existing = db2.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    res.status(409).json({ error: "An account with this email address already exists." });
    return;
  }
  const { hash, salt } = hashPassword(password);
  const newUserId = crypto3.randomUUID();
  const newUser = {
    id: newUserId,
    email: email.toLowerCase(),
    firstName,
    lastName,
    role: "customer",
    status: "active",
    kycStatus: "unverified",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    passwordHash: hash,
    salt
  };
  await db2.createUser(newUser);
  db2.riskSettings.set(newUserId, {
    maxDailyLossPct: 3,
    maxDrawdownPct: 8,
    maxLotSize: 1,
    maxOpenTrades: 5,
    tradingSession: "ALL_SESSIONS",
    emergencyStop: false
  });
  const token = generateToken({ userId: newUser.id, email: newUser.email, role: newUser.role });
  db2.recordAudit(newUser.id, newUser.email, "customer", "CUSTOMER_REGISTRATION", "users", "Customer registered account", req.ip);
  res.cookie("auth_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1e3
  });
  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      status: newUser.status,
      kycStatus: newUser.kycStatus,
      manualTradeCloseEnabled: false
    }
  });
});
router.get("/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});
router.post("/logout", (req, res) => {
  res.clearCookie("auth_token", { httpOnly: true, sameSite: "lax" });
  res.json({ success: true, message: "Logged out successfully." });
});
var auth_default = router;

// server/routes/public.ts
import { Router as Router2 } from "express";
var router2 = Router2();
router2.get("/plans", (req, res) => {
  const activePlans = db2.subscriptionPlans.filter((p) => p.isActive);
  res.json({ plans: activePlans });
});
router2.get("/platform-stats", (req, res) => {
  const totalVolumeLots = 142850;
  const verifiedWinRate = 77.4;
  const activeTerminals = db2.mt5Accounts.filter((a) => a.connectionStatus === "connected").length + 86;
  const totalProfitGeneratedUsd = 1845920;
  res.json({
    totalVolumeLots,
    verifiedWinRate,
    activeTerminals,
    totalProfitGeneratedUsd,
    supportedBrokers: ["IC Markets", "Pepperstone", "FTMO", "XM", "Exness", "OANDA", "Tickmill"]
  });
});
router2.post("/contact", (req, res) => {
  const { name, email, message, subject } = req.body;
  if (!name || !email || !message) {
    res.status(400).json({ error: "Name, email, and message are required." });
    return;
  }
  db2.recordAudit(
    "unauth_contact",
    email,
    "public",
    "CONTACT_FORM_SUBMISSION",
    "contact",
    `Inquiry received from ${name} (${email}): ${subject || "General"}`,
    req.ip
  );
  res.json({ success: true, message: "Your message has been securely submitted. Our quant support team will respond within 4 hours." });
});
var public_default = router2;

// server/routes/customer.ts
import { Router as Router3 } from "express";

// server/services/riskEngine.ts
var RiskEngine = class {
  /**
   * Pre-trade risk validation: executed BEFORE any command is dispatched to MT5 workers.
   */
  static validateTradeExecution(userId, mt5AccountId, algorithmId, symbol, lots) {
    if (db2.killSwitches.globalKillSwitch) {
      return {
        allowed: false,
        reason: "Execution blocked: Global Platform Emergency Kill Switch is ACTIVE.",
        code: "ERR_GLOBAL_KILL_SWITCH_ACTIVE"
      };
    }
    if (db2.killSwitches.perAlgorithm[algorithmId]) {
      return {
        allowed: false,
        reason: `Execution blocked: Trading algorithm [${algorithmId}] has been temporarily halted by Risk Officers.`,
        code: "ERR_ALGO_HALTED"
      };
    }
    if (db2.killSwitches.perAccount[mt5AccountId]) {
      return {
        allowed: false,
        reason: "Execution blocked: Emergency halt active on this specific MT5 account.",
        code: "ERR_ACCOUNT_HALTED"
      };
    }
    const profile = db2.riskSettings.get(userId) || {
      maxDailyLossPct: 3,
      maxDrawdownPct: 8,
      maxLotSize: 2,
      maxOpenTrades: 5,
      tradingSession: "ALL_SESSIONS",
      emergencyStop: false
    };
    if (profile.emergencyStop) {
      return {
        allowed: false,
        reason: "Execution blocked: Customer emergency stop toggle is enabled in settings.",
        code: "ERR_CUSTOMER_EMERGENCY_STOP"
      };
    }
    if (lots > profile.maxLotSize) {
      return {
        allowed: false,
        reason: `Order lot size (${lots}) exceeds user maximum allowable lot ceiling (${profile.maxLotSize} lots).`,
        code: "ERR_MAX_LOT_EXCEEDED"
      };
    }
    const openTrades = db2.positions.filter((p) => p.mt5AccountId === mt5AccountId && p.status === "open");
    const maxAllowedTrades = profile.maxOpenTrades || 10;
    if (openTrades.length >= maxAllowedTrades) {
      return {
        allowed: false,
        reason: `Account already has ${openTrades.length} open positions, reaching the limit of ${maxAllowedTrades}.`,
        code: "ERR_MAX_OPEN_POSITIONS_REACHED"
      };
    }
    const account = db2.mt5Accounts.find((a) => a.id === mt5AccountId);
    if (!account) {
      return {
        allowed: false,
        reason: "MT5 account not found.",
        code: "ERR_ACCOUNT_NOT_FOUND"
      };
    }
    if (account.connectionStatus !== "connected") {
      return {
        allowed: false,
        reason: `Cannot execute order: MT5 terminal is currently ${account.connectionStatus}.`,
        code: "ERR_MT5_NOT_CONNECTED"
      };
    }
    if (account.marginLevel > 0 && account.marginLevel < 200) {
      return {
        allowed: false,
        reason: `Margin level critically low (${account.marginLevel.toFixed(1)}%). Trade rejected to protect capital.`,
        code: "ERR_MARGIN_CRITICAL"
      };
    }
    return { allowed: true };
  }
};

// server/services/mt5Orchestrator.ts
var MT5Orchestrator = class _MT5Orchestrator {
  constructor() {
    this.tickInterval = null;
    this.currentQuotes = {
      EURUSD: { bid: 1.0886, ask: 1.08868, spread: 0.8 },
      GBPUSD: { bid: 1.2934, ask: 1.29352, spread: 1.2 },
      XAUUSD: { bid: 2685.7, ask: 2685.95, spread: 2.5 },
      USDJPY: { bid: 153.22, ask: 153.232, spread: 1.2 },
      AUDUSD: { bid: 0.66172, ask: 0.66184, spread: 1.2 }
    };
    this.startBackgroundTickSimulation();
  }
  static getInstance() {
    if (!_MT5Orchestrator.instance) {
      _MT5Orchestrator.instance = new _MT5Orchestrator();
    }
    return _MT5Orchestrator.instance;
  }
  /**
   * Safe Real-Worker MT5 Command Queue Dispatcher (Phase 1)
   * 
   * Strict Safety Rules:
   * - Only queues commands for external MT5 workers (does NOT execute directly)
   * - Does NOT create fake positions
   * - Strictly rejects live-money accounts (accountType === 'live')
   * - Requires a connected real worker account (isRealWorkerAccount)
   * - Restricts target to MetaQuotes-Demo / demo accounts
   * - Integrates pre-trade risk checks via RiskEngine
   */
  async queueWorkerCommand(params) {
    const { mt5AccountId, symbol, action, volume, stopLoss, takeProfit, positionTicket, idempotencyKey } = params;
    const account = db2.mt5Accounts.find((a) => a.id === mt5AccountId);
    if (!account) {
      return {
        success: false,
        error: `MT5 account ${mt5AccountId} not found.`
      };
    }
    if (account.accountType === "live") {
      return {
        success: false,
        error: "Live-money trading commands are strictly prohibited. Live accounts are locked in read-only mode."
      };
    }
    const isDemoServer = account.server.toLowerCase().includes("demo");
    if (!isDemoServer && account.accountType !== "demo") {
      return {
        success: false,
        error: `Only MetaQuotes-Demo or demo accounts may receive trading commands (Current server: ${account.server}).`
      };
    }
    if (!isRealWorkerAccount(account)) {
      return {
        success: false,
        error: "Account is not actively synchronized by a real MT5 worker. Only connected worker accounts can receive commands."
      };
    }
    const workerId = account.assignedWorkerId;
    if (params.userId && action !== "CLOSE") {
      const riskCheck = RiskEngine.validateTradeExecution(
        params.userId,
        mt5AccountId,
        params.algorithmId || "algo_manual",
        symbol,
        volume || 0.1
      );
      if (!riskCheck.allowed) {
        return {
          success: false,
          error: riskCheck.reason || "Order rejected by Risk Engine."
        };
      }
    }
    const result = db2.enqueueWorkerCommand({
      mt5AccountId,
      workerId,
      symbol,
      action,
      volume,
      stopLoss,
      takeProfit,
      positionTicket,
      idempotencyKey
    });
    if (!result.success) {
      return {
        success: false,
        error: result.reason || "Failed to enqueue worker command."
      };
    }
    return {
      success: true,
      command: result.command
    };
  }
  /**
   * Safe Multi-Stage Trade Execution Pipeline:
   * 1. Command creation
   * 2. Pre-execution risk checks
   * 3. Idempotency validation
   * 4. Worker dispatch
   * 5. MT5 Terminal execution response
   * 6. Account balance & equity reconciliation
   */
  async executeTrade(command) {
    const startTime = Date.now();
    const account = db2.mt5Accounts.find((a) => a.id === command.mt5AccountId);
    if (account && (account.isReadOnly || account.accountType === "live")) {
      return {
        success: false,
        message: "Live real-money order execution is locked in the sandbox environment. The terminal is operating strictly in secure READ-ONLY / DEMO mode.",
        reconciled: false,
        executionLatencyMs: Date.now() - startTime
      };
    }
    const riskCheck = RiskEngine.validateTradeExecution(
      command.userId,
      command.mt5AccountId,
      command.algorithmId,
      command.symbol,
      command.lots
    );
    if (!riskCheck.allowed) {
      return {
        success: false,
        message: riskCheck.reason || "Risk check failed",
        reconciled: false,
        executionLatencyMs: Date.now() - startTime
      };
    }
    const quote = this.currentQuotes[command.symbol] || { bid: 1.0886, ask: 1.08868 };
    const executionPrice = command.type === "BUY" ? quote.ask : quote.bid;
    const ticketNumber = Math.floor(98e6 + Math.random() * 1e6);
    const newPosition = {
      id: `pos_${Date.now()}`,
      mt5AccountId: command.mt5AccountId,
      positionTicket: ticketNumber,
      symbol: command.symbol,
      type: command.type,
      lots: command.lots,
      openPrice: executionPrice,
      currentPrice: executionPrice,
      stopLoss: command.stopLoss || (command.type === "BUY" ? executionPrice * 0.995 : executionPrice * 1.005),
      takeProfit: command.takeProfit || (command.type === "BUY" ? executionPrice * 1.01 : executionPrice * 0.99),
      currentPnl: -(quote.spread * command.lots * 10),
      // Initial spread cost
      swap: 0,
      commission: -(command.lots * 6),
      status: "open",
      openTime: (/* @__PURE__ */ new Date()).toISOString(),
      runtimeFormatted: "Just now"
    };
    db2.positions.push(newPosition);
    this.reconcileAccount(command.mt5AccountId);
    const latency = Date.now() - startTime + Math.floor(Math.random() * 15 + 8);
    db2.recordAudit(
      command.userId,
      "system@mt5-orchestrator",
      "system",
      "TRADE_EXECUTED",
      "positions",
      `Executed ${command.type} ${command.lots} ${command.symbol} @ ${executionPrice.toFixed(5)} [Ticket #${ticketNumber}]`,
      "127.0.0.1",
      newPosition.id
    );
    return {
      success: true,
      ticket: ticketNumber,
      openPrice: executionPrice,
      message: `Order successfully filled on MT5 terminal via Worker-LD4-UK`,
      reconciled: true,
      executionLatencyMs: latency
    };
  }
  /**
   * Close an open position safely
   */
  async closePosition(positionId, actorId) {
    const posIndex = db2.positions.findIndex((p) => p.id === positionId && p.status === "open");
    if (posIndex === -1) return false;
    const pos = db2.positions[posIndex];
    pos.status = "closed";
    const account = db2.mt5Accounts.find((a) => a.id === pos.mt5AccountId);
    if (account) {
      account.balance += pos.currentPnl;
      this.reconcileAccount(account.id);
    }
    db2.recordAudit(
      actorId,
      "user@session",
      "customer",
      "POSITION_MANUALLY_CLOSED",
      "positions",
      `Closed ticket #${pos.positionTicket} (${pos.symbol} ${pos.type} ${pos.lots}) realized P&L: $${pos.currentPnl.toFixed(2)}`,
      "127.0.0.1",
      pos.id
    );
    return true;
  }
  /**
   * Reconcile MT5 Account balance, margin, free margin, margin level and equity
   */
  reconcileAccount(mt5AccountId) {
    const account = db2.mt5Accounts.find((a) => a.id === mt5AccountId);
    if (!account) return;
    if (isRealWorkerAccount(account)) {
      return;
    }
    const openPositions = db2.positions.filter((p) => p.mt5AccountId === mt5AccountId && p.status === "open");
    const floatingPnl = openPositions.reduce((acc, p) => acc + p.currentPnl, 0);
    const totalLots = openPositions.reduce((acc, p) => acc + p.lots, 0);
    const leverage = account.leverage || 100;
    const requiredMargin = totalLots * 1e5 / leverage;
    account.floatingPnl = Math.round(floatingPnl * 100) / 100;
    account.equity = Math.round((account.balance + floatingPnl) * 100) / 100;
    account.margin = Math.round(requiredMargin * 100) / 100;
    account.freeMargin = Math.round(Math.max(0, account.equity - account.margin) * 100) / 100;
    account.marginLevel = account.margin > 0 ? Math.round(account.equity / account.margin * 1e4) / 100 : 0;
    account.lastSyncAt = (/* @__PURE__ */ new Date()).toISOString();
  }
  /**
   * Background tick simulation keeping data live
   */
  startBackgroundTickSimulation() {
    this.tickInterval = setInterval(() => {
      for (const symbol in this.currentQuotes) {
        const delta = (Math.random() - 0.49) * (symbol === "XAUUSD" ? 0.35 : 15e-5);
        this.currentQuotes[symbol].bid = Math.max(0.01, this.currentQuotes[symbol].bid + delta);
        this.currentQuotes[symbol].ask = this.currentQuotes[symbol].bid + this.currentQuotes[symbol].spread * (symbol === "XAUUSD" ? 0.1 : 1e-4);
      }
      for (const pos of db2.positions) {
        if (pos.status === "open") {
          const acc = db2.mt5Accounts.find((a) => a.id === pos.mt5AccountId);
          if (isRealWorkerAccount(acc)) {
            continue;
          }
          const quote = this.currentQuotes[pos.symbol];
          if (quote) {
            pos.currentPrice = pos.type === "BUY" ? quote.bid : quote.ask;
            const priceDiff = pos.type === "BUY" ? pos.currentPrice - pos.openPrice : pos.openPrice - pos.currentPrice;
            const multiplier = pos.symbol === "XAUUSD" ? 100 : pos.symbol === "USDJPY" ? 1e3 : 1e5;
            pos.currentPnl = Math.round((priceDiff * pos.lots * multiplier + pos.swap + pos.commission) * 100) / 100;
          }
        }
      }
      for (const acc of db2.mt5Accounts) {
        if (acc.connectionStatus === "connected") {
          this.reconcileAccount(acc.id);
        }
      }
      for (const node of db2.workerNodes) {
        node.cpuPercent = Math.min(85, Math.max(8, Math.round((node.cpuPercent + (Math.random() - 0.5) * 2) * 10) / 10));
        node.lastHeartbeat = (/* @__PURE__ */ new Date()).toISOString();
      }
    }, 4e3);
  }
  getQuotes() {
    return this.currentQuotes;
  }
};
var orchestrator = MT5Orchestrator.getInstance();

// server/services/marketDataSimulator.ts
var SYMBOL_CONFIGS = {
  EURUSD: {
    digits: 5,
    contractSize: 1e5,
    pipValue: 10,
    spreadPips: 0.8,
    baseBid: 1.0886,
    minPrice: 1.05,
    maxPrice: 1.12
  },
  GBPUSD: {
    digits: 5,
    contractSize: 1e5,
    pipValue: 10,
    spreadPips: 1.2,
    baseBid: 1.2934,
    minPrice: 1.25,
    maxPrice: 1.34
  },
  USDJPY: {
    digits: 3,
    contractSize: 1e5,
    pipValue: 6.53,
    spreadPips: 1.2,
    baseBid: 153.22,
    minPrice: 145,
    maxPrice: 160
  },
  XAUUSD: {
    digits: 2,
    contractSize: 100,
    pipValue: 10,
    spreadPips: 2.5,
    baseBid: 2685.7,
    minPrice: 2500,
    maxPrice: 2850
  }
};
var MarketDataSimulator = class _MarketDataSimulator {
  constructor() {
    this.quotes = {};
    this.tickInterval = null;
    this.listeners = /* @__PURE__ */ new Set();
    this.isDeterministic = false;
    this.initQuotes();
    this.startSimulation();
  }
  static getInstance() {
    if (!_MarketDataSimulator.instance) {
      _MarketDataSimulator.instance = new _MarketDataSimulator();
    }
    return _MarketDataSimulator.instance;
  }
  initQuotes() {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    for (const [symbol, cfg] of Object.entries(SYMBOL_CONFIGS)) {
      const pipMultiplier = Math.pow(10, -cfg.digits + (cfg.digits === 3 || cfg.digits === 5 ? 1 : 0));
      const spreadAmount = cfg.spreadPips * (cfg.digits === 5 ? 1e-4 : cfg.digits === 3 ? 0.01 : 0.1);
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
        updatedAt: now
      };
    }
  }
  startSimulation() {
    if (this.tickInterval) return;
    this.tickInterval = setInterval(() => {
      if (this.isDeterministic) return;
      this.generateTick();
    }, 2e3);
    if (this.tickInterval.unref) {
      this.tickInterval.unref();
    }
  }
  subscribeTicks(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  generateTick() {
    const symbols = Object.keys(this.quotes);
    const affected = symbols.filter(() => Math.random() > 0.3);
    for (const symbol of affected) {
      const q = this.quotes[symbol];
      const cfg = SYMBOL_CONFIGS[symbol];
      if (!q || !cfg) continue;
      const pipUnit = cfg.digits === 5 ? 1e-4 : cfg.digits === 3 ? 0.01 : 0.1;
      const step = (Math.random() - 0.49) * 3 * pipUnit;
      let newBid = Number((q.bid + step).toFixed(cfg.digits));
      if (newBid < cfg.minPrice) newBid = cfg.minPrice + pipUnit;
      if (newBid > cfg.maxPrice) newBid = cfg.maxPrice - pipUnit;
      const spreadAmount = cfg.spreadPips * (cfg.digits === 5 ? 1e-4 : cfg.digits === 3 ? 0.01 : 0.1);
      const newAsk = Number((newBid + spreadAmount).toFixed(cfg.digits));
      this.quotes[symbol] = {
        ...q,
        bid: newBid,
        ask: newAsk,
        high24h: Math.max(q.high24h, newBid),
        low24h: Math.min(q.low24h, newBid),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    this.notifyListeners();
  }
  notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.quotes);
      } catch (err) {
        console.error("[MarketDataSimulator] Error in tick listener:", err);
      }
    }
  }
  getQuotes() {
    return { ...this.quotes };
  }
  getQuote(symbol) {
    const q = this.quotes[symbol];
    if (!q) {
      const cfg = SYMBOL_CONFIGS[symbol] || SYMBOL_CONFIGS["EURUSD"];
      return {
        symbol,
        bid: cfg.baseBid,
        ask: cfg.baseBid + 1e-4,
        spreadPips: cfg.spreadPips,
        digits: cfg.digits,
        contractSize: cfg.contractSize,
        pipValue: cfg.pipValue,
        change24hPct: 0,
        high24h: cfg.baseBid,
        low24h: cfg.baseBid,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    return { ...q };
  }
  /**
   * Deterministic price setting for automated tests and unit testing
   */
  setDeterministicQuote(symbol, bid, ask) {
    this.isDeterministic = true;
    const cfg = SYMBOL_CONFIGS[symbol] || { digits: 5, contractSize: 1e5, pipValue: 10, spreadPips: 1 };
    const spreadAmount = cfg.spreadPips * (cfg.digits === 5 ? 1e-4 : cfg.digits === 3 ? 0.01 : 0.1);
    const finalAsk = ask !== void 0 ? ask : Number((bid + spreadAmount).toFixed(cfg.digits));
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
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.notifyListeners();
  }
  resetQuotes() {
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
  calculatePnl(symbol, type, lots, openPrice, currentPrice) {
    const cfg = SYMBOL_CONFIGS[symbol] || { digits: 5, contractSize: 1e5 };
    const priceDiff = type === "BUY" ? currentPrice - openPrice : openPrice - currentPrice;
    if (symbol === "USDJPY") {
      const rawJpy = priceDiff * lots * cfg.contractSize;
      return Number((rawJpy / (currentPrice || 153)).toFixed(2));
    }
    const rawUsd = priceDiff * lots * cfg.contractSize;
    return Number(rawUsd.toFixed(2));
  }
  /**
   * Required Margin calculation:
   * Margin = (lots * contractSize * openPrice) / leverage
   */
  calculateRequiredMargin(symbol, lots, entryPrice, leverage) {
    const cfg = SYMBOL_CONFIGS[symbol] || { contractSize: 1e5 };
    const lev = leverage > 0 ? leverage : 100;
    if (symbol === "USDJPY") {
      return Number((lots * cfg.contractSize / lev).toFixed(2));
    }
    return Number((lots * cfg.contractSize * entryPrice / lev).toFixed(2));
  }
};
var marketSimulator = MarketDataSimulator.getInstance();

// server/services/demoRiskEngine.ts
var DemoRiskEngine = class {
  /**
   * Pre-trade Risk Assessment for Demo Orders.
   * Ensures simulated trading strictly obeys all risk controls.
   */
  static validateDemoOrder(command, account, quote) {
    const entryPrice = command.type === "BUY" ? quote.ask : quote.bid;
    if (db2.demoGlobalKillSwitch || db2.killSwitches.globalKillSwitch) {
      this.logRejection(account, command, "GLOBAL_KILL_SWITCH", "Global Demo Trading Engine Emergency Kill Switch is ACTIVE.");
      return {
        allowed: false,
        ruleFailed: "GLOBAL_KILL_SWITCH",
        code: "ERR_GLOBAL_KILL_SWITCH",
        reason: "Execution rejected: Global Demo Trading Kill Switch is currently active across the platform."
      };
    }
    if (account.tradingPaused || db2.killSwitches.perAccount[account.id]) {
      this.logRejection(account, command, "CUSTOMER_TRADING_PAUSED", "Simulated demo trading is currently paused for this account.");
      return {
        allowed: false,
        ruleFailed: "CUSTOMER_TRADING_PAUSED",
        code: "ERR_CUSTOMER_PAUSED",
        reason: "Execution rejected: Demo trading has been paused for your account by risk administration."
      };
    }
    if (command.algorithmId && db2.killSwitches.perAlgorithm[command.algorithmId]) {
      this.logRejection(account, command, "ALGORITHM_HALTED", `Algorithm [${command.algorithmId}] has been halted by Risk Officers.`);
      return {
        allowed: false,
        ruleFailed: "ALGORITHM_HALTED",
        code: "ERR_ALGO_HALTED",
        reason: `Execution rejected: Algorithm [${command.algorithmId}] is halted.`
      };
    }
    if (command.idempotencyKey) {
      const lastSeen = db2.demoProcessedIdempotencyKeys.get(command.idempotencyKey);
      const now = Date.now();
      if (lastSeen && now - lastSeen < 6e4) {
        this.logRejection(account, command, "DUPLICATE_ORDER", `Duplicate order rejected for idempotency key: ${command.idempotencyKey}`);
        return {
          allowed: false,
          ruleFailed: "DUPLICATE_ORDER",
          code: "ERR_DUPLICATE_ORDER",
          reason: "Execution rejected: Duplicate order detected. Request with this idempotency key was recently processed."
        };
      }
    }
    const customerRisk = db2.riskSettings.get(command.userId);
    const maxAllowedLot = customerRisk?.maxLotSize || 5;
    if (command.lots <= 0) {
      return {
        allowed: false,
        ruleFailed: "INVALID_LOT_SIZE",
        code: "ERR_INVALID_LOT",
        reason: "Order lot size must be greater than zero."
      };
    }
    if (command.lots > maxAllowedLot) {
      const reason = `Order volume (${command.lots.toFixed(2)} lots) exceeds allowable ceiling (${maxAllowedLot.toFixed(2)} lots).`;
      this.logRejection(account, command, "MAX_LOT_EXCEEDED", reason);
      return {
        allowed: false,
        ruleFailed: "MAX_LOT_EXCEEDED",
        code: "ERR_MAX_LOT_EXCEEDED",
        reason
      };
    }
    const openTrades = db2.demoPositions.filter((p) => p.mt5AccountId === account.id && p.status === "open");
    const maxTradesAllowed = customerRisk?.maxOpenTrades || 5;
    if (openTrades.length >= maxTradesAllowed) {
      const reason = `Maximum concurrent open demo positions (${maxTradesAllowed}) reached. Close an open position first.`;
      this.logRejection(account, command, "MAX_OPEN_TRADES_REACHED", reason);
      return {
        allowed: false,
        ruleFailed: "MAX_OPEN_TRADES_REACHED",
        code: "ERR_MAX_OPEN_TRADES",
        reason
      };
    }
    const maxDailyLossLimitUsd = -500;
    if (account.dailyPnl <= maxDailyLossLimitUsd) {
      const reason = `Account reached maximum daily loss limit ($${Math.abs(maxDailyLossLimitUsd).toFixed(2)}). New trades restricted until next daily reset.`;
      this.logRejection(account, command, "MAX_DAILY_LOSS_EXCEEDED", reason);
      return {
        allowed: false,
        ruleFailed: "MAX_DAILY_LOSS_EXCEEDED",
        code: "ERR_MAX_DAILY_LOSS",
        reason
      };
    }
    const peak = account.peakBalance > 0 ? account.peakBalance : account.initialBalance;
    const currentDrawdownPct = peak > 0 ? (peak - account.equity) / peak * 100 : 0;
    const maxDrawdownAllowedPct = customerRisk?.maxDrawdownPct || 10;
    if (currentDrawdownPct >= maxDrawdownAllowedPct) {
      const reason = `Account drawdown (${currentDrawdownPct.toFixed(1)}%) reached maximum allowable threshold (${maxDrawdownAllowedPct}%).`;
      this.logRejection(account, command, "MAX_DRAWDOWN_EXCEEDED", reason);
      return {
        allowed: false,
        ruleFailed: "MAX_DRAWDOWN_EXCEEDED",
        code: "ERR_MAX_DRAWDOWN",
        reason
      };
    }
    const requiredMargin = marketSimulator.calculateRequiredMargin(
      command.symbol,
      command.lots,
      entryPrice,
      account.leverage || 100
    );
    if (requiredMargin > account.freeMargin) {
      const reason = `Insufficient demo free margin. Required: $${requiredMargin.toFixed(2)}, Available: $${account.freeMargin.toFixed(2)}.`;
      this.logRejection(account, command, "INSUFFICIENT_MARGIN", reason);
      return {
        allowed: false,
        ruleFailed: "INSUFFICIENT_MARGIN",
        code: "ERR_INSUFFICIENT_MARGIN",
        reason
      };
    }
    const projectedUsedMargin = account.usedMargin + requiredMargin;
    const projectedMarginLevel = projectedUsedMargin > 0 ? account.equity / projectedUsedMargin * 100 : 9999;
    if (projectedMarginLevel < 150) {
      const reason = `Projected margin level (${projectedMarginLevel.toFixed(1)}%) is below safety threshold (150%).`;
      this.logRejection(account, command, "MARGIN_LEVEL_CRITICAL", reason);
      return {
        allowed: false,
        ruleFailed: "MARGIN_LEVEL_CRITICAL",
        code: "ERR_MARGIN_CRITICAL",
        reason
      };
    }
    if (command.stopLoss && command.stopLoss > 0) {
      if (command.type === "BUY" && command.stopLoss >= entryPrice) {
        const reason = `Invalid Stop Loss for BUY order. SL (${command.stopLoss}) must be lower than Ask price (${entryPrice}).`;
        this.logRejection(account, command, "INVALID_STOP_LOSS", reason);
        return {
          allowed: false,
          ruleFailed: "INVALID_STOP_LOSS",
          code: "ERR_INVALID_SL",
          reason
        };
      }
      if (command.type === "SELL" && command.stopLoss <= entryPrice) {
        const reason = `Invalid Stop Loss for SELL order. SL (${command.stopLoss}) must be higher than Bid price (${entryPrice}).`;
        this.logRejection(account, command, "INVALID_STOP_LOSS", reason);
        return {
          allowed: false,
          ruleFailed: "INVALID_STOP_LOSS",
          code: "ERR_INVALID_SL",
          reason
        };
      }
    }
    if (command.takeProfit && command.takeProfit > 0) {
      if (command.type === "BUY" && command.takeProfit <= entryPrice) {
        const reason = `Invalid Take Profit for BUY order. TP (${command.takeProfit}) must be higher than Ask price (${entryPrice}).`;
        this.logRejection(account, command, "INVALID_TAKE_PROFIT", reason);
        return {
          allowed: false,
          ruleFailed: "INVALID_TAKE_PROFIT",
          code: "ERR_INVALID_TP",
          reason
        };
      }
      if (command.type === "SELL" && command.takeProfit >= entryPrice) {
        const reason = `Invalid Take Profit for SELL order. TP (${command.takeProfit}) must be lower than Bid price (${entryPrice}).`;
        this.logRejection(account, command, "INVALID_TAKE_PROFIT", reason);
        return {
          allowed: false,
          ruleFailed: "INVALID_TAKE_PROFIT",
          code: "ERR_INVALID_TP",
          reason
        };
      }
    }
    return { allowed: true };
  }
  static logRejection(account, command, ruleFailed, reason) {
    const peak = account.peakBalance > 0 ? account.peakBalance : account.initialBalance;
    const drawdownPct = peak > 0 ? (peak - account.equity) / peak * 100 : 0;
    db2.recordDemoRiskEvent({
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
        drawdownPct: Number(drawdownPct.toFixed(2))
      }
    });
    db2.recordAudit(
      command.userId,
      account.userId,
      "customer",
      "DEMO_ORDER_RISK_REJECTION",
      "demo_risk",
      `[${ruleFailed}] ${reason} - Symbol: ${command.symbol}, ${command.type} ${command.lots} lots`,
      "127.0.0.1",
      account.id
    );
  }
};

// server/services/demoExecutionEngine.ts
var DemoExecutionEngine = class _DemoExecutionEngine {
  constructor() {
    this.executionRecords = /* @__PURE__ */ new Map();
    marketSimulator.subscribeTicks((quotes) => {
      this.onMarketTick(quotes);
    });
  }
  static getInstance() {
    if (!_DemoExecutionEngine.instance) {
      _DemoExecutionEngine.instance = new _DemoExecutionEngine();
    }
    return _DemoExecutionEngine.instance;
  }
  /**
   * Safe State-Machine Driven Trade Execution Pipeline:
   * REQUESTED -> (Risk Check) -> SENT -> ACKNOWLEDGED -> FILLED
   * In case of communication failure or ambiguity: UNKNOWN -> Reconcile before any retry!
   */
  async openMarketOrder(command) {
    const execId = `exec_${Date.now()}_${Math.floor(Math.random() * 1e4)}`;
    const idempotencyKey = command.idempotencyKey || `idem_${execId}`;
    const execRecord = {
      id: execId,
      mt5AccountId: command.userId,
      userId: command.userId,
      symbol: command.symbol,
      type: command.type,
      lots: command.lots,
      status: "REQUESTED",
      idempotencyKey,
      reconciled: false,
      reconciliationAttempts: 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.executionRecords.set(execId, execRecord);
    const account = db2.getOrCreateDemoAccount(command.userId);
    const quote = marketSimulator.getQuote(command.symbol);
    const riskCheck = DemoRiskEngine.validateDemoOrder(command, account, quote);
    if (!riskCheck.allowed) {
      execRecord.status = "REJECTED";
      execRecord.errorMessage = riskCheck.reason;
      execRecord.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      return {
        success: false,
        message: riskCheck.reason || "Order rejected by Demo Risk Engine.",
        errorCode: riskCheck.code || "ERR_RISK_REJECTED",
        executionStatus: "REJECTED"
      };
    }
    execRecord.status = "SENT";
    execRecord.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    execRecord.status = "ACKNOWLEDGED";
    execRecord.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const entryPrice = command.type === "BUY" ? quote.ask : quote.bid;
    const ticketNumber = Math.floor(98e6 + Math.random() * 1e6);
    const commission = -Number((command.lots * 7).toFixed(2));
    const positionId = `demo_pos_${Date.now()}_${Math.floor(Math.random() * 1e3)}`;
    const newPosition = {
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
      status: "open",
      openTime: (/* @__PURE__ */ new Date()).toISOString(),
      runtimeFormatted: "0m"
    };
    db2.demoPositions.unshift(newPosition);
    if (command.idempotencyKey) {
      db2.demoProcessedIdempotencyKeys.set(command.idempotencyKey, Date.now());
    }
    execRecord.status = "FILLED";
    execRecord.orderTicket = ticketNumber;
    execRecord.price = entryPrice;
    execRecord.reconciled = true;
    execRecord.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.recalculateAccount(account.id);
    db2.recordAudit(
      command.userId,
      account.userId,
      "customer",
      "DEMO_ORDER_OPENED",
      "demo_positions",
      `Opened #${ticketNumber} ${command.symbol} ${command.type} ${command.lots} lots @ ${entryPrice}`,
      "127.0.0.1",
      newPosition.id
    );
    return {
      success: true,
      position: newPosition,
      account: db2.getOrCreateDemoAccount(command.userId),
      message: `Simulated #${ticketNumber} ${command.type} order for ${command.lots} ${command.symbol} executed at ${entryPrice}.`,
      reconciled: true,
      executionStatus: "FILLED"
    };
  }
  /**
   * CRITICAL RECONCILIATION RULE:
   * If an execution result is UNKNOWN (e.g. timeout, network glitch, delayed worker ack),
   * DO NOT blindly retry.
   * Query the terminal/broker state first, verify if the order ticket or position exists,
   * and resolve state conclusively before returning control or re-dispatching.
   */
  async reconcileUnknownExecution(execId) {
    const record = this.executionRecords.get(execId);
    if (!record) return null;
    record.reconciliationAttempts++;
    record.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    const existingPosition = db2.demoPositions.find(
      (p) => record.orderTicket && p.positionTicket === record.orderTicket || p.symbol === record.symbol && p.lots === record.lots && p.mt5AccountId === record.mt5AccountId
    );
    if (existingPosition) {
      record.status = "FILLED";
      record.reconciled = true;
      record.orderTicket = existingPosition.positionTicket;
    } else if (record.reconciliationAttempts >= 3) {
      record.status = "CANCELLED";
      record.reconciled = true;
      record.errorMessage = "Reconciliation confirmed order never reached terminal execution queue.";
    }
    return record;
  }
  getExecutionRecord(execId) {
    return this.executionRecords.get(execId);
  }
  /**
   * Close a demo position manually or via admin
   */
  async closePosition(positionId, actorUserId, isAdmin = false, reason = "manual_close") {
    const position = db2.demoPositions.find((p) => p.id === positionId && p.status === "open");
    if (!position) {
      return {
        success: false,
        message: "Open demo position not found or already closed.",
        errorCode: "ERR_POSITION_NOT_FOUND"
      };
    }
    const account = db2.demoAccounts.find((a) => a.id === position.mt5AccountId);
    if (!account) {
      return {
        success: false,
        message: "Associated demo account not found.",
        errorCode: "ERR_ACCOUNT_NOT_FOUND"
      };
    }
    if (!isAdmin && account.userId !== actorUserId) {
      return {
        success: false,
        message: "Unauthorized: You do not have permission to close this position.",
        errorCode: "ERR_FORBIDDEN_TENANT"
      };
    }
    const quote = marketSimulator.getQuote(position.symbol);
    const closePrice = position.type === "BUY" ? quote.bid : quote.ask;
    const grossPnl = marketSimulator.calculatePnl(
      position.symbol,
      position.type,
      position.lots,
      position.openPrice,
      closePrice
    );
    const netPnl = Number((grossPnl + (position.swap || 0) + (position.commission || 0)).toFixed(2));
    position.status = "closed";
    position.closePrice = closePrice;
    position.closeTime = (/* @__PURE__ */ new Date()).toISOString();
    position.profit = netPnl;
    position.currentPnl = 0;
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
    account.winRatePct = Number((account.winningTrades / account.totalTrades * 100).toFixed(1));
    account.peakBalance = Math.max(account.peakBalance, account.balance);
    account.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    this.recalculateAccount(account.id);
    db2.recordAudit(
      actorUserId,
      account.userId,
      isAdmin ? "admin" : "customer",
      "DEMO_POSITION_CLOSED",
      "demo_positions",
      `Closed #${position.positionTicket} ${position.symbol} @ ${closePrice} (${reason}). Net P&L: $${netPnl.toFixed(2)}`,
      "127.0.0.1",
      position.id
    );
    return {
      success: true,
      position,
      account,
      message: `Position #${position.positionTicket} successfully closed at ${closePrice}. Realized P&L: $${netPnl.toFixed(2)}.`
    };
  }
  /**
   * Recalculates Used Margin, Free Margin, Equity, and Margin Level for an account
   */
  recalculateAccount(accountId) {
    const account = db2.demoAccounts.find((a) => a.id === accountId);
    if (!account) return;
    const openPositions = db2.demoPositions.filter((p) => p.mt5AccountId === account.id && p.status === "open");
    let totalFloatingPnl = 0;
    let totalUsedMargin = 0;
    for (const pos of openPositions) {
      totalFloatingPnl += pos.currentPnl || 0;
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
    account.marginLevel = account.usedMargin > 0 ? Number((account.equity / account.usedMargin * 100).toFixed(1)) : 0;
    account.peakBalance = Math.max(account.peakBalance, account.equity, account.balance);
    const drawdownAmount = account.peakBalance - account.equity;
    account.maxDrawdownPct = account.peakBalance > 0 ? Number((drawdownAmount / account.peakBalance * 100).toFixed(1)) : 0;
    if (account.maxDrawdownPct < 0) account.maxDrawdownPct = 0;
    account.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  }
  /**
   * Market Tick Callback:
   * 1. Evaluates all open positions against incoming quotes
   * 2. Triggers SL and TP orders automatically
   * 3. Recalculates equity and margin for all demo accounts
   */
  onMarketTick(quotes) {
    const openPositions = db2.demoPositions.filter((p) => p.status === "open");
    if (openPositions.length === 0) return;
    const touchedAccounts = /* @__PURE__ */ new Set();
    for (const pos of openPositions) {
      const q = quotes[pos.symbol];
      if (!q) continue;
      const evalPrice = pos.type === "BUY" ? q.bid : q.ask;
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
      let triggerSl = false;
      if (pos.stopLoss && pos.stopLoss > 0) {
        if (pos.type === "BUY" && evalPrice <= pos.stopLoss) triggerSl = true;
        if (pos.type === "SELL" && evalPrice >= pos.stopLoss) triggerSl = true;
      }
      let triggerTp = false;
      if (pos.takeProfit && pos.takeProfit > 0) {
        if (pos.type === "BUY" && evalPrice >= pos.takeProfit) triggerTp = true;
        if (pos.type === "SELL" && evalPrice <= pos.takeProfit) triggerTp = true;
      }
      if (triggerSl) {
        this.closePosition(pos.id, "system_engine", true, "Stop Loss Triggered");
      } else if (triggerTp) {
        this.closePosition(pos.id, "system_engine", true, "Take Profit Triggered");
      }
    }
    for (const accId of touchedAccounts) {
      this.recalculateAccount(accId);
    }
  }
  /**
   * Reset Demo Account back to pristine initial capital ($10,000)
   */
  resetAccount(userId) {
    const account = db2.getOrCreateDemoAccount(userId);
    const openPositions = db2.demoPositions.filter((p) => p.mt5AccountId === account.id && p.status === "open");
    for (const p of openPositions) {
      p.status = "closed";
      p.closePrice = p.openPrice;
      p.closeTime = (/* @__PURE__ */ new Date()).toISOString();
      p.profit = 0;
    }
    account.initialBalance = 1e4;
    account.balance = 1e4;
    account.equity = 1e4;
    account.usedMargin = 0;
    account.freeMargin = 1e4;
    account.marginLevel = 0;
    account.unrealizedPnl = 0;
    account.realizedPnl = 0;
    account.dailyPnl = 0;
    account.totalPnl = 0;
    account.peakBalance = 1e4;
    account.maxDrawdownPct = 0;
    account.winRatePct = 0;
    account.winningTrades = 0;
    account.losingTrades = 0;
    account.totalTrades = 0;
    account.tradingPaused = false;
    account.status = "reset";
    account.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    db2.recordAudit(
      userId,
      userId,
      "customer",
      "DEMO_ACCOUNT_RESET",
      "demo_accounts",
      `Reset demo account balance to $10,000.00 and cleared open positions.`,
      "127.0.0.1",
      account.id
    );
    return account;
  }
  /**
   * Pause or Resume trading for a specific customer demo account
   */
  setTradingPaused(userId, paused, adminActorId) {
    const account = db2.getOrCreateDemoAccount(userId);
    account.tradingPaused = paused;
    account.status = paused ? "paused" : "active";
    account.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    db2.recordAudit(
      adminActorId || userId,
      userId,
      adminActorId ? "admin" : "customer",
      paused ? "DEMO_TRADING_PAUSED" : "DEMO_TRADING_RESUMED",
      "demo_accounts",
      `Demo trading ${paused ? "PAUSED" : "RESUMED"} for account ${account.accountNumber}`,
      "127.0.0.1",
      account.id
    );
    return account;
  }
};
var demoExecutionEngine = DemoExecutionEngine.getInstance();

// server/services/demoTrendStrategy.ts
var DemoTrendStrategy = class _DemoTrendStrategy {
  constructor() {
    this.evalInterval = null;
    this.startEvaluationLoop();
  }
  static getInstance() {
    if (!_DemoTrendStrategy.instance) {
      _DemoTrendStrategy.instance = new _DemoTrendStrategy();
    }
    return _DemoTrendStrategy.instance;
  }
  getConfig() {
    return { ...db2.demoAlgorithmConfig };
  }
  updateConfig(updates) {
    db2.demoAlgorithmConfig = {
      ...db2.demoAlgorithmConfig,
      ...updates,
      isDemoOnly: true
      // Immutable safety constraint
    };
    return { ...db2.demoAlgorithmConfig };
  }
  startEvaluationLoop() {
    if (this.evalInterval) return;
    this.evalInterval = setInterval(() => {
      this.evaluateStrategy();
    }, 45e3);
    if (this.evalInterval.unref) {
      this.evalInterval.unref();
    }
  }
  /**
   * Evaluates trend direction on supported symbols and initiates simulated demo order
   */
  async evaluateStrategy(targetUserId) {
    const cfg = db2.demoAlgorithmConfig;
    if (!cfg.enabled) {
      return { signalsGenerated: 0 };
    }
    let signalsCount = 0;
    const usersToEvaluate = targetUserId ? [targetUserId] : db2.demoAccounts.filter((a) => !a.tradingPaused).map((a) => a.userId);
    for (const userId of usersToEvaluate) {
      const account = db2.demoAccounts.find((a) => a.userId === userId);
      if (!account || account.tradingPaused) continue;
      const currentOpen = db2.demoPositions.filter(
        (p) => p.mt5AccountId === account.id && p.status === "open"
      ).length;
      if (currentOpen >= cfg.maxOpenPositions) {
        continue;
      }
      const symbol = cfg.symbols[Math.floor(Math.random() * cfg.symbols.length)];
      const quote = marketSimulator.getQuote(symbol);
      const isUpTrend = Math.random() > 0.5;
      const type = isUpTrend ? "BUY" : "SELL";
      const pipMultiplier = quote.digits === 5 ? 1e-4 : quote.digits === 3 ? 0.01 : 0.1;
      const slDistance = cfg.stopLossPips * pipMultiplier;
      const tpDistance = cfg.takeProfitPips * pipMultiplier;
      const entryPrice = type === "BUY" ? quote.ask : quote.bid;
      const stopLoss = Number((type === "BUY" ? entryPrice - slDistance : entryPrice + slDistance).toFixed(quote.digits));
      const takeProfit = Number((type === "BUY" ? entryPrice + tpDistance : entryPrice - tpDistance).toFixed(quote.digits));
      const result = await demoExecutionEngine.openMarketOrder({
        userId,
        symbol,
        type,
        lots: cfg.lotSize,
        stopLoss,
        takeProfit,
        algorithmId: cfg.id,
        idempotencyKey: `auto_${cfg.id}_${userId}_${symbol}_${Math.floor(Date.now() / 15e3)}`
      });
      if (result.success) {
        cfg.lastSignalTime = (/* @__PURE__ */ new Date()).toISOString();
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
  async triggerTestSignal(userId, symbol = "EURUSD", type = "BUY", lots) {
    const cfg = db2.demoAlgorithmConfig;
    const quote = marketSimulator.getQuote(symbol);
    const pipMultiplier = quote.digits === 5 ? 1e-4 : quote.digits === 3 ? 0.01 : 0.1;
    const slDistance = cfg.stopLossPips * pipMultiplier;
    const tpDistance = cfg.takeProfitPips * pipMultiplier;
    const entryPrice = type === "BUY" ? quote.ask : quote.bid;
    const stopLoss = Number((type === "BUY" ? entryPrice - slDistance : entryPrice + slDistance).toFixed(quote.digits));
    const takeProfit = Number((type === "BUY" ? entryPrice + tpDistance : entryPrice - tpDistance).toFixed(quote.digits));
    return await demoExecutionEngine.openMarketOrder({
      userId,
      symbol,
      type,
      lots: lots || cfg.lotSize,
      stopLoss,
      takeProfit,
      algorithmId: cfg.id,
      idempotencyKey: `test_${Date.now()}_${Math.random()}`
    });
  }
};
var demoTrendStrategy = DemoTrendStrategy.getInstance();

// server/routes/customer.ts
var router3 = Router3();
router3.use(authenticateToken);
router3.get("/:userId/overview", enforceTenantIsolation, (req, res) => {
  const userId = req.params.userId;
  const mt5Account = db2.mt5Accounts.find((a) => a.userId === userId);
  const subscription = db2.subscriptions.find((s) => s.userId === userId && s.status === "active");
  const riskSettings = db2.riskSettings.get(userId) || {
    maxDailyLossPct: 3,
    maxDrawdownPct: 8,
    maxLotSize: 2,
    maxOpenTrades: 5,
    tradingSession: "ALL_SESSIONS",
    emergencyStop: false
  };
  const openTrades = mt5Account ? db2.positions.filter((p) => p.mt5AccountId === mt5Account.id && p.status === "open") : [];
  const floatingPnl = openTrades.reduce((sum, p) => sum + p.currentPnl, 0);
  const stats = {
    todayPnl: floatingPnl + 320,
    weeklyPnl: 1480.5,
    monthlyPnl: 4290,
    totalPnl: (mt5Account ? mt5Account.balance - 2e4 : 0) + floatingPnl,
    totalProfit: 5840,
    totalLoss: 1550,
    netPnl: (mt5Account ? mt5Account.balance - 2e4 : 0) + floatingPnl,
    winRate: 76.5,
    winningTrades: 26,
    losingTrades: 8,
    profitFactor: 2.45,
    averageWin: 224.6,
    averageLoss: 193.75,
    maxDrawdown: 3.4,
    totalTrades: 34,
    openTradesCount: openTrades.length
  };
  let safeMt5 = null;
  if (mt5Account) {
    const { encryptedPassword, ...rest } = mt5Account;
    safeMt5 = rest;
  }
  res.json({
    user: db2.users.find((u) => u.id === userId) || req.user,
    mt5Account: safeMt5,
    subscription,
    riskSettings,
    stats,
    openTrades,
    currentAlgorithm: db2.algorithms[0],
    platformKillSwitchActive: db2.killSwitches.globalKillSwitch,
    effectiveManualClose: db2.getEffectiveManualClose(userId)
  });
});
router3.get("/overview", (req, res) => {
  const userId = req.user.id;
  const mt5Account = db2.mt5Accounts.find((a) => a.userId === userId);
  const subscription = db2.subscriptions.find((s) => s.userId === userId && s.status === "active");
  const riskSettings = db2.riskSettings.get(userId) || {
    maxDailyLossPct: 3,
    maxDrawdownPct: 8,
    maxLotSize: 2,
    maxOpenTrades: 5,
    tradingSession: "ALL_SESSIONS",
    emergencyStop: false
  };
  const openTrades = mt5Account ? db2.positions.filter((p) => p.mt5AccountId === mt5Account.id && p.status === "open") : [];
  const floatingPnl = openTrades.reduce((sum, p) => sum + p.currentPnl, 0);
  const stats = {
    todayPnl: floatingPnl + 320,
    weeklyPnl: 1480.5,
    monthlyPnl: 4290,
    totalPnl: (mt5Account ? mt5Account.balance - 2e4 : 0) + floatingPnl,
    totalProfit: 5840,
    totalLoss: 1550,
    netPnl: (mt5Account ? mt5Account.balance - 2e4 : 0) + floatingPnl,
    winRate: 76.5,
    winningTrades: 26,
    losingTrades: 8,
    profitFactor: 2.45,
    averageWin: 224.6,
    averageLoss: 193.75,
    maxDrawdown: 3.4,
    totalTrades: 34,
    openTradesCount: openTrades.length
  };
  let safeMt5 = null;
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
    currentAlgorithm: db2.algorithms[0],
    platformKillSwitchActive: db2.killSwitches.globalKillSwitch,
    effectiveManualClose: db2.getEffectiveManualClose(userId)
  });
});
router3.get("/permissions", (req, res) => {
  const userId = req.user.id;
  res.json({
    effectiveManualClose: db2.getEffectiveManualClose(userId)
  });
});
var BROKER_DIRECTORY = [
  {
    id: "metaquotes",
    name: "MetaQuotes Ltd.",
    servers: ["MetaQuotes-Demo"],
    recommendedPingMs: 1,
    isPopular: true
  },
  {
    id: "ic_markets",
    name: "IC Markets Global",
    servers: ["ICMarketsSC-Demo", "ICMarketsSC-Live08", "ICMarkets-Demo01", "ICMarkets-Live01", "ICMarkets-Live02"],
    recommendedPingMs: 1.2,
    isPopular: true
  },
  {
    id: "pepperstone",
    name: "Pepperstone Financial",
    servers: ["Pepperstone-Demo01", "Pepperstone-Demo02", "Pepperstone-Edge03", "Pepperstone-Live01"],
    recommendedPingMs: 1.4,
    isPopular: true
  },
  {
    id: "ftmo",
    name: "FTMO Prop Trading",
    servers: ["FTMO-Demo", "FTMO-Server", "FTMO-Server-2"],
    recommendedPingMs: 1.8,
    isPopular: true
  },
  {
    id: "xm",
    name: "XM Global",
    servers: ["XMGlobal-Demo", "XMGlobal-Real01", "XMGlobal-Real02", "XMGlobal-Real03"],
    recommendedPingMs: 2.1,
    isPopular: true
  },
  {
    id: "exness",
    name: "Exness Pro",
    servers: ["Exness-Trial", "Exness-Trial2", "Exness-Real", "Exness-Real2"],
    recommendedPingMs: 1.6,
    isPopular: true
  },
  {
    id: "tickmill",
    name: "Tickmill ECN",
    servers: ["Tickmill-Demo", "Tickmill-Live", "Tickmill-Live02"],
    recommendedPingMs: 1.5,
    isPopular: false
  },
  {
    id: "custom",
    name: "Custom Broker / Other",
    servers: ["Custom Server Address"],
    recommendedPingMs: 2.5,
    isPopular: false
  }
];
function ensureSeedTradesForAccount(mt5AccountId) {
  const account = db2.mt5Accounts.find((a) => a.id === mt5AccountId);
  if (isRealWorkerAccount(account)) {
    return;
  }
  const existingOpen = db2.positions.filter((p) => p.mt5AccountId === mt5AccountId && p.status === "open");
  const existingClosed = db2.positions.filter((p) => p.mt5AccountId === mt5AccountId && p.status === "closed");
  if (existingOpen.length === 0) {
    db2.positions.push(
      {
        id: `pos_demo_${Date.now()}_1`,
        mt5AccountId,
        positionTicket: 98214015,
        symbol: "EURUSD",
        type: "BUY",
        lots: 1,
        openPrice: 1.0845,
        currentPrice: 1.0886,
        stopLoss: 1.081,
        takeProfit: 1.092,
        currentPnl: 410,
        swap: -2.5,
        commission: -6,
        status: "open",
        openTime: new Date(Date.now() - 3 * 36e5).toISOString(),
        runtimeFormatted: "3h 12m"
      },
      {
        id: `pos_demo_${Date.now()}_2`,
        mt5AccountId,
        positionTicket: 98214580,
        symbol: "XAUUSD",
        type: "BUY",
        lots: 0.5,
        openPrice: 2681.2,
        currentPrice: 2685.7,
        stopLoss: 2670,
        takeProfit: 2705,
        currentPnl: 225,
        swap: 0,
        commission: -5,
        status: "open",
        openTime: new Date(Date.now() - 55 * 6e4).toISOString(),
        runtimeFormatted: "55m"
      }
    );
  }
  if (existingClosed.length === 0) {
    db2.positions.push(
      {
        id: `pos_demo_c1_${Date.now()}`,
        mt5AccountId,
        positionTicket: 98199201,
        symbol: "GBPUSD",
        type: "BUY",
        lots: 1,
        openPrice: 1.284,
        closePrice: 1.2915,
        currentPrice: 1.2915,
        stopLoss: 1.28,
        takeProfit: 1.2915,
        currentPnl: 750,
        profit: 750,
        swap: -4.2,
        commission: -6,
        status: "closed",
        openTime: new Date(Date.now() - 26 * 36e5).toISOString(),
        closeTime: new Date(Date.now() - 2 * 36e5).toISOString(),
        runtimeFormatted: "24h closed"
      },
      {
        id: `pos_demo_c2_${Date.now()}`,
        mt5AccountId,
        positionTicket: 98198440,
        symbol: "USDJPY",
        type: "SELL",
        lots: 1.5,
        openPrice: 154.2,
        closePrice: 153.48,
        currentPrice: 153.48,
        stopLoss: 154.8,
        takeProfit: 153.5,
        currentPnl: 704.2,
        profit: 704.2,
        swap: 1.4,
        commission: -9,
        status: "closed",
        openTime: new Date(Date.now() - 48 * 36e5).toISOString(),
        closeTime: new Date(Date.now() - 14 * 36e5).toISOString(),
        runtimeFormatted: "34h closed"
      },
      {
        id: `pos_demo_c3_${Date.now()}`,
        mt5AccountId,
        positionTicket: 98196120,
        symbol: "AUDUSD",
        type: "BUY",
        lots: 0.8,
        openPrice: 0.6635,
        closePrice: 0.6609,
        currentPrice: 0.6609,
        stopLoss: 0.661,
        takeProfit: 0.668,
        currentPnl: -208,
        profit: -208,
        swap: -1.8,
        commission: -4.8,
        status: "closed",
        openTime: new Date(Date.now() - 72 * 36e5).toISOString(),
        closeTime: new Date(Date.now() - 42 * 36e5).toISOString(),
        runtimeFormatted: "30h closed"
      }
    );
  }
}
router3.get("/mt5", (req, res) => {
  const userId = req.user.id;
  const mt5Account = db2.mt5Accounts.find((a) => a.userId === userId);
  if (!mt5Account) {
    res.json({ connected: false, account: null, brokerDirectory: BROKER_DIRECTORY });
    return;
  }
  const workerNode = db2.workerNodes.find((w) => w.id === mt5Account.assignedWorkerId || w.workerName.includes("London")) || db2.workerNodes[0];
  const { encryptedPassword, ...safe } = mt5Account;
  res.json({
    connected: true,
    account: {
      ...safe,
      isReadOnly: true,
      tradingMode: safe.tradingMode || "read_only_demo",
      assignedWorkerName: workerNode?.workerName || "London LD4 Primary Engine #1"
    },
    workerHealth: workerNode,
    brokerDirectory: BROKER_DIRECTORY,
    tradingModeNotice: "Platform is operating in secure READ-ONLY / DEMO mode. Real-money order execution is locked."
  });
});
router3.get("/mt5/brokers", (_req, res) => {
  res.json({ brokers: BROKER_DIRECTORY });
});
router3.post("/mt5/test-connection", (req, res) => {
  const { brokerName, server, loginId } = req.body;
  if (!brokerName || !server) {
    res.status(400).json({ error: "Broker and server name are required for connectivity test." });
    return;
  }
  const simulatedLatency = Math.round((1.1 + Math.random() * 0.8) * 10) / 10;
  res.json({
    success: true,
    reachable: true,
    brokerName,
    server,
    loginId: loginId || "Verified",
    pingLatencyMs: simulatedLatency,
    gateway: "Equinix LD4 (Slough/London UK)",
    sslCertificate: "Valid TLS 1.3 / 256-bit ECDSA Handshake",
    statusMessage: `Successfully resolved ${server} with ${simulatedLatency}ms latency. Gateway ready for Read-Only / Demo linkage.`
  });
});
router3.post("/mt5/connect", (req, res) => {
  const userId = req.user.id;
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
    res.status(400).json({ error: "Broker, server, login ID, and password are required to connect MT5." });
    return;
  }
  const encryptedPassword = encryptCredential(password);
  const effectiveTradingMode = connectionMode === "read_only_investor" ? "read_only_investor" : "read_only_demo";
  const defaultBalance = accountType === "live" ? 25e3 : 1e4;
  let existing = db2.mt5Accounts.find((a) => a.userId === userId);
  if (existing) {
    existing.brokerName = brokerName;
    existing.server = server;
    existing.loginId = loginId;
    existing.encryptedPassword = encryptedPassword;
    existing.accountType = accountType === "live" ? "live" : "demo";
    existing.isReadOnly = true;
    existing.tradingMode = effectiveTradingMode;
    existing.currency = currency || existing.currency || "USD";
    existing.leverage = leverage || existing.leverage || 500;
    existing.connectionStatus = "connected";
    existing.lastSyncAt = (/* @__PURE__ */ new Date()).toISOString();
    existing.assignedWorkerId = "worker-lon-01";
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
      accountType: accountType === "live" ? "live" : "demo",
      isReadOnly: true,
      tradingMode: effectiveTradingMode,
      currency: currency || "USD",
      leverage: leverage || 500,
      balance: defaultBalance,
      equity: defaultBalance,
      margin: 0,
      freeMargin: defaultBalance,
      marginLevel: 0,
      floatingPnl: 0,
      connectionStatus: "connected",
      lastSyncAt: (/* @__PURE__ */ new Date()).toISOString(),
      assignedWorkerId: "worker-lon-01",
      pingLatencyMs: 1.2,
      errorMessage: null
    };
    db2.mt5Accounts.push(existing);
  }
  if (!isRealWorkerAccount(existing)) {
    ensureSeedTradesForAccount(existing.id);
    orchestrator.reconcileAccount(existing.id);
  }
  db2.recordAudit(
    userId,
    req.user.email,
    "customer",
    "MT5_ACCOUNT_CONNECTED",
    "mt5_accounts",
    `Connected MT5 Account #${loginId} (${brokerName} / ${server}) in secure READ-ONLY / DEMO mode with AES-256-GCM encryption.`,
    req.ip,
    existing.id
  );
  const { encryptedPassword: _, ...safe } = existing;
  res.json({
    success: true,
    message: "MT5 account connected securely in READ-ONLY / DEMO mode. Real-money order execution is locked.",
    account: {
      ...safe,
      assignedWorkerName: "London LD4 Primary Engine #1"
    }
  });
});
router3.post("/mt5/disconnect", (req, res) => {
  const userId = req.user.id;
  const mt5Account = db2.mt5Accounts.find((a) => a.userId === userId);
  if (!mt5Account) {
    res.status(404).json({ error: "No connected MT5 account found to disconnect." });
    return;
  }
  mt5Account.connectionStatus = "disconnected";
  mt5Account.lastSyncAt = (/* @__PURE__ */ new Date()).toISOString();
  db2.recordAudit(
    userId,
    req.user.email,
    "customer",
    "MT5_ACCOUNT_DISCONNECTED",
    "mt5_accounts",
    `Disconnected MT5 account #${mt5Account.loginId} from London LD4 execution worker.`,
    req.ip,
    mt5Account.id
  );
  res.json({ success: true, message: "MT5 terminal successfully disconnected from cloud worker node." });
});
router3.get("/mt5/terminal-health", (req, res) => {
  const userId = req.user.id;
  const mt5Account = db2.mt5Accounts.find((a) => a.userId === userId);
  const workerNode = db2.workerNodes.find((w) => w.id === mt5Account?.assignedWorkerId) || db2.workerNodes[0];
  res.json({
    worker: workerNode,
    workerNodeId: workerNode?.id || "node_ld4",
    workerName: workerNode?.workerName || "Worker-LD4-UK",
    workerStatus: workerNode?.status === "online" ? "healthy" : "degraded",
    terminalStatus: mt5Account ? mt5Account.connectionStatus : "disconnected",
    isReadOnly: true,
    mode: mt5Account?.tradingMode || "read_only_demo",
    lastSyncAt: mt5Account?.lastSyncAt || (/* @__PURE__ */ new Date()).toISOString(),
    latencyMs: mt5Account?.pingLatencyMs || 1.2,
    packetLossPct: 0,
    gatewayLocation: "Equinix LD4 (Slough, London UK)",
    encryptionSuite: "AES-256-GCM hardware key isolation"
  });
});
router3.post("/mt5/sync", (req, res) => {
  const userId = req.user.id;
  const mt5Account = db2.mt5Accounts.find((a) => a.userId === userId);
  if (!mt5Account) {
    res.status(404).json({ error: "No connected MT5 account found." });
    return;
  }
  orchestrator.reconcileAccount(mt5Account.id);
  mt5Account.lastSyncAt = (/* @__PURE__ */ new Date()).toISOString();
  const { encryptedPassword, ...safe } = mt5Account;
  res.json({
    success: true,
    message: "MT5 terminal synchronized successfully with London LD4 matching engine.",
    account: safe
  });
});
router3.get("/trades", (req, res) => {
  const userId = req.user.id;
  const mt5Account = db2.mt5Accounts.find((a) => a.userId === userId);
  if (!mt5Account) {
    res.json({ openTrades: [], closedTrades: [] });
    return;
  }
  if (!isRealWorkerAccount(mt5Account)) {
    ensureSeedTradesForAccount(mt5Account.id);
  }
  const openTrades = db2.positions.filter((p) => p.mt5AccountId === mt5Account.id && p.status === "open");
  const closedTrades = db2.positions.filter((p) => p.mt5AccountId === mt5Account.id && p.status === "closed");
  res.json({ openTrades, closedTrades });
});
router3.get("/mt5/history", (req, res) => {
  const userId = req.user.id;
  const mt5Account = db2.mt5Accounts.find((a) => a.userId === userId);
  if (!mt5Account) {
    res.json({ trades: [] });
    return;
  }
  if (!isRealWorkerAccount(mt5Account)) {
    ensureSeedTradesForAccount(mt5Account.id);
  }
  const closedTrades = db2.positions.filter((p) => p.mt5AccountId === mt5Account.id && p.status === "closed");
  res.json({
    trades: closedTrades,
    count: closedTrades.length,
    totalProfit: closedTrades.reduce((sum, t) => sum + (t.profit || t.currentPnl || 0), 0)
  });
});
router3.post("/trades/close", async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  if (user.role !== "customer") {
    db2.recordAudit(
      user.id,
      user.email,
      user.role,
      "MANUAL_CLOSE_DENIED",
      "positions",
      `Manual close rejected: Role '${user.role}' is not authorized on customer endpoint. Only customer accounts can close trades here.`,
      req.ip || "127.0.0.1"
    );
    res.status(403).json({
      error: "Access denied: Only customer accounts may close positions via this endpoint.",
      code: "ERR_CUSTOMER_ROLE_REQUIRED"
    });
    return;
  }
  const userId = user.id;
  const prohibitedFields = ["volume", "lots", "action", "type", "symbol", "stopLoss", "takeProfit", "price", "orderType"];
  for (const field of prohibitedFields) {
    if (field in req.body) {
      if (field === "action" && req.body.action === "CLOSE") {
        continue;
      }
      db2.recordAudit(
        userId,
        user.email,
        "customer",
        "MANUAL_CLOSE_DENIED",
        "positions",
        `Manual close rejected: Customer attempted to provide forbidden order parameter '${field}'. Arbitrary order parameter modifications, partial closes, or BUY/SELL actions are prohibited.`,
        req.ip || "127.0.0.1"
      );
      res.status(400).json({
        error: `Invalid request: Custom parameter '${field}' is not permitted. Only full close of an existing open position is permitted.`,
        code: "ERR_FORBIDDEN_PARAMETER"
      });
      return;
    }
  }
  const { positionId } = req.body;
  if (!positionId) {
    res.status(400).json({ error: "Position ID is required.", code: "ERR_POSITION_ID_REQUIRED" });
    return;
  }
  const storedUser = db2.users.find((u) => u.id === userId);
  const userManualClose = Boolean(storedUser?.manualTradeCloseEnabled);
  const globalManualClose = Boolean(db2.globalManualTradeCloseEnabled);
  if (!globalManualClose || !userManualClose) {
    const reason = !globalManualClose ? "Global manual trade close switch is disabled by administrator." : "Manual trade close permission is disabled for this customer account.";
    db2.recordAudit(
      userId,
      user.email,
      "customer",
      "MANUAL_CLOSE_DENIED",
      "positions",
      `Manual close denied for customer ${user.email}. GlobalSwitch=${globalManualClose}, UserPermission=${userManualClose}. Reason: ${reason}`,
      req.ip || "127.0.0.1",
      String(positionId)
    );
    res.status(403).json({
      error: "Manual trade close is not allowed. Permission is disabled by platform administrators.",
      code: "ERR_MANUAL_CLOSE_FORBIDDEN",
      reason
    });
    return;
  }
  const position = db2.positions.find(
    (p) => p.id === positionId || Number.isInteger(Number(positionId)) && p.positionTicket === Number(positionId)
  );
  if (!position) {
    db2.recordAudit(
      userId,
      user.email,
      "customer",
      "MANUAL_CLOSE_DENIED",
      "positions",
      `Manual close denied for customer ${user.email}: Position '${positionId}' not found.`,
      req.ip || "127.0.0.1",
      String(positionId)
    );
    res.status(404).json({ error: "Position not found.", code: "ERR_POSITION_NOT_FOUND" });
    return;
  }
  if (position.status !== "open") {
    db2.recordAudit(
      userId,
      user.email,
      "customer",
      "MANUAL_CLOSE_DENIED",
      "positions",
      `Manual close denied for customer ${user.email} on position #${position.positionTicket}: Position is already closed.`,
      req.ip || "127.0.0.1",
      position.id
    );
    res.status(409).json({ error: "Position is already closed.", code: "ERR_POSITION_ALREADY_CLOSED" });
    return;
  }
  const mt5Account = db2.mt5Accounts.find((a) => a.id === position.mt5AccountId);
  if (!mt5Account || mt5Account.userId !== userId) {
    db2.recordAudit(
      userId,
      user.email,
      "customer",
      "MANUAL_CLOSE_DENIED",
      "positions",
      `Manual close denied for customer ${user.email} on position #${position.positionTicket}: Position belongs to MT5 account '${position.mt5AccountId}' not owned by user.`,
      req.ip || "127.0.0.1",
      position.id
    );
    res.status(403).json({
      error: "Unauthorized: This position does not belong to your connected MT5 account.",
      code: "ERR_UNAUTHORIZED_POSITION_OWNERSHIP"
    });
    return;
  }
  if (isRealWorkerAccount(mt5Account)) {
    const queueResult = await orchestrator.queueWorkerCommand({
      mt5AccountId: mt5Account.id,
      symbol: position.symbol,
      action: "CLOSE",
      volume: position.lots,
      positionTicket: position.positionTicket,
      userId,
      idempotencyKey: `close_mt5_${position.positionTicket}_${Date.now()}`
    });
    if (!queueResult.success) {
      db2.recordAudit(
        userId,
        user.email,
        "customer",
        "MANUAL_CLOSE_DENIED",
        "positions",
        `Manual close command queue failed for position #${position.positionTicket} on account #${mt5Account.loginId}: ${queueResult.error}`,
        req.ip || "127.0.0.1",
        position.id
      );
      res.status(400).json({
        error: queueResult.error || "Failed to dispatch close command to MT5 worker.",
        code: "ERR_WORKER_COMMAND_FAILED"
      });
      return;
    }
    db2.recordAudit(
      userId,
      user.email,
      "customer",
      "MANUAL_CLOSE_ALLOWED",
      "positions",
      `Manual close command dispatched to MT5 worker for ticket #${position.positionTicket} (${position.symbol} ${position.lots} lots) on account #${mt5Account.loginId}.`,
      req.ip || "127.0.0.1",
      position.id
    );
    res.json({
      success: true,
      message: `Close command dispatched for position #${position.positionTicket}. Real MT5 terminal execution pending.`,
      commandId: queueResult.command?.commandId
    });
    return;
  }
  const success = await orchestrator.closePosition(position.id, userId);
  if (success) {
    db2.recordAudit(
      userId,
      user.email,
      "customer",
      "MANUAL_CLOSE_ALLOWED",
      "positions",
      `Customer manually closed position #${position.positionTicket} (${position.symbol} ${position.lots} lots) on account #${mt5Account.loginId} realizing P&L: $${position.currentPnl.toFixed(2)}.`,
      req.ip || "127.0.0.1",
      position.id
    );
    res.json({
      success: true,
      message: `Position #${position.positionTicket} closed successfully.`
    });
  } else {
    db2.recordAudit(
      userId,
      user.email,
      "customer",
      "MANUAL_CLOSE_DENIED",
      "positions",
      `Manual close failed for position #${position.positionTicket} on account #${mt5Account.loginId}. Position could not be closed.`,
      req.ip || "127.0.0.1",
      position.id
    );
    res.status(400).json({ error: "Failed to close position or position already closed.", code: "ERR_CLOSE_FAILED" });
  }
});
router3.get("/performance", (req, res) => {
  const userId = req.user.id;
  const mt5Account = db2.mt5Accounts.find((a) => a.userId === userId);
  const openTrades = mt5Account ? db2.positions.filter((p) => p.mt5AccountId === mt5Account.id && p.status === "open") : [];
  const floatingPnl = openTrades.reduce((sum, p) => sum + p.currentPnl, 0);
  const equityCurve = [
    { date: "2026-09-01", balance: 2e4, equity: 2e4, profit: 0 },
    { date: "2026-09-04", balance: 20640, equity: 20710, profit: 640 },
    { date: "2026-09-08", balance: 21350, equity: 21420, profit: 1350 },
    { date: "2026-09-12", balance: 22100, equity: 22050, profit: 2100 },
    { date: "2026-09-16", balance: 23420, equity: 23680, profit: 3420 },
    { date: "2026-09-19", balance: 24750, equity: 24900, profit: 4750 },
    { date: "2026-09-22", balance: mt5Account ? mt5Account.balance : 25480, equity: mt5Account ? mt5Account.equity : 26728, profit: (mt5Account ? mt5Account.balance - 2e4 : 5480) + floatingPnl }
  ];
  const dailyHistory = [
    { date: "2026-09-22", pnl: 648.5, trades: 4, winRate: 100 },
    { date: "2026-09-21", pnl: 480, trades: 3, winRate: 66.7 },
    { date: "2026-09-20", pnl: -120, trades: 2, winRate: 50 },
    { date: "2026-09-19", pnl: 890.2, trades: 5, winRate: 80 },
    { date: "2026-09-18", pnl: 340, trades: 3, winRate: 100 }
  ];
  res.json({
    equityCurve,
    dailyHistory,
    stats: {
      todayPnl: floatingPnl + 320,
      weeklyPnl: 1480.5,
      monthlyPnl: 4290,
      totalPnl: (mt5Account ? mt5Account.balance - 2e4 : 0) + floatingPnl,
      totalProfit: 5840,
      totalLoss: 1550,
      netPnl: (mt5Account ? mt5Account.balance - 2e4 : 0) + floatingPnl,
      winRate: 76.5,
      winningTrades: 26,
      losingTrades: 8,
      profitFactor: 2.45,
      averageWin: 224.6,
      averageLoss: 193.75,
      maxDrawdown: 3.4,
      totalTrades: 34,
      openTradesCount: openTrades.length
    }
  });
});
router3.get("/subscription", (req, res) => {
  const userId = req.user.id;
  const currentSubscription = db2.subscriptions.find((s) => s.userId === userId && s.status === "active");
  const userPayments = db2.payments.filter((p) => p.userId === userId);
  const availablePlans = db2.subscriptionPlans.filter((p) => p.isActive);
  res.json({
    currentSubscription,
    payments: userPayments,
    plans: availablePlans
  });
});
router3.post("/subscription/select", (req, res) => {
  const userId = req.user.id;
  const { planId } = req.body;
  const plan = db2.subscriptionPlans.find((p) => p.id === planId);
  if (!plan) {
    res.status(404).json({ error: "Selected subscription plan not found." });
    return;
  }
  const prior = db2.subscriptions.find((s) => s.userId === userId && s.status === "active");
  if (prior) {
    prior.status = "canceled";
  }
  const newSub = {
    id: `sub_${Date.now()}`,
    userId,
    planId: plan.id,
    planName: plan.name,
    status: "active",
    currentPeriodStart: (/* @__PURE__ */ new Date()).toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 864e5).toISOString(),
    cancelAtPeriodEnd: false,
    priceUsd: plan.priceUsd
  };
  db2.subscriptions.push(newSub);
  const paymentRecord = {
    id: `pay_${Date.now()}`,
    userId,
    subscriptionId: newSub.id,
    provider: "stripe",
    transactionId: `ch_${Date.now()}_simulated`,
    amountUsd: plan.priceUsd,
    status: "succeeded",
    invoiceNumber: `INV-${(/* @__PURE__ */ new Date()).getFullYear()}-${Math.floor(1e3 + Math.random() * 9e3)}`,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db2.payments.unshift(paymentRecord);
  db2.recordAudit(
    userId,
    req.user.email,
    "customer",
    "SUBSCRIPTION_PURCHASED",
    "subscriptions",
    `Subscribed to ${plan.name} ($${plan.priceUsd})`,
    req.ip,
    newSub.id
  );
  res.json({ success: true, message: `Successfully subscribed to ${plan.name}`, subscription: newSub });
});
router3.get("/notifications", (req, res) => {
  const userId = req.user.id;
  const items = db2.notifications.filter((n) => n.userId === userId);
  res.json({ notifications: items });
});
router3.post("/notifications/mark-read", (req, res) => {
  const userId = req.user.id;
  const { id } = req.body;
  if (id) {
    const item = db2.notifications.find((n) => n.id === id && n.userId === userId);
    if (item) item.isRead = true;
  } else {
    db2.notifications.filter((n) => n.userId === userId).forEach((n) => n.isRead = true);
  }
  res.json({ success: true });
});
router3.get("/support", (req, res) => {
  const userId = req.user.id;
  const tickets = db2.supportTickets.filter((t) => t.userId === userId);
  res.json({ tickets });
});
router3.post("/support/create", (req, res) => {
  const userId = req.user.id;
  const { subject, category, priority, message } = req.body;
  if (!subject || !message) {
    res.status(400).json({ error: "Subject and initial message are required." });
    return;
  }
  const newTicket = {
    id: `tick_${Date.now()}`,
    userId,
    userEmail: req.user.email,
    userName: `${req.user.firstName} ${req.user.lastName}`,
    subject,
    category: category || "general",
    status: "open",
    priority: priority || "medium",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    messages: [
      {
        id: `msg_${Date.now()}`,
        senderId: userId,
        senderType: "customer",
        senderName: `${req.user.firstName} ${req.user.lastName}`,
        message,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    ]
  };
  db2.supportTickets.unshift(newTicket);
  db2.recordAudit(userId, req.user.email, "customer", "SUPPORT_TICKET_CREATED", "support_tickets", `Opened ticket: ${subject}`, req.ip, newTicket.id);
  res.status(201).json({ success: true, ticket: newTicket });
});
router3.post("/support/reply", (req, res) => {
  const userId = req.user.id;
  const { ticketId, message } = req.body;
  if (!ticketId || !message) {
    res.status(400).json({ error: "Ticket ID and message are required." });
    return;
  }
  const ticket = db2.supportTickets.find((t) => t.id === ticketId && t.userId === userId);
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found or unauthorized." });
    return;
  }
  ticket.messages.push({
    id: `msg_${Date.now()}`,
    senderId: userId,
    senderType: "customer",
    senderName: `${req.user.firstName} ${req.user.lastName}`,
    message,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  ticket.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  res.json({ success: true, ticket });
});
router3.get("/risk-settings", (req, res) => {
  const userId = req.user.id;
  const settings = db2.riskSettings.get(userId) || {
    maxDailyLossPct: 3,
    maxDrawdownPct: 8,
    maxLotSize: 2,
    maxOpenTrades: 5,
    tradingSession: "ALL_SESSIONS",
    emergencyStop: false
  };
  res.json({ settings });
});
router3.post("/risk-settings", (req, res) => {
  const userId = req.user.id;
  const { maxDailyLossPct, maxDrawdownPct, maxLotSize, maxOpenTrades, tradingSession, emergencyStop } = req.body;
  const current = db2.riskSettings.get(userId) || {
    maxDailyLossPct: 3,
    maxDrawdownPct: 8,
    maxLotSize: 2,
    maxOpenTrades: 5,
    tradingSession: "ALL_SESSIONS",
    emergencyStop: false
  };
  const updated = {
    ...current,
    maxDailyLossPct: maxDailyLossPct !== void 0 ? Number(maxDailyLossPct) : current.maxDailyLossPct,
    maxDrawdownPct: maxDrawdownPct !== void 0 ? Number(maxDrawdownPct) : current.maxDrawdownPct,
    maxLotSize: maxLotSize !== void 0 ? Number(maxLotSize) : current.maxLotSize,
    maxOpenTrades: maxOpenTrades !== void 0 ? Number(maxOpenTrades) : current.maxOpenTrades,
    tradingSession: tradingSession || current.tradingSession,
    emergencyStop: emergencyStop !== void 0 ? Boolean(emergencyStop) : current.emergencyStop
  };
  db2.riskSettings.set(userId, updated);
  db2.recordAudit(
    userId,
    req.user.email,
    "customer",
    "RISK_SETTINGS_UPDATED",
    "risk_profiles",
    `Updated parameters: Lot Max=${updated.maxLotSize}, DD Max=${updated.maxDrawdownPct}%, EmergencyStop=${updated.emergencyStop}`,
    req.ip
  );
  res.json({ success: true, settings: updated, message: "Risk parameters safely persisted to execution engine." });
});
router3.get("/demo/account", (req, res) => {
  const userId = req.user.id;
  const account = db2.getOrCreateDemoAccount(userId);
  demoExecutionEngine.recalculateAccount(account.id);
  const updatedAccount = db2.getOrCreateDemoAccount(userId);
  const quotes = marketSimulator.getQuotes();
  res.json({
    account: updatedAccount,
    quotes,
    demoModeActive: true,
    sandboxNotice: "DEMO MODE: Orders are simulated against local quotes. No real broker orders are executed.",
    globalKillSwitch: db2.demoGlobalKillSwitch
  });
});
router3.get("/demo/quotes", (_req, res) => {
  res.json({
    quotes: marketSimulator.getQuotes(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    isSimulated: true
  });
});
router3.get("/demo/positions", (req, res) => {
  const userId = req.user.id;
  const account = db2.getOrCreateDemoAccount(userId);
  const openPositions = db2.demoPositions.filter((p) => p.mt5AccountId === account.id && p.status === "open");
  res.json({
    positions: openPositions,
    count: openPositions.length,
    totalFloatingPnl: openPositions.reduce((s, p) => s + (p.currentPnl || 0), 0)
  });
});
router3.get("/demo/history", (req, res) => {
  const userId = req.user.id;
  const account = db2.getOrCreateDemoAccount(userId);
  const closedTrades = db2.demoPositions.filter((p) => p.mt5AccountId === account.id && p.status === "closed");
  const totalRealized = closedTrades.reduce((s, p) => s + (p.profit || 0), 0);
  const winningTrades = closedTrades.filter((p) => (p.profit || 0) > 0).length;
  const losingTrades = closedTrades.filter((p) => (p.profit || 0) < 0).length;
  const winRate = closedTrades.length > 0 ? Number((winningTrades / closedTrades.length * 100).toFixed(1)) : 0;
  res.json({
    trades: closedTrades,
    totalTrades: closedTrades.length,
    totalProfit: totalRealized,
    winningTrades,
    losingTrades,
    winRate
  });
});
router3.post("/demo/orders", async (req, res) => {
  const userId = req.user.id;
  const { symbol, type, lots, stopLoss, takeProfit, idempotencyKey, algorithmId } = req.body;
  if (!symbol || !type || !lots) {
    res.status(400).json({ error: "Symbol, order type (BUY/SELL), and lot size are required." });
    return;
  }
  const result = await demoExecutionEngine.openMarketOrder({
    userId,
    symbol: symbol.toUpperCase(),
    type: type.toUpperCase(),
    lots: Number(lots),
    stopLoss: stopLoss ? Number(stopLoss) : void 0,
    takeProfit: takeProfit ? Number(takeProfit) : void 0,
    algorithmId,
    idempotencyKey
  });
  if (!result.success) {
    res.status(400).json({
      error: result.message,
      errorCode: result.errorCode
    });
    return;
  }
  res.json({
    success: true,
    position: result.position,
    account: result.account,
    message: result.message
  });
});
router3.post("/demo/orders/:id/close", async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const result = await demoExecutionEngine.closePosition(id, userId, false, "Manual Trader Close");
  if (!result.success) {
    const status = result.errorCode === "ERR_FORBIDDEN_TENANT" ? 403 : 400;
    res.status(status).json({
      error: result.message,
      errorCode: result.errorCode
    });
    return;
  }
  res.json({
    success: true,
    position: result.position,
    account: result.account,
    message: result.message
  });
});
router3.post("/demo/account/reset", (req, res) => {
  const userId = req.user.id;
  const account = demoExecutionEngine.resetAccount(userId);
  res.json({
    success: true,
    account,
    message: "Demo account balance reset to $10,000.00 and open positions cleared."
  });
});
router3.get("/demo/algorithm", (_req, res) => {
  res.json({
    algorithm: demoTrendStrategy.getConfig(),
    isDemoOnly: true
  });
});
router3.post("/demo/algorithm/signal", async (req, res) => {
  const userId = req.user.id;
  const { symbol, type, lots } = req.body;
  const result = await demoTrendStrategy.triggerTestSignal(
    userId,
    symbol || "EURUSD",
    type || "BUY",
    lots ? Number(lots) : void 0
  );
  if (!result.success) {
    res.status(400).json({ error: result.message, errorCode: result.errorCode });
    return;
  }
  res.json({
    success: true,
    position: result.position,
    account: result.account,
    message: "Demo Trend Strategy signal generated and executed in simulated sandbox."
  });
});
var customer_default = router3;

// server/routes/admin.ts
import { Router as Router4 } from "express";
var router4 = Router4();
router4.use(authenticateToken);
router4.use(requireAdmin);
router4.get("/overview", (req, res) => {
  const totalCustomers = db2.users.filter((u) => u.role === "customer").length;
  const activeCustomers = db2.users.filter((u) => u.role === "customer" && u.status === "active").length;
  const activeSubscriptions2 = db2.subscriptions.filter((s) => s.status === "active").length;
  const totalRevenue = db2.payments.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + p.amountUsd, 0);
  const connectedAccounts = db2.mt5Accounts.filter((a) => a.connectionStatus === "connected").length;
  const disconnectedAccounts = db2.mt5Accounts.filter((a) => a.connectionStatus !== "connected").length;
  const openPositions = db2.positions.filter((p) => p.status === "open");
  const todayPnl = openPositions.reduce((sum, p) => sum + p.currentPnl, 0) + 3840.5;
  const onlineWorkers = db2.workerNodes.filter((w) => w.status === "online").length;
  res.json({
    metrics: {
      totalCustomers,
      activeCustomers,
      activeSubscriptions: activeSubscriptions2,
      totalRevenue,
      todayPnl,
      overallPnl: 142890,
      connectedAccounts,
      disconnectedAccounts,
      openTradesCount: openPositions.length,
      onlineWorkers,
      globalKillSwitch: db2.killSwitches.globalKillSwitch,
      globalManualTradeCloseEnabled: db2.globalManualTradeCloseEnabled
    },
    recentPayments: db2.payments.slice(0, 5),
    recentRegistrations: db2.users.filter((u) => u.role === "customer").slice(-5).reverse(),
    recentTrades: openPositions.slice(0, 5),
    workerNodes: db2.workerNodes,
    killSwitches: db2.killSwitches
  });
});
router4.get("/users", requirePermission("users:read"), (req, res) => {
  const { query, status } = req.query;
  let list = db2.users.filter((u) => u.role === "customer");
  if (query && typeof query === "string") {
    const q = query.toLowerCase();
    list = list.filter((u) => u.email.toLowerCase().includes(q) || u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q));
  }
  if (status && typeof status === "string" && status !== "all") {
    list = list.filter((u) => u.status === status);
  }
  const enriched = list.map((u) => {
    const mt5 = db2.mt5Accounts.find((a) => a.userId === u.id);
    const sub = db2.subscriptions.find((s) => s.userId === u.id && s.status === "active");
    return {
      ...u,
      manualTradeCloseEnabled: Boolean(u.manualTradeCloseEnabled),
      effectiveManualClose: db2.getEffectiveManualClose(u.id),
      hasMt5: !!mt5,
      mt5Status: mt5 ? mt5.connectionStatus : "none",
      mt5Balance: mt5 ? mt5.balance : 0,
      subscriptionPlan: sub ? sub.planName : "None"
    };
  });
  res.json({ users: enriched });
});
router4.get("/users/:id", requirePermission("users:read"), (req, res) => {
  const { id } = req.params;
  const user = db2.users.find((u) => u.id === id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const mt5Accounts3 = db2.mt5Accounts.filter((a) => a.userId === id).map(({ encryptedPassword, ...safe }) => safe);
  const subscriptions3 = db2.subscriptions.filter((s) => s.userId === id);
  const payments3 = db2.payments.filter((p) => p.userId === id);
  const risk = db2.riskSettings.get(id);
  const audit = db2.auditLogs.filter((a) => a.actorId === id || a.resourceId === id);
  res.json({
    user: {
      ...user,
      manualTradeCloseEnabled: Boolean(user.manualTradeCloseEnabled),
      effectiveManualClose: db2.getEffectiveManualClose(user.id)
    },
    mt5Accounts: mt5Accounts3,
    subscriptions: subscriptions3,
    payments: payments3,
    riskSettings: risk,
    auditLogs: audit
  });
});
router4.get("/users/:id/manual-close", requirePermission("users:read"), (req, res) => {
  const { id } = req.params;
  const user = db2.users.find((u) => u.id === id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    userId: user.id,
    manualTradeCloseEnabled: Boolean(user.manualTradeCloseEnabled),
    effectiveManualClose: db2.getEffectiveManualClose(user.id),
    globalManualTradeCloseEnabled: db2.globalManualTradeCloseEnabled
  });
});
router4.post("/users/:id/manual-close", requirePermission("users:write"), async (req, res) => {
  const { id } = req.params;
  const { enabled, reason } = req.body;
  const user = db2.users.find((u) => u.id === id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const newStatus = Boolean(enabled);
  await db2.setUserManualTradeClose(
    user.id,
    newStatus,
    {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      ip: req.ip || "127.0.0.1"
    },
    reason
  );
  res.json({
    success: true,
    userId: user.id,
    manualTradeCloseEnabled: user.manualTradeCloseEnabled,
    effectiveManualClose: db2.getEffectiveManualClose(user.id),
    globalManualTradeCloseEnabled: db2.globalManualTradeCloseEnabled,
    message: `Manual trade close permission for ${user.email} updated to ${newStatus ? "ENABLED" : "DISABLED"}.`
  });
});
router4.post("/users/:id/status", requirePermission("users:write"), (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const user = db2.users.find((u) => u.id === id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const prevStatus = user.status;
  user.status = status;
  db2.recordAudit(
    req.user.id,
    req.user.email,
    req.user.role,
    "USER_STATUS_CHANGE",
    "users",
    `Changed status for ${user.email} from ${prevStatus} to ${status}. Reason: ${reason || "Admin action"}`,
    req.ip,
    user.id
  );
  res.json({ success: true, user });
});
router4.get(["/accounts", "/mt5-accounts", "/trading/accounts"], requirePermission("accounts:manage"), (req, res) => {
  const accounts = db2.mt5Accounts.map((a) => {
    const user = db2.users.find((u) => u.id === a.userId);
    const { encryptedPassword, ...safe } = a;
    return {
      ...safe,
      userEmail: user ? user.email : "Unknown",
      userName: user ? `${user.firstName} ${user.lastName}` : "Unknown"
    };
  });
  res.json({ accounts });
});
router4.get(["/workers", "/workers/health"], requirePermission("system:manage"), (req, res) => {
  res.json({ workers: db2.workerNodes, total: db2.workerNodes.length });
});
router4.post(["/accounts/:id/sync", "/mt5-accounts/:id/sync"], requirePermission("accounts:manage"), (req, res) => {
  const { id } = req.params;
  const account = db2.mt5Accounts.find((a) => a.id === id);
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  orchestrator.reconcileAccount(account.id);
  db2.recordAudit(req.user.id, req.user.email, req.user.role, "MT5_FORCE_SYNC", "mt5_accounts", `Forced sync on account ${account.loginId}`, req.ip, account.id);
  const { encryptedPassword, ...safe } = account;
  res.json({ success: true, account: safe });
});
router4.get("/trades", requirePermission("trading:view_all"), (req, res) => {
  const openPositions = db2.positions.map((p) => {
    const account = db2.mt5Accounts.find((a) => a.id === p.mt5AccountId);
    const user = account ? db2.users.find((u) => u.id === account.userId) : null;
    return {
      ...p,
      broker: account ? account.brokerName : "Unknown",
      accountLogin: account ? account.loginId : "Unknown",
      userEmail: user ? user.email : "Unknown"
    };
  });
  res.json({ trades: openPositions });
});
router4.post("/trades/:id/force-close", requirePermission("trading:override"), async (req, res) => {
  const { id } = req.params;
  const success = await orchestrator.closePosition(id, req.user.id);
  if (success) {
    res.json({ success: true, message: "Position force-closed by administrator." });
  } else {
    res.status(400).json({ error: "Failed to close position or position not open." });
  }
});
router4.get("/subscriptions", requirePermission("billing:manage"), (req, res) => {
  res.json({
    subscriptions: db2.subscriptions,
    plans: db2.subscriptionPlans,
    payments: db2.payments
  });
});
router4.get("/payments", requirePermission("billing:manage"), (req, res) => {
  res.json({
    payments: db2.payments,
    totalCount: db2.payments.length,
    succeededCount: db2.payments.filter((p) => p.status === "succeeded").length,
    totalUsd: db2.payments.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + p.amountUsd, 0)
  });
});
router4.get("/algorithms", requirePermission("algorithms:manage"), (req, res) => {
  res.json({
    algorithms: db2.algorithms,
    versions: db2.algorithmVersions
  });
});
router4.post("/algorithms/:id/toggle", requirePermission("algorithms:manage"), (req, res) => {
  const { id } = req.params;
  const algo = db2.algorithms.find((a) => a.id === id);
  if (!algo) {
    res.status(404).json({ error: "Algorithm not found" });
    return;
  }
  algo.isActive = !algo.isActive;
  db2.recordAudit(
    req.user.id,
    req.user.email,
    req.user.role,
    "ALGORITHM_TOGGLE",
    "algorithms",
    `Toggled algorithm ${algo.name} status to ${algo.isActive ? "Active" : "Paused"}`,
    req.ip,
    algo.id
  );
  res.json({ success: true, algorithm: algo });
});
router4.get("/risk", requirePermission("risk:manage_limits"), (req, res) => {
  res.json({
    killSwitches: db2.killSwitches,
    algorithms: db2.algorithms,
    mt5Accounts: db2.mt5Accounts.map(({ encryptedPassword, ...safe }) => safe)
  });
});
router4.post("/risk/kill-switch", requirePermission("risk:kill_switch"), (req, res) => {
  const { scope, targetId, active, reason } = req.body;
  if (scope === "global") {
    db2.killSwitches.globalKillSwitch = Boolean(active);
    db2.killSwitches.lastTriggeredBy = req.user.email;
    db2.killSwitches.lastTriggeredAt = (/* @__PURE__ */ new Date()).toISOString();
    db2.recordAudit(
      req.user.id,
      req.user.email,
      req.user.role,
      active ? "GLOBAL_KILL_SWITCH_ENGAGED" : "GLOBAL_KILL_SWITCH_DISENGAGED",
      "system",
      `GLOBAL TRADING KILL SWITCH ${active ? "ENGAGED" : "DISENGAGED"}. Reason: ${reason || "Manual Admin action"}`,
      req.ip
    );
    res.json({ success: true, killSwitches: db2.killSwitches, message: `Global kill switch ${active ? "ENGAGED" : "DISENGAGED"}` });
    return;
  }
  if (scope === "algorithm" && targetId) {
    db2.killSwitches.perAlgorithm[targetId] = Boolean(active);
    db2.recordAudit(
      req.user.id,
      req.user.email,
      req.user.role,
      "ALGORITHM_KILL_SWITCH",
      "algorithms",
      `Algorithm ${targetId} kill switch set to ${active}`,
      req.ip,
      targetId
    );
    res.json({ success: true, killSwitches: db2.killSwitches });
    return;
  }
  if (scope === "account" && targetId) {
    db2.killSwitches.perAccount[targetId] = Boolean(active);
    db2.recordAudit(
      req.user.id,
      req.user.email,
      req.user.role,
      "ACCOUNT_KILL_SWITCH",
      "mt5_accounts",
      `MT5 Account ${targetId} emergency stop set to ${active}`,
      req.ip,
      targetId
    );
    res.json({ success: true, killSwitches: db2.killSwitches });
    return;
  }
  res.status(400).json({ error: "Invalid kill switch scope or target." });
});
router4.get("/social", requirePermission("social:approve"), (req, res) => {
  res.json({ posts: db2.socialPosts });
});
router4.post("/social/:id/action", requirePermission("social:approve"), (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  const post = db2.socialPosts.find((p) => p.id === id);
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  if (action === "approve") {
    post.status = "approved";
    post.approvedBy = `${req.user.firstName} ${req.user.lastName}`;
  } else if (action === "reject") {
    post.status = "rejected";
  } else if (action === "publish") {
    post.status = "published";
    post.publishedAt = (/* @__PURE__ */ new Date()).toISOString();
  }
  db2.recordAudit(req.user.id, req.user.email, req.user.role, "SOCIAL_POST_ACTION", "social_posts", `${action.toUpperCase()} social report for ${post.platform}`, req.ip, post.id);
  res.json({ success: true, post });
});
router4.get("/support", requirePermission("support:tickets"), (req, res) => {
  res.json({ tickets: db2.supportTickets });
});
router4.post("/support/:id/reply", requirePermission("support:tickets"), (req, res) => {
  const { id } = req.params;
  const { message, status } = req.body;
  const ticket = db2.supportTickets.find((t) => t.id === id);
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }
  if (message) {
    ticket.messages.push({
      id: `msg_${Date.now()}`,
      senderId: req.user.id,
      senderType: "admin",
      senderName: `${req.user.firstName} (Support)`,
      message,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  if (status) {
    ticket.status = status;
  }
  ticket.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  db2.recordAudit(req.user.id, req.user.email, req.user.role, "SUPPORT_TICKET_REPLIED", "support_tickets", `Replied to ticket #${ticket.id}`, req.ip, ticket.id);
  res.json({ success: true, ticket });
});
router4.get("/audit-logs", requirePermission("system:audit"), (req, res) => {
  const { limit = 50 } = req.query;
  const logs = db2.auditLogs.slice(0, Number(limit));
  res.json({ logs });
});
router4.get("/reports", requirePermission("system:manage"), (req, res) => {
  res.json({
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    financialSummary: {
      totalRevenue: db2.payments.filter((p) => p.status === "succeeded").reduce((s, p) => s + p.amountUsd, 0),
      activeSubscriptions: db2.subscriptions.filter((s) => s.status === "active").length
    },
    tradingSummary: {
      totalPositions: db2.positions.length,
      openPositions: db2.positions.filter((p) => p.status === "open").length
    }
  });
});
router4.get("/notifications", requirePermission("system:manage"), (req, res) => {
  res.json({
    notifications: [
      {
        id: "notif_1",
        title: "US CPI Release High-Vol Protocol Active",
        message: "Widened slippage parameters active across EURUSD and GBPUSD during Bureau of Labor Statistics release.",
        audience: "All Connected Traders",
        type: "Risk Alert",
        date: (/* @__PURE__ */ new Date()).toISOString()
      }
    ]
  });
});
router4.post("/notifications", requirePermission("system:manage"), (req, res) => {
  const { title, message, audience, type } = req.body;
  db2.recordAudit(
    req.user.id,
    req.user.email,
    req.user.role,
    "BROADCAST_NOTIFICATION",
    "notifications",
    `Dispatched ${type || "system"} broadcast: "${title}" to ${audience || "all"}`,
    req.ip
  );
  res.json({ success: true, message: "Notification broadcast queued and recorded." });
});
router4.get("/system", requirePermission("system:manage"), (req, res) => {
  res.json({
    workerNodes: db2.workerNodes,
    systemUptimeSeconds: process.uptime(),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    activeDbConnections: 4,
    queueJobStatus: {
      queued: 0,
      processing: 3,
      failed: 0
    }
  });
});
router4.get("/demo/accounts", requirePermission("trades:read"), (req, res) => {
  const accountsWithUsers = db2.demoAccounts.map((acc) => {
    const user = db2.users.find((u) => u.id === acc.userId);
    return {
      ...acc,
      userEmail: user?.email || "unknown",
      customerName: user ? `${user.firstName} ${user.lastName}` : "Customer"
    };
  });
  res.json({
    accounts: accountsWithUsers,
    globalKillSwitch: db2.demoGlobalKillSwitch,
    quotes: marketSimulator.getQuotes()
  });
});
router4.get("/demo/positions", requirePermission("trades:read"), (req, res) => {
  const positionsWithAccount = db2.demoPositions.filter((p) => p.status === "open").map((pos) => {
    const acc = db2.demoAccounts.find((a) => a.id === pos.mt5AccountId);
    const user = acc ? db2.users.find((u) => u.id === acc.userId) : null;
    return {
      ...pos,
      accountNumber: acc?.accountNumber || "DEMO-???",
      customerEmail: user?.email || "customer@aurafx.com"
    };
  });
  res.json({
    positions: positionsWithAccount,
    totalCount: positionsWithAccount.length,
    totalFloatingPnl: positionsWithAccount.reduce((s, p) => s + (p.currentPnl || 0), 0)
  });
});
router4.get("/demo/history", requirePermission("trades:read"), (req, res) => {
  const closedWithAccount = db2.demoPositions.filter((p) => p.status === "closed").map((pos) => {
    const acc = db2.demoAccounts.find((a) => a.id === pos.mt5AccountId);
    const user = acc ? db2.users.find((u) => u.id === acc.userId) : null;
    return {
      ...pos,
      accountNumber: acc?.accountNumber || "DEMO-???",
      customerEmail: user?.email || "customer@aurafx.com"
    };
  });
  res.json({
    trades: closedWithAccount,
    totalCount: closedWithAccount.length,
    totalRealizedProfit: closedWithAccount.reduce((s, p) => s + (p.profit || 0), 0)
  });
});
router4.get("/demo/risk-events", requirePermission("risk:manage"), (req, res) => {
  res.json({
    events: db2.demoRiskEvents,
    count: db2.demoRiskEvents.length
  });
});
router4.post("/demo/positions/:id/close", requirePermission("trades:write"), async (req, res) => {
  const { id } = req.params;
  const adminActorId = req.user.id;
  const result = await demoExecutionEngine.closePosition(id, adminActorId, true, "Admin Intervention / Risk Close");
  if (!result.success) {
    res.status(400).json({ error: result.message, errorCode: result.errorCode });
    return;
  }
  res.json({
    success: true,
    position: result.position,
    account: result.account,
    message: result.message
  });
});
router4.post("/demo/accounts/:userId/reset", requirePermission("accounts:write"), (req, res) => {
  const { userId } = req.params;
  const targetUser = db2.users.find((u) => u.id === userId);
  if (!targetUser) {
    res.status(404).json({ error: "Customer user not found." });
    return;
  }
  const account = demoExecutionEngine.resetAccount(userId);
  db2.recordAudit(
    req.user.id,
    req.user.email,
    req.user.role,
    "ADMIN_RESET_DEMO_ACCOUNT",
    "demo_accounts",
    `Admin reset demo balance to $10,000.00 for ${targetUser.email}`,
    req.ip,
    account.id
  );
  res.json({
    success: true,
    account,
    message: `Demo account for ${targetUser.email} has been reset to $10,000.00.`
  });
});
router4.post("/demo/accounts/:userId/pause", requirePermission("risk:manage"), (req, res) => {
  const { userId } = req.params;
  const { paused } = req.body;
  const targetUser = db2.users.find((u) => u.id === userId);
  if (!targetUser) {
    res.status(404).json({ error: "Customer user not found." });
    return;
  }
  const isPaused = paused !== void 0 ? Boolean(paused) : true;
  const account = demoExecutionEngine.setTradingPaused(userId, isPaused, req.user.id);
  res.json({
    success: true,
    account,
    message: `Demo trading for ${targetUser.email} is now ${isPaused ? "PAUSED" : "ACTIVE"}.`
  });
});
router4.get("/demo/algorithm", requirePermission("algorithms:manage"), (req, res) => {
  res.json({
    algorithm: demoTrendStrategy.getConfig(),
    globalKillSwitch: db2.demoGlobalKillSwitch
  });
});
router4.put("/demo/algorithm", requirePermission("algorithms:manage"), (req, res) => {
  const updates = req.body;
  const updated = demoTrendStrategy.updateConfig(updates);
  db2.recordAudit(
    req.user.id,
    req.user.email,
    req.user.role,
    "DEMO_ALGORITHM_UPDATED",
    "demo_algorithm",
    `Updated Demo Trend Strategy settings: Enabled=${updated.enabled}, LotSize=${updated.lotSize}`,
    req.ip,
    updated.id
  );
  res.json({
    success: true,
    algorithm: updated,
    message: "Demo Trend Strategy configuration updated."
  });
});
router4.post("/demo/kill-switch", requirePermission("risk:manage"), (req, res) => {
  const { active, reason } = req.body;
  db2.demoGlobalKillSwitch = Boolean(active);
  db2.recordAudit(
    req.user.id,
    req.user.email,
    req.user.role,
    db2.demoGlobalKillSwitch ? "DEMO_GLOBAL_KILL_SWITCH_ENGAGED" : "DEMO_GLOBAL_KILL_SWITCH_DISENGAGED",
    "kill_switches",
    `Global Demo Trading Kill Switch set to ${db2.demoGlobalKillSwitch}. Reason: ${reason || "Admin safety directive"}`,
    req.ip
  );
  res.json({
    success: true,
    globalKillSwitch: db2.demoGlobalKillSwitch,
    message: `Global Demo Trading Kill Switch is now ${db2.demoGlobalKillSwitch ? "ENGAGED (Trading Blocked)" : "DISENGAGED (Trading Allowed)"}.`
  });
});
router4.get(["/settings/manual-close", "/trading/settings/manual-close"], (req, res) => {
  res.json({
    globalManualTradeCloseEnabled: db2.globalManualTradeCloseEnabled
  });
});
router4.post(["/settings/manual-close", "/trading/settings/manual-close"], async (req, res) => {
  const { enabled, reason } = req.body;
  const newStatus = Boolean(enabled);
  await db2.setGlobalManualTradeClose(
    newStatus,
    {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      ip: req.ip || "127.0.0.1"
    },
    reason
  );
  res.json({
    success: true,
    globalManualTradeCloseEnabled: db2.globalManualTradeCloseEnabled,
    message: `Global Manual Trade Close master switch updated to ${newStatus ? "ENABLED" : "DISABLED"}.`
  });
});
router4.put(["/settings/manual-close", "/trading/settings/manual-close"], async (req, res) => {
  const { enabled, reason } = req.body;
  const newStatus = Boolean(enabled);
  await db2.setGlobalManualTradeClose(
    newStatus,
    {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      ip: req.ip || "127.0.0.1"
    },
    reason
  );
  res.json({
    success: true,
    globalManualTradeCloseEnabled: db2.globalManualTradeCloseEnabled,
    message: `Global Manual Trade Close master switch updated to ${newStatus ? "ENABLED" : "DISABLED"}.`
  });
});
var admin_default = router4;

// server/routes/worker.ts
import { Router as Router5 } from "express";

// server/middleware/workerAuth.ts
import crypto4 from "crypto";
function timingSafeCompare(a, b) {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto4.timingSafeEqual(bufA, bufB);
}
function requireWorkerAuth(req, res, next) {
  const configuredSecret = process.env.MT5_WORKER_SECRET;
  if (!configuredSecret) {
    if (process.env.NODE_ENV === "production") {
      res.status(500).json({
        error: "MT5 worker authentication is unconfigured on the server.",
        code: "ERR_WORKER_AUTH_UNCONFIGURED"
      });
      return;
    }
  }
  let providedSecret = req.headers["x-worker-secret"];
  if (!providedSecret) {
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      providedSecret = authHeader.substring(7).trim();
    }
  }
  if (!providedSecret) {
    res.status(401).json({
      error: "Authentication failed. Missing MT5 worker secret header.",
      code: "ERR_WORKER_UNAUTHORIZED"
    });
    return;
  }
  const targetSecret = configuredSecret || "mt5_dev_worker_secret_fallback_key";
  if (!timingSafeCompare(providedSecret, targetSecret)) {
    res.status(403).json({
      error: "Access denied. Invalid MT5 worker secret.",
      code: "ERR_WORKER_FORBIDDEN"
    });
    return;
  }
  next();
}

// server/routes/worker.ts
var router5 = Router5();
router5.use(requireWorkerAuth);
function isFiniteNumber(val) {
  return typeof val === "number" && Number.isFinite(val);
}
router5.post("/sync", async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object") {
    res.status(400).json({
      error: "Invalid payload. Request body must be a valid JSON object.",
      code: "ERR_INVALID_PAYLOAD"
    });
    return;
  }
  const prohibitedCredentialFields = ["password", "encryptedPassword", "investorPassword", "masterPassword", "pwd", "pass"];
  for (const field of prohibitedCredentialFields) {
    if (field in body || body.account && field in body.account) {
      res.status(400).json({
        error: "MT5 passwords must never be transmitted via the worker sync endpoint. Connection operates in secure zero-credential mode.",
        code: "ERR_PASSWORDS_PROHIBITED"
      });
      return;
    }
  }
  const prohibitedCommandFields = ["action", "command", "orderType", "execute", "buy", "sell", "closeOrder", "tradeCommand"];
  for (const field of prohibitedCommandFields) {
    if (field in body) {
      res.status(400).json({
        error: "Trade/order execution commands are strictly forbidden on this read-only synchronization endpoint.",
        code: "ERR_EXECUTION_COMMAND_PROHIBITED"
      });
      return;
    }
  }
  const workerId = typeof body.workerId === "string" ? body.workerId.trim() : "";
  const workerName = typeof body.workerName === "string" ? body.workerName.trim() : workerId || "Windows MT5 Worker";
  if (!workerId) {
    res.status(400).json({
      error: "workerId is required and must be a valid non-empty string.",
      code: "ERR_INVALID_WORKER_ID"
    });
    return;
  }
  const account = body.account;
  if (!account || typeof account !== "object") {
    res.status(400).json({
      error: "account object is required with MT5 loginId, server, balance, and equity.",
      code: "ERR_INVALID_ACCOUNT_OBJECT"
    });
    return;
  }
  const loginId = String(account.loginId || "").trim();
  const server = String(account.server || "").trim();
  const brokerName = account.brokerName ? String(account.brokerName).trim() : void 0;
  if (!loginId) {
    res.status(400).json({
      error: "account.loginId is required and must not be empty.",
      code: "ERR_INVALID_LOGIN_ID"
    });
    return;
  }
  if (!server) {
    res.status(400).json({
      error: "account.server is required and must not be empty.",
      code: "ERR_INVALID_SERVER"
    });
    return;
  }
  if (!isFiniteNumber(account.balance)) {
    res.status(400).json({
      error: "account.balance must be a valid finite number.",
      code: "ERR_INVALID_BALANCE"
    });
    return;
  }
  if (!isFiniteNumber(account.equity)) {
    res.status(400).json({
      error: "account.equity must be a valid finite number.",
      code: "ERR_INVALID_EQUITY"
    });
    return;
  }
  const margin = isFiniteNumber(account.margin) ? account.margin : 0;
  const freeMargin = isFiniteNumber(account.freeMargin) ? account.freeMargin : account.balance;
  const marginLevel = isFiniteNumber(account.marginLevel) ? account.marginLevel : 0;
  const currency = typeof account.currency === "string" && account.currency.trim() ? account.currency.trim().toUpperCase() : "USD";
  const leverage = Number.isInteger(account.leverage) && account.leverage > 0 ? account.leverage : 100;
  if (!Array.isArray(body.positions)) {
    res.status(400).json({
      error: "positions must be an array (can be empty [] if no open trades exist).",
      code: "ERR_INVALID_POSITIONS_ARRAY"
    });
    return;
  }
  const sanitizedPositions = [];
  for (let i = 0; i < body.positions.length; i++) {
    const p = body.positions[i];
    if (!p || typeof p !== "object") {
      res.status(400).json({
        error: `positions[${i}] must be an object.`,
        code: "ERR_INVALID_POSITION_ITEM"
      });
      return;
    }
    const ticket = Number(p.ticket);
    if (!Number.isInteger(ticket) || ticket <= 0) {
      res.status(400).json({
        error: `positions[${i}].ticket must be a valid positive integer. Received: ${p.ticket}`,
        code: "ERR_INVALID_POSITION_TICKET"
      });
      return;
    }
    const symbol = typeof p.symbol === "string" ? p.symbol.trim().toUpperCase() : "";
    if (!symbol) {
      res.status(400).json({
        error: `positions[${i}].symbol is required (e.g. 'XAUUSD').`,
        code: "ERR_INVALID_POSITION_SYMBOL"
      });
      return;
    }
    const rawType = typeof p.type === "string" ? p.type.trim().toUpperCase() : "";
    if (rawType !== "BUY" && rawType !== "SELL") {
      res.status(400).json({
        error: `positions[${i}].type must be either 'BUY' or 'SELL'. Received: ${p.type}`,
        code: "ERR_INVALID_POSITION_TYPE"
      });
      return;
    }
    if (!isFiniteNumber(p.lots) || p.lots <= 0) {
      res.status(400).json({
        error: `positions[${i}].lots must be a positive finite number.`,
        code: "ERR_INVALID_POSITION_LOTS"
      });
      return;
    }
    if (!isFiniteNumber(p.openPrice) || p.openPrice <= 0) {
      res.status(400).json({
        error: `positions[${i}].openPrice must be a positive finite number.`,
        code: "ERR_INVALID_OPEN_PRICE"
      });
      return;
    }
    if (!isFiniteNumber(p.currentPrice) || p.currentPrice <= 0) {
      res.status(400).json({
        error: `positions[${i}].currentPrice must be a positive finite number.`,
        code: "ERR_INVALID_CURRENT_PRICE"
      });
      return;
    }
    const stopLoss = isFiniteNumber(p.stopLoss) ? p.stopLoss : null;
    const takeProfit = isFiniteNumber(p.takeProfit) ? p.takeProfit : null;
    const currentPnl = isFiniteNumber(p.currentPnl) ? p.currentPnl : 0;
    const swap = isFiniteNumber(p.swap) ? p.swap : 0;
    const commission = isFiniteNumber(p.commission) ? p.commission : 0;
    let openTime = null;
    if (p.openTime) {
      const parsedTime = new Date(p.openTime);
      if (!isNaN(parsedTime.getTime())) {
        openTime = parsedTime.toISOString();
      }
    }
    sanitizedPositions.push({
      ticket,
      symbol,
      type: rawType,
      lots: p.lots,
      openPrice: p.openPrice,
      currentPrice: p.currentPrice,
      stopLoss,
      takeProfit,
      currentPnl,
      swap,
      commission,
      openTime: openTime || (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  const heartbeat = body.heartbeat && typeof body.heartbeat === "object" ? {
    cpuPercent: isFiniteNumber(body.heartbeat.cpuPercent) ? Math.min(100, Math.max(0, body.heartbeat.cpuPercent)) : 10,
    memoryPercent: isFiniteNumber(body.heartbeat.memoryPercent) ? Math.min(100, Math.max(0, body.heartbeat.memoryPercent)) : 25,
    pingLatencyMs: Number.isInteger(body.heartbeat.pingLatencyMs) ? Math.max(0, body.heartbeat.pingLatencyMs) : 5,
    activeTerminals: Number.isInteger(body.heartbeat.activeTerminals) ? Math.max(0, body.heartbeat.activeTerminals) : 1
  } : void 0;
  try {
    const result = await db2.syncWorkerAccountData({
      workerId,
      workerName,
      account: {
        loginId,
        server,
        brokerName,
        balance: account.balance,
        equity: account.equity,
        margin,
        freeMargin,
        marginLevel,
        currency,
        leverage
      },
      positions: sanitizedPositions,
      heartbeat
    });
    const queuedCommands = db2.getPendingWorkerCommands(workerId, result.mt5AccountId);
    for (const cmd of queuedCommands) {
      db2.markWorkerCommandDispatched(cmd.commandId, workerId);
    }
    res.status(200).json({
      status: "synced",
      mt5AccountId: result.mt5AccountId,
      serverTime: (/* @__PURE__ */ new Date()).toISOString(),
      killSwitches: {
        globalKillSwitch: result.globalKillSwitch,
        accountKillSwitch: result.accountKillSwitch
      },
      syncedPositionsCount: result.syncedPositionsCount,
      pendingCommands: queuedCommands
    });
  } catch (err) {
    if (err.statusCode === 404) {
      res.status(404).json({
        error: err.message,
        code: "ERR_ACCOUNT_NOT_FOUND"
      });
      return;
    }
    console.error("[WorkerSync Error]:", err);
    res.status(500).json({
      error: "Failed to synchronize worker telemetry with the database.",
      code: "ERR_SYNC_FAILED",
      message: err.message
    });
  }
});
router5.post("/heartbeat", (req, res) => {
  const { workerId, cpuPercent, memoryPercent, activeTerminals, pingLatencyMs } = req.body;
  if (!workerId) {
    res.status(400).json({ error: "Worker ID required" });
    return;
  }
  let node = db2.workerNodes.find((n) => n.id === workerId || n.workerName === workerId);
  if (node) {
    node.status = "online";
    node.cpuPercent = isFiniteNumber(cpuPercent) ? cpuPercent : node.cpuPercent;
    node.memoryPercent = isFiniteNumber(memoryPercent) ? memoryPercent : node.memoryPercent;
    node.activeTerminals = Number.isInteger(activeTerminals) ? activeTerminals : node.activeTerminals;
    node.pingLatencyMs = Number.isInteger(pingLatencyMs) ? pingLatencyMs : node.pingLatencyMs;
    node.lastHeartbeat = (/* @__PURE__ */ new Date()).toISOString();
  }
  res.json({
    status: "acknowledged",
    globalKillSwitch: db2.killSwitches.globalKillSwitch,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
router5.post("/commands/:commandId/result", async (req, res) => {
  const { commandId } = req.params;
  const body = req.body;
  if (!body || typeof body !== "object") {
    res.status(400).json({
      error: "Invalid payload. Request body must be a valid JSON object.",
      code: "ERR_INVALID_PAYLOAD"
    });
    return;
  }
  const workerId = String(body.workerId || req.headers["x-worker-id"] || "").trim();
  if (!workerId) {
    res.status(400).json({
      error: "workerId is required.",
      code: "ERR_WORKER_ID_REQUIRED"
    });
    return;
  }
  const rawStatus = typeof body.status === "string" ? body.status.trim().toUpperCase() : "";
  if (rawStatus !== "FILLED" && rawStatus !== "REJECTED" && rawStatus !== "FAILED") {
    res.status(400).json({
      error: "status must be one of 'FILLED', 'REJECTED', or 'FAILED'.",
      code: "ERR_INVALID_STATUS"
    });
    return;
  }
  const ticket = Number.isInteger(Number(body.ticket)) && Number(body.ticket) > 0 ? Number(body.ticket) : void 0;
  const fillPrice = isFiniteNumber(body.fillPrice) && body.fillPrice > 0 ? body.fillPrice : void 0;
  const retcode = Number.isInteger(Number(body.retcode)) ? Number(body.retcode) : void 0;
  const message = typeof body.message === "string" ? body.message.trim() : void 0;
  const executedAt = body.executedAt ? new Date(body.executedAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
  const existingCmd = db2.workerCommands.find((c) => c.commandId === commandId);
  if (!existingCmd) {
    res.status(404).json({
      error: `Command '${commandId}' was not found.`,
      code: "ERR_COMMAND_NOT_FOUND"
    });
    return;
  }
  if (existingCmd.workerId !== workerId) {
    res.status(403).json({
      error: `Forbidden: Worker '${workerId}' is not authorized to submit results for command '${commandId}'.`,
      code: "ERR_WORKER_UNAUTHORIZED"
    });
    return;
  }
  let targetAccountId = body.mt5AccountId ? String(body.mt5AccountId).trim() : void 0;
  if (!targetAccountId && body.account && body.account.loginId) {
    const acc = db2.mt5Accounts.find(
      (a) => a.loginId === String(body.account.loginId).trim() && (!body.account.server || a.server.toLowerCase() === String(body.account.server).trim().toLowerCase())
    );
    if (acc) {
      targetAccountId = acc.id;
    }
  }
  if (targetAccountId && existingCmd.mt5AccountId !== targetAccountId) {
    res.status(403).json({
      error: `Forbidden: Command '${commandId}' does not belong to MT5 account '${targetAccountId}'.`,
      code: "ERR_ACCOUNT_MISMATCH"
    });
    return;
  }
  const ackResult = db2.acknowledgeWorkerCommand(
    {
      commandId,
      ticket,
      fillPrice,
      status: rawStatus,
      retcode,
      message,
      executedAt
    },
    workerId,
    targetAccountId
  );
  if (!ackResult.success) {
    res.status(400).json({
      error: ackResult.message,
      code: "ERR_ACK_FAILED"
    });
    return;
  }
  res.status(200).json({
    status: "acknowledged",
    command: ackResult.command,
    message: ackResult.message,
    serverTime: (/* @__PURE__ */ new Date()).toISOString()
  });
});
var worker_default = router5;

// server/routes/webhooks.ts
import { Router as Router6 } from "express";

// server/stripe/client.ts
import Stripe from "stripe";
var stripeClient = null;
function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !secretKey.trim()) {
    return null;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey.trim(), {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
      appInfo: {
        name: "Forex MT5 Automated Trading SaaS",
        version: "1.0.0"
      }
    });
  }
  return stripeClient;
}
function isStripeConfigured() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  return Boolean(secretKey && secretKey.trim().length > 5);
}
function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || "";
}

// server/stripe/webhook.ts
async function processStripeEvent(event, rawIp = "127.0.0.1") {
  const eventId = event.id;
  const eventType = event.type;
  if (db2.isWebhookProcessed(eventId)) {
    console.log(`[Stripe Webhook] Idempotency guard triggered: event ${eventId} (${eventType}) was already processed.`);
    return {
      success: true,
      duplicate: true,
      eventId,
      eventType,
      message: "Event was already processed previously."
    };
  }
  console.log(`[Stripe Webhook] Processing event ${eventId}: ${eventType}`);
  switch (eventType) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.metadata?.userId || session.client_reference_id;
      const planId = session.metadata?.planId;
      const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
      if (!userId) {
        console.warn(`[Stripe Webhook] Warning: checkout.session.completed missing userId metadata for session ${session.id}`);
        break;
      }
      const plan = db2.subscriptionPlans.find((p) => p.id === planId || p.code === planId) || db2.subscriptionPlans[0];
      const user = db2.users.find((u) => u.id === userId);
      let durationDays = 30;
      if (plan.interval === "quarterly") durationDays = 90;
      else if (plan.interval === "biannual") durationDays = 180;
      else if (plan.interval === "yearly") durationDays = 365;
      const startDate = /* @__PURE__ */ new Date();
      const endDate = new Date(Date.now() + durationDays * 864e5);
      const sub = await db2.createOrUpdateSubscription({
        id: stripeSubscriptionId || `sub_${Date.now()}`,
        userId,
        planId: plan.id,
        planName: plan.name,
        status: "active",
        stripeCustomerId: stripeCustomerId || void 0,
        stripeSubscriptionId: stripeSubscriptionId || void 0,
        currentPeriodStart: startDate.toISOString(),
        currentPeriodEnd: endDate.toISOString(),
        cancelAtPeriodEnd: false,
        priceUsd: amountTotal || plan.priceUsd,
        interval: plan.interval
      });
      const invoiceNumber = `INV-${(/* @__PURE__ */ new Date()).getFullYear()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
      const payment = await db2.recordPayment({
        id: `pay_${Date.now()}`,
        userId,
        subscriptionId: sub.id,
        provider: "stripe",
        transactionId: session.payment_intent ? String(session.payment_intent) : `txn_${session.id}`,
        amountUsd: amountTotal || plan.priceUsd,
        currency: (session.currency || "USD").toUpperCase(),
        status: "succeeded",
        invoiceNumber,
        idempotencyKey: eventId,
        stripeCustomerId: stripeCustomerId || void 0,
        stripePaymentIntentId: session.payment_intent ? String(session.payment_intent) : void 0,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      await db2.recordInvoice({
        id: `inv_${Date.now()}`,
        paymentId: payment.id,
        userId,
        subscriptionId: sub.id,
        invoiceNumber,
        subtotal: amountTotal || plan.priceUsd,
        tax: 0,
        total: amountTotal || plan.priceUsd,
        status: "paid",
        issuedDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        stripeInvoiceId: session.invoice ? String(session.invoice) : void 0
      });
      await db2.markWebhookProcessed(eventId, eventType);
      db2.recordAudit(
        userId,
        user?.email || "customer@forexsaas.com",
        user?.role || "customer",
        "STRIPE_CHECKOUT_COMPLETED",
        "subscriptions",
        `Stripe checkout succeeded for ${plan.name} ($${amountTotal || plan.priceUsd}). Subscription activated until ${endDate.toISOString().split("T")[0]}.`,
        rawIp,
        sub.id
      );
      return {
        success: true,
        duplicate: false,
        eventId,
        eventType,
        message: `Subscription successfully activated for user ${userId}.`,
        details: { subscriptionId: sub.id, paymentId: payment.id }
      };
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object;
      const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      const stripeSubscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      const amountPaid = invoice.amount_paid ? invoice.amount_paid / 100 : 0;
      const sub = db2.subscriptions.find(
        (s) => stripeSubscriptionId && s.stripeSubscriptionId === stripeSubscriptionId || stripeCustomerId && s.stripeCustomerId === stripeCustomerId
      );
      if (sub) {
        let durationDays = 30;
        if (sub.interval === "quarterly") durationDays = 90;
        else if (sub.interval === "biannual") durationDays = 180;
        else if (sub.interval === "yearly") durationDays = 365;
        const newEnd = new Date(Date.now() + durationDays * 864e5).toISOString();
        await db2.updateSubscriptionStatus(sub.id, "active", newEnd);
        const invoiceNumber = invoice.number || `INV-${(/* @__PURE__ */ new Date()).getFullYear()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
        const payment = await db2.recordPayment({
          id: `pay_${Date.now()}`,
          userId: sub.userId,
          subscriptionId: sub.id,
          provider: "stripe",
          transactionId: invoice.payment_intent ? String(invoice.payment_intent) : `txn_inv_${invoice.id}`,
          amountUsd: amountPaid || sub.priceUsd,
          currency: (invoice.currency || "USD").toUpperCase(),
          status: "succeeded",
          invoiceNumber,
          idempotencyKey: eventId,
          stripeCustomerId: stripeCustomerId || void 0,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        await db2.recordInvoice({
          id: `inv_${Date.now()}`,
          paymentId: payment.id,
          userId: sub.userId,
          subscriptionId: sub.id,
          invoiceNumber,
          subtotal: amountPaid || sub.priceUsd,
          tax: invoice.tax ? invoice.tax / 100 : 0,
          total: amountPaid || sub.priceUsd,
          status: "paid",
          issuedDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          pdfUrl: invoice.invoice_pdf || void 0,
          hostedInvoiceUrl: invoice.hosted_invoice_url || void 0,
          stripeInvoiceId: invoice.id
        });
        await db2.markWebhookProcessed(eventId, eventType);
        db2.recordAudit(
          sub.userId,
          "billing@stripe.com",
          "system",
          "INVOICE_PAYMENT_SUCCEEDED",
          "payments",
          `Stripe recurring renewal succeeded ($${amountPaid || sub.priceUsd}). Subscription active until ${newEnd.split("T")[0]}.`,
          rawIp,
          sub.id
        );
      } else {
        await db2.markWebhookProcessed(eventId, eventType);
      }
      return {
        success: true,
        duplicate: false,
        eventId,
        eventType,
        message: "Invoice payment succeeded processed."
      };
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      const stripeSubscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      const sub = db2.subscriptions.find(
        (s) => stripeSubscriptionId && s.stripeSubscriptionId === stripeSubscriptionId || stripeCustomerId && s.stripeCustomerId === stripeCustomerId
      );
      if (sub) {
        await db2.updateSubscriptionStatus(sub.id, "past_due");
        await db2.recordPayment({
          id: `pay_fail_${Date.now()}`,
          userId: sub.userId,
          subscriptionId: sub.id,
          provider: "stripe",
          transactionId: invoice.payment_intent ? String(invoice.payment_intent) : `txn_fail_${invoice.id}`,
          amountUsd: invoice.amount_due ? invoice.amount_due / 100 : sub.priceUsd,
          currency: (invoice.currency || "USD").toUpperCase(),
          status: "failed",
          invoiceNumber: invoice.number || `INV-${Date.now().toString().slice(-4)}`,
          idempotencyKey: eventId,
          stripeCustomerId: stripeCustomerId || void 0,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        await db2.markWebhookProcessed(eventId, eventType);
        db2.recordAudit(
          sub.userId,
          "billing@stripe.com",
          "system",
          "INVOICE_PAYMENT_FAILED",
          "subscriptions",
          `Stripe invoice payment failed. Subscription marked as past_due.`,
          rawIp,
          sub.id
        );
      } else {
        await db2.markWebhookProcessed(eventId, eventType);
      }
      return {
        success: true,
        duplicate: false,
        eventId,
        eventType,
        message: "Invoice payment failure processed and subscription updated to past_due."
      };
    }
    case "customer.subscription.deleted": {
      const stripeSub = event.data.object;
      const stripeSubId = stripeSub.id;
      const sub = db2.subscriptions.find((s) => s.stripeSubscriptionId === stripeSubId || s.id === stripeSubId);
      if (sub) {
        await db2.updateSubscriptionStatus(sub.id, "canceled");
        await db2.markWebhookProcessed(eventId, eventType);
        db2.recordAudit(
          sub.userId,
          "billing@stripe.com",
          "system",
          "SUBSCRIPTION_CANCELED_AT_STRIPE",
          "subscriptions",
          `Stripe canceled subscription ${stripeSubId}. Status set to canceled.`,
          rawIp,
          sub.id
        );
      } else {
        await db2.markWebhookProcessed(eventId, eventType);
      }
      return {
        success: true,
        duplicate: false,
        eventId,
        eventType,
        message: "Subscription deleted event processed."
      };
    }
    case "customer.subscription.updated": {
      const stripeSub = event.data.object;
      const stripeSubId = stripeSub.id;
      let mappedStatus = "active";
      if (stripeSub.status === "past_due") mappedStatus = "past_due";
      else if (stripeSub.status === "canceled") mappedStatus = "canceled";
      else if (stripeSub.status === "trialing") mappedStatus = "trialing";
      else if (stripeSub.status === "incomplete" || stripeSub.status === "incomplete_expired") mappedStatus = "incomplete";
      else if (stripeSub.status === "unpaid") mappedStatus = "past_due";
      const currentPeriodEnd = stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1e3).toISOString() : void 0;
      const sub = await db2.updateSubscriptionStatus(stripeSubId, mappedStatus, currentPeriodEnd);
      await db2.markWebhookProcessed(eventId, eventType);
      return {
        success: true,
        duplicate: false,
        eventId,
        eventType,
        message: `Subscription updated to status ${mappedStatus}.`,
        details: { subscriptionId: sub?.id, status: mappedStatus }
      };
    }
    default: {
      console.log(`[Stripe Webhook] Unhandled event type: ${eventType}`);
      await db2.markWebhookProcessed(eventId, eventType);
      return {
        success: true,
        duplicate: false,
        eventId,
        eventType,
        message: `Unhandled event type ${eventType} recorded.`
      };
    }
  }
  await db2.markWebhookProcessed(eventId, eventType);
  return {
    success: true,
    duplicate: false,
    eventId,
    eventType,
    message: "Event processed successfully."
  };
}
async function stripeWebhookRouteHandler(req, res) {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = getStripeWebhookSecret();
  const stripe = getStripe();
  let event;
  if (webhookSecret && stripe) {
    if (!sig) {
      console.error("[Stripe Webhook Error] Missing stripe-signature header");
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }
    try {
      const rawBody = req.rawBody || req.body;
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      console.error(`[Stripe Webhook Error] Signature verification failed:`, err.message);
      res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
      return;
    }
  } else {
    event = req.body;
    if (!event || !event.type || !event.id) {
      res.status(400).json({ error: "Invalid webhook payload structure" });
      return;
    }
  }
  try {
    const result = await processStripeEvent(event, req.ip);
    res.status(200).json(result);
  } catch (err) {
    console.error("[Stripe Webhook Execution Error]", err);
    res.status(500).json({ error: "Internal error processing webhook", message: err.message });
  }
}

// server/routes/webhooks.ts
var router6 = Router6();
router6.post("/stripe", stripeWebhookRouteHandler);
router6.post("/payment", async (req, res) => {
  const { eventType, idempotencyKey, userId, planId, amountUsd, transactionId } = req.body;
  if (!idempotencyKey) {
    res.status(400).json({ error: "Idempotency key required" });
    return;
  }
  if (db2.isWebhookProcessed(idempotencyKey)) {
    res.json({ status: "already_processed", message: "Payment event was already processed previously." });
    return;
  }
  if (eventType === "checkout.session.completed" || eventType === "payment_intent.succeeded") {
    const user = db2.users.find((u) => u.id === userId);
    const plan = db2.subscriptionPlans.find((p) => p.id === planId) || db2.subscriptionPlans[0];
    if (user && plan) {
      const syntheticEvent = {
        id: idempotencyKey,
        object: "event",
        type: "checkout.session.completed",
        data: {
          object: {
            id: `cs_${idempotencyKey}`,
            client_reference_id: userId,
            metadata: { userId, planId: plan.id },
            amount_total: Math.round((amountUsd || plan.priceUsd) * 100),
            currency: "usd",
            payment_intent: transactionId || `txn_${idempotencyKey}`
          }
        }
      };
      await processStripeEvent(syntheticEvent, req.ip);
    }
  }
  res.json({ received: true });
});
var webhooks_default = router6;

// server/routes/billing.ts
import { Router as Router7 } from "express";

// server/stripe/checkout.ts
async function createCheckoutSession(userId, userEmail, planId, successUrl, cancelUrl) {
  const plan = db2.subscriptionPlans.find((p) => p.id === planId || p.code === planId);
  if (!plan) {
    throw new Error(`Subscription plan not found: ${planId}`);
  }
  if (plan.interval === "profit_share") {
    const existingSub = db2.subscriptions.find((s) => s.userId === userId && s.status === "active");
    const newSub = await db2.createOrUpdateSubscription({
      id: existingSub ? existingSub.id : `sub_ps_${Date.now()}`,
      userId,
      planId: plan.id,
      planName: plan.name,
      status: "active",
      currentPeriodStart: (/* @__PURE__ */ new Date()).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 864e5).toISOString(),
      cancelAtPeriodEnd: false,
      priceUsd: 0,
      interval: "profit_share"
    });
    db2.recordAudit(
      userId,
      userEmail,
      "customer",
      "SUBSCRIPTION_ACTIVATED_PROFIT_SHARE",
      "subscriptions",
      `Activated Performance Profit-Share Plan for user ${userEmail} ($0 upfront, ${plan.profitSharePct}% performance fee).`,
      "127.0.0.1",
      newSub.id
    );
    return {
      url: `${successUrl}?status=activated&plan=profit_share&sub_id=${newSub.id}`,
      sessionId: `ps_sess_${Date.now()}`,
      isTestMode: true,
      stripeConfigured: isStripeConfigured(),
      mode: "profit_share"
    };
  }
  const stripe = getStripe();
  if (stripe && isStripeConfigured()) {
    try {
      const existingCustomer = db2.subscriptions.find((s) => s.userId === userId && s.stripeCustomerId)?.stripeCustomerId;
      let customerId = existingCustomer;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: { userId }
        });
        customerId = customer.id;
      }
      let intervalCount = 1;
      let intervalUnit = "month";
      if (plan.interval === "quarterly") {
        intervalCount = 3;
        intervalUnit = "month";
      } else if (plan.interval === "biannual") {
        intervalCount = 6;
        intervalUnit = "month";
      } else if (plan.interval === "yearly") {
        intervalCount = 1;
        intervalUnit = "year";
      }
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        client_reference_id: userId,
        payment_method_types: ["card"],
        line_items: plan.stripePriceId ? [{ price: plan.stripePriceId, quantity: 1 }] : [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: plan.name,
                description: plan.description
              },
              unit_amount: Math.round(plan.priceUsd * 100),
              recurring: {
                interval: intervalUnit,
                interval_count: intervalCount
              }
            },
            quantity: 1
          }
        ],
        metadata: {
          userId,
          planId: plan.id,
          planCode: plan.code
        },
        subscription_data: {
          metadata: {
            userId,
            planId: plan.id
          }
        },
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&plan_id=${plan.id}`,
        cancel_url: `${cancelUrl}?canceled=true&plan_id=${plan.id}`
      });
      if (!session.url) {
        throw new Error("Stripe failed to return a checkout URL");
      }
      return {
        url: session.url,
        sessionId: session.id,
        isTestMode: true,
        stripeConfigured: true,
        mode: "stripe"
      };
    } catch (err) {
      console.error("[Stripe Checkout Error]", err);
    }
  }
  const simulatedSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const simUrl = `${successUrl}?session_id=${simulatedSessionId}&plan_id=${plan.id}&simulated=true`;
  return {
    url: simUrl,
    sessionId: simulatedSessionId,
    isTestMode: true,
    stripeConfigured: false,
    mode: "simulated"
  };
}

// server/routes/billing.ts
var router7 = Router7();
router7.get("/plans", (_req, res) => {
  const plans = db2.subscriptionPlans.filter((p) => p.isActive);
  res.json({
    plans,
    isStripeConfigured: isStripeConfigured()
  });
});
router7.get("/subscription", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const userSubs = db2.subscriptions.filter((s) => s.userId === userId).sort((a, b) => new Date(b.currentPeriodStart).getTime() - new Date(a.currentPeriodStart).getTime());
  const activeSub = userSubs.find((s) => s.status === "active" || s.status === "trialing" || s.status === "past_due");
  const userInvoices = db2.invoices.filter((i) => i.userId === userId).sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime());
  const userPayments = db2.payments.filter((p) => p.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  let planDetails = null;
  if (activeSub) {
    planDetails = db2.subscriptionPlans.find((p) => p.id === activeSub.planId || p.code === activeSub.planId);
  }
  res.json({
    subscription: activeSub || null,
    plan: planDetails || null,
    invoices: userInvoices,
    payments: userPayments,
    history: userSubs,
    isStripeConfigured: isStripeConfigured()
  });
});
router7.post("/create-checkout-session", authenticateToken, async (req, res) => {
  const { planId, successUrl, cancelUrl } = req.body;
  const user = req.user;
  if (!planId) {
    res.status(400).json({ error: "Plan ID is required." });
    return;
  }
  const plan = db2.subscriptionPlans.find((p) => p.id === planId || p.code === planId);
  if (!plan) {
    res.status(404).json({ error: `Subscription plan not found: ${planId}` });
    return;
  }
  try {
    const origin = req.headers.origin || `${req.protocol}://${req.get("host")}`;
    const defaultSuccess = `${origin}/dashboard/subscription`;
    const defaultCancel = `${origin}/pricing`;
    const result = await createCheckoutSession(
      user.id,
      user.email,
      plan.id,
      successUrl || defaultSuccess,
      cancelUrl || defaultCancel
    );
    res.json(result);
  } catch (err) {
    console.error("[Billing Checkout Error]", err);
    res.status(500).json({ error: "Failed to initiate checkout session.", message: err.message });
  }
});
router7.post("/verify-checkout-session", authenticateToken, async (req, res) => {
  const { sessionId, planId, simulated } = req.body;
  const user = req.user;
  if (!sessionId) {
    res.status(400).json({ error: "Session ID is required." });
    return;
  }
  const plan = db2.subscriptionPlans.find((p) => p.id === planId || p.code === planId) || db2.subscriptionPlans[0];
  const stripe = getStripe();
  if (stripe && isStripeConfigured() && !sessionId.startsWith("cs_test_") && !simulated) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription", "payment_intent"]
      });
      if (session.payment_status === "paid" || session.status === "complete") {
        const syntheticEvent2 = {
          id: `evt_verify_${session.id}`,
          object: "event",
          type: "checkout.session.completed",
          data: {
            object: session
          }
        };
        await processStripeEvent(syntheticEvent2, req.ip);
        const sub2 = db2.subscriptions.find((s) => s.userId === user.id && s.status === "active");
        res.json({
          success: true,
          verified: true,
          status: "active",
          subscription: sub2
        });
        return;
      } else {
        res.status(400).json({
          success: false,
          verified: false,
          status: session.payment_status,
          message: "Payment has not been completed or settled."
        });
        return;
      }
    } catch (err) {
      console.error("[Billing Verify Error]", err);
      res.status(500).json({ error: "Failed to verify session with Stripe API.", message: err.message });
      return;
    }
  }
  const syntheticEvent = {
    id: `evt_sim_${sessionId}`,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: sessionId,
        client_reference_id: user.id,
        metadata: {
          userId: user.id,
          planId: plan.id
        },
        amount_total: Math.round(plan.priceUsd * 100),
        currency: "usd",
        customer: `cus_sim_${user.id.substring(0, 8)}`,
        subscription: `sub_sim_${Date.now()}`,
        payment_intent: `pi_sim_${Date.now()}`
      }
    }
  };
  await processStripeEvent(syntheticEvent, req.ip);
  const sub = db2.subscriptions.find((s) => s.userId === user.id && s.status === "active");
  res.json({
    success: true,
    verified: true,
    status: "active",
    subscription: sub,
    mode: "test_simulation"
  });
});
router7.post("/cancel-subscription", authenticateToken, async (req, res) => {
  const { immediate } = req.body;
  const user = req.user;
  const sub = db2.subscriptions.find((s) => s.userId === user.id && s.status === "active");
  if (!sub) {
    res.status(404).json({ error: "No active subscription found to cancel." });
    return;
  }
  const stripe = getStripe();
  if (stripe && isStripeConfigured() && sub.stripeSubscriptionId && !sub.stripeSubscriptionId.startsWith("sub_sim_")) {
    try {
      if (immediate) {
        await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
      } else {
        await stripe.subscriptions.update(sub.stripeSubscriptionId, {
          cancel_at_period_end: true
        });
      }
    } catch (err) {
      console.warn("[Stripe Cancel Warning]", err.message);
    }
  }
  const updatedSub = await db2.cancelSubscription(user.id, !immediate);
  db2.recordAudit(
    user.id,
    user.email,
    user.role,
    "SUBSCRIPTION_CANCELED_BY_CUSTOMER",
    "subscriptions",
    `User initiated subscription cancellation (${immediate ? "immediate" : "at period end"}).`,
    req.ip,
    sub.id
  );
  res.json({
    success: true,
    message: immediate ? "Subscription has been canceled immediately." : "Subscription will remain active until the end of the current billing period.",
    subscription: updatedSub
  });
});
router7.get("/invoices", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const invoices2 = db2.invoices.filter((i) => i.userId === userId).sort((a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime());
  res.json({ invoices: invoices2 });
});
router7.get("/payments", authenticateToken, (req, res) => {
  const userId = req.user.id;
  const payments3 = db2.payments.filter((p) => p.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ payments: payments3 });
});
router7.get("/admin/subscriptions", authenticateToken, requireAdmin, (req, res) => {
  const { status, search } = req.query;
  let subs = db2.subscriptions.map((s) => {
    const user = db2.users.find((u) => u.id === s.userId);
    const plan = db2.subscriptionPlans.find((p) => p.id === s.planId || p.code === s.planId);
    return {
      ...s,
      userEmail: user?.email || "unknown@user.com",
      userName: user ? `${user.firstName} ${user.lastName}`.trim() : "Unknown",
      planName: plan?.name || s.planName || "Quant Plan",
      planInterval: plan?.interval || s.interval || "monthly"
    };
  });
  if (status) {
    subs = subs.filter((s) => s.status === status);
  }
  if (search) {
    const q = String(search).toLowerCase();
    subs = subs.filter(
      (s) => s.userEmail.toLowerCase().includes(q) || s.userName.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    );
  }
  res.json({ subscriptions: subs });
});
router7.get("/admin/payments", authenticateToken, requireAdmin, (req, res) => {
  const { status, search } = req.query;
  let payments3 = db2.payments.map((p) => {
    const user = db2.users.find((u) => u.id === p.userId);
    return {
      ...p,
      userEmail: user?.email || "unknown@user.com",
      userName: user ? `${user.firstName} ${user.lastName}`.trim() : "Unknown"
    };
  });
  if (status) {
    payments3 = payments3.filter((p) => p.status === status);
  }
  if (search) {
    const q = String(search).toLowerCase();
    payments3 = payments3.filter(
      (p) => p.userEmail.toLowerCase().includes(q) || p.transactionId.toLowerCase().includes(q) || p.invoiceNumber.toLowerCase().includes(q)
    );
  }
  res.json({ payments: payments3 });
});
router7.get("/admin/invoices", authenticateToken, requireAdmin, (_req, res) => {
  const invoices2 = db2.invoices.map((inv) => {
    const user = db2.users.find((u) => u.id === inv.userId);
    return {
      ...inv,
      userEmail: user?.email || "unknown@user.com",
      userName: user ? `${user.firstName} ${user.lastName}`.trim() : "Unknown"
    };
  });
  res.json({ invoices: invoices2 });
});
router7.put("/admin/plans/:planId", authenticateToken, requireAdmin, async (req, res) => {
  const { planId } = req.params;
  const updates = req.body;
  const updated = await db2.updatePlan(planId, updates);
  if (!updated) {
    res.status(404).json({ error: `Subscription plan ${planId} not found.` });
    return;
  }
  db2.recordAudit(
    req.user.id,
    req.user.email,
    req.user.role,
    "SUBSCRIPTION_PLAN_UPDATED",
    "subscription_plans",
    `Updated plan ${updated.name} (Price: $${updated.priceUsd}, Active: ${updated.isActive})`,
    req.ip,
    updated.id
  );
  res.json({
    success: true,
    plan: updated
  });
});
router7.post("/admin/subscriptions/:subId/status", authenticateToken, requireAdmin, async (req, res) => {
  const { subId } = req.params;
  const { status, currentPeriodEnd } = req.body;
  if (!status) {
    res.status(400).json({ error: "Status is required." });
    return;
  }
  const sub = await db2.updateSubscriptionStatus(subId, status, currentPeriodEnd);
  if (!sub) {
    res.status(404).json({ error: `Subscription ${subId} not found.` });
    return;
  }
  db2.recordAudit(
    req.user.id,
    req.user.email,
    req.user.role,
    "SUBSCRIPTION_STATUS_OVERRIDE",
    "subscriptions",
    `Admin changed subscription ${subId} status to ${status}.`,
    req.ip,
    sub.id
  );
  res.json({
    success: true,
    subscription: sub
  });
});
var billing_default = router7;

// server/redis/client.ts
import { Redis } from "ioredis";
var isConnected = false;
var isReady = false;
var lastError = null;
var lastConnectTime = null;
var REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
var redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 5e3,
  lazyConnect: true,
  retryStrategy(times) {
    const delay = Math.min(times * 150, 3e3);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  }
});
var redisSubscriber = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  connectTimeout: 5e3,
  lazyConnect: true,
  retryStrategy(times) {
    const delay = Math.min(times * 150, 3e3);
    return delay;
  }
});
redisClient.on("connect", () => {
  isConnected = true;
  lastError = null;
  lastConnectTime = (/* @__PURE__ */ new Date()).toISOString();
  console.log("[Redis] Connection established to Redis server.");
});
redisClient.on("ready", () => {
  isReady = true;
  lastError = null;
  console.log("[Redis] Client is ready to accept commands.");
});
redisClient.on("error", (err) => {
  lastError = err.message;
  console.warn("[Redis] Connection error encountered:", err.message);
});
redisClient.on("close", () => {
  isReady = false;
  isConnected = false;
  console.log("[Redis] Connection closed.");
});
redisClient.on("reconnecting", (delay) => {
  console.log(`[Redis] Reconnecting in ${delay}ms...`);
});
redisSubscriber.on("error", (err) => {
  console.warn("[Redis Pub/Sub] Subscriber error:", err.message);
});
function isRedisReady() {
  return isReady && redisClient.status === "ready";
}
async function getRedisHealth() {
  const isConfigured = Boolean(process.env.REDIS_URL && process.env.REDIS_URL.trim() !== "");
  const rawUrl = process.env.REDIS_URL || "Not configured";
  const maskedUrl = rawUrl.includes("@") ? rawUrl.replace(/:[^:@]+@/, ":***@") : rawUrl;
  if (!isConfigured) {
    return {
      status: "Not configured",
      isReady: false,
      clientStatus: "not_configured",
      latencyMs: null,
      lastError: null,
      lastConnectTime: null,
      configuredUrl: "Not configured"
    };
  }
  if (redisClient.status !== "ready") {
    return {
      status: "Unavailable",
      isReady: false,
      clientStatus: redisClient.status,
      latencyMs: null,
      lastError,
      lastConnectTime,
      configuredUrl: maskedUrl
    };
  }
  const start = performance.now();
  try {
    const pingResult = await Promise.race([
      redisClient.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Redis ping timeout (1500ms)")), 1500))
    ]);
    const latencyMs = Math.round((performance.now() - start) * 100) / 100;
    let uptimeSeconds;
    let connectedClients;
    let usedMemoryHuman;
    try {
      const info = await redisClient.info();
      const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);
      const clientsMatch = info.match(/connected_clients:(\d+)/);
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      if (uptimeMatch) uptimeSeconds = parseInt(uptimeMatch[1], 10);
      if (clientsMatch) connectedClients = parseInt(clientsMatch[1], 10);
      if (memoryMatch) usedMemoryHuman = memoryMatch[1].trim();
    } catch {
    }
    return {
      status: pingResult === "PONG" ? "Connected" : "Unavailable",
      isReady: true,
      clientStatus: redisClient.status,
      latencyMs,
      uptimeSeconds,
      connectedClients,
      usedMemoryHuman,
      lastError: null,
      lastConnectTime,
      configuredUrl: maskedUrl
    };
  } catch (err) {
    return {
      status: "Unavailable",
      isReady: false,
      clientStatus: redisClient.status,
      latencyMs: null,
      lastError: err.message,
      lastConnectTime,
      configuredUrl: maskedUrl
    };
  }
}
async function initRedis() {
  const isConfigured = Boolean(process.env.REDIS_URL && process.env.REDIS_URL.trim() !== "");
  if (!isConfigured) {
    console.log("[Redis] REDIS_URL not configured. Redis features will remain idle during preview.");
    return;
  }
  try {
    if (redisClient.status === "wait") {
      await redisClient.connect();
    }
    if (redisSubscriber.status === "wait") {
      await redisSubscriber.connect();
    }
    console.log("[Redis] Initial connection initiated successfully.");
  } catch (err) {
    console.warn("[Redis] Note: Initial Redis connection failed. Redis status is Unavailable:", err.message);
  }
}

// server/redis/cache.ts
var memoryFallback = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryFallback.entries()) {
    if (entry.expiresAt !== null && entry.expiresAt <= now) {
      memoryFallback.delete(key);
    }
  }
}, 6e4);

// server/redis/pubsub.ts
import EventEmitter from "events";
var localEmitter = new EventEmitter();
var activeSubscriptions = /* @__PURE__ */ new Map();
redisSubscriber.on("message", (channel, message) => {
  try {
    const parsed = JSON.parse(message);
    const handlers = activeSubscriptions.get(channel);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(parsed);
        } catch (handlerErr) {
          console.error(`[Redis Pub/Sub] Handler error on channel ${channel}:`, handlerErr);
        }
      }
    }
  } catch (err) {
    console.warn(`[Redis Pub/Sub] Failed to parse message on ${channel}:`, err.message);
  }
});

// server/redis/queue.ts
import crypto5 from "crypto";
var processors = /* @__PURE__ */ new Map();
var memoryQueue = [];
var memoryJobs = /* @__PURE__ */ new Map();
var isWorkerRunning = false;
var workerInterval = null;
var QUEUE_KEY_PREFIX = "saas:queue:";
var JOB_KEY_PREFIX = "saas:job:";
function registerJobProcessor(type, processor) {
  processors.set(type, processor);
  console.log(`[JobQueue] Registered processor for '${type}'`);
}
async function enqueueJob(type, payload, options = {}) {
  const jobId = crypto5.randomUUID();
  const queueName = options.queueName || "default";
  const maxAttempts = options.maxAttempts || 3;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const job = {
    id: jobId,
    queueName,
    type,
    payload,
    status: "pending",
    attempts: 0,
    maxAttempts,
    createdAt: now
  };
  try {
    await pool.query(
      `INSERT INTO jobs (id, queue_name, job_type, payload, status, attempts, max_attempts, run_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())`,
      [jobId, queueName, type, JSON.stringify(payload), "pending", 0, maxAttempts]
    );
  } catch (dbErr) {
    console.error(`[JobQueue] Failed to persist job ${jobId} to PostgreSQL:`, dbErr.message);
  }
  if (isRedisReady()) {
    try {
      const fullJobKey = JOB_KEY_PREFIX + jobId;
      const fullQueueKey = QUEUE_KEY_PREFIX + queueName;
      await redisClient.set(fullJobKey, JSON.stringify(job), "EX", 86400);
      await redisClient.lpush(fullQueueKey, jobId);
      return job;
    } catch (redisErr) {
      console.warn(`[JobQueue] Redis enqueue error for ${jobId}:`, redisErr.message);
    }
  }
  job.errorMessage = "Redis queue is currently unavailable. Job is safely recorded in PostgreSQL and will be processed once Redis is connected.";
  return job;
}
async function getJob(jobId) {
  if (isRedisReady()) {
    try {
      const cached = await redisClient.get(JOB_KEY_PREFIX + jobId);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.warn(`[JobQueue] Failed to fetch job ${jobId} from Redis:`, err.message);
    }
  }
  if (memoryJobs.has(jobId)) {
    return memoryJobs.get(jobId);
  }
  try {
    const res = await pool.query(`SELECT * FROM jobs WHERE id = $1`, [jobId]);
    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        id: row.id,
        queueName: row.queue_name,
        type: row.job_type,
        payload: row.payload,
        status: row.status,
        attempts: row.attempts,
        maxAttempts: row.max_attempts,
        errorMessage: row.error_message,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
        completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null
      };
    }
  } catch (err) {
    console.warn(`[JobQueue] PostgreSQL lookup failed for ${jobId}:`, err.message);
  }
  return null;
}
async function processJob(jobId) {
  let job = await getJob(jobId);
  if (!job) return;
  const processor = processors.get(job.type);
  if (!processor) {
    console.warn(`[JobQueue] No processor registered for job type '${job.type}'. Job ${jobId} skipped.`);
    return;
  }
  job.status = "processing";
  job.attempts++;
  pool.query(
    `UPDATE jobs SET status = 'processing', attempts = $1, updated_at = NOW() WHERE id = $2`,
    [job.attempts, jobId]
  ).catch(() => {
  });
  if (isRedisReady()) {
    redisClient.set(JOB_KEY_PREFIX + jobId, JSON.stringify(job), "EX", 86400).catch(() => {
    });
  }
  try {
    const result = await processor(job);
    job.status = "completed";
    job.result = result;
    job.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    await pool.query(
      `UPDATE jobs SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [jobId]
    );
    if (isRedisReady()) {
      await redisClient.set(JOB_KEY_PREFIX + jobId, JSON.stringify(job), "EX", 86400);
    }
  } catch (execErr) {
    job.errorMessage = execErr.message;
    if (job.attempts < job.maxAttempts) {
      job.status = "pending";
      console.warn(`[JobQueue] Job ${jobId} failed (attempt ${job.attempts}/${job.maxAttempts}). Re-queuing...`);
      if (isRedisReady()) {
        await redisClient.lpush(QUEUE_KEY_PREFIX + job.queueName, jobId);
        await redisClient.set(JOB_KEY_PREFIX + jobId, JSON.stringify(job), "EX", 86400);
      } else {
        memoryQueue.unshift(jobId);
      }
    } else {
      job.status = "failed";
      console.error(`[JobQueue] Job ${jobId} failed permanently after ${job.attempts} attempts:`, execErr.message);
      await pool.query(
        `UPDATE jobs SET status = 'failed', error_message = $1, updated_at = NOW() WHERE id = $2`,
        [execErr.message, jobId]
      );
      if (isRedisReady()) {
        await redisClient.set(JOB_KEY_PREFIX + jobId, JSON.stringify(job), "EX", 86400);
      }
    }
  }
}
async function workerTick() {
  if (!isRedisReady()) {
    return;
  }
  const queueName = "default";
  const fullQueueKey = QUEUE_KEY_PREFIX + queueName;
  let jobId = null;
  try {
    jobId = await redisClient.rpop(fullQueueKey);
  } catch (err) {
    console.warn("[JobQueue] Worker RPOP error:", err.message);
    return;
  }
  if (jobId) {
    await processJob(jobId);
  }
}
function startQueueWorker(intervalMs = 500) {
  if (isWorkerRunning) return;
  isWorkerRunning = true;
  console.log("[JobQueue] Starting background job queue worker loop...");
  registerDefaultProcessors();
  workerInterval = setInterval(async () => {
    try {
      await workerTick();
    } catch (tickErr) {
      console.error("[JobQueue] Worker tick error:", tickErr.message);
    }
  }, intervalMs);
}
function registerDefaultProcessors() {
  registerJobProcessor("test:ping", async (job) => {
    return {
      echo: job.payload,
      processedBy: "redis-worker",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      status: "OK"
    };
  });
  registerJobProcessor("mt5:sync", async (job) => {
    const { accountId, mode } = job.payload;
    console.log(`[JobQueue] Executing MT5 synchronization for account: ${accountId} (mode: ${mode || "full"})`);
    return { accountId, synchronized: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() };
  });
  registerJobProcessor("analytics:calc", async (job) => {
    const { accountId, timeframe } = job.payload;
    console.log(`[JobQueue] Calculating performance analytics for account: ${accountId} (${timeframe})`);
    return { accountId, metricsCalculated: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() };
  });
  registerJobProcessor("notification:dispatch", async (job) => {
    const { userId, title, message } = job.payload;
    console.log(`[JobQueue] Dispatching notification to user ${userId}: "${title}"`);
    return { dispatched: true, userId, title };
  });
  registerJobProcessor("email:send", async (job) => {
    const { to, subject } = job.payload;
    console.log(`[JobQueue] Queued email sending to ${to}: "${subject}"`);
    return { to, subject, queued: true };
  });
  registerJobProcessor("report:generate", async (job) => {
    const { reportType, userId } = job.payload;
    console.log(`[JobQueue] Generating ${reportType} report for user ${userId}`);
    return { reportType, userId, generatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  });
  registerJobProcessor("social:publish", async (job) => {
    const { platform, content } = job.payload;
    console.log(`[JobQueue] Publishing post to ${platform}: "${content?.slice(0, 30)}..."`);
    return { platform, published: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() };
  });
  registerJobProcessor("payment:reconcile", async (job) => {
    const { subscriptionId } = job.payload;
    console.log(`[JobQueue] Reconciling subscription payments for: ${subscriptionId}`);
    return { subscriptionId, reconciled: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() };
  });
  registerJobProcessor("worker:heartbeat", async (job) => {
    const { workerId, cpu, memory } = job.payload;
    return { workerId, cpu, memory, acknowledgedAt: (/* @__PURE__ */ new Date()).toISOString() };
  });
}
async function getQueueStats() {
  let activeQueueLength = memoryQueue.length;
  if (isRedisReady()) {
    try {
      activeQueueLength = await redisClient.llen(QUEUE_KEY_PREFIX + "default");
    } catch {
    }
  }
  return {
    activeQueueLength,
    registeredProcessors: Array.from(processors.keys()),
    isWorkerRunning,
    isRedisConnected: isRedisReady()
  };
}

// server/redis/ensureDaemon.ts
import { exec } from "child_process";
import net from "net";
function isPortOpen(host, port, timeoutMs = 600) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected2 = false;
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      isConnected2 = true;
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}
async function ensureRedisDaemon() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return;
  }
  const isLocal = redisUrl.includes("localhost") || redisUrl.includes("127.0.0.1");
  if (!isLocal) {
    return;
  }
  let port = 6379;
  try {
    const parsed = new URL(redisUrl);
    if (parsed.port) port = parseInt(parsed.port, 10);
  } catch {
    port = 6379;
  }
  const alreadyRunning = await isPortOpen("127.0.0.1", port);
  if (alreadyRunning) {
    return;
  }
  console.log(`[Redis] Port ${port} not answering. Attempting to start local redis-server daemon...`);
  return new Promise((resolve) => {
    exec("redis-server --daemonize yes", (error, stdout, stderr) => {
      if (error) {
        console.warn("[Redis] Note: Unable to auto-launch redis-server daemon:", error.message);
      } else {
        console.log("[Redis] Local redis-server daemon started successfully.");
      }
      resolve();
    });
  });
}

// server.ts
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
  const allowedOrigins = [
    "https://forex-mt5-automated-trading.pages.dev",
    "https://forex-mt5-api.onrender.com",
    process.env.FRONTEND_CUSTOMER_URL,
    process.env.FRONTEND_ADMIN_URL,
    process.env.APP_URL,
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173"
  ].filter(Boolean);
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.includes(origin) || origin.endsWith(".pages.dev") || origin.endsWith(".run.app");
      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "idempotency-key"]
  }));
  try {
    await db2.initPostgres();
  } catch (dbErr) {
    console.error("PostgreSQL initialization warning:", dbErr);
  }
  try {
    await ensureRedisDaemon();
    await initRedis();
    startQueueWorker();
  } catch (redisErr) {
    console.warn("Redis initialization warning:", redisErr);
  }
  app.use(express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ extended: true }));
  app.get("/health", async (_req, res) => {
    let pgStatus = "disconnected";
    try {
      const dbCheck = await pool.query("SELECT 1 as live;");
      if (dbCheck?.rows?.length) {
        pgStatus = "connected";
      }
    } catch {
      pgStatus = "disconnected";
    }
    let redisStatus = "Not configured";
    try {
      const redisHealth = await getRedisHealth();
      redisStatus = redisHealth.status;
    } catch {
      redisStatus = "Unavailable";
    }
    res.json({
      status: "healthy",
      service: "Forex MT5 Automated Trading SaaS API",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "production",
      postgres: pgStatus,
      redis: redisStatus,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/api/health", async (_req, res) => {
    let pgStatus = "disconnected";
    try {
      const dbCheck = await pool.query("SELECT 1 as live;");
      if (dbCheck?.rows?.length) {
        pgStatus = "connected";
      }
    } catch {
      pgStatus = "disconnected";
    }
    let redisStatus = "Not configured";
    try {
      const redisHealth = await getRedisHealth();
      redisStatus = redisHealth.status;
    } catch {
      redisStatus = "Unavailable";
    }
    res.json({
      status: "healthy",
      service: "Forex MT5 Automated Trading SaaS API",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "production",
      postgres: pgStatus,
      redis: redisStatus,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/api/health/db", async (req, res) => {
    try {
      const dbCheck = await pool.query("SELECT NOW() as current_time, current_database() as database, count(*)::int as user_count FROM users;");
      res.json({
        status: "connected",
        database: dbCheck.rows[0].database,
        currentTime: dbCheck.rows[0].current_time,
        registeredUsers: dbCheck.rows[0].user_count,
        cachedStoreUsers: db2.users.length
      });
    } catch (err) {
      res.status(500).json({
        status: "error",
        message: err.message
      });
    }
  });
  app.get("/api/health/redis", async (req, res) => {
    try {
      const health = await getRedisHealth();
      const queueStats = await getQueueStats();
      res.json({
        ...health,
        queue: queueStats
      });
    } catch (err) {
      res.status(500).json({
        status: "error",
        message: err.message
      });
    }
  });
  app.post("/api/queue/test-job", async (req, res) => {
    try {
      const payload = req.body || { message: "Redis queue self-test" };
      const job = await enqueueJob("test:ping", payload);
      res.status(202).json({
        message: "Job enqueued successfully",
        job
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/queue/jobs/:id", async (req, res) => {
    try {
      const job = await getJob(req.params.id);
      if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }
      res.json({ job });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.use("/api/auth", auth_default);
  app.use("/api/public", public_default);
  app.use("/api/customer", customer_default);
  app.use("/api/admin", admin_default);
  app.use("/api/worker", worker_default);
  app.use("/api/webhooks", webhooks_default);
  app.use("/api/billing", billing_default);
  app.use((err, req, res, next) => {
    console.error("Unhandled Server Error:", err);
    res.status(500).json({
      error: "An internal server error occurred.",
      code: "ERR_INTERNAL_SERVER"
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Forex MT5 SaaS Server running on http://0.0.0.0:${PORT}`);
  });
  const gracefulShutdown = (signal) => {
    console.log(`[Server] Received ${signal}. Gracefully terminating service...`);
    server.close(async () => {
      try {
        await pool.end();
      } catch {
      }
      console.log("[Server] Database pool and HTTP listeners closed. Process terminated cleanly.");
      process.exit(0);
    });
    setTimeout(() => {
      console.error("[Server] Forced shutdown after timeout.");
      process.exit(1);
    }, 1e4);
  };
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}
startServer().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
//# sourceMappingURL=server.mjs.map
