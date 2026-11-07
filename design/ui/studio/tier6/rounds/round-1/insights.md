# Tier 6 round 1 insights: meeting the Assistant

Settled from `scores.md` by two independent skeptic checks, on the frozen build 3b2a7f0649
(graphty@0.8.92). Rule: an item both skeptics drop is dropped; an item one skeptic drops or weakens is
weakened (lower severity, narrower claim, or a caveat). Where the skeptics disagreed on a fact, it was
settled at its source and the source is named. Screenshots are under `expert/` of this folder. Most
severe first.

**No reader has seen the Assistant.** All 24 sessions were refused at the start, so everything below
comes from four expert walks and from reading the frozen source. It says what is on screen, never what
a reader paid. No skeptic re-ran anything, so a mechanism below is read from code unless it says
otherwise. "Engineer 5" means finding 5 in `expert/engineer.md`, and likewise for the other walks.

## Where the items stand

| Item | Count | Kept | Weakened | Dropped |
| --- | --- | --- | --- | --- |
| Confirmed problems | 9 | 3 (2, 4, 6) | 5 (1, 3, 5, 7, 8) | 0; problem 9 is split |
| Severity 3 claims | 3 | 2 (Done at 2, 400% at 3) | 1 (Talk, to 2) | 0 |
| Candidate insights | 4 | 0 | 4 | 0; one route inside insight 1 is dropped |

## Where the bars stand after the check

Bars 1 to 7 and 12 are unchanged. Four change:

| Bar | In `scores.md` | After the check | Why |
| --- | --- | --- | --- |
| 8 The keyboard | Fails, 2 of 5 moments hold | **Fails**, narrower | Approval and Undo are real failures. The Settings row fails as the bar is worded, not as a defect: returning to the opener is right by WCAG 2.4.3 and the walk rates it 1. Sam's sessions and the spoken Undone and Transcript words are also open |
| 9 No severity 3 or 4 | 2 open at 3 | **Open**, 1 open at 3 | Talk comes down to 2. The 400% claim stands, and still needs `repro/` to count |
| 10 The app does the talking | Fails | **Did not hold, on the state list** | Rows of the state list were not reached, and that alone stops the bar. Whether "assistant node style" is element English or just a default layer's name is a reading, so the reversal of the audit's clean line is not settled |
| 11 Computed numbers are true | Fails, on 3 walks | **Nothing to count**, like bars 1 to 7 | The bar reads "in every session", and 0 sessions ran. A selection is not a change to the graph (`decided.md`), and the repaint turns do have a change line. What stands is a break of design 4.6, in finding 3 below |

## Findings, most severe first

### 1. At 400% zoom the Settings page has no height, so the key cannot be reached by pointer. Open at 3

- **What shows:** `expert/a11y/k5/05.png` has the section list and Done, and no page beside or below it.
  `k4/setup.log` shows the click refused.
- **Mechanism, stronger than scored:** `.ws-dialog-columns` in `graphty/src/workspace/frame/frame.css`
  has height `min(536px, calc(100dvh - 184px))`, which is 72 px in a 256 px window. Under 720 px wide
  its rows are `auto minmax(0, 1fr)`, the section list takes all 72, and `.ws-dialog-page` gets 0. A
  zero-height page cannot be scrolled by wheel, mouse or Tab, and the visible scrollbar moves only the
  list. This is CSS arithmetic and was not measured live.
- **Corrections to the record:** the owner is graphty's `frame.css`, not compact-mantine's modal. It hits
  every Settings section, not only the key. It depends on a short, narrow window, not on zoom as such:
  by estimate below about 330 CSS px tall.
- **Count:** both skeptics keep it. Not a counted 3 until `repro/` holds it, which needs no Gemini request.

### 2. The next message's scope can move with no request from the reader, by about three mechanisms. Severity 2, weakened

The line at the composer decides what a message is about. `scores.md` listed six routes; after the
check:

| Route | Status |
| --- | --- |
| A chip click selects | **Dropped.** It is the reader's own act, and design 5.3 says it changes scope |
| The model selects when asked to show the top five | Real, but the reader asked. Its fault is the missing line, finding 3 |
| Undo of a removal brings the nodes back selected | One mechanism with the next row, probably. **Kept for this round** by `decided.md`, so not open |
| A failed removal leaves its nodes selected | Finding 7. Needs a ruling on whether the kept item covers it |
| Esc closing Settings clears the selection, with no undo | **Clean.** `k1` step 161 logs "Selection cleared: 4 nodes", and `k2/12` repeats it |
| Esc on a focused chip clears the selection | **Added.** Missed by `scores.md`; recorded in `tier6/rejected-fixes.md` |
| Closing the panel forgets the x | **Stands, narrowly.** Design 5.2 says the x lasts one message or until the selection changes; here neither happened. `decided.md` classes a complaint that the x does not last as no change, with that same sentence as its evidence, so the entry needs one dated line saying whether it reaches this case |

