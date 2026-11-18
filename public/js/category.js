/* Explore: one category (or everything) with search, region, price / time / must-do filters and sorting. */
(function () {
  const NZ = window.NZ, UI = NZ.ui, esc = NZ.esc;
  UI.header("explore");
  const ck = new URLSearchParams(location.search).get("c");
  const cat = NZ.CAT[ck] || null;

  /* hero */
  const hero = document.getElementById("chero");
  if (cat) hero.classList.add("c-" + cat.k);
  document.getElementById("chero-art").innerHTML = cat ? UI.catArt(cat, cat.k + "-hero") : UI.art("fiord", NZ.CAT.nature.pal, "all-hero", "A fiord");
  document.getElementById("c-eyebrow").textContent = cat ? "Category" : "Everything";
  document.getElementById("c-title").textContent = cat ? cat.label : "Everything to do";
  document.getElementById("c-tag").textContent = cat ? cat.blurb : "All six categories in one list. Filter it down, or pick a category in the bar above.";
  document.title = (cat ? cat.label : "Explore") + " · Fern & Fiord";
  document.querySelector(".search").innerHTML = document.querySelector(".search").innerHTML.replace("__SEARCH__", UI.icons.search);

  /* filters */
  const F = { q: "", region: "", sort: "must", price: "any", dur: "any", must: "any", unvoted: false, hidepass: false, custom: false };
  const PRICE = [["any", "Any"], ["0", "Free"], ["1", "≤ $"], ["2", "≤ $$"], ["3", "≤ $$$"]];
  const DUR = [["any", "Any"], ["3", "≤ 3 h"], ["6", "Half day"], ["12", "Full day"], ["99", "Overnight+"]];
  const DUR_RANGE = { 3: [0, 3], 6: [3, 6], 12: [6, 12], 99: [12, Infinity] };   // hours, (lo, hi]
  const MUST = [["any", "Any"], ["4", "4+"], ["5", "Don't miss"]];
  const seg = (id, opts, key) => {
    const el = document.getElementById(id);
    el.innerHTML = opts.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${F[key] === v}">${l}</button>`).join("");
    el.onclick = (e) => { const b = e.target.closest("[data-v]"); if (!b) return; F[key] = b.dataset.v; el.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); render(); };
  };
  seg("f-price", PRICE, "price"); seg("f-dur", DUR, "dur"); seg("f-must", MUST, "must");

  const regionSel = document.getElementById("region");
  function fillRegions() {
    const isl = NZ.island(), list = isl === "all" ? NZ.REGIONS.S.concat(NZ.REGIONS.N) : NZ.REGIONS[isl];
    if (F.region && !list.includes(F.region)) F.region = "";
    regionSel.innerHTML = `<option value="">All regions</option>` + list.map((r) => `<option ${r === F.region ? "selected" : ""}>${esc(r)}</option>`).join("");
  }
  regionSel.onchange = () => { F.region = regionSel.value; render(); };
  document.getElementById("sort").onchange = (e) => { F.sort = e.target.value; render(); };
  let qT; document.getElementById("q").addEventListener("input", (e) => { clearTimeout(qT); qT = setTimeout(() => { F.q = e.target.value.trim().toLowerCase(); render(); }, 120); });
  ["unvoted", "hidepass", "custom"].forEach((k) => (document.getElementById("f-" + k).onchange = (e) => { F[k] = e.target.checked; render(); }));
  document.getElementById("clear").onclick = () => {
    Object.assign(F, { q: "", region: "", price: "any", dur: "any", must: "any", unvoted: false, hidepass: false, custom: false });
    document.getElementById("q").value = ""; ["unvoted", "hidepass", "custom"].forEach((k) => (document.getElementById("f-" + k).checked = false));
    seg("f-price", PRICE, "price"); seg("f-dur", DUR, "dur"); seg("f-must", MUST, "must"); fillRegions(); render();
  };

  const SORTS = {
    must: (a, b) => b.m - a.m || NZ.groupScore(b.id) - NZ.groupScore(a.id) || b.av - a.av,
    group: (a, b) => NZ.groupScore(b.id) - NZ.groupScore(a.id) || b.m - a.m,
    price: (a, b) => a.nz - b.nz || b.m - a.m,
    dur: (a, b) => a.h - b.h || b.m - a.m,
    avail: (a, b) => b.av - a.av || b.m - a.m,
    name: () => 0
  };
  function list() {
    const me = NZ.meId();
    return NZ.all().filter((a) => {
      if (!NZ.onIsland(a)) return false;
      if (cat && !a.cats.includes(cat.k)) return false;
      if (F.region && a.region !== F.region) return false;
      if (F.price !== "any" && NZ.priceLevel(a.nz) > +F.price) return false;
      if (F.dur !== "any") { const [lo, hi] = DUR_RANGE[F.dur]; if (a.h <= lo || a.h > hi) return false; }
      if (F.must !== "any" && a.m < +F.must) return false;
      if (F.custom && !a.custom) return false;
      if (me && F.unvoted && NZ.vote(a.id, me)) return false;
      if (me && F.hidepass && NZ.vote(a.id, me) === "pass") return false;
      if (F.q) { const hay = [a.name, a.region, a.base, a.desc, a.an, a.fb, a.cats.map((k) => NZ.CAT[k].label).join(" ")].join(" ").toLowerCase(); if (!F.q.split(/\s+/).every((w) => hay.includes(w))) return false; }
      return true;
    }).sort((a, b) => SORTS[F.sort](a, b) || a.name.localeCompare(b.name));
  }
  function render() {
    const items = list(), isl = NZ.island();
    document.getElementById("count").innerHTML = `<b>${items.length}</b> ${items.length === 1 ? "activity" : "activities"} in ${esc(isl === "all" ? "New Zealand" : NZ.ISLANDS[isl])}`;
    document.getElementById("grid").innerHTML = items.length ? items.map(UI.card).join("") : UI.empty("Nothing matches", "Try clearing a filter, or switch islands in the bar above.");
  }
  fillRegions(); render();
  document.addEventListener("nz:data", render);
  document.addEventListener("nz:island", () => { fillRegions(); render(); });
})();
