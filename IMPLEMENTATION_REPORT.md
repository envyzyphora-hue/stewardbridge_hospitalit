# StewardBridge integrated implementation report

## What was combined

- Kept the fuller Next.js/React application migrated to MongoDB Atlas and its existing candidate, employer, admin, jobs, applications, messages, staffing, documents, audit, and agent-door routes as the code base.
- Kept the cinematic, industry-wide public homepage rather than the alternate static hospitality-only mock-up, which displayed invented sample vacancies and contact details. The product scope remains multi-industry.
- Kept the website integration boundary and contract only. The external AI agent and n8n workflow are deliberately excluded from this website ZIP and have a separate master prompt PDF.
- Added an explicit website/n8n contract and setup checklist in `INTEGRATION_CONTRACT.md`.

## Implemented in this ZIP

1. **Admin user privacy:** the admin users API now selects an explicit safe field list and does not serialize password hashes or authentication internals. The overview API only loads IDs and roles for counts.
2. **Private candidate documents:** employers can retrieve a candidate document only when an application is shortlisted, in interview, or accepted. Document reads are audited. Download responses use private/no-store headers and a safe attachment filename.
3. **File-upload validation:** allowed file types are checked against their file signatures as well as declared MIME type. This is not a malware scan; configure a malware scanning service before public launch.
4. **Agent access control:** the agent context endpoint validates its input, omits phone numbers and raw private documents, and logs context access. Private document retrieval now requires a document-specific human-approved draft. Agent write operations create approval drafts rather than directly publishing jobs or staffing actions.
5. **Approval controls:** agent draft decisions validate the approver against the configured admin UUID allowlist, prevent a second decision on an already claimed draft, and record an audit event. Jobs created from approved agent drafts remain `pending_review` for platform review.
6. **Agent secret handling:** private agent endpoints require `STEWARD_BRIDGE_AGENT_WEBHOOK_SECRET` with at least 32 characters and timing-safe comparison. The secret must remain server-side.
7. **Chat contract:** website chat sends both `user.id` and `user.userId`, plus a stable `conversation_id`, matching the documented external-agent contract. An early `{status:"working"}` response is no longer presented as if it were an AI answer.
8. **External workflow separation:** the n8n workflow JSON is not included in this website ZIP. The separate agent project must implement and test the documented request/response contract before live connection.
9. **Separate event webhooks:** durable platform events no longer fall back to the interactive chat webhook. Event delivery uses `STEWARD_BRIDGE_EVENTS_WEBHOOK_URL` and requires an HMAC signing secret when configured.
10. **Contact data:** the requested public contact defaults are set to `elubodetimothy@gmail.com` and WhatsApp/phone `+234 706 651 0205`, with environment overrides. The contact API validates payloads and applies a best-effort per-instance rate limit.
11. **Sign-in monitoring:** successful sign-ins are audit-logged, admin users receive an in-app notification, and optional Resend email alerts and signed agent event delivery are supported when configured. The sender domain and provider credentials still need setup.
12. **Operator guidance:** updated setup, security, integration, verification, and deployment instructions. Added `npm run verify:bundle` for repeatable static checks.

## Verification performed

- `node scripts/verify-bundle.mjs`: **15/15 static bundle checks passed**.
- ZIP integrity check passed.
- Dependency installation timed out, so TypeScript/TSX typechecking and production build remain unverified.

## Verification not completed

A full dependency installation timed out in this environment. Therefore I could not truthfully certify `npm run typecheck`, `npm run lint`, `npm run build`, browser behavior, database migrations, or live integrations. These must be run after dependencies and credentials are available. The ZIP should be treated as an implementation candidate, not as proof of production readiness.

## Required before public launch

- Set a real MongoDB Atlas `MONGODB_URI` and `MONGODB_DATABASE`, long random `AUTH_SECRET`, `AUTH_URL`, and the actual `ADMIN_EMAIL`.
- Configure private S3-compatible storage and test read/write permissions.
- When the separate agent is ready, configure its production webhook URL and a matching 32+ character shared secret in both systems.
- Set `STEWARD_BRIDGE_AGENT_OWNER_USER_IDS` to the real admin user UUID. The n8n `OWNER_USER_ID` must match it, and Telegram owner-chat allowlisting must be set to the correct Telegram IDs.
- If using event delivery, set a separate event URL and `STEWARD_BRIDGE_EVENTS_SIGNING_SECRET`.
- Confirm the contact email spelling and phone number before production; they are currently configured to the values supplied in chat.
- Configure Google OAuth if desired, Telegram and AI gateway credentials in n8n, backups, monitoring, password reset/email verification, and a malware scanning service.
- Run `npm install`, then `npm run verify:bundle`, `npm run typecheck`, `npm run lint`, and `npm run build`; fix any environment-specific failures before deploying.

The source ZIP does not contain live credentials, a running external agent, an email provider, a malware scanner, or a production database. Those are external services/configuration and cannot be honestly marked as working until tested.


## Follow-up changes in this revision

- Removed the n8n workflow JSON from the website ZIP. The external AI agent and workflow remain a separate project, as requested. The website keeps only the API boundary and integration documentation needed to connect it later.
- Set the requested public contact defaults to `elubodetimothy@gmail.com` and WhatsApp/phone `+234 706 651 0205`; the contact panel exposes both a WhatsApp link and a `tel:` link.
- Added successful sign-in audit records, in-app admin notifications when an admin account is provisioned, and optional Resend email alerts controlled by `RESEND_API_KEY`, `EMAIL_FROM`, and `SIGNIN_ALERT_EMAIL`. Sign-in events can also be delivered through the separate signed event webhook when configured.
- Documented the private object-storage boundary: the website stores CVs in a private S3-compatible bucket; the external agent must use permission-checked website APIs and must not receive raw bucket credentials. The agent's own memory and files belong in its separate persistent storage.
- Verification: the static bundle script passes after its checks were updated to enforce separation of the n8n workflow. Dependency installation timed out in this environment, so a full TypeScript typecheck and production build remain unverified. Live email, database, storage, and webhook tests require owner credentials.


## MongoDB and Cloudflare migration revision

- Replaced the Neon/PostgreSQL connection with a MongoDB Atlas driver and a Mongo-backed compatibility query layer to preserve the existing API/action call sites while migrating their persistence operations.
- Added Cloudflare OpenNext configuration (`open-next.config.ts`, `wrangler.jsonc`) and `preview`/`deploy` scripts.
- Updated environment examples and setup guidance for MongoDB Atlas.
- This revision has **not** passed a production build or live Atlas/Cloudflare end-to-end test in this environment because dependency installation timed out. Do not treat it as production-certified until `npm install`, `npm run typecheck`, `npm run lint`, `npm run preview`, and live smoke tests pass.
