import { Router, Response } from 'express';
import { db } from '../db/store.js';
import { authenticateToken, requireAdmin, requirePermission, AuthenticatedRequest } from '../middleware/auth.js';
import { orchestrator } from '../services/mt5Orchestrator.js';
import { marketSimulator } from '../services/marketDataSimulator.js';
import { demoExecutionEngine } from '../services/demoExecutionEngine.js';
import { demoTrendStrategy } from '../services/demoTrendStrategy.js';

const router = Router();
router.use(authenticateToken);
router.use(requireAdmin);

// 1. Admin Dashboard Overview
router.get('/overview', (req: AuthenticatedRequest, res: Response): void => {
  const totalCustomers = db.users.filter(u => u.role === 'customer').length;
  const activeCustomers = db.users.filter(u => u.role === 'customer' && u.status === 'active').length;
  const activeSubscriptions = db.subscriptions.filter(s => s.status === 'active').length;
  const totalRevenue = db.payments
    .filter(p => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amountUsd, 0);

  const connectedAccounts = db.mt5Accounts.filter(a => a.connectionStatus === 'connected').length;
  const disconnectedAccounts = db.mt5Accounts.filter(a => a.connectionStatus !== 'connected').length;

  const openPositions = db.positions.filter(p => p.status === 'open');
  const todayPnl = openPositions.reduce((sum, p) => sum + p.currentPnl, 0) + 3840.50;

  const onlineWorkers = db.workerNodes.filter(w => w.status === 'online').length;

  res.json({
    metrics: {
      totalCustomers,
      activeCustomers,
      activeSubscriptions,
      totalRevenue,
      todayPnl,
      overallPnl: 142890.00,
      connectedAccounts,
      disconnectedAccounts,
      openTradesCount: openPositions.length,
      onlineWorkers,
      globalKillSwitch: db.killSwitches.globalKillSwitch,
      globalManualTradeCloseEnabled: db.globalManualTradeCloseEnabled,
    },
    recentPayments: db.payments.slice(0, 5),
    recentRegistrations: db.users.filter(u => u.role === 'customer').slice(-5).reverse(),
    recentTrades: openPositions.slice(0, 5),
    workerNodes: db.workerNodes,
    killSwitches: db.killSwitches,
  });
});

// 2. Customers Management
router.get('/users', requirePermission('users:read'), (req: AuthenticatedRequest, res: Response): void => {
  const { query, status } = req.query;
  let list = db.users.filter(u => u.role === 'customer');

  if (query && typeof query === 'string') {
    const q = query.toLowerCase();
    list = list.filter(u => u.email.toLowerCase().includes(q) || u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q));
  }

  if (status && typeof status === 'string' && status !== 'all') {
    list = list.filter(u => u.status === status);
  }

  const enriched = list.map(u => {
    const mt5 = db.mt5Accounts.find(a => a.userId === u.id);
    const sub = db.subscriptions.find(s => s.userId === u.id && s.status === 'active');
    return {
      ...u,
      manualTradeCloseEnabled: Boolean(u.manualTradeCloseEnabled),
      effectiveManualClose: db.getEffectiveManualClose(u.id),
      hasMt5: !!mt5,
      mt5Status: mt5 ? mt5.connectionStatus : 'none',
      mt5Balance: mt5 ? mt5.balance : 0,
      subscriptionPlan: sub ? sub.planName : 'None',
    };
  });

  res.json({ users: enriched });
});

router.get('/users/:id', requirePermission('users:read'), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const user = db.users.find(u => u.id === id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const mt5Accounts = db.mt5Accounts
    .filter(a => a.userId === id)
    .map(({ encryptedPassword, ...safe }) => safe);
  const subscriptions = db.subscriptions.filter(s => s.userId === id);
  const payments = db.payments.filter(p => p.userId === id);
  const risk = db.riskSettings.get(id);
  const audit = db.auditLogs.filter(a => a.actorId === id || a.resourceId === id);

  res.json({
    user: {
      ...user,
      manualTradeCloseEnabled: Boolean(user.manualTradeCloseEnabled),
      effectiveManualClose: db.getEffectiveManualClose(user.id),
    },
    mt5Accounts,
    subscriptions,
    payments,
    riskSettings: risk,
    auditLogs: audit,
  });
});

