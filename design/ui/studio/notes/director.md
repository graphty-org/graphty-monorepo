# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-10-09 (tier 2 round 1 closed; lessons and round 2 watch list recorded).

## Top of mind

- 2026-10-09: TIER 2 ROUND 1 CLOSED. Yes, there was a dry run (four builds plus the frozen one),
  and on the routes it walked no participant met a broken control (all logs empty, 52 of 55
  succeeded, no grade decided by a defect). But it walked only the answer key's routes: detours
  (styling, the selection display) met four build defects, and the study tool reached participants
  more often than the build did. Every round 2 dry run since walks the commonest detours too.
- 2026-10-09: Round 1's real findings are discovery, not breakage: find answers a condition with
  only "No match" (T22, 4 of 4, the only task under its floor); Replace not visible at rest (8 of
  8 hunted); a plain open never asks what a weight means (T20, cost 23 vs 22); filtering lives
  only under Data (T17). That is what a study should surface; keep it that way.
- 2026-10-09: Round 1 decided 15 changes (`tier2/rounds/round-1/decisions.md`), measurement first,
  one door per problem so round 2 can credit each: tool limits and scripts, find's rule hint,
  "..." menu with Replace on the source, data files through the Data page, ", out of date" on the
  key, no silent Everything, halo without tint (element), weight list on the loaded weight.
- 2026-10-09: WATCH IN ROUND 2: (1) T22 passes its floor with the hint alone, or the column's
  "Select where..." comes next; (2) T21 finds Replace from the inspector "..." without a
  right-click; (3) T20 under 22 steps with no session setting weight per run; (4) bars 2, 7, 8, 9
  actually scored -- "not scored" fails; (5) zero tool-caused steps; (6) bar 10 likely fails on
  drawn-name overlap (element label placement): take that evidence to the owner, do not patch.
- 2026-10-09: Persona scripts decide outcomes. Tom's scripted two-attempt exit made two of three
  non-successes. Graders label a give-up that follows a persona rule; it is not the screen's.
- 2026-10-09: A simulated returning user goes first where its history points; a first move that
  matches the history is weak evidence. Credit the second place they look.
- 2026-10-09: The study tool is the biggest remaining risk to a session. Four sessions alive at
  most; its click limit counted Playwright's wait (load 90 to 158 read landed clicks as failed).
  Check the instrument on a loaded machine before every round.
- 2026-10-09: Round 2 dry runs converged on 2dcea6dd5bba (`tier2/dry-run-r2-4.md`): 0 broken
  controls; fix the last 7, refreeze, re-pilot the touched halves, then start.
- 2026-10-09: A pattern fixed in one place is a defect wherever it is missing (Enter target on the
  path form, never on find). Grep for siblings. A shared rule needs the common case tested.
- 2026-10-09: Check every pilot and skeptic claim in source or screenshot before classing; the
  hover "..." in round 1's scores was never drawn.
- 2026-10-08: TIER 2 CRITERIA FROZEN (`tier2/criteria.md`). 11 bars; "not scored" never holds; no
  round cap; stall = no progress (< 3 more core-four successes of 32, no core sev 3-4 closed, no
  failing bar newly held).
- 2026-10-07: Words: glossary wins. "Follow: Out | In | All"; "Higher means: Closer | Farther |
  Capacity"; never "route" on screen. Severity 4 needs a wrong conclusion a reader would act on.
- Before a new element API, grow an existing method. Remove before adding; words at rest never rise.

## Priorities and values

- **A newcomer finishes the core path.** The average first-time user before specialized features;
  the owner's 2026-10-02 instruction and the reason tiers exist. At least 60% of sessions go to
  tier 1, first-time personas take tier 1 first.
- **Small and coherent over complete.** One home per feature, one word per meaning, one pattern
  per job. The owner's v1 failed by growing novice features and verbose text; personas validate
  the design, they never generate features (owner, 2026-09-26).
- **Evidence over taste.** "Ours is clearer" is taste. A departure from Figma's conventions needs
  a graph fact, a WCAG criterion, a named failing workflow, or a field convention. I break ties
  with the observed behavior of two or more participants, not opinions.
