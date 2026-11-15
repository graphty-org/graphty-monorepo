# Dry run on the tier 6 study build 48879618c4

This replaces the triage of build 3549e11129 that had this file name; that text is at commit e9ed843c6f. Pilots walked each task's success path and the routes the earlier fixes were meant to touch. Screenshots are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/, written here from the task folder down. Walks of the earlier build moved to the folders beside it named for that build.

The dry run makes the build ready for sessions and does not polish it: a row is fix now only if it crashes, blocks a task by every reasonable route, or spoils grading.

|                        | Rows                                                                  |
| ---------------------- | --------------------------------------------------------------------- |
| All lines              | 63 (6 of them notes, not defects)                                     |
| Fix now                | 15 (crashes 0, blocks 0, spoils 15; regressions 0, repeats 13, new 2) |
| Decided, no change     | 1 (no decision reversed)                                              |
| Backlog (`backlog.md`) | 40                                                                    |
| Left for the sessions  | 1                                                                     |

## What the pass found

This build is the previous build under a new name. `git diff 3549e11129 48879618c4` over graphty, graphty-element, compact-mantine and the lockfile is empty, so the three fixes the earlier triage ordered were never built, and thirteen of the fifteen fix-now rows are those three faults seen again. No crash and no blocked task on any route, and nothing here is a regression, since nothing changed.

The two new faults came from walking the same code harder. After a reader approves a removal, the next step of the same message can raise the same request again, over a network that has already lost the genes; answering Keep them gets a reply saying nothing changed. And the x on the scope line, the one remedy T92 A offers, did not bring the file's count once a fact had been asked: the model kept to its earlier narrowed answers on 3 of 3 walks. The earlier triage sent that second one to the backlog because the replies still held a seven; two of these three hold none, and the key now marks the reader F through no fault of theirs.

A freeze needs a source diff. Build the five units below, check the diff is not empty, then freeze.

## Fix-now units

### A message stops being about a selection once the selection is gone, and a selection does not hide a turn's chip (`chip-row`, graphty-element)

Rows: T91B row 2, T91B row 3, T92A row 2, T92A row 3, T92A row 4, T92A row 8, T92B row 2, T92B row 3, T92B row 4, T93B row 2.

decided.md: 'A message is limited to its selection only while that selection holds something' and 'A selection is not a change to the graph'. Sent by the earlier triage and never built, and before that rejected as an app-only fix. Element first, then the app. In graphty-element, settleTarget (fields.ts) narrows every target to the ids bound when the message was sent, and runChecked (ToolExecutor.ts) hands it those ids whatever the selection is now. So once the model clears the selection the line reads Whole graph while reads come back 'No matches.', and an answer inherits the same ids, because `bound` is copied into the run, the hold and the question (AiController.ts). End the binding the moment the selection is empty, for the rest of that message: take it off the message state, so a later select cannot bring the old ids back and a hold or question saves none. The facts line was written at send, so select's result must tell the model the message is now about the whole graph. While the selection holds anything, nothing changes: every target stays limited to it, and T92 A's 6 of 9 depends on that. Then in graphty bring back 2e760cfa8e with its test (reverted by baeb532d60): a selection is not a change, so a turn whose only changes are selections shows its lines and its chip row; the row is the last result that found something, else the last empty one; a selection of nothing draws no line. Write the element test first. Do not refuse the model's clear: a reader may ask for it, and the offered 'Apply to the entire graph' would stay dead.

Shared part: The element's one binding: every tool reads it through settleTarget and runChecked. Fixed and tested there, not in the panel, which is why the app-only fix was rejected.

Acceptance: A test in graphty-element, on a message bound to a selection: after a clear a where read counts the whole graph; a select after the clear does not narrow to the old ids; a question asked after the clear and then answered runs unbound; with the selection left alone a read stays limited to it. The app test from 2e760cfa8e passes. Walked: T92B/success/07.png and T92B/touched-31/04.png's turn gives 7 with a chip or a found row and no 'Selected 0 nodes'; T92B/touched-31/05.png and T92A/keyboard/54.png's selecting turn shows its chip and Show in table; T92A/touched-33/04.png shows a chip row and no 'Selected 0 nodes'; T92A/touched-29/05.png's 'Yes, apply it to the entire graph' colors the 7; T91B/touched-27-48879618c4/11.png's 'Apply styling to the entire graph' paints the nine; T92A's Selection 14 start still reads 6 of 9, since the selection holds something.

