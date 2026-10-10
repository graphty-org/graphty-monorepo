# Content Designer's notes

I own the words on screen in the graphty app: labels, tooltips, messages, empty states, the
usage-data card, and the glossary terms as they appear. One term per concept; the field's
standard terms kept intact; plain words only for the product's own concepts; no verbose help text.
I read this file at the start of every session and update it as I decide and learn.

## Top of mind

- 2026-10-10 Round 2 closed. Adopted from my proposals: find "No match" plus the example rule
  (change 4a), "=" back in the suggestion (4b), a rule-made layer named by its rule (8), path
  row "<column> <total>" (12), key scope only when drawing and run differ (9), shorter unweighted
  note (9). NOT adopted: naming 2 to 3 picked nodes by their names -- only rule selections change.
- 2026-10-10 Round 3 words budget is mine: bar 9 (b) must fall to round 1's counts on four
  screens (rest 55 -> <=53, path inspector 70 -> <=66, neighbor list 38 -> <=36, edge inspector
  34 -> <=30). Every word fix names what it deletes; "no new word anywhere".
- 2026-10-10 Key scope wording to write: no filter + whole graph = "PageRank"; under a filter
  "PageRank, full graph"; narrower run keeps "on N nodes". Unweighted note: `Each edge counts as
1; "weight" has no meaning set.` Neighbor list: cut two words at rest.
- 2026-10-10 Round 2 credits nothing it measured as "worked": participants read the facilitator
  tasks.md. A problem found anyway is robust; a route that worked is weak. Re-run before crediting
  Higher means at load, Replace in "...", the find rule hint.
- 2026-10-10 Prompts are words too: "stand out", "who was first before", "make sure" each produced
  behavior read as user need. T22/T24 lose "stand out". Grade against the prompt's own words.
- 2026-10-10 Watch in round 3: does "No match" + example rule get 3+ of 8 to a rule (else "Select
  where..." comes next)? Does "minutes 14" end the weight doubt? Does the rule-named layer make the
  key readable? Does "PageRank" without scope cause anyone to misread a filtered drawing?
- 2026-10-10 Owner list, unchanged: bare numbers in rules (element), what edge width measures.
  Until then "backtick" stays out of reader words; the "=" form carries it.
- 2026-10-10 Escape in the step editor will say "cancelled" in the status line (change 6) and a
  repeated status is re-announced (change 14) -- word those lines short, subject first.
- 2026-10-09 Find hint: the ELEMENT decides if text is a rule; the app reads no syntax.
- 2026-10-09 Word faults hide on detours: every preflight styles a selection and reads the key.
- 2026-10-09 Deferred, mine to re-raise only on evidence: Hops, Select endpoints, Capacity, Leave
  out preselected, "Edit source..." vs "Replace: team.csv" (sev 1), "Components 1" under a filter.
- 2026-10-07 Element English leaks are element defects (code + params); CSV export headers may be
  a format contract -- one-way door.
- 2026-10-06 Words cannot fix a missing route; a word never promises what the screen does not do;
  task wording never echoes a fix.
- 2026-10-06 Budgets: at rest <= 50 words, inspector ~30 (max 40). Simulated: fail strong, pass weak.

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

- 2026-10-09 Tier 2 round 1 proposals (mine, to the studio, reversible, untested): (1) find box,
  text with a comparison sign and no match: second line "Rules start with =, such as <rule>",
  the rule from the typed column when it is one (`graph-place/FindBox.tsx` exampleRule);
  (2) "Total <weight column>" for "Total distance" (`inspector/RunValues.tsx`); (3) unweighted
  path note "Each edge counts as 1. <column>'s meaning is not set" (`analyze/words.ts`
  weightRead); (4) key title ", out of date" from the staleness fact; "N runs out of date"
  (`data-page/words.ts` replacedWords); (5) load status uses the header's name and adds
  "N rows left out"; (6) Replace page button "Replace" not "Load" (`DataPage.tsx`); (7) Shortest
  path: aliases chain, quickest, link, between; its line says "path", not "route". Kept as is:
  hops, Select endpoints, Dijkstra, Higher means, the Replace report, "N of M nodes" chip.
  Reason: each fixes a confirmed finding with the fewest words; none adds text at rest.

- 2026-10-09 Round 1 closed (tier 2 decisions.md): my seven proposals adopted as changes 4, 8,
  10 and 14, with one correction I accept -- the find hint fires when the element says the text
  is a rule, not when the app sees a comparison sign (the app must read no rule syntax). Reason:
  each fixes a confirmed finding with the fewest words and nothing new at rest. "Select where"
  routes held back so the words' effect is measured alone. Studio, reversible.

- 2026-10-09 Tier 2 round 2 proposals (mine, to the studio, reversible, untested): (1)
  `graph-place/FindBox.tsx`: a no-match that is not a rule adds "To select by a value, type a
  rule, such as =<exampleRule>" (reuses `exampleRule`; reason: 6 of 8 met bare "No match", sev
  3); (2) `ruleRefusalWords`: put "=" before the suggestion (engineer 5: typed as shown it is a
  plain search); (3) `style/StyleTab.tsx selectionName`: a rule-made selection is named by its
  rule (`selection.origin.text`), 2 to 3 nodes by their names, else the count (sev 2, 7
  sessions); (4) path run row: weighted total "<column> <total>" in place of "4 hops" (sev 2;
  same form as "value 17"); (5) `analyze/words.ts weightRead`: `Each edge counts as 1;
"<column>" has no meaning set.` (-4 words, read as a warning in r2-s28, s29); (6)
  `canvas/legendWords.ts rowName`: "PageRank, full graph" when the run covered the full graph,
  else keep "on N nodes" (sev 2, eight sessions; glossary state word). Reason: each fixes a
  confirmed finding and the set lowers words at rest.

