# graphty document formats

Status: draft specification. Nothing here is released except the style document's version 1
shape, which graphty-element already publishes. Every choice that would be expensive to reverse
once files exist in the wild is listed under "Open decisions" at the end of this page, with a
recommendation, and is not decided by this text.

graphty-element reads and writes graph data in the formats the rest of the ecosystem already uses
(GEXF, GraphML, GML, DOT, Pajek, CSV, JSON dialects, Neo4j exports), through the graph-io package.
Those formats carry a graph. They do not carry what a person did with a graph in graphty: how it
is drawn, which columns mean what, which analyses were run in which order, where the camera was,
or the notes a reader wrote. This directory specifies graphty's own documents for those things.

The owner stated the requirement on 2026-09-19:

> our API needs to account for file handling:
> - loading data, which may be in many formats based on the pre-existing ecosystem of graph formats
> - styles, where graph styles can be saved and loaded independently to apply an existing style to new data
> - analysis, which runs a set of analysis functions on a graph so that new graphs can benefit from complex orders of operations to understand them more quickly -- great for domain specific work
> - annotations, which are notes that are independent from the data so that the data can remain immutable
> - maybe camera views?
> - or one file that combines any of the above

and restated it on 2026-09-27 as "types of exports and imports: recipies, styles, data,
annotations / notes, or combinations of all of the above", adding that a style or a recipe, or
both in one file, "enables communities to share starting points without sharing their data".

## The documents

| Document | `kind` | Specification | Schema | Holds |
|---|---|---|---|---|
| Style | `graphty-style` | [style.md](style.md) | [style.schema.json](style.schema.json) | Style layers: selectors, literal channel values and data-driven encodings, plus any palettes they need |
| Data plan | `graphty-data-plan` | [data-plan.md](data-plan.md) | [data-plan.schema.json](data-plan.schema.json) | Which columns are the node id, edge ends, label, weight, time; how repeated edges and ids are treated; what each attribute measures |
| View | `graphty-view` | [view-preset.md](view-preset.md) | [view-preset.schema.json](view-preset.schema.json) | Named camera views: drawing mode plus a stored camera or a computed framing |
| Recipe | `graphty-recipe` | [recipe.md](recipe.md) | [recipe.schema.json](recipe.schema.json) | An ordered list of analysis and layout steps, and the attributes and extensions it needs from the data it is applied to |
| Annotations | `graphty-annotations` | [annotations.md](annotations.md) | [annotations.schema.json](annotations.schema.json) | Notes on nodes, edges, points, the graph, runs and style layers |
| Envelope | `graphty-document` | [envelope.md](envelope.md) | [envelope.schema.json](envelope.schema.json) | Any subset of the five above, plus the data itself or a reference to it |

How each maps onto the third-party formats graph-io writes is [export-mapping.md](export-mapping.md).

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
  analysed yet. It spends compute, so it is the one document whose application must be agreed
  to.
