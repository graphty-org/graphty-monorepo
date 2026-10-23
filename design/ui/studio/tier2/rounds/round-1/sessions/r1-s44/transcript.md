# Session r1-s44 -- Ruth (returning reporter), task T22, dataset B (Les Miserables)

Build: 946256efb876 (frozen copy at /home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/).
All commands run from design/ui/studio/tier2 with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/`.

Task as given to me: Les Miserables is open; each tie counts the chapters two characters share.
Without taking any character or tie off the drawing, make every tie of 10 or more shared chapters
stand out from the rest, and tell how many there are.

## Step 01 -- start

    node ../tool/real.mjs --start rounds/round-1/sessions/r1-s44 setup:lesmis-ranked.txt

Screen (01.png): Les Miserables open, nodes colored and sized by PageRank, a legend top-left.
Left panel: find box "Find nodes, edges, values", then Selection, PageRank (77), Everything.
Right panel shows PageRank's Style with Nodes and Edges tabs. Nothing about chapters on screen.

Ruth: "Fine. The ties are what I want, not the dots. The find box says it finds edges and values.
That's where I'd start -- I always start with that box. Let me click into it and see what it offers."

## Step 02 -- click the find box

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click "Find nodes, edges, values"

Screen (02.png): the box has focus, nothing drops down. No hint of what I can type.

Ruth: "No list, no hint. The ties count chapters, so I'll type the word chapters and see what it
thinks I mean."

## Step 03 -- type "chapters"

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --type "chapters"

Screen (03.png): 'No match for "chapters"'. Nothing else.

Ruth: "So the column isn't called chapters, or the box doesn't look at column names. Says who?
I need to see what the ties are actually called. The Data button on the left showed me my sheet
before -- I'll look there."

## Step 04 -- open Data

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click "Data"

Screen (04.png): Sources: Les Miserables, 77 nodes, 254 edges; Node table 77 rows; Edge table 254
rows. A "Filters" heading with a plus. Attributes: Nodes (id, name), Edges (shared_chapters, a "#"
icon, so a number).

Ruth: "There it is -- shared_chapters, with an underscore. 254 ties in all. Filters is what I
must NOT do; the task says keep everything on the drawing, and a filter takes things away. I'll
click shared_chapters itself and see what it tells me about it."

## Step 05 -- click shared_chapters

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click "shared_chapters"

Screen (05.png): right panel "shared_chapters, Attribute". Summary: Table Edges, Kind Amount,
Origin From the file, Has a value 100%, Distinct values 17, Range 1 to 31. A "..." menu top right.

Ruth: "1 to 31 chapters, 17 different values, every tie has one. Good -- I can check that. But
nothing here does anything; it's a fact sheet. The three dots might hold actions. Let me look."

## Step 06 -- open the attribute's "..." menu

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click-at 1419,74

Screen (06.png): the menu "Attribute actions" offers "Filter to..." and "Show in table".

Ruth: "Filter to -- no, that takes ties off the map, which I was told not to do. Show in table
would let me count, but it won't make anything stand out on the drawing. Now that I know the
column's real name, I'll go back to the find box and type it the way it's spelled."

## Step 07 -- back to Graph

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --key Escape --click "Graph"

Screen (07.png): left panel back to the find box, now empty again. Right panel shows Graph Values:
77 nodes, 254 edges, undirected, 1 component.

Ruth: "The word I typed earlier is gone -- fine. Typing the column name as it's spelled."

## Step 08 -- type "shared_chapters" in the find box

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click "Find nodes, edges, values" --type "shared_chapters"

Screen (08.png): 'No match for "shared_chapters"'.

Ruth: "It searches values, not column names, I suppose. In a spreadsheet I'd write the condition
out. Let me just add '>= 10' and see whether it understands."

## Step 09 -- append " >= 10"

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --type " >= 10"

Screen (09.png): 'No match for "shared_chapters >= 10"'. No suggestion of what it would accept.

Ruth: "Still no. Maybe it only acts when I press Enter, like a search."

## Step 10 -- press Enter

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --key Enter

Screen (10.png): unchanged. 'No match'.

Ruth: "The box won't take a condition, or won't take mine. I've changed how things look before
through Everything's Style tab. Ties have their own tab there. I'll clear the box and go there."

## Step 11 -- clear the box, open Everything

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click-at 276,90 --click "Everything"

Screen (11.png): Everything's Style, Nodes tab: Fill color 6366F1 at 100%, Size 1, Shape
Icosphere, Effects/Label/Tooltip with plus buttons. An Edges tab next to Nodes.

Ruth: "That's the page I remember. Ties are on the Edges tab."

## Step 12 -- Edges tab

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click "Edges"

Screen (12.png): Line: Color A9A9A9 100%, Width 8, Pattern Solid; Arrows and Label with pluses.
There is a small chain-link icon beside Color and beside Width.

Ruth: "These change every tie at once. There's no 'only when' anywhere. That little chain icon
next to Width -- I don't know what it is. Hovering it."

## Step 13 -- hover the chain icon beside Width

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --hover-at 1381,226

Printed: button "Width by attribute", tooltip "Width by attribute".

Ruth: "Width by attribute -- thicker for more chapters, probably. That's not 'ten or more', that's
a sliding scale, but maybe it has a cut-off inside. Let me look."

## Step 14 -- click "Width by attribute"

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click-at 1381,226

Screen (14.png): a popover "Width by attribute" with "Find an attribute" and one choice,
shared_chapters.

Ruth: "Only one choice, and it's the right column. I'll take it and see whether it lets me set
where the line falls."

## Step 15 -- choose shared_chapters for width

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click "shared_chapters"

Screen (15.png): Width now reads "1 to 3" with a small gear. The legend adds "Edge width:
Everything, 1 ... 31". The drawing changed a lot: every tie is now a faint hairline, much thinner
than the solid gray lines before (width was 8), and the drawing got smaller/moved. I cannot tell
thick from thin by eye at all.

Ruth: "Well, that made things worse -- now I can barely see any tie. And the legend calls it
'Everything', not shared_chapters; counted over what? There's a gear in the width box. Maybe the
settings are in there."

## Step 16 -- click what looked like a gear in the width box

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click-at 1382,226

Printed: button "Detach Width". Screen (16.png): width is back to a plain 8, the chain icon
returned, the "Edge width" legend is gone. The ties are visible again, thin gray.

Ruth: "That wasn't settings, that undid it. The icon looked like a little cog to me, not 'detach'.
Fine -- a sliding thickness wasn't what I was asked for anyway. I'm a spreadsheet person: the
Data page offered 'Show in table'. If I can sort the ties by chapters there, I can at least count
them, and maybe pick them out."

## Steps 17-18 -- Data, shared_chapters, "..." , Show in table

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click "Data" --click "shared_chapters"
    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click-at 1419,74 --click "Show in table"

Screen (18.png): a table opened under the drawing: tabs Nodes / Edges (Edges on), "254 edges",
"In the order loaded", columns From, To, shared_chapters. First rows: Napoleon-Myriel 1,
MlleBapt...-Myriel 8, MmeMa...-Myriel 10, MmeMa...-MlleBaptis... 6. Names are cut off.

Ruth: "Now we're talking. 254 rows, matches what Data said. In order loaded -- I want it sorted by
chapters. Clicking the column header, as I would in a spreadsheet."

## Step 19 -- sort by shared_chapters

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click-at 1122,742

Screen (19.png): "Sorted by shared_chapters, highest first". Cosette-Valjean 31, Marius-Cosette
21, Marius-Valjean 19, Javert-Valjean 17. Only four rows fit; the table is a short strip.

Ruth: "Good, highest first, names readable now. Only four rows show. I'll scroll the table down to
where it drops under 10 and count."

## Step 20 -- scroll the table

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --wheel 700,820,130

Screen (20.png): next four rows: Courfeyr...-Enjolras 17, Combef...-Enjolras 15,
Thenard...-MmeThen... 13, Courfeyr...-Combeferre 13.

Ruth (writing down): "31, 21, 19, 17, then 17, 15, 13, 13. Eight so far. Names cut off again --
annoying. Keep going."

## Step 21 -- scroll again

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --wheel 700,820,130

Screen (21.png): Thenard...-Valjean 12, Marius-Gillenorma... 12, Bossuet-Courfeyrac 12,
MmeMa...-Myriel 10.

Ruth: "Twelve so far, if the scroll moved exactly four rows each time -- and I can't be sure it
did; there's no row number. That's the kind of count I don't like printing. Keep going until it
drops below 10."

## Step 22 -- scroll again

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --wheel 700,820,130

Screen (22.png): Bossuet-Enjolras 10, then Fantine-Valjean 9, MlleGille...-Gillenorma... 9,
Courfeyr...-Marius 9.

Ruth: "There's the break. By my tally: 31, 21, 19, 17, 17, 15, 13, 13, 12, 12, 12, 10, 10 --
thirteen ties of 10 or more. But I counted through a four-row peephole, and I'm not sure every
scroll moved exactly four rows. I'd want to check it another way. And I still haven't made them
stand out on the map -- the table is not the drawing. In spreadsheets, clicking a row selects it.
Let me scroll back to the top and click the first row to see if it lights up the tie."

## Step 23 -- back to top, click the first row

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --wheel 700,820,-1000 --click "Cosette"

Printed: ambiguous, two cells "Cosette"; took the first (the Cosette-Valjean row).
Screen (23.png): the row is highlighted; on the drawing one tie turns blue; the right panel
shows "Cosette -- Valjean, Edge", From Cosette, To Valjean, shared_chapters 31.

Ruth: "That's it -- a row click picks the tie and it turns blue on the map, with its name on the
right. I can check that one: Cosette to Valjean, 31. Held. If shift-click works here like a
spreadsheet, I can take the top rows down to the last 10. Scrolling to the Bossuet-Enjolras row."

## Step 24 -- scroll to the cut-off

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --wheel 700,820,390

Screen (24.png): Bossuet-Enjolras 10 at the top, then three rows of 9. Cosette-Valjean still
selected (blue tie, right panel).

Ruth: "Shift-click on Bossuet-Enjolras, the last 10."

## Step 25 -- shift-click "Enjolras" (the tool took the first of five Enjolras cells)

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --shift-click "Enjolras"

Screen (25.png): the shift-click landed on the Courfeyrac-Enjolras row (row 5), not the one I
meant, and the table jumped to show it. But the range worked: "5 edges selected", with a list in
the right panel by name (Cosette -- Valjean, Javert -- Valjean, Marius -- Cosette, Marius --
Valjean, Courfeyrac -- Enjolras). Five ties are blue on the drawing. The cell text also got the
browser's blue text-highlight, as if I'd dragged over it.

Ruth: "Wrong row, my slip -- but shift-click extends, like a spreadsheet, and the right panel
lists them by name. That's what I want. Scrolling down to Bossuet-Enjolras and shift-clicking it
by position this time."

## Step 26 -- scroll down

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --wheel 700,820,260

Screen (26.png): MmeMa...-Myriel 10, Bossuet-Enjolras 10, Fantine-Valjean 9, MlleGille... 9.

Ruth: "Bossuet-Enjolras is the last 10. Shift-clicking that row."

## Step 27 -- shift-click the Bossuet-Enjolras row

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --shift-click-at 335,817   (the tool has no such step; it printed its step list)
    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --shift-click "Bossuet#2"

Screen (27.png): "13 edges selected". Right panel lists all 13 by name: MmeMagloire -- Myriel,
Thenardier -- MmeThenardier, Thenardier -- Valjean, Cosette -- Valjean, Javert -- Valjean,
Marius -- Gillenormand, Marius -- Cosette, Marius -- Valjean, Combeferre -- Enjolras,
Courfeyrac -- Enjolras, Courfeyrac -- Combeferre, Bossuet -- Courfeyrac, Bossuet -- Enjolras.
On the drawing those ties are blue and a bit heavier; every other tie and every character is
still there in gray. The rows of 9 below are not selected.

Ruth: "Thirteen. Matches my tally through the peephole, so now I believe it -- two counts, same
answer. Everything is still on the map; the thirteen are blue. Though: the panel's list isn't in
chapter order, so I can't read the numbers off it, and blue-because-I-clicked feels like it will
vanish the moment I click anything else. If I'm handing this to an editor I'd want it to stay.
The Selection has a Style tab -- let me see if I can make them thicker or a color that sticks."

## Step 28 -- Style tab of the selection

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click "role=tab:Style"

Screen (28.png): "13 edges selected, Selection" -- Style: Line, Arrows, Label, each with a plus.

Ruth: "Line, plus. Adding a line style for these thirteen."

## Step 29 -- "Add to Line"

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click-at 1419,136

Screen (29.png): a menu: Color, Width, Opacity, Pattern, Curved.

Ruth: "Width -- a thick line reads in black and white too, for the graphics desk."

## Step 30 -- choose Width

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click "Width"

Screen (30.png): the right panel changed to "13 edges, Layer" with Nodes/Edges tabs and Line:
Width 8. So it made a layer of its own for these thirteen. The width starts at 8 -- the same as
every other tie -- so nothing on the drawing changed yet.

Ruth: "A layer named '13 edges' -- good, that sounds like it stays. Width 8 is what all ties
already are; I'll make it much thicker, say 30."

## Step 31 -- width 30

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click-at 1334,174 --key Control+a --type "30" --key Enter

Screen (31.png): the thirteen ties are now thick blue bands; the rest are thin gray hairlines;
every character still drawn.

Ruth: "That stands out. But it's still blue because they're selected. The real test: click off,
and see whether they stay thick. Then I'll check the Graph list for the layer."

## Step 32 -- click empty canvas, open Graph

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click-at 1000,250 --click "Graph"

Screen (32.png): the selection cleared. The Graph list now has "13 edges" (a brush icon) between
Selection and PageRank. But on the drawing the thirteen ties are back to thin gray hairlines --
the thick bands are gone. E.g. the tie down to the lower hub near (700,480) was a thick band in
31.png and is a hairline now.

Ruth: "Wait. The layer is in the list, but the drawing doesn't show it. It was thick only while
they were selected? Then I've made nothing stand out at all. Let me open the '13 edges' layer
and see what it thinks it is."

## Step 33 -- open the "13 edges" layer

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click "13 edges"

Screen (33.png): "13 edges, Layer", Edges tab, Line Width 30. An eye icon on its row in the
list (visible). The drawing still looks like hairlines everywhere; maybe the lower tie near
(700,480) is a touch heavier gray, but I can't tell at this size.

Ruth: "It says 30 and it says it's showing. The picture says otherwise -- or says it so quietly I
can't see it. Let me zoom in on that lower tie and look properly."

## Step 34 -- zoom in

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --wheel 710,480,-600

Screen (34.png): the wheel barely zoomed. Looking hard at the middle of the picture (I enlarged
my view of the screenshot): the thirteen ties ARE a little thicker than the rest -- a few pixels
of the same gray -- but nowhere near the bold blue bands I saw while they were selected. At normal
size I could not pick them out.

Ruth: "So it worked, sort of: width 30 while selected looked like a marker pen; width 30 not
selected looks like a slightly heavier pencil line, same gray as everything else. That's not
'stand out' for an editor. Color will do it. Adding a color to this layer."

## Steps 35-36 -- "Add to Line", Color

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click-at 1419,144
    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click "Color"

Screen (36.png): the layer now has Color A9A9A9 100% (the same gray every tie already has) and
Width 30. The legend gained "Edge color: 13 edges" with a gray swatch. The color box appears to
have focus.

Ruth: "It starts me on the same gray as everything -- so adding color changed nothing yet. A red
the editor can't miss. Typing it in."

## Step 37 -- color E02424

    node ../tool/real.mjs --step rounds/round-1/sessions/r1-s44 --click-at 1265,192 --key Control+a --type "E02424" --key Enter

Screen (37.png): the thirteen ties are red now, and clearly stand out against the gray; nothing
is selected, so this is the layer, not the selection. Every character and every other tie is still
drawn. The legend top-left reads "Edge color: 13 edges" with a red swatch.

Ruth: "There. Red, and it stays when nothing is selected. Thirteen ties of 10 or more shared
chapters, and I can name all thirteen. I checked one: Cosette to Valjean, 31 chapters, from the
tie's own panel. I'm done -- though the legend says '13 edges', which tells an editor nothing
about why these thirteen. I'd want it to say '10 or more shared chapters'."

## End

    node ../tool/real.mjs --end rounds/round-1/sessions/r1-s44

## Debrief (in character)

**Did I finish?** Yes. Thirteen ties have 10 or more shared chapters. They are red (and a little
thicker) on the full drawing through a layer named "13 edges"; nothing was taken off. I counted
them twice: once by scrolling a sorted table, once from the "13 edges selected" count, and both
said 13.

**Ease: 3 of 7.** I got there, but by a spreadsheet detour I worked out myself, not by anything
the program offered for "ties where chapters >= 10".

**What confused me:**

1. **The find box gave me nothing to go on.** It says it finds "edges, values". I typed
   "chapters", then the column's real name "shared_chapters", then "shared_chapters >= 10", then
   pressed Enter. Every time: "No match". It never told me what it does accept or that a
   condition is possible. I gave up on it.
2. **I had to go to Data to learn the column is called shared_chapters.** The task said
   chapters; the program said shared_chapters. Nothing on the Graph side named it.
3. **"Width by attribute" made things worse.** Choosing shared_chapters dropped every tie to a
   faint hairline ("1 to 3"), and the legend labeled it "Edge width: Everything" rather than the
   column. A sliding thickness isn't "10 or more" anyway.
4. **The small icon inside the width box looked like a settings cog; it was "Detach Width"** and
   undid what I'd just done.
5. **Counting through a four-row window.** The table panel shows four rows at a time with names
   cut off ("MmeMa...", "Courfeyr..."). I could not be sure each scroll moved exactly four rows,
   so my first count of 13 was not one I'd print until the selection count agreed.
6. **Shift-click in the table selects a range** -- good, like a spreadsheet. The list of selected
   ties in the right panel is by name but not in chapter order and without the numbers, so I
   couldn't check the cut-off from it.
7. **Width alone barely shows once the selection is cleared.** While selected, width 30 drew
   bold blue bands; after I clicked away, the same layer drew a slightly heavier gray line I
   could only see by enlarging the picture. I thought it had not worked. Only a color made it
   stand out.
8. **The new layer's color starts as the same gray as every other tie**, so "add color" changed
   nothing until I typed a color.
9. **The layer and legend are called "13 edges".** That's a count, not a reason. An editor
   reading the legend can't tell these are the ties of 10+ shared chapters, and if I fixed a
   number in the data I don't know whether the layer would follow -- it looks like a fixed list
   of the thirteen I clicked, not a condition.