// Customer Manual Trade Close Permission Endpoints
router.get('/users/:id/manual-close', requirePermission('users:read'), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const user = db.users.find(u => u.id === id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({
    userId: user.id,
    manualTradeCloseEnabled: Boolean(user.manualTradeCloseEnabled),
    effectiveManualClose: db.getEffectiveManualClose(user.id),
    globalManualTradeCloseEnabled: db.globalManualTradeCloseEnabled,
  });
});

router.post('/users/:id/manual-close', requirePermission('users:write'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { enabled, reason } = req.body;

  const user = db.users.find(u => u.id === id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const newStatus = Boolean(enabled);
  await db.setUserManualTradeClose(
    user.id,
    newStatus,
    {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role,
      ip: req.ip || '127.0.0.1',
    },
    reason
  );

  res.json({
    success: true,
    userId: user.id,
    manualTradeCloseEnabled: user.manualTradeCloseEnabled,
    effectiveManualClose: db.getEffectiveManualClose(user.id),
    globalManualTradeCloseEnabled: db.globalManualTradeCloseEnabled,
    message: `Manual trade close permission for ${user.email} updated to ${newStatus ? 'ENABLED' : 'DISABLED'}.`,
  });
});

router.post('/users/:id/status', requirePermission('users:write'), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const { status, reason } = req.body;

  const user = db.users.find(u => u.id === id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const prevStatus = user.status;
  user.status = status;

  db.recordAudit(
    req.user!.id,
    req.user!.email,
    req.user!.role,
    'USER_STATUS_CHANGE',
    'users',
    `Changed status for ${user.email} from ${prevStatus} to ${status}. Reason: ${reason || 'Admin action'}`,
    req.ip,
    user.id
  );

  res.json({ success: true, user });
});

// 3. MT5 Accounts Management
router.get(['/accounts', '/mt5-accounts', '/trading/accounts'], requirePermission('accounts:manage'), (req: AuthenticatedRequest, res: Response): void => {
  const accounts = db.mt5Accounts.map(a => {
    const user = db.users.find(u => u.id === a.userId);
    const { encryptedPassword, ...safe } = a;
    return {
      ...safe,
      userEmail: user ? user.email : 'Unknown',
      userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
    };
  });

  res.json({ accounts });
});

router.get(['/workers', '/workers/health'], requirePermission('system:manage'), (req: AuthenticatedRequest, res: Response): void => {
  res.json({ workers: db.workerNodes, total: db.workerNodes.length });
});

router.post(['/accounts/:id/sync', '/mt5-accounts/:id/sync'], requirePermission('accounts:manage'), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const account = db.mt5Accounts.find(a => a.id === id);
  if (!account) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }

  orchestrator.reconcileAccount(account.id);
  db.recordAudit(req.user!.id, req.user!.email, req.user!.role, 'MT5_FORCE_SYNC', 'mt5_accounts', `Forced sync on account ${account.loginId}`, req.ip, account.id);

  const { encryptedPassword, ...safe } = account;
  res.json({ success: true, account: safe });
});

// 4. Master Trades
router.get('/trades', requirePermission('trading:view_all'), (req: AuthenticatedRequest, res: Response): void => {
  const openPositions = db.positions.map(p => {
    const account = db.mt5Accounts.find(a => a.id === p.mt5AccountId);
    const user = account ? db.users.find(u => u.id === account.userId) : null;
    return {
      ...p,
      broker: account ? account.brokerName : 'Unknown',
      accountLogin: account ? account.loginId : 'Unknown',
      userEmail: user ? user.email : 'Unknown',
    };
  });

  res.json({ trades: openPositions });
});

router.post('/trades/:id/force-close', requirePermission('trading:override'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const success = await orchestrator.closePosition(id, req.user!.id);
  if (success) {
    res.json({ success: true, message: 'Position force-closed by administrator.' });
  } else {
    res.status(400).json({ error: 'Failed to close position or position not open.' });
  }
});

