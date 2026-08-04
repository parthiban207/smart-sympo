---
agent-notes: { ctx: "code map for smartsympo project structure and data flow", deps: [AGENTS.md], state: active, last: "archie@2026-07-28" }
---

# Code Map: SmartSympo Platform

## Project Overview
SmartSympo is a Real-Time Multi-Venue Event Management & Student Routing Platform built as a monorepo with `server/` (Node Express + Socket.io + Mongoose) and `client/` (React + Vite + Tailwind CSS).

## Directory Structure
```
.
├── server/                   # Backend Node/Express API & Socket.io
│   ├── config/               # Database & env config
│   ├── controllers/          # Auth, Events, QR, Analytics controllers
│   ├── middleware/           # Auth & RBAC middleware
│   ├── models/               # Mongoose schemas (User, Event, Registration, AttendanceLog)
│   ├── routes/               # API routes
│   └── server.js             # Express app & Socket.io server entry point
├── client/                   # Frontend React (Vite) PWA
│   ├── src/
│   │   ├── components/       # Timeline, Alert Banner, QR Scanner, Pass Modal, Drawers
│   │   ├── pages/            # StudentDashboard, CoordinatorConsole, AdminAnalytics
│   │   ├── context/          # Auth & Socket context providers
│   │   ├── App.jsx           # Main routing entry point
│   │   └── main.jsx          # React DOM root
│   └── vite.config.js        # Vite configuration
└── docs/                     # Documentation, ADRs, tracking, plans
```

## Data Flow & Architecture
1. **Authentication**: Users register/login at `POST /api/auth/*` and receive a JWT token stored client-side.
2. **Registration & Clash Engine**: `POST /api/events/register` queries existing student registrations for time overlaps across different halls. Rejects overlaps with `HTTP 409 Conflict`.
3. **Real-time Delay Broadcast**: Coordinator actions at `PUT /api/coordinator/hall-status` update MongoDB `Event` records and emit Socket.io `hall_status_updated` events to all connected clients.
4. **QR Attendance**: Student pass renders a JWT signed payload (`{ studentId, eventId, exp }`). Coordinator camera scans QR and posts to `POST /api/qr/verify` to log attendance and prevent duplicate entry.
