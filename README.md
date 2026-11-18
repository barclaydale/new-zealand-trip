# Fern & Fiord: New Zealand trip planner

A shared research notebook for a New Zealand trip in **late March – early April 2027**. It's built the same way
as the `honeymoon-research` site (Tiare & Tide). The frontend is a static site (plain HTML/CSS/JS, in `public/`)
served by **Next.js**. One API route, `/api/state`, is backed by **Postgres via Prisma**. It runs on **Vercel**, and
everything people do on it is saved to a shared database: votes, notes and activities they add. Anyone with the
link and the trip code sees the same board, on any device.

Activities are split by **island** first. The South / North / Both switch in the top bar is remembered per device
and defaults to the South Island. Within an island, activities are grouped by **category**: The Classics, Nature,
Only in New Zealand, History, Culture, and Food & Drink. An activity can belong to several categories.
Every activity is rated on four scales:

| Rating | Meaning |
|---|---|
| **Price** | NZ$ per adult → Free · $ · $$ · $$$ · $$$$ · $$$$$ (with a rough US$ conversion) |
| **Availability** | 1–5 for *our* dates: season, weather risk, how far ahead to book, Easter |
| **Duration** | Typical hours → Quick stop … Overnight+ |
| **Must do** | 1–5, from "only if you're keen" to "don't miss" |

Each activity also has a "Late March – early April" note, a "What people say" summary of traveller-review
themes, the official site (or Wikipedia), and links to its Tripadvisor and Google reviews.

