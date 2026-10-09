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

- 2026-10-09 -- Tier 2 round 1 (55 valid sessions, build 946256efb876): 52 succeeded, 0 false
  "done", 0 weights read backwards, every session log empty. A dry run DID happen (four builds
  plus the frozen build) and no participant met a broken control on the routes it walked. Off
  those routes: one confirmed build defect (Edges color written to Everything, severity 2) and
  more study-tool faults than build faults.
- 2026-10-09 -- New rule I hold the studio to: a dry run walks each task's commonest detours (the
  last round's wrong turns), not only the answer key's route. Round 1's open faults all sat on
  detours no walk took.
- 2026-10-09 -- Round 2 fixes, in order: find box "No match" points to the rule form and the
  column offers "Select where"; Replace visible at rest; the weight's meaning settable on the
  column people go to next, and "Back to start" undoable; stale run marked on the key; long-name
  truncation; filter Enter commits and focus after Add/Delete step; Load announcement.
- 2026-10-09 -- Do NOT change in round 2: Filters' home under Data (7 of 8 at success-path cost),
  the right-click menu (add a visible route, keep it), the T18 path route, Hops, the selection
  tint priority, edge width units (script first). Tom's scripted two-attempt exits decided 2 of 3
  non-successes; label scripted exits so they are not read as the screen's doing.
- 2026-10-09 -- Weak evidence warning: simulated returning users go first where their histories
  point, so "first move matched the history" says nothing; failures and script repros are strong.
- 2026-10-08 -- Returning users are judged by repeat cost and kept habits. Round 1's T18 repeat
  took about one step over target, from a mechanical cause (From fills from the selection).
- 2026-10-08 -- The expert walkthrough and screenshot audit now feed bar 10; round 1 fails it on
  three severity-3 findings (long names cut, drawn names overlapping, stale run).
- 2026-10-07 -- Top risk still: a picture that looks right and answers wrong (3D perspective
  inverts size order; overlapping names; a stale key at full contrast).
- 2026-10-07 -- Words still leak developer and element strings ("Untitled" in the Load
  announcement while the header names the project; backticks in rules). The element returns
  codes; the app words them.
- 2026-10-07 -- Hold, do not change: icon-only toolbar, no names by default, hover tooltips off,
  raw scores on the key, the Analyze list, the Degree row as the neighbor route.
- 2026-10-06 -- Grade from what ended on screen, never from self-ratings. Task wording never
  reuses screen words at the target; every wording fix tested on two domains (owner, 2026-09-29).

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

- 2026-10-09 (me, tier 2 round 1 critique) -- Round 2 changes, smallest first on the returning
  user's path: (1) find box: "No match for ..." adds one line naming the rule form (start with
  "="), and a column's menu offers "Select where..." that opens the find box prefilled with the
  rule (`graph-place/FindBox.tsx:355`, the Data place column menu); 4 of 4 typed a condition in
  find, the column was the second place 4 of 4 looked. Bare numbers in rules (no backticks) is an
  element query-language change: owner list, not blocking. (2) "Replace with file..." on the
  source's inspector, the place a left click opens (`data-place/DataPlace.tsx`); 8 of 8 hunted.
  (3) The edge column's menu sets what a higher value means (the load-time weight fact), and
  "Back to start" is undoable; the path's Weight list starts on the loaded weight. 7 of 7 opened
  with plain Open; 6 of 7 went to the column next. (4) Stale run marked on the canvas key (bar 5
  fails as written; two experts). (5) Long names: find list ellipsis, count outside the truncated
  name, edge names cut per end; frame-to-fit counts label extents (element). (6) Filter step
  Enter commits; focus to the new step after Add, to the next row after Delete. (7) Load
  announcement names the project and the left-out row. Reason: each is a reproduced problem on a
  route participants actually took; none adds a novice-only aid or moves a home that worked.
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

- 2026-10-09 -- TIER 2 ROUND 1. WORKED: the dry run on the walked routes (empty session logs, no
  grade decided by a build defect); T17 follow-ups at the key's 4 steps; T23 and T12R at or under
  path; the path run, the Replace page and "Higher means" read right every time once found; 0
  false "done". DID NOT: find box as a condition entry (T22 3 of 4, 25 steps vs 3); Replace only
  on right-click; plain Open skipping the weight question; "Back to start" dropping the graph;
  stale run quiet; long names cut; the study tool (over 4 browsers, wrong-row matches, synthetic
  file drop, missing preflight scripts).
