# Session: shade hosts by peak CPU -- Priya (threat hunter, corporate SOC)

Task as given: "Shade the hosts by how hard their processors work at their busiest moments, so the
overloaded ones stand out. The data on screen is a sample: a company's IT estate, hosts and the
network connections between them, with dozens of things recorded about each."

Start screen: shots/tasks/t09-wide/01.png. Renders: tmp/round-7-sessions/t09-wide--cybersecurity-analyst/NN.png.
All commands run from design/ui/prototype; DIR = tmp/round-7-sessions/t09-wide--cybersecurity-analyst.

## Think-aloud

**Start.** "Local only" in the top bar -- good, that answers one of my three questions before I
ask it. The chip on the canvas says "Nothing is colored or sized by a row". Need a CPU column.
There's a Style tab on the right; try that.

    timeout 120 node app-b/study.mjs --try $PWD/DIR/01.png task:t09-wide --click "Style"

**01.** Canvas and Layout settings for the whole graph. Nothing about node color. Dead end.

    timeout 120 node app-b/study.mjs --try $PWD/DIR/02.png task:t09-wide --click "Nothing is colored or sized by a row"

**02.** Nothing happened. It's only a label. And "row"? I read that as a table row. Means nothing to me yet.

    timeout 120 node app-b/study.mjs --try $PWD/DIR/03.png task:t09-wide --click "Table"

**03.** A table. 300 nodes from hosts-2026-03.csv, matching the summary's 300. hostname, fqdn,
ip, mac, role. No CPU column visible. "Columns: 8 of 69", so it's hidden.

    timeout 120 node app-b/study.mjs --try $PWD/DIR/04.png task:t09-wide --click "Table" --click "Columns: 8 of 69"

**04.** Column picker with a find box. cpu_cores and cpu_model are visible. Core count isn't load. Type "cpu".

    timeout 120 node app-b/study.mjs --try $PWD/DIR/05.png task:t09-wide --click "Table" --click "Columns: 8 of 69" --click "Find attribute" --key c --key p --key u

**05.** Five matches: model, cores, util_p50, util_p95, util_max. "Busiest moments" literally
means the max. In my world a single max is one spike (a patch window, an AV scan) and p95 is what
I'd baseline on. The task says busiest moments, so I'm taking max.

    timeout 120 node app-b/study.mjs --try $PWD/DIR/06.png task:t09-wide --click "Table" --click "Columns: 8 of 69" --click "Find attribute" --key c --key p --key u --click "cpu_util_max_pct"

**06.** It ticked the box: Columns 9 of 69. That only shows the column, it doesn't color anything.
In a spreadsheet the column header is where I'd go.

    timeout 120 node app-b/study.mjs --try $PWD/DIR/07.png task:t09-wide ... --key Escape --click "cpu_util_max_pct"

**07.** Clicking the header sorted descending: 94.4, 92.2, 90.6, all prod app/batch boxes. Honestly,
that's my triage list already. There's a chevron by the header, so probably a menu.

    timeout 120 node app-b/study.mjs --try $PWD/DIR/08.png task:t09-wide ... --key Escape --click "Column options"
    -> nothing on screen is called "Column options"
    timeout 120 node app-b/study.mjs --try $PWD/DIR/09.png task:t09-wide ... --key Escape --hover "cpu_util_max_pct"

**09.** The tooltip on "#" says "Number". The chevron has no name I can find. Also the focus outline
jumped to "Isolated nodes" in the right panel for no reason I can see. Changing tack. The left list
has Selection / Notes / Everything, which looks like layers. "Everything" might be the base paint.

    timeout 120 node app-b/study.mjs --try $PWD/DIR/10.png task:t09-wide --click "Everything"

**10.** "Everything -- Built-in row. Paints 300 nodes, 1,105 edges. Default look, under every other
row." So "row" means layer here. That's why the chip confused me. Fill color 6366F1, which is
indigo, but the dots on screen are gray. That doesn't match, and I notice things that don't match.

    timeout 120 node app-b/study.mjs --try $PWD/DIR/11.png task:t09-wide --click "Everything" --click "6366F1"

