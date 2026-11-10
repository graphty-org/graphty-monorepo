# Tier 6 round 1 scores: meeting the Assistant

Scored against `../../criteria.md` on the frozen build 3b2a7f0649 (graphty@0.8.92). Sources: the 24
`grade.md` files in `sessions/`, the four expert reports in `expert/`, and a run of `real.mjs --gate`
on this folder at scoring time. `engineer.md` is the screenshot audit. "Engineer 5" below means
finding 5 in `expert/engineer.md`, and likewise for Figma, visual and accessibility.

## Headline

**No session ran. No reader saw the Assistant, so this round says nothing about how readers do with
it.** All 12 sessions and all 12 re-runs were refused at `real.mjs --start`, because the round's
`plan.md` has no gate evidence. There were 0 screenshots, 0 model calls and 0 messages.

**None of the 12 bars holds, for three different reasons.** They must not be read as one result:

- **Bars 1 to 7: nothing to count.** The criteria say a bar with nothing to count did not hold. These
  are not design failures, and no design conclusion follows from them.
- **Bars 8, 10 and 11: fail on expert evidence**, whatever the sessions would have shown.
- **Bars 9 and 12: open.** Bar 9 has three severity 3 claims nobody has confirmed or refuted. Bar 12
  is about fixes, which have not started.

The real output of this round is the four expert walks: **9 problems confirmed, 3 severity 3 claims
(1 held at 2, 2 still open), and 4 candidate insights.** They are expert evidence, not user evidence.

## The bars

| Bar | What it says | Result | Count |
| --- | --- | --- | --- |
| 1 | Tasks succeed | Not tested, did not hold | 0 of 12 S or SD; 0 tasks with a success. No F, so the count without model-decided sessions is the same |
| 2 | No false "done" | Not tested, did not hold | 0 false done of 0 sessions with a last screen. The 24 `False done: no` lines are **not** a pass: a session that never opened cannot claim anything |
| 3 | A reader handed a key gets it going | Not tested, did not hold | 0 of 2 T90 sessions; disclosure 0 of 3 on both |
| 4 | Failure is recoverable | Not tested, did not hold | 0 sessions met a failed message; the bar needs at least 1. The refusal at `--start` is the tool's, not the app's failed message |
| 5 | Readers doubt the right things | Not tested, did not hold | 0 qualifying of the 2 needed, on 4 sessions of T92 and T95 |
| 6 | An approval is read | Not tested, did not hold | 0 of 2 T93 sessions |
| 7 | A change can be taken back | Not tested, did not hold | 0 of 2 T94 sessions |
| 8 | The keyboard is enough | **Fails** on the accessibility walk | Sam: 0 of 2 sessions ran. Focus: 2 of 5 moments hold (see "Bar 8"). Status words: Undone and Transcript not heard |
| 9 | No severity 3 or 4 is left | Open, did not hold | 0 confirmed by the bar's rule, but its two routes are empty: no participants and no `repro/` folder. 3 claims: 1 held at 2, 2 open at 3 (see "Severity 3 claims") |
| 10 | The app does the talking | **Fails** | 5 of 11 state rows reached whole, 6 partly; and element English shows on an app-drawn row (see "Bar 10") |
| 11 | Computed numbers are true | **Fails** | Every count checked agrees, but replies claim a repaint or a selection with no row for it, on 3 walks. 0 of 12 sessions audited (see "Bar 11") |
| 12 | The experts' findings are answered | Open, did not hold | 25 severity 2 findings, 20 once merged: 0 fixed, 1 kept for now, 1 kept in part, 18 open (see "Bar 12") |

Bar 9 is reported twice by rule; this is its round-end report. Bars 8 to 12 are rescored on the fixed
build.

## What ran, per task and dataset

