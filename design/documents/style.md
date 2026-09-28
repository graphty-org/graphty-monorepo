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

**Version 1 is frozen to what 2.x accepts** (README, "Versioning" rule 2): the channel names,
selector kinds, scales and layer kinds listed here, the value lists of the enumerated channels
(node shapes, line patterns, arrows), and every rule 2.x's `checkLayerSpec`, `compileSelector` and
`checkDocument` enforce. A released 2.x reader refuses the whole document for one value it does
not accept, so a style using anything newer is written as version 2. The rules, with the code 2.x
reports for each:

| 2.x refuses                                                                                                       | Code                                                                    |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| an unknown channel, selector kind, scale or layer kind                                                            | `E_UNKNOWN_CHANNEL`, `E_BAD_SELECTOR`, `E_UNKNOWN_SCALE`, `E_BAD_LAYER` |
| a value outside an enumerated channel's list, or a number outside a channel's range (`edge.patternCount` below 2) | `E_OPTION_RANGE`                                                        |
| a value of the wrong type for its channel (a string where a number is taken)                                      | `E_BAD_LAYER`                                                           |
| a layer with neither `set` nor `encode`                                                                           | `E_BAD_LAYER`                                                           |
| one channel written in both `set` and `encode` of one layer                                                       | `E_BAD_LAYER`                                                           |
| a layer with no `target` writing both node and edge channels                                                      | `E_BAD_LAYER`                                                           |
| a binding with both an explicit `domain` and `clamp`                                                              | `E_BAD_LAYER`                                                           |
| an empty `where` or `has` path                                                                                    | `E_SELECTOR_EMPTY`                                                      |
| a quoted path segment holding a dot                                                                               | `E_BAD_SELECTOR`                                                        |
| an `everything` selector whose layer encodes from a `results.` path                                               | `E_UNSCOPED_RUN_ENCODING`                                               |
| `source.by: "element"`                                                                                            | `E_PROTECTED`                                                           |
| a carried palette whose id nobody registered                                                                      | `E_UNKNOWN_PALETTE`, for the whole document                             |

So a version 1 style that carries its own palettes is refused by 2.x until the receiver registers
them; a newer reader registers them for the session (below). The schema expresses what it can of
these rules (the enumerations, the empty path, `domain` with `clamp`); the rest are checked by the
published validator. New optional members (`id`, `legend`, `requires`,
`extensions`, the shared metadata) are additive in version 1, because 2.x checks values and ignores
member names it does not read -- with two consequences. 2.x also ignores `features`, so an addition
that changes what is painted cannot be a version 1 member at all. And 2.x, as a writer, drops every
member it does not copy: a version 1 style applied and re-saved by 2.x loses `kind`, layer `id`s,
`extensions` (including the import stamp), `requires` and the licence, attribution and handling
metadata, silently. A graphty-element 2.x patch release whose `toDocument()` writes back the members
a document arrived with is RECOMMENDED; until one exists, a later writer SHOULD warn when it saves a
style carrying slots, provenance or handling members that a 2.x reader re-saving it would discard.

The repository's rule for appearance applies to every applier: node and edge appearance is
applied only through style layers handed to graphty-element, never by writing to a mesh, a
material or a node object (root `CLAUDE.md`, "Graph Styling").

## Data model