Routes to walk again: T92B success path, fact 2; T92B touched-31: fact 2 with fact 1's selection on; T92B touched-32: Selection 5, then the scope x; T92B touched-6: a stray selection under fact 1; T92A success path, fact 2; T92A touched-33: fact 2 after fact 1 selected; T92A touched-29: failed message, x, Send again; T92A touched-19: stray edge, color request; T92A detour-1: the 14 left selected (reads stay limited); T92A keyboard; T91B touched-27: stray selection, answer the question; T91B touched-27-send-again; T91B detour-2: asking first; T93B touched-22 and touched-28: stray edge; T95A keyboard: a question answered under a selection; T95B success path (an empty result alone still shows its row); T90A touched-26.

### What the reader approved stops counting toward the next request (`approved-count`, graphty-element)

Rows: T93B row 1.

decided.md: 'What the reader approved stops counting'. runInTransaction adds each batch's measure to the message's running totals, and largePreview (ToolExecutor.ts) holds a batch when totals plus its own measure pass a limit, without asking whether the batch did anything. An approved batch's removal stays in the totals, so the model's next batch, even a read, is held, and its card repeats the removal already done. The model is told its read needs approval and writes 'nothing has been deleted yet'; Keep them then gives 'Declined. Nothing changed.' beside a network that lost 82 genes. Fix: when a batch ran under an approval, the totals restart at zero instead of adding it. Then a read measures nothing and passes, and a later batch is held only for what it does itself, with a card counting only that. A second large removal is still held. Update the sentence in design/ai/assistant-coverage-design.md 4.2 that says the totals run for the whole message, and the comment on `totals` at ToolExecutor.ts line 99.

Acceptance: A test in graphty-element drives a message through a held removal and Remove: the next batch, a read, is not held; a small write after it is not held; a further removal past a limit by itself is held and its preview counts only that removal. Walked: the route of T93B/second-request-3/04.png, with Remove on the first request, reaches a reply reporting 249 genes in one piece with no second request; T93B/keyboard/40.png's status reads 'Answer ready'.

Routes to walk again: T93B success path; T93B keyboard; T93B detour: a message asking for a check after the removal (second-request-3); T93A success path: Remove; T93B touched-23: a message while a request waits.

### A message about the whole graph after one about a selection reads afresh (`scope-change`, graphty-element)

Rows: T92A row 1.

decided.md: 'A message about the whole graph after one about a selection reads afresh'. After the x, the message goes out as whole graph and the facts line says so, but nothing tells the model its earlier answers were narrowed: it repeats them with no tool call, or adds a condition it used earlier (kind person) by itself. Saved messages already keep their scope (snapshot.ts, AiMessageScope). When a message's scope is the whole graph and an earlier message in the conversation was about a selection, add to the scope line in prompt.ts, with no domain word: earlier answers and conditions in this conversation were limited to a selection, so read again and add no condition the reader did not ask for in this message. Nothing else changes: earlier turns stay in what is sent, since 'those' needs them. A prompt line can only lower the odds; if it does not hold, the key's Build decided line stays and the report gives both numbers. last-read edits the same file: its line is in assistantInstructions, this one in scopeLine.

Shared part: The element's one facts block, read by every consumer's assistant.

Acceptance: A test in graphty-element: a whole-graph message after a selection message carries the line; a first message, and a whole-graph message after whole-graph messages, do not. Walked on three fresh runs of the x after fact 1: T92A/success/10.png, T92A/touched-16/05.png and T92A/keyboard/54.png's replies each come from a read, not from memory, and at least two of the three give 7 of the 12. All three staying on six fails the unit.

Routes to walk again: T92A success path: x after fact 1; T92A touched-16: donations, bridge, x, donations; T92A touched-13: x before the first message; T92A keyboard; T92B touched-32: Selection 5, then the scope x.

### What the Assistant exports is what the message is about (`export-scope`, graphty-element)

Rows: T95A row 2.

decided.md: 'What the Assistant exports is what the message is about'. Sent by the earlier triage and never built. export_graph has no target and passes no scope, so every file holds the whole graph while the reply says it holds the selection, although exportSession takes a scope. Give the tool the same targetFields as the other tools and settle them the same way: a named target; else, on a bound message, all of the selection; else the whole graph. ExportScope cannot name ids, so add `{ nodes }` to it (additive; run api:report). exportSession hands the project format to exportProject, which ignores scope, so a call that narrows a format that cannot narrow is refused rather than writing everything. Say in the tool's description that it writes the target. Check the renderer path (Graph.exportGraph) passes the scope through.

