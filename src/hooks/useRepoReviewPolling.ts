/**
 * Polling hook for async repo reviews (SQS + Worker Lambda)
 * 
 * Real implementation using API endpoints:
 * - POST /api/repo-reviews → { jobId }
 * - GET /api/repo-reviews/{jobId} → { status, progress, partialResult, result }
 */

import { useState, useEffect, useCallback } from 'react'

export interface RepoReviewJob {
  jobId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: string
  partialResult?: string
  result?: string
  error?: string
  createdAt: number
  updatedAt: number
}

// Start a repo review job
export async function startRepoReview(
  url: string, 
  focus?: string
): Promise<string> {
  const res = await fetch('/api/repo-reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, focus })
  })
  
  const data = await res.json()
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to start repo review')
  }
  
  return data.jobId
}

// Poll for job progress
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
      partialResult: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    
    const poll = async () => {
      try {
        const res = await fetch(`/api/repo-reviews/${jobId}`)
        const data = await res.json()
        
        if (data.success) {
          setJob({
            jobId: data.jobId,
            status: data.status,
            progress: data.progress,
            partialResult: data.partialResult,
            result: data.result,
            error: data.error,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          })
          
          // Continue polling if not done
          if (data.status === 'pending' || data.status === 'running') {
            setTimeout(poll, 2000)
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
        setTimeout(poll, 5000) // Retry on error
      }
    }
    
    poll()
  }, [jobId])
  
  return job
}

// Combined hook for easy use
export function useRepoReviewPolling() {
  const [currentJob, setCurrentJob] = useState<RepoReviewJob | null>(null)
  
  const startReview = useCallback(async (url: string, focus?: string) => {
    const jobId = await startRepoReview(url, focus)
    setCurrentJob({
      jobId,
      status: 'pending',
      progress: 'Queued...',
      partialResult: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    return jobId
  }, [])
  
  // Auto-poll when we have a job
  useEffect(() => {
    if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') {
      return
    }
    
    const poll = async () => {
      try {
        const res = await fetch(`/api/repo-reviews/${currentJob.jobId}`)
        const data = await res.json()
        
        if (data.success) {
          setCurrentJob(prev => prev ? {
            ...prev,
            status: data.status,
            progress: data.progress,
            partialResult: data.partialResult,
            result: data.result,
            error: data.error,
            updatedAt: data.updatedAt,
          } : null)
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }
    
    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [currentJob?.jobId, currentJob?.status])
  
  return {
    currentJob,
    startReview,
    isPolling: currentJob?.status === 'pending' || currentJob?.status === 'running'
  }
}