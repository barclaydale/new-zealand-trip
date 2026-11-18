# Activity data format

`south.js` and `north.js` each call `NZ.add(island, rows)`, where `island` is `"S"` or `"N"` and each row is:

| key | meaning |
|---|---|
| `n` | Name (unique within the island; the id is `s/<slug of name>`) |
| `c` | Categories, space-separated. The first is the main one (sets the card colour). Any of: `classics nature onlynz history culture food` |
| `r` | Region. Must be one of `NZ.REGIONS` in `js/core.js` so the region filter finds it |
| `b` | Town / base, free text |
| `d` | Description |
| `nz` | Price per adult in NZ$ (0 = free). Drives the **price** rating: Free · ≤40 $ · ≤120 $$ · ≤250 $$$ · ≤500 $$$$ · more $$$$$ |
| `pn` | Price note (ranges, combos, what's included) |
| `av` | **Availability** for late March / early April, 1–5: 5 just turn up · 4 a few days ahead · 3 a week or so ahead / weather-dependent · 2 weeks ahead · 1 very hard or off-season |
| `an` | Timing note for those dates (Easter, tides, season, booking) |
| `h` | Typical duration in hours (multi-day: 24 per day). Drives the **duration** rating: ≤1 · ≤3 · ≤6 · ≤12 · more |
| `hn` | Duration note |
| `m` | **Must do**, 1–5: 5 don't miss · 4 highly recommended · 3 worth it if nearby · 2 nice extra · 1 only if keen |
| `fb` | "What people say": a summary of common themes in traveller reviews, not a quote |
| `g` | `1` = **hidden gem** (off the beaten path). Omit otherwise. "Book early" is automatic when `av` ≤ 2 |
| `u` | Main link: `u:https://…` (official site) or `w:Search term` (Wikipedia). Tripadvisor and Google review links are added automatically |

Activities the group adds through the site use the same fields, but they're stored in the shared database, not here.

Run `npm run check-data` after editing.
