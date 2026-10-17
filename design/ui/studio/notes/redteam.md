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

- (2026-10-17, second tier 3 criteria review) Fixed since the first review: bar 1 no longer
  passes an unjudged task; bar 4 counts never; T49 needs the change made; Sam takes a file and a
  folder. Still open, raised again: T47's route bar counts "one by one", and T48 (core) has no
  route bar at all, so both core bulk tasks pass with the bulk edit never used (score.mjs
  ROUTE_TASKS = T47 only, `through` = not "around").
- (2026-10-17) Kept-on-purpose words silence wording.mjs forever (`ownKept`, `everywhere` skip
  them). A later fix that puts a prompt word on screen ("missing", "connected", "back") is never
  flagged. Keep lines must be re-checked against each build's vocabulary.
- (2026-10-17) T37 keeps "connected" saying the run is named Degree; the Analyze list's card is
  "Most connected" (AnalyzePanel.tsx SUGGESTED_CARDS). A false keep reason is an echo.
- (2026-10-17) vocabulary.json holds words at rest and control names only; info-circle text is
  missed. Louvain's sentence "Cluster nodes that interact more with each other" is echoed by T46 B,
  T47 B, T48 A/B ("clusters ... each other"); T48 has no half that varies the noun.
- (2026-10-17) Newcomer share per half: T40 B (core) is Maren, Dev, Alex -- 2 of 3 know another
  graph tool; T44 A is Alex alone. Bar 1 counts them like newcomers.
- (2026-10-17) Bar 4 mixes units: Sam's `empty --keys` T39 A counts Tab presses against a 6-click
  key (score.mjs `start.startsWith("empty")`). Bar 4 also takes any single new color, not the
  asked one.
- (2026-10-17) Expert walkthroughs and the screenshot audit feed only bar 5 (severity 3-4). "Any
  severity must not rise" has no bar and no consequence; the audit has no checklist; bars.mjs
  --scheme is tier 1 only, so dark mode axe is the expert's word alone.
- (2026-10-17) Numbering mismatch: bars.mjs calls axe bar 8, words bar 9, cut text bar 10; the
  criteria call them 6 and 8 and cite "bars.mjs bar 10". A grader reads "bar 9 FAILS" and finds no
  bar 9.
- (2026-10-17) Accepted by the Director, not re-raised without new evidence: T50 A guessable from
  "Mlle" (reported per half); bar 8 screens over budget (72, 71) reported as severity 2, not gated.
- (2026-10-16) A "both" row's parts share one selector today; per-tab pickers split them and drop
  "edges between / touching" unless it becomes an edge card. Cards must replace Data > Filters'
  conditions too, or there are two condition editors. Not expressible by AND cards: OR across
  fields, exclude, neighbors of. Watch: "edges inside each community", "X or Y", a folder card
  read as a folder filter.
- (2026-10-16) Bulk field whose layers differ draws BoundValue with the purple Layer token (one
  component; SpreadValues deleted). Still to attack: "Update <run> layer" on a selected run folder
  adds a second folder of the same name; a new layer added with a folder selected lands in it.
- (2026-10-13) Unset (minus) and cover ("Hide label from") stay two controls; no split parent; the
  dimmed painted-over value collides with dimmed-locked. Kind-change memory is hidden state.
- (2026-10-12) One name per question, reuse first (proposeEncoding refusal, layer.target, find
  query). No disabled vary buttons. A layer painting both kinds is breaking: owner list.
- Standing: rounds are one model playing everyone -- a failure is strong, a pass weak; discount
  every "unprompted" count. A process rule without a refusing gate is a wish: check the refusal.
- Standing: fix by removing, not adding; one change per problem; words at rest never rise; rejected
  stays rejected without new evidence; never re-set a limit from data.

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

- **2026-10-17, second tier 3 criteria review:** proposed 8 changes: route bar for T47 and T48
  counts folder or several only; kept words re-checked per build; T37 reworded off "connected";
  info-circle text joins the vocabulary and T48 varies its noun; newcomers hold each half (swap
  Alex off T40 B); bar 4 excludes `--keys` sessions and needs the asked color; expert and audit
  findings get a checklist, a dark-mode bar 6 run and a counted measure; one bar numbering.
  Reason throughout: each lets a bar pass while the thing studied failed or was never used.
