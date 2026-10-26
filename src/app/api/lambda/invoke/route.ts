import { NextRequest, NextResponse } from 'next/server'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { fromEnv, fromIni } from '@aws-sdk/credential-providers'
import { validateSandboxQuery, validateRequestBody } from '@/lib/validation'
import { createAuditLog, logError, getClientIp } from '@/lib/audit'

// Initialize Lambda client with credentials from environment
// On Vercel, set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION as environment variables
// For local development, it can use ~/.aws/credentials via fromIni()
const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? fromEnv()
    : fromIni({ profile: process.env.AWS_PROFILE || 'default' }),
})

// Lambda function name from environment variable
const LAMBDA_FUNCTION_NAME = process.env.LAMBDA_FUNCTION_NAME

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()
  const clientIp = getClientIp(request)
  
  try {
    // Validate environment
    if (!LAMBDA_FUNCTION_NAME) {
      logError('config_missing', new Error('LAMBDA_FUNCTION_NAME not set'), { ip: clientIp })
      return NextResponse.json(
        { success: false, error: 'LAMBDA_FUNCTION_NAME environment variable not configured' },
        { status: 500 }
      )
    }
    
    // Parse and validate request body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }
    
    const bodyValidation = validateRequestBody(body)
    if (!bodyValidation.valid) {
      return NextResponse.json(
        { success: false, error: bodyValidation.error },
        { status: 400 }
      )
    }
    
    const payload = bodyValidation.payload as { query: string; history?: string } | unknown
    
    // For text query mode: payload = { query: string, history?: string }
    // For backward compat: allow any payload
    let query: string
    let history: string = ''
    
    if (typeof payload === 'object' && payload !== null && 'query' in payload) {
      const p = payload as { query: string; history?: string }
      const queryValidation = validateSandboxQuery(p.query)
      if (!queryValidation.valid) {
        return NextResponse.json(
          { success: false, error: queryValidation.error },
          { status: 400 }
        )
      }
      query = queryValidation.sanitized
      history = p.history || ''
    } else {
      // Legacy: stringify whatever payload was sent
      query = JSON.stringify(payload)
    }
    
    // Invoke Lambda function
    const command = new InvokeCommand({
      FunctionName: LAMBDA_FUNCTION_NAME,
      Payload: Buffer.from(JSON.stringify({ query, history })),
      InvocationType: 'RequestResponse',
    })
    
    const response = await lambdaClient.send(command)
    const latencyMs = Date.now() - startTime
    
    // Parse the response payload
    let responseData: unknown
    if (response.Payload) {
      const payloadText = Buffer.from(response.Payload as Uint8Array).toString('utf-8')
      try {
        responseData = JSON.parse(payloadText)
      } catch {
        responseData = payloadText
      }
    }
    
    // Check for Lambda function errors
    const success = !response.FunctionError
    const errorMessage = response.FunctionError 
      ? (typeof responseData === 'string' ? responseData : JSON.stringify(responseData))
      : undefined
    
    // Audit log
    createAuditLog({
      request,
      query: query,
      success: success,
      latencyMs,
      requestId: response.$metadata.requestId || requestId,
      error: errorMessage,
    })
    
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: responseData,
          requestId: response.$metadata.requestId,
        },
        { status: 502 }
      )
    }
    
    // Extract just the response text from Lambda's body
    let responseText = ''
    if (responseData && typeof responseData === 'object' && 'body' in responseData) {
      const lambdaBody = (responseData as Record<string, unknown>).body
      if (typeof lambdaBody === 'string') {
        try {
          const parsed = JSON.parse(lambdaBody)
          responseText = parsed.response || ''
        } catch {
          responseText = lambdaBody
        }
      } else if (typeof lambdaBody === 'object' && lambdaBody !== null && 'response' in lambdaBody) {
        responseText = (lambdaBody as Record<string, unknown>).response as string
      }
    }

    return NextResponse.json({
      success: true,
      response: responseText,
      requestId: response.$metadata.requestId,
    })
    
  } catch (error) {
    const latencyMs = Date.now() - startTime
    const clientIp = getClientIp(request)
    
    logError('lambda_invoke', error, { ip: clientIp, latencyMs })
    createAuditLog({
      request,
      query: 'unknown',
      success: false,
      latencyMs,
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    
    if (error instanceof Error) {
      if (error.name === 'ResourceNotFoundException') {
        return NextResponse.json(
          { success: false, error: 'Lambda function not found' },
          { status: 404 }
        )
      }
      if (error.name === 'AccessDeniedException') {
        return NextResponse.json(
          { success: false, error: 'Access denied to invoke Lambda function' },
          { status: 403 }
        )
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
