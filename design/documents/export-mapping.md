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
candidate signature, `exportGraph(format, options) -> Promise<{ text, lossNotes }>`, also lacks the
run manifest, which this page requires the export to return (below); the update should add
`manifest: RunRecord[]`, as the element API design's `ExportResult` (section 4.3.6) already has. The plan's other open item on the export, whether third
parties may register writers, remains open (README, "Open decisions").

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

- **Column name.** `<runId>.<field>`, for example `pagerank.value`, `hubs__score.rank`,
  `rings.group`. This mirrors the path a style reads (`results.<runId>.<field>`), so a reader can
  find the column a layer painted from. With the option `resultColumns: "as"`, runs a recipe
  produced are written under the recipe's own `as` (`score.rank`), so a script reads the same
  column whichever namespace the session gave the run. The naming is a published contract for
  scripts in R and Python, so it is open decision 23.
- **Reading one back.** Re-imported, such a column is an ordinary attribute whose name contains a
  dot. A path reads it only quoted: `data."pagerank.value"`; `data.pagerank.value` reads a nested
  field and resolves to nothing (README, "Paths").
- **Names per format.** GEXF, GraphML, CSV, the JSON dialects, DOT (quoted ids) and Neo4j
  (properties) hold the dotted name as written. GML keys are letters and digits only, and Pajek has
  no named attribute columns; for those two the mapping of result columns is not specified in
  version 1 and each result column is reported (`W_GRAPHTY_RESULT_NAME`) with the name graph-io's
  `sanitizeIds` gave it. A name that collides with an imported attribute is written with `__2`
  appended and reported.
- **Fixed headers.** CSV writes the node table with the header `id` first (and `label` when the
  data has labels) and the edge table with `source`, `target` first (and `id` when edges carry
  ids); the JSON node-link dialect uses `id`, `source` and `target`. The other formats carry
  identity in their own structure (XML attributes, DOT node ids).
- **Role.** A result field that is a partition gets the `community` role, a rank the `rank` role, a
  component id the `component` role, so formats that map roles (GEXF's partitions, Cytoscape's
  classes) place them.
- **Caveats and missing values** follow the design studio's recommendation (door 61 of
  `design/ui/framework/one-way-doors.md`: caveats travel as sibling columns): a column
  `<column>__estimated` (boolean) and a column `<column>__missing` (the reason word:
  `not-computed`, `no-value`). They are written for every run whose algorithm can estimate or leave
  values missing, whether or not this run did, so one recipe always yields the same columns and a
  script does not break on the dataset where nothing was sampled. How a value was estimated (the
  method and sample size) is in the run record (below), which the `__estimated` column points to;
  a missing value is an empty CSV cell, JSON `null`, or an absent GraphML `<data>` element.
- **Default scope.** Every run the session holds. The caller may name runs; a run left out is
  reported with `W_GRAPHTY_RUN_EXCLUDED` (`column`: the run id). Hiding a layer never changes which
  columns a file has.

### Resolved appearance

A third-party format that can hold appearance holds it per element, not as rules. GEXF's `viz`
module records a colour, a size and a shape on each node; it has no way to say "colour by logFC on
a diverging scale". So exporting a style to such a format is a bake: graphty-element resolves every
layer for every element and writes the resulting values. The rules themselves are lost and
reported (`W_GRAPHTY_STYLE_RULES`), and travel intact only in a style document (below).

The element API design materializes a resolved style only through `explain()`, one element at a
time. An export needs a columnar resolution path that computes the four role columns for every
element in one pass. That is new graphty-element work.

The channel-to-role table:

