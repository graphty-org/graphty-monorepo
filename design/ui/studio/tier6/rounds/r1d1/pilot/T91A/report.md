# T91A targeted re-pilot: making the untrained volunteers stand out

Build 48879618c4, frozen build tier6-r1d1-48879618c4, start `setup:connected-volunteers-sized.txt`
(PageRank run, dots colored and sized by it, Assistant connected, panel closed). The live model was
Gemini 3.8 Flash. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T91A/ (written below as
`<walk>/<n>.png`). The walks of the previous build, 3549e11129, moved to
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1-build3549e11129/pilot/T91A/,
so the same folder names could hold this build's walks.

This pass walks the success path by pointer and the three T91A routes on the list of touched routes:
keyboard, detour-1 (Find and Quick actions) and detour-2 (a question, then make them stand out). The
list's other routes belong to other tasks. Detour-2 was walked twice, because its first run went
somewhere new.

## Result

The task can be finished on every walk. Each walk that kept its change ended with the right nine people, a
layer whose Which nodes reads "trained: no, 9 nodes", and the key card reading "9 of 24 nodes". The
ranking layer stayed. The data stayed the task's own throughout: 24 nodes, 63 edges, one source.
Nothing crashed and no script error appeared.

One thing can spoil a grade. In one of two runs of the question "How many people have not finished
their training?", the reply said 9 and the chip under it read 15, and Show in table selected the 15
people who HAVE finished (detour-2/03.png, 05.png). See Defects.

## Success path by pointer (walk: success)

| Step | What happened | Screenshot |
| ---- | ------------- | ---------- |
| Assistant on the rail | Panel opens, composer focused, three starters | success/02.png |
| Type "Make everyone who has not finished their training stand out from everyone else", Enter | The first message did it, with no question: nine dots cyan and larger while the reply was still coming | success/05.png |
| Reply | 7 steps; "Found 9 people ... out of 24"; "Colored 9 nodes", "Sized 9 nodes", Open layer, Undo. Key card "Color: Untrained, 9 of 24 nodes". No chip, no failed row | success/06.png |
| Open the steps | Query data, Style, Catalog, Style, Catalog, Style, Style, with times only | success/07.png |
| Open layer | Inspector shows Untrained; Which nodes reads "trained: no, 9 nodes", 9 of 24 nodes; Size 4.5, color 00E5FF | success/08.png |

`styles.json` lists one layer added (`untrained_1`), nothing gone or changed. `key.json` counts 9
dots drawn in #00e5ff. Eight show on the canvas; the key card covers the ninth, as decided.

## detour-1: Find and Quick actions

All 19 steps replayed and every check point matched the previous build, so that walk's findings
stand: Main menu, the canvas right-click, Find "training", `trained = false` (no match), Keyboard
shortcuts, Settings, Control+K "AI" then Enter (selects all 24), `trained == false` offering and
selecting the nine, `hours >= 27` offering eight, Control+I with scope line "Selection 9", Control+K
"assistant". Checked by eye: `trained == false` then Enter, inspector "9 nodes selected", trained No
(9) (detour-1/16.png).

## detour-2: a starter, a question, then a follow-up

Clicking a starter fills the composer and does not send (detour-2/02.png).

**First run (walk: detour-2).**

- The question: 2 steps, "There are 9 people who have not finished their training.", chip 15
  (detour-2/03.png). The steps show two Query data rows, chip 9 then chip 15 (detour-2/04.png).
- Show in table: Nodes tab, 15 rows highlighted, inspector "15 nodes selected", trained Yes (15),
  scope line "Selection 15" (detour-2/05.png).
- "Make them stand out" under that scope: 8 steps, "I found 15 nodes currently selected. The styling
  update failed, so nothing was changed; how would you like them to stand out ...", "Style failed.",
  "Nothing changed.", Send again, the message back in the composer (detour-2/07.png). The open steps
  show names and times only, so the cause of the failure is not on screen or in the session's
  records (detour-2/08.png).
- Scope x, then Send again: the line read Whole graph (detour-2/10.png), the reply "I styled the 9
  people ... to enlarge their size", 1 step, "Sized 9 nodes", and the scope line returned to
  "Selection 15", as decided for the x (detour-2/11.png).
