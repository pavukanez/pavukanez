"use client"

import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"

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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })

  useEffect(() => { scrollToBottom() }, [messages])

  const formatJson = (str: string): string => {
    try { return JSON.stringify(JSON.parse(str), null, 2) } catch { return str }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const query = input.trim()
    
    // Build conversation history for context (last 6 messages = 3 exchanges)
    const history = messages
      .filter((m) => m.role !== "system" && !m.isLoading)
      .slice(-6)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
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
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SANDBOX_API_KEY || ''}`
        },
        body: JSON.stringify({ payload }),
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

  const handleQuickQuery = async (query: string) => {
    if (isLoading) return
    
    // Build conversation history for context
    const history = messages
      .filter((m) => m.role !== "system" && !m.isLoading)
      .slice(-6)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
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
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SANDBOX_API_KEY || ''}`
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

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="grain" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_top,_rgba(201,162,39,0.12),_transparent_55%)]" />

      <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 text-sm">
          <a href="/" className="font-display text-lg tracking-tight text-paper">Daniel Pham</a>
          <div className="flex gap-6 text-muted">
            <a href="/#experience" className="transition hover:text-brass-hot">Experience</a>
            <a href="/#skills" className="transition hover:text-brass-hot">Skills</a>
            <a href="/" className="transition hover:text-brass-hot">Portfolio</a>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-16 pb-32">
        <div className="mb-10 text-center">
          <h1 className="mt-3 font-display text-3xl text-brass md:text-4xl">Daniel's Agent</h1>
          <p className="mt-2 max-w-md mx-auto text-sm leading-relaxed text-muted">Built with AWS & OpenRouter</p>
        </div>

        <div className="rounded-2xl border border-line bg-ink-soft/70 backdrop-blur-sm flex flex-col h-[calc(100vh-24rem)] min-h-[500px] overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6" role="log" aria-live="polite">
            {messages.map((msg, idx) => (
              <div key={idx} className={"flex gap-3 " + (msg.role === "user" ? "flex-row-reverse" : "")}>
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium" style={{
                  backgroundColor: msg.role === "user" ? "#c9a227" : msg.role === "system" ? "#2c3528" : "rgba(201,162,39,0.2)",
                  color: msg.role === "user" ? "#10140f" : msg.role === "system" ? "#b7b09f" : "#e4c15a",
                }}>
                  {msg.role === "user" ? "You" : msg.role === "system" ? "..." : "⚙️"}
                </div>
                <div className={"max-w-[80%] " + (msg.role === "user" ? "text-right" : "")}>
                  {msg.role !== "system" && (
                    <div className="text-xs text-muted mb-1">
                      {msg.timestamp.toLocaleTimeString()}
                      {msg.requestId && <> · <code className="text-[10px] bg-ink px-1 rounded">{msg.requestId.slice(0, 8)}...</code> </>}
                    </div>
                  )}
                  <div className="inline-block px-4 py-3 rounded-2xl text-sm" style={{
                    backgroundColor: msg.role === "user" ? "rgba(201,162,39,0.1)" : msg.role === "system" ? "rgba(26,33,24,0.5)" : "#10140f",
                    borderColor: msg.role === "user" ? "rgba(201,162,39,0.2)" : msg.role === "system" ? "rgba(44,53,40,0.5)" : "rgba(44,53,40,0.5)",
                    borderRadius: msg.role === "user" ? "1rem 1rem 1rem 0" : msg.role === "system" ? "1rem" : "1rem 0 1rem 1rem",
                  }}>
                    {msg.isLoading ? (
                      <div className="flex items-center gap-2 text-muted">
                        <div className="w-4 h-4 border-2 border-brass/50 border-t-brass rounded-full animate-spin" />
                        <span>Generating...</span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words text-inherit font-inherit">
                        {msg.role === "assistant" ? (
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        ) : (
                          <pre>{msg.content}</pre>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Query Buttons */}
          <div className="border-t border-line p-4 bg-ink/50">
            <div className="flex flex-wrap gap-2 justify-center mb-3">
              <button
                type="button"
                onClick={() => handleQuickQuery("Who are you?")}
                disabled={isLoading}
                className="rounded-lg border border-line bg-ink px-3 py-1.5 text-xs text-muted transition hover:border-brass hover:text-brass-hot disabled:opacity-30"
              >
                Who are you?
              </button>
              <button
                type="button"
                onClick={() => handleQuickQuery("Who is Daniel?")}
                disabled={isLoading}
                className="rounded-lg border border-line bg-ink px-3 py-1.5 text-xs text-muted transition hover:border-brass hover:text-brass-hot disabled:opacity-30"
              >
                Who is Daniel?
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
