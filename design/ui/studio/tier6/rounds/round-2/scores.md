# Tier 6 round 2 scores: meeting the Assistant

Scored against `../../criteria.md` on the frozen build 3b2a7f0649 (graphty@0.8.92). Sources: the 12
`grade.md` files in `sessions/`, the `repro/` folders, and the four expert reports of the same build in
`../round-1/expert/` with `../round-1/insights.md`, which count here unchanged (`expert/from-round-1.md`).
`engineer.md` is the screenshot audit: "Engineer 5" means finding 5 there, and likewise for Figma, visual
and accessibility. "Insights 3" means finding 3 in `../round-1/insights.md`. `r2-s01` to `r2-s12` are the
session folders. These are the first sessions of the study: no reader ran in round 1.

## Headline

**Readers can use the Assistant: 11 of 12 sessions succeeded, none claimed a false "done", and every
task has a success.** All 12 ran on the frozen build, none void, all on claude-opus-5-5. The participants
are simulated, so a pass is weak until real people confirm it, and a failure is strong evidence.

**6 of the 12 bars hold, 3 fail, 2 did not hold because their source has not read the sessions, 1 is open.**

- **Hold:** 1 tasks succeed, 2 no false "done", 3 a handed key gets going, 4 failure is recoverable, 5
  readers doubt the right things, 6 an approval is read. Bars 4 and 5 hold weakly (see each below).
