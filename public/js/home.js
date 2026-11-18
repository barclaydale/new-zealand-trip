/* Home: hero, "your dates", category tiles, top must-dos, recently added by the group. */
(function () {
  const NZ = window.NZ, UI = NZ.ui, esc = NZ.esc;
  UI.header("home");
  document.getElementById("hero-art").innerHTML = UI.art("lake", NZ.CAT.classics.pal, "home-hero", "Snow-capped mountains above a lake");

  const byMust = (a, b) => b.m - a.m || NZ.groupScore(b.id) - NZ.groupScore(a.id) || b.av - a.av || a.name.localeCompare(b.name);

  function render() {
    const items = NZ.all().filter(NZ.onIsland), isl = NZ.island();
    const where = isl === "all" ? "New Zealand" : NZ.ISLANDS[isl];

    document.getElementById("hero-stats").innerHTML = [[items.length, "Things to do"], [items.filter((a) => a.m === 5).length, "Don't-miss"], [NZ.people().length, "In the group"], [NZ.custom().length, "Added by us"]]
      .map((x) => `<div><b>${x[0]}</b><span>${x[1]}</span></div>`).join("");

    document.getElementById("cats").innerHTML = NZ.CATS.map((c) => {
      const list = items.filter((a) => a.cats.includes(c.k)).sort(byMust);
      return `<a class="ccard c-${c.k}" href="category.html?c=${c.k}"><div class="ccard-art">${UI.catArt(c)}<span class="count">${list.length} in ${esc(where)}</span></div>
        <div class="ccard-body"><h3>${esc(c.label)}</h3><p>${esc(c.blurb)}</p>${list.length ? `<ol>${list.slice(0, 3).map((a) => `<li>${esc(a.name)} <small>· ${esc(a.region)}</small></li>`).join("")}</ol>` : ""}</div></a>`;
    }).join("");

    document.getElementById("must-sub").textContent = `Highest must-do rating in ${where}, with group votes as the tie-breaker.`;
    const top = items.slice().sort(byMust).slice(0, 6);
    document.getElementById("must").innerHTML = top.length ? top.map(UI.card).join("") : UI.empty("Nothing here yet", "Switch islands above.");

    const recent = NZ.custom().sort((a, b) => b.added - a.added).slice(0, 6);
    document.getElementById("recent").innerHTML = recent.length ? recent.map(UI.card).join("")
      : UI.empty("Nothing added yet", `Heard about a great walk or restaurant? <button class="linkbtn" type="button" onclick="NZ.ui.edit(null)">Add it</button> and the whole group can vote on it.`);
  }
  render();
  document.addEventListener("nz:data", render);
  document.addEventListener("nz:island", render);
})();
