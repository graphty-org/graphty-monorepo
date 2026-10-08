# Content Designer's notes

I own the words on screen in the graphty app: labels, tooltips, messages, empty states, the
usage-data card, and the glossary terms as they appear. One term per concept; the field's
standard terms kept intact; plain words only for the product's own concepts; no verbose help text.
I read this file at the start of every session and update it as I decide and learn.

## Top of mind

- 2026-10-07 TIER 2 word proposal made (see Thinking, "Tier 2 words"). Three word conflicts between
  refined B and the glossary must be settled before building: neighborhood "Out, In or Both" vs
  glossary "Follow: Out | In | All"; Path popover "Direction" vs glossary (Direction is the
  graph's property only -> "Follow"); weight meaning "Stronger | Farther | Capacity" vs glossary
  roles similarity/distance/capacity/unknown. Proposed: glossary wins on Follow; refined B's
  meaning words stay on screen, glossary updated to map them, plus a "Not set" state.
- 2026-10-07 Shortest path on friends.csv reads tie strength as distance: a WRONG ANSWER, not a
  wording gap. Words cannot fix it: an unset meaning must never be read as distance (element).
  "Shortest route" in the legend uses a rejected synonym ("route"); say "path".
- 2026-10-07 Select where: "=weight > 3" fails silently (uncaught throw). Need a code from the
  element and a refusal under the box; whether the element accepts bare numbers is a query-format
  change -> one-way door, owner-decisions.md.
- 2026-10-07 Path row crash (RunValues histogram on a boolean): the path row's Data tab is
  Summary, Members, Made with, Notes per refined B -- route by the run's kind, not a word issue.
- 2026-10-07 Method naming not finished: layout "Group by: Communities", key "Group 1..6",
  "Measure from PageRank, Oct 7". One name per run on every surface, including layout forms.
- 2026-10-07 Element English leaks in layout refusals; element must return code + params. File it.
- 2026-10-07 Deferred, push into round 4: one refusal for a damaged file on both routes; "Undirected,
  from the file: directed 0" overflow; "Edges per ..." truncation; raw hex "Color 6366F1".
- 2026-10-07 CSV export headers `results.louvain.group` -- confirm whether a format contract
  (one-way door) before renaming.
- 2026-10-07 Keep word for word: "N labels, M hidden" + "Show all labels", the Open-route refusal,
  the usage card, "Saved in this browser".
- 2026-10-06 Words cannot fix a missing route; fix by deletion first; refusals sit next to the
  control that failed; a word never promises what the screen does not do.
- 2026-10-06 The app writes ALL reader-facing words; an English string from the element is an
  element defect, never reworded in the app.
- 2026-10-06 Budgets: at rest <= 50 words, inspector ~30 (max 40). Bar 9 never run.
- 2026-10-06 Simulated evidence: a fail is strong, a pass weak; task wording never echoes a fix.
- 2026-10-06 One name per thing: header "Les Mis work" vs outline "Graph Les Miserables"; and now
  the Sources list shows only the last file and the header reads "From <last file>" (tier 2 audit).

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

- **Round 3 watch list (2026-10-07).** (1) every run named by its method, including layout
  "Group by" and the key's group rows; (2) participants reading element English in layout refusals;
  (3) does "Show all labels" read as the route to every name, without the task echoing it; (4) do
  load/run announcements speak once, with the method name; (5) bar 9 word count on the served
  build; (6) does anyone misstate what PageRank measures with no on-screen basis.
- **Round 2 watch list (closed).** (1) method names live on every surface; (2) does anyone still miss the
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