| Element channel | graph-format role | Translation | Loss note when it cannot be written |
|---|---|---|---|
| `node.color` | `color` (node) | the resolved RGBA; alpha kept where the format has it | `W_GRAPHTY_CHANNEL` |
| `node.size` | `size` (node) | scene units, written as the number | `W_GRAPHTY_CHANNEL` |
| `node.shape` | `shape` (node) | the shape table below | `W_GRAPHTY_SHAPE` for each translated or dropped shape |
| `node.opacity` | folded into the colour's alpha | alpha times opacity | -- |
| `edge.color` | `color` (edge) | as nodes | `W_GRAPHTY_CHANNEL` |
| `edge.width` | `thickness` (edge) | scene units | `W_GRAPHTY_CHANNEL` |
| `edge.style` | `shape` (edge) | `solid` to solid, `dash` to dashed, `dot` to dotted, others to solid | `W_GRAPHTY_SHAPE` |
| `node.label`, `edge.label` | `label`, only when the data has no label column | the resolved text | -- |
| any channel of a layer with `kind: "highlight"` | as its channel, unless excluded | -- | `W_GRAPHTY_HIGHLIGHT_BAKED` for each highlight layer baked, naming it |
| every other channel (outline, glow, arrows, label styles, tooltips, curvature, animation, wireframe, flat) | none | -- | `W_GRAPHTY_CHANNEL`, one note per channel with the count of elements it painted |

Node shapes. The element draws 3D solids; GEXF has `disc`, `square`, `triangle`, `diamond` and
`image`:

| Element shape | GEXF shape |
|---|---|
| `sphere`, `icosphere`, `geodesic`, `goldberg`, `capsule`, `cylinder`, `torus`, `torus-knot` | `disc` |
| `box` and the prisms | `square` |
| `tetrahedron`, `cone` and the pyramids | `triangle` |
| `octahedron` and the dipyramids | `diamond` |
| any other | `disc`, reported |

## Per format

"Today" is what graph-io's exporters write now. "Proposed" is new graph-io writer work needed for
"whatever the format supports" to be true; it is listed as an open decision (README).

| Format | Attributes | Positions | Results as attributes | Resolved appearance today | Proposed appearance writer | Graph-level attributes |
|---|---|---|---|---|---|---|
| GEXF 1.3 | yes, typed | yes, with z | yes | yes: `viz:color`, `viz:size`, `viz:shape`, edge `viz:thickness` and shape | -- | no |
| GraphML | yes, typed (no lists or nested values) | no | yes | no | yFiles `y:ShapeNode` geometry, fill, shape and `y:PolyLineEdge` line style and width; this also gives positions | yes |
| GML | yes | yes | yes | no | the `graphics` block (`x`, `y`, `w`, `h`, `fill`, `type`, `width`) | yes |
| DOT | yes, as attributes | yes (`pos`) | yes | no | `color`, `fillcolor`, `shape`, `penwidth`, `width`, `style` | yes |
| Pajek | a fixed set (label, shape, parameters) | yes | numbers as vectors or partitions only; others reported | no | the vertex shape and colour parameters Pajek's `.net` defines | no |
| CSV | yes, one node table and one edge table | no | yes | no | none: CSV has no appearance; write colour and size as ordinary columns only when the caller asks | no |
| JSON node-link, JGF, graphology | yes, including nested values | no | yes | no | none standard | yes |
| JSON d3, vis | yes | no | yes | no | vis: `color`, `size`, `shape`, `width` per element | no |
| JSON Cytoscape | yes | yes | yes | no | the `style` array and per-element `classes`; this is the one JSON dialect that can hold rules as well as values | yes |
| CX2 (Cytoscape Exchange, NDEx) | -- | -- | -- | not written today | proposed first: attributes as `attributeDeclarations` and node and edge attributes, positions as `cartesianLayout`, results as attributes, and style rules as `visualProperties` (defaults, and continuous, discrete and passthrough mappings from bindings), with per-element values as `nodeBypasses` / `edgeBypasses` only where a layer names ids | `networkAttributes` |
| Neo4j | yes, as properties | no | yes | no | none: a database has no appearance | no |

