# Session: shade hosts by peak CPU (wide data) -- Analyst Alex

Task given: "Shade the hosts by how hard their processors work at their busiest moments, so the
overloaded ones stand out. The data on screen is a sample: a company's IT estate, hosts and the
network connections between them, with dozens of things recorded about each. If that is not your
line of work, treat it as your own wide spreadsheet."

Start screen: shots/tasks/t09-wide/01.png. Renders: tmp/round-7-sessions/t09-wide--analyst-alex/NN.png.
All commands run from design/ui/prototype with
`timeout 120 node app-b/study.mjs --try <render> task:t09-wide ...`.

## Think-aloud

**Start.** "IT estate, 300 nodes, 1,105 edges, Local only up top -- good, nothing leaves my machine.
Shade by a column is Appearance > Ranking in Gephi. There's a Style tab on the right; try that."

1. `--click "Style"` (01.png) -- Style on the graph is only canvas (background, print-safe colors)
   and layout method/seed. "No 'color nodes by' here."
2. `--click "Everything"` (02.png) -- a "built-in row" with Fill Color 6366F1, Shape, Size.
   "One fixed color. Where's the 'ranking' toggle?"
3. `--click "Everything" --click "6366F1"` (03.png) -- a plain color picker with palettes and a
   color-blind warning. "Nice touch on the warning, but it's a single color." A small database
   cylinder icon appeared next to the Color field.
4. `--click "Everything" --key Escape --hover "Color"` (04.png) -- Escape threw me out of
   Everything back to the graph summary. "Annoying."
5. `--click "Everything" --hover "Color"` (05.png) -- tooltip "The default look; change it to
   override." Says nothing about the cylinder icon.
6. `... --click "Color by column"` (06.png) -- "nothing on screen is called 'Color by column'".
7. `... --click "From data"` (07.png) -- "nothing on screen is called 'From data'". "I'm guessing
   names for an icon now. Bad sign."
8. `--click "Nothing is colored or sized by a row"` (08.png) -- the chip on the canvas does nothing
   when clicked. "It tells me nothing is colored, but won't help me color anything."
9. `--click "Table"` (09.png) -- node table, 8 of 69 columns, none about CPU.
10. `--click "Table" --click "Columns: 8 of 69"` (10.png) -- column chooser; alphabetical list
    cut off at cpu_cores, cpu_model. "There's probably a cpu_peak below. Can't get to it from
    here without scrolling."
11. `--click "Readings not computed"` (11.png) -- it's the graph's actions menu ("Compute the
    overview", re-run layout...). "'Readings' -- I thought that meant CPU readings. It's graph
    stats. Wrong word for me."
12. `--click "Analyze"` (12.png) -- algorithm picker (Louvain, PageRank, link counts). "I don't
    want to compute anything, the numbers are already in the file."
13. `--click "Style" --click "Data"` (13.png) -- the Data item on the left rail. Sources, Filters,
    Attributes: cpu_util_max_pct, cpu_util_p50_pct, cpu_util_p95_pct. "Finally. 'Busiest
    moments': max is one spike, p95 is the busy stretch without the 3am backup blip. p50 is a
    normal day. I'll go with p95 -- that's the one I can defend to a director."
14. `... --click "cpu_util_p95_pct"` (14.png) -- attribute panel: 300 of 300 have a value, range
    10.5 to 79.1, median 47.6, "Painted by: No row paints from cpu_util_p95_pct." "Good sanity
    numbers. But no button to paint by it."
15. `... --hover "Painted by"` (15.png) -- nothing.
16. `... --click "More"` (16.png) -- three-dot menu: Color by, Size by, Label by, Show as groups,
    Filter to..., Show in table. "There it is. In a three-dot menu."
17. `... --click "Color by"` (17.png) -- hosts colored orange to brown; canvas legend
    "Color: cpu_util_p95_pct, 10.5 to 79.1"; a new row cpu_util_p95_pct in the left list.
    "It's colored and there's a legend with the column and range. Better than Gephi. But the
    overloaded ones don't 'stand out' -- it's orange and darker orange, I'm squinting."
18. `... --click "Orange to brown"` (18.png) -- "Color from cpu_util_p95_pct" panel: Source,
    Scale Linear, Palette, Values from (Fit to data / Percentiles / Typed), Range, Clamp, No value,
    Detach. "This is the Gephi Ranking panel. Source dropdown means I can swap to max if my boss
    asks. 'Detach' I wouldn't touch -- detach what?" Stopped here.

## Outcome

- Succeeded? Yes, I think so: hosts are shaded by cpu_util_p95_pct with a legend. I chose p95 over
  max deliberately; someone else could reasonably pick max, and nothing on screen helped me choose.
- Single Ease Question: 3 of 7. 18 tries. Getting there took the left-rail Data page, picking the
  attribute, then a three-dot menu. The obvious places (Style tab, the Everything row's Color, the
  "Nothing is colored" chip) didn't lead there, and the icon next to Color that probably does it
  had no name I could find.
- Would I use it instead of Gephi? For this, maybe. The attribute summary (range, median, fill
  rate) and a legend that names the column are things Gephi doesn't give me. But I'd want the
  route to "color by a column" to be where I first look -- on the color itself -- and a default
  ramp where the hot hosts actually pop. Right now the result looks muddy to me.

## Problems noticed

- Style tab on the graph has no node coloring at all; Gephi users go there first.
- The data-binding icon beside the Everything row's Color field has no discoverable name; hover
  over the field only says "The default look; change it to override."
- "Nothing is colored or sized by a row" chip is not clickable and offers no way to start.
- "Readings not computed" reads like sensor readings in an IT dataset; it is graph statistics.
- "Color by" lives only in a three-dot menu on the attribute panel; the attribute panel's
  "Painted by" section says nothing paints from it but offers no action.
- Escape from a selected row drops back to the whole-graph panel.
- Orange-to-brown default ramp does not make the high end stand out on a 300-node picture.
- "Detach" in the color panel is unexplained.
