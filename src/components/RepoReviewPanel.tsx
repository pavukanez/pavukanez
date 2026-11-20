'use client'

import ReactMarkdown from 'react-markdown'
import { useState } from 'react'

interface RepoReviewPanelProps {
  repoUrl: string
  reviewMarkdown: string
  isLoading: boolean
  onClose: () => void
  onRequestMoreFiles: (filePaths: string[]) => void
}

export default function RepoReviewPanel({ 
  repoUrl, 
  reviewMarkdown, 
  isLoading, 
  onClose,
  onRequestMoreFiles 
}: RepoReviewPanelProps) {
  const [showFiles, setShowFiles] = useState(false)

  // Extract file paths from markdown for quick actions
  const extractFilePaths = (md: string): string[] => {
    const matches = md.match(/`([^`]+\.(?:py|ts|tsx|java|go))`/g)
    if (!matches) return []
    const seen: Record<string, boolean> = {}
    return matches
      .map(m => m.slice(1, -1))
      .filter(path => {
        if (seen[path]) return false
        seen[path] = true
        return true
      })
  }

  const filePaths = extractFilePaths(reviewMarkdown)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line p-4">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-ink transition">
            <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div>
            <p className="text-xs text-muted">Repository Review</p>
            <p className="font-mono text-sm text-paper truncate max-w-xs">
              {repoUrl.replace('https://github.com/', '')}
            </p>
          </div>
        </div>
        {filePaths.length > 0 && (
          <button
            onClick={() => setShowFiles(!showFiles)}
            className="text-xs text-brass-hot hover:underline"
          >
            {showFiles ? 'Hide' : 'Show'} {filePaths.length} file{filePaths.length !== 1 ? 's' : ''} referenced
          </button>
        )}
      </div>

      {/* File List Sidebar */}
      {showFiles && filePaths.length > 0 && (
        <div className="border-b border-line p-3 bg-ink/50 max-h-48 overflow-y-auto">
          <p className="text-xs font-medium text-muted mb-2">Referenced Files:</p>
          <ul className="space-y-1">
            {filePaths.map((path, i) => (
              <li key={i}>
                <a
                  href={`${repoUrl}/blob/main/${path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-brass-hot hover:underline truncate block"
                >
                  {path}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Review Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4 text-muted">
              <div className="w-8 h-8 border-2 border-brass border-t-transparent rounded-full animate-spin" />
              <p>Analyzing repository...</p>
              <p className="text-xs">This may take a moment for large codebases</p>
            </div>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown
              components={{
                code: ({ children, ...props }) => (
                  <code {...props} className="bg-ink/50 px-1.5 py-0.5 rounded text-xs font-mono text-brass-hot">
                    {children}
                  </code>
                ),
                pre: ({ children, ...props }) => (
                  <pre {...props} className="bg-ink rounded-xl p-4 overflow-x-auto border border-line">
                    {children}
                  </pre>
                ),
                a: ({ href, children, ...props }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-brass-hot underline hover:text-brass" {...props}>
                    {children}
                  </a>
                ),
              }}
            >
              {reviewMarkdown}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-line p-4 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 rounded-xl border border-line bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:border-brass hover:text-brass-hot"
        >
          Close
        </button>
        <button
          onClick={() => {
            const paths = extractFilePaths(reviewMarkdown)
            if (paths.length > 0) {
              onRequestMoreFiles(paths)
            }
          }}
          className="flex-1 rounded-xl bg-brass px-4 py-2 text-sm font-semibold text-ink transition hover:bg-brass-hot"
        >
          Review More Files
        </button>
      </div>
    </div>
  )
}