| Task half | Dataset | Persona | First try | Re-run | Grade | Steps | Model calls |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T90 A | volunteers | Grace | r1-s01 VOID | r1-s01b VOID | none | 0 | 0 |
| T90 B | sources | Sam | r1-s02 VOID | r1-s02b VOID | none | 0 | 0 |
| T91 A | volunteers as saved | Ruth | r1-s03 VOID | r1-s03b VOID | none | 0 | 0 |
| T91 B | yeast genes | Maren | r1-s04 VOID | r1-s04b VOID | none | 0 | 0 |
| T92 A | sources left selected | Dev | r1-s05 VOID | r1-s05b VOID | none | 0 | 0 |
| T92 B | yeast genes | Maren | r1-s06 VOID | r1-s06b VOID | none | 0 | 0 |
| T93 A | volunteers | Dev | r1-s07 VOID | r1-s07b VOID | none | 0 | 0 |
| T93 B | yeast genes | Sam | r1-s08 VOID | r1-s08b VOID | none | 0 | 0 |
| T94 A | Les Miserables poster | Ruth | r1-s09 VOID | r1-s09b VOID | none | 0 | 0 |
| T94 B | volunteers thanks | Grace-returning | r1-s10 VOID | r1-s10b VOID | none | 0 | 0 |
| T95 A | volunteers | Grace | r1-s11 VOID | r1-s11b VOID | none | 0 | 0 |
| T95 B | yeast genes | Dev | r1-s12 VOID | r1-s12b VOID | none | 0 | 0 |

- **Grades:** 24 of 24 VOID, checked against each `grade.md`. 0 S, 0 SD, 0 F, 0 G. No session was
  decided by a build defect or by the model, so "with and without" gives the same numbers.
- **Models:** 24 of 24 on claude-opus-5-5. **0 sessions ran on Sonnet.** No session ended on an API
  error of the participant's own model, so the Sonnet retry never applied.
- **Records:** every participant folder holds only `briefing.md` and `transcript.md`. The follow-up
  replies in the transcripts say nothing was seen, so they measure nothing.
- **Every void is one cause, not 24 findings.** Each `--start` printed the same refusal. Every void
  says nothing about the app.

The measures the criteria report each round (first move, what a reader would load, scope noticed,
hand edit, checks used, wish for a preview, starters, how a change was reversed) have no data.

## Why nothing ran

Checked again at scoring time, `real.mjs --gate` exits 1 with 13 `FAIL` lines:

- **12 of 12 task halves have no walk on this build.** Walks exist only on 8fa33aa786, 3549e11129 and
  48879618c4, whose app code differs. The gate needs a success and a detours walk per half, and a
  keyboard walk for T90 B and T93 B: 26 walks.
- **0 of the tier's 3,000 Gemini requests are left**, and 12 sessions may use 480. The count file is
  3,000 bytes. It stood at 2,892 when the four expert walks began, and they used the last 108
  (engineer 20, Figma 21, visual 29, accessibility 38). The accessibility walk's failure during a
  change also made 4 real requests past the cap through a private count file, as that walk reports,
  so 3,004 real requests were made.

Both were known before the first session. `plan.md`, "Open before the first session", says the gate
fails and that too few requests were left. The launch went ahead anyway, and nothing in the run
checks `--gate` first. After all 12 sessions failed with one cause, the 12 re-runs could only repeat
it, and they did.

## Bar 8: the keyboard

From the accessibility walk's table. A moment holds only if the next letter lands in the composer.

| Moment | Holds? | Where focus went |
| --- | --- | --- |
| A send | Yes | |
| A reply | Yes | |
| An approval (and an answer to a question) | **No** | Jump to newest |
| An Undo in a turn | **No** | The top bar's disabled Undo; typed letters are lost, and `p` opens Path between... |
| Settings closing | **No** | Save is right; Done or Esc opened from the model label returns to the label |

The first half of the bar, Sam's two sessions reaching their end with no pointer, is not tested.

## Bar 10: the app does the talking

**Screens read.** The audit read 88 of the 88 screens it took, with no raw code, tool arguments or
JSON. It read none of the 398 screens the other three walks took (88 Figma, 76 visual, 234
accessibility), and there were no session screens, so "read over taken" is 88 of 486. Those 398 were
read by their own walkers for their own purposes. No folded step was opened per task, since no task ran.