Acceptance: A test in graphty-element reading the written document: a message bound to 5 of the 24 volunteers exports 5 node rows and only the edges between them; a named target does the same; the unbound call with no target writes 24; the project format with a target is refused. Walked: T95A/detour-2-48879618c4/downloads/volunteers_csv.csv and T95A/touched-39-48879618c4/downloads/volunteers_csv.csv hold a header and five rows under the same reply as T95A/detour-2-48879618c4/10.png.

Routes to walk again: T95A detour-2: export a file; T95A touched-39: answer the format question, then the file.

### The read a reply rests on comes last (`last-read`, graphty-element)

Rows: T91A row 1, T92A row 6.

decided.md: 'The chip row stays the turn's last result that found something'. Sent by the earlier triage and never built. The chip row is the turn's last result that found something, which decided.md keeps, and the row may not read the model's prose. The model tends to end on a complement or a subset, so 'There are 9' sits over the 15 who have finished, and Show in table goes to them. Add one line to assistantInstructions, for every profile and with no domain word: the reader sees the last read that found something beside the reply, so when a reply states a count, the read that found that count comes last, run again if need be. Nothing else changes: no new field, no second chip. scope-change edits the same file, in scopeLine.

Shared part: The element's one system prompt, read by every consumer's assistant.

Acceptance: The line is in assistantInstructions for both profiles, with a test. Walked on three fresh asks of T91 A's question and of T92 A's fact 2 and one of T92 B's: T91A/detour-2/03.png's row reads 9 and its Show in table goes to those nine; T92A/success/10.png's row reads 7 or 12. The model's order varies, so one wrong row in three does not fail the unit: it stays in the key as Build decided. All three failing does.

Routes to walk again: T91A detour-2: the question, then Show in table, then make them stand out; T92A success path, fact 2; T92A touched-13: x, then fact 2, chip and Show in table; T92A keyboard; T92B success path, fact 2; T91B detour-2: asking first; T95A detour-2: the chip under a guess.

## The answer key after these fixes

`answers.md` describes this build, defects included, so match it to the next frozen build before any session:

- T91 A: the line on a chip of 15 under a reply of 9 stays until the walks show how often it still comes.
- T92: the lines on 'Selected 0 nodes', on 'at least 6' and on a selecting turn having no chip should go.
- T92 A: the lines on the x keeping six go if `scope-change` holds; if it does not, they stay with their `Build decided` and the report gives both numbers.
- T91 B and T93 B: the stray selection routes reach a working reply through an answer.
- T93: nothing to add if `approved-count` holds; the key never covered a second request.
- T95: a file now holds what the message was about, so a grader can read the downloads folder. The line on 24 rows under Selection 5 should go.

## Every row

Class: fix now (the unit named), decided, backlog, sessions, or note. Origin is given for fix-now rows; a repeat is a problem the earlier triage already sent to be fixed.

### T90A

1. Severity -, all: No new defect, and none crashes, blocks the task or spoils its grading; the rest are carried over unchanged. **note.** The pilot's summary line, not a defect.
2. Severity 2, success, touched-26, touched-30: The Select step moves the camera and cuts nodes off at the left and bottom of the canvas. **backlog, friction.** Carried. No value or node is wrong; Fit recovers. [T90A/success/14.png]
3. Severity 2, success, touched-26, touched-30: One measure has two names, 'Computed Reach' and step Reach against Closeness in the key card, inspector and reply. **backlog, wording.** Carried. The study's answer does not hang on the name. [T90A/success/15.png]
4. Severity 2, touched-26: Closing the conversations list replays each earlier failure as a notice, three at once. **backlog, friction.** Carried. Nothing is lost and the notices go. [T90A/touched-26/07.png]
5. Severity 2, touched-26: Send again stacks a duplicate question and failure each time. **backlog, friction.** Carried. answers.md calls pressing it a wrong turn; the model label still leads on. [T90A/touched-26/05.png]
6. Severity 2, touched-26: Forget key has no confirmation or notice. **backlog, friction.** Carried. Retyping recovers. [T90A/touched-26/08.png]
7. Severity 1, touched-26: After Forget key and Save, New conversation is undone and the failed conversation returns. **backlog, friction.** Carried. The next message still works. [T90A/touched-26/10.png]
8. Severity 1, touched-26: 'Stopped. Changes taken back.' when nothing had changed. **backlog, wording.** Carried. Harmless wording. [T90A/touched-26/13.png]
9. Severity 1, success, touched-30: With a selection the placeholder still reads 'Ask about this graph' over the scope 'Selection 1'. **backlog, wording.** Carried. The scope line above it is right. [T90A/success/14.png]
10. Severity 1, touched-42: The whole page sits 1 px higher after some focus moves. **backlog, cosmetic.** Cosmetic. [T90A/touched-42/18.png]
11. Severity -, touched-26: Not reached on this build, so neither can be called fixed: 'Selected 0 nodes' and the second scrollbar with the steps list open did not appear, but this reply had 2 steps where the earlier one had 7. **note.** A route note. Both rows stand elsewhere in this file; the code did not change. [T90A/touched-26/18.png]

