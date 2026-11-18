/* Fern & Fiord — itinerary drafts: data, trip math and the "add to which day?" picker.
   Shared state (see js/merge.js): a draft's settings live in `itins`, each day in `days` under "<draftId>|<index>",
   so two people editing different days of one draft merge cleanly. Which draft you're looking at is a per-device
   preference (localStorage), not shared, so each person can have their own draft open. */
(function () {
  const NZ = window.NZ, S = NZ.store, UI = NZ.ui, esc = NZ.esc;
  const IT = (NZ.plan = {});
  const ACTIVE = "fern-fiord.draft", MAIN = "main";
  IT.CAP = 720;   // minutes of usable day (12 h)
  IT.DEFAULTS = { name: "Our trip", start: "2027-03-25", len: 14, travellers: 2, food: 70, car: 90, intl: 0, arrive: "christchurch", depart: "christchurch" };
  IT.PRESETS = [
    { name: "Downtime: sleep in, café, wander", hrs: 3, cost: 0 },
    { name: "Scenic drive with photo stops", hrs: 3, cost: 0 },
    { name: "Supermarket & laundry run", hrs: 1.5, cost: 60 },
    { name: "Long winery lunch", hrs: 2.5, cost: 180 },
    { name: "Hot pools / spa evening", hrs: 2, cost: 120 }
  ];

  /* ---------- drafts ---------- */
  // the default draft exists virtually until someone edits it, so two devices never create duplicate "Our trip"s
  IT.drafts = function () {
    const live = S.live("itins").map(([id, v]) => Object.assign({}, IT.DEFAULTS, v, { id }));
    // keep the default draft while it's untouched, or if it has days but its settings never got saved
    const mainGone = S.state.itins[MAIN] && S.state.itins[MAIN].v == null;
    const mainHasDays = Object.keys(S.state.days).some((k) => k.startsWith(MAIN + "|") && S.state.days[k].v);
    if (!live.some((d) => d.id === MAIN) && !mainGone && (!live.length || mainHasDays)) live.push(Object.assign({}, IT.DEFAULTS, { id: MAIN }));
    return live.sort((a, b) => (a.id === MAIN ? -1 : b.id === MAIN ? 1 : a.name.localeCompare(b.name)));
  };
  IT.activeId = function () {
    let id = ""; try { id = localStorage.getItem(ACTIVE) || ""; } catch (e) {}
    const ds = IT.drafts(); return ds.some((d) => d.id === id) ? id : ds[0].id;
  };
  IT.setActive = (id) => { try { localStorage.setItem(ACTIVE, id); } catch (e) {} IT.changed(); };
  IT.get = (id) => IT.drafts().find((d) => d.id === (id || IT.activeId())) || Object.assign({}, IT.DEFAULTS, { id: MAIN });
  IT.set = function (patch, id) {
    const d = IT.get(id), v = Object.assign({}, d, patch); delete v.id;
    S.set("itins", d.id, v); IT.changed();
  };
  IT.blankDay = () => ({ base: null, items: [], stay: null, pref: "" });
  IT.day = function (i, id) {
    const v = S.get("days", (id || IT.activeId()) + "|" + i);
    return Object.assign(IT.blankDay(), v ? JSON.parse(JSON.stringify(v)) : {});
  };
  const empty = (d) => !d.base && !d.items.length && !d.stay && !d.pref;
  IT.setDay = function (i, d, id) {
    const did = id || IT.activeId(), key = did + "|" + i;
    if (!S.state.itins[did]) { const v = Object.assign({}, IT.get(did)); delete v.id; S.set("itins", did, v); }   // the first edit makes a virtual draft real
    if (!empty(d)) S.set("days", key, d);
    else if (S.state.days[key]) S.set("days", key, null);   // tombstone, so the cleared day stays cleared everywhere
  };
  IT.days = (id) => { const n = IT.get(id).len; return Array.from({ length: n }, (_, i) => IT.day(i, id)); };
  IT.newDraft = function (name, copyFrom) {
    const id = "d-" + NZ.uid(), src = copyFrom ? IT.get(copyFrom) : IT.DEFAULTS;
    const v = Object.assign({}, src, { name: name, by: NZ.meId() }); delete v.id;
    S.set("itins", id, v);
    if (copyFrom) IT.days(copyFrom).forEach((d, i) => { if (!empty(d)) S.set("days", id + "|" + i, d); });
    IT.setActive(id); return id;
  };
  IT.deleteDraft = function (id) {
    const d = IT.get(id);
    for (let i = 0; i < Math.max(d.len, 60); i++) if (S.state.days[id + "|" + i]) S.set("days", id + "|" + i, null);
    S.set("itins", id, null); IT.changed();
  };
  IT.setLen = function (n) {
    const d = IT.get();
    for (let i = n; i < d.len; i++) if (S.state.days[d.id + "|" + i]) S.set("days", d.id + "|" + i, null);   // so a later "add a day" starts blank
    IT.set({ len: n });
  };
  IT.changed = () => { if (UI) UI.refreshNav(); document.dispatchEvent(new CustomEvent("nz:itin")); };

  /* ---------- dates ---------- */
  IT.date = function (i, id) {
    const s = IT.get(id).start; if (!s) return null;
    const d = new Date(s + "T12:00:00"); if (isNaN(d)) return null;
    d.setDate(d.getDate() + i); return d;
  };
  IT.dayLabel = (i, id) => { const d = IT.date(i, id); return d ? d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : ""; };
  IT.EASTER_2027 = { "2027-03-26": "Good Friday: most shops shut", "2027-03-28": "Easter Sunday: most shops shut", "2027-03-29": "Easter Monday (public holiday)", "2027-04-04": "Clocks go back an hour tonight" };
  IT.dayNote = (i, id) => { const d = IT.date(i, id); if (!d) return ""; const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); return IT.EASTER_2027[k] || ""; };

  /* ---------- where is something planned? (active draft) ---------- */
  IT.placedDays = (itemId) => IT.days().map((d, i) => (d.items.some((x) => x.t === "a" && x.id === itemId) ? i + 1 : 0)).filter(Boolean);
  IT.placedLabel = (days) => (!days.length ? "" : "On Day " + (days.length > 3 ? days.slice(0, 3).join(", ") + " +" + (days.length - 3) : days.join(", ")));
  IT.nearestBase = function (a) {
    const c = NZ.coordOf(a);
    return NZ.BASE_ORDER.filter((b) => NZ.BASES[b].island === a.island).sort((x, y) => NZ.km(c, NZ.BASES[x].c) - NZ.km(c, NZ.BASES[y].c))[0];
  };
  IT.actMins = (a) => Math.round(Math.min(a.h, 12) * 60);

  /* ---------- trip math (NZ$) ---------- */
  IT.calc = function (id) {
    const st = IT.get(id), n = st.len, tv = Math.max(1, Number(st.travellers) || 1);
    const out = { days: [], totals: { act: 0, travel: 0, stay: 0, food: 0, car: 0, intl: 0, all: 0 }, route: [], nights: {}, settings: st };
    let prev = st.arrive || null;
    IT.days(st.id).forEach((d, idx) => {
      const day = { idx, base: d.base, raw: d, travel: null, depart: null, items: [], mins: 0, costs: { act: 0, travel: 0, stay: 0, food: 0, car: 0 } };
      if (d.base) {
        if (prev && prev !== d.base) day.travel = NZ.travel(prev, d.base, d.pref);
        if (out.route[out.route.length - 1] !== d.base) out.route.push(d.base);
        out.nights[d.base] = (out.nights[d.base] || 0) + 1;
      }
      const from = day.travel ? day.travel.legs[0].from : prev;
      if (idx === n - 1 && st.depart && (d.base || prev) && (d.base || prev) !== st.depart) day.depart = NZ.travel(d.base || prev, st.depart, "");
      [day.travel, day.depart].forEach((t) => { if (t) { day.mins += t.mins; day.costs.travel += t.pp * tv + t.car; } });
      d.items.forEach((x) => {
        if (x.t === "a") {
          const a = NZ.get(x.id);
          if (!a) { day.items.push({ uid: x.uid, t: "gone", mins: 0, cost: 0 }); return; }
          const m = IT.actMins(a), c = a.nz * tv, here = NZ.coordOf(a);
          const near = [d.base, from].filter((b) => b && NZ.BASES[b]).map((b) => NZ.km(here, NZ.BASES[b].c));
          const far = near.length ? Math.round(Math.min(...near) * NZ.ROAD.factor) : 0;
          day.items.push({ uid: x.uid, t: "a", a, mins: m, cost: c, far: far > 150 ? far : 0 }); day.mins += m; day.costs.act += c;
        } else {
          const m = Math.round((Number(x.hrs) || 0) * 60), c = Number(x.cost) || 0;
          day.items.push({ uid: x.uid, t: "c", name: x.name, hrs: x.hrs, mins: m, cost: c }); day.mins += m; day.costs.act += c;
        }
      });
      if (d.stay && Number(d.stay.cost)) day.costs.stay = Number(d.stay.cost);
      if (d.base) { day.costs.food = (Number(st.food) || 0) * tv; day.costs.car = Number(st.car) || 0; }
      day.cost = day.costs.act + day.costs.travel + day.costs.stay + day.costs.food + day.costs.car;
      Object.keys(day.costs).forEach((k) => (out.totals[k] += day.costs[k]));
      if (d.base) prev = d.base;
      out.days.push(day);
    });
    out.totals.intl = (Number(st.intl) || 0) * tv;
    out.totals.all = out.totals.act + out.totals.travel + out.totals.stay + out.totals.food + out.totals.car + out.totals.intl;
    return out;
  };

  /* ---------- actions ---------- */
  IT.addAct = function (i, itemId, at) {
    const a = NZ.get(itemId), st = IT.get(); if (!a || i < 0 || i >= st.len) return { ok: false, msg: "Day not found" };
    const d = IT.day(i); let msg = `Added to Day ${i + 1}`;
    if (!d.base) { d.base = IT.nearestBase(a); msg += ` (staying in ${NZ.BASES[d.base].name})`; }
    const other = IT.placedDays(itemId).filter((n) => n !== i + 1);
    if (other.length) msg += ` (heads up: it's also on Day ${other.join(", ")})`;
    d.items.splice(at == null ? d.items.length : at, 0, { uid: NZ.uid(), t: "a", id: itemId });
    IT.setDay(i, d); IT.changed(); return { ok: true, msg };
  };
  IT.addCustom = function (i, c, at) {
    const d = IT.day(i);
    d.items.splice(at == null ? d.items.length : at, 0, { uid: NZ.uid(), t: "c", name: String(c.name).slice(0, 80), hrs: Number(c.hrs) || 0, cost: Number(c.cost) || 0 });
    IT.setDay(i, d); IT.changed(); return { ok: true, msg: `Added to Day ${i + 1}` };
  };

  /* ---------- "which day?" picker (from any activity card or map popup) ---------- */
  UI.pickDay = function (itemId) {
    const a = NZ.get(itemId); if (!a) return;
    const trip = IT.calc(), st = trip.settings;
    let dlg = document.getElementById("day-dlg");
    if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "day-dlg"; document.body.appendChild(dlg); }
    const here = NZ.coordOf(a);
    const rows = trip.days.map((d, i) => {
      const b = d.base && NZ.BASES[d.base], km = b ? Math.round(NZ.km(here, b.c) * NZ.ROAD.factor) : null;
      const meta = (b ? b.name + (km > 30 ? ` · ≈ ${km} km away` : " · nearby") : "No base yet") + (d.mins ? " · " + NZ.hrs(d.mins) + " planned" : "");
      return `<label class="dayrow${km > 150 ? " far" : ""}"><input type="radio" name="d" value="${i}"><span><b>Day ${i + 1}</b> <em>${esc(IT.dayLabel(i))}</em></span><small>${esc(meta)}</small></label>`;
    }).join("");
    dlg.innerHTML = `<form method="dialog"><h3>Add to which day?</h3>
      <p class="sub">${esc(a.name)} · ${esc(a.region)} · ${NZ.durText(a.h)}${a.nz ? " · ≈ " + NZ.nzd(a.nz * (st.travellers || 1)) + " for " + (st.travellers || 1) : ""}<br><small>Draft: ${esc(st.name)}. Days with no base yet will be set to the nearest town.</small></p>
      <div class="dayrows">${rows}</div>
      <div class="dlg-foot"><button class="btn ghost" value="cancel">Cancel</button><button class="btn primary" id="dlg-ok" value="ok" disabled>Add to day</button></div></form>`;
    const ok = dlg.querySelector("#dlg-ok");
    dlg.querySelectorAll("input").forEach((x) => x.addEventListener("change", () => (ok.disabled = false)));
    dlg.onclose = () => {
      if (dlg.returnValue !== "ok") return;
      const pick = dlg.querySelector("input:checked"); if (!pick) return;
      const r = IT.addAct(+pick.value, itemId);
      UI.toast(r.msg, r.ok ? "" : "err");
    };
    dlg.returnValue = ""; dlg.showModal();
  };
  NZ.hrs = (mins) => { mins = Math.round(mins); const h = Math.floor(mins / 60), m = mins % 60; return !h ? m + " min" : m ? h + "h " + String(m).padStart(2, "0") + "m" : h + "h"; };

  /* "✓ On Day 3" badges on cards, kept current as the plan changes */
  UI.placedBadge = (id) => { const days = IT.placedDays(id); return `<span class="placed" data-pid="${esc(id)}" ${days.length ? "" : "hidden"}>✓ <span class="pl-t">${esc(IT.placedLabel(days))}</span></span>`; };
  UI.refreshPlaced = function () {
    document.querySelectorAll(".placed[data-pid]").forEach((el) => {
      const days = IT.placedDays(el.dataset.pid);
      el.hidden = !days.length; el.querySelector(".pl-t").textContent = IT.placedLabel(days);
    });
  };
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-add]"); if (b) UI.pickDay(b.dataset.add); });
  document.addEventListener("nz:itin", () => UI.refreshPlaced());
  document.addEventListener("nz:data", () => UI.refreshPlaced());
})();
