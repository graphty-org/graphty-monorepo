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

- 2026-10-06 -- Round 1 on the real app: 26 of 29 graded succeeded, first-time personas 20 of 22,
  no false "done" in 29, the whole first session 5 of 5. Passes are weak evidence (one model plays
  every persona); 14 finished first runs are still owed a grade.
- 2026-10-06 -- "Failed ... 40m00s" in the study list is the session runner's timeout (the clock
  counted the wait for one of 4 browser slots), never the app. Do not restart first runs that
  have a "b" re-run; the 7 timed-out "b" cells join round 2's roster on the fixed runner; Morgan's
  7 screen-reader sessions wait for the tool's screen-reader mode.
- 2026-10-06 -- Round 2's first measure: "one character and his ties" (ease 2.75, worst tier 1
  task). The pilot build already opens "Javert's 17 connections" from the Neighborhood key G. Watch
  whether people now finish by the route they reached for. No Degree-row cue unless this fails.
- 2026-10-06 -- The pattern I watch above all: right control found, next step fails silently or
  lands somewhere useless. Round 2 checks each fixed dead end: Selection row, Data > Sources
  tables, the empty Size arrow, "No crossings" (now a red line under Method; pilot confirmed).
- 2026-10-06 -- New dead ends found by the pilot, to watch in round 2: "Force, flat" seems to run
  no layout (an even disc that never moves); Spectral packs 70 of 77 nodes under the toolbar;
  the legend card covers a node. Each makes "did it help?" unanswerable, not just ugly.
- 2026-10-06 -- The whole first session stays the acceptance walk. Pilot reached all five parts on
  both datasets in 18 steps, but exported names are soft and the top-ranked names are overdrawn:
  the picture passes the checklist yet may not answer "who matters" on its own.
- 2026-10-06 -- Words at rest still written for developers: CSV header
  "results.louvain.group", the CSV warning about "generic dialect", "from the file: directed 0".
  These are trust failures for Elena, not polish. Bar 9's baseline count must come before fixes.
- 2026-10-06 -- A run will be named by its method ("PageRank") everywhere. 12 paused on
  "Influence"; none failed. Watch that the rename costs no one a step on two domains.
- 2026-10-06 -- Wheel zoom in 3D and a visible focus ring land before any "show hidden names"
  control or any new signpost.
- 2026-10-06 -- Every count on screen is computed from live state or removed, and a count that
  stands for members leads to the members by name ("Babet (1)" goes).
- 2026-10-06 -- Grade from what ended on screen, never from self-ratings. A failure is strong
  evidence, a pass weak; "seen in 8 sessions" may be one shared guess.
- 2026-10-06 -- Task wording never reuses screen words at the target; every wording fix is tested
  on two domains (owner rule, 2026-09-29).
- 2026-10-06 -- No novice crutches: undo, working defaults, (i) on terms, tooltips, Quick actions,
  samples. Graph logic goes in graphty-element; each fix names its package.
- 2026-10-06 -- Hold, do not change yet: icon-only toolbar, no names by default, the Style-tab
  signpost, Size under Shape. Each cost steps, none caused a failure.

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

- 2026-10-06 (me, round 1 critique) -- Round 2 changes, in order: (1) the Neighborhood command
  opens the named neighbor list when one node is selected (app, `workspace/toolbar/commands.ts`;
  evidence: 0 of 4 clicked Degree, all used Neighborhood, `NodeValues.tsx` `openNeighborhood`
  sets the inspected view and the command does not); (2) make the detours work, not disappear
  (Selection row, Data > Sources tables, empty Size list); (3) wheel zoom in graphty-element's
  orbit controller; (4) "No crossings" refusal as an element fact plus app words; (5) the legend
  must not cover a node; (6) keyboard focus return and visible rings. Not changed: result names,
  toolbar words, default labels, the Style-tab signpost, the Size chain beyond the empty list.
  Reason: smallest changes on the chain that was proved broken; everything else cost steps only.
