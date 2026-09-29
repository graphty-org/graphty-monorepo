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
2. **Version 1 is frozen to what 2.x accepts**, so a version 1 style keeps working on every 2.x
   release: the channel names, selector kinds, scales and layer kinds below, and the value lists of
   the enumerated channels (node shapes, line patterns, arrows). A style using anything 2.x would
   refuse MUST be written as style version 2, which a 2.x-era reader refuses by its version rather
   than by a confusing layer error. What 2.x refuses, with the code it reports:

| 2.x refuses                                                                         | Code                                                                    |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| an unknown channel, selector kind, scale or layer kind                              | `E_UNKNOWN_CHANNEL`, `E_BAD_SELECTOR`, `E_UNKNOWN_SCALE`, `E_BAD_LAYER` |
| a value outside an enumerated channel's list, or a number outside a channel's range | `E_OPTION_RANGE`                                                        |
| a value of the wrong type for its channel                                           | `E_BAD_LAYER`                                                           |
| a layer with neither `set` nor `encode`, or one channel in both                     | `E_BAD_LAYER`                                                           |
| a layer with no `target` writing both node and edge channels                        | `E_BAD_LAYER`                                                           |
| a binding with both an explicit `domain` and `clamp`                                | `E_BAD_LAYER`                                                           |
| an empty `where` or `has` path                                                      | `E_SELECTOR_EMPTY`                                                      |
| a quoted path segment holding a dot                                                 | `E_BAD_SELECTOR`                                                        |
| an `everything` layer encoding from a `results.` path                               | `E_UNSCOPED_RUN_ENCODING`                                               |
| `source.by: "element"`                                                              | `E_PROTECTED`                                                           |
| a carried palette whose id nobody registered                                        | `E_UNKNOWN_PALETTE`                                                     |

