The study runs on build 1e123d7d33 served from /home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1d1-1e123d7d33

Frozen on 2026-11-02 for the tier 5 rounds. The bars below do not change after this line. Each
refreeze of the build is written on the first line, with the build before it named in the change
log; the first build after this freeze must carry the matches strip's search and the large-graph
repaint fixes ("Before the first session", item 1).

# Success criteria and round plan: choosing which nodes (tier 5)

Tier 5 studies how a **returning** graphty user chooses which nodes a result applies to, with the
new selection editor in its two places: a style layer's Which nodes (the **style selector**) and a
Data place filter card (the **import filter**), as `../../selection-groups/spec.md` sets them out.
Both are the **workspace UI** (spec section 3.0): a read-only outline in the sidebar at rest, and
one non-modal workspace over the canvas for every edit. The tasks cover a simple choice in each
place, two ways in ("Or"), an exception, everything within k hops of a named node, a choice by an
algorithm's value and by position, a chain of steps on a big network, the landing page's pointing
effect, changing what a colleague built, a count over just the strong ties (the placement study's
weak-links task) and one choice in a network of 50,000 nodes.

What this round measures: the **first use of the new editor by people who already know the app**,
including its data features and tier 4's condition cards. It does not measure the cost of a second
use (T77 is the only task where a person reopens a rule, and "returning" means knowing the app, not
a second use of the editor), and it does not study saved selections (sets) or hierarchy cuts,
which are not in this build (`decided.md`). The report says both.

Tasks: `tasks.md`. Answer key: `answers.md`. Participants: `roster.md`. Binding decisions:
`decided.md`.

## Grades

Each session is graded against the task's success definition in `answers.md`, never from the
participant's own rating, from what the session recorded: its screenshots (the last one first), its
step log (`route.jsonl` and the step notes), and its end-state records (`work.json`, `styles.json`,
`data.json`: each layer's selection and count, each filter card with its steps and count, and the
node, edge, visible and selected counts).

