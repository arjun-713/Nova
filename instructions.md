# 🚌 SmartBusPass — Kiro IDE Agentic Build Prompt

> **One-shot, phase-by-phase prompt for Kiro IDE to build the full Smart Bus Pass & Tracking System.**
> Stack: Vanilla HTML/CSS/JS frontend · Node.js + Express backend · MySQL database · Session-based auth
> Target OS: **Windows laptop** — zero Docker, zero complex setup.

---

## 🧠 MASTER CONTEXT (Read Before Every Phase)

You are building the **Smart Bus Pass & Tracking System** — a web application that digitizes bus pass management for educational institutions. The system has three user roles: **Passenger/Student**, **Bus Driver**, and **Admin (Transport Dept)**.

### Core Features
- User registration & login (session-based auth, bcrypt passwords)
- Bus pass application with multi-step form
- QR code generation for approved passes
- Live bus GPS tracking on a map (simulated with mock data for dev)
- Admin dashboard: approve/reject passes, manage routes, view reports
- Driver panel: QR scanner + route view
- Email notifications (nodemailer with Gmail SMTP — no paid service)
- Automated pass expiry checker (node-cron)

### Tech Stack (Windows-friendly, minimal setup)
| Layer | Technology | Why |
|---|---|---|
| Frontend | Vanilla HTML5 + CSS3 + Vanilla JS | No build tools, runs instantly |
| Backend | Node.js + Express.js | Easy Windows install, no Java/Python needed |
| Database | MySQL 8.0 (XAMPP or standalone) | One-click Windows install via XAMPP |
| Auth | express-session + bcryptjs | No OAuth complexity |
| QR | qrcode (npm) | Simple, no API key |
| Maps | Leaflet.js (CDN) | Free, no API key required |
| Email | Nodemailer + Gmail App Password | Free, no paid SMTP |
| Scheduler | node-cron | Built-in task scheduling |

### Design Aesthetic
**NOT generic AI UI.** The design must feel like a premium transit app — dark navy + electric blue palette, sharp card borders, smooth CSS transitions, custom SVG icons for bus/routes, monospaced font for pass IDs and QR details, clean tabular data with hover states. Think: **Tokyo Metro meets a SaaS dashboard**. No purple gradients. No Inter font. Use `'DM Mono'` for data, `'Plus Jakarta Sans'` for UI text (both via Google Fonts).

---

## ⚡ PHASE 1 — Project Scaffold & Database Setup

### Goal
Create the full folder structure, install all dependencies, and set up the MySQL database schema.

### Prompt for Kiro

