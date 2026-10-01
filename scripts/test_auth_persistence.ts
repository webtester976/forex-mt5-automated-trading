import http from 'http';
import express from 'express';
import { db } from '../server/db/store.js';
import authRouter from '../server/routes/auth.js';
import adminRouter from '../server/routes/admin.js';
import customerRouter from '../server/routes/customer.js';
import { generateToken } from '../server/security/encryption.js';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, details: string) {
  results.push({ name, passed, details });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}: ${details}`);
}

function makeRequest(
  port: number,
  path: string,
  method: string = 'GET',
  data?: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
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
          let parsed: any = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode || 500, body: parsed, headers: res.headers });
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

async function runAuthPersistenceTests() {
  console.log('====================================================');
  console.log('   AURAMT5 AUTHENTICATION PERSISTENCE TEST SUITE    ');
  console.log('====================================================\n');

  // Start dedicated test Express app with exact middleware
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/customer', customerRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as any;
  const port = address.port;

  try {
    // ----------------------------------------------------
    // Test 1: Customer Login -> Session Creation & Persistence Simulation
    // ----------------------------------------------------
    const customerLoginRes = await makeRequest(port, '/api/auth/login', 'POST', {
      email: 'alex.morgan@example.com',
      password: 'CustomerPass123!',
    });

    const customerToken = customerLoginRes.body?.token;
    const customerUser = customerLoginRes.body?.user;
    const cookieHeader = customerLoginRes.headers['set-cookie'];

    const test1Pass =
      customerLoginRes.status === 200 &&
      Boolean(customerToken) &&
      customerUser?.role === 'customer' &&
      Boolean(cookieHeader);

    record(
      'login -> creates session & cookie',
      test1Pass,
      test1Pass
        ? `Customer logged in successfully. Received token and auth_token cookie.`
        : `Login failed: status ${customerLoginRes.status}, body: ${JSON.stringify(customerLoginRes.body)}`
    );

    // ----------------------------------------------------
    // Test 2: Customer Refresh -> Remains Authenticated as Customer
    // ----------------------------------------------------
    // Simulating page refresh: browser initializes with saved token from localStorage
    const customerRefreshRes = await makeRequest(port, '/api/auth/me', 'GET', null, {
      Authorization: `Bearer ${customerToken}`,
    });

    const refreshedCustomer = customerRefreshRes.body?.user;
    const test2Pass =
      customerRefreshRes.status === 200 &&
      refreshedCustomer?.id === customerUser?.id &&
      refreshedCustomer?.role === 'customer' &&
      refreshedCustomer?.email === 'alex.morgan@example.com';

    record(
      'customer -> refresh -> remains customer',
      test2Pass,
      test2Pass
        ? `Customer session restored after refresh. User: ${refreshedCustomer?.email}, role: ${refreshedCustomer?.role}`
        : `Customer refresh failed: status ${customerRefreshRes.status}`
    );

    // ----------------------------------------------------
    // Test 3: Admin Login -> Session Creation
    // ----------------------------------------------------
    const adminLoginRes = await makeRequest(port, '/api/auth/admin/login', 'POST', {
      email: 'superadmin@forexsaas.com',
      password: 'SuperAdmin123!',
    });

    const adminToken = adminLoginRes.body?.token;
    const adminUser = adminLoginRes.body?.user;

    const test3Pass =
      adminLoginRes.status === 200 &&
      Boolean(adminToken) &&
      adminUser?.role === 'super_admin';

    record(
      'admin login -> creates admin session',
      test3Pass,
      test3Pass
        ? `Super Admin authenticated successfully. Token issued.`
        : `Admin login failed: status ${adminLoginRes.status}`
    );

    // ----------------------------------------------------
    // Test 4: Admin Refresh -> Remains Admin
    // ----------------------------------------------------
    // Simulating page refresh: browser initializes with saved admin token from localStorage
    const adminRefreshRes = await makeRequest(port, '/api/auth/me', 'GET', null, {
      Authorization: `Bearer ${adminToken}`,
    });

    const refreshedAdmin = adminRefreshRes.body?.user;
    const test4Pass =
      adminRefreshRes.status === 200 &&
      refreshedAdmin?.role === 'super_admin' &&
      refreshedAdmin?.email === 'superadmin@forexsaas.com';

    record(
      'admin -> refresh -> remains admin',
      test4Pass,
      test4Pass
        ? `Admin session restored after refresh. User: ${refreshedAdmin?.email}, role: ${refreshedAdmin?.role}`
        : `Admin refresh failed: status ${adminRefreshRes.status}`
    );

    // ----------------------------------------------------
    // Test 5: Logout -> Refresh -> Remains Logged Out
    // ----------------------------------------------------
    const logoutRes = await makeRequest(port, '/api/auth/logout', 'POST', null, {
      Authorization: `Bearer ${customerToken}`,
    });

    // Simulating browser refresh after logout: client storage was wiped
    const postLogoutRefreshRes = await makeRequest(port, '/api/auth/me', 'GET');

    const test5Pass =
      logoutRes.status === 200 &&
      postLogoutRefreshRes.status === 401 &&
      postLogoutRefreshRes.body?.error?.includes('No session token provided');

    record(
      'logout -> refresh -> remains logged out',
      test5Pass,
      test5Pass
        ? `Logged out. Refresh without stored token returns 401 Unauthorized.`
        : `Logout persistence check failed: status ${postLogoutRefreshRes.status}`
    );

    // ----------------------------------------------------
    // Test 6: Expired / Invalid Session -> Rejected with 401
    // ----------------------------------------------------
    // Create an expired token (exp in past)
    const expiredToken = generateToken({
      userId: customerUser.id,
      email: customerUser.email,
      role: customerUser.role,
      exp: Date.now() - 60000, // 1 minute in the past
    });

    const expiredRes = await makeRequest(port, '/api/auth/me', 'GET', null, {
      Authorization: `Bearer ${expiredToken}`,
    });

    const tamperedToken = customerToken + 'tampered_signature';
    const tamperedRes = await makeRequest(port, '/api/auth/me', 'GET', null, {
      Authorization: `Bearer ${tamperedToken}`,
    });

    const test6Pass =
      expiredRes.status === 401 &&
      tamperedRes.status === 401;

    record(
      'expired/invalid session -> rejected with 401',
      test6Pass,
      test6Pass
        ? `Expired token status: ${expiredRes.status} (${expiredRes.body?.error}), Tampered token status: ${tamperedRes.status} (${tamperedRes.body?.error})`
        : `Failed rejection check: expired=${expiredRes.status}, tampered=${tamperedRes.status}`
    );

    // ----------------------------------------------------
    // Test 7: Unauthorized Role Access -> Still Blocked
    // ----------------------------------------------------
    // Customer attempting to access protected Admin endpoints
    const customerAccessAdminUsers = await makeRequest(port, '/api/admin/users', 'GET', null, {
      Authorization: `Bearer ${customerToken}`,
    });

    const customerAccessAdminSettings = await makeRequest(
      port,
      '/api/admin/settings/manual-trade-close',
      'POST',
      { enabled: true },
      { Authorization: `Bearer ${customerToken}` }
    );

    const test7Pass =
      customerAccessAdminUsers.status === 403 &&
      customerAccessAdminSettings.status === 403;

    record(
      'unauthorized role -> still blocked',
      test7Pass,
      test7Pass
        ? `Customer blocked from admin endpoints: /api/admin/users -> ${customerAccessAdminUsers.status}, /api/admin/settings/* -> ${customerAccessAdminSettings.status}`
        : `Customer was not blocked properly: users=${customerAccessAdminUsers.status}, settings=${customerAccessAdminSettings.status}`
    );

    // ----------------------------------------------------
    // Test 8: Protected API Requests Remain Strictly Protected
    // ----------------------------------------------------
    const unauthenticatedCustomer = await makeRequest(port, '/api/customer/overview', 'GET');
    const unauthenticatedAdmin = await makeRequest(port, '/api/admin/users', 'GET');

    const test8Pass =
      unauthenticatedCustomer.status === 401 &&
      unauthenticatedAdmin.status === 401;

    record(
      'protected API requests remain protected',
      test8Pass,
      test8Pass
        ? `Unauthenticated requests blocked: customer endpoint -> ${unauthenticatedCustomer.status}, admin endpoint -> ${unauthenticatedAdmin.status}`
        : `Unauthenticated access was not blocked: customer=${unauthenticatedCustomer.status}, admin=${unauthenticatedAdmin.status}`
    );

  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${results.filter((r) => r.passed).length}/${results.length} TESTS PASSED`);
  console.log('====================================================\n');

  const allPassed = results.every((r) => r.passed);
  if (!allPassed) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAuthPersistenceTests().catch((err) => {
  console.error('Fatal error running auth persistence tests:', err);
  process.exit(1);
});
