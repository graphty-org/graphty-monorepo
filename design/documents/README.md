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

| Document | `kind` | Specification | Schema | Holds |
|---|---|---|---|---|
| Style | `graphty-style` | [style.md](style.md) | [style.schema.json](style.schema.json) | Style layers: selectors, literal channel values and data-driven encodings, plus any palettes they need |
| Data plan | `graphty-data-plan` | [data-plan.md](data-plan.md) | [data-plan.schema.json](data-plan.schema.json) | Which columns are the node id, edge ends, label, weight, time; how repeated edges and ids are treated; what each attribute measures; which attribute tables join onto the nodes |
| View | `graphty-view` | [view-preset.md](view-preset.md) | [view-preset.schema.json](view-preset.schema.json) | Named camera views: drawing mode plus a stored camera or a computed framing |
| Recipe | `graphty-recipe` | [recipe.md](recipe.md) | [recipe.schema.json](recipe.schema.json) | An ordered list of analysis and layout steps, the attributes, arguments and extensions it needs, and (once applied) how it was bound |
| Annotations | `graphty-annotations` | [annotations.md](annotations.md) | [annotations.schema.json](annotations.schema.json) | Notes on nodes, edges, groups, points, the graph, runs and style layers |
| Envelope | `graphty-document` | [envelope.md](envelope.md) | [envelope.schema.json](envelope.schema.json) | Any subset of the five above, plus the data itself or a reference to it, the record of every run, kept sets and stored results |

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
   (`"sed": 7` for `"seed": 7`) into an error before the file is shared. Publishing the strict
   profile beside the schemas is part of open decision 3.
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
     Readers MUST hold document objects in null-prototype objects or maps, so that no merge,
     preservation or copy step can write into a shared prototype;
   - an expression (a selector `where`, a `has`, `top` or `by` path, a recipe `where`): at most
     1024 characters and 32 levels of nesting, checked before the parser recurses; a longer one
     disables its unit with `E_BAD_SELECTOR`;
   - per document: 10,000 layers, 100 palettes of at most 256 colours, 100,000 ids in one `ids`
     selector, 1,000 recipe steps, 1,000 views, 100,000 notes, and 64 KB per free-text string.
     Beyond a count, the extra units are refused and reported, not silently dropped; the rest of
     the document applies.
6. Any exception raised while applying one unit -- typed or not, including a stack overflow in a
   parser -- MUST be caught and converted into that unit's disabled entry with `E_BAD_COMMAND`. It
   MUST NOT abort the rest of the document.

### Paths

Several documents name a field inside a record: a selector path, a data-plan field, a recipe slot's
attribute name, an export column. One grammar applies everywhere.

1. A **field path** is one or more segments joined by `.`. A segment is an identifier
   `[A-Za-z_][A-Za-z0-9_]*`, or a quoted identifier: a JSON string in double quotes
   (`"adj.P.Val"`, `"http://schema.org/name"`, `"hubs-2__score"`). This is JMESPath's own field
   syntax, restricted to fields: no functions, filters, projections or slices.
2. Selectors and recipe predicates are full JMESPath expressions evaluated by graphty-element's own
   interpreter over the root `{ data: {...}, results: { <runId>: {...} } }`; the field paths inside
   them follow rule 1. An attribute whose name is not an identifier MUST be written quoted:
   ``data."adj.P.Val" < `0.05` ``. Unquoted, `data.adj.P.Val` reads three nested fields and matches
   nothing.
3. Data-plan `knownFields` values, attribute declaration `name`s and join keys are field paths
   (rule 1), never full expressions. A plain column name that is an identifier is itself a field
   path; a column named `combined.score` is written `"\"combined.score\""` in JSON. A reader MUST
   refuse any other syntax there with `E_BAD_COMMAND`. graphty-element today evaluates these
   values with a full JMESPath library (`DataManager`); conformance requires the restricted
   grammar, which also removes a stack-exhaustion attack through deeply nested expressions.
4. A writer prints a path it has rewritten (recipe namespacing, slot binding) with the element's
   `quotePath` rule: a segment that is not an identifier is quoted. An unquoted hyphen is
   arithmetic in the element's expression lexer.

### Versioning

`version` is the major version of that document kind. Every kind starts at 1.

1. Within a major version, a change MUST be additive: a new optional member, a new value of an
   open enumeration, a new unit kind. Removing or renaming a member, or changing what an existing
   value means, requires a new major version.