```
Create a Node.js + Express project called "smartbuspass" with this exact folder structure:

smartbuspass/
├── server.js                  ← Express entry point
├── package.json
├── .env                       ← Environment variables template
├── .gitignore
├── db/
│   ├── connection.js          ← MySQL pool setup
│   └── schema.sql             ← Full DB schema
├── routes/
│   ├── auth.js
│   ├── pass.js
│   ├── admin.js
│   ├── driver.js
│   └── gps.js
├── middleware/
│   ├── auth.js                ← Session auth guards
│   └── role.js                ← RBAC role check
├── controllers/
│   ├── authController.js
│   ├── passController.js
│   ├── adminController.js
│   └── gpsController.js
├── utils/
│   ├── qrGenerator.js
│   ├── mailer.js
│   └── cronJobs.js
└── public/
    ├── index.html             ← Landing / Login page
    ├── register.html
    ├── dashboard.html         ← Passenger dashboard
    ├── apply.html             ← Pass application form
    ├── track.html             ← Live bus tracking
    ├── admin/
    │   ├── dashboard.html
    │   ├── applications.html
    │   ├── routes.html
    │   └── reports.html
    ├── driver/
    │   └── scanner.html
    ├── css/
    │   ├── main.css           ← Global styles + CSS variables
    │   ├── auth.css
    │   ├── dashboard.css
    │   └── admin.css
    └── js/
        ├── main.js
        ├── auth.js
        ├── dashboard.js
        ├── apply.js
        ├── track.js
        └── admin.js

Run: npm init -y && npm install express express-session bcryptjs mysql2 qrcode nodemailer node-cron dotenv connect-flash multer

Create .env with these keys (leave values as placeholders):
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=smartbuspass
SESSION_SECRET=smartbuspass_super_secret_2025
GMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=your_app_password

Create db/schema.sql with the following tables:

-- Users table
CREATE DATABASE IF NOT EXISTS smartbuspass;
USE smartbuspass;

CREATE TABLE users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(15) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('PASSENGER', 'DRIVER', 'ADMIN') NOT NULL DEFAULT 'PASSENGER',
  is_verified TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE routes (
  route_id INT PRIMARY KEY AUTO_INCREMENT,
  route_name VARCHAR(100) NOT NULL,
  start_point VARCHAR(200) NOT NULL,
  end_point VARCHAR(200) NOT NULL,
  distance_km DECIMAL(6,2) NOT NULL,
  stops JSON,
  is_active TINYINT(1) DEFAULT 1,
  fee_amount DECIMAL(10,2) NOT NULL DEFAULT 500.00
);

CREATE TABLE bus_passes (
  pass_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  route_id INT NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  status ENUM('PENDING','APPROVED','REJECTED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  qr_code TEXT,
  approved_by INT,
  fee_amount DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (route_id) REFERENCES routes(route_id),
  FOREIGN KEY (approved_by) REFERENCES users(user_id)
);

CREATE TABLE buses (
  bus_id INT PRIMARY KEY AUTO_INCREMENT,
  bus_number VARCHAR(20) NOT NULL UNIQUE,
  route_id INT,
  driver_id INT,
  is_active TINYINT(1) DEFAULT 1,
  FOREIGN KEY (route_id) REFERENCES routes(route_id),
  FOREIGN KEY (driver_id) REFERENCES users(user_id)
);

CREATE TABLE gps_logs (
  log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  bus_id INT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  speed_kmh DECIMAL(5,2) DEFAULT 0,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bus_id) REFERENCES buses(bus_id)
);

CREATE TABLE scan_logs (
  scan_id INT PRIMARY KEY AUTO_INCREMENT,
  pass_id INT NOT NULL,
  bus_id INT,
  scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  result ENUM('VALID','INVALID','EXPIRED') NOT NULL,
  FOREIGN KEY (pass_id) REFERENCES bus_passes(pass_id)
);

CREATE TABLE payments (
  payment_id INT PRIMARY KEY AUTO_INCREMENT,
  pass_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('PENDING','COMPLETED','FAILED') DEFAULT 'PENDING',
  paid_at DATETIME,
  payment_ref VARCHAR(100),
  FOREIGN KEY (pass_id) REFERENCES bus_passes(pass_id)
);

-- Seed data: admin user (password: Admin@123), sample routes, a driver
INSERT INTO users (full_name, email, phone, password_hash, role) VALUES
('Super Admin', 'admin@smartbus.com', '9999999999', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN'),
('Test Driver', 'driver@smartbus.com', '8888888888', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'DRIVER');

INSERT INTO routes (route_name, start_point, end_point, distance_km, stops, fee_amount) VALUES
('Route A - City Express', 'Central Station', 'Tech Park Gate 1', 18.5, '["Market Square","University Road","IT Hub"]', 450.00),
('Route B - North Line', 'Railway Station', 'North Campus', 12.0, '["Bus Stand","Government Hospital","Park Junction"]', 350.00),
('Route C - South Connect', 'Airport Road', 'South Mall', 22.3, '["Electronic City","Silk Board","Adugodi"]', 550.00);

INSERT INTO buses (bus_number, route_id, driver_id) VALUES
('KA-01-BUS-001', 1, 2),
('KA-01-BUS-002', 2, 2),
('KA-01-BUS-003', 3, 2);

Note: The hashed password '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' is bcrypt for the string 'password'. We will update this in Phase 2 with real password generation.

Create db/connection.js:
const mysql = require('mysql2');
require('dotenv').config();
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});
module.exports = pool.promise();

Create server.js as a full Express server with:
- express-session configured with the SESSION_SECRET
- Static file serving from /public
- All route files imported and mounted: /api/auth, /api/pass, /api/admin, /api/driver, /api/gps
- A catch-all that serves index.html for undefined routes
- Error handling middleware
- Listen on process.env.PORT
```

