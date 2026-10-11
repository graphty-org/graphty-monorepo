# Content Designer's notes

I own the words on screen in the graphty app: labels, tooltips, messages, empty states, the
usage-data card, and the glossary terms as they appear. One term per concept; the field's
standard terms kept intact; plain words only for the product's own concepts; no verbose help text.
I read this file at the start of every session and update it as I decide and learn.

## Top of mind

- 2026-10-11 Round 3 closed. 54 of 56; no confirmed failure is a word failure. The real failures
  were Shift-click on a node (element, fixed for round 4) and T24's prompt disagreeing with its key.
- 2026-10-11 Round 4 word changes I own: find value row loses "Select where" (accessible name keeps
  it) plus a "<column> is 10 or more (N)" row from the element's new `atLeast` fact; the app parses
  no number. Acceptance: no cut find row on either dataset, words at rest unchanged.
- 2026-10-11 T24 prompt is now "point out Gus and Ivan, and nobody else, so that whatever you do
  next applies only to those two" -- names the outcome, not the control. A prompt names the
  measured outcome; pilots must run before a round (now a gate).
- 2026-10-11 Held this round, do not re-raise without new evidence: backtick refusal rewording
  (tied to the owner's bare-number question), ">=10" rewrite per column, "4 hops" -> "4 edges"
  (sev 1, T18 crowded), Hops 2 grouping (needs element `hops` fact; first in line on a 2nd session),
  "second path replaced" notice (adds speech).
- 2026-10-11 Repeated-ties line keeps its words; it gains a warning glyph and joins Load's
  aria-describedby. Fix weight and reachability before rewording.
- 2026-10-11 Watch in round 4: does "10 or more" get picked first on Les Miserables; T17 first
  moves with the "Filters" toolbar tooltip (round 3: 5 of 8 looked on the Graph place); "Start
  here" badge once only; filter-step counts naming edges ("20 of 41 edges").
- 2026-10-11 Bar 9 counter now leaves out data names; re-measured figures replace the old 31.
  Never cut a needed word to pass a broken count.
- 2026-10-10 Readers type the prompt's most prominent data word first (column name or bare
  number). 0 of 16 typed "=": the rule language is copied from hints -- hints must be runnable.
- 2026-10-10 Do NOT reword: "PageRank, full graph"; "Higher means: Not set" on Replace; Hops,
  Degree; "Select endpoints" (re-measure after the Shift fix).
- 2026-10-10 Backticks in rules stay until the element takes bare numbers (owner list). Stripping
  them in the app would be a workaround.
- 2026-10-10 A word proposal ships with its bars.mjs count before and after, per screen.
- 2026-10-09 The ELEMENT decides if text is a rule; the app reads no syntax.
- 2026-10-07 Element English leaks are element defects (code + params); CSV headers may be a format
  contract -- one-way door.
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

- 2026-10-09 Round 1 closed (tier 2 decisions.md): my seven proposals adopted as changes 4, 8,
  10 and 14, with one correction I accept -- the find hint fires when the element says the text
  is a rule, not when the app sees a comparison sign (the app must read no rule syntax). Reason:
  each fixes a confirmed finding with the fewest words and nothing new at rest. "Select where"
  routes held back so the words' effect is measured alone. Studio, reversible.

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

