The study runs on build baac78342b served from /home/apowers/Projects/graphty-monorepo/.study-builds/tier5-r1-baac78342b

Frozen on 2026-11-02 for the tier 5 rounds. This is the dry run's first build: each dry-run fix
pass refreezes on a new build, names it on the first line and the build before it here.

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

| #   | Bar                           | Target                                                                                                                                                                                                                                                                                                                                                                                               | Counted from                                                                                                                                        |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Task success                  | At least 75% S or SD of each task's valid pointer sessions, and no dataset half with 0 successes. On a 2-session task (T72, T75, T77, T79) that means 2 of 2; on a 4-session task (T70, T71, T73, T74, T78), 3 of 4. Sam's sessions are not counted here                                                                                                                                             | The grades' first lines (`Grade:`)                                                                                                                  |
| 2   | False "done"                  | 0 in the round                                                                                                                                                                                                                                                                                                                                                                                       | The grades (`False done:`)                                                                                                                          |
| 3   | Wrong turns                   | Median at most 2 per task, counted as "Grades" defines a wrong turn                                                                                                                                                                                                                                                                                                                                  | The grades (`Wrong turns:`)                                                                                                                         |
| 4   | Severity 3 and 4 open         | 0 confirmed severity 3 or 4 problems                                                                                                                                                                                                                                                                                                                                                                 | Grades, the end-state check, the expert walkthroughs and the screenshot audit (the table below), after both skeptics                                |
| 5   | Keyboard                      | Sam's sessions S or SD, with no confirmed keyboard block; 0 keyboard blocks the accessibility specialist finds on any tier 5 screen that a `real.mjs --keys` script reproduces; and 0 serious or critical axe findings on every tier 5 screen, at 1440 x 900 and 900 x 700, in both themes                                                                                                           | Sam's grades; the accessibility walk with its `--keys` repros; the scripted walk of the tier 5 screens, once per theme                              |
| 6   | The owner's data rules        | 0 confirmed violations: a sentence on screen where a control would do; a hotkey with no visible button showing its key; configuration reachable only from the table; "links" or "ties" on screen for edges; "Select", "Filter to" or "Filter out" on screen; an approved surface removed or restyled other than as `spec.md` section 13 allows                                                       | The content designer's word count, the Figma product designer's and the interaction designer's walkthroughs, confirmed as below                     |
| 7   | Figma and graphty consistency | 0 confirmed consistency findings of severity 3 or 4, and at most 5 of severity 2 open, each listed in the report with its fix or its reason                                                                                                                                                                                                                                                          | The Figma product designer's and the interaction designer's walkthroughs, confirmed as below                                                        |
| 8   | Cost on core tasks            | Median steps per core task half (T70, T71, T73, T74, T78) at most the answer key's path plus 3                                                                                                                                                                                                                                                                                                       | The step logs, against each half's "Path steps" in `answers.md` on the frozen build (`tool/steps.mjs`)                                              |
| 9   | The owner's feedback          | The calm-first check with 0 confirmed findings of severity 3 or 4 and at most 3 of severity 2 open, each listed with its fix or its reason; no screen or control named as the reason for a rating of 4 or more in two sessions on different task halves; and, only if the rating check holds (below), a median rating of at most 2 over the round's valid pointer sessions with no task half above 3 | The calm-first check, confirmed as below; the follow-up answers (`Overwhelm:` in each grade, with the reason, coded by the screen element it names) |

**Severity** (bars 4, 7 and 9): 4 -- a result wrong with no sign (a layer or filter that holds more
or fewer than its count says, a preview that changes what is saved, styling lost after picking); 3
-- a task blocked for most people, or a result a reader would misread (a preview read as the saved
result, a count over a base nobody can tell); 2 -- friction a person recovers from; 1 -- wording or
cosmetic; 0 -- not a problem.

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
- Severity 2: anything drawn at rest that nothing on the screen needs; a screen over the
  words-at-rest budget; a blank column or pane the step does not use; a row break or a control out
  of line with its row; a step pane that opens with Advanced open when the person did not open it.
- Confirmed: the counts, words, gaps, row breaks and alignment by the screenshot audit, as any
  screenshot-visible finding; "where the eye lands first" when the screenshot auditor, reading the
  same screenshot without the expert's answer, names the same thing.
- It runs in the dry run and every round, before the sessions are read, so the reported overwhelm
  cannot steer it.

**The owner's six complaints, and what checks each** (anything with no check is reported as "not
re-tested", never as passed):

