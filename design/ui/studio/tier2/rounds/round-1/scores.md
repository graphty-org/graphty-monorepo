# Tier 2 round 1 scores: returning users on the real graphty app

Scored against `../../criteria.md` from the graders' `grade.md` files in `sessions/` and the four
expert reports in `expert/` (controls and gestures, visual design, accessibility, and the screenshot
audit at 1200 x 900 and 900 x 700). Ease is each participant's own rating (1 = very difficult, 7 =
very easy), read from the transcript; it never decided a grade. Steps are the screenshots after the
start (a session with screenshots 01 to 23 took 22 steps); on T17 and T18 they count the main
prompt only, and the follow-up is reported on its own. Every row is in
`../../../tmp/researcher/t2r1/score.py`, which asserts 56 rows and 55 valid sessions and prints the
numbers below. Success paths, in the answer key's steps: T20 11, T17 7, T18 4, T21 6, T4 9, T19 13,
T22 3, T23 5, T24 3, T12R 5.

All participants are simulated: one model playing composite personas, each told a history of
earlier sessions. A failure is strong evidence; a pass is weak until real people confirm it. A
simulated returning user remembers exactly what its history names, so it is likely faster than a
real one on anything the history names. Keyboard-only and screen-reader use of tier 2 is untested by
sessions (owner, 2026-10-07); bar 8 is the only check on it, and it did not run.

## Did a dry run happen, and are participants hitting implementation faults?

**Yes, four dry runs, then a fifth walk on the study build.** Every task was walked on both datasets
on four successive builds before any session (`../../dry-run-r1-1.md` to `../../dry-run-r1-4.md`);
each walk's implementation and polish faults were fixed before the next build was frozen, and the
design questions were left for the sessions on purpose. Then every task half was walked again on
the study build 946256efb876 and every success path landed on the first try with no script errors,
console errors or failed requests (`../r1d4/pilot/`; T18 B has screenshots but no written report).

**On the success paths, no: participants spent their time on design questions, not on broken
controls.** All 55 valid sessions ran on the frozen build (`buildStamp` `946256efb876
graphty@0.8.56`), every `session.log` is empty (no script errors, console errors or failed
requests), and no grade was decided by a build defect. The three sessions that did not succeed
(r1-s16, r1-s29, r1-s43) each stopped because the participant could not find where a feature lives
(filtering, replacing a file, selecting by a condition), on controls that work.

**Off the success paths, yes: eight build defects reached participants**, all on side routes they
chose (styling, selection display) and none deciding a grade:

| Build defect                                                                                                                                                             | Sessions               | Severity | Status                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- | -------- | -------------------------------------------- |
| Edge width drawn far thinner than its number: Everything's width 8 draws hairlines; a layer's width 30 draws thick only while selected; "Width by attribute" sets 1 to 3 | r1-s43, r1-s44, r1-s45 | 3 (s44)  | Confirmed                                    |
| Adding Color under Edges while a run's layer is open writes it to Everything; the open panel shows nothing                                                               | r1-s43, r1-s46         | 2        | Confirmed                                    |
| A fill color added to selected nodes is drawn in the selection tint until the selection is cleared                                                                       | r1-s51, r1-s52, r1-s54 | 2        | Confirmed; also the visual expert's finding  |
| The canvas key grows when a layer is added and covers a node's name ("epot" for Depot)                                                                                   | r1-s52, r1-s54         | 2        | Confirmed                                    |
| The selection mark repaints a node's fill, so a selected path node loses the path color                                                                                  | r1-s19, r1-s23         | 2        | Confirmed; also the visual and Figma experts |
| The Analyze popover does not close on a click on the drawing or on Escape; its button shows unpressed while open                                                         | r1-s16                 | 2        | One session; not in the key; needs a script  |
| The Direction list on the import page opens as a thin strip at the window's bottom edge                                                                                  | r1-s06                 | 2        | One session; needs a script                  |
| Two edge labels drawn on top of each other                                                                                                                               | r1-s43                 | 1        | One session                                  |

The dry runs did not cover these because every walk followed the success path, and these sit on
the styling and selection routes participants took instead (T22's styling detours, T24's lasting
color). The fix-between-rounds rule applies: none is fixed during the round.