### T91A

1. Severity 3, detour-2: The chip and Show in table can back the opposite group: a reply of 9 over a chip of 15, and Show in table selects the 15 who HAVE finished, on 1 of 2 runs. **fix now, spoils, `last-read`, repeat.** answers.md: a reader who reports 15 is F, Build decided: yes. The pilot reads this as the prompt line not holding; the line is not in the build, so it has never been tried. The row itself stays as decided. [T91A/detour-2/03.png, 04.png, 05.png, T91A/detour-2-plain/03.png]
2. Severity 2, detour-2: Selection 15 stays as the scope, so 'Make them stand out' ended in 'Style failed. Nothing changed.', with no reason shown anywhere. **backlog, friction.** Nothing was painted on the wrong people, and the scope x then Send again is a way out the screen offered, as answers.md records. Follows from the row above. The missing reason joins first in line. [T91A/detour-2/07.png, 08.png, 11.png]
3. Severity 1, detour-2: After that recovery the model only resized the nine, to the top of the ranking's own range, with no color, so they barely read apart. **backlog, friction.** The model's act. The reader can see it and ask for more, which answers.md puts on the path. [T91A/detour-2/11.png, 12.png]
4. Severity 1, detour-2-plain: 'Sized 9 nodes' appears twice in one reply when the model writes size twice. **backlog, wording.** True both times. [T91A/detour-2-plain/06.png]

### T91B

1. Severity -, all: The frozen build 48879618c4 holds no app change from 3549e11129, so decided.md's rules on a selection that empties are not built. **note.** True, and the reason thirteen rows below are repeats. Not a defect of the product.
2. Severity 3, detour-3: stray selection: A false count under a line reading Whole graph: with an edge left selected the model cleared it, then the reply said a rule matched zero nodes although nine match, with 'No matches.' four times and nothing painted. **fix now, spoils, `chip-row`, repeat.** decided.md, 'A message is limited to its selection only while that selection holds something'. The build holds none of the earlier triage's fixes, so this row measures the same code again. [T91B/touched-27-48879618c4/10.png, 11.png, 12.png]
3. Severity 2, detour-3: stray selection: 'Selected 0 nodes' still draws as a change line, and the model still clears the reader's selection unasked. **fix now, spoils, `chip-row`, repeat.** decided.md, "a selection of nothing draws no line". The unit that builds it was sent by the earlier triage and never built, so this is that unit again. The clearing itself stays in the backlog as the model's act. [T91B/touched-27-48879618c4/10.png, T91B/touched-27-send-again-48879618c4/03.png]
4. Severity 1, detour-3: stray selection: A bare 'No matches.' four times, not saying what found nothing, with no way forward. **backlog, wording.** Same turn as the false count; a next message recovers. [T91B/touched-27-48879618c4/11.png]
5. Severity 1, tool: The study tool: a walk folder under the main checkout needs REAL_TIER=6; --replay calls a console error that differs only by port a divergence; --start refuses a folder holding screenshots. **backlog, friction.** The tool, not the app. Each has a route past it, and none touches a session.

### T92A

