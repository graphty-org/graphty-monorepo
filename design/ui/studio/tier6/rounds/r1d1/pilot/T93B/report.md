# Pilot walk: T93 B, take the genes outside the big tangle out for good (targeted re-walk)

Build 48879618c4, served from `.study-builds/tier6-r1d1-48879618c4`, live Gemini 3.8 Flash, start
`setup:connected-yeast.txt`. Screenshots are under
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/T93B/ (written below as
`<walk>/<n>.png`). The walks of the previous build, 3549e11129, moved unchanged to
/home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1-build-3549e11129/pilot/T93B/,
because the tool refuses a folder that already holds a session; this pass replayed from there. Every
walk's `session.json` names commit 48879618c4. The data stayed yeast-galactose.graphml on every walk:
331 nodes and 361 edges before Remove, 249 and 298 after (`data.json` of each walk).

Result: nothing crashed and nothing blocked the task, which was reached on every walk, by pointer and
by keyboard. The request read "Remove 82 nodes and 63 edges?" with one chip, 82, every time. One new
defect can spoil a grade: after Remove has worked, the same request can come a second time, and the
words around it say nothing was deleted (defect 1). It came unasked on 1 of the 10 removals made on
the task's own wordings, on the keyboard walk.

Model calls: success 5, keyboard 6, detour-1 9, touched-10 4, touched-22 13, touched-23 8,
touched-28 14, touched-36 4, touched-37 7, second-request-1 5, second-request-2 4, second-request-3 6,
second-request-4 6.

## Routes walked

| Route                                               | Folder     | Result |
| --------------------------------------------------- | ---------- | ------ |
| T93B success path                                   | success    | reached, 249 and 298; Undo gives 331 and 361 |
| T93B keyboard                                       | keyboard   | reached by keys alone, 249 and 298, then a second request (defect 1) |
| T93B detour-1: Change this, ask why, Keep them      | detour-1   | kept, 331 and 361 |
| T93B detour-3: chip click                           | touched-10 | selects 82 nodes only; Remove gives 249 and 298; matched the earlier walk to the end |
| T93B detour-3: Send again                           | touched-22 | works, after a real failed message; 249 and 298 |
| T93B detour-2: a message while a request waits      | touched-23 | words stay; asking again gives the card; 249 and 298; matched to the end |
| T93B detour-3: stray selection, Send again          | touched-28 | the failure came this time; Send again reached the card; 249 and 298 |
| T93B detour-2: Open run, Values                     | touched-36 | Groups 26, Largest 10; 249 and 298 |
| T93B keyboard: the status line                      | touched-37 | "26 groups" heard; 249 and 298 |

Added to pin defect 1 down, none asked for: second-request-1 and second-request-2 (the plain route
again, by pointer and by keys; no second request), second-request-3 (a message asking for a check
after the removal, answered Keep them), second-request-4 (the same message, answered Remove).

## Success path, by pointer (success/)

1. Assistant, the request with the lab mate's guess, Enter. The reply gave 249 and 82 and said nothing
   had changed. The section above the composer read "Remove 82 nodes and 63 edges?", "Undo can bring
   them back.", one chip 82, Remove, Change this, Keep them. Remove was the one primary button and
   Send was quiet. Nothing had changed on the canvas (03.png).
2. Hovering 82 lit only the small pieces, without selecting them (04.png).
3. Steps opened to Separate pieces, Catalog and Edit data (07.png). The replay stopped here only
   because this reply took 3 steps where the recorded one took 2.
4. Remove. Overview 249, 298, Components 1. Both replies stayed, with "Removed 82 nodes and 63 edges",
   Open run and Undo (08.png). The Data place read the same (09.png).
5. Composer keys: Enter when empty does nothing (10.png); Tab goes to the model label (11.png); Escape
   keeps typed text ("abc" still there on 12.png).
6. Undo brought back 331 and 361 and the row read Undone. The 82 came back selected, as decided
   (13.png).

## Mismatches with the answer key

