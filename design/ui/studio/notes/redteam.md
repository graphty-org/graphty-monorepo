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

1. (2026-10-09) A scripted dry run only proves the routes someone thought of. Rounds 1 and 2 both
   lost most build faults to the one detour nobody listed (round 2: styling a selection, 12 of
   ~30 faults). Before round 3: two or three throwaway pilot sessions on the frozen build, then
   script whatever routes they actually took, plus every control on each task screen by keyboard.
2. (2026-10-09) The study tool is still the largest fault: 13 of 16 sessions read tasks.md. Round
   3 does not launch until real.mjs refuses a folder without its own briefing and a planted-leak
   test proves it. Round 2 passes for new routes are not credited.
3. (2026-10-09) A preflight that claims a script exists must run it (bar 10's clipped-text and
   raw-string scripts were claimed and absent). Same rule as round 6: a check that checks nothing
   fails.
4. (2026-10-09) "Width 8 draws a hairline" is an element units question first: EdgeMesh says
   edge.width is screen pixels, yet 8 draws thin. Script it before any app starting-value change;
   an app that doubles a width to make it visible is a workaround.
5. (2026-10-09) Find box: one change per round or the result cannot be attributed. Round 3 gets:
   the "=" bug in the backtick correction, Enter runs the element's own correction, and the
   existing example line after a miss. Not column rows in plain mode, not "Select where".
6. (2026-10-09) Bare numbers in rules: refused-to-accepted changes what an existing call does --
   owner list. Not an opt-in `bareNumbers` flag: a flag for a capability every consumer wants is a
   choice nobody would set differently.
7. (2026-10-09) Duplicate-tie Add: element reports the duplicate count (additive); the app shows
   one line and a Replace door only when the count is above 0. No file-name matching in the app.
8. Round 2 watch, still held: each change adds at most one door; words at rest only fall.
9. (2026-10-09) Drawn-name overlap is an element issue left failing on purpose; no app font-shrink
   or seed.
10. (2026-10-09) Expert findings confirm only by a script or a second specialist on the capture;
    a withdrawn finding must be withdrawn everywhere it is cited (scores.md bars 8 and 10).
11. Rounds are one model playing every participant: a failure is strong, a pass weak, a scripted
    repro or code cause solid. Never blame load: name the mechanism.
12. (2026-10-06) Fix by removing, not adding. One door per job; reuse the "..." header menu.
13. (2026-10-06) Overfitting guard: task words never echo a fix's screen words ("stand out").
14. (2026-10-06) Graph logic and codes in the element, words in the app; check existing API first.
15. (2026-10-08) Budget words where tier 2 grows: inspector, Data place, neighbor list.

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

- 2026-09-26 to 2026-10-03 (summarized 2026-10-08) -- Owner: personas validate, never generate
  features; no wizards, suggestion cards or first-run UI; a run paints when it finishes; the app
  adds no look of its own; stop mocking and build tier 1; the element is presentation-neutral.
  Studio, on my positions: overfitting rule (task words never reuse a fix's words; round 6 money
  task 2.00 -> 5.00 after screens named money); fold style files into recipes; delete "Undo back
  to here" (selection is not an undo step); rejected invented features (Keep for referral, tie
  stepper, per-seed counts, Print "no change" band, per-column statistics, rewriting note
  authors); palette suggestion and partition matching go to the element backlog; never rescore a
  missed bar after seeing data; round 8: fix mock defects first, then re-score; neighbors one
  surface, not three; "Show labels" kept only when a lower row sets a label; sample opens with
  nothing run; SVG not drawn rather than drawn disabled; facts a browser cannot know removed.
  Deferred as not tier 1: chip removal, "Use as edge weight...", notes stamped with data version,
  "Rerun all", leading-zero key matching, a value-and-count Select where builder.

