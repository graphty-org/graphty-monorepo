The study runs on build (none frozen yet) served from (none frozen yet)

Frozen on 2026-10-17 for the tier 3 rounds.

# Success criteria and round plan: first use and styling (tier 3)

A bar changes only between rounds, with the change and its reason in the change log at the end,
and nothing here changes after a round's first session starts. The first line names the frozen
build once the preflight has frozen one; no session starts before it does.

**What is studied.** A person's first use of the graphty app (`/?next`) and their first styling,
on the combined Style panel: the layer tree; a layer's Style area with its Node and Edge tabs; at
the top of each tab, the collapsible picker of which nodes or edges the layer paints, built from
typed condition cards (number range, category values, text contains or starts with, yes/no, has
or has no value), combined with AND; the property lines below it; and the same tabs, picker and
fields when a folder or several layers are selected, where a field whose layers differ shows the
purple "Layer" token. The app is a local
production build of the studio worktree, driven by `../tool/real.mjs`. Tasks: `tasks.md`. Answer
key (graders only): `answers.md`. Participants: `roster.md`.

**Who the participants are.** Simulated: one model playing composite personas, every one of them a
first-time user of graphty, every session from the empty start screen. A failure is strong
evidence; a pass is weak until real people confirm it. Every report says so.

**What the study must answer, beyond the bars:**

1. Can a newcomer get from the empty start screen to a styled drawing, and how long does it take
   (bar 4)?
2. Do the typed condition cards let a newcomer pick nodes or ties by data, with each card type
   (text, category, yes/no, has no value, number), without being told how (bar 1 on T38, T40, T41,
   T45, T50; number cards (T45 B, T50 B) are reported in round 1, not judged, and T42, the number
   card on people, runs in round 2)? T45's halves share what is at stake -- picking ties on the
   Edge tab -- and reach different card types (a category in A, a number in B), so bar 1 judges
   T45 as one task and each card type is reported per half.
3. When a folder or several layers are selected, do readers read the purple "Layer" token as "each
   layer keeps its own" and leave it alone when they mean to (T46, where setting the folder's color
   is the wrong turn that paints every cluster the same, and T47), and does adding a card to
   several layers at once read as consistent with one layer's picker (T48)? Graders record every
   touch of the token (`Token:` on T46 and T47), and whether the reader opened the picker on the
   folder or on one layer. The bulk part is answered only from sessions that selected the folder
   or several layers (`Route: folder` or `several` on T47 and T48).
4. How does a newcomer reverse a change (T49): the arrow, Control+Z, typing the old value back,
   or removing a layer?
5. Can a newcomer find what a layer someone else made applies to, and why (T50)?
6. When each kind of thing gets its own color, can a newcomer tell from the screen which color
   stands for which kind (T51)?

## Grades

