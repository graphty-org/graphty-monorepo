# Style

`kind: "graphty-style"`, version 1, a member of a graphty document ([container.md](container.md)).
Schema: [style.schema.json](style.schema.json). The shortest working example is README, "Your first
style"; edge-case rulings are rows of [conformance.md](conformance.md).

## Purpose

A style is a stack of style layers: how nodes and edges are drawn, stated as rules over the data's
columns and the runs' results, never as values stored on particular elements. It is meant to be
applied to new data: the same fold-change colouring on the next gene list, the same team colours
on next quarter's organisation chart.

## Compatible with graphty-element 2.x

The style member is the `StyleDocument` graphty-element 2.x publishes
(`graphty-element/src/catalog/types.ts`), written by `session.styles.toDocument()` and read by
`session.styles.applyTemplate()`, plus `kind` and a few optional members that 2.x ignores.

1. **Every style 2.x has written is a version 1 style**, read as one when it has no `kind`
   (container.md, "Reading a file" rule 3), with two exceptions: a layer selecting edges by id
   ("Selectors"), and a value past one of the maxima version 1 adds where 2.x checks none (a size
   above 1,000,000, `edge.patternCount` above 1,000, a label style's sizes). A version 1 reader
   refuses such a layer and writes it back unchanged.
2. **Version 1 is what 2.x reads**, with three differences, each a graphty-element 3.0.0 change: on
   a node, `data.id` reads the node's id ("Paths" rule 3), where 2.x answers nothing; an expression
   may write a number, `true`, `false` or `null` bare ("Expressions" rule 1), which 2.x refuses or
   reads as a column; and `map` takes its pinned values out of the palette ("Bindings" rule 9). A
   style meant for 2.x readers too writes its literals in backticks. A value a later release adds
   to an open list fails only its channel entry or its layer on an older reader (container.md,
   "Versions" rule 2).

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

Selectors and bindings name values by path over `{ data, results }`, the model graphty-element 2.x
implements:

1. `data.<column>` reads the column of that name; `results.<run id>.<field>` reads a field of a
   run's result. A column name is flat: a dot is part of the name and nested values are not
   walked, so `data.adj.P.Val` reads the column named `adj.P.Val`. A path with neither prefix is
   read as `data.<path>` (`team` is `data.team`). graphty-element's own writers write `data.`.
2. Every path -- a binding's `by`, a selector's `path`, the paths inside a `where` -- is read the same
   way. A segment that is not an identifier (`[A-Za-z_][A-Za-z0-9_]*`) is quoted (`data."log-fc"`,
   `data."display name"`); an unquoted hyphen is subtraction. A quoted segment MUST NOT contain a
   dot, as in 2.x; a caller reaches such a column with `columns` (README, "Applying to new data"
   rule 2).
3. **Ids and ends.** A node's id and an edge's two ends are structure, not columns, but a style may
   read them: on a node, `data.id` reads the node's id when the node has no column `id`; on an edge,
   `data.source` and `data.target` read its ends when the edge has no column of that name. A real
   column of that name wins. An id is a value of one dataset, so a selector comparing one with a
   literal names particular nodes. A style reads nothing else of the structure.

### Expressions

A `where` in a selector or a recipe scope is written in graphty-element's expression language, a
subset of JMESPath (`graphty-element/src/session/styles/predicate.ts`). An accepted expression means
what JMESPath means by it, with two departures: a path names one flat column ("Paths" rule 1), and a
number, `true`, `false` and `null` may be written bare. Anything outside the subset is refused at
the character where it starts, and the layer (or command) fails alone with `E_BAD_SELECTOR`.

```
expression := or
or         := and ( "||" and )*
and        := comparison ( "&&" comparison )*
comparison := unary ( ("==" | "!=" | "<" | "<=" | ">" | ">=") unary )?
unary      := "!" unary | operand
operand    := literal | path | "(" expression ")"
literal    := number | "true" | "false" | "null" | "'" text "'" | "`" json "`"
path       := name ( "." name )*
```

1. **Literals.** A JSON number written bare (`0.05`, `-2`, `1e-6`), the words `true`, `false` and
   `null`, or text in single quotes (`'SUPPLIES'`, where only `'` and `\` are escapes). The long
   form, any JSON value in backticks (`` `0.05` ``, `` `["a","b"]` ``), means the same and is the
   only way to write a list or an object. A bare `true`, `false` or `null` is always the literal; a
   column of that name is written `data.true`.
2. **Paths** are those of "Paths"; a name is an identifier or a double-quoted JSON string.
3. **No functions, projections, slices, pipes, wildcards or multi-selects**, so no expression tests
   whether a list or a text holds a value.
4. **Comparisons.** `==` and `!=` compare JSON values exactly and structurally. `<`, `<=`, `>` and
   `>=` read each side as a number by README, "What every importer produces" rule 4, and give null,
   which is false, for every other pair. A comparison does not chain.
5. **Truth.** A value is false when it is `false`, `null`, missing, an empty string, an empty list
   or an empty object; zero is true, and so is the text `"FALSE"`. `!` before a path of more than
   one segment is refused (JMESPath would read `!data.flag` as `(!data).flag`); write
   `!(data.flag)`.

### Result fields

`results.<run id>.<field>` names a field a run publishes. Each algorithm's fields are its
`AlgorithmDescriptor.fields` in graphty-element's catalogue (the `./catalog` entry point); the plan
of a recipe lists them per command. The most used:

<!-- prettier-ignore -->
| Algorithms | Node fields |
| --- | --- |
| `degree`, `betweenness`, `closeness`, `pagerank`, `eigenvector`, `katz`, `k-core` | `value` (the score), `rank`, `percentile` |
| `louvain`, `leiden`, `label-propagation`, `girvan-newman`, `components` | `group` (an integer per community or piece), `groupSize` |

`data.<column>` reads a column the data file has; `results.<run>.<field>` reads what a run
computed: to colour by communities a file records, read `data.community`; by those a Louvain run
named `groups` found, `results.groups.group`. A field the run does not publish leaves the layer
switched off, like a missing column. A node outside a run's scope has no value for its fields. In a
file that also carries the recipe, a path names the run by the recipe's plain `as`
(container.md, "Applying a file" rule 3). A layer that encodes a result selects with `has` on that
path, never `everything`, which 2.x refuses:

```jsonc
{
    "name": "Colour by community",
    "selector": { "match": "has", "path": "results.groups.group" },
    "encode": { "node.color": { "by": "results.groups.group", "scale": "ordinal", "overflow": "other" } },
}
```

### Selectors

<!-- prettier-ignore -->
| `match` | Members | Matches |
| --- | --- | --- |
| `everything` | -- | every node, or every edge, of the layer's target |
| `has` | `path` | the elements where the path has a value |
| `expression` | `where` | the elements where the predicate ("Expressions") is true |
| `top` | `path`, `n` | the `n` elements with the highest values of a `results.` path; a tied group is taken whole, and only when all of it fits in `n` |
| `ids` | `nodes` | the listed nodes, by node id |
| `member` | `of` (a scope) | the members of a scope, usually a kept set `{ "set": id }` |

A selector that names particular elements -- `ids`, or `member` of any scope but `{ where }` -- is
legal but does not travel to new data: a reader applies it and reports it as tied to the session it
was written in, and a save leaves it out by default (container.md, "Writing a file" rule 4).

**No edges by id.** graphty-element 2.x writes edges in an `ids` selector as session counters that
restart every session. A writer MUST NOT write `ids.edges`; a reader MUST add an edge layer whose
selector lists them switched off with `E_BAD_LAYER`, and ignore `ids.edges` on a node layer,
reporting it.

### Channels and values

The member names of `set` and `encode` are channel names, the list graphty-element publishes as
`Channel`. The schema lists them with their value types:

<!-- prettier-ignore -->
| Channels | Value |
| --- | --- |
| colours: `node.color`, `node.outline`, `node.glow`, `edge.color`, `edge.arrowHeadColor`, `edge.arrowTailColor` | a CSS colour string (hex RECOMMENDED) or `{ r, g, b, a }`, r, g, b in 0..255, a in 0..1 |
| `node.size`, `edge.width`, `edge.arrowHeadSize`, `edge.arrowTailSize` | 0 to 1,000,000 scene units; 1 is the default node size |
| opacities | 0..1 |
| `node.shape`, `edge.style`, `edge.arrowHead`, `edge.arrowTail` | one of the names the schema lists |
| labels, tooltips, arrow texts | text of at most 1,024 characters, always drawn as text |
| label, tooltip and arrow-text styles | a label style record |
| `node.wireframe`, `node.flat`, `edge.curvature` | a boolean |
| `edge.patternCount` | an integer from 2 to 1,000 |
| `edge.animationSpeed`, `node.glowStrength` | 0 to 1,000,000 |

These limits hold for every value a layer produces: a value an encoding produces (from `range`,
`map`, `missing`, `other` or a `passthrough` of the data) is checked when it is painted, a number
clamped to the channel's range, text cut to 1,024 characters, each counted in the report; a value
that is not a finite number is missing. The applier parses every colour into RGBA; a colour that
does not parse fails its layer with `E_BAD_LAYER`. Every count a style sets has a maximum --
`edge.patternCount` 1,000, `bins` 256, a `map` 1,000 entries -- and a value above one fails its
layer with `E_OPTION_RANGE`. A patterned edge's pieces are spaced by the larger of its width and
0.01 scene units, and a layer whose pieces would take the scene past README's limit enters the
state `failing` with `E_CAP_EXCEEDED`. `node.marker` is reserved for graphty-element's own markers.

### Bindings

A binding is a literal `{ value }` or a mapping `{ by, scale?, palette?, ... }` from the value at a
path to a channel value. `scale` is one of `linear`, `log`, `neglog10`, `sqrt`, `pow`, `bins`,
`quantile`, `ordinal` and `passthrough`; absent, a colour or number channel uses `linear` and any
other `passthrough`. For the numeric scales:

1. `domain` `[low, high]`, or `"auto"` (the default) for the extent of the values present, is the
   input interval. The value and the domain ends are transformed by the scale, then placed from 0
   to 1; a value below `low` is placed at 0 and one above `high` at 1. An explicit domain assumes a
   scale of the data; prefer `"auto"` or `clamp` for a column whose scale varies by source.
2. `midpoint` places that value at 0.5, each half linear after the transform, so a skewed domain
   keeps its midpoint at the centre of a diverging palette.
3. `clamp` `[p, q]` narrows the domain to the values at those percentiles. `clamp` and an explicit
   `domain` MUST NOT both be given.
4. `range` `[a, b]` maps position 0 to `a` and 1 to `b` for a number channel; a colour channel reads
   its palette. `reverse: true` swaps the ends.
5. `missing` decides an element with no value: `"skip"` (the default) paints nothing; `{ value }`
   paints that value.
6. `exponent` is the power of `pow` (default 2), from 0.01 to 100. `bins` is how many groups the
   values are sorted into, at most 256: of equal width for `bins` (default 5), of equal count for
   `quantile` (default 4).
7. A value that is not a finite number, or that the scale cannot place (zero or a negative under
   `log` or `neglog10`, as in 2.x), is missing, left out of the `"auto"` domain and counted with
   `W_COLUMN_TYPE`. `sqrt` is signed, as in 2.x. Every number a binding itself gives is finite.

For `ordinal`, which maps categories:

8. Categories take the palette's colours in order of size, largest group first; a tie is broken by
   the category text, numbers ascending when both read as numbers, else by code point, never by
   locale. A category is the value as text: a number by its shortest decimal form, `true` and
   `false` as those words; a list is missing. The default palette is `okabe-ito` (8 colours).
9. `map` pins a category to a value (`{ "sales": "#0b5fff" }`), keys matched against the category
   text. On a colour channel an unmapped category takes the next palette colour no `map` entry
   uses, so it never shares a pinned colour; on any other channel (a shape) an unmapped category
   is missing. The report names every `map` key that matched no value.
10. `other: { threshold, value }` paints every category carried by fewer than `threshold` elements
    with `value`.
11. `overflow` says what happens with more categories than the palette has colours: `"other"` keeps
    the palette's colours for the largest groups and paints the rest dark grey (#505050); `"shape"`
    (nodes only) reuses the colours with a new shape per round; `"extend"` gives every group its own
    colour, not guaranteed distinct. Without it, too many categories fail the layer with
    `E_CAP_EXCEEDED`, in the state `failing`, retried at every repaint. A style meant for data it
    has not seen gives `overflow`.

### Layer sources

`source` records who made a layer: `{ by: "run", runId, algorithm, params }` for a layer painting a
run's result, `{ by: "template", templateId }` for one from a document, `{ by: "user" }`, and
`{ by: "plugin", name }`. `{ by: "element" }` marks graphty-element's own locked layers and MUST NOT
appear in a document.

### Layer ids

A layer's `id` is an authored key, not graphty-element's `LayerId`. graphty-element stores it on the
layer, exposes it through the styles API and writes it back in `toDocument()`. Software that saves
styles SHOULD give every layer an `id` and keep it across saves; a hand-written style may leave it
out.

### Palettes

`palettes` carries the descriptor of every palette a layer names that graphty-element does not
ship. Built-in ids are reserved: a descriptor under one is ignored and reported. The built-in ids
are `viridis`, `ylorbr` (the default for a measurement), `plasma`, `inferno`, `blues`, `greens`,
`oranges`; `okabe-ito` (the default for categories), `tol-vibrant`, `tol-muted`, `pastel`, `carbon`;
the diverging `purple-green`, `blue-white-red`, `blue-orange`, `red-blue`; and `blue-highlight`,
`green-highlight`, `orange-highlight`. Their colours are graphty-element's exported
`PALETTE_DESCRIPTORS`. `blue-white-red` (blue low, white middle, red high) is the diverging palette
for a signed measure; `blue-orange` is the same palette under the name 2.x published.

A carried descriptor has `id`, `plainName`, `kind` (`sequential`, `diverging` or `categorical`),
`colors` (at most 256), `capacity` (how many categories it keeps apart; `null` for a continuous
palette) and `colorblindSafe` (`[]` means untested, not unsafe), all required, as in 2.x's
`PaletteDescriptor`. A sequential or diverging palette's colours are spaced evenly from 0 to 1. A
page that wants its brand palette everywhere registers it once; a carried palette is for a style
travelling to pages that do not have it:

```js
import { registerPalette } from "@graphty/graphty-element/extend";

registerPalette({
    id: "acme-brand",
    plainName: "Acme brand",
    kind: "categorical",
    colors: ["#0b5fff", "#ff8800", "#00a86b"],
    capacity: 3, // the number of colours, for a categorical palette
    colorblindSafe: [], // untested
});
```

The same palette carried in a style, with `sales` pinned so it keeps its colour across datasets:

```json
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
```

## Writing

1. A writer MUST write `kind: "graphty-style"` and `version: 1` when the content fits version 1.
2. It MUST write only layers a reader could apply: graphty-element's own layers are left out, as
   `toDocument()` does today.
3. It MUST write the descriptor of every non-built-in palette a layer names, and no built-in one.
4. **Run ids.** A layer naming a run by an id graphty-element derived (a run started without `as`)
   would name another run in another session. When the file also carries the recipe that records
   the run, the writer writes the name the recipe gives it (recipe.md, "Recording" rule 4);
   otherwise `saveDocument` leaves the layer out and lists it with `E_UNSTABLE_RUN_ID`.
5. It SHOULD write colours as hex (`#rrggbb`, or `#rrggbbaa` when alpha is below 1).
6. It writes each layer's authored `enabled`, never `false` for a layer the applier switched off
   only because a path had no answer, so that state is decided again at every opening.
7. A layer the applier refused ("Reading and applying" rule 1) is written back as it was read.
8. **Renamed layers are written under the document's names.** A layer opened with a `columns`
   rename, or whose `results.<as>` path was rewritten to a namespaced run id, is written back with
   its original text, so saving a shared look after opening it on one dataset does not turn it
   into a look for that dataset only. An edit made after the opening is written through the
   inverse of the rename. A namespaced path whose recipe the written file does not hold is left
   out and listed in `report.leftOut`.
9. `styleVersion` is written as read, or as the caller gave it.

## Reading and applying

1. **A layer that cannot be applied fails alone.** A layer that fails its schema, names an unknown
   selector kind, scale or layer kind, gives a value of the wrong type or out of its range, exceeds
   a limit, or throws while it is checked MUST be added to the stack switched off, with its code
   and a reason, and reported. It MUST NOT be dropped and MUST NOT stop the other layers. Such a
   **refused layer** is kept as read beside the compiled stack: it has a `LayerId`, is listed with
   `enabled: false` and its problem, and is checked again by `update(id, patch)`.
2. **Unknown channels and values.** A channel entry naming an unknown channel is dropped from its
   layer (`E_UNKNOWN_CHANNEL`); so is an entry giving an enumerated channel a value this reader
   does not know (`E_OPTION_RANGE`) and an entry writing `node.marker` (`E_UNSUPPORTED`). The
   layer's other channels apply and the dropped entry is written back on save. A layer left with no
   channel is refused with that code.
3. **Unbound paths.** A layer reading a path nothing in the session answers -- a column no element
   has, a run the session does not hold, a kept set it does not have -- is added switched off with
   the paths it needs and up to three nearest existing columns as suggestions, and is checked again
   whenever the graph's columns change or a run completes (README, "Applying to new data" rule 5).
   A layer waiting for a run the file's own recipe will make has the state `waiting`. A layer whose
   paths bind but whose selector matches nothing carries `W_MATCHES_NOTHING`, listing up to five of
   the column's most frequent values when its `where` compares a column with a literal. A
   `passthrough` binding gives up to three sample values it would draw.
4. **Carried palettes.** A carried palette whose id is not registered is registered for this session
   only, never in the page-wide registry, and reported. One whose id is already registered never
   replaces it; a difference in colours is reported. A layer naming a palette neither registered
   nor carried is switched off with `E_UNKNOWN_PALETTE`.
5. Layers are added above every layer already present, in document order; replacing the whole stack
   is the caller's explicit choice. A layer that will paint a channel one of the reader's enabled
   layers already paints carries `W_PAINTS_OVER`, naming that layer, in a preview too.
6. **Imported layers are stamped** `source: { by: "template", templateId }`, so a document cannot
   make its layers look like the reader's own. The template id is the caller's `templateId`, else
   the style member's `id`, else one derived from the document (its name, else `fileName`, else a
   hash of its text, with the member's position). A `source.by: "run"` is kept only when its
   `runId` names a command of a recipe applied in this same opening, and the layer is removed with
   that run; any other is stamped `template` and the replaced source reported. A reserved style id
   (README, "Trust" rule 5) is ignored and reported.
   `session.styles.removeBySource((s) => s.by === "template" && s.templateId === id)` removes
   everything one opening added.
7. Applying a style MUST NOT start a run, change the data, move the camera or fetch anything.
8. **Opening the same style again.** When layers stamped with the same template id are already in
   the stack, the applier follows `onRepeat`: `"replace"` removes them and puts the new layers where
   the lowest of them was; `"add"` adds a second copy; `"refuse"` fails with
   `E_REPEAT_APPLICATION`. The default is `"replace"` only when the template id is the caller's
   `templateId`, or the style's own `id` and both openings came from the same place -- the same
   `base` origin and directory -- so a corrected version of a look replaces the earlier opening. An
   `id` is a string anyone can copy: a style from another place claiming an `id` already opened is
   added beside it with `W_ID_COLLISION`, unless the caller passes `onRepeat: { style: "replace" }`.
   A template id derived from the document never replaces by default. A preview lists the layers
   a real opening would replace.
9. The applier returns a `StyleReport`. `session.styles.applyTemplate(style, options)` takes 2.x's
   `templateId` and, new, `columns`, `nodeColumns`, `edgeColumns` and `onRepeat`.

```ts
interface StyleReport {
    readonly id?: string;
    readonly name?: string;
    readonly description?: string;
    readonly templateId: string; // removeBySource takes it
    /** Every layer of the member, in document order: the only list a preview fills. */
    readonly layers: readonly {
        readonly index: number;
        readonly id?: string; // the authored id
        readonly name: string;
        readonly selector: Selector; // as read, after renames
        readonly matched: number | null; // elements selected on this graph; null when unbound or waiting
        readonly of: number | null;
        readonly reads: readonly {
            readonly path: string;
            readonly bound: boolean;
            readonly withValue: number | null; // elements with a value at the path
            readonly of: number | null;
            readonly suggestions: readonly string[]; // nearest existing names when unbound; never used
        }[];
        /** What it writes to each channel: a `set` value, or the binding's by, scale, palette and range. */
        readonly writes: readonly {
            readonly channel: string;
            readonly value?: unknown;
            readonly by?: string;
            readonly scale?: string;
            readonly palette?: string;
            readonly range?: readonly [unknown, unknown];
            readonly samples?: readonly string[]; // a passthrough binding: up to three values it would draw
        }[];
        /** "failing": enabled but painting nothing (too many categories, pattern pieces, repaint budget). */
        readonly state: "paints" | "waiting" | "unbound" | "refused" | "failing";
        readonly problem?: Problem; // for "refused", "unbound" and "failing"
        readonly waitsFor?: { readonly as: string; readonly runId: string }; // for "waiting"
    }[];
    readonly styleVersion?: string;
    readonly applied: readonly LayerId[]; // layers that now paint, bottom first; empty in a preview
    readonly unbound: readonly (UnboundLayer & { readonly suggestions: readonly string[] })[];
    readonly renamed: Readonly<Record<string, string>>; // the caller's renames, as applied
    readonly replaced: readonly LayerId[]; // layers of an earlier opening this one replaced, or would
    readonly refused: readonly { layer: LayerId; name: string; id?: string; code: GraphtyErrorCode; reason: string }[];
    /** Palettes registered, channels dropped, W_PAINTS_OVER, W_MATCHES_NOTHING, W_ID_COLLISION, W_FEW_VALUES. */
    readonly notices: readonly Problem[];
}
```

**When this applies.** `openDocument` applies style members by these rules from its first release.
`applyTemplate` in 2.x refuses a whole document for one bad layer, always adds, keeps any `source`,
never switches an unbound layer back on and accepts `ids.edges`; callers may rely on each, so it
adopts rules 1, 3, 4, 6 and 8 and the refusal of `ids.edges` in graphty-element 3.0.0 and not
before. Its new `columns` option is additive and may come earlier.

## Worked example

A lab's expression overlay: red for genes up, blue for down, grey for not measured, significant
genes outlined, and each node labelled by its gene symbol. It needs `logFC` and `padj` as node
columns.

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
                            "palette": "blue-white-red",
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
                    "selector": { "match": "expression", "where": "data.padj < 0.05" },
                    "set": { "node.outline": "#000000" }
                },
                {
                    "id": "label-id",
                    "name": "Label by id",
                    "selector": { "match": "everything" },
                    "encode": { "node.label": { "by": "data.id", "scale": "passthrough" } }
                },
                {
                    "id": "label-name",
                    "name": "Label by name",
                    "selector": { "match": "has", "path": "data.name" },
                    "encode": { "node.label": { "by": "data.name", "scale": "passthrough" } }
                },
                {
                    "id": "label-display-name",
                    "name": "Label by display name",
                    "selector": { "match": "has", "path": "data.\"display name\"" },
                    "encode": { "node.label": { "by": "data.\"display name\"", "scale": "passthrough" } }
                }
            ]
        }
    ]
}
```

Applied to a network whose nodes have `logFC` and `padj`, the layers paint. The tools that make
these tables spell the columns differently: DESeq2 writes `log2FoldChange` and `padj`, limma `logFC`
and `adj.P.Val`, edgeR `logFC` and `FDR`. On a DESeq2 table the colour layer is added switched off,
naming `data.logFC` and suggesting `log2FoldChange`; on an edgeR table the outline layer names
`data.padj` with no suggestion, because the names share nothing. Either way the caller opens the
file again with the rename and replaces the first opening:
`openDocument(text, { columns: { "logFC": "log2FoldChange" }, onRepeat: { style: "replace" } })`.

The label is three layers, lowest first, because a node's id means different things in different
files: an edge list of gene symbols has the symbols as ids, while Cytoscape writes internal numbers
as ids and keeps what the network was built from in `name` -- for a network from its stringApp, the
STRING identifier, with the gene symbol in `display name`. Each upper layer is switched off where
its column is missing, so every file shows the best label it has.