**The run itself had faults, and they matter more than the build's.** Preflight was not recorded
(no `preflight.md` in this round), and three of its scripts were never built: the open-work lister
(bar 2), the weight script (bar 7 (a)) and the extension of `tool/bars.mjs` to tier 2's screens
(bars 8, 9 and 10's counts). Under the criteria a bar not scored does not hold, so bars 2, 7, 8 and 9
cannot hold this round whatever the sessions show. Also:

- **r1-s04 (T20 B, Jordan) is void and was not re-run**, against the criteria's rule. The runner
  wrapped a step in `with-browser.sh` while the session already held a slot, waited more than 120 s
  with all four slots taken, and its permission policy refused the bare `real.mjs --step` the README
  documents. T20 B has 3 sessions instead of 4. The bar 1 result does not change either way (below).
- **Two T18 sessions never got the follow-up prompt** (r1-s22, r1-s23), which goes to every session
  that succeeded. The second-time measure for T18 has 6 sessions, not 8.
- **r1-s03 is contaminated**: the participant read the task's avoided-words list and the persona's
  facilitator notes, which name parts of the route. Its grade (SD) stands; its ease is weak
  evidence.
- **More than four sessions ran at once** (r1-s14's grader: five; r1-s16's setup log: load average
  about 158), against the plan's four. Three click timeouts followed (r1-s14 step 7, r1-s16's first
  setup, r1-s46's find box); each was recovered and voided nothing.
- **Graders did not record every field the plan asks for**: the first move is explicit in 9 grades,
  doors in a few, and nodes that moved after Replace (T21) in none. The first-move and door
  measures below are reconstructed from the wrong-turn lists and the transcripts.
- Preflight item 2 (`real.mjs --prove` clean 5 times in a row before T19 and T21 run) is recorded
  once in the change log, not five times. No save in T19 or T21 was lost, so no session is affected.

## Sessions

56 planned, 55 valid, 1 void (r1-s04, tool). 0 build-decided. 52 of 55 succeeded (94.5%; target
85%).

## Bars (all must hold in one round)

| #   | Bar                                     | Round 1                                                                                                                                                                                                                                                    | Status                                     |
| --- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | Each task's success rate, each half     | Every task meets its floor but T22 (3 of 4; needs 4 of 4). Table below                                                                                                                                                                                     | **Fails** (T22)                            |
| 2   | Earlier work kept                       | Not scored as written: the scripted list of open work at start and end was never built. Graders judged by eye. A second Shortest path run replaces the first with no notice in 5 sessions (r1-s17 to r1-s21), which the bar's wording counts as `not-kept` | **Does not hold** (not scored; see below)  |
| 3   | Confirmed severity-4 problems open      | 3 confirmed problems, each of which made one participant leave and slowed 2 to 7 others (below)                                                                                                                                                            | **Fails** (read strictly; check below)     |
| 4   | Confirmed silent commit on success path | 0. Every filter step, Load, Replace, path run, note save, hop change, rule, Rerun, tie click and Select endpoints changed the drawing, the key, the header or the inspector                                                                                | Holds                                      |
| 5   | Numbers that disagree with drawing/data | 1 confirmed: after Replace and before Rerun, the key keeps the old run's range with no out-of-date mark (7 sessions, two experts)                                                                                                                          | **Fails**                                  |
| 6   | Confirmed false "done"                  | 0 (55 sessions)                                                                                                                                                                                                                                            | Holds                                      |
| 7   | The loaded weight read as loaded        | (a) the script over every algorithm and meaning was never built. (b) 0 sessions read a weight the wrong way round                                                                                                                                          | **Does not hold** ((a) not scored)         |
| 8   | Automated accessibility check           | Not run: `tool/bars.mjs` still covers tier 1 only. By hand the specialist found focus falling to the page after "Add step" and after deleting a step, and two "Delete note" buttons sharing a name                                                         | **Does not hold** (not run; fails by hand) |
| 9   | App words at rest                       | Not counted on either screen; part (b)'s limit (round 1's own count) was never set                                                                                                                                                                         | **Does not hold** (not scored)             |
| 10  | Expert walkthrough and screenshot audit | 5 confirmed severity-3 findings open (below). The scripted counts did not run                                                                                                                                                                              | **Fails**                                  |
| 11  | Cost of the core four                   | T17 and T21 within 2x; T20 (median 23 against 22) and T18 (9.5 against 8) over                                                                                                                                                                             | **Fails** (T20, T18)                       |