- 2026-10-06 (me) -- I disagree with treating the neighbor problem as "Degree looks like plain
  text". Marking Degree is a discoverability patch on the wrong route; the route people take must
  arrive. Severity label (3 vs 4) matters less than its rank: it is round 2's first fix.

- 2026-10-06 (me, critique of the frozen criteria, tasks, answer key and roster) -- What I asked
  the studio to change before round 1, most important first:
  (1) A build defect that a script reproduces on the build counts as confirmed at one participant.
  The two-participant rule is for opinions and behavior, not for a control that does nothing.
  (2) Size and color steps pass only if the participant says what a bigger dot or a color means,
  read off the legend. Making big dots no one can read is not the core path.
  (3) One T15 run on the user's own file (friends.csv), not only samples. The first session after
  an evaluation is the user's own data.
  (4) Bar 6 ("silent commit") counts only commits that should change the drawing; "picture matches
  the screen" gets a checklist (same nodes, sizes, names, key with both channels).
  (5) Answer key gaps: Florentine's name attribute and counts; T10 B's attribute `label` echoes
  "Add label line", so T10 is reported per dataset.
  (6) "Runs one analysis unprompted in T15" is unmeasurable (the prompt asks for it). Replace with
  "picked a measure without help".
  (7) Words-at-rest needs a counting rule; bar 3 adds nothing to bar 1; the screen-reader bar is
  real only if Morgan sees the accessibility tree and nothing else; T8's "center" needs plainer
  words and a defined reason.
  Reason for all: every bar must be something a grader can score from the last screenshot and the
  transcript without a judgment call, and must measure the first-time user's understanding, not
  only their clicks.
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

- 2026-10-06 -- What to test first, in order. (1) The whole first session on Les Miserables from
  the empty app, because it is the acceptance walk and the only test of the chain. (2) Names from a
  field, alone, to separate a label failure from a chain failure. (3) Find Javert and name some of
  the characters he shares chapters with. (4) Color or size by a result, because it was never
  measured (the mock never applied size). (5) Bring your own file and read what loaded, past the
  Load button, which the mock never let anyone pass.
- 2026-10-06 -- Where I expect the real app to hurt a newcomer, before seeing anyone use it:
  - Arrowheads on an undirected sample and "from the file: directed 0" -- the first screen states
    a fact the user cannot parse and draws a fact that is false for their data.
  - No names on any node at rest. Elena "clicks prominent nodes" and "searches for entities she
    knows"; unlabeled dots give her nothing to recognize. Whether a sample should open with names on
    is a question for the data (a sample's own style) and the element's label defaults, not a
    newcomer-only aid -- I hold it open until participants show it matters.
  - The picture without its legend (#133).
  - Element issues closed but not adopted by the app (node names, degree histogram, legend reading
    facts, Show all labels, attribute roles). Cheap wins: adopt them before blaming the design.
  - Icons-only toolbar with a 1000 ms tooltip delay (studio asked 500 ms). Watch first clicks on
    Layout and View against the owner's half-of-first-clicks condition.
- 2026-10-06 -- How I will judge a fix proposed during local iteration: does it make a committed
  change visible, a count true, a word match the result, or a dead end disappear? If it instead
  adds explanation text, a hint, a first-run-only element or a second way to the same state, I
  oppose it.
- 2026-10-06 -- On participants: simulated personas again, so I want the first-time personas'
  files strengthened (three are about 4.5 KB against 20-40 KB for older ones) and at least one
  keyboard-only and one screen-reader participant on the chained walk. A pass is weak evidence; I
  will say so in every report.
- 2026-10-06 -- On success criteria for this run, what I will argue for: the chained first session
  at 80% or better; each tier 1 task at 80%; no confirmed severity-4 left open; ease reported per
  task and compared with round 8 rather than held to 5.5 alone (5.5 has never been met and the
  simulated scale is uncalibrated); every number reported with and without study-tool defects.
- 2026-10-06 -- Open problems the studio has not settled and I should push on when evidence
  arrives: the "attribute" word; Size's home; Analyze headings; the usage-data wording; whether a
  run's suggested style should land above a hand-written layer that colors everything.

## Sources

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