2. **The style document's version 1 is frozen to the values graphty-element 2.x accepts.** 2.x is
   released and its reader refuses the whole document for one unknown channel, selector kind,
   scale or layer kind (`applyTemplate` throws on the first layer `checkLayerSpec` refuses). It
   checks values, not member names, so a new optional member is still additive for it. A style
   that uses a channel, selector kind, scale or layer kind 2.x does not know MUST therefore be
   written as style version 2, which 2.x refuses with a version message rather than a confusing
   layer error. For the other kinds, which no released reader reads, rule 1 applies as written.
3. A reader MUST accept every major version it implements. graphty-element SHOULD read the current
   major and the one before it, upgrading the older one on read with a function per kind, so a
   file never has to be converted by hand (the pattern of kepler.gl's schema manager; Vega-Lite 5
   likewise kept compiling syntax its schema had dropped).
4. A reader given a major version it does not implement MUST refuse that document (or that
   envelope member) with `E_UNSUPPORTED_VERSION` and details `{ kind, found, reads }` (open
   decision 4). It MUST NOT guess, and MUST NOT return an empty result as if the document were
   empty.
5. A writer MUST write the lowest major version that can express the content, and MUST keep the
   version it read when nothing needing a newer one was added, so opening and re-saving a file
   never locks out a colleague on the previous release.
6. The version of each kind is independent. A style at version 2 inside an envelope at version 1 is
   valid.
7. **Must-understand features.** A document or a unit MAY carry `features`, an array of feature
   names it cannot be read correctly without. Version 1 of every kind defines no feature names;
   later minor additions whose silent omission would change a result (a selector that negates, a
   recipe step type that filters, a node type on a note target) are given one, and writers MUST
   list the ones they use. A reader that does not know a listed feature MUST refuse the unit that
   lists it (or the document, when listed at the top level) with `E_UNSUPPORTED_FEATURE`, naming
   it. This is the answer to an old reader that would otherwise ignore a new member and paint, run
   or bind the opposite of what the author meant; compare the JWS `crit` header.

Enumerations are open or closed. An **open** enumeration may grow within a major version, and a
reader that meets an unknown value disables the smallest unit holding it and reports it. A
**closed** enumeration only changes with a major version.

| Kind | Open (may grow) | Closed |
|---|---|---|
| Style | selector `match`, `scale` (both frozen for version 1, see rule 2), channel names (frozen likewise), layer `kind`, layer `source.by` | `target` |
| Data plan | attribute `role`, attribute `type` | `repeatedEdges`, `idCoercion`, `directed`, `level`, `weightRole`, `missingEndpoints`, join `match` |
| View | camera `projection`, view `mode` | -- |
| Recipe | step `op`, scope kinds, argument `type`, extension requirement `kind` | `level`, `weightRole` |
| Annotations | note target kinds, note `status` | -- |

A closed enumeration's unknown value can only arrive in a document of a newer major version, which
the reader has already refused, except in the data plan, where it refuses the plan (data-plan.md).

### Unknown members, values and units

This is the tolerant-reader rule, as nbformat states it for notebooks: new fields "won't break
existing implementations -- they simply won't be rendered". Rule 7 of "Versioning" is its
safety valve for members that must not be ignored.

1. A reader MUST ignore an object member it does not know, at any depth, and MUST NOT fail
   because of one. It MUST list each one in the binding report as a warning,
   `W_UNKNOWN_MEMBER`, with its JSON pointer (`/steps/0/command/sed`), so a misspelling is seen.
   Exception: the data plan refuses an unknown member of its top level or of `knownFields`
   (data-plan.md), because those members decide the graph's topology and identity.
2. An applier MUST keep, for each unit, the unknown members and `extensions` it arrived with, on
   the live unit, and every writer -- including one writing from live session state
   (`toDocument()`, `saveDocument()`, the autosave) -- MUST write them back unchanged. A document
   re-saved without being applied keeps every unknown member at every depth.
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
   `__`, which is reserved for the namespace separator (recipe.md).
3. Keys naming an extension (palette id, algorithm key, layout id, camera id, format id) are the
   keys the element's catalogue publishes. A document naming a key this installation has not
   registered keeps it and reports it unresolved, naming the key.
4. **Catalogue keys are stable.** A key any document may name is never removed or renamed within a
   major version of graphty-element. A retired key stays as an alias that resolves, with the
   parameters it implies, and the binding report names the current key (graphty-element already
   keeps the 1.10 keys this way: `scc` resolves to `components` with `{ strength: "strong" }`,
   `dijkstra` to `shortest-path`). Writers MUST write the current key. A semantic layout id
   (`force`) may change engine in a minor release, so a writer records the resolved engine in the
   run record (envelope.md, "Run records").

