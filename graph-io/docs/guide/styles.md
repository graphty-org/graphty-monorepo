# Styles

Many graph files say how the graph looks as well as what it holds: the color and shape of each
node, the width and dash of each edge, the labels, the arrows. graph-io reads those styles into one
common description, works out each node's and edge's resolved look, and writes them into every
format that can hold them, so a graph keeps its look when it moves between programs.

Styles are opt-in. Without the `styles` option a load returns the graph exactly as it always does,
and a save writes exactly the same file.

## Reading a file's styles

Pass `styles: true` to `importGraph()`, `loadFromUrl()` or `loadFromFile()`. The result then has a
`styles` member beside the snapshot:

<!-- generated:begin example:styles/read -->

```ts
import { importGraph } from "@graphty/graph-io";
import { resolveStyles } from "@graphty/graph-io/styles";

// Two teams, each drawn in its own color, in Graphviz's DOT format
const dot = `graph {
  node [style=filled, shape=box];
  ann [team=red, fillcolor=tomato]; bob [team=red, fillcolor=tomato];
  cy [team=red, fillcolor=tomato]; dee [team=red, fillcolor=tomato];
  eve [team=blue, fillcolor=skyblue]; flo [team=blue, fillcolor=skyblue];
  gus [team=blue, fillcolor=skyblue]; hal [team=blue, fillcolor=skyblue];
  ann -- bob -- cy -- dee -- eve -- flo -- gus -- hal;
}`;

const { snapshot, styles } = await importGraph(dot, { styles: true });
if (styles) {
    console.log(styles.styles.source);
    // the rules, bottom to top: what each one is, where it came from and what it sets
    for (const rule of styles.styles.rules) {
        const what = [...Object.keys(rule.set ?? {}), ...Object.keys(rule.map ?? {})].join(", ");
        console.log(`${rule.id} (${rule.role}, ${rule.origin}): ${what}`);
    }
    // the mapping the file's colors follow
    console.log(JSON.stringify(styles.styles.rules.find((r) => r.role === "mapping")?.map));
    // each node's value of a property, as the program that wrote the file draws it
    const fill = resolveStyles(styles, "node", "fill", snapshot);
    const shape = resolveStyles(styles, "node", "shape", snapshot);
    for (const i of [0, 4]) {
        console.log(`${String(snapshot.ids.idOf(i))}: ${String(fill[i])} ${String(shape[i])}`);
    }
}
```

<!-- generated:end -->

<!-- generated:begin output:styles/read -->

```text
{ format: 'dot', dialect: 'graphviz', tool: 'graphviz' }
node.tool (defaults, tool): fillOpacity, borderColor, borderWidth, borderPosition, shape, width, height, labelColor, labelSize, labelFont, labelPosition
node.tool.name-label (passthrough, tool): label
node.defaults (defaults, inferred): fillOpacity, shape, labelFit, labelPaddingX, labelPaddingY
node.by.team (mapping, inferred): fill
edge.tool (defaults, tool): color, width, lineStyle, sourceArrow, targetArrow, arrowSize, labelColor, labelSize, labelFont
{"fill":{"kind":"discrete","by":{"data":"team"},"table":[["red","#ff6347"],["blue","#87ceeb"]]}}
ann: #ff6347 rectangle
eve: #87ceeb rectangle
```

<!-- generated:end -->

`result.styles` is `null` when the file has no styles (a CSV file, a plain JSON graph), and the
snapshot is never changed by reading them: the colors in this file stay the plain attributes they
always were, and the styles are described beside them.

The types, `resolveStyles()` and the other style functions are exported from
`@graphty/graph-io/styles`, an entry point that runs in Node and in browsers and loads no format.

### What the styles hold

`result.styles` is an `ExtractedStyles` object:

| Member        | What it is                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `styles`      | A `FileStyles` description: small, plain JSON you can store or send                                  |
| `columns`     | Per-node and per-edge values the description's rules read (`{ style: key }`), by node or edge index  |
| `features`    | The candidate columns that could explain the styles (attributes and degree), for planning them again |
| `fingerprint` | The node count, edge count and a hash of the node ids of the graph the styles belong to              |

The description, `styles.styles`, holds:

- `source`: the `format`, the `dialect` its values were spelled in (`"graphviz"`, `"css"`,
  `"cytoscape"`, ...) and the `tool` whose defaults were added (see below), or `null`.
- `units.length`: `"px"`, or `"relative"` when the writing program sizes nodes by a relative
  factor (Gephi, Pajek, sigma) rather than in pixels.
- `graph`: the graph's own style, such as its `background` color.
- `rules`: an ordered list, bottom to top. For each node or edge and each property, the topmost
  rule that applies and gives a value wins; a rule that gives no value (a missing attribute, a key
  its table does not list) leaves the decision to the rules beneath.
