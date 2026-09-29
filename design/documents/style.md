# Style

`kind: "graphty-style"`, version 1, a member of a graphty document ([container.md](container.md)).
Schema: [style.schema.json](style.schema.json). The shortest working example is README "Your first
style".

## Purpose

A style is a stack of style layers: how nodes and edges are drawn, stated as rules over the data's
columns and the runs' results, never as values stored on particular elements. Its purpose is to be
applied to new data: the same diverging fold-change colouring on the next gene list, the same team
colours on next quarter's organisation chart.

## Compatible with graphty-element 2.x

The style member is the `StyleDocument` graphty-element 2.x already publishes
(`graphty-element/src/catalog/types.ts`), written by `session.styles.toDocument()` and read by
`session.styles.applyTemplate()`, plus `kind` and a few optional members.

1. **Every style 2.x has written is a version 1 style.** A file holding the bare 2.x output (no
   `kind`) is read as a document with that one style (container.md, "Reading a file" rule 3); inside
   a document the same object with `"kind": "graphty-style"` added is a valid member. The one
   exception is a layer selecting edges by id ("Selectors").
2. **Version 1 is frozen to what 2.x accepts**, with three additions: the `top` and `member`
   selectors, which graphty-element gains in 3.0.0 with the graph-format migration, and the node
   id path (`id`, "Paths" rule 4). Frozen means the channel names, selector kinds, scales and
   layer kinds below, and the value lists of the enumerated channels (node shapes, line patterns,
   arrows). A version 1 style without the three additions keeps working on every 2.x release; 2.x's
   `applyTemplate` refuses a whole style holding a `top` or `member` selector, so a writer that
   wants a 2.x reader to draw the rest puts those layers in a second style member ("Writing" rule
   10), and the path `id` is merely unbound there. A style using anything else 2.x would refuse
   MUST be written as style version 2, which an older reader refuses by its version rather than by
   a confusing layer error. What 2.x refuses, with the code it reports (a version 1 reader handles
   each as "Reading and applying" rules 2 and 3 say):

| 2.x refuses                                                                                  | Code                                               |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| an unknown channel (rule 3 of "Reading and applying": the channel is dropped, not the layer) | `E_UNKNOWN_CHANNEL`                                |
| an unknown selector kind, scale or layer kind                                                | `E_BAD_SELECTOR`, `E_UNKNOWN_SCALE`, `E_BAD_LAYER` |
| a value outside an enumerated channel's list, or a number outside a channel's range          | `E_OPTION_RANGE`                                   |
| a value of the wrong type for its channel                                                    | `E_BAD_LAYER`                                      |
| a layer with neither `set` nor `encode`, or one channel in both                              | `E_BAD_LAYER`                                      |
| a layer with no `target` writing both node and edge channels                                 | `E_BAD_LAYER`                                      |
| an empty `where` or `has` path                                                               | `E_SELECTOR_EMPTY`                                 |
| a quoted path segment holding a dot                                                          | `E_BAD_SELECTOR`                                   |
| an `everything` layer encoding from a `results.` path                                        | `E_UNSCOPED_RUN_ENCODING`                          |
| `source.by: "element"`                                                                       | `E_PROTECTED`                                      |
| a carried palette whose id nobody registered                                                 | `E_UNKNOWN_PALETTE`                                |

2.x also rejects a binding with both an explicit `domain` and `clamp`, but only while it paints,
not when it checks a layer, so its `applyTemplate` accepts such a layer and the repaint throws. A
version 1 reader refuses it at the check ("Reading and applying" rule 2); adding that check is one
of the graphty-element changes version 1 needs.

