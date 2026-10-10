# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-10-09 (tier 2 round 2 decided; 15 changes for round 3).

## Top of mind

- 2026-10-09: TIER 2 ROUND 2 DECIDED (`tier2/rounds/round-2/decisions.md`): 15 changes, study
  first. Yes, there was a dry run, and it worked on what it walked (about 30 of 355 problems were
  build faults, none above severity 2, none decided a grade). Twelve of the 30 sat on the one
  detour nobody listed: styling a selection.
- 2026-10-09: THE LEAK IS THE BLOCKER. Participants read `tier2/tasks.md` upward from session
  folders inside the studio tree; 13 of 16 answered follow-ups early. A briefing check alone does
  not stop reading upward. Round 3 runs session folders outside the tree plus a transcript check
  that voids any session that opened a facilitator file. No round starts until a planted leak is
  caught.
- 2026-10-09: A walk list copied from last round is always one round behind. Seed every dry run
  from throwaway pilots on the candidate build; press every control by keyboard; fix before the
  freeze, never hand a found fault on.
- 2026-10-09: A preflight that names a script must run it on a planted failure (bar 10's counts
  were claimed and never built). A withdrawn finding is removed everywhere it is cited.
- 2026-10-09: Not yet credited (re-run clean): weight meaning at load (T20), Replace in the source
  "..." (T21), find's rule hint (T22), the T17/T18 second-time measure; r2-s05 void.
- 2026-10-09: WATCH IN ROUND 3: (1) T22 under its floor with miss-hint-Enter, else column "Select
  where..."; (2) T21 Add page's repeat count stops doubled ties; (3) bar 9 (b) back under round 1
  counts; (4) bar 11 paths at or under 8; (5) zero unvoided facilitator reads.
- 2026-10-09: Before calling a "defect" an app job, read the element: width 8 as a hairline is the
  element's units (10 x W / d px; owner item), and the element already defines a highlight look
  (`DEFAULT_HIGHLIGHT`) it just does not expose. Expose the fact; never scale in the app.
- 2026-10-09: Several proposals on one problem: ship one path (miss, hint, run) and hold the rest
  so a round can credit it. Reject flags whose off-state nobody wants (capability, not choice).
- 2026-10-09: Persona scripts and prompt words decide outcomes ("stand out" invited styling).
  Graders label behavior the prompt asked for; reword only prompts that do not measure it.
- 2026-10-09: A simulated returning user goes first where its history points; credit the second
  place they look. A failure is strong evidence, a pass weak.
- 2026-10-09: Bar 10 drawn-name overlap stays graphty-element's label placement: owner evidence,
  never an app patch.
- 2026-10-09: A pattern fixed in one place is a defect wherever it is missing. Grep for siblings.
- 2026-10-08: TIER 2 CRITERIA FROZEN (`tier2/criteria.md`). 11 bars; "not scored" never holds; no
  round cap; stall = no progress.
- 2026-10-07: Words: glossary wins. Severity 4 needs a wrong conclusion a reader would act on.
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

- 2026-10-07..10-08 (summarized; full text in git history of this file) -- Tier 2 pilot fixes
  (shared truncation in compact-mantine `EllipsizedName`; Overview names whole-graph counts under a
  filter; "Higher means" left unset as T20's trap). Criteria freeze: carry-forward scoring, "not
  scored" fails, bar 10, bar 11 core-four cost as a gate, bar 9 (b) limited by round 1's own count,
  broken-habit finding, door removal after 8 chances, follow-ups a target not a gate; rejected
  rewording original prompts. Returning starts: file + PageRank + Size by PageRank. Round 1 dry
  runs one to four (`tier2/dry-run-r1-{1..4}.md`): fix any defect a participant could hit in its
  owning package, leave what the task asks.

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

- 2026-10-09 -- Tier 2 round 2 decisions (me, `tier2/rounds/round-2/decisions.md`), from insights,
  eight proposals and the red team, code claims checked in source. Study first: session folders
  outside the studio tree and a transcript leak check (a missing-briefing refusal alone would not
  have stopped r2-s05); dry run seeded from pilots' real routes, every control by keyboard, faults
  fixed before freeze, two-match clicks refused; bar 10 counts built and `scores.md` cleared of the
  withdrawn radio finding. Took the red team on: find box gets one path (example after a miss, "="
  restored in the suggestion, Enter runs the shown rule), no column rows, no `bareNumbers` flag
  (a capability nobody wants off), bare numbers stay owner; Add's repeat count from the element,
  not file-name matching; no app width doubling. Over the red team on one point: the selection's
  new line starts at the element's own highlight look via a new additive read
  (`styles.highlightStyle`), not the open picker, because the element already defines "chosen" and
  the app already chose black; width units stay the owner's (`owner-decisions.md`). Also: Escape,
  Follow and step-edit focus; 24 px checkbox in compact-mantine; words at rest cut (scope words
  only when drawing and run differ); path aliases for bar 11; weighted total on the run row; Filter
  to neighbors a plain command; repeated status re-announced; T22/T24 lose "stand out". Held:
  label overlap (element), neighbor depth groups, "Edit source" title, "Components 1".

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

- 2026-10-09 (tier 2 round 2) -- Worked: dry runs walking round 1's detours by pointer and keyboard
  (0 faults on walked routes, 30 of 30 detours). Did not work: the walk list (one round behind);
  handing a keyboard fault to the expert pass; a preflight claiming unbuilt scripts; session
  folders inside the studio tree (the facilitator file leaked to 13 of 16). Worked: reading
  `owner-decisions.md` before ruling on a "units bug" -- the width question was already measured
  and on the owner's list, which settled the red team's objection in one read.

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

- Tier 2 round 2 (2026-10-09): `tier2/rounds/round-2/{plan,preflight,scores,insights,decisions}.md`; proposals in `notes/{user,researcher,ia,content,interaction,figma,visual,a11y,engineer,redteam}.md`.
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
