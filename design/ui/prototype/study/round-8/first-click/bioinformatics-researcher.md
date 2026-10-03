# First-click transcript: Dr. Chen, computational biologist

Played in character from study/personas/bioinformatics-researcher.md. Each answer looks only at the one
still render named in the prompt. Confidence is 1 (pure guess) to 7 (certain).

## r8-fc01 -- see it working before my own data is ready
Clicked: the "Protein interactions" sample (300 proteins) in the Samples column. Confidence 6.
"If I'm going to look at a sample it might as well be proteins, not a novel. 'Good for hubs' -- we'll
see about that. I'm dismissing the usage-data box first, No thanks."

## r8-fc02 -- bring in my spreadsheet from Downloads
Clicked: "Open project or file..." (Ctrl+O) under Start. Confidence 5.
"'New from data...' is the other candidate and I can't tell the difference from here. A spreadsheet is a
file, so Open file. Or I'd just drag it in -- it says I can drop it anywhere. Good that it says files are
never uploaded."

## r8-fc03 -- which characters the story depends on most
Clicked: the flask (lab beaker) icon at the left end of the floating toolbar under the drawing.
Confidence 4.
"Depends on most -- that's betweenness, not PageRank. The right panel says PageRank came 'from Analyze',
and the flask is the only thing that looks like analysis. There's a Betweenness row already, hidden, but
I want to run it myself and see the parameters."

## r8-fc04 -- pick out the circles that keep turning up together
Clicked: the flask icon in the floating toolbar. Confidence 4.
"There's a 'Louvain, 6 groups' row already, so someone ran it. I'd still go to wherever the methods are
to see what else there is -- MCL, resolution parameter. If the flask isn't it I'd click the Louvain row
next."

## r8-fc05 -- every character's name beside its dot
Clicked: the "+" beside "Label" in the right-hand panel (Everything is selected). Confidence 6.
"Everything is selected, Label has a plus. That's about as obvious as it gets."

## r8-fc06 -- bigger dots for the characters PageRank scores highest
Clicked: the "+" beside "Shape" in the right-hand panel. Confidence 3.
"PageRank is selected and it paints color. I want it on size. There's no 'Size' heading -- I'm guessing
size lives under Shape. Could be Effects. In Cytoscape this is a mapping on the Size property, one line."

## r8-fc07 -- arrange the dots a different way
Clicked: the play (triangle) icon in the floating toolbar. Confidence 2.
"Nothing here says Layout. Play presumably runs the layout again -- that's not what I asked for, I want
a different algorithm, but it's the nearest thing. The cube is probably 3D, which I'm not touching. If
play is wrong I'd try the hamburger menu, Cytoscape has Layout in the menu bar."

## r8-fc08 -- jump straight to Javert
Clicked: the "Javert" label on the drawing, next to Valjean. Confidence 5.
"He's right there. The search box says 'Find rows and notes', not nodes, so I'm not sure it would find
him -- what's a row here? If he weren't labeled I'd have tried the box anyway."

## r8-fc09 -- a picture of the drawing for a slide
Clicked: the hamburger menu (three lines) at the top left. Confidence 4.
"No export button anywhere I can see. File menu equivalent is the hamburger. And it had better give me an
SVG with real text, not a screenshot."

## r8-fc10 -- the numbers for each character in Excel
Clicked: "Table" at the bottom left of the drawing (with Nodes beside it). Confidence 4.
"Open the node table first, then I expect an export in that '...' at the bottom right. This is the
question I ask first with any tool: can I get the measures out as a TSV for R."

## r8-fc11 -- stop now and pick it up tomorrow exactly as it is
Clicked: the hamburger menu at the top left. Confidence 3.
"I want Save. There's no Save button, no 'saved' indicator either. Could be the 'Les Miserables' title
dropdown instead -- that's where a project name usually has save and rename. 'Local only' worries me a
little: does local mean it survives clearing the browser? I'd want a file on disk."

## r8-fc12 -- check the whole file came through
Looked at: the line across the top of the table, "Les Miserables: 77 nodes, 254 edges", then the counts
beside nodes (77) and edges (254) on the left. Confidence 6.
"That's what I read first on any import. The match report says every id is unique, fine. I'd want to
know about self-loops and duplicate edges too -- 'every id is unique' says nothing about edges."

## r8-fc13 -- who this character is directly tied to
Clicked: the target icon (concentric circles) at the left of the small toolbar that appeared above the
main one after selecting Valjean. Confidence 3.
"Target looks like 'neighborhood'. The second icon with the branching lines could be paths, or
neighbors too. In Cytoscape it's 'select first neighbors' from the right-click menu, so I'd also try
right-clicking the node. '36 connections' is shown, I just want them listed."

## r8-fc14 -- replace last month's transfers file with this month's
Clicked: the "..." beside "transfers-2026-03.csv" under Sources. Confidence 5.
"The file is a source, the dots are its menu. I'd expect 'Replace file' there. The '+' would add a
second one, which is not what I want. I'd check the node and edge counts change afterwards."
