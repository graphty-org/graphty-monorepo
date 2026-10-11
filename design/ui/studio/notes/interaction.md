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

- 2026-10-11 **Round 4 does not start until the study's own gate works.** Round 3's leak check read
  zero logs and said "no leaks", `--end` deleted step notes, and the prompt pilots never ran. A
  check that reads nothing must fail; each check shown failing on a planted fault first.
- 2026-10-11 **Shift-click on a node adds to the selection (element, team's call); Ctrl and Meta
  held.** Node click takes the edge click's `applyNow(..., add ? "add" : "replace")` path; XR keeps
  replace. Watch in round 4: Selection reads 2 after Gus, Shift-click Ivan; Shift-drag still drags.
- 2026-10-11 **T24 was the study's fault as much as the app's:** the prompt now names the outcome
  ("so whatever you do next applies only to those two"); the key names the Shift route only after
  it is walked on the frozen build. Walk every key route before a task runs.
- 2026-10-11 **Focus drops are scripted before fixed.** bars.mjs gains two actions (Enter on
  Shortest path; Add to Line, then Color on a selection); both must fail on 26f3bb968, then pass.
  PathForm gets `autoFocus`; the Color drop is traced in `useFocusLine`, no second mechanism.
- 2026-10-11 **"Made with" after re-run or Undo: script first.** Draft keyed by run id survives a
  re-run; clear it on finish/undo if that is it, fix the element's undo if params are not restored,
  close as not shown if it does not reproduce.
- 2026-10-11 **One variant per problem; a one-specialist claim is scripted before it is fixed.**
  Eight roles proposed up to four variants each; stacking blinds the round.
- 2026-10-11 **Round 4 watch list (mine):** T17 first moves with the new toolbar Filters icon (vs 5
  of 8 looking on the Graph place); T22 "10 or more" row (element `atLeast`, app counts nothing);
  T18 Analyze ranking (name match first, one "Start here"); edge filter step counts edges; Add
  page repeated-ties line in Load's description; disabled reason reaching a screen reader.
- 2026-10-11 **Held, first in line if met again:** Hops distance per name (needs element `hops`),
  committing a step edit on focus leave (contradicts innermost-first Escape), a notice for a
  replaced path (another spoken line on a screen that already says too much).
- 2026-10-10 **A disabled done-state is not a state.** Say why it is off (criterion 8).
- 2026-10-10 **Words at rest go down, never up.** No new words for any fix.
- 2026-10-10 **Discount behavior a prompt's own words ask for** ("stand out", "point out").
- 2026-10-07 **A decided change that is not verified on the served build is not done.**
- 2026-10-07 **Simulated participants are one model.** Trust reproductions and causes in code.
- 2026-10-06 **Every detour must work or not look clickable. Refusals in place until the value
  changes.**
- 2026-10-06 **Where a fix goes:** graph facts in graphty-element; flows, focus, words in the app;
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

- 2026-10-10 Tier 2 round 2 closed (Design Director, from insights and the red team). Round 3 is
  gated on three study-tool fixes (leak closed, pilot-route dry run, every named bar script real
  with a planted fault). My proposals' fate: find box "way on" TAKEN in a narrower form (example
  line on a miss, "=" kept on the suggestion, shown rule runs on Enter or click) -- my column rows
  REJECTED as a second door among node hits. "+" opens the value picker HELD (one change per
  problem; the element's `highlightStyle` is the fix measured). Doubling Add says so in place with
  Replace beside Load: TAKEN, but the count comes from the element, not file names. Also taken:
  three focus fixes, step edit commits on Tab/click-away, "Filter to neighbors" as a plain command,
  repeated status re-announced, rule-named layers, weighted path row shows "<column> <total>",
  Shortest path search aliases, 24 px hit area on the extra-small Checkbox (compact-mantine). Not
  changed: label overlap (element, owner), bare numbers and edge width units (owner, breaking),
  neighbor list by distance (waits on the element), "Components 1" under a filter (held so the
  words change is measured alone). Reason throughout: no second door where one is measured.

- 2026-10-10 Round 3 critique, mine: Shift/Ctrl-click adds (element); PathForm focuses its first
  field with `autoFocus`; a selection layer's style pick focuses the new line; Made with reads only
  the run (after a script pins the mechanism); "Filter to neighbors" says why it is off; Analyze
  ranks a name match above a description match; the find Values row wraps instead of cutting.
  Held: "or more" for a bare number (the element suggests rules; one change per problem), a
  Filters door on the Graph place, announcing a replaced path, Hops distance (waits on element).

- 2026-10-11 Tier 2 round 3 closed (Design Director). 54 of 56. Decided for round 4: study gate
  enforced (leak check fails on unread logs, `--end` never removes notes, runner refuses a round
  without pilots and bars); T24 prompt reworded to the outcome; Shift-click adds on a node
  (element); bars.mjs fixed (bar 9 excludes data names; two focus actions; find list axe hit as an
  exception if ArrowDown scrolls the active option); Made with scripted first; PathForm
  `autoFocus` and the Color focus drop; find "or more" row via element `atLeast` and "Select where"
  dropped from visible text (my wrap proposal not taken: shorter text should fit); Analyze name
  match first; toolbar Filters icon to the existing step editor (my "hold" overruled: the one clean
  case of no control where people look first); repeated-ties line as a described warning; edge
  filter step counts edges (script first); disabled reason via compact-mantine Tooltip (check
  first). Reason throughout: one variant per problem, fixes in the owning package, no words added.

## Tried: worked / did not work

- 2026-10-10 Round 2 (all 55 sessions succeeded; weak evidence because of the leak). Did not work:
  the "start with =" hint (shown only when the exact column and a condition are typed; 6 of 8 typed
  "chapters 10" or ">= 10" and got "No match"; backticks stopped 7); a new style line on the
  element default (draws nothing); a second Escape in find (drops focus); Follow arrows (jump into
  Hops); "Filter to neighbors" as a toggle; the 12 px step checkbox. Unproven: Replace in "..."
  (8 of 8 found it by guessing, under the leak), weight meaning at load. Disputed, to script: a
  half-made step discarded on another selection; empty-canvas click while a run is selected.
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
- 2026-10-02..07 (summarized) Round 8 and the build comparison: a dead or silent second step
  decided every tier 1 failure; drift lands in the state lines a first-time user reads. Worked
  throughout: the load report, the broken-file refusal with line numbers, in-place reasons, "Note
  on: <thing>". Rounds 1-2 on the real app: two doors to one act must share one function; menu
  focus, row chevron, stale key, 2D Fit, the sizing chain, layouts failed and were fixed; a pointer
  pilot cannot certify focus and announcement fixes.
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

- 2026-10-10 Tier 2 round 3 (54 of 56, build 26f3bb968). Worked: the find box's example line,
  the "=" kept on the suggestion and Enter running it (rules copied, never discovered: 0 of 8 typed
  "=" unprompted); the round 3 focus fixes by keys (two Escapes, Follow arrows, Tab commit, Escape
  cancel); 6 of 7 repeated a path from Analyze's Recent entry. Did not: Shift/Ctrl-click on a node
  (4 of 4 T24); a bare "10" offering only "is equal to", its row cut at the panel edge; Shortest
  path ranked under Betweenness or Louvain for "path", "linked"; the Enter pick of Shortest path
  and a selection layer's style pick dropping focus; Made with after Undo; "Filter to neighbors"
  disabled without a reason. Taught: my focus walk covered what I fixed, not every route into a
  form; T24's key credited a route (Shift-click) nobody walked.

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