**11.** A flat color picker. Not what I want. It also warns that orange and vermilion clash for
groups 2 and 3, though nothing on screen is orange. A database icon showed up at the end of the
Color row, which smells like "drive from data".

    timeout 120 node app-b/study.mjs --try $PWD/DIR/12.png task:t09-wide --click "Everything" --hover "Color"

**12.** Tooltip: "The default look; change it to override". Says nothing about the icon.

    for n in "Color by data" "From data" "Use data" "Bind to data" "Color by column" "Map to data"; do
      timeout 120 node app-b/study.mjs --try $PWD/DIR/13.png task:t09-wide --click "Everything" --hover "Color" --click "$n"; done
    -> nothing on screen is called ... (all six)

I can't hover an icon I can't name. In real life I'd be clicking blind at this point.

    timeout 120 node app-b/study.mjs --try $PWD/DIR/15.png task:t09-wide --click "More"

**15.** The graph's own menu: select, layout, add note, clear graph data. No color.

    for n in "Add row" "New row" "Add style"; do timeout 120 node app-b/study.mjs --try $PWD/DIR/16.png task:t09-wide --click "$n"; done
    -> nothing on screen is called ... (all three)
    timeout 120 node app-b/study.mjs --try $PWD/DIR/17.png task:t09-wide --click "Data"

**17.** Data page. Sources: hosts 300 nodes, connections 1,105 rows = 1,105 edges, so nothing was
dropped on import. Good. Attributes list, and cpu_util_max_pct is in it.

    timeout 120 node app-b/study.mjs --try $PWD/DIR/18.png task:t09-wide --click "Data" --click "cpu_util_max_pct"

**18.** Good panel. 300 of 300 have a value, range 20.1 to 94.4, median 57.7. That agrees with
the table's top value of 94.4. "Painted by: No row paints from cpu_util_max_pct." It knows exactly
what I want and tells me it isn't happening, with no button to make it happen. Try the dots menu.

    timeout 120 node app-b/study.mjs --try $PWD/DIR/19.png task:t09-wide --click "Data" --click "cpu_util_max_pct" --click "More"

**19.** Color by, Size by, Label by, Show as groups, Filter to, Create set... Finally.

    timeout 120 node app-b/study.mjs --try $PWD/DIR/20.png task:t09-wide --click "Data" --click "cpu_util_max_pct" --click "More" --click "Color by"

**20.** Hosts are shaded orange to brown. The legend chip says "Color: cpu_util_max_pct, 20.1 to
94.4". A new layer, cpu_util_max_pct, sits above Everything. "Paints 300 hosts (every host with a
value)." Technically done. But do the overloaded ones stand out? Not really. At this dot size orange
and brown blur together. I think brown is high, but the legend is two numbers and a swatch, with no
"high" marker. Dark brown doesn't read as "hot". And what window is "max" over? I'll assume March
2026 from the file name. Stopping.

## Verdict

- **Succeeded?** Yes, mostly. The hosts are shaded by peak CPU and there's a legend. The "stand
  out" part is weak: orange to brown on small dots doesn't make the hot boxes pop. I'd want red, or
  only the top few highlighted.
- **Single Ease Question:** 3 of 7. About 20 steps and a dozen dead ends. The actual command is
  behind a three-dot menu on the attribute's details panel. The column header, which is where I went
  first, sorts but won't color. The data icon on the Color row has no name I could find.
- **Would I use this instead of my current tool?** Not for this. In Splunk or pandas I'd sort by
  max CPU and read the top 10, and the sorted table here gave me that in step 7. Coloring the
  graph only helps if I need to see *where* the hot hosts sit in the network, and this coloring
  doesn't make them stand out enough to show that. What I liked: the attribute panel. Range,
  median, 300 of 300 filled, and "nothing paints from this" are numbers I can check.

## Friction list (her words)

- "Nothing is colored or sized by a row" -- row? I thought table row. It isn't clickable either.
- Column header sorts but has no "color by"; the chevron next to it has no name I could hover.
- The Everything layer says 6366F1 (indigo) but the dots are gray.
- The database icon on the Color row: no tooltip of its own, couldn't find what it's called.
- Color by lives at Data > attribute > ... > Color by. Three levels for the main thing.
- Orange-to-brown doesn't make "overloaded" pop; the legend has no high/low marker.
- No time window shown for "max".
