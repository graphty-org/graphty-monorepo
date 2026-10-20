# Graphs in and out

`cy.graphtyGenerate()` makes a seeded graph, `cy.graphtyDataset()` loads a sample network,
`cy.graphtyImport()` reads a file and `cy.graphtyExport()` writes one. Each returns a promise and
downloads its code on first use.

This example makes four groups of 25 nodes and colors each node by its group:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const palette = ["#e15759", "#4e79a7", "#59a14f", "#f28e2b"];
const cy = cytoscape({
    container: document.getElementById("cy"),
    style: [{ selector: "node", style: { "background-color": (n) => palette[n.data("community")] } }],
});

cy.graphtyGenerate("planted-partition", { groups: 4, groupSize: 25, pIn: 0.3, pOut: 0.01, seed: 7 }).then(() =>
    cy.layout({ name: "graphty-forceatlas2" }).run(),
);
```

`pIn` is the chance of an edge inside a group and `pOut` between groups. Each node's group number
is in `data("community")`.

## Generators

`cy.graphtyGenerate(name, options)` resolves to `{ elements, directed }`: the added collection and
whether the graph is directed. Examples: `"erdos-renyi"` (`n`, `p`), `"grid"` (`rows`, `cols`)
and `"named"` (`name`, such as `"frucht"`); the [generator reference](../reference/graphs#generators)
lists all 59. A misspelled name or option (`seeed`) rejects with a `RangeError` listing the valid ones.

- Random generators take `seed` (default `0`); the same seed gives the same graph everywhere.
  Node ids are `"0"`, `"1"`..., edge ids `"e0"`, `"e1"`...
- Ground truth becomes a node data field, such as `community` (from 0) for `planted-partition` and
  `lfr`, `side` (0 or 1) for `random-bipartite`, or `layer` for `random-dag`.
- `weights` gives each edge a `data.weight`, for example `{ kind: "uniform", min: 1, max: 10 }`.
  Flow networks write their capacities there.
- Nodes sit at the origin until you run a layout, except in the geometric generators and lattices
  given `positions: true`, which place them about 1 unit apart: spread them with
  `cy.layout({ name: "preset", spacingFactor: 50 }).run()`.

## Sample datasets

`cy.graphtyDataset(name, options)` adds a real network and resolves to `{ elements, directed }`.
`await cy.graphtyDataset("karate")` adds Zachary's karate club: 34 nodes, 78 undirected edges, and
each member's faction in `data("club")` (`"Mr. Hi"` for node `"0"`). Edges get random ids from
Cytoscape on every load; match them by `source()` and `target()`.

Every dataset downloads from graphty.app when it is asked for; none is inside the package, so the
first call needs the network (pass `baseUrl` to load them from a mirror of your own). `yeast-perturbation`, `stelzl-interactome`,
`wikipathways-senescence-autophagy` and `bioplex3-hct116` are drawings: each node sits where
Cytoscape drew it. Each dataset has its own license, not this package's MIT; the
[dataset reference](../reference/graphs#datasets) lists them.

## Importing a file

`cy.graphtyImport(input, format, options)` adds the graph in a file and resolves to
`{ elements, directed, format, report }`. It reads `gexf`, `graphml`, `gml`, `dot`, `pajek`, `csv`,
`json`, `neo4j`, `xgmml`, `cx2`, `cx`, `obo` and `cys` (a Cytoscape desktop session, passed as
bytes); `graphtyExport` writes the first ten. This example reads GraphML with a duplicate node:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);
const cy = cytoscape({ headless: true });

const graphml = `<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <graph edgedefault="directed">
    <node id="a"/>
    <node id="b"/>
    <node id="c"/>
    <node id="b"/>
    <edge id="e1" source="a" target="b"/>
    <edge id="e2" source="b" target="c"/>
  </graph>
</graphml>`;

const { elements, directed, report } = await cy.graphtyImport(graphml, "graphml");
for (const issue of report.issues) {
    console.warn(`${issue.severity} ${issue.code} on line ${issue.line}: ${issue.message}`);
}
console.log(`${elements.nodes().length} nodes, ${elements.edges().length} edges, directed: ${directed}`);
```

It prints `warning W_DUPLICATE_NODE on line 6: node "b" is declared twice; the declarations are
merged`, then `3 nodes, 2 edges, directed: true`.

