# graphty document formats

Status: draft specification. Nothing here is released except the style document's version 1
shape, which graphty-element already publishes. Every choice that would be expensive to reverse
once files exist in the wild is listed under "Open decisions" near the end of this page, with a
recommendation, and is not decided by this text. Objections raised in review and not taken are
listed under "Review record" at the end, each with its reason.

graphty-element reads and writes graph data in the formats the rest of the ecosystem already uses
(GEXF, GraphML, GML, DOT, Pajek, CSV, JSON dialects, Neo4j exports), through the graph-io package.
Those formats carry a graph. They do not carry what a person did with a graph in graphty: how it
is drawn, which columns mean what, which analyses were run in which order and with which exact
settings, where the camera was, or the notes a reader wrote. This directory specifies graphty's
own documents for those things.

The owner stated the requirement on 2026-09-19:

> our API needs to account for file handling:
>
> - loading data, which may be in many formats based on the pre-existing ecosystem of graph formats
> - styles, where graph styles can be saved and loaded independently to apply an existing style to new data
> - analysis, which runs a set of analysis functions on a graph so that new graphs can benefit from complex orders of operations to understand them more quickly -- great for domain specific work
> - annotations, which are notes that are independent from the data so that the data can remain immutable
> - maybe camera views?
> - or one file that combines any of the above

and restated it on 2026-09-27 as "types of exports and imports: recipies, styles, data,
annotations / notes, or combinations of all of the above", adding that a style or a recipe, or
both in one file, "enables communities to share starting points without sharing their data".
Every date in this directory is the UTC date of the statement's timestamp in the session archive
(see "Sources").

## The documents

| Document    | `kind`                | Specification                    | Schema                                             | Holds                                                                                                                                                                                                                                          |
| ----------- | --------------------- | -------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Style       | `graphty-style`       | [style.md](style.md)             | [style.schema.json](style.schema.json)             | Style layers: selectors, literal channel values and data-driven encodings, plus any palettes they need                                                                                                                                         |
| Data plan   | `graphty-data-plan`   | [data-plan.md](data-plan.md)     | [data-plan.schema.json](data-plan.schema.json)     | Which columns are the node id, edge ends, label, weight, time; how repeated edges and ids are treated; what each attribute measures; which attribute tables join onto the nodes                                                                |
| View        | `graphty-view`        | [view-preset.md](view-preset.md) | [view-preset.schema.json](view-preset.schema.json) | Named camera views: drawing mode plus a stored camera or a computed framing                                                                                                                                                                    |
| Recipe      | `graphty-recipe`      | [recipe.md](recipe.md)           | [recipe.schema.json](recipe.schema.json)           | An ordered list of analysis and layout steps, the attributes, arguments and extensions it needs, and (once applied) how it was bound                                                                                                           |
| Annotations | `graphty-annotations` | [annotations.md](annotations.md) | [annotations.schema.json](annotations.schema.json) | Notes on nodes, edges, groups, points, the graph, runs and style layers                                                                                                                                                                        |
| Envelope    | `graphty-document`    | [envelope.md](envelope.md)       | [envelope.schema.json](envelope.schema.json)       | Any subset of the five above (up to 16 recipes), plus the data itself or a reference to it, where the data came from, the record of every import, run and layout, kept sets, positions, the active filter, stored results and per-group tables |

How each maps onto the third-party formats graph-io writes, and how Cytoscape styles map in, is
[export-mapping.md](export-mapping.md).

### Why each is its own document

