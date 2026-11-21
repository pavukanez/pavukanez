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

## Priority Legend
- 🔴 Critical - Bugs affecting production
- 🟡 High - Features blocking other work
- 🟢 Medium - Nice to have improvements
- 🔵 Low - Future enhancements
