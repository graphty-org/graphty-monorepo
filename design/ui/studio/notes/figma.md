# Designer notes: the Figma Product Designer

Role: I speak for how Figma's editor works and why, treat it as the paved path for graphty's
controls and gestures, and make the studio justify every divergence with a forcing fact. I also say
plainly where graphty is genuinely different. Read this file at the start of every session; update
it as decisions land.

Last updated: 2026-11-06 (tier 6 round 2 closed; insights and decisions read; round 3 next).

## Top of mind

1. (2026-11-06) Round 2 closed with no confirmed severity 3: 11 of 12 finished, Undo 2 of 2, every
   computed count true. What is left has one shape: the screen says less than the graph did, or says it
   where the reader is not looking. Round 3 tests 15 units, one path per problem.
2. (2026-11-06) Watch first in round 3: Settings at 400% zoom (the only severity 3 candidate, a
   `frame.css` max-height media rule) and focus after a press that removes its own button (fails bar 8;
   one rule: hand focus to the composer). Walk both by pointer and keyboard at 320 x 256.
3. (2026-11-06) My Colored row was refused: the painted fact joins an existing line, no new row ("words
   at rest do not rise"). Check in round 3 that the reader and the model both see it; if a reader still
   misses it, that is the evidence for a row.
4. (2026-11-06) Reply end in view: step one is only `position: relative` on the log plus a measurement.
   Judge it by one scrollbar and a visible chip row and Undo at 1440 x 900, nothing more.
5. (2026-11-06) One name per measure: the Assistant uses `wordsFor(...).name` at all three `plainName`
   sites. Check Reach/Closeness, Bridges/Betweenness and Louvain/Communities against the key card.
6. (2026-11-06) Scope: only the placeholder changes ("Ask about this selection"). Scope words, sizes and
   counts are held so round 3 can credit one change. Retest the planted reader before any next step.
7. (2026-11-06) The refused-key failure may only say "may be", offers the provider, and keeps Send again.
8. (2026-11-06) Autosave: one tooltip string, true for opened files. No "no changes" label, no leave
   warning, no `showOpenFilePicker` (a new door, backlog).
9. (2026-11-06) Hover counts measure the study tool, not readers: a "nobody hovered" claim is void. Do
   not lead with tooltip findings until the tool's pointer crosses controls.
10. (2026-11-06) Chip cursor and tooltip were refused: the arrow cursor is the theme's `cursorType`
    system, not a defect. Do not raise it again without a reader's cost.
11. (2026-11-05) Before citing a design line, read what it covers. Name a fix's owner from the code that
    sets the value, not the file that looks right; grep for an existing handle before assuming a
    compact-mantine change.
12. (2026-10-30) Check every decided entry against the build before a walk; rate by the cost a reader
    paid, and state a broken rule apart. Look at the shot before any "nothing appeared".
13. (2026-10-21) One list drawn four ways; one chip grammar per row, one picker component.
14. (2026-10-20, owner; 2026-10-06, owner) No UI sentences, tooltips that instruct included. Figma's
    authority covers controls and gestures only; structure comes from graphty's ontology.

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

- **2026-11-06, round 2 decisions read.** Accepted the Director's ruling against my Colored row: the
  fact goes on an existing line because a row per effect stacks on turns already three lines tall, and
  a result path would print raw. Accepted holding all scope wording but the placeholder: one change per
  problem so round 3 can credit it. Accepted refusing the chip cursor (theme `cursorType`) and the
  failure-row glyph (no reader paid). Nothing in round 3 touches compact-mantine, so no Figma lock
  question. Settled rulings: a rollback leaves no selection and no Redo; closing the panel does not end
  the scope x (design 5.2).

- **2026-11-05, after tier 6 round 2.** Ruled for myself: a painting run gets a Colored row (3 replies
  claimed color over "Computed ..." alone). Challenged the insights on finding 7 (not partly reader
  behavior, and the bars are not cosmetic), on ordering (it is the cheapest high-reach fix) and on
  finding 9 (hold: one step each, and no plain words exist yet). Held the wheel, Group 1 to N, Open run
  and the approval gap as no change now. Reason for all: smallest change, cost a reader paid.

- **2026-11-05, after tier 6 round 1 insights.** Withdrew the repaint as a bar 11 matter and hold it
  as a design question: should a run that paints also get a Colored row? I lean yes, one line per
  effect, but 6.6 does not say so and the ruling is open. Moved my chip finding to a session question.
  Accepted that a chip click changing scope is no defect (5.3). Rated nothing up.

- **2026-11-05, tier 6 round 1 severities.** Held everything at 2 or below: no finding blocks a
  reader on its own, and my 3s have never survived a skeptic without behavior. Stated bars and rules
  apart: the repaint with no line is 2 with bar 11 named; retired names are 2 with glossary line 481
  named. Did not re-raise anything `decided.md` settles (panel width jump, the x, no red, the name
  starter, a question repainting); those are listed as no change. Rated the bar 12 word count (63 on
  the provider section) as keep with a reason, since bar 3 measures that disclosure.
- **2026-11-03, tier 5 round 1 rerun severities.** Kept the picker jump at 2 (recover by closing
  the list) and dropped the reference picker from it (it stays under its field). Rated the
  collapsed multi-step card 2, not 3: one click opens it, but it breaks decided.md 573. Rated the
  preview cut on Table toggle 2 and named graphty-element only as "check first": the mechanism is
  inferred, not traced. Moved the nested Edges where drawing to 1: no rule names it, and rule-less
  severity 2s did not survive last time. Dropped "filter picker has no Results": PageRank is there.

- **2026-11-03, tier 5 round 1 severities.** Picker jumping over the header rated 2, not 3: the
  reader recovers by closing the list, but it is in every typed pick of both hosts, so it leads
  the fix list. The filter picker's missing Results rated 2 (bar 7 asks the same entries in both
  hosts; picking the run there starts a second run). The full brush on an untouched range rated
  2 (drawing and count disagree, nothing is saved wrong). The sidebar "Except" misalignment rated
  2 but listed as a pointer: it is calm-first finding 6 and counts in bar 9. "Select 7" not
  raised: decided.md line 402.

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

