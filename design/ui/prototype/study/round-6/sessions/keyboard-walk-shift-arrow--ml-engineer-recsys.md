# Keyboard walk with Shift+Arrow -- Chris, ML engineer (recommendation systems)

**Participant:** Chris, senior ML engineer who owns candidate retrieval at an online retailer.
Lives in notebooks and VS Code; keyboard-heavy (command palette, Cmd+K). Plays the session at
1440 x 900 in Chrome. Gives an unfamiliar control about 30 seconds, then looks for search or a
shortcut. Reads numbers and labels, skips help text.

**Task as given by the moderator:** "Without a mouse, find Javert, move through the characters he
is connected to, and select two of them."

**What he worked on:** the interactive keyboard-walk screen in participant view (a project called
"Protein interactions", 33 of 300 nodes drawn), driven only with key presses; then a look at the
inspector screen for one node. Ctrl stands in for Cmd in this run.

Renders of what he saw, in order (`../../../shots/r6-chris-kwsa/`):
`01-load.png`, `02-ctrlk-nofocus.png`, `03-tab1.png`, `04-skip-enter.png`, `05-ctrlk.png`,
`06-javert.png`, `07-find-javert.png`, `08-esc-find.png`, `09-f6-a.png` to `13-f6-e.png`,
`14-ctrlf.png`, `15-find-tp53.png`, `16-at-tp53.png`, `17-shift-down.png`, `18-shift-right1.png`,
`19-enter1.png`, `20-shift-right2.png`, `21-enter2.png`, `22-alt-enter.png`, `23-esc-back.png`,
`24-esc-end.png`, `25-keysheet.png`. Also `../../../shots/tasks/keyboard-walk-shift-arrow/02-inspector-one-node.png`.

## Think-aloud

**Page loads (01).** "Same page as last time. 'Protein interactions', 33 of 300. And the moderator
said Javert again. Javert is Les Mis. I'm going to look for him anyway, because maybe search goes
across projects now -- that's what I'd want with my data: type a user id, land on it, wherever it
lives."

"Hands off the trackpad. Cmd+K." *Presses (02).* "Nothing. Still nothing. The palette doesn't exist
until something on the page has focus. In VS Code it works the instant the window is up. That's the
same strike as last round -- first two seconds, same wall."

**Tab (03).** "Tab. 'Skip to the graph drawing. F6 moves between regions.' Enter." *(04)* "Blue
outline on the canvas and the card: 'Graph drawing. Start: TP53, the walk starts here. Degree 32,
rank 2 of 300, DNA repair. Neighbors by Confidence / Degree / Name, O.' Oh -- it says Confidence now,
not Weight. That was my complaint last time. Good, that's the column name. Credit where due."

**Cmd+K, Javert (05, 06).** "Palette opens now that the canvas has focus. Type 'Javert'. One row:
'Find "Javert" -- nodes, sets, styles and more, in Find'. And the footer, 'Enter: Go to selects
nothing. This mock lists the selection and set commands only.' I skip that sentence. Enter on the
Find row (07)."

"'No nodes match "Javert".' Same answer as last round. It still doesn't tell me match against WHAT.
I can hear the screen reader text is supposed to say 'nodes in this graph', but on screen it's just
'No nodes match'. Is that the 33 drawn, the 300 in the file, or every graph in the project? For me
those are three different bugs: filtered out, not drawn, or my join dropped the id. Put the
denominator in the empty state: 'No match in 300 nodes of ppi-core-300'. One line."

"Can I get to another dataset from the keyboard? Esc (08), then F6 a few times (09-13)." "Focus
goes to the hamburger, the Graphs list -- one graph, ppi-core-300 -- the inspector, the help button,
the toolbar. There's no second graph here, nothing called Les Mis. So Javert isn't in this project,
period. Either the moderator has the wrong file or this tool can't reach another project from here.
From my chair it's the same result: I was asked for a node and I can't find it. Find step: failed.
Second round in a row."

"I'll do the rest on the node it keeps pointing me at, TP53, so the walk part gets a fair test."

**Cmd+F, TP53 (14, 15).** "Cmd+F -- and the box is empty, not 'JavertJavert' like last time.
Fixed. Type TP53: 'TP53 -- DNA repair, degree 32'. Degree in the hit row, good, that's what tells me
I picked the right one." *Enter (16).* "Double ring on TP53. Card: 'Walking the drawing. TP53, start
of the walk, degree 32, rank 2 of 300. Nothing selected.' Clear. Nothing got selected just by going
there -- right, I don't want search to mutate my selection."

"The inspector on the right still says 'Protein interactions, Graph' though. I'm standing on TP53
and the panel is about the whole graph. The card has the numbers, so fine, but I'd expect the side
panel to follow what I'm on."

**Shift+Down (17).** "No plain-arrow mistake this time; I remember it pans. Shift+Down. Ring jumps
to PALB2: '1 of 32 from TP53. Confidence 0.98, degree 5, rank 247 of 300.' That's the ego list,
sorted by edge confidence, and it tells me where I am in it. This is the thing I'd print in a
notebook with sorted(G[n].items(), key=...) -- except here I can see where it sits in the picture
at the same time."