**The audit's clean result does not stand.** A layer the Assistant adds with no name reads
"assistant node style" in the layer list and on the key card ("Color: assistant node style"). I viewed
it in `expert/figma/w1/42.png`. It is lowercase English written by the element
(`graphty-element/src/ai/tools/families/style.ts`, line 397), which is what the bar forbids. It comes
from Figma 4, on a screen the audit did not read.

**State list.**

| Design section | State | Reached by | Result |
| --- | --- | --- | --- |
| 4.1, 4.2 | No provider; the provider section | All four walks | Reached |
| 4.3, 4.4 | Ready and empty; a reply, steps opened | All four walks | Reached |
| 4.5 | Working; Stop; a stray Esc | Working and Stop: Figma `w5/`, accessibility `k1` | **Partly.** Esc was pressed, but no change was shown to exist first |
| 4.6 | A change; every row of 6.6 | Colored, Sized, Computed and Removed, by the walks | **Partly.** Set, Arranged, Filtered, Changed values, Selected, Moved the view, Changed the graph, excluded and No matches appear in no report or route log |
| 4.7, 6.5 | Each approval card | `large` removing, all four walks | **Partly.** No other card reached |
| 4.8 | A question from the Assistant | Audit, accessibility | Reached |
| 4.9 | Failed: at setup; a 429; during a change | 429: Figma, accessibility. During a change: audit, accessibility | **Partly.** Setup was seen only as a connection failure; the refused key row with AI provider... was not |
| 4.10 | Away from the panel | A request waits: Figma, visual, audit. A failure: accessibility | **Partly.** A change landing and an answer landing not reached |
| 4.11 | Conversations; a `--reopen` return with the key gone | Accessibility (`k1/167`) | Reached. Figma's `--reopen` did not reach the project |
| 4.12 | Talking, each voice line | "No microphone found." only | **Partly.** This machine has no microphone |
| 6.4 | Every result code | `graphty/src/workspace/assistant/__tests__/words.test.ts`: 36 of 36 pass, run at scoring time | Reached. The test was added after the freeze; the app code is otherwise the same as the frozen build's |

The 900 x 700 and dark passes of states 4.1, 4.3, 4.4, 4.7 and 4.9 were all reached by one walk or
another, not every combination by each.

## Bar 11: computed numbers are true

**Counts.** No exception found. The audit checked 7 people with no phone, 14 people and 52 edges, and 5
top nodes against the inspector, and the walks' other chips raised no disagreement. This covers only
the walks' turns, 0 of the 12 sessions the bar names.

**"Every reply that claims a change has a change line" fails.** I viewed two of these:

- `expert/engineer/setup-1200x900/29.png`: the reply says "I ran degree centrality and selected these
  five nodes". The graph is recolored, 5 nodes are selected and a Degree legend is up. The only line is
  "Computed Connections for 24 nodes". Design 6.6 has a "Selected {N} nodes" row; none appears.
- `expert/a11y/k1/99.png`: the reply says Louvain "colored the graph by community", under "Computed
  Communities for 24 nodes", with no Colored row for it. The role color in the same reply does have one.
- Figma 1 reports the same on its own walk (`w1/17.png`, `w1/21.png`).

So the rows work for a style call and go missing when a run paints or selects. Figma 1 names the element
as the source, since a run's painted layer reports no effect; the audit did not trace it. `answers.md`
keeps the repaint itself for this round; the missing line is not kept.