- `notes`: what was approximated, dropped or could not be read, by code (see
  [Problems while reading](#problems-while-reading)).

Each rule has:

- `id`: stable within one read (`node.tool`, `node.by.team`, `edge.exceptions`).
- `target`: `"node"` or `"edge"`.
- `role`: `"defaults"` (applies to every element), `"group"` (sets values on some elements),
  `"mapping"` (computes values from an attribute), `"passthrough"` (copies each element's own
  value) or `"exceptions"` (the elements that differ from everything beneath, on top).
- `origin`: `"declared"` (the file wrote the rule: a Cytoscape mapping, a Cytoscape.js selector),
  `"inferred"` (graph-io found the rule in the per-element values: "fill by team") or `"tool"`
  (the writing program's default).
- `where`: which elements the rule applies to: `{ all: true }`, `{ has: column }`,
  `{ eq: [column, value] }`, `{ in: [column, values] }`, and `and`, `or` and `not` over those.
- `set`: constant values, by property, or `map`: values computed per element. A mapping is
  `passthrough` (the column's value is the style), `discrete` (a table from the column's value to
  the style) or `continuous` (points between which numbers and colors are interpolated).
- `facts`: numbers an application may show, such as how many elements the rule covers and, for a
  rule that copies values, why (`reason`: `NO_EXPLANATION`, `STYLE_CLASS`, `SOURCE_NODE_COLOR`,
  ...). Facts are codes and counts, never sentences.

A column is named in one of three ways: `{ data: "team" }` is an attribute of the snapshot,
`{ computed: "degree" }` (or `"indegree"`, `"outdegree"`) is computed from the graph, and
`{ style: "member.3" }` is one of the `columns` graph-io added. When a file defines a group that a
short test cannot express (a list of ids, a Cytoscape.js class, a DOT cluster), graph-io records
each element's membership as a value in such a column, and the rule tests that one value. A rule's
`where` never grows with the size of the file.

Every list of values above is open: a later version may add a role, a property or a kind of
mapping. Skip one you do not know instead of failing.

### Each element's look: `resolveStyles()`

`resolveStyles(styles, target, property, snapshot)` walks the rules for every node (or edge) and
returns its value of one property, or `null` where no rule gives one. These are the values the
program that wrote the file draws, with its defaults for what the file leaves out. Use them to
draw the graph with your own renderer, or to compare two imports.

### The properties

Every value is spelled one way, whatever the file wrote: colors are lowercase `#rrggbb`, with any
alpha moved into the matching opacity (`fill` alpha into `fillOpacity`, an edge `color` alpha into
its `opacity`); numbers have at most 6 significant digits; lengths are pixels (Graphviz's inches
become 72 pixels each) unless `units.length` is `"relative"`. A value the vocabulary has no name for
is kept as `other:<the file's spelling>` and noted.

<!-- generated:begin style-properties -->

| Property                    | Nodes | Edges | Graph | Value                                                                                                                                                                                                                                                |
| --------------------------- | ----- | ----- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fill`                      | yes   |       |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `fillGradient`              | yes   |       |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `borderColor`               | yes   |       |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `labelColor`                | yes   | yes   |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `fillOpacity`               | yes   |       |       | a number from 0 (transparent) to 1                                                                                                                                                                                                                   |
| `opacity`                   | yes   | yes   |       | a number from 0 (transparent) to 1                                                                                                                                                                                                                   |
| `borderOpacity`             | yes   |       |       | a number from 0 (transparent) to 1                                                                                                                                                                                                                   |
| `width`                     | yes   | yes   |       | a number                                                                                                                                                                                                                                             |
| `height`                    | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `borderWidth`               | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `cornerRadius`              | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `fillGradientAngle`         | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `fillGradientColors`        | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `fillGradientStops`         | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `fillGradientKind`          | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `labelSize`                 | yes   | yes   |       | a number                                                                                                                                                                                                                                             |
| `labelWrapWidth`            | yes   | yes   |       | a number                                                                                                                                                                                                                                             |
| `labelWrapTrailingSpace`    | yes   |       |       | true or false                                                                                                                                                                                                                                        |
| `labelWrapEllipsis`         | yes   | yes   |       | true or false                                                                                                                                                                                                                                        |
| `labelWrapAnywhere`         | yes   | yes   |       | true or false                                                                                                                                                                                                                                        |
| `labelWrapSpaceCount`       | yes   | yes   |       | a number                                                                                                                                                                                                                                             |
| `labelRunAlign`             | yes   | yes   |       | text                                                                                                                                                                                                                                                 |
| `labelOffsetX`              | yes   | yes   |       | a number, negative too                                                                                                                                                                                                                               |
| `labelOffsetY`              | yes   | yes   |       | a number, negative too                                                                                                                                                                                                                               |
| `labelShiftX`               | yes   | yes   |       | a number, negative too                                                                                                                                                                                                                               |
| `labelShiftY`               | yes   | yes   |       | a number, negative too                                                                                                                                                                                                                               |
| `labelOpacity`              | yes   | yes   |       | a number from 0 (transparent) to 1                                                                                                                                                                                                                   |
| `labelBackgroundOpacity`    | yes   | yes   |       | a number from 0 (transparent) to 1                                                                                                                                                                                                                   |
| `labelFit`                  | yes   |       |       | `inside`, `bounds`                                                                                                                                                                                                                                   |
| `labelPaddingX`             | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `labelPaddingY`             | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `labelFitSquare`            | yes   |       |       | true or false                                                                                                                                                                                                                                        |
| `labelFitQuantum`           | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `shape`                     | yes   |       |       | `ellipse`, `rectangle`, `round-rectangle`, `triangle`, `diamond`, `pentagon`, `hexagon`, `octagon`, `parallelogram`, `trapezoid`, `star`, `vee`, `polygon`, `none`                                                                                   |
| `shapePoints`               | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `shapePointsStretch`        | yes   |       |       | true or false                                                                                                                                                                                                                                        |
| `shapeParts`                | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `shapeLines`                | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `shapeLineWidth`            | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `shapeTexts`                | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `borderStyle`               | yes   |       |       | `solid`, `dashed`, `dotted`, `dash-dot`, `double`                                                                                                                                                                                                    |
| `borderPosition`            | yes   |       |       | `inside`, `center`, `outside`                                                                                                                                                                                                                        |
| `borderWaveAmplitude`       | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `borderWavePeriod`          | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `outerBorderColor`          | yes   |       |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `outerBorderWidth`          | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `outerBorderOpacity`        | yes   |       |       | a number from 0 (transparent) to 1                                                                                                                                                                                                                   |
| `outerBorderStyle`          | yes   |       |       | `solid`, `dashed`, `dotted`, `dash-dot`, `double`                                                                                                                                                                                                    |
| `outerBorderOffset`         | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `outerBorderCount`          | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `underlayColor`             | yes   | yes   |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `underlayOpacity`           | yes   | yes   |       | a number from 0 (transparent) to 1                                                                                                                                                                                                                   |
| `underlayPadding`           | yes   | yes   |       | a number                                                                                                                                                                                                                                             |
| `underlayShape`             | yes   |       |       | `ellipse`, `rectangle`, `round-rectangle`, `triangle`, `diamond`, `pentagon`, `hexagon`, `octagon`, `parallelogram`, `trapezoid`, `star`, `vee`, `polygon`, `none`                                                                                   |
| `underlayCornerRadius`      | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `overlayColor`              | yes   | yes   |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `overlayOpacity`            | yes   | yes   |       | a number from 0 (transparent) to 1                                                                                                                                                                                                                   |
| `overlayPadding`            | yes   | yes   |       | a number                                                                                                                                                                                                                                             |
| `overlayShape`              | yes   |       |       | `ellipse`, `rectangle`, `round-rectangle`, `triangle`, `diamond`, `pentagon`, `hexagon`, `octagon`, `parallelogram`, `trapezoid`, `star`, `vee`, `polygon`, `none`                                                                                   |
| `overlayCornerRadius`       | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `label`                     | yes   | yes   |       | text                                                                                                                                                                                                                                                 |
| `tooltip`                   | yes   | yes   |       | text                                                                                                                                                                                                                                                 |
| `xlabel`                    | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `xlabelOffsetX`             | yes   |       |       | a number, negative too                                                                                                                                                                                                                               |
| `xlabelOffsetY`             | yes   |       |       | a number, negative too                                                                                                                                                                                                                               |
| `labelFont`                 | yes   | yes   |       | text                                                                                                                                                                                                                                                 |
| `labelWeight`               | yes   | yes   |       | `normal`, `bold`                                                                                                                                                                                                                                     |
| `labelItalic`               | yes   | yes   |       | true or false                                                                                                                                                                                                                                        |
| `labelPosition`             | yes   | yes   |       | `center`, `top`, `bottom`, `left`, `right`, `top-left`, `top-right`, `bottom-left`, `bottom-right`, `inside-top`, `inside-bottom`, `inside-left`, `inside-right`, `inside-top-left`, `inside-top-right`, `inside-bottom-left`, `inside-bottom-right` |
| `labelTextAlign`            | yes   | yes   |       | `left`, `center`, `right`                                                                                                                                                                                                                            |
| `labelRuns`                 | yes   | yes   |       | text                                                                                                                                                                                                                                                 |
| `labelMinScreenSize`        | yes   | yes   |       | a number                                                                                                                                                                                                                                             |
| `labelAvoidOverlap`         | yes   |       |       | true or false                                                                                                                                                                                                                                        |
| `labelMinNodeScreenSize`    | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `labelGridCellSize`         | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `labelOnTop`                | yes   | yes   |       | true or false                                                                                                                                                                                                                                        |
| `labelRotation`             | yes   | yes   |       | a number                                                                                                                                                                                                                                             |
| `labelBackground`           | yes   | yes   |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `labelOutlineColor`         | yes   | yes   |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `labelOutlineWidth`         | yes   | yes   |       | a number                                                                                                                                                                                                                                             |
| `labelBorderColor`          | yes   | yes   |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `labelBorderWidth`          | yes   | yes   |       | a number                                                                                                                                                                                                                                             |
| `labelOutlineOpacity`       | yes   | yes   |       | a number from 0 (transparent) to 1                                                                                                                                                                                                                   |
| `labelBorderOpacity`        | yes   | yes   |       | a number from 0 (transparent) to 1                                                                                                                                                                                                                   |
| `labelPadding`              | yes   | yes   |       | a number                                                                                                                                                                                                                                             |
| `labelCornerRadius`         | yes   | yes   |       | a number                                                                                                                                                                                                                                             |
| `labelLineHeight`           | yes   | yes   |       | a number                                                                                                                                                                                                                                             |
| `image`                     | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `imageFit`                  | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `imageFallback`             | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `imageWidth`                | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `imageHeight`               | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `imagePositionX`            | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `imagePositionY`            | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `imageOffsetX`              | yes   |       |       | a number, negative too                                                                                                                                                                                                                               |
| `imageOffsetY`              | yes   |       |       | a number, negative too                                                                                                                                                                                                                               |
| `imageRepeat`               | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `imageClip`                 | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `imageSmoothing`            | yes   |       |       | true or false                                                                                                                                                                                                                                        |
| `imageAutoSize`             | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `imageOpacity`              | yes   |       |       | a number from 0 (transparent) to 1                                                                                                                                                                                                                   |
| `glyph`                     | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `glyphFont`                 | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `glyphSize`                 | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `glyphWeight`               | yes   |       |       | `normal`, `bold`                                                                                                                                                                                                                                     |
| `glyphColor`                | yes   |       |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `pieColors`                 | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `pieSizes`                  | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `pieOpacities`              | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `pieRadius`                 | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `pieHole`                   | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `pieRotation`               | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `pieFitBox`                 | yes   |       |       | true or false                                                                                                                                                                                                                                        |
| `pieOffsetX`                | yes   |       |       | a number, negative too                                                                                                                                                                                                                               |
| `pieOffsetY`                | yes   |       |       | a number, negative too                                                                                                                                                                                                                               |
| `stripeColors`              | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `stripeSizes`               | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `stripeOpacities`           | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `stripeDirection`           | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `stripeSize`                | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `chartKind`                 | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `chartValues`               | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `chartColors`               | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `chartMin`                  | yes   |       |       | a number, negative too                                                                                                                                                                                                                               |
| `chartMax`                  | yes   |       |       | a number, negative too                                                                                                                                                                                                                               |
| `chartHorizontal`           | yes   |       |       | true or false                                                                                                                                                                                                                                        |
| `chartSize`                 | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `chartWidth`                | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `chartHeight`               | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `chartOffsetX`              | yes   |       |       | a number, negative too                                                                                                                                                                                                                               |
| `chartOffsetY`              | yes   |       |       | a number, negative too                                                                                                                                                                                                                               |
| `chartMargin`               | yes   |       |       | a number, negative too                                                                                                                                                                                                                               |
| `chartGap`                  | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `chartLineWidth`            | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `chartBorderColor`          | yes   |       |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `chartBorderWidth`          | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `groupPadding`              | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `groupPaddingRatio`         | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `groupPaddingOf`            | yes   |       |       | text                                                                                                                                                                                                                                                 |
| `groupMinWidth`             | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `groupMinHeight`            | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `groupMinWidthBiasLeft`     | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `groupMinHeightBiasTop`     | yes   |       |       | a number                                                                                                                                                                                                                                             |
| `groupIncludeLabels`        | yes   |       |       | true or false                                                                                                                                                                                                                                        |
| `visible`                   | yes   | yes   |       | true or false                                                                                                                                                                                                                                        |
| `color`                     |       | yes   |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `sourceArrowColor`          |       | yes   |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `targetArrowColor`          |       | yes   |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `minScreenWidth`            |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `outlineWidth`              |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `outlineColor`              |       | yes   |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `outlineOpacity`            |       | yes   |       | a number from 0 (transparent) to 1                                                                                                                                                                                                                   |
| `outlineStyle`              |       | yes   |       | `solid`, `dashed`, `dotted`, `dash-dot`, `long-dash`, `double`, `zigzag`, `sinewave`                                                                                                                                                                 |
| `gradientColors`            |       | yes   |       | text                                                                                                                                                                                                                                                 |
| `gradientStops`             |       | yes   |       | text                                                                                                                                                                                                                                                 |
| `gradientKind`              |       | yes   |       | text                                                                                                                                                                                                                                                 |
| `arrowSize`                 |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `sourceArrowSize`           |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `sourceArrowLength`         |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `targetArrowLength`         |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `sourceArrowWidth`          |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `targetArrowWidth`          |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `sourceArrowGap`            |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `targetArrowGap`            |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `sourceArrowSide`           |       | yes   |       | `left`, `right`                                                                                                                                                                                                                                      |
| `targetArrowSide`           |       | yes   |       | `left`, `right`                                                                                                                                                                                                                                      |
| `sourceArrowParts`          |       | yes   |       | text                                                                                                                                                                                                                                                 |
| `targetArrowParts`          |       | yes   |       | text                                                                                                                                                                                                                                                 |
| `arrowPosition`             |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `lineStyle`                 |       | yes   |       | `solid`, `dashed`, `dotted`, `dash-dot`, `long-dash`, `double`, `zigzag`, `sinewave`                                                                                                                                                                 |
| `waveAmplitude`             |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `wavePeriod`                |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `sourceArrow`               |       | yes   |       | `none`, `triangle`, `triangle-open`, `vee`, `tee`, `diamond`, `diamond-open`, `circle`, `circle-open`, `square`, `crow`, `half`, `inverted`                                                                                                          |
| `targetArrow`               |       | yes   |       | `none`, `triangle`, `triangle-open`, `vee`, `tee`, `diamond`, `diamond-open`, `circle`, `circle-open`, `square`, `crow`, `half`, `inverted`                                                                                                          |
| `midTargetArrow`            |       | yes   |       | `none`, `triangle`, `triangle-open`, `vee`, `tee`, `diamond`, `diamond-open`, `circle`, `circle-open`, `square`, `crow`, `half`, `inverted`                                                                                                          |
| `midSourceArrow`            |       | yes   |       | `none`, `triangle`, `triangle-open`, `vee`, `tee`, `diamond`, `diamond-open`, `circle`, `circle-open`, `square`, `crow`, `half`, `inverted`                                                                                                          |
| `midTargetArrowColor`       |       | yes   |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `midSourceArrowColor`       |       | yes   |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `targetArrowImage`          |       | yes   |       | text                                                                                                                                                                                                                                                 |
| `sourceArrowImage`          |       | yes   |       | text                                                                                                                                                                                                                                                 |
| `midTargetArrowImage`       |       | yes   |       | text                                                                                                                                                                                                                                                 |
| `targetArrowImageWidth`     |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `targetArrowImageHeight`    |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `sourceArrowImageWidth`     |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `sourceArrowImageHeight`    |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `midTargetArrowImageWidth`  |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `midTargetArrowImageHeight` |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `curved`                    |       | yes   |       | true or false                                                                                                                                                                                                                                        |
| `bends`                     |       | yes   |       | text                                                                                                                                                                                                                                                 |
| `fanSpacing`                |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `fanned`                    |       | yes   |       | true or false                                                                                                                                                                                                                                        |
| `bendCurve`                 |       | yes   |       | text                                                                                                                                                                                                                                                 |
| `arcRadius`                 |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `supportModel`              |       | yes   |       | text                                                                                                                                                                                                                                                 |
| `supportSpringLength`       |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `supportSpringConstant`     |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `supportRepulsion`          |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `supportCentralGravity`     |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `supportScale`              |       | yes   |       | text                                                                                                                                                                                                                                                 |
| `nodeGap`                   |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `sourceNodeGap`             |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `targetNodeGap`             |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `sourcePort`                |       | yes   |       | text                                                                                                                                                                                                                                                 |
| `targetPort`                |       | yes   |       | text                                                                                                                                                                                                                                                 |
| `sourceLabel`               |       | yes   |       | text                                                                                                                                                                                                                                                 |
| `targetLabel`               |       | yes   |       | text                                                                                                                                                                                                                                                 |
| `sourceLabelOffset`         |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `targetLabelOffset`         |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `sourceLabelOffsetX`        |       | yes   |       | a number, negative too                                                                                                                                                                                                                               |
| `sourceLabelOffsetY`        |       | yes   |       | a number, negative too                                                                                                                                                                                                                               |
| `targetLabelOffsetX`        |       | yes   |       | a number, negative too                                                                                                                                                                                                                               |
| `targetLabelOffsetY`        |       | yes   |       | a number, negative too                                                                                                                                                                                                                               |
| `sourceLabelRotation`       |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `targetLabelRotation`       |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `sourceLabelSize`           |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `targetLabelSize`           |       | yes   |       | a number                                                                                                                                                                                                                                             |
| `sourceLabelColor`          |       | yes   |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `targetLabelColor`          |       | yes   |       | a color, `#rrggbb`                                                                                                                                                                                                                                   |
| `sourceLabelFont`           |       | yes   |       | text                                                                                                                                                                                                                                                 |
| `targetLabelFont`           |       | yes   |       | text                                                                                                                                                                                                                                                 |
| `background`                |       |       | yes   | a color, `#rrggbb`                                                                                                                                                                                                                                   |

<!-- generated:end -->

A property only graphty draws is carried as `graphty:<name>`. Only graphty reads it.

### Problems while reading

Reading styles never fails an import and never throws. A value graph-io cannot read is skipped,
and the styles keep everything else. Each problem is a note in `styles.styles.notes`, one per code,
target and property: `code` (a `W_STYLE_` code), `params` (`property`, `target`, `count` and up to 8
`samples`), `elements` (the indexes of the nodes or edges it covers, when known) and an English
`message`. The codes are listed on [Issue and loss codes](./codes.md). None counts toward the
import's `errorLimit`, and none appears in the import report.

A load's `signal` cancels reading the styles too. The work is bounded: on a file whose styles
would take too long to explain, graph-io stops looking for rules, copies the rest per element and
says so with `W_STYLE_BUDGET`.

## The writing program's defaults

A file states only part of how its graph looks. A DOT file that says nothing draws every node as
an unfilled black ellipse labeled with its name, because that is what Graphviz draws; a Cytoscape
network leaves unset what its style does not change. To make the graph look as it does in the
program that made the file, graph-io adds that program's defaults as one rule at the bottom of the
stack (`origin: "tool"`, id `node.tool` and `edge.tool`, plus rules such as `node.tool.name-label`
for a default that is not a constant). Everything the file states sits above them.

Which program's defaults a file gets depends on its format, and for formats many programs write,
on whether the file names its writer:

| Format                     | Defaults added                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CX, CX2, XGMML             | `cytoscape`, always                                                                                                                                                                                    |
| Cytoscape session (`.cys`) | `cytoscape-fallbacks`, always: a session's style starts empty, so Cytoscape draws what its style does not set with its built-in values                                                                 |
| DOT                        | `graphviz`, always                                                                                                                                                                                     |
| GEXF                       | `gephi`, always                                                                                                                                                                                        |
| Pajek                      | `pajek`, always                                                                                                                                                                                        |
| GraphML                    | `yed` for a file with yEd graphics (the `y:` namespace), `yfiles3` for yFiles 3 graphics, `gephi` for Gephi's `r`, `g`, `b` keys, `cytoscape` for Cytoscape's `SUID` and `shared name` keys; else none |
| GML                        | by the file's `Creator` line: `yed` (yFiles, yEd), `cytoscape`, `gephi` or `ogdf`; else none                                                                                                           |
| JSON                       | by dialect: `cytoscape-js` for Cytoscape.js (`cytoscape` for Cytoscape desktop's export with no stylesheet), `vis-network` for vis.js, `sigma` for graphology, `networkx` for NetworkX's node-link     |
| CSV, Neo4j CSV, OBO        | none: these formats have no styles                                                                                                                                                                     |
| A file graphty wrote (any) | none added: the file records graphty's own defaults (see [Files graphty wrote](#files-graphty-wrote))                                                                                                  |

The defaults of each program, as graph-io adds them. A program that leaves a property to its
renderer, or whose default no primary source states, has no value for it here, and graph-io adds
none.

<!-- generated:begin style-tool-defaults -->

### `cytoscape`

|           |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Read from | cytoscape-impl develop 6c63e97c5152 (3.11)                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Lengths   | pixels                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Nodes     | `fill` `#89d0f5`, `fillOpacity` `1`, `shape` `round-rectangle`, `width` `75`, `height` `35`, `borderColor` `#cccccc`, `borderWidth` `0`, `borderStyle` `solid`, `borderPosition` `inside`, `borderWaveAmplitude` `10`, `borderWavePeriod` `20`, `labelColor` `#000000`, `labelFont` `DejaVu Sans, sans-serif`, `labelWeight` `normal`, `labelItalic` `false`, `labelSize` `12`, `labelWrapWidth` `200`, `labelWrapTrailingSpace` `true`, `labelPosition` `center`, `labelPadding` `0`, `labelLineHeight` `1` |
| Edges     | `color` `#848484`, `width` `2`, `lineStyle` `solid`, `waveAmplitude` `10`, `wavePeriod` `20`, `opacity` `1`, `sourceArrow` `none`, `targetArrow` `none`, `sourceArrowColor` `#000000`, `targetArrowColor` `#000000`, `labelColor` `#000000`, `labelFont` `DejaVu Sans, sans-serif`, `labelWeight` `normal`, `labelItalic` `false`, `labelSize` `10`, `labelPadding` `0`, `labelLineHeight` `1`, `curved` `false`, `bendCurve` `midpoints`                                                                    |
| Graph     | `background` `#ffffff`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Rules     | nodes are labeled with their `name` attribute                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

### `cytoscape-fallbacks`

|           |                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read from | cytoscape-api develop (3.11)                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Lengths   | pixels                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Nodes     | `fill` `#c80000`, `fillOpacity` `1`, `shape` `ellipse`, `width` `60`, `height` `40`, `borderColor` `#000000`, `borderWidth` `2`, `borderPosition` `inside`, `borderWaveAmplitude` `10`, `borderWavePeriod` `20`, `labelColor` `#000000`, `labelFont` `DejaVu Sans, sans-serif`, `labelWeight` `normal`, `labelItalic` `false`, `labelSize` `12`, `labelWrapWidth` `200`, `labelWrapTrailingSpace` `true`, `labelPosition` `center`, `labelPadding` `0`, `labelLineHeight` `1` |
| Edges     | `color` `#404040`, `width` `1`, `lineStyle` `solid`, `waveAmplitude` `10`, `wavePeriod` `20`, `sourceArrow` `none`, `targetArrow` `none`, `labelColor` `#000000`, `labelFont` `DejaVu Sans, sans-serif`, `labelWeight` `normal`, `labelItalic` `false`, `labelSize` `10`, `labelPadding` `0`, `labelLineHeight` `1`, `bendCurve` `midpoints`                                                                                                                                  |
| Graph     | `background` `#ffffff`                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Rules     | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

### `cytoscape-js`

|           |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read from | cytoscape.js 3.34.3                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Lengths   | pixels                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Nodes     | `fill` `#999999`, `fillOpacity` `1`, `shape` `ellipse`, `width` `30`, `height` `30`, `borderColor` `#000000`, `borderWidth` `0`, `borderStyle` `solid`, `borderPosition` `center`, `outerBorderColor` `#999999`, `underlayColor` `#000000`, `underlayPadding` `10`, `underlayShape` `round-rectangle`, `overlayColor` `#000000`, `overlayPadding` `10`, `overlayShape` `round-rectangle`, `opacity` `1`, `labelColor` `#000000`, `labelSize` `16`, `labelFont` `Helvetica Neue, Helvetica, sans-serif`, `labelWeight` `normal`, `labelPosition` `top`, `labelWrapTrailingSpace` `true`                                                                     |
| Edges     | `color` `#999999`, `sourceArrowColor` `#999999`, `targetArrowColor` `#999999`, `outlineColor` `#000000`, `underlayColor` `#000000`, `underlayPadding` `10`, `overlayColor` `#000000`, `overlayPadding` `10`, `gradientKind` `none`, `midSourceArrowColor` `#999999`, `midTargetArrowColor` `#999999`, `labelPosition` `center`, `sourceLabelOffset` `0`, `targetLabelOffset` `0`, `width` `3`, `lineStyle` `solid`, `opacity` `1`, `sourceArrow` `none`, `targetArrow` `none`, `arrowSize` `1`, `curved` `false`, `fanSpacing` `20`, `labelColor` `#000000`, `labelSize` `16`, `labelFont` `Helvetica Neue, Helvetica, sans-serif`, `labelWeight` `normal` |
| Graph     | `background` `#ffffff`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Rules     | none                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

### `graphviz`

|           |                                                                                                                                                                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read from | graphviz main (16.1.0)                                                                                                                                                                                                                   |
| Lengths   | pixels                                                                                                                                                                                                                                   |
| Nodes     | `fillOpacity` `0`, `borderColor` `#000000`, `borderWidth` `1`, `borderPosition` `center`, `shape` `ellipse`, `width` `54`, `height` `36`, `labelColor` `#000000`, `labelSize` `14`, `labelFont` `Times, serif`, `labelPosition` `center` |
| Edges     | `color` `#000000`, `width` `1`, `lineStyle` `solid`, `sourceArrow` `none`, `targetArrow` `none`, `arrowSize` `1`, `labelColor` `#000000`, `labelSize` `14`, `labelFont` `Times, serif`                                                   |
| Graph     | `background` `#ffffff`                                                                                                                                                                                                                   |
| Rules     | nodes are labeled with their id; directed edges get a `triangle` arrow at their target                                                                                                                                                   |

### `yed`

|           |                                                                                                                                                                                                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read from | yEd / yFiles for Java 2.19                                                                                                                                                                                                                                             |
| Lengths   | pixels                                                                                                                                                                                                                                                                 |
| Nodes     | `fill` `#ffcc00`, `shape` `rectangle`, `borderColor` `#000000`, `borderWidth` `1`, `borderStyle` `solid`, `borderPosition` `center`, `labelColor` `#000000`, `labelFont` `DejaVu Sans, sans-serif`, `labelSize` `12`, `labelWeight` `normal`, `labelPosition` `center` |
| Edges     | `color` `#000000`, `width` `1`, `lineStyle` `solid`, `sourceArrow` `none`, `targetArrow` `none`, `labelColor` `#000000`, `labelFont` `DejaVu Sans, sans-serif`, `labelSize` `12`                                                                                       |
| Graph     | `background` `#ffffff`                                                                                                                                                                                                                                                 |
| Rules     | none                                                                                                                                                                                                                                                                   |

### `yfiles3`

|           |                                                                                                                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read from | yFiles for HTML (API docs retrieved 2026-10-11)                                                                                                                                                       |
| Lengths   | pixels                                                                                                                                                                                                |
| Nodes     | `fill` `#ffffff`, `borderColor` `#000000`, `borderWidth` `1`, `borderPosition` `center`, `shape` `rectangle`, `labelColor` `#000000`, `labelFont` `Arial`, `labelSize` `12`, `labelPosition` `center` |
| Edges     | `color` `#000000`, `width` `1`, `sourceArrow` `none`, `targetArrow` `none`, `labelColor` `#000000`, `labelFont` `Arial`, `labelSize` `12`                                                             |
| Graph     | `background` `#ffffff`                                                                                                                                                                                |
| Rules     | none                                                                                                                                                                                                  |

### `gephi`

|           |                                                                                                                                                                                                                                                                                   |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read from | gephi 0.11.4-SNAPSHOT                                                                                                                                                                                                                                                             |
| Lengths   | the program's relative size factor                                                                                                                                                                                                                                                |
| Nodes     | `fill` `#000000`, `width` `20`, `height` `20`, `shape` `ellipse`, `borderPosition` `inside`, `labelPosition` `center`, `labelOnTop` `true`                                                                                                                                        |
| Edges     | `sourceArrow` `none`, `targetArrow` `none`, `curved` `true`, `fanned` `false`, `arcRadius` `0.8333333333333334`                                                                                                                                                                   |
| Graph     | `background` `#ffffff`                                                                                                                                                                                                                                                            |
| Rules     | an edge with no color of its own takes the mix of its two nodes' fills and alphas; an edge with no width of its own is as thick as its weight (1 without one, and 1 for a weight of 0 or below, so the edge stays visible); directed edges get a `triangle` arrow at their target |

### `vis-network`

|           |                                                                                                                                                                                                                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read from | vis-network 10.1.2                                                                                                                                                                                                                                                                                        |
| Lengths   | pixels                                                                                                                                                                                                                                                                                                    |
| Nodes     | `fill` `#97c2fc`, `borderColor` `#2b7ce9`, `borderWidth` `1`, `borderPosition` `center`, `shape` `ellipse`, `labelColor` `#343434`, `labelSize` `14`, `labelFont` `arial`, `labelPosition` `center`, `labelMinScreenSize` `4`                                                                             |
| Edges     | `width` `1`, `minScreenWidth` `0.3`, `outlineColor` `#6f6f6f`, `lineStyle` `solid`, `sourceArrow` `none`, `targetArrow` `none`, `labelColor` `#343434`, `labelSize` `14`, `labelFont` `arial`, `labelMinScreenSize` `4`, `labelPosition` `center`, `labelOutlineColor` `#ffffff`, `labelOutlineWidth` `2` |
| Graph     | `background` `#ffffff`                                                                                                                                                                                                                                                                                    |
| Rules     | nodes are labeled with their `label` attribute; an edge with no color of its own takes its source node's fill                                                                                                                                                                                             |

### `sigma`

|           |                                                                                                                                                                                                                                                                 |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read from | sigma 4.0.1                                                                                                                                                                                                                                                     |
| Lengths   | the program's relative size factor                                                                                                                                                                                                                              |
| Nodes     | `fill` `#666666`, `shape` `ellipse`, `width` `20`, `height` `20`, `labelColor` `#000000`, `labelFont` `Arial`, `labelSize` `12`, `labelWeight` `normal`, `labelPosition` `right`, `labelGridCellSize` `100`, `labelOnTop` `true`, `labelMinNodeScreenSize` `12` |
| Edges     | `color` `#cccccc`, `width` `0.5`, `labelColor` `#666666`, `labelSize` `12`, `labelPosition` `center`, `sourceArrow` `none`, `targetArrow` `none`, `minScreenWidth` `0.85`                                                                                       |
| Graph     | `background` `#ffffff`                                                                                                                                                                                                                                          |
| Rules     | nodes are labeled with their `label` attribute                                                                                                                                                                                                                  |

### `pajek`

|           |                                                                                                                                                                                                                                                                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read from | Pajek 6.02                                                                                                                                                                                                                                                                                                                                                |
| Lengths   | pixels                                                                                                                                                                                                                                                                                                                                                    |
| Nodes     | `shape` `ellipse`, `opacity` `1`, `borderColor` `#660000`, `borderWidth` `0.5`, `borderPosition` `center`, `width` `20`, `height` `20`, `fill` `#ffd9bc`, `labelColor` `#ad0000`, `labelSize` `15`, `labelFont` `Arial`, `labelWeight` `bold`, `labelPosition` `center`, `labelOffsetX` `5.176380902`, `labelOffsetY` `14.121016526`, `labelShiftX` `0.5` |
| Edges     | `width` `2`, `color` `#007091`, `lineStyle` `solid`, `opacity` `1`, `sourceArrow` `none`, `targetArrow` `none`                                                                                                                                                                                                                                            |
| Graph     | `background` `#ffffff`                                                                                                                                                                                                                                                                                                                                    |
| Rules     | nodes are labeled with their `label` attribute; directed edges get a `triangle` arrow at their target                                                                                                                                                                                                                                                     |

### `ogdf`

|           |                                                                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Read from | ogdf master 1a40505ac006                                                                                                                                                                                                       |
| Lengths   | pixels                                                                                                                                                                                                                         |
| Nodes     | `fill` `#ffffff`, `shape` `rectangle`, `width` `20`, `height` `20`, `borderColor` `#000000`, `borderWidth` `1`, `borderStyle` `solid`, `labelColor` `#000000`, `labelFont` `Arial`, `labelSize` `10`, `labelPosition` `center` |
| Edges     | `color` `#000000`, `width` `1`, `lineStyle` `solid`, `labelColor` `#000000`, `labelFont` `Arial`, `labelSize` `10`, `labelPosition` `center`                                                                                   |
| Graph     | `background` `#ffffff`                                                                                                                                                                                                         |
| Rules     | none                                                                                                                                                                                                                           |

### `networkx`

|           |                                                                                                                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read from | networkx 3.7 (main 6da4704cbf32)                                                                                                                                                                                    |
| Lengths   | pixels                                                                                                                                                                                                              |
| Nodes     | `fill` `#1f78b4`, `fillOpacity` `1`, `shape` `ellipse`, `width` `17.3205`, `height` `17.3205`, `labelColor` `#000000`, `labelSize` `12`, `labelFont` `sans-serif`, `labelWeight` `normal`, `labelPosition` `center` |
| Edges     | `color` `#000000`, `width` `1`, `lineStyle` `solid`, `opacity` `1`, `sourceArrow` `none`, `targetArrow` `none`, `labelColor` `#000000`, `labelSize` `12`, `labelFont` `sans-serif`, `labelWeight` `normal`          |
| Graph     | none                                                                                                                                                                                                                |
| Rules     | directed edges get a `triangle` arrow at their target                                                                                                                                                               |

<!-- generated:end -->

The table is exported as `TOOL_DEFAULTS` from `@graphty/graph-io/styles`, with the source of every
value.

### Leaving the defaults out

Pass `styles: { toolDefaults: false }` to read only what the file itself states, for example to
draw the file's own colors over your application's theme. `source.tool` is then `null`:

<!-- generated:begin example:styles/defaults -->

```ts
import { importGraph } from "@graphty/graph-io";
import { resolveStyles } from "@graphty/graph-io/styles";

// The file states one style; Graphviz draws everything else with its own defaults
const dot = "digraph { a -> b; b [shape=box] }";

for (const toolDefaults of [true, false]) {
    const { snapshot, styles } = await importGraph(dot, { styles: { toolDefaults } });
    if (styles) {
        const label = resolveStyles(styles, "node", "label", snapshot);
        const shape = resolveStyles(styles, "node", "shape", snapshot);
        const arrow = resolveStyles(styles, "edge", "targetArrow", snapshot);
        console.log(`toolDefaults ${String(toolDefaults)}: tool ${String(styles.styles.source.tool)}`);
        console.log(
            `  labels ${JSON.stringify(label)}, shapes ${JSON.stringify(shape)}, arrow ${JSON.stringify(arrow)}`,
        );
    }
}
```

<!-- generated:end -->

<!-- generated:begin output:styles/defaults -->

```text
toolDefaults true: tool graphviz
  labels ["a","b"], shapes ["ellipse","rectangle"], arrow ["triangle"]
toolDefaults false: tool null
  labels [null,null], shapes [null,"rectangle"], arrow [null]
```

<!-- generated:end -->

## Saving styles

Pass the styles to any save function or to `checkExport()` as the `styles` option. A save with
styles writes up to three things, as far as the format can hold each:

1. **The look**: each node's and edge's resolved values, in the format's own style slots (GEXF's
   `viz:color`, yEd's graphics in GraphML, Graphviz attributes in DOT, ...), so any program that
   reads the format draws what the styles describe.
2. **The rules in the format's own style language**, for the formats that have one: CX, CX2 and
   Cytoscape sessions get Cytoscape defaults and mappings, Cytoscape.js JSON gets a stylesheet.
3. **The rules themselves**, in a `graphty.styles` block that graph-io reads back, so reading the
   file back gives the same rules (see [Files graphty wrote](#files-graphty-wrote)).

Each [format page](./formats/index.md) lists, under Styles, which properties it writes and whether
it keeps the rules. `checkExport()` tells you what a particular graph would lose before anything is
written:

<!-- generated:begin example:styles/save -->

```ts
import { readFile } from "node:fs/promises";

import { checkExport, exportGraphToString, importGraph } from "@graphty/graph-io";

const { snapshot, styles } = await importGraph(await readFile("teams.gv"), { styles: true });
if (styles) {
    // before saving: what each format would lose of the styles, counted by code (one note per property)
    for (const format of ["csv", "gexf", "graphml"]) {
        const codes = new Map<string, number>();
        for (const note of checkExport(snapshot, format, { styles })) {
            if (note.code.startsWith("W_STYLE")) {
                codes.set(note.code, (codes.get(note.code) ?? 0) + 1);
            }
        }
        console.log(format, Object.fromEntries(codes));
    }

    // GraphML keeps the rules for graphty: reading the file back gives the same rules
    const graphml = await exportGraphToString(snapshot, "graphml", { styles });
    const back = await importGraph(graphml, { format: "graphml", styles: true });
    console.log(back.styles?.styles.source);
    console.log(
        back.styles?.styles.rules.map((r) => r.id).join(" ") === styles.styles.rules.map((r) => r.id).join(" "),
    );

    // styles belong to the graph they were read from: saving them with another graph is refused
    const other = await importGraph("graph { a -- b }");
    console.log(checkExport(other.snapshot, "graphml", { styles }).map((n) => n.code));
}
```

<!-- generated:end -->

<!-- generated:begin output:styles/save -->

```text
csv { W_STYLE_NOT_WRITTEN: 28, W_STYLE_RULES_NOT_KEPT: 1 }
gexf { W_STYLE_APPROXIMATED: 1, W_STYLE_NOT_WRITTEN: 18 }
graphml { W_STYLE_NOT_WRITTEN: 6 }
{ format: 'graphml', dialect: 'graphty', tool: 'graphty' }
true
[ 'E_STYLES_MISMATCH' ]
```

<!-- generated:end -->

The style notes are `LossNote`s like any other. A note about one property also has
`style: { target, property }`, and `count` is the number of nodes or edges that have a value for
it:

| Code                                                            | What is lost                                                                                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`W_STYLE_NOT_WRITTEN`](./codes.md#W_STYLE_NOT_WRITTEN)         | The format has no place for this property. Other programs will not see it; graphty still gets it back when the format keeps the rules for graphty |
| [`W_STYLE_APPROXIMATED`](./codes.md#W_STYLE_APPROXIMATED)       | Written as the nearest value the format allows (a shape GEXF does not have, a color to the nearest Pajek color name)                              |
| [`W_STYLE_RULES_NOT_KEPT`](./codes.md#W_STYLE_RULES_NOT_KEPT)   | The format keeps no `graphty.styles` block, so reading the file back finds the rules again from the values, if it can                             |
| [`W_STYLE_LAYER_FLATTENED`](./codes.md#W_STYLE_LAYER_FLATTENED) | A rule the format's own style language cannot express was written as each element's value, so it is no longer editable as one rule there          |
| [`E_STYLES_MISMATCH`](./codes.md#E_STYLES_MISMATCH)             | The styles belong to a different graph: nothing is written                                                                                        |

Styles are stored by node and edge position, so they belong to exactly one graph. When the graph
you save has other nodes or edges than the one the styles were read from (you added or removed
some), `checkExport()` returns `E_STYLES_MISMATCH` and the save functions throw a
`GraphFormatError` with the code `E_UNSUPPORTED` before writing anything, instead of putting one
node's color on another. Read the styles again from the changed graph's file, or build new ones
for it.

With styles given, the format's style writer is the only thing that writes its style slots. A
column that merely has a style role (the `color` column a GEXF import makes, for example) is then
written as a plain attribute and is not reported as `W_VIZ_DROPPED`.

### Files graphty wrote

graphty is the family of packages graph-io belongs to; graph-io and graphty-element both read what
follows. When a format can keep extra data, a save with styles adds a `graphty.styles` block: the rules as
JSON, with the defaults they were drawn over and the fingerprint of the graph. The per-element
values its rules read are written as attributes named `graphty.style.<target>.<key>`
(`graphty.style.node.copy.fill`). Where the block goes depends on the format: a graph attribute in
GraphML, XGMML, CX, CX2, DOT and GML, a graph attribute or a top-level key in JSON (by dialect), an
element of graphty's own namespace inside GEXF's `<meta>`, an archive entry of its own in a
Cytoscape session, and a `%` comment line in Pajek (which also carries the per-element values,
since Pajek has no attributes for them).

Other programs skip it: Graphviz ignores attributes it does not know, Cytoscape ignores archive
entries it does not know, Gephi skips other namespaces, Pajek skips comments. They draw the look from the format's
own slots. The attribute columns do show up as ordinary attributes in programs that list every
attribute.

When graph-io reads a file that holds a valid block whose fingerprint matches the graph, it takes
the rules from the block, with `source.tool` `"graphty"`: the same rules come back. If another
program edited the file in between and changed some elements' look in the format's own slots, the
file's values still win, and the changed elements come back as exceptions on top. A block that
does not parse, or whose graph no longer matches (nodes or edges were added or removed), is
ignored with `W_STYLE_BLOCK_IGNORED`, and the file is read like any other.

## Styles in a format of your own

An importer gets styles with one `styles` member that names the columns holding them, and an
exporter that writes attributes keeps them for graphty with one `styles` member too. See
[Styles in a plugin](./extending/new-format.md#styles).

## The older style columns

Before graph-io read styles, a few formats put some of them into ordinary columns. These keep
working exactly as they do today, are deprecated, and leave in the next major version:

- **GEXF `viz` columns.** A GEXF import makes `color`, `size`, `shape`, `shape.uri` and `thickness`
  columns from Gephi's `viz` elements, and renames a declared attribute titled like one of them to
  `color#<id>`. Read `result.styles` instead. The `position` column stays.
- **GraphML `yfiles.*` columns.** A GraphML import of a yEd file adds `yfiles.color`,
  `yfiles.shape`, `yfiles.label` and the other `yfiles.*` columns, treats a target arrow as making
  the edge directed, and gives `yfiles.label` the label role. They are kept as they are and not
  fixed. Read `result.styles` instead.
- **`ExportCapabilities.viz`**, which says a format holds color, size, shape and thickness. Read
  `capabilities.styles` from `listFormats()` instead.
- **Style role columns written by a save without styles.** Without the `styles` option, GEXF
  still writes the `color`, `size`, `shape` and `thickness` role columns into its `viz` elements,
  and JSON and Neo4j CSV write them as plain attributes. Pass `styles` to write a graph's look.
