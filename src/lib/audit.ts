/**
 * Audit Logging for Sandbox
 * 
 * Structured JSON logs for:
 * - Vercel Logs (stdout)
 * - CloudWatch (if using AWS)
 * - External: Axiom, Datadog, Logtail, etc.
 * 
 * Privacy: Query content is hashed (SHA-256), not logged in plaintext
 */

import { createHash } from 'crypto'

export interface AuditEvent {
  timestamp: string
  event: 'sandbox_invoke'
  ip: string
  userAgent: string
  userId?: string
  queryLength: number
  queryHash: string        // First 16 chars of SHA-256
  success: boolean
  latencyMs: number
  requestId: string
  error?: string
}

/**
 * Hash query for privacy-safe logging
 */
function hashQuery(query: string): string {
  return createHash('sha256').update(query).digest('hex').slice(0, 16)
}

/**
 * Extract client IP from request
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

/**
 * Log audit event as structured JSON to stdout
 * Vercel captures stdout automatically
 * Can be piped to CloudWatch, Datadog, Axiom, etc.
 */
export function logAudit(event: AuditEvent): void {
  const logLine = JSON.stringify(event)
  // eslint-disable-next-line no-console
  console.log(logLine)
}

/**
 * Create and log audit event
 */
export function createAuditLog(params: {
  request: Request
  query: string
  success: boolean
  latencyMs: number
  requestId: string
  error?: string
  userId?: string
}): void {
  const ip = getClientIp(params.request)
  const ua = params.request.headers.get('user-agent') || 'unknown'
  const queryHash = hashQuery(params.query)
  
  const event: AuditEvent = {
    timestamp: new Date().toISOString(),
    event: 'sandbox_invoke',
    ip,
    userAgent: ua,
    userId: params.userId,
    queryLength: params.query.length,
    queryHash,
    success: params.success,
    latencyMs: params.latencyMs,
    requestId: params.requestId,
    error: params.error,
  }
  
  logAudit(event)
}

/**
 * Structured error logging
 */
export function logError(context: string, error: unknown, extra?: Record<string, unknown>): void {
  const errorInfo = error instanceof Error 
    ? { message: error.message, stack: error.stack, name: error.name }
    : { message: String(error) }
  
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    context,
    error: errorInfo,
    ...extra,
  }))
}