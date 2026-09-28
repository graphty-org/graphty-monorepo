# Style document

`kind: "graphty-style"`, version 1. Schema: [style.schema.json](style.schema.json) (normative for
structure). Conventions shared with every document kind -- encoding, versioning, unknown members,
identifiers, fingerprints, trust -- are in [README.md](README.md) and are not repeated here.

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
  layers: LayerSpec[];               // bottom first
  palettes?: PaletteDescriptor[];    // the non-built-in palettes the layers name
  extensions?: Record<string, unknown>;
}

interface LayerSpec {
  id?: string;                       // NEW, optional: stable identity across re-saves
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
redefined here, and a change to them is a change to this format.

### Layers and their order

1. `layers` is ordered bottom first. A layer higher in the list wins every channel it writes for
   every element its selector matches. Where two layers write the same channel on the same
   element, the higher one's value is the one drawn.
2. An element a layer's selector does not match is not touched by that layer. An encoding never
   paints an element that has no value at `by`: the layers beneath show through (the design
   studio's rule, `design/ui/framework/conceptual-model.md` 5.1), unless the binding says
   `missing: { value }`.
3. A layer is either a literal layer (`set`), an encoding (`encode`), or both; a layer with neither
   is valid and paints nothing.

### Selectors

| `match` | Members | Matches |
|---|---|---|
| `everything` | -- | every node, or every edge, of the layer's target |
| `has` | `path` | elements where the path resolves to a value |
| `expression` | `where` | elements where the JMESPath predicate is true |
| `ids` | `nodes`, `edges` | the listed elements |
| `top` | `path`, `n` | the top `n` elements by the value at `path`, cut only between groups of equal values |
| `member` | `of` (a scope) | the members of a scope, usually a kept set `{ set: id }` |

`match` is an open enumeration: later minor additions may add kinds.

Paths are JMESPath field paths over the expression root `{ data: {...}, results: { <runId>:
{...} } }`: `data.logFC` reads an imported attribute, `results.hubs.rank` reads the field `rank`
of the run whose id is `hubs`.

### Channels and values

The member names of `set` and `encode` are channel names, a closed list published by
graphty-element (`Channel`, `graphty-element/src/catalog/types.ts`). Units:

| Channel group | Value |
|---|---|
| colours (`node.color`, `node.outline`, `node.glow`, `edge.color`, `edge.arrowHeadColor`, `edge.arrowTailColor`) | a CSS colour string (hex RECOMMENDED: `#rrggbb` or `#rrggbbaa`) or `{ r, g, b, a }` with r, g, b in 0..255 and a in 0..1 |
| `node.size`, `edge.width`, `edge.arrowHeadSize`, `edge.arrowTailSize` | a non-negative number in scene units; 1 is the element's default node size |
| opacities | a number in 0..1 |
| `node.shape` | a node shape name from the element's catalogue (`NodeShapes` in `graphty-element/src/config/NodeStyle.ts`: `box`, `sphere`, `icosphere`, ...) |
| `edge.style` | a line pattern name (`EdgeLineTypes`: `solid`, `dot`, `dash`, ...) |
| `edge.arrowHead`, `edge.arrowTail` | an arrow name (`EdgeArrowTypes`: `normal`, `none`, `diamond`, ...) |
| `*.label`, `*.tooltip`, `*Text` | a string |
| `*Style` | a label style record (`LabelStyle`, `graphty-element/src/catalog/label-style.ts`) |
| `node.wireframe`, `node.flat`, `edge.curvature` | a boolean |
| `edge.patternCount` | a non-negative integer |
| `edge.animationSpeed`, `node.glowStrength` | a non-negative number |

`node.marker` is reserved for the element's note markers and MUST NOT be written by a document; a
layer that writes it is disabled with `E_PROTECTED`. `edge.tooltip` was withdrawn in 2.0 and is not
a channel.

The shape, line pattern and arrow vocabularies are the element's published enumerations; the
schema checks only that the value is a string, and the applier checks membership. Named text styles
are not part of version 1: label style records are inline (the design studio's door 67
recommendation).

### Bindings

A binding is either a literal `{ value }` or a mapping `{ by, scale?, palette?, ... }` from the
value at a path to a channel value. `scale` is an open enumeration whose built-in values are
`linear`, `log`, `neglog10`, `sqrt`, `pow`, `bins`, `quantile`, `ordinal` and `passthrough`; the
three kinds of Cytoscape mapping correspond as continuous (the numeric scales), discrete (`ordinal`
with `map`) and passthrough. The remaining members (`domain`, `clamp`, `range`, `map`, `other`,
`overflow`, `missing`, `reverse`, `midpoint`, `bins`, `exponent`) have the meaning their
declarations in `graphty-element/src/catalog/types.ts` give them.

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

1. A conforming writer MUST write `kind: "graphty-style"` and `version: 1`.
2. It MUST write only layers the caller could re-apply: element-owned layers are omitted, as
   `toDocument()` does today.
3. It MUST write the descriptor of every non-built-in palette a layer names, and MUST NOT write
   descriptors of built-in palettes.
4. It MUST NOT write a layer whose selector or bindings name a run id that was derived rather than
   author-assigned. Such an id resolves to a different run in another session
   (`graphty-element/src/session/runs/runId.ts`). The writer MUST either refuse with
   `E_UNSTABLE_RUN_ID`, naming the layers, or write the layer with the run's author-assigned id if
   it has one. graphty-element's `toDocument()` does not check this today; conformance requires it.
5. It MUST refuse a layer whose `userData` is not representable as JSON (a function, a cycle, a
   non-finite number), naming the layer. Today `userData` is copied by reference unchecked.
6. It SHOULD write `id` on every layer and keep it stable across re-saves.
7. It SHOULD write `fingerprint` when a graph is loaded.

## Reading and applying

1. The reader MUST treat a top-level object with `version: 1`, an array `layers` and no `kind` as a
   style document version 1.
2. A top-level structure that fails the schema (not an object, `layers` not an array, `version`
   missing) MUST refuse the document with `E_BAD_COMMAND`. A `version` other than 1 MUST refuse it
   with the unreadable-version error (README, "Versioning").
3. Validation is per layer. A layer that fails the schema, names an unknown channel
   (`E_UNKNOWN_CHANNEL`), an unknown selector kind (`E_BAD_SELECTOR`), an unknown scale
   (`E_UNKNOWN_SCALE`), a channel value outside its vocabulary (`E_BAD_LAYER`), or claims
   `source.by: "element"` (`E_PROTECTED`) MUST be added to the stack disabled, with that code and
   a reason, and reported. It MUST NOT be dropped, and MUST NOT refuse the rest of the document.
   graphty-element today refuses the whole document for one such layer; this specification
   changes that.
4. A layer that is valid but reads nothing the session answers -- a path under `data` no element
   has, a run id no run has, a set id no set has -- MUST be added disabled with the paths it needs
   (`unresolvedPaths`), as `applyTemplate()` does today with `unbound`. When that run will be
   produced by a recipe in the same envelope and the caller has not agreed to run it, the layer is
   reported in `needsRerun` with the recipe step's estimate.
5. A layer naming a palette that is neither registered nor carried is disabled with
   `E_UNKNOWN_PALETTE`. A carried palette whose id is not registered is registered by the applier
   and reported (recommendation; see README "Open decisions", carried palettes). A carried palette
   whose id is already registered MUST NOT replace the registered one; if the colours differ, the
   applier reports it.
6. Layers are added above the authored layers already present, in document order, each recording
   `source: { by: "template", templateId }` unless it names its own source. Replacing the whole
   stack is an explicit applier option.
7. The applier returns a binding report (README, "Applying a document to new data").
8. Applying a style document MUST NOT start a run, change column roles, change the drawing mode,
   move the camera, or fetch anything.

## Upgrading the 1.x style template

A 1.x style template (`{ graphtyTemplate: true, majorVersion: "1", metadata?, graph, layers, data,
behavior }`, `graphty-element/src/config/StyleTemplate.ts`) is not a version 1 style document, and
today its `layers` are accepted and ignored. The owner named this as a defect on 2026-09-21: "A 1.x
style template silently deletes every algorithm picture, with no warning."

A reader that accepts a 1.x template MUST upgrade it to an envelope (envelope.md) and MUST NOT
drop any part silently:

| 1.x member | Goes to |
|---|---|
| `layers` | the `style` member, each 1.x layer converted to a `LayerSpec` whose `set` holds the channel values its node or edge style set |
| `data.knownFields`, `data.directed` | the `dataPlan` member |
| `data.algorithms` | the `recipe` member, one `algo.run` step per entry |
| `graph.layout`, `graph.layoutOptions` | the `recipe` member, one `layout.set` step |
| `graph.viewMode`, `graph.startingCameraDistance` | the `view` member |
| `metadata` | the envelope's `name` and `description` |
| `graph.background`, the selection style, `behavior` | not representable in version 1: each is reported in the upgrade report with a stated reason |

A 1.x layer that cannot be converted is reported, not dropped.

## Security

A style document contains JMESPath predicates and paths. They are interpreted by graphty-element's
own evaluator, which reads only the expression root; nothing is passed to `eval`, `Function` or a
script element. A label or tooltip value is text and MUST be rendered as text, never as HTML. No
member names a URL; the 1.x node texture URL that nothing drew was removed and MUST NOT be
reintroduced as a fetched resource without its own trust rule.

## Conformance

A reader conforms when, for each case, it does what the right-hand column says:

| Input | Required result |
|---|---|
| `{ "version": 1, "layers": [] }` (2.x output, no `kind`) | accepted as a style document; report `bound: 0` |
| a document with `version: 2` | refused, naming version 2 and the versions read |
| a layer writing `"node.colour"` | that layer added disabled with `E_UNKNOWN_CHANNEL`; the other layers apply |
| a layer writing `node.marker` | disabled with `E_PROTECTED` |
| an unknown top-level member `"x-note": 1` | ignored; preserved if the document is re-saved without applying |
| a layer reading `data.logFC` on a graph with no `logFC` | added disabled, `unresolvedPaths` contains `data.logFC` |
| a layer naming palette `lab-reds`, carried, unregistered | palette registered and reported; layer binds |
| a layer naming palette `lab-reds`, neither carried nor registered | disabled with `E_UNKNOWN_PALETTE` |
| a carried descriptor under the id `viridis` | descriptor ignored and reported; the built-in palette is used |

A writer conforms when its output validates against the schema, carries `kind`, omits
element-owned layers, carries exactly the non-built-in palettes named, and refuses derived run ids.

## Worked examples

### A diverging expression overlay, applied to a new gene list

The genomics persona's colouring (`design/designloom/workflows/W20.yaml`): red for up, blue for
down, grey for not measured, significant genes outlined.

```json
{
  "kind": "graphty-style",
  "version": 1,
  "name": "Expression overlay (logFC)",
  "fingerprint": "g1:9f3a61c07b2e44d1",
  "layers": [
    {
      "id": "not-measured",
      "name": "Not measured",
      "target": "node",
      "kind": "base",
      "selector": { "match": "everything" },
      "set": { "node.color": "#bdbdbd" }
    },
    {
      "id": "logfc",
      "name": "Log fold change",
      "target": "node",
      "kind": "encoding",
      "selector": { "match": "has", "path": "data.logFC" },
      "encode": {
        "node.color": { "by": "data.logFC", "scale": "linear", "palette": "red-blue", "reverse": true, "domain": [-3, 3], "midpoint": 0 }
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

Applied to a new gene list that has `logFC` but names its adjusted p-value `FDR`, the report is
`bound: 2`, one disabled layer (`significant`) with `unresolvedPaths: ["data.padj"]`, and a
fingerprint result of `differs`. The first two layers paint; nothing is dropped.

### A style over a recipe's result

A hub-gene style that sizes nodes by the rank a recipe step publishes under the author-assigned
id `hubs` (`W23.yaml`, Hub Gene Identification and Ranking). Without the recipe the layer is
unbound; in an envelope with the recipe, it binds once the run completes.

```json
{
  "kind": "graphty-style",
  "version": 1,
  "name": "Hub genes",
  "layers": [
    {
      "id": "hub-size",
      "name": "Size by hub rank",
      "target": "node",
      "kind": "encoding",
      "selector": { "match": "has", "path": "results.hubs.value" },
      "encode": { "node.size": { "by": "results.hubs.value", "scale": "sqrt", "range": [1, 3] } },
      "source": { "by": "run", "runId": "hubs", "algorithm": "pagerank", "params": {} }
    },
    {
      "id": "top-ten",
      "name": "Top ten hubs",
      "target": "node",
      "kind": "highlight",
      "selector": { "match": "top", "path": "results.hubs.value", "n": 10 },
      "set": { "node.label": "hub" }
    }
  ]
}
```
