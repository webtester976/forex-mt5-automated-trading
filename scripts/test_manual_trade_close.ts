import http from 'http';
import crypto from 'crypto';
import express from 'express';
import { db } from '../server/db/store.js';
import { pool } from '../src/db/index.js';
import { orchestrator } from '../server/services/mt5Orchestrator.js';
import customerRouter from '../server/routes/customer.js';
import adminRouter from '../server/routes/admin.js';
import workerRouter from '../server/routes/worker.js';
import { generateToken } from '../server/security/encryption.js';
import { Position } from '../src/types/index.js';

interface TestResult {
  step: number;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(step: number, name: string, passed: boolean, details: string) {
  results.push({ step, name, passed, details });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Test ${step}: ${name} - ${details}`);
}

function makeRequest(
  port: number,
  path: string,
  method: string = 'GET',
  data?: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';
    const reqHeaders: http.OutgoingHttpHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (postData) {
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runManualTradeCloseTests() {
  console.log('======================================================================');
  console.log('STARTING MANUAL TRADE CLOSE PERMISSION & AUDIT TEST SUITE');
  console.log('======================================================================\n');

  // Setup express server with customer, admin, and worker routers mounted
  const app = express();
  app.use(express.json());
  app.use('/api/customer', customerRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/worker', workerRouter);

  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = (server.address() as any).port;

  // Identify users
  const adminUser = db.users.find(u => u.role === 'super_admin')!;
  const customerAlex = db.users.find(u => u.email === 'alex.morgan@example.com')!;
  const customerSarah = db.users.find(u => u.email === 'sarah.chen@example.com')!;

  const adminToken = generateToken({ userId: adminUser.id, email: adminUser.email, role: adminUser.role });
  const alexToken = generateToken({ userId: customerAlex.id, email: customerAlex.email, role: customerAlex.role });
  const sarahToken = generateToken({ userId: customerSarah.id, email: customerSarah.email, role: customerSarah.role });

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const alexHeaders = { Authorization: `Bearer ${alexToken}` };
  const sarahHeaders = { Authorization: `Bearer ${sarahToken}` };

  // Setup test MT5 accounts and positions
  let alexAccount = db.mt5Accounts.find(a => a.id === 'mt5_alex_test_acc');
  if (!alexAccount) {
    alexAccount = {
      id: 'mt5_alex_test_acc',
      userId: customerAlex.id,
      brokerName: 'MetaQuotes Ltd.',
      server: 'MetaQuotes-Demo',
      loginId: '55667788',
      accountType: 'demo',
      currency: 'USD',
      leverage: 100,
      balance: 10000,
      equity: 10000,
      margin: 0,
      freeMargin: 10000,
      marginLevel: 0,
      floatingPnl: 0,
      connectionStatus: 'connected',
      lastSyncAt: new Date().toISOString(),
    };
    db.mt5Accounts.push(alexAccount);
  }

  let sarahAccount = db.mt5Accounts.find(a => a.id === 'mt5_sarah_test_acc');
  if (!sarahAccount) {
    sarahAccount = {
      id: 'mt5_sarah_test_acc',
      userId: customerSarah.id,
      brokerName: 'Pepperstone',
      server: 'Pepperstone-Demo01',
      loginId: '99881122',
      accountType: 'demo',
      currency: 'USD',
      leverage: 100,
      balance: 15000,
      equity: 15000,
      margin: 0,
      freeMargin: 15000,
      marginLevel: 0,
      floatingPnl: 0,
      connectionStatus: 'connected',
      lastSyncAt: new Date().toISOString(),
    };
    db.mt5Accounts.push(sarahAccount);
  }

  // Create test position for Alex
  const alexPositionTicket = 88123001;
  const alexPos: Position = {
    id: `pos_alex_${alexPositionTicket}`,
    mt5AccountId: alexAccount.id,
    positionTicket: alexPositionTicket,
    symbol: 'EURUSD',
    type: 'BUY',
    lots: 1.00,
    openPrice: 1.08500,
    currentPrice: 1.08750,
    stopLoss: 1.08000,
    takeProfit: 1.09500,
    currentPnl: 250.00,
    swap: 0,
    commission: -6.00,
    status: 'open',
    openTime: new Date(Date.now() - 3600000).toISOString(),
  };
  db.positions.push(alexPos);

  // Test 1: Default State (Safe Defaults: Global OFF, User OFF) -> Close Denied with HTTP 403
  db.globalManualTradeCloseEnabled = false;
  customerAlex.manualTradeCloseEnabled = false;
  try {
    const res = await makeRequest(
      port,
      '/api/customer/trades/close',
      'POST',
      { positionId: alexPos.id },
      alexHeaders
    );
    const passed = res.status === 403 && res.body?.code === 'ERR_MANUAL_CLOSE_FORBIDDEN';
    record(1, 'Default state (Global OFF, User OFF): Close request denied with HTTP 403', passed, `HTTP Status: ${res.status}, Error: ${res.body?.error}`);
  } catch (err: any) {
    record(1, 'Default state (Global OFF, User OFF): Close request denied with HTTP 403', false, err.message);
  }

  // Test 2: Global ON, User OFF -> Close Denied with HTTP 403
  db.globalManualTradeCloseEnabled = true;
  customerAlex.manualTradeCloseEnabled = false;
  try {
    const res = await makeRequest(
      port,
      '/api/customer/trades/close',
      'POST',
      { positionId: alexPos.id },
      alexHeaders
    );
    const passed = res.status === 403 && res.body?.code === 'ERR_MANUAL_CLOSE_FORBIDDEN';
    record(2, 'Global ON, User OFF: Close request denied with HTTP 403', passed, `HTTP Status: ${res.status}, Reason: ${res.body?.reason}`);
  } catch (err: any) {
    record(2, 'Global ON, User OFF: Close request denied with HTTP 403', false, err.message);
  }

  // Test 3: Global OFF, User ON -> Close Denied with HTTP 403 (Global OFF overrides User ON)
  db.globalManualTradeCloseEnabled = false;
  customerAlex.manualTradeCloseEnabled = true;
  try {
    const res = await makeRequest(
      port,
      '/api/customer/trades/close',
      'POST',
      { positionId: alexPos.id },
      alexHeaders
    );
    const passed = res.status === 403 && res.body?.code === 'ERR_MANUAL_CLOSE_FORBIDDEN';
    record(3, 'Global OFF, User ON: Global master switch overrides and denies close with HTTP 403', passed, `HTTP Status: ${res.status}, Reason: ${res.body?.reason}`);
  } catch (err: any) {
    record(3, 'Global OFF, User ON: Global master switch overrides and denies close with HTTP 403', false, err.message);
  }

  // Test 4: Global ON, User ON -> Close Allowed with HTTP 200
  db.globalManualTradeCloseEnabled = true;
  customerAlex.manualTradeCloseEnabled = true;
  try {
    const res = await makeRequest(
      port,
      '/api/customer/trades/close',
      'POST',
      { positionId: alexPos.id },
      alexHeaders
    );
    const passed = res.status === 200 && res.body?.success === true;
    record(4, 'Global ON, User ON: Full manual close executes successfully with HTTP 200', passed, `HTTP Status: ${res.status}, Message: ${res.body?.message}`);
  } catch (err: any) {
    record(4, 'Global ON, User ON: Full manual close executes successfully with HTTP 200', false, err.message);
  }

  // Test 5: Position already closed returns HTTP 409
  try {
    const res = await makeRequest(
      port,
      '/api/customer/trades/close',
      'POST',
      { positionId: alexPos.id },
      alexHeaders
    );
    const passed = res.status === 409 && res.body?.code === 'ERR_POSITION_ALREADY_CLOSED';
    record(5, 'Already closed position returns HTTP 409', passed, `HTTP Status: ${res.status}, Error: ${res.body?.error}`);
  } catch (err: any) {
    record(5, 'Already closed position returns HTTP 409', false, err.message);
  }

  // Test 6: Non-existent position returns HTTP 404
  try {
    const res = await makeRequest(
      port,
      '/api/customer/trades/close',
      'POST',
      { positionId: 'pos_non_existent_99999' },
      alexHeaders
    );
    const passed = res.status === 404 && res.body?.code === 'ERR_POSITION_NOT_FOUND';
    record(6, 'Non-existent position returns HTTP 404', passed, `HTTP Status: ${res.status}, Error: ${res.body?.error}`);
  } catch (err: any) {
    record(6, 'Non-existent position returns HTTP 404', false, err.message);
  }

  // Test 7: Customer cannot close another customer's position (Tenant Isolation / Ownership)
  const sarahPosTicket = 88123002;
  const sarahPos: Position = {
    id: `pos_sarah_${sarahPosTicket}`,
    mt5AccountId: sarahAccount.id,
    positionTicket: sarahPosTicket,
    symbol: 'GBPUSD',
    type: 'BUY',
    lots: 0.50,
    openPrice: 1.29000,
    currentPrice: 1.29500,
    stopLoss: 1.28500,
    takeProfit: 1.30000,
    currentPnl: 250.00,
    swap: 0,
    commission: -3.00,
    status: 'open',
    openTime: new Date().toISOString(),
  };
  db.positions.push(sarahPos);

  try {
    // Alex tries to close Sarah's position
    const res = await makeRequest(
      port,
      '/api/customer/trades/close',
      'POST',
      { positionId: sarahPos.id },
      alexHeaders
    );
    const passed = res.status === 403 && res.body?.code === 'ERR_UNAUTHORIZED_POSITION_OWNERSHIP';
    record(7, 'Tenant check: Customer cannot close another user position (HTTP 403)', passed, `HTTP Status: ${res.status}, Error: ${res.body?.error}`);
  } catch (err: any) {
    record(7, 'Tenant check: Customer cannot close another user position (HTTP 403)', false, err.message);
  }

  // Test 8: Reject arbitrary parameters / partial close / BUY / SELL actions
  try {
    // Re-open a position for Alex to test parameter rejection
    const alexPos2Ticket = 88123003;
    const alexPos2: Position = {
      id: `pos_alex_${alexPos2Ticket}`,
      mt5AccountId: alexAccount.id,
      positionTicket: alexPos2Ticket,
      symbol: 'XAUUSD',
      type: 'BUY',
      lots: 1.00,
      openPrice: 2680.00,
      currentPrice: 2685.00,
      stopLoss: 2670.00,
      takeProfit: 2700.00,
      currentPnl: 500.00,
      swap: 0,
      commission: -6.00,
      status: 'open',
      openTime: new Date().toISOString(),
    };
    db.positions.push(alexPos2);

    const resVolume = await makeRequest(
      port,
      '/api/customer/trades/close',
      'POST',
      { positionId: alexPos2.id, volume: 0.5 },
      alexHeaders
    );

    const resActionBuy = await makeRequest(
      port,
      '/api/customer/trades/close',
      'POST',
      { positionId: alexPos2.id, action: 'BUY' },
      alexHeaders
    );

    const passed =
      resVolume.status === 400 &&
      resVolume.body?.code === 'ERR_FORBIDDEN_PARAMETER' &&
      resActionBuy.status === 400 &&
      resActionBuy.body?.code === 'ERR_FORBIDDEN_PARAMETER';

    record(8, 'Reject partial close volume or order action modifications (HTTP 400)', passed, `Volume reject status: ${resVolume.status}, Action reject status: ${resActionBuy.status}`);
  } catch (err: any) {
    record(8, 'Reject partial close volume or order action modifications (HTTP 400)', false, err.message);
  }

  // Test 9: Real Worker Account Integration: Customer Close queues a worker CLOSE command
  try {
    const workerWorkerId = 'worker-test-close-01';
    const realWorkerAccount: any = {
      id: 'mt5_worker_close_acc',
      userId: customerAlex.id,
      brokerName: 'MetaQuotes Ltd.',
      server: 'MetaQuotes-Demo',
      loginId: '5056419885',
      accountType: 'demo',
      currency: 'USD',
      leverage: 500,
      balance: 10000,
      equity: 10000,
      margin: 0,
      freeMargin: 10000,
      marginLevel: 0,
      floatingPnl: 0,
      connectionStatus: 'connected',
      lastSyncAt: new Date().toISOString(),
      assignedWorkerId: workerWorkerId,
    };
    db.mt5Accounts.push(realWorkerAccount);

    const workerPosTicket = 88123004;
    const workerPos: Position = {
      id: `pos_worker_${workerPosTicket}`,
      mt5AccountId: realWorkerAccount.id,
      positionTicket: workerPosTicket,
      symbol: 'XAUUSD',
      type: 'BUY',
      lots: 0.25,
      openPrice: 2685.00,
      currentPrice: 2690.00,
      stopLoss: 2675.00,
      takeProfit: 2710.00,
      currentPnl: 125.00,
      swap: 0,
      commission: -3.00,
      status: 'open',
      openTime: new Date().toISOString(),
    };
    db.positions.push(workerPos);

    const closeRes = await makeRequest(
      port,
      '/api/customer/trades/close',
      'POST',
      { positionId: workerPos.id },
      alexHeaders
    );

    const queuedCmd = db.workerCommands.find(
      c => c.mt5AccountId === realWorkerAccount.id && c.positionTicket === workerPosTicket && c.action === 'CLOSE'
    );

    const passed =
      closeRes.status === 200 &&
      closeRes.body?.success === true &&
      Boolean(queuedCmd) &&
      queuedCmd?.status === 'QUEUED' &&
      queuedCmd?.action === 'CLOSE' &&
      queuedCmd?.volume === 0.25;

    record(9, 'Real MT5 worker account: Close enqueues worker CLOSE command without bypassing queue', passed, `Queued Command ID: ${queuedCmd?.commandId}, Action: ${queuedCmd?.action}, Volume: ${queuedCmd?.volume}`);
  } catch (err: any) {
    record(9, 'Real MT5 worker account: Close enqueues worker CLOSE command without bypassing queue', false, err.message);
  }

  // Test 10: Admin APIs (Read & Update Global Setting and Customer Permission)
  try {
    // 10a. Admin updates Global Switch
    const globalRes = await makeRequest(
      port,
      '/api/admin/settings/manual-close',
      'POST',
      { enabled: false, reason: 'Security maintenance' },
      adminHeaders
    );

    // 10b. Admin updates Customer Sarah permission
    const userRes = await makeRequest(
      port,
      `/api/admin/users/${customerSarah.id}/manual-close`,
      'POST',
      { enabled: true, reason: 'Customer requested trade close ability' },
      adminHeaders
    );

    // 10c. Customer cannot access admin settings endpoint
    const customerUnauthorizedRes = await makeRequest(
      port,
      '/api/admin/settings/manual-close',
      'POST',
      { enabled: true },
      alexHeaders
    );

    const passed =
      globalRes.status === 200 &&
      globalRes.body?.globalManualTradeCloseEnabled === false &&
      userRes.status === 200 &&
      userRes.body?.manualTradeCloseEnabled === true &&
      customerUnauthorizedRes.status === 403;

    record(10, 'Admin APIs: Global switch & customer permissions managed strictly by Admin', passed, `Global update status: ${globalRes.status}, User update status: ${userRes.status}, Customer unauthorized status: ${customerUnauthorizedRes.status}`);
  } catch (err: any) {
    record(10, 'Admin APIs: Global switch & customer permissions managed strictly by Admin', false, err.message);
  }

  // Test 11: Effective permission correctly reflected in Customer Overview & Permissions endpoint
  try {
    // Currently global is false, Sarah is true -> effective should be false
    const sarahOverviewRes = await makeRequest(
      port,
      '/api/customer/overview',
      'GET',
      undefined,
      sarahHeaders
    );

    const sarahPermRes = await makeRequest(
      port,
      '/api/customer/permissions',
      'GET',
      undefined,
      sarahHeaders
    );

    // Now turn global ON -> Sarah effective should become true
    db.globalManualTradeCloseEnabled = true;

    const sarahPermRes2 = await makeRequest(
      port,
      '/api/customer/permissions',
      'GET',
      undefined,
      sarahHeaders
    );

    const passed =
      sarahOverviewRes.body?.effectiveManualClose === false &&
      sarahPermRes.body?.effectiveManualClose === false &&
      sarahPermRes2.body?.effectiveManualClose === true;

    record(11, 'Customer API exposes only effectiveManualClose, accurately computed', passed, `Global OFF -> effective=${sarahPermRes.body?.effectiveManualClose}, Global ON -> effective=${sarahPermRes2.body?.effectiveManualClose}`);
  } catch (err: any) {
    record(11, 'Customer API exposes only effectiveManualClose, accurately computed', false, err.message);
  }

  // Test 12: Audit Logging: Verify audit entries exist for permission changes and close attempts
  try {
    const globalToggleLog = db.auditLogs.find(a => a.action === 'GLOBAL_MANUAL_CLOSE_TOGGLE');
    const userToggleLog = db.auditLogs.find(a => a.action === 'USER_MANUAL_CLOSE_PERMISSION_CHANGE');
    const deniedCloseLog = db.auditLogs.find(a => a.action === 'MANUAL_CLOSE_DENIED');
    const allowedCloseLog = db.auditLogs.find(a => a.action === 'MANUAL_CLOSE_ALLOWED');

    const passed =
      Boolean(globalToggleLog) &&
      Boolean(userToggleLog) &&
      Boolean(deniedCloseLog) &&
      Boolean(allowedCloseLog);

    record(12, 'Audit logging accurately records global toggle, user permission changes, and close attempts', passed, `Global log: ${Boolean(globalToggleLog)}, User log: ${Boolean(userToggleLog)}, Denied log: ${Boolean(deniedCloseLog)}, Allowed log: ${Boolean(allowedCloseLog)}`);
  } catch (err: any) {
    record(12, 'Audit logging accurately records global toggle, user permission changes, and close attempts', false, err.message);
  }

  // Gracefully close test server
  await new Promise<void>((resolve) => server.close(() => resolve()));

  console.log('\n======================================================================');
  console.log('MANUAL TRADE CLOSE TEST VERIFICATION SUMMARY:');
  const allPassed = results.every((r) => r.passed);
  console.log(`Passed: ${results.filter((r) => r.passed).length}/${results.length}`);
  console.log(`Status: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('======================================================================');

  if (!allPassed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runManualTradeCloseTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