- 2026-10-10 Tier 2 round 3 proposals (mine, to the studio, reversible, untested). (1)
  `graph-place/FindBox.tsx` value row: visible text "<column> is 10 (2)" without "Select where"
  (the Values heading and filter glyph say it; accessible name keeps the verb) -- the row was cut
  in 4 sessions; plus, for a numeric column, a row "<column> 10 or more (N)", which needs an
  additive element fact (at-least count and its rule on find's value rows). (2) `ruleRefusal`
  backtick case: "Put numbers in backticks:" in red -> the existing "Rule: press Enter to select
  matches" in the hint color (r3-s09, s11, s13; figma 9; zero new words). (3) A condition with no
  column (">=10"): element offers the rewrite per numeric column, worded as (2). (4)
  `analyze/words.ts hopWords`: "4 hops" -> "4 edges", the Summary's own term (engineer 28). (5)
  Neighbor list at Hops > 1: subheadings "1 hop (N)", "2 hops (M)" from an element depth fact
  (figma 18, r3-s48). (6) `inspector/words.ts` disabled reason: "Already on. Turn it off in
  Filters", tied by aria-describedby (a11y 4). Reason: each fixes a confirmed sev 2 (6: sev 1)
  with fewer words; none adds words at rest.

- 2026-10-11 Round 3 closed (tier2/rounds/round-3/decisions.md, Design Director). Adopted from my
  proposals: (1) value row without "Select where" plus the "or more" row (change 7, with an additive
  element fact `atLeast: { count, target }`). Held: (2) backtick refusal -> "Rule: press Enter"
  (bare-number owner question), (3) ">=10" rewrite (the "or more" row answers bare numbers), (4)
  "4 hops" -> "4 edges" (sev 1; T18 already carries three changes), (5) Hops grouping (needs element
  fact, one session), (6) disabled-reason rewording (replaced by a check-first compact-mantine
  Tooltip fix, no word change). Reason: one variant per problem so round 4 can credit it; words at
  rest must not rise; claims from one specialist scripted before fixing. Studio, reversible.

## Tried: worked / did not work

- 2026-10-11 LEARNED (round 3 close): six word proposals became one change. The Director takes one
  variant per problem and drops anything that blurs credit on a crowded task. Lead with the one
  proposal that answers the most-observed behavior; list the rest as held, not as a set.
- 2026-10-11 LEARNED: a measurement check that reads nothing passed silently (leak check, bar 8,
  bar 9). Before trusting a word count, confirm what the counter counts.

- 2026-10-10 WORKED (round 3): "minutes 14" / "km 7.5" on weighted path rows (no weight doubt in
  T20, 8 of 8); the rule-named layer (r3-s15); "No match" plus example rule led to rules with no
  dead end (T22 8 of 8, steps 16 -> 5); dropping "stand out" cut styling the selection from 5 of 8
  to 1 of 8; "PageRank, full graph" under a filter read correctly (r3-s33, s34). All weak passes.
- 2026-10-10 DID NOT WORK (round 3): "Select where shared_chapters is 1..." cut at the panel edge
  and offering only equality (4 of 4 typed "10"); "Put numbers in backticks:" read as a refusal
  in programmer words; the generic example after ">=10"; "4 hops" beside "5 nodes, 4 edges";
  the Hops 2 list with no distance per name; T24's "point out" prompt against a selection key.

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

- **Tier 2 round 1 and tier 1 rounds 1-2 lessons (summarized 2026-10-11).** WORKED: method
  names on every run surface; "Show all labels"; "N labels, M hidden to avoid overlap" (no false
  "done" in 29 sessions); the Degree row with a chevron cue (8 of 8); refusals naming the method or
  the line; the usage card. DID NOT WORK: element English `run.label` shown after a run; bare
  "Degree 17" as a door; "directed 0" raw file syntax; "Edges per ..." truncating; the bind door's
  two names; the damaged-file refusal with no cause. Lessons: an unbuilt decision shows only on a
  preflight of the served build; fix the route first, then words; one code, one sentence (share the
  function); severity of a word defect depends on whether it was decided -- cite the decision.
  Tier 1: refusals with line numbers, "Local only", "Note on:" worked; seven weight wordings,
  one-domain words, task echoes, pre-explained samples did not.

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

- `design/ui/studio/tier2/rounds/round-3/decisions.md`, `insights.md` (2026-10-11)

- `design/ui/studio/tier2/rounds/round-3/insights.md`, `scores.md`, `expert/` (figma 8-18, engineer
  28, a11y 4, 9, 16; visual); screenshots `sessions/r3-s10/02.png`, `expert/figma/find/02.png` (2026-10-10)

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
