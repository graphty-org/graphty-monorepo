# Item 2 review: default binding from what a column measures; one legend rollup (#782)

The recommendation under review is section 2 of `element-api-decisions.md`. It proposes an
attribute `level` (`category | quantity | time | text | id`), `session.data.declare()`,
`session.styles.defaultBinding(path, channel)`, a `maxCategories` argument on `styles.legend()`,
and a new `LegendBlock.other` row. The graphty app needs two things from it: a bound column that
holds group codes must be drawn one color per group, not as a ramp, and the app's legend card and
any legend the element draws itself must fold extra categories the same way.

## Verdict: redesign

The goal is right, and the element has a real gap. The proposed shape cannot ship:

- **The stated problem is half wrong.** A run's group field is already drawn one color per group.
  `styles.encode()` picks the scale from the result shape (`graphty-element/src/session/styles/EncodingSpec.ts:172-197`,
  `community -> "ordinal"`). The real gap is the plain-column path: a binding written in
  `styles.add()` with no scale is linear for every color or number channel
  (`encoding.ts:943-945`, used at `encoding.ts:1415`). The section's own example shows the case
  that already works, and it would add a second default-picking rule beside the first.
- **`level` duplicates a published field.** `AttributeDescriptor.type` already carries
  `"category"` and `"time"` (`catalog/types.ts:223-227`, `802-820`). A string column is
  already typed `"category"` when its distinct count is at most `max(2, sqrt(n))`
  (`session/attributes.ts:139-152`). Two fields would answer the same question with no stated
  winner.
- **It has no ordinal level.** A severity scale (Low, Medium, High, Critical) would be colored
  largest group first (`encoding.ts:660-673`), so the color order says how common a value is, not
  how severe. The level union is closed, so adding the value later breaks every exhaustive switch.
- **The default is resolved every time the layer is painted.** A saved layer with no scale would
  repaint differently whenever the inference changes: next month's file crosses the distinct-value
  threshold, a `declare()` happens, or a minor release tunes the heuristic. That breaks the
  project-file promise in item 10, and it makes "ships in a minor" untrue. The published JSDoc
  documents today's defaults (`catalog/types.ts:526-530`, `EncodingSpec.ts:111-115`), so they
  are behavior, not an accident.
- **Integers would be inferred as categories from cardinality.** At 50,000 nodes the `sqrt(n)`
  threshold is 224, so a degree, age or year column would be colored one color per value. At 400
  nodes a 30-code department column would still be a ramp.
- **`DefaultBinding` cannot be used as a binding.** Spreading it into `encode` fails with TS2322
  (readonly range tuple). It also carries `suitable` and `reason` into the layer spec, types
  `scale` as `string`, has no `overflow`, and reintroduces the palette guess that `encode()`
  deliberately removed (`EncodingSpec.ts:363-371`).
- **The legend would have three "other" mechanisms and two caps.** The legend already appends an
  `other: N groups` swatch for the categories the paint folded (`legend.ts:441-452`), and
  already has `overflow.hidden` for rows past its 12-row cap (`legend.ts:140-143`, `214`). A
  `maxCategories` argument folds at a cap the paint does not use (paint folds at palette capacity,
  8), so the legend and the canvas disagree, and a per-call argument cannot be shared with a
  legend the element draws into an export. It does not solve the stated problem.
- **Size is given in pixels.** `node.size` is unitless; the default node size is 1
  (`config/NodeStyle.ts:155`), and the element's own size default is `[1, 3]`
  (`session/styles/derive.ts:89-98`). "2 to 12 px" would draw nodes 2 to 12 times their default.
- **`declare()` returns `Run<void>`.** `Run` is an algorithm run (`algorithm`, `params`, `scope`,
  `queuePosition`). Every other write on `session.data` returns `Promise<void>`.
- **A plugin cannot say what its output measures.** `FieldDescriptor` has no such field
  (`catalog/types.ts:296-307`), so an algorithm that outputs tiers 1 to 5 is drawn as a ramp
  unless every host calls `declare()`.
- **The common task takes 21 lines and six concepts.** That is because `encode()` accepts only
  a run, and coloring by an imported column requires writing a whole layer by hand.

