# Session r1-s20 -- Nadia (L1 alert reviewer)

Task: load sources.graphml, find clusters (each its own color), keep cluster color only for on-the-record sources, report how many still have a cluster color.

## Step 0: start
Command: `REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d2-758b8e8081 REAL_TIER=3 node .../real.mjs --start <session> empty`
Note: the tool waited for a free browser slot first.
Result: 01.png -- landing page with "Open a file", demo graph colored by community.

## Step 1
Says: "Big green Open a file. That's my file. Click it, pick sources.graphml."
Command: `--step <session> --click "Open a file" --upload sources.graphml`
Result: 02.png -- "Open as a new graph" preview: 24 nodes, 59 edges, a table with an on_record column (Yes/No). Good, the column I need is there. Load button bottom right.

## Step 2
Says: "Looks like a preview. I see on_record -- that's what QA would look at. Click Load."
Command: `--step <session> --click "Load"`
Result: 03.png -- graph loaded, 24 blue nodes in roughly three clumps. Left panel: style layers (Hovered, Selected, Everything). Right: stats. Bottom toolbar of icons, first one is a flask.

## Step 3
Says: "Three clumps, all blue. The front page had a 'Communities' button but I don't see words here. The flask looks like 'run something'. Try it."
Command: `--step <session> --click-at 615,864`
Result: 04.png -- "Analyze" popup, a long list (Degree, Betweenness, ...) with a "Filter analyses" box.

## Step 4
Says: "Too many words. Type 'cluster' in the filter box."
Command: `--step <session> --type "cluster"`
Result: 05.png -- filtered list: "Clustering coefficient" (highlighted, under Rank) and a "Find groups" section: Louvain, Leiden, Label propagation, Markov, Spectral, Hierarchical.

## Step 5
Says: "The highlighted one is 'Clustering coefficient' but that's a rank, not groups. I want 'Find groups'. No idea what Louvain is, but it's first and says densely linked groups. Click it."
Command: `--step <session> --click "Louvain"`
Result: 06.png -- Louvain settings: Resolution 1, Weight None, "Under a second", Run button.

## Step 6
Says: "Defaults are fine, I don't know what resolution means. Run."
Command: `--step <session> --click "Run"`
Result: 07.png -- three colors: Group 1 orange (bottom), Group 2 light blue (right), Group 3 green (left). Legend top-left. New "Louvain" folder in Style layers.

## Step 7
Says: "Good, three groups, under a second. Now only on-the-record people keep their color. The Louvain thing on the left is a layer -- maybe I can say which nodes it applies to. Click it."
Command: `--step <session> --click "Louvain"`
Result: 08.png -- right panel shows the Louvain folder: "3 layers in Louvain. Layers added later are not changed." Node tab, "Which nodes 24 of 24 nodes" with a chip "Louvain: <<Layer>>", Fill color <<Layer>>.

## Step 8
Says: "'Which nodes 24 of 24' -- that's where I narrow it down. Open it."
Command: `--step <session> --click "Which nodes"`
Result: 09.png -- "Which nodes: Nodes that pass every condition", one condition card "Louvain <<Layer>> 3 layers, Group 1, Group 2, Group 3", "+ Add a condition", Done.

## Step 9
Says: "Every condition -- so I add one: on_record is Yes. Click Add a condition."
Command: `--step <session> --click "Add a condition"`
Result: 10.png -- attribute list opened: name, kind, donations, on_record (2 values), email; Results: Louvain (already a condition).

## Step 10
Says: "on_record, 2 values. Pick it."
Command: `--step <session> --click "on_record"`
Result: 11.png -- condition "on_record = Yes, 12 nodes" added on its own (it picked Yes for me). "Which nodes 12 of 24 nodes"; legend says "12 of 24 nodes". The off-record nodes went back to the original purple-blue from when the file opened.

## Step 11
Says: "It already picked Yes, nice -- though I'd have checked it wasn't 'No'. It is Yes. 12 of 24. Click Done to lock it in."
Command: `--step <session> --click "Done"`
Result: 12.png -- condition chips "Louvain: <<Layer>>" and "on_record: yes, 12 nodes"; "Which nodes 12 of 24 nodes"; legend "12 of 24 nodes". Canvas: 4 orange, 4 light blue, 3 green visible; the 12th is probably the top-left node hidden behind the legend box. Everyone else is the original purple-blue.

Stopped here: task done. Did not run --end (the facilitator ends the session).

## Wrap-up (in character)

- Finished: yes. 12 sources still have a cluster color (the app says "12 of 24 nodes" in two places).
- Ease: 6 of 7. About 12 clicks, maybe four minutes -- inside one alert's worth of patience.
- What helped: the preview before loading showed me the on_record column straight away; typing "cluster" in the Analyze filter got me to "Find groups"; "Which nodes 24 of 24" was the obvious place to narrow it, and the count told me what I'd done.
- What confused me:
  - The filter put "Clustering coefficient" highlighted at the top, which isn't groups at all -- I nearly took it. And Louvain/Leiden/Markov mean nothing to me; I picked the first one on faith.
  - The landing page had a plain "Communities" button; inside the app there's only an unlabeled flask icon. I guessed.
  - Adding the on_record condition picked "Yes" on its own. Handy, but I had to look twice to make sure it wasn't "No" -- QA would ask which I chose.
  - The legend box covers part of the graph (one colored node seems hidden behind it), so I couldn't count 12 on the picture myself, only trust the number.
  - Not sure whether the condition changed my data or only the view -- the screen says "Layers added later are not changed", which I didn't understand. I assume view only.
- Export test: I'd want a picture plus "Louvain, 3 groups; colored only on_record = Yes: 12 of 24" for the file. I didn't look for export.
