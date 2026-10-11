# User Advocate: designer's notes

Role: I speak for two people. The first-time user (Explorer Elena: a product manager with no graph
training who "abandons tools quickly if the learning curve feels steep") and the intermediate weekly
analyst (Analyst Alex: comfortable with data, has used Gephi or NetworkX, not a graph theorist,
comes back weekly with a question already in mind). I test every idea against real tasks and real
confusion. I refuse novice-only crutches (wizards, tours, suggestion cards, verbose help) as firmly
as expert-only complexity.

Read this file at the start of every studio session. Update it whenever I decide something, learn
something, or change my mind. Summarize when it passes about 25 KB.

## Top of mind

- 2026-10-11 -- Round 4 does not start until the study's gate works: prompt pilots run, the leak
  check fails when it reads no log, --end never deletes notes, each shown failing on a planted
  fault. A broken measurement decided more of round 3 than the app did.
- 2026-10-11 -- T24 re-runs with the prompt changed, not the key: "point out Gus and Ivan, and
  nobody else, so that whatever you do next applies only to those two". Watch: does the outcome
  wording lead people to the control (wording echo), and do both pilots per half pass the key.
- 2026-10-11 -- Shift-click on a node now adds (element, matching edges). Ctrl/Meta held. Watch in
  round 4: does anyone try Ctrl first and stall? If so, Ctrl is the next ask, not an app patch.
- 2026-10-11 -- Find box: a bare "10" gets an element fact `atLeast` and an "is 10 or more (N)" row;
  "Select where" leaves the visible text. Watch T22 on Les Miserables: first-pick rate of the "or
  more" row, and zero cut rows in bars.mjs.
- 2026-10-11 -- Filters: a toolbar icon (tooltip "Filters") opening the existing step editor, not my
  layer-list row (that adds words at rest and reads as a second home). Watch T17 first moves against
  round 3's 5 of 8 looking on the Graph place; an icon-only button may still be missed.
- 2026-10-11 -- Second Find path replacing the first: no notice this round (lost nothing in 7 of 7).
  I accepted it. Instead the "Made with" staleness after re-run/Undo is scripted first; a screen
  naming settings of a run that is gone is the trust break I care about more.
- 2026-10-11 -- One variant per problem, every one-specialist claim scripted first, words at rest
  never rise. Three changes (5, 11, 12) are script-gated: if they do not reproduce, they close.
- 2026-10-11 -- Analyze search: name/alias matches first, one "Start here" while filtering. Watch
  bar 11 on T18 ("path" should land on Shortest path in one move).
- 2026-10-11 -- Rule language is copied, never discovered (0 of 16 typed "=" across rounds 2-3).
  Every T22 route must work without knowing it; the syntax itself stays on the owner's list.
- 2026-10-09 -- Simulated passes are weak; failures and script repros count. One model's seven
  matching asides are one voice, not seven.
