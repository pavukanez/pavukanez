/**
 * Sandbox Authentication
 * 
 * Most secure free option for Vercel-only calls:
 * - Shared secret verified in Edge Middleware (runs before function)
 * - Secret never exposed to client bundle
 * - Uses Vercel encrypted environment variables
 * 
 * Setup:
 * 1. Add SANDBOX_API_KEY to Vercel Environment Variables (encrypted)
 * 2. Middleware verifies Authorization: Bearer <key> header
 * 3. Client doesn't need the key - middleware handles auth
 */

export const SANDBOX_API_KEY = process.env.SANDBOX_API_KEY

export function verifySandboxAuth(request: Request): boolean {
  if (!SANDBOX_API_KEY) {
    console.error('SANDBOX_API_KEY not configured')
    return false
  }
  
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false
  
  const [scheme, token] = authHeader.split(' ')
  return scheme === 'Bearer' && token === SANDBOX_API_KEY
}

/**
 * Generate a secure random API key for initial setup
 * Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export function generateApiKey(): string {
  const crypto = require('crypto')
  return crypto.randomBytes(32).toString('hex')
}