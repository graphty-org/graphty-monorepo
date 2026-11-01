The study runs on build <sha> served from <dir>

# Success criteria and round plan: choosing which nodes (tier 5)

Tier 5 studies how a **returning** graphty user chooses which nodes a result applies to, with the
new selection editor in its two places: a style layer's Which nodes (the **style selector**) and a
Data place filter card (the **import filter**), as `../../selection-groups/spec.md` sets them out.
The tasks cover a simple choice in each place, two ways in ("Or"), an exception, everything within
k hops of a named node, a choice by an algorithm's value and by position, a chain of steps on a big
network, the landing page's pointing effect, and changing what a colleague built.

What this round measures: the **first use of the new editor by people who already know the app**,
including its data features and tier 4's condition cards. It does not measure the cost of a second
use, and it does not study saved selections (sets) or hierarchy cuts, which are not in this build
(`decided.md`). The report says both.

Tasks: `tasks.md`. Answer key: `answers.md`. Participants: `roster.md`. Binding decisions:
`decided.md`.

## Grades

Each session is graded against the task's success definition in `answers.md`, never from the
participant's own rating, from what the session recorded: its screenshots (the last one first), its
step log (`route.jsonl` and the step notes), and its end-state records (`work.json`, `styles.json`,
`data.json`: each layer's selection and count, each filter card with its effect and count, and the
node, edge, visible and selected counts).

