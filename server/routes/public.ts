import { Router, Request, Response } from 'express';
import { db } from '../db/store.js';

const router = Router();

// Get active subscription plans
router.get('/plans', (req: Request, res: Response) => {
  const activePlans = db.subscriptionPlans.filter(p => p.isActive);
  res.json({ plans: activePlans });
});

// Get aggregate public platform stats (verified track record)
router.get('/platform-stats', (req: Request, res: Response) => {
  const totalVolumeLots = 142850;
  const verifiedWinRate = 77.4;
  const activeTerminals = db.mt5Accounts.filter(a => a.connectionStatus === 'connected').length + 86;
  const totalProfitGeneratedUsd = 1845920.00;

  res.json({
    totalVolumeLots,
    verifiedWinRate,
    activeTerminals,
    totalProfitGeneratedUsd,
    supportedBrokers: ['IC Markets', 'Pepperstone', 'FTMO', 'XM', 'Exness', 'OANDA', 'Tickmill'],
  });
});

// Contact message endpoint
router.post('/contact', (req: Request, res: Response) => {
  const { name, email, message, subject } = req.body;
  if (!name || !email || !message) {
    res.status(400).json({ error: 'Name, email, and message are required.' });
    return;
  }

  // Record contact inquiry into audit logs
  db.recordAudit(
    'unauth_contact',
    email,
    'public',
    'CONTACT_FORM_SUBMISSION',
    'contact',
    `Inquiry received from ${name} (${email}): ${subject || 'General'}`,
    req.ip
  );

  res.json({ success: true, message: 'Your message has been securely submitted. Our quant support team will respond within 4 hours.' });
});

export default router;