- 2026-11-05 Tier 6 round 2 outcome versus my walk. Held with readers: two names, Show in table, the
  doubled period, failure reading as a reply, the repaint. Did not get a reader: "assistant node style".
  Worked: comparing the inner scrollbar's thumb with its track in `r2-s01/18` and `r2-s12/10` showed the
  log was not at its foot with no jump button up, which turned "never scrolled" into a defect.
  Grepping for an existing handle (`scrollToRow`) removed a Figma lock question I had assumed.

- 2026-11-05 Tier 6 round 1 outcome versus my walk. Held: two names on one result, Done dropping a
  key, the absent line for a selection (found through the repaint turn), left edges at 1. Weakened:
  repaint, chip, "reads as prose". Did not: I blamed `assistant.css` for centered starters; the cause
  is compact-mantine applying `--button-justify` only to a full-width button, so `justify` at
  `AssistantPanel.tsx` line 78 is inert and `fullWidth` is the likely fix (not run). Lesson: name an
  owner from the code that sets the value, not the file that looks right; quote a design line's scope.

- 2026-11-05 Tier 6 walk, five `real.mjs` sessions (about 85 shots, 21 paid calls). Worked: one paid
  message per state; a full `REAL_GEMINI_COUNT` file for 429, Send again and Stop at no cost (retries
  leave time for Esc); PIL side-by-side crops of the panel; grepping an odd string to name the owner
  (`style.ts` line 397, `historyWords.ts`). Did not: `--wait` does not outlast a slow turn, so
  `Open layer` missed while still running (check the Stop button first); a message cost 7 to 15
  calls, more than planned; dark 900 x 700 for 4.4 and 4.7 went unreached when the shared count hit
  the cap; after `--reopen`, `--click "volunteers"` left the start screen up. Lesson: paid states in
  the odd window sizes go first, not last.
- (2026-11-03, round 1 close) Did not work: raising nine walk-only bar 7 findings. Only three
  survived two skeptics, each because a session met it or a decided.md line it breaks was cited.
  Worked: scripted repros on the frozen build; they let skeptics keep findings no session met
  (Clear then Escape survived at severity 2 on its repro alone).
