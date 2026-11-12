# T91A pilot: making the untrained volunteers stand out

Build 8fa33aa786, frozen build tier6-r1-8fa33aa786, start `setup:connected-volunteers-sized.txt`
(from `roster.md`: PageRank run, dots colored and sized by it, Assistant connected, panel
closed). The live model was Gemini 3.8 Flash. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1/pilot/T91A/ (written below as
`<walk>/<n>.png`).

## Result

The task can be finished, but not on the answer key's route. Every walk ended with the right nine
people (v04, v06, v08, v12, v13, v15, v19, v22, v24: the nine rows with `trained` false in
volunteers.graphml), a layer with a count of 9, and the key card reading "9 of 24 nodes". The data
stayed the task's own throughout. The ranking layer stayed, as the key expects.

A plain request that names the rule did not change the drawing on the first try, on either walk
that made one. It took three messages by pointer and two by keyboard. The cause is on screen: the
tool step says "No matches for data.trained == false."

## Success path by pointer (walk: success)

| Step | What happened | Screenshot |
| ---- | ------------- | ---------- |
| Assistant on the rail | Panel opens, composer focused, three starters | success/02.png |
| Type "Make everyone who has not finished their training stand out from everyone else", Enter | Sent; over 25 seconds of "Sending to Google", 8 steps | success/03.png, 04.png |
| Reply | "I found 9 individuals ... No visual changes were applied yet. Would you like me to highlight them", chip "63 edges", then "Query data failed. Nothing changed." with Send again, request back in the composer | success/05.png |
| "Yes, color those 9 people so they stand out from everyone else" | 8 more steps; "no style changes were applied yet. Please confirm" | success/07.png, 08.png |
| "Yes, proceed. Recolor them." | 2 steps; "Colored 9 nodes", Open layer, Undo. Nine dots cyan, key card "Color: Untrained, 9 of 24 nodes" | success/10.png |
| Open layer | Inspector shows Untrained; Which nodes reads "Picked by hand: 9 nodes" | success/11.png |
| Show in table | Table opens on Edges, 63 rows, all 63 edges selected, scope line becomes "Selection 63" | success/12.png |

Layer written: `{"match":"ids", ...nine ids}`, `node.color` #00E5FF, matched 9, painted 9. It is not
the rule `trained` false.

## Detours

**detour-1, looking for the AI elsewhere, and find.** Main menu has no Assistant item (detour-1/02.png).
Right-click on the canvas offers only Fit and Frame selection (03.png). Find "training": "No match"
with a hint to type a rule such as `hours >= 27` (04.png). `trained = false`: "No match" (05.png).
Settings has an AI provider section (09.png). Shortcuts lists Assistant Ctrl+I (08.png). Ctrl+K
then "AI": the top item is "Select what it paints", then "AI provider...", no Assistant (11.png);
Enter silently selected all 24 nodes (12.png). `trained == false` in find offers "Select the 63
edges" (13.png); Enter gives "No column named "false". Still selected: 24 nodes" (16.png). The rule
`hours >= 27` works (14.png). Ctrl+I opens the panel, and its scope line reads "Selection 24" (17.png).

**detour-2, a starter, a question, then a follow-up.** Clicking a starter fills the composer and does
not send, as decided (detour-2/02.png). "How many people have not finished their training?" answers
"Nine people" with a chip reading 63 edges (03.png). "Make them stand out" worked on the first try:
Sized 9 nodes, Colored 9 nodes, Open layer, Undo (05.png). Undo took both back, the line became
"Undone", and the layer left the list; nothing else changed (06.png, 07.png, styles.json). Graph and
back to Assistant kept the conversation (08.png).

**detour-3, the table first.** Table button, sort by trained: nine No rows on top, which is the best
basis for the count (detour-3/05.png). Right-click on a cell does nothing. Click and shift-click
selects the nine; the inspector reads "trained No (9)" and the scope line "Selection 9" (06.png).
"Make these stand out from everyone else" worked on the first try: 4 steps (07.png). The scope x
reads "Ask about the whole graph" and turns into "Whole graph ... Use selection", with the selection
kept (08.png).

**detour-4 and detour-5, the fields.** Keyboard sessions for Enter, Tab and Escape in the two search
boxes; results in the next section.

## Keyboard (walk: keyboard, with detour-4 and detour-5)

The whole path was walked by keys and reached the end. Focus never fell to the page body.

- Tab order from the start: Main menu, Project: volunteers, Undo changing node size on PageRank,
  Redo (disabled), Graph, Graph volunteers.graphml, Find, Add a layer or a folder.
- The rail is one stop: ArrowDown moves Graph to Assistant, Enter opens the panel and lands in
  textbox "Message the assistant" (keyboard/11.png, 12.png).
- From the composer, Tab: Gemini 3.8 Flash, Talk, Send (disabled while empty), Resize left panel,
  Graph drawing. Shift+Tab from the composer after a reply: Show in table, the chip, "8 steps",
  region "Conversation". After the change: Undo, Open layer. All named.
