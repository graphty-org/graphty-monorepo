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

- (2026-10-21) Tier 3 round 1 closed at the one-round cap, bars unmet, studio stopped. 55 of 56
  succeeded: the round is at its ceiling. The signal is in cost, routes and confusion, not in
  success; future rounds measure steps over the key and first door, and read tasks for leading.
- (2026-10-21) First door for node color is wrong: 9 sessions on 5 halves opened the Graph
  inspector's Style tab (canvas settings only) and recovered by matching the Everything count to
  the node count. Fix by making that tab point at the layer that paints nodes, not by a hint.
- (2026-10-21) A new style line that starts at the current value (Fill 6366F1, Width 8 with no
  unit) reads as "it did nothing". A new line must start at a visibly different value or show
  that it is now the source.
- (2026-10-21) Checking a layer's members is by eye: Values lists ids, the table does not mark or
  filter painted rows. A layer should be able to show its members in the table, by name.
- (2026-10-21) The color-name table speaks "gold" for a plainly yellow fill and gives two groups
  one spoken name. Spoken names are what screen-reader users get: they must follow hue first, and
  graders must not grade with the same table the app speaks with.
- (2026-10-21) Keyboard: inspector F6 stop shows no focus (WCAG 2.4.7); both "Samples" controls
  drop focus; 30+ Tabs to a sample card. One persona, all succeeded; fix in compact-mantine and
  the app shell, they are cheap and serve everyone.
- (2026-10-21) Color entry accepts words but says nothing; picker swatches hold no common hues.
- (2026-10-21) Avoiding the <<Layer>> token counted as understanding it. A bar must separate the
  two before the token is called learnable.
- (2026-10-21) Same-model participants cap what a round can find and the answer key may lead
  graders. Before more sessions: blind the graders to the key's problem list.
- Top risk, every tier: a picture that looks right and answers wrong. Any such screen is severity 3.
- Grade the user's goal from what ended on screen and in the style tree, not the key's route or a
  participant's rating. Simulated passes are weak; failures and scripted repros count.
- A new task brings its route's screens into the scripted walk in the same change; task wording
  never reuses the target's screen words.
- Criteria prose asking for tool changes does not get built; ask for a gate refusal with an owner.
- No tours, hint panels or first-run aids; the same screens for everyone.
- No product concept built around one task's wording ("cube" for Box) or one domain.

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

- **2026-10-20 (me, fifth review of tier 3 criteria and tasks; named build 3ef9e6c1ec, no
  session run):** Eight changes: refreeze on the post-golden commit and re-read every reference
  value; define "grading-spoiling" as a screen that disagrees with the style tree, and count a
  keyboard block on Sam's halves as a blocked task; keyboard walks only on Sam's halves and a gate
  that accepts a re-pilot of success paths only, with `gateCheck` keyed by half; make missing
  WALKS3 screens a gate refusal and run the wording check (expect T41 "stays", T48 "look");
  give every backlog row a severity and count 3+ once in bar 5; headline round 1 as
  not passable by plan; settle T50 B's summary reading as SD, rule not read; run the audit's
  key-and-drawing check on T46 B and T47 B for look-alike colors. Reason: the gate as written
  refuses round 1 forever, two graders would split, or a bar reads clean because nothing checked
  it. Evidence: pilot `session.json` build stamps (none on 3ef9e6c1ec); `git merge-base
--is-ancestor f9d8b44b9 3ef9e6c1ec` false; `tool/bars.mjs` WALKS3 screen list;
  `tool/real.mjs` gateCheck (`piloted.set(basename(dir))`); `tool/wording.mjs` stem();
  `graphty/src/workspace/style/PropertyRow.tsx:1022` ("stays a fixed value").
- **2026-10-17 to 2026-10-19 (me, first to fourth reviews of tier 3, summarized 2026-10-20):**
  Landed: T51 added and run at 4; T47 A cubes; T45 B blue; T41 "is missing"; B prompts a
  colleague's; T48 "when the file first opened"; Tom off several-layer tasks and T51; exit test
  and `decided.md`; any community analysis counts on T46 to T48; T49 graded by the drawing; bar 4
  = 10; T51 B companies; bar 5 not scored when the walk skips a screen; a styled node left
  selected graded by the tree; "Starts with" typing in bar 6 (on paper). Not taken: T51 B on
  College football's conferences. Reason throughout: routes no check saw, grades the key could
  not give, bars that could not be met.
