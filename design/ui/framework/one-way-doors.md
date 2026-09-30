# One-way doors

**Job.** List the decisions in the graphty design framework that are expensive to undo, with a
recommendation for each, in the order the build needs them, so the owner can decide each before it
ships. **Not here:** anything reversible, which its own document decides; additive element API,
which is a two-way decision until released and lives in `element-needs.md`. **Owner:** design
director; decided by the owner. **Ceiling:** the README's table. **Validated by:** every open door
passes the test below, and every door a build slice needs is in the queue.

**graphty-element** is the standalone web component that owns every graph capability; the
**graphty app** is only the window around it. Every door is a graphty-element decision; none of
them is app code.

## The test

A decision is a door only if a **tolerant reader** (a reader that keeps fields it does not know and
fills fields an old file lacks with a stated default) cannot absorb reversing it. Four kinds pass:

- **file format**: a key, identity or meaning stored in project, recipe or style files;
- **a rename or removal of a name graphty-element already publishes**;
- **a changed published default** that every existing consumer or file would see;
- **a public URL or a cross-package published type**.

**Not a door:** a changed default that alters only how a drawing looks, stores nothing in a file and
changes no meaning, so a later release can change it back with a release note; its owning document
decides it with the reason. A new name, read, event or property is **additive**: a two-way decision
until the release that publishes it, taken then by the API steward from the recommendation in `element-needs.md`. This
follows the owner's ruling on the sets names, that none was a door while unpublished (the sets
design, 15.3). **A release that publishes a shape named here updates this document in the same
change**, so a door is never walked through without the owner seeing it.

## The queue

The one list of which door gates which build slice (`implementation-mapping.md` 9). **The queue
orders decisions, not releases**: a door is decided by the slice named here, which may ship its
change later; doors 17 and 22 and door 86's split of `session.visibility` are decided in slice 6
and ship together in the major version that ships the file (door 15). **A section of the autosave
is written only once the doors that fix its contents are decided** (door 88), so each such door
sits in the slice that first autosaves its section. For each slice the owner may accept every
recommendation at once; the documents are written on them, so accepting changes nothing else, and
rejecting one changes the documents under its "Depends on it". **The owner is asked now only for
the next two slices**, 2b and 3; the rest wait until their slice is next. The doors of slices 1
and 2 were decided on 2026-09-28 (`decided-doors.md`), except the halves those slices do not need.

| Slice | Doors, in order (titled below) |
|---|---|
| 0, open a node | none |
| 1, open, characterize and the keyboard floor | none |
| 2, find and table | none |
| 2b, menus and Quick actions | 91 |
| 3, reopen | 88; 89; 3; 4; 5, its reference half; 95 |
| 4a, rank | 92; 26; 42; 9; 10; 93; 94; 14, the descriptor-spelling half (options) and the catalog-label half (`displayName`, `family`) and `Run.accelerator` |
| 4b, color | 20; 31; 58; 84; 85; 5, the stack-order half; 14, the descriptor-spelling half (channels) |
| 4c, the Assistant | none |
| 5, sets and paths | 39, object selection; 27 |
| 6, filters and layout | 12; 13; 22; 25; 86; 75; 17 |
| 7, recipes, notes and export | 33, the replaceable option and its name; 5, the rest (door 2 cites it); 1; 2; 14, the remaining renames; 15; 19; 21; 29; 34, which ships with recipe files; 38; 61 |
| 8, the modes | 28 |

## Walked through, and decided

Doors already shipped, and decisions checked against the test and found reversible, are
`decided-doors.md`, so this document lists only what the owner must still decide.

## Open doors

### Reopen (build slice 3)

#### 88. The autosave's envelope

**Decision.** The outer shape of what graphty-element's autosave writes, fixed before the reopen
slice; the contents and the downloaded file (doors 1, 2, 38) stay open until the file slice.

**Why it is a door.** An autosaved project is data on the reader's disk that every later release
must read: once written, its shape is a file format, whatever the plan calls it.

**Options.** (a) Keep the store internal and migrate it later; (b) fix only the envelope now; (c)
decide the whole file now.

**Recommendation: (b)**: a format version; the element version that wrote it, so a later reader
knows where a section it keeps but cannot read came from; sections named by namespace; door 89's
ids; unknown sections kept and written back; and **committed state only**, because an autosave 600
ms into a measured slider drag saved a value the reader was still passing through
(`element-contract.md` 14); and **content-addressed members**, so each kept run's values, stored
positions and joined tables are written once and referenced by digest and an autosave rewrites only
the index and what changed, measured at the Million fixture before slice 7. (a) fails: the first
reopen publishes the shape; (c): recipes have not yet shown what the file holds.

