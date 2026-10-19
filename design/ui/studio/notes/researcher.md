# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in. Summarized 2026-10-17 (older entries folded; full text in git history).

## Top of mind

- (2026-10-19, fourth read, build 1fa51e2b0b) Round 1 has NOT started. 1fa51e2b0b's app code is
  identical to 52cb47a85a (the commits between touch only design/). The fifth dry-run pass on
  1fa51e2b0b stopped at 23:51 on 2026-10-18 after 33 walks: complete (pointer, keyboard,
  detours) only T37 A/B, T38 A/B, T39 B, T40 A/B, T41 A; T39 A lacks keyboard and detours, T41 B
  keyboard; T43 to T51 (core T47, T48) have none; 9 walks went to T37 and T42, which round 1 does
  not run. No pass-5 triage, no backlog.md, no rounds/r1/bars yet, and answers.md holds no
  per-method reference values for the non-Louvain community analyses that preflight 5 requires.
  Eight changes proposed (below, 2026-10-19 decision). New defect on T40 B's success path:
  typing GAL right after picking "Starts with" reopens the match menu and the letters land
  nowhere; "Add a condition" needs two clicks the first time.
- (2026-10-18, third read) Seven of eight changes taken into the refrozen criteria (exit test,
  bar 4 at 10, any community analysis, T48 B filtered = around, T44 A `id`, T49 by the drawing,
  repro-or-measurement confirmation). Not taken: T51 B to neighbors.csv; recorded as a limit
  (volunteers and sources share one schema under T38, T41, T43, T48, T51).
- (2026-10-18) No prompt echoes a 52cb47a85a fix's words ("Not set yet: the first ... you pick
  makes the layer", "Undid ...", "the color before this edit", "Kinds"); the at-rest walk does
  not see notices or the "Not set yet" line, so the wording check cannot prove it.
- (2026-10-18, round 1 pilots on 6dd0b00bd7) answers.md matches build 6dd0b00bd7. Owed before
  round 1: T46 A all three ways (never started: no browser slot), T37 A by keyboard, T43 B by
  keyboard past the start screen. T45 B now walked: 15 steps. New Director question: T46's prompt
  does not name Louvain; how is a Leiden or other clustering run graded?
- (2026-10-18) Cross-task facts on 6dd0b00bd7: chips end in "nodes"; Fill "+" opens no key until
  Enter; Enter in a new layer's new color box lands focus on the disabled Fill "+" (a selection
  layer keeps it in the box) -- the likeliest confirmed severity-3 candidate across T38-T51; an
  unset line's italic 6366F1 cannot be set to 6366F1 (T48 cover, T49 re-add); keyboard lands on
  the inspector heading; find box keeps the typed text; runs keep the drawing; selection layers
  appear only when a value is committed; screen reader names 6366F1 "indigo", 800080 "purple".
- (2026-10-18) Severity-3 candidates to watch in round 1: T47 `cube` typed in the shape list
  picks Cylinder; T50 A's opened rule rewrites itself on ArrowDown+Enter; T46 Memberships drops
  keyboard focus on the resize separator.
- (2026-10-17) T46's Memberships button and "Why this look" now open the right group layer:
  question 3's trap (the folder's color) is still there, but the shorter routes bypass the folder
  -- read T46 Token lines knowing the folder may never be visited.
- (2026-10-17) Wording check on tier 3 prompts: 32 prompts vs 23 screens (tmp/style-study/bars3),
  0 shared words. It only sees walked screens at rest: a popover nobody walks is never checked.
  No literal echo found in source either ("Each layer's own value" is a code comment; the UI says
  "from each layer").
- (2026-10-17, review applied to the first-use styling study) Round 1 is 13 tasks: T37 and T42
  out, T51 in at 2, T48 core at 6 (core: T39, T40, T47, T48). score.mjs: a task under 4 sessions
  does not hold bar 1; T47 holds only when half its successes carry `Route:` folder/several/one by
  one; bar 4 stops at every node in ONE new color (`colors` per screenshot), never = Infinity.
  Still owed at preflight: what the from box does with `10,000` and `$10,000`; T51's step count
  and the key's three colors; T42 at 4 in round 2.
