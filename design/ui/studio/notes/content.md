# Content Designer's notes

I own the words on screen in the graphty app: labels, tooltips, messages, empty states, the
usage-data card, and the glossary terms as they appear. One term per concept; the field's
standard terms kept intact; plain words only for the product's own concepts; no verbose help text.
I read this file at the start of every session and update it as I decide and learn.

## Top of mind

- 2026-10-13 Tier 3 build paused for the owner's review after iteration 3 (`tier3/iterations/3/review.md`,
  plan for iteration 4 there). Words decided, with reasons:
    - Unsetting vs covering are two acts with two controls and two wordings. Unset: the minus on a
      set field, tooltip names what comes back over this layer's own elements ("back to 1, the
      default"); emptying + Enter does the same; Undo names the restored value. Cover: "Hide label
      from Key people" in the Text/Effects "+" menu adds an ordinary entry set to nothing. Reason:
      the owner asked how to stop a field overriding; "empty means not set here" alone does not
      answer it, a named result does.
    - No "split parent" word or layer kind. Louvain's groups are entries of an ordinary color
      binding; "New layer for Group 3" makes an ordinary layer. Two row nouns only: layer, folder.
      Reason: owner asked that layer kinds be reusable; one noun per concept.
    - Figma's words where Figma has the concept: "Node settings"/"Edge settings" (as "Type
      settings"), "Mixed" only for a multi-selection, "Varies" for a binding, "None" for nothing.
      Kept graphty's own: the painted-over value (dimmed, tooltip names the layer above and count).
    - A property's name is never cut; the vary picker gives each name its own line, groups headed by
      the run row's name; edge ends worded "the source's Connections".
- 2026-10-13 Watch at the owner's review and in the study: whether "Hide label from Key people" is
  where a reader looks to cover something beneath (if not, the cover verb needs a better home, not
  more words); whether a dimmed painted-over value reads as "not what is drawn" without its
  tooltip; whether readers confuse the minus (unset) with Hide (cover); whether "Mixed" and
  "Varies" stay distinct; the Clear tooltip's default value in the right unit (screen pixels vs
  world). Credit by what the reader did, never by matching my words.
- 2026-10-13 Open for the owner, not mine to change: element default label font "Verdana" with no
  generic fallback (editors say Verdana, a serif draws); screen pixels as default label size.
- 2026-10-12 Tier 3 (unified styles) answers to the owner's 12 questions: `tier3/decide/content.md`.
  My positions (proposals, untested): one-value settings are always-shown empty rows with the
  fallback as placeholder, "+" only for lists; type menus with glyph + noun, "+" tooltip names the
  command; Nodes/Edges groups collapse with a "what it sets" summary (ControlSection already has
  `summary`); hide a kind the rule can never match, show "Edges, 0" when it just matches none;
  vary picker says "attribute" (glossary), never "field"; "label style" as the noun for named label
  looks ("preset" is a rejected word); one rule editor shared with Filters and Find. Reason: "+"
  must mean "another one", glossary terms only, words at rest must not rise.
- 2026-10-12 Element gaps found for words: the selector subset refuses functions, so "name contains
  Bob" is unwritable (`predicate.ts:400-437`) -> propose a `text` RuleTree leaf; no `canBind`
  reason code for disabled vary rows; label look fields cannot bind (`E_BAD_LAYER`).
- 2026-10-12 Term clash to settle before building: the mock calls a data column a "Value" and the
  style settings "properties"; the glossary rejects "property"/"field" for attribute
  (`glossary.md:107`). Settings need no noun on screen (Color, Size); the picker says attribute.
- 2026-10-11 Round 4 decided (round-4/decisions.md): no word change on any screen bar 9 measures.
  Words at rest do not rise; one change per problem; every fix in its owning package.
- 2026-10-11 Bare "10" on bus stops: element stops suggesting a rule it then refuses
  (`suggestBackticks` uses the selector's own test) and adds `FindResult.atLeast` for any number
  inside a column's range. App shows it with the row it already draws: "minutes is 10 or more (N)".
- 2026-10-11 The "or more" layer takes the typed-rule spelling via a new element export
  `rulePath(path)`; the app's `columnText` copy is deleted. One rule, one spelling -- adopted.
- 2026-10-11 Bar 9 (b) edge inspector 29 vs 27: my "Ran on 20 nodes" line and dropping ", full
  graph" were NOT taken. Diff the word lists first; scope words stay even if the bar fails. Do not
  propose words before the diff names the added ones.
- 2026-10-11 Data table under a filter: "12 of 41 edges" in the top bar's words, "41 edges" when
  equal. The "N of M <noun>" form holds; no notice line where a fix exists.
- 2026-10-11 Held words: run row "out of date" for a filter change (wait for one announcer design),
  second-path notice, "As the file says", "Attribute"/"Weight: none" at load, note subject, T23 "...".
- 2026-10-11 Study words leak answers: briefings' file table now names file and kind only; the leak
  check reads briefings. Persona habits (counting rows) are never credited as unprompted.
- 2026-10-11 Watch in round 5: credit the "or more" row by whether "10" reaches the right stops
  without a refusal, NOT by the word match (prompt and row both say "or more").
- 2026-10-11 Watch in round 5: T17 table under a filter step; the "minutes >= `5`" layer name read
  aloud; whether "No match" + example still appears for non-numbers.
- 2026-10-11 Shift-click took T24 to 7 of 7: behavior beat every word change on that task.
- 2026-10-10 Readers type the prompt's most prominent data word first; hints must be runnable.
- 2026-10-10 Backticks stay until the element takes bare numbers (owner list); no app stripping.
- 2026-10-10 A word proposal ships with its bars.mjs count before and after, per screen.
- 2026-10-07 Element returns codes + params; the app reads no rule syntax and writes every word.
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

- 2026-10-11 Round 4 critique (mine, to the studio, reversible, untested). (1) Bare number: the
  element's backtick suggestion must pass the same check the run uses, and `atLeast` covers any
  number inside a numeric column's range; the app adds no words. (2) `atLeastOf` writes the rule
  with the column's short spelling, as a typed rule ("minutes >= `5`"). (3) The key names a run's
  scope once: drop ", full graph" from each entry and put one line under the key's title, "Ran on
  20 nodes" (the tooltip's and inspector bar's words); the run row's accessible name "PageRank, out
  of date" for a scope change becomes "PageRank, ran on 20 nodes". Reverses my 2026-10-10 "do not
  reword 'PageRank, full graph'": new evidence (bar 9 fails on it; T17 r4-s24..26 and T23 r4-s45,
  s46, s48 unsure whether sizes describe the drawn subset; engineer 17 three names). Reason: one
  term per state, fewer words, no promise the screen does not keep.

