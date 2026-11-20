"use client"

import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import GitHubRepoInput from "@/components/GitHubRepoInput"
import RepoReviewPanel from "@/components/RepoReviewPanel"

interface Message {
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  isLoading?: boolean
  requestId?: string
}

export default function LambdaChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", content: "Ask me anything", timestamp: new Date() }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [userMessageCount, setUserMessageCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // GitHub repo review state
  const [repoReview, setRepoReview] = useState<{
    url: string
    markdown: string
    isLoading: boolean
  } | null>(null)
  const [pendingRepoAnalysis, setPendingRepoAnalysis] = useState<{
    url: string
    focus: string
  } | null>(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })

  useEffect(() => { scrollToBottom() }, [messages])

  // Handle pending repo analysis
  useEffect(() => {
    if (pendingRepoAnalysis) {
      setRepoReview({ url: pendingRepoAnalysis.url, markdown: '', isLoading: true })
      const focusText = pendingRepoAnalysis.focus ? ` Focus: ${pendingRepoAnalysis.focus}.` : ''
      const reviewQuery = `Please review this GitHub repository: ${pendingRepoAnalysis.url}.${focusText} Use the iterative review pattern: fetch tree, select files, fetch files, review, iterate.`
      
      const userMessage: Message = { 
        role: "user", 
        content: reviewQuery, 
        timestamp: new Date() 
      }
      setMessages(prev => [...prev, userMessage])
      setPendingRepoAnalysis(null)
    }
  }, [pendingRepoAnalysis])

  // Check for completed review in assistant messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === "assistant" && !lastMessage.isLoading) {
      if (lastMessage.content.includes("## Code Review:") && repoReview) {
        setRepoReview(prev => prev ? { ...prev, markdown: lastMessage.content, isLoading: false } : null)
      }
    }
  }, [messages, repoReview])

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
    
    // Check if input is a GitHub URL
    const githubMatch = query.match(/^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/)
    if (githubMatch) {
      // Trigger repo analysis with default focus
      setPendingRepoAnalysis({ url: query, focus: '' })
      setInput("")
      return
    }

    // Build conversation history for context (only user messages to avoid PII issues)
    const history = messages
      .filter((m) => m.role === "user" && !m.isLoading)
      .slice(-5)  // Last 5 user messages
      .map((m) => `User: ${m.content}`)
      .join("\n")

    const payload = { query, history }

    const userMessage: Message = { role: "user", content: query, timestamp: new Date() }
    const assistantMessage: Message = { role: "assistant", content: "", timestamp: new Date(), isLoading: true }

    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setIsLoading(true)
    setInput("")

    try {
      const res = await fetch("/api/lambda/invoke", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload }),
      })

      const data = await res.json()

      setMessages((prev) =>
        prev.map((m) =>
          m === assistantMessage
            ? { ...m, content: data.success ? data.response : data.error, isLoading: false, requestId: data.requestId }
            : m
        )
      )

      if (data.success) {
        // Use setTimeout to ensure state update is processed
        setTimeout(() => {
          setMessages((current) => {
            checkAndSummarize(current)
            return current
          })
        }, 0)
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m === assistantMessage
            ? { ...m, content: "Network Error: " + (err instanceof Error ? err.message : "Unknown"), isLoading: false }
            : m
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickQuery = async (query: string) => {
    if (isLoading) return
    
    // Build conversation history for context (only user messages to avoid PII issues)
    const history = messages
      .filter((m) => m.role === "user" && !m.isLoading)
      .slice(-5)
      .map((m) => `User: ${m.content}`)
      .join("\n")

    setIsLoading(true)
    const userMessage: Message = { role: "user", content: query, timestamp: new Date() }
    const assistantMessage: Message = { role: "assistant", content: "", timestamp: new Date(), isLoading: true }
    
    setMessages((prev) => [...prev, userMessage, assistantMessage])
    
    try {
      const res = await fetch("/api/lambda/invoke", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload: { query, history } }),
      })
      const data = await res.json()
      
      setMessages((prev) =>
        prev.map((msg) =>
          msg === assistantMessage
            ? {
                ...msg,
                content: data.success
                  ? data.response
                  : "Error" + (data.requestId ? " (RequestId: " + data.requestId + ")" : "") + "\n" + formatJson(JSON.stringify(data.error)),
                isLoading: false,
                requestId: data.requestId,
              }
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
    } catch (err) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg === assistantMessage
            ? { ...msg, content: "Network Error: " + (err instanceof Error ? err.message : "Unknown"), isLoading: false }
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
    setPendingRepoAnalysis({ url, focus: focus || '' })
  }

  const handleRequestMoreFiles = (filePaths: string[]) => {
    const followup = `Please also review these files: ${filePaths.join(', ')}`
    setMessages(prev => [...prev, { role: "user", content: followup, timestamp: new Date() }])
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 text-sm">
          <a href="/" className="font-display text-lg tracking-tight text-paper">
            Daniel Pham
          </a>
          <div className="flex gap-6 text-muted">
            <a href="#experience" className="transition hover:text-brass-hot">
              Experience
            </a>
            <a href="#skills" className="transition hover:text-brass-hot">
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
            Paste a GitHub repository URL to get an iterative code review. 
            Supports Python, TypeScript, Java, and Go. Public repos only.
          </p>
        </div>

        {/* GitHub Repo Input */}
        {!repoReview && (
          <div className="mb-8 rounded-2xl border border-line bg-ink-soft/70 p-6 backdrop-blur-sm max-w-2xl">
            <h3 className="text-lg font-medium text-paper mb-4">Analyze a Repository</h3>
            <GitHubRepoInput 
              onAnalyze={handleRepoAnalyze} 
              disabled={isLoading}
            />
          </div>
        )}

        {/* Chat Interface */}
        <div className="rounded-2xl border border-line bg-ink-soft/70 p-4 backdrop-blur-sm flex flex-col h-[60vh] min-h-[400px]">
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
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
                          ? "bg-brass text-ink"
                          : "bg-ink text-paper border border-line"
                      }`}
                    >
                      {message.isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-brass border-t-transparent rounded-full animate-spin" />
                          <span>Thinking...</span>
                        </div>
                      ) : (
                        <>
                          {message.role === "assistant" ? (
                            <ReactMarkdown
                              components={{
                                code: ({ children, ...props }) => (
                                  <code {...props} className="bg-ink/50 px-1.5 py-0.5 rounded text-xs font-mono text-brass-hot">
                                    {children}
                                  </code>
                                ),
                                pre: ({ children, ...props }) => (
                                  <pre {...props} className="bg-ink rounded-xl p-4 overflow-x-auto border border-line text-xs">
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
                            <pre className="whitespace-pre-wrap break-words font-mono text-xs">{message.content}</pre>
                          )}
                        </>
                      )}
                    </div>
                    {message.requestId && (
                      <p className="mt-1 text-xs text-muted">
                        RequestId: {message.requestId}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
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

      {/* Repo Review Panel */}
      {repoReview && (
        <RepoReviewPanel
          repoUrl={repoReview.url}
          reviewMarkdown={repoReview.markdown}
          isLoading={repoReview.isLoading}
          onClose={() => setRepoReview(null)}
          onRequestMoreFiles={handleRequestMoreFiles}
        />
      )}
    </div>
  )
}