Each has a different lifetime and a different owner. This is the reasoning of the element API
design (`design/element-api/element-api-design.md`, section 4.6.3, "StyleTemplate splits five
ways"), which this specification keeps:

- **A style** outlives the dataset it was drawn for. Its purpose is to be applied to the next
  dataset: "the same diverging logFC colouring on a new gene list"
  (`design/designloom/workflows/W20.yaml`, Gene List to Interaction Network with Expression
  Overlay). Its owner is whoever designed the look -- often a lab or a publication.
- **A data plan** belongs to a data source. It says how to read one kind of file (which column is
  the id, what the weight means) and is reused every time a file of that shape arrives.
- **A view** belongs to a presentation. Camera positions are meaningful only for a particular
  layout, so a stored camera is short-lived; a computed framing ("from above, fitted to the
  graph") travels.
- **A recipe** is a domain expert's order of operations, replayed against a graph nobody has
  analysed yet. It starts algorithm runs and layouts, so it is the one document whose application
  must be agreed to. (Applying a style also costs work -- every selector is evaluated -- which is
  bounded rather than agreed to; see "Trust".)
- **Annotations** belong to a reader. They record a judgement about the graph without editing the
  graph, so the data stays immutable (the owner's reason, 2026-09-19).

Bundling them is the defect the split removes. The 1.x style template
(`graphty-element/src/config/StyleTemplate.ts`) holds appearance, column roles, load-time
algorithm runs, the view mode and a skybox image in one object, so importing "a style" could
rewrite column roles and spend compute. None of the five documents here can do the work of
another: a style cannot start a run, a data plan cannot start a run, a view cannot change data.

The design studio framework (`design/ui/framework/conceptual-model.md` section 8, present in the
main checkout but not yet committed) models the same needs differently. Its one-way decisions are
numbered "doors" in `design/ui/framework/one-way-doors.md`; this specification cites them by
number and restates, where it cites one, the rule it takes from it, so a reader without those
files loses nothing. The framework has one file format with optional parts, where a recipe is "a
project file with no data" and a style file is "a recipe holding only style parts". This
specification reconciles the two: the envelope is the one format, each of the five documents is
also a valid envelope member on its own, and a file holding one member is exactly the "profile"
the framework describes. What the framework's recipe carries that is not analysis (style layers,
views) travels here as a sibling member of the same envelope rather than inside the recipe.
Whether a style file is a sibling document or a recipe sub-profile is listed under "Open
decisions".

## Conventions every document follows

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY and
OPTIONAL are to be interpreted as described in RFC 2119 and RFC 8174 when, and only when, they
appear in all capitals.

A **writer** is software that produces a document; a **reader** is software that parses one; an
**applier** is a reader that changes a live graph session from it. graphty-element is all three
for every kind. A **unit** is the smallest independently applicable part of a document: a style
layer, one channel entry of a layer's `set` or `encode`, a recipe step, an attribute or argument
slot, an extension requirement, a view, a note, a data-plan attribute declaration or join.

### Which text is normative

1. The prose of each specification is normative for behaviour: what a reader does with any input,
   conforming or not.
2. The JSON Schema file beside it (JSON Schema draft 2020-12) is normative for what a conforming
   **writer** produces. It is not a reader's accept-or-refuse test: a reader applies it per unit,
   and a unit that fails it is handled as the prose says (usually disabled or skipped and kept),
   never by refusing the document, except where the prose says a top-level failure refuses.
3. Writers and continuous-integration checks SHOULD also validate against a strict lint profile:
   the same schemas with `unevaluatedProperties: false` on every object except `extensions`,
   `userData`, `params`, `options` and quoted values. The strict profile turns a misspelt member
   (`"sed": 7` for `"seed": 7`) into an error before the file is shared. What JSON Schema cannot
   express -- unique ids and `as` values within a list, SPDX syntax of `license`, the per-note
   digest -- is checked by a published validator function beside the strict profile. Publishing
   both is part of open decision 3.
4. Definitions every schema shares -- field paths, expressions, digests, the stable edge reference,
   the attribute slot and the shared metadata -- are in [common.schema.json](common.schema.json).
5. TypeScript declarations in the prose are illustrative and MUST agree with the schema; where they
   disagree, that is a defect in this specification.

### Encoding and limits

1. A document MUST be a single JSON text (RFC 8259) encoded as UTF-8 without a byte order mark,
   and SHOULD conform to I-JSON (RFC 7493): no duplicate member names, numbers representable as
   IEEE 754 binary64.
2. The top-level value MUST be an object with a string member `kind` and an integer member
   `version`. One exception, forever: an object with `version: 1`, an array `layers` and no `kind`
   is a style document version 1, because graphty-element 2.x writes that shape. A reader MUST
   dispatch on `kind` (or on that exception), never on the file name. A `kind` the reader does not
   know refuses the document with `E_UNKNOWN_KIND`, naming the kind and the kinds it reads.
3. A document MAY carry `$schema`, a URL naming its schema. A reader MUST NOT fetch it and MUST NOT
   make validity depend on it; it exists for editors.
4. Plain ASCII is RECOMMENDED for member names. Values may hold any Unicode text.
5. **Limits.** A reader MUST enforce these before keeping any unit, and refuse the whole document
   with `E_TOO_LARGE`, naming the limit, when one is exceeded. A caller MAY raise them.
    - total size: 64 MB for a JSON document;
    - nesting depth: 64 levels, checked during or immediately after parsing. A document nested
      deeper can be parsed but never written back (the platform's serializers overflow their stack
      on it), so keeping it would make every later save of the session fail;
    - member names `__proto__`, `constructor` and `prototype` at any depth: the document is refused.
      The same three strings are refused wherever a string value becomes a property key -- a column
      key, a `rename` target, a derived attribute's name, a join's `columns`, a slot name, a segment
      of a selector path -- and that unit is disabled with `E_BAD_COMMAND`. Readers MUST hold
      document objects and attribute bags in null-prototype objects or maps, or read them with
      `Object.hasOwn`, so that no merge, preservation or copy step writes into a shared prototype and
      no inherited member (`data.constructor`) answers as data;
    - an expression (a selector `where`, a `has`, `top` or `by` path, a recipe `where`): at most
      1024 characters and 32 levels of nesting, checked before the parser recurses; a longer one
      disables its unit with `E_BAD_SELECTOR`;
    - per document: 1,000 layers, 100 palettes of at most 256 colours, 100,000 ids in one `ids`
      selector, 16 recipes in an envelope and 1,000 recipe steps across them, 1,000 views, 100,000
      notes, 100 handling markings of at most 1 KB each, and 64 KB per free-text string.
      Beyond a count, the extra units are refused and reported, not silently dropped; the rest of
      the document applies;
    - data: the node and edge counts graphty-element publishes as its ceilings
      (`DEFAULT_LIMITS.renderCeiling` and `edgesDrawn`, `graphty-element/src/session/limits.ts`:
      50,000 nodes and 100,000 edges today), raisable by the caller, counted while parsing
      (envelope.md, "Options"); and attribute cells, because a data plan can multiply a small input:
      1,000 columns per element kind, 50,000,000 attribute cells in all, and 10,000 items in one
      list cell (RECOMMENDED values), checked before a join is materialised (matched nodes times
      columns). A join whose `on` column is not unique is refused unless the caller allows it.
6. Any exception raised while applying one unit -- typed or not, including a stack overflow in a
   parser -- MUST be caught and converted into that unit's disabled entry with `E_BAD_COMMAND`. It
   MUST NOT abort the rest of the document.

### Paths

Several documents name a field of a record: a selector path, a data-plan field, a recipe slot's
attribute name, an export column. One model applies everywhere, and it is the one graphty-element
2.x already implements (the grammar is open decision 31, because it is published with style
version 1):

1. **A column key is flat.** An attribute is stored under the key it arrived with, dots included,
   and nested objects are not walked. `data.adj.P.Val` reads the column `adj.P.Val`;
   `results.louvain.group` reads the field `group` of run `louvain` (the run id ends at the first
   dot after `results.`, and a result field name contains no dot). The element's selector parser
   says so: "the segments are joined back into a dotted string, because that string IS the column
   key" (`parsePath` in `graphty-element/src/session/styles/predicate.ts`).
2. **Selectors and recipe predicates** are expressions in the element's own JMESPath dialect over
   the root `{ data: {...}, results: { <runId>: {...} } }`. A segment that is not an identifier
   `[A-Za-z_][A-Za-z0-9_]*` (a hyphen, a leading digit) is quoted, `data."min-cut".partition`,
   which is still the flat key `min-cut.partition`; an unquoted hyphen is arithmetic. A quoted
   segment MUST NOT contain a dot: 2.x refuses it with `E_BAD_SELECTOR` ("would be
   indistinguishable from two names"). A `has` or `top` path and a binding's `by` are the same
   paths, read as a key after the `data.` or `results.<run>.` prefix
   (`graphty-element/src/session/styles/sources.ts`).
3. **Data-plan `knownFields` values, attribute declaration `name`s, join keys and slot names are
   column keys**, written as the column is named, never as an expression: `"combined.score"`,
   `"#node1"`; a column whose header is empty has the key `""`, which a join `key` may name (R's
   `write.csv` writes its row names that way). graphty-element today reads `nodeIdPath` and the edge
   ends through a JMESPath
   search (a nested walk) and `edgeWeightPath` as a raw key (`resolveEdgeWeight`,
   `graphty-element/src/data/ingest.ts`). Conformance requires the raw-key reading for every
   member; that is an element change. A nested JSON record is flattened by its graph-io importer,
   whose flattened keys are the column keys.
4. A writer prints a path it has rewritten (recipe namespacing, slot binding) with the element's
   `quotePath` rule: a segment that is not an identifier is quoted.

### Versioning

`version` is the major version of that document kind. Every kind starts at 1.

1. Within a major version, a change MUST be additive: a new optional member, a new value of an
   open enumeration, a new unit kind. Removing or renaming a member, or changing what an existing
   value means, requires a new major version.
2. **The style document's version 1 is frozen to the values graphty-element 2.x accepts.** 2.x is
   released and its reader refuses the whole document for one unknown channel, selector kind,
   scale or layer kind, **and for one value outside an enumerated channel's list** -- a node shape,
   a line pattern or an arrow it does not draw (`applyTemplate` throws on the first layer
   `checkLayerSpec` refuses; `checkEnum` answers `E_OPTION_RANGE`). The value lists of `node.shape`,
   `edge.style`, `edge.arrowHead` and `edge.arrowTail` are therefore frozen with version 1 too, and
   style.schema.json holds them as enumerations. It
   checks values, not member names, so a new optional member is still additive for it. A style
   that uses a channel, selector kind, scale, layer kind or enumerated value 2.x does not know MUST
   therefore be
   written as style version 2, which 2.x refuses with a version message rather than a confusing
   layer error. 2.x also ignores `features` (rule 7), so for the style kind **any addition whose
   omission would change what is painted -- a selector that negates, a new selector member that
   narrows a match -- MUST be written as style version 2**, never as an optional member of version
   1; `features` protects only readers newer than 2.x. And 2.x is a released writer: its
   `toDocument()` writes back only `version`, `layers` and `palettes`, and of each layer only the
   members `buildLayer` copies (`name`, `kind`, `source`, `enabled`, `target`, `selector`, `set`,
   `encode`, `userData`), so a version 1 style re-saved by 2.x loses `kind`, layer `id`s,
   `extensions`, `requires` and the shared metadata (`license`, `derivedFrom`, `handling`)
   without a report (style.md, "Purpose"). **One named exception:** a style's attribute slots
   (`requires`) are a version 1 member although 2.x ignores them, because a slot that does not bind
   on 2.x degrades to a layer added disabled and reported as unbound, never to different paint;
   a writer MUST warn when it saves a slotted style as version 1 (style.md, "Attribute slots").
   For the other kinds, which no released reader reads, rule 1 applies as written, except the data
   plan (rule 8).
3. A reader MUST accept every major version it implements. graphty-element SHOULD read the current
   major and the one before it, upgrading the older one on read with a function per kind, so a
   file never has to be converted by hand (the pattern of kepler.gl's schema manager; Vega-Lite 5
   likewise kept compiling syntax its schema had dropped). **Style version 1 is read forever**,
   because 2.x wrote it without a `kind`: every later reader MUST read it (upgrading on read), and
   graphty-element SHOULD also ship an offline converter. **Catalogue names across element
   majors.** Because keys, option names and result field names are promised stable only within a
   major version of graphty-element (rules 4 and 5 of "Identifiers"), a conforming writer MUST
   write `generator` on every document, and the upgrade on read is keyed on the writer's element
   major as well as on the document version: a retired name stays an alias for at least the
   following element major, and a later release upgrades a document written by an older major
   (the 2.0 rename of `community` to `group` is the precedent).
4. A reader given a major version it does not implement MUST refuse that document (or that
   envelope member) with `E_UNSUPPORTED_VERSION` and details `{ kind, found, reads }` (open
   decision 4). It MUST NOT guess, and MUST NOT return an empty result as if the document were
   empty.
5. A writer MUST keep the version it read when the document was not edited, or was edited only
   in ways that version can express, so opening and re-saving a file never locks out a colleague
   on the previous release. "Can express" is tested by the kind's downgrade function: a release
   ships one per kind, for the one previous major it reads, and writes that major exactly when the
   downgrade loses nothing. Otherwise it writes its current major. A new document is written in
   the lowest major that can express it, among the ones the release writes.
6. The version of each kind is independent. A style at version 2 inside an envelope at version 1 is
   valid.
7. **Must-understand features.** A document and every unit (a style layer, a recipe step, a view,
   a note, a kept set, an attribute or argument slot, a data-plan declaration or join) MAY carry
   `features`, an array of feature names it cannot be read correctly without; the member is
   declared once in `common.schema.json` and referenced by every unit schema. Version 1 of every
   kind defines no feature names; later minor additions whose silent omission would change a
   result (a recipe step type that filters, a graph id on a note target) are given one, and writers
   MUST list the ones they use. **Any new member that holds a field path or a run reference MUST
   have a feature name**, because an old reader keeps it verbatim but cannot rewrite it when it
   binds slots or namespaces runs, and would save a document that names one thing two ways. A
   reader that does not know a listed feature MUST refuse the unit that lists it (or the document,
   when listed at the top level) with `E_UNSUPPORTED_FEATURE`, naming it; a refused recipe step
   also skips every later step (recipe.md, "Steps" rule 7). This is the answer to an
   old reader that would otherwise ignore a new member and paint, run or bind the opposite of what
   the author meant; compare the JWS `crit` header. It does not protect the style reader 2.x
   (rule 2).
8. **The data plan cannot grow silently where it decides the graph.** Every addition to
   `knownFields`, and every top-level addition that changes how records are read (which rows,
   which ids, which columns), MUST come with a feature name that writers list. An unknown member
   there with no unknown feature listed is therefore a misspelling and refuses the plan with
   `E_BAD_COMMAND` and the nearest known name; an unknown member accompanied by an unknown feature
   refuses it with `E_UNSUPPORTED_FEATURE`, which tells the reader's user to upgrade (data-plan.md,
   "Applying" rule 5). A purely descriptive addition must not lock a colleague out, so the data
   plan's set of descriptive top-level members (the shared metadata, `name`, `description`,
   `sourceVersion`) is frozen for its version 1: a later minor adds descriptive content only under
   `extensions` (a `graphty.*` name for graphty's own), which every reader ignores and keeps, and
   adds top-level members only when they change how records are read, with a feature name.

Enumerations are open or closed. An **open** enumeration may grow within a major version, and a
reader that meets an unknown value disables the smallest unit holding it and reports it. A
**closed** enumeration only changes with a major version.

| Kind             | Open (may grow)                                                                                                                                                                                                                          | Closed                                                                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Style            | selector `match`, `scale`, channel names, layer `kind` and the value lists of `node.shape`, `edge.style`, `edge.arrowHead`, `edge.arrowTail` (all frozen for version 1, see rule 2); layer `source.by`, palette `kind`, `colorblindSafe` | `target`, binding `overflow`, style `scope`                                                                                                                                        |
| Data plan        | attribute `role`, `type`, `level`, `weightRole`, `derive.transform`, `origin.caveat`, date `format`                                                                                                                                      | `repeatedEdges`, `repeatedNodes`, `idCoercion`, `directed`, `missingEndpoints`, join `match`, join `onDuplicate`, constraint `onViolation`, attribute `element`, `types[].element` |
| View             | camera `projection`, view `mode`, framing `fit` scope kinds, export `legend.placement`                                                                                                                                                   | `prefer`                                                                                                                                                                           |
| Recipe           | step `op`, scope kinds, argument `type`, extension requirement `kind`, slot `level` and `weightRole`, `layout.set` `start`                                                                                                               | `layout.set` `dimension`, `application.bindings.by`                                                                                                                                |
| Annotations      | note target kinds, note `status`, note `confidence`                                                                                                                                                                                      | `binding`                                                                                                                                                                          |
| Envelope records | run `outcome.precision`, `scope.componentScope`, stored result `format`                                                                                                                                                                  | `positions.dimension`                                                                                                                                                              |

The units the rules above disable or skip are those of "Conventions" plus a palette and, in an
envelope, each record of `runs`, `imports`, `results`, `tables` and `positions`, and each kept
set: validated one at a time, kept verbatim when invalid, and always written back.

`level` and `weightRole` are open so that a new measurement level or weight meaning does not force
new major versions of the data plan, the recipe and the style at once: an unknown value makes the
declaration ignored, or the slot unbound, with a report, and a weight slot whose role the reader
cannot compare is never run without the caller's confirmation (recipe.md, "Weights"). The report
types spell such fields as a string union widened with `(string & {})`. A closed enumeration's
unknown value refuses the data plan (data-plan.md); in every other kind it can only arrive in a
document of a newer major version, which the reader has already refused.

### Unknown members, values and units

This is the tolerant-reader rule, as nbformat states it for notebooks: new fields "won't break
existing implementations -- they simply won't be rendered". Rule 7 of "Versioning" is its
safety valve for members that must not be ignored.

1. A reader MUST ignore an object member it does not know, at any depth, and MUST NOT fail
   because of one. It MUST list each one in the binding report as a warning,
   `W_UNKNOWN_MEMBER`, with its JSON pointer (`/layers/0/colour`), so a misspelling is seen. When
   the document's `generator` is newer than the reader, the warning names it, so a member from a
   newer release is told apart from a typo. Exceptions, which are **closed** and grow only with a
   feature name or a new major version: the data plan's top level and `knownFields` ("Versioning"
   rule 8); the members of a recipe step's `command` outside `params` and `defaults`, closed per
   `op` (recipe.md, "Steps" rule 9), because `seed`, `exact`, `precision`, `sample` and `scope`
   decide the number a step produces; the alternatives of a note target, a recipe scope and a
   `$argument`, `$attribute` or `$result` reference, because a member added there changes what the
   unit binds to; and a data-plan declaration's `constraints`, because `onViolation` decides
   whether an import passes. A unit with an unknown member in one of these places is disabled with
   its reason.
2. An applier MUST keep, for each unit, the unknown members and `extensions` it arrived with, on
   the live unit, and every writer -- including one writing from live session state
   (`toDocument()`, `saveDocument()`, the autosave) -- MUST write them back unchanged. A document
   re-saved without being applied keeps every unknown member at every depth. When the reader
   edits a unit that holds unknown members, it cannot know whether they describe the members it
   changed (a newer `legend.title` naming the column the binding used to read), so it writes them
   back and reports each with `W_UNKNOWN_MEMBER_STALE` on the save that follows the edit.
3. An unknown value of an open enumeration, or a unit of a kind the reader does not know, MUST
   disable or skip the smallest unit holding it with a reported reason. It MUST NOT fail the
   document or the envelope.
4. A missing optional member takes the default its specification states. No default depends on
   the data or the page.
5. Validation is applied per unit. A unit that fails its schema is kept verbatim, disabled or
   skipped with a reason, and written back verbatim on the next save; it is never dropped. Only a
   failure of the document's own top level (not an object, a missing `kind` or `version`, the unit
   list not an array) refuses the document.

