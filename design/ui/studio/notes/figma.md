# Designer notes: the Figma Product Designer

Role: I speak for how Figma's editor works and why, treat it as the paved path for graphty's
controls and gestures, and make the studio justify every divergence with a forcing fact. I also say
plainly where graphty is genuinely different. Read this file at the start of every session; update
it as decisions land.

Last updated: 2026-10-10 (tier 2 round 2 closed; decisions read).

## Top of mind

1. (2026-10-10) Round 3 does not start until the study is fixed: participant folders outside the
   studio tree, a transcript check that voids any session that read a facilitator file, a dry run
   seeded from two throwaway pilots per task, and every bar script proven on a planted fault.
   Until a clean run, no round 2 route (weight meaning at load, Replace in "...", the rule hint)
   is credited, reworded or moved.
2. (2026-10-10) Find box (severity 3): a miss shows the example rule; the element's suggestion
   shows with its "="; a shown rule is Enter's option and runs on click. My lenient element parse
   was not taken: bare numbers change an existing call, so they stay on the owner's list. Watch:
   does 3+ of 8 still stall? Only then "Select where..." on the column menu.
3. (2026-10-10) Lesson kept: a decided change must name its key behavior ("Enter runs it"), or the
   build ships the words without the act. Round 2's rule hint was exactly that failure.
4. (2026-10-10) Selection styling: "+" Color/Width on a selection's layer starts at the element's
   highlight look via a new additive `session.styles.highlightStyle(target)`, not an app value.
   Width 8 as a hairline is an element units question already with the owner; the app must not
   scale widths. Layer from a rule is named by its rule. Watch the styling detour in the dry run.
5. (2026-10-10) Add over a loaded file: element reports repeated edges from `data.prepare()`;
   the Add page shows the count and "Replace <source>" beside Load (same command as the "..." menu).
6. (2026-10-10) Decided as I proposed: "Filter to neighbors" is a plain command, the step's own
   checkbox is the only on/off; Tab and click-away commit a step edit, Escape cancels and says so;
   24 px hit area on compact-mantine's extra-small checkbox, drawn box unchanged.
7. (2026-10-10) Also decided: second Escape no longer blurs the find box; Follow arrows no longer
   jump into Hops; repeated status messages announced again; Shortest path found by "linked",
   "between", "fewest", "chain"; weighted path row reads "minutes 14", not "4 hops".
8. (2026-10-10) Bar 9 (b) failed (words at rest rose on all four tier 2 screens). Words go down,
   never up: the key names a run's scope only when drawing and run differ. Count before I propose.
9. (2026-10-10) Severity 3 left to the owner: drawn names covering each other and ties (element
   label placement, unseeded layout). No app font, seed or offset hacks.
