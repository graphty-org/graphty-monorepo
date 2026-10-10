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

- 2026-10-09 -- Round 2 dry run: yes, and wider than round 1's (success paths and 30 detours by
  pointer and keyboard, every task half piloted on the frozen build, tool self-check 5 of 5). It
  worked: about 30 of 355 problems were build faults, none above severity 2 after the skeptics,
  none decided a grade. Participants spent the round on design questions, as intended.
- 2026-10-09 -- The faults left sit on the one detour nobody walked: styling a SELECTION (Width
  starts at 8 and draws a hairline, Color starts at the gray every tie has). Each round finds the
  route nobody walked. Next dry run walks this round's detours too, not just round 1's.
- 2026-10-09 -- The round's biggest defect was the study's, not the build's: participants read the
  facilitator's tasks.md (avoided words, follow-ups). Passes on the three new routes are not
  credited; problems found anyway are robust. Fix: the tool refuses a session without its own
  briefing, participants run from the session folder; re-run T20, T21, T22, T17/T18 follow-ups.
- 2026-10-09 -- Confirmed sev 3 for a returning user: find box answers the reader's own words
  ("chapters 10", ">= 10") with bare "No match"; numbers in rules need backticks; drawn names cover
  each other and ties (element, deferred); opening a newer copy offers only "Add", doubling ties.
- 2026-10-09 -- My round 3 asks (smallest first): starting Width and Color that show; element
  accepts bare numbers and returns a neutral "no such column" / "looks like a condition" fact;
  a duplicate-edges fact before Load with Replace offered on that page; a selection layer named by
  its rule, not "13 edges". Do not touch the routes that worked (T20 load-time weight, Filters,
  Replace page, find hint once shown).
- 2026-10-09 -- Prompts with "stand out" invite styling; they measured the prompt, not need.
  Rewrite them unless the task measures styling.
- 2026-10-09 -- Label scripted persona exits; never read a scripted exit as the screen's doing.
- 2026-10-09 -- Weak evidence: simulated returning users go first where their histories point;
  prompts that ask for a rerun induce "noticing" staleness. Failures and script repros count.
- 2026-10-09 -- Known to keep failing bar 10: drawn names overlapping (element label placement).
  The app must not hide it with small fonts or a seed.
- 2026-10-07 -- Top risk still: a picture that looks right and answers wrong (stale key at full
  contrast, overlapping names, 3D size inversion, a Load that doubles ties).
- 2026-10-07 -- Words: the element returns codes; the app words them. Backticks in rules and
  "Untitled" in the Load announcement are leaks.
- 2026-10-07 -- Hold: icon-only toolbar, names off by default, Filters under Data, the Analyze
  list, right-click menus (add a visible route, keep the habit route).
- 2026-10-06 -- Grade from what ended on screen, never self-ratings; task wording never reuses the
  target's screen words; test every wording on two domains.
- 2026-10-06 -- No tours, hint panels or first-run aids; same screens for everyone.

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
- 2026-10-09 (me, tier 2 round 1 critique) -- Proposed seven round 2 fixes on routes participants
  took; superseded by the entry above where they differ (column menus, undoable Back).
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

- 2026-10-09 -- DID NOT WORK: a dry run that walks only the answer key, by pointer only, with no
  tool check. Every open fault sat on a detour or in the tool. Next: walk round 1's detours and
  keyboard, and dry-run the tool itself.
- 2026-10-09 -- TIER 2 ROUND 1. WORKED: the dry run on the walked routes (empty session logs, no
  grade decided by a build defect); T17 follow-ups at the key's 4 steps; T23 and T12R at or under
  path; the path run, the Replace page and "Higher means" read right every time once found; 0
  false "done". DID NOT: find box as a condition entry (T22 3 of 4, 25 steps vs 3); Replace only
  on right-click; plain Open skipping the weight question; "Back to start" dropping the graph;
  stale run quiet; long names cut; the study tool (over 4 browsers, wrong-row matches, synthetic
  file drop, missing preflight scripts).
- 2026-10-09 -- TIER 2 ROUND 2. WORKED: the widened dry run (30 detours, keyboard, tool check);
  T20 load-time "Farther" 7 of 7; T22 8 of 8 once the hint showed; Filters found 8 of 8; T21 0 of 8
  read old numbers as current; the selection ring and Escape fixes held. DID NOT: the detour
  nobody walked (styling a selection); keeping participants to their briefing (tasks.md was read);
  the click-by-name tool landing on same-named rows (r2-s17, s18, s30); bar 10's scripts claimed
  built but absent.
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