## Revised shape

The design rests on four decisions:

1. **What a column measures** is one new field, `measurement`. The word and the values follow
   the refined design's decided spelling (door 20 in the UX worktree's `one-way-doors.md`).
   It is set by a declaration, the algorithm catalog, the file format, or inference, in that
   order of precedence.
2. **Resolved once, then written down.** When a layer is created with a scale, palette, range or
   overflow left off, the element chooses them at creation and writes them into the stored
   binding. Later changes to the default, the data or the declarations never repaint a saved
   layer.
3. **`encode()` takes a plain data column.** That makes the default reachable in one call.
4. **The fold belongs to the binding.** The legend reports what was painted, and it takes no cap.

Everything is exported from `@graphty/graphty-element/session`.

```ts
/** OPEN UNION. What a column's values measure, which decides how a binding with no scale draws it. */
export type Measurement = "categorical" | "ordinal" | "quantitative" | "time" | (string & {});

/** OPEN UNION. Who said so. Precedence: declared > catalog > file > inferred. */
export type MeasurementSource = "declared" | "catalog" | "file" | "inferred" | (string & {});

export type MeasurementDeclaration =
    | { measurement: "categorical" | "quantitative" | "time" }
    | { measurement: "ordinal"; order: readonly (string | number)[] };

export interface AttributeDescriptor {
    // ...existing fields; `type` stays the storage type
    measurement?: Measurement;          // absent only for a column with no values
    measurementSource?: MeasurementSource;
}

export interface FieldDescriptor {
    // ...existing fields
    /** Declared by the algorithm. A partition's group field is "categorical" by construction. */
    measurement?: Measurement;
}

export interface SessionDataApi {
    /**
     * Say what a data column measures. One undoable step in the "attributes" project slice.
     * Affects layers created afterwards; a layer that already exists keeps the binding it stored.
     * Refuses a `results.` path with E_BAD_COMMAND: a result field's measurement comes from its
     * algorithm's FieldDescriptor.
     */
    declare(path: Path, declaration: MeasurementDeclaration): Promise<void>;
}

/** An encoding of a plain data column: what EncodingSpec takes, with a path in place of the run. */
export type ColumnEncodingSpec = Omit<EncodingSpec, "run" | "field"> & { readonly path: Path };

/** OPEN UNION of the reasons a column cannot be drawn on a channel. */
export type EncodingRefusalCode =
    | "too-many-values" | "no-values" | "not-plottable" | "time-unsupported" | (string & {});

export type EncodingProposal =
    | { readonly ok: true; readonly binding: Extract<Binding, { by: Path }> }
    | { readonly ok: false; readonly refusal: { readonly code: EncodingRefusalCode; readonly text: string } };

export interface StylesApi {
    /** New overload. Resolves the default once and stores it in the layer. */
    encode(spec: ColumnEncodingSpec, options?: RunOptions): Run<Layer>;
    /**
     * What encode() would store, without storing it. Synchronous, and answered from the cached
     * attribute descriptor in constant time; it never reads the column.
     */
    proposeEncoding(spec: EncodingSpec | ColumnEncodingSpec): EncodingProposal;
    legend(): readonly LegendBlock[]; // unchanged signature
}

export interface LegendSwatch {
    // ...existing label, value, color, size, count, paints
    /** OPEN UNION. "other" marks the one bucket the paint folded; `value` lists what it holds. */
    readonly role?: "value" | "other" | "no-value" | (string & {});
}
```

**Canonical example.** This colors nodes by an imported column of department codes and prints the
legend. It is 11 lines and uses four concepts: the session, a declaration, an encoding, and the
legend.

```ts
import "@graphty/graphty-element";

const { session } = document.querySelector("graphty-element")!;

// Department codes 1..14 are groups, not amounts. Numbers are drawn as a ramp unless you say so.
await session.data.declare("data.department", { measurement: "categorical" });
await session.styles.encode({ path: "data.department", channel: "node.color" });

for (const block of session.styles.legend()) {
    for (const s of block.swatches) console.log(s.label, s.color, s.count);
}
```