### Verification Checklist
- [ ] `npm install` completes with no errors
- [ ] `node server.js` starts on port 3000
- [ ] Running `schema.sql` in MySQL creates all 7 tables
- [ ] All folders and files exist as specified

---

## ⚡ PHASE 2 — Authentication System (Backend + Frontend)

### Goal
Complete register/login/logout with session auth. Three roles work independently. All passwords bcrypt-hashed.

### Prompt for Kiro

```
Build the complete authentication system for smartbuspass.

BACKEND — routes/auth.js + controllers/authController.js:

POST /api/auth/register
- Accept: full_name, email, phone, password, role (default PASSENGER)
- Validate: email format, phone 10 digits, password min 8 chars with 1 number
- Hash password with bcryptjs (salt rounds: 10)
- Insert into users table
- Return: { success: true, message: 'Account created. You can now log in.' }
- On duplicate email/phone: return { success: false, message: 'Email or phone already registered.' }

POST /api/auth/login
- Accept: email, password
- Fetch user by email
- Compare password with bcrypt
- On success: save to req.session: { userId, fullName, email, role }
- Return: { success: true, role: 'PASSENGER'|'DRIVER'|'ADMIN', redirect: '/dashboard.html' }
- Redirect rules: ADMIN → /admin/dashboard.html, DRIVER → /driver/scanner.html, PASSENGER → /dashboard.html

POST /api/auth/logout
- Destroy session
- Return: { success: true }

GET /api/auth/me
- Return session user data or 401 if not logged in

MIDDLEWARE — middleware/auth.js:
- requireAuth: checks req.session.userId, sends 401 JSON if missing
- middleware/role.js: requireRole(...roles) checks req.session.role against allowed roles

FRONTEND — public/index.html (Login page):
Design a stunning login page with this exact visual specification:
- Full viewport, dark background: #0A0F1C (near-black navy)
- Left half (desktop): large animated SVG of a bus route — dotted line connecting 4 stops with bus icon sliding along it in a CSS loop animation. Below that: tagline "Your Pass. Your Route. Anytime." in Plus Jakarta Sans 500 weight, color #94A3B8
- Right half: login form card with:
  - Background: #111827, border: 1px solid #1E3A5F, border-radius: 16px
  - Logo at top: circle icon with bus SVG + "SmartBus" in DM Mono font, electric blue #3B82F6
  - Tab switcher: "Sign In" | "Register" — pill tabs, active tab has #3B82F6 background
  - Input fields: dark bg #1C2537, border #2D4A6B, text white, placeholder #4B6280; on focus: border becomes #3B82F6 with 0 0 0 3px rgba(59,130,246,0.15) glow
  - Password field has show/hide toggle (eye icon SVG)
  - Register form has: Full Name, Email, Phone, Password, Role selector (styled select, not default browser style)
  - Submit button: full width, #3B82F6 background, white text, 12px radius; hover: #2563EB with slight scale(1.01)
  - Error messages appear in a red pill below the form: bg #1F1010, border #EF4444, text #FCA5A5
  - Success flash: green pill
- Mobile: single column, the SVG animation hides on mobile (display:none below 768px)
- Google Fonts import: Plus Jakarta Sans (400,500,600) and DM Mono (400,500)

JS in public/js/auth.js:
- Tab switcher with smooth height transition (CSS max-height trick)
- On submit: fetch POST /api/auth/login or /api/auth/register
- Show inline error or redirect based on response
- Check /api/auth/me on page load — if already logged in, redirect to correct dashboard

public/register.html can just redirect to index.html#register
```

### Verification Checklist
- [ ] Register creates user in DB with hashed password
- [ ] Login with correct credentials sets session and redirects
- [ ] Login with wrong password returns error message shown in UI
- [ ] Logout destroys session; accessing /dashboard.html after logout shows redirect to login
- [ ] All three role logins redirect to correct pages

---

## ⚡ PHASE 3 — Passenger Dashboard & Bus Pass Application

### Goal
Build the passenger-facing experience: dashboard showing active pass + QR, and the multi-step application form.

### Prompt for Kiro