- (2026-10-17) Tier 3 is FIRST USE + STYLING: 56 sessions, 9 first-time personas, every start
  `empty` (Sam `empty --keys`). Before round 1: fix the two axe serious hits and the focus defects
  in tier3/pilot-materials/README.md, re-record bar 8 limits on the frozen build, run Louvain twice.
- (2026-10-17) Study data traps: football names have no spaces ("Florida State" finds nothing);
  Les Mis nodes have only id and name; persona files can carry team-only sections into briefings;
  brief every planned row and read one briefing per persona before calling a first move unprompted.
- (2026-10-16) Bulk iteration 7 frozen as `tier3-bulk7-457aa9f0f2`: a bulk field whose layers
  differ draws the purple <<Layer>> token, "N layers", chits up to 6 or 5 and "+N". Study
  questions: token misread as a column; chit clicks attempted; whether "+N" reads as more groups.
- (2026-10-13) "Unset" vs "cover" is the core risk of the layer model: tasks need each in reader
  words, scoring which control is used first. Do not let a Figma-fluent persona stand in for the
  population; grep histories for "Figma" before claiming transfer.
- Expert counts are not user evidence; severities are walkthrough judgments. Rerun on the frozen
  build, not the dev server, before reporting "fixed".
- (tier 2 lessons) Step counts must match the key's counting; histories, setups, prompt words and
  the tool's own text all steer behavior -- grep all four before "unprompted"; a tool refusal is
  not reader confusion; read leak-check and bars MISS lines, not only verdicts.

## Priorities and values

- **Findings that are real.** A study that flatters the design is worse than no study: it ships
  the defect with a pass stamped on it. Every method choice is judged by whether it can produce a
  false pass.
- **The first-time user's core path first** (owner, 2026-10-02): load or pick a sample, read what
  loaded, rank, find groups, color or size by a result, labels from an attribute, a readable
  layout, find a node and its neighbors, export a picture and the numbers, save and reopen.
- **Behavior over opinion.** What ended on screen and what the participant concluded outweigh what
  they said. An opinion-only finding is held one severity level down.
- **Studies are expensive; validate before launch** (owner, 2026-09-29). Preflight, rehearsal,
  dry run and a snapshot before any paid round. A check that inspects zero items must fail.
- **Generality.** Personas validate the design; they never generate features (owner, 2026-09-26).
  No persona-specific fix, no one-domain wording.
- **Honest reporting.** Every number with its denominator, with and without deciding defects and
  cut-off sessions, and successes alongside failures.

## Design criteria

The bars live in each tier's `criteria.md` (frozen before a round; changes only between rounds,
logged). Their reasons, in short:

- **Each task >= 80% success, each dataset half at a floor** -- the half floor stops a one-domain
  fix passing on combined counts. At 4 sessions 80% means 4 of 4; at 6, 5 of 6.
- **No confirmed severity-4 (tier 3: 3 or 4) problem.** Nielsen 0-4; confirmed = 2 participants,
  or a scripted repro for a build defect.
- **A time bar measured in steps, not minutes** (the clock holds model thinking), on pointer
  sessions of newcomers; keyboard and expert-tool personas reported apart.
- **A bar that only a route under study can meet** (T47 and, proposed, T48 `Route:` lines): a
  pass around the feature is recorded but does not hold the bar.
- **Every committed step visible on canvas and legend at once; every count from live state.**

## Decisions and reasons

