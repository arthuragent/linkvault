# Plan: LinkVault — Google Sign-In + GA4

## Problem
LinkVault has zero auth. Any visitor can see/use the app. It needs Google OAuth login + GA4 analytics.

## Production URL
`https://linkvault-opal.vercel.app/`
OAuth callback: `https://linkvault-opal.vercel.app/api/auth/callback/google`

## GCP Project
`pzlaw-crm-auth` (already exists, shared across projects)

---

## Phase 1 — Auth.js v5 + Google Sign-In

### 1.1 Install dependencies
```bash
npm install next-auth@beta @auth/drizzle-adapter google-auth # or @auth/core for google provider
# Auth.js v5 uses: npm install next-auth@beta
```

### 1.2 Auth schema (new file: `auth/schema.ts`)
- Re-export existing `links`, `categories` schema
- Add Auth.js adapter tables to EXISTING `lib/schema.ts`:
  - `users` (id, name, email, emailVerified, image)
  - `accounts` (userId, type, provider, providerAccountId, refresh_token, access_token, expires_at, token_type, scope, id_token, session_state)
  - `sessions` (sessionToken, userId, expires)
  - `verification_tokens` (identifier, token, expires)
  - Use same neon/drizzle adapter as pzlaw-crm

### 1.3 Auth config (new file: `auth.config.ts`)
- `session: { strategy: "jwt" }`
- Pages: `signIn: "/login"`, `verifyRequest: "/login/verify"`
- Allowlist via `ALLOWED_EMAILS` env var (comma-separated)
- Callbacks: `signIn` checks allowlist

### 1.4 Auth handlers (new file: `auth.ts`)
- Import `Google` provider from `next-auth/providers/google`
- Export `handlers`, `auth`, `signIn`, `signOut`

### 1.5 API route: `app/api/auth/[...nextauth]/route.ts`
```ts
export { GET, POST } from "@/auth"
```

### 1.6 Middleware: `middleware.ts`
- Protect all routes except `/login`, `/api/auth/*`, `/api/links` (read-only GET OK)
- Export `auth` as named export, use `auth((req) => { ... })` pattern

### 1.7 Login page: `app/login/page.tsx`
- Clean centered card
- "Sign in with Google" button (Google SVG + text)
- No email/password — Google OAuth only
- After sign-in → redirect to `/`

---

## Phase 2 — GA4 Analytics

### 2.1 Create GA4 property via Admin API
Using gcloud/token:
```bash
# Get token
TOKEN=$(gcloud auth print-access-token)
# Create property under existing account
curl -sS -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  'https://analyticsadmin.googleapis.com/v1beta/properties' \
  -d '{"parent":"accounts/<account-id>","displayName":"LinkVault","timeZone":"UTC","currencyCode":"USD"}'
```

### 2.2 Create web stream
```bash
curl -sS -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  'https://analyticsadmin.googleapis.com/v1beta/properties/<property-id>/dataStreams' \
  -d '{"displayName":"LinkVault Web","type":"WEB_DATA_STREAM","webStreamData":{"defaultUri":"https://linkvault-opal.vercel.app"}}'
```

### 2.3 Add to root layout `app/layout.tsx`
```tsx
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXX" />
<script dangerouslySetInnerHTML={{ __html: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXX');
` }} />
```

### 2.4 Track events
- `page_view` — automatic with GA tag
- `login` with `auth_method: "google"` — in auth callback/sign-in handler
- `sign_up` with `auth_method: "google"` — on first-time sign-in
- `auth_method_selected` with `method: "google"`

---

## Phase 3 — GCP OAuth Client (Firecrawl)

### 3.1 Check Firecrawl my-profile session
```bash
firecrawl profiles list 2>&1 | grep my-profile
```

### 3.2 Scrape GCP credentials page
```bash
firecrawl scrape \
  "https://console.cloud.google.com/apis/credentials?project=pzlaw-crm-auth" \
  --profile my-profile \
  -o ~/.openclaw/workspace-arthur/.firecrawl/linkvault-gcp-credentials.json \
  --json
```

### 3.3 Navigate to Google Auth Platform → Create OAuth Client
- App name: `LinkVault`
- Callback URL: `https://linkvault-opal.vercel.app/api/auth/callback/google`
- Support email: arthurzlotagent@gmail.com

### 3.4 Capture `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`

---

## Vercel Env Vars Needed
```
AUTH_SECRET=<random 32+ char secret — generate with: openssl rand -base64 32>
AUTH_GOOGLE_ID=<CLIENT_ID from GCP>
AUTH_GOOGLE_SECRET=<CLIENT_SECRET from GCP>
ALLOWED_EMAILS=<comma-separated emails — e.g. roizlotolov@gmail.com,arthurzlotagent@gmail.com>
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX
```

---

## Acceptance Criteria
- [ ] `/login` shows Google sign-in button
- [ ] Clicking "Sign in with Google" → Google OAuth flow → returns to app as logged-in user
- [ ] Unauthenticated users hitting `/` get redirected to `/login`
- [ ] GA4 tag loads on every page
- [ ] `login` event fires on successful Google sign-in
- [ ] `sign_up` event fires on first-time sign-in
- [ ] All env vars set in Vercel project settings

## Edge Cases
- Email not in allowlist → sign-in rejected, show error
- GA4 token/project not accessible → graceful degradation (no crash)
- Existing DB tables conflict → use IF NOT EXISTS or separate auth schema

## Repo
`/home/alfred/linkvault` — git push after each phase