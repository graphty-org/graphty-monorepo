# Session: Cytoscape holdout (Renata) -- look at the Louvain coloring alone, then restore

Task as given: "The Les Miserables network is open (example data, not your own), and several
results color it at once. Look at the coloring from the circles of characters by itself for a
moment, without deleting or changing anything else, then put things back as they were."

Renders: design/ui/prototype/tmp/round-8-sessions/r8-t33--cytoscape-holdout/ (01 is the start
screen, shots/tasks/r8-t33/01.png).

## Step 1 -- start screen (shots/tasks/r8-t33/01.png)

Think-aloud: "Everything's orange-to-brown, and the legend card says PageRank. So PageRank is
winning on Color. 'Circles of characters' -- that's community detection, and the only clustering
I see in this list is Louvain, 6 groups. In Cytoscape I'd just switch Styles in the dropdown, or
if it's all one Style, I'd make a copy and strip the other mappings. Neither of those is 'without
changing anything'. There are eye icons on some rows -- Betweenness is crossed out, so that's
visibility. I could turn off PageRank, but there are also paths, a top-9, a watchlist, two groups
-- that's a lot of eyes to flip and then remember. Let me look at Louvain first."

## Step 2 -- click the Louvain row

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t33 --click "Louvain"

The tool said two controls match ("Louvain" at the bottom tab bar, and the list row) and clicked
the tab. Retried on the row:

    timeout 120 node app-b/study.mjs --try .../02.png task:r8-t33 --click "Louvain, 1 note"

Think-aloud: "Right panel: Louvain, 'Paints 77 nodes', and 'Covered by PageRank for Color on 77 of
77'. Good -- that's honest, it tells me exactly why I can't see it. Cytoscape would never tell me
a mapping was being overridden by a bypass; I'd find out by squinting. But it doesn't tell me how
to see it alone. There's a three-dot on the row."

## Step 3 -- the row's three-dot menu

    timeout 120 node app-b/study.mjs --try .../03.png task:r8-t33 --click "Louvain, 1 note" --click "More actions"

Think-aloud: "Long menu. Rerun, run as copy, compare, restore the suggested look, lay out by
these groups, lock, remove from list view, 'Show only this row' with Alt+Space, add note, delete.
'Show only this row' -- that's what I want. 'Row' is an odd word for a coloring; I think of it as
a mapping, not a row. But it's the one that reads like 'solo'. Not touching 'Restore the suggested
look', that sounds like it'd change something."

## Step 4 -- Show only this row

    timeout 120 node app-b/study.mjs --try .../04.png task:r8-t33 --click "Louvain, 1 note" --click "More actions" --click "Show only this row"

Think-aloud: "There it is. Six communities, legend card switched to 'Color: Louvain' with node
counts per community -- 25, 17, 10, 10, 9, 6. That adds up to 77. Fine. Every other row went gray,
the Louvain row says 'only', and at the bottom: 'Showing only Louvain. Show all'. That's clear,
and I like that it's one obvious way back.

One thing I don't like: the right panel still says 'Covered by PageRank for Color on 77 of 77'
while I'm looking at Louvain uncovered. Which is it? It's describing the stack, not the screen, I
suppose, but on a projector a student will ask me why it says covered when it plainly isn't."

## Step 5 -- Show all

    timeout 120 node app-b/study.mjs --try .../05.png task:r8-t33 --click "Louvain, 1 note" --click "More actions" --click "Show only this row" --click "Show all"

Think-aloud: "Back to orange. PageRank on top, legend says PageRank again. Betweenness is still
crossed out -- good, it didn't switch on something that was off before; that's what I'd have
checked first. '1 row not listed still paints' is back too. Same as the start screen as far as I
can tell. The Louvain tab at the bottom was there at the start, so that's not my doing."

## Outcome

- Succeeded: yes. Saw the Louvain coloring alone and returned to the original state, with the
  hidden Betweenness row left hidden.
- Single Ease Question: 6 of 7. Finding it took one guess (the three-dot menu); the label "row"
  for a coloring and the contradictory "Covered by PageRank" note while soloed cost me the 7th
  point.
- Would I use this instead of Cytoscape? "For this, yes, it's better -- Cytoscape has no solo for
  a mapping at all; I'd be duplicating a Style and deleting mappings, then hoping I switched back
  to the right one. And it told me PageRank was covering Louvain, which Cytoscape never would.
  But that's a teaching nicety. Client work still needs my Styles imported and my sessions
  reopened, and nothing here shows me that yet. Workshop, first hour: maybe."

## Problems noted

1. While Louvain is shown alone, the inspector still reads "Covered by PageRank for Color on 77 of
   77", which contradicts the canvas. (severity 2)
2. "Show only this row" calls a coloring a "row"; a Cytoscape user thinks of it as a Style or
   mapping, and the solo action is buried in a 15-item menu rather than next to the eye icon.
   (severity 2)
3. The name "Louvain" is shared by the list row and a bottom tab, so a click on the name can land
   on the tab instead of the row. (severity 1)