As `answers.md`, "How a session is graded": S, SD, F, G, VOID; success = S + SD; graded from the
last screenshot, the saved and downloaded files, the transcript and the scripted style tree
(`styles-start.json`, `styles.json`, `styles-steps.jsonl`), never from the participant's own
rating. Every `grade.md` starts with the three lines `Grade:`, `False done:` and `Wrong turns:`,
which `../tool/score.mjs` reads; a T47 or T48 success adds `Route:`, and every T46 and T47
session adds `Token:` (`answers.md`). Severity 0-4 (Nielsen). Confirmed = two or more participants, or
one participant plus a scripted repro (a `real.mjs` walk under the round's `repro/`) for a build
defect. A severity 4 needs a wrong conclusion a reader would act on, a task that cannot be done, or
a participant who leaves. Graders are never told the outcome to look for. A give-up the persona
file scripts is graded G with the line `Scripted exit: yes`; it is never VOID and stays in bar
1's denominator, and `score.mjs` lists it apart. A tool refusal (a click the tool could not
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

| #   | Bar                            | Target                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Scored by                                                                                 |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | Task success                   | Each task run at 4 or more sessions: at least 80% S or SD, and each dataset half at least 2 of 3. In counts: 4 sessions need 4 of 4 (2 of 2 per half); 6 need 5 of 6 with at least 2 of 3 in each half; so one F fails a 4-session task. A task run at fewer than 4 sessions does not hold bar 1; the study cannot pass while any task is unjudged. T47 and T48 hold only when at least half their S/SD sessions went by the bulk route (`Route: folder` or `several`) | `../tool/score.mjs` (T47's and T48's from the graders' `Route:` line)                     |
| 2   | False "done"                   | 0 sessions where the participant said done while the last screen or the style tree showed otherwise                                                                                                                                                                                                                                                                                                                                                                    | `../tool/score.mjs` (from the graders' `False done:` line)                                |
| 3   | Wrong turns                    | Each task's median wrong turns at most 2                                                                                                                                                                                                                                                                                                                                                                                                                               | `../tool/score.mjs` (from the graders' `Wrong turns:` line)                               |
| 4   | Time to the first styled graph | On T39 (one color for the whole drawing, from the empty start), over the pointer sessions (not Sam's `--keys`, whose key presses are another unit; reported apart, for bar 7), the median steps from `01.png` to the first screenshot where every node shows one new color: at most 12, twice the answer key's 6. A session that never gets there, or is not graded S or SD (a wrong color), counts as never. Minutes between the two screenshots are a trend only     | `../tool/score.mjs` (from `styles-steps.jsonl`'s `colors`)                                |
| 5   | Severity 3 and 4 problems open | 0 confirmed, from the sessions, the expert walkthroughs and the screenshot audit together (one problem found by both an expert and a session counts once)                                                                                                                                                                                                                                                                                                              | Counted in the round's `insights.md` after the skeptic check                              |
| 6   | Accessibility                  | On every tier 3 screen of the scripted walk, at 1440 x 900 and 900 x 700, in the dark and the light theme: axe-core 0 serious or critical (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`); no two reachable controls share an accessible name; focus never falls to the page after any action the walk lists; and after adding a text card, a Color line and a Shape line, a value typed with no click first is written (focus lands where the next input goes)          | `../tool/bars.mjs --tier 3 --scheme dark` and `--scheme light` (printed there as "bar 8") |
| 7   | Keyboard                       | Sam's keyboard-only sessions (started `empty --keys`): at least 3 of 4 S or SD, and 0 confirmed places a keyboard user cannot reach, operate or leave                                                                                                                                                                                                                                                                                                                  | The graders' grades of Sam's sessions; the accessibility expert's walk                    |
| 8   | Words at rest                  | On each tier 3 screen whose words `bars.mjs` counts, no count above its count in `../tool/bars-limits.json` (`tier3`)                                                                                                                                                                                                                                                                                                                                                  | `../tool/bars.mjs --tier 3` (printed there as "bar 9 (b)")                                |

**Bar 6, the screens and actions** (`../tool/bars.mjs`, `WALKS3`): the start screen; a sample just
opened; Everything's Node and Edge tabs; a new layer with its picker open; the add-a-condition
menu; a text card; a layer with a condition at rest; a color just added; the text and line menus;
the analysis list, filtered to groups (its one-line descriptions join the wording check) and a
run's settings; a run's folder of groups on its Node and Edge tabs; two layers picked together; a
layer with an Edge tab condition at rest; a file read before loading; a category, a yes/no, a
number and a has-no-value card; a layer with four conditions at rest; a color bound to a category
column, with its key, and that color's popover; the size popover before a column is picked and
after; a run's folder with its picker open and a card added to every layer; the "Color from each
layer" dialog the purple token opens; a colleague's project just opened, and its layer selected.
Focus is checked after: adding a layer, adding a card, Done in the picker, adding a color, Undo,
Escape from the line and text menus, running a groups analysis, Done in an Edge tab picker, Load,
adding a yes/no card, Escape from a card's menu, Done after four cards, picking a column for a
color, Escape from the color popover, adding a size, Escape from the size popover before and after
a column, adding a shape, adding a card on a folder, Done in a folder's picker, Escape from the
"Color from each layer" dialog, selecting a colleague's layer. Typing with no click is checked
after adding a text card, a Color line and a Shape line; a planted case types on the start screen,
where nothing takes text, and must fail. Hover-only text (tooltips, info bubbles) is not in the
wording check's vocabulary; the experts read it.

**Bar 8, the limits:** recorded by `bars.mjs --tier 3 --record-limits` on build `31e8c2387`
(2026-10-17): a sample just opened 50, Everything's Node tab 47, a layer with a condition at rest
39, a folder of groups 72, two layers picked together 71, a layer with four conditions at rest 42.
Re-recorded on the round 1 build only where lower than the 31e8c2387 counts (`--record-limits`
keeps the lower of the two; a new screen, such as the folder's open picker, gets its first count
there). A screen above 50 words (at rest) or 40 (a selected object's inspector) is a severity 2
finding reported each round until it falls: today a folder of groups (72) and two layers picked
together (71).

**Bar 5, how the expert walkthroughs and the screenshot audit count:** every round, before they see
the sessions, the Figma product designer, the visual designer and the accessibility specialist walk
every bar 6 screen on the frozen build at 1440 x 900 and 900 x 700, in light and dark, and the
design engineer runs the screenshot audit at the same sizes and in both themes. Images are checked
by reading what they show, never by an image model's yes or no. The audit's checklist, the same
every round:

- text cut with no way to read it whole, and a raw code, id or field path on screen (`bars.mjs`
  prints both as its "bar 10" counts; the expert gives each a severity);
- overlap, and anything that runs off the panel or the window at 900 x 700;
- contrast below 4.5:1 for text or 3:1 for controls and focus rings, and a control with no
  visible focus ring;
- the purple "Layer" token readable in both themes;
- **key and drawing agree**: on every session's last screenshot, the key's colors and values, the
  picker's count and the colors on the drawing say the same thing. A disagreement (a key that is
  stale, two values in one color where the key says each has its own) is a severity 3, confirmed
  by that session plus a scripted repro.

Each finding is confirmed by a scripted repro or a second expert. Only a confirmed severity 3 or 4
feeds a bar: it counts against bar 5 like one found in a session, once even when a session also
hit it. The number of confirmed findings of any severity is a measure, not a gate (below), and is
compared between rounds only over the same set of screens.

## Measures reported every round (not gates)

| Measure                                                                                                                    | Why                                                                   |
| -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| All sessions' success together (target 85%)                                                                                | The earlier tiers' target                                             |
| Minutes to the first styled graph, per task (a trend: the clock holds the model's thinking)                                | Question 1                                                            |
| Steps against the success path, median per task                                                                            | Where success is costly                                               |
| Which card types were used, by whom, and which were looked for and not found                                               | Question 2; a card type nobody reaches is a candidate for removal     |
| Touches of the purple "Layer" token on T46 and T47 (`Token:`) and what followed; picker opened on a folder or on one layer | Question 3                                                            |
| T47 and T48 successes by route (folder, several, one by one, around, cover), from grade.md's `Route:`                      | Question 3, bar 1 and the stall rule count only folder and several    |
| Picker opened unprompted on a single layer (T38, T40, T41, T45), and the step it was opened                                | Shows whether the collapsed picker is found                           |
| Escape pressed in the picker or a card, and whether the step note expected it to cancel                                    | Escape keeps edits by design                                          |
| Edges or ties looked for on the Node tab first (T45)                                                                       | Tests the split into Node and Edge tabs                               |
| Which color the participant named for a kind, and where they read it (T51)                                                 | Question 6                                                            |
| How a change was reversed (arrow, Control+Z, typed back, layer removed)                                                    | Question 4                                                            |
| Whether the layer's conditions were read before T50's answer, per half (A's names give away the rule)                      | Question 5                                                            |
| First move after the sample or file opened, and the second place looked                                                    | Where a newcomer looks first; the second place is the stronger signal |
| Script errors, console errors and failed requests on a success path (target 0)                                             | Each is a bug report                                                  |
| What worked, per task                                                                                                      | A report of failures alone does not say what to keep                  |
| Bar 1 over the newcomers alone (all but Alex and Maren), per task; a half that holds only because of them is named         | Their findings never stand in for newcomers (`score.mjs` reports it)  |
| Sam's steps to the first styled graph on T39, in key presses                                                               | Bar 7's evidence; left out of bar 4                                   |
| Confirmed findings of any severity (sessions, experts, audit), against last round over the same screens                    | The trend under bar 5; a rise is explained in `insights.md`           |

## Round plan

- **Rounds:** as many as it takes to meet the bars, stopped only by "When the study stops". Round 1
  runs every task but T37 and T42 (see Size). A later round re-runs every task below its bar at full size, the core tasks at
  full size always, and each task a fix touched at 4 or more; T44 and T51 (2 sessions in round 1,
  so unjudged) and T42 run at 4 in round 2.
- **Core tasks** (decide the stall rule): T39 (first styled graph), T40 (picking by data, two
  domains), T47 (several layers at once; its successes counted on the folder or several route
  only) and T48 (a card added to several layers at once, where bulk editing and picking meet).
- **Size:** at most 56 sessions a round; round 1's allocation is in `roster.md` (the four core
  tasks at 6, seven tasks at 4, T44 and T51 at 2). T37 and T42 are not run in round 1: T37's
  first look is recorded in every session, and T42's two slots go to T51. T42 runs at 4 in round 2,
  since the study cannot pass while a task is unjudged; T37 waits for a later round.
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
  folder (a new `<id>b`, never the old folder); if that fails too, it is run once more on Sonnet.
  Every session's model is recorded in its `grade.md`, and a session not run on the round's model
  is reported apart.
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
   frozen again and the dry run repeated until a pass finds nothing new. If the fourth pass still
   finds something, round 1 does not start: the Director reports the remaining defects and the
   study waits for their fixes.
5. Every reference value in `answers.md` is read on the frozen build; the run-dependent ones
   (Louvain's clusters) are run twice to show they repeat.
6. `node ../tool/bars.mjs <round>/bars --tier 3 --scheme dark --dist <frozen build>`, and again
   into `<round>/bars-light` with `--scheme light`, each with every planted case caught and no MISS
   line (read the MISS lines, not only the exit code); bar 8's limits are recorded on the round 1
   build from the dark run.
7. **Wording:** `node ../tool/wording.mjs tasks.md <round>/bars/vocabulary.json` reports 0 shared
   words not kept on purpose, after a planted echo was caught. Its "kept, on screen" lines are saved
   to `<round>/bars/wording.txt` and read against the last round's: a kept word newly on screen is
   re-justified in `tasks.md` or its task is reported as primed.
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
  (T47's on the folder or several route only) rise by fewer than 2, no confirmed severity 3 or 4 was closed, and no failed bar now holds. The
  owner is told, with the evidence.
- **A one-way door:** a problem whose fix needs an owner decision that cannot be undone cheaply
  stops work on that task only; the owner is told.
- **The safety cap:** 6 rounds.

## Change log

- 2026-10-17 (second review by the researcher, the user advocate and the red team; frozen): bar 1
  writes out what 80% means at 4 and 6 sessions, and T47 and T48 hold only when most successes went
  by the folder or several route (one layer at a time no longer counts: it is the bulk edit not
  found). Bar 4 is measured over pointer sessions only (Sam's key presses are another unit) and a
  session not graded S or SD counts as never. Bar 6 is walked in both themes, checks that typing
  after adding a text card, a Color line or a Shape line is written, and covers the screens success
  paths go through and the walk had missed: color and size bound to data and their popovers, the
  "Color from each layer" dialog, an Edge tab condition at rest, a colleague's project and its
  layer, the filtered analysis list. Bars 6 and 8 name `bars.mjs`'s own numbers. The screenshot
  audit has a written checklist, including key and drawing agreement on every last screenshot; only
  confirmed severity 3 and 4 findings feed a bar (bar 5), and the any-severity count is a measure
  compared over the same screens. Question 3 also reads T46, with a `Token:` grade line. New
  measures: bar 1 over newcomers alone, Sam's keyboard steps. The roster keeps Maren off T39,
  Alex off T40 B and Tom off T51. Not taken: the stall rule reading the any-severity count (it
  grows with the screens walked; severity 3 and 4 already count); T45's halves given one card type
  (the task is picking ties on the Edge tab, the same in both halves); a newcomer on T44 A (T44 is
  unjudged at 2 sessions and runs at 4 in round 2); a check that fails on any kept word newly on
  screen (the round reads the list instead: a word on screen may still be the right word).

- 2026-10-17 (after the review by the user advocate, the red team and the Director): bar 1 no
  longer passes an unjudged task, and T47 holds only when most successes went through the
  clusters; bar 4 ends at every node in one new color and counts a session that never got there;
  bar 8's limits only fall, and screens over the word budgets are reported as severity 2; T48 is a
  core task at 6, T37 and T42 leave round 1, T51 (each kind its own color) joins at 2; three new
  measures from the design decision's watch list; the folder's open picker joins bar 6; the dry run
  no longer stops after 4 passes with defects left; "1 of 2 layers" dropped from what is studied
  (no success path reaches it). Where the reviewers differed, the Director's call stands: T37's
  slots go to T48 (not to T42), and T50 keeps its project file, with question 5 reported per half.

- 2026-10-17: Rewritten for the owner's new focus, first use and styling on the combined Style
  panel. Replaces the earlier tier 3 draft for returning users (git history only). Bars 1 to 4 are
  scored by `../tool/score.mjs`, bars 6 and 8 by `../tool/bars.mjs --tier 3`, and the wording
  check by `../tool/wording.mjs`; each was shown to fail on a planted case. Bar 8's limits recorded
  on build `31e8c2387`, to be recorded again on the round 1 frozen build. Not frozen.
