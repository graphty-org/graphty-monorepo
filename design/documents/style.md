# Style document

`kind: "graphty-style"`, version 1. Schema: [style.schema.json](style.schema.json) (normative for
what a writer produces). Conventions shared with every document kind -- encoding, limits, paths,
versioning, unknown members, identifiers, fingerprints, trust -- are in [README.md](README.md) and
are not repeated here.

## Purpose

A style document is a portable stack of style layers: how nodes and edges are drawn, stated as
rules over the data rather than as values on particular elements. Its purpose is the owner's:
"styles, where graph styles can be saved and loaded independently to apply an existing style to
new data" (2026-09-19). It serves the lab that reuses one diverging logFC colouring on every new
gene list (`design/designloom/workflows/W20.yaml`), the group that keeps one encoding across a
disease and a control network (`W24.yaml`), and the community that shares a starting look without
sharing data (the owner, 2026-09-27).

This is the one document graphty-element already publishes: `StyleDocument` in
`graphty-element/src/catalog/types.ts`, written by `session.styles.toDocument()` and read by
`session.styles.applyTemplate()` (`graphty-element/src/session/styles/StylesApi.ts`). Version 1
here is that shape plus optional members. Every document graphty-element 2.x has written is a
conforming version 1 style document.

**Version 1 is frozen to the values 2.x accepts** (README, "Versioning" rule 2): the channel names,
selector kinds, scales and layer kinds listed here. A released 2.x reader refuses the whole
document for one value it does not know, so a style using any newer one is written as version 2.
New optional members (`id`, `legend`, `requires`, `extensions`) are additive in version 1, because
2.x checks values and ignores member names it does not read.

The repository's rule for appearance applies to every applier: node and edge appearance is
applied only through style layers handed to graphty-element, never by writing to a mesh, a
material or a node object (root `CLAUDE.md`, "Graph Styling").

## Data model

```ts
interface StyleDocument {
  kind?: "graphty-style";            // REQUIRED for conforming writers; absent in 2.x output
  version: 1;
  name?: string;                     // what a person calls this look
  description?: string;
  fingerprint?: string;              // the graph it was authored against; advisory
  generator?: { name: string; version: string };
  // shared metadata (README): authors, license, citation, doi, derivedFrom, handling
  requires?: { attributes?: AttributeSlot[] };   // NEW, optional: recipe.md "Attribute slots"
  layers: LayerSpec[];               // bottom first
  palettes?: PaletteDescriptor[];    // the non-built-in palettes the layers name
  extensions?: Record<string, unknown>;
}

interface LayerSpec {
  id?: string;                       // NEW, optional: an authored key, stable across re-saves
  name: string;
  target?: "node" | "edge";          // default: inferred from the channels written
  kind?: "base" | "encoding" | "highlight" | "custom";   // default "custom"
  selector: Selector;
  set?: StaticStyle;                 // literal channel values
  encode?: Encoding;                 // data-driven channel values
  source?: LayerSource;              // who made it; default { by: "template" }
  enabled?: boolean;                 // default true
  userData?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}
```

`Selector`, `Encoding`, `Binding`, `StaticStyle`, `LayerSource` and `PaletteDescriptor` are the
published types of `graphty-element/src/catalog/types.ts`; the schema restates them. They are not
redefined here, and a change to them is a change to this format. The one addition to `Binding` is
the optional `legend` member (below).

A layer's `id` is an authored key, not the element's `LayerId`: `applyTemplate` mints a `LayerId`
for every imported layer from its name, and `LayerId` stays element-minted. The element stores the
authored `id` on the layer, exposes it through the styles API, writes it back in `toDocument()`, and
binds note targets to it (open decision 29).

### Layers and their order

1. `layers` is ordered bottom first. A layer higher in the list wins every channel it writes for
   every element its selector matches. Where two layers write the same channel on the same
   element, the higher one's value is the one drawn.
