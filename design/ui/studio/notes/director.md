# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-11-05 (tier 6 criteria reviewed and frozen).
Summarized on 2026-10-17, 2026-10-18, 2026-10-19, 2026-10-20, 2026-10-21 and 2026-11-05; the full earlier text is in this file's git
history.

## Top of mind

- (2026-11-05) TIER 6 CRITERIA FROZEN, 12 bars: `tier6/criteria.md`. One round, then fixes walked again;
  the bars gate fixes, not a further round. Bars 11 (computed numbers true) and 12 (expert severity 2s
  answered) are new; bar 10 needs the state list; bar 5 needs at least 2 sessions with a claim on screen.
- (2026-11-05) The doubt lives in follow-ups now: T92, T93 and T95 prompts stop at the outcome, and
  `Taken on trust:`, `Checked:` and `Card:` grade the first report. A prompt that asks "how sure" measures
  obedience.
- (2026-11-05) The planted wrong count is a selection, not a falsified reply: T92 A starts with the 14
  people selected. Walked: "Of the 9 on-record sources in the selection, 6 gave donations" against the
  file's 7 of 12. The dry run must confirm it; prose against a chip stays untested and is the report's
  first limit.
- (2026-11-05) Returning readers: T91 A and T94 A (Ruth), T94 B (Grace-returning). Doubters moved off
  bar 5: T92 A and T93 A to Dev, T95 A to Grace, T95 B to Dev.
- (2026-11-05) Known defects ruled in `answers.md`: fix yeast's 82-over-361 count in the dry run; keep
  the refused key reading as a connection failure until after the round, so T90 shows how readers get
  out. Bar 4 will likely fail on it, and that is expected.
- (2026-11-04) ASSISTANT DESIGNED: `tier6/design.md`, `tier6/decided.md`, research copied to
  `design/ai/assistant-chat-research.md`. A rail place in the left panel, not a window. Reply
  language: plain text is the model's, a chip is computed, a change line is what happened. Only tool
  results are chips. Hover peeks, click selects. Undo on the newest step only. Transcript waits for
  Enter. First test: the missing layer list and a planted wrong count. Ten additive element asks in
  design section 11; two reviewers' asks were dropped because the read already exists.
