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

- (2026-11-05) Tier 6 round 2 ran: 11 of 12 succeeded, no false "done", no confirmed severity 3. These
  are simulated readers: a failure is strong, a pass weak. 400% still needs its repro for bar 9.
- (2026-11-05) My top risk now has its first near miss: "Among your selected sources" over "Selection
  14". The scope line must say the answer is narrowed: "Only selected", one word, before anything else.
- (2026-11-05) A run's result carries no `painted` fact (`summarizeRun`), yet the prompt tells the model
  to report only what counts show. So "without altering styles" is partly ours. One additive fact gives
  the model the truth and the app its Colored row. Check the mechanism before crediting prose to the model.
- (2026-11-05) A promise must be true for every door. "Comes back when you reopen" is false with no
  changes; say "changes". Readers met the label, not the tooltip, so a session cannot credit that fix.
- (2026-11-05) One result, one name: `wordsFor` already holds Betweenness, Closeness, Degree; Reach and
  Bridges are its aliases. The assistant lines read `plainName`. App only, no catalog change.
- (2026-11-05) A failure names only what it knows: no-status failure says connection or key, for a
  provider that needs a key; Send again stays.
- (2026-11-05) Every effect gets its line; a screen must not contradict itself ("Nothing changed." beside
  a lit Redo; "Listening" before a microphone opens).
- (2026-11-05) After Undo, Remove or Answer, focus returns to the composer; Settings to its opener.
- (2026-11-05) Check a study's request budget before launching; stop on the first refusal.
- Severity 3 needs a repro and an end state. Grade the user's goal from end state and records, never a
  route or a rating. Same-model participants; blind graders to the key.
- Hover counts measure the tool: hovering is a deliberate command there. Never cite "nobody hovered".
- Task wording and setup values never leak the target or the cause. A new task brings its screens into
  the scripted walk. Near the ceiling, read cost, routes and first door, not success.
- Open from tiers 3 and 4: Graph inspector as first door for node color; a style line at the current
  value reads as "it did nothing"; join preview before the act; one fact drawn once; data-screen keyboard.
- No tours, hint panels or first-run aids; the same screens for everyone. No concept built around one
  task's wording or one domain.
- (2026-11-03) Tier 5 round 1 ran (30 sessions) and failed bars 1, 3, 4, 8 and 9; the studio
  stopped at its one-round cap. Bars 6 and 7 were never fed (two expert walks did not run):
  unmeasured is not passed. Next round needs those walks and a fresh calm-first check.
- (2026-11-03) My "count that looks right and answers wrong" rule caught two sev 3s: speech from
  a covered panel ("4 of 24" under a visible "15 of 24"), and a step picked from one run's
  results that binds another run. A count, spoken or drawn, must name its own base and scope.
- (2026-11-03) graphty-element must hand over a run's scope as a fact; the app words it. Two
  runs named alike is the defect, not the matches strip's "(visible)" label.
- (2026-11-03) An error must never contradict the screen: By position says "highest 10" while
  24 of 24 match. A default the step does not apply must not be stated.
- (2026-11-03) Empty boxes need a cue of what they take: the empty Fill color box was the
  biggest single cost on T70 and the "least sure" moment of 8 of 28. Fix in the shared input if
  the click behavior is compact-mantine's.
- (2026-11-03) "Condition..." and "Or..." do not say "and" / "or else"; three sessions resolved
  it only by watching the count. Words must carry the logic, not the count.
- (2026-11-03) Work the user built wins: Clear then Escape deletes a saved card, Undo cannot
  restore it. Fix even with no participant hit.
- (2026-11-03) Study hygiene: a task and its key must ask the same thing (T73 measured the key,
  not the build); no wish-inviting follow-up; do not pre-color fixtures in the task's color.
- (2026-11-03) Start gate before launch; a void round wastes the cap.
- (2026-11-02) Check `git log <frozen>..HEAD` before reading any result; fixes after the freeze
  count against the frozen build only.
- (2026-10-30) Show the result before the act, in counts the reader trusts; severity 3 only
  with a scripted repro and an end-state check.
- Same-model participants: a failure is strong evidence, a pass is weak; blind graders; rate
  first, then neutral questions; task wording never reuses screen words.
- No product concept built around one task's wording, one fixture or one domain.

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

