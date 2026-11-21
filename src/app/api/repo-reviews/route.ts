import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

// In production, use AWS SDK to send to SQS
// For now, we'll simulate with a simple in-memory store (replace with SQS + DynamoDB)
const REPO_REVIEW_QUEUE_URL = process.env.REPO_REVIEW_QUEUE_URL
const AWS_REGION = process.env.AWS_REGION || 'us-east-2'

// Job status stored in DynamoDB in production
// For now, using a simple Map (will be replaced)
const jobStore = new Map<string, {
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: string
  partialResult?: string
  result?: string
  error?: string
  createdAt: number
  updatedAt: number
}>()

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
    const now = Date.now()

    // Create initial job record
    const job = {
      status: 'pending' as const,
      progress: 'Queued for processing...',
      partialResult: '',
      createdAt: now,
      updatedAt: now,
    }
    jobStore.set(jobId, job)

    // In production: send to SQS
    // await sqs.sendMessage({
    //   QueueUrl: REPO_REVIEW_QUEUE_URL,
    //   MessageBody: JSON.stringify({ jobId, url, focus })
    // })

    // For demo: simulate async processing
    simulateJobProcessing(jobId, url, focus || '')

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

// Simulate async job processing (replace with actual SQS worker)
async function simulateJobProcessing(jobId: string, url: string, focus: string) {
  const job = jobStore.get(jobId)
  if (!job) return

  const steps = [
    { progress: 'Fetching repository file tree...', duration: 3000 },
    { progress: 'Analyzing codebase structure...', duration: 2000 },
    { progress: 'Selecting relevant files for review...', duration: 2000 },
    { progress: 'Fetching file contents...', duration: 5000 },
    { progress: 'Generating security review...', duration: 3000 },
    { progress: 'Generating performance review...', duration: 3000 },
    { progress: 'Generating architecture review...', duration: 3000 },
    { progress: 'Finalizing review...', duration: 2000 },
  ]

  let accumulatedResult = `## Code Review: ${url.replace('https://github.com/', '')}\n\n`

  job.status = 'running'
  jobStore.set(jobId, { ...job, updatedAt: Date.now() })

  for (let i = 0; i < steps.length; i++) {
    await new Promise(resolve => setTimeout(resolve, steps[i].duration))

    const currentJob = jobStore.get(jobId)
    if (!currentJob) return

    // Simulate incremental result generation
    if (i >= 3) {
      const sectionNames = ['Security', 'Performance', 'Architecture', 'Best Practices']
      const section = sectionNames[i - 3] || 'Review'
      accumulatedResult += `\n### ${section} Findings\n- Issue 1 in \`src/example.ts\`\n- Issue 2 in \`src/utils.ts\`\n`
      currentJob.partialResult = accumulatedResult
    }

    currentJob.progress = steps[i].progress
    currentJob.updatedAt = Date.now()
    jobStore.set(jobId, currentJob)
  }

  // Complete
  const finalJob = jobStore.get(jobId)
  if (finalJob) {
    finalJob.status = 'completed'
    finalJob.progress = 'Done'
    finalJob.result = accumulatedResult
    finalJob.partialResult = accumulatedResult
    finalJob.updatedAt = Date.now()
    jobStore.set(jobId, finalJob)
  }
}