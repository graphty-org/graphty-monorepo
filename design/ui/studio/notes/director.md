# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-10-11 (tier 2 report drafted after round 5 came back void; state recovered after the token limit).

## Top of mind

- 2026-10-11: ROUND 5 IS VOID (0 of 56): the run in flight is the 2026-10-10 continuation script
  (main checkout `tmp/studio-resume/workflow-tier2-continue.js`), which has no gate step; the gate
  lives only in `tier2/rounds/workflow-tier2.js` (kept out of git by `.git/info/exclude`). STOP
  that run and RELAUNCH from `workflow-tier2.js` at round 5; confirm a round 5 gate step in the
  journal and "Gate evidence" at the end of `round-5/plan.md` before any session.
- 2026-10-11: Then, in order: owed r4-s05b, r4-s20b, r4-s28b on 5277e2cbe (scored into round 4);
  all 56 round 5 sessions as `<id>b` on 8c015b806; runner ends a round on the first refusal.
- 2026-10-11: A CONTINUATION SCRIPT IS A FORK. After any usage-limit restart, diff it against the
  main script before the next round, or relaunch from the main script.
- 2026-10-11: The `--start` refusal WORKED (56 of 56 refused): the gate now lives in the one
  command every session runs. A refusal must also stop the runner, not only the session.
- 2026-10-11: Tier 2 report: the owner-facing text was returned to the orchestrator (the tool
  refused a subagent writing `tier2/report.md`); the file still needs writing from that text.
