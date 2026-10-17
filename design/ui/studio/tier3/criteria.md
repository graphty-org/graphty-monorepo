The study runs on build (none frozen yet) served from (none frozen yet)

# Success criteria and round plan: first use and styling (tier 3)

Not frozen yet. The criteria reviewers read this file once before any session; the Design
Director then freezes it ("Frozen on <date> for the tier 3 rounds", under the build line). After
that a bar changes only between rounds, with the change and its reason in the change log at the
end, and nothing here changes after a round's first session starts.

**What is studied.** A person's first use of the graphty app (`/?next`) and their first styling,
on the combined Style panel: the layer tree; a layer's Style area with its Node and Edge tabs; at
the top of each tab, the collapsible picker of which nodes or edges the layer paints, built from
typed condition cards (number range, category values, text contains or starts with, yes/no, has
or has no value), combined with AND; the property lines below it; and the same tabs, picker and
fields when a folder or several layers are selected, where a field whose layers differ shows the
purple "Layer" token and a card held by some layers says "1 of 2 layers". The app is a local
production build of the studio worktree, driven by `../tool/real.mjs`. Tasks: `tasks.md`. Answer
key (graders only): `answers.md`. Participants: `roster.md`.

**Who the participants are.** Simulated: one model playing composite personas, every one of them a
first-time user of graphty, every session from the empty start screen. A failure is strong
evidence; a pass is weak until real people confirm it. Every report says so.

**What the study must answer, beyond the bars:**

1. Can a newcomer get from the empty start screen to a styled drawing, and how long does it take
   (bar 4)?
2. Do the typed condition cards let a newcomer pick nodes or ties by data, with each card type
   (text, category, yes/no, has no value, number), without being told how (bar 1 on T38, T40-T42,
   T45, T50)?
3. When a folder or several layers are selected, do readers read the purple "Layer" token as "each
   layer keeps its own" and leave it alone when they mean to (T47), and does adding a card to
   several layers at once read as consistent with one layer's picker (T48)? Graders record every
   touch of the token, and whether the reader opened the picker on the folder or on one layer.
4. How does a newcomer reverse a change (T49): the arrow, Control+Z, typing the old value back,
   or removing a layer?
5. Can a newcomer find what a layer someone else made applies to, and why (T50)?

## Grades