### Extension data and shared metadata

1. A document and every unit MAY carry `extensions`, an object whose member names are
   reverse-domain names (`org.example.tool`). The name `graphty` and names starting `graphty.` are
   reserved for graphty-element. Readers MUST NOT interpret an extension they do not know and MUST
   preserve it under the unknown-members rule. The same name pattern applies to every
   `extensions` object, at any level.
2. The existing `userData` members of style layers and notes are kept; they round-trip untouched
   and are never interpreted by graphty-element.
3. Every document and the envelope MAY carry the same descriptive metadata, so a starting point, a
   style or a project can be cited and licensed on its own:
   - `authors`: `[{ name, url?, orcid? }]`; `url` MUST be an `https:` URL and a renderer MUST NOT
     make a link of any other scheme;
   - `license`: an SPDX identifier;
   - `citation`: free text, and `doi` when there is one;
   - `derivedFrom`: `{ kind, id?, version?, digest? }`, the document this one was adapted from.
     A writer that saves a document adapted from one it applied MUST write it; licences such as
     CC-BY require the attribution;
   - `handling`: `{ marking: string, note? }`, a handling or sensitivity marking such as "do not
     forward". Writers preserve it; appliers show it before a re-save or export. The marking
     vocabulary is open.
   The member names are part of open decision 26.

### Writer output form

A writer SHOULD write the same bytes for the same content, so a file kept in version control
diffs only where something changed:

1. members in the order of the schema's `properties`, unknown members after them in the order read;
2. arrays in document order; two-space indentation; a trailing newline;
3. `createdAt` is written once and never rewritten; a writer that changes content writes
   `modifiedAt` (RFC 3339) instead.

The canonical form used for digests is RFC 8785 (JSON Canonicalization Scheme), not this display
form.

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
   both a stored camera and a framing uses the stored camera only when the fingerprint matches
   (view-preset.md). A reader compares it with the current graph's and reports one of `match`,
   `differs` or `unknown` (no fingerprint, or a scheme the reader does not compute); `unknown` is
   treated as `match` for that one exception, and reported. Applying a style to different data is
   the reason styles are separate documents (element API design section 4.6.3a).
5. A fingerprint is not a security measure. It detects "made for a different file", not
   tampering. A data digest (envelope.md) is the check for "these exact bytes".

## Applying a document to new data

Every document binds to a graph by names and declared meanings, never by an opaque dataset id.
kepler.gl binds a saved map to its data by dataset id and Neo4j Bloom binds a perspective to its
database; both mean a configuration cannot be reused on new data, which is the owner's first
requirement for styles.

| Document | Binds by | A unit that does not bind |
|---|---|---|
| Style | attribute paths (`data.<name>`), run result paths (`results.<runId>.<field>`), kept set ids, node ids and stable edge references in an `ids` selector, palette ids | is added to the stack disabled, with the reason and the paths it needs; the other layers apply |
| Data plan | column names in the incoming records | the named column is reported missing; the element's default for that field applies (for example probing `source`/`target`) |
| View | nothing, for a framing; the scene coordinates of the current layout, for a stored camera | a framing always binds; a stored camera always applies but is reported as authored for another graph when the fingerprint differs |
| Recipe | its declared requirement slots: attributes by name, hint, measurement level and role; arguments by caller input; extensions by key | the step is skipped with the reason; later steps that need its result are skipped too; the others run |
| Annotations | node ids, stable edge references, group members, run ids and layer ids | the note is kept and marked orphaned (or pending, for a run a recipe will produce), never dropped |

Node ids are compared after the same coercion the import applied (`idCoercion`, data-plan.md): with
`canonical`, the text `"1042"` and the number `1042` are one id, and `"01"` stays the text `"01"`.
This applies to note targets, `ids` selectors, set members and argument values.

Every applier returns a **binding report** with the same shape for every kind. It is the element API
design's `BindingReport` (section 12), extended with the facts the kind specifications require
reported:

