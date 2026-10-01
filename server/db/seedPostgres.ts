import { pool, db } from '../../src/db/index.js';
import { 
  roles, 
  permissions, 
  rolePermissions, 
  users, 
  userProfiles, 
  userRoles, 
  subscriptionPlans, 
  algorithms, 
  algorithmVersions,
  mt5Accounts,
  subscriptions,
  payments,
  riskProfiles,
  auditLogs,
  workerHealth
} from '../../src/db/schema.js';
import { hashPassword } from '../security/encryption.js';
import { eq } from 'drizzle-orm';

export const SEED_IDS = {
  superAdmin: '00000000-0000-4000-8000-000000000001',
  riskOfficer: '00000000-0000-4000-8000-000000000002',
  supportLead: '00000000-0000-4000-8000-000000000003',
  customerAlex: '00000000-0000-4000-8000-000000000004',
  customerSarah: '00000000-0000-4000-8000-000000000005',
  planStarter: '10000000-0000-4000-8000-000000000001',
  planPro: '10000000-0000-4000-8000-000000000002',
  planElite: '10000000-0000-4000-8000-000000000003',
  planQuarterly: '10000000-0000-4000-8000-000000000004',
  planBiannual: '10000000-0000-4000-8000-000000000005',
  planProfitShare: '10000000-0000-4000-8000-000000000006',
  algoFalcon: '20000000-0000-4000-8000-000000000001',
  algoTitan: '20000000-0000-4000-8000-000000000002',
  algoMatrix: '20000000-0000-4000-8000-000000000003',
  mt5AlexLive: '30000000-0000-4000-8000-000000000001',
  mt5AlexDemo: '30000000-0000-4000-8000-000000000002',
  mt5SarahLive: '30000000-0000-4000-8000-000000000003',
};

