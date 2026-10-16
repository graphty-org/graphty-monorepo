# Session r2-s51 -- Alex (returning analyst), task T24 prompt A (running club, friends.csv)

Tool: `real.mjs`, REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/

## Step 1 -- start

`REAL_DIST=... with-browser.sh node real.mjs --start <session> setup:friends-ranked-names.txt` -> 01.png

Alex: OK, friends.csv is up, sized and colored by PageRank, names on. I can see Gus and Ivan
near the bottom middle; there's a line going up-right from Gus toward Ivan. In Gephi I'd check
the edge table for the weight, but let me just try hovering the line first.

## Step 2 -- hover the line between Gus and Ivan

`--step --hover-at 757,582` -> 02.png. Pointer cursor, no tooltip.

Alex: The cursor turns to a hand, so the line is clickable, but no tooltip with the number. I'll click it.

## Step 3 -- click the line

`--step --click-at 757,582` -> 03.png. The line turns blue; the right panel shows "Gus -> Ivan, Edge",
Values tab, Summary: From Gus, To Ivan, weight 1.

Alex: Good, that's exactly the edge-table row I wanted, without opening a table. weight 1 -- in
this file weight is runs together, so Gus and Ivan ran together once. Now to make just those two
stand out. There's a "..." menu by the edge name; I'll see what's in there.

## Step 4 -- open the edge's "..." menu

`--step --click-at 1419,74` (button "Edge actions") -> 04.png. Menu: Select endpoints, Frame selection (F), Add note (N).

Alex: "Select endpoints" -- that's Gus and Ivan. Selecting them is step one; then I'll color the selection.

## Step 5 -- Select endpoints

`--step --click "Select endpoints"` -> 05.png. Panel: "2 nodes selected", Nodes 2, Edges joining these nodes 1.
Gus and Ivan have a pale yellow glow; Selection row in the left list now says 2.

Alex: Both are glowing, but that's a selection highlight -- the first click elsewhere and it's
gone, and it's faint against the orange. I want them actually colored. The panel has a Style tab
for the selection; I'll try that, like I do on Everything.

## Step 6 -- Style tab of the selection

`--step --click "role=tab:Style"` -> 06.png. Sections Fill, Shape, Effects, Label, Tooltip, each with a +.

Alex: Same Style tab as Everything, empty for these two. Fill + should give them their own color.

## Step 7 -- Fill +

`--step --click-at 1419,136` (button "Add to Fill") -> 07.png. Menu: Color, Opacity.

Alex: Color.

## Step 8 -- Color

`--step --click "Color"` -> 08.png. Gus and Ivan turn blue-purple (6366F1); everyone else stays
orange. Left list gains a "2 nodes" layer above PageRank; the legend adds "Color: 2 nodes".

Alex: There it is -- the two of them in blue, everyone else orange, and the legend says so. The
layer is called "2 nodes", which won't mean much to my manager next week; I'd rename it "Gus and
Ivan" if I were keeping it. Let me click off on empty canvas to check the color stays when the
selection glow goes.

## Step 9 -- click empty canvas

`--step --click-at 1000,780` -> 09.png. Selection cleared (glow gone); Gus and Ivan stay blue,
everyone else orange. Right panel back to the Graph overview (20 nodes, 41 edges).

Alex: Color stuck after the selection went away. That's the deliverable. Done.

`--end <session>`

## Wrap-up (in character)

- **Finished?** Yes. Gus and Ivan ran together once (the tie's weight is 1). Gus and Ivan are now
  the only blue nodes on the drawing; everyone else keeps the PageRank orange.
- **Ease:** 6 of 7. Eight actions: click the line, "...", Select endpoints, Style, Fill +, Color,
  then a click off to check. Clicking the line straight into its From / To / weight was better
  than Gephi, where I would have gone hunting in the edge table.
- **What slowed or confused me:**
  - Hovering the line gave a hand cursor but no tooltip with the number; I had to click to see it.
  - The panel calls the number "weight". I know in this file that is runs together, but a
    colleague reading "weight 1" would not.
  - "Select endpoints" was tucked in the "..." menu; I found it because I was looking, but it
    is the obvious next thing after looking at a tie and could sit in the panel itself.
  - Selecting only gives a faint yellow glow, easy to miss against orange; to make them really
    stand out I had to know to go to Style and add a Fill color. Five clicks for "highlight these
    two" is more than I'd like if I did it weekly.
  - The new color layer is named "2 nodes", which tells nobody which two. I'd want it called
    "Gus, Ivan" or to rename it straight away.
  - The default color it picked (a blue-purple) happens to stand out fine against orange; I did
    not get asked to choose one.
