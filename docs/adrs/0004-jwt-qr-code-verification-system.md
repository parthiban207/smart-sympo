---
agent-notes: { ctx: "adr for encrypted jwt qr pass verification", deps: [AGENTS.md], state: active, last: "archie@2026-07-28" }
---

# ADR 0004: Encrypted JWT QR Code Pass Verification System

**Status:** Accepted
**Date:** 2026-07-28
**Deciders:** Archie, Pierrot, Sato, Wei

## Context
Coordinators scan student passes at hall doors. The pass must prove registration authenticity, prevent forgery, and block duplicate entry check-ins.

## Decision
1. Student Pass renders a QR code encoded with a JWT payload containing `{ studentId, eventId, exp: 24h }` signed with `JWT_SECRET`.
2. Coordinator scans QR via phone camera (`html5-qrcode`).
3. Backend endpoint `POST /api/qr/verify` verifies JWT signature, checks `AttendanceLogs` for existing check-in to prevent duplicates, and logs attendance.

## Consequences
### Positive
- Stateless pass generation — no complex pass database required.
- Tamper-proof: forgery rejected via JWT signature check.
- Duplicate prevention enforced by Mongoose unique indexing / query logic in `AttendanceLogs`.

### Negative
- Shared secret `JWT_SECRET` must be securely stored in backend `.env`.
