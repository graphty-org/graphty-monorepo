# Tier 2 round 5 scores: returning users on the real graphty app

Scored against `../../criteria.md` on build 8c015b806 (graphty@0.8.65), from the 56 graders'
`grade.md` files in `sessions/` and the four expert reports in `expert/` (controls and gestures,
visual design, accessibility, and the screenshot audit at 1200 x 900 and 900 x 700). The rows are
checked by `design/ui/studio/tmp/researcher/t2r5/score.py`, which asserts 56 planned sessions, a
VOID grade in every `grade.md`, no screenshot in any session folder, no "Gate evidence" section in
`plan.md` and no `bars/bars.json` in this folder.

All participants are simulated: one model playing composite personas, each told a history of
earlier sessions. Keyboard-only and screen-reader use of tier 2 is untested by sessions (owner,
2026-10-07).

## The result in one paragraph

**Round 5 has no valid session.** All 56 sessions are void: not one participant saw the app. The
round's start gate was never passed. The gate first runs `tool/bars.mjs` into `bars/` and then
`real.mjs --gate`, which writes a "Gate evidence" section at the end of `plan.md`. Neither
happened: this folder has no `bars/`, and `plan.md` has no such section. The sessions were
launched anyway. `real.mjs --start` refused each one with "plan.md holds no "Gate evidence"
section, so no session of this round may start" (exit 1). That refusal is the protection round 4
asked for, and it worked: no session ran on an unchecked round, so no grade below is a false pass
or a false fail. The cost is a whole round of graders and no data. **Every bar that needs sessions
is not scored, so none of them holds (criteria: "not scored" is never a pass). Bars 7 (a), 8 and 9
are not scored either, because the bars script never ran on this build. Bar 10 fails on two
confirmed severity 3 findings.** The round has to be run again (see "Next steps").

## Sessions

| Task  | Planned | Half A | Half B | Valid | Void | Refused at start | No run record at all          |
| ----- | ------- | ------ | ------ | ----- | ---- | ---------------- | ----------------------------- |
| T22   | 8       | 4      | 4      | 0     | 8    | 6                | r5-s01, r5-s03                |
| T17   | 8       | 4      | 4      | 0     | 8    | 7                | r5-s12                        |
| T18   | 8       | 4      | 4      | 0     | 8    | 8                |                               |
| T24   | 4       | 2      | 2      | 0     | 4    | 3                | r5-s25                        |
| T20   | 8       | 4      | 4      | 0     | 8    | 8                |                               |
| T21   | 8       | 4      | 4      | 0     | 8    | 8                |                               |
| T19   | 4       | 2      | 2      | 0     | 4    | 4                |                               |
| T23   | 4       | 2      | 2      | 0     | 4    | 4                |                               |
| T4    | 2       | 1      | 1      | 0     | 2    | 1                | r5-s53                        |
| T12R  | 2       | 1      | 1      | 0     | 2    | 2                |                               |
| Total | 56      | 28     | 28     | **0** | 56   | 51               | 5                             |

"Refused at start": a transcript holds the `--start` refusal. "No run record at all": the work
folder under `tmp/studio-sessions/` holds only `briefing.md`, so the run stopped after the briefing
and before `--start` printed anything. Those five are consistent with the run being cut off by the
usage limit, but they would have been refused the same way.

How the run records were left, for whoever re-runs the round:

- Some graders committed their VOID grade (for example r5-s36, s43, s44, s47, s49, s53); the rest
  left `grade.md` uncommitted in `sessions/`. These grades are kept as the record of the void
  round and are never scored.
- Some transcripts were written only to the tool's folder `tmp/studio-sessions/.../<id>/` and not
  to `sessions/<id>/` (graders of r5-s13, s16, s29 and s44 copied or noted them).
- r5-s47's grader reports `real.mjs --brief` exiting 2 and writing the briefing to the tool's folder
  instead of the folder named in the command. One grader saw it; nobody has scripted it.

## Bars (all must hold in one round)

How one round is scored: a task the round re-ran is scored on that round's sessions. Round 5 planned
every task, so no task carries round 4's sessions forward, and every task has 0 valid sessions.

