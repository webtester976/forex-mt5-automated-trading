import http from 'http';
import crypto from 'crypto';
import express from 'express';
import { db } from '../server/db/store.js';
import { pool } from '../src/db/index.js';
import { orchestrator } from '../server/services/mt5Orchestrator.js';
import workerRouter from '../server/routes/worker.js';
import { demoExecutionEngine } from '../server/services/demoExecutionEngine.js';

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

async function runTestSuite() {
  console.log('======================================================================');
  console.log('STARTING PHASE 1: REAL MT5 WORKER COMMAND QUEUE AUTOMATED TEST SUITE');
  console.log('======================================================================\n');

  // Start in-process Express app mounting the real worker router
  const app = express();
  app.use(express.json());
  app.use('/api/worker', workerRouter);

  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = (server.address() as any).port;

  const workerSecret = process.env.MT5_WORKER_SECRET || 'mt5_dev_worker_secret_fallback_key';
  const workerHeaders = {
    'x-worker-secret': workerSecret,
  };

  const workerId = 'worker-win-mt5-01';
  const realLogin = '5056419885';
  const realServer = 'MetaQuotes-Demo';

  // Setup: Ensure an MT5 demo account exists in store for the real worker
  let realAccount = db.mt5Accounts.find(
    (a) => a.loginId === realLogin && a.server.toLowerCase() === realServer.toLowerCase()
  );

  const customerAlex = db.users.find((u) => u.email === 'alex.morgan@example.com')!;

  try {
    const accRow = await pool.query(
      `SELECT id FROM mt5_accounts WHERE login_id = $1 AND LOWER(server) = LOWER($2) LIMIT 1`,
      [realLogin, realServer]
    );
    if (accRow.rows && accRow.rows.length > 0) {
      const existingDbId = accRow.rows[0].id;
      if (!realAccount) {
        realAccount = {
          id: existingDbId,
          userId: customerAlex.id,
          brokerName: 'MetaQuotes Software Corp.',
          server: realServer,
          loginId: realLogin,
          accountType: 'demo',
          isReadOnly: false,
          currency: 'USD',
          leverage: 500,
          balance: 10000.0,
          equity: 10000.0,
          margin: 0,
          freeMargin: 10000.0,
          marginLevel: 0,
          floatingPnl: 0,
          connectionStatus: 'connected',
          lastSyncAt: new Date().toISOString(),
          assignedWorkerId: workerId,
        };
        db.mt5Accounts.push(realAccount);
      } else {
        realAccount.id = existingDbId;
      }
    }
  } catch {}

  if (!realAccount) {
    realAccount = {
      id: crypto.randomUUID(),
      userId: customerAlex.id,
      brokerName: 'MetaQuotes Software Corp.',
      server: realServer,
      loginId: realLogin,
      accountType: 'demo',
      isReadOnly: false,
      currency: 'USD',
      leverage: 500,
      balance: 10000.0,
      equity: 10000.0,
      margin: 0,
      freeMargin: 10000.0,
      marginLevel: 0,
      floatingPnl: 0,
      connectionStatus: 'connected',
      lastSyncAt: new Date().toISOString(),
      assignedWorkerId: workerId,
    };
    db.mt5Accounts.push(realAccount);
  } else {
    realAccount.assignedWorkerId = workerId;
    realAccount.connectionStatus = 'connected';
    realAccount.lastSyncAt = new Date().toISOString();
  }

  try {
    await pool.query(
      `INSERT INTO mt5_accounts (id, user_id, broker_name, server, login_id, account_type, is_read_only, currency, leverage, balance, equity, margin, free_margin, margin_level, floating_pnl, connection_status, assigned_worker_id, last_sync_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, false, 'USD', 500, 10000, 10000, 0, 10000, 0, 0, 'connected', $7, NOW(), NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET assigned_worker_id = $7, connection_status = 'connected', last_sync_at = NOW()`,
      [realAccount.id, customerAlex.id, realAccount.brokerName, realAccount.server, realAccount.loginId, realAccount.accountType, workerId]
    );
  } catch {}

  // 1. Initial worker sync to establish active synchronization state
  await makeRequest(
    port,
    '/api/worker/sync',
    'POST',
    {
      workerId,
      workerName: 'Windows MT5 Worker Unit 1',
      account: {
        loginId: realLogin,
        server: realServer,
        brokerName: 'MetaQuotes Software Corp.',
        balance: 10000.0,
        equity: 10000.0,
        margin: 0,
        freeMargin: 10000.0,
        marginLevel: 0,
        currency: 'USD',
        leverage: 500,
      },
      positions: [],
      heartbeat: {
        cpuPercent: 12.5,
        memoryPercent: 30.0,
        pingLatencyMs: 8,
        activeTerminals: 1,
      },
    },
    workerHeaders
  );

  // Test 1: Queue a BUY command for MetaQuotes-Demo account
  let test1CommandId = '';
  try {
    const queueRes = await orchestrator.queueWorkerCommand({
      mt5AccountId: realAccount.id,
      symbol: 'XAUUSD',
      action: 'BUY',
      volume: 0.1,
      stopLoss: 2680.0,
      takeProfit: 2710.0,
      idempotencyKey: `idem_test_1_${Date.now()}`,
    });

    const passed =
      queueRes.success &&
      Boolean(queueRes.command) &&
      queueRes.command?.status === 'QUEUED' &&
      queueRes.command?.symbol === 'XAUUSD' &&
      queueRes.command?.action === 'BUY' &&
      queueRes.command?.volume === 0.1;

    test1CommandId = queueRes.command?.commandId || '';
    record(1, 'Queue BUY command for MetaQuotes-Demo account', passed, `Command ID: ${test1CommandId}, Status: ${queueRes.command?.status}`);
  } catch (err: any) {
    record(1, 'Queue BUY command for MetaQuotes-Demo account', false, err.message);
  }

  // Test 2: Authenticated worker retrieves the command via POST /api/worker/sync
  let retrievedCommand: any = null;
  try {
    const syncRes = await makeRequest(
      port,
      '/api/worker/sync',
      'POST',
      {
        workerId,
        workerName: 'Windows MT5 Worker Unit 1',
        account: {
          loginId: realLogin,
          server: realServer,
          balance: 10000.0,
          equity: 10000.0,
        },
        positions: [],
      },
      workerHeaders
    );

    const commands = syncRes.body?.pendingCommands || [];
    retrievedCommand = commands.find((c: any) => c.commandId === test1CommandId);

    const passed =
      syncRes.status === 200 &&
      Array.isArray(commands) &&
      Boolean(retrievedCommand) &&
      retrievedCommand.action === 'BUY' &&
      retrievedCommand.symbol === 'XAUUSD';

    record(2, 'Authenticated worker retrieves the command via /sync', passed, `Retrieved ${commands.length} pending commands`);
  } catch (err: any) {
    record(2, 'Authenticated worker retrieves the command via /sync', false, err.message);
  }

  // Test 3: Command changes to DISPATCHED
  try {
    const cmdInStore = db.workerCommands.find((c) => c.commandId === test1CommandId);
    const passed = Boolean(cmdInStore) && cmdInStore?.status === 'DISPATCHED' && Boolean(cmdInStore?.dispatchedAt);
    record(3, 'Command status transitions to DISPATCHED upon delivery', passed, `Status: ${cmdInStore?.status}, DispatchedAt: ${cmdInStore?.dispatchedAt}`);
  } catch (err: any) {
    record(3, 'Command status transitions to DISPATCHED upon delivery', false, err.message);
  }

  // Test 4: Same command is not returned as a new QUEUED command on next sync
  try {
    const syncRes2 = await makeRequest(
      port,
      '/api/worker/sync',
      'POST',
      {
        workerId,
        workerName: 'Windows MT5 Worker Unit 1',
        account: {
          loginId: realLogin,
          server: realServer,
          balance: 10000.0,
          equity: 10000.0,
        },
        positions: [],
      },
      workerHeaders
    );

    const commands2 = syncRes2.body?.pendingCommands || [];
    const duplicate = commands2.find((c: any) => c.commandId === test1CommandId);

    const passed = syncRes2.status === 200 && !duplicate;
    record(4, 'Dispatched command is not returned as new QUEUED command on subsequent sync', passed, `Returned commands: ${commands2.length}`);
  } catch (err: any) {
    record(4, 'Dispatched command is not returned as new QUEUED command on subsequent sync', false, err.message);
  }

  // Test 5: Worker submits FILLED receipt
  const simulatedTicket = 99887766;
  const simulatedFillPrice = 2690.5;
  try {
    const resultRes = await makeRequest(
      port,
      `/api/worker/commands/${test1CommandId}/result`,
      'POST',
      {
        workerId,
        mt5AccountId: realAccount.id,
        status: 'FILLED',
        ticket: simulatedTicket,
        fillPrice: simulatedFillPrice,
        retcode: 10009, // TRADE_RETCODE_DONE
        message: 'Order executed successfully on MT5 MetaQuotes-Demo',
      },
      workerHeaders
    );

    const passed = resultRes.status === 200 && resultRes.body?.status === 'acknowledged';
    record(5, 'Worker submits FILLED receipt via /commands/:commandId/result', passed, `HTTP Status: ${resultRes.status}, Body status: ${resultRes.body?.status}`);
  } catch (err: any) {
    record(5, 'Worker submits FILLED receipt via /commands/:commandId/result', false, err.message);
  }

  // Test 6: Command becomes EXECUTED
  try {
    const cmdInStore = db.workerCommands.find((c) => c.commandId === test1CommandId);
    const passed = Boolean(cmdInStore) && cmdInStore?.status === 'EXECUTED';
    record(6, 'Command status becomes EXECUTED in store', passed, `Status: ${cmdInStore?.status}`);
  } catch (err: any) {
    record(6, 'Command status becomes EXECUTED in store', false, err.message);
  }

  // Test 7: Real MT5 ticket is stored
  try {
    const cmdInStore = db.workerCommands.find((c) => c.commandId === test1CommandId);
    const passed =
      cmdInStore?.ticket === simulatedTicket &&
      cmdInStore?.fillPrice === simulatedFillPrice &&
      cmdInStore?.retcode === 10009;
    record(7, 'Real MT5 ticket and fill price stored accurately', passed, `Ticket: #${cmdInStore?.ticket}, Fill Price: ${cmdInStore?.fillPrice}, Retcode: ${cmdInStore?.retcode}`);
  } catch (err: any) {
    record(7, 'Real MT5 ticket and fill price stored accurately', false, err.message);
  }

  // Test 8: Wrong worker cannot retrieve or acknowledge the command
  try {
    // Queue a new command for workerId
    const qRes = await orchestrator.queueWorkerCommand({
      mt5AccountId: realAccount.id,
      symbol: 'XAUUSD',
      action: 'SELL',
      volume: 0.05,
      idempotencyKey: `idem_test_8_${Date.now()}`,
    });

    const targetCmdId = qRes.command!.commandId;

    // Wrong worker attempts sync
    const wrongWorkerRes = await makeRequest(
      port,
      '/api/worker/sync',
      'POST',
      {
        workerId: 'unauthorized-worker-rogue',
        workerName: 'Rogue Worker',
        account: {
          loginId: realLogin,
          server: realServer,
          balance: 10000.0,
          equity: 10000.0,
        },
        positions: [],
      },
      workerHeaders
    );

    const commandsForRogue = wrongWorkerRes.body?.pendingCommands || [];
    const rogueGotTarget = commandsForRogue.some((c: any) => c.commandId === targetCmdId);

    // Wrong worker attempts result reporting
    const rogueResultRes = await makeRequest(
      port,
      `/api/worker/commands/${targetCmdId}/result`,
      'POST',
      {
        workerId: 'unauthorized-worker-rogue',
        status: 'FILLED',
        ticket: 11111,
      },
      workerHeaders
    );

    const passed = !rogueGotTarget && rogueResultRes.status === 403;
    record(8, 'Unauthorized worker cannot retrieve or acknowledge command', passed, `Rogue sync received: ${commandsForRogue.length}, Rogue result HTTP status: ${rogueResultRes.status}`);
  } catch (err: any) {
    record(8, 'Unauthorized worker cannot retrieve or acknowledge command', false, err.message);
  }

  // Test 9: Wrong account cannot retrieve the command
  try {
    // Other account
    const otherAccount: any = {
      id: crypto.randomUUID(),
      userId: 'usr_other',
      brokerName: 'IC Markets',
      server: 'ICMarketsSC-Demo',
      loginId: '999888111',
      accountType: 'demo',
      isReadOnly: false,
      currency: 'USD',
      leverage: 500,
      balance: 5000.0,
      equity: 5000.0,
      connectionStatus: 'connected',
      lastSyncAt: new Date().toISOString(),
      assignedWorkerId: workerId,
    };
    db.mt5Accounts.push(otherAccount);

    try {
      await pool.query(
        `INSERT INTO mt5_accounts (id, user_id, broker_name, server, login_id, account_type, is_read_only, currency, leverage, balance, equity, margin, free_margin, margin_level, floating_pnl, connection_status, assigned_worker_id, last_sync_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, false, 'USD', 500, 5000, 5000, 0, 5000, 0, 0, 'connected', $7, NOW(), NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [otherAccount.id, customerAlex.id, otherAccount.brokerName, otherAccount.server, otherAccount.loginId, otherAccount.accountType, workerId]
      );
    } catch {}

    // Sync other account
    const otherSyncRes = await makeRequest(
      port,
      '/api/worker/sync',
      'POST',
      {
        workerId,
        workerName: 'Windows MT5 Worker Unit 1',
        account: {
          loginId: otherAccount.loginId,
          server: otherAccount.server,
          balance: 5000.0,
          equity: 5000.0,
        },
        positions: [],
      },
      workerHeaders
    );

    const otherCommands = otherSyncRes.body?.pendingCommands || [];
    // Verify none of other commands belong to realAccount
    const leaked = otherCommands.some((c: any) => c.mt5AccountId === realAccount!.id);

    const passed = otherSyncRes.status === 200 && !leaked;
    record(9, 'Commands strictly isolated by mt5AccountId', passed, `Other account got ${otherCommands.length} commands, leaked count: 0`);
  } catch (err: any) {
    record(9, 'Commands strictly isolated by mt5AccountId', false, err.message);
  }

  // Test 10: Live account cannot receive a worker trading command
  try {
    const liveAccount: any = {
      id: crypto.randomUUID(),
      userId: 'usr_live_test',
      brokerName: 'Raw Spread Live',
      server: 'LiveBroker-01',
      loginId: '123456789',
      accountType: 'live',
      isReadOnly: false,
      currency: 'USD',
      leverage: 500,
      balance: 50000.0,
      equity: 50000.0,
      connectionStatus: 'connected',
      lastSyncAt: new Date().toISOString(),
      assignedWorkerId: workerId,
    };
    db.mt5Accounts.push(liveAccount);

    const liveRes = await orchestrator.queueWorkerCommand({
      mt5AccountId: liveAccount.id,
      symbol: 'XAUUSD',
      action: 'BUY',
      volume: 1.0,
      idempotencyKey: `idem_live_${Date.now()}`,
    });

    const passed =
      !liveRes.success &&
      Boolean(liveRes.error) &&
      liveRes.error!.toLowerCase().includes('live');

    record(10, 'Live account strictly prohibited from receiving worker trading commands', passed, `Rejected reason: "${liveRes.error}"`);
  } catch (err: any) {
    record(10, 'Live account strictly prohibited from receiving worker trading commands', false, err.message);
  }

  // Test 11: Existing position sync continues working
  try {
    const syncWithPositions = await makeRequest(
      port,
      '/api/worker/sync',
      'POST',
      {
        workerId,
        workerName: 'Windows MT5 Worker Unit 1',
        account: {
          loginId: realLogin,
          server: realServer,
          balance: 10250.0,
          equity: 10310.0,
          margin: 100.0,
          freeMargin: 10210.0,
          marginLevel: 10310.0,
        },
        positions: [
          {
            ticket: simulatedTicket,
            symbol: 'XAUUSD',
            type: 'BUY',
            lots: 0.1,
            openPrice: simulatedFillPrice,
            currentPrice: 2696.5,
            stopLoss: 2680.0,
            takeProfit: 2710.0,
            currentPnl: 60.0,
            openTime: new Date().toISOString(),
          },
        ],
      },
      workerHeaders
    );

    const syncedCount = syncWithPositions.body?.syncedPositionsCount;
    const positionInStore = db.positions.find(
      (p) => p.mt5AccountId === realAccount!.id && p.positionTicket === simulatedTicket
    );

    const passed =
      syncWithPositions.status === 200 &&
      syncedCount === 1 &&
      Boolean(positionInStore) &&
      positionInStore?.symbol === 'XAUUSD' &&
      positionInStore?.currentPnl === 60.0;

    record(11, 'Existing live position sync operates cleanly with verified MT5 position', passed, `Synced count: ${syncedCount}, Position ticket: #${positionInStore?.positionTicket}`);
  } catch (err: any) {
    record(11, 'Existing live position sync operates cleanly with verified MT5 position', false, err.message);
  }

  // Test 12: Existing demo simulation continues working unaffected
  try {
    const simOrderRes = await demoExecutionEngine.openMarketOrder({
      userId: customerAlex.id,
      symbol: 'EURUSD',
      type: 'BUY',
      lots: 0.1,
      idempotencyKey: `idem_sim_${Date.now()}`,
    });

    const passed =
      simOrderRes.success &&
      Boolean(simOrderRes.position) &&
      simOrderRes.position?.symbol === 'EURUSD' &&
      simOrderRes.executionStatus === 'FILLED';

    record(12, 'Existing demo simulation engine unaffected and operational', passed, `Simulation position ticket: #${simOrderRes.position?.positionTicket}`);
  } catch (err: any) {
    record(12, 'Existing demo simulation engine unaffected and operational', false, err.message);
  }

  // Gracefully close test server
  await new Promise<void>((resolve) => server.close(() => resolve()));

  console.log('\n======================================================================');
  console.log('PHASE 1 VERIFICATION SUMMARY:');
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

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
