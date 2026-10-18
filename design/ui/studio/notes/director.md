# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-10-18 (fourth tier 3 dry run, r1-4, triaged). Summarized from 42 KB
on 2026-10-17; the full earlier text is in this file's git history.

## Top of mind

- (2026-10-18) DRY RUN r1-4 TRIAGED (`tier3/dry-run-r1-4.md`; r1-3 is the pass on 5bd16cda6e and
  stays): 283 lines from the pilots on build 6dd0b00bd7 (clean tree), 14 fix groups; round 1 waits
  for a new frozen build and a re-pilot. Severity 3s: an unset line cannot take the color it shows
  (T48, T49); "cube" in the shape list applies Cylinder; opening a colleague's rule and pressing
  ArrowDown, Enter rewrites it, and the card shows the old value after Undo; Enter on Memberships
  drops focus on the separator.
- (2026-10-18) Most spread (a) on 6dd0b00bd7: Enter in a new Color box sends focus to the "+" it
  just disabled (nine tasks); the Hovered layer stuck at 1 after the pointer leaves the canvas (nine
  tasks; hover ends only on a canvas pointer event); disabled "+" as Tab stops (five).
- (2026-10-18) Two r1-3 fixes did not land or did not hold on 6dd0b00bd7: the find box still shows
  `graphty.degree` / `results.degree.value`, and focus after "Remove node color" still goes to
  Effects' "+". Re-pilot each of last pass's groups by name, not only the new list.
- (2026-10-18) Pilot gaps on 6dd0b00bd7: T39A, T39B, T41B never ran (browser slots full; a start
  waits with no deadline), T46A returned nothing, T37A and T43B keyboard walks missing. Start at
  most four pilots at once, these first.
- (2026-10-18) r1-3 (build 5bd16cda6e) was frozen from a dirty worktree; never freeze from a dirty
  tree again (6dd0b00bd7 was clean).
- (2026-10-17) Long Tab walks (8 to 20) are (n): F6 reaches the inspector in one press. Whether a
  keyboard participant finds F6 is a round 1 question.
- (2026-10-17) Most repeated (b), unchanged since r1-1: what names a node (ids everywhere); where
  "who" and "draw by" live (Data place, Highest, summaries); hover names; what Enter in find takes;
  a card's or chip's count read as the layer's; "and" between cards; how a selection looks while
  it is styled; canvas keyboard walk.
- (2026-10-17) Questions to read first in round 1: does anyone read the purple <<Layer>> token as a
  column named Layer; does anyone click a chit; is the collapsed picker found unprompted; is Escape
  expected to cancel; are edges sought on the Node tab; is a chip's count read as the total.
- (2026-10-16) The combined Style panel spec is DECIDED in `tier3/design.md`, "2026-10-16 -- The
  combined Style panel": tabs Node/Edge; Paints control deleted; one card per field; presence is a
  Match option; Escape keeps edits, "Done" only; bulk: shared cards edit all, differing cards read
  <<Layer>> and are not written in bulk; Add ANDs into every layer. If anyone rebuilds a split row,
  child rows, "Follow parent" or app-side pairing of node and edge parts, stop it.
- (2026-10-13) PUSH BLOCKED by 213 SonarQube findings on this branch's lines; most vanish by merging
  `design/studio-tier1` (conflicts in five files). Needs an engineer unit with the owner's leave to
  merge the base. No bypass trailer.
- Owner items open: the default label font fallback; the five tier 3 breaking items
  (`owner-decisions.md`). Words at rest never rise. A severity 4 needs a wrong conclusion a reader
  would act on.

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

- **2026-10-18, dry run r1-4 triage.** Team calls, reversible: Tab in a list with letters typed and
  an option highlighted takes it (refines "Tab closes a pop-out"; two pilots lost a nearly made
  condition); an existing card opens with its suggestion list closed (T50A rewrote a colleague's
  rule with two keys); a disabled "+" leaves the Tab order but keeps its hover reason (a dimmed
  Undo stays reachable so its state can be read); Escape on a node's inspector clears the
  selection as the canvas menu promises, Escape in the table grid goes to the Table button;
  Control+Y redoes; an unset line takes the value it shows on Enter or when typed; a key lists only
  the values its layer's nodes hold. No API change. Kept (b), again: the list in Top of mind.