- **S** -- success on the answer key's path or an equivalent one.
- **SD** -- success after a detour the participant recovered from by themselves.
- **P** -- part of the task done (for example the filter right and the layer wrong, or a count off
  by the answer key's named near-miss).
- **F** -- failed or gave up.
- **VOID** -- the tool or the run failed, or the participant opened a file outside its own folder.
  A void session is re-run once as `<id>b`.

A **wrong turn** is a step taken before the session first reaches the success state that leaves
the answer key's path and is later taken back or abandoned: a place the task does not need, a menu
or picker closed with nothing chosen, an undo of the participant's own step, a step or group
removed after it was made. Cancel used as if it meant "close" is one wrong turn. Never a wrong
turn: a hover or a point with no click, a check made after the success state, and a step taken
because a tool line contradicted its screenshot (that is a tool defect, reported as one).
`answers.md` ("Wrong turns, worked examples") has one example of each kind. A **false "done"** is a
participant saying it is finished while the screen or the end-state records show otherwise.

## Bars that decide "done" (all must hold in the round)

| #   | Bar                           | Target                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Counted from                                                                                                                                                                                       |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Task success                  | At least 75% S or SD of each task's valid pointer sessions, and no dataset half with 0 successes. On a 2-session task (T72, T75, T77, T79) that means 2 of 2; on a 4-session task (T70, T71, T73, T74, T78), 3 of 4. Sam's sessions are not counted here                                                                                                                                                                                                                                                                                           | The grades' first lines (`Grade:`)                                                                                                                                                                 |
| 2   | False "done"                  | 0 in the round                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | The grades (`False done:`)                                                                                                                                                                         |
| 3   | Wrong turns                   | Median at most 2 per task, counted as "Grades" defines a wrong turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | The grades (`Wrong turns:`)                                                                                                                                                                        |
| 4   | Severity 3 and 4 open         | 0 confirmed severity 3 or 4 problems                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Grades, the end-state check, the expert walkthroughs and the screenshot audit (the table below), after both skeptics                                                                               |
| 5   | Keyboard                      | Sam's sessions S or SD, with no confirmed keyboard block; 0 keyboard blocks the accessibility specialist finds on any tier 5 screen that a `real.mjs --keys` script reproduces; and 0 serious or critical axe findings on every tier 5 screen, at 1440 x 900 and 900 x 700, in both themes                                                                                                                                                                                                                                                         | Sam's grades; the accessibility walk with its `--keys` repros; the scripted walk of the tier 5 screens, once per theme                                                                             |
| 6   | The owner's data rules        | 0 confirmed violations: a sentence on screen where a control would do; a hotkey with no visible button showing its key; configuration reachable only from the table; "links" or "ties" on screen for edges; "Select", "Filter to" or "Filter out" on screen; an approved surface removed or restyled other than as `spec.md` section 13 allows                                                                                                                                                                                                     | The content designer's word count, the Figma product designer's and the interaction designer's walkthroughs, confirmed as below                                                                    |
| 7   | Figma and graphty consistency | 0 confirmed consistency findings of severity 3 or 4, and at most 5 of severity 2 open, each listed in the report with its fix or its reason                                                                                                                                                                                                                                                                                                                                                                                                        | The Figma product designer's and the interaction designer's walkthroughs, confirmed as below                                                                                                       |
| 8   | Cost on core tasks            | Median steps per core task half (T70, T71, T73, T74, T78) at most the answer key's path plus 3                                                                                                                                                                                                                                                                                                                                                                                                                                                     | The step logs, against each half's "Path steps" in `answers.md` on the frozen build (`tool/steps.mjs`)                                                                                             |
| 9   | The owner's feedback          | The calm-first check with 0 confirmed findings of severity 3 or 4 and at most 3 of severity 2 open, each listed with its fix or its reason. Also counted in that allowance of 3: a screen element of the selection editor named in the follow-up's "least sure" answer by two sessions on different task halves, at any rating; and each wait on T79's path, in a session or the scripted 50,000-node walk, of more than 10 s with a sign of work but no progress. The median rating is reported as a measure only (the rating check did not hold) | The calm-first check, confirmed as below; the follow-up answers (`Overwhelm:` in each grade, coded by the screen element the "least sure" answer names); T79's `route.jsonl` and the scripted walk |

**Severity** (bars 4, 7 and 9): 4 -- a result wrong with no sign (a layer or filter that holds more
or fewer than its count says, a preview that changes what is saved, styling lost after picking); 3
-- a task blocked for most people, or a result a reader would misread (a preview read as the saved
result, a count over a base nobody can tell); 2 -- friction a person recovers from; 1 -- wording or
cosmetic; 0 -- not a problem.

A screen element named in the "least sure" answer that is not part of the selection editor (the
Fill color box, the inspector) is listed in the report and goes to the backlog; it does not count
toward bar 9, but a scripted repro can still make it a severity 3 for bar 4.

**Each finding counts once.** A finding that fits two bars' lists (a control out of line is both
a consistency and a calm-first finding) counts toward the one with the smaller allowance (bar 9's
3 before bar 7's 5) and is listed there, with a pointer from the other. A severity 3 or 4 also
fails bar 4, whose allowance is 0.

**Large graphs** (the owner's "review all your interfaces for what happens with large graphs"),
read from `route.jsonl` and the screenshot: a list at 50,000 nodes that is not bounded, or has no
count or no search, is severity 3; input blocked for more than 1 s with nothing on screen saying
work is under way is severity 3 (a reader takes it for a hang); busy for more than 10 s with a sign
of work but no progress is severity 2, and severity 3 once a session gave up or retried during it.

**Confirmed** means one of: seen in two sessions on different task halves; one session plus a
scripted `real.mjs` repro; an expert finding plus a scripted `real.mjs` repro; an expert finding
about something a screenshot shows (truncation, overlap, a clipped list, a filled chit at rest, the
words on screen, a count of what is drawn, a gap, a row break, a control out of line), also seen in
the screenshot audit. The audit confirms nothing else, except where the calm-first check says so.
Each confirmed finding survives two skeptics before it counts.

**Which bar each expert walk and the audit feed** (every round and the dry run):

| Walk or audit                                                                         | Feeds                                                                                     |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Figma product designer (every editor screen against Figma and graphty's other panels) | Bars 6 and 7; a severity 3 or 4 finding also bar 4                                        |
| Interaction designer (keys, focus, Escape, undo, commit across both hosts)            | Bars 6 and 7; a severity 3 or 4 finding also bar 4                                        |
| Accessibility specialist (every editor screen by keyboard and `real.mjs --read`)      | Bar 5 (a keyboard block counts once a `real.mjs --keys` script reproduces it); bar 4      |
| Content designer (words at rest per editor screen)                                    | Bar 6; a screen over the words-at-rest budget is a severity 2 calm-first finding (bar 9)  |
| Calm-first check (the owner-lens expert)                                              | Bar 9; a severity 3 or 4 finding also bar 4                                               |
| End-state check (script)                                                              | Bar 4                                                                                     |
| Scripted walk of the tier 5 screens (axe, wording, the 50,000-node lists)             | Bars 4 and 5; the only source of the 900 x 700 screens                                    |
| Screenshot audit (design engineer)                                                    | Confirms the others' screenshot-visible findings for bars 6, 7 and 9; finds nothing alone |

**Bar 7, what consistency means.** Each item is checked in both hosts, and a difference between the
hosts that `decided.md` does not settle counts as a finding:

- **One workspace, one picker**: both hosts open the same workspace (header, outline, canvas as
  the preview, matches strip, properties) with the same value picker entries in the same order
  (Time window only in the filter), the same Except switch and "..." verb items, the same pane per
  kind, the same row anatomy (spec section 3.1), the same Condition... and Or..., and "+" only in a
  section header (spec 4.1).
- **Figma's patterns where Figma solved the problem**: groups as Layers rows and steps as Fill
  rows, the outline beside one property pane, Subtract as the Except switch's tooltip, the
  eyedropper-style target (Pick on canvas), 24 px controls and 11/16 type, hints only in tooltips.
- **graphty's own patterns**: Mod+] / Mod+[ / Mod+D / Delete / F2 the same on the selection's rows
  and the style tree's; Escape closes the innermost thing and keeps edits (on the workspace it is
  Done); Cancel undoes the whole edit as one step; one Tab stop per list walked with arrows; the
  same count and what its click does per host (spec section 2); the same words (Filtered graph,
  Full graph, Hovered or selected, Selected (N), So far, No match).
- A consistency finding is confirmed as any other expert finding.

**Bar 6, how each rule is confirmed**: a hotkey with no visible button and configuration reachable
only from the table, by a scripted `real.mjs` repro; "links" or "ties", a sentence at rest, a filled
chit at rest, "Select" / "Filter to" / "Filter out" and an approved surface restyled, by the screenshot audit. The approved Which nodes
card and attribute picker change as `spec.md` section 13 says; their new reference screenshots are
listed in `decided.md` before the audit uses them.

**The end-state check** (bar 4) runs over every session's `data.json` and `styles.json`: each
layer's selection count against the members the element paints, each filter card's count chip
against what the element shows and selects, and the styling after the session against the styling
before it with every preview ended (a layer left suspended is a severity 4 candidate the script
itself confirms).

**Expert walks, every round**: the accessibility walk covers the screens Sam's tasks may not reach
(the reference picker, the Except switch, an Or group, Advanced with Edges where, Clear and Cancel,
the 50,000-node checklist), at 1440 x 900 and 900 x 700; the content designer counts words at rest
against tier 4's `words-at-rest.md` budget; the screenshot audit covers every screen the sessions,
pilots and the scripted walk reached, at every size they ran. Findings of severity 1 and 2 gate
nothing outside bars 7 and 9; the report lists them by screen.

**The calm-first check** (bar 9), from the owner's words of 2026-11-01
(`owner-feedback-2026-11-01.md`: "confusing and overwhelming, they make me want to walk away").
Before the check, the director writes for each screen below the controls its step needs, taken
from the answer key's paths. The owner-lens expert then opens each screen at 1440 x 900 and at
1280 x 800 (where the preview is narrowest) and writes for each, in this order: where the eye lands
first; whether the next step's control is the most prominent thing; the count of controls, counts
and words drawn that the step does not need; the words at rest against the content designer's
budget; every blank column or pane, row break, and control out of line with its row.

- Screens: a new rule with its picker open, a step selected, the Except switch on, an Or group,
  Advanced with Edges where, a reopened colleague's card, the reference picker on 11 nodes and on
  50,000 (closed, typed, a result chosen), the 50,000-node checklist, and both hosts' sidebar
  outline at rest.
- Severity 3: the eye lands first on something other than the graph, the rule's rows or the next
  step's control; two things doing one job (two tables, two counts of one result).
- **Two counts of one result** means two counts that cannot differ in any state the tasks reach.
  Before rating a pair of counts 3, the expert names a reachable state where they differ (a second
  filter card, a second step, a hidden layer) or shows that none exists, and classes each count
  against the count rules of `../../selection-groups/spec.md` sections 2 and 3.0. Counts that
  differ in a reachable state are two facts, not a double. A count the spec rules but the screen
  contradicts goes to `decided.md` for a decision, not straight to severity 3.
- **Every "+"**: the check lists each "+" on each screen with its accessible name and what it adds.
  Two "+" on one screen that add different kinds of thing, with no visible word telling them
  apart, are a severity 2 finding; clicks on an off-path "+" in two sessions on different task
  halves confirm it.
- Severity 2: anything drawn at rest that nothing on the screen needs; a screen over the
  words-at-rest budget; a blank column or pane the step does not use; a row break or a control out
  of line with its row; a step pane that opens with Advanced open when the person did not open it.
- Confirmed: the counts, words, gaps, row breaks and alignment by the screenshot audit, as any
  screenshot-visible finding; "where the eye lands first" when the screenshot auditor, reading the
  same screenshot without the expert's answer, names the same thing.
- **Words at rest** are counted per screen by the scripted walk (`bars.mjs --tier 5`), against
  this budget, fixed now from tier 4's rules (`../tier4/words-at-rest.md`, principle 5): the whole
  screen with the sidebar outline at rest, 50 app words at most; the workspace open on a step,
  counted apart from the screen behind it, about 30 and 40 at most; every row and section heading
  3 words at most. Until the walk counts them, "Cramped" below is "not re-tested".
- **Calibration, blind.** A second owner-lens expert runs the check on the rejected build and the
  frozen build from neutral folder names and maps each finding to one of the owner's six
  complaints. Where the rejected build does not come out worse on a complaint, the report says the
  check could not be shown to stand in for the owner on that complaint; the check still gates.
- It runs in the dry run and every round, before the sessions are read, so the reported overwhelm
  cannot steer it.

**The owner's six complaints, and what checks each** (anything with no check is reported as "not
re-tested", never as passed):

| The owner's complaint (2026-11-01)                                    | What checks it                                                                                                  | Pass rule                                                                                                                                 |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Cramped, hard to find and focus on what matters                       | The calm-first counts, where the eye lands first, and the scripted words-at-rest count                          | Bar 9's calm-first limits and the words budget                                                                                            |
| Disorganized: why buttons sit where they do, empty spaces, row breaks | The calm-first gaps, row breaks and alignment at 1440 x 900 and 1280 x 800; the audit at 900 x 700              | Bar 9's calm-first limits                                                                                                                 |
| No progressive disclosure                                             | The calm-first check: Advanced closed at rest on every step pane a task reaches (T78's is opened by the person) | Bar 9's calm-first limits                                                                                                                 |
| "Select", "Filter to" and "Filter out" not understood                 | The screenshot audit of every screen, including a filter card in a project saved by a tier 4 build              | None of the three words on screen; one is a bar 6 violation                                                                               |
| Two "+" that look alike                                               | The calm-first check's list of every "+"; the step logs' clicks on an off-path "+", per "+"                     | No two "+" on one screen adding different kinds of thing with no word telling them apart (severity 2, bar 9)                              |
| "While has nodes" unviable at 50,000                                  | The scripted 50,000-node walk (item 5), the calm-first check's 50,000-node screens, and T79                     | Every list bounded, with a count and a search, and no wait finding of severity 2 or more on T79's path ("Large graphs"; counted in bar 9) |

**The rating check** (bar 9's median). In the placement study every placement rated 2 or 3,
including the cards the owner then called overwhelming, so the rating has not shown it can tell
his complaint apart. In the dry run, T70 A and T70 B each run once on the build the owner rejected
(7dfd51c277, built from source; if it cannot be built, 7ca4cae647's kept copy under the main
checkout's `tmp/design-studio/tier5/prep/build-7ca4cae647`) and once on the frozen build, with the
same personas and follow-up; these four sessions are an instrument check, not round sessions, and
the only walks on a build other than the frozen one. The median gates bar 9 only when the rejected
build's two ratings average at least 2 points above the frozen build's; otherwise the median is
reported as a measure and bar 9 rests on the calm-first check and the named reasons. The dry run
also runs the calm-first check on the rejected build's card screens: it must find there at least
one severity 3 or more than three severity 2 before it gates, or its limits are changed (with the
reason in this change log) until it does. Both ran on 2026-11-02: the rating check did not hold
(a mean gap of 1.5), so the median is a measure this tier; the calm-first check failed the
rejected build, so it gates.

## Before the first session

The round may not start until all of these hold on the frozen build. `real.mjs --gate` refuses
items 1 to 7 and 9 (each check is listed in `tool/README.md`, "Before a round's first session: the
gate"); item 8 is the studio's own judgment. `tool/steps.mjs` counts tier 5's core tasks,
`bars.mjs --tier 5` is item 5's scripted walk, `endstate.mjs` checks each style layer, and
`score.mjs` scores bars 1 to 3 and bar 9's named elements from each grade's line
`Overwhelm: <1-7> -- <screen element> -- <the "least sure" answer, in the participant's words>`.

1. The first line of this file names the frozen build, and that build carries 4fb3f45d59 (the
   matches strip searched first; the value picker's list its own scroller) and d801a0fddd (one
   node batch a frame for large repaints) (`git merge-base --is-ancestor`). Items 5, 8 and 9 and
   T79's timings in `answers.md` are read on that build, never carried over from d3fda9f2b6.
2. `answers.md` holds no "pilot to confirm" and no "the dry run reads": every value and path is
   read off the frozen build, and each "Build notes" line names the frozen build or is removed.
3. Every setup in `roster.md` starts on the frozen build without `SETUP FAILED` (the two
   50,000-node setups after `python3 design/ui/studio/tool/files/big-50k.py`).
4. `real.mjs --end` writes each layer's selection and each filter card's steps into the end-state
   records, and the end-state check runs on a pilot's folder.
5. A scripted walk of the tier 5 screens, in both hosts, at 1440 x 900 and 900 x 700, once per
   theme: the read-only outline at rest, the workspace on a new rule with its picker open, a step
   pane, the Except switch, the reference picker, an Or group, Advanced with Edges where, No
   match, the matches strip's Group column; and at 50,000 nodes the checklist, the reference
   picker (closed, typed, a result chosen), Selected (N), Hovered or selected, the matches strip,
   the outline of a step with many values, and every "N more" and "Check N". It passes
   `wording.mjs` against `tasks.md` with the frozen build's own strings, option labels and the
   catalog's search keywords (prompts only: nothing after "Follow-up" is graded); runs axe for
   bar 5; counts words at rest per screen against the calm-first budget; and checks every
   50,000-node list against "Large graphs", with the rejected build's "While has nodes" list at
   50,000 as a case the check must flag.
6. Each core task half (T70, T71, T73, T74, T78) has one "Path steps" number in `answers.md`, read
   off the frozen build (bar 8), and `tool/steps.mjs` counts tier 5's core tasks.
7. The approved surfaces' new reference screenshots are listed in `decided.md` (bar 6).
8. **No half blocked and no bar failed before a session.** Every task half has a success walk that
   reaches S on the frozen build, and every severity 3 or 4 candidate known before the round is
   fixed and its fix re-walked, or refuted by both skeptics with the reason written down. The
   candidates are read from these files on the frozen build: every `ok:false` in
   `rounds/<round>/bars/bars.json` and `bars-light/bars.json` (a 50,000-node list with no search
   is one); every serious or critical axe finding there; every severity 3 in the round's
   `calm-first-frozen.md`; every severity 3 in the answer key's build notes; and a scripted repro
   of a new layer's Fill box showing a color the layer does not paint (two rating-check sessions
   named it). This is the studio's judgment, read from those files; the gate reads only some of
   them.
9. The rating check and the calm-first check have run on the rejected build (bar 9), and the
   calm-first check has run on the frozen build over every screen it lists (the reference picker
   on 11 nodes and on 50,000, the 50,000-node checklist, the words at rest) at 1440 x 900 and
   1280 x 800, with each of its findings read by the screenshot audit and both skeptics. A bar 9
   that holds because a listed screen was not walked does not hold.

## Measures reported every round (not gates)

- Median steps per task half against the answer key's path, for every task.
- The first door each session tried (the Style tab's layer, the Data place's filter, the table,
  Analyze, the find box, the canvas), and which route each success took.
- **The owner's two questions**: from T70's follow-up and the step logs, how many style-layer
  readers read the group colors as a preview, and which default they want; from T71's follow-up
  and the step logs, how many used the matches strip under the drawing while picking, whether it
  helped or got in the way, and how many hid it.
- **Overwhelm** per task half (a measure), with each "least sure" answer coded by the screen
  element it names; beside them the placement study's 2 to 3 and the rating check's two builds.
  Wrong turns made inside the Fill color box are tagged as the box's, so a failed bar 3 or 8 can be
  traced to it rather than to the selection editor.
- **The weak-links task** (T78): the first door each session tried for "just the strong ties"
  (the step's Advanced, the Data place's filter, Analyze, the table), and how the participant told
  the scope was applied. The Edges where fix is reported as re-tested only if at least one session
  per half reached it through Advanced; otherwise "not re-tested", even when bar 1 holds.
- **Finding Edit** (T77): each session's first action on the read-only outline (its row, Enter, or
  Edit).
- **The two "+"**: every click on a "+" that is not on the path, per "+".
- **50,000 nodes** (T79): each edit's input delay and busy time from `route.jsonl`, and whether the
  participant waited, retried or gave up during one.
- **Algorithms in the editor**: for T74 B and T75, whether the participant understood that picking
  a measure ran it, and whether a run they did not ask for surprised them.
- **Fix coverage**: for each `decided.md` polish fix a task reaches, the sessions that reached it
  on its route, or "not re-tested". An unreached fix is never reported as passed. The placement
  study's fixes are reported as a rate against its baseline (`decided.md`), with numerator and
  denominator from the step logs: a wrong value ticked in a checklist (6/9), the wrong row deleted
  (4/9), the place lost to Escape (5/9), a guessed word (3/9), the weak-links filter found (1/3).
  A fix whose rate is not better than its baseline is "not confirmed".
- **One-domain evidence**: a feature only one half reaches is reported as evidence from one
  domain, and a wording fix it carries is not credited as general: a measure that runs when picked
  (T74 B), a step that depends on the steps before it (T75 A), a reference found by name (T73 B
  has names designated; A finds James by the reference search), Degree In or Out on a directed
  network (T78 B). Round 2 plans a parallel half for each.
- Problems by kind and severity, and by the package that owns them (graphty-element, graphty app,
  compact-mantine).
- Sessions run on Sonnet after an API error, counted apart.
- With same-model participants on 2 to 4 sessions per task, a failed bar is strong evidence and a
  held bar is weak; the report says so beside bar 1.

## Round plan

- **Dry run first**: every task piloted three ways (success path, its commonest detours from
  `tasks.md`, keyboard) on the frozen build, plus the rating check. The dry run fixes a crash, a
  blocked task, a result that would spoil a grade on a success path or a listed detour, and every
  severity 3 or 4 candidate a scripted repro confirms (before the first session, item 8);
  everything else goes to the backlog. Each decided fix gets its own acceptance check in the dry
  run, so an unbuilt fix is found before the round. After this freeze, at most 2 fix passes,
  limited to the gate's open items (item 8's files) and anything new that spoils a grade. After
  them round 1 starts: a half still blocked is not run and is reported "blocked, not run"; a bar
  still failing by a known, named cause is reported "failing before the round", and its sessions
  still run. The studio does not stop for the owner on this cap.
- **T76 runs in the dry run only.** Its success path is the add menu's preset (two steps that never
  open the workspace), so its sessions moved to T78, the placement study's weakest task (1 of 3
  in the sidebar version). The round reports T76 as "piloted, no sessions".
- **Sessions**: at most **30 in a round**; `roster.md` plans 30. Core tasks (T70, T71, T73, T74,
  T78) run 4 pointer sessions each (2 per half); T72, T75, T77 and T79 run 2 (1 per half); Sam
  runs 2 more, keyboard only, counted only in bar 5.
- At most **8 participants alive at once**.
- **No step cap.** A session ends when the participant is done, gives up, or repeats without
  progress.
- **Step notes** are one or two sentences, in character.
- **Retry on an API error**: the same prompt from a clean folder, then once on Sonnet; the model is
  recorded in the session's grade, and Sonnet sessions are counted apart.
- **Every start reflects the person's history** (`roster.md`): a saved project or a setup file
  as they or a colleague left it; a start is empty only where the task is about starting fresh,
  and no tier 5 task is.
- **The follow-up** is asked by the tool after the participant's first `--end`, in every task: the
  overwhelm rating first with the moment the person was least sure where to look or what to do
  next, then in T70 and T71 the owner's question, worded so it names no behavior.
- **Between rounds**: the adversarial reviews (both skeptics per finding), the decided fixes made,
  landed and re-piloted, then the next round on a new frozen build.

## When the studio stops

- All nine bars hold: the study is done; the director writes `report.md`.
- A round with no progress: no bar moved from failing to holding and no confirmed severity 3 or 4
  problem was closed since the round before.
- A one-way-door decision (a breaking published API change, a compact-mantine change away from
  Figma, or a product question `decided.md` does not settle): the studio stops and asks the owner
  once, recorded in `../owner-decisions.md`.
- The safety cap: 2 dry-run fix passes after the freeze before each round (then the round starts,
  as the round plan says), and at most 3 rounds.

## Change log

- 2026-11-01: written for tier 5 (the selection editor in the style selector and the import
  filter), before any session. The bars follow tier 4's, with these changes, each with its reason:
    - Bar 7 (Figma and graphty consistency) is new: the owner asked the studio to keep the editor's
      interaction patterns consistent with Figma and the rest of graphty, and the editor lives in
      two hosts that must behave as one.
    - Bar 6 adds a filled chit at rest to what the audit confirms: `spec.md` section 3 makes the
      chit hollow at rest so it is never read as a layer's paint.
    - The end-state check adds the styling after the session against the styling before it: the
      preview suspends every layer, so a preview that never ends is data lost with no sign.
    - The owner's two questions (the table while picking, the group colors while picking) are
      measured from two follow-ups, not graded: `decided.md` settles both for this build.
    - At most 4 participants alive at once (the studio's standing rule), where tier 4 ran 8.
- 2026-11-01: preparation pilots on build 7ca4cae647 (before polish round 3's fixes), recorded as
  "Build notes (7ca4cae647)" in `answers.md`. Three can spoil a grade and go to the dry run:
  T75 A's "of those left, the largest piece" has no route (Largest component offers no Computed
  on), the date card's "how to match" select never leaves Before (so no prompt asks for After or
  Between), and a reference cannot be found by name when no column is designated as the name
  (T73 A keeps this start on purpose and lists the find-box route).
- 2026-11-02: moved to the workspace UI (spec 3.0: a read-only outline at rest and one non-modal
  workspace for every edit), with these changes, each with its reason:
    - Two tasks added: T78, a count over just the strong ties (the placement study's weak-links
      task, now answered inside the step by Advanced's Edges where), and T79, one choice in a
      network of 50,000 nodes (the owner's review: "review all your interfaces for what happens
      with large graphs"). Four sessions more, 30 in all, the round's cap.
    - Bar 9 is new: the owner's feedback bar (reported overwhelm, median at most 2) and the
      calm-first expert check, from his review of the cards ("overwhelming, they make me want to
      walk away"); every task's follow-up asks the rating.
    - Bar 7 and the walks name the workspace's controls (Except switch, Condition... / Or...,
      Clear, Cancel, Done, No match) where they named the verb menu, the effect segment and the
      preview key, which the workspace no longer draws.
    - The answer key's paths and final screens were re-read on fc1d7ee4f6; its build notes list
      what the walks saw (`answers.md`, "Build notes (fc1d7ee4f6)"). T75 A is still blocked (no So
      far on Largest component).
- 2026-11-02, after three reviews of the criteria (researcher, user advocate, red team), then
  frozen on d13c2ff3da for the dry run. Each change with its reason:
    - Bar 9's median gates only after the rating check: the placement study's ratings were 2 or 3
      for every placement, including the cards the owner called overwhelming, so the rating has not
      shown it can see his complaint. Added: no screen named as the reason for a 4 or more in two
      sessions on different halves (turns a feeling into a finding that can be fixed and credited).
    - Bar 9's calm-first check gates severity 2 (at most 3 open) and counts what is drawn: the
      owner's complaint is mostly severity 2 clutter, which gated nothing; counts and gaps are
      visible facts the audit can confirm, where "where the eye lands" alone could never be
      confirmed. Run at 1280 x 800 too, where the preview is narrowest. The check must fail the
      rejected build before it gates.
    - The owner's six complaints mapped to a check each: a fix no check re-runs must not be
      reported as passed.
    - "Large graphs" severities and the 50,000-node walk of every list (reference picker, Selected
      (N), matches strip, "N more"): the owner's own example was the reference list at 50,000,
      which no task, walk or calm-first screen reached; T79 waits of 3 s and 14 s had no grade.
    - Bar 5 counts keyboard blocks the accessibility walk finds and a `--keys` script reproduces:
      Sam reaches only T70 A and T71 A, so blocks on the reference picker, Except switch, Or group
      and Advanced gated nothing.
    - The wrong-turn rule counts only before success and never a hover: tier 4's bar 3 was raised
      by checks after success and by hovers, counted differently by different graders.
    - The expert-to-bar table, and "experts feed bars 4 to 7" corrected to include 9.
    - Before the first session, item 8: no half blocked and no known severity 3 candidate open,
      and the dry run may fix such candidates. Five were known on fc1d7ee4f6; round 1 would have
      failed bars 1, 4 and 9 by construction, as tier 4's round failed bar 5 on a backlogged axe
      defect. Item 2 also refuses "the dry run reads", which passed the old check.
    - T78 is a core task (4 sessions) and T76 runs in the dry run only: T76's path never opens the
      editor, and T78 is the only re-test of Edges where. The round stays at 30 sessions.
    - Follow-ups ask the rating first in every task, and T70's and T71's questions no longer name
      what the drawing did ("changed its colors for a while" told the person it was temporary).
    - Prompts: "either direction" (T73 B, T78 B) matched the Connected choice "Either direction"
      and Advanced's "Either"; "neighboring" (T78 B) matched Degree's search keyword "neighbors",
      the very alias T78 re-tests; "instead of" (T77 A) matched the step menu's "Add instead". The
      wording check now also compares option labels and the catalog's search keywords.
    - At most 8 participants alive at once, where it was 4: the machine-wide browser pool is 8
      (`tool/with-browser.sh`), and it is what bounds a round.
    - Not taken: changing bar 9's median target from 2 (the user advocate's "out of reach" may be
      right, and the rating check decides whether the median gates at all); keeping
      "neighboring" in T78 B as a natural word with a dry-run detour (the alias makes it a direct
      route, not a detour).
- 2026-11-02: refrozen for round 1 on baac78342b (master merged in, served from
  `.study-builds/tier5-r1-baac78342b`). The build before it was d13c2ff3da, served from
  `tmp/design-studio/tier5/builds/tier5-r1d1-d13c2ff3da`.
- 2026-11-02: `answers.md` matched to baac78342b from the round 1 pilots (every task but T72 A and
  T76); no bar changed and no prompt was wrong, so `tasks.md` is unchanged. Each change with its
  reason:
    - T74's path (By position, both halves) is marked blocked: on a Results step started in the
      editor, By position removes the test's controls and takes no number. The key's own fallbacks
      are spelled out (a typed lower bound with its cut values; B by editing Analyze's layer, A's
      equivalent graded P because it recolors everyone else). Item 8 under "Before the first
      session" is not met while this stands.
    - T75 A is no longer blocked: Connected components' Piece size, computed on So far with a
      lower bound of 100, leaves 105; the Largest component route stays P at 112.
    - T73 A: the reference search does not find a name, so the path types `v02` read off the
      matches strip (still 12 steps); the find-box route is 18. Analyze's Steps away, narrowed to
      0 to 2 in its own layer and filled one color, is ruled an equal result for both halves (it
      is a style layer holding the right set, as T74 already accepts a run's values); a layer made
      from a canvas selection is not success.
    - T72 B's "not before 2000" equal route removed: the date step's mode select never leaves
      Before, so the Except switch is B's only route.
    - T77 B: the second-card trap leaves 1 gauge in the picture, not 2 (only G09 is deep and sends
      readings); the path is 15 steps by pointer because a click on the card opens nothing.
    - Grader notes added for what every path meets on this build (the layer name box in rename
      mode, "Fill" as the row's "+", fields that apply as typed, the key titled by the layer's
      name, E4572E spoken "red") and for counts that are not the picture's (a hiding layer's
      "Show:" key, the node table's "Matches only" list after Done), plus "Build notes
      (baac78342b)" and the T79 timings read on this build.
- 2026-11-02: the dry run's second build, 797a4f6b47 in `.study-builds/tier5-r1d1-797a4f6b47`,
  replaces baac78342b (`.study-builds/tier5-r1-baac78342b`). It carries the first dry-run pass's
  fixes, among them the main table's columns and a test's mode kept as the step's own.
- 2026-11-02: `answers.md` matched to 797a4f6b47 from the dry run's targeted re-pilots (T70 B, T72
  B, T73 A and B, T74 A and B, T75 A, T77 B); no bar changed and no prompt was wrong, so `tasks.md`
  is unchanged. Each change with its reason:
    - T74's path is no longer marked blocked: By position on a Results step started in the editor
      now takes the number and keeps it, both halves walked in 12 steps. Item 8's T74 block is
      cleared; the B cut is read (fourth, Upper Falls, 16).
    - T72 B's equal routes restored (installed After 2000; Except Between 1990 and 1999): the date
      step now keeps its mode.
    - T73 A's path types the name: the reference search lists "v02 name James Carter" for James,
      Carter or both, so the 13- and 18-step find-box counts are gone.
    - T70 B's key reads "2 of 7 nodes": the canvas key now counts over the graph the filter leaves,
      as `decided.md` rules for every style host count; the grader note on two bases says which
      build drew which, and when the key draws no count line.
    - T75 A: the picker's highlighted "Piece" is not "Piece size", so Enter takes the wrong one.
      T77 B: the Graph step is needless on this build too (14 steps by pointer).
    - "Build notes (797a4f6b47)" lists what the re-pilots saw; the one that can still spoil a
      grade is Cancel on a new filter card leaving an empty card switched on (graded card counts).
- 2026-11-02: the dry run's third build, 47c95a09fc in `.study-builds/tier5-r1d2-47c95a09fc`,
  replaces 797a4f6b47 (`.study-builds/tier5-r1d1-797a4f6b47`). It carries the second dry-run
  pass's fixes.
- 2026-11-02: `answers.md` matched to 47c95a09fc from the targeted re-pilots of T72 B and T75 A;
  no bar changed and no prompt was wrong, so `tasks.md` is unchanged. Each change with its reason:
    - T72 B's path keeps "type 2000; Enter" as walked (5 of 11, same outline); the note now says
      the count changes while the digits are typed, so the Enter shows nothing new.
    - T75 A's 14-step path and its notes (Piece highlighted before Piece size, the cut row, "Group
      1") hold on this build too.
    - "Build notes (47c95a09fc)" added: Cancel and Escape on a new filter card now remove it from
      every opener tried, so that grade spoiler is gone; Control+Z right after that Cancel brings
      the card back switched on, which counts as a card where card counts are graded (T71, T77,
      T79).
- 2026-11-02: the dry run's fourth build, c3100058ab in `.study-builds/tier5-r1d3-c3100058ab`,
  replaces 47c95a09fc (`.study-builds/tier5-r1d2-47c95a09fc`). It carries the third dry-run
  pass's fixes.
- 2026-11-02: `answers.md` matched to c3100058ab from the targeted re-pilots of T72 B, T75 A, T77 B,
  T79 A and T79 B; no bar changed and no prompt was wrong, so `tasks.md` is unchanged. Each change
  with its reason:
    - T72 B's, T75 A's and T77 B's paths and counts hold on this build (5 of 11; 105 of 549 in 14
      steps; 9 of 11 and Oldest 5 of 9), so each path names c3100058ab among the builds it was
      walked on.
    - T75 B's path notes that Enter on Largest component sends keyboard focus out to Add filter:
      a keyboard walk of B takes more steps than the path lists, and a grader must not count them
      as wrong turns of the participant's own.
    - T79's timing adds what c3100058ab draws: "Drawing" through every wait, Done closing the
      workspace only on the painted result, waits of 15 to 22 s. The old "no settled screen shows
      work" line stays as baac78342b's.
    - The note on counts that are not the picture's adds the node table keeping a cancelled new
      card's rows (T77 B), a count that can spoil a grade read off the table.
    - "Build notes (c3100058ab)" added: Control+Z after Cancel on a new card no longer brings the
      card back (the 47c95a09fc spoiler is gone); what Undo takes instead is a setup step the
      participant never saw, and in T77 B that is the colleague's orange.
- 2026-11-02: the dry run's fifth build, f0a9a014cb in `.study-builds/tier5-r1d1-f0a9a014cb`,
  replaces c3100058ab (`.study-builds/tier5-r1d3-c3100058ab`). Its source is the same as
  c3100058ab's: the fourth dry-run pass changed only notes and the answer key.
- 2026-11-02: `answers.md` matched to f0a9a014cb from the targeted re-pilots of T72 B, T73 B, T75 A
  and T77 B; no bar changed and no prompt was wrong, so `tasks.md` is unchanged. Each change with
  its reason:
    - T72 B's, T73 B's, T75 A's and T77 B's paths and counts hold on this build (5 of 11; 7 of 11;
      105 of 549 in 14 steps; 9 of 11 and Oldest 5 of 9), so each path names f0a9a014cb among the
      builds it was walked on. T72 B's After and Between routes hold too (5 of 11 each).
    - T72's "Not success" notes that Enter on a new layer's Fill with nothing typed commits the
      default 6366F1, so a decoy second layer can leave the canvas unchanged: the grade reads the
      layers, not the picture.
    - T75 A's Largest component note adds that the step inside the Degree card also reads 112, and
      that after Done a card the pointer is not on can show Edit in place of its count, so the
      count is read from the top bar.
- 2026-11-02: the dry run's sixth build, d3fda9f2b6 in `.study-builds/tier5-r1d2-d3fda9f2b6`,
  replaces f0a9a014cb (`.study-builds/tier5-r1d1-f0a9a014cb`). It carries the fifth dry-run
  pass's fixes, among them record pages following a history move that changes the filter and a
  setup start ending with an empty undo history.
- 2026-11-02: `answers.md` matched to d3fda9f2b6 from the targeted re-pilot of T72 B; no bar
  changed and no prompt was wrong, so `tasks.md` is unchanged. Each change with its reason:
    - T72 B's path and count hold on this build (telemetry yes / Except installed before 2000, 5 of
      11, the key "5 of 11"), so the path names d3fda9f2b6 among the builds it was walked on; the
      Enter after 2000 still changes nothing visible, as the key already says.
    - The note on Undo after Cancel on a new filter card records what this build shows: Undo and
      Redo are off at a setup start, and Control+Z after that Cancel changes nothing, so no card
      returns and the setup's label role stays.
    - The orange node half under the canvas toolbar with the node table open is still drawn, so
      the note to count from the inspector or the key stands.