| #   | Bar                                     | Round 5                                                                                                                                                       | Result         |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | Each task's success rate, each half     | 0 valid sessions on every task                                                                                                                                | Not scored     |
| 2   | Earlier work kept                       | No session opened the app                                                                                                                                     | Not scored     |
| 3   | Confirmed severity-4 problems open      | No sessions. No specialist found a severity 4 on this build                                                                                                   | Not scored     |
| 4   | Confirmed silent commit on success path | No sessions                                                                                                                                                   | Not scored     |
| 5   | Numbers that disagree with drawing/data | No sessions. Round 4's failure (the data table ignoring a filter step) is fixed on this build by every specialist who looked (below), but no reader has met it | Not scored     |
| 6   | Confirmed false "done"                  | No sessions                                                                                                                                                   | Not scored     |
| 7   | The loaded weight read as loaded        | (a) `bars.mjs` did not run on this build. (b) no sessions                                                                                                     | Not scored     |
| 8   | Automated accessibility check           | `bars.mjs` did not run. The accessibility walk by keys found no severity 3 but one focus drop (Escape on a selection's Color swatch, a11y 4); it is not the bar's script | Not scored     |
| 9   | App words at rest                       | `bars.mjs` did not run                                                                                                                                        | Not scored     |
| 10  | Expert walkthrough and screenshot audit | 2 confirmed severity 3 findings open (below). The scripted half (clipped text, raw strings, rejected words) did not run                                       | **Fails**      |
| 11  | Cost of the core four                   | No successful sessions                                                                                                                                        | Not scored     |

### Bar 10, the confirmed severity 3 findings

Confirmed means two specialists, a specialist and a session, or the script. Only two specialists
can confirm anything this round: there are no sessions and the script did not run.

1. **Drawn names and nodes cover each other and the tie a task asks about.** On friends, "Chloe"
   covers "Farah", "Dev" covers "Eli", "Hana" sits on Ivan's node; on bus stops the "Stadium" name
   sits on the Station-Stadium tie; sized nodes are drawn inside each other, and a Shift-clicked
   hidden node's halo reads as the front one. Audit 2 and 3 (severity 3), visual 1 (severity 3).
   Owner: graphty-element (label placement, and a layout that spaces centers, not sizes). On the
   owner's list; reported as a class, as in round 4. The controls specialist clicked the tie's
   midpoint under the "Stadium" name and got the tie (`expert/figma/path/27.png`, `28.png`), so the
   round 4 claim that the name takes the click did not reproduce at that point on this build; the
   cover itself is unchanged.
2. **A number typed in the find box shows the "or more" row only below every matching tie.** On
   friends, "4" lists "Edges 7" in a fixed box, and "weight is 4 (7)" and "weight is 4 or more
   (12)" appear only after the list is scrolled, at 1200 x 900 and 900 x 700 (audit 1, severity 3,
   `expert/engineer/1200x900/ormore/07.png` then `08.png`) and at 1280 x 800 (visual 8, severity 2).
   The specialists split on severity as in round 4; kept at 3 as in round 4. On bus stops, where
   "10" matches no tie, the row is first and works (all four specialists). Owner: graphty app
   (`FindBox.tsx`, section order or list height).

Severity 3 from one specialist only, not confirmed: long names cut at both canvas edges and drawn
over each other (audit 4); the key growing over the drawing and cutting "Depot" to "epot" after a
color is added (visual 2; round 3 and round 4 also had one specialist each). Both are scriptable
and should be scripted before a fix.

**Counts.** The specialists' totals fell from 153 to 152: controls 42 to 39, visual 42 to 52,
accessibility 31 to 36, audit 38 to 25. The visual and accessibility specialists each say their
rise is ground walked for the first time (the 1280 x 800 walk past the find list, a filter after a
path, Discard into an empty project, the table under a step, the Notes place by its shortcut) and
on this round's own changes (the off step's editor, the table count). Severity 3s fell from 5
confirmed in round 4 to 2. The bar's second clause counts confirmed findings of any severity; that
count is not made here because bar 10 fails on its first clause either way.

### Round 4's confirmed problems, checked on this build by the specialists

These are build checks by specialists, not readers. Each fix is credited on its route only when a
round's sessions take that route.

