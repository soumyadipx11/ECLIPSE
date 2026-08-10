import { Request, Response, NextFunction } from "express";

// Configurable thresholds with defaults from environment variables
export const rateLimitConfig = {
  // Auth routes (stricter limits with per-IP + per-account + exponential backoff)
  authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 mins
  authMaxAttemptsIp: parseInt(process.env.AUTH_MAX_ATTEMPTS_PER_IP || "5", 10), // 5 failures per IP
  authMaxAttemptsAccount: parseInt(process.env.AUTH_MAX_ATTEMPTS_PER_ACCOUNT || "5", 10), // 5 failures per account
  authBackoffBaseSec: parseInt(process.env.AUTH_EXPONENTIAL_BACKOFF_BASE_SEC || "2", 10), // 2s base backoff
  authBackoffMaxSec: parseInt(process.env.AUTH_EXPONENTIAL_BACKOFF_MAX_SEC || "900", 10), // 15 mins max backoff

  // Public endpoints (moderate limits)
  publicWindowMs: parseInt(process.env.PUBLIC_RATE_LIMIT_WINDOW_MS || "60000", 10), // 1 min
  publicMaxRequests: parseInt(process.env.PUBLIC_RATE_LIMIT_MAX_REQUESTS || "30", 10), // 30 req/min

  // Authenticated endpoints (looser limits)
  authedWindowMs: parseInt(process.env.AUTHED_RATE_LIMIT_WINDOW_MS || "60000", 10), // 1 min
  authedMaxRequests: parseInt(process.env.AUTHED_RATE_LIMIT_MAX_REQUESTS || "120", 10), // 120 req/min
};

interface AuthRecord {
  failures: number;
  lastFailureTime: number;
  attempts: number[];
}

interface GeneralRecord {
  count: number;
  resetTime: number;
}

// In-memory rate limit stores
const ipAuthStore = new Map<string, AuthRecord>();
const accountAuthStore = new Map<string, AuthRecord>();
const generalStore = new Map<string, GeneralRecord>();

// Helper to clean expired entries periodically
setInterval(() => {
  const now = Date.now();

  for (const [key, record] of ipAuthStore.entries()) {
    if (now - record.lastFailureTime > rateLimitConfig.authWindowMs * 2) {
      ipAuthStore.delete(key);
    }
  }
  for (const [key, record] of accountAuthStore.entries()) {
    if (now - record.lastFailureTime > rateLimitConfig.authWindowMs * 2) {
      accountAuthStore.delete(key);
    }
  }
  for (const [key, record] of generalStore.entries()) {
    if (now > record.resetTime) {
      generalStore.delete(key);
    }
  }
}, 60000);

export function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = (typeof forwarded === "string" ? forwarded : forwarded[0]).split(",");
    return ips[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "127.0.0.1";
}

/**
 * Calculates exponential backoff delay in seconds.
 * Formula: baseSec * 2^(failures - threshold)
 */
export function calculateBackoffDelaySec(excessFailures: number): number {
  if (excessFailures <= 0) return 0;
  const delay = rateLimitConfig.authBackoffBaseSec * Math.pow(2, excessFailures - 1);
  return Math.min(rateLimitConfig.authBackoffMaxSec, Math.round(delay));
}

/**
 * Evaluates whether current IP or account is rate-limited for authentication.
 */
export function checkAuthRateLimit(ip: string, email?: string): {
  limited: boolean;
  retryAfterSec: number;
  reason?: string;
  isIpLimited: boolean;
  isAccountLimited: boolean;
  currentFailures: number;
} {
  const now = Date.now();
  let maxRetrySec = 0;
  let isIpLimited = false;
  let isAccountLimited = false;
  let reason = "";
  let highestFailures = 0;

  // 1. Check IP store
  const ipRecord = ipAuthStore.get(ip);
  if (ipRecord && ipRecord.failures >= rateLimitConfig.authMaxAttemptsIp) {
    const excess = ipRecord.failures - rateLimitConfig.authMaxAttemptsIp + 1;
    const requiredDelaySec = calculateBackoffDelaySec(excess);
    const timePassedSec = (now - ipRecord.lastFailureTime) / 1000;

    if (timePassedSec < requiredDelaySec) {
      const remainingSec = Math.ceil(requiredDelaySec - timePassedSec);
      if (remainingSec > maxRetrySec) {
        maxRetrySec = remainingSec;
        isIpLimited = true;
        reason = `IP rate limit reached (${ipRecord.failures} consecutive auth failures). Exponential backoff active.`;
      }
    }
    highestFailures = Math.max(highestFailures, ipRecord.failures);
  }

  // 2. Check Account store
  if (email) {
    const cleanEmail = email.toLowerCase().trim();
    const accountRecord = accountAuthStore.get(cleanEmail);
    if (accountRecord && accountRecord.failures >= rateLimitConfig.authMaxAttemptsAccount) {
      const excess = accountRecord.failures - rateLimitConfig.authMaxAttemptsAccount + 1;
      const requiredDelaySec = calculateBackoffDelaySec(excess);
      const timePassedSec = (now - accountRecord.lastFailureTime) / 1000;

      if (timePassedSec < requiredDelaySec) {
        const remainingSec = Math.ceil(requiredDelaySec - timePassedSec);
        if (remainingSec > maxRetrySec) {
          maxRetrySec = remainingSec;
          isAccountLimited = true;
          reason = `Account rate limit reached for ${cleanEmail} (${accountRecord.failures} consecutive auth failures). Exponential backoff active.`;
        }
      }
      highestFailures = Math.max(highestFailures, accountRecord.failures);
    }
  }

  return {
    limited: maxRetrySec > 0,
    retryAfterSec: maxRetrySec,
    reason: reason || undefined,
    isIpLimited,
    isAccountLimited,
    currentFailures: highestFailures,
  };
}

