# Content Designer's notes

I own the words on screen in the graphty app: labels, tooltips, messages, empty states, the
usage-data card, and the glossary terms as they appear. One term per concept; the field's
standard terms kept intact; plain words only for the product's own concepts; no verbose help text.
I read this file at the start of every session and update it as I decide and learn.

## Top of mind

- 2026-10-06 Round 2's first word check: is every run named by its method ("PageRank",
  "Betweenness", "Louvain") in the inspector row, legend, layer list, table header and exported
  CSV? Decided for round 2 (decisions change 11), but the re-pilot build e82708488 still said
  "Influence" and "Communities" everywhere. Verify live before any session runs; the answer key
  keeps "Influence" as accepted.
- 2026-10-06 Words cannot fix a missing route. Round 1's worst task (neighbors by name, ease 2.75)
  is fixed by routing: the Neighborhood command on one node opens "<Name>'s N connections".
  The Degree-row cue I proposed (chevron, "17 connections") was rejected so round 2 can tell what
  helped. Do not reword the Degree row until the routed build is measured.
- 2026-10-06 Fix by deletion first. Round 2's summary fixes delete words: no commonest value when
  it occurs once ("Babet (1)" for 18 nodes), no "Edges 0" beside "Edges among them". "18
  different names" was rejected: it adds words on an unchecked fact.
- 2026-10-06 Refusals sit next to the control that failed, never in the notice slot. The build
  says, under Method: "No crossings could not lay out this graph, so the drawing is unchanged".
  It passes my caps loosely (12 words); it names the method and the outcome. Keep it; check it
  stays until the method changes.
- 2026-10-06 The honest label count works: 0 false "done" on names in 29 sessions (round 8: 10 of
  21). Keep "N labels, M hidden to avoid overlap" word for word. Next step is wheel zoom (now
  fixed in the element), then a control only if people still stall -- never more words.
- 2026-10-06 Internal names leak where the reader leaves the app: exported CSV headers
  (`results.louvain.group`), the CSV warning (`"style.color"`, "generic dialect", "importer"),
  and "Undirected, from the file: directed 0" / `"directed": f`. These are my defects; queue them
  for the words-at-rest baseline and the export pass. Export column names may be a format contract
  -- check before renaming (possible one-way door).
- 2026-10-06 A word must never promise what the screen does not do, and every count is computed
  from the live state or removed. A number names its unit and its whole ("1,204 of 9,113 edges").
- 2026-10-06 The app writes ALL reader-facing words (owner 2026-10-03: graphty-element returns
  facts plus `{ code, params }`). Wrong words are my app defects; a missing FACT is an element
  issue. The element's English `run.label` is a recorded defect, not removed in round 2 (public
  API).
- 2026-10-06 Standard terms stay: betweenness, PageRank, degree, components, modularity (owner
  2026-09-26). Friendly words only as search aliases.
- 2026-10-06 One name per thing: after a save the header says "Les Mis work" while the outline
  says "Graph Les Miserables". Raise it; one project, one name.
- 2026-10-06 "Attribute" still under test (round 8: 5 of 12 not their word). Re-test on two
  domains before changing it.
- 2026-10-06 Budgets: at rest with a graph loaded, at most 50 words of app text; an inspector about
  30, max 40. Bar 9's script on the round 1 build is the baseline -- no fix may add at-rest words.
- 2026-10-06 Usage-data card: owner's text stays until the owner chooses; my tightened draft is in
  Thinking (6 of 6 misread "his Claude Code sessions" and "replay").
- 2026-10-06 Simulated evidence caveat: all participants are one model; a fail is strong, a pass
  is weak. Agreement across personas is not independent confirmation. Word findings need a code
  cause or a reproduction.
- 2026-10-06 Task wording never echoes the words a fix puts on screen; every wording change is
  tested on two domains (owner 2026-09-29).

## Priorities and values

- **Words match outcomes.** A label is a promise. If the click after the right click fails, the
  first-click score is meaningless (round 8: first click 87%, tree 99.7% correct, tasks still
  failed on what happened next).
- **One term per concept.** A second name for one thing reads as a second thing; one name for two
  things ("Data" as rail place and inspector tab) drops selections and confuses screen readers.
- **The field's words, intact.** The design target is the intermediate weekly analyst; novices are
  served by aids everyone gets ((i), tooltips that wait, aliases, samples), never by renamed
  science or persona-specific text.
- **Less text.** The owner's longest-running complaint (2026-09-05 onward): "intimidatingly
  text-heavy", "still very text heavy". v1 failed by cluttering the screen with novice help.
  When in doubt, delete.
- **Trust on first use.** graphty.app plus Sentry will be the real user study; the first shipped
  words must not bust trust (privacy card, counts, claims).