- **Fail:** 7 a change can be taken back (1 of 2), 8 the keyboard (on the accessibility walk, not on
  Sam's sessions), 9 no severity 3 left (1 confirmed).
- **Did not hold:** 10 the app does the talking, 11 computed numbers are true. No exception to bar 11
  was found, but the audit has read none of the 193 session screens.
- **Open:** 12, which is about fixes, and none has started.

**The one confirmed severity 3:** a project opened from the start screen, with its changes undone, has no
way back once the tab closes, and "Autosave: saved" had said nothing to warn of that. It is the only
failed session, and the reader's Undo had already worked before she closed the tab.

**23 problems confirmed: 1 at severity 3, 14 at 2, 8 at 1. Six candidate insights** for the skeptics.

## The bars

| Bar | What it says | Result | Count |
| --- | --- | --- | --- |
| 1 | Tasks succeed | **Holds** | 11 of 12 S or SD (7 S, 4 SD, 1 F); every task has at least 1 of 2 (T94 has 1). No `Model decided: yes`, so the count without one is the same |
| 2 | No false "done" | **Holds** | 0 of 12 |
| 3 | A reader handed a key gets it going | **Holds** | 2 of 2 got a real answer unaided; disclosure 3 of 3 on both |
| 4 | Failure is recoverable | **Holds, weakly** | 2 of 2 sessions that met a failed message recovered, by a route the screen offered, with no wrong cause stated. 0 of 2 learned the cause (see "Bar 4") |
| 5 | Readers doubt the right things | **Holds, weakly** | 3 of 4 sessions qualify (2 needed); 0 of 3 passed a claim on as fact in the first report (see "Bar 5") |
| 6 | An approval is read | **Holds** | 2 of 2 `Card: read (card)`, each report agrees with the network and names the difference (7 against about 3; 82 against about 20) |
| 7 | A change can be taken back | **Fails** | 1 of 2. r2-s10 ended restored after two changes. r2-s09 did not end with the project at all (see "Bar 7") |
| 8 | The keyboard is enough | **Fails** on the accessibility walk | Sam: 2 of 2 sessions reached their end with no pointer. Focus: an approval and an Undo fail on the walk. Undone and Transcript not heard (see "Bar 8") |
| 9 | No severity 3 or 4 is left | **Fails** at the round's end | 1 confirmed severity 3; 1 more open at 3 with no reproduction (see "Severity 3 claims") |
| 10 | The app does the talking | **Did not hold** | 5 of 11 state rows reached whole, 6 partly; 88 of 679 screens read, none of them a session's (see "Bar 10") |
| 11 | Computed numbers are true | **Did not hold**: its source has not read a session | 0 exceptions found by 12 graders; 0 of 193 session screens audited; 1 change line not seen (see "Bar 11") |
| 12 | The experts' findings are answered | **Open** | 20 merged severity 2 findings: 0 fixed, 1 kept, 1 kept in part, 18 open. Unchanged from `../round-1/scores.md`, "Bar 12"; 7 now have a reader behind them (see "Bar 12") |

Bar 9 is reported twice by rule; this is its round-end report. Bars 8 to 12 are rescored on the fixed
build.

## Per task and dataset

| Task half | Dataset | Persona | Session | Grade | Wrong turns | Steps against the path | Model calls | Messages |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T90 A | volunteers | Grace | r2-s01 | SD | 1 | 17 against about 15 | 13 | 4 (2 failed) |
| T90 B | sources | Sam, keys only | r2-s02 | SD | 3 | 16 against about 15; 55 key presses | 9 | 3 (2 failed) |
| T91 A | volunteers as saved | Ruth | r2-s03 | S | 1 | 8 to success, 16 to report, against 3 to 5 | 19 | 3 |
| T91 B | yeast genes | Maren | r2-s04 | S | 1 | 4 to success, 10 in all, against 3 or 4 | 6 | 1 |
| T92 A | sources left selected | Dev | r2-s05 | SD | 1 | 7 against 4 to 9 | 11 | 2 |
| T92 B | yeast genes | Maren | r2-s06 | S | 0 | 8 against 4 to 9 | 12 | 2 |
| T93 A | volunteers | Dev | r2-s07 | S | 0 | 7 against 5 or 6 | 11 | 2 |
| T93 B | yeast genes | Sam, keys only | r2-s08 | S | 0 | 12 presses against 4 or 5 pointer steps | 6 | 1 |
| T94 A | Les Miserables poster | Ruth | r2-s09 | **F** | 5 | 29; 9 to the Undo, against 3 or 4 | 2 | 1 |
| T94 B | volunteers thanks | Grace, returning | r2-s10 | S | 0 | 10 against 6 or 7 | 9 | 2 |
| T95 A | volunteers | Grace | r2-s11 | S | 0 | 9 against 3 | 10 | 3 |
| T95 B | yeast genes | Dev | r2-s12 | SD | 0 | 8 against 3 | 17 | 3 |

- **Per task:** T90 2 of 2 (both SD), T91 2 of 2, T92 2 of 2, T93 2 of 2, T94 1 of 2, T95 2 of 2.
- **Per domain:** yeast genes 4 of 4; people 7 of 8. The one fail is a people dataset, on a project
  file, and has nothing to do with the data's domain.
- **With and without a build defect:** 0 sessions carry `Build decided: yes`, because the key does not
  name the defect behind r2-s09. Read it either way: 11 of 12 as graded; 11 of 11 without r2-s09; 12 of
  12 if r2-s09 stopped at step 12, where every part of its success state was true. Bar 1 holds on all
  three, and bar 7 holds only on the third.
- **Models:** 12 of 12 on claude-opus-5-5, checked in every participant log (21 logs, 835 model lines).
  **0 sessions ran on Sonnet.** No session ended on an API error, so no retry applied.
- **Void:** 0, so no `<id>b` re-run. `leaks.json` lists 0 leaks in all 12.
- **Build:** 12 of 12 `session.json` files read 3b2a7f0649 with no uncommitted changes; no step missed.
- **Model use:** 125 calls for 27 messages. Highest session 19, against the limit of about 40. The
  `repro/` walks made 29 more.

Steps on keys are reported apart: Sam's counts are not comparable with the pointer sessions'.

## Bar 4: the failed message

Both T90 readers hit "Could not reach OpenAI: the connection failed. Nothing changed." (viewed on r2-s02's
`29.png`, still on screen after recovery). Both resent once, which cannot work. r2-s01 went by
Settings, then AI provider; r2-s02 by the model label. No other session met a failed message: Send again
appears in no other route.

It holds as worded: a route the screen offered, and `Failure read: key` under the key's rule that "I
cannot tell" counts as key. It holds weakly for three reasons:

- **Neither reader learned what failed.** "I can't say whether the key is at fault"; "I cannot tell from
  the screen". Sam leaned toward the network and kept the doubt open. The bar asks for no wrong cause,
  and that is what a failure that names no cause gives.
- **The prompt handed over the second key.** Grace says only that note got her past it. A reader with one
  bad key was not tested.
- **The tool printed the browser's CORS error to both participants**, which no reader sees. Both said so.
  It may have shaped their reading in either direction.

## Bar 5: readers doubting

| Session | Trap fired | Taken on trust | What happened |
| --- | --- | --- | --- |
| r2-s05, T92 A | yes | no | "Among your selected sources, Victor Szabo" (`05.png`, viewed). Dev caught the narrowing and pressed the x; his report marks fact 1 as the model's |
| r2-s06, T92 B | no | no | Both replies were right, so it does not count |
| r2-s11, T95 A | yes | no | The list of five came from her answer to the model's question, so it is the reply, by the key's own line. The grader called this a judgment call; the key settles it. On a narrow reading the count is 2 and the bar still holds |
| r2-s12, T95 B | yes | no | "known essential genes like MCM1 and RAP1" (`08.png`, viewed), then a database named with only local queries behind it. He gave the labels as an AI's, unchecked |

Weakly, for three reasons. Two of the three qualifying sessions are Dev, the persona written to "take what
they say", and he doubted both times, so the persona may not be doing its job. The doubt came from the
reader rather than the screen: Dev's catch rested on one word of the model's, and Grace got her warning
because she asked outright ("The honest warning only came because I asked"). And "citing the Saccharomyces
Genome Database" went into r2-s12's first report firmer than anything on screen supports, though it stayed
marked as the AI's.

The report's first limit stands: nobody falsified a reply, so a wrong number in prose beside a chip that
disagrees went untested.

## Bar 7: taking a change back

**Undo itself worked in 2 of 2.** r2-s10 undid two changes with the turn's Undo, and `look`, the layers,
the runs and the card all match the start. r2-s09's Undo brought everything back: `look` 1328d3dd4bea
again, the card, the four layers and the row reading Undone, from `09.png` to `12.png`.

r2-s09 fails on its end state. Autosave had said "saved" with the AI's colors on and again after Undo, so
Ruth closed the tab to see which was kept, and the project never came back. Her end records describe the
start page's showcase drawing, so its `louvain` run is not a run left behind. The grade stands: bar 7
needs the session to end with the conversation there, and it did not. The fault it found is not in Undo.

## Bar 8: the keyboard

- **Sam's sessions:** 2 of 2 reached their end with no pointer (`keyboardOnlyMode: true`, 0 missed
  steps). This half of the bar holds. In r2-s02 focus stayed in the composer after Save, each failure and
  the reply. `--keys` sessions cannot show the next key landing, by the bar's own note.