- **2026-11-05 (me, critique after tier 6 round 2):** Proposed, in order: "Only selected" on the scope
  line; a `painted` fact on the run result and effect, worded Colored; `wordsFor` names on assistant
  lines; "changes" in the Autosave tooltip; a no-status failure naming the key as a possibility; then
  Enter in the key box, question at body size, doubled period, and the reply's foot if its mechanism is
  confirmed; selected rows first for Show in table last, as it needs an element option. Rulings: a
  painting run gets a Colored row; my earlier "only if readers miss it" is withdrawn, because a reply
  denied the repaint. Not now: a handle from Open, since Save gives one and Playwright's file chooser may
  not see the native picker; a second button on the failure row; the Group 1 to N names. Reason: each is
  a screen saying something untrue or a result under two names. Evidence: `tier6/rounds/round-2/
insights.md`; `sessions/r2-s05/05.png`, `r2-s02/29.png`, `r2-s10/05.png`; `shape.ts` `summarizeRun`;
  `prompt.ts` line 65; `analyze/words.ts`.

- **2026-11-05 (me, tier 6 round 1 closed with no session run):** Positions for the fixes, all
  two-way: the element gains a selection effect so the app can word "Selected N nodes" (design 6.6;
  a reply is not a record); focus returns to the composer after Undo, Remove and Answer; the app shows
  one name per result by id; Done warns or keeps a typed key rather than dropping it silently. On the
  three open rulings I would say: a rollback restores the state before the message, selection
  included, because "Nothing changed." must be true; closing the panel does not forget the x, since
  neither of design 5.2's two ends happened; a run that paints gets a Colored row only if sessions
  show readers missing it. Reason: each is a screen saying something untrue or moving what the next
  message means. Evidence: `tier6/rounds/round-1/insights.md` findings 2 to 8, `scores.md` study
  defects.