- **2026-10-18, dry run r1-3 triage.** Team calls, reversible: a second Escape in an empty find
  box leaves the box and keeps the selection (reverses r1-2, which made it clear a find-made
  selection; four pilots lost the selection they had just made); a "+" never changes the drawing
  (its line starts at what the nodes draw now, or waits at the default like a folder's "+", and is
  keyed only once a value is picked; r1-2's starting value repainted a node from its own Style
  tab); the filter step uses the condition card (one component for "which nodes"); color words name
  an exact CSS color by its keyword and give indigo and purple their own bands; an undirected
  graph's edge table says "Node A" and "Node B". Kept (b), again: node names, a node's own Style
  tab styling one node, where the color of everything lives, the key's lines leading anywhere,
  Enter in find, a card's count, "and" between cards, Escape in a card, live count while typing.
- **2026-10-17, dry run r1-2 triage.** Team calls, reversible: a committed color box selects on a
  click (reverses r1-1, which called the caret platform behavior before its own fix kept focus in
  the box after Enter and Escape; twelve tasks then hit a glued color); find's hint shows the plain
  `donations >= 10000` the box already reads (r1-1 left the backtick hint as a design question, but
  the plain form works, so the backticks are polish); F6 answers the long Tab walks; the canvas
  toolbar is entered at its first item (compact-mantine `Toolbar startAt`, additive); the rule check
  names structural degree as a candidate (element, additive), since "No column named degree" sat
  beside a Degree section. Both additive items in `owner-decisions.md`. Kept as (n): arrow cursor,
  consent order and its leaving, Escape clearing a search before closing, a grid's one Tab stop,
  Tab closing a pop-out, blanks sorting last, the T49 tree-versus-drawing difference (the key grades
  the drawing).
- **2026-10-17, dry run r1-1 triage.** Team calls, reversible: the base layer Everything is not
  narrowed (a condition on it removed every other node from the drawing in four pilots; a reader
  who wants fewer makes a layer); Escape in a style field keeps focus in the field everywhere (the
  2026-10-13 "leaves the field" rule left focus on the page); arrow cursor over buttons stays
  (compact-mantine sets it on purpose); wheel zoom toward the pointer as an additive element option
  the app turns on; a palette that covers the group count instead of extending eight colors
  (both recorded in `owner-decisions.md`). Classed (b) and left in: node names, hover names,
  canvas keyboard walk, Enter in find, "at least", where Escape cancels, the Layer token, a
  card's count read as the total, where a new layer lands beside a run's folder.
