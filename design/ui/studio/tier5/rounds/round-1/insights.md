# Tier 5 round 1 insights: the filter and style editor

Settled from `scores.md` by two independent skeptic checks, on the frozen build 1e123d7d33
(`.study-builds/tier5-r1d1-1e123d7d33`). Rule: an item both skeptics drop is dropped; an item one
skeptic drops or weakens is weakened (lower severity, narrower claim, or a caveat). Screenshots are
under `expert/` of this folder; every one cited here was viewed before it was cited.

**No participant saw the app this round.** All 60 sessions are void because the round's start gate
never ran (`plan.md` has no "Gate evidence" section, and every start was refused with the same
line). Everything below comes from the four expert walks and the scripted walk, so it says what is
wrong on screen and in speech, not how often people are hurt by it. Every bar that reads sessions
(1, 2, 3, 8, the keyboard participant's part of 5, the follow-up part of 9) is not measured.

## Where the bars stand after the check

| Bar | After the check | Why |
| --- | --- | --- |
| 4 Severity 3 and 4 open | **Fails, on one finding** | Only the spoken count from a hidden panel (insight 1) stays at 3. Clear then Escape and the 900 x 700 preview both fall to 2 |
| 7 Figma and graphty consistency | Not measured | 1 confirmed severity 2 (Clear renames the card, insight 3) of an allowance of 5; the number formats and the cut strip column fall to 1. Seven Figma candidates still unconfirmed, and the interaction designer's walk did not run |
| 9 Calm-first | **Not measured** (was "failing") | 1 confirmed severity 2 (Except out of line) of an allowance of 3. The three "over the words budget" screens are not confirmed: the scripted count includes chrome, the graph's statistics (an allowed departure) and the user's own layer names, and the hand count that decides did not run. The calm-first check did not run on this build |
| 1, 2, 3, 5, 6, 8 | Not measured | No valid session; bar 5's two expert parts hold (no keyboard block; 0 serious axe findings) |

## Insights, most severe first

### 1. Speech comes from a panel the reader cannot see (severity 3, both skeptics kept)

While a workspace is open over a selected layer, every count change is spoken twice: the
workspace's count, then the covered inspector row's count. Because both go to one shared status
region, the second message replaces the first, so a screen reader may hear only the hidden one.
In the filter host that is a count of an unrelated layer that nothing on screen shows: the header
reads "15 of 24" (`expert/a11y/k1/43.png`) while the log speaks "15 of 24 nodes" then "4 of 24
nodes" (`k1/route.jsonl` step 43; again at step 90, "16 of 24" then "4 of 24"). The style-host
case ("11 of 19" then "11 of 24", `k2` step 28) is two true counts over named bases and alone would
be a 2. Mechanism: `WhichPicker.tsx:435` announces through `useAnnounceChange` while the workspace
is open; `SelectionEditor.tsx:368` already goes quiet then. Fix: speak only from the surface that is
showing. Owner: graphty app.

### 2. Clear then Escape drops a new filter card with its steps (severity 2, both skeptics weakened)

On a new card, Clear puts focus in the reopened value picker; the next Escape says "Filter not
added" and removes the card, and Ctrl+Z does not bring it back (`expert/a11y/k1/75.png` to `77.png`;
scripted again in `k2/07.png` to `09.png`, where the card is gone and Undo is disabled in `08.png`).
Weakened because each step follows a decided rule: Escape on a new card's picker takes the card
back (`decided.md` 436, 740) and a cleared rule opens on its value picker (773). Those collide with
"Clear has an undo" (599) and "Escape never discards work" (601). The reader is told ("Filter not
added") and can rebuild, and the loss needs a mistaken Clear first. Untested: whether Ctrl+Z before
the Escape restores the steps. Needs a `decided.md` entry saying which rule wins, then the fix.
Gates no bar at 2.

### 3. Names stop saying what a card or a reference is (severity 2, weakened to two defects)

What survives the check is two departures from decided rules, not a pattern:

- **Clear renames a filter card "a selection"** (`expert/a11y/k2/07.png`: the header, the outline
  and the sidebar card all read "a selection"; spoken "showing only \"a selection\"" in
  `k2/route.jsonl` step 7). `decided.md` 631-632: Clear keeps the card's name. One skeptic held it
  as a single-source candidate; the other found the scripted repro, which I checked in the log and
  the screenshot. Counted in bar 7 at 2.
- **A chosen reference shows only its id.** After typing "James" and choosing "v02 name James
  Carter", the field and the outline row read "v02" (`expert/engineer/style-1200x900/10.png`).
  `decided.md` 694: "a reference row shows the value that matched". Weakened: the matches strip on
  the same screen lists "v02 James Carter", so the choice can be checked; "the preview does not mark
  the center" rests on one walk and stays a candidate. Severity 2, gates nothing.

Dropped from this insight: naming a card by its first step (decided naming) and "Edit replaces the
count right after Done" (`decided.md` 729). The instruction used as a name ("trained pick yes or
no") stays a candidate.

### 4. The reference picker is a second build of the picker (severity 2 each, both skeptics kept)

It behaves unlike the value picker: Tab in its search sends focus to Main menu at the top of the
page and leaves the list open over the step, where Escape does nothing (`expert/a11y/k1/87.png`,
`88.png`); its search is a plain textbox with no expanded state and no result count, so typing
"Jam" says nothing until ArrowDown (`k1/84.png`, `85.png`, `k2/04.png`). It also groups its list
differently (entries without a header, "So far" divided from "Nodes"). Cause: `ReferencePicker.tsx`
builds its own search from Combobox.Search in a portal. Its data path differs for a decided reason
(`decided.md` 440), its control does not need to: one shared searchable combobox closes both
findings. "The person-finding task depends on it" is unproven until sessions run.

### 5. The workspace has no layout below 1280 px wide (a gap in the decided rules, both kept)

At 900 x 700 the outline, step pane and properties column keep fixed widths, so the preview is a
44 px sliver and the matches strip's search is cut to "Se" (`expert/engineer/style-900x700/03.png`).
Severity 2, not a bar 4 failure: no task is blocked (the accessibility walk finished the style host
at 900 x 700 by keys), no session runs at that size, and `decided.md` settles widths only down to
1280 x 800. The workspace title cut to "Which nodes -- L..." is the same cause and meets the decided
8-character floor (`decided.md` 730); merged here at 1. The width rule belongs in `decided.md`.

## Other confirmed findings after the check

| Finding | Before | After | Bar |
| --- | --- | --- | --- |
| "Except role staff" out of line with its group's rows in the inspector's outline (`engineer/style-1200x900/13.png`: x 985 against 1006) | 2 | 2, weakly (the audit rated it 1) | 9 |
| One outline mixes "37.5k of 50k" with group rows "35,960" and "5,485" (`engineer/big-1200x900/12.png`); the short form itself is decided (`decided.md` 729) | 2 | 1 | 7 |
| The matches strip cuts its last column ("hou", `engineer/style-1200x900/10.png`); whether its scrollbar shows on hover is unchecked | 2 | 1 | 7 |
| The value picker's list cut mid-row with no scrollbar (`engineer/style-900x700/03.png`) | 1 | 1 | -- |
| The reference picker groups its list unlike the attribute picker (reworded: both indent headers; the grouping differs) | 1 | 1, folded into insight 4 | -- |

## Weakened to a candidate

- **Three screens over the 50-word budget** (57, 66, 67). One skeptic dropped them as confirmed,
  the other weakened them to one candidate. The filter host's 66 holds about 20 graph-statistics
  words, an allowed departure in `tier4/words-at-rest.md`; the 50,000-node 67 scales with the four
  groups the scripted walk built; the style host's 57 holds the status bar, the legend and the
  user's layer names. `words-at-rest.md` says the scripted count alone confirms nothing. Only the
  style host stays a candidate, until the content designer counts it by hand.

## Dropped

- "Edit is shown in place of the count right after Done" (both: decided behavior, `decided.md` 729).
- "One result drawn as many counts" as a pattern needing a placement rule. What survives is in
  insight 1 (speak only from the surface that is showing) and the table above (one number format
  within one surface).

## The study tool

- **The leak check voids clean sessions** (both kept). `leakCheck` in `tool/real.mjs` passes every
  string of a tool call's input through `stringsIn` to `leaksIn`, so a participant who writes the
  tool's own FAIL line ("plan.md holds no ...") into its transcript, by a Write or a heredoc, is
  flagged. Shown in about 34 grades by their logged lines (the rest describe it in prose); no
  session was voided by it alone, since all were already void. Fix: test only the paths a call
  opens, never written content. Must land before the round restarts.
- **The start gate must run before launch**, and the runner must stop the round at the first
  refused start whose cause every session shares.
- Files under `tmp/studio-sessions/` are the tool's scratch copies, not a defect (both kept).
