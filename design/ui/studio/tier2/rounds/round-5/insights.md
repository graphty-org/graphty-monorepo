# Tier 2 round 5 insights: returning users on the real graphty app

What round 5 of the returning-user study shows, on build 8c015b806 (graphty@0.8.65), after two
independent skeptics checked every run fault, bar, problem and candidate insight in `scores.md`
against the workflow journal, the scripts that ran the round, the grades, the four expert reports
and their screenshots. Rule applied: a claim both skeptics drop is dropped; a claim either one
weakens or drops is weakened, unless the other answers its reason with evidence. Most severe first.
Severity is Nielsen 0 to 4 (4 = cannot be done, the user leaves, or reports a wrong answer
unknowingly). Screenshot paths are relative to this folder.

All participants are simulated: one model playing personas, each told a history of earlier
sessions. This round no participant reached the app, so everything below about the design comes
from four specialists walking the build, never from readers.

**Round 5 measured nothing about the design: 0 of 56 sessions are valid.** Every bar that needs
sessions is not scored, so none of them holds. Bars 7 (a), 8 and 9 are not scored because the bars
script never ran. Bar 10 fails on one confirmed severity 3 finding (item 2).

## 1. The study ran an old copy of its own script, so the round's start check never ran

**Both skeptics keep the conclusion and replace the mechanism `scores.md` guessed at.**

- The round came from one long workflow run that was launched once, on 2026-10-10, and never
  relaunched: its journal holds a single "launched" event. It runs
  `tmp/studio-resume/workflow-tier2-continue.js` in the main checkout, a continuation script
  written right after the 2026-10-10 usage limit and unchanged since 07:48 that day. Its round
  loop goes from the plan straight to the participants. It has no gate step, no separate
  session-start step and no re-run of a session that never started.
- The gate step and the start step exist only in `../workflow-tier2.js`, which is untracked in git
  (never committed). The running workflow never read it.
- The journal's round 5 steps are "plan", then 56 participants, then 56 graders, four experts,
  "score" and two skeptics. No step named "Round 5: gate" was ever started.
- So the tool's refusal in `real.mjs --start` was the only check left, and it held 56 times out of
  56: every participant's result in the journal quotes the "no Gate evidence" refusal. That
  includes the five sessions `scores.md` called "consistent with the run being cut off by the
  usage limit" (r5-s01, s03, s12, s25, s53). They were refused, not cut off; they returned the
  refusal without writing a transcript.
- **Dropped:** "the usage-limit restart skipped the gate" in the sense of a resumed run replaying
  past a gate step. No resume happened, and rounds 3 and 4 in the same run had no gate step
  either. The usage limit only interrupted individual agents, which recovered on their own.
- **Weakened:** "the runner kept starting sessions after a refusal". The 56 sessions started in
  parallel between 07:09 and 07:15, each participant runs `--start` itself, and the runner never
  reads their free-text answers, so it had nothing to stop on. Stopping on the first refusal is
  still cheap and worth adding, but it is secondary.
- **Other recovery state that was lost:** round 4 owed three re-runs (r4-s05b, r4-s20b,
  r4-s28b) before round 5's sessions (`../round-4/decisions.md`). None exists.
- **Weakened:** r5-s47's `--brief` "writing to the tool's folder". Writing briefings to
  `tmp/studio-sessions/` is the documented design (`../../../tool/README.md`); all 56 briefings
  are there. About 10 participant results report `--brief` exiting 2; the cause is not shown.

The lesson: a continuation script is a fork. Every later fix to the main script must reach it, or
the run must be stopped and relaunched from the main script. Editing `workflow-tier2.js` changed
nothing about the run in flight.

## 2. Confirmed severity 3 (bar 10): drawn names and nodes cover each other