| The owner's complaint (2026-11-01)                                    | What checks it                                                                                                  | Pass rule                                                      |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Cramped, hard to find and focus on what matters                       | The calm-first counts and where the eye lands first                                                             | Bar 9's calm-first limits                                      |
| Disorganized: why buttons sit where they do, empty spaces, row breaks | The calm-first gaps, row breaks and alignment at 1440 x 900 and 1280 x 800; the audit at 900 x 700              | Bar 9's calm-first limits                                      |
| No progressive disclosure                                             | The calm-first check: Advanced closed at rest on every step pane a task reaches (T78's is opened by the person) | Bar 9's calm-first limits                                      |
| "Select", "Filter to" and "Filter out" not understood                 | The screenshot audit of every screen, including a filter card in a project saved by a tier 4 build              | None of the three words on screen; one is a bar 6 violation    |
| Two "+" that look alike                                               | The step logs: every click on a "+" that is not on the answer key's path, per "+"                               | Reported as a measure                                          |
| "While has nodes" unviable at 50,000                                  | The scripted 50,000-node walk (before the first session, item 5) and T79                                        | Every list bounded, with a count and a search ("Large graphs") |

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
reason in this change log) until it does.

## Before the first session

The round may not start until all of these hold on the frozen build. `real.mjs --gate` refuses
item 1 and the "pilot to confirm" half of item 2 today; the refusals for the rest of item 2 and
items 3 to 8 are owed, and are built into `--gate` before the dry run's first pilot (tier 2 to
tier 4 each wrote a tool rule into the criteria and found it unchecked at the round). Owed with
them: `tool/steps.mjs` names tier 4's core tasks (`CORE`), `bars.mjs` takes `--tier 3` or `--tier
4` only, and nothing parses `Overwhelm:`.

1. The first line of this file names the frozen build.
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
   catalog's search keywords; runs axe for bar 5; and checks every 50,000-node list against
   "Large graphs".
6. Each core task half (T70, T71, T73, T74, T78) has one "Path steps" number in `answers.md`, read
   off the frozen build (bar 8), and `tool/steps.mjs` counts tier 5's core tasks.
7. The approved surfaces' new reference screenshots are listed in `decided.md` (bar 6).
8. **No half blocked and no bar failed before a session.** Every task half has a success walk that
   reaches S on the frozen build, and every severity 3 or 4 candidate known before the round (the
   answer key's build notes, the calm-first check, the scripted walk) is fixed and its fix
   re-walked. On fc1d7ee4f6 these were: T75 A blocked (no So far on Largest component); the false
   "Covered by Everything" warning (two halves); two count bases for one layer ("4 of 14" against
   the key's "of 24"); the data table and the matches strip drawn together; the 3 s input delay on each
   50,000-node edit, if nothing on screen says work is under way ("Large graphs"). If T75 A's step is not fixed after the two fix
   passes, T75 A is rewritten on a network already in several pieces and "So far on a structure
   step" is reported as not re-tested.
9. The rating check and the calm-first check have run on the rejected build (bar 9).

## Measures reported every round (not gates)

- Median steps per task half against the answer key's path, for every task.
- The first door each session tried (the Style tab's layer, the Data place's filter, the table,
  Analyze, the find box, the canvas), and which route each success took.
- **The owner's two questions**: from T70's follow-up and the step logs, how many style-layer
  readers read the group colors as a preview, and which default they want; from T71's follow-up
  and the step logs, how many used the matches strip under the drawing while picking, whether it
  helped or got in the way, and how many hid it.
- **Overwhelm** per task half (bar 9's numbers), each with the one reason the participant gave,
  coded by the screen element it names; beside them the placement study's 2 to 3 and the rating
  check's two builds.
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
  on its route, or "not re-tested". An unreached fix is never reported as passed.
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
  run, so an unbuilt fix is found before the round. At most 2 fix passes; still not ready after
  two, the studio stops for the owner.
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
- **The follow-up** is asked by the tool after the participant's first `--end`, in every task: the
  overwhelm rating first, then in T70 and T71 the owner's question, worded so it names no
  behavior.
- **Between rounds**: the adversarial reviews (both skeptics per finding), the decided fixes made,
  landed and re-piloted, then the next round on a new frozen build.

## When the studio stops

- All nine bars hold: the study is done; the director writes `report.md`.
- A round with no progress: no bar moved from failing to holding and no confirmed severity 3 or 4
  problem was closed since the round before.
- A one-way-door decision (a breaking published API change, a compact-mantine change away from
  Figma, or a product question `decided.md` does not settle): the studio stops and asks the owner
  once, recorded in `../owner-decisions.md`.
- The safety cap: 2 dry-run fix passes before round 1, and at most 3 rounds.

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
