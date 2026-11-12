# Session r1-s17 -- Ruth, returning

Task: bring the network in straight from https://raw.githubusercontent.com/graphty-org/graphty-monorepo/master/design/ui/studio/tool/files/sources.graphml (no saving to disk first), then report how many people and organizations it holds, and how many ties.

## Step 1 -- start
Command: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292 REAL_TIER=4 node .../real.mjs --start $S empty
Screenshot: 01.png
Notes: The start screen I know. "Open a file" is what I used before -- that wants a file on my computer. There is a second button, "Open network data". I have never used it. Says "It never leaves your computer" for files. I'll try "Open network data" -- maybe that takes a web address.

## Step 2 -- Open network data
Command: --step $S --click "Open network data"
Screenshot: 02.png
Notes: A dialog: NDEx (biology, not me), Neo4j (a query, not me), Web API (JSON results, not quite), and at the bottom "Web address" with a box "Web address of a graph file". That's the one -- my colleague's link is a graph file. I'll click into it and paste the address, then press Enter.

## Step 3 -- paste the address, Enter
Command: --step $S --click "Web address" --type "https://raw.githubusercontent.com/graphty-org/graphty-monorepo/master/design/ui/studio/tool/files/sources.graphml" --key Enter
Screenshot: 03.png
Notes: It came straight in. Top says "sources", left "Graph sources.graphml", right panel "From sources.graphml". Overview reads: Nodes 24, Edges 59, Undirected, Components 1. "Everything 24" in the layers list agrees. So 24 people and organizations, 59 ties. Says who? It says "nodes" -- I want to see them as names, and whether people and organizations are both in there. I'll open the table view at the bottom (the grid icon) and count rows.

## Step 4 -- open the table
Command: --step $S --click-at 792,840   (button "Table")
Screenshot: 04.png
Notes: Table with names. "24 nodes", "In the order loaded", rows s01 Harlan Development (company), s02 Rita Vance (person), ... s09 City Planning Office (agency). So it isn't only people and companies -- there's an agency too. 24 rows agrees with Nodes 24. Now the Edges tab, to see the tie count from the table side.

## Step 5 -- Edges tab
Command: --step $S --click "Edges"
Screenshot: 05.png
Notes: "59 edges", rows "s01 - s02", "s01 - s05" ... Agrees with Edges 59 in the Overview. Two places, same numbers. The edge table only shows codes (s01, s02), not names -- I'd have to cross-read against the node table to check a tie. Annoying for a fact-check, but the count holds. I'm done.

## Result (in character)
- Finished: yes. Brought it in from the web address without saving it to my computer, through "Open network data" > "Web address".
- Answer: 24 people and organizations (the table's "kind" column shows persons, companies and at least one agency, "City Planning Office"), connected by 59 ties. Undirected, all in one piece (Components 1).
- How I know: Overview says Nodes 24, Edges 59; the table says "24 nodes" and "59 edges"; the "Everything" layer says 24. They agree.
- Ease: 6 of 7.
- What confused me / what I'd want:
  - The way in from the web is under "Open network data", next to NDEx and Neo4j, which read like specialist database things; I only found the "Web address" box because I opened it to look. "Open a file" was where I first thought of looking.
  - The start screen promises "It never leaves your computer" for files; nothing told me whether fetching from a link sends anything anywhere. Probably fine for a download, but I can't confirm it from the screen.
  - Nothing told me whether anything was skipped on the way in (no "24 nodes, 59 edges read, 0 dropped" message). I had to trust the counts matching each other. I can't confirm nothing was dropped against the source file.
  - The program calls them "nodes" and "edges"; my question was people, organizations and ties. I didn't see a breakdown by kind (how many persons vs companies) without scrolling the table myself.
  - Edge table shows ids (s01, s02), not names.
