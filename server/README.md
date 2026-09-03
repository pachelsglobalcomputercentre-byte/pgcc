# PGCC Institute — Backend (Node.js + Express + MongoDB)

Handles admission applications, login (with 2FA for admins), and
Flutterwave payment verification. No Firebase involved — genuinely
free, no card required anywhere in this stack.

## 1. One-time setup

**MongoDB (free, no card):**
1. Create an account at [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)
2. "Build a Database" → **M0 Free** tier → any provider/region → Create
3. Database Access → add a database user (pick a username + password)
4. Network Access → "Allow access from anywhere" (`0.0.0.0/0`) — fine for now, can be tightened later
5. Connect → Drivers → copy the connection string
6. Paste it into `server/.env` as `MONGODB_URI`, replacing `<password>` with your database user's password

**Everything else** (Gmail, Flutterwave, JWT secret) is already filled in `server/.env`.

## 2. Install and run locally

```bash
cd server
npm install
npm start
```

You should see:
```
✓ MongoDB connected
✓ PGCC Institute API running on port 5000
```

## 3. Create the admin account (run once)

```bash
npm run seed-admin
```

This creates the `universalosasgoody@gmail.com` admin login in the database. Since that passkey was shared in a chat conversation earlier, consider changing it afterward — either by editing `ADMIN_PASSKEY` in `seed-admin.js` and re-running it (it updates rather than duplicates), or adding a password-change feature later.

## 4. Point the website at your local server

The front-end already expects `http://localhost:5000/api` — see `assets/js/site-config.js`. As long as the server above is running, the site's forms and dashboards will talk to it directly. No extra config needed for local testing.

## 5. When you're ready to deploy

The front-end (GitHub Pages) and this backend deploy separately:
- **Backend** → [Render](https://render.com) (free tier, connects straight to a GitHub repo, no card required for the free tier)
- Once deployed, update two things:
  1. `assets/js/site-config.js` → change `API_BASE_URL` to your Render URL
  2. `server/.env` (or Render's environment variable settings) → update `SITE_URL` and `CLIENT_ORIGIN` to your real GitHub Pages URL

## What's real vs. still mocked

- **Real:** applications (submit/list/edit/approve/reject), login with JWT sessions, admin 2FA via email, Flutterwave payment verification, approval/credential emails, dashboard metrics (real students, pending admissions, revenue), manual/cash registration (New vs. Old toggle + financial tracking), full course management (create/edit/delete, modules, lessons) **with an approval workflow — any create or edit reverts a course to draft, and only "Approve & Publish" makes it visible to students/the public**, announcements/news, admin profile, student profile (photo-only editing), module-based progress tracking with sequential module locking, a full exam system (paste-parsed or CSV-imported question banks, real timed exams, auto-grading, review screens), weighted overall grades (module completion + exam score, configurable per course), and a Broadcast/Communication Hub (email + in-app notifications, targeted by category or individually, rich text)
- **Still mocked:** instructors' extended profile info (rating/department), assignments (no submission system exists — dashboards honestly show 0/empty rather than fake data), messages, AI tutor, certificates (no issuance system yet), attendance-taking on the instructor side (the data model and student-facing display are real, but nothing creates records yet)
- **File uploads** (course images, lesson attachments, announcement images/PDFs, profile photos, exam question images) currently save to `server/uploads/` on local disk — great for local testing, but this folder gets wiped on every restart/redeploy on most free hosts (including Render). Swap for Cloudinary before a real deploy; the routes that call `upload.single()`/`upload.fields()` in `server/middleware/upload.js` are the only places that would need to change.
- **Exam CSV import** currently accepts CSV/plain-text files in the pipe-delimited format described in the spec (`Question | A | B | C | D | Correct`). True binary `.xlsx` parsing would need an added library (`xlsx` on npm) — flagged as a fast-follow if genuinely needed, since CSV export covers the same structured data.
