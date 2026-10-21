# UX Researcher -- designer's notes

The researcher designs and runs the graphty app's studies: tasks written without interface words,
the participant personas, graders who alone hold the success definitions, and skeptic checks on
every insight and every fix. The job is to make sure a finding is about the design, not an artifact
of the study, the prototype or the task wording.

Read "Top of mind" first at the start of every session. Update the dated sections as decisions are
made and evidence comes in. Summarized 2026-10-17 (older entries folded; full text in git history).

## Top of mind

- (2026-10-20) Round 1 is frozen on 6de5f95d12; the key reads it from 21 halves' targeted
  re-pilots (rounds/r1d1/pilot/). T50 is unblocked (projects open with their look). Replace with
  the same file now keeps layers. Open grading-spoiler for preflight 4: T44 B Replace + two undos
  leaves a deleted label drawn and the tree over-reports node.label (graded from the screenshot).
- (2026-10-20) Pilot "mismatches" are often the key being right and decided.md being wrong-way
  (Escape on a member, drawing jumps): the key counts the screen and names the contradiction;
  never rewrite the key toward decided.md.
- (2026-10-20) The start page's demo is the first graph the tool records: styles-start.json,
  `changes` and the first `graph: true` steps line are the demo. Grade layers from styles.json
  itself; T49's start is the first steps line after the sample opens. real.mjs also prints "the
  app never drew its window" at every start -- a tool bug, owed before sessions.
- (2026-10-20) The start page hands out answers: its demo is Les Miserables ("Valjean is the
  biggest", six community colors with one red). T37 A and T46 A participants see it first.
- (2026-10-20) T46/T47 "keeps its own color" echoes the token's spoken name "Each layer's own
  value, N layers" (ValuePicker.tsx) and the folder's "Louvain: each layer's own value"
  (WhichPicker.tsx). wording.mjs cannot see it: "own" and "each" are in COMMON. Primes question 3.
- (2026-10-20) Tools behind the criteria lag: wording.mjs reads no spoken.json and joins no
  irregular forms; WALKS3 lacks Memberships, a node's Style tab, the shape list, the key-on
  sample and the Starts-with typing check; gateCheck still keys by walk folder name. Preflight 3's
  self-tests pass without any of it.
- (2026-10-20) One round only: bar 1's "cannot pass while a task is unjudged" (T37, T42, T44)
  and the stall rule make "passed" and "stalled" unreachable; round 1 needs its own verdict.
- (2026-10-18) No prompt echoes a fix's words ("Not set yet", "Undid ...", "the color before this
  edit"); the at-rest walk does not see notices -- spoken.json now carries them.
- (2026-10-17) Round 1 is 13 tasks: T37, T42, T44 out; core T39, T40, T47, T48. score.mjs: under
  4 sessions a task does not hold bar 1; T47 holds only when half its successes carry `Route:`
  folder/several; bar 4 stops at every node in ONE new color.
- (2026-10-17) Tier 3 is FIRST USE + STYLING: 56 sessions, 9 first-time personas, every start
  `empty` (Sam `empty --keys`).
- (2026-10-17) Study data traps: football names have no spaces; Les Mis nodes have only id and
  name; brief every planned row and read one briefing per persona before calling a first move
  unprompted.
- (2026-10-13) "Unset" vs "cover" is the core risk of the layer model: tasks need each in reader
  words. Do not let a Figma-fluent persona stand in for the population.
- Expert counts are not user evidence; severities are walkthrough judgments. Rerun on the frozen
  build, not the dev server, before reporting "fixed".
- (tier 2 lessons) Step counts must match the key's counting; histories, setups, prompt words and
  the tool's own text all steer behavior -- grep all four before "unprompted".

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

- **2026-10-20 (6de5f95d12 re-pilots into the key):** Kept every step count and bar: every
  walked success path matched. Marked "the drawing jumps ~130 px" as a defect where T39/T40 had
  called it expected, because decided.md settles that a key never re-frames. For T44 B's broken
  state (tree says 24 labels, screen shows 1) I added a grading line -- grade from the last
  screenshot -- because the success rule reads the tree and would give a false S; this is a
  grading rule for a build defect, not a bar change, and it is flagged for preflight 4. Did not
  touch tasks.md: no pilot found a wrong prompt. Wrote older-build facts as "(on 7d87760756 ...)"
  instead of deleting them, so a grader on a different build can still tell.

- **2026-10-20 (pilots on 7d87760756 into the key):** Patched answers.md task by task from 30
  pilot outputs (no report.md rewritten). File tasks lose a step ("Open a file" + Load replaces
  "No thanks" + "Open project or file" + Load); sample tasks keep their counts (Samples + card).
  Recounted every pilot's step claim myself: pilots counted the off-screen "No thanks" (T39 A, T40
  A, T47 A, T49 A said one more) or miscounted (T38 B said 11 for a 12-item list). Where the
  screen contradicts decided.md (F6, Which nodes, selection-held re-framing, Tab in a typed list,
  silent Escapes), the key counts the screen and names the contradiction; the defects go to
  preflight 4 triage, not into grades. T49's rule fixed to read the start after the sample opens,
  because the rule as written grades every correct undo F against the demo. T37's demo reading
  left ungraded (T37 not in round 1) rather than inventing a rule. Kept the e3c5bca8e6 T50 path
  for the fixed build instead of deleting it. No prompt was wrong; tasks.md's facilitator detours
  and two kept-word reasons now name this build's controls.

