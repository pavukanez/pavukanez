# TODO - Future Features

## Backend / Infrastructure
- [ ] **Add SQS Integration**
  - Implement SQS queue for async message processing
  - Add dead letter queue for failed messages
  - Configure visibility timeout and retry policies
  
  ### ❓ Questions to Answer Before Implementation
  - **Do you want to keep the synchronous Function URL for backward compatibility?** Or fully migrate to async?
  - **How should clients get results?** Poll a `/result/{message_id}` endpoint, or webhook/callback?
  - **Message retention?** How long should results stay in DynamoDB (default: 24h TTL)?
  - **Batch size preference?** Default 10 (good for free tier), or smaller for lower latency?

- [ ] **Token Usage Tracking & Auto-Summarization (150k threshold)**
  - Track cumulative token usage per conversation (input + output tokens from OpenRouter `usage` field)
  - Store token count in DynamoDB alongside conversation history
  - When total tokens exceed 150k threshold:
    - Add a job to SQS queue for background summarization
    - SQS message contains: conversation_id, full history, current token count
  - Background worker (Lambda) processes SQS message:
    - Calls LLM to generate concise summary of conversation history
    - Stores summary in DynamoDB (replaces or supplements full history)
    - Updates token count to reflect summarized version
  - Next query uses compressed/summarized history to stay within token window
  - Implement configurable threshold (default 150k, adjustable via env var)
  - Add monitoring/alerting for summarization jobs
  - Handle edge cases: summarization failures, very long single messages

- [ ] **AWS Architecture Security & Pricing Review**
  - Verify all resources stay within AWS Free Tier limits
  - Review IAM roles/permissions for least privilege
  - Check Lambda, API Gateway, DynamoDB, SQS, CloudWatch costs
  - Ensure no public/unencrypted endpoints
  - Validate VPC/networking configuration (if applicable)
  - Document estimated monthly cost at scale

## Tools / Integrations
- [ ] **Google Search Tool**
  - Integrate Google Custom Search API or SerpAPI
  - Add search tool to agent's available functions
  - Implement rate limiting and caching

- [ ] **Automated Security Scanning & Auto-Remediation Agent (EventBridge Cron)**
  - **Schedule**: Run on configurable cron schedule (e.g., daily at 2 AM UTC) via EventBridge
  - **Scope**: Support scanning multiple repositories (monorepo or multi-repo) vs single repo
    - Configurable repo list via Parameter Store / SSM / DynamoDB
    - Per-repo configuration (language, scan depth, auto-fix rules)
  - **Security Checks**:
    - **Dependency vulnerabilities**: SCA scanning (GitHub Dependabot, Snyk, OWASP Dependency Check, Trivy, pip-audit, npm audit)
    - **Infrastructure as Code**: Terraform/Terragrunt misconfigurations (tfsec, checkov, tflint)
    - **Container security**: Dockerfile best practices (hadolint), image scanning (Trivy, Grype)
    - **Secrets detection**: Git history & current files (gitleaks, truffleHog)
    - **SAST/Code analysis**: Language-specific linters/security rules (bandit for Python, eslint-security for JS/TS, gosec for Go)
    - **Supply chain**: SBOM generation (Syft), license compliance
  - **Auto-Remediation**:
    - Dependency updates: Auto-create PRs with version bumps for non-breaking fixes
    - IaC fixes: Auto-apply safe tfsec/checkov remediation suggestions
    - Configuration hardening: Apply security best practice defaults
    - **Human-in-the-loop**: Critical/high severity → create GitHub Issue/PR for review; Low/medium → auto-fix with configurable policy
  - **Architecture**:
    - EventBridge rule → Lambda (orchestrator) → fan-out to per-repo worker Lambdas (or Step Functions for complex flows)
    - Workers clone repos (shallow clone), run scanners in parallel, aggregate results
    - Results stored in DynamoDB (scan history, trends, compliance dashboard)
    - Findings published to Security Hub / SNS / Slack / Email
    - Auto-fix PRs created via GitHub API (requires PAT with repo scope)
  - **Configurability**:
    - Per-repo scan profile (strict/standard/permissive)
    - Auto-fix policy: none / low-only / low-medium / all-with-approval
    - Notification channels per severity
    - Exclude paths / false positive suppression
  - **Observability**:
    - CloudWatch metrics: scan duration, findings by severity, auto-fix success rate
    - Dashboard: repo health score, vulnerability trends, MTTR
    - Alerting: new critical findings, scan failures, auto-fix failures
  - **Cost Optimization**:
    - Run in AWS Free Tier where possible (Lambda, EventBridge, CloudWatch)
    - Shallow clones, cache dependencies between runs (EFS or S3 cache)
    - Parallel execution with concurrency limits
  - **Questions to Answer**:
    - **GitHub integration**: Use GitHub App (recommended) vs PAT for PR creation?
    - **Scanner selection**: Which tools to prioritize (open-source vs commercial)?
    - **Multi-repo strategy**: Single Lambda with loop vs Step Functions map state vs fan-out?
    - **State management**: Store scan state in DynamoDB vs GitHub Checks API?
    - **Rollback strategy**: How to handle bad auto-fixes (revert PR, notify)?

## Evaluation / Testing
- [ ] **Agent Evaluations**
  - Set up evaluation framework (e.g., LangSmith, custom)
  - Define evaluation metrics (accuracy, latency, cost)
  - Create test dataset with expected outputs
  - Implement automated regression testing

## Bug Fixes
- [x] **Fix LLM Bug: "User Safety: safe" Response** ✅ **COMPLETED**
  - Issue: LLM occasionally returns "User Safety: safe" in responses
  - Root cause: Likely content filter/moderation response leaking into output
  - Fix: Added post-processing to filter out safety metadata (`filter_safety_metadata` function)
  - Added unit tests to prevent regression (18 tests covering various patterns)
  - Location: `pavukanez-backend/lambda/src/lambda_function.py` and `pavukanez-backend/lambda/src/test_lambda_function.py`

---

## Priority Legend
- 🔴 Critical - Bugs affecting production
- 🟡 High - Features blocking other work
- 🟢 Medium - Nice to have improvements
- 🔵 Low - Future enhancements

## Notes
- Prioritize the LLM bug fix as it affects user experience directly
- SQS integration will enable better scalability for the chat system
- Agent evals should be set up before adding more complex tools