- **Truthful screens.** A value never misstates what it describes; every count is computed from
  live state or removed; a result the user cannot see is a fatal flaw ("this is graph
  visualization software", owner 2026-09-30).
- **The element owns the graph.** graphty-element owns all graph logic and returns neutral facts;
  the app writes the words and arranges them. A missing capability becomes a high-priority element
  issue, not an app workaround.
- **Honest measurement.** Simulated participants share one model's blind spots: a failure is a
  strong signal, a pass is weak. Compare rounds to each other, not to published norms.
- **Do not waste the owner's time.** Decide reversible things myself with a stated reason; bring
  the owner only one-way doors and before/after evidence for his own review items.

## Design criteria

- **Every step of the chained first session commits visibly** -- the canvas and the legend change
  the moment the step commits. Reason: round 8's top trust-killer was "the panel said one thing
  and the drawing showed another".
- **The obvious first choice does the thing.** The item whose words match the user's goal must
  produce the goal. Reason: "Show labels" matched the task words and did nothing visible; 12 of
  21 picked it.
- **Every count names its unit and its whole, and is live.** Reason: hand-typed counts disagreed
  between screens in rounds 2-7; fixed strings like "64 hidden" read as the program hiding things.
- **A count that hides something offers the way out beside it.** Reason: round 2's honest "N
  hidden" sent 8 of 8 hunting; the switch beside it made the task quick (2026-10-07).
- **A list answers with names, not counts.** Reason: "Covers: Javert and 17 neighbors" named no
  one; 0 of 12 could answer who he is tied to.
- **Nothing pre-done in a first session.** A sample opens bare; the user's own results are the
  only results. Reason: 21 of 21 could not tell the sample's pre-run work from their own.
- **No unbuilt item is drawn.** No "Coming" tags, no disabled promises, no "not available yet".
- **Words: one label per command, everywhere; field-standard terms; American spelling; no two
  reachable controls share an accessible name.** Reason: "Data" on two controls dropped the
  selection 12 of 12 times.
- **Screen at rest with a graph loaded: about 50 words of app text** (framework principle 5).
- **No first-run interface** (no tours, coach marks, suggestion cards). Help is (i) icons,
  tooltips that wait, samples, undo. Owner ruled out wizards and suggestion cards (2026-09-26).
- **No confirmation dialogs for undoable acts; Esc closes the innermost thing first.**
- **Every focus change says where focus goes instead.** Reason: round 3's canvas fix dropped
  focus to the page after a sample opened (2026-10-07).
- **Time to first drawing under 2 minutes; the user runs at least one analysis; the user can say
  what they see** (designloom workflow W14).

## Decisions and reasons

- 2026-09-26..10-07 (summarized; full text in git history of this file) -- Owner: Figma is the
  paved path for chrome; refined structure B; a run paints as soon as it finishes; tiers, tier 1
  first; build the real app and study it; element neutral about presentation. Me: real-app criteria
  (9 bars, ease a target not a gate, build-decided sessions count, tool faults void); pilot triage
  and round 2-3 changes, each fix in its owning package; reversed "no Show all labels" after round 2
  (names task 0/8 -> 7/8); round 3 closed tier 1; skeptics' regrades accepted; recommend master's
  `legend.painted-over` over the element dropping covered blocks; round 3 units in
  `next-steps/round3-units.md`; tier 2 design in `next-steps/tier2-design.md` (filter steps are
  element state, no step reorder, standard undo, neighborhood controls in the list header, several
  node types and Select where deferred, Replace only on a single-source graph, no auto rerun,
  glossary 11 weight words, element keeps `"strength"` and grows `"capacity"`).

- 2026-10-07 -- Tier 2 pilot fixes (me). Shared row truncation (Filters condition, Sources name)
  is one compact-mantine fix in `EllipsizedName`, not two app tooltips: both rows already use it,
  so the defect is the component's (first hover). The Overview's runaway Direction value is two
  fixes: compact-mantine `DataRow` lets a long stat value run over its name, and the app quotes the
  file's raw statement ("directed 0"). Overview under a filter: the app names the whole-graph
  counts and adds the element's visible counts; no filtered statistics API (no task needs
  components of the filtered graph). "Higher means" left unselected on purpose: it is the trap T20
  measures; only its hint's contrast is checked.