**Check on bar 3 before it is final.** Three problems each made one participant leave: no way to
filtering from the Graph place (r1-s16 left; r1-s12 and r1-s14 found Filters under Data only by
guessing), "Replace with file..." only on a right-click or a hover-only "..." (r1-s29 left; all 7
others had to hunt for it), and the find box refusing a condition typed without "=" with only "No
match" (r1-s43 failed; r1-s44, s45 and s46 typed the same kind of condition and got the same
answer). Each problem is seen by two or more participants, so it is confirmed; its severity is 4
because it stopped a user who had a reason to leave. Read the other way (two participants must each
reach the severity-4 outcome), each give-up is one participant and bar 3 holds. Scored as failing,
because in each case the other participants recovered only by a guess the screen did not offer
(a right-click, an Excel habit of starting a formula with "=", opening Data for another reason).
Both skeptics should test this first.

**Check on bar 2.** The second path run replacing the first is the build's known behavior (the key
says so), and no participant chose to remove the first chain; r1-s18 needed both chains for the file ("would
have exported the first") and r1-s19 wanted to compare them side by side. By the bar's wording ("a run ... gone at the end without the
participant choosing to remove it") it is `not-kept`, confirmed in 5 sessions. Graders flagged it
but did not rule. Nothing else was lost: every ranking, its color and size layers, every note, every
filter step and every loaded table is present at the end of every session that made or started
with it, and the four T20 sessions that went "Back to start" did so deliberately (r1-s01: "accepted
losing two runs") -- though the app dropped the open graph without asking (a data-loss risk,
severity 2, r1-s05, r1-s06, r1-s07).

### Bar 1, per task

| Task | Success | Half A | Half B | Needs            | Holds  | S / SD / F / G |
| ---- | ------- | ------ | ------ | ---------------- | ------ | -------------- |
| T20  | 7 of 7  | 4 of 4 | 3 of 3 | 7 of 8, 3 a half | yes    | 0 / 7 / 0 / 0  |
| T17  | 7 of 8  | 4 of 4 | 3 of 4 | 7 of 8, 3 a half | yes    | 7 / 0 / 0 / 1  |
| T18  | 8 of 8  | 4 of 4 | 4 of 4 | 7 of 8, 3 a half | yes    | 5 / 3 / 0 / 0  |
| T21  | 7 of 8  | 3 of 4 | 4 of 4 | 7 of 8, 3 a half | yes    | 7 / 0 / 0 / 1  |
| T4   | 6 of 6  | 3 of 3 | 3 of 3 | 6 of 6, 3 a half | yes    | 6 / 0 / 0 / 0  |
| T19  | 4 of 4  | 2 of 2 | 2 of 2 | 4 of 4, 2 a half | yes    | 4 / 0 / 0 / 0  |
| T22  | 3 of 4  | 1 of 2 | 2 of 2 | 4 of 4, 2 a half | **no** | 0 / 3 / 1 / 0  |
| T23  | 4 of 4  | 2 of 2 | 2 of 2 | 4 of 4, 2 a half | yes    | 4 / 0 / 0 / 0  |
| T24  | 4 of 4  | 2 of 2 | 2 of 2 | 4 of 4, 2 a half | yes    | 4 / 0 / 0 / 0  |
| T12R | 2 of 2  | 1 of 1 | 1 of 1 | 2 of 2, 1 a half | yes    | 2 / 0 / 0 / 0  |

T20 holds even if the void counts as a failure (7 of 8; B 3 of 4). T17 and T21 each sit exactly on
their floors. **Bar 1 flatters T20**: all 7 are SD, none S, and 3 of the 7 (r1-s02, r1-s03, r1-s08)
never did the half the owner's rule is about. They set the weight on one path run, as the key
allows for SD, and said plainly they could not make "every calculation" use it. The other 4 reached
the load-time setting only by going back to the start screen and loading the file again.

### Bar 10, the confirmed severity-3 findings

Confirmed means two specialists, or one specialist plus a session (the scripted counts did not
run, so no finding is confirmed by measurement).

1. **An out-of-date run looks current.** After Replace the drawing, the key's range and the Top 10
   stay at full contrast; the only signs are a gray clock icon on the run's row and a small gray
   bar inside the run's inspector. Visual expert 1, Figma expert 4; sessions r1-s25 to s28, s30 to
   s32. Owner: graphty app, from the element's out-of-date fact.
2. **Find results cut off with no ellipsis, scrolling sideways** (long names): an edge's matched
   end is the part cut away. Screenshot audit 2, visual expert 3, Figma expert 3. No session used
   long names. Owner: graphty app.
3. **Drawn names cover each other and run off the canvas edges.** "Chloe" over "Farah", "Hana" on
   Ivan's dot; long names cut at both edges. Screenshot audit 1, visual expert 2, Figma expert 20;
   sessions r1-s38, r1-s51, r1-s53 (the Gus-Ivan line seems to end at Hana). Owner: graphty-element
   (label placement, frame-to-fit ignoring label extents).
4. **The load of two tables says nothing on the Graph place about a row it left out**, and its
   announcement names the project "Untitled". Accessibility expert 3; sessions r1-s34 (sev 3), s35,
   s37 ("a hurried user would lose a link without noticing"). Owner: graphty app.
5. **A number in a rule must be wrapped in backticks** (`=minutes >= 10` is refused). Figma expert
   2; session r1-s46 met the refusal. Owner: graphty-element (accept a bare number, or return a
   neutral refusal code the app words).

Severity 3, one specialist only (not confirmed; each needs a script or a second look): Enter in the
filter step editor does not commit the edit (Figma 1); a long name hides the neighborhood count and
"Back to ..." is clipped (audit 3); focus falls to the page after "Add step" and after deleting a
step (accessibility 1 and 2; these fail bar 8 by hand regardless).

**Found by both the sessions and the experts:** the stale run, overlapping names, the left-out row
said nowhere after Load, backticks, the selection repainting a node's fill, the segmented controls
marking a choice with an outline only (Add / Leave out), a note's subject following the inspector,
"1 note" counting only the graph's notes, the 2-hop list not saying how far each name is, the Path
popover covering the drawing, no hover mark on an edge, "As the file says" on a CSV. **Only the
experts:** truncation with long names (no session used them), focus and live-region faults, the
step editor's Enter and Escape, the narrow-window layout, shared accessible names. **Only the
sessions:** every finding about where a feature lives (the weight's meaning, Replace, filtering,
selecting by a condition, the path from a person's list), the missing unit, the second path
replacing the first, ids instead of names, the dot size of a guest in 3D, the saved state. The
experts find how a screen looks and behaves once reached; the sessions find whether a returning user
reaches it.

### Bar 11, cost of the core four

| Task | Success path | Median steps (successful) | 2x  | Within | Steps                      |
| ---- | ------------ | ------------------------- | --- | ------ | -------------------------- |
| T20  | 11           | 23                        | 22  | **no** | 14, 14, 22, 23, 24, 25, 39 |
| T17  | 7            | 7                         | 14  | yes    | 7, 7, 7, 7, 8, 9, 11       |
| T18  | 4            | 9.5                       | 8   | **no** | 8, 8, 8, 9, 10, 12, 13, 15 |
| T21  | 6            | 9                         | 12  | yes    | 8, 8, 8, 9, 10, 11, 12     |

T18 holds if its path is counted as 5 steps, as two graders did (an extra click on the To field);
the key lists 4, and the bar is scored on the key. T20's cost is the trip back to the start screen
(below).

## Measures (targets, not gates)

| Measure                                     | Target                    | Round 1                                                                                                                                                                  |
| ------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| All sessions                                | >= 85%                    | 52 of 55 (94.5%)                                                                                                                                                         |
| Ease, mean (median)                         | >= 5.0; no task below 4.0 | 5.25 (6) overall; core four 5.19. **T22 2.75 is below 4.0.** T20 4.43, T21 5.25, T17 5.50, T18 5.50, T4 5.83, T19 5.25, T23 6.00, T24 6.00, T12R 6.50                    |
| Steps against the success path, other tasks | median <= 2x              | T4 14 of 18, T19 18 of 26, T23 6 of 10, T12R 3 of 10 within. **T22 25 against 6**; T24 7 against 6 (the extra steps were participants' own choice of a color that lasts) |
| Wrong turns per session                     | median <= 1               | 1 (24 of 55 sessions with none). T20 median 5, T22 5, every other task 0 to 1.5                                                                                          |
| Recovery                                    | >= 70%                    | 28 of 31 sessions with a wrong turn still succeeded (90%)                                                                                                                |
| The second time (follow-ups)                | path + 1, 0 wrong turns   | T17: 7 of 7 at the follow-up's own 4 steps, 0 wrong turns. T18: 2 of 6 within 5 (5, 5, 6, 6, 7, 8), 0 wrong turns; 2 sessions never got it                               |
| Script, console and request errors          | 0                         | 0 (every `session.log` empty)                                                                                                                                            |

**First moves and broken habits.** Reconstructed from the wrong-turn lists:

- **T20, 7 of 7**: opened the file with "Open project or file..." (the route their histories name),
  then went to the Data place to say what the minutes or kilometers mean. That place has no such
  setting. **Confirmed broken habit, severity 3** (7 sessions, same place).
- **T21, 8 of 8 hunted for Replace**: a left click on the source row (7 sessions) and the main menu
  (r1-s25, s26, s29) offer nothing. **Confirmed broken habit, severity 3.**
- **T22, 4 of 4** typed the condition in the find box without "=" and got "No match". Confirmed,
  severity 3 (one F).
- **T18**: the find box led on in 4 sessions (selecting a person fills the path form's From). It
  led nowhere for r1-s24 (nine look-ups, the chain worked out by hand; never found the path tool),
  and a person's list of connections led nowhere for r1-s18 (Hops stops at 3; the target was 4
  away). Two sessions whose habit led nowhere, in two different places: confirmed as "nothing in a
  person's connections or the find results leads on to the chain", severity 3.
- **T17**: the toolbar (r1-s12, s14, s16), Everything (r1-s14) and the Analyze list (r1-s16) offer
  no way to narrow the drawing. Filters was found under Data in 7 of 8.
- T23 (4 of 4) and T12R (2 of 2): the find box and the Degree row led straight on. T24: 4 of 4
  clicked the line first.

**Doors.** Path: the Analyze list 13 of 14 sessions that ran a path (T18 and T20), a node's "Path
between..." 1 (r1-s18), the P key 0 of 14. Filters: the Filters "+" 7 of 7 that filtered on an
attribute, an attribute's "Filter to..." 0 of 7; "Filter to neighbors" 4 of 4 (T23). Notes: the
Notes place's "+" in 4 of 4, an inspector menu's "Add note" also in 1 (r1-s42), the N key 0 of 4. A tie: the
drawing 4 of 4, the find box 0. The P key had 14 chances (the rule asks for 8) and was never used,
but no session was keyboard-only, so it is not a candidate for removal on this evidence.

**T22, select by a condition.** 1 of 4 typed a rule with "=" (r1-s46, from the Excel habit of
starting a formula with "="; she then met the backticks refusal). Places looked for a "select
where" control: the find box 4 of 4; the attribute's summary and its "..." menu 4 of 4; the color
scale or width from data 4 of 4; Values tabs 2; Quick actions 1. T22 failed its bar, so the
decision fixed before the round applies: the next round first changes the find box's hint and
refusal words. The dialog is reconsidered only if T22 then fails both halves again and 3 or more
sessions look in the same named place -- on this round's showing, the attribute's own menu and the
find box would both qualify.

**Positions after Replace (T21):** not recorded by any grader.

**Bar 7 (b), the weight in T20:** 0 sessions read the minutes or kilometers the wrong way round.
Routes: the load-time meaning chosen after going back to the start screen, 4 (r1-s01, s05, s06,
s07, all "Farther"); the path run's own Weight list, 3 (r1-s02, s03, s08). No one chose Closer,
Capacity or "Date or time". All 4 who opened the path form on the plain-open route saw its Weight
start on "None" while it offered "(farther)"; none pressed Find path unopened, and all four
remarked on it ("it guessed", "odd that it knows farther but still started on None").

## Confirmed problems by task

Confirmed: two or more participants, a build defect seen in two, or an expert finding a session
also shows. Severity is the highest the confirming sessions support; a one-session finding is
listed only where it is severity 3 or more. Deterministic layout overlaps count once per dataset.

### T20, a weight that means "farther"

- **Sev 3** -- "Open project or file..." loads a CSV with no import step; nothing on that route sets
  what a column means, and nothing says the minutes were ignored (7 of 7).
- **Sev 3** -- With a graph open, the page that asks what a weight means is reachable only by "Back
  to start", which drops the open graph without asking; the main menu has no "New from data..."
  (r1-s01, s05, s06, s07).
- **Sev 3** -- The path's Weight list starts on "None" while offering "minutes (farther)"; nothing says
  where "farther" came from or whether other runs use it; Find path unopened gives the fewest-links
  route (r1-s01, s02, s03, s08).
- Sev 2 -- "Total distance 14" has no unit (7 of 7; r1-s05 added the table up by hand to learn it).
- Sev 2 -- A column's kind ("Amount") looks like a setting and is plain text; the column's menu
  holds only "Filter to..." and "Show in table" (r1-s01, s02, s03, s06, s07, s08).
- Sev 2 -- Closeness shows no weight setting and its Made with says nothing about weight, so a user
  cannot tell it counted hops (r1-s01, s02).
- Sev 2 -- Clicking a column's name on the import page sorts the preview instead of opening the role
  box above it (r1-s05, r1-s36).
- Sev 2 -- "As the file says" loads a CSV directed, with one-way arrows on two-way trails (r1-s02,
  s06; Figma expert 26; T4 r1-s34, s35, s38 found the words unexplained).
- Sev 1 -- "Method: Dijkstra, chosen automatically" is jargon (r1-s01, s02).

### T17, narrowing to strong ties

- **Sev 3 (one give-up)** -- Nothing on the Graph place leads to filtering, and neither search box
  finds a column by the task's word ("chapters" against `shared_chapters`) (r1-s12, s14, s16).
- Sev 2 -- The filter step gives a count but never names who dropped out (r1-s09, s11, s15).
- Sev 2 -- "Components 1" sits under "Nodes showing 26 of 77" while the drawing shows two or three
  groups; a small note says the lower counts are for the whole graph (r1-s10, s12, s14). Not scored
  under bar 5 because the note labels it; a skeptic should check.
- Sev 1 -- No preview while typing a value; the effect is seen only after "Add step" (r1-s09 to s13).
- Sev 1 -- Overlapping dots make a count by eye short (r1-s09, s11; once per dataset: friends).
- Sev 1 -- The legend keeps the whole graph's PageRank range while a filter is on, with nothing
  saying whose (r1-s12, s13, s15).
- Sev 1 -- The Filters "+" and the step's checkbox carry no visible words (r1-s09, s10, s13, s15).
- Sev 1 -- The column is called by the file's header ("weight"), not what it counts (r1-s09, s13,
  s15, s51, s53; opinion, held one level down).

### T18, the fewest people in between

- **Sev 3** -- Nothing in a person's list of connections or the find results leads on to the chain
  (r1-s18, r1-s24). r1-s24 worked the chain out by hand and was right only because both targets have
  a single tie.
- Sev 2 -- A second path run replaces the first with no notice (r1-s17 to s21; bar 2 above).
- Sev 2 -- Shortest path sits below the fold of the Analyze list, under the rankings, and the list's
  filter does not match the reader's words ("quickest", "link", "chain") (r1-s01, s17, s19, s21,
  s22, s23).
- Sev 2 -- "Not read -- weight's meaning is not set, and a path needs a distance" reads as a warning
  on a correct fewest-steps run and is not understood (r1-s17, s19, s21, s23).
- Sev 2 -- The selection mark hides the path's color on the selected node, so the chain looks one
  dot short (r1-s19, s23; visual expert 6).
- Sev 2 -- No names are drawn and hovering a node shows nothing, so the drawn path cannot be checked
  against the list (r1-s20, s21, s22; also T20 and T4 sessions).
- Sev 2 -- The result does not say whether the chain is the only shortest one (r1-s17, r1-s20).
- Sev 1 -- One result counted three ways ("4 hops", "5 nodes, 4 edges"), never in steps or
  introductions (r1-s18, s19, s21, s22, s23; Figma expert 14).
- Sev 1 -- Picking a name in the find box marks nothing on the drawing (r1-s23, s24, s34).

### T21, rerunning on a newer file

- **Sev 3 (one give-up)** -- "Replace with file..." is only on the source row's right-click menu or a
  "..." drawn on hover; a left click and the main menu offer nothing (8 of 8).
- **Sev 3** -- Between Load and Rerun the drawing, the key's range and the old Top 10 show last
  month's ranking at full contrast (r1-s25 to s28, s30 to s32; bar 5 and bar 10 above). Every successful participant caught it
  before reading a name, from the key's old range or the bar inside the run; r1-s27, s28 and s31
  said a picture or export taken then would have been wrong.
- Sev 2 -- The new people are drawn saturated blue with no key entry (r1-s26, s28, s30, s32).
- Sev 1 -- "Higher means: Not set / Closer / Farther / Capacity" on the Replace page asks something
  this task does not need; "Capacity" is unexplained (r1-s25 to s28, s31, s32).
- One session, sev 3: "Open project or file..." in an open project leads to an "Add to friends" page
  whose summary puts the combined total under the new file's name (r1-s29).

### T4, two spreadsheets as one network

- **Sev 3** -- "Leave out" is preselected for a row naming a missing node, the choice is shown only
  by an outline, and nothing on the Graph place says a row was dropped (r1-s34, s35, s36, s37;
  accessibility expert 3; visual expert 5).
- Sev 2 -- A whole-number column comes in as a plain attribute under "Weight: none (each edge counts
  1)", with no hint how to make it the weight (6 of 6; 4 stopped to set it).
