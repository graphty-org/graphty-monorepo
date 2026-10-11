# Session r5-s06b -- transcript

Participant: Elena, returning user (product manager, a couple of earlier visits).
Task: the Les Miserables network is open; point out on the drawing every tie of 10 or more shared chapters, without removing any character or tie, and say how many there are.

Commands run from /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1 with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/` and session folder
`S=tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s06b`.

## Step 01 (already started)

Screenshot 01.png. The characters network is open with orange dots sized and colored by PageRank. Left panel: Selection, PageRank (77), Everything. Right panel shows the PageRank layer's Style. The lines are all thin and gray -- I can't tell which ties are strong.

## Step 02

Thought: "All the lines look the same. Last time I changed the dot size under Everything > Style, so maybe the lines are in there too."
Command: `node design/ui/studio/tool/real.mjs --step $S --click "Everything"`
Saw (02.png): the right panel now says Everything, Style tab, with a Nodes / Edges switch. Nodes is on: Color 6366F1, Size 1, Shape Icosphere. There's an "Edges" button -- lines are edges, I think.

## Step 03

Thought: "There's an Edges switch next to Nodes. Lines must be edges."
Command: `node design/ui/studio/tool/real.mjs --step $S --click "Edges"`
Saw (03.png): Line section: Color A9A9A9, Width 8, Pattern Solid; then Arrows, Label. Each of Color and Width has a little chain-link icon next to it. If I change Width here it'll make every line thicker, not only the strong ones. What's the chain icon?

## Step 04

Thought: "What's the little chain icon next to Width?"
Command: `node design/ui/studio/tool/real.mjs --step $S --hover-at 1381,232`
Saw: tooltip "Width by attribute". Not sure what "attribute" is, but maybe it means the chapters number -- thicker line for more chapters. Worth a try; I can undo.

## Step 05

Thought: "Try making width follow the chapters number."
Command: `node design/ui/studio/tool/real.mjs --step $S --click "Width by attribute"`
Saw (05.png): a "Width by attribute" popup with one choice, "shared_chapters". That's the chapters count. Picking it.

## Step 06

Command: `node design/ui/studio/tool/real.mjs --step $S --click "shared_chapters"`
Saw (06.png): Width now reads "8 to 16", and the legend box got an "Edge width: Everything 1 ... 31" row. The picture zoomed out a bit. Honestly the lines all still look hair-thin to me; I can't see which are thick. And even if I could, "thicker" isn't "10 or more" -- I can't count from this. I need only the 10+ ones to stand out.
Next: the find box worked for names last time. Maybe I can type a number into it.

## Step 07

Command: `node design/ui/studio/tool/real.mjs --step $S --click "Find nodes, edges, values"`
Saw (07.png): the find box is focused. It says "values", so maybe a number works. I'll type the column name and the cutoff the way I'd write a spreadsheet filter.

## Step 08

Command: `node design/ui/studio/tool/real.mjs --step $S --type "shared_chapters >= 10"`
Saw (08.png): under the box: "Start with = to select by a value:" and a suggestion "=shared_chapters >= `10`  Select its matches". Oh nice, it understood me. Selecting doesn't remove anything, so that's safe. Clicking it.

## Step 09

Command: `node design/ui/studio/tool/real.mjs --step $S --click "Select its matches"`
Saw (09.png): "13 edges selected". The 13 lines are now thick and blue on the drawing, and every dot and line is still there. The right panel lists them with their chapter counts, all 10 or more: MmeMagloire--Myriel 10, Thenardier--MmeThenardier 13, Thenardier--Valjean 12, Cosette--Valjean 31, Javert--Valjean 17, Marius--Gillenormand 12, Marius--Cosette 21, Marius--Valjean 19, Combeferre--Enjolras 15, Courfeyrac--Enjolras 17, Courfeyrac--Combeferre 13, Bossuet--Courfeyrac 12, Bossuet--Enjolras 10. Most of the blue is in the middle-left around the big dot (Valjean, I think), a little triangle cluster of students on the left, and one long blue line down to the bottom group. That's my answer: 13. Ending.

Command: `node design/ui/studio/tool/real.mjs --end $S`
Result: session ended normally.

## In my own words, at the end

- Did I finish? Yes. 13 ties have 10 or more shared chapters, and they're shown in blue on the drawing with nothing taken off.
- Ease: 5 out of 7.
- What confused me:
  - I went to Everything > Style > Edges first, because that's where I changed dot size last time. "Width by attribute" made widths follow the chapters, but I couldn't see any difference -- the lines all still looked hair-thin -- and a gradient can't tell me which ones are 10 or more anyway. I also left that width change in place; I'm not sure whether it matters.
  - The find box was the thing that worked, and only because I typed it like a spreadsheet filter. The hint "Start with = to select by a value" appeared only after I typed. I wouldn't have known that from the empty box, which only says "Find nodes, edges, values".
  - The backticks around `10` in the suggestion looked odd, like code. It still worked.
  - Once selected, the list on the right with each pair and its number made me trust the count.