- **2026-10-17, second review of the tier 3 criteria, then frozen.** Taken (researcher, user
  advocate, red team):
    - T47 and T48 hold bar 1 only on the folder or several route; T48 gets `Route: folder | several |
one by one | cover` (`score.mjs` ROUTE_TASKS). Reason: both core bulk tasks could pass with the
      bulk edit never used; the earlier "one by one counts" was my own call and it hid exactly what
      question 3 asks.
    - T47 A asks for cubes, as B. Reason: "clearly bigger" had no threshold, its key asked for "the
      same for all" which the prompt never said, and the halves then tested two properties, not one
      on two domains. T43 already tests bigger.
    - Question 3 also reads T46 (the folder's color is the trap there), with a `Token:` grade line on
      T46 and T47. Reason: T47's prompt states the token's meaning, so leaving it alone there proves
      nothing.
    - Bar 4 over pointer sessions; non-S/SD counts as never. Reason: Sam's Tab presses are another
      unit; an all-wrong-color drawing was counted as styled.
    - Bar 6: both themes (`REAL_SCHEME`, new in `real.mjs`; `bars.mjs --tier 3 --scheme`), a typed
      check after adding a text card, a Color line and a Shape line (fails today, see Top of mind),
      and the screens success paths cross that the walk missed (color and size bound to data and
      their popovers, the "Color from each layer" dialog, an Edge tab condition at rest, a colleague's
      project and its layer, the filtered analysis list whose descriptions join the vocabulary).
    - Audit checklist written, with key-and-drawing agreement on every last screenshot as severity 3.
      Only confirmed severity 3-4 feeds a bar; the any-severity count is a measure over the same
      screens. Expert plus session on one problem counts once.
    - Bar 1's counts written out (4 sessions need 4 of 4; 6 need 5 of 6, 2 of 3 per half).
    - Roster: Maren off T39 (to T43 A), Alex off T40 B (to T38 A), Tom off T51 B (to T49 A); Ruth,
      Grace fill. Every count unchanged.
    - Words: T48 A "circles"; "one another" for "each other" (the groups analysis's description says
      "each other"); T37 "the most ties to others" (its "connected" keep was false: an Analyze card is
      "Most connected"). `wording.mjs` now lists kept words that are on screen.
    - Not taken, with reasons: the stall rule reading the any-severity count (grows with screens
      walked); T45 halves given one card type (the task is picking ties on the Edge tab in both); a
      newcomer on T44 A (unjudged at 2, runs at 4 in round 2); failing on a kept word newly on screen
      (read and re-justify instead); renumbering `bars.mjs` (the criteria name its numbers instead).
- **2026-10-17, first review of the first-use styling drafts.** T48 core at 6 (bulk meets picking);
  T47's route recorded; T37's slots to T48, T42's to T51; unjudged tasks never pass; bar 4 ends at
  every node in one new color; bar 8's limits only fall; the dry run has no pass cap (owner's "until
  clean"); my watch items became measures. Size stays 56.
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
- 2026-10-17 -- Ran `bars.mjs --tier 3 --scheme dark` on build 6ddcb6c7c with the new walk. Worked:
  every new screen of the own-file and folder walks (color and size bound to data, their popovers,
  the "Color from each layer" dialog, adding a shape) reached with no MISS; the planted typing case
  was caught. Expected MISS: "a colleague's layer selected" (the T50 blocker). Did not work at
  first: the text card's recovery pressed Escape, which closes the picker and drops the unfinished
  card, so the rest of the first-use walk was lost; fixed to click into the field, and the text and
  color recoveries were walked by hand after. The Edge tab card move is walked only by hand so far.

- 2026-10-17 -- Worked: walking the reviewers' proposed screens myself with `real.mjs` before
  writing them into the walk. It found the T50 blocker (raw row id, empty Style tab) and confirmed
  all three focus defects in minutes, and caught that `--expect Box` passes while the shape grid is
  open (the expectation must hold only when the value is written: Escape first). Worked: `real.mjs
--type` refuses to type when nothing takes text, so a typing check never fires a single-key
  shortcut by accident.
- 2026-10-17 -- Did not work: my own first-review call that "one by one" counts toward T47's route
  bar. Two reviewers showed it lets the core bulk task pass with the bulk edit never used.
- 2026-10-11..13 -- Worked: relaunching from the main script; the gate inside `real.mjs --start`
  (56 of 56 refusals); reading the red team against source before taking it; measuring (`--hover`,
  PNG contrast, undo ratios) before classing a claim. Did not work: editing a script while a
  continuation fork was the one running; histories, setups and prompts never grepped against what
  the round scores; counting steps differently for key and participants.
- 2026-09-27..10-10 -- Worked: piloting every task on each new build; root-causing in source; one
  change per path; scripts that fail on a planted case. Did not work: a check that read zero pages
  passed; a clock running while queued; session folders inside the studio tree; a fix nobody grepped
  for siblings.

## Thinking

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

- Tier 3 study: `tier3/{criteria,tasks,answers,roster}.md`; dry runs `tier3/dry-run-r1-1.md`, `tier3/dry-run-r1-2.md` (build ed4351b258), `tier3/dry-run-r1-4.md` (build 6dd0b00bd7, pilots in `tier3/rounds/r1d2/pilot/<task>/<route>/`), `tier3/dry-run-r1-3.md` (build 5bd16cda6e; pilots in `tier3/rounds/r1d1/pilot/<task>/5bd16cda6e/` or the task's top folders, see each `session.json`); tools `tool/{real,bars,score,wording}.mjs`,
  `tool/bars-limits.json`; pilots `tier3/pilot-materials/`, `tier3/build/{walk-p1..p3,pilot-bulk*}/`.
- Tier 3 reviews (2026-10-17): `notes/{researcher,user,redteam}.md` (commits 05f4ee91a, 863ebb9a8,
  de16901f7); my walk of the proposed screens in the worktree's `tmp/director-freeze/explore*`.
- Tier 3 design: `tier3/design.md`, `tier3/bulk-edit-plan.md`, `tier3/decisions-round-6.md`,
  `tier3/owner-feedback-1.md`, `tier3/decide/`, `tier3/iterations/{1,2,3}/`, `tier3/style-catalog.md`.
- Tier 2: `tier2/criteria.md` (frozen), `tier2/rounds/round-{1..5}/`, `tier2/dry-run-*.md`.
- Builds: tier 3 bulk 7 `tier3-bulk7-457aa9f0f2`; tier 2 round 5 8c015b806
  (`.study-builds/tier2-r5-8c015b806/`).
- Owner items: `owner-decisions.md`.
