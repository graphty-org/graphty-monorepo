# Session r3-s43 -- Dana Okafor (returning user)

Task: friends.csv is open. Find how many runs Gus and Ivan did together (the tie between them), then point out Gus and Ivan, and nobody else, on the drawing.

Commands run from /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1 with
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/ and S=<this folder>.

## Step 0 -- start
`node design/ui/studio/tool/real.mjs --start $S setup:friends-ranked-names.txt` -> 01.png
Sees: the drawing with names, PageRank sizing and coloring, a legend box, left panel with "Selection", "PageRank", "Everything", search box. Gus sits low-middle, Ivan just up and right of him with Hana overlapping. There is a line from Gus heading up-right toward Ivan.

## Step 1 -- hover the line between Gus and Ivan
"I see a line from Gus to Ivan. Let me point at it and see if it says anything."
`--step $S --hover-at 757,583` -> 02.png. Reports "edge with id 13", pointer cursor, no tooltip. Nothing tells me who it joins or the number.

## Step 2 -- click the line
"No tooltip, so I'll click it."
`--step $S --click-at 757,583` -> 03.png. The line turns blue; right panel reads "Gus -> Ivan, Edge", Summary: From Gus, To Ivan, weight 1. Selection count says 1.
Answer: they did 1 run together (the column is called "weight", which I read as the count of runs in my file).

## Step 3 -- click Gus
"Now pick out the two people. Click Gus first."
`--step $S --click "Gus"` -> 04.png. Gus has a yellow glow; panel shows Gus (Node), degree 4, PageRank #5 of 20. Selection: 1. The line is no longer blue.

## Step 4 -- shift-click Ivan
"Shift-click to add Ivan, like in a spreadsheet."
`--step $S --shift-click "Ivan"` -> 05.png. Ivan now glows, but Gus lost his glow. Selection still says 1. Shift did not add -- it replaced.

## Step 5 -- ctrl-click Gus
"Fine, Ctrl then, like Excel."
`--step $S --ctrl-click "Gus"` -> 06.png. Gus glows again, Ivan does not. Selection: 1. Ctrl replaced too.

## Step 6 -- click "Selection" row on the left
"Maybe this Selection row is where I add people."
`--step $S --click "Selection"` -> 07.png. Right panel shows the selection's look (yellow glow 40%, size 1.45, edge color, size). No way to add anyone here. Still 1.

## Step 7 -- search "Gus"
"Try the search box."
`--step $S --click "Find nodes, edges, values" --type "Gus"` -> 08.png. Lists Nodes 1 (Gus), Edges 4 (Dev -> Gus, Farah -> Gus, Gus -> Hana, Gus -> Ivan). Confirms the Gus-Ivan tie. No checkboxes or "select all".

## Step 8 -- right-click Ivan
"Right-click Ivan, maybe there's an add option."
`--step $S --rclick-at 821,547` -> 09.png. Ivan selected; menu: Neighborhood (G), Path between... (P), Frame selection (F), Add note (N). No "add to selection".

## Step 9 -- "Path between..."
"They're tied directly, so the path should just be the two of them."
`--step $S --click "Path between..."` -> 10.png. A "Shortest path" box: From Ivan, To (empty, focused), Follow Out/All, Weight None ("Each edge counts as 1; weight has no meaning set"), Find path. It covers Gus. Heavier than I wanted, but let's see.

## Step 10 -- type Gus in To
"Type Gus."
`--step $S --type "Gus"` -> 11.png. A suggestion "Gus" shows under the box.

## Step 11 -- pick Gus from the list
`--step $S --click "role=option:Gus" --click "Find path"` -> 12.png. Refused: two "Gus" options (the left search list and this suggestion). Nothing happened.

## Step 12 -- Enter
"I'll just hit Enter to take the suggestion."
`--step $S --key Enter` -> 13.png. Enter both picked Gus AND ran the path at once (no Find path click needed). Gus and Ivan drawn black, the tie between them black; legend adds "Shortest path" (black). Left list has a new "Shortest path -- 1 hop" row. Right panel: Path 2 nodes, 1 edge; Nodes in order Ivan 1, Gus 2. Ivan also still has the yellow selection glow. No one else is marked.
"That marks Gus and Ivan and nobody else. Good enough to show."

## End
`--end $S` -> session ended (copied to the design sessions folder).

## Wrap-up (in character, Dana)
- Did I finish? Yes. Gus and Ivan ran together 1 time (the tie Gus -> Ivan shows weight 1). Gus and Ivan are marked on the drawing (black, with their tie), and no one else is.
- Ease: 4 of 7.
- What confused me:
  - Hovering the line gave nothing -- no names, no number. I only got the count by clicking it.
  - The number is labeled "weight", not "runs". I assumed weight = runs because it is my file, but the tool never said so.
  - I could not pick two people. Click, Shift-click and Ctrl-click each replaced the one before; the Selection count stayed at 1. In Excel, Ctrl adds. There is no "add to selection" in the right-click menu either.
  - The "Selection" row on the left only shows colors and sizes, not who is in it or how to add.
  - I had to use "Path between..." as a workaround to mark two people. It made a whole new "Shortest path" entry and turned them black -- more than I asked for, and Ivan still has the yellow glow on top, so it is two different markings at once.
  - Enter in the "To" box picked Gus and ran the path in one go, before I had a chance to look at the other settings. Handy here, surprising in general.