```ts
interface BindingReport {
  readonly bound: number;                 // units that now take effect
  readonly disabled: readonly Problem[];  // units kept but not in effect, one entry each
  readonly unresolvedPaths: readonly string[];
  /** Units that would bind after work the caller has not agreed to (a recipe run). */
  readonly needsRerun?: readonly { what: string; estimateSeconds: number; exact?: boolean; precision?: "f32" | "f64" }[];
  /** A data plan applied after load: it takes effect at the next import. */
  readonly needsReimport?: boolean;
  readonly fingerprint?: "match" | "differs" | "unknown";
  /** Incoming units given a new id because theirs was taken. */
  readonly renamed?: readonly { from: string; to: string }[];
  /** Facts that are not failures: a converted camera, a registered palette, a version difference,
      a stale quote, an unknown member, a match count. */
  readonly notices?: readonly Problem[];
  /** Recipes only. */
  readonly recipe?: RecipeBinding;        // recipe.md, "The recipe binding report"
}
interface Problem {
  what: string;                           // the unit's id or name, or a JSON pointer
  reason: string;                         // one sentence a reader can act on
  code: GraphtyErrorCode;                 // e.g. E_UNKNOWN_PALETTE, W_UNKNOWN_MEMBER
}
```

The style applier graphty-element ships today returns a narrower `TemplateReport`
(`{ applied, unbound }`, `graphty-element/src/session/styles/StylesApi.ts`). Conformance to this
specification requires the `BindingReport` shape; `TemplateReport` can remain as the style-specific
detail beside it.

Importing data returns an **import report**, the typed form of what a data plan decided and what
the data did, so a pipeline can gate on it and two imports can be compared:

```ts
interface ImportReport {
  readonly plan?: { id?: string; planVersion?: string; digest?: string };
  readonly fieldsUsed: Readonly<Record<string, string | null>>;   // each knownFields member as resolved, including probed ones
  readonly counts: {
    readonly records: number; readonly nodes: number; readonly edges: number;
    readonly repeatedEdgesMerged: number; readonly repeatedNodesMerged: number;
    readonly idsCoerced: number; readonly coercionFailures: number;
    readonly missingEndpoints: number; readonly constraintViolations: number;
  };
  readonly joins: readonly { input: string; matched: number; unmatched: number; duplicates: number;
                             unmatchedIds: readonly (string | number)[] }[];   // unmatchedIds capped at 1000
  readonly weightRoles: Readonly<Record<string, "distance" | "similarity" | "capacity">>;
  readonly issues: readonly { row: number; field: string; code: string; value: unknown }[];  // capped at 1000
  readonly issuesTruncated: boolean;
}
```

Issue codes are graph-io's existing codes where one exists. The shape is part of the published
contract (open decision 4).

## Combining documents

Documents may be applied one at a time, in any order, or together in one envelope.

| Kind | Applying a second document of the same kind |
|---|---|
| Style | appends its layers above every layer already present, in document order, as `applyTemplate` does today. Replacing the stack is an explicit option of the applier, not the default |
| Data plan | takes effect at the next import. A data plan applied to a graph already loaded is reported as `needsReimport`; it never rewrites a loaded graph |
| View | adds its views to the list; an applied view moves the camera, and the last applied wins |
| Recipe | appends its steps' runs. Run ids are namespaced; applying the same recipe id again follows the applier's `onRepeat` option (recipe.md, "Identity and namespacing") |
| Annotations | merges by note id (annotations.md, "Reading and applying"); nothing is overwritten unless the caller asks for newer versions to replace older ones |

Inside one envelope the order is fixed: data plan, data, sets, recipe, style, view, annotations
(envelope.md, "Opening"). The recipe precedes the style so that layers bound to the recipe's runs
find them; the view follows both so a framing fits the laid-out graph; annotations come last so
their targets exist.

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
   then the recipe is planned, estimated and reported in `needsRerun`.
5. **Readers bound their work** by the limits of "Encoding and limits", and by the cost cap for
   compute (recipe.md, "Consent").
6. **Imported units say they were imported.** A style layer or a note that arrives from a document
   is stamped with the document it came from and that document's digest (style.md, annotations.md);
   a document cannot make its content look like the reader's own work.
7. A fingerprint and any digest are integrity hints, not authentication. Signed documents are not
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

| Document | Element API today | Designed (element API design) |
|---|---|---|
| Style | `session.styles.toDocument()`, `session.styles.applyTemplate(doc)` (shipped in 2.x) | unchanged, plus the `BindingReport` |
| Data plan | the internal `DataConfig` inside the 1.x template | `DataPlan`, applied at import |
| View | `Graph.exportCameraPresets()` / `importCameraPresets()`, an unversioned map of Babylon camera states | `ViewPreset`; `camera.bookmark()` / `apply()` |
| Recipe | `session.run({ op: "algo.run", ... })` and `runs.batch(RunSpec[])` | `journal.export()` and `journal.replay()` |
| Annotations | none | `session.notes.toDocument()` / `applyDocument()` |
| Envelope | none | `data.openDocument()` / `data.saveDocument()` |

