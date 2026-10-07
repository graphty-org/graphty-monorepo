# Session r3-s03 -- Dev (class-project student), Les Miserables first sitting

Participant: Dev, a third-year history student who has followed one Gephi tutorial video.
Task: open the ready-made Les Miserables network, work out which characters matter most, make
the dots bigger for the ones that matter more, get names on the drawing, and export a picture
with its key. Say what sizes and colors stand for.

Commands run from the studio folder with `T=tool`, `S=rounds/round-3/sessions/r3-s03`.

## Step 1 -- start

`node tool/real.mjs --start $S empty` -> 01.png

I see a start page: Start (Open project or file, New from data), Recent projects (empty), and
Samples with Les Miserables first ("77 characters ... Good for a first look at communities and who
holds the story together"). A data-sharing box sits at the bottom. I'll decline it and open the
sample, like the tutorial would have me try a sample first. No hesitation.

## Step 2 -- open the sample

`node tool/real.mjs --step $S --click "No thanks" --click "Les Miserables"` -> 02.png

The drawing appears at once: blue dots and gray lines on a light canvas. Left: "Graph Les
Miserables", a find box, "Selection", "Everything". Right: Graph overview (Nodes 77, Edges 254,
Density, Components 1). Bottom toolbar: a flask icon, a chart icon, "3D", a magnifier. The left
panel's footer says "Analyze (flask) in the toolbar (Shift+A) to add results here". Part one is
done: it's on screen. In my tutorial the next step is "statistics", and here that seems to be
"Analyze", the flask. I'll click it.

## Step 3 -- open Analyze

`node tool/real.mjs --step $S --click-at 679,864` -> 03.png (tool: button "Analyze")

A list opens: "Rank nodes and edges" -- Degree, Betweenness, Edge betweenness, Closeness, PageRank
(with a blue "Start here" tag), Eigenvector, Katz, HITS, All-pairs distance, and more below. Each
has a one-line explanation, which I like. My tutorial says "Betweenness centrality" for who the
connectors are, and I recognize that word, so I'll pick Betweenness. I hesitated a second over
the "Start here" on PageRank -- I don't know PageRank -- but I'll trust my tutorial.

## Step 4 -- choose Betweenness

`node tool/real.mjs --step $S --click "Betweenness"` -> 04.png

The list shrinks to a small Betweenness card: its explanation, a collapsed "Advanced", "Under a
second", and a blue Run button. Easy -- I press Run.

## Step 5 -- Run

`node tool/real.mjs --step $S --click "Run"` -> 05.png

All the dots turned orange. A small key in the top-left of the drawing says "Color: Betweenness"
with a bar from 0 to 1624. The left panel now has a row "Betweenness 77". So part two is done:
the program worked out who matters (betweenness). Honestly though, almost every dot looks the
same orange; only one or two in the middle look darker brown. I can't tell the important ones
apart by eye. Next the task wants bigger dots for those who matter more. In my tutorial that's
"ranking ... size". I don't see a "size" word. I'll click the Betweenness row on the left to see
what it offers.

## Step 6 -- click the Betweenness row

`node tool/real.mjs --step $S --click-at 164,156` -> 06.png (tool: treeitem "Betweenness")

The right panel switched to "Betweenness" with a Style tab: Nodes / Edges, then Fill (+), Color
= Betweenness (-), Shape (+), Effects (+), Label (+), Tooltip (+). No word "Size" anywhere. Size
is part of a shape, I guess, so I'll try the + next to Shape. A little unsure.

## Step 7 -- + beside Shape

`node tool/real.mjs --step $S --click-at 1419,234` -> 07.png (tool: button "Add to Shape")

A small menu: "Size" and "Shape". There it is. Clicking Size.

## Step 8 -- Size

`node tool/real.mjs --step $S --click "Size"` -> 08.png

