The study runs on build 8f0d5a6f7791 served from `/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/`
(graphty@0.8.61, commit 8f0d5a6f7), with `REAL_DIST=<that folder>` on every `tool/real.mjs` command
(`../tool/README.md`).

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

**A give-up the persona file scripts is labeled, not regraded.** When a participant gives up
because the persona file's own rule says to (a set number of attempts, a time limit, a phrase it
says when it leaves), the grade stays G and every count and bar is scored as before; the grader
writes "scripted exit" beside the grade, quoting the rule with the persona file's path and line
and naming the attempts it counted. A give-up the rule does not cover gets no label. The label
lets the skeptics and the severity judgment see which leaving the persona decided.

## Bars that decide "done" (all must hold in one round)

**How "one round" is scored.** Rounds after the first re-run only some tasks, so a round is
scored on the latest result of every task: a task the round re-ran is scored on that round's
sessions; a task it did not re-run carries its sessions from the last round that ran it, which is
allowed only because no fix touched it (a touched task is always re-run, "Round plan"). Bars 1 to
7 and 11 are scored on those sessions together. Bars 8, 9 and 10 are measured afresh on every
round's frozen build. **A bar that was not scored in a round does not hold in that round**, for
whatever reason; "not scored" is never a pass.

| #   | Bar                                                                       | Target                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Each tier 2 task (and T12R), success rate                                 | >= 80% (7 of 8); each dataset half >= 75% (3 of 4). A task run below its full size of 8 passes only if every session succeeds: T4 at 6 needs 6 of 6 (3 of 3 per half); a task at 4 needs 4 of 4 (2 of 2 per half); T12R at 2 needs 2 of 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Tier 1's bar. The per-half floor stops a change that works on one domain only from passing on combined counts.                                                                                                                                                                                                                                                                                                                                                                           |
| 2   | Earlier work kept                                                         | 0 confirmed sessions with `work-lost` or `not-kept`: a run, a style, a note, a filter step or a loaded table gone at the end without the participant choosing to remove it. Judged from a scripted list of the open work at the start and at the end of every session (runs, style layers, notes, filter steps, sources); graders judge only whether each difference was the participant's choice. A save the tool lost voids the session and is never scored `not-kept`                                                                                                                                                                                                                                                                                                 | A returning user's own work is what they came back to. "A refresh that costs as much as the first build" is the returning persona's stated reason to stop (`../personas/returning-nonprofit-analyst.md`). Losing it silently is worse than any slow path.                                                                                                                                                                                                                                |
| 3   | Confirmed severity-4 problems open                                        | 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Tier 1's bar, with the rule above.                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 4   | Confirmed silent commit on a success path                                 | 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Counts commits whose effect belongs on the drawing or the inspector: a filter step added, ticked or unticked; a second table or a replacement loaded; a path found; a note saved; a hop count changed; a rule entered; a run rerun; a tie clicked on the canvas; a tie's two ends selected; the weight's meaning chosen at load. Silent = before and after screenshots show no change on the canvas, the legend, the header or the inspector.                                            |
| 5   | Numbers seen on a success path that disagree with the drawing or the data | 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Includes a count whose label names something other than what it counts (such as a path run's row number that is not the path's length), a filter chip that does not match the dots drawn, and a value from an out-of-date run shown without its out-of-date mark. Tier 1's most repeated trust loss.                                                                                                                                                                                     |
| 6   | Confirmed false "done"                                                    | 0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Tier 1's bar; a returning user who believes a narrowed or stale picture is the whole one reports it.                                                                                                                                                                                                                                                                                                                                                                                     |
| 7   | The loaded weight is read as loaded                                       | (a) A script on the build runs EVERY algorithm in the element's catalog on the same table loaded with each meaning (closer, farther, capacity, unset) and once without the weight column. Every run reports what it read; each meaning is read in its own sense by every reader or skipped with a code (a closer or unset weight never read as a distance, a farther weight never read as closeness by PageRank or community detection, a capacity never read as a length by a path); and a run that says it read no weight gives the same answer with and without the column. The script fails on a planted wrong reading of each kind before it is trusted. (b) 0 confirmed sessions where a run read the weight the wrong way round and the screen gave no sign of it | The owner's rule: the weight chosen at load is used by every run. It is required, and a wrong reading gives a confident wrong answer (T20's wrong routes). Part (a) is the build's promise, which no session sample can cover; it runs every algorithm, not only those the catalog marks, because a wrong mark is exactly the defect a marked-only check cannot find (PageRank read the weight unlike the other runs in the audit that started tier 2); part (b) is what a reader meets. |
| 8   | Automated accessibility check of the tier 2 screens                       | axe 0 serious or critical (tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`); no two reachable controls share an accessible name; focus never falls to the page after the actions listed below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Tier 1's bar 8, on the new screens. It is a script, not a keyboard study.                                                                                                                                                                                                                                                                                                                                                                                                                |
| 9   | App words on screen at rest                                               | (a) <= 50 on tier 1's screen. (b) On a returning rest screen (friends.csv, one filter step on, one run, two notes, two sources, nothing selected, 1440 x 900), an edge's inspector, a path run's inspector and the neighbor list with Hops and Follow: no count rises above its round 1 count                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Tier 1's bar 9, on the same screen (Les Miserables loaded, nothing selected, 1440 x 900, counted by `tool/bars.mjs`). Tier 1's last count was 41; tier 2's places (Notes on the rail, the Filters section) must fit inside the same budget. Part (b) counts tier 2's words where they appear: the filter chip is drawn only while a step is on, so tier 1's screen never sees it. Its limit is round 1's own count, fixed before any fix, because no count of those screens exists yet.  |
| 10  | Expert walkthrough and screenshot audit                                   | 0 confirmed severity 3 or 4 findings open; the number of confirmed findings of any severity never rises from one round to the next                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Tier 1's sessions missed most of what a real person noticed on first use (clipped names, raw file syntax in the Overview, element strings and a rejected word in the legend). The walkthrough and audit catch that kind of problem each round, and without a bar their findings could never hold a round back.                                                                                                                                                                           |
| 11  | Cost of the core four                                                     | Per task (T20, T21, T17, T18), the median steps of successful sessions <= 2x the success path's steps                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Tier 2 is repeat work, and the returning persona's stated reason to stop is "a refresh that costs as much as the first build". Steps are behavior, which this study trusts; ease ratings are not calibrated.                                                                                                                                                                                                                                                                             |

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

| Measure                                                                                                                                                                                                                              | Target                                                                                                  | Reason                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All tier 2 sessions together                                                                                                                                                                                                         | >= 85%                                                                                                  | Tier 1's target.                                                                                                                                                                                                                                                                                                                                                        |
| Ease (1-7, read from the transcript), mean per task and overall; median beside it                                                                                                                                                    | mean >= 5.0; no task mean below 4.0                                                                     | Simulated ease is uncalibrated: the trend is the signal. Tier 1 round 3: 5.28.                                                                                                                                                                                                                                                                                          |
| Steps against the success path (successful sessions), every task other than the core four (whose cost is bar 11)                                                                                                                     | median <= 2x                                                                                            | Shows where success is costly.                                                                                                                                                                                                                                                                                                                                          |
| Wrong turns per session                                                                                                                                                                                                              | median <= 1                                                                                             | A returning user knows the shell; tier 1 round 3's median was 0, its first round's 1.                                                                                                                                                                                                                                                                                   |
| Recovery: sessions with a wrong turn that still succeed                                                                                                                                                                              | >= 70%                                                                                                  | Tier 1's target.                                                                                                                                                                                                                                                                                                                                                        |
| First move: whether the session's first action went to a place the participant's history names, and whether that place led anywhere                                                                                                  | reported; a dead end counts as below                                                                    | Measures how far tier 1 habits carry into tier 2, and flags passes that came from the briefing rather than the screen.                                                                                                                                                                                                                                                  |
| A broken habit: a first move into a place the participant's history names (the Data place, the find box, a person's list of connections, the analysis button) that offers no way on to the task                                      | each one a wrong turn; the same place in 2 or more sessions of a task is a confirmed severity 3 finding | Tier 2 changed the Data place, the find box, the node menu and the inspector. Preflight item 4 proves by script that tier 1's paths still work, not that a returning user's habit still arrives. A habit that leads nowhere is the returning user's dead end.                                                                                                           |
| The second time: on T17 and T18, each successful session gets one follow-up prompt in the same session (`tasks.md`); steps and wrong turns on the follow-up                                                                          | steps <= the follow-up's success path + 1; 0 wrong turns                                                | Tier 2 is about repeat work, but every task measures the first use. What brings a weekly analyst back is that the second time is cheap. A target, not a gate, in round 1: the follow-up prompts are new and a gate on an unpiloted protocol is how a tier 1 round once scored a check that read nothing.                                                                |
| Door used, per feature with more than one door (Path: P, a node's menu, Analyze; notes: N, "+", a menu's "Add note"; filter: the Filters "+", an attribute's "Filter to...", "Filter to neighbors"; a tie: the canvas, the find box) | reported per round, with how many sessions had the chance to use each door                              | Remove before adding: a door no session used is a candidate for removal only after 8 or more sessions across rounds had the chance to use it (most features run at 2 sessions a half, too few to call a door unused); a door every session missed is a finding.                                                                                                         |
| T22: sessions that typed a rule ("=") in the find box; places looked for a "select by condition" control                                                                                                                             | reported; decides the dialog as below                                                                   | The design keeps a separate "select where" dialog until this study shows the need. Decided now, before the data: if T22 fails its bar, the next round first changes the find box's hint and refusal words. The dialog is reconsidered only if T22 then fails both halves again and 3 or more sessions looked for a select-by-condition control in the same named place. |
| Positions after Replace (T21): nodes in both files whose place on the drawing moved                                                                                                                                                  | reported                                                                                                | Replacing a file lays the drawing out again. No setup or history holds hand-placed positions, so moved dots are not counted under bar 2; they are reported so the cost is visible.                                                                                                                                                                                      |
| Script errors, console errors and failed requests the tool prints on any success path                                                                                                                                                | 0                                                                                                       | Each is a bug report.                                                                                                                                                                                                                                                                                                                                                   |
| What worked                                                                                                                                                                                                                          | listed per task                                                                                         | The owner (2026-10-02): "it's hard to tell if it was all failures".                                                                                                                                                                                                                                                                                                     |

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
- **Round 3 re-runs** (decided 2026-10-09, after round 2). Round 2 credited three new routes and
  the second-time measure while participants could read `tasks.md`, so none of them is credited
  until a round with that leak closed measures it again. Round 3's session list (its `plan.md`)
  must hold, beyond the sizes above:
    - **r2-s05 run again:** T20 A (bus stops), Nadia, empty start, the same prompt, on the round 3
      build. It was voided for reading the avoided-word list and never re-run. It counts in round
      3; round 2's T20 A is reported at 3 graded sessions with the void named.
    - **T20, weight's meaning set at load:** both halves at full size (core four), each session's
      route recorded, so the load-time route is credited on round 3 only.
    - **T21, Replace:** both halves at full size (core four), route recorded likewise.
    - **T22, the find box's rule hint:** both halves at full size (8), with the reworded prompt.
    - **T17 and T18 follow-ups:** every session that finishes the first prompt gets the follow-up
      from the tool (`tool/README.md`), with participants unable to read `tasks.md`; the
      second-time measure is reported on round 3 only.
      Before the build is frozen, each reworded prompt (T22 A, T22 B, T24 A, T24 B) is piloted in two
      throwaway sessions on the round 3 candidate build, with the leak closed, and the routes they take
      are walked in the dry run.
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
- **2026-10-08, before round 1: the round 1 build.** The study build moved from e2ccec0e9304
  (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-e2ccec0e9/`) to 16dcf3494700
  (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1-16dcf3494/`), a fresh build of the worktree's current commit, so round 1 runs on what the worktree
  holds now. No bar changed.
- **2026-10-08, before round 1: the answer key matched to the round 1 pilots.** Every task half was
  piloted on 16dcf3494700 from its ranked start (`rounds/r1/pilot/`). Every reference value held;
  `answers.md` was changed only where a screen differed, each with the pilot's screenshot: a
  section on the round 1 build and on two tool faults (a click timeout, a stale printed tooltip);
  T4's Sources row is on the Data page, cut to "12 no..." with a name-only tooltip, so the left-out
  row is readable after Load only in the source's inspector; T17 A's step name is cut while on;
  T18's Made with adds Source and Target lines, Enter in To focuses Find path, a clicked option
  leaves focus in From, the path's node color is lost in the PageRank colors, a second run
  replaces the first, and B's follow-up chain is added; T19's header wording, the framing that
  lasts until the reopen, the blank drawing under the Save dialog, the PageRank count missing
  after the reopen (not `work-lost`), and B's ambiguous reopen click; T20's role box moved to
  728,225 (both halves), the Data page names no weight on either route, the Made with Weight
  select counts as Made with, and B loads directed; T21 B's new people stay uncolored until
  Rerun; T22's A column list, a cleared box after a rule and a refused rule's Enter doing nothing;
  T23's framing note was deleted (the drawing stays on the canvas), the Hops 1 table is A only,
  and the filter marks PageRank out of date; T24 B's click point is 753,258 on the ranked start,
  and the find box lists ties by value, not by an end's name; a T12R section records the 5-step
  path, the Summary heading and the Neighborhood view the Degree row opens. `tasks.md` T12R says
  Follow appears only on directed data. No bar and no prompt changed.
- **2026-10-08, before round 1: the dry run build.** The study build moved from 16dcf3494700
  (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1-16dcf3494/`) to 3dfe7daf9e45
  (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d1-3dfe7daf9/`), a fresh build of
  the worktree's current commit, which holds the fixes found walking the tasks before round 1 (the
  drawing kept where it is after a run, a find pick and with a dialog open; the tool printing only
  the hovered tooltip and the reason a click failed). `tool/real.mjs --prove` passed on it. No bar
  changed.
- **2026-10-08, before round 1: the answer key matched to the pilots on build 3dfe7daf9e45.**
  Every task half but T21 A was piloted again on the study build from its start
  (`rounds/r1d1/pilot/`). Every success path landed on the first try with no script errors,
  console errors or failed requests, and every reference value held. `answers.md` was changed only
  where a screen differed, each with the pilot's screenshot: a section on this build (blue
  selection bands, Made with's From and To, a clicked From option moving focus to To); T4's
  Sources row now shows the counts in full and a "1 row left out" row under the source, with a
  longer tooltip and an inspector line "Line 24: from p11, to p13, emails 6", the "1 row left out"
  row opening the same inspector, the project named after both files ("people and messages",
  "players and passes"), and the green check on the edge table before Load; T17's Filters row
  shows the full step name with no count and no word "off", the follow-up values were added (A
  10 of 20 nodes, 5 of 41 edges; B 17 of 77 nodes, 19 of 254 edges), with the edit of an off step
  that stays off, and A's overlapping dots; T18's "Not read" wording, Made with's rows and order
  with no Weight select and an empty Method select, the path's indigo color replacing the note on
  orange nodes, Escape in the Weight list closing the popover, the overlaps on both drawings and
  the new screenshot numbers; T19's three watch notes deleted (framing, the drawing under the Save
  dialog, the PageRank count after the reopen) and replaced by the smaller reopen framing, the
  "Add note" tooltip over a saved note, focus on the Degree row and B's two "Florentine families"
  entries; T20's Higher means wording and its fourth choice "Capacity" (not walked, graded by the
  end state), the summary changing at once, Made with as plain rows (pointing to the Path
  popover's Weight box before the run also counts, since Made with has no select), and the total
  with no unit; T21 B's post-Rerun screen, the stale Top 10 at full contrast and the menu opening
  on "Edit source..."; T22's blue bands, the rule and its hint staying after Enter, the help and
  refusal examples taken from the data's own column; T23's Hops 1 header, Selection 7 at Hops 1,
  the drawing not moving, the new out-of-date tooltip, the filter button's pressed state, B's
  Hops 2 order and the setup's leftover hover; T24's blue band, B's click point moved from
  753,258 (now empty canvas) to 752,170, the find box now listing a stop's ties and finding a tie
  by its title, and A's hidden label; T12R's build, the Neighborhood header, "Back to <name>",
  Results as its own section, focus on the Degree row, the find box's list of ties (graded SD as
  tier 1 grades neighbors read from the ties) and B's setup ending on the PageRank inspector.
  `tasks.md` T20 records the "longer trail" line as a possible echo of prompt B. No bar and no
  prompt changed.
- **2026-10-08, before round 1: the second dry run build.** The study build moved from
  3dfe7daf9e45 (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d1-3dfe7daf9/`) to
  909b19b578d4 (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d2-909b19b57/`), a
  fresh build of the worktree's current commit, which holds the fixes found in the first dry run
  (a neighborhood shown as a node's connections, a find rule saying what it selected, selected
  edges listed, filter steps showing on and off, truthful import checks, focus on the inspector
  title after a run or a find pick, one Escape closing only an open list, a saved note taking
  focus with no tooltip over it, a shortest path saying which method it used, and setups handing
  over with the pointer off the page). `tool/real.mjs --prove` passed on it. No bar changed.
- **2026-10-08, before round 1: the answer key matched to the second dry run.** Every task half,
  T21 A included, was piloted on 909b19b578d4 from its start (`rounds/r1d2/pilot/`). Every success
  path landed on the first try with no script errors, console errors or failed requests, and every
  reference value held. `answers.md` now cites `rounds/r1d2/` and gives this build's screens where
  they differ: a section on the build (focus on the inspector title after a find pick or a run,
  run times shown, the path drawn black under one legend entry "On the path", and the sessions'
  "commit" field naming the worktree, not the build); T4's warning triangle before Load (the green
  check note deleted), the source row's cut counts, the gray "1 row left out" row, its own smaller
  inspector, and the left-out line "Line 24: p13 has no node row; from ..." cut on screen; T17's
  Filters row count ("20 to 19 nodes") as a third place to read the count, its "off" line, and
  Save step on an off step now turning it on, so the follow-up's trap is ticking the box after
  Save (which turns the step off); T18's Weight and Method wording, Escape closing only the open
  list, the black path and its legend, and the follow-up runs told apart by time; T19's focus on
  the inspector title and on the saved note's card, the new screenshot numbers, B's smaller
  reframing and the unchanged "Local only" label; T20's role box moving to about 712,287 once
  Weight is chosen, the interim "Weight: minutes" summary and the Overview off screen after the
  run; T21 A's own screens, run times that change on Rerun, the menu opening with no item
  highlighted, and the reset button under the pointer after Load; T22's result line under the box,
  the "Selected edges" table, Escape in the Selection actions menu clearing the selection, "/"
  not reaching the box from a layer row, and the Selection layer's gold color; T23's
  "<name>'s <n> connections" header (and its misreading at Hops 2), alphabetical lists, the
  chip's tooltip and the Filters list as the way back, and Pucci removed from B's left-out list
  (the sample has 15 families); T24's drawn "Hana" label, yellow rings and B's screenshot numbers;
  T12R's "Nodes" and "Edges" headings, focus on the title (a Tab to Degree), the "connections"
  heading above the Hops switch, the outlined filter button, and the find list showing 6 of
  Javert's 17 ties with no sign of more. `tasks.md`: setup files are passed by absolute path,
  because `real.mjs` reads a relative path from the folder the command runs in. No bar and no
  prompt changed.
- **2026-10-08, before round 1: the third dry run build.** The study build moved from
  909b19b578d4 (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d2-909b19b57/`) to
  8c4eef4722ac (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d3-8c4eef472/`), a
  fresh build of the worktree's current commit, which holds the fixes found in the third dry run
  (`dry-run-r1-3.md`). `tool/real.mjs --prove` passed on it. No bar changed.
- **2026-10-08, before round 1: the answer key matched to the third dry run.** Every task half was
  piloted on 8c4eef4722ac from its start (`rounds/r1d3/pilot/`). Every success path landed on the
  first try with no script errors, console errors or failed requests, and every reference value
  held. `answers.md` now names this build, cites `rounds/r1d3/` and gives this build's screens
  where they differ: a section on the build (focus on the inspector title drawn as underlined text,
  no focus mark seen after Rerun, run times as times of day); T4's source row in full with no
  tooltip, the "1 row left out" row with its warning triangle, its inspector subtitled "Left out
  of ..." with the same Added block as the source's, the left-out line wrapped in full, only the
  source row highlighted, the "Leave out" tooltip, the import texts at body size, and watch items
  for the Added heading over the left-out row, the unlabeled "+" and the weight line; T17's "Save
  and turn on" button in place of "Save step", the checkbox tooltip "Turn this step on", the trap
  expected to catch fewer people, all 5 ties visible at 5 or more, and the legend's whole-graph
  range; T18's path icon and highlighted tree row, the overlap at the path's start (Chloe over
  Farah), a clicked To option moving focus to Find path, Advanced staying open once opened, A's
  follow-up chain (Ben, Theo, Ravi, Pia, Nora) and the chain running against drawn arrows; T19's
  two-line Recent projects row with the date, the reopen framing measured again, newest note first
  and the selection halo over two nodes; T20's role box at 728,203 (728,225 is the type caption),
  Higher means appearing below the role boxes so they do not move, and Escape on the import page
  dropping the whole import; T21's blue new people, A's drawing keeping its shape, the reset
  button's tooltip opening only when the pointer moves, and the on-screen PageRank values; T22's
  menu opening on "Path between...", Escape in the menu closing only the menu, Escape elsewhere
  clearing the selection, Control+Z undoing a style change instead, "/" reaching the find box from
  a layer row, the Selection layer's blue edge color, four places to read the count, and the line
  under the box going with Escape; T23's "within 2 hops" header, the filter button's tooltip (and
  its way back), the chip's new tooltip and the full Filters name, focus on the Hops segment, and
  the button tooltip covering two names; T24's "Edge actions" tooltip, the Hana label hiding the
  tie's end, B's Stadium label in full and the new screenshot numbers; T12R's counted find-list
  headings and scrollbar (17 read from "Edges 17" is the right count), focus drawn as underlined
  text, both halves showing two lit controls in the Neighborhood view, and the header's changed
  icon. No bar and no prompt changed.
- **2026-10-08, before round 1: the fourth dry run build.** The study build moved from
  8c4eef4722ac (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d3-8c4eef472/`) to
  946256efb876 (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/`), a
  fresh build of the worktree's current commit, which holds the fixes found in the fourth dry run.
  `tool/real.mjs --prove` passed on it. No bar changed.
- **2026-10-08, before round 1: the answer key matched to the fourth dry run.** Every task half but
  T18 B was piloted on 946256efb876 from its start (`rounds/r1d4/pilot/`). Every success path
  landed on the first try with no script errors, console errors or failed requests, and every
  reference value held. `answers.md` now names this build, cites `rounds/r1d4/` and gives this
  build's screens where they differ: a section on the build (no visible focus mark after a find
  pick, after "Back to <name>" or after Rerun, though focus is in the inspector; the "Selection
  cleared" and "Undid ..." toasts, which fade; tooltips that open only once the pointer enters a
  control); T4's inspectors with a "Left out" section of their own (first in the "1 row left
  out" inspector, second in the source's, subtitled "Source"), the header reading "Untitled" until
  Load, B's file names in the success path, the Add / Leave out choice shown only by an outline
  and the "+" menu's three items; T17's 10 dots at 5 or more on A, B's overlapping pair (a dot
  count one short), A's Attributes list also missing PageRank, the checkbox tooltip opening only
  after the pointer re-enters, "Save and turn on" enabled before an edit and the row's leftover
  background; T18 A's To list covering the Follow row and the popover closing on Find path; T19's
  reopen framing (unchanged on A, still shifted on B), Farah as the larger node behind a smaller
  one, the graph header's "1 note" counting only the graph's notes, landing on the Graph place and
  the Escape toast; T20's new "Farther" line ("such as a longer distance or travel time"), the
  "Reset minutes to default" button, A loading directed with Follow and Advanced run settings in
  Made with, the role list covering its own box, Load moving to the page's bottom, and A's missing
  arrowhead; T21's footer with no "0 node rows", the Direction select, B's "Weight: weight auto"
  line, the hidden "..." on the source row, B's post-Rerun screen number and the new people's
  places given without coordinates (the layout is unseeded); T22's menu reachable by "Selection
  actions" and opening with no item drawn highlighted, the Escape toast with the rule left in the
  box, and the Control+Z toast; T23's filter-button tooltip opening to the left and covering no
  name (the "2 short" trap deleted), the chip tooltip closing on the click, the selection drawn as
  a halo and tinted fill, and the legend's whole-graph range; T24's Summary heading, A's swatch,
  the Selection count as the left panel's row, and the menu covering From; T12R's focus with no
  mark, the second lit control in the Neighborhood view traced to the resting pointer, the filter
  tooltip no longer hiding a name, the screen reader reading each Hops segment twice, and the end
  of Javert's find list. `tasks.md` T20 now records the new line ("longer", "distance", "time") as
  the possible echo. No bar and no prompt changed.
- **2026-10-09, between rounds 1 and 2: grading wording and the answer key's new routes.** "Grades"
  now says how a give-up the persona file scripts is graded: still G, every count and bar as
  before, with "scripted exit" written beside the grade and the rule quoted (in round 1, two of the
  three give-ups followed one persona file's two-attempt rule, and nothing on the grade said so).
  `answers.md` adds a "Round 2 route" to T20 (the start screen's "Open project or file..." through
  the Data page, 10 steps), T21 (the source inspector's "..." menu, 7 steps) and T22 (the find box's
  hint to a rule, 4 steps), counted from the steps on 946256efb876 and the changes as specified;
  none is built yet, so the round 2 pilot walks each and corrects it before any session. It also
  records the walk of T18 B on 946256efb876 (`rounds/r1d4/pilot/T18B/`), which agrees with every
  value in the key. Bar 11 and the steps measure keep the success paths' counts (T18 4, T20 11,
  T21 6, T22 3). No bar, floor, step limit or prompt changed.
- **2026-10-09, before round 2: the round 2 build.** The study build moved from 946256efb876
  (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r1d4-946256efb/`) to ddf8b3b63039
  (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2-ddf8b3b63/`), a fresh build of
  the worktree's current commit, which holds the round 2 changes (among them the source
  inspector's "..." menu, the find box's answer to a condition typed without "=", and a data file
  opened from the start screen going to the Data page instead of loading at once).
  `tool/real.mjs --prove` was matched to that change (a dropped file is checked on the Data page;
  an uploaded file is loaded with Load before the checks that need the graph) and passes every
  check on this build. No bar changed.
- **2026-10-09, before round 2: the answer key matched to the pilots on ddf8b3b63039.** Every task
  half but T12R was piloted on the round 2 build from its start (`rounds/r2/pilot/`), and the
  three round 2 routes were walked. Every success path and route landed on the first try with no
  script errors, console errors or failed requests, and every reference value held. `answers.md`
  now names this build and gives its screens where they differ: a section on the build (the
  drawing's key marked "out of date" under a filter or after a replacement, with the old range
  still shown; a "Summary" heading on a run's Values; a selected node marked by its halo only; no
  focus mark after Find path, Rerun or Save); the round 2 routes as walked (T20 10 steps, with
  "Higher means" asked only once the column is a Weight and B's Load moving 52 px; T21 8 steps,
  not 7, because a replacement made from the source's inspector returns to the Graph inspector and
  PageRank must be clicked before Rerun; T22 4 steps, the hint's example already starting with
  "="); T4's unmatched-row view, the Add tooltip, the left-out row's white text, the "Open as a new
  graph" title, "CSV auto" and the tooltip over "Each row is"; T17's legend wording, no count
  before "Add step", the row's hover background and the tool's step name in `work.json`; T18's
  new Weight line ("Each edge counts as 1. weight's meaning is not set.") and the overlap at the
  path's start; T19's start screen, the "Opened" toast on both halves, n switching to the Notes
  place and no focus mark after Save; T20's "Total minutes" / "Total km" (the unit is now shown),
  the result key on the canvas, and no way back to the graph's Overview after a run; T21's
  "Replace" button, the "Weight: weight auto" and Higher means lines on both halves, the bottom
  table drawer, the "Added" heading after a replacement, the bare x reset and the old file listed
  as gone in `work.json` (not lost work); T22's Escape with no notice on B and the box keeping
  the last typed text; T23's find list, the chip's icon and name, and the tooltip now opening on
  A; T24's halos with no change of fill, the menu's bare shortcut letters and a miss after Select
  endpoints clearing the selection. T12R is marked not yet walked on this build: its pilot never
  got a browser, because `tool/with-browser.sh` does not pass `real.mjs --start` through while
  `--start` takes its own slot, so a wrapped start holds one slot and waits for a second. No bar,
  floor, step limit or prompt changed; bar 11 keeps the success paths' counts.

- **2026-10-09, before round 2: the round 2 dry run build.** The study build moved from
  ddf8b3b63039 (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2-ddf8b3b63/`) to
  fabc16247403 (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d1-fabc16247/`), a
  fresh build of graphty-element, compact-mantine and the graphty app with the Sentry variables
  unset. It carries the fixes made since the round 2 build: the key, weight note, source and
  neighbor headings saying only what is true; the graph opening from its title, the open step
  marked and no reset offered at a default; the Data page's footer kept in place with the file
  format given its own place; the reader's own rule in the find box's number hints; a recent
  project's date written as a note's, on one line; and compact-mantine filling the chosen segment
  with one cursor on every control. It exists so a dry run can find what still breaks before
  participants meet it. No bar, floor, step limit or prompt changed.

- **2026-10-09, before round 2: the answer key matched to the dry run on fabc16247403.** Every
  task half but T21 B was piloted on the dry run build from its start, T12R A and B included
  (`rounds/r2d1/pilot/`); T21 B never got a browser, because all four machine-wide browser slots
  stayed taken for more than 5 minutes, and its entry stays on ddf8b3b63039 until it is walked.
  Every success path walked landed on the first try with no script errors, console errors or
  failed requests, every reference value held, and no participant would meet an implementation
  fault on those paths. `answers.md` now names this build and gives its screens where they differ:
  under a filter the drawing's key reads "PageRank on 20 nodes" instead of "out of date" (T17,
  T23; a replacement not yet rerun still reads "out of date", T21); a chosen segment is a white
  fill, not an outline (T4 Add / Leave out, T12R and T23 Hops); the neighborhood heading reads
  "<name> and <n> connections" (T12R, T23); a source's inspector heads its counts "Loaded", not
  "Added" (T4); "CSV auto" moved under "File settings" (T4); a filter step's row looks selected
  while its editor is open (T17); the graph's title in the left panel brings the Overview back
  after a run (T20, so "Loaded weight" is a right place to point after the run); B's Load no longer
  moves (T20); no reset x at a default (T21); the find box's hint and bare-number refusal quote
  the participant's own condition (T22, so the old "> `16`" trap on B is gone from that route);
  T18's new Weight line ("A path needs a distance, and "weight" has no meaning set."); T19's
  one-line Recent projects date, nodes moving on reopen, Undo grayed after reopen, and the bare
  "Florentine families" click now refused as ambiguous; T18 B's earlier-walk text corrected to the
  Peruzzi-Bischeri tie through Castellani; T22's same-set Enter showing no count and B's Escape
  toast; T23's reopened neighbor list at Hops 1 with the filter button unpressed; T24 B's menu and
  the tie's band gone after Select endpoints; and `work.json` naming the run "Influence" and
  cutting a step's rule short. No bar, floor, step limit or prompt changed; bar 11 keeps the
  success paths' counts.

- **2026-10-09, before round 2: the second round 2 dry run build.** The study build moved from
  fabc16247403 (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d1-fabc16247/`) to
  d5a3bee20b61 (`design/ui/studio/tmp/study-builds/tier2-r2d2-d5a3bee20/` in the studio worktree,
  write-protected), a fresh build of graphty-element, compact-mantine and the graphty app with the
  Sentry variables unset. It carries the fixes the second dry run on fabc16247403 asked for
  (`dry-run-r2-2.md`): Add and Leave out staying in place, the left-out row's inspector holding only
  that row, inspector notes at the rows' size and indent, the selection telling the app when only
  its rule changes and offering only a rewrite that parses, the find box's refusal lined up with its
  hint, a cut section title shown whole on hover, the neighbor list named once with one filter per
  node at any reach, and the study tool drawing scrollbars and recording whole rules and the runs'
  screen names. Every task half was piloted on it, T21B included (`dry-run-r2-3.md`). No bar,
  floor, step limit or prompt changed.

- **2026-10-09, before round 2: the round 2 study build.** The study build moved from
  d5a3bee20b61 (`design/ui/studio/tmp/study-builds/tier2-r2d2-d5a3bee20/` in the studio worktree)
  to eaea2a75d95b (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d2-eaea2a75d/`, write-protected), a fresh build of graphty-element, compact-mantine and the
  graphty app with the Sentry variables unset. The app and element source is the same as
  d5a3bee20b61; only design documents changed between the two commits, so the dry run on
  d5a3bee20b61 (`dry-run-r2-3.md`) holds for this build. No bar, floor, step limit or prompt
  changed.

- **2026-10-09, before round 2: the answer key matched to the pilots on eaea2a75d95b.** Every task
  half was piloted on the round 2 study build from its start (`rounds/r2d2/pilot/`; T4 B, T17 B and
  T22 A in folders named `<task><half>-eaea2a75d/`, because their own folders held earlier walks).
  Every success path landed on the first try with no script errors, console errors or failed
  requests, every reference value held, and nothing was lost. `answers.md` now names this build,
  gives a section on it, and corrects what the key still said about fabc16247403: T4's "1 row left
  out" inspector holds only "Left out" (the note about misreading its counts deleted), Add and
  Leave out no longer move, the preview's scrollbar is drawn (with "File settings" shifting 15 px),
  Add sits in a gray track, the "+" menu covers the role control, and Load is enabled with one
  file and no edges; T17's legend wording and `work.json`'s whole rules and screen names; T18's
  weight note at row size, the hand pointer over a node and B's suggestion lists covering labels;
  T19's reopen framing citations, the ambiguous sample click on this build and no focus mark after
  Find; T20 A's preview caption cutting rows and its result headings; T21's menu covering the
  key's minimum; T22's red refusal aligned with the gray lines, the same-set Enter showing its
  count (that note deleted) and B's Escape with no toast; T23's tooltip on the cut heading, the
  reopened list at Hops 1 with the button pressed for the 2-hop filter, and A's merged halos;
  T24's menu opening with "Select endpoints" filled and B's Values label; and setup clicks that
  time out under load, which may or may not have landed, so a session's first screenshot is
  checked against its start. Citations of d5a3bee20b61 walks whose folders now hold this build's
  walks point at their `-old-build-d5a3bee/` folders. No bar, floor, step limit or prompt changed.

- **2026-10-09, before round 2: the third round 2 dry run build.** The study build moved from
  eaea2a75d95b (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d2-eaea2a75d/`) to
  2dcea6dd5bba (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d3-2dcea6dd5/`,
  write-protected), a fresh build of graphty-element, compact-mantine and the graphty app with the
  Sentry variables unset. It holds the fixes found in the second dry run (the neighbor list opening
  at the reach of the filter that is on with its heading wrapped, "All N rows" for a whole-table
  import preview, the Add a table tooltip opening to the left, a click-opened menu highlighting no
  row, a section name shown whole in the shared tooltip) and master's element changes merged since
  (a disposed graph's WebGL context released, the AI provider catalog, the spring-electrical
  layout's maxIter). No bar, floor, step limit or prompt changed.

- **2026-10-09, before round 2: the answer key matched to the pilots on 2dcea6dd5bba.** Every task
  half was piloted on the round 2 study build from its start (`rounds/r2d3/pilot/`). Every success
  path landed on the first try with no script errors, console errors or failed requests, every
  reference value held, and nothing was lost: participants meet no implementation fault on the
  key's routes. `answers.md` now names this build, gives a section on it, and corrects what the key
  still said about eaea2a75d95b: a whole-table import preview captioned "All N rows" (T4, T20, the
  Replace page of T21) with rows still cut off below the pane; the "Add a table" tooltip opening
  to the left of the "+" and covering nothing; the summary line's row counts being link-blue
  buttons that switch the table shown and close the unmatched-row view (T4, T20); the "1 row left
  out" inspector's plain document icon (T4); the Overview after "Save and turn on" and the step
  checkbox's tooltip appearing only after the pointer moves away and back (T17); the Ravi-Pia path
  tie drawn through Quinn on A's follow-up (T18); this build's reopen framing citations (T19); T20's
  "Each row is" row, the role boxes' and Higher means' coordinates, A's status line and a picked
  endpoint left unmarked on the drawing; "Measure ran" as PageRank's subtitle (T21); B's toast on
  Escape clearing the selection (T22); the Hops 2 heading wrapped with no tooltip and the reopened
  list at Hops 2 matching the pressed filter button, so the Hops 1 trap note no longer applies
  (T23 B); and the Edge actions menu opening with no item filled, a click on a drawn name doing
  nothing, the find box's title result without the minutes, and a visible click point on B's line
  (T24). No bar, floor, step limit or prompt changed.

- **2026-10-09, before round 2: the fourth round 2 dry run build.** The study build moved from
  2dcea6dd5bba (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d3-2dcea6dd5/`) to
  8f0d5a6f7791 (`/home/apowers/Projects/graphty-monorepo/.study-builds/tier2-r2d4-8f0d5a6f7/`,
  write-protected), a fresh build of graphty-element, compact-mantine and the graphty app with the
  Sentry variables unset. It holds the fixes found in the fourth dry run (the source inspector
  headed with its Sources row's own icon, the run inspector's Advanced toggle and histogram
  summary lined up, the find option that Enter picks marked, quoted rules set in monospace) and the
  element changes since, with master's merged in (an element option letting a click on a node's
  label pick it, the run scope's data digest renamed dataDigest, size refusals with E_TOO_LARGE for
  n x n layouts and algorithms, the WebLLM provider built inside enableAiControl, a click timed by
  its events). No bar, floor, step limit or prompt changed.

