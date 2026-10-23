# Session r3-s23 -- Grace, T9 A (Les Miserables)

Task: make the dots bigger for the characters the network depends on most, then say what sizes and colors mean.

## Step 1

Command: `node tool/real.mjs --start rounds/round-3/sessions/r3-s23 empty`
Saw (01.png): a start page. Left: "Open project or file...", "New from data...", a reassuring line "Files are read on this computer and never uploaded." Right: Samples, Les Miserables (77 characters) is first. A banner at the bottom asks to share usage data.
Grace: Good -- it says nothing is uploaded, I like that. I don't want to share usage data; I'll say no thanks, then open the Les Miserables sample.

## Step 2

Command: `--step --click "No thanks"`
Saw (02.png): the banner is gone; the start page remains.
Grace: Now the Les Miserables sample.

## Step 3

Command: `--step --click "Les Miserables"`
Saw (03.png): the network drawn, all dots the same blue and same size. Right panel: 77 nodes, 254 edges, density, components. Bottom left a hint: "Analyze (flask icon) in the toolbar (Shift+A) to add results here". A toolbar under the drawing with a flask icon.
Grace: 77 matches the 77 characters on the sample card -- good. I need the program to work out who matters most; the hint says "Analyze" is the flask. I'll click the flask.

## Step 4

Command: `--step --click-at 680,864`
Saw (04.png): a list "Rank nodes and edges": Degree, Betweenness, Edge betweenness, Closeness, PageRank (with a "Start here" badge), Eigenvector, Katz, HITS, All-pairs distance, ... each with a one-line description.
Grace (hesitated): Lots of jargon. "Depends on most" -- Betweenness's line ("sit on the most shortest paths between others") sounds close, but I don't know what a "shortest path" means here. PageRank says "Start here" and "connected to other well-connected nodes", which sounds like "who matters". I'm new, so I'll trust the "Start here" badge.

## Step 5

Command: `--step --click "PageRank"`
Saw (05.png): a PageRank form: "Damping factor 0.85", "Weight None", "Advanced", "Under a second", and a blue Run button.
Grace: "Damping factor" means nothing to me; I'll leave the defaults and press Run.

## Step 6

Command: `--step --click "Run"`
Saw (06.png): all dots turned shades of orange; a key at top left "Color: PageRank 0.003299 -- 0.07543". A new row "PageRank 77" in the left list. Dot sizes look the same as before.
Grace: So it colored them, darker for more important I guess, but the dots did not get bigger. The task wants bigger dots. I'll click the PageRank row on the left to see what I can do with it.

## Step 7

Command: `--step --click "PageRank"`
Saw (07.png): right panel now "PageRank -- Measure from PageRank, Oct 7", Style tab: Nodes/Edges; Fill (+), Color = PageRank (-), Shape (+), Effects (+), Label (+), Tooltip (+).
Grace (hesitated): No "Size" anywhere. Size is probably part of "Shape"? I'll try the + next to Shape.

## Step 8

Command: `--step --click-at 1420,234`
Saw (08.png): a small menu: "Size", "Shape".
Grace: There it is -- Size. Click it.

## Step 9

Command: `--step --click "Size"`
Saw (09.png): a "Size by attribute" popup: Fixed size; under PageRank: "PageRank", "PageRank rank", "PageRank percentile"; greyed out: id, name ("Holds groups, not amounts").
Grace (brief hesitation between "PageRank" and "PageRank rank"): plain "PageRank" is the score itself, so bigger score = bigger dot. I'll pick that.

## Step 10

Command: `--step --click-at 1195,416`
Saw (10.png): the dots now differ in size -- one very big dark dot in the middle, a second big one lower left, a few medium ones. The key at top left now has two rows: "Size: PageRank 0.003299 -- 0.07543" (a grey wedge) and "Color: PageRank 0.003299 -- 0.07543" (light to dark orange). In the Style panel a new row "Size: 1 to 3".
Grace: That's it. Both the size and the color now show the PageRank score: the bigger and darker the dot, the more the network leans on that character. The middle one is clearly the main one.

## End

Command: `node tool/real.mjs --end rounds/round-3/sessions/r3-s23`

## Debrief (in character)

- Finished: yes. The sizes stand for each character's PageRank score (how well connected they are to other well-connected characters -- my reading of "how much the network depends on them"), from 0.003299 for the smallest dot to 0.07543 for the biggest. The colors stand for the same PageRank score: light orange is low, dark brown is high. So size and color say the same thing twice.
- Ease: 5 out of 7.
- What went well: the hint at the bottom left pointed me straight at the Analyze button; the "Start here" badge saved me from choosing among nine jargon names; the result colored the drawing by itself and the key at the top left says plainly what color and size mean, with the low and high numbers.
- What confused me / where I hesitated:
    - The list of analyses is jargon (Betweenness, Eigenvector, Katz, HITS). Nothing says "most important" or "depended on most" in plain words. I went with "Start here", but I am not sure PageRank is the right answer to "depends on most" -- Betweenness's description sounded closer, and I could not tell which a board would expect.
    - Running the analysis colored the dots but did not make them bigger, so I had to go looking for size myself.
    - Size was hidden under "Shape" behind a + button; I only guessed it was there. I expected a "Size" row I could see right away.
    - In the size list, "PageRank", "PageRank rank" and "PageRank percentile" are three choices with no explanation of the difference.
    - The key's numbers (0.003299 to 0.07543) mean nothing to me; I could not explain them to a board beyond "higher is more central".
    - Nothing told me who the biggest dot is; there are no names on the drawing.
