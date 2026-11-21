import { NextRequest, NextResponse } from 'next/server'
import { fromEnv, fromIni } from '@aws-sdk/credential-providers'
import { validateSandboxQuery, validateRequestBody } from '@/lib/validation'
import { createAuditLog, logError, getClientIp } from '@/lib/audit'
import { createSigV4Signer, streamLambdaResponse, callLambdaNonStreaming } from '@/lib/sigv4'

// Initialize credentials for SigV4 signing
const credentialsProvider = process.env.AWS_ACCESS_KEY_ID
  ? fromEnv()
  : fromIni({ profile: process.env.AWS_PROFILE || 'default' })

// Lambda Function URL from environment
const LAMBDA_FUNCTION_URL = process.env.LAMBDA_FUNCTION_URL
const AWS_REGION = process.env.AWS_REGION || 'us-east-2'

let sigv4Signer: ReturnType<typeof createSigV4Signer> | null = null

async function getSigV4Signer() {
  if (sigv4Signer) return sigv4Signer
  
  const credentials = await credentialsProvider()
  sigv4Signer = createSigV4Signer({
    region: AWS_REGION,
    service: 'lambda',
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    },
  })
  return sigv4Signer
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = crypto.randomUUID()
  const clientIp = getClientIp(request)
  const wantsStream = request.headers.get('accept')?.includes('text/event-stream')

  try {
    // Validate environment
    if (!LAMBDA_FUNCTION_URL) {
      logError('config_missing', new Error('LAMBDA_FUNCTION_URL not set'), { ip: clientIp })
      return NextResponse.json(
        { success: false, error: 'LAMBDA_FUNCTION_URL environment variable not configured' },
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
      query = JSON.stringify(payload)
    }

    const lambdaPayload = { query, history, stream: wantsStream }
    const signer = await getSigV4Signer()

    // No custom Authorization header needed - AWS_IAM auth via SigV4 signing
    const lambdaHeaders: Record<string, string> = {}

    if (wantsStream) {
      // Streaming response via Server-Sent Events
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of streamLambdaResponse(LAMBDA_FUNCTION_URL, lambdaPayload, signer, lambdaHeaders)) {
              const data = `data: ${JSON.stringify({ response: chunk })}\n\n`
              controller.enqueue(encoder.encode(data))
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            
            // Audit log after streaming completes
            createAuditLog({
              request,
              query,
              success: true,
              latencyMs: Date.now() - startTime,
              requestId,
            })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Streaming error'
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`))
            controller.error(error)
            
            logError('lambda_stream', error, { ip: clientIp, latencyMs: Date.now() - startTime })
            createAuditLog({
              request,
              query,
              success: false,
              latencyMs: Date.now() - startTime,
              requestId,
              error: errorMessage,
            })
          }
        },
      })

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Request-Id': requestId,
        },
      })
    }

    // Non-streaming: use regular Lambda response format
    const lambdaResponse = await callLambdaNonStreaming(LAMBDA_FUNCTION_URL, lambdaPayload, signer, lambdaHeaders)
    const latencyMs = Date.now() - startTime

    // Audit log
    createAuditLog({
      request,
      query,
      success: true,
      latencyMs,
      requestId,
    })

    return NextResponse.json({
      success: true,
      response: lambdaResponse.response,
      model: lambdaResponse.model,
      usage: lambdaResponse.usage,
      jobId: lambdaResponse.jobId,
      status: lambdaResponse.status,
      message: lambdaResponse.message,
      requestId,
    })

  } catch (error) {
    const latencyMs = Date.now() - startTime

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