```ts
interface StyleDocument {
    kind?: "graphty-style"; // REQUIRED for conforming writers; absent in 2.x output
    version: 1;
    name?: string; // what a person calls this look
    description?: string;
    fingerprint?: string; // the graph it was authored against; advisory
    generator?: { name: string; version: string };
    // shared metadata (README): authors, license, citation, doi, derivedFrom, handling
    requires?: { attributes?: AttributeSlot[] }; // NEW, optional: recipe.md "Attribute slots"
    layers: LayerSpec[]; // bottom first
    palettes?: PaletteDescriptor[]; // the non-built-in palettes the layers name
    extensions?: Record<string, unknown>;
}

interface LayerSpec {
    id?: string; // NEW, optional: an authored key, stable across re-saves
    name: string;
    target?: "node" | "edge"; // default: inferred from the channels written
    kind?: "base" | "encoding" | "highlight" | "custom"; // default "custom"
    selector: Selector;
    set?: StaticStyle; // literal channel values
    encode?: Encoding; // data-driven channel values
    source?: LayerSource; // who made it; 2.x reads a missing one as { by: "user" }
    enabled?: boolean; // default true
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
3. A layer is either a literal layer (`set`), an encoding (`encode`), or both. A layer with neither
   is a writer error: 2.x refuses it ("A layer with neither a set nor an encode writes no channel",
   `graphty-element/src/session/styles/Layer.ts`), so a writer MUST NOT write one, and a reader adds
   it disabled with `E_BAD_LAYER`.

### Selectors

| `match`      | Members          | Matches                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `everything` | --               | every node, or every edge, of the layer's target                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `has`        | `path`           | elements where the path resolves to a value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `expression` | `where`          | elements where the JMESPath predicate is true                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `ids`        | `nodes`, `edges` | the listed elements: node ids, and (see below) edge ids                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `top`        | `path`, `n`      | the top `n` elements by the value at `path`, which MUST be `results.<run>.<field>`; `n` is a whole number, 0 allowed. "Top" is always the **highest values first**, for every field (`rankEntries`, `graphty-element/src/session/results/statistics.ts`): a `top` over a score is the best-scored, and a `top` over a `rank` field, where 1 is best, is the worst-ranked, so a writer names the score, not the rank. A group of elements sharing a value is taken whole or not at all, and only when the whole group fits inside `n`, so the top never holds more than `n` and can hold fewer; the binding report states the count and the elements left out (graphty-element's `TopRanking` tie policy, `graphty-element/src/session/results/types.ts`). A `top` over a `data.` path, a `ties: "include"` option and an `order: "asc"` are style version 2 additions |
| `member`     | `of` (a scope)   | the members of a scope, usually a kept set `{ set: id }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

`match` is an open enumeration, frozen for version 1 (see "Purpose").

Paths follow README "Paths" over the expression root `{ data: {...}, results: { <runId>: {...} }
}`: `data.logFC` reads an imported attribute, `results.hubs.rank` reads the field `rank` of the run
whose id is `hubs`, and `data.adj.P.Val` reads the attribute whose key is `adj.P.Val` (keys are
flat; nothing is walked).

**Edges in an `ids` selector.** In version 1, `ids.edges` holds what 2.x accepts: strings or
numbers, which are session `EdgeId`s -- a counter that restarts every session
(`graphty-element/src/data/edgeIdentity.ts`). A layer has one target, and an `ids` selector reads
only that target's list (`compileSelector`, `graphty-element/src/session/styles/selector.ts`). So on
a node layer, `ids.edges` is ignored and reported with a warning; on an edge layer, an edge
highlighted by a session id in a saved file would paint a different edge next time with no error,
so a version 1 reader MUST add that layer disabled with `E_UNSTABLE_EDGE_ID` and report it. Stable edge
references -- graphty-element's `EdgeMember` (`source`, `target`, and exactly one of `id` or
`ordinal` with `among`) -- in `ids.edges` are a **style version 2** value, because 2.x refuses a
non-string entry and with it the whole document. An `EdgeMember` that does not resolve on the
current graph leaves its layer disabled, naming it.

A selector naming a kept set that the session does not hold (`{ match: "member", of: { set: id } }`)
leaves the layer disabled with `E_UNKNOWN_SET`.

### Channels and values

The member names of `set` and `encode` are channel names, a list published by graphty-element
(`Channel`, `graphty-element/src/catalog/types.ts`). Units:

