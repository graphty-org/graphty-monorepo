# Red Team Critic -- designer's notes

The studio's Red Team Critic attacks clutter, features grown from one persona's task, unjustified
divergence from Figma or from our own patterns, and findings that are artifacts of simulated users
or of a broken prototype. Every objection comes with a sharper, usually smaller, alternative.
Read "Top of mind" first at the start of every session; update it whenever a decision or a result
changes it.

Words used below: "the element" is graphty-element, the web component that owns all graph logic;
"the app" is the graphty app, chrome around it. "Tier 1" is a first-time user's core path from an
empty app (open a sample or file, read it, run an analysis, color/size by a value, labels from an
attribute, a readable layout, find a node and its neighbors, export picture and numbers, save and
reopen, and the whole session chained). "The mock" is the clickable skeleton of the app structure
the owner chose ("refined structure B"); "the real app" is the tier 1 build merged 2026-10-06 and
served at `/?next`.

## Top of mind

1. (2026-10-07) Round 3 measures fixes, not a redesign. The pilots on build b7590f8de reach every
   tier 1 end state with no blocker (T6, T7, T9, T10, T11, T12, T13, T15, T16). So round 3's
   failures, if any, are about words, perception and legibility -- not dead controls. Grade those.
2. (2026-10-07) New top risk: perspective lies about size. In 3D, a nearer dot looks bigger:
   on friends.csv Ava (0.06423) draws larger than Farah (0.06608), in the export too (T15, T9
   pilots). A "biggest dot" answer can be wrong from a screen that looks right. Fix belongs in the
   element (a size encoding that survives perspective) or as a 2D default the app passes; trace
   before choosing. Do not add a notice.
