# Content Designer's notes

I own the words on screen in the graphty app: labels, tooltips, messages, empty states, the
usage-data card, and the glossary terms as they appear. One term per concept; the field's
standard terms kept intact; plain words only for the product's own concepts; no verbose help text.
I read this file at the start of every session and update it as I decide and learn.

## Top of mind

- (2026-11-05) Tier 6 round 2 gave the first readers. Words held: no count disagreed, approval cards
  were read, no false "done". What failed was where words sit and what they promise, not the terms.
- (2026-11-05) Composer placeholder says "Ask about this graph" while the scope reads Selection 14:
  the app contradicts itself where the reader types. Follow the scope: "Ask about this selection".
- (2026-11-05) "Your work ... comes back" is false for a clean opened file. "Your changes" is true in
  every case. A tooltip fix cannot be measured while the study tool hovers only on command.
- (2026-11-05) A hidden 401 and a dropped network are one fact (no status). Word both with "or", not
  "may be": "the connection failed or the key was refused". Keep Send again; add AI provider...
- (2026-11-05) One measure, one name, by id: the Assistant's lines take Analyze's `wordsFor` name, not
  `plainName`. Glossary section 2 rule 1 and line 481. No element change.
- (2026-11-05) A painting run owes a Colored row: an app line must be true without the prose, and
  r2-s02's prose denied a repaint over "Computed" lines alone. The effect is unpublished, so additive.
- (2026-11-05) CORRECTED: "Selected N nodes" exists and showed (r2-s01 `18.png`). My round 1 note that
  no line says so was the sessions' other path, not the rule.
- (2026-11-05) The model's words are the model's; each effect gets one app line that stands alone.
- (2026-11-05) Live claims apply to state words: "Listening" before a microphone opens is cured by the
  element's event order, not a softer word.
- (2026-11-05) Before calling words a defect, check the design, and if the design's own text is wrong
  say so with the evidence. No special layers, so a layer name gets no special wording.
- (2026-10-30) Preview tags and destructive labels name the act's outcome. Counts state their basis;
  one fact, one drawing. Order and defaults cost more than words.
- (2026-10-21) Fix by pointing, not prose; never fix a no-op with explanatory text.
- (2026-10-21) Do not rename on model opinion or a task's wording; avoidance is not understanding.
- (2026-10-13) Unset vs cover stay two acts with two wordings. Two row nouns only: layer, folder.
- (2026-10-06) Budgets: at rest <= 50 words, inspector ~30 (max 40). Simulated users: fail strong,
  pass weak. Element returns codes + params; the app writes every word.
