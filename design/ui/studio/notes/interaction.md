# Interaction Designer's notes

I own flows, states, feedback and recovery in the graphty app: what happens on every click, what
the reader sees while something runs, how errors and undo work, and the keyboard paths. These
notes are my memory across studio sessions. Read "Top of mind" first; update it whenever a
decision or a finding changes it.

Terms used below: the **graphty app** is the React shell (chrome only); **graphty-element** is
the web component that owns every graph capability. The **real app** is the tier 1 workspace
served at `/?next` from a local production build. The **skeleton** (or **mock**) is the clickable
prototype `prototype/app-b/` that rounds 7 and 8 were run on. **Tier 1** is a first-time user's
core path from an empty app: pick a sample or bring a file, read what loaded, run one analysis,
color or size by it, put names on, find a node and its neighbors, save a picture and the numbers,
save and reopen.

## Top of mind

- 2026-10-09 **A dry run must walk the detours, by pointer AND keyboard, and the study tool must be
  dry-run too.** Tier 2 round 1 had a dry run (four builds plus the frozen build), but only on the
  answer key's routes, by pointer only. Participants met build defects only on detours (Edges Color
  to Everything, halo tint, focus to the page after Add/Delete step, Enter not committing a step);
  the study tool reached them more often than the build did (over four browsers, wrong-row matches,
  a dead synthetic drop, missing bar scripts). Round 2 starts only after a written detour walk.
- 2026-10-09 **Round 2 changes I own or watch** (one door per problem): find's empty line offers
  "start with =" only when the ELEMENT accepts "=text" as a rule (no app parsing); the source
  inspector gets a "..." menu (Edit source, Replace), not visible buttons; a data file opened from
  the start screen goes through the Data page; focus after Add/Delete step and find's Escape, Enter
  commits and Escape closes a step edit; load words true and spoken once; key says ", out of date";
  no silent Everything in style lines; path Weight starts on the loaded weight.
- 2026-10-09 **Round 2 answer: the dry run happened and participants mostly met design questions,
  not broken controls.** About 30 of 355 recorded problems were build faults, none above severity
  2, no grade decided by one; 12 of the 30 sat on the one detour no walk covered (styling a
  selection: a new line starts at the element's default, the look every tie already has, so it
  draws nothing). The worse leak was the study: participants read `tasks.md` (control names,
  follow-ups), so round 2's route credits are void until re-run with briefing-only sessions.
