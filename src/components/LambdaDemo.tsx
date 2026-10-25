'use client';

import { useState } from 'react';

interface LambdaResponse {
  success: boolean;
  response?: string;
  error?: string;
  requestId?: string;
}

export default function LambdaDemo() {
  const [input, setInput] = useState('{"query": "Hello from cache-busted Vercel!"}');
  const [response, setResponse] = useState<LambdaResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const invokeLambda = async () => {
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch('/api/lambda/invoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SANDBOX_API_KEY}`,
        },
        body: JSON.stringify({ payload: JSON.parse(input) }),
      });

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setResponse({
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="lambda-demo" className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <div className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-brass">
            Lambda Integration
          </p>
          <h2 className="mt-3 font-display text-3xl text-paper md:text-4xl">
            Secure Lambda Invocation
          </h2>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-muted md:text-right">
          This demo securely invokes an AWS Lambda function via a Next.js API route.
          Credentials never leave the server — Vercel serverless functions handle SigV4 signing.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-ink-soft/70 p-6 backdrop-blur-sm">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="lambda-input"
              className="block text-sm font-medium text-paper mb-2"
            >
              Request Payload (JSON)
            </label>
            <textarea
              id="lambda-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full min-h-[120px] rounded-xl border border-line bg-ink p-4 text-sm font-mono text-paper placeholder-muted focus:border-brass focus:outline-none focus:ring-1 focus:ring-brass resize-y"
              placeholder='{"query": "your question here"}'
              disabled={loading}
            />
          </div>

          <button
            onClick={invokeLambda}
            disabled={loading}
            className="rounded-xl bg-brass px-6 py-3 text-sm font-semibold text-ink transition hover:bg-brass-hot disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Invoking...' : 'Invoke Lambda'}
          </button>

          {response && (
            <div
              className={`rounded-xl p-4 text-sm font-mono ${
                response.success
                  ? 'border border-brass/30 bg-brass/10 text-brass-hot'
                  : 'border border-red/30 bg-red/10 text-red-400'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">
                  {response.success ? 'Success' : 'Error'}
                </span>
                {response.requestId && (
                  <span className="text-xs text-muted">
                    RequestId: {response.requestId}
                  </span>
                )}
              </div>
              <pre className="whitespace-pre-wrap break-words">
                {response.success ? response.response : JSON.stringify(response.error, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}// cache bust