- **2026-10-19 (fourth read of the criteria, build 1fa51e2b0b):** Proposed, not applied (the
  Director freezes): (1) a method whose two frozen-build runs differ is graded against the
  participant's own run (target count read from their `styles.json`), not a fixed number --
  answers.md has Louvain values only; (2) bar 2's text carves out T49's tree-only difference, as
  answers.md already does, so a grader reading the criteria alone cannot score a false done; (3)
  bar 6's typing-lands check adds "after picking a match kind in a text card" (T40 B pass-5
  evidence); (4) a docs-only commit does not refreeze: the first line names the app commit, and a
  walk counts on any build whose graphty, graphty-element, compact-mantine and lockfile diff is
  empty, recorded in the gate evidence; (5) the dry run walks round-1 halves only, core first;
  (6) the walk records notices, live-region text and accessible names into a second vocabulary
  that wording.mjs and the experts read -- closes the "at rest only" hole, and bar 5 lists it;
  (7) "draw" in T43, T47, T50, T51 listed as kept with its reason, or T50 reworded ("made them
  orange"), since the unset line's spoken name says "drawn"; (8) question 2 reports each card
  type with its domain count, and a type seen on one domain only is labeled so (number on ties:
  Les Mis only; category on ties: neighbors only). Did not re-propose the schema twins.

- **2026-10-18 (third read of the criteria, build 52cb47a85a):** Proposed, not applied: the
  criteria are frozen and the Director's. Chose to grade T49 by the drawing because the prompt's
  goal is the drawing and the screen cannot show set vs unset; the tree difference stays a
  recorded finding about the layer model, not a participant's error. Chose neighbors.csv's tie
  kinds for T51 B because every other brought file with a category is a node table with the
  volunteers/sources schema or has no ties; it also puts coloring by category on the Edge tab.
  Chose Ruth for it (on neither T45 nor T51) and Grace to Ruth's T49 B (not on T49 A).
- **2026-10-18 (pilots on 6dd0b00bd7 into the key):** Patched answers.md with asserted bullet
  replacements (a helper that swaps one `- **label` bullet inside one section) instead of a full
  rewrite: 25 reports, most changes local. Rewrote the common block whole. Kept every target;
  graded new routes by existing rules (T40 find-box Shift+click to six: SD; T47 `cube` giving
  Cylinder: F by the tree; T49 remove-and-re-add: S only if it ends set; T50 rule rewritten by a
  suggestion: graded on the reading, recorded as a wrong turn). Left T46's non-Louvain run to the
  Director. Wrote T46 A's path as 12 from B's walk, flagged unwalked, rather than wait.
- **2026-10-18 (pilots on 5bd16cda6e into the key):** Rewrote the success-path body again from
  the 26 pilot reports rather than patching. Graded new working routes by the existing rules
  (T37's find-box rule by its length; T41's find-box routes SD; T40/T45's selection layers that
  end on the right set SD) instead of adding grades. Left T48 B's filter-then-run route ungraded
  and logged it: it changes what "the clusters" are, which is the Director's call. Kept T45 B's
  ed4351b258 path, flagged as unwalked, rather than guessing a new count. Changed one tasks.md
  detour line (card dropped now has a notice); no prompt was wrong.
- **2026-10-17 (pilots on ed4351b258 into the key):** Rewrote answers.md from the reference
  values down rather than patching (30 pilot reports touched every section). Kept every success
  target; where a pilot found a shorter real route (T37 Degree in the inspector, T46 Memberships
  and "Why this look") the key lists it, since the grading rule already gives S to "a route as
  short". Accepted T48's chip count on the one-by-one route too (it is whole-file, so it still
  equals the answer). Kept T49 "remove the line alone" as F because the definition is the tree,
  and logged the screen/tree split for the Director instead of re-grading it. Changed tasks.md's
  T40/T50 detour line only (stale focus claim); prompts were right. Added the volunteers' and
  sources' Louvain outputs (3 groups) as reference values, read from the T48 pilots.
- **2026-10-17 (pilot findings into the key):** Counted one click per step everywhere (the old key
  grouped "Fill +, Color" and "Layer, Enter"), so the participant and key counts agree. Judged T44
  on the style tree when labels are hidden by overlap (the app's declutter, not the participant's
  omission). Accepted T48's chip count (equals the answer when every node is in a cluster; a
  grader cannot tell the readings apart). T37's Degree layer from the run is not held against the
  participant. Left tasks.md's prompts unchanged: no prompt was wrong, only the key. Did not edit
  bar 4 or measure.mjs: bars are the Director's, the tool is shared; both logged.
- **2026-10-17 (second read of the tier 3 criteria):** Proposed, not applied, because the
  criteria belong to the Director to freeze and other roles review in parallel. Chose Maren <-> Ruth
  for the bar 4 swap because it keeps every persona's count and no persona on both halves (Ruth is
  on neither T39 half; Maren on neither T43 half). Recommended cubes on both T47 halves over size:
  shape is read exactly from `styles.json`, T43 already tests "bigger", and the starting size is
  never on screen.
