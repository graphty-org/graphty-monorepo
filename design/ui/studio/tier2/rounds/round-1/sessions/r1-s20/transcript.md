# Session r1-s20 -- Alex (regular analyst), task T18 prompt B (Florentine families)

Build: frozen build named on the first line of tier2/criteria.md (946256efb876).
Session folder: this folder. Commands below use `T=design/ui/studio/tool`, `S=<this folder>`,
run with `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/`.

## Step 1 -- start

Command: `node $T/real.mjs --start $S setup:florentine-ranked.txt` -> 01.png

What I see: the Florentine families network, colored and sized by PageRank (someone ranked it
already). No names on the dots. Left panel: find box, Selection, PageRank, Everything. Toolbar at
the bottom with a flask button (the analysis button I use every week), a chart button, 3D, search.
The job: the fewest families between Strozzi and Pazzi. In NetworkX this is shortest_path. I will
look in the analysis button for a shortest path tool.

## Step 2 -- hover the flask

Command: `--step $S --hover-at 680,864` -> 02.png. Tooltip "Analyze Shift+A", as I remembered.

## Step 3 -- open Analyze

Command: `--step $S --click "Analyze"` -> 03.png
What I see: the analysis list with a filter box, Recent (PageRank), "Rank nodes and edges"
(Degree, Betweenness, ...). Rather than scroll, I'll type "shortest" in the filter -- that's the
NetworkX word.

## Step 4 -- filter for "shortest"

Command: `--step $S --type "shortest"` -> 04.png
What I see: "Shortest path -- The fewest steps, or the shortest route by weight, between two
nodes", under "Find paths and edge sets". Exactly what I want. Click it.

## Step 5 -- choose Shortest path

Command: `--step $S --click "Shortest path"` -> 05.png
What I see: a form -- From ("Where the path starts"), To ("Where the path ends"), Weight None
(right, marriages are unweighted), Advanced, Find path. I'll click the From box and type Strozzi.

## Step 6 -- From: Strozzi

Command: `--step $S --click "Where the path starts" --type "Strozzi"` -> 06.png
What I see: a suggestion "Strozzi" drops down under the box. Pick it.

## Step 7 -- pick the Strozzi suggestion

Command: `--step $S --click "role=option:Strozzi"` -> 07.png
What I see: From now says Strozzi, and the cursor jumped to the To box (it's highlighted). Nice.
Type Pazzi.

## Step 8 -- To: Pazzi

Command: `--step $S --type "Pazzi"` -> 08.png
What I see: suggestion "Pazzi". Pick it, then press Find path.

## Step 9 -- pick Pazzi and run

Command: `--step $S --click "role=option:Pazzi" --click "Find path"` -> 09.png
What I see: the path drawn in black on the graph, legend "On the path", left list now has
"Shortest path 4 hops", and the right panel Values tab: Path 5 nodes, 4 edges; Nodes in order:
Strozzi 1, Ridolfi 2, Medici 3, Salviati 4, Pazzi 5. Made with: From Strozzi, To Pazzi, Weight
None, "Each edge counts as 1."

Answer (main prompt): Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi. It passes through
Ridolfi, Medici and Salviati. Done. One nagging thought: NetworkX's shortest_path returns one of
possibly several equal-length paths; nothing here tells me whether this is the only one.

Follow-up given: "The Peruzzi now want a message carried to the Ginori the same way. Which
families does it pass through, in order?" Same routine: Analyze, Shortest path again.

## Step 10 -- open Analyze again

Command: `--step $S --click "Analyze"` -> 10.png
What I see: Shortest path is first under Recent. Click it.

## Step 11 -- Shortest path from Recent

Command: `--step $S --click "Shortest path"` -> 11.png
(Correction: the command actually run was `--click "Shortest path"`; the tool said the name was
ambiguous and took the left list's row, which closed the analysis list. That is the study tool
picking a control behind the open list, not something I did with the mouse -- a person clicking the
Recent row would not have hit this.)

What I see: the list closed; the left "Shortest path" row is highlighted with an eye icon. Open
Analyze again and pick the Recent entry by its role.

## Step 12 -- Analyze, then the Recent Shortest path option

Command: `--step $S --click "Analyze" --click "role=option:Shortest path"` -> 12.png
What I see: the same empty Shortest path form (From/To blank, Weight None). Fine for a new pair.
Type Peruzzi in From.

## Step 13 -- From: Peruzzi

Command: `--step $S --click "Where the path starts" --type "Peruzzi"` -> 13.png
What I see: suggestion Peruzzi. Pick it, type Ginori in To.

## Step 14 -- pick Peruzzi, To: Ginori

Command: `--step $S --click "role=option:Peruzzi" --type "Ginori"` -> 14.png
What I see: From Peruzzi, To shows the Ginori suggestion. Pick it and run.

## Step 15 -- pick Ginori and run

Command: `--step $S --click "role=option:Ginori" --click "Find path"` -> 15.png
What I see: a new black path; Values: Path 5 nodes, 4 edges; Nodes in order: Peruzzi 1,
Bischeri 2, Guadagni 3, Albizzi 4, Ginori 5. Made with: From Peruzzi, To Ginori, Weight None.
The left list still shows one "Shortest path 4 hops" row -- the new run replaced the Strozzi-Pazzi
one rather than adding a second row.

Answer (follow-up): Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori. It passes through
Bischeri, Guadagni and Albizzi.

## End

Command: `node $T/real.mjs --end $S`

## Wrap-up (in character)

- **Did I finish?** Yes, both. Strozzi -> Ridolfi -> Medici -> Salviati -> Pazzi (through Ridolfi,
  Medici, Salviati; 4 marriages). Follow-up: Peruzzi -> Bischeri -> Guadagni -> Albizzi -> Ginori
  (through Bischeri, Guadagni, Albizzi).
- **Ease: 6 of 7.** Typed "shortest" in the analysis filter, it was right there, the From/To boxes
  suggest names as you type and jump to the next box, and the Values tab hands me the families in
  order. Faster than writing nx.shortest_path in a notebook.
- **What confused me / what I'd want:**
    - Nothing tells me whether this is the ONLY chain of that length. NetworkX's shortest_path quietly
      picks one of several; I'd want a line saying "1 of N equally short chains" (or "the only one")
      before I put it in front of my manager.
    - Running it a second time replaced the first result. For the follow-up that was fine, but if I
      were comparing two pairs I'd have lost the first one; I only noticed because the left list
      still had a single "Shortest path" row. A small note that it replaced the earlier run would help.
    - The dots carry no names, so the black path on the canvas means nothing until I read the Values
      list. The list was enough; I didn't need labels for this task.
    - Note on the study tool, not the app: once, asking the tool to click "Shortest path" while the
      analysis list was open, it clicked the left panel row behind the list instead (the tool said
      the name was ambiguous). A person clicking the list row would not hit that.