Number precision and the Excel byte-order mark that the data-export capability asks for
(`design/designloom/capabilities/data-export.yaml`: six decimals, an optional BOM) are not options of
graph-io's exporters today (`CommonExportOptions` has only `sanitizeIds` and `onMixedDirection`).
They are properties of how a file is written, so they belong in graph-io's CSV and JSON writers, and
graphty-element passes them through.

**Document metadata.** A document's shared metadata (README: `name`, `authors`, `license`,
`citation`, `doi`, `recipeVersion`) is written to the format's graph-level attributes where it has
them (GraphML, GML, DOT, the JSON dialects that have a graph object) and to CX2's
`networkAttributes` (`name`, `author`, `rights`, `reference`, `version`), which is what NDEx reads
when a network is published there. Publishing to NDEx itself is out of scope.

**Typed node identity.** When the graph has type-qualified ids (data-plan.md, "Node types"), every
format writes the qualified id (`"account:123"`) as the node id and adds the `kind` and
`originalId` columns, so a re-import through the same data plan round-trips exactly; a format that
cannot hold the extra columns reports `W_GRAPHTY_TYPED_ID`.

**CSV cells.** A CSV cell that begins with `=`, `+`, `-`, `@`, a tab or a carriage return is written
prefixed with a single quote, so a spreadsheet does not run it as a formula (the OWASP guidance on
CSV injection); a label from a hostile file or a note's text would otherwise become a live formula
when the analyst opens the file. The number of cells neutralised is reported
(`W_GRAPHTY_CSV_NEUTRALIZED`). A caller whose consumer is not a spreadsheet MAY turn it off. A
negative number is a number, not a text cell, and is not prefixed.

For every row, every capability marked "no" produces a loss note naming what was not written and
how many elements it affected, and every column the format's own `check()` refuses produces
graph-io's note.

## graphty's documents beside an export

No third-party format graph-io writes can hold a style's rules, a recipe, a data plan, a view or
annotations as graphty means them. (CX2, Cytoscape's exchange format, can hold style rules; graph-io
does not write it yet, and it is the first proposed writer, above.)

An export therefore reports each member it did not carry:

| Code | When | `column` | `count` |
|---|---|---|---|
| `W_GRAPHTY_STYLE_RULES` | the session has authored style layers; values may have been baked, the rules were not written | null | number of layers |
| `W_GRAPHTY_CHANNEL` | a painted channel has no place in the format | the channel name | elements painted |
| `W_GRAPHTY_SHAPE` | a shape or line pattern was translated or dropped | the channel name | elements affected |
| `W_GRAPHTY_RECIPE` | results were written, the steps that produced them were not | null | number of runs |
| `W_GRAPHTY_VIEW` | the session has saved views | null | number of views |
| `W_GRAPHTY_NOTES` | the session has notes and they were not written | null | number of notes |
| `W_GRAPHTY_DATA_PLAN` | declared measurement levels or weight roles were not written | the column | null |
| `W_GRAPHTY_RUN_EXCLUDED` | a run the session holds was not written | the run id | elements |
| `W_GRAPHTY_RESULT_NAME` | a result column was renamed for the format | the new name | null |
| `W_GRAPHTY_HIGHLIGHT_BAKED` | a highlight layer's values were baked into the appearance | the layer id or name | elements painted |
| `W_GRAPHTY_TYPED_ID` | typed identity columns could not be written | null | nodes |
| `W_GRAPHTY_CSV_NEUTRALIZED` | cells were prefixed so a spreadsheet does not run them | the column | cells |
| `W_GRAPHTY_FILTER` | a filter was active and is not saved | null | elements hidden |

These codes are new and, like graph-io's, are a published contract.

To keep them, the export API SHOULD offer a **sidecar envelope**: an envelope (envelope.md) whose
data member names the exported file (`url` relative to the envelope, `digest`, `format`, `options`;
for CSV the edge table as the main input and the node table as `inputs.nodes`) and whose other
members are the session's style, recipe (with its `application` block), view, a data plan for the
exported file, and `runs`. Annotations are written only when the caller asks, and otherwise
reported under `W_GRAPHTY_NOTES`, for the reason given under "Notes in a data export".

