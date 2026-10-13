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

- 2026-10-13 **Tier 3 paused for the owner's review after build 3** (served as
  `tier3-i3-617b43b270`; review `tier3/iterations/3/review.md`). Built and mine: unset is the minus
  at rest on a set field, emptying + Enter, or Delete; its tooltip names what comes back read over
  the layer's own elements ("back to 1, the default"); Undo right after Clear restores and names it;
  a painted-over field names the layer above and its count. Covering something beneath is a
  different act from unsetting: an ordinary entry of this layer set to nothing ("Hide label from
  Key people" in the "+" menu). No split-parent layer exists: Louvain is an ordinary layer whose
  color varies by Community, each group an entry with chip, eye and minus, "New layer for Group 3"
  makes an ordinary layer; the same rows serve a number column of codes. Reason: two row kinds
  only (layer, folder) -- the owner's consistency test. Figma taken: one-line rows, effect rows,
  Mixed only for multi-select, Undo from an idle field, right-click selects. Kept graphty's own:
  vary glyph at rest, painted-over mark (Figma does not stack paints).
  Decided for iteration 4 and mine to verify on the served build: focus never falls to the page
  (after Clear to the emptied field, after Remove to the next entry or "+", after Undo to the
  restored control, one polite status region); a kind change keeps every setting (radios keep
  select-on-arrow, nothing lost by passing through; each change one announced undo step); a layer
  lists only its own entries; hiding an effect keeps its value; Tab past a pop-out's last control
  closes it and moves on; a ramp handle can always step back; several selected layers show only
  what all share, one undo step for their writes.
  Watch at the owner review: does a dimmed painted-over value read as "not what is drawn"; is the
  "+" menu where a reader looks to cover something beneath; does one settings button per section
  read as Figma's Type settings. Watch in the study: do readers confuse Clear (stop covering) with
  Hide-from-beneath (cover with nothing); does an empty field read as unset or as broken; does an
  empty group layer from "New layer for" read as broken; does anyone press arrows through the kind
  radios and trust what remains.

- 2026-10-12 **Owner feedback 1 answered** in `tier3/decide/feedback-1-interaction.md`. (1) Unset =
  the minus, or emptying / Delete on the focused control; set vs inherited by two cues (minus and
  primary text vs placeholder), never color alone; the minus's tooltip names what comes back from
  `agreement` plus an additive `from`; focus to the field after; inherited list entries shown as
  secondary lines. "None"/"Hidden" are blocking values, not unset. (2) I reversed my own "split
  parent is a layer with its own glyph": Split is a command making an ordinary folder of empty
  ordinary layers above the unchanged original; the palette reaches unoverridden groups by plain
  fall-through, "follow parent" is the minus, multi-select edits groups together. Reason: the
  owner's consistency test (every row a layer or a folder) and the unset rule makes the special
  inheritance unnecessary. Needs the element to keep a layer that sets nothing. (3) Figma pass:
  adopt Mixed, multi-select, apply-variable placement, pill; reject Detach and click-title-adds.
  Watch once built: do readers see an empty group layer as broken?

- 2026-10-12 **Tier 3 (unified styles) answers proposed** in `tier3/decide/interaction.md`. Mine to
  watch once built: the six core fields always shown with a computed "beneath" placeholder ("+" only
  on lists) -- does an empty field read as unset or as broken? Which-elements as a find-style text
  box offering a live rule or a fixed list; the ramp-over-histogram editor's handles by keyboard.
  Reason: "+" before every common edit and eleven dimmed titles were the length and cardinality
  complaints; one find pattern already worked in tier 2.
- 2026-10-11 **Round 5 watches (round 4 closed):** "10" typed on bus stops in T22 A (the element
  must offer only a rule it accepts, plus an "is 10 or more" row for a number inside the range);
  T17 with the table open under a filter step (table lists what the step keeps; an off step stays
  off when its editor closes unedited); New project then Discard by script; note editor Cancel
  focus on "+" by script. The owed r4-s05b, r4-s20b, r4-s28b run first.
- 2026-10-11 **Priming is in the briefings, not only the logs.** The file table leaked answers
  ("Mo, Nia", "6 - w", s11) and histories pointed at the toolbar. Count "unprompted" only after the
  briefings are checked; persona habits ("checks counts") are never unprompted evidence.
- 2026-10-11 **No app copies of element logic:** the app's `columnText` goes, replaced by the
  element's new `rulePath`; a wrong element suggestion is fixed in the element, never guarded.
- 2026-10-11 **Do not change what worked:** Shift-click adds (7 of 7 T24), the toolbar Filters
  icon (7 of 7 T17), the Degree link opening the neighbor list as a selection (one function, two
  doors), a second path replacing the first silently (no task cost shown; a notice adds a line).
- 2026-10-11 **Label and node overlap is graphty-element's** (placement, spacing by drawn size);
  no app offsets, no turning "Show all labels" off as a workaround.
- 2026-10-11 **A study gate that is not enforced is not a gate.** Two rounds ran without it; the
  briefing's file table leaked answers and listed `--shift-click`. A check that reads nothing fails.
- 2026-10-11 **One variant per problem; a one-specialist claim is scripted before it is fixed.**
- 2026-10-11 **Walk every key route before a task runs** (T24's key credited an unwalked route).
- 2026-10-10 **A disabled done-state is not a state.** Say why it is off (criterion 8).
- 2026-10-10 **Words at rest go down, never up.** No new words for any fix (bar 9 (b) failed by 2).
- 2026-10-10 **Discount behavior a prompt's or a briefing's own words ask for.**
- 2026-10-07 **A decided change that is not verified on the served build is not done.**
- 2026-10-07 **Simulated participants are one model.** Trust reproductions and causes in code.
- 2026-10-06 **Every detour must work or not look clickable. Refusals in place until the value
  changes.** Never suggest an action the app then refuses.
- 2026-10-06 **Where a fix goes:** graph facts in graphty-element; flows, focus, words in the app;
  shared control defects in compact-mantine.
- Held, first in line if met again: Hops distance per name (element `hops`), a notice for a
  replaced path, committing a step edit on focus leave vs Escape.

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

- 2026-10-07..10-10 (summarized) Real-app rounds 2 and tier 2 rounds 1-2: menu focus fixed in
  compact-mantine's Menu, not per caller; row chevron in the hit area; key leaves out covered layers
  and says ", out of date" from `run.stale`; finished load and run announced in one polite region;
  source "..." header menu (Edit source, Replace); find hint decided by the element's refusal code,
  then the example line on a miss with "=" kept and Enter running it; Edges Color to Everything
  fixed at the root; three focus fixes; step edit commits on Tab/click-away; "Filter to neighbors"
  a plain command. Rejected: "Size arrives bound to the run", my find column rows (a second door),
  "+" opening the value picker (held). Owner: label overlap, bare numbers, edge width units.

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

- 2026-10-11 Round 4 critique, mine. (1) Off filter step turning on: in the leave handler, return
  when `step !== undefined && sameRule(rule, step.rule)`; `unchanged` keeps its `on` test for the
  submit's "Save and turn on". Reason: a leave that changes state unasked breaks criterion 3 and 1;
  the mechanism is in code (`unchanged` requires `step.on`). (2) Find box: `ruleFromText` offers the
  backtick rewrite only if the element then counts it (> 0); the element adds `FindResult.ranges`
  for a typed number between a number column's min and max that no record holds. Reason: T22 A's
  prompt number (10) is not a bus-stops value; offering then refusing breaks criterion 7.
  (3) TableDock `scope` "visible" for the graph view. Reason: the table is the canvas's text
  equivalent; it read "41 edges" beside "12 of 41". (4) New project, Discard: script, then fix the
  component that reads the disposed session. Not changed: Degree link selection, path replace
  notice, "or more" row order (no task meets the fold), Replace's visible control.

- 2026-10-11 Tier 2 round 4 closed (Design Director). Decided for round 5: the runner refuses a
  session without gate exit 0 and starts a participant only on a free slot; briefings name each
  data file and its kind only, and the leak check reads briefings (`--shift-click` stays listed);
  element `suggestBackticks` suggests only a rule the selector accepts (no app count guard);
  element "or more" row for a number inside a column's range; my off-step leave fix as proposed;
  New project, Discard scripted then traced; table `scope: "visible"` (export still writes every
  record: known gap); element `rulePath` export so the "or more" layer name reads "minutes >=
  \`5\`"; note Cancel focuses "+"; T17 histories say what was done, not where; bar 9 (b) by word
  diff against round 1 before any cut (scope words like ", full graph" stay even if the bar fails).
  Three single-source claims scripted first (missing-column rule, Escape on a selection Color
  swatch, a label taking a tie's click). Held: replaced-path notice, Degree arrow change, one
  warning look for load problems. Reason: one path per problem, owning package, no words added.

- 2026-10-12 Tier 3 proposals, mine (owner approves the built UI before any study). "+" only on
  repeatable lists; 0-or-1 properties as always-shown core fields or one "Add style" menu with
  glyphs; switches added flipped with a minus (a switch cannot say "not written"). One scroll, no
  accordions (owner ruled popovers, never accordions) and no Nodes/Edges tabs (hide half a route);
  sticky group headings, a scroll-to SegmentedControl only on overflow. Hide a kind the rule cannot
  reach; keep it live with "0 edges now" when it can (no dead controls). Field picker: In use, then
  by origin, fitting first, the rest disabled with the element's reason. Gradient: a shared
  compact-mantine ramp-over-histogram editor (domain, clamp, midpoint, step handles as APG
  sliders). Split parent is a layer with its own glyph, never a folder; folders never scope. One
  rule per layer with a Nodes/Edges/Both first control. Labels: source, named look, size, position
  inline; looks are named and reusable (element). Manual picking: find-style text first, the
  Filters rule editor behind it, selection as a fixed set; no algorithm favored. Element asks
  (additive): `agreement` below a layer, reachable kinds from `validate`, a fit check, a
  distribution with paint steps, named label looks, a RuleTree text leaf, `FindResult.rule`,
  bindable label size, color and background. Reason: one pattern per job, words at rest down,
  every element fact from the element.

- 2026-10-12 Owner feedback 1, mine. Split parent replaced by Split into layers (ordinary folder,
  empty ordinary layers above the original); minus is the one unset gesture for every field,
  including label settings (drops "Edited"/Reset); inherited list entries visible; per-entry eye on
  list entries only. Element asks (additive): keep a layer that sets nothing, `split`, a rule on an
  arbitrary label that follows members across re-runs, `agreement` naming the source row. Given up:
  a group's rule is copied at split time. Reason: two row kinds, one gesture per job.

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
- 2026-10-09 (summarized) Tier 2 rounds 1-2 (55 valid each, both leaked): worked -- 0 false
  "done", the path run, Replace page, load-time "Higher means", Enter/Escape in step edits. Did
  not -- doors behind right-click, a find box answering only "No match", the stale key, the "start
  with =" hint, backticks, style "+" on the drawn default, layers named by count, a second Escape
  blurring the find box, Follow arrows landing on Hops. Taught: a dry run that walks only the
  answer key certifies only it; a keyboard finding handed to a bar is not fixed.

- 2026-10-10 Tier 2 round 3 (54 of 56, build 26f3bb968). Worked: the find box's example line,
  the "=" kept on the suggestion and Enter running it (rules copied, never discovered: 0 of 8 typed
  "=" unprompted); the round 3 focus fixes by keys (two Escapes, Follow arrows, Tab commit, Escape
  cancel); 6 of 7 repeated a path from Analyze's Recent entry. Did not: Shift/Ctrl-click on a node
  (4 of 4 T24); a bare "10" offering only "is equal to", its row cut at the panel edge; Shortest
  path ranked under Betweenness or Louvain for "path", "linked"; the Enter pick of Shortest path
  and a selection layer's style pick dropping focus; Made with after Undo; "Filter to neighbors"
  disabled without a reason. Taught: my focus walk covered what I fixed, not every route into a
  form; T24's key credited a route (Shift-click) nobody walked.

- 2026-10-11 Tier 2 round 4 (53 of 53 valid, 3 void; build 5277e2cbe). Worked: Shift-click
  adds (T24 7 of 7, 0 false "done", median 4 steps against 7.5); the toolbar Filters icon was the
  first door 7 of 7; the round 3 focus fixes held under the script (15 actions). Did not: the
  bare-number suggestion on bus stops (expert script; T22 A invites it); the table ignoring a
  filter step (2 sessions); an off step's editor turning it on (keys and pointer); New project,
  Discard crashing. Taught: a fix matching a habit is used at once, but the briefing primed it.

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