The input is a string, a `Uint8Array`, an `ArrayBuffer` (`await response.arrayBuffer()`) or a
`ReadableStream` (`file.stream()`). `format`
defaults to `"auto"`, which detects the format from the content; `filename` and `mimeType` only
break near ties. Most text reads as CSV with no warning: `"hello world"` imports as an edge from
`hello` to `world`. Pass the format when you know it, or check the returned `format`.

The report has `issues` (each with `severity`, `code`, `message`, `line` and `element`),
`warningCount` and `errorCount`. An error in one element, such as an edge weight of `"heavy"`,
skips that element. More than `errorLimit` errors, input malformed for the format you passed, or no
node read at all rejects with an error named `"ImportError"` (`code` `"E_IMPORT"`) whose `report`
holds the issues read so far, and adds nothing.

`report.lossy` lists what the importer read but could not keep, such as skipped hyperedges. A z
coordinate in GEXF, GML, DOT or Pajek is dropped with no entry.

Every format takes these options; the [format reference](../reference/graphs#file-formats) lists
each format's own:

| Option             | Default    | Meaning                                                      |
| ------------------ | ---------- | ------------------------------------------------------------ |
| `weightFrom`       | `"weight"` | Attribute that becomes `data.weight` (GML: `"value"`)        |
| `encoding`         | from file  | Forces the encoding of byte input, such as `"windows-1252"`  |
| `defaultDirected`  | per format | Direction of a file that declares none                       |
| `onMixedDirection` | `"expand"` | Or `"directed"`, `"undirected"`, `"error"`; see below        |
| `errorLimit`       | `100`      | Element errors before the import rejects                     |
| `nodeIdFrom`       | `"id"`     | GML and Pajek: `"label"` makes the label the node id         |
| `duplicateEdges`   | `"keep"`   | Or `"error"`, `"first"`, `"last"`, `"sum"`, `"min"`, `"max"` |
| `addMissingNodes`  | `true`     | Add nodes that only edges name (GEXF: `false`)               |
| `hyperedges`       | `"skip"`   | GraphML: or `"error"`, `"star"`, `"clique"`                  |
| `selfLoops`        | `"keep"`   | Or `"drop"`, `"error"`                                       |
| `graphIndex`       | `0`        | Which graph of a file holding several (or `graphName`)       |
| `signal`           | none       | An `AbortSignal` that cancels the import                     |
| `onProgress`       | none       | Called with the bytes read and the total, when known         |

`"expand"` reads a file mixing directed and undirected edges as directed, each undirected edge as
two.

### How a file maps onto elements

- Every attribute becomes a data field of the same name, except the reserved `id`, `source`,
  `target` and `parent`, which are renamed (such as `parent#2`) with a `W_COLUMN_RENAMED` warning.
- The edge weight becomes `data.weight`. Ids are the file's ids as strings. In GraphML, GEXF,
  XGMML, CX2, CSV and Cytoscape JSON, an edge repeating an earlier edge's id is skipped and
  reported as `E_DUPLICATE_EDGE_ID`. In GML and DOT the edge is kept, Cytoscape gives it a new id,
  and the report has a `W_EDGE_ID_DROPPED` warning. An edge id that is also a node id gets the same
  warning and a new id in every format.
- A compound parent (GraphML nested graph, DOT cluster) becomes `data.parent`.
- Import with `styles: true` to draw a file's styles (see [Styles in and out](#styles-in-and-out)):
  the stylesheet carries them, and a GEXF `viz:color`, `viz:size`, `viz:shape` and `viz:thickness`
  are not data fields. Without `styles`, they are: `data.color` as four numbers from 0 to 1 (red,
  green, blue, alpha), `data.size`, `data.shape` and `data.thickness`. These fields are deprecated
  and are removed in the next major release; use `styles: true` instead.
- Positions become node positions; nodes without one sit at the origin. CX, CX2 and XGMML put a
  z coordinate in `data.z`. CX, CX2, XGMML and Cytoscape JSON keep Cytoscape's own coordinates, so
  a node sits where Cytoscape drew it. GEXF, GML, DOT and Pajek are y-up, so y is negated on import
  and on export.

## Direction and existing elements

A Cytoscape graph has no direction of its own, so every loading method returns `directed`: pass it
to the algorithms and `graphtyExport` as their `directed` option.

The loading methods add to whatever the core holds. A taken node id rejects with an `IdTakenError`
(`code` `"E_ID_TAKEN"`) and adds nothing; a taken edge id gets a new id from Cytoscape. Generated
graphs always number nodes from `"0"`, so call `cy.elements().remove()` before loading a second one.

## Exporting a file

`cy.graphtyExport(format, options)` resolves to the file's text. `eles.graphtyExport()` does the
same for a collection: its nodes, and those of its edges whose two ends are both in it. A node whose
parent is not in the collection is written without a parent, and `onLoss` does not report it.

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);
const cy = cytoscape({ headless: true });
const { directed } = await cy.graphtyDataset("les-miserables");