The JSON Schema files here are the drafts of what graphty-element will publish. Where and under
what export path is an open decision. The element's algorithm catalogue (keys, legacy aliases,
option descriptors with defaults and maxima, result fields with their roles) SHOULD be published
beside them as a versioned JSON file, so a person can hand-write a recipe or a result-bound style
without running graphty-element to discover option and field names.

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
  Promise<{ text, lossNotes }>`, also lacks the run manifest this specification requires the
  export to return (export-mapping.md, "The run manifest"); the update should add it.
- Recipes name algorithms by catalogue key and never depend on how a plugin reads the graph, so
  replacing `algorithmGraph()` with the snapshot accessor changes nothing in these formats. The
  snapshot accessor has one weight column, which is why a recipe's weight slot binds to the
  graph's weight role rather than to a parameter value (recipe.md, "Weights").
- The export places a plugin's result field in a role (partition, rank) only when the plugin
  declares it. The algorithm plugin contract therefore needs result-field descriptors (name, type,
  role), read by the export and by the published catalogue; that is a dependency on the
  migration's plugin API.

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

### What version 1 does and does not cover, by workflow

Stated plainly so no one discovers it from a failed file:

- Covered: reusing a style on new data (`W20.yaml`), one encoding across two networks applied
  separately (`W24.yaml`), ranking hubs with recorded parameters (`W23.yaml`), clustering with
  cluster labels as group notes (`W21.yaml`), evidence notes (`W06.yaml`, `W09.yaml`), report pages
  as views (`W15.yaml`), reading a source with declared roles and a joined attribute table
  (`W18.yaml`, `W20.yaml`), a project file with data, run records, sets and stored results
  (`W25.yaml`, subject to open decisions 1 and 24).
- Not in version 1, each named as a reserved step type or an open decision: fetching interactions
  from a database inside a recipe, keeping the largest component as the working network, filtering
  clusters by size, enrichment against a gene-set file, computed attributes, saved filters, a
  randomized null model (`W03.yaml`, `W20.yaml`, `W21.yaml`, `W22.yaml`); several networks in one
  file (`W24.yaml`); canvas callouts (`W15.yaml`); publishing to NDEx (`W25.yaml`); figure and
  legend image export (export-mapping.md, "Images").

## Open decisions

Each item below is a one-way door: a file format, a published name, a published default or a URL
that would be expensive to change once files or consumers depend on it. None is decided by this
specification. The recommendation is what the specifications are written to; rejecting one changes
the text that cites it.

1. **Container, extensions and media types.** One JSON document for everything, a zip `.graphty`
   for everything, or both. *Recommendation:* JSON (`.graphty.json`,
   `application/vnd.graphty+json`) for every document and for envelopes whose data is text or a
   reference; the zip `.graphty` (`application/vnd.graphty.project+zip`) with an envelope as its
   manifest for projects that embed binary graph parts or stored results. Also the design studio's
   door 1.
2. **The `kind` strings and a discriminator on every document.** Today only the envelope has
   `kind`; a 2.x style document is `{ version, layers, palettes? }`. *Recommendation:*
   `graphty-style`, `graphty-data-plan`, `graphty-view`, `graphty-recipe`, `graphty-annotations`,
   `graphty-document`; readers accept a style document with no `kind` as `graphty-style` version
   1 forever, because 2.x already writes that shape.
3. **The schema URLs, where the schemas are published, the strict lint profile and the published
   algorithm catalogue.** *Recommendation:* `https://graphty.app/schema/documents/<kind>/v<major>.json`
   and `.../<kind>/v<major>.strict.json`, the same files exported from graphty-element as
   `@graphty/graphty-element/schemas/<kind>.v<major>.json`, and the catalogue as
   `@graphty/graphty-element/graphty-catalog.json` (which the package already exports) extended with
   option maxima and result-field roles.