**Compile check.** The stub, the example and a probe are in
`tmp/api-review/item-2/`, checked against the same built types the blind author used.
`tsc --strict` exits 0. Without the stub, the example fails on exactly the two new names
(`declare` and `path` in `encode`). The probe checks five things that compile:

- a proposal's `binding` goes straight into a hand-written `styles.add()` layer, which fixes the
  blind author's TS2322;
- declaring `"ordinal"` without an `order` is a compile error;
- the measurement is read back with `session.data.attributes()`;
- the Other row is found by `role`, not by its label text;
- `encode({ run })` still compiles unchanged.

### What the default resolves to

The default is resolved when the layer is created and written into the stored binding.

| Measurement | Color channel | `node.size`, `edge.width` | Enum channel (shape, dash) |
|---|---|---|---|
| categorical | `scale: "ordinal"`, the smallest categorical palette that fits, `overflow: "other"` at the palette's capacity | refused: `not-plottable` | `scale: "ordinal"`, folds into Other past the channel's value count (never `E_CAP_EXCEEDED`) |
| ordinal | `scale: "ordinal"`, `map` from each declared value, in order, to samples of the default sequential palette | `map` to evenly spaced sizes in `[1, 3]` | refused: `not-plottable` |
| quantitative | `scale: "linear"`, default sequential palette | `scale: "linear"`, `range: [1, 3]` (the existing `DEFAULT_SIZE_RANGE`, node-size units) | refused: `not-plottable` |
| time | refused: `time-unsupported`, until a temporal domain kind and dated legend labels exist | refused: `time-unsupported` | refused |

The measurement is inferred as follows:

- **Strings and booleans** infer `categorical`. A string column whose distinct count is above the
  attribute walk's cap of 256 (`ATTRIBUTE_UNIQUE_CAP`) is refused for categorical channels with
  `too-many-values`.
- **Numbers** always infer `quantitative`. Cardinality is never used for numbers, so a code
  column needs a declaration, and the guide says so.
- **Time** is never inferred, matching `session/attributes.ts:41-47`. It is set when
  `data.knownFields` names the column as a time path, or by a declaration.
- **Ids and labels** are roles named by `data.knownFields`. They are not measurements, so `text`
  and `id` are gone.

This version uses no automatic log scale. The heavy-tail and zero rules in the refined design's
default table can be added later. Because defaults are resolved once and stored, a later change to
the table changes only layers created after it.

### Persistence, import, cost

- **Where declarations live.** They live in a new `"attributes"` member of the open
  `ProjectSlice` union. `project:changed` carries that slice. Item 10's project file stores the
  declarations as their own part. The style document does not change.
- **How a file's declarations are read.** The reader keeps them in a `Map`, not a plain object.
  It accepts only the published measurement values. It refuses `__proto__` and caps the number of
  entries at the number of attributes, refusing anything outside these rules with
  `E_BAD_DOCUMENT`.
- **Import.** Item 1's column descriptor carries `measurement` and `measurementSource`, which are
  the same fields as `AttributeDescriptor`. Item 1's mapping takes
  `measurement?: Record<column, MeasurementDeclaration>`, which writes the same declarations that
  `declare()` does, in the same undoable step as the load. A format that declares its types
  (GraphML and GEXF attribute kinds) sets the source to `"file"`.
- **Plugins.** `defineAlgorithm` accepts `measurement` on each output field, and it lands on
  `FieldDescriptor.measurement`. Partition shapes set `"categorical"` by construction, which
  replaces `PRIMARY_FIELD_SCALES`. Both `encode()` paths then use one resolver.
- **Unsuitable bindings.** `encode()` refuses an unsuitable column with `E_BAD_LAYER`. Its
  `details.code` is the refusal code, and its message is the refusal `text`.
- **Cost.** `proposeEncoding()` answers in constant time from the cached descriptor. The
  attribute walk already gathers type, minimum, maximum and the capped distinct set. The From data
  list can call it for every attribute and channel on every render.

### Legend

The fold belongs to the binding, through its `overflow` and `palette`. Because the canvas and
every legend read the same binding, they cannot disagree. The legend changes in three ways:

- The existing `other: N groups` swatch gains `role: "other"` and `count`, and it is exempt from
  the 12-row cap. Today a 12-color palette plus a fold can lose that row to the cap
  (`legend.ts:664`, `681`).
- `overflow.hidden` counts only real category rows that did not fit.
- Swatches for ordinal columns are listed in the declared order.

The legend has no `maxCategories` argument and no `LegendBlock.other`. If a legend the element
draws needs a display height cap later, that cap is stored element configuration that the canvas
legend and the export legend both read, not an argument on `legend()`.

### Compatibility

- **Additive, in a minor:** everything above.
  - `encode({ path })` is new, so it can use the new defaults immediately without changing what
    any existing caller draws.
  - The run path of `encode()` already picks ordinal for partitions, so moving it onto the
    shared resolver draws nothing new.
- **Breaking, in the next major only:** a binding written in `styles.add()` with no scale is
  resolved by measurement at creation. A version 1 style document read with a missing scale has
  today's default (`"linear"`, or `"passthrough"` for text channels) written in, so old files
  open exactly as they drew. The changelog names the behavior change.

## What changed and why

| Proposed | Revised | Why |
|---|---|---|
| `level` with `category, quantity, time, text, id` | `measurement` with `categorical, ordinal, quantitative, time`, as an OPEN UNION | It matches door 20's decided spelling, adds the ordinal level, and lets values be added later without breaking consumers. Id and text are roles already named by `knownFields` (`config/DataConfig.ts:36-75`). |
| `levelSource: inferred, declared` | `measurementSource` with `catalog` and `file` added, as an OPEN UNION | Plugins and file formats can state a measurement. |
| Inferred from type and distinct values | Strings and booleans are categorical; numbers are quantitative; time is never inferred | The same column must not change meaning when the node count changes. |
| Resolved at paint time | Resolved at creation and stored in the binding | Saved layers become self-describing. Later default changes, re-imports and `declare()` calls never repaint saved work. This also removes the need to invalidate layers on `declare()`. |
| `declare(): Run<void>` | `Promise<void>` in the `"attributes"` slice, refusing `results.` paths | It matches the other writes on `session.data`. A declaration on a run id would be lost when the run is repeated. |
| `defaultBinding(path, channel)` returning a loose shape | `proposeEncoding(spec)` returning `{ ok, binding }` or `{ ok, refusal: { code, text } }` | The binding is the element's own `Binding` type and can be stored as is. The input is the same spec `encode()` takes, so new fields such as scope come along without a new argument. A coded refusal lets a host branch without parsing English. |
| Problem shown through `encode({ run })` | `encode({ path })` overload | The common task drops from 21 lines to 11, and one call reaches the default. |
| `legend({ maxCategories })` and `LegendBlock.other` | No argument; `LegendSwatch.role`; the Other row is exempt from the cap | One fold, one count, and one meaning of "other" in the legend, matching what the canvas paints. |
| Size range of 2 to 12 px | `[1, 3]` in node-size units, which is the existing constant | It uses the element's real unit and one size default everywhere. Tier 1 UI text must drop "px" (`tier1-design.md:491`, `664`). |
| Ships in a minor | New paths in a minor; the `styles.add()` default flip in the next major | Today's defaults are documented in published JSDoc. |
| Level only on `AttributeDescriptor` | Also on `FieldDescriptor` and `defineAlgorithm` | A plugin can ship what its output measures. |

## Rejected or narrowed findings

- **"`attributes.ts` never infers `category`."** This is wrong. `describe()` types a string column
  as `"category"` when its distinct count is at most `max(2, sqrt(n))`
  (`session/attributes.ts:139-152`). Only `"time"` is never inferred. The conclusion still holds:
  `type` and a new field must not both answer the question. `type` stays the storage type, and its
  `"category"` and `"time"` members are deprecated in the next major in favor of `measurement`.
- **"Ship the full decided default table now, so the default changes only once."** Rejected.
  Because defaults are resolved at creation and stored, a later change to the table affects only
  layers created after it. Shipping a smaller table first is safe.
- **"Add a levels lane hook that invalidates and repaints affected layers on `declare()`."**
  Not needed. `declare()` does not repaint, so no invalidation path is added.
