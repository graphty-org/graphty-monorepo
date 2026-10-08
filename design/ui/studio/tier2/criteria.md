The study runs on build e2ccec0e9304 (graphty@0.8.56, commit e2ccec0e9) served from
`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-e2ccec0e9/`, with
`REAL_DIST=<that folder>` on every `tool/real.mjs` command (`../tool/README.md`).

Frozen on 2026-10-08 for the tier 2 rounds. Nothing below changes while a round runs; between
rounds a change is allowed only with its reason in the change log.

# Success criteria and round plan: the tier 2 study on the real graphty app

Scored as written. A bar changes only between rounds, with the change and its reason written in
the change log at the end. Nothing here changes after a round's first session starts.

**What is studied.** The tier 1 workspace of the graphty app (`/?next`), as a local production
build of the studio worktree, driven by `tool/real.mjs`. Tier 2 is the common repeat work of a
returning user: filtering, the shortest chain between two nodes, notes, two tables joined into one
network, a weight whose meaning is set at load and read by every run, rerunning on a newer file,
marking everything that meets a condition, how far a node's neighborhood reaches, and asking about
one tie on the drawing. Tasks: `tasks.md`. Answer key (graders only): `answers.md`. Participants:
`roster.md`. Tier 1's criteria, whose method this file follows: `../criteria.md`.

**Who the participants are.** Simulated: one model playing composite personas, each given a
history of earlier sessions. A failure is strong evidence; a pass is weak until real people
confirm it. "Returning" is a briefing, not a memory: every session is a fresh agent that has never
seen the app, told what it did before. So a simulated returning user remembers exactly what its
history says, no more and no less, and is likely to be faster than a real one on anything the
history names and no faster on anything it does not. Every report says so.

**Not studied in tier 2** (owner, 2026-10-07): no keyboard-only study, no screen-reader study and
no touch or tablet profile. Every report says that tier 2's keyboard and screen-reader access is
untested by sessions; bar 8 checks only what a script can.

## Grades

As tier 1 (`../criteria.md`, "Grades"): S, SD, F, G; success = S + SD; graded from the last
screenshot, the downloads and the transcript, never from a self-rating or a summary; claims graded
apart from the task (false "done", including `truth-on-screen`); severity 0-4 (Nielsen); confirmed
= 2 or more participants, or one participant plus a scripted repro for a build defect; every bar
scored on all sessions, with the number without build-decided sessions beside it for diagnosis;
a tool fault voids the session, which is re-run and counted.

Two rules learned in tier 1 hold from the first session:

- **A severity 4 needs a wrong conclusion a reader would act on**, judged from what the participant
  could perceive at the time, or a task that cannot be done, or a participant who leaves. A remark
  outside the question the task asks is not one.
- **Graders are never told the outcome to look for.** The answer key names traps the build is known
  to have (so a grader can recognize them), but no briefing, watch list or prompt to graders says
  which findings the studio expects.

## Bars that decide "done" (all must hold in one round)

**How "one round" is scored.** Rounds after the first re-run only some tasks, so a round is
scored on the latest result of every task: a task the round re-ran is scored on that round's
sessions; a task it did not re-run carries its sessions from the last round that ran it, which is
allowed only because no fix touched it (a touched task is always re-run, "Round plan"). Bars 1 to
7 and 11 are scored on those sessions together. Bars 8, 9 and 10 are measured afresh on every
round's frozen build. **A bar that was not scored in a round does not hold in that round**, for
whatever reason; "not scored" is never a pass.

