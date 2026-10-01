import { Router, Request, Response } from 'express';
import { db } from '../db/store.js';
import { requireWorkerAuth } from '../middleware/workerAuth.js';

const router = Router();

// Apply worker authentication to all /api/worker endpoints
router.use(requireWorkerAuth);

/**
 * Validates that a value is a finite number
 */
function isFiniteNumber(val: any): boolean {
  return typeof val === 'number' && Number.isFinite(val);
}

/**
 * Dedicated MT5 Worker Read-Only Synchronization Endpoint
 * 
 * Ingests account metrics, open positions, and worker health from trusted Windows MT5 Worker.
 * STRICTLY READ-ONLY:
 *  - Never accepts passwords or credentials.
 *  - Never executes orders or trading commands.
 */
router.post('/sync', async (req: Request, res: Response): Promise<void> => {
  const body = req.body;

  if (!body || typeof body !== 'object') {
    res.status(400).json({
      error: 'Invalid payload. Request body must be a valid JSON object.',
      code: 'ERR_INVALID_PAYLOAD',
    });
    return;
  }

  // 1. Read-Only Safety Enforcements: Reject passwords & execution directives
  const prohibitedCredentialFields = ['password', 'encryptedPassword', 'investorPassword', 'masterPassword', 'pwd', 'pass'];
  for (const field of prohibitedCredentialFields) {
    if (field in body || (body.account && field in body.account)) {
      res.status(400).json({
        error: 'MT5 passwords must never be transmitted via the worker sync endpoint. Connection operates in secure zero-credential mode.',
        code: 'ERR_PASSWORDS_PROHIBITED',
      });
      return;
    }
  }

  const prohibitedCommandFields = ['action', 'command', 'orderType', 'execute', 'buy', 'sell', 'closeOrder', 'tradeCommand'];
  for (const field of prohibitedCommandFields) {
    if (field in body) {
      res.status(400).json({
        error: 'Trade/order execution commands are strictly forbidden on this read-only synchronization endpoint.',
        code: 'ERR_EXECUTION_COMMAND_PROHIBITED',
      });
      return;
    }
  }

  // 2. Validate Worker Identity
  const workerId = typeof body.workerId === 'string' ? body.workerId.trim() : '';
  const workerName = typeof body.workerName === 'string' ? body.workerName.trim() : (workerId || 'Windows MT5 Worker');

  if (!workerId) {
    res.status(400).json({
      error: 'workerId is required and must be a valid non-empty string.',
      code: 'ERR_INVALID_WORKER_ID',
    });
    return;
  }

  // 3. Validate Account Telemetry
  const account = body.account;
  if (!account || typeof account !== 'object') {
    res.status(400).json({
      error: 'account object is required with MT5 loginId, server, balance, and equity.',
      code: 'ERR_INVALID_ACCOUNT_OBJECT',
    });
    return;
  }

  const loginId = String(account.loginId || '').trim();
  const server = String(account.server || '').trim();
  const brokerName = account.brokerName ? String(account.brokerName).trim() : undefined;

  if (!loginId) {
    res.status(400).json({
      error: 'account.loginId is required and must not be empty.',
      code: 'ERR_INVALID_LOGIN_ID',
    });
    return;
  }

  if (!server) {
    res.status(400).json({
      error: 'account.server is required and must not be empty.',
      code: 'ERR_INVALID_SERVER',
    });
    return;
  }

  if (!isFiniteNumber(account.balance)) {
    res.status(400).json({
      error: 'account.balance must be a valid finite number.',
      code: 'ERR_INVALID_BALANCE',
    });
    return;
  }

  if (!isFiniteNumber(account.equity)) {
    res.status(400).json({
      error: 'account.equity must be a valid finite number.',
      code: 'ERR_INVALID_EQUITY',
    });
    return;
  }

  const margin = isFiniteNumber(account.margin) ? account.margin : 0;
  const freeMargin = isFiniteNumber(account.freeMargin) ? account.freeMargin : account.balance;
  const marginLevel = isFiniteNumber(account.marginLevel) ? account.marginLevel : 0;
  const currency = typeof account.currency === 'string' && account.currency.trim() ? account.currency.trim().toUpperCase() : 'USD';
  const leverage = Number.isInteger(account.leverage) && account.leverage > 0 ? account.leverage : 100;

  // 4. Validate Positions Array
  if (!Array.isArray(body.positions)) {
    res.status(400).json({
      error: 'positions must be an array (can be empty [] if no open trades exist).',
      code: 'ERR_INVALID_POSITIONS_ARRAY',
    });
    return;
  }

  const sanitizedPositions = [];
  for (let i = 0; i < body.positions.length; i++) {
    const p = body.positions[i];
    if (!p || typeof p !== 'object') {
      res.status(400).json({
        error: `positions[${i}] must be an object.`,
        code: 'ERR_INVALID_POSITION_ITEM',
      });
      return;
    }

    const ticket = Number(p.ticket);
    if (!Number.isInteger(ticket) || ticket <= 0) {
      res.status(400).json({
        error: `positions[${i}].ticket must be a valid positive integer. Received: ${p.ticket}`,
        code: 'ERR_INVALID_POSITION_TICKET',
      });
      return;
    }

    const symbol = typeof p.symbol === 'string' ? p.symbol.trim().toUpperCase() : '';
    if (!symbol) {
      res.status(400).json({
        error: `positions[${i}].symbol is required (e.g. 'XAUUSD').`,
        code: 'ERR_INVALID_POSITION_SYMBOL',
      });
      return;
    }

    const rawType = typeof p.type === 'string' ? p.type.trim().toUpperCase() : '';
    if (rawType !== 'BUY' && rawType !== 'SELL') {
      res.status(400).json({
        error: `positions[${i}].type must be either 'BUY' or 'SELL'. Received: ${p.type}`,
        code: 'ERR_INVALID_POSITION_TYPE',
      });
      return;
    }

    if (!isFiniteNumber(p.lots) || p.lots <= 0) {
      res.status(400).json({
        error: `positions[${i}].lots must be a positive finite number.`,
        code: 'ERR_INVALID_POSITION_LOTS',
      });
      return;
    }

    if (!isFiniteNumber(p.openPrice) || p.openPrice <= 0) {
      res.status(400).json({
        error: `positions[${i}].openPrice must be a positive finite number.`,
        code: 'ERR_INVALID_OPEN_PRICE',
      });
      return;
    }

    if (!isFiniteNumber(p.currentPrice) || p.currentPrice <= 0) {
      res.status(400).json({
        error: `positions[${i}].currentPrice must be a positive finite number.`,
        code: 'ERR_INVALID_CURRENT_PRICE',
      });
      return;
    }

    const stopLoss = isFiniteNumber(p.stopLoss) ? p.stopLoss : null;
    const takeProfit = isFiniteNumber(p.takeProfit) ? p.takeProfit : null;
    const currentPnl = isFiniteNumber(p.currentPnl) ? p.currentPnl : 0;
    const swap = isFiniteNumber(p.swap) ? p.swap : 0;
    const commission = isFiniteNumber(p.commission) ? p.commission : 0;

    let openTime: string | null = null;
    if (p.openTime) {
      const parsedTime = new Date(p.openTime);
      if (!isNaN(parsedTime.getTime())) {
        openTime = parsedTime.toISOString();
      }
    }

    sanitizedPositions.push({
      ticket,
      symbol,
      type: rawType as 'BUY' | 'SELL',
      lots: p.lots,
      openPrice: p.openPrice,
      currentPrice: p.currentPrice,
      stopLoss,
      takeProfit,
      currentPnl,
      swap,
      commission,
      openTime: openTime || new Date().toISOString(),
    });
  }

  // 5. Sanitize Heartbeat Metrics
  const heartbeat = body.heartbeat && typeof body.heartbeat === 'object' ? {
    cpuPercent: isFiniteNumber(body.heartbeat.cpuPercent) ? Math.min(100, Math.max(0, body.heartbeat.cpuPercent)) : 10.0,
    memoryPercent: isFiniteNumber(body.heartbeat.memoryPercent) ? Math.min(100, Math.max(0, body.heartbeat.memoryPercent)) : 25.0,
    pingLatencyMs: Number.isInteger(body.heartbeat.pingLatencyMs) ? Math.max(0, body.heartbeat.pingLatencyMs) : 5,
    activeTerminals: Number.isInteger(body.heartbeat.activeTerminals) ? Math.max(0, body.heartbeat.activeTerminals) : 1,
  } : undefined;

  // 6. Perform Synchronization
  try {
    const result = await db.syncWorkerAccountData({
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
        leverage,
      },
      positions: sanitizedPositions,
      heartbeat,
    });

    // Fetch pending trade commands for this worker and synchronized MT5 account
    const queuedCommands = db.getPendingWorkerCommands(workerId, result.mt5AccountId);

    // Safely mark commands as DISPATCHED so they are not returned as fresh QUEUED commands on subsequent syncs
    for (const cmd of queuedCommands) {
      db.markWorkerCommandDispatched(cmd.commandId, workerId);
    }

    res.status(200).json({
      status: 'synced',
      mt5AccountId: result.mt5AccountId,
      serverTime: new Date().toISOString(),
      killSwitches: {
        globalKillSwitch: result.globalKillSwitch,
        accountKillSwitch: result.accountKillSwitch,
      },
      syncedPositionsCount: result.syncedPositionsCount,
      pendingCommands: queuedCommands,
    });
  } catch (err: any) {
    if (err.statusCode === 404) {
      res.status(404).json({
        error: err.message,
        code: 'ERR_ACCOUNT_NOT_FOUND',
      });
      return;
    }

    console.error('[WorkerSync Error]:', err);
    res.status(500).json({
      error: 'Failed to synchronize worker telemetry with the database.',
      code: 'ERR_SYNC_FAILED',
      message: err.message,
    });
  }
});