- **2026-10-09, before round 2: the answer key re-recorded on 8f0d5a6f7791.** Every task half was
  piloted on the study build from its start (`rounds/r2d4/pilot/`). Every success path but T12R's
  landed on the first try with no script errors, console errors or failed requests, every
  reference value held, and nothing was lost. `answers.md` now names this build, gives a section
  on it, and corrects what it still said about 2dcea6dd5bba: T12R's path is 4 steps, because the
  find list now marks its first result and the old path's Down arrow and Enter open the person's
  first tie, and focus stays in the find box after a tie is picked (T12R); the "1 row left out"
  inspector is headed by the warning triangle of its Sources row (T4); a click on a drawn name
  selects the stop (T24 B); PageRank's Values tab heads its first section "Values" (T21). It also
  records screens the key did not describe: the "Add a table" menu covering the Nodes row's check
  mark (T4), B's starting PageRank key and the path drawn black over it (T18), focus lost after
  Escape on the note editor's Cancel (T19), the title click's Overview and the route edge with no
  arrowhead (T20 A), which overlapping node is Creek and which Summit (T20 B), the marked first
  column under a lone "=", the Everything row left selected and the uneven node sizes after
  undoing Size on PageRank (T22), the eye icon on the PageRank row (T23 A), and B's key range and
  find headings (T24); this build's citations for T17 and T19 and the start screen's entries
  still present (T19). T12R is not in bar 11, so no bar, floor, step limit or prompt changed.

