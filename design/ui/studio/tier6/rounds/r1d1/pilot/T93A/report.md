# Pilot of tier 6 task T93A: taking people out of volunteers.graphml with the Assistant

Targeted re-pilot on build 3549e11129 from .study-builds/tier6-r1d1-3549e11129, 1440 x 900, started
from `setup:connected-volunteers.txt` on every walk (file open, Assistant connected, panel closed).
Screenshots and step files are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T93A/ (shortened to
`T93A/` below). The data stayed the 24 volunteers and 63 edges until a removal, and the end counts in
each walk's `data.json` are the ones the screen stated.

Result: reached. Nothing asked for was skipped, and no script error or failed request was printed on
any walk. The success path matches the answer key. The defects this pass was walked for are gone: every
card's chip agrees with its title, Keep them keeps the people, and the words beside a request or a
question stay in the turn. One thing could still spoil a grade: after a decline, the model answered a
plain request to remove by hiding (below).

Walked, as this pass asked: the success path and the three touched routes that belong to T93A. This
pass did not ask for a keyboard walk, so none was run; the routes in the list that belong to other tasks
are those tasks' own.

## Routes walked

### Success path by pointer (T93A/success, also the touched route "T93A success path")

The replay of the earlier walk matched all 7 steps. Assistant on the rail (02); typed the request,
Enter; the reply stated 7 people and 32 edges, and the section above the composer read "Remove 7 nodes
and 32 edges?", "Undo can bring them back.", one 7 chip, Remove, Change this, Keep them (03). Hovering
the chip ringed seven nodes and changed nothing (04). Remove: 17 nodes, 31 edges, the scope line 17 and
31, "Removed 7 nodes and 32 edges" with Undo, and the reply read beside the request still there above
the new one (05). Steps read Query data, Edit data (06). Data place: 17 and 31 (08). `data.json`: 17
nodes, 31 edges. Four steps, as the key says. 4 model calls.

### Touched route: the card's chip (T93A/touched-12)

The request naming Marisol's three. The model asked first: 7 in all, 3 of them untrained, with two
options (03). Escape in the composer changed nothing (04). Answered all 7: the question's words stayed in
the first turn with its 7 chip and Show in table, and the card came (05). The card had one chip, 7; no
edge chip, nothing disagreeing with the title. Hover ringed seven nodes and changed no scope (06). Click:
inspector "7 nodes selected", phone "0 of 7 have a value", scope line Selection 7 with its x (07). Remove
with that selection on: 17 and 31, the first turn's chip now "Not in this graph" (08). `data.json`: 17
nodes, 31 edges, no filter, nothing selected. The session was ended while the closing reply was still
being sent; the graph had already changed.

### Touched route: Change this and Keep them (T93A/touched-20)

Same request; the question had three options this time (03). Answered all 7: the reply named the seven
of the answer key, and the card came with the 7 chip alone (04). Change this: the turn kept that reply,
added "The permanent removal was not approved", "Declined. Nothing changed.", focus in the composer, 24
and 63 (05). Typed "Remove everyone with no phone number from the network": no card; the reply read "I
hid the 7 people", "Filtered to 17 of 24 nodes", Undo, scope line "7 hidden" (06; defect 1). Undo: 24 and
63, the row reads Undone, notice "Undid Remove everyone with no phone number from the network." (07).
Typed "Take them out of this network for good, not just hide them.": the card again, 7 chip alone, Jump
to newest over the transcript (08). Keep them: "Declined. Nothing changed.", 24 and 63, no "hidden" on
the scope line, no filter (09, 10). `data.json`: 24 nodes, 63 edges, 24 and 63 visible, no filter. The
"If kept" row of the key held; the model did not hide anyone after Keep them on this walk.

### Touched route: answering the question (T93A/touched-21)

Same request, 8 steps; the question with three options and a 7 chip with Show in table (03). Chose the
3 untrained: removed at once with no card, as the key says: "Removed 3 nodes and 16 edges", 21 and 47,
with Undo (04). The reply named Leo Novak, Ivan Petrov and Zara Ahmed. The question's words stayed in the
first turn, so "There are 7 people" is still readable, and its chip now reads 4: the four still there.
`data.json`: 21 nodes, 47 edges.

## Defects

1. After a decline, "remove" became a hide with no request. Following Change this, "Remove everyone with
   no phone number from the network" was answered by a filter, with no card: 17 of 24 drawn. A reader who
   wanted them out does not get what was asked, and the key grades "hiding them and reporting them gone"
   as F. The screen is honest about it (the words "I hid", the change line, "7 hidden" on the scope line,
   the inspector still 24 and 63), and asking "for good, not just hide them" brought the card back, so it
   does not block the task. One walk, one occurrence; the model's choice, not a control's. Route:
   touched-20. Screenshot: T93A/touched-20/06.png.

Seen and not spoiling a grade, left for the backlog: the Jump to newest pill lost its box and lay over the
transcript's text just after Keep them, while the card was going (touched-20/09.png; it had its box in
08); in touched-21/04.png the first turn reads "7 people" beside a 4 chip with nothing saying what the 4
counts.
