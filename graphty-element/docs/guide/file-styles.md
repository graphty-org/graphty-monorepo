# Styles from Files

Many graph files say what the graph looks like as well as what it holds: Gephi writes node colors
and sizes into GEXF, yEd writes shapes and fills into GraphML, Cytoscape keeps a whole visual style
in its CX, CX2, XGMML and session files, a Cytoscape.js document carries a stylesheet, and DOT
nodes have colors and shapes. Load with `styles: "file"` and graphty-element draws those styles as
ordinary style layers, so the graph looks as it does in the program that wrote the file. Export
with `styles: true` and the layers go back into the file.

```ts
import type { Graphty } from "@graphty/graphty-element";

export async function openAndSave(el: Graphty, url: string): Promise<string> {
    // Draw the file's own colors, sizes, shapes and labels as style layers.
    await el.loadFromUrl(url, { styles: "file" });

    // The layers the file made, and what could not be drawn as the file draws it.
    const styles = el.session.data.lastImport()?.styles;
    console.log(styles?.layers.length, "layers");
    for (const note of styles?.notes ?? []) console.warn(note.code, note.params);

    // Save the graph with its styles; loading the file back with styles: "file" rebuilds the layers.
    const out = await el.exportGraph("graphml", { styles: true });
    for (const loss of out.losses) console.warn(loss.code, loss.params); // your app words each code
    return out.text();
}
```