- **2026-10-09, before round 3: T22 and T24 prompts reworded, and the round 3 re-runs.** Rounds 1
  and 2 asked participants to make the matching ties (T22) or a tie's two ends (T24) "stand out".
  That invited a lasting style: in round 2, 5 of 8 T22 and 4 of 4 T24 participants styled a
  selection, a detour neither task measures, and it produced the "a selection does not last"
  finding the skeptics weakened. Each prompt's sentence now asks to "point out on the drawing"
  which ones, with no word for how (not "show", a View menu word). T22's sentence before it also
  said "where" (avoided: the find list's "Select where ..."), and now says "how ... lie across".
  Checked: `real.mjs --brief` writes each half's briefing with no facilitator words, and a script
  finds none of the task's avoided words, "stand out" or "show" in any of the four prompts (it
  catches a planted "stand out" and "where"). The answer key is unchanged: T22 credits a selection
  or a color that marks exactly the matching ties, T24 only the two ends selected. T22 and T24 are
  compared with round 2 on the grade and the count only, not on steps. The re-run list is under
  "Round plan". Still to do before the freeze: two pilot sessions per reworded half on the round 3
  candidate build, which is not built yet. No bar, floor or step limit changed.

- **2026-10-09, before round 3: the find list's axe `scrollable-region-focusable` is an accepted
  exception on bar 8, and the extra-small checkbox's target-size failure is fixed.** Round 2's
  bar 8 run failed two things. (1) The filter step's checkbox was a 12 x 12 px target with 12 px
  of clear space (axe `target-size`, serious). compact-mantine's extra-small Checkbox now takes
  clicks over 24 x 24 px while its drawn box stays 12 px, pixel for pixel the same as on
  8f0d5a6f7791; on a local build of the studio worktree (95674c6d6f66) `tool/bars.mjs` reports 0
  violations on "Data place with a filter step on" and "... off"
  (`tmp/t2r2-10/bars.log`). (2) The find results' scroll area is not in the Tab order (axe
  `scrollable-region-focusable`, serious, `.ws-find-viewport`). The list is the popup of an ARIA
  combobox: focus stays in the text box and the arrow keys move through the rows. Scripted first
  (Les Miserables, "e" typed, ArrowDown to the last row): on 8f0d5a6f7791 the marked row moved
  below the list's edge and the list did not scroll, so a keyboard user could not see the row
  Enter would pick (`tmp/t2r2-10/find/04.png`). Fixed in the app's find box: the row the arrows
  reach scrolls into view, with its group's heading when it is the group's first row. On
  95674c6d6f66 ArrowDown reaches the last row, "Select where name is Mlle Baptistine", in view,
  and ArrowUp returns to the first with the "Nodes" heading in view
  (`tmp/t2r2-10/find2/04.png`, `05.png`). Every row is therefore reachable and seen by keyboard
  with no second Tab stop, which is the combobox pattern, so this one rule on this one element no
  longer fails bar 8; `bars.mjs` still prints it, and the round report counts it as this
  exception. Any other element with the rule still fails. No other bar, floor or step limit
  changed.