2. An element a layer's selector does not match is not touched by that layer. An encoding never
   paints an element that has no value at `by`: the layers beneath show through (the design
   studio's rule, `design/ui/framework/conceptual-model.md` 5.1: a missing value is not painted),
   unless the binding says `missing: { value }`.
3. A layer is either a literal layer (`set`), an encoding (`encode`), or both; a layer with neither
   is valid and paints nothing.

### Selectors

| `match` | Members | Matches |
|---|---|---|
| `everything` | -- | every node, or every edge, of the layer's target |
| `has` | `path` | elements where the path resolves to a value |
| `expression` | `where` | elements where the JMESPath predicate is true |
| `ids` | `nodes`, `edges` | the listed elements: node ids, and edges as stable `EdgeMember` references |
| `top` | `path`, `n` | the top `n` elements by the value at `path`; ties at the cut are all included, so more than `n` may match, and the binding report states the actual count as a notice |
| `member` | `of` (a scope) | the members of a scope, usually a kept set `{ set: id }` |

`match` is an open enumeration, frozen for version 1 (see "Purpose").

Paths are field paths (README, "Paths") over the expression root `{ data: {...}, results: {
<runId>: {...} } }`: `data.logFC` reads an imported attribute, `results.hubs.rank` reads the field
`rank` of the run whose id is `hubs`, and `data."adj.P.Val"` reads an attribute whose name holds
dots.

`ids.edges` holds graphty-element's stable `EdgeMember` references (`source`, `target` and exactly
one of `id` or `ordinal` with `among`), never session edge ids. A session `EdgeId` is a counter
that restarts every session (`graphty-element/src/data/edgeIdentity.ts`), so an edge highlighted by
it in a saved file would paint a different edge next time with no error. A member that does not
resolve on the current graph leaves the layer disabled, naming it.

A selector naming a kept set that the session does not hold (`{ match: "member", of: { set: id } }`)
leaves the layer disabled with `E_UNKNOWN_SET`.

### Channels and values

The member names of `set` and `encode` are channel names, a list published by graphty-element
(`Channel`, `graphty-element/src/catalog/types.ts`). Units:

| Channel group | Value |
|---|---|
| colours (`node.color`, `node.outline`, `node.glow`, `edge.color`, `edge.arrowHeadColor`, `edge.arrowTailColor`) | a CSS colour string (hex RECOMMENDED: `#rrggbb` or `#rrggbbaa`) or `{ r, g, b, a }` with r, g, b in 0..255 and a in 0..1 |
| `node.size`, `edge.width`, `edge.arrowHeadSize`, `edge.arrowTailSize` | a non-negative number in scene units; 1 is the element's default node size |
| opacities | a number in 0..1 |
| `node.shape` | a node shape name from the element's catalogue (`NodeShapes` in `graphty-element/src/config/NodeStyle.ts`: `box`, `sphere`, `icosphere`, ...) |
| `edge.style` | a line pattern name (`EdgeLineTypes`: `solid`, `dot`, `dash`, ...) |
| `edge.arrowHead`, `edge.arrowTail` | an arrow name (`EdgeArrowTypes`: `normal`, `none`, `diamond`, ...) |
| `*.label`, `*.tooltip`, `*Text` | a string |
| `*Style` | a label style record (`LabelStyle`, `graphty-element/src/catalog/label-style.ts`); the applier clamps `sizePx` to 512, `padding`, `borderWidth` and `shadowBlur` to 64 |
| `node.wireframe`, `node.flat`, `edge.curvature` | a boolean |
| `edge.patternCount` | a non-negative integer |
| `edge.animationSpeed`, `node.glowStrength` | a non-negative number |

