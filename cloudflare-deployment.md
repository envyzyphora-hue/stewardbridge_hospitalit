# StewardBridge Cloudflare + MongoDB Atlas deployment

## Runtime architecture
- Next.js App Router deployed to Cloudflare Workers using the OpenNext Cloudflare adapter.
- MongoDB Atlas stores application records. Collections are created automatically when first written.
- CVs and private documents stay in S3-compatible object storage (Cloudflare R2 recommended); MongoDB stores metadata only.
- The external AI agent remains a separate service and is connected by the configured signed webhook/API.

## Required setup
1. In MongoDB Atlas, create a cluster, a database user, and a database named `stewardbridge`.
2. Configure Atlas Network Access for the deployment. Do not use `0.0.0.0/0` unless you consciously accept the exposure; use a secure network design supported by your plan and deployment runtime.
3. Copy `.env.example` values into Cloudflare Worker secrets/variables. Set `MONGODB_URI` and `MONGODB_DATABASE`. Never commit real credentials or paste secrets into chat.
4. Configure `AUTH_SECRET`, `AUTH_URL`, `ADMIN_EMAIL`, and any OAuth, external-agent, email, and R2 settings you intend to use.
5. Install dependencies and test locally with `npm install`, then `npm run typecheck`, then `npm run preview`.
6. Deploy with `npm run deploy` after preview checks pass.

## Important compatibility note
MongoDB uses a Node.js driver over TLS/TCP. Cloudflare Workers support depends on the OpenNext adapter, `nodejs_compat`, and current socket/runtime support. A successful bundle alone does not prove live Atlas connectivity. Run the health endpoint and exercise registration, login, jobs, applications, messaging, documents, and admin flows after configuring secrets. Do not consider production ready until these pass.

## MongoDB environment
- `MONGODB_URI`: Atlas connection string, including database name and options.
- `MONGODB_DATABASE`: database name; defaults to `stewardbridge` if omitted.

## Private document storage
Keep CVs and documents in a private R2/S3-compatible bucket. Do not store file bytes in MongoDB and do not expose bucket credentials to the external agent. Configure the storage variables in `.env.example`.
