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

1. (2026-10-11) Round 5 gate: the refusal now lives in `real.mjs --start` (no "Gate evidence" in
   plan.md = exit 1) and the runner takes the machine-wide browser slot. Before round 5 I check
   the self-test refusal on a planted fault and the owed r4-s05b/s20b/s28b myself; never assume.
2. (2026-10-11) Briefings: data files by name and kind only; leak check reads briefings too.
   --shift/--ctrl/--alt-click stay, listed neutrally (removing them would measure the tool).
3. (2026-10-11) Bare number "10": suggestBackticks applies the selector's own acceptance test.
   No app count guard. Pattern to hunt: one question answered by two different tests.
4. (2026-10-11) In-range number: optional FindResult.atLeast rows from atLeastOf. Credit it by
   "10" reaching the right stops without a refusal, not by the prompt's "or more" echo.
5. (2026-10-11) rulePath export was added over my "no new export": right, it deletes the app's
   copy of element logic. Watch that it is the only change to that row.
6. (2026-10-11) Off filter step: leave handler returns early on an unchanged rule; nothing else.
7. (2026-10-11) Table under a filter: scope "visible", tab "12 of 41 edges", re-render on
   visibility. Watch the export mismatch (#875/#820): export words must say "every record".
8. (2026-10-11) Bar 9 (b): diff the word lists first; scope words stay and the bar fails
   honestly. Never re-set a limit from data; only a proven measurement fault re-measures.
9. (2026-10-11) Single-source claims (unknown column, Escape on swatch, label taking a tie click,
   New project Discard crash) are scripted before any fix; not shown = closed.
10. Shift-click adds, toolbar Filters door, second path replaces silently: held 7 of 7. Do not
    touch. Rejected stays rejected without new evidence (notices, second homes, Hops grouping).
11. Drawn-name overlap is the element's label placement, owner list; bar 10 fails on it honestly.
    No app font, seed, offset or names-off setup.
12. Bare numbers in rules, backticks, edge width units: breaking, owner list. No opt-in flag.
13. Rounds are one model playing everyone: a failure is strong, a pass weak; briefings and
    histories prime -- discount any "unprompted" count. Name the mechanism.
14. Fix by removing, not adding. One change per problem; words at rest never rise.

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

- 2026-10-08 to 2026-10-09 (summarized 2026-10-10) -- Tier 2 criteria review and round 1-2
  attacks. Positions taken and mostly adopted: carry-forward and "not scored = not passed" rules;
  a second shorter instance of each core job; setups carry history's work; a screenshot-audit bar;
  words budgets for the edge and path inspectors and the Data place; pre-registered "select where"
  rule; IA's start-screen Open through the Data page; hint words gated on the element's rule check;
  "..." header menu with Replace; layer named by its rule; duplicate count from the element with one
  Replace door; Escape keeps focus; checkbox hit area in compact-mantine. Rejected: second homes
  (column "Higher means", "New from data..."), app regex sniffing of rule operators, app palette or
  2x width before the units script, column rows in plain find, opt-in bareNumbers flag, Hops
  grouping before an element depth fact. Reason throughout: one attributable change per problem,
  element first, measurement fixed before defects.

- 2026-10-10 -- Tier 2 round 2 closed (decisions.md). Adopted my positions: briefing-only tool fix
  first and rated severity 4; pilot-routed dry run with fix-before-freeze; find-box three-part path;
  duplicate count from the element with one Replace door; layer named by its rule; focus fixes;
  checkbox hit area in compact-mantine; aliases for Shortest path; re-announce; no palette or 2x
  width in the app; no column rows; no bareNumbers flag; no Hops grouping before a depth fact.
  Went further than me: the leak fix moves session folders out of the studio tree and scans
  transcripts (a briefing check alone would not have stopped r2-s05 reading upward -- right, I
  under-scoped it). Width resolved without the units change: highlightStyle() exposes the look
  highlight() already paints (black, 3x width). Units test showed width W draws 10W/d px, so 8 is
  under 2 px on a framed graph -- my "element units question first" held. Also decided: weighted
  path row shows "<column> <total>"; "Filter to neighbors" is a plain command, off only on the
  step checkbox; "PageRank, full graph" only under a filter; "Components 1" held for attribution.

- 2026-10-10 to 2026-10-11 -- Tier 2 round 3 attack and close (summarized 2026-10-11). Adopted
  with no reversals: node Shift-click through the session path, T24 outcome prompt, find-row
  prefix dropped plus element at-least target, one Filters toolbar icon, scripts before
  one-specialist fixes. Rejected: notices, second homes, stacked variants, Ctrl/Meta first,
  Hops subheadings. Director went further: tool fix as a severity 4 hard start gate (correct,
  but it was not enforced -- see round 4).

- 2026-10-11 -- Tier 2 round 4 proposals attack. Code read on the studio branch:
  predicate.ts suggestBackticks (checks only parseExpression, so a lone literal passes),
  query.ts atLeastOf (quotePath, so "data.minutes"; commit 9b69ca650 is in no released tag),
  TableDock.tsx:349 (scope "graph"; no visibility re-render; Export comment cites #875/#820),
  Filters.tsx 444/501 (unchanged requires on===true; leave writes on:true). Positions: element
  fix for the refused suggestion, rejecting the app count guard three roles proposed (a guard
  around an element defect) and the visual designer's "only when it parses" (already true, misses
  the cause); one FindResult field for in-range "or more", one name; reject Values-first reorder
  (stacked); atLeastOf rule text is team's call, not breaking (visual designer wrong); table
  "visible" plus re-render, reject the notice line; fix the off-step leave guard now (code
  cause is solid), reject the "stays off" plus new announcement; bar 9 (b) cut nothing before a
  bars.json diff; hold the glyph rule, Escape tracing, and every one-specialist sev 3.

- 2026-10-11 -- Tier 2 round 4 closed (decisions.md). Adopted: element fix for the refused
  suggestion (no app guard); one FindResult.atLeast field (my single name over "ranges"); no
  Values-first reorder; atLeastOf text is the team's call; table scope "visible" with no notice
  line; off-step leave guard only; bar 9 (b) diff before any cut; one-source claims scripted
  first. Overruled me, rightly: a new `rulePath` export, because the app's `columnText` copies
  element logic and only an export lets it be deleted. Added: the gate refusal moves into
  `--start` itself (survives continuation scripts and hand starts), slot taken by the runner,
  briefings stripped of file contents (the second leak of the "rule without a refusing gate"
  kind), T17 histories stop naming the toolbar, Cancel focus to "+", New project Discard crash
  scripted first. Reason throughout: study fixed first, one change per problem, owning package.

## Tried: worked / did not work

- 2026-09-06 to 2026-10-07 (summarized 2026-10-11) -- Worked: routing the existing neighbors
  command instead of a new list (T12 0 of 8 -> 8 of 8); removal-or-reuse fixes on tier 1 re-pilots
  (picker-first Size, run names, group layouts). Did not work: v1 help text and suggestion strip;
  copying Figma literally; rounds on undrawn decisions or checks that inspected 0 pages; the
  round 1 study runner (agent limit voided 35 runs). Taught: test end states, not first clicks;
  a wrong-count finding needs live state checked first; the runner is part of the build under
  test; once controls work, the next failures are perception and words.

- 2026-10-09 -- Tier 2 rounds 1-2 dry runs (summarized 2026-10-11): success-path and detour
  walks worked for the walked routes, but not as gates: off-route defects, unscripted bars, the
  tool itself and participant isolation slipped through. Taught: a dry run walks detours and the
  harness, and the freeze waits for the fix.

- 2026-10-10 -- Round 2 close: my "units question first" on width worked (a units test settled it
  before any app value change; the app reuses the element's highlight look instead). My leak fix
  was too narrow (briefing refusal only); the director's out-of-tree folders plus transcript scan
  is the real fix. Taught: a leak fix must block the read path, not just supply the right file.

- 2026-10-10 -- Round 3 results of my round 2 positions: worked. Find box three-part path T22 8
  of 8 with no dead ends; Replace in "..." 8 of 8; weight at load 8 of 8 (led by the prompt, so
  weak); one Replace door, no clutter. Did not work: my "check that checks nothing fails" rule was
  written but not enforced -- the leak check read 0 logs in every session and still passed, and the
  prompt pilots were skipped, which let T24's prompt and key disagree. Taught: a process rule
  without a refusing gate in the runner is a wish.

- 2026-10-11 -- Round 3 close of my proposal positions: worked as argument -- every adopt and
  reject was carried into decisions.md unchanged. Skeptics dropped bar 6 and weakened the find
  box, second-path and "found by a guess" claims, matching my "pass weak, one voice" stance. Not
  yet shown: whether any of it works for participants; that is round 4.

- 2026-10-11 -- Round 4 results of my round 3 positions: worked for participants -- Shift-click
  (T24 2 of 4 -> 7 of 7), toolbar Filters (7 of 7 first door, 0 wrong turns), find "or more" row
  taken when the number is a value. Did not work: my "round 4 does not start until the runner
  refuses" -- it started anyway, three sessions were lost to browser slots, and the briefings
  leaked file contents. Taught: a rule in my notes and in decisions.md is still not a gate; the
  director must show the refusal before launch, and I must check for it, not assume it.

- 2026-10-11 -- Round 4 close of my proposal positions: worked as argument -- all carried
  except "no new export", which lost on a better reason (deleting an app copy beats API
  minimalism). Taught: "no new API" is not a value in itself; the test is whether the export
  removes forbidden app logic.

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

- (2026-10-10) Round 3 risk: three find-box parts credited together cannot tell which helped; that
  is accepted because they are one path, but if T22 still stalls, do not add "Select where" and
  more find hints at once. Second risk: the reworded T22/T24 prompts change the task, so any step
  comparison with round 2 is invalid; watch the scores for one.

- (2026-10-10) Eight designers converged on the same five fixes this round; the risk moved from
  wrong fixes to stacked fixes. Four variants of the find row would land together and nothing
  could say which helped. Pick one variant per problem and log the others as held.

- (2026-10-11) Round 3's strongest finding was about the study, not the app: a prompt that
  avoids the control word lets a participant reach a different valid outcome. Any reworded prompt
  must be piloted and graded by the key before the round; a prompt change without a pilot is the
  same fault waiting.
- (2026-10-11) Round 3 found 1 real app failure in 56 sessions. The returns are shrinking on
  severity 2 fixes; the next round's value is mostly a clean measurement. Resist filling round 4
  with polish to look productive.

- (2026-10-11) Round 4's two real defects were both mismatches between two checks of one thing
  (suggestion parse vs selector acceptance; editor "unchanged" vs leave save). The pattern to
  hunt next: anywhere the app or element answers one question with two different tests.
- (2026-10-11) Making the table follow the filter fixes one mismatch and opens another (table
  Export still writes all records). Fixes that align one view must list every other view of the
  same state before landing.

- (2026-10-11) Round 5 is mostly a measurement round: three study fixes, two element fixes,
  small app fixes. If round 5 still shows no gate evidence, the fault is the director's launch
  path, not the runner; raise it as severity 4 before reading any score.
- (2026-10-11) Priming has three sources now (briefing file table, persona habits, histories).
  Every "noticed unprompted" claim must say which source it was checked against.

## Sources

- `design/ui/studio/tier2/rounds/round-4/decisions.md`, `insights.md` (closed, 2026-10-11)
- `design/ui/studio/tier2/rounds/round-4/insights.md`, `scores.md`, the eight role critiques;
  source files named in the 2026-10-11 decision entry (2026-10-11)
- `design/ui/studio/tier2/rounds/round-3/insights.md`, `decisions.md` (closed, 2026-10-11)
- `design/ui/studio/tier2/rounds/round-3/insights.md`, `scores.md`, the eight role critiques (2026-10-10)

- `design/ui/studio/tier2/rounds/round-2/decisions.md`, `insights.md` (2026-10-10)

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
