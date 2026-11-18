/* Fern & Fiord — approximate real-world coordinates: overnight bases for the itinerary, and a small
   gazetteer of named places used to put every activity on the map.

   Activities don't carry their own coordinates. Each one is placed by matching its name and "base"
   text against the named places below (longest match wins), falling back to its region's main town,
   then nudged by a small deterministic jitter so several things at one place fan out instead of
   stacking. Good for "which valley is this in" and for rough drive times, not a substitute for the
   operator's meeting point (same spirit as the site's price and time estimates). */
(function () {
  const NZ = window.NZ;

  /* ---------- overnight bases: [id, name, island, lat, lng] ---------- */
  const B = [
    ["christchurch", "Christchurch", "S", -43.5321, 172.6362], ["akaroa", "Akaroa", "S", -43.8037, 172.9680],
    ["kaikoura", "Kaikōura", "S", -42.4008, 173.6814], ["hanmer", "Hanmer Springs", "S", -42.5236, 172.8290],
    ["picton", "Picton", "S", -41.2906, 174.0010], ["blenheim", "Blenheim", "S", -41.5134, 173.9612],
    ["havelock", "Havelock", "S", -41.2810, 173.7670], ["nelson", "Nelson", "S", -41.2706, 173.2840],
    ["motueka", "Motueka / Kaiteriteri", "S", -41.1083, 173.0119], ["takaka", "Tākaka (Golden Bay)", "S", -40.8565, 172.8064],
    ["westport", "Westport", "S", -41.7545, 171.6010], ["punakaiki", "Punakaiki", "S", -42.1080, 171.3370],
    ["greymouth", "Greymouth", "S", -42.4499, 171.2077], ["hokitika", "Hokitika", "S", -42.7167, 170.9667],
    ["arthurspass", "Arthur's Pass", "S", -42.9396, 171.5626], ["franzjosef", "Franz Josef", "S", -43.3880, 170.1830],
    ["fox", "Fox Glacier", "S", -43.4640, 170.0170], ["haast", "Haast", "S", -43.8810, 169.0420],
    ["wanaka", "Wānaka", "S", -44.6990, 169.1320], ["queenstown", "Queenstown", "S", -45.0312, 168.6626],
    ["arrowtown", "Arrowtown", "S", -44.9420, 168.8310], ["glenorchy", "Glenorchy", "S", -44.8510, 168.3880],
    ["cromwell", "Cromwell", "S", -45.0380, 169.1990], ["teanau", "Te Anau", "S", -45.4140, 167.7180],
    ["manapouri", "Manapōuri", "S", -45.5640, 167.6150], ["milford", "Milford Sound", "S", -44.6710, 167.9260],
    ["tekapo", "Lake Tekapo", "S", -44.0047, 170.4770], ["mtcook", "Aoraki/Mt Cook Village", "S", -43.7350, 170.0960],
    ["twizel", "Twizel", "S", -44.2580, 170.1000], ["omarama", "Omarama", "S", -44.4870, 169.9680],
    ["timaru", "Timaru", "S", -44.3970, 171.2540], ["oamaru", "Ōamaru", "S", -45.0970, 170.9710],
    ["dunedin", "Dunedin", "S", -45.8788, 170.5028], ["naseby", "Naseby", "S", -45.0230, 170.1450],
    ["catlins", "The Catlins (Owaka)", "S", -46.4500, 169.6590], ["invercargill", "Invercargill", "S", -46.4132, 168.3538],
    ["bluff", "Bluff", "S", -46.6000, 168.3330], ["stewart", "Stewart Island (Oban)", "S", -46.8990, 168.1300],
    ["auckland", "Auckland", "N", -36.8485, 174.7633], ["paihia", "Paihia (Bay of Islands)", "N", -35.2820, 174.0910],
    ["whitianga", "Whitianga / Hahei", "N", -36.8330, 175.7000], ["matamata", "Matamata", "N", -37.8100, 175.7700],
    ["waitomo", "Waitomo", "N", -38.2610, 175.1040], ["hamilton", "Hamilton", "N", -37.7870, 175.2793],
    ["rotorua", "Rotorua", "N", -38.1368, 176.2497], ["tauranga", "Tauranga / Mt Maunganui", "N", -37.6390, 176.1850],
    ["taupo", "Taupō", "N", -38.6857, 176.0702], ["tongariro", "National Park Village", "N", -39.1770, 175.4020],
    ["napier", "Napier", "N", -39.4928, 176.9120], ["wellington", "Wellington", "N", -41.2865, 174.7762]
  ];
  NZ.BASES = {}; NZ.BASE_ORDER = [];
  B.forEach(([id, name, island, lat, lng]) => { NZ.BASES[id] = { id, name, island, c: [lat, lng] }; NZ.BASE_ORDER.push(id); });
  NZ.AIRPORTS = ["auckland", "christchurch", "queenstown", "wellington", "dunedin"];

  // the main town for each region: where an activity lands when nothing more specific matches
  NZ.REGION_BASE = {
    "Queenstown": "queenstown", "Wānaka": "wanaka", "Fiordland": "teanau", "Aoraki / Mt Cook & Mackenzie": "twizel",
    "Christchurch & Canterbury": "christchurch", "Akaroa": "akaroa", "Kaikōura": "kaikoura", "Nelson & Abel Tasman": "nelson",
    "Marlborough": "blenheim", "West Coast": "hokitika", "Dunedin & Otago": "dunedin", "Catlins & Southland": "invercargill",
    "Stewart Island": "stewart", "Auckland": "auckland", "Northland & Bay of Islands": "paihia", "Coromandel": "whitianga",
    "Waikato": "hamilton", "Rotorua": "rotorua", "Bay of Plenty": "tauranga", "Taupō & Tongariro": "taupo",
    "Hawke's Bay": "napier", "Wellington": "wellington"
  };

  /* ---------- named places (matched against an activity's name + base text) ---------- */
  const P = {
    // Fiordland
    "milford sound": [-44.6414, 167.8974], "deepwater basin": [-44.6740, 167.9230], "mirror lakes": [-44.9910, 168.0130],
    "the divide": [-44.8240, 168.1180], "key summit": [-44.8150, 168.1300], "homer tunnel": [-44.7640, 168.0870],
    "lake marian": [-44.8000, 168.1380], "doubtful sound": [-45.3000, 167.0500], "te anau downs": [-45.1940, 167.8240],
    "luxmore": [-45.3870, 167.6200], "te anau": [-45.4140, 167.7180], "manapouri": [-45.5640, 167.6150],
    // Queenstown, Wānaka, Central Otago
    "arthurs point": [-44.9970, 168.6730], "onsen": [-44.9960, 168.6820], "kawarau": [-45.0090, 168.9120], "gibbston": [-45.0170, 168.9700],
    "skyline": [-45.0320, 168.6480], "ben lomond": [-45.0040, 168.6280], "queenstown hill": [-45.0270, 168.6700],
    "moke lake": [-44.9960, 168.5730], "walter peak": [-45.1110, 168.5280], "steamer wharf": [-45.0340, 168.6600],
    "nevis": [-45.1410, 168.9840], "queenstown airport": [-45.0210, 168.7390], "lake hayes": [-44.9760, 168.8100],
    "glenorchy": [-44.8510, 168.3880], "arrowtown": [-44.9420, 168.8310], "queenstown": [-45.0312, 168.6626],
    "roys peak": [-44.6930, 169.0820], "isthmus peak": [-44.6700, 169.2440], "diamond lake": [-44.6540, 168.9590],
    "mou waho": [-44.5760, 169.0740], "rob roy": [-44.4740, 168.7360], "puzzling world": [-44.7010, 169.1600],
    "wanaka lakefront": [-44.6960, 169.1350], "blue pools": [-44.1590, 169.2730], "haast pass": [-44.1590, 169.2730],
    "cardrona valley": [-44.8640, 168.9930], "cardrona": [-44.8740, 169.0090], "wanaka": [-44.6990, 169.1320],
    "cromwell": [-45.0380, 169.1990], "clyde": [-45.1860, 169.3150], "naseby": [-45.0230, 170.1450], "st bathans": [-44.8710, 169.8110],
    // Mt Cook & Mackenzie
    "hooker valley": [-43.7180, 170.0960], "mueller hut": [-43.7210, 170.0650], "tasman glacier": [-43.6950, 170.1690],
    "mt cook airport": [-43.7650, 170.1330], "hermitage": [-43.7350, 170.0960], "aoraki/mt cook village": [-43.7350, 170.0960],
    "lake pukaki": [-44.1880, 170.1490], "good shepherd": [-44.0050, 170.4860], "takapo": [-44.0047, 170.4770], "lake tekapo": [-44.0047, 170.4770],
    "fairlie": [-44.0990, 170.8300], "clay cliffs": [-44.5300, 169.8780], "omarama": [-44.4870, 169.9680], "timaru": [-44.3970, 171.2540],
    // West Coast
    "franz josef": [-43.3880, 170.1830], "okarito": [-43.2210, 170.1630], "lake matheson": [-43.4420, 169.9660], "fox glacier": [-43.4640, 170.0170],
    "hokitika gorge": [-42.9560, 171.0080], "hokitika": [-42.7167, 170.9667], "shantytown": [-42.5410, 171.1850], "greymouth": [-42.4499, 171.2077],
    "punakaiki": [-42.1140, 171.3270], "paparoa": [-42.1140, 171.3270], "barrytown": [-42.2420, 171.3290],
    "cape foulwind": [-41.7470, 171.4630], "denniston": [-41.7430, 171.7970], "westport": [-41.7545, 171.6010],
    // Canterbury
    "arthur's pass": [-42.9396, 171.5626], "castle hill": [-43.2300, 171.7200], "mt sunday": [-43.5920, 171.0310], "erewhon": [-43.5920, 171.0310],
    "hanmer springs": [-42.5236, 172.8290], "waipara": [-43.0600, 172.7600], "christchurch airport": [-43.4890, 172.5440],
    "willowbank": [-43.4750, 172.6080], "christchurch": [-43.5321, 172.6362], "akaroa": [-43.8037, 172.9680],
    "point kean": [-42.4250, 173.7120], "kaikoura coast, sh1": [-42.2410, 173.8340], "kaikoura": [-42.4008, 173.6814],
    // Top of the South
    "kaiteriteri": [-41.0150, 173.0110], "marahau": [-41.0080, 173.0040], "golden bay (far north-west tip)": [-40.5000, 172.6830],
    "collingwood": [-40.6780, 172.6800], "takaka": [-40.8565, 172.8064], "montgomery square": [-41.2740, 173.2840], "nelson": [-41.2706, 173.2840],
    "pelorus bridge": [-41.2990, 173.5740], "havelock": [-41.2810, 173.7670], "picton": [-41.2906, 174.0010],
    "renwick": [-41.5070, 173.8290], "blenheim": [-41.5134, 173.9612],
    // Otago & Southland
    "taiaroa head": [-45.7740, 170.7270], "otago peninsula": [-45.8500, 170.6900], "tunnel beach": [-45.9210, 170.4590],
    "north of dunedin": [-45.7720, 170.6050], "dunedin": [-45.8788, 170.5028], "oamaru harbour": [-45.1080, 170.9800], "oamaru": [-45.0970, 170.9710],
    "koekohe": [-45.3450, 170.8280], "between dunedin and invercargill": [-46.4470, 169.8150], "invercargill": [-46.4132, 168.3538],
    "oban": [-46.8990, 168.1300], "bluff": [-46.6000, 168.3330],
    // North Island
    "matamata": [-37.8580, 175.6800], "waitomo": [-38.2610, 175.1040], "whakarewarewa forest": [-38.1580, 176.2740],
    "forest setting": [-38.2090, 176.2950], "30 min south of rotorua": [-38.3560, 176.3700], "tarawera": [-38.2000, 176.3400],
    "rotorua lakefront": [-38.1390, 176.2580], "rotorua": [-38.1368, 176.2497], "tongariro national park": [-39.1350, 175.6500],
    "north of taupo": [-38.6490, 176.0900], "lake taupo": [-38.8030, 175.9080], "taupo": [-38.6857, 176.0702],
    "paihia": [-35.2690, 174.0800], "russell": [-35.2620, 174.1220], "kerikeri": [-35.2160, 173.9620],
    "auckland domain": [-36.8600, 174.7780], "waiheke": [-36.8000, 175.1000], "rangitoto": [-36.7870, 174.8600],
    "west of auckland": [-36.9540, 174.4710], "auckland cbd": [-36.8485, 174.7622], "epsom": [-36.8930, 174.7720],
    "tiritiri": [-36.6000, 174.8920], "leigh": [-36.2700, 174.7980], "auckland": [-36.8485, 174.7633],
    "hahei": [-36.8380, 175.8000], "mount maunganui": [-37.6320, 176.1720], "te awanga": [-39.6450, 177.0890],
    "havelock north": [-39.6820, 176.9050], "napier": [-39.4928, 176.9120],
    "wellington waterfront": [-41.2905, 174.7820], "miramar": [-41.3060, 174.8270], "karori": [-41.2900, 174.7540], "wellington": [-41.2865, 174.7762]
  };
  // normalise macrons and curly quotes so "Wānaka", "Arthur’s Pass" and "wanaka", "arthur's pass" all match
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’`]/g, "'");
  NZ.normPlace = norm;
  const PLACES = Object.keys(P).map((k) => [norm(k), P[k]]);

  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  // small deterministic offset (in meters) so things sharing a named place fan out
  function jitter(seed, meters, lat) {
    const h = hash(seed), a = (h % 360) * (Math.PI / 180), r = (((h >>> 9) % 1000) / 1000) * meters;
    return [(r * Math.cos(a)) / 111320, (r * Math.sin(a)) / (111320 * Math.cos((Math.abs(lat) * Math.PI) / 180))];
  }
  // the name wins if it names a place (longest match); otherwise the place mentioned first in the base text,
  // since "Timaru (on the way to Tekapo or Dunedin)" is about Timaru, not Dunedin
  const findIn = (text, earliest) => {
    let best = null, len = 0, pos = Infinity;
    PLACES.forEach(([k, c]) => {
      const i = text.indexOf(k); if (i < 0) return;
      if (earliest ? i < pos || (i === pos && k.length > len) : k.length > len) { best = { k, c }; len = k.length; pos = i; }
    });
    return best;
  };
  // the few activities whose name points somewhere other than where you actually go to do them
  const AT = { "s/milford-sound-scenic-flight-from-queenstown": "queenstown airport" };
  NZ.placeOf = function (a) {
    const hit = AT[a.id] ? { k: AT[a.id], c: P[AT[a.id]] } : findIn(norm(a.name), false) || findIn(norm(a.base), true);
    let best = hit ? hit.c : null;
    const exact = !!best;
    if (!best) { const b = NZ.BASES[NZ.REGION_BASE[a.region]] || NZ.BASES[a.island === "N" ? "auckland" : "christchurch"]; best = b.c; }
    return { c: best, exact, key: hit ? hit.k : "" };
  };
  const cache = {};
  NZ.coordOf = function (a) {
    if (cache[a.id]) return cache[a.id];
    const p = NZ.placeOf(a), [dl, dg] = jitter(a.id, p.exact ? 250 : 900, p.c[0]);
    return (cache[a.id] = [p.c[0] + dl, p.c[1] + dg]);
  };

  /* ---------- distances & travel ---------- */
  NZ.km = function (p, q) {
    const R = 6371, rad = Math.PI / 180, dLat = (q[0] - p[0]) * rad, dLng = (q[1] - p[1]) * rad;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(p[0] * rad) * Math.cos(q[0] * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };
  NZ.ROAD = { factor: 1.4, kmh: 78, fuelPerKm: 0.2 };   // factor: rough road ÷ straight-line distance, for "≈ km from base" hints
  NZ.FERRY = { mins: 210, pp: 90, car: 260, buffer: 60, note: "Interislander or Bluebridge, Picton ⇄ Wellington (≈ 3.5 h; car fare extra)" };
  NZ.FLY = { buffer: 100 };   // check-in, bags and getting to/from the airport

  /* road network: [a, b, road km, average km/h (default NZ.ROAD.kmh)]. Real distances between neighbouring
     bases, so routes go around the Southern Alps (Mt Cook → Franz Josef is ~6 h via Haast Pass, not 40 km). */
  const ROADS = [
    ["christchurch", "akaroa", 84, 60], ["christchurch", "kaikoura", 180], ["christchurch", "hanmer", 135], ["christchurch", "arthurspass", 150, 75], ["hokitika", "arthurspass", 100, 70],
    ["christchurch", "timaru", 160, 90], ["christchurch", "tekapo", 225, 80], ["kaikoura", "picton", 155], ["kaikoura", "hanmer", 130, 65],
    ["picton", "blenheim", 28], ["blenheim", "havelock", 40], ["havelock", "picton", 35, 50], ["havelock", "nelson", 75, 70],
    ["nelson", "motueka", 47], ["motueka", "takaka", 57, 55], ["nelson", "westport", 225, 75], ["westport", "punakaiki", 57, 70],
    ["punakaiki", "greymouth", 44, 70], ["greymouth", "arthurspass", 98, 65], ["greymouth", "hokitika", 40], ["hokitika", "franzjosef", 135, 80],
    ["franzjosef", "fox", 25, 60], ["fox", "haast", 120, 72], ["haast", "wanaka", 140, 70], ["wanaka", "queenstown", 68, 65],
    ["wanaka", "cromwell", 55, 85], ["cromwell", "queenstown", 60, 70], ["queenstown", "arrowtown", 20, 60], ["queenstown", "glenorchy", 46, 65],
    ["queenstown", "teanau", 170, 85], ["teanau", "manapouri", 20], ["teanau", "milford", 120, 55], ["teanau", "invercargill", 155, 85],
    ["invercargill", "bluff", 30], ["invercargill", "catlins", 140, 65], ["catlins", "dunedin", 115, 70], ["dunedin", "invercargill", 205, 85],
    ["dunedin", "oamaru", 115, 85], ["oamaru", "timaru", 85, 90], ["oamaru", "omarama", 120, 80], ["omarama", "twizel", 30, 90],
    ["twizel", "mtcook", 65, 80], ["twizel", "tekapo", 58, 90], ["tekapo", "timaru", 105, 80], ["omarama", "wanaka", 115, 80],
    ["omarama", "cromwell", 118, 80], ["cromwell", "naseby", 160, 75], ["naseby", "dunedin", 130, 75], ["dunedin", "cromwell", 220, 80],
    ["auckland", "paihia", 230, 75], ["auckland", "whitianga", 195, 65], ["auckland", "hamilton", 125, 90], ["hamilton", "matamata", 60],
    ["hamilton", "waitomo", 75], ["matamata", "rotorua", 65], ["matamata", "tauranga", 60], ["whitianga", "tauranga", 190, 65],
    ["tauranga", "rotorua", 60], ["rotorua", "taupo", 80, 85], ["taupo", "tongariro", 105, 80], ["taupo", "napier", 140, 75],
    ["waitomo", "tongariro", 145, 75], ["tongariro", "wellington", 330, 82], ["napier", "wellington", 320, 82]
  ];
  // sea crossings with their own fares: [a, b, mins, NZ$ per person, NZ$ for the car (0 = foot passengers only), note]
  const SEA = [
    ["picton", "wellington", NZ.FERRY.mins, NZ.FERRY.pp, NZ.FERRY.car, NZ.FERRY.note],
    ["bluff", "stewart", 60, 95, 0, "Stewart Island Experience ferry, Bluff → Oban (≈ 1 h, foot passengers; leave the car in Bluff)"]
  ];
  const adj = {};
  const link = (a, b, e) => { (adj[a] = adj[a] || []).push(Object.assign({ to: b }, e)); (adj[b] = adj[b] || []).push(Object.assign({ to: a }, e)); };
  ROADS.forEach(([a, b, km, kmh]) => link(a, b, { mode: "drive", km, mins: Math.round((km / (kmh || NZ.ROAD.kmh)) * 60) }));
  SEA.forEach(([a, b, mins, pp, car, note]) => link(a, b, { mode: "ferry", km: 0, mins, pp, car, note, buffer: 45 }));
  // fastest route through the network (Dijkstra on minutes), then consecutive road links merged into one drive leg
  NZ.roadLegs = function (a, b) {
    const dist = { [a]: 0 }, prev = {}, todo = new Set([a]), done = new Set();
    while (todo.size) {
      let u = null; todo.forEach((n) => { if (u === null || dist[n] < dist[u]) u = n; });
      todo.delete(u); done.add(u); if (u === b) break;
      (adj[u] || []).forEach((e) => {
        if (done.has(e.to)) return;
        const alt = dist[u] + e.mins + (e.buffer || 0);
        if (dist[e.to] == null || alt < dist[e.to]) { dist[e.to] = alt; prev[e.to] = { from: u, e }; todo.add(e.to); }
      });
    }
    if (dist[b] == null) return null;
    const steps = []; for (let n = b; n !== a; n = prev[n].from) steps.unshift(Object.assign({ from: prev[n].from }, prev[n].e));
    const legs = [];
    steps.forEach((st) => {
      const last = legs[legs.length - 1];
      if (st.mode === "drive" && last && last.mode === "drive") { last.to = st.to; last.km += st.km; last.mins += st.mins; last.via.push(st.from); }
      else if (st.mode === "drive") legs.push({ mode: "drive", from: st.from, to: st.to, km: st.km, mins: st.mins, pp: 0, car: 0, via: [] });
      else legs.push({ mode: "ferry", from: st.from, to: st.to, km: 0, mins: st.mins, pp: st.pp, car: st.car, buffer: st.buffer, note: st.note });
    });
    legs.forEach((l) => { if (l.mode === "drive") l.car = Math.round(l.km * NZ.ROAD.fuelPerKm); });
    return legs;
  };
  const nearestAirport = (id) => NZ.AIRPORTS.slice().sort((x, y) => NZ.km(NZ.BASES[id].c, NZ.BASES[x].c) - NZ.km(NZ.BASES[id].c, NZ.BASES[y].c))[0];
  // domestic flight between the nearest airports, with the road (or ferry) at either end if a base isn't an airport town
  const fly = (a, b) => {
    const fa = nearestAirport(a), fb = nearestAirport(b);
    if (fa === fb) return null;
    const km = Math.round(NZ.km(NZ.BASES[fa].c, NZ.BASES[fb].c));
    const before = fa !== a ? NZ.roadLegs(a, fa) : [], after = fb !== b ? NZ.roadLegs(fb, b) : [];
    if (!before || !after) return null;
    return before.concat([{ mode: "fly", from: fa, to: fb, km, mins: Math.round(25 + km / 12), pp: Math.round(100 + km * 0.2), car: 0, buffer: NZ.FLY.buffer }], after);
  };
  const pack = (legs, pref) => {
    if (!legs) return null;
    let mins = 0, pp = 0, car = 0, km = 0;
    legs.forEach((l) => { mins += l.mins + (l.buffer || 0); pp += l.pp; car += l.car; km += l.km; });
    return { legs, mins, pp, car, km, pref };
  };
  // pref: "drive" | "fly" | "" (auto: the road, unless it's over 7 hours and flying is quicker)
  NZ.travel = function (a, b, pref) {
    if (!a || !b || a === b || !NZ.BASES[a] || !NZ.BASES[b]) return null;
    const d = pack(NZ.roadLegs(a, b), "drive"), f = pack(fly(a, b), "fly");
    if (!d && !f) return null;
    const auto = !d ? f : f && d.mins > 420 && f.mins < d.mins ? f : d;
    const pick = pref === "fly" && f ? f : pref === "drive" && d ? d : auto;
    // only offer the choice when flying is a real option (a long drive, or across Cook Strait)
    const choice = f && d && (d.mins > 240 || d.legs.some((l) => l.from === "picton" || l.to === "picton"));
    return Object.assign({}, pick, { alt: choice ? { drive: d, fly: f } : null });
  };
})();
