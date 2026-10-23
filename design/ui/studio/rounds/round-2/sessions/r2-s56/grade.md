# Grade: session r2-s56 -- Dev, first look (karate club sample, then friends.csv)

Build: commit 4a7a1a7fb, graphty 0.8.53 (session.json). Graded from the last screenshot (35.png),
the saved picture (downloads/zachary-s-karate-club_current-view.png), the transcript and one
scripted re-run on the same build.

- **Grade:** none. "First look" is a measure, not a graded task: it has no success path (see
  answers.md). The record it asks for is below. For tables that need a letter, this session counts
  as S: he reached a drawing, ran three analyses, read each result correctly and gave a reasoned
  verdict.
- **Data used:** both. The Zachary's karate club sample first (steps 2-24), then his own file,
  friends.csv, opened as a new graph (steps 28-35).
- **Steps to the first drawing:** 2 actions after the start: "No thanks" on the usage-data card,
  then the "Zachary's karate club" sample (03.png). The sample took 1 action after the card, on
  target. His own file took 4 actions from the start screen (New from data..., choose a file,
  Direction > Undirected, Load; 29.png-32.png), against a target of 2, because he chose to set the
  direction.
- **Analyses run without being asked:** yes, three: Degree ("Connections"), Louvain
  ("Communities", found by typing "modularity" in the Analyze filter) and Betweenness ("Bridges").
- **Read correctly:** yes, all three. The karate club has no row in the reference table, so the
  values were checked against an independent computation (NetworkX on the same 34-node, 78-edge
  graph): degree 34 -> 17, 1 -> 16, 33 -> 12 (08.png) and betweenness 1 -> 231.07, 34 -> 160.55,
  33 -> 76.69, 3 -> 75.85, 32 -> 73.01 (20.png) match exactly. His three essay sentences restate
  them correctly, including "the median member has 3" (08.png, "median 3") and the group sizes 12,
  11, 6, 5 (10.png). On friends.csv he ran nothing; the node and edge counts he checked (20 and 41,
  32.png) match the reference.
- **Verdict:** keep using it, for the class assignment; ease 6 of 7. For: a drawing in two clicks,
  the Top 10 lists that give the numbers for the essay, size by Connections plus color by group
  plus labels, an exported picture that matches the screen, real Undo, and "N labels, M hidden"
  telling him what is missing. Against: the menu's Open merging his file into the sample, the
  stale orange legend row in the exported figure, each new run taking over the color, and the app
  naming measures differently from his class tutorial.
- **Steps:** 34 commands after the start (35 screenshots). **Wrong turns:** 1 -- step 24 (25.png):
  Main menu > "Open project or file..." added friends.csv to the open karate club project; he
  undid it (26.png) and took Back to start > New from data instead. Not counted as wrong turns:
  hiding Bridges with the eye icon (step 20) restored the figure he wanted, and the Size "+"
  search under Shape (steps 11-15) ended where he meant to go.
- **False "done":** none. His claims match the screen: the exported picture matches the drawing
  (24.png and the saved file); names on his own data are on with one hidden, which he states
  himself beside "20 labels, 1 hidden to avoid overlap" (35.png).
- **Tool prints:** one `ambiguous` resolution ("Connections" at step 10), which took the tree row
  he meant. No void.

## Problems

Severity 0-4 (Nielsen). Problems 1 and 2 were reproduced by
`rounds/round-2/repro/r2-s56/repro.sh` (output in `run/`, `run.log` and
`run/downloads/zachary-s-karate-club_current-view.png`), with the same result as the session.

| #   | Sev | Kind         | Problem                                                                                                                                                                                                                                                                                                                                                                                                    | Evidence                                                                                                                                                                                                                                                 |
| --- | --- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 3   | build-defect | After Degree then Louvain, the legend keeps "Color: Connections 1 .. 17" (an orange-to-brown bar) although every node is drawn in its group color, and the exported "To share" picture carries the same row. A reader of the figure is told orange means connections when nothing is orange. The legend disagrees with the drawing on the path to a shared figure.                                         | Steps 10, 21, 24; 10.png, 21.png, downloads/zachary-s-karate-club_current-view.png. Repro: karate sample, Degree > Run, Louvain > Run, Export; `run/07.png` and `run/downloads/...png` show both color rows. "My instructor will ask what orange means." |
| 2   | 3   | behavior     | "Open project or file..." in the main menu, used while a project is open, adds the file to that project ("Added friends.csv to this project") instead of opening it. The two networks are drawn as one, the window title stays "Zachary's karate club" while the Graph header says "friends.csv", and the earlier runs stay listed with their old counts. He expected Open to open; only Undo got him out. | Step 24-25, 25.png. Repro: `run/10.png`, `run/11.png` (Overview: 54 nodes, 119 edges, 2 components).                                                                                                                                                     |
| 3   | 2   | behavior     | Each new analysis takes over the node color: Betweenness repainted the group colors orange without notice, and he thought he had broken the figure until he found the eye icon on the Bridges row.                                                                                                                                                                                                         | Step 18-20, 19.png, 21.png.                                                                                                                                                                                                                              |
| 4   | 2   | behavior     | Size is not a visible row: it is under the "+" beside Shape, and adding it gives a fixed "1"; making it follow a measure needs the small chain-link "Size by attribute" icon, found by hovering. He expected a size added inside the Connections row to follow Connections.                                                                                                                                | Steps 11-15, 11.png-16.png.                                                                                                                                                                                                                              |
| 5   | 1   | wording      | Measures are renamed from the words his tutorial uses: Degree -> "Connections", Betweenness -> "Bridges", Modularity -> "Louvain" / "Find groups". The "Made with: Analysis ..." line and the filter that matched "modularity" let him confirm each one, at a cost of a check every time.                                                                                                                  | Steps 6, 8, 9, 19-20; 06.png, 08.png, 09.png, 20.png. Matches other first-look findings.                                                                                                                                                                 |
| 6   | 1   | wording      | The Overview truncates: "Undirected, from the file: the GML def..." runs off the right edge and "Edges per ..." is cut.                                                                                                                                                                                                                                                                                    | Step 3, 03.png; also `run/11.png`.                                                                                                                                                                                                                       |
| 7   | 1   | wording      | The size and label attribute pickers offer "Connections in degree" and "Connections out degree" on an undirected graph.                                                                                                                                                                                                                                                                                    | Step 15, 15.png; step 17, 17.png.                                                                                                                                                                                                                        |
| 8   | 1   | behavior     | On friends.csv one label is hidden to avoid overlap (the ball behind Chloe) and the screen does not say whose.                                                                                                                                                                                                                                                                                             | Step 35, 35.png ("20 labels, 1 hidden to avoid overlap"). Same as r2-s55 problem 8.                                                                                                                                                                      |
