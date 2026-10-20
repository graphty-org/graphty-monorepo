# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-10-20 (fifth criteria review and freeze).
Summarized on 2026-10-17, 2026-10-18, 2026-10-19 and 2026-10-20; the full earlier text is in this file's git
history.

## Top of mind

- (2026-10-20) Criteria FROZEN after the fifth review. Line 1 still names 3ef9e6c1ec, which does
  NOT hold the golden merge f9d8b44b9; preflight 1 now requires a build that does. The workflow's
  build freeze rewrites line 1; no walk or value on 3ef9e6c1ec counts. No owner decision needed.
- (2026-10-20) ONE round only (owner). Round 1 cannot pass (T37, T42, T44 unjudged) and has no
  stall rule; its report is held / failed / not scored per bar, never "passed".
- (2026-10-20) Dry run to the session-ready bar, at most two fix passes. Fix only crashes,
  blocked tasks and grading-spoiling wrong results (now defined: unreachable success state, or a
  count/key/drawn color that disagrees with the style tree); a keyboard block on Sam's four halves
  is a blocked task; every backlog row gets a severity, a known 3-4 counts once in bar 5.
- (2026-10-20) Keyboard walks only on Sam's halves (T39 A, T40 A, T47 B, T48 A). After a fix pass a
  half holds with a fresh success walk plus older walks on routes no fix touched.
- (2026-10-20) Owed tool work, unbuilt through three reviews, now gate refusals: `WALKS3` five
  screens, "Starts with" typing, `spoken.json`; `wording.mjs` irregular forms, `spoken.json`,
  phrase echoes; `gateCheck` keyed by half. Each with the planted case preflight 3 lists.
- (2026-10-20) Owed values: all six community methods on T46-T48 twice, T51 palette, on the new
  build. `answers.md` success paths were read on e3c5bca8e6; re-read them.
- (2026-10-20) A design problem is confirmed only across two task halves (or one session plus a
  repro); a build defect keeps the old rule.
- (2026-10-20) Core halves need 2 S/SD from sessions other than Alex and Maren; Alex now on T46 A,
  Dev on T48 A.
- (2026-10-20) Colors graded by compact-mantine `colorWord` hue word; "dark"/"bright" recorded.
- (2026-10-20) T50 B summary reading = S (no one at exactly 30 hours); `Read from:` on T50 grades.
- (2026-10-19) Three pass-4 fixes made 29 of 37 regressions; before a fix lands, list the routes
  that cross the switch it flips and re-walk those.
- (2026-10-19) A docs-only commit never refreezes (empty diff of graphty, graphty-element,
  compact-mantine, lockfile against the named build).
- (2026-10-16) Combined Style panel spec is DECIDED (`tier3/design.md`).
- (2026-10-13) PUSH BLOCKED by SonarQube findings on the studio branch's lines; needs an engineer
  unit with the owner's leave. No bypass trailer.
- Owner items open: default label font fallback; the five tier 3 breaking items; whether label
  decluttering is an undo step (`owner-decisions.md`).

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

