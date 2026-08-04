---
agent-notes: { ctx: "test strategy for smartsympo", deps: [AGENTS.md], state: active, last: "tara@2026-07-28" }
---

# Test Strategy: SmartSympo Platform

**Lead:** Tara  

## 1. Unit & Integration Testing Strategy
- **Backend (Express + Mongoose)**:
  - Test registration clash logic with overlapping & non-overlapping event time slots.
  - Test JWT generation and signature verification.
  - Test attendance logging & duplicate check-in prevention logic.
- **Frontend (React Components)**:
  - Test render state of Student Timeline Widget.
  - Test Coordinator touch buttons (Start, Delay 10 Mins, End).
  - Test Admin analytics cards.

## 2. Real-Time & End-to-End Verification
- Test Socket.io event emission and reception (`hall_status_updated`).
- Verify full client/server dev server launch and browser routing (`/student`, `/coordinator`, `/admin`).
