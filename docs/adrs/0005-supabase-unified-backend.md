---
agent-notes: { ctx: "adr for supabase unified backend architecture", deps: [AGENTS.md], state: active, last: "archie@2026-07-28" }
---

# ADR 0005: Supabase Unified Backend Architecture

**Status:** Accepted
**Date:** 2026-07-28
**Deciders:** Archie, Sato, Pat, Wei

## Context
The user updated requirements to use Supabase as the unified backend (PostgreSQL database, Realtime subscriptions, Auth, and Database PL/pgSQL RPCs) paired with a React + Vite + Tailwind CSS frontend.

## Decision
1. Use Supabase PostgreSQL with 4 primary tables (`profiles`, `events`, `registrations`, `attendance_logs`).
2. Implement server-side atomic clash detection via PostgreSQL function `register_for_event(p_student_id, p_event_id)` with `OVERLAPS` check.
3. Use Supabase Realtime client channel subscription for zero-latency live hall status updates (`events` table updates).
4. Use Supabase Auth for student, coordinator, and admin role authentication.

## Consequences
### Positive
- Single managed cloud/local backend providing Auth, Postgres DB, RPCs, and Realtime WebSocket subscriptions out of the box.
- Atomic SQL transaction guarantees for clash detection.
- Simple client architecture via `@supabase/supabase-js`.

### Negative
- Client code relies on Supabase client setup (`src/supabaseClient.js`) with fallback mock mode for offline/local standalone development.