**Section contents before the file slice.** The autosave writes a section only once the doors that
fix its contents are decided, and each such door sits in the queue at the slice that first writes
its section: records, the frozen graph reference and stored precision in the rank slice (doors 9,
10, 93, 94), the style stack in the color slice (doors 31, 84, 85, and door 5's stack order), filter
steps and the hidden state in the filters slice (doors 25, 86). Until a section's doors are
decided it lives in the session only, and the reopen test states in writing which sections survive
a reopen. Nothing is written as a cache a later reader may drop, because by then real work sits in
it. A section is also written only with the published names its doors have settled, so a name door
14 renames never reaches a disk under the old spelling. **This rule is coupled to the default
shell's switch date**: the new shell becomes the default after the filters slice
(`implementation-mapping.md` 8), so no reader relies on a session-only section before its door is
decided. If the switch moves earlier, each section's door must move with it; neither rule changes
alone.

**Depends on it.** `element-contract.md` 11, 15; doors 1, 2 and 38, which fill it; door 95, whose
checkpoints the envelope reserves a place for; `implementation-mapping.md` 8, the switch date.

#### 89. The form of element-minted ids

**Decision.** One grammar for every id graphty-element mints or namespaces: the kind prefix, the
namespace separator, and the characters each kind allows.

**Why it is a door.** Ids are written into the autosave and the file; a change re-keys every stored
reference.

**Walked through in part.** Five forms already ship or are specified, and they disagree:

| Form | Where | What it does |
|---|---|---|
| `set_<slug>`, then `_2`, `_3` | set ids (`src/session/sets/store.ts`, `mint`) | a kind prefix, then a rest derived from the name, not opaque |
| `<slug>_<n>` | style-layer ids (`src/session/styles/Layer.ts`, `mintLayerId`) | no kind prefix; unique only within a session |
| `set_<ns>.<rest>` | sets from another project (`element-contract.md` 2) | `.` as a namespace separator |
| `<ns>__<id>` | ids an applied recipe brings (door 19) | `__` as a namespace separator |
| `graphty:e<n>`, `graphty:overrides` | edges (door 3) and the Overrides layer (door 31) | `:` as a namespace separator, as catalog keys use (`graphty:degree`) |

Run ids match `/^[a-z][a-z0-9_-]*$/` (`src/session/runs/types.ts`), which refuses both `.` and `:`.

**Options.** (a) Keep each form as shipped; (b) one grammar for new kinds only; (c) one grammar for
every kind, re-keying layer ids.

**Recommendation: (b).** Every minted id is `<kind>_<rest>`, with a kind prefix a person, an error
message and a reader can use, and a rest no reader parses; every namespaced id is `<ns>__<id>`,
because `__` passes every shipped pattern and `.` and `:` do not. Catalog keys keep `package:kind`,
which is a different thing: the name of a capability, never an id stored as a reference. Set ids
keep their shipped form. **Layer ids become project-unique before the autosave writes them** (door
88), keeping their shipped spelling, because re-keying saved style documents would break every
style file already written; a new layer kind takes the prefix. `graphty:overrides` becomes
`graphty__overrides`, and the edge form of door 3 takes `__` too, before either is written. Run and
result ids keep their derivation (door 7). A found set or path gets its id when found, so Keep,
undo and the announcement of its loss name one object.

**Depends on it.** `element-contract.md` 2; `implementation-mapping.md` 1; doors 3, 19, 31.

#### 3. Edge identity

**Decision.** What key identifies an edge in the file.

**Why it is a door.** Today graphty-element mints a counter for every edge, even when the file names
its edges, and the counter restarts on every load (`research/graphty-today.md` 1.4, 7.15). If that
counter were written, every saved reference to an edge (a set, a path, a note, a result value)
would re-attach to a different edge after a save and reopen, with no error. Changing the key after
files exist re-keys all of them.

**Options.** The minted counter; the file's own edge id; the edge's ends plus a key.

**Recommendation.** The edge id from the imported data when it has one; otherwise (source, target,
key), with the ends in the order they were ingested, whatever direction is declared, so re-declaring
direction never re-keys an edge; an undirected reading matches A-B and B-A as one pair without
storing them so, where the key is the file's key field or, when
there is none, the **ordinal**: the edge's position, in ingest order, among every edge of its pair
in the load that ingested it, stored with that pair's edge count in the load. That position is the
one exception to "never store a position". Counting every edge of the pair, not only those without
ids, means configuring an id later never moves an ordinal; counting per load means replacing one
source never shifts another's; and a reference binds only when exactly one edge matches its pair,
ordinal and count, so it reads missing rather than binding a different edge. An edge added in the
session gets a minted id in the reserved namespace `graphty:e<n>`, so ordinals cover only file
edges. After Add data the source is part of the key, so two sources' edges between one pair stay
apart. The counter may stay an internal handle and is never written (`element-contract.md` 2).
Reason: every other choice silently breaks references.

Four parts of this door are due before the release that writes the first project file:

- **The import report's edge-identity field.** The report must say "N parallel edges without ids:
  references to them match by position". That is a new public field on the import report, so its
  name and shape are part of this door. Recommended: `ImportReport.edgeIdentity` counting the edges
  that carry a file id and the edges matched by position.
- **Which file ids count.** graphty-element 2.x reads a file edge id only at a configured
  `edgeIdPath`, because probing files for ids would change how existing loads merge repeated edges.
  Recommended: default `edgeIdPath` to the format's declared edge-id field (GraphML, GEXF) in the
  major version that ships the project file.
- **The stable edge id's column name.** `session.snapshot()` in graphty-element 2.x already
  publishes the session counter under `graphty.edgeId`. A file column of that name would either
  hold a different value than the same-named snapshot column or tempt a writer to store the
  counter. Recommended: the file writes the stable id (the file's id, or a minted `graphty:e<n>`)
  under a name no snapshot uses for the counter, and never writes the counter.
- **The source column's name.** Recommended: `graphty.source`, stamped at import, with what counts
  as a source (a file, a query, a re-import of the same file) decided by the Add data design. The
  name is published the moment it is stamped, so it is decided with this door and not before.

**Partly walked through.** graphty-element 2.6.0 ships stable edge identity and the hash columns
(`CHANGELOG.md`, "stable edge identity and hash columns") and never reissues an edge id after a
clear or a replacing import; the file-level names above stay open until the first file is written.

**Re-binding by content across loads.** A reference keyed by position binds only within one load;
after Replace data it re-binds by `graphty.edgeHash` of the edge's imported attributes, on a unique
match only, and otherwise reads "ambiguous parallel edge", both counted in the report's
edge-identity field. The stored ends stay in ingest order whatever direction is declared
(`element-contract.md` 2). Recommended with the rest of this door, in the reopen slice.

**Depends on it.** Sets, paths, notes on edges, edge-keyed results, comparison matching.

#### 4. Node identity with node types

**Decision.** In a two-mode table (users and items, authors and papers, genes and pathways), whether
user "123" and item "123" are two nodes or one.

**Why it is a door.** Node identity is the key of every saved project. Treated as one node, the two
silently share edges, which makes bipartite density and bipartite projection wrong with no warning;
switching later re-keys every saved project that declared types.

**Options.** The id alone, always; the node type plus the id once node types are declared.

**Recommendation: type plus id once the endpoint columns declare different node types; the id
alone otherwise.** The import report's first line counts the ids that occur under more than one
type, so the analyst sees the case at once. A file with no declared types behaves exactly as today
(`element-contract.md` 2; `content-design.md`, import report first lines).

**Depends on it.** Import, the id map, every stored node reference, bipartite algorithms, and the
sets design's stored form: a fixed set's `nodes` list, the `r1:` revision and the
`graphty.nodeHash` column all key a node by its `NodeId`. The sets work merged before any file was written; this door must be answered before the autosave
first writes (the reopen slice), because a member list written without a node type cannot be given one later.

### Menus and Quick actions (build slice 2b)

#### 91. Where intent commands publish

**Decision.** Whether graphty-element's intent commands (id, label, argument schema, availability
with its reason; `element-needs.md`, "Intent commands in graphty-element"), and the opt-in key
dispatcher that issues them, publish from `@graphty/graphty-element/commands`.

**Why it is a door.** That entry point is already published and reserved for this vocabulary, and
is removed at the next major release unless the vocabulary ships there (`commands.ts`, issue #337).
Removing it, or shipping the commands under another name, is a published-name change.

**Recommendation: publish the command data there** (ids, labels, argument schemas,
availability), reconciled with PR #553's `CommandDefinition`, and keep the entry point free of the
DOM so an agent or a Node consumer can import it (added to the Node-safety test); `attachKeymap`, a
DOM dispatcher, publishes from the main entry and `useKeymap` from `./react`.

**Depends on it.** `implementation-mapping.md` 3.1, 3.3, 5; `output-homes.md` 3.

### Rank (build slice 4a)

#### 92. An unnamed run's result

**Decision.** Whether an unnamed run of an algorithm this graph already has a result of re-runs that
result on the current scope (what a Catalog click promises, `conceptual-model.md` 4.3) or makes a
new result whose id hashes the new scope (what `element-contract.md` 3 says the API does).

**Why it is a door.** It is published run behavior: every host that starts a run by name gets one
or the other, and style layers bound to a result repaint or not by it.

**Recommendation: re-run the existing result, as one element command every host issues**
(`runs.run(algorithm, { reuse: "algorithm-on-graph" })` or an intent command), and resolve a later
unnamed call through the result's current run, never by re-deriving the id from a scope it no
longer holds. Run as new result stays the explicit second result.

**Depends on it.** `element-contract.md` 3; `conceptual-model.md` 4.3; door 7's derivation.


#### 26. Whether a finished run paints

**Decision.** What happens to the look of the graph when an algorithm run completes.

**Why it is a door.** graphty-element 2.x paints automatically (`RunStyle` on by default) and
suppresses the suggestion when an enabled authored layer writes the same channel
(`src/session/styles/autoApply.ts:182-197`). Turning the default off changes published 2.0
behavior.

**Options.**
1. Automatic paint with "covered" states: three screen states, four rules, and a coverage test on
   every layer edit; not what the element does.
2. Nothing paints; a run offers "Apply style" once: flips the published default, and adds a click
   to every run in 15 of 20 figure-producing workflows.
3. Keep suppression, and when a run's paint was suppressed say so once, "Color set by <layer>",
   with Apply anyway: one state, an additive "suppressed by" field on the run.

**Recommendation: option 3.** It matches what graphty-element already does, avoids both published
changes, and always tells the analyst why a result did not repaint. It departs from Figma, where
creating a variable paints nothing, and is recorded as a departure. The defect in the suppression
check (it ignores the authored layer's selector, so one hand-colored node suppresses every later
automatic color) is issue https://github.com/graphty-org/graphty-monorepo/issues/551 and is
fixed whatever the answer.

**Depends on it.** `conceptual-model.md` 5.1; `interaction-patterns.md`; `content-design.md`.

A Look writes no layers (door 85), so it never suppresses a run. Withheld suggestions are recorded
nowhere today, so "suppressed by" is one value of a per-run outcome per suggested channel
(`element-needs.md`, "A per-run outcome for each suggested channel").

#### 42. Cost bands and the cost gate's default

**Decision.** What each catalog entry and `session.estimate` publish about cost, and what the gate
does past the exact budget.

**Why it is a door.** Every consumer's run control reads the band words; and the gate's behavior
past the budget is a published default.

**Recommendation.** Publish the band words of `glossary.md` 10, an explicit "no model" answer, and
the **response class** (under 0.1 s, under 1 s, under 10 s), because the commit rule needs to tell a
live edit from a held one and the bands start at a minute (`interaction-patterns.md` 3.3). Widen
`estimate` to layout runs. **The gate never swaps a method**: past the exact budget it refuses and
offers Run exactly and the sampled method, each with its band, and the scopes that fit; today it
runs an approximable algorithm approximated. Remove `approximateAboveNodes`, which approximates by
node count (principle 2). **The estimate returns its band and the gate's verdict together** (runs,
arrives unrun, or refused past the cap), because the default cap (30 s) sits inside the "under a
minute" band, so a band word alone cannot say whether a click runs, and a host that compared the
two would be re-deriving the element's rule. Alternative: move the cap's default to a band edge
(60 s), which keeps the band predictive but still leaves every host to combine two fields.

**Depends on it.** `interaction-patterns.md` 3.3 and 3.7; `principles.md` 2; `state-matrix.md` 4.10.

### Color by value (build slice 4b)

#### 20. A measurement level per attribute

**Decision.** Whether graphty-element publishes an attribute's measurement level, and its values.

**Why it is a door.** It is a new field on the published `AttributeDescriptor`
(`graphty-element/src/catalog/types.ts:655`), stored in files and read by recipes, style layers
and scale pickers. Today no level exists: "category" is inferred from dataset size
(`src/session/attributes.ts:124`, `unique <= max(2, sqrt(total))`), so the same column changes type
between a small and a large file, and integer-coded categories are read as quantities.

**Options.** Keep inference only; a declared field with inference as the fallback.

**Recommendation: a declared field, `measurement: "categorical" | "ordinal" | "quantitative" |
"time"`, inferred only when undeclared and correctable in the import report; partition results
declare `"categorical"` by construction.** The published words are the screen words
(`glossary.md` 5; `element-contract.md` 10), and the same word as the scale key below, so one
concept never has two published names; Vega-Lite's "nominal" and "temporal" were considered and
rejected for that reason. The scale descriptors' existing `domainKind` (`src/catalog/scales.ts`)
then matches against it. The catalog scale named `ordinal` (`src/catalog/scales.ts`) is d3's
categorical lookup, not the ordinal level, and will mislead anyone who reads both; recommendation:
publish `categorical` as its preferred name beside `ordinal`, deprecated, in the same release. A rank-order scale for the ordinal level, when it ships, takes a distinct key (recommended: `rank`), never `ordinal`, so the old key cannot be read as the new scale.

**Depends on it.** Door 19; door 84; the scales a style layer offers; the column header's type control.

#### 58. The legend and not-drawn notice

**Decision.** Whether graphty-element draws a default legend and a not-drawn line in a bare embed,
publishes the legend model with drawn and filtered-total counts for a host that draws its own,
gives the model entries for object
marks (each highlight, a path's ends and direction, comparison membership) beside channel entries,
and publishes the figure export options (background: the view's own, transparent, white or the
light canvas; state marks off unless asked; the legend on).

**Why it is a door.** An attribute or option that shows, hides or hosts the legend, and the legend
model's shape, are published API.

**Options.** No drawn legend (every consumer builds one from `session/styles/legend.ts`); a drawn
legend only; a drawn legend plus the published model.

**Recommendation: a drawn legend plus the published model.** An encoding without its key misstates
its values (`principles.md` 1), and a third party should not have to write one. The legend uses its
own theme-following surface and the host's computed `font-family`, because a bare embed has no
compact-mantine tokens. The app hosts the element's legend rather than drawing a second one. Mark
entries are needed because highlights, paths and comparison membership carry meaning without being
channels; without them an exported figure shows marks with no key. Export follows Figma's frame
export: no background set exports transparent.

**Depends on it.** `canvas-drawing.md` 8, 13; `interface-templates.md` 13; `element-needs.md`, "Reader-facing text for graph facts".

#### 84. A category's color fixed at first paint

**Decision.** Whether an encoding of a categorical attribute stores the color each category
received, so the assignment survives a filter, a re-run or new data.

**Why it is a door.** It changes what a saved encoding holds and how every existing file is drawn:
today colors are handed out in palette order, largest group first, each time the layer paints
(`settleCategories`, `src/session/styles/encoding.ts`).

**Options.** Recompute from sizes on every paint (today); fix the assignment in the layer's `map`
at first paint, with new categories taking the next free color.

**Recommendation: fix it at first paint**, written into the layer's `map` as a **palette slot**
with the palette's id, never as a color, so a Look can still substitute the palette; only a swatch
the analyst sets is stored as a literal, and the two are told apart in the file (door 85). Decide which groups
fold into Other at the same moment. Sorting by size stays a legend order. A filter step that shrinks
a category must never move it into Other or change its color, because that misreads the data with
nothing to warn the reader (`principles.md`, rules).

**Across data.** A map travels in a recipe or style file only for a declared vocabulary; otherwise
it is fixed again at first paint on the recipient's data (door 19).

**Depends on it.** `options-and-encodings.md` 5; `canvas-drawing.md` 3.

#### 85. What a Look is

**Decision.** Whether a Look (Print, Colorblind safe, High contrast) is a set of style layers added
to the stack, or a substitution of palettes applied to every encoding.

**Why it is a door.** A Look is saved in the project and in style files, so its meaning is file
format.

**Options.** Layers added to the stack (they either cover the analyst's encodings or change nothing,
and as `template` layers they silence later runs' paint); a palette substitution, the default
palette per kind plus a map from palette to palette, writing no layers.

**Recommendation: a palette substitution**, as a Figma mode swaps values under existing bindings.
It passes through the one function that chooses a palette (`prepareRamp`), so the legend follows it
and no run is silenced; palette slots follow it and literal colors stay as set (door 84). One Look
per project, chosen from the icon on the graph's property header, and captured by a saved view.
High contrast is one Look resolved by the canvas it is drawn on (`canvas-drawing.md` 4a). Scales are never substituted: linear against log is a judgment about the
data. Until the element supports it, no accessibility Look ships.

**Depends on it.** `conceptual-model.md` 5.1; `canvas-drawing.md` 13; `figma-crosswalk.md` 1.

#### 31. Overrides, Base style and the stack order

**Decision.** Whether graphty-element creates two layers of its own in every style stack --
**Overrides** (hand edits, kept first once used) and **Base style** (the bottom) -- whether they
are saved, their published ids, and the order the file stores (`conceptual-model.md` 5.1: Overrides
first, new layers directly below it, Base style last). The bottom layer is called Base style, not
the older name, because a Look is the palette substitution of door 85 and the two would read as one
thing.

**Why it is a door.** A layer id written into files and read by consumers' code is a published
name, and a saved layer is file format.

**Options.** No built-in layers, hand edits becoming ordinary layers; the two layers, saved, with
reserved ids; the two layers, derived on load and never saved.

**Recommendation: the two layers, saved, with ids in the reserved `graphty:` namespace.** A hand
edit needs one place that wins over authored and algorithm layers and that a recipe can drop
(`files-and-recipes.md` 1); the base style needs one place a style file can replace. Saving them
keeps a reopened project identical. Recommended ids: `graphty:overrides` and `graphty:base`. Base
style leaves unset any channel that inherits from another (the arrow colors follow their line), so
a Color by on edges also colors the arrowheads. Hidden elements are not a layer (door 86).

**Depends on it.** `conceptual-model.md` 5.1; `files-and-recipes.md` 1; `element-needs.md`.

### Sets and paths (build slice 5)

#### 39. Selection of one object as a whole

**Decision.** Whether the selection gains a second kind, one primary object as a whole (a set, a
path or an item), beside the element selection, and its published shape. The element selection
and the cap are decided (`decided-doors.md`, "Selection over the cap").

**Why it is a door.** The kinds are types every consumer reads; the `SelectionCause` values
(including the undo design's `"history"`) are matched by name.

**Options.** Elements only, with an object's members standing for it; a separate object selection
beside the elements; one selection whose kind is elements or one object.

**Recommendation: one selection whose kind is elements or one object.** A found path, a set and an
item are acted on as wholes (Enter goes to their members, `interaction-pattern-entries.md` 4.2),
and an object selection made from a box has no object behind it, so a box always selects
elements. The undo design's rule that an over-cap step leaves the selection unchanged is revisited
when the cap changes.

**Depends on it.** `interaction-patterns.md` 3.1; `interface-specification.md` 4.0;
`conceptual-model.md` 2.

### Filters (build slice 6)

#### 12. The expression language

**Decision.** JMESPath stays for field paths and plain predicates, as every selector, saved scope and
style document already writes it. What JMESPath cannot express -- relative thresholds (top 10%,
percentile, z-score), a comparison against another element's value, arithmetic for expression
columns -- is added as structured JSON forms published in the Node-safe `./schema` entry point.
Aggregates over a node's neighbors are algorithm runs, not expressions (`element-contract.md` 9).

**Why it is a door.** Expressions are stored in files and written by consumers.

**Options.** Replace JMESPath with a new syntax; extend JMESPath with custom functions; keep
JMESPath and add structured forms.

**Recommendation: keep JMESPath, add structured forms.** Every existing saved document stays valid,
no parser is invented, and the forms are data a UI can build and read back.

**Depends on it.** Rule sets, thresholds from a histogram band, expression columns.

#### 13. Reserved path roots

**Decision.** Which roots a field path may start with, and which field names under a result are
reserved. `results` is published; imported and authored attributes are read under `data.`
(`ATTRIBUTE_PREFIX`). `graph.<measure>` is wanted for always-available measures such as degree,
read live over whatever scope the reader has, and `runs` names one run under a result
(`element-contract.md` 9).

**Why it is a door.** A path root added after users have stored paths changes what those paths
mean. graphty-element 2.x reads any path that is not under `results.` as an attribute, so a stored
threshold over `graph.degree` resolves to nothing today and would silently change meaning when the
root arrives.

**Recommendation: refuse every root other than `data` and `results` at the doors now, so `graph`
is additive later; enforce that no result field is named `runs` by a catalog check.** Degree and
the other always-available measures need a stable path that is not a run. Because attributes live
under `data.`, an imported column called "graph" is `data.graph` and cannot collide, so no column
is renamed on import. No `sets` root is reserved: membership is the `member` rule leaf (door 11),
and a second grammar for it inside JMESPath is what door 11 exists to remove.

**Depends on it.** Style layers and table columns bound to degree, rule sets over always-available
measures.

#### 22. The filtered-graph scope's name

**Decision.** Whether graphty-element publishes `"filtered"` beside its scope value `"visible"`,
which is the default scope of every run (`src/session/runs/RunsApi.ts:399`) and names the filtered
graph, not what is drawn.

**Why it is a door.** A drawing word governing analysis is where the owner's "two kinds of filter"
question came from. Renaming a published default changes consumers' code.

**Recommendation: add `"filtered"` as the preferred name, deprecate `"visible"`, and ship both in
the same major version that moves the layout's default scope to the filtered graph (door 17)**,
decided in the filters slice with door 17 and shipped with it (the queue),
together with door 86's split of `session.visibility`, so no published name says "visible" for scope.
Shipped alone, "filtered" would promise something layouts do not yet do.

**Depends on it.** Door 17; `glossary.md` 6.

#### 25. One kind of filter step or two

**Decision.** The published shape of an ordered filter list, whether steps come in one kind or two,
and what a step stores when the investigation grows it.

**Why it is a door.** `FilterStep` and its stored additions are in every saved file, and the methods
text is written from them. A kind stored per step cannot be dropped later without guessing what
every old file meant.

**Options.**
1. **One kind** (recommended). Every step bounds every computation. A search states its scope
   (filtered or full graph) before it runs and records it; an endpoint outside the filtered graph
   offers the full graph first, and a search that finds nothing inside offers the same search over
   the full graph.
2. **Two kinds**, set by the command that made the step: a working set, which searches may cross,
   and a data step, which they may not; the kind shown as a word on each step.

**Recommendation: one kind**, `FilterStep = { id, set, outcome, input?, enabled }`, with Add
selection to step (Filter to neighbors is the same command with the neighbors as operand) editing
the newest Filter to step in place; the step
stores the union of its rule and each addition, labeled with the command that made it ("+37 by
Filter to neighbors, 2 hops, from 3 nodes"). It removes a hidden mode (the same 40 nodes behaving two
ways by the route taken) and the search-graph rule that lifted later steps with a working set. The
teach-back decides between the two (`research/study-schedule.md`, "Model teach-back", task 4). Today there is one
filter; per-step membership is an element need.

**Depends on it.** `conceptual-model.md` 4.4; `interaction-pattern-entries.md` 6.9; the methods text.

#### 86. Whether an element is drawn

**Decision.** How graphty-element stores Hide on canvas: as a per-element visibility state outside
the style channels, written only by Hide on canvas and Show on canvas, or as a style layer that sets
opacity to 0.

**Why it is a door.** The state's published name and its saved form are file format, and the style
channels are a closed published list. A file that stored hiding as opacity 0 could never be told
apart from a real opacity of 0.

**Options.** (a) A style layer that sets opacity to 0: a later layer that writes opacity shows
hidden elements again, and a bound opacity scale whose range reaches 0 silently makes real data
impossible to pick. (b) A reserved layer kind that always resolves above every paint layer: order
stops mattering, but opacity still needs special handling in picking and in the drawing limit. (c)
A per-element visibility state outside the stack, one per graph.

**Recommendation: (c), under a name that cannot be read as scope.** On master `session.visibility`
is the filtered graph every run reads (`src/session/visibility/VisibilityApi.ts`: "THIS IS THE DATA
SCOPE. IT IS NOT THE RENDER SET"), so hiding must not live there. Publish the drawn state as
`session.drawing` with `hide(ids)`, `show(ids)`, a windowed read of the hidden ids, and its own
event and revision key, which move no count; move the ordered filter steps to `session.filters`,
whose revision moves every count; deprecate `session.visibility` with door 22 (doors 14, 15).
Hidden elements are saved in each graph's part (door 5). Opacity 0 stays paint: drawn, pickable and
charged to the drawing limit. An edge with a hidden end is not drawn. Hidden elements stay in every
count, table row, run and layout (`state-matrix.md` 4.1). Bound
opacity scales default to a floor of 0.15 (`options-and-encodings.md` 5).
Until the state ships, the build cuts Hide on canvas rather than shipping option (a).

**Not charged to the drawing limit.** What is drawn is the filtered graph minus the hidden
elements (`state-matrix.md` 4.1), so hiding narrows the view at any size; a Show that would pass
the limit is refused by the element. Hiding never narrows what a layout reads, because hiding
changes no computation: a layout past what it can handle over the hidden nodes it would read is
unavailable with its reason, and offers Filter to drawn (`state-matrix.md` 4.2).

**Depends on it.** `conceptual-model.md` 5.1; `interaction-pattern-entries.md` 6.9 and `interaction-pattern-entries.md` 9.3;
`element-needs.md`.

### Layout (build slice 6)

#### 17. The default scope of a layout

**Decision.** Which nodes a layout moves when the caller names no scope.

**Why it is a door.** It is published default behavior, and a changed published default that every
existing consumer would see passes the test above, so it stays a door although a release could
change it again. A run records the scope it used, so a new run default changes only future runs; a layout has no record in graphty-element 2.x, and today
every layout moves every node.

**Options.** The whole graph, always; the filtered graph, always; the whole graph until static
layouts have a placement rule, then the filtered graph.

**Recommendation: the whole graph in graphty-element 2.x, and the filtered graph in the major
version that ships incremental placement and a placement rule for static layouts.** The filtered
graph is the target (`conceptual-model.md` 4.4): a force layout over the whole graph lets
filtered-out nodes pull the drawn ones, so the drawing shows structure the analyst filtered away.
But today a static layout (Circular, Shell, Spectral) has no rule for where a subset lands among
nodes that do not move, so a filtered-graph default would refuse every static layout whenever a
filter is active, and hidden nodes would reappear at stale positions when the filter is removed.
Until then only simulation layouts accept a scope, and one layout scope is carried across layout
changes, which the Layout row shows.

**Walked through in part.** 2.6.0 lays out one set while holding the rest of the graph still, so a
scoped layout ships; the default when no scope is named is still this door.

**The owner's example does not wait for this door.** The project's layout settings are model state
with their own scope, which defaults to the filtered graph for the layouts the catalog marks as
scoped (`conceptual-model.md` 4.4). That is an additive element need, not a change to what a call
naming no scope does.

**Depends on it.** `setLayout`'s `scope` option, the element's `layoutScope` property, the Layout
row, first placement.

#### 75. Where a layout run starts

**Decision.** Whether Run layout starts from the current positions or from a fresh start when the
caller does not say, and whether the layout run records which.

**Why it is a door.** It is default behavior of graphty-element's published layout call and a
field of every saved layout run; a default changed later moves every consumer's drawing.

**Options.** Current positions by default, fresh on request; fresh by default, current on request;
left to each layout engine, as today.

**Recommendation: current positions by default, a fresh start on request, and the start recorded
on the layout run.** Task 7 asks that nodes stay near their previous positions unless the analyst
asks for a fresh layout (`top-tasks.md`), because a fresh start throws away the picture the
analyst had learned (`principles.md` 6). A layout that places from nothing (Circular, Shell)
ignores the start and records that it did.

**Depends on it.** Door 17; `task-flows.md` 3.1; `element-needs.md`.

### Save, notes and recipes (build slice 7)

#### 33. Choosing the overview recipe

**Decision.** The published name of the option through which a consumer replaces the overview
recipe graphty-element runs at load. The three levels are decided (`decided-doors.md`, "The
overview recipe's three levels"): General overview shipped and run at load, a consumer's default,
and a project's own, embedded.

**Why it is a door.** It is a published element option.

**Options.** One option naming a registered recipe id; one option taking the recipe itself; both.

**Recommendation: one option naming a registered recipe id**, with the reader's default, never
saved, the only level that may be a URL, and a project's own overview embedded in its file with
its id, version and source, so opening it fetches nothing (door 19, The recipe profile and how it
binds). Every level keeps the floor. General declares no style layers (`files-and-recipes.md` 2).

**Depends on it.** `files-and-recipes.md` 2; `top-tasks.md`; `user-journeys.md` 4.

#### 1. The file's container and media type

**Decision.** What a downloaded project file physically is, and what it is called.

**Why it is a door.** Files in the wild, operating-system file associations, drag-and-drop
handlers and documentation all fix on the extension and container. A container change later
means every reader must sniff two formats forever.

**Options.**
1. One JSON document (for example `name.graphty.json`).
2. A zip archive holding a small JSON manifest, one JSON session part per graph, and the graph
   parts and numeric columns as binary members in graph-format's typed-column wire form, with
   extension `.graphty`.
3. A custom single binary file.

**Recommendation: option 2, extension `.graphty`, media type
`application/vnd.graphty.project+zip`.** Measured on a 100,000-node, 500,000-edge project, a
whole-document JSON save is 58 MB and about 290 ms of main-thread work before compression, while
the frozen graph as graph-format bytes is 18 MB in 6 ms and the state that changes during a session
is 3.6 MB in under 1 ms (`research/graphty-today.md`, the autosave follow-up). A zip keeps those
two parts separate and binary, stays openable by standard tools for anyone who wants to inspect or
repair a file, and lets the JSON parts stay human-readable. A custom binary buys nothing a zip does
not and cannot be inspected without graphty.

**Depends on it.** Download project file and Open in the graphty app; graphty-element's save and
open API; the tolerant reader; every consumer that stores projects.

#### 2. The file's top level

**Decision.** The file holds one project: a list of graph entries keyed by a persisted graph id,
each split into a **graph part** and a **session part**, plus **project-level parts**, a metadata
block and the version number. What each part holds is `element-contract.md` 11, which this door
does not restate; which objects sit on the project rather than a graph is door 5, a prerequisite of
this one. The undo history is never in the file (`conceptual-model.md` 2). The graph part carries graphty-element's reserved columns
(the stable edge id, in a column door 3 names, and `graphty.edgeOrdinal`, `graphty.edgeAmong`,
`graphty.nodeHash`, `graphty.edgeHash`, and the graph attribute `graphty.edgePairsOrdered`),
without which a reopen cannot rebind stored edge members. The stable id never takes the name
`graphty.edgeId`, because graphty-element 2.x snapshots already carry the session counter under
it.

**Why it is a door.** One graph or a list of graphs is the root of every stored reference. Moving
from one graph to a list later means every note target, set member and item address in every old
file gains a graph id it was never written with.

**Options.** One graph per file; a list of graphs; a list of graphs with a single merged session.

**Recommendation: a list of graphs, one session part per graph.** "Condition Comparison - Disease
vs Control Networks" needs two source graphs and a combined third in one project, and a consumer
with one graph never sees the list (a bare session gets an implicit one-graph project). The split
into a graph part written once and a session part written on each change is what makes autosave
affordable at 100,000 nodes (door 1).

**Positions in the session part.** Recommended: one live position (x, y, z) per node plus a pin,
saved with its depth, so a reopened graph switched back to 3D is not flat; 2D draws them flat, and
when the kept positions have no spread in the new dimension the Layout row offers a layout
(`conceptual-model.md` 5.2). A drawing kept per dimension was considered: a 2D layout is a different embedding from a 3D one, and
analysts who switch may expect each back. It is rejected for now because it adds a second position
column to every file and to every undo capture of the arrangement, and no workflow asks for it; a
saved view's stored positions keep a drawing an analyst wants to return to.

**The project object and its id.** The file's root in the API is a published project object, implicit
for a one-graph consumer (`element.project` beside `element.session`), and the file's top level holds an
element-minted **project id**, persisted and replaced by Duplicate, which keys the autosave and any
future `project=` link (door 34).

**Opening a file whose id is already held.** When a file's project id matches an autosaved project
and the content differs (an older download, a copy a colleague edited), the file opens under a newly
minted id and records the id it came from (`derivedFrom`); when the content matches, the id is
reused and the one-writer lease is taken. So a download never silently overwrites newer autosaved
work, and two copies never share one autosave.

**Data by reference.** The manifest allows a graph entry whose data part is absent and replaced by a
reference (a connected source and its query, or a file hash plus a path), so a project on a graph
too large to embed stores only its definitions and state. Recommended now, because the part list is
the manifest's shape; the profile that writes it can ship later.

**Depends on it.** Every stored reference, Version history, Replace data, the autosave, door 5.

#### 5. Project parts and graph parts

**Decision.** Where style layers, sets, notes, saved views and saved comparisons are stored when a
project holds more than one graph.

**Why it is a door.** It fixes where each sits in the file and whether a reference to it carries a
graph id. Moving per-graph copies up to the project later means deciding, for every old file, which
copies were "the same", which cannot be known.

**Options.** Everything per graph, with "Copy to graph..."; everything on the project; a split by
what each object is about.

**Recommendation: a split by what each object is about.** **Results, runs, filter steps and layout
settings per graph**, because each reads one graph; the Results panel lists every graph's results in
one place, under its graph scope. **Style layers and the Look on the
project**, as Figma's local styles belong to the file and are used on every page: "Condition
Comparison - Disease vs Control Networks" needs one encoding on both conditions, and a layer naming
a set another graph lacks paints nothing there and says so. **Sets per graph**, because a fixed
set's members and a rule's `results.<id>` paths name one graph's nodes and runs; the set id register
is project-wide, and "Copy to graph..." copies a rule set. **Notes, saved views and saved
comparisons on the project**, with a graph scope, because a note, a report page or a comparison may
span graphs ("Findings Communication" builds one report across conditions). The Styles list
shows the project's stack as it applies to the current graph.

**The reference form, due with the split.** A project-level object pointing into one graph must
say which graph: a result id is derived from algorithm, sample and frozen scope with no graph
(`src/session/runs/runId.ts`), and an Overrides entry or a note target keyed by a bare node id
would apply to every graph that shares the id. Recommended: every reference stored on the project
carries a graph qualifier (graph id plus element id or result id); **run-made layers live with
their result, per graph**; Overrides and Base style belong to each graph; result ids are unique per
graph, and the Results panel keys rows on graph plus result id; a layer whose selector names
another graph's set reads unresolvable there, and its row says how many graphs it paints.

**One stored order for the stack.** Authored layers sit on the project and run-made layers,
Overrides and Base style on each graph, but the stack is one order: it is stored as one ordered
list on the project whose entries may carry a graph qualifier, and each graph draws its own view of
that list, so dragging a run-made layer above an authored one changes one order. A style file
replaces Base style on every graph of the project, since a style file applies to the project.

**One binding form, and the background.** A layer, rule or scope bound to a result names the
result's author-level id (`as:`), in a project and a recipe alike, resolved on each graph; a
derived id is promoted to one when a layer first binds to it or a recipe is exported, and with
several candidate results the binding names the one it was made on (with door 19). Where two graphs
should share one encoding (condition comparison), their results take the same `as:` id, offered
when the same layer is first applied to a second graph; a binding by (algorithm, output field) is
rejected, because a graph can hold an exact and a sampled PageRank, or two results through Run as
new result, and the field alone cannot say which. Each graph stores its own background, defaulting
to the theme-following canvas (`element-contract.md` 15), as Figma's page color belongs to its
page; a Look never sets a background. The reference-form half (every
project-level reference carries a graph id) is decided in the reopen slice with doors 3 and 4,
because the autosave writes references from then on.

**Depends on it.** The Styles list, the Notes panel's graph scope, Views, the comparison
surface, the file's parts (`element-contract.md` 11).

#### 9. The record and the operation log

**Decision.** Which operations write a record, and one record shape for all of them. Recommended
rule: an operation writes a record when it changes data or the data's declared semantics, or
computes values: every data operation (load, Add data, Replace data, Join, Re-map, Merge nodes,
Remove, Correct), Add attribute, Declare, a run, Profile groups, a layout run, a transform, a saved
comparison and Apply recipe. The log is keyed by record id, of which a run id is one kind; undoing
an operation that has no record appends nothing. The shape:
what it read (the frozen graph reference, columns and sets with their revisions), what ran (the
operation and its version, the engine -- CPU, or WebGPU with its adapter class -- parameters, seed,
how edges were read, exact or estimated with the sample size), who and when, and freshness and
status as separate fields. Whether a run is deterministic is declared in the algorithm catalog,
never assumed. The log is append-only; undo appends an entry rather than erasing one
(`element-contract.md` 5).

**Why it is a door.** Records are kept forever and cannot be regenerated, so a field missing from
the first records is missing from every file written before it existed.

**Recommendation: as above.** It is what the methods text, Details on a run, Restore and the chain
of custody in "Reproducible Session and Network Publication" all read.

**Log wording is file content.** The entries "canceled by undo" and "restored unrun"
(`element-contract.md` 3) are stored strings; recommended as enumerated kinds with reader text
rendered from them, so a later wording change re-keys nothing.

**Depends on it.** Version history, methods export, retention, the frozen graph reference (door
10).

#### 10. The frozen graph reference

**Decision.** How a record states what graph it ran on: (graph id, data version, scope definition,
membership digest). A named set used in the scope is recorded as (set id, definition revision), so
no member list is copied; the digest covers the node ids and edge identities of the scoped
subgraph, and the set's edge reading (induced, listed or clipped) is recorded beside it
(`element-contract.md` 6).

**Why it is a door.** It is stored in every record. It also changes behavior: today every run
executes over the full graph whatever scope it records (`research/graphty-today.md` 7.7), so
honoring the scope changes the values of existing default runs.

**Recommendation: as above, with the behavior change in the same release as the new names.** A
number that silently ran on a different graph than the one it names is the most expensive error
the framework guards against (`principles.md` 1). The digest is versioned (`d1:` on the sets
branch) and is promised to reproduce after a save and reopen of a file that embeds the graph,
since the hash, ordinal and minted-id columns are written with it; that promise needs a test.
Comparing across a re-import from source or across copies of a project is a later digest version,
and a version mismatch reads as unknown, never as a change.

**Partly walked through.** 2.6.0 computes every built-in algorithm over its run's scope and
versions the scope digest as `d1:`; the record's stored form is decided with the first file.

**Depends on it.** Freshness, "on: <scope>" labels, comparison, retention.

#### 14. Published names that mislead

**Decision.** Nine renames of names graphty-element publishes, each added beside the old name
first:

| Published today | New | Why |
|---|---|---|
| `Path` (a JMESPath string) | `FieldPath` | a graph library whose `Path` type is not a graph path misleads its own docs |
| `Caveats.notes` | `Caveats.remarks` | "notes" must mean analyst notes only, before notes ship |
| `WeightMeaning` `"distance" \| "strength"` | `"distance" \| "similarity" \| "capacity"`; old files map "strength" to "similarity" | max flow reads capacity, which "strength" misstates |
| result shape `community` | `partition`, with `community` read as an alias | connected components are not communities |
| catalog `plainName` as labels; `audience: "plain"`; `category`; `OptionChoice.label` | a sentence-case `displayName`; `plainName` becomes (i) text; `audience` deprecated; `category` becomes `family` | friendly substitutes for field terms ("Bridges" for betweenness) were ruled out, and a per-audience vocabulary is a persona-specific feature |
| `Run.engine` (package versions) | `Run.versions`, plus a new `Run.accelerator` (CPU or WebGPU) | a consumer reading `engine` expects CPU or WebGPU; nothing records which accelerator ran today |
| `LayoutDescriptor.honoursWeights` | `honorsWeights` | a British published name breaks the American-spelling rule the documentation follows |
| `OptionDescriptor`'s `name`/`type` and `ChannelDescriptor`'s `channel`/`accepts` | one spelling for both, chosen by the API steward from the two, which compact-mantine's `SchemaForm` adopts structurally | two spellings of one idea publish a documentation fork, and a third (`key`/`kind`) was once proposed for the library |
| `GraphStatistics.weighted`, true when any edge weight differs from 1 | the declared weight attribute and its role, and a factual count of edges whose weight differs from 1 | a guessed "weighted" contradicts the declared role (`graph-conventions.md` 1) |

**Why it is a door.** Consumers' code calls these names; removing the old ones is a breaking
change.

**Recommendation: all nine, on the schedule in door 15.** Each one either makes the published
documentation false or collides with a word the interface needs. A `plainName` becomes (i) text
only after it is rewritten where it collides with a field term: "Bridges" and "Bridging" for
betweenness (a bridge is a cut edge), "Community strength" for modularity (strength is weighted
degree), "Reach" for closeness, "Piece" as the component group name, and "Connections" with the
unit "links" for degree ("Connections" is a node's inspector section and "link" a rejected word).
The labels use the field terms: degree, closeness, component. **Split by slice** (the queue): the
descriptor spelling and the catalog label and family names are decided in the rank slice (options)
and the color slice (channels), because those slices first draw them; `Run.accelerator` with the
records; the remaining renames with door 15's major version.

**Depends on it.** Every screen label drawn from the catalog, the weight-role row, the "Engine"
line under Details.

#### 15. When the old names are removed

**Decision.** The date of the one major version of graphty-element that removes every deprecated
name in door 14 and the 2.x names the sets release deprecated (`SavedScope`, `scope.save`).

**Why it is a door.** It is a published promise to consumers.

**Recommendation: the same major version that ships the project file (door 1), so the first
released file format is written only with the new names.** It covers `ScopeId`, `SavedScope`,
`scope.save`, `scope.list`, `scope.remove`, `selection.promote`, and, once their aliases ship, the
names `Filter`, `FilterDirection` and `SetOp`. Until then the documentation carries one two-column
table of old and new names. The owner sets the date.

**Depends on it.** Release planning; the documentation.

#### 19. The recipe profile and how it binds

**Decision.** Whether recipes and style files are profiles of the one project file (door 1) or
formats of their own; what a recipe declares about the data it needs; its identity; and how its ids
and sources are treated when it is applied.

**Why it is a door.** Communities publish recipe files, and every one depends on the part manifest,
the requirement shape and the identity. A binding shape shipped without measurement levels or
weight roles cannot be given them later without guessing for every published recipe.

**Recommendation: one container.** The `.graphty` manifest lists which parts a file holds; a recipe
is the profile with no data part; a style file is a recipe holding only style layers, palette
references and a Look, never the background or the display toggles, so a shared style never
overrides the recipient's theme; a saved view captures hidden elements and the Look
(`conceptual-model.md` 1.1 is the one list). A recipe may carry notes on its definitions (`conceptual-model.md`
6). A recipe declares one **requirement slot** per attribute it reads (element kind, measurement
level, weight role, type role, name hints) and one per catalog entry by key and version; it drops
what only its data can mean (fixed sets, notes on elements, positions, pins, Overrides, the camera)
and turns the rest into slots: **attribute**, **catalog**, **set**, **argument**, **requirement**,
**source** and **join**. Applying is one verb, `applyRecipe`, which binds by name, always asks for
weight roles, lists every mismatch, and keeps anything unbound switched off and listed.

- **Identity.** Each recipe carries a stable id, a version and an optional canonical source URL, and
  each applied-recipe record stores them, so a newer version can be offered once recipes have a
  remote source.
- **Ids on apply.** Every run specification carries an author-assigned result id (`as:`), because a
  derived id would change on other data. Applying namespaces the recipe's `as:` ids and layer ids by
  the application as `<ns>__<id>`, so two recipes, or one recipe applied twice, never collide;
  re-applying offers to revise the earlier application instead. The separator is two underscores
  because graphty-element refuses a `.` in a run or result id (`RUN_ID_PATTERN`,
  `src/session/runs/types.ts`), and a dot inside `results.<id>.<field>` would read as a path
  separator. Applying also rewrites every path the recipe's own selectors and rules write under
  `results.<id>` to the namespaced id, and the rewrite rule is part of this door.
- **Trust.** A recipe never fetches a source or runs a join before the binding step names the host it
  will contact and the analyst confirms, whether it arrived as a file or a link (door 34).
- **The overview** is door 33.

**What a binding carries** (`element-contract.md` 11.1): scale kind, palette, transform and bins,
never a pinned numeric domain; a category map only for an attribute the author declared categorical
with a named vocabulary; graph-dependent option defaults stored as "default"; and Export recipe...
promotes derived ids to author-assigned ones and reports what it dropped.

**Depends on it.** "Start from a recipe", "Reuse an analysis" and "Share a recipe" (`top-tasks.md`);
`files-and-recipes.md` 1; the binding step.

#### 21. The weight role on the attribute

**Decision.** Where the meaning of an edge weight is published.

**Why it is a door.** graphty-element publishes the meaning on the run only, as
`WeightMeaning { attribute, meaning: "distance" | "strength" }`
(`src/session/runs/types.ts:169-173`). The framework declares the role once on the attribute and
records it on every run. Recipes bind to it, so its home and values are fixed once recipes exist.

**Recommendation: a role on the edge attribute, `"distance" | "similarity" | "capacity"`, absent
while unknown, with every run still recording the role it read; a similarity may be declared
`signed: true`.** Three values, because no
catalog algorithm needs a fourth: max flow is the only capacity reader, and it treats its value as
a bound, not an affinity; graph-format already has a separate `capacity` column role, so one edge
can carry a cost and a capacity (`graph-format/src/types/columns.ts:156`). The run-level rename is
door 14; this door adds the attribute-level field. Signed similarity exists because correlation
and co-expression networks are negative by design (Hub Gene Identification, Condition Comparison).
A negative distance is allowed on a directed graph and read by Bellman-Ford or Johnson, a negative
cycle being a typed error naming it; on an undirected graph it is refused, since any negative edge
is a two-step negative cycle; capacities stay non-negative (`graph-conventions.md` 2). Taking the absolute value is allowed only as an
explicit transform the record names, because it silently merges anti-correlation into correlation
(`graph-conventions.md` 2).

**Depends on it.** Door 19; `graph-conventions.md` 1; the weight row of the import report.

#### 27. Identifier lists as rule sets

**Decision.** How a list of identifiers from outside (a gene list, known fraud accounts, a
threat-intelligence indicator list) enters a project, and which file formats are read.

**Why it is a door.** Communities publish such lists and recipes will carry them, so the stored
shape and the formats read are depended on by files other people write.

**Options.** A fixed set of matched element ids; a rule set over an identifier attribute.

**Recommendation: a rule set, `categories` leaf over a declared identifier attribute, with an
import that reads plain text (one value per line) and GMT (one named list per line) and reports
matched, unmatched and duplicate values as a Join does.** A rule binds by value, so the list
travels in a recipe without the data and re-matches after Replace data; a fixed set of ids does
neither. Create set freezes it when the analyst wants the matched members kept.

**Depends on it.** `conceptual-model.md` 4.1; `files-and-recipes.md` 1; door 19.

#### 29. The Add data source attribute

**Decision.** Whether Add data writes an attribute naming the source of every element it adds or
matches, its published name, and what it holds when several sources supply one element.

**Why it is a door.** A published attribute name written onto every element is stored in files and
read by rules and recipes. The sets design leaves `graphty.source` unwritten and ties the decision
to edge identity (`design/sets/sets-design.md` 15.3 item 20, 19), because whether two sources' edges between
one pair stay parallel or merge decides whether the value is one source or a list.

**Options.** No source attribute; one categorical value, the latest source; a cover (a list of
sources) when more than one supplies an element.

**Recommendation: write it, as a cover when several sources supply an element, decided together
with door 3.** Intelligence and knowledge-graph analysts need to know which systems attested an
entity (Criminal Network Analysis, Knowledge Graph Construction); a single value overwritten by the
latest source loses that.

**Depends on it.** Door 3; `conceptual-model.md` 3.2.

#### 38. Structure fields in the project file

**Decision.** The names and shapes of the session-part fields the information architecture needs
stored (the list is in `element-contract.md` 11): among them the order of the saved views, each
view's note order, item attributes, group columns, the start nodes of a neighborhood or path
step, a filter step over items, per-run direction and weight overrides, the No value look, the
Base style and Overrides rows, the project's overview recipe and the applied recipes.

**Why it is a door.** Each field is added under the version number and tolerant reader, so adding
it later is additive. What is one-way is its name and meaning once files carry it. The view order
matters most: it is the report's page order, so a reader that dropped or reinterpreted it would
reorder every saved report.

**Options.** Store the view order as the order of the views array; store an explicit position per
view; derive it from creation time, with no hand order.

**Recommendation: the order of the views array.** It needs no second field that could disagree
with the array, it survives a tolerant reader, and a reorder is one undoable write of the array.
Creation order alone is rejected because "Findings Communication" reorders its pages. Name the
other fields with `glossary.md`'s preferred terms when the element adds them.

**Depends on it.** `element-contract.md` 11 and 13; `information-architecture.md` 3;
`interface-specification.md` (the Graph panel's Views section).

#### 61. Caveats and missing values in exports

**Decision.** How a data export (CSV, JSON, GraphML) carries a value's caveat (estimated, not
converged) and a missing value's reason ("outside scope", "no value"), and how a missing value is
told apart from a stored empty string.

**Why it is a door.** A data format consumed outside graphty: an R or Python script that reads a
caveat column breaks when the column is renamed.

**Options.** (1) Caveats and reasons only in the methods text; cells hold bare values. (2) Sibling
columns per measure, `<column>__estimated` (boolean) and `<column>__missing` (the reason word),
present only when some row needs them; a missing value written as an empty CSV cell, JSON `null`,
and an absent GraphML `<data>`; a stored empty string written as `""` in CSV and JSON; the
`__missing` column is the authority where a cell could be either. (3) One long-format caveats
table beside the data, keyed by element id and column.

**Recommendation: option 2.** Option 1 loses the per-value caveat principle 1 requires; option 3
makes every consumer join two files to read one value. Every export also writes each result's
method, exact or approximated with its sampling parameters, beside its freshness in the methods
text, because a sampled value cannot be reproduced without them (`state-matrix.md` 4.7). The double underscore keeps the suffix from
colliding with an attribute's own name.

**Depends on it.** `content-design.md` 5; the export writers in graphty-element.

#### 34. A shareable URL

**Decision.** Whether graphty publishes URLs that open something, and what they may carry.

**Why it is a door.** A URL that people paste into papers and chat must keep working, so its
grammar is a published contract.

**Options.** None; a data source and a recipe; also a place, a selection or a view; parameters reserved now.

**Recommendation: `?data=<url>&recipe=<url>`, and a reader ignores keys it does not know.** Read
once at startup and passed to the element's load. Together they share a starting point without its
data; a style file is a recipe holding only styles. The unknown-keys rule is what makes every later
key additive (`view=` for a saved view, `project=` once project ids are published), so nothing is
reserved now. A selection is never in the URL: node ids break when the data reloads, a selection
can hold a million ids, and Back would become an undo of selection competing with Ctrl+Z. Back and
Forward never step through selections, places, panels or modes. Other grammars (a `mode` parameter, a hash route) are rejected in
`research/archive/one-way-doors-long-form.md` 34.

A recipe that arrives by link follows door 19's trust rule: it fetches nothing before the binding
step names the host and the analyst confirms.

**Depends on it.** `information-architecture.md` 6; `implementation-mapping.md` 4;
`element-contract.md` 15.

### The modes (build slice 8)

#### 28. Refreshing sources and data versions

**Decision.** What a data source that refreshes often (a SIEM or transaction feed) does to the data
version chain and the undo history.

**Why it is a door.** Data versions and their records are stored in the file (door 2); if every
refresh is an Add data, an active incident floods both.

**Options.** One data version per refresh the analyst accepts, with automatic refreshes merged into
one step; refreshes outside the undo history, with one version per accepted batch; refreshing
sources out of scope.

**Recommendation: one data version per accepted batch, outside the undo history**, with the
element's bounded history (`element-contract.md` 8) squashing batches no kept run, position,
comparison or reference needs, so an active incident neither floods undo nor grows the file
without limit.

**Depends on it.** `conceptual-model.md` 3.2; the cybersecurity workflows (Threat Hunting).

### Stored values and history (build slices 3 and 4a)

#### 93. Stored result precision

**Decision.** The numeric type the project file stores metric attributes and stored positions in.

**Why it is a door.** A value saved at a narrower type cannot be widened later: no later file
version can recover digits the first one dropped, so every file saved before a change keeps the
lost precision for good.

**Options.** float32 for both; float64 for metric attributes and float32 for positions; float64 for
both.

**Recommendation: float64 for metric attributes, float32 for stored positions.** A metric value is
evidence that is ranked, compared across runs and quoted in notes; float32 keeps about seven
significant digits, which ties close PageRank values and shifts a rank. A position is a drawing,
where float32 is far finer than a pixel. The cost is size: at a million nodes a float64 column is
8 MB against 4 MB, which content addressing writes once (door 88). `content-design.md` 5 formats
numbers from the stored value, so it follows this door.

**Depends on it.** `element-contract.md` 11; `content-design.md` 5; door 88.

#### 94. What values the file retains

**Decision.** Which computed values a project file keeps: records always, and values for which runs.

**Why it is a door.** It decides what a file contains. A file that dropped values cannot restore
them without re-running, which a changed source may make impossible (Cannot re-run).

**Options.** Every run's values; values while something holds them (a layer, a note's quote, a
saved view, a comparison, the current run), else only the record; records only.

**Recommendation: records forever, values while something holds them**, with "Values not kept" as
the state of a run whose values were dropped and Restore as its verb (`glossary.md` 10). Keeping
every value would grow a file with every sweep; keeping none would make every reopen a re-run.

**Depends on it.** `conceptual-model.md` 2; door 9; door 93.

#### 95. Project checkpoints across sessions

**Decision.** Whether the autosave keeps checkpoints: whole-project snapshots, one per session or
per stated interval, listed in Version history, opened read-only and restorable as the newest
state, as Figma's autosaved versions are.

**Why it is a door.** It fixes a part of the autosave's envelope and of the file's history. Nothing
ever asks "are you sure?" in graphty, and undo history is not saved, so without checkpoints a note,
style layer, saved view or filter step deleted in one sitting is gone once the tab closes.

**Options.** No checkpoints; checkpoints in the autosave only; checkpoints in the autosave and in
the downloaded file.

**Recommendation: checkpoints in the autosave only**, one per session and one before any command
that replaces many definitions (Replace style stack with style file..., Apply recipe), kept for a
stated count, content-addressed so an unchanged part costs nothing (door 88). The envelope reserves
their place in the reopen slice; the feature may ship later. The downloaded file stays one state,
because a shared file carrying its author's history would leak work the author deleted. Until it
ships, `interaction-patterns.md` 3.4 states that a deletion is recoverable only within its session.

**Depends on it.** Door 88; `interaction-patterns.md` 3.4; `element-needs.md`, "Project
checkpoints".

## Sources

- `research/archive/one-way-doors-long-form.md`, the full earlier text of every door
- `conceptual-model.md`; `element-contract.md`; `element-needs.md`; `implementation-mapping.md` 9
- graphty-element on master: `CHANGELOG.md` (2.6.0), `src/catalog/types.ts`, `src/session/runs/runId.ts`,
  `src/session/styles/encoding.ts`, `src/session/styles/palettes.ts`, `src/session/limits.ts`
- `design/sets/sets-design.md` 15.3 (on master); `research/graphty-today.md`; `research/figma.md` 2.10
