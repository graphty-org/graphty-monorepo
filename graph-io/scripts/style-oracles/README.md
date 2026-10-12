# Style oracles

These scripts check graph-io's style readers against the programs that write the files. For every node
and edge of every file, the value graph-io resolves for a style property (with the writing program's
defaults beneath, as `importGraph(..., { styles: true })` and `resolveStyles()` give it) is compared
with the value the program itself draws, or with an independent reading of the file.

The checks are two-sided. Where the file states a value, graph-io must resolve that value; where the
file states nothing, the program must draw its own default and graph-io must resolve that default. A
value graph-io missed fails exactly as a wrong value does.

They run locally, never in CI: they need Graphviz, cytoscape-cx2js and corpora that are not committed.

## Running them

Build graph-io first; the scripts load `graph-io/dist`.

```bash
pnpm exec nx run graph-io:build
node graph-io/scripts/style-oracles/dot.mjs     # DOT against Graphviz (needs `dot` on the PATH)
node graph-io/scripts/style-oracles/cyjs.mjs    # Cytoscape.js documents against Cytoscape.js
node graph-io/scripts/style-oracles/cx2js.mjs   # CX against cytoscape-cx2js, and CX against CX2
node graph-io/scripts/style-oracles/xml.mjs     # GEXF and yEd GraphML against an independent XML reading
```

Each script reads the committed corpora (`graph-io/test/conformance/fixtures/` and
`graph-io/test/corpus/styles/`) and the local ones under `tmp/style-import/` of the main checkout (set
`STYLE_ORACLE_LOCAL` to read them from elsewhere; a directory that does not exist is skipped). Give
files or directories as arguments to check only those.

Each script prints, per property, how many values agree and how many differ, then every explained
difference grouped by its reason, then every unexplained difference, then the files it could not
compare and why. It exits with 1 when any difference is unexplained, 0 otherwise. With
`STYLE_ORACLE_OUT=<directory>` it also writes the report as JSON there, one file per check, with every
unexplained difference in full.

A difference is one of three kinds:

- **disagree**: the file states a value and the program draws another.
- **missed**: graph-io found no value in the file, yet the program draws something other than its
  default: a value graph-io failed to read.
- **default**: the file states nothing, the program draws its default, and graph-io's default for that
  program is another value.

### cytoscape-cx2js

cytoscape-cx2js (the NDEx team's CX-to-Cytoscape.js converter, MIT) is not a dependency of the
repository: its published entry point is a browser bundle, and the oracle needs its sources. Put an
unpacked copy of version 0.6.6 with lodash in its `node_modules` somewhere and point `CX2JS_DIR` at it;
the default is `tmp/style-import/spike/vendor/cx2js` of the main checkout:

```bash
mkdir -p /tmp/cx2js && cd /tmp/cx2js
npm pack cytoscape-cx2js@0.6.6 lodash@4 && tar xzf cytoscape-cx2js-0.6.6.tgz
mkdir -p package/node_modules/lodash && tar xzf lodash-4.*.tgz -C package/node_modules/lodash --strip-components 1
CX2JS_DIR=/tmp/cx2js/package node graph-io/scripts/style-oracles/cx2js.mjs
```

## What each script checks

**`dot.mjs`** draws every file with `dot -Txdot` and `dot -Tplain` and compares node fill, outline,
label text and label color (xdot's drawing operations), shape, width and height (`-Tplain`; exact, or
a minimum where graph-io notes `W_STYLE_SIZE_MINIMUM` or the file states no size), edge color, line
style, and whether head and tail arrows are drawn. Nodes of clusters, invisible elements and the
edges of `concentrate=true` graphs (which merge parallel edges) are not compared. Files Graphviz
cannot draw (crashes in its own issue reproductions, encodings it rejects) are listed and skipped.

**`cyjs.mjs`** loads every Cytoscape.js document into headless Cytoscape.js twice, with its stylesheet
and with none, and compares fill, opacities, outline, shape, size, label, label color, size, weight
and italic of every node, and color, width, opacity, line style, arrows, arrow colors, label, label
color and size of every edge. Where graph-io has no value, Cytoscape.js must draw what it draws with no
stylesheet. Documents whose stylesheet times its elements exceeds 20 million rule tests are skipped:
Cytoscape.js itself would take minutes.

**`cx2js.mjs`** converts every CX file with cytoscape-cx2js, draws it with Cytoscape.js, and compares
fill, opacity, outline, shape, size, label, label color and size of nodes and color, width, line style,
arrows, arrow colors, label, label color and size of edges. Its baseline is what cx2js draws for the
same network with its visual properties removed. It then reads the same NDEx network downloaded as CX
and as CX2 (different syntaxes, different readers) and requires every property of every node and
edge to resolve to the same value.

**`xml.mjs`** parses GEXF and yEd GraphML files again with fast-xml-parser and reads the program's
values by the program's rules: for Gephi, the last `viz:color` (channels clamped to 0..255) and
`viz:size` of a node (black and 10 when absent), an edge's `viz:color` or else its source node's fill,
and its `viz:thickness`; for yEd, a node's `y:Fill` (`#FFCC00` when absent, no fill when transparent),
its first visible label with text, its `y:Geometry` size, an edge's `y:LineStyle` color (black when
absent) and first visible label. Files whose edge count graph-io reads differently (malformed or
hierarchical files) have their edges skipped, and say so.

