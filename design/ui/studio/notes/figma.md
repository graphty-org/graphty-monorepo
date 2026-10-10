# Designer notes: the Figma Product Designer

Role: I speak for how Figma's editor works and why, treat it as the paved path for graphty's
controls and gestures, and make the studio justify every divergence with a forcing fact. I also say
plainly where graphty is genuinely different. Read this file at the start of every session; update
it as decisions land.

Last updated: 2026-10-09 (tier 2 round 1 closed).

## Top of mind

1. (2026-10-09) Round 1 closed. Dry run happened (four builds, then the frozen build) and cleared
   the answer key's routes: every session.log empty, no grade decided by a build defect. It missed
   detour defects (Edges color written to Everything, halo tint, focus after Add/Delete step,
   Enter not committing) and the study tool itself, which hit participants more than the build.
2. (2026-10-09) Round 2 gate: tool fixed (4 sessions max, exact matches, real file drop, every
   follow-up sent), missing bar scripts built, and a dry run that walks each task's two commonest
   round 1 wrong turns by pointer AND keyboard (Enter, Tab, Escape in every field). No round
   until that report has no open item on a task path.
3. (2026-10-09) Round 2 app changes, one door each: find answers a typed condition with the rule;
   "..." menu with Replace on the source's inspector; start-screen file Open goes through the Data
   page; step editor/find focus and keys; key says ", out of date"; style lines only to a named
   layer (no silent Everything); path Weight starts on the loaded weight; four word fixes.
4. (2026-10-09) Accepted against my proposal: column menu "Select where..." deferred until three
   participants look there; "Higher means" on the column inspector replaced by routing Open
   through the Data page. Watch T20 and T22 in round 2 to see if the narrower doors hold.
5. (2026-10-09) Halo fix is element-side: draw back faces only, so the ring no longer tints the
   node. Owner sees it in visual review only.
6. (2026-10-09) Watch in round 2: bar 10 (drawn names overlap/run off canvas) is expected to keep
   failing -- element label placement, filed, not hidden in the app.
7. (2026-10-09) Still my divergences, deferred: step editor is a Save form, not a live inspector;
   checkbox vs eye for show/hide; segmented controls mark choice with a focus-like outline
   (compact-mantine, later round).
8. (2026-10-07) 3D perspective makes nearer dots look bigger; size encodings must survive the
   camera. Undecided.
9. (2026-10-07) The element's fit has no inset; the key can cover a node. Needs a public option.
10. (2026-10-07) Element English refusals: fix as element code plus app words.
11. (2026-10-06, owner) Figma's authority covers CONTROLS AND GESTURES ONLY; structure from
    graphty's ontology.
12. (2026-10-06) Every control must visibly change canvas, legend or popover.
13. (2026-09-26, owner) No wizards, coach marks, first-run UI or suggestion cards.
14. (2026-10-07) One model plays every persona: a failure is strong, a pass weak.
15. (2026-10-06) Ledger debt: `figma-crosswalk.md` section 4 lacks rows for undo notices, the
    Discard prompt, Save/Save as, the deselect toast and the step editor's Save.

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