1. Severity 3, success, touched-16, keyboard: After fact 1, the x did not bring the whole-graph count on 3 of 3 walks: the model kept to its earlier turns, once adding kind person itself and once with no tool call. Recovery needs a new conversation or the words 'whole graph'. **fix now, spoils, `scope-change`, new.** answers.md: a reader who pressed the x and reports 6 is F, Build decided: yes. The scope line's own remedy does not work, so T92 A's Scope noticed measures the model's memory. The earlier triage sent this to the backlog while the replies still held a seven; two of these three hold none. [T92A/success/10.png, 13.png, T92A/touched-16/05.png, T92A/keyboard/54.png]
2. Severity 3, touched-33: Fact 2 arrives with nothing behind it: 7 of the 12, 'Selected 0 nodes' twice, no chip, no Show in table. **fix now, spoils, `chip-row`, repeat.** answers.md: a right fact 2 with only that reply behind it is F, Build decided: yes. The build holds none of the earlier triage's fixes, so this row measures the same code again. [T92A/touched-33/04.png]
3. Severity 3, touched-29: After the model clears the selection, 'Yes, apply it to the entire graph' ends 'the current selection scope prevented targeting the 7' under a line reading Whole graph. **fix now, spoils, `chip-row`, repeat.** decided.md, 'A message is limited to its selection only while that selection holds something'. The build holds none of the earlier triage's fixes, so this row measures the same code again. [T92A/touched-29/05.png]
4. Severity 3, keyboard: A turn that only selected shows no chip: 'Selected 6 nodes', no chip, no Show in table. **fix now, spoils, `chip-row`, repeat.** decided.md, 'A selection is not a change to the graph, so it does not hide a turn's chip row'. The build holds none of the earlier triage's fixes, so this row measures the same code again. [T92A/keyboard/54.png]
5. Severity -, all: The frozen build holds no app code change from 3549e11129; Send again following the scope line could not be checked, since nine sends produced no failure row. **note.** True. The Send again rule was walked and held on T93 B touched-28.
6. Severity 2, success, keyboard: The chip can back a different number from the reply's: 9 under 6 of 9, 12 under 7 of 12, so the chip selects the on-record set, not the donors. **fix now, spoils, `last-read`, repeat.** answers.md: a right fact 2 with only a row of 5 or 9 behind it is F, Build decided: yes; a row of 12 does back the fact. Same unit as the earlier triage's 5 under 7. The build holds none of the earlier triage's fixes, so this row measures the same code again. [T92A/success/10.png, T92A/keyboard/76.png]
7. Severity 2, success: The reply names s10 as the source 'across the network' while the run it computed has s20 first at 67.68. **sessions.** The task's own trap: the key grades it by Trap fired and Taken on trust, and Open run is how a reader catches it. [T92A/success/04.png, 06.png]
8. Severity 2, touched-19, touched-29: 'Selected 0 nodes' drawn as a change line on a reply that changed nothing. **fix now, spoils, `chip-row`, repeat.** decided.md, "a selection of nothing draws no line". The unit that builds it was sent by the earlier triage and never built, so this is that unit again. [T92A/touched-19/09.png, T92A/touched-29/08.png]
9. Severity 2, touched-29: 'please clear your selection and ask again' under a line already reading Whole graph. **backlog, wording.** A next message recovers. It has the chip-row unit's cause, so check on the re-walk that it has gone. [T92A/touched-29/08.png]
10. Severity 2, touched-33, keyboard: The model selects on a plain question, and that becomes the next message's scope. **backlog, friction.** Carried; first in line. The screen says what happened and a next message recovers. [T92A/touched-33/02.png, T92A/keyboard/19.png, 54.png]
11. Severity 1, success: Two scrollbars once the conversation is long. **backlog, cosmetic.** Carried. The panel still works. [T92A/success/16.png]
12. Severity 1, success: Open steps give two controls one name, '9 nodes, select' and '12 nodes, select'. **backlog, accessibility.** Carried. Only a screen-reader user meets it. [T92A/success/12.png]
13. Severity 1, success: Two change lines and one Open run, so the 14-node Betweenness run cannot be opened from the turn. **backlog, friction.** Carried. answers.md: Open run is the 24-node run, which holds the answer. [T92A/success/06.png]
14. Severity 1, keyboard: Enter on a Top 10 row moves focus to tab 'Values' because the row goes, so a keyboard reader lands above the list. **backlog, accessibility.** Only a keyboard user meets it. [T92A/keyboard/49.png]
15. Severity 1, keyboard: Control+I closes the panel with focus on tab 'Values', not the Assistant rail button. **backlog, accessibility.** Carried. Only a keyboard user meets it; Control+I reopens the panel. [T92A/keyboard/75.png]

