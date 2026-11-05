# Pilot walk: T93 B, take the genes outside the big tangle out for good (targeted re-walk)

Build 3549e11129, served from `.study-builds/tier6-r1d1-3549e11129`, live Gemini 3.8 Flash, start
`setup:connected-yeast.txt`. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T93B/ (written below as
`<walk>/<n>.png`). The data stayed yeast-galactose.graphml on every walk: 331 nodes and 361 edges
before Remove, 249 and 298 after (`data.json` of each walk that pressed Remove).

Result: nothing crashed, nothing blocked the task, and nothing seen would spoil its grading. The
task was reached on every walk that went for it, by pointer and by keyboard. The request read
"Remove 82 nodes and 63 edges?" on all of them, with one chip, 82.

Model calls: success 4, keyboard 4, detour-1 9, touched-10 4, touched-22 14, touched-23 8,
touched-28 13, touched-28-x-send-again 5, touched-36 5, touched-37 6.

## Routes walked

| Route                                               | Folder                  | Result |
| --------------------------------------------------- | ----------------------- | ------ |
| T93B success path                                   | success                 | reached, 249 and 298 |
| T93B keyboard                                       | keyboard                | reached by keys alone, 249 and 298 |
| T93B detour-1: Change this, ask why, Keep them      | detour-1                | kept, 331 and 361 |
| T93B detour-3: chip click                           | touched-10              | selects 82 nodes only; Remove gives 249 and 298 |
| T93B detour-3: Send again                           | touched-22              | works, by a real failed message (see below) |
| T93B detour-2: a message while a request waits      | touched-23              | words stay; asking again gives the card; 249 and 298 |
| T93B detour-3: stray selection, Send again          | touched-28, touched-28-x-send-again | no failure on the old route; works by a real failed message |
| T93B detour-2: Open run, Values                     | touched-36              | Groups 26, Largest 10; 249 and 298 |
| T93B keyboard: the status line                      | touched-37              | "26 groups" heard; 249 and 298 |

## Success path, by pointer (success/)

1. Assistant, the request with the lab mate's guess, Enter. The reply gave 249 and 82. The section
   above the composer read "Remove 82 nodes and 63 edges?", "Undo can bring them back.", one chip 82,
   Remove, Change this, Keep them. Nothing had changed on the canvas (03.png).
2. Hovering 82 lit only the small pieces; the tangle's edges stayed as they were (04.png). The 361
   chip is gone, so the recorded second hover found "Node 82" and the replay stopped there (05.png).
3. Steps opened to Separate pieces and Edit data (06.png).
4. Remove. Overview 249, 298, Components 1. The first reply stayed above the second, with "Removed 82
   nodes and 63 edges", Open run and Undo (07.png). The Data place read the same (08.png).
5. Composer keys: Enter when empty does nothing (09.png); Tab goes to the model label (10.png); Escape
   keeps typed text (11.png, and "abc" still there on 12.png).
6. Undo brought back 331 and 361 and the row read Undone. The 82 came back selected, as decided
   (12.png).

## Mismatches with the answer key

- The key's T93 section still says the edge chip can disagree, 361 on 5 of 8 cards on B. On this
  build no card showed an edge chip: every card walked had the 82 chip alone (success/03.png,
  keyboard's `--read`, detour-1/07.png, touched-10/02.png, touched-22/09.png, touched-23/04.png,
  touched-28/10.png, touched-28-x-send-again/09.png, touched-36/08.png, touched-37/05.png). The
  sentence is out of date.

The rest matched: 82 and 63 on the request, 249 and 298 if removed, 331 and 361 if kept, the three
buttons, and a path of four or five steps.

## Keyboard walk (keyboard/, started --keys --sr, reached the end)

Focus fell to the page body only at the start, where the setup leaves it by design.

Tab from the top: Main menu, Project: yeast-galactose, Undo (disabled), Redo (disabled), Graph.
ArrowDown to Assistant, Enter: textbox "Message the assistant". The polite region said "Working",
"Connected components finished: 26 groups", then "Waiting for your approval: Remove 82 nodes and 63
edges?".

Shift+Tab from the composer, as decided: Keep them, Change this, Remove, "82 nodes, select", Undo,
Open run, "2 steps" collapsed, region "Conversation". Enter on the steps opened them. With steps
open there is one "82 nodes, select", not two. Tab forward: Open run, Undo, the chip, Remove, Change
this, Keep them, the composer, "Gemini 3.8 Flash", Talk. Escape in Talk and in the composer did
nothing and kept the request. ArrowRight on the chip stays on it, as there is only one. Enter on
Remove: focus moved to the composer, the region said "249 nodes, 298 edges", "Working", then
"Computed Separate pieces for 331 nodes. Removed 82 nodes and 63 edges. Answer ready".