- **Focus at the five moments,** from the accessibility walk of this build: a send and a reply hold. An
  approval and an Undo fail for real (Insights 4). Settings closing fails as worded, though returning to
  the opener is right by WCAG 2.4.3 (Insights, bar table).
- **Status words:** Undone and Transcript not heard.

The fix is the one rule in Insights 4: after Remove, Answer and Undo, focus goes to the composer.

## Bar 10: the app does the talking

**Screens read:** the audit's 88 of the 679 taken (486 by the walks, 193 by the sessions). No audit of the
session screens has run. Participants opened a folded step on T91, T92, T94 and T95; no session did on
T90 or T93, so the audit still owes those two.

**State list.**

| Design section | State | Reached by | Result |
| --- | --- | --- | --- |
| 4.1, 4.2 | No provider; the provider section | r2-s01, r2-s02, walks | Reached |
| 4.3, 4.4 | Ready and empty; a reply, steps opened | Every session; walks | Reached |
| 4.5 | Working; Stop; a stray Esc | Working: every session. Stop and Esc: walks | **Partly.** No session pressed Stop, and no walk showed a change existed before Esc |
| 4.6 | A change; every row of 6.6 | Colored, Sized, Computed, Removed, and now Selected (r2-s01 `18.png`, r2-s11 `07.png`, viewed) | **Partly.** Set, Arranged, Filtered, Changed values, Moved the view, Changed the graph, excluded and No matches appear in no grade or report |
| 4.7, 6.5 | Each approval card | `large` removing: r2-s07, r2-s08, walks | **Partly.** No other card reached |
| 4.8 | A question from the Assistant | r2-s07, r2-s11, walks | Reached |
| 4.9 | Failed: at setup; a 429; during a change | Connection failure: r2-s01, r2-s02. 429 and during a change: walks | **Partly.** The refused-key row with AI provider... is still unreached: a browser hides the 401 |
| 4.10 | Away from the panel | Walks | **Partly.** A change landing and an answer landing not reached |
| 4.11 | Conversations; a `--reopen` return with the key gone | Accessibility `k1/167` | Reached |
| 4.12 | Talking, each voice line | "No microphone found." only | **Partly.** No session used Talk |
| 6.4 | Every result code | `graphty/src/workspace/assistant/__tests__/words.test.ts`: 36 of 36 at round 1's scoring, not run again; no app code has changed | Reached |