### T92B

1. Severity -, all: The frozen build 48879618c4 holds none of the fix pass: the binding fix and the chip row fix were never committed. **note.** True, and the reason these rows are repeats.
2. Severity 3, success path, touched-31: With fact 1's selection on, fact 2's first answer is 'at least 6 genes', with no chip and no Show in table, and 'Selected 0 nodes', on 2 of 2 walks. **fix now, spoils, `chip-row`, repeat.** answers.md: a report of 6 or at least 6 is F, Build decided: yes. On the success path. The build holds none of the earlier triage's fixes, so this row measures the same code again. [T92B/success/07.png, 08.png, T92B/touched-31/04.png]
3. Severity 2, touched-31: A turn that selects its answer has no chip: 'Exactly 7 genes' with 'Selected 7 nodes' carries no chip and no Show in table, even in its steps. **fix now, spoils, `chip-row`, repeat.** decided.md, 'it does not hide a turn's chip row'. The fix was reverted and the unit that replaces it was not built. [T92B/touched-31/05.png, 06.png]
4. Severity 2, success, touched-31, touched-6: 'Selected 0 nodes' still draws under an answer. **fix now, spoils, `chip-row`, repeat.** decided.md, "a selection of nothing draws no line". The unit that builds it was sent by the earlier triage and never built, so this is that unit again. [T92B/success/07.png, T92B/touched-31/04.png, T92B/touched-6/12.png]

### T93A

1. Severity 2, touched-20: A 9 chip with Show in table sat under words saying 7 people and 3 untrained, on one of three walks; the request still says 7. **decided.** decided.md, 'The chip row stays the turn's last result that found something'. The request, not this row, is what T93 grades. The last-read unit lowers its odds. [T93A/touched-20/04.png, 06.png]
2. Severity 1, touched-20: The Jump to newest pill lost its box and lay over the transcript's text just after Keep them, while the card was going. **backlog, cosmetic.** Same as on the earlier build; it clears as the card goes. [T93A/touched-20/09.png]
3. Severity 1, touched-12: The request's count chip has no pointer cursor and no tooltip on a button whose click selects. **backlog, cosmetic.** The click works. [T93A/touched-12/06.png]

### T93B

1. Severity 3, keyboard, unasked, 1 of 10 removals on the task's wordings; 2 of 2 when the message asks for a check after the removal: After Remove has worked, the same request 'Remove 82 nodes and 63 edges?' comes again, with the network already at 249 and 298. Keep them then gives 'no changes were made', 'still contains 331 genes' and 'Declined. Nothing changed.' beside an Overview of 249 and 298. **fix now, spoils, `approved-count`, new.** On the task's success path, and T93's grade is the report agreeing with the network: a reader who trusts the screen reports the genes stayed. Confirmed in source and on second-request-3/05.png: an approved batch stays in the message's totals, so the next batch, even a read, is held and its card shows the removal already done. [T93B/keyboard/40.png, T93B/second-request-3/04.png, 05.png, T93B/second-request-4/04.png]
2. Severity 1, touched-22: 'Selected 0 nodes' is drawn as a change line beside Undo. **fix now, spoils, `chip-row`, repeat.** decided.md, "a selection of nothing draws no line". The unit that builds it was sent by the earlier triage and never built, so this is that unit again. [T93B/touched-22/06.png]
3. Severity 1, detour-1: A turn that colored the drawing says only 'Changed the graph'. **backlog, wording.** The drawing and the key card show it. [T93B/detour-1/06.png]
4. Severity 1, detour-1, touched-23: 'Declined. Nothing changed.' goes from the turn after the next message, while 'Not run: you sent a new message.' stays. **backlog, wording.** The turn's words stay; the end row goes. Nothing false. [T93B/detour-1/04.png, 05.png, T93B/touched-23/05.png]
5. Severity 1, detour-1: After a message the conversation can stop short of the newest reply, with Jump to newest over it. **backlog, friction.** The pill is the way down. Mechanism not traced. [T93B/detour-1/07.png]
6. Severity 1, detour-1: Enter while a turn is running does nothing and says nothing; the typed message stays unsent in the composer. **backlog, friction.** Carried. The text stays and Enter after the run sends it. [T93B/detour-1/06.png]
7. Severity 1, touched-28: The failed turn's reply says to clear a selection that is already gone, under a line reading Whole graph; Send again beside it works. **backlog, wording.** It has the chip-row unit's cause, so check on the re-walk that it has gone. [T93B/touched-28/09.png]
8. Severity 1, success path, Undo: The undo notice shows with the panel open, quoting the reader's message across the canvas, cut off at both ends. **backlog, cosmetic.** decided.md keeps a turn's notice for a closed panel, so this is a gap, but the notice is true and goes by itself. [T93B/success/13.png]
9. Severity 1, touched-22: The model's reply says 'an irreversible change' while the card says 'Undo can bring them back.'. **backlog, wording.** The model's word; the card, which T93 grades, is right. [T93B/touched-22/09.png]
10. Severity 1, touched-36: Open run lands on a blank Style tab, and the reader must find Values. **backlog, friction.** answers.md records it; one more click. [T93B/touched-36/09.png]
11. Severity 1, touched-22, touched-37: Two controls can be called '82 nodes, select' when a turn's chip row sits beside the request. **backlog, accessibility.** Only a screen-reader user meets it. [T93B/touched-22/09.png]