- 2026-11-02: the study tool scores tier 5 (no bar or target changed). "Before the first session"
  names what the gate now checks instead of what it owed. The grades' bar 9 line is written
  `Overwhelm: <1-7> -- <screen element> -- <reason>` (`none` when the reason names no screen
  element), so the "named in two sessions on different halves" rule is counted by script, not by
  reading. The rating check's sessions are walked as `rating-rejected` and `rating-frozen` under
  `pilot/T70A/` and `pilot/T70B/`, and the calm-first check on the rejected build is written to
  `rounds/<round>/calm-first-rejected.md`, so the gate can find them.
- 2026-11-02: the rating check and the calm-first check ran (no bar or target changed). The
  rating check does not hold: the rejected cards rated 3 (T70 A) and 5 (T70 B), the frozen build 2
  and 3, a mean gap of 1.5 where 2 is needed, and the larger gap came from a defect on the old
  build (its date test would not take "Between"), not from crowding. So bar 9's median is
  reported as a measure only this tier; bar 9 rests on the calm-first check and the named
  reasons. The calm-first check finds 2 severity 3 and 6 severity 2 on the rejected build, so it
  gates with its limits unchanged (`rounds/round-1/rating-check.md`,
  `rounds/round-1/calm-first-rejected.md`, `rounds/round-1/calm-first-frozen.md`).
