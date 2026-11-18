/* The shared trip state for everyone who knows the trip code.

   GET  /api/state  -> { state }                (current shared state, or null if nothing saved yet)
   PUT  /api/state  -> { state }                (body { state }: merged into the stored state, merged result returned)

   Auth:     header  x-trip-code: <TRIP_CODE>   (TRIP_CODE is an environment variable you set in Vercel)
   Storage:  one row in Postgres (see prisma/schema.prisma, model TripState — a singleton, id 1), via Prisma.
             Concurrent PUTs are resolved with a serializable transaction: read, merge (src/lib/merge.ts),
             write; if two requests raced, Postgres fails one and we retry it with jittered backoff. */
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canon, merge, normalize } from "@/lib/merge";

export const runtime = "nodejs";

const MAX_BYTES = 1024 * 1024;
const ROW_ID = 1;
const MAX_ATTEMPTS = 8;
const LIMITS = { people: 40, items: 600, notes: 4000, itins: 40, days: 2400 } as const;

// which database and deployment answered, so two devices can check they're really sharing one board.
// The database is identified by a short hash of its host + name (no credentials).
function info() {
  let where = "";
  try {
    const u = new URL(process.env.DATABASE_URL || "");
    where = u.hostname.replace(/-pooler(?=\.)/, "") + u.pathname;
  } catch {}
  return {
    db: crypto.createHash("sha256").update(where).digest("hex").slice(0, 6),
    env: process.env.VERCEL_ENV || "local",
  };
}

function json(status: number, body: unknown) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function codeOk(given: string | null) {
  const want = process.env.TRIP_CODE || "";
  const hash = (s: string) => crypto.createHash("sha256").update(String(s)).digest();
  return want.length > 0 && crypto.timingSafeEqual(hash(given || ""), hash(want));
}

function notReady(req: NextRequest) {
  if (!process.env.TRIP_CODE) return json(503, { error: "not_configured", message: "Set the TRIP_CODE environment variable in Vercel." });
  if (!process.env.DATABASE_URL) return json(503, { error: "no_storage", message: "Connect a Postgres database to this Vercel project." });
  if (!codeOk(req.headers.get("x-trip-code"))) return json(401, { error: "bad_code" });
  return null;
}

class TooLargeError extends Error {}

function isWriteConflict(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034"; // serialization failure — someone else wrote first
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function GET(req: NextRequest) {
  const fail = notReady(req);
  if (fail) return fail;

  const row = await prisma.tripState.findUnique({ where: { id: ROW_ID } });
  return json(200, { state: row ? row.data : null, now: Date.now(), info: info() });
}

export async function PUT(req: NextRequest) {
  const fail = notReady(req);
  if (fail) return fail;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "bad_body" });
  }
  const state = (body as { state?: unknown } | null)?.state;
  if (!state || typeof state !== "object") return json(400, { error: "bad_body" });

  const incoming = normalize(state);
  for (const [m, max] of Object.entries(LIMITS)) {
    if (Object.keys(incoming[m as keyof typeof LIMITS]).length > max) return json(400, { error: "too_many_" + m });
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt) await sleep(15 + Math.random() * 60 * attempt); // jittered backoff when someone else wrote first
    try {
      const merged = await prisma.$transaction(
        async (tx) => {
          const row = await tx.tripState.findUnique({ where: { id: ROW_ID } });
          const current = row ? row.data : null;
          const mergedState = merge(current, incoming);
          if (row && canon(current) === canon(mergedState)) return mergedState; // nothing new, skip the write

          const next = JSON.stringify(mergedState);
          if (next.length > MAX_BYTES) throw new TooLargeError();

          const data = mergedState as unknown as Prisma.InputJsonValue;
          await tx.tripState.upsert({
            where: { id: ROW_ID },
            update: { data },
            create: { id: ROW_ID, data },
          });
          return mergedState;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return json(200, { state: merged, now: Date.now(), info: info() });
    } catch (e) {
      if (e instanceof TooLargeError) return json(413, { error: "too_large" });
      if (isWriteConflict(e) && attempt < MAX_ATTEMPTS - 1) continue;
      if (isWriteConflict(e)) return json(409, { error: "busy" });
      throw e;
    }
  }
  return json(409, { error: "busy" });
}

export { PUT as POST };
