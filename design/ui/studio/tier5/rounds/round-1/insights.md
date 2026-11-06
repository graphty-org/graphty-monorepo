# Tier 5 round 1 insights: the filter and style editor

Settled from `scores.md` by two independent skeptic checks, on the frozen build 1e123d7d33
(`.study-builds/tier5-r1d1-1e123d7d33`). Rule: an item both skeptics drop is dropped; an item one
skeptic drops or weakens is weakened (lower severity, narrower claim, or a caveat). Paths are under
this folder; every screenshot cited was viewed in scoring, by a skeptic or for this file.

30 valid sessions (28 pointer, 2 keyboard), same-model participants, 2 to 4 sessions per task. A
failed bar is strong evidence; a held bar is weak.

## Where the bars stand after the check

| Bar | After the check | Why |
| --- | --- | --- |
| 1 Task success | **Fails on T75** (A 0 of 1); T73 not measured | T75 A rests on one session with several causes: a second condition added as a second filter card, a Largest component step that changed nothing, and insight 2. T73's 0 of 4 measures the answer key, not the build: the task asks to "put them in orange and tell us how many", all four did so with the right set and count, and the key grades P because the layer holds picked ids rather than a "within 2 hops" rule the task never asks for |
| 2 False "done" | Holds | 0 of 30 |
| 3 Wrong turns | **Fails on T75** | One session, median 3.5 (2.5 without the two picks insight 2 caused) |
| 4 Severity 3 and 4 open | **Fails, on two findings** | Insights 1 and 2 stay at 3. "Is exactly" and Clear then Escape fall to 2 |
| 5 Keyboard | Holds | Sam S and S; no keyboard block; 0 serious or critical axe findings |
| 6 The owner's data rules | Not measured | The content designer's and the interaction designer's walks did not run |
| 7 Figma and graphty consistency | Not measured | 3 confirmed severity 2 of an allowance of 5 (insight 8); the new yes-or-no card's title falls to 1; the interaction designer's walk did not run |
| 8 Cost on core tasks | **Fails** (T70, T74, T78; T71 B by 0.5) | Unchanged by the check; T73's numbers describe the canvas route |
| 9 The owner's feedback | **Fails, 4 of 3** | Three editor elements named by two sessions on different halves (insights 3 and 4), plus the workspace header's Tab order, which Sam named on two halves and which the criteria count once, in bar 9's smaller allowance. The value picker falls out of the count (one skeptic dropped it) and the Except column falls to 1. The calm-first check did not run on this build, so this count is a floor |

## Insights, most severe first

### 1. Speech comes from a panel the reader cannot see (severity 3, both skeptics kept)

While a workspace is open over a selected layer, each count change is written twice to the polite
status region: the workspace's count, then the covered inspector row's count over another base
("15 of 24" then "4 of 24 nodes"). The accessibility walk shows it on five screens
(`expert/a11y/k1b/14.png`, `k1b/17.png`, `k1b/58.png`, `k2/28.png`, `k3/09.png`). Caveats: no
screen reader ran, so "spoken" is read from the region's writes, and whether a reader hears both or
only the last is not shown; neither keyboard participant reported a wrong count. It stands because
the second line is a count over a base nothing on screen names. Already fixed in `WhichPicker.tsx`
after the freeze; it counts against this build only. Owner: graphty app.

### 2. A filter step picked from a run's results counts over a different run (severity 3, both skeptics kept)

After Connected components ran on the 112 nodes showing, the step's value picker offers "Connected
components, 3 values"; the step it makes reads "Group 1, 549" while the top bar says 112 of 549,
and a second whole-graph run starts (`repro/r1-s23/run/08.png`, `run/09.png`). The two runs'
entries are named alike; only the matches strip's columns say "(visible)" and "(whole graph)". The
defect is the picker's entry describing one run and binding another: the second card's own count
(549 of 549) is right over its own card. One session (r1-s23, T75 A) plus a repro, on a second-card
route the key does not use; it is part of T75 A's failure, not all of it. The fix belongs where a
run's scope is named: graphty-element gives a run's facts (scope included), the app words them.
Owner not traced (the app's picker binding, or how graphty-element identifies a run's result).

### 3. Adding a second way in (Or) is the editor's least-sure moment (severity 2, bar 9, two elements kept; the insight weakened)