**The strongest example, settled at its source.** The skeptics disagreed on where the selection in
`expert/a11y/k1/99.png` came from. The route log settles it: the x button appears at step 50, when the
model's first reply lands, and stays until the walker presses it at step 96. So the model made that
selection, and the walker's chip press at step 84 came later. Step 100 then shows the chain on one
screen: the model's selection, which survived an Undo, narrowed "Color the nodes by role" to "Colored 5
nodes by role". After the x and a close and reopen, "Remove every node whose role is volunteer" removed
1 of 16.

**Why it stays at 2.** The reply said so both times, and the scope line read Selection throughout. The
removal needed a walker's sequence, so "reachable with no plant at all" is withdrawn. The placeholder
wording is design 6.1's own text, so it is not a defect against the design.

### 3. A reply says it selected nodes, and no line says so. Severity 2, weakened, owner named

- **What shows:** in `expert/engineer/setup-1200x900/29.png` the reply says "selected these five nodes",
  the scope reads Selection 5, and the only line is "Computed Connections for 24 nodes". Design 6.6 has a
  "Selected {N} nodes" row and design 4.6 asks for one line per effect.
- **It is not one turn on one walk,** as one skeptic counted: `expert/a11y/k1/74.png` shows the same on
  the keyboard walk ("selected the top 5", under "Computed Influence for 24 nodes"). It needs the model
  to pass `select: true`, and is deterministic when it does.
- **Mechanism:** in `graphty-element/src/ai/tools/families/algorithms.ts`, the `results` `top` action
  calls `selection.apply` and returns only `foundEffects`. No selection effect exists to word. The owner
  is graphty-element, and the fix is an additive effect, so it is the team's call.
- **The repaint half is split off.** `runEffects` returns only the run effect, so a run that paints
  gets "Computed ..." and no Colored row. That line is a change line for the act the reply describes, and
  design 6.6 does not say a painting run also gets a Colored row. Figma 1 stays open as a design
  question, not a breach.

### 4. After Undo, Remove or Answer, focus leaves the composer and typed letters are lost. Severity 2, split

- **Solid, both skeptics (accessibility 3, 4, 6, 11):** after Undo, focus sits on the disabled top-bar
  Undo, and `t a b l e` went nowhere (`expert/a11y/k1/74.png`, steps 67 to 74); `p` then moved focus to
  Find path (step 75). After Remove and after Answer it sits on Jump to newest (steps 111, 112, 121, 122).
  The tool reads `activeElement`, so the focus lines are not artifacts.
- **Limits:** Jump to newest needs a long log and the scope x needs a selection, so only "not the
  composer" generalizes. The tool refused the `--type` steps itself, so "letters lost" rests on those
  refusals and on `--key` steps.
- **One rule covers three cases, not five.** Remove, Answer and Undo share the gap: `Waiting.tsx` raises
  `composerCalls` only for Change this, and `Composer.tsx` is not disabled while running. Settings is out,
  since returning to the opener is correct and it also opens where no composer exists. Send again was
  seen only with a selection and is not a bar moment. The rule addresses only bar 8's focus clause.
- **Weakened (accessibility 5, 12, 13, 14):** 5 and 12 are the tool's live-region log with no screen
  reader, so what a reader hears is not shown. The pile-up in 5 is inflated by the cap, since every
  message failed. Design 6.7 does not ask for the signal in 12. 13 rests on names alone. 14 is a true
  fact about tab order, but stems from a compact-mantine default. These four no longer count as part of
  one confirmed problem.

### 5. One result has two names on one screen. Severity 2, kept

`expert/engineer/setup-1200x900/29.png` has Influence in the step and the line, PageRank in the prose,
Degree on the key card, Connections in the line. `26.png` and `38.png` show it with no model prose.
Glossary line 481 retires "influence" outright. "Connections" is only covered as a retired plain name,
and it also exists as an inspector heading (glossary line 388), so that pair stands on the two names, not
on the retirement. Changing the catalog's `plainName` changes what an API returns; the app replacing the
name by id is the non-breaking route, and `CLAUDE.md` allows it.

### 6. Done drops a typed key. Severity 2, kept

`expert/engineer/setup-900x700/08.png` is the evidence, with route step 8 (key typed, then Done): no
warning, and the panel honestly still asks for a key. `07.png` is the Delete step, not this one, so it
is no evidence. The key is local state and only Save writes it. Every sighting was a walker's deliberate
press; whether a reader presses Done is what T90 will show, and it bears directly on bar 3.

### 7. A rollback leaves a selection and a lit Redo beside "Nothing changed." Severity 2, weakened

