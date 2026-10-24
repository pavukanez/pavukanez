import { NextRequest, NextResponse } from 'next/server';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { fromEnv, fromIni } from '@aws-sdk/credential-providers';

// Initialize Lambda client with credentials from environment
// On Vercel, set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION as environment variables
// For local development, it can use ~/.aws/credentials via fromIni()
const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? fromEnv()
    : fromIni({ profile: process.env.AWS_PROFILE || 'default' }),
});

// Lambda function name from environment variable
const LAMBDA_FUNCTION_NAME = process.env.LAMBDA_FUNCTION_NAME;

export async function POST(request: NextRequest) {
  try {
    if (!LAMBDA_FUNCTION_NAME) {
      return NextResponse.json(
        {
          success: false,
          error: 'LAMBDA_FUNCTION_NAME environment variable not configured',
        },
        { status: 500 },
      );
    }

    const body = await request.json();
    const payload = body.payload;

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Missing payload in request body' },
        { status: 400 },
      );
    }

    // Invoke Lambda function
    const command = new InvokeCommand({
      FunctionName: LAMBDA_FUNCTION_NAME,
      Payload: Buffer.from(JSON.stringify(payload)),
      InvocationType: 'RequestResponse', // Synchronous invocation
    });

    const response = await lambdaClient.send(command);

    // Parse the response payload
    let responseData: unknown;
    if (response.Payload) {
      const payloadText = Buffer.from(response.Payload as Uint8Array).toString(
        'utf-8',
      );
      try {
        responseData = JSON.parse(payloadText);
      } catch {
        responseData = payloadText;
      }
    }

    // Check for Lambda function errors
    if (response.FunctionError) {
      return NextResponse.json(
        {
          success: false,
          error: responseData,
          requestId: response.$metadata.requestId,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      requestId: response.$metadata.requestId,
    });
  } catch (error) {
    console.error('Lambda invocation error:', error);

    if (error instanceof Error) {
      // Handle specific AWS errors
      if (error.name === 'ResourceNotFoundException') {
        return NextResponse.json(
          { success: false, error: 'Lambda function not found' },
          { status: 404 },
        );
      }
      if (error.name === 'AccessDeniedException') {
        return NextResponse.json(
          { success: false, error: 'Access denied to invoke Lambda function' },
          { status: 403 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}