Without `styles: "file"` a load reads the data alone, exactly as it always has: the default is
`"none"`. Without `styles: true` an export writes the file it always wrote, and says what it left
out (see [Exporting with styles](#exporting-with-styles)).

The same choice is accepted everywhere a load starts:

- `element.loadFromUrl(url, { styles: "file" })` and `element.loadFromFile(file, { styles: "file" })`;
- the element's `dataSourceConfig`: `{ url, styles: "file" }`;
- `session.data.import(source, { styles: "file" })` and a draft's `load({ styles: "file" })` (see
  [Previewing a Load](./load-preview#styles-in-the-file)).

## Which formats carry styles

The catalog says, for every format, whether its reader can draw a file's styles (`styles.read`)
and what its writer keeps of them (`styles.write`): `"rules"` when the layers come back as layers,
`"values"` when only each element's look is written, `"none"` when nothing is. Offer a "use the
file's styles" choice for exactly the formats that read them, without a list of your own:

```ts
const formats = element.session.catalog.formats();
const withStyles = formats.filter((format) => format.styles?.read).map((format) => format.id);
const keepsLayers = formats.filter((format) => format.styles?.write === "rules").map((format) => format.id);
```

Among the built-in formats, GEXF, GraphML (as yEd, yFiles, Gephi and Cytoscape write it), GML,
DOT, Pajek, XGMML, CX, CX2, Cytoscape sessions and the Cytoscape.js, graphology and vis.js JSON
documents carry styles. CSV and OBO files hold none.

## What a load with styles reports

`session.data.lastImport().styles` is present only when the load was asked for the file's styles:

- `layers`: the ids of the layers the file made, bottom first;
- `notes`: what reading the file and turning it into layers met, each `{ code, params }`. `params`
  names the `property` (`fill`, `shape`, `borderWidth`, ...), the `target` (`node`, `edge` or
  `graph`), how many elements (`count`, each element counted once) and, for a value left out, up
  to 8 `samples` of the file's values (empty when the note has none to show).

A note never stops the load: every style that can be drawn is drawn. The codes graphty-element adds
while it turns a file's rules into layers:

| Code                         | What happened                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `W_STYLE_DRAWN_NEAREST`      | Drawn as the nearest value the element has: a 2D shape as a 3D one, a width and a height as one size, a dash pattern |
| `W_STYLE_NOT_DRAWN`          | A property the element does not draw (a border width, an image); left out                                            |
| `W_STYLE_NO_COUNTERPART`     | A value the element has no counterpart for (a label position, an unknown arrow); left out                            |
| `W_STYLE_COLUMN_ABSENT`      | A rule reads a column no element of this load holds; left out                                                        |
| `W_STYLE_TABLE_AS_VALUES`    | A mapping table too large or too mixed to keep as a table; its values are kept per element                           |
| `W_STYLE_LAYERS_FOLDED`      | Layers folded into one that keeps their values, to stay within the bound on layers per kind                          |
| `W_STYLE_LABEL_CAPPED`       | More distinct label styles than `labelLayers` allows; the rest are drawn as the nearest kept one                     |
| `W_STYLE_LAYER_REFUSED`      | A layer the element refused; it is left out and the others apply                                                     |
| `W_STYLE_LAYER_SPEC_IGNORED` | A layer graphty wrote into the file could not be rebuilt as it was; the file's own rule is drawn instead             |
| `W_STYLE_NOT_UNDERSTOOD`     | A rule, condition or mapping of a kind this version does not know; left out                                          |

The other `W_STYLE_*` codes come from reading the file itself: a value that does not parse, a
gradient or an HTML label, a Cytoscape session with several styles, and so on. Every code, from
reading and from writing, is in `FILE_STYLE_CODES` from `@graphty/graphty-element/session`, and
`FILE_STYLE_ISSUE` names each one (`FILE_STYLE_ISSUE.DRAWN_NEAREST`), so your application can word every one without importing
anything else. The list is open: word a code you do not know generically.

## Choices: `styleOptions`

Some of what a file says has no exact counterpart in a 3D graph, and another application could
reasonably choose differently. Those choices are `styleOptions`, beside `styles`:

```ts
import { FILE_STYLE_SHAPES } from "@graphty/graphty-element/session";

await element.loadFromUrl(url, {
    styles: "file",
    styleOptions: {
        lengths: "file",
        labelLayers: 4,
        toolDefaults: false,
        shapes: { ...FILE_STYLE_SHAPES, star: "box" },
    },
});
```

| Option         | Default             | What it decides                                                                                                                                                                                                              |
| -------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lengths`      | `"median"`          | `"median"` scales every size so that the file's median node size is the element's default node size, and its median edge width the default edge width; `"file"` keeps the file's numbers as they are                         |
| `shapes`       | `FILE_STYLE_SHAPES` | The element shape each 2D shape of the file is drawn as (`ellipse` as a `sphere`, `rectangle` as a `box`, `diamond` as an `octahedron`, ...). A shape the table leaves out is not drawn from the file, and the load notes it |
| `labelLayers`  | `8` (at most 16)    | How many layers label positions may take when the file sets them element by element. Further positions are drawn as the most common kept one, and noted                                                                      |
| `toolDefaults` | `true`              | Whether a property the file leaves unset gets the default of the program that wrote it (below)                                                                                                                               |

Copy `FILE_STYLE_SHAPES` and change the entries you want, as above.

### The writing program's defaults

A file rarely writes every property. A Cytoscape file that never mentions node color still draws
its nodes in Cytoscape's default color; a DOT node with no `shape` is still an ellipse in Graphviz.
So when a load draws a file's styles, every property the file leaves unset gets the default of the
program that wrote it: Cytoscape desktop's default visual style for CX, CX2, XGMML and Cytoscape
sessions, Cytoscape.js's for a Cytoscape.js document, Graphviz's for DOT, yEd's for a yEd GraphML
file, Gephi's for GEXF, and so on. A format with no drawing program behind it adds none. Those
defaults are the bottom layer the load makes, so the graph looks the same here as there.

The draft of a load names that program before anything loads (`draft.styles.summary.tool`:
`"cytoscape"`, `"graphviz"`, `"gephi"`, ...; null when it is not known). Pass
`toolDefaults: false` to draw only what the file itself says, over the element's own defaults.

## What the layers look like

A file's styles become layers of the same shape as any other. A GEXF file whose nodes are colored
and sized by a `team` attribute gives:

```ts
{
    name: "node.by.team",
    target: "node",
    kind: "encoding",
    selector: { match: "has", path: "graphty.style.gexf.node.el.load" },
    encode: {
        "node.color": { by: "data.team", scale: "passthrough", map: { blue: "#0000ff", red: "#ff0000" }, unmapped: "skip" },
        "node.size": { by: "data.team", scale: "passthrough", map: { blue: 2, red: 1 }, unmapped: "skip" },
    },
    source: { by: "template", templateId: "file:gexf" },
}
```

- **One layer per rule of the file**, in the file's order, named by the rule: the defaults
  (`node.tool`, the writing program's; `node.defaults`, the file's own), a mapping from a column
  (`node.by.team`), a group the file selects (`node.sheet.1` for a Cytoscape.js stylesheet rule),
  and the exceptions on top. Values that follow no rule the load can name (a GEXF file's own
  `viz:color` and `viz:size` on each node) are copied element by element into one layer,
  `node.copy` (or `edge.copy`).
- **`kind`** is `"base"` for defaults, `"encoding"` for mappings and groups, and `"custom"` for
  values copied element by element.
- **The selector** picks the elements of this load only, so a second file loaded beside the first
  never repaints it. A group's selector is short: when a file names its groups by long lists of
  elements, the load writes each element's group into a value of its own (below) and selects on
  that.
- **A mapping keeps its form.** A table becomes a `map` with `unmapped: "skip"`, so a value the
  table does not list is left to the layers beneath; a Cytoscape continuous mapping becomes a
  `stops` binding (see [Styling](./styling#literal-values-and-bound-values)); label colors, sizes
  and fonts bind the label channels `node.labelColor`, `node.labelSize` and the rest.
- **Where they sit**: directly above the element's two base layers, under every layer you add, so
  your own layers always paint over the file's.
- **`source`** files them under the template `file:<load>`, which is how a later load finds and
  replaces them.

Elements the file hides are hidden through the visibility filter, and a background color the file
sets becomes the graph's background. Neither is a layer.

### What a layer came from: `fileStyleOf()`

`fileStyleOf(layer)`, from `@graphty/graphty-element/session`, returns the facts of a layer made
from a file, or null for any other layer. Your application writes its own words from them, such as
"Colors from the file, by team (2 values)":

```ts
import { fileStyleOf } from "@graphty/graphty-element/session";

for (const layer of element.session.styles.list()) {
    const origin = fileStyleOf(layer);
    if (origin === null) continue; // a layer of your own
    console.log(origin.format, origin.ruleId, origin.role, origin.origin, origin.column, origin.entries);
}
```

| Field                                   | What it says                                                                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `format`                                | The format the file was read as: a format id (`gexf`, `dot`, `cx2`) or a JSON dialect (`cytoscape-js`, `graphology`, `vis`)         |
| `importId`                              | The load the layer belongs to                                                                                                       |
| `ruleId`                                | The file's rule (`node.by.team`)                                                                                                    |
| `role`                                  | `"defaults"`, `"group"`, `"mapping"`, `"passthrough"` (values copied element by element) or `"exceptions"`                          |
| `origin`                                | `"declared"` (the file wrote the rule), `"inferred"` (recovered from the file's values) or `"tool"` (the writing program's default) |
| `column`                                | The path the layer reads                                                                                                            |
| `mapping`, `entries`                    | How it maps the column (`"passthrough"`, `"discrete"`, `"continuous"`), and how many table entries                                  |
| `meanings`                              | What each value of a value the load wrote means in the file's own words: `{ value: 3, name: "kinase" }`                             |
| `elements`, `classes`, `distinctValues` | How many elements the rule applies to, how many classes it holds, how many distinct values a copied column holds                    |
| `reason`                                | Why a layer copies values instead of explaining them, or how it was built; every reason is in `FILE_STYLE_REASONS`                  |

## Values the load writes

Some of what a file says is not a column of its data: the class a Cytoscape.js rule selects, the
color an exception gives one node, which load an element came from. The load keeps those values per
element, beside the data and never in it, and its layers read them at

```
graphty.style.<format>.<node|edge>.<key>
```

`<format>` is the format id or the JSON dialect of the load (`gexf`, `cytoscape-js`); a second load
of the same format kept beside the first gets `gexf-2`, and so on. `<key>` may hold dots
(`member.3`). Your own layers can read them too, in a selector or a binding:

```ts
await element.session.styles.add({
    name: "The second file's nodes",
    target: "node",
    selector: { match: "has", path: "graphty.style.gexf-2.node.el.load" },
    set: { "node.glow": "#F59E0B" },
});
```

Because they are not in the data, data tables, filters and searches over `data.*` never see them,
and an export never writes them as columns. They are saved in a project file with the layers that
read them, belong to the same undo step as the load, and go when the load's layers go.

A file rule that depends on the number of edges a node has (a Cytoscape.js `[[degree > 2]]`
selector) reads `graphty.degree`, `graphty.indegree` or `graphty.outdegree`: the degree as the
graph stands now, so it follows later edits instead of freezing the degrees of the file. See
[Values the element provides](./styling#values-the-element-provides).

## Editing and reloading

The layers a file made are ordinary layers: reorder them, disable them, edit them, remove them.
Edit a table entry by entry with `styles.update(id, { encode })`, turn a copied column into fixed
values with `styles.resolveToStatic(id, channel)`, and drop every layer every file made in one step:

```ts
await element.session.styles.removeBySource(
    (source) => source.by === "template" && source.templateId.startsWith("file:"),
);
```

Loading another file with `replace: true` sweeps every earlier file's layers in the same undoable
step that replaces the data. A load that adds to the graph keeps the earlier file's layers and puts
the new file's layers directly above them, each selecting only its own load's elements. Undo takes
a load back, data and layers together, and redo puts it all back without reading the file again.

## Exporting with styles

`exportGraph(format, { styles: true })` writes the graph's style layers into the file, as far as
the format can hold them:

1. **The look**: each node's and edge's color, size, shape, label and line, in the format's own
   style slots (GEXF's `viz:` elements, yEd graphics in GraphML, Graphviz attributes in DOT), so
   any program that reads the format draws what graphty draws.
2. **The rules in the format's own style language**, where it has one: Cytoscape's
   defaults and mappings in CX2.
3. **The layers themselves**, in a `graphty.styles` block that other programs skip, with the values
   the layers read written as `graphty.style.<node|edge>.<key>` attributes. Loading the file back
   with `styles: "file"` rebuilds the same layers.

Every built-in format whose catalog entry says `styles.write: "rules"` keeps the layers. If
another program changed some elements' look in the file in between, those changes win and come
back as exceptions on top; if it added or removed elements, the block no longer matches the graph,
is set aside with `W_STYLE_BLOCK_IGNORED`, and the file's own styles are read instead.

With `styles: true` the drawn color, size, shape and width columns the export otherwise adds are
left out, since the format's style slots carry them.

### What an export with styles loses

The losses are listed before anything is written, each a coded fact in `losses` beside the other
export losses (see [Exporting the Graph](./data-sources#exporting-the-graph)). A style loss names
the `target` (`node`, `edge` or `graph`) and the `property` it is about: a property name such as
`fill` or `lineStyle`, or `graphty:<channel>` (`graphty:node.glow`) for a look only graphty
draws.

| Code                      | What is lost                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `W_STYLE_NOT_WRITTEN`     | The format has no place for this property; other programs will not see it. `count` is how many elements carry a value. Where the format keeps the layers, graphty still gets it back                                                                                                                                                                                                |
| `W_STYLE_APPROXIMATED`    | Written as the nearest value the format allows (a shape GEXF does not have, a color as the nearest Pajek color name)                                                                                                                                                                                                                                                                |
| `W_STYLE_RULES_NOT_KEPT`  | The format keeps only each element's look, not the layers; reading the file back finds rules again from the values where it can. `count` is how many rules                                                                                                                                                                                                                          |
| `W_STYLE_LAYER_FLATTENED` | A layer the file cannot hold as a rule (a palette or a scale the format has no form for, a value the file does not hold such as an algorithm's result, a copied layer whose values must be converted to the format's own, such as a 3D shape written as a 2D one) is written as the values it paints. `params.layer` names it and `params.reason` says why (`SCALE`, `RESULT_PATH`) |
| `E_STYLES_MISMATCH`       | The styles belong to a different graph; nothing is written                                                                                                                                                                                                                                                                                                                          |

An export also reports the losses that are not about styles (positions a format has no place for,
a label column read back under its role, `W_ROLE_ASSUMED`); every such code is listed on
graph-io's [codes page](https://graphty.app/docs/graph-io/guide/codes.html).

An export WITHOUT `styles: true` writes the same file it always has. When the graph has layers of
its own above the base layers, it adds one loss, `W_STYLES_NOT_EXPORTED`, whose `count` is how many
layers were left out: the cue to ask the reader before their styles are lost, or to export with
`styles: true`. The codes an export can report about styles are in `EXPORT_STYLE_LOSS_CODES`.

## The older style record keys

Before this, the GEXF and GraphML readers copied some of a file's style values onto each element's
data record: `color` and `size` from GEXF's `viz:` elements, and yEd's `width`, `height`, `color`,
`borderColor`, `borderWidth`, `shape`, `targetArrow` and `sourceArrow`. A load without
`styles: "file"` still writes them, unchanged; they are deprecated and go in the next major
version. A load with `styles: "file"` leaves them off, because the layers carry those values. See
[GEXF and GraphML Records](./data-sources#gexf-and-graphml-records).