- 2026-10-09 (Director, round 1 closed) Final round 2 list in `tier2/rounds/round-1/decisions.md`:
  measurement first (tool, scripts, detour dry run), then reproduced defects, then one door per
  confirmed problem. Differences from my proposal: column-menu "Select where..." deferred (only if
  change 4's words fail with 3+ looking there); weight meaning reached by sending start-screen
  Open through the Data page instead of a control on the column inspector; "Back to start" prompt
  not in the list. Reason: each change adds at most one way in, so round 2 can credit it alone.
  Shared-control fixes (Toast role, segmented choice) wait so the build stays attributable.
- 2026-10-09 (me, round 1 critique) Round 2 changes, smallest per verified failure: (a) T22 --
  a typed condition gets one live row "Select where <rule> (n)" instead of bare "No match", and
  the column's menu gets "Select where..." opening the find box with the column filled (4 of 4
  went to the column second; one home, a second door with the same words); numbers without
  backticks is an element ask, additive if it only accepts input refused today. (b) T21 --
  "Replace with file..." in the inspector's "..." menu when a source is selected (selection
  drives the inspector; 8 of 8 hunted, nothing visible at rest). (c) T20 -- the "Higher means"
  control on the weight column's inspector, same element setting as the import page (6 of 7 went
  to the column next); "Back to start" with open work goes through the existing Discard prompt.
  (d) The key dims an out-of-date block and shows the row's clock glyph (bar 5). (e) Step editor:
  Enter commits, Escape closes (my finding; trivial, on T17's follow-up). (f) After Add step the
  new step is selected and focused (fixes my finding 10 and the a11y focus loss in one change).
  (g) Path Weight preselects the loaded meaning (4 sessions). Not now: live step inspector,
  checkbox-to-eye, segmented fill, selection marks, label placement, a filter door on the
  toolbar, units, a second path replacing the first. Reason: each is either large, owner-visible,
  element-only, or not a verified failure; one change per failure keeps round 2 attributable.
- 2026-10-09 (me, tier 2 round 1 walkthrough) Severity 3 for: Enter not committing in the step
  editor (bar 4, silent non-commit), backtick numbers in rules (raw code string on a success path,
  bar 10 rule), edge names cut in the string (truncation hiding the word needed to act), the key
  without an out-of-date mark (bar 5). Owners: app, element, app, app. Everything else 2 or 1.
  Reason: the bar 10 rules name exactly these classes; the rest slows a reader but does not mislead.
- 2026-10-07 (me, tier 2 gap proposal) Build to refined B where it is decided: Data > Filters with
  an Apply checkbox and the header chip; Path popover with pick fields (P, the selection bar, the
  node menu); Notes place with N; Neighborhood popover (1-3 hops, Out/In/Both, Filter to
  neighbors, Add as steps) replacing the hidden "Grow by one hop" (one home); Select where popover
  above the toolbar; Replace with file... on the source row menu; Analyze's uniform Weight line.
  Figma reasons: click selects anything on the canvas (edges too), add-first, one home per
  capability, nothing escapes as a script error. Not decided in the sources, my calls: the
  selection bar is the first thing to build because four verbs need it; Replace reruns every run
  row and marks changed numbers (Figma: instances follow the main component); a typed rule in Find
  shows one live row "Select where <rule> (n)". Element asks: edge-attribute filter fix, weight
  default and meaning, a content revision for staleness, numbers without backticks or a neutral
  error code, edge picking and an edge selection style, field kinds on a run result.
- 2026-10-07 (studio, round 2 close) Twelve changes for round 3, one per problem, in the owning
  package: menu-to-dialog focus (compact-mantine Menu defaults); the key drops a block painted
  over on every node (element, owner-decision record); 2D Fit frames the graph (element); group
  layouts offered community results through `catalog.optionsFor` "partition" values (element; app
  `groupings()` deleted); load and run finished announced (app words, element facts); the canvas
  takes the host's aria-label and a focus ring (element); Size "+" opens its list; the trailing
  glyph joins the row's hit area (compact-mantine DataRow); runs named by method (app `runName`);
  "Show all labels" writing the element's declutter setting; study tool hears the active option;
  answer key for new routes, T10 prompt kept. All of my proposal accepted except "no show-all
  control yet" (overruled with a forcing fact I accept). Not changed: key placement and fit
  insets (new API, owner), 4x export (element, later), Size pre-bound to the result.
- 2026-10-07 (me, round 2 critique) Summarized: my round 3 proposal was accepted into the
  round 2 close entry above, except "no show-all control yet".

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

- 2026-10-09 Tier 2 round 1 (55 valid sessions, 52 succeeded). Worked: Data > Filters (7 of 8
  found it, follow-ups at the key's 4 steps), the path popover once found, the Replace page and
  load-time "Higher means" read right every time, 0 false done, 0 silent commits. Did not: the
  find box for conditions (T22 below floor), Replace behind right-click only, weight meaning
  unreachable after a plain Open. My walkthrough's Enter-commit finding was not met by any
  session (a pass is weak; keep the fix, it is cheap). Lesson: a dry run on the answer key's
  route cannot find detour defects; walk the previous round's wrong turns too.
- 2026-10-07 Re-pilot of round 2's fixes (nine tasks, scripted). Worked: Size "+" opens "Size by
  attribute" at once with Fixed size first and id/name disabled "Holds groups, not amounts" (the
  Label "+" pattern transferred cleanly); runs named "PageRank" on key, row and node; group layouts
  enable after a community run with the group preselected; "Show all labels" removes the hidden
  count. Not yet shown: whether newcomers find these unprompted. Columns by group was the only
  layout that made clusters easier to tell apart; Circle in 3D reads as a filled disc.
- 2026-10-07 Round 2 on the real app. Worked: neighbors task 8 of 8 at 0.9x (all through the
  Degree row, the round-1 unification); first-time personas 34 of 34; no false done in 56; save
  and reopen 3 of 3. Did not: removing the empty Size "Open list" (sizing chain still 18 of 18);
  the run rename decided in round 1 never shipped; the chevron added to the Degree row sits outside
  its button (4 of 6 pointer users clicked it first). Lesson: a decided change must be checked in
  the build before the round, and a glyph that looks clickable must be inside the hit area.

- 2026-10-06 Round 1 close. Accepted from my proposal: Neighborhood opens the list, empty Size
  list fixed (by hiding the arrow, not filling the list), No crossings refusal, wheel zoom, focus
  fixes, no signpost, no toolbar words. Rejected: the DataRow chevron (confounds round 2) and my
  "N different values" wording (adds words). Lesson: propose the one smallest change per failure
  so a round can attribute the result; deletion beats rewording.

- 2026-10-06 Round 1 on the real app. Worked: no false "done" in 29 (round 8: 10 of 21 on names),
  the empty-line Label "+", run repaints at once, the legend in the exported image. Did not:
  neighbors by name (menu door selects without listing), Size "Open list" empty, "No crossings"
  silent reset, Selection row emptying the inspector. Lesson: the remaining failures are doors
  that lead somewhere different from the home, and controls that do nothing visible.

- 2026-09-06 to 10-04, summarized 2026-10-09. Worked: Figma popovers and a bottom toolbar
  (owner liked them), the "+" pattern wherever the result showed at once, file actions in the main
  menu. Did not: closed panels hiding the common options; first-run modals and suggestion strips
  (clutter, ruled out); copying Figma's frame or Export slot literally; a measure that adds no row
  until bound (fatal in a graph tool); icon-only verbs whose glyph did not say the verb (Layout
  read as "play"); controls that changed state with no visible result ("Show labels",
  Neighborhood naming no one); app workarounds for compact-mantine limits. Lessons: review by
  clicking, not reading; fix the shared component first; a result must show.

- 2026-10-09 Tier 2 round 1 walkthrough on build 946256efb876. Worked: one home for filtering
  (Filter to neighbors lands as a step), the header chip and its tooltip, matching edge menus,
  Escape from the Path popover. Did not: the step editor's form-and-Save model, two selection
  marks, the Path popover covering the canvas and its own next field. Lesson: press Enter, Tab
  and Escape in every new field during a walk; that found the worst fault in one try.

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

- (2026-10-06) Where Figma's grammar is load-bearing for tier 1: the Style tab ("+" adds,
  popover edits, bind icon, empty sections), selection driving the inspector, the find box,
  Quick actions, the toolbar, Export from the project-name menu, Save/Save as. Where it is not:
  the Data page, runs as rows, the paint tree's meaning, the legend. I review the first group for
  fidelity and the second only for consistency of controls.
