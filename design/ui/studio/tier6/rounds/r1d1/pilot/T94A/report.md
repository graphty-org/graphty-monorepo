# T94A targeted re-pilot: taking a change back on the Les Miserables poster

Build 48879618c4, frozen build tier6-r1d1-48879618c4, 1440 x 900, start
`setup:connected-lesmis-poster.txt` (saved project open, Assistant connected, panel closed). The live
model was Gemini 3.8 Flash. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T94A/ (written below as
`<walk>/<n>.png`). The folders without `-48879618c4` in their names hold the walks of the earlier
build 3549e11129 and were the routes replayed here.

This pass walks the success path by pointer and the three T94A routes on the fix list: a run with no
scope (touched-18), Louvain's six groups unchanged (touched-38, walked by keyboard), and New
conversation, reopen, Undo (touched-41). The other routes on the list belong to other tasks.

Result: reached on every walk. Nothing crashed, blocked the task or gave a wrong result. Every walk
ended with the starting look, no layer changed and no run left, on the project's own 77 nodes and 254
edges. The answer key and the screen agree.

## Routes walked

### Success path by pointer (success-48879618c4)

Replayed from the earlier pass: all seven steps matched and the session ended by itself.

Key card "Color: Poster, 3 of 77 nodes" at the start. Assistant, the request, Enter: one step, six
groups, the change line "Computed Communities for 77 nodes", Open run and Undo, key card "Color:
Louvain", Group 1 to 6 (`success-48879618c4/04.png`). Undo in the turn: the row reads Undone, the notice
"Undid Color every character by the circle of friends they belong to.", key card back
(`success-48879618c4/05.png`). Graph place: Hovered 0, Selected 0, Poster 3, Everything 77
(`success-48879618c4/06.png`). Data place: 77 and 254, no filter (`success-48879618c4/07.png`). Back on
Assistant the conversation is there and reads Undone (`success-48879618c4/08.png`).

Records: `look` 1328d3dd4bea at the start and the end, dd3a804a3d4b while changed. `styles.json`
`changes` empty. `work.json` `gone` empty, no runs at the start or the end. `data.json` 77 nodes, 254
edges, all visible, none selected.

### A run with no scope (touched-18-48879618c4)

Replayed: all three steps matched. The whole-graph run ends with its reply, the change line and Open
run, with no failure line. Open run, Values: Groups 6, Modularity 0.5556, sizes 20, 17, 11, 11, 10, 8 (77
in all), Weight None, and no scope row (`touched-18-48879618c4/03.png`). The scope line reads Whole
graph, 77 and 254. Undo with the run's inspector open: Undone, and the inspector goes back to the
graph's Overview, not to a run that has gone (`touched-18-48879618c4/04.png`). Records as on the success
path.

### Louvain's six groups unchanged, by keyboard (touched-38-keyboard-48879618c4)

Walked by keyboard only, with the screen-reader lines on (`--keys --sr`). It goes to the end of the
task, so it is also this pass's keyboard walk of the success path. Replayed for 20 steps; the 21st
differed only in the run's time on the "ran Nov 5, 4:21:27 PM" button, and the rest was walked by hand
and printed the same focus lines as the earlier walk.

Tab: Main menu, "Project: lesmis-poster", Undo (disabled), Redo (disabled), Graph; ArrowDown to
Assistant; Enter puts focus in "Message the assistant". Typed the request, Enter. Status line:
"Working", "Louvain finished: 6 groups", "Computed Communities for 77 nodes. Answer ready". Focus
stayed in the composer. Shift+Tab: Undo, Open run, "1 step". Enter on Open run keeps focus there and
opens the run (`touched-38-keyboard-48879618c4/13.png`). Tab reaches the inspector after the composer,
resize handle, canvas and Analyze; on through the Style tab's controls to "Resize inspector", and
Shift+Tab comes back the same way. ArrowRight on the Style tab takes Values, and `--read` gives Groups
6, Modularity 0.5556, rows "Group 1: 20 nodes" to "Group 6: 8 nodes", heading "Sizes", Weight None.
Control+I back to the composer, Shift+Tab, Enter on Undo: the status line says "Undid Color every
character by the circle of friends they belong to.". Focus never fell to the page body.

In the composer, with "x" typed: Enter sends (the walk's request), Tab goes on to "Gemini 3.8 Flash",
Shift+Tab comes back with the text kept, and Escape does nothing and keeps the text and focus. The "x"
was deleted and never sent.

Records: `look` back to 1328d3dd4bea, `styles.json` `changes` empty, `work.json` `gone` empty, no runs.

### New conversation, reopen, Undo (touched-41-48879618c4)

Replayed: all twelve steps matched. New conversation with the change on; the title's list shows the
old conversation with Open and Delete (`touched-41-48879618c4/05.png`). Open brings it back with Open run
and Undo. Undo in the reopened turn: Undone, key card back, notice (`touched-41-48879618c4/07.png`). New
conversation, the list, Open: still reads Undone (`touched-41-48879618c4/10.png`). Redo on the arrow
brings the change back and the turn offers Open run and Undo again (`touched-41-48879618c4/11.png`). New
conversation, Control+Z while the empty conversation shows, the list, Open: the reopened turn reads
Undone and offers no Open run (`touched-41-48879618c4/13.png`).

Records: `look` back to 1328d3dd4bea, `styles.json` `changes` empty, `work.json` `gone` empty, no runs.

## Answer key against the screen

No mismatch. Key card, Undone row, conversation kept, `look`, `styles.json` and `work.json` all read as
the key says. The changed `look` was dd3a804a3d4b on all four walks, which the key allows: it says to
compare within a session. The model's reply wording differed on each walk; its six groups did not.

## Defects

1. **Undo in the turn sends focus to the top bar's disabled Undo** (severity 3, seen on the earlier
   build too). After Enter on the turn's Undo the turn's button is gone, and focus lands on `button
   "Undo" disabled` in the top bar; the next Tab goes to "Redo Color every character ...", so focus
   does not fall to the page and the task is not spoiled (`touched-38-keyboard-48879618c4/44.png`, the step
   after Undo).

No setup race on this pass: none of the four starts had its click on Assistant thrown back.

Every setup logged the sample picture venice-transit.webp failing with `net::ERR_BLOCKED_BY_ORB`, as
on the earlier build. It is the start screen's picture, gone before the participant arrives.
