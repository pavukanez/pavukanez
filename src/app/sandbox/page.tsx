"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import CodeReviewMessage from "@/components/CodeReviewMessage"
import { useRepoReviewPolling, startRepoReview, RepoReviewJob } from "@/hooks/useRepoReviewPolling"

interface Message {
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  isLoading?: boolean
  requestId?: string
  // Code review specific fields
  isCodeReview?: boolean
  repoUrl?: string
  filePaths?: string[]
  // Error state for retry
  error?: string
  // Future: Polling/SQS support
  jobId?: string
  polling?: boolean
}

const STORAGE_KEY = "sandbox-chat-messages"

export default function LambdaChatPage() {
  // Load messages from localStorage on init
  // Initialize messages from localStorage or default
  const getInitialMessages = () => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          return parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }
      } catch {
        // Ignore parse errors
      }
    }
    return [{ role: "system", content: "Ask me anything", timestamp: new Date() }]
  }

  const [messages, setMessages] = useState<Message[]>(getInitialMessages)
  
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [userMessageCount, setUserMessageCount] = useState(0)
  const [userHasScrolled, setUserHasScrolled] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Reset chat to initial state
  const handleNewChat = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY)
    }
    setMessages(getInitialMessages())
    setUserMessageCount(0)
    setUserHasScrolled(false)
  }, [])
  
  // Polling for large repo reviews
  const { currentJob: pollingJob, startReview: startPollingReview, isPolling } = useRepoReviewPolling()

  // Persist messages to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
      } catch {
        // Ignore quota errors
      }
    }
  }, [messages])

  // Smart scroll: only auto-scroll if user hasn't scrolled up
  const scrollToBottom = useCallback(() => {
    if (!userHasScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [userHasScrolled])

  // Track user scroll position
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50
    setUserHasScrolled(!isAtBottom)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Extract file paths from markdown
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

  // Extract repo URL from review content
  const extractRepoUrl = (content: string): string => {
    const match = content.match(/https?:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/)
    return match?.[0] || ''
  }

  // Detect if query is a repo review request
  const isRepoReviewQuery = (query: string): boolean => {
    const githubUrlMatch = query.match(/https?:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/)
    const reviewKeywords = /review|analyze|audit|check|look at|examine|inspect|assess|evaluate/i
    return !!githubUrlMatch && reviewKeywords.test(query)
  }

  // Extract focus from query
  const extractFocus = (query: string): string => {
    const focusMatch = query.match(/focus(?:ed)?\s+(?:on\s+)?(security|performance|architecture|best.?practices?|style|patterns?|maintainability)/i)
    return focusMatch ? focusMatch[1] : ''
  }

  // Check if repo is large (size > 100MB or files > 500) - matches Lambda limits
  const isLargeRepo = async (url: string): Promise<boolean> => {
    try {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)/)
      if (!match) return false
      
      const [, owner, repo] = match
      const cleanRepo = repo.replace('.git', '')
      
      const res = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
      })
      
      if (!res.ok) return false
      
      const data = await res.json()
      const sizeKB = data.size || 0
      const sizeMB = sizeKB / 1024
      
      // Consider large if > 100MB (matches Lambda MAX_REPO_SIZE_MB)
      // Could also check file count if we had tree data, but size is a good proxy
      return sizeMB > 100
    } catch {
      // If we can't check, default to streaming (safer for smaller repos)
      return false
    }
  }

  // SSE streaming helper
  const streamResponse = async (
    res: Response,
    onChunk: (chunk: string) => void,
    onDone: (requestId?: string) => void,
    onError: (error: string) => void
  ) => {
    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    if (!reader) {
      onError('No response body')
      return
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              onDone()
              return
            }
            try {
              const parsed = JSON.parse(data)
              if (parsed.response) {
                onChunk(parsed.response)
              }
              if (parsed.error) {
                onError(parsed.error)
                return
              }
              if (parsed.requestId) {
                // Store requestId for later use
                onDone(parsed.requestId)
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Streaming error')
    }
  }

  const formatJson = (str: string): string => {
    try { return JSON.stringify(JSON.parse(str), null, 2) } catch { return str }
  }

  // Summarize conversation every 5 user messages
  const summarizeConversation = async (messagesToSummarize: Message[]) => {
    const conversationText = messagesToSummarize
      .filter((m) => m.role !== "system" && !m.isLoading)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n")

    const summaryQuery = `Summarize this conversation in 2-3 sentences. Focus on: topics discussed, key facts revealed, user's interests. Be concise.\n\nConversation:\n${conversationText}`

    try {
      const res = await fetch("/api/lambda/invoke", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload: { query: summaryQuery } }),
      })
      const data = await res.json()
      return data.success ? data.response : "Summary unavailable"
    } catch {
      return "Summary unavailable"
    }
  }

  const checkAndSummarize = async (currentMessages: Message[]) => {
    // Count user messages (excluding system)
    const userCount = currentMessages.filter(m => m.role === "user").length
    
    // Summarize every 5 user messages (after the 5th, 10th, 15th, etc.)
    if (userCount > 0 && userCount % 5 === 0 && userCount !== userMessageCount) {
      setUserMessageCount(userCount)
      
      // Get last 10 messages (5 exchanges) to summarize
      const toSummarize = currentMessages
        .filter((m) => m.role !== "system" && !m.isLoading)
        .slice(-10)
      
      if (toSummarize.length >= 4) { // At least 2 exchanges
        const summary = await summarizeConversation(toSummarize)
        
        // Keep: summary system message + last 4 messages (2 exchanges)
        const recentMessages = currentMessages.slice(-4)
        
        setMessages((prev) => [
          { role: "system", content: `Conversation summary: ${summary}`, timestamp: new Date() },
          ...recentMessages
        ])
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const query = input.trim()
    setInput("")
    await handleQuickQuery(query)
  }

  const handleQuickQuery = async (query: string) => {
    if (isLoading) return
    
    // Build conversation history for context (only user messages to avoid PII issues)
    const history = messages
      .filter((m) => m.role === "user" && !m.isLoading)
      .slice(-5)
      .map((m) => `User: ${m.content}`)
      .join("\n")

    const isRepoReview = isRepoReviewQuery(query)
    
    // Check if this is a large repo that should use polling
    const repoUrl = isRepoReview ? extractRepoUrl(query) : ''
    const isLargeRepoReview = Boolean(isRepoReview && repoUrl && await isLargeRepo(repoUrl))
    
    // For large repos, use polling instead of streaming
    if (isLargeRepoReview && repoUrl) {
      setIsLoading(true)
      const userMessage: Message = { role: "user", content: query, timestamp: new Date() }
      const assistantMessage: Message = { 
        role: "assistant", 
        content: "", 
        timestamp: new Date(), 
        isLoading: true,
        isCodeReview: true,
        repoUrl,
        polling: true,
      }
      
      setMessages((prev) => [...prev, userMessage, assistantMessage])
      
      try {
        const jobId = await startPollingReview(repoUrl, extractFocus(query) || '')
        setMessages((prev) => 
          prev.map((msg) => 
            msg === assistantMessage ? { ...msg, jobId } : msg
          )
        )
      } catch (err) {
        setMessages((prev) => 
          prev.map((msg) => 
            msg === assistantMessage 
              ? { ...msg, content: "Error starting review: " + (err instanceof Error ? err.message : "Unknown"), isLoading: false, error: "Failed to start review" }
              : msg
          )
        )
      } finally {
        setIsLoading(false)
      }
      return
    }
    
    setIsLoading(true)
    const userMessage: Message = { role: "user", content: query, timestamp: new Date() }
    const assistantMessage: Message = { 
      role: "assistant", 
      content: "", 
      timestamp: new Date(), 
      isLoading: true,
      isCodeReview: isRepoReview,
      repoUrl: isRepoReview ? extractRepoUrl(query) : undefined,
      // Future: polling fields
      polling: isLargeRepoReview,
    }
    
    setMessages((prev) => [...prev, userMessage, assistantMessage])
    
    try {
      const headers: Record<string, string> = { 
        "Content-Type": "application/json",
      }
      
      // Use streaming for repo reviews
      if (isRepoReview) {
        headers["Accept"] = "text/event-stream"
      }
      
      // Add timeout for API call (should be less than Lambda timeout)
      const apiTimeout = isRepoReview ? 280000 : 30000 // 4min 40s for repo reviews, 30s for regular
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), apiTimeout)
      
      const res = await fetch("/api/lambda/invoke", {
        method: "POST",
        headers,
        body: JSON.stringify({ payload: { query, history } }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (isRepoReview && res.body) {
        // Streaming response
        let accumulatedContent = ''
        let requestId: string | undefined
        
        await streamResponse(
          res,
          (chunk) => {
            accumulatedContent += chunk
            setMessages((prev) =>
              prev.map((msg) =>
                msg === assistantMessage
                  ? { ...msg, content: accumulatedContent }
                  : msg
              )
            )
          },
          (reqId) => {
            requestId = reqId
            setMessages((prev) =>
              prev.map((msg) =>
                msg === assistantMessage
                  ? { ...msg, content: accumulatedContent, isLoading: false, requestId }
                  : msg
              )
            )
            // Check if we need to summarize after this exchange
            setTimeout(() => {
              setMessages((current) => {
                checkAndSummarize(current)
                return current
              })
            }, 0)
          },
          (error) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg === assistantMessage
                  ? { ...msg, content: "", error: error, isLoading: false }
                  : msg
              )
            )
          }
        )
      } else {
        // Non-streaming response (regular queries)
        const data = await res.json()
        
        setMessages((prev) =>
          prev.map((msg) =>
            msg === assistantMessage
              ? {
                  ...msg,
                  content: data.success ? data.response : "",
                  error: data.success ? undefined : (data.error || "Unknown error"),
                  isLoading: false,
                  requestId: data.requestId,
                }
              : msg
          )
        )
        // Check if we need to summarize after this exchange
        if (data.success) {
          setTimeout(() => {
            setMessages((current) => {
              checkAndSummarize(current)
              return current
            })
          }, 0)
        }
      }
    } catch (err) {
      let errorMessage = "Network Error: " + (err instanceof Error ? err.message : "Unknown")
      
      // Provide more helpful error messages for common issues
      if (err instanceof Error) {
        if (err.name === "AbortError" || err.message.includes("timeout") || err.message.includes("AbortError")) {
          errorMessage = "Request timed out. The repository might be too large or the LLM is taking too long. Try a smaller repo or use the async review option."
        } else if (err.message.includes("Failed to fetch") || err.message.includes("network")) {
          errorMessage = "Network error. Please check your connection and try again."
        } else if (err.message.includes("500") || err.message.includes("Internal server error")) {
          errorMessage = "Server error. The Lambda function may have timed out. Try again or use a smaller repository."
        }
      }
      
      setMessages((prev) =>
        prev.map((msg) =>
          msg === assistantMessage
            ? { ...msg, content: "", error: errorMessage, isLoading: false }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const handleRepoAnalyze = (url: string, focus?: string) => {
    const focusText = focus ? ` Focus: ${focus}.` : ''
    const reviewQuery = `Please review this GitHub repository: ${url}.${focusText} Use the iterative review pattern: fetch tree, select files, fetch files, review, iterate.`
    
    // Add user message to chat
    const userMessage: Message = {
      role: "user",
      content: reviewQuery,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    
    // Trigger the Lambda call (similar to handleQuickQuery)
    handleQuickQuery(reviewQuery)
  }

  const handleRequestMoreFiles = (filePaths: string[]) => {
    const followup = `Please also review these files: ${filePaths.join(', ')}`
    
    // Add follow-up as user message
    const userMessage: Message = {
      role: "user",
      content: followup,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    
    // Trigger Lambda call for the follow-up
    handleQuickQuery(followup)
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 text-sm">
          <a href="/" className="font-display text-lg tracking-tight text-paper">
            Daniel Pham
          </a>
          <div className="flex gap-6 text-muted items-center">
            <a href="/#experience" className="transition hover:text-brass-hot">
              Experience
            </a>
            <a href="/#skills" className="transition hover:text-brass-hot">
              Skills
            </a>
            <a href="/sandbox" className="transition hover:text-brass-hot">
              Sandbox
            </a>
          </div>
        </nav>
      </header>

      <main className="flex-1 mx-auto max-w-6xl w-full px-5 py-8">
        <div className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-brass">
              AI Sandbox
            </p>
            <h2 className="mt-3 font-display text-3xl text-paper md:text-4xl">
              gh-repo-reviewer
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-muted md:text-right">
            Ask me anything or paste a GitHub repo URL to get an iterative code review covering security, best practices, performance, and architecture. 
            Supports Python, TypeScript, Java, and Go. Public repos only.
          </p>
        </div>

        {/* Chat Interface */}
        <div className="rounded-2xl border border-line bg-ink-soft/70 p-4 backdrop-blur-sm flex flex-col h-[60vh] min-h-[400px] relative z-60">
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto space-y-4 pb-4"
            onScroll={handleScroll}
            role="log"
            aria-live="polite"
            aria-label="Chat messages"
          >
            {/* Polling job progress display */}
            {(pollingJob && (pollingJob.status === 'pending' || pollingJob.status === 'running')) && (
              <div
                key="polling-job"
                className="flex gap-3"
              >
                <div className="flex-1 max-w-[85%]">
                  <div className="bg-ink text-paper border border-line rounded-2xl px-4 py-3 text-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">Repository Review (Async)</span>
                        <span className="text-xs text-muted font-mono truncate max-w-xs">
                          {pollingJob.jobId.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-brass-hot">
                        {pollingJob.status === 'pending' ? '⏳' : '🔄'} {pollingJob.progress}
                      </span>
                    </div>
                    {pollingJob.partialResult && (
                      <div className="prose prose-invert max-w-none text-sm">
                        <ReactMarkdown>{pollingJob.partialResult}</ReactMarkdown>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-4 h-4 border-2 border-brass border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-muted">Processing in background... refresh safe</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {messages.map((message, index) => {
              if (message.role === "system" && message.content.startsWith("Conversation summary:")) {
                return (
                  <div key={index} className="text-xs text-muted italic border-t border-line pt-2">
                    {message.content}
                  </div>
                )
              }
              if (message.role === "system" && message.content === "Ask me anything") {
                return null
              }

              // Detect code review messages
              const isCodeReview = message.role === "assistant" && 
                message.content.includes("## Code Review:") && 
                !message.isLoading

              if (isCodeReview) {
                const repoUrl = message.repoUrl || extractRepoUrl(message.content)
                const filePaths = message.filePaths || extractFilePaths(message.content)
                
                return (
                  <div
                    key={index}
                    className="flex gap-3"
                  >
                    <div className="flex-1 max-w-[85%]">
                      <CodeReviewMessage
                        content={message.content}
                        repoUrl={repoUrl}
                        filePaths={filePaths}
                        onRequestMoreFiles={handleRequestMoreFiles}
                        timestamp={message.timestamp}
                        isLoading={message.isLoading}
                      />
                      {message.requestId && (
                        <p className="mt-1 text-xs text-muted text-right">
                          RequestId: {message.requestId}
                        </p>
                      )}
                    </div>
                  </div>
                )
              }

              // Retry handler for failed messages
              const handleRetry = (msg: Message) => {
                if (msg.role === "assistant" && msg.error) {
                  // Re-send the user message that triggered this
                  const userMsgIndex = messages.findIndex(m => m === msg) - 1
                  if (userMsgIndex >= 0) {
                    const userMsg = messages[userMsgIndex]
                    if (userMsg?.role === "user") {
                      handleQuickQuery(userMsg.content)
                    }
                  }
                }
              }

              // Regular message rendering
              return (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex-1 max-w-[85%] ${message.role === "user" ? "text-right" : ""}`}
                  >
                    <div
                      className={`inline-block rounded-2xl px-4 py-2 text-sm ${
                        message.role === "user"
                          ? "bg-brass text-ink selection:bg-brass-hot selection:text-ink"
                          : message.error
                          ? "bg-red-900/30 text-red-200 border border-red-500/50 selection:bg-red-700 selection:text-red-100"
                          : "bg-ink text-paper border border-line selection:bg-brass-hot selection:text-ink"
                      }`}
                    >
                      {message.isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-brass border-t-transparent rounded-full animate-spin" />
                          <span>Thinking...</span>
                        </div>
                      ) : message.error ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-red-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>Error: {message.error}</span>
                          </div>
                          <button
                            onClick={() => handleRetry(message)}
                            className="text-xs text-brass-hot hover:underline self-start"
                          >
                            Retry
                          </button>
                        </div>
                      ) : (
                        <div className="select-text">
                          {message.role === "assistant" ? (
                            <ReactMarkdown
                              components={{
                                code: ({ children, ...props }) => (
                                  <code {...props} className="bg-ink/50 px-1.5 py-0.5 rounded text-xs font-mono text-brass-hot selection:bg-brass-hot selection:text-ink">
                                    {children}
                                  </code>
                                ),
                                pre: ({ children, ...props }) => (
                                  <pre {...props} className="bg-ink rounded-xl p-4 overflow-x-auto border border-line text-xs selection:bg-brass-hot selection:text-ink">
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
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            <pre className="whitespace-pre-wrap break-words font-mono text-xs selection:bg-brass-hot selection:text-ink">{message.content}</pre>
                          )}
                        </div>
                      )}
                    </div>
                    {message.requestId && !message.error && (
                      <p className="mt-1 text-xs text-muted">
                        RequestId: {message.requestId}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
            {messages.length > 1 && !isLoading && (
              <p className="mt-2 text-center text-xs text-muted/60">
                <button
                  onClick={handleNewChat}
                  className="hover:text-brass-hot transition underline underline-offset-1"
                  title="Start a new conversation"
                >
                  All set here? Start a new topic.
                </button>
              </p>
            )}
          </div>

          {/* Quick Query Buttons */}
          <div className="border-t border-line p-4 bg-ink/50">
            <div className="flex gap-2 mb-3 overflow-x-auto scroll-snap-x snap-mandatory pb-2 -mx-4 px-4 scrollbar-hide">
              <button
                type="button"
                onClick={() => handleQuickQuery("who is Daniel Pham?")}
                disabled={isLoading}
                className="rounded-lg border border-line bg-ink px-3 py-1.5 text-xs text-muted transition hover:border-brass hover:text-brass-hot disabled:opacity-30 whitespace-nowrap snap-start flex-shrink-0"
              >
                who is Daniel Pham?
              </button>
              <button
                type="button"
                onClick={() => handleQuickQuery("what is a pod in k8s?")}
                disabled={isLoading}
                className="rounded-lg border border-line bg-ink px-3 py-1.5 text-xs text-muted transition hover:border-brass hover:text-brass-hot disabled:opacity-30 whitespace-nowrap snap-start flex-shrink-0"
              >
                what is a pod in k8s?
              </button>
              <button
                type="button"
                onClick={() => handleQuickQuery("suggest Vietnamese cooking recipe")}
                disabled={isLoading}
                className="rounded-lg border border-line bg-ink px-3 py-1.5 text-xs text-muted transition hover:border-brass hover:text-brass-hot disabled:opacity-30 whitespace-nowrap snap-start flex-shrink-0"
              >
                suggest Vietnamese cooking recipe
              </button>
              <button
                type="button"
                onClick={() => handleQuickQuery("help me review my github repo")}
                disabled={isLoading}
                className="rounded-lg border border-line bg-ink px-3 py-1.5 text-xs text-muted transition hover:border-brass hover:text-brass-hot disabled:opacity-30 whitespace-nowrap snap-start flex-shrink-0"
              >
                help me review my github repo
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your query... (Shift+Enter for new line)"
                disabled={isLoading}
                className="flex-1 min-h-[60px] max-h-40 rounded-xl border border-line bg-ink p-3 text-sm font-mono text-paper placeholder-muted focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass resize-y disabled:opacity-50"
                aria-label="Lambda query input"
              />
              <div className="flex flex-col gap-2 items-end">
                <button type="submit" disabled={isLoading || !input.trim()} className="rounded-xl bg-brass px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-brass-hot disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                  Send
                </button>
              </div>
            </form>
            <p className="mt-2 text-xs text-muted text-center">Press Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </main>

      <footer className="border-t border-line px-5 py-10 text-center text-sm text-muted">
        © {new Date().getFullYear()} Daniel Pham • Software Engineer • Built to last.
      </footer>
    </div>
  )
}