- **Voice of a methods section.** Facts, the next verb; never praise, apologize, encourage or
  recommend.

## Design criteria

- **Purpose test** -- every string says what a value is, whether to trust it, or what to do next;
  otherwise cut. Reason: text that does none of these is the clutter the owner keeps rejecting.
- **Computed or removed** -- no hand-typed count or claim. Reason: numbers disagreeing between
  screens recurred in rounds 2 to 8.
- **Live claims** -- a message may say something "paints" or "is shown" only when the canvas
  changed. Reason: round 8, Degree claimed "Size 0.5 to 3" while hidden.
- **One door, one label** -- the same command is spelled identically in menus, tooltips, Quick
  actions and accessible names ("Add label line", not "Add a label line"). Reason: a tooltip
  worded differently reads as a different action.
- **Unique accessible names** -- a qualifier wherever two reachable controls share visible words.
  Reason: round 8 finding 5; identical by ear for the screen-reader participant.
- **Glossary terms only** -- every on-screen graph word is a Screen term in
  `design/ui/framework/glossary.md`; rejected synonyms are defects on screen and live only as
  aliases. Reason: the conceptual model is the product's spine.
- **Placeholders name only what the box returns** -- "Find rows, elements, values" only if it
  really finds all three; "Filter analyses" because it filters. Reason: "Find rows and notes"
  told readers names were not searchable, so they left (round 8, severity 4).
- **Counts carry units and wholes; sizes in the element's units, never "px"**. Reason: the
  "Line 5", "Arrow head 4" owner review.
- **Copy conventions** -- American spelling, sentence case, no final period on labels/notices,
  "..." only for more input, ranges with "to", plain ASCII, no "please/sorry/successfully/!",
  no "Invalid" or "error" as a whole message. Reason: `design/ui/framework/content-design.md` 2-3.
- **Message caps** -- notice 6 words subject first, error headline "Could not {verb} {object}"
  8 words, (i) 2 sentences, tooltip one line. Reason: Figma's toasts; scanning.
- **No one-domain wording** -- "Total <attribute> in/out", "value 17" unless the data declares a
  unit; no currency detection. Reason: owner, 2026-09-29.

## Decisions and reasons

- 2026-09-26 Keep standard technical terms; friendly words only as search aliases. Reason: owner
  ("leave betweenness instead of using brokers"). Decided by the owner.
- 2026-09-28 Reader messages published as `{ key, params, text }` with keys
  `graphty.<area>.<message>`. Owner. Since 2026-10-03 the element supplies key and params and the
  app supplies the text (presentation neutrality, owner).
- 2026-09-29 No one-domain words: "Money in/out" dropped for "Total <column> in/out"; every label
  change tested on two domains; task wording never echoes a fix's words. Owner (overfitting).
- 2026-09-29 "Recipe" is the one noun for a saved style or workflow file; "style file" retired.
  Studio (rounds 4-5). Drifted back as "Apply recipe or style file..." in refined B; unresolved.
- 2026-09-29 One fixed form for scoped counts, "N of M <noun>", and the scope rule lives in the
  shared catalog so every consumer says the same thing. Me, round 6 triage; adopted.
- 2026-09-29 A layer made from a run names its run with the run's exact title as the run list
  shows it. Me, round 6 triage (withdrew my own spelling for the shared rule).
- 2026-09-30 American spelling everywhere. Owner.
- 2026-09-30 Owner's "hide"/"show hidden" for the list renamed "Remove from list view" / "Show in
  list view" because 4 of 5 read a "hidden" row that still paints as a bug. Studio, a deliberate,
  reversible departure from the owner's words.
