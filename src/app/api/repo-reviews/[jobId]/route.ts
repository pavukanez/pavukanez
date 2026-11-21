import { NextRequest, NextResponse } from 'next/server'

// In-memory store (shared with POST endpoint in production use DynamoDB)
const jobStore = new Map<string, {
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: string
  partialResult?: string
  result?: string
  error?: string
  createdAt: number
  updatedAt: number
}>()

// For demo, we'll use a global reference
// In production, this would be DynamoDB
declare global {
  var __repoReviewJobs: Map<string, any> | undefined
}

const store = global.__repoReviewJobs || jobStore
if (!global.__repoReviewJobs) {
  global.__repoReviewJobs = store
}

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

  const job = store.get(jobId)

  if (!job) {
    return NextResponse.json(
      { success: false, error: 'Job not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    jobId,
    status: job.status,
    progress: job.progress,
    partialResult: job.partialResult || '',
    result: job.result || '',
    error: job.error || '',
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  })
}