- Sev 2 -- Names never show: no labels, the inspector titled by id, the find box listing ids
  (r1-s33, s34, s36, s37, s38).
- Sev 2 -- A guest with one pass is drawn as the largest dot (3D perspective), with nothing saying
  what size means; r1-s36 would have reported him as the hub (r1-s34, s36, s38).
- Sev 2 -- After "Add", nothing on the loaded graph records the node made from an unmatched row
  (r1-s35, s38).
- Sev 1 -- The "Closer" example talks about emails on a passes file (r1-s36, s38).

### T19, notes that stay with the work

- **Sev 3** -- A new note silently takes whatever the inspector shows as its subject (the setup's
  PageRank run, a selected family), and the form cannot change it (4 of 4; Figma expert 21).
- Sev 2 -- Nothing lasting says whether the project is saved; "Local only" reads as a save state but
  is about privacy (4 of 4).
- Sev 2 -- "Saved ... in this browser", then the start screen's warning that the browser can clear
  projects, leaves unclear which save keeps the work (4 of 4).
- Sev 2 -- "Save local copy..." shows no confirmation (r1-s40, s41).
- Sev 1 -- The graph-wide note's subject reads "Graph", not the project's name or "Everything"
  (r1-s39, s40, s41); two controls share the name "Graph" (r1-s39, s40).
