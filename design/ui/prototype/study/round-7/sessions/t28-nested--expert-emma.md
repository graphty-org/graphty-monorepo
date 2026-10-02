# Session: bring the newest nested export in alongside the earlier one -- Expert Emma

Task as given by the moderator: "Bring the newest export from the research database into this
project alongside the earlier one. The data on screen is a sample: one export from a research
database, researchers and institutions with records inside records. If that is not your line of
work, treat it as your own nested export."

Start screen: shots/tasks/t28-nested/01.png -- project "Research network, March 2026", Graph
panel, 200 nodes / 670 edges, "Local only" chip in the top bar.

All commands were run from design/ui/prototype. Renders are in
tmp/round-7-sessions/t28-nested--expert-emma/.

## Think-aloud

**Start.** "'Local only' at the top. Good, that's the first thing I look for. This is a network-
evolution job: I want March and the new one side by side, not one overwriting the other. Where
does data come in? There's a Data item in the left rail."

**Step 1 -- Data.**
`timeout 120 node app-b/study.mjs --try .../01.png task:t28-nested --click "Data"`
"Sources: one, network-export-2026-0..., 200 nodes, 670 edges from 3 tables -- researchers,
institutions, links. Attributes show the nesting: attributes > profile > contact, metrics >
citations. Fine. There's a plus next to Sources."

**Step 2-3 -- what is the plus?** (icon only, so I wanted the tooltip)
`--click "Data" --hover "Add source"` -> nothing on screen is called "Add source"
`--click "Data" --hover "Add data"` / `"Import"` (not found) / `"Add"` -> 03.png
"'Add data to this graph.' OK, that's what I want."

**Step 4 -- open it.**
`--click "Data" --click "Add data"` -> 04.png
"File..., From a URL..., Paste..., Set collection.... No idea what 'Set collection' means. My
export is a file on disk. File."

**Step 5-6 -- File.**
`--click "Data" --click "Add data" --click "File..."` -> 05.png
"A file chooser with three choices: Data file (CSV, JSON, GEXF or GraphML), someone's recipe,
someone's style file. The data file, obviously."
`... --click "Data file: CSV, JSON, GEXF or GraphML"` -> 06.png
"Hold on. The title bar now says 'Transfers, March 2026'. The header says 'Open as a new graph'.
The file is transfers-2026-03.csv -- bank account transfers, flat, 9,113 rows. I said add data to
THIS graph and it's telling me it's opening a new one. Also nothing here looks like a nested
export; it's a flat edge list. The match report is nice -- 'every row has both ends', '3,000 ids
found' -- that's the column-count sanity check I always do by hand. But it's the wrong file in
the wrong place. Cancel."

**Step 7 -- Cancel.**
`... --click "Cancel"` -> 07.png
"Back to my research network, toast says 'Load cancelled: nothing was loaded', with Undo.
Good. Cancel actually cancels."

**Step 8-10 -- the export row's own menu.** If the tool thinks of the export as a versioned
thing, 'add a newer export' would hang off the existing one.
`--click "Data" --hover "More actions"` -> 08.png -- that was the inspector's menu on the right
("More actions Shift+F10"), not the row.
`--click "Data" --hover "Actions"` -> 09.png -- "Actions for network-export-2026-03.json". That's it.
`--click "Data" --click "Actions for network-export-2026-03.json"` -> 10.png
"Rename, Replace with file..., Edit source..., Refresh. Replace is exactly what I don't want; I
need both snapshots to compare. Nothing like 'add another version' or 'add alongside'."

**Step 11 -- Set collection.** The only menu item I hadn't tried.
`--click "Data" --click "Add data" --click "Set collection..."` -> 11.png
"Same transfers screen, same 'Open as a new graph'. Every road leads here. Whatever 'set
collection' is supposed to mean, it didn't tell me."

**Step 12 -- is 'Open as a new graph' a setting?**
`... --click "Data file: CSV, JSON, GEXF or GraphML" --click "Open as a new graph"` -> 12.png
"No, it's a static label. There's no switch for 'add to this graph' vs 'new graph'."

**Step 13 -- project menu.**
`--click "Research network, March 2026"` -> 13.png
"Rename, Save, Save as, Export, Apply recipe or style file, Version history, Close project.
Version history is the project's history, not the source data's. No 'add graph'."

**Step 14 -- graph switcher.**
`--click "Research network"` -> 14.png
"One graph, 200 nodes, and 'Compare graphs...'. Comparing needs two graphs, so a project can
hold more than one. The only way I've seen to make another graph is that import that says 'Open
as a new graph'. Maybe 'new graph' means a new graph in this project. The prototype's file
picker gave me a transfers CSV; I'll treat it as a stand-in for my file and load it."

**Step 15-17 -- Load and check.**
`... --click "Data file: CSV, JSON, GEXF or GraphML" --click "Load"` -> 15.png -- progress dialog
"Reading transfers-2026-03.csv, 3,000 nodes, 9,113 edges..." with Cancel. Good.
`... --click "Load" --click "Graph"` -> 16.png
"Now the project itself is 'Transfers, March 2026'. There's a Louvain run 'from Louvain, Sep
28' that I never ran, seed 11, modularity 0.688. Where did my research network go?"
`... --click "Load" --click "Graph" --click "Transfers"` -> 17.png
"The switcher lists one graph: Transfers, 3,000 nodes. The research network is not in this
project. 'Add data to this graph' did not add anything to this graph -- it replaced my project
with another one. That's the opposite of alongside. I'm stopping."

## Outcome

**Did I succeed?** No. I could not find any way to put a second export next to the first one
in the same project. The one path that imports a file says "Open as a new graph" even when
started from "Add data to this graph", and after loading, the project switched and the original
graph was no longer listed. I also never saw a nested JSON preview -- the import showed a flat
CSV of transfers -- so I can't say whether the nesting (profile > contact, metrics > citations)
would have survived.

**Single Ease Question (1-7):** 2.

**Would I use this instead of my current tool?** Not for this. For network evolution I keep
each snapshot as its own graph object in the notebook and diff them in pandas; that takes two
lines. Here the words contradicted each other: the button said "add to this graph", the screen
said "new graph", and the result was neither -- it was a new project. What I did like: "Local
only" up front, the import's match report (row counts, both ends present, ids found, edges made)
is the check I always do by hand, Cancel really cancelled with an Undo, and the load shows
progress with a Cancel. If adding a second snapshot next to the first actually worked, and the
"Compare graphs" thing gave me a node/edge diff with counts, I'd consider it for handing a
before/after view to a non-coder. Not today.

## Problems seen

1. "Add data to this graph" (Sources +) leads to an import headed "Open as a new graph" -- the
   two labels contradict each other, and there is no switch between "add to this graph" and
   "new graph". (06.png)
2. After Load, the project title changes to the imported file's name and the original graph is
   gone from the graph switcher; nothing was added alongside. (16.png, 17.png)
3. No way found to add a second version of an existing source: the source row's menu offers only
   Rename, Replace with file, Edit source, Refresh. "Replace" is the destructive opposite of the
   task. (10.png)
4. "Set collection..." in the Add data menu is unexplained and led to the same new-graph import.
   (04.png, 11.png)
5. "Compare graphs..." is offered with only one graph in the project and no way visible to add a
   second. (14.png)
6. The loaded project shows a Louvain run dated Sep 28 that the user never ran. (16.png)
7. Icon-only + and ... controls: two different "..." menus answer to "More actions"-like names;
   the row one is "Actions for <file>", which I only found by guessing. (08.png, 09.png)