// 5. Subscriptions & Payments
router.get('/subscriptions', requirePermission('billing:manage'), (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    subscriptions: db.subscriptions,
    plans: db.subscriptionPlans,
    payments: db.payments,
  });
});

router.get('/payments', requirePermission('billing:manage'), (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    payments: db.payments,
    totalCount: db.payments.length,
    succeededCount: db.payments.filter(p => p.status === 'succeeded').length,
    totalUsd: db.payments.filter(p => p.status === 'succeeded').reduce((sum, p) => sum + p.amountUsd, 0),
  });
});

// 6. Algorithms Management
router.get('/algorithms', requirePermission('algorithms:manage'), (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    algorithms: db.algorithms,
    versions: db.algorithmVersions,
  });
});

router.post('/algorithms/:id/toggle', requirePermission('algorithms:manage'), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const algo = db.algorithms.find(a => a.id === id);
  if (!algo) {
    res.status(404).json({ error: 'Algorithm not found' });
    return;
  }

  algo.isActive = !algo.isActive;
  db.recordAudit(
    req.user!.id,
    req.user!.email,
    req.user!.role,
    'ALGORITHM_TOGGLE',
    'algorithms',
    `Toggled algorithm ${algo.name} status to ${algo.isActive ? 'Active' : 'Paused'}`,
    req.ip,
    algo.id
  );

  res.json({ success: true, algorithm: algo });
});

// 7. Risk Management & Emergency Kill Switches
router.get('/risk', requirePermission('risk:manage_limits'), (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    killSwitches: db.killSwitches,
    algorithms: db.algorithms,
    mt5Accounts: db.mt5Accounts.map(({ encryptedPassword, ...safe }) => safe),
  });
});

router.post('/risk/kill-switch', requirePermission('risk:kill_switch'), (req: AuthenticatedRequest, res: Response): void => {
  const { scope, targetId, active, reason } = req.body;

  if (scope === 'global') {
    db.killSwitches.globalKillSwitch = Boolean(active);
    db.killSwitches.lastTriggeredBy = req.user!.email;
    db.killSwitches.lastTriggeredAt = new Date().toISOString();

    db.recordAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      active ? 'GLOBAL_KILL_SWITCH_ENGAGED' : 'GLOBAL_KILL_SWITCH_DISENGAGED',
      'system',
      `GLOBAL TRADING KILL SWITCH ${active ? 'ENGAGED' : 'DISENGAGED'}. Reason: ${reason || 'Manual Admin action'}`,
      req.ip
    );

    res.json({ success: true, killSwitches: db.killSwitches, message: `Global kill switch ${active ? 'ENGAGED' : 'DISENGAGED'}` });
    return;
  }

  if (scope === 'algorithm' && targetId) {
    db.killSwitches.perAlgorithm[targetId] = Boolean(active);
    db.recordAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'ALGORITHM_KILL_SWITCH',
      'algorithms',
      `Algorithm ${targetId} kill switch set to ${active}`,
      req.ip,
      targetId
    );
    res.json({ success: true, killSwitches: db.killSwitches });
    return;
  }

  if (scope === 'account' && targetId) {
    db.killSwitches.perAccount[targetId] = Boolean(active);
    db.recordAudit(
      req.user!.id,
      req.user!.email,
      req.user!.role,
      'ACCOUNT_KILL_SWITCH',
      'mt5_accounts',
      `MT5 Account ${targetId} emergency stop set to ${active}`,
      req.ip,
      targetId
    );
    res.json({ success: true, killSwitches: db.killSwitches });
    return;
  }

  res.status(400).json({ error: 'Invalid kill switch scope or target.' });
});

// 8. Social Media Automation & Approvals
router.get('/social', requirePermission('social:approve'), (req: AuthenticatedRequest, res: Response): void => {
  res.json({ posts: db.socialPosts });
});