Two of the three bar 9 editor elements sit here:

- **A just-added Or group** opens at "B 0" with the value picker open, and its untouched range step
  is drawn full across the column while it reads "0 so far" (Figma finding 4). r1-s05 and r1-s07
  (T71 A), r1-s25 (T77 A); `sessions/r1-s08/05.png` shows the state. r1-s06 is removed: its answer
  is about group colors, the decided preview.
- **"Condition..." and "Or..." say nothing of "and" or "or else".** Three sessions on three halves
  said so in the same terms, unprompted (r1-s08 T71 B, r1-s21 T72 A, r1-s24 T75 B); each resolved
  it by watching the count.

Weakened because the "least sure" question makes everyone name something and T71 and T77 are the
only tasks that force an Or; every one of those sessions succeeded at overwhelm 2 or 3. This is
doubt and cost, not failure. Owner: graphty app (step pane and the group's first state).

### 4. By position's count box: no direction, no unit, and an error that contradicts the screen (severity 2, bar 9, kept)

The step is one empty box with "of all nodes" at about 9 px: no top or bottom, no number or
percent (Figma finding 5). r1-s13 and r1-s15 (T74 A) and r1-s16 (T74 B) all typed "top 5". The
error then says "the count and drawing still use the highest 10" while the header reads 24 of 24
and every node is drawn as a match (`repro/r1-s13/06.png`, `repro/r1-s16/`); the frozen source
builds that sentence from `card.top ?? 10`, so an untouched step claims a limit it does not apply.
Caveat: T74's "top N" wording sends everyone to this box. Owner: graphty app.

### 5. The empty Fill color box gives no cue, and its picker closes on the first click (severity 2, kept; outside the editor)

After Fill "+", the color row is an empty text box with a tiny swatch; a click gives a text cursor
and nothing else, so people guessed color names (`sessions/r1-s04/17.png`). Seven sessions on six
halves (r1-s03, r1-s04, r1-s10, r1-s11, r1-s14, r1-s19, r1-s21), and it is the "least sure" moment of
8 of 28 pointer sessions. When the box is empty the picker closes on its first click and commits
that color (r1-s02, r1-s22, r1-s28; `repro/r1-s02/05.png` to `08.png`). This is the largest single
share of T70's step overage. The claim that the swatches lack orange is dropped by both skeptics:
the tasks asked for orange, and the swatches are compact-mantine's, locked to Figma. Owner: graphty
app (the color row); if the empty-box click is the shared color input's, compact-mantine.

### 6. "Is exactly" does not take on an empty text step (severity 2, both skeptics weakened)

Choosing "Is exactly" in a text step's how-to-match list leaves "Contains", by pointer and by keys
(`repro/r1-s18/04.png`, `05.png`). Narrowed: both the session and the repro chose it with the text
box empty, and `TextCard` in `WhichPicker.tsx` sends `{...card, match}`, so the empty card is
probably dropped further down; after text is typed, and for the other match choices, it is
untested. The box reads "Contains" at once and r1-s18 noticed ("did my pick not take?"), so no
count was misread. Owner: graphty app.

### 7. Clear then Escape deletes a saved filter card (severity 2, both skeptics weakened)

On a card closed with Done and reopened, Clear then Escape says "Filter not added" and the card
and its steps are gone; Control+Z then undoes an unrelated edit (`expert/a11y/k1b/44.png` to
`49.png`; Filters empty in `48.png`). The Escape branch at `SelectionEditor.tsx:812` calls
`onEmptyCancel()` without the `openedNew` check, and `close("done")` does the same, so Clear then
Done on a reopened card probably deletes it too (untested). Weakened because no participant met
it, the reader emptied the card first, and the loss is announced and visible. Fix it anyway: Undo
cannot bring the card back. Owner: graphty app.

### 8. Consistency findings counted in bar 7 (severity 2, kept)

- The value picker, once typed in, jumps up over its own field and the header's Done
  (`expert/figma/w1/05.png`; met by r1-s29 and r1-s30). `decided.md` 734.
- Clear renames a filter card "a selection" (`expert/figma/w3/07.png`). `decided.md` 631-632.
- A colleague's two-step card rests as one row, "trained Yes 14 of 24", hiding its second step
  with no caret (`expert/engineer/thanks-1200x900/04.png`); both T77 sessions still succeeded.

The workspace header far back in the Tab order (Done 11 to 34 keys away, never an F6 stop) is
also kept; it is counted in bar 9 above, not here.

### 9. Smaller editor findings (severity 2 unless noted, kept)

- The card's name stops describing it after an Or group or a second step (four sessions, both T71
  halves).