`expert/engineer/setup-900x700/17.png`: Undo dim, Redo lit, 14 nodes and 52 edges selected, scope on
Selection, and the route log has "Whole graph" before Remove, so the reader never made that selection.
It is one sighting, not two: `k2` was a color request and reproduces only the Redo half. The selection
is very likely the undo reselect that `decided.md` keeps for this round, though the shared mechanism is
inferred and `revertMessage` was not read. Only the lit Redo is new. "Redo would remove with no card" was
never run. `scores.md`'s "the same family" should read "needs a ruling".

### 8. Talk says "Listening" before any microphone opens. Severity 2, weakened from 3

The defect is solid: `VoiceSession.ts` line 530 emits `ai-voice-start` before `startSpeechInput`, and
`Talk.tsx` lines 89 and 90 set no announcement on end (`k1` steps 139 and 140). It is an element ordering
defect. The microphone failure shows only as a plain line, so a screen-reader reader never hears why. A 3
is not shown, by the same test that holds Done at 2: the belief corrects itself when nothing happens, the
composer stays empty, and text still works. The refused-permission case was read and not run. It needs a
`repro/` and a reader who acts on the wrong belief before it counts as 3.

### 9. The question's text is the smallest and palest on its card. Severity 2, kept

`expert/engineer/setup-1200x900/38.png`. The question exists only on the card; the log's turn shows just
"2 steps". The cause is `Radio.Group label` taking compact-mantine's `cm-field-label`, so the fix belongs
in `Waiting.tsx`, not the locked theme. Engineer rates it 2, accessibility 1. The sampled 4.49:1 is a
screenshot sample and not a contrast failure; axe passed this state.

### 10. A change line has no chip, against the drawing. Severity 2, weakened

Design 4.4 says chip row or change line, and `decided.md` says a turn with a real change keeps its line
alone, so no chip on that turn is settled. What survives is a gap between build and drawing: the drawing
in 4.6 puts a chip inside the line (`Colored (o)77`), `Checks.tsx` prints plain `Text`, and table 6.6 draws
none. "Reads as prose" comes from Figma 2 and visual 1 alone, so it moves to "seen by two walks, audit
silent". "Cannot be told" overstates it: the line sits on the Open run and Undo row (`26.png`). "Nothing
to hover" should read "nothing to hover without opening the steps", and Open run is the route to check.
So candidate insight 2 stays a question for the sessions, not a finding.

### 11. The text that decides is the smallest. A hypothesis, weakened

The size is a fact: scope words are `xs`, 9 px against 11 px body (`tokens.ts` lines 395 and 396). Design
8's rule forbids the caption for state text, which fits the scope line and the microphone line, but not
clearly the disclosure or the question. The gap is 2 px, and the selection also shows as chips and an
inspector title. "Decides" is an interpretation until T90 and T92 run.

### 12. Two small alignment items. Severity 1, weakened

- **Starters are centered,** against the left-aligned drawing in design 4.3
  (`expert/engineer/setup-1200x900/15.png`). Both walks had the cause wrong: `justify="flex-start"` is
  already at `AssistantPanel.tsx` line 78, and it is inert because compact-mantine applies
  `--button-justify` only to a full-width button. The likely fix is `fullWidth` in graphty, with no Figma
  lock involved. Not run.
- **The panel has three or four left edges.** The measurements agree (65, 73, 81). Two of three walks
  rated it 1. Design 4.4 puts only the You and Assistant headings on one edge, not the whole panel. The
  fourth edge (101) is the steps label, seen only with steps open.

## Audit findings with no status in `scores.md`

| Finding | Status |
| --- | --- |
| Engineer 2: a second scrollbar around the panel | Open at 2. Both scrollbars show in `setup-1200x900/37.png`. The mechanism is the walk's reading |
| Engineer 4: no Declined line after Keep them | Open at 2. In `37.png` the model calls the removal "irreversible" with no card on screen, against the card's own "Undo can bring them back." The model's words are the model's; the missing app line is the defect |
| Engineer 7: the log loses the reader's place | Open at 2. Screens not viewed in this check; the Undo half's mechanism was not found |

## What held up

Unchanged from `scores.md`: the approval card, the peek, the rail dot and lasting notice, dark theme at
both sizes, and axe with no violation on any Assistant state measured. No count on a chip, card or line
disagreed, on the walks' turns.

## What to do with this

The study defects and the list of what must be true before a session can count are in `scores.md` and
stand as written. `repro/` for the 400% claim needs no Gemini request.

Three rulings are open, none of them a one-way door:

- whether the kept "selection surviving Undo" covers a rollback (finding 7)
- whether `decided.md`'s entry on the x reaches closing the panel (finding 2)
- whether a run that paints also gets a Colored row (finding 3)
