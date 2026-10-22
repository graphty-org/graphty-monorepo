# Session r3-s20 -- Dana Okafor (returning user)

Session folder: tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s20 (copied here by --end)
Build: tier2-r3d2-26f3bb968

All commands run from the studio worktree with
`REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r3d2-26f3bb968/`.

## Step 01 -- start

`node design/ui/studio/tool/real.mjs --start tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s20 setup:team-ranked.txt`

Dana: My team project is open from last time. "team.csv" at the top, a PageRank entry on the left
with 12, colored balls sized by PageRank. On the right a PageRank panel with Style and Values tabs.
Before I swap anything, I want to write down who was first. I will try "Values".

## Step 02 -- `--click "Values"`

Dana: A table. Good -- that is where I live. "12 of 12 have a value", Top 10 with Hal first at
0.1293, then Ida 0.1224, Di 0.1177. Writing it down: before = 12 people, Hal first. Last time I
opened files from the start screen, but the work is here now, so I will go to the Data place on the
left to see if I can swap the file there.

## Step 03 -- `--click "Data"`

Dana: Data place. Under Sources: "team.csv, 12 nodes, 16 edges". No obvious "replace" button. I
will click the source row and see what it offers.

## Step 04 -- `--click "team.csv"`

Dana: The right side now says "team.csv, Source", Loaded 12 nodes, 16 edges, and a table of the
edges opened at the bottom. There is a three-dot menu next to "team.csv" on the right. That is the
likely place for "replace". Clicking it.

## Step 05 -- `--click-at 1419,73` (tool: button "Source actions")

Dana: Menu: "Edit source..." and "Replace with file...". That second one is exactly what I want.
Clicking it and picking team-v2.csv from Downloads.

## Step 06 -- `--click "Replace with file..." --upload team-v2.csv`

Dana: A full page "Replace: team-v2.csv -- Was 12 nodes, 16 edges; now 14, 21." That is the
one-line answer I want, right at the top. It guessed source, target and weight correctly. There is a
"Higher means: Not set / Closer / Farther / Capacity" row with a long sentence under it; I skim it --
"until you do ... PageRank reads a higher weight as closer". Last time I never set it, and I want the
same ranking method as before, so I leave it alone. Clicking "Replace".

## Step 07 -- `--click "Replace"`

Dana: It went back to the graph. Right panel: Nodes 14, Edges 21. The legend now says "PageRank,
out of date" -- honest, I like that. Two blue dots, which must be the new people with no score yet.
My PageRank entry is still on the left with 12 and a little clock-like icon, so my work was not
thrown away. I will click it to rerun the ranking.

## Step 08 -- `--click "PageRank"`

Dana: The PageRank panel is back with my old table (Hal first, 12 of 12) and a blue banner: "Data
changed since this run -- Rerun". That is clear. Clicking "Rerun".

## Step 09 -- `--click "Rerun"`

Dana: Ran at 5:31:08 PM, "14 of 14 have a value", the entry on the left now says 14, no more "out of
date" on the legend, both new dots got colored. New top of the list: Di 0.1339, then Hal 0.1305, Ed
0.1245. Same settings as last time (weight read as closer, damping 0.85), so it is a fair
comparison. I have my answer. Ending.

## End -- `--end tmp/studio-sessions/tier2/rounds/round-3/sessions/r3-s20`

Session ended normally; no further request.

## Debrief (in character)

- **Finished?** Yes. The team has 14 people now. Before, Hal was first (0.1293). Now Di is first
  (0.1339), with Hal second (0.1305).
- **Ease:** 6 of 7.
- **What worked:** "Replace with file..." kept my ranking, the replace page told me "was 12 nodes,
  16 edges; now 14, 21" in one line, and the legend's "out of date" label plus the "Data changed since
  this run -- Rerun" banner meant I did not have to guess whether the numbers were stale.
- **What confused me:**
  - Replace is hidden behind an unlabeled three-dot icon on the source panel. I only found it
    because I went looking. A visible "Replace file" on the source row would have saved a step.
  - The "Higher means: Not set / Closer / Farther / Capacity" row on the replace page has a long
    sentence I did not read. I left it alone because I never touched it before. I do not know
    whether choosing something there would have changed my ranking compared to last month.
  - The small clock-like icon on the out-of-date PageRank entry does not explain itself. The legend
    text said "out of date", the icon did not.
  - Small grey labels ("Measure ran Oct 10...", "Data changed since this run") are hard to read
    without my glasses.
  - Still my standing question: can I get this table into Power BI, and does my supplier file stay on
    my machine? "Local only" at the top suggests it does, which I like.
