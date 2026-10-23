# Session r4-s18 -- Grace, returning

Session folder: /home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s18
All commands run from the studio worktree with REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ and S=<session folder>.

## Start
`node design/ui/studio/tool/real.mjs --start $S setup:florentine-ranked.txt` -> 01.png

01.png: Florentine families is open, PageRank ranking on the left, dots colored and sized by it, no names on the dots. Toolbar at the bottom.

## Step 1
Grace: "Okay, a message from Strozzi to Pazzi, fewest hops. That's a route question. The flask button is where the analysis lived last time -- let me see if there's a 'shortest route' in there."
`--step $S --click-at 615,864` (the flask in the toolbar)
-> 02.png: the Analyze list opened with a "Filter analyses" box; Recent: PageRank; "Rank nodes and edges" group (Degree, Betweenness, ...). Nothing about routes visible yet.

## Step 2
Grace: "A filter box, good. I'll type 'shortest' rather than scroll."
`--step $S --type "shortest"`
-> 03.png: "Shortest path -- The fewest steps, or the shortest path by weight, between two nodes." at the top, marked "Start here".

## Step 3
Grace: "'The fewest steps between two nodes' -- that's exactly it, plain words. Clicking it."
`--step $S --click "Shortest path"`
-> 04.png: a Shortest path form: From ("Where the path starts", focused), To, Weight (None), Advanced, Find path.

## Step 4
Grace: "From and To. Weight None is fine -- a marriage is a marriage. The From box has the cursor, so I'll type Strozzi."
`--step $S --type "Strozzi"`
-> 05.png: a suggestion "Strozzi" appears under the From box.

## Step 5
Grace: "It found Strozzi. I'll pick it from the list."
`--step $S --click "role=option:Strozzi"`
-> 06.png: From says Strozzi; the cursor moved to To on its own. Nice.

## Step 6
Grace: "It jumped to To for me. Pazzi."
`--step $S --type "Pazzi"`
-> 07.png: suggestion "Pazzi" under To.

## Step 7
Grace: "Pazzi's there. Pick it, then Find path."
`--step $S --click "role=option:Pazzi" --click "Find path"`
-> 08.png: the path is drawn in black on the map. Left panel: "Shortest path 4 hops" above my PageRank (still there, still on). Right panel, Values: Path "5 nodes, 4 edges"; Nodes in order: 1 Strozzi, 2 Ridolfi, 3 Medici, 4 Salviati, 5 Pazzi. Made with: From Strozzi, To Pazzi, Weight None, "Each edge counts as 1."

Grace: "There it is, in order, numbered. Five families, four hops -- 5 nodes, 4 edges, that adds up. And my PageRank layer is still in the list, it didn't wipe it. Done."

## End
`--end $S`
--end answered with a further request: "The Peruzzi now want a message carried to the Ginori the same way. Which families does it pass through, in order?"

## Step 8
Grace: "Same thing again, Peruzzi to Ginori. Back to the flask -- it should remember Shortest path."
`--step $S --click "Analyze"`
-> 09.png: Recent now lists Shortest path first, then PageRank.

## Step 9
Grace: "Shortest path is right at the top under Recent. Click."
`--step $S --click-at 600,455` (the Recent "Shortest path" row; the left panel also has a "Shortest path" row, so I pointed at it)
-> 10.png: a fresh, empty Shortest path form (From focused). The Strozzi-Pazzi path is still drawn and listed on the right.

## Step 10
Grace: "Empty form, cursor in From. Peruzzi."
`--step $S --type "Peruzzi"`
-> 11.png: suggestion "Peruzzi".

## Step 11
Grace: "Pick Peruzzi, then type Ginori in To."
`--step $S --click "role=option:Peruzzi" --type "Ginori"`
-> 12.png: From Peruzzi, To "Ginori" with the suggestion Ginori.

## Step 12
Grace: "Ginori, then Find path."
`--step $S --click "role=option:Ginori" --click "Find path"`
-> 13.png: new path drawn in black. Right panel: Path "5 nodes, 4 edges"; Nodes in order: 1 Peruzzi, 2 Bischeri, 3 Guadagni, 4 Albizzi, 5 Ginori. From Peruzzi, To Ginori, ran 3:13:50. The left panel still has one "Shortest path 4 hops" row and PageRank; the Strozzi-Pazzi path is no longer drawn or listed.

Grace: "Peruzzi, Bischeri, Guadagni, Albizzi, Ginori. Four hops again. Hm -- the first path is gone, it replaced it rather than adding a second one. I'd already written the first answer down, so fine today, but for the board I might have wanted both on one slide. Done."

## End
`--end $S`
Session ended (second --end closed it).

## Debrief (in character)

- **Did I finish?** Yes, both.
  - Strozzi to Pazzi: Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi (passes through Ridolfi, Medici, Salviati; 4 hops).
  - Peruzzi to Ginori: Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori (passes through Bischeri, Guadagni, Albizzi; 4 hops).
- **Ease:** 7 of 7 for the first question, 6 of 7 overall.
- **What helped:** typing "shortest" in the analysis filter found it at once; "The fewest steps ... between two nodes" is a description I'd put on a slide. The From box was ready to type in, it jumped to To by itself, and the answer came back as a numbered "Nodes in order" list with "5 nodes, 4 edges" that adds up. My PageRank colors and sizes stayed.
- **What confused me:** running the second path replaced the first one -- the Strozzi-Pazzi path vanished from the map and the list with no word about it. I'd have liked to keep both, or at least be told the old one was replaced. Also, the family names aren't drawn on the dots, so I could only read the route from the side panel, not from the picture itself.