**Failure during a change** (the criteria's check on "Nothing changed."). Reproduced in `k2` and in
`expert/engineer/setup-900x700/17.png`, which I viewed. The line is true of the data: the removal was
rolled back, as `decided.md` settles. But Redo is lit, 14 nodes and 52 edges stay selected, and the
scope line reads Selection, so "Nothing changed." sits beside a changed screen. Counted as a severity 2
under confirmed problem 5, not as a false line.

## Bar 12: severity 2 findings of the Figma and visual walks

15 from Figma and 10 from visual. Five overlap, leaving 20. At the end of the round none is fixed.

| Finding | Source | Status at round's end |
| --- | --- | --- |
| A repaint has no change line | Figma 1 | Open |
| A change line reads as prose; nothing marks a change turn as computed | Figma 2, visual 1 | Open |
| One measure, several names | Figma 3 | Open |
| "assistant node style" | Figma 4 | Open |
| One Open run under two Computed lines | Figma 5 | Open |
| Send on an empty composer is drawn live | Figma 6 | Open |
| Scope counts look like chips and do nothing | Figma 7 | Open |
| A chip click moves the drawing about 230 px | Figma 8 | Open; design 5.3 and tier 4's rule disagree, so the record needs settling first |
| Show in table does not gather the rows | Figma 9 | Open |
| Undo notice: doubled punctuation, whole message | Figma 10 | Open |
| A failure reads as a reply; Send again duplicates the turn | Figma 11, visual 2 | Open |
| AI provider section: two primary buttons, Done drops a key, live actions with nothing saved, smallest text, 63 to 64 words | Figma 12, visual 7, visual 10 | Open. **Word count kept:** the disclosure is what bar 3 measures, and `decided.md` settles it. The rest is open |
| Starters float centered | Figma 13, visual 9 | Open |
| Conversation rows and the open conversation | Figma 14 | Open |
| A selection survives Undo of a removal | Figma 15 | **Kept for this round:** `decided.md`, "Kept for the first round by the answer key". Fix after it |
| "Working" has no sign of life | Visual 3 | Open |
| An undone change still reads as a fact | Visual 4 | Open |
| The scope line is 9 px and the placeholder ignores it | Visual 5 | Open |
| "No microphone found." is 9 px | Visual 6 | Open |
| Four left edges and three action looks | Visual 8 | Open |

## Confirmed problems

Confirmed here means a reproduced defect, or an expert finding the audit also shows. No participant
evidence exists. Bar 9's own rule is narrower (a reproduction under `repro/`, which does not exist), so
nothing below counts as confirmed against bar 9.

| # | Problem | Evidence | Severity | Owner |
| --- | --- | --- | --- | --- |
| 1 | A reply claims a repaint or a selection and has no line for it | Engineer 5, Figma 1, and `k1/99.png`. Viewed | 2; fails bar 11 | graphty-element or graphty, to be traced |
| 2 | One result has two names on one screen: Influence and PageRank, Connections and Degree. The glossary retires "influence" and every retired plain name for the algorithm's own name | Engineer 6, Figma 3; `design/ui/framework/glossary.md`, line 481 | 2 | graphty-element and graphty |
| 3 | A change line cannot be told from the model's prose, and a turn that changed something shows no chip to check | Audit: engineer 8. Figma 2, visual 1 | 2 | graphty |
| 4 | Done drops a typed key with no word | Engineer 1 (route step 8 types a key and presses Done; viewed `setup-900x700/08.png`), Figma 12; backlog, T90 A and T90 B | 2 held; see below | graphty |
| 5 | A rollback leaves the previewed nodes selected, Redo lit and the scope on Selection, beside "Nothing changed." | Engineer 3, viewed; the same family as Figma 15. The rollback itself is settled; what it leaves is not | 2 | graphty-element, then graphty |
| 6 | The question's own text is the smallest, palest thing on its card | Engineer 9, accessibility 31 | 2 | graphty |
| 7 | Starters are centered | Engineer 12, Figma 13, visual 9 | 2 | graphty |
| 8 | The panel has three or four left edges | Engineer 13, Figma 17, visual 8 | 2 | graphty |
| 9 | Eight keyboard findings the backlog held and this walk reproduced on this build, led by focus lost after Undo, Remove, Answer and Send again | Accessibility 3, 4, 5, 6, 11, 12, 13, 14 | 2 | graphty |

Engineer 10 (the `name` starter) is settled as kept for this round, not open. Figma and visual both
class it as no change.

## Severity 3 claims

Three findings came in at 3. Under the criteria an expert-only 3 needs a reproduction under `repro/`,
and a 3 counts only with its cost: a reader blocked, or left with a wrong belief. None has either yet.

| Claim | What I checked | Result |
| --- | --- | --- |
| **Done drops a typed key** (engineer 1) | The audit's route; `08.png`. Earlier graders rated it 3 and filed it as friction | **Held at 2 for now.** The screen stays honest ("Needs a key from an AI provider."), and retyping with Save recovers, so no wrong belief. A 3 only if a T90 reader is blocked or thinks it saved. It bears directly on bar 3 |
| **Talk says "Listening" when nothing is listening** (accessibility 1) | `k1/route.jsonl` steps 139 and 140 log "Listening"; `Talk.tsx` sets the announcement on start, and its end handler sets none | **Open at 3.** The mechanism is confirmed by source, and the wrong belief is plain, but no reader paid. A refused permission was read, not run. Visual 6 and Figma 21 show only the visible line |
| **At 400% the API key cannot be reached by pointer** (accessibility 2) | `k4/setup.log` shows the click refused (`cm-modal-overlay intercepts pointer events`); `k5/05.png` shows only the section list | **Open at 3.** A real block at setup for that reader. A keyboard reader finishes, unable to see the field. `design.md` claims 400% works, and says it was never run |

Both open claims need no Gemini request to reproduce, so `repro/` can be filled while the cap stands.

## Seen by two walks, audit silent

Not confirmed. Each was reported independently, so each is worth a fixer's attention.

| Problem | Evidence | Severity |
| --- | --- | --- |
| A failure reads as a reply | Visual 2, Figma 11 | 2 |
| The open conversation is not marked | Figma 14, visual 22 | 2, 1 |
| Show in table leaves rows scattered, header still "24 nodes" | Figma 9, visual 19 | 2, 1 |
| Send looks ready while it does nothing | Figma 6, accessibility 30 | 2, 1 |
| The Undo notice: two marks, the whole message, spoken and shown | Figma 10, accessibility 17 and 19 | 2, 1 |
| "No microphone found." is 9 px | Visual 6, Figma 21 | 2, 1 |
| "Stopped. Changes taken back." with nothing changed. A false sentence, so watch it | Figma 23, accessibility 32 | 1 |
| Steps repeat "Query data"; chips share one name | Figma 16, visual 16, accessibility 20 | 1 |
| Two replies in one turn run together | Figma 18, visual 15 | 1 |
| The approval's chip shows nodes but not edges | Figma 19, visual 23 | 1 |

## Candidate insights

From expert evidence only, for the skeptics to test. None is a statement about readers.

**1. The next message's scope can change with no act of the reader's.** The word at the composer
decides what a message is about, and it moved without the reader asking on six routes:

- a failed approved removal leaves its nodes selected (engineer 3; `setup-900x700/17.png`)
- Undo of a removal brings them back selected (Figma 15)
- the model selects its own answer (`setup-1200x900/29.png`: the scope reads Selection, 5)
- a chip click selects, with nothing to say so (Figma 20)
- Esc closing Settings clears the selection, which cannot be undone (accessibility 7)
- closing the panel forgets the x (accessibility 8)

That word is 9 px and the placeholder still reads "Ask about this graph" (visual 5). On the last route,
"Remove every node whose role is volunteer" removed 1 node of 16 (`k1/99.png`, viewed). The reply and
the line both said 1, from "the active selection", so the screen told the truth and this stays at 2.
It is the mechanism T92 A plants, and it is reachable with no plant at all.

**2. A turn under-reports what it did, and under-marks what is computed.** Confirmed problems 1 and 3
meet here: the line is missing when a run paints, and when present it looks like the model talking.
The design rests on a check costing one hover, and on a change turn there is nothing to hover. This is
round question 3 and bar 5's ground, and the experts cannot say whether a reader minds.

**3. One focus rule may close most of bar 8.** Undo, Remove, Answer and Send again end the same way:
the control goes, and focus lands on whatever is near (accessibility 3, 4 and 6). `Waiting.tsx` raises
`composerCalls` only for Change this. Sending focus to the composer after each of them, and after
Settings closes by Done or Esc (accessibility 16), is one rule rather than five fixes.

**4. The text that decides is the smallest.** The scope line, the disclosure and the question are all
at or near caption size, against design section 8's rule (visual 5, 6 and 7; engineer 9; accessibility
31). The disclosure is what bar 3 asks every reader to report.