- **2026-10-20, fifth review of the tier 3 criteria, frozen.** Taken: the round 1 build must hold
  golden (all three; I checked `git merge-base --is-ancestor f9d8b44b9 3ef9e6c1ec`: fails); round
  1 verdict rule (all three); design problems confirmed across two halves (researcher); colors by
  `colorWord` (red team's measurability point, without its new `score.mjs` bands: one table only);
  core halves need 2 S/SD without Alex/Maren, bar 1 also without Sam, roster swap Alex T48 A <->
  Dev T46 A (researcher); backlog severities, known 3-4 count once (user advocate, red team); the
  one place that says what experts and audit feed, key-and-drawing check after grading by script
  (all three); preflight 3 planted cases (researcher); preflight 4 defines grading-spoiling, Sam's
  keyboard blocks block, keyboard walk on Sam's halves only, older walks on untouched routes count
  (user advocate, red team); missing screens and `spoken.json` are gate refusals, the gate's missing
  list is the queue (red team, user advocate); T50 B summary = S with `Read from:` (researcher, red
  team; I checked `volunteers.graphml`: no 30); T46/T47 drop "keeps its own color" (researcher;
  the token speaks "each layer's own value"). Not taken: dropping T37 from the judged set (its
  find-by-rule route is not the first-move measure); SD for T50 B. The red team's ACTION NEEDED
  (which build) is not an owner call: the workflow freezes a build after the criteria, and the
  rule now says which one counts.
- **2026-10-19, dry-run triage on e3c5bca8e6 (`tier3/dry-run-r1-5.md`).** Team calls,
  reversible, all in `tier3/decided.md`: the drawing moves only when the reader asks (reverses the
  2026-10-18 arrival frame; 16 walks jumped); with no condition, Which nodes opens on the attribute
  list and "Add a condition" never closes it (settles the r1-4 / 9f8c35c76 flip); a card with no
  value shows no count, a typed count is spoken once on a pause (settles the r1-1 / r1-2 flip);
  Escape clears a selection only on a node's or selection's inspector and returns to the layer it
  came from (settles r1-3 / r1-4); Escape keeps what was typed in a card; any match pick focuses
  the value box; Tab and remove never pull focus back; F6 cycles five regions, never a separator;
  a node is called by its element label everywhere; Control+A selects all; "New layer from
  selection" makes the layer. Kept (b): the list in Top of mind. No API change.
- **2026-10-19, fourth review of the tier 3 criteria, frozen on 1fa51e2b0b.** Taken: bar 2 states
  T49's exception (researcher); bar 5 unscored when the walk skipped a success-path screen, and
  experts/audit count only via repro or measurement (user advocate); bar 6 checks typing after
  "Starts with" (all three; T40 B walk lost `GAL`); bar 7 confirmed by a `--keys` repro or two Sam
  sessions (red team); selected styled nodes graded by the tree's color, a misleading tint is a
  key-and-drawing finding (user advocate); `spoken.json` for accessible names, live-region text and
  notices, irregular forms joined, round 1 wording baseline = `tasks.md`'s kept lists (all three);
  docs-only commits do not refreeze (researcher; 1fa51e2b0b reset the count for nothing); the dry
  run walks only planned halves, blockers first, a stopped pass is finished (researcher, user
  advocate: 9 of 33 walks went to unplanned T37/T42); gate keyed by half with three walks
  (red team; I read `gateCheck`: it keys by `basename(dir)`, the walk folder, confirmed); a
  non-repeating community method graded against the session's own run (researcher); card types
  reported with their domain count (researcher); T51 to 4, T44 to round 2 (user advocate; T51
  answers question 6, T44 none); T50 "color them", `draw` kept in T43/T47/T51 (all three);
  "Owed before round 1" list in every freeze entry (red team). Not taken: T41 B "missing" in one
  half only (mixes wording with data; echoes no screen word); T51 B on College football's
  conferences (unpiloted half, new reference values, B changed a day ago).
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

- 2026-10-20 (criteria review) -- Worked: reading the design-studio skill before taking the red
  team's "owner picks the build": the workflow writes line 1 when it freezes a build after the
  criteria, so the right fix is a checkable rule (`--is-ancestor f9d8b44b9`), not a question.
  Worked: one Python script with exact-once replacements for four files (it refused nothing, and a
  miss would have stopped it). Worked: checking the claims I relied on (golden ancestry, the
  token's spoken name in `words.ts`, no 30-hour volunteer). Did not work: "does not pass until"
  sentences in preflights; three reviews found the same tool work unbuilt. Gate refusals instead.
- 2026-10-19 (r1-5) -- Worked: reading each pass-4 fix commit's message before classing origin.
  ef2f796ee says in words "an overlay that arrives over a drawn node frames the graph once", and
  9f8c35c76 "a layer with no condition opens ... with its list closed": two lines named 26 of 37
  regressions. Worked: grepping `skipWhileDisabled` showed the dimmed-Undo rule of 2026-10-18 was
  decided and never built (Header.tsx still passes it), so it is "new", not a regression. Worked:
  reading `owner-decisions.md` before ruling on the tree's Tab entry: the team set Everything as
  the resting row on 2026-10-18, so ten "against decided" rows were a transcription error.
  Worked: a script counting classes and origins against the input lines (369 both).
- 2026-10-19 (criteria review) -- Worked: reading `gateCheck` before taking the red team's gate
  claim (it was right: `basename(dir)` is the walk folder) and diffing the app paths between
  52cb47a85a and 1fa51e2b0b (empty) before writing the docs-only rule. Worked: recounting the
  roster by script after the T51 swap (56; every persona's count held). Did not work: naming a
  new build for a docs-only commit on 2026-10-18; it reset the dry run's count and spent a night's
  walks on halves already walked. Did not work: my 2026-10-18 note that the gate "already refuses
  a half with no pilot": true only for a pilot directly under the half folder.
- 2026-10-18 (criteria review) -- Worked: checking each reviewer claim against the tool before
  writing a rule: `real.mjs` gateCheck already refuses a half with no pilot on the frozen build,
  `score.mjs` already accepts `Route: around` outside the bulk routes, and the stemmer keeps
  "draw" and "drawn" apart, so only the "drawn" prompts needed rewording. Saved two tool changes.
  Did not work (four builds running): logging "bar 4 still reads 6 against a key of 5" in each
  change log and deferring it "between rounds" when no round came; a known wrong bar should be
  fixed at the next freeze, not carried.
- 2026-10-18 (r1-4) -- Worked: counting the input lines per task against my rows before writing
  the header (283 both); it catches a dropped line cheaply. Worked: reading `NodeBehavior.ts`
  before classing the stuck Hovered count: hover ends only in a canvas `onPrePointerObservable`
  callback, so any exit that is not a canvas pointer event leaves it on. Did not work: launching
  about seven pilots against four browser slots; three never ran and one returned nothing.
- 2026-10-18 -- Worked: reading each pilot's `session.json` (`commit`, `uncommittedChanges`) before
  classing. It showed which lines came from the old build, which tasks were never piloted on the
  new one, and that the frozen build had uncommitted source. Worked: grepping the on-screen string
  (`exampleRule` in `FindBox.tsx`, `colorWord` hue bands in compact-mantine `color-utils.ts`) to
  find the mechanism; 800080 sits at hue 300, inside the "pink" band. Did not work: r1-2's Escape
  fix in the find box, judged alone again; it turned Escape-to-leave into clearing.
- 2026-10-17 -- Worked: reading `owner-decisions.md` before classing. Six "defects" were decided
  behavior (menu starts on its first row, Reset drawn disabled at the default, Tab closes a pop-out,
  right-click inside a selection keeps it, one Clear glyph, tree as one Tab stop), and two showed a
  decided rule not met (shortcuts kept out of names; Reset beside its field). Worked: lists, not
  tables, for a 366-row triage (r1-1's padded tables reached 223 KB). Did not work: the r1-1 fix of
  Escape keeping focus was judged alone; nobody walked the click after it.
- 2026-10-17 -- Worked: triaging the dry run by mechanism, not by report. About 490 lines from 30
  pilots collapsed into 21 fix groups because the same few causes surfaced in every task (one
  focus rule, one live-region pattern, one Escape handler). Grepping the strings first
  ("A rule set elsewhere" in `style/cards.ts`, "Row name" in five files) named the owning file
  before writing a unit. Did not work: three pilots could not write their report.md (the harness
  refused a subagent's Write); their findings survived only in the returned text.
- 2026-10-17 -- Worked: running `bars.mjs` on new walk screens and walking reviewers' proposed
  screens by hand with `real.mjs` before adding them (found the T50 blocker; `--expect Box` passes
  while the shape grid is open, so expect only after Escape). Did not work: a recovery that pressed
  Escape dropped the unfinished card and lost the rest of the walk.
- 2026-10-17 -- Did not work: my own first-review call that "one by one" counts toward T47's route
  bar. Two reviewers showed it lets the core bulk task pass with the bulk edit never used.
- 2026-10-11..13 -- Worked: the gate inside `real.mjs --start`; reading the red team against source;
  measuring before classing. Did not work: counting steps differently for key and participants.
- 2026-09-27..10-10 -- Worked: root-causing in source; one change per path. Did not work: a fix
  nobody grepped for siblings.

## Thinking

- **2026-10-20, criteria review:** the build line went stale the same way twice (a docs commit,
  then a golden merge after the freeze). A frozen document that names a build needs a rule that a
  script can check against the build, not a sentence about what the build contains.
- **2026-10-19, r1-5:** the regressions are not spread out; they come from a fix that answered one
  complaint by flipping a single switch the complaint's neighbors also depend on (when to frame,
  whether the list starts open, where focus goes after a write). Before a fix group lands, list
  the routes that cross the switch it flips and re-walk those, not the task that reported it.
- **2026-10-19, criteria review:** a rule the tool does not enforce is a wish. Three of this
  review's findings were rules already written (three walks, keyboard walk, five walk screens)
  that the gate or the walk never checked. When I write a preflight rule, name the script line
  that refuses it and the planted case that proves it, or list it as owed.
- **2026-10-18, criteria review:** an exit rule that cannot be met is not a rule; everyone just
  keeps going. "Repeat until nothing new" read as rigor and produced four passes with no stop.
  An exit test must name what is tolerated (polish, off-path confusion) as well as what is not,
  and the tolerated part must have a destination (the backlog, the sessions).
- **2026-10-18, r1-4:** the count fell again (324 to 283) but the severity 3s moved to new places,
  each next to an earlier fix: "+" waiting at the default (r1-3) made an unset line that cannot
  take the default; the card opening its list (focus where the next keystroke belongs) made a
  read-only visit a rewrite. When a fix changes what an untouched control does, pilot the act of
  only looking at it.
- **2026-10-18, r1-3:** three passes in, the (a) count falls slowly (490, 366, 324) because each
  fix group's neighbors grow new defects (Escape in find, "+" starting values, the key insets). The
  (b) list has not changed since r1-1: the same six questions. The dry run has done its job when
  the (a) lines are mostly old-build carry-overs; count only lines confirmed on the new build.
- **2026-10-17, r1-2:** a focus fix moves the defect one keystroke later. Keeping focus in the box
  after Escape was right, and it made the next click the new failure on twelve tasks. When a fix
  changes where focus rests, the pilot must walk the next pointer act and the next key from there.
- **2026-10-17, dry run:** pilots that walk every task by keyboard find the same few defects
  thirty times. The cost of a defect to the study is its spread, not its severity: one focus rule
  broke every styling task's success path. Rank fix groups by how many tasks they touch, and pilot
  the keyboard path before the detours next time.
- **2026-10-17, criteria review:** each reviewer found a place where a bar could hold while the
  thing under study was never used (route bar, bar 4 on keys, an unwalked popover). The pattern
  from tier 2 repeats one level up: a bar measures a proxy, and the proxy drifts from the act. For
  every bar, ask "what is the cheapest way to pass this without doing the thing?" before freezing.
- **2026-10-17, unwalked screens:** the experts, the wording check and bar 6 all read only the walk
  list, so the walk list decides what the study can find. Any task success path that crosses a
  screen not on it is a blind spot; check each task's key against the walk at every freeze.
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

- Tier 3 study: `tier3/{criteria,tasks,answers,roster,decided}.md`; dry runs `tier3/dry-run-r1-1.md`, `tier3/dry-run-r1-2.md` (build ed4351b258), `tier3/dry-run-r1-4.md` (build 6dd0b00bd7, pilots in `tier3/rounds/r1d2/pilot/<task>/<route>/`), `tier3/dry-run-r1-3.md` (build 5bd16cda6e; pilots in `tier3/rounds/r1d1/pilot/<task>/5bd16cda6e/` or the task's top folders, see each `session.json`); tools `tool/{real,bars,score,wording}.mjs`,
  `tool/bars-limits.json`; pilots `tier3/pilot-materials/`, `tier3/build/{walk-p1..p3,pilot-bulk*}/`.
- Tier 3 reviews: `notes/{researcher,user,redteam}.md` (2026-10-17: 05f4ee91a, 863ebb9a8,
  de16901f7; 2026-10-19: c1ebeeff4, 34b1e3ce0, 881ad2550; 2026-10-20: 16b22cb0d, 70575b0cf, 3bdcc279b); stopped pass 5 in `tier3/rounds/r1/pilot/`; my walk of the proposed screens in the worktree's `tmp/director-freeze/explore*`.
- Tier 3 design: `tier3/design.md`, `tier3/bulk-edit-plan.md`, `tier3/decisions-round-6.md`,
  `tier3/owner-feedback-1.md`, `tier3/decide/`, `tier3/iterations/{1,2,3}/`, `tier3/style-catalog.md`.
- Tier 2: `tier2/criteria.md` (frozen), `tier2/rounds/round-{1..5}/`, `tier2/dry-run-*.md`.
- Builds: tier 3 bulk 7 `tier3-bulk7-457aa9f0f2`; tier 2 round 5 8c015b806
  (`.study-builds/tier2-r5-8c015b806/`).
- Owner items: `owner-decisions.md`.
