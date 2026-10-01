import crypto from 'crypto';

// 32-byte encryption key for AES-256-GCM (256-bit key)
function getEncryptionKey(): Buffer {
  const raw = process.env.MT5_ENCRYPTION_KEY;
  if (raw && raw.length >= 64) {
    return Buffer.from(raw.slice(0, 64), 'hex');
  }
  if (raw) {
    return Buffer.from(raw.padEnd(64, '0').slice(0, 64), 'hex');
  }
  return crypto.scryptSync('forex-saas-mt5-encryption-salt', 'salt', 32);
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt sensitive MT5 investor/trading password using AES-256-GCM.
 * Never stores plain text credentials in the database or logs.
 */
export function encryptCredential(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt MT5 credentials strictly on worker execution dispatch.
 * Never exposed to frontend or logged in plain text.
 */
export function decryptCredential(cipherPayload: string): string {
  if (!cipherPayload || !cipherPayload.includes(':')) return '';
  try {
    const [ivHex, authTagHex, encryptedHex] = cipherPayload.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failure for credential:', err);
    return '***decryption_error***';
  }
}

/**
 * Salted PBKDF2 Password Hashing
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Verify user password against stored hash & salt
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const checkHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkHash, 'hex'));
}

/**
 * Stateless HMAC-SHA256 Token generator
 */
export function generateToken(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const tokenPayload = {
    exp: Date.now() + 24 * 60 * 60 * 1000,
    ...payload,
  };
  const body = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
  const secret = process.env.JWT_SECRET || 'dev-secret-key-forex-mt5-platform';
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
    
  return `${header}.${body}.${signature}`;
}

/**
 * Validate and decode HMAC-SHA256 token
 */
export function verifyToken(token: string): Record<string, any> | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  
  const [header, body, signature] = parts;
  const secret = process.env.JWT_SECRET || 'dev-secret-key-forex-mt5-platform';
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
    
  if (signature !== expectedSignature) {
    return null;
  }
  
  try {
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (decoded.exp && decoded.exp < Date.now()) {
      return null; // Expired
    }
    return decoded;
  } catch {
    return null;
  }
}