- 2026-10-11 Round 4 closed (tier2/rounds/round-4/decisions.md, Design Director). Adopted from my
  critique: (1) bare-number suggestion only when the selector accepts it, plus `atLeast` rows for
  any in-range number (changes 3, 4); (2) "or more" layer named like a typed rule, through a new
  `rulePath` export (change 9). Not taken: (3) the key's scope line "Ran on 20 nodes" and dropping
  ", full graph" -- the Director wants the added words named by a diff of both builds first, and
  keeps scope words even if bar 9 (b) then fails, because a true fact is not cut to pass a count.
  The run row's "out of date" rename held for one announcer design. Reason: one change per problem,
  no unmeasured word changes, fix in the owning package. Studio, reversible.

## Tried: worked / did not work

- 2026-10-11 LEARNED (round 4 close): proposals that fix a mechanism in the element (a check that
  disagrees, a spelling) are adopted; proposals that pick words to meet a count are not until the
  count's diff names the words. Evidence: changes 3, 4, 9 adopted; my bar 9 wording held.

- 2026-10-11 WORKED (round 4): "<column> is 10 or more (13)" taken at once by the one reader who
  typed a bare number (r4-s10); value row without "Select where" no longer cut; "Weight: none (each
  edge counts 1)" sent r4-s32 to the column. DID NOT WORK: the "or more" layer's field-path name
  (visual 1, a11y 5); "=`10`" offered then refused on bus stops (figma 2); ", full graph" on every
  key entry (bar 9 b, two over). LEARNED: a fact that exists only for exact values leaves the task's
  own number (bus stops has no 10) with no row -- test a new fact against each task file's prompt.

- 2026-10-11 LEARNED (round 3 close): six word proposals became one change. The Director takes one
  variant per problem and drops anything that blurs credit on a crowded task. Lead with the one
  proposal that answers the most-observed behavior; list the rest as held, not as a set.
- 2026-10-11 LEARNED: a measurement check that reads nothing passed silently (leak check, bar 8,
  bar 9). Before trusting a word count, confirm what the counter counts.

- 2026-10-10 Round 3 (summarized 2026-10-11). WORKED: "minutes 14" on path rows; rule-named
  layer; "No match" plus example rule (T22 steps 16 -> 5); dropping "stand out". DID NOT WORK:
  "Select where ..." cut and equality only; "Put numbers in backticks:"; "4 hops" beside "5 nodes,
  4 edges"; Hops 2 list with no distance; T24's "point out" prompt.

- **Tier 2 rounds 1-2 (summarized 2026-10-11).** WORKED: "Higher means" on the load page;
  "Loaded weight minutes (farther)"; Replace title and "Was N; now M"; filter chip agreeing with
  the Filters row; "Higher means: Not set" left on Replace. DID NOT WORK: bare "No match" for a
  condition; "Put numbers in backticks:" without "="; selection layers named "13 edges"; "Shortest
  path 4 hops" beside minutes; "PageRank on 20 nodes" with 15 drawn; "Total distance 14"; "As the
  file says" on a CSV (needs a direction fact). LEARNED: the study's own words moved behavior more
  than screen words; a word proposal ships with its bars.mjs count; additions raised words at rest.

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

- Tier 3 (2026-10-12): `.worktrees/mock-style-panel/design/ui/style-panel-organization.md`,
  `StylePanelMock.stories.tsx` (RampSettings 2270-2520), `tier3/style-catalog.md` and
  `tmp/style-catalog/catalog.md` sections 1, 2.1, 5, 6, 7, 9, 12; graphty-element
  `catalog/types.ts` (Selector 670-691, AttributeDescriptor 985-1030, RuleTree 1110-1186),
  `session/styles/predicate.ts` refusal reasons; compact-mantine `ControlSection.tsx` (summary,
  collapsible), `GradientEditor.tsx`; glossary lines 79, 107, 187, 209.

- `design/ui/studio/tier2/rounds/round-4/decisions.md` changes 3, 4, 8, 9, 12, held list (2026-10-11)
- `design/ui/studio/tier2/rounds/round-4/insights.md`, `scores.md` (bar 9 b, bar 10), `expert/`
  (figma 2, 23; visual 1, 9, 26, 40; engineer 17, 30; a11y 5, 9, 18); screenshots
  `expert/figma/find/08.png`, `expert/visual/find/09.png`, `expert/visual/path/22.png`; code
  `graphty/src/workspace/canvas/legendWords.ts` rowName, `graph-place/FindBox.tsx` ruleFromText,
  `graphty-element/src/session/styles/predicate.ts` suggestBackticks, `session/query.ts` atLeastOf
  (2026-10-11)

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