| #   | Bar                                                                       | Target                                                                                                                                                                                                                                                                                                                                                                    | Reason                                                                                                                                                                                                                                                                                                                                           |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 | Each tier 2 task (and T12R), success rate | >= 80% (7 of 8); each dataset half >= 75% (3 of 4). A task run below its full size of 8 passes only if every session succeeds: T4 at 6 needs 6 of 6 (3 of 3 per half); a task at 4 needs 4 of 4 (2 of 2 per half); T12R at 2 needs 2 of 2 | Tier 1's bar. The per-half floor stops a change that works on one domain only from passing on combined counts. |
| 2 | Earlier work kept | 0 confirmed sessions with `work-lost` or `not-kept`: a run, a style, a note, a filter step or a loaded table gone at the end without the participant choosing to remove it. Judged from a scripted list of the open work at the start and at the end of every session (runs, style layers, notes, filter steps, sources); graders judge only whether each difference was the participant's choice. A save the tool lost voids the session and is never scored `not-kept` | A returning user's own work is what they came back to. "A refresh that costs as much as the first build" is the returning persona's stated reason to stop (`../personas/returning-nonprofit-analyst.md`). Losing it silently is worse than any slow path. |
| 3   | Confirmed severity-4 problems open                                        | 0                                                                                                                                                                                                                                                                                                                                                                         | Tier 1's bar, with the rule above.                                                                                                                                                                                                                                                                                                               |
| 4 | Confirmed silent commit on a success path | 0 | Counts commits whose effect belongs on the drawing or the inspector: a filter step added, ticked or unticked; a second table or a replacement loaded; a path found; a note saved; a hop count changed; a rule entered; a run rerun; a tie clicked on the canvas; a tie's two ends selected; the weight's meaning chosen at load. Silent = before and after screenshots show no change on the canvas, the legend, the header or the inspector. |
| 5 | Numbers seen on a success path that disagree with the drawing or the data | 0 | Includes a count whose label names something other than what it counts (such as a path run's row number that is not the path's length), a filter chip that does not match the dots drawn, and a value from an out-of-date run shown without its out-of-date mark. Tier 1's most repeated trust loss. |
| 6   | Confirmed false "done"                                                    | 0                                                                                                                                                                                                                                                                                                                                                                         | Tier 1's bar; a returning user who believes a narrowed or stale picture is the whole one reports it.                                                                                                                                                                                                                                             |
| 7 | The loaded weight is read as loaded | (a) A script on the build runs EVERY algorithm in the element's catalog on the same table loaded with each meaning (closer, farther, capacity, unset) and once without the weight column. Every run reports what it read; each meaning is read in its own sense by every reader or skipped with a code (a closer or unset weight never read as a distance, a farther weight never read as closeness by PageRank or community detection, a capacity never read as a length by a path); and a run that says it read no weight gives the same answer with and without the column. The script fails on a planted wrong reading of each kind before it is trusted. (b) 0 confirmed sessions where a run read the weight the wrong way round and the screen gave no sign of it | The owner's rule: the weight chosen at load is used by every run. It is required, and a wrong reading gives a confident wrong answer (T20's wrong routes). Part (a) is the build's promise, which no session sample can cover; it runs every algorithm, not only those the catalog marks, because a wrong mark is exactly the defect a marked-only check cannot find (PageRank read the weight unlike the other runs in the audit that started tier 2); part (b) is what a reader meets. |
| 8   | Automated accessibility check of the tier 2 screens                       | axe 0 serious or critical (tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`); no two reachable controls share an accessible name; focus never falls to the page after the actions listed below                                                                                                                                                                            | Tier 1's bar 8, on the new screens. It is a script, not a keyboard study.                                                                                                                                                                                                                                                                        |
| 9 | App words on screen at rest | (a) <= 50 on tier 1's screen. (b) On a returning rest screen (friends.csv, one filter step on, one run, two notes, two sources, nothing selected, 1440 x 900), an edge's inspector, a path run's inspector and the neighbor list with Hops and Follow: no count rises above its round 1 count | Tier 1's bar 9, on the same screen (Les Miserables loaded, nothing selected, 1440 x 900, counted by `tool/bars.mjs`). Tier 1's last count was 41; tier 2's places (Notes on the rail, the Filters section) must fit inside the same budget. Part (b) counts tier 2's words where they appear: the filter chip is drawn only while a step is on, so tier 1's screen never sees it. Its limit is round 1's own count, fixed before any fix, because no count of those screens exists yet. |
| 10 | Expert walkthrough and screenshot audit | 0 confirmed severity 3 or 4 findings open; the number of confirmed findings of any severity never rises from one round to the next | Tier 1's sessions missed most of what a real person noticed on first use (clipped names, raw file syntax in the Overview, element strings and a rejected word in the legend). The walkthrough and audit catch that kind of problem each round, and without a bar their findings could never hold a round back. |
| 11 | Cost of the core four | Per task (T20, T21, T17, T18), the median steps of successful sessions <= 2x the success path's steps | Tier 2 is repeat work, and the returning persona's stated reason to stop is "a refresh that costs as much as the first build". Steps are behavior, which this study trusts; ease ratings are not calibrated. |

**Bar 8, the screens:** Data place with a filter step on and with one off; the step editor; the
header chip; the Path popover with a finished path and its run's Values; the Notes place with two
notes and empty; the Data page with two tables and an unmatched row; the Data page titled
"Replace: ..."; an out-of-date run with its state bar; the neighbor list with Hops and Follow; an
edge's inspector; the find box with a rule hint and with a refused rule. **Focus never drops**
after: adding, ticking and deleting a filter step; Find path; saving a note; Load (two tables and a
replacement); Rerun; Filter to neighbors; Select endpoints; Escape from the Path popover and the
step editor. `tool/bars.mjs` measures tier 1's screens only; it is extended to these before round 1
(preflight item 9). A round in which it did not run on every screen above does not hold bar 8.

**Bar 10, how it is scored.**

- **Who:** the Figma designer, the visual designer and the accessibility specialist each walk every
  tier 2 screen on the round's frozen build, apart, before they see the sessions. Like graders,
  they are not shown the pilots' watch items or any earlier finding list.
- **Screens:** every bar 8 screen, captured at 1440 x 900 and again at 1280 x 800 (device scale 2,
  the whole window), because truncation depends on width; the Data place, one node's inspector and
  the find box with `long-names.csv` loaded (names of 40 or more characters, a 30-character column
  name); and the last screenshot of every successful session.
- **Counted by script** (`tool/bars.mjs`, preflight item 9), each printed with its screen and
  element: text clipped or ellipsized (`scrollWidth > clientWidth`) with no way to read it whole
  (no tooltip, wider view or accessible name giving the full text); a visible string that comes
  from the element or the code rather than the app's words (an error code such as
  `E_BAD_SELECTOR`, a field path such as `results.louvain.group`, a refusal's raw text, a file's
  raw statement); a word the glossary (`design/ui/framework/glossary.md`) rejects, in any screen
  string.
- **Judged by the experts:** a control that is not the compact-mantine default; spacing off the
  theme scale; one job done by two kinds of control, or one control behaving two ways; text or the
  key covering a node.
- **Severity:** the same 0 to 4 scale. Truncation that hides a word the reader needs to act is
  severity 3, and so is a raw element or code string on a success path.
- **Confirmed:** measured by the script on the frozen build, or named by a second specialist who
  was shown only the capture. Both skeptics then try to refute each confirmed finding, as any
  other.
- **Report:** which findings only the audit found, which only the sessions found, and which both
  found, so each round shows whether the audit catches what a participant notices.

## Measures reported every round (targets, not gates)

| Measure                                                                                                                                                                                                                              | Target                              | Reason                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| All tier 2 sessions together                                                                                                                                                                                                         | >= 85%                              | Tier 1's target.                                                                                                                      |
| Ease (1-7, read from the transcript), mean per task and overall; median beside it                                                                                                                                                    | mean >= 5.0; no task mean below 4.0 | Simulated ease is uncalibrated: the trend is the signal. Tier 1 round 3: 5.28.                                                        |
| Steps against the success path (successful sessions), every task other than the core four (whose cost is bar 11) | median <= 2x | Shows where success is costly. |
| Wrong turns per session                                                                                                                                                                                                              | median <= 1                         | A returning user knows the shell; tier 1 round 3's median was 0, its first round's 1.                                                 |
| Recovery: sessions with a wrong turn that still succeed                                                                                                                                                                              | >= 70%                              | Tier 1's target.                                                                                                                      |
| First move: whether the session's first action went to a place the participant's history names, and whether that place led anywhere | reported; a dead end counts as below | Measures how far tier 1 habits carry into tier 2, and flags passes that came from the briefing rather than the screen. |
| A broken habit: a first move into a place the participant's history names (the Data place, the find box, a person's list of connections, the analysis button) that offers no way on to the task | each one a wrong turn; the same place in 2 or more sessions of a task is a confirmed severity 3 finding | Tier 2 changed the Data place, the find box, the node menu and the inspector. Preflight item 4 proves by script that tier 1's paths still work, not that a returning user's habit still arrives. A habit that leads nowhere is the returning user's dead end. |
| The second time: on T17 and T18, each successful session gets one follow-up prompt in the same session (`tasks.md`); steps and wrong turns on the follow-up | steps <= the follow-up's success path + 1; 0 wrong turns | Tier 2 is about repeat work, but every task measures the first use. What brings a weekly analyst back is that the second time is cheap. A target, not a gate, in round 1: the follow-up prompts are new and a gate on an unpiloted protocol is how a tier 1 round once scored a check that read nothing. |
| Door used, per feature with more than one door (Path: P, a node's menu, Analyze; notes: N, "+", a menu's "Add note"; filter: the Filters "+", an attribute's "Filter to...", "Filter to neighbors"; a tie: the canvas, the find box) | reported per round, with how many sessions had the chance to use each door | Remove before adding: a door no session used is a candidate for removal only after 8 or more sessions across rounds had the chance to use it (most features run at 2 sessions a half, too few to call a door unused); a door every session missed is a finding. |
| T22: sessions that typed a rule ("=") in the find box; places looked for a "select by condition" control | reported; decides the dialog as below | The design keeps a separate "select where" dialog until this study shows the need. Decided now, before the data: if T22 fails its bar, the next round first changes the find box's hint and refusal words. The dialog is reconsidered only if T22 then fails both halves again and 3 or more sessions looked for a select-by-condition control in the same named place. |
| Positions after Replace (T21): nodes in both files whose place on the drawing moved | reported | Replacing a file lays the drawing out again. No setup or history holds hand-placed positions, so moved dots are not counted under bar 2; they are reported so the cost is visible. |
| Script errors, console errors and failed requests the tool prints on any success path                                                                                                                                                | 0                                   | Each is a bug report.                                                                                                                 |
| What worked                                                                                                                                                                                                                          | listed per task                     | The owner (2026-10-02): "it's hard to tell if it was all failures".                                                                   |

## Round plan

- **Rounds:** as many as it takes to meet the bars, with no cap; the study stops early only by the
  rules in "When the study stops". Round 1 runs every task. Every later round re-runs every task
  below its bar at full size, the core four at full size always, and each task a fix touched at 4
  or more as a regression check. A task that met its bar and no fix touched is not re-run; its
  sessions carry forward ("How one round is scored").
- **The core four:** T20 (the weight, the owner's required rule and the largest known gap), T21
  (rerunning on new data, the reason a weekly analyst returns), T17 (filtering) and T18 (the
  shortest chain), the commonest repeat questions. They decide the stall rule.
- **Size (round 1, 56 sessions, the studio's cap):** the core four at 8 each, 4 and 4 (32). T4 at
  6, 3 and 3 (joining two tables was deferred from tier 1 and is the largest load change). T19,
  T22, T23 and T24 at 4 each, 2 and 2 (16). T12R, tier 1's T12 (one person and who they are tied
  to) asked of returning users, at 2, 1 and 1, graded with tier 1's answer key: a person's list of
  connections is the habit the histories lean on most, and tier 2 added Hops and Follow to that
  list and new entries to the node menu beside it. A task below full size passes bar 1 only if
  every session succeeds. Allocation: `roster.md`.
- **Persona mix:** every session by a returning persona. At least 60% by personas who did tier 1
  as first-time users (round 1: 37 of 56, 66%); the rest by the regular analysts. No persona takes
  both halves of one task. Every tier 2 task half has at least two personas and every tier 2 task
  at least three; T12R, at one session a half, has two.
- **Tier share:** 54 tier 2 sessions and 2 of T12R. The rest of tier 1 is guarded by script:
  every tier 1 success path runs on each tier 2 build (preflight item 4), because tier 2 changed
  places tier 1 uses (the Data place, the find box, the node menu, the inspector).
- **Starts:** every session starts from work that reflects the persona's earlier sessions: the
  file open, ranked by PageRank, its dots colored and sized by the ranking (the routine every
  history shares), plus every name drawn where the task reads names on the drawing. Only T4 and
  T20 start empty, because each is about bringing in new files from scratch. The setups and which
  task uses which: `roster.md`, "Where each session starts".
- **At most 4 participants alive at once.** Browsers go through `tool/with-browser.sh` (4 slots
  across the machine), and the runner starts a participant only when a slot is free, so no
  session's clock runs while it waits; every session ends with `--end`.
- **Session length:** no step cap. A session ends when the participant says they are done, gives
  up, or keeps repeating without progress (graded G, with the grader saying so). Sessions are
  never cut short while they are still giving evidence.
- **Step notes:** before every step the participant writes one or two sentences: what they see and
  what they will try next. Graders read these beside the screenshots; a longer note is not asked
  for.
- **API errors:** a session that ends on a model API error (an overloaded or failed request, not
  anything the app did) is a tool fault: it is voided and run again from a new, empty folder with
  the same persona and prompt. Every `session.json` records the model that ran the participant;
  the round report lists every retry and its reason.
- **Frozen build:** each round serves one copy of `graphty/dist` (`REAL_DIST`), made after the
  preflight passes, so no rebuild changes the app under a session.

## Before a round may start (preflight)

1. The build under study is the studio worktree's commit, rebuilt, with no uncommitted changes;
   a copy is frozen and served; its commit and build stamp are in every `session.json`.
2. `node tool/real.mjs --prove` prints only `ok` on 5 runs in a row on the frozen build, or every
   failure's cause is traced and fixed first. Until then no session that saves and reopens (T19,
   T21) runs: an unexplained save fault in the tool would be scored as lost work against the app.
3. **Pilot on every new build:** every tier 2 task's success path in `answers.md`, both halves,
   runs on the frozen build as a scripted session and ends on its success state. A path that
   cannot is a deciding build defect, fixed first or named in the round report. A changed screen
   rewrites the path, not the prompt. The same holds for every task whose setup changed, and for
   T12R and the T17 and T18 follow-ups.
4. Every tier 1 success path in `../answers.md` runs on the same build and ends on its success
   state.
5. Every reference value in `answers.md` is re-recorded on that build (the probe and the pilots),
   and every "known on this build" note is checked: kept, reworded or deleted. No value is blank.
6. **Wording check:** the build's visible text and accessible names are dumped on every screen a
   tier 2 success path reaches, and a script lists every word a prompt shares with them, except
   the data's own words (the T17 and T18 follow-ups and T12R included); it must catch a planted
   echo before it is trusted. Each overlap is
   reworded or kept with its reason in `tasks.md`.
7. **History check:** the same script runs over every history in `roster.md`; a history may name
   only places the persona's tier 1 sessions reached, never a tier 2 control.
8. Every setup in `../rounds/tier-2/setups/` runs and its first screenshot is looked at. A script
   lists the open work (runs, style layers, notes, filter steps, sources) at a session's start and
   end, for bar 2, and is checked on a planted removal before it is trusted.
9. `tool/bars.mjs` covers bar 8's tier 2 screens, both parts of bar 9 and bar 10's scripted
   counts at both widths, each caught on a planted case (a clipped name, a raw code, a rejected
   word) before it is trusted; and the bar 7 (a) weight script exists and fails on a planted wrong
   reading of each kind before it is trusted.
10. Every change carried into the round (fixes since the last round or the last pilot) is listed
    as built or not built, checked on the served build, not from the commit log.
11. `tasks.md` and this file are frozen; the round folder is new; participants get only what
    `tasks.md` lists.

## After a round: scoring and the skeptic check

- One row per session (task, half, persona, grade, ease, steps, wrong turns, first move, doors,
  build-decided, void) in a script with an assert on the session count; every grade's void line
  read.
- **Two independent skeptics** then try to refute every finding and every bar result before it is
  kept: is the count false or only confusing; is the step on the success path; is the session
  valid; is the evidence the app's or the tool's; was the participant primed by the prompt, the
  history or a grader's briefing. Deterministic events (a layout overlap, a fixed seed) count once
  per dataset. Where the two disagree, one skeptic's weakening stands unless the other answers its
  reason with evidence. A grader's ruling is overridden only with new evidence.
- Every number is reported with its denominator, with and without build-decided sessions, and
  successes beside failures.

## How a fix is accepted

As tier 1 (`../criteria.md`, "How a fix is accepted"): the right package (graph logic and facts in
graphty-element, words and arrangement in the app, a shared control in compact-mantine); remove
before adding, and words at rest never rise from one round to the next; lint, build and the
affected tests pass, with a test that fails without the fix; a re-pilot on the new build and a
skeptic's generality check (no one-dataset special case, no task word echoing the fix's words). A
new or changed graphty-element public API is recorded in `../owner-decisions.md` and its pull
request held for the owner. A fix is accepted when its task meets its bar in the next round with
no new confirmed severity 3 or 4 on any task it touched.

## When the study stops (done)

- **Passed:** every bar holds in one round. Recommend confirming with real people (graphty.app with
  opt-in usage data, 5 to 8 real analysts who use it weekly).
- **Stalled:** a round makes no progress over the round before it: the core four's successful
  sessions (of 32) rise by fewer than 3, no confirmed severity 3 or 4 finding on a core-four task
  was closed, and no bar that failed now holds. The study stops and the owner is told, with the
  evidence; the remaining problems are probably beyond simulated participants.
- A problem that needs an owner decision that cannot be undone cheaply stops work on that task
  only.

The final report gives what was tested, every bar's result with its denominator, what worked, what
failed and why, each fix with its package and evidence, and the next steps.

## Change log

No round has run. The bars changed once before round 1, at the freeze (the first entry).

- **2026-10-08, before round 1: the freeze, after three reviews of the criteria.** Each change and
  its reason:
  - **"One round" made scorable.** Later rounds re-run only some tasks, so no later round could
    hold every bar as worded. A task not re-run carries its sessions forward, which is safe only
    because a touched task is always re-run.
  - **"Not scored" does not hold**, for every bar. A pass/fail table with a "not scored" state is
    a silent path to "every bar holds"; bar 8 had one.
  - **Bar 1's floors written for the sizes this study runs** (8, 6, 4, 2). With 3 sessions a half,
    "75% per half" read two ways; T4 now needs 6 of 6.
  - **Bar 2 judged from a scripted list of open work, and a save the tool lost voids the session.**
    Graders judged "gone without choosing" by eye; and `real.mjs --prove` passed 3 of 4 runs on
    the study build, failing once on a first save, cause not found. An unexplained tool save fault
    must never be scored as the app losing work, so preflight item 2 now needs 5 clean runs in a
    row or a traced cause before T19 and T21 run.
  - **Bar 4 lists the three commits tier 2 added** (a tie clicked, its two ends selected, the
    weight's meaning chosen at load), each of which should change the inspector or the drawing.
  - **Bar 5 names the mechanism, not a build.** The build it named is no longer the study build.
  - **Bar 7 (a) runs every algorithm and every meaning.** Running only what the catalog marks as
    reading a weight cannot find a wrong mark, and a wrong mark is the defect that started tier 2
    (PageRank). An unmarked run that changes its answer when the weight column goes away now
    fails.
  - **Bar 9 (b) counts tier 2's words where they appear.** The filter chip and the new inspector
    lines never reach tier 1's at-rest screen, so they were never counted. Its limit is round 1's
    own count (no count of those screens exists to set a number from), never rising after it.
  - **New bar 10: the expert walkthrough and the screenshot audit.** Both run every round, but
    their findings fed no bar, and the session rule ("2 participants or a scripted repro") could
    never confirm an expert finding. They now count, with a script for what can be measured
    (clipped text, raw element strings, rejected glossary words) and two widths, because
    truncation depends on width. Proposed by all three reviews.
  - **New bar 11: the cost of the core four.** Tier 2 is repeat work, and cost is the returning
    persona's stated reason to quit, but every gate measured success only. Steps are behavior.
  - **New measures:** a broken habit (a history-named first move that leads nowhere) counts as a
    finding at 2 sessions; the second time on T17 and T18, a follow-up in the same session, is a
    target in round 1 because its prompts are new and unpiloted; doors are removed only after 8
    sessions had the chance; T22's "select where" decision rule and the treatment of moved
    positions after Replace are fixed now, before any data.
  - **Starts reflect the histories.** Every history ranks, and most size or color by the ranking,
    yet most setups only opened the file, so bar 2 had almost nothing to lose and no session
    could meet a path or a filter on top of a user's own styling. Every start but T4's and T20's
    (both about new files) is now ranked, colored and sized by PageRank, with names where the task
    reads them (`roster.md`, "Where each session starts"). The changed tasks are re-piloted and
    their reference values re-recorded before round 1 (preflight items 3 and 5).
  - **T12R uses the two spare session slots** (56, the cap): tier 1's one-person task, asked of
    Ruth and Jordan, whose histories lean on a person's list of connections, the list tier 2
    changed. Considered and not chosen: tier 1's whole first session (T15), because every
    participant here is returning and none can honestly play a first session.
  - **Stop rules follow the study's launch instructions:** no round cap; a round that makes no
    progress (fewer than 3 more core-four successes of 32, no core-four severity 3 or 4 closed,
    no failing bar newly held) stops the study and is reported. Before, the study stopped after
    round 3 whatever the result, and "no gain" did not say whether success, ease or both had to
    rise.
  - **Round plan:** at most 4 participants alive at once, no step cap, step notes of one or two
    sentences, and a session that ends on a model API error re-run from a new folder with the
    model recorded.
  - **Not changed:** the ease target stays 5.0 (simulated ease is uncalibrated, so only its trend
    is used); no prompt of the original tasks changed (each change would force a re-pilot of both
    halves, and the wording check found no echo that needs one); fixed word limits for the new
    inspector screens were not set, because no count of them exists yet (bar 9 (b) uses round 1's
    count instead).

- **2026-10-08, before round 1: the study build and the answer key.** The study build is frozen
  (first line). The tier 2 pilots' findings were fixed on it, and every task's success path was
  walked on it with `tool/real.mjs` (`pilot/<task>-final/`, `pilot/final.md`); each reached its end
  state. `answers.md` was re-recorded from those screens: the inspector headers ("3 edges
  selected", "2 nodes selected"), the path run (opens on Values, "Path 5 nodes, 4 edges", tree row
  "Shortest path 4 hops", no legend width), the Weight box (None, with the reason, when the loaded
  weight is not read), Higher means (starts on "Not set"), the role "Date or time", the unmatched
  sentence ("names a node missing from the node rows") and the left-out row kept on the source,
  the rule refused while typing and the "=" column list, the Overview's "showing" rows under a
  filter. Deleted as no longer true: "clicking Everything replaces the selection", the Escape
  first step of T24 B, Enter in From staying in From, the bare number accepted until Enter, the
  raw from/to rows of a bus-stops edge, and the wrong numbers 61, 35, 27 and 24. Added: the browser
  save alone counts as kept (T19), the PageRank click before Rerun is optional (T21), screenshot
  numbers depend on step grouping (T23). `tasks.md` T20 lists the new control words it avoids
  ("set", "date", "time"). No prompt changed.
