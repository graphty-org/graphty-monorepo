# Dry run, first pass on the tier 6 study build

Build 8fa33aa786, frozen for round 1. Twelve pilots walked every task's success path, listed detours and keyboard route, and every pass finished, so no task counts as unwalked. Screenshots are under /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier6/r1/pilot/, written here from the task folder down. This is the first pass, so every fix-now row's origin is new: there is no earlier triage, no earlier fix commit and no regression to trace.

The dry run makes the build ready for sessions. It does not polish it: a row is fix now only if it crashes, blocks a task by every reasonable route, or spoils grading.

|                        | Rows                                                          |
| ---------------------- | ------------------------------------------------------------- |
| All                    | 232                                                           |
| Fix now                | 24 (crashes 0, blocks 1, spoils 23; regressions 0, repeats 0) |
| Decided, no change     | 16 (no decision reversed)                                     |
| Backlog (`backlog.md`) | 184                                                           |
| Left for the sessions  | 8                                                             |

## What the pass found

Most of the fix-now rows come from two faults in graphty-element's selector, not from the panel. A lone `false` was read as a column name, and a rule about a column that edges do not carry matched every edge; both reproduce in a five-line script, and together they explain the 63, 361 and 24 chips that pilots reported separately. The rest are places where the screen stops telling the truth about what happened: words that vanish, a line the message ignores, a count cut at ten, a file never saved, a stale row, and a privacy line that says the opposite of the answer.

The pilots rated many rows 3 that are classed backlog here. A rating measures harm to a reader. This pass asks a narrower question, whether a session can finish and be graded fairly, and a route the reader can get past does not block.

## Fix-now units

### A rule reads a lone true, false or null as that value (`lone-words`, graphty-element)

Rows: T91A row 1, T91A row 2, T91A row 3, T91A row 4, T91A row 5, T91A row 6.

`data.trained == false` reads `false` as a column, so no node matches and, since a missing value equals a missing value, every edge does (reproduced with compileExpressionPredicate: nodes 0, edges all; with backticks the node matches). A lone `true`, `false` or `null` word in a selector or a rule becomes the literal; `data.false` still names a column. While there, check that a `query` count over a rule that matches nothing answers 0 rather than failing: it is the likely source of 'Query data failed.' beside a good answer. If it is not, name the real call in the commit and fix that.

Acceptance: A test in graphty-element: on volunteers.graphml `data.trained == false` and Find's `trained == false` give the nine nodes and no edge. Walked: T91A/success/05.png's first message paints the nine with no failed row and no 63 chip; T91A/detour-1/13.png offers 'Select the 9 nodes'; T91A/success/12.png's Show in table selects nodes.

Routes to walk again: T91A success path; T91A keyboard; T91A detour-1: Find and Quick actions; T91A detour-2: question, then make them stand out; T91B success path (a numeric rule still works); T92B detour-3: Find with a rule.

### A rule about a column one kind does not carry matches none of that kind (`edge-half`, graphty-element)

Rows: T93A row 2, T93B row 1, T93B row 2.

query.ts promises 'A path nothing answers matches nothing', but a negative test on a node column (`data.phone == null`, `results.x.value != 0`) is true on every edge, because no edge carries the value (reproduced: edges all). So a target's live count, its peek, its click and Show in table all take the whole edge list. In the engine's `nodes`, `edges` and `select`, a half whose kind answers none of the expression's paths matches nothing; `unresolvedPaths` stays as it is. The approval title keeps its measured numbers; the card's chip row then shows what the rule names.

Acceptance: A test in graphty-element: `data.phone == `null`` on volunteers gives 7 nodes and 0 edges, a rule on an edge column still gives its edges, and a column both kinds carry is unchanged. Walked: T93B/success/03.png shows no 361 chip, T93B/success/04.png peeks only at what goes, T93A/detour-1/14.png selects no 63 edges.

Routes to walk again: T93B success path; T93B keyboard; T93B detour-1: Change this, ask why, Keep them; T93B detour-3: chip click; T93A success path; T93A detour-1: the card's chip; T92A success path: chip and Show in table; T91B detour-2: Show in table.

### A run scoped to the reader's selection runs on it (`run-scope`, graphty-element)

Rows: T92A row 1.

The facts line tells the model that 'selection' names the selection, but run_algorithm passes `scope.where` raw, unlike every other tool: `selection` is read as a column, the scope holds nothing, E_SCOPE_EMPTY fails the batch, and the design's rollback takes the good run with it. Read in the source and not yet reproduced, so write the test first: a message bound to a selection, one whole-graph run, then a run with `scope: { where: 'selection' }`. Send the scope through the same settling as a target, including its repairs. If the test shows another call fails, name it in the commit and fix that. The rollback rule itself stands (design/ai/assistant-coverage-design.md 4.3).

Acceptance: The test above. Walked: T92A/detour-1/04.png, the bridge question with the 14 selected, ends with its reply, Open run and no 'Run an algorithm failed.'

Routes to walk again: T92A success path; T92A detour-1: the 14 left selected; T92A keyboard; T94A success path (a run with no scope).

### A turn keeps the words the reader read (`words-stay`, graphty-element)

Rows: T92A row 2, T93A row 4, T93A row 5, T93B row 7, T95A row 1.

Three places drop what was on screen. `answered` in runConversation.ts keeps the model's text out of the conversation while a request waits, so only the status shows it until the next run replaces it. `saveUnkept` saves a failed message's outcome and not its text. A question's own text lives on the call, so the snapshot has nothing to show once it is answered. Keep all three in what the snapshot gives the reader, in order, against decided.md's 'No turn folds'. The history sent to the model must stay valid: no text between a call and its result, and a failed message's text must not read as work that stands.

Acceptance: Tests on the snapshot for each of the three. Walked: T92A/detour-1/08.png keeps the first reply above its failure row; T95A/keyboard/33.png keeps the question's sentence; T93A/success/05.png keeps the reply with the seven names; T93B/detour-3/10.png keeps the explanation.

Routes to walk again: T92A detour-1: Send again; T93A success path; T93A detour-1: Change this and Keep them; T93A detour-4: answering the question; T93B success path; T93B detour-3: Send again; T93B detour-2: a message while a request waits; T95A keyboard: answering the question; T95A detour-2; T90A detour-3: Send again twice.

### Send again goes with what the scope line says now (`send-again`, graphty)

Rows: T91B row 1, T91B row 2, T93B row 4.

`again` in Conversation.tsx resends the failed message's own `scope.kind`, so after the x, or after the model cleared the selection, a message goes out as a selection over nothing under a line reading Whole graph. The x's state lives inside `useScope`; move it where both can read it, and have Send again use the kind the line shows and spend the x the way Send does.

Acceptance: A real-input test in graphty: a failed message sent with a selection, the x, Send again: `aiCommand` is called with the graph scope. Walked: T91B/detour-3/12.png and T93B/detour-3/11.png reach a working reply through Send again.

Routes to walk again: T91B detour-3: stray selection, Send again; T93B detour-3: stray selection, Send again; T92A detour-1: scope x after a failure; T90A detour-5: Send again after moving to Google.

### A selection does not hide a turn's chip (`chip-row`, graphty)

Rows: T92B row 2.

TurnEffects treats any non-result effect as a change, so 'Selected 0 nodes' hides the found 7, and `findLast` lets a later empty query beat a found one. A selection is not a change to the graph: a turn whose only changes are selections shows its lines and its chip row. The row is the last result that found something, else the last empty one. A selection of nothing draws no line. A turn with a real change keeps the change line alone, as decided.