**What held up,** across walks that each looked for trouble:

- The approval card: pinned, one primary, a true count, fits at 240 px and in dark (Figma, visual, audit).
- The peek: no selection, no scope change, on 24 and on 331 nodes, though it weakens on very small nodes.
- Away from the panel: the rail dot and a lasting notice with Open.
- Dark theme at both sizes, with nothing clipped.
- axe: no violation on any Assistant state measured; the one hit is target size in Settings.

## Study defects

These come from the session grades and from reading the tool. None is about the app.

| Defect | Evidence | What it would have done |
| --- | --- | --- |
| **The run launches without checking `--gate`.** The check sits only at `--start` | 24 of 24 grades. The tool did its job by refusing | Spent 24 sessions, two participant agents on most, and 24 graders on nothing |
| **Re-runs repeat a void with a shared cause.** Nothing looks at why the first 12 failed | 12 of 12 re-runs failed identically | Used up the one re-run the criteria allow per session |
| **`real.mjs --leaks` reports quoted text as an opened file.** `leaksIn` runs over every string in a tool call's input, heredoc and Write content included | All 24 grades report it; read in `tool/real.mjs` lines 533 to 544 and the loop at 564. Every line was false | Would void a valid session whose transcript quotes such a name. It also leaves no `leaks.json` on a VOID verdict |
| **Every first prompt says "a RETURNING user of this app".** | One grade noticed it (r1-s07b). I checked all 42 participant logs: it is in the first prompt of 24 of 24 sessions. `roster.md` has only 3 of 12 returning | **Primes 9 first-meeting sessions**, and contradicts their briefings. Must be fixed before any session counts |
| **The follow-up is asked of a session that never ran** | A second participant agent on 18 of 24 sessions, with nothing to answer from | Wasted agents; harmless to the grades |
| **"The tool's cap is far above what 12 sessions need" did not survive the dry runs** | `criteria.md`, Round plan; 2,892 spent before the expert walks, 0 by sessions | The tier ran out before its first session |