### Identifiers

1. Every unit that another part of a document, or a later edit, may refer to carries an `id`:
   recipe steps, views, notes and (optionally, see style.md) style layers. An `id` MUST be unique
   within its list and SHOULD be stable across re-saves. Adding ids later is what nbformat had to
   retrofit in format 4.5; these documents have them from the first version.
2. A run id that a document persists MUST be author-assigned (the `as` of a run), never derived,
   and MUST match graphty-element's `RUN_ID_PATTERN`, `^[a-z][a-z0-9_-]*$`
   (`graphty-element/src/session/runs/types.ts`). A derived id is a function of the algorithm and
   the scope, so it resolves differently against a different session
   (`graphty-element/src/session/runs/runId.ts`). A recipe's `as` additionally MUST NOT contain
   `__`, which is reserved for the namespace separator (recipe.md). A run started without `as`
   (from a panel, by hand) has a derived id; when anything that names it is saved or exported -- a
   style layer, a note, a set framing, a result column of a data export -- the writer MUST give
   that run an author-assigned alias first, record the alias on the session's run, and rewrite
   every reference to the derived id. The alias is graphty-element's `algorithmSlug(key)`
   (`graphty-element/src/session/runs/runId.ts`, which derived ids already use, so a plugin key
   such as `org.example:motif-census` is sanitised the same way everywhere) with every `-`
   replaced by `_` and runs of `_` collapsed to one, then `_2`, `_3` for later runs:
   `pagerank`, `pagerank_2`, `label_propagation`, `org_example_motif_census`. Every such name
   survives R's `make.names` and pandas unchanged. `journal.export()`, the 1.x template upgrade
   and a recipe writer mint `as` values by the same rule. Nothing is refused or left out of a save
   because a run was unnamed. graphty-element documents `E_UNSTABLE_RUN_ID` today as "a document
   being serialised refers to a run whose id was derived ... the caller re-runs with an explicit
   `as:` id" (`graphty-element/src/errors/codes.ts`); this specification changes that published
   meaning -- a save no longer refuses, and the code is reported only for a recipe step without
   `as` -- which is part of open decision 4.
3. Keys naming an extension (palette id, algorithm key, layout id, camera id, format id) are the
   keys the element's catalogue publishes. A document naming a key this installation has not
   registered keeps it and reports it unresolved, naming the key.
4. **Catalogue keys are stable.** A key any document may name is never removed or renamed within a
   major version of graphty-element. A retired key stays as an alias that resolves, with the
   parameters it implies, and the binding report names the current key (graphty-element already
   keeps the 1.10 keys this way: `scc` resolves to `components` with `{ strength: "strong" }`,
   `dijkstra` to `shortest-path`). Writers MUST write the current key. A semantic layout id
   (`force`) may change engine in a minor release, so a writer records the resolved engine in the
   layout record (envelope.md, "Run records").
5. **Option and field names are stable too.** Within a major version of graphty-element, an
   algorithm or layout option name, the value domain it accepts, a format's import option name and
   a result field name are never removed or renamed, and a retired name stays as an alias that
   resolves. Result field names appear in style paths, note quotes and export columns; the 2.0
   rename of `community` to `group` is the kind of change this forbids within a major version. The
   published catalogue (open decision 3) states this promise per name.

### Extension data and shared metadata

1. A document and every unit MAY carry `extensions`, an object whose member names are
   reverse-domain names (`org.example.tool`). The name `graphty` and names starting `graphty.` are
   reserved for graphty-element. Readers MUST NOT interpret an extension they do not know and MUST
   preserve it under the unknown-members rule. The same name pattern applies to every
   `extensions` object, at any level. A `graphty` or `graphty.*` extension that arrives in a
   document is data from that document, never trusted state: graphty-element re-derives what it
   records there (an import stamp, a result origin) and keeps the incoming value only as the
   document's claim.
2. The existing `userData` members of style layers and notes are kept; they round-trip untouched
   and are never interpreted by graphty-element.