- 2026-10-10 Round 2 closed (tier2/rounds/round-2/decisions.md, Design Director). Adopted:
  changes 4 (a: example rule after a non-rule "No match", once, never at rest; b: suggestion
  with "="; c: Enter or click runs the shown rule), 8 (layer named by its rule without "="), 9
  (scope words, shorter note, two neighbor-list words out), 11 (search aliases linked, between,
  fewest, chain, in between -- never shown), 12 ("<column> <total>"), 15 (no "stand out").
  Rejected: names for a 2-to-3-node selection (only rule origin changes, so 8 is measured alone).
  Reason: one change per confirmed finding, words at rest must go down. Studio, reversible.
- 2026-10-10 Change 5's Add-page line (repeated ties) and Replace button are new words but only
  off-rest, above the buttons, count against incoming edges; mine to word with the fewest words,
  e.g. "41 of 41 edges are already loaded" + "Replace friends". Studio, reversible.

## Tried: worked / did not work

- 2026-10-10 LEARNED (round 2 close): my proposal set was meant to lower words at rest, but the
  Director wrote the deletions as a separate change (9) with a count acceptance. Lesson: a word
  proposal ships with its bars.mjs count before and after, per screen.
- 2026-10-10 LEARNED: the study's own words (prompt and task file) moved behavior more than any
  screen word this round. Read the prompt before blaming a label.

- 2026-10-09 DID NOT WORK (tier 2 round 2): bare "No match" for a condition in the reader's
  words (6 of 8, r2-s12 six wrong turns); "Put numbers in backticks:" without "=" (r2-s15 "I
  don't know what a backtick is"); a selection layer named "13 edges" / "2 nodes" (7 sessions);
  "Shortest path 4 hops" beside minutes (5 doubted the weight); "PageRank on 20 nodes" with 15
  drawn (8 stopped); my round 2 additions raised words at rest on every tier 2 screen (bar 9 b).
- 2026-10-09 HELD (weak evidence, facilitator text read): the find hint once reached (7 of 8),
  "Higher means: Not set" left correctly on Replace (8 of 8, quoting the line under it).

- 2026-10-09 WORKED (tier 2 round 1): "Higher means" on the load page (every participant who
  reached it chose right); "Loaded weight minutes (farther)"; the Replace page title and "Was N;
  now M"; the filter chip agreeing with the Filters row; the Analyze line "The fewest steps ...
  between two nodes" led most T18 participants. 0 false "done", 0 weights read backwards.
- 2026-10-09 DID NOT WORK: "No match for ..." on a typed condition (4 of 4); "Total distance 14"
  (7 of 7); the "Not read --" weight note (4); "Select endpoints" guessed (4 of 4, all found it);
  "As the file says" on a CSV, which loads directed (behavior first: graph-io/element fact).

- 2026-10-07 WORKED (re-pilot, round 3 build): method names on every run surface listed above;
  "Show all labels" reached every name on two datasets in 5 steps; the count shortening kept words
  at rest flat. Lesson: an unbuilt decision is found only by a preflight on the served build.
- 2026-10-07 LEARNED (round 2 closing): the insights filed the unbuilt run rename as a design
  opinion; the Director corrected it to an unbuilt decision. Severity of a word defect depends on
  whether it was decided -- always cite the decision.
- 2026-10-07 LEARNED: the bind door's two names merged when Size "+" opened the list titled
  "Size by attribute"; an IA route fix removed a word problem. Fix the route first, then words.

- 2026-10-07 WORKED (round 2): the Degree row as the door to the neighbor names, 8 of 8 (no word
  change; the chevron cue did it). The Open-route refusal again (3 of 3, ease 6). The hidden count
  again: every participant who read it said names were missing. The usage card: no wrong belief.
- 2026-10-07 DID NOT WORK (round 2): the Data page's damaged-file refusal ("could not be read as
  GraphML. Check the file, or pick another format in File settings") -- no cause, no line, remedy
  points at format; `data-page/words.ts` E_PARSE_FAILED still carries the stale "#803" comment
  though the element now reports the line (`project/actions.ts` notReadSentence uses it).
  Lesson: one code, one sentence -- share the function, do not write a second.
- 2026-10-07 DID NOT WORK: "Undirected, from the file: directed 0" (6 sessions) -- raw file syntax
  pushes the label out; "Edges per ..." truncates (`inspector/words.ts` directionWords).
- 2026-10-07 DID NOT WORK: the bind door has two names, "Size by attribute" (tooltip and
  accessible name, `style/words.ts` bindLabel) and "Size from data" (popover title,
  `style/SetLine.tsx`); a participant read the chain icon as "links to her file".

- **Tier 1 lessons (summarized 2026-10-10).** WORKED: refusals naming faults with line numbers;
  "never uploaded" / "Local only"; "Note on: <thing>"; Privacy "Where your data goes"; one
  wording pass + lint fixed six concept splits. DID NOT WORK: seven weight wordings (words
  cannot rescue an unsettled model); a bare "within 1%" (a number needs its basis); "Money
  in/out" (one-domain + task echo); "Show labels" first item (a control matching the task's
  words must do the task); a count with no names behind it; samples arriving pre-explained;
  nine-term binding popover (fold rare options).
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

