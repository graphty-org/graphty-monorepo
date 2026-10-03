# Session: size the Les Miserables characters by how much the network depends on them

Participant: Morgan Reyes, blind data analyst who works by screen reader and keyboard
(persona file: study/personas/screen-reader-analyst.md).

Task as given by the moderator: "You have never used this program before. You will practice on
the ready-made network of characters from the novel Les Miserables that comes with the program,
not on your own data. Make the drawing show which characters the network depends on most: the
more it depends on a character, the bigger that character's dot. Leave the colors as they are."

Start screen: shots/tasks/r8-t09/01.png. Renders of each step are in
tmp/round-8-sessions/r8-t09--screen-reader-analyst/.

Outcome: failure (gave up after two dead ends in a row). SEQ 2 of 7.

## Think-aloud, step by step

All commands were run from design/ui/prototype. `$OUT` stands for
`/home/apowers/Projects/graphty-monorepo/.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/tmp/round-8-sessions/r8-t09--screen-reader-analyst`.

### 1. Start screen (01.png, given)

"Page title: graphty. Groups called Start, Recent projects, Samples. 'Files are read on this
computer and never uploaded' -- that's the first thing I ask, and it answered before I asked. Good.
There's a banner wanting an answer about usage data. No thanks. Les Miserables, 77 characters,
is in Samples."

### 2. Open the sample (02.png)

    timeout 120 node app-b/study.mjs --try $OUT/02.png task:r8-t09 --click "No thanks" --click "Les Miserables"

"It opened onto a list headed Graph with a lot already in it: PageRank, Louvain, Shortest paths,
Density, Link prediction, a Watchlist, and a folder 'For the report' with a Betweenness row in it.
The task says 'which characters the network depends on most'. That's betweenness to me: who the
shortest paths run through. PageRank is the row that's selected, and it paints color. I'm told to
leave color alone, so I don't touch PageRank."

### 3. Open Betweenness (03.png)

    timeout 120 node app-b/study.mjs --try $OUT/03.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness"

"Betweenness: 'Measure, from Analyze'. 'Covered by PageRank for Color', with a 'Move above'
button. 'Paints 77 nodes, none visible.' Fill, Color, Yellow to orange. Then Shape, Effects,
Label, Tooltip, each with a plus. No Size. Size has to be under Shape. I don't want 'Move above'
-- that would put its yellow over PageRank's colors."

Note: betweenness is computed but I have no idea how. Normalized or raw? Weighted -- the graph
summary later says the edges have a weight? Nothing here tells me.

### 4. Activate the word "Shape" (04.png)

    timeout 120 node app-b/study.mjs --try $OUT/04.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Shape"

"Nothing. The heading is not a control, or it is and does nothing. Silent either way."

### 5. Look for the plus by name (05.png)

    timeout 120 node app-b/study.mjs --try $OUT/05.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness" --hover "Add shape"

"Nothing called 'Add shape'."

### 6. Guess "Size" (06.png)

    timeout 120 node app-b/study.mjs --try $OUT/06.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Size"

"Whatever I hit, it was not what I meant. The right panel jumped to the whole graph, and a message
says 'Selection cleared (Betweenness)' with a 'Bring it back' button. The screen changed under me
and I lost my place. I'll grant it this: the panel I landed on is the summary I always want first
-- 77 nodes, 254 edges, undirected, weighted, density 0.0868, one connected component, average
degree 6.60, highest 36. Said in words. That part is right. But I didn't ask to go there."

### 7. Find the plus by tabbing (07.png)

    timeout 120 node app-b/study.mjs --try $OUT/07.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness" --hover "Add"

"Tabbing through: 'Add to Shape', 'Add to Effects', 'Add to Label', 'Add to Tooltip'. Named. Fine."

### 8. Add to Shape (08.png)

    timeout 120 node app-b/study.mjs --try $OUT/08.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Add to Shape"

"A menu: Shape, Size."

### 9. Size (09.png)

    timeout 120 node app-b/study.mjs --try $OUT/09.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Add to Shape" --click "Size"

"Size, edit box, 1. A fixed number. Every dot the same size, which is the opposite of the task.
There's an icon after the box and a minus after that. The icon must be how you tie size to a
value."

### 10-15. Learn the icon's name (10.png to 15-Remove.png)

    timeout 120 node app-b/study.mjs --try $OUT/10.png task:r8-t09 ... --click "Size" --hover "Size from"
    timeout 120 node app-b/study.mjs --try $OUT/11.png task:r8-t09 ... --click "Size" --hover "data"
    timeout 120 node app-b/study.mjs --try $OUT/12.png task:r8-t09 ... --click "Size" --hover "Size"
    for n in value column; do timeout 120 node app-b/study.mjs --try $OUT/13-$n.png task:r8-t09 ... --click "Size" --hover "$n"; done
    for n in Use Bind; do timeout 120 node app-b/study.mjs --try $OUT/14-$n.png task:r8-t09 ... --click "Size" --hover "$n"; done
    for n in attribute measure Remove; do timeout 120 node app-b/study.mjs --try $OUT/15-$n.png task:r8-t09 ... --click "Size" --hover "$n"; done

