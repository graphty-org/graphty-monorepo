# Pilot of tier 6 task T93A: taking people out of volunteers.graphml with the Assistant

Targeted re-pilot on frozen build 48879618c4 from .study-builds/tier6-r1d1-48879618c4, 1440 x 900,
started from `setup:connected-volunteers.txt` on every walk (file open, Assistant connected, panel
closed). Screenshots and step files are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T93A/ (shortened to
`T93A/` below). The walks of the earlier build 3549e11129 now sit under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1-build-3549e11129/pilot/T93A/.
The data stayed the 24 volunteers and 63 edges until a removal, and the end counts in each walk's
`data.json` are the ones the screen stated.

Result: reached. Nothing asked for was skipped, and no script error or failed request was printed on
any walk. The success path matches the answer key. Nothing crashed, blocked the task or gave a wrong
result that would spoil its grading. The hide after a decline that the earlier build showed did not
come back: the same plain message brought the request.

Walked: the success path and the three touched routes that belong to T93A. No keyboard route of T93A
is on the list, so no keyboard walk was run; the other routes on the list are other tasks' own.

## Routes walked

### Success path by pointer (T93A/success, also the touched route "T93A success path")

The replay of the earlier walk matched all 7 steps. Assistant on the rail (02); typed the request,
Enter; the reply named the key's seven and stated 32 edges, and the section above the composer read
"Remove 7 nodes and 32 edges?", "Undo can bring them back.", one 7 chip, Remove, Change this, Keep them
(03). Hovering the chip ringed seven nodes and changed nothing (04). Remove: 17 nodes, 31 edges, the
scope line 17 and 31, "Removed 7 nodes and 32 edges" with Undo, and the reply read beside the request
still there above the new one (05). Steps read Query data, Edit data (06). Data place: 17 and 31 (08).
`data.json`: 17 nodes, 31 edges, no filter. Four steps, as the key says. 4 model calls.

### Touched route: the card's chip (T93A/touched-12)

The request naming Marisol's three, replayed by hand from its second step, where the model's wording
differed. The model asked first: 7 in all, 3 of them untrained, three options, no chip row on this
walk (03). Escape in the composer changed nothing and left the cursor there (04). Answered all 7: the
question's words stayed in the first turn, and the card came with the 7 chip alone, 24 and 63 (05).
Hover ringed seven nodes and changed no scope (06). Click: inspector "7 nodes selected", phone "0 of 7
have a value", scope line Selection 7 with its x (07). Remove with that selection on: 17 and 31,
"Removed 7 nodes and 32 edges" with Undo, scope line Whole graph (08). `data.json`: 17 nodes, 31 edges,
no filter, nothing selected. 8 model calls.

### Touched route: Change this and Keep them (T93A/touched-20)

Same request, replayed by hand from its second step. The model took 8 steps (03, 04) and asked: 7 with
no phone, 3 of them untrained, three options (04). The steps opened: reads of 7, "No matches for
Marisol.", 7, and last 9 (05). Answered all 7: the question's words stayed, and the card came with the
7 chip alone (06). Change this: the turn kept the reply, added "was held for approval and declined",
"Declined. Nothing changed.", focus in the composer, 24 and 63 (07). Typed "Remove everyone with no
phone number from the network": the request came again, title and chip agreeing, Jump to newest over
the transcript (08). The earlier route's Undo and second message had nothing to act on, since nothing
was hidden. Keep them: 24 and 63 (09). Jump to newest: "Declined. Nothing changed.", no "hidden" on the
scope line (10). `data.json`: 24 nodes, 63 edges, 24 and 63 visible, no filter. The key's "If kept" row
held. 14 model calls.

### Touched route: answering the question (T93A/touched-21)

Same request, 4 steps; the question with three options, no chip row (02). Chose the 3 untrained:
removed at once with no card, as the key says: "Removed 3 nodes and 16 edges", 21 and 47, with Undo (03).
The reply named Leo Novak, Ivan Petrov and Zara Ahmed, and the question's words stayed in the first
turn, so "7 people" is still readable. `data.json`: 21 nodes, 47 edges, no filter. 6 model calls.

## Defects

None that crashes, blocks the task or spoils its grading.

Seen and not spoiling a grade, left for the backlog:

1. On one of the three walks that asked the question, a 9 chip with Show in table sat under words
   saying 7 people and 3 untrained, in the turn and kept there after the answer. The chip row is the
   turn's last read that found something, as settled, and that read was not the one the reply counts;
   the 9 was not opened, and is probably everyone untrained. The request itself says 7 throughout, so a
   count read from it stays right. Route: touched-20. Screenshots: T93A/touched-20/04.png, 06.png.
2. The Jump to newest pill lost its box and lay over the transcript's text just after Keep them, while
   the card was going; it had its box the step before. The same as on the earlier build. Route:
   touched-20. Screenshots: T93A/touched-20/09.png, 08.png.
3. The count chip on the request has no pointer cursor and no tooltip ("cursor: default", "tooltip:
   null") on a button whose click selects. Route: touched-12. Screenshot: T93A/touched-12/06.png.
