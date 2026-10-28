# Session r1-s51 -- Ruth (returning reporter), task T24, dataset A (running club, friends.csv)

Build: 946256efb876 (frozen copy at .study-builds/tier2-r1d4-946256efb).
Tool: `T=design/ui/studio/tool`, run from `design/ui/studio/tier2`, `S=rounds/round-1/sessions/r1-s51`,
every command with `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/`.

## Start

`node ../tool/real.mjs --start $S setup:friends-ranked-names.txt` -> 01.png

01: The running club map is open, names on every ball, sized and colored by PageRank (legend top
left). I can see Gus low in the middle and Ivan just up and to the right of him, right on top of
Hana. There are a couple of lines leaving Gus to the right. One of those should be the Gus-Ivan tie.
I have never clicked a line before. I will try clicking on the line between them, partway along.

## Step 2

`node ../tool/real.mjs --step $S --hover-at 757,583` -> 02.png (tool: at 757,583 an edge with id "13", cursor: pointer, tooltip: null)

Hovering the line between Gus and Ivan: the pointer turns into a hand, so the line is clickable, but
nothing on the drawing lights up and no tip says which tie this is. I can't confirm from the hover
alone that this is Gus-Ivan and not Gus-Hana (Hana sits right under Ivan). I will click it.

## Step 3

`node ../tool/real.mjs --step $S --click-at 757,583` -> 03.png (tool: at 757,583 an edge with id "13")

Good: the line went blue, and the right-hand panel now reads "Gus -> Ivan", "Edge", with a Summary:
From Gus, To Ivan, weight 1. That is the right tie, named at both ends. The only number is "weight
1". The task says "runs together" and the program says "weight" -- my sheet's third column was
called weight, so I read that as the number of runs: 1 run. Says who? Says my own column; the
program does not say what the number counted, but it is my data, so I accept it. (The arrow "->" is
odd for a running partnership, but that is how the sheet was laid out, source then target.)
Also note: "Selection 1" in the left list now. Now I need Gus and Ivan to stand out. There is a
"..." menu at the top right of the panel; I will see what it offers.

## Step 4

`node ../tool/real.mjs --step $S --click-at 1419,73` -> 04.png (tool: button "Edge actions")

The menu offers "Select endpoints", "Frame selection" and "Add note". "Endpoints" is not my word,
but on a tie the end points can only be the two people, Gus and Ivan. Selecting them is not yet
making them stand out, but it is the first step I know of: last time a selected person was what the
panel talked about. I will choose "Select endpoints".

## Step 5

`node ../tool/real.mjs --step $S --click "Select endpoints"` -> 05.png

Gus and Ivan now glow yellow on the drawing, and only them; the panel says "2 nodes selected",
Nodes 2, "Edges joining these nodes 1". The left list says Selection 2. That is the right pair,
and they do stand out. But it is a selection: last time a selection went away the moment I clicked
somewhere else. For the editor I would want something that stays. The panel has a Style tab next to
Values; I will see whether I can give these two their own look from there.

## Step 6

`node ../tool/real.mjs --step $S --click "role=tab:Style"` -> 06.png

The Style tab for "2 nodes selected" lists Fill, Shape, Effects, Label, Tooltip, each with a plus.
Fill is color, I know that from last time's panel. I will press the plus beside Fill and give Gus
and Ivan a color nobody else has.

## Step 7

`node ../tool/real.mjs --step $S --click-at 1419,136` -> 07.png (tool: button "Add to Fill")

A small menu: Color, Opacity. Color.

## Step 8

`node ../tool/real.mjs --step $S --click "Color"` -> 08.png

Something real happened: a new entry "2 nodes" appeared in the left list (between Selection and
PageRank), the panel now says "2 nodes", "Layer", with Fill Color 6366F1 at 100%, which the swatch
shows as a blue-purple. The legend on the drawing gained "Color: 2 nodes" with a purple square.
But on the drawing Gus and Ivan look a dull grey-beige under their yellow glow, not purple. The
legend and the picture disagree. I suspect the yellow selection glow is mixing in. I will click on
empty canvas to drop the selection and look at them plain.

## Step 9

`node ../tool/real.mjs --step $S --click-at 1000,780` -> 09.png (tool: at 1000,780 empty canvas)

With the selection dropped, Gus and Ivan are plainly blue-purple and every other person is still
the orange-brown PageRank shading. The legend's "2 nodes" purple square now matches the picture.
The color stayed after the selection went, and "2 nodes" stays in the left list. Ivan is half
hidden behind Hana's ball, but the purple shows. The panel went back to the whole graph: 20 nodes,
41 edges, matching my sheet. That is the job done.

`node ../tool/real.mjs --end $S`

## End of session (in character)

**Did I finish?** Yes. The tie Gus -> Ivan shows weight 1, which I read as 1 run together (the
program calls my column "weight" and does not say what it counted, but it is my own column). Gus
and Ivan, and nobody else, are now colored purple on the drawing, and it stays after I click away.

**Ease: 6 of 7.**

**What confused me or slowed me down:**

- Hovering a line gives a hand pointer but no name. Ivan sits right on top of Hana, so until I
  clicked I could not confirm I had the Gus-Ivan line and not Gus-Hana. The panel heading "Gus ->
  Ivan" settled it.
- The number is labeled "weight", not "runs". Fine for my own sheet; a colleague's sheet would
  leave me asking "weight of what?".
- "Select endpoints" is jargon; I guessed it meant the two people at the ends of the tie, and it did.
- Right after I chose a color, the two people looked grey-beige on the drawing while the swatch and
  the legend said purple, because the yellow selection glow was laid over the new color. For a
  moment the picture disagreed with the legend, which is exactly what makes me distrust a tool.
  Only after clicking away did they show the color I chose.
- The new entry is called "2 nodes". I would rather it said "Gus, Ivan" so I know later what it is
  for; with several of these I would lose track.
