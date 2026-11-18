/**
 * SigV4 Signer for AWS Lambda Function URL (AWS_IAM auth)
 * Used to sign HTTP requests to Lambda Function URL with streaming support
 */

import {
  SignatureV4,
  SignatureV4CryptoInit,
  SignatureV4Init,
} from '@aws-sdk/signature-v4'
import { Sha256 } from '@aws-crypto/sha256-js'

export interface SigV4Config {
  region: string
  service: string
  credentials: {
    accessKeyId: string
    secretAccessKey: string
    sessionToken?: string
  }
}

export function createSigV4Signer(config: SigV4Config): SignatureV4 {
  const init: SignatureV4Init & SignatureV4CryptoInit = {
    region: config.region,
    service: config.service,
    credentials: {
      accessKeyId: config.credentials.accessKeyId,
      secretAccessKey: config.credentials.secretAccessKey,
      sessionToken: config.credentials.sessionToken,
    },
    sha256: Sha256,
  }
  return new SignatureV4(init)
}

export interface SignableRequest {
  method: string
  hostname: string
  path: string
  protocol: string
  headers: Record<string, string>
  body?: string | Uint8Array
}

/**
 * Sign a request for AWS Lambda Function URL
 * Returns headers that can be used with fetch()
 */
export async function signRequest(
  signer: SignatureV4,
  request: SignableRequest
): Promise<Record<string, string>> {
  // Create a minimal request object for signing
  const signable = {
    method: request.method,
    hostname: request.hostname,
    path: request.path,
    protocol: request.protocol,
    headers: request.headers,
    body: request.body,
  } as any
  
  const signed = await signer.sign(signable)
  // signer.sign returns a signed request object with headers
  return (signed as any).headers as Record<string, string>
}

export function createSignableRequest(
  url: string,
  method: string,
  body: string | Uint8Array | undefined,
  headers: Record<string, string> = {}
): SignableRequest {
  const urlObj = new URL(url)
  return {
    method,
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    protocol: urlObj.protocol,
    headers: {
      host: urlObj.host,
      'content-type': 'application/json',
      ...headers,
    },
    body: body as Uint8Array | undefined,
  }
}

/**
 * Stream response from Lambda Function URL
 * Yields parsed JSON chunks from the streaming response
 */
export async function* streamLambdaResponse(
  functionUrl: string,
  payload: { query: string; history?: string },
  signer: SignatureV4
): AsyncGenerator<string, void, unknown> {
  const body = JSON.stringify(payload)
  
  const signableRequest = createSignableRequest(functionUrl, 'POST', body)
  const signedHeaders = await signRequest(signer, signableRequest)
  
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: signedHeaders,
    body,
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Lambda Function URL error: ${response.status} ${errorText}`)
  }
  
  // Lambda Function URL with response streaming returns NDJSON
  // Each line is a JSON object
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }
  
  const decoder = new TextDecoder()
  let buffer = ''
  
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const parsed = JSON.parse(line)
            // Lambda streaming format: { "body": "chunk", "isFinal": false }
            if (parsed.body) {
              yield typeof parsed.body === 'string' ? parsed.body : JSON.stringify(parsed.body)
            } else if (parsed.response) {
              yield parsed.response
            } else {
              yield line
            }
          } catch {
            yield line
          }
        }
      }
    }
    
    // Process remaining buffer
    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer)
        if (parsed.body) {
          yield typeof parsed.body === 'string' ? parsed.body : JSON.stringify(parsed.body)
        } else if (parsed.response) {
          yield parsed.response
        } else {
          yield buffer
        }
      } catch {
        yield buffer
      }
    }
  } finally {
    reader.releaseLock()
  }
}