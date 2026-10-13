# Designer's notes: the Information Architect

Role: I hold the graphty app's structure -- its places, navigation, findability and labels --
and I insist that every capability has exactly one home and that structure follows the object
model (the ontology) and the top tasks. I read this file at the start of every session and update
it as I decide and learn. Seeded 2026-10-06 from the studio digests and the design history.

## Top of mind

0.  (2026-10-13, build paused for the owner's review after iteration 3) Where the owner's three
    questions stand, and what I watch:

- **Unset.** Decided and built: a set field draws a minus (Clear) and only a set field does;
  Clear names what comes back, read over the layer's own elements ("back to 1, the default"),
  and Undo after Clear works and says what it undid. "Off" is a value ("None", "Hidden"),
  never the minus. A field painted over by a layer above is marked with that layer and how
  many of this layer's elements it covers. Reason: the owner asked how a reader stops a layer
  overriding the ones beneath; the answer must be visible at rest, not learned. Watch: focus
  falls to the page after Clear on a bound value and after Undo (severity 3, iteration 3) --
  a keyboard reader loses their place exactly at the unset moment; and the painted-over mark
  sits in the 56 px name column that cuts names to "C." -- the fact is there but unreadable.
- **Split parent.** Gone. Two row kinds only, layer and folder. Per-group colors are entries
  of the ordinary vary binding ("One color per value", category rows with chip, count, eye,
  minus), and "New layer for <value>" makes an ordinary layer with an ordinary rule the rule
  editor reads back. Reason: the owner's test is consistency of interaction; split added a
  third row kind with private rules, and the per-value binding is reusable for any column,
  not only communities. Watch: a numeric category column (College's conference) still paints
  twelve oranges by default while the field says "Eight distinct colors" -- the reusable
  path is only as good as its default on non-community data; and edge-end values filtered out
  by the app keep "New layer for <value>" from working on edges.
- **Figma.** Decision 1.13 in `tier3/design.md`: adopted Figma's mixed values, "+" and "-" on
  lists, eye per entry, settings per entry, the type-row header with "Select what it paints",
  selection colors on a folder; departures (Clear drawn at rest instead of unmarked overrides,
  no default entry on "+", sticky group titles) each have a reason in
  `design/ui/framework/figma-crosswalk.md` section 4. Watch: Figma never cuts a property's
  name and has one position for a settings button; we cut names and have two positions --
  the first thing the owner will judge.
- In the study (after approval): do readers find the minus to unset and believe its "what
  comes back"? Does anyone look for a split/group layer kind, or reach per-group color through
  the vary picker unprompted? Does a kind change (Nodes to Edges) lose work without them
  noticing -- today it drops the bindings while announcing success.
  Lesson: answers to owner questions must be checked in the build at the edges (keyboard focus,
  non-community data, edges), not only in the design text.

0. (2026-10-13, iteration 3 review, `tier3/iterations/3/ia.md`) Style coverage is whole (every
   channel has a control; vary on 47 of 51, the four yes-or-no by recorded decision); generic
   picking works on three datasets including a reader's own GML file where "name contains Bob"
   finds exactly 3 of 7; Clear is scoped (owner's unset question answered). Hold the build to:
   (a) "One color per value" on a numeric category must paint distinct colors and say which
   palette -- today 12 orange shades, field says "Eight distinct colors", key is a ramp "6 to 5"
   (severity 3; element legend picks ramp from palette kind, app shows a palette that does not
   paint); (b) edge-end readable values are published by the element and filtered out by the app
   in all three pickers (`value.end` ponytail notes) -- and the empty picker's "make this layer
   Both" is a door to nowhere; (c) find's `named` rows ("degree" finds Connections) are never
   rendered; "Group 3" (the key's word) finds nothing; (d) one column, two answers: color per
   value yes, shape per value "Holds amounts, not groups"; no home for a column's measurement;
   (e) Power without exponent. Lesson: the element half of a planned change can land while the
   app half is held back by a ponytail note -- grep the app for `ponytail:` near each element
   fact the plan named before scoring a finding "fixed".
1. (2026-10-12, iteration 2 review, `tier3/iterations/2/ia.md`) Coverage is close to whole: every
   channel has a control, vary on 43 of 51 bindable properties, generic picking works on both
   datasets from the draft, run values reach the rule editor, "New layer for <value>" round-trips.
   Hold the build to: (a) a number that names a category (College's conference) must be paintable
   as categories -- the popover filters scales to numeric (severity 3); (b) find, the rule editor
   and the vary picker must read ONE list with ONE set of names and groups (find misses run
   values, the two pickers name "Rank" vs "Degree rank"); (c) Clear's "what comes back" must be
   scoped to the layer's elements, not the whole graph (says "mixed" where one value returns --
   the owner's unset question); (d) an edge's ends are not readable values, so edge-only layers
   on data without edge columns read nothing. Decided my own view: yes-or-no properties get no
   vary (a rule plus a fixed value is the one home); record it in `coverage.ts`. Lesson: a
   coverage count ("every channel has a home") hides scale and palette coverage -- check what a
   binding can be made INTO (categories, passthrough), not only what can be bound.
2. (2026-10-12, iteration 1 review, `tier3/iterations/1/ia.md`) Generic picking works on both
   datasets (name contains, odd ids, by find and conditions, no favored run). Three structural
   gaps to hold the build to: (a) the rule editor reads only data columns while the vary picker
   reads runs -- two lists of "what can be read" composed in the app; ask the element for one;
   (b) the draft cannot hold a rule, so the first value paints everything; (c) vary is offered on
   11 properties, not the 30-odd the element binds (`bindsAtRest`). Lesson: "New layer for
   <value>", my replacement for the split parent, is only as generic as the rule editor that must
   read it back -- check a proposal's round trip (made, then read and edited), not only that it
   can be made.
3. (2026-10-12, owner feedback 1) I reversed my own "split parent stays a layer": the owner's
   test is consistency of interaction, and split added two row kinds with private rules. Proposed
   instead: per-value entries in the ordinary binding, "New layer for <value>", and multi-row
   editing with Mixed. Answer: `tier3/decide/feedback-1-ia.md`. Lesson: judge a new row type by how
   many rules a reader learns for it, not only by whether the model can express it.
   0a. (2026-10-12) Unset is the minus, always drawn on set fields and only there; "off" is a value
   ("None", "Hidden", "No label"), never the same control. The minus's tooltip and name say what
   comes back from beneath.
4. (2026-10-12) Tier 3 is unified styles; my answers to the owner's 12 questions are in
   `tier3/decide/ia.md`. Core rule I am holding: "+" only adds to a list (labels, effects,
   conditions); single-valued properties are always-drawn rows showing the inherited value, rare
   ones behind the section's settings button. Reason: tier 1 round 2, Size behind "+" was found
   only by guessing (18 of 18).
   0b. (2026-10-12) Which elements is ONE home at the top (Nodes / Edges / Both, then the rule); the
   rule language is the same RuleTree Data > Filters builds, with selection, find and JMESPath as
   doors into it. A missing kind's group is hidden, not disabled (no promise without a place).
   0c. (2026-10-12) Watch when the build lands: does the route layer fit 900 px with both kind groups
   open? Does anyone look for edge color under a node-only layer, and do they find the kind
   choice?
5. (2026-10-11) Round 4 closed: 53 of 53 valid succeeded, 3 owed re-runs (r4-s05b, s20b, s28b).
   Bars 9 (b) and 10 fail. Round 5 does not start until the gate refuses in `real.mjs --start` and
   briefings name files by kind only.
6. (2026-10-11) Decided for round 5 from my proposals: the element never suggests a rule its
   selector refuses (`suggestBackticks`, element-side, not an app guard -- my app-side check was
   overruled, rightly); `FindResult.atLeast` rows for a number inside a column's range; the table
   scoped "visible" with "12 of 41 edges". All three are IA doors or words for existing homes.
7. (2026-10-11) New: element `rulePath(path)` names a column the way a typed rule does; the app's
   `columnText` copy is deleted. Lesson: an app helper that "knows how a name resolves" is element
   logic copied -- look for these in FindBox.
8. (2026-10-11) Watch in round 5: does "10" on bus stops reach the right selection without a
   refusal? Credit by reaching the selection, not by the "or more" word matching the prompt.
9. (2026-10-11) Watch in round 5: T17 with the table open under a step -- do the table's count and
   the top bar's now read as one fact? Is the table stale after toggling a step?
10. (2026-10-11) Off filter step turning itself on when its editor closes (`Filters.tsx`) is fixed:
    the step's checkbox stays the one home for on/off; a leave without an edit changes nothing.
11. (2026-10-11) Bar 9 (b): scope words (", full graph", "of nodes") stay if the diff names them;
    a true fact is not cut to pass a count. Propose no word cuts before the diff exists.
12. (2026-10-11) Do NOT change: toolbar Filters door, Shift-click, Replace in "...", Analyze search,
    Neighborhood in "...", second path replacing the first, key scope words, "Settings" rail label.
13. (2026-10-11) Overlapping labels, dots and ties are graphty-element's (owner's list). No app
    fonts, offsets, seeds or setups that hide names.
14. (2026-10-11) Study evidence is weaker than it looks: briefings leaked Mo, Nia, `s11`, "6 - w";
    histories pointed at the toolbar; personas script count-checking. Discount "unprompted".
15. (2026-10-11) Ask the element first, show second: every "same number, two answers" so far was
    the app showing something the element was never asked about.
16. (2026-10-10) Readers type the prompt's most prominent data word first: a column name OR a bare
    number, including a number no row holds.
17. (2026-10-10) Rule of the round: no feature moves, no second door where one is measured, words
    at rest go down; words shown only while typing are not "at rest".
18. (2026-10-09) The column is a door to existing homes, never a home; a count names its unit and
    whole; under a filter it names whose numbers.
19. (2026-10-06) Rejected, do not re-propose without new evidence: results in Size's list; names
    in the Summary; a Style-tab pointer to Label; Size pre-bound to the row's result.

## Priorities and values

- **Structure from the ontology, conventions from Figma.** The owner (2026-09-28): Figma supplies
  conventions for controls and gestures; graphty's structure comes from its own object model and
  information architecture. I place things by: the object map, the glossary, top-task rank, then
  Figma's placements -- in that order.
- **One home, many doors.** A capability that lives in two places drifts into two versions
  (the owner's own complaint, 2026-09-12: "why the duplicate locations for functionality?").
- **Findability over discoverability theater.** No wizards, tours, suggestion cards or first-run
  interface (owner 2026-09-26: those are not key functionality). A first-time user is served by
  a place whose name says what it holds, a working find, Quick actions with friendly aliases,
  samples, tooltips and undo.
- **The intermediate weekly analyst is the design target**; novices get only aids everyone gets.
  No persona-specific places or panels.
- **Every count is a link and names its unit and whole.** Navigation by numbers ("17
  connections" selects them) is the cheapest route between objects.
- **Places answer one question each.** Graph: what paints the graph, and in what order? Data:
  what is the data and how is it read? Inspector: what is this? Canvas: where is it, and what is
  it next to? Start screen: how do I start?
- **Evidence beats taste.** "Ours is clearer" is not a reason. A departure needs a graph fact, a
  failing task, a WCAG criterion or a platform fact.

## Design criteria

- **One home test** (refined B 17): every object and piece of state is read and changed in one
  place; a second place that shows or edits the same value is a defect. Reason: duplicates drift
  and confuse which one is "real".
- **Door fidelity**: every door to a command uses the command's one label word for word, and
  lands where its label says. Reason: round 7 found "Add data to this graph" opening a page headed
  "Open as a new graph" (severity 4).
- **Unique accessible names**: no two reachable controls share a name; a pair carries a
  qualifier. Reason: the Data/Data collision; worst for screen-reader users.
- **No promise without a place**: an unbuilt item is not drawn (no "Coming" tags, no disabled
  rail places). Reason: a disabled place promises something that does not exist.
- **Tree-test bar**: every tier 1 location task at 70% direct success or better. Reason: the
  bar the studio froze in rounds 7-8; success alone sits at the ceiling and separates nothing.
- **First-click bar**: 80% or better per tier 1 prompt (rounds 4-6 used 70%). Reason: a correct
  first click predicts about 87% task success, a wrong one about 46% (Bailey and Wolfson).
- **The step after the right click must change something visible or name what it found.**
  Reason: rounds 7 and 8 both failed there, not at the first click.
- **After any front door** (open a sample, a file, a project) the reader can answer without
  navigating: what graph is this, what is it computed on, what has been done. Reason: framework
  IA section 6.
- **Find finds nouns, Quick actions finds verbs**, each hands off to the other; friendly words
  ("brokers", "field", "column", "hops") live only as search aliases. Reason: industry terms on
  screen (owner 2026-09-26), friendly words still findable.
- **A rail button names a collection, never an activity.** Present and Export get no rail
  button. Reason: refined B section 4.
- **Every top task has a starting place and a place where its answer is read** (refined B 15).

## Decisions and reasons

- 2026-09-28 to 2026-10-02 (owner and mock rounds 3-8, summarized 2026-10-09): structure from
  the ontology, Figma for controls only; a Data place for all data management; results live where
  they paint (refined B: every run a row in the paint tree, owner 2026-09-30); rail for places,
  toolbar icons only; one File list shown from the main and project-name menus (tree 19% -> 90%);
  intake "Open project or file..."; Layout its own group; the bind icon is the one door to
  "color/size by"; find over rows, elements and notes with "Select where"; one home for a node's
  neighbors; Export > Data opens on the showing table. Details: the mock decision log.
- 2026-10-03 (studio, tier 1 design): rail draws only Graph and Data; inspector tab renamed
  Values; selection bar holds only Neighborhood; recipe and style files refused with one problem
  block; Notes row not drawn. All reversible.
- 2026-10-03 (owner): graphty-element is neutral about presentation; the app owns every word,
  heading, grouping and order. Consequence for me: Analyze's headings, the Style tab's section
  order and the find list's groups are app IA decisions, not element ones.
- 2026-10-03 (owner): stop the mock rounds and build tier 1 as the real app; study the real app.

- 2026-10-06 to 2026-10-07 (tier 1 rounds 1-3, summarized 2026-10-10): adopted from my proposals
  -- G opens the neighbor list for one node, no dead-end doors (Selection row, Sources tables,
  empty combo), the chevron inside the Degree row (a compact-mantine DataRow fix), partition
  candidates from the element's `optionsFor`. Replaced -- bound Size by "Size + opens its picker",
  hidden-label words by a "Show all labels" switch, subtitle method word by the method name
  everywhere. Rejected -- "N connections" plus chevron at once, a Style-tab link to Everything,
  "Size and shape" heading, "Javert and his 17 connections". Reason throughout: one variable per
  path, and graph facts over taste.

- 2026-10-07 (IA proposal for tier 2, from the tier 2 audit): build each gap where refined B
  already put it (Data > Filters plus the header chip; Path popover; Notes place; Sources row
  "Replace with file..."; main menu "Select where..."; Neighborhood popover); the element first
  provides the facts the app would otherwise guess (output kind, weight meaning, rule errors as
  codes, edge pick, filter on edge attributes). Not decided by refined B and decided here: the
  doors live on the canvas menu until a selection bar exists; "Grow by one hop" leaves "...";
  a stale run row gets a mark, and rerun stays per row (no "Rerun all" yet). Reason: one home per
  job; every guess the app makes about a run or a rule is an element defect hidden.

- 2026-10-09 to 2026-10-10 (tier 2 rounds 1-3 proposals and decisions, summarized 2026-10-11):
  adopted -- start-screen Open of a data file through the Data page; the source's "..." with
  Replace and Edit source; find's hint to the rule start decided by the element (`scope.count`);
  ", out of date" on the key title; path aliases; rule-made layers named by the rule; Filter to
  neighbors as a plain command; the element's repeat-edge count with "Replace <source>" beside
  Load; the example-rule line after a miss plus Enter running a shown rule. Rejected -- "Select
  where..." on the column; visible Replace buttons; file-name matching (guess vs element fact).
  Not taken -- Edit source retitle; Hops grouped by step. Reason throughout: one variable per
  path, each change a door or a word for an existing home, facts in the element.

- 2026-10-10 (IA proposal for round 4, summarized 2026-10-11): Analyze search shows name or alias
  matches first; a bare number in find gives "<column> is N" and "is N or more" rows; a toolbar
  Filters icon opening Data > Filters (a door, not a home); Hops 2-3 shows the element's step count.
  All adopted; the first three worked in round 4 (see Tried).

- 2026-10-11 (IA proposal for tier 2 round 5, after round 4): three fixes, no new places, no
  moves. (1) FindBox never shows a rule the element refuses: `ruleFromText`'s backtick rewrite is
  checked with `scope.count` before it is offered; on refusal the example-rule line shows instead.
  Evidence: `expert/figma/find/04.png` offers "=`10`", `find/08.png` refuses it; T22 A's prompt
  number (10) is in no bus-stops row. (2) Element (additive): `FindResult.atLeast`, one row per
  numeric column whose range holds a typed number that is not itself a value
  ({ kind, path, value, count, target }, the same shape as `FindValueRow.atLeast`); the app renders
  it with the existing "<column> is N or more (count)" words. Reason: the threshold is a fact over
  the data; the app must not parse numbers or scan columns. (3) The table's scope follows the
  filter steps ("visible", not "graph", `TableDock.tsx`), its count "12 of 41 edges" while a step
  is on. Evidence: `sessions/r4-s27/09.png`, r4-s21. Reason: one number per fact; the step's
  checkbox stays the one home for on/off. Kept away: the key's scope words, overlaps (element).

- 2026-10-11 (round 4 decisions, by the Design Director): adopted -- element `suggestBackticks`
  offers only a rewrite its selector accepts (parse plus one attribute read); element
  `FindResult.atLeast` plus app rendering; element `rulePath` export, app `columnText` deleted;
  table scope "visible" and "12 of 41 edges", re-rendered on visibility change; off step stays off
  when its editor is left unedited; Cancel in notes focuses "+". Overruled -- my app-side
  `scope.count` check before showing the suggestion: it hides an element defect from every other
  consumer. Held -- Values above records for a number (second change on one problem), a "lists
  everything" line over the table (a notice where a fix exists). Known gap: table export still
  writes every record; the fix is a scope on the element's export.

- 2026-10-12 (IA answers for tier 3, proposals, not yet decided): "+" only for lists; core
  properties always drawn with the inherited value (Figma instance-override pattern), rare ones
  behind `AdvancedButton`; icon-grid pickers for shape, arrow and pattern (a compact-mantine
  `StyleSelect` option); kind groups collapse with the existing `ControlSection` `summary`, property
  sections never; hide a kind the rule cannot reach; field picker grouped (In use, Data, runs,
  Facts) with non-fitting columns folded into one row; a ramp drawn over the histogram in data
  units for the gradient; split parent stays a layer and folders never get a rule; one Which
  elements section; coverage of the element's channels as a test; label settings as one tabbed
  popout with the element's badges as presets. Element asks (all additive): inherited-value fact
  per layer, inline ramp stops on a binding, RuleTree selector, text and parity rule leaves, the
  id as a value, per-field label channels, a `targets` field. Reason throughout: one home per job,
  and every fact the panel needs comes from the element.

- 2026-10-12 (IA answer to owner feedback 1, proposal): unset = the minus (plus emptying a
  field, "Not set" first in a select); three at-rest states (not set, set, set to nothing); no eye
  per field. Split parent replaced by per-value binding entries, "New layer for <value>" and
  multi-row edits; the element keeps only label remapping across re-runs as a rule capability.
  Figma pass: adopt list "+"/"-", empty-title add, effect-row settings, Mixed, absent sections;
  adapt apply-variable picker, Detach as "Fix at", override reset, text styles, selection colors;
  reject frame-like rows, add-default "+", switches, non-sticky kind headings, gradient paint type.
  Reason: every row behaves as a layer or a folder; one home per job.

## Tried: worked / did not work

- 2026-10-13 (tier 3 iteration 3 build, 617b43b270) -- worked: a reader's own file as a third
  dataset (Open project or file, the Data page, Load; `tmp/ia-i3/people.gml`) -- it is the only way
  to test the literal "name contains Bob" and "use the values as colors", since no sample holds
  either; draft count before painting; scoped Clear; one naming of run values across the rule
  editor and vary picker; passthrough. Did not work yet: per-value default palette and key on 12
  groups; edge ends in pickers; find by a value's name; shape per value on a number; Power's
  exponent. Method that paid off: reading the app for the element field the plan named
  (`value.end`, `FindResult.named`) and finding the filter, instead of only driving the UI.
  Harness note: put `timeout` inside `with-browser.sh`, not around it, or a run dies waiting for a
  slot; one walk per dataset with `open()` between sections keeps slot use low.

- 2026-10-12 (tier 3 iteration 2 build) -- worked: draft picks elements before anything paints;
  Both plus "touching them" as the generic path to "edges of the nodes I named" (College 229 of
  613, Les Miserables 26 of 254); "No element matches Bob"; layers named by their rule; "Node id"
  vs "id". Did not work yet: the draft shows no count for its held rule; find reads data only; a
  numeric category column paints as a ramp. Method that paid off: drive one generic "add every
  list entry, open every settings pop-out, list every 'by attribute' name" script per dataset and
  diff against the element's channel list (`tmp/ia-i2/cover*.mjs`).

- 2026-09-28 to 10-02 (mock rounds, summarized 2026-10-09) -- tree tests rank where people look
  but hit the ceiling on correctness (only directness discriminates); frozen rules before a round
  work; a round must not run until its decisions are drawn; Results in the inspector, Analyze
  headings by outcome, main-menu Select where and the filter chip as status all failed; the File
  list, "Remove from list view" and Analyze's own search box worked.

- 2026-10-06 (round 1 real app) -- Degree row as the only door to neighbor names: did not work
  (0 of 4 clicked it; r1-s17b `07.png` shows it drawn exactly like the id and name rows).
- 2026-10-06 -- Label "+" and the honest "N hidden to avoid overlap": worked for the first step
  (no false "done" in 29); the count names no one and offers no way to show them (severity 2).
- 2026-10-06 -- Rail with only Graph and Data, File list, sample intake: no failures traced.

- 2026-10-06 (re-pilot on graphty@0.8.53) -- every tier 1 success path reaches its end state; G
  from a selected node opens "Javert's 17 connections" with focus on it (T12 13.png); the refusal
  under Method names the method (T11 07.png). Doors work for the scripted path; round 2 tests
  whether people take them.

- 2026-10-07 (round 2) -- Degree-row chevron: worked (T12 8 of 8, 0.9x; round 1 0 of 4), but its
  hit area was outside the row button (4 of 6 clicked dead space first). Neighborhood (G) fixed
  but unused (0 of 8): a working door nobody sees is not a door.
- 2026-10-07 (round 2) -- Size under a "Shape" heading with "+" and a chain-icon bind: did not
  work as a findable path (18 of 18 named it; all succeeded by guessing).
- 2026-10-07 (round 2) -- "N hidden to avoid overlap": honest (no false done), but every T10
  session spent its extra steps hunting a door that does not exist (r2-s12: 5 wrong turns).
- 2026-10-07 (round 2) -- One name per run did not ship as the method word: rows and key say the
  result ("Influence"), the method appears nowhere after the run.

- 2026-10-07 (re-pilot, build b7590f8de, graphty@0.8.53) -- every round 3 change reaches its
  end state on the scripted path: Size picker (T9, T15), Show all labels (T10, both datasets),
  group layouts after Louvain (T11), method names (T7, T16), export (T13). Scripted success says
  the doors exist; round 3 says whether people take them.

- 2026-10-09 (tier 2 round 1) -- Filters under Data: worked once found (7 of 8, median 7 = the
  success path) but nothing on Graph points there; keep the home, watch the doors.
- 2026-10-09 -- Replace only on the row's right-click: did not work at rest (8 of 8 hunted; 7
  recovered by habit). Path run, Replace page and load-time "Higher means": read right every
  time once reached -- the homes hold, the doors fail.
- 2026-10-09 -- Find box as the one home for rules: half worked. Users start there (4 of 4) but
  the refusal does not lead on; the "=" start is invisible.

- 2026-10-09 -- Dry run of success paths only: worked for the paths (empty session logs) but did
  not catch detour defects (style to Everything, selection tint, focus drops) or tool faults. Next
  dry run walks detours and keys.
- 2026-10-09 -- Load-time weight meaning: the home works (everyone who reached "Higher means"
  chose right) but the habitual door (Open) skipped it, and "Back to start" dropped the graph.

- 2026-10-09 (tier 2 round 2, weak evidence: facilitator text leaked) -- Open through the Data
  page: T20 7 of 7 set Higher means at load; the habit carried. The source "..." with Replace:
  8 of 8 found it, by guessing. Find's rule hint: worked only after the exact column and a
  condition; the column word alone dead-ends. The detour dry run worked for the walked detours
  (30 of 30) and missed the unwalked one (styling a selection).

- 2026-10-10 (round 2 close) -- Study isolation by a clean briefing alone: did not work; a
  participant can read upward from a folder inside the studio tree. Fix is location plus a
  transcript check, not a prompt rule.
- 2026-10-10 -- Adding words to fix doors: did not work for bar 9 (b); every tier 2 screen's
  count rose. Fixes must replace words.

- 2026-10-10 (tier 2 round 3, first clean round) -- find's example-rule hint plus Enter running a
  shown rule: worked (T22 8 of 8, steps 16 to 5, no dead end). Load-time Higher means through the
  Data page: worked (T20 8 of 8). "Replace <source>" beside Load: not reached (no session met the
  Add page). Path aliases: found Shortest path but ranked it last. Rule-named layer: worked.
- 2026-10-10 -- Hiding a capability's door only in "..." menus: costs one guess each (Replace 8 of
  8, Neighborhood 4 of 4), but everyone found them. Leave them; the measured cost is small.
- 2026-10-10 -- A task word ("point out") that differs from the key's measure: did not work as a
  study; readers reached another valid answer (path). Check prompt and key together.

- 2026-10-11 (tier 2 round 4) -- Toolbar Filters icon as a door to Data > Filters: worked (T17
  7 of 7 first and only door, wrong turns 0). Analyze search name/alias first: worked (Shortest
  path found by typing 15 of 15). Bare-number "or more" row: worked only when the number is a
  value (r4-s10 on Les Miserables); on bus-stops the app's own suggestion is refused. Hops step
  distance: not reached in a way that measured it.
- 2026-10-11 -- A count drawn in three places and a list in a fourth: did not hold. Two readers
  doubted a right answer because the table disagreed with the chip, the step and the Overview.

- 2026-10-11 (round 4 close) -- Proposing an app-side guard for a wrong element suggestion: did
  not hold; the fix belongs in the element function that made the suggestion. Next time trace a
  wrong suggestion to the function that builds it before proposing where the check goes.
- 2026-10-11 -- Counting "noticed unprompted" without reading the briefings: did not work; the
  file table primed T4 and T21. Read the briefing before crediting a door.

- 2026-10-12 (tier 3 iteration 1, served build, College football and Les Miserables) -- Which
  elements by find and by conditions: worked ("label contains State" 24 of 115 both ways; "Id
  matches pattern [13579]$" 57 of 115, the true count). Find with no match: silent. Coverage by a
  test that allows "not offered": honest but drifted from the design's table (captions, tooltip
  look, typed label words promised, not built). "New layer for 3": paints right, reads back blank.
- 2026-10-12 -- Driving the panel through a harness that opens a sample with no session setup
  (`tmp/ia-i1/walk.mjs`): found what story-driven walks missed (no starting rows, the draft's
  missing rule). Walk the reader's app, not only the review scene.

## Thinking

- **Tier 1 IA questions (2026-10-06)** were answered by rounds 1-3: the intake, names and
  neighbors, Values, Analyze search and export all hold; the Data place / Data page / Values
  collision has not shown up in sessions. Keep watching it in tier 2.
- **Things I saw in a smoke render of the real build (2026-10-06, unverified with users):**
  the nothing-selected inspector opens on Values with an Overview; long labels truncate
  ("Edges per ...", "Undirected, from the file: the GML def..."); the Legend toolbar button is on
  while nothing is bound and no legend card shows -- a control whose state has no visible home
  is exactly the "next step shows nothing" pattern; the Karate club is "Undirected, from the
  file" yet edges draw with arrows -- a dataviz question, but it breaks "a value never misstates
  what it describes".
- **Framework vs refined B:** the framework's frozen outline (rail Graph, Assistant, Results,
  Notes; no layer tree; Sets and paths, Styles, Views in the Graph panel) is superseded by the
  owner's refined B. The framework docs should get a dated note pointing at refined B and the
  tier 1 design, rather than a silent rewrite, so a stranger is not misled.
- **Not my fight but on my path:** the legend in exported images (element #133) blocks T13 and
  T15; the adoption backlog of closed element issues (node names, degree histogram, selecting
  isolates, Show all labels door) is the cheapest way to make existing homes hold what they
  promise.
- **Method for the real-app round:** use the tree outline of the BUILT app (labels exactly as
  drawn), plus first-click on real screenshots, plus live sessions through the real-app tool.
  Report every rate with and without build defects. Tree tasks for tier 1 only: open a sample,
  own file, rank nodes, find groups, names on every node, a node's neighbors, layout, export a
  picture, export the numbers, save and reopen.

## Sources

- (2026-10-13) `tier3/iterations/2/review.md` "Decided for iteration 3"; graphty-element
  `catalog/types.ts` (`ReadableValue.end`, `valueCount`, `valuesAreColors`), `session/query.ts`
  (`namedRows`), `session/styles/legend.ts` (`kindOf`); app `rules/conditions.ts`
  (`readableFields`), `style/ValuePicker.tsx` (`entriesOf`, `emptyWords`), `style/BindingPopover.tsx`
  (`SCALE_WORDS`, category `defaultValue`), `style/words.ts` (`refusalWords`), `style/coverage.ts`.

- (2026-10-12) `tier3/owner-feedback-1.md`; `tier3/design.md` 1.1, 1.7, 2.1-2.2, 7; main
  checkout `design/ui/figma/right-sidebar-selection/README.md` (gitignored capture) sections 5,
  15, 17, 22, follow-up 5 and 8; `design/ui/framework/figma-crosswalk.md`; compact-mantine
  `tree/Tree.tsx` (`multiselect`), `inputs/VariablePill.tsx`.

- (2026-10-12) `.worktrees/mock-style-panel/design/ui/style-panel-organization.md`, the mock
  stories; `design/ui/unified-style-layers.md` (branch `docs/unified-style-layers-design`);
  `tmp/style-catalog/catalog.md` sections 5, 8.3, 9, 12; graphty-element `catalog/types.ts`
  (Selector, Scope, RuleTree, SetDefinition, AttributeDescriptor), `session/styles/StylesApi.ts`
  (`proposeEncoding`, `explain`), `session/results/types.ts` (HistogramOptions); compact-mantine
  `ControlSection.tsx` (`summary`), `GradientEditor.tsx`; app `data-place/Filters.tsx`; Figma help
  articles on effects, strokes, variables, text properties.

- `tier2/rounds/round-4/insights.md`, `decisions.md` (changes 3, 4, 5, 8, 9, 12) (2026-10-11)

- `tier2/rounds/round-4/insights.md`, `scores.md` (bars 9 (b), 10; T17, T22, T23), `expert/figma.md`;
  screenshots `expert/figma/find/04.png`, `08.png`, `sessions/r4-s27/09.png`;
  `graph-place/FindBox.tsx` (`ruleFromText`, value rows), `table/TableDock.tsx` (scope),
  `canvas/legendWords.ts` (`rowName`), graphty-element `session/query.ts` (`atLeastOf`) (2026-10-11)

- `tier2/rounds/round-3/insights.md`, `scores.md`, `expert/figma.md`, `expert/visual.md`,
  `expert/a11y.md`; screenshots `r3-s10/02.png`, `r3-s33/03.png`, `r3-s43/13.png`,
  `expert/visual/path/02.png`, `10.png`; `graphty/src/workspace/analyze/words.ts`,
  `graph-place/FindBox.tsx`, `inspector/NodeValues.tsx` (2026-10-10)

- `tier2/rounds/round-2/decisions.md` (changes 1-15, "Not changed") (2026-10-10)

- `tier2/rounds/round-2/insights.md`, `scores.md`, `expert/figma.md`, `expert/engineer.md`;
  screenshots `r2-s33/05.png`, `r2-s12/03.png`; `graphty/src/workspace/graph-place/FindBox.tsx`
  (`columnOptions`) (2026-10-09)

- `tier2/rounds/round-1/insights.md`, `decisions.md` (2026-10-09)

- `tier2/rounds/round-1/insights.md`, `scores.md`, `expert/figma.md`; screenshots
  `r1-s46/12.png`, `r1-s29/08.png`, `r1-s05/09.png`; `graphty/src/workspace/project/actions.ts`
  (openInSession), `data-place/DataPlace.tsx` (row menu), `graph-place/FindBox.tsx` (2026-10-09)

- refined B sections 2.1, 2.3 (selection bar, Path popover), 7, 8, 10.1 (Select where), 11.3
  (weight, several tables); tier1-design.md section 7; the tier 2 audit list (2026-10-07)
- `design/ui/studio/rounds/round-2/decisions.md`, `insights.md`; `rounds/r2/pilot/T6`-`T16/pilot.md`
  (2026-10-07)

- `design/ui/studio/rounds/round-2/insights.md`, `scores.md`; screenshots `repro/r2-s19/run1/04.png`,
  `repro/r2-s56/run/07.png`, `sessions/r2-s29/09.png`, `sessions/r2-s12/10.png`;
  `graphty/src/workspace/layout/methods.ts` `groupings()` (2026-10-07)

- `design/ui/studio/rounds/round-1/insights.md`, `scores.md`, sessions r1-s17b, s29b, s10b
  screenshots (2026-10-06)

- `design/ui/studio/digests/decisions.md`, `framework.md`, `tier1.md`, `study-rounds.md`,
  `owner-voice.md` (this worktree, 2026-10-06)
- `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/structure-comparison/structure-b-refined.md`
  (sections 2.5 "One pattern per job", 4 "The rail", 15 "Every top task has a home",
  17 "One home per feature")
- `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/structure-comparison/ia-owner-structure.md`
  (the IA's specification of the owner's structure, 2026-09-30)
- `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/decision-log.md`
  (rounds 3-8: Data place, Results placement, File list, Layout group, find, neighbors)
- `.worktrees/ux-storyboards-mocks-and-study/design/ui/prototype/study/round-8/tree-test/grades.md`
- `.worktrees/feat-tier1-real-app/design/ui/tier1-real-app/tier1-design.md` (sections 2.1-2.7,
  4, 9 "Calls made on this page", "Adversarial review changes")
- `design/ui/framework/information-architecture.md`, `principles.md`, `top-tasks.md`
  (via the framework digest)
- `.claudehistory/3a19ea55-f3cc-4fc0-b85f-842243f52536/workflows/scripts/graphty-structure-comparison-wf_94d61710-fbb.js`
  and `graphty-design-study-rounds-4-onward-wf_6818e34f-76d.js` (the IA role's charter,
  2026-09-30 and 2026-09-28)
- `.claudehistory/3a19ea55-f3cc-4fc0-b85f-842243f52536/subagents/agent-a53a98e32cd016a86.jsonl`
  (IA canon research: Rosenfeld/Morville/Arango; tree test vs first click, 2026-09-27)
- `design/ui/studio/tmp/explore-02.png` (smoke render of the real build, 2026-10-06)
- Extraction script: `design/ui/studio/tmp/ia/agents.py`
