# Walkthrough: SmartSympo Platform (Supabase + React PWA)

**Goal:** Build a production-ready mobile-first Progressive Web Application (PWA) for **SmartSympo** using **Supabase** (PostgreSQL, Realtime Subscriptions, Database RPCs, Auth) + **React (Vite) + Tailwind CSS** with real-time listeners and QR code scanning.

---

## 🛠️ Architecture & Database DDL Setup

### Supabase Postgres Schema (`supabase/migrations/01_schema.sql`)
We created the complete SQL DDL migration file located at [01_schema.sql](file:///c:/Users/mpart/Downloads/gemini-Framework/smart%20co-ordinator/supabase/migrations/01_schema.sql) containing:
1. **`public.profiles`**: Auth extension table storing student, coordinator, and admin profiles.
2. **`public.events`**: Event titles, categories (`Technical`, `Non-Technical`), assigned hall numbers, time windows, capacity limits, status (`Scheduled`, `In Progress`, `Delayed`, `Completed`), and `delay_minutes`.
3. **`public.registrations`**: Unique compound indexing on `(student_id, event_id)`.
4. **`public.attendance_logs`**: Check-in records and duplicate scan protection.
5. **Atomic PL/pgSQL Function `register_for_event(p_student_id, p_event_id)`**: Performs server-side `OVERLAPS` time window conflict checks to reject double bookings outright.

---

## 📱 Dashboards & Features Implemented

### 1. Student Mobile Dashboard (`/student`)
- **Dynamic Timeline Agenda**: Displays registered events sorted chronologically by start time.
- **Clash-Free Registration Engine**: Atomically checks time overlaps across different halls.
- **Encrypted QR Pass Modal**: Renders dynamic encrypted QR code payload containing `{ student_id, event_id, exp: 24h }` using `qrcode.react`.
- **Real-Time Live Broadcast Banner**: Subscribes to Realtime event updates and displays immediate delay notifications across venues.

### 2. Coordinator Touch Console (`/coordinator`)
- **Hall Selector**: Toggle view by physical venue.
- **1-Touch Action Panel**: `START EVENT`, `DELAY 10 MINS`, `END EVENT` buttons updating database and propagating changes via WebSockets.
- **Embedded QR Camera Scanner**: Live door camera scanner powered by `html5-qrcode` with instant duplicate scan detection and dev simulator tool.
- **Missing Students Drawer**: Interactive drawer showing registered students not yet scanned with a 1-tap **Nudge** trigger.

### 3. Admin Analytics Dashboard (`/admin`)
- **Venue Occupancy Grid**: Cards for each venue displaying real-time attendance vs capacity fill percentages.
- **Event Creation & Mapping Form**: Allows mapping new event titles to physical halls and time slots.

---

## 📸 Verified UI Screenshots

### Encrypted Student Pass QR Modal
![Student QR Modal](file:///C:/Users/mpart/.gemini/antigravity-ide/brain/7752a64f-8cbe-478a-9267-ecdc406ac503/student_qr_modal_1785223587537.png)

### Live Hall Camera QR Scanner (Coordinator Console)
![Coordinator QR Scanner](file:///C:/Users/mpart/.gemini/antigravity-ide/brain/7752a64f-8cbe-478a-9267-ecdc406ac503/coordinator_scanner_modal_1785226456294.png)

---

## ⚡ Verification Results

- **Build Verification**: Executed `npm run build` inside `client/` — **Completed cleanly with ZERO warnings or errors**.
- **Runtime Verification**: Dev server launched at `http://localhost:5173/`. All views (`/student`, `/coordinator`, `/admin`), role-switching, QR generation, QR scanning, and live updates verified visually.

---

## 🔑 Connecting Your Live Supabase Project

To connect your live Supabase cloud project:
1. Run the SQL script from [01_schema.sql](file:///c:/Users/mpart/Downloads/gemini-Framework/smart%20co-ordinator/supabase/migrations/01_schema.sql) in your **Supabase SQL Editor**.
2. Update [client/.env](file:///c:/Users/mpart/Downloads/gemini-Framework/smart%20co-ordinator/client/.env):
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
3. Restart `npm run dev` inside `client/`.
