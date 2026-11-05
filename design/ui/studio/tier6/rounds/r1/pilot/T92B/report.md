# Pilot: T92 B, two facts about the yeast genes

Build 8fa33aa786, served from .study-builds/tier6-r1-8fa33aa786, start `setup:connected-yeast.txt`.
Screenshots stay out of git, under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1/pilot/T92B/ (each path below is
relative to that folder).

Result: the task can be finished by pointer and by keyboard alone. Fact 1 came back as YMR043W, whose
name in the file is MCM1, and fact 2 as 7. The table sorted by gal80Rexp confirms 7 (success/16.png).
Every session held 331 nodes and 361 edges at its end and its key check was clean. The main weakness
is checking: on the success path neither reply carried a chip, and fact 2 could only be checked by
leaving the Assistant for the table.

## Routes walked

| Folder   | Route                                                                                  | Outcome                                       |
| -------- | -------------------------------------------------------------------------------------- | --------------------------------------------- |
| success  | Pointer: Assistant, fact 1, steps, Open run, Values, fact 2, table sorted by gal80Rexp | Reached; YMR043W and 7, success/12.png        |
| detour-1 | Both facts in one message, Open run, "Show me those 7 genes", Undo, the chip in steps  | Both right; Undo left a different drawing     |
| detour-2 | The starter "Which nodes matter most?", then fact 2 with its five nodes still selected | "at least 6"; exact 7 only when asked again   |
| detour-3 | No Assistant: Find box, right-click, Analyze, Quick actions, then a question           | Find answers fact 2; right-click has no route |
| detour-4 | Enter, Tab and Escape in the Analyze, Quick actions and Find fields                    | Each does what a person expects               |
| keyboard | The success path by keys, in screen-reader mode, plus Stop and the table by keys       | Reached, keyboard/ (147 screenshots)          |

Gemini calls: success 12, detour-1 6, detour-2 20, detour-3 4, detour-4 0, keyboard 14.

## Pointer success path

1. Assistant: the panel, three starters, scope "Whole graph 331 361" (success/02.png).
2. Fact 1, Enter. The reply names YMR043W, with the lines "Computed Bridges for 331 nodes" and
   "Selected 1 node", Open run and Undo. The network repaints with the key "Color: Betweenness, 0 to
   16,124", the inspector opens on YMR043W (name MCM1, Betweenness 16,124, #1 of 331), and the scope
   turns to "Selection 1" (success/03.png). No chip.
3. 3 steps opens Bridges, Query data, Select (success/04.png). Open run opens the run on the Style tab
   (06); Values shows Top 10 by id, YMR043W 16,124 then YGL035C 12,500 (07).
4. Fact 2, Enter, with Selection 1 left on. About 60 seconds. Part way through, the scope turned back
   to "Whole graph" on its own (09). The reply reads "There are 7 genes with gal80Rexp above 1: GAL7,
   GAL1, GAL10, YNL164C, ADE4, ICL1, and BAS1." with the line "Selected 0 nodes" (12). No chip, no
   Show in table; three of the seven steps read "No matches."
5. Table, gal80Rexp header once: "Sorted by gal80Rexp, highest first", seven rows above 1, the next
   is 0.991 (16). A second press sorts lowest first (17).

## Detours