## Routes the fixes touched

**Change this, ask why, Keep them (detour-1/).** Change this took focus to the composer and started
a turn (04.png). Both replies stayed in the turn, with "Declined. Nothing changed." (05.png). "Why is
it not about twenty?" gave the breakdown 7, four of 5, four of 4, seven of 3, nine of 2, which adds to
82, and colored the drawing, with a key card of Group 1 to Group 8 and Other 47 (06.png). Asking
again brought the card back, with one chip (07, 08.png). Keep them left 331 and 361 and both replies
(09.png).

**Chip click (touched-10/).** The chip selected 82 nodes and no edges; the inspector read "82 nodes
selected", "Edges joining these nodes 63", and the scope line Selection 82 (03.png). Remove gave 249
and 298, nothing left selected, scope Whole graph (04.png).

**A message while a request waits (touched-23/).** The first reply stayed, with "Not run: you sent a
new message." under it (03.png). The question was answered, 25 pieces and 82 genes. Asking again
brought the card (04.png), and Remove gave 249 and 298 with every word still there (05.png).

**Stray selection (touched-28/).** The route replayed to the request. The failed turn no longer comes:
the model cleared the edge, reported 26 pieces, and asked in words (09.png), so no Send again was
offered. "Yes, remove them for good." brought the card (10.png), and Remove gave 249 and 298 (11.png).
The same start in touched-22 also ended with no failure (03.png).

**Stray selection, the x, Send again (touched-28-x-send-again/).** To reach a real failure the
provider was moved to OpenAI with a made-up key, as on T91 B. With the edge selected the message
failed: "Could not reach OpenAI: the connection failed.", Send again, Selection 1 (05.png). Back on
Google the x gave Whole graph with Use selection (08.png). Send again went across the whole graph and
reached the card; the failure's words stayed, and Selection 1 came back on the line, which is what
`decided.md` says the x does (09.png). Remove gave 249 and 298 (10.png). The edge stayed selected, one
edge, as the x clears nothing.

**Send again keeps earlier words (touched-22/).** After the reply above, the provider was moved to
OpenAI and "Yes, remove them for good." failed (06.png). Back on Google, Send again left the first
reply and the failure in place and reached the card (09.png). Remove gave 249 and 298 (11.png). The
key card then read "Color: Connected components, out of date" with Group 1 alone.

**Open run, Values (touched-36/).** The replay matched through the card. Open run landed on the
blank Style tab as before (09.png). Values read Groups 26, and the list is headed Largest 10, Group 1
249 to Group 10 4 (10.png). Clicking the active rail button gave the dot and the lasting notice
"Waiting: remove 82 nodes and 63 edges" with Open (11.png); Open came back (12.png). After Remove the
run shows "Data changed since this run" and Rerun beside its 26 (13.png), which is true of the run.

**The status line (touched-37/, started --keys --sr).** Control+I reached the composer. A question
about the pieces was heard as "Connected components finished: 26 groups", then "Computed Separate
pieces for 331 nodes. Answer ready". The request was heard as "Waiting for your approval: Remove 82
nodes and 63 edges?". Shift+Tab three times, Enter on Remove: "249 nodes, 298 edges", "Working",
"Removed 82 nodes and 63 edges. Answer ready".

## Defects

None crashes, blocks the task or spoils its grading. Severity 0 to 4, each from the walk named.

1. **Severity 1. "Selected 0 nodes" is drawn as a change line.** touched-28/09.png, touched-22/03.png.
   `decided.md` says a selection of nothing draws no line. This one appears when the model clears a
   stray edge, and it sits beside Undo.
2. **Severity 1. A turn that colored the drawing does not say so.** touched-22/03.png: the key card
   and the colors arrived, and the change lines read only "Computed Separate pieces for 331 nodes" and
   "Selected 0 nodes". On detour-1/06.png the same coloring read "Changed the graph".
3. **Severity 1. "Declined. Nothing changed." goes from the turn after the next message.**
   detour-1/05.png has it under Open run; detour-1/06.png and 07.png do not. "Not run: you sent a new
   message." stays through the next message (touched-23/04.png), so the two rows behave differently.
4. **Severity 1. After a message the conversation can stop short of the newest reply.**
   detour-1/07.png: the card arrived and the panel stayed on the previous turn, with "Jump to newest"
   over it, so the reader's own message and the reply were below the fold (08.png after the jump).
   touched-23/04.png, a similar length, did scroll down. Mechanism not traced.
5. **Severity 1. The panel gets a second scrollbar with long steps open.** touched-22/10.png: with
   8 steps open on a long conversation and a waiting request, an outer scrollbar appears beside the
   conversation's, and the header's buttons and the composer move in about 15 px.
