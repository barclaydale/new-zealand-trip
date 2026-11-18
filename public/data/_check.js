/* Validates public/data/*.js against _SPEC.md. Run: npm run check-data */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");
const ctx = { window: {}, localStorage: { getItem: () => null, setItem() {} }, document: { dispatchEvent() {} }, CustomEvent: function () {}, console };
ctx.window = ctx; ctx.self = ctx;
vm.createContext(ctx);
["js/merge.js", "js/core.js", "data/south.js", "data/north.js"].forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f }));

const NZ = ctx.NZ, problems = [], seen = new Set();
NZ.order.forEach((id) => {
  const a = NZ.curated[id], r = a.raw, where = `${id} (${a.name})`;
  if (seen.has(id)) problems.push(`${where}: duplicate id`);
  seen.add(id);
  ["n", "c", "r", "d", "av", "h", "m", "fb", "u"].forEach((k) => { if (r[k] == null || r[k] === "") problems.push(`${where}: missing ${k}`); });
  if (r.nz == null) problems.push(`${where}: missing nz`);
  String(r.c || "").split(/\s+/).forEach((c) => { if (!NZ.CAT[c]) problems.push(`${where}: unknown category "${c}"`); });
  if (!NZ.REGIONS[a.island].includes(a.region)) problems.push(`${where}: region "${a.region}" isn't in NZ.REGIONS.${a.island}`);
  [["av", r.av], ["m", r.m]].forEach(([k, v]) => { if (!(v >= 1 && v <= 5 && Number.isInteger(v))) problems.push(`${where}: ${k} must be an integer 1–5`); });
  if (!(r.h > 0)) problems.push(`${where}: h must be > 0`);
  if (r.u && !/^(u:https?:\/\/|w:)/.test(r.u)) problems.push(`${where}: bad link spec "${r.u}"`);
});

const by = (k) => NZ.CATS.map((c) => `${c.short} ${NZ.order.filter((id) => NZ.curated[id].island === k && NZ.curated[id].cats.includes(c.k)).length}`).join(" · ");
console.log(`${NZ.order.length} activities`);
console.log(`  South: ${by("S")}`);
console.log(`  North: ${by("N")}`);
if (problems.length) { console.error("\n" + problems.join("\n")); process.exit(1); }
console.log("OK");