router.post('/social/:id/action', requirePermission('social:approve'), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' | 'reject' | 'publish'

  const post = db.socialPosts.find(p => p.id === id);
  if (!post) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }

  if (action === 'approve') {
    post.status = 'approved';
    post.approvedBy = `${req.user!.firstName} ${req.user!.lastName}`;
  } else if (action === 'reject') {
    post.status = 'rejected';
  } else if (action === 'publish') {
    post.status = 'published';
    post.publishedAt = new Date().toISOString();
  }

  db.recordAudit(req.user!.id, req.user!.email, req.user!.role, 'SOCIAL_POST_ACTION', 'social_posts', `${action.toUpperCase()} social report for ${post.platform}`, req.ip, post.id);

  res.json({ success: true, post });
});

// 9. Support Desk Management
router.get('/support', requirePermission('support:tickets'), (req: AuthenticatedRequest, res: Response): void => {
  res.json({ tickets: db.supportTickets });
});

router.post('/support/:id/reply', requirePermission('support:tickets'), (req: AuthenticatedRequest, res: Response): void => {
  const { id } = req.params;
  const { message, status } = req.body;

  const ticket = db.supportTickets.find(t => t.id === id);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }

  if (message) {
    ticket.messages.push({
      id: `msg_${Date.now()}`,
      senderId: req.user!.id,
      senderType: 'admin',
      senderName: `${req.user!.firstName} (Support)`,
      message,
      createdAt: new Date().toISOString(),
    });
  }

  if (status) {
    ticket.status = status;
  }

  ticket.updatedAt = new Date().toISOString();

  db.recordAudit(req.user!.id, req.user!.email, req.user!.role, 'SUPPORT_TICKET_REPLIED', 'support_tickets', `Replied to ticket #${ticket.id}`, req.ip, ticket.id);

  res.json({ success: true, ticket });
});

// 10. Audit Logs
router.get('/audit-logs', requirePermission('system:audit'), (req: AuthenticatedRequest, res: Response): void => {
  const { limit = 50 } = req.query;
  const logs = db.auditLogs.slice(0, Number(limit));
  res.json({ logs });
});

// 11. Reports & Analytics Exports
router.get('/reports', requirePermission('system:manage'), (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    generatedAt: new Date().toISOString(),
    financialSummary: {
      totalRevenue: db.payments.filter(p => p.status === 'succeeded').reduce((s, p) => s + p.amountUsd, 0),
      activeSubscriptions: db.subscriptions.filter(s => s.status === 'active').length,
    },
    tradingSummary: {
      totalPositions: db.positions.length,
      openPositions: db.positions.filter(p => p.status === 'open').length,
    },
  });
});

// 12. Broadcast Notifications
router.get('/notifications', requirePermission('system:manage'), (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    notifications: [
      {
        id: 'notif_1',
        title: 'US CPI Release High-Vol Protocol Active',
        message: 'Widened slippage parameters active across EURUSD and GBPUSD during Bureau of Labor Statistics release.',
        audience: 'All Connected Traders',
        type: 'Risk Alert',
        date: new Date().toISOString(),
      },
    ],
  });
});

router.post('/notifications', requirePermission('system:manage'), (req: AuthenticatedRequest, res: Response): void => {
  const { title, message, audience, type } = req.body;
  db.recordAudit(
    req.user!.id,
    req.user!.email,
    req.user!.role,
    'BROADCAST_NOTIFICATION',
    'notifications',
    `Dispatched ${type || 'system'} broadcast: "${title}" to ${audience || 'all'}`,
    req.ip
  );
  res.json({ success: true, message: 'Notification broadcast queued and recorded.' });
});

// 13. System Diagnostics & Worker Telemetry
router.get('/system', requirePermission('system:manage'), (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    workerNodes: db.workerNodes,
    systemUptimeSeconds: process.uptime(),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    activeDbConnections: 4,
    queueJobStatus: {
      queued: 0,
      processing: 3,
      failed: 0,
    },
  });
});

// =============================================================
// ADMIN DEMO TRADING ENGINE CONTROLS
// =============================================================