const graphml = await cy.graphtyExport("graphml", {
    directed,
    onLoss: (notes) => notes.forEach((n) => console.warn(n.code, n.column, n.message)),
});
```

Every format takes `directed` (default `false`), `onLoss` and `sanitizeIds` (default `"mangle"`),
explained below; the [format reference](../reference/graphs#file-formats) lists the rest.

The export writes every data field, position, parent and edge id the format can hold. A numeric
edge `weight` becomes the file's edge weight, and a string `label` goes to the format's label slot.
Hidden elements are written too; export `cy.elements(":visible")` to leave them out. Headless, that
needs `styleEnabled: true`, and such a core keeps a timer running: in Node, call `cy.destroy()` when
done or the process never exits.

Without `onLoss`, what a format cannot hold is dropped or converted silently. `onLoss` runs once
before writing, if anything is lost. Each note has `code` (such as `"W_POSITIONS_DROPPED"`),
`message`, `column` (a data field, `"position"`, `"id"` or `null`) and `count`. Import undoes these,
so ignore them: `W_ID_MANGLED`, `W_ID_RENUMBERED`, `W_GML_JSON_ARRAY`,
`W_GML_RECORD_NUMBER_TYPE`, `W_CSV_NODE_ORDER`, `W_INTEGRAL_F64_AS_I32`, and on CX2
`W_DTYPE_UNSUPPORTED` for `id`. `W_DOT_CLUSTER_MARKED` is not undone: a DOT parent reads back with
`data["graphty.cluster"]` set to `true`, and the import report has a `W_DOT_CLUSTER_NODE_MERGED`
warning.

### What a round trip keeps

Through `graphtyExport` and `graphtyImport`, an undirected graph keeps its node ids, edge `weight`
and number, string and boolean fields in every format, except that GML reads booleans back as `1`
and `0` and CSV without its node table loses node fields.

| Format    | Edge ids | Parents | Positions | Lists | Direction |
| --------- | -------- | ------- | --------- | ----- | --------- |
| `gexf`    | kept     | kept    | kept      | text  | kept      |
| `graphml` | kept     | kept    | lost      | text  | kept      |
| `gml`     | kept     | lost    | kept      | kept  | kept      |
| `dot`     | kept     | kept    | kept      | lost  | kept      |
| `pajek`   | new      | lost    | kept      | lost  | kept      |
| `csv`     | kept     | lost    | lost      | text  | kept      |
| `json`    | kept     | kept    | kept      | kept  | directed  |
| `neo4j`   | new      | lost    | `[x, -y]` | text  | directed  |
| `xgmml`   | kept     | kept    | kept      | text  | kept      |
| `cx2`     | new      | lost    | kept      | text  | directed  |

"new" edge ids come from Cytoscape (CX2: `"0"`, `"1"`). With `[x, -y]` the node sits at the origin and the array is in `data.position`.
"text" lists read back as JSON text (`'["x","y"]'`). "directed" formats have no
undirected form; import Cytoscape JSON with `{ defaultDirected: false }` to read it as undirected.
CX2 writes a node's `label` to `name`, which reads back as `data.name`.

CSV writes one table per file; the default edge table loses node fields and nodes without edges.
Write the node table too with `cy.graphtyExport("csv", { table: "nodes" })`, then read both
with `graphtyImport(edgeTable, "csv", { nodes: nodeTable })`.

GML and CX2 take only integer node ids, and Pajek numbers its nodes 1 to N. The default
`sanitizeIds: "mangle"` keeps each other id in an attribute that `graphtyImport` restores; import
with `restoreMangledIds: false` to keep the numbers and get the old id in
`data.graphty_originalId`. With `"error"`, GML and CX2 reject, and Pajek ids read back as `"1"` to
`"N"`.

## Styles in and out

Many files also say how the graph looks: Gephi's node colors and sizes in GEXF, yEd's shapes in
GraphML, Graphviz attributes in DOT, Cytoscape desktop's visual style in XGMML, CX, CX2 and
sessions, a Cytoscape.js stylesheet in JSON. `styles: true` reads that look into Cytoscape, and
writes the core's look back out. This example draws a Gephi file in Gephi's colors, recolors one
node, and saves the result as GraphML:

<!-- example: styles-in-and-out (run by test/docs-styles-example.test.ts) -->

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);
const cy = cytoscape({ headless: true, styleEnabled: true });

const gexf = `<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">
  <meta><creator>Gephi 0.10.1</creator></meta>
  <graph><nodes>
    <node id="a"><viz:color r="228" g="26" b="28"/></node>
    <node id="b"><viz:color r="55" g="126" b="184"/></node>
  </nodes><edges><edge id="ab" source="a" target="b"/></edges></graph>