- 2026-11-02, after the second three reviews (researcher, user advocate, red team), then frozen
  for the tier 5 rounds. Each change with its reason:
    - Bar 9 counts a screen element named by two sessions on different halves at any rating, where
      it counted only reasons for a 4 or more: every rating so far is 2 to 5 and only one reached
      4, so the old rule could not fire, while the reasons people gave were specific and fixable.
      The follow-up now asks for the moment the person was least sure where to look or what to do
      next (the reasons, not the number, produced findings), and its anchor says "you knew what to
      do next", since "clear" is the workspace's Clear button.
    - Bar 9 also counts each wait of more than 10 s without progress on T79's path in its severity
      2 allowance: waits of 15 to 22 s per edit on d3fda9f2b6 gated nothing, and the owner's
      50,000-node complaint is about waiting as much as about lists.
    - A finding that fits two bars counts once, toward the smaller allowance: a row out of line in
      both bar 7 and bar 9 moved two bars for one cause.
    - "Two counts of one result" needs a reachable state where they differ, or a showing that
      none exists, checked against the spec's count rules: both severity 3 candidates on the frozen
      build are equal only with one card or one step, and deleting one would remove a count people
      with several cards need.
    - The "two +" complaint gets a pass rule (it could never fail as a measure), and words at rest
      get a tier 5 budget and a scripted count (the owner's first complaint had no counted measure).
    - The calm-first check must walk every screen it lists on the frozen build, and be calibrated
      blind per complaint: the frozen build's check skipped the reference picker and the
      50,000-node checklist, the owner's own example, and the calibration was run by someone who
      knew which build was rejected.
    - Item 1 requires the refrozen build to carry the matches strip's search and the large-graph
      repaint fixes, and items 5, 8, 9 and T79's timings to be read on it: on d3fda9f2b6 the gate
      failed on problems the branch had already fixed.
    - Item 8 names its candidates by file (the scripted bars, axe, the calm-first check, the answer
      key, a Fill box repro), where it named fc1d7ee4f6's five, all since fixed or cleared: a
      stale list let the current build's severity 3 candidates (the 50,000-node table's missing
      search, 14 serious axe findings per theme) go unlisted.
    - The placement study's fixes are reported as rates against its baselines, and a feature only
      one half reaches as one-domain evidence: "reached" said nothing about whether a fix worked.
    - The dry-run cap: 2 fix passes after this freeze, limited to the gate's open items and new
      grade spoilers, then the round starts with any failing bar marked as failing before it. The
      old cap was exceeded (fixes built in four passes, six triaged) with nobody stopping, and only
      sessions measure the bars. A process rule, decided by the team.
    - Prompts: T74 B says "journeys ... go through" where it said "routes ... pass through" ("route"
      is Shortest route's search keyword, a wrong measure reached by the prompt's own word); T75
      drops "at the middle" (every measure's result option Middle). The other shared words are kept
      on purpose with reasons, and T76's "everything" and T78's "pair" and "count" are walked as
      detours. The wording check grades prompts only: follow-ups are asked after the work and
      cannot prime it, and they made up 30 of its 66 shared words.
    - Not taken: replacing the 1-to-7 rating outright (it stays as a measure beside the placement
      study and the rating check); showing the owner three frozen screens now (the tier report
      shows them beside the rejected build's, as before-and-after evidence for his own review).
- 2026-11-02: the first round's build, 0c163f54bf in `.study-builds/tier5-r1-0c163f54bf`,
  replaces d3fda9f2b6 (`.study-builds/tier5-r1d2-d3fda9f2b6`). It carries everything master
  held at the freeze, merged into this branch before the build.
- 2026-11-02: the answer key and two task notes were made to match the round 1 pilots' screens on
  0c163f54bf (T70 to T79, fourteen halves). No bar changed. Each change, with its reason:
    - T74's path step count is 13 for each half, where it read 12: the steps the key lists ("+ >
      Layer" as two, as in every other path) always summed to 13, and the walk on 0c163f54bf took
      13 plus one miss. Bar 8's rule (median within the path count plus 3) is unchanged; its
      reference count for T74 is now the true one.
    - T76's "four layers built in the workspace" is noted as unreachable on 0c163f54bf (no node
      opacity by hand; a hand-built edge layer draws nothing), so that route ends at P there. The
      success definition is unchanged.
    - T72 B: how a typed date moves across a change of mode, read exactly (Before to Between puts
      it in To, "before 2001"; After to Between in From, "after 1999").
    - T74 B: Shortest path's "On the route" (3 of 11, a wrong measure) added to Not success, so a
      grader does not take the right count of the wrong gauges as S.
    - T78: typing "count" in a node step's value picker finds nothing and "pair" finds All-pairs
      distance and Bipartite matching, where tasks.md said both find other measures' result names
      ("In the pairing", "Count").
    - Graders' notes: Edit in place of a count right after Done; the key's "Color: PageRank, full
      graph" under a filter; the node under the canvas toolbar; values read per task; and a "Build
      notes (0c163f54bf)" section listing what can spoil a grade on the frozen build.
- 2026-11-02: the round 1 dry run 1 build, 1e123d7d33 in `.study-builds/tier5-r1d1-1e123d7d33`,
  replaces 0c163f54bf (`.study-builds/tier5-r1-0c163f54bf`). It carries the dry run's fixes,
  including focus staying on a control the reader moves to while the selection workspace closes.
- 2026-11-03: the answer key was made to match the dry run's targeted re-pilots on 1e123d7d33
  (T70 A and B, T71 A, T72 B, T73 A, T75 A, T79 B). No bar, value, step count or task prompt
  changed. Each change, with its reason:
    - T70's path: after Fill "+" the color box is focused and empty ("Node color, not set"), where
      the key said its text was selected. A just-added color line now shows no color until one is
      picked, so there is no text to select; the steps (15) are the same.
    - T72's Not success: Enter on a new layer's Fill with nothing typed writes nothing (the second
      layer paints no node), where the key said it committed 6366F1. The grade still reads the
      layers, not the picture.
    - A "Build notes (1e123d7d33)" section: the empty new Fill line; Escape in a just-added line
      takes the line back, and in a committed box keeps the color and focus; the spoilers that are
      unchanged; and T71 A's empty "or" group left on the card after Control+Z (the count holds).
      The older sections' 6366F1 notes are kept as the record of their builds.
