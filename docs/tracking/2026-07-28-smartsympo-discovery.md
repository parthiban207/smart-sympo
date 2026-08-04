---
agent-notes: { ctx: "discovery tracking for smartsympo", deps: [docs/methodology/agent-notes.md, AGENTS.md], state: active, last: "cam@2026-07-28" }
---

# Discovery: SmartSympo Platform

**Date:** 2026-07-28
**Lead:** Cam
**Status:** Complete
**Prior Phase:** None

## Key Decisions
- Chose 3-role PWA architecture (Student, Coordinator, Admin) over separate native apps to ensure cross-device access and zero app-store deployment overhead.
- Chose WebSocket-driven live hall status updates over polling to ensure immediate propagation of event delays across multi-venue schedules.
- Chose JWT-signed QR pass with 24h expiration over stateful check-in tickets for cryptographic verification at hall touch points.
- Chose clash-detection engine at registration time over post-registration warning to reject overlapping time slot enrollments outright with HTTP 409.

## Artifacts Produced
- `docs/tracking/2026-07-28-smartsympo-discovery.md`
- `docs/product-context.md`

## Open Questions
- Offline queueing for coordinator QR scans if hall internet drops.
- Event delay auto-shifting vs manual schedule adjustments for downstream events.

## Next Phase
- Architecture Assessment (Phase 3)