`node.marker` draws nothing and is reserved for the element's note markers; a layer that writes it
is disabled with `E_UNSUPPORTED`, the code graphty-element answers today ("the layer is not
malformed: it asked for a channel that draws nothing", `session/styles/encoding.ts`).
`edge.tooltip` was withdrawn in 2.0 and is not a channel.

The shape, line pattern and arrow vocabularies are the element's published enumerations; the
schema checks only that the value is a string, and the applier checks membership. Named text styles
are not part of version 1: label style records are inline (the design studio's door 67
recommendation: text styles are written inline on each layer, not referenced by name).

### Bindings

A binding is either a literal `{ value }` or a mapping `{ by, scale?, palette?, ... }` from the
value at a path to a channel value. `scale` is an open enumeration, frozen for version 1, whose
built-in values are `linear`, `log`, `neglog10`, `sqrt`, `pow`, `bins`, `quantile`, `ordinal` and
`passthrough`; the three kinds of Cytoscape mapping correspond as continuous (the numeric scales),
discrete (`ordinal` with `map`) and passthrough (export-mapping.md, "Importing Cytoscape styles").

The numeric members mean the following; this is normative, and matches
`graphty-element/src/session/styles/scales.ts`:

1. **`domain`** `[low, high]` (or `"auto"`, the extent of the values present) is the input interval.
   A value is first transformed by the scale (`log`, `sqrt`, `pow` with `exponent`, identity for
   `linear`), and so are the domain ends; then it is placed at a position from 0 to 1.
2. **Out of domain.** A value below `low` is placed at 0 and one above `high` at 1: out-of-domain
   values take the end colour or size, they are not dropped. A degenerate domain (`low == high`)
   places every value at 0.
3. **`midpoint`** splits the scale in two halves: values from `low` to `midpoint` fill positions 0
   to 0.5, values from `midpoint` to `high` fill 0.5 to 1, each half linear (after the transform).
   So a skewed domain keeps its midpoint at the centre of the palette. Example: `domain: [-1.4,
   4.8]`, `midpoint: 0`, value `-0.7` is at position `0.5 * (-0.7 - -1.4) / (0 - -1.4) = 0.25`;
   value `2.4` is at `0.5 + 0.5 * 2.4 / 4.8 = 0.75`. A `midpoint` equal to either end is ignored.
4. **`clamp`** `[p, q]` is a pair of percentiles (0 to 100) of the values present; the domain is
   narrowed to the values at those percentiles before placing, so a few outliers do not flatten the
   ramp, and the number of values pushed to an end is reported. An explicit `domain` is used as
   written.
5. **`range`** `[a, b]` maps position 0 to `a` and 1 to `b` for a numeric channel; a colour channel
   reads its palette instead. `reverse: true` swaps the ends.
6. **`missing`** decides an element with no value at `by`: `"skip"` (the default) paints nothing
   and the layers beneath show through; `{ value }` paints that value.
7. **`legend`** (NEW, optional) `{ title?, units?, missingLabel?, hidden? }` says what a legend
   built from this binding states: `title` ("log2 fold change, tumour vs normal"), `units`, the
   label for the `missing` value ("not measured"), and `hidden: true` for a binding that should not
   appear in a legend. It never changes what is painted.

The remaining members (`map`, `other`, `overflow`, `bins`, `exponent`) have the meaning their
declarations in `graphty-element/src/catalog/types.ts` give them.

### Attribute slots

A style MAY declare `requires.attributes`, the same slots a recipe declares (recipe.md, "Attribute
slots"), so a style shared "to apply to new data" can bind to differently named columns without a
recipe: `applyTemplate(doc, { bindings })` takes explicit bindings, and otherwise name, case and
hint matching apply as for a recipe. Every `data.<name>` path naming a bound slot is rewritten
(parsed, not textual). A style without slots binds by exact path, as today.

### Layer sources

`source` records who made a layer. `{ by: "run", runId, algorithm, params }` marks a layer that
paints a run's result; `{ by: "template", templateId }` a layer that came from a document;
`{ by: "user" }` and `{ by: "plugin", name }` the others. `{ by: "element" }` is the element's own
locked layers (selection, hover, notes) and MUST NOT appear in a document.

### Palettes

`palettes` carries the descriptor of every palette a layer names that graphty-element does not
itself ship, so the document is self-describing. Built-in palette ids are reserved: a document
MUST NOT carry a descriptor under a built-in id, because "a document that painted with viridis
yesterday must paint with viridis today" (`design/graphty-element/extension-points.md`).

## Writing

1. A conforming writer MUST write `kind: "graphty-style"` and the lowest `version` that expresses
   the content (README, "Versioning" rule 5).
2. It MUST write only layers the caller could re-apply: element-owned layers are omitted, as
   `toDocument()` does today.
3. It MUST write the descriptor of every non-built-in palette a layer names, and MUST NOT write
   descriptors of built-in palettes.
4. It MUST NOT write a layer whose selector or bindings name a run id that was derived rather than
   author-assigned. Such an id resolves to a different run in another session
   (`graphty-element/src/session/runs/runId.ts`). The writer MUST either refuse with
   `E_UNSTABLE_RUN_ID`, naming the layers, or write the layer with the run's author-assigned id if
   it has one. graphty-element's `toDocument()` does not check this today; conformance requires it.
5. It MUST write `ids.edges` as `EdgeMember` references, converting session edge ids the way sets
   already do (`stableEdgeMember`, `graphty-element/src/data/edgeIdentity.ts`), or refuse the
   layer. `toDocument()` copies selectors verbatim today, so session edge counters reach files;
   conformance requires the conversion.
6. It MUST refuse a layer whose `userData` is not representable as JSON (a function, a cycle, a
   non-finite number, nesting beyond the README limit), naming the layer. Today `userData` is
   copied by reference unchecked.
7. It MUST write back the unknown members and extensions each layer arrived with (README,
   "Unknown members" rule 2), and SHOULD write `id` on every layer and keep it stable across
   re-saves.
8. Inside an envelope saved from a session that applied a recipe, run paths are written with the
   recipe's own `as` (recipe.md, "Saving an applied recipe"); in a standalone style they are the
   session's run ids.
9. It MUST NOT write `fingerprint` until a scheme is approved (README).

## Reading and applying

1. A top-level object with `version: 1`, an array `layers` and no `kind` is a style document
   version 1 (README, "Encoding" rule 2).
2. A top-level structure that fails the schema (not an object, `layers` not an array, `version`
   missing) MUST refuse the document with `E_BAD_COMMAND`. A `version` other than 1 MUST refuse it
   with `E_UNSUPPORTED_VERSION` (README, "Versioning").
3. Validation is per unit. A channel entry of `set` or `encode` naming an unknown channel is
   dropped from that layer and reported (`E_UNKNOWN_CHANNEL`); the layer's other channels apply. A
   layer that otherwise fails -- an unknown selector kind (`E_BAD_SELECTOR`), an unknown scale
   (`E_UNKNOWN_SCALE`), a channel value outside its vocabulary (`E_BAD_LAYER`), an expression over
   the README limits (`E_BAD_SELECTOR`), `source.by: "element"` (`E_PROTECTED`), or any exception
   while it is checked -- MUST be added to the stack disabled, with that code and a reason, and
   reported. It MUST NOT be dropped, and MUST NOT refuse the rest of the document. graphty-element
   today refuses the whole document for one such layer; this specification changes that.
4. A layer that is valid but reads nothing the session answers -- a path under `data` no element
   has, a run id no run has, a set id no set has -- MUST be added disabled with the paths it needs
   (`unresolvedPaths`), as `applyTemplate()` does today with `unbound`. When that run will be
   produced by a recipe in the same envelope and the caller has not agreed to run it, the layer is
   reported in `needsRerun` with the recipe step's estimate.
5. A layer naming a palette that is neither registered nor carried is disabled with
   `E_UNKNOWN_PALETTE`. A carried palette whose id is not registered is registered for this
   session only and reported (open decision 15); it is never placed in the page-global registry. A
   carried palette whose id is already registered MUST NOT replace the registered one; if the
   colours differ, the applier reports it. A carried descriptor under a built-in id is ignored and
   reported.
6. Layers are added above every layer already present, in document order, as `applyTemplate` does
   today (`stack: [...stack, ...final]`). Replacing the whole stack is an explicit applier option.
7. **Imported layers are stamped.** Every layer added from a document records `importedFrom:
   { templateId, digest }` (the document's RFC 8785 SHA-256), kept by the session and written back
   in the layer's `extensions` under `graphty.importedFrom`. A document's claim of `source.by:
   "user"` or `"plugin"` is replaced by `{ by: "template", templateId }`; `source.by: "run"` is kept
   only when its `runId` binds to a run in this session, and is otherwise replaced the same way. A
   document cannot make its layers look like the reader's own.
8. The binding report lists as notices every imported layer that sets `node.opacity` or
   `edge.opacity` to 0 or a size to 0, and every one with an `ids` selector, so a layer that hides
   or singles out particular elements is seen.
9. The applier returns a binding report (README, "Applying a document to new data").
10. Applying a style document MUST NOT start a run, change column roles, change the drawing mode,
    move the camera, or fetch anything.

## Upgrading the 1.x style template

A 1.x style template (`{ graphtyTemplate: true, majorVersion: "1", metadata?, graph, layers, data,
behavior }`, `graphty-element/src/config/StyleTemplate.ts`) is not a version 1 style document, and
today its `layers` are accepted and ignored. The owner named this as a defect on 2026-09-21: "A 1.x
style template silently deletes every algorithm picture, with no warning."

A reader that accepts a 1.x template MUST upgrade it to an envelope (envelope.md) and MUST NOT
drop any part silently. The rules restate the migration register's `template-split` codemod
(`design/element-api/element-api-migration.md`), so an on-read upgrade and an offline conversion
give the same result:

| 1.x member | Goes to |
|---|---|
| `layers` | the `style` member. Each 1.x layer becomes a `LayerSpec` whose `set` holds the channel values its node or edge style set. A 1.x layer with both a node and an edge style is split into two layers. A selector `""` becomes `{ match: "everything" }`; any other 1.x selector string becomes `{ match: "expression", where }`. A 1.x path `algorithmResults.<ns>.<type>.<field>` is rewritten to `results.<as>.<field>`, with the `as` minted below and the field renamed to its 2.0 name (for example `community` to `group`) |
| a layer's `calculatedStyle` | not convertible: reported with its expression for a person to rewrite as an encoding; the rest of the layer is converted |
| `data.knownFields`, `data.directed` | the `dataPlan` member |
| `graph.layoutOptions.weightProperty`, `weightPath` | the data plan's `knownFields.edgeWeightPath`, removed from the layout step (a layout option of that name is refused by 2.x) |
| `data.algorithms` | the `recipe` member, one `algo.run` step per entry. A bare string entry becomes `{ algorithm }`. The key is translated through the element's legacy-key table (`algorithmByLegacyKey`): `graphty:scc` becomes `components` with `{ strength: "strong" }`, `graphty:dijkstra` becomes `shortest-path`. `as` is minted from the current key (the key, then `-2`, `-3`). The recipe never runs without the caller's instruction (recipe.md, "Consent") |
| `graph.layout`, `graph.layoutOptions` (other options) | the `recipe` member, one `layout.set` step |
| `graph.viewMode` | the `view` member, a view with that `mode` and a `fitToGraph` framing |
| `graph.startingCameraDistance`, `graph.twoD` | not representable (a bare distance is not a view): reported with their values |
| `metadata` | the envelope's `name` and `description` |
| `graph.background`, the selection style, `behavior` | not representable in version 1: each is reported with a stated reason |

A 1.x layer that cannot be converted is reported, not dropped. Conformance rows use real 1.x
fixtures from graphty-element's test suite.

## Security

A style document contains JMESPath predicates and paths, bounded by README's expression limits.
They are interpreted by graphty-element's own evaluator, which reads only the expression root;
nothing is passed to `eval`, `Function` or a script element. A label or tooltip value is text and
MUST be rendered as text, never as HTML. No member names a URL; the 1.x node texture URL that
nothing drew was removed and MUST NOT be reintroduced as a fetched resource without its own trust
rule.

## Conformance

A reader conforms when, for each case, it does what the right-hand column says:

| Input | Required result |
|---|---|
| `{ "version": 1, "layers": [] }` (2.x output, no `kind`) | accepted as a style document; report `bound: 0` |
| a document with `version: 2` | refused with `E_UNSUPPORTED_VERSION`, naming version 2 and the versions read |
| a layer writing `"node.colour": "#f00"` and `"node.size": 2` | `node.colour` dropped with `E_UNKNOWN_CHANNEL`; the layer applies its size |
| a layer writing `node.marker` | that channel refused with `E_UNSUPPORTED` |
| a layer whose `where` is 20,000 characters | disabled with `E_BAD_SELECTOR`; the other layers apply |
| an unknown top-level member `"x-note": 1` | ignored, reported `W_UNKNOWN_MEMBER`, written back on save |
| a layer reading `data.logFC` on a graph with no `logFC` | added disabled, `unresolvedPaths` contains `data.logFC` |
| a layer ``{ match: "expression", where: "data.adj.P.Val < `0.05`" }`` on a graph with attribute `adj.P.Val` | matches nothing; `data."adj.P.Val"` is the path that reads it |
| a layer naming palette `lab-reds`, carried, unregistered | palette registered for this session and reported; layer binds |
| a layer naming palette `lab-reds`, neither carried nor registered | disabled with `E_UNKNOWN_PALETTE` |
| a carried descriptor under the id `viridis` | descriptor ignored and reported; the built-in palette is used |
| `ids.edges: ["17"]` (a session edge id) | fails the schema; the layer is disabled |
| a layer with `source: { by: "user" }` from a document | stored as `{ by: "template", templateId }` with `importedFrom` |
| a `top` selector with `n: 10` and a tie at rank 10 | 12 elements painted; the report's notice says 12 matched |
| `encode: { "node.color": { "by": "data.x", "domain": [-1.4, 4.8], "midpoint": 0 } }`, value -0.7 | palette position 0.25 |
| a style with a slot `padj` (name `padj`, hint `FDR`) applied to data with `FDR` | bound by hint; `data.padj` rewritten to `data.FDR` |

A writer conforms when its output validates against the schema, carries `kind`, omits
element-owned layers, carries exactly the non-built-in palettes named, writes stable edge
references, and refuses derived run ids.

## Worked examples

### A diverging expression overlay, applied to a new gene list

The genomics persona's colouring (`design/designloom/workflows/W20.yaml`): red for up, blue for
down, grey for not measured, significant genes outlined. "Not measured" is the binding's `missing`
value, so a legend can say so.

```json
{
  "kind": "graphty-style",
  "version": 1,
  "name": "Expression overlay (logFC)",
  "requires": {
    "attributes": [
      { "slot": "lfc", "element": "node", "name": "logFC", "nameHints": ["log2FoldChange"], "level": "quantitative" },
      { "slot": "padj", "element": "node", "name": "padj", "nameHints": ["FDR", "adj.P.Val"], "level": "quantitative" }
    ]
  },
  "layers": [
    {
      "id": "logfc",
      "name": "Log fold change",
      "target": "node",
      "kind": "encoding",
      "selector": { "match": "everything" },
      "encode": {
        "node.color": { "by": "data.logFC", "scale": "linear", "palette": "red-blue", "reverse": true,
                        "domain": [-3, 3], "midpoint": 0, "missing": { "value": "#bdbdbd" },
                        "legend": { "title": "log2 fold change, tumour vs normal", "missingLabel": "not measured" } }
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
```

Applied to an edgeR table that names the columns `logFC` and `FDR`, the `lfc` slot binds by name,
the `padj` slot binds by its first hint, `data.padj` is rewritten to `data.FDR`, and both layers
bind. Applied to a table with no adjusted p-value column at all, the `significant` layer is added
disabled with `unresolvedPaths: ["data.padj"]`; the colouring still paints.

### A style over a recipe's result

A hub-gene style that sizes nodes by the score a recipe step publishes under the author-assigned id
`hubs` and labels the top ten with their gene symbols (`W23.yaml`, Hub Gene Identification and
Ranking). Without the recipe the layers are unbound; in an envelope with the recipe, they bind once
the run completes.

```json
{
  "kind": "graphty-style",
  "version": 1,
  "name": "Hub genes",
  "layers": [
    {
      "id": "hub-size",
      "name": "Size by hub score",
      "target": "node",
      "kind": "encoding",
      "selector": { "match": "has", "path": "results.hubs.value" },
      "encode": { "node.size": { "by": "results.hubs.value", "scale": "sqrt", "range": [1, 3] } },
      "source": { "by": "run", "runId": "hubs", "algorithm": "pagerank", "params": {} }
    },
    {
      "id": "top-ten",
      "name": "Top ten hubs, labelled",
      "target": "node",
      "kind": "highlight",
      "selector": { "match": "top", "path": "results.hubs.value", "n": 10 },
      "encode": { "node.label": { "by": "data.name", "scale": "passthrough" } }
    }
  ]
}
```