None on the success path: 82 and 63 on the request, "Undo can bring them back.", one chip of 82, 249
and 298 if removed, 331 and 361 if kept, the three buttons, and a path of four or five steps.

The key does not cover a second request after Remove (defect 1). If that report is graded on what the
network holds, a reader who answers it Keep them and believes the screen's words fails through no
fault of theirs.

## Keyboard walk (keyboard/, started --keys --sr, reached the end)

Focus fell to the page body only at the start, where the setup leaves it by design.

Tab from the top: Main menu, Project: yeast-galactose, Undo (disabled), Redo (disabled), Graph.
ArrowDown to Assistant, Enter: textbox "Message the assistant". After the message the panel read as
below by `--read`: the request's title as text, button "82 nodes, select", Remove, Change this, Keep
them.

Shift+Tab from the composer, as decided: Keep them, Change this, Remove, "82 nodes, select", Undo,
Open run, "3 steps" collapsed, region "Conversation". Enter on the steps opened them. Tab forward:
Open run, Undo, the chip, Remove, Change this, Keep them, the composer, "Gemini 3.8 Flash", Talk.
Escape in Talk and in the composer did nothing and kept the request. ArrowRight on the chip stays on
it, as there is only one. Enter on Remove: focus moved to the composer, the region said "249 nodes,
298 edges", "Working", and then, in place of "Answer ready", "Waiting for your approval: Remove 82
nodes and 63 edges?" (40.png). Tab from there went to "Gemini 3.8 Flash". `data.json`: 249 and 298.

## Routes the fixes touched

**Change this, ask why, Keep them (detour-1/).** Change this took focus to the composer and started a
turn (03.png). Both replies stayed, with "Declined. Nothing changed." (04.png). "Why is it not about
twenty?" gave the breakdown 7, four of 5, four of 4, seven of 3, nine of 2, which adds to 82, and
colored the drawing, with a key card of Group 1 to Group 8 and Other 47 (05.png, 06.png). That turn
ran past the 20 seconds allowed, so the next message's Enter did nothing and its text waited in the
composer (06.png); a second Enter sent it. The card came back, with one chip (07, 08.png). Keep them
left 331 and 361 and both replies (09.png).

**Chip click (touched-10/).** The chip selected 82 nodes and no edges; Remove gave 249 and 298, nothing
left selected, scope Whole graph (04.png).

**A message while a request waits (touched-23/).** The first reply stayed, with "Not run: you sent a
new message." under it, and the question was answered, 25 pieces and 82 genes (03.png). Asking again
brought the card (04.png), and Remove gave 249 and 298 with every word still there (05.png).

**Send again (touched-22/).** A right-click selected an edge. The model cleared it, reported 26 pieces
and asked in words, so no failure came on its own. With the provider moved to OpenAI and a made-up key,
"Yes, remove them for good." failed: "Could not reach OpenAI: the connection failed.", Nothing changed,
Send again (06.png). Back on Google, Send again left the first reply and the failure in place and
reached the card (09.png). Remove gave 249 and 298 (10.png).

**Stray selection, Send again (touched-28/).** The route replayed to the request. This time the failure
came by itself: "Edit data failed.", "Nothing changed.", Send again, the reply saying the scope was
limited to a single edge, under a scope line reading Whole graph, and the message back in the
composer (09.png). Send again went across the whole graph and reached the card; the failure's words
stayed (10.png). Remove gave 249 and 298 (11.png). The previous pass could not reach this failure
without a made-up provider, so no separate walk was needed.

**Open run, Values (touched-36/).** The replay matched through the card. Open run landed on the blank
Style tab as before (09.png). Values read Groups 26, and the list is headed Largest 10, Group 1 249 to
Group 10 4 (10.png). Clicking the active rail button and Open came back to the request (11, 12.png).
After Remove the run shows "Data changed since this run" and Rerun beside its 26 (13.png), which is
true of the run.