- Sev 1 -- The reopen lands on the Graph place, not Notes (r1-s41, s42).

### T22, marking everything that meets a condition

- **Sev 3 (one failure)** -- The find box answers a condition typed without a leading "=" with only
  "No match", with no hint that rules exist (4 of 4).
- **Sev 3** -- Edge width drawn far thinner than its number (build defect, table above).
- Sev 2 -- Color or width from data has no threshold or chosen break (4 of 4).
- Sev 2 -- A column's summary and menu offer no "select where this value..." (4 of 4).
- Sev 2 -- Nothing near the find box names the columns a rule can use unless a lone "=" is typed
  (r1-s44, s46).
- Sev 2 -- Adding Color under Edges with a run's layer open writes to Everything (build defect).
- Sev 2 -- The edge table shows four rows at a time (r1-s44, r1-s30).
- Sev 1 -- A new layer's color starts at the gray every tie has, and its width at the width every tie
  has, so adding either changes nothing (r1-s44, s45); the key names a layer, not its column
  ("Edge color: Everything") (r1-s44, s45); a layer made from a selection is named by its count
  ("13 edges", "2 nodes"; also T24 r1-s51, s52, s54).

### T23, a step or two away

- Sev 2 -- "Hops" is not the reader's word (r1-s47 to s50; also r1-s18, s55, s56).
- Sev 2 -- After "Filter to neighbors" the ranking's row shows an out-of-date icon nothing explains
  (r1-s47 to s50; Figma expert 15).