10. (2026-10-10) Round 3 watch list for my walk: Enter/Tab/Escape/Tab-then-Escape on every field;
    click empty canvas while a run is selected (decides a note's subject); half-made step lost on
    another selection; run a path twice; reopen the Path form; newer copy of a loaded file.
11. (2026-10-09) Still my deferred divergences: step editor is a Save form, not a live inspector;
    checkbox vs eye; two row grammars; add-first for "+". Bring only with clean-run evidence.
12. (2026-10-09) Tool trap: run `--start` in the foreground; a backgrounded one keeps waiting for a
    browser slot and later serves into the folder. Click by name must match one control only.
13. (2026-10-07) Open element asks: fit inset (toolbar and key cover nodes); size encodings vs 3D
    perspective; neighbor distance per node (to group "1 step"/"2 steps").
14. (2026-10-06, owner) Figma's authority covers controls and gestures only; structure comes
    from graphty's ontology. Every control must visibly change canvas, key or popover.
15. (2026-10-07) One model plays every persona: a failure is strong, a pass weak; a leaked
    facilitator file makes passes weaker still, failures found anyway robust.

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

- 2026-10-10 (Director, round 2 closed) Fifteen round 3 changes in
  `tier2/rounds/round-2/decisions.md`, study tool first (leak, pilot-seeded dry run, bar scripts
  proven on planted faults, all rated 4), then one change per confirmed problem in its owning
  package. Versus my proposal: find box kept in the app (shows the element's rule, Enter runs it)
  and the bare-number parse stays an owner question (it changes what an existing call accepts;
  an opt-in flag was rejected as a capability, not a choice); selection styling defaults come from
  a new element `highlightStyle()` instead of app defaults; "Filter to..." caret in Value not
  listed. Accepted as proposed: duplicate-edge count with Replace, 24 px checkbox target, Tab
  commits a step, "Filter to neighbors" a command, rule-named layers. Also decided: T22/T24
  prompts drop "stand out"; re-run r2-s05, the three round 2 routes and the follow-ups. Reason:
  one change per failure so round 3 can attribute it; no new door where one is measured; words
  at rest only down.
- 2026-10-09 (me, round 2 critique) Round 3 changes, smallest per verified problem: (1) the
  find box runs what it recognizes -- one Enter-able row "Select where <rule> (n)" for a typed
  condition, a column word or a bare number, fed by a lenient parse in graphty-element (additive:
  accepts input refused today, returns the normalized rule or a { code, params } reason); (2) a
  layer made from a selection starts with a visible Width and a non-gray Color and is named by
  its rule, not its count (app defaults and words); (3) "Add to" that would duplicate every tie
  says so and offers Replace (element reports the duplicate count as a fact); (4) bar 8: step
  checkbox hit area 24 px in compact-mantine, the find results' scroll area focusable; (5) step
  editor: Tab and blur commit, "Filter to..." puts the caret in Value; (6) "Filter to neighbors"
  stays a command. Not now: label overlap (element, large), live inspector, eye vs checkbox, row
  grammar, Replace placement and the weight route (re-run them under a clean briefing first).
  Reason: severity 3 and bar-8 first, each in its owning package, one change per failure.
- 2026-10-09 (me, round 2 walkthrough) Severity 3 only for backtick numbers (code syntax on the
  rule success path, bar 10 class). The recognized-but-dead typed condition is 2: the hint gives
  the exact line to retype, so it slows but does not mislead. Tab-then-Escape losing an edit is
  2: the row name shows the truth. The key's text-only out-of-date mark drops to 1. Reason: rate
  by whether a reader can be misled or stopped, not by how un-Figma it is.
- 2026-10-09 (summarized 2026-10-10) Tier 2 round 1: severity 3 went to Enter not committing in
  the step editor, backtick numbers, cut edge names and the key with no out-of-date mark. Round 2
  list (Director): measurement first, then reproduced defects, one door per confirmed problem;
  Replace in the source "...", weight meaning reached at load, find-box rule line, Enter/Escape in
  the step editor, new step selected and focused. Column-menu "Select where..." deferred. Reason:
  each change adds at most one way in, so a round can credit it alone.
- 2026-10-07 (summarized 2026-10-09) Tier 2 gap proposal and tier 1 round 2 close: refined B
  built where decided (Filters with Apply checkbox and header chip, Path popover with pick
  fields, Notes with N, Neighborhood list, Replace on the source menu); twelve round 3 changes
  accepted, each in its owning package. Element asks still open: numbers without backticks,
  edge selection style, field kinds on a run result, a fit inset.
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

- 2026-10-10 Round 2 closed. Did not work: the study itself (participants read the facilitator
  file; 13 of 16 follow-ups answered early), a dry run one round behind (12 of 30 build faults on
  the unwalked selection-styling detour), and a keyboard fault the dry run found but handed on
  (second Escape blurs the find box). Worked: no grade decided by a build fault, 0 errors ending a
  session. Lesson: a dry run must walk where pilots actually go and fix what it finds before
  freeze; bar scripts the preflight names must exist (bar 10's counts did not).
- 2026-10-09 Round 2 walkthrough. Worked: "Path between..." fills From and focuses To; canvas
  pick with a hint and no selection change; Replace on the source inspector "..."; Rerun banner;
  Delete then Control+Z with focus kept. Did not: the typed-condition change shipped as a
  teaching line, not a runnable row (the smallest version of my proposal lost its point);
  "Filter to neighbors" grew toggle behavior nobody decided. Lesson: when a change is decided,
  write the key behavior into it (Enter runs it), or the build ships the words without the act.
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
