# Pilot of tier 6 task T93A: taking people out of volunteers.graphml with the Assistant

Build 8fa33aa786 from .study-builds/tier6-r1-8fa33aa786, 1440 x 900, started from
`setup:connected-volunteers.txt` on every walk (file open, Assistant connected, panel closed).
Screenshots and step files are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1/pilot/T93A/ (shortened to `T93A/`
below). The data stayed the 24 volunteers and 63 edges until a removal, and the counts after each
removal were the ones the screen stated; the seven people were the seven of the answer key.

Result: reached on the pointer path and on the keyboard path. Nothing asked for was skipped. The
success path matches the answer key. Off it, declining the request does not keep the people: the
model hid them instead (defect 1 below).

## Routes walked

### Success path by pointer (T93A/success)

Assistant on the rail (02); typed the request, Enter; the reply named the seven and the section above
the composer read "Remove 7 nodes and 32 edges?", "Undo can bring them back.", a 7 chip, Remove,
Change this, Keep them (03). Hovering the chip ringed seven nodes and changed nothing (04). Remove:
17 nodes, 31 edges in the inspector, the scope line and the change line "Removed 7 nodes and 32 edges"
with Undo (05). The steps read Query data, Edit data (06). Graph place: Everything 17 (07). Data place:
17 and 31 (08). `data.json` at the end: 17 nodes, 31 edges. Four steps, as the key says.

### Keyboard (T93A/keyboard, started --keys --sr)

Reached the end. Tab from the top: Main menu, Project: volunteers, Undo, Redo, then the rail as one
stop; ArrowDown to Assistant, Enter opens the panel with focus in textbox "Message the assistant".
Control+I reaches the same box from anywhere; pressed there it closes the panel and focus returns to
where it was. Typing and Enter sends; the status line says "Working", then "Waiting for your approval:
Remove 7 nodes and 32 edges?". Focus stays in the composer. Shift+Tab from the composer: Keep them,
Change this, Remove, "7 nodes, select", "2 steps", region "Conversation", Close, New conversation,
"Assistant, Conversations". Enter on Remove: focus returns to the composer and the status line says
"17 nodes, 31 edges", "Working", "Removed 7 nodes and 32 edges. Answer ready". After that Shift+Tab
reaches Undo, "2 steps", region "Conversation". In the composer, Enter when empty does nothing, Escape
keeps the text, Shift+Enter starts a new line. Focus never fell to the page body. `data.json`: 17
nodes, 31 edges. Steps 01 to 53.

### Detour 1: naming the remembered number, answering, then Change this and Keep them (T93A/detour-1)

The request said "Marisol says it is about three people". Eight steps later the model had selected
and asked a question in the waiting section: all 7, only the 3 untrained, or nobody (03). Escape in
the composer changed nothing (04). Answered "all 7": the card came (06). Change this: the turn read
"Declined. Nothing changed." with focus in the composer (09, 10). The x on the scope line gave Whole
graph and Use selection (11). Asked again: a card again, and the scope was back on the selection (12).
Clicking the card's edge chip selected 7 nodes and 63 edges (14). Keep them: the model filtered the
seven out (15, 16). Undo in that turn brought them back (17).

### Detour 2: asking who first, removing, then Undo and Redo (T93A/detour-2)

"Who has no phone number on file?" gave the seven names and selected them (02, 03). "Take them out"
gave the card (04). Remove: 17 and 31 (05). Undo in the turn: 24 and 63, the row reads Undone, notice
"Undid Take them out of this network for good, not just hide them.." (06). Redo in the top bar: 17 and
31, Undo back in the turn (08). `data.json`: 17 nodes, 31 edges.

### Detour 3: leaving while the request waits, and looking elsewhere (T93A/detour-3)

With a card waiting, Close and the Data place: a rail dot and a lasting notice "Waiting: remove 7 nodes
and 32 edges" with Open (05). Right-clicking a node: Neighborhood, Path between, Frame selection, New
layer from selection, Add note, Motion off, no Remove (06). The find box with "phone" offered only
"Select the 17 nodes (phone: has a value)" (07); Enter selected those 17 (08); Escape cleared the box
(09). Open came back to the card (10). A new message while it waited: "Not run: you sent a new
message." (11, 12). Nothing was removed.

