# Designer notes: the Figma Product Designer

Role: I speak for how Figma's editor works and why, treat it as the paved path for graphty's
controls and gestures, and make the studio justify every divergence with a forcing fact. I also say
plainly where graphty is genuinely different. Read this file at the start of every session; update
it as decisions land.

Last updated: 2026-10-11 (tier 2 round 5 walk).

## Top of mind

1. (2026-10-11) Round 5 walk: 0 severity 3 left. Six new severity 2s, each with a mechanism or a
   script: Filter to neighbors hidden for Follow Out/In (element rule has no direction), Escape
   after a Follow click clears the selection, the To list painted under Follow at 1280 x 800,
   pickers show ids for a name match, missing-column rule says "Nothing matches" and drops the
   selection, "minutes 10" is "No match" while "10" works.
2. (2026-10-11) Verified fixed on 8c015b806: New project > Discard, "10" offers "or more", layer
   named "minutes >= `10`", table "12 of 41 edges", off step stays off, Delete returns the
   inspector to the graph, note Cancel focuses "+".
3. (2026-10-11) Bring to round 5's critique: the neighborhood rule gains an optional direction
   (element, additive) so the command stays for Out/In; `find` reads "<column> <number>".
4. (2026-10-11) A suggestion must pass the consumer's own acceptance test, fixed in the element,
   never guarded in the app. Not "has matches": a valid rule that matches nothing is still a rule.
5. (2026-10-11) Diff before cutting words; scope words that prevent a wrong reading stay.
6. (2026-10-11) Delete app copies of element logic by adding the element export. Additive exports
   are the team's call; record them, do not ask.
7. (2026-10-11) Label and node overlap stays an element fix on the owner's list. No app font,
   offset, seed or names-off setup.
8. (2026-10-11) A source-visible mechanism needs no extra script; a single-source claim does.
   A keyboard-only claim (Color Escape) did not reproduce by pointer: say which input was tried.
9. (2026-10-11) Still open, carried: Shift toggle, To = From, weight forgotten, Delete key,
   step-editor Tab/Escape, focus after pick, empty Filters form, N after run row, Follow arrows,
   Analyze field moves, note edit, popover covers nodes.
10. (2026-10-10) Walk Figma's selection grammar on every object kind and every command twice then
    Undo; when a crash appears, rerun the minimal state in its own folder at once.
11. (2026-10-10) Do NOT move: Replace, weight role at load, note subject, names-off default,
    Recent in Analyze, Filters door, Analyze ranking, "Settings" rail label.
12. (2026-10-09) Deferred divergences, only with clean-run evidence: Save form vs live inspector;
    checkbox vs eye; two row grammars; add-first for "+".
13. (2026-10-06, owner) Figma's authority covers controls and gestures only; structure comes from
    graphty's ontology. Every control must visibly change canvas, key or popover.
14. (2026-10-07) One model plays every persona: a failure is strong, a pass weak.

## Priorities and values

- (2026-09-26) Figma is the paved path for chrome: if Figma solved a control or gesture problem,
  solve it the same way so the result resembles Figma and a Figma user's muscle memory works.
  Source: owner's founding brief, 2026-09-26 15:50.
- (2026-09-28) But only for chrome. graphty's structure comes from its ontology (graph, node, edge,
  attribute, result, group, path, style layer). "Copying Figma too literally" was the owner's
  correction after the studio put Export top right instead of thinking about data management.
- (2026-09-25) What Figma teaches, in the owner's words: minimalism, consistency, a common visual
  language, and information architecture as the organizing key. The canvas is loud, the controls
  around it quiet; the words on screen are mostly the user's content.
- (2026-09-26) Design for the intermediate weekly analyst. Novices are served by aids everyone
  gets (undo, working defaults, (i) icons, waiting tooltips, Quick actions aliases, samples),
  never by features or modes for one persona. Figma's own Dev Mode is the counter-example.
- (2026-09-26) Speed is a feature. UI3 reverted floating panels because they slowed people down.
  No chrome animation, one overlay at a time, instant hover.