- **S** -- success on the answer key's path or an equivalent one.
- **SD** -- success after a detour the participant recovered from by themselves.
- **P** -- part of the task done (for example the filter right and the layer wrong, or a count off
  by the answer key's named near-miss).
- **F** -- failed or gave up.
- **VOID** -- the tool or the run failed, or the participant opened a file outside its own folder.
  A void session is re-run once as `<id>b`.

A **wrong turn** is a step that leaves the answer key's path and is later taken back or abandoned
(a place the task does not need, a menu or picker closed with nothing chosen, an undo of the
participant's own step, a step or group removed after it was made). A **false "done"** is a
participant saying it is finished while the screen or the end-state records show otherwise.

## Bars that decide "done" (all must hold in the round)

| #   | Bar                           | Target                                                                                                                                                                                                                                                                                        | Counted from                                                                                                                    |
| --- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Task success                  | At least 75% S or SD of each task's valid pointer sessions, and no dataset half with 0 successes. On a 2-session task that means 2 of 2; on a 4-session task, 3 of 4. Sam's sessions are not counted here                                                                                     | The grades' first lines (`Grade:`)                                                                                              |
| 2   | False "done"                  | 0 in the round                                                                                                                                                                                                                                                                                | The grades (`False done:`)                                                                                                      |
| 3   | Wrong turns                   | Median at most 2 per task                                                                                                                                                                                                                                                                     | The grades (`Wrong turns:`)                                                                                                     |
| 4   | Severity 3 and 4 open         | 0 confirmed severity 3 or 4 problems                                                                                                                                                                                                                                                          | Grades, the end-state check, expert walkthroughs and the screenshot audit, after both skeptics                                  |
| 5   | Keyboard                      | Sam's sessions S or SD, with no confirmed keyboard block; and 0 serious or critical axe findings on every tier 5 screen, at 1440 x 900 and 900 x 700, in both themes                                                                                                                          | Sam's grades; the scripted walk of the tier 5 screens, once per theme                                                           |
| 6   | The owner's data rules        | 0 confirmed violations: a sentence on screen where a control would do; a hotkey with no visible button showing its key; configuration reachable only from the table; "links" or "ties" on screen for edges; an approved surface removed or restyled other than as `spec.md` section 13 allows | The content designer's word count, the Figma product designer's and the interaction designer's walkthroughs, confirmed as below |
| 7   | Figma and graphty consistency | 0 confirmed consistency findings of severity 3 or 4, and at most 5 of severity 2 open, each listed in the report with its fix or its reason                                                                                                                                                   | The Figma product designer's and the interaction designer's walkthroughs, confirmed as below                                    |
| 8   | Cost on core tasks            | Median steps per core task half (T70, T71, T73, T74) at most the answer key's path plus 3                                                                                                                                                                                                     | The step logs, against each half's "Path steps" in `answers.md` on the frozen build (`tool/steps.mjs`)                          |

**Severity** (bars 4 and 7): 4 -- a result wrong with no sign (a layer or filter that holds more or
fewer than its count says, a preview that changes what is saved, styling lost after picking); 3 --
a task blocked for most people, or a result a reader would misread (a preview read as the saved
result, a count over a base nobody can tell); 2 -- friction a person recovers from; 1 -- wording or
cosmetic; 0 -- not a problem.

**Confirmed** means one of: seen in two sessions on different task halves; one session plus a
scripted `real.mjs` repro; an expert finding plus a scripted `real.mjs` repro; an expert finding
about something a screenshot shows (truncation, overlap, a clipped list, a filled chit at rest, the
words on screen), also seen in the screenshot audit. The audit confirms nothing else. Each
confirmed finding survives two skeptics before it counts.

**Bar 7, what consistency means.** Each item is checked in both hosts, and a difference between the
hosts that `decided.md` does not settle counts as a finding:

- **One editor, one picker**: both hosts list the same value picker entries in the same order
  (Time window only in the filter), the same verb menu, the same card per kind, the same row
  anatomy (spec section 3), the same "+" and "Or".
- **Figma's patterns where Figma solved the problem**: groups as Layers rows and steps as Fill rows,
  Union / Subtract / Intersect order and glyphs for Add / Except / Keep, the eyedropper-style
  target, 24 px controls and 11/16 type, hints only in tooltips, Outline-mode-like preview.
- **graphty's own patterns**: Mod+] / Mod+[ / Mod+D / Delete / F2 the same on the selection's rows
  and the style tree's; Escape closes the innermost thing and keeps edits; one Tab stop per list
  walked with arrows; the same count chip and what its click does per host (spec section 2); the
  same words (Filtered graph, Full graph, Hovered or selected, Selected (N), So far).
- Graded by the Figma product designer (every editor screen against Figma and against graphty's
  other panels) and the interaction designer (keys, focus, Escape, undo, commit across both
  hosts); a consistency finding is confirmed as any other expert finding.

**Bar 6, how each rule is confirmed**: a hotkey with no visible button and configuration reachable
only from the table, by a scripted `real.mjs` repro; "links" or "ties", a sentence at rest, a filled
chit at rest and an approved surface restyled, by the screenshot audit. The approved Which nodes
card and attribute picker change as `spec.md` section 13 says; their new reference screenshots are
listed in `decided.md` before the audit uses them.

**The end-state check** (bar 4) runs over every session's `data.json` and `styles.json`: each
layer's selection count against the members the element paints, each filter card's count chip
against what the element shows and selects, and the styling after the session against the styling
before it with every preview ended (a layer left suspended is a severity 4 candidate the script
itself confirms).

**Experts and audit, every round** (they feed bars 4 to 7): the Figma product designer, the
interaction designer, the accessibility specialist (every editor screen by keyboard and with the
screen-reader text, `real.mjs --read`, at 1440 x 900 and 900 x 700, including the reference picker,
the verb menu, the Or group and the preview key, which Sam's tasks may not reach), the content
designer (words at rest per editor screen: no sentence at rest, the budget in tier 4's
`words-at-rest.md`), and the design engineer's screenshot audit of every screen the sessions and
pilots reached, at both sizes. Findings of severity 1 and 2 gate nothing outside bar 7; the report
lists them by screen.

## Before the first session

The round may not start until all of these hold on the frozen build. `real.mjs --gate` refuses the
first two by itself; the dry run owns the rest.

1. The first line of this file names the frozen build.
2. `answers.md` holds no "pilot to confirm": every value and path is read off the frozen build, and
   each "Build notes (7ca4cae647)" line is re-read and either kept with the frozen build's name or
   removed.
3. Every setup in `roster.md` starts on the frozen build without `SETUP FAILED`.
4. `real.mjs --end` writes each layer's selection and each filter card's steps into the end-state
   records, and the end-state check runs on a pilot's folder.
5. A scripted walk of the tier 5 screens (both hosts' editor at rest and while picking, the value
   picker, the verb menu, the reference picker, an Or group, the preview key, the table's Group
   column) passes `wording.mjs` against `tasks.md` with the frozen build's own strings, and runs
   axe for bar 5, once per theme.
6. Each core task half's path step count is written in `answers.md` (bar 8), and `tool/steps.mjs`
   counts tier 5's core tasks (it names tier 4's today).
7. The approved surfaces' new reference screenshots are listed in `decided.md` (bar 6).

## Measures reported every round (not gates)

- Median steps per task half against the answer key's path, for every task.
- The first door each session tried (the Style tab's layer, the Data place's filter, the table,
  Analyze, the find box, the canvas), and which route each success took.
- **The owner's two questions**: from T70's follow-up and the step logs, how many style-layer
  readers read the group colors as a preview, and which default they want; from T71's follow-up
  and the step logs, how many opened the table while picking, from where, and whether they missed
  it when they did not.
- **Algorithms in the editor**: for T74 B and T75, whether the participant understood that picking
  a measure ran it, and whether a run they did not ask for surprised them.
- **Fix coverage**: for each `decided.md` polish fix a task reaches, the sessions that reached it
  on its route, or "not re-tested". An unreached fix is never reported as passed.
- Problems by kind and severity, and by the package that owns them (graphty-element, graphty app,
  compact-mantine).
- Sessions run on Sonnet after an API error, counted apart.

## Round plan

- **Dry run first**: every task piloted three ways (success path, its commonest detours from
  `tasks.md`, keyboard) on the frozen build. The dry run fixes only a crash, a blocked task or a
  result that would spoil a grade on a success path or a listed detour; everything else goes to the
  backlog. At most 2 fix passes; still not ready after two, the studio stops for the owner.
- **Sessions**: at most **30 in a round**; `roster.md` plans 26. Core tasks (T70, T71, T73, T74)
  run 4 pointer sessions each (2 per half); the other four run 2 (1 per half); Sam runs 2 more,
  keyboard only, counted only in bar 5.
- At most **4 participants alive at once**.
- **No step cap.** A session ends when the participant is done, gives up, or repeats without
  progress.
- **Step notes** are one or two sentences, in character.
- **Retry on an API error**: the same prompt from a clean folder, then once on Sonnet; the model is
  recorded in the session's grade, and Sonnet sessions are counted apart.
- A **follow-up question** (T70 and T71) is asked by the tool after the participant's first `--end`.
- **Between rounds**: the adversarial reviews (both skeptics per finding), the decided fixes made,
  landed and re-piloted, then the next round on a new frozen build.

## When the studio stops

- All eight bars hold: the study is done; the director writes `report.md`.
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
