---
agent-notes: { ctx: "adr for real-time websocket hall status propagation", deps: [AGENTS.md], state: active, last: "archie@2026-07-28" }
---

# ADR 0003: WebSocket Real-Time Hall Status Propagation

**Status:** Accepted
**Date:** 2026-07-28
**Deciders:** Archie, Sato, Wei

## Context
When a coordinator delays or starts an event, student agendas must update instantly without manual page refreshes.

## Decision
Use Socket.io server integrated with Express HTTP server. When `PUT /api/coordinator/hall-status` is called:
1. Update MongoDB `Event` document status & `delayMinutes`.
2. Emit Socket.io event `hall_status_updated` payload `{ eventId, hallNumber, status, delayMinutes }`.
3. All connected mobile clients receive event broadcast and immediately update UI state and notification banner.

## Consequences
### Positive
- Near zero latency updates (<50ms) across all student mobile dashboards.
- Reduces polling load on HTTP REST API.

### Negative
- Requires maintaining persistent WebSocket connections per active client.
