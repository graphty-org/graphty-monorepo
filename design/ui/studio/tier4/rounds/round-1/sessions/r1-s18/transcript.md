# Session r1-s18 -- Maren (genomics Cytoscape user), returning

Task: bring the yeast network in straight from https://raw.githubusercontent.com/graphty-org/graphty-monorepo/master/design/ui/studio/tool/files/yeast-galactose.graphml (no download), then report gene and interaction counts.

## Step 1 (start)
Command: REAL_DIST=... REAL_TIER=4 node .../real.mjs --start <session> empty
Saw (01.png): the start page. "Open a file", "Open network data", "Samples", "New project". Nothing says "from a web address" on the big button. In Cytoscape I'd do File > Import > Network from URL. "Open network data" sounds closest -- maybe it has a URL option. Trying it.

## Step 2
Command: --step <session> --click "Open network data"
Saw (02.png): a dialog "Open network data" with NDEx, Neo4j, Web API, and below a "Web address" field: "Web address of a graph file". Good -- that's my Import Network from URL. Pasting the address and pressing Enter.

## Step 3
Command: --step <session> --click "Web address" --type "https://raw.githubusercontent.com/graphty-org/graphty-monorepo/master/design/ui/studio/tool/files/yeast-galactose.graphml" --key Enter
Saw (03.png): the network opened straight away, titled "yeast-galactose", "From yeast-galactose.graphml" under Graph. The Values tab on the right shows an Overview: Nodes 331, Edges 361, Undirected, Density 0.00661, Components 26, Largest component 249 nodes. Numbers, with counts. That's what I wanted. It also tells me the largest component size up front, which in Cytoscape I'd have to go find.

## End (in character)
- Did I finish? Yes. The network came in from the web address, no download. It holds 331 genes (nodes) and 361 interactions (edges).
- Ease: 6 / 7.
- What confused me: the big green "Open a file" button doesn't mention web addresses, so I had to guess that "Open network data" (which sounded like databases) was where the URL box lived. Once the dialog opened, the "Web address" field was obvious, but it sits below NDEx/Neo4j/Web API tiles, and "Web API" vs "Web address" is a bit of a near-miss -- I almost clicked the API tile. It never told me whether anything was dropped on the way in (were all genes kept? any unreadable columns?), but the counts match what I'd expect for galFiltered, so I trust it for now. Also it says "Nodes" and "Edges"; fine. The view says 3D at the bottom -- I'd want 2D before any figure.
