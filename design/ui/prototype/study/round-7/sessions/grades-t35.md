# Grades: walk the drawing from character to character with the keyboard

The task: "Without using the mouse, move from character to character through the drawing and
learn who each one is and how many others they appear with. The data on screen is a sample:
characters of the novel Les Miserables, linked when they appear in the same chapter."

The intended path: Tab until focus is on the drawing, then press Shift and an arrow key. Each
press steps to the next node in that direction, selects it, announces "<name>, <N> connections"
in the line under the drawing, and the right-hand inspector switches to that node (it opens on
the Style tab, "Why this look").

Grading rule: success means focus on the drawing, Shift+Arrow stepping from node to node, each
step announcing the name and the number of neighbors and opening that node's inspector. Success
with difficulty means the same end state, but Shift+Arrow was learned only from the keyboard
shortcuts sheet (the ? key). Failure means the participant pressed plain arrows, saw only the
camera move, and concluded it cannot be done. Grades go by what was on screen at the end and what
the participant concluded, not by how they rated themselves.

## Headline

All three reached the walk, and all three found it the same way: plain arrows said "Arrows orbit
the camera", Tab gave exactly one node, and only the ? sheet named Shift+Arrows. Once found, the
walk did its job: every step showed a new name and connection count, and the inspector header
followed. What it did not do is tell them "who each one is": the inspector's Data tab showed
Valjean's record under every other character's name, for all three. That is a fault of the
prototype (its Data tab for this graph is written for Valjean only), not a design decision, but it
cost the tool every participant's trust and must be fixed before this task is run again.

## Results

| Participant | Their own verdict | Grade | Why |
|---|---|---|---|
| Screen-reader analyst | success with difficulty | success with difficulty | Six Tabs to the drawing, a seventh to Valjean; plain arrows only orbited (06, 07). Found Shift+Arrows on the ? sheet (09), then walked Judge, Valjean, Cochepaille, Gervais, Brevet, each announced with its count (10-14). Ended on Brevet's Data tab showing Valjean's record, label Valjean and degree 36 (17, 18). Concluded correctly that he could move and hear name and count, and that the detail panel was not to be trusted. |
| Criminal intelligence analyst | success with difficulty | success with difficulty | Three dead ends first: plain arrows (05, 09), Tab leaving the drawing after one node (07, 08), the Neighborhood button (14). Found Shift+Arrows on the ? sheet (15) and walked Judge, Valjean, Javert, Marius, Gavroche, each with its count (16-19, 27). 27.png ends on Gavroche, "Gavroche, 22 connections", inspector headed Gavroche. On the way, Marius's Data tab showed Valjean's record (24). |
| Cybersecurity analyst | success with difficulty | success with difficulty | Plain arrows, Enter and Tab first (03-12), then "this is where I'd look for a shortcut list" and ? (13). Walked Judge, Valjean, Brevet, Mlle.Gillenormand, Lt.Gillenormand with counts (14-17, 23); 14.png confirms "Judge, 6 connections" and the inspector headed Judge. Saw Valjean's record under Mlle.Gillenormand on the Data tab (20). Finished in the table (Shift+T, 24), sorted by degree, which she called the way she would really do it. |

Totals: 0 success, 3 success with difficulty, 0 failure, 0 gave up. Ease scores 3, 2, 3 of 7.
Nobody concluded the walk was impossible; nobody found it without the ? sheet.

## Design findings

Severity is Nielsen's 0 to 4. Counts are participants out of 3 who hit or remarked on it.

1. **Shift+Arrows is invisible from the drawing** -- severity 3, 3 of 3. The notice for a plain
   arrow says only "Arrows orbit the camera". All three said that same notice should name the walk
   key. The ? sheet is good (all three praised it), but it is the only way in.
2. **The Data tab shows the wrong person** -- severity 4 as seen, 3 of 3. Heading and the line under
   the drawing name the walked node; the Data tab shows Valjean (label, id 11, degree 36, PageRank
   #1, his bridge edges). Prototype fault: `app-b/sections/inspector-node.js`, `dataTab()`, reads
   the Valjean row whatever node is selected, although the same file already follows the walked
   node for the other sample graphs. Fix it, then rerun the task; until then "who each one is"
   cannot be graded.
3. **The walk's direction cannot be predicted** -- severity 3, 3 of 3. Shift+Right from Valjean
   moved the ring to a node on his LEFT (Judge), and a second Shift+Right came straight back. The
   walk is meant to go to the nearest node in the direction pressed, so this looks like a
   prototype fault too (the node it starts from and the positions it measures from seem to be in
   different orders); check it before treating it as design evidence. Separately, and that one IS
   design: the screen-reader and the cybersecurity analyst asked to walk along links ("the people
   this one is actually linked to, and back"), because screen position means nothing to someone
   who cannot see the layout and says nothing about relationships.
4. **The inspector opens on Style, not Data, and resets on every step** -- severity 2, 3 of 3.
   "I asked who someone is; how they are painted is second." Reaching Data costs F6 three times,
   Tab twice and an arrow per node, and the next step flips back to Style. Note that the success
   path itself ends on "Why this look"; this result questions that choice for this task.
5. **Tab gives exactly one node and leaves** -- severity 2, 2 of 3. It lands on the biggest node
   (Valjean), and the next Tab goes to the toolbar. The screen-reader analyst found the starting
   node sensible; the two others read it as "Tab does not move through the nodes".
6. **F6 region order is hard to follow** -- severity 2, 2 of 3. From the canvas it skipped the
   toolbar; getting back from the inspector took four presses, and three left focus on the graph
   picker, where Shift+Arrow does nothing. The screen-reader analyst found F6 worked as promised.
7. **The announcement cannot be read again** -- severity 2, 1 of 3 (screen-reader). The "Name, N
   connections" line is replaced by the next step and is the only place the count lives while
   walking.
8. **Small inconsistencies that cost trust** -- severity 1, 1 of 3 each. The drawing is flat but
   the notice says the camera orbits, while the ? sheet says arrows pan in 2D. Betweenness reads
   0.419 in the inspector and 0.570 in the table (the inspector's is a sampled run on 60 of 77
   nodes and says so, but she did not notice the scope). The Data tab says "From miserables.json"
   while the graph came from miserables.gexf. The ? sheet heading "Canvas (graphty-element)"
   shows a package name a user does not know.

## What worked

- Once found, the walk itself: one key, a new node, its name and count in plain words (3 of 3).
- The ? sheet as a real dialog, F6 between regions, and buttons named with their keys
  ("Analyze, Shift+A") (3 of 3 praised at least one).
- "Local only" in the top bar and the graph summary up front (2 of 3 noticed unprompted).
