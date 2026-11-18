/* Itinerary builder: drag activities onto days, pick where you sleep each night, travel between bases
   (drive / fly / Cook Strait ferry) appears automatically, per-day time meter and a running NZ$ total. */
(function () {
  const NZ = window.NZ, UI = NZ.ui, IT = NZ.plan, esc = NZ.esc;
  UI.header("itinerary");
  const bname = (id) => (NZ.BASES[id] || { name: id }).name;
  const P = { q: "", region: "", cat: "", votes: "noppass", hidePlaced: true, tab: "acts" };
  let drag = null;

  document.getElementById("print").innerHTML = UI.icons.print + " Print / save as PDF";
  document.getElementById("print").onclick = () => window.print();
  document.getElementById("reset").onclick = () => {
    const st = IT.get();
    if (!confirm(`Clear every day of "${st.name}"? Votes and notes are kept.`)) return;
    for (let i = 0; i < st.len; i++) IT.setDay(i, IT.blankDay());
    IT.changed();
  };

  /* ---------- draft switcher ---------- */
  function renderDrafts() {
    const ds = IT.drafts(), cur = IT.activeId();
    const options = ds.map((d) => {
      const t = IT.calc(d.id), n = t.days.reduce((s, x) => s + x.items.length, 0), by = NZ.person(d.by);
      return `<option value="${esc(d.id)}" ${d.id === cur ? "selected" : ""}>${esc(d.name)}${by ? " (" + esc(by.name) + ")" : ""} · ${d.len} days · ${NZ.nzd(t.totals.all)}${n ? " · " + n + " planned" : ""}</option>`;
    }).join("");
    document.getElementById("drafts").innerHTML = `<label class="draft-pick"><span class="dp-eyebrow">Editing draft</span><select id="draft-select" aria-label="Which itinerary draft to view and edit">${options}</select></label>
      <div class="draft-actions"><button class="btn sm" type="button" id="draft-new">${UI.icons.plus} New draft</button><button class="btn sm ghost" type="button" id="draft-dup">Duplicate</button><button class="btn sm ghost" type="button" id="draft-rename">Rename</button><button class="btn sm ghost" type="button" id="draft-del" ${ds.length > 1 ? "" : `disabled title="Keep at least one draft"`}>Delete</button></div>
      <p class="draft-hint">Everyone can build their own draft (e.g. "Sam's version"), then compare and duplicate one into the group plan. Which draft you're viewing is remembered on this device only.</p>`;
  }
  const draftsEl = document.getElementById("drafts");
  draftsEl.addEventListener("change", (e) => { if (e.target.id === "draft-select") IT.setActive(e.target.value); });
  draftsEl.addEventListener("click", (e) => {
    const me = NZ.me(), st = IT.get();
    if (e.target.closest("#draft-new")) { const n = prompt("Name this draft:", me ? me.name + "'s version" : ""); if (n && n.trim()) IT.newDraft(n.trim()); }
    else if (e.target.closest("#draft-dup")) { const n = prompt("Name for the copy:", st.name + " copy"); if (n && n.trim()) IT.newDraft(n.trim(), st.id); }
    else if (e.target.closest("#draft-rename")) { const n = prompt("Rename this draft:", st.name); if (n && n.trim()) IT.set({ name: n.trim() }); }
    else if (e.target.closest("#draft-del")) { if (IT.drafts().length > 1 && confirm(`Delete "${st.name}" for everyone? This can't be undone.`)) IT.deleteDraft(st.id); }
  });

  /* ---------- trip bar ---------- */
  function renderBar(trip) {
    const t = trip.totals, st = trip.settings, n = trip.days.reduce((s, d) => s + d.items.length, 0), tv = st.travellers || 1;
    const chip = (l, v, tip) => `<span${tip ? ` title="${esc(tip)}"` : ""}><small>${l}</small><b>${NZ.nzd(v)}</b></span>`;
    const route = trip.route.map((b) => `<i>${esc(bname(b))} <small>${trip.nights[b]}n</small></i>`).join("→");
    document.getElementById("tripbar").innerHTML = `<div class="total"><small>Estimated total · ${tv} traveller${tv > 1 ? "s" : ""}</small><b>${NZ.nzd(t.all)}</b><small class="usd">≈ ${NZ.usd(t.all)} · ${NZ.nzd(t.all / tv)} each</small></div>
      <div class="break">${chip("Flights to NZ", t.intl, "International return flights, per the setting below")}${chip("Activities", t.act)}${chip("Getting around", t.travel, "Fuel, domestic flights and ferries between bases")}${chip("Car hire", t.car)}${chip("Places to stay", t.stay)}${chip("Food", t.food, "Daily food allowance per person")}</div>
      <div class="trip-route">${route || "Pick where you're staying on Day 1 to begin"} <small>· ${st.len} days · ${n} planned</small></div>`;
  }

  /* ---------- settings ---------- */
  const airportOpts = (cur) => NZ.AIRPORTS.map((k) => `<option value="${k}" ${cur === k ? "selected" : ""}>${esc(bname(k))}</option>`).join("");
  function keepFocus(box, fn) {
    const ae = document.activeElement, fid = ae && box.contains(ae) && ae.id ? ae.id : null;
    fn(); if (fid) { const el = document.getElementById(fid); if (el) el.focus(); }
  }
  function renderSettings() {
    const st = IT.get(), num = (id, v, step, w) => `<input id="${id}" class="sm-num" type="number" min="0" step="${step}" value="${Number(v) || 0}"${w ? ` style="width:${w}px"` : ""}>`;
    const end = IT.date(st.len - 1);
    keepFocus(document.getElementById("settings"), () => {
      document.getElementById("settings").innerHTML = `<div class="set-line">
        <label>Trip length <button class="btn sm" data-days="-1" type="button" aria-label="Remove a day">−</button><input id="ndays" type="number" min="1" max="45" value="${st.len}"><button class="btn sm" data-days="1" type="button" aria-label="Add a day">+</button> days</label>
        <label>${UI.icons.cal} Start <input id="start" type="date" value="${esc(st.start)}"></label>${end ? `<span class="range">${esc(IT.dayLabel(0))} – ${esc(IT.dayLabel(st.len - 1))}</span>` : ""}
        <label>Travellers ${num("travellers", st.travellers, 1, 60)}</label></div>
        <div class="set-line"><label>${UI.icons.plane} Fly into <select id="arrive">${airportOpts(st.arrive)}</select></label><label>Fly home from <select id="depart">${airportOpts(st.depart)}</select></label>
        <label>International flights <b>NZ$</b>${num("intl", st.intl, 50, 84)} return, per person</label></div>
        <div class="set-line"><label>Food <b>NZ$</b>${num("food", st.food, 5)} per person per day</label><label>${UI.icons.car} Rental car <b>NZ$</b>${num("car", st.car, 5)} per day</label></div>
        <p class="legend">Activities are priced per person × travellers. Drive times use winding-road estimates (≈ ${NZ.ROAD.kmh} km/h) with fuel at ≈ NZ$${NZ.ROAD.fuelPerKm}/km. Flights and the Cook Strait ferry are rough per-person fares. Stays are whatever you enter per night. Treat every number as a ballpark.</p>`;
    });
  }
  const setsEl = document.getElementById("settings");
  const setLen = (n) => {
    n = Math.max(1, Math.min(45, n | 0)); const st = IT.get();
    if (n < st.len && IT.days().slice(n).some((d) => d.base || d.items.length || d.stay) && !confirm(`Removing days ${n + 1}–${st.len} deletes what's planned on them. Continue?`)) return renderSettings();
    IT.setLen(n);
  };
  setsEl.addEventListener("click", (e) => { const b = e.target.closest("[data-days]"); if (b) setLen(IT.get().len + +b.dataset.days); });
  setsEl.addEventListener("change", (e) => {
    const t = e.target, amt = () => Math.max(0, Math.round(+t.value || 0));
    if (t.id === "ndays") setLen(+t.value);
    else if (t.id === "start") IT.set({ start: t.value });
    else if (["arrive", "depart"].includes(t.id)) IT.set({ [t.id]: t.value });
    else if (t.id === "travellers") IT.set({ travellers: Math.max(1, amt()) });
    else if (["food", "car", "intl"].includes(t.id)) IT.set({ [t.id]: amt() });
  });

  /* ---------- base notes: unplanned must-dos near where you're staying ---------- */
  function renderNotes(trip) {
    const box = document.getElementById("basenotes");
    if (!trip.route.length) { box.innerHTML = ""; return; }
    const seen = new Set(), all = NZ.all();
    const cards = trip.route.filter((b) => !seen.has(b) && seen.add(b)).map((b) => {
      const c = NZ.BASES[b].c;
      const near = all.filter((a) => a.m >= 4 && !IT.placedDays(a.id).length && NZ.km(NZ.coordOf(a), c) < 60).sort((x, y) => y.m - x.m || NZ.groupScore(y.id) - NZ.groupScore(x.id)).slice(0, 3);
      return `<article class="base-card"><div class="bc-head"><b>${esc(bname(b))}</b><span>${trip.nights[b]} night${trip.nights[b] > 1 ? "s" : ""}</span></div>
        ${near.length ? `<ul>${near.map((a) => `<li><button class="linkbtn" type="button" data-add="${esc(a.id)}">+ ${esc(a.name)}</button></li>`).join("")}</ul>` : `<p class="bc-none">No unplanned must-dos within an hour or so.</p>`}</article>`;
    }).join("");
    box.innerHTML = `<h3>Must-dos near where you're staying, not planned yet</h3><div class="base-cards">${cards}</div>`;
  }

  /* ---------- pool (left column) ---------- */
  const dragAttr = (o) => `draggable="true" data-drag="${esc(JSON.stringify(o))}"`;
  const grip = `<span class="grip">${UI.icons.grip}</span>`;
  const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(l)}</option>`;
  const voteOk = (a) => {
    const me = NZ.meId(), v = me ? NZ.vote(a.id, me) : null;
    return P.votes === "all" || (P.votes === "noppass" && v !== "pass") || (P.votes === "mine" && (v === "love" || v === "like")) || (P.votes === "group" && NZ.groupScore(a.id) > 0);
  };
  function poolBody() {
    if (P.tab === "extra") {
      return IT.PRESETS.map((p, n) => `<div class="pitem" ${dragAttr({ k: "preset", n })}>${grip}<div><b>${esc(p.name)}</b><small>${p.hrs ? p.hrs + " h" : "no set time"} · ${p.cost ? NZ.nzd(p.cost) : "no cost"}</small></div><span></span></div>`).join("") +
        `<form id="custom" class="pitem custom-form"><b>Your own block</b><input name="name" placeholder="e.g. Dinner with Sam's cousins" required><input name="hrs" type="number" step="0.5" min="0" placeholder="Hours"><input name="cost" type="number" min="0" placeholder="NZ$ total"><select name="day">${Array.from({ length: IT.get().len }, (_, i) => `<option value="${i}">Day ${i + 1}</option>`).join("")}</select><button class="btn sm primary" type="submit">Add to day</button></form>`;
    }
    const q = P.q.trim().toLowerCase();
    const all = NZ.all().filter((a) => NZ.onIsland(a) && (!P.region || a.region === P.region) && (!P.cat || a.cats.includes(P.cat)) && voteOk(a) && (!q || (a.name + " " + a.region + " " + a.base).toLowerCase().includes(q)));
    const rows = all.filter((a) => !(P.hidePlaced && IT.placedDays(a.id).length)).sort((a, b) => a.region.localeCompare(b.region) || b.m - a.m);
    const hidden = all.length - rows.length, tv = IT.get().travellers || 1;
    if (!rows.length) return `<p class="pool-empty">${hidden ? "Everything that matches is already planned. Untick “Hide planned” to see it." : P.votes === "mine" || P.votes === "group" ? "Nothing voted for yet. Switch the filter above, or vote on cards in Explore." : "No matches."}</p>`;
    let lastRegion = "";
    return rows.map((a) => {
      const head = a.region !== lastRegion ? `<p class="pool-region">${esc((lastRegion = a.region))}</p>` : "";
      const placed = IT.placedDays(a.id).length, gs = NZ.groupScore(a.id);
      return `${head}<div class="pitem c-${a.cats[0]}${placed ? " is-placed" : ""}" ${dragAttr({ k: "act", id: a.id })}>${grip}<div><b>${esc(a.name)}</b><small>${NZ.durText(a.h)} · ${a.nz ? NZ.nzd(a.nz * tv) : "free"} · must-do ${a.m}/5${gs ? ` · group ${gs > 0 ? "+" : ""}${gs}` : ""}</small>${placed ? `<span class="pline">${UI.placedBadge(a.id)}</span>` : ""}</div><button class="mini-add" type="button" data-add="${esc(a.id)}" aria-label="Add ${esc(a.name)}">${UI.icons.plus}</button></div>`;
    }).join("");
  }
  function renderPool() {
    const box = document.getElementById("pool"), list = box.querySelector("#plist"), st = list ? list.scrollTop : 0;
    keepFocus(box, () => {
      const isl = NZ.island(), regions = isl === "all" ? NZ.REGIONS.S.concat(NZ.REGIONS.N) : NZ.REGIONS[isl];
      const filters = P.tab === "extra" ? "" : `<select id="pvotes" aria-label="Vote filter">${opt("noppass", "Everything I haven't passed", P.votes)}${opt("group", "Group favourites (score > 0)", P.votes)}${opt("mine", "My loves + keens", P.votes)}${opt("all", "Everything", P.votes)}</select>
        <div class="row2"><select id="pregion" aria-label="Region">${opt("", "All regions", P.region)}${regions.map((r) => opt(r, r, P.region)).join("")}</select><select id="pcat" aria-label="Category">${opt("", "All categories", P.cat)}${NZ.CATS.map((c) => opt(c.k, c.label, P.cat)).join("")}</select></div>
        <input id="pq" type="search" placeholder="Search…" value="${esc(P.q)}" aria-label="Search"><label class="check"><input type="checkbox" id="phide" ${P.hidePlaced ? "checked" : ""}> Hide planned</label>`;
      box.innerHTML = `<div class="pool-head"><div class="seg" id="ptab">${[["acts", "Activities"], ["extra", "Extras & own blocks"]].map((t) => `<button type="button" data-t="${t[0]}" aria-pressed="${P.tab === t[0]}">${t[1]}</button>`).join("")}</div>${filters}</div>
        <div class="pool-list" id="plist">${poolBody()}</div><div class="pool-note">Drag onto a day, or tap + · Prices are for ${IT.get().travellers || 1} · Island follows the switch at the top</div>`;
    });
    const l2 = box.querySelector("#plist"); if (l2 && st) l2.scrollTop = st;
  }
  const pool = document.getElementById("pool");
  pool.addEventListener("click", (e) => { const b = e.target.closest("#ptab button"); if (b) { P.tab = b.dataset.t; renderPool(); } });
  pool.addEventListener("change", (e) => {
    const t = e.target;
    if (t.id === "pvotes") P.votes = t.value; else if (t.id === "pregion") P.region = t.value; else if (t.id === "pcat") P.cat = t.value; else if (t.id === "phide") P.hidePlaced = t.checked; else return;
    renderPool();
  });
  pool.addEventListener("input", (e) => { if (e.target.id === "pq") { P.q = e.target.value; renderPool(); } });
  pool.addEventListener("submit", (e) => {
    if (e.target.id !== "custom") return; e.preventDefault();
    const f = new FormData(e.target), r = IT.addCustom(+f.get("day"), { name: f.get("name"), hrs: f.get("hrs"), cost: f.get("cost") });
    UI.toast(r.msg); e.target.reset();
  });

  /* ---------- days ---------- */
  const MODE = { drive: ["car", "Drive"], fly: ["plane", "Fly"], ferry: ["ferry", "Ferry"] };
  function travelHtml(t, kind, day) {
    if (!t) return "";
    const first = t.legs[0], last = t.legs[t.legs.length - 1], tv = IT.get().travellers || 1;
    const title = kind === "depart" ? `Head to ${esc(bname(last.to))} for the flight home` : `${esc(bname(first.from))} → ${esc(bname(last.to))}`;
    const legs = t.legs.map((l) => `<span>${UI.icons[MODE[l.mode][0]]} ${MODE[l.mode][1]} ${esc(bname(l.from))} → ${esc(bname(l.to))}${l.via && l.via.length ? ` <em>via ${esc(l.via.map(bname).join(", "))}</em>` : ""} · ${l.mode === "drive" ? "≈ " + l.km + " km · " : ""}${NZ.hrs(l.mins)}${l.pp ? " · ≈ " + NZ.nzd(l.pp * tv) : ""}${l.car ? " · " + (l.mode === "drive" ? "fuel" : "car") + " ≈ " + NZ.nzd(l.car) : ""}</span>`).join("")
      + (t.legs.some((l) => l.buffer) ? `<span>${UI.icons.clock} includes check-in &amp; getting to the terminal</span>` : "") + t.legs.filter((l) => l.note).map((l) => `<span class="t-note">${esc(l.note)}</span>`).join("");
    const pref = (day.raw.pref || "");
    const alt = kind === "arrive" && t.alt ? `<div class="seg t-alt">${[["drive", t.alt.drive.legs.some((l) => l.mode === "ferry") ? "Drive + ferry" : "Drive", t.alt.drive], ["fly", "Fly", t.alt.fly]].map(([k, l, o]) => `<button type="button" data-pref="${k}" data-day="${day.idx}" aria-pressed="${t.pref === k}">${l} · ${NZ.hrs(o.mins)}</button>`).join("")}${pref ? `<button type="button" data-pref="" data-day="${day.idx}" title="Let the planner choose">Auto</button>` : ""}</div>` : "";
    return `<div class="travel ${kind}"><div class="t-head"><span class="t-title">${UI.icons[MODE[t.legs.find((l) => l.mode !== "drive") ? t.legs.find((l) => l.mode !== "drive").mode : "drive"][0]]} ${title}</span><span class="t-meta">${NZ.hrs(t.mins)} · ≈ ${NZ.nzd(t.pp * tv + t.car)}</span></div><div class="legs">${legs}</div>${alt}</div>`;
  }
  function baseSelect(d) {
    const group = (isl) => `<optgroup label="${NZ.ISLANDS[isl]}">${NZ.BASE_ORDER.filter((b) => NZ.BASES[b].island === isl).map((b) => `<option value="${b}" ${d.raw.base === b ? "selected" : ""}>${esc(bname(b))}</option>`).join("")}</optgroup>`;
    const isl = NZ.island(), order = isl === "N" ? ["N", "S"] : ["S", "N"];
    return `<select data-base="${d.idx}" aria-label="Where you sleep on day ${d.idx + 1}"><option value="">Where are we sleeping?</option>${order.map(group).join("")}</select>`;
  }
  function dayHtml(d) {
    const st = IT.get(), note = IT.dayNote(d.idx);
    const tMins = (d.travel ? d.travel.mins : 0) + (d.depart ? d.depart.mins : 0), aMins = d.mins - tMins;
    const cls = d.mins > IT.CAP ? "max" : d.mins > 480 ? "busy" : "";
    const flag = !d.mins ? "" : d.mins > IT.CAP ? `<span class="flag max">Too packed</span>` : d.mins > 480 ? `<span class="flag busy">Full day</span>` : `<span class="flag ok">${tMins >= 180 ? "Travel day" : "Relaxed"}</span>`;
    const blocks = d.items.map((x) => {
      if (x.t === "gone") return `<div class="block c"><span class="grip"></span><div><b>Removed activity</b><small>Someone deleted this group-added activity</small></div><button class="rm" type="button" data-rm="${x.uid}" data-day="${d.idx}" aria-label="Remove">${UI.icons.x}</button></div>`;
      const body = x.t === "a"
        ? `<b>${esc(x.a.name)}</b><small>${NZ.durText(x.a.h)} · ${esc(x.a.region)}${x.a.link ? ` · <a href="${esc(x.a.link.url)}" target="_blank" rel="noopener noreferrer">details</a>` : ""}</small>${x.far ? `<span class="far" title="Straight-line distance × road factor from where you're sleeping">≈ ${x.far} km from base</span>` : ""}`
        : `<b>${esc(x.name)}</b><small>${x.hrs ? x.hrs + " h" : "no set time"}</small>`;
      return `<div class="block${x.t === "c" ? " c" : " c-" + x.a.cats[0]}" ${dragAttr({ k: "block", day: d.idx, uid: x.uid })} data-uid="${x.uid}"><span class="grip">${UI.icons.grip}</span><div>${body}</div><div><div class="cost">${x.cost ? NZ.nzd(x.cost) : "free"}</div><button class="rm" type="button" data-rm="${x.uid}" data-day="${d.idx}" aria-label="Remove">${UI.icons.x}</button></div></div>`;
    }).join("");
    const stay = d.raw.stay || {};
    const staySlot = `<div class="stay-slot${stay.name ? " has" : ""}">${UI.icons.bed}<input class="st-name" id="st-n-${d.idx}" data-stay="${d.idx}" placeholder="${d.base ? "Where we're staying in " + esc(bname(d.base)) : "Pick a base first"}" value="${esc(stay.name || "")}" ${d.base ? "" : "disabled"} aria-label="Accommodation"><label class="st-cost">NZ$<input type="number" id="st-c-${d.idx}" min="0" step="10" data-staycost="${d.idx}" value="${stay.cost || ""}" placeholder="/night" ${d.base ? "" : "disabled"} aria-label="Cost per night"></label></div>`;
    return `<article class="day" data-day="${d.idx}"><div class="day-head">
      <div class="day-title"><h4>Day ${d.idx + 1}<em>${esc(IT.dayLabel(d.idx))}</em></h4><div class="day-tools"><button class="btn sm ghost" type="button" data-clear="${d.idx}">Clear</button></div></div>
      ${note ? `<p class="day-note">${esc(note)}</p>` : ""}${baseSelect(d)}
      <div class="meter ${cls}" role="img" aria-label="${NZ.hrs(d.mins)} planned"><i class="tr" style="width:${Math.min(100, (tMins / IT.CAP) * 100)}%"></i><i class="ac" style="width:${Math.min(100 - Math.min(100, (tMins / IT.CAP) * 100), (aMins / IT.CAP) * 100)}%"></i></div>
      <div class="meter-cap"><span>${d.mins ? NZ.hrs(d.mins) + " planned" : "Open day"}${tMins ? ` (${NZ.hrs(tMins)} travel)` : ""}</span>${flag}</div></div>
      ${travelHtml(d.travel, "arrive", d)}${staySlot}
      <div class="blocks">${blocks || `<div class="hint">Drag activities here</div>`}</div>
      ${travelHtml(d.depart, "depart", d)}
      <div class="day-foot"><span class="f-l"><span>Day total</span>${d.base ? `<small>food ${NZ.nzd(d.costs.food)} · car ${NZ.nzd(d.costs.car)}</small>` : ""}</span><b>${NZ.nzd(d.cost)}</b></div></article>`;
  }
  function render() {
    const trip = IT.calc();
    renderBar(trip); renderNotes(trip);
    keepFocus(document.getElementById("days"), () => { document.getElementById("days").innerHTML = trip.days.map(dayHtml).join(""); });
  }

  /* ---------- day interactions ---------- */
  const daysEl = document.getElementById("days");
  daysEl.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.base != null) { const i = +t.dataset.base, d = IT.day(i); d.base = t.value || null; d.pref = ""; if (!d.base) d.stay = null; IT.setDay(i, d); IT.changed(); }
    else if (t.dataset.stay != null) { const i = +t.dataset.stay, d = IT.day(i); d.stay = Object.assign({}, d.stay, { name: t.value.trim().slice(0, 80) }); if (!d.stay.name && !d.stay.cost) d.stay = null; IT.setDay(i, d); IT.changed(); }
    else if (t.dataset.staycost != null) { const i = +t.dataset.staycost, d = IT.day(i); d.stay = Object.assign({ name: "" }, d.stay, { cost: Math.max(0, Math.round(+t.value || 0)) }); if (!d.stay.name && !d.stay.cost) d.stay = null; IT.setDay(i, d); IT.changed(); }
  });
  daysEl.addEventListener("click", (e) => {
    const rm = e.target.closest("[data-rm]"), cl = e.target.closest("[data-clear]"), pf = e.target.closest("[data-pref]");
    if (rm) { const i = +rm.dataset.day, d = IT.day(i); d.items = d.items.filter((x) => x.uid !== rm.dataset.rm); IT.setDay(i, d); IT.changed(); }
    else if (pf) { const i = +pf.dataset.day, d = IT.day(i); d.pref = pf.dataset.pref; IT.setDay(i, d); IT.changed(); }
    else if (cl) { const i = +cl.dataset.clear, d = IT.day(i); if ((d.base || d.items.length || d.stay) && confirm(`Clear Day ${i + 1}?`)) { IT.setDay(i, IT.blankDay()); IT.changed(); } }
  });

  /* ---------- drag & drop ---------- */
  const clearOver = () => document.querySelectorAll(".day.over").forEach((x) => x.classList.remove("over"));
  document.addEventListener("dragstart", (e) => {
    const el = e.target.closest && e.target.closest("[data-drag]"); if (!el) return;
    try { drag = JSON.parse(el.dataset.drag); } catch (x) { return; }
    e.dataTransfer.effectAllowed = "copyMove"; e.dataTransfer.setData("text/plain", el.dataset.drag);
    setTimeout(() => el.classList.add("dragging"), 0);
  });
  document.addEventListener("dragend", () => { drag = null; document.querySelectorAll(".dragging").forEach((x) => x.classList.remove("dragging")); clearOver(); });
  daysEl.addEventListener("dragover", (e) => {
    const d = e.target.closest(".day"); if (!d || !drag) return; e.preventDefault();
    e.dataTransfer.dropEffect = drag.k === "block" ? "move" : "copy";
    document.querySelectorAll(".day.over").forEach((x) => x !== d && x.classList.remove("over")); d.classList.add("over");
  });
  daysEl.addEventListener("dragleave", (e) => { const d = e.target.closest(".day"); if (d && !d.contains(e.relatedTarget)) d.classList.remove("over"); });
  daysEl.addEventListener("drop", (e) => {
    const dayEl = e.target.closest(".day"); if (!dayEl || !drag) return;
    e.preventDefault(); clearOver();
    const i = +dayEl.dataset.day, blockEl = e.target.closest(".block");
    const target = IT.day(i); let at = null, res = null;
    if (blockEl) { at = target.items.findIndex((x) => x.uid === blockEl.dataset.uid); const r = blockEl.getBoundingClientRect(); if (e.clientY > r.top + r.height / 2) at++; }
    if (drag.k === "act") res = IT.addAct(i, drag.id, at);
    else if (drag.k === "preset") res = IT.addCustom(i, IT.PRESETS[drag.n], at);
    else if (drag.k === "block") {
      const src = IT.day(drag.day), from = src.items.findIndex((x) => x.uid === drag.uid);
      if (from >= 0) {
        const [item] = src.items.splice(from, 1);
        if (drag.day === i) { if (at != null && from < at) at--; src.items.splice(at == null ? src.items.length : at, 0, item); IT.setDay(i, src); }
        else { target.items.splice(at == null ? target.items.length : at, 0, item); IT.setDay(drag.day, src); IT.setDay(i, target); }
        IT.changed(); res = { ok: true, msg: `Moved to Day ${i + 1}` };
      }
    }
    if (res) UI.toast(res.msg, res.ok ? "" : "err");
    drag = null;
  });

  /* ---------- re-render triggers ---------- */
  const all = () => { renderDrafts(); renderSettings(); renderPool(); render(); };
  document.addEventListener("nz:itin", all);
  document.addEventListener("nz:data", all);   // a sync brought in someone else's edits
  document.addEventListener("nz:island", () => { renderPool(); render(); });
  document.addEventListener("nz:vote", () => { if (P.votes !== "all" && P.votes !== "noppass") renderPool(); });
  all();
})();
