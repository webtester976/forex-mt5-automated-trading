import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/store.js';
import { hashPassword, verifyPassword, generateToken } from '../security/encryption.js';
import { isAdminRole } from '../security/rbac.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Customer Login
router.post('/login', (req: Request, res: Response): void => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const isValid = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  if (user.status === 'suspended') {
    res.status(403).json({ error: 'This account has been suspended by compliance. Please contact support.' });
    return;
  }

  const token = generateToken({ userId: user.id, email: user.email, role: user.role });

  db.recordAudit(user.id, user.email, user.role, 'CUSTOMER_LOGIN_SUCCESS', 'auth', 'Successful customer login via web portal', req.ip);

  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
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
      manualTradeCloseEnabled: user.manualTradeCloseEnabled,
    },
  });
});

// Admin Login (Strictly separate authentication route & validation)
router.post('/admin/login', (req: Request, res: Response): void => {
  const { email, password, twoFactorCode } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    res.status(401).json({ error: 'Invalid administrative credentials.' });
    return;
  }

  // Strict role check: customer credentials cannot log into admin portal
  if (!isAdminRole(user.role)) {
    res.status(403).json({ 
      error: 'Access denied: Provided account does not hold administrative privileges.',
      code: 'ERR_NOT_ADMIN_ROLE'
    });
    return;
  }

  const isValid = verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) {
    db.recordAudit(user.id, user.email, user.role, 'ADMIN_LOGIN_FAILED', 'auth', 'Failed password attempt on admin portal', req.ip);
    res.status(401).json({ error: 'Invalid administrative credentials.' });
    return;
  }

  const token = generateToken({ userId: user.id, email: user.email, role: user.role, isAdmin: true });

  db.recordAudit(user.id, user.email, user.role, 'ADMIN_LOGIN_SUCCESS', 'auth', 'Successful administrator authentication', req.ip);

  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
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
      manualTradeCloseEnabled: user.manualTradeCloseEnabled,
    },
  });
});

// Customer Sign Up
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName } = req.body;
  if (!email || !password || !firstName || !lastName) {
    res.status(400).json({ error: 'First name, last name, email, and password are required.' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    return;
  }

  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    res.status(409).json({ error: 'An account with this email address already exists.' });
    return;
  }

  const { hash, salt } = hashPassword(password);
  const newUserId = crypto.randomUUID();

  const newUser = {
    id: newUserId,
    email: email.toLowerCase(),
    firstName,
    lastName,
    role: 'customer' as const,
    status: 'active' as const,
    kycStatus: 'unverified' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    passwordHash: hash,
    salt,
  };

  await db.createUser(newUser);

  // Initialize customer risk settings
  db.riskSettings.set(newUserId, {
    maxDailyLossPct: 3.0,
    maxDrawdownPct: 8.0,
    maxLotSize: 1.0,
    maxOpenTrades: 5,
    tradingSession: 'ALL_SESSIONS',
    emergencyStop: false,
  });

  const token = generateToken({ userId: newUser.id, email: newUser.email, role: newUser.role });

  db.recordAudit(newUser.id, newUser.email, 'customer', 'CUSTOMER_REGISTRATION', 'users', 'Customer registered account', req.ip);

  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
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
      manualTradeCloseEnabled: false,
    },
  });
});

// Current User Profile / Session
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  res.json({ user: req.user });
});

// Logout
router.post('/logout', (req: Request, res: Response): void => {
  // Clear any auth cookies
  res.clearCookie('auth_token', { httpOnly: true, sameSite: 'lax' });
  res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;