- (2026-10-06) Labels. Figma's Text is a property of the object; graphty's label is a style line
  bound to an attribute. The closest Figma move is "Apply variable" from a property row. The
  label line with its attribute list opening at once is that move. If round 1 still shows people
  leaving an empty line, the Figma-consistent fix is to keep the list open until a pick or Esc,
  and to have Esc on an empty new line remove it (a "+" that was cancelled leaves nothing behind),
  not to preselect a "name" attribute (owner: start empty).
- (2026-10-06) The "Show labels" checkbox on the Label header: in Figma a section header holds
  "+" and, rarely, a section-wide toggle that visibly changes the canvas. If ticking it changes
  nothing without a line, it should not be offered then (round 8 decision). Verify the real app
  hides it when no row beneath sets a label.
- (2026-10-06) Tooltip delay and icon-only toolbar: the owner chose icons only. Figma backs that
  with optional labels for learners. graphty's equivalent is the "Additional labels" toggle in the
  framework, which is not in tier 1. If the toolbar fails first clicks, the evidence goes to the
  owner; I do not propose text on the toolbar myself.
- (2026-10-06) Find. Figma's Find produces a selection, and the selection is the subject of the
  inspector. A first-time user typing "Javert" should land on Javert selected, framed and read,
  in one Enter. Anything else (a list of rows, a filter, a hidden match) is a departure that needs
  a reason.
- (2026-10-06) Words. Figma's resting right panel holds about 25 words, mostly the user's content.
  Our budget: at most 50 app words at rest, about 30 for a selected object. Node names, attribute
  names and values must dominate; ids ("n0") read as app noise.
- (2026-10-06) Undo notices, the Discard-unsaved-changes prompt on Close project, and Save/Save as
  are departures from Figma's autosave, silent-undo model. They are forced by the browser file
  model (no autosave to a user file). Keep them minimal and check each has a ledger row.
- (2026-10-06) The study's simulated participants are generous and share blind spots; a failed
  task is a strong signal, a passed one weak. Grade from the last screenshot, never a summary.

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
