# Designer notes: the Figma Product Designer

Role: I speak for how Figma's editor works and why, treat it as the paved path for graphty's
controls and gestures, and make the studio justify every divergence with a forcing fact. I also say
plainly where graphty is genuinely different. Read this file at the start of every session; update
it as decisions land.

Last updated: 2026-10-30 (tier 4 round 1 walkthrough on build 79ed770292).

## Top of mind

1. (2026-10-30) Tier 4 round 1 walk: `tier4/rounds/round-1/expert/figma.md`, 18 findings, two
   severity 3. Filter cards say "Hide" and keep what matches (the top bar calls the same cards
   "Showing only"); a date card rests as "opened is at most 1546300799999" (`filterWords.ts`).
2. (2026-10-30) Decided-but-unbuilt items found on the frozen build: Filter to / Filter out words,
   the address box's Open button, date-only CSV dates, the joined row's drawn ratio (R11), the
   join count chips as one grammar (R13). Check every decided entry against the build before a
   walk: four of my eighteen findings were decisions already made.
3. (2026-10-30) Bar 6 candidates I hold with a session repro: the approved "17/19" ratio is no
   longer drawn (only in the accessible name); the web address opens only on Enter.
4. (2026-10-30) After a join, pantries.csv's row drops its issue chip while the table still says
   "With issues 2". The decided home of issues goes blank.
5. (2026-10-30) Kind drawn two ways again: a text column with the Time role is a calendar in the
   Filters picker, "Aa" in the table and Fields. Rule: the kind glyph follows the kind alone.
6. (2026-10-30) The filter card and the Style card still rest differently (dim sentence vs bordered
   chip; no Done). "The filters ARE the Style cards" needs one resting drawing.
7. (2026-10-30) Works now: toolbar Filters is a door; Filters "+" is the Style picker; filters never
   move the camera; Sources "+" and row menus show glyph and key; Time sets only the time.
8. (2026-10-21) Biggest tier 3 newcomer cost: an empty selection's Style tab shows only canvas
   settings. Figma's empty-selection panel still points at what styles the content.
9. (2026-10-21) A new style line must change the canvas or show the covered value as a
   placeholder; an added line equal to the current value reads as broken.
10. (2026-10-21) One list drawn four ways is my standing complaint; tier 4 adds the join count row
    (four kinds of count in one row). One chip grammar per row, one picker component.
11. (2026-10-21) Layer tree Shift-click anchors on the last layer clicked, not the selection.
    Watch item.
