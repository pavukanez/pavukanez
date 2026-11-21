/**
 * Polling hook for async repo reviews (SQS + Worker Lambda)
 * 
 * Flow:
 * - POST /api/lambda/invoke with repo review query → Lambda enqueues to SQS, returns { jobId }
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

// Start a repo review job via Lambda (which enqueues to SQS)
export async function startRepoReview(
  url: string, 
  focus?: string
): Promise<string> {
  // Build a query that the Lambda will recognize as a repo review
  const focusText = focus ? ` Focus: ${focus}.` : ''
  const query = `Please review this GitHub repository: ${url}.${focusText} Use the iterative review pattern: fetch tree, select files, fetch files, review, iterate.`
  
  const res = await fetch('/api/lambda/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      payload: { 
        query, 
        history: '',
        // Signal to Lambda this is an async repo review request
        asyncRepoReview: true 
      } 
    })
  })
  
  const data = await res.json()
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to start repo review')
  }
  
  // Lambda returns { success: true, jobId, status: 'pending', ... }
  if (data.jobId) {
    return data.jobId
  }
  
  // Fallback: if Lambda returns requestId instead, use that
  if (data.requestId) {
    return data.requestId
  }
  
  throw new Error('No jobId returned from Lambda')
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