// Heartbeat endpoint from external MT5 Worker
router.post('/heartbeat', (req: Request, res: Response) => {
  const { workerId, cpuPercent, memoryPercent, activeTerminals, pingLatencyMs } = req.body;
  if (!workerId) {
    res.status(400).json({ error: 'Worker ID required' });
    return;
  }

  let node = db.workerNodes.find(n => n.id === workerId || n.workerName === workerId);
  if (node) {
    node.status = 'online';
    node.cpuPercent = isFiniteNumber(cpuPercent) ? cpuPercent : node.cpuPercent;
    node.memoryPercent = isFiniteNumber(memoryPercent) ? memoryPercent : node.memoryPercent;
    node.activeTerminals = Number.isInteger(activeTerminals) ? activeTerminals : node.activeTerminals;
    node.pingLatencyMs = Number.isInteger(pingLatencyMs) ? pingLatencyMs : node.pingLatencyMs;
    node.lastHeartbeat = new Date().toISOString();
  }

  res.json({
    status: 'acknowledged',
    globalKillSwitch: db.killSwitches.globalKillSwitch,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Worker Command Execution Result Reporting Endpoint
 * 
 * Ingests real terminal execution results (ticket, fill price, retcode, failure reason)
 * from the trusted MT5 execution worker.
 * 
 * Strict safety rules:
 * - Requires existing worker authentication
 * - Verifies command belongs to the authenticated worker
 * - Verifies command belongs to the target MT5 account
 * - Transitions status to EXECUTED upon FILLED, or FAILED on error
 * - Never creates fake MT5 positions
 */
router.post('/commands/:commandId/result', async (req: Request, res: Response): Promise<void> => {
  const { commandId } = req.params;
  const body = req.body;

  if (!body || typeof body !== 'object') {
    res.status(400).json({
      error: 'Invalid payload. Request body must be a valid JSON object.',
      code: 'ERR_INVALID_PAYLOAD',
    });
    return;
  }

  const workerId = String(body.workerId || req.headers['x-worker-id'] || '').trim();
  if (!workerId) {
    res.status(400).json({
      error: 'workerId is required.',
      code: 'ERR_WORKER_ID_REQUIRED',
    });
    return;
  }

  const rawStatus = typeof body.status === 'string' ? body.status.trim().toUpperCase() : '';
  if (rawStatus !== 'FILLED' && rawStatus !== 'REJECTED' && rawStatus !== 'FAILED') {
    res.status(400).json({
      error: "status must be one of 'FILLED', 'REJECTED', or 'FAILED'.",
      code: 'ERR_INVALID_STATUS',
    });
    return;
  }

  const ticket = Number.isInteger(Number(body.ticket)) && Number(body.ticket) > 0 ? Number(body.ticket) : undefined;
  const fillPrice = isFiniteNumber(body.fillPrice) && body.fillPrice > 0 ? body.fillPrice : undefined;
  const retcode = Number.isInteger(Number(body.retcode)) ? Number(body.retcode) : undefined;
  const message = typeof body.message === 'string' ? body.message.trim() : undefined;
  const executedAt = body.executedAt ? new Date(body.executedAt).toISOString() : new Date().toISOString();

  // Validate command exists
  const existingCmd = db.workerCommands.find(c => c.commandId === commandId);
  if (!existingCmd) {
    res.status(404).json({
      error: `Command '${commandId}' was not found.`,
      code: 'ERR_COMMAND_NOT_FOUND',
    });
    return;
  }

  // Verify command belongs to authenticated worker
  if (existingCmd.workerId !== workerId) {
    res.status(403).json({
      error: `Forbidden: Worker '${workerId}' is not authorized to submit results for command '${commandId}'.`,
      code: 'ERR_WORKER_UNAUTHORIZED',
    });
    return;
  }

  // If mt5AccountId is supplied or account login is supplied, verify it matches
  let targetAccountId = body.mt5AccountId ? String(body.mt5AccountId).trim() : undefined;
  if (!targetAccountId && body.account && body.account.loginId) {
    const acc = db.mt5Accounts.find(
      a => a.loginId === String(body.account.loginId).trim() &&
           (!body.account.server || a.server.toLowerCase() === String(body.account.server).trim().toLowerCase())
    );
    if (acc) {
      targetAccountId = acc.id;
    }
  }

  if (targetAccountId && existingCmd.mt5AccountId !== targetAccountId) {
    res.status(403).json({
      error: `Forbidden: Command '${commandId}' does not belong to MT5 account '${targetAccountId}'.`,
      code: 'ERR_ACCOUNT_MISMATCH',
    });
    return;
  }

  const ackResult = db.acknowledgeWorkerCommand(
    {
      commandId,
      ticket,
      fillPrice,
      status: rawStatus as 'FILLED' | 'REJECTED' | 'FAILED',
      retcode,
      message,
      executedAt,
    },
    workerId,
    targetAccountId
  );

  if (!ackResult.success) {
    res.status(400).json({
      error: ackResult.message,
      code: 'ERR_ACK_FAILED',
    });
    return;
  }

  res.status(200).json({
    status: 'acknowledged',
    command: ackResult.command,
    message: ackResult.message,
    serverTime: new Date().toISOString(),
  });
});

export default router;
