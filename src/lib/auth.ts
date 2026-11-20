/**
 * Utility function to generate a secure random API key.
 * Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
export function generateApiKey(): string {
  const crypto = require('crypto')
  return crypto.randomBytes(32).toString('hex')
}