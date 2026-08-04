# Implementation Plan: SmartSympo Platform

**Goal:** Build and deploy a real-time multi-venue event management and student routing PWA with automated clash detection, encrypted QR scanning, and live WebSocket hall status propagation.

## Proposed Waves & Work Packages

### Wave 1: Foundation & Backend Core Setup
- **Work Package 1.1**: Initialize monorepo structure (`client/` and `server/`), install backend dependencies (`express`, `mongoose`, `jsonwebtoken`, `socket.io`, `cors`, `dotenv`, `qrcode`).
- **Work Package 1.2**: Implement Mongoose schemas (`User`, `Event`, `Registration`, `AttendanceLog`) with compound indexes.
- **Work Package 1.3**: Implement JWT auth routes (`/api/auth/register`, `/api/auth/login`).

### Wave 2: Core Logic & Real-time Integration
- **Work Package 2.1**: Implement clash-detection registration engine in `POST /api/events/register` with HTTP 409 conflict handling.
- **Work Package 2.2**: Implement Socket.io integration & `PUT /api/coordinator/hall-status` broadcasting `hall_status_updated`.
- **Work Package 2.3**: Implement JWT QR pass generation & `POST /api/qr/verify` attendance check-in verification with duplicate prevention.
- **Work Package 2.4**: Implement `GET /api/admin/analytics` endpoint for venue occupancy and missing participant stats.

### Wave 3: Mobile-Optimized React PWA Frontend
- **Work Package 3.1**: Initialize React (Vite) client with Tailwind CSS, Lucide icons, `socket.io-client`, `html5-qrcode`, `qrcode.react`.
- **Work Package 3.2**: Build Student Mobile Dashboard (`/student`) with Profile header, Dynamic Timeline Widget, Live Alert Banner, and QR Pass modal.
- **Work Package 3.3**: Build Coordinator Touch Console (`/coordinator`) with Hall Selector, 1-Touch Control Panel (Start, Delay 10m, End), Embedded QR Camera Scanner, and Missing Students Drawer.
- **Work Package 3.4**: Build Admin Analytics Dashboard (`/admin`) with venue attendance vs capacity cards and event management forms.

### Wave 4: Launch & Verification
- **Work Package 4.1**: Launch dev servers (`npm run dev`) for client and server.
- **Work Package 4.2**: Verify full student, coordinator, and admin workflows with zero terminal/console errors.
