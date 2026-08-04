---
agent-notes: { ctx: "adr for registration clash detection engine", deps: [AGENTS.md], state: active, last: "archie@2026-07-28" }
---

# ADR 0002: Clash-Detection Registration Engine

**Status:** Accepted
**Date:** 2026-07-28
**Deciders:** Archie, Tara, Sato, Wei

## Context
Students register for multiple events across technical and non-technical tracks. If time slots overlap across different halls, double booking occurs, causing venue confusion.

## Decision
We enforce server-side atomic clash detection inside `POST /api/events/register`. Before saving a new registration:
1. Query existing registrations for `studentId`.
2. Fetch event time ranges (`startTime`, `endTime`) and `hallNumber`.
3. Compare new event's `[startTime, endTime]` against existing registered events.
4. If time slots overlap AND `hallNumber` differs, reject with HTTP 409 Conflict: `"Time slot conflicts with another registered event in Hall X."`

### Options Considered
- **Option A (Chosen):** Server-side rejection with HTTP 409 Conflict on overlap across different halls.
- **Option B:** Client-side only check. Rejected because client data can be stale or bypassed.

## Consequences
### Positive
- Prevents double-booking completely at database transaction / query time.
- Clear error feedback to student dashboard.

### Negative
- Requires extra query overhead per registration request.