## What has to be true before a session can count

1. **Requests.** The cap needs an answer: the open item at the top of `../../../owner-decisions.md`.
   That entry is out of date: it says 145 are left, and 0 are. Its figures still fit: about 200 for the
   walks plus 480 for the sessions is about 680 requests, near $3.40, and its cap of 4,000 covers that.
2. **Walks.** 26 walks on the build sessions will run on, then `--gate` exits 0 by itself.
3. **Key.** `answers.md` matched to that build; it was last matched to 48879618c4.
4. **T92 A's plant.** Confirm the reply narrows to the selection on that build, or start r1-s05 from
   `setup:connected-sources.txt` and say so in the report's first limit.
5. **Tool.** Fix `leaksIn`, and take "RETURNING" out of the prompts of the 9 first-meeting sessions.
6. **Run.** Check `--gate` before launching, and stop on the first refusal.
7. **Re-runs.** All 12 allowed re-runs are used. Since no session started, I propose logging one change
   in `criteria.md`: the round starts over from clean folders, with no re-run spent. This is the
   Director's call.

**Proposed order: fix first, then freeze.** No walk exists on this build, so moving the freeze loses
nothing, and fixing after walking would pay for 26 walks twice. The expert findings do not depend on
sessions, and fixing them first means sessions measure what ships. This reverses the criteria's order
of a round and then its fixes, so it is the Director's call too. One caution: fixes for confirmed
problem 3 and visual 5 touch what T92 and T95 measure, so check those prompts for leading words after them.

## Round questions

None of the eight in `../../criteria.md` is answered: each needs a reader. The expert findings bear on
some of them, as hypotheses only.

## Limits

- Expert counts are not user evidence. Every problem above is what a trained eye found, not what a
  reader paid.
- Some walks ran after the cap, so their later states rest on 429 replies. "Not reached" is reported
  per walk and carried into the state list.
- No real screen reader was run: "spoken" means the tool's live-region log and Chromium's tree.
- A model reply varies from run to run. Figma 1 and engineer 5 depend on the model choosing a tool that
  paints, though three walks saw it.
- The audit read only its own 88 screens, so its clean results speak for those alone.
- r1-s07b's collected grade has no `truth_on_screen` field; nothing was on screen, so it counts as false.
