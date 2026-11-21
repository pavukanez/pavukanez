'use client'

import ReactMarkdown from 'react-markdown'
import { useState } from 'react'

interface CodeReviewMessageProps {
  content: string
  repoUrl: string
  filePaths: string[]
  onRequestMoreFiles: (filePaths: string[]) => void
  timestamp: Date
  isLoading?: boolean
}

export default function CodeReviewMessage({
  content,
  repoUrl,
  filePaths,
  onRequestMoreFiles,
  timestamp,
  isLoading = false,
}: CodeReviewMessageProps) {
  const [showFiles, setShowFiles] = useState(false)

  // Format timestamp
  const formattedTime = timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (isLoading) {
    return (
      <div className="bg-ink text-paper border border-line rounded-2xl px-4 py-2 text-sm max-w-[85%]">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-brass border-t-transparent rounded-full animate-spin" />
          <span className="text-muted">Analyzing repository...</span>
        </div>
        <p className="text-xs text-muted mt-1">This may take a moment for large codebases</p>
        <p className="text-xs text-muted text-right mt-2">{formattedTime}</p>
      </div>
    )
  }

  return (
    <div className="bg-ink text-paper border border-line rounded-2xl px-4 py-2 text-sm max-w-[85%]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Repository Review</span>
          <span className="text-xs text-muted font-mono truncate max-w-xs">
            {repoUrl.replace('https://github.com/', '')}
          </span>
        </div>
        {filePaths.length > 0 && (
          <button
            onClick={() => setShowFiles(!showFiles)}
            className="text-xs text-brass-hot hover:underline flex items-center gap-1"
          >
            {showFiles ? '🔼' : '🔽'} {filePaths.length} file{filePaths.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* File List (Collapsible) */}
      {showFiles && filePaths.length > 0 && (
        <div className="border-t border-line pt-3 mb-3 max-h-48 overflow-y-auto">
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
      <div className="prose prose-invert max-w-none text-sm">
        <ReactMarkdown
          components={{
            code: ({ children, ...props }) => (
              <code {...props} className="bg-ink/50 px-1.5 py-0.5 rounded text-xs font-mono text-brass-hot">
                {children}
              </code>
            ),
            pre: ({ children, ...props }) => (
              <pre {...props} className="bg-ink rounded-xl p-3 overflow-x-auto border border-line text-xs">
                {children}
              </pre>
            ),
            a: ({ href, children, ...props }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brass-hot underline hover:text-brass"
                {...props}
              >
                {children}
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Actions */}
      {filePaths.length > 0 && (
        <div className="border-t border-line pt-3 mt-3 flex gap-2">
          <button
            onClick={() => onRequestMoreFiles(filePaths)}
            className="flex-1 rounded-xl bg-brass px-4 py-1.5 text-xs font-semibold text-ink transition hover:bg-brass-hot"
          >
            Review More Files
          </button>
        </div>
      )}

      <p className="text-xs text-muted text-right mt-2">{formattedTime}</p>
    </div>
  )
}