- 2026-10-06 -- Tier 1 rounds 1-2 (summarized 2026-10-09): route the existing neighbors command,
  no second list, no Degree cue (worked: T12 0 of 8 -> 8 of 8); delete rather than reword; empty
  Size list fixed in compact-mantine ComboInput; focus ring fixed in foundation CSS; inline
  sentence replaces a notice; element English is a neutrality defect to trace.

- 2026-10-07 -- Tier 1 rounds 2-3 (summarized 2026-10-09): defect fixes only, each in its
  owning package (menu focus in compact-mantine; key and 2D Fit in the element; Size "+" opens
  picker; run named by method; "Show all labels" writes declutter). Not changed: key placement,
  seed, Force re-apply and 4x (trace first). Reversed my "remove 4x": removing an app choice to
  hide an element defect is the workaround pattern.

- 2026-10-08 -- Tier 2 criteria review (my positions, returned to the studio): (1) define the
  carry-forward rule for "all bars in one round", T4's 3-per-half floor, and "not scored = not
  passed"; (2) a second, shorter instance of the job in each core-four session, target steps <=
  1.25x the success path and 0 wrong turns, reported; (3) setups carry the history's work (a rank
  run sized, names on) so bar 2 has something to lose; (4) new bar: 0 confirmed severity 3-4
  screenshot-audit findings, confirmed by one full-size capture, at 1440x900 and 1280x800 with
  long-name data, auditors blind to the pilot's watch items, rejected-synonym check scripted from
  the preflight text dump; (5) words budget for the edge inspector, the path run inspector and
  the Data place with a filter on (<= 40 per inspector, <= 50 at rest with the chip); (6) spend
  the 2 spare slots on tier 1 T12, because tier 2 added Hops and Follow to the list that won T12;
  (7) stall rule on core-four success counts and closed severity 3-4 findings, not ease; (8)
  pre-register T22's "select where" dialog rule (find-box words fixed first; the dialog only if
  T22 fails both halves and 3+ sessions looked in one named place). Evidence: criteria.md, tasks.md
  setups, rounds/tier-2/setups/*.txt (friends.txt and florentine.txt open a file and nothing
  else), roster.md histories, pilot/final.md watch items, answers.md T18 "Shortest route" layer
  names, launch-prompt.md walkthrough and audit paragraph, tier2-design.md section 2 ("Never
  route").

- 2026-10-09 -- Tier 2 round 1 proposals attack (my positions). Code read: project/actions.ts
  openInSession/openProjectFile (fresh data file loads with mode "replace", no Data page);
  style/row.ts writeLine default EVERYTHING_LAYER, callers StyleTab.tsx:331, SetLine.tsx:112,
  LabelSection.tsx; graphty-element Node.ts createOverlaySource; FindBox.tsx no-match branch;
  ProjectDialogs.tsx:76 (Back to start already asks over unsaved changes); insights.md 45-60.
  Adopt: IA's start-screen Open through the Data page (root cause of T20); hint words in find box
  gated on the element's rule check; source inspector gets the standard "..." header menu with
  Replace and Edit source; ", out of date" on key title; Total <column>; Replace page button
  "Replace"; focus returns after Add/Delete step and Escape; status line name and left-out row;
  writeLine default removed; halo fixed in the element. Reject: column "Higher means" and "New
  from data..." (second homes), "Select where..." menu and live rule row now (pre-registration),
  regex sniffing of operators in the app, four stale marks, visible buttons in the inspector,
  Back-to-start undo (the question already exists). Process: round 2 must not launch until the
  missing preflight scripts exist, the detours are scripted, and the browser overrun mechanism is
  named. Reason: the owner wants studies to learn what users need, not find UX defects.

- 2026-10-09 -- Tier 2 round 1 closed (decisions.md). Adopted my positions on T20, T22, writeLine,
  halo, one stale mark, "..." menu. Also decided: study-tool fixes and missing bar scripts rated
  severity 4 and ranked first; drawn-name overlap and compact-mantine Toast/segment defects left
  for later rounds to keep round 2 attributable; nothing new for the owner. Reason: fix the
  measurement first, then reproduced defects, then one door per confirmed problem.

- 2026-10-09 -- Tier 2 round 2 proposals attack (my positions). Code read: style/row.ts
  startingValue (takes descriptor.default, so a new line equals what is drawn); EdgeMesh.ts
  560-572 (width documented as screen pixels, drawn /40); FindBox.tsx backtickSuggestion and
  ruleRefusalWords (suggestion shown as text, Enter does nothing), :415 blur(); StyleTab.tsx
  selectionName. Adopt: briefing-only tool fix first; widen the dry run with pilot-found detours;
  "=" in the correction; Enter runs the element's correction; example line after a miss; layer
  named by its rule; duplicate count from the element with one Replace door; Escape keeps focus;
  Follow arrow focus; checkbox hit area in compact-mantine; status line re-announce; "PageRank,
  full graph"; search aliases. Reject: palette color or 2x width as an app starting value before
  the units script (workaround risk; rewording the "app never invents a value" comment to allow
  it is the tell); column rows in plain find mode (clutter in the hit list, and stacks three find
  changes); file-name matching for Replace; opt-in bareNumbers flag; Hops grouping before the
  element has a depth fact. Reason: one attributable change per problem, element first.

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

- 2026-10-09 -- Tier 2 round 1 dry run on success paths only: did not work as a gate. No session
  met a broken control on the walked routes, but participants met off-route defects and four bars
  had no script. Taught: a dry run must walk detours and prove every bar's script runs.

- 2026-10-09 -- Round 1 results after skeptics: 52 of 55 valid sessions succeeded, 0 false done,
  0 silent commits, every session.log empty. Bars 2, 7, 8, 9 unscored; 1, 5, 10, 11 fail. Worked:
  the four-build success-path dry run (no broken control on walked routes). Did not work: no
  detour or keyboard walk, no tool dry run. Taught: the dry run must cover the harness too.

- 2026-10-09 -- Round 2 dry run (four runs, 30 detour walks, pointer and keyboard): worked for
  the walked routes (0 grades decided by a build fault, no session error). Did not work for the
  unlisted detour (selection styling) or for participant isolation (tasks.md read). The keyboard
  walk found the Escape fault and handed it on instead of fixing it. Taught: a dry run finds,
  the freeze must wait for the fix.

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

- (2026-10-08) A simulated returning user is a fresh agent with a briefing. Its first moves on
  tier 2 features are a newcomer's moves inside a known shell. The only honest way to see repeat
  cost inside one session is to have it do the job twice. Real weekly users remain the confirmation.
- (2026-10-08) Watch items in a pilot are the polite name for defects nobody is required to fix.
  If the audit has no bar, truncation and wrong words will ride through all three rounds again.

- (2026-10-09) Each round's dry run is built from the previous round's detours, so it always
  trails by one round. Pilots from fresh participants find the next round's detours cheaply; the
  scripted list should be their output, not the designers' guess.

## Sources

- `design/ui/studio/tier2/rounds/round-2/insights.md`, `scores.md`, `preflight.md`, the eight
  role proposals (2026-10-09)
- `design/ui/studio/tier2/rounds/round-1/insights.md`, the eight role proposals (2026-10-09)

- `design/ui/studio/digests/decisions.md`, `framework.md`, `owner-voice.md`, `study-rounds.md`,
  `tier1.md` (studio worktree, 2026-10-06)
- `.worktrees/feat-tier1-real-app/design/ui/tier1-real-app/tier1-design.md` (sections 1, 9,
  "Adversarial review changes")
- `design/ui/framework/principles.md`, `research/graphty-today.md` (v1 app concepts, insights strip)
- `CLAUDE.md` (Architectural Principles; presentation neutrality; Algorithm Styles)
- `design/ui/studio/tier2/` (criteria, tasks, answers, roster, pilot/final.md),
  `next-steps/tier2-design.md`, `report.md`, `rounds/tier-2/setups/` (2026-10-08)
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
