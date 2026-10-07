# Designer notes: the Figma Product Designer

Role: I speak for how Figma's editor works and why, treat it as the paved path for graphty's
controls and gestures, and make the studio justify every divergence with a forcing fact. I also say
plainly where graphty is genuinely different. Read this file at the start of every session; update
it as decisions land.

Last updated: 2026-10-07 (round 2 closed; re-pilot read; round 3 watch list on top).

## Top of mind

1. (2026-10-07) Round 3 measures the twelve round-2 changes. The re-pilot reached every end state
   with no blocker: Size "+" opens its list at once (T9), runs read "PageRank" everywhere (T7,
   T16), group layouts enable after Louvain with "Group by: Communities" chosen (T11), "Show all
   labels" shows every name (T10). Watch whether ease on sizing and names moves; that is credit.
2. (2026-10-07) "Show all labels" was decided against my "do not add it yet". The forcing fact was
   good: the element already has the capability and the switch visibly changes the drawing, so it
   is not the round 8 "Show labels" trap. Accept it; watch that words at rest do not rise.
3. (2026-10-07) New top risk, element: in the default 3D view perspective makes a nearer dot look
   bigger, so "biggest dot" can name the wrong node (Ava drawn larger than Farah, T15). Figma never
   lies about size; a size encoding must survive the camera. Open choice: element fix or the app
   opening a sized drawing in 2D. Not mine to decide; push for a recorded decision.
4. (2026-10-07) The key over a node: the element's fit has no inset (fixed 5 percent), so no
   consumer can keep the graph clear of an overlay. Needs a public option: an owner decision.
   Chrome over content stays a Figma violation; propose it for round 4 if round 3 confirms it.
5. (2026-10-07) The element still writes English refusals the app shows as is ('the layout
   "planar" ... G is not planar', '"results.louvain.group" names 6'). Words-at-rest debt; the fix
   is an element code plus app words, never an app rewrite of the sentence.
6. (2026-10-07) Before a round: check every decided change in the served build (preflight). The
   run rename slipped through round 2 unbuilt.
7. (2026-10-07) Check the Degree-row chevron and menu-to-dialog focus in round 3 on pointer and
   keyboard sessions; the re-pilot used Control+E and clicked the row word, so neither is proven.
8. (2026-10-06, owner) Figma's authority covers CONTROLS AND GESTURES ONLY; structure comes from
   graphty's ontology.
9. (2026-10-06) Every control must visibly change canvas, legend or popover. A key row for a
   painted-over layer is this class; round 2 decision removes fully covered blocks only.
10. (2026-10-06) Held, Figma-consistent: graph Style tab with no signpost, bind icon, icon-only
    toolbar, 1000 ms tooltip. No round-2 failure argues against them.
11. (2026-09-26, owner) No wizards, coach marks, first-run UI or suggestion cards.
12. (2026-10-07) Study reading: one model plays every persona; a failure is strong, a pass weak;
    the screen-reader tool now must follow the active option before its findings count.
13. (2026-10-07) Do not ask for what the build cannot do in a task prompt; a missing control is a
    finding, not a 3.5x measure.
14. (2026-10-06) Ledger debt: `figma-crosswalk.md` section 4 lacks rows for undo notices, the
    Discard prompt and Save/Save as.
15. (2026-10-07) Lesson kept: one smallest change per failure, so a round can attribute results.

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
- 2026-10-07 (me, round 2 critique) Round 3 proposal: menu-to-dialog focus, chevron in the hit
  area, Size "+" opens its list, key from winning layers, 2D Fit, group fact from the element,
  ship the run rename. Not changed: toolbar, tooltip delay, signposts, default labels or hover,
  a show-all-names control, ranking that also sizes. Reason: smallest fixes for verified failures
  on the core path; the rest is opinion or prompt-made.

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

- 2026-09-06 to 09-09 (v1 app) Figma pop-overs and a bottom-center toolbar: the owner liked the
  screens (2026-09-07), but panels were closed where popovers existed, so the "panel expands,
  icon opens advanced popover" pattern was not visible. Lesson: show the panel's common options
  open; a popover holds only the advanced rest.
- 2026-09-13 (v1) W14 onboarding slice with a welcome modal, a suggestion strip and a plain-
  language reading. Did not work: it is the clutter the owner later ruled out (2026-09-26). Lesson:
  Figma has no first-run UI; samples and defaults do that job.
- 2026-09-25 Object-first mocks borrowed Figma's frame. Owner found inconsistent chrome
  (hamburger vs rail), an overloaded right panel, and no way to open data. Lesson: copying the
  frame is not a design; data loading is key functionality Figma also has.
- 2026-09-26 Round-1 novice walkthrough (Elena, Karate Club): unlabeled toolbar icons with a 1 s
  tooltip delay were the steepest moment; the first click on a color swatch did nothing; the verb
  clicked ("Find groups") did not match the row it made. Lesson: Figma's icon-only toolbar works
  for Figma users because of muscle memory; newcomers need the first click to pay off.
- 2026-09-28 Mocks put Export top right and Styles under the Graph nav (copying Figma's Share
  slot and Styles list). Owner: copying Figma too literally. Moved Export to the project-name
  menu; styles later became the paint tree.
- 2026-09-30 My Structure B spec proposed (a) measures add no row until Color by / Size by is
  pressed, (b) a partition shows its largest 10 groups plus one "Other" child, (c) a Run dropdown
  in a TOP-center toolbar like Figma's shape tool. Owner rejected (a) as a fatal flaw ("this is
  graph visualization software"), accepted hundreds of groups collapsed and sortable instead of
  (b), and kept the toolbar bottom center. The Run dropdown survived as the Analyze popover.
  Lesson: Figma's "creating a variable binds nothing" does not transfer; in a graph tool a result
  must show.
- 2026-09-30 to 10-01 Refined B skeleton reviews (my lens): the blocking problems were mostly
  wiring (doors jumping to another project, label lines vanishing on popover open, a bound label
  line opening the color binding popover). Lesson: a control that changes state without the
  canvas following is the defect class that sinks tasks; review by clicking, not by reading.
- 2026-10-01 to 10-02 Rounds 7 and 8 on the skeleton: Figma-grammar fixes helped where wiring
  worked (layout method list ease 2.50 to 4.80, file actions in the main menu, the communities run
  row). Failed where a menu item did nothing visible: "Show labels" (19 of 21 never bound a name),
  Neighborhood that named no one (0 of 12). Lesson: Figma's "+" pattern is only as good as the
  visible result it produces.
- 2026-10-02 Round 8 first click: Layout icon read as "play" (62%); export data 10% (people
  clicked the Table toggle). Lesson: icon-only works when the glyph says the verb; otherwise the
  tooltip delay becomes the bottleneck.
- 2026-10-04 Build vs mock comparison: compact-mantine limits pushed the app into workarounds (roles
  as a row of selects above the Data page grid because the grid header cannot hold a menu; tick
  menu instead of the field list for Columns). Lesson: fix the shared component first.

## Thinking

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