**Both skeptics keep the problem; parts of the description are weakened.** On friends "Chloe" is
drawn over "Farah" and "Dev" over "Eli", in the same places in the visual walk
(`expert/visual/narrow/02.png`) and the audit (`expert/engineer/1200x900/analyze/01.png`). "Hana"
sits on Ivan's node in the visual report. Both specialists rated it severity 3, so bar 10 fails on
this finding alone. Owner: graphty-element (label placement, and a layout that spaces centers by
drawn size). Already on the owner's list.

- **Weakened:** "covers the tie a task asks about". On this build the controls walk clicked the
  Station-Stadium tie at its midpoint and got the tie (`expert/figma/path/27.png`, `28.png`); the
  midpoint lies above the part the "Stadium" name covers, so no click landed inside the name. The
  scripted claim that the name takes a click on the tie under it reproduced on the earlier build
  5277e2cbe (`claims/c-tie-click/03.png`: the click selected the Stadium stop). Whether it still
  does on 8c015b806 is unsettled until the script is re-run on this build.
- **Weakened:** "sized nodes inside each other; a Shift-clicked hidden node's halo reads as the
  front one" comes from the audit alone.

## 3. An edge-only filter step says nothing changed while marking every run out of date

**Both skeptics keep it. Confirmed severity 2.** A step "weight is at least 3" keeps all 20 nodes
and 20 of 41 edges. The PageRank run gets the out-of-date clock, and its tooltip and the inspector
bar say "Ran on 20 nodes; 20 shown now" beside Rerun (`expert/engineer/crops/edgeonly09-stale-20-of-20.png`).
The run did change (PageRank over 20 edges is a different answer), but the words name a count that
did not. Two specialists, one mechanism: the out-of-date fact carries node counts only (audit 5,
visual 3). Owner: still to be settled by a script. The audit points at graphty-element (the fact
needs edge counts, an additive change); the visual specialist points at the app's words. Keep both
owners until a script shows which one is missing.

## 4. A rule on a column the data does not have answers like a real empty result

**Both skeptics keep it. Confirmed severity 2 by three specialists** (controls 5, visual 12,
accessibility 5). On bus stops "=distance > `5`" (no such column) says "Rule: press Enter to
select matches" and then "Nothing matches this rule", and Enter replaces a 3-edge selection with an
empty one (`expert/figma/find/05.png`, `06.png`, `07.png`). A reader cannot tell a typo in a column
name from a true empty answer. Round 4's scripted claim; not fixed on this build. Owner:
graphty-element (refuse an unknown column with a code), then the app (its words, and no selection
change on a refusal).

## 5. The "or more" row below the matching ties: confirmed, severity 2, not 3

**Both skeptics keep the problem and weaken the severity.** On friends, typing "4" in the find box
lists "Edges 7" in a fixed box with a scrollbar, and the rows that act on every match ("weight is
4", "weight is 4 or more") appear only after scrolling (`expert/engineer/1200x900/ormore/07.png`).
Only the audit rated it 3; the visual specialist rated it 2; the controls walk at 1440 x 900 did
not flag it; the keyboard walk reached the row by key. Round 4's split was the same and "kept at 3
as in round 4" is a carry-forward, not evidence. Treat it as a confirmed problem at severity 2 (one
skeptic would leave it "2 or 3, unsettled"); bar 10 does not depend on it. Owner: graphty app
(`FindBox.tsx`, section order or list height).

- **Weakened (candidate insight 4):** "fixed where it was missing but not where it is buried". Both
  halves are on screen (on bus stops, where "10" matches no tie, the row is first and works for all
  four specialists), but round 4's decisions deferred the below-the-fold half on purpose, so "fixed
  one at a time" is a recorded choice, not a finding.

## 6. Round 4 problems fixed on this build, by specialist checks only

**Both skeptics keep these.** Each has two to four specialist walks with screenshots. None is
credited until readers meet it on its route.

- The data table follows a filter step: "12 of 41 edges" with only the kept rows
  (`expert/engineer/1200x900/table/09.png`).
