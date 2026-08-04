---
agent-notes: { ctx: "initial threat model for smartsympo", deps: [AGENTS.md, docs/adrs/0004-jwt-qr-code-verification-system.md], state: active, last: "pierrot@2026-07-28" }
---

# Threat Model: SmartSympo Platform

**Last Updated:** 2026-07-28  
**Lead:** Pierrot  

## STRIDE Threat Analysis

### 1. Spoofing
- **Risk:** Unauthenticated user forging student JWT token or QR pass.
- **Mitigation:** Enforce strong `JWT_SECRET` for signing tokens, verify signature on backend for every restricted REST call & QR verification.

### 2. Tampering
- **Risk:** Student altering event ID or student ID in QR payload.
- **Mitigation:** JWT signature verification rejects modified payloads immediately with HTTP 401/403.

### 3. Repudiation
- **Risk:** Student claiming they were not marked present or coordinator marking unauthorized entry.
- **Mitigation:** Immutable `AttendanceLog` records storing `checkInTime`, `studentId`, `eventId`, and `hallNumber`.

### 4. Information Disclosure
- **Risk:** Exposing user emails/phone numbers in public endpoints.
- **Mitigation:** Sanitize user payloads; restrict user directory access to Admin role.

### 5. Denial of Service
- **Risk:** Flooding registration endpoint `POST /api/events/register` or Socket.io connections.
- **Mitigation:** Express rate limiting on API endpoints, compound database indexing on `(studentId, eventId)`.

### 6. Elevation of Privilege
- **Risk:** Student calling `PUT /api/coordinator/hall-status` or `/api/admin/analytics`.
- **Mitigation:** Role-Based Access Control (RBAC) middleware verifying JWT user `role` (`student`, `coordinator`, `admin`).
