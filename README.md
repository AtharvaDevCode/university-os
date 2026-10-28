# University OS — early MVP

A single Next.js application for organising University of Koblenz events, tasks, email-derived information and lecture materials. This starter includes a working client-side event dashboard, manual event creation, venue and room fields, source panels, verification/conflict states, and an initial Prisma data model for persistent storage and provenance.

## Current status

- [x] Dashboard UI and responsive layout
- [x] Manual event creation (in browser memory for this prototype)
- [x] Separate venue/building and room-number fields
- [x] Expandable source/provenance panel
- [x] Unverified / verified / conflicting states
- [x] Search events
- [x] Prisma schema for events, sources, tasks, email metadata and watched websites
- [ ] Persist events through database/API (the current UI is a prototype and resets on refresh)
- [ ] SOGo IMAP sync and message parsing
- [ ] AI-assisted extraction and German translation
- [ ] Source page scraper and two-hour scheduling
- [ ] File uploads, OCR and lecture vault
- [ ] Notifications

The events shown on first load are clearly demo entries. They are not live data and must not be treated as confirmed university events. No university credentials are included in this project.

## Requirements

- Node.js 20.9 or newer
- npm
- PostgreSQL when enabling database persistence

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Configure database (next implementation step)

1. Copy `.env.example` to `.env.local`.
2. Set `DATABASE_URL` to a PostgreSQL database you control.
3. Run:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Do not put real credentials in source code, commit `.env.local`, or expose IMAP credentials to client-side code. For the SOGo integration, use a server-side connection and a read-only sync first. Mailbox moves and folder creation should only be enabled after a dry-run report and explicit confirmation.

## Product decisions encoded in this starter

- Event venue/building and room number are separate fields.
- Unknown locations stay explicitly unknown; the app must not invent a room number.
- AI-derived items start as `UNVERIFIED`.
- `VERIFIED` is a user action, not an AI confidence score.
- `CONFLICTING` flags incompatible source information.
- Sources keep filename, sender/subject or URL, evidence snippet, timestamp and extracted field metadata.
- Event data and source evidence are separate so a user correction never destroys the original evidence.
- Scraping and email sync should run as background jobs, not on ordinary dashboard page loads.

## Deployment note

Vercel can host the Next.js UI and server endpoints. For a two-hour sync on a free Vercel plan, use an external scheduler/worker or choose a plan whose cron limits meet the cadence. The database and uploaded files should live in managed persistent services, not the ephemeral app filesystem.