- The "or more" row's layer is named like a typed rule ("weight >= `4`"), not by a field path.
- A bare number that is not a value ("10" on bus stops) offers "minutes is 10 or more (3)" and
  Enter selects 3 edges.
- An off step stays off when its editor is left.
- New project, then Discard, gives an empty "Untitled" project.
- The note editor's Cancel puts focus on "Add note".

**Weakened:** Escape on a selection's Color swatch clearing the selection. On this build only the
keyboard walk reproduces it (`expert/a11y/path-sr/24.png`, `25.png`); the pointer walk did not, and
the scripted claim in `claims/b-swatch-escape` was made on 5277e2cbe. One specialist on this build.

## 7. Other confirmed problems below severity 3

Each has two or more specialists with named screenshots; both skeptics keep them unless noted.

| Problem                                                                                   | Severity | Seen by                          | Owner                                      |
| ----------------------------------------------------------------------------------------- | -------- | -------------------------------- | ------------------------------------------ |
| The Path popover covers the nodes it asks about                                           | 2        | audit 14, controls 21, visual 24 | graphty app                                |
| The two-table source has no actions and no "..." menu                                     | 2        | audit 9, visual 16               | graphty app                                |
| "Filter to neighbors", done or unavailable, looks like an empty field; reason comes late   | 2        | audit 11, visual 13              | compact-mantine (look), app (reason)       |
| The Analyze search field moves while the list narrows                                     | 2        | audit 8, controls 19             | graphty app                                |
| The path is black; its black swatch nearly vanishes on the dark key; two black swatches   | 2 / 1    | audit 16, visual 26, a11y 7      | graphty app                                |
| The Delete key does nothing on a selected filter step                                     | 2 / 1    | controls 13, a11y 21             | graphty app                                |
| "Edit source..." opens a page titled "Replace: ..." (weakened to 1: one walk saw it after a replacement) | 1 | audit 10, visual 40 | graphty app                                |
| Overview values wrap ("3 to 6, mean / 3.667")                                             | 1        | audit 25, controls 32, visual 25 | graphty app                                |
| A step row wraps its counts to three lines                                                | 1        | controls 28, visual 33           | graphty app                                |
| An edge's From and To values are dimmer than its weight value                             | 1        | audit 24, controls 27, visual 19 | graphty app                                |

**Weakened and split:** "the table's filtered count is hard to read" is three different defects,
each seen by one specialist, none confirmed: cut to "12 of 41 ed..." only at 900 x 700, below the
study's 1440 x 900 window (audit 6); the smallest text on the panel, though it measures 7.59:1 and
passes contrast (visual 52); outside the Edges tab's name (accessibility 12).

Severity 3 from one specialist only, unconfirmed: long names cut at both canvas edges (audit 4);
the key growing over the drawing and cutting "Depot" (visual 2). Both should be scripted before a
fix.

## The stop rule

**Both skeptics keep it.** Round 5 is incomplete, not stalled. Every session was voided for a run
reason, so the round says nothing about whether the design stopped improving.

## What to do next

1. Commit `../workflow-tier2.js`, stop the running workflow, and relaunch from it starting at
   round 5. Before any session starts, confirm a "Round 5: gate" step appears in the new run's
   journal and `plan.md` ends with "Gate evidence". Do not edit the continuation script instead
   unless it is brought fully in line with `workflow-tier2.js`.
2. Run the three owed round 4 sessions (r4-s05b, r4-s20b, r4-s28b) on 5277e2cbe first, scored into
   round 4.
3. Re-run all 56 round 5 sessions as `<id>b` on 8c015b806 from new folders, in the plan's order.
   The build has not changed, so the plan, pilots, briefings and these expert findings stand.
4. Add the cheap guard as well: the runner ends a round on the first participant who reports the
   start refusal.
5. Re-run the name-over-tie click script (`claims/c-tie-click`) on 8c015b806, and script the
   edge-only out-of-date note to settle its owner.