**The status line (touched-37/, started --keys --sr).** Control+I reached the composer. A question
about the pieces was heard as "Connected components finished: 26 groups", then "Computed Separate
pieces for 331 nodes. Answer ready". The request was heard as "Waiting for your approval: Remove 82
nodes and 63 edges?". Shift+Tab three times, Enter on Remove: "249 nodes, 298 edges", "Working",
"Removed 82 nodes and 63 edges. Answer ready".

## Defects

Severity 0 to 4, each from the walk named. Defect 1 alone can spoil a grade.

1. **Severity 3. After Remove has worked, the same request can come again, and answering it Keep them
   gets a false report.** keyboard/40.png: the network reads 249 and 298 and the turn reads "Removed 82
   nodes and 63 edges", yet the section above the composer reads "Remove 82 nodes and 63 edges?" with
   Remove, Change this, Keep them and no chip, and the reply asks the reader to confirm. It came unasked
   on 1 of the 10 removals on the task's wordings, and on 2 of 2 when the message asked for a check
   after the removal (second-request-3/04.png, second-request-4). That screen's reply says "nothing has
   been deleted yet".
   - Remove on the second request: harmless. The reply then reports 249 genes in one piece, 249 and 298
     (second-request-4/04.png).
   - Keep them on the second request: the reply says "no changes were made" and "The network still
     contains 331 genes across 26 separate pieces", and the row reads "Declined. Nothing changed.",
     beside an Overview of 249, 298 and Components 1 (second-request-3/05.png). A reader who trusts that
     reports the genes stayed, against the network. The removal did happen.
   - Mechanism, read in the source: `runInTransaction` and `largePreview` in
     `graphty-element/src/ai/ToolExecutor.ts` add the message's running totals to each batch's own
     measure and hold the batch when the sum is large, without asking whether the batch itself changes
     anything. An approved removal stays in `totals` for the rest of the message, so the model's next
     batch, even a read, is held, and its card shows the totals: the removal already done. The steps
     show it: "Query data" is the step with no time, as a held step has (keyboard/40.png,
     second-request-3/04.png). The model is then told its read needs approval, which is why it says
     nothing was deleted.
2. **Severity 1. "Selected 0 nodes" is drawn as a change line.** touched-22/06.png. `decided.md` says a
   selection of nothing draws no line. It appears when the model clears a stray edge, beside Undo.
3. **Severity 1. A turn that colored the drawing says only "Changed the graph".** detour-1/06.png.
4. **Severity 1. "Declined. Nothing changed." goes from the turn after the next message.**
   detour-1/04.png has it under Open run; detour-1/05.png does not. "Not run: you sent a new message."
   stays through the next message (touched-23/05.png), so the two rows behave differently.
5. **Severity 1. After a message the conversation can stop short of the newest reply.** detour-1/07.png:
   the card arrived and the panel stayed on the previous turn, with "Jump to newest" over it, so the
   reader's own message and the reply were below the fold (08.png after the jump). Mechanism not
   traced.
6. **Severity 1. Enter while a turn is running does nothing and says nothing.** detour-1/05.png,
   06.png: Stop stands where Send was, and the typed message waits in the composer unsent after the turn
   ends, with nothing to say it was not sent.
7. **Severity 1. The failed turn's reply tells the reader to clear a selection that is already gone.**
   touched-28/09.png: "Please clear your selection" under a scope line reading Whole graph. Send again
   beside it works, so it does not block.
8. **Severity 1. The undo notice shows with the panel open and is cut off at both ends.**
   success/13.png: it quotes the reader's message across the canvas, over the drawing. `decided.md` keeps
   a turn's notice for a closed panel.
9. **Severity 1. The reply and the card disagree on whether this can be undone.** touched-22/09.png: "an
   irreversible change" in the reply, "Undo can bring them back." on the card. The model's word; the
   card's is right.
10. **Severity 1. Open run lands on a blank pane.** touched-36/09.png: the Style tab of Connected
    components is empty, and the reader must find Values.
11. **Severity 1. Two controls can be called "82 nodes, select".** touched-22/09.png, touched-37 step 3:
    a turn with a chip row beside the request has that chip and the card's, with nothing to tell them
    apart.
