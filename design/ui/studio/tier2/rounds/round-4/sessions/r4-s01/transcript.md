# Session r4-s01 -- Analyst Alex (returning user)

Session folder (screenshots): tmp/studio-sessions/tier2/rounds/round-4/sessions/r4-s01

## Start

    REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r4d1-5277e2cbe/ node design/ui/studio/tool/real.mjs --start <session> setup:friends-ranked-names.txt

01.png: friends.csv open, 20 nodes, every name drawn, colored and sized by PageRank, a size/color legend top left.
Everything panel on the right (Style tab). Gus is lower middle, Ivan just above Hana to his right; a line runs from Gus up toward Ivan.

## Steps

### Step 1 -- 02.png
"There's a line from Gus going up to Ivan. Let me hover it and see if it tells me the number."

    --step <session> --hover-at 757,584

Tool: edge with id "13", cursor pointer, no tooltip. Nothing shows on hover -- in Gephi I'd at least get the edge row. Mild annoyance.

### Step 2 -- 03.png
"No hover info. I'll just click the line."

    --step <session> --click-at 757,584

The edge turns blue, right panel switches to "Gus -> Ivan / Edge", Values tab: From Gus, To Ivan, weight 1. Selection count in the left list goes to 1.
The column is just called "weight" -- that's what my spreadsheet called it, so weight = runs together. Answer: 1 run. Note the arrow says Gus -> Ivan; it's a running club, direction means nothing to me, but fine.

### Step 3 -- 04.png
"Got the number. Now pick Gus and Ivan. Click Gus first."

    --step <session> --click "Gus"

Gus gets a yellow halo, edge highlight gone, panel shows Gus (Node): degree 4, PageRank 0.0535, #5 of 20. Selection says 1. Good -- clicking replaced the edge selection, didn't add to it.

### Step 4 -- 05.png
"Gus is picked. Shift-click Ivan to add him, like every other tool."

    --step <session> --shift-click "Ivan"

Tool: clicked node "Ivan" on the canvas, at 821,547. Both Gus and Ivan have yellow halos; right panel says "2 nodes selected": Nodes 2, Edges joining these nodes 1. Left list: Selection 2. Nobody else highlighted. That's exactly the two -- done.

    --end <session>

Result: "session ended", copied to the design folder; leak check clean.

## In character, at the end

- **Finished?** Yes. Gus and Ivan ran together 1 time (the edge's "weight" is 1), and Gus and Ivan are the only two selected ("2 nodes selected", Selection 2).
- **Ease: 6/7.** Four actions, no dead ends.
- **What confused me / what took longest:**
  - Hovering the line showed nothing. In Gephi I'd at least see the edge highlighted with its data; here I only found the number by clicking. One extra click, but I didn't know clicking a line would work until I tried.
  - The panel calls it "weight". I know that's my column, so it's fine, but it doesn't say "runs" -- if a colleague made the file I'd have to ask what weight means.
  - The edge reads "Gus -> Ivan" with arrows on the drawing. It's a running club; who ran with whom has no direction. Makes me wonder if it's treating my list as one-way, which matters for betweenness.
  - Shift-click to add a second person worked first time, and the "2 nodes selected / edges joining these nodes 1" summary told me nobody else got caught. That's the bit I'd actually trust.
