Frozen on 2026-10-07, before any tier 2 session.

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

| # | Bar | Target | Reason |
|---|---|---|---|
| 1 | Each tier 2 task, success rate | >= 80% (4 of 5, 7 of 8); each dataset half >= 75% (3 of 4). A task run below its full size passes only if every session succeeds (2 of 2 per half) | Tier 1's bar. The per-half floor stops a change that works on one domain only from passing on combined counts. |
| 2 | Earlier work kept | 0 confirmed sessions with `work-lost` or `not-kept`: a run, a style, a note, a filter step or a loaded table gone at the end without the participant choosing to remove it | A returning user's own work is what they came back to. "A refresh that costs as much as the first build" is the returning persona's stated reason to stop (`../personas/returning-nonprofit-analyst.md`). Losing it silently is worse than any slow path. |
| 3 | Confirmed severity-4 problems open | 0 | Tier 1's bar, with the rule above. |
| 4 | Confirmed silent commit on a success path | 0 | Counts commits whose effect belongs on the drawing or the inspector: a filter step added, ticked or unticked; a second table or a replacement loaded; a path found; a note saved; a hop count changed; a rule entered; a run rerun. Silent = before and after screenshots show no change on the canvas, the legend, the header or the inspector. |
| 5 | Numbers seen on a success path that disagree with the drawing or the data | 0 | Includes a count that is not what its label says (the path run's row number on build ca8b3b916c22 is not the route), a filter chip that does not match the dots drawn, and a value from an out-of-date run shown without its out-of-date mark. Tier 1's most repeated trust loss. |
| 6 | Confirmed false "done" | 0 | Tier 1's bar; a returning user who believes a narrowed or stale picture is the whole one reports it. |
| 7 | The loaded weight is read as loaded | (a) A script on the build runs every algorithm the element's catalog marks as reading a weight, on a table loaded with each meaning (closer, farther, capacity, unset): every run reports what it read, and none reads a closer or unset weight as a distance. (b) 0 confirmed sessions where a run read the weight the wrong way round and the screen gave no sign of it | The owner's rule: the weight chosen at load is used by every run. It is required, and a wrong reading gives a confident wrong answer (T20's wrong routes). Part (a) is the build's promise, which no session sample can cover; part (b) is what a reader meets. |
| 8 | Automated accessibility check of the tier 2 screens | axe 0 serious or critical (tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`); no two reachable controls share an accessible name; focus never falls to the page after the actions listed below | Tier 1's bar 8, on the new screens. It is a script, not a keyboard study. |
| 9 | App words on screen at rest | <= 50 | Tier 1's bar 9, on the same screen (Les Miserables loaded, nothing selected, 1440 x 900, counted by `tool/bars.mjs`). Tier 1's last count was 41; tier 2's places (Notes on the rail, the Filters section) must fit inside the same budget. |

**Bar 8, the screens:** Data place with a filter step on and with one off; the step editor; the
header chip; the Path popover with a finished path and its run's Values; the Notes place with two
notes and empty; the Data page with two tables and an unmatched row; the Data page titled
"Replace: ..."; an out-of-date run with its state bar; the neighbor list with Hops and Follow; an
edge's inspector; the find box with a rule hint and with a refused rule. **Focus never drops**
after: adding, ticking and deleting a filter step; Find path; saving a note; Load (two tables and a
replacement); Rerun; Filter to neighbors; Select endpoints; Escape from the Path popover and the
step editor. `tool/bars.mjs` measures tier 1's screens only; it is extended to these before round 1
(preflight item 9), and the bar is "not scored" in any round where it was not.

## Measures reported every round (targets, not gates)

| Measure | Target | Reason |
|---|---|---|
| All tier 2 sessions together | >= 85% | Tier 1's target. |
| Ease (1-7, read from the transcript), mean per task and overall; median beside it | mean >= 5.0; no task mean below 4.0 | Simulated ease is uncalibrated: the trend is the signal. Tier 1 round 3: 5.28. |
| Steps against the success path (successful sessions) | median <= 2x | Shows where success is costly. |
| Wrong turns per session | median <= 1 | A returning user knows the shell; tier 1 round 3's median was 0, its first round's 1. |
| Recovery: sessions with a wrong turn that still succeed | >= 70% | Tier 1's target. |
| First move: whether the session's first action went to a place the participant's history names, and whether that place led anywhere | reported, no target | Measures how far tier 1 habits carry into tier 2, and flags passes that came from the briefing rather than the screen. |
| Door used, per feature with more than one door (Path: P, a node's menu, Analyze; notes: N, "+", a menu's "Add note"; filter: the Filters "+", an attribute's "Filter to...", "Filter to neighbors"; a tie: the canvas, the find box) | reported per round | Remove before adding: a door no session used across a round is a candidate for removal, and a door every session missed is a finding. |
| T22: sessions that typed a rule ("=") in the find box; places looked for a "select by condition" control | reported | The design keeps a separate "select where" dialog until this study shows the need. |
| Script errors, console errors and failed requests the tool prints on any success path | 0 | Each is a bug report. |
| What worked | listed per task | The owner (2026-10-02): "it's hard to tell if it was all failures". |

## Round plan

- **Rounds:** at most 3. Round 1 runs every tier 2 task. Rounds 2 and 3 re-run every task below
  its bar at full size, the core four at full size always, and each task a fix touched at 4 or more
  as a regression check. A task that met its bar and no fix touched is not re-run.
- **The core four:** T20 (the weight, the owner's required rule and the largest known gap), T21
  (rerunning on new data, the reason a weekly analyst returns), T17 (filtering) and T18 (the
  shortest chain), the commonest repeat questions. They decide the stall rule.
- **Size (round 1, 54 sessions):** the studio's cap is 56 a round. The core four at 8 each, 4 and 4
  (32). T4 at 6, 3 and 3 (joining two tables was deferred from tier 1 and is the largest load
  change). T19, T22, T23 and T24 at 4 each, 2 and 2 (16); as in tier 1, a task below full size
  passes bar 1 only if every session succeeds. Allocation: `roster.md`.
- **Persona mix:** every session by a returning persona. At least 60% by personas who did tier 1
  as first-time users (round 1: 36 of 54, 67%); the rest by the regular analysts. No persona takes
  both halves of one task. Every task half has at least two personas and every task at least three.
- **Tier share:** 100% tier 2 sessions. Tier 1 is guarded by script, not sessions: every tier 1
  success path runs on each tier 2 build (preflight item 4), because tier 2 changed places tier 1
  uses (the Data place, the find box, the node menu, the inspector).
- **Browsers:** at most 4 at once, through `tool/with-browser.sh`; the runner keeps at most 4
  participants alive, so none waits for a slot; every session ends with `--end`.
- **Session length:** no step cap. A session ends when the participant says they are done, gives
  up, or keeps repeating without progress (graded G, with the grader saying so).
- **Frozen build:** each round serves one copy of `graphty/dist` (`REAL_DIST`), made after the
  preflight passes, so no rebuild changes the app under a session.

## Before a round may start (preflight)

1. The build under study is the studio worktree's commit, rebuilt, with no uncommitted changes;
   a copy is frozen and served; its commit and build stamp are in every `session.json`.
2. `node tool/real.mjs --prove` prints only `ok`.
3. **Pilot on every new build:** every tier 2 task's success path in `answers.md`, both halves,
   runs on the frozen build as a scripted session and ends on its success state. A path that
   cannot is a deciding build defect, fixed first or named in the round report. A changed screen
   rewrites the path, not the prompt.
4. Every tier 1 success path in `../answers.md` runs on the same build and ends on its success
   state.
5. Every reference value in `answers.md` is re-recorded on that build (the probe and the pilots),
   and every "known on this build" note is checked: kept, reworded or deleted. No value is blank.
6. **Wording check:** the build's visible text and accessible names are dumped on every screen a
   tier 2 success path reaches, and a script lists every word a prompt shares with them, except
   the data's own words; it must catch a planted echo before it is trusted. Each overlap is
   reworded or kept with its reason in `tasks.md`.
7. **History check:** the same script runs over every history in `roster.md`; a history may name
   only places the persona's tier 1 sessions reached, never a tier 2 control.
8. Every setup in `../rounds/tier-2/setups/` runs and its first screenshot is looked at.
9. `tool/bars.mjs` covers bar 8's tier 2 screens and bar 9, and the bar 7 (a) weight script exists
   and passes on a planted wrong reading before it is trusted.
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
- **Round 3 finished**, whatever the result.
- **Stalled:** round 2 shows no gain over round 1 on the core four (success and mean ease). The
  remaining problems are probably beyond simulated participants; go to real users.
- A problem that needs an owner decision that cannot be undone cheaply stops work on that task
  only.

The final report gives what was tested, every bar's result with its denominator, what worked, what
failed and why, each fix with its package and evidence, and the next steps.

## Change log

Empty: no round has run.
