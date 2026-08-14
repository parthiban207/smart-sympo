---
name: deploy
description: Automated deployment, environment verification, and release health check workflow for web applications and SmartSympo
---

<!-- agent-notes: { ctx: "deployment & post-deployment verification workflow", deps: [AGENTS.md, .agents/agents/ines/agent.md, .agents/agents/pierrot/agent.md], state: active, last: "ines@2026-08-08" } -->
Deploy application to target environment: $ARGUMENTS

This workflow orchestrates end-to-end deployment: pre-flight code and build verification, environment & secrets auditing, database migration checks, hosting platform deployment, and post-deployment verification (PDV).

---

## Step 0: Pre-Flight & Build Audit (Ines + Sato)

Before deploying to staging or production, ensure code quality and build integrity:

1. **Lint & Type Check**:
   - Run workspace linting (`npm run lint`).
   - Confirm zero linter or TypeScript compilation errors.
2. **Production Build Verification**:
   - Execute production build (`npm run build`).
   - Confirm static bundle generation succeeds without breaking warnings or errors.
3. **Automated Test Suite**:
   - Run unit and integration tests (`npm run test` or framework test runner).
   - Ensure all automated tests pass cleanly.

---

## Step 1: Environment & Secrets Audit (Ines + Pierrot)

Audit infrastructure configuration, secrets, and database sync status:

1. **Configuration & Secrets Verification**:
   - Compare environment variables against `.env.example` and `docs/config-manifest.md`.
   - Verify required secrets (e.g. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, production API credentials) are properly configured in hosting provider settings or environment vault.
   - Audit code for any accidentally committed API keys or credentials.
2. **Database & Schema Synchronization**:
   - Inspect pending migrations in `supabase/migrations/` (or database migration directory).
   - Apply schema updates using target DB tool (`supabase db push` / `supabase migration up` or database CLI) if required.
3. **Target Environment Selection**:
   - Confirm whether target is **Production** or **Staging / Preview**.

---

## Step 2: Platform Deployment Execution

Execute deployment for the project's hosting platform:

### Option A: Vercel (Recommended for Next.js / Vite React)
```bash
# Production Deployment
npx vercel --prod

# Preview / Staging Deployment
npx vercel
```

### Option B: Netlify
```bash
# Production Deployment
npx netlify deploy --prod

# Staging Deployment
npx netlify deploy
```

### Option C: Cloudflare Pages
```bash
# Deploy directory to Cloudflare Pages
npx wrangler pages deploy client/dist --project-name smart-sympo
```

### Option D: GitHub Pages / Static Export
```bash
# Build static bundle and trigger workflow or gh-pages push
npm run build
```

### Option E: Containerized / Docker Deployment
```bash
# Build immutable container image tagged with commit SHA
docker build -t app:$(git rev-parse --short HEAD) .
docker tag app:$(git rev-parse --short HEAD) app:latest
# Push to container registry and roll out service
```

---

## Step 3: Post-Deployment Verification (PDV Checklist)

Immediately following deployment execution, run the SRE Post-Deployment Verification checklist:

1. **Health Check**:
   - Ping deployed live URL endpoint (HTTP status check).
   - Verify `200 OK` response status.
2. **Smoke Test Critical User Flows**:
   - Verify landing page load, routing, and component mounting.
   - Test Supabase / backend connectivity and authentication endpoints.
3. **Console & Runtime Error Audit**:
   - Inspect browser console output and platform deployment log stream for unhandled runtime exceptions.
4. **Performance & Asset Verification**:
   - Confirm static asset delivery, caching headers, and asset bundle load speed.

---

## Step 4: Done Gate & Status Reporting

1. **Rollback Readiness**:
   - Verify previous deployment hash or release commit is accessible for instant rollback if issues emerge.
2. **Release Logging**:
   - Document release details in `CHANGELOG.md` or release note artifact (commit SHA, timestamp, environment).
3. **Summary to User**:
   - Present live URL, deployment environment, build verification status, and PDV results.