- **2026-11-05 (me, review of tier 6 criteria and tasks, before any session; no frozen build
  named yet):** Eight changes. (1) T91 A, T94 A and T94 B become returning readers, from
  `personas/returning-*.md`: a first-timer cannot miss a layer list. (2) T90 key renamed, "stopped
  working" cut, and T93 B's "connected piece" reworded. (3) A one-off model failure mid-change on
  T91 A; bar 4 no longer rests on setup. (4) "How sure", "how far" and "how many" move to
  Follow-up blocks (real.mjs parses any task's); T93 A, T95 A, T95 B go to the readers likely to
  trust; bar 6 needs `Card: read`. (5) New bar: every computed number on screen agrees with the
  records. (6) Plant a wrong prose number on T92 A through the outgoing request, or report that the
  design's first question went unanswered. (7) T94 B takes back two messages, and bar 7 checks data
  as well as style. (8) The audit works from a list of states, bars 8 to 11 are rescored on the
  fixed build, and bar 8 tests that typing lands. Reason: each is a pass the study would give
  without the thing being true. Evidence: `tier6/roster.md`, `tasks.md`, `answers.md` T93;
  `tool/tier6.mjs` geminiRouter; `real.mjs` taskWords and `styleChanges`; `design.md` section 12;
  `assistant/Conversation.tsx` line 390; `AiController.ts` `rolledBack`.
- **2026-11-03 (me, tier 5 round 1 closed):** Fix order I back: the two sev 3 count defects
  (speech base, run binding) first, then By position's contradicting error, Clear+Escape loss,
  the Fill box, then the Or group's first state and its words. Reasons: trust over polish; each
  is a screen that lies or loses work. Evidence: `tier5/rounds/round-1/insights.md` 1-7.
- **2026-11-02 (me, two reviews of tier 5 criteria):** refreeze past the gate's fixes; one
  bounded gate pass; wording check on prompts only; bar 9 counts a workspace element named in two
  sessions on different halves at any rating; double count sev 3 only if equal on every project;
  lures walked as detours. Evidence: `rounds/round-1/rating-check.md`, `tool/steps.mjs`.

- **2026-10-30 (me, tier 4 round 1 closed at the one-round cap):** Lessons taken: (1) a study
  tool line that can contradict the screenshot is a severity-raising defect in the study, so it
  is fixed before any round; (2) severity 3 only with a scripted repro and an end-state check,
  since skeptics weakened all four candidates; (3) the answer key must define success as the
  user's goal, not a route property (r1-s08 answered right, counted false done); (4) wrong turns
  count only before success. Design positions: show Join's result before Join; decide at the
  act, not after with a default applied; one fact drawn once. Evidence: `tier4/rounds/round-1/
insights.md`, `repro/r1-s03/02.png`, `sessions/r1-s08/05.png`, `sessions/r1-s13/03.png`.
- **2026-10-20 and 2026-10-29 (me, reviews of tier 3 and tier 4 materials, summarized 2026-11-05):**
  Tier 4: grade from a saved data state with `real.mjs --end` refusing without it; a scripted walk of
  the data screens; prompts drop control words (T60, T64); T65 B moved to river data; a cost bar of
  1.5x the key; scripted axe in bar 5. Tier 3: refreeze on the post-golden commit; define
  grading-spoiling; a gate that accepts a re-pilot of success paths; missing walk screens are a gate
  refusal; every backlog row has a severity. Reason: bars that could not be read, prompts naming
  their control, a gate that refused round 1 forever.
- **2026-10-17 to 2026-10-19 (me, first to fourth reviews of tier 3, summarized 2026-10-20):**
  Landed: T51 added and run at 4; T47 A cubes; T45 B blue; T41 "is missing"; B prompts a
  colleague's; T48 "when the file first opened"; Tom off several-layer tasks and T51; exit test
  and `decided.md`; any community analysis counts on T46 to T48; T49 graded by the drawing; bar 4
  = 10; T51 B companies; bar 5 not scored when the walk skips a screen; a styled node left
  selected graded by the tree; "Starts with" typing in bar 6 (on paper). Not taken: T51 B on
  College football's conferences. Reason throughout: routes no check saw, grades the key could
  not give, bars that could not be met.
- **2026-10-08 to 2026-10-16 (tiers 2 and 3 design, summarized 2026-11-05):** Accepted the owner's V7;
  words say what happened; Unset is Clear, with Undo; focus never falls to the page. Criteria: a bar for
  expert and screenshot findings, "not scored" is not met, no door removed on fewer than 8 sessions, a
  dry run walks the commonest detours, a gate enforced by the command every session runs. Kept:
  Shift-click, Filters icon, Replace page. Rule language is copied, never discovered (0 of 16 typed "=").

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
- 2026-10-02 (studio, round 8, folded 2026-11-05) -- Label "+" adds a line and opens its picker;
  one live find box; a node opens on its data tab and its degree selects its neighbors; a sample
  opens with nothing run; Export > Data opens on the showing table. Reason: each was a measured trap.
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

- 2026-11-05 -- WORKED: my round 1 review moves. T91 and T94 as returning readers gave round question 2
  an answer, later dropped as study-taught, and the plant fired on T92 A. Tracing a finding to source
  moved two conclusions (the run result; the names already in `wordsFor`). DID NOT: "Colored row only if
  sessions show readers missing it": the bar was wrong, since a contradicted screen needs no wrong belief.
- 2026-11-05 -- DID NOT WORK: tier 6's launch. The gate check sat only at `--start`, so 24 sessions
  and 24 graders ran to one refusal, and "the cap is far above what 12 sessions need" did not survive
  the dry runs. My own review asked for eight changes and no request budget check. WORKED: two
  skeptics again: they cut Talk to 2, dropped the chip-click route and settled the model-made
  selection from the route log, not from memory.
- 2026-11-05 -- WORKED: a script over all 14 tier 6 prompts against the avoided list (no hit) and a
  grep for each kept word's other uses, which found T93 B's "connected". A word check does not see
  a value: the key `sk-study-expired-2025-key` passed it. Read the setup values too. Outcome of the
  eight changes is unknown until the round runs.
- **2026-10-29 (me, review of tier 4 criteria and tasks; build not yet named, no session run):**
  Eight changes: grade from a saved data state (sources, roles, kinds, filter cards with effect,
  order and counts, visible and selected counts) with `real.mjs --end` refusing without it; a tier
  4 scripted walk of the data screens and a passing wording check before sessions; T60 drops "web
  address"; T64 asks for the outcome, not "stronger" / "farther"; T65 B moves to river data (both
  halves were people networks); T63's place half needs no action (lat/lon detected at load), so
  make it need one on B or stop claiming it is measured; answer key ambiguities (T61 "did not fit"
  covers P13 only; every "pilot to confirm" value and criteria line one filled before the gate);
  a cost bar (median steps at most 1.5x the key on core tasks), a scripted axe check in bar 5, and
  Sam on a new surface (join screen) instead of T62. Reason: bars that cannot be read, prompts that
  name their control, a "two domains" claim that is one domain. Evidence: `NetworkDataDialog.tsx:75`
  placeholder, `Fields.tsx:560` "Higher weight means" (options stronger, farther),
  `tool/bars.mjs` (WALKS, WALKS3 only), `tool/real.mjs` (styleTree capture only), `tier4/answers.md`
  T63 note (lat/lon designated at load), `tier4/backlog.md` (families: only text operators).
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
- **2026-10-17 to 2026-10-19 (me, first to fourth reviews of tier 3, summarized):** Landed: T51
  at 4, B prompts a colleague's, exit test and `decided.md`, bar 5 not scored when the walk skips
  a screen. Reason throughout: routes no check saw, grades the key could not give.
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
- **2026-09-26 to 2026-10-09 (tiers 1 and 2, summarized 2026-10-30):** Owner rules I work under:
  stop mocking and study the real app; element returns facts, app writes words; first-time users
  first; design for the intermediate user, personas validate and never generate; no one-domain
  special cases; toolbar icons with delayed tooltips; a run paints as soon as it finishes; usage
  data opt-in. Studio decisions that held: one live find box with "Select where" value hits; a
  node opens on its data; sample opens with nothing run; Export is one dialog; label "+" starts
  empty. My rules from then: a dry run walks the commonest detours, not only the key; test the
  real app before redesigning; every bar scorable without judgment; no door removed on fewer
  than 8 sessions.