- Sev 2 -- At Hops 2 the list does not say who is a direct tie and who is two away (r1-s49, s50;
  visual 9, Figma 17).
- Sev 2 -- The neighbor list is reached only through the "Degree" row or a node menu's
  "Neighborhood" (r1-s47, s48, s50; r1-s56 noticed the two names).
- Sev 1 -- The way back after narrowing is not obvious (r1-s47, s49; visual expert 10).

### T24, one tie on the drawing

- Sev 2 -- A new fill color is drawn in the selection tint until the selection is cleared (build
  defect, table above).
- Sev 2 -- The key grows and covers a node's name (build defect, table above).
- Sev 2 -- "Select endpoints" is developer wording (4 of 4 guessed it).
- Sev 1 -- Hovering a line changes nothing and shows no tooltip (r1-s51, s53; Figma expert 19).
- Sev 1 -- "Gus -> Ivan" shows a direction a shared run does not have (r1-s51, s52, s53).

### T12R, one person and their ties

- Sev 1 -- Two controls look lit at once in the Neighborhood view (r1-s55, s56; known in the key).

## What worked

- **T23 and T12R**: every session at or under the success path with no wrong turn; the find box, the
  Degree row and Hops 2 led straight on.
- **T17**: 7 of 7 successes found Filters, and every follow-up took exactly the key's 4 steps with
  no wrong turn; no one fell into the "tick to turn it on" trap. The chip and the Filters row
  agreeing is what made participants trust the count.
