# SmartBusPass — Smart Bus Pass & Tracking System

A web application that digitizes bus pass management for educational institutions, featuring QR-based passes, live GPS tracking, and a full admin dashboard.

## Prerequisites

- Node.js 18+ — https://nodejs.org (LTS version)
- MySQL 8.0 — via XAMPP (recommended for Windows): https://apachefriends.org

## Setup

1. **Start MySQL** — Open XAMPP Control Panel and start the MySQL service

2. **Create the database** — Open phpMyAdmin (`http://localhost/phpmyadmin`), click "Import", and run `db/schema.sql`

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Configure environment** — Edit `.env` and set your values:
   ```
   DB_PASSWORD=        # your MySQL password (blank for XAMPP default)
   GMAIL_USER=         # your Gmail address
   GMAIL_APP_PASSWORD= # your Gmail App Password (see below)
   ```

5. **Start the server**
   ```bash
   node server.js
   ```

6. **Open browser** — http://localhost:3000

## Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@smartbus.com | password |
| Driver | driver@smartbus.com | password |
| Passenger | Register at `/index.html` | — |

## Gmail App Password Setup

Google Account → Security → 2-Step Verification → App Passwords → Create one named "SmartBus" → paste into `.env` as `GMAIL_APP_PASSWORD`

Guide: https://support.google.com/accounts/answer/185833

## Screenshots

_Add screenshots here_

## Known Limitations

- GPS tracking uses simulated data (no real hardware required for dev)
- Payment is simulated (no real payment gateway)
- Email requires Gmail App Password to be configured
- Session store is in-memory (restarts clear sessions)
