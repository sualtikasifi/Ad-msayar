import rateLimit from 'express-rate-limit';

// General limiter for the auth surface (guest creation, refresh, logout, etc.).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla istek. Lütfen biraz sonra tekrar deneyin.' },
});

// Stricter limiter for credential endpoints (login/register) to deter brute force.
// Only failed attempts count, so legitimate users are not blocked.
export const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla deneme. Lütfen biraz sonra tekrar deneyin.' },
});