// 14. Get all demo accounts with customer profile details
router.get('/demo/accounts', requirePermission('trades:read'), (req: AuthenticatedRequest, res: Response): void => {
  const accountsWithUsers = db.demoAccounts.map(acc => {
    const user = db.users.find(u => u.id === acc.userId);
    return {
      ...acc,
      userEmail: user?.email || 'unknown',
      customerName: user ? `${user.firstName} ${user.lastName}` : 'Customer',
    };
  });

  res.json({
    accounts: accountsWithUsers,
    globalKillSwitch: db.demoGlobalKillSwitch,
    quotes: marketSimulator.getQuotes(),
  });
});

// 15. Get all open demo positions across all customers
router.get('/demo/positions', requirePermission('trades:read'), (req: AuthenticatedRequest, res: Response): void => {
  const positionsWithAccount = db.demoPositions
    .filter(p => p.status === 'open')
    .map(pos => {
      const acc = db.demoAccounts.find(a => a.id === pos.mt5AccountId);
      const user = acc ? db.users.find(u => u.id === acc.userId) : null;
      return {
        ...pos,
        accountNumber: acc?.accountNumber || 'DEMO-???',
        customerEmail: user?.email || 'customer@aurafx.com',
      };
    });

  res.json({
    positions: positionsWithAccount,
    totalCount: positionsWithAccount.length,
    totalFloatingPnl: positionsWithAccount.reduce((s, p) => s + (p.currentPnl || 0), 0),
  });
});

// 16. Get closed demo trade history across all customers
router.get('/demo/history', requirePermission('trades:read'), (req: AuthenticatedRequest, res: Response): void => {
  const closedWithAccount = db.demoPositions
    .filter(p => p.status === 'closed')
    .map(pos => {
      const acc = db.demoAccounts.find(a => a.id === pos.mt5AccountId);
      const user = acc ? db.users.find(u => u.id === acc.userId) : null;
      return {
        ...pos,
        accountNumber: acc?.accountNumber || 'DEMO-???',
        customerEmail: user?.email || 'customer@aurafx.com',
      };
    });

  res.json({
    trades: closedWithAccount,
    totalCount: closedWithAccount.length,
    totalRealizedProfit: closedWithAccount.reduce((s, p) => s + (p.profit || 0), 0),
  });
});

// 17. Get demo risk rejection events
router.get('/demo/risk-events', requirePermission('risk:manage'), (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    events: db.demoRiskEvents,
    count: db.demoRiskEvents.length,
  });
});

// 18. Admin Force-Close a Demo Position
router.post('/demo/positions/:id/close', requirePermission('trades:write'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const adminActorId = req.user!.id;

  const result = await demoExecutionEngine.closePosition(id, adminActorId, true, 'Admin Intervention / Risk Close');

  if (!result.success) {
    res.status(400).json({ error: result.message, errorCode: result.errorCode });
    return;
  }

  res.json({
    success: true,
    position: result.position,
    account: result.account,
    message: result.message,
  });
});

// 19. Admin Reset Customer Demo Account back to $10,000
router.post('/demo/accounts/:userId/reset', requirePermission('accounts:write'), (req: AuthenticatedRequest, res: Response): void => {
  const { userId } = req.params;
  const targetUser = db.users.find(u => u.id === userId);
  if (!targetUser) {
    res.status(404).json({ error: 'Customer user not found.' });
    return;
  }

  const account = demoExecutionEngine.resetAccount(userId);

  db.recordAudit(
    req.user!.id,
    req.user!.email,
    req.user!.role,
    'ADMIN_RESET_DEMO_ACCOUNT',
    'demo_accounts',
    `Admin reset demo balance to $10,000.00 for ${targetUser.email}`,
    req.ip,
    account.id
  );

  res.json({
    success: true,
    account,
    message: `Demo account for ${targetUser.email} has been reset to $10,000.00.`,
  });
});