3. Every document and the envelope MAY carry the same descriptive metadata, so a starting point, a
   style or a project can be cited and licensed on its own:
    - `authors`: `[{ name, url?, orcid? }]`; `url` MUST be an `https:` URL. **For every URL-valued
      member of every kind** -- `authors[].url`, `source`, `derivedFrom.source`, `dataSource.url`,
      `provenance.url`, and a `doi` rendered as `https://doi.org/<doi>` -- a renderer MUST NOT make a
      link of any scheme other than `https:`, whether or not the member passed its schema (a reader
      keeps a failing unit verbatim and may still show it). A `term` IRI is an identifier and is
      never rendered as a link;
    - `license`: an SPDX licence expression (checked by the strict profile's validator);
    - `citation`: free text, and `doi` when there is one;
    - `derivedFrom`: `{ kind, id?, version?, digest?, authors?, license?, source?, doi? }`, the
      document this one was adapted from, with the original's authors, licence, canonical `https:`
      source and DOI copied from it when adapting. A writer that saves a document adapted from one
      it applied MUST write it, because licences such as CC-BY require naming the creator, the
      source and the licence, and a reader without the original must still see them;
    - `handling`: a list of `{ marking: string, note? }`, handling or sensitivity markings such as
      "do not forward" (a single object is read as a list of one). The marking vocabulary is open,
      so markings have no order and none is "most restrictive". graphty-element keeps each marking
      **with the units that arrived with it** -- the layers, notes, records and data of that
      document -- and every writer -- a save, a notes file, an export sidecar, a data export, an
      image -- writes every marking of every unit its output contains (a data export contains the
      data and whatever appearance and results it bakes). An export writes them to the format's
      graph-level attributes as `graphty.handling` where it has them, and reports
      `W_GRAPHTY_HANDLING` where it does not (export-mapping.md, including images). An applier shows
      them before any re-save or export. A caller MAY remove a marking; the removal is reported and
      recorded in the next save's report. At most 100 markings, each note at most 1 KB, are kept.
      **Precedence.** A member's own metadata describes that member; the envelope's describes the
      file; a member without its own `license` or `authors` is under the envelope's. A writer that
      puts a member with its own licence into an envelope under a different licence keeps the
      member's. The member names are part of open decision 26.

### Writer output form

A writer SHOULD write the same bytes for the same content, so a file kept in version control
diffs only where something changed:

1. members in this order: `$schema`, `kind`, `version`, the identity members of the kind (`id`,
   `recipeVersion`, `planVersion`), `name`, `description`, then the shared metadata in the order
   listed above (`authors`, `license`, `citation`, `doi`, `derivedFrom`, `handling`), then
   `createdAt`, `modifiedAt`, `generator` (which a conforming writer MUST write), `features`, then
   the kind's content members in the order
   its specification's data model lists them, then `extensions`, then unknown members in the order
   read; inside a unit, the order of its data model, `extensions` last;
2. arrays in document order; two-space indentation; a trailing newline; numbers in the shortest
   form that round-trips (ECMAScript `Number.prototype.toString`, the form RFC 8785 uses), so
   `0.000001` is written `0.000001` and `1e-7` stays `1e-7`;
3. `createdAt` is written once and never rewritten; a writer that changes content writes
   `modifiedAt` (RFC 3339) instead.

The canonical form used for digests is RFC 8785 (JSON Canonicalization Scheme), not this display
form. Each kind that has a digest defines exactly which members it covers (a recipe: recipe.md,
"Identity and namespacing"; a note: annotations.md, "Writing" rule 5); a document digest with no
such definition covers the whole document as read. graphty-element publishes the digest as a pure
function on its Node-safe `./format` entry, `documentDigest(doc)`, so a reviewer can check a digest
printed in a methods section without running a session.

## The dataset a document was authored against

Style, data plan, view, annotations and envelope documents MAY carry `fingerprint`, the identity
of the graph they were written against. A member of an envelope without its own fingerprint
inherits the envelope's.

1. The value MUST be `"<scheme>:<hex>"`. The scheme names the algorithm, so it can change without
   ambiguity (the Frictionless Data convention of prefixing a hash with its algorithm).
2. Scheme `g1` is the hash graphty-element computes today (`computeFingerprint` in
   `graphty-element/src/session/statistics.ts`): FNV-1a over two 32-bit lanes of the node count,
   edge count, direction, the node ids in index order and the adjacency, written as 16 lower-case
   hex digits. It covers topology only: attributes and positions are not in it. It is sensitive
   to node order, so the same graph loaded from a file with its rows in a different order has a
   different `g1` fingerprint.
3. **Until open decision 5 approves a scheme, a writer MUST NOT write `fingerprint`.** The `g1`
   values in this directory's examples illustrate the member's form only. Retiring a scheme that
   files already carry is the burden the decision exists to avoid.
4. A fingerprint is advisory. It MUST NOT gate anything, with one named exception: a view with
   both a stored camera and a framing uses the stored camera on a matching graph (view-preset.md).
   A reader compares it with the current graph's and reports one of `match`, `differs` or
   `unknown` (no fingerprint, or a scheme the reader does not compute); for that exception
   `unknown` is treated as `differs` unless the view says `prefer: "camera"`, and reported.
   Applying a style to different data is the reason styles are separate documents (element API
   design section 4.6.3a).
5. A fingerprint is not a security measure. It detects "made for a different file", not
   tampering. A data digest (envelope.md) is the check for "these exact bytes".

## Applying a document to new data

Every document binds to a graph by names and declared meanings, never by an opaque dataset id.
kepler.gl binds a saved map to its data by dataset id and Neo4j Bloom binds a perspective to its
database; both mean a configuration cannot be reused on new data, which is the owner's first
requirement for styles.

| Document    | Binds by                                                                                                                                                           | A unit that does not bind                                                                                                                                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Style       | attribute paths (`data.<name>`), run result paths (`results.<runId>.<field>`), kept set ids, node ids and stable edge references in an `ids` selector, palette ids | is added to the stack disabled, with the reason and the paths it needs; the other layers apply                                                                                                                                                                                                         |
| Data plan   | column names in the incoming records                                                                                                                               | a `knownFields` member the plan declares that no record carries refuses the import, naming it (data-plan.md, "Applying" rule 2); a member the plan leaves out takes the element's default (for example probing `source`/`target`); an attribute declaration that binds nothing is reported and ignored |
| View        | nothing, for a framing; the scene coordinates of the current layout, for a stored camera                                                                           | a framing always binds; with both, the framing is used unless the graph is known to match or the view prefers its camera (view-preset.md), and the choice is reported                                                                                                                                  |
| Recipe      | its declared requirement slots: attributes by name, hint, measurement level and role; arguments by caller input; extensions by key                                 | the step is skipped with the reason; later steps that need its result are skipped too; the others run                                                                                                                                                                                                  |
| Annotations | node ids, stable edge references, group members, run ids and layer ids                                                                                             | the note is kept and marked orphaned (or pending, for a run a recipe will produce), never dropped                                                                                                                                                                                                      |

Node ids are compared after the same coercion the import applied (`idCoercion`, data-plan.md): with
`canonical`, the text `"1042"` and the number `1042` are one id, and `"01"` stays the text `"01"`.
This applies to note targets, `ids` selectors, set members and argument values.

Every applier returns a **binding report** with the same shape for every kind. It is the element API
design's `BindingReport` (section 12), extended with the facts the kind specifications require
reported:

```ts
interface BindingReport {
    readonly bound: number; // units that now take effect
    readonly disabled: readonly Problem[]; // units kept but not in effect, one entry each
    readonly unresolvedPaths: readonly string[];
    /** Units that would bind after work the caller has not agreed to (a recipe run). */
    readonly needsRerun?: readonly {
        what: string;
        estimateSeconds: number;
        exact?: boolean;
        precision?: "f32" | "f64";
    }[];
    /** Work that takes effect only at the next import: a data plan applied after load, or a
      recipe slot bound to a column the import did not load. Each entry names the attribute and
      gives the data plan (knownFields only) the re-import should use; the applier holds the
      waiting units and re-binds them when that import completes. */
    readonly needsReimport?: readonly {
        reason: string;
        attribute?: string;
        knownFields?: Readonly<Record<string, unknown>>;
    }[];
    readonly fingerprint?: "match" | "differs" | "unknown";
    /** Incoming units given a new id because theirs was taken. */
    readonly renamed?: readonly { from: string; to: string }[];
    /** Facts that are not failures: a converted camera, a registered palette, a version difference,
      a stale quote, an unknown member, a match count. */
    readonly notices?: readonly Problem[];
    /** Recipes only. */
    readonly recipe?: RecipeBinding; // recipe.md, "The recipe binding report"
}
interface Problem {
    what: string; // the unit's id or name, or a JSON pointer
    reason: string; // one sentence a reader can act on
    code: GraphtyErrorCode | GraphtyWarningCode; // e.g. E_UNKNOWN_PALETTE, W_UNKNOWN_MEMBER
}
```

`GraphtyErrorCode` (`graphty-element/src/errors/codes.ts`) holds no warning codes today, so the
notices this specification requires need a published `GraphtyWarningCode` union beside it (open
decision 4).

The style applier graphty-element ships today returns a narrower `TemplateReport`
(`{ applied, unbound }`, `graphty-element/src/session/styles/StylesApi.ts`). Conformance to this
specification requires the `BindingReport` shape; `TemplateReport` can remain as the style-specific
detail beside it.

Importing data returns an **import report**, the typed form of what a data plan decided and what
the data did, so a pipeline can gate on it and two imports can be compared:

```ts
interface ImportReport {
    readonly plan?: {
        id?: string;
        planVersion?: string;
        digest?: string;
        /** set when the plan was held from another document (envelope.md) */
        heldFrom?: { document: string; digest: string };
    };
    readonly data?: { format: string; digest?: string; bytes?: number };
    /** the packages that read the bytes, and a registered third-party importer's identity */
    readonly engine: { graphIo: string; graphFormat: string; importer?: { key: string; version: string | null } };
    readonly dataSource?: DataSource; // as passed to the import call (envelope.md)
    readonly fieldsUsed: Readonly<Record<string, string | null>>; // each knownFields member as resolved, including probed ones
    readonly counts: {
        readonly records: number;
        readonly nodes: number;
        readonly edges: number;
        readonly repeatedEdgesMerged: number;
        readonly repeatedNodesMerged: number;
        readonly idsCoerced: number;
        readonly coercionFailures: number;
        readonly missingEndpoints: number;
        readonly constraintViolations: number;
        readonly ignoredDeclarations: number; // declarations that bound nothing, so a pipeline can gate on it
    };
    /** one entry per declaration with a constraint, uncapped */
    readonly violations: readonly { declaration: string; types?: readonly string[]; count: number }[];
    /** the type each undeclared column was read as, and how many cells did not fit it */
    readonly inferredTypes: Readonly<Record<string, { type: string; failures: number }>>;
    readonly joins: readonly {
        input: string;
        matched: number;
        unmatched: number;
        duplicates: number;
        multiMatched: number; // table rows that matched more than one node
        unmatchedIds: readonly (string | number)[]; // capped at 1000
        unmatchedTotal: number;
        unmatchedTruncated: boolean;
    }[];
    readonly weightRoles: Readonly<Record<string, "distance" | "similarity" | (string & {})>>;
    readonly derived: readonly { name: string; from: string; transform: string }[];
    /** per merged node id, the attributes whose values differed between records (capped at 1000) */
    readonly nodeConflicts: readonly { id: string | number; attributes: readonly string[] }[];
    readonly nodeConflictsTotal: number;
    readonly nodeConflictsTruncated: boolean;
    /** qualified types an edge end named that no node record had (typed identity only) */
    readonly unmatchedTypes: readonly string[];
    readonly issues: readonly { row: number; field: string; code: string; value: unknown }[]; // capped
    readonly issuesTruncated: boolean;
}
```

Issue codes are graph-io's existing codes where one exists. The caps default to 1,000; the caller
MAY raise them for one import (`issueLimit`) or ask for the full issue table as CSV, and a project
stores at most the defaults. Columns no declaration types are inferred by graph-io's rule for the
format (in CSV, a column whose every non-missing cell parses as a number is numeric), and the
result is reported in `inferredTypes`, so an `NA` that turned a fold-change column into text is
visible. The shape is part of the published
contract (open decision 4). A project keeps the import report of the import that built its graph
(envelope.md, "Import records"), so the join counts and unmatched ids that held when a figure was
made can be read six months later without re-importing.

## Combining documents

Documents may be applied one at a time, in any order, or together in one envelope.

| Kind        | Applying a second document of the same kind                                                                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Style       | appends its layers above every layer already present, in document order, as `applyTemplate` does today. Replacing the stack is an explicit option of the applier, not the default                                                                 |
| Data plan   | takes effect at the next import. A data plan applied to a graph already loaded is reported as `needsReimport`; it never rewrites a loaded graph                                                                                                   |
| View        | adds its views to the list; an applied view moves the camera, and the last applied wins                                                                                                                                                           |
| Recipe      | appends its steps' runs as a second application. Run ids are namespaced; applying the same recipe id again follows the applier's `onRepeat` option, and re-applying one whose earlier application ran no step re-binds it (recipe.md, "Applying") |
| Annotations | merges by note id (annotations.md, "Reading and applying"); nothing is overwritten unless the caller asks for newer versions to replace older ones                                                                                                |

Inside one envelope the order is fixed, and is envelope.md's ("Opening" rule 4): data plan, data,
positions, filter, sets, results, tables, recipes (in list order), style, view, annotations. The
filter precedes the recipes, which is why the applier passes every recipe step an explicit scope
(recipe.md, "Scopes"). The recipes precede the style so
that layers bound to their runs find them; the view follows both so a framing fits the laid-out
graph; annotations come last so their targets exist.

## File names and media types

Undecided (see "Open decisions"). The recommendation:

- Every JSON document, of any kind, uses the extension `.graphty.json` and the media type
  `application/vnd.graphty+json`; the `kind` member says which document it is. Writers SHOULD name
  files `<name>.<kind suffix>.graphty.json` (`publication.style.graphty.json`,
  `hub-genes.recipe.graphty.json`) so a person can tell them apart in a folder.
- A project that embeds its graph as binary graph-format parts uses the zip container `.graphty`,
  media type `application/vnd.graphty.project+zip`, whose manifest is an envelope
  (envelope.md, "Containers"). That is the design studio's container recommendation for project
  files, measured at 18 MB and 6 ms for a 100,000-node graph as graph-format bytes against 58 MB
  and about 290 ms as JSON.

## Trust

A document is data from someone else. The rules below apply to every kind and are restated where
they bite.

1. **Nothing in a document is executed as code.** No reader evaluates a string as JavaScript, and
   no document names code to load. The only languages a document contains are the element's own
   query dialect (JMESPath predicates in selectors) and the `[name]` formula grammar, both
   interpreted by graphty-element with no access to the page. A value is never spliced into a
   string that is then evaluated; substitutions replace whole JSON values or literal nodes of a
   parsed expression (recipe.md). This is the lesson of script injection through interpolated
   inputs in GitHub Actions workflows.
2. **Nothing is fetched without the caller's consent.** `$schema` is never fetched. A data URL in
   an envelope, and any source a recipe names, is fetched only after the caller agrees to the
   origin of the resolved URL (the design studio's rule for recipes arriving by file or by link),
   under the scheme, redirect and address rules of envelope.md ("Fetching").
3. **No extension is installed by a document.** A document names extension keys; it never names a
   package to download or a URL to import. A missing extension makes its units unresolved. A
   recipe may record the package and version that provided a key; a report shows them as the
   document's claim, never as an instruction to install (recipe.md).
4. **Compute is agreed to.** Opening a document never starts an algorithm run or a layout unless
   the caller explicitly asked for that recipe to run. Loading data is not such a request. Until
   then the recipe is planned, estimated and reported in `needsRerun`. Even then a recipe runs
   only within a total budget with a published default (recipe.md, "Consent").
5. **Readers bound their work** by the limits of "Encoding and limits", by the cost cap and the
   total budget for recipe compute (recipe.md, "Consent"), and by a work bound on applying a style
   (style.md, "Reading and applying" rule 11): evaluating selectors, sorting for `top` and
   computing percentiles for `clamp` is work too, and a style is applied automatically when an
   envelope opens.
6. **Imported units say they were imported.** A style layer, a note, a run record, a stored
   result, a kept set and a view that arrive from a document are stamped with what the reader
   observed -- the file name or origin it was opened from -- and that document's digest (style.md,
   annotations.md, envelope.md); the document's own `name` is shown only as its claim. A stamp is
   appended by the reader; one found in the file is kept as the file's claim, never trusted. A
   document cannot make its content look like the reader's own work, and the methods text says
   "recorded by <document>" for a run record this session did not produce (recipe.md).
7. **A file's record of how it was bound is a claim.** Slot bindings, weight-role confirmations
   and argument values found in a recipe's `application` block are never used as the reader's own
   decisions: graphty-element reuses only bindings and confirmations it recorded itself, in its own
   storage (recipe.md, "Applying").
8. A fingerprint and any digest are integrity hints, not authentication. Signed documents are not
   specified here (see "Open decisions").

## Where the documents live in the packages

graphty-element owns every document: parsing, validating, upgrading, binding, applying, writing
and the binding reports. This follows the architectural rule that graphty-element is
self-sufficient and the graphty app only consumes it (root `CLAUDE.md`, "Architectural
Principles"): a third party who installs graphty-element and nothing else must be able to save
and open every document the graphty app can. The app draws the Save and Load controls the owner
asked for ("where is export style, export recipe? load style?", 2026-09-26) and calls the
element.

The app currently holds placeholders. The Data panel's "Run a recipe..." entry carries a comment
calling recipes "new work, app" (`graphty/src/components/shell/panel/DataPanel.tsx`), which points
the wrong way: recipe storage, binding and replay belong in graphty-element. The Present panel's
data-format export list is built from the element's catalogue and is empty, because every format
there has `canExport: false`; its "Export recipe (JSON)" row is listed as unshipped
(`graphty/src/components/shell/panel/PresentPanel.tsx`). Both wait for the element work this
directory specifies.

| Document    | Element API today                                                                                    | Designed (element API design)                                                                                                                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Style       | `session.styles.toDocument()`, `session.styles.applyTemplate(doc)` (shipped in 2.x)                  | unchanged, plus the `BindingReport`                                                                                                                                                                                                    |
| Data plan   | the internal `DataConfig` inside the 1.x template                                                    | `DataPlan`, applied at import                                                                                                                                                                                                          |
| View        | `Graph.exportCameraPresets()` / `importCameraPresets()`, an unversioned map of Babylon camera states | `ViewPreset`; `camera.bookmark()` / `apply()`                                                                                                                                                                                          |
| Recipe      | `session.run({ op: "algo.run", ... })` and `runs.batch(RunSpec[])`                                   | `session.recipes.apply(doc, options)` returning an application handle (recipe.md, "Applying"); `journal.export()` produces a recipe. The element API design's `journal.replay()` replays a whole journal and is not the recipe applier |
| Annotations | none                                                                                                 | `session.notes.toDocument()` / `applyDocument()`                                                                                                                                                                                       |
| Envelope    | none                                                                                                 | `data.openDocument()` / `data.saveDocument()`                                                                                                                                                                                          |

The JSON Schema files here are the drafts of what graphty-element will publish. Where and under
what export path is an open decision. **Everything but rendering works in Node**: parsing,
validating, upgrading, digesting and writing every kind, binding slots, planning and estimating a
recipe, and running its non-rendering steps against a graph loaded in Node are available from the
Babylon-free entry points (`./format` for documents and the digest, `./session` for binding and
running), so a pipeline can batch-apply one recipe to fifty networks and gate on the import and
binding reports. graphty-element SHOULD ship a `validate(doc, { strict })` function and a small
command-line validator with the schemas, and a small command-line runner beside it (a recipe, a
data file and a data plan in; CSV result tables and the run manifest out), so a Python or R
pipeline can run a lab recipe over fifty networks without writing a Node program. A data plan can
be tried without committing it: `data.checkImport(src, { plan, sampleRows })`, side-effect free and
Node-safe, returns the import report and the first parsed node and edge records without building or
replacing the session's graph (data-plan.md, "Applying"). The element's algorithm catalogue (keys, legacy aliases,
option descriptors with defaults and maxima, result fields with their roles, each algorithm's
conventions and a citation) SHOULD be published beside them as a versioned JSON file, so a person
can hand-write a recipe or a result-bound style without running graphty-element to discover option
and field names (open decision 3).

### Relation to the graph-format migration's export API

The graph-format migration (plan: `design/graph-format/migration-plan.md` on branch
`feat/graph-format-migration`) adds an element export API that writes every graph-io format and
deprecates the plugin method `Algorithm.algorithmGraph()` in favour of a snapshot accessor.
Consequences for these documents:

- The owner decided what an export contains on 2026-09-28 (UTC): "whatever the format supports",
  which means data, positions, algorithm results as attributes and resolved style values wherever
  the target format has a place for them, with everything else reported as a loss note, never
  dropped silently. [export-mapping.md](export-mapping.md) is written to that decision. The
  migration plan's `element-export-api` item still describes an export of "the data bags and
  current positions" and still lists the contents as an owner question; that text is stale and
  should be updated to the decision. Its candidate signature, `exportGraph(format, options) ->
Promise<{ text, lossNotes }>`, also conflicts with the element API design's `ExportResult`
  (section 4.3.6: a `blob`, a `stream()`, the run `manifest` and the loss notes; "export never
  returns one string", so a 100,000-node GEXF is not built in memory as one string). The update
  should adopt the `ExportResult` shape, with graph-io's `LossNote` and the manifest this
  specification requires (export-mapping.md, "The run manifest"). The method name and signature are
  a published API and are on the owner's list (open decision 33).
- Recipes name algorithms by catalogue key and never depend on how a plugin reads the graph, so
  replacing `algorithmGraph()` with the snapshot accessor changes nothing in these formats. The
  migration's indexed ports take a per-arc weight array per call, so a recipe's weight slot binds
  to any compatible numeric edge column and the element passes it as that run's weight (recipe.md,
  "Weights"); that is part of the snapshot accessor's weight contract, which the migration's
  plugin-seam decision should settle. The migration plan's rule that Kamada-Kawai receives `1 /
sum` of parallel edge weights, reading every weight as a strength, contradicts this
  specification's weight roles and needs updating (recipe.md, "Weights" rule 6). A flow algorithm's
  capacity is graph-format's separate `capacity` role; max-flow today reads a fixed record key
  (`capacity`, else `value`, `MaxFlowAlgorithm.ts`) and should read the capacity-role column of the
  snapshot instead, an element change.
- The export places a plugin's result field in a graph-format role (`community`, `rank`) only when
  the plugin declares it. Plugins already declare their result fields
  (`AlgorithmDescriptor.fields`, each with a name, kind and type, and the result `shape` from
  `RESULT_SHAPES`, `graphty-element/src/catalog/types.ts`); what is missing is a role on
  `FieldDescriptor`, or a shape-to-role table in the catalogue. That is a catalogue change, not a
  dependency on the migration's plugin seam, which covers only the snapshot accessor.

## Reviewing personas and workflows

These design studio personas (`design/designloom/personas/`) exercise the formats hardest; their
workflows (`design/designloom/workflows/`) are the acceptance scenarios the worked examples draw
from.

| Persona file                     | Why                                                                                                                               | Workflow files                                                         |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `genomics-cytoscape-user.yaml`   | measures everything against Cytoscape's session file, style files and CX; needs several networks in one file and exported legends | `W20.yaml`, `W21.yaml`, `W22.yaml`, `W23.yaml`, `W24.yaml`, `W25.yaml` |
| `bioinformatics-researcher.yaml` | reproducible, citable pipelines others can run; parameters for peer review                                                        | `W20.yaml`, `W22.yaml`, `W25.yaml`                                     |
| `analyst-alex.yaml`              | the primary recipe consumer: "no way to save analysis patterns"                                                                   | `W03.yaml`, `W15.yaml`                                                 |
| `expert-emma.yaml`               | hand-authors, diffs and round-trips files; exports to R and Python                                                                | `W03.yaml`, `W18.yaml`                                                 |
| `intelligence-analyst.yaml`      | annotations as evidence, provenance, and never fetching an untrusted source                                                       | `W06.yaml`, `W09.yaml`, `W15.yaml`                                     |
| `knowledge-engineer.yaml`        | column roles, node types and identity, schema evolution                                                                           | `W13.yaml`, `W18.yaml`                                                 |

### What version 1 does and does not cover, by workflow

Stated plainly so no one discovers it from a failed file:

- **Covered:** reusing a style on new data (`W20.yaml`); one encoding across two networks applied
  separately (`W24.yaml`); reading a source with declared roles and a joined attribute table,
  including a join after load (`W18.yaml`, `W20.yaml`); evidence notes on the exhibit's original
  bytes (`W06.yaml`, `W09.yaml`); a project file holding **one network** with the original data,
  positions, the active filter, import, run and layout records, superseded and discarded run
  records, sets and stored results, reopening "sealed" with the submitted numbers in either
  container (`W25.yaml`) -- but a session holding several networks (the full network, its
  largest-component subnetwork kept as a separate graph, a sub-map) cannot be saved as one project
  until open decision 24 is made; keeping the largest component as the working network through
  the session filter (`{ component: "largest" }`) is covered; trying a data plan on a sample before
  loading (`W18.yaml`, `data.checkImport`).
- **Partly covered:** ranking hubs with recorded parameters (`W23.yaml`): the combine phase -- a
  custom combined score and "top ten in at least two methods" as exported columns -- needs
  `attribute.compute`, so the ranked table leaves it out; clustering and annotating (`W21.yaml`):
  cluster labels travel as group notes and as a legend's category labels, and per-cluster
  enrichment tables computed outside graphty travel as `tables` attached to the clustering run
  (envelope.md), but filtering clusters by size needs `graph.filter`, a
  cluster label reaches the canvas only through a label layer on the members until callouts exist,
  MCL is not in graphty-element's catalogue and `clustering-coefficient` is deprecated and does not
  run (`graphty-element/src/catalog/types.ts`); report pages (`W15.yaml`): each page has its own
  camera, filter, enabled layers, notes and figure settings, and an image export of a page carries
  its legend and its notes as a numbered caption list (export-mapping.md, "Images"), but canvas
  callouts are not specified; enrichment maps (`W22.yaml`): the q-value and similarity cutoffs travel as the view's
  or project's filter and in each run record's scope, but the gene-set overlap computation does
  not.
- **Not in version 1**, each named as a reserved step type or an open decision: fetching
  interactions from a database inside a recipe, making the largest component the working network
  of later recipe steps (`graph.subgraph`), enrichment against a gene-set file, computed
  attributes, a randomized null model
  (`W03.yaml`, `W20.yaml`, `W21.yaml`, `W22.yaml`; `graph.randomize` and `graph.filter` are the
  first additions to make, and until then the methods text says which steps behind a conclusion
  were done outside the recipe); several networks in one file (`W24.yaml`, open decision 24: a
  session holding more than one graph cannot be saved as one project, envelope.md "Saving");
  merging several sources and resolving duplicate entities (`W09.yaml`, `W13.yaml`, open decision
  27: a node merge made in the session is saved baked into the data with a loss note, and no alias
  records what merged into what); per-type attribute schemas and relationship domain and range
  checks (`W13.yaml`); publishing to NDEx (`W25.yaml`); a knowledge graph above the default data
  limits (`W13.yaml` states 10,000 to 10,000,000 nodes) opens only with a caller-raised limit and,
  for a project, the zip container.

## Open decisions

Each item below is a one-way door: a file format, a published name, a published default or a URL
that would be expensive to change once files or consumers depend on it. None is decided by this
specification. The recommendation is what the specifications are written to; rejecting one changes
the text that cites it.

1. **Container, extensions and media types.** One JSON document for everything, a zip `.graphty`
   for everything, or both. _Recommendation:_ JSON (`.graphty.json`,
   `application/vnd.graphty+json`) for every document and for envelopes whose data is text or a
   reference; the zip `.graphty` (`application/vnd.graphty.project+zip`) with an envelope as its
   manifest for projects that embed binary graph parts. Also the design studio's door 1. Both
   containers store results (the JSON one as CSV text), so a project that must reopen "sealed" --
   the submitted figure's numbers, not a re-run under whatever engine is installed (`W25.yaml`) --
   does not depend on this decision; a project above the default data limits (`W13.yaml`) is
   practical only in the zip.
2. **The `kind` strings and a discriminator on every document.** Today only the envelope has
   `kind`; a 2.x style document is `{ version, layers, palettes? }`. _Recommendation:_
   `graphty-style`, `graphty-data-plan`, `graphty-view`, `graphty-recipe`, `graphty-annotations`,
   `graphty-document`; readers accept a style document with no `kind` as `graphty-style` version
   1 forever, because 2.x already writes that shape.
3. **The schema URLs, where the schemas are published, the strict lint profile and the published
   algorithm catalogue.** _Recommendation:_ `https://graphty.app/schema/documents/<kind>/v<major>.json`
   and `.../<kind>/v<major>.strict.json`, the same files exported from graphty-element as
   `@graphty/graphty-element/schemas/<kind>.v<major>.json`, and the catalogue as
   `@graphty/graphty-element/graphty-catalog.json` (which the package already exports) extended with
   option maxima, each option's declared weight meaning, result-field roles, the stability promise
   per name, a `citation` per algorithm for the methods text, and each algorithm's conventions
   (normalisation, dangling nodes, self-loops and repeated edges, whether negative weights are
   accepted). Whether the catalogue also records reference-implementation equivalents (a networkx
   or igraph function and the mapping of its parameter names) is part of this decision;
   _recommendation:_ yes, informational, because validating against a reference implementation is
   the expert persona's workflow (`W03.yaml`). A `validate(doc, { strict })` function and a
   command-line validator ship with the schemas. Beside the moving `.../v<major>.json`, publish an
   immutable schema per release (`.../v1.3.json`), and have the strict profile check a file
   against the schema of its `generator`'s release, so a member a newer release added is not
   flagged as a misspelling. **Before any recipe or data plan is released**, the catalogue fields
   the rules depend on MUST be published -- which algorithms and layouts read a weight and as what,
   negative-weight acceptance, the stochastic flag, option maxima -- together with the strict
   profile, because without them a person cannot hand-write a conforming recipe.
4. **New error, warning and loss-note codes, and the report shapes.** Codes and the
   `BindingReport`, `RecipeBinding` and `ImportReport` shapes are a published contract. Today the
   style applier refuses an unknown version with `E_BAD_COMMAND`. _Recommendation:_
   `E_UNSUPPORTED_VERSION` (graph-format's code for its wire form; new to graphty-element's
   `GraphtyErrorCode`) with details `{ kind, documentKind?, found, reads }`, where `kind` keeps
   graph-format's meaning -- the category, `wire` or `format`, and for these documents `document`
   or `part` -- and `documentKind` names the document kind (`graphty-style`); new codes
   `E_UNKNOWN_KIND`, `E_UNSUPPORTED_FEATURE`, `E_UNKNOWN_ELEMENT`, `E_UNKNOWN_SET`,
   `E_UNBOUND_SLOT`, `E_ROLE_CONFLICT`, `E_WEIGHT_ROLE_MISMATCH`, `E_CONFIRMATION_REQUIRED`,
   `E_ARGUMENT_REQUIRED`, `E_DEPENDENCY_SKIPPED`, `E_UNKNOWN_COMMAND`, `E_NAMESPACE_MISMATCH`,
   `E_RECIPE_DIGEST_MISMATCH`, `E_REPEAT_APPLICATION`, `E_PRECISION_UNAVAILABLE`,
   `E_DIGEST_MISMATCH`, `E_CONSENT_REQUIRED`, `E_NEGATIVE_WEIGHT`, `E_UNSTABLE_EDGE_ID`,
   `E_BUDGET_EXCEEDED`; and **existing** graphty-element codes whose documented meaning this
   specification uses or extends, each of which must be restated in
   `graphty-element/src/errors/codes.ts` if adopted: `E_SCOPE_EMPTY` (used as documented for an
   empty recipe scope), `E_UNKNOWN_RUN`, `E_UNKNOWN_LAYER`, `E_DUPLICATE_ID` (reused as
   documented), `E_UNSUPPORTED` (an immersive mode unavailable, a session of several graphs
   refused on save),
   `E_TOO_LARGE` (today "a hard structural limit of an index or of the accelerator", and an
   acceleration capability code; _recommendation:_ give document size limits their own code,
   `E_DOCUMENT_TOO_LARGE`, rather than widen it), and `E_UNSTABLE_RUN_ID` (today a refused save;
   here only a recipe step without `as`, README "Identifiers" rule 2); warnings in a new published
   `GraphtyWarningCode` union: `W_UNKNOWN_MEMBER`, `W_UNKNOWN_MEMBER_STALE`, `W_STALE_QUOTE`,
   `W_PARAMETER_DIFFERS`, `W_ENGINE_DIFFERS`, `W_RUN_CHANGED`, `W_DIGEST_MISMATCH`,
   `W_STYLE_WORK_BOUND`, `W_STATUS_PROPOSED`; and the `W_GRAPHTY_*` loss-note codes of
   export-mapping.md.
5. **The fingerprint scheme.** _Recommendation:_ define `g2`, an order-independent hash over the
   sorted node ids and the sorted edge list, and approve it before any writer writes a
   fingerprint; never write `g1` into a file.
6. **Style file: sibling document or recipe profile.** _Recommendation:_ sibling document (this
   specification), because the style document is already published and a style must be applicable
   without the recipe machinery; "a recipe and a style in one file" is an envelope with both
   members.
7. **Recipe shape.** A replayed journal of any command (element API design section 4.11), a
   declarative profile bound through slots (design studio door 19), or the hybrid specified in
   recipe.md: declared requirement slots, explicit `$attribute`, `$argument` and `$result`
   references, and steps that reuse the command union's `op` shapes. _Recommendation:_ the hybrid,
   with version 1 steps limited to `algo.run` and `layout.set`, the step types
   `graph.filter`, `graph.subgraph`, `attribute.compute`, `data.query` and `graph.randomize`
   reserved for later minor versions, and whole-session replay left to the journal, not the
   recipe format.
8. **Recipe identity, namespacing, repeat application and the overview recipe.** _Recommendation:_
   the design studio's rules (doors 19 and 33): a stable recipe id, version and optional canonical
   source, where one id and version name one immutable content; run ids namespaced `<ns>__<id>`
   when applied, with the namespace recorded in the saved envelope so it round-trips; `onRepeat`
   defaulting to refuse, tracked per import; graphty-element ships a "General" overview recipe
   that a consumer and a project can replace. `recipeVersion` is published identity:
   _recommendation:_ require SemVer 2.0.0 (a schema pattern, SemVer precedence) before the first
   recipe with a DOI exists; until then, versions that are not SemVer are never ordered.
9. **Load-time runs.** The element API design keeps `runOnLoad` in the data plan, which puts
   compute in the column-roles document. _Recommendation:_ move it to the recipe (data-plan.md),
   as the migration register's template-split codemod already assumes.
10. **Data plan vocabulary and structure.** Three spellings exist: the code's
    `DataConfig.knownFields`, the design's `DataPlan.knownFields`, and the design's `ImportPlan`.
    _Recommendation:_ the code's names and nesting (the policies stay inside `knownFields`, as
    `DataConfig` has them), graph-format's `ColumnRole` and `DuplicatePolicy` values, plus
    attribute-level measurement level and weight role (design studio door 21, `distance |
similarity` with `signed`; a flow capacity is graph-format's separate `capacity` role rather
    than a meaning of the weight), joins, constraints and a missing-endpoint policy.
11. **What a view holds.** _Recommendation:_ a list of named views, each a drawing mode plus a
    renderer-neutral stored camera or a framing by camera-view id, which of the two it prefers when
    the graph's identity is unknown, a filter, the layers switched on, and the ids of the notes it
    shows (view-preset.md). The design studio's other captures (collapsed sets, stored positions,
    display toggles, an export setting) are added later under the same kind; they are additive.
