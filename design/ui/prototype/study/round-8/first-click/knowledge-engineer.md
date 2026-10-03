# First-click test -- Dr. Min-ji Kim, knowledge graph engineer

Each answer is the one thing I would click (or look at) first on the still picture, and how sure I am, 1 (a guess) to 7 (certain). Remarks are in my own voice.

## r8-fc01 -- see it working before my data is ready (start screen)
- Click: the "Les Miserables" sample, top of the Samples column.
- Sure: 6
- It says it opens with measures, groups and paths already added, so it shows the most. For a known-answer check I would rather have Zachary's karate club, because the split is recorded, but to see it working it is the first one. "Local only" and "never uploaded" are the two lines I read first; good. I dismiss the usage-data box with "No thanks" before anything else.

## r8-fc02 -- bring in my spreadsheet from Downloads (start screen)
- Click: "New from data..." under Start.
- Sure: 4
- "Open project or file..." could also take a CSV, so I am torn. "New from data" sounds like the place where it asks me which column is source, target and predicate, which is what I need. If it does not ask, I am done with it. No Turtle option anywhere, I notice.

## r8-fc03 -- work out which characters the story depends on most (graph screen)
- Click: the flask icon in the floating toolbar at the bottom of the drawing.
- Sure: 3
- "Depends on most" is not a measure. Which centrality? PageRank is already in the list and Betweenness is there hidden, and the right panel says "Measure from Analyze", so I assume the flask is Analyze. No label on it, so it is a guess.

## r8-fc04 -- pick out circles of characters who keep turning up together (graph screen)
- Click: the "Louvain -- 6 groups" row in the left list.
- Sure: 4
- Louvain is community detection and it is named, which I appreciate. It already appears to have been run, so I would open that row to see what it found before running anything new. If I wanted to run it again with other settings I would go to the flask icon instead.

## r8-fc05 -- every character's name beside its dot ("Everything" row selected)
- Click: the "+" next to "Label" in the right panel.
- Sure: 5
- "Everything" is selected and it paints all 77 nodes, so a label added here should reach every node. There is also a "Labels shown -- 1 node" row on the left that confuses me a little: is that where labels live? I would still try the right panel first.

## r8-fc06 -- bigger dots for the highest scores of this measure (PageRank selected)
- Click: the "+" next to "Shape" in the right panel.
- Sure: 3
- I do not see "Size" anywhere on this panel. On the "Everything" row Size sat under Shape, so I guess it is hiding under Shape here too. A size that follows the score should be one obvious control; it is not.

## r8-fc07 -- arrange the dots a different way (graph screen)
- Click: the play triangle in the bottom floating toolbar.
- Sure: 2
- None of the five icons says "layout". Play might rerun the layout, the cube is probably 3D, the lightning I cannot guess. I would hover each one. And I want to be told whether position means anything in whatever layout it picks.

## r8-fc08 -- jump straight to Javert (graph screen)
- Click: the "Find rows and notes" search box at the top of the left list.
- Sure: 4
- Javert is visible on the drawing, but on my own graph he would not be, so I search. "Rows and notes" makes me unsure it searches nodes at all; I would expect "nodes" in that box.

## r8-fc09 -- a picture of this drawing for a slide (graph screen)
- Click: the hamburger menu (three lines) at the top left.
- Sure: 3
- There is no export or camera icon in sight. The menu is where file things usually live. I want SVG, not just a PNG.

## r8-fc10 -- the numbers for each character in Excel (graph screen)
- Click: "Table" at the bottom left of the drawing.
- Sure: 4
- I expect the table of nodes with their measure values, and then an export from there, probably the "..." beside "Columns: 9 of 9". I would want CSV with the measure named in the column header.

## r8-fc11 -- stop now and pick up tomorrow exactly as it is (graph screen)
- Click: the "Les Miserables" name with the down arrow at the top left.
- Sure: 4
- That looks like the project, so save should be in it. The start page said projects "are kept in this browser", which worries me: clearing browser data must not wipe a day of work. I want a file I can keep in Git.

## r8-fc12 -- check the whole file came through (import screen)
- Look: the line at the top, "Les Miserables: 77 nodes, 254 edges", then the counts beside "nodes 77" and "edges 254" in the Tables list.
- Sure: 6
- This is the screen I care about. Counts are labeled nodes versus edges, the match report says every id is unique, and the id column is the key. I would compare 77 and 254 with what I know the file holds. I would still want to know if any edge pointed at an id that is not in the node table; the match report only covers nodes here.

## r8-fc13 -- who this character is directly tied to (Valjean selected)
- Click: the first icon in the small toolbar that appeared above the main one, the target-like concentric circles.
- Sure: 3
- "Valjean, 36 connections" is shown, so the neighbors are known. The concentric circles look like "around this node". The two-path icon next to it could be paths. No labels, so this is a guess again.

## r8-fc14 -- this month's transfers file in place of last month's (Data screen)
- Click: the "..." beside "transfers-2026-03.csv" under Sources.
- Sure: 5
- I expect "Replace file" there. Before I accept, I want a count of what changed: rows in, rows dropped, accounts that no longer match. Accounts is a separate file and may need replacing too.

## Overall
The start page and the import screen are honest: local-only stated, counts labeled. The drawing screen is where I would slow down: the floating toolbar is five unlabeled icons and I guessed on three tasks because of it. Still no RDF import; everything here is spreadsheet-shaped.