- 2026-10-01 Toolbar icons only, tooltips after a hover delay. Owner. Tooltip = name plus key chip.
- 2026-10-03 Round 8 triage (my positions, adopted): remove the "Show labels" trap -- the Label "+"
  with no label anywhere adds an empty label line and opens its attribute list; "Add label line"
  is the one command name and tooltip; the line states live counts ("77 names, 64 hidden to avoid
  overlap"); "Show all labels" is the one name for the overlap switch (it had been "Labels shown
  anyway" and "Hide overlapping labels"); the "Labels shown anyway" row deleted.
- 2026-10-03 Find box placeholder "Find rows, elements, values"; list boxes all use the verb "Find"
  ("Find settings"), except Analyze's "Filter analyses" (it filters, it does not find). Ctrl+K
  stays commands only, with a "Find '<text>' in the graph" handoff. Studio, my proposal with IA.
- 2026-10-03 Inspector's second tab is "Values" (not "Data"); a node opens on Values. Studio.
- 2026-10-03 Table caption form "Full graph: 77 nodes, sorted by degree, highest first", the same
  before and after a sort. Me, skeleton wording pass.
- 2026-10-03 Presentation neutrality: the element returns no English; the app writes every word.
  Owner. Consequence: my words ship in the app (legend sentence, Analyze headings, catalog words).
- 2026-10-03 Tier 1 words (studio, reversible): "Pick an attribute", "Labels from an attribute";
  the "attribute" term is re-tested; a neighbor tie is labeled with its weight attribute's name
  ("value 17") unless the data declares a unit; start screen says "Recent projects are remembered
  in this browser; each project is a file saved where you chose" (round 8 finding 13); no folder
  shown for a saved project in a web build (the browser does not report one).

- 2026-10-06 Round 1 decisions (Design Director, reversible): runs named by method everywhere
  (my proposal, adopted); summary drops one-off commonest value and "Edges 0" (my proposal,
  adopted); refusal line under Method naming the picked method, no new element code (adopted,
  my "reason from an element code" dropped -- the app knows what it asked for); Degree-row cue
  rejected for round 2 (two changes at once); "Show all labels" beside the hidden count deferred
  behind wheel zoom; at-rest wording ("directed 0", "Edges per n...") deferred to bar 9's count.

## Tried: worked / did not work

- 2026-09-28 to 10-02 WORKED: the broken-file refusal naming faults with line numbers (8 of 8 would
  forward it); "never uploaded" / "Local only"; "Covered by PageRank for Color"; "Note on:
  <thing>" before typing; the Privacy page's "Where your data goes" (5 of 6 would forward it);
  the communities run's Data tab reading.
- 2026-09-29 DID NOT WORK: weight wording, seven turns ("bigger amount means", "Default for new
  runs", "Change...", the Weight role). The Loaded line's "not used yet. Change..." drew 27 wrong
  clicks. Lesson: words cannot rescue an unsettled model; the owner settled weight at load
  (2026-09-30).
- 2026-09-29 DID NOT WORK: a fixed near-tie percentage ("within 1%") read as rounding. Replaced by
  a fact with the method's real bound, or "=" for an exact tie. Lesson: a bare number without its
  basis is misread.
- 2026-09-29 DID NOT WORK: "Money in / Money out" -- ease jumped 2.00 to 5.00 partly because tasks
  echoed the new words. Lesson: the overfitting and echo rules.
- 2026-10-02 DID NOT WORK: "Show labels" as the Label "+" first item (12 of 21 picked it; 10 thought
  names were on). Lesson: when the task's words match a control's words, people pick it -- so that
  control must do the task or not exist.
- 2026-10-02 DID NOT WORK: "Neighborhood of Javert: Covers Javert and 17 neighbors" -- a count with
  no names behind it (0 of 12). Lesson: a count must open to its members, by name.
- 2026-10-02 DID NOT WORK: a sample arriving pre-explained ("Color: PageRank 0.00330 to 0.0754";
  "1 row not listed still paints", rejected 6 of 6). Lesson: samples open with nothing run; the
  legend needs one plain sentence on what a higher value means.
- 2026-10-02 DID NOT WORK: the binding popover's nine terms (Clamp, Below 0, Percentiles, Typed,
  Smallest mark, Detach ...) and three ideas of size. Lesson: rare options fold away; one size
  vocabulary.
- 2026-10-02 DID NOT WORK: the usage-data card as written (see Top of mind).
- 2026-10-06 WORKED (round 1, real app): "N labels, M hidden to avoid overlap" -- no false "done"
  on names in 29 sessions; participants read it and kept looking. The broken-file refusal again
  forwarded as is (ease 7).
- 2026-10-06 DID NOT WORK (round 1): method name swapped for a result name after a run (PageRank
  shown as "Influence", Betweenness as "Bridges"): 12 participants paused; never a failure. Cause:
  the app shows the element's English `run.label` instead of its own analysis words.
- 2026-10-06 DID NOT WORK (round 1): "Degree 17" as the only door to the neighbor names -- 0 of 4
  used it; ease 2.75, the round's worst. A bare standard term with a number reads as a fact, not
  a door. Words alone may not fix it; pair with a visible link mark.
- 2026-10-06 Seen, not yet raised: "Undirected, from the file: directed 0" on the graph's Values
  shows the file's raw syntax; "Edges per n..." truncates. Candidates for the bar 9 word count.
- 2026-10-06 WORKED (re-pilot): the refusal "No crossings could not lay out this graph, so the
  drawing is unchanged" under Method reads clearly next to its control. Untested by participants.
- 2026-10-06 SEEN (re-pilot, not tested): exported CSV headers and the CSV warning are written
  for developers; header and outline disagree on the project name after a save.
- 2026-10-03 WORKED (in the skeleton, untested by participants): one wording pass fixed six
  concept-name splits; the check tool's wording lint found none after. Lesson: a lint catches
  drift that per-page fixes miss.

## Thinking

- **Labels (T10, T15).** The build follows the round 8 decision: the Label "+" (tooltip "Add label
  line") adds an empty line and opens "Pick an attribute". Risk to watch: an empty line's
  accessible name "Label, Above: no attribute, draws nothing" is honest but long; and whether
  first-time users expect "name" rather than "attribute". The Les Miserables sample's name
  attribute is `name` (generated GML), which helps. Measure before rewording.
- **Neighbors (T12).** "<Name>'s 17 connections", each by name with "value N" (or nothing when
  unweighted). Ids in place of names break this; the fix is adopting #895 in the app. Check that
  the degree and the "N connections" chip read as links.
- **Find.** Placeholder must list only what the box really returns in the build (does it find
  values and notes in tier 1? Notes are not in tier 1). Likely honest wording for tier 1: "Find
  nodes, edges, values" or narrower. Verify live, then fix.
- **Legend sentence.** Write it in the app from the element's facts: "Larger = higher PageRank",
  "Color = Louvain community (6)". One sentence, no advice, no threshold comparisons.
- **Analyze headings.** "Measure the graph" paused 16 of 21; betweenness 29% direct. The headings
  are app words now. Candidates must be tested in a tree-test comparison, not decided by taste;
  question-shaped headings were rejected pending that test.
- **Start screen empty Recent.** The build prints "Projects you open or create appear here. They
  are kept in this browser." on first run. The template says the section is absent with no
  recents, and an empty surface carries no sentence. Weigh against round 8 finding 13 (people
  confused the list with their files). Leaning: drop the sentence on first run; keep the
  "remembered in this browser" line where recents exist. Check live.
- **Usage-data card draft (to the owner, keeping every commitment):** "Your data is yours. We never
  see the data you analyze. If you agree, the app records how it is used -- which commands, how
  long they take, errors, and a recording of the screen with every name, value and file content
  masked -- so we can make it easier to use. Only graphty's author reads it, with the help of the
  AI coding assistant (Claude Code) he builds the app with." Buttons unchanged. It keeps: data
  yours, never seen, usage collected, purpose, the only readers. It names the replay plainly
  rather than hiding it, since hiding it would be the trust-buster.
- **Tooltip delay** 500 ms (studio number) vs 1000 ms (compact-mantine ships). Not a word issue,
  but a 1 s wait on unlabeled icons was the steepest moment in the old novice walkthrough. Watch
  toolbar first clicks.
- **Disabled reasons** are words too: every disabled control states its reason in its tooltip and
  aria-describedby, e.g. the toolbar with nothing drawn.

- **Round 2 watch list.** (1) method names live on every surface; (2) does anyone still miss the
  neighbor list once Neighborhood opens it -- if so, then the Degree-row cue; (3) do people zoom
  to hidden names now, or still click the count; (4) exported CSV and warning wording (check
  whether column names are a contract first); (5) the refusal line's wording as participants
  report it.

## Sources

- `design/ui/studio/rounds/round-1/insights.md`, `decisions.md`, `rounds/r1/pilot/all/pilot.md`
  (2026-10-06)
- `design/ui/studio/digests/decisions.md`, `tier1.md`, `framework.md`, `owner-voice.md`,
  `study-rounds.md` (all 2026-10-06)
- `design/ui/framework/content-design.md`, `glossary.md`, `principles.md` (budgets, section 5)
- `.worktrees/feat-tier1-real-app/design/ui/tier1-real-app/tier1-design.md` sections 2.11, 4,
  5.T10-T12, "Adversarial review changes"
- `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/round-8/insights.md`
  findings 4, 5, 6, 13, 14, 15
- `graphty/src/workspace/` in the studio worktree (strings checked 2026-10-06: start screen,
  `style/LabelSection.tsx`, `analyze/AnalyzePopover.tsx`, `inspector/NodeValues.tsx`)
- `.claudehistory/3a19ea55-f3cc-4fc0-b85f-842243f52536/subagents/workflows/`: content designer
  runs `wf_6818e34f-76d` (round 4 triage, 2026-09-29), `wf_6959c5f6-35c` (round 6 triage and
  gallery wording pass, 2026-09-29), `wf_93e7ffbb-6da` (round 8 triage and skeleton wording pass,
  2026-10-03); extraction script `design/ui/studio/tmp/content_agents.py`
- Owner messages: `design/ui/studio/tmp/owner-all.jsonl` (2026-09-05 text-heavy, 2026-09-26 terms,
  2026-09-29 overfitting, 2026-10-01 toolbar tooltips, 2026-10-03 presentation neutrality)