- **T18**: once found, the path run was read correctly every time; no one read a chain off the
  drawing, set a wrong weight or switched Follow to Out. The Analyze entry's description ("The
  fewest steps ... between two nodes") is what led most participants to it.
- **T21**: the Replace page itself (title "Replace:", "Was 20 nodes, 41 edges; now ...") and Rerun
  kept every color, size and run; no one added the file instead of replacing it, and no one picked
  "Edit source...".
- **T4**: 6 of 6, 0 to 1 wrong turns; every participant found the unmatched row before loading.
- **T19**: every note on the right subject and present after the reopen; no save lost.
- **T20**: the import page's "Higher means" and its "Not set" sentence told every participant who
  reached it exactly what to choose; "Loaded weight minutes (farther)" and "(farther, loaded)" made
  the setting visible afterward.
- **T24**: 4 of 4 clicked the line on the first try and found "Select endpoints" in the tie's menu.

## Candidate insights (for the skeptics)

1. **A returning user sets what a column means on the column, after it is loaded, not on an import
   page before.** 7 of 7 T20 participants opened the file their usual way and then went to the
   column in the Data place; 6 clicked its kind or its menu expecting a choice. The load-time
   question works when reached (every participant who reached it chose right), but nothing leads
   there from an open graph, and getting there throws the graph away. Evidence: T20 above. Watch
   for: the T20 prompt says "bring it in so that every calculation...", which may push toward an
   import step that real users would not look for.