- 2026-10-07 -- RE-PILOT after round 2 fixes (T6, T7, T9-T13, T15, T16, both datasets). WORKED:
  every end state, no console errors; Show all labels (77 labels, 7 hidden -> 77 labels); group
  layouts enabled with "Group by: Communities" preselected; Columns by group separates clusters;
  PageRank "Start here" picked unprompted on friends.csv and read right. DID NOT: Spectral and
  Circle (3D sphere) do not help; 3D perspective inverts size order; exported names soft at 2x;
  Overview direction row overflows with raw file syntax; Sources rows truncated ("Node t...").

- 2026-10-07 -- ROUND 2 (real app, 56 sessions). WORKED: G/Degree row neighbor list (T12 1 of 3
  -> 8 of 8, 0.9x path), "No crossings" refusal, broken-file refusal (ease 6), save and reopen,
  sample one click from start, PageRank "Start here" (5 of 9 picked it unaided). DID NOT: removing
  the empty Size "Open list" (18 of 18 still named the Size chain); the chevron drawn outside the
  Degree row's button (4 of 6 missed first click); layouts (T11 ease 3.33, 5.2x).

- 2026-10-06 -- PILOT (rebuilt app, every tier 1 task by the answer key's path): all end states
  reached on both datasets, no console errors. WORKED: G on one node opens the neighbor list;
  "No crossings" refusal shown under Method; keyboard-only ranking (Enter runs PageRank); Export
  kinds as tabs. NOT YET: run names still "Influence"; "Force, flat" looks unlaid; reopened run
  shows no count; project renamed on save but outline keeps the old name.
- 2026-10-06 -- WORKED (round 1, real app): opening a sample or a CSV, the broken-file refusal
  (ease 7), ranking and groups (ease 5.3, 6), save and reopen, every run repainting drawing and
  legend at once, the honest "N hidden to avoid overlap" count (no false "done"), the legend in
  the exported picture. DID NOT: the Neighborhood command (selects, lists no one), the Degree row
  as the only route to names, Size found only by tooltip, the empty Size list, wheel zoom.

- 2026-10-02 -- WORKED (round 8, mock): picking a sample (100%), loading a file with the match
  report (100%), reading the overview (100%), the broken-file refusal naming faults (8 of 8 would
  forward it), communities run and its data tab (45% -> 100%), the layout method list (ease 2.50 ->
  4.80), file actions in the main menu (tree 19% -> 90%), "Files are read on this computer" /
  "Local only", "Note on: <thing>" before typing. Keep these; do not redesign what works.
- 2026-10-02 -- DID NOT WORK: "Show labels" beside "Label line" (the trap); the word "Label" that is
  not a control and a "+" with no tooltip of its own; "Neighborhood of Javert: Javert and 17
  neighbors" naming no one; a node opening on Style when people wanted its data; "Data" naming both
  a rail place and an inspector tab (clicking it dropped the selection 12 of 12); a search box that
  could not find a node and answered only after Enter; the layout icon read as "play" (62% first
  click); "Measure the graph" as an Analyze heading (betweenness 29% direct).
- 2026-10-02 -- DID NOT WORK: a pre-run sample. 21 of 21 could not tell its work from their own.
- 2026-10-01 -- DID NOT WORK: a fixed "64 labels hidden to avoid overlap" read as the program
  deliberately hiding names; a "1 row not listed still paints" line rejected 6 of 6.
- 2026-09-30 -- DID NOT WORK: "hidden" for a row removed from the list but still painting (4 of 5
  read it as a bug); renamed "Remove from list view".
- 2026-09-29 -- DID NOT WORK: money words for currency columns. Ease jumped 2.00 -> 5.00 partly
  because task words matched the fix's words on screen. Taught: wording-echo inflates success.
- 2026-09-28 to 10-02 -- DID NOT WORK as a method: static mocks and then a clickable skeleton.
  Participants "clicked" in their heads (rounds 1-6); skeleton defects decided tasks (rounds 7-8);
  round 5 re-measured round 4 because decisions were not drawn. Taught: test the real thing.
- 2026-09-28 -- DID NOT WORK: self-ratings and summaries. They drift up by about a point. Grade from
  the last screenshot and the transcript.
- 2026-09-27 -- WORKED (novice walkthrough on object-first mocks): loading a sample (5 of 5),
  export a picture (4). DID NOT: unlabeled icons with a 1 s tooltip delay (the steepest moment, where
  she might quit), first click on a color doing nothing, a result's reading hidden behind "Made by",
  no labels or hover labels on a fresh load. Several still apply to the real app.
- 2026-09-04 to 09-22 -- DID NOT WORK: v1's novice text, "Try it" boxes, suggestion strip and
  wizard-like onboarding. The owner: it "cluttered the UX with novice features and verbose text".
  Taught: newcomers need fewer words that are true, not more words that help.

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
