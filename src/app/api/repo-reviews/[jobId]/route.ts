import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'

const TABLE_NAME = process.env.REPO_REVIEW_TABLE_NAME || 'repo-review-jobs'
const AWS_REGION = process.env.AWS_REGION || 'us-east-2'

const dynamoClient = new DynamoDBClient({ region: AWS_REGION })

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  if (!jobId) {
    return NextResponse.json(
      { success: false, error: 'Missing jobId' },
      { status: 400 }
    )
  }

  try {
    const result = await dynamoClient.send(new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { jobId: { S: jobId } },
    }))

    if (!result.Item) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    const job = unmarshall(result.Item)

    return NextResponse.json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      partialResult: job.partialResult || '',
      result: job.result || '',
      error: job.error || '',
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    })
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch job' },
      { status: 500 }
    )
  }
}