</gexf>`;

const { directed } = await cy.graphtyImport(gexf, "gexf", { styles: true, applyStyles: true });
console.log(cy.$id("a").style("background-color")); // rgb(228,26,28)

cy.style().selector("#b").style("background-color", "gold").update();
const graphml = await cy.graphtyExport("graphml", {
    directed,
    styles: true,
    onLoss: (notes) => notes.forEach((n) => console.warn(n.code, n.style ?? n.column, n.message)),
});
cy.destroy();
```

`graphml` holds both colors (`b` in gold) as yEd draws them, and importing it with
`styles: true, applyStyles: true` draws the same. The example runs as a Node module; in a module a
bundler builds, put it in an `async` function, as
[Getting started](./getting-started#keep-await-out-of-the-top-level) explains. A headless core needs `styleEnabled: true` to
draw styles, and keeps a timer running: call `cy.destroy()` when done.

### Reading a file's styles

With `styles: true`, `graphtyImport` also resolves to `stylesheet`: the file's colors, sizes,
shapes, borders, labels, line styles and arrows as a Cytoscape.js stylesheet. `applyStyles: true`
appends it to the core's stylesheet and gives each element the per-element overrides that make it
draw exactly as the file says. Without `applyStyles` nothing is drawn, so you can look at the rules
first, or append them yourself:

```js
const { stylesheet } = await cy.graphtyImport(text, "auto", { styles: true });
for (const rule of stylesheet) {
    cy.style().selector(rule.selector).style(rule.style);
}
cy.style().update();
```

Append the rules one by one like this rather than through `cy.style().fromJson([...cy.style().json(),
...stylesheet])`: `json()` writes a function-valued property of the core's own stylesheet as the
string `"fn"`, which Cytoscape.js then rejects.

The stylesheet alone draws what the file's rules say; an element the rules cannot describe exactly
(a file that sets one node's color by hand, for example) looks right only with `applyStyles`.

What the file leaves to the program that wrote it gets that program's default, so the graph looks
as it does there (a Gephi node with no size is drawn 10 wide, and a Gephi edge with no color takes
the mix of its two nodes' colors, as Gephi's Preview draws it; graph-io's
[Styles guide](https://graphty.app/docs/graph-io/guide/styles.html) lists every program's defaults): Gephi's for GEXF, yEd's for yEd GraphML, Graphviz's for DOT, Cytoscape desktop's
for XGMML, CX, CX2 and sessions, Cytoscape.js's for Cytoscape JSON. `styles: { toolDefaults: false }`
leaves the defaults out. CSV, Neo4j, OBO and NetworkX or d3 JSON carry no styles, so
`stylesheet` is absent. Anything the import could not read is a `W_STYLE_` warning in `report.issues`.

Each rule applies only to the elements of its own import. Every element an import with `styles`
adds gets an import id in `data.graphty_import` (`"1"`, `"2"`, ..., or the `importId` option), and
every selector tests it (`node[graphty_import = "1"]`), so a second file loaded into the same core
never recolors the first. The file's rules come after the rules the core already has; to override
them, add your own rules after the import, as the example does.

### Writing the core's styles

With `styles: true`, `graphtyExport` writes the core's stylesheet (`cy.style()`), taking what the
core draws for each element (`ele.style()`) as the truth. A selection writes the styles of its own
elements. Each format gets the look in its own style slots, so the program the format belongs to
draws it, plus the rules themselves in a `graphty.styles` block that other programs skip, so
`graphtyImport` with `styles: true` rebuilds the same rules. The values those rules read are
written beside it as `graphty_style_*` (or `graphty.style.*`) attributes on the elements, with
`graphty_import`; yEd and Cytoscape desktop show them as ordinary attributes:

| Format    | Other programs see                                     | Rules come back |
| --------- | ------------------------------------------------------ | --------------- |
| `gexf`    | Gephi's colors, sizes, shapes and edge thickness       | yes             |
| `graphml` | yEd's graphics                                         | yes             |
| `gml`     | yEd's `graphics` and `LabelGraphics`                   | yes             |
| `dot`     | Graphviz attributes                                    | yes             |
| `pajek`   | Pajek's vertex and edge parameters, colors by name     | yes             |
| `json`    | a Cytoscape.js stylesheet (`style`)                    | yes             |
| `xgmml`   | Cytoscape desktop's `graphics` for every element       | yes             |
| `cx2`     | a Cytoscape visual style: defaults, mappings, bypasses | yes             |
| `csv`     | nothing                                                | no              |
| `neo4j`   | nothing                                                | no              |

`onLoss` hears what the format cannot keep, one note per property, each with
`style: { target, property }` (such as `{ target: "edge", property: "arrowSize" }`):

| Code                      | What is lost                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `W_STYLE_NOT_WRITTEN`     | The format has no slot for the property, so other programs do not see it; graphty reads it back where the rules come back |
| `W_STYLE_APPROXIMATED`    | Written as the nearest value the format has (a shape GEXF lacks, a color as the nearest Pajek color name)                 |
| `W_STYLE_RULES_NOT_KEPT`  | The format keeps no rules (CSV, Neo4j), so the look is lost                                                               |
| `W_STYLE_LAYER_FLATTENED` | A rule the format's own style language cannot express, or a function-valued property, is written per element              |

The core draws every property, its own defaults included, so a format with no slot for opacity,
visibility or arrows reports them even when no rule of yours sets them. A note about a property
you never styled says only that the format cannot hold Cytoscape.js's default; it is safe to ignore
when that default is what you want.

`onLoss` also hears what a format loses that is not a style: positions it has no place for
(`W_POSITIONS_DROPPED`), a label column read back under its role (`W_ROLE_ASSUMED`), a list value
written as JSON text (`W_JSON_UNSUPPORTED`, which a Gephi file's `data.color` array gets in GraphML;
the colors themselves are in the style slots). Every code is listed on graph-io's
[codes page](https://graphty.app/docs/graph-io/guide/codes.html).

Without `styles`, `graphtyExport` writes exactly what it always did, and `onLoss` hears
`W_STYLES_NOT_EXPORTED` when the core has a stylesheet of its own. A headless core created
without `styleEnabled: true` has no styles to write: `styles: true` then writes the data alone,
and `onLoss` hears `W_STYLES_NOT_EXPORTED` saying so.

## Without a core method

`generateElements` (synchronous) and `datasetElements` from `@graphty/cytoscape-extensions/samples`,
and `importElements` from `@graphty/cytoscape-extensions/io`, return element definitions for
`cy.add()`. `exportElements(eles, format, options)` from the io entry takes a collection; to export
definitions, put them in a headless core with the `preset` layout, or Cytoscape's default grid
layout overwrites their positions:

```js
import cytoscape from "cytoscape";
import { exportElements } from "@graphty/cytoscape-extensions/io";
import { generateElements } from "@graphty/cytoscape-extensions/samples";

const { elements } = generateElements("grid", { rows: 2, cols: 2, positions: true });
const eles = cytoscape({ headless: true, elements, layout: { name: "preset" } }).elements();
const gexf = await exportElements(eles, "gexf");
```

## Next

- [Karate club story](https://graphty.app/storybook/cytoscape-extensions/?path=/story/gallery-datasets--karate): pick a format in its round-trip control to write the graph and read it back in the browser.

- [Load a GraphML file](./recipes/load-graphml-file): let a user pick a file, show it, and save it back.
- [Generators, datasets and formats](../reference/graphs): every option, size and license, and the galleries.