"One check: 1 of 32, and TP53's degree is 32, and there are 33 nodes drawn. So the whole 1-hop
neighbourhood is on screen. Good. I'd want it to tell me if some of the 32 were filtered out of the
drawing -- does the walk skip them or go to invisible nodes? Can't tell from this graph."

**Shift+Right (18), Enter (19).** "Next neighbour, RPA1, 2 of 32, confidence 0.95. Enter. 'RPA1,
selected. 1 selected.' Inspector flips to RPA1: module DNA repair, degree 7, #172 of 300. Table
scrolls to RPA1 and highlights the row. Node to row in one keystroke. That's the part I actually
care about."

**Shift+Right (20), Enter (21).** "RAD51, 3 of 32, confidence 0.87. Enter. '2 selected.'
Inspector: '2 selected. module DNA repair, degree Mixed. Selection 2: RPA1 7, RAD51 5.' Task done,
on the wrong character."

"Two nits. The 7 and 5 in the Selection list have no label -- I'm guessing degree because I just
saw it, but on my data that column could be anything; give it a header. And the table still shows
RPA1 highlighted but didn't scroll to RAD51, so the table and the selection disagree about what
I'm looking at. With two rows that's fine; with fifty I'd want 'selected first' or a filter."

**Alt+Enter (22), Esc (23).** "Alt+Enter, inspector for RAD51, degree 5, #247 of 300, and a
'selected' tag. Esc and I'm back in the walk on RAD51, still 3 of 32. That round trip is nice -- in
most tools leaving the canvas loses your place."

**Esc (24).** "Esc ends the walk. 'Walk kept: on RAD51, from TP53. 2 selected.' Selection
survived. Good. I half expected Esc to nuke the selection."

**? (25).** "Key sheet. Shift+Down in, Shift+Right/Left siblings, Shift+Enter back, Shift+Home to
the start, O to re-sort, Enter adds, Space toggles, ] [ jump between selected ones, Ctrl+Z restores
a cleared selection. It's a real keymap. It's the only place Shift+Home is mentioned but I'd find it
here."

**Inspector screen (tasks/02).** "Here the full graph, 300 nodes, TP53 selected. 'Neighbors'
button with the tooltip 'Filter to neighbors, 1 hop: 33 nodes. Ctrl+Z undoes it. Shift+N.' That's
my ego-graph button, with the count before I press it. 'degree 32, counted by graphty, #2 of 300';
'module, from ppi-core-300.graphml'. Provenance on every value. That's exactly the 'is this my
column or yours' question answered. I like this panel more than anything else today."

## After the task

**Single Ease Question (1-7): 3.**

"If you split the task I'd score the walk-and-select a 6 and the find a 1. The keyboard walk
itself is good: search, land, step through the neighbours in a sorted order with the score shown,
select two, see them in the panel and the table. Two of my complaints from last time are fixed --
the sort says Confidence, and Cmd+F doesn't double the text. But the task started with 'find
Javert' and I still couldn't, and the empty result still doesn't tell me what it searched. And
Cmd+K still does nothing on a fresh page. A 3 because the first and last thing I remember is
failing to find the node I was asked for."

**Would he use this instead of his current tool?** "Not instead of. My current tool is a notebook
and networkx on a 2-hop ego graph. For the 'why did retrieval pull this item' session I'd use this
next to the notebook, if two things hold: it loads my edge list with my ids, and search tells me
which set of nodes it looked in. The walk with the edge score on every step is something a
matplotlib plot can't do. But a tool I can't search into on the first keystroke goes back in the
drawer."

## Problems observed

1. **The node the task names is not in the project, again.** No Javert anywhere reachable: one
   graph in the Graphs list, Find returns nothing. The find step failed for the second round
   running. (Severity: high -- task step not completable.)
2. **"No nodes match" gives no scope.** The empty result does not say which nodes were searched
   (drawn, the whole graph, or every graph in the project). (Severity: medium.)
3. **Cmd+K does nothing until something on the page has focus.** Same as last round. (Severity:
   medium for keyboard users.)
4. **The inspector does not follow the walk.** Standing on TP53 without selecting it, the side
   panel still shows the whole graph. (Severity: low.)
5. **Selection list values have no label.** "RPA1 7, RAD51 5" -- the column is not named.
   (Severity: low.)
6. **The table highlights only the first selected row and does not scroll to the second.**
   (Severity: low.)

## What worked

- "Neighbors by Confidence" names the column the walk is sorted by, and each step shows
  "confidence 0.98".
- Cmd+F opens an empty box instead of appending to the old query.
- Go-to and Find land on the node without selecting it.
- Alt+Enter visit to the inspector and Esc back keeps the place in the walk; Esc ending the walk
  keeps the selection.
- The inspector shows provenance per value ("from ppi-core-300.graphml", "counted by graphty")
  and the Neighbors button states its count before it runs.
