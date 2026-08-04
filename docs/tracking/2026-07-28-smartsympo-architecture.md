---
agent-notes: { ctx: "architecture tracking for smartsympo", deps: [docs/tracking/2026-07-28-smartsympo-discovery.md, AGENTS.md], state: active, last: "archie@2026-07-28" }
---

# Architecture: SmartSympo Platform

**Date:** 2026-07-28  
**Lead:** Archie  
**Status:** Complete  
**Prior Phase:** [Discovery](file:///c:/Users/mpart/Downloads/gemini-Framework/smart%20co-ordinator/docs/tracking/2026-07-28-smartsympo-discovery.md)

## Key Decisions
- Chose decoupled `client/` and `server/` structure to isolate Express API/Socket.io backend from Vite React PWA frontend.
- Chose server-side atomic clash detection with HTTP 409 response for overlapping multi-hall event registrations.
- Chose Socket.io broadcast event `hall_status_updated` for instant agenda sync on event delay/status change.
- Chose encrypted 24h JWT payload rendered as QR code with backend attendance log verification.

## Artifacts Produced
- `docs/adrs/0001-tech-stack-and-monorepo-structure.md`
- `docs/adrs/0002-clash-detection-registration-engine.md`
- `docs/adrs/0003-websocket-hall-status-propagation.md`
- `docs/adrs/0004-jwt-qr-code-verification-system.md`
- `docs/security/threat-model.md`
- `docs/performance-budget.md`
- `docs/tracking/2026-07-28-smartsympo-debate.md`

## Open Questions
- None. All architectural decisions validated via adversarial debate.

## Next Phase
- Acceptance Criteria & Scope (Phase 4) & Implementation Plan / Board Setup (Phase 5)