3. 2.x checks values, not member names, so the optional members this page adds (`kind`, `name`,
   `description`, a layer's `id`, `extensions`) are harmless to it. 2.x as a writer drops them: a
   style applied and saved again by 2.x loses `kind` and layer ids. That is why rule 1 reads a
   missing `kind` as a style.

## Data model

```ts
interface StyleMember {
    kind: "graphty-style";
    version: 1;
    id?: string; // identity across saves: "org.example-lab.expression-overlay"
    styleVersion?: string; // SemVer, informational: shown in reports, kept on save; never decides replacement
    name?: string; // what a person calls this look
    description?: string;
    layers: LayerSpec[]; // bottom first; at most 1,000
    palettes?: PaletteDescriptor[]; // the palettes the layers name that graphty-element does not ship
    extensions?: Record<string, unknown>;
}

interface LayerSpec {
    id?: string; // an authored key, unique in this member, stable across saves
    name: string;
    target?: "node" | "edge"; // default: inferred from the channels written
    kind?: "base" | "encoding" | "highlight" | "custom";
    selector: Selector;
    set?: StaticStyle; // literal channel values
    encode?: Encoding; // channel values driven by the data
    source?: LayerSource; // who made it
    enabled?: boolean; // default true
    userData?: Record<string, unknown>; // kept and written back, never interpreted
}
```

`Selector`, `StaticStyle`, `Encoding`, `Binding`, `LayerSource` and `PaletteDescriptor` are the
published types of `graphty-element/src/catalog/types.ts`, restated by the schema. A change to them
is a change to this format.

### Layers and their order

1. `layers` is ordered bottom first. Where two layers write the same channel on the same element,
   the higher one's value is drawn.
2. An element a layer's selector does not match is not touched by that layer. An encoding never
   paints an element that has no value at its `by` path: the layers beneath show through, unless the
   binding gives `missing: { value }`.
3. A layer has `set`, `encode` or both. A writer MUST NOT write a layer with neither.

### Paths

Selectors and bindings name values by path over `{ data, results }`, and this is the model
graphty-element 2.x implements:

1. `data.<column>` reads the column of that name; `results.<run id>.<field>` reads a field of a
   run's result. A column name is flat: a dot is part of the name, and nested values are not
   walked, so `data.adj.P.Val` reads the column named `adj.P.Val`.
2. Every path -- a binding's `by`, a `has` or `top` selector's `path`, and the paths inside a
   `where` -- is read the same way. A segment that is not an identifier (`[A-Za-z_][A-Za-z0-9_]*`)
   is quoted (`data."log-fc"`, `data."stringdb::node type"`); an unquoted hyphen is subtraction. A
   quoted segment MUST NOT contain a dot, as in 2.x, so a column whose name holds a dot and another
   character that needs quoting (`log2.FC (T/N)`) cannot be written in a path. Write a plain name
   instead and open the style with `columns` mapping it to the real one ("Reading and applying"
   rule 10); the map rewrites the parsed path, so any name works there.
3. A column that no element has, or a run the session does not hold, leaves the path unresolved; see
   "Reading and applying" rule 4. Columns and runs are looked up by own name, so
   `data.constructor` reads only a column named `constructor`.
4. **The node id.** New in version 1, the path `id` reads a node's id (a string or a number). It is
   read-only and exists on nodes only. On an edge list whose gene symbols are the node ids
   (`gene_a,gene_b,score`), `{ "by": "id", "scale": "passthrough" }` labels each node by its
   symbol, as `data.name` does on a Cytoscape GraphML export. graphty-element 2.x answers no such
   path, so there a layer using it is switched off and reported by rule 4 of "Reading and
   applying", never misapplied. A style reads nothing else: not an edge's endpoints, and no value
   nested inside a column.

### Expressions

A `where` in a selector or a recipe scope is written in graphty-element's expression language, a
subset of JMESPath (`graphty-element/src/session/styles/predicate.ts`). An accepted expression means
exactly what JMESPath means by it; anything outside the subset is refused at the character where
it starts, and the layer (or the command) fails alone with `E_BAD_SELECTOR`.

```
expression := or
or         := and ( "||" and )*
and        := comparison ( "&&" comparison )*
comparison := unary ( ("==" | "!=" | "<" | "<=" | ">" | ">=") unary )?
unary      := "!" unary | operand
operand    := literal | path | "(" expression ")"
path       := name ( "." name )*
```

1. **Literals.** A JSON value in backticks (``  `0.05` ``, ``  `true` ``, ``  `null` ``, ``  `["a","b"]` ``),
   or text in single quotes (`'SUPPLIES'`, where only `'` and `\` are escapes).
2. **Paths** are those of "Paths"; a name is an identifier or a double-quoted JSON string.
3. **No functions, projections, slices, pipes, wildcards or multi-selects.** `contains()`,
   `starts_with()` and `length()` are refused, so no expression tests whether a list holds a value.
4. **Comparisons.** `==` and `!=` compare JSON values exactly and structurally, so a number never
   equals text and a list never equals a string. `<`, `<=`, `>` and `>=` are true only between two
   numbers; any other pair gives null, which is false. A comparison does not chain.
5. **Truth.** A value is false when it is `false`, `null`, missing, an empty string, an empty list or
   an empty object; zero is true. `!` binds tighter than a comparison, so `!data.flag` is written
   `!(data.flag)` when the path has more than one segment.

### Result fields

### Result fields

`results.<run id>.<field>` names a field a run publishes. Each algorithm's fields are its
`AlgorithmDescriptor.fields` in graphty-element's catalogue (exported from the `./catalog` entry
point); the plan of a recipe lists them per command (recipe.md, "The replay report"). The most used:

| Algorithms                                                                        | Node fields                                              |
| --------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `degree`, `betweenness`, `closeness`, `pagerank`, `eigenvector`, `katz`, `k-core` | `value` (the score), `rank`, `percentile`                |
| `louvain`, `leiden`, `label-propagation`, `girvan-newman`, `components`           | `group` (an integer per community or piece), `groupSize` |

A selector or binding naming a field the run does not publish leaves the layer switched off, like a
missing column. A node outside a run's scope has no value for its fields: a `has` selector does not
match it, and an encoding leaves it to the layers beneath.

### Selectors

| `match`      | Members        | Matches                                                                                                                                                   |
| ------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `everything` | --             | every node, or every edge, of the layer's target                                                                                                          |
| `has`        | `path`         | the elements where the path has a value                                                                                                                   |
| `expression` | `where`        | the elements where the predicate, in graphty-element's expression language ("Expressions"), is true                                                       |
| `top`        | `path`, `n`    | the `n` elements with the highest values of a `results.<run id>.<field>` path; a group of tied values is taken whole, and only when all of it fits in `n` |
| `ids`        | `nodes`        | the listed nodes, by node id                                                                                                                              |
| `member`     | `of` (a scope) | the members of a scope, usually a kept set `{ "set": id }`                                                                                                |

A selector that names particular elements -- `ids`, or `member` of any scope but `{ where }` (a kept
set, the selection, the visible graph, listed nodes, a defined set) -- is legal in a style, but does
not travel to new data: it paints whatever those names mean in the reader's session, or nothing. A
reader applies such a layer and reports it as tied to the session it was written in; `saveDocument`
leaves it out by default (container.md, "Writing a file" rule 4). Prefer a selector over columns.

**No edges by id.** graphty-element 2.x writes edges in an `ids` selector as session edge ids, a
counter that restarts every session, so the same file would paint a different edge after a reload.
A writer MUST NOT write `ids.edges`; a reader MUST add an edge layer whose selector lists
`ids.edges` switched off with `E_BAD_LAYER`, saying edges cannot be selected by id in version 1, and
MUST ignore `ids.edges` on a node layer, reporting it.

### Channels and values

The member names of `set` and `encode` are channel names, the list graphty-element publishes as
`Channel`. The schema lists them with their value types:

| Channels                                                                                                       | Value                                                                                      |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| colours: `node.color`, `node.outline`, `node.glow`, `edge.color`, `edge.arrowHeadColor`, `edge.arrowTailColor` | a CSS colour string (hex RECOMMENDED) or `{ r, g, b, a }`, r, g, b in 0..255 and a in 0..1 |
| `node.size`, `edge.width`, `edge.arrowHeadSize`, `edge.arrowTailSize`                                          | a number from 0 to 1,000,000 scene units; 1 is the default node size                       |
| opacities                                                                                                      | a number in 0..1                                                                           |
| `node.shape`, `edge.style`, `edge.arrowHead`, `edge.arrowTail`                                                 | one of the names the schema lists                                                          |
| labels, tooltips, arrow texts                                                                                  | text of at most 1,024 characters, always drawn as text                                     |
| label, tooltip and arrow-text styles                                                                           | a label style record                                                                       |
| `node.wireframe`, `node.flat`, `edge.curvature`                                                                | a boolean                                                                                  |
| `edge.patternCount`                                                                                            | an integer from 2 to 1,000                                                                 |
| `edge.animationSpeed`, `node.glowStrength`                                                                     | a non-negative number                                                                      |

The limits hold for every value a layer produces, not only for `set`: a value an encoding produces
-- from `range`, `map`, `missing`, `other`, or a `passthrough` of the data -- is checked against its
channel when it is painted, a number clamped to the channel's range and text cut to 1,024
characters, and the report counts each. So `"edge.patternCount": { "by": "data.n", "scale":
"passthrough" }` over a value of 4,294,967,295 draws 1,000 pieces, not four billion.

`node.marker` is reserved for graphty-element's own note markers and is not written by a style. The
applier parses every colour into RGBA when it applies a layer; a colour that does not parse fails
its layer with `E_BAD_LAYER`. Every count a style sets has a maximum: `edge.patternCount` 1,000
(each edge draws that many pattern pieces), `bins` 256, a `map` 1,000 entries. A value above one
fails its layer with `E_OPTION_RANGE`; giving the channel descriptors these maxima is one of the
graphty-element changes version 1 needs.

### Bindings

A binding is a literal `{ value }` or a mapping `{ by, scale?, palette?, ... }` from the value at a
path to a channel value. `scale` is one of `linear`, `log`, `neglog10`, `sqrt`, `pow`, `bins`,
`quantile`, `ordinal` and `passthrough`; absent, a colour or number channel uses `linear` and any
other channel `passthrough`. For the numeric scales:

1. `domain` `[low, high]`, or `"auto"` (the default) for the extent of the values present, is the
   input interval. The value and the domain ends are transformed by the scale, then placed at a
   position from 0 to 1; a value below `low` is placed at 0 and one above `high` at 1. An explicit
   domain assumes a scale: STRING's `combined_score` runs from 0 to 1 in its web export and from 0
   to 1000 in its bulk download, and a domain of `[0.4, 1]` draws every bulk-download edge at the
   top of the range. For a column whose scale varies by source, prefer `"auto"` or `clamp`. When
   more than 95 percent of the values fall outside an explicit domain, the report carries a notice.
2. `midpoint` places that value at 0.5, each half linear after the transform, so a skewed domain
   keeps its midpoint at the centre of a diverging palette.
3. `clamp` `[p, q]` narrows the domain to the values at those percentiles of the values present.
   `clamp` and an explicit `domain` MUST NOT both be given.
4. `range` `[a, b]` maps position 0 to `a` and 1 to `b` for a number channel; a colour channel reads
   its palette. `reverse: true` swaps the ends.
5. `missing` decides an element with no value: `"skip"` (the default) paints nothing; `{ value }`
   paints that value.
6. `exponent` is the power of the `pow` scale (default 2). `bins` is how many groups of equal width
   (`bins`) or equal count (`quantile`) the values are sorted into (default 4, at most 256).
7. A value that is not a number (text such as `NA` in a CSV column) is treated as missing, and the
   report counts it with `W_COLUMN_TYPE`, as a recipe's numeric comparison does (README, "What
   every importer produces" rule 4).

For `ordinal`, which maps categories:

8. Categories take the palette's colours in order of size, largest group first, ties broken by
   name, so the same column gives the same assignment twice. The default palette is `okabe-ito`
   (8 colours). A category is the value as text: a number by its shortest decimal form (`1` and
   `1.0` are the category `"1"`), `true` and `false` as those words. A list is not a category: it is
   treated as missing and counted with `W_COLUMN_TYPE`.
9. `map` pins a category to a value: `{ "sales": "#0b5fff", "ops": "#ff8800" }`, keys matched against
   the category text of rule 8. On a colour channel an unmapped category takes the next palette
   colour that no `map` entry uses, in the order of rule 8, so an unmapped group never shares a
   pinned colour; running out follows `overflow`. On any other channel (a shape) an unmapped
   category is treated as missing (`missing`). The report names every `map` key that matched no
   value, so a vocabulary spelled differently (`supplier` for `Supplier`) is seen.
10. `other: { threshold, value }` paints every category carried by fewer than `threshold` elements
    with `value`.
11. `overflow` says what happens when there are more categories than the palette has colours:
    `"other"` keeps the palette's colours for the largest groups and paints the rest dark grey
    (#505050); `"shape"` (nodes only) reuses the colours with a new shape per round; `"extend"`
    gives every group its own colour, not guaranteed distinct. Without `overflow`, a named palette
    too small for the data fails the layer with `E_CAP_EXCEEDED` -- so a style meant for data it
    has not seen, which may hold more groups than the palette has colours, gives `overflow`.

### Coming from Cytoscape

graphty-element does not read Cytoscape style files (`styles.xml`, the style inside a `.cys`
session, CX2 visual properties); a Cytoscape style is rewritten by hand, with these tables.

| Cytoscape mapping | Here                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| passthrough       | `{ "by": "data.label", "scale": "passthrough" }`; for the node's own name on an edge list, `{ "by": "id", "scale": "passthrough" }`                                 |
| discrete          | `{ "by": "data.mutation_type", "scale": "ordinal", "map": { "missense": "octahedron" }, "missing": { "value": "sphere" } }` for "anything else"                     |
| continuous        | `{ "by": "data.logFC", "domain": [-2, 2], "midpoint": 0, "palette": "blue-orange" }`: blue at -2, white at 0, red at 2; values past the domain take the end colours |

| Cytoscape visual property                    | Channel                                              |
| -------------------------------------------- | ---------------------------------------------------- |
| `NODE_FILL_COLOR`                            | `node.color`                                         |
| `NODE_SIZE`, `NODE_WIDTH`, `NODE_HEIGHT`     | `node.size` (one size; a node is not stretched)      |
| `NODE_LABEL`                                 | `node.label`                                         |
| `NODE_BORDER_PAINT`                          | `node.outline` (a colour)                            |
| `NODE_BORDER_WIDTH`                          | no equivalent in version 1: the outline has no width |
| `NODE_TRANSPARENCY`                          | `node.opacity`, as transparency / 255                |
| `NODE_SHAPE`                                 | `node.shape`, by the table below                     |
| `NODE_TOOLTIP`                               | `node.tooltip`                                       |
| `EDGE_WIDTH`                                 | `edge.width`                                         |
| `EDGE_STROKE_UNSELECTED_PAINT`, `EDGE_PAINT` | `edge.color`                                         |
| `EDGE_LINE_TYPE`                             | `edge.style`                                         |
| `EDGE_TARGET_ARROW_SHAPE`                    | `edge.arrowHead`                                     |
| `EDGE_LABEL`                                 | `edge.label`                                         |

Node shapes are three-dimensional here. A close match: `ELLIPSE` is `sphere`, `RECTANGLE` and
`ROUND_RECTANGLE` are `box`, `TRIANGLE` is `tetrahedron`, `DIAMOND` is `octahedron`, `HEXAGON` is
`hexagonal_prism`, `OCTAGON` is `dodecahedron`, `PARALLELOGRAM` and `V` have no close match. Sizes
are scene units, where 1 is the default node size, not pixels: divide every Cytoscape size in a
style by the pixel size of that style's usual node, so the usual node becomes 1 and the others keep
their proportions (a 50-pixel node in a style whose usual node is 35 pixels is about 1.4). Edge
widths take the same factor.

### Layer sources

`source` records who made a layer: `{ by: "run", runId, algorithm, params }` for a layer painting a
run's result, `{ by: "template", templateId }` for one that came from a document, `{ by: "user" }`,
and `{ by: "plugin", name }`. `{ by: "element" }` marks graphty-element's own locked layers and MUST
NOT appear in a document.

### Layer ids

A layer's `id` is an authored key, not graphty-element's `LayerId` (which the element mints for
every layer it holds). graphty-element stores the authored `id` on the layer, exposes it through the
styles API, and writes it back in `toDocument()`. A writer SHOULD give every layer an `id` and keep
it across saves, so a later edit or a reference names the layer rather than its position. Two layers
in one member with the same `id` fail the second with `E_DUPLICATE_ID`.

### Palettes

`palettes` carries the descriptor of every palette a layer names that graphty-element does not
ship, so the style is self-describing. Built-in palette ids are reserved: a descriptor under a
built-in id is ignored and reported, and the built-in palette is used. The built-in ids are:

- sequential: `viridis`, `ylorbr` (the default for a measurement), `plasma`, `inferno`, `blues`,
  `greens`, `oranges`;
- categorical: `okabe-ito` (the default for categories), `tol-vibrant`, `tol-muted`, `pastel`,
  `carbon`;
- diverging: `purple-green`, `blue-orange`, `red-blue`;
- highlight: `blue-highlight`, `green-highlight`, `orange-highlight`.

Their colours are graphty-element's exported palette table (`PALETTE_DESCRIPTORS` in its `./catalog`
entry point). The diverging ones, low end first:

| Palette        | Colours                                                                           | Middle                                                          |
| -------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `purple-green` | `#762a83 #9970ab #c2a5cf #e7d4e8 #f7f7f7 #d9f0d3 #a6dba0 #5aae61 #1b7837`         | `#f7f7f7`, at the midpoint                                      |
| `blue-orange`  | `#2166ac #4393c3 #92c5de #d1e5f0 #f7f7f7 #fddbc7 #f4a582 #d6604d #b2182b`         | `#f7f7f7`, at the midpoint; ColorBrewer's RdBu from blue to red |
| `red-blue`     | `#67001f #b2182b #d6604d #f4a582 #fddbc7 #f7f7f7 #d1e5f0 #92c5de #4393c3 #2166ac` | none: ten colours, so the midpoint falls between two, tinted    |

For a Cytoscape red-white-blue mapping, use `blue-orange` (blue low, red high) rather than
`red-blue` reversed, whose even count puts no white at the midpoint.

A carried descriptor has `id`, `plainName`, `kind` (`sequential`, `diverging` or `categorical`),
`colors` (at most 256, each at most 64 characters), `capacity` (how many categories it can keep
apart; the number of colours for a categorical palette, `null` for a continuous one) and
`colorblindSafe` (the colour-vision deficiencies it stays distinct under; `[]` means untested, not
unsafe). All are required, as in graphty-element 2.x's `PaletteDescriptor`. A sequential or diverging palette's
colours are spaced evenly from position 0 to 1, so a diverging palette with an odd number of colours
has its middle colour at the binding's `midpoint`. A page that wants its brand palette everywhere
registers it once with graphty-element's `registerPalette` and names it in its styles; a carried
palette is for a style travelling to pages that do not have it.

```json
{
    "kind": "graphty-document",
    "version": 1,
    "members": [
        {
            "kind": "graphty-style",
            "version": 1,
            "layers": [
                {
                    "name": "Colour by team",
                    "selector": { "match": "has", "path": "data.team" },
                    "encode": {
                        "node.color": {
                            "by": "data.team",
                            "scale": "ordinal",
                            "palette": "acme-brand",
                            "map": { "sales": "#0b5fff" },
                            "overflow": "other"
                        }
                    }
                }
            ],
            "palettes": [
                {
                    "id": "acme-brand",
                    "plainName": "Acme brand",
                    "kind": "categorical",
                    "colors": ["#0b5fff", "#ff8800", "#00a86b"],
                    "capacity": 3,
                    "colorblindSafe": []
                }
            ]
        }
    ]
}
```

## Writing

1. A writer MUST write `kind: "graphty-style"` and `version: 1` when the content fits version 1.
2. It MUST write only layers a reader could apply: graphty-element's own layers are left out, as
   `toDocument()` does today.
3. It MUST write the descriptor of every non-built-in palette a layer names, and no built-in one.
4. **Run ids.** A layer that names a run by an id graphty-element derived (a run started without an
   explicit `as`) would name a different run in another session. When the same file also carries
   the recipe that records the run, the writer writes the name the recipe gives it (recipe.md,
   "Recording" rule 4). A style written without that recipe refuses such a layer with
   `E_UNSTABLE_RUN_ID`, as 2.x documents: the caller re-runs with an explicit `as` and saves again.
5. It MUST NOT write `ids.edges` ("Selectors"); a layer holding them is left out and reported.
6. It MUST refuse a layer whose `userData` is not representable as JSON (a function, a cycle, a
   non-finite number), naming the layer.
7. It SHOULD write colours as hex (`#rrggbb`, or `#rrggbbaa` when alpha is below 1).
8. It writes each layer's authored `enabled`, never `false` for a layer the applier switched off
   only because a path had no answer, so that state is decided again every time the style is
   opened. graphty-element keeps a flag that tells the two apart.
9. A layer the applier refused (rule 2 of "Reading and applying") is written back as it was read.
10. When the top layers of a stack need a later style version and the rest fit version 1, the writer
    SHOULD write two members, the version 1 layers first, so an older reader still draws them
    (container.md, "Versions" rule 4).
11. The graphty-element test suite MUST run 2.x's own layer checker and `applyTemplate` over every
    worked example of this directory (not the conformance inputs, some of which are meant to fail)
    and require acceptance, and MUST check `toDocument()` output against the version 1 schema, so a
    drift from the version 1 freeze fails in continuous integration. A worked example that uses a
    version 1 addition 2.x does not answer (the path `id`) is checked for a switched-off layer
    instead.
12. **Renamed layers are written under the document's names.** A layer opened with a `columns`
    rename is written back with its original text, so saving a shared look after opening it on one
    dataset does not turn it into a look for that dataset only. The rename is kept in the report,
    never in the file.
13. `styleVersion` is written as read, or as the caller gave it (`saveDocument({ style: {
styleVersion } })`).

## Reading and applying

1. A style member whose top level fails (not an object, `layers` not an array) is skipped
   (container.md, "Reading a file" rule 13).
2. **A layer that cannot be applied fails alone.** A layer that fails any rule of the table under
   "Compatible with graphty-element 2.x" other than an unknown channel, fails its schema, exceeds a
   limit, or throws while it is checked MUST be added to the stack switched off, with its code and a
   reason, and reported. It MUST NOT be dropped, and MUST NOT stop the other layers. Such a
   **refused layer** is kept as it was read, beside the compiled stack: it has a `LayerId`, is
   listed with `enabled: false` and its problem, is written back unchanged, and is checked again by
   `update(id, patch)`, which compiles it only when it now passes.
3. **Unknown channels.** A channel entry naming an unknown channel is dropped from its layer and
   reported (`E_UNKNOWN_CHANNEL`); the layer's other channels apply, and the dropped entry is
   written back on save. A layer left with no channel is a refused layer with `E_UNKNOWN_CHANNEL`.
   This rule, not container.md's `W_UNKNOWN_MEMBER`, governs the keys of `set` and `encode`.
4. A valid layer that reads a path nothing in the session answers -- a column no element has, a run
   the session does not hold, a kept set it does not have -- is added switched off with the paths it
   needs and up to three existing columns with the nearest names as suggestions, which the applier
   never uses. This is how a style reports what is missing on new data. When the data is replaced
   or the run completes, the applier MUST check such a layer again and switch it on when it binds,
   reporting it. One exception: when the file holds a recipe member the reader skipped (a newer
   version, a bad shape), a layer of that file whose `results.` path names a run by a plain `as`
   stays switched off and is reported, naming the skipped recipe. It never binds to a run of the
   reader's own that happens to have that name.
5. **Carried palettes.** A carried palette whose id is not registered is registered for this session
   only and reported; it is never put in the page-wide registry, where it would reach every other
   element on the page. A carried palette whose id is already registered never replaces the
   registered one; a difference in colours is reported. A layer naming a palette that is neither
   registered nor carried is switched off with `E_UNKNOWN_PALETTE`.
6. Layers are added above every layer already present, in document order. Replacing the whole
   stack is an explicit choice of the caller, never the default.
7. **Imported layers are stamped.** Every layer added from a document gets
   `source: { by: "template", templateId }`, where `templateId` is the caller's choice, else the
   rule of container.md, "Writing a file" rule 7. A `source.by: "run"` is kept only when its `runId`
   names a run in this session, after the rewrite of recipe.md, "Run ids and namespaces" rule 3. A
   document cannot make its layers look like the reader's own. A style `id` starting `graphty.` or
   `graphty:` is reserved for graphty-element: it is ignored and reported, and the fallbacks of
   container.md name the layers.
   `session.styles.removeBySource((s) => s.by === "template" && s.templateId === id)` removes
   everything one opening added.
8. Applying a style MUST NOT start a run, change the data, move the camera or fetch anything.
9. **Opening the same style again.** When layers stamped with the same `templateId` are already in
   the stack, the applier follows `onRepeat`: `"replace"` (the default) removes them and puts the
   new layers where the lowest of them was; `"add"` adds a second copy above everything; `"refuse"`
   fails with `E_REPEAT_APPLICATION`. So opening a corrected version of a look, or the same file
   again with a rename, replaces the earlier opening.
10. **Renames.** `columns` maps the style's column names to the data's, as for recipes (recipe.md,
    "Binding to a new graph" rule 2): it rewrites parsed paths and expressions, never text, and the
    report records it. The layer keeps its original text, which is what a save writes ("Writing"
    rule 12).
11. The applier returns a `StyleReport`. `session.styles.applyTemplate(style, options)` takes the
    options 2.x has (`templateId`) and, new, `columns` and `onRepeat`; `openDocument` passes its own.

```ts
interface StyleReport {
    /**
     * Every layer of the member, in document order, keyed by position: what it reads, whether each
     * path bound, which channels it writes, and whether it would paint. The only list a preview
     * (`apply: false`) fills, because a preview adds no layer and so mints no LayerId.
     */
    readonly layers: readonly {
        readonly index: number;
        readonly id?: string; // the authored id
        readonly name: string;
        readonly reads: readonly { readonly path: string; readonly bound: boolean }[];
        readonly writes: readonly string[]; // channel names
        readonly state: "paints" | "unbound" | "refused";
    }[];
    /** styleVersion as read. */
    readonly styleVersion?: string;
    /** The layers that bound and now paint, bottom first. As 2.x's TemplateReport. Empty in a preview. */
    readonly applied: readonly LayerId[];
    /** The layers added switched off because a path they read has no answer. As 2.x, plus suggestions. */
    readonly unbound: readonly (UnboundLayer & { readonly suggestions: readonly string[] })[];
    /** The caller's renames, as applied. New. */
    readonly renamed: Readonly<Record<string, string>>;
    /** Layers of an earlier opening with the same templateId that this one replaced. New. */
    readonly replaced: readonly LayerId[];
    /** The layers added switched off because they failed a check (rule 2). New. */
    readonly refused: readonly { layer: LayerId; name: string; id?: string; code: GraphtyErrorCode; reason: string }[];
    /** Palettes registered for this session, channels dropped, ignored members. New. */
    readonly notices: readonly Problem[];
}
```

**When this applies.** `openDocument` applies style members by these rules from its first release.
`applyTemplate` in 2.x refuses the whole document for one bad layer or one unregistered carried
palette, always adds its layers, keeps any `source` a layer carries and stamps only when the caller
passes `templateId`, never switches an unbound layer back on by itself, and accepts `ids.edges`.
Callers may rely on each of these, so changing one is a breaking change: `applyTemplate` adopts
rules 2, 4, 5, 7 and 9 and the refusal of `ids.edges` ("Selectors") in graphty-element 3.0.0, the
major release that already groups the graph-format migration's breaking changes, and not before.
Its new `columns` option is additive and may come earlier.

## Upgrading a 1.x template

A graphty-element 1.x style template (`{ graphtyTemplate: true, majorVersion: "1", ... }`,
`graphty-element/src/config/StyleTemplate.ts`) is not a version 1 style. `openDocument` reads one
(container.md, "Reading a file" rule 4) by converting it to a document, and MUST NOT drop any part
of it silently. The parts the conversion cannot represent are reported by name and not applied:
`openDocument` never hands a 1.x template to graphty-element's own template input
(`styleTemplate`), because its background can name an image URL the element would fetch and its
data settings change how every later import is read (container.md, "Reading a file" rule 4).

| 1.x part                              | Becomes                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layers`                              | a style member. A 1.x layer with both a node and an edge style becomes two layers; selector `""` becomes `{ "match": "everything" }`, any other selector string `{ "match": "expression", "where": ... }`; a 1.x `algorithmResults` path is rewritten to `results.<as>.<field>` with the `as` below and the field's current name |
| a layer's `calculatedStyle`           | reported with its expression, for a person to rewrite as an encoding; the rest of the layer converts                                                                                                                                                                                                                             |
| `data.algorithms`                     | a recipe member (these were the runs made on load), one `algo.run` per entry, with the key translated through graphty-element's legacy keys (`graphty:scc` becomes `components` with `{ "strength": "strong" }`) and `as` given by recipe.md's rule. It runs only when the caller asks                                           |
| `graph.layout`, `graph.layoutOptions` | the same recipe, one `layout.set`                                                                                                                                                                                                                                                                                                |
| everything else                       | reported by name as not representable in version 1: column roles, the view mode, the camera, the background, behaviour                                                                                                                                                                                                           |

## Conformance

| Input                                                                                                                         | Required result                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| a layer with neither `set` nor `encode`                                                                                       | added switched off, `E_BAD_LAYER`; the other layers apply                                                  |
| a binding with both `domain` and `clamp`                                                                                      | that layer switched off, `E_BAD_LAYER`                                                                     |
| `node.shape: "star"`                                                                                                          | that layer switched off, `E_OPTION_RANGE`                                                                  |
| a layer writing `"node.colour": "#f00"` and `"node.size": 2`                                                                  | `node.colour` dropped, `E_UNKNOWN_CHANNEL`; the layer applies its size; `node.colour` written back on save |
| a layer writing only `"node.colour": "#f00"`                                                                                  | refused, `E_UNKNOWN_CHANNEL`; listed switched off; written back unchanged                                  |
| `"edge.patternCount": 2147483647`                                                                                             | that layer switched off, `E_OPTION_RANGE`                                                                  |
| a layer reading `data.logFC` on data whose column is `log2FoldChange`                                                         | added switched off; `unbound` suggests `log2FoldChange`                                                    |
| a layer colouring by `data.logFC` where `logFC` holds numbers and `NA`                                                        | the numbers painted; `NA` treated as missing; `W_COLUMN_TYPE` with the count                               |
| an ordinal colour layer over `team` with groups of 5, 3 and 3 elements                                                        | the largest group takes the palette's first colour; the tied groups by name                                |
| the same style opened twice                                                                                                   | the second opening replaces the first's layers (`replaced` lists them)                                     |
| opened with no graph loaded, then data loaded that has the columns                                                            | layers switched off, then switched on and reported when the data arrives                                   |
| a layer switched off for a missing column, saved                                                                              | written with its authored `enabled` (true), not `false`                                                    |
| a style written alone with a layer reading a run started without `as`                                                         | refused, `E_UNSTABLE_RUN_ID`                                                                               |
| `"node.color": "red\" onload=\"x"`                                                                                            | does not parse as a colour; layer switched off, `E_BAD_LAYER`                                              |
| a layer reading `data.logFC` on a graph with no `logFC` column                                                                | added switched off; `unbound` names `data.logFC`                                                           |
| `where: "data.adj.P.Val < \`0.05\`"`on a graph with a column`adj.P.Val`                                                       | matches the elements whose `adj.P.Val` is below 0.05                                                       |
| an edge layer with `ids: { "edges": ["17"] }`                                                                                 | added switched off, `E_BAD_LAYER`                                                                          |
| a layer naming palette `lab-reds`, carried, not registered                                                                    | registered for this session only and reported; the layer paints                                            |
| a layer naming palette `lab-reds`, neither carried nor registered                                                             | switched off, `E_UNKNOWN_PALETTE`                                                                          |
| a carried descriptor under the id `viridis`                                                                                   | ignored and reported; the built-in palette is used                                                         |
| a layer with `source: { "by": "user" }` from a document                                                                       | stored as `{ "by": "template", "templateId": ... }`                                                        |
| two layers with `id: "size"`                                                                                                  | the second switched off, `E_DUPLICATE_ID`                                                                  |
| a `top` selector with `n: 10` whose values run 1 to 8, then three tied at 9                                                   | 8 elements painted; the report says 3 were left out at the tie                                             |
| a binding `"overflw": "other"` (misspelt)                                                                                     | ignored, `W_UNKNOWN_MEMBER` at its pointer; the schema refuses it                                          |
| an ordinal colour over `mutation_count` holding the number 1, with `map: { "1": "#fdae61" }`                                  | the node painted `#fdae61`, whether the column came from GraphML (int) or CSV                              |
| `map` pins `Supplier` and `OEM` to the palette's first two colours; an unmapped `Distributor` is largest                      | `Distributor` takes the palette's third colour                                                             |
| a `map` key `Supplier` on data whose values are `supplier`                                                                    | the key reported as matching no value                                                                      |
| an ordinal colour over a Neo4j `labels` list                                                                                  | the lists treated as missing; `W_COLUMN_TYPE` with the count                                               |
| `"node.label": { "by": "id", "scale": "passthrough" }` on a CSV edge list                                                     | every node labelled by its id; on graphty-element 2.x, switched off and reported                           |
| `"edge.patternCount": { "by": "data.w", "range": [2, 1e12] }`                                                                 | values clamped to 1,000; the report counts them                                                            |
| a `passthrough` label over a 60 MB text value                                                                                 | cut to 1,024 characters; counted                                                                           |
| `where: "contains(data.labels, 'Supplier')"`                                                                                  | that layer switched off, `E_BAD_SELECTOR`: functions are not in the language                               |
| `where: "data.padj < \`0.05\`"`where`padj`holds numbers and`NA`                                                               | matches the nodes whose number is below 0.05; `W_COLUMN_TYPE` with the count of `NA`                       |
| a layer with `domain: [0.4, 1]` over values from 0 to 1000                                                                    | paints; a notice says more than 95 percent of the values fall outside the domain                           |
| a style opened with `columns: { "padj": "FDR" }`, then saved                                                                  | the layer written with `data.padj`, as read                                                                |
| a `member` selector of `"selection"`, opened                                                                                  | applied; reported as tied to the session it was written in                                                 |
| a style `id` of `graphty.default`                                                                                             | the id ignored and reported                                                                                |
| a style with `apply: false`                                                                                                   | `layers` lists each layer's paths, bound state and channels; `applied` is empty                            |
| a file whose recipe member is version 2 (skipped) and whose style reads `results.hubs.value`, with a session run named `hubs` | the layer switched off, naming the skipped recipe; the session's `hubs` is not painted                     |
| a 1.x template with a skybox background                                                                                       | the layers converted; the background reported, not applied, nothing fetched                                |

## Worked example

A lab's expression overlay: red for genes up, blue for down, grey for not measured, significant genes
outlined. It needs `logFC` and `padj` as node columns of the network itself; version 1 cannot join a
separate expression table (README, "What version 1 does not cover"). With a GraphML or node-link
JSON network, add the columns to its nodes; with a CSV edge list, load the expression table as a
node list and merge the edge list into it (README, "What every importer produces", "CSV shapes"). Applied to a network whose nodes have `logFC` and `padj`, both layers paint.
Applied to one that calls the adjusted p-value `FDR`, the outline layer is added switched off and the
report names `data.padj`, suggesting `FDR`; the caller opens the file again with
`columns: { "padj": "FDR" }`, which replaces the first opening's layers, or keeps the colouring
alone.

```json
{
    "kind": "graphty-document",
    "version": 1,
    "members": [
        {
            "kind": "graphty-style",
            "version": 1,
            "id": "org.example-lab.expression-overlay",
            "name": "Expression overlay",
            "layers": [
                {
                    "id": "logfc",
                    "name": "Log fold change",
                    "target": "node",
                    "kind": "encoding",
                    "selector": { "match": "everything" },
                    "encode": {
                        "node.color": {
                            "by": "data.logFC",
                            "palette": "blue-orange",
                            "domain": [-3, 3],
                            "midpoint": 0,
                            "missing": { "value": "#bdbdbd" }
                        }
                    }
                },
                {
                    "id": "significant",
                    "name": "padj below 0.05",
                    "target": "node",
                    "kind": "highlight",
                    "selector": { "match": "expression", "where": "data.padj < `0.05`" },
                    "set": { "node.outline": "#000000" }
                }
            ]
        }
    ]
}
```