2. **Commands hidden behind a right-click or a hover cost returning users the most.** Replace: 8 of
   8 hunted, 1 left; Add note's subject: 4 of 4 detoured. Participants try a left click and the main
   menu first. Evidence: T21 and T19 above.
3. **Users notice a stale picture only from its numbers or by opening the run, and say so.**
   Every successful T21 participant caught it, from the key's unchanged range or the bar inside the
   run; r1-s27, s28 and s31 said a picture or export taken then would have carried last month's
   ranking. The mark belongs where they read: the key and the drawing.
4. **Users state a condition where they search, in their own syntax.** 4 of 4 typed "minutes >= 10"
   or similar into the find box; 1 thought to start with "=". The second place every one looked was
   the column itself.
5. **Users read names, not ids, and want the program's numbers in their own units.** No drawn names
   on T4, T18 and T20 drawings sent participants to lists; "Total distance 14" with no unit, "hops"
   and "edges" for introductions, "weight" for runs. Many sessions, mostly severity 1 to 2 each.
6. **The second time is cheap where the first route was in place, not where it was hidden.** T17
   follow-ups: 7 of 7 at the key's steps. T18 follow-ups: 2 of 6 within target, because each
   participant repeated the long route they had found (no one used P).

## Next steps for the studio

- Build and run what preflight skipped before round 2: the open-work lister, the weight script over
  every algorithm and meaning, `tool/bars.mjs` on tier 2's screens at both widths (and record
  round 1's bar 9 (b) counts on this build, which become the limit), and five clean `--prove` runs.
  Re-run r1-s04 as r1-s04b. Give the T18 follow-up to every successful session.
- Keep the runner at four sessions alive; three click timeouts came with five.
- Fixes between rounds go to the confirmed severity-3 findings above, in the owning package.
