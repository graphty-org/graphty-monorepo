# Dry run, second pass on the tier 6 study build

Build 3549e11129, frozen for the dry run's re-walks. Pilots walked each task's success path and the routes the first pass's fixes touched. Screenshots are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1d1/pilot/, written here from the task folder down. T92 A's report is not in the study's folder, so its rows rest on the pilot's list and the screenshots.

The dry run makes the build ready for sessions and does not polish it: a row is fix now only if it crashes, blocks a task by every reasonable route, or spoils grading.

|                        | Rows                                                               |
| ---------------------- | ------------------------------------------------------------------ |
| All lines              | 57 (4 of them notes, not defects)                                  |
| Fix now                | 9 (crashes 0, blocks 0, spoils 9; regressions 0, repeats 7, new 2) |
| Decided, no change     | 1 (no decision reversed)                                           |
| Backlog (`backlog.md`) | 41                                                                 |
| Left for the sessions  | 2                                                                  |

## What the pass found

The first pass's fixes held: no crash, no blocked task, and no regression. Three causes remain. The largest is the fix rejected after the first pass: a message stays limited to the selection it was sent with after the model has cleared that selection, so reads come back empty under a line reading Whole graph. Seven rows across T90 to T93 are that one cause and the 'Selected 0 nodes' line it leaves. Fixing the panel alone failed once already; the binding is in graphty-element.

The other two are new. An export ignores what the message is about, which only became visible once the first pass made files arrive. And the chip row can sit under a right answer with a different count, because the model's last read is often a complement of what it reports.

Pilots rated Open run doing nothing a 3. It is backlog here: on T95 it is not a step, the key says so, and every T92 walk that asked fact 1, where it would matter, kept its run. The mechanism is now read in source and written in the backlog.

## Fix-now units

### A message stops being about a selection once the selection is gone, and a selection does not hide a turn's chip (`chip-row`, graphty-element)

Rows: T90A row 3, T91B row 1, T91B row 2, T92A row 2, T92B row 1, T92B row 2, T93B row 2.