3. (2026-10-07) Element English keeps leaking to first-time readers: layout refusals ('"planar"
   ... G is not planar', '"bipartite" ... "results.louvain.group"'), "centre", CSV warnings from
   graph-io, run.label. Fix = codes plus parameters from the element, words in the app. Never
   rewrite the strings in the app.
4. (2026-10-07) Watch the group named three ways (run "Louvain", groups "Group 1-6", layout form
   "Communities"). One word per thing; the form should name the run. Columns by group ignores the
   groups' order (6,1,5,3,4,2): element defect.
5. (2026-10-07) "Show all labels" (a checkbox, not a switch) works: 5 steps to every name. Now
   watch the cost it buys -- overlapping, tiny, soft names (T10, export blur). Judge legibility
   only on real-size renders, never on downscaled shots. No zoom hint under the count.
6. (2026-10-07) Everything's Style tab shows base Color 6366F1 and Size 1 while every dot is
   orange and sized by the run row above (T15). Watch for "my sizing was lost". Answer is the
   layer list reading true, not a second readout.
7. (2026-10-07) Key over nodes is now on three tasks (T9 Florentine, T11, T13 ok). Fitting around
   it needs a new public element option (inset/padding) -- an owner one-way door. Count it once
   per dataset; raise it only with that framing.
8. (2026-10-07) Overview row "Undirected, from the file: directed 0" overflows and leaks file
   syntax: seen on four pilots, deferred twice. Fix by deleting the raw half, not adding words.
9. (2026-10-07) Study tool: "ambiguous" prints on a checkbox and its own label, and on labeled
   selects. Graders must not score them as wrong turns. Answer key says "switch", build draws a
   checkbox -- fix the key's word.
10. (2026-10-07) Still owed before round 3 fixes are judged: axe and app-words-at-rest on the
    round 2 build (decision 11). Without the baseline no word or a11y claim is comparable.
11. Rounds are one model playing every participant: a failure is strong, a pass weak, a scripted
    repro or code cause solid. Count deterministic layout events once per dataset.
12. (2026-10-06) Fix by removing, not adding. One door per job. No persona features, first-run
    UI, suggestion cards, tours (owner, v1 lesson).
13. (2026-10-06) Overfitting guard: task words never echo a fix's screen words ("Show all
    labels", "picker"); answer key fixed before the round; report both scorings.
14. (2026-10-06) Graph logic in the element, words in the app; check existing element API before
    proposing new API (three times now it already existed: legend cover, run.fields, declutter).
15. (2026-10-07) Screen-reader findings need a tool with active-option and browse mode, or a real
    user; do not fix to the tool's blind spots.

## Priorities and values

- (2026-10-06) Less on screen beats more help on screen. The owner's founding complaint (2026-09-25)
  was that graphty "looks complex and cluttered compared to figma" with "more cognitive load".
  Every addition must beat that cost, and the burden of proof is on the addition.
- (2026-10-06) The intermediate weekly analyst is the design target. Novices and experts are served
  only by aids everyone gets: undo, working defaults, (i) icons, waiting tooltips, Quick actions
  with aliases, samples, documentation.
- (2026-10-06) Evidence over taste, and the right evidence. A finding counts only when observed in
  two or more participants, on a screen that actually did what the design says, with task words
  that did not echo the target. "Ours is clearer" is taste.
- (2026-10-06) Owner items outrank simulated findings. Do not re-ask decided questions; check the
  owner feedback file before raising any owner question.
- (2026-10-06) Honesty of the readout over a quiet screen: a count that is not computed from live
  state is removed, not reworded (the fixed "64 hidden" string was the top trust-killer in round 8).
- (2026-10-06) Studies are expensive (owner, 2026-09-29): a round must not launch until its decisions
  are drawn and its preflight proves the build reaches every task's end state.

## Design criteria

- (2026-10-06) One home per capability; other entries are doors that run the same registered
  command with identical words. Two controls that set the same state are a defect. Reason: owner,
  2026-09-12 and 2026-09-30, "why the duplicate locations for functionality?"
- (2026-10-06) A fix names its cause. If a finding traces to a missing label, an undrawn decision or
  a mock fault, the fix is that, not a new control. Reason: round 4-8 triage repeatedly found
  proposals that built new features around an unwired picker.
- (2026-10-06) Nothing exists only for a beginner or only for the first few uses. Reason:
  `framework/principles.md`, "How every skill level is served" test; the owner's v1 lesson.
- (2026-10-06) The tool states facts, never verdicts or recommendations ("real change or noise",
  "treat them as tied" with a made-up 2%). Reason: principle 1 and the methods-section voice; a
  verdict the tool cannot defend costs trust.
- (2026-10-06) An algorithm's suggested style paints only its own result; dimming the rest is the
  reader's choice. Reason: repository rule "Algorithm Styles"; owner 2026-09-16.
- (2026-10-06) Every count names its unit and its whole, and comes from live state. Reason: rounds
  2-7 had numbers disagreeing between screens every round.
- (2026-10-06) A text-only tree-test miss is not enough to restructure; corroborate with a
  click-through first. Reason: round 8 tree "run betweenness" 29% direct but 99.7% correct overall
  and the click-through did not fail there.
- (2026-10-06) An unbuilt thing is not drawn: no "Coming" tags, no disabled promises. Reason: tier 1
  design rule; v1 had `ComingTag`.
- (2026-10-06) Words: industry terms (betweenness, not brokers); friendly words only as search
  aliases; no two reachable controls share an accessible name. Reason: owner 2026-09-26; round 8
  "Data" named both a rail place and a tab and dropped the selection in 12 of 12.
- (2026-10-06) Screen at rest with a graph loaded: at most 50 words of app text; a selected object's
  inspector about 30, 40 max. Reason: principle 5, measurable on the real app.

## Decisions and reasons

- 2026-09-26 -- Personas and workflows validate the design; they never generate features. Reason:
  generating from personas produced v1's clutter. Decided by the owner.
- 2026-09-26 -- No wizards, suggestion cards or first-run interface; "key functionality" is loading
  data and analysis/visualization features, not cards that suggest runs. Decided by the owner.
- 2026-09-29 -- Overfitting rule: task words never reuse a fix's on-screen words; two-domain test
  for every label change; currency special case dropped ("Total <column> in/out"). Evidence: round 6
  money task 2.00 -> 5.00 after the screens named money. Decided by the owner.
- 2026-09-29 -- Fold style files into recipes rather than adding a route to them (I withdrew my
  "delete Main menu > Recipes" for this). Reason: removes a concept instead of adding a door.
  Decided by the studio. Note: "Apply recipe or style file..." later drifted back into the spec;
  still unresolved.
- 2026-09-29 -- Delete "Undo back to here" rather than rename it; selection changes are not undo
  steps; a cleared selection comes back with Ctrl+Z from one slot via the existing notice line.
  Evidence: round 6, notice-only lost the selection in 5 of 8 (ease 3.62 vs 5.12). Studio.
- 2026-09-29 -- Rejected as invented features: "Keep for referral" (a case-management verb; named
  sets already exist), a tie stepper nobody asked for (kept only when a tie actually exists),
  per-seed counts for multi-seed runs that do not exist, a "no change" band in the Print look,
  a spread-per-column statistical comparison ("graphty is not a statistics package"), "offer to put
  the name on earlier notes" (rewrites a recorded author). Studio, on my challenge.
- 2026-09-29 -- Palette suggestion and partition color matching are real algorithms: they go to the
  element backlog, not into app chrome. Studio (I conceded they are real, not cuts).
- 2026-09-29 -- Do not rescore a missed bar after seeing the data; a new answer key applies only to
  the next round and is fixed before it runs; report both scorings. Studio.
- 2026-09-30 -- A run paints as soon as it finishes; several runs may fight over color; the eye
  hides. "Measures don't paint on their own" called a fatal flaw. Decided by the owner.
- 2026-09-30 -- The app adds no look of its own; styling is unopinionated and left to the user.
  Owner.
- 2026-10-03 -- Round 8 triage: fix the mock defects first (runs finish, rows repaint, size
  commits, dead label routes work), then re-score. Studio, on my position.
- 2026-10-03 -- Neighbors: one surface, not three. Selecting the neighbors lands on the existing
  several-selected list; degree and the "N connections" chip select them. Rejected: a new
  Connections list, "Edges of Javert", a filtered table dock. Studio. (Tier 1 design later titles
  the list "Javert's 17 connections" with tie values.)
- 2026-10-03 -- "Show labels" is not deleted: it is a real element setting that hides labels a lower
  row draws. It is offered only when some lower row sets a label; otherwise the Label "+" adds an
  empty label line at once and opens its picker. Studio, on my check of the mock's code.
- 2026-10-03 -- Sample opens with nothing run; no second "Worked examples" sample mode. Reason: the
  pre-run PageRank hid participants' own results in the color and size tasks. Studio.
- 2026-10-03 -- Hold Size as its own heading until the wiring alone is re-tested (11 of 12 reached
  the right control). The tiny default size goes to the element as a default fix. Studio.
- 2026-10-03 -- Deferred as not tier 1: filter chip removal, "Use as edge weight..." door, a scope
  header from two participants, notes stamped with data version, "Rerun all", folding settings under
  More, leading-zero key matching, a value-and-count Select where builder. Studio.
- 2026-10-03 -- Stop mocking; build tier 1 as the real app and study that. Owner.
- 2026-10-03 -- graphty-element is presentation-neutral: facts and codes, no English, headings or
  groupings; the app writes every word. Owner.
- 2026-10-03 -- Tier 1 design adversarial review: SVG not drawn rather than drawn disabled; facts a
  browser cannot know are removed (save folder, "to Downloads"); the inspector's "label hidden" note
  and the data export's hidden-label warning dropped. Studio.

- 2026-10-06 -- Round 1 (folded): first-time bar not lower than all-sessions bar; reference
  values recorded for every graded answer; T4 two-file join not tier 1; neighbors fixed by
  routing the existing command, not a second list; no Degree cue; no "Influence" rename on one
  round; word-budget items (Overview direction row) counted in bar 9 before touching.

- 2026-10-06 -- Round 2 attack (my positions): (a) neighbors = route the Neighborhood command to
  `openNeighborhood` when one node is selected; withdraw my Summary-lists-names (second list).
  (b) No Degree cue in round 2 (the routed door is what 4 of 4 used; a cue would confound it).
  (c) "Babet (1)": delete only; drop the "Edges 0" row when 0. (d) Empty Size list: fix in
  compact-mantine `ComboInput` (hide the chevron with no options; SetLine passes `options={[]}`,
  verified), not "list what can be bound" (a new feature). (e) Focus: accept the a11y root cause
  (compact-mantine `focusRing: "never"` plus opt-in classes) and fix the ring in the foundation
  CSS; after a Style "+" pick, move focus to the new line (the trigger is gone, so "return to
  trigger" cannot work). (f) "No crossings": the inline sentence under Method replaces the
  notice, not adds one; the app knows which method failed, so no element code is needed unless a
  test shows the error carries nothing. (g) Legend over node: trace owner before building; not on
  a failing task; do not bundle. (h) "Influence" printed from the element's English `run.label`
  is an element-neutrality defect to trace, not a round 2 rename. (i) Morgan's screen-reader
  sessions are blocked on tooling, not owed re-runs. (j) Reconcile scores.md and insights.md
  before anyone quotes a bar.

- 2026-10-07 -- Round 2 critique (my positions): see Top of mind 1-7. Also: do not move the key
  (Pazzi/Blacheville overlap is one seeded event per dataset), no export selection option (the
  preview shows what is exported), no label-count rework (the count is true), no "saved in this
  browser" warning (start screen already says it), no run renames. 4x export: render at the
  target size in the element; if that cannot land, remove the 4x/"For print" choice rather than
  ship a false one. Force re-apply: no fix without a traced cause. Announcements (load, run
  finished) are app words from element events and add no visible text -- allowed, low priority.
  Evidence read: insights.md, scores.md, repro r2-s07/run-menu/23, r2-s56/run/07, r2-s19/run1/04,
  r2-s40/run/13, r2-s14/run/06; methods.ts:83; NodeValues.tsx:140-148; frame/menus.tsx MainMenu.

- 2026-10-07 -- Round 3 proposals attack (my positions). Code read: legend.ts:20-40,730-770;
  LegendCard.tsx:69-76 (#867, #912); Mantine Menu.mjs:129; StyleTab.tsx:355; methods.ts:83;
  Run.ts:677 fields; catalog/types.ts:403; ElementHost.tsx:11; LabelSection.tsx:137. Changes to my
  round 2 positions: (a) accept the declutter switch -- my rejection was of a no-effect control,
  this one has an effect and is pure element config; (b) accept the run rename -- the trace I
  required is done. Held: Size "+" opens picker; no key move; no seed change; Force/4x trace only.
  New: the stale-key and group-layout fixes need no new public API; the per-caller
  returnFocus={false} fix breaks Escape.

- 2026-10-07 -- Round 2 closed. Decided (decisions.md): 12 changes, defect fixes only, each in
  the owning package -- menu focus in compact-mantine; key omits fully covered block and group
  layouts read optionsFor "partition" values (element, no new exported name); 2D Fit and canvas
  name/ring (element); load/run announced (app words); Size "+" opens picker; DataRow chevron;
  run named by method; "Show all labels" writes declutter; tool hears active option. Not changed:
  Force re-apply and 4x (trace first, element fix later -- not removing 4x, which hides the
  defect, reversing my earlier "remove if it cannot land"), key placement and seed (owner),
  "Javert and his 17", zoom hint. My positions were all adopted except 4x removal. Reason for the
  reversal: removing an app choice to hide an element defect is the workaround pattern.

## Tried: worked / did not work

- 2026-10-06 -- Round 1 close-out: holding the Degree cue and my Summary-names idea back in favor of
  routing the existing command was accepted into decisions.md (change 3). Worked as a removal-first
  argument. The skeptic pass dropped both bar 5 items (each count was true) -- taught: a "wrong
  count" finding needs the count checked against live state before it is filed.

- 2026-10-07 -- Round 2 result of my round 1 position "route the existing command, no new list, no
  Degree cue": worked. T12 failed in round 1, passed 8 of 8 in round 2 (0.9x path), through the
  Degree row that runs the same command. Taught: one command with one visible door beat adding a
  list. The remaining cost is a hit-area bug (chevron outside the button), not the design.
- 2026-09-06 -- v1's suggestion strip, "Try it" boxes, auto-generated summaries and novice text:
  did not work. The owner called it text-heavy and cluttered; later the "muddled mess of v1".
  Taught: help-for-beginners text is the clutter.
- 2026-09-28 -- Copying Figma literally (top-right Export, avatar): did not work. Owner: follow our
  own ontology where Figma does not fit. Taught: divergence needs a graph fact, but so does
  convergence when Figma's placement serves a different object model.
- 2026-09-29 -- Round 5 ran on mocks where round 4's decisions were not drawn: wasted round,
  re-measured the old design. Taught: decisions must be drawn before a round runs (preflight).
- 2026-09-29 -- Round 6 ran with a failed gate and a check that inspected 0 pages and passed:
  inflated ease (+0.65), contaminated undo comparison (Esc bug reset four sessions). Taught: a check
  that checks nothing must fail; report the weakest-passing bar with its caveat or not at all.
- 2026-09-29 -- Removing the Weight role and "Change..." from the load: the clearest round 6 result
  (it took 27 wrong clicks, 15 of 16 on one prompt). Worked as a removal -- but the owner later
  reversed the substance (weight is defined at load, 2026-09-30). Taught: a removal that wins a
  study can still lose to the owner's model; record both.
- 2026-10-02 -- Round 8: one File list from the main menu and the project-name menu restored after
  the tree task fell to 19% without it; then 90% direct. Worked. Taught: deleting a conventional
  door is not always simplification.
- 2026-10-02 -- Round 8 label "+" with "Show labels" first: did not work (12 picked it, it changed
  nothing, 10 stopped there believing names were on). Taught: a control whose words match the task
  but whose effect is invisible is a severity-4 trap.
- 2026-10-02 -- Neighborhood that reported "Javert and 17 neighbors" without names: 0 of 12.
  Taught: a count with no names behind it does not answer "who".
- 2026-10-02 -- Round 8 pattern: first clicks 87%, tree correctness 99.7%, yet tasks failed one step
  later. Taught: the places are mostly right; failures are in what the control does next, so test
  end states, not first clicks.
- 2026-10-02 -- Tiering the tasks (60% of sessions on tier 1, first-time personas first): worked as
  focus; showed tier 2 at 96% while tier 1 was 75%. Taught: report successes too (owner asked).

- 2026-10-06 -- Round 1 on the real app: first real-build study. Worked: no false "done" (0 of
  29), loading, ranking, groups, save/reopen, legend in exported picture. Did not work: the study
  runner (40-minute agent limit counted the browser queue; 35 first runs and 7 re-runs void).
  Taught: the runner is part of the build under test; preflight it like the app.

- 2026-10-07 -- Re-pilots of round 3 changes on b7590f8de: worked. Picker-first Size cut a step
  (T15 one step fewer, T9 8 steps), run names read "PageRank" everywhere (T7, T16), group layouts
  enable after Louvain (T11), every name reachable (T10). Taught: removal-or-reuse fixes (reuse
  Label's pattern, reuse element declutter, reuse optionsFor) landed cleanly; none added a door.
  Not yet seen: whether participants find them unprompted -- that is round 3's job.
- 2026-10-07 -- Pilots surfaced what the defects were hiding: perspective size distortion, element
  English refusals, three names for one grouping, soft names in export. Taught: once the controls
  work, the next layer of failure is perception and words. Expect it to dominate round 3.

## Thinking

- (2026-10-06) The biggest risk for the next round is not a design flaw but repeating the round 7-8
  failure mode on a real build: scoring tasks that a build defect decided. Before sessions run, the
  chained walk (open sample, run, size, label line, export with legend, save, reopen) must pass on
  the exact commit under test, and #133 (legend in image) must be either fixed or the export tasks
  graded on everything but the legend.
- (2026-10-06) Where clutter will creep back in on the real app: the inspector's Values tab for a
  run (histogram, Top 10, Made with, state bar), the Style tab sections (Fill, Shape, Effects,
  Label, Tooltip) for a first-timer who wants one thing, the Analyze popover (filter box, Recent,
  headings, options, cost line, Run), and the Data page's role selects. My test for each: count the
  words at rest, and ask what a first-time user would lose if the item were gone.
- (2026-10-06) The temptation after a real-app failure will be to add a hint, a notice or a second
  route. Prefer: rename the one control, move the one control, or make the one control's effect
  visible. Only add when a removal or rename has been tried and failed on two domains.
- (2026-10-06) Analyze headings failed the tree test (betweenness 29% direct, "Measure the graph"
  paused 16 of 21) but the click-through did not fail there. Question-shaped headings would be a
  restructure; run the cheap A/B first. Meanwhile, the filter box with aliases ("brokers" finds
  Betweenness) is the everyone-aid that already exists.
- (2026-10-06) "Attribute" as the word (5 of 12 said it is not their word) is a re-test, not a
  rename on one study's say-so; "field" and "column" were already rejected outside the table.
- (2026-10-06) Local iteration is allowed and wanted (owner, 2026-10-06), but it multiplies the
  workaround risk: a quick app patch that computes neighbors, names or counts is exactly the
  forbidden pattern. Every local fix I review gets one question: would a third-party consumer of
  the element need this too? If yes, it belongs in the element, even locally.
- (2026-10-06) Simulated participants are one model wearing many hats; they share blind spots and
  are generous on ease. Mean ease 5.5 was never met in any round. I would rather see the round
  report task-level end-state success with and without build defects than chase the ease mean.
- (2026-10-06) The usage-data card ("the author ... and his Claude Code sessions") reads to 6 of 6
  as a second recipient and drove refusals. The words are the owner's; the tightened draft goes to
  him. Not a studio rewrite.

## Sources

- `design/ui/studio/digests/decisions.md`, `framework.md`, `owner-voice.md`, `study-rounds.md`,
  `tier1.md` (studio worktree, 2026-10-06)
- `.worktrees/feat-tier1-real-app/design/ui/tier1-real-app/tier1-design.md` (sections 1, 9,
  "Adversarial review changes")
- `design/ui/framework/principles.md`, `research/graphty-today.md` (v1 app concepts, insights strip)
- `CLAUDE.md` (Architectural Principles; presentation neutrality; Algorithm Styles)
- `.claudehistory/3a19ea55-f3cc-4fc0-b85f-842243f52536/subagents/workflows/wf_6818e34f-76d/`
  agent-ac9e91d557cc3b736.jsonl, agent-aa30730227c88a984.jsonl (Red Team, round 4 triage,
  2026-09-29)
- same folder `wf_6959c5f6-35c/` agent-ae69d664fbc74a440.jsonl, agent-ac0403d0aa41761eb.jsonl,
  agent-a91113b54f3db043f.jsonl (Red Team, round 6 triage, 2026-09-29)
- same folder `wf_93e7ffbb-6da/` agent-a6298d323066f9d83.jsonl, agent-ac66deacd37fef795.jsonl,
  agent-a733e3a4d8bf28eb5.jsonl (Red Team, round 8 triage, 2026-10-03)
- `.claudehistory/3a19ea55-f3cc-4fc0-b85f-842243f52536.jsonl`, owner messages 2026-09-25 to
  2026-10-06 (via `design/ui/studio/tmp/owner-all.jsonl`)
- Extraction scripts: `design/ui/studio/tmp/redteam/scan.py`, `group.py`, `triage.py`
