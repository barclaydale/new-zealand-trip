/* Map page: a real Leaflet map (free satellite / street tiles, no API key) of every activity, coloured by
   category, plus an animated day-by-day playback of the itinerary draft you're viewing: driving, flying or
   ferrying between bases, stopping at each planned activity, and going dark overnight. Coordinates are
   approximate (see js/geo.js). */
(function () {
  const NZ = window.NZ, UI = NZ.ui, IT = NZ.plan, esc = NZ.esc;
  UI.header("map");
  const bname = (id) => (NZ.BASES[id] || { name: id }).name;
  const CAT_COLOR = { classics: "#2e6d93", nature: "#2f6b4f", onlynz: "#3d8a85", history: "#8a6a2f", culture: "#c8432f", food: "#7d3b4a" };
  const MODE_ICON = { drive: "🚗", fly: "✈", ferry: "⛴" };
  const BOUNDS = { S: [[-47.4, 166.3], [-40.4, 174.4]], N: [[-41.6, 172.6], [-34.3, 178.6]], all: [[-47.4, 166.3], [-34.3, 178.6]] };

  /* ---------- base map ---------- */
  const map = L.map("leaflet-map", { zoomSnap: 0.25 });
  map.zoomControl.setPosition("bottomleft");   // top-left is where the story bar sits
  const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 17, attribution: "Tiles &copy; Esri" });
  const street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" });
  street.addTo(map);
  L.control.layers({ Map: street, Satellite: sat }, {}, { position: "topright" }).addTo(map);
  L.control.scale({ imperial: true, metric: true, position: "bottomright" }).addTo(map);
  const fitIsland = () => map.fitBounds(BOUNDS[NZ.island()] || BOUNDS.all, { padding: [20, 20] });
  fitIsland();
  document.getElementById("map-legend").innerHTML = NZ.CATS.map((c) => `<span><i style="background:${CAT_COLOR[c.k]}"></i>${esc(c.short)}</span>`).join("");

  /* ---------- explore mode ---------- */
  const cluster = L.markerClusterGroup({ maxClusterRadius: 40, spiderfyOnMaxZoom: true, showCoverageOnHover: false });
  const F = { cat: "", votes: "all", planned: false, gems: false };
  const markers = {};   // id -> marker (rebuilt when group-added activities change)
  function popupHtml(a) {
    return `<div class="map-pop"><b>${esc(a.name)}</b><small>${esc(a.region)} · ${esc(a.cats.map((k) => NZ.CAT[k].short).join(", "))}</small>
      <small>${a.nz ? NZ.nzd(a.nz) + " pp" : "Free"} · ${NZ.durText(a.h)} · must-do ${a.m}/5${a.gem ? " · hidden gem" : ""}</small>
      <div class="vote-wrap">${UI.votes(a)}</div>
      <div class="pop-foot">${UI.placedBadge(a.id)}<button type="button" class="btn sm add" data-add="${esc(a.id)}">${UI.icons.plus}<span>Itinerary</span></button><a href="category.html?c=${a.cats[0]}">${esc(NZ.CAT[a.cats[0]].short)} →</a></div></div>`;
  }
  function buildMarkers() {
    Object.keys(markers).forEach((k) => delete markers[k]);
    NZ.all().forEach((a) => {
      const m = L.circleMarker(NZ.coordOf(a), { radius: a.m >= 5 ? 9 : 7, weight: 2, color: "#fff", fillColor: CAT_COLOR[a.cats[0]], fillOpacity: 0.92 });
      m.bindPopup(() => popupHtml(a), { minWidth: 230 });
      m.on("popupopen", () => { openId = a.id; });
      markers[a.id] = { m, a };
    });
  }
  let openId = null;
  const voteOk = (a) => {
    const me = NZ.meId(), v = me ? NZ.vote(a.id, me) : null;
    return F.votes === "all" || (F.votes === "nopass" && v !== "pass") || (F.votes === "mine" && (v === "love" || v === "like")) || (F.votes === "group" && NZ.groupScore(a.id) > 0);
  };
  function refreshExplore() {
    cluster.clearLayers(); let shown = 0;
    Object.values(markers).forEach(({ m, a }) => {
      if (!NZ.onIsland(a) || (F.cat && !a.cats.includes(F.cat)) || !voteOk(a) || (F.gems && !a.gem) || (F.planned && !IT.placedDays(a.id).length)) return;
      cluster.addLayer(m); shown++;
    });
    const c = document.getElementById("map-count"); if (c) c.textContent = `Showing ${shown} of ${Object.keys(markers).length}`;
  }
  function renderFilters() {
    const opt = (v, l, cur) => `<option value="${v}" ${v === cur ? "selected" : ""}>${esc(l)}</option>`;
    document.getElementById("map-filters").innerHTML = `<select id="mcat" aria-label="Category">${opt("", "All categories", F.cat)}${NZ.CATS.map((c) => opt(c.k, c.label, F.cat)).join("")}</select>
      <select id="mvotes" aria-label="Vote filter">${opt("all", "Everything", F.votes)}${opt("nopass", "Everything I haven't passed", F.votes)}${opt("group", "Group favourites", F.votes)}${opt("mine", "My loves + keens", F.votes)}</select>
      <label class="check"><input type="checkbox" id="mplanned" ${F.planned ? "checked" : ""}> Only what's in my itinerary draft</label>
      <label class="check"><input type="checkbox" id="mgems" ${F.gems ? "checked" : ""}> Hidden gems</label>
      <span class="map-count" id="map-count"></span>`;
  }
  document.getElementById("map-filters").addEventListener("change", (e) => {
    const t = e.target;
    if (t.id === "mcat") F.cat = t.value; else if (t.id === "mvotes") F.votes = t.value; else if (t.id === "mplanned") F.planned = t.checked; else if (t.id === "mgems") F.gems = t.checked; else return;
    refreshExplore();
  });

  /* ---------- itinerary story mode ---------- */
  const story = (function () {
    const trail = L.layerGroup(), bases = L.layerGroup();
    const mover = L.marker([0, 0], { icon: L.divIcon({ className: "map-mover", iconSize: [18, 18] }), interactive: false });
    let wps = [], idx = 0, segT = 0, phase = "idle", playing = false, speed = 1, dwellLeft = 0, lastTs = 0;
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const travelMs = (wp) => Math.max(1000, Math.min(5000, (wp.mins || 20) * 10));
    const dwellMs = (wp) => (wp.kind === "night" ? 2000 : wp.kind === "via" ? 80 : 1400);

    function build() {
      const trip = IT.calc(), out = [], tv = trip.settings.travellers || 1;
      const leg = (l, di) => ({ kind: "travel", day: di, mode: l.mode, mins: l.mins, coord: NZ.BASES[l.to].c, caption: `${MODE_ICON[l.mode]} ${bname(l.from)} → ${bname(l.to)} · ${NZ.hrs(l.mins)}${l.mode === "drive" ? " · ≈ " + l.km + " km" : " · ≈ " + NZ.nzd(l.pp * tv)}` });
      const arrive = trip.settings.arrive && NZ.BASES[trip.settings.arrive];
      if (arrive && trip.route.length) out.push({ kind: "start", day: 0, coord: arrive.c, caption: `✈ Land in ${arrive.name}` });
      trip.days.forEach((d, di) => {
        const legsOf = (t) => t.legs.forEach((l) => { (l.via || []).forEach((v) => out.push({ kind: "via", day: di, mode: "drive", mins: 30, coord: NZ.BASES[v].c, caption: `🚗 Driving through ${bname(v)}` })); out.push(leg(l, di)); });
        if (d.travel) legsOf(d.travel);
        d.items.filter((x) => x.t === "a").forEach((x) => out.push({ kind: "stop", day: di, coord: NZ.coordOf(x.a), caption: x.a.name }));
        if (d.base) {
          const stay = d.raw.stay && d.raw.stay.name;
          out.push({ kind: "night", day: di, coord: NZ.BASES[d.base].c, caption: `🌙 Night ${di + 1} · ${stay ? stay + ", " : ""}${bname(d.base)}` });
        }
        if (d.depart) { legsOf(d.depart); out.push({ kind: "end", day: di, coord: NZ.BASES[d.depart.legs[d.depart.legs.length - 1].to].c, caption: "🏁 Flight home" }); }
      });
      // base pins so the whole route is visible from the start
      bases.clearLayers();
      trip.route.forEach((b) => L.circleMarker(NZ.BASES[b].c, { radius: 6, weight: 2, color: "#fff", fillColor: "#12282b", fillOpacity: 0.9 }).bindTooltip(`${bname(b)} · ${trip.nights[b]} night${trip.nights[b] > 1 ? "s" : ""}`).addTo(bases));
      return out;
    }
    const caption = (wp) => { const el = document.getElementById("story-caption"); if (el && wp) el.innerHTML = `<b>Day ${wp.day + 1}</b> · ${esc(wp.caption)}`; };
    const dayLabel = () => { const el = document.getElementById("story-day"), wp = wps[Math.min(idx, wps.length - 1)]; if (el) el.textContent = wp ? `Day ${wp.day + 1}${IT.dayLabel(wp.day) ? " · " + IT.dayLabel(wp.day) : ""}` : ""; };
    const setNight = (on) => document.querySelector(".map-wrap").classList.toggle("night", !!on);
    const controls = () => { const b = document.getElementById("story-play"); if (b) b.textContent = playing ? "Pause" : phase === "done" ? "Replay" : "Play"; };
    function reset() {
      wps = build(); idx = 0; segT = 0; phase = wps.length ? "dwell" : "idle"; dwellLeft = 400; playing = false; lastTs = 0;
      setNight(false); trail.clearLayers();
      if (!map.hasLayer(bases)) bases.addTo(map);
      if (!wps.length) { map.removeLayer(mover); return; }
      mover.setLatLng(wps[0].coord); if (!map.hasLayer(mover)) mover.addTo(map); if (!map.hasLayer(trail)) trail.addTo(map);
      map.fitBounds(L.latLngBounds(wps.map((w) => w.coord)), { padding: [60, 60], maxZoom: 9 });
      caption(wps[0]); dayLabel(); controls();
    }
    function tick(ts) {
      requestAnimationFrame(tick);
      if (!playing) { lastTs = ts; return; }
      const dt = Math.min(200, ts - (lastTs || ts)) * speed; lastTs = ts;
      if (phase === "move") {
        const to = wps[idx + 1]; segT += dt / travelMs(to);
        if (segT >= 1) {
          mover.setLatLng(to.coord); idx++; phase = "dwell"; dwellLeft = dwellMs(to);
          trail.addLayer(L.polyline([wps[idx - 1].coord, to.coord], { color: to.mode === "fly" ? "#e8b630" : to.mode === "ferry" ? "#2e6d93" : "#c8432f", weight: 3, opacity: 0.75, dashArray: to.mode === "fly" || to.mode === "ferry" ? "4 8" : null }));
          caption(to); dayLabel(); setNight(to.kind === "night");
          if (!map.getBounds().pad(-0.15).contains(to.coord)) map.panTo(to.coord, { animate: true, duration: 0.6 });
        } else mover.setLatLng(lerp(wps[idx].coord, to.coord, ease(segT)));
      } else if (phase === "dwell") {
        dwellLeft -= dt;
        if (dwellLeft <= 0) { setNight(false); if (idx >= wps.length - 1) { phase = "done"; playing = false; controls(); } else { phase = "move"; segT = 0; } }
      }
    }
    requestAnimationFrame(tick);
    return {
      start: reset,
      clear() { playing = false; map.removeLayer(mover); map.removeLayer(trail); map.removeLayer(bases); setNight(false); },
      toggle() { if (!wps.length) return; if (phase === "done") reset(); playing = !playing; lastTs = 0; controls(); },
      setSpeed(s) { speed = s; },
      jump(dir) {
        if (!wps.length) return;
        const cur = wps[idx].day, target = cur + dir, at = dir > 0 ? wps.findIndex((w) => w.day >= target) : wps.findIndex((w) => w.day === Math.max(0, target));
        if (at < 0) return;
        playing = false; idx = at; segT = 0; phase = "dwell"; dwellLeft = 1;
        mover.setLatLng(wps[idx].coord); caption(wps[idx]); dayLabel(); setNight(wps[idx].kind === "night"); map.panTo(wps[idx].coord); controls();
      },
      empty: () => !wps.length
    };
  })();

  function renderStoryBar() {
    document.getElementById("story-bar").innerHTML = `<div class="story-controls">
        <select id="story-draft" aria-label="Which draft to play">${IT.drafts().map((d) => `<option value="${esc(d.id)}" ${d.id === IT.activeId() ? "selected" : ""}>${esc(d.name)}</option>`).join("")}</select>
        <button class="btn sm" type="button" id="story-play">Play</button><button class="btn sm" type="button" id="story-prev">◂ Day</button><button class="btn sm" type="button" id="story-next">Day ▸</button>
        <select id="story-speed" aria-label="Playback speed">${[0.5, 1, 2, 4].map((s) => `<option value="${s}" ${s === 1 ? "selected" : ""}>${s}×</option>`).join("")}</select>
        <span id="story-day" class="chip"></span></div>
      <div class="story-caption" id="story-caption"></div>
      <div class="story-empty" id="story-empty" hidden>This draft has nothing planned yet. <a href="itinerary.html">Plan some days</a> to watch it play out here.</div>`;
  }
  const bar = document.getElementById("story-bar");
  bar.addEventListener("click", (e) => {
    if (e.target.closest("#story-play")) story.toggle();
    else if (e.target.closest("#story-prev")) story.jump(-1);
    else if (e.target.closest("#story-next")) story.jump(1);
  });
  bar.addEventListener("change", (e) => { if (e.target.id === "story-speed") story.setSpeed(+e.target.value); else if (e.target.id === "story-draft") IT.setActive(e.target.value); });
  function startStory() { renderStoryBar(); story.start(); document.getElementById("story-empty").hidden = !story.empty(); }

  /* ---------- mode toggle ---------- */
  let mode = null;
  document.getElementById("map-mode").addEventListener("click", (e) => { const b = e.target.closest("[data-mode]"); if (b) setMode(b.dataset.mode); });
  function setMode(m) {
    mode = m;
    document.querySelectorAll("#map-mode button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
    document.getElementById("map-filters").hidden = m !== "explore";
    document.getElementById("map-legend").hidden = m !== "explore";
    bar.hidden = m !== "story";
    if (m === "explore") { story.clear(); cluster.addTo(map); fitIsland(); }
    else { map.removeLayer(cluster); startStory(); }
  }

  // voting inside a popup: refresh its buttons in place (re-filtering now would close the popup)
  document.addEventListener("nz:vote", () => {
    const el = document.querySelector(".leaflet-popup .vote-wrap"), a = openId && NZ.get(openId);
    if (el && a) el.innerHTML = UI.votes(a);
  });
  map.on("popupclose", () => { openId = null; refreshExplore(); });
  const onData = () => { buildMarkers(); if (!openId) refreshExplore(); if (mode === "story") startStory(); };
  document.addEventListener("nz:data", onData);
  document.addEventListener("nz:itin", () => { if (mode === "story") startStory(); else if (!openId) refreshExplore(); });
  document.addEventListener("nz:island", () => { refreshExplore(); if (mode === "explore") fitIsland(); });

  buildMarkers(); renderFilters(); refreshExplore();
  setMode(new URLSearchParams(location.search).get("mode") === "story" ? "story" : "explore");
})();
