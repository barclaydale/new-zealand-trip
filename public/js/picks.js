/* Group picks: every activity ranked by the group's votes, one column per person. */
(function () {
  const NZ = window.NZ, UI = NZ.ui, esc = NZ.esc;
  UI.header("picks");
  const F = { show: "voted", cat: "" };
  const SHOW = [["voted", "Anyone voted"], ["loved", "Someone loves"], ["mine", "I haven't voted"], ["all", "Everything"]];
  const showEl = document.getElementById("f-show");
  showEl.innerHTML = SHOW.map(([v, l]) => `<button type="button" data-v="${v}" aria-pressed="${F.show === v}">${l}</button>`).join("");
  showEl.onclick = (e) => { const b = e.target.closest("[data-v]"); if (!b) return; F.show = b.dataset.v; showEl.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); render(); };
  const catEl = document.getElementById("f-cat");
  catEl.innerHTML = `<option value="">All categories</option>` + NZ.CATS.map((c) => `<option value="${c.k}">${esc(c.label)}</option>`).join("");
  catEl.onchange = () => { F.cat = catEl.value; render(); };

  const icon = { love: "heart", like: "up", pass: "down" };
  function render() {
    const people = NZ.people(), me = NZ.meId();
    const pool = NZ.all().filter((a) => NZ.onIsland(a) && (!F.cat || a.cats.includes(F.cat)));

    document.getElementById("people").innerHTML = people.length ? people.map((p) => {
      const n = pool.filter((a) => NZ.vote(a.id, p.id)).length, loves = pool.filter((a) => NZ.vote(a.id, p.id) === "love").length;
      return `<div class="pcard"><span class="av" style="background:${esc(p.color)}">${esc(NZ.initials(p.name))}</span><div><b>${esc(p.name)}${p.id === me ? " (you)" : ""}</b><small>${n} of ${pool.length} voted · ${loves} loved</small></div></div>`;
    }).join("") : `<p class="sub">No-one has joined yet. <button class="linkbtn" type="button" onclick="NZ.ui.who()">Add your name</button> to start voting.</p>`;

    const rows = pool.filter((a) => {
      const v = NZ.votesFor(a.id);
      if (F.show === "voted") return v.love.length + v.like.length + v.pass.length > 0;
      if (F.show === "loved") return v.love.length > 0;
      if (F.show === "mine") return me && !NZ.vote(a.id, me);
      return true;
    }).sort((a, b) => NZ.groupScore(b.id) - NZ.groupScore(a.id) || b.m - a.m || a.name.localeCompare(b.name));

    const board = document.getElementById("board");
    if (!rows.length) { board.innerHTML = UI.empty(F.show === "mine" ? "You've voted on everything here 🎉" : "No votes yet", F.show === "mine" ? "Nice work." : `Vote on cards in <a href="category.html?c=all">Explore</a> and they'll show up here, ranked.`); return; }
    board.innerHTML = `<table><thead><tr><th>#</th><th>Activity</th>${people.map((p) => `<th class="p" title="${esc(p.name)}"><span class="av sm" style="background:${esc(p.color)}">${esc(NZ.initials(p.name))}</span></th>`).join("")}<th>Must do</th><th>Price</th><th>Time</th><th class="p">Score</th></tr></thead><tbody>${rows.map((a, i) => {
      const s = NZ.groupScore(a.id), pl = NZ.priceLevel(a.nz), notes = NZ.notesFor(a.id).length;
      return `<tr><td>${i + 1}</td><td class="name"><button type="button" class="openbtn" data-open="${esc(a.id)}"><b>${esc(a.name)}</b><small>${esc(a.region)} · ${esc(a.cats.map((k) => NZ.CAT[k].short).join(", "))}${notes ? ` · ${notes} note${notes > 1 ? "s" : ""}` : ""}${a.custom ? " · added" : ""}</small></button></td>
        ${people.map((p) => { const v = NZ.vote(a.id, p.id); return `<td class="p"><span class="vdot ${v || ""}" title="${esc(p.name)}: ${v ? (v === "like" ? "keen" : v) : "not voted"}">${v ? UI.icons[icon[v]] : "·"}</span></td>`; }).join("")}
        <td><span class="mini" title="${esc(NZ.MUST_LABEL[a.m])}">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= a.m ? "on" : ""}"></i>`).join("")}</span></td>
        <td><span class="dollars">${pl ? "$".repeat(pl) : "Free"}</span></td><td>${NZ.durText(a.h)}</td><td class="score${s < 0 ? " neg" : ""}">${s > 0 ? "+" + s : s}</td></tr>`;
    }).join("")}</tbody></table>`;
  }

  // open the full card in a dialog (vote / notes work there too)
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-open]"); if (!b) return;
    const a = NZ.get(b.dataset.open); if (!a) return;
    let dlg = document.getElementById("card-dlg");
    if (!dlg) { dlg = document.createElement("dialog"); dlg.id = "card-dlg"; dlg.className = "wide"; document.body.appendChild(dlg); }
    dlg.innerHTML = `<div class="dlg-card">${UI.card(a)}<div class="dlg-foot" style="margin-top:10px"><button class="btn" type="button" onclick="this.closest('dialog').close()">Close</button></div></div>`;
    dlg.onclose = render;
    dlg.showModal();
  });

  render();
  document.addEventListener("nz:data", render);
  document.addEventListener("nz:island", render);
  document.addEventListener("nz:vote", () => { if (!document.getElementById("card-dlg") || !document.getElementById("card-dlg").open) render(); });
})();
