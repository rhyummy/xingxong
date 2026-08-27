import { z } from 'zod';
import rateLimit from 'express-rate-limit';

/* ------------------------------------------------------------------ cors */

/**
 * Allowlist rather than open CORS. Defaults cover local dev; set
 * ALLOWED_ORIGINS (comma-separated) for anything else.
 */
export function corsOptions() {
  const configured = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const allowed = configured.length
    ? configured
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

  return {
    origin(origin, callback) {
      // Same-origin and non-browser callers (curl, server-to-server) send no
      // Origin header — those are not the attack this control addresses.
      if (!origin) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);
      const err = new Error(`Origin not allowed: ${origin}`);
      err.status = 403;
      callback(err);
    },
    credentials: true,
  };
}

/* ------------------------------------------------------- rate limiting */

const limiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });

/** Generous: plain reads are cheap. */
export const readLimiter = limiter(60_000, 120, 'Too many requests — slow down.');

/** Tight: every escalated run spends LLM quota. */
export const pipelineLimiter = limiter(
  60_000,
  20,
  'Pipeline rate limit reached. These runs call an LLM — wait a minute.'
);

/** Tightest: mutations that move money. */
export const writeLimiter = limiter(60_000, 10, 'Too many write attempts.');

/* ---------------------------------------------------------------- auth */

/**
 * Shared-secret gate for endpoints that change purchase-order state.
 *
 * This is deliberately not a full identity system — it stops an unauthenticated
 * caller approving spend, which is the gap that matters here. Real deployment
 * would use Supabase Auth and record which user approved what.
 *
 * Open when APPROVAL_SECRET is unset, so local development and the offline
 * demo keep working; the server logs a warning at startup in that case.
 */
export function requireApprovalSecret(req, res, next) {
  const secret = process.env.APPROVAL_SECRET;
  if (!secret) return next();

  const presented = req.get('x-approval-secret');
  if (presented && presented === secret) return next();

  res.status(401).json({
    error: 'Approval requires the x-approval-secret header.',
  });
}

/* ---------------------------------------------------------- validation */

export const schemas = {
  partId: z.object({
    partId: z
      .string()
      .trim()
      .regex(/^P-\d{4}$/, 'partId must look like P-1234'),
  }),

  poStatus: z.object({
    status: z.enum(['issued', 'pending-approval', 'approved', 'rejected']),
    approvedBy: z.string().trim().min(1).max(120).optional(),
  }),

  listQuery: z.object({
    limit: z.coerce.number().int().min(1).max(200).default(50),
  }),
};

/**
 * Validates `req[source]` against a schema, replacing it with the parsed
 * result so downstream handlers see coerced, trusted values.
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: result.error.issues.map((i) => ({
          field: i.path.join('.') || '(root)',
          problem: i.message,
        })),
      });
    }
    // req.query is a getter in Express 5; assign to a separate field instead.
    if (source === 'query') req.validatedQuery = result.data;
    else req[source] = result.data;
    next();
  };
}

/* ------------------------------------------------------- error handler */

/**
 * Terminal error handler. Without this a rejected CORS origin surfaces as a
 * 500, which reads as a server fault rather than a refused request.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies handlers by arity
export function errorHandler(err, req, res, next) {
  const status = err.status ?? 500;
  if (status >= 500) console.error('Unhandled error:', err);
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
}