- 2026-10-09 -- Known to keep failing bar 10: drawn names overlapping (element label placement,
  owner's list). The app must not hide it with small fonts or a seed.
- 2026-10-07 -- Top risk still: a picture that looks right and answers wrong (stale key, stale
  "Made with", overlapping names, a Load that doubles ties -- now a real warning on Load).
- 2026-10-06 -- No tours, hint panels or first-run aids; same screens for everyone. Grade from what
  ended on screen; task wording never reuses the target's screen words.

## Priorities and values

- 2026-10-06 -- Real tasks over feature coverage. A user comes with a question ("who matters most
  here?", "what are the groups?"), never with "run an algorithm". "Run" is a verb inside a task.
- 2026-10-06 -- Trust over polish. A newcomer forgives an ugly screen; they do not forgive a screen
  that lies. One wrong count teaches them to ignore every count.
- 2026-10-06 -- The chain over the parts. Tier 1 is judged by the whole first session; a step that
  passes alone but leaves the user unsure ("did names go on?") breaks everything after it.
- 2026-10-06 -- The same screens for everyone. Newcomers get recoverability and lookup, not
  different screens. "If it appears only for novices, or only for experts, reject it" (my test
  since 2026-09-26).
- 2026-10-06 -- The trade's words, explained, never replaced. Betweenness, degree, PageRank,
  communities. Friendly words ("brokers", "go-betweens") live only as search aliases (owner,
  2026-09-26). A substitute makes a Gephi or NetworkX user translate twice.
- 2026-10-06 -- Tier 1 first. Until tier 1 passes its bars, studio changes go to tier 1 problems,
  at least 60% of sessions go to tier 1, first-time personas take tier 1 first (owner, 2026-10-02).
- 2026-10-06 -- Successes reported, not only failures (owner, 2026-10-02: "it's hard to tell if it
  was all failures or if some things are working well").
- 2026-09-26 -- The weekly rhythm matters after tier 1: notes are the analyst's memory; re-running
  last week's work on new data is the reason Alex comes back. Both are tier 2 now and wait.

## Design criteria

- 2026-10-06 -- Every committed change is visible on the canvas and the legend at once. Reason:
  round 8's top quit reason was panel and drawing disagreeing.
- 2026-10-06 -- A control that looks finished must be finished. A checkbox, a row or a "+" that
  changes nothing visible is a severity-4 defect on the tier 1 path. Reason: the "Show labels" trap
  (12 of 21 picked it, 10 stopped believing names were on).
- 2026-10-06 -- A count names its unit and its whole, is computed from live state, and where it
  stands for members, selects them ("17 connections" selects them). Reason: bare and fixed counts
  were the most repeated trust loss, rounds 2-8.
- 2026-10-06 -- A node is named by its name, never its internal id, everywhere (find hits, header,
  neighbor list, group members). Reason: Elena "searches for entities she knows".
- 2026-10-06 -- The newest result paints on top as soon as it finishes; if something holds it back,
  the screen says what and offers one fix. Reason: owner rule 2026-09-30; round 8 finding 3.
- 2026-10-06 -- The words a newcomer clicks match the result they get (the verb clicked and the
  row it produces read as the same thing). Reason: novice walkthrough finding "Find groups" vs
  "Communities (Louvain)".
- 2026-10-06 -- The legend states in one plain sentence what a higher value means, names every
  channel in use (color and size) and the size range. Reason: "Color: PageRank 0.00330 to 0.0754"
  had no meaning to newcomers.
- 2026-10-06 -- An exported picture matches the screen and carries its key. Reason: "a figure with
  a legend by Friday" is a real deadline; round 7 found the legend missing (severity 4).
- 2026-10-06 -- No dead ends: nothing says "not available yet"; an unbuilt item is not drawn.
  Reason: round 8 label sessions hit three dead-end second routes.
- 2026-10-06 -- Time to first drawing under 2 minutes; the user can say what they see (size,
  whether it loaded right); they run at least one analysis on their own (W14 success criteria).
- 2026-10-06 -- Loading reports in one sentence what was read, kept and skipped. Reason: import
  trust (rounds 7-8); the match report and the broken-file refusal were among the few things that
  consistently worked.
- 2026-09-27 -- Every flow names its first failure, not only its happy path. Reason: happy paths
  never fail a walkthrough, and real sessions do.
- 2026-09-26 -- Undo instead of asking; no confirmation for an undoable act. Safe exploration is
  how a newcomer learns.

## Decisions and reasons

- 2026-10-11 (Design Director, round 3 close; my position after) -- Twelve changes, study first:
  gate and leak check (sev 4), T24 prompt reworded to name the outcome (sev 4), element Shift-click
  adds (Ctrl/Meta held: macOS Ctrl-click is a context menu), bars 8/9 fixed, "Made with" after
  Undo (script first), two focus drops, find box "at least" row via element `atLeast`, Analyze name
  ranking, toolbar Filters icon, Add page warning tied to Load, edge-filter steps counting edges
  (script first), disabled reasons in compact-mantine Tooltip (check first). Where it differed from
  my critique: prompt changed instead of widening the key -- I agree, the key measures what T24 is
  for (a selection a next action applies to); toolbar icon instead of a layer row -- I agree, fewer
  words at rest; no second-path notice -- I agree, cost 0 of 7; rows shortened instead of wrapped,
  backticks wording held for the owner. Held: per-name hop distance (first in line if a second
  session meets it), "4 hops" wording, Ctrl/Meta.

- 2026-10-10 (me, tier 2 round 3 critique) -- Seven changes, smallest first; folded 2026-10-11 into
  the entry above (5 of 7 matched the final list).
- 2026-10-10 (Design Director, round 2 close; my position after) -- Fifteen changes, study first
  (sev 4: leak closed, pilot-route dry run with keyboard faults fixed, bar scripts proven), then
  one per confirmed problem in its owning package: find-box miss shows the example, hint runnable
  by Enter (app); repeat-edge count from `data.prepare()` with Replace beside Load (element,
  additive; app); three focus faults (app); selection-layer Color/Width start at
  `styles.highlightStyle()` (element, additive; app); rule layers named by the rule; words at rest
  cut; 24 px checkbox hit area (compact-mantine); path aliases; weighted run row total; "Filter to
  neighbors" not a toggle; repeated status re-announced; T22/T24 reworded. Not changed: label
  overlap (element, owner), bare numbers and width units (breaking, owner), routes that held on
  weak evidence, "Components 1" under a filter. My view: matches my four asks, and better on two:
  the starting look comes from the element's own highlight (no app-invented value), and my opt-in
  bare-number idea is rightly dropped (a capability, not a choice). I accept holding "Select
  where..." until round 3 shows 3+ of 8 still stall.
- 2026-10-09 (me, tier 2 round 2 critique) -- Round 3 changes, smallest first: (1) the app's
  starting Width and Color for a new line row must draw visibly different from an unstyled tie
  (an app choice, not an element default; r2-s14/15.png, 4 of 8 T22 spent steps); (2) the
  element's rule parser accepts a bare number and returns neutral facts for an unknown column and
  for text that parses as a condition, so the app can word "Did you mean =shared_chapters >= 10?"
  (r2-s12/03.png, 6 of 8; additive); (3) the element reports how many incoming rows duplicate
  existing edges, and the Add page words it and offers Replace there (r2-s33/05.png: "adds 0
  nodes, 41 edges ... 82 edges" with Load as the primary button; additive); (4) a layer made from
  a find rule is named by the rule, not its count. Not changed: Filters, the load-time weight,
  the Replace page, the source "..." menu, Shortest path's place. Reason: each fix targets a
  confirmed failure on a route participants took; the routes that worked stay so round 3 can
  credit them once the briefing is enforced.
- 2026-10-09 (Design Director, round 1 close; my position after) -- Round 2 starts only after the
  study tool is fixed, the bar scripts are built and a detour dry run (pointer and keyboard) is
  written on the new build. App changes: find refusal words; "..." with Replace on the source
  inspector; start-screen Open of a data file goes through the Data page; filter focus and Enter;
  true load words; find-list ellipsis; ", out of date" on the key; no silent Everything for style
  lines; halo ring without tint (element); Weight list starts on the loaded weight. Reason: one
  door per confirmed problem so round 2 can credit each change alone. I drop my column-menu
  "higher means" and undoable "Back to start" (second home; Back already asks when unsaved).
- 2026-10-09 (me) -- A dry run must walk the commonest detours, not only the answer key. Reason:
  round 1's dry run cleared every walked route (0 broken controls met there), and every build
  fault participants did meet was on a detour (styling Edges while a run layer was open, the
  selection tint over a new fill).
- 2026-10-08 (me, tier 2 criteria review) -- Asked for, most important first: (1) a bar 10 for
  the per-round expert walkthrough and screenshot audit: 0 open confirmed severity 3+ visual or
  pattern findings (truncation, text or key over a node, wrong component, one kind of control
  behaving two ways, raw element strings), confirmed by a second expert or a script measure, and
  the count not rising round over round; plus a script for clipped text (scrollWidth > clientWidth)
  and raw strings on bar 8's screens. Reason: the owner said tier 1's study missed most of what a
  real person saw on first use; my own re-pilot found "Node t..." truncation and raw file syntax
  that no bar counted. (2) Rounds: no 3-round cap; a round with no gain on the core four stops and
  reports to the owner (his launch words). (3) "Not scored" counts as not met. (4) A repeat-cost
  measure: after success on T17/T18, a follow-up variant in the same session; steps on the repeat
  vs the success path. (5) A first move to a history-named place that leads nowhere is a finding
  (broken habit), confirmed at 2. (6) Bar 1 arithmetic for T4's 3-per-half spelled out; bar 5's
  reference to an older build replaced by the mechanism. (7) Bar 4 adds the tie click, select
  ends, and the load-time weight choice. (8) No door removed on fewer than 8 sessions across
  rounds. Reason for all: a returning user's repeat work is judged by repeat cost and kept habits,
  and every check the owner asked for must decide something.

- 2026-10-07 (studio, round 2 decisions; I agree) -- Twelve changes for round 3, in the package
  that owns each cause: menu-dialog focus (compact-mantine Menu), key omits a fully covered layer
  (element legend), 2D Fit frames the graph (element camera), group layouts accept community
  results through the existing `optionsFor` (element) rendered by the app, load and run finished
  announcements (app), the drawing named with a focus ring (element), Size "+" opens its picker
  (app), row glyph inside the row (compact-mantine DataRow), runs named by method (app),
  "Show all labels" writing the element's existing declutter setting (app), study tool hears the
  active option, answer key re-recorded. Not changed: Force still cloud (trace first), 4x export
  (element, later), key placement and seed, toolbar, hover, Analyze words. Reason: smallest
  reproduced fixes on the first-time path, no redesign. My view: matches my order; the
  "Show all labels" switch passes my test because it visibly changes the drawing and is not
  novice-only. T10 kept its prompt -- I had asked to reword it; the studio's reason (a real goal
  that now measures a real fix) is better, and I accept it.

- 2026-10-07 (me, tier 1 round 2 critique; summarized 2026-10-09) -- Order: menu-to-dialog
  focus, Force re-apply and 2D Fit, groupings as an element fact, key omits a fully covered
  layer, Size "+" opens its picker, chevron inside the row, finished announcements. Reason:
  smallest reproduced fixes on the first-time path. The "stale key" was a visibility fact.
- 2026-10-06 (me, tier 1 round 1 critique; summarized 2026-10-09) -- First fix: the route people
  take must arrive (the Neighborhood command opens the named list), not a patch on the route they
  skip; then make detours work, wheel zoom, refusals as element facts, key never over a node.
- 2026-10-06 (me, tier 1 criteria critique; summarized 2026-10-08) -- Asked: a scripted build
  defect is confirmed at one participant; size/color steps pass only if the participant reads the
  legend's meaning; one T15 run on friends.csv; bar 6 counts only commits that should change the
  drawing; answer key gaps filled; "unprompted" replaced by "picked a measure without help";
  a words-at-rest counting rule. Reason: every bar scorable from the last screenshot and transcript
  with no judgment call, and measuring understanding, not only clicks.
- 2026-10-06 (me) -- My scope widens from the weekly analyst alone to the first-time user plus the
  weekly analyst. Reason: the owner's tier 1 priority (2026-10-02). Elena and Alex fail in the same
  places on the same tasks (round 8), so one design serves both.
- 2026-10-06 (me) -- Test the real app before proposing any redesign. The first things tested are
  the three tier 1 failures (whole session, names from a field, find a node and its neighbors).
  Reason: the round 8 fixes are untested on working wiring; redesigning untested fixes repeats the
  round 5 mistake of measuring decisions that were never really on screen.
- 2026-10-03 (owner) -- Stop mocking; build tier 1 as the real app and study that. Reason: "our
  user studies keep breaking on the fact that it's not a real app". Round 7 had 18 of 61 tasks
  unreachable on the skeleton; round 8 had four tasks decided by skeleton defects.
- 2026-10-03 (owner) -- graphty-element is neutral about presentation: it returns facts and codes;
  the app writes every word, heading and grouping. Consequence for me: wording fixes (legend
  sentence, Analyze headings, notices) are app work; missing facts behind them are element work.
- 2026-10-02 (owner) -- First-time users first: load data (perhaps a sample), run algorithms,
  create styles, add labels. Tiered tasks adopted in round 8.
- 2026-10-02 (studio, round 8) -- Label "+" with no label anywhere adds an empty label line and
  opens its picker; "Show labels" only when a lower row sets a label. Reason: severity 4 trap.
  Not deleted because it is a real element setting.
- 2026-10-02 (studio, round 8) -- One find box, live as you type, over rows, elements (label, id,
  value) and notes; a value hit offers "Select where <attribute> is <value> (n)". Reason: 0 of 12
  on find-a-node; 5 of 6 typed a value and got "No match".
- 2026-10-02 (studio, round 8) -- A node opens on its data tab; its degree selects its neighbors;
  the neighborhood is listed by name and tie value. Reason: 12 of 12 wanted his data first; no
  screen named neighbors. Rejected: a Connections list on the data tab (a second home).
- 2026-10-02 (studio, round 8) -- Sample opens with nothing run. Reason: pre-run PageRank covered
  newcomers' own results and gave them a legend they could not read.
- 2026-10-02 (studio, round 8) -- Export > Data opens on the showing table, Nodes by default; the
  table's export goes through the one Export dialog. Reason: "export the data" first click 10%.
- 2026-09-30 (owner) -- A run paints as soon as it finishes; runs may fight over color; the eye
  hides. "Measures don't paint on their own" was called a fatal flaw.
- 2026-09-30 (owner) -- A label is an attribute picked in styling; the "+" starts empty; several
  labels per node allowed (tier 1 ships one label line).
- 2026-09-30 (owner) -- Toolbar icons only, tooltips after a hover delay. My open condition: if
  fewer than about half of first clicks find Layout or View, a label experiment goes back to the
  owner.
- 2026-09-29 (owner) -- No one-domain special cases (currency detection dropped); every wording fix
  tested on two domains. I accept this fully: it was a persona-grown feature my own rules forbade.
- 2026-09-29 (owner) -- Usage data off until the user opts in, in the owner's words. My concern
  stands: 6 of 6 read "the author ... and his Claude Code sessions" as a second recipient and 4 said
  it drove their No; a tightened draft keeping every commitment goes to the owner.
- 2026-09-26 (owner) -- Design for the intermediate user; personas validate, never generate;
  "enable all users without adding specific features for specific personas".
- 2026-09-26 (studio, my proposal) -- Whole-graph overview is a top task, recurring, with the
  degree histogram by default. Notes are core for the weekly analyst. Export is one task with
  several outputs. Standard graph terms, explained by (i).

## Tried: worked / did not work

- 2026-10-11 -- DID NOT WORK: proposing several variants per problem (eight roles, up to four
  each). Stacked, round 4 could not credit any one. One path per problem, the rest held by name.
  WORKED: my round 3 critique's ranking matched the final list on 5 of 7 items.

- 2026-10-10 -- TIER 2 ROUND 3. WORKED: find box hint and example (T22 4 of 4, one detour each);
  Recent entry in Analyze; Replace with its marks; Filters found 8 of 8; repeat follow-ups at
  target (weak: simulated memory). DID NOT: Shift-click on nodes; T24's key vs its prompt; the
  round's gate (prompt pilots skipped, leak check read nothing, --end deleted notes); 0 of 8 typed
  "=" unprompted, so the rule language is copied, never discovered.
- 2026-10-10 -- DID NOT WORK: refusing a session folder without a briefing as the leak fix --
  a participant can still read upward. Moving folders out of the tree plus a transcript check is
  the fix. Also: a preflight that claims scripts exist without running them on a planted fault.
- 2026-10-09 -- DID NOT WORK: a dry run that walks only the answer key, by pointer only, with no
  tool check. Every open fault sat on a detour or in the tool. Next: walk round 1's detours and
  keyboard, and dry-run the tool itself.
- 2026-10-09, folded 2026-10-11 -- TIER 2 ROUNDS 1-2. WORKED: dry runs widened to detours,
  keyboard and the tool; load-time "Farther"; find box hint; Replace and its marks; selection ring
  and Escape fixes. DID NOT: find box as condition entry before the hint; Replace only on
  right-click; stale runs quiet; long names cut; briefing leaks (tasks.md read); click-by-name
  landing on same-named rows; scripts claimed built but absent.
- 2026-10-02 to 2026-10-07, folded 2026-10-09 -- TIER 1 (mocks, then the real app). WORKED and
  kept: sample one click from start, match report and broken-file refusal, save and reopen, every
  run repainting drawing and legend together, the G/Degree neighbor list, "No crossings" refusal,
  PageRank "Start here", the legend in the exported picture, "Note on: <thing>". DID NOT: "Show
  labels" beside "Label line", a pre-run sample (21 of 21 confused), "Neighborhood" naming no one,
  "Data" naming two places, layouts (T11 5.2x), 3D size inversion, truncated source rows.
- 2026-09-04 to 2026-10-01, folded -- DID NOT WORK and taught: static mocks and skeletons (people
  click in their heads; skeleton defects decide tasks), self-ratings (drift up a point), wording
  echo (task words matching the fix inflate success), money words for one domain, v1 novice text
  and wizards ("cluttered the UX"), fixed "N hidden" counts read as deliberate hiding.

## Thinking

- 2026-10-11 -- Round 4 watch list: T24 (prompt pilots pass the key? anyone try Ctrl?), T22 (picks
  the "or more" row first?), T17 (first move on the new toolbar icon or still Layout?), T18 (one
  move to Shortest path; "Made with" true after Undo). If T24 still splits on "point out", the
  prompt is still the fault, not the people.

- 2026-10-06, folded 2026-10-07 -- Standing expectations, still open: names off at rest hurts
  Elena (she clicks prominent nodes and searches names she knows); words at rest written for
  developers; watch first clicks on icon-only Layout and View against the owner's half-of-first-
  clicks condition; judge any fix by whether it makes a change visible, a count true, a word match
  its result or a dead end disappear -- oppose hints, first-run-only elements and second routes.
- 2026-10-06 -- Success criteria I argue for: chained first session and each tier 1 task at 80%;
  no confirmed severity 4; ease compared within one scale; numbers with and without tool defects;
  one keyboard-only and one screen-reader participant on the chained walk; real people eventually.
- 2026-10-06 -- Open problems: the "attribute" word; Size's home; Analyze headings; usage-data
  wording; whether a run's suggested style lands above a hand-written layer that colors everything.

## Sources

- `design/ui/studio/tier2/rounds/round-3/decisions.md` (2026-10-11).

- `design/ui/studio/tier2/rounds/round-3/insights.md`, `scores.md`, `expert/*.md`; screenshots
  `sessions/r3-s10/02.png`, `r3-s33/03.png`, `r3-s43/13.png` (2026-10-10).
- `design/ui/studio/tier2/rounds/round-1/insights.md`, `scores.md`, `expert/*.md`;
  screenshots `sessions/r1-s46/12.png`, `r1-s29/08.png`, `r1-s28/07.png` (2026-10-09).
- `design/ui/studio/digests/decisions.md`, `framework.md`, `owner-voice.md`, `study-rounds.md`,
  `tier1.md` (this worktree, 2026-10-06).
- `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/decision-log.md`, "Round 8"
  (targets, decisions, considered and rejected).
- `.claudehistory/3a19ea55-f3cc-4fc0-b85f-842243f52536.jsonl`, 2026-09-26 16:01 (the studio's
  User Advocate role defined) and 18:45 (Figma expert added).
- `.claudehistory/3a19ea55-f3cc-4fc0-b85f-842243f52536/subagents/workflows/wf_5285cd13-42b/` and
  `wf_f793f987-53f/`, the User Advocate's own outputs, 2026-09-26 to 2026-09-28: top tasks
  (agent-afe62ddf...), principles and "how novices are served" (agent-a0722d7f...), framework
  revision, flows and journeys (agent-a7b8bc16...), styling and options (agent-a988315e...).
  Extraction scripts: `design/ui/studio/tmp/user-notes/`.
- `design/ui/studio/tmp/explore2-01.png` (real app, Florentine sample, 2026-10-06 smoke run).
- `CLAUDE.md` (Architectural Principles; graphty-element is neutral about presentation).
