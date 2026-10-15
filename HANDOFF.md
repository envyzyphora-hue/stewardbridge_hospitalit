# StewardBridge: cinematic homepage continuation (v21, 10 Oct 2026)

Supersedes v20 for the public homepage composition and floating assistant presentation. The wider architecture and backlog in `StewardBridge_Project_Memory_Handoff (1).pdf` remain applicable unless this note explicitly changes them.

## What changed in v21
- Added `src/components/hrcloud/cinematic-home.tsx`, mounted as the default public route in `src/app/legacy/LegacyApp.tsx`.
- Added `src/components/ui/media-mosaic.tsx` with 18 explicit media objects: 2 wide autoplay muted loops, 10 documentary cards, and 6 parallax-hover cards. Each card has unique ID, alt text, aspect ratio, and cursor-following radial light.
- Added `src/components/ui/floating-chat.tsx` as a fixed glassmorphic assistant with spring drawer motion, pulsing status border, suggested prompts, loading state, and `/api/agent/chat` integration.
- Updated `src/app/page.tsx` only to document/preserve the existing App Router shell; it continues to render `LegacyApp` so auth, hash routes, workspace, header and footer are not bypassed.
- Added `framer-motion` to dependencies. `lucide-react` was already present.
- Kept the latest owner preference from v20: colour and visible people are required; the Opus-inspired typography, cinematic video, layered vignette, glass and smooth motion are blended with bold warm colour rather than enforcing monochrome.
- No API routes, auth rules, database schema, or agent webhook protocol were edited.

## Media / production notes
- The 18 slots use remote Unsplash and Pexels media URLs as visual sources. These URLs were not network-checked from the offline editing sandbox, and no image licensing rights are included with the project. Before public commercial launch, verify each URL, confirm license/usage rights, and preferably host licensed assets under `/public/images` and `/public/video`.
- Hero and loop cards use `object-cover`, `muted`, `loop`, `autoPlay`, `playsInline`, and `translateZ(0)` to encourage GPU compositing. Browser autoplay remains subject to device/browser policies.
- Every alt description includes the requested Hasselblad H6D-100c / 85mm / volumetric lighting / skin and fabric detail guidance. This describes the intended visual brief; it does not certify how any source image was actually captured.
- The live chat endpoint currently requires an authenticated session and uses `STEWARD_BRIDGE_AGENT_WEBHOOK_URL` plus optional `STEWARD_BRIDGE_AGENT_WEBHOOK_SECRET`. Guests receive a friendly sign-in guidance response; the chat UI does not bypass API authorization.
- The project currently targets Next.js 16.2.6 / React 19, as established in the handoff; this implementation follows that existing stack rather than downgrading to Next.js 14.

## Verified vs not verified
- Source files were inserted into the v20 project archive and the integration points were updated.
- Not verified in this environment: dependency installation, TypeScript typecheck, ESLint, production build, actual browser rendering, network media URLs, webhook connectivity, and device autoplay.
- Potential first checks after download: `npm install`, `npm run typecheck`, `npm run build`. Resolve the first reported error before deployment. Do not claim build success until these commands pass.

## Files changed / added
- `src/components/ui/floating-chat.tsx` (new)
- `src/components/ui/media-mosaic.tsx` (new)
- `src/components/hrcloud/cinematic-home.tsx` (new)
- `src/app/legacy/LegacyApp.tsx` (integrated cinematic homepage and assistant)
- `src/app/page.tsx` (preserves App Router shell with integration note)
- `package.json` (adds `framer-motion`)
- `HANDOFF.md` (this continuation)

## Remaining work
1. Run install, typecheck and build on an internet-connected environment; address real errors from the first failing line.
2. Replace remote demo media with licensed, self-hosted assets and test all 18 sources.
3. Test responsive layout and reduced-motion behaviour on desktop and mobile.
4. Confirm the assistant's expected guest behaviour. The current API is authenticated-only; if guests should chat, design a rate-limited public endpoint rather than relaxing existing authorization casually.
5. Continue v20 backlog: real photos for other pages, live jobs instead of sample listings, consistent auth/workspace styling, email verification/password reset, rate limiting, employer verification, private document storage safeguards, malware scanning, backups, and README environment-variable corrections.


## v21 build fix follow-up
The previous deployment build log reported `Cannot find name 'SparkIcon'` in `src/app/legacy/LegacyApp.tsx`. The build-fix ZIP restores the small local inline icon component without changing routes, authentication, APIs, database, or the framework. The build has not been run in this environment; after import, run `npm install` and `npm run build` or run a Cloudflare preview deployment.