- Open layer: "trained: no, 9 nodes", Size 3, no Fill (detour-2/12.png). Undo: row reads Undone,
  notice "Undid Make them stand out.", layer gone (detour-2/13.png). Graph and back kept the
  conversation (detour-2/15.png). `styles.json` lists no change at the end; 15 nodes stay selected.

**Second run (walk: detour-2-plain), no click on Show in table.**

- The same question: 2 steps, "There are 9 people ...", chip 9 (detour-2-plain/03.png).
- "Make them stand out": 6 steps, "Sized 9 nodes" twice, "Colored 9 nodes", Open layer, Undo, key card
  "9 of 24 nodes" (detour-2-plain/06.png).
- Open layer: "trained: no, 9 nodes", Size 2.5, color EF4444 (detour-2-plain/07.png). Undo took it all
  back; Graph and back kept the conversation (detour-2-plain/10.png). `styles.json` lists no change.

## Keyboard (walk: keyboard, keys and screen-reader lines)

The whole path was walked by keys and reached the end. Focus never fell to the page body after the
start, where nothing has focus by design.

- Replay matched the previous build through the tab order, the rail, and Enter, Tab and Escape in the
  composer (18 steps): Main menu, Project: volunteers, Undo, Redo, Graph, Graph volunteers.graphml,
  Find, Add a layer or a folder; ArrowDown on the rail to Assistant, Enter into textbox "Message the
  assistant"; Tab through Gemini 3.8 Flash, Talk, Send, Resize left panel, Graph drawing. Escape with
  no run keeps the text.
- The first message did it: 3 steps, "Colored 9 nodes", polite news "Working", then "Colored 9 nodes.
  Answer ready", focus still in the composer (keyboard/20.png). Here the layer is named Untrained.
- Shift+Tab from the composer: Undo, Open layer, "3 steps", region "Conversation", all named. The
  first press after a `--read` printed the composer again and the next went to Undo; straight after
  a send, with no `--read`, the first press went to Undo, so this follows the tool's read.
- Enter on Undo took it back, focus moved to the composer, news "Undid ...", row reads Undone. The
  request sent again: "Colored 9 nodes".
- Enter on Open layer: inspector shows "trained: no, 9 nodes", focus stays on the button
  (keyboard/36.png).
- Escape in a run stopped it, put the message back and said "Stopped. Changes taken back."; the layer
  stayed. A second send and stop did the same (keyboard/42.png). The cancelled Gemini request is the
  intended stop.
- Control+I in the composer closes the panel with focus on Graph drawing; again returns with the draft
  kept.

## Mismatches with the answer key

- Key: on A the reply may have a chip reading 9, with Show in table selecting the nine on the Nodes
  tab, or no chip. Screen: a chip reading 15 under a reply saying 9, and Show in table selecting the
  15 others (detour-2/03.png, 05.png). The key does not cover this.

The success path itself has no mismatch: the first message painted, which the key allows, and the
reply has no chip, which the key allows.

## Defects

1. **The chip and Show in table can back the opposite group** (would spoil grading). The model read
   both groups, 9 and then 15, and the chip row keeps the turn's last read, so the reply says 9 over a
   chip reading 15, and Show in table selects the people who have finished. It happened in one of two
   runs. decided.md settles that the row is the last read and that the model is told to make that the
   read it counts; this shows that telling it does not always hold. A reader asked "how do you know"
   sees 9 and 15 side by side. detour-2/03.png, 04.png, 05.png; the good run is detour-2-plain/03.png.
2. **That selection then blocks the change** (follows from 1). Show in table leaves "Selection 15", so
   "Make them stand out" is about the wrong 15 and ended in "Style failed. Nothing changed." with no
   reason anywhere the reader can look. Nothing was painted on the wrong people. The way out was the
   scope x and Send again. detour-2/07.png, 08.png, 11.png.

## Seen, not spoiling

- After that recovery the model only resized the nine, to 3, the top of the ranking's own 1 to 3, with
  no color of their own, so they barely read apart from the ranking (detour-2/11.png, 12.png). A reader
  who stopped there would be graded on whether they look different.
- "Sized 9 nodes" can appear twice in one change line block, when the model writes size twice
  (detour-2-plain/06.png).
- The stray 15-node selection stays after Undo, as decided (detour-2/15.png).