1. **The sidecar's data plan is regenerated for the exported file**, never copied from the original
   import: `knownFields` name the headers the exporter wrote (for example `Source` and `Target` in
   a Gephi-dialect CSV), there are no renames (they were applied on import), and there is one
   attribute declaration per written column, including result columns, with their level and, for a
   result used as a weight, its weight role.
2. **Reopening.** The pair `network.graphml` and `network.graphty.json`, opened by an application
   that passes both files (envelope.md, "Fetching"), reopens with the same data, style, view, run
   records and recipe; the result columns come back as attributes, and the results themselves come
   back as runs only by running the recipe (the JSON container stores no results) or from a zip
   container. The GraphML file stays a plain GraphML file for every other tool. With the zip
   container, the exported file can be a part of the archive instead.

Embedding graphty documents inside the third-party file (as a GraphML or GEXF graph attribute
holding the JSON) is technically possible and is not recommended for version 1: every other tool
would carry an opaque blob it cannot read and may silently drop on re-save, which turns a loss the
export reported into one nobody sees. It is an open decision.

### Notes and judgements in a data export

Notes are never written into a data export or its sidecar by default: they may hold judgements a
reader did not intend to share with the data ("suspect"), which is the intelligence and fraud
personas' concern (`design/designloom/personas/intelligence-analyst.yaml`, `fraud-analyst.yaml`).
The same judgement can leak as colour: a "suspects" highlight layer baked into `viz:color` shows
exactly which accounts are suspected. So the caller can exclude style layers from the baked
appearance by `kind` or by id, and every baked highlight layer is reported
(`W_GRAPHTY_HIGHLIGHT_BAKED`). Both defaults narrow the owner's "whatever the format supports",
which is open decision 28. When the caller asks
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
- without a sidecar, as `<name>.runs.graphty.json`, an envelope holding only `runs` (and, when the
  runs came from a recipe, the recipe), beside the exported file.

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

## Images

Figure export (PNG, SVG, PDF) with a legend derived from the style stack -- each binding's
`legend` title, units and missing label (style.md) -- is not specified here. It is graphty-element
work that reads the style documents defined in this directory and writes no document of its own.

## Worked example

The genomics persona's deliverables (`W25.yaml`, step 4: "node and edge tables with all computed
columns ... a graph file (GraphML, CX) for collaborators"), from a session with the expression
overlay style, a PageRank run `pagerank`, a Louvain run `modules` and positions:

- **GEXF**: attributes including `logFC` and `padj`; `pagerank.value`, `pagerank.rank`,
  `modules.group`; `viz:position` for every node; `viz:color` baked from the overlay, `viz:size`
  and `viz:shape` (`sphere` written as `disc`). Loss notes: `W_GRAPHTY_STYLE_RULES` (3 layers),
  `W_GRAPHTY_CHANNEL` for `node.outline` (41 elements), `W_GRAPHTY_RECIPE` (2 runs).
- **GraphML today**: attributes and results; no positions and no appearance, each reported; with the
  proposed yFiles writer, positions and appearance as well.
- **CSV**: `nodes.csv` with attributes, results and their `__estimated` and `__missing` columns;
  `edges.csv`; every appearance channel and the positions reported; label cells beginning with `=`
  neutralised and counted.
- **Sidecar**: `network.graphty.json` referencing `network.gexf` by digest, carrying the style, a
  recipe with both steps and its `application` block, a data plan regenerated for the GEXF file,
  and the run records, so a co-author with graphty reopens the session and one without it still
  has a standard GEXF file. For the CSV export the sidecar names `edges.csv` as the main input and
  `nodes.csv` as `inputs.nodes`. The notes are left out and reported unless the author asks for
  them.
- **CX2** (once graph-io writes it): the same attributes and results, positions, the overlay's
  rules as `visualProperties`, and the authors, licence and reference as `networkAttributes`.