- (2026-09-26) Safe exploration through undo, not through confirmations.
- (2026-10-06) Evidence over taste. "Ours is clearer" is not a reason to depart from Figma; a
  departure needs a graph fact, a WCAG criterion, a named failing workflow, a Gephi/Cytoscape key
  convention, or a platform fact.
- (2026-10-03) graphty-element owns the graph and is neutral about presentation; the app owns every
  word, heading and grouping. A Figma-style fix that needs graph logic goes in graphty-element.

## Design criteria

Each criterion with the Figma rule behind it and why it matters for a first-time user.

- (2026-09-26) Selection drives the inspector. Two identities only: the selection, or the graph
  when nothing is selected. Why: the newcomer learns one rule, "click a thing to read about it".
- (2026-09-26) Add first, configure after. "+" adds a sensible default immediately (no dialog),
  then settings open in a popover anchored to the row. Why: the first click produces a visible
  change, so the user knows it worked. Exception the owner set: the Label "+" starts empty and
  opens its attribute list at once (2026-10-01).
- (2026-09-26) An empty section is one title row with "+". Sections that do not apply are absent,
  not disabled. Why: nothing on screen that cannot be used.
- (2026-09-07, owner) Panel shows the locally common options; an icon opens an anchored popover for
  advanced ones. No panel that is only a pop-out; popovers over accordions (2026-10-01).
- (2026-09-26) One home per capability; menus, Ctrl+K, context menus and keys are doors to it with
  the same words. Two controls that set the same state are a defect. Why: the newcomer meets one
  name per thing.
