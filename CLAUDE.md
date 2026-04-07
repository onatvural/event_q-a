# Event Q&A

Live Q&A platform for events. Attendees scan a QR code, ask speakers questions, and upvote in real-time.

## Tech Stack

- **Framework**: Next.js 14 (App Router) on Vercel
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Real-time**: SWR polling (2s questions, 5s presence) — no WebSocket infra needed
- **Styling**: Tailwind CSS, DM Sans (body) + Fraunces (headings), Lucide React icons
- **QR**: `qrcode` library for generation

## Architecture

- Anonymous users identified by localStorage UUID (`qa_visitor_id`)
- Admin gated by hardcoded password (`claude2026`)
- Each event has its own admin password
- Lazy DB connection (`getDb()`) to avoid build-time errors on Vercel
- Presence tracking via heartbeat POST every 10s, stale cleanup at 60s

## Key Commands

```bash
npm run dev          # Start dev server
npx drizzle-kit push # Push schema to Neon (run after DB setup)
npm run build        # Production build
```

## Environment Variables

Set in Vercel (or `.env` locally):
- `DATABASE_URL` — Neon PostgreSQL connection string
- `NEXT_PUBLIC_BASE_URL` — Public URL (for QR code generation)

## Database Schema

5 tables: `events`, `speakers`, `questions`, `votes`, `presence`
Schema defined in `src/lib/schema.ts`, uses `gen_random_uuid()` for IDs.

## Routes

### Pages
- `/` — Landing
- `/admin` — Ambassador login
- `/admin/create` — 5-step event creation wizard
- `/event/[eventId]` — Speaker list (QR landing page)
- `/event/[eventId]/ask/[speakerId]` — Ask question form
- `/event/[eventId]/feed` — Live question feed with voting

### API
- `POST /api/admin/login` — Admin auth
- `POST /api/events` — Create event
- `GET /api/events/[eventId]` — Event + speakers
- `POST /api/events/[eventId]/speakers` — Bulk add speakers
- `GET/POST /api/events/[eventId]/questions` — List/create questions
- `POST /api/events/[eventId]/votes` — Toggle vote
- `GET/POST /api/events/[eventId]/presence` — Attendee count/heartbeat

## Design System

Warm minimal: cream gradient background, white cards, dark primary buttons, gold accents for voted/active states. Speaker avatars use pastel gradient pairs. Mobile-first, max-w-lg centered.