- Composer: Enter sends and focus stays in it. Escape with no run keeps the text, as decided. Escape
  in a run stops it, puts the message back and says "Stopped. Changes taken back."; earlier changes
  stayed (36.png). Ctrl+I in the composer closes the panel, focus goes to Graph drawing; Ctrl+I again
  returns with the draft kept (37.png, 38.png).
- Status: "Working" then "Answer ready" in the polite region; focus stayed in the composer.
- Find: Enter stays in the box and repeats the no-match news; Tab goes to Clear search, then Add a layer;
  Escape clears it and keeps focus (detour-5).
- Search commands: Tab goes to Clear search; Escape closes it and focus goes to the Quick actions
  button (detour-4).
- The request here took two messages: 8 steps, two reading "No matches for data.trained == false."
  (keyboard/27.png), reply "No visual changes were applied before tool execution concluded", then
  "Yes, proceed." and Colored 9 nodes.

## Mismatches with the answer key

- Key: step 2 ends in "Colored 9 nodes". Screen: the first request changed nothing; the line came
  on the third message (pointer) and second (keyboard).
- Key: a layer "whose selector matches those nodes". Screen: the selector is a list of nine ids, so
  it matches, but it reads "Picked by hand".
- Key: the reader reads a basis on screen. Screen: the key card's "9 of 24 nodes" holds; the reply's
  chip and Show in table give 63 edges or 24 nodes instead, and the drawing shows only eight.

## Defects

1. **A false value cannot be matched, so the first request fails** (severity 4). The step says "No
   matches for data.trained == false." on a column with nine false rows. Find fails on the same rule
   (defect 4), so this is likely in graphty-element's matching of a boolean, not in the panel.
   success/05.png, keyboard/27.png, detour-1/13.png.
2. **The reply's chip is not the answer** (severity 4). "Nine people" sits over "63 edges", or over
   "24 nodes" on the keyboard walk. It is the only computed mark the reader has, and it contradicts
   the prose. success/05.png, detour-2/03.png, keyboard/21.png, keyboard/36.png.
3. **Show in table answers something else and changes the question** (severity 3). It selected all 63
   edges, opened the Edges tab and rescoped the next message to the selection. success/12.png.
4. **Find offers a wrong rule** (severity 3). `trained == false` shows "Select the 63 edges", then
   Enter gives "No column named "false"", and `trained = false` says "No match". detour-1/05.png, 13.png, 16.png.
5. **"Query data failed. Nothing changed." beside a good answer** (severity 3). It offers Send again
   and puts the request back in the composer, and the line is gone after the next message. success/05.png, 07.png.
6. **The reply asks for confirmation it does not need** (severity 3). "Please confirm" and "let me know
   if you would like me to proceed" against the decision that reversible changes apply at once. It
   follows from defect 1. success/08.png, keyboard/21.png.
7. **Ctrl+K "AI" then Enter selects everything** (severity 3). The top match for AI is "Select what it
   paints", and Assistant is not listed under the word readers use. The selection rescopes the next
   message. detour-1/11.png, 12.png, 17.png.
8. **"Picked by hand" on the AI's layer** (severity 2). Nobody picked by hand, and a reader who opens
   the layer cannot see the rule. success/11.png.
9. **The grown key card hides a ninth dot** (severity 2). Eight colored dots show in the picture; the
   ninth is under the card in the upper left and shows once the canvas is reframed. The card grew by
   the new row. A reader counting gets 8. Fixing this by reframing is ruled out by `decided.md`.
   success/10.png, success/12.png, detour-2/05.png.
10. **Raw rule text in the steps** (severity 2). "data.trained == false" is a field path on screen.
    keyboard/36.png.
11. **Replies name ids, not names** (severity 2). "nodes v04, v06, ..." though the file has names.
    success/08.png.
12. **A stopped turn is left below the fold** (severity 2). After Escape the list stops at the
    "Assistant" heading, cut off, and the stop is not on screen. keyboard/36.png.
13. **Open layer gives a keyboard reader no news** (severity 2). Focus stays on the button and nothing
    is announced, though the inspector changed. keyboard/32.png.
14. **The model painted the selection's own yellow** (severity 1). The layer it made is named
    "Selection Highlight" and looks like the selection halo. detour-3/07.png.
15. **Sort label for a yes/no column reads "A to Z"** (severity 1). detour-3/05.png.
16. **The main menu and the canvas right-click have no route to the Assistant** (severity 1). The rail
    is the route, as decided; recorded for whether participants look there. detour-1/02.png, 03.png.

Already ruled, not counted: the starter "Does name line up with the groups?" (answers.md, severity 2,
kept). The cancelled Gemini request after Escape is the intended stop, not a failure.

## Not defects, confirmed

Rail label and sparkle, Assistant between Graph and Data, starters fill and never send, Undo offered
on the newest step only, panel x, conversation kept across rail places, no bubbles.

## Notes

The first detour-1 session was discarded: a start killed while queued for a browser left a second
session on the same folder, whose page came up blank. It was the walker's error, not the app's, and
the walk was redone in a clean folder.
