# DTI Pulse — Hostinger Deployment Guide

Employee Attendance Management System for **Digital to Infinity**.
Stack: Node.js + Express + TypeScript (ESM) · MySQL via Drizzle ORM · React + Vite · IST-authoritative.

---

## 0. Read this first — two things that surprise people

**Deploy the whole repository, not just `server/`.**
In production the server serves the built frontend from a path relative to its own
compiled entry point ([server/src/index.ts](server/src/index.ts)):

```
server/dist/index.js  →  ../../client/dist  →  <repo>/client/dist
```

If you push only `server/` as a standalone repo, that path does not exist and every
non-API request returns an error. Keep `client/` and `server/` together.

**Never upload `node_modules`.**
`argon2` and `mysql2` compile native binaries. Modules built on Windows will not load on
Hostinger's Linux servers. Always run `npm install` **on the server**.

---

## 1. Push to Git

`.gitignore` already excludes `node_modules/`, `dist/`, and `.env`. Verify no secrets are
staged before your first push:

```bash
git status --porcelain && git ls-files | grep -E "^\.env$|/\.env$" || echo "No .env tracked - good"
```

Then:

```bash
git add -A && git commit -m "DTI Pulse: attendance management system" && git branch -M main
```

Add your remote and push:

```bash
git remote add origin https://github.com/<you>/dti-pulse.git && git push -u origin main
```

> `dist/` is intentionally gitignored — you build **on** the server (step 4).

---

## 2. Create the MySQL database in hPanel

On Hostinger you **cannot** create a database from SQL. Do it in the panel:

**hPanel → Databases → MySQL Databases → Create New**

Hostinger prefixes both names with your account ID. Copy them exactly:

| Field | Example value |
|---|---|
| Database name | `u123456789_dtipulse` |
| Username | `u123456789_dtipulse` |
| Password | *(generate a strong one)* |
| Host (on-server) | `localhost` |

The migration script only creates **tables**, never the database itself — so it is safe to
run against a Hostinger-provisioned DB, and safe to re-run (every statement is
`CREATE TABLE IF NOT EXISTS` / `INSERT IGNORE`).

### Remote access from your own machine

**hPanel → Databases → Remote MySQL** → add your public IP (or `%` to allow any host —
convenient but far less safe; prefer a specific IP).

That page also shows the **remote hostname**, which is *not* `localhost`. Connect with:

```bash
mysql -h <remote-host-from-hpanel> -u u123456789_dtipulse -p u123456789_dtipulse
```

Use the same remote host in a GUI client (TablePlus, DBeaver, MySQL Workbench).
Keep `DB_HOST=localhost` in the server's own `.env` — the app runs on the same machine.

---

## 3. Configure the Node.js app

**hPanel → Advanced → Node.js** (Business plans and above; on VPS use PM2 instead)

| Setting | Value |
|---|---|
| Node version | **20 or newer** (pinned via `engines` in `package.json`) |
| Application root | the repo root (where the top-level `package.json` lives) |
| Startup file | `server/dist/index.js` |
| Application URL | your domain |

Leave `PORT` unset — Hostinger/Passenger assigns it and `config.port` reads
`process.env.PORT` automatically.

---

## 4. Create `.env`, install, build

Copy [server/.env.example](server/.env.example) to `server/.env` and fill in real values.
Generate the JWT secret with:

```bash
openssl rand -base64 48
```

**The server refuses to boot in production** if `JWT_SECRET` is missing, shorter than 32
characters, or still the placeholder — and likewise if `DB_NAME`, `DB_USER`, `DB_PASSWORD`,
or `CLIENT_URL` are unset. This is deliberate: a default signing key is public knowledge
(it is in this repo), so anyone could forge an admin token. You will see exactly which
variables are wrong in the startup log.

Then, from the repo root:

```bash
npm install && npm run build
```

`npm install` runs a `postinstall` that installs both `server/` and `client/` dependencies.
`npm run build` builds the client (`client/dist`) and then compiles the server
(`server/dist`). Use a plain `npm install` — **not** `--production` — because TypeScript
and `tsc-alias` are devDependencies needed for the build.

---

## 5. Create the schema and your admin account

```bash
npm run migrate:prod
```

Then create the first admin. **This is the only way to get a login — there are no
pre-seeded user accounts of any kind.**

With SSH / a terminal (interactive prompts):

