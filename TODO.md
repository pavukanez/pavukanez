# TODO - Future Features

## Backend / Infrastructure
- [ ] **Async GitHub Repo Review with SQS**
  - Implement SQS queue for async repo review jobs
  - Add dead letter queue for failed messages (3 retries, 7-day TTL for debugging)
  - Worker Lambda (SQS-triggered) with 5-min timeout for iterative review
  - DynamoDB table for job status/results with 7-day TTL
  - Single Lambda Function URL for both POST (enqueue) and GET (poll status)
  - Free-tier optimized: 128MB/10s enqueue, 512MB/300s worker, PAY_PER_REQUEST DynamoDB
  - Frontend: POST `/review` → poll GET `/review/jobs/{jobId}`

## Tools / Integrations
- [ ] **LLM as Judge (Answer Verification & Retry Loop)**
  - Implement LLM-based evaluator to verify answer quality
  - Judge checks: correctness, completeness, relevance, hallucination detection
  - Loop back to agent for re-generation if answer fails quality threshold
  - Retry caps: 15 retries per tool call, 3 review cycles total
  - On cap reached: return best attempt with quality warning flag
  - Track and log quality scores for monitoring

## Frontend / UX
- [x] **Inline Repo Review in Chat (Phase 1-3) — 🟡 High**
  - **Phase 1: Inline Chat Component (No Streaming)**
    - [x] 1.1 Create `CodeReviewMessage.tsx` — renders review markdown inline with collapsible file list + "Review More Files" button
    - [x] 1.2 Update `Message` type: add `isCodeReview?`, `repoUrl?`, `filePaths?`
    - [x] 1.3 Integrate inline rendering: detect `## Code Review:` in assistant messages
    - [x] 1.4 Update `handleRequestMoreFiles` → appends follow-up user message in chat
    - [x] 1.5 Remove overlay: delete `repoReview`/`pendingRepoAnalysis` state, `useEffect` hooks, `RepoReviewPanel` import & JSX
    - [x] 1.6 Delete `/pavukanez/src/components/RepoReviewPanel.tsx`
    - [x] 1.7 Test: review appears in chat, "Review More Files" works, no overlay
  - **Phase 2: Streaming for Repo Reviews (Immediate UX Win)**
    - [x] 2.1 Detect repo review intent in `handleSubmit`/`handleQuickQuery`
    - [x] 2.2 Add SSE streaming: `Accept: text/event-stream` for repo reviews
    - [x] 2.3 Implement SSE parsing helper → append chunks to assistant message in real-time
    - [x] 2.4 Update message rendering: show `TypingIndicator` while streaming
    - [x] 2.5 Test: tokens appear progressively, follow-up works mid-stream
  - **Phase 3: Polish & Edge Cases**
    - [x] 3.1 localStorage persistence for messages (survives refresh)
    - [x] 3.2 Smart scroll: auto-scroll on new message, preserve position if user scrolled up
    - [x] 3.3 Error states: inline error in bubble with retry button
    - [x] 3.4 Accessibility: ARIA live region, keyboard nav, focus management
  - **Phase 4: Future-Proofing for Polling (SQS Ready) — Stubs Only**
    - [x] 4.1 Extend `Message` type: `jobId?`, `polling?`
    - [x] 4.2 Create `useRepoReviewPolling.ts` hook (stub: `startRepoReview`, `useRepoReviewJob`)
    - [x] 4.3 Add route detection prep: `isLargeRepoReview` flag (default false for now)
    - [x] 4.4 Render logic: if `message.jobId` → use polling hook data

- [ ] **Phase 5: Backend Polling Infrastructure (Future PR)**
  - [ ] 5.1 `POST /api/repo-reviews` → enqueue SQS, return `{ jobId }`
  - [ ] 5.2 Worker Lambda: process SQS → update DynamoDB with progress/partialResult
  - [ ] 5.3 `GET /api/repo-reviews/{jobId}` → return `{ status, progress, partialResult, result }`
  - [ ] 5.4 Frontend: flip `isLargeRepoReview = true` for large repos
  - [ ] 5.5 Add jobId to URL: `/sandbox?job=abc` for shareability

## Priority Legend
- 🔴 Critical - Bugs affecting production
- 🟡 High - Features blocking other work
- 🟢 Medium - Nice to have improvements
- 🔵 Low - Future enhancements