/**
 * Records an authentication attempt outcome. Resets failure count on success,
 * or increments failure count on failure to drive exponential backoff.
 */
export function recordAuthAttempt(ip: string, email: string | undefined, success: boolean) {
  const now = Date.now();
  const cleanEmail = email ? email.toLowerCase().trim() : undefined;

  // Update IP Record
  let ipRecord = ipAuthStore.get(ip) || { failures: 0, lastFailureTime: 0, attempts: [] };
  if (success) {
    ipRecord.failures = 0;
  } else {
    ipRecord.failures += 1;
    ipRecord.lastFailureTime = now;
  }
  ipRecord.attempts.push(now);
  ipRecord.attempts = ipRecord.attempts.filter((t) => now - t <= rateLimitConfig.authWindowMs);
  ipAuthStore.set(ip, ipRecord);

  // Update Account Record
  if (cleanEmail) {
    let accountRecord = accountAuthStore.get(cleanEmail) || { failures: 0, lastFailureTime: 0, attempts: [] };
    if (success) {
      accountRecord.failures = 0;
    } else {
      accountRecord.failures += 1;
      accountRecord.lastFailureTime = now;
    }
    accountRecord.attempts.push(now);
    accountRecord.attempts = accountRecord.attempts.filter((t) => now - t <= rateLimitConfig.authWindowMs);
    accountAuthStore.set(cleanEmail, accountRecord);
  }

  return {
    ipFailures: ipRecord.failures,
    accountFailures: cleanEmail ? accountAuthStore.get(cleanEmail)?.failures || 0 : 0,
  };
}

/**
 * Express Middleware: Stricter rate limiting for authentication endpoints.
 * Combines per-IP and per-account limits with exponential backoff.
 */
export function authRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const email = req.body?.email || req.query?.email || req.body?.accountIdentifier;

  const check = checkAuthRateLimit(ip, typeof email === "string" ? email : undefined);

  if (check.limited) {
    res.setHeader("Retry-After", check.retryAfterSec.toString());
    res.setHeader("X-RateLimit-Reset-Seconds", check.retryAfterSec.toString());
    return res.status(429).json({
      success: false,
      error: "Too many authentication attempts. Exponential backoff active.",
      details: check.reason,
      retryAfterSeconds: check.retryAfterSec,
      isIpLimited: check.isIpLimited,
      isAccountLimited: check.isAccountLimited,
      currentFailures: check.currentFailures,
    });
  }

  next();
}

/**
 * Express Middleware: Moderate rate limiting for public endpoints (e.g., /health, /api/health).
 */
export function publicRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const key = `public:${ip}`;
  const now = Date.now();

  let record = generalStore.get(key);
  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + rateLimitConfig.publicWindowMs,
    };
    generalStore.set(key, record);
    return next();
  }

  record.count += 1;
  generalStore.set(key, record);

  if (record.count > rateLimitConfig.publicMaxRequests) {
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
    res.setHeader("Retry-After", retryAfterSec.toString());
    return res.status(429).json({
      success: false,
      error: "Public endpoint rate limit exceeded.",
      details: `Maximum ${rateLimitConfig.publicMaxRequests} requests per ${Math.round(
        rateLimitConfig.publicWindowMs / 1000
      )}s allowed. Please try again in ${retryAfterSec} seconds.`,
      retryAfterSeconds: retryAfterSec,
    });
  }

  next();
}

/**
 * Express Middleware: Looser rate limiting for authenticated user actions (e.g., AI/OCR analysis).
 */
export function authedRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const authHeader = req.headers.authorization;
  const userId = req.headers["x-user-id"] || req.body?.userId;

  // Determine if user is authenticated
  const isAuthenticated = Boolean(authHeader || userId || req.body?.userConsentGiven);
  const windowMs = rateLimitConfig.authedWindowMs;
  const maxRequests = isAuthenticated
    ? rateLimitConfig.authedMaxRequests
    : rateLimitConfig.publicMaxRequests; // Fallback to public limit if unauthenticated

  const identifier = isAuthenticated ? `authed:${userId || ip}` : `unauthed:${ip}`;
  const now = Date.now();

  let record = generalStore.get(identifier);
  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    generalStore.set(identifier, record);
    return next();
  }

  record.count += 1;
  generalStore.set(identifier, record);

  if (record.count > maxRequests) {
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
    res.setHeader("Retry-After", retryAfterSec.toString());
    return res.status(429).json({
      success: false,
      error: "Rate limit exceeded for user action.",
      details: `Maximum ${maxRequests} requests per ${Math.round(
        windowMs / 1000
      )}s allowed for ${isAuthenticated ? "authenticated users" : "public requests"}. Please try again in ${retryAfterSec} seconds.`,
      retryAfterSeconds: retryAfterSec,
    });
  }

  next();
}