- **Annotations** belong to a reader. They record a judgement about the graph without editing the
  graph, so the data stays immutable (the owner's reason, 2026-09-19).

Bundling them is the defect the split removes. The 1.x style template
(`graphty-element/src/config/StyleTemplate.ts`) holds appearance, column roles, load-time
algorithm runs, the view mode and a skybox image in one object, so importing "a style" could
rewrite column roles and spend compute. None of the five documents here can do the work of
another: a style cannot start a run, a data plan cannot start a run, a view cannot change data.

The design studio framework (`design/ui/framework/conceptual-model.md` section 8, present in the
main checkout but not yet committed) models the same needs differently (its one-way decisions are numbered "doors" in
`design/ui/framework/one-way-doors.md`, and this specification cites them by number): one file format with
optional parts, where a recipe is "a project file with no data" and a style file is "a recipe
holding only style parts". This specification reconciles the two: the envelope is the one format,
each of the five documents is also a valid envelope member on its own, and a file holding one
member is exactly the "profile" the framework describes. What the framework's recipe carries that
is not analysis (style layers, views) travels here as a sibling member of the same envelope rather
than inside the recipe. Whether a style file is a sibling document or a recipe sub-profile is
listed under "Open decisions".

## Conventions every document follows

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY and
OPTIONAL are to be interpreted as described in RFC 2119 and RFC 8174 when, and only when, they
appear in all capitals.

A **writer** is software that produces a document; a **reader** is software that parses one; an
**applier** is a reader that changes a live graph session from it. graphty-element is all three
for every kind. A **unit** is the smallest independently applicable part of a document: a style
layer, a recipe step, a view, a note.

### Which text is normative

The prose of each specification is normative for behaviour. The JSON Schema file beside it
(JSON Schema draft 2020-12) is normative for structure. TypeScript declarations in the prose are
illustrative and MUST agree with the schema; where prose and schema conflict, that is a defect in
this specification and the stricter reading applies until it is corrected.

### Encoding

1. A document MUST be a single JSON text (RFC 8259) encoded as UTF-8 without a byte order mark,
   and SHOULD conform to I-JSON (RFC 7493): no duplicate member names, numbers representable as
   IEEE 754 binary64.
2. The top-level value MUST be an object with a string member `kind` and an integer member
   `version`.
3. A document MAY carry `$schema`, a URL naming its schema. A reader MUST NOT fetch it and MUST NOT
   make validity depend on it; it exists for editors.
4. Plain ASCII is RECOMMENDED for member names. Values may hold any Unicode text.

### Versioning

`version` is the major version of that document kind. Every kind starts at 1.

1. Within a major version, a change MUST be additive: a new optional member, a new value of an
   open enumeration, a new unit kind. Removing or renaming a member, or changing what an existing
   value means, requires a new major version.
2. A reader MUST accept every major version it implements. graphty-element SHOULD read the current
   major and the one before it, upgrading the older one on read with a function per kind, so a
   file never has to be converted by hand (the pattern of kepler.gl's schema manager; Vega-Lite 5
   likewise kept compiling syntax its schema had dropped).
3. A reader given a major version it does not implement MUST refuse that document (or that
   envelope member) with a typed error naming the version it found and the versions it reads. It
   MUST NOT guess, and MUST NOT return an empty result as if the document were empty.
4. The version of each kind is independent. A style at version 2 inside an envelope at version 1 is
   valid.

### Unknown members, values and units

This is the tolerant-reader rule, as nbformat states it for notebooks: new fields "won't break
existing implementations -- they simply won't be rendered".

1. A reader MUST ignore an object member it does not know, at any depth, and MUST NOT fail
   because of one.
2. A reader that writes back a document it read without applying it -- an upgrade, a re-save, a
   copy between envelopes -- MUST preserve unknown members unchanged. A document written from live
   session state (for example `session.styles.toDocument()`) carries only what the session holds.
3. A value outside a closed enumeration, or a unit of a kind the reader does not know, MUST disable
   or skip that one unit with a reported reason. It MUST NOT fail the document, and MUST NOT fail
   the envelope.
4. A missing optional member takes the default its specification states. No default depends on
   the data or the page.
5. Schema validation is applied per unit. A unit that fails its schema is disabled or skipped with
   a reason; only a failure of the document's own top level (not an object, a missing `kind` or
   `version`, the unit list not an array) refuses the document.

### Identifiers

1. Every unit that another part of a document, or a later edit, may refer to carries an `id`:
   recipe steps, views, notes and (optionally, see style.md) style layers. An `id` MUST be unique
   within its list and SHOULD be stable across re-saves. Adding ids later is what nbformat had to
   retrofit in format 4.5; these documents have them from the first version.
2. A run id that a document persists MUST be author-assigned (the `as` of a run), never derived,
   and MUST match graphty-element's `RUN_ID_PATTERN`, `^[a-z][a-z0-9_-]*$`
   (`graphty-element/src/session/runs/types.ts`). A derived id is a function of the algorithm and
   the scope, so it resolves differently against a different session
   (`graphty-element/src/session/runs/runId.ts`).
3. Keys naming an extension (palette id, algorithm key, layout id, camera id, format id) are the
   keys the element's catalogue publishes. A document naming a key this installation has not
   registered keeps it and reports it unresolved, naming the key (see "Extensions" below).

### Extension data

