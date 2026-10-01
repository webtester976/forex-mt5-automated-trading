import { db } from '../server/db/store.js';
import { marketSimulator } from '../server/services/marketDataSimulator.js';
import { demoExecutionEngine } from '../server/services/demoExecutionEngine.js';
import { DemoRiskEngine } from '../server/services/demoRiskEngine.js';
import { demoTrendStrategy } from '../server/services/demoTrendStrategy.js';

interface TestResult {
  step: number;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(step: number, name: string, passed: boolean, details: string) {
  results.push({ step, name, passed, details });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] Step ${step}: ${name} - ${details}`);
}

async function runDemoTestSuite() {
  console.log('===============================================================');
  console.log('STARTING DEMO TRADING ENGINE AUTOMATED VERIFICATION SUITE');
  console.log('===============================================================\n');

  const customerAlex = db.users.find(u => u.email === 'alex.morgan@example.com')!;
  const customerSarah = db.users.find(u => u.email === 'sarah.chen@example.com')!;
  const adminElena = db.users.find(u => u.role === 'super_admin' || u.role === 'admin')!;

  // Step 1: Demo Account Creation & Initial Balances
  try {
    const alexDemo = db.getOrCreateDemoAccount(customerAlex.id);
    const hasRequiredFields = 
      alexDemo.balance > 0 &&
      alexDemo.equity > 0 &&
      alexDemo.freeMargin > 0 &&
      alexDemo.accountNumber.startsWith('DEMO-') &&
      alexDemo.status === 'active';

    record(1, 'Demo Account Isolation & Metrics Initialization', hasRequiredFields, 
      `Account: ${alexDemo.accountNumber}, Balance: $${alexDemo.balance}, Equity: $${alexDemo.equity}, FreeMargin: $${alexDemo.freeMargin}`);
  } catch (err: any) {
    record(1, 'Demo Account Isolation & Metrics Initialization', false, err.message);
  }

  // Step 2: Market Data Simulator & Continuous Quotes
  try {
    const quotes = marketSimulator.getQuotes();
    const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD'];
    const allSymbolsPresent = symbols.every(s => quotes[s] && quotes[s].bid > 0 && quotes[s].ask > quotes[s].bid);

    record(2, 'Market Data Quotes Simulator', allSymbolsPresent, 
      `Simulated pairs live: ${symbols.map(s => `${s}: ${quotes[s].bid}/${quotes[s].ask}`).join(', ')}`);
  } catch (err: any) {
    record(2, 'Market Data Quotes Simulator', false, err.message);
  }

  // Step 3: P&L and Margin Formula Mathematical Accuracy
  try {
    // BUY 1.00 lot EURUSD from 1.08500 to 1.08600 (+10 pips = $100.00)
    const pnlBuy = marketSimulator.calculatePnl('EURUSD', 'BUY', 1.0, 1.08500, 1.08600);
    // SELL 1.00 lot EURUSD from 1.08500 to 1.08600 (-10 pips = -$100.00)
    const pnlSell = marketSimulator.calculatePnl('EURUSD', 'SELL', 1.0, 1.08500, 1.08600);
    // Margin for 1.00 lot EURUSD @ 1.08500 with 1:100 leverage = (100,000 * 1.085) / 100 = 1085.00
    const margin = marketSimulator.calculateRequiredMargin('EURUSD', 1.0, 1.08500, 100);

    const mathValid = pnlBuy === 100.00 && pnlSell === -100.00 && margin === 1085.00;
    record(3, 'Forex P&L and Margin Calculation Precision', mathValid,
      `BUY PnL: $${pnlBuy}, SELL PnL: $${pnlSell}, Required Margin: $${margin}`);
  } catch (err: any) {
    record(3, 'Forex P&L and Margin Calculation Precision', false, err.message);
  }

  // Step 4: Execute Valid Demo Market BUY Order
  let openBuyPositionId: string = '';
  try {
    const res = await demoExecutionEngine.openMarketOrder({
      userId: customerAlex.id,
      symbol: 'EURUSD',
      type: 'BUY',
      lots: 0.10,
      stopLoss: 1.07500,
      takeProfit: 1.10000,
      idempotencyKey: `test_key_buy_${Date.now()}`,
    });

    const success = res.success && res.position && res.position.status === 'open';
    if (res.position) openBuyPositionId = res.position.id;

    record(4, 'Simulated Market BUY Order Execution', Boolean(success),
      `Ticket #${res.position?.positionTicket} for 0.10 EURUSD opened @ ${res.position?.openPrice}`);
  } catch (err: any) {
    record(4, 'Simulated Market BUY Order Execution', false, err.message);
  }

  // Step 5: Execute Valid Demo Market SELL Order
  let openSellPositionId: string = '';
  try {
    const res = await demoExecutionEngine.openMarketOrder({
      userId: customerAlex.id,
      symbol: 'GBPUSD',
      type: 'SELL',
      lots: 0.20,
      stopLoss: 1.31000,
      takeProfit: 1.27000,
      idempotencyKey: `test_key_sell_${Date.now()}`,
    });

    const success = res.success && res.position && res.position.status === 'open';
    if (res.position) openSellPositionId = res.position.id;

    record(5, 'Simulated Market SELL Order Execution', Boolean(success),
      `Ticket #${res.position?.positionTicket} for 0.20 GBPUSD opened @ ${res.position?.openPrice}`);
  } catch (err: any) {
    record(5, 'Simulated Market SELL Order Execution', false, err.message);
  }

  // Step 6: Risk Engine: Max Lot Size Enforcement
  try {
    const res = await demoExecutionEngine.openMarketOrder({
      userId: customerAlex.id,
      symbol: 'EURUSD',
      type: 'BUY',
      lots: 25.0, // Exceeds 2.0 max allowed lot for Alex
    });

    const rejectedProperly = !res.success && res.errorCode === 'ERR_MAX_LOT_EXCEEDED';
    record(6, 'Risk Engine: Maximum Lot Size Restriction', rejectedProperly,
      `Rejected large lot order: ${res.message} (Code: ${res.errorCode})`);
  } catch (err: any) {
    record(6, 'Risk Engine: Maximum Lot Size Restriction', false, err.message);
  }

  // Step 7: Risk Engine: Invalid Stop Loss Logic Protection
  try {
    const quote = marketSimulator.getQuote('EURUSD');
    // For a BUY order, setting SL above current Ask price is invalid
    const invalidSl = quote.ask + 0.00500;
    const res = await demoExecutionEngine.openMarketOrder({
      userId: customerAlex.id,
      symbol: 'EURUSD',
      type: 'BUY',
      lots: 0.10,
      stopLoss: invalidSl,
    });

    const rejected = !res.success && res.errorCode === 'ERR_INVALID_SL';
    record(7, 'Risk Engine: Inverted Stop-Loss Rejection', rejected,
      `SL validation caught upside stop on BUY: ${res.message}`);
  } catch (err: any) {
    record(7, 'Risk Engine: Inverted Stop-Loss Rejection', false, err.message);
  }

  // Step 8: Risk Engine: Idempotency & Duplicate Order Prevention
  try {
    const duplicateKey = `idemp_unique_${Date.now()}`;
    const firstTry = await demoExecutionEngine.openMarketOrder({
      userId: customerAlex.id,
      symbol: 'USDJPY',
      type: 'BUY',
      lots: 0.10,
      idempotencyKey: duplicateKey,
    });

    const secondTry = await demoExecutionEngine.openMarketOrder({
      userId: customerAlex.id,
      symbol: 'USDJPY',
      type: 'BUY',
      lots: 0.10,
      idempotencyKey: duplicateKey,
    });

    const passed = firstTry.success && !secondTry.success && secondTry.errorCode === 'ERR_DUPLICATE_ORDER';
    record(8, 'Risk Engine: Idempotency & Duplicate Order Guard', passed,
      `First order success: ${firstTry.success}, duplicate replay rejected: ${secondTry.message}`);
  } catch (err: any) {
    record(8, 'Risk Engine: Idempotency & Duplicate Order Guard', false, err.message);
  }

  // Step 9: Risk Engine: Per-Customer Trading Pause & Rejection
  try {
    // Pause trading for Alex
    demoExecutionEngine.setTradingPaused(customerAlex.id, true);

    const res = await demoExecutionEngine.openMarketOrder({
      userId: customerAlex.id,
      symbol: 'EURUSD',
      type: 'BUY',
      lots: 0.10,
    });

    const passed = !res.success && res.errorCode === 'ERR_CUSTOMER_PAUSED';

    // Unpause for subsequent tests
    demoExecutionEngine.setTradingPaused(customerAlex.id, false);

    record(9, 'Risk Engine: Per-Customer Trading Pause', passed,
      `Rejected order during account pause: ${res.message}`);
  } catch (err: any) {
    record(9, 'Risk Engine: Per-Customer Trading Pause', false, err.message);
  }

  // Step 10: Risk Engine: Global Demo Trading Kill Switch
  try {
    db.demoGlobalKillSwitch = true;

    const res = await demoExecutionEngine.openMarketOrder({
      userId: customerAlex.id,
      symbol: 'EURUSD',
      type: 'BUY',
      lots: 0.10,
    });

    const passed = !res.success && res.errorCode === 'ERR_GLOBAL_KILL_SWITCH';

    // Re-enable demo trading
    db.demoGlobalKillSwitch = false;

    record(10, 'Risk Engine: Global Emergency Kill Switch', passed,
      `Rejected order during global kill switch: ${res.message}`);
  } catch (err: any) {
    record(10, 'Risk Engine: Global Emergency Kill Switch', false, err.message);
  }

  // Step 11: Realized P&L & Customer Manual Close Execution
  try {
    const accBefore = db.getOrCreateDemoAccount(customerAlex.id);
    const startBalance = accBefore.balance;

    const closeRes = await demoExecutionEngine.closePosition(openBuyPositionId, customerAlex.id, false);
    const accAfter = db.getOrCreateDemoAccount(customerAlex.id);

    const closedPos = db.demoPositions.find(p => p.id === openBuyPositionId);
    const passed = closeRes.success && 
                   closedPos?.status === 'closed' && 
                   closedPos.profit !== undefined &&
                   accAfter.balance !== startBalance;

    record(11, 'Customer Manual Close & Realized P&L Reconciliation', passed,
      `Position closed @ ${closedPos?.closePrice}, Realized Net P&L: $${closedPos?.profit}, New Balance: $${accAfter.balance}`);
  } catch (err: any) {
    record(11, 'Customer Manual Close & Realized P&L Reconciliation', false, err.message);
  }

  // Step 12: Tenant Isolation: Customer B cannot close Customer A's Demo Position
  try {
    const unauthorizedClose = await demoExecutionEngine.closePosition(
      openSellPositionId,
      customerSarah.id, // Sarah trying to close Alex's position
      false
    );

    const passed = !unauthorizedClose.success && unauthorizedClose.errorCode === 'ERR_FORBIDDEN_TENANT';
    record(12, 'Tenant Isolation: Cross-Account Position Tampering Prevention', passed,
      `Sarah unauthorized close of Alex position rejected: ${unauthorizedClose.message}`);
  } catch (err: any) {
    record(12, 'Tenant Isolation: Cross-Account Position Tampering Prevention', false, err.message);
  }

  // Step 13: Stop-Loss & Take-Profit Automatic Market Tick Triggering
  try {
    // Open a BUY position with known SL
    const openRes = await demoExecutionEngine.openMarketOrder({
      userId: customerAlex.id,
      symbol: 'EURUSD',
      type: 'BUY',
      lots: 0.10,
      stopLoss: 1.08000,
      takeProfit: 1.09500,
    });

    const pos = openRes.position!;
    // Force a deterministic market crash through Stop Loss (1.07900 < 1.08000)
    marketSimulator.setDeterministicQuote('EURUSD', 1.07900, 1.07910);

    const checkedPos = db.demoPositions.find(p => p.id === pos.id);
    const slTriggered = checkedPos?.status === 'closed';

    // Reset market simulator to live random walk
    marketSimulator.resetQuotes();

    record(13, 'Automated Stop-Loss Market Tick Execution', Boolean(slTriggered),
      `Position #${pos.positionTicket} auto-closed on price drop. Status: ${checkedPos?.status}, Net P&L: $${checkedPos?.profit}`);
  } catch (err: any) {
    record(13, 'Automated Stop-Loss Market Tick Execution', false, err.message);
  }

  // Step 14: Demo Trend Strategy Signal Generation
  try {
    const config = demoTrendStrategy.getConfig();
    const isDemoStrategy = config.isDemoOnly === true;

    // Trigger test automated signal
    const sigRes = await demoTrendStrategy.triggerTestSignal(customerAlex.id, 'EURUSD', 'BUY', 0.10);
    const passed = isDemoStrategy && sigRes.success && sigRes.position !== undefined;

    record(14, 'Demo Trend Strategy Automated Signal Execution', passed,
      `Strategy [${config.name}] generated simulated order #${sigRes.position?.positionTicket} for ${sigRes.position?.lots} lots ${sigRes.position?.symbol}`);
  } catch (err: any) {
    record(14, 'Demo Trend Strategy Automated Signal Execution', false, err.message);
  }

  // Step 15: Admin Controls: Force-Close & Demo Account Reset
  try {
    // Open another test position for Alex
    const testPos = await demoExecutionEngine.openMarketOrder({
      userId: customerAlex.id,
      symbol: 'XAUUSD',
      type: 'BUY',
      lots: 0.05,
    });

    // Admin force-closes it
    const adminClose = await demoExecutionEngine.closePosition(testPos.position!.id, adminElena.id, true, 'Admin Risk Action');

    // Admin resets Alex's demo account back to initial capital
    const resetAcc = demoExecutionEngine.resetAccount(customerAlex.id);

    const passed = adminClose.success && 
                   resetAcc.balance === 10000.00 && 
                   resetAcc.equity === 10000.00 && 
                   resetAcc.usedMargin === 0 && 
                   resetAcc.status === 'reset';

    record(15, 'Admin Intervention & Demo Account Reset to $10,000', passed,
      `Admin close success: ${adminClose.success}, Account reset balance: $${resetAcc.balance}, Equity: $${resetAcc.equity}`);
  } catch (err: any) {
    record(15, 'Admin Intervention & Demo Account Reset to $10,000', false, err.message);
  }

  // Step 16: Zero-Broker Guarantee Audit
  try {
    // Verify that NO live MT5 worker or broker orders were touched
    const realMt5OrdersSent = db.auditLogs.some(
      a => a.action === 'MT5_REAL_ORDER_DISPATCH' || a.action === 'BROKER_LIVE_EXECUTION'
    );
    const demoAuditsPresent = db.auditLogs.some(a => a.action === 'DEMO_ORDER_OPENED');

    const passed = !realMt5OrdersSent && demoAuditsPresent;
    record(16, 'Zero Broker Order Guarantee & Audit Confirmation', passed,
      `Zero live broker orders sent. All operations strictly recorded under demo sandbox telemetry.`);
  } catch (err: any) {
    record(16, 'Zero Broker Order Guarantee & Audit Confirmation', false, err.message);
  }

  console.log('\n===============================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`DEMO TRADING ENGINE VERIFICATION SUMMARY: ${results.filter(r => r.passed).length}/${results.length} PASSED`);
  console.log(`OVERALL STATUS: ${allPassed ? 'ALL TESTS PASSED - DEMO ENGINE VERIFIED' : 'TEST FAILURES DETECTED'}`);
  console.log('===============================================================');

  if (!allPassed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDemoTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
