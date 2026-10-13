The study runs on build (none frozen yet) served from (none frozen yet)

**DRAFT -- not frozen.** Written while the unified style panel is still being built. Nothing here
binds a session until the owner has approved the panel, the tier 3 study build is frozen, the
criteria reviewers have read this file and the Design Director has frozen it. Every count marked
"record on the frozen build" is filled in then.

# Success criteria and round plan: the tier 3 study of unified style layers

Scored as written. A bar changes only between rounds, with the change and its reason in the change
log at the end. Nothing here changes after a round's first session starts.

**What is studied.** The unified style panel of the graphty app's workspace (`/?next`), as a local
production build of the studio worktree, driven by `tool/real.mjs`: the layer tree (layers and
folders, with Everything at the bottom and Selected and Hovered at the top), a layer's Style tab
(which elements it paints, one row per property, Text and Effects lists, values that vary through a
scale), its Values tab, and Graph settings. Tier 3 is the styling work of a **returning** user:
coloring by group and recoloring one group, a gradient over a number, making a route stand out,
picking elements by a rule of their own (odd-numbered ids, a name that holds some letters),
organizing looks into a folder, changing the base look and the look of what is clicked, labels,
shape that follows a value, keeping a hand-made color across a re-run, and stopping one look from
covering the looks beneath it. Tasks: `tasks.md`. Answer key (graders only): `answers.md`.
Participants: `roster.md`. The tier 2 criteria, whose method this file follows: `../tier2/criteria.md`.

**The owner's three questions this study must answer with evidence**, beyond the bars:

1. Can a reader stop a value on one layer from covering the layers beneath it, without being told
   how (task T35)? Which way do they find (the minus at a row's end, emptying the field, a key,
   Undo, deleting the layer)?
2. Does every row behave like a layer or like a folder, whoever made it? Recoloring one group
   (T25), re-running (T34) and a layer of one's own (T28, T29) must offer the same controls in the
   same places.
3. Where readers expect Figma (or Cytoscape, for the genomics persona), does the panel meet the
   expectation or explain itself? Graders record every remark that names another tool.

**Who the participants are.** Simulated: one model playing composite personas, each given a
history of earlier sessions. A failure is strong evidence; a pass is weak until real people confirm
it. "Returning" is a briefing, not a memory: every session is a fresh agent told what it did
before. Every report says so.

**Not studied in tier 3** (as tier 2, owner 2026-10-07): no keyboard-only, screen-reader or touch
sessions. The accessibility expert walks every tier 3 screen by keyboard each round, and bar 8
checks what a script can.

## Grades

As tier 2 (`../tier2/criteria.md`, "Grades"): S, SD, F, G; success = S + SD; graded from the last
screenshot, the downloads, the transcript and a scripted dump of the style tree at the session's
end, never from a self-rating; claims graded apart from the task (false "done"); severity 0-4
(Nielsen); confirmed = 2 or more participants, or one participant plus a scripted repro for a build
defect. A severity 4 needs a wrong conclusion a reader would act on, a task that cannot be done, or
a participant who leaves. Graders are never told the outcome to look for. A give-up the persona file
scripts is labeled "scripted exit", not regraded.

**Graded from the style tree, not only the picture.** Several tasks end in a look that two
different layer stacks can draw (a color written on the group's own entry, or on a new layer above
it). The answer key says which stacks count as success; the scripted dump of the style tree
(`styles.tree()` and each row's values, read through graphty-element's public API) decides between
them.

## Bars that decide "done" (all must hold in one round)

A round is scored on the latest result of every task, as in tier 2: a task the round re-ran is
scored on that round's sessions; a task it did not re-run carries its sessions from the last round
that ran it, allowed only because no fix touched it. Bars 8, 9, 10 and 11 are measured afresh on
every round's frozen build. A bar not scored in a round does not hold in that round.

