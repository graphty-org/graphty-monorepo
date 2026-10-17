# Design Director -- designer's notes

Role: I run the graphty design studio. I frame the problem, synthesize what the other designers and
the participants say, break ties with evidence, and own the success criteria and the round plans.
I want a small, sharp, coherent product. Read this file at the start of every session; update it
whenever I decide something, learn something, or change my mind.

Last updated: 2026-10-17 (tier 3 criteria frozen after the second review). Summarized from 42 KB
on 2026-10-17; the full earlier text is in this file's git history.

## Top of mind

- (2026-10-17) TIER 3 CRITERIA FROZEN ("Frozen on 2026-10-17 for the tier 3 rounds" in
  `tier3/criteria.md`; the build line stays first and still reads "none frozen yet": the preflight
  freezes the build and names it there). Tasks, key and roster changed with it (change logs in each).
- (2026-10-17) BLOCKERS FOUND ON THE CURRENT BUILD (6ddcb6c7c, app 0.8.68), for the preflight:
  (1) T50 cannot be done: opening `lesmis-poster.graphty.json` lists its layer as the raw row id
  `layer-1_2` (the key says "Poster") and selecting it shows an EMPTY Style tab; the project's
  Edge tab "Add a condition" opens nothing (the project carries no tie columns). Severity 4 until
  shown otherwise; owner of the fix is the element's project load or the fixture -- read the element
  first. (2) Focus after adding: a new text card focuses its "contains" menu, a new Color line
  focuses "Pick Node color" (typing writes nothing), a new Shape line ignores typing. Bar 6's new
  typed check fails on all three today; that is the bar working.
- (2026-10-17) Bar 1 for T47 and T48 counts only the folder or several route: one layer at a time
  is the bulk edit not found, so it no longer holds the bar. Watch whether T47 B (10 clusters) is
  then the round's hardest bar; that is the study's real question, not a reason to loosen it.
- (2026-10-17) Bar 4 is pointer sessions only, and a session not graded S/SD counts as never. Sam's
  key presses are reported apart (bar 7).
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

- Tier 3 study: `tier3/{criteria,tasks,answers,roster}.md`; tools `tool/{real,bars,score,wording}.mjs`,
  `tool/bars-limits.json`; pilots `tier3/pilot-materials/`, `tier3/build/{walk-p1..p3,pilot-bulk*}/`.
- Tier 3 reviews (2026-10-17): `notes/{researcher,user,redteam}.md` (commits 05f4ee91a, 863ebb9a8,
  de16901f7); my walk of the proposed screens in the worktree's `tmp/director-freeze/explore*`.
- Tier 3 design: `tier3/design.md`, `tier3/bulk-edit-plan.md`, `tier3/decisions-round-6.md`,
  `tier3/owner-feedback-1.md`, `tier3/decide/`, `tier3/iterations/{1,2,3}/`, `tier3/style-catalog.md`.
- Tier 2: `tier2/criteria.md` (frozen), `tier2/rounds/round-{1..5}/`, `tier2/dry-run-*.md`.
- Builds: tier 3 bulk 7 `tier3-bulk7-457aa9f0f2`; tier 2 round 5 8c015b806
  (`.study-builds/tier2-r5-8c015b806/`).
- Owner items: `owner-decisions.md`.