- **"A binding with `bins: 1e9` hangs `legend()`" (`scales.ts:312`, `legend.ts:388`).** This is
  real but already exists on master, and it is independent of this item. It should be filed as its
  own bug, with a bin ceiling enforced by `E_OPTION_RANGE`. This item makes it more urgent because
  the legend becomes the export source, but it is not part of this API.
- **"An exported legend reveals the members of Other."** Narrowed. The element draws the Other
  row's label and count only. The member list stays in `swatch.value`, where it already is today.
- **"Add a separate `count` to the Other row."** Narrowed. `LegendSwatch.count` already exists
  (`legend.ts:69`). The change is that the Other row sets it.

## Prerequisites: element bugs to fix in the same change

- **The `attributes()` cache goes stale on attribute writes.** It is keyed only on snapshot
  identity (`session/data.ts:690-694`, `744-750`), while attribute writes do not change the
  snapshot. `proposeEncoding()` makes the cache load-bearing, so the key must include the input
  tick.
- **The legend lists categories largest group first** (`encoding.ts:660-673`). Ordinal bindings
  must keep their `map` order.
- **The 12-row cap can drop the Other row** (`legend.ts:664`, `681`).

## One-way doors

- The field name `measurement`, its four values, and the fact that it is an OPEN UNION.
- The `measurementSource` values.
- `data.declare(path, declaration)`, the `MeasurementDeclaration` shape (`order` on ordinal), and
  the rule that it refuses `results.` paths.
- The `path` key of the column overload of `encode()`.
- The name `proposeEncoding`, the `ok`/`binding`/`refusal` result shape, and the published refusal
  codes.
- `LegendSwatch.role` and its values.
- **Resolve once and store.** This is a semantic contract: a stored layer always draws what it
  says. It cannot be relaxed later without breaking saved files.
- The `styles.add()` default change in the next major, including how version 1 documents with a
  missing scale are read.

These are not doors: the palette chosen, the `[1, 3]` size range, and the 256 distinct-value
cap. All of them are written into each layer when it is created, so changing them later changes
only new layers.

## Confidence: medium

The types compile against the built package. The shape reuses what the element already has:
`EncodingSpec`, `Binding`, `LegendSwatch.count`, the existing Other swatch, `DEFAULT_SIZE_RANGE`,
`knownFields`, and the `ProjectSlice` union. Three things are unverified in code:

- **Writing the palette at creation.** `encode()` deliberately leaves the palette unset for runs
  because a palette guessed too early once caused `E_CAP_EXCEEDED` (`EncodingSpec.ts:363-371`).
  Writing the palette at creation is safe for a column, whose values are known then. For a run,
  it is safe only if the run has finished by the time the layer is created.
- **Ordinal colors through `map`.** It is not confirmed that the ordinal scale honors `map` in
  both paint and legend.
- **Door 20.** Its spelling comes from the UX worktree, and that worktree has not been merged.

## Residual risks

- **Two default paths remain until the run path moves.** If `encode({ run })` keeps
  `PRIMARY_FIELD_SCALES` beside the new resolver, the run path and the column path can disagree
  again. Moving the run path onto the shared resolver, with partition fields declared
  `"categorical"` in the catalog, is part of this item, not follow-up work.
- **A forgotten declaration is drawn as a ramp.** A consumer who never declares a numeric code
  column still gets a ramp. That is now deliberate and documented, but it is the most common way
  to get a wrong picture. The import mapping and the Data page are where readers are offered the
  fix.
- **The `styles.add()` flip waits for a major.** Until then, hand-written layers with no scale
  stay linear. The tier 1 app must use `encode({ path })`, not `styles.add()`, to get the new
  defaults.
- **Time cannot be drawn by default yet.** Time columns are refused for default encoding until
  dated legend labels exist, so a time-colored view needs an explicit scale.
- **The `bins` hang is open.** It stays open until it is filed and fixed separately.

Files: `design/ui/tier1-real-app/review/item-2.md`; compile check in
`tmp/api-review/item-2/` (`stub.d.ts`, `example.ts`, `probe.ts`, `tsconfig.json`).