## Tried: worked / did not work

- 2026-11-03 -- TIER 5 ROUND 1 RERUN (30 sessions). WORKED: repro folders for every sev 3 and
  reading the frozen source to name the mechanism (`card.top ?? 10`, missing `openedNew`). DID
  NOT: a "least sure" question as a bar 9 feed (it makes everyone name something); one session
  carrying a task's success bar (T75 A); a task whose key wants a rule its words never ask for.
- 2026-11-03 -- TIER 5 ROUND 1. DID NOT: launching with no start-gate evidence in plan.md (60 of
  60 starts refused, round void, one-round cap spent). WORKED: two skeptic checks on expert
  findings (dropped decided behaviors, weakened a words-budget count that included chrome and
  user layer names); expert walks found a sev 3 speech defect with log and screenshot evidence.
- 2026-11-02 (second review) -- WORKED: `git log <frozen>..HEAD` on the product folders; it showed
  the gate's blockers already fixed past the frozen build. WORKED: running `wording.mjs` and
  reading which words repeat in every task (the follow-up). DID NOT: the overwhelm rating as an
  instrument (1.5 gap, reasons named defects not crowding); the 2-pass safety cap as written;
  the Fill placeholder-of-what-lies-beneath (2 of 2 named it).
- 2026-11-02 -- WORKED: grepping the tools for the tier's task ids before reading the bars; it
  showed in one command that no tier 5 bar has a script. WORKED again: grepping the app's source
  for each prompt's words (no success-path echo in tier 5). DID NOT (in the placement study): a
  1-7 overwhelm rating from same-model participants as a discriminating measure.
- 2026-10-30 -- Tier 4 with one round and a safety cap: did not reach the bars; three of seven
  failed on real defects (keyboard, clipped source row, join cost), two only as frozen. A single
  round finds problems but cannot credit fixes.
- 2026-10-30 -- Two independent skeptic checks on scores: worked; they caught a tool defect, a
  key-definition false done and inflated severities.

- 2026-10-29 -- WORKED: searching the app's source for each prompt's key words before any
  session; it found two echoes (T60, T64) in a minute with no wording tool for tier 4. DID NOT (in
  the materials): a "two domains" rule met by task letter rather than by kind of data.

- 2026-10-17 to 2026-10-21 (tier 3, summarized 2026-11-05) -- WORKED: Node | Edge layer list as the
  door; Box via Everything or a folder; Louvain grouping; "Picked by hand"; a first review naming each
  ask with its reason; `session.json` build stamps per half; matching a pass's rows to the commits
  before it. DID NOT: Graph inspector as first door for node color (9 sessions); new style lines at
  the current value; members by id; hex-first color box; colorWord's keyword table; success as the bar
  at 55 of 56; criteria prose asking for tool changes (three times, nothing built); a new task without
  its screens in the walk; a dry run ending on "finds nothing new" (four passes, 41% of the last list
  caused by the one before).