- 2026-11-03 Tier 5 round 1 rerun, eight `real.mjs` sessions (w1 to w8, about 75 shots), one per
  dataset including three the void walk skipped (sources, yeast, shifts). Worked: grepping
  decided.md and the spec's control table for each finding before rating, so each cites a line;
  PIL ink-column scans to measure text x positions (verb column) and caption heights; comparing the
  same control in an All group and an Or group (it exposed the full-brush contradiction only in Add
  steps); re-running the void walk's candidates before keeping them (two dropped). Did not:
  `--click "By value"` (the select's name is "<attribute> test": click its point); a wrapper that
  ran `--start` through with-browser.sh (real.mjs takes its own slot: never wrap it).

- 2026-11-03 Tier 5 round 1 walk, five `real.mjs` sessions (w1 to w5, about 120 shots), one per
  start (volunteers style host, volunteers filter host, the colleague's project, gauges with
  Within hops and Edges where, 50,000 staff). Worked: a small env file in the scratchpad with
  `REAL_DIST`, the session folder and a wrapper function, called directly per step (not a shared
  script); running `--start` from `rounds/tier-5/setups`; `--hover-at` loops over the header for
  tooltips; a PIL 4x crop to read 9 px captions; grepping decided.md and the backlog for each odd
  word before rating ("pick yes or no", "Select N", "greyed"). Did not: `--click Edges` is
  ambiguous in the Data place (use the point); the 50,000-node steps need a 200 s timeout.
  Lesson: the picker jump shows only after typing; a walk that clicks options never sees it.

- 2026-09-06 to 10-30, summarized 2026-11-06. Worked: one `real.mjs` session per start state or
  dataset; `--hover-at` on every icon; PIL 4x crops and ink scans; grepping app source for odd words to
  name the owner; grepping decided.md before rating; re-walking last round's routes; the Figma capture
  in `design/ui/figma/`. Did not: ambiguous `--click` names (use `"X#1"` or a point); `--shift-click-at`
  (use `--shift-click "<name>"`); wrapping real.mjs in with-browser.sh; severity 3s with no repro;
  app workarounds for compact-mantine limits; first-run modals; controls with no visible result.

- (2026-10-30) Did not work: holding severity 3 on single-cause findings. Both skeptic checks cut
  every severity 3 candidate to 2 or 1 because participants recovered from the counts. Rate by the
  cost a reader paid, and say "rule broken" separately when an approved surface is lost.
- (2026-10-30) Worked: findings with a scripted repro survived the check (join preview, clipped
  ratio); findings resting on the tool's hover line did not.

- (2026-11-03) Tier 5 round 1 insights: my walk's bar 7 list was mostly cut. Did not work:
  rating eight items at 2 from one walk without scripted repros -- the skeptics kept only the one a
  script reproduced. Worked: naming the decided.md line each finding departs from (both surviving
  naming defects cite one). Next time: one repro, one screenshot, one decided.md line per finding.

## Thinking

- 2026-11-06 The round's rule "words at rest do not rise" is Figma's own: the properties panel never
  grows a sentence to explain a state; it changes a value in place. I should propose facts on existing
  lines before new rows. My walk's hit rate is best when a reader paid and a repro exists; tooltip
  evidence is weakest now that the tool's hovers are known to be deliberate.

- 2026-11-05 Round 2 says my "transcript" worry was smaller than I thought: readers told the model's
  words from computed ones by asking, and nobody held a wrong belief. What cost them is the line the app
  computed not naming the same thing as the key card. Names first, drawing second.

- 2026-11-05 A walk with no sessions behind it should say "seen", never "reader cannot tell". Words
  like that were what the skeptics cut. The transcript problem (computed words and model words in
  one drawing) is still my reading: the line sits on the Open run and Undo row, which may be enough.
  Watch whether readers trust the reply over the line; that decides the chip.

- 2026-11-05 The Assistant is Figma's grammar at its best where it is a list of real things (peek,
  request, Open layer) and weakest where it is a transcript: words the app computed and words the
  model wrote share a drawing. Most of my list is that one problem. Cheapest fix: draw the count in
  the change line as the chip it already is.

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

- Tier 6 round 2 (2026-11-05): `design/ui/studio/tier6/rounds/round-2/insights.md`, `scores.md`, `sessions/`, `repro/`.
- Tier 6 insights (2026-11-05): `design/ui/studio/tier6/rounds/round-1/insights.md`.
- Tier 6 (2026-11-05): `design/ui/studio/tier6/criteria.md`, `design.md`, `decided.md`, `backlog.md`,
  `rounds/round-1/expert/figma.md` (this walk; shots ignored by git, in `expert/figma/`).

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