1. A document and every unit MAY carry `extensions`, an object whose member names are
   reverse-domain names (`org.example.tool`). The name `graphty` and names starting `graphty.` are
   reserved for graphty-element. Readers MUST NOT interpret an extension they do not know and MUST
   preserve it under the unknown-members rule.
2. The existing `userData` members of style layers and notes are kept; they round-trip untouched
   and are never interpreted by graphty-element.

## The dataset a document was authored against

Style, data plan, view, annotations and envelope documents MAY carry `fingerprint`, the identity
of the graph they were written against.

1. The value MUST be `"<scheme>:<hex>"`. The scheme names the algorithm, so it can change without
   ambiguity (the Frictionless Data convention of prefixing a hash with its algorithm).
2. Scheme `g1` is the hash graphty-element computes today (`computeFingerprint` in
   `graphty-element/src/session/statistics.ts`): FNV-1a over two 32-bit lanes of the node count,
   edge count, direction, the node ids in index order and the adjacency, written as 16 lower-case
   hex digits. It covers topology only: attributes and positions are not in it. It is sensitive
   to node order, so the same graph loaded from a file with its rows in a different order has a
   different `g1` fingerprint. Whether to replace it with an order-independent scheme before any
   document persists it is an open decision.
3. A fingerprint is advisory and MUST NOT gate anything. An applier compares it with the current
   graph's and reports one of `match`, `differs` or `unknown` (no fingerprint, or a scheme the
   reader does not compute). Applying a style to different data is the reason styles are
   separate documents (element API design section 4.6.3a).
4. A fingerprint is not a security measure. It detects "made for a different file", not
   tampering.

## Applying a document to new data

Every document binds to a graph by names and declared meanings, never by an opaque dataset id.
kepler.gl binds a saved map to its data by dataset id and Neo4j Bloom binds a perspective to its
database; both mean a configuration cannot be reused on new data, which is the owner's first
requirement for styles.

| Document | Binds by | A unit that does not bind |
|---|---|---|
| Style | attribute paths (`data.<name>`), run result paths (`results.<runId>.<field>`), kept set ids, node and edge ids in an `ids` selector, palette ids | is added to the stack disabled, with the reason and the paths it needs; the other layers apply |
| Data plan | column names in the incoming records | the named column is reported missing; the element's default for that field applies (for example probing `source`/`target`) |
| View | nothing, for a framing; the scene coordinates of the current layout, for a stored camera | a framing always binds; a stored camera always applies but is reported as authored for another graph when the fingerprint differs |
| Recipe | its declared requirement slots: attributes by name hint, measurement level and role; extensions by key | the step is skipped with the reason; later steps that need its result are skipped too; the others run |
| Annotations | node ids, edge identities, run ids and layer names | the note is kept and marked orphaned, never dropped |