### Detour 4: choosing the model's three-person option (T93A/detour-4)

The same request as detour 1. The model again asked, this time naming Leo, Ivan and Zara (03). Choosing
them removed 3 nodes and 16 edges at once with no card: 21 and 47 (04). Below the element's limit, so
no request is the settled behavior; a session on this route ends `Card: not reached`.

## Defects

1. Keep them did not keep them. The reply read "Permanent removal was held for approval and denied, so
   I filtered out the 7 people with no phone number instead", and 7 were hidden, with "Filtered to 17 of
   24 nodes". The answer key's "If kept: 24 nodes, 63 edges" was not on the canvas. Detour 1, 15, 16.
2. The request's numbers disagreed: the title said 32 edges and its chip said 63. The chip's name is "63
   edges, select" and clicking it selected all 63. The state came from the model's own selection, which
   the change line reported only as "Selected 7 nodes". Remove was not pressed in that state, so which
   count it would have removed is unknown; detour 4 tried and the model took another way. Detour 1, 03,
   06, 12, 14.
3. A held request changed the selection while saying nothing had changed. Seven selected nodes became no
   selection and the scope line went to Whole graph (detour 2, 03 to 04); 7 nodes and 63 edges became 31
   edges (detour 1, 05 to 06). No change line says so, and a decline does not restore it (detour 1, 10).
4. The reply a request was read beside is replaced. After Remove, the seven names in the first reply are
   gone and no step or chip gives them back; a reader cannot report who left (success, 03 to 05). The same
   after Change this (detour 1, 06 to 10) and a new message (detour 3, 03 to 11).
5. A question's text leaves the conversation once answered. "There are 7 people" survives nowhere on
   detour 4, whose first turn then shows only "4 steps", and the reader is left with "Removed 3 nodes".
   Detour 4, 03 to 04; detour 1, 03 to 06.
6. The model offered "only the 3 untrained" both times the remembered number was in the message: a subset
   nobody asked for, fitted to the wrong number, drawn as an equal choice. Detour 1, 03; detour 4, 03.
7. The model's words contradict the request: "permanent", "an irreversible change" beside "Undo can bring
   them back." (detour 1, 06; detour 2, 04), and "I have permanently removed" above a row reading Undone
   (detour 2, 06).
8. The question's text is the smallest and palest on the panel, below the options it governs, while the
   request title beside it is bold. Detour 1, 03; detour 4, 03.
9. Change this ends the turn: a model call runs, the reply and "Declined. Nothing changed." arrive, and
   nothing asks what to change. Focus does go to the composer, as designed, but its placeholder is still
   "Ask about this graph". Detour 1, 09, 10.
10. Whole graph chosen with the scope x does not last: the next message's turn is back on the selection.
    Detour 1, 11, 12.
11. Undo after a removal leaves a selection the reader never made: 7 nodes and 32 edges, where the scope
    line had read Whole graph. Detour 2, 05, 06.
12. Undo and Redo notices quote the reader's sentence after the verb and double its period: "Undid Take
    them out of this network for good, not just hide them..". On detour 1 "Undid Remove everyone..." names a
    removal that never happened; what was undone was the filter. Detour 2, 06, 08; detour 1, 17.
13. Escape from the conversation list puts focus in the composer, not back on "Assistant, Conversations",
    the button that opened it. Keyboard, 24, 25.
14. Replies sometimes give ids where a reader needs names: "v03, v06, v10". Detour 3, 03.
15. The count chips have no pointer cursor and no tooltip: "cursor: default, tooltip: null" on a button
    whose click selects. Success, 04; detour 1, 08.
16. The find box offers only the opposite of what this task needs: 17 with a phone, nothing for no value,
    and Enter selects the 17 to keep. Detour 3, 07, 08.
17. Right-clicking a node moved the drawing far from the pointer, leaving the menu over empty canvas and
    part of the network off the canvas. Detour 3, 06.
18. The whole page sits 1 px higher from one screen on in detour 1, the top bar at y 19 in place of 20.
    Detour 1, 07 onward.
