# Session r1-s27b: Grace, bigger dots for the families that matter (Florentine families)

Participant: Grace, nonprofit operations analyst, first time using the program.
Task: open the ready-made Florentine families network, make the dots bigger for the families the
network depends on most, then say what the sizes and colors stand for.
Start: empty app. Build: graphty@0.8.53, commit 4522851420998602a015e60ae2cbf339049a2c97.

Note: the session waited about 50 minutes for a free browser slot before the first screenshot
appeared. The session ended after step 11, before the task was finished (see "Where it stopped").

## Steps

### 01 -- start (empty)
`--start ... empty` -> 01.png

Saw: a start page with Open project or file, New from data, Recent projects (empty) and four
Samples, Florentine families among them ("15 families ... Good for finding who brokers between
groups"). A usage-data banner at the bottom.
Think-aloud: "Good, it says files are read on this computer and never uploaded. That matters for
donor names. I'll say no to usage data and open the Florentine sample."

### 02 -- decline usage data, open the sample
`--step --click "No thanks" --click "Florentine families"` -> 02.png

Saw: 15 blue dots joined by lines, no names on any dot. The right panel shows Nodes 15, Edges 20.
A bottom bar of icons; the left panel says "Analyze (Shift+A) to add results here".
Think-aloud: "15 families, matches the sample card. No names on the dots, though. To find who
matters I probably need that Analyze thing. The flask looks like it."

### 03 -- open Analyze
`--step --click-at 659,864` -> at 659,864: button "Analyze" -> 03.png

Saw: a list headed "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness,
PageRank (tagged "Start here"), Eigenvector, Katz, HITS, and more, each with a one-line
description.
Think-aloud (hesitation): "These are mostly jargon. 'Which nodes sit on the most shortest paths
between others' sounds like brokers, which is what the sample card mentioned. But PageRank says
'Start here', so I'll trust that."

### 04 -- pick PageRank
`--step --click "PageRank"` -> 04.png

Saw: a small form with "Damping factor 0.85", "Under a second", and a Run button.
Think-aloud: "No idea what damping is. Leaving it alone. Run."

### 05 -- run it
`--step --click "Run"` -> 05.png

Saw: every dot turned orange, with one dark brown dot in the middle. A key in the top left reads
"Color: Influence 0.03066 to 0.1458". The left list gained a row "Influence 15". The dots are
all still the same size. The key covers the dot at the top left of the drawing.
Think-aloud: "So it colored them, not sized them. 'Influence' I understand. Now how do I make
the dots bigger?"

### 06 -- look in Style
`--step --click "Style"` -> 06.png

Saw: Style only has Canvas background, a layout Method ("Force - Recommended") and a Seed.
Nothing about dots.
Think-aloud (dead end): "This is the whole graph's style. Nothing about dot size here."

### 07 -- click the Influence row
`--step --click "Influence"` -> 07.png

Saw: the right panel now belongs to Influence. Values shows a histogram and a "Top 10" list:
Medici 0.1458, Guadagni 0.0984, Strozzi 0.0881, Albizzi 0.07912, Tornabuoni 0.07128, ...
Think-aloud: "This is useful -- an actual list with names. Medici first by a lot. I could paste
this into Excel. Now Style for this one."

### 08 -- Style for Influence
`--step --click "Style"` -> 08.png

Saw: Nodes / Edges tabs. Fill, Color = Influence, then Shape, Effects, Label and Tooltip, each
with a plus button.
Think-aloud: "Size isn't listed. Maybe it's under Shape."

### 09 -- add to Shape
`--step --click-at 1419,226` -> at 1419,226: button "Add to Shape" -> 09.png

Saw: a small menu with "Size" and "Shape".
Think-aloud: "There it is, Size."

### 10 -- choose Size
`--step --click "Size"` -> 10.png

Saw: a new row "Size" with a box showing "1", a small arrow, a chain-link icon and a minus.
The dots did not change.
Think-aloud (hesitation): "It's just the number 1. I want it to follow Influence the way color
does. Maybe the arrow lets me pick Influence."

### 11 -- open the Size list
`--step --click-at 1352,256` -> at 1352,256: button "Open list" -> 11.png

Saw: the box is highlighted and a very thin, empty dropdown appeared under it with no choices.
Think-aloud: "The list is empty. Is the chain-link icon what connects it to the data? Nothing
tells me."

## Where it stopped

The session ended here, after step 11, with every dot still the same size. The chain-link icon
next to Size was never tried.

## Grace's wrap-up

- **Finished?** No. Running "Influence" (PageRank) colored the dots and gave a clear Top 10 list,
  but the dots never got bigger.
- **What the drawing shows now:** color goes from light orange (low) to dark brown (high)
  Influence, 0.03066 to 0.1458; Medici is the darkest. Size means nothing yet -- all the same.
- **Difficulty (1-7):** 5.
- **What confused me:**
  - The analysis list is jargon. "Start here" helped me choose, but I couldn't tell if
    "Influence" is the same as "what the network depends on most".
  - Running an analysis colors the dots, but sizing is a separate, hidden step: Style, then the
    plus next to Shape, then Size.
  - Size shows up as a fixed "1" and its list opens empty. Nothing says how to link size to
    Influence; the chain-link icon is the only hint, and it has no label.
  - No family names on the dots, and the color key covers a dot.
  - Good: "never uploaded" on the start page, and the Top 10 list with names.
