# T94A targeted re-pilot: taking a change back on the Les Miserables poster

Build 3549e11129, frozen build tier6-r1d1-3549e11129, 1440 x 900, start
`setup:connected-lesmis-poster.txt` (saved project open, Assistant connected, panel closed). The live
model was Gemini 3.8 Flash. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T94A/ (written below as
`<walk>/<n>.png`).

This pass walks the success path by pointer and the three T94A routes the fixes touched: a run with no
scope (touched-18), Louvain's six groups unchanged (touched-38), and New conversation, reopen, Undo
(touched-41). The other routes on the list belong to other tasks.

Result: reached on every walk. Nothing crashed, blocked the task or gave a wrong result. Every walk
that finished on Undo ended with the starting look, no layer changed and no run left, on the
project's own 77 nodes and 254 edges. The answer key and the screen agree.

## Routes walked

### Success path by pointer (success)

Replayed from the earlier pass. Six of seven steps matched. The seventh differed only because the
model took 2 steps where the recording took 1, and because the Undo notice was still up on a fast
replay.

Key card "Color: Poster, 3 of 77 nodes" at the start. Assistant, the request, Enter: six groups, the
change line "Computed Communities for 77 nodes", Open run and Undo, key card "Color: Louvain", Group 1
to 6 (`success/04.png`). Undo in the turn: the row reads Undone, the notice "Undid Color every
character by the circle of friends they belong to.", key card back (`success/05.png`). Graph place:
Hovered 0, Selected 0, Poster 3, Everything 77 (`success/06.png`). Data place: 77 and 254, no filter
(`success/07.png`). Back on Assistant the conversation is there and reads Undone (`success/08.png`).

Records: `look` 1328d3dd4bea at the start and the end, dd3a804a3d4b while changed. `styles.json`
`changes` empty. `work.json` start and end equal, no runs.

### A run with no scope (touched-18)

The whole-graph run still ends with its reply, the change line and Open run, with no "Run an algorithm
failed." Open run, Values: Groups 6, sizes 20, 17, 11, 11, 10, 8 (77 in all), Weight None, and no scope
row (`touched-18/03.png`). The scope line reads Whole graph, 77 and 254. Undo with the run's inspector
open: Undone, and the inspector goes back to the graph's Overview, not to a run that has gone
(`touched-18/04.png`). Records as on the success path.

An earlier session of the same route is kept in `touched-18-stopped-before-undo`: it was ended before
Undo by a mistyped step name, so its end records show the change still on and say nothing about the
build. There the model ran three steps and weighted the run by `data.shared_chapters` (closer): Groups
6, sizes 24, 17, 11, 10, 9, 6, also 77 (`touched-18-stopped-before-undo/05.png`). Both are honest runs,
each stating its weight. The number of groups was six in every walk, but their membership depends on
the weight the model picks, so two participants can see different sizes.

### Louvain's six groups unchanged (touched-38)

Walked by keyboard only, with the screen-reader lines on (`--keys --sr`), to hear the status line. It
goes to the end of the task, so it also stands as a keyboard walk of the success path.

Tab: Main menu, "Project: lesmis-poster", Undo (disabled), Redo (disabled), Graph; ArrowDown to
Assistant; Enter puts focus in "Message the assistant". Typed the request, Enter. Status line:
"Working", "Louvain finished: 6 groups", "Computed Communities for 77 nodes. Answer ready". Focus
stayed in the composer. Shift+Tab: Undo, Open run, "1 step". Enter on Open run keeps focus there and
opens the run; Tab reaches the inspector after the composer, resize handle, canvas and Analyze.
ArrowRight on the Style tab takes Values, and `--read` gives Groups 6, Modularity 0.5556, rows "Group 1:
20 nodes" to "Group 6: 8 nodes", heading "Sizes", no "Largest" heading, as the list holds every group.
Control+I back to the composer, Shift+Tab, Enter on Undo: the status line says "Undid Color every
character ...". Focus never fell to the page body.

Records: `look` back to 1328d3dd4bea, `styles.json` `changes` empty, `work.json` equal, no runs.

### New conversation, reopen, Undo (touched-41)

Replayed from the earlier detour 4 up to the reopen: all five steps matched. New conversation with the
change on; the title's list shows the old conversation with Open and Delete (`touched-41/05.png`). Open
brings it back with Open run and Undo (`touched-41/06.png`). Undo in the reopened turn: Undone, key card
back, notice (`touched-41/07.png`). New conversation, the list, Open: still reads Undone
(`touched-41/09.png`, `touched-41/10.png`).

Then the case the fix was for: Redo on the arrow brings the change back and the turn offers Undo again
(`touched-41/11.png`). New conversation, Control+Z while the empty conversation shows, the list, Open:
the reopened turn reads Undone and offers no Open run (`touched-41/13.png`).

Records: `look` back to 1328d3dd4bea, `styles.json` `changes` empty, `work.json` equal, no runs.

## Answer key against the screen

No mismatch. Key card, Undone row, conversation kept, `look`, `styles.json` and `work.json` all read as
the key says, on three steps. The changed `look` was dd3a804a3d4b or 48e970ad8962 by walk, which the key
allows: it says to compare within a session.

## Defects

1. **A click on Assistant just after a project opens can be thrown back to Graph** (severity 2, already
   in the backlog). One start of six here. The setup's click landed and the place stayed Graph, so
   the setup stopped at "AI provider..." (`setup-race/setup.log`). A second click about a second later
   was thrown back too, with focus on Assistant and the notice "Opened lesmis-poster" still up
   (`setup-race/02.png`); a third, a second after that, opened the panel (`setup-race/04.png`). So
   "a second click works", as the backlog says, does not always hold. This does not spoil a task,
   because a start that fails is run again. The same start logged the sample picture
   venice-transit.webp failing with `net::ERR_BLOCKED_BY_ORB`.

Undo in the turn still sends focus to the top bar's disabled Undo (`touched-38`, the step after Undo);
it is in the backlog already and is no failure of this pass.
