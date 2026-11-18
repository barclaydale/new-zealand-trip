/* Fern & Fiord — keeps people, votes, notes and group-added activities in sync across devices
   via /api/state (Next.js route + Postgres).
   * The browser keeps working offline / when opened from disk: localStorage is always the local cache.
   * Everyone who enters the same trip code shares one board. Changes are merged entry-by-entry (js/merge.js). */
(function () {
  const NZ = window.NZ, S = NZ.store, M = window.FFMerge;
  const Y = (NZ.sync = { status: "local", message: "", last: 0 });
  const CODE_KEY = "fern-fiord.code";
  const API = "/api/state";
  const online = /^https?:$/.test(location.protocol);
  let code = "", pushTimer = null, inflight = false, dirty = false, pollTimer = null, pending = false;
  // resolves once this page's first pull has finished (or straight away when there's nothing to pull),
  // so the "who are you?" prompt can list the people already on the board
  let settle; Y.ready = new Promise((r) => (settle = r));

  try { code = localStorage.getItem(CODE_KEY) || ""; } catch (e) {}

  function setStatus(status, message) {
    Y.status = status; Y.message = message || "";
    if (status === "synced") Y.last = Date.now();
    Y.render();
  }
  const changed = (a, b) => M.canon(M.normalize(a)) !== M.canon(M.normalize(b));

  async function call(method, body) {
    const r = await fetch(API, { method, headers: { "x-trip-code": code, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
    let j = null; try { j = await r.json(); } catch (e) {}
    return { status: r.status, json: j };
  }
  function handleFail(res) {
    if (res.status === 409) { dirty = true; return; }   // server was busy merging someone else's save: just try again
    if (res.status === 401) return setStatus("badcode", "That trip code doesn't match.");
    if (res.status === 503) return setStatus("notconfigured", (res.json && res.json.message) || "Sync isn't set up on the server yet.");
    if (res.status === 404) return setStatus("local", "This host has no sync service (saved on this device only).");
    return setStatus("offline", "Couldn't reach the server. Your changes are saved here and will sync when it's back.");
  }
  // adopt a merged state from the server; tell pages to re-render only if something actually changed
  function adopt(remote) {
    const merged = M.merge(S.state, remote);
    const differs = changed(merged, S.state);
    if (differs) { S.adopt(merged); if (NZ.ui) NZ.ui.changed(); }
    return { merged, differs };
  }

  async function pull(force) {
    if (!online || !code || inflight) return;
    if (!force && (Y.status === "badcode" || Y.status === "notconfigured")) return;   // don't hammer a server that said no
    inflight = true; if (Y.status !== "synced") setStatus("syncing");
    try {
      const res = await call("GET");
      if (res.status !== 200) return handleFail(res);
      const { merged } = adopt(res.json.state);
      setStatus("synced");
      if (changed(merged, res.json.state || {})) schedulePush(50);   // we hold newer local work the server doesn't have yet
    } catch (e) { setStatus("offline", "Couldn't reach the server."); }
    finally { inflight = false; settle(); if (dirty) schedulePush(50); }
  }
  async function push() {
    if (!online || !code) return;
    pending = false;
    if (inflight) { dirty = true; return; }
    inflight = true; dirty = false; setStatus("syncing");
    try {
      const res = await call("PUT", { state: S.state });
      if (res.status !== 200) return handleFail(res);
      adopt(res.json.state);
      setStatus("synced");
    } catch (e) { setStatus("offline", "Couldn't reach the server."); dirty = true; }
    finally { inflight = false; if (dirty && Y.status !== "offline") schedulePush(dirty && Y.status === "syncing" ? 400 : 50); }
  }
  function schedulePush(ms) { pending = true; clearTimeout(pushTimer); pushTimer = setTimeout(push, ms == null ? 600 : ms); }

  S.onSave = () => { if (online && code) schedulePush(); };

  /* ---------- header pill + code dialog ---------- */
  const LABEL = { local: "Saved on this device", needcode: "Set up sync", syncing: "Syncing…", synced: "Synced", offline: "Offline · will retry", badcode: "Wrong trip code", notconfigured: "Sync not set up" };
  Y.render = function () {
    const el = document.getElementById("sync-pill"); if (!el) return;
    el.dataset.state = Y.status; el.textContent = LABEL[Y.status] || Y.status;
    const t = Y.last ? " · last synced " + new Date(Y.last).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
    el.title = (Y.message || (Y.status === "synced" ? "Votes, notes and added activities are shared with everyone using this trip code." : "Click for sync options")) + t;
    el.hidden = false;
  };
  // `then` runs after the code is saved and the first sync succeeds, or when the dialog is closed without a code
  function dialog(then) {
    let dlg = document.getElementById("sync-dlg");
    if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "sync-dlg"; document.body.appendChild(dlg); }
    const intro = !online ? "Sync only works on the hosted site (Vercel). This page is running from a file, so everything is saved in this browser only."
      : Y.status === "notconfigured" ? (Y.message || "The server isn't configured yet. See the README: connect a Postgres database and set TRIP_CODE in Vercel, then redeploy.")
      : "Enter the shared trip code (the TRIP_CODE set in Vercel). Everyone who uses the same code sees the same votes, notes and added activities, live.";
    dlg.innerHTML = `<form method="dialog"><h3>Share with the group</h3><p class="sub">${NZ.esc(intro)}</p>
      ${online ? `<label class="fld">Trip code<input id="sync-code" type="password" autocomplete="off" value="${NZ.esc(code)}" placeholder="shared passphrase"></label>` : ""}
      <p class="sub">${Y.status === "synced" ? "Status: synced" + (Y.last ? " at " + new Date(Y.last).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "") : ""}</p>
      <div class="dlg-foot">${online && code ? `<button class="btn ghost" value="forget">Forget code on this device</button>` : ""}<button class="btn ghost" value="cancel">Close</button>${online ? `<button class="btn primary" value="save">${code ? "Save &amp; sync now" : "Start syncing"}</button>` : ""}</div></form>`;
    dlg.onclose = () => {
      if (dlg.returnValue === "save") {
        const v = (document.getElementById("sync-code") || {}).value || "";
        if (!v.trim()) return;
        code = v.trim(); try { localStorage.setItem(CODE_KEY, code); } catch (e) {}
        setStatus("syncing"); pull(true).then(() => { if (Y.status === "synced") { push(); if (then) then(); } }); startPolling();
      } else if (dlg.returnValue === "forget") {
        code = ""; try { localStorage.removeItem(CODE_KEY); } catch (e) {} setStatus(online ? "needcode" : "local");
      } else if (then && !code) then();
    };
    dlg.returnValue = ""; dlg.showModal();
    const inp = document.getElementById("sync-code"); if (inp) inp.focus();
  }
  Y.dialog = dialog;
  document.addEventListener("click", (e) => { if (e.target.closest("#sync-pill")) dialog(); });

  /* ---------- lifecycle ---------- */
  function startPolling() { clearInterval(pollTimer); pollTimer = setInterval(() => { if (!document.hidden) pull(); }, 12000); }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) pull(); });
  window.addEventListener("online", () => { pull(); if (dirty) schedulePush(200); });
  // an edit made just before closing/leaving the tab still gets sent
  window.addEventListener("pagehide", () => {
    if (!(online && code && (pending || dirty))) return;
    try { fetch(API, { method: "PUT", keepalive: true, headers: { "x-trip-code": code, "content-type": "application/json" }, body: JSON.stringify({ state: S.state }) }); } catch (e) {}
  });

  if (!online) { setStatus("local", "Opened from a file: saved on this device only."); settle(); }
  else if (!code) { setStatus("needcode", "Enter the trip code to share votes and notes with the group."); settle(); }
  else { setStatus("syncing"); pull(); startPolling(); }
})();
