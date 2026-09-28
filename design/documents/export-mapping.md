# Export mapping

How graphty's documents map onto the third-party formats graph-io writes: what survives an export,
what is lost and how the loss is reported, and how graphty's own documents travel beside a data
export. Shared conventions are in [README.md](README.md).

## The decision this implements

On 2026-09-28 (UTC) the owner was asked what graphty-element's export (writing a graph out to GEXF,
GraphML, CSV, JSON and the rest through graph-io) should contain. The options offered were data plus
positions, plus algorithm results, or everything including styles. The owner's answer was "whatever
the format supports". So:

1. An export carries everything the chosen format can represent: the data's attributes, the drawn
   positions, algorithm results as node and edge attributes, and the resolved appearance of each
   element wherever the format has a place for it.
2. Everything the format cannot represent is reported as a loss note before anything is written,
   and is never dropped silently.
3. The export API is graphty-element's; the writers are graph-io's.

The graph-format migration plan (`design/graph-format/migration-plan.md` on branch
`feat/graph-format-migration`, work item `element-export-api` and section 6 item 2) predates the
answer. It still scopes the export to "the data bags and current positions" and still lists the
contents as an owner question. That text is stale and should be updated to this decision. Its
candidate signature, `exportGraph(format, options) -> Promise<{ text, lossNotes }>`, returns one
string and no run manifest; the element API design's `ExportResult` (section 4.3.6) returns a
`blob`, a `stream()`, the `manifest` and the loss notes, and says an export never returns one
string, so a 100,000-node GEXF is streamed rather than built in memory. The update should adopt
`ExportResult` with graph-io's `LossNote` and the manifest this page requires (below); the name and
signature are a published API (README, open decision 33). The plan's other open item on the
export, whether third parties may register writers, remains open (README, "Open decisions").

## The export model