## The explained differences

Each script lists the reasons a difference is allowed; any other difference fails the run. A reason
names something outside graph-io's control or a deliberate, noted choice.

### DOT against Graphviz

| Reason                 | What it means                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graphviz's charset bug | Graphviz 2.43 writes a Latin-1 or windows-1252 label into `-Txdot` as its raw bytes read as UTF-8. graph-io's label is the text the file means.                                        |
| Extra peripheries      | A node with `peripheries=2` or more (a `doublecircle` has 2) is drawn 8 points wider and taller per extra outline. graphty draws one outline, so graph-io's size is the inner shape's. |
| Hostile numbers        | `width=NaN` and `fontsize=1e308` put a NaN size and an overflowed text position into Graphviz's own layout; Graphviz draws a 24-point node with its label off the page.                |
| A clipped tail         | Graphviz draws no tail arrow on one edge of its issue 2437 reproduction, whose tail is clipped away by a compound edge.                                                                |

### Cytoscape.js documents against Cytoscape.js

| Reason                                       | What it means                                                                                                                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A Cytoscape desktop export without its style | Cytoscape desktop exported the elements but not the style. graph-io gives them Cytoscape desktop's defaults, so the graph looks as it did in Cytoscape; Cytoscape.js with no stylesheet draws its own. |
| Sizes from measured text                     | A width or height of `label` or in `em` depends on text measurement, which headless Cytoscape.js does not have: it returns the value unresolved, leaving no number to compare.                         |

### CX against cytoscape-cx2js

| Reason                          | What it means                                                                                                                                                                                                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Different defaults              | The network states nothing for the property. graph-io draws Cytoscape desktop's default; cx2js draws the default style it lays under every network, or Cytoscape.js's own default (gray `#999999`, size 30 nodes, no label) when the network has a style that leaves the property out. |
| Label size from the font face   | cx2js takes a label's size from the size inside `NODE_LABEL_FONT_FACE` (`SansSerif,plain,12`); Cytoscape desktop, and graph-io, size labels by `NODE_LABEL_FONT_SIZE`.                                                                                                                 |
| `ARROW`                         | graph-io reads Cytoscape's `ARROW` as `vee` (Cytoscape draws a swept arrowhead), cx2js as `triangle`: a choice between two neutral names.                                                                                                                                              |
| Several views                   | graph-io reads the first view's style and notes `W_STYLE_OTHER_VIEWS`; cx2js merges every view's visual properties.                                                                                                                                                                    |
| An unparsable passthrough value | Cytoscape cannot parse the value (an empty color, noted `W_STYLE_BAD_VALUE`), so it draws the style's default, as graph-io does; cx2js hands the value to Cytoscape.js, which keeps `#999999`.                                                                                         |
| Trailing whitespace             | Cytoscape.js trims a label's trailing whitespace or line break when cx2js hands it over; graph-io keeps the text as the file states it.                                                                                                                                                |
| Selected nodes                  | cx2js paints a node the file marks selected with the style's selection color; graph-io draws its unselected look, as graphty opens a file with nothing selected.                                                                                                                       |
| A hostile mapping               | A mapping entry index of 1e8 or more (no real file has one) makes graph-io refuse the mapping, noted `W_STYLE_BAD_MAPPING`; cx2js applies it.                                                                                                                                          |

### The same network as CX and as CX2

| Reason                    | What it means                                                                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sizes in network 821a7310 | NDEx's CX-to-CX2 conversion carried `NODE_WIDTH` and `NODE_HEIGHT` mappings that Cytoscape ignores in the CX file (`nodeSizeLocked` with `NODE_SIZE` 12), so the two files state different sizes. |
| Generic font family       | NDEx's CX-to-CX2 conversion writes the label font as the generic family `sans-serif` in place of the CX file's font name.                                                                         |

### GEXF and yEd against an independent XML reading

| Reason                   | What it means                                                                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A recovered ramp         | The color comes from a ramp graph-io recovered, within the writing program's rounding (2 of 255 per channel), noted `W_STYLE_RAMP_ROUNDED` for the element.                   |
| A hostile value          | A value the program never writes (a negative or infinite size, a channel that is not a number): graph-io refuses it with `W_STYLE_BAD_VALUE` and draws the program's default. |
| A color yEd never writes | A CSS name or a 3-digit hex color in a hand-made yEd file: graph-io reads it as CSS does; the independent reading takes only the `#RRGGBB` yEd writes.                        |
| A repeated node id       | A malformed file writes one node id twice: graph-io reads one node whose later element's values win (`W_DUPLICATE_NODE`); the independent reading takes the first element.    |
