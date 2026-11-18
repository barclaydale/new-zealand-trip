/* Fern & Fiord — core data helpers, rating scales, persistent store.
   Plain classic script (no modules) so the site works when opened straight from disk. */
(function () {
  const NZ = (window.NZ = window.NZ || {});
  NZ.curated = {};   // id -> activity from public/data/*.js
  NZ.order = [];     // curated ids in file order

  /* ---------- vocab ---------- */
  NZ.CATS = [
    { k: "classics", label: "The Classics", short: "Classics", blurb: "The postcard stops nearly everyone does, and mostly for good reason.", scene: "lake", pal: ["#bcd9ea", "#f3e7cf", "#5d7d93", "#2f8fa5"] },
    { k: "nature", label: "Nature", short: "Nature", blurb: "Fiords, glaciers, tracks and wildlife. This is the reason most people come.", scene: "fiord", pal: ["#c7dbe3", "#e9efe6", "#2f5c4a", "#1f5f73"] },
    { k: "onlynz", label: "Only in New Zealand", short: "Only in NZ", blurb: "Things you genuinely can't do anywhere else: glowworms, kea, bungy's birthplace, hobbit holes.", scene: "glow", pal: ["#0d1f33", "#1c3a52", "#0b1a26", "#173a4a"] },
    { k: "history", label: "History", short: "History", blurb: "Gold-rush towns, the Treaty, the earthquakes and the settlers.", scene: "hills", pal: ["#efd9b8", "#f6eee0", "#7a8a5a", "#6c8f9a"] },
    { k: "culture", label: "Culture", short: "Culture", blurb: "Māori culture, rugby, markets, art and everyday Kiwi life.", scene: "koru", pal: ["#7a2b22", "#c4572f", "#e9a24a", "#3b1712"] },
    { k: "food", label: "Food & Drink", short: "Food", blurb: "Crayfish, oysters, pies, pinot and sauvignon blanc.", scene: "vines", pal: ["#f5d6a8", "#fbefdc", "#5f6f3a", "#7d3b4a"] }
  ];
  NZ.CAT = {}; NZ.CATS.forEach((c) => (NZ.CAT[c.k] = c));
  NZ.ISLANDS = { S: "South Island", N: "North Island" };
  NZ.REGIONS = {
    S: ["Queenstown", "Wānaka", "Fiordland", "Aoraki / Mt Cook & Mackenzie", "Christchurch & Canterbury", "Akaroa", "Kaikōura", "Nelson & Abel Tasman", "Marlborough", "West Coast", "Dunedin & Otago", "Catlins & Southland", "Stewart Island"],
    N: ["Auckland", "Northland & Bay of Islands", "Coromandel", "Waikato", "Rotorua", "Bay of Plenty", "Taupō & Tongariro", "Hawke's Bay", "Wellington"]
  };
  NZ.TRIP = "late March – early April 2027";
  NZ.USD = 0.58;     // rough NZD → USD rate for the "≈ US$" hints; change it here if the rate moves

  /* ---------- the four ratings ----------
     price:        derived from nz (NZ$ per person) → 0 Free … 5 Splurge
     availability: 1–5 for late March / early April (season, weather risk, how far ahead to book)
     duration:     derived from h (hours) → 1 Quick … 5 Multi-day
     must do:      1–5 */
  NZ.priceLevel = (nz) => (nz <= 0 ? 0 : nz <= 40 ? 1 : nz <= 120 ? 2 : nz <= 250 ? 3 : nz <= 500 ? 4 : 5);
  NZ.PRICE_LABEL = ["Free", "Cheap", "Moderate", "Pricey", "Splurge", "Big splurge"];
  NZ.AVAIL_LABEL = { 1: "Very hard to get / off-season", 2: "Book weeks ahead", 3: "Book a week or so ahead", 4: "Book a few days ahead", 5: "Just turn up" };
  NZ.durLevel = (h) => (h <= 1 ? 1 : h <= 3 ? 2 : h <= 6 ? 3 : h <= 12 ? 4 : 5);
  NZ.DUR_LABEL = { 1: "Quick stop", 2: "A couple of hours", 3: "Half day", 4: "Full day", 5: "Overnight +" };
  NZ.hot = (a) => a.av <= 2;   // sells out / needs booking well ahead
  NZ.MUST_LABEL = { 1: "Only if you're keen", 2: "Nice extra", 3: "Worth it if you're nearby", 4: "Highly recommended", 5: "Don't miss" };

  /* ---------- small helpers ---------- */
  const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’'`]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  NZ.slug = slug;
  NZ.esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  NZ.nzd = (n) => "NZ$" + Math.round(n).toLocaleString("en-US");
  NZ.usd = (n) => "US$" + Math.round(n * NZ.USD).toLocaleString("en-US");
  NZ.durText = (h) => {
    if (h >= 24) { const d = Math.round(h / 24); return d + (d === 1 ? " day" : " days"); }
    if (h < 1) return Math.round(h * 60) + " min";
    return (Math.round(h * 10) / 10).toString().replace(/\.0$/, "") + " h";
  };
  NZ.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- link specs: "w:term" Wikipedia, "u:https://…" direct ---------- */
  NZ.link = function (spec) {
    if (!spec) return null;
    const i = spec.indexOf(":"), k = spec.slice(0, i), v = spec.slice(i + 1);
    if (k === "w") return { url: "https://en.wikipedia.org/w/index.php?search=" + encodeURIComponent(v) + "&go=Go", label: "Wikipedia" };
    let host = "website";
    try { host = new URL(v).hostname.replace(/^www\./, ""); } catch (e) {}
    return { url: v, label: host };
  };
  // every activity also gets review links (Tripadvisor + Google Maps), searched by name + base town
  NZ.reviewLinks = (a) => {
    const q = a.name + " " + (a.base || a.region || "") + " New Zealand";
    return [
      { url: "https://www.tripadvisor.com/Search?q=" + encodeURIComponent(q), label: "Tripadvisor" },
      { url: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q), label: "Google reviews" }
    ];
  };

  /* ---------- activity registration ----------
     NZ.add("S" | "N", [ { n, c, r, b, d, nz, pn, av, an, h, hn, m, fb, u }, … ])  — see public/data/_SPEC.md */
  NZ.normItem = function (o, island, id) {
    const cats = (Array.isArray(o.c) ? o.c : String(o.c || "").split(/\s+/)).filter((c) => NZ.CAT[c]);
    return {
      id, island: island === "N" ? "N" : "S", name: String(o.n || "Untitled"), cats: cats.length ? cats : ["classics"],
      region: o.r || "", base: o.b || "", desc: o.d || "", nz: Math.max(0, Number(o.nz) || 0), pn: o.pn || "",
      av: Math.min(5, Math.max(1, Number(o.av) || 3)), an: o.an || "", h: Math.max(0.1, Number(o.h) || 1), hn: o.hn || "",
      m: Math.min(5, Math.max(1, Number(o.m) || 3)), fb: o.fb || "", gem: !!o.g, link: NZ.link(o.u), raw: o
    };
  };
  NZ.add = function (island, rows) {
    rows.forEach((o) => {
      const it = NZ.normItem(o, island, island.toLowerCase() + "/" + slug(o.n));
      NZ.curated[it.id] = it; NZ.order.push(it.id);
    });
  };

  /* ---------- persistent store (localStorage = local cache; js/sync.js shares it) ---------- */
  const KEY = "fern-fiord.state", ME = "fern-fiord.me", ISL = "fern-fiord.island";
  const M = window.FFMerge;
  const S = (NZ.store = { state: M.normalize(null), onSave: null });
  try { S.state = M.normalize(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (e) {}
  S.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(S.state)); } catch (e) {}
    if (S.onSave) S.onSave();
  };
  S.adopt = function (st) { S.state = M.normalize(st); try { localStorage.setItem(KEY, JSON.stringify(S.state)); } catch (e) {} };
  S.get = (map, key) => { const e = S.state[map][key]; return e ? e.v : null; };
  // timestamps always move forward, even if this device's clock is behind the last writer's
  S.set = function (map, key, v) {
    const prev = S.state[map][key];
    S.state[map][key] = { t: Math.max(Date.now(), prev ? prev.t + 1 : 0), v: v == null ? null : v };
    S.save();
  };
  S.live = (map) => Object.keys(S.state[map]).filter((k) => S.state[map][k].v != null).map((k) => [k, S.state[map][k].v]);

  /* ---------- people ---------- */
  NZ.COLORS = ["#c8432f", "#2f6b4f", "#2e6d93", "#c48a12", "#7a4fa0", "#b0537a", "#3d8a85", "#7d5a35"];
  NZ.people = () => S.live("people").map(([id, p]) => Object.assign({ id }, p)).sort((a, b) => a.name.localeCompare(b.name));
  NZ.person = (id) => { const p = S.get("people", id); return p ? Object.assign({ id }, p) : null; };
  NZ.meId = () => { try { return localStorage.getItem(ME) || ""; } catch (e) { return ""; } };
  NZ.me = () => NZ.person(NZ.meId());
  NZ.setMe = (id) => { try { localStorage.setItem(ME, id); } catch (e) {} };
  NZ.addPerson = function (name) {
    const id = "p-" + NZ.uid(), used = NZ.people().map((p) => p.color);
    const color = NZ.COLORS.find((c) => !used.includes(c)) || NZ.COLORS[NZ.people().length % NZ.COLORS.length];
    S.set("people", id, { name: name.trim().slice(0, 40), color });
    return id;
  };
  NZ.initials = (name) => String(name || "?").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  /* ---------- island preference (per device, not shared) ---------- */
  NZ.island = () => { try { return localStorage.getItem(ISL) || "S"; } catch (e) { return "S"; } };
  NZ.setIsland = (v) => { try { localStorage.setItem(ISL, v); } catch (e) {} document.dispatchEvent(new CustomEvent("nz:island")); };
  NZ.onIsland = (a) => NZ.island() === "all" || a.island === NZ.island();

  /* ---------- activities: curated + group-added ---------- */
  NZ.custom = () => S.live("items").map(([id, v]) => Object.assign(NZ.normItem(v, v.island, id), { custom: true, by: v.by || "", added: v.added || 0 }));
  NZ.all = () => NZ.order.map((id) => NZ.curated[id]).concat(NZ.custom());
  NZ.get = (id) => NZ.curated[id] || (S.get("items", id) ? NZ.custom().find((x) => x.id === id) : null);
  NZ.saveCustom = function (id, fields) {
    const prev = S.get("items", id) || {};
    const me = NZ.meId();
    S.set("items", id, Object.assign({}, prev, fields, { by: prev.by || me, added: prev.added || Date.now(), editedBy: me }));
  };

  /* ---------- votes ---------- */
  NZ.VOTES = [["love", "Love it", 2], ["like", "Keen", 1], ["pass", "Pass", -1]];
  NZ.vote = (itemId, pid) => S.get("votes", itemId + "|" + pid);
  NZ.setVote = function (itemId, val) {
    const me = NZ.meId(); if (!me) return null;
    const cur = NZ.vote(itemId, me), next = cur === val ? null : val;
    S.set("votes", itemId + "|" + me, next);
    return next;
  };
  NZ.votesFor = function (itemId) {
    const out = { love: [], like: [], pass: [] };
    NZ.people().forEach((p) => { const v = NZ.vote(itemId, p.id); if (v && out[v]) out[v].push(p); });
    return out;
  };
  NZ.groupScore = (itemId) => { const v = NZ.votesFor(itemId); return v.love.length * 2 + v.like.length - v.pass.length; };

  /* ---------- notes ---------- */
  NZ.notesFor = (itemId) => S.live("notes").filter(([, n]) => n.item === itemId).map(([id, n]) => Object.assign({ id }, n)).sort((a, b) => a.at - b.at);
  NZ.addNote = (itemId, text) => S.set("notes", "n-" + NZ.uid(), { item: itemId, by: NZ.meId(), text: text.trim().slice(0, 2000), at: Date.now() });
  NZ.delNote = (id) => S.set("notes", id, null);

  NZ.ago = function (ts) {
    const s = Math.round((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.round(s / 60) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + " h ago";
    if (s < 86400 * 14) return Math.round(s / 86400) + " d ago";
    return new Date(ts).toLocaleDateString([], { day: "numeric", month: "short" });
  };
})();
