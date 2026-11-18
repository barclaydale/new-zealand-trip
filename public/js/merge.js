/* Fern & Fiord — conflict-free merge of two copies of the shared trip state.
   Used by the browser (js/sync.js) so it must stay dependency-free (plain script, no bundler).
   The server side (src/app/api/state/route.ts) uses the TypeScript twin of this file, src/lib/merge.ts —
   the two must stay logically identical; if you change the rules here, change them there too.

   State shape (v1): four maps, every entry is { t: timestamp, v: value | null }
     people: { "<personId>": { t, v: { name, color } } }
     votes:  { "<itemId>|<personId>": { t, v: "love" | "like" | "pass" } }
     items:  { "u-<id>": { t, v: { name, island, cats, region, … } } }       — activities the group added
     notes:  { "<noteId>": { t, v: { item, by, text, at } } }                — comments on any activity
   A null v is a tombstone (a cleared vote, deleted note or deleted activity), kept with its timestamp
   so a device that was offline doesn't bring the old value back when it reconnects.

   Rule: per key, the newer t wins. Ties: more content wins, then a stable string compare,
   so both sides always converge on the same result. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FFMerge = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const MAPS = ["people", "votes", "items", "notes"];

  // canonical JSON (sorted keys) so equal states always compare equal
  function canon(v) {
    if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
    if (v && typeof v === "object") return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
    return JSON.stringify(v === undefined ? null : v);
  }
  function normMap(m) {
    const out = {};
    if (!m || typeof m !== "object" || Array.isArray(m)) return out;
    Object.keys(m).forEach((k) => {
      const e = m[k]; if (!e || typeof e !== "object") return;
      const t = Number(e.t); if (!isFinite(t) || t <= 0) return;
      out[k] = { t, v: e.v === undefined ? null : e.v };
    });
    return out;
  }
  function normalize(s) {
    s = s && typeof s === "object" ? s : {};
    return { v: 1, people: normMap(s.people), votes: normMap(s.votes), items: normMap(s.items), notes: normMap(s.notes) };
  }
  // pick the newer of two entries; on a tie prefer more content, then a stable compare
  function pick(a, b) {
    if (a.t !== b.t) return a.t > b.t ? a : b;
    const ca = canon(a.v), cb = canon(b.v);
    if (ca.length !== cb.length) return ca.length > cb.length ? a : b;
    return ca >= cb ? a : b;
  }
  function merge(x, y) {
    const a = normalize(x), b = normalize(y), out = { v: 1, people: {}, votes: {}, items: {}, notes: {} };
    MAPS.forEach((m) => {
      const keys = new Set([...Object.keys(a[m]), ...Object.keys(b[m])]);
      keys.forEach((k) => { const ea = a[m][k], eb = b[m][k]; out[m][k] = ea && eb ? pick(ea, eb) : ea || eb; });
    });
    return out;
  }
  return { merge, normalize, canon, MAPS };
});