| Round 4 problem                                                       | On 8c015b806                                                                                                                       | Seen by                          |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| The data table ignores a filter step (bar 5, severity 3)              | Fixed: "12 of 41 edges" (or "20 of 41") with only the kept rows                                                                    | audit, controls, visual, a11y    |
| The "or more" row names its layer by a field path (severity 3)        | Fixed: "minutes >= \`10\`", "weight >= \`4\`"                                                                                       | controls, visual, a11y           |
| A bare number that is not a value offers a rule then refused (sev 3)  | Fixed: "10" on bus stops offers "minutes is 10 or more (3)"; Enter selects 3 edges                                                  | audit, controls, visual, a11y    |
| The "or more" row below the fold (severity 3)                         | Open (bar 10, finding 2)                                                                                                           | audit, visual                    |
| Drawn names over each other and over ties (severity 3)                | Open (bar 10, finding 1)                                                                                                           | audit, visual                    |
| An off step turns itself on when its editor is left (one specialist)  | Fixed: the step stays off                                                                                                          | controls, a11y                   |
| New project, then Discard, shows the error page (one specialist)      | Fixed: an empty "Untitled" project                                                                                                 | audit, controls, a11y            |
| Note editor's Cancel drops focus                                      | Fixed: focus on "Add note"                                                                                                         | audit, controls, a11y            |
| A rule on a missing column says only "Nothing matches this rule"      | Open, not fixed on this build as the plan says; now severity 2 by three specialists (below)                                        | controls, visual, a11y           |
| Escape on a selection layer's Color swatch clears the selection       | Open by keys (a11y 4, focus falls to the page); not reproduced by pointer (controls: picker closes, selection kept)                | a11y; controls did not reproduce |

## Confirmed problems on this build (two specialists or more), below severity 3

No session can confirm anything this round, so every row is two or more specialists.

| Problem                                                                                                                                       | Severity | Seen by                                          | Owner                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------ | -------------------------------------------------------- |
| A rule on a column the data does not have answers "Nothing matches this rule", like a real empty result, and Enter empties the selection       | 2        | controls 5, visual 12, a11y 5                    | graphty-element (a code for an unknown column), then app |
| **New:** an edge-only filter step marks runs out of date with "Ran on 20 nodes; 20 shown now", which reads as nothing changed; a path cut by the step keeps a plain "Shortest path" key | 2 | audit 5, visual 3                | graphty-element (edge counts on the out-of-date fact, additive), app (words) |
| The Path popover covers the nodes it asks about                                                                                               | 2        | audit 14, controls 21, visual 24                 | graphty app                                              |
| The two-table source has no actions and no "..." menu                                                                                         | 2        | audit 9, visual 16                               | graphty app                                              |
| "Edit source..." opens a page titled "Replace: ..."                                                                                           | 2 / 1    | audit 10, visual 40                              | graphty app                                              |
| "Filter to neighbors", when done or unavailable, looks like an empty field and gives its reason late                                         | 2        | audit 11, visual 13                              | compact-mantine (disabled look), app (reason)            |
| The Analyze search field moves while the list narrows                                                                                         | 2        | audit 8, controls 19                             | graphty app                                              |
| The path is black, and its black key swatch nearly vanishes on the dark key; a new line color starts black too, so two black swatches sit side by side | 2 / 1 | audit 16, visual 26, a11y 7                | graphty app                                              |
| **New:** the table's filtered count is hard to read: cut to "12 of 41 ed..." at 900 x 700, the smallest text on the panel, and outside the Edges tab's name | 2 / 1 | audit 6, visual 52, a11y 12              | graphty app                                              |
| The Delete key does nothing on a selected filter step                                                                                         | 2 / 1    | controls 13, a11y 21                             | graphty app                                              |
| Overview values wrap ("3 to 6, mean / 3.667")                                                                                                 | 1        | audit 25, controls 32, visual 25                 | graphty app                                              |
| A step row wraps its counts to three lines                                                                                                    | 1        | controls 28, visual 33                           | graphty app                                              |
| An edge's From and To values are dimmer than its weight value                                                                                 | 1        | audit 24, controls 27, visual 19                 | graphty app                                              |

One specialist only, at severity 2, each with a script or a mechanism given: "Filter to neighbors"
disappears when Follow is Out or In, because the element's neighborhood rule has no direction
(controls 1); Escape after a Follow click clears the whole selection (controls 2, script given);
the To list drawn under the Follow control at 1280 x 800 (controls 3); the node pickers matching a
name but showing only the id (controls 4); "minutes 10" a miss where "10" works (controls 6); the
neighbor list and its rings ignoring the active filter, then Filter to neighbors drawing a node
with no tie (visual 5); an off step's editor making "Save and turn on" the loudest control (visual
6); Find path shrinking the drawing at 1280 x 800 (visual 7); the key keeping the undone run's
range after Undo of a Rerun (audit 7); Discard into an empty project leaving the old rule in the
find box and announcing nothing (a11y 1, 2); the table's row count as a second live region (a11y
3).

