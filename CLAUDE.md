# Event Q&A

Live Q&A platform for events. Attendees scan a QR code, ask speakers questions, and upvote in real-time.

## Tech Stack

- **Framework**: Next.js 14 (App Router) on Vercel
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Real-time**: SWR polling (2s questions, 5s presence) — no WebSocket infra needed
- **Styling**: Tailwind CSS, DM Sans (body) + Fraunces (headings), Lucide React icons
- **QR**: `qrcode` library for generation

## Architecture

- Anonymous users identified by localStorage UUID (`qa_visitor_id`) + browser fingerprint
- Admin gated by hardcoded password (`claude2026`)
- Each event has its own admin password (used for `/event/[eventId]/admin` access)
- Lazy DB connection (`getDb()`) to avoid build-time errors on Vercel
- Presence tracking via heartbeat POST every 10s, stale cleanup at 60s
- QR code URLs use `window.location.origin` (not env var) to work on any deployment

## Anti-Vote-Manipulation

Three-layer defense:
1. **Browser fingerprinting** — device signals (screen, UA, timezone, etc.) create a stable identity that survives incognito/storage clears. Stored in votes table with a partial unique index `(question_id, fingerprint) WHERE fingerprint IS NOT NULL`.
2. **Rate limiting** — in-memory, per-request: 10 votes/min per fingerprint, 30 votes/min per IP. Returns 429.
3. **Dual identity** — `hasVoted` checks both `voterId` (localStorage) and `fingerprint`. Blocks re-voting from same device even with fresh session.

## Key Commands

```bash
npm run dev          # Start dev server
npx drizzle-kit push # Push schema to Neon (run after DB setup)
npm run build        # Production build
vercel --prod --yes  # Deploy to Vercel production
```

## Environment Variables

Set in Vercel (or `.env` locally):
- `DATABASE_URL` — Neon PostgreSQL connection string
- `NEXT_PUBLIC_BASE_URL` — Public URL (optional, only used server-side)

## Database Schema

5 tables: `events`, `speakers`, `questions`, `votes`, `presence`
Schema defined in `src/lib/schema.ts`, uses `gen_random_uuid()` for IDs.
Votes table has `fingerprint` and `ip` columns added via migration.

## Routes

### Pages
- `/` — Landing
- `/admin` — Ambassador login → redirects to `/admin/events`
- `/admin/events` — Event dashboard (list, edit, delete, open event link)
- `/admin/create` — 5-step event creation wizard
- `/admin/events/[eventId]/edit` — Edit event details and speakers
- `/event/[eventId]` — Speaker list (QR landing page)
- `/event/[eventId]/ask/[speakerId]` — Ask question form
- `/event/[eventId]/feed` — Live question feed with voting
- `/event/[eventId]/admin` — Admin feed (per-event password gate, question deletion)

### API
- `POST /api/admin/login` — Global admin auth
- `GET/POST /api/events` — List all / create event
- `GET/PUT/DELETE /api/events/[eventId]` — Get / update / delete event
- `POST/PUT /api/events/[eventId]/speakers` — Bulk add / replace speakers
- `GET/POST/DELETE /api/events/[eventId]/questions` — List / create / delete questions
- `POST /api/events/[eventId]/votes` — Toggle vote (with fingerprint + rate limiting)
- `GET/POST /api/events/[eventId]/presence` — Attendee count / heartbeat
- `POST /api/events/[eventId]/admin/verify` — Verify per-event admin password

## Design System

Warm minimal with cream gradient background (`#FDF8F4` → `#F5EDE6`), white surface cards, dark primary buttons (`#1A1A1A`), gold accents (`#A08860` / `#C4A882`) for voted/active states. Speaker avatars use 6 rotating pastel gradient pairs. Live indicator is a dark pill with red pulsing dot. Mobile-first, max-w-lg centered.