As `answers.md`, "How a session is graded": S, SD, F, G, VOID; success = S + SD; graded from the
last screenshot, the saved and downloaded files, the transcript and the scripted style tree
(`styles-start.json`, `styles.json`, `styles-steps.jsonl`), never from the participant's own
rating. Every `grade.md` starts with the three lines `Grade:`, `False done:` and `Wrong turns:`,
which `../tool/score.mjs` reads. Severity 0-4 (Nielsen). Confirmed = two or more participants, or
one participant plus a scripted repro (a `real.mjs` walk under the round's `repro/`) for a build
defect. A severity 4 needs a wrong conclusion a reader would act on, a task that cannot be done, or
a participant who leaves. Graders are never told the outcome to look for. A give-up the persona
file scripts is labeled "scripted exit", not regraded. A tool refusal (a click the tool could not
resolve, a pointer step refused in keyboard-only mode) is a tool event, not reader confusion.

**Not scored as new findings:** a new label drawn too small at the default framing, and the
default label font naming no fallback. Both are open owner decisions (`../owner-decisions.md`);
graders record them as known.

**Priming.** A first move is called "unprompted" only after the prompt, the persona's playing
rules and the briefing (`real.mjs --brief` output) have all been read for the words that lead to
it. Findings from Alex (knows Gephi) and Maren (knows Cytoscape) are reported with who they are and
never stand in for the newcomers.

## Bars that decide "done" (all must hold in one round)

A round is scored on the latest result of every task: a task the round re-ran is scored on that
round's sessions; a task it did not re-run carries its sessions from the last round that ran it,
allowed only when no fix touched it. Bars 6, 7 and 8 are measured afresh on every round's frozen
build. A bar not scored in a round does not hold in that round.

| #   | Bar                            | Target                                                                                                                                                                                                                                                                            | Scored by                                                              |
| --- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Task success                   | Each task run at 4 or more sessions: at least 80% S or SD, and each dataset half at least 2 of 3 (so 3 of 3 at 3 per half, 2 of 2 at 2 per half). A task at fewer than 4 sessions is reported, not judged                                                                         | `../tool/score.mjs`                                                    |
| 2   | False "done"                   | 0 sessions where the participant said done while the last screen or the style tree showed otherwise                                                                                                                                                                               | `../tool/score.mjs` (from the graders' `False done:` line)             |
| 3   | Wrong turns                    | Each task's median wrong turns at most 2                                                                                                                                                                                                                                          | `../tool/score.mjs` (from the graders' `Wrong turns:` line)            |
| 4   | Time to the first styled graph | On T39 (one color for the whole drawing, from the empty start), the median steps from `01.png` to the first screenshot whose looks differ from the first graph drawn: at most 12, twice the answer key's 6. Minutes between the same two screenshots are reported as a trend only | `../tool/score.mjs` (from `styles-steps.jsonl`)                        |
| 5   | Severity 3 and 4 problems open | 0 confirmed, from the sessions, the expert walkthroughs and the screenshot audit together                                                                                                                                                                                         | Counted in the round's `insights.md` after the skeptic check           |
| 6   | Accessibility                  | On every tier 3 screen of the scripted walk, at 1440 x 900 and 900 x 700: axe-core 0 serious or critical (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`); no two reachable controls share an accessible name; focus never falls to the page after any action the walk lists         | `../tool/bars.mjs --tier 3`                                            |
| 7   | Keyboard                       | Sam's keyboard-only sessions (started `empty --keys`): at least 3 of 4 S or SD, and 0 confirmed places a keyboard user cannot reach, operate or leave                                                                                                                             | The graders' grades of Sam's sessions; the accessibility expert's walk |
| 8   | Words at rest                  | On each tier 3 screen whose words `bars.mjs` counts, no count above its count in `../tool/bars-limits.json` (`tier3`)                                                                                                                                                             | `../tool/bars.mjs --tier 3`                                            |

**Bar 6, the screens and actions** (`../tool/bars.mjs`, `WALKS3`): the start screen; a sample just
opened; Everything's Node and Edge tabs; a new layer with its picker open; the add-a-condition
menu; a text card; a layer with a condition at rest; a color just added; the text and line menus;
the analysis list and a run's settings; a run's folder of groups on its Node and Edge tabs; two
layers picked together; a file read before loading; a category, a yes/no, a number and a
has-no-value card; a layer with four conditions at rest; the size popover. Focus is checked after:
adding a layer, adding a card, Done in the picker, adding a color, Undo, Escape from the line and
text menus, running a groups analysis, Load, adding a yes/no card, Escape from a card's menu, Done
after four cards, adding a size, Escape from the size popover. Light and dark themes are both
walked by the accessibility expert (bar 5 counts what they confirm).

**Bar 8, the limits:** recorded by `bars.mjs --tier 3 --record-limits` on build `31e8c2387`
(2026-10-17): a sample just opened 50, Everything's Node tab 47, a layer with a condition at rest
39, a folder of groups 72, two layers picked together 71, a layer with four conditions at rest 42.
Recorded again on the round 1 frozen build before round 1, with the reason in the change log; after
that a limit only falls.

**Bar 5, how the expert walkthroughs and the screenshot audit count:** every round, before they see
the sessions, the Figma product designer, the visual designer and the accessibility specialist walk
every bar 6 screen on the frozen build at 1440 x 900 and 900 x 700, in light and dark, and the
design engineer runs the screenshot audit at the same sizes. Images are checked by reading what
they show, never by an image model's yes or no. Each finding is confirmed by a scripted repro or a
second expert. A confirmed severity 3 or 4 counts against bar 5 like one found in a session. The
number of confirmed findings of any severity is reported every round and must not rise from one
round to the next; `bars.mjs` bar 10 counts (text cut with no way to read it whole, a raw code or
field path on screen) are listed for the experts' severity.

## Measures reported every round (not gates)

| Measure                                                                                     | Why                                                                   |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| All sessions' success together (target 85%)                                                 | The earlier tiers' target                                             |
| Minutes to the first styled graph, per task (a trend: the clock holds the model's thinking) | Question 1                                                            |
| Steps against the success path, median per task                                             | Where success is costly                                               |
| Which card types were used, by whom, and which were looked for and not found                | Question 2; a card type nobody reaches is a candidate for removal     |
| Touches of the purple "Layer" token; picker opened on a folder or on one layer              | Question 3                                                            |
| How a change was reversed (arrow, Control+Z, typed back, layer removed)                     | Question 4                                                            |
| Whether the layer's conditions were read before T50's answer                                | Question 5                                                            |
| First move after the sample or file opened, and the second place looked                     | Where a newcomer looks first; the second place is the stronger signal |
| Script errors, console errors and failed requests on a success path (target 0)              | Each is a bug report                                                  |
| What worked, per task                                                                       | A report of failures alone does not say what to keep                  |

## Round plan

- **Rounds:** as many as it takes to meet the bars, stopped only by "When the study stops". Round 1
  runs every task. A later round re-runs every task below its bar at full size, the core tasks at
  full size always, and each task a fix touched at 4 or more.
- **Core tasks** (decide the stall rule): T39 (first styled graph), T40 (picking by data, two
  domains) and T47 (several layers at once).
- **Size:** at most 56 sessions a round; round 1's allocation is in `roster.md` (core tasks at 6,
  eight tasks at 4, three at 2).
- **At most 4 participants alive at once**, and at most 4 browsers machine-wide in all (participants,
  graders, experts, pilots, engineers' checks, freezes), every one through `../tool/with-browser.sh`.
  `real.mjs --start` is called directly, never wrapped in `with-browser.sh` (it takes its own slot).
- **Starting a session:** each participant's start is its own step, run before the participant's
  turn, with `REAL_SLOT_WAIT_SECONDS` set; a session with no `01.png` is re-run as `<id>b`. Every
  session ends with `--end`, also after a failure.
- **No step cap.** A session ends when the participant says done, gives up, or stops making
  progress.
- **Step notes:** one or two sentences per step, in character.
- **Session cap:** 56 per round.
- **API errors:** a session that ends on a model API error is voided and run again from a clean
  folder; if that fails too, it is run once more on Sonnet, the model recorded in the grade and the
  session reported apart.
- **Isolation:** participants read only their briefing folder under `tmp/studio-sessions/`; the
  round's leak check (`real.mjs --leaks`) runs over every session and its log count is read; a
  participant's own log is read before a session is voided on a text match.
- **Frozen build:** one copy of `graphty/dist` per round, made after the preflight passes; its
  commit is on this file's first line, and in every `session.json`.
- **Never resume an edited run:** a changed plan or script starts a fresh run.

## Before a round may start (preflight)

1. The build under study is the studio worktree's commit, rebuilt with no uncommitted changes,
   frozen and served; this file's first line names it.
2. `node ../tool/real.mjs --prove` prints only `ok` on the frozen build.
3. `node --test ../tool/tier3.test.mjs`, `node ../tool/score.mjs --self-test` and
   `node ../tool/wording.mjs --self-test` pass: the tier wiring, the style-tree dump on a planted
   removal, and every scripted bar's planted failure.
4. **Dry run on the frozen build:** every task's success path in `answers.md`, both halves, ends on
   its success state; each also walks its detours (`tasks.md`, "Detours the dry run walks") and the
   success path again by keyboard, noting focus and screen-reader names. Pilots start from the real
   start and get everywhere by clicking or keys, never by URL. Defects found are fixed, the build
   frozen again and the dry run repeated until a pass finds nothing new, at most 4 passes.
5. Every reference value in `answers.md` is read on the frozen build; the run-dependent ones
   (Louvain's clusters) are run twice to show they repeat.
6. `node ../tool/bars.mjs <round>/bars --tier 3 --dist <frozen build>` runs with every planted case
   caught and no MISS line (read the MISS lines, not only the exit code); bar 8's limits are
   recorded on the round 1 build.
7. **Wording:** `node ../tool/wording.mjs tasks.md <round>/bars/vocabulary.json` reports 0 shared
   words not kept on purpose, after a planted echo was caught.
8. **Briefings:** `real.mjs --brief` writes every planned session's briefing; each is read for
   priming (persona playing rules, the briefing's tool text) before the round.
9. **Gate:** `real.mjs --gate <round>` writes the "Gate evidence" section of the round's `plan.md`
   for the frozen build (a pilot of every planned task half and the bars run). `--start` refuses
   every session of a round without it; the round ends on the first refusal.
10. This file, `tasks.md` and `answers.md` are frozen; the round folder is new.

## After a round: scoring and the skeptic check

`node ../tool/score.mjs <round>` scores bars 1 to 4 and writes `score.json`. Two skeptics, each
alone, try to refute every finding and every bar result; a finding two skeptics drop is dropped,
one that one drops is weakened unless answered with evidence (a screenshot, a grade line, the code
at the build commit). A defect is called confirmed only with a scripted repro or two sessions.
Every number is given with its denominator, with and without build-decided sessions.

## How a fix is accepted

In the package that owns the problem: graph facts and neutral `{ code, params }` in
graphty-element (an additive API is the team's call, recorded under "decided by the team" in
`../owner-decisions.md`; a breaking one goes there "for the owner" and never blocks the study),
words and arrangement in the graphty app, a shared control fixed in compact-mantine. Every fix
serves every user and domain, comes with a test that drives real input and fails without it, and
is re-piloted on the new frozen build. Remove before adding; words at rest never rise.

## When the study stops (done)

- **Passed:** every bar holds in one round. Recommend confirming with real people.
- **Stalled:** a round makes no progress over the round before: the core tasks' successful sessions
  rise by fewer than 2, no confirmed severity 3 or 4 was closed, and no failed bar now holds. The
  owner is told, with the evidence.
- **A one-way door:** a problem whose fix needs an owner decision that cannot be undone cheaply
  stops work on that task only; the owner is told.
- **The safety cap:** 6 rounds.

## Change log

- 2026-10-17: Rewritten for the owner's new focus, first use and styling on the combined Style
  panel. Replaces the earlier tier 3 draft for returning users (git history only). Bars 1 to 4 are
  scored by `../tool/score.mjs`, bars 6 and 8 by `../tool/bars.mjs --tier 3`, and the wording
  check by `../tool/wording.mjs`; each was shown to fail on a planted case. Bar 8's limits recorded
  on build `31e8c2387`, to be recorded again on the round 1 frozen build. Not frozen.