**Two readings for the audit.** Neither is settled:

- "assistant node style" (Figma 4) appeared in no session: `styles.json` holds no such name in the 12.
- `r2-s04/06.png` (viewed) shows "Rule: data.gal4RGexp < -1, 9 nodes" on an app-drawn row, which is the
  selector the model passed. r2-s03 got "trained: no, 9 nodes" for a rule of the same kind, so the app can
  word one. Whether the raw form counts as a tool's arguments is a reading. The run label "Bridges
  (visible)" in r2-s05's table is the same question; its origin is not traced.

## Bar 11: computed numbers are true

**Counts: no exception.** Each grader checked the session's chips, cards and change lines against the
key and the records, and none disagrees: 82 and 63, 7 and 32, 9, 12 and 7, 24 and 63, the group sizes.
r2-s07's repro showed a chip of 5 beside "7 people", which is a true count of something else, not an
exception, by the key's ruling, and no session met it.

**Every reply that claims a change has a line, with two open points.**

- **One line not seen.** r2-s01's second reply says "I updated the selection", and its end sits below the
  fold in `18.png` (viewed). The reader never scrolled, so whether a line follows is unknown.
- **The open ruling now has readers.** Replies said "colored everyone by their group" (r2-s10 `05.png`),
  "colored each node accordingly" (r2-s09) and "styled the network by connectivity" (r2-s12 `08.png`) over
  "Computed ..." alone, with no Colored row. By Insights 3 that line is a change line, so none breaks the
  bar. If the ruling goes the other way, 3 sessions do.

"Selected N nodes" appeared where a selection was claimed on the screens I viewed, so the gap Insights 3
named did not show here. The sessions did not take the path that causes it.

**Why it did not hold:** the bar is counted from the audit and allows zero exceptions, and the audit has
read no session. Graders checked what bore on their grades, not every count on 193 screens.

## Bar 12: which expert findings now have a reader

No fix has started, so the table in `../round-1/scores.md`, "Bar 12", stands. Readers met 7 of its 20
findings: one measure with several names (Figma 3), Show in table (Figma 9), the Undo notice (Figma 10), a
failure reading as a reply and Send again (Figma 11, visual 2), a repaint with no line of its own (Figma
1), the scope line's size (visual 5), and the disclosure as the smallest text (visual 7). The disclosure's word count stays kept: bar 3 passed with it.

## Confirmed problems

Confirmed here means two participants, a reproduced defect, or an expert finding the audit or a session
also shows. Bar 9's own rule is narrower: only row 1 is a 3, so only it counts there. A row marked "kept"
is held for this round by `../../decided.md`, and that round is now over.