12. **Standalone annotations.** The owner listed annotations as an independent file type; the
    design studio rejected a notes-only file. _Recommendation:_ offer it (annotations.md), with
    the studio's concern answered by the binding rule: notes keyed by element id bind only to
    matching ids and are otherwise kept as orphaned.
13. **Node identity in notes and selectors, and the edge predicate.** Edge identity is settled by
    graphty-element's shipped `EdgeMember` (`graphty-element/src/catalog/types.ts`;
    `design/sets/sets-design.md` sections 4.2 and 12.2), which these documents reuse. Open:
    typed node identity (data-plan.md, "Node types"), which must be expressed through
    graph-format's existing `kind` and `idSpace` roles and its single id space (graph-format
    design decision Q27, "no core namespaces"); and adding the edge's type or predicate (`kind`) to
    `EdgeMember`, so a pair with two predicates keeps its references when rows are reordered. And
    **node type versus node class**: a knowledge graph whose ids are already global (IRIs, UUIDs)
    has types that are classes, not namespaces, and a node can have several. _Recommendation:_
    split them -- a `nodeClassPath` (one or more fields holding classes, stored under
    graph-format's `kind` role) that `types` scoping, styles and joins read and that never changes
    identity, and `nodeTypePath` only for namespace-qualified identity -- plus `idsQualified: true`
    for ids already qualified (the regenerated plan of a typed export, data-plan.md), and a
    `typeRenames` map so a renamed type rewrites stored references deterministically before the
    `originalId` fallback. Every typed-identity member is reserved behind the feature name
    `typed-identity` until this decision is made (data-plan.md, "Node types"). _Recommendation_
    on the identity form: qualified ids `"<type>:<id>"` (the type percent-encoded, data-plan.md "Node
    types") whenever a type path is declared, with the type in the `idSpace` role and the untyped
    id in a plain column named `originalId` that has no role, exactly as graph-io's Neo4j importer
    stores `:ID(Space)` ids (`graph-io/src/formats/neo4j/importer.ts`). The graph-format
    `originalId` ROLE must not be used: it means "an id an exporter mangled", and graph-io's
    exporters treat it as structural and its importers restore it as the node id, which would merge
    `account:123` and `device:123` on a round trip through GML. Also: `kind` added to `EdgeMember`
    as an element change, together with the data plan's `edgeTypePath`; and a rule that a note, set
    or selector id that does not bind on a typed graph binds through the `originalId` column when
    exactly one node matches, so adopting types (or renaming one) does not orphan every saved
    annotation. Deferring that rule makes adopting types a breaking operation for every saved
    reference.
14. **Canvas callouts and shapes.** The designloom annotation capability asks for text boxes,
    leader lines and highlight shapes anchored to the canvas, and report pages
    (`W15.yaml`) depend on them. _Recommendation:_ exclude them from annotations version 1; they
    are presentation, and belong to a later view version.
15. **Carried palettes.** Today a style document carrying a palette nobody registered is refused
    whole with `E_UNKNOWN_PALETTE`. _Recommendation:_ an applier registers a carried palette for
    the session that applied the document only, never in the page-global registry
    (`catalog/pluginRegistry.ts` keys that registry on `globalThis`, so a global registration
    would reach every element on the page and every later document); it never replaces a
    registered palette of the same id; built-in palette ids stay reserved.
16. **Per-layer or whole-document failure of a style.** Today one refused layer refuses the whole
    style document. _Recommendation:_ per layer, and per channel entry for an unknown channel, as
    the element API design says ("one member failing never fails the open"); a refused layer is
    added disabled with its reason.
17. **Envelope members beyond the six.** _Recommendation:_ in envelope version 1, `recipes` as a
    list (a session can hold several applied recipes, and a project save adds one for the runs made
    by hand), `runs` (with layout records), `imports`, `dataSource`, `positions`, `filter`, `sets`
    and `results` (envelope.md); background and configuration stay out of version 1 and the 1.x
    upgrade reports them. One style stack: graphty-element holds one per session, so nothing is
    lost; alternative looks travel as separate style files, and a later `styles` list would be an
    addition beside `style`, not a replacement.
18. **Embedding graphty documents inside third-party files.** GraphML and GEXF could carry a
    style or recipe as a graph-level string attribute. _Recommendation:_ do not embed in version
    1; write an envelope beside the export that references it (export-mapping.md).
19. **Third-party readers and writers.** Whether a plugin can register an exporter, and whether a
    document may name a third-party importer's format id (`org.example.turtle`). _Recommendation:_
    importer registration stays an element extension point (the File format extension point
    already covers reading, and format detection is the element's), so a data plan or data member
    may name a registered third-party format id; exporters stay graph-io's, and a missing writer
    is new graph-io work. RDF (Turtle, JSON-LD) readers and writers, which the knowledge-engineer
    persona's downstream semantic consumers need, are a named gap under this decision.
20. **Style writers in graph-io.** "Whatever the format supports" is only true for GEXF today.
    _Recommendation:_ add them in the order CX2 (the one target that holds style rules, and the
    genomics persona's exchange format), GraphML (yFiles), DOT, Cytoscape JSON, GML; write graphty
    styles to CX2 `visualProperties`; and an optional graph-io reader for Cytoscape `styles.xml`
    and CX2 visual properties (export-mapping.md, "Importing Cytoscape styles"). Until the CX2
    writer exists, the graphty app's Present panel offers no CX2 export and the design studio's
    workflow text that promises "export as CX2" (`W25.yaml`) describes a future release; the
    Cytoscape-readable deliverable version 1 guarantees is stated in export-mapping.md ("For
    Cytoscape users"). Also: a Neo4j writer that writes a typed graph's type as the id space and
    label, and RDF (Turtle, JSON-LD) readers and writers for knowledge-graph consumers (open
    decision 19), are named gaps.
21. **Signed or hashed documents.** The intelligence and fraud personas need integrity that can be
    checked, and a chain of custody for notes. _Recommendation:_ defer signatures; record an
    RFC 8785 `sha256:` digest of each applied recipe on its run records (a MUST, recipe.md), of
    each note on write (annotations.md), and of the data bytes the notes were written against, so
    a later signature scheme has something to sign.
22. **The name "recipe".** It already names how-to documentation pages
    (`design/element-api/element-api-docs-plan.md`) and convenience snippets (the migration
    plan). _Recommendation:_ keep "recipe" for the document, rename the documentation pages
    "How-to guides".
23. **Result column names in exports.** Scripts in R and Python read them, and a column name that
    changes with what else a session applied breaks them. _Recommendation:_ `<name>.<field>`, where
    `<name>` is the recipe's own `as` for a run a recipe produced and the run's author-assigned id
    or alias otherwise (README "Identifiers" rule 2: `pagerank_2`, `label_propagation`); read
    back as the flat column key `data.pagerank.value`. When two runs would give one name, the export
    is **refused** unless the caller supplies a column-name map (`columnNames`) or asks for
    namespaced names for all of them, so the column a script reads never depends on what was
    applied first. Generated namespace suffixes are digits with no separator (`hubs2`), and
    namespaces and `as` values SHOULD avoid hyphens, which R's `read.csv` rewrites to dots. Beside a
    CSV export, a plain CSV column dictionary (`<name>.columns.csv`: column, run, recipe id, step,
    field, caveat, precision) so R and Python need not parse the JSON sidecar. The design studio's
    `<column>__estimated` and `<column>__missing` caveat columns (door 61) are written for every run
    that was not requested `exact: true`, so the column set depends on the recipe, not on which
    algorithms a release can estimate; the caller may turn them off per run, and they are omitted
    for an algorithm whose catalogue descriptor says it never estimates. A collision with an imported attribute appends `.2` to the
    field. The sidecar data plan declares each result column's origin (run, field, caveat), so a
    name never has to be parsed.
24. **Several graphs in one document.** The condition-comparison workflow
    (`design/designloom/workflows/W24.yaml`) needs two networks and a merged one in one file, and
    moving from one graph to a list later gives every stored reference a graph id it was written
    without. This must be decided before any document other than the style is released.
    It blocks the core of the reproducible-session workflow: until it is made, a session holding a
    full network and its subnetworks cannot be saved as one project (`W25.yaml` is covered only for
    one network). _Recommendation:_ a `graphs` member in envelope version 1, holding one entry per graph with
    its own data, data plan, sets and results, while style, views and annotations stay at the top
    level (the design studio's doors 2 and 5), with an optional `graphId` member on note targets,
    view fits and recipe step scopes that defaults to the only graph. (Not `graph`: that name
    already discriminates the whole-graph note target `{ graph: true }`, and `{ node, graph }`
    would be read two ways.) Until decided, `graphs` can arrive only with envelope version 2, a
    version 1 unit carrying `graphId` lists the feature `graphs` (so an old reader refuses rather
    than binds to the wrong graph), and `saveDocument` refuses a session that holds more than one
    graph -- a comparison's second side, its merged network -- unless the caller narrows the save to
    one graph, in which case every graph and run left out is named with `W_GRAPHTY_GRAPHS`
    (envelope.md, "Saving").
25. **The migration register's list of stable formats.** `design/element-api/element-api-migration.md`
    lists `StyleDocument`, `DataPlan`, `ViewPreset` and `Recipe` as public contracts, but not the
    annotation set or the envelope. _Recommendation:_ add both, and cite this directory.
26. **Shared metadata member names.** `authors`, `license`, `citation`, `doi`, `derivedFrom`,
    `handling`, `createdAt`, `modifiedAt`, `generator`, `features`, on every kind, and the data
    source's query vocabulary (envelope.md, "The data source"). _Recommendation:_ as specified.
27. **Several data inputs and joins.** A data member of named inputs (an edge table plus a node
    table, as graph-io's CSV importer takes them) and data-plan joins of attribute tables onto
    nodes. Open with it: merging several sources, each with its own data plan, into one graph
    (`W09.yaml`, `W13.yaml`), and an identity mapping (aliases from merged ids to the surviving
    id, `W09.yaml` node merging) that note targets resolve through. _Recommendation:_ named
    inputs and exact-key joins in version 1 (envelope.md, data-plan.md); the shapes of `sources`
    (each with its own data plan and a per-attribute precedence by source, "HR wins for title")
    and `aliases` decided before envelope version 1 ships, with the graphs decision, since both
    change what a stored reference means, even if their implementation comes later; until then
    `repeatedNodes: "merge"` reports, when the caller asks (`reportAllConflicts`), every overwritten
    value with its source row, uncapped; identifier-namespace mapping (gene symbol, Entrez,
    UniProt) left to the caller in version 1. Per-input field mapping (one entity file per type,
    each with its own id column, `W13.yaml`) is part of the same decision. The investigation
    workflow (`W09.yaml`) needs `aliases` before any case file is exchanged, so `aliases` is
    **blocking for any evidence use**: until then a note whose target was merged away in the
    session is reported with the id it was merged into, not only as an unknown element, and a
    session with merges keeps `requireDigest` and ordinal edge references working only through the
    original digest (annotations.md, "Reading and applying" rule 9).
28. **Notes and judgement layers in a data export.** _First on the owner's list, and blocking any
    evidence use:_ if it is rejected, notes and suspect highlights flow into every export by
    default. The owner's export decision says an export
    carries everything the format can represent; notes (as a text column) and highlight layers
    (baked as colours) both fit. A "suspects" highlight baked into `viz:color` reveals the same
    judgement leaving the notes out protects, and so do `ids` selectors in the sidecar's style and
    the node ids in the run manifest's parameters. _Recommendation:_ by default leave out notes,
    highlight layers and layers whose selector names elements (`ids`, `member` of a set) from the
    baked appearance and the sidecar, and redact element-valued run parameters, arguments and
    requested scopes in the manifest; the caller includes each explicitly; run the share check
    (envelope.md, "Saving") on the sidecar (export-mapping.md). This narrows the owner's decision
    and needs the owner's agreement.
29. **The layer `id` in a document versus the element's `LayerId`.** `LayerId` is documented as
    element-minted (`graphty-element/src/catalog/types.ts`); `applyTemplate` mints a fresh one
    from the layer's name. _Recommendation:_ the document `id` is an authored key the element
    stores on the layer, exposes through the styles API, writes back in `toDocument()` and uses for
    note binding; `LayerId` stays element-minted.
30. **Save purposes.** _Recommendation:_ `saveDocument` takes `purpose: "project" | "share"`
    (envelope.md, "Saving"), with `project` the default: a person's own save keeps data and notes;
    anything meant for someone else is an explicit share that leaves them out and checks for
    element names, and may include data, annotations or run records only when the caller names
    them, with the check run over them too.
31. **The path model.** Published with style version 1, so a one-way door already partly walked
    through. _Recommendation:_ the flat-key model graphty-element 2.x implements (README, "Paths"):
    a dot is part of a column key, nested objects are not walked, and a quoted segment carries no
    dot; every `knownFields` member read as a raw key. The alternative, JMESPath nesting with quoted
    dotted names, would need style version 2 and a parser change, and 2.x would refuse every style
    that used it.
32. **One spelling for the endpoint and id options.** The same facts have four spellings:
    the data plan's `knownFields` (`edgeSrcIdPath`, `edgeDstIdPath`, `nodeIdPath`), graphty-element's
    format catalogue options (`edgeSource`, `edgeTarget`, `nodeIdPath`, `idColumn`,
    `graphty-element/src/catalog/formats.ts`), and graph-io's CSV import options (`sourceColumn`,
    `targetColumn`, `idColumn`). The catalogue names are already published. _Recommendation:_
    `knownFields` is the one spelling in documents: a `formatOptions` or `data.options` entry naming
    an endpoint or id column is refused in a document (data-plan.md, "Fields"), and the element
    translates `knownFields` into the importer's options itself.
33. **The export API and figure export.** The method name and signature (`ExportResult` with a
    blob, a stream, the manifest and graph-io's `LossNote`), figure and legend export
    (export-mapping.md, "Images"), and **the default element scope of an export**: the element API
    design says `scope` defaults to `"visible"`, and `data-export.yaml` exports a selected subset.
    _Recommendation:_ the element API design's `ExportResult`; an export writes every element by
    default, whatever the active filter hides, with the filter written in the sidecar and the
    manifest, and a caller who passes `scope: "visible"` gets only the kept elements and a loss note
    (`W_GRAPHTY_FILTERED`) naming the predicate and the count dropped; a figure export whose legend
    is included by default, derived as export-mapping.md states, and which for a report page
    appends the page's notes as a numbered caption list naming their targets.
34. **The recipe applier.** A published API: `session.recipes.apply(doc, options)` returning an
    application handle (recipe.md, "Applying"). _Recommendation:_ as specified there.
35. **Extension identity at registration.** Whether registering an algorithm, layout, palette,
    camera view or format records the providing package and version, and whether a plugin
    algorithm or layout must declare a version. Today it does neither
    (`graphty-element/src/catalog/pluginRegistry.ts`; `EngineVersions.plugins` is filled from an
    optional `static version`), so version 1 cannot verify which package provides a key
    (recipe.md, "Extension requirements"). _Recommendation:_ registration takes a required
    `{ package, version }` supplied by the plugin's own module, never by a document; strict
    registration (refusing an already-registered key) is the default; a run of an unversioned
    plugin records `version: null` and the methods text says "unversioned"; a run record's
    `engine.plugins` records `{ package, version }` rather than a bare version. Registration also
    takes declared aliases for a retired key, option name or result field, which the binding
    report resolves and names as it does for built-in names, and plugins are expected to keep the
    stability promise of "Identifiers" rules 4 and 5 within their own major versions.

## Review record

Objections raised in adversarial review, by the design-studio personas and by technical reviewers,
that this specification did not take. Each line says what was raised and why it was not adopted.
Objections that were taken are reflected in the text above and are not listed.

- _Commit the design studio framework files so the door numbers resolve._ Not done here: those files
  belong to the main checkout and are the owner's to commit. Instead every citation of a door
  restates the rule it takes, so the text stands without them.
- _Specify the analysis journal as its own document kind (`graphty-journal`) so a whole
  exploration, with rejected parameter choices, can be handed to a reviewer._ Not adopted:
  whole-session replay is deliberately not a published format (open decision 7). The reserved step
  types cover the null-model and filter steps a recipe will need; the journal stays the element's
  in-session record.
- _Add reference-implementation equivalents (a networkx or igraph function and its parameter
  mapping) to recipe steps._ Not in the recipe format, which names catalogue keys; moved to the
  catalogue as part of open decision 3, with a recommendation to include them.
- _Refuse `source.by: "run"` on imported style layers._ Not adopted as stated: a run-sourced layer
  is how a style says which run it paints, and the duplicate-layer rule depends on it. Instead the
  applier stamps every imported layer with its document and keeps `by: "run"` only when the run id
  binds in the session (style.md).
- _Convert a similarity weight to a distance automatically for path algorithms._ Not adopted for
  version 1: any conversion (1/w, 1-w, -log w) is a modelling choice the author must make. The
  applier refuses a role mismatch with a named code instead (recipe.md, "Weights").
- _Make edge references compare `key` against a new data-plan `edgeKeyPath`._ Not adopted:
  graphty-element's `EdgeMember` reserves `key` and refuses it until the element reads one, and
  these documents reuse `EdgeMember` rather than declare a second edge reference type.
- _Record style layers bound to a recipe's runs by recipe id and step (`source: { recipe, step }`)
  rather than by run id, so a standalone style saved in one session binds to another session's
  application._ Not adopted for style layers in version 1: `source` is the element's published
  `LayerSource` type, frozen with style version 1. A style that travels with its recipe does so in
  one envelope, where paths are written with the recipe's own `as` and round-trip; notes, which are
  unreleased, gained the equivalent (`{ run, recipe }`).
- _Add per-attribute reducers and keep-first or keep-last policies for repeated node records._ Not
  adopted: the data plan takes graph-format's existing `onDuplicateNode` values (`merge`, `error`)
  rather than invent a policy the builder does not implement; richer entity resolution belongs with
  the aliases of open decision 27.
- _Change the date of the export decision to 2026-09-27._ The archive timestamp is
  2026-09-28T04:53Z. The date stands; the convention that every date here is the UTC date of the
  archive timestamp is now stated at the top of this page.
- _Correct the claim that graph-io's Neo4j importer qualifies ids; it keeps one id space and skips
  a colliding row._ Not taken as stated: the importer does qualify, storing a spaced id as
  `Space:id` for every row of the section, the untyped id in an `originalId` column with no role
  and the space in the `idSpace` role (header comment of `graph-io/src/formats/neo4j/importer.ts`);
  its "collision" is a qualified id declared again in another section. The same review did find a
  real error, taken: this specification had put the untyped id in graph-format's `originalId`
  ROLE, which means something else (open decision 13).
- _Allow several named style stacks in a project (`styles` with an active one)._ Not adopted for
  version 1: graphty-element holds one style stack per session, so a project save loses nothing;
  alternative looks travel as separate style files, and a `styles` list could later be added beside
  `style` without breaking it (open decision 17).
- _Restrict colour values in the style schema to hex or named colours._ Not adopted: graphty-element
  2.x accepts and writes CSS colour strings, and every document it wrote is a conforming version 1
  style. The hazard is closed in prose instead: the applier parses every colour into RGBA and an
  export writes only the normalised `#rrggbbaa` form (style.md, export-mapping.md).
- _Add `nameHints` to data-plan `knownFields` so one plan survives a source column rename._ Not
  adopted: a renamed source column is a new version of the source's shape, which is what
  `planVersion` and `sourceVersion` record, and a declared field that no record carries now refuses
  the import (data-plan.md), so the rename is seen instead of guessed around.
- _Validate relationship domain and range (an edge type's allowed end types) in the data plan._ Not
  in version 1: attribute declarations can now be scoped to node and edge types, which covers
  per-type required properties; ontology validation of edge ends is listed as not covered.
- _Edit the design studio's workflow files (`W25.yaml` promising "export as CX2")._ Not done here:
  the designloom workflows are the requirements and the owner's to change. This specification states
  what version 1 delivers to a Cytoscape user instead (export-mapping.md) and flags the promise
  (open decision 20).
- _Run graphty-element 2.x's own style checker over every example in the draft's check scripts._
  Not done in the draft's scripts, which validate JSON only and cannot load the element without a
  build. It is a required conformance test of the implementation instead (style.md,
  "Conformance"); the three contradictions such a test would have caught -- edge references, `top`
  ties and empty layers -- are fixed in style.md.
- _Let a group note drive a canvas label on the cluster._ Deferred with canvas callouts (open
  decision 14): a label on the canvas is presentation, and the view is where it will live.
- _Save several networks (a comparison's two sides, a network and its subnetworks) in envelope
  version 1 now._ Not decided here: it is a published file shape, and the owner has not made open
  decision 24. The text now states plainly that `W25.yaml` is covered for one network only.
- _Prioritise `attribute.compute`, or add a `top`-intersection selector, so "top ten in at least two
  of degree, betweenness and PageRank" is a recorded step._ Not adopted for version 1: combining
  rankings needs a formula language, which is a design of its own; `attribute.compute` stays the
  reserved step type for it, and the exported result columns carry every metric for R or Python to
  combine in the meantime.
- _Record a null model's parameters as a free-form member of the run so the methods text can quote
  them._ Not adopted as a new member: a note on the run (`{ run }` target) already carries free
  text, and `graph.randomize` remains the first step type to specify.
- _Let a data plan declare a composite edge id (`edgeIdPath` as a list of columns)._ Not in version
  1: graph-format stores one edge id column. The composite check an evidence note needs is covered
  instead by letting an edge target's `check` hold several path and value pairs (annotations.md).
- _Accept CURIEs with a `prefixes` map in data-plan `term`s._ Not in version 1: `term` now accepts
  any absolute `http`, `https` or `urn` IRI, which covers FOAF, Dublin Core and OBO; a prefix map is
  a later additive member.
- _Add `closed: true` to the data plan's `types` so an unlisted node type refuses the import._ Not
  in version 1: `types` gained `element`, and a closed type list is a later additive member with a
  feature name; an `enum` constraint on the type column does the job today.
- _Write a script that checks the enumeration table against the schemas._ Not done in the draft's
  scripts; the table now classifies every enumeration in the schemas, and keeping the two in step is
  part of publishing the schemas (open decision 3).
- _Add a compatibility test that runs every version 1 style example through graphty-element 2.x's
  `applyTemplate`, and turn each specification's table of expected outcomes into reader tests._
  Already required of the implementation (style.md, "Conformance"; the tables are its test cases).
  The draft's scripts check JSON only and cannot load the element without a build; the enumerated
  shape, line and arrow values such a test would have caught are now in the style schema.
- _Specify a Python or R binding of the recipe applier._ Not adopted: graphty-element is a
  JavaScript package. A command-line runner and a non-normative script export derived from the
  catalogue's reference-implementation mapping are recommended instead.

## Sources

- Owner statements, from the session archive in `.claudehistory/` (dates are the UTC dates of the
  archive's timestamps): `fac8191f-78c2-4de2-8ae0-bd963cf90bd9.jsonl` (2026-09-04 notes on nodes
  and edges; 2026-09-06 save and load buttons; 2026-09-19 the file-handling requirement;
  2026-09-21 the extension points and the 1.x template defect),
  `3a19ea55-f3cc-4fc0-b85f-842243f52536.jsonl` (2026-09-23 run options on load-time algorithms;
  2026-09-26 "where is export style, export recipe? load style?"; 2026-09-27 overview recipe,
  sharing starting points, "types of exports and imports"),
  `edf07b88-2700-4a9d-93d1-b77a43d817e8.jsonl` (2026-09-28 the export decision "whatever the
  format supports" and the request for formal specifications).
- `design/element-api/element-api-design.md` sections 4.3.6 (export), 4.6.3 and 4.6.3a (the split
  and the envelope), 4.11 (commands, journal, recipes), 4.15.3 (notes), 12 (types).
- `design/element-api/element-api-migration.md` section 6 (public contracts) and the
  `template-split` codemod.
- `design/sets/sets-design.md` sections 4.2 and 12.2 (stable edge identity).
- `design/graph-format/graph-format-design.md` (one node id space, decision Q27).
- `graphty-element/src/catalog/types.ts` (the shipped `StyleDocument`, `LayerSpec`, `Selector`,
  `Binding`, `EdgeMember`, `KNOWN_ALGORITHMS`, `KNOWN_LAYOUT_IDS`, `KNOWN_FORMAT_IDS`),
  `graphty-element/src/catalog/algorithms.ts` (keys, legacy aliases, result fields),
  `graphty-element/src/session/styles/` (`StylesApi.ts`, `Layer.ts`, `channels.ts`,
  `encoding.ts`, `scales.ts`, `predicate.ts`), `graphty-element/src/config/` (`StyleTemplate.ts`,
  `DataConfig.ts`), `graphty-element/src/session/planning.ts`, `graphty-element/src/session/runs/`
  (`RunRecord`, `EngineVersions`), `graphty-element/src/camera/types.ts`,
  `graphty-element/src/catalog/cameras.ts`, `graphty-element/src/Graph.ts` (`applyCameraView`),
  `graphty-element/src/session/statistics.ts`, `graphty-element/CLAUDE.md` ("Extension Points").
- `graphty-element/src/session/limits.ts` (`DEFAULT_LIMITS`), `graphty-element/src/data/ingest.ts`
  (`resolveEdgeWeight`), `graphty-element/src/catalog/formats.ts` (import option names),
  `graphty-element/src/catalog/pluginRegistry.ts`, `graphty-element/src/errors/codes.ts`,
  `graphty-element/src/session/results/types.ts` (`TopRanking`),
  `graphty-element/src/session/styles/selector.ts`.
- `graph-io/src/types.ts` (`ExportCapabilities`, `LossNote`) and each format's exporter;
  `graph-io/src/formats/neo4j/importer.ts` (id spaces), `graph-io/src/formats/csv/importer.ts`
  (comment lines, `CsvImportOptions`);
  `graph-format/src/types/columns.ts` (`ColumnRole`), `graph-format/src/types/builder.ts`
  (`onDuplicateNode`).
- The design studio framework in the main checkout, `design/ui/framework/`:
  `conceptual-model.md` sections 2, 5, 6, 8, 9; `one-way-doors.md` doors 1, 2, 3, 4, 5, 19, 21,
  27, 33, 34, 38, 61, 67, 88, 89; `element-contract.md` section 11.
- `design/designloom/personas/` and `design/designloom/workflows/`, and the capabilities
  `annotation.yaml`, `view-bookmarks.yaml`, `style-presets.yaml`, `analysis-history.yaml`,
  `data-export.yaml` in `design/designloom/capabilities/`.
- Prior art: Vega-Lite specification and 5.0 release notes; kepler.gl schema manager; nbformat
  format description; Jupyter notebook trust; GitHub Actions security hardening; Galaxy tool
  versions; Cytoscape styles and the CX2 specification; GEXF 1.3 viz schema; W3C Web Annotation
  Data Model; RFC 8785 (JSON canonicalization); RFC 7515 (JWS `crit`); Frictionless Data resource
  hashes and Table Schema; OWASP CSV injection guidance; RFC 9485 (I-Regexp); the WHATWG URL
  Standard.
