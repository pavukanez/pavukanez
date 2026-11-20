'use client'

import { useState } from 'react'

interface GitHubRepoInputProps {
  onAnalyze: (url: string, focus?: string) => void
  disabled?: boolean
}

export default function GitHubRepoInput({ onAnalyze, disabled }: GitHubRepoInputProps) {
  const [url, setUrl] = useState('')
  const [focus, setFocus] = useState('')
  const [isValid, setIsValid] = useState(false)
  const [preview, setPreview] = useState<{owner: string, name: string} | null>(null)

  const validateUrl = (value: string) => {
    const githubRegex = /^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/
    const match = value.match(githubRegex)
    setIsValid(!!match)
    if (match) {
      setPreview({ owner: match[1], name: match[2].replace('.git', '') })
    } else {
      setPreview(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid && url.trim()) {
      onAnalyze(url.trim(), focus.trim() || undefined)
    }
  }

  const focusOptions = [
    { value: '', label: 'General Review' },
    { value: 'security', label: '🔒 Security (auth, crypto, validation, secrets)' },
    { value: 'performance', label: '⚡ Performance (algorithms, queries, caching)' },
    { value: 'architecture', label: '🏗️ Architecture (patterns, DI, modularity)' },
    { value: 'best-practices', label: '✨ Best Practices (style, patterns, maintainability)' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="github-url" className="block text-sm font-medium text-paper mb-2">
          GitHub Repository URL
        </label>
        <div className="relative">
          <input
            id="github-url"
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              validateUrl(e.target.value)
            }}
            placeholder="https://github.com/owner/repo"
            disabled={disabled}
            className="w-full rounded-xl border border-line bg-ink p-4 text-sm font-mono text-paper placeholder-muted focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass disabled:opacity-50 pr-10"
            aria-label="GitHub repository URL"
          />
          {isValid && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brass-hot">
              ✓
            </span>
          )}
        </div>
        {!isValid && url && (
          <p className="mt-1 text-xs text-red-400">Invalid GitHub URL format</p>
        )}
      </div>

      <div>
        <label htmlFor="review-focus" className="block text-sm font-medium text-paper mb-2">
          Review Focus (Optional)
        </label>
        <select
          id="review-focus"
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          disabled={disabled}
          className="w-full rounded-xl border border-line bg-ink p-3 text-sm text-paper focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass disabled:opacity-50"
        >
          {focusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {preview && (
        <div className="rounded-lg border border-brass/30 bg-brass/10 p-3">
          <p className="text-xs font-medium text-brass-hot">Ready to analyze:</p>
          <p className="text-sm font-mono text-paper">{preview.owner}/{preview.name}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={disabled || !isValid}
        className="w-full rounded-xl bg-brass px-6 py-3 text-sm font-semibold text-ink transition hover:bg-brass-hot disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {disabled ? 'Analyzing...' : 'Analyze Repository'}
      </button>
    </form>
  )
}