- 2026-10-09 to 2026-10-11, summarized 2026-11-05 -- TIER 2. WORKED: Shift-click adds (7 of 7), toolbar
  Filters icon (7 of 7 first door), find box hint, Replace and its marks, one path per problem. DID NOT:
  an unenforced gate, briefing leaks, a dry run walking only the key, several variants per problem, 0 of
  16 typed "=", Replace only on right-click, long names cut, scripts claimed built but absent.
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

- 2026-10-09 to 2026-10-11, folded 2026-11-03 -- TIER 2. WORKED: Shift-click adds, toolbar
  Filters icon, find box hint and example, Replace with marks, dry runs widened to detours and the
  tool, one path per problem. DID NOT: unenforced gates, briefing leaks, several variants per
  problem, Replace only on right-click, long names cut, scripts claimed built but absent.
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

- 2026-11-05 -- An assistant adds a kind of trust earlier tiers never had: the sentence and the
  record can differ. The model's prose is not ours to fix, so the app's lines are the record, and
  a reader must be able to tell them apart. Finding 10 (a change line reads as prose, seen by two
  walks) is a question for the sessions, not a finding yet.
- 2026-11-05 -- A review should also ask what the study will cost before it starts. A study that
  cannot afford its sessions fails its reader as surely as a leading prompt.

- 2026-11-05 -- An instruction to doubt tests the instruction. Ask for confidence after the work,
  as a follow-up, and record what the reader did before it. The same holds for a count: asking
  for it in the prompt tells the reader to look.
- 2026-11-05 -- Undo on the newest step only is a decision a one-change task can never stress.
  Whoever regrets an AI change has usually done something since.

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
- 2026-10-06 -- Still open: the "attribute" word; Size's home; usage-data wording; one keyboard-only
  and one screen-reader participant on the chained walk; real people eventually.

## Sources

- Tier 6: `tier6/rounds/round-1/` and `round-2/` `insights.md`, `scores.md`, `expert/`; `tier6/criteria.md`, `tasks.md`,
  `answers.md`, `roster.md`, `design.md`, `decided.md`; `design/ai/assistant-chat-research.md`;
  `tool/tier6.mjs`; `graphty/src/workspace/assistant/` (2026-11-05).
- Tier 4: `tier4/` criteria, tasks, answers, roster, decided, backlog; `design/data/filter-cards.md`.
- Tier 3: `tier3/report.md`, `dry-run-r1-4.md`, `decide/user.md`; `tool/bars.mjs`, `real.mjs`,
  `wording.mjs`; `tmp/tier3-dryrun-analysis/` (main checkout).
- Tiers 1 and 2: `tier2/rounds/round-1..4/`; `digests/`; `.claudehistory/3a19ea55-f3cc-4fc0-b85f-
842243f52536.jsonl` (2026-09-26, the role defined).
- 2026-11-02: `tier5/criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `decided.md` headings,
  `owner-feedback-2026-11-01.md`, `placement-study.md`; `selection-groups/spec.md` headings;
  main checkout `tmp/selection-redesign/study/panel.md`; `tool/steps.mjs`, `bars.mjs`, `real.mjs`.
- 2026-10-29: `tier4/criteria.md`, `tasks.md`, `answers.md`, `roster.md`, `decided.md` (R1-R15),
  `backlog.md`; `design/data/filter-cards.md`, `data-management-requirements.md`;
  `graphty/src/workspace/start/NetworkDataDialog.tsx`, `data-place/Fields.tsx`, `data-place/words.ts`.
- 2026-10-17 to 2026-10-21: `tier3/report.md`, `criteria.md`, `tasks.md`, `answers.md`,
  `dry-run-r1-4.md`; `tool/bars.mjs` (WALKS3), `tool/real.mjs` (gateCheck, styleTree),
  `tool/wording.mjs`; `tmp/tier3-dryrun-analysis/` (main checkout).
- 2026-10-08 to 2026-10-12: `tier2/rounds/round-1..4/` insights, scores, expert walks;
  `tier3/decide/user.md`; `graphty/src/workspace/graph-place/FindBox.tsx`, `canvas/legendWords.ts`.
- 2026-09-26 to 2026-10-07: `digests/` (decisions, framework, owner-voice, study-rounds, tier1);
  the storyboards worktree's `prototype/study/decision-log.md` "Round 8"; the User Advocate's own
  outputs under `.claudehistory/3a19ea55-.../subagents/workflows/` (extraction scripts in
  `design/ui/studio/tmp/user-notes/`).
- `CLAUDE.md` (Architectural Principles; graphty-element is neutral about presentation).
