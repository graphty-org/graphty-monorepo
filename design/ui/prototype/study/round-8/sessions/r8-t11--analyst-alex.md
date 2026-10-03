# Session: change the layout so clusters separate -- Analyst Alex

Task given: "You have never used this program before. You will practice on the ready-made network
of characters from the novel Les Miserables that comes with the program, not on your own data. The
drawing looks crowded in the middle. Try a different way of arranging the dots so the clusters are
easier to tell apart."

Renders: design/ui/prototype/tmp/round-8-sessions/r8-t11--analyst-alex/ (01 is the start screen,
shots/tasks/r8-t11/01.png). All commands were run from design/ui/prototype.

## Steps, thinking aloud

1. Start screen (shots/tasks/r8-t11/01.png).
   "First thing I look for: does my data go anywhere. 'Files are read on this computer and never
   uploaded', plus 'Local only' up top. Good, that's where I load the file, which is where I want
   it. There's a usage-data banner. No thanks. Les Miserables is in Samples, so click that."

2. `timeout 120 node app-b/study.mjs --try .../02.png task:r8-t11 --click "No thanks" --click "Les Miserables"`
   "A lot is already in there: PageRank, Louvain with 6 groups, shortest paths, notes. The drawing
   is the usual hairball, with Valjean in the middle. I'm looking for Layout. In Gephi it's a
   panel on the left. Nothing on the left says Layout. There are five icons at the bottom with no
   labels. The play triangle might be 'run layout', like Gephi's Run button. I'll hover over them."

3. `... --try .../03.png ... --hover "Layout"` -> tooltip "Layout" on the play-triangle icon.
   `... --try .../04.png ... --hover "Run"` -> nothing on screen is called "Run".
   "So the play triangle is 'Layout'. That's an odd icon for it. I'd expect it to start or stop
   something. It needed a hover to find, but OK."

4. `... --try .../05.png ... --click "Layout"`
   "A small Layout box. Motion: Settled, 'Resume layout'. Method: 'Spread Out'. Seed: 7. A seed is
   good, it means I get the same picture next time. Meanwhile the right panel switched to the
   graph summary: 77 nodes, 254 edges, undirected. That matches the Les Mis numbers I know, so I
   trust it a bit more. 'Spread Out' is presumably the force one. I want to change it, so I click
   it."

5. `... --try .../06.png ... --click "Spread Out"`
   "A big list. Spread Out (Recommended), Ring, Grid, Spiral, Natural Grouping, No Crossings,
   Tree, Columns by Group... No ForceAtlas 2, no Fruchterman-Reingold. Everything's renamed, so my
   Gephi tutorials won't map. On the right is a wall of numbers: spring length, gravity, theta,
   drag coefficient, batches in flight. I'm not touching any of those. The Size and Weights
   columns are useful: 'Any' or '2,000', and weights No. And the drawing behind the box went
   blank while it was open, which threw me for a second. 'Natural Grouping' sounds like what the
   moderator asked for, so I pick it."

6. `... --try .../07.png ... --click "Natural Grouping"`
   "It says 'Laid out again: Natural Grouping' with an Undo. Good, I can back out. Engine:
   Spectral. So that's the real name, and I can look it up. The box still covers most of the
   picture though, so I can't judge it. I'll close it."

7. `... --try .../08.png ... --key Escape`
   "Escape did nothing; the box is still open. A tooltip showed instead: 'Rated for up to 2,000
   nodes, ignores edge weights, flat'. I'll click the X."

8. `... --try .../09.png ... --click "Close"`
   "There it is. Distinct clumps now: the students around Courfeyrac, Gavroche and Marius on the
   left; Myriel's group at the top; Valjean and Cosette on the right; Fantine's group below them;
   Javert, Eponine and the Thenardiers at the bottom; one more group bottom middle; a couple of
   loners. Much easier to tell apart than the hairball. Two gripes. Everything is still the same
   orange, because it's colored by PageRank, so I can't confirm these clumps are the six Louvain
   groups without recoloring. And the long lines across the middle make it look like spaghetti.
   The right panel now says Method Natural Grouping, Seed 7, so at least I can write down what I
   did. I'm done."

## Outcome

- Succeeded? Yes. The layout changed and the clusters are clearly separated.
- Single Ease Question: 5 of 7. Finding Layout meant hovering over unlabeled icons, and the play
  triangle is the wrong picture for it. The method list was clear once open, but Escape didn't
  close the box, and the box hid the drawing while I chose.
- Would I use this instead of Gephi for this? For a quick look, maybe. It took about four clicks,
  and there's a seed and an Undo, which Gephi doesn't make obvious. But the method names are
  made up ('Natural Grouping', 'Spread Out'), so I can't tell my director "ForceAtlas 2" or match
  a tutorial. I only found out it was spectral from the small Engine line. For the deck I'd want
  the clumps colored by community in one step, and I'd still compare against Gephi before
  switching.

## Observations for the designers (as experienced, not proposed fixes)

- The Layout control is an icon-only play triangle in the bottom toolbar. It was found only by
  hovering, and the icon reads as "run or start".
- The canvas looked blank or hidden while the method list was open (06), and the dialog covered
  most of the result after the method was picked (07). The participant could not judge the result
  without closing it.
- Escape did not close the Layout dialog (08); only the X did.
- Plain-English method names helped with picking but hid the standard algorithm names this user
  knows. The engine name (Spectral, NGraph Force) was the only bridge.
- The seed shown beside the method, and Undo on the confirmation message, both built trust.
- The node and edge counts on the summary matched what the participant knew, which built trust.