- 2026-10-08 -- Tier 2 criteria freeze (me), from the researcher, user advocate and red team
  reviews. Adopted: carry-forward scoring; "not scored" fails; bar 10 (all three asked); bar 11
  core-four cost as a GATE (researcher; steps are behavior, cost is the returning persona's quit
  reason); bar 7 (a) over every algorithm (a wrong catalog mark is the defect that started tier
  2); bar 9 (b) with round 1's own count as the limit (no count existed to set a number; red
  team's 40-word limits rejected as guesses); broken-habit finding; door removal after 8 chances;
  T22 dialog rule fixed now; stop rules from the launch prompt (no cap). Second-time follow-ups on
  T17/T18 as a TARGET, not a gate: new, unpiloted prompts (round 6 lesson). Spare 2 slots to T12
  as T12R (Ruth, Jordan), not T15: no returning persona can honestly play a first session.
  Rejected: red team's 5-of-6 T4 floor (inconsistent with 3 of 3 per half), raising ease to 5.5,
  rewording original prompts, a T21 second updated file (needs a v3 file and re-pilot for little).
- 2026-10-08 -- Returning starts (me): the routine every history shares is ranking; most also size
  or color by it. So every start is file + PageRank + Size bound to PageRank; names drawn for T24.
  Per-persona setups rejected (9 x 18 variants; a history is a briefing, the open work is
  per-task). Old setups kept for pilot reproducibility, used by no task. Added
  `tool/files/long-names.csv` for the truncation audit.

- 2026-10-08 -- Dry runs one to three (summarized; full text in `tier2/dry-run-r1-{1,2,3}.md` and
  git history of this file). Rule: fix any defect a participant could hit, in its owning package;
  leave what the task asks. Fixed across the three: clipped rows (one compact-mantine fix, then
  `descriptionVisible`), Escape consumed by the list or menu it closes, pointer-opened menus with no
  highlight, tooltips only after the pointer moves onto the target, focus to the inspector title
  after an action and to a saved note, run method recorded (element, additive), left-out rows with
  line and end columns, labels `onTop` (element option, app sets it), path color off the default
  blue, find list counts and scrollbar, one run kind in tree and inspector, Save on an off step
  turns it on. Left every time: names by default, 3D overlap, where the path form lives, stale
  marks, weight meaning after load, saved-state mark, Recent row, units on a total.

- 2026-10-08 -- Fourth dry run triage (me, `tier2/dry-run-r1-4.md`): 97 items, 25 fix, 39 left
  for sessions, 33 no change. Fixed tooltips covering counted names, menu highlight regression,
  "Edit source..." adding a copy instead of replacing, the unbuilt path Follow (element
  `direction`, additive), Escape discarding an import, focus after Rerun and "Back to". Left on
  purpose: weight meaning after load (the T20 question).

- 2026-10-09 -- Tier 2 round 1 decisions (me, `tier2/rounds/round-1/decisions.md`), from insights,
  eight proposals and the red team, each code claim checked in source. Took the red team on five
  points, each verified: (1) T20's cause is one command doing two things -- `openInSession` with
  `fresh` loads a data file at once, inside a project it opens the Data page -- so fix that branch,
  not a second home for "Higher means" on the column; "Back to start" already asks over unsaved
  changes (`DiscardDialog`), so no undo for it. (2) T22: words first, as decided before the round;
  the app asks the element (`scope.count({ where: "=" + text })`) whether the text is a rule, so it
  parses nothing. (3) Replace: the source is the only inspector kind without a "..." menu
  (`kindMenus.ts`), so reuse that pattern, no visible buttons. (4) Stale: one mark, ", out of date"
  on the key, the run list's own words. (5) Edges-to-Everything: `writeLine`'s default
  `EVERYTHING_LAYER` is the shared cause; remove the default, show no side a row cannot write.
  Took the visual designer over four roles on the halo: `createOverlaySource` sets
  `backFaceCulling = false` on a 40% sphere, so the node is seen through gold; a rendering defect,
  not a design choice. Deferred: column "Select where...", fit-to-labels and overlap (one element
  issue), compact-mantine toast role and segmented fill, bare numbers (owner). Reason throughout:
  one door per problem so round 2 can credit each change; measurement before any app change.

- 2026-10-09 -- Round 2 dry runs one to three (summarized; full text in
  `tier2/dry-run-r2-{1,2,3}.md` and git history of this file). Fixed: the chosen segment's fill
  and weight (compact-mantine), find's bare-number hint quoting the reader's own rule (element
  `suggestion`, additive), `applyNow` not notifying an origin change and an unparsed suggestion
  (element), the shared menu's pointer rule for an enabled first row (compact-mantine), "All N
  rows" captions, the neighbor list's reach under a 2-hop filter and its wrapped heading, the
  "Add a table" tooltip opening left (reversed a keep: reported every round, one prop), the
  study tool's click timeouts and empty tooltip report. Kept with reasons named once: focus on a
  heading (boxed and underlined each read as a control), transient tooltips and menus, "on N
  nodes", the weight note's "a path needs a distance" (T18 follow-up measures it), "auto" on
  the import page (a naming question).