```bash
npm run create-admin
```

Without SSH or a TTY, pass credentials as environment variables instead:

```bash
ADMIN_EMAIL=you@yourdomain.com ADMIN_PASSWORD='YourStr0ng!Pass' node server/dist/db/create-admin.js
```

Optional: `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, `ADMIN_USERNAME`, `ADMIN_PHONE`.
Password rules: min 8 chars, at least one uppercase, one lowercase, one number, one
special character, no spaces.

### Optional starter data

```bash
npm run seed:prod
```

This inserts **only** the two shifts (10:00–19:00 and 11:00–20:00, 15-minute grace) and one
office location. It creates **no users**.

> ⚠️ The seeded office location uses placeholder coordinates in Delhi
> (`28.6139391, 77.2090212`). Attendance check-in/check-out is geofenced against this
> point, so **staff will be unable to check in until you replace it** with your real office
> coordinates — either in Admin → Locations, or by editing
> [server/src/db/seed.ts](server/src/db/seed.ts) before seeding.

### Script naming

`migrate` / `seed` / `create-admin` run the TypeScript sources through `tsx`, which is a
devDependency. The `:prod` variants run the already-compiled JavaScript in `dist/`, so they
work even with production-only dependencies. On the server, prefer the `:prod` variants.

---

## 6. Verify

Restart the app in hPanel, then:

```bash
curl -s https://yourdomain.com/api/health
```

Expected response:

```json
{"success":true,"data":{"status":"ok","timestamp":"2026-08-22T12:00:00.000Z"}}
```

An unknown API path returns JSON rather than the frontend shell:

```json
{"success":false,"error":{"code":"NOT_FOUND","message":"API endpoint not found."}}
```

Then open the domain in a browser and log in with the admin account from step 5.

---

## 7. Local development

```bash
npm install && npm run migrate && npm run seed && npm run create-admin && npm run dev
```

Client on `http://localhost:5173`, API on `http://localhost:5000`.
Create `server/.env` from `server/.env.example` first, with `NODE_ENV=development` — the
production boot guard does not apply, so defaults are tolerated locally.

With no SMTP configured, OTP emails are skipped and the code is printed to the server
console (development only — **never** in production, so configure SMTP before going live
or nobody can verify an email or reset a password).

---

## Timezone

All attendance logic is IST-authoritative. Timestamps come from the server, never the
client. Set both in `.env`:

```
TZ=Asia/Kolkata
APP_TIMEZONE=Asia/Kolkata
```

`TZ` pins the Node process clock zone, which keeps `DATE` column reads deterministic
regardless of how the host's system clock is configured. The MySQL pool is fixed at
`+05:30`.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Exits immediately, logs "Refusing to start in production" | A required env var is missing. The log names each one. |
| `Cannot find module '.../dist/index.js'` | `npm run build` was not run on the server, or the startup file path is wrong. |
| `ER_ACCESS_DENIED_ERROR` | Wrong DB credentials, or the prefix (`u123456789_`) was omitted. |
| `ECONNREFUSED` connecting remotely | Your IP is not whitelisted in Remote MySQL, or you used `localhost` instead of the remote hostname. |
| `invalid ELF header` / `argon2` fails to load | `node_modules` was uploaded from Windows. Delete it and run `npm install` on the server. |
| Frontend 404s, API works | `client/dist` missing — run `npm run build`, and confirm the full monorepo is deployed. |
| CORS errors in the browser | `CLIENT_URL` does not exactly match the origin you are loading (scheme, subdomain, no trailing slash). |
| Staff cannot check in | Office location coordinates are still the Delhi placeholder, or outside the configured radius. |
| Every user shares one rate limit | Passenger proxy hops — `trust proxy` is set to `1`; increase if there are more hops. |

---

## Security notes

- Passwords are hashed with **Argon2id**; plaintext is never stored.
- JWTs are delivered in **httpOnly cookies**.
- OTP codes are **never** logged or returned in an API response in production.
- Geofence distance is computed **server-side** (Haversine); a client-supplied
  "inside office" flag is never trusted.
- Attendance timestamps are **server-generated**; client time is ignored.
- Stack traces and internal error details are suppressed in production responses.
- All admin modifications are written to an append-only audit log.
- Never commit `.env`. Rotate `JWT_SECRET` and DB passwords if one is ever exposed.
