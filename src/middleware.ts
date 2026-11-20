/**
 * Edge Middleware: Rate Limiting
 * 
 * Runs at Vercel Edge before API route executes
 * - Rate limits: 60 req/min per IP (distributed via Upstash Redis)
 * 
 * Uses Upstash Redis for distributed rate limiting across Edge instances
 * Free tier: 100k requests/day
 * 
 * Authentication is handled by AWS_IAM at the Lambda Function URL level.
 * The Next.js API route signs requests with SigV4 using AWS credentials.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

// Rate limit config
const RATE_LIMIT = 60          // requests
const WINDOW_SEC = 60          // 1 minute window
const WINDOW_MS = WINDOW_SEC * 1000

// Upstash Redis client (Edge-compatible REST client)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'anonymous'
}

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const now = Date.now()
  const key = `ratelimit:sandbox:${ip}`
  const windowStart = now - WINDOW_MS

  try {
    // Remove expired entries (outside the window)
    await redis.zremrangebyscore(key, 0, windowStart)

    // Count current requests in window
    const count = await redis.zcard(key)

    if (count >= RATE_LIMIT) {
      // Get oldest entry to calculate retry-after
      const oldest = await redis.zrange(key, 0, 0, { withScores: true })
      const resetAt = oldest.length > 0 ? (oldest[0] as { score: number }).score + WINDOW_MS : now + WINDOW_MS
      const retryAfter = Math.ceil((resetAt - now) / 1000)
      return { allowed: false, remaining: 0, retryAfter }
    }

    // Add current request with unique member (timestamp + random)
    const member = `${now}-${Math.random().toString(36).slice(2)}`
    await redis.zadd(key, { score: now, member })
    
    // Set TTL to auto-cleanup
    await redis.expire(key, WINDOW_SEC)

    return { allowed: true, remaining: RATE_LIMIT - count - 1 }
  } catch (error) {
    // Fail-open: allow request if Redis is unavailable
    console.warn('[RateLimit] Redis error, failing open:', error)
    return { allowed: true, remaining: RATE_LIMIT }
  }
}

export async function middleware(request: NextRequest) {
  // Only protect the sandbox invoke endpoint
  if (!request.nextUrl.pathname.startsWith('/api/lambda/invoke')) {
    return NextResponse.next()
  }
  
  // Rate Limiting: 60 req/min per IP (auth is handled by AWS_IAM at Lambda Function URL)
  const ip = getClientIp(request)
  const { allowed, remaining, retryAfter } = await checkRateLimit(ip)
  
  if (!allowed) {
    const retryAfterSec = retryAfter || WINDOW_SEC
    return NextResponse.json(
      { 
        success: false, 
        error: 'Rate limit exceeded. Try again later.',
        retryAfter: retryAfterSec 
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(RATE_LIMIT),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((Date.now() + retryAfterSec * 1000) / 1000)),
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