```
Build the passenger dashboard and pass application system.

BACKEND:

GET /api/pass/my-passes (requireAuth)
- Return all bus passes for the logged-in user with route details joined
- Include: pass_id, route_name, start_point, end_point, status, issue_date, expiry_date, qr_code, fee_amount

POST /api/pass/apply (requireAuth, role: PASSENGER)
- Accept: route_id, duration_months (1, 3, 6)
- Calculate expiry_date from today + duration
- Look up fee from routes table; multiply by duration factor (1x, 2.5x, 4.5x)
- Insert bus_pass with status PENDING
- Insert payment with status COMPLETED (simulate payment — no real gateway for now, just mark paid)
- Return: { success: true, passId, message: 'Application submitted. Awaiting admin approval.' }

GET /api/routes/active
- Return all routes where is_active = 1

FRONTEND — public/dashboard.html:

Design the passenger dashboard with this layout:

TOP NAVBAR (fixed, 60px tall):
- Dark bg #0A0F1C, bottom border 1px solid #1E3A5F
- Left: SmartBus logo (bus SVG icon + text)
- Center nav links: Dashboard | My Passes | Track Bus | Apply
- Right: user avatar circle (initials from name) + dropdown with "Sign Out" option
- Active link has #3B82F6 color + 2px bottom border

MAIN CONTENT (sidebar layout):
- Left sidebar (240px, fixed): navigation icons + labels, same links as navbar but vertical. Active item: #1E3A5F bg, #3B82F6 left border 3px
- Right content area: padded 32px

DASHBOARD HOME (/dashboard.html):
Section 1 — Welcome banner:
- "Good morning, [Name] 👋" in Plus Jakarta Sans 28px
- Subtitle showing active pass status or "No active pass"

Section 2 — Stats row (3 cards):
- Active Pass card: shows route name or "None"
- Expiry card: shows days remaining with a circular progress arc SVG (CSS animated stroke-dashoffset)
- Next Bus card: shows simulated ETA (random 5-15 min)
Card style: bg #111827, border #1E3A5F, 12px radius, subtle box-shadow

Section 3 — Active Pass QR Card:
- If user has an APPROVED pass:
  - Large card (max-width 480px) centered
  - Top: Route name + bus number in DM Mono
  - Center: QR code image rendered from qr_code data (use <img src="data:image/png;base64,...">)
  - Below QR: pass validity dates, pass ID in DM Mono monospace
  - Bottom: "Valid ✓" badge in green pill or "Expired" in red
  - Subtle shimmer animation on the card border (CSS @keyframes gradient border trick)
- If no approved pass: illustration placeholder + "Apply for your first pass →" CTA button

Section 4 — Recent Pass History table:
- Clean table: Pass ID | Route | Applied | Status | Action
- Status badges: PENDING=yellow pill, APPROVED=green, REJECTED=red, EXPIRED=gray
- Striped rows on hover

FRONTEND — public/apply.html (Multi-step form):

3-step wizard with progress bar at top (steps connected by line, active step circle filled #3B82F6):

Step 1 — Select Route:
- Grid of route cards (2 columns desktop, 1 mobile)
- Each card: route name large, start→end with arrow icon, distance badge, fee amount highlighted in blue
- Click to select; selected card gets blue border + checkmark

Step 2 — Select Duration:
- 3 duration options as toggle cards: 1 Month | 3 Months | 6 Months
- Show calculated total fee for each option
- Selected option gets blue border

Step 3 — Review & Confirm:
- Summary card: route, duration, fee breakdown, total
- "Pay & Submit" button (simulate payment — show a 2 second loading state then success)
- On success: confetti burst animation (pure CSS, no library) + redirect to dashboard after 2s

JS in public/js/apply.js:
- Step navigation with smooth slide animation (CSS translateX transition)
- Fetch /api/routes/active to populate route cards
- On final submit: POST /api/pass/apply, show loading, then success
```

### Verification Checklist
- [ ] Dashboard loads with correct user name
- [ ] QR code displays for approved passes
- [ ] Route cards load from database
- [ ] Multi-step form navigates forward/back
- [ ] Submission creates record in DB
- [ ] Pass history table shows all applications with correct status badges

---

## ⚡ PHASE 4 — Admin Dashboard

### Goal
Full admin panel: application queue with approve/reject, route management, user management, revenue reports.

### Prompt for Kiro

