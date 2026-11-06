# Session r1-s24 -- Maren (genomics Cytoscape user, returning)

Task: show only the genes in the one big tangle (largest component), and of those only genes with more than one interaction (degree > 1) and gal80Rexp >= 0.5. Hide everything else, delete nothing. Report how many genes remain.

S=/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier5/tmp/studio-sessions/tier5/rounds/round-1/sessions/r1-s24
All commands run as: REAL_DIST=/home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-1e123d7d33 node .../design/ui/studio/tool/real.mjs <args>

## Step 1
Command: --start $S setup:yeast.txt
Saw: yeast network, 331 nodes, 361 edges, 26 components, largest component 249 nodes. Good, it tells me the component count. Last month I used a filter card in the Data place, so I'll go there.

## Step 2
Command: --step $S --click "Data"
Saw: Data place with Data sources, Attributes, and a "Filters" section with a plus. That's where my filter card was last month. Clicking the plus next to Filters.

## Step 3
Command: --step $S --click-at 275,333
Saw: a filter editor, "Filters 331 of 331", a Value... list with my columns (gal80Rexp -1.373 to 3.126, Degree) and computed things (Betweenness). First the big tangle -- in Cytoscape I'd select the largest connected component. Let me search the list for "component".

## Step 4
Command: --step $S --click "Find attributes, results" --type "component"
Saw: options "Connected components: Piece", "Piece size", and under Structure "Largest component". That's the one -- it matches the 249 I saw on the Graph tab.

## Step 5
Command: --step $S --click "Largest component"
(Tool said the name was ambiguous; I meant the list option.)
Command: --step $S --click "role=option:Largest component"
Saw: "249 of 331 nodes, 298 of 361 edges" at the top, 82 "No match" greyed out. Good, it agrees with the Graph tab. Now I need to narrow further. There's "Condition..." and "Or..." -- I want AND, so "Condition...".

## Step 6
Command: --step $S --click "Condition..."
Saw: a new "Value..." row nested under Largest component, and the list again. "Degree" is there -- more than one interaction means degree 2 or more. Picking Degree.

## Step 7
Command: --step $S --click "role=option:Degree"
Saw: Degree, "By value", a histogram with a range slider 1 to 18 and two boxes. I'll set the low end to 2 by typing in the first box.

## Step 8
Command: --step $S --click-at 1203,304 --key Control+a --type "2" --key Tab
Saw: "Degree min 2", now 170 of 331 nodes, 219 edges. Dropped from 249 so it is ANDed with the big tangle. Now the expression cutoff: another Condition... for gal80Rexp.

## Step 9
Command: --step $S --click "Condition..."
Saw: third row "Value..." under Degree min 2, list open again. Picking gal80Rexp.

## Step 10
Command: --step $S --click "role=option:gal80Rexp"
Saw: gal80Rexp histogram -1.373 to 3.126, boxes show -1.37 and 3.13, plus a chip "Not measured: 2". Nice that it tells me 2 genes have no reading. Setting the low end to 0.5.

## Step 11
Command: --step $S --click-at 1203,304 --key Control+a --type "0.5" --key Tab
Saw: "gal80Rexp min 0.5", now 24 of 331 nodes, 4 of 361 edges; No match 307. Table shows values 0.647, 0.593... all above 0.5. Clicking Done to keep the filter.

## Step 12
Command: --step $S --click "Done"
Saw: back on the network. Top bar "24 of 331 nodes, 4 of 361 edges". Right panel: "Nodes showing 24 of 331", "Full graph Nodes 331, Edges 361" -- so nothing was deleted, the rest is just out of the picture. The filter card lists Largest component / Degree min 2 / gal80Rexp min 0.5, which is almost a methods line. I'm done.

## End (in character, Maren)

Did I finish? Yes. 24 genes are still in the picture (24 of 331 nodes, 4 of 361 edges); the full network is still 331 nodes / 361 edges, nothing deleted.

Ease: 6 of 7.

What went well: "Largest component" was right there when I searched "component", and the count (249) matched the Graph overview, so I trusted it. Each condition I added showed the running count straight away (249 -> 170 -> 24) and how many had "No match". The "Not measured: 2" chip on gal80Rexp is exactly the kind of count I want -- it tells me data is missing instead of hiding it. The finished card reads like a filter chain in Cytoscape, and the parameters are written down for me.

What confused me / would bother me:
- "Condition..." vs "Or..." -- I guessed Condition means AND. I only knew it was AND because the count dropped. A plain "And" label would have saved the guess.
- The picker list mixes my columns, "Find groups" and "Rank nodes and edges"; "Largest component" sits under "Structure" while "Connected components: Piece" sits under "Find groups". Two names for nearly the same thing.
- After applying, the Degree box on the right now shows 0 to 2 (degree inside what is showing), while my filter used degree in the whole network (min 2). Most of my 24 genes show degree 0 there. I know why, but a reviewer looking over my shoulder would ask "you said more than one interaction -- why are they unconnected?" It doesn't say which network that degree is counted in.
- I wasn't sure whether "Not measured" genes were in or out at the 0.5 cutoff; I assume out, but it didn't say.
- The layout spreads 24 dots across the whole old canvas; I'd want a re-layout or a fit for a figure.

Would I use it? For exploring and cutting a hairball down, yes, this was faster than a Cytoscape filter chain. The figure for the paper would still go through Cytoscape because that is what my PI and the reviewers know.

## Follow-up

Facilitator: On a scale from 1 (calm: you knew what to do next) to 7 (overwhelming: you wanted to walk away), how did the program feel while you did this? Say the number. Then name the moment you were least sure where to look or what to do next, and what was on the screen.

Maren: 2. Mostly calm -- every step showed me a running count, so I always knew whether the last thing had worked. The moment I was least sure was right after I picked "Largest component" (step 5). The filter editor showed "249 of 331 nodes, 298 of 361 edges" at the top, the 82 "No match" genes greyed out in the table, and under my one row two buttons: "Condition..." and "Or...". I needed AND and there was no button called And. I guessed "Condition..." meant "and also", clicked it, and only believed it when the count dropped from 249 to 170. If it had gone up I'd have had to undo and work out what "Condition" was supposed to mean. A smaller wobble came at the end: back on the network the Degree box on the right read 0 to 2 and most of my 24 genes showed degree 0, and for a second I wondered whether my "degree min 2" had been applied at all -- until I worked out it was counting degree inside what is showing, not in the whole network.
