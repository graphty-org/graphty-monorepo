# Session: shade hosts by peak CPU -- knowledge engineer (Dr. Min-ji Kim)

Task as given: "Shade the hosts by how hard their processors work at their busiest moments, so the
overloaded ones stand out. The data on screen is a sample: a company's IT estate, hosts and the
network connections between them, with dozens of things recorded about each. If that is not your
line of work, treat it as your own wide spreadsheet."

Start screen: shots/tasks/t09-wide/01.png. Renders: tmp/round-7-sessions/t09-wide--knowledge-engineer/NN.png.
All commands run from design/ui/prototype; `T` below stands for
`timeout 120 node app-b/study.mjs --try $PWD/tmp/round-7-sessions/t09-wide--knowledge-engineer/NN.png task:t09-wide`.

## Think-aloud

**Start screen.** Not my line of work, so this is a wide table to me. 300 nodes, 1,105 edges,
"Columns: 8 of 69". A chip on the canvas says "Nothing is colored or sized by a row." Fine, at
least it tells me nothing is encoded yet -- most tools just show me grey and let me guess. The
inspector on the right has Style and Data tabs. Shading is style, so Style.

**01 -- `T --click "Style"`.** Graph-level style: background, print-safe colors, layout method
and seed. Nothing about nodes. Not here.

**02 -- `T --click "Nothing is colored or sized by a row"`.** I tried the chip in case it was the
way in. Nothing happened; it went back to the Data tab view. So it is a status, not a control.
Fair enough, but I expected it to open something.

**03 -- `T --click "Everything"`.** The left list has Selection, Notes, Everything. "Everything"
is a "built-in row", "Default look, under every other row". It has Fill > Color 6366F1. Odd: the
swatch says indigo but the dots on the canvas are grey. Is that the same thing? I do not know.

**04 -- `T --click "Everything" --click "6366F1"`.** A plain color picker. Custom / Libraries,
and a deuteranopia warning about orange and vermilion -- that one I appreciate, it is exactly my
problem. But this sets one color for everything; it does not shade by a value. A small database
icon appeared next to the color field. That is probably "use a value from the data", but I cannot
tell from an unlabeled can.

**05 -- `T --click "Everything" --hover "Color"`.** Tooltip: "The default look; change it to
override". Does not tell me what the database icon is.

**(no render) -- tried to reach the database icon by name:** "Color by a column", "From data",
"Use a column", "Bind to data", "Map to data", "Set from data", "Color by data", "Use data",
"Link to a column", "Use a value from the data" -- nothing on screen is called any of these. I
gave up on that icon. If I have to guess a control's name, it is not labeled well enough.

**06 -- `T --click "Table"`.** Find the column first, then worry about coloring. Table of hosts:
id, hostname, fqdn, ip_address, mac_address, role, tier...