```
Build the complete admin dashboard at /admin/dashboard.html.

All admin routes require middleware: requireAuth + requireRole('ADMIN')

BACKEND routes/admin.js:

GET /api/admin/stats
- Return: { pendingApplications, totalPassesIssued, activeRoutes, totalRevenue }

GET /api/admin/applications?status=PENDING&page=1&limit=20
- Return paginated bus_pass list joined with users and routes
- Filterable by status

PUT /api/admin/applications/:passId/approve
- Set status = APPROVED
- Set issue_date = TODAY, expiry_date = expiry (stored from apply step)
- Generate QR code: JSON payload { passId, userId, routeId, expiryDate, issuedAt } → encrypt with a simple HMAC (use crypto module, key from SESSION_SECRET) → Base64 → generate QR PNG as base64 string using qrcode npm
- Save qr_code to bus_passes table
- Set approved_by = admin's userId
- TODO hook: call mailer.sendApprovalEmail(userEmail, qrBase64) — implement in Phase 6

PUT /api/admin/applications/:passId/reject
- Set status = REJECTED
- TODO: call mailer.sendRejectionEmail(userEmail)

GET /api/admin/routes
POST /api/admin/routes (add new route)
PUT /api/admin/routes/:id (edit route)
DELETE /api/admin/routes/:id (soft delete: set is_active = 0)

GET /api/admin/users?role=PASSENGER
GET /api/admin/reports?period=monthly
- Return: total passes, revenue, breakdown by route

FRONTEND — /admin/dashboard.html:

Same navbar + sidebar structure as passenger dashboard but with admin-specific links:
Sidebar items: Overview | Applications | Routes | Users | Reports

OVERVIEW PAGE:
Top row — 4 stat cards with animated count-up numbers on load:
- Pending Applications (yellow icon)
- Total Passes Issued (blue icon)  
- Active Routes (green icon)
- Total Revenue ₹ (purple icon)
Card: bg #111827, border #1E3A5F, icon in colored circle, big number in DM Mono 36px

Below stats — two columns:
Left (60%): Applications Queue — table showing 10 most recent PENDING applications
Columns: Applicant | Route | Applied Date | Fee | Actions
Actions: "Approve" button (green, small pill) + "Reject" (red, small pill)
Both trigger instant optimistic UI update (row gets success/reject animation then fades out)

Right (40%): Mini revenue chart
Use a pure CSS bar chart (no library) — 7 bars for last 7 days
Each bar: gradient #1E3A5F to #3B82F6, height proportional to daily revenue
Axis labels in DM Mono font size 11px

APPLICATIONS PAGE (/admin/applications.html):
- Full table with filters: Status dropdown + date range inputs
- Bulk action: checkbox column, "Approve Selected" button at top
- Pagination controls at bottom
- Each row expandable: click to see full applicant details inline

ROUTES PAGE (/admin/routes.html):
- Table of all routes with: Name | Start → End | Distance | Fee | Status | Actions
- "Add Route" button opens a right-side drawer (slides in from right, overlay background)
- Drawer form: route name, start, end, distance, fee, stops (comma-separated)
- Edit pencil icon opens same drawer pre-filled

JS behavior:
- All tables are rendered client-side from API data (fetch on page load)
- Approve/reject send PUT requests with optimistic UI
- Toast notification system: small pill notifications slide in from top-right
  Styles: success=green, error=red, info=blue; auto-dismiss after 3s
```