graph-io's exporters take a graph-format snapshot and nothing else (`GraphExporter.export(snapshot,
options)`, `graph-io/src/types.ts`). Each declares `ExportCapabilities`, including `positions` (it
can write the position role) and `viz` (it can write the visual roles color, size, shape and
thickness), and reports `LossNote { code, message, column, count }` from `check()` before writing.
So an element export is two steps:

1. **Build the export snapshot.** graphty-element builds a snapshot whose columns are:
    - the imported attributes, as columns with their graph-format roles;
    - the current drawn positions, as the `position` role column, when the caller includes positions;
    - one column per published result field of each included run (below);
    - the resolved appearance of each element, as the `color`, `size`, `shape` and `thickness` role
      columns, when the caller includes style and the format's `viz` is true.
2. **Write it** through the format's graph-io exporter, returning graph-io's loss notes plus the
   notes graphty-element adds for what it did not put in the snapshot.

The element's loss notes use graph-io's `LossNote` shape unchanged. The element API design's
narrower `{ code, message, count }` (section 4.3.6) is withdrawn: the app and the element must not
re-declare a graph-io type.

### Results as attributes

Each included run contributes one column per published field of its result, per element kind.

- **Column name.** `<name>.<field>`, where `<name>` is the recipe's own `as` for a run a recipe
  produced (`score.rank`) and the run's author-assigned id otherwise (`pagerank.value`,
  `rings.group`). A run started from a panel has a derived id (`pagerank_0k3x9a1b7c2d4e`), which
  changes whenever a parameter or the scope changes, so before naming columns the export gives it
  an alias by README "Identifiers" rule 2 (`pagerank`, `pagerank_2`, `label_propagation`) and
  records it on the run; a script therefore reads the same column after a parameter is tuned. When
  two runs would give one name (a recipe applied twice with `onRepeat: "add"`, two recipes sharing
  an `as`), the export is refused, naming both, unless the caller passes a column-name map
  (`columnNames`) or asks for namespaced names for every such run (`hubs2__score.rank`), so the
  column a script reads never depends on which recipe was applied first. The naming is a published
  contract for scripts in R and Python, so it is open decision 23.
- **Reading one back.** Re-imported, such a column is an ordinary attribute whose key contains a
  dot, read as `data.pagerank.value` (keys are flat, README "Paths").
- **Names per format.** GEXF, GraphML, CSV, the JSON dialects, DOT (quoted ids) and Neo4j
  (properties) hold the dotted name as written. GML keys are letters and digits only, and Pajek has
  no named attribute columns; for those two the mapping of result columns is not specified in
  version 1 and each result column is reported (`W_GRAPHTY_RESULT_NAME`) with the name graph-io's
  `sanitizeIds` gave it. A name that collides with an imported attribute is written with `.2`
  appended to the field (`pagerank.value.2`) and reported. The grammar in one place: `<name>` is a
  run name, `.` separates the field, `__` appears only inside a namespaced run id, a caveat column
  ends in `__estimated` or `__missing`, and a collision adds `.2`; a script never has to parse it,
  because the sidecar's data plan declares each column's `origin` (run, field, caveat;
  data-plan.md).
- **Fixed headers.** CSV writes the node table with the header `id` first (and `label` when the
  data has labels) and the edge table with `source`, `target` first (and `id` when edges carry
  ids); the JSON node-link dialect uses `id`, `source` and `target`. The other formats carry
  identity in their own structure (XML attributes, DOT node ids).
- **Role.** A result field that is a partition gets the `community` role, a rank the `rank` role, a
  component id the `component` role, so formats that map roles (GEXF's partitions, Cytoscape's
  classes) place them. graph-format allows at most one column per role per table, so the role goes
  to the first run in run order that claims it, and every later claimant is written as a plain
  attribute and reported (`W_GRAPHTY_ROLE_TAKEN`, naming the column).
- **Caveats and missing values** follow the design studio's recommendation (door 61 of
  `design/ui/framework/one-way-doors.md`: caveats travel as sibling columns): a column
  `<column>__estimated` (boolean) and a column `<column>__missing` (the reason word:
  `not-computed`, `no-value`). They are written for every run that was not requested `exact: true`,
  whether or not it sampled, so the column set depends on the recipe, not on which algorithms a
  release can estimate, and a script does not break on the dataset where nothing was sampled. The
  caller MAY turn them off per run, and they are omitted for an algorithm whose catalogue
  descriptor says it never estimates (degree, PageRank), so a table pasted into a paper does not
  carry ten always-false columns. How a value was estimated (the method and sample size) is in the
  run record (below), which the `__estimated` column points to; a missing value is an empty CSV
  cell, JSON `null`, or an absent GraphML `<data>` element.
- **Precision.** A result computed in single precision on the GPU is not distinguishable from a
  double-precision one by its values, so each run's precision is written as the graph-level
  attribute `<name>.precision` (`f32`, `f64`) where the format has graph-level attributes, and in
  the CSV column dictionary (below) where it does not.
- **Graph-level fields.** A metric result also publishes fields about the whole graph (`min`,
  `max`, `median`, `mean`, `measured`, `normalization`, `tiedAtMin`; the `kind: "graph"` fields of
  `graphty-element/src/catalog/algorithms.ts`). They are written in each run record's
  `graphFields`, and to the format's graph-level attributes as `<name>.<field>` where it has them;
  where it has none they are reported (`W_GRAPHTY_GRAPH_FIELDS`), so which normalisation convention
  produced a column is never lost.
- **Default scope.** Every run the session holds. The caller may name runs; a run left out is
  reported with `W_GRAPHTY_RUN_EXCLUDED` (`column`: the run id). Hiding a layer never changes which
  columns a file has.
- **Which elements.** Recommended default, pending the owner (open decision 33): every node and
  edge, whatever the active filter hides, with the active filter written in the sidecar (`filter`)
  and in the manifest, so a co-author can tell whether a GraphML holds the 180 pathways of the
  figure or all 1,400, and read the cutoffs. A caller who passes `scope: "visible"` gets only the
  kept elements, and the loss note `W_GRAPHTY_FILTERED` names the filter's predicates and the
  number of nodes and edges dropped.
- **A column dictionary beside CSV.** A CSV export writes `<name>.columns.csv`: one row per column,
  with the run, the recipe id, the step, the field, the caveat and the precision, so an R or Python
  script needs no JSON parser to know what a column is.

### Resolved appearance

A third-party format that can hold appearance holds it per element, not as rules. GEXF's `viz`
module records a colour, a size and a shape on each node; it has no way to say "colour by logFC on
a diverging scale". So exporting a style to such a format is a bake: graphty-element resolves every
layer for every element and writes the resulting values. The rules themselves are lost and
reported (`W_GRAPHTY_STYLE_RULES`), and travel intact only in a style document (below).

The element API design materializes a resolved style only through `explain()`, one element at a
time. An export needs a columnar resolution path that computes the four role columns for every
element in one pass. That is new graphty-element work. Colours are written from the parsed RGBA,
never as the authored string (style.md). When the imported data already holds visual-role columns
(a GEXF read with its `viz` values), the baked appearance takes the roles and the imported columns
are written as plain attributes, reported with `W_GRAPHTY_ROLE_TAKEN`.

**Layers that carry a judgement are not baked by default.** A "suspects" highlight baked into
`viz:color` reveals the same judgement that leaving the notes out protects. So, pending the owner's
agreement (open decision 28), layers with `kind: "highlight"` and layers whose selector names
elements (`ids`, or `member` of a kept set) are left out of the baked appearance unless the caller
includes them by `kind` or id; each layer left out is reported (`W_GRAPHTY_LAYER_EXCLUDED`) and each
one included is reported (`W_GRAPHTY_HIGHLIGHT_BAKED`).

The channel-to-role table:

| Element channel                                                                                            | graph-format role                               | Translation                                                          | Loss note when it cannot be written                                             |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `node.color`                                                                                               | `color` (node)                                  | the resolved RGBA; alpha kept where the format has it                | `W_GRAPHTY_CHANNEL`                                                             |
| `node.size`                                                                                                | `size` (node)                                   | scene units, written as the number                                   | `W_GRAPHTY_CHANNEL`                                                             |
| `node.shape`                                                                                               | `shape` (node)                                  | the shape table below                                                | `W_GRAPHTY_SHAPE` for each translated or dropped shape                          |
| `node.opacity`                                                                                             | folded into the colour's alpha                  | alpha times opacity                                                  | --                                                                              |
| `edge.color`                                                                                               | `color` (edge)                                  | as nodes                                                             | `W_GRAPHTY_CHANNEL`                                                             |
| `edge.width`                                                                                               | `thickness` (edge)                              | scene units                                                          | `W_GRAPHTY_CHANNEL`                                                             |
| `edge.style`                                                                                               | `shape` (edge)                                  | `solid` to solid, `dash` to dashed, `dot` to dotted, others to solid | `W_GRAPHTY_SHAPE`                                                               |
| `node.label`, `edge.label`                                                                                 | `label`, only when the data has no label column | the resolved text                                                    | --                                                                              |
| any channel of a layer with `kind: "highlight"`, or of a layer whose selector names elements               | not baked unless the caller includes it         | --                                                                   | `W_GRAPHTY_LAYER_EXCLUDED`, or `W_GRAPHTY_HIGHLIGHT_BAKED` when included        |
| every other channel (outline, glow, arrows, label styles, tooltips, curvature, animation, wireframe, flat) | none                                            | --                                                                   | `W_GRAPHTY_CHANNEL`, one note per channel with the count of elements it painted |

Node shapes. The element draws 3D solids; GEXF has `disc`, `square`, `triangle`, `diamond` and
`image`:

| Element shape                                                                               | GEXF shape       |
| ------------------------------------------------------------------------------------------- | ---------------- |
| `sphere`, `icosphere`, `geodesic`, `goldberg`, `capsule`, `cylinder`, `torus`, `torus-knot` | `disc`           |
| `box` and the prisms                                                                        | `square`         |
| `tetrahedron`, `cone` and the pyramids                                                      | `triangle`       |
| `octahedron` and the dipyramids                                                             | `diamond`        |
| any other                                                                                   | `disc`, reported |

## Per format

"Today" is what graph-io's exporters write now. "Proposed" is new graph-io writer work needed for
"whatever the format supports" to be true; it is listed as an open decision (README).

| Format                          | Attributes                             | Positions                                                                                                                                         | Results as attributes                                  | Resolved appearance today                                                 | Proposed appearance writer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Graph-level attributes |
| ------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| GEXF 1.3                        | yes, typed                             | yes, with z                                                                                                                                       | yes                                                    | yes: `viz:color`, `viz:size`, `viz:shape`, edge `viz:thickness` and shape | --                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | no                     |
| GraphML                         | yes, typed (no lists or nested values) | no                                                                                                                                                | yes                                                    | no                                                                        | yFiles `y:ShapeNode` geometry, fill, shape and `y:PolyLineEdge` line style and width; this also gives positions                                                                                                                                                                                                                                                                                                                                                                                                                         | yes                    |
| GML                             | yes                                    | yes                                                                                                                                               | yes                                                    | no                                                                        | the `graphics` block (`x`, `y`, `w`, `h`, `fill`, `type`, `width`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | yes                    |
| DOT                             | yes, as attributes                     | yes (`pos`)                                                                                                                                       | yes                                                    | no                                                                        | `color`, `fillcolor`, `shape`, `penwidth`, `width`, `style`                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | yes                    |
| Pajek                           | a fixed set (label, shape, parameters) | yes                                                                                                                                               | numbers as vectors or partitions only; others reported | no                                                                        | the vertex shape and colour parameters Pajek's `.net` defines                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | no                     |
| CSV                             | yes, one node table and one edge table | as columns `x`, `y` (and `z`) when the caller includes positions, declared in the sidecar's data plan and restored from the sidecar's `positions` | yes                                                    | no                                                                        | none: CSV has no appearance; write colour and size as ordinary columns only when the caller asks                                                                                                                                                                                                                                                                                                                                                                                                                                        | no                     |
| JSON node-link, JGF, graphology | yes, including nested values           | no                                                                                                                                                | yes                                                    | no                                                                        | none standard                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | yes                    |
| JSON d3, vis                    | yes                                    | no                                                                                                                                                | yes                                                    | no                                                                        | vis: `color`, `size`, `shape`, `width` per element                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | no                     |
| JSON Cytoscape                  | yes                                    | yes                                                                                                                                               | yes                                                    | no                                                                        | the `style` array and per-element `classes`; this is the one JSON dialect that can hold rules as well as values                                                                                                                                                                                                                                                                                                                                                                                                                         | yes                    |
| CX2 (Cytoscape Exchange, NDEx)  | --                                     | --                                                                                                                                                | --                                                     | not written today                                                         | proposed first: attributes as `attributeDeclarations` and node and edge attributes, positions as `cartesianLayout`, results as attributes, and style rules as `visualProperties` (defaults, and continuous, discrete and passthrough mappings from bindings of `everything` layers); a layer with any other selector (`expression`, `has`, `top`, `member`, `ids`) is evaluated and written as `nodeBypasses` / `edgeBypasses` on the elements it matches, reported with `W_GRAPHTY_CX2_BYPASS` (the rule is lost, the values are kept) | `networkAttributes`    |
| Neo4j                           | yes, as properties                     | no                                                                                                                                                | yes                                                    | no                                                                        | none: a database has no appearance                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | no                     |

Number precision and the Excel byte-order mark that the data-export capability asks for
(`design/designloom/capabilities/data-export.yaml`: six decimals, an optional BOM) are not options of
graph-io's exporters today (`CommonExportOptions` has only `sanitizeIds` and `onMixedDirection`).
They are properties of how a file is written, so they belong in graph-io's CSV and JSON writers, and
graphty-element passes them through.

**Document metadata.** A document's shared metadata (README: `authors`, `license`, `citation`,
`doi`, `recipeVersion`) is written to the format's graph-level attributes where it has them
(GraphML, GML, DOT, the JSON dialects that have a graph object) and to CX2's `networkAttributes`
(`author`, `rights`, `reference`, `version`), which is what NDEx reads when a network is published
there. The document's `name` is written only when the caller asks, because a name such as "Case
4471 link chart" discloses what the data is about. Every handling marking the session holds is
written as the graph-level attribute `graphty.handling` where the format has graph-level attributes,
and reported with `W_GRAPHTY_HANDLING` where it has none, so the marking travels with the file or
the loss is seen. Publishing to NDEx itself is out of scope.

**Typed node identity.** When the graph has type-qualified ids (data-plan.md, "Node types"), every
format writes the qualified id (`"account:123"`) as the node id and adds the `idSpace` column and
the plain `originalId` column (no role), so a re-import through the regenerated data plan -- which
says `nodeTypePath: "idSpace"`, `idsQualified: true` and lists the feature `typed-identity`
(data-plan.md, "Node types" rule 6) -- round-trips exactly, typed. The graph-format `originalId` role is never used for it: graph-io's exporters
do not write that role as a column (`checkCapabilities`, `graph-io/src/common/export.ts`) and the GML
importer restores it as the node id, which would merge nodes of different types. A format that
cannot hold the extra columns reports `W_GRAPHTY_TYPED_ID`. The Neo4j format can hold typed identity
natively; writing the type as the id space and label, with the untyped id as `:ID(<type>)`, so the
Neo4j importer reads it back as the same typed graph, is proposed graph-io work (open decision 20).

**Text is never markup.** Text that comes from the data or from a document -- labels, names,
attribute values, document metadata -- is written as a quoted string in every format, never as a
DOT HTML-like label (graph-io's DOT exporter today writes any balanced `<...>` text bare, where
Graphviz renders it as HTML with `IMG` and `HREF`) and never as a yFiles HTML label (yEd renders a
label beginning `<html>` as HTML, remote images included). graphty-element passes graph-io an
option that disables HTML-string detection for these columns; graph-io offering that option is
graph-io work. Each neutralised value is counted (`W_GRAPHTY_TEXT_QUOTED`).

**CSV cells.** A CSV cell that begins with `=`, `+`, `-`, `@`, a tab or a carriage return is written
prefixed with a single quote, so a spreadsheet does not run it as a formula (the OWASP guidance on
CSV injection); a label from a hostile file or a note's text would otherwise become a live formula
when the analyst opens the file. The number of cells neutralised is reported
(`W_GRAPHTY_CSV_NEUTRALIZED`). A caller whose consumer is not a spreadsheet MAY turn it off. A
negative number is a number, not a text cell, and is not prefixed.

For every row, every capability marked "no" produces a loss note naming what was not written and
how many elements it affected, and every column the format's own `check()` refuses produces
graph-io's note.

**For Cytoscape users.** Until graph-io writes CX2, version 1 guarantees a Cytoscape user this
much: GraphML with every attribute and result column typed (Cytoscape reads GraphML attributes, but
not positions or appearance from graph-io's GraphML), or CSV node and edge tables for Cytoscape's
table import, plus the graphty sidecar. No positions or style reach Cytoscape from any format
graph-io writes today. The CX2 writer, with graphty styles written as CX2 `visualProperties`, is
the recommended first writer (open decision 20), and any "export as CX2" entry waits for it. The
matching CX2 **network reader** -- so a collaborator's `.cx2` from NDEx opens in graphty, with its
attributes, positions and visual properties (the last through the style reader below) -- is
proposed beside it (open decisions 19 and 20).

## graphty's documents beside an export

No third-party format graph-io writes can hold a style's rules, a recipe, a data plan, a view or
annotations as graphty means them. (CX2, Cytoscape's exchange format, can hold style rules; graph-io
does not write it yet, and it is the first proposed writer, above.)

An export therefore reports each member it did not carry:

| Code                          | When                                                                                          | `column`                | `count`            |
| ----------------------------- | --------------------------------------------------------------------------------------------- | ----------------------- | ------------------ |
| `W_GRAPHTY_STYLE_RULES`       | the session has authored style layers; values may have been baked, the rules were not written | null                    | number of layers   |
| `W_GRAPHTY_CHANNEL`           | a painted channel has no place in the format                                                  | the channel name        | elements painted   |
| `W_GRAPHTY_SHAPE`             | a shape or line pattern was translated or dropped                                             | the channel name        | elements affected  |
| `W_GRAPHTY_RECIPE`            | results were written, the steps that produced them were not                                   | null                    | number of runs     |
| `W_GRAPHTY_VIEW`              | the session has saved views                                                                   | null                    | number of views    |
| `W_GRAPHTY_NOTES`             | the session has notes and they were not written                                               | null                    | number of notes    |
| `W_GRAPHTY_DATA_PLAN`         | declared measurement levels or weight roles were not written                                  | the column              | null               |
| `W_GRAPHTY_RUN_EXCLUDED`      | a run the session holds was not written                                                       | the run id              | elements           |
| `W_GRAPHTY_RESULT_NAME`       | a result column was renamed for the format                                                    | the new name            | null               |
| `W_GRAPHTY_HIGHLIGHT_BAKED`   | a highlight layer's values were baked into the appearance                                     | the layer id or name    | elements painted   |
| `W_GRAPHTY_TYPED_ID`          | typed identity columns could not be written                                                   | null                    | nodes              |
| `W_GRAPHTY_CSV_NEUTRALIZED`   | cells were prefixed so a spreadsheet does not run them                                        | the column              | cells              |
| `W_GRAPHTY_TEXT_QUOTED`       | text that a format could read as markup was written quoted                                    | the column              | values             |
| `W_GRAPHTY_FILTER`            | a filter was active and could not be expressed as predicates                                  | null                    | elements hidden    |
| `W_GRAPHTY_FILTERED`          | the caller exported only the elements the active filter keeps                                 | the filter's predicates | elements dropped   |
| `W_GRAPHTY_CX2_BYPASS`        | a predicate layer was written to CX2 as per-element bypasses                                  | the layer id or name    | elements           |
| `W_GRAPHTY_LAYER_EXCLUDED`    | a layer carrying a judgement was left out of the baked appearance                             | the layer id or name    | elements it paints |
| `W_GRAPHTY_ROLE_TAKEN`        | a column lost a graph-format role to another claimant                                         | the column              | null               |
| `W_GRAPHTY_GRAPH_FIELDS`      | a run's graph-level result fields have no place in the format                                 | the run id              | fields             |
| `W_GRAPHTY_HANDLING`          | handling markings have no place in the format                                                 | null                    | markings           |
| `W_GRAPHTY_REDACTED`          | element ids in run parameters, arguments or scopes were redacted                              | the run id              | values             |
| `W_GRAPHTY_GRAPHS`            | graphs the session holds were left out (envelope.md, "Saving")                                | the graph               | runs left out      |
| `W_GRAPHTY_MERGES`            | node merges were baked into the data with no record of what merged                            | null                    | nodes merged       |
| `W_GRAPHTY_TABLES`            | per-group tables were not written (the format has no place for them)                          | the run id              | tables             |
| `W_GRAPHTY_CYTOSCAPE_MAPPING` | a Cytoscape mapping could not be converted exactly (below)                                    | the visual property     | points             |

These codes are new and, like graph-io's, are a published contract.

To keep them, the export API SHOULD offer a **sidecar envelope**: an envelope (envelope.md) whose
data member names the exported file (`url` relative to the envelope, `digest`, `format`, `options`;
for CSV the edge table as the main input and the node table as `inputs.nodes`) and whose other
members are the session's `dataSource` (so the STRING release and query survive the export), style,
recipes, view, a data plan for the exported file, the active `filter`, `imports`, `runs` and, for
CSV, `positions`. Because a sidecar goes to someone else, it is written under the share rules
(envelope.md, "Saving" rule 2): no `application` block, the element-name report produced before
writing, the element ids in import records redacted (envelope.md, "Import records"), and layers
carrying a judgement left out as above. Annotations are written only when the caller asks, and otherwise reported under
`W_GRAPHTY_NOTES`, for the reason given under "Notes in a data export".

1. **The sidecar's data plan is regenerated for the exported file**, never copied from the original
   import: `knownFields` name the headers the exporter wrote (for example `Source` and `Target` in
   a Gephi-dialect CSV), there are no renames or joins (they were applied on import), and there is
   one attribute declaration per written column, including result columns, with their level, their
   `origin` (run, field, caveat) and, for a result used as a weight, its weight role; the original
   plan is named in `derivedFrom`.
2. **Reopening.** The pair `network.graphml` and `network.graphty.json`, opened by an application
   that passes both files (envelope.md, "Fetching"), reopens with the same data, style, view, run
   records and recipes. When a result column's declared `origin` names a run in the sidecar's
   `runs` with that field, the reader rebinds the column as that run's stored result, so the style
   layers that read `results.pagerank.value` paint at once, with the exact published numbers and
   no re-run. When the data's digest verifies it is marked "restored from export columns"; when
   the digest differs -- a collaborator added a column in R and wrote the file back, the normal
   round trip -- but every origin-declared column is present, it is marked "restored, data
   changed, unverified" and reported. Either way it is also "not recomputed by this installation"
   (recipe.md, "Reproducing"): the sidecar supplies both the digest and the file, so a matching
   digest proves the file was not altered after the sidecar was written, never that the numbers
   were computed as the run records say. A caller who needs the digest to match passes
   `requireDigest`, and then a differing file comes back with its columns only as attributes. The GraphML file stays a plain GraphML file
   for every other tool. With the zip container, the exported file can be a part of the archive
   instead.

Embedding graphty documents inside the third-party file (as a GraphML or GEXF graph attribute
holding the JSON) is technically possible and is not recommended for version 1: every other tool
would carry an opaque blob it cannot read and may silently drop on re-save, which turns a loss the
export reported into one nobody sees. It is an open decision.

### Notes and judgements in a data export

Notes are never written into a data export or its sidecar by default: they may hold judgements a
reader did not intend to share with the data ("suspect"), which is the intelligence and fraud
personas' concern (`design/designloom/personas/intelligence-analyst.yaml`, `fraud-analyst.yaml`).
The same judgement can leak as colour, which is why layers carrying one are not baked by default
("Resolved appearance"), and as parameters, which is why the manifest redacts element ids (below).
These defaults narrow the owner's "whatever the format supports", which is open decision 28. When
the caller asks
for them, each element's notes are written as one text column `graphty.notes` (note texts joined
with a blank line, oldest first), which is lossy: authors, tags, times and notes on the graph or on
definitions are reported under `W_GRAPHTY_NOTES`. The annotations document is the lossless form.

### The run manifest

The element API design's export returns a run manifest: for every included run, the algorithm, its
parameters, the seed, exact or sampled with the sample size, precision, convergence, and the
package versions that computed it. A methods section cites this
(`design/designloom/workflows/W22.yaml`, Enrichment Map; `W25.yaml`). Its shape is the envelope's
`RunRecord` (envelope.md, "Run records"), one per written run. It is returned by the export API in
every case, and it is written to a file in every case:

- in the sidecar envelope, as its `runs` member;
- without a sidecar, as `<name>.runs.graphty.json`, an envelope holding only `imports` and `runs`
  (and, when the runs came from recipes, the recipes), beside the exported file.

A shortest path's `source` and `target`, a neighborhood's seeds and a recipe argument are element
ids, and in an evidence case they say who the investigation is about. So by default the manifest
written to a file replaces every parameter, argument and requested scope of type `node-id` or
`node-set` with a redaction marker (`{ "redacted": "node-id" }`, keeping counts), reports it with
`W_GRAPHTY_REDACTED`, and shows the handling markings first; the caller includes the ids
explicitly, as with notes. The manifest returned by the API is unredacted. A stale run is written
with its `stale` reason and never presented as a current result.

A recipe alone does not replace the run records: a recipe is the plan, and it cannot say that the
betweenness was sampled at 500 pivots, ran in f32, or that PageRank stopped after 100 iterations
without converging. Writing the records inside the third-party file as a graph-level attribute is
part of the embedding decision above.

## Importing Cytoscape styles

A lab's existing Cytoscape styles (`styles.xml` from Cytoscape desktop, and CX2
`visualProperties`) map into a graphty style: a continuous mapping becomes an encoding with a
numeric scale, `domain` from its points and `midpoint` from a centre point; a discrete mapping an
`ordinal` binding with `map`; a passthrough mapping a `passthrough` binding; a default a base layer
with `{ match: "everything" }`; a bypass a layer with an `ids` selector. Each visual property maps
to a channel (fill colour to `node.color`, border paint to `node.outline`, size to `node.size`,
shape through the table above in reverse, edge width to `edge.width`, line type to `edge.style`),
and each one with no channel is reported. This is an optional graph-io reader producing a style
document, used by graphty-element's style import, never app code (open decision 20).

A Cytoscape continuous mapping has any number of points, each with its own explicit value, plus a
value below the first point and one above the last; a graphty binding has a two-ended domain, one
midpoint and a palette whose colours are evenly spaced. So:

1. A mapping of two points becomes `domain` and a two-colour palette; of three points, `domain`,
   `midpoint` and a three-colour palette. The explicit colours become a palette carried in the
   style (`palettes`), never a stock palette re-centred.
2. A mapping of more than three points becomes a `bins` binding with one bin per interval when the
   colours are to be stepped; otherwise, when the points are evenly spaced, a carried palette with
   one colour per point; otherwise it is reported as not convertible exactly
   (`W_GRAPHTY_CYTOSCAPE_MAPPING`) and converted through its end and midpoint colours only, the
   report naming the points dropped.
3. A below or above colour that differs from the end colour has no graphty equivalent (an
   out-of-domain value takes the end colour, style.md) and is reported with
   `W_GRAPHTY_CYTOSCAPE_MAPPING`, naming the colour and the count of elements it would have painted.

Conformance rows for this reader use real Cytoscape `styles.xml` fixtures: a five-point diverging
logFC mapping with a yellow above-colour, a discrete mapping, and a passthrough label.

## Images

Figure export is graphty-element work that reads the style and view documents of this directory
and writes no document of its own; its API is open decision 33. What it contains is specified here,
because a figure whose legend has to be redrawn by hand is the genomics persona's named frustration
(`design/designloom/personas/genomics-cytoscape-user.yaml`; `W20.yaml`, `W21.yaml`, `W25.yaml`):

1. An image export (PNG, SVG, PDF) includes a legend by default; the caller may leave it out or
   place it. The legend can also be exported on its own as SVG.
2. The legend is derived from every enabled layer's bindings, bottom to top, skipping any binding
   with `legend.hidden`: a colour ramp with its domain, its midpoint and a mark at each clamped end;
   a size mapping with sample sizes; one key per category of an ordinal or categorical binding,
   labelled by the binding's `legend.labels`, else by the first line of a group note on that
   category's group, else by the value; the `missing` value's swatch with its `missingLabel`; each
   binding's `title` and `units`. A literal layer appears as one key with the layer's name when it
   is a highlight.
3. The legend states nothing the layers do not paint, and every figure exported this way carries
   the same legend when re-exported from the saved project.
4. **A view's figure settings are used.** Exporting a view that carries `export` (view-preset.md,
   "Figures") uses its width, height, pixel ratio or DPI and legend placement, so the crop and the
   legend are the same on any screen.
5. **A report page carries its notes.** Exporting a view that lists `notes` appends them below the
   figure as a numbered caption list, each with its target named, unless the view's `export.notes`
   is false. Canvas callouts remain open decision 14; this is how a briefing is produced in
   version 1.
6. **Handling markings.** Every handling marking that applies to what the image shows is written
   into the file's metadata -- SVG `<metadata>`, the PDF document information, a PNG `tEXt` chunk --
   and, by default whenever a marking is held, drawn as a visible banner on the image; the caller
   may turn the banner off. A marking that cannot be written is reported with `W_GRAPHTY_HANDLING`.
7. **Text is never markup here either.** Every string an image export writes that came from a
   document or the data -- legend titles, units, labels, layer names, note texts -- is XML-escaped
   in SVG and written as text in PDF. An SVG export contains no `<script>`, no `<foreignObject>`,
   no event attributes and no links, so a legend carrying `</text><script>...` is shown as those
   characters when the SVG is served inline from a wiki.

## Worked example

The genomics persona's deliverables (`W25.yaml`, step 4: "node and edge tables with all computed
columns ... a graph file (GraphML, CX) for collaborators"), from a session with the expression
overlay style, a PageRank run `pagerank`, a Louvain run `modules` and positions:

- **GEXF**: attributes including `logFC` and `padj`; `pagerank.value`, `pagerank.rank`,
  `modules.group`; `viz:position` for every node; `viz:color` baked from the overlay, `viz:size`
  and `viz:shape` (`sphere` written as `disc`). Loss notes: `W_GRAPHTY_STYLE_RULES` (3 layers),
  `W_GRAPHTY_LAYER_EXCLUDED` for the `significant` highlight layer (not baked unless included),
  `W_GRAPHTY_RECIPE` (2 runs).
- **GraphML today**: attributes and results; no positions and no appearance, each reported; with the
  proposed yFiles writer, positions and appearance as well.
- **CSV**: `nodes.csv` with attributes, results and their `__estimated` and `__missing` columns;
  `edges.csv`; every appearance channel and the positions reported; label cells beginning with `=`
  neutralised and counted.
- **Sidecar**: `network.graphty.json` referencing `network.gexf` by digest, carrying the data
  source, the style, a recipe with both steps, a data plan regenerated for the GEXF file with each
  result column's origin, and the import and run records, so a co-author with graphty reopens the
  session with the published numbers bound as results, and one without it still has a standard
  GEXF file. For the CSV export the sidecar names `edges.csv` as the main input and
  `nodes.csv` as `inputs.nodes`. The notes are left out and reported unless the author asks for
  them.
- **CX2** (once graph-io writes it): the same attributes and results, positions, the overlay's
  rules as `visualProperties`, and the authors, licence and reference as `networkAttributes`.