4. **New error, warning and loss-note codes, and the report shapes.** Codes and the
   `BindingReport`, `RecipeBinding` and `ImportReport` shapes are a published contract. Today the
   style applier refuses an unknown version with `E_BAD_COMMAND`. *Recommendation:*
   `E_UNSUPPORTED_VERSION` (graph-format's code for its wire form) with details
   `{ kind, found, reads }`; `E_UNKNOWN_KIND`, `E_UNSUPPORTED_FEATURE`, `E_TOO_LARGE`,
   `E_UNKNOWN_ELEMENT`, `E_UNKNOWN_SET`, `E_UNSUPPORTED` (typed identity refused, an immersive mode
   unavailable), `E_UNBOUND_SLOT`, `E_ROLE_CONFLICT`, `E_WEIGHT_ROLE_MISMATCH`,
   `E_CONFIRMATION_REQUIRED`, `E_ARGUMENT_REQUIRED`, `E_DEPENDENCY_SKIPPED`, `E_UNKNOWN_COMMAND`,
   `E_NAMESPACE_MISMATCH`, `E_RECIPE_DIGEST_MISMATCH`, `E_REPEAT_APPLICATION`,
   `E_PRECISION_UNAVAILABLE`, `E_DIGEST_MISMATCH`, `E_CONSENT_REQUIRED`; warnings `W_UNKNOWN_MEMBER`,
   `W_STALE_QUOTE`, `W_PARAMETER_DIFFERS`, `W_ENGINE_DIFFERS`; and the `W_GRAPHTY_*` loss-note
   codes of export-mapping.md.
5. **The fingerprint scheme.** *Recommendation:* define `g2`, an order-independent hash over the
   sorted node ids and the sorted edge list, and approve it before any writer writes a
   fingerprint; never write `g1` into a file.
6. **Style file: sibling document or recipe profile.** *Recommendation:* sibling document (this
   specification), because the style document is already published and a style must be applicable
   without the recipe machinery; "a recipe and a style in one file" is an envelope with both
   members.
7. **Recipe shape.** A replayed journal of any command (element API design section 4.11), a
   declarative profile bound through slots (design studio door 19), or the hybrid specified in
   recipe.md: declared requirement slots, explicit `$attribute`, `$argument` and `$result`
   references, and steps that reuse the command union's `op` shapes. *Recommendation:* the hybrid,
   with version 1 steps limited to `algo.run` and `layout.set`, the step types
   `graph.filter`, `graph.subgraph`, `attribute.compute`, `data.query` and `graph.randomize`
   reserved for later minor versions, and whole-session replay left to the journal, not the
   recipe format.
8. **Recipe identity, namespacing, repeat application and the overview recipe.** *Recommendation:*
   the design studio's rules (doors 19 and 33): a stable recipe id, version and optional canonical
   source, where one id and version name one immutable content; run ids namespaced `<ns>__<id>`
   when applied, with the namespace recorded in the saved envelope so it round-trips; `onRepeat`
   defaulting to refuse; graphty-element ships a "General" overview recipe that a consumer and a
   project can replace.
9. **Load-time runs.** The element API design keeps `runOnLoad` in the data plan, which puts
   compute in the column-roles document. *Recommendation:* move it to the recipe (data-plan.md),
   as the migration register's template-split codemod already assumes.
10. **Data plan vocabulary and structure.** Three spellings exist: the code's
    `DataConfig.knownFields`, the design's `DataPlan.knownFields`, and the design's `ImportPlan`.
    *Recommendation:* the code's names and nesting (the policies stay inside `knownFields`, as
    `DataConfig` has them), graph-format's `ColumnRole` and `DuplicatePolicy` values, plus
    attribute-level measurement level and weight role (design studio door 21: `distance |
    similarity | capacity`, with `signed`), joins, constraints and a missing-endpoint policy.
11. **What a view holds.** *Recommendation:* a list of named views, each a drawing mode plus a
    renderer-neutral stored camera or a framing by camera-view id, and the ids of the notes it
    shows (view-preset.md). The design studio's fuller saved view (filter steps, enabled layers,
    stored positions) is added later under the same kind; it is additive.
12. **Standalone annotations.** The owner listed annotations as an independent file type; the
    design studio rejected a notes-only file. *Recommendation:* offer it (annotations.md), with
    the studio's concern answered by the binding rule: notes keyed by element id bind only to
    matching ids and are otherwise kept as orphaned.
13. **Node identity in notes and selectors, and the edge predicate.** Edge identity is settled by
    graphty-element's shipped `EdgeMember` (`graphty-element/src/catalog/types.ts`;
    `design/sets/sets-design.md` sections 4.2 and 12.2), which these documents reuse. Open:
    typed node identity (data-plan.md, "Node types"), which must be expressed through
    graph-format's existing `kind` and `idSpace` roles and its single id space (graph-format
    design decision Q27, "no core namespaces"); and adding the edge's type or predicate (`kind`) to
    `EdgeMember`, so a pair with two predicates keeps its references when rows are reordered.
    *Recommendation:* qualified ids `"<type>:<id>"` with `idSpace` and `originalId` columns, as
    graph-io's Neo4j importer already writes, whenever a type path is declared; and `kind` added to
    `EdgeMember` as an element change.
