# TODO - Future Features

## Backend / Infrastructure
- [ ] **Add SQS Integration**
  - Implement SQS queue for async message processing
  - Add dead letter queue for failed messages
  - Configure visibility timeout and retry policies
  
  ### Questions to Answer Before Implementation
  - **Do you want to keep the synchronous Function URL for backward compatibility?** Or fully migrate to async?
  - **How should clients get results?** Poll a `/result/{message_id}` endpoint, or webhook/callback?
  - **Message retention?** How long should results stay in DynamoDB (default: 24h TTL)?
  - **Batch size preference?** Default 10 (good for free tier), or smaller for lower latency?

## Tools / Integrations
- [ ] **Google Search Tool**
  - Integrate Google Custom Search API or SerpAPI
  - Add search tool to agent's available functions
  - Implement rate limiting and caching

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