3. 2.x checks values, not member names, so the optional members this page adds (`kind`, `name`,
   `description`, a layer's `id`, `extensions`) are harmless to it. 2.x as a writer drops them: a
   style applied and saved again by 2.x loses `kind` and layer ids. That is why rule 1 reads a
   missing `kind` as a style.

## Data model

```ts
interface StyleMember {
    kind: "graphty-style";
    version: 1;
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
2. A path segment that is not an identifier (`[A-Za-z_][A-Za-z0-9_]*`) is quoted in an expression
   (`data."log-fc"`); an unquoted hyphen is subtraction. A quoted segment MUST NOT contain a dot.
3. A column that no element has, or a run the session does not hold, leaves the path unresolved; see
   "Reading and applying" rule 4.

### Selectors

| `match`      | Members        | Matches                                                                                                                                                   |
| ------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `everything` | --             | every node, or every edge, of the layer's target                                                                                                          |
| `has`        | `path`         | the elements where the path has a value                                                                                                                   |
| `expression` | `where`        | the elements where the predicate, in graphty-element's JMESPath dialect, is true                                                                          |
| `top`        | `path`, `n`    | the `n` elements with the highest values of a `results.<run id>.<field>` path; a group of tied values is taken whole, and only when all of it fits in `n` |
| `ids`        | `nodes`        | the listed nodes, by node id                                                                                                                              |
| `member`     | `of` (a scope) | the members of a scope, usually a kept set `{ "set": id }`                                                                                                |

A selector that names particular nodes (`ids`, or `member` of a kept set) is legal in a style, but
does not travel to new data: on a graph without those ids or that set, the layer paints nothing and
is reported. Prefer a selector over columns.

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
| `edge.patternCount`                                                                                            | an integer, at least 2                                                                     |
| `edge.animationSpeed`, `node.glowStrength`                                                                     | a non-negative number                                                                      |

`node.marker` is reserved for graphty-element's own note markers and is not written by a style. The
applier parses every colour into RGBA when it applies a layer; a colour that does not parse fails
its layer with `E_BAD_LAYER`.

### Bindings

A binding is a literal `{ value }` or a mapping `{ by, scale?, palette?, ... }` from the value at a
path to a channel value. `scale` is one of `linear`, `log`, `neglog10`, `sqrt`, `pow`, `bins`,
`quantile`, `ordinal` and `passthrough`; absent, a colour or number channel uses `linear` and any
other channel `passthrough`. For the numeric scales:

1. `domain` `[low, high]`, or `"auto"` for the extent of the values present, is the input interval.
   The value and the domain ends are transformed by the scale, then placed at a position from 0 to
    1. A value below `low` is placed at 0 and one above `high` at 1.
2. `midpoint` places that value at 0.5, each half linear after the transform, so a skewed domain
   keeps its midpoint at the centre of a diverging palette.
3. `clamp` `[p, q]` narrows the domain to the values at those percentiles of the values present.
   `clamp` and an explicit `domain` MUST NOT both be given.
4. `range` `[a, b]` maps position 0 to `a` and 1 to `b` for a number channel; a colour channel reads
   its palette. `reverse: true` swaps the ends.
5. `missing` decides an element with no value: `"skip"` (the default) paints nothing; `{ value }`
   paints that value.

`map`, `other`, `overflow`, `bins` and `exponent` mean what their declarations in
`graphty-element/src/catalog/types.ts` say.

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
built-in id is ignored and reported, and the built-in palette is used.

## Writing

1. A writer MUST write `kind: "graphty-style"` and `version: 1` when the content fits version 1.
2. It MUST write only layers a reader could apply: graphty-element's own layers are left out, as
   `toDocument()` does today.
3. It MUST write the descriptor of every non-built-in palette a layer names, and no built-in one.
4. **Run ids.** A layer that names a run by an id graphty-element derived (a run started without an
   explicit `as`) would name a different run in another session. Before writing such a layer the
   writer gives the run an explicit name by recipe.md's rule ("Recording" rule 4) and writes that
   name. When the same file also carries the recipe that produces the run, the writer writes the
   recipe's own `as`, not the namespaced run id (recipe.md, "Run ids and namespaces").
5. It MUST NOT write `ids.edges` ("Selectors"); a layer holding them is left out and reported.
6. It MUST refuse a layer whose `userData` is not representable as JSON (a function, a cycle, a
   non-finite number), naming the layer.
7. It SHOULD write colours as hex (`#rrggbb`, or `#rrggbbaa` when alpha is below 1).

## Reading and applying

1. A style member whose top level fails (not an object, `layers` not an array) is skipped
   (container.md, "Reading a file" rule 10).
2. **A layer that cannot be applied fails alone.** A layer that fails any rule of the table under
   "Compatible with graphty-element 2.x", fails its schema, exceeds a limit, or throws while it is
   checked MUST be added to the stack switched off, with its code and a reason, and reported. It MUST
   NOT be dropped, and MUST NOT stop the other layers.
3. A channel entry naming an unknown channel is dropped from its layer and reported
   (`E_UNKNOWN_CHANNEL`); the layer's other channels apply.
4. A valid layer that reads a path nothing in the session answers -- a column no element has, a run
   the session does not hold, a kept set it does not have -- is added switched off with the paths it
   needs, as `applyTemplate()` does in 2.x. This is how a style reports what is missing on new data.
5. **Carried palettes.** A carried palette whose id is not registered is registered for this session
   only and reported; it is never put in the page-wide registry, where it would reach every other
   element on the page. A carried palette whose id is already registered never replaces the
   registered one; a difference in colours is reported. A layer naming a palette that is neither
   registered nor carried is switched off with `E_UNKNOWN_PALETTE`.
6. Layers are added above every layer already present, in document order. Replacing the stack is an
   explicit choice of the caller, never the default.
7. **Imported layers are stamped.** Every layer added from a document gets
   `source: { by: "template", templateId }`, where `templateId` is the caller's choice or else the
   document's `name` or file name. A `source.by: "run"` is kept only when its `runId` names a run in
   this session. A document cannot make its layers look like the reader's own.
8. Applying a style MUST NOT start a run, change the data, move the camera or fetch anything.
9. The applier returns a `StyleReport`:

```ts
interface StyleReport {
    /** The layers that bound and now paint, bottom first. As 2.x's TemplateReport. */
    readonly applied: readonly LayerId[];
    /** The layers added switched off because a path they read has no answer. As 2.x. */
    readonly unbound: readonly UnboundLayer[];
    /** The layers added switched off because they failed a check (rule 2). New. */
    readonly refused: readonly { layer: LayerId; name: string; id?: string; code: GraphtyErrorCode; reason: string }[];
    /** Palettes registered for this session, channels dropped, ignored members. New. */
    readonly notices: readonly Problem[];
}
```

**When this applies.** `openDocument` applies style members by these rules from its first release.
`applyTemplate` in 2.x refuses the whole document for one bad layer or one unregistered carried
palette, and callers may rely on that, so changing it is a breaking change: `applyTemplate` adopts
rules 2 and 5 in graphty-element 3.0.0, the major release that already groups the graph-format
migration's breaking changes, and not before.

## Upgrading a 1.x template

A graphty-element 1.x style template (`{ graphtyTemplate: true, majorVersion: "1", ... }`,
`graphty-element/src/config/StyleTemplate.ts`) is not a version 1 style. A reader that accepts one
MUST convert it to a document and MUST NOT drop any part of it silently:

| 1.x part                              | Becomes                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layers`                              | a style member. A 1.x layer with both a node and an edge style becomes two layers; selector `""` becomes `{ "match": "everything" }`, any other selector string `{ "match": "expression", "where": ... }`; a 1.x `algorithmResults` path is rewritten to `results.<as>.<field>` with the `as` below and the field's current name |
| a layer's `calculatedStyle`           | reported with its expression, for a person to rewrite as an encoding; the rest of the layer converts                                                                                                                                                                                                                             |
| `data.algorithms`                     | a recipe member (these were the runs made on load), one `algo.run` per entry, with the key translated through graphty-element's legacy keys (`graphty:scc` becomes `components` with `{ "strength": "strong" }`) and `as` given by recipe.md's rule. It runs only when the caller asks                                           |
| `graph.layout`, `graph.layoutOptions` | the same recipe, one `layout.set`                                                                                                                                                                                                                                                                                                |
| everything else                       | reported by name as not representable in version 1: column roles, the view mode, the camera, the background, behaviour                                                                                                                                                                                                           |

## Conformance

| Input                                                                       | Required result                                                        |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| a layer with neither `set` nor `encode`                                     | added switched off, `E_BAD_LAYER`; the other layers apply              |
| a binding with both `domain` and `clamp`                                    | that layer switched off, `E_BAD_LAYER`                                 |
| `node.shape: "star"`                                                        | that layer switched off, `E_OPTION_RANGE`                              |
| a layer writing `"node.colour": "#f00"` and `"node.size": 2`                | `node.colour` dropped, `E_UNKNOWN_CHANNEL`; the layer applies its size |
| `"node.color": "red\" onload=\"x"`                                          | does not parse as a colour; layer switched off, `E_BAD_LAYER`          |
| a layer reading `data.logFC` on a graph with no `logFC` column              | added switched off; `unbound` names `data.logFC`                       |
| `where: "data.adj.P.Val < \`0.05\`"`on a graph with a column`adj.P.Val`     | matches the elements whose `adj.P.Val` is below 0.05                   |
| an edge layer with `ids: { "edges": ["17"] }`                               | added switched off, `E_BAD_LAYER`                                      |
| a layer naming palette `lab-reds`, carried, not registered                  | registered for this session only and reported; the layer paints        |
| a layer naming palette `lab-reds`, neither carried nor registered           | switched off, `E_UNKNOWN_PALETTE`                                      |
| a carried descriptor under the id `viridis`                                 | ignored and reported; the built-in palette is used                     |
| a layer with `source: { "by": "user" }` from a document                     | stored as `{ "by": "template", "templateId": ... }`                    |
| two layers with `id: "size"`                                                | the second switched off, `E_DUPLICATE_ID`                              |
| a `top` selector with `n: 10` whose values run 1 to 8, then three tied at 9 | 8 elements painted; the report says 3 were left out at the tie         |

graphty-element's test suite MUST run 2.x's own layer checker and `applyTemplate` over every version
1 example of this directory and require acceptance, so a drift from the version 1 freeze fails in
continuous integration.

## Worked example

A lab's expression overlay: red for genes up, blue for down, grey for not measured, significant genes
outlined. Applied to a new study whose table has the columns `logFC` and `padj`, both layers paint.
Applied to one that calls the adjusted p-value `FDR`, the outline layer is added switched off and the
report names `data.padj`; the caller applies it again with `columns: { "padj": "FDR" }`, or keeps the
colouring alone.

```json
{
    "kind": "graphty-document",
    "version": 1,
    "members": [
        {
            "kind": "graphty-style",
            "version": 1,
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
                            "palette": "red-blue",
                            "reverse": true,
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