- **2026-10-16 (me, combined V7 + cards + bulk review):** Accepted the owner's V7 and dropped my
  2026-10-12 "groups, never tabs". Asks recorded in Top of mind.
- **2026-10-16 (bulk iteration 7 frozen as `tier3-bulk7-457aa9f0f2`):** SpreadValues deleted; a
  bulk field whose layers differ draws BoundValue with <<Layer>>. Elena test: one look for one
  layer or ten. Alex test: 35 clusters read as 5 chits + "+30", count spoken.
- **2026-10-14, round 6:** The owner's confusions (empty palette, vanishing new layer, "Top 10"
  selecting nothing, "End" not drawn, Highlight read as Headlight) were each a screen that said
  nothing true. Decisions favor words that say what happened ("Draws nothing", count lines that
  explain ties, Add Leiden layer).
- **2026-10-13 (tier 3 pause, my answers to the owner):** Unset is Clear (minus at rest, tooltip
  names what comes back, Undo); covering a lower layer is a separate act (own entry set to
  nothing), acceptable only if a layer lists only its own entries. No "split parent" row: two row
  kinds only, layer and folder. Figma: one-line rows, effect rows, Mixed only for multi-select,
  popovers beside the panel; kept against Figma: the vary glyph at rest and the painted-over mark.
  Also: nothing lost passing through a kind; focus never falls to the page; "one color per value"
  gives distinct colors. Reason: each is a screen that lies or lost work.
- **2026-10-12 (tier 3 open questions, `tier3/decide/user.md`):** Core single-value properties
  always present as empty fields whose placeholder is what lies beneath; "+" only for lists and
  rare properties; field picker ranked in use then fits; gradient as one picture with number
  fields kept; one "which elements" rule with an edge clause; label looks as presets. Element asks,
  all additive (agreement beneath a layer, kind previews, channel-fit codes, binding preview,
  rule-tree selector with an edge reading, text leaf, label looks as catalog data).
- **2026-10-08 to 2026-10-11 (tier 2, summarized 2026-10-17):** Criteria: a bar for expert and
  screenshot findings, no round cap, "not scored" is not met, no door removed on fewer than 8
  sessions. Rounds 1-4 critiques and closes: the gate and leak check enforced by the command every
  session runs (a written rule failed twice); briefings name files and kinds only; Shift-click
  adds; toolbar Filters icon; find box "or more" rows and only suggestions that read as a
  condition (element); the table lists what a filter step keeps; one door per confirmed problem so
  a round can credit each change; trust words never cut to pass a word count. Kept: Shift-click,
  Filters icon, Analyze name ranking, Replace page. Rule language is copied, never discovered (0
  of 16 typed "=").
- 2026-10-09 (me) -- A dry run must walk the commonest detours, not only the answer key. Reason:
  round 1's dry run cleared every walked route (0 broken controls met there), and every build
  fault participants did meet was on a detour (styling Edges while a run layer was open, the
  selection tint over a new fill).
- 2026-10-08 (me, tier 2 criteria review; summarized 2026-10-12) -- Asked: a bar for expert and
  screenshot findings (0 open sev 3+, scripted clipped-text and raw-string checks); no round cap,
  stop on no gain; "not scored" is not met; a repeat-cost measure; a dead-end first move is a
  finding; no door removed on fewer than 8 sessions. Reason: repeat cost and kept habits judge a
  returning user.

- 2026-10-06 to 2026-10-07 (tier 1 critiques, summarized 2026-10-18) -- The route people take
  must arrive before patching the route they skip; smallest reproduced fixes on the first-time
  path; every bar scorable from the last screenshot and transcript with no judgment call; a
  size or color step passes only if the legend's meaning is read.
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

