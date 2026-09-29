# 📘 SmartSympo 2026: Comprehensive System Documentation & Technical Demo Guide

> **Document Version:** 2.4.0  
> **Target System:** SmartSympo 2026 — Real-Time Multi-Venue Event Management & Student Routing Platform  
> **PDF Report Location:** [`docs/SmartSympo_Project_Documentation.pdf`](file:///home/parthi/smart-sympo/docs/SmartSympo_Project_Documentation.pdf)  
> **Authors:** SmartSympo Core Engineering Team  

---

## 1. Executive Summary & Problem Analysis

Traditional college symposiums suffer from severe operational friction:
* **Double-Bookings & Schedule Collisions:** Delegates register for competing tracks occurring at the exact same hour across distant blocks, leading to unpredicted drop-offs and empty auditoriums.
* **Door Check-in Queues & Proxy Scans:** Paper roll calls cause 20–30 minute gate bottlenecks. Static ticket screenshots enable unauthorized pass-sharing.
* **Notification Latency:** Venue relocations or delayed speaker sessions take too long to propagate, causing empty halls while students wait outside.
* **Campus Disorientation:** External delegates waste time finding specific laboratories or auditoriums across expansive multi-acre college grounds.
* **Coordinator Blindspots:** Department faculty have no real-time telemetry on hall fill-rates or missing registered participants.

### The SmartSympo Solution
SmartSympo unifies all symposium operations into an instantaneous, reactive web environment. Built with mobile-first ergonomics, it provides automated conflict-free registrations, dynamic QR door scanning with duplicate detection, real-time stage delay propagation via WebSockets, and "You Are Here" QR landmark campus navigation.

---

## 2. System Architecture & Component Design

```
+---------------------------------------------------------------------------------+
|                       CLIENT TIER: React 18 + Vite PWA                         |
|  - Student Dashboard (/student)       - Coordinator Console (/coordinator)     |
|  - QR Camera Scanner (/scanner)       - Admin Analytics (/admin)               |
|  - Campus Geonavigation (/navigation) - AI Chatbot & Live Alert Banner         |
+-----------------------+----------------------------------+----------------------+
                        |                                  |
            PostgreSQL Realtime (CDC)                 REST / Health APIs
                        |                                  |
                        v                                  v
+---------------------------------------+  +--------------------------------------+
|       DATABASE & AUTH TIER            |  |         MICROSERVICE LAYER           |
|         (Supabase Cloud)              |  |         (Express Node.js)            |
|  - PostgreSQL 15 Engine               |  |  - Port 5000                         |
|  - Row Level Security (RLS)           |  |  - Gmail SMTP Nodemailer Gateway     |
|  - PL/pgSQL Atomic Conflict Checking  |  |  - Welcome & Registration Emails     |
|  - Realtime WebSocket Channels        |  |  - WhatsApp & SMS Relay Endpoints    |
+---------------------------------------+  +--------------------------------------+
```

### Architectural Highlights
1. **Presentation Tier:** React 18 single-page application built on Vite, with Tailwind CSS styling, HTML5-QRCode camera processing, and Leaflet vector map rendering.
2. **State & Realtime Engine:** Managed via [`AppContext.jsx`](file:///home/parthi/smart-sympo/client/src/context/AppContext.jsx). Subscribes directly to PostgreSQL Change Data Capture (CDC) events via WebSockets, ensuring UI state updates in < 120ms without page reloads.
3. **Resilient Dual-Mode Fallback:** Automatically operates in live cloud mode when Supabase credentials are configured, but seamlessly falls back to persistent LocalStorage and synthetic UUID generation when operating in offline/demo environments.
4. **Hardware-Level Feedback:** Incorporates Web Audio API frequency synthesizers (880Hz success chime, 350Hz duplicate buzz) and browser Vibration API haptics for noisy auditorium door control.

---

## 3. Database Schema & Data Integrity

Defined in [`supabase/migrations/01_schema.sql`](file:///home/parthi/smart-sympo/supabase/migrations/01_schema.sql):

### Core Relational Tables
| Table | Primary Keys & Indexes | Description & Constraints |
| :--- | :--- | :--- |
| `public.profiles` | `id` (UUID -> `auth.users`) | Stores user metadata: role (`student`, `coordinator`, `admin`), roll number, college name, and first login status. |
| `public.events` | `id` (UUID) | Event catalog specifying title, category, assigned `hall_number`, start/end timestamps, capacity limits, and `delay_minutes`. |
| `public.registrations` | `id` (UUID), `UNIQUE(student_id, event_id)` | Event booking records. Compound unique constraint prevents multiple bookings of the same event. |
| `public.attendance_logs` | `id` (UUID), `INDEX(event_id, student_id)` | Immutable door scan log recording verification timestamps and coordinator IDs. |

### Clash-Free Atomic Stored Procedure
```sql
CREATE OR REPLACE FUNCTION register_for_event(p_student_id UUID, p_event_id UUID)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_conflict_id UUID;
BEGIN
  -- 1. Fetch Target Event Times
  SELECT start_time, end_time INTO v_start, v_end FROM public.events WHERE id = p_event_id;

  -- 2. Detect Time Overlaps Against User's Existing Bookings
  SELECT e.id INTO v_conflict_id
  FROM public.registrations r
  JOIN public.events e ON e.id = r.event_id
  WHERE r.student_id = p_student_id
    AND (v_start, v_end) OVERLAPS (e.start_time, e.end_time);

  IF v_conflict_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'TIME_CLASH_DETECTED');
  END IF;

  -- 3. Atomically Insert Registration
  INSERT INTO public.registrations(student_id, event_id) VALUES (p_student_id, p_event_id);
  RETURN jsonb_build_object('success', true);
END;
$$;
```

---

## 4. Role Dashboards & Functional Capabilities

### A. Student Portal (`/student`)
* **Dynamic Agenda:** Chronologically ordered symposium sessions with live status chips (`Scheduled`, `In Progress`, `Delayed`, `Completed`).
* **Conflict-Free Engine:** Validates new event registrations against existing bookings in real time, preventing overlapping session attendance.
* **Encrypted QR Pass:** Dynamic badge encoding `{ student_id, event_id, pass_code, exp: 24h }` with anti-tamper passcodes and visual counters.
* **Session Details & Feedback:** Access speaker bios, venue capacity, and submit post-event feedback.

### B. Coordinator Console (`/coordinator` & `/scanner`)
* **Hall Selector:** Multi-venue switchboard allowing coordinators to manage their designated hall.
* **1-Touch Lifecycle Buttons:** Instant event controls (`START EVENT`, `DELAY 10 MINS`, `END EVENT`) updating the database and broadcasting across all devices via WebSockets.
* **Door Camera Scanner:** High-speed barcode parser with anti-passback defense (amber warning buzz on duplicate scans).
* **Missing Students Drawer:** Live roster of non-checked-in attendees with 1-click nudge broadcast triggers.

### C. Admin Operations & Analytics (`/admin`)
* **Venue Occupancy Heatmap:** Live telemetry tracking hall capacity vs real-time check-in counts.
* **Event Creation & Hall Allocation:** Form to map new symposium events to physical halls and set capacity caps.
* **System-Wide Emergency Siren:** Instant priority broadcast across all halls with admin-only clearing authority.
* **Roster Export:** 1-click export of verified attendance data to Excel (`.xlsx`) and CSV formats.

---

## 5. Campus Wayfinding & Landmark Scanner

Implemented in [`CampusMap.jsx`](file:///home/parthi/smart-sympo/client/src/components/CampusMap.jsx) and [`LandmarkScannerModal.jsx`](file:///home/parthi/smart-sympo/client/src/components/LandmarkScannerModal.jsx):
1. **Interactive Campus Map:** Renders GPS boundaries, building polygons, parking areas, and department blocks using Leaflet and OpenStreetMap.
2. **"You Are Here" QR Landmark Scanning:** Physical QR stickers placed on corridor pillars and main gates allow attendees to scan and pinpoint their exact location on the map.
3. **Dynamic Directional Polyline:** Calculates and draws an illuminated vector route leading directly to the attendee's target venue.
4. **Printable Badge Generator:** Allows event organizers to export printable QR badges for campus pillars with one click.

---

## 6. Comprehensive Technical Demo Script

| Phase | Action & Narrative | Technical Capability Demonstrated |
| :--- | :--- | :--- |
| **1. Authentication** | Open `http://localhost:5173`. Point out quick-login credentials for Student, Coordinator, and Admin. Log in as Student. | Multi-role authentication & session routing. |
| **2. Clash-Free Registration** | Register for *Keynote Address*. Attempt to register for a second event in the same time slot; highlight the rejection warning. Open *View QR Pass*. | PostgreSQL `OVERLAPS` conflict check; encrypted dynamic QR generation. |
| **3. Door Check-in & Anti-Passback** | Switch to Coordinator console. Open Door Scanner (`/scanner`). Scan the student QR code: hear the 880Hz chime and see the counter increment. Scan again: hear the warning buzz and see the duplicate entry flag. | Camera stream processing; Web Audio synthesizers; anti-passback duplicate protection. |
| **4. Real-Time Delay Propagation** | In Coordinator console, click `+10 Minute Delay`. Switch to Student screen: observe the live alert banner appear in < 120ms without page refresh. | PostgreSQL Change Data Capture (CDC) Realtime WebSockets. |
| **5. Campus Wayfinding** | Open `/navigation`. Open Landmark Scanner Modal, select a campus pillar, and watch the map orient to "You Are Here" and draw the route line. | Vector map rendering & QR-assisted spatial localization. |
| **6. Emergency Broadcast** | In Admin dashboard, open Emergency Broadcast Modal, type an alert, and trigger it. Observe the red siren banner across all active screens. Clear it using Admin authority. | Role-based authorization & system-wide broadcast dispatch. |

---

## 7. Execution & Deployment Guide

### Environment Setup
Create `client/.env` and `server/.env`:
```env
# client/.env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# server/.env
PORT=5000
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-16-char-app-password
```

### Commands
```bash
# Launch unified dev runner
npm run dev

# Launch client independently (http://localhost:5173)
npm run dev:client

# Launch notification server independently (port 5000)
npm run server

# Re-generate the documentation PDF at any time
node scripts/generate_documentation_pdf.js
```