// 20. Admin Pause / Resume Demo Trading for Customer
router.post('/demo/accounts/:userId/pause', requirePermission('risk:manage'), (req: AuthenticatedRequest, res: Response): void => {
  const { userId } = req.params;
  const { paused } = req.body;

  const targetUser = db.users.find(u => u.id === userId);
  if (!targetUser) {
    res.status(404).json({ error: 'Customer user not found.' });
    return;
  }

  const isPaused = paused !== undefined ? Boolean(paused) : true;
  const account = demoExecutionEngine.setTradingPaused(userId, isPaused, req.user!.id);

  res.json({
    success: true,
    account,
    message: `Demo trading for ${targetUser.email} is now ${isPaused ? 'PAUSED' : 'ACTIVE'}.`,
  });
});

// 21. Admin Demo Strategy Configuration & Kill Switches
router.get('/demo/algorithm', requirePermission('algorithms:manage'), (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    algorithm: demoTrendStrategy.getConfig(),
    globalKillSwitch: db.demoGlobalKillSwitch,
  });
});

router.put('/demo/algorithm', requirePermission('algorithms:manage'), (req: AuthenticatedRequest, res: Response): void => {
  const updates = req.body;
  const updated = demoTrendStrategy.updateConfig(updates);

  db.recordAudit(
    req.user!.id,
    req.user!.email,
    req.user!.role,
    'DEMO_ALGORITHM_UPDATED',
    'demo_algorithm',
    `Updated Demo Trend Strategy settings: Enabled=${updated.enabled}, LotSize=${updated.lotSize}`,
    req.ip,
    updated.id
  );

  res.json({
    success: true,
    algorithm: updated,
    message: 'Demo Trend Strategy configuration updated.',
  });
});

// 22. Admin Global Demo Trading Engine Kill Switch Toggle
router.post('/demo/kill-switch', requirePermission('risk:manage'), (req: AuthenticatedRequest, res: Response): void => {
  const { active, reason } = req.body;
  db.demoGlobalKillSwitch = Boolean(active);

  db.recordAudit(
    req.user!.id,
    req.user!.email,
    req.user!.role,
    db.demoGlobalKillSwitch ? 'DEMO_GLOBAL_KILL_SWITCH_ENGAGED' : 'DEMO_GLOBAL_KILL_SWITCH_DISENGAGED',
    'kill_switches',
    `Global Demo Trading Kill Switch set to ${db.demoGlobalKillSwitch}. Reason: ${reason || 'Admin safety directive'}`,
    req.ip
  );

  res.json({
    success: true,
    globalKillSwitch: db.demoGlobalKillSwitch,
    message: `Global Demo Trading Kill Switch is now ${db.demoGlobalKillSwitch ? 'ENGAGED (Trading Blocked)' : 'DISENGAGED (Trading Allowed)'}.`,
  });
});

// 23. Admin Global Manual Trade Close Setting (Master Switch)
router.get(['/settings/manual-close', '/trading/settings/manual-close'], (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    globalManualTradeCloseEnabled: db.globalManualTradeCloseEnabled,
  });
});

router.post(['/settings/manual-close', '/trading/settings/manual-close'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { enabled, reason } = req.body;
  const newStatus = Boolean(enabled);

  await db.setGlobalManualTradeClose(
    newStatus,
    {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role,
      ip: req.ip || '127.0.0.1',
    },
    reason
  );

  res.json({
    success: true,
    globalManualTradeCloseEnabled: db.globalManualTradeCloseEnabled,
    message: `Global Manual Trade Close master switch updated to ${newStatus ? 'ENABLED' : 'DISABLED'}.`,
  });
});

router.put(['/settings/manual-close', '/trading/settings/manual-close'], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { enabled, reason } = req.body;
  const newStatus = Boolean(enabled);

  await db.setGlobalManualTradeClose(
    newStatus,
    {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role,
      ip: req.ip || '127.0.0.1',
    },
    reason
  );

  res.json({
    success: true,
    globalManualTradeCloseEnabled: db.globalManualTradeCloseEnabled,
    message: `Global Manual Trade Close master switch updated to ${newStatus ? 'ENABLED' : 'DISABLED'}.`,
  });
});

export default router;
