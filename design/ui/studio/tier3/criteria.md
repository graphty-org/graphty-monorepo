The study runs on build e3c5bca8e6 served from /home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1-e3c5bca8e6

Frozen on 2026-10-19 for the tier 3 rounds.

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
   T45 as one task and each card type is reported per half. Each card type is reported with the
   number of domains it was reached on, and a type reached on one domain only is labeled so (in
   round 1 the category card on ties is reached only on neighbors.csv, the number card on ties
   only on Les Miserables, and T50 reaches text only on lesmis-poster and number only on
   volunteers-thanks).
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
session adds `Token:` (`answers.md`). The grading calls settled before round 1 (any community
analysis on T46 to T48, T48 B's filtered run, T44 A's `id`, T49 by the drawing) are in
`answers.md`, "Rules settled before round 1". Severity 0-4 (Nielsen). Confirmed = two or more participants, or
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

| #   | Bar                            | Target                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Scored by                                                                                                                                                        |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Task success                   | Each task run at 4 or more sessions: at least 80% S or SD, and each dataset half at least 2 of 3. In counts: 4 sessions need 4 of 4 (2 of 2 per half); 6 need 5 of 6 with at least 2 of 3 in each half; so one F fails a 4-session task. A task run at fewer than 4 sessions does not hold bar 1; the study cannot pass while any task is unjudged. T47 and T48 hold only when at least half their S/SD sessions went by the bulk route (`Route: folder` or `several`)                                                                                                                                               | `../tool/score.mjs` (T47's and T48's from the graders' `Route:` line)                                                                                            |
| 2   | False "done"                   | 0 sessions where the participant said done while the last screen or the style tree showed otherwise. On T49, which is graded by the drawing, a style tree that differs from the start while the drawing matches it is not a false "done" (`answers.md`, "Rules settled before round 1")                                                                                                                                                                                                                                                                                                                              | `../tool/score.mjs` (from the graders' `False done:` line)                                                                                                       |
| 3   | Wrong turns                    | Each task's median wrong turns at most 2                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `../tool/score.mjs` (from the graders' `Wrong turns:` line)                                                                                                      |
| 4   | Time to the first styled graph | On T39 (one color for the whole drawing, from the empty start), over the pointer sessions (not Sam's `--keys`, whose key presses are another unit; reported apart, for bar 7), the median steps from `01.png` to the first screenshot where every node shows one new color: at most 10, twice the answer key's 5 (the T39 path on every build since 58556989e8). The limit is a number: a fix that shortens the key does not move it; only a change-log entry does. A session that never gets there, or is not graded S or SD (a wrong color), counts as never. Minutes between the two screenshots are a trend only | `../tool/score.mjs` (from `styles-steps.jsonl`'s `colors`)                                                                                                       |
| 5   | Severity 3 and 4 problems open | 0 confirmed, from the sessions, the expert walkthroughs and the screenshot audit together (one problem found by both an expert and a session counts once). Not scored in a round whose scripted walk left out a screen that a planned task's success path crosses: a skipped screen is not a clean one                                                                                                                                                                                                                                                                                                               | Counted in the round's `insights.md` after the skeptic check; an expert's or the audit's finding only once a scripted repro or a measurement confirms it (below) |
| 6   | Accessibility                  | On every tier 3 screen of the scripted walk, at 1440 x 900 and 900 x 700, in the dark and the light theme: axe-core 0 serious or critical (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`); no two reachable controls share an accessible name; focus never falls to the page after any action the walk lists; and after adding a text card, choosing a text card's match kind ("Starts with"), adding a Color line and adding a Shape line, a value typed with no click first is written (focus lands where the next input goes)                                                                                       | `../tool/bars.mjs --tier 3 --scheme dark` and `--scheme light` (printed there as "bar 8")                                                                        |
| 7   | Keyboard                       | Sam's keyboard-only sessions (started `empty --keys`): at least 3 of 4 S or SD, and 0 confirmed places a keyboard user cannot reach, operate or leave. Such a place is confirmed by a scripted repro started with `--keys` (a `real.mjs` walk under the round's `repro/`) or by two of Sam's sessions, never by an expert's reading alone                                                                                                                                                                                                                                                                            | The graders' grades of Sam's sessions; the accessibility expert's walk, each finding confirmed by a `--keys` repro                                               |
| 8   | Words at rest                  | On each tier 3 screen whose words `bars.mjs` counts, no count above its count in `../tool/bars-limits.json` (`tier3`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `../tool/bars.mjs --tier 3` (printed there as "bar 9 (b)")                                                                                                       |

**Bar 6, the screens and actions** (`../tool/bars.mjs`, `WALKS3`): the start screen; a sample just
opened; Everything's Node and Edge tabs; a new layer with its picker open; the add-a-condition
menu; a text card; a layer with a condition at rest; a color just added; the text and line menus;
the analysis list, filtered to groups (its one-line descriptions join the wording check) and a
run's settings; a run's folder of groups on its Node and Edge tabs; two layers picked together; a
layer with an Edge tab condition at rest; a file read before loading; a category, a yes/no, a
number and a has-no-value card; a layer with four conditions at rest; a color bound to a category
column, with its key, and that color's popover; the size popover before a column is picked and
after; a run's folder with its picker open and a card added to every layer; the "Color from each
layer" dialog the purple token opens; a colleague's project just opened, and its layer selected; the find box with a name typed and its
results; a node's inspector showing its Memberships and "Why this look"; a node's own Style tab
with its Fill "+"; the open shape list; a sample just opened with the key switched on. (The last
five were added 2026-10-18: each sits on a core or study-question task's success path or a
blocking trap, and bars 6 and 8, the experts and the audit read only the walk; preflight 6 does
not pass until `WALKS3` walks them.)
Focus is checked after: adding a layer, adding a card, Done in the picker, adding a color, Undo,
Escape from the line and text menus, running a groups analysis, Done in an Edge tab picker, Load,
adding a yes/no card, Escape from a card's menu, Done after four cards, picking a column for a
color, Escape from the color popover, adding a size, Escape from the size popover before and after
a column, adding a shape, adding a card on a folder, Done in a folder's picker, Escape from the
"Color from each layer" dialog, selecting a colleague's layer, choosing a text card's match kind.
Typing with no click is checked after adding a text card, after choosing "Starts with" in a text
card's match menu (on T40 B's success path, letters typed there reopened the menu and were lost),
and after adding a Color line and a Shape line; a planted case types on the start screen, where
nothing takes text, and must fail. The walk also saves the spoken text of every screen it walks --
accessible names, live-region text and notices (the undo notice, "Not set yet") -- to
`<round>/bars/spoken.json`, which the wording check (preflight 7) reads beside the screen words and
the experts read against the prompts. Hover-only text (tooltips, info bubbles) is in neither; the
experts read it. The design engineer owns `WALKS3` and every addition to it.

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
- the purple "Layer" token's text at 4.5:1 or more against its background in both themes,
  measured;
- **key and drawing agree**: on every session's last screenshot, the key's colors and values, the
  picker's count and the colors on the drawing say the same thing. A disagreement (a key that is
  stale, two values in one color where the key says each has its own) is a severity 3, confirmed
  by that session plus a scripted repro. A styled node the participant left selected is graded by
  its color in the style tree (`answers.md`); when its selection ring or tint makes it read as a
  color the key does not say, that is a key-and-drawing disagreement, recorded here.

The experts' scope also covers what the screen says out loud: the walk's `spoken.json` (accessible
names, live-region text, notices) is read against the prompts for words that lead the way, and
against the screens for names that misstate what a control does.

Each finding is confirmed by a scripted repro (a `real.mjs` walk under the round's `repro/`) or a
measurement (a contrast ratio, a pixel box, a count read by script), never by a second expert's
reading: every expert is the same model reading the same picture, so a second reading is not
independent. Only a confirmed severity 3 or 4
feeds a bar: it counts against bar 5 like one found in a session, once even when a session also
hit it. The number of confirmed findings of any severity is a measure, not a gate (below), and is
compared between rounds only over the same set of screens. Bar 5 is not scored in a round whose
walk left out any screen a planned task's success path crosses (preflight 6): the experts and the
audit see only what the walk shows, so a missing screen would read as a clean one.

## Measures reported every round (not gates)

| Measure                                                                                                                                                                          | Why                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| All sessions' success together (target 85%)                                                                                                                                      | The earlier tiers' target                                                   |
| Minutes to the first styled graph, per task (a trend: the clock holds the model's thinking)                                                                                      | Question 1                                                                  |
| Steps against the success path, median per task                                                                                                                                  | Where success is costly                                                     |
| Which card types were used, by whom, and which were looked for and not found                                                                                                     | Question 2; a card type nobody reaches is a candidate for removal           |
| Each card type's success, with the number of domains it was reached on; a type reached on one domain only is labeled so                                                          | Question 2; a pass on one domain does not read as general                   |
| Touches of the purple "Layer" token on T46 and T47 (`Token:`) and what followed; picker opened on a folder or on one layer                                                       | Question 3                                                                  |
| T47 and T48 successes by route (folder, several, one by one, around, cover), from grade.md's `Route:`                                                                            | Question 3, bar 1 and the stall rule count only folder and several          |
| Picker opened unprompted on a single layer (T38, T40, T41, T45), and the step it was opened                                                                                      | Shows whether the collapsed picker is found                                 |
| Escape pressed in the picker or a card, and whether the step note expected it to cancel                                                                                          | Escape keeps edits by design                                                |
| Edges or ties looked for on the Node tab first (T45)                                                                                                                             | Tests the split into Node and Edge tabs                                     |
| Which color the participant named for a kind, and where they read it (T51)                                                                                                       | Question 6                                                                  |
| How a change was reversed (arrow, Control+Z, typed back, layer removed)                                                                                                          | Question 4                                                                  |
| Whether the layer's conditions were read before T50's answer, per half (A's names give away the rule)                                                                            | Question 5                                                                  |
| First move after the sample or file opened, and the second place looked                                                                                                          | Where a newcomer looks first; the second place is the stronger signal       |
| Script errors, console errors and failed requests on a success path (target 0)                                                                                                   | Each is a bug report                                                        |
| What worked, per task                                                                                                                                                            | A report of failures alone does not say what to keep                        |
| Bar 1 over the newcomers alone (all but Alex and Maren), per task; a half that holds only because of them is named                                                               | Their findings never stand in for newcomers (`score.mjs` reports it)        |
| What each T46 to T48 participant typed into the analysis filter, per half; a word the prompt gave (B's "clusters") reported as prompted, A's "circles" as the unprompted reading | The B halves keep "clusters" on purpose (`tasks.md`); the filter matches it |
| Sam's steps to the first styled graph on T39, in key presses                                                                                                                     | Bar 7's evidence; left out of bar 4                                         |
| Confirmed findings of any severity (sessions, experts, audit), against last round over the same screens                                                                          | The trend under bar 5; a rise is explained in `insights.md`                 |

## Round plan

- **Rounds:** as many as it takes to meet the bars, stopped only by "When the study stops". Round 1
  runs every task but T37, T42 and T44 (see Size). A later round re-runs every task below its bar
  at full size, the core tasks at full size always, and each task a fix touched at 4 or more; T42
  and T44 run at 4 in round 2.
- **Core tasks** (decide the stall rule): T39 (first styled graph), T40 (picking by data, two
  domains), T47 (several layers at once; its successes counted on the folder or several route
  only) and T48 (a card added to several layers at once, where bulk editing and picking meet).
- **Size:** at most 56 sessions a round; round 1's allocation is in `roster.md` (the four core
  tasks at 6, eight tasks at 4: T38, T41, T43, T45, T46, T49, T50, T51). T37, T42 and T44 are not
  run in round 1: T37's first look is recorded in every session; T42's and T44's slots go to T51,
  whose key is the likeliest screen to look right and answer wrong (question 6), so it is judged
  in round 1. T42 and T44 run at 4 in round 2, since the study cannot pass while a task is
  unjudged; T37 waits for a later round.
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
   frozen and served; this file's first line names it. A commit that changes nothing in graphty,
   graphty-element, compact-mantine or `pnpm-lock.yaml` does not refreeze the build: a walk, a
   bars run or a reference value read on any commit whose diff of those four against the named
   build is empty counts as read on the named build, and the gate evidence records that empty
   diff. (1fa51e2b0b holds the same app code as 52cb47a85a.)
2. `node ../tool/real.mjs --prove` prints only `ok` on the frozen build.
3. `node --test ../tool/tier3.test.mjs`, `node ../tool/score.mjs --self-test` and
   `node ../tool/wording.mjs --self-test` pass: the tier wiring, the style-tree dump on a planted
   removal, and every scripted bar's planted failure.
4. **Dry run on the frozen build:** every task's success path in `answers.md`, both halves, ends on
   its success state; each also walks its detours (`tasks.md`, "Detours the dry run walks") and the
   success path again by keyboard, noting focus and screen-reader names. Pilots start from the real
   start and get everywhere by clicking or keys, never by URL. A pass is complete only when every
   task half the round plans has all three walks on the frozen build (preflight 1 says which
   builds count); a walk skipped for any reason (no browser slot free, a pilot that returned
   nothing) is run again, never read as clean. The keyboard walk counts only when its
   `session.json` records `keyboardOnlyMode: true` (started with `--keys`). The dry run walks
   only the halves the round plans: halves whose last pass found a blocking defect first, then the
   core tasks, then the rest. A pass that stops partway is finished, not started again; its walks
   on the frozen build stand. Each pass is triaged against `decided.md`, the tier's binding decisions: a complaint
   against a decided behavior is no change, and a reversal needs a new entry there with its reason
   and evidence. Blocking and confusing defects are fixed (a defect on two screens or in two passes
   once, in its shared part); cosmetic ones go to `backlog.md`; every fix row records its origin
   (new, a regression of the last pass's fixes, a repeat, another instance of one shared part).
   The build is frozen again and the dry run repeated until a pass meets the **exit test**: no
   blocking defect on any task's success path or listed detours; regressions of the last pass's
   fixes under 10% of the fix list; no reversed decision. A pass at about 40% regressions stops
   the full passes: the shared parts are fixed first and the routes they touch walked again, then
   a full pass. Confusing moments off the success paths that remain go to the sessions, which
   exist to find them.
5. Every reference value in `answers.md` is read on the frozen build; the run-dependent ones
   (the clusters) are run twice to show they repeat. T46 to T48 accept any community analysis the
   analysis list offers (Louvain, Leiden, Label propagation, Markov, Spectral, Hierarchical), so
   each one's group sizes, and the target group's count, are read twice on the frozen build and
   written into `answers.md`. A method whose two runs differ is marked so there, and a session
   that ran it is graded against its own run: the target group and its count are read from that
   session's `styles.json`, not from a fixed number.
6. `node ../tool/bars.mjs <round>/bars --tier 3 --scheme dark --dist <frozen build>`, and again
   into `<round>/bars-light` with `--scheme light`, each with every planted case caught and no MISS
   line (read the MISS lines, not only the exit code); bar 8's limits are recorded on the round 1
   build from the dark run. The walk must cover every screen bar 6 lists; until `WALKS3` walks the
   five screens added on 2026-10-18 and the "Starts with" typing check, this step does not pass.
7. **Wording:** `node ../tool/wording.mjs tasks.md <round>/bars/vocabulary.json` reports 0 shared
   words not kept on purpose, after a planted echo was caught. It reads the walk's screen words and
   its `spoken.json` (accessible names, live-region text, notices), and it counts a word's
   irregular forms as one word (draw, draws, drawn, drawing; pick, picked; keep, kept), with a
   planted irregular echo caught. Its "kept, on screen" lines are saved to
   `<round>/bars/wording.txt` and read against the last round's; round 1, which has no last round,
   reads them against the "Kept on purpose" lists in `tasks.md`. A kept word on screen that no
   list justifies is re-justified in `tasks.md` or its task is reported as primed.
8. **Briefings:** `real.mjs --brief` writes every planned session's briefing; each is read for
   priming (persona playing rules, the briefing's tool text) before the round.
9. **Gate:** `real.mjs --gate <round>` writes the "Gate evidence" section of the round's `plan.md`
   for the frozen build (a pilot of every planned task half and the bars run). `--start` refuses
   every session of a round without it; the round ends on the first refusal. The gate keys each
   walk by its half's folder (`pilot/<T40B>/<walk>/session.json`), and holds a half only with a
   success walk, a detours walk and a keyboard walk (`keyboardOnlyMode: true`), each on a build
   that counts as the frozen one (preflight 1), each with its screenshots; its self-test has a
   planted half missing each of the three, and a walk on a build whose app code differs.
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

- 2026-10-19 (round 1 pilots on e3c5bca8e6): `answers.md` and the T41/T48 detour line of
  `tasks.md` now match the frozen build as the pilots in `rounds/r1/pilot/` saw it (the
  `answers.md` change log lists what changed). No bar changed. Bar 4's frozen counts stand; the
  key's step counts rose by one on every task whose path adds a condition, because the collapsed
  Which nodes line only expands on its first click.
    - Left to the Director: T50 B, a reader who answers "31 or more hours and trained" from the
      "Select what it paints" summary (it reads "hours 31 to 52", "trained Yes (6)") has read the
      selection, not the layer's rule. The key grades "hours 30 to 52 and trained", read from the
      card, as S (52 is the file's highest); how the summary reading is graded is open.
    - Owed before round 1: T46 B and T49 B by keyboard (both walks stopped after the start
      screen). Most halves' `rounds/r1/pilot/<half>/report.md` was not written by the walk agents
      (the harness refused the write); T40 B's still describes build 1fa51e2b0b and T45 A's build
      58556989e8.

- 2026-10-19 (round 1 build refrozen): the study build is now e3c5bca8e6, in
  `.study-builds/tier3-r1-e3c5bca8e6`. It replaces build 1fa51e2b0b
  (`.study-builds/tier3-r1-1fa51e2b0b`). Its diff of graphty, graphty-element, compact-mantine and
  `pnpm-lock.yaml` against 1fa51e2b0b is empty, so it holds the same app code (preflight 1). No bar
  changed.

- 2026-10-19 (fourth review by the researcher, the user advocate and the red team; frozen for the
  tier 3 rounds on build 1fa51e2b0b; no session has run, and the dry run's exit test has NOT been
  met on this build):
    - Bar 2 writes in T49's rule: a style tree that differs while the drawing matches the start is
      not a false "done". Reason: `answers.md` settled it on 2026-10-18, but a grader reading this
      table alone would have marked it.
    - Bar 5 is not scored in a round whose walk left out a screen a planned success path crosses,
      and its "Scored by" says experts and the audit count only through a repro or a measurement.
      Reason: a round could otherwise report 0 open severity 3 and 4 from experts who never saw the
      shape list or a node's own Style tab -- a skipped check reading as a clean one.
    - Bar 6 checks focus and typing after choosing a text card's match kind. Reason: in T40 B's
      walk on this build, `GAL` typed straight after "Starts with" reopened the menu on "Ends with"
      and was lost: a core task's success path, which the bar did not check.
    - Bar 7's unreachable places are confirmed by a `--keys` repro or two of Sam's sessions.
      Reason: the same rule bar 5 has; one model's reading of a screenshot is not independent.
    - The audit settles styled nodes left selected: graded by the style tree's color, and a
      selection tint that makes a node read as another color is a key-and-drawing disagreement.
      Reason: on the find-box detour, purple genes kept yellow rings and read yellow-orange, and
      two graders could have graded the same screen two ways.
    - The walk saves spoken text (accessible names, live-region text, notices) to `spoken.json`,
      which the wording check and the experts read; the wording check joins irregular forms and
      round 1 reads kept words against `tasks.md`'s lists. Reason: "drawn" in every unset color
      line's name and the "Not set yet" line were checked by nobody in a measurable way, the
      stemmer joins only plurals, and "the last round's" list does not exist for round 1.
    - Preflight 1: a commit that changes no app code does not refreeze the build. Reason:
      1fa51e2b0b changed only documents, and naming it reset the dry run's count, so the night's
      pass re-walked tasks already walked on the same app code.
    - Preflight 4: the dry run walks only the halves the round plans, last pass's blocking halves
      first; a stopped pass is finished, not restarted; a keyboard walk counts only with
      `keyboardOnlyMode: true`. Reason: 9 of the stopped pass's 33 walks went to T37 and T42,
      which round 1 does not run, while T47 and T48 got none, and two walks named "keyboard" were
      started without `--keys`.
    - Preflight 5: a community method whose two runs differ is graded against the session's own
      run. Reason: T46 to T48 accept six methods, `answers.md` holds Louvain's values only, and a
      fixed number for a method that does not repeat would grade correct work F.
    - Preflight 9: the gate keys walks by their half's folder and holds a half only with its three
      walks. Reason: `gateCheck` in `real.mjs` keys each pilot by the walk folder's own name, so
      `pilot/T40B/b1fa-pointer/` never counts as T40B, and once a half matched, one walk passed it.
    - Question 2 and a new measure report each card type with the number of domains it was reached
      on. Reason: T45 and T50 reach each card type on one domain per half.
    - Round 1: T51 runs at 4 and is judged; T44 joins T42 in round 2 at 4 (`roster.md`). Reason:
      coloring by a category is the commonest first styling act, and its key is the screen most
      likely to look right and answer wrong (question 6); names on the drawing were tested most in
      tier 1 and answer no study question. The total stays 56 and no persona's count changes.
    - `tasks.md`: T50 asks what "made the project color them" orange or green, not "draw". Reason:
      T50's success route reads "Why this look", where every unset color line's spoken name says
      "drawn". `draw` is kept on purpose in T43, T47 and T51 with its reason.
    - Not taken: T41 B's "missing" reworded in one half only (the halves already differ in dataset;
      a wording difference in one half would mix wording and data, the same limit T46 to T48 carry,
      and "missing" echoes no screen word); T51 B moved to College football's conferences (a half
      never piloted, needing new reference values and walks before round 1, on a task whose B half
      changed on 2026-10-18).
    - **Owed before round 1** (the gate refuses every session until these are done):
        - Finish the dry run on 1fa51e2b0b (or 52cb47a85a, the same app code): all three walks of
          T46 A to T50 B first, then T39 A (keyboard and detours), T41 B (keyboard), T43 A and B,
          T45 A and B, T51 A and B; triage the pass into `dry-run-r1-5.md` and `backlog.md`. The
          "Starts with" typing defect on T40 B is a blocking success-path defect: fix it in its
          shared part, refreeze, and walk T40 B and T50 A (both text-card routes) again; "Add a
          condition" needing a second click is triaged against the exit test.
        - Design engineer: `WALKS3` walks the five screens added on 2026-10-18, the "Starts with"
          typing check and `spoken.json`; `wording.mjs` joins irregular forms; `gateCheck` keys
          by half and checks the three walks and the build equivalence; each with a planted case.
        - Preflight 5's reference values for every community method on T46 to T48, two runs each.
        - Preflight 6 (both themes), 7, 8 and 9 on the frozen build.

- 2026-10-18 (round 1 build frozen): the study build is now 1fa51e2b0b, in
  `.study-builds/tier3-r1-1fa51e2b0b`. It replaces build 52cb47a85a
  (`.study-builds/tier3-r1d3-52cb47a85a`), the third dry run's build. No bar changed. The dry
  run's exit test had not been met on this build (the 2026-10-19 entry lists what was owed).
- 2026-10-18 (third review by the researcher, the user advocate and the red team; frozen for the
  round 1 build 52cb47a85a; no session has run):
    - Preflight 4's "until a pass finds nothing new" is replaced by an exit test (no blocking
      defect on a success path or listed detour, regressions under 10%, no reversed decision),
      triage against the new `decided.md`, and a pass incomplete while any planned half lacks its
      three walks. Reason: four passes found 344, 217, 151 and 129 defects; 41% to 55% of pass 4's
      came from pass 3's fixes or survived them, and three behaviors flipped between triages
      (a dimmed "+" as a Tab stop, Escape in the inspector, a card's remove button in the Tab
      order). Pass 4 skipped T39 A and B, T41 B and T46 A. The fourth-pass stop is gone: it named a
      pass already past. The gate (`real.mjs --gate`) already refuses a half with no pilot on the
      frozen build.
    - Bar 4: at most 10, twice the key's 5, as a fixed number. Reason: the key's T39 path was 5 on
      every build since 58556989e8, so "twice the key's 6" gave a false reason and 12 was 2.4 times
      the key. The red team's "keep 12, drop the derivation" was taken in part: the limit no longer
      follows the key.
    - Bar 5: an expert or audit finding is confirmed by a scripted repro or a measurement, not a
      second expert (the same model is not independent); the Layer token check is a measured
      4.5:1.
    - Bar 6: five screens on success paths and blocking traps join the walk (find with results, a
      node's Memberships and "Why this look", a node's own Style tab, the open shape list, a sample
      with the key on).
    - Grading, settled in `answers.md`: T46 to T48 accept any community analysis, with reference
      values read for each (the prompts never name Louvain); T48 B's filtered run is
      `Route: around` (no bulk credit); T44 A keeps `id`; T49 is graded by the drawing, and a
      style tree that differs is a finding about the design, not an F or a false done (which also
      makes the hand comparison with `revision` ignored unnecessary for the grade).
    - Wording (`tasks.md`): T46 and T50 drop "drawn", which every unset color line's name now says;
      "clusters" (B of T46 to T48) and "circles" (A) are kept with their reason, and what B typed
      into the analysis filter is a new measure. T51 B asks for the companies, not the agencies,
      so its halves no longer share one answer (both were green) and B tests sky blue.
    - Not taken: moving T51 B to `neighbors.csv`'s tie kinds (it moves the task to the Edge tab,
      a second property, in an unjudged 2-session task; the companies change fixes the shared
      answer with one word); rewording the B halves' "clusters" (it is the everyday word; the
      halves are reported apart instead). Recorded as limits for the report: volunteers and
      sources share one data shape, and in T46 to T48 the A/B difference cannot be split between
      the wording and the dataset.

- 2026-10-18 (round 1 build refrozen; no bar changed): the study build is now 52cb47a85a, frozen
  in `.study-builds/tier3-r1d3-52cb47a85a`; it replaces build 6dd0b00bd7
  (`.study-builds/tier3-r1d2-6dd0b00bd7`, kept unchanged). It was built from the committed tree
  at 52cb47a85a, with no uncommitted changes to graphty, graphty-element or compact-mantine.

- 2026-10-18 (round 1 pilots on 6dd0b00bd7; no bar changed): `answers.md`'s success paths now
  match the frozen build 6dd0b00bd7, as walked by the pilots in `rounds/r1d2/pilot/`. Step counts
  held except T45 B (15, walked for the first time since ed4351b258) and T46 (12: the folder's
  caret expands it without a click on the row; walked on B only). T48's cover route is 2 steps
  longer (a new line's italic `6366F1` is not set until another color is set first), and T49's
  remove-and-re-add route is S only when the line ends set to `6366F1`. T39's path is still 5, so
  bar 4 still reads "twice the answer key's 6" against a key of 5. `tasks.md` changed one detour
  line; no prompt was wrong. Owed before round 1: T46 A all three ways (no browser slot was free),
  T37 A by keyboard and T43 B by keyboard past the start screen. One new grading question for the
  Director, recorded and not changed: T46's prompt asks the program to "work out clusters" without
  naming Louvain, and the analysis filter's `cluster` lists Leiden, Label propagation, Markov,
  Spectral and Hierarchical beside it, while the success definition says "a Louvain run's
  clusters"; how a run of another of these is graded is open. The questions logged on 5bd16cda6e
  (T48 B's filtered run, T37's find-box rule) and before stay open.

- 2026-10-18 (round 1 build refrozen; no bar changed): the study build is now 6dd0b00bd7, frozen
  in `.study-builds/tier3-r1d2-6dd0b00bd7`; it replaces build 5bd16cda6e
  (`.study-builds/tier3-r1d1-5bd16cda6e`, kept unchanged). It was built from the committed tree
  at 6dd0b00bd7, with no uncommitted changes to graphty, graphty-element or compact-mantine.

- 2026-10-18 (round 1 pilots on 5bd16cda6e; no bar changed): `answers.md`'s success paths now
  match the frozen build 5bd16cda6e, as walked by the pilots in `rounds/r1d1/pilot/`. Paths got
  shorter where Fill "+" now adds the Color line at once and the from box arrives with its value
  selected (T38 12 steps, T40 A 10 and B 11, T41 18, T42 10 on both halves, T39's new-layer route
  7); T39's path is still 5, so bar 4 still reads "twice the answer key's 6" against a key of 5.
  Owed before round 1: T45 B (not walked on this build; its from box likely saves a step) and T46
  A by keyboard (cut off on the start screen). Two grading questions for the Director, recorded and
  not changed: T48 B's route of a Filters step, a Louvain run while it is on, then the step turned
  off, ends on the target look and count but with clusters worked out on the 12 shown, and no
  `Route:` value fits it; T37's find-box rule (`=degree > 30`, through "Did you mean") now names
  the most connected, and is graded by its length like any route. The three questions logged on
  2026-10-17 stand. In `tasks.md` the T41/T48 detour line about a card left with no value was out
  of date (a notice now says it was dropped, except after a click on the drawing); no prompt was
  wrong.
- 2026-10-18 (no bar changed): the study build is now 5bd16cda6e, frozen in
  `.study-builds/tier3-r1d1-5bd16cda6e`; it replaces build ed4351b258
  (`.study-builds/tier3-r1d1-ed4351b258`, kept unchanged). It was built from the worktree, which
  also held uncommitted changes to graphty, graphty-element and compact-mantine at the time, so
  the commit alone does not reproduce it; the frozen copy is the build.
- 2026-10-17 (round 1 pilots on ed4351b258; no bar changed): `answers.md`'s success paths now
  match the frozen build ed4351b258, as walked by the pilots in `rounds/r1d1/pilot/`. Paths got
  shorter where focus now lands in the color box or a card's box (T38 13 steps, T40 A 11, T41 19,
  T42 A 12, T45 A 16); T39 is still 5, so bar 4 still reads "twice the answer key's 6" against a
  key of 5, for the Director to settle between rounds. The two build defects that decided tasks on
  58556989e8 are fixed on this build: T50's layer opens by name with its rule, and T42's number
  card shows an inline error instead of crashing (`10,000` is taken; `$10,000` is refused with a
  message). Three grading questions for the Director, recorded and not changed: T37 also accepts a
  node's Degree matched against the Values tab's "Highest" (both on screen before any run), which
  makes a 3-step route; T44 A keeps accepting `id` as the name though it drops the spaces
  (`MlleVaubois`); T49's "remove the Color line alone" draws the starting look while the tree holds
  no color, so it is F by the tree while the screen shows it done. In `tasks.md` one detour line
  for T40 A and T50 A was out of date (focus lands in the card's text box) and now says so; no
  prompt was wrong.

- 2026-10-17 (round 1 build refrozen): the study build is ed4351b258, served from
  `/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1d1-ed4351b258`. It replaces
  58556989e8, served from `/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1-58556989e8`.

- 2026-10-17 (round 1 pilots on 58556989e8; no bar changed): `answers.md`'s success paths now
  match the frozen build, counted one click or entry per step. Bar 4 still reads "at most 12,
  twice the answer key's 6": the key's T39 path is 5 steps on this build, and the limit stays 12
  because bars change only by the Director between rounds. Two build defects decide tasks and
  fall under preflight 4: a colleague's project opens with its layer not joined to its row, so T50's
  rule is on no screen (both halves); a number card whose low end goes above its high end crashes
  the inspector (T42). The look hash keeps each layer's `revision`, so T49's exact-retype route
  needs graders to compare the style trees with `revision` ignored until `../tool/measure.mjs`
  strips it. `tasks.md`'s prompts were walked and none was wrong.

- 2026-10-17 (round 1 build frozen): the study build is 58556989e8, served from
  `/home/apowers/Projects/graphty-monorepo/.study-builds/tier3-r1-58556989e8`. No build was frozen
  before it.
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
