# StewardBridge — GitHub → Cloudflare + MongoDB Atlas

## What this archive is
This is the StewardBridge website source package. The external AI agent is not bundled into the website. Its build prompt is supplied separately and should NOT be uploaded to the website repository.

## Important credential distinction
- A Cloudflare API token typically begins with `cfat_`. It is for Cloudflare account/API access, NOT a MongoDB connection string. Do not put it in `MONGODB_URI` or commit it to GitHub.
- A MongoDB Atlas connection URI normally begins with `mongodb+srv://` (or sometimes `mongodb://`). It contains the database username, password, and cluster hostname. Store it only as a secret in the deployment environment.

## 1. Create the GitHub repository
1. On GitHub, choose **New repository** and name it `stewardbridge-hospitality`.
2. Create it as Private if you prefer. Do not initialize it with another README if you will upload this project's files.
3. Extract this ZIP on your computer.
4. Open the extracted project folder. Upload the CONTENTS of the folder to the repository root, including `package.json`, `src/`, `public/` if present, `wrangler.jsonc`, `open-next.config.ts`, and the config files. Do not upload the ZIP as one file, and do not nest the project inside another folder.
5. Do not upload `.env`, real connection strings, Cloudflare tokens, Google secrets, or agent secrets. `.env.example` is a template only.

## 2. Connect GitHub to Cloudflare
1. In Cloudflare, open **Workers & Pages** and choose to create a Worker from a Git repository (the exact label can vary).
2. Authorize GitHub and select `stewardbridge-hospitality`.
3. The intended runtime is Cloudflare Workers using the OpenNext adapter, not a static-only Pages upload.
4. The project scripts are `npm run preview` and `npm run deploy`. Cloudflare's build/deploy UI and build environment must be configured for the OpenNext workflow. Do not use a static HTML-only deployment.

## 3. Add environment variables/secrets
In the Worker settings, add these as appropriate:

- `MONGODB_URI` — the full MongoDB Atlas URI copied from **Connect → Drivers**. Replace the password placeholder locally before adding it. If the password contains special characters, URL-encode them.
- `MONGODB_DATABASE` — `stewardbridge`
- `AUTH_SECRET` — a long, random session secret
- `ADMIN_EMAIL` — the exact email intended to be the admin identity
- `AUTH_URL` — the deployed public URL after Cloudflare assigns it
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` — required for Google sign-in; Cloudflare does not generate these automatically.
- Agent webhook, email sender, and object-storage secrets only when those integrations are being enabled.

Never expose secret values through `NEXT_PUBLIC_` variables, client-side code, screenshots, or Git commits. If a Cloudflare API token has been shared or committed, revoke it and create a restricted replacement.

## 4. MongoDB Atlas checklist
- Create the Atlas cluster and database user.
- Confirm the user has the necessary read/write permissions on `stewardbridge`.
- Configure Atlas Network Access for the deployment's supported connectivity method.
- The database and collections can be created by the application when first written, but the runtime must successfully connect to Atlas.

## 5. Before calling deployment successful
Run and inspect the actual build/deployment logs. Then test at minimum:
- homepage and navigation
- registration and login
- admin authentication and dashboard
- job browsing and posting
- applications and saved jobs
- messaging and notifications
- document/CV upload and authorized retrieval
- external-agent chat/webhook and failure handling

A ZIP integrity check or static check is not the same as a successful production build or a live MongoDB test. Do not consider the deployment verified until these checks pass on the deployed URL.
