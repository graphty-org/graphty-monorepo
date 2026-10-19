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

- (2026-10-18, third review, before round 1) Round 1 has not started. Four dry-run passes found
  344, 217, 151 and 129 "fix now" rows; 41% of pass 4's were caused by pass 3's fixes and three
  behaviors flipped between triages. A fifth pass began on 52cb47a85a. Preflight 4's "until a pass
  finds nothing new" can never be met; it needs the exit test (0 blocking rows on success paths
  and listed detours, regressions under 10%, no reversed decision) and a binding decisions file.
- (2026-10-18) Confusing rows off the success path are what the sessions are for; holding round 1
  for them spends the study on polish and teaches nothing about first use.
- (2026-10-18) A skipped pilot reads as a clean one: pass 4 never walked T39 (bar 4's only task),
  T41 B or T46 A, and T46 A is owed since 5bd16cda6e.
- (2026-10-18) WALKS3 still misses success-path screens of core tasks: the find box and its
  results (T46 steps 7-8), a node's inspector with Memberships and "Why this look" (T46, T50), a
  node's own Style tab and Fill "+" (a pass-4 blocker), the shape list (T47, a pass-4 blocker).
  Bars 6 and 8, the expert walks and the audit inherit that blindness.
- (2026-10-18) The wording check has never run on any tier 3 build. "cluster" (T46 B, T47 B,
  T48 B) is neither kept nor avoided while the groups info line and "Clustering coefficient" use it.
- (2026-10-18) Grade the user's goal, not the answer key's route: any groups run counts for T46 to
  T48 when the prompt names none; a T49 drawing and key back at the start is SD, not F.
- (2026-10-18) T51's halves both answer green (the fixtures list values in the same order), so
  they test one palette slot; B should ask for the companies.
- Top risk, every tier: a picture that looks right and answers wrong (stale key, twelve oranges for
  twelve values, a count that disagrees with the drawing). Any such screen is severity 3.
- A new task brings its route's screens into WALKS3 in the same change.
- Task wording never reuses the target's screen words, including tooltips and info lines; every
  wording at stake runs on two domains. A fix that adds an alias for a prompt's word makes that
  task re-test in a word the fix did not add.
- No tours, hint panels or first-run aids; the same screens for everyone.
- Grade from what ended on screen and in the style tree, never from a participant's rating.
- Simulated passes are weak; failures and scripted repros count. One model's matching asides are
  one voice.
- Personas whose files script a quit are placed only where the quit is the finding, never as the
  sole session of a study question.
- (2026-10-16) V7 accepted (Node | Edge tabs, typed condition cards, bulk field as one bound value
  with <<Layer>>). Standing asks: a new layer opens on "Add a condition"; Close is not Cancel; a
  card that leaves 0 says so; a selector the cards cannot draw shows a read-only Expression card.

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

- **2026-10-18 (me, third review of tier 3 criteria and tasks, before round 1):** Eight changes:
  preflight 4's exit test and a decisions file; walk what pass 4 skipped first; five screens into
  WALKS3; run the wording check now and declare "cluster"; any groups run counts on T46 to T48;
  T49's start-looking drawing SD; bar 4 written as 10, twice the key's 5; T51 B asks for the
  companies. Reason: each is either a bar that cannot be met or reconciled, a route a newcomer
  takes that no check sees, or a grade that measures the key instead of the user. Evidence:
  `tmp/tier3-dryrun-analysis/summary.txt` and `match_p3_p4_summary.md`; `dry-run-r1-4.md` "Not
  piloted"; `tool/bars.mjs` WALKS3; no `vocabulary.json` under `tier3/rounds/`; `answers.md` T46,
  T49, T51; the convergence rules on branch `chore/studio-convergence-rules` (4a01f1747).
- **2026-10-17 (me, second review of tier 3 criteria and tasks):** Eight changes (above, Top of
  mind). Reason: every one is a route a first-time user will take that no bar, check or walk
  currently sees, a grade the key cannot give from the prompt's words, or a placement that spends
  a study question's only session on a scripted quit. Evidence: `../tool/bars.mjs` WALKS3 lists no
  color-binding popover, no key and no opened project; `graphty/src/components/shell/panel/
AnalyzePanel.tsx` Groups info "Cluster nodes that interact more with each other than with the
  rest"; `P/recipe-recipient.md` "What makes him abandon a tool" ("Discrete or continuous?", a
  second failure); `answers.md` T47 success "above its starting 1 and the same for all".
- **2026-10-17 (me, first review of tier 3):** Asked for T51 (each kind its own color) in T42's
  slots; T47 A not "twice as big"; T45 B not black; T41 "is missing"; B prompts a reporter
  colleague's, not "your"; T48 "when the file first opened"; Tom off the several-layer tasks;
  `10,000` as a detour. All landed (tasks.md change log 2026-10-17).
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

- 2026-10-11 -- TIER 2 ROUND 4. WORKED: Shift-click adds (T24 2 of 4 to 7 of 7, median 4 steps);
  toolbar Filters icon (7 of 7 first door, 0 wrong turns); Les Miserables "or more" row taken. DID
  NOT: the gate again (not run, not enforced); 3 sessions lost to the browser-slot wait; briefings
  leaking file contents; find box on a number that is not a value. My round 3 watch list was
  answered on T24 and T17; nobody tried Ctrl first.

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