Every applier returns a **binding report** with the same shape for every kind (the element API
design's `BindingReport`, section 12):

```ts
interface BindingReport {
  readonly bound: number;                 // units that now take effect
  readonly disabled: readonly {           // units kept but not in effect, one entry each
    what: string;                         // the unit's id or name
    reason: string;                       // one sentence a reader can act on
    code: GraphtyErrorCode;               // e.g. E_UNKNOWN_PALETTE, E_UNKNOWN_ALGORITHM
  }[];
  readonly unresolvedPaths: readonly string[];
  /** Units that would bind after work the caller has not agreed to (a recipe run). */
  readonly needsRerun?: readonly { what: string; estimateSeconds: number }[];
}
```

The style applier graphty-element ships today returns a narrower `TemplateReport`
(`{ applied, unbound }`, `graphty-element/src/session/styles/StylesApi.ts`). Conformance to this
specification requires the `BindingReport` shape; `TemplateReport` can remain as the style-specific
detail beside it.

## Combining documents

Documents may be applied one at a time, in any order, or together in one envelope.

| Kind | Applying a second document of the same kind |
|---|---|
| Style | appends its layers above the authored layers already present (below any hand-edit layer), in document order. Replacing the stack is an explicit option of the applier, not the default |
| Data plan | takes effect at the next import. A data plan applied to a graph already loaded is reported as `needsReimport`; it never rewrites a loaded graph |
| View | adds its views to the list; an applied view moves the camera, and the last applied wins |
| Recipe | appends its steps' runs. Run ids that collide with runs already present are resolved by namespacing (recipe.md, "Applying") |
| Annotations | merges by note id. An incoming note whose id is held with different content is added under a new id and reported; nothing is overwritten |

Inside one envelope the order is fixed: data plan, data, recipe, style, view, annotations
(envelope.md, "Opening"). The recipe precedes the style so that layers bound to the recipe's runs
find them; the view follows both so a framing fits the laid-out graph; annotations come last so
their targets exist.

## File names and media types

Undecided (see "Open decisions"). The recommendation:

- Every JSON document, of any kind, uses the extension `.graphty.json` and the media type
  `application/vnd.graphty+json`; the `kind` member says which document it is. A reader MUST
  dispatch on `kind`, never on the file name. Writers SHOULD name files `<name>.<kind
  suffix>.graphty.json` (`publication.style.graphty.json`, `hub-genes.recipe.graphty.json`) so a
  person can tell them apart in a folder.
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
   string that is then evaluated; substitutions replace whole JSON values (recipe.md). This is
   the lesson of script injection through interpolated inputs in GitHub Actions workflows.
2. **Nothing is fetched without the caller's consent.** `$schema` is never fetched. A data URL in
   an envelope, and any source a recipe names, is fetched only after the caller agrees to the
   named host (the design studio's rule for recipes arriving by file or by link).
3. **No extension is installed by a document.** A document names extension keys; it never names a
   package to download or a URL to import. A missing extension makes its units unresolved. It may
   record the package and version that provided a key so a person knows what to install
   (recipe.md, `requires.extensions`).
4. **Compute is agreed to.** Opening a document never starts an algorithm run unless the caller
   asked for the recipe to run. Until then the recipe is planned, estimated and reported in
   `needsRerun`.
5. **Readers bound their work.** A reader SHOULD refuse, with a typed error, a document larger
   than a configured limit (RECOMMENDED default 64 MB for a JSON document) and SHOULD bound
   nesting depth, so a hostile file cannot exhaust the page.
6. A fingerprint and any digest are integrity hints, not authentication. Signed recipes are not
   specified here (see "Open decisions").

## Where the documents live in the packages

graphty-element owns every document: parsing, validating, upgrading, binding, applying, writing
and the binding reports. This follows the architectural rule that graphty-element is
self-sufficient and the graphty app only consumes it (root `CLAUDE.md`, "Architectural
Principles"): a third party who installs graphty-element and nothing else must be able to save
and open every document the graphty app can. The app draws the Save and Load controls the owner
asked for ("where is export style, export recipe? load style?", 2026-09-26) and calls the
element.

The app currently holds placeholders that point the other way: the Data panel's "Run a recipe..."
entry carries a comment calling recipes "new work, app"
(`graphty/src/components/shell/panel/DataPanel.tsx`), and the Present panel offers a Cytoscape
CX2 export the element cannot produce (`graphty/src/components/shell/panel/PresentPanel.tsx`).
Recipe storage, binding and replay belong in graphty-element; CX2 export belongs in graph-io and
graphty-element.

| Document | Element API today | Designed (element API design) |
|---|---|---|
| Style | `session.styles.toDocument()`, `session.styles.applyTemplate(doc)` (shipped in 2.x) | unchanged, plus the `BindingReport` |
| Data plan | the internal `DataConfig` inside the 1.x template | `DataPlan`, applied at import |
| View | `Graph.exportCameraPresets()` / `importCameraPresets()`, an unversioned map of Babylon camera states | `ViewPreset`; `camera.bookmark()` / `apply()` |
| Recipe | `session.run({ op: "algo.run", ... })` and `runs.batch(RunSpec[])` | `journal.export()` and `journal.replay()` |
| Annotations | none | `session.notes.toDocument()` / `applyDocument()` |
| Envelope | none | `data.openDocument()` / `data.saveDocument()` |

The JSON Schema files here are the drafts of what graphty-element will publish. Where and under
what export path is an open decision.

### Relation to the graph-format migration's export API

The graph-format migration (plan: `design/graph-format/migration-plan.md` on branch
`feat/graph-format-migration`) adds an element export API that writes every graph-io format and
deprecates the plugin method `Algorithm.algorithmGraph()` in favour of a snapshot accessor. Two
consequences for these documents:

- The owner decided what an export contains on 2026-09-28: "whatever the format supports", which
  means data, positions, algorithm results as attributes and resolved style values wherever the
  target format has a place for them, with everything else reported as a loss note, never dropped
  silently. [export-mapping.md](export-mapping.md) is written to that decision. The migration
  plan's `element-export-api` item still describes an export of "the data bags and current
  positions" and still lists the contents as an owner question; that text is stale and should be
  updated to the decision.
- Recipes name algorithms by catalogue key and never depend on how a plugin reads the graph, so
  replacing `algorithmGraph()` with the snapshot accessor changes nothing in these formats.

## Reviewing personas and workflows

These design studio personas (`design/designloom/personas/`) exercise the formats hardest; their
workflows (`design/designloom/workflows/`) are the acceptance scenarios the worked examples draw
from.

| Persona file | Why | Workflow files |
|---|---|---|
| `genomics-cytoscape-user.yaml` | measures everything against Cytoscape's session file, style files and CX; needs several networks in one file and exported legends | `W20.yaml`, `W21.yaml`, `W22.yaml`, `W23.yaml`, `W24.yaml`, `W25.yaml` |
| `bioinformatics-researcher.yaml` | reproducible, citable pipelines others can run; parameters for peer review | `W20.yaml`, `W22.yaml`, `W25.yaml` |
| `analyst-alex.yaml` | the primary recipe consumer: "no way to save analysis patterns" | `W03.yaml`, `W15.yaml` |
| `expert-emma.yaml` | hand-authors, diffs and round-trips files; exports to R and Python | `W03.yaml`, `W18.yaml` |
| `intelligence-analyst.yaml` | annotations as evidence, provenance, and never fetching an untrusted source | `W06.yaml`, `W09.yaml`, `W15.yaml` |
| `knowledge-engineer.yaml` | column roles, node types and identity, schema evolution | `W13.yaml`, `W18.yaml` |

## Open decisions

Each item below is a one-way door: a file format, a published name, a published default or a URL
that would be expensive to change once files or consumers depend on it. None is decided by this
specification. The recommendation is what the specifications are written to; rejecting one changes
the text that cites it.

1. **Container, extensions and media types.** One JSON document for everything, a zip `.graphty`
   for everything, or both. *Recommendation:* JSON (`.graphty.json`,
   `application/vnd.graphty+json`) for every document and for envelopes whose data is text or a
   reference; the zip `.graphty` (`application/vnd.graphty.project+zip`) with an envelope as its
   manifest for projects that embed binary graph parts. Also the design studio's door 1.
2. **The `kind` strings and a discriminator on every document.** Today only the envelope has
   `kind`; a 2.x style document is `{ version, layers, palettes? }`. *Recommendation:*
   `graphty-style`, `graphty-data-plan`, `graphty-view`, `graphty-recipe`, `graphty-annotations`,
   `graphty-document`; readers accept a style document with no `kind` as `graphty-style` version
   1 forever, because 2.x already writes that shape.
3. **The schema URLs and where the schemas are published.** *Recommendation:*
   `https://graphty.app/schema/documents/<kind>/v<major>.json`, and the same files exported from
   graphty-element as `@graphty/graphty-element/schemas/<kind>.v<major>.json`.
4. **New error and loss-note codes.** Codes are a published contract. Today the style applier
   refuses an unknown version with `E_BAD_COMMAND`. *Recommendation:* `E_UNSUPPORTED_VERSION`, the
   code graph-format already uses for its wire form, for every kind, keeping `E_BAD_COMMAND` for
   malformed content; `E_UNKNOWN_ELEMENT` for a note whose node or edge is not in the graph; and the
   `W_GRAPHTY_*` loss-note codes of export-mapping.md.
5. **The fingerprint scheme.** *Recommendation:* define `g2`, an order-independent hash over the
   sorted node ids and the sorted edge list, before the first document persists a fingerprint,
   and never write `g1` into a file; if `g1` must ship, write it with its prefix so it can be
   retired.
6. **Style file: sibling document or recipe profile.** *Recommendation:* sibling document (this
   specification), because the style document is already published and a style must be applicable
   without the recipe machinery; "a recipe and a style in one file" is an envelope with both
   members.
7. **Recipe shape.** A replayed journal of any command (element API design section 4.11), a
   declarative profile bound through slots (design studio door 19), or the hybrid specified in
   recipe.md: declared requirement slots plus steps that reuse the command union's `op` shapes.
   *Recommendation:* the hybrid, with version 1 steps limited to `algo.run` and `layout.set`, and
   whole-session replay left to the journal, not the recipe format.
8. **Recipe identity, namespacing and the overview recipe.** *Recommendation:* the design studio's
   rules (doors 19 and 33): a stable recipe id, version and optional canonical source; run ids
   namespaced `<ns>__<id>` when applied; graphty-element ships a "General" overview recipe that a
   consumer and a project can replace.
9. **Load-time runs.** The element API design keeps `runOnLoad` in the data plan, which puts
   compute in the column-roles document. *Recommendation:* move it to the recipe (data-plan.md),
   as the migration register's template-split codemod already assumes.
10. **Data plan vocabulary.** Three spellings exist: the code's `DataConfig.knownFields`, the
    design's `DataPlan.knownFields`, and the design's `ImportPlan`. *Recommendation:* the code's
    names, graph-format's `ColumnRole` and `DuplicatePolicy` values, plus attribute-level
    measurement level and weight role (design studio door 21: `distance | similarity | capacity`,
    with `signed`).
11. **What a view holds.** *Recommendation:* a list of named views, each a drawing mode plus a
    renderer-neutral stored camera or a framing by camera-view id (view-preset.md). The design
    studio's fuller saved view (filter steps, enabled layers, stored positions, caption) is added
    later under the same kind; it is additive.
12. **Standalone annotations.** The owner listed annotations as an independent file type; the
    design studio rejected a notes-only file. *Recommendation:* offer it (annotations.md), with
    the studio's concern answered by the binding rule: notes keyed by element id bind only to
    matching ids and are otherwise kept as orphaned.
13. **Edge and node identity in notes and selectors.** An edge reference cannot use the session
    edge counter. *Recommendation:* the file's edge id when it has one, otherwise source, target
    and ordinal among that pair's edges; a node reference gains an optional node type when the
    data declares types (design studio doors 3 and 4).
14. **Canvas callouts and shapes.** The designloom annotation capability asks for text boxes,
    leader lines and highlight shapes anchored to the canvas. *Recommendation:* exclude them from
    annotations version 1; they are presentation, and belong to a later view version.
15. **Carried palettes.** Today a style document carrying a palette nobody registered is refused
    whole with `E_UNKNOWN_PALETTE`. *Recommendation:* an applier registers a carried palette
    whose id is not yet registered, reports it, and never replaces a registered palette of the
    same id; built-in palette ids stay reserved.
16. **Per-layer or whole-document failure of a style.** Today one refused layer refuses the whole
    style document. *Recommendation:* per layer, as the element API design says ("one member
    failing never fails the open"); a refused layer is added disabled with its reason.
17. **Envelope members beyond the six.** Kept sets, the configuration document, layout settings,
    the background and the selection style have no member. *Recommendation:* layout travels as a
    recipe step; kept sets get a `sets` member when the project file ships (the sets design defers
    their stored form to it); background and configuration stay out of version 1 and the 1.x
    upgrade reports them.
18. **Embedding graphty documents inside third-party files.** GraphML and GEXF could carry a
    style or recipe as a graph-level string attribute. *Recommendation:* do not embed in version
    1; write an envelope beside the export that references it (export-mapping.md).
19. **Third-party export writers.** Whether a plugin can register a writer is still open in the
    migration plan. *Recommendation:* writers stay graph-io's (as the extension-points design
    says), and a missing writer is new graph-io work, not an element extension point.
20. **Style writers for GraphML, DOT, GML and Cytoscape JSON in graph-io.** "Whatever the format
    supports" is only true for GEXF today. *Recommendation:* add them, in the order GraphML
    (yFiles), DOT, Cytoscape JSON, GML (export-mapping.md).
21. **Signed or hashed recipes.** The intelligence and fraud personas need a recipe's integrity
    to be checkable. *Recommendation:* defer; record a `sha256:` digest of the canonical form
    (RFC 8785) on each applied-recipe record so a later signature scheme has something to sign.
22. **The name "recipe".** It already names how-to documentation pages
    (`design/element-api/element-api-docs-plan.md`) and convenience snippets (the migration
    plan). *Recommendation:* keep "recipe" for the document, rename the documentation pages
    "How-to guides".
23. **Result column names in exports.** Scripts in R and Python read them. *Recommendation:*
    `<runId>.<field>`, mirroring the path a style reads, with the design studio's
    `<column>__estimated` and `<column>__missing` caveat columns (door 61).
24. **Several graphs in one document.** The condition-comparison workflow
    (`design/designloom/workflows/W24.yaml`) needs two networks and a merged one in one file, and
    moving from one graph to a list later gives every stored reference a graph id it was written
    without. *Recommendation:* the envelope's `graphs` member, reserved now, holding one entry per
    graph with its own data, data plan, sets and results, while style, views and annotations stay
    at the top level (the design studio's doors 2 and 5).
25. **The migration register's list of stable formats.** `design/element-api/element-api-migration.md`
    lists `StyleDocument`, `DataPlan`, `ViewPreset` and `Recipe` as public contracts, but not the
    annotation set or the envelope. *Recommendation:* add both, and cite this directory.

## Sources

- Owner statements, from the session archive in `.claudehistory/`:
  `fac8191f-78c2-4de2-8ae0-bd963cf90bd9.jsonl` (2026-09-04 notes on nodes and edges; 2026-09-06
  save and load buttons; 2026-09-19 the file-handling requirement; 2026-09-21 the extension
  points and the 1.x template defect), `3a19ea55-f3cc-4fc0-b85f-842243f52536.jsonl` (2026-09-23
  run options on load-time algorithms; 2026-09-26 "where is export style, export recipe? load
  style?"; 2026-09-27 overview recipe, sharing starting points, "types of exports and imports"),
  `edf07b88-2700-4a9d-93d1-b77a43d817e8.jsonl` (2026-09-28 the export decision "whatever the
  format supports" and the request for formal specifications).
- `design/element-api/element-api-design.md` sections 4.3.6 (export), 4.6.3 and 4.6.3a (the split
  and the envelope), 4.11 (commands, journal, recipes), 4.15.3 (notes), 12 (types).
- `design/element-api/element-api-migration.md` section 6 (public contracts).
- `graphty-element/src/catalog/types.ts` (the shipped `StyleDocument`, `LayerSpec`, `Selector`,
  `Binding`), `graphty-element/src/session/styles/` (`StylesApi.ts`, `channels.ts`),
  `graphty-element/src/config/` (`StyleTemplate.ts`, `DataConfig.ts`),
  `graphty-element/src/session/planning.ts`, `graphty-element/src/session/runs/`,
  `graphty-element/src/camera/types.ts`, `graphty-element/src/catalog/cameras.ts`,
  `graphty-element/src/session/statistics.ts`, `graphty-element/CLAUDE.md` ("Extension Points").
- `graph-io/src/types.ts` (`ExportCapabilities`, `LossNote`) and each format's exporter;
  `graph-format/src/types/columns.ts` (`ColumnRole`).
- The design studio framework in the main checkout, `design/ui/framework/`:
  `conceptual-model.md` sections 2, 5, 6, 8, 9; `one-way-doors.md` doors 1, 2, 3, 4, 5, 19, 21,
  27, 33, 34, 38, 61, 67, 88, 89; `element-contract.md` section 11.
- `design/designloom/personas/` and `design/designloom/workflows/`, and the capabilities
  `annotation.yaml`, `view-bookmarks.yaml`, `style-presets.yaml`, `analysis-history.yaml`,
  `data-export.yaml` in `design/designloom/capabilities/`.
- Prior art: Vega-Lite specification and 5.0 release notes; kepler.gl schema manager; nbformat
  format description; Jupyter notebook trust; GitHub Actions security hardening; Galaxy tool
  versions; Cytoscape styles and the CX2 specification; GEXF 1.3 viz schema; W3C Web Annotation
  Data Model; RFC 8785 (JSON canonicalization); Frictionless Data resource hashes and Table
  Schema.