12. (2026-10-20, owner) No UI sentences; tooltips that instruct ("Click to open Filters, where
    you can ...") are sentences too.
13. (2026-10-06, owner) Figma's authority covers controls and gestures only; structure comes from
    graphty's ontology. Never a task-word synonym.
14. (2026-10-07) One model plays every persona: a failure is strong, a pass weak.
15. (2026-10-23) Location as one "+" pick per kind; latitude and longitude are two rows (X and Y).
    Fields "+" still offers "Coordinates" and makes Latitude and Longitude rows: one name per thing.

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

- **2026-10-30, tier 4 round 1 severities.** Rated "Hide keeps" 3, not 2: a reader reading the
  visible word gets the opposite of the canvas, and the app itself calls the cards "Showing only".
  Rated the epoch-millisecond date summary 3: it is the only reading of a closed card, so the
  reader cannot check their own rule. Rated the missing joined-row ratio 2 but flagged it for bar 6:
  the backlog has it at 1 as cosmetic, while the decided list names it an approved surface. Rated
  the Control+E label on a row's Export 2: a key shown beside an item must do that item.

- **2026-10-23, menu sections (issue #3315, director ruled).** Section labels, as Figma's own
  menus and plugin lists do: small dimmed caps-weight label, no rule line, no indent, rows flush.
  Both pick lists draw the same `ws-analyze-heading` label so they cannot drift. Engines read as
  peers under "Force-directed", not as children of Force. Command menus keep dividers, as Figma's
  do.
- 2026-10-21 From round 1 insights: rank the empty-selection Style tab pointer and the "new line
  equals current value" default as my top two design asks for the next tier. Reason: both cost
  9 sessions each on 5 halves, both kept unweakened by both skeptics; each is a chrome fix.
- 2026-10-21 Do not add task-word synonyms ("Cube") or domain words; the skeptics weakened those
  items as built around one task's wording. Matches the generality rule.
- 2026-10-21 A new style line must default to a value that visibly differs from what it covers
  (or show the covered value as placeholder, not as a set value). Reason: Figma's added fill is a
  visible new paint; ours is invisible and reads as broken.

- 2026-10-21 (me, round 1 walk) Rated the Shift-click anchor severity 3, not 2: the wrong layer
  is the base layer, and a bulk edit then writes to all nodes; the reader sees "2 layers" but not
  which. Rated the four attribute/value drawings 2 each, one fix. Rated "+" adding a field that
  shows the value beneath (no canvas change) as by design, not a finding: I recommended
  placeholders that show the value beneath on 2026-10-12. Opacity missing from the color row
  rated 2 because it was decided and not built.
- 2026-10-14 (round 6) Kept the icon as kind only (Figma's rule); Add layer makes a real named
  layer; one "+" item per drawn part with sub-settings in the part's popover; number fields scrub
  on the name with no spinners; popovers keep the edge facing their anchor fixed. Rejected my own
  "Width (every outline)" in a layer popover: a graph-wide write in a layer breaks every layer
  being equal; it lives in Graph settings.
- 2026-10-13 (iteration 3 walk) Cut property names severity 3 (a property name is never
  truncated in Figma, and it is on every layer at rest); kind change emptying a layer 2.
- 2026-10-12 (iteration 2 walk) Lost Undo after Clear severity 3; one value with two or three
  names severity 3. Departure kept: the vary glyph at rest.
- 2026-10-12 (owner feedback 1) Unsetting is one grammar for every field and for split children;
  split is not a row kind; Figma pass: 10 adopts, 2 adapts, 3 rejects (Effects default entry,
  detach on a derived binding, components and modes).
- 2026-10-12 (tier 3 answers, `tier3/decide/figma.md`) Section-as-unit for single-value sections;
  add-first effect entries; written sections only, the rest behind one "+" per kind heading; data
  gradient; split parent as frame; kind control plus Filters' conditions for Which elements;
  text styles as presets; vary glyph on every bindable channel; element additions all additive.
- 2026-10-06 to 10-11, summarized 2026-10-21. Tier 1 and tier 2: each round's list was one change
  per confirmed failure in its owning package. Taken from me: find box runs what it recognizes,
  Replace in the source "...", table scope "visible" with "12 of 41", "or more" row, bare column
  name as a new element export, Tab commits, "Filter to neighbors" a command, rule-named layers,
  Shift-click adds (Shift only), Filters door, name-first ranking, inspector tabs Style then
  Values. Not taken: Value blur commit, second-path notice, cutting ", full graph" before a diff.
- 2026-09-25 to 10-04 (owner), summarized. Figma is the paved path for controls and gestures only;
  structure from graphty's ontology (objects are results of algorithms and filters). Design for
  the intermediate user, no persona features. Export in the project-name menu; no avatar. One
  paint tree left, inspector right with Style and data tabs, Analyze from the toolbar. A run paints
  when it finishes; eye shows and hides. Toolbar icons only, rename by double-click. Unset values:
  "+" adds a line, popovers, never accordions. One color picker, Figma's. Pickers keep the search
  field shown and focused (fix in compact-mantine). Tooltip delay: 1000 ms is Figma's; change only
  on study evidence.

## Tried: worked / did not work

- 2026-10-30 Tier 4 round 1 walk, four `real.mjs` sessions (w1 to w4, about 90 shots). Worked:
  one session per start state (empty, pantries, volunteers, pantries-joined); `--hover-at` on
  every icon, which found three controls with no tooltip; reading `route.jsonl` for the hover
  text of a row, which proved "17/19" lives only in the accessible name; comparing against the
  reference shots in the main checkout's `tmp/design-studio/tier4/reference/`; grepping the app
  source for the odd words on screen ("is at most") to name the file. Did not: `--click
"pantries.csv"` is ambiguous once Fields has a group of that name (use `"pantries.csv#1"`);
  `--start` with `setup:` must run from the setups folder or name it. Lesson: grep decided.md's
  team entries before walking, so a missing build reads as "decided, not built", not a new idea.

- 2026-10-21 Round 1 outcome versus my walk. Worked: my walk's sev 3 (Shift-click anchor) and
  the four-ways list held as real; my Figma comparisons mapped onto 4 of the top 6 insights.
  Did not: my severity 3 did not survive into bar 5 (no session reached it) -- a walk finding
  without a session reaching it is a watch item, not a blocker. My "jargon" verdict on the
  <<Layer>> token was weakened as opinion; bring behavior evidence, not reading verdicts.

- 2026-10-21 Round 1 walk, three `real.mjs` sessions (82 shots). Worked: one long session per
  dataset walking every screen; `--hover-at` on each icon for tooltip and role; PIL crops at 4x of
  the tree and inspector made 9 px text and glyph meaning checkable; a PIL difference box proved a
  hover changed only the row, not the canvas. Did not: `--shift-click-at` does not exist (use
  `--shift-click "<name>"`); `"X#2"` is refused when only one control has that exact name; every
  `--hover-at` writes a screenshot, so numbering jumps. Lesson: when a modifier click gives an
  odd result, write down what the previous command selected: the anchor bug showed only because
  Duplicate, not a click, had made the selection.
- 2026-10-12 to 10-13, summarized. Tier 3 iterations 1 to 3. Worked: one driver per walk with a
  try per section; measuring in the page (scrollWidth vs clientWidth, left edges, aria names)
  turned "looks cut" into numbers; the Figma capture (`design/ui/figma/`) answered Figma
  questions without a browser; reading element types first turned "element must add" into
  "element already has". Did not: Mantine's segmented control hides its radio off screen (click
  the label); guessed control names miss (dump names first); drafts ran 20 to 40% over word
  budgets (cap list items at two lines).
- 2026-10-09 to 10-11, summarized. Tier 2 rounds. Worked: re-walking last round's routes with the
  same scripts; opening each control from a second state; walking repeat work (run twice, undo,
  reopen, New project) found every severity 3. Did not: severity 3s without a repro script were
  cut; a walk on an unchanged build already walked wasted slots; a crash met mid-walk needed its
  own minimal session. Lessons: a script with every severity 3; check for an existing walk of the
  build; commit the walk before the notes.
- 2026-09-06 to 10-07, summarized. Worked: Figma popovers and a bottom toolbar, the "+" pattern
  where the result shows at once, Size "+" opening its list at once. Did not: closed panels
  hiding common options; first-run modals; copying Figma's frame or Export slot literally; icon
  verbs whose glyph did not say the verb; controls with no visible result; app workarounds for
  compact-mantine limits; decided changes that never shipped. Lessons: review by clicking, not
  reading; fix the shared component first; a result must show; check a decided change in the
  build before the round.

## Thinking

- 2026-10-30 Tier 4's data screens are close to Figma's paved path now; what remains is words and
  drawing drift between two homes of one thing (filter card vs Style card, picker glyph vs table
  glyph, Fields "+" vs Sources "+"). The cheapest fix list is "one component, one resting drawing"
  per pair. Dropped from top of mind on 2026-10-30, still true until a walk says otherwise: tier 3's
  color words and swatches, keyboard focus rings, the "+" lost on re-layout, Control+G to a folder,
  opacity in the color row (decided 2026-10-13, not built).

- 2026-10-21 Success saturates; the useful measures are steps over the key, first door tried,
  and spoken-versus-seen disagreement. Figma's strength is that an empty selection is never a
  dead panel -- graphty's is. That one change may cut the most cost per line of code.

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

- Tier 4 (2026-10-30): `design/ui/studio/tier4/criteria.md` (bars, severity), `decided.md`
  (owner rules, approved surfaces, R1 to R15, team entries, dry run passes), `review/figma.md`
  (my pre-round review on e52d7c4f57), `rounds/round-1/expert/figma.md` (this round's walk).
  Reference shots of approved surfaces: main checkout `tmp/design-studio/tier4/reference/`.

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