- At 900 x 700 the preview is a 44 px sliver and the title loses the rule's name (audit and
  accessibility walk; no session ran at that size).
- A chosen reference shows only its id ("v02" after "James Carter").
- The read-only outline breaks its column on Except (`expert/engineer/style-1200x900/13.png`):
  weakened to 1, cosmetic, nobody noticed it.

### 10. Outside the editor (backlog)

- A new color inside an existing color ramp is hard to see (weakened). The mechanism is real (no
  sign that a lower layer already colors the same nodes), but its frequency is the study's: the
  fixtures color by an orange-to-brown ramp and the tasks ask for orange. Do not generalize it.
- The Style layers "+" with the sidebar search open closes the list and opens no menu (r1-s28 plus
  repro).
- The Neighborhood header names a gauge by id ("G03"); both sessions on T73 B, plus a repro.
- The start page does not scroll under the wheel over the hero (r1-s09 plus repro, on a detour the
  study setup caused).
- "Stop varying node color by data" sets the default indigo: weakened to 1. Ending a mapping has to
  leave some color.

## Weakened or dropped

| Item | Verdict | Why |
| --- | --- | --- |
| The value picker as one bar 9 element | Weakened (one drop) | r1-s18 was miscited (its answer is the Edges table); r1-s23 is insight 2; r1-s27 names the outline's "Value..." row. Only "graph measures hidden until typed" repeats, on one half (r1-s20). Stays a candidate |
| A new yes-or-no card titled "trained pick yes or no" | Weakened to 1 | Every session that saw it is T70 A; transient; two of three read it as a helpful prompt |
| The color picker holds no orange | Dropped (both) | The task's color, and compact-mantine's locked swatches |
| The canvas is the first door and throws the rule away | Weakened (both) | The first-door fact holds (4 of 4 used Neighborhood); "throws the rule away" is not shown, since the task gave no reason to keep one. Only "the editor's Within hops step is untested by people" stands |
| A count that waits for Enter | Weakened to not shown | Three different boxes, one session each, no cause traced; `ConditionCardKeys.real-element.test.tsx` asserts the text box updates when typing pauses. Only the By position box against the date box holds |
| Nobody sees the final look before committing | Weakened (both) | "5 of 5 want the real color" answered "Would you rather it had shown something else?", which invites a wish; the drowned-orange half is the fixture |
| Results entries do not say which run | Kept, counted once | It is insight 2 |
| The weak-links fix is still not found | Weakened to not re-tested | Three of four used the accepted Data place filter route and succeeded |

## About the study

- **T73 cannot measure the editor as worded.** The task and its key disagree: the key wants a rule
  that keeps following the data, the words ask only for a colored set and a count. Before T73 runs
  again, either the task asks for something only a rule gives (in words that do not name a
  control), or the key accepts a correct picked set as success and T73 stops counting toward the
  editor.
- **A leading follow-up.** "Would you rather it had shown something else?" invites a wish; reword
  before the next round asks the owner's question.
- **Fixtures that pre-color in the task's color** inflate any "new color drowned" finding; vary
  the asked color or the fixture's ramp.
- The tool items in `scores.md` ("The study") stand: `endstate.mjs` and hidden layers, `score.mjs`
  and the grade layout, `steps.mjs` pooling halves, no P in the graders' form, and the T73 A
  briefing that promises a saved project the setup never writes.

## What the round needs next

1. Fix insights 2, 4, 5, 6 and 7 and re-walk each by its repro (insight 1 is fixed after the
   freeze; re-walk it too).
2. Bar 9: the Or group's first state, the Condition... and Or... words, By position's box, and the
   workspace header's place in the Tab order; then run the calm-first check on the new frozen build.
3. Run the content designer's and the interaction designer's walks so bars 6 and 7 have their
   feeds.
4. Reword T73 (above) and the T70 follow-up before round 2.
