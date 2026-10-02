# Session: shade the kept list by publication count -- Dr. Chen, computational biologist

Task as given by the moderator: "Shade the researchers on the list you kept by how much each one has
published, so the most productive stand out. The data on screen is a sample: one export from a research
database, researchers and institutions with records inside records. If that is not your line of work,
treat it as your own nested export."

Start screen: shots/tasks/t09/01.png. All renders are in
tmp/round-7-sessions/t09--bioinformatics-researcher/. Every command was run from
design/ui/prototype with `timeout 120 node app-b/study.mjs --try <render> task:t09 ...`.

## Think-aloud

**Start screen.** OK. A ring of 200 dots, gray, with 23 green ones. Left panel: "Machine learning... 23"
with a green dot -- that is the list I kept, fine. Right panel is already on it: "Machine learning
researchers", "Paints 23 nodes", Fill Color 009E73. In Cytoscape this would be a continuous mapping on
Fill Color from a column. So I expect to click the color and find "map to column" somewhere.

**01** `--click "009E73"`
A color picker. Hue square, hex, "Unused in Eight distinct", a colorblind warning about orange and
vermilion -- that warning I actually like. But this is a constant color. I want a mapping. There's a
little database-cylinder icon that appeared next to the hex value. Probably that.

**02** `--hover "Color"`
Hovering the row shows the cylinder, but I don't get a name for it from here.

**03-07** Trying to get at that cylinder by name:
`--hover "Color" --hover "Map to data"` -> nothing on screen is called "Map to data".
`--hover "Color" --hover "From data"`, `"Use data"` -> nothing. `"Data"` -> that is the left rail's
Data button, not this. `"Color by"`, `"Bind"`, `"Map"` -> nothing. `"Column"` -> that's the
"Columns: 8 of 25" thing at the bottom. `--click "Set from data"`, `"From a column"`, `"Use a column"`,
`"Link to data"`, `"Data-driven"`, `"Bind to data"`, `"Color from data"` -> nothing.
`--click "Attribute"` (07) opened the *label* editor instead. Useful by accident: the label is already
showing a field "a...last_5_years", and the label editor has an "Abc" column dropdown and "Top N by a
value". So mapping a field to a property exists; I just can't find it for color.
(Honest note: in front of a real screen I would have rested the pointer on that cylinder and read
its tooltip in two seconds. Here I was fumbling for its name. Still -- an icon-only control that only
appears on hover is not where I would look first.)

**08** `--click "009E73" --click "Libraries"`
Palettes: "Purple to yellow" (that's viridis, good), "Orange to brown", "Blues", "Greens". Plus two
"recipe" / "style file" swatch rows I don't understand.

**09** `... --click "Purple to yellow"`
Nothing happened. A palette with no column behind it is just a list of colors, so fine, that's not
the way in.

**10, 11** `--hover "More actions"`, `--click "More actions"`
Menu headed "Community 3" -- what? My list is called "Machine learning researchers". It offers "Keep as
set", which I thought I already had. "Rename: A run's groups renumber when it runs; Keep as set to name
one". So is this a set or a community? This makes me trust the panel less. Nothing about color here
anyway.

**12** `--click "Analyze"`
Louvain, PageRank, degree ("Links (count)"), betweenness, closeness. Nice that each says what it
measures. But publication count is a column in my data, not something to compute. Wrong place.

**13, 14** `--click "Table"`, then `--click "attributes.profile.h_index"`
Node table: 200 nodes "from network-export-2026-03.json", columns id, Name, type, orcid,
attributes.profile.field, attributes.profile.h_index ... Clicking the header sorted it. The values
are cut off at the right edge so I can't read them. No "color by this column" from the header.

**15** `--hover "Color" --click "field"` (and `"Link"`, which did nothing visible)
"field" got me in: a popover "Color from data", Source "Pick a field", with an attribute tree. In use:
id, given, family, last_5_years (Label). Other: type, attributes > profile > contact / metrics >
citations > total, relationships. Good -- it shows the nesting and which fields are already used where.

**16** `--hover "Color" --hover "field"`
Tooltip: "Use a field or result for Color". Fine, that is a clear name, once you find it.

**17** `... --click "metrics"`
metrics has "papers" and "citations > total". "Published" means papers. Not citations. I'll take papers.
(I note last_5_years is also a number and is on the label, but it does not say last five years *of
what*; I'm not using a field I can't define.)

**18** `--hover "Color" --click "Use a field or result for Color" --click "metrics" --click "papers"`
"Color from attributes.pro...etrics.papers". Scale Linear, Palette "Orange to brown", Values from "Fit to
data" / Percentiles / Typed, Range 4 to 300, Clamp on, No value "Nothing", and a Detach button.
This is the panel I wanted -- it states its range. Questions: fit to *which* data, my 23 or all 200?
Linear on a count that runs 4 to 300 will make most people look the same; I'd want log or percentiles.
And orange-to-brown is a sequential palette, OK for grayscale, acceptable.

**19** `... --key Escape`
Now I look at the network. Almost every node is orange or brown. That is not 23 nodes, that is
something like 170. My green list has vanished from the canvas -- not a single green dot left. The
legend says "Color: sets -- Machine learning researchers 23" with a green swatch, AND "Color:
attributes.profile.metrics.papers 4 to 300". The legend still promises green nodes that aren't there.

**20** `... --key Escape --click "Machine learning"`
The panel for my list still says "Paints 23 nodes" and Fill Color 009E73, green, 100%. So the panel
says my list is green, the canvas says everything is orange. One of them is lying.

**21** `... --key Escape --click "Everything"`
"Everything -- Built-in row. Paints 200 nodes, 670 edges. Default look, under every other row." Fill
Color 6366F1 (an indigo I don't see anywhere on the canvas either). No sign of a papers mapping.

**22** `... --key Escape --hover "Color" --click "Use a field or result for Color"`
The field list now says: "papers -- Color (Everything)". So the mapping I made from inside my list's
panel was put on the whole graph. That is the opposite of what I asked for. And the Everything panel
didn't show it, and my list's green is gone even though Everything is supposedly "under every other
row".

I stop here. I can't reconcile what it says it paints with what I see, and it applied my change to
the wrong set of nodes without telling me. That is exactly the kind of silent thing I can't put in a
figure. I'd do this in R: filter to the 23, `scale_color_viridis_c(trans = "log10")` on papers, done.

## Outcome

- Did I succeed? No. I found the color-from-a-field control and picked the right field (metrics >
  papers), but the shading landed on the whole graph (about 170 nodes, "Color (Everything)"), not on
  my 23. My list's own color disappeared from the canvas while its panel still claimed it painted 23
  nodes green.
- Single Ease Question: 2 of 7.
- Would I use this instead of my current tool? No, not for this. The mapping popover itself is good --
  it states the scale, range, clamp and what happens with missing values, which Cytoscape makes you
  hunt for -- and the attribute tree handles nested records better than a flat column list. But it
  wrote my mapping to a different row than the one I was editing, and three panels (my list, the
  Everything row, the legend) disagree with the canvas. A count I can't reconcile ends the session.

## Problems seen

1. The mapping made from the kept list's Color row was applied to "Everything" (field list:
   "papers -- Color (Everything)"); the whole graph got shaded, not the 23. Severity: blocks the task.
2. After mapping, the list's panel still says "Paints 23 nodes", Fill 009E73; the legend still shows
   the green list swatch; no green nodes are visible. The Everything panel shows 6366F1 and no mapping.
   Nothing on screen agrees with the canvas.
3. The way to map color to a field is an icon-only cylinder that appears only when hovering the Color
   row; nothing in the row says "from a field" until you find it.
4. The list's More actions menu is headed "Community 3" and offers "Keep as set" for something the
   panel calls a set named "Machine learning researchers".
5. Range "Fit to data" does not say whether it fits the 23 or all 200; default Linear on a skewed count.
6. Table column values are clipped at the right edge; can't read h_index after sorting.

## Commands run (in order)

```
timeout 120 node app-b/study.mjs --try .../01.png task:t09 --click "009E73"
timeout 120 node app-b/study.mjs --try .../02.png task:t09 --hover "Color"
timeout 120 node app-b/study.mjs --try .../03.png task:t09 --hover "Color" --hover "Map to data"
timeout 120 node app-b/study.mjs --try .../04.png task:t09 --hover "Color" --hover "From data"
timeout 120 node app-b/study.mjs --try .../04.png task:t09 --hover "Color" --hover "Use data"
timeout 120 node app-b/study.mjs --try .../04.png task:t09 --hover "Color" --hover "Data"
timeout 120 node app-b/study.mjs --try .../05.png task:t09 --hover "Color" --hover "Color by"
timeout 120 node app-b/study.mjs --try .../05.png task:t09 --hover "Color" --hover "Column"
timeout 120 node app-b/study.mjs --try .../05.png task:t09 --hover "Color" --hover "Bind"
timeout 120 node app-b/study.mjs --try .../05.png task:t09 --hover "Color" --hover "Map"
timeout 120 node app-b/study.mjs --try .../06.png task:t09 --click "Color"
timeout 120 node app-b/study.mjs --try .../07.png task:t09 --hover "Color" --click "<name>"
    for each of: "Set from data" "From a column" "Use a column" "Link to data" "Data-driven"
    "Bind to data" "Color from data" (all: nothing on screen) and "Attribute" (opened the label editor)
timeout 120 node app-b/study.mjs --try .../08.png task:t09 --click "009E73" --click "Libraries"
timeout 120 node app-b/study.mjs --try .../09.png task:t09 --click "009E73" --click "Libraries" --click "Purple to yellow"
timeout 120 node app-b/study.mjs --try .../10.png task:t09 --hover "<name>"
    for each of: "More" "More actions" "Layer actions" (nothing) "Options"
timeout 120 node app-b/study.mjs --try .../10.png task:t09 --hover "More actions"
timeout 120 node app-b/study.mjs --try .../11.png task:t09 --click "More actions"
timeout 120 node app-b/study.mjs --try .../12.png task:t09 --hover "Color" --hover "<name>"
    for each of: "By a value" "Vary" "Vary by" "Set by" "Drive" "Gradient" "Shade" (all nothing)
timeout 120 node app-b/study.mjs --try .../12.png task:t09 --click "Analyze"
timeout 120 node app-b/study.mjs --try .../13.png task:t09 --click "Table"
timeout 120 node app-b/study.mjs --try .../14.png task:t09 --click "Table" --click "attributes.profile.h_index"
timeout 120 node app-b/study.mjs --try .../15-<name>.png task:t09 --hover "Color" --click "<name>"
    for each of: "value" "Connect" "Dynamic" "Paint by" "Encode" "Scale" (nothing), "field" (opened
    Color from data), "Link" (no visible change)
timeout 120 node app-b/study.mjs --try .../16.png task:t09 --hover "Color" --hover "field"
timeout 120 node app-b/study.mjs --try .../17.png task:t09 --hover "Color" --click "field" --click "metrics"
timeout 120 node app-b/study.mjs --try .../18.png task:t09 --hover "Color" --click "Use a field or result for Color" --click "metrics" --click "papers"
timeout 120 node app-b/study.mjs --try .../19.png task:t09 --hover "Color" --click "Use a field or result for Color" --click "metrics" --click "papers" --key Escape
timeout 120 node app-b/study.mjs --try .../20.png task:t09 ... --key Escape --click "Machine learning"
timeout 120 node app-b/study.mjs --try .../21.png task:t09 ... --key Escape --click "Everything"
timeout 120 node app-b/study.mjs --try .../22.png task:t09 ... --key Escape --hover "Color" --click "Use a field or result for Color"
```
(".../" is tmp/round-7-sessions/t09--bioinformatics-researcher/.)
