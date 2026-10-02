# Session: shade hosts by peak CPU -- Chris, ML engineer (recommendation systems)

Task as given by the moderator: "Shade the hosts by how hard their processors work at their busiest
moments, so the overloaded ones stand out. The data on screen is a sample: a company's IT estate,
hosts and the network connections between them, with dozens of things recorded about each. If that
is not your line of work, treat it as your own wide spreadsheet."

Start screen: shots/tasks/t09-wide/01.png. Renders: tmp/round-7-sessions/t09-wide--ml-engineer-recsys/.
Every command was run from design/ui/prototype as
`timeout 120 node app-b/study.mjs --try <render> task:t09-wide <steps>`; only the steps are listed below.

## Think-aloud

**Start.** 300 nodes, 1,105 edges, "Columns: 8 of 69". It's a wide table, so it's not my
user-item graph, but I'll treat it like a feature table. I need a column for peak CPU and a
"color by". There's a banner, "Nothing is colored or sized by a row", and a Style tab on the right.

**01** `--click "Style"` -- The Style tab only has canvas settings (background, print-safe colors,
labels) and layout (Spread Out, seed 7). Nothing about node color. Wrong place.

**02** `--click "Nothing is colored or sized by a row"` -- Nothing happened. It's a status label,
not a button. It also says "row", and I don't know what a row is here. A table row? A host?

**03** `--click "Table"` -- The table is "from hosts-2026-03.csv" and keeps my ids (CI0100003...).
Good. The visible columns are identity fields: id, hostname, fqdn, ip, mac, role. The CPU numbers
must be in the 61 hidden columns.

**04** `--click "Table" --click "Columns: 8 of 69"` -- The column picker has a "Find attribute"
box and an alphabetical list. I can see cpu_cores and cpu_model and then it's cut off.

**05** `... --type "cpu"` -- The typing didn't register and the list didn't filter. I moved on.

**06** `--click "Table" --click "role"` -- Clicking a header sorts it. A chevron appears next to the
header, and in a BI tool that's the column menu.

**07** `--click "Everything"` -- "Everything" turns out to be the default look: "Paints 300
nodes, 1,105 edges", Fill Color 6366F1. Constant color only.

**08** `--click "Everything" --click "6366F1"` -- A plain color picker. It does warn about orange
and vermilion for deuteranopia, which is nice but not what I asked for. A little database-cylinder
icon appeared next to the Color field. That looks like "bind to data".

**09** `--click "Everything" --key Escape --hover "Color"` -- Escape dropped my selection
entirely. Annoying.

**10** `--click "Everything" --hover "Color"` -- The tooltip on the label: "The default look;
change it to override". The cylinder icon has no visible name.

(no render) I guessed names for the cylinder: "From data", "Bind to data", "Color by column",
"Use data", "Map to data", "Set by data", "Data-driven", "Pick a column", "Color from a column".
Nothing on screen is called any of those. With a real mouse I'd have hovered the icon and read its
tooltip. I gave up on it.

**11** (no new screen) Guessing the header chevron: "Column menu" exists; "role menu" and "Column
options" do not.

**12** `--click "Table" --click "Column menu"` -- A menu headed "id": Color by, Size by (grayed,
"Not a number"), Label by, Show as groups, Filter to..., Create set where this is..., Read as...,
Edit on the Data page. That's the right pattern. But it's the id column's menu, and I need the
CPU column.

(no render) I guessed the peak column's name in the picker: cpu_util_p95 and cpu_util_max hit;
cpu_p95, cpu_peak, cpu_max, cpu_util_p99, cpu_usage_p95 and cpu_pct_p95 don't.

**13** `--click "Table" --click "Columns: 8 of 69" --click "cpu_util_p95"` -- The list scrolled to
it. The real names are cpu_util_max_pct, cpu_util_p50_pct and cpu_util_p95_pct. "Busiest moments"
-- I pick p95. Max is a single spike (a cron job, a reboot), and p95 is what you'd actually call
loaded. I ticked it, and the count went to 9 of 69.

**14** `... --key Escape --click "cpu_util_p95_pct"` -- The table scrolled to the new column
and sorted descending. Top values are 79.1, 77.8, 77.3... So the "overloaded" hosts top out around
80% at p95.

**15** `... --click "Column menu"` -- That opened the id menu again, not the cpu one. I tried
"cpu_util_p95_pct menu", "Column menu: cpu_util_p95_pct", "cpu_util_p95_pct column menu" and
"Menu for cpu_util_p95_pct", and none of them exist. A mouse user would just click the chevron.

**16** `--click "Data"` -- The Data page: sources (hosts-2026-03.csv, 300 nodes;
connections-2026-03.csv, 1,105 rows, 1,105 edges), filters, attributes. It has counts everywhere,
which I like.

**17** `--click "Data" --click "cpu_util_p95_pct"` -- This is the panel I'd want in any tool:
Number, from hosts-2026-03.csv, 100% filled (300 of 300), range 10.5 to 79.1, median 47.6,
"Painted by: No row paints from cpu_util_p95_pct." There's no button to make one there, though.

**18** `--click "Data" --click "cpu_util_p95_pct" --click "More actions"` -- The "..." at the
top right has the same menu, headed cpu_util_p95_pct: Color by, Size by, and so on.

**19** `... --click "Color by"` -- Done. Legend banner: "Color: cpu_util_p95_pct, 10.5 to 79.1"
with a ramp swatch. A new entry cpu_util_p95_pct sits in the left tree above Everything. The
right panel: "Paints 300 hosts (every host with a value)", Fill "Orange to brown". It has a
denominator, a range, my original column name, and no magic.

But do the overloaded ones "stand out"? Not really. It's orange to dark brown on tiny dots. The
dark-brown high end reads almost like the previous gray, and on a laptop screen I can't pick out
the hot hosts at a glance. I'd want either a ramp where high means bright, or a "highlight above
75%" threshold. I'm stopping here.

## Verdict

- **Succeeded?** Yes, mechanically. Hosts are colored by p95 CPU with a legend and counts. I'm
  less sure the "stand out" part landed, because the default ramp doesn't make the hot hosts pop.
- **Single Ease Question:** 3 of 7. I got there in about 19 steps. The first three places I
  looked (the Style tab, the banner, the Fill color) were all dead ends for "color by a column".
  The column menu was the right idea, but the first one I hit belonged to id. The Data page's
  attribute panel was the clean path, and its "Painted by: none" section has no button to start
  painting, which is exactly where I'd have clicked.
- **Would I use it instead of my current tool?** Not for this. In a notebook it's
  `df.plot(c="cpu_util_p95_pct")` and I'd pick the colormap myself. What would pull me over is
  the attribute panel (fill %, range, median, "painted by") next to the graph, plus the
  column-menu actions, if "Color by" were reachable from the Style tab and the default ramp made
  high values obvious.

## Problems noticed

1. Node styling isn't where "Style" is. The graph's Style tab is canvas and layout only, and
   coloring by a column lives in a column menu or an attribute's "..." menu.
2. The status banner "Nothing is colored or sized by a row" looks clickable but isn't, and "row"
   is ambiguous next to a data table where a row means a host.
3. The attribute panel's "Painted by: No row paints from ..." states the gap but offers no action
   right there.
4. The default sequential ramp (orange to brown) puts the highest values at the darkest, lowest-
   contrast end, so "the overloaded ones stand out" isn't met by default.
5. The data-binding icon next to Fill Color has no visible label, so I couldn't tell what it does.
6. Escape in the right panel cleared my whole selection, not just a popover.
