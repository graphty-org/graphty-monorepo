# T91A targeted re-pilot: making the untrained volunteers stand out

Build 3549e11129, frozen build tier6-r1d1-3549e11129, start `setup:connected-volunteers-sized.txt`
(PageRank run, dots colored and sized by it, Assistant connected, panel closed). The live model was
Gemini 3.8 Flash. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T91A/ (written below as
`<walk>/<n>.png`).

This pass walks the success path by pointer and the three T91A routes the fixes touched: keyboard,
detour-1 (Find and Quick actions), and detour-2 (a question, then make them stand out). The other
routes on the list belong to other tasks.

## Result

The task can be finished on all three walks that asked for the change. Each ended with the right nine
people (v04, v06, v08, v12, v13, v15, v19, v22, v24), a layer whose Which nodes reads "trained: no, 9
nodes", and the key card reading "9 of 24 nodes". The ranking layer stayed. The data stayed the task's
own throughout: 24 nodes and 63 edges, one source. Nothing crashed, nothing blocked the task, and
nothing gave a wrong number. No script error appeared on any walk.

## Success path by pointer (walk: success)

| Step | What happened | Screenshot |
| ---- | ------------- | ---------- |
| Assistant on the rail | Panel opens, composer focused, three starters | success/02.png |
| Type "Make everyone who has not finished their training stand out from everyone else", Enter | 8 steps; the reply finds 9 people and asks how to show them: color, size or filter. Chip reads 9 nodes, Show in table beside it. No failed row, no Send again | success/05.png |
| Hover the chip | The nine dots get a ring on the canvas (nine rings counted), nothing is selected | success/06.png |
| "Highlight them with a distinct color", Enter | 1 step; "Colored 9 nodes", Open layer, Undo. Nine dots cyan (key.json counts 9 drawn in #00e5ff), key card "Color: Untrained, 9 of 24 nodes" | success/08.png |
| Open layer | Inspector shows Untrained; Which nodes reads "trained: no, 9 nodes" | success/09.png |
| Show in table | Table opens on Nodes, the nine rows highlighted, inspector "9 nodes selected" with trained No (9), scope line "Selection 9" | success/11.png |

`styles.json` lists one layer added (`untrained_1`), nothing gone or changed. In this walk the model
asked one question first, which the key puts on the path ("Answering is on the path").

The tool's `--expect selected=9` printed "7 rows are selected" on success/11.png. The app's own
records read 9: `data.json` has selectedNodes 9 and the inspector says 9. The table scrolls, and the
check counts the rows it finds, which is the likely reason for 7; no participant sees that line.

## detour-1: Find and Quick actions

Replayed from the earlier walk: Main menu, the canvas right-click, Find "training", `trained = false`,
Keyboard shortcuts, Settings and Control+K all matched the screens recorded before.

- `trained == false` in Find now offers "Select the 9 nodes (trained: no)" (detour-1/13.png); Enter
  selects nine, inspector "9 nodes selected", trained No (9) (detour-1/16.png).
- `hours >= 27` still offers "Select the 8 nodes (hours 27 or more)" (detour-1/14.png).
- Control+I with those nine selected: panel opens, scope line "Selection 9" (detour-1/17.png).
- Control+K "assistant" lists Assistant with its key (detour-1/18.png). With nothing to paint selected
  "Select what it paints" is grayed and AI provider... is highlighted (detour-1/19.png).
- Still as before, and on the backlog: `trained = false` with one equals sign is a plain no match
  (detour-1/05.png), and Control+K "AI" then Enter on a layer selects all 24 (detour-1/11.png, 12.png).

## detour-2: a starter, a question, then a follow-up

Clicking a starter fills the composer and does not send (detour-2/02.png). "How many people have not
finished their training?" answers "There are 9 people ...", 1 step, no chip and no failed row
(detour-2/03.png). "Make them stand out" worked on the first try: 7 steps, "Sized 9 nodes", "Colored 9
nodes", Open layer, Undo, key card "9 of 24 nodes" (detour-2/07.png). Open layer shows "trained: no, 9
nodes" (detour-2/08.png). Undo took both back, the row reads Undone and the layer left the list
(detour-2/09.png, 10.png); `styles.json` lists no change at the end. Graph and back to Assistant kept
the conversation (detour-2/11.png).

## Keyboard (walk: keyboard, keys and screen-reader lines)

The whole path was walked by keys and reached the end. Focus never fell to the page body after the
start, where nothing has focus by design.

- Replay matched the earlier walk through the tab order, the rail, and Enter, Tab and Escape in the
  composer: Main menu, Project: volunteers, Undo, Redo, Graph, Graph volunteers.graphml, Find, Add a
  layer or a folder; ArrowDown on the rail to Assistant, Enter into textbox "Message the assistant";
  Tab through Gemini 3.8 Flash, Talk, Send, Resize left panel, Graph drawing. Escape with no run keeps
  the text.
- The first message did it: 2 steps, "Colored 9 nodes", polite news "Working", then "Colored 9 nodes.
  Answer ready", focus still in the composer (keyboard/20.png). Key card "9 of 24 nodes".
- Shift+Tab from the composer: Undo, Open layer, "2 steps", region "Conversation", all named.
- Enter on Undo took it back, focus moved to the composer, news "Undid ...", row reads Undone
  (keyboard/28.png). The request was then sent again: "Colored 9 nodes" (keyboard/31.png).
- Enter on Open layer: inspector shows "trained: no, 9 nodes", focus stays on the button
  (keyboard/36.png).
- Escape in a run stopped it, put the message back and said "Stopped. Changes taken back."; the layer
  stayed, and this time the stop is on screen (keyboard/38.png). A second send and stop did the same
  (keyboard/42.png). The cancelled Gemini request is the intended stop.
- Control+I in the composer closes the panel with focus on Graph drawing; again returns with the draft
  kept.

## Mismatches with the answer key

The key's T91 text still describes build 8fa33aa786. On this build:

- Key: the first request changes nothing, a step reads "No matches for data.trained == false.", and it
  can end in "Query data failed." Screen: none of that appeared. By pointer the model asked one
  question and painted on the second message (success/05.png, 08.png); by keyboard the first message
  painted (keyboard/20.png).
- Key: the reply's chip reads 63 edges or 24 nodes and does not back the number, and Show in table
  selects those. Screen: the chip reads 9 nodes and Show in table selects the nine (success/05.png,
  11.png). Detour-2's and the keyboard walk's replies have no chip.
- Key: a selector of nine ids reading "Picked by hand: 9 nodes". Screen: "trained: no, 9 nodes" on all
  three walks (success/09.png, detour-2/08.png, keyboard/36.png).

## Defects

None that crashes, blocks the task or spoils its grading.

## Seen, not spoiling

- One Shift+Tab from the composer printed the composer again, right after a reply and a `--read`; the
  next press went to Undo (keyboard, the steps after 21). Two later tries went straight to Undo, so it
  did not repeat.
- The key card can read "Color: assistant node style" when the model gives the layer no name of its
  own (keyboard/20.png).
- The chip inside the open steps and the chip under the reply share the name "9 nodes, select"
  (success/05.png).
- Eight of the nine dots show until the canvas is reframed, as decided: the key card covers one
  (success/08.png, detour-2/07.png).