| Page | What it does |
|---|---|
| `index.html` | What to know about the dates (Easter, clocks going back, weather, what's in season), category tiles, top must-dos, recently added by the group |
| `category.html?c=nature` | One category (or `c=all` for everything), with search, region, price, time and must-do filters and sorting |
| `picks.html` | Group board: every activity ranked by the group's votes, one column per person |
| `itinerary.html` | Day-by-day planner (ported from the honeymoon site): pick where you sleep each night, drag activities onto days, and the drive / flight / Cook Strait ferry between bases appears with rough times and costs. Time meter per day, running NZ$ total for the group, Easter and clock-change flags on the right dates. Multiple named **drafts** so each person can build their own version |
| `map.html` | Real map (Leaflet, free tiles) of every activity, coloured by category, with voting and "add to itinerary" in the popups. **Itinerary story** plays the draft you're viewing day by day: driving through each town, stopping at activities, going dark overnight |

## Working as a group

- **Who are you?** Each device picks a person (or adds a new one). Votes and notes are signed with that name.
  The choice is stored only on that device. Every page load asks for anything missing: the trip code first,
  then (once the board has loaded) which person you are, so you can pick your existing name from the list.
  Add `?noprompt` to a URL to skip both. If the same name ends up added twice (both are you), pick the other
  one in the "Who are you?" dialog and that device's votes, notes and drafts merge into it.
- **People** each get their own colour, even if two devices add someone at the same moment. Remove someone
  with the × on their card on the Group picks page: their votes go for everyone, their notes and drafts stay.
- **Votes**: Love it (+2), Keen (+1) and Pass (−1). These feed the group score on the Group picks page.
- **Notes**: Anyone can leave a note on any activity. People can delete their own notes.
- **Add**: The **+ Add** button creates a new activity with the same fields and ratings as the built-in ones.
  Anyone can edit or delete group-added activities.

## Itinerary & map

- **Drafts**: anyone can start a draft ("Sam's version"), duplicate one, rename or delete. Which draft you're
  viewing is remembered per device, so two people can each have a different one open. The default draft
  ("Our trip") only gets saved once someone edits it, so two devices never create duplicates.
- **Settings per draft**: dates, travellers, the airport you fly into and home from, international flights per
  person, food allowance per person per day, rental car per day. Accommodation is a free-text name + NZ$/night
  on each day (there's no hotel database).
- **Travel between bases** (`public/js/geo.js`): a small road network of real distances between ~50 towns, so
  routes go around the Southern Alps rather than through them, plus the Cook Strait and Stewart Island ferries
  and domestic flights between the main airports. Long legs offer a Drive / Fly choice. Times are estimates
  for planning, not a substitute for a maps app.
- **Map placement**: activities don't store coordinates. `geo.js` matches each one's name and town against a
  list of real named places (then its region's main town), with a small jitter so neighbours don't stack.
  `npm run check-data` lists anything that couldn't be placed precisely.

## How it's put together

- **Frontend** (`public/`): plain HTML/CSS/vanilla JS. There's no React and no build step for the UI itself.
  `next.config.ts` rewrites `/` to `/index.html`.
- **Content** (`public/data/south.js`, `public/data/north.js`): the built-in activities. The format is in
  `public/data/_SPEC.md`. `npm run check-data` validates both files.
- **API** (`src/app/api/state/route.ts`): `GET`/`PUT` with an `x-trip-code` header. Saves are merged rather
  than overwritten, so two people editing at once never clobber each other.
- **Storage**: one row in Postgres (`prisma/schema.prisma`, model `TripState`) holds the whole shared state as
  JSON. It's read, merged and written inside a serializable transaction, and retried if two saves race.
- **Merge logic**: `src/lib/merge.ts` (server) and `public/js/merge.js` (browser) are twins of the same
  conflict-free merge, so if you change the rules, change both. The state is six maps (`people`, `votes`,
  `items`, `notes`, `itins`, `days`). Every entry carries a timestamp, and the newer one wins key by key.
  Each itinerary day is its own entry, so two people editing different days of one draft never clobber each
  other. Deleting writes a
  timestamped "tombstone", so a device that was offline can't resurrect something someone else removed.

## Deploy on Vercel (one-time setup)

1. **Push this repo to GitHub** and import it in Vercel: **Add New → Project →** select the repo. The framework
   preset should be Next.js (`vercel.json` pins it, in case Vercel chose "Other" when the repo was empty).
   If `/api/state` returns 404 on the live site, it was deployed as plain static files: check
   **Settings → Build and Deployment → Framework Preset** is Next.js with no Output Directory override.
2. **Add a database.** Go to Project → **Storage** → **Create Database** → **Postgres** (Neon, via the Vercel
   Marketplace). The free plan is plenty. Then click **Connect to Project** on the database itself. This sets
   `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for all environments.
3. **Pick a shared trip code.** Go to Project → **Settings → Environment Variables** and add `TRIP_CODE` with
   any passphrase (Production, Preview and Development). Anyone with the link *and* the code can read and edit
   the board. Everyone else gets a 401.
4. **Redeploy** so the env vars take effect. The build command
   (`prisma generate && prisma migrate deploy && next build`) creates the `TripState` table on the first deploy.
5. **Share** the link and the trip code with the group. On each device, open the site, click the
   **Set up sync** pill (top right), enter the code, then pick or add your name.

How it behaves:

- Every change is saved on the device instantly and sent to the server about half a second later. Other
  devices pull every ~12 seconds, and whenever their tab regains focus.
- Offline, or the server's down? It keeps working from the local copy and syncs when it can.

## Run it locally

```
npm install
vercel link             # once, to connect this checkout to the Vercel project
vercel env pull .env    # pulls DATABASE_URL / DATABASE_URL_UNPOOLED / TRIP_CODE
npm run dev             # http://localhost:3000
```

Or point `.env` at any local Postgres (see `.env.example`) and run `npx prisma migrate deploy` once.

You can also just open `public/index.html` in a browser. It works, but saves only in that browser, with no sync.

## Editing the content

- `public/data/south.js` / `north.js`: one object per activity (see `public/data/_SPEC.md`), then run
  `npm run check-data`.
- `public/js/core.js`: categories, regions, rating labels and thresholds, and the NZD → USD rate (`NZ.USD`).
- Prices are rough 2026–27 NZ$ planning estimates per adult, from operator sites, booking sites and tourism
  listings. Confirm them before booking.