14. **Canvas callouts and shapes.** The designloom annotation capability asks for text boxes,
    leader lines and highlight shapes anchored to the canvas, and report pages
    (`W15.yaml`) depend on them. *Recommendation:* exclude them from annotations version 1; they
    are presentation, and belong to a later view version.
15. **Carried palettes.** Today a style document carrying a palette nobody registered is refused
    whole with `E_UNKNOWN_PALETTE`. *Recommendation:* an applier registers a carried palette for
    the session that applied the document only, never in the page-global registry
    (`catalog/pluginRegistry.ts` keys that registry on `globalThis`, so a global registration
    would reach every element on the page and every later document); it never replaces a
    registered palette of the same id; built-in palette ids stay reserved.
16. **Per-layer or whole-document failure of a style.** Today one refused layer refuses the whole
    style document. *Recommendation:* per layer, and per channel entry for an unknown channel, as
    the element API design says ("one member failing never fails the open"); a refused layer is
    added disabled with its reason.
17. **Envelope members beyond the six.** *Recommendation:* `runs`, `sets` and `results` in
    envelope version 1 (envelope.md); layout travels as a recipe step; background and
    configuration stay out of version 1 and the 1.x upgrade reports them.
18. **Embedding graphty documents inside third-party files.** GraphML and GEXF could carry a
    style or recipe as a graph-level string attribute. *Recommendation:* do not embed in version
    1; write an envelope beside the export that references it (export-mapping.md).