Acceptance: A test in graphty/src/workspace/assistant/**tests**. Walked: T92B/success/12.png shows the 7 chip and Show in table with no 'Selected 0 nodes' line.

Routes to walk again: T92B success path, fact 2; T92B detour-2: fact 2 with a selection on; T92A success path, fact 2; T91B detour-2: asking first; T95B success path (an empty result alone still shows its row).

### A grouping run says how many groups it found (`group-count`, graphty-element)

Rows: T93B row 3.

`summary().groups` stops at ten, and RunValues and the status line count that list: 'Groups 10' beside Components 26. Add `groupCount` to the summary (additive), read it in both, and let the existing 'Largest 10' heading show when the list stops short.

Acceptance: A test in graphty-element on a 26-piece result. Walked: T93B/detour-2/12.png reads Groups 26 and Largest 10; the keyboard walk hears 'Connected components finished: 26 groups'.

Routes to walk again: T93B detour-2: Open run, Values; T93B keyboard: the status line; T94A success path: Louvain's six groups unchanged.

### What the Assistant exports reaches the reader (`export`, graphty)

Rows: T95A row 3.

`ai-export-ready` says the application saves or shows the document, and nothing in graphty/src listens, so every graph export, picture and video the Assistant makes is lost while the reply says it worked. Listen once beside the panel's other element events and save with the existing `saveBlob`, named from the project and the format.

Acceptance: A test in graphty with the real element event. Walked: T95A/detour-2/08.png's export arrives in the walk's downloads folder.

Routes to walk again: T95A detour-2: export a file.

### A reopened conversation reads Undone truly (`undone-reopen`, graphty-element)

Rows: T94B row 3.

`noteUndone` marks only the open conversation, so a step undone while another shows stays unmarked in its own record. Run it when a conversation opens, reading the same history.

Acceptance: A test in graphty-element. Walked: T94B/detour-3/10.png reads Undone and offers no Open run.

Routes to walk again: T94B detour-3: New conversation, the arrow, reopen; T94A detour-4: New conversation, reopen, Undo.

### Settings says where the Assistant's data goes (`privacy`, graphty)

Rows: T90A row 8, T90B row 1.

Privacy's 'Where your data goes' does not name the Assistant and says files are never uploaded. With the flag on and a provider saved, add a line in the words the privacy chip's tooltip and the AI provider section already use (messages and graph details go to the provider, on the reader's key), and keep the files line true beside it. Off, the section does not change, as decided.

Acceptance: A test in graphty for both states. Walked: T90B/detour-1/14.png and T90A/detour-1/18.png name Google, and no line there is false.

Routes to walk again: T90A detour-1: Settings, Privacy; T90B detour-1: Settings, Privacy.

## The answer key after these fixes

`answers.md` describes this build, defects included, so it must be matched to the next frozen build before any session:

- T91: the A route's first request should paint, and the chip's 63 or 24 and its `Build decided` line go.
- T92: fact 2's reply may now carry a chip when the turn only selected.
- T93: 'Seen while writing this key' loses the 361 and 63 chips, and the note that an edge chip can disagree.
- T95: the question's words stay on screen, so 'read them in the earlier screenshot' goes.

## Every row

Class: fix now (with crash, blocks or spoils, and its unit), decided, backlog, or sessions. Origin is new for every fix-now row.

### T90A

1. (sev 3, detour-1) Done with a typed key drops it with no word; two primary buttons; panel still says it needs a key. **BACKLOG**, friction. Nothing false on screen: the panel still asks for a key, and retyping with Save recovers. Friction. [T90A/detour-1/10.png]
2. (sev 2, keyboard, detour-1) Enter in API key does nothing. **BACKLOG**, friction. Save is the visible route. [T90A/keyboard/51.png]
3. (sev 2, success, keyboard, detours 3-5) The Select step, and Enter in Find, moves the camera and cuts nodes off; the view stays moved. **BACKLOG**, friction. No value or node is wrong; Fit recovers. Follows the selection glide, in every selection route. [T90A/success/16.png, keyboard/103.png, detour-3/16.png, detour-2/05.png]
4. (sev 2, success, detour-3) One measure, two names: Computed Reach, step Reach and layer Reach against Closeness. **BACKLOG**, wording. Wording; the study's answer does not hang on the name. [T90A/success/16.png, detour-3/16.png]
5. (sev 2, keyboard) On the next send the old failure is announced again, assertively. **BACKLOG**, accessibility. Only a screen-reader user meets it. [T90A/keyboard/93.png]
6. (sev 2, detour-3) Closing the conversations list replays every earlier failure as an alert. **BACKLOG**, accessibility. Only a screen-reader user meets it. [T90A/detour-3/07.png]
7. (sev 2, detour-3) Send again stacks a duplicate question and an identical failure each time. **BACKLOG**, friction. answers.md calls pressing it a wrong turn, not a failure of the task; the model label still leads on. [T90A/detour-3/05.png]
8. (sev 2, detour-1) Settings, Privacy says files are never uploaded and does not mention the Assistant, with values going to the provider. **FIX NOW, spoils, new** -- unit `privacy`. T90's follow-up is graded on what the program showed; this screen states the opposite of the right answer, so a reader who reads it answers wrong. [T90A/detour-1/18.png]
9. (sev 2, detour-1) An sk- key under Google is saved with no check. **DECIDED**. decided.md, "Kept for the first round by the answer key" [T90A/detour-1/12.png, 13.png]
10. (sev 2, detour-1) Settings on the start screen has no AI provider. **SESSIONS**. Where a reader looks first with a key in hand is what T90 measures; the sessions answer it. [T90A/detour-1/02.png]
11. (sev 2, keyboard) The show-key eye is out of the tab order and named 'Show the password'. **BACKLOG**, accessibility. Only a keyboard or screen-reader user meets it. [T90A/keyboard/51.png]
12. (sev 2, keyboard) The model label's name is only 'GPT-4o'; its purpose is in a tooltip. **BACKLOG**, accessibility. Only a screen-reader user meets it. [T90A/keyboard/82.png]
13. (sev 2, keyboard) Forget key clears a typed, unsaved key and is live with nothing saved; no word follows. **BACKLOG**, friction. Retyping recovers. [T90A/keyboard/64.png]
14. (sev 2, detour-3) Forget key on a saved key has no confirmation or notice. **BACKLOG**, friction. The panel goes to the no-key screen at once, and retyping recovers. [T90A/detour-3/08.png]
15. (sev 2, detour-4) Enter during a run does nothing and says nothing; the message waits unsent. **BACKLOG**, friction. The text stays; Enter after the run sends it. [T90A/detour-4/05.png]
16. (sev 1, detour-3) After Forget key and Save, New conversation is undone and the failed conversation returns. **BACKLOG**, friction. The next message still works. [T90A/detour-3/10.png]
17. (sev 1, detour-1) Escape in API key closes Settings and drops the key and provider with no word. **BACKLOG**, friction. Retyping recovers. [T90A/detour-1/07.png, 09.png]
18. (sev 1, detour-3) 'Stopped. Changes taken back.' when nothing had changed. **BACKLOG**, wording. Wording of design 6.4's row; harmless. [T90A/detour-3/13.png]
19. (sev 1, keyboard) The alert's text runs together and includes the button. **BACKLOG**, accessibility. Only a screen-reader user meets it. [T90A/keyboard/72.png]
20. (sev 1, success) With a selection the placeholder still reads 'Ask about this graph' over 'Selection 1'. **BACKLOG**, wording. The scope line above it is right. [T90A/success/15.png]
21. (sev 1, keyboard, detour-1) The whole page sits 1 px higher after some focus moves. **BACKLOG**, cosmetic. Cosmetic. [T90A/keyboard/51.png, detour-1/17.png]
22. (sev 1, keyboard) Undo and Redo are tab stops while disabled. **BACKLOG**, accessibility. Only a keyboard user meets it. [T90A/keyboard/23.png, 24.png]
23. (sev 1, detour-6) Tab in the open Provider list does nothing. **BACKLOG**, accessibility. Only a keyboard user meets it; Enter and Escape work. [T90A/detour-6, last steps]
24. (sev 1, keyboard) The first Shift+Tab after a --read stayed in the composer, twice. **BACKLOG**, accessibility. Not separated from the tool; the accessibility walk checks it. [T90A/keyboard/74.png, 95.png]
25. (sev 0, success) Known and kept: the refused key reads as a connection failure; the third starter; a question repaints the network. **DECIDED**. decided.md, "Kept for the first round by the answer key" [T90A/success/10.png, 08.png, 15.png]
26. (sev 0, --) The line giving the paths and the report: a pointer, not a defect. **DECIDED**. No defect in it. [T90A/report.md]

### T90B

1. (sev 3, detour-1) Settings, Privacy says nothing of the Assistant and still says 'never uploaded' with 'Sends to Google' in the status bar. **FIX NOW, spoils, new** -- unit `privacy`. The same screen as T90 A's row: a reader answering the follow-up from it gets the wrong answer. [T90B/detour-1/14.png]
2. (sev 3, detour-1) A typed key is dropped with no word on Done or Escape; the panel stays on the no-key screen. **BACKLOG**, friction. As T90 A: nothing false on screen, and Save recovers. Friction, so it does not block. [T90B/detour-1/10.png, 12.png]
3. (sev 2, detour-1) Settings on the start screen has no AI provider section. **SESSIONS**. As T90 A: left for the sessions. [T90B/detour-1/02.png]
4. (sev 2, success) Enter in the API key box does nothing. **BACKLOG**, friction. Save is the visible route. [T90B/success/08.png]
5. (sev 2, success, keyboard) 'and 1 more' under the change lines seems to do nothing. **BACKLOG**, friction. The extra line stays in the steps; no answer depends on it. [T90B/success/20.png, keyboard/104.png]
6. (sev 2, success, keyboard, detour-3) The reply says no changes above 'Computed Connections for 24 nodes' and an Undo. **BACKLOG**, wording. Model prose beside a true change line; answers.md, T95, expects the run left behind. [T90B/success/19.png, keyboard/94.png, detour-3/08.png]
7. (sev 2, success) Open run lands on an empty Style tab, and opens one run of four, called Degree. **BACKLOG**, friction. One more click to Values; the reader gets the numbers. [T90B/success/23.png]
8. (sev 2, success, keyboard) The run's Values list ids, not names; spoken news the same; 'Top 10' shows 7 rows. **BACKLOG**, wording. answers.md takes the id as a right answer. [T90B/success/24.png, keyboard/94.png]
9. (sev 2, detour-3) After Send again the transcript does not follow the new turn. **BACKLOG**, friction. A scroll recovers it. [T90B/detour-3/11.png, 12.png]
10. (sev 2, keyboard) Old failures are spoken again as alerts, and the words run together. **BACKLOG**, accessibility. Only a screen-reader user meets it. [T90B/keyboard/94.png, 76.png, 108.png]
11. (sev 2, detour-3) Forget key hides the conversation behind the no-key screen; the status bar returns to 'Local only'. **BACKLOG**, friction. Saving a key brings it back. [T90B/detour-3/13.png, 14.png]
12. (sev 2, keyboard) The show-key button cannot be reached by Tab and is named 'Show the password'. **BACKLOG**, accessibility. Only a keyboard or screen-reader user meets it. [T90B/keyboard/52.png]
13. (sev 2, keyboard) The model label's name is only 'GPT-4o'. **BACKLOG**, accessibility. Only a screen-reader user meets it. [T90B/keyboard/69.png]
14. (sev 2, keyboard) Twelve Tabs to the rail, and arrow keys with nothing announcing them. **BACKLOG**, accessibility. Only a keyboard user meets it. [T90B/keyboard/28.png]
15. (sev 1, keyboard, detour-2) AI provider... and the model label open Settings with focus on Close. **BACKLOG**, accessibility. Only a keyboard user meets it. [T90B/detour-2/16.png]
16. (sev 1, success, keyboard) Send looks the same empty and disabled as ready. **BACKLOG**, cosmetic. Reads as ready but its name says disabled; nothing is blocked. A shared Figma-locked look, so it needs care between rounds. [T90B/success/09.png, keyboard/59.png]
17. (sev 1, keyboard) Two buttons named 'New conversation'. **BACKLOG**, accessibility. Only a screen-reader user meets it. [T90B/keyboard/59.png]
18. (sev 1, detour-2) Quick actions for 'AI' offers AI provider... but not Assistant. **BACKLOG**, friction. The rail is in view; AI provider... leads on. [T90B/detour-2/15.png]
19. (sev 1, success) 'Sending to Google' stays unchanged for over 20 seconds while tools run. **BACKLOG**, wording. The step count moves. [T90B/success/18.png]
20. (sev 1, detour-3) 'Stopped. Changes taken back.' after a stop with no changes. **BACKLOG**, wording. Harmless wording. [T90B/detour-3/07.png]
21. (sev 1, detour-4, keyboard) Control+I sends focus to different places from the composer and the no-key screen. **BACKLOG**, accessibility. Only a keyboard user meets it. [T90B/detour-4/05.png]
22. (sev 1, keyboard) Send again leaves focus on region 'Conversation'. **BACKLOG**, accessibility. Only a keyboard user meets it; focus is not lost. [T90B/keyboard/76.png]
23. (sev 1, success, detour-2) The whole page sits 1 px higher once Settings is opened from the status bar. **BACKLOG**, cosmetic. Cosmetic. [T90B/success/21.png, 23.png]
24. (sev 1, detour-2) Find for 'AI' matches inside emails; Enter selects a stranger and moves the camera. **BACKLOG**, friction. Escape clears it; the rail stays in view. [T90B/detour-2/04.png, 06.png, 07.png]

### T91A

1. (sev 4, success, keyboard) A false value cannot be matched: 'No matches for data.trained == false.' on a column with nine false rows. **FIX NOW, spoils, new** -- unit `lone-words`. Reproduced: the selector reads the bare word false as a column, so no node matches and every edge does. The root of the five rows below. [T91A/keyboard/27.png, success/05.png]
2. (sev 4, success, detour-2, keyboard) The reply's chip is not the answer: 'Nine people' over '63 edges' or '24 nodes'. **FIX NOW, spoils, new** -- unit `lone-words`. answers.md marks a reader who reports the chip F, Build decided: a screen that makes a careful reader wrong. [T91A/detour-2/03.png, success/05.png, keyboard/21.png]
3. (sev 3, success) Show in table selected all 63 edges, opened Edges and rescoped the next message. **FIX NOW, spoils, new** -- unit `lone-words`. The wrong elements, from the same rule. [T91A/success/12.png]
4. (sev 3, detour-1) Find offers a wrong rule: 'trained == false' shows 'Select the 63 edges', then 'No column named "false"'. **FIX NOW, spoils, new** -- unit `lone-words`. Same rule, in the one other route to the nine. 'trained = false' with one equals sign stays a plain no match: backlog. [T91A/detour-1/13.png, 16.png, 05.png]
5. (sev 3, success) 'Query data failed. Nothing changed.' with Send again beside a good answer. **FIX NOW, spoils, new** -- unit `lone-words`. A right answer marked failed, on the success path. The likely cause is a count over the empty rule; the fix proves it or names the real call. [T91A/success/05.png, 07.png]
6. (sev 3, success, keyboard) The reply asks 'Please confirm' though reversible changes apply at once. **FIX NOW, spoils, new** -- unit `lone-words`. Follows from the first row, as the pilot says; closes with it or is reported as the model's. [T91A/success/08.png, keyboard/21.png]
7. (sev 3, detour-1) Ctrl+K then 'AI' lists 'Select what it paints' first; Enter selects all 24 and rescopes. **BACKLOG**, friction. The scope line says so and a click clears it. Friction, so it does not block. [T91A/detour-1/11.png, 12.png, 17.png]
8. (sev 2, success) The AI's layer reads 'Picked by hand: 9 nodes'. **BACKLOG**, wording. The nine are right. The first row's fix should bring the rule back. [T91A/success/11.png]
9. (sev 2, success, detour-2) The key card grew and hides a ninth dot, so a count by eye gets 8. **DECIDED**. decided.md, "The key card is an overlay" [T91A/success/10.png, 12.png, detour-2/05.png]
10. (sev 2, keyboard) Raw rule text 'data.trained == false' on screen in the steps. **BACKLOG**, wording. Friction, but it counts on bar 10 between rounds. [T91A/keyboard/36.png]
11. (sev 2, success) The reply names ids though the file has names. **BACKLOG**, wording. answers.md takes ids. [T91A/success/08.png]
12. (sev 2, keyboard) After Escape the list ends at a cut-off 'Assistant' heading. **BACKLOG**, friction. A scroll shows it. [T91A/keyboard/36.png]
13. (sev 2, keyboard) Open layer keeps focus and announces nothing. **BACKLOG**, accessibility. Only a screen-reader user meets it. [T91A/keyboard/32.png]
14. (sev 1, detour-3) The model painted the selection's own yellow and named the layer 'Selection Highlight'. **BACKLOG**, cosmetic. What the model chose to say or do; criteria.md reports it as the model's. Not a blocked route. [T91A/detour-3/07.png]
15. (sev 1, detour-3) The sort label for a yes/no column reads 'A to Z'. **BACKLOG**, wording. Wording. [T91A/detour-3/05.png]
16. (sev 1, detour-1) The main menu and canvas right-click have no route to the Assistant. **SESSIONS**. The rail is the decided route; recorded to see whether participants look elsewhere. [T91A/detour-1/02.png, 03.png]

### T91B

1. (sev 3, detour-3) Send again ignores the scope line: it read Whole graph, yet the message went as a selection over nothing. **FIX NOW, spoils, new** -- unit `send-again`. The line says one thing and the message does another: a setting silently not applied. On T92 A it would turn a reader who noticed the scope wrong. [T91B/detour-3/12.png]
2. (sev 3, detour-3) A stray edge selection fails a request about nodes, and the offered Send again cannot work. **FIX NOW, spoils, new** -- unit `send-again`. The stray selection stays (T92 A studies it). What must work is the way out offered: x, then Send again. [T91B/detour-3/10.png]
3. (sev 2, detour-3) The Assistant cleared the selection unasked and reported 'Selected 0 nodes' as a change. **BACKLOG**, friction. The clearing is the model's act; a retyped message works. The zero line goes with the chip-row unit. [T91B/detour-3/11.png]
4. (sev 2, detour-2) Show in table opens all rows in load order with none of the nine on screen, and selects them. **BACKLOG**, friction. Two clicks on the heading bring them up, shaded. [T91B/detour-2/04.png]
5. (sev 2, detour-2) With the table open the drawing is too small to tell the nine apart. **BACKLOG**, cosmetic. Closing the table restores it. [T91B/detour-2/04.png]
6. (sev 2, detour-1) 'Sized 9 nodes' twice in one turn. **BACKLOG**, wording. True, and it follows the model's calls. [T91B/detour-1/17.png]
7. (sev 2, keyboard) Two chip rows inside the opened steps share one name. **BACKLOG**, accessibility. Only a screen-reader user meets the duplicate name; the turn itself shows one row. [T91B/keyboard/49.png]
8. (sev 2, success, keyboard) Selecting shifts and shrinks the drawing about 7%. **BACKLOG**, friction. Not the Assistant's alone; no value is wrong. [T91B/success/08.png]
9. (sev 2, keyboard) Open layer is silent to a screen reader. **BACKLOG**, accessibility. Only a screen-reader user meets it. [T91B/keyboard/52.png]
10. (sev 1, success, keyboard) Send is the full green primary while disabled. **BACKLOG**, cosmetic. Reads as ready but its name says disabled; nothing is blocked. A shared Figma-locked look, so it needs care between rounds. [T91B/success/02.png]
11. (sev 1, detour-1) The undo notice quotes the reader with no marks and shows with the panel open. **BACKLOG**, wording. Wording. decided.md's one-notice entry covers a turn's change notice; Undid's place is settled between rounds. [T91B/detour-1/21.png]
12. (sev 1, success) 'Sending to Google' stays unchanged for up to a minute. **BACKLOG**, wording. The step count moves. [T91B/success/05.png]
13. (sev 1, success, detour-3) Steps name a family, not an act; 'Style failed.' inherits it. **BACKLOG**, wording. Wording. [T91B/success/06.png]
14. (sev 1, success) 'Rule: data.gal4RGexp < -1' is code to a first-time reader. **BACKLOG**, wording. Wording. [T91B/success/09.png]
15. (sev 1, success, detour-1) The placeholder says 'Ask about this graph' while scoped to a selection. **BACKLOG**, wording. The scope line is right. [T91B/success/08.png]
16. (sev 1, success) The chip has cursor default and no tooltip. **BACKLOG**, cosmetic. Hover peeks and click works. [T91B/success/07.png]
17. (sev 1, keyboard) 'New conversation, Conversations' and 'New conversation' side by side; Close does not say what it closes. **BACKLOG**, accessibility. Only a screen-reader user meets it. [T91B/keyboard/12.png]
18. (sev 1, keyboard) The rail is one tab stop with no spoken hint. **BACKLOG**, accessibility. Only a keyboard user meets it; Control+I also goes there. [T91B/keyboard/07.png]
19. (sev 1, detour-1) 'AI' in the Analyze filter matches letters inside names. **BACKLOG**, friction. Escape leaves it. [T91B/detour-1/10.png]
20. (sev 1, detour-3) A retried turn loses its failure lines. **BACKLOG**, friction. Should close with the words-stay unit; the re-walk says. [T91B/detour-3/11.png]
21. (sev 1, keyboard) Closing and reopening the panel collapses opened steps. **BACKLOG**, friction. One press reopens them. [T91B/keyboard/71.png]

### T92A

1. (sev 3, detour-1, keyboard) A complete, correct reply followed by 'Run an algorithm failed. Nothing changed.', and the run is rolled back. **FIX NOW, spoils, new** -- unit `run-scope`. Two of the four bridge questions on T92 A's own start. The run behind a right answer is gone, and the row says it failed. Likely mechanism: run_algorithm passes scope.where raw, so the word the scope line teaches, "selection", is read as a column and ends in E_SCOPE_EMPTY. [T92A/detour-1/04.png, keyboard walk at the first reply]
2. (sev 3, detour-1, keyboard) Send again deletes the reply it retries: a right answer replaced by a wrong one. **FIX NOW, spoils, new** -- unit `words-stay`. The final screen shows only the wrong answer, with nothing to compare. [T92A/detour-1/04.png, 08.png]
3. (sev 3, keyboard) The model changed the selection on a plain question. **BACKLOG**, friction. The model's act, and the screen says so ('Selected ...'); answers.md keeps the selection as T92 A's subject. First in line between rounds. [T92A/keyboard/70.png]
4. (sev 3, keyboard) With Whole graph on the line the reply still led with '6 of the 9'. **BACKLOG**, friction. The message did go as whole graph: its facts line says so, 'whatever is selected'. The model carried its earlier words. Reported as the model's; a new conversation gave 7 of 12. [--read output, keyboard walk]
5. (sev 2, detour-1, keyboard) A rolled-back turn leaves Redo lit with Undo dim. **BACKLOG**, friction. Nothing is wrong in the graph. Should go with the run-scope unit on this route. [T92A/detour-1/04.png, keyboard/70.png]
6. (sev 2, keyboard) One turn sat on 'Sending to Google' with a stale '7 steps' for about three minutes. **BACKLOG**, friction. It ended by itself; Stop is on screen. [--read output, keyboard walk]
7. (sev 2, keyboard) The scope x sends focus to different places. **BACKLOG**, accessibility. Only a keyboard user meets it. [focus output, keyboard walk]
8. (sev 2, success, keyboard) The reply, Top 10 and spoken news use ids. **BACKLOG**, wording. answers.md takes ids. [T92A/success/04.png, 08.png]
9. (sev 2, success) 'No visual changes were made' above 'Computed Bridges for 24 nodes' and an Undo. **BACKLOG**, wording. Model prose beside a true line. [T92A/success/04.png]
10. (sev 2, success) Open run lands on an empty Style tab. **BACKLOG**, friction. One more click to Values; the reader gets the numbers. [T92A/success/06.png, 07.png]
11. (sev 2, detour-2) Two change lines and one Open run. **BACKLOG**, friction. The other run is in Analyze's Recent. [T92A/detour-2/04.png, 07.png]
12. (sev 2, success) Clicking a Top 10 row moves the canvas and replaces the selection. **BACKLOG**, friction. The selection glide again; the scope line says so. [T92A/success/11.png]
13. (sev 2, success) A disabled Send looks enabled. **BACKLOG**, cosmetic. Reads as ready but its name says disabled; nothing is blocked. A shared Figma-locked look, so it needs care between rounds. [T92A/success/02.png, 04.png]
14. (sev 2, detour-3) A right-click on an edge replaces the selection before the menu opens. **BACKLOG**, friction. The scope line says so. The stray selection is the input of T91 B's row. [T92A/detour-3/05.png]
15. (sev 2, keyboard) The status news reports a run the turn then takes back. **BACKLOG**, accessibility. Only a screen-reader user meets it. Should go with the run-scope unit on this route. [--read output, keyboard walk]
16. (sev 1, keyboard) 'No microphone found.' stays under the composer. **BACKLOG**, cosmetic. Cosmetic. [T92A/keyboard/70.png]
17. (sev 1, success) The gear mark under 'Made with' has no words. **BACKLOG**, wording. Wording. [T92A/success/08.png]
18. (sev 1, success) The Find box wears its focus ring at the start. **BACKLOG**, cosmetic. Cosmetic. [T92A/success/01.png]
19. (sev 1, success) One node sits under the inspector's edge on the opening view. **BACKLOG**, cosmetic. Cosmetic; Fit recovers. [T92A/success/01.png]

### T92B

1. (sev 3, detour-2) Fact 2 with the model's selection on returned 'at least 6 genes above 1.1'. **BACKLOG**, friction. What the model chose to say or do; criteria.md reports it as the model's. Not a blocked route. Asking again gave 7; three walks gave 7, 7 and this. [T92B/detour-2/05.png]
2. (sev 3, success, detour-1) A computed fact can arrive with no chip. **FIX NOW, spoils, new** -- unit `chip-row`. answers.md marks a right fact 2 with only that reply behind it F, Build decided. On the success path the cause is the fork in TurnEffects: 'Selected 0 nodes' counts as a change, so the found 7 is hidden. A turn with a real change keeps its line, as decided. [T92B/success/12.png, detour-1/03.png]
3. (sev 3, detour-2) Show in table selects but does not sort or scroll to the rows. **BACKLOG**, friction. One click on the heading sorts them (T92 B success did). Friction, so it does not block. [T92B/detour-2/10.png]
4. (sev 2, success, detour-2, keyboard) The model clears the selection inside a question; 'Selected 0 nodes' under 'There are 7 genes'. **BACKLOG**, friction. The clearing is the model's act. The zero line goes with the chip-row unit. [T92B/success/12.png, detour-2/05.png]
5. (sev 2, success, detour-2, keyboard) One measure, two names: 'Computed Bridges' beside 'Betweenness'. **BACKLOG**, wording. Wording. [T92B/success/03.png, detour-2/03.png]
6. (sev 2, success) Ids for fact 1, names for fact 2; Top 10 ids only. **BACKLOG**, wording. answers.md takes ids. [T92B/success/07.png, 12.png]
7. (sev 2, detour-1) Undo of the filter restores the nodes to a different drawing. **BACKLOG**, friction. No count or style is wrong; the layout moved. [T92B/detour-1/04.png, 07.png]
8. (sev 2, detour-1) Open run on a run that painted nothing lands on an empty Style tab. **BACKLOG**, friction. One more click to Values; the reader gets the numbers. [T92B/detour-1/04.png, success/06.png]
9. (sev 2, success, detour-1) The same analysis sometimes repaints and sometimes not. **DECIDED**. decided.md, "Kept for the first round by the answer key" [T92B/success/03.png, detour-1/02.png]
10. (sev 2, detour-2) A long transcript draws a second scrollbar; 'Jump to newest' sits over the text. **BACKLOG**, cosmetic. Cosmetic; the reply can be reached. [T92B/detour-2/07.png, 08.png]
11. (sev 2, keyboard) Open run gives no signal. **BACKLOG**, accessibility. Only a screen-reader user meets it. [keyboard walk, step after 'Open run']
12. (sev 1, success) 'No matches.' rows do not say what was searched. **BACKLOG**, wording. Wording. [T92B/success/12.png]
13. (sev 1, detour-2) A reply saying it selected five has no 'Selected 5 nodes' line. **BACKLOG**, wording. The selection shows on the scope line. [T92B/detour-2/03.png]
14. (sev 1, success) The run's Style tab says 0 to 16120 where the key card says 16,124. **BACKLOG**, wording. A rounded scale end; Values and the key card hold the number. [T92B/success/06.png]
15. (sev 1, detour-3) Quick actions finds nothing for 'ask'. **BACKLOG**, friction. 'assistant' finds it. [T92B/detour-3/09.png, 12.png]
16. (sev 1, keyboard) 'Stopped. Changes taken back.' on a turn that changed nothing. **BACKLOG**, wording. Harmless wording. [keyboard walk, near the end]
17. (sev 1, detour-1) 'Undid Show me those 7 genes.' with the panel open beside Undone. **BACKLOG**, wording. Wording. [T92B/detour-1/07.png]
18. (sev 0, keyboard) Stop's cancelled call prints as a failed request. **DECIDED**. decided.md, "Esc in the composer stops a run": the app aborting its own fetch, no defect [keyboard walk]

### T93A

1. (sev 3, detour-1) Keep them did not keep them: the model hid the seven instead. **BACKLOG**, friction. The screen is truthful ('Filtered to 17 of 24 nodes', 7 hidden, Undo), and answers.md grades that state. The model's act after a no. First in line between rounds. [T93A/detour-1/15.png, 16.png]
2. (sev 3, detour-1) The request's title says 32 edges, its chip 63, and a click selects all 63. **FIX NOW, spoils, new** -- unit `edge-half`. Reproduced: a rule about a node column matches every edge. answers.md says this spoils bars 6 and 11. [T93A/detour-1/03.png, 06.png, 12.png, 14.png]
3. (sev 2, detour-2, detour-1) A held request changes the selection while saying nothing changed. **BACKLOG**, friction. Likely the held batch's measuring removal leaving the selection remapped; the scope line says so, and no count or removal is wrong. Friction. [T93A/detour-2/03.png, 04.png, detour-1/05.png, 06.png, 10.png]
4. (sev 2, success, detours 1, 3) The reply shown with the request is replaced; the seven names vanish. **FIX NOW, spoils, new** -- unit `words-stay`. The reader's report is 'what you did'; the names were on screen and are gone. decided.md, 'No turn folds'. [T93A/success/03.png, 05.png, detour-1/06.png, 10.png, detour-3/03.png, 11.png]
5. (sev 2, detour-4, detour-1) A question's text leaves the conversation once answered. **FIX NOW, spoils, new** -- unit `words-stay`. The same mechanism as T95 A's row. answers.md tells graders to read the earlier screenshot; the reader has only the last screen. [T93A/detour-4/03.png, 04.png, detour-1/03.png, 06.png]
6. (sev 2, detour-1, detour-4) The model offered 'only the 3 untrained'. **BACKLOG**, wording. What the model chose to say or do; criteria.md reports it as the model's. Not a blocked route. answers.md grades both choices. [T93A/detour-1/03.png, detour-4/03.png]
7. (sev 2, detour-1, detour-2) The model's 'permanent' and 'irreversible' against 'Undo can bring them back.'. **BACKLOG**, wording. What the model chose to say or do; criteria.md reports it as the model's. Not a blocked route. [T93A/detour-1/06.png, detour-2/04.png, 06.png]
8. (sev 2, detour-1, detour-4) The question's text is the smallest and palest on the panel. **BACKLOG**, cosmetic. Cosmetic, but it can hold the only caveat, so it comes early. [T93A/detour-1/03.png, detour-4/03.png]
9. (sev 2, detour-1) Change this ends the turn with a model call and 'Declined. Nothing changed.'. **BACKLOG**, friction. Focus goes to the composer, as designed; typing goes on. [T93A/detour-1/09.png, 10.png]
10. (sev 2, detour-1) Whole graph chosen with the x does not last. **DECIDED**. decided.md, "The x on the scope line lasts for one message and clears nothing" [T93A/detour-1/11.png, 12.png]
11. (sev 2, detour-2) Undo after a removal leaves a selection the reader never made. **DECIDED**. decided.md, "Kept for the first round by the answer key" [T93A/detour-2/05.png, 06.png]
12. (sev 2, detour-2, detour-1) Undo and Redo notices quote the sentence and double its period. **BACKLOG**, wording. Wording. [T93A/detour-2/06.png, 08.png, detour-1/17.png]
13. (sev 2, keyboard) Escape from the conversation list puts focus in the composer. **BACKLOG**, accessibility. Only a keyboard user meets it. [T93A/keyboard/24.png, 25.png]
14. (sev 2, detour-3) A reply gave ids where a reader needs names. **BACKLOG**, wording. Other replies give names. [T93A/detour-3/03.png]
15. (sev 2, success, detour-1) Count chips have no pointer cursor and no tooltip. **BACKLOG**, cosmetic. Hover peeks and click works. [T93A/success/04.png, detour-1/08.png]
16. (sev 2, detour-3) The find box with 'phone' offers only the 17 with a value. **BACKLOG**, friction. The Assistant is the task's route. [T93A/detour-3/07.png, 08.png]
17. (sev 2, detour-3) Right-clicking a node moved the drawing far from the pointer. **BACKLOG**, friction. No value is wrong; Fit recovers. Same glide as the Select step. [T93A/detour-3/06.png]
18. (sev 1, detour-1) The whole page sits 1 px higher from one screen on. **BACKLOG**, cosmetic. Cosmetic. [T93A/detour-1/07.png onward]

### T93B

1. (sev 3, success, keyboard, detours 1, 3) The card's edge chip says 361 where the card says 63, and a click selects all 361. **FIX NOW, spoils, new** -- unit `edge-half`. answers.md rules it: fix in the dry run. The cause, not traced by the pilot, is the rule read on edges that carry no such column: every one matches. [T93B/success/03.png, keyboard/22.png, detour-1/02.png, 06.png, detour-3/12.png, 13.png]
2. (sev 3, success) Hovering the card's chips peeks at the wrong edges. **FIX NOW, spoils, new** -- unit `edge-half`. The same target read by the peek: it shows edges in the tangle going, which is false. [T93B/success/04.png, 05.png]
3. (sev 3, detour-2, keyboard) Groups 10 beside Components 26; the list stops at ten and says nothing; spoken '10 groups'. **FIX NOW, spoils, new** -- unit `group-count`. RunValues counts the summary's list, which the element caps at ten: a wrong number on the check T93's follow-up invites. The key card's Other is separate and stays. [T93B/detour-2/12.png, detour-1/05.png]
4. (sev 3, detour-3) A stray selection fails the request and the offered way out cannot work. **FIX NOW, spoils, new** -- unit `send-again`. T91 B's defect: Send again resends the failed message's scope under a line reading Whole graph. [T93B/detour-3/06.png, 09.png, 11.png]
5. (sev 2, keyboard, detour-1) The reply says 'an irreversible change' above 'Undo can bring them back.'. **BACKLOG**, wording. What the model chose to say or do; criteria.md reports it as the model's. Not a blocked route. [T93B/keyboard/22.png, detour-1/06.png, success/07.png]
6. (sev 2, detour-2) A question while a request waits cancels it and erases the reply; 'Not run' does not say what. **BACKLOG**, friction. Asking again brings the card back. The words go with the words-stay unit. [T93B/detour-2/14.png]
7. (sev 2, success, detours 1, 3) A turn's earlier words are replaced with no sign when it resumes. **FIX NOW, spoils, new** -- unit `words-stay`. One mechanism with T92 A's and T93 A's rows; in detour-3 the only explanation of the failure goes. [T93B/success/06.png, 07.png, detour-1/02.png, 04.png, detour-3/09.png, 10.png]
8. (sev 2, detour-1) After Keep them the reply says 'Please confirm the action in the prompt on your screen'. **BACKLOG**, wording. What the model chose to say or do; criteria.md reports it as the model's. Not a blocked route. [T93B/detour-1/07.png]
9. (sev 2, detour-2) The turn's Undo above a waiting request breaks it. **BACKLOG**, friction. The model recovered by itself; the stale request says so. [T93B/detour-2/16.png, 18.png]
10. (sev 2, success) Undo of the removal brings the 82 back selected. **DECIDED**. decided.md, "Kept for the first round by the answer key" [T93B/success/13.png, 14.png]
11. (sev 2, detour-2, detour-3) Selecting from a chip changes the question and outlives the answer. **DECIDED**. decided.md, "Hover or focus peeks; only a deliberate click selects" [T93B/detour-2/03.png, detour-3/14.png]
12. (sev 2, detour-2) The x on the scope line does not clear the selection. **DECIDED**. decided.md, "The x on the scope line lasts for one message and clears nothing" [T93B/detour-2/05.png]
13. (sev 2, detour-2) Open run lands on an empty Style tab. **BACKLOG**, friction. One more click to Values; the reader gets the numbers. [T93B/detour-2/09.png]
14. (sev 2, success, detour-2) The undo notice shows with the panel open and is cut off. **BACKLOG**, wording. Wording and layout. [T93B/success/13.png, detour-2/16.png, 18.png]
15. (sev 2, keyboard) The request's buttons carry no context for a screen reader. **BACKLOG**, accessibility. Only a screen-reader user meets it. [T93B/keyboard/22.png]
16. (sev 1, keyboard) The second chip is reachable only by arrows. **BACKLOG**, accessibility. Only a keyboard user meets it. [T93B/keyboard/22.png]
17. (sev 1, keyboard) Two controls named '82 nodes, select'. **BACKLOG**, accessibility. Only a screen-reader user meets it. [T93B/keyboard/22.png]
18. (sev 1, keyboard) A step's chips change after the removal. **BACKLOG**, friction. A live count by design; the first steps' rows are not the card. [T93B/keyboard/37.png]
19. (sev 1, success, detour-2) Two names for one analysis; a stale 'for 331 nodes'. **BACKLOG**, wording. Wording. [T93B/success/07.png, detour-2/09.png]
20. (sev 1, detour-1) Change this offers nothing to change. **BACKLOG**, friction. Typing goes on. [T93B/detour-1/03.png]
21. (sev 1, detour-1) The change line 'Changed the graph' says nothing. **BACKLOG**, wording. Wording. [T93B/detour-1/05.png]
22. (sev 1, detour-1) Only Other has a count in the key card. **BACKLOG**, wording. Wording. [T93B/detour-1/05.png]
23. (sev 1, detour-3) 'Sending to Google' stays for up to a minute. **BACKLOG**, wording. The step count moves. [T93B/detour-3/07.png, 08.png, 10.png]
24. (sev 1, success) The chips give no pointer cue or tooltip. **BACKLOG**, cosmetic. Hover peeks and click works. [T93B/success/04.png]

### T94A

1. (sev 3, detour-3) Deleting the Communities layer restores the picture but leaves the run. **SESSIONS**. answers.md counts it against bar 7 and asks for it to be reported: how a returning reader takes a change back is what T94 is for, and where a run lives is theirs to show. [T94A/detour-3/06.png, 08.png, 09.png, 12.png]
2. (sev 2, keyboard) Undo in the turn lands focus on the top bar's disabled Undo. **BACKLOG**, accessibility. Only a keyboard user meets it; the accessibility walk counts it on bar 8. [T94A/keyboard/28.png, 29.png]
3. (sev 2, setup, any route) In 1 of 8 starts a click on Assistant just after the project opened stayed on Graph. **BACKLOG**, friction. A second click works; a start that fails is run again. Likely AssistantPlace's effect sending the place to Graph when the new element reports no features for a moment, not proven. [T94A/setup-race/03.png, setup.log]
4. (sev 1, detour-3) The run's Style tab is a blank pane. **BACKLOG**, friction. One more click to Values; the reader gets the numbers. [T94A/detour-3/08.png]
5. (sev 1, detour-1) The change line 'Changed the graph' says less than the reply. **BACKLOG**, wording. Wording. [T94A/detour-1/03.png]
6. (sev 1, detour-4) New conversation reads as a fresh start with the colors still on. **BACKLOG**, friction. The arrow still takes it back. [T94A/detour-4/04.png]
7. (sev 1, keyboard) Tab into the layer list lands on the bottom row. **BACKLOG**, accessibility. Only a keyboard user meets it. [T94A/keyboard, step after 'Add a layer or a folder']
8. (sev 1, success) Send is the full green primary while disabled. **BACKLOG**, cosmetic. Reads as ready but its name says disabled; nothing is blocked. A shared Figma-locked look, so it needs care between rounds. [T94A/success/05.png]
9. (sev 1, detour-3) One result carries several names: Communities, Louvain, Group 1 to 6, Groups. **BACKLOG**, wording. Wording. [T94A/detour-3/03.png, 08.png]
10. (sev 1, success, detour-3) The six-row key card hides a node. **DECIDED**. decided.md, "The key card is an overlay" [T94A/detour-3/03.png]

### T94B

1. (sev 2, keyboard) Undo in a turn takes focus away from the conversation; a typed letter is refused. **BACKLOG**, accessibility. Only a keyboard user meets it, so it goes to the backlog under this pass's rule; it fails bar 8 as written and comes first there. [T94B/keyboard/22.png, 29.png]
2. (sev 2, detour-2) Deleting the layers by hand leaves the Louvain run and no way off it. **SESSIONS**. As T94 A: reported through bar 7, left for the sessions. [T94B/detour-2/08.png, 10.png, 11.png, 12.png, 13.png, 15.png]
3. (sev 2, detour-3) A turn undone while another conversation shows does not read Undone when reopened. **FIX NOW, spoils, new** -- unit `undone-reopen`. answers.md's success includes the row reading Undone. The record is only marked for the open conversation, so a reader who did it right sees a change line and an Open run for a run that is gone. [T94B/detour-3/08.png, 10.png]
4. (sev 2, detour-1) Open layer and Open run do nothing once the layer or run is gone. **BACKLOG**, friction. No wrong value; the Graph place shows the truth. [T94B/detour-1/08.png, 09.png]
5. (sev 2, detour-1) 'Changed the graph' twice, and the reversed turns show no sign. **BACKLOG**, wording. The look and the layers are right. [T94B/detour-1/06.png]
6. (sev 2, detour-1, detour-2) Enter while a reply is arriving does nothing and says nothing. **BACKLOG**, friction. A second Enter sends it. [T94B/detour-1/03.png, 04.png, 05.png, detour-2/03.png]
7. (sev 2, keyboard) The turn's button is named only 'Undo'. **BACKLOG**, accessibility. Only a screen-reader user meets it. [T94B/keyboard]
8. (sev 2, detour-2) Open run lands on an empty Style tab. **BACKLOG**, friction. One more click to Values; the reader gets the numbers. [T94B/detour-2/11.png]
9. (sev 2, detour-1) Steps read 'Algorithm results 15 ms'; opening them pushes Undo half out. **BACKLOG**, wording. Wording; a scroll recovers it. [T94B/detour-1/07.png, 11.png]
10. (sev 1, success) The key card says 'Color: Louvain' to a reader who asked for crews. **BACKLOG**, wording. Wording. [T94B/success/04.png]
11. (sev 1, success) Rows change height between 'Open run, Undo' and 'Undone'. **BACKLOG**, cosmetic. Cosmetic. [T94B/success/06.png, 07.png]
12. (sev 1, detour-1) Undo's notice puts the reader's sentence after the verb. **BACKLOG**, wording. Wording. [T94B/detour-1/11.png]
13. (sev 1, detour-3) A draft survives New conversation. **BACKLOG**, friction. Cosmetic; it can be cleared. [T94B/detour-3/07.png]
14. (sev 1, tool) SETUP FAILED: the first --start missed 'AI provider...' although the screenshot shows it. **BACKLOG**, friction. The tool, not the app: match.mjs does not wait for a setup click. A start that fails is run again; five walks started clean. [T94B/setup-miss-1/01.png]

### T95A

1. (sev 3, keyboard, detour-2) Answering the model's question deletes it, and with it the only sentence saying the file has no quit data. **FIX NOW, spoils, new** -- unit `words-stay`. What the reader takes away is the last screen, and T95 grades that report: a list under a question about quitting, the caveat gone by the build's doing. [T95A/keyboard/26.png, 33.png, detour-2/07.png, 08.png]
2. (sev 3, detour-4) The reply states the guess as a finding after a question that never said the file lacks such data. **SESSIONS**. Whether readers take the model's plain text for a finding is T95's subject and question 3 of the round. [T95A/detour-4/06.png, 12.png]
3. (sev 3, detour-2) 'Exported ... for download' and no file: ai-export-ready has no listener in the app. **FIX NOW, blocks, new** -- unit `export`. The step's result never appears and no other control does it: every export the Assistant makes is lost. The event's contract hands the document to the application, and the app never took it. [T95A/detour-2/08.png, 09.png]
4. (sev 3, keyboard) Undo on 'Selected 6 nodes' undoes the other turn's run; both rows read Undone; 6 stay selected. **BACKLOG**, friction. Not a wrong step: an answer goes on with the message it answers, so the two turns hold one step, and selection is not undoable. Two Undos for one step is friction. [T95A/keyboard/33.png, 47.png]
5. (sev 2, detour-2) 'Saved as a named set' appears in neither the Graph nor the Data place. **BACKLOG**, friction. The task needs no set. [T95A/detour-2/07.png, 11.png, 12.png]
6. (sev 2, keyboard) Spoken 'Degree finished: v02 ranks first, 8' sounds like the answer. **BACKLOG**, accessibility. Only a screen-reader user meets it. [status line, keyboard walk]
7. (sev 2, detour-4) 'Or type an answer' refuses 'lowest hours'. **BACKLOG**, friction. The radios answer it, and a typed choice works. Against design 4.8, first in line between rounds. [T95A/detour-4/09.png, 10.png]
8. (sev 2, keyboard, detour-4) The transcript rewrites itself while an answer runs. **BACKLOG**, friction. It settles when the reply lands. May close with the words-stay unit. [T95A/keyboard/31.png, detour-4/11.png]
9. (sev 2, success) 'No changes were made' above 'Computed Connections for 24 nodes'. **BACKLOG**, wording. Model prose beside a true line; answers.md allows the run left behind. [T95A/success/04.png]
10. (sev 2, keyboard) The question's text is the smallest and palest on the panel. **BACKLOG**, cosmetic. Cosmetic, but it can hold the only caveat, so it comes early. [T95A/keyboard/26.png]
11. (sev 2, success, detour-3) Three names for one thing: Connections, Degree; PageRank, Influence. **BACKLOG**, wording. Wording. [T95A/success/07.png, detour-3/06.png]
12. (sev 2, success, detour-3) Run details and a reply use ids where the file has names. **BACKLOG**, wording. answers.md's id column. [T95A/success/08.png, detour-3/06.png]
13. (sev 2, success) Open run lands on an empty Style tab. **BACKLOG**, friction. One more click to Values; the reader gets the numbers. [T95A/success/07.png, 09.png]
14. (sev 2, detour-3) Right-clicking a node moves the drawing. **BACKLOG**, friction. No value is wrong; Fit recovers. [T95A/detour-3/01.png, 02.png]
15. (sev 2, detour-3) A question repaints the network. **DECIDED**. decided.md, "Kept for the first round by the answer key" [T95A/detour-3/05.png]
16. (sev 1, detour-4) A disabled Answer is the filled green primary with no reason shown. **BACKLOG**, cosmetic. Reads as ready but its name says disabled; nothing is blocked. A shared Figma-locked look, so it needs care between rounds. [T95A/detour-4/06.png, 07.png]
17. (sev 1, detour-2, keyboard) The Undid notice quotes the whole message and ends in two periods. **BACKLOG**, wording. Wording. [T95A/detour-2/05.png, keyboard/47.png]
18. (sev 1, keyboard) The top-bar Undo's name is the whole message. **BACKLOG**, accessibility. Only a screen-reader user meets it. [Shift+Tab walk, keyboard]
19. (sev 1, keyboard) After the turn's Undo, focus lands on the top bar's disabled Undo. **BACKLOG**, accessibility. Only a keyboard user meets it. [T95A/keyboard/47.png]
20. (sev 1, keyboard) Control+I in the composer can send focus to the top-bar Undo. **BACKLOG**, accessibility. Only a keyboard user meets it. [after the forward Tab walk, keyboard]
21. (sev 1, success) Bare 16 chips under three identical 'Query data' steps. **BACKLOG**, wording. Wording. [T95A/success/05.png]
22. (sev 1, detour-4) The Analyze filter's no-match state is a large empty panel. **BACKLOG**, cosmetic. Cosmetic. [T95A/detour-4/03.png]
23. (sev 1, detour-4) The camera moved with no 'Moved the view' line. **BACKLOG**, wording. Wording. [T95A/detour-4/12.png]

### T95B

1. (sev 3, detour-2, detour-3) A chip with Show in table sits under a claim from memory. **SESSIONS**. Whether readers separate the model's words from chips is question 3 of the round; decided.md says a chip is a tool result, and it is one here. [T95B/detour-2/14.png, detour-3/05.png]
2. (sev 3, detour-3) The model offers degree as a stand-in, then writes it as a finding. **SESSIONS**. T95's trap firing, as designed. [T95B/detour-3/03.png, 05.png, detour-1/05.png]
3. (sev 2, success) 'It can be wrong.' goes with the starters after the first message. **BACKLOG**, wording. Wording, and T95's result may say where it belongs. [T95B/success/02.png, 04.png]
4. (sev 2, keyboard) Control+I with Settings open moves focus behind the dialog. **BACKLOG**, accessibility. Only a keyboard user meets it. [T95B/keyboard/37.png]
5. (sev 2, detour-3) Raw field path in a change line: 'Sized 331 nodes by results.degree.value'. **BACKLOG**, wording. Friction, but it counts on bar 10 between rounds. [T95B/detour-3/04.png]
6. (sev 2, detour-3, detour-1) One measure has three names in a turn. **BACKLOG**, wording. Wording. [T95B/detour-3/04.png, detour-1/03.png]
7. (sev 2, detour-3) The change line leaves out the color and the selection the reply says were made. **BACKLOG**, wording. The picture shows them. Counts on bar 11 between rounds. [T95B/detour-3/04.png]
8. (sev 2, detour-2, detour-3) Show in table opens all rows in load order. **BACKLOG**, friction. One click sorts. [T95B/detour-2/16.png, detour-3/08.png]
9. (sev 2, detour-3) A long conversation adds an outer scrollbar and moves the header 15 px. **BACKLOG**, cosmetic. Cosmetic. [T95B/detour-3/05.png, 06.png]
10. (sev 2, detour-1, keyboard) A question repaints, selects and moves the scope. **DECIDED**. decided.md, "Kept for the first round by the answer key" [T95B/detour-1/03.png]
11. (sev 2, detour-1) The selection survives Undo. **DECIDED**. decided.md, "Kept for the first round by the answer key" [T95B/detour-1/08.png]
12. (sev 2, detour-2) The Data place's Attributes group lists no columns; its chip does nothing. **BACKLOG**, friction. The table shows the columns. [T95B/detour-2/04.png, 05.png, 11.png]
13. (sev 2, detour-2) Right-clicking a gene moves the drawing about 135 px. **BACKLOG**, friction. No value is wrong. [T95B/detour-2/11.png, 12.png]
14. (sev 2, success) The third starter uses the name column. **DECIDED**. decided.md, "Kept for the first round by the answer key" [T95B/success/02.png]
15. (sev 1, success) 'No matches for essential.' with a warning mark under a correct answer. **BACKLOG**, wording. Wording. [T95B/success/04.png, 05.png]
16. (sev 1, detour-3, detour-2) Step names are the tool's, with bare chips. **BACKLOG**, wording. Wording. [T95B/detour-3/06.png, detour-2/15.png]
17. (sev 1, detour-1) 'Undid Which nodes matter most?.' with the panel open. **BACKLOG**, wording. Wording. [T95B/detour-1/08.png]
18. (sev 1, keyboard) 'Stopped. Changes taken back.' when nothing had changed. **BACKLOG**, wording. Harmless wording. [T95B/keyboard/45.png]
19. (sev 1, success, detour-3) 20 to 25 seconds in, only 'Sending to Google' and a step count. **BACKLOG**, wording. The step count moves. [T95B/success/03.png, detour-3/02.png]
