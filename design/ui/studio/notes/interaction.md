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

- 2026-10-09 **The dry runs walked only the answer key's routes.** Four builds plus the frozen
  build were walked task by task and every success path worked; no participant met a broken
  control there. Participants' detours (styling, selection display) met build defects no walk had
  touched. From now on a dry run also walks each task's commonest detours (the previous round's
  wrong turns, plus "what would a person try first"), and each one-session defect gets a script.
- 2026-10-09 **Round 2 proposals (smallest set):** (1) the source inspector shows "Edit source..."
  and "Replace with file..." as visible actions -- one change that serves T20 and T21; (2) the find
  box's "No match" on text holding a comparison says how a rule starts, with the existing example;
  (3) the canvas key marks an out-of-date run like its row does; (4) fix Edges Color writing to
  Everything. Reasons and evidence under Decisions.
- 2026-10-09 **Do not change in round 2:** where Filters lives (7 of 8 found it at the success
  path's cost), the Replace page, the import page's "Higher means", the Path popover's flow, the
  neighbors list, label placement in the app (element class), Hops wording, notes' subject.
- 2026-10-09 **A visible door beats a new route.** Edit source already reaches "Higher means"
  without dropping the graph, but only by right-click. Surfacing an existing command is cheaper
  and safer than a new one.
- 2026-10-09 **Selection display repainting fills is a design question, not a defect yet** (path
  looks one node short, new fill hidden until deselect). Needs a decision on how selection is
  marked (element style), not an app patch.
- 2026-10-07 **A decided change that is not verified on the served build is not done.**
- 2026-10-07 **Recovery routes are first-class.** Fit is what a lost reader presses; "Back to
  start" must never be the only way to a setting (T20).
- 2026-10-07 **Simulated participants are one model and follow their histories.** A first move
  that matches the history says little; trust reproductions and causes in code. Label a give-up
  that follows a persona's scripted rule.
- 2026-10-07 **Element English leaks into my refusals.** In-place refusals hold; their words come
  from codes.
- 2026-10-07 **The neighbors flow is done** (round 2 8 of 8). Do not touch it.
- 2026-10-06 **Change one thing per problem per round,** so the round can tell what helped.
- 2026-10-06 **Every detour must work or not look clickable. Refusals in place, under the field,
  until the value changes.**
- 2026-10-06 **Not doing yet:** first-run tour, toolbar words, names drawn by default.
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
- 2026-10-06 (mine, reversible) Notices also pause while they hold keyboard focus, are announced
  in a polite live region, and are never the only route back. Not yet built.

- 2026-10-06 (mine, reversible, round 2 proposal) The "Neighborhood" command with one node
  selected does exactly what the Degree row does: select the one-hop neighbors AND open the
  named list. Evidence: `toolbar/commands.ts` `selection.neighborhood` only calls
  `selection.apply`; `NodeValues.tsx` `openNeighborhood` also sets the inspected list; 0 of 4
  found the list (r1-s17b, s19b, s21b, s22b).
- 2026-10-06 (mine, reversible) A layout refusal is shown under the Method field until the
  method changes, worded by the app from graphty-element's reason code; not a timed notice.
  Evidence: r1-s43b `06.png`, the notice drawn as a bare "x" beside the popover.
- 2026-10-06 (mine, reversible) A multi-node Summary omits a text attribute whose commonest
  value occurs once (all values distinct) rather than print "Babet (1)". App words over the
  element's `distribution` fact.

- 2026-10-06 Round 1 decisions I hold to (Design Director, from the skeptic-checked insights):
  Neighborhood on one node opens the named list; Summary drops "Babet (1)" and "Edges 0" (delete
  words, add none); Selection row and Sources tables stop dead-ending; empty combo has no arrow;
  "No crossings" refusal under Method; wheel zoom in the orbit camera; focus ring for every
  control; focus to the new Style line; runs named by method. Rejected: Degree cue (two changes at
  once), Summary listing names (second neighbor surface), new refusal code, notice-slot changes.

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

- 2026-10-07 Tier 2 proposals (mine, for the Director; from the tier 2 audit and refined B
  sections 2.3, 7, 8, 10.1, 10.3, 11.3). Keep refined B where decided. Mine where it departs or
  is silent: (a) the path run's Values tab lists the route in order with hop count and total,
  chosen by the element's per-field type, never a histogram on a boolean (audit crash at
  `RunValues.tsx:171`); (b) Find with a leading "=" shows a live first row "Select where <rule>:
  N edges" and a malformed rule's reason under the box from an element code (today the error
  escapes uncaught); (c) Replace with file marks each changed row "Numbers changed" and offers
  Rerun on the row, not an automatic rerun of slow runs (criterion 6); (d) the filter chip is
  drawn only once a step exists (restraint) -- refined B draws "Full graph" always, open;
  (e) Analyze shows "Weight: not read by Degree" on entries that read none, from a catalog fact.
  Open owner questions: how a "stronger" weight becomes a distance for shortest path (1/w,
  refuse, or ask); bare numbers in the rule language (`weight > 3`) as a query-language change.

- 2026-10-09 Round 2 proposals after tier 2 round 1 (mine, reversible; for the Director):
  (a) **Source inspector shows "Edit source..." and "Replace with file..."** as buttons, the same
  commands as the row's right-click menu (`DataPlace.tsx` `useRowMenu`; `data-page/request.ts`
  `editSource`, `canReplace`). Evidence: 8 of 8 hunted for Replace, 7 left-clicked the row and saw
  only facts (`r1-s29/08.png`); T20's "Back to start" dropped the graph (`r1-s05/09.png`) while
  Edit source already reaches "Higher means". Rejected: a hover "...", a main-menu entry (two new
  homes), a new "set weight meaning" route.
  (b) **Find box: "No match" for text holding <, >, = or != says "To select by a value, start
  with =, such as <example>"** using `exampleRule` (`FindBox.tsx` emptyLine). App words, no
  parsing beyond spotting the operator. Evidence: 4 of 4 typed `minutes >= 10`, got only "No
  match" (`r1-s46/12.png`). Rejected for now: bare numbers in rules (owner's query-language
  question), a "Select where" on the column (second change to one problem; next if (b) fails).
  (c) **The canvas key's heading for an out-of-date run carries the same out-of-date mark and
  words as its row** (stale state is an element fact). Evidence: bar 5 fails as written,
  `r1-s28/07.png`; two experts. Rejected: dimming the drawing (a reader's choice).
  (d) **Fix Edges Color writing to Everything** with a run's layer open (r1-s43, r1-s46,
  `r1-s46/05.png`): a defect, fixed between rounds.

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
