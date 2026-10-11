# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-10-10 (tier 2 round 3 decided; round 4 changes in `tier2/rounds/round-3/decisions.md`).

## Top of mind

- 2026-10-10: TIER 2 ROUND 3 DECIDED (`tier2/rounds/round-3/decisions.md`): 12 changes, study
  first. 54 of 56 succeeded; the one real product failure is Shift-click on a node replacing the
  selection (graphty-element). The T24 failures were the study's: prompt and key measured
  different outcomes, and the skipped prompt pilots would have caught it.
- 2026-10-10: THE GATE IS THE BLOCKER NOW, not the leak. Round 3's leak check read 0 logs and
  passed; `--end` deleted step notes; the pilots were skipped. Round 4 does not start until the
  runner refuses a round folder without pilot results and the bars run, and each check fails on a
  planted fault. A rule I wrote down but no script enforces is a wish.
- 2026-10-10: One variant per problem. Eight roles converged on five problems with up to four
  variants each (find box: wrap, drop prefix, "or more", reword refusal). Took one path each so
  round 4 can credit it; held the rest with the reason named once.
- 2026-10-10: A one-specialist claim is scripted before it is fixed: "Made with" after Undo, the
  two focus drops, edge-step counts, the disabled reason. No repro on 26f3bb968, no fix.
- 2026-10-10: Shift-click on a node is a defect fix, team-decided (no doc promises replace; edges
  already add). Shift only; Ctrl/Meta held (macOS Ctrl-click is a context menu).
- 2026-10-10: WATCH IN ROUND 4: (1) T24 pilots pass on both halves before the round; (2) T22's
  "or more" row picked by the bare-number typers; (3) T17 first moves vs round 3's 5 of 8 on the
  Graph place; (4) Shortest path first for "path"; (5) bar 9 re-measured without data names.
- 2026-10-10: Held twice now: distance per name at Hops 2 (one session, needs an element `hops`
  fact). First in line if a second session meets it.
- 2026-10-10: Open for after the study: graphty-element's `data.attributes()` declares
  `origin: "result"` and never sets it. If sessions say results belong in Attributes, that changes
  what an existing method returns (owner), not an app patch.
- 2026-10-10: Verify a fix by its acceptance screenshot, not its commit; name the look, not the
  component (`ControlSection` for a heading, never a column caption).
- 2026-10-09: A walk list copied from last round is always one round behind. Seed every dry run
  from throwaway pilots on the candidate build; press every control by keyboard; fix before freeze.
- 2026-10-09: Before calling a "defect" an app job, read the element; expose the fact, never
  compute or scale in the app. Bar 10 label overlap stays the element's (owner list).
- 2026-10-09: A pattern fixed in one place is a defect wherever it is missing. Grep for siblings.
- 2026-10-07: Words: glossary wins. Severity 4 needs a wrong conclusion a reader would act on.
  Before a new element API, grow an existing method. Remove before adding; words at rest never rise.

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

- 2026-10-10 -- Round 3 dry runs one to three (summarized; `tier2/dry-run-r3-{1,2,3}.md`). Fixed
  the Overview's "Full graph" heading (`ControlSection`), import header shift, stale "Selection
  cleared", "Filter to neighbors" disabled with its reason, tie-pick focus, first-reopen notice.
  Third dry run: 0 fixes, no refreeze; 26f3bb968 became the round 3 build.

- 2026-10-10 -- Tier 2 round 3 decisions (me, `tier2/rounds/round-3/decisions.md`), from the
  insights, eight proposals and the red team; each code claim checked in source at 26f3bb968.
  Twelve changes: (1) runner refuses a round without gate evidence, leak check fails on zero
  logs, `--end` keeps notes; (2) T24 prompt names the outcome ("so that whatever you do next
  applies only to those two"), key unchanged in what it measures, Shift route only once walked;
  (3) Shift-click on a node through the edge's `applyNow` path, Shift only; (4) `bars.mjs`: bar 9
  without data names, two focus-drop actions, find-list scroll check before an axe exception;
  (5) "Made with" after re-run or Undo, scripted first (`settingsOf` lays a run-id-keyed draft over
  `run.params`; the draft survives `{ as: run.id }`); (6) `PathForm` `autoFocus`, and the Color
  focus drop traced in `useFocusLine`; (7) find box: drop "Select where" from the visible row,
  element adds `FindValueRow.atLeast`; (8) Analyze ranks name/alias matches first, never hides,
  one "Start here" while filtering; (9) a Filters toolbar icon through `openStepEditor(store,
NEW)`; (10) repeated-ties line linked to Load and given the warning glyph; (11) edge filter
  steps count edges, scripted first; (12) disabled reason to a screen reader, check first, fix in
  compact-mantine Tooltip. Took the red team on: no second-path notice, no layer-list Filters row,
  no wrap, no refusal reword, no pressed toggle, no Ctrl/Meta, rank but never hide. Over the red
  team on one point: the repeated-ties warning glyph too (one look for a load problem; my rule
  that a pattern fixed in one place is a defect where missing). Held: Hops distances, "4 hops",
  commit on leaving Value, `nodesInRect` labels. Two team entries added to `owner-decisions.md`.

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

- 2026-10-10 (round 3 dry runs) -- Worked: checking each "new" item against the key and earlier
  triages first; checking earlier fixes on their acceptance screenshots; a five-step walk to
  settle a focus claim. Did not work: a unit naming a component without checking it draws as a
  heading; four triages repeating a claim about Attributes without reading `attributeRows`.

- 2026-10-10 (tier 2 round 3) -- Worked: three dry runs converging (6, 1, 0 fixes): no session
  ended on a build fault and 54 of 56 succeeded; skeptics regrading against source (both dropped
  bar 6 and the "path used to mark" problem). Did not work: my round 2 rule "no round starts until
  a planted leak is caught" -- the leak check was planted-tested once, then read 0 logs for the
  whole round and passed; the plan named prompt pilots and nobody ran them, so T24's reworded
  prompt and its key disagreed and decided two grades. Did not work: rewording a prompt to avoid
  naming the control ("point out") without re-reading the key's credit rule.

- 2026-10-10 (round 3 decisions) -- Worked: reading the red team against source before taking
  it: `Graph.ts:3632` confirmed the edge path; `settingsOf` and `{ as: run.id }` confirmed the
  draft mechanism; `openStepEditor(store, NEW)` exists so the toolbar icon needs no new route;
  `graphty-element/docs` has no promise that a node click replaces, which settled "team, not
  owner". Worked: the token-limit stop lost nothing; every role's critique and notes were
  committed before it.

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
  `.study-builds/tier2-r3d2-26f3bb968/`).