- **2026-10-20 (fifth read of the criteria, build 3ef9e6c1ec named; HEAD holds golden):**
  Proposed, not applied (the Director freezes): (1) refreeze on the golden build and re-walk
  before anything else, because no walk exists on the named build and the named build lacks the
  behaviors decided.md now binds; (2) a round 1 verdict, since one round cannot reach "passed" or
  "stalled"; (3) T46/T47 reworded to "leave the colors of the other circles as they are" /
  "without changing the color of any circle", and the wording check matches 2+-word phrases incl.
  common words against spoken.json; (4) preflight 3 names the planted cases each self-test must
  hold (irregular echo, spoken echo, phrase echo, half-keyed gate, missing walk, non-equivalent
  build, the five screens, Starts-with typing); (5) T50 B settled as S with a `Read from:` line,
  because both readings pick the same 6 on this file; (6) the expert walk and audit say which bar
  each part feeds, the key-and-drawing check runs after sessions, and an expert's leading-word
  finding marks its task primed (preflight 7); (7) a core half that holds only through Alex or
  Maren does not hold, and bar 1 is also reported without Sam; (8) a design (not build) problem
  is confirmed by two sessions on two different task halves, not two on one prompt. Did not
  re-propose the schema twins.

- **2026-10-19 (pilots on e3c5bca8e6 into the key):** Patched answers.md bullet by bullet from 30
  pilot outputs (most report.md files never written). Rewrote the shared "every path meets" block
  where the build changed (Which nodes expand click, Enter focus, unset line, re-framing, find box,
  Undo). Kept every target. Wrote T50 B's "hours 30 to 52 and trained", read from the card, as S
  because it is the stored rule and 52 is the file's maximum; left the selection-summary reading
  ("31 to 52") to the Director because it is not the layer's rule. Moved T48's filtered run and
  T49's removed line to the settled rules already at the top of the key, instead of leaving stale
  "for the Director" text. Did not count pilot step numbers that split "type, Enter" into two
  (T42 B said 12; the key's counting gives 11).

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
- **2026-10-17 to 10-18 (pilots on ed4351b258, 5bd16cda6e, 6dd0b00bd7 into the key, folded):**
  Rewrote or patched answers.md per frozen build from the pilot reports; kept every success target;
  graded new routes by existing rules ("a route as short" is S; selection routes that end right are
  SD; T49 graded by the drawing once settled); counted one click per step for key and participant;
  judged T44 on the style tree; accepted T48's whole-file chip count; changed only tasks.md's
  detour lines, never a prompt, when the key was wrong; left route-redefining cases (T46 other
  methods, T48 B filtered run) to the Director until settled.
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

- 2026-10-20 (6de5f95d12 re-pilots into the key) -- Worked: matching each old string with any
  whitespace run standing for any other (`\s+` join), so key paragraphs wrapped across lines
  match without copying line breaks; it caught one misquote before writing. `prettier
--ignore-path /dev/null --check` on the edited files (the plain run on a tmp copy printed
  nothing). Did not work: `--no-ignore` (not a prettier flag; failed silently).

- 2026-10-20 (7d87760756 pilots into the key) -- Worked: one python helper that asserts each old
  string occurs once before replacing (caught a T40 success line shared with T47 and a misquoted
  T48 line before anything was written); grepping the key for "No thanks", "Open project or
  file", "jumps", "shrinks" and the old build id after the edits; previewing prettier and
  reflowing lines that begin with ">", "7." or "15)" (prettier turned one into a blockquote in the
  old change log). Did not work: copying the file into tmp/ to preview prettier (ignored path, no
  output); trusting pilot step totals.

- 2026-10-20 (fifth read) -- Worked: `git merge-base --is-ancestor f9d8b44b9 3ef9e6c1ec` to test
  the change log's "the build now includes golden" (it does not); counting buildStamps per pilot
  half (zero on the named build); reading wording.mjs's COMMON list, which showed why a phrase
  echo ("its own") is invisible; grepping app strings for prompt phrases (`git grep` at the build
  commit, quoted strings only); computing T50 B's two readings from the GraphML. Did not work:
  grepping app source for prompt words without restricting to quoted strings (comments flood it).

- 2026-10-19 (e3c5bca8e6 pilots into the key) -- Worked: grepping the key for stale phrases
  ("disabled Fill", "size and place", "Control+Y does", the old build id) after the edits, which
  caught a missed T51 reference line. Did not work: trusting one pilot's keyboard claim when two
  disagree (T45 B "one Enter opens the list" vs T40 A's two); the key now names whose walk.

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

- 2026-10-20 -- A word list cannot catch an echo made of common words: "keeps its own color"
  vs "each layer's own value" shares only stop-words. Echo checks need phrases, and the spoken
  layer, where the bulk token's meaning is written out, is where the echo lives.
- 2026-10-20 -- A change log entry is a claim about the build; check it against the commit graph
  before trusting any decision that rests on it.

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