- 2026-10-11: Round 5 specialists, same build: six round 4 items fixed (table under a step, "or
  more" for a non-value, off step stays off, Discard, note Cancel, rule-named layer). Open: names
  over names/dots (sev 3, element declutter to dots, additive, team's call); "or more" row below
  the ties (sev 2, app); missing column reads as empty (sev 2, element fact then app); edge-only
  out-of-date note counts nodes (sev 2, owner unsettled until scripted).
- 2026-10-11: Owner items (6, unchanged by round 5): bare numbers in rules; edge width unit;
  camera in the project file; compact-mantine number box `value={undefined}`, fold region, stat
  row growth. The 2026-10-10 ruling settled the 18 graphty-element breaking rows (minor).
- 2026-10-11: Both round 4 severity 3s were ONE QUESTION ANSWERED BY TWO TESTS; round 5 found two
  more (the out-of-date note's counts vs the step's; the missing column vs a true empty). Hunt pairs.
- 2026-10-11: Bar 9 (b): diff done (`round-4/bars/edge-inspector-words.md`): +Settings, +"full
  graph", +"on nodes"; true scope facts, not cut. The bar fails honestly at 29 against 27.
- 2026-10-11: MEASURE OR WALK A CLAIM BEFORE CLASSING IT (`--hover`, source for names, ratios
  across undo for sizes). A key note names the mechanism once known.
- 2026-10-11: The briefing leaked answers in rounds 3-4; discount every "noticed unprompted" count
  from them; leak checks read briefings.
- 2026-10-11: A fix that swaps one count for another is a new half-truth; add the missing unit.
- 2026-10-09: Before calling a defect an app job, read the element; expose the fact, never compute
  in the app. A pattern fixed in one place is a defect wherever it is missing.
- 2026-10-07: Words: glossary wins. Severity 4 needs a wrong conclusion a reader would act on.
  Words at rest never rise.

## Priorities and values

- **A newcomer finishes the core path.** The average first-time user before specialized features;
  the owner's 2026-10-02 instruction and the reason tiers exist.
- **Small and coherent over complete.** One home per feature, one word per meaning, one pattern
  per job. Personas validate the design, they never generate features (owner, 2026-09-26).
- **Evidence over taste.** A departure from Figma's conventions needs a graph fact, a WCAG
  criterion, a named failing workflow, or a field convention. I break ties with the observed
  behavior of two or more participants, not opinions.
- **Truthful screens.** A value never misstates what it describes; every count is computed from
  live state or removed; a result the user cannot see is a fatal flaw (owner 2026-09-30).
- **The element owns the graph.** graphty-element returns neutral facts; the app writes the words
  and arranges them. A missing capability becomes an element change, not an app workaround.
- **Honest measurement.** Simulated participants share one model's blind spots: a failure is a
  strong signal, a pass is weak. Compare rounds to each other, not to published norms.
- **Do not waste the owner's time.** Decide reversible things myself with a stated reason; bring
  the owner only one-way doors and before/after evidence for his own review items.

## Design criteria

- **Every step of the chained first session commits visibly** -- canvas and legend change the
  moment the step commits (round 8: "the panel said one thing and the drawing showed another").
- **The obvious first choice does the thing** ("Show labels" matched and did nothing; 12 of 21).
- **Every count names its unit and its whole, and is live.**
- **A count that hides something offers the way out beside it** (round 2: 8 of 8 hunted).
- **A list answers with names, not counts** (0 of 12 could answer from "Javert and 17 neighbors").
- **Nothing pre-done in a first session** (21 of 21 could not tell pre-run work from their own).
- **No unbuilt item is drawn.**
- **Words: one label per command, everywhere; field-standard terms; American spelling; no two
  reachable controls share an accessible name** ("Data" on two controls dropped the selection 12/12).
- **Screen at rest with a graph loaded: about 50 words of app text.**
- **No first-run interface** (owner ruled out wizards and suggestion cards, 2026-09-26).
- **No confirmation dialogs for undoable acts; Esc closes the innermost thing first.**
- **Every focus change says where focus goes instead.**
- **Time to first drawing under 2 minutes; the user runs at least one analysis; the user can say
  what they see** (designloom workflow W14).

## Decisions and reasons

- 2026-09-26..10-08 (summarized; full text in git history of this file) -- Owner: Figma is the
  paved path for chrome; refined structure B; a run paints as soon as it finishes; tiers, tier 1
  first; build the real app and study it; element neutral about presentation. Me: real-app
  criteria; tier 1 rounds 1-3 and their units; tier 2 design (`next-steps/tier2-design.md`);
  tier 2 pilot fixes and criteria freeze (carry-forward scoring, bar 10, bar 11 as a gate, bar 9
  (b) limited by round 1's count); round 1 dry runs one to four: fix what a participant could hit
  in its owning package, leave what the task asks.

- 2026-10-09 (summarized; full text in `tier2/rounds/round-{1,2}/decisions.md`, the dry-run files
  and git history) -- Tier 2 round 1: took the red team on five verified points (T20's one command
  doing two things; T22 words first with the element answering "is this a rule"; Replace in the
  source "..."; one stale mark; `writeLine`'s shared default); halo is a rendering defect. Round 2:
  study first (session folders outside the tree, transcript leak check, pilot-seeded dry runs,
  scripts that fail on planted faults); find box one path (miss, hint, Enter runs it); Add's repeat
  count from the element; selection's new line starts at `styles.highlightStyle`; held label
  overlap, neighbor depth, column "Select where".

- 2026-10-10..10-11 (summarized; full text in git history of this file and in
  `tier2/rounds/round-{3,4}/decisions.md`, `tier2/dry-run-r{3,4,5}-*.md`) -- Round 3: three dry runs
  (6, 1, 0 fixes); twelve changes (Shift-click in the element, toolbar Filters, `FindValueRow.atLeast`,
  edge steps count edges, runner gate); took the red team on rank-never-hide and no second-path
  notice. Owner review: label overlap re-scored with declutter on; extending declutter to dots is
  additive, the team's call, not an owner item. Round 4: two dry runs (3 fixes, then 0); twelve
  changes (gate into `real.mjs --start`, briefings name file and kind only, `suggestBackticks` uses
  the selector's acceptance, `FindResult.atLeast`, `rulePath`, off step stays off, table scope
  "visible", bar 9 (b) diff before any cut); over the red team on `rulePath` and keeping
  `--shift-click`. Round 5 dry run one: 0 fixes; 8c015b806 frozen. Round 4 closed with every change
  built and the three single-source claims scripted (all reproduced on 5277e2cbe).

- 2026-10-11 -- Round 5 came back void (0 of 56; `tier2/rounds/round-5/{scores,insights}.md`). Cause,
  checked by both skeptics against the journal: the run in flight is the continuation script written
  after the 2026-10-10 usage limit, which goes from plan straight to participants with no gate step;
  the gate step exists only in `workflow-tier2.js`, which the running workflow never read. The
  `real.mjs --start` refusal held 56 of 56, so no bad data entered. Decision: no round 5 decisions on
  specialist evidence alone; relaunch from the main script, gate first, owed round 4 sessions, then
  all 56 as `<id>b` on the same build. Reason: the build has not changed, so expert findings stand,
  and deciding fixes before readers meet the round 4 fixes would blur what round 5 credits.
- 2026-10-11 -- Tier 2 report for the owner drafted (summary, per-round bar tables, what was learned,
  changes by package with confirmation, deferred items, six owner items, next steps). The Write tool
  refused a subagent writing `tier2/report.md`, so the full text went back to the orchestrator to
  save. Owner list kept to breaking changes and one-way doors: bare numbers in rules, edge width
  unit, camera in the project file, and three compact-mantine behavior changes outside the table
  the 2026-10-10 ruling covered. Label overlap is NOT on it (additive declutter, team's call).
- 2026-10-11 -- State after the token limit, checked: the only uncommitted work was round 5's 56
  void session folders (graders finished by 07:16); committed them as the record of the void round,
  as rounds 3 and 4's folders were. `workflow-tier2.js` stays out of git on purpose
  (`.git/info/exclude`); round 5's insights said to commit it, I did not.

## Tried: worked / did not work

- 2026-09-27..10-08 (summarized; full text in git history) -- Worked: piloting every task on each
  new build; pilots naming file, line and screenshot; root-causing proposals in source (several
  "new APIs" were already half-built); one change per path; re-piloting each fix batch on the built
  result. Did not work: a check that read 0 pages passed (plant a failure); a session clock
  running while queued (14 voided); a decided rename never built; starting round 1 before a dry
  run; checking colors on flat swatches; a helper script shared between sessions.

- 2026-10-09 (tier 2 rounds 1-2, summarized) -- Worked: dry runs leaving 0 broken controls on
  walked routes; the red team reading proposals in source (found T20's cause six roles missed);
  reading the element's facts before calling a word wrong (`stale.reason`); measuring pixels
  before calling a misalignment; reading `owner-decisions.md` before ruling on a "units bug". Did
  not work: walking only the key's routes by pointer; bar scripts unbuilt at round start; the walk
  list one round behind; handing a keyboard fault to the expert pass; session folders inside the
  studio tree (13 of 16 leaked); the key copying pilot claims as facts; a local fix nobody grepped
  for siblings.

- 2026-10-10..10-11 (rounds 3-5, summarized; full text in git history) -- Worked: classing
  pilot items against the key and earlier triages first, reading source only for new ones; reading
  the red team against source before taking it; `git tag --contains` to settle breaking or not;
  `--hover`, PNG contrast and undo ratios to settle claims; pilots in waves under the 4-browser cap;
  the token-limit stops lost nothing when roles committed before them. Did not work: a gate enforced
  only by the runner (rounds 3 and 4); an acceptance line written as a word budget; 20 pilots at
  once; a watch item with no mechanism named; diagnoses cited from files not on disk.
- 2026-10-11 (round 5) -- Worked: the refusal in `real.mjs --start` (56 of 56). Did not work: editing
  `workflow-tier2.js` while a continuation script was the one running -- the fix never reached the
  run. Did not work: the runner starting all 56 sessions in parallel with nothing to stop on.

## Thinking

- **2026-10-10, after round 3:** the product's remaining problems are small doors and orderings;
  the study's are bigger. Three of round 3's measurement faults hid themselves (a check that read
  nothing, a deleted note, a skipped gate). Every study rule now needs a mechanism that refuses,
  not a sentence in a plan.
- **2026-10-10, prompt words:** a prompt that avoids naming the control must still name the
  outcome the key grades. "Point out" admits a path; "so that whatever you do next applies only to
  those two" admits only a selection without saying "select".
- **2026-10-09, round 1 lessons:** prompts can induce what they measure; credit what users do
  next, not the first door; walk the previous round's wrong turns by pointer and keyboard.
- **Real-user study design:** 5-8 analysts plus one screen-reader user; tier 1 core four; measure
  what simulation could not (Size and labels found, 3D sizes misleading, ease calibration).
- **Discovery is the remaining cost.** Do not redesign from simulated evidence alone; it is one
  shared guess. The Filters icon is the one clean case so far.
- **Where fixes go.** Graph logic (element), a word or arrangement (app), a shared control
  (compact-mantine). A fix in the wrong package is a second bug.
- **Open tension:** "a run paints as soon as it finishes" vs a reader's Everything color
  suppressing it. Owner item.

- **2026-10-11, after round 4:** the product is down to small mismatches between two checks of one
  fact; the study's faults are still the larger risk, and they hide themselves the same way (a
  check in one place, the act in another). Put each refusal in the one path every action takes.
- **2026-10-11, after round 5:** the same shape one level up: a fix in one copy of the run script,
  the run on another. Recovery after a limit is part of the study, not housekeeping; the first
  step after any restart is to diff what is running against what we last fixed.

## Sources

- Tier 2 round 3 (2026-10-10): `tier2/rounds/round-3/{plan,scores,insights,decisions}.md`;
  proposals in `notes/{user,researcher,ia,content,interaction,figma,visual,a11y,engineer,redteam}.md`.
- Round 3 dry runs: `tier2/dry-run-r3-{1,2,3}.md` (pilots in `tier2/rounds/{r3,r3d1,r3d2}/pilot/`).
- Tier 2 rounds 1-2: `tier2/rounds/round-{1,2}/{plan,preflight,scores,insights,decisions}.md`;
  dry runs `tier2/dry-run-r{1,2}-{1..4}.md`.
- Tier 2 frame: `tier2/criteria.md` (frozen; names the study build), `tier2/tasks.md`,
  `tier2/answers.md`, `tier2/roster.md`, `owner-decisions.md`, `tool/README.md`.
- Tier 1 and earlier: `criteria.md`, `tasks.md`, `answers.md`, `rounds/round-{1,2,3}/`,
  `digests/`, `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/`.
- Builds: tier 2 round 1 9d6598eea, round 2 4a7a1a7fb, round 3 26f3bb968 (served from
  `.study-builds/tier2-r3d2-26f3bb968/`); round 4 candidate 38e180aac (`.study-builds/tier2-r4-38e180aac/`).
- Round 4 dry run one: `tier2/dry-run-r4-1.md` (pilots in `tier2/rounds/r4/pilot/`).
- Round 5 dry run one: `tier2/dry-run-r5-1.md` (pilots in `tier2/rounds/r5/pilot/`); round 5
  build 8c015b806 (`.study-builds/tier2-r5-8c015b806/`).
- Round 4 dry run two: `tier2/dry-run-r4-2.md` (pilots in `tier2/rounds/r4d1/pilot/`); round 4
  build 5277e2cbe (`.study-builds/tier2-r4d1-5277e2cbe/`).
- Tier 2 round 4 (2026-10-11): `tier2/rounds/round-4/{plan,scores,insights,decisions}.md`;
  sessions in `round-4/sessions/`; proposals in `notes/*.md` (commits 6171f0486 to 90ea5b8e8).
- Tier 2 round 5 (void): `tier2/rounds/round-5/{plan,scores,insights,table}.md`, `expert/`,
  `claims/`; build 8c015b806. Run scripts: `tier2/rounds/workflow-tier2.js` (main, excluded from
  git) and the main checkout's `tmp/studio-resume/workflow-tier2-continue.js` (the stale fork).
