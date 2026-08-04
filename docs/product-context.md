<!-- agent-notes: { ctx: "human product philosophy model for smartsympo", deps: [AGENTS.md, docs/methodology/agent-notes.md], state: active, last: "pat@2026-07-28" } -->

# Product Context

**Last updated:** 2026-07-28
**Updated by:** Pat (Phase 1b Kickoff)

## Decision Philosophy
- **User Impact & Real-Time Accuracy**: Priority is placed on zero-delay status propagation and clash-free registration to prevent student schedule confusion.
- **Reliability over Unnecessary Complexity**: Direct Express REST API + Socket.io + MongoDB setup over overly complex microservice abstractions.

## Quality Bar
- **Zero Terminal & Console Errors**: Production-ready code with complete end-to-end flow validation.
- **Strict Data Integrity**: Clash detection validation must be enforced on the backend, not relied upon solely on the frontend.
- **Responsive Mobile First PWA UI**: Touch-friendly coordinator tools, immediate visual status badges for students.

## Scope Style
- **Start Core & Ship Whole**: Implement full PRD requirements (Student Mobile Dashboard, Coordinator Touch Console, Admin Analytics Dashboard, QR generator/scanner, real-time WebSockets) cleanly in Milestone 1.

## User Model
- **Student**: Needs instant visibility of their schedule, clear venue routing alerts, and hassle-free QR pass check-in.
- **Coordinator**: Needs 1-touch hall management buttons (Start, Delay, End), reliable mobile camera QR scanning, and quick visibility of missing students.
- **Admin**: Needs macro view of venue occupancy and missing participants to manage room capacity.

## Non-Negotiables
- Duplicate check-ins must be prevented cryptographically and logged accurately.
- Overlapping registrations for different halls must be rejected with HTTP 409.

## Correction Log
| Date | What Changed | Reason |
|------|-------------|--------|
| 2026-07-28 | Initial creation | Kickoff Phase 1b product model setup |
