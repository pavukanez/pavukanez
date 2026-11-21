import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'

const REPO_REVIEW_QUEUE_URL = process.env.REPO_REVIEW_QUEUE_URL || 'https://sqs.us-east-2.amazonaws.com/098876901014/repo-review-queue'
const AWS_REGION = process.env.AWS_REGION || 'us-east-2'

const sqsClient = new SQSClient({ region: AWS_REGION })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, focus } = body

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: url' },
        { status: 400 }
      )
    }

    // Validate GitHub URL
    const githubRegex = /^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/
    if (!githubRegex.test(url)) {
      return NextResponse.json(
        { success: false, error: 'Invalid GitHub URL format' },
        { status: 400 }
      )
    }

    const jobId = uuidv4()

    // Send to SQS
    await sqsClient.send(new SendMessageCommand({
      QueueUrl: REPO_REVIEW_QUEUE_URL,
      MessageBody: JSON.stringify({ jobId, url, focus }),
    }))

    return NextResponse.json({
      success: true,
      jobId,
      status: 'pending',
      message: 'Repo review job queued. Poll GET /api/repo-reviews/{jobId} for status.'
    })

  } catch (error) {
    console.error('Error creating repo review job:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create repo review job' },
      { status: 500 }
    )
  }
}