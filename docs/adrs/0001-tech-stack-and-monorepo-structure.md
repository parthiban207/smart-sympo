---
agent-notes: { ctx: "adr for tech stack and project structure", deps: [AGENTS.md], state: active, last: "archie@2026-07-28" }
---

# ADR 0001: Tech Stack and Monorepo Structure for SmartSympo

**Status:** Accepted
**Date:** 2026-07-28
**Deciders:** Archie, Sato, Pat

## Context
SmartSympo requires a fast, mobile-friendly PWA frontend for Students, Coordinators, and Admins, paired with a real-time Node.js Express backend using Socket.io and MongoDB.

## Decision
We choose a decoupled monorepo structure containing `client/` (Vite + React + Tailwind CSS) and `server/` (Node.js + Express + Socket.io + Mongoose).

### Options Considered
- **Option A (Chosen):** Decoupled `client/` (Vite React SPA) + `server/` (Node Express API & Socket.io) in a single repository.
- **Option B:** Full Next.js unified app. Rejected due to socket lifecycle complexity in serverless environments.

## Consequences
### Positive
- Clear separation of concerns between client UI components and API/WebSocket server.
- Easy to run local development servers simultaneously (`npm run dev`).
- Clean mobile PWA build using Vite.

### Negative
- Requires maintaining two `package.json` files or workspace orchestration.