(each "..." is `--click "No thanks" --click "Les Miserables" --click "Betweenness" --click "Add to Shape"`)

"With a screen reader I'd have tabbed once past the box and heard it: 'Size by attribute'. The
minus is 'Remove Size'. Both named. 'Attribute' is not my word for a computed measure, but fine."

### 16. Size by attribute (16.png)

    timeout 120 node app-b/study.mjs --try $OUT/16.png task:r8-t09 ... --click "Size" --click "Size by attribute"

"A popup, 'Size by attribute', Source, 'Pick an attribute'. A list: under 'nodes', betweenness
and degree, and 'Not a number (2)'; under 'Results', PageRank and 'Not a number (1)'; under
'Notes', Note count. Betweenness is under 'nodes', lowercase, not under 'Results' where PageRank
is. My row says 'Betweenness, Measure from Analyze'. Are those the same numbers? One came with the
file and one was computed? I can't tell them apart and I won't guess -- but there's only one
betweenness here, so I take it."

### 17. Pick betweenness (17.png)

    timeout 120 node app-b/study.mjs --try $OUT/17.png task:r8-t09 ... --click "Size by attribute" --click "betweenness"

"'Size by betweenness'. Scale Linear. Sizes 0.5 to 3, px. Values from: Fit to data, Percentiles,
Typed. Clamp, checked. Below 0: sized by absolute value. Smallest mark 2 px, print 1 pt. And a
Detach button. The box I came from said 1 with no unit, this says 0.5 to 3 px, and the smallest
mark is 2 px -- which is bigger than 0.5. Three ideas of size in one popup. I leave the
defaults. 'Detach' I would not press; I don't know what it detaches from what."

### 18. Close with Escape (18.png)

    timeout 120 node app-b/study.mjs --try $OUT/18.png task:r8-t09 ... --click "betweenness" --key Escape

"Focus came back to 'Size by attribute'. Good, I'm where I was. But the Size field still reads
'1'. Nothing in the panel says betweenness. Did Escape cancel, or keep it and not say?"

### 19. Again, close with the close button (19.png)

    timeout 120 node app-b/study.mjs --try $OUT/19.png task:r8-t09 ... --click "betweenness" --click "Close"

"Same. 'Size, 1'. Whatever I chose left no trace I can read."

### 20. The row's visibility switch (20.png)

    timeout 120 node app-b/study.mjs --try $OUT/20.png task:r8-t09 --click "No thanks" --click "Les Miserables" --click "Betweenness" --hover "Show"

"Earlier it said 'none visible', and there's an icon after Betweenness in the list. It's 'Show
Betweenness', with 'Alt-click or Alt+Space: show only this row'. So the row was switched off."

### 21. Bind size, close, show the row (21.png)

    timeout 120 node app-b/study.mjs --try $OUT/21.png task:r8-t09 ... --click "Size by attribute" --click "betweenness" --click "Close" --click "Show Betweenness"

"The switch says shown now. The panel still says 'Paints 77 nodes, none visible'. Size still '1'.
The key at the top of the drawing says 'Color: PageRank, 0.00330 to 0.0754' and nothing about
size. Two dead ends in a row: a choice that leaves no trace, then a switch that changes nothing I
can read. I use my one question: 'Did the dots change size?' The moderator's answer: no, every dot
is still the same size. I stop."

## After the task

**Did I succeed?** No. I believe I told it to size by betweenness, but nothing I can read says it
took, and the person looking at the screen says the dots did not change. Colors I did leave alone,
which is the only part I'm sure of.

**Single Ease Question:** 2 of 7.

**Would I use this instead of NetworkX?** Not for this. In NetworkX, `betweenness_centrality(G)`
gives me the numbers and tells me in the docs that they're normalized; I can hand a colleague the
list and they draw the figure. Here, betweenness was already computed but I could not find out how
(normalized? weighted, given the summary says the edges are weighted?), and setting the size left
no text trace -- the field went on saying "1". What I'd keep: the graph summary panel (counts in
words, first, without running anything), the local-only promise up front, the named "Add to ..."
and "Show Betweenness" buttons, and focus returning to where I was after the popup closed.

## What went wrong, in my words

1. Size bound to a value still reads as "Size, 1" afterwards. "Don't take my choice and throw it
   away. Tell me what the size comes from now."
2. The row said "none visible" and was switched off, and nothing in the size popup warned me that
   whatever I set there would not show. I found the switch only because I remembered a phrase from
   two screens back.
3. After showing the row it still said "none visible". Either the text is stale or the drawing is.
4. The key at the top of the drawing names color only. If size meant something, that is where I'd
   expect to hear it.
5. Two "betweenness" things: the row "Betweenness, from Analyze" and the source "betweenness" under
   "nodes". I cannot tell whether they are the same numbers.
6. No definition of betweenness anywhere I looked: normalized or raw, weighted or not.
7. "Shape" heading reads like a control and does nothing; the plus beside it is the control.
8. Size units: a bare "1", then "0.5 to 3 px", then "smallest mark 2 px". I could not say how big
   a dot will be.
9. A wrong guess cleared my selection and jumped the panel to another object. "Bring it back"
   saved me, but the jump itself is the kind of screen change I fear.
