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

1. (2026-10-09) A dry run walks the answer key AND each task's commonest detours, and the
   preflight scripts a bar needs exist before launch. Tier 2 round 1 walked only success paths
   and left bars 2, 7, 8, 9 unscoreable; participants then found off-route defects a script walk
   would have found (Edges color to Everything, halo tint, focus drops). Fix those before round 2.
2. (2026-10-09) T20's cause is one branch: Open from the start screen loads a data file straight
   (`openProjectFile` -> `openInSession` with `fresh`, project/actions.ts), skipping the Data page
   that asks "Higher means". Route it through the Data page. No column "Higher means", no "New
   from data...", no "Set meaning" verb: each is a second home for a load-time fact.
3. (2026-10-09) T22: hint words first, as pre-registered. The app must not sniff `<>=`; show the
   corrected rule only when "=" + text passes the element's own rule check. "Select where..." on
   the column waits until the hint fails (pre-registered rule).
4. (2026-10-09) Edges color to Everything: cause is writeLine's default `fresh = EVERYTHING_LAYER`
   (style/row.ts), reached from StyleTab and SetLine.tsx:112. Fix the shared default, not one
   caller; hide a side the row has no layer for.
5. (2026-10-09) Selection halo tint is an element rendering defect with a traced mechanism
   (Node.ts createOverlaySource: 40% sphere, backFaceCulling false). Fix in the element, not
   "possibly by design".
6. (2026-10-09) One mark per state: stale run = ", out of date" on the key title, same words as
   the run list. Not warning color + dim Top 10 + colored clock + dimmed range.
7. (2026-10-08) Tier 2 setups are bare files; setups must carry the history's work (bar 2).
8. (2026-10-08) Push a second, shorter instance of the same job inside core-four sessions.
9. (2026-10-08) Screenshot-audit findings need a bar, or they ride as "watch items".
10. Rounds are one model playing every participant: a failure is strong, a pass weak, a scripted
    repro or code cause solid. Never blame load: name the mechanism (the 4-browser cap is per
    command, not per session).
11. (2026-10-06) Fix by removing, not adding. One door per job; reuse the app's own pattern
    (the "..." header menu every other inspector has) before adding buttons.
12. (2026-10-06) Overfitting guard: task words never echo a fix's screen words.
13. (2026-10-06) Graph logic in the element, words in the app; check existing element API first.
14. (2026-10-07) Element English keeps leaking; codes from the element, words in the app.
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

## Sources

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