- 2026-10-21 -- TIER 3 ROUND 1 (frozen 758b8e8081). WORKED: Node | Edge layer list as the door
  (every session found it), Box via the Everything layer or a folder, Louvain grouping, the
  "Picked by hand" label. DID NOT: Graph inspector as first door for node color (9 sessions);
  new style lines at the current value; members by id; hex-first color box; colorWord's keyword
  table (the round's only F, and a spoken-name clash); grading by the app's own color table;
  success as the bar when 55 of 56 pass. Lesson: at the ceiling, score cost and first door.

- 2026-10-20 -- DID NOT WORK (third time): asking for tool changes in criteria prose ("does not
  pass until WALKS3 walks..."). Nothing was built across two reviews. WORKED: grouping pilot
  `session.json` build stamps per half in one command, which showed the named build has no walk.

- 2026-10-19 -- DID NOT WORK: a criteria line that says a check "does not pass until" a script
  changes, with no owner for the script change. The five WALKS3 screens agreed on 2026-10-18 were
  still unwalked a day later. WORKED: listing each pilot folder's `session.json` commit, which
  showed in one command which halves the interrupted pass really covered.

- 2026-10-18 -- DID NOT WORK: a dry run whose exit is "finds nothing new" while every pass's
  fixes are judged only by the next full pass. Four passes, 41% of the last list caused by the
  one before, three behaviors flip-flopped, and round 1 still has not started. WORKED: matching
  each pass's rows to the commits before it (`tmp/tier3-dryrun-analysis/`), which named the
  cause in one read.

- 2026-10-17 -- WORKED: a first review of study materials that names each ask with its reason;
  all eight landed in one pass. DID NOT (found on the second pass): a new task (T51) added
  without adding its route's screens to the scripted walk, so the wording check and bars 6 and 8
  were blind to the very screen the task exists to test. Lesson: a new task brings its screens
  into WALKS3 in the same change.

- 2026-10-10 to 2026-10-11, folded 2026-10-20 -- TIER 2 ROUNDS 3-4. WORKED: Shift-click adds (T24
  7 of 7), toolbar Filters icon (7 of 7 first door), find box hint and example, Replace with its
  marks, one path per problem so a round can credit each. DID NOT: the gate (not run, not
  enforced) twice; briefing leaks; refusing a folder without a briefing (moving folders out plus
  a transcript check is the fix); several variants per problem; 0 of 16 typed "=" unprompted.
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

- 2026-10-11 -- A returning user types what they remember (a number, a name). The find box must
  answer that literal input on any file, not only when the number happens to be a stored value.
  Watch round 5: T22 A on bus-stops, first move "10".

- 2026-10-11 -- Round 4 answered its watch list: T24 7 of 7 with Shift-click, nobody tried
  Ctrl; Filters icon first door 7 of 7. Lesson: a written study rule failed twice (gate, leaks);
  only a refusal in the command every session runs works. Round 5 counts mean little if the
  briefing check is not proven on a planted leak.

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

- `tier3/dry-run-r1-4.md`; `tmp/tier3-dryrun-analysis/` (main checkout); `tool/bars.mjs`
  WALKS3; `.claude/skills/design-studio/SKILL.md` on `chore/studio-convergence-rules` (2026-10-18).
- `design/ui/studio/tier3/criteria.md`, `tasks.md`, `answers.md`, `roster.md`; `../tool/bars.mjs`
  (WALKS3); `graphty/src/components/shell/panel/AnalyzePanel.tsx` (SUGGESTED_CARDS);
  `graphty/src/workspace/style/words.ts` (LAYER_TOKEN, bindingTitle); `P/recipe-recipient.md`
  (2026-10-17).

- `design/ui/studio/tier3/decide/user.md`; mock design `design/ui/style-panel-organization.md`
  (branch `mock/style-panel`); `tmp/style-catalog/catalog.md`; element `catalog/types.ts`
  (Selector, RuleTree, AttributeDescriptor), `session/styles/StylesApi.ts` (agreement, counts)
  (2026-10-12).
- `design/ui/studio/tier2/rounds/round-4/insights.md`, `scores.md`, `expert/*.md`; screenshots
  `expert/figma/find/08.png`, `sessions/r4-s27/09.png`, `sessions/r4-s08/02.png`; code
  `graphty/src/workspace/graph-place/FindBox.tsx` (ruleFromText, backtickSuggestion),
  `graphty/src/workspace/table/TableDock.tsx:349`, `graphty-element/src/session/query.ts` (atLeastOf),
  `graphty/src/workspace/canvas/legendWords.ts:336` (2026-10-11).
- `design/ui/studio/tier2/rounds/round-3/decisions.md` (2026-10-11).

- `design/ui/studio/tier2/rounds/round-1/` and `round-3/` insights, scores and expert walks
  (2026-10-09, 2026-10-10).
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