- 2026-10-09 -- Fourth round 2 dry run triage (me, `tier2/dry-run-r2-4.md`). Fixed: the source
  inspector heading draws its row's glyph (the left-out row lost its warning triangle once
  opened); "Advanced run settings" and the histogram's summary line aligned; the find box sets
  quoted rules in monospace (a backtick read as an apostrophe) and marks the option Enter picks
  (the path form already did); a click on a drawn name picks its node, as a new element label
  option whose default keeps today's behavior and which the app turns on (Cytoscape.js passes
  label clicks through by default, so it is a consumer's choice, not a default to change). Kept as
  design: one name or two for project and file (the Graph title "friends-v2.csv" may be a T21
  cue); the left-out row quoting the file's id (the key takes either). Reason throughout: a
  defect is fixed only when a participant could hit it on a walked route or a common detour.

## Tried: worked / did not work

- 2026-09-27..10-03 (summarized) -- Eight rounds on mocks: places right, behavior after the click
  wrong; a check that read 0 pages passed (every check fails on zero items: plant a failure);
  overfitting from task words (two-domain and wording rules); my hybrid lost to the owner's
  refined B (bring the owner's proposal to working first); 23 browsers filled swap (4-slot gate);
  a pre-run sample contaminated first-time tasks; stopped mocking because the mock was the noise.
- 2026-10-06..10-08 (summarized; full text in git history of this file) -- Worked: piloting every
  task on each new build; pilots naming file, line and screenshot; proposals root-caused in source
  (several "new APIs" were already half-built in the element); one change per path for clean
  credit; walking a setup by hand once before scripting it; preflight listing every carried
  decision as built or not. Did not work: a session clock running while queued for a browser
  (voided 14 sessions); a decided rename never built; scoring a new tool mode's blind spots as
  findings; briefing graders on a risk by name; trusting a persona's input mode; removing canvas
  autofocus without deciding where focus goes; a subagent writing `report.md` (the harness refused
  it); `rm -rf $VAR/...` (use new folder names).

- 2026-10-08 (dry run) -- Did not work: starting round 1 before a dry run; the first five
  sessions spent most of their steps on defects (same-named From/To boxes, a tool crash on EPIPE,
  a helper script shared between sessions sending clicks into another session). Worked: piloting
  every task on both datasets and triaging by "could a participant hit it" against "is it the
  question the study asks".

- 2026-10-08 (dry runs two to four, summarized; full text in git history of this file) --
  Worked: re-piloting each fix batch on the built result (the second pass found 65 new defects,
  many made by the first fixes); reading the code behind each finding (three "new features" were
  already there; "Edit source" was a mislabeled add; "row (no name)" was the tool). Did not work:
  checking colors on flat swatches instead of shaded spheres; hiding a cut instead of showing more
  exists; focus or highlight fixes without both a keyboard and a pointer walk on the exact screen.

- 2026-10-09 (tier 2 round 1) -- Worked: four dry runs left 0 broken controls on walked routes
  (all logs empty, no grade decided by a defect). Did not work: walking only the answer key's
  routes by pointer; participants met four defects on detours and the tool caused more trouble than
  the build. Did not work: starting a round with bar scripts unbuilt -- four bars could not hold.
  Worked: the red team reading proposals in source found the T20 cause (one command, two
  behaviors) that six roles missed, and the shared `writeLine` default behind one caller's bug.

- 2026-10-09 (round 2 dry run) -- Worked: reading the element's facts before calling a word
  wrong. `stale.reason` already separated a filter from new data, so ", out of date" under a filter
  was the app's word, not a missing API. Did not work: pilots naming causes they had not traced
  ("step-1 off" read from the row's second line; "minutes > `9`" a rewrite of ">= 10"): both were
  something else in source. Check every cause a pilot guesses before writing its unit.

- 2026-10-09 (second round 2 dry run) -- Worked: comparing the pilot's screenshots side by side
  before classing. "Every node moved after reopen" was the same shape framed smaller; "focus ring
  left beside the new form" was not in the screenshot. Worked: reading the tool's browser launch
  when a pane looked unscrollable -- the cause was the measuring instrument. Did not work: the
  answer key copying pilot claims as facts ("the scrollbar is drawn when every row fits"); the
  key needs the same check as a defect.

- 2026-10-09 (fourth round 2 dry run) -- Worked: measuring pixel x on the screenshots before
  calling a misalignment (8 px and 16 px, both real), and checking each "new" item against the
  key first (the "out-of-date key line" sat in the earlier build's list; the current notes were
  right). Did not work: the first dry run's fix to the path form's Enter target stayed local;
  the find box had the same defect for four dry runs because no one grepped for the pattern.

- 2026-10-09 (third round 2 dry run) -- Worked: reading the shared code a pilot's symptom
  passes through. The menu highlight looked like a regression but was a rule never built for the
  common case. Worked: separating the tool's faults from the app's; two of the 120 items could put
  a participant in the wrong start state, which no app fix would catch. Did not work: the tool's
  fixed 3000 ms limit on a machine with other agents at load 90 to 115.

## Thinking

- **2026-10-09, what round 1 taught about the study itself:** a dry run that clears only the key's
  routes leaves participants to find detour defects; the cheapest check is the previous round's
  wrong turns walked by pointer and keyboard. Prompts can induce the behavior they measure (every
  T21 session caught the stale run because the prompt said a rerun was due); judge staleness from
  experts and a script, not from those sessions. Task wording leans routes ("bring it in so every
  calculation" invites an import step): credit what users do next, not the first door.

- **What tier 2 needs before its first round:** tasks and answers for filter, shortest chain,
  notes, two tables (old T4), weight at load used by every run, rerun on new data (needs a
  `friends-v2.csv` with the same nodes and changed weights); returning-user personas; the same
  frozen bars, pilot-per-build, skeptic check. No keyboard-only persona (owner, 2026-10-07).
- **Real-user study design:** recruit 5-8 analysts plus one screen-reader user; tasks from tier 1
  core four; measure what simulation could not: whether Size and labels are found, whether 3D
  sizes mislead, ease calibration against our simulated numbers.
- **Discovery is the remaining cost** (Size under "+", labels on Everything, group layouts behind a
  community run). Do not redesign from simulated evidence alone; it is one shared guess.
- **Where fixes go.** Graph logic (element), a word or arrangement (app), a shared control
  (compact-mantine). A fix in the wrong package is a second bug.
- **Open tension:** "a run paints as soon as it finishes" vs a reader's Everything color
  suppressing it. Owner item.

## Sources

- Tier 2 round 1 (2026-10-09): `tier2/rounds/round-1/{plan,scores,insights,decisions}.md`, sessions in `tier2/rounds/round-1/sessions/`.

- Tier 2 round 2 dry runs (2026-10-09): `tier2/dry-run-r2-{1,2,3,4}.md`, pilots in `tier2/rounds/r2d{1,2,3}/pilot/`.
- Tier 2 (2026-10-08): `tier2/dry-run-r1-4.md` (pilots in `tier2/rounds/r1d3/pilot/`), `tier2/dry-run-r1-1.md`, `tier2/dry-run-r1-2.md` (pilots in `tier2/rounds/r1d1/pilot/`), `tier2/dry-run-r1-3.md` (pilots in `tier2/rounds/r1d2/pilot/`), `tier2/criteria.md` (frozen), `tier2/tasks.md`, `tier2/roster.md` ("Where each
  session starts"), `rounds/tier-2/setups/*-ranked*.txt`; reviews in `notes/researcher.md`,
  `notes/user.md`, `notes/redteam.md`.
- Studio: `criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `owner-decisions.md`,
  `rounds/pilot/triage.md`, `rounds/round-{1,2,3}/{plan,preflight,scores,insights}.md`,
  `rounds/round-{1,2}/decisions.md`, `tool/README.md`.
- Digests (2026-10-06): `digests/decisions.md`, `owner-voice.md`, `study-rounds.md`, `tier1.md`,
  `framework.md`.
- Earlier work: `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/` (owner feedback,
  decision log, round 8 insights, structure B); `.worktrees/feat-tier1-real-app/design/ui/tier1-real-app/`.
- Director transcripts: `.claudehistory/3a19ea55-.../subagents/workflows/`; scripts `tmp/director/`.
- Builds: round 1 9d6598eea, round 2 4a7a1a7fb, round 3 b7590f8de; served at
  `https://dev.ato.ms:9366/?next`.