**07 -- `T --click "Table" --click "Columns: 8 of 69"`.** Column chooser with a search box and
type markers (Abc, #, calendar) and fill percentages. Good -- that is a schema view I can read.

**08 -- `... --click "Find attribute" --key c --key p --key u`.** Five matches: cpu_model,
cpu_cores, cpu_util_p50_pct, cpu_util_p95_pct, cpu_util_max_pct. "Busiest moments" -- I take
p95. Max is one spike, which in monitoring data is usually a reboot or a backup job; p95 is the
honest "how loaded is it when it is busy". I would want to ask the moderator which one they meant,
and I note the task does not say.

**09 -- `... --click "cpu_util_p95_pct"`.** It ticked the checkbox; the column is added to the
table. That is all. Showing a column is not shading by it.

**11 -- `... --key Escape --click "cpu_util_p95_pct"`.** Clicking the header sorted it
descending: top value about 79.1. A chevron next to the header.

**12 -- `... --click "Column menu"`.** A column menu: Color by, Size by, Label by, Show as groups,
Filter to..., Create set where this is..., Read as..., Edit on the Data page. That is the
vocabulary I wanted. But the menu that opened is headed "id", not cpu_util_p95_pct. Whatever I
pointed at, it gave me the first column's menu.

**13 -- `... --click "Color by"`.** It colored by id: 300 unique values, "293 more values", eight
distinct colors cycling. Useless, and it added a row "id" to the left list. My mistake was
accepting a menu headed "id", but I clicked the chevron for my column. Undo exists, at least.

**14 -- `... --click "id"`.** Tried to change which column the "id" row reads from. It just
selected the row. No column picker in the header.

**15 -- `... --click "from hosts-2026"`.** The "Measure from hosts-2026..." link took me to the
Data page. Sources, Filters, and an Attributes list with cpu_util_p95_pct in it.

**16 -- `T --click "Data" --click "cpu_util_p95_pct"`.** Fresh start, straight to the attribute.
Inspector: Name, Read as Number, From hosts-2026-03.csv (imported, not computed), On 300 nodes,
Fill 100%: 300 of 300 hosts have a value, Range 10.5 to 79.1, Median 47.6, "Painted by: No row
paints from cpu_util_p95_pct". This is the best screen I have seen in the session. It tells me
provenance (imported, not computed), coverage, and range. I can check that against the source.

**17 -- `... --click "More actions"`.** Same menu as the column menu, this time correctly headed
cpu_util_p95_pct. Color by.

**18 -- `... --click "Color by"`.** Hosts shaded orange to brown. Legend chip: "Color:
cpu_util_p95_pct, 10.5 to 79.1". A row cpu_util_p95_pct appears in the list above Everything.
"Paints 300 hosts (every host with a value)". Good, it says what it painted.

But: do the overloaded ones *stand out*? Not really. Everything is some shade of orange-brown; the
darkest dots are scattered and small. I can tell light from dark, I cannot pick out "the
overloaded ones" at a glance. And 79.1 at p95 -- is that overloaded? Nothing on screen says where
"overloaded" starts.

**19 -- `... --click "Orange to brown"`.** "Color from cpu_util_p95_pct": Source, Scale Linear,
Palette, Values from Fit to data / Percentiles / Typed, Range 10.5 to 79.1, Clamp, No value
Nothing, Detach. This is a real mapping editor. I could type a range to push the dark end to,
say, 70 and up. A single-hue ramp is fine for my eyes -- no red versus green. I stop here: the
hosts are shaded by p95 CPU, and I can see how to sharpen it.

## Outcome

- Succeeded? Yes, I believe so -- hosts are colored by cpu_util_p95_pct with a labeled legend.
  "Stand out" is only partly met: a linear orange-to-brown ramp over 10.5-79.1 does not make the
  busy ones pop; I would need to set the range or a threshold, which I found but did not do.
- Single Ease Question: 3 of 7. Two dead ends (the unlabeled database icon, the column menu that
  opened for the wrong column and painted by id) before the Data page path worked.
- Would I use this instead of my current tool? For this job my current tool is a pandas notebook
  or a spreadsheet with conditional formatting, which takes me one line. This is not faster. What
  it does better is the attribute inspector -- imported versus computed, 300 of 300 filled, range,
  median, "nothing paints from it" -- and the legend that names the column. If the way in were
  obvious from the Style side I would consider it for showing others; today I would not switch.

## Problems I hit

1. The database icon beside Fill > Color has no visible label and its tooltip does not explain
   it; I could not tell it means "drive this from a column".
2. The table's column menu opened headed "id" when I was after cpu_util_p95_pct, and "Color by"
   then painted 300 unique ids -- a meaningless encoding applied without a warning.
3. Once a row is coloring by the wrong column, I found no way in its header to switch the column;
   I had to start over.
4. The canvas chip "Nothing is colored or sized by a row" looks clickable but does nothing; it
   could have been the entry point.
5. "Everything" shows Color 6366F1 (indigo) while the nodes on screen are grey.
6. The default ramp (linear, fit to data, orange to brown) does not make high values stand out;
   nothing suggests a threshold or percentile emphasis for "overloaded".
7. The task wording ("busiest moments") maps to two columns, p95 and max; nothing helps choose.
