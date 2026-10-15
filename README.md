# StewardBridge

StewardBridge is a workforce and recruitment platform for candidates and employers across hospitality, healthcare, retail, logistics, facilities, events, offices, trades, and other service industries. This project combines the cinematic public experience, the Next.js full-stack application, and the external-agent integration contract.

## Stack

- Next.js App Router, React, TypeScript
- MongoDB Atlas using the MongoDB Node.js driver and a compatibility query layer for the existing application routes
- Cloudflare Workers deployment using the OpenNext adapter
- NextAuth for credentials and optional verified Google sign-in
- Private S3-compatible object storage for candidate documents (provider credentials and bucket must be configured)
- Separate n8n workflow for AI assistant, Telegram, and human handoff

The external AI agent and its n8n workflow are intentionally **not included in this website ZIP**. They are a separate project with a separate prompt/PDF. The website exposes a secured integration boundary so the agent can be connected later.

## Local setup

1. Use Node.js 20.9 or newer.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and fill in the required values. Do not commit `.env.local`.
4. Create a MongoDB Atlas cluster and configure `MONGODB_URI` and `MONGODB_DATABASE` using `.env.example`.
5. Configure `AUTH_SECRET`, `AUTH_URL`, and `ADMIN_EMAIL`. The first admin identity must sign in with verified Google using the exact allowlisted email; public registration cannot create admin accounts.
6. Configure private object storage credentials and a private bucket before accepting real CVs/certificates.
7. MongoDB collections are created as records are written. Before production, validate indexes, uniqueness constraints, and all query paths against your Atlas database.
8. Run `npm run dev`.

## Verification commands

Run these locally and in CI before production deployment:

```bash
npm run typecheck
npm run lint
npm run build
```

The code being present does not itself prove a production deployment is ready. This source package has not been certified against a live database, Google OAuth project, object-storage bucket, email provider, Telegram bot, or live n8n deployment. Those integrations require owner credentials and end-to-end tests.

## Important security and production setup

- The admin user-list API uses an explicit field allowlist and does not return password hashes.
- Candidate documents are private; employers can access a candidate's document only after an application reaches shortlisted, interview, or accepted status. Uploads are stored in the configured private object-storage bucket and metadata is recorded in MongoDB. The external agent may request an authorised copy through the separate API; current document reads require a human-approved document-specific draft. Owner/admin access is audited. The agent's own storage is configured in the separate agent project, not by the website ZIP.
- Configure `STEWARD_BRIDGE_AGENT_WEBHOOK_SECRET` with a random secret of at least 32 characters and keep it in server-side secret settings only. Set `STEWARD_BRIDGE_AGENT_OWNER_USER_IDS` to the approved admin user UUID for Telegram approvals.
- Set `STEWARD_BRIDGE_AGENT_WEBHOOK_URL` to the real n8n webhook URL. It is intentionally not invented or hardcoded here.
- Public contact defaults are `elubodetimothy@gmail.com` and WhatsApp/phone `+234 706 651 0205` (`https://wa.me/2347066510205`). Set `PUBLIC_CONTACT_EMAIL` and `PUBLIC_CONTACT_WHATSAPP` to override them. The phone link opens WhatsApp from the WhatsApp contact link and the `tel:` link opens the phone dialler.
- Successful sign-ins are audit-logged. Admin users receive an in-app notification when an admin account is provisioned. Email notifications for sign-ins, contact-form submissions, and document uploads use Resend and require `RESEND_API_KEY`, a verified `EMAIL_FROM` sender, and `SIGNIN_ALERT_EMAIL=elubodetimothy@gmail.com`. The recipient Gmail address alone cannot send email; a sender/provider credential is required. Notifications never include passwords, reset tokens, or full CV attachments. Live delivery must be tested after credentials are configured.
- Contact submissions are validated and best-effort rate-limited per running instance. Production deployments should add a shared rate-limit store/WAF and spam monitoring.
- Configure backups, database migration rollback, log retention, a malware scanning service, email verification/password reset, and monitoring before public launch. Uploads validate file signatures but are not malware-scanned by this code alone.
- No online payment gateway is enabled in this scope. Record agreed offline payment/invoice status only, with an explicit service agreement.
- Do not collect NIN/BVN or date of birth in routine candidate onboarding. Confirm legal/consent copy with qualified counsel before launch.

## Email and document notifications

The business recipient is `elubodetimothy@gmail.com`. Successful sign-in alerts include the email address, provider and timestamp—not the password. Contact-form notifications include the submitted enquiry. CV/document notifications include uploader email, category, file name, size and a private authenticated document link; the document is not attached to email. Configure Resend (`RESEND_API_KEY`) and a verified sender (`EMAIL_FROM`) once in the deployment's server-side environment. If those values are missing or invalid, the website still records the event but cannot deliver email; verify delivery with a real test after setup.

## Agent integration

See [`INTEGRATION_CONTRACT.md`](./INTEGRATION_CONTRACT.md) for the website/n8n payload contract, required secret configuration, role mapping, and test checklist. Build and manage the n8n workflow in its separate project using the external-agent master prompt PDF. Once the website is deployed, reconcile the real website URL and API contract with the agent project, configure secrets in each service, and test before activation. No workflow JSON or agent runtime is bundled in this website ZIP.

## Deployment

Deploy with Cloudflare Workers using `npm run preview` first, then `npm run deploy`. Configure `MONGODB_URI`, `MONGODB_DATABASE`, authentication, storage, email, and agent secrets in Cloudflare. After deployment, verify `/api/health`, registration/login, jobs, applications, messaging, document access restrictions, admin actions, and agent webhooks. Never place production credentials in this ZIP or in Git. A successful bundle is not a substitute for end-to-end testing.
