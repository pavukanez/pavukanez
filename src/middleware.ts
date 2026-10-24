/**
 * Edge Middleware: Authentication + Rate Limiting
 * 
 * Runs at Vercel Edge before API route executes
 * - Verifies Authorization: Bearer <SANDBOX_API_KEY>
 * - Rate limits: 60 req/min per IP
 * 
 * Requires Vercel KV (free tier: 100k requests/month)
 * Alternative: use in-memory Map for single-instance (resets on deploy)
 */

import { NextRequest, NextResponse } from 'next/server'
import { SANDBOX_API_KEY } from '@/lib/auth'

// Rate limit config
const RATE_LIMIT = 60          // requests
const WINDOW_SEC = 60          // 1 minute window

// In-memory fallback (resets on cold start / deploy)
// For production, use Vercel KV: import { kv } from '@vercel/kv'
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'anonymous'
}

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now()
  const key = `ratelimit:sandbox:${ip}`
  const record = rateLimitStore.get(key)
  
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + WINDOW_SEC * 1000 })
    return { allowed: true, remaining: RATE_LIMIT - 1 }
  }
  
  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 }
  }
  
  record.count++
  return { allowed: true, remaining: RATE_LIMIT - record.count }
}

export async function middleware(request: NextRequest) {
  // Only protect the sandbox invoke endpoint
  if (!request.nextUrl.pathname.startsWith('/api/lambda/invoke')) {
    return NextResponse.next()
  }
  
  // 1. Authentication: Verify Bearer token
  const authHeader = request.headers.get('authorization')
  const expectedAuth = `Bearer ${SANDBOX_API_KEY}`
  
  if (!authHeader || authHeader !== expectedAuth) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized: Invalid or missing API key' },
      { status: 401 }
    )
  }
  
  // 2. Rate Limiting: 60 req/min per IP
  const ip = getClientIp(request)
  const { allowed, remaining } = await checkRateLimit(ip)
  
  if (!allowed) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Rate limit exceeded. Try again in 60 seconds.',
        retryAfter: WINDOW_SEC 
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(WINDOW_SEC),
          'X-RateLimit-Limit': String(RATE_LIMIT),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((Date.now() + WINDOW_SEC * 1000) / 1000)),
        }
      }
    )
  }
  
  // Add rate limit headers to successful responses
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT))
  response.headers.set('X-RateLimit-Remaining', String(remaining))
  response.headers.set('X-RateLimit-Reset', String(Math.ceil((Date.now() + WINDOW_SEC * 1000) / 1000)))
  
  return response
}

export const config = {
  matcher: '/api/lambda/invoke/:path*',
}