| #   | Bar                                        | Target                                                                                                                                                                                                                                                                                    |
| --- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Each task's success rate                   | A task at 6 sessions: at least 5 of 6, and at least 2 of 3 on each dataset. A task at 4: 4 of 4. T36 (one dataset, 2 sessions): 2 of 2                                                                                                                                                    |
| 2   | Earlier work kept                          | 0 confirmed sessions where a layer, a folder, a value, a list entry or a run is gone or changed at the end without the participant choosing it. Judged from the scripted style-tree dump at the start and the end of every session                                                        |
| 3   | Confirmed severity-4 problems open         | 0                                                                                                                                                                                                                                                                                         |
| 4   | Every row behaves like a layer or a folder | 0 confirmed findings that a layer offers different controls, sections or commands because of who made it (a run, the reader, a starting row), and 0 rows that behave like neither. Checked by a script that walks every row of every session's final tree, and by the expert walkthroughs |
| 5   | Confirmed false "done"                     | 0. On T35 this includes a participant who says the important characters show their group's color while the canvas or the tree shows the old override                                                                                                                                      |
| 6   | Facts on screen agree with the canvas      | 0 confirmed cases on a success path where a count, a value that comes back on Clear, a painted-over mark, the canvas key or the Values tab disagrees with what is drawn                                                                                                                   |
| 7   | Confirmed silent commit on a success path  | 0 (a value written by opening a menu, picking a kind, or adding a list entry before the reader chose a value)                                                                                                                                                                             |
| 8   | Automated accessibility check              | axe 0 serious or critical (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`) on every tier 3 screen in both themes; no two reachable controls share an accessible name; focus never falls to the page after the actions listed below                                                           |
| 9   | Words at rest                              | On the Selected layer, the route layer and the Key people layer at 1440 x 900, nothing selected on the canvas: no count rises above its count on the build the owner approved                                                                                                             |
| 10  | Expert walkthrough and screenshot audit    | 0 confirmed severity 3 or 4 findings open; the number of confirmed findings of any severity never rises from one round to the next                                                                                                                                                        |
| 11  | The panel fits                             | The route layer and the Selected layer each fit a 900 x 700 window with no scrolling inside the Style tab, measured by script. If this fails, collapsible groups go to the owner as a reversal of his "no accordions" rule; they are not built first                                      |
| 12  | Cost of the core tasks                     | Per core task (T25, T26, T29, T31, T35), the median steps of successful sessions are at most 2x the success path's steps                                                                                                                                                                  |

**Bar 8, the screens:** the layer tree with a folder open and closed; a layer's Style tab for a
node layer, an edge layer and a layer on both; Which elements at rest and open, with a condition
row and with the search offering a rule; the vary picker searched and unsearched; the ramp popover
with a clamp; the category popover with an entry set and with "New layer for" in its menu; Label
settings; Graph settings; the Values tab for a number and for a category; several rows selected
together. **Focus never drops** after: Clear on a set field and on a varied field; Remove on a list
entry; Undo after either; Add layer, Add folder and Move to folder; a kind change; Escape from every
popover and from a new entry with no value; Done in Which elements.

**Bar 10, how it is scored:** as tier 2 (`../tier2/criteria.md`, "Bar 10, how it is scored"), with
the Figma product designer, the visual designer and the accessibility specialist walking every bar
8 screen at 1440 x 900 and 900 x 700, light and dark, before they see the sessions. Counted by
script (`tool/bars.mjs`, extended before round 1): a property name or a picker row cut with no way
to read it whole; a raw code or field path on screen (`results.louvain.group`, an error code); a
glossary-rejected word; a swatch whose color differs from what the canvas draws for the same value.

## Measures reported every round (targets, not gates)

| Measure                                                                                                                           | Target                            | Reason                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------- |
| All tier 3 sessions together                                                                                                      | >= 85%                            | Tier 1 and 2's target                                                                           |
| Ease (1-7, read from the transcript), mean per task; median beside it                                                             | mean >= 5.0; no task below 4.0    | Simulated ease is uncalibrated; the trend is the signal                                         |
| Steps against the success path, non-core tasks                                                                                    | median <= 2x                      | Shows where success is costly                                                                   |
| Wrong turns per session                                                                                                           | median <= 1                       | A returning user knows the shell                                                                |
| Recovery: sessions with a wrong turn that still succeed                                                                           | >= 70%                            | Earlier tiers' target                                                                           |
| How a value was unset (T35 and anywhere else it happens): the minus, an emptied field, Delete or Backspace, Undo, a layer deleted | reported                          | The owner's first question                                                                      |
| How elements were picked (T28, T29, T32): conditions, search, selection, expression                                               | reported, with who had the chance | Remove before adding: a way no session used is a candidate for removal                          |
| How one group was changed (T25, T34): its entry in the color's category list, "New layer for", a new layer of one's own           | reported                          | The owner's second question: both ways are ordinary layers, and which one readers reach matters |
| Remarks naming another tool (Figma, Cytoscape, Gephi, Excel, PowerPoint) and whether the panel met the expectation                | listed                            | The owner's third question                                                                      |
| First move: whether it went to a place the history names, and whether that led anywhere                                           | reported                          | Measures how far earlier habits carry into the new panel                                        |
| Script errors, console errors and failed requests on any success path                                                             | 0                                 | Each is a bug report                                                                            |
| What worked                                                                                                                       | listed per task                   | The owner (2026-10-02): a report of failures alone does not say what to keep                    |

## Round plan

- **Rounds:** as many as it takes to meet the bars; the study stops early only by "When the study
  stops". Round 1 runs every task. Every later round re-runs every task below its bar at full size,
  the core tasks at full size always, and each task a fix touched at 4 or more.
- **The core tasks:** T25 (coloring by group and recoloring one group: the owner's split-parent
  question), T26 (a gradient: the most common styling job), T29 (picking by a name: the owner's
  generic-selection question), T31 (Everything and Selected: the base look and a highlight that
  stays readable on a dark background) and T35 (unsetting: the owner's first question). They decide
  the stall rule.
- **Size (round 1, 56 sessions):** the five core tasks at 6 each, 3 and 3 (30); T27, T28, T30, T32,
  T33 and T34 at 4 each, 2 and 2 (24); T36 at 2, one dataset (the genomics personas' own figure).
  Allocation: `roster.md`.
- **Persona mix:** every session by a returning persona; at least half by personas who did tier 1
  as first-time users (round 1: 32 of 56); the genomics Cytoscape user in at least 5. No persona
  takes both halves of one task. Every task half has at least two personas.
- **Starts:** every session starts from work that reflects the persona's history, through a setup
  file in `../rounds/tier-3/setups/` (`roster.md`, "Where each session starts"). The setups are
  written and piloted on the frozen build, not before.
- **At most 4 participants alive at once,** through `tool/with-browser.sh`; every session ends with
  `--end`.
- **No step cap.** Step notes of one or two sentences, in character.
- **API errors:** a session that ends on a model API error is voided and run again from a clean
  folder; a second failure is run once on Sonnet, the model recorded and reported apart.
- **Frozen build:** one copy of `graphty/dist` per round, made after the preflight passes.

## Before a round may start (preflight)

1. The owner has approved the panel, and the approved build's commit is written in the change log.
   No session runs on a build the owner has not seen.
2. The build under study is the studio worktree's commit, rebuilt with no uncommitted changes, frozen
   and served; its commit and build stamp are in every `session.json`.
3. `node tool/real.mjs --prove` prints only `ok` on 5 runs in a row on the frozen build.
4. **Pilot on every new build:** every task's success path in `answers.md`, both halves, runs on the
   frozen build and ends on its success state; each also walks its two or three commonest detours
   and the success path again by keyboard, noting focus and screen-reader names.
5. Every reference value in `answers.md` is recorded on that build and no value is blank.
6. **Wording check:** the visible text and accessible names of every screen a success path reaches
   are dumped, and a script lists every word a prompt shares with them, except the data's own words;
   it must catch a planted echo first. Each overlap is reworded or kept with its reason in
   `tasks.md`.
7. **History check:** the same script runs over every history in `roster.md`; a history names no
   control of the unified style panel.
8. Every setup runs and its first screenshot is looked at. The style-tree dump (bar 2, the grades)
   is checked on a planted removal before it is trusted.
9. `tool/bars.mjs` covers bar 8's screens, bar 9's three counts, bar 10's scripted counts and bar
   11's fit, each caught on a planted case first. The row-consistency walk of bar 4 exists and fails
   on a planted row that lacks Which elements.
10. Every change carried into the round is listed as built or not built, checked on the served
    build.
11. `tasks.md` and this file are frozen; the round folder is new; participants get only what
    `tasks.md` lists.

## After a round: scoring and the skeptic check

As tier 2: one row per session (task, half, persona, grade, ease, steps, wrong turns, first move,
the way used to unset, pick and change one group, build-decided, void) in a script with an assert on
the session count; two independent skeptics try to refute every finding and bar result; every
number with its denominator, with and without build-decided sessions.

## How a fix is accepted

As tier 2: the right package (graph facts in graphty-element as `{ code, params }`, words and
arrangement in the app, a shared control in compact-mantine); remove before adding; words at rest
never rise; lint, build and the affected tests pass with a test that fails without the fix; a
re-pilot on the new build and a skeptic's generality check. An additive graphty-element API is the
team's call, recorded under "decided by the team" in `../owner-decisions.md`; a breaking one goes to
the owner and is not built. A fix that changes what the owner approved is shown to the owner before
the round that studies it.

## When the study stops (done)

- **Passed:** every bar holds in one round. Recommend confirming with real people.
- **Stalled:** a round makes no progress over the round before: the core tasks' successful
  sessions (of 30) rise by fewer than 3, no confirmed severity 3 or 4 on a core task was closed, and
  no failed bar now holds. The owner is told, with the evidence.
- **A one-way door:** a problem that needs an owner decision that cannot be undone cheaply stops
  work on that task only.
- **The safety cap:** 6 rounds.

## Change log

- 2026-10-13: Drafted during the build phase, before the owner's approval. Not frozen. Open before
  freezing: the setups, the reference values that depend on a run (community sizes, the re-run's
  groups), whether T36's single dataset is acceptable or needs a second signed-value file, and the
  bar 9 baseline (the approved build).
