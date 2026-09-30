# Content design

**Job.** The rules for the words of every string an analyst reads that is not their own data:
voice, conventions, message types, numbers, marks. **Not here:** the keys (`message-catalog.md`);
concepts and their names (`glossary.md`); surfaces (`interface-specification.md`); whether, when
and how long a message shows, when anything asks, what a field does with bad input
(`interaction-patterns.md` 3.2, 3.4, 3.5; `interaction-pattern-entries.md` 9.4); which error or mark shows where, and which wins
(`glossary.md` 10; error classes, `state-matrix.md` 2.1); budgets (`principles.md` 5); code meanings
(`graphty-element/src/errors/codes.ts`); delivery (`element-contract.md`, `element-needs.md`);
published names (`one-way-doors.md`); what methods text contains (`output-homes.md` 2). **Owner:** content designer. **Ceiling:** the README's table. **Validated by:** section 9.

Finished strings live in code; a document that needs one cites its key or mark, because a copy
drifts. The catalog is structured data, and section 9's lints run over it.

## 1. Who owns a string

**The owner test.** A string about a graph fact belongs to graphty-element, because a third party
embedding it reads the same words: catalog labels, (i) text, states, marks, commands, undo labels,
errors, legend notes, readings (`src/session/results/reading.ts`), the filter chip's count, the
save state, and every sentence about a run, an import, a binding or an autosave. The app owns only
chrome: panel tooltips, menu headings, Report problem, feedback, the start screen's empty line. **The app never rewords a graph fact**; wrong words are fixed in the element.