This refixes the unit rejected-fixes.md holds, element first, then the app. In graphty-element, settleTarget (fields.ts) narrows every target to the ids bound when the message was sent, and runChecked (ToolExecutor.ts) hands it those ids whatever the selection is now. So once the model clears the selection the line reads Whole graph while reads come back 'No matches.', and an answer inherits the same ids, because `bound` is copied into the run, the hold and the question (AiController.ts). End the binding the moment the selection is empty, for the rest of that message: take it off the message state, so a later select cannot bring the old ids back (T95A's 'Selected 2, 0, 2') and a hold or question saves none. The facts line was written at send, so select's result must tell the model the message is now about the whole graph. While the selection holds anything, nothing changes: every target stays limited to it, and T92 A's 6 of 9 depends on that. Then in graphty bring back 2e760cfa8e with its test (reverted by baeb532d60): a selection is not a change, so a turn whose only changes are selections shows its lines and its chip row; the row is the last result that found something, else the last empty one; a selection of nothing draws no line. Write the element test first. Do not refuse the model's clear: a reader may ask for it, and the offered 'Apply to the entire graph' would stay dead.

Shared part: The element's one binding: every tool reads it through settleTarget and runChecked. Fixed and tested there, not in the panel, which is why the app-only fix was rejected.

Acceptance: A test in graphty-element, on a message bound to a selection: after a clear a where read counts the whole graph; a select after the clear does not narrow to the old ids; a question asked after the clear and then answered runs unbound; with the selection left alone a read stays limited to it. The app test from 2e760cfa8e passes. Walked: T92B/touched-31/03.png's turn gives the count or a found chip with Show in table and no 'Selected 0 nodes'; T92A/touched-33/03.png shows a chip row and no 'Selected 0 nodes'; T91B/touched-27/12.png's 'Apply styling to the entire graph' paints the nine; T92B/success/07.png and T92A's Selection 14 start still read as before.

Routes to walk again: T92B success path, fact 2; T92B touched-31: fact 2 with fact 1's selection on; T92B touched-32: Selection 5, then the scope x; T92B touched-6: a stray selection under fact 1; T92A success path, fact 2; T92A touched-33: fact 2 after fact 1 selected; T92A touched-29: failed message, x, Send again; T92A detour-1: the 14 left selected (reads stay limited); T92A keyboard; T91B touched-27: stray selection, answer the question; T91B touched-27-send-again; T91B detour-2: asking first; T93B touched-22 and touched-28: stray edge; T95A keyboard: a question answered under a selection; T95B success path (an empty result alone still shows its row); T90A touched-26.

### What the Assistant exports is what the message is about (`export-scope`, graphty-element)

Rows: T95A row 1.

export_graph has no target and passes no scope, so every file holds the whole graph while the reply says it holds the selection, although exportSession takes a scope. Give the tool the same targetFields as the other tools and settle them the same way: a named target; else, on a bound message, all of the selection; else the whole graph. ExportScope cannot name ids, so add `{ nodes }` to it (additive; run api:report). exportSession hands the project format to exportProject, which ignores scope, so a call that narrows a format that cannot narrow is refused rather than writing everything. Say in the tool's description that it writes the target. Check the renderer path (Graph.exportGraph) passes the scope through.

Acceptance: A test in graphty-element reading the written document: a message bound to 5 of the 24 volunteers exports 5 node rows and only the edges between them; a named target does the same; the unbound call with no target writes 24; the project format with a target is refused. Walked: T95A/detour-2/downloads/volunteers_csv.csv and T95A/touched-39/downloads/volunteers_csv.csv hold a header and five rows under the same reply as T95A/detour-2/10.png.

Routes to walk again: T95A detour-2: export a file; T95A touched-39: answer the format question, then the file.

### The read a reply rests on comes last (`last-read`, graphty-element)

Rows: T92A row 1.

The chip row is the turn's last result that found something, which decided.md keeps, and the row may not read the model's prose. The model tends to end on a complement or a subset, so '7 of the 12' sits over the 5 who gave nothing. Add one line to assistantInstructions, for every profile and with no domain word: the reader sees the last read that found something beside the reply, so when a reply states a count, the read that found that count comes last, run again if need be. Nothing else changes: no new field, no second chip.

Shared part: The element's one system prompt, read by every consumer's assistant.

Acceptance: The line is in assistantInstructions for both profiles, with a test. Walked on three fresh asks of T92 A's fact 2 and one of T92 B's: T92A/touched-13/02.png's and T92A/success/11.png's row reads 7 or 12, and its hover and Show in table go to those nodes. The model's order varies, so one row of 5 or 9 in three does not fail the unit: it stays in the key as Build decided. All three failing does.

Routes to walk again: T92A success path, fact 2; T92A touched-13: x, then fact 2, chip and Show in table; T92A keyboard; T92B success path, fact 2; T91B detour-2: asking first; T95A detour-2: the chip under a guess.

## The answer key after these fixes

`answers.md` describes this build, defects included, so match it to the next frozen build before any session:

- T92: the line that a turn may end in 'Selected 0 nodes' twice, and its `Build decided` F, should go. The line on a row of 5 or 9 stays until the walks show how often it still comes.
- T92 A: after the model clears the selection, a reply can now answer for the whole graph with the line reading Whole graph. Check `Scope noticed` still reads as written.
- T91 B and T93 B: the stray selection routes reach a working reply through an answer.
- T95: a file now holds what the message was about, so a grader can read the downloads folder. Open run doing nothing stays in the key.

## Every row

Class: fix now (the unit named), decided, backlog, sessions, or note. Origin is given for fix-now rows.

### T90A

1. Severity -, all: No crash, block or grading-spoiling result on any walk; no keyboard walk asked for. **note.** The pilot's summary line, not a defect.
2. Severity 2, touched-26, touched-26-names: With the transcript overflowing, opening the steps list makes the whole panel body scroll too: a second scrollbar, the composer jumps up, the title row scrolls away. **backlog, friction.** The composer still works and the text can be reached. Same fault as T92A's and T93B's two scrollbars. [T90A/touched-26/20.png, T90A/touched-26-names/10.png]
3. Severity 1, touched-26: A change line 'Selected 0 nodes' is drawn. **fix now, spoils, `chip-row`, repeat.** decided.md, "a selection of nothing draws no line"; the fix was reverted (rejected-fixes.md), so this is the rejected unit again. [T90A/touched-26/19.png]
4. Severity 1, touched-26-names: 'and 8 more' under the change lines opens the steps list instead of the remaining lines. **backlog, friction.** The steps hold them; one more read. [T90A/touched-26-names/09.png, 10.png]
5. Severity 1, touched-26-names: A warning row 'No matches.' is the last line of a right reply, with nothing saying which lookup it belongs to. **backlog, wording.** The reply is right and stands. The chip-row rule puts a found result first where the turn has one. [T90A/touched-26-names/05.png]
6. Severity 2, success, touched-26, touched-30: The Select step moves the camera and cuts nodes off at the left and bottom of the canvas. **backlog, friction.** Carried from the first pass. No value or node is wrong; Fit recovers. [T90A/success/14.png]
7. Severity 2, success, touched-26, touched-30: 'Computed Reach' and step Reach against Closeness in the key card, inspector and reply. **backlog, wording.** Carried. Wording; the study's answer does not hang on the name. [T90A/success/14.png]
8. Severity 2, touched-26: Closing the conversations list replays each earlier failure as a notice, three at once. **backlog, friction.** Carried. Nothing is lost and the notices go. [T90A/touched-26/07.png]
9. Severity 2, touched-26: Send again stacks a duplicate question and failure each time. **backlog, friction.** Carried. answers.md calls pressing it a wrong turn; the model label still leads on. [T90A/touched-26/05.png]
10. Severity 2, touched-26: Forget key has no confirmation or notice. **backlog, friction.** Carried. Retyping recovers. [T90A/touched-26/08.png]
11. Severity 2, touched-26-names: Enter during a run does nothing and says nothing; the message waits unsent. **backlog, friction.** Carried. The text stays and Enter after the run sends it. [T90A/touched-26-names/04.png]
12. Severity 1, touched-26: After Forget key and Save, New conversation is undone and the failed conversation returns. **backlog, friction.** Carried. The next message still works. [T90A/touched-26/10.png]
13. Severity 1, touched-26: 'Stopped. Changes taken back.' when nothing had changed. **backlog, wording.** Carried. Harmless wording. [T90A/touched-26/14.png]
14. Severity 1, success: With a selection the placeholder still reads 'Ask about this graph' over the scope 'Selection 1'. **backlog, wording.** Carried. The scope line above it is right. [T90A/success/14.png]

### T91B

1. Severity 3, touched-27 (detour-3: stray selection): An answer stays bound to a selection the model already cleared: the line read Whole graph, the reader chose the offered 'Apply styling to the entire graph', and the reply said the selection holds only an edge, 'No matches.', no change. **fix now, spoils, `chip-row`, repeat.** The first pass's send-again unit ended this for Send again; an answer takes the same stale binding. The screen says the opposite of what ran. Confirmed in source: settleTarget narrows to the ids bound at send, whatever the selection is now. [T91B/touched-27/11.png, 12.png, 13.png]
2. Severity 2, touched-27, touched-27-send-again: 'Selected 0 nodes' still draws, and the model still clears the reader's selection unasked. **fix now, spoils, `chip-row`, repeat.** decided.md, "a selection of nothing draws no line"; the fix was reverted (rejected-fixes.md), so this is the rejected unit again. The clearing itself stays in the backlog as the model's act. [T91B/touched-27/11.png, T91B/touched-27-send-again/04.png]
3. Severity 1, touched-27: A bare 'No matches.' ends a turn with no Send again and without saying what found nothing. **backlog, wording.** Same turn as the first row; a next message recovers. [T91B/touched-27/12.png]
4. Severity -, touched-27: Route note: the earlier failed turn no longer comes, so Send again was not offered on the stray selection route in 2 of 2 natural sessions; verified only through the OpenAI failure. **note.** A route note, not a defect. The send-again fix was walked and held. [T91B/touched-27-x-send-again/09.png]

### T92A

1. Severity 3, touched-13, success: The chip row can back a right answer with a different, unexplained number: 5 under '7 of the 12', and its hover, click and Show in table go to the five who gave nothing; 9 under 'Six ... seven'. **fix now, spoils, `last-read`, new.** answers.md: a right fact 2 with only a row of 5 or 9 behind it is F, Build decided: yes. A careful reader who checks the row is marked wrong, which is the first pass's test for a spoil. The row itself is decided, so the fix is in which read comes last. [T92A/touched-13/02.png, 04.png, 06.png, T92A/success/11.png, 14.png]
2. Severity 3, touched-33, touched-19, touched-29: Fact 2 can arrive with nothing behind it in the panel: 'Selected 0 nodes' twice, no chip, no Show in table, two 'No matches.' steps. **fix now, spoils, `chip-row`, repeat.** answers.md: a right fact 2 with only that reply behind it is F, Build decided: yes. The unit sent in the first pass, reverted, and named in rejected-fixes.md. [T92A/touched-33/03.png, 04.png, T92A/touched-19/08.png, T92A/touched-29/05.png]
3. Severity 2, success, keyboard: The Whole graph scope does not reach the model's memory of the conversation: the reply still led with six or 'the 9'. **backlog, friction.** Carried. The message went as whole graph; the model carried on. answers.md grades the report, and the reply holds 7. [T92A/success/11.png, T92A/keyboard/54.png, T92A/touched-13/02.png]
4. Severity 2, touched-29: A failed reply gives advice the screen has overtaken: 'Please clear your selection and ask again' under a line reading Whole graph. **backlog, wording.** A next message recovers. It has the chip-row unit's cause, so check on the re-walk that it has gone. [T92A/touched-29/05.png]
5. Severity 2, touched-29: After a canvas right-click, then x and Send again, focus stays on the graph drawing, not in the composer. **backlog, friction.** One click reaches the composer. Whether typing is lost was not tried. [T92A/touched-29/07.png, 08.png]
6. Severity 2, touched-33: The model selects on a plain question, which replaces the reader's selection and becomes the next message's scope. **backlog, friction.** Carried; first in line in the backlog. The model's act; the screen says what happened and a next message recovers. Not a blocked route. [T92A/touched-33/02.png]
7. Severity 2, touched-19: Redo lit with Undo dim after a rolled-back turn. **backlog, friction.** Carried. Nothing is wrong in the graph. [T92A/touched-19/08.png]
8. Severity 1, touched-16: Two scrollbars side by side once the conversation is long, narrowing the composer row by about 15 px. **backlog, cosmetic.** The panel still works. [T92A/touched-16/05.png]
9. Severity 1, touched-16: 'Changed the graph' is a change line that says nothing, under two exact lines. **backlog, wording.** Wording; the two exact lines are true. [T92A/touched-16/03.png]
10. Severity 1, touched-13, success: Open steps give several chips one accessible name. **backlog, accessibility.** Only a screen-reader user meets it. [T92A/touched-13/03.png, T92A/success/12.png]
11. Severity 1, touched-19, touched-29: One request named its layer two ways on two walks. **backlog, wording.** The model's wording; either name is a working layer. [T92A/touched-19/09.png, T92A/touched-29/08.png]
12. Severity 1, keyboard: Control+I closing the panel put focus on inspector tab 'Values', where the earlier pilot had it on the Assistant rail button. **backlog, accessibility.** Only a keyboard user meets it; Control+I still reopens the panel. [T92A/keyboard/63.png]
13. Severity 1, success: The whole page sits about 1 px higher once the inspector shows a run. **backlog, cosmetic.** Cosmetic. [T92A/success/05.png, 07.png]
14. Severity -, keyboard: Keyboard walk, no defect: focus never fell to the page body, every focused control had a name, and the composer's keys behaved as decided. **note.** The pilot's record of a clean walk.
15. Severity 1, tool: A session folder under the main checkout's tmp/design-studio/tier6 is not read as tier 6 by real.mjs, so a start without REAL_TIER=6 fails with SETUP FAILED: nothing called Assistant. **backlog, friction.** The study tool, not the app. Start every walk with REAL_TIER=6, as the tool's README already says for sessions.

### T92B

1. Severity 3, touched-31: The chip fix is not in the frozen build: with Selection 1 left by fact 1, fact 2 gave no count, eight steps, four 'No matches.', and a turn ending 'Selected 0 nodes' with no 7 chip and no Show in table. **fix now, spoils, `chip-row`, repeat.** The rejected unit itself. rejected-fixes.md says refix it in the shared part. [T92B/touched-31/03.png, 04.png]
2. Severity 2, touched-6: 'Selected 0 nodes' also ends a turn right under a correct fact 1 answer, when a stray selection was on as the message went. **fix now, spoils, `chip-row`, repeat.** decided.md, "a selection of nothing draws no line"; the fix was reverted (rejected-fixes.md), so this is the rejected unit again. [T92B/touched-6/12.png]
3. Severity 2, touched-32: The chip beside 'None of the 5 selected genes have gal80Rexp above 1' reads 5, the five read, not the zero the sentence states. **decided.** decided.md, "the row is the last result that found something". A true count; the key says so, and the reply states its own zero. [T92B/touched-32/05.png]

### T93A

1. Severity 2, touched-20 (detour-1: Change this and Keep them): After a decline, a plain request to remove became a hide with no request card: 'I hid the 7 people', 'Filtered to 17 of 24 nodes', '7 hidden' on the scope line. **backlog, friction.** Seen once. The screen says hid three ways and 'for good, not just hide them' brought the card back, so no route is blocked and a reader reporting them gone has misread: the key's F is fair. Joins the model acting after a no, first in line. [T93A/touched-20/06.png]

### T93B

1. Severity -, all: No crash, block or grading-spoiling result on any walk; the items below are severity 1. **note.** The pilot's summary line, not a defect.
2. Severity 1, touched-28, touched-22: 'Selected 0 nodes' is drawn as a change line beside Undo when the model clears a stray edge. **fix now, spoils, `chip-row`, repeat.** decided.md, "a selection of nothing draws no line"; the fix was reverted (rejected-fixes.md), so this is the rejected unit again. [T93B/touched-28/09.png, T93B/touched-22/03.png]
3. Severity 1, touched-22: A turn that colored the drawing does not say so; detour-1 read 'Changed the graph' for the same coloring. **backlog, wording.** The drawing and the key card show it. [T93B/touched-22/03.png]
4. Severity 1, detour-1: 'Declined. Nothing changed.' leaves the turn after the next message, while 'Not run: you sent a new message.' stays. **backlog, wording.** The turn's words stay; the end row goes. Nothing false. [T93B/detour-1/05.png, 06.png, T93B/touched-23/04.png]
5. Severity 1, detour-1: After a message the conversation stopped on the previous turn with 'Jump to newest', with the message and reply below the fold. **backlog, friction.** The pill is the way down. Mechanism not traced. [T93B/detour-1/07.png]
6. Severity 1, touched-22: With 8 steps open on a long conversation and a waiting request, a second outer scrollbar, and the header and composer move in about 15 px. **backlog, cosmetic.** Same fault as T90A's row. The request stays reachable. [T93B/touched-22/10.png]

### T94A

1. Severity 2, setup, any route: A click on Assistant just after the project opens is thrown back to Graph, one start of six; a second click a second later was thrown back too, and a third opened the panel. **backlog, friction.** Carried, and it corrects the backlog: a second click does not always work. A failed start is run again, and a participant's first click comes well after the open. [T94A/setup-race/02.png, 04.png, setup.log]

### T95A

1. Severity 3, detour-2, touched-39: The exported file holds all 24 volunteers with every phone number, under scope Selection 5 and a reply saying 'I exported the selected nodes'. **fix now, spoils, `export-scope`, new.** A saved file holds the wrong rows on a listed detour. The first pass's unit made the file arrive, which is how this came to be seen. Confirmed in source: export_graph passes no scope. [T95A/detour-2/10.png, T95A/detour-2/downloads/volunteers_csv.csv, T95A/touched-39/04.png, T95A/touched-39/downloads/volunteers_csv.csv]
2. Severity 3, success, detour-2: Open run does nothing and says nothing, because the model removed its own run. **backlog, friction.** Not a step of T95: answers.md says Open run doing nothing is neither a step nor a wrong turn, and the grade rests on the report. Same family as T94B's 'Open run does nothing once the run is gone'. Mechanism now read in source and fitting success/05.png: the results tool's remove returns no effect of its own, so it draws 'Changed the graph', and nothing tells the turn the run left. Every T92 walk that asked fact 1 kept its run, so that check is not touched. First in line. [T95A/success/06.png, 09.png, 12.png, T95A/detour-2/04.png, T95A/keyboard/19.png]
3. Severity 2, keyboard: Enter on Answer sends focus to the first turn's Undo, so a second Enter takes that turn's changes back. **backlog, accessibility.** Only a keyboard user meets it, and Undo's Redo brings it back. First in line. [T95A/keyboard/34.png, 36.png]
4. Severity 2, success: 'No changes were made to the graph' sits directly over 'Changed the graph' with Undo. **backlog, wording.** answers.md rules it no wrong turn. The same cause as Open run; the words go when that is fixed. [T95A/success/04.png]
5. Severity 2, detour-2: The transcript jumps to the top after Undo, so the turn just undone and its Undone mark go out of view. **backlog, friction.** Scrolling recovers; the graph is right. [T95A/detour-2/12.png, 10.png]
6. Severity 2, keyboard: The reply names six people while the turn selected 2, because Selection 7 was left on the scope line. **sessions.** Whether a left selection and its scope line are enough is what T92 A measures; answers.md keeps it for that. [T95A/keyboard/36.png]
7. Severity 2, detour-2: Pressed for a guess, the model gives percents over a computed chip of 16, calling them speculative. **sessions.** The task's own trap, measured by Trap fired and Taken on trust; answers.md already names this chip. [T95A/detour-2/05.png]
8. Severity 1, touched-39, keyboard: Change lines repeat ('Selected 5 nodes' twice; 'Selected 2, 0, 2 nodes'), and the status line speaks them the same way. **backlog, wording.** Wording; the zero goes with chip-row. [T95A/touched-39/02.png, T95A/keyboard/36.png]
9. Severity 1, detour-2: 'The five volunteers ... followed by Omar Haddad' names six. **backlog, wording.** The model's wording. [T95A/detour-2/06.png]
10. Severity 1, detour-2: Nothing but the reply says a file was saved, and it says 'ready for download'; no line names the file. **backlog, wording.** The browser shows the download. [T95A/detour-2/10.png]
11. Severity 1, keyboard: The spoken news 'Degree finished: v02 ranks first, 8' sounds like the answer. **backlog, accessibility.** Only a screen-reader user meets it. [T95A/keyboard/11.png]
12. Severity 1, keyboard: The Undid status quotes the whole message and ends in two periods, and focus lands on the top bar's disabled Undo. **backlog, accessibility.** Carried; only a keyboard or screen-reader user meets it. [T95A/keyboard/52.png]
13. Severity 1, success, keyboard: A disabled Send (composer empty) is drawn as the filled green primary button. **backlog, cosmetic.** Reads as ready, and its name says disabled; nothing is blocked. A shared Figma-locked look. [T95A/success/04.png, T95A/keyboard/11.png]
