# Session r5-s25b -- Ruth, returning

Task: friends.csv is open. Find how many runs Gus and Ivan did together (the tie between them), then select Gus and Ivan and nobody else.

All commands use:
REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r5-8c015b806/ node /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/design/ui/studio/tool/real.mjs <args> /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/tmp/studio-sessions/tier2/rounds/round-5/sessions/r5-s25b

## 01.png (start, given)
The map is open, nodes sized and colored by PageRank. Gus is lower middle, Ivan up and to the right of him, with a line between them. I'll click on that line to see what the tie says.

## Step 1 -> 02.png
Command: `--step ... --click-at 755,585` (tool: "edge with id 13")
The line turned blue and the right panel says "Gus -> Ivan, Edge", Values: From Gus, To Ivan, weight 1. The sheet's only number on that tie is "weight", and it reads 1. My club sheet counts runs together, so weight 1 = one run together. The screen doesn't say "runs", it says "weight" -- I'm reading it as the run count because it's the only number there. Now I'll click Gus, then shift-click Ivan to get exactly those two.

## Step 2 -> 03.png
Command: `--step ... --click "Gus"`
Gus has a yellow ring; panel says Gus, Node, Degree 4. Selection says 1 -- the edge got dropped, good. Now shift-click Ivan to add him.

## Step 3 -> 04.png
Command: `--step ... --shift-click "Ivan"` (tool: clicked node "Ivan" on the canvas, at 821,547)
Both Gus and Ivan have yellow rings. Panel header: "2 nodes selected", Nodes 2, Edges joining these nodes 1. The left list's Selection row reads 2. Is that all of them? Yes: 2, and both names are the ones ringed. The "1 edge joining" also tells me there is only the one tie between them -- no second line the other way that might carry more runs. Done; ending.

Command: `--end ...`
Session ended normally (no further request).

## Debrief (in character)
- Finished? Yes. Gus and Ivan ran together once: the tie Gus -> Ivan shows weight 1. Then Gus and Ivan are selected, and only them ("2 nodes selected", Selection 2).
- Ease: 6 of 7.
- What confused me: the tie's number is labelled "weight", not "runs". It's the only number on the tie, so I took it as the run count, but the screen doesn't say what was counted. That's the column name from my sheet, so it's my labeling, not the tool's -- still, I had to assume it. The arrow "Gus -> Ivan" also made me ask whether a second tie ran the other way; "Edges joining these nodes 1" answered that, which saved me a check. Clicking the thin line needed a steady hand; I'd have tried the find box next if it had missed.