**Delivery.** The element publishes finished reader text, an error's cause apart from its
developer message, by the route each key names (`element-needs.md`, "Reader text and
formatting"). Each message is published as a key and its named parameters, the template's slots,
beside the English `text`, which is an unpublished default: a host that wants other words, or
another language, supplies a template per key and never parses English (`decided-doors.md`, "Host
names for reader text"). The key scheme, `graphty.<area>.<message>`, and its stability rules are
`message-catalog.md`, "Published keys". **Every slot has a source**: a field on the key's route. A slot the
element does not publish yet is an `element-needs.md` row, and its key's words are not final until
that row lands, because otherwise the app would have to guess a graph fact.

**Template syntax.** ICU MessageFormat: `{name}` slots; plurals inside the template, never by
concatenation (`{N, plural, one {# id not found} other {# ids not found}}`); a kind or a reason is
a `select` outside the plural. **Template words**: every word in a template is a glossary term, a
function word, or a frame word from the one list in `message-catalog.md`, "Template words"; the
lint fails on any other word, and the fix is a glossary term or an addition to that list. **Slot
types** are listed there too: one primary object is named by its row name, as Figma names a layer
("Frame 1"); several objects or elements by a count and a glossary noun ("3 sets detached"); one
node or edge by its label attribute, because analysts look for entities they already know. An
internal id never appears in reader text.

## 2. Voice

graphty speaks like a methods section: the field's term, the number with its unit, the scope it
was computed on. It states facts and offers the next verb; it never praises, apologizes, encourages
or recommends. When something went wrong it says what, where, and **one next step on each
surface**: on the object, the verb the element chose for this cause; on a notice out of sight, the
route to that object (section 4).

**The purpose test.** Every string says what a value is, whether to trust it, or what to do next;
otherwise it is cut. **Tone changes only in length, never in warmth**; how long a
message stays is `interaction-patterns.md` 3.5.

| Situation | Length | Example |
|---|---|---|
| Routine | the template alone | `export.done` "figure.svg exported: style, notes" |
| Blocking | at the field or step, one verb or none | `field.nearestValid` "Closest: betweenness" |
| Data at risk | the cause and the one verb that saves or shows the loss | `save.failed` with Download project file |
| Hard limit | the fact and the limit's value, no verb | `cause.E_TOO_LARGE.index` |

**Banned:** "please", "sorry", "oops", "successfully", "!", "we", "I", questions, "Invalid",
"error" or "unexpected" as a whole message, "try again" when nothing changed, advice about a value,
"Coming" or any placeholder, "OK" as a confirm verb (a confirm names its effect), and the
glossary's rejected synonyms. **"You"** only in Details and (i) text, where the sentence is false
without it ("You changed the view's filters after applying it").

**Plain language.** (i), Details, choice-step headings and choice rows are plain outside the
field's terms, and a field term in a choice heading carries (i). The criterion is behavioral, not
a readability grade, because a grade formula is noise on two sentences: section 9's prediction test.

**References beside a value.** A value may be compared only with a reference **computed for this
graph**, which the element publishes as a reading ("0.41; degree-preserving random graph 0.12").
A published threshold such as modularity's "0.3" is not printed beside a value: random graphs with
no community structure reach high modularity (Guimera, Sales-Pardo and Amaral 2004), so the
comparison would misstate. A cited threshold may appear in the term's (i), and a recipe may replace
that (i) text for its domain. With no computed reference, nothing is printed.

The app's "Coming" tag and its modularity bands, which advise and interpret the graph, are
deleted, not excepted (`implementation-mapping.md` 8).

Evidence: Nielsen Norman Group's error-message guidelines (specific, constructive, non-blaming, at
the problem); Figma's one-line, one-action toasts (`design/ui/figma/components.md` 37).

## 3. Copy conventions

- **American spelling** in every reader-facing string, catalog `plainName` and `description`
  included (color, neighbor, canceled). A published identifier is renamed only through
  `one-way-doors.md` door 14, Published names that mislead. **Sentence case** for every label, heading, button and tooltip.
- **Proper nouns** keep their spelling (PageRank, ForceAtlas2, Kamada-Kawai); **acronyms** only where
  the field uses them (BFS, AUC), spelled out in the (i). Metric names are lower case in running
  text; hyphenation follows the field (in-degree, k-core, self-loop).
- **Commands** are imperative verb plus object ("Color by degree"), no object word when it is
  always the selection ("Filter to"); a row button may say "Revert" where Quick actions says "Revert
  view". "..." means more input, never loading. **Create** keeps a set, path or rule set,
  **Add** puts in an element, graph, layer, note, attribute or data, **Save** keeps something
  transient (a view, a comparison, a Find), **Export** writes a file, **Load** reads a file into the
  project (data into a new data version, a set collection into rule sets), **Apply** copies a recipe's or style's definitions in, **Connect** reads a live
  source; Download project file is the
  one rescue verb, kept for `save.failed`.
- **Undo labels** are the command's name, `{Verb} {object}[ of {target}]`, imperative because one
  string serves Quick actions, menu and button ("Change color of Hubs"). The next press reads "Undo
  {name}", "Redo {name}", "Cancel {name}"; what a press did reads "Undone: {name}", "Redone:
  {name}". The element's command tests enforce grammar and spelling; the undo design's past tense
  and British spelling ("Changed colour of Hubs") are a recorded conflict (`element-needs.md`).
- **Names**: inspector sections are nouns; panels are named in tooltips, not headings; automatic
  names are kind plus counter ("Set 1"); a result is algorithm plus what distinguishes it ("Louvain
  (resolution 1.0)", "(sampled)").
- **Scope** opening a state line or header is a label, "on:" plus a fact ("on: largest connected
  component, 812 nodes"); inside a cause or notice it is "on" with no colon ("0 edges on the
  selection"), because two colons in one line read as three clauses. **(i)** only defines; Details opens from the end of a state line, never from (i).
- **Methods text**, the copyable record of runs (its contents: `output-homes.md` 2): one sentence
  per run, past tense ("PageRank was computed on the largest connected component, 812 nodes,
  ..."), every option as resolved (section 5).
- **Punctuation.** No final period on labels, marks, tooltips, notices, progress or errors; (i),
  Details and methods text are sentences. Ranges use "to", because a hyphen beside a negative
  number is ambiguous. Plain ASCII: "--", straight quotes, "->", "~".

## 4. Messages

Every string that is not a label or methods text is one of these types; a new type needs a row.
**Counting a cap**: as `principles.md` 5, with one difference: a catalog name in a slot
("PageRank") counts zero, because the width rule bounds it and a cap varying by algorithm could not
be checked. `{verb}` and every template word count; brackets count when filled. Caps are fixed
numbers with sources, checked against templates, never examples.

| Type | Template | Cap | Verbs | Principle |
|---|---|---|---|---|
| **Mark** | the closed phrase (section 6) | 3 words, glossary 10's precondition phrase | none, or a precondition's verb | 1 |
| **State line** | `{first state}[, on: {scope}, {count}]` then Details | 5 words: the longest state ("Data changed since applied") and "on:" | the state's verb | 1, 5 |
| **Tooltip** | `{Name}[  {shortcut}]`; a compact value's exact form | one line, 180 px (Figma 34) | none | baseline |
| **Legend note** | a fact about the picture ("312 zeros not plotted") | 6 words, as a notice | none | 1 |
| **Notice** | `{subject} {outcome}[: {counts}]` | 6 words: Figma's toasts run 2 to 8 | one, plus Dismiss X | 5 |
| **Progress** | `{Verb}ing {object}` | 4 words | Cancel, or Stop | 2 |
| **Error** | headline `Could not {verb} {object}`, then `: {cause}` where the surface holds it | 8 words, Figma's longest error toast | the one verb the element chose | 1 |
| **Field error** | the rule, `Closest: {value}` or `Range {min} to {max}` | 8 words, as an error | the candidate value, or none | 1 |
| **Report line** | facts separated by ";" | none; Details, Last import and a recipe's row only | none | 1 |
| **Choice step** | a statement heading ("{N} attributes to bind"), a row per choice stating its result in counts | 6 words a row | one commit verb, plus Cancel | 2 |
| **Empty surface** | its title and at most one command, no sentence; never "No X yet"; a list under its section header is blank; the one statement of this rule, cited by `principles.md` 5 and `state-matrix.md` 2 | the title, and one command's label | at most one | 5 |
| **(i)** | `{Term}: {meaning}.` plus the misreading it prevents | 2 sentences | none | 4 |
| **Announcement** | the notice or state template it speaks, once | the cap of the type it speaks | none | baseline |

**Figma counterparts.** Toast 37: the notice, the running notice (it yields the one slot
to a notice and returns: `figma-crosswalk.md` 4.4) and an error out of sight. Tooltip 34. Modal 36
for a choice step with no dialog open (`drop.choice`); a choice inside the load step
(`load.parallelEdges`) is an issue row with a `StyleSelect`, committed by the step's footer verb,
as Figma's missing-fonts dialog puts a picker on each row, so no dialog stacks on another. Figma's
empty section (`design/ui/figma/flows.md`) for the empty surface. The rest are departures in
`figma-crosswalk.md` 4.3 and 4.4.

- **Notice word order: subject first**, as Figma's toasts lead with the thing ("Large PNG ready for
  copy"), because the analyst scans for the object. A subject that is a command name takes a colon
  ("Undone: {name}"), because an imperative before a participle is ambiguous.
- **One next step per surface.** A class lists the verbs its causes can need; the element publishes
  with each error the one its cause needs ("line 1 is not JSON": Read as...; an unmapped column:
  Re-map columns), so no host picks, and the object's surface offers it. **An error notice out of sight**
  carries the headline and `Show {object}`, which opens that surface; the cause stays on the
  object's state line, and Details is never a notice button, because the record stays at its
  source. `save.failed`, with no object row, carries its cause and verb.
- **Width: two measures, proposed until measured in pixels.** A **toast** line holds the longest
  Figma toast message seen, "Variable names must be unique within a collection" (50 characters of
  figma-spec's body strong role, `design/ui/figma/components.md` 37); its pixel maximum is measured
  from the Toast story into compact-mantine's Toast spec (`figma-spec.md` 8.6). A **panel** line is
  `PANEL_GRID.CONTENT` wide: a row shows only its glossary state
  ("Failed"), and the error sentence is the object's state line, wrapping to at most two lines.
  Name slots shrink first, to 12 characters. **A cause is never dropped** from its state line; one
  that does not fit is rewritten shorter, keeping its subject. Numbers never truncate; their format
  shortens. Widths are English measurements, re-measured per locale.
- **Names truncate at the end**; a file name keeps its extension; a URL or hash truncates in the
  middle.
- **A tooltip holds no fact found nowhere else**: a disabled control's reason is also its
  `aria-describedby` text and its Quick actions row.
- **A field error** states the rule or the nearest valid value; an out-of-range number reads its
  range, and nothing is clamped. A rename's `name.duplicate` states the rule in an error notice, as Figma does, because the
  rename has already closed (`interaction-patterns.md` 3.2).
- **Details** holds the raw cause word for word and **ends with the error's code**, on every error,
  so any error can be searched or reported; a parser's text never reaches the headline.
- **A load problem the import plan has a policy for is a warning**, counted in the import report.
- **A question undo cannot avoid** (`interaction-patterns.md` 3.4) names its effect as its verb,
  beside Cancel.
- **Announcements**: a notice and its announcement are one utterance, spoken once in the region
  `interaction-pattern-entries.md` 9.4 names (with the Toast's role fix there).

### Errors

Three registers. **Analyst input** (fix-field): the rule broken, in field terms, where it was
typed. **Environment and data** (all but report): a fact about the file, graph, device or version.
**Programming faults** (report): "internal fault"; the app adds only Report problem, prefilled with the code
and developer message. The element publishes each error's class and chosen verb as data
(`element-needs.md`); codes per class and surfaces are `state-matrix.md` 2.1; cause templates are
`message-catalog.md`, "Causes".

| Recovery class | Verbs the element chooses from |
|---|---|
| fix-field | none; the candidate value |
| fix-file | Re-map columns; Read as...; Choose another file |
| choose-policy | an issue row with its policies, committed by the load step's verb |
| narrow-scope | Re-run; Filter to |
| over-budget | a choice: Run exactly, the sampled method, a fitting scope, each with its band |
| not-converged | Re-run, until the element publishes a non-converged result; then the mark "not converged" |
| `accelerator` | Re-run, whose label names the CPU path once WebGPU is lost ("Re-run on CPU"); one verb, never automatic (`glossary.md` 9; `element-needs.md`, "A per-run engine choice") |
| hard-limit | none |
| retry | Re-run |
| export-other | Export as {alternative} |
| needs-version, detached | the words and verb of `glossary.md` 10 (Cannot evaluate, "Needs {name}"; Detached) |
| accept-state | none; words under `capability.*` |
| report | Report problem |

## 5. Numbers

Parameters of one value formatter in graphty-element, replacing `toFixed(3)` and the app's
workaround formatters (`element-needs.md`). **It formats every number on screen**: computed
values, time-role attributes and every attribute the import declared numeric, in a column,
legend, histogram axis or badge, unless the import plan marks it a count or an identifier (a
string). A catalog output declares `valueKind: "count"` or `"measure"`. Copies and data exports
carry the stored value.

- **Counts are exact, with commas and a unit**, the not-drawn line included: "1,204 of 5,310 nodes".
  N of N shows N alone.
- **Compact form ("1.2M") only where the drawing fixes the width**: a canvas count badge, the
  filter chip's last width step, and a comparison difference cell (about six characters).
- **Measures show 3 significant figures**; sorting uses the stored value. When adjacent values in
  a sorted column display the same but differ, the column gains digits until they differ, up to the
  stored precision; values equal at the stored precision read tied.
- **The exact form** of a rounded or compact value, shown on hover, focus and in the inspector and
  carried by a copy and the accessible name, is the shortest decimal that round-trips the stored
  value (for a float32, "0.3", not "0.30000001192").
- **Option values and parameters print as resolved**, never rounded (a typed resolution of 1.25
  reads 1.25), because methods text must reproduce the run.
- **One notation per column or legend, by range, then magnitude.** When the smallest non-zero
  absolute value is below 10^-3 of the largest, each cell carries its own e-notation ("3.20e-7").
  Else, when the largest is below 0.001 or at least 1,000,000, the title carries x 10^e (e =
  floor(log10(max|v|)) rounded down to a multiple of 3) and cells show v / 10^e; else plain
  decimals. Always 3 significant figures and no floor, because a floor makes the bulk of a
  heavy-tailed column read the same (principle 1); the range switch keeps cells narrow. Unit-test
  columns: 4.1e-4, 3.0e-4, 1.9e-4, 2.2e-5, 0 read 410, 300, 190, 22.0, 0 under "PageRank (x
  10^-6)"; 0.01, 3.1e-3, 4.0e-5, 1.0e-7 read 1.00e-2, 3.10e-3, 4.00e-5, 1.00e-7. A value alone
  under 0.001 carries its own e-notation.
- **Whole-number formats never show non-zero as zero** ("< 1%", "< 1 s") **or partial as 100%**
  ("> 99%").
- **"~" on every estimated value**, never only in the name, so a screenshot or an exported figure
  keeps its caveat.
- **Differences** carry their sign ("+3"); a difference between two percentages is in points, a
  relative change is a percentage; ratios read "x 1.8". **Percentages** only for a share of a
  whole, whole numbers; a 0-to-1 measure is a proportion.
- **Ranks, one format everywhere**: "#3 of 5,310", and a tie "#3 to #5 of 5,310"; the scope
  follows by the state-line rule, only when it differs from the chip ("#3 of 5,310, on: full
  graph"). A table's rank column shows "#3" alone, because its header names the denominator and
  scope. `top-tasks.md` and the conflict ledger of `principles.md` cite this line.
- **Durations** in the two largest units ("1 min 12 s"); predictions use the cost bands
  (`glossary.md` 10); SI spacing, "%" unspaced.
- **Dates** only for time-role attributes, ISO order, in the declared zone named once in the
  header (else "time zone not declared", unconverted), at the finest stored unit trimmed per column
  to the coarsest that still separates values ("14:03:07.412" for events milliseconds apart).
- **Missing values name why** with the section 6 words; never 0, a dash or NaN. Across a multiple
  selection, differing targets read **Mixed**, which outranks the missing-value words, and "N
  differ" is an exact count.
- **Two kinds of export.** Data copies and exports (clipboard rows, CSV) carry the bare stored
  number, caveats and missing reasons in their own columns (door 61, Caveats and missing values in exports), scope in the headers. Picture
  exports carry the on-screen form, marks included, and a caption (`export.caption`) with the
  filter and each shown result's scope when they differ from the full graph, because a filtered
  figure that does not say so misleads away from the app.

## 6. Marks

Each mark's words and meaning are `glossary.md` 10 (Mixed and {N} differ, 13); where a mark is
drawn is `interface-specification.md` 3, and which wins on a row is `state-matrix.md` 2. A mark is at most 3 words.
A notice that reports an import loss has one verb that opens its source ("Show import").

**Accessible names.** An icon button's name is its command; a compact value's is its exact form;
a disabled control's description is its reason. A screen reader says "selected" for a row
selection, and the canvas selection is always announced with "on canvas" (`glossary.md` 14,
"selected"). Spoken forms: "#3" "rank 3", "(i)" "About
{term}", "->" "to"; other marks are read as written. Neither counts against a budget.

## 7. Counting app text

**What counts, and what a word is:** `principles.md` 5. This section is only the method.

**Measurement.** Data renders inside a `data-copy="data"` wrapper (attribute and object names,
values, counts, legend categories). A Storybook play function counts visible words outside it,
the element's shadow root and published canvas strings included (`element-needs.md`), against the
`principles.md` 5 budget. A forgotten wrapper reads high, so the mistake fails safe.

**Fixture.** Graph loaded, nothing selected, rail on Graph unless named, "Additional labels" off, on
the directed and undirected Small fixtures (`scale-levels.md` 2, "Named fixtures"); Huge for "not
drawn"; a sampled run for "~".

**Counted states** are `state-matrix.md` fixtures carrying the play function: the start and rest
screens (directed, undirected, over the drawing limit); the graph's inspector, plain and with every
edge mark; `State/Inspector/NineteenLayers`; Results at rest; one and forty nodes selected; a rule
set under a filter; a named group; two and five sets; the heaviest result editor; a numbers column.

**Overruns.** A change over budget names what it cuts, or adds a row to `principles.md`'s conflict
ledger for the owner.

## 8. The message catalog

Every key and error cause template is `message-catalog.md`; a flow step where the system speaks
adds a key there.

## 9. Validation

- **Lints**, owed except where `research/scripts/` already checks them (spelling, ASCII, retired
  phrases), over the strings modules, catalog data, command definitions and these documents:
  rejected synonyms, banned words, British spellings, non-ASCII. Over `message-catalog.md`: one
  Type per key; ICU parses; template words (section 1); cap and verb count; a Level 4 reason on
  every notice; every mark in `glossary.md` 10. Across documents: every class verb is one the
  element can choose; every empty surface has at most one command; every route and slot source
  exists in the element or `element-needs.md`.
- **The render test**, in the app's Storybook: every key in its real component at its real width
  with worst-case slots, asserting it fits (section 4, Width) and is spoken once, in its Spoken
  region. Templates read alone cannot show an overrun, a double colon or a doubled announcement.
- **Tests**, in graphty-element: each code and discriminator pair yields one class and one chosen
  verb; command tests check undo labels; the formatter's two worked columns. In both: the counted
  states; a copied badge equals the exact count; a copied value round-trips.
- **Reader testing.** Five readers, at least two without graph training
  (`design/designloom/personas/explorer-elena.yaml`), see each notice, error, mark, (i) and choice
  step in its story: "What happened, and what will this verb do to your graph?", scored against an
  answer written first. **Pass: 4 of 5 per string family**; this prediction test replaces a
  readability grade and a cloze test, both noisy on texts this short. A **highlighter test** (Gale,
  GOV.UK, 2014) on (i) and Details prose. Readers also name who caused each error; misattribution
  widens the "you" rule.
- **Walkthroughs**, because messages come in sequences: the overview recipe (several runs ending
  out of sight, one failing), a first load with parallel edges, a directed path query with no
  path, and a figure export under a filter, each read in order on the real surfaces.
- **Open studies.** Analysts order eight PageRank values under the shared scale and per-value
  notation, including section 5's wide-range column (it could move the 10^-3 trigger); "What does
  red mean?" with and without the legend title informs the owner's ledger ruling.

## Rejected alternatives

- **Finished strings in documents**: a copy that drifts.
- **The app writing element sentences, or rewording an element key for itself**: every host may
  supply its own words by key, but the graphty app does not, so wrong words are fixed in the
  element for every consumer (section 1).
- **Kinds and slots per event with no key**: a host that disagreed with one word would have to
  switch on event kinds and rebuild every sentence of that kind.
- **One verb per recovery class**: a class covers causes that need different fixes, so the cause
  picks the verb. **Every verb of a class on a notice**: three next steps is a menu, not an answer.
- **A domain threshold beside a value, even from a recipe**: it misstates on random graphs.
- **Causes cut to a row's width**: a cause needs its subject.
- **Past-tense undo labels**: "Undo Ran PageRank" reads wrong.
- **A floor ("< 0.001")**: the bulk of a large graph's PageRank reads the same.
- **Merge as the only answer to parallel edges**: a fraud or traffic multigraph loses its edges.
- **Localization now**: deferred; the published keys and ICU keep it possible.

## Sources

- graphty-element `src/errors/codes.ts`, `errors/GraphtyError.ts`, `session/results/reading.ts`,
  `session/runs/types.ts`; graphty `shell/statusbar/formatCounts.ts`, `shell/readings/readingFormat.ts`
- Figma: `design/ui/figma/components.md` 34, 36, 37 and the secondary button;
  `design/ui/figma/flows.md`; compact-mantine `design/figma-spec.md` 8.6 (PR #409 worktree)
- Nielsen Norman Group, "Error-Message Guidelines", https://www.nngroup.com/articles/error-message-guidelines/
- ICU, "Formatting Messages", https://unicode-org.github.io/icu/userguide/format_parse/messages/
- Guimera, Sales-Pardo and Amaral, Phys. Rev. E 70, 025101, 2004
- Gale, 2014, https://userresearch.blog.gov.uk/2014/09/02/a-simple-technique-for-evaluating-content/
- Batziakoudi, Cabric, Rey and Fekete, CHI 2025, https://arxiv.org/abs/2404.15150
