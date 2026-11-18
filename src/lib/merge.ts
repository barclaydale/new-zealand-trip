/* Fern & Fiord — conflict-free merge of two copies of the shared trip state.

   This is the server-side (TypeScript) twin of public/js/merge.js, which the browser loads
   as a plain script (js/sync.js talks to /api/state and merges the response the same way
   locally, so a slow network never clobbers work done in the meantime). The two files must
   stay logically identical — if you change the merge rules here, change them there too.

   State shape (v1): four maps, every entry is { t: timestamp, v: value | null }
     people: { "<personId>": { t, v: { name, color } } }
     votes:  { "<itemId>|<personId>": { t, v: "love" | "like" | "pass" } }
     items:  { "u-<id>": { t, v: { name, island, cats, region, … } } }       — activities the group added
     notes:  { "<noteId>": { t, v: { item, by, text, at } } }                — comments on any activity
   A null v is a tombstone (a cleared vote, deleted note or deleted activity), kept with its timestamp
   so a device that was offline doesn't bring the old value back when it reconnects.

   Rule: per key, the newer t wins. Ties: more content wins, then a stable string compare,
   so both sides always converge on the same result. */

export interface Entry {
  t: number;
  v: unknown;
}
export type EntryMap = Record<string, Entry>;

export interface TripStateData {
  v: 1;
  people: EntryMap;
  votes: EntryMap;
  items: EntryMap;
  notes: EntryMap;
}

export const MAPS = ["people", "votes", "items", "notes"] as const;

// canonical JSON (sorted keys) so equal states always compare equal
export function canon(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return "{" + Object.keys(o).sort().map((k) => JSON.stringify(k) + ":" + canon(o[k])).join(",") + "}";
  }
  return JSON.stringify(v === undefined ? null : v);
}

function normMap(m: unknown): EntryMap {
  const out: EntryMap = {};
  if (!m || typeof m !== "object" || Array.isArray(m)) return out;
  Object.entries(m as Record<string, unknown>).forEach(([k, e]) => {
    if (!e || typeof e !== "object") return;
    const x = e as Record<string, unknown>;
    const t = Number(x.t);
    if (!Number.isFinite(t) || t <= 0) return;
    out[k] = { t, v: x.v === undefined ? null : x.v };
  });
  return out;
}

export function normalize(s: unknown): TripStateData {
  const src = s && typeof s === "object" ? (s as Record<string, unknown>) : {};
  return { v: 1, people: normMap(src.people), votes: normMap(src.votes), items: normMap(src.items), notes: normMap(src.notes) };
}

// pick the newer of two entries; on a tie prefer more content, then a stable compare
function pick(a: Entry, b: Entry): Entry {
  if (a.t !== b.t) return a.t > b.t ? a : b;
  const ca = canon(a.v), cb = canon(b.v);
  if (ca.length !== cb.length) return ca.length > cb.length ? a : b;
  return ca >= cb ? a : b;
}

export function merge(x: unknown, y: unknown): TripStateData {
  const a = normalize(x), b = normalize(y);
  const out: TripStateData = { v: 1, people: {}, votes: {}, items: {}, notes: {} };
  MAPS.forEach((m) => {
    const keys = new Set([...Object.keys(a[m]), ...Object.keys(b[m])]);
    keys.forEach((k) => {
      const ea = a[m][k], eb = b[m][k];
      out[m][k] = ea && eb ? pick(ea, eb) : ea || eb;
    });
  });
  return out;
}
