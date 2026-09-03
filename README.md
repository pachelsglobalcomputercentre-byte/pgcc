# PGCC Institute — Full Build (Front-End + Backend)

**Pachels Global Computer Centre (PGCC Institute)**. Static front-end (HTML/CSS/JS, deployable on GitHub Pages) plus a real Node.js + Express + MongoDB backend for applications, login, and payments.

## Quick start

1. **Start the backend first** — see `server/README.md` (MongoDB Atlas setup, `npm install`, `npm start`, `npm run seed-admin`).
2. **Open the front-end** — for full functionality (forms, login, dashboards talking to the backend), serve it locally rather than double-clicking files:
   ```
   python3 -m http.server 8080
   ```
   Then visit `http://localhost:8080`.

If the backend isn't running, the site still works — forms and dashboards fall back to demo/mock data automatically, so nothing breaks, it just won't persist anywhere real yet.

## Structure
```
index.html, about.html, courses.html, admission.html, news.html,
contact.html, gallery.html, ai-assistant.html, login.html, payment.html
student/dashboard.html       ← Student Portal
instructor/dashboard.html    ← Instructor Portal
admin/dashboard.html         ← Admin Portal
assets/css/   design system + public site + dashboard styles
assets/js/    site-config.js (shared settings), data.js (mock data for
              sections not yet wired to the backend), auth.js (real login),
              admission-form.js, payment.js, dashboard logic per portal
assets/img/   logo.png (extracted from your PDF), favicon.png

server/                      ← Node.js + Express + MongoDB backend
  server.js, db.js, models/, routes/, middleware/, utils/
  .env                       ← real secrets (never commit this)
  seed-admin.js               ← run once to create the admin login
  README.md                  ← full backend setup guide
```

## What's real vs. mocked, right now

**Real (backend-connected):** everything core to running the school —
admissions, login/2FA, payments, courses & lessons (with drip-scheduled
modules and per-module quizzes), exams (module-gated, one attempt),
assignments (post, submit, grade), attendance, notifications/broadcast,
Online vs. Physical training separation, and admin analytics.

**Still mocked (reads from `assets/js/data.js`):** a few lower-priority
dashboard sections — messages, the AI tutor demo, and certificates — are
still placeholders. Everything else follows the same pattern already
proven elsewhere: moving each one to a real database is incremental work,
not a redesign.

## Security notes worth knowing
- `server/.env` holds real secrets (Mongo, Gmail, Flutterwave) — it's in `.gitignore` and must never be pushed to GitHub
- The admin passkey and Gmail app password were shared in a chat conversation — worth rotating both once everything is confirmed working
- Login is fully locked down: there's no public sign-up anywhere. Accounts only exist once an admin creates them (via approval) or you run `seed-admin.js`
- Login/2FA and the public application form are rate-limited against brute-force and spam; `helmet` adds standard security headers to every API response

## Next up
- Deploy: backend → Render, front-end → GitHub Pages (see `server/README.md` §5), then update `API_BASE_URL` + `FLUTTERWAVE_PUBLIC_KEY` in `assets/js/site-config.js`
- Switch Flutterwave from test keys to live keys
- Run `node reset-test-data.js` once, right before real students start signing up, to clear test data
- Move the remaining mocked sections (messages, AI tutor, certificates) into MongoDB