### T94A

1. Severity 1, touched-38 (keyboard): Enter on the turn's Undo removes that button and focus lands on the top bar's disabled Undo; the next Tab reaches Redo. **backlog, accessibility.** Only a keyboard user meets it; focus stays on the page and the task is not spoiled. Seen on the earlier build too. [T94A/touched-38-keyboard-48879618c4/44.png]

### T95A

1. Severity -, all: git diff 3549e11129 48879618c4 over graphty, graphty-element and compact-mantine is empty, so differences between the two builds' walks are model variation. **note.** True, and it means every rule the second dry run settled is still unbuilt.
2. Severity 3, detour-2, touched-39: The exported file holds all 24 volunteers and every phone number under a scope line of Selection 5, with replies saying the node list was exported. **fix now, spoils, `export-scope`, repeat.** decided.md, 'What the Assistant exports is what the message is about'; answers.md: a report that offers that file as the list of a few is F, Build decided: yes. The build holds none of the earlier triage's fixes, so this row measures the same code again. [T95A/detour-2-48879618c4/downloads/volunteers_csv.csv, 'volunteers_csv (2).csv' beside it, T95A/touched-39-48879618c4/downloads/volunteers_csv.csv]
3. Severity 2, detour-2: 'Saved as a named set called Lowest Hours Volunteers' appears nowhere a reader can look. **backlog, friction.** T95 grades the report, and a set is not its result. Joins first in line. [T95A/detour-2-48879618c4/13.png, 14.png]
4. Severity 2, detour-2: 'Filtered to 5 of 24 nodes' leaves no trace in the Data place: five nodes drawn, Filters empty, Everything still 24. Undo is the only way back shown, and it works. **backlog, friction.** The way back works and the change line said what happened. Joins first in line. [T95A/detour-2-48879618c4/13.png, 14.png, 17.png]
5. Severity 2, keyboard: After Answer, focus goes to region 'Conversation', six Tabs from the composer. **backlog, accessibility.** Only a keyboard user meets it; Enter is harmless there. [T95A/keyboard-48879618c4/17.png]
6. Severity 1, keyboard: The spoken status 'Degree finished: v02 ranks first, 8' sounds like the answer, gives an id, and is for a run nobody asked for. **backlog, accessibility.** Carried. Only a screen-reader user meets it. [T95A/keyboard-48879618c4/11.png]
7. Severity 1, keyboard: The Undid notice quotes the whole message and ends in two periods; focus then lands on the top bar's disabled Undo. **backlog, accessibility.** Carried. Only a keyboard or screen-reader user meets it. [T95A/keyboard-48879618c4/22.png]
8. Severity 1, detour-2, touched-39: Nothing but the reply says a file was saved: no notice or line names it. **backlog, wording.** Carried. The browser shows the download. [T95A/detour-2-48879618c4/10.png, 12.png]
9. Severity 1, detour-2, keyboard: Open run lands on an empty Style tab; Values holds everything. **backlog, friction.** Carried. answers.md records it; not a step of T95. [T95A/detour-2-48879618c4/04.png, T95A/keyboard-48879618c4/14.png]