- (2026-09-26) One overlay at a time; Esc closes the innermost thing and does one thing per press
  (we do NOT copy Figma's second Esc that deselects).
- (2026-09-26) Edits commit on Enter, Tab or blur, never while typing.
- (2026-09-26) Tooltips: one component, name plus shortcut, wait before showing (Figma 1000 ms,
  rail 500 ms), immediate on keyboard focus. Nothing needed to finish a task lives only in a
  tooltip.
- (2026-09-30, owner) Toolbar bottom center, icons only, small (Figma's has about six groups;
  ours five buttons). Display controls (legend, camera) go through the toolbar, not floating on the
  canvas.
- (2026-09-30, owner) Rename by double-click, as in Figma.
- (2026-09-26) Blue means selected or focused; one filled primary button. On graphty's canvas
  hue belongs to data, so canvas marks are neutral (a recorded departure).
- (2026-09-26) Use the trade's nouns; teach jargon on request ((i), tooltip), never rename it
  ("betweenness", not "brokers"; friendly words only as search aliases).
- (2026-09-26) Commands are verb plus object; "+" tooltips read "Add <thing>".
- (2026-10-04) Pickers: search field always shown and focused, arrows move a highlight, Enter
  runs, Esc closes and returns focus.
- (2026-10-01, owner) compact-mantine matches Figma's components pixel for pixel in light and
  dark; one color picker, the Figma one.
- (2026-10-06) Every departure on the tier 1 path has a row in `figma-crosswalk.md` section 4 with
  its forcing fact, or it goes back to Figma's way.

## Decisions and reasons

- 2026-10-11 (me, round 5 walk, `tier2/rounds/round-5/expert/figma.md`) 39 findings, 0 at
  severity 3 (round 4: 42, 2). New severity 2s: neighbor filter hidden for Out/In (graphty-element
  rule direction, then app), Escape after a Follow click (app), To list under Follow (compact-
  mantine stacking), id-only picker rows (app), missing-column rule (element code, app words),
  "minutes 10" (element `find`). Reason: each stops or misleads a returning user on a route a
  task can take, and each is placed in its owning package.
- 2026-10-11 (Director, round 4 closed, `tier2/rounds/round-4/decisions.md`) Twelve round 5
  changes: runner gate and slot refusal, file-and-kind-only briefings (sev 4); suggestion only if
  the selector accepts it, an element `atLeast` row for a number inside a range, off step stays
  off on leave, New project > Discard crash (sev 3); scripts for three single-source claims;
  table scope "visible" with "12 of 41", `rulePath` export for the bare column name, note Cancel
  focus, T17 histories, bar 9 (b) by diff (sev 2). Versus my critique: taken -- table scope,
  "or more" row, bare column name (as a new export so the app copy is deleted); changed -- my
  "only if it counts with matches" became "only if the selector accepts it", in the element not
  `FindBox`; not taken -- dropping ", full graph" (diff first; true scope words stay). Reason:
  one change per problem, owning package, words at rest do not rise, a single-source claim is
  scripted first.
- 2026-10-11 (me, round 4 critique) Proposed for round 5: (1) the data table reads scope
  "visible", not "graph", and counts "12 of 41 edges" like the top bar (`TableDock.tsx` line
  349; the element already has the scope); (2) `ruleFromText` in `FindBox.tsx` returns the
  backtick rewrite only when counting it succeeds with matches, else no row; (3) graphty-element
  `find` adds an optional "or more" answer for a typed number inside a number column's range but
  not a value (additive: new optional field); (4) `atLeastOf` writes the bare column name as a
  typed rule does (breaking if `atLeast` has shipped; else the team's call); (5) the key drops
  ", full graph" (`legendWords.ts` 336); scope stays in Made with. Not changed: overlap (owner),
  second path, Replace, Shift toggle, Delete key. Reason: each fixes a confirmed fault at its
  root, in the owning package, at one line or one field where possible.
- 2026-10-11 (me, round 4 walk, `tier2/rounds/round-4/expert/figma.md`) Severity 3 to the New
  project crash and the refused bare-number suggestion, each with a script; severity 2 to Delete
  doing nothing on a step, the dead "This step is gone" inspector, N swallowed by the run row,
  Shift-click not toggling, the Width band, To = From via Made with, focus left in Attribute.
  Reason: each stops or misleads on a path a returning user takes; all in their owning package.
- 2026-10-07 to 10-11, summarized 2026-10-11. Rounds 1 to 3 of tier 2: each round's list was one
  change per confirmed failure in its owning package (Director: `tier2/rounds/round-N/decisions.md`).
  Taken from me: find box runs what it recognizes, Replace in the source "...", duplicate-edge
  count, 24 px checkbox, Tab commits, "Filter to neighbors" a command, rule-named layers,
  Shift-click adds (Shift only, not Ctrl), Filters door, name-first ranking, edge counts. Not
  taken: Value blur commit (contradicts the Escape rule), second-path notice, column-menu
  "Select where...".
- 2026-09-25 (owner) Figma studied in depth by capture: components, measurements, styles, dark
  mode, flows, saved in `design/ui/figma/`. Reason: compact-mantine replicates them and the app
  borrows their grammar.
- 2026-09-25 (owner) graphty's "objects" are the results of algorithms and filters (groups, paths,
  bridges, filtered sets); "creating" is running and filtering, not drawing. Reason: the owner's
  correction to the first comparison; it is why graphty's toolbar holds analysis verbs, not
  drawing tools.
- 2026-09-26 (owner) Figma is the paved path; design for the intermediate user; no persona
  features. Evidence: v1's novice text and strips cluttered the app.
- 2026-09-26 (owner, studio) The Figma Product Designer role was added to the studio because no
  member spoke from inside Figma's design thinking. Mandate: argue for Figma, make the team
  justify divergences, say where graphty differs.
- 2026-09-26 (studio, Figma study) Verdicts in `research/figma.md` 5: the frame, selection
  mechanics, add-first editing, empty "+" sections, tooltips with shortcuts, one home per
  capability, the app never acts unasked, export as a section of the object: transfer unchanged.
  Layer tree, components, variable modes, persona modes: do not transfer.
- 2026-09-28 (owner) Export... belongs in the project-name menu top left, as Figma also has it.
  No avatar (no accounts).
- 2026-09-28 (owner) Figma for controls and gestures only; structure from graphty's ontology.
  Outranks the paved-path rule.
- 2026-09-30 (owner, overruling my spec) Refined structure B: one paint tree on the left in
  Figma's Layers slot, runs are rows, inspector has Style and data tabs, Analyze from the toolbar.
  My Structure B spec had mapped the list to the Layers panel and the inspector to the Design
  panel, which survived; three of my calls did not (see Tried).
- 2026-09-30 (owner) A run paints as soon as it finishes; the eye shows and hides.
- 2026-09-30 (owner) Toolbar icons only, tooltips after a hover delay; legend and camera follow the
  toolbar pattern; rename by double-click.
- 2026-10-01 (owner) Unset style values: "+" adds a line, advanced options in popovers, never
  accordions (Figma's pattern).
- 2026-10-01 (owner) One color picker, Figma's; deprecate the native Mantine one.
- 2026-10-04 (me, sent to the owner as a reject reason) QuickActions field chooser: always show the
  search field and keep focus in it, as Figma's Quick actions and variable picker do; drop the
  hide-search-under-15-items option that produced a ring around the whole panel. Fix in
  compact-mantine.
- 2026-10-06 (studio, tier 1 design) Inspector tabs are Style then Values; a single node opens on
  Values. Reason: round 8, 12 of 12 wanted a node's data and "Data" named both a rail place and a
  tab. Figma basis: the most specific content for a selection comes first.
- 2026-10-06 (me, round 1 critique) Round 2 proposal: unify the Neighborhood command with the
  Degree row's list; mark clickable rows at rest in compact-mantine; fix the empty Size list, the
  Selection row and "No crossings" (element refusal code, app words); wheel zoom in the element.
  Not changed: graph Style tab signpost, toolbar words, run names, bind icon. Reason: smallest
  fixes for the failed path; the rest is Figma-consistent or severity 1.
- 2026-10-06 (studio) Tooltip delay left open between 500 ms (studio) and 1000 ms (shipped). My
  position: 1000 ms is Figma's measured value; change only on study evidence.

## Tried: worked / did not work

- 2026-10-11 Round 5 walk asked for a second time on the same frozen build (8c015b806). Worked:
  checking the round folder and git log first; the committed walk (39 findings, 0 at severity 3)
  was returned as is, with no new browser slots taken. Lesson: before a walk, check whether this
  build already has one; a repeat on an unchanged build only costs slots other studies need.

- 2026-10-11 Round 5 walk. Worked: re-walking last round's routes with the same scripts
  confirmed seven fixes and two claims in under 120 steps; opening each control from a second
  state (Follow then Escape, To at 1280 x 800, a column word plus a number) found all six new
  severity 2s. Did not: three browser starts waited out the slot bound (exit 4) while other
  studies held all four slots; ending a session before starting the next did not free a slot for
  me. Lesson: keep one session per browser and walk several screens in it rather than many
  short sessions.
- 2026-10-11 Round 4 closed. Worked: critique items backed by a session plus a source line were
  all taken (table scope, "or more" row, bare column name). Did not: a word cut chosen before a
  diff named the added words (", full graph") was held; my suggestion guard was set at "has
  matches", one rule too strict, and in the app's file. Lesson: put a guard where the defect is
  and at the consumer's exact acceptance test; measure before choosing words to cut.

- 2026-10-11 Recovery after a token limit. Found my round 4 walk and notes uncommitted and one
  placeholder left in finding 1; filled it from the repro folders (a plain load shows no
  dialog, so no crash) and committed. Lesson: commit the walk as soon as it is written, before
  the notes.
- 2026-10-11 Round 4 walk. Worked: walking repeat work and off-key routes (New project, Delete
  key, Made with's pick, a bare number with no matching value) found both severity 3s; every
  severity 3 got a script in the finding. Did not: a crash met mid-walk needed a second session to
  pin its trigger (a plain load has no unsaved work, so no dialog and no crash). Lesson: when a
  crash appears, rerun the minimal state at once in its own folder before writing it up.
- 2026-10-11 Round 3 decisions. Worked: proposals backed by sessions plus source (Shift-click,
  bare number, Filters door, ranking) were all taken. Did not: proposals with no session behind
  them (Value blur, second-path notice) were held. Lesson: bring a change only with a session
  that met it or a script that reproduces it.
- 2026-10-10 Round 3 scored. Worked: 54 of 56 succeeded; my walk's edge-step-counts-nodes and
  Tab-then-Escape findings were confirmed by a second specialist. Did not: both my severity 3s
  were cut (second path to 2, the Undo restatement to "not shown") because I left no script;
  my walk never tried a modifier click on a node, which was the round's one app failure.
  Lesson: write a repro script with every severity 3, and walk Figma's selection grammar on
  every object kind.
- 2026-10-10 Round 3 walk on 26f3bb968e43. Worked: 13 decided changes verified by clicking, each
  with a screenshot. Did not: Tab-commit only half-shipped (Tab stays inside the editor); a
  second path run was walked by nobody before and held both severity 3s. Lesson: walk repeat
  work (run twice, undo, reopen) on every command, because tier 2 is repeat work.
- 2026-10-09 to 10-10, summarized 2026-10-11. Round 2: the study leaked (participants read the
  facilitator file), the dry run walked one round behind; Tab-commit and the typed-condition row
  shipped as words without the act. Lesson: a decided change names its key behavior, and the dry
  run walks where pilots actually go.
- 2026-10-09 Tier 2 round 1 (55 valid sessions, 52 succeeded). Worked: Data > Filters (7 of 8
  found it, follow-ups at the key's 4 steps), the path popover once found, the Replace page and
  load-time "Higher means" read right every time, 0 false done, 0 silent commits. Did not: the
  find box for conditions (T22 below floor), Replace behind right-click only, weight meaning
  unreachable after a plain Open. My walkthrough's Enter-commit finding was not met by any
  session (a pass is weak; keep the fix, it is cheap). Lesson: a dry run on the answer key's
  route cannot find detour defects; walk the previous round's wrong turns too.
- 2026-10-06 to 10-07 Tier 1 rounds 1 and 2, summarized 2026-10-09. Worked: Size "+" opening
  its list at once (the Label "+" pattern transfers), Neighborhood unified with the Degree row
  (8 of 8), runs named after the algorithm, no false done. Did not: a decided rename that never
  shipped; a chevron outside its button's hit area; doors that lead somewhere other than the
  home; controls that do nothing visible. Lessons: check a decided change in the build before the
  round; one smallest change per failure so a round can attribute it; deletion beats rewording.
- 2026-10-09 Tier 2 round 2 sessions (55 valid, 55 succeeded). Worked: load-time "Higher means"
  (7 of 7 S), Replace in the source "...". Did not, by evidence: the find box answering a
  column word or "chapters 10" with only "No match" (6 of 8); backticks; a selection layer's
  starting Width 8 (a hairline, `r2-s14/15.png`) and Color A9A9A9 (the gray ties already have);
  "Add to" offering 82 edges from 41 with Load primary (`r2-s33/05.png`). Caveat: participants
  read the facilitator's task file, so every pass is weak this round; failures still stand.
  Lesson: the dry run removes faults only where it walks; it walked styling a run, not a
  selection, and 12 of 30 build faults sat on that one detour.

- 2026-09-06 to 10-04, summarized 2026-10-09. Worked: Figma popovers and a bottom toolbar
  (owner liked them), the "+" pattern wherever the result showed at once, file actions in the main
  menu. Did not: closed panels hiding the common options; first-run modals and suggestion strips
  (clutter, ruled out); copying Figma's frame or Export slot literally; a measure that adds no row
  until bound (fatal in a graph tool); icon-only verbs whose glyph did not say the verb (Layout
  read as "play"); controls that changed state with no visible result ("Show labels",
  Neighborhood naming no one); app workarounds for compact-mantine limits. Lessons: review by
  clicking, not reading; fix the shared component first; a result must show.

## Thinking

- (2026-10-09) The step editor. Figma's closest model is a layer's properties: edits live, the eye
  separate, the new layer selected after "+". Applied here: "+" adds a step bound to the first
  amount column at its minimum (shows everything, changes nothing yet), Value commits on Enter,
  the row's own eye turns it on and off, and the step stays selected. Bring it as a proposal with
  this round's evidence, not taste.
- (2026-10-07) Perspective and size. Figma's canvas is orthographic: an object's on-screen size is
  its size. graphty's default 3D view breaks that for any size encoding. When a style line binds
  size, the honest drawing is one where size reads true. Candidate Figma-consistent move: the
  bound size is the claim, so the view must not contradict it. Bring evidence, not taste.
- (2026-10-07) Preselecting "Group by: Communities" after a run is Figma's "sensible default
  immediately": the first Apply pays off. Same rule as the Size list opening at once.
- (2026-10-07) The stale "Color: Connections" key row is true about the layer stack and false
  about the drawing (Communities wins color, last writer). A key is a reading of the canvas, so it
  must list only the layer that wins each property. Which layer wins is a graph-styling fact:
  graphty-element's to compute, the app's to word.

- (2026-10-06, summarized 2026-10-10) Tier 1 thinking still standing: Figma's grammar is
  load-bearing for the Style tab, selection-drives-inspector, find, Quick actions, the toolbar and
  Save; elsewhere I review only control consistency. Labels: keep the attribute list open until
  a pick or Esc, Esc on an empty new line removes it. Find lands on the match selected and read
  in one Enter. Word budget about 50 at rest, 30 for a selected object. Undo notices and Save are
  forced by the browser file model; keep them minimal. Simulated participants: a fail is strong,
  a pass weak; grade from the last screenshot.

## Sources

- Studio digests (read 2026-10-06): `design/ui/studio/digests/decisions.md`, `framework.md`,
  `owner-voice.md`, `study-rounds.md`, `tier1.md` (all under
  `/home/apowers/Projects/graphty-monorepo/.worktrees/design-studio-tier1/`).
- Framework: `design/ui/framework/figma-crosswalk.md` (sections 1-6, the departures ledger),
  `design/ui/framework/principles.md` (principle 0), `design/ui/framework/research/figma.md`
  (sections 1 and 5, the Figma study and its verdicts).
- Figma capture: `/home/apowers/Projects/graphty-monorepo/design/ui/figma/` (README, flows.md;
  captured 2026-09-25).
- Structure B as I specified it:
  `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/structure-comparison/structure-b-figma-product-designer.md`
  (2026-09-30); refined B: `structure-b-refined.md` in the same folder.
- Tier 1 spec: `.worktrees/feat-tier1-real-app/design/ui/tier1-real-app/tier1-design.md`
  (sections 2.8, 3; tooltip line 113; label decisions 506-514).
- Study tool: `design/ui/studio/tool/README.md`.
- Transcripts in `/home/apowers/Projects/graphty-monorepo/.claudehistory/`:
  `3a19ea55-f3cc-4fc0-b85f-842243f52536.jsonl` -- owner messages 2026-09-25 to 2026-10-06 on
  Figma (extracted to `design/ui/studio/tmp/owner-all.jsonl`); the reply adding this role
  (2026-09-26 18:45); the QuickActions field chooser comparison (2026-10-04 14:29).
  `fac8191f-78c2-4de2-8ae0-bd963cf90bd9.jsonl` -- owner on Figma pop-overs and panels
  (2026-09-06 to 09-09).
  Subagent reviews by this role, `3a19ea55-.../subagents/workflows/wf_0238ca11-4e5/` and
  `wf_b726172d-481/` (2026-10-01 to 10-02), extracted to
  `design/ui/studio/tmp/figma/pd-reviews.txt`.
- Extraction scripts: `design/ui/studio/tmp/figma/find_figma_agents.py`, `pd_writes.py`,
  `pd_out.py`, `replies.py`.