- 2026-10-09 **Round 2 results on what I watched:** the "start with =" hint failed its floor (6 of
  8 typed the data's words, "chapters 10", and got only "No match"; backticks stopped 7); Replace
  in "..." found 8 of 8 but by guessing and under facilitator leakage; Open on a newer copy still
  offers only Add, which doubles the ties (82 from 41). Next: column rows in the plain find list,
  Enter runs the element's corrected rule, a new line opens its value, a doubling Add says so in
  place with a Replace door. Not "Select where..." yet.
- 2026-10-09 **A starting value equal to what is drawn is a silent no-op.** A line added with "+"
  must ask for its value (open the picker), not start on the default the layer below already draws.
- 2026-10-09 **A visible door beats a new route,** but words at rest do not rise: the Director chose
  a header "..." over my visible buttons. Surface existing commands; do not add homes.
- 2026-10-09 **The halo tint was a defect, not a design question** (its docs say ring). Read the
  component's own contract before calling something a design choice.
- 2026-10-09 **Two routes to one command must behave the same** (Open from start vs inside a project
  differed). Same lesson as neighbors: the door a newcomer picks is the broken one.
- 2026-10-07 **A decided change that is not verified on the served build is not done.**
- 2026-10-07 **Recovery routes are first-class.** "Back to start" must never be the only way to a
  setting.
- 2026-10-07 **Simulated participants are one model and follow their histories.** Trust
  reproductions and causes in code; graders label scripted persona exits.
- 2026-10-06 **Change one thing per problem per round,** so the round can tell what helped.
- 2026-10-06 **Every detour must work or not look clickable. Refusals in place until the value
  changes.**
- 2026-10-06 **Where a fix goes:** graph logic in graphty-element; flows, focus, words in the app;
  shared control defects in compact-mantine.

## Priorities and values

- 2026-10-06 **Safe exploration over protection.** The owner's founding brief: design for the
  intermediate user, make exploring safe through undo, not through wizards, warnings or confirm
  dialogs. A first-time user is served by aids everyone gets (undo, working defaults, tooltips
  with the key, (i) on technical terms, samples), never a first-run mode.
- 2026-10-06 **Feedback at the smallest scope that shows it.** The change itself first (the
  drawing and legend), then the object's row state, then one notice only when the effect is out of
  sight. A first-time user believes the screen; if the panel says one thing and the drawing
  another, they stop trusting both (round 8: "the panel said one thing and the drawing showed
  another" was the most common reason not to switch tools).
- 2026-10-06 **Every claim on screen is computed from live state.** Fixed counts ("64 hidden",
  "32 rows") were round 8's top trust-killer. A message that cannot be computed is removed.
- 2026-10-06 **One pattern per job, one home per feature.** The owner asked (2026-09-30, third
  review) to make interaction patterns the same everywhere. A command is registered once and
  every door to it (key, menu, Quick actions, selection bar) uses the same words; two controls
  that set the same state are a defect.
- 2026-10-06 **Keyboard and screen reader are first-class.** WCAG 2.2 AA in the default state;
  the table and inspector are the canvas's text equivalent; every task has a keyboard path.
- 2026-10-06 **Restraint.** The owner repeatedly rejected text-heavy, cluttered screens. My
  feedback must be short and in place, not banners and explanations.

## Design criteria

Each with its reason. A screen that breaks one is a defect.

1. **Visible on commit.** Every committed step changes the canvas and legend the moment it
   commits, or a line in place says why not. Reason: rounds 7-8, feedback gaps decided tasks.
2. **No preselection where the reader must choose; nothing starts unasked.** Opening a file shows
   the file; samples open with nothing run. Reason: framework principle 0; round 8 the pre-run
   PageRank on the sample blurred the reader's own results.
3. **One undoable step per act, labeled.** No confirm for undoable acts; confirm only for
   irreversible loss, as "[Verb] [thing]?" with one sentence on what is lost. Reason: owner,
   Figma convention; round 1 showed silent undo loses people (5 of 5 lost a good step).
4. **Esc ladder.** One thing per press, innermost first; an Esc that closes an overlay does
   nothing else. Reason: round 6, one Esc both closed a list and reset the page (4 sessions hit).
5. **Focus is never lost and never moves selection or paint.** Overlays focus their first field
   and return focus to the opener; focus never falls to the body. Reason: round 6-7 findings;
   owner 2026-09-13 ("can't type in text boxes or text entry not selected by default").
6. **Running work shows state on its own row;** over about 10 s it is cancellable and names its
   cost before it starts (estimate from graphty-element). Reason: framework cost classes; the
   stalled Betweenness run.
7. **A problem is one block:** what happened and what to do, at most one action, at the smallest
   scope (the field, the row, the page). No modal errors. Reason: the broken-file refusal with
   line numbers was one of the most trusted screens (8 of 8 would forward it).
8. **Disabled is explained.** Grayed, still focusable, reason in the tooltip or on a menu item's
   second line; nothing needed to finish a task lives only in a tooltip. Reason: icons-only
   toolbar; screen-reader users.
9. **No dead controls, no unbuilt promises.** An unbuilt item is not drawn; a drawn one acts.
   Reason: round 8 "not available yet" dead ends ended 12 of 12 label sessions on the mock.
10. **Every count names its unit and its whole, and is a link that selects what it counts.**
    Reason: round 7 rule; "17 neighbors" with no names failed 12 of 12.
11. **Notices:** one slot, one message, at most one action, never the only route back. Reason:
    the undo notice tests (round 6: notice alone lost the selection 5 of 8; with Ctrl+Z restore 0
    of 8).
12. **Words on a control match the result.** The verb clicked names the row produced; a door's
    label is its command's label word for word; no two reachable controls share an accessible
    name. Reason: "Data" on both rail and tab dropped the selection 12 of 12; "Show labels" vs
    "Label line".

## Decisions and reasons

- 2026-09-13..10-03 (summarized; owner = decided by the owner) Panels stay open, no locks or
  autohide (owner). Algorithms layer styles and never mute the rest (owner). Every action undoable,
  history in graphty-element (owner). Shift+Arrow walks nodes (owner). Every undo and redo shows a
  notice (5 of 5 lost a step silently). Selection changes are not undo steps; Ctrl+Z restores a
  cleared selection from one slot (0 of 8 wrong vs 5 of 8). Esc does one thing per press,
  innermost first. A run paints when it finishes (owner). Rename by double-click and F2 (owner).
  Toolbar icons only (owner). Unset style values not drawn; "+" adds a property; popovers, never
  accordions (owner). Surfaces: dark menu picks, light popover edits live, page takes the
  workspace, modal only for Export, Settings, shortcuts, irreversible confirm. The graph is never
  put into the selection. No confirm before costly runs; cost, Stop and Undo instead. Label "+"
  adds a line and opens its list. Find box is one live list ("/" focuses it). A single node opens
  on Values; Degree opens the named neighbor list. Export > Data opens on the showing table. Build
  the real app (owner, 2026-10-03). Delete acts at once with Undo. A bind on a row edits that row.
  The element returns facts and codes; the app writes every word (owner).
- 2026-10-06 (summarized) Mine: notices pause on focus, polite region, never the only route back
  (not built). Round 1 held: Neighborhood on one node opens the named list (both doors share one
  function); Summary drops "Babet (1)"; "No crossings" refusal under Method from a code; focus to
  the new Style line; runs named by method. Rejected: Degree cue, Summary names, notice-slot changes.

- 2026-10-07 Round 2 decisions (Design Director), with my proposals' fate: menu dialogs keep
  focus -- fixed in compact-mantine's Menu, not per caller (mine was app or shared; the shared
  fix is right: a third `returnFocus={false}` copy is the forbidden pattern). Clickable row's
  trailing glyph inside the hit area, compact-mantine (mine, taken). Key leaves out a fully
  covered layer, element (mine, taken; the element already detected the cover and only said it in
  English). 2D Fit frames the whole graph, element. Finished load and run announced in the one
  polite region, replacing "added, running" (mine, taken). Canvas gets the host's `aria-label`
  and a visible focus ring. Group layouts offer community results via `catalog.optionsFor`
  (app's `groupings()` deleted). Runs named by method. "Show all labels" beside the hidden count.
  REJECTED: my "Size arrives bound to the run" -- a community run would size by group id; Size
  "+" opens its picker instead (Label "+" pattern). Not changed: Force unsettled cloud (untraced),
  4x print export, key placement and fit inset (new API, seed is the owner's).

- 2026-10-07 (summarized) Tier 2 proposals: path Values lists the route; Find with "=" selects by
  rule with element-coded reasons; Replace marks changed runs, Rerun on the row; filter chip only
  once a step exists; Analyze says which weight a method reads. Owner questions: stronger weight
  as distance; bare numbers in rules.

- 2026-10-09 Tier 2 round 2 decisions (Design Director) and my proposals' fate:
  (a) source inspector doors: TAKEN AS A "..." HEADER MENU (Edit source, Replace, same `canReplace`,
  verbs shared like `attributeActionsOf`), not my visible buttons -- buttons add words at rest.
  (b) find hint: TAKEN, BUT the element decides: the app asks `session.scope.count({ where: "=" +
text })`; accepted or refused only with `number-needs-backticks` -> "To select by a value, start
  with =, such as <exampleRule>"; else "No match". Better than my operator-spotting (no app syntax).
  (c) key ", out of date": TAKEN, words only, from `run.stale`. (d) Edges Color to Everything:
  TAKEN at the root -- `writeLine` loses its default layer; a row with no layer for a side shows
  no lines for it. ADDED by others, mine to watch: start-screen data file opens the Data page;
  focus after Add/Delete step and find Escape, Enter/Escape in step edits, named note deletes;
  load status uses `headerName` and left-out count, spoken once after mount; path Weight starts on
  the loaded weight; "Total minutes"; Replace page button "Replace"; path aliases. Halo drawn back
  faces only (element). Not now: "Select where..." (only if the hint fails), Filters' home, label
  overlap (element issue), bare numbers (owner), compact-mantine Toast role and segment contrast.

## Tried: worked / did not work

- 2026-09-13..29 (summarized) Did not work: v1 panel locks and autohide (one rule needed); a
  palette and search box that did not focus (initial focus goes to what opened); silent undo (5 of
  5 lost a step; Ctrl+Y must be Redo off macOS); a filter-step undo that DELETED the step
  (severity 4: undo unticks and keeps it -- applies to tier 2 Filters); Find focusing without
  selecting; a notice lasting "until the next action". Worked: Ctrl+Z restoring a cleared
  selection (0 of 8 wrong vs 5 of 8).
- 2026-09-30 My groups-list proposal (measures do not auto-paint; a run's group cannot be dragged
  out of its run; Space toggles paint; Alt+Up/Down moves a row): the owner overruled "measures do
  not paint"; the keyboard map for tree rows mostly survived into refined structure B.
- 2026-10-01 First clickable skeleton (round 7): ease fell to 3.54 because 18 of 61 tasks could
  not reach their end state and the tool could not type or modifier-click. Taught: a prototype
  that cannot reach the end state measures the prototype; and the end state is where interaction
  design lives.
- 2026-10-02 Round 8 on the skeleton: the right first click, then a dead or silent second step,
  decided every tier 1 failure (labels, neighbors, whole session). The Les Miserables sample
  opening with PageRank pre-run hid the reader's own results.
- 2026-10-02 What consistently worked: the load match report; the broken-file refusal naming
  faults with line numbers; "Covered by PageRank for Color" as an in-place reason; the path tie
  report; "Note on: <thing>" before typing; the replace-and-out-of-date warning.
- 2026-10-04 Build vs mock comparison: the empty canvas card ran the wrong command (fixed); a run
  row showed an empty Style tab (fixed through `session.runs.bindings`); group Members list shows
  the first 10 in load order, not top 10; nodes named by id ("n0") in find hits, node header and
  neighborhood title. Taught: drift lands in exactly the state lines a first-time user reads.

- 2026-10-06 Round 1 on the real app (29 graded): worked -- load, broken-file refusal, ranking,
  groups, save and reopen, every run repainting at once, no false "done" in 29. Did not work --
  the neighbor list behind an unmarked Degree row and a Neighborhood command that skips it; the
  "No crossings" refusal; Size found by guessing (severity 2). Taught: two doors to one act must
  share one function, or the door a first-time user picks is the broken one.

- 2026-10-06 Re-pilot of every tier 1 task on the rebuilt app (build e82708488): all reach their
  end state by the answer key's path, no console errors. Worked: Degree and G both open the
  neighbor list; the in-place refusal line; Export kinds as tabs. Did not: "Force, flat" leaves
  an unlaid disc; overlays and the camera hide nodes; developer words in the CSV warning and the
  Overview's direction line; project name and outline disagree after save.

- 2026-10-07 Round 2 (56 graded, commit 4a7a1a7fb): worked -- the neighbors list (8 of 8, ease
  2.86 to 5.25 though round 1's scale was reversed), first-time personas 34 of 34, the in-place
  refusal, save and reopen, no false "done". Did not: the menu-to-dialog focus (ended r2-s07), the
  row chevron outside the button, the stale key row, 2D Fit, the sizing chain (18 of 18), no
  "finished" announcement, layouts (T11 ease 3.33: unsettled Force, group layouts disabled after a
  community run because the app's `groupings()` reads only file attributes). The run-name change
  decided for round 2 was never built. Taught: a decided change that does not land must be
  carried, not forgotten; and the task wording (T10 "every name") can manufacture a 3.5x.

- 2026-10-07 Re-pilot after round 2 fixes (build b7590f8de, T6-T16 by pointer): every task
  reaches its end state on the answer key's route; no console errors. Worked: run named
  "PageRank" everywhere (T7); Size "+" opens its list and binds in 8 steps (T9); group layouts
  enabled after Louvain (T11); "Show all labels" gives every name (T10); Enter opens the only
  Analyze entry. Still: Overview "Undirected, from the file: directed 0" overflows (every pilot);
  run rows open on Style, so Top 10 needs the Values tab; inspector subtitle "Measure from
  PageRank" names the row after itself; equal-bar histograms; element English refusals. Not
  walked: keyboard, screen reader, 2D Fit, menu focus. Taught: a pointer pilot cannot certify
  focus and announcement fixes; they need their own scripted checks.

- 2026-10-09 Tier 2 round 1 (55 valid sessions, frozen build 946256efb): worked -- 0 false
  "done", 0 silent commits, 0 weights read backwards; the path run, Replace page and load-time
  "Higher means" read right every time once found; T23 and T12R at or under the success path.
  Did not -- doors hidden by right-click (Replace, Edit source), a find box that answers a
  condition with only "No match", the stale key after Replace. Also the run: more than four
  browsers at once (click timeouts), missing preflight scripts, one void session not re-run.
  Taught: a dry run that walks only success paths certifies the success paths; detours need
  their own walk.

- 2026-10-09 Tier 2 round 2 (55 valid sessions, frozen build 8f0d5a6f7): worked -- 55 of 55
  succeeded; no grade decided by a build fault; the in-place load words, Enter/Escape in step
  edits. Did not -- the find hint (fires only on an exact column plus a condition), backticks, the
  style "+" starting on the drawn default, selection layers named by count ("13 edges"), Add on a
  newer copy, focus: second Escape in the find box blurs to the page (`FindBox.tsx` calls
  `blur()`), Follow arrows land focus on Hops, Tab then Escape drops a step edit silently. Study:
  facilitator file readable, prompts saying "stand out" manufactured styling, the tool's click by
  name hit a same-named row. Taught: the dry run must walk what participants are prompted toward
  (styling), not only the answer key; and a keyboard finding "handed on" to a bar is not fixed.

## Thinking

- 2026-10-06 **The chained first session is the real test of my work.** Each tier 1 task passes
  in isolation far more often than the chain (round 8: 86% without the chain, 0% with it). The
  chain fails where one step's state leaks into the next: a popover still open, a selection that
  changes what Style edits, a run that is held back by an earlier layer, a notice that has
  vanished. I want the study to log, per step, what was open, selected and focused when the
  participant moved on.
- 2026-10-06 **The "held back" run is the hardest feedback case.** When a reader colored
  Everything by hand and then runs Louvain, the owner's rule is that the run paints, yet the
  reader's own layer wins color. Today the canvas says "Hidden by your layer <name>" with Show
  anyway. Open owner question: should a run's suggested style land above a hand-written layer
  that colors everything? Until then, the notice must name both layers and the one action.
- 2026-10-06 **Label lines.** Even with the "+" fixed, the line binds nothing until an attribute
  is picked. If the participant closes the list without picking, they have an empty line and no
  names. The empty line must say so in place ("Pick an attribute") and the list should open with
  the name-like attribute first -- but which attribute is "name-like" is a data fact, so ordering
  must come from graphty-element, not app guessing.
- 2026-10-06 **Neighbors.** The named list must be one click from the node and survive Esc back
  to the node. Ids instead of names ("n0") would sink this task even with the right flow; check
  element #895 is adopted before the study.
- 2026-10-06 **Notices and time.** A 6 s notice with an Undo action is a WCAG 2.2.1 risk for
  keyboard and screen-reader users. The safe design is: the notice is informational; the action
  in it duplicates a route that never expires (Ctrl+Z, the header Undo with its label).
- 2026-10-06 **Save model.** The framework assumed autosave (no Save command, no unsaved-changes
  prompt); tier 1 ships explicit Save / Save as because browsers cannot silently write files. That
  makes the dirty state a first-time user must notice. Watch whether participants see the dirty
  mark and whether Close's "Discard unsaved changes?" ever surprises them.
- 2026-10-06 **Mid-path starts.** The real-app tool can start a session empty, from a setup, or
  from a saved project. For tier 1 every task starts empty; mid-path starts are for isolating one
  step when the chain fails.

## Sources

- `design/ui/studio/digests/` (decisions, framework, owner-voice, study-rounds, tier1), 2026-10-06.
- `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/` -- decision-log.md (rounds
  1-8), round-8/insights.md, structure-comparison/ (structure-b-refined.md 2.5, my groups-list spec).
- `.worktrees/feat-tier1-real-app/design/ui/tier1-real-app/tier1-design.md` sections 2.7, 4-6, 9.
- `design/ui/framework/interaction-patterns.md` sections 3.1-3.6.
- Built code: `graphty/src/workspace/frame/NoticeSlot.tsx`, `keys/keys.ts`,
  `project/ProjectDialogs.tsx`, `WorkspaceToolbar.tsx` (status region).
- Owner messages in `.claudehistory/` (sessions 3a19ea55 and fac8191f), extracted with
  `design/ui/studio/tmp/interaction_owner.py` and `interaction_agents.py`.
- `design/ui/studio/rounds/round-1/`, `round-2/` (insights, decisions, scores, repro r2-s07, s19,
  s56), `r2/pilot/T6-T16/pilot.md`, read 2026-10-07.
- `design/ui/studio/tier2/rounds/round-1/insights.md` and `decisions.md`, read 2026-10-09.