**Detour 1, both facts at once.** The commonest first try, since the prompt gives both facts together.
"Most connections between other genes pass through YMR043W ... Exactly 7 genes have a gal80Rexp value
greater than 1." with "Computed Bridges for 331 nodes" (detour-1/02.png). The network did not repaint,
no key card, nothing selected. The chip for the 7 sits only inside the folded steps (03). Open run
landed on an empty Style tab (04). "Show me those 7 genes" hid the other 324 and said so ("Filtered to
7 of 331 nodes", 05), with a primary Rerun in the inspector. Undo brought them back to a different
drawing (07 against 04). The chip's peek darkened the seven (07) and a click selected them: gal80Rexp
1.101 to 3.126 (08), a good check once found.

**Detour 2, the starter first.** The starter filled the composer and Enter ran PageRank: the five top
ids, with five nodes selected but no "Selected" line, and "Computed Influence for 331 nodes" over the
key "Color: PageRank" (detour-2/03.png). Fact 2 in that state answered "None of the previously
selected top 5 genes have a gal80Rexp above 1 ... with at least 6 genes strictly above 1.1; I cleared
the active selection" with "Selected 0 nodes" (05). That is a wrong threshold and no count. Asking
again for the exact count gave 7 with the names, the chip row and Show in table (07, 08). The reply
landed out of view behind "Jump to newest", which overlays the text (07), and the panel drew two
scrollbars. Show in table selected the seven but left all 331 rows "In the order loaded", with none
of the seven on screen (10).

**Detour 3, without the Assistant.** Find with "gal80Rexp above 1": no match, and a hint with a rule
(detour-3/02.png). "gal80Rexp > 1" offers "Select the 7 nodes (gal80Rexp above 1)" and Enter selects
them (03, 04): the plainest check of fact 2 in the build. Right-click offers nothing about the AI
(06). Analyze lists Betweenness (07, 08). Quick actions: "ask" gives No results (09), "assistant"
finds Assistant Ctrl+I (12). A question from there kept the edge the right-click had selected: the
scope read "Selection 1" with an edge, and the model answered for the whole network anyway (11).

**Detour 4, the fields.** Below, under "Fields".

## Keyboard walk

Started with `--keys --sr`, one key per step. Focus names forward: Main menu, Project:
yeast-galactose, Undo (disabled), Redo (disabled), Graph, then ArrowDown to Assistant; Enter puts focus
in textbox "Message the assistant". Control+I does the same from anywhere. From the composer forward:
"Gemini 3.8 Flash", "Talk", "Send" (disabled), separator "Resize left panel", Canvas "Graph drawing",
"Analyze", then the inspector. Backward from the composer on the empty panel: the three starters,
"Close", "New conversation", "New conversation, Conversations", "Assistant" (rail).

After a reply, backward: "Ask about the whole graph" (when a selection is on), "Undo", "Open run", "3
steps", region "Conversation", "Close". Live messages on fact 1: "Working", "Betweenness finished:
YMR043W ranks first, 16,124", "YMR043W selected", "Computed Bridges for 331 nodes. Selected 1 node.
Answer ready". On fact 2: "Working", then "Selected 0 nodes. Answer ready".

The table by keys: Shift+T opened it with focus on "Key id"; ArrowRight along the headers ("text
name", "number gal1RGexp", "number gal4RGexp", "number gal80Rexp"), Enter sorts ("gal80Rexp, sorted
descending", live "Sorted by gal80Rexp, highest first"), ArrowDown reads gridcell "3.126", "2.939".
Top 10 by keys: Style tab, ArrowRight to Values, Tab to "YMR043W 16,124".

Focus never fell to the page body after the first Tab. The reply reached the end: 7 and the seven
names, heard only by `--read` (keyboard/ near the end).

## Fields

- Composer: Enter sends; Enter when empty does nothing; Shift+Enter adds a line; Tab goes to the
  model label; Escape when idle keeps the text and a running Escape stops ("Stopped. Changes taken
  back.", the question back in the composer), both as settled.
- Find: Enter selects the offered rule; Tab goes to Clear search, then "Add a layer or a folder";
  Escape clears the text and keeps focus (detour-4/11, 13).
- Analyze's filter: Enter opens the first analysis with Run focused; Escape steps back to the list and
  keeps the text; a second Escape closes (detour-4/03, 04).
- Quick actions: Tab goes to the clear button, Enter there clears; Escape closes (detour-4/08, 09).

## The answer key against the screen

1. The key's answer is MCM1. The reply says YMR043W, and every walk did, in all four replies to
   fact 1. MCM1 shows only in the inspector's name row or a Find hit. Reporting YMR043W is right, and
   the key should accept it.
2. The key's path says "read the reply and its chip; hover the chip, or Show in table". Neither reply
   on the success path had a chip or Show in table. Fact 1 has Open run; fact 2 has nothing.
3. The key's "check it the same way" is not available for fact 2: the only check was outside the
   panel, the table or Find.
4. The key says an analysis repaints the network and adds a key card. In detour-1/02 Betweenness ran
   and nothing repainted, while success/03 and detour-3/11 repainted.
5. The key gives betweenness as 0.297 and 0.230; the screen shows 16,124 and 12,500, the same values
   before dividing by 54,285 pairs. A grader needs to know that. YGL035C is the key's MIG1.
6. Fact 2 matches the key: 7 genes, the same seven.

## Defects

Severity 0 to 4. Each has its route and screenshot.

1. Severity 3. Fact 2 asked while the model's own selection is on returned "at least 6 genes strictly
   above 1.1", a threshold nobody asked for and no count. A reader who passes that on reports a wrong
   number. detour-2, detour-2/05.png.
2. Severity 3. A computed fact can arrive with no chip. Fact 2 had none on the success path, and in
   detour-1 the chip for the 7 sat in the folded steps because a later query with no result came last.
   Fewer checks than the design promises, on the fact that needs one. success/12.png, detour-1/03.png.
3. Severity 3. Show in table selects the rows but neither sorts, filters nor scrolls to them: 331 rows
   in load order, none of the seven in view. detour-2, detour-2/10.png.
4. Severity 2. The model clears the reader's selection inside a question, and the turn ends "Selected
   0 nodes" right under "There are 7 genes". On the three walks that asked with a selection on, all
   three did this. The line reads as a contradiction and the live message says only "Selected 0
   nodes. Answer ready". success/12.png, detour-2/05.png, keyboard live line.
5. Severity 2. The same measure has two names on one screen: "Computed Bridges" and step "Bridges"
   beside "Betweenness" in the reply, the key, the run and Analyze; "Computed Influence" beside
   "PageRank". A check by name fails. Also in the live message. success/03.png, detour-2/03.png.
6. Severity 2. Replies name genes by id for fact 1 and by name for fact 2, and Top 10 lists ids only,
   so a reader cannot match "YMR043W" against "GAL7" in one answer without the inspector or table.
   success/07.png, success/12.png.
7. Severity 2. Undo of the filter restores the 324 nodes to a different drawing, not the one before it,
   and the "Moved the view" line suggests only the camera moved. detour-1/04.png against 07.png.
8. Severity 2. Open run on a run that painted nothing lands on an empty Style tab with no words; the
   Values tab holds what the reader came for. detour-1/04.png. Where it painted, Style still comes
   first (success/06.png).
9. Severity 2. Asking about a question sometimes repaints the network and sometimes not, with the same
   analysis. success/03.png against detour-1/02.png.
10. Severity 2. Long replies put a second scrollbar beside the transcript's and narrow the header and
    composer by 15 px; "Jump to newest" sits over the text with no backing, and the new reply landed
    out of view. detour-2/07.png, 08.png.
11. Severity 2. Open run by keys gives no signal: focus stays on the button and nothing is announced
    while the inspector changes. keyboard, the step after "Open run".
12. Severity 1. Three of the seven steps read "No matches." with no word on what was searched, though
    the design's empty row says "No matches for ...". success/12.png.
13. Severity 1. A reply saying it selected five nodes has no "Selected 5 nodes" line, while others do.
    detour-2/03.png.
14. Severity 1. The run's Style tab says 0 to 16120 where the key and Values say 16,124. success/06.png.
15. Severity 1. Quick actions finds nothing for "ask", the word on the composer. detour-3/09.png.
16. Severity 1. "Stopped. Changes taken back." on a turn that changed nothing. keyboard, near the end.
17. Severity 1. A notice "Undid Show me those 7 genes." showed with the panel open, beside the row's
    Undone. Settled only for a turn's change notice; check whether it covers Undo. detour-1/07.png.
18. Severity 0. The Stop's cancelled call prints as a failed request (net::ERR_ABORTED): the app
    aborting its own fetch, not a fault.

The selection left by a reply and carried into the next message is known from the answer key
(severity 2, kept for T92 A); here it is the setup of defects 1 and 4.

## Not shown by this build

The model never gave a wrong count as a plain fact on the success path. "Trap fired" here depends on
detour 2's state, and the reply there is not a stable one: three walks with a selection on gave 7, 7
and "at least 6".
