# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-10-11 (tier 2 round 4 decided: `tier2/rounds/round-4/decisions.md`; 12 changes).

## Top of mind

- 2026-10-11: TIER 2 ROUND 4 DECIDED (`tier2/rounds/round-4/decisions.md`): 12 changes, study
  first. 53 of 53 valid succeeded; T24 2 of 4 to 7 of 7 on the Shift-click fix. Product items:
  the find box's refused bare-number suggestion (element), "or more" for any in-range number
  (element `FindResult.atLeast`), an off filter step turning on when its editor closes (app), the
  table ignoring a filter step (app, scope "visible").
- 2026-10-11: THE GATE MUST LIVE WHERE EVERY SESSION PASSES. `--gate` and the runner check both
  existed and round 4 still ran ungated (a continuation or hand start skips a runner check). Move
  the refusal into `real.mjs --start`. Round 5 waits for it, shown on a planted fault.
- 2026-10-11: THE BRIEFING LEAKED ANSWERS for two rounds (the data-file table named Mo, Nia,
  6 - w, s11). Every "noticed unprompted" count from rounds 3-4 is discounted. Leak checks must
  read briefings, not only logs.
- 2026-10-11: Both new severity 3 defects were ONE QUESTION ANSWERED BY TWO TESTS (suggestion's
  parse vs the selector's acceptance; the editor's "unchanged" vs the save on leave). Look for
  more pairs like that before adding features.
- 2026-10-11: Keep the tool's modifier clicks in the briefing. Removing `--shift-click` would make
  T24 measure the tool; discount the priming instead.
- 2026-10-11: Bar 9 (b): no word cut before a diff names the added words; a true scope fact is
  never cut to pass a count. If the diff names only scope words, the bar fails honestly.
- 2026-10-11: Owed before round 5: r4-s05b, r4-s20b, r4-s28b from new folders, scored into round 4.
- 2026-10-11: A PILOT SCREENSHOT CANNOT PROVE A TOOLTIP IS MISSING; walk the claim (`--hover`)
  before classing it. Check an accessible name in source before calling an a11y fault.
- 2026-10-11: A FIX THAT REPLACES ONE COUNT WITH ANOTHER IS A NEW HALF-TRUTH. Add the missing unit.
  A new door inherits every pattern the old doors have; walk it with nothing chosen.
- 2026-10-10: Open for after the study: graphty-element's `data.attributes()` declares
  `origin: "result"` and never sets it (owner item if results belong in Attributes).
- 2026-10-10: Verify a fix by its acceptance screenshot, not its commit; name the look, not the
  component.
- 2026-10-09: Seed every dry run from throwaway pilots on the candidate build; press every control
  by keyboard; fix before freeze. A walk list copied from last round is one round behind.
- 2026-10-09: Before calling a "defect" an app job, read the element; expose the fact, never
  compute in the app. Label overlap stays the element's (owner list).
- 2026-10-09: A pattern fixed in one place is a defect wherever it is missing. Grep for siblings.
- 2026-10-07: Words: glossary wins. Severity 4 needs a wrong conclusion a reader would act on.
  Before a new element API, grow an existing method. Words at rest never rise.

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

- 2026-10-11 -- Owner review: round 3's "drawn names overlap" finding was measured with declutter
  off. graphty-element already declutters labels (`layoutBehavior.labels.declutter`) and the app
  turns it on; the setups that tick "Show all labels" turn it off. Re-score the finding with
  declutter on; tick "Show all labels" only where a task needs every name, and say why in
  tasks.md (T24 does: it needs every name drawn). What may remain is separate: declutter avoids
  label-on-label only, not a label over a dot or an edge, and two nodes can overlap in the layout
  itself. Extending declutter to dots is an additive element option (team's call). Not an owner
  item; do not report it as one.

- 2026-10-11 -- Round 4 dry run one (me, `tier2/dry-run-r4-1.md`). Fixed: (1) a step over an
  edge column names both counts on its row and the chip ("20 to 19 nodes, 41 to 12 edges"; "19 of
  20 nodes, 12 of 41 edges"), because the step changes both and T17 asks for people; (2) the step
  editor's disabled "Add step" says what is missing, the "Filter to neighbors" pattern; (3) a
  run's "Values" section under the "Values" tab is renamed "Distribution". Not fixed: the
  segmented control's dark chosen face (owner chose Figma's face on 2026-10-10; graders told the
  darker face with the edge is the chosen side); the toolbar tool not starting from the Data
  page's column (a door question T17 credits); "Back to Javert" showing no ring (checked in
  source: focus is on Degree, ring by `:focus-visible` only). T12R B never ran (browser slots
  full); it goes into dry run two.

