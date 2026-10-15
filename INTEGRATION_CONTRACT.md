# StewardBridge integration contract

This file documents the website-to-agent boundary. The external agent remains a separate deployment; it is not bundled as a running service in this ZIP.

## Website chat request

`POST /api/agent/chat` requires a signed-in user and accepts:

```json
{
  "message": "Help me find suitable jobs",
  "channel": "website",
  "conversation_id": "optional-stable-id"
}
```

The website calls the configured `STEWARD_BRIDGE_AGENT_WEBHOOK_URL` using JSON and the `x-stewardbridge-agent-secret` header when `STEWARD_BRIDGE_AGENT_WEBHOOK_SECRET` is configured. The outgoing body includes both `user.id` (the n8n contract) and `user.userId` (the website contract), plus `conversation_id`, `channel`, `message`, and `source`.

The webhook must return JSON with a real `reply` string. A response such as `{ "status": "working" }` is only an acknowledgement and is not displayed as if it were the AI answer. The separate n8n workflow must return the completed website answer after it is saved to the website. The workflow itself is intentionally not included in this website ZIP.

## n8n -> website private endpoints

All `/api/agent-door/*` endpoints require the same strong shared secret using `x-stewardbridge-agent-secret` or `Authorization: Bearer ...`. Set a random secret of at least 32 characters in both secret stores. Never place the secret in client-side code, source control, a workflow sticky note, or a public response.

- `POST /api/agent-door/messages`: save a user or agent message.
- `POST /api/agent-door/context`: fetch limited profile context and conversation history for a user UUID and conversation ID.
- `POST /api/agent-door/reply`: save the agent reply.
- `POST /api/agent-door/tickets`: create a human handoff ticket.
- `POST /api/agent-door/notify`: send a platform notification through the configured implementation.
- `POST /api/agent-door/drafts/decision`: record an explicit approve/reject decision for a draft.

The context endpoint intentionally omits account phone numbers, password hashes, authentication state, and raw document objects. Private document retrieval is separately gated by a human-approved document-specific draft. Do not expand it to expose private data without a documented purpose and permission check.

## Role compatibility

Website roles are `candidate`, `business`, and `admin`. The workflow recognizes these plus its legacy aliases (`applicant`, `staff`, `hotel_*`, `business_*`, `super_admin`, `ops_admin`, `recruiter`, `supervisor`, `finance`) for routing only. Aliases do not grant website permissions. The website remains the authority for user identity and authorization.

## First-run checklist

1. Deploy the website and configure the database, auth, private storage, and admin identity secrets.
2. Set `STEWARD_BRIDGE_AGENT_WEBHOOK_URL` to the n8n production webhook URL.
3. Configure the n8n webhook's header authentication to use header `x-stewardbridge-agent-secret`; set the same generated secret in both systems.
4. Set the workflow's `SITE_URL` to the deployed website origin and configure the workflow's API credential to use the same header/secret.
5. Activate the workflow and send a signed-in test chat message. Confirm a real reply returns and the conversation appears in the agent-door message store.
6. Test a wrong secret (expect 401), invalid user UUID (expect 400), missing user (expect 404), and missing webhook URL (expect a clear 503 response).
7. Configure Telegram credentials and restrict commands to explicitly approved owner IDs before enabling the Telegram trigger.

The website ZIP intentionally contains no n8n workflow JSON and no live credentials. Build the separate workflow project using the agent master prompt; configure its URLs and credentials in that project's secret settings.


## Separate platform event delivery

`STEWARD_BRIDGE_EVENTS_WEBHOOK_URL` is deliberately separate from the interactive chat webhook. Platform events are persisted in `webhook_events` first; delivery is attempted only when an event URL is configured. HMAC signatures require `STEWARD_BRIDGE_EVENTS_SIGNING_SECRET` whenever an event URL is configured and are sent as `x-stewardbridge-signature`. Configure the receiver to verify this signature before trusting event data. A chat webhook URL must never be used as an event endpoint.


## Sign-in alerts and platform events

Successful sign-ins are written to the audit log. The admin notification feed receives a sign-in notice when an admin user is present in the database. If `RESEND_API_KEY`, `EMAIL_FROM`, and `SIGNIN_ALERT_EMAIL` are configured, the website also attempts to send an email alert through Resend. `EMAIL_FROM` must use a sender domain verified with the provider; a public Gmail contact address is the recipient/contact channel, not an authenticated sender identity. Notification delivery is best-effort and must not block a legitimate sign-in.

When the separate event webhook is configured, successful sign-ins are also emitted as `auth.sign_in` events. Events are stored first; live delivery requires `STEWARD_BRIDGE_EVENTS_WEBHOOK_URL` and `STEWARD_BRIDGE_EVENTS_SIGNING_SECRET`. The external agent is not included in this website ZIP and can be connected later.

## Private files and agent memory boundary

Candidate CVs and certificates belong in a private S3-compatible object-storage bucket, with file metadata and permissions in the website database. Configure `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, and (for providers such as R2) `STORAGE_ENDPOINT`. Do not make the bucket public. The website remains the authority for candidate-document permissions.

The external agent may maintain its own separate persistent memory database and private file/object storage when that project is built. It must not receive the website's storage credentials or unrestricted bucket access. For website files, the agent should request a permission-checked website API operation; the website may return a short-lived, document-specific access mechanism only after authorisation and required human approval. Store agent memory as searchable, scoped records plus document/object references and optional embeddings; apply access control, retention/deletion rules, backups, and budget alerts. No storage system is literally infinite, so the design should scale and archive safely rather than promise unlimited lifetime capacity.


## Document upload -> external agent -> agent-owned memory

When a CV or document is uploaded, the website stores the original in its own private object-storage bucket and writes metadata to MongoDB. It emits a `document.uploaded` event containing the document ID, owner ID/email, category, file name/type/size, and a `requiresAuthorisedRetrieval` flag. The file bytes are not included in the event. Configure `STEWARD_BRIDGE_EVENTS_WEBHOOK_URL` to the external agent's dedicated event-ingestion endpoint; it is separate from the interactive chat endpoint.

The external agent should acknowledge the event, create a durable ingestion task, request authorised access to the exact document ID through `POST /api/agent-door/documents`, and store an approved copy in its own private object storage with source document ID, checksum, access scope, retention policy, and audit metadata. It must not receive the website's bucket credentials. The current website route requires an approved document-access draft before returning file bytes. This deliberate gate must not be bypassed by the shared secret alone. To automate ingestion without manual approval for every file, implement an explicit candidate upload consent and a narrowly scoped server-side policy, then test that only consented document categories are eligible. Do not enable blanket access to every private document.

The website remains the authoritative original; the agent's copy is a derived working copy and must not delete or modify the website's original. If the agent is offline, the website's `webhook_events` record remains in the database, but automatic retry/queue draining must be configured and verified before claiming guaranteed delivery.
