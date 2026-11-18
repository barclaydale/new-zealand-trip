/* Fern & Fiord — shared UI: header/footer, icons, generated artwork, activity cards, votes, notes,
   the "who are you?" picker and the add / edit activity form. */
(function () {
  const NZ = window.NZ, S = NZ.store, esc = NZ.esc;
  const UI = (NZ.ui = {});

  /* ---------- icons ---------- */
  const ic = (d, extra) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra || ""}>${d}</svg>`;
  UI.icons = {
    heart: ic('<path d="M12 20.5s-7.5-4.6-9.4-9.3C1.2 7.7 3.2 4.5 6.4 4.5c1.9 0 3.5 1 4.4 2.5l1.2 1.9 1.2-1.9c.9-1.5 2.5-2.5 4.4-2.5 3.2 0 5.2 3.2 3.8 6.7-1.9 4.7-9.4 9.3-9.4 9.3z"/>'),
    up: ic('<path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3zM7 11l4-8c1.7 0 2.7 1.3 2.4 3L13 9h5.6a2 2 0 0 1 2 2.4l-1.3 6.6a2 2 0 0 1-2 1.6H7"/>'),
    down: ic('<path d="M17 13V4h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3zM17 13l-4 8c-1.7 0-2.7-1.3-2.4-3L11 15H5.4a2 2 0 0 1-2-2.4l1.3-6.6A2 2 0 0 1 6.7 4.4H17"/>'),
    clock: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    pin: ic('<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
    ext: ic('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
    plus: ic('<path d="M12 5v14M5 12h14"/>'),
    x: ic('<path d="M6 6l12 12M18 6L6 18"/>'),
    search: ic('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>'),
    cal: ic('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/>'),
    chat: ic('<path d="M4 5h16v11H9l-5 4z"/>'),
    edit: ic('<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>'),
    user: ic('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
    star: ic('<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/>'),
    sun: ic('<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>'),
    fern: ic('<path d="M6 21C9 15 12 9 18 3"/><path d="M8.6 16.4c-2 .2-3.6-.5-4.6-2 1.9-.4 3.6-.2 5 .9M10.6 13.1c-1.8-.5-3-1.7-3.5-3.4 1.9.2 3.4 1 4.4 2.4M12.8 10.2c-1.4-.9-2.2-2.3-2.2-4 1.7.6 2.9 1.7 3.4 3.3M15 7.2c-1-1.1-1.4-2.5-1-4 1.4.8 2.2 2 2.4 3.6M10 17.6c1.5 1.4 3.2 1.9 5 1.5-1-1.6-2.5-2.5-4.3-2.6M12.2 14.5c1.8.8 3.5.8 5-.2-1.4-1.2-3.1-1.6-4.9-1.2M14.4 11.4c1.8.4 3.3 0 4.6-1.2-1.6-.9-3.3-1-4.9-.3"/>')
  };

  /* ---------- generated artwork (one scene per category, seeded so it's stable) ---------- */
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rngFor = (seed) => { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const x = hex(a), y = hex(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
  UI.mix = mix;
  let artN = 0;
  UI.art = function (scene, pal, seed, label) {
    const R = rngFor(hash(seed || scene)), W = 800, H = 420, n = ++artN, f = (v) => v.toFixed(1);
    const [c0, c1, c2, c3] = pal;
    const poly = (pts, fill, op) => `<path d="M${pts.map((p) => f(p[0]) + "," + f(p[1])).join(" L")} Z" fill="${fill}"${op ? ` opacity="${op}"` : ""}/>`;
    const ridge = (x0, x1, base, maxH, jag, step, env) => {
      const pts = [[x0, base]];
      for (let x = x0; x <= x1; x += step) { const t = (x - x0) / (x1 - x0); pts.push([x, base - Math.max(2, env(t) * maxH * (1 - jag + R() * jag * 1.6))]); }
      pts.push([x1, base]); return pts;
    };
    const bell = (t) => Math.pow(Math.sin(Math.PI * t), 0.8);
    const wave = (k, p) => (t) => 0.55 + 0.45 * Math.sin(t * k + p);
    // snow-capped range: the mountain, then a snow layer clipped to it
    const alps = (pts, fill, snowAt) => {
      const id = `cl${n}x${Math.round(R() * 1e6)}`;
      let s = `<clipPath id="${id}">${poly(pts, "#000")}</clipPath>` + poly(pts, fill);
      let sp = `M0,0 L${W},0 L${W},${snowAt}`;
      for (let x = W; x >= 0; x -= 22) sp += ` L${x},${f(snowAt + (R() - 0.3) * 26)}`;
      return s + `<path d="${sp} Z" fill="#fbfdff" opacity=".93" clip-path="url(#${id})"/>`;
    };
    let g = `<defs><linearGradient id="sk${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient>
      <linearGradient id="wt${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(c3, "#ffffff", 0.25)}"/><stop offset="1" stop-color="${mix(c3, "#06202a", 0.45)}"/></linearGradient>
      <radialGradient id="gl${n}"><stop offset="0" stop-color="#b9fff4" stop-opacity="1"/><stop offset="1" stop-color="#7ff0e0" stop-opacity="0"/></radialGradient></defs>`;
    g += `<rect width="${W}" height="${H}" fill="url(#sk${n})"/>`;
    const hz = 270;

    if (scene === "lake" || scene === "fiord") {
      for (let i = 0; i < 4; i++) { const cx = R() * W, cy = 40 + R() * 80, rx = 50 + R() * 80; g += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(rx / 7)}" fill="#fff" opacity="${(0.3 + R() * 0.3).toFixed(2)}"/>`; }
      if (scene === "lake") {
        const far = ridge(-20, 820, hz, 190, 0.55, 18, wave(7, R() * 6));
        const mid = ridge(-20, 820, hz, 110, 0.45, 16, wave(5, R() * 6));
        g += alps(far, mix(c2, c0, 0.45), 120 + R() * 20) + poly(mid, mix(c2, "#2a3d33", 0.25));
        g += `<rect x="0" y="${hz}" width="${W}" height="${H - hz}" fill="url(#wt${n})"/>`;
        g += `<g transform="translate(0 ${2 * hz}) scale(1 -1)" opacity=".22">${poly(far, mix(c2, c0, 0.3))}</g>`;
        for (let i = 0; i < 14; i++) g += `<rect x="${f(R() * W)}" y="${f(hz + 10 + R() * 100)}" width="${f(20 + R() * 70)}" height="1.6" rx=".8" fill="#fff" opacity="${(0.2 + R() * 0.3).toFixed(2)}"/>`;
        // tussock foreground
        g += `<path d="M0,${H} L0,${H - 40} Q200,${H - 70} 420,${H - 46} T800,${H - 60} L800,${H} Z" fill="#c9a861"/>`;
        for (let i = 0; i < 70; i++) { const x = R() * W, y = H - 30 - R() * 26, l = 14 + R() * 22, a = (R() - 0.5) * 18; g += `<path d="M${f(x)},${f(y + l)} q${f(a / 2)},${f(-l / 2)} ${f(a)},${f(-l)}" stroke="${mix("#b08a3e", "#e6cc8a", R())}" stroke-width="1.6" fill="none"/>`; }
      } else {
        // fiord: steep walls each side, a spire in the distance, waterfalls and mist
        g += alps([[300, hz], [360, hz - 120], [392, hz - 205], [404, hz - 222], [420, hz - 190], [470, hz - 90], [520, hz]], mix(c2, c0, 0.55), hz - 175);
        g += poly([[-10, hz + 10], [-10, 30], [70, 50], [160, 110], [250, 190], [330, hz + 10]], c2);
        g += poly([[810, hz + 10], [810, 20], [720, 60], [640, 140], [560, 220], [500, hz + 10]], mix(c2, "#0d241c", 0.2));
        for (let i = 0; i < 3; i++) { const x = 650 + i * 40 + R() * 20; g += `<path d="M${f(x)},${f(90 + i * 40)} q${f(-4 - R() * 6)},60 ${f(-18 - R() * 10)},${f(140 - i * 30)}" stroke="#fff" stroke-width="${f(1.5 + R() * 2)}" fill="none" opacity=".75"/>`; }
        g += `<rect x="0" y="${hz - 40}" width="${W}" height="36" fill="#fff" opacity=".18"/>`;
        g += `<rect x="0" y="${hz}" width="${W}" height="${H - hz}" fill="url(#wt${n})"/>`;
        for (let i = 0; i < 14; i++) g += `<rect x="${f(R() * W)}" y="${f(hz + 10 + R() * 140)}" width="${f(20 + R() * 70)}" height="1.6" rx=".8" fill="#fff" opacity="${(0.15 + R() * 0.25).toFixed(2)}"/>`;
        g += `<g transform="translate(${f(380 + R() * 80)} ${hz + 70})"><path d="M-40,0 L40,0 L30,10 L-34,10 Z" fill="#f5f2ea"/><rect x="-18" y="-10" width="30" height="10" fill="#f5f2ea"/><rect x="-4" y="-18" width="6" height="8" fill="#c8432f"/></g>`;
      }
    } else if (scene === "glow") {
      for (let i = 0; i < 260; i++) {
        const x = R() * W, y = Math.pow(R(), 1.6) * (hz - 20), r = 0.6 + R() * 1.6;
        if (R() < 0.35) g += `<path d="M${f(x)},${f(Math.max(0, y - 10 - R() * 30))} L${f(x)},${f(y)}" stroke="#9ff3e6" stroke-width=".5" opacity=".25"/>`;
        g += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 3)}" fill="url(#gl${n})" opacity="${(0.25 + R() * 0.4).toFixed(2)}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.6)}" fill="#e4fffb"/>`;
      }
      g += `<rect x="0" y="${hz}" width="${W}" height="${H - hz}" fill="#071520"/>`;
      for (let i = 0; i < 90; i++) { const x = R() * W, y = hz + 8 + R() * (H - hz - 20); g += `<rect x="${f(x)}" y="${f(y)}" width="${f(2 + R() * 6)}" height="1.2" fill="#9ff3e6" opacity="${(0.15 + R() * 0.35).toFixed(2)}"/>`; }
      g += poly([[-10, H], [-10, 200], [60, 230], [120, 300], [150, H]], "#04101a") + poly([[810, H], [810, 180], [740, 240], [690, 320], [660, H]], "#04101a");
      g += `<path d="M330,${hz + 54} q70,22 140,0 l-12,14 h-116 z" fill="#0b2232"/>`;
    } else if (scene === "hills") {
      g += `<circle cx="${f(560 + R() * 120)}" cy="${f(90 + R() * 40)}" r="34" fill="#fff6dc" opacity=".9"/>`;
      g += alps(ridge(-20, 820, 230, 120, 0.5, 18, wave(6, R() * 6)), mix(c3, c0, 0.5), 140);
      const hills = [[230, 60, mix(c2, c0, 0.35)], [270, 70, mix(c2, "#ffffff", 0.08)], [330, 60, c2], [380, 50, mix(c2, "#1d2a16", 0.25)]];
      hills.forEach(([y, a, col], i) => { const p = R() * 6; let d = `M0,${H} L0,${y}`; for (let x = 0; x <= W; x += 20) d += ` L${x},${f(y - Math.sin(x / (140 + i * 30) + p) * a * 0.5)}`; g += `<path d="${d} L${W},${H} Z" fill="${col}"/>`; });
      for (let i = 0; i < 26; i++) { const x = R() * W, y = 300 + R() * 90; g += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="5" ry="3.4" fill="#fbf8f0"/><circle cx="${f(x + 5)}" cy="${f(y - 1)}" r="1.8" fill="#3b3b3b"/>`; }
      const cx = 160 + R() * 80, cy = 282;
      g += `<g fill="#5b4636"><rect x="${f(cx)}" y="${cy - 30}" width="46" height="30"/><path d="M${f(cx - 6)},${cy - 30} L${f(cx + 23)},${cy - 54} L${f(cx + 52)},${cy - 30} Z"/><rect x="${f(cx + 38)}" y="${cy - 62}" width="10" height="34"/><path d="M${f(cx + 36)},${cy - 62} L${f(cx + 43)},${cy - 78} L${f(cx + 50)},${cy - 62} Z"/></g>`;
    } else if (scene === "koru") {
      const spiral = (cx, cy, r, turns, col, w, op) => {
        let d = ""; const steps = 80 * turns;
        for (let i = 0; i <= steps; i++) { const t = i / steps, a = t * turns * Math.PI * 2, rr = r * (1 - t * 0.92); d += (i ? " L" : "M") + f(cx + Math.cos(a) * rr) + "," + f(cy + Math.sin(a) * rr); }
        return `<path d="${d}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="${op}"/>`;
      };
      for (let i = 0; i < 7; i++) g += spiral(R() * W, R() * H, 60 + R() * 120, 1.6 + R(), i % 2 ? c2 : "#fbe3c4", 6 + R() * 10, (0.25 + R() * 0.35).toFixed(2));
      g += `<path d="M0,${H} L0,${H - 70} Q200,${H - 110} 400,${H - 80} T800,${H - 90} L800,${H} Z" fill="${c3}" opacity=".85"/>`;
      g += `<g transform="translate(${f(470 + R() * 120)} ${H - 92})" fill="${c3}"><path d="M-80,0 L0,-62 L80,0 Z"/><rect x="-62" y="-4" width="124" height="40"/><path d="M-84,2 L0,-66 L84,2" stroke="#e9a24a" stroke-width="5" fill="none"/></g>`;
    } else { // vines
      g += `<circle cx="${f(560 + R() * 120)}" cy="${f(100 + R() * 30)}" r="42" fill="#fff4d6" opacity=".95"/>`;
      g += alps(ridge(-20, 820, 220, 150, 0.5, 16, wave(5, R() * 6)), mix(c2, c0, 0.6), 110);
      g += poly(ridge(-20, 820, 250, 70, 0.3, 20, bell), mix(c2, c0, 0.3));
      let d = `M0,${H} L0,250`; for (let x = 0; x <= W; x += 20) d += ` L${x},${f(250 - Math.sin(x / 210) * 24)}`;
      g += `<path d="${d} L${W},${H} Z" fill="${mix(c2, "#ffffff", 0.15)}"/>`;
      for (let i = 0; i < 16; i++) { const y = 262 + i * 11, sk = (i - 8) * 22; g += `<path d="M${f(-40 + sk)},${f(y + 8)} Q400,${f(y - 18)} ${f(840 - sk)},${f(y + 12)}" stroke="${mix(c2, "#1f2a12", 0.35)}" stroke-width="${f(2 + i * 0.4)}" fill="none" stroke-dasharray="${f(4 + i)} ${f(3 + i * 0.5)}" opacity=".85"/>`; }
    }
    return `<svg class="art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(label || "Illustration")}">${g}</svg>`;
  };
  UI.catArt = (c, seed) => UI.art(c.scene, c.pal, seed || c.k, c.label);

  /* ---------- header / footer / toast ---------- */
  UI.header = function (active) {
    const el = document.getElementById("site-header"); if (!el) return;
    const link = (href, key, label, extra) => `<a href="${href}" ${active === key ? 'aria-current="page"' : ""}>${label}${extra || ""}</a>`;
    const isl = NZ.island(), seg = [["S", "South Island"], ["N", "North Island"], ["all", "Both"]];
    const cur = new URLSearchParams(location.search).get("c");
    el.innerHTML = `<div class="wrap bar"><a class="brand" href="index.html" aria-label="Fern and Fiord home"><svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#1f4d39"/><path d="M5 30 L14 17 L19 23 L25 13 L35 30 Z" fill="#e7eef0"/><path d="M14 17 L17 21 L19 23 L21 19.5 L25 13 L27.5 17 L24 19 L21 22 L19 24 L16 21 Z" fill="#fff"/><path d="M4 30h32v6H4z" fill="#2e7a93"/><circle cx="29" cy="10" r="3.4" fill="#e8b630"/></svg><span>Fern <em>&amp;</em> Fiord</span></a>
      <nav aria-label="Main">${link("index.html", "home", "Home")}${link("category.html?c=all", "explore", "Explore")}${link("picks.html", "picks", "Group picks", ' <span class="pill" id="nav-todo" hidden></span>')}<button type="button" class="btn sm coral" id="add-btn">${UI.icons.plus}<span>Add</span></button><button type="button" id="who-pill" class="who-pill"></button><button type="button" id="sync-pill" class="sync-pill" data-state="local" hidden></button></nav></div>
      <div class="subbar"><div class="wrap subbar-in"><div class="seg" role="group" aria-label="Which island">${seg.map(([v, l]) => `<button type="button" data-island="${v}" aria-pressed="${isl === v}">${l}</button>`).join("")}</div>
      <div class="catlinks">${NZ.CATS.map((c) => `<a href="category.html?c=${c.k}" class="catlink c-${c.k}" ${active === "explore" && cur === c.k ? 'aria-current="page"' : ""}>${esc(c.short)}</a>`).join("")}</div></div></div>`;
    UI.refreshNav();
    if (NZ.sync) NZ.sync.render();
  };
  UI.refreshNav = function () {
    const me = NZ.meId(), w = document.getElementById("who-pill");
    if (w) { const p = NZ.me(); w.innerHTML = p ? `<span class="av" style="background:${esc(p.color)}">${esc(NZ.initials(p.name))}</span>${esc(p.name)}` : `${UI.icons.user}<span>Who are you?</span>`; w.classList.toggle("unset", !p); }
    const t = document.getElementById("nav-todo");
    if (t) { const n = me ? NZ.all().filter((a) => NZ.onIsland(a) && !NZ.vote(a.id, me)).length : 0; t.textContent = n; t.hidden = !n; t.title = n + " not voted on yet"; }
    document.querySelectorAll("[data-island]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.island === NZ.island())));
  };
  UI.footer = function () {
    const el = document.getElementById("site-footer"); if (!el) return;
    el.innerHTML = `<div class="wrap"><p><strong>Fern &amp; Fiord</strong> · a shared research notebook for a New Zealand trip, ${esc(NZ.TRIP)}.</p>
      <p class="fine">Prices are rough 2026–27 planning estimates in NZ dollars per adult (US$ ≈ ${NZ.USD} × NZ$), gathered from operator sites, booking sites and tourism listings. Operators change prices and schedules often, so confirm before you book. "What people say" summarises common themes in traveller reviews (Tripadvisor, Google and travel forums); it is not quoted from any single review. Votes, notes and added activities are shared with everyone using your trip code.</p></div>`;
  };
  let toastT;
  UI.toast = function (msg, kind) {
    let t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.className = "show " + (kind || ""); t.textContent = msg;
    clearTimeout(toastT); toastT = setTimeout(() => (t.className = ""), 3200);
  };
  UI.changed = () => { UI.refreshNav(); document.dispatchEvent(new CustomEvent("nz:data")); };

  /* ---------- cards ---------- */
  const bar = (n, cls) => `<span class="bar5 ${cls}">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span>`;
  UI.catChips = (a) => a.cats.map((k) => `<a class="chip cat c-${k}" href="category.html?c=${k}">${esc(NZ.CAT[k].short)}</a>`).join("");
  UI.ratings = function (a) {
    const pl = NZ.priceLevel(a.nz), dl = NZ.durLevel(a.h);
    return `<div class="ratings">
      <div class="rt" title="${esc(a.pn || "Approximate price per adult")}"><span class="rt-l">Price</span>${bar(pl, "price")}<span class="rt-v"><b class="dollars">${pl ? "$".repeat(pl) : "Free"}</b> ${a.nz ? `${NZ.nzd(a.nz)} <small>≈ ${NZ.usd(a.nz)}</small>` : ""}</span></div>
      <div class="rt" title="How easy it is to get, and how good it is, in ${esc(NZ.TRIP)}"><span class="rt-l">Availability</span>${bar(a.av, "avail")}<span class="rt-v">${esc(NZ.AVAIL_LABEL[a.av])}</span></div>
      <div class="rt" title="${esc(a.hn || NZ.DUR_LABEL[dl])}"><span class="rt-l">Duration</span>${bar(dl, "dur")}<span class="rt-v"><b>${NZ.durText(a.h)}</b> <small>${esc(NZ.DUR_LABEL[dl])}</small></span></div>
      <div class="rt"><span class="rt-l">Must do</span>${bar(a.m, "must")}<span class="rt-v">${esc(NZ.MUST_LABEL[a.m])}</span></div>
      ${a.pn || a.hn ? `<p class="rt-note">${esc([a.pn, a.hn].filter(Boolean).join(" · "))}</p>` : ""}
    </div>`;
  };
  UI.votes = function (a) {
    const me = NZ.meId(), mine = me ? NZ.vote(a.id, me) : null, v = NZ.votesFor(a.id);
    const icon = { love: "heart", like: "up", pass: "down" };
    const btns = NZ.VOTES.map(([k, label]) => `<button type="button" class="rbtn ${k}" data-vote="${k}" data-id="${esc(a.id)}" aria-pressed="${mine === k}" title="${label}${v[k].length ? ": " + esc(v[k].map((p) => p.name).join(", ")) : ""}">${UI.icons[icon[k]]}<span>${label}</span>${v[k].length ? `<em>${v[k].length}</em>` : ""}</button>`).join("");
    const who = ["love", "like", "pass"].flatMap((k) => v[k].map((p) => `<span class="av sm ${k}" style="background:${esc(p.color)}" title="${esc(p.name)}: ${k === "like" ? "keen" : k}">${esc(NZ.initials(p.name))}</span>`)).join("");
    return `<div class="rate" role="group" aria-label="Your vote">${btns}</div>${who ? `<div class="voters">${who}</div>` : ""}`;
  };
  UI.card = function (a) {
    const notes = NZ.notesFor(a.id).length, by = a.custom ? NZ.person(a.by) : null;
    const reviews = NZ.reviewLinks(a);
    return `<article class="act c-${a.cats[0]}${a.custom ? " custom" : ""}" data-id="${esc(a.id)}">
      <div class="act-top"><div class="badges">${UI.catChips(a)}${a.custom ? `<span class="chip added">Added by ${esc(by ? by.name : "the group")}</span>` : ""}</div><span class="where">${UI.icons.pin}${esc(a.region || NZ.ISLANDS[a.island])}</span></div>
      <h3>${esc(a.name)}</h3>
      ${a.base ? `<p class="loc">${esc(a.base)} · ${esc(NZ.ISLANDS[a.island])}</p>` : `<p class="loc">${esc(NZ.ISLANDS[a.island])}</p>`}
      ${a.desc ? `<p class="desc">${esc(a.desc)}</p>` : ""}
      ${a.an ? `<div class="when"><h5>${UI.icons.cal} Late March – early April</h5><p>${esc(a.an)}</p></div>` : ""}
      ${a.fb ? `<div class="says"><h5>What people say</h5><p>${esc(a.fb)}</p></div>` : ""}
      ${UI.ratings(a)}
      <div class="links">${a.link ? `<a href="${esc(a.link.url)}" target="_blank" rel="noopener noreferrer">${esc(a.link.label)}${UI.icons.ext}</a>` : ""}${reviews.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}${UI.icons.ext}</a>`).join("")}</div>
      <div class="act-foot"><div class="vote-wrap">${UI.votes(a)}</div>
        <div class="foot-r"><button type="button" class="btn sm ghost" data-notes="${esc(a.id)}">${UI.icons.chat}<span>${notes ? notes + " note" + (notes > 1 ? "s" : "") : "Add note"}</span></button>${a.custom ? `<button type="button" class="btn sm ghost" data-edit="${esc(a.id)}">${UI.icons.edit}<span>Edit</span></button>` : ""}</div></div>
    </article>`;
  };
  UI.refreshCard = function (id) {
    const a = NZ.get(id); if (!a) return;
    document.querySelectorAll(`.act[data-id="${window.CSS && CSS.escape ? CSS.escape(id) : id}"]`).forEach((el) => {
      el.querySelector(".vote-wrap").innerHTML = UI.votes(a);
      const n = NZ.notesFor(id).length, b = el.querySelector("[data-notes] span"); if (b) b.textContent = n ? n + " note" + (n > 1 ? "s" : "") : "Add note";
    });
  };
  UI.empty = (title, body) => `<div class="empty"><h3>${esc(title)}</h3><p>${body}</p></div>`;

  /* ---------- dialogs ---------- */
  const dialog = (id) => { let d = document.getElementById(id); if (!d) { d = document.createElement("dialog"); d.id = id; document.body.appendChild(d); } d.onclose = null; d.onclick = null; d.returnValue = ""; return d; };

  // "who are you?" — each device remembers one person; votes and notes are signed with them
  UI.who = function (then) {
    const dlg = dialog("who-dlg"), people = NZ.people(), me = NZ.meId();
    dlg.innerHTML = `<form method="dialog"><h3>Who's on this device?</h3><p class="sub">Votes and notes are signed with your name so the group can see who wants what. Pick yourself, or add your name if you're new.</p>
      ${people.length ? `<div class="people">${people.map((p) => `<button type="button" class="person${p.id === me ? " on" : ""}" data-pid="${esc(p.id)}"><span class="av" style="background:${esc(p.color)}">${esc(NZ.initials(p.name))}</span>${esc(p.name)}</button>`).join("")}</div>` : ""}
      <label class="fld">${people.length ? "Not listed? Add your name" : "Your name"}<input id="who-name" maxlength="40" autocomplete="given-name" placeholder="e.g. Sam"></label>
      <div class="dlg-foot"><button class="btn ghost" value="cancel">Close</button><button class="btn primary" value="add">Add me</button></div></form>`;
    dlg.onclick = (e) => { const b = e.target.closest("[data-pid]"); if (!b) return; NZ.setMe(b.dataset.pid); dlg.close("picked"); };
    dlg.onclose = () => {
      if (dlg.returnValue === "add") {
        const v = document.getElementById("who-name").value.trim(); if (!v) return;
        const existing = NZ.people().find((p) => p.name.toLowerCase() === v.toLowerCase());
        NZ.setMe(existing ? existing.id : NZ.addPerson(v));
      } else if (dlg.returnValue !== "picked") return;
      UI.toast("Hi " + NZ.me().name + " 👋"); UI.changed(); if (then) then();
    };
    dlg.showModal();
    if (!people.length) document.getElementById("who-name").focus();
  };
  const needMe = (then) => { if (NZ.me()) return true; UI.who(then); return false; };

  UI.notes = function (id) {
    const a = NZ.get(id); if (!a) return;
    const dlg = dialog("notes-dlg");
    const draw = () => {
      const notes = NZ.notesFor(id), me = NZ.meId();
      dlg.innerHTML = `<form method="dialog"><h3>${esc(a.name)}</h3><p class="sub">Notes for the group: tips, timing, "only if it's sunny", links you found.</p>
        <div class="notes">${notes.length ? notes.map((n) => { const p = NZ.person(n.by); return `<div class="note"><span class="av sm" style="background:${esc(p ? p.color : "#7b909a")}">${esc(NZ.initials(p ? p.name : "?"))}</span><div><p class="note-meta"><b>${esc(p ? p.name : "Someone")}</b> · ${esc(NZ.ago(n.at))}${n.by === me ? ` · <button type="button" class="linkbtn" data-del="${esc(n.id)}">delete</button>` : ""}</p><p class="note-t">${esc(n.text)}</p></div></div>`; }).join("") : `<p class="sub">No notes yet.</p>`}</div>
        <label class="fld">Add a note<textarea id="note-text" rows="3" maxlength="2000" placeholder="e.g. My cousin says book the 9am boat, it's calmer"></textarea></label>
        <div class="dlg-foot"><button class="btn ghost" value="cancel">Close</button><button class="btn primary" value="add">Post note</button></div></form>`;
    };
    draw();
    dlg.onclick = (e) => { const b = e.target.closest("[data-del]"); if (!b) return; NZ.delNote(b.dataset.del); draw(); UI.refreshCard(id); };
    dlg.onclose = () => {
      if (dlg.returnValue !== "add") return;
      const text = document.getElementById("note-text").value.trim(); if (!text) return;
      const post = () => { NZ.addNote(id, text); UI.refreshCard(id); UI.toast("Note posted"); };
      if (needMe(post)) post();
    };
    dlg.showModal();
  };

  // add / edit a group activity (same fields and ratings as the curated ones)
  UI.edit = function (id) {
    const ex = id ? NZ.get(id) : null;
    if (id && (!ex || !ex.custom)) return;
    const r = ex ? ex.raw : { c: [], av: 3, m: 3 };
    const dlg = dialog("edit-dlg"), isl = ex ? ex.island : NZ.island() === "N" ? "N" : "S";
    const opt = (n, labels, cur) => [1, 2, 3, 4, 5].map((i) => `<option value="${i}" ${cur === i ? "selected" : ""}>${i} · ${esc(labels[i])}</option>`).join("");
    const regions = (k) => NZ.REGIONS[k].map((x) => `<option ${x === r.r ? "selected" : ""}>${esc(x)}</option>`).join("");
    dlg.innerHTML = `<form method="dialog" class="edit-form"><h3>${ex ? "Edit activity" : "Add an activity"}</h3><p class="sub">Anything the group should consider: something a friend recommended, a restaurant, a walk. Everyone with the trip code will see it and can vote.</p>
      <label class="fld">Name *<input name="n" required maxlength="90" value="${esc(r.n || "")}" placeholder="e.g. Ben Lomond summit"></label>
      <div class="two"><div class="fld"><span>Island</span><div class="seg" id="ed-isl">${["S", "N"].map((k) => `<button type="button" data-v="${k}" aria-pressed="${isl === k}">${NZ.ISLANDS[k]}</button>`).join("")}</div></div>
        <label class="fld">Region<select name="r" id="ed-region"><option value="">—</option>${regions(isl)}</select></label></div>
      <div class="fld"><span>Categories * <small>(pick one or more; the first one picked is the main one)</small></span><div class="chips" id="ed-cats">${NZ.CATS.map((c) => `<button type="button" class="chip" data-v="${c.k}" aria-pressed="${(r.c || []).includes(c.k)}">${esc(c.label)}</button>`).join("")}</div></div>
      <label class="fld">Town / base<input name="b" maxlength="80" value="${esc(r.b || "")}" placeholder="e.g. Queenstown"></label>
      <label class="fld">Description<textarea name="d" rows="3" maxlength="1200">${esc(r.d || "")}</textarea></label>
      <div class="two"><label class="fld">Price per adult (NZ$, 0 = free)<input name="nz" type="number" min="0" step="1" value="${esc(r.nz != null ? r.nz : "")}"></label>
        <label class="fld">Duration (hours)<input name="h" type="number" min="0.25" step="0.25" value="${esc(r.h || "")}" placeholder="e.g. 3"></label></div>
      <div class="two"><label class="fld">Availability in late Mar–early Apr<select name="av">${opt(0, NZ.AVAIL_LABEL, r.av)}</select></label>
        <label class="fld">Must do<select name="m">${opt(0, NZ.MUST_LABEL, r.m)}</select></label></div>
      <label class="fld">Timing / booking notes<input name="an" maxlength="400" value="${esc(r.an || "")}" placeholder="e.g. Only runs until mid-April; book a few days ahead"></label>
      <label class="fld">What people say<input name="fb" maxlength="600" value="${esc(r.fb || "")}" placeholder="Reviews, a friend's take…"></label>
      <label class="fld">Link<input name="u" type="url" maxlength="400" value="${esc((r.u || "").replace(/^u:/, ""))}" placeholder="https://…"></label>
      <div class="dlg-foot">${ex ? `<button class="btn ghost danger" value="delete" formnovalidate>Delete</button>` : ""}<button class="btn ghost" value="cancel" formnovalidate>Cancel</button><button class="btn primary" value="save">${ex ? "Save changes" : "Add activity"}</button></div></form>`;
    let island = isl, cats = (r.c || []).slice();
    dlg.onclick = (e) => {
      const ib = e.target.closest("#ed-isl [data-v]");
      if (ib) { island = ib.dataset.v; dlg.querySelectorAll("#ed-isl [data-v]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === island))); document.getElementById("ed-region").innerHTML = `<option value="">—</option>${regions(island)}`; }
      const cb = e.target.closest("#ed-cats [data-v]");
      if (cb) { const k = cb.dataset.v; cats = cats.includes(k) ? cats.filter((x) => x !== k) : cats.concat(k); cb.setAttribute("aria-pressed", String(cats.includes(k))); }
    };
    dlg.onclose = () => {
      const rv = dlg.returnValue;
      if (rv === "delete") {
        if (!confirm(`Delete "${ex.name}" for everyone?`)) return;
        S.set("items", id, null); UI.toast("Deleted"); UI.changed(); return;
      }
      if (rv !== "save") return;
      const fd = new FormData(dlg.querySelector("form")), g = (k) => String(fd.get(k) || "").trim();
      if (!g("n")) return;
      const url = g("u");
      const fields = { n: g("n"), island, c: cats.length ? cats : ["classics"], r: g("r"), b: g("b"), d: g("d"), nz: Number(g("nz")) || 0, h: Number(g("h")) || 1, av: Number(g("av")) || 3, m: Number(g("m")) || 3, an: g("an"), fb: g("fb"), u: /^https?:\/\//i.test(url) ? "u:" + url : "" };
      const save = () => { NZ.saveCustom(id || "u-" + NZ.uid(), fields); UI.toast(ex ? "Saved" : `Added "${fields.n}"`); UI.changed(); };
      if (needMe(save)) save();
    };
    dlg.showModal();
  };

  /* ---------- delegated clicks ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target;
    const vb = t.closest("[data-vote]");
    if (vb) {
      e.preventDefault();
      const go = () => { NZ.setVote(vb.dataset.id, vb.dataset.vote); UI.refreshCard(vb.dataset.id); UI.refreshNav(); document.dispatchEvent(new CustomEvent("nz:vote", { detail: { id: vb.dataset.id } })); };
      if (needMe(go)) go();
      return;
    }
    const nb = t.closest("[data-notes]"); if (nb) return UI.notes(nb.dataset.notes);
    const eb = t.closest("[data-edit]"); if (eb) return UI.edit(eb.dataset.edit);
    if (t.closest("#add-btn")) return UI.edit(null);
    if (t.closest("#who-pill")) return UI.who();
    const ib = t.closest(".subbar [data-island]"); if (ib) { NZ.setIsland(ib.dataset.island); UI.refreshNav(); }
  });

  document.addEventListener("DOMContentLoaded", () => {
    UI.footer();
    // ask "who are you?" once per browser session, so votes are signed from the start
    let asked = false; try { asked = !!sessionStorage.getItem("ff-asked"); sessionStorage.setItem("ff-asked", "1"); } catch (e) {}
    if (!NZ.me() && !asked && !/[?&]noprompt\b/.test(location.search)) setTimeout(() => { if (!NZ.me()) UI.who(); }, 400);
  });
})();
