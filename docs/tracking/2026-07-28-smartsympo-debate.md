---
agent-notes: { ctx: "adversarial debate tracking for smartsympo architecture", deps: [docs/adrs/0001-tech-stack-and-monorepo-structure.md, docs/adrs/0002-clash-detection-registration-engine.md, docs/adrs/0003-websocket-hall-status-propagation.md, docs/adrs/0004-jwt-qr-code-verification-system.md], state: active, last: "wei@2026-07-28" }
---

# Architecture Adversarial Debate: SmartSympo

**Date:** 2026-07-28  
**Challenger:** Wei  
**Defender:** Archie  
**Outcome:** All ADRs challenged and validated with mitigations.

## Debate Topics

### 1. ADR 0002: Registration Time-Slot Clash Detection
- **Wei's Challenge:** Querying existing student registrations sequentially on every registration write might create database lock contention during mass registration rushes.
- **Archie's Response:** We use compound index on `(studentId, eventId)` and query indexed fields (`startTime`, `endTime`, `hallNumber`). Max symposium scale is ~5,000 students, which MongoDB easily handles in-memory without contention.

### 2. ADR 0003: Socket.io Real-Time Broadcasting
- **Wei's Challenge:** What happens if a student mobile web browser goes into background mode or loses socket connection when a hall update is emitted?
- **Archie's Response:** Socket.io client automatically reconnects on focus. On reconnect, client triggers `GET /api/student/agenda` to fetch the authoritative DB state, ensuring sync.

### 3. ADR 0004: JWT QR Code Verification
- **Wei's Challenge:** If a student screenshots their QR code and sends it to a friend, can both enter?
- **Archie's Response:** `AttendanceLogs` enforces single check-in status per `(studentId, eventId)`. Once scanned once, subsequent scans trigger HTTP 400 "Student already checked in".
