/**
 * Input Validation for Sandbox Queries
 */

export interface ValidationResult {
  valid: boolean
  error?: string
  sanitized: string
}

/**
 * Validate and sanitize sandbox query input
 * Rules:
 * - Required, non-empty
 * - Max 2000 characters
 * - Block dangerous patterns (XSS, SQL, template injection)
 * - Sanitize: strip control chars, normalize whitespace
 */
export function validateSandboxQuery(input: string): ValidationResult {
  const trimmed = input.trim()
  
  if (!trimmed) {
    return { valid: false, error: 'Query cannot be empty', sanitized: '' }
  }
  
  if (trimmed.length > 2000) {
    return { valid: false, error: 'Query too long (max 2000 characters)', sanitized: '' }
  }
  
  // Block dangerous patterns
  const dangerousPatterns = [
    // XSS
    /<script\b/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    // SQL Injection
    /\bunion\s+select\b/i,
    /\bdrop\s+table\b/i,
    /\bdelete\s+from\b/i,
    /\binsert\s+into\b/i,
    /\bupdate\s+set\b/i,
    // Template Injection
    /\$\{.*\}/,
    /<%=.*%>/,
    /\{\{.*\}\}/,
    // Command Injection
    /;\s*(rm|cat|ls|wget|curl|nc|bash|sh)\b/i,
    /\|\s*(rm|cat|ls|wget|curl|nc|bash|sh)\b/i,
    // Path Traversal
    /\.\.\//,
    /\.\.\\/,
  ]
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      return { 
        valid: false, 
        error: 'Query contains disallowed patterns', 
        sanitized: '' 
      }
    }
  }
  
  // Sanitize
  const sanitized = trimmed
    .replace(/[\x00-\x1F\x7F]/g, '') // Control characters
    .replace(/\s+/g, ' ')            // Normalize whitespace
    .slice(0, 2000)
  
  return { valid: true, sanitized }
}

/**
 * Validate request body structure
 */
export function validateRequestBody(body: unknown): { valid: boolean; error?: string; payload?: unknown } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' }
  }
  
  const b = body as Record<string, unknown>
  
  if (!b.payload) {
    return { valid: false, error: 'Missing payload in request body' }
  }
  
  // For text query: payload should be { query: string, history?: string }
  if (typeof b.payload === 'object' && b.payload !== null) {
    const p = b.payload as Record<string, unknown>
    if (typeof p.query === 'string') {
      return { 
        valid: true, 
        payload: { 
          query: p.query,
          history: typeof p.history === 'string' ? p.history : ''
        } 
      }
    }
  }
  
  // Legacy: allow any payload for backward compat
  return { valid: true, payload: b.payload }
}