- (2026-11-03) Tier 5 round 1 closed at the 1-round cap, bars 1, 3, 4, 8, 9 failing. 30 valid
  sessions (28 pointer, 2 keyboard). My walk did not run, so bar 6 (owner's data rules) went
  unmeasured: next round my walk is a feed, not optional.
- (2026-11-03) Speech is content: speak only from the surface that is showing. The covered
  inspector's "4 of 24" after the workspace's "15 of 24" was a severity 3 (fixed after the freeze).
- (2026-11-03) A label must bind what it names. "Connected components, 3 values" described one run
  and bound another; only a column header said "(visible)". Two runs need two names, from the
  element's scope fact (code + params), worded by the app.
- (2026-11-03) "Condition..." and "Or..." do not say "and" vs "or else": three sessions on three
  halves, unprompted. Connector words must name the logic; readers fell back on watching the count.
- (2026-11-03) An error must never contradict the screen: By position's "still use the highest 10"
  while 24 of 24 matched (built from a default the step never applied). Words from state, not
  fallbacks. The box also needs direction and unit (top/bottom, number/percent).
- (2026-11-03) An empty input needs a cue of what it takes (the Fill color box: people typed color
  names). Cue by the control's form, not help text.
- (2026-11-03) A name must survive every act: Clear keeps the card name; a reference shows the
  matched value, not "v02"; a card's name must keep describing it after Or or a second step.
- (2026-11-03) "Filter not added" after Clear+Escape is truthful but loses saved work; words
  cannot fix it -- the behavior must change (reopened card is never deleted by cancel).
- (2026-11-03) Study wording is content too: T73's words and key disagree; "Would you rather it
  had shown something else?" invites a wish. Neutral follow-ups before round 2.
- (2026-11-03) Fixtures pre-colored in the task's color inflate "drowned" findings; never
  generalize a word or color change from one fixture.
- (2026-11-03) One surface, one number format; counts state their basis.
- (2026-10-31) Term collisions still open: "group" vs glossary group, "Focus", "picked", "whole
  graph" vs Full/Filtered graph.
- (2026-10-30) A preview tag names the act's outcome; a destructive choice names its effect.
- (2026-10-21) Fix by pointing, not prose; do not rename on model opinion or task wording.
- (2026-10-06) Budgets: at rest <= 50 words (hand count only), inspector ~30 (max 40). Element
  returns codes + params; the app writes every word. Earlier Top of mind: git history at 5738a5b4b2.

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

- **2026-10-14, round 6:** Round 6 words: "Layer N"; "Arrowheads" with "Target end" / "Source end" (head and tail in tooltips and search); one noun "Label" with "Label at target end"; "Caption" gone; "Degree rank (1 = highest)", "Degree percentile"; "Take all tied | Take fewer"; "Covers", "Where its look shows", "covered by"; "Draws nothing: ..."; failure notices always carry the element's reason.

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

- 2026-10-10 and 2026-10-11 Round 3 and 4 proposals (summarized 2026-11-05): full text is in git
  history of this file; what was adopted or held is in the "closed" entries around this one.
- 2026-10-11 Round 3 closed (tier2/rounds/round-3/decisions.md, Design Director). Adopted from my
  proposals: (1) value row without "Select where" plus the "or more" row (change 7, with an additive
  element fact `atLeast: { count, target }`). Held: (2) backtick refusal -> "Rule: press Enter"
  (bare-number owner question), (3) ">=10" rewrite (the "or more" row answers bare numbers), (4)
  "4 hops" -> "4 edges" (sev 1; T18 already carries three changes), (5) Hops grouping (needs element
  fact, one session), (6) disabled-reason rewording (replaced by a check-first compact-mantine
  Tooltip fix, no word change). Reason: one variant per problem so round 4 can credit it; words at
  rest must not rise; claims from one specialist scripted before fixing. Studio, reversible.

- 2026-10-11 Round 4 closed (tier2/rounds/round-4/decisions.md, Design Director). Adopted from my
  critique: (1) bare-number suggestion only when the selector accepts it, plus `atLeast` rows for
  any in-range number (changes 3, 4); (2) "or more" layer named like a typed rule, through a new
  `rulePath` export (change 9). Not taken: (3) the key's scope line "Ran on 20 nodes" and dropping
  ", full graph" -- the Director wants the added words named by a diff of both builds first, and
  keeps scope words even if bar 9 (b) then fails, because a true fact is not cut to pass a count.
  The run row's "out of date" rename held for one announcer design. Reason: one change per problem,
  no unmeasured word changes, fix in the owning package. Studio, reversible.

## Tried: worked / did not work

- 2026-10-21 Tier 3 round 1 tried: none of my built words (BoundValue chits, "Color from each layer", <<Layer>>) produced a failure; the <<Layer>> token was routed around, not read. Did not work as measured: count-only layer names from the find box; hex-first color box with no word hint.

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

- 2026-10-07 Tier 2 proposals, filter, path, notes, weight and replace words (summarized 2026-11-05):
  full text is in git history; what shipped is in the tier 2 "closed" entries above.
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

- Tier 2 rounds 1-4 (summarized 2026-11-05): `design/ui/studio/tier2/rounds/round-N/` decisions.md, insights.md, scores.md, `expert/`.

- `design/ui/studio/rounds/round-1/insights.md`, `decisions.md`, `rounds/r1/pilot/all/pilot.md`
  (2026-10-06)
- `design/ui/studio/digests/decisions.md`, `tier1.md`, `framework.md`, `owner-voice.md`,
  `study-rounds.md` (all 2026-10-06)
- (2026-11-03) Summarized: tier 1-3 source lists (round insights, decisions, expert walks, owner
  messages in `design/ui/studio/tmp/owner-all.jsonl`, framework docs) are in this file's git
  history at e1237f47af.
- `design/ui/framework/content-design.md`, `glossary.md`, `principles.md` (budgets, section 5)
- `design/ui/studio/tier5/rounds/round-1/insights.md`, `scores.md` (2026-11-03)

## Tier 4 round 1 lessons (2026-10-30)

- Decided: preview tags and destructive-choice labels name the act's outcome (join preview, "Leave out"). Evidence: problem 1 (3 of 4 misread), problem 6 (r1-s24 backed off).
- Decided: a count or glyph shown in two places must share one basis and one kind. Evidence: problems 2, 16, 3.
- Tried: tier 3 watch on words -- worked as a check; again no surviving insight was word-first.
- Did not work: trusting hover findings from the study tool (popovers logged as null).

- Also kept from tier 4 (2026-11-05): owner-approved text clipped out of sight is a layout fix, not a rewording; a ratio's noun must match what was counted; a shortcut label that does half the job says which half; spoken color names name the hue family first (compact-mantine); hover findings stay suspect while the study tool logs popovers as null.

## Tier 6 round 1 lessons (2026-11-05)

- Decided: Influence / Connections naming is fixed in the app by id, against the glossary. Evidence: finding 5 (`expert/engineer/setup-1200x900/29.png`, `26.png`, `38.png`); CLAUDE.md allows replacing `plainName` by id.
- Decided: no app wording for a selection made by the model until the element reports the effect. Evidence: finding 3, `graphty-element/src/ai/tools/families/algorithms.ts` returns only `foundEffects`.
- Decided: "Listening" stays as a word; the element moves `ai-voice-start` after the microphone opens, and `Talk.tsx` announces the end. Evidence: finding 8, `VoiceSession.ts` line 530, `Talk.tsx` lines 89, 90.
- Tried: nothing of mine was measured; words on the Assistant are untested with readers.
- Did not work: a study round with no spare request budget gave 0 sessions, and 0 sessions leave bars 1 to 7 and 11 with nothing to count. Source: `tier6/rounds/round-1/insights.md`.
- Thinking: when sessions run, watch whether a reader trusts the prose or the line when they differ; that decides how much a change line must carry.

## Tier 6 round 2 critique (2026-11-05)

- Decided (proposed to the Director): placeholder follows scope; "Your changes" tooltip; "or the key was refused" plus a provider button on a statusless failure; Assistant names by `wordsFor`; Undo notice with no added period (historyWords.ts 359; other notices already have none); Colored row on a painting run.
- Decided: no change to the "Autosave: saved" label, the model's prose, Group 1 to N, "Show in table", or the failure row's "Nothing changed."
- Evidence: `r2-s05/05.png`, `r2-s01/18.png`, `r2-s02/29.png`, `r2-s10/05.png`; `grade.md` of r2-s05 ("I did not select anything").
- Worked: approval card words, 2 of 2; "Undo" in the reply, first choice 2 of 2; change-line counts, no disagreement.
- Did not work: "the connection failed" alone, 0 of 2 learned the cause; "Selection" as a one-word warning; plain names beside field names (Reach and Closeness on one screen).
- Thinking: "Computed Bridges for 14 nodes" already carried the narrowing and no reader used it, so a true line after the fact is not a warning. Words must arrive before Send.
- Open: "Rule: data.gal4RGexp < -1" on an app row (`cards.ts` 1068) keeps the field path; bar 10's audit decides it.
## Tier 5 round 1 lessons (2026-11-03)

- Decided: announcements follow what is visible. A covered panel stays silent (the selection
  editor already does; the value picker did not). Reason: two messages into one live region, the
  second wins, and it was the hidden one.
- Decided: Clear keeps a card's name; a reference row shows the matched value beside its id.
  Both are existing decided.md rules (631-632, 694); the build departs from them.
- Tried: scripted word counts as the at-rest budget check -- did not work; it inflated three
  screens with chrome, statistics and user layer names. Hand count remains the measure.
- Thinking: the reference picker's silent search (no result count until ArrowDown) is a spoken
  content gap caused by a second-built control; fix by one shared searchable combobox, not by
  adding announcement text.
- (2026-11-03, after the skeptic checks) Learned: of nine surviving editor insights, four are
  word failures (run naming, Condition/Or connectors, By position's false error, reference ids)
  and one is speech. Words were first-cause this round, unlike tier 3 and 4.
- Did not work: leaving my walk out of the round -- bar 6 stayed unmeasured and the round could
  not close on it.
- Thinking: error and status sentences must be built from the state the step actually applies,
  never from a `?? default`; a lint-able pattern worth a check in the app.