## Measures

None can be reported: ease, steps, wrong turns, recovery, first move, broken habits, the second
time, doors, T22's rule typing, positions after Replace and console errors on success paths all
come from sessions. The specialists report no script error, console error or failed request on any
step they walked (audit).

## What worked

- **The tool's refusal.** Round 4 asked that no session start without the gate, because "a rule
  written down fails". The refusal in `real.mjs --start` held 51 times out of 51: no participant
  reached an unchecked round, and every grader recognized the refusal as a run fault, graded VOID
  and said how to re-run. Nothing from this round has to be unpicked.
- **The build's fixes, by specialist checks** (table above): the data table follows the filter;
  the "or more" row for a number outside the values, named like a typed rule; the off step stays
  off; New project, then Discard; note Cancel's focus. Six of round 4's open items closed on the
  build, three of them confirmed severity 3s.

## Candidate insights (for the skeptics)

1. **A refusal in the tool stops a bad session but not a bad round.** Evidence: 51 refusals, one
   per session, each costing a facilitator and a grader; the runner kept starting sessions after
   the first refusal. Round 4 already showed that a written rule fails and a refusal works; round
   5 shows the refusal must also stop the runner, not only the session. What would refute it: a
   runner log showing the gate step ran, failed and was overridden by hand.
2. **The usage-limit restart skipped the gate.** Evidence: `workflow-tier2.js` breaks the round
   when the gate step does not return ok, yet this folder has neither the gate's `bars/` nor its
   plan section, and sessions were started. Five sessions stopped after the briefing, which fits a
   run cut off mid-launch. The mechanism (a resumed run replaying past the gate step, or a
   continuation started at the sessions) is not in this folder and is not proven here. What would
   refute it: a journal showing the gate step was never reached in the original run either.
3. **An out-of-date rule that counts only nodes says the wrong thing about edge-only changes.**
   Evidence: audit 5 and visual 3, two specialists, one mechanism (the out-of-date fact carries
   node counts only). Severity 2: the run is marked out of date, but its words say nothing changed.
4. **The "or more" row fixed where it was missing but not where it is buried.** Evidence: on bus
   stops it is first and works (all four specialists); on friends it is still under seven ties
   (audit 1, visual 8). Round 4's two halves of the problem were fixed one at a time.

## Progress against round 4 and the stop rule

Read mechanically, the stall rule is met: the core four's successful sessions fell from 30 to 0,
no confirmed severity 3 on a core-four task was closed by a reader, and no failing bar now holds.
**That reading is wrong for this round.** The criteria void a session that fails for a tool or run
reason and re-run it; a round in which every session was voided for a run reason measured nothing
about the design, so it cannot show that the design stopped improving. Round 5 is incomplete, not
stalled. The build does show progress by specialist checks: round 4's T17 severity 3 (the
unfiltered table) and two other confirmed severity 3s are fixed on it, and none of that is credited
until readers meet it.

## Next steps for the studio

1. **Run the gate, in order:** `tool/with-browser.sh node tool/bars.mjs <round-5>/bars --dist
   <frozen build>`, then `node tool/real.mjs --gate <round-5>`, until it exits 0 and `plan.md` ends
   with "Gate evidence". Never write that section by hand.
2. **Re-run all 56 sessions** on 8c015b806 from new, empty folders with the same persona, task half,
   prompt and start (`sessions.json`), named `<id>b`, in the plan's run order (T22 first). The
   build has not changed, so the plan, the pilots and the briefings stand.
3. **Make the runner stop on the first refusal.** If `--start` prints the "Gate evidence" refusal,
   the runner ends the round and reports it, instead of starting the next session. When a run is
   resumed after a usage limit, it resumes at the gate step, never past it.
4. **Then score round 5 again** from the `b` sessions and this round's expert reports; these
   expert findings stand, since they were made on the same build.
5. Script the one-specialist severity 3s (long names at the canvas edges, the key over "Depot")
   and the one-specialist severity 2s that name a mechanism (Escape after a Follow click; the
   neighbor list under a filter) before anyone fixes them.