| # | Problem | Evidence | Severity | Owner |
| --- | --- | --- | --- | --- |
| 1 | A project opened from the start screen, with its changes undone, has no way back once the tab closes: no Resume, no Recent projects, no card, no word | r2-s09, steps 12 to 21; `repro/r2-s09/run.sh`. Viewed `walk-undone/05.png` (bare start page) against `walk-kept/04.png` (Restore card) | **3** (see below) | graphty |
| 2 | "Autosave: saved" says neither what nor when, and reads the same with a change on and after Undo | r2-s09 (sent her to close the tab), r2-s10 (took the saved copy on trust) | 2 | graphty |
| 3 | A failed key reads as a connection failure, and Send again cannot help. Kept | r2-s01, r2-s02; `repro/r2-s01/run.sh`; Figma 11, visual 2 | 2 (see below) | graphty-element, then graphty |
| 4 | After a failure with a key saved, the row offers no way to the provider, and Settings opens on General | r2-s01; `repro/r2-s01/`, `walk/05.png`. r2-s02 found the model label | 2 | graphty |
| 5 | A question repaints the network unasked. Kept. r2-s02's reply says it worked "without altering the graph's styles" over a changed look (`29.png`, viewed) | r2-s01, r2-s02, r2-s06, r2-s12: 4 of the 6 sessions on T90, T92 and T95; `look` changed in each. Figma 1 | 2 | graphty-element |
| 6 | One measure has several names | Reach, Closeness (r2-s01); Bridges, Betweenness (r2-s05, r2-s06); Connections, Degree (r2-s12); Separate pieces (r2-s08); Communities, Louvain (r2-s10). Engineer 6, Figma 3 | 2 | graphty-element and graphty |
| 7 | Show in table leaves the rows it names out of view | r2-s06 and `repro/r2-s06/run.sh`, `walk/04.png`; r2-s07, r2-s12; Figma 9, visual 19 | 2 | graphty |
| 8 | A long conversation draws two scrollbars and leaves the end of the reply below the fold | r2-s01 `18.png` (viewed), r2-s12; `repro/r2-s01/`, `walk/10.png`; engineer 2 | 2 | graphty |
| 9 | The next message's scope moves with the selection, and the scope line does not warn. Show in table moves it too | r2-s05 (the plant), r2-s01 (Selection 1), r2-s03 (Selection 9), r2-s11 (Selection 16); Insights 2, visual 5 | 2 | graphty |
| 10 | A waiting question's words are the smallest text on its card, and its turn holds only a chip | r2-s07 `05.png` (viewed), r2-s11; engineer 9, accessibility 31 | 2 | graphty |
| 11 | Opened steps say what ran, not what was asked: a name, a time, a chip | r2-s03, r2-s04, r2-s05, r2-s09, r2-s10; Figma 16, visual 16, accessibility 20 | 2 | graphty-element and graphty |
| 12 | Enter in the API key box does nothing and says nothing | r2-s02; `repro/r2-s02/`, `walk/07.png` to `08.png`; accessibility 35 | 2 | graphty |
| 13 | Replies before and after an approval run together: "nothing has been changed yet" sits directly above "deleted those 7 nodes" | r2-s07, r2-s08; Figma 18, visual 15 | 2 | graphty |
| 14 | Open run does not say what it does, and lands on Style where the numbers are under Values | r2-s06, r2-s09, r2-s10; accessibility 12 | 2 on r2-s06, 1 on the others | graphty |
| 15 | Community results come back as Group 1 to Group N, under "Color: Louvain", to a reader who asked for circles or crews (`r2-s10/05.png`, viewed) | r2-s09, r2-s10. Neither tried a hover, so this is what they met, not a proven absence | 2 | graphty |
| 16 | "Sends to Google" does not say what is sent; the tooltip says "graph details" | r2-s06, r2-s10, r2-s11; r2-s01 and r2-s02 ask the same | 1, opinion rule | graphty |
| 17 | "Undo can bring them back" under a request for "for good" or "permanently", and no word on when Undo stops | r2-s07, r2-s08 | 1 | graphty |
| 18 | The Undo notice ends in a doubled period | r2-s09; `repro/r2-s09/`, `walk-undone/04.png`; Figma 10 rates it 2, accessibility 17 | 1 | graphty |
| 19 | Opening the table shrinks the drawing and covers part of it | r2-s04, r2-s07, r2-s12 | 1 | graphty |
| 20 | A number column's first click sorts highest first; the line above the table says so | r2-s04, r2-s11 | 1 | graphty |
| 21 | The turn's Undo goes with no word: after a hand edit, and from the first turn when the second lands | r2-s03, r2-s10. The newest-step rule is settled by `decided.md`, so only the silence is open | 1 | graphty |
| 22 | Settings opens with focus on the dialog's X, four presses from the API key | r2-s02; accessibility 28 | 1 | graphty |
| 23 | The wheel does not scroll the start page; mechanism not traced, and both sightings used the tool's `--wheel` at one point, so a tool cause is not ruled out | r2-s09; `repro/r2-s09/`, `walk-undone/05.png` to `06.png` | 1 | graphty |