- 2026-10-07 **Tier 2 words (proposal to the studio, not yet decided or tested).** Filters: chip
  "Full graph" / "Filtered: 2 of 22 nodes" (glossary state word + the "N of M" form); step reads
  as one sentence "[weight] [is at least] [4]"; an edge-attribute step's inspector line "Keeps
  edges that pass and the nodes at their ends"; empty "No filters. Add filter"; after undo the
  notice names the step. Checkbox: accessible name "Apply step: weight is at least 4"; the
  glossary's "Turn off step" is a menu verb -- one of the two must go (open). Path: "Path between"
  (P), fields From, To, Follow (directed only), Weight; summary "3 nodes, 2 edges, length 7"
  (length only with a distance weight); never "route". Notes: refined B section 8 words as
  written; empty "No notes. Add note (N)". Weight: Data page "Higher means: Stronger | Farther |
  Capacity", with nothing chosen for an auto-picked column; Analyze "Weight: weight, stronger
  (loaded)"; override recorded in Made with "Weight: emails, stronger (this run only)"; no meaning
  -> path runs refuse or run unweighted with "(unweighted)". Node weight: line only on entries the
  catalog marks; attribute text "No measure reads node weight yet". Replace: "Replace with
  file...", page title "Replace: friends.csv", report "Was 20 nodes, 60 edges; now 22, 74";
  stale rows "Data changed since this run -- Rerun". Edge inspector title "Ava -- Kofi" /
  "Ava -> Kofi". Neighborhood popover: "1 | 2 | 3 hops", "Follow: Out | In | All".
- 2026-10-07 Element must give codes, not English, for: filter plan counts per step; selector
  parse failure (number needs backticks, unknown attribute); path refusal (no path, weight has no
  meaning); replace report (added, removed, changed counts); staleness reason (data replaced,
  filter changed) by data version, not by count.

- 2026-10-07 Announcement words (round 3 proposal): load "<Name>: 77 nodes, 254 edges"; run
  "<Method> running" then "<Method> finished". Both from the element's load and run events; no
  English from the element. Watch for double speech with the existing "added, running".

- **Older tier 1 threads (summarized 2026-10-09).** Labels: an empty label line's accessible
  name is long; measure before rewording. Neighbors: a count must open to names. Find
  placeholder names only what the box returns. Legend: one plain sentence from element facts,
  no advice. Analyze headings: test in a tree test, never by taste. Start screen: no sentence on
  an empty Recent; keep "remembered in this browser" where recents exist. Usage card draft
  (data yours, never seen, what is recorded incl. masked replay, who reads it) is with the owner.
  Disabled controls state their reason in tooltip and aria-describedby. Tooltip delay 500 vs
  1000 ms is compact-mantine's.

## Sources

- `design/ui/studio/tier2/rounds/round-2/decisions.md` changes 4, 5, 8, 9, 11, 12, 15 and
  "Not changed" (2026-10-10)

- `design/ui/studio/tier2/rounds/round-2/insights.md`, `scores.md`, `preflight.md`, `expert/`
  (figma 1, 2, 16, 23; engineer 5); screenshots `sessions/r2-s12/03.png`, `r2-s15/06.png`,
  `expert/figma/path/06.png` (2026-10-09)
- `design/ui/studio/tier2/rounds/round-1/insights.md`, `scores.md`, `expert/` (figma, a11y, visual);
  screenshot `sessions/r1-s46/12.png`; transcripts r1-s05, r1-s19 (2026-10-09)

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