### Verification Checklist
- [ ] Admin stats cards show correct data
- [ ] Approving an application generates and stores QR code
- [ ] Rejecting updates status to REJECTED
- [ ] Route CRUD works end-to-end
- [ ] Non-admin users get 403 if they hit /api/admin/* routes

---

## ⚡ PHASE 5 — GPS Tracking & Driver Panel

### Goal
Simulated real-time bus tracking on Leaflet map (no real GPS hardware needed for dev), plus driver QR scanner.

### Prompt for Kiro

```
Build the GPS tracking system and driver panel.

BACKEND routes/gps.js:

POST /api/gps/update (requireAuth + requireRole('DRIVER', 'ADMIN'))
- Accept: bus_id, latitude, longitude, speed_kmh
- Insert into gps_logs
- Return: { success: true }

GET /api/gps/live
- For each active bus, return the LATEST gps_log entry (use MAX(recorded_at) per bus_id)
- Join with buses and routes tables
- Return array: [{ busId, busNumber, routeName, latitude, longitude, speedKmh, recordedAt }]

GET /api/gps/bus/:busId/history?hours=1
- Return gps_logs for a bus in the last N hours (for route path drawing)

POST /api/scan/validate (requireAuth + requireRole('DRIVER', 'ADMIN'))
- Accept: qr_payload (the raw QR string scanned)
- Decode the HMAC-signed payload (same key as used in admin approve)
- Extract: passId, userId, routeId, expiryDate
- Check if expiryDate >= TODAY and pass status = APPROVED
- Insert into scan_logs with result VALID or EXPIRED
- Return: { valid: true|false, passengerName, routeName, expiryDate, message }

FRONTEND — /track.html (Passenger Live Tracking):

Full-screen map page:
- Leaflet.js map via CDN, dark tile layer (use CartoDB dark tiles: https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png)
- On load: fetch /api/gps/live and place animated bus markers on map
- Bus marker: custom HTML icon — dark blue circle + bus emoji 🚌, pulsing CSS animation (scale + opacity keyframes)
- Clicking a bus marker: side panel slides in showing:
  - Bus number, route name in DM Mono
  - Current speed badge
  - Last updated time
  - "ETA to next stop: X min" (calculated: fake value for now)
- Auto-refresh GPS positions every 10 seconds using setInterval
- If no active buses: "No buses are currently active" message with illustration

BUS SIMULATION (for development — no real GPS hardware):
Add a file utils/busSimulator.js:
- On server start, start a node-cron job that runs every 10 seconds
- Simulate 3 buses moving along predefined lat/lng waypoints (hardcode 10 waypoints per bus around a city)
- Each tick: advance each bus to next waypoint, insert into gps_logs
- Buses loop back to start after reaching the last waypoint
- This means the map will show buses "moving" without any hardware

FRONTEND — /driver/scanner.html (Driver QR Scanner):

Simple, functional driver interface:
- Dark bg same as main app
- Header: "Driver Panel" + bus number + current route
- Large center area: camera viewfinder box with scanning animation (CSS animated corner brackets)
- Use jsQR library (CDN) with getUserMedia() to access camera + canvas for QR decoding
- When QR detected: POST /api/scan/validate
  - VALID: green full-screen flash + passenger name + expiry info shown for 3 seconds
  - INVALID/EXPIRED: red full-screen flash + reason message
- Manual entry fallback: text input + "Validate" button for when camera is unavailable
- Scan history: last 10 scans listed below with timestamp + result
```

### Verification Checklist
- [ ] Bus simulator creates GPS logs in DB every 10 seconds
- [ ] /track.html map shows animated bus markers that move
- [ ] Clicking a bus shows info panel
- [ ] Driver can scan a QR code and get VALID/INVALID response
- [ ] Scan is logged in scan_logs table

---

## ⚡ PHASE 6 — Notifications, Cron Jobs & Polish

### Goal
Email notifications, automated expiry checker, final UI polish, and a working README.

### Prompt for Kiro

```
Add notifications, automated jobs, and polish the full application.

NOTIFICATIONS — utils/mailer.js:

Set up nodemailer using Gmail:
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
});

Implement these email functions — all use HTML email templates (inline CSS, not boring plain text):

sendApprovalEmail(to, fullName, routeName, expiryDate, qrBase64):
- Subject: "✅ Your SmartBus Pass is Approved!"
- Body: dark-themed HTML email, show route name, validity dates, and QR image as inline base64

sendRejectionEmail(to, fullName, routeName):
- Subject: "❌ Bus Pass Application Update"
- Body: polite rejection, invite to re-apply

sendExpiryReminderEmail(to, fullName, routeName, daysLeft):
- Subject: "⚠️ Your SmartBus Pass expires in {daysLeft} days"
- Body: renewal CTA with link to /apply.html

CRON JOBS — utils/cronJobs.js:

Job 1 (daily at midnight): Pass Expiry Checker
- SELECT all bus_passes where status='APPROVED' and expiry_date < TODAY
- Update them to status='EXPIRED'
- Log count of expired passes

Job 2 (daily at 9 AM): Expiry Reminder
- SELECT passes expiring in exactly 7 days and exactly 1 day
- Call sendExpiryReminderEmail for each user

Import and start cronJobs.js in server.js

UI POLISH — Apply these global improvements:

1. public/css/main.css — add these CSS variables and global rules:
:root {
  --bg-primary: #0A0F1C;
  --bg-card: #111827;
  --bg-input: #1C2537;
  --border-default: #1E3A5F;
  --border-active: #3B82F6;
  --text-primary: #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted: #4B6280;
  --accent-blue: #3B82F6;
  --accent-green: #10B981;
  --accent-red: #EF4444;
  --accent-yellow: #F59E0B;
  --font-ui: 'Plus Jakarta Sans', sans-serif;
  --font-mono: 'DM Mono', monospace;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --transition: 0.2s ease;
}

2. Add a global page loader: on every page, show a 400ms dark overlay with SmartBus logo + spinning ring that fades out on DOMContentLoaded

3. All buttons must have: transition: all 0.2s ease; transform on :active (scale 0.97)

4. All fetch calls must show a loading skeleton (pulsing gray placeholder) while data loads

5. Add a 404.html page with a lost bus illustration (pure CSS/SVG) and "Go Home" button

6. Mobile responsiveness audit:
- Sidebar collapses to hamburger menu on < 768px
- All tables become card-stacked layout on mobile
- QR card takes full width on mobile

README — Create README.md with:
- Project overview (2 sentences)
- Prerequisites: Node.js 18+, MySQL 8.0, XAMPP (recommended for Windows)
- Setup steps (numbered, exact commands)
- How to set up Gmail App Password (link to Google's guide)
- Default login credentials for testing:
  - Admin: admin@smartbus.com / password
  - Driver: driver@smartbus.com / password
  - (Register as Passenger at /index.html)
- Screenshots placeholder section
- Known limitations section

SECURITY HARDENING (minimal, no breaking changes):
- Add helmet npm package: npm install helmet — app.use(helmet())
- Add rate limiting on login: npm install express-rate-limit — 10 attempts per 15 minutes on POST /api/auth/login
- Sanitize all DB inputs (already done via mysql2 parameterized queries — verify all controllers use ? placeholders, never string concatenation)
```

### Verification Checklist
- [ ] Emails send successfully when Gmail App Password is configured
- [ ] Cron job runs and marks expired passes (test by inserting a pass with yesterday's expiry date)
- [ ] All pages load smoothly with the page loader animation
- [ ] Mobile layout works correctly on a 375px viewport
- [ ] README setup instructions result in a working app on a fresh Windows machine
- [ ] Helmet and rate limiting active (verify with curl hitting login 11 times)

---

## 🏁 FINAL CHECKLIST — Before Calling It Done

Run through all of these before marking the project complete:

| Feature | Test |
|---|---|
| Register new passenger | Go to `/index.html`, register, verify DB row |
| Login all 3 roles | Each redirects to correct dashboard |
| Apply for bus pass | Multi-step form completes, DB record created |
| Admin approves pass | QR code generated, stored, visible on passenger dashboard |
| QR display | Dashboard shows QR image correctly |
| Driver scans QR | Returns VALID with passenger info |
| GPS simulation | Buses moving on `/track.html` map |
| Admin reports | Stats cards show correct numbers |
| Route management | Add/edit/delete routes from admin panel |
| Session security | Direct URL to admin page by passenger = redirect to login |
| Email notification | Approval email received (with Gmail config) |
| Mobile layout | All pages usable on 375px width |
| Logout | Session destroyed, all protected routes require re-login |

---

## 🛠️ Windows Setup Quick Reference

```bash
# 1. Install Node.js 18+ from https://nodejs.org (LTS version)
# 2. Install XAMPP from https://apachefriends.org — start MySQL in XAMPP Control Panel
# 3. Open XAMPP > phpMyAdmin > run db/schema.sql to create DB
# 4. Clone or extract project folder
cd smartbuspass
npm install
# 5. Edit .env — set DB_PASSWORD to your XAMPP MySQL password (usually empty)
# 6. Start the server
node server.js
# 7. Open browser: http://localhost:3000
```

> **Gmail App Password setup:** Google Account → Security → 2-Step Verification → App Passwords → Create one for "SmartBus" → paste into `.env` as `GMAIL_APP_PASSWORD`

---

*Built with ❤️ for SmartBus Pass & Tracking System — Academic Project 2025*