19. **Third-party readers and writers.** Whether a plugin can register an exporter, and whether a
    document may name a third-party importer's format id (`org.example.turtle`). *Recommendation:*
    importer registration stays an element extension point (the File format extension point
    already covers reading, and format detection is the element's), so a data plan or data member
    may name a registered third-party format id; exporters stay graph-io's, and a missing writer
    is new graph-io work.
20. **Style writers in graph-io.** "Whatever the format supports" is only true for GEXF today.
    *Recommendation:* add them in the order CX2 (the one target that holds style rules, and the
    genomics persona's exchange format), GraphML (yFiles), DOT, Cytoscape JSON, GML; and an
    optional graph-io reader for Cytoscape `styles.xml` and CX2 visual properties
    (export-mapping.md, "Importing Cytoscape styles").
21. **Signed or hashed documents.** The intelligence and fraud personas need integrity that can be
    checked, and a chain of custody for notes. *Recommendation:* defer signatures; record an
    RFC 8785 `sha256:` digest of each applied recipe on its run records (a MUST, recipe.md), of
    each note on write (annotations.md), and of the data bytes the notes were written against, so
    a later signature scheme has something to sign.
22. **The name "recipe".** It already names how-to documentation pages
    (`design/element-api/element-api-docs-plan.md`) and convenience snippets (the migration
    plan). *Recommendation:* keep "recipe" for the document, rename the documentation pages
    "How-to guides".
23. **Result column names in exports.** Scripts in R and Python read them. *Recommendation:*
    `<runId>.<field>`, mirroring the path a style reads, read back in a path as the quoted
    identifier `data."pagerank.value"`; the design studio's `<column>__estimated` and
    `<column>__missing` caveat columns (door 61), always written for a run whose result can be
    estimated or missing; and an export option that writes columns under the recipe's own `as`
    rather than the namespaced run id.
24. **Several graphs in one document.** The condition-comparison workflow
    (`design/designloom/workflows/W24.yaml`) needs two networks and a merged one in one file, and
    moving from one graph to a list later gives every stored reference a graph id it was written
    without. This must be decided before any document other than the style is released.
    *Recommendation:* a `graphs` member in envelope version 1, holding one entry per graph with
    its own data, data plan, sets and results, while style, views and annotations stay at the top
    level (the design studio's doors 2 and 5), with an optional `graph` member on note targets,
    view fits and recipe step scopes that defaults to the only graph. Until decided, `graphs` can
    arrive only with envelope version 2, and a version 1 unit carrying `graph` lists the feature
    `graphs` (so an old reader refuses rather than binds to the wrong graph).
25. **The migration register's list of stable formats.** `design/element-api/element-api-migration.md`
    lists `StyleDocument`, `DataPlan`, `ViewPreset` and `Recipe` as public contracts, but not the
    annotation set or the envelope. *Recommendation:* add both, and cite this directory.
26. **Shared metadata member names.** `authors`, `license`, `citation`, `doi`, `derivedFrom`,
    `handling`, `modifiedAt`, `features`, on every kind. *Recommendation:* as specified above.
27. **Several data inputs and joins.** A data member of named inputs (an edge table plus a node
    table, as graph-io's CSV importer takes them) and data-plan joins of attribute tables onto
    nodes. Open with it: merging several sources, each with its own data plan, into one graph
    (`W09.yaml`, `W13.yaml`), and an identity mapping (aliases from merged ids to the surviving
    id, `W09.yaml` node merging) that note targets resolve through. *Recommendation:* named
    inputs and exact-key joins in version 1 (envelope.md, data-plan.md); multi-source merge and
    aliases reserved (`sources`, `aliases`) and designed with the graphs decision, since both
    change what a stored reference means; identifier-namespace mapping (gene symbol, Entrez,
    UniProt) left to the caller in version 1.
28. **Notes and judgement layers in a data export.** The owner's export decision says an export
    carries everything the format can represent; notes (as a text column) and highlight layers
    (baked as colours) both fit. *Recommendation:* exclude notes by default and let the caller
    exclude layers by `kind` or id from the baked appearance, reporting baked highlight layers
    (export-mapping.md). This narrows the owner's decision and needs the owner's agreement.
29. **The layer `id` in a document versus the element's `LayerId`.** `LayerId` is documented as
    element-minted (`graphty-element/src/catalog/types.ts`); `applyTemplate` mints a fresh one
    from the layer's name. *Recommendation:* the document `id` is an authored key the element
    stores on the layer, exposes through the styles API, writes back in `toDocument()` and uses for
    note binding; `LayerId` stays element-minted.
30. **Save purposes.** *Recommendation:* `saveDocument` takes `purpose: "project" | "share"`
    (envelope.md, "Saving"), with `project` the default: a person's own save keeps data and notes;
    anything meant for someone else is an explicit share that leaves them out and checks for
    element names.

## Review record

Objections raised in adversarial review, by the design-studio personas and by technical reviewers,
that this specification did not take. Each line says what was raised and why it was not adopted.
Objections that were taken are reflected in the text above and are not listed.

- *Commit the design studio framework files so the door numbers resolve.* Not done here: those files
  belong to the main checkout and are the owner's to commit. Instead every citation of a door
  restates the rule it takes, so the text stands without them.
- *Specify the analysis journal as its own document kind (`graphty-journal`) so a whole
  exploration, with rejected parameter choices, can be handed to a reviewer.* Not adopted:
  whole-session replay is deliberately not a published format (open decision 7). The reserved step
  types cover the null-model and filter steps a recipe will need; the journal stays the element's
  in-session record.
- *Add an `equivalents` field (a networkx or igraph function and its parameter mapping) to
  algorithm descriptors.* Not a document-format matter: it belongs to the algorithm catalogue,
  whose publication is open decision 3.
- *Refuse `source.by: "run"` on imported style layers.* Not adopted as stated: a run-sourced layer
  is how a style says which run it paints, and the duplicate-layer rule depends on it. Instead the
  applier stamps every imported layer with its document and keeps `by: "run"` only when the run id
  binds in the session (style.md).
- *Convert a similarity weight to a distance automatically for path algorithms.* Not adopted for
  version 1: any conversion (1/w, 1-w, -log w) is a modelling choice the author must make. The
  applier refuses a role mismatch with a named code instead (recipe.md, "Weights").
- *Make edge references compare `key` against a new data-plan `edgeKeyPath`.* Not adopted:
  graphty-element's `EdgeMember` reserves `key` and refuses it until the element reads one, and
  these documents reuse `EdgeMember` rather than declare a second edge reference type.
- *Record style layers bound to a recipe's runs by recipe id and step (`source: { recipe, step }`)
  rather than by run id, so a standalone style saved in one session binds to another session's
  application.* Not adopted for style layers in version 1: `source` is the element's published
  `LayerSource` type, frozen with style version 1. A style that travels with its recipe does so in
  one envelope, where paths are written with the recipe's own `as` and round-trip; notes, which are
  unreleased, gained the equivalent (`{ run, recipe }`).
- *Add per-attribute reducers and keep-first or keep-last policies for repeated node records.* Not
  adopted: the data plan takes graph-format's existing `onDuplicateNode` values (`merge`, `error`)
  rather than invent a policy the builder does not implement; richer entity resolution belongs with
  the aliases of open decision 27.
- *Change the date of the export decision to 2026-09-27.* The archive timestamp is
  2026-09-28T04:53Z. The date stands; the convention that every date here is the UTC date of the
  archive timestamp is now stated at the top of this page.

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
- `graph-io/src/types.ts` (`ExportCapabilities`, `LossNote`) and each format's exporter;
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
  hashes and Table Schema; OWASP CSV injection guidance.
