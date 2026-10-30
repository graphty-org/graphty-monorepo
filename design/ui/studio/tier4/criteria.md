The study runs on build 79ed770292 served from /home/apowers/Projects/graphty-monorepo/.study-builds/tier4-r1d3-79ed770292

Frozen on 2026-10-30 for the tier 4 rounds (the build before it was 71230abff1, at /home/apowers/Projects/graphty-monorepo/tmp/design-studio/tier4/builds/tier4-r1d4-71230abff1).

# Success criteria and round plan: data management (tier 4)

Tier 4 studies how a **returning** graphty user manages data in the real graphty app: bringing a
network in from a file and from a web address, putting two tables together, getting a column read
the right way, telling the program which columns hold the time, the place, the weight and the
name, filtering with condition cards, reviewing what the program says is wrong in a file, and
sending the data out again. The owner wants this tier done in 12 to 24 hours, so it runs **one
round** of sessions on a small panel, after one dry-run fix pass where possible.

What this round measures: the **first use of the data features by people who already know the
app**. Every participant has used graphty before, but none has used these features. It does not
measure the cost of doing a data task a second time, and it does not study replacing a file with a
newer one while keeping the work done on it. The report says both.

Tasks: `tasks.md`. Answer key: `answers.md`. Participants: `roster.md`. Binding decisions:
`decided.md`. Defects below the session-ready bar: `backlog.md`.

## Grades

Each session is graded against the task's success definition in `answers.md`, never from the
participant's own rating, from what the session recorded:

- its screenshots, the last one first;
- its step log (`route.jsonl` and the participant's step notes), for wrong turns and false "done";
- the files it saved (`downloads/`);
- its end-state records: `work.json`, `styles.json` and `data.json` (the sources, each column's
  kind and role, each filter card with Select or Hide, on or off and its count, and the node, edge,
  visible and selected counts). What a task changes in Data > Fields or Filters is graded from
  `data.json` when the last screenshot does not show it.

Grades:

- **S** -- success on the answer key's path or an equivalent one.
- **SD** -- success after a detour the participant recovered from by themselves.
- **P** -- part of the task done (for example the network open but the count wrong).
- **F** -- failed or gave up.
- **VOID** -- the tool or the run failed, or the participant opened a file outside its own folder.
  A void session is re-run once as `<id>b`.

A **wrong turn** is a step that leaves the answer key's path and is later taken back or abandoned
(opening a place the task does not need, a menu closed with nothing picked, an undo of the
participant's own step). A **false "done"** is a participant saying it is finished while the
screen or the end-state records show otherwise.

## Bars that decide "done" (all must hold in the round)

| #   | Bar                    | Target                                                                                                                                                                                                                                                    | Counted from                                                                                                  |
| --- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | Task success           | At least 75% S or SD of each task's valid pointer sessions, and no dataset half with 0 successes. On a 2-session task that means 2 of 2; on a 4-session task, 3 of 4. Sam's sessions are not counted here                                                 | The grades' first lines (`Grade:`), counted by the researcher                                                 |
| 2   | False "done"           | 0 in the round                                                                                                                                                                                                                                            | The grades (`False done:`)                                                                                    |
| 3   | Wrong turns            | Median at most 2 per task                                                                                                                                                                                                                                 | The grades (`Wrong turns:`)                                                                                   |
| 4   | Severity 3 and 4 open  | 0 confirmed severity 3 or 4 problems                                                                                                                                                                                                                      | Grades, the end-state check, expert walkthroughs and the screenshot audit, after both skeptics                |
| 5   | Keyboard               | Sam's sessions S or SD, with no confirmed keyboard block; and 0 serious or critical axe findings on every tier 4 data screen, at 1440 x 900 and 900 x 700, in both themes                                                                                 | Sam's grades; the scripted walk of the tier 4 screens                                                         |
| 6   | The owner's data rules | 0 confirmed violations: configuration reachable only from the table; a hotkey with no visible button showing its key; "links" or "ties" on screen for edges; a sentence on screen where a control would do; an owner-approved surface removed or restyled | The Figma product designer's and the interaction designer's walkthroughs, confirmed as set out below          |
| 7   | Cost on core tasks     | Median steps per core task (T61, T62, T65, T67) at most the answer key's path plus 3                                                                                                                                                                      | The step logs, against each path's step count, which the dry run writes into `answers.md` on the frozen build |

**Severity** (bar 4): 4 -- data lost or wrong with no sign (a file read wrong and shown as right, a
filter that hides more than it says, an export that drops rows); 3 -- a task blocked for most
people or a result a reader would misread; 2 -- friction a person recovers from; 1 -- wording or
cosmetic; 0 -- not a problem.

**Confirmed** means one of:

- seen in two sessions on different task halves;
- one session plus a scripted `real.mjs` repro;
- an expert finding plus a scripted `real.mjs` repro;
- an expert finding about something a screenshot shows (truncation, overlap, a clipped menu, an
  empty state, the words on screen), also seen in the screenshot audit. The audit confirms nothing
  else.

Each confirmed finding survives two skeptics before it counts.

**Bar 6, how each rule is confirmed:**

- A hotkey with no visible button, and configuration reachable only from the table: a scripted
  `real.mjs` repro. A screenshot cannot show either.
- "Links" or "ties" on screen, and an approved surface removed or restyled: the screenshot audit.
  Restyling is judged against reference screenshots of the approved surfaces, which the dry run
  lists in `decided.md` and takes from build e52d7c4f57, before any tier 4 fix.
- A sentence where a control would do: the content designer's words-at-rest count per data screen,
  against principle 5's budget, fixed in the dry run before any session.

**The end-state check** (bar 4) is a script run over every session's `data.json`:

- each filter card's count chip against what the element shows and selects;
- each join chip against the node and edge counts;
- each exported file's row count against the network.

A mismatch is a severity 4 candidate confirmed by the script itself. This is the only check that can
catch "a filter that hides more than it says" and "an export that drops rows"; a grader looking at
a picture cannot.

**Experts and audit, every round** (they feed bars 4, 5 and 6):

- The **Figma product designer**: every data screen against Figma's own patterns where Figma solved
  the problem (lists, properties panels, menus, variable and data panels) and against graphty's
  own patterns where graphty differs; the condition cards must be the Style panel's Which nodes /
  Which edges cards (the shared condition pattern).
- The **interaction designer**: consistency of the data flows with the rest of the app (the same
  control for the same job, the same keys, the same undo, the same Escape and Tab behavior;
  `decided.md`).
- The **accessibility specialist**: every data screen by keyboard and with the screen-reader text
  (`real.mjs --read`), at 1440 x 900 and 900 x 700, including the screens Sam's tasks do not reach
  (the web address box, the issue list, the export dialog). Findings of severity 3 or 4 count
  against bar 4 once confirmed; a keyboard block counts against bar 5.
- The **design engineer's screenshot audit**: every screen the sessions and pilots reached, at
  1440 x 900 and 900 x 700 (truncation, overlap, clipped menus, empty states).

Findings of severity 1 and 2, from the experts and the audit, gate nothing. The report lists them by
screen, so they reach the fix list.

## Before the first session

The round may not start until all of these hold on the frozen build. `real.mjs --gate` refuses the
first two by itself; the dry run owns the rest.

1. The first line of this file names the frozen build (done above).
2. `answers.md` holds no "pilot to confirm": every value and path is read off the frozen build.
3. Every setup in `roster.md` starts on the frozen build without `SETUP FAILED`, including the
   three the dry run writes (`gauges-tidy.txt`, `pantries-narrowed.txt`, `gauges-narrowed.txt`).
4. `real.mjs --end` writes `data.json` (see "Grades"), and the end-state check runs on a pilot's
   folder. Owner: the design engineer.
5. A scripted walk of the tier 4 screens (the web address box, Sources "+", the join screen, Fields
   "+", the Filters picker, the issue list, Export on Data) passes `wording.mjs` against
   `tasks.md` using the frozen build's own strings, and runs axe for bar 5. Owner: the design
   engineer.
6. Each core task's path step count is written in `answers.md` (bar 7).
7. The words-at-rest budget per data screen is written in this file's change log (bar 6).

## Measures reported every round (not gates)

- Median steps per task against the answer key's path, for every task (bar 7 covers the core ones).
- The first door each session tried (the Data place, the table, the Style tab, the inspector, the
  start screen), and which route each success took.
- **Fix coverage**: for each decided fix R1 to R15 in `decided.md`, the sessions that reached it on
  its route, or "not re-tested". An unreached fix is never reported as passed.
- T63: whether the participant's report named the place columns (graded) and whether they opened
  Fields to check them.
- Problems by kind and severity, and by the package that owns them (graphty-element, graphty app,
  compact-mantine).
- Words on each data screen at rest, counted by hand by the content designer.
- Sessions run on Sonnet after an API error, counted apart.

## Round plan

- **One round of sessions** (owner, 2026-10-29: this tier is done in 12 to 24 hours).
- **Dry run first**: every task piloted three ways (success path, its commonest detours, keyboard)
  on the frozen build. The dry run fixes only a crash, a blocked task or a result that would spoil
  a grade on a success path or a listed detour; everything else goes to `backlog.md`. One fix pass
  where possible, two at most; still not ready after two, the studio stops for the owner.
- **Sessions**: at most **30 in the round**; `roster.md` plans 28. Core tasks (T61, T62, T65, T67)
  run 4 pointer sessions each (2 per half); the other five run 2 (1 per half); Sam runs 2 more,
  keyboard only, counted only in bar 5.
- At most **8 participants alive at once** (the browser gate's 8 slots).
- **No step cap.** A session ends when the participant is done, gives up, or repeats without
  progress.
- **Step notes** are one or two sentences, in character.
- **Retry on an API error**: the same prompt from a clean folder, then once on Sonnet; the model is
  recorded in the session's grade, and Sonnet sessions are counted apart.
- A **follow-up question** (T61 and T65) is asked by the workflow after the participant's first
  `--end`.

## When the studio stops

- All seven bars hold: the study is done; the director writes `report.md`.
- The round ran and a bar fails: the studio still stops after this one round (the owner's time
  box); the decided fixes of the round are made, landed and reported, and the report names what
  would need another round.
- A one-way-door decision (a breaking published API change, or a product question the design
  does not settle): the studio stops and asks the owner once.
- The safety cap: 2 dry-run fix passes before the round.

## Change log

- 2026-10-29: written for tier 4 (data management), one round, before any session.
- 2026-10-29: frozen on build 7de2dc4e23, which holds the fifteen decided fixes. Changes from the
  criteria reviews, each with its reason:
    - Grades read the step log and the end-state records, not only the last screenshot. Four of
      nine tasks change Data > Fields or Filters, which the last screenshot shows only if the
      participant ends there, and wrong turns cannot be counted from one picture.
    - The end-state check joins bar 4. It is the only check that can see bar 4's own severity 4
      cases (a filter or an export that drops rows silently).
    - "Confirmed" no longer lets the screenshot audit confirm an expert finding it cannot see; an
      expert finding plus a scripted repro now counts. Bar 6's hotkey and table-only rules are
      confirmed by repro, its wording rules by the audit and a word budget.
    - Bar 1 counts pointer sessions only and states its arithmetic. Sam's two sessions had been
      counted inside the core halves, which left two halves with one pointer session.
    - Bar 5 adds scripted axe on the tier 4 screens. Sam's two sessions alone never reach the web
      address box, the issue list or the export dialog; tier 3's axe bar had been dropped.
    - Bar 7 (cost) is new. Tier 3 ended at 55 of 56 successes, so success alone cannot tell the
      builds apart; steps and the first door can. The limit is fixed now and never re-set from the
      round's data.
    - "Before the first session" is new. The answer key held values worked out from the files, not
      read off a screen, and three paths predated the decided fixes.
    - Fix coverage is reported, so a fix no task reaches is "not re-tested", never passed.
    - Tasks, answer key and roster changed with these reasons (see each file): three prompts no
      longer echo the words of the control they test (T60, T64, T65); T65 B moves to the river
      gauges so the filter wording meets a second domain and a date condition; T63 must name the
      place columns, because the program sets them at load and that half could not fail; T62
      counts only a changed column kind; T68 starts with one node left out of the picture, so an
      export that drops rows can be seen; every returning persona starts from a project that
      matches their history; Sam takes T61 so the keyboard meets the file chooser and the join
      screen; two pointer sessions added (28 in all).
- 2026-10-29: round 1 build moved from 7de2dc4e23 (served from
  .worktrees/design-studio-tier4/tmp/study-builds/tier4-r1-7de2dc4e23) to 0ffeae2ef5, the same
  studio work with the current master merged in, so the round does not run on a stale app. No
  criteria changed.
- 2026-10-29: the answer key read off build 0ffeae2ef5 from the dry run's three-way pilots of
  every task (success path, detours, keyboard); no bar changed. Each change, with its reason:
    - Every "(pilot to confirm)" value replaced by what the screen shows, and the build named in
      the key moved to 0ffeae2ef5. The gate refuses a key that still holds one.
    - `real.mjs --end` writes no `data.json` on this build, and no record holds a column's kind,
      a role, a filter card or a fix. The key says to read those from the screenshots and the step
      log until it does (before-the-first-session item 4 still stands).
    - T60: the "also success" door is Sources "+" > Network data..., not Server...: no Server kind
      loads a file address. The address box has no Open button; Enter opens it. Server... and the
      start screen's Web API card are listed as dead ends.
    - T61: the repeat shows only on the join screen; the second file's row hides its edge count
      under the issue chip (tooltip only); opening deliveries.csv first gives 19 edges with the
      repeat kept, which counts for that route; Replace gives the same counts as a join, so only
      Sources tells it apart; Quick actions > Add data... is a second door that drops the unknown
      node (P if nothing that did not fit is named). Path steps: 6.
    - T62: designating the time does not change the column's kind, so "Set in Data" and Fields
      "+" > Time are P, as the key already said they would be; the kind is named "Type" in the
      header menu, the only control that sets it. Path steps: 5.
    - T63: "Set in Data" sets the time in place without opening Fields; the header menu's Role >
      Time is a third route.
    - T64: the visible label is "Higher means" with closer, farther and capacity; A's "stronger" is
      closer. A weight set from the table header leaves the reading empty, which Analyze reads as
      farther (P on A). Find works in the Graph place's find box, not the toolbar search. B path
      steps: 9.
    - T65: A's controls named (Add filter, Add a condition, Between from 10, Is any of, Select);
      the screen counts 5 selected because a Select card also selects a hidden node, so a report of
      5 with the cards right is graded on the cards while that defect stands. B's date condition is
      not offered, so B's second half is blocked on this build. A path steps: 12.
    - T66: the Data source card also leaves out every edge from the second file (12 of 13 nodes,
      0 of 18 edges); an id card cannot leave one node out (no negative match, Hide keeps the
      matches), so the key's id route is removed and the blank-name route is written as `site` /
      `station` "Has a value" with Hide.
    - T67: A's chip holds 2 issues, B's 3 (with telemetry "could be yes/no"); B's "With issues 11"
      comes from that suggestion; nothing is offered for A's volunteer_run; B's header Type > number
      also clears the depth issue. Path steps: 3 (B 4 with Read as yes/no).
    - T68: the start shows 0 edges in the picture, so a "Shown" export writes an empty edge file
      and the export screen counts nodes only: that is the severity 4 candidate, not the
      equally-right case. Export opens on Data with CSV; a "Styles lost" step with Save anyway
      always follows while a node is out of the picture.
    - The three setups the key names (`gauges-tidy.txt`, `pantries-narrowed.txt`,
      `gauges-narrowed.txt`) were written by the pilots, started without `SETUP FAILED`, and are
      now in `rounds/tier-4/setups/`.
    - tasks.md: the T62 and T63 detour lines name the inspector's button as it reads, "Set in
      Data". No prompt was wrong on this build; T65 B is blocked by the build, not by its wording.
- 2026-10-29: round 1 dry run 1 build moved from 0ffeae2ef5 (served from
  .study-builds/tier4-r1-0ffeae2ef5) to 037e96e9bb (served from .study-builds/tier4-r1d1-037e96e9bb),
  which holds the fix pass's committed changes to the data panel and export with the current master
  merged in. No criteria changed.
- 2026-10-29: answer key matched to build 037e96e9bb from the targeted re-pilot (no bar, success
  definition or step count changed; tasks.md needed no change):
    - Header: the key names 037e96e9bb; a 0ffeae2ef5 note no 037e96e9bb note replaces still holds.
    - T61: the second file's row shows A's 18 whole (tooltip unchanged, file name cut to "d..");
      Quick actions > Add data... now opens the join screen and gives the path's result, so it is
      graded as the path; "Open as a separate graph" is written as two projects.
    - T62: after "Set in Data" or Fields > Time the cells stay ISO text (still P by the header
      glyph); the captions and top rows of both paths are written; B's header past the table's
      edge needs two clicks and its right-click did nothing; the header menu's keyboard opening is
      named.
    - T63: Role > Time undo notice, no Latitude/Longitude mark in the table, and the Map layout's
      dead "Location" button are noted.
    - T64: a weight set from the table is no longer read as farther; Analyze does not read it, so
      that route is P on A and B until "Higher means" is set. The Analyze list's per-run weight,
      the re-run that keeps the old result and the code-named path result are noted.
    - T65: B's date condition exists on 037e96e9bb, so B is no longer blocked; the date card's raw
      number wording is noted.
    - T66: 037e96e9bb keeps the other file's edges (12 of 13, 17 of 18); the id card offers no
      Has a value; the id column's "Filter to..." does nothing; the hiding style layer is written
      as not success.
    - T68: a Shown export now writes 17 edges and the screen says "Shown 17 of 18", so it can be
      the equally-right case; the source row and table options export doors are noted.
- 2026-10-29: round 1 dry run 2 build moved from 037e96e9bb (served from
  .study-builds/tier4-r1d1-037e96e9bb) to ff17391bb1 (served from .study-builds/tier4-r1d2-ff17391bb1),
  which holds the second fix pass's committed changes (a select condition limited to what is in the
  picture, a run asked again after the default weight changed computes again, every inspector node
  row called by its name) with the current master merged in. No criteria changed.
- 2026-10-29: answer key matched to build ff17391bb1 from the targeted re-pilot (no bar, success
  definition or step count changed; tasks.md needed no change):
    - Header: the key names ff17391bb1; a note naming an earlier build that no later note replaces
      still holds.
    - T61: the second file's row, the deliveries-first order (19 edges, "1 repeated edge") and
      Replace's join-like result hold on ff17391bb1; with Replace chosen the join screen's header
      still names the join, and the Undo notice names the file that replaced; the separate project
      carries the old project's last notice.
    - T62: the header right-click opens the menu on A and does nothing on B; the path says so.
    - T64: Shortest path reads only a "farther" weight, so A with "closer" set opens on None and
      lists the weight as "not read" (still graded on Data > Fields); on ff17391bb1 a re-run after
      the reading changed computes again, and the path result lists names once the label is set.
    - T65: ff17391bb1 selects only what is in the picture (A 4, B 3), as the success definition
      already says.
    - T66: B with both files ticked reads "12 of 12 nodes" with no edge count; the card's effect
      control reads "Select | Hide".
    - T68: B's default scope reads "All 12 nodes, 14 edges"; B's gauges.csv row export (11 nodes,
      0 edges) is written as not success and the flows.csv row and table options exports as
      success.
- 2026-10-29: answer key matched to build ff17391bb1 from the second targeted re-pilot of T60, T61,
  T63, T66 and T67 (no bar, success definition or step count changed; tasks.md needed no change):
    - T60: the source's inspector still shows a file glyph and "Source" on ff17391bb1; the empty
      project's canvas card offers only File... and Samples..., with no door to an address.
    - T61: Quick actions > Add data... opens the join screen on ff17391bb1 too; the Edges table
      marks the Source column and draws P05 in the warning color though P13 is the unknown end, and
      the grade notes that steer when a report names P05.
    - T63: "Set in Data" still sets the time in place and Role > Time still undoes with its notice;
      Escape from the Map options leaves Map unapplied; Fields "+" > Time adds an empty line that
      Escape takes back without a notice.
    - T66: an id card for one node leaves only that node on ff17391bb1 too (B 1 of 12, 0 of 14).
    - T67: the pilot named the earlier key and build 0ffeae2ef5; every point it raised (no Data
      step, no yes/no offer for A's volunteer_run, the header list's "Ignore all") is already in
      the key, so nothing changed.
- 2026-10-29: frozen on build bccf8fe47f (served from .study-builds/tier4-r1d2-bccf8fe47f), replacing
  ff17391bb1 (.study-builds/tier4-r1d2-ff17391bb1). It adds the issue that names which end of an edge
  is unknown, and a redone condition change that selects among what it leaves visible.
- 2026-10-29: answer key matched to build bccf8fe47f from its targeted re-pilot (no bar, success
  definition or step count changed; tasks.md needed no change):
    - Header: the key names bccf8fe47f.
    - T65: the Select card's chip still counts over the whole graph (A 5 of 24, B 5 of 12) while 4
      and 3 are selected; the change that made it count only what it marks was taken back before
      this build. The key's 4 of 14 / 3 of 5 lines are replaced by the screen's, and a report of 5
      read off that chip is graded on the cards and the selection. The collapsed date card still
      reads a raw number.
    - T60, T61, T66, T67 and T68: the walks matched the key; the T67 points came from a walk on
      0ffeae2ef5 and were already in the key; "Select | Hide" stays the screen's words.
- 2026-10-29: frozen on build a53beb7179 (served from .study-builds/tier4-r1d3-a53beb7179), replacing
  bccf8fe47f (.study-builds/tier4-r1d2-bccf8fe47f). The Select card's count change stays taken back,
  so the chip still counts over the whole graph; the build adds master's overlay behavior changes.
- 2026-10-30: answer key matched to build a53beb7179 from its targeted re-pilot of T60, T65 A and
  T66 (no bar, success definition or step count changed; tasks.md needed no change):
    - Header: the key names a53beb7179.
    - T65: A's Select card chip still reads 5 of 24 while 4 are selected, in either order, as the
      key's card-count line says; on this build A's chip has no accessible name, so a
      screen-reader participant hears the marked count only from "4 nodes selected".
    - T60 and T66: every route matched the key (A 24 / 59, B 331 / 361; A 12 of 13, B 11 of 12 and
      13 of 14). The pilots' points that the address box has no Open button, that Server... loads
      no address, and that the card reads "Select | Hide" are the screen's words the key already
      holds.
- 2026-10-30: answer key and T66's prompts matched to build a53beb7179 from the pilots of T60 A, T65
  A (every fix-list route), T66 A and B, and T67 A (no bar, success definition or step count
  changed):
    - T60: the Server form and Web API card dead ends are confirmed on a53beb7179 (Enter in the
      form does nothing, Load and Test dimmed with no tooltip); the key says plainly that Sources
      "+" > Server... is not the in-project route; the main menu's find box shows the browser's
      raw "Paste failed" error where clipboard reading is denied.
    - T61 and T65: the deliveries-first order still keeps the repeat (13 nodes, 19 edges) and the
      collapsed date card still reads a raw number on a53beb7179; the key's build ranges now say so.
    - T66: the second file's issue list offers "Leave out" for the unknown end, and on a53beb7179
      it deletes the node and its edge, leaving the success number (B 11) with no "of" count. The
      key names that route under Not success and grades on the top bar and inspector. The prompts
      said "Leave it out of the picture", the button's own words; they now say "Take it out of the
      picture", and "leave out" joins the avoided words.
    - T65 A, T66 A and T67 A: the other points were already in the key ("Select | Hide", the
      Select card chip's whole-graph count, the T67 points from a walk on 0ffeae2ef5).
- 2026-10-30: frozen on build 79ed770292 (served from .study-builds/tier4-r1d3-79ed770292), replacing
  71230abff1 (tmp/design-studio/tier4/builds/tier4-r1d4-71230abff1). The app, graphty-element and
  compact-mantine sources are the same as 71230abff1; the new build adds only master's CI tool
  changes and study documents, so the answer key's build ranges for 71230abff1 hold.