| Channel group                                                                                                   | Value                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| colours (`node.color`, `node.outline`, `node.glow`, `edge.color`, `edge.arrowHeadColor`, `edge.arrowTailColor`) | a CSS colour string (hex RECOMMENDED: `#rrggbb` or `#rrggbbaa`) or `{ r, g, b, a }` with r, g, b in 0..255 and a in 0..1                                               |
| `node.size`, `edge.width`, `edge.arrowHeadSize`, `edge.arrowTailSize`                                           | a non-negative number in scene units; 1 is the element's default node size                                                                                             |
| opacities                                                                                                       | a number in 0..1                                                                                                                                                       |
| `node.shape`                                                                                                    | a node shape name from the element's catalogue (`NodeShapes` in `graphty-element/src/config/NodeStyle.ts`: `box`, `sphere`, `icosphere`, ...)                          |
| `edge.style`                                                                                                    | a line pattern name (`EdgeLineTypes`: `solid`, `dot`, `dash`, ...)                                                                                                     |
| `edge.arrowHead`, `edge.arrowTail`                                                                              | an arrow name (`EdgeArrowTypes`: `normal`, `none`, `diamond`, ...)                                                                                                     |
| `*.label`, `*.tooltip`, `*Text`                                                                                 | a string                                                                                                                                                               |
| `*Style`                                                                                                        | a label style record (`LabelStyle`, `graphty-element/src/catalog/label-style.ts`); the applier clamps `sizePx` to 512, `padding`, `borderWidth` and `shadowBlur` to 64 |
| `node.wireframe`, `node.flat`, `edge.curvature`                                                                 | a boolean                                                                                                                                                              |
| `edge.patternCount`                                                                                             | an integer, at least 2 (the element's descriptor minimum)                                                                                                              |
| `edge.animationSpeed`, `node.glowStrength`                                                                      | a non-negative number                                                                                                                                                  |

`node.marker` draws nothing and is reserved for the element's note markers; a layer that writes it
is disabled with `E_UNSUPPORTED`, the code graphty-element answers today ("the layer is not
malformed: it asked for a channel that draws nothing", `session/styles/encoding.ts`).
`edge.tooltip` was withdrawn in 2.0 and is not a channel.

The shape, line pattern and arrow vocabularies are the element's published enumerations; the
schema checks only that the value is a string, and the applier checks membership. Likewise the
applier MUST parse every colour string into RGBA on apply; a string that does not parse disables
that layer with `E_BAD_LAYER`. The session and every export hold the parsed value, and an export
writes only its normalised `#rrggbbaa` form, never the authored string, so a colour cannot carry
text into a format another tool interprets (export-mapping.md). Named text styles
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
   ramp, and the number of values pushed to an end is reported. `clamp` and an explicit `domain`
   MUST NOT both be given: both set the extent, and 2.x refuses the pair (`settleDomain`,
   `graphty-element/src/session/styles/encoding.ts`).
5. **`range`** `[a, b]` maps position 0 to `a` and 1 to `b` for a numeric channel; a colour channel
   reads its palette instead. `reverse: true` swaps the ends.
6. **`missing`** decides an element with no value at `by`: `"skip"` (the default) paints nothing
   and the layers beneath show through; `{ value }` paints that value.
7. **`legend`** (NEW, optional) `{ title?, units?, missingLabel?, labels?, hidden? }` says what a
   legend built from this binding states: `title` ("log2 fold change, tumour vs normal"), `units`,
   the label for the `missing` value ("not measured"), `labels`, a map from a category value
   (written as text) to its display text (`{ "2": "ribosome biogenesis" }`, so a cluster legend
   names functions, not numbers), and `hidden: true` for a binding that should not appear in a
   legend. It never changes what is painted, which is why it is additive in version 1. A figure
   export MAY also take a group note's first line as the label of that group's key when the
   binding has no label for it (export-mapping.md, "Images").

The remaining members (`map`, `other`, `overflow`, `bins`, `exponent`) have the meaning their
declarations in `graphty-element/src/catalog/types.ts` give them.

### Attribute slots

A style MAY declare `requires.attributes`, the same slots a recipe declares (recipe.md, "Attribute
slots"), so a style shared "to apply to new data" can bind to differently named columns without a
recipe: `applyTemplate(doc, { bindings })` takes explicit bindings, and otherwise name, case and
hint matching apply as for a recipe. Every `data.<name>` path naming a bound slot is rewritten
(parsed, not textual). A style without slots binds by exact path, as today. A style saved from a
session is written with the slot names it was authored with and its `requires` block, never with
the names the slots bound to on this data, as a recipe keeps its own `as`.

Slots are a version 1 member that graphty-element 2.x ignores: on 2.x, a slotted layer whose
`data.<name>` path does not exist on the data is added disabled and reported as unbound, and never
paints anything different. That degradation is why slots are a named exception to README
"Versioning" rule 2 rather than a style version 2 feature. A writer MUST warn when it saves a
slotted style as version 1, because a 2.x reader will not bind it by hint and a 2.x re-save drops
the slots.

### Layer sources

`source` records who made a layer. `{ by: "run", runId, algorithm, params }` marks a layer that
paints a run's result; `{ by: "template", templateId }` a layer that came from a document;
`{ by: "user" }` and `{ by: "plugin", name }` the others. `{ by: "element" }` is the element's own
locked layers (selection, hover, notes) and MUST NOT appear in a document. graphty-element 2.x
reads a layer with no `source` as `{ by: "user" }` (`sourceOf`, `Layer.ts`) and stamps `{ by:
"template", templateId }` only when the caller passes `templateId`; a conforming reader instead
stamps every imported layer (rule 7 below), which is an element change. `templateId` is the
caller's `templateId` option when given, and otherwise the document's RFC 8785 SHA-256 digest, so
two builds stamp the same document the same way.

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
4. It MUST NOT write a derived run id. A derived id resolves to a different run in another session
   (`graphty-element/src/session/runs/runId.ts`), so before writing a layer whose selector, bindings
   or source name one, the writer gives that run an author-assigned alias and writes the alias
   (README, "Identifiers" rule 2). graphty-element's `toDocument()` does not do this today;
   conformance requires it.
5. It MUST NOT write session edge ids. A layer whose `ids.edges` holds edges is written with
   `EdgeMember` references, converted the way sets already do (`stableEdgeMember`,
   `graphty-element/src/data/edgeIdentity.ts`), which makes the document style version 2 (rule 1).
   `toDocument()` copies selectors verbatim today, so session edge counters reach files;
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
10. It MUST NOT write a layer with neither `set` nor `encode`, a `top` path outside `results.`, or a
    binding with both `domain` and `clamp`; and it SHOULD write the colours it holds as parsed
    values in hex form (`#rrggbb`, or `#rrggbbaa` when alpha is below 1).

## Reading and applying

1. A top-level object with `version: 1`, an array `layers` and no `kind` is a style document
   version 1 (README, "Encoding" rule 2).
2. A top-level structure that fails the schema (not an object, `layers` not an array, `version`
   missing) MUST refuse the document with `E_BAD_COMMAND`. A `version` this reader does not
   implement MUST refuse it with `E_UNSUPPORTED_VERSION` (README, "Versioning"); version 1 is always
   implemented (README, "Versioning" rule 3).
3. Validation is per unit. A channel entry of `set` or `encode` naming an unknown channel is
   dropped from that layer and reported (`E_UNKNOWN_CHANNEL`); the layer's other channels apply. A
   layer that otherwise fails -- any rule of the table under "Purpose", with the code 2.x reports
   (a value outside an enumerated list or a number out of range is `E_OPTION_RANGE`, a colour that
   does not parse `E_BAD_LAYER`), an expression over the README limits (`E_BAD_SELECTOR`), a
   literal text value (`*.label`, `*.tooltip`, `*Text`) over 1,024 characters (`E_OPTION_RANGE`),
   a size, width, strength or scale above its published maximum (1,000,000 scene units;
   `E_OPTION_RANGE`), or any exception while it is checked -- MUST be added to the stack disabled,
   with that code and a reason, and reported. It MUST NOT be dropped, and MUST NOT refuse the rest of the document. graphty-element
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
7. **Imported layers are stamped.** Every layer added from a document appends `{ templateId,
digest, observed }` (the document's RFC 8785 SHA-256, and the file name or origin the reader
   opened it from) to the layer's import chain, kept by the session and written back in the layer's
   `extensions` under `graphty.imported-from` as a list. A chain found
   in the incoming document is kept as the document's claim and the reader's own entry is appended
   after it; it is never taken as the reader's own record (README, "Extension data" rule 1). A
   document's claim of `source.by: "user"` or `"plugin"` is replaced by `{ by: "template",
templateId }`; `source.by: "run"` is kept only when its `runId` binds to a run in this session,
   and is otherwise replaced the same way. A document cannot make its layers look like the
   reader's own.
8. **Layers that hide or single out elements are noticed by effect, not by form.** The binding
   report lists as a notice, with the number of elements it affects, every imported layer that
   makes an element's effective alpha (opacity times colour alpha) or size fall below a visibility
   threshold (RECOMMENDED: alpha 0.05, size 0.05), every one that paints an element in a colour
   whose contrast against the current background is below 1.5:1 (hidden by colour rather than by
   alpha), and every one whose selector matches few elements against the graph (RECOMMENDED: five
   or fewer), whatever the selector's kind -- an `ids` list, an `expression` naming one id, a `top`
   of 1.
9. The applier returns a binding report (README, "Applying a document to new data").
10. Applying a style document MUST NOT start a run, change column roles, change the drawing mode,
    move the camera, or fetch anything.
11. **Work is bounded.** Evaluating a style costs layers times elements, and a `top` selector or a
    `clamp` adds a sort per layer, repeated on repaint. The applier MUST bound the work of one
    document by a published budget (RECOMMENDED: 20,000,000 selector evaluations on the current
    graph, counting a sorting layer as ten), computed before evaluating and reported with an
    estimate in the binding report; the layers beyond the budget are added disabled with
    `W_STYLE_WORK_BOUND`, in document order from the top, and the rest apply. Rendering counts
    too: each element a label, tooltip or arrow-text channel paints is a CPU-rasterised texture, so
    it counts against the budget by its texture area (RECOMMENDED: one evaluation per 1,000 pixels
    of `sizePx` squared times its text length), and a document may label at most 10,000 elements
    (RECOMMENDED) before the rest of its label layers are added disabled with the same code. An
    envelope's style is applied without a click, which is why the bound is not optional.

## Upgrading the 1.x style template

A 1.x style template (`{ graphtyTemplate: true, majorVersion: "1", metadata?, graph, layers, data,
behavior }`, `graphty-element/src/config/StyleTemplate.ts`) is not a version 1 style document, and
today its `layers` are accepted and ignored. The owner named this as a defect on 2026-09-21: "A 1.x
style template silently deletes every algorithm picture, with no warning."

A reader that accepts a 1.x template MUST upgrade it to an envelope (envelope.md) and MUST NOT
drop any part silently. The rules restate the migration register's `template-split` codemod
(`design/element-api/element-api-migration.md`), so an on-read upgrade and an offline conversion
give the same result:

| 1.x member                                            | Goes to                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layers`                                              | the `style` member. Each 1.x layer becomes a `LayerSpec` whose `set` holds the channel values its node or edge style set. A 1.x layer with both a node and an edge style is split into two layers. A selector `""` becomes `{ match: "everything" }`; any other 1.x selector string becomes `{ match: "expression", where }`. A 1.x path `algorithmResults.<ns>.<type>.<field>` is rewritten to `results.<as>.<field>`, with the `as` minted below and the field renamed to its 2.0 name (for example `community` to `group`) |
| a layer's `calculatedStyle`                           | not convertible: reported with its expression for a person to rewrite as an encoding; the rest of the layer is converted                                                                                                                                                                                                                                                                                                                                                                                                      |
| `data.knownFields`, `data.directed`                   | the `dataPlan` member                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `graph.layoutOptions.weightProperty`, `weightPath`    | the data plan's `knownFields.edgeWeightPath`, removed from the layout step (a layout option of that name is refused by 2.x)                                                                                                                                                                                                                                                                                                                                                                                                   |
| `data.algorithms`                                     | one recipe in the `recipes` member, one `algo.run` step per entry. A bare string entry becomes `{ algorithm }`. The key is translated through the element's legacy-key table (`algorithmByLegacyKey`): `graphty:scc` becomes `components` with `{ strength: "strong" }`, `graphty:dijkstra` becomes `shortest-path`. `as` is minted from the current key (the key, then `-2`, `-3`). The recipe never runs without the caller's instruction (recipe.md, "Consent")                                                            |
| `graph.layout`, `graph.layoutOptions` (other options) | the same recipe, one `layout.set` step                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `graph.viewMode`                                      | the `view` member, a view with that `mode` and a `fitToGraph` framing                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `graph.startingCameraDistance`, `graph.twoD`          | not representable (a bare distance is not a view): reported with their values                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `metadata`                                            | the envelope's `name` and `description`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `graph.background`, the selection style, `behavior`   | not representable in version 1: each is reported with a stated reason                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

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

| Input                                                                                                       | Required result                                                                      |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `{ "version": 1, "layers": [] }` (2.x output, no `kind`)                                                    | accepted as a style document; report `bound: 0`                                      |
| a document whose `version` is above the highest this reader implements                                      | refused with `E_UNSUPPORTED_VERSION`, naming the version found and the versions read |
| a layer with neither `set` nor `encode`                                                                     | added disabled, `E_BAD_LAYER`; the other layers apply                                |
| a binding with both `domain` and `clamp`                                                                    | layer added disabled, `E_BAD_LAYER`                                                  |
| `edge.patternCount: 1`                                                                                      | layer added disabled, `E_OPTION_RANGE`                                               |
| `node.shape: "star"` in a version 1 style                                                                   | fails the schema; a reader adds the layer disabled, `E_OPTION_RANGE`                 |
| one channel in both `set` and `encode`                                                                      | layer added disabled, `E_BAD_LAYER`                                                  |
| an `everything` layer encoding `node.size` by `results.hubs.value`                                          | layer added disabled, `E_UNSCOPED_RUN_ENCODING`                                      |
| a `top` selector with `n: 10` over `results.hubs.rank`                                                      | the ten highest rank numbers (the worst); a writer names the score instead           |
| a 65,536-character literal `node.label` on every node                                                       | layer added disabled, `E_OPTION_RANGE`                                               |
| `node.size: 1e308`                                                                                          | layer added disabled, `E_OPTION_RANGE`                                               |
| a layer `{ match: "has", path: "data.constructor" }`                                                        | matches nothing: inherited members are not data                                      |
| a binding with `legend.labels: { "2": "ribosome biogenesis" }`                                              | painted as without it; the legend's key 2 reads "ribosome biogenesis"                |
| a layer painting 12 nodes the background colour                                                             | applied; reported as a notice (contrast below the threshold, 12 elements)            |
| `"node.color": "red\" URL=\"javascript:alert(1)"`                                                           | does not parse as a colour; layer added disabled, `E_BAD_LAYER`                      |
| a layer setting `node.color` to `#ffffff00` on one node picked by an `expression` naming its id             | applied; reported as a notice (alpha below the threshold, one element)               |
| 1,001 layers, or layers whose estimated work exceeds the budget                                             | the excess added disabled with the reason; the rest apply                            |
| a layer writing `"node.colour": "#f00"` and `"node.size": 2`                                                | `node.colour` dropped with `E_UNKNOWN_CHANNEL`; the layer applies its size           |
| a layer writing `node.marker`                                                                               | that channel refused with `E_UNSUPPORTED`                                            |
| a layer whose `where` is 20,000 characters                                                                  | disabled with `E_BAD_SELECTOR`; the other layers apply                               |
| an unknown top-level member `"x-note": 1`                                                                   | ignored, reported `W_UNKNOWN_MEMBER`, written back on save                           |
| a layer reading `data.logFC` on a graph with no `logFC`                                                     | added disabled, `unresolvedPaths` contains `data.logFC`                              |
| a layer ``{ match: "expression", where: "data.adj.P.Val < `0.05`" }`` on a graph with attribute `adj.P.Val` | matches the elements whose `adj.P.Val` is below 0.05 (flat keys)                     |
| ``where: "data.\"adj.P.Val\" < `0.05`"``                                                                    | layer added disabled, `E_BAD_SELECTOR`: a quoted segment carries no dot              |
| a layer naming palette `lab-reds`, carried, unregistered                                                    | palette registered for this session and reported; layer binds                        |
| a layer naming palette `lab-reds`, neither carried nor registered                                           | disabled with `E_UNKNOWN_PALETTE`                                                    |
| a carried descriptor under the id `viridis`                                                                 | descriptor ignored and reported; the built-in palette is used                        |
| a node layer with `ids: { nodes: ["A"], edges: ["17"] }`                                                    | node `A` selected; `edges` ignored and reported                                      |
| an edge layer with `ids: { edges: ["17"] }` (a session edge id, as 2.x writes)                              | layer added disabled, `E_UNSTABLE_EDGE_ID`                                           |
| version 1, `ids.edges` holding an `EdgeMember` object                                                       | layer added disabled: an edge reference is a version 2 value                         |
| a layer with `source: { by: "user" }` from a document                                                       | stored as `{ by: "template", templateId }` with the import chain                     |
| a document applied twice without a `templateId` option                                                      | both stamped with the document's digest as `templateId`                              |
| a `top` selector with `n: 10` whose ranks run 1 to 8, then three nodes tied at 9                            | 8 elements painted; the report says 3 were left out at the tie                       |
| a `top` selector with `path: "data.degree"`                                                                 | layer added disabled, `E_BAD_SELECTOR`: the path is `results.<run>.<field>`          |
| `encode: { "node.color": { "by": "data.x", "domain": [-1.4, 4.8], "midpoint": 0 } }`, value -0.7            | palette position 0.25                                                                |
| a style with a slot `padj` (name `padj`, hint `FDR`) applied to data with `FDR`                             | bound by hint; `data.padj` rewritten to `data.FDR`                                   |

A writer conforms when its output validates against the schema, carries `kind`, omits
element-owned layers, carries exactly the non-built-in palettes named, writes stable edge
references (as version 2), and writes aliases instead of derived run ids.

**Compatibility with the released reader.** graphty-element's test suite MUST run 2.x's own layer
checker (`checkLayerSpec`) and `applyTemplate` over every version 1 example and fixture of this
specification and require acceptance, and MUST run a 2.x `applyTemplate` then `toDocument()` round
trip over them and assert exactly which members survive, so any drift from the version 1 freeze
fails in continuous integration.

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
            {
                "slot": "lfc",
                "element": "node",
                "name": "logFC",
                "nameHints": ["log2FoldChange"],
                "level": "quantitative"
            },
            {
                "slot": "padj",
                "element": "node",
                "name": "padj",
                "nameHints": ["FDR", "adj.P.Val"],
                "level": "quantitative"
            }
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
                "node.color": {
                    "by": "data.logFC",
                    "scale": "linear",
                    "palette": "red-blue",
                    "reverse": true,
                    "domain": [-3, 3],
                    "midpoint": 0,
                    "missing": { "value": "#bdbdbd" },
                    "legend": { "title": "log2 fold change, tumour vs normal", "missingLabel": "not measured" }
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