- (2026-10-21) Shaders, second redesign: `design/rendering/shader-studio/decisions-v2.md`. One
  Shaders section and one gallery per tab; place (on the node, instead of, on top, around, behind,
  around the group, along the line) is an option on the row; no timing tags (layer condition, the
  layer's `keep`, clocks as values); `minSize` only where a shader declares it; Wireframe is the
  released channel plus additive `node.meshDetail`. Lesson: the first redesign kept the old
  section-per-target structure because it existed; the owner caught it. Start a redesign from the
  user's three questions, then check what survives, not the other way round.
- (2026-10-23) LOCATION IN THE FIELDS LIST (issue #3315): one "+" pick per kind of location, each an
  ordinary Fields entry. No gear, no in-row kind select, no heading in the "+" menu. `ColumnRole` gains
  the six kinds; the element resolves the source and marks an unused one with `location.unused`.
- (2026-10-23, issue #3315) MENU SECTIONS RULED: every pick list of catalog choices (Layout,
  Analyze) uses section headings, never indentation, and every row sits under a heading; Layout
  gains four headings from the catalog's `family` fact and loses its indented engine rows.
  See the decision of the same date under "Decisions and reasons" for the build spec.
- (2026-10-22) TIMELINE PROTOTYPE REVIEWED (four lenses on `feat/timeline-prototype`); rulings in
  `timeline/decisions.md`, items TL-01 to TL-32, ten rejected. Severity 1 first: Rerun throws
  `E_DUPLICATE_ID` after any window move for a named run (TL-01); a no-times column is accepted as
  the field and a field change leaves a hidden window with no way to clear it (TL-04, TL-05); a
  stale result reads current when node counts match (TL-03, staleness must compare the window).
- (2026-10-22) LOCATION MAP PROTOTYPE (branch feat/location-map-prototype, build 3137c48f2f):
  four reviews triaged into `location-map/decisions.md`. 23 items to do, 8 rejected or deferred,
  and the open one-way doors for the owner. The worst finding: Map that cannot run said nothing
  and showed "Applied" (three reviews). Fix order: false screens first (refusal, half-filled
  pair, undo), then lost data (detection, antimeridian, unplaced), then legibility (contrast,
  node scale, tiles).
- (2026-10-22) Lesson: the reviewers all asked for a refusal mechanism that already exists
  (`CostEstimate.refusal`, `layout.needs-grouping`). Grep the existing coded-fact paths before
  naming a new element mechanism.
- (2026-10-21) Same-model participants: a failure is strong evidence, a pass is weak. Do not let a
  ceiling round read as "the product is easy".
- (2026-10-19) Before a fix lands, list the routes that cross the switch it flips and re-walk
  those. A docs-only commit never refreezes.
- Owner items open: eleven, all breaking, defaults or a saved-file format (`owner-decisions.md`).

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
  moment the step commits.
- **The obvious first choice does the thing** ("Show labels" matched and did nothing; 12 of 21).
- **Every count names its unit and its whole, and is live.** A count that hides something offers
  the way out beside it. A list answers with names, not counts.
- **Nothing pre-done in a first session; no first-run interface; no unbuilt item drawn.**
- **Words: one label per command, everywhere; field-standard terms; American spelling; no two
  reachable controls share an accessible name.** Screen at rest with a graph loaded: about 50
  words of app text.
- **No confirmation dialogs for undoable acts; Esc closes the innermost thing first.**
- **Every focus change says where focus goes instead; after adding a field, focus is where the
  next keystroke belongs** (2026-10-17: three adds failed this on one build).
- **The key and the drawing never disagree** (2026-10-17: now an audit check on every last
  screenshot).
- **Time to first drawing under 2 minutes; the user runs at least one analysis; the user can say
  what they see** (designloom workflow W14).

## Decisions and reasons

- **2026-11-05, tier 6 criteria.** Applied the three reviews where they converged (returning readers,
  doubt moved to follow-ups, bars 4 to 8 tightened, a state list behind bar 10). Added bar 11 from the
  advocate and bar 12 in place of the red team's gate on severity 2s: answered, not fixed, since a quick
  round gates on harm. Rejected: a tool option for a mid-session failure (the `REAL_GEMINI_COUNT` file
  gives one free) and a model instruction that falsifies counts (the selection plant needs a setup only).
  T92 A went to Dev, a believer, because a doubter on the plant measures the briefing.
- **2026-11-04, Assistant concept.** Panel in the rail, with the chip reply language and the
  reviewed transcript grafted in. All four reviews ranked the panel over the window, and the window's
  covered-node failure is the worst one: a reader checks the wrong picture. Rejected: the window;
  folding older turns; prose mentions as chips (launders model claims); a Quick actions door as the
  no-key path; a model dropdown in the composer; glyph marks beside chips.
- **2026-10-23, Layout and Analyze section pattern (issue #3315; full text in git history).** Headings
  for both menus, every row under one, no indentation in any pick list: indentation cannot carry the
  Graphviz engines, and Layout's four headings come from the catalog's `family` fact.
- **2026-10-21, tier 3 report after round 1.** Rewrote the report around round 1 (bars table per
  round, per-task table, learnings in insight order, changes by package with whether round 1
  confirmed them). Reasons for the calls in it: bar 1's F is reported as the rule's, not the
  reader's, but stands (frozen rule); the earlier "contrast fails on every screen" is corrected to
  one chip because round 1 measured it; the owner list recounted entry by entry against owner
  rulings (eleven; fold region dropped as settled 2026-10-10); a Cube synonym listed as rejected
  (one task's word). Next steps put instrument work (bar 4 start, keyword-in-hue rule, token
  measure, leading check, start-before-turn) ahead of product fixes because it costs no sessions.
- **2026-10-21, round 1 closed, studio stops.** Accepted the skeptic-settled insights as the
  round's record: no new severity 3; bar 5 held open only by carried-in backlog items; bar 1's F
  stands under the frozen rule though the reader was right. Reason: changing a frozen rule after
  seeing results would make the grade mean nothing; the rule question goes to criteria between
  rounds instead. The next fix list leads with `colorWord` (shared, fixes grade and speech), then
  bars 6 and 8, then the four severity 2 design problems.
- **2026-10-21, tier 3 report with round 1 not run** (superseded the same day). Bars 6 and 8 not
  fixed before round 1 (round cannot pass by plan; a fix restarts the walks); the tool's 900 x 700
  gap did block the round.
- **2026-10-19..21, tier 3 dry runs and criteria reviews (summarized 2026-11-05; full text in git
  history).** Pass 3 on 758b8e8081 fixed only what blocked; triage stayed against `decided.md`; the fifth
  criteria review froze the bars; `tier3/dry-run-r1-*.md` hold each pass.
- **2026-10-17..18, earlier tier 3 criteria reviews and dry-run triages r1-1 to r1-4**
  (summarized 2026-10-20; full text in git history, the dry-run files, the criteria change log and
  `tier3/decided.md`). The exit test and `decided.md` came from the third review; bar 4 fixed at
  10; bar 5 confirmed by repro or measurement only; five walk screens added; any community method
  on T46-T48; T47/T48 hold only on the folder or several route; bar 4 pointer sessions only; bar 6
  both themes; key-and-drawing on every last screenshot. Triage rulings (Tab takes a highlighted
  option, cards open with the list closed, "+" never changes the drawing, condition card for the
  filter step, color words by CSS keyword) are in `decided.md`.
- **2026-10-17, first review of the first-use styling drafts.** T48 core at 6; unjudged tasks
  never pass; the dry run has no pass cap (owner's "until clean"). Size stays 56.
- **2026-10-16, combined Style panel and bulk iteration 7.** See Top of mind. Frozen build
  `tier3-bulk7-457aa9f0f2` (servherd design-studio-tier3). BoundValue for single and bulk
  (SpreadValues deleted); the Layer token in guillemets, purple `--cm-text-component`, weight 600,
  via VariablePill `tone`; color sets: strip of up to 4 hard stops or a gradient, a line of chits up
  to 6, else 5 and "+N", gray Other last; count in the spoken name. Spec `tier3/bulk-edit-plan.md`.
  Element adds (team): `present` leaf, `data.valueCounts`. `realignRule` maps through `all`, so an
  added card survives a re-run.
- **2026-10-14, round 6 (owner review of build 5).** Decided in `tier3/decisions-round-6.md`; every
  element change additive, no new rule text syntax. Check `git log` against owner feedback first:
  eight notes were already fixed.
- **2026-10-12..13, tier 3 build iterations 1-3** (full text in `tier3/design.md` and
  `tier3/iterations/{1,2,3}/review.md`). Two row kinds only, layer and folder; per-group colors are
  value-table entries, "New layer for <value>" makes an ordinary layer. Unset (minus, Clear) and
  cover (an entry set to nothing) are two acts. Both-kinds layers are element style-tree rows; the
  app reads only `styles.tree()`. One settings button per kind section (Figma's Type settings), not
  per property. A layer lists only its own entries. Kind change keeps both parts. The app sets
  `startingRows: true` and `runPlacement: "top"` (consumer choice; element defaults neutral).
  Label size in screen pixels is an additive element option. Before naming an element addition,
  read the API report (`styles.agreement`, `session.transaction` already existed).
- **2026-10-11, tier 2 close.** Round 5 re-run valid (55 of 55 on 8c015b806); the tasks hit their
  ceiling; owner list cut to three (bare numbers in rules, edge width unit, camera in the project
  file). The report text goes back to the orchestrator: the Write tool refuses a subagent writing
  `tier2/report.md`.
- **2026-09-26..10-11, earlier (summarized; git history and `tier2/rounds/*/decisions.md`).** Owner:
  Figma is the paved path for chrome; tiers, tier 1 first; build the real app and study it; element
  neutral about presentation. Tier 2: gate inside `real.mjs --start`; briefings name file and kind
  only; one matcher for find and rules; Shift-click in the element; labels overlap is additive
  declutter, the team's call.

## Tried: worked / did not work

- 2026-11-05 (tier 6 freeze) -- Worked: walking each proposed setup before ruling. It proved the
  selection plant with one question, and found a setup race: `--click API key` looked before Settings
  had drawn, so 1 start in 3 failed with the dialog then on screen. `--expect API key` first in every
  setup; 3 starts clean. Did not work: `--expect selected=N` reads table rows, not canvas selection.
- 2026-11-04 (Assistant) -- Worked: checking each review claim in source before ruling. It settled
  the caption fit by measuring (39.41 of 40 px, in a browser with the app's font), showed the history
  read already answers Undo so `undoAiMessage` is unneeded, and showed a new assertive region is
  unneeded because failures are `role="alert"` on their row. Worked: a selection target on effects
  instead of an id list, which removes the size cap from chips. Lesson: a reviewer's "the element
  lacks X" is a lead to grep, as with the 2026-10-22 refusal.
- 2026-10-21 (round 1) -- Worked: two independent skeptic checks with a drop/weaken rule; they cut
  every new severity 3 to 2 and caught a tool artifact (wheel zoom from one synthetic event) and
  an automation artifact (storage notice). Did not work: tasks whose wording leads (the answer key
  describes the problems graders cite; "Cube", "clusters" in B prompts) and a success bar on tasks
  the model always finishes -- 55 of 56 told us little.
- 2026-10-21 (report after round 1) -- Worked: re-reading every "For the owner" heading in
  `owner-decisions.md` and the tier 2 report's owner section instead of copying the earlier list;
  it found two open items the earlier draft dropped and one it should have dropped. Worked:
  checking each pre-round claim against round 1's measurement (contrast was one chip). Did not
  work: the Write tool again refused `tier3/report.md` from a subagent; the text goes back in the
  return value. Do not retry it next time; write it straight into the return.
- 2026-10-21 (tier 3 report) -- Worked: checking the round folder and the briefing folders before
  writing (56 briefings, no `01.png` anywhere) so the report did not invent a round. Worked:
  reading `owner-decisions.md` entries for an owner answer before listing them (the number box
  one was answered on 2026-10-10; the fold-region one may be covered by it, so it is listed to confirm). Did not work: writing `tier3/report.md` from a subagent; the
  harness refuses report files from subagents. Return the text instead.
- 2026-10-21 (dry run pass 3) -- Worked: reading the element's camera code before classing the
  most-walked jump: `followSelection` plus `setViewInsets` explained "only with a selection held"
  and the 140 px (half the key's inset) in ten minutes, so the backlog item and the decided entry
  name a cause. Worked: checking an unjudged task's (a) candidate on round 1 data already on disk
  (T48 B's plain-file Replace and Undo kept the Louvain key) instead of a new walk. Worked:
  `session.json` commits showed T48 A's "unwalked" success path was walked on the same build by an
  earlier session. Worked: the rows file plus generator again (141 rows, per-task counts asserted).

- 2026-10-17..20 (summarized 2026-11-05) -- Worked: checking reviewer claims against the tool and the
  screens before ruling. Did not work: trusting a bar the tool had not been seen to read.
- 2026-10-11..13 -- Worked: the gate inside `real.mjs --start`; reading the red team against source;
  measuring before classing. Did not work: counting steps differently for key and participants.
- 2026-09-27..10-10 -- Worked: root-causing in source; one change per path. Did not work: a fix
  nobody grepped for siblings.

## Thinking

- **2026-11-05, tier 6 criteria:** all three reviewers found the same shape: a bar can pass while the
  thing it studies never happens. Before freezing any bar, ask what it reads if the trap never fires.
- **2026-10-21, after round 1:** the cheapest next round is one where the instrument moves first.
  Every pre-round claim I carried as a measurement (contrast on every screen, the private-window
  notice gone with a disk profile) was narrower or different once the round measured it. Report
  pre-round numbers as previews, and expect the round to restate them.
- **2026-10-21, round 1:** success is saturated with same-model participants, so the next tier's
  bars should score cost (steps over key, wrong turns, routes) and named problems, not completion.
  The cheapest high-value fixes are shared ones where the product's words disagree with its
  drawing (`colorWord`) and where an action gives no visible result (default-valued new lines).
- **2026-10-21, tier 3 report:** a whole tier of work reached the owner with no round run, and
  the thing holding it back is the instrument again, as at tier 2's end. The tool has now had two
  readiness checks, and each found a bar it claimed to read and did not. Before the next tier,
  build the tool's planted cases from the criteria table row by row (each bar x each size x each
  theme), so a missing cell is a failing test, not a reviewer's find.
- **2026-10-21, dry run pass 3:** the most-walked defect came from two settled rules meeting (the
  owner's glide to a pick, the drawing staying put when a key arrives). Neither rule was wrong; the
  element had no rule for the moment after the pick. When two decided behaviors both own the
  camera, write down which one wins in the overlap before anyone fixes either.

- **2026-10-20 (summarized 2026-10-21):** two halves of one verb disagreeing (`addRow` vs
  `update`, Undo restoring layers but not the drawing) is the element's recurring defect shape;
  pilot the next verb on any newly accepted state. A merge from upstream is an untriaged fix pass:
  walk one file saved by the previous build. A frozen document naming a build needs a
  script-checkable rule.
- **2026-10-19, r1-5:** the regressions are not spread out; they come from a fix that answered one
  complaint by flipping a single switch the complaint's neighbors also depend on (when to frame,
  whether the list starts open, where focus goes after a write). Before a fix group lands, list
  the routes that cross the switch it flips and re-walk those, not the task that reported it.
- **2026-10-19, criteria review:** a rule the tool does not enforce is a wish. Three of this
  review's findings were rules already written (three walks, keyboard walk, five walk screens)
  that the gate or the walk never checked. When I write a preflight rule, name the script line
  that refuses it and the planted case that proves it, or list it as owed.
- **2026-10-17..18 (summarized 2026-10-21; full text in git history):** criteria reviews and
  readiness passes r1-2 to r1-4 kept finding instrument gaps before product gaps; build planted
  cases from the criteria table, and walk unwalked screens before trusting a bar.
- **2026-10-11, tier 2 end:** the instrument, not the product, limited what we learned. Simulated
  readers succeed where tasks send them; fixes sat where tasks did not go.
- **2026-10-12, owner review 1:** the owner judges by interaction consistency, not model fidelity.
  Ask of every new row or control: does a reader learn a rule that applies nowhere else?
- **When three lenses land on one defect,** the cause is usually one gate in one file. Every
  `ponytail:` note in the app saying "the element has no X" was a finding three experts later
  reported; read those notes at review time.
- **When a fix adds a column in 240 px,** count what each column holds before building.
- **Truth and loss outrank polish.**

## Sources

- Tier 3 study: `tier3/{criteria,tasks,answers,roster,decided}.md`; dry runs `tier3/dry-run-r1-3.md` (build 758b8e8081, 2026-10-21, pilots in `tier3/rounds/r1d2/pilot/`; the 2026-10-18 pass on 5bd16cda6e is at b296635060), `tier3/dry-run-r1-1.md` (build 7d87760756, 2026-10-20; the 2026-10-17 pass on 58556989e8 is at 7c241de4b), `tier3/dry-run-r1-2.md` (build 6de5f95d12, 2026-10-20, pilots in `tier3/rounds/r1d1/pilot/`; the 2026-10-17 pass on ed4351b258 is at 98b7f9a4df), `tier3/dry-run-r1-4.md` (build 6dd0b00bd7, pilots in `tier3/rounds/r1d2/pilot/<task>/<route>/`); tools `tool/{real,bars,score,wording}.mjs`,
  `tool/bars-limits.json`; pilots `tier3/pilot-materials/`, `tier3/build/{walk-p1..p3,pilot-bulk*}/`.
- Tier 3 reviews: `notes/{researcher,user,redteam}.md` (2026-10-17: 05f4ee91a, 863ebb9a8,
  de16901f7; 2026-10-19: c1ebeeff4, 34b1e3ce0, 881ad2550; 2026-10-20: 16b22cb0d, 70575b0cf, 3bdcc279b); stopped pass 5 in `tier3/rounds/r1/pilot/`; my walk of the proposed screens in the worktree's `tmp/director-freeze/explore*`.
- Tier 3 design: `tier3/design.md`, `tier3/bulk-edit-plan.md`, `tier3/decisions-round-6.md`,
  `tier3/owner-feedback-1.md`, `tier3/decide/`, `tier3/iterations/{1,2,3}/`, `tier3/style-catalog.md`.
- Tier 2: `tier2/criteria.md` (frozen), `tier2/rounds/round-{1..5}/`, `tier2/dry-run-*.md`.
- Builds: tier 3 bulk 7 `tier3-bulk7-457aa9f0f2`; tier 2 round 5 8c015b806
  (`.study-builds/tier2-r5-8c015b806/`).
- Owner items: `owner-decisions.md`.
