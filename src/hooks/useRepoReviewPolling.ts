/**
 * Polling hook for async repo reviews (SQS + Worker Lambda)
 * 
 * This is a STUB implementation for future-proofing.
 * When backend polling infrastructure is ready, replace with real implementation.
 * 
 * Expected backend endpoints:
 * - POST /api/repo-reviews → { jobId }
 * - GET /api/repo-reviews/{jobId} → { status, progress, partialResult, result, error }
 */

import { useState, useEffect, useCallback } from 'react'

export interface RepoReviewJob {
  jobId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: string
  partialResult?: string
  result?: string
  error?: string
}

// STUB: Simulates starting a repo review job
export async function startRepoReview(
  url: string, 
  focus?: string
): Promise<string> {
  // TODO: Replace with real API call when backend is ready
  // const res = await fetch('/api/repo-reviews', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ url, focus })
  // })
  // const { jobId } = await res.json()
  // return jobId
  
  console.log('[STUB] startRepoReview called with:', { url, focus })
  // Return a fake job ID for now
  return `stub-job-${Date.now()}`
}

// STUB: Polls for job progress
export function useRepoReviewJob(jobId: string | null): RepoReviewJob | null {
  const [job, setJob] = useState<RepoReviewJob | null>(null)
  
  useEffect(() => {
    if (!jobId) {
      setJob(null)
      return
    }
    
    // Initialize with pending state
    setJob({
      jobId,
      status: 'pending',
      progress: 'Queued...',
      partialResult: ''
    })
    
    // STUB: Simulate polling
    // TODO: Replace with real polling when backend is ready
    const interval = setInterval(async () => {
      // const res = await fetch(`/api/repo-reviews/${jobId}`)
      // const data = await res.json()
      // setJob(data)
      
      // Stub simulation for testing
      setJob(prev => {
        if (!prev || prev.status === 'completed' || prev.status === 'failed') {
          return prev
        }
        
        // Simulate progress
        const steps = [
          { status: 'running' as const, progress: 'Fetching file tree...', partialResult: '' },
          { status: 'running' as const, progress: 'LLM selecting files...', partialResult: '## Code Review: ...' },
          { status: 'running' as const, progress: 'Reading 25 files...', partialResult: '## Code Review:\n### Security\n- Found issues...' },
          { status: 'completed' as const, progress: 'Done', partialResult: '## Code Review:\n### Security\n- Found issues...\n### Performance\n- Optimizations...' }
        ]
        
        const currentStep = steps.findIndex(s => s.progress === prev.progress)
        if (currentStep >= 0 && currentStep < steps.length - 1) {
          return { ...prev, ...steps[currentStep + 1] }
        }
        return prev
      })
    }, 3000)
    
    return () => clearInterval(interval)
  }, [jobId])
  
  return job
}

// STUB: Combined hook for easy use
export function useRepoReviewPolling() {
  const [currentJob, setCurrentJob] = useState<RepoReviewJob | null>(null)
  
  const startReview = useCallback(async (url: string, focus?: string) => {
    const jobId = await startRepoReview(url, focus)
    setCurrentJob({
      jobId,
      status: 'pending',
      progress: 'Queued...',
      partialResult: ''
    })
    return jobId
  }, [])
  
  return {
    currentJob,
    startReview,
    isPolling: currentJob?.status === 'pending' || currentJob?.status === 'running'
  }
}