A box "Size by attribute": Fixed size, then under Betweenness: Betweenness, Betweenness rank,
Betweenness percentile; greyed out id and name ("Cannot be used: Holds groups, not amounts").
I want the plain number, so Betweenness. ("Rank" vs "percentile" I'd have to look up.)

## Step 9 -- size by Betweenness

`node tool/real.mjs --step $S --click-at 1207,416` -> 09.png (tool: option "Betweenness")

Now one dot in the middle is huge and dark brown, one at the bottom-left hub is bigger, a few are
a bit bigger. The key in the corner now has two rows: "Size: Betweenness 0 .. 1624" and "Color:
Betweenness 0 .. 1624". A "Size 1 to 3" row appeared on the right. Part three done: bigger dots =
more betweenness. Now names. I see "Label +" on the right; my tutorial calls it labels too. Click
the +.

## Step 10 -- + beside Label

`node tool/real.mjs --step $S --click-at 1419,332` -> 10.png (tool: button "Add label line")

A "Label" picker: Attributes -- id, name; Betweenness -- Betweenness, rank, percentile. I want the
characters' names, so "name".

## Step 11 -- label by name

`node tool/real.mjs --step $S --click-at 1117,502` -> 11.png (tool: option "name")

Names appear above the dots: Valjean on the big one, Myriel at the bottom hub, Fantine,
Javert(?), Gavroche, Napoleon, Cravatte... They're tiny and pile up in the crowded middle, and
the key box at the top-left covers the top of the drawing (Blacheville's name is half under it).
The panel says "77 labels, 7 hidden" with a "Show all labels" checkbox. The task said the
characters' names, so I'll tick "Show all labels" to get everyone.

## Step 12 -- Show all labels

`node tool/real.mjs --step $S --click "Show all labels"` -> 12.png

The box is ticked and it now says "77 labels". A few more names showed up (Mother Innocent,
Magnolia, Mme Pontmercy...). The middle is still a tangle of tiny overlapping names; Valjean's
name sits right on top of the big dark dot and is hard to read. But names are written on the
drawing, so part four is done as far as I can tell. Last: a picture file with the key. My
tutorial says "Export". I don't see that word, so I'll open the menu (three lines, top-left).

## Step 13 -- main menu

`node tool/real.mjs --step $S --click-at 23,20` -> 13.png (tool: button "Main menu")

The menu has Back to start, New project, Open project or file, Open sample, Save, Save as, Save
local copy, Export... (Ctrl+E), Rename, Settings, Keyboard shortcuts, Help. "Export..." -- the
tutorial word. Clicking it.

## Step 14 -- Export dialog

`node tool/real.mjs --step $S --click "Export..."` -> 14.png

An Export dialog: Image / Data on the left. Image: "A picture of the drawing, 2x, PNG", Preset
"To share -- PNG, 2x", View "Current view", Size 1x/2x/4x/400x300, Format PNG/JPEG/WebP,
Background Canvas color/Transparent, and a preview. In the preview's top-left I can just make out
the little key box, so the key seems to come along -- there's no checkbox saying "include key",
I'm going by the preview. PNG pastes into Word fine. I'll press Export.

## Step 15 -- Export

`node tool/real.mjs --step $S --click "Export"` -> 15.png
(tool: `ambiguous: "Export" matches 2 controls (button "Export", dialog "Export ..."); took the
first`; `a file was saved: les-miserables_current-view.png, 1806 x 1720` in downloads/)

The dialog closed and a note at the bottom says "Exported les-miserables_current-view.png". I
opened the file: the drawing on a light background, with a white key box in the top-left --
"Size: Betweenness" (a gray wedge, 0 to 1624) and "Color: Betweenness" (light orange to dark
brown, 0 to 1624). Big dark Valjean in the middle, Myriel's hub lower left, Fantine and Gavroche
a bit bigger. Part five is done: a picture with its key that I can paste into my essay.

The names in the file are very small and blurry; most are readable if I zoom in, but in the
middle they overlap, and Valjean's own name is drawn on top of his dark dot and I can't read it
at all -- the most important character is the one name I can't read.

## End

`node tool/real.mjs --end $S`

## Debrief (in character)

**Did I finish?** Yes, all five parts:
1. On screen -- clicked the Les Miserables sample on the start page.
2. Who matters most -- Analyze (flask) -> Betweenness -> Run.
3. Bigger dots -- clicked the Betweenness row, then "+" by Shape -> Size -> Betweenness.
4. Names -- "+" by Label -> name, then ticked "Show all labels".
5. Picture with key -- menu -> Export... -> Export; a PNG with the key in the corner.

**What the sizes and colors stand for:** both stand for betweenness -- how often a character sits
on the shortest path between two other characters, i.e. who connects the others. Bigger and darker
= more of a go-between. Valjean is by far the biggest and darkest (near 1624); Myriel, Fantine and
Gavroche come next. Light orange, small dots barely connect anyone.

**Rating:** 6 of 7 (easy). Every step was one or two clicks and the words matched my tutorial
(Analyze/Betweenness, Size, Label, Export). Nothing failed and I never went backward.

**What confused me or slowed me down:**
- "Size" is hidden under the "+" next to "Shape". I only found it because I guessed size belongs
  to shape; there's no Size row until you add one. This was my one real hesitation.
- After Run, coloring alone barely shows anything: nearly every dot is the same orange and only
  Valjean is dark. I couldn't say who mattered until I added size.
- Size and color now say the same thing (both Betweenness); I didn't choose the color, it came on
  its own. Fine for me, but the key repeats itself.
- The "Start here" tag on PageRank made me second-guess Betweenness, which is what my course uses.
- Labels are tiny and pile up in the middle; Valjean's name is drawn over his own big dark dot and
  is unreadable, both on screen and in the exported picture. "77 labels, 7 hidden" and "Show all
  labels" made sense, though.
- On screen the key box covers the top-left corner of the drawing (Blacheville's name is half
  under it).
- In Export I had no checkbox for "include key"; I only knew it was included from the tiny preview.
- "Size 1 to 3" -- I don't know what 1 and 3 mean (pixels? times?); I left it alone.