- **2026-10-17 (review of the tier 3 materials):** Applied the Director's call where reviewers
  differed: T37's slots to T48; T50 keeps its project file, question 5 reported per half. T51 took
  T42's slots; T42 runs at 4 in round 2. T41 A says "finished the training" (the column is
  `trained`); T48 says "the way they did", not "goes back". T48's counts are not in "Facts no
  briefing may hold": a bare number matches unrelated persona text.
- **2026-10-17 (first-use styling study):** Bar 4 judged on T39 only, in steps from 01.png (key 6,
  limit 12). Tasks under 4 sessions reported, not judged. No setups: brought files by the
  participant's own --upload; colleague projects are saved files made by a scripted walk. Sam kept
  with a tool mode that refuses pointer steps.
- **2026-10-14 (round 6 watch items):** does the layer icon say where a layer came from; does an
  empty Layer 1 read as broken; are per-group settings found from the group list; is "+" > Analyze
  found before the toolbar.
- **2026-10-10 to 10-11 (tier 2, folded):** Verdict rule: two skeptic drops = dropped, one =
  weakened unless answered with evidence; every disputed claim settled at its source (roster,
  key's step line, grade file, screenshot, code at the build commit). Voided runs re-run as `<id>b`.
  Change the prompt, not the key, when a prompt leads; remove a key route the app cannot finish.
  Histories say what was done, never where (T17). Fixes one per problem in the owning package.
- **2026-10-02 to 10-09 (tier 1, folded):** Real app only (owner 2026-10-03); criteria frozen
  before a round; every task walked first; task words never echo the screen; keys get a build
  section plus scoped edits per build; personas validate, never generate features.

## Tried: worked / did not work

- 2026-10-19 (fourth read) -- Worked: `grep buildStamp` over every `session.json` per task half
  to see which walks ran on the frozen build (folder names alone mix builds); `git log
<old>..<new>` between frozen builds, which showed a refreeze with no app change; `grep -n` on
  answers.md for each community method before trusting preflight 5. Did not work: assuming a
  pilot that "began" finished -- the night's pass stopped mid-task with no report.

- 2026-10-18 (third read) -- Worked: comparing the GraphML `<key>` lines of the brought files,
  which showed the two "domains" share one schema; grepping the fix commits between the last two
  builds for prompt phrases before calling a prompt clean of echoes; reading the dry-run
  recurrence summary (tmp/tier3-dryrun-analysis) before judging the preflight's exit rule.
- 2026-10-18 (6dd0b00bd7) -- Worked: a `bullet(section, label, new)` helper with an assert that
  the label occurs once in that section; a non-ASCII assert on all three files. Did not work:
  four keyboard pilots holding all four browser slots while a fifth pilot waited -- T46 A never
  started and T37 A's keyboard start queued past its agent; launch keyboard walks staggered.
- 2026-10-18 -- Worked: writing the new body to a named scratch subfolder and splicing it with
  asserted line anchors (the old heading at its line, the log heading), then a non-ASCII count.
  Did not work: pilots reporting from different folder layouts (`5bd16cda6e/` subfolder vs
  `success/`, `detours-b/`); the key now points at both, and the gate may count only one (T44B
  pilot's note).
- 2026-10-17 (ed4351b258 pilots into the key) -- Worked: assembling the file from saved parts
  (top, new body, old log) in my own scratch subfolder. Did not work: writing helper files at the
  scratchpad's root -- other agents share it, and I overwrote two of their files (head.md,
  log.md); always use a named subfolder.
- 2026-10-17 (pilots into the key) -- Worked: reading styleContent in measure.mjs to confirm the
  T49 hash claim (it strips id, row, counts, not revision); opening one pilot screenshot to read
  T51 B's key colors (styles.json holds only the palette, not value-to-color). Did not work:
  pilot agents writing report.md (the harness refuses report files from subagents; the caller
  must save them).
- 2026-10-17 (second read) -- Worked: running `wording.mjs` on the latest bars vocabulary and then
  grepping the app's style source for each prompt's content words, which separates "no echo" from
  "never walked". Worked: grepping score.mjs for ROUTE_TASKS to check a criteria claim ("T48's
  equivalents") against what is scored -- it is T47 only.
- 2026-10-17 (review applied) -- Worked: asserted (old, new) edit scripts per file, a roster
  script asserting 56 and no persona on both halves, the wording check after every prompt edit,
  a 4-step pilot to confirm a new field before scoring on it. Did not work: trusting the wording
  tool's kept-line regex; a T47 fixture with 1 of 2 in a half.
- 2026-10-17 -- Worked: writing the bars walk first and letting MISS lines name each wrong control
  name; briefing all planned rows in a test. Did not work: chaining eval'd real.mjs steps in one
  shell call; `--expect` on a placeholder.
- 2026-10-11 (tier 2 rounds 4-5, folded) -- Worked: `git status`, `git log` and round listings
  first after any stop; a short call dump of each flagged participant log to settle leak flags;
  reading the workflow journal and the script the run executes rather than inferring from the
  round folder; reading bars MISS lines; viewing every cited screenshot; a scratch copy of the
  round folder to prove the gate. Did not work: trusting grade.md ease lines alone; candidate
  insights written without grepping histories or the key's step counting; "Priming: none" lines
  written from prompts alone.
- 2026-10-07 to 10-10 (folded) -- Worked: asserted edit scripts matching the file's line breaks;
  briefing every planned row in scratch before writing a plan; screenshot mtimes against
  follow-ups; `session.json` build stamps before claiming a build was walked; a full pilot per
  frozen build; long scripts in the background. Did not work: trusting preflight's "built";
  reading prompt-made behavior as user need; a walk's FAIL taken as a defect without checking the
  walk; committing while another agent was mid-merge (wait for MERGE_HEAD to clear).
- 2026-09-28 to 10-07 (folded) -- Worked: one row per session with an assert; two skeptics reading
  the tool's code; the 4-slot browser gate. Did not work: launching every agent at once; editing a
  script while it runs; a harness that exits 0 printing nothing; mocks.

## Thinking

- 2026-10-17 -- A prompt must state the goal, and when the goal IS the meaning a new control is
  meant to convey ("every cluster keeps its own color" vs the bulk token), the session cannot
  show whether the control conveyed it. Test the control's meaning where it is a trap, not where
  it is beside the route (T46, not T47).
- 2026-10-17 -- A wording check is only as complete as the screens it walks. Every popover on a
  success path belongs in the walk, or its words are unchecked and its focus untested.
- 2026-10-17 -- "Focus never falls to the page" is too weak for creation flows: focus on the
  wrong control (a menu, a swatch) makes typing go nowhere and passes the bar. Test that typing
  lands.
- 2026-10-11 -- A study near its ceiling produces mostly study artifacts: audit prompt, history,
  setup and step count first in any round where success is at 100%. A bar can hold because nobody
  visited its screen; give each fixed screen a reader route.
- 2026-10-11 -- Priming has four sources: the prompt, the history, the persona's playing rules and
  the tool's own text. A leak check over participant logs sees none of the last three.
- 2026-10-10 -- A reworded prompt can close one route and open another; re-read the key's S line
  against new words, and pilot it.
- 2026-10-09 -- A leaked facilitator file can only make routes look easier: a leak voids passes,
  not problems. Participants choose the route nobody walked: seed dry runs with last round's
  detours. Histories steer first moves; the second place looked is the real signal.
- **What can produce a false pass on the real app.** Task words that echo controls; a goal that
  states the control's meaning; graders accepting "I think it worked"; setups that pre-do part of a
  task; tests that assert element reports a person never sees; a fix judged on the easier dataset;
  a route around the feature counted as success.
- **What can produce a false fail.** Build defects that decide the task, tool limits, headless
  timing (name the mechanism, never "flaky"), and the runner (time limits, slot waits).
- **Stopping simulation.** When rounds stop moving the core tasks, go to real users (graphty.app
  with opt-in usage data, 5 to 8 analysts, a real screen-reader user).

## Sources

- Tier 3: `tier3/criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `design.md` (2026-10-16
  section), `bulk-edit-plan.md`, `pilot-materials/README.md`; tool: `tool/score.mjs`
  (ROUTE_TASKS), `tool/wording.mjs`, `tool/bars.mjs`; vocabulary `tmp/style-study/bars3/`.
- App words: `graphty/src/workspace/style/words.ts`, `PropertyRow.tsx`, `Groups.tsx`,
  `BindingPopover.tsx`.
- Earlier: `design/ui/studio/digests/`, `tier2/report.md`, `report.md`, round folders,
  `tmp/researcher/` scripts.