- 2026-10-11 -- Round 4 dry run two (me, `tier2/dry-run-r4-2.md`). No fixes: 38 design, 40 no
  change, 7 owner, 6 process. Checked the four items that read as new: (1) the Filters tool's
  grayed "Add step" shows "Choose an attribute first" on hover (walked on 5277e2cbe in a scratch
  session; the pilots never pointed at it); (2) the neighborhood group's accessible name is its
  heading (`ControlSection`, `aria-labelledby`); the run-together text was `real.mjs` describing
  an ambiguous match by `aria-label || textContent`; (3) the tie inspector's gray values measure
  7.3:1; (4) the note card's ring after Escape was classed in round 3 dry run one. The first dry
  run's three fixes hold on their screenshots (T17A/07 both counts, T21A/07 "Distribution").
  Reason: a dry run that finds only known items means the build is ready; a fourth refreeze
  would spend a day for nothing a participant could hit.

- 2026-10-11 -- Tier 2 round 4 decisions (me, `tier2/rounds/round-4/decisions.md`), from the
  insights, nine proposals and the red team; every code claim checked in source at 5277e2cbe.
  Twelve changes: (1) the gate refusal moves into `real.mjs --start`, the runner takes the
  machine browser slot before starting a participant, an unstarted session is re-run; (2) the
  briefing's file table names file and kind only, the leak check reads briefings; (3)
  `suggestBackticks` uses the selector's acceptance test (parse plus an attribute read); (4)
  `FindResult.atLeast` for an in-range number not a value; (5) the filter editor's leave returns
  early on the step's own rule; (6) New project > Discard crash, script then trace; (7) three
  single-source claims scripted (missing column, Escape on a swatch, label vs tie click); (8) the
  table uses scope "visible", "12 of 41 edges", `useVisibilityVersion`; (9) element export
  `rulePath`, app's `columnText` deleted; (10) note Cancel focuses "+"; (11) T17 histories stop
  naming the toolbar; (12) bar 9 (b) word diff before any cut. Took the red team on: element fix
  not app guard for the suggestion; one field name (`atLeast`); no Values-first reorder; no table
  notice line; no `on: s.on`; fix the off-step now (the code proves it); hold the warning-mark
  rule. Over the red team on two points: a new `rulePath` export (without it the app copy of the
  name rule cannot be deleted), and keeping `--shift-click` in the briefing (three roles wanted
  it out; removing it makes Shift-click impossible in the tool). Over Researcher, Figma and
  Content: ", full graph" stays unless the diff shows it is not the added word and not a fact.
  Checked: `suggestBackticks` (79b7000b4) and `atLeast` (9b69ca650) are in no released tag, so all
  element changes are the team's call (`owner-decisions.md`, 2026-10-11 entry).
- 2026-10-11 -- State after the token limit: every role's critique and notes were committed
  before it; the round 4 session folders (56, 56 MB, all graded) were left uncommitted and are
  committed with these decisions, as round 3's were.

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

- 2026-10-11 (round 4 dry run one) -- Worked: classing each pilot item against the key and the
  round 3 triages first, then reading source only for the three that were new; reading the commit
  behind a "regression" (`cab733e18` was the owner's own choice, `8ab196fb3` was ours). Did not
  work: round 3 change 11's acceptance ("words unchanged in number") forbade the extra unit, so
  the fix could only swap one half-count for another; an acceptance line must name the task that
  reads the value, not a word budget. Did not work: running 20 pilots at once against a 4-browser
  cap -- one start never got a slot and printed nothing.

- 2026-10-11 (round 4 dry run two) -- Worked: all twenty halves ran when started in waves under
  the 4-browser cap; one `--hover` settled a claim four screenshots could not; measuring contrast
  from the PNG instead of guessing from "dim gray". Worked: the token-limit stop lost nothing --
  the pilots were complete on disk and the key was already matched to them (611e8c62b); only the
  triage and these notes were missing. Did not work: pilots reporting "no hint" from a still
  screenshot; their reports must say whether they pointed at the control.

- 2026-10-11 (round 4 decisions) -- Worked: reading each proposed mechanism in source before
  ranking it (the Visual Designer's "only when it parses" is already the code; `TableDock` has no
  visibility subscription; the export comment shows Export will not follow the table). Worked:
  `git tag --contains` settled "breaking or not" in one command for both element changes. Did not
  work: the researcher's bars.json word lists cited as evidence were not on disk; a diagnosis
  without its file is a claim, so change 12 makes the diff first. Did not work, again: a gate
  enforced only by the runner (rounds 3 and 4).

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
- Round 4 dry run two: `tier2/dry-run-r4-2.md` (pilots in `tier2/rounds/r4d1/pilot/`); round 4
  build 5277e2cbe (`.study-builds/tier2-r4d1-5277e2cbe/`).
- Tier 2 round 4 (2026-10-11): `tier2/rounds/round-4/{plan,scores,insights,decisions}.md`;
  sessions in `round-4/sessions/`; proposals in `notes/*.md` (commits 6171f0486 to 90ea5b8e8).