export async function seedPostgres() {
  console.log('[PostgreSQL Seed] Initializing database tables with baseline configurations...');

  // 1. Roles
  const rolesList = [
    { id: 'super_admin', name: 'Super Administrator', description: 'Full system authorization with global operational controls' },
    { id: 'risk_officer', name: 'Risk Management Officer', description: 'Real-time surveillance, kill switches, and risk compliance' },
    { id: 'support', name: 'Customer Support Representative', description: 'Ticket triage, customer diagnostic support, view-only accounts' },
    { id: 'customer', name: 'Trading Subscriber / Customer', description: 'Personal MT5 terminal connection and automated strategy management' },
  ];

  for (const r of rolesList) {
    await db.insert(roles).values(r).onConflictDoNothing();
  }

  // 2. Permissions
  const permissionsList = [
    { id: 'users:read', category: 'users', description: 'View user profiles and accounts' },
    { id: 'users:write', category: 'users', description: 'Create and modify user profiles' },
    { id: 'trading:read', category: 'trading', description: 'View trade signals, orders, and positions' },
    { id: 'trading:execute', category: 'trading', description: 'Execute algorithmic orders' },
    { id: 'trading:close', category: 'trading', description: 'Emergency position close' },
    { id: 'algorithms:read', category: 'algorithms', description: 'View algorithmic strategies and versions' },
    { id: 'algorithms:manage', category: 'algorithms', description: 'Deploy and modify trading algorithms' },
    { id: 'risk:read', category: 'risk', description: 'View risk profiles and exposure metrics' },
    { id: 'risk:write', category: 'risk', description: 'Adjust risk ceilings and lot limits' },
    { id: 'risk:kill_switch', category: 'risk', description: 'Trigger emergency execution circuit breakers' },
    { id: 'audit:read', category: 'audit', description: 'Inspect tamper-evident audit trails' },
    { id: 'system:read', category: 'system', description: 'Inspect terminal worker fleet health' },
    { id: 'system:manage', category: 'system', description: 'Manage worker clusters and infrastructure' },
    { id: 'finance:read', category: 'finance', description: 'View billing history and revenue metrics' },
    { id: 'finance:manage', category: 'finance', description: 'Modify plans and issue invoices' },
    { id: 'support:read', category: 'support', description: 'View customer support tickets' },
    { id: 'support:reply', category: 'support', description: 'Respond to customer support tickets' },
  ];

  for (const p of permissionsList) {
    await db.insert(permissions).values(p).onConflictDoNothing();
  }

  // 3. Role Permissions
  const superAdminRolePerms = permissionsList.map(p => ({ roleId: 'super_admin', permissionId: p.id }));
  for (const rp of superAdminRolePerms) {
    await db.insert(rolePermissions).values(rp).onConflictDoNothing();
  }

  // 4. Subscription Plans (Monthly, 3-Month, 6-Month, Yearly, Profit-Share)
  const plans = [
    {
      id: SEED_IDS.planStarter,
      code: 'MONTHLY_PLAN',
      name: 'Monthly Quant Plan',
      description: 'Full automated execution on retail and prop firm accounts with 30-day flexibility.',
      interval: 'monthly',
      priceUsd: '99.00',
      profitSharePct: '0.00',
      maxMt5Accounts: 1,
      maxTradingVolumeLots: '25.00',
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
      id: SEED_IDS.planQuarterly,
      code: 'QUARTERLY_3M_PLAN',
      name: '3-Month Quant Plan',
      description: 'Quarterly commitment with 10% discount for consistent algorithmic compounding.',
      interval: 'quarterly',
      priceUsd: '269.00',
      profitSharePct: '0.00',
      maxMt5Accounts: 2,
      maxTradingVolumeLots: '50.00',
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
      id: SEED_IDS.planBiannual,
      code: 'BIANNUAL_6M_PLAN',
      name: '6-Month Quant Plan',
      description: 'Half-year semi-annual portfolio allocation with advanced risk management.',
      interval: 'biannual',
      priceUsd: '499.00',
      profitSharePct: '0.00',
      maxMt5Accounts: 4,
      maxTradingVolumeLots: '100.00',
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
      id: SEED_IDS.planElite,
      code: 'YEARLY_ANNUAL_PLAN',
      name: 'Yearly Institutional Plan',
      description: 'Maximum annual savings for high-capital traders, hedge accounts, and prop managers.',
      interval: 'yearly',
      priceUsd: '899.00',
      profitSharePct: '0.00',
      maxMt5Accounts: 10,
      maxTradingVolumeLots: '500.00',
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
      id: SEED_IDS.planProfitShare,
      code: 'PERFORMANCE_PROFIT_SHARE',
      name: 'High-Water Mark Profit Share',
      description: '$0 upfront fee. We only succeed when your trading balance achieves new net profits.',
      interval: 'profit_share',
      priceUsd: '0.00',
      profitSharePct: '20.00',
      maxMt5Accounts: 2,
      maxTradingVolumeLots: '100.00',
      features: [
        'Zero Upfront Subscription Fee',
        '20% Monthly High-Water Mark Performance Fee',
        'Institutional Grade Algorithm Allocation',
        'Transparent Audit Statements & Invoicing',
        'Strict Drawdown Protection & Stop-Loss Safeguards',
      ],
      isActive: true,
    },
  ];

  for (const pl of plans) {
    await db.insert(subscriptionPlans).values(pl).onConflictDoNothing();
  }

  // 5. Algorithms
  const algos = [
    {
      id: SEED_IDS.algoFalcon,
      code: 'ALGO_TREND_FALCON',
      name: 'Alpha Trend Falcon v2.4',
      description: 'Multi-timeframe dynamic momentum algorithm optimized for major FX pairs (EURUSD, GBPUSD).',
      strategyType: 'trend_following',
      riskTier: 'low',
      isActive: true,
    },
    {
      id: SEED_IDS.algoTitan,
      code: 'ALGO_SCALP_TITAN',
      name: 'Scalp Sniper Titan v1.9',
      description: 'High-frequency Asian session mean-reversion algorithm designed for tight spreads and low volatility.',
      strategyType: 'scalping',
      riskTier: 'medium',
      isActive: true,
    },
    {
      id: SEED_IDS.algoMatrix,
      code: 'ALGO_GRID_MATRIX',
      name: 'Grid Arbitrage Matrix v3.1',
      description: 'Hedging and range-bound basket manager that capitalizes on correlated currency pairs (EURGBP, AUDNZD).',
      strategyType: 'grid_hedging',
      riskTier: 'high',
      isActive: true,
    },
  ];

  for (const a of algos) {
    await db.insert(algorithms).values(a).onConflictDoNothing();
  }

  // 6. Users (Admins and Customers)
  const usersToSeed = [
    {
      id: SEED_IDS.superAdmin,
      email: 'superadmin@forexsaas.com',
      firstName: 'Chief',
      lastName: 'Administrator',
      password: 'SuperAdmin123!',
      role: 'super_admin',
    },
    {
      id: SEED_IDS.riskOfficer,
      email: 'risk@forexsaas.com',
      firstName: 'Marcus',
      lastName: 'Vance',
      password: 'RiskManager123!',
      role: 'risk_officer',
    },
    {
      id: SEED_IDS.supportLead,
      email: 'support@forexsaas.com',
      firstName: 'Elena',
      lastName: 'Rostova',
      password: 'SupportDesk123!',
      role: 'support',
    },
    {
      id: SEED_IDS.customerAlex,
      email: 'alex.morgan@example.com',
      firstName: 'Alex',
      lastName: 'Morgan',
      password: 'CustomerPass123!',
      role: 'customer',
    },
    {
      id: SEED_IDS.customerSarah,
      email: 'sarah.chen@example.com',
      firstName: 'Sarah',
      lastName: 'Chen',
      password: 'CustomerPass123!',
      role: 'customer',
    },
  ];

  for (const u of usersToSeed) {
    const auth = hashPassword(u.password);
    // Check if user exists by email
    const existing = await db.select().from(users).where(eq(users.email, u.email));
    let userId = u.id;
    if (existing.length === 0) {
      await db.insert(users).values({
        id: u.id,
        email: u.email,
        passwordHash: auth.hash,
        salt: auth.salt,
        isEmailVerified: true,
        status: 'active',
        kycStatus: 'verified',
      }).onConflictDoNothing();

      await db.insert(userProfiles).values({
        userId: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        country: 'US',
        timezone: 'UTC',
      }).onConflictDoNothing();

      await db.insert(userRoles).values({
        userId: u.id,
        roleId: u.role,
      }).onConflictDoNothing();
    } else {
      userId = existing[0].id;
    }

    // Seed risk profile for customers
    if (u.role === 'customer') {
      await db.insert(riskProfiles).values({
        userId: userId,
        riskTier: 'moderate',
        maxDailyLossPct: '3.00',
        maxDrawdownPct: '8.00',
        maxLotSize: '2.00',
        maxOpenTrades: 5,
        emergencyStop: false,
      }).onConflictDoNothing();
    }
  }

  // 7. Worker Health Nodes
  const workers = [
    {
      id: 'worker-lon-01',
      workerName: 'London LD4 Primary Engine #1',
      region: 'eu-west-london-ld4',
      status: 'online',
      activeTerminals: 24,
      cpuPercent: '18.40',
      memoryPercent: '42.10',
      pingLatencyMs: 1,
    },
    {
      id: 'worker-ny-01',
      workerName: 'New York NY4 Secondary Engine #2',
      region: 'us-east-ny4',
      status: 'online',
      activeTerminals: 19,
      cpuPercent: '14.20',
      memoryPercent: '38.60',
      pingLatencyMs: 2,
    },
  ];

  for (const w of workers) {
    await db.insert(workerHealth).values(w).onConflictDoNothing();
  }

  console.log('[PostgreSQL Seed] Baseline configurations successfully synchronized to Cloud SQL PostgreSQL.');
}
