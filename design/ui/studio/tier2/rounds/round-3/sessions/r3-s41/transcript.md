# Session r3-s41 -- Ruth, returning

Task: friends.csv is open. How many runs did Gus and Ivan do together? Then point out Gus and Ivan, and nobody else, on the drawing.

All commands run from the studio worktree with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ and
S=tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s41.

## Step 01 -- start
`node design/ui/studio/tool/real.mjs --start $S setup:friends-ranked-names.txt`
The running club map is up, 20 names, sized and colored by PageRank. Gus is lower middle; Ivan is just above Hana, his label half hidden behind her ball. There is a line from Gus up toward Ivan. I'll click Gus and read his connections on the right, as I always do.

## Step 02
`--click "Gus"` -> clicked node "Gus" at 689,626.
Gus is selected; the right panel says Degree 4 and PageRank 0.0535, #5 of 20. No list of who he is tied to shown yet, but Degree has a little arrow. Last time the connections list was what I used; I'll open Degree.

## Step 03
`--click "Degree"`
The panel now says "Gus and 4 connections", with a Neighbor / weight table: Dev 1, Farah 5, Hana 4, Ivan 1. The weight column is the runs column from my sheet, so Gus and Ivan ran together once -- 1. The selection on the left now counts 5, and all five are ringed on the drawing; that is more than I asked for. I want just Gus and Ivan. I'll click Gus on the drawing, then shift-click Ivan to add him.

## Step 04
`--click "Gus" --shift-click "Ivan"` (the tool printed no node notice, so I think both names hit the panel, not the drawing)
Now only Ivan is selected (Selection 1), ringed on the drawing, panel shows Ivan: Degree 5, PageRank #15 of 20. Gus is no longer ringed. I'll shift-click Gus's ball on the drawing itself to add him.
(`--shift-click-at` does not exist in the tool; no step taken.)

## Step 05
`--shift-click "Gus"` -> clicked node "Gus" on the canvas at 689,626.
Shift did not add: Selection still says 1, and now it is Gus instead of Ivan. Ivan lost his ring. Maybe this program wants Ctrl to add, like a file list. I'll ctrl-click Ivan on the drawing.

## Step 06
`--ctrl-click "Ivan"` -> clicked node "Ivan" on the canvas at 821,547.
Ctrl does the same as Shift: it swaps, Selection stays at 1, now Ivan. I can't find how to hold two people at once by clicking. Different tack: the tie itself. If I click the line between Gus and Ivan I may get the tie's own record (and check the runs count from that side), and maybe it lights up both ends. I'll click the middle of that line.

## Step 07
`--click-at 755,586` -> edge with id "13".
The tie itself: "Gus -> Ivan", Edge, From Gus, To Ivan, weight 1. That matches the 1 I read in Gus's connections table, from both sides now. Answer to the first part: 1 run together. The line is drawn blue, but Gus and Ivan themselves are not marked; the selection is the tie, not the two people. There is a "..." menu at the top right of the panel; maybe it has "select both ends". I'll open it.

## Step 08
`--click-at 1419,73` -> button "Edge actions".
A menu: Select endpoints, Frame selection (F), Add note (N). "Select endpoints" is exactly the words for what I want -- the two people at the ends of this tie. Clicking it.

## Step 09
`--click "Select endpoints"`
"2 nodes selected", Selection 2 on the left, Nodes 2, Edges joining these nodes 1. On the drawing Gus and Ivan have the yellow ring and nobody else does; Hana sits right under Ivan but has no ring. The panel does not list the two names -- I read them from the labels by the rings. That is the task done. Ending.

## Step 10 -- end
`node design/ui/studio/tool/real.mjs --end $S` -> session ended.

## In my words, at the end

**Did I finish?** Yes. Gus and Ivan ran together once: weight 1, read in Gus's connections table and again on the tie itself (From Gus, To Ivan, weight 1). Then Gus and Ivan, and only them, ringed on the drawing via the tie's "Select endpoints".

**Ease:** 5 of 7.

**What confused me:**
- Picking two people by clicking. Shift-click and Ctrl-click on the drawing both replaced the one I had instead of adding the second. Three tries, nothing told me why or how to add. I only got there because clicking the line happened to give me a menu with "Select endpoints". If the two people were not tied, I would not know how to point out both.
- Opening Degree to see Gus's connections also put all five people (Gus and his 4) into the selection and ringed them. I did not ask for that, and it was more than I wanted to point at.
- The table header says "weight", which is my sheet's column name; fine for me, but it never says runs. I know it because I built the sheet.
- "2 nodes selected" does not name the two. I had to read the names off the labels next to the rings. Ivan's label also sits half behind Hana's ball, so on a crowded part of the drawing I'd want the names in the panel.
- Good: the tie's own panel showing From, To and the number is exactly the kind of check I want -- one number confirmed from two places.