- **2026-10-17, first tier 3 criteria review:** bar 1 `!judged` hole, bar 4 dropping never,
  T47 around route, T49 red never drawn, COMMON hiding control words, Sam with no file or folder.
  Adopted (change logs of criteria, tasks, answers, roster, 2026-10-17). Not adopted: T50 A's
  rule hidden by names (per-half reporting instead); words-over-budget screens gated.
- **2026-10-14, round 6:** repaint test reads what was painted, not explain(); restore a run layer
  without rerunning; one `otherwise` value, no copy into a binding; "draws nothing" over the whole
  stack; no Alt+drag. Open: whether a reader's edit to a highlight layer survives the next run.
- **2026-10-13:** no split parent; unset and cover separate; Figma divergence only where Figma has
  no stacking. Objected on record: dim-for-painted-over vs dim-for-locked; kind-change memory.
- **2026-10-12, tier 3 decide phase:** reject canEncode/canBind/speaks/kindsOf (duplicate existing
  answers); one find-query selector form over eight text-match inventions; static shape glyphs as
  catalog data; on/off as a two-word select, empty = not set; hide a kind the layer cannot reach;
  "Split into layers" on any categorical layer; no disabled vary buttons.
- **2026-09-26 to 2026-10-11 (summarized 2026-10-17):** personas validate, never generate
  features; no wizards or first-run UI; the app adds no look of its own; task words never reuse a
  fix's words (round 6 money task); route existing commands rather than add lists; element fix
  over app guard (refused suggestion, rulePath export lost my "no new export" on a better reason:
  an export that deletes app-copied logic wins); one FindResult.atLeast field; table scope
  "visible", no notice; gate refusal inside `--start`; briefings stripped of file contents;
  one-source claims scripted first. Rejected: notices, second homes, stacked variants, app palette
  or width before the units test, opt-in bareNumbers flag, Hops grouping.

## Tried: worked / did not work

- 2026-10-17 -- First tier 3 criteria review: worked -- every scoring hole I named that had a
  scripted fix was adopted and has a planted case in score.mjs self-test. Did not work: the T47
  route bar was adopted at "not around" rather than "folder or several", so the hole moved.
  Taught: re-read the code after a fix is adopted; the fix can land one notch short.
- 2026-09-06 to 2026-10-11 (summarized 2026-10-17) -- Worked: routing existing commands (T12 0 of
  8 -> 8 of 8); Shift-click (T24 2 of 4 -> 7 of 7); toolbar Filters (7 of 7); "units question
  first" on width. Did not work: v1 help text; copying Figma literally; rules written but not
  enforced (leak check read 0 logs and passed; round 4 started without the gate); a leak fix that
  only supplied the right file. Taught: test end states; a rule needs a refusing gate; check the
  refusal myself.

## Thinking

- (2026-10-17) The bulk tasks are the study's point, and every softening of their bars (around,
  one by one, a cover layer as SD) is reasonable alone and together lets the study pass while
  nobody used the folder. The honest measure is question 3's count; make it the bar.
- (2026-10-17) Keep lines are a snapshot of one build's screen; the fixes this study will make
  are exactly the ones most likely to borrow participants' (and so the prompts') words. The check
  must fail on that drift, not wave it through.
- (2026-10-12) Eight roles wrote element additions in their own words; consolidate to one list,
  one name each, before any build plan.
- (2026-10-11) Hunt one question answered by two tests (round 4's two defects were both that);
  a fix aligning one view must list every other view of the same state.
- (2026-10-06) After a real-app failure prefer rename, move or make visible over a hint, notice
  or second route; add only after a removal failed on two domains. Every local fix: would a
  third-party consumer of the element need this too? Then it is the element's.
- (2026-10-06) Simulated participants share blind spots and are generous on ease; report
  end-state success with and without build defects rather than chase ease.

## Sources

- `tool/score.mjs` (ROUTE_TASKS, firstStyledOf `own`), `tool/wording.mjs` (ownKept, everywhere),
  `tool/bars.mjs` (--scheme tier 1 only; internal bars 8-10), `graphty/src/components/shell/panel/AnalyzePanel.tsx`
  (SUGGESTED_CARDS), tier3 criteria/tasks/answers/roster after 6ddcb6c7c (2026-10-17)
- `design/ui/studio/tier3/{criteria,tasks,answers,roster,README}.md`, `tool/score.mjs` (bar 1
  `judged`, `firstStyledOf`), `tool/wording.mjs` (COMMON), `tool/bars-limits.json` (2026-10-17)
- `design/ui/studio/tier3/decide/*.md` (eight role answers), the source lines named in the
  2026-10-12 decision entry (2026-10-12)
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