Round 1's other confirmed problems met no reader here and stand as `../round-1/insights.md` left them,
including the rollback beside "Nothing changed." (Insights 7). One question got an answer: 0 of 2 T90 readers
pressed Done with a typed key (Insights 6). Both used Save, so it stays at 2 with no reader cost shown.

## Severity 3 claims

| Claim | What I checked | Result |
| --- | --- | --- |
| **The project with no way back** (r2-s09, grader's 3) | Viewed both repro screens. Read `remember` in `graphty/src/workspace/project/actions.ts` (a file with no handle is not remembered) and `findKept` in `autosave/autosave.ts` (offers only an entry marked dirty). `graphty/src` has no `beforeunload` handler, so the missing warning is not the tool's | **Confirmed at 3.** One participant and a reproduction, and the cost is real: 9 steps and 5 wrong turns, seven places searched, the reader left blocked |
| **A refused key reads as a connection failure** (the key's 3) | Both sessions. The key says a rating stands until a session shows otherwise | **Down to 2.** Neither reader was blocked or left with a wrong belief. Its 3 is untested for a reader with one bad key |
| **At 400% the Settings page gets no height** (Insights 1) | `repro/` has no folder for it | **Open at 3, not counted.** Still needs a reproduction, which costs no model call |

The key's other 3s did not appear: the Assistant's file (no session made one), the x keeping the earlier
answer (r2-s05 reached 7 of 12), "at least 6" (r2-s06 read all 331), the chip of 15 (r2-s03).

**The strongest case against row 1, for the skeptics.** Nothing from the file was lost: it opens as it was.
Ruth closed the tab herself. The setup opened the file, so she had no memory of where it lived, which a real
reader would. Her briefing's `--reopen` row and her history both promised Recent projects, which this setup
cannot give. A clean project also has nothing to restore, so `findKept` may be right to offer nothing.

**Why it stays 3 for now.** She was blocked, which is the criteria's test. The screen had said "saved"
throughout. A different door opens the same file with a handle: the main menu's Open project or file. The
conversation went too, though whether reopening the file brings it back was not tested. If the skeptics
hold that the study built the block, it falls to 2 and bar 9 reads no confirmed 3.

## Items the key kept until this round

`../../decided.md` and `../../answers.md` held these so the sessions could measure them. They are now free
to fix, and this is what the sessions say about each.

| Kept item | What the round says |
| --- | --- |
| The refused key reading as a connection failure | "How readers get out decides the shape of the fix." Both resent once, then found the provider by two different doors, and neither learned the cause. So the row should say the key may be at fault, offer the provider section, and stop inviting a retry that cannot help |
| A selection surviving Undo | "T92 A studies whether that scope line is enough." It was not: Dev caught the narrowing from the model's word "selected", not the line, and says the line "does not say it will narrow the answer". One session, but that is the question the key set |
| An analysis asked as a question repainting | Seen in 4 of the 6 sessions on T90, T92 and T95; one reply denied it. Readers disliked it or were surprised; one liked it |
| The `name` starter | No evidence: 0 of 12 clicked any starter |
| No shape check on a Google key | Not met |

## Candidate insights

For the skeptics to test. Each is from these sessions, with the expert work beside it.

**1. Readers check through the table, and that door is the weakest one.** Show in table or the table was the
check in r2-s03, r2-s04, r2-s05, r2-s06, r2-s07, r2-s09, r2-s10, r2-s11 and r2-s12. Nobody hovered a chip in
any of the 12 (`route.jsonl`), and on T92 nobody clicked one. Yet the door leaves its rows out of view (row 7),
moves the next message's scope (row 9) and shrinks the drawing (row 19). The design rests on a check costing
one hover, and readers do not use that one.

**2. A change that applies at once is comfortable only while the reader can tell what is safe.** r2-s03 and
r2-s04 were at ease on their own work. On a colleague's finished project r2-s10 wanted to be asked first, and
r2-s09's worry about "Autosave: saved" led to the only failure. Neither wished for a preview as such: what
they lacked is what the save holds. That points at row 2, not at reversing "Reversible changes apply at once".

**3. Returning readers prove a restore with the layer list.** Both T94 readers left the chat for Graph to
compare layers with their notes, and Ruth did it twice. Neither T91 reader looked for it: r2-s03 had Open
layer. The list is missed when a reader needs proof, not when they make a change.

**4. The model's knowledge and the file's facts look alike until a reader asks.** Plain text is the model's by
design, and readers did separate them, in 3 of 3 trap sessions. But the separation cost a question each time:
r2-s11's list had no warning until she asked, r2-s12's labels had no source until he asked, and r2-s10's
"Detected 3 distinct crews" read as a finding until the table showed no crew column. Model decisions, and
the screen did give a way to tell, so this is no defect by the criteria. The question is whether a reader
who does not ask gets there.

**5. A turn does not own all of what it did.** A repaint under "Computed" (rows 5, 11), a reply denying it
(r2-s02), a color request answered "Computed Communities" (r2-s09, r2-s10), a selection nobody asked for
(r2-s01). No reader was left with a wrong belief. This is the evidence the open ruling on a Colored row asked
for, and it leans toward giving a painting run its own row.

**6. Readers wonder what a question costs, and nothing answers.** r2-s12 read a rising step count as spending;
r2-s02 asked what a question costs. Treat with care: every persona's history says each question costs money,
so the study primes this.

**What held up, in sessions:**

- Finding the Assistant: 2 of 2 named the word at once.
- The approval card: read 2 of 2, and its count was right.
- Undo in the reply: the first choice in 2 of 2, and it restored everything both times.
- The disclosure, once read: 3 of 3 twice, and both readers changed what they would load.
- "It can be wrong": noticed and liked by r2-s03, r2-s04 and r2-s09.

## Round questions

1. **Who catches a wrong number, and how?** Dev, from the word "selected" in the reply, not from the scope
   line. One session, and a reply without that word would have gone through.
2. **Does anyone miss the layer list?** 2 of 4: both T94 readers, to prove the restore.
3. **Is an unsupported answer read as a finding, and are the model's words told from chips?** No on T95, in
   2 of 2 first reports; r2-s10 briefly did on T94. Chips were not taken as support, and r2-s12 told them apart
   only by asking.
4. **Is a change that applies at once comfortable?** Yes for 2 of 4, with no wish for a preview in 3 of 4.
   r2-s10 wanted to be asked first on a colleague's work.
5. **Do readers check chips unasked?** They check the facts unasked, not the chips: 2 of 2 on T92 used Show in
   table, r2-s06 also Open run, and neither hovered or clicked a chip. Dev left the fact with no chip unchecked
   until the follow-up.
6. **Is the approval read?** 2 of 2. r2-s07 already knew 7 from the question, so the card only confirmed it.
   One card, seen once, cannot speak to fatigue.
7. **Is the word Assistant found first time, and do starters teach?** Found, 2 of 2, though every prompt
   called the reader a returning user (see "Study defects"). Starters: 0 of 12 used, though 7 readers remarked
   on them. They taught nothing here.
8. **Do readers understand what is sent, and does it change what they would load?** Yes and yes, 2 of 2 at 3 of
   3. Neither would load the real list as it is. Sam read the notice only for the follow-up.

## Measures

| Measure | Result |
| --- | --- |
| First move (T90) | The word, named at once, 2 of 2 |
| What the reader would load (T90) | r2-s01: no phone column, ids for names, no donors, the director's OK first. r2-s02: no emails or phones, names coded, or Local only. Reason in both: the people did not agree to it. Grace's belief that nothing lets her hold a column back was not tested |
| Scope noticed (T92 A) | Yes, from the reply's word |
| Hand edit (T91 A) | Open layer: Fill, color, swatch |
| Checks before the follow-up (T92) | r2-s05: Show in table, fact 2 only. r2-s06: Open run, Show in table, inspector, a sort, folded steps. Chip hover or click: 0 of 2 |
| Checks after the follow-up (T92) | r2-s05: folded steps, the table's Betweenness column. r2-s06: none recorded |
| Looked for the layer list (T91, T94) | r2-s03 no, r2-s04 no sign, r2-s09 yes twice, r2-s10 yes |
| Wish for a preview (T91, T94) | None in r2-s03, r2-s04, r2-s09. r2-s10: asked first, or told the project is safe |
| Starters | 0 of 12 used; 7 readers remarked on them |
| How a change was reversed (T94) | Undo in the reply, 2 of 2 (once, and twice) |

## Unconfirmed, one session each

Worth a fixer's attention, not counted:

| Problem | Evidence | Severity |
| --- | --- | --- |
| "Picked by hand: 9 nodes" on a layer the Assistant made. In the backlog at 2 | r2-s03 `13.png`, `14.png`; no repro | 2 |
| The table has no way in from the Data place, and its button has no word | r2-s04, steps 7 and 8 | 2 |
| Nothing records what scope a sent message went with | r2-s05, `07.png`, `08.png` | 2 |
| A reply that reuses an earlier run has no chip, line or Open run | r2-s05, `08.png` | 2 |
| The Poster row's count becomes an unexplained icon under a new layer | r2-s09, `08.png` | 2 |
| The top bar's Undo lights while the graph has not changed, and the turn's Undo sits beside a line that only computed | r2-s08, `08.png`, `09.png` | 1 |
| The x does not drop the selection's rings, and Show in table replaces a selection the reader may want. Both are settled, by `decided.md` and design 5.3; the cost was a wrong turn and doubt | r2-s03, r2-s05: two different acts, so not one confirmed problem | 1 |
| After Remove, the steps count falls from 3 to 1, then 4 steps and both lines appear | r2-s08; not reproduced | 1 |
| The drawing moved partly out of view during a reply, then came back | r2-s01, `15.png` to `17.png`; not traced | 1 |

The model's choices, reported as the model's: offering "only the 3 untrained" (r2-s07, which its repro did not
bring back), ids in place of names (r2-s01, r2-s05), an unasked phone number, a first request that paints
nothing (r2-s03), and pink among oranges.

## Study defects

| Defect | Evidence | What it did |
| --- | --- | --- |
| **Every first prompt said "a RETURNING user of this app"**, in 9 sessions meant as first meetings | 12 of 12 first prompts, checked in the logs. `plan.md`, open item 4, was never fixed | No visible effect, by one grader's reading. It still limits every first-meeting result, round question 7 above all |
| **The tool printed the browser's CORS error to participants** | r2-s01, r2-s02, both noted it | May have shaped `Failure read:`, and so bar 4 |
| **T94 A's briefing and history promise what its setup cannot do** | The `--reopen` row says Recent projects is still there; the history says she reopened from it; the setup opens the file with no handle | Helped lead Ruth to the close and the search, and bears directly on row 1 |
| **`answers.md` was not matched to this build** | `plan.md`, open item 2. Several lines describe defects this build fixed | No session was marked by such a line, so no grade moved |
| **The restart is not logged in `criteria.md`** | `plan.md`, open item 6; the change log has no such line, and the text still says one round | Nothing here changes; the Director's to log |
| **`truth_on_screen` means little here** | 7 of 12 grades carry it, 5 do not. It applies only to a false "done", and there were none. r2-s05 reads false, though its `grade.md` says the screen held both facts | Ignored in these scores |
| **Dev is written to trust and did not** | r2-s05, r2-s12 | One model plays every persona, so bar 5 may be a product of the simulation |

`plan.md`'s other open items closed: the gate passed (`Gate evidence`), T92 A's plant fired on this build
(`r2-s05/05.png`, viewed), so it stays in, and the report's first limit need not say it was dropped.
`--leaks` gave no false void.

## Limits

- Simulated participants: one model plays five personas. A failure is strong evidence, a pass is weak.
- One session per task half: "2 of 2" is two people. The model varies from run to run, as the repro walks
  show, so a session's reply may not repeat.
- The expert walks ran in round 1 on this build, so they did not see these sessions' screens.
- Screens I viewed: `r2-s01/18`, `r2-s02/29`, `r2-s04/06`, `r2-s05/05`, `r2-s07/05`, `r2-s10/05`, `r2-s11/07`,
  `r2-s12/08`, `repro/r2-s09/walk-undone/05`, `walk-kept/04`. Every other citation rests on its grader.
- A route log holds control names, not prose, so it proves a control's presence, never a sentence's absence.
- A hover count is only the hovers a participant asked for: the tool's pointer jumps to each target, where a hand
  would cross other controls on the way, so "nobody hovered" means nobody chose to, not that no tooltip showed.
