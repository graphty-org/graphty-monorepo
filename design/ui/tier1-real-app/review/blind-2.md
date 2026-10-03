# Blind author: default binding and legend rollup

Section 2 of `element-api-decisions.md` proposes that graphty-element pick a sensible scale for a
binding that names none, from a per-column "level" (category, quantity, time, text, id), and that
the legend fold categories past a cap into one "Other" row. This review writes the example a
newcomer would write from section 2 plus the published guide pages
(`graphty-element/docs/guide/`) and compiles it against the built types with section 2's
signatures merged in.

## The task chosen

The most common task for this capability: "my file has a department column stored as numeric
codes; color the nodes by it, one color per department, and draw a legend." That is exactly the
problem section 2 opens with (a group number drawn as a ramp).

## The example

`design/ui/tier1-real-app/review/blind-2.ts` (21 lines):

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { session } = element;
const path = "data.department"; // my file stores departments as codes 1..14

// A department code is a group, not an amount: say so, or it is drawn as a ramp.
await session.data.declare(path, { level: "category" });
const d = session.styles.defaultBinding(path, "node.color");
if (!d.suitable) throw new Error(d.reason);

await session.styles.add({
    name: "Color by department",
    target: "node",
    selector: { match: "has", path },
    encode: { "node.color": { by: path } }, // no scale: the element picks one per category
});

for (const block of session.styles.legend({ maxCategories: 8 })) {
    console.log(block.swatches.map((s) => s.label), block.other?.label, block.other?.count);
}
```

## Did it compile

Yes, with the stub. `tsc --noEmit --strict` exits 0 against the built `dist/` types plus a
declaration file that adds `SessionDataApi.declare`, `StylesApi.defaultBinding`, the
`legend(options)` overload and `LegendBlock.other` exactly as section 2 spells them
(`tmp/api-review/blind-2/stub.d.ts`). Without the stub it fails on exactly those four names, which
confirms the stub is what made it pass:

```
example.ts(8,20): error TS2339: Property 'declare' does not exist on type 'SessionDataApi'.
example.ts(9,26): error TS2339: Property 'defaultBinding' does not exist on type 'StylesApi'.
example.ts(19,43): error TS2554: Expected 0 arguments, but got 1.
example.ts(20,59): error TS2339: Property 'other' does not exist on type 'LegendBlock'.
```

Compiling is a low bar here: `Path` is `string` (`dist/src/catalog/types.d.ts:55`), so every path
spelling below compiles whether or not it is right. A probe file (`tmp/api-review/blind-2/probe.ts`)
found two real type errors:

1. **A `DefaultBinding` cannot be handed back as a binding.** Writing
   `encode: { "node.size": { by: path, ...session.styles.defaultBinding(path, "node.size") } }`
   fails: `range` is `readonly [number, number]` on `DefaultBinding` but `[number, number]` on
   `Binding` (`dist/src/catalog/types.d.ts:310-338`). Even with that fixed it would carry the
   extra keys `suitable` and `reason` into a layer spec. The natural move ("ask for the default,
   tweak one field, write it") is not possible. Either make `DefaultBinding` a `Binding` plus a
   separate verdict (`{ binding, suitable, reason }`), or say in the docs that it is read-only
   information.
2. **There is no documented way to read a column's level back.** Section 2 adds `level` and
   `levelSource` to an `AttributeDescriptor` but names no method that returns one. The built types
   do have `session.data.attributes(): readonly AttributeDescriptor[]`
   (`dist/src/session/types.d.ts:409-413`), but no guide page mentions it, so a blind author
   cannot find where `levelSource` would surface. I guessed `session.data.describe(path)`, which
   does not exist.

## Collisions with what is already published

- **`AttributeDescriptor` already exists, with an overlapping field.** The exported
  `AttributeDescriptor` (`dist/src/catalog/types.d.ts:603-621`) has `type: AttributeType`, and
  `ATTRIBUTE_TYPES` is `["string", "number", "integer", "boolean", "time", "category", "mixed"]`
  (`types.d.ts:127`). Section 2 adds `level` with values `"category"` and `"time"` beside it. A
  reader now sees `type: "category"` and `level: "quantity"` on the same column and has to guess
  which one drives the default. Section 2 shows `AttributeDescriptor` as if it were a new
  two-field interface, which hides this. Decide whether `level` replaces the category/time members
  of `type` or define precisely how they differ, before this is a one-way door.
- **`LegendBlock` already has an overflow row count.** It carries `overflow?: { hidden: number }`
  ("the number a consumer prints as 'and 14 more'", `dist/src/session/styles/legend.d.ts:130-134`)
  and a doc comment saying swatches are "up to twelve rows". Section 2 adds `other` with its own
  `count` and `swatches`. My example prints `block.other?.count`; I could not tell from the docs
  whether I should print `overflow.hidden` instead, whether both can be present at once, or
  whether `other.count` counts categories or elements.
- **Two caps with two numbers.** The algorithms guide says the default palette keeps 8 groups and
  paints the rest one grey labelled "other: K groups" (`docs/guide/algorithms.md:353-367`, the
  `overflow: "other"` binding option). Section 2 says the legend cap defaults to 12. So with the
  defaults the picture folds at 8 and the legend at 12. My `maxCategories: 8` was a guess to make
  them agree; the docs do not say whether `maxCategories` changes the painting or only the legend.
- **The word "other" means three things**: `Binding.other` (a threshold and a fallback value,
  `types.d.ts:322-325`), `overflow: "other"` (the grey policy), and the new `LegendBlock.other`.
- **Size units contradict the guide.** Section 2 says a size binding with no range defaults to
  "2 to 12 px". The algorithms guide says node size is unitless with 1 as the default node size,
  and a run's size layer runs "from 1 ... to 3" (`docs/guide/algorithms.md:314-318`). A newcomer
  cannot reconcile px with that scale, and 2-12 against a default of 1 would make bound nodes up
  to 12 times the size of unbound ones.

## Where I had to guess

1. **Which object `SessionDataApi` is.** I assumed `session.data`; section 2 never says.
2. **The path spelling.** Section 2's only example uses `"results.louvain.group"`. For my own
   column I guessed `"data.department"` from the styling guide's rule that a record's fields live
   under `data.` (`docs/guide/styling.md:113`). Nothing in section 2 confirms `declare` and
   `defaultBinding` take the same spelling a selector does.
3. **Whether to await `declare` before `defaultBinding`.** `declare` returns a `Run`, and the
   styling guide says the model moves only after the run completes (`styling.md:44-45`). I awaited
   it; nothing says whether `defaultBinding` sees an unawaited declaration.
4. **What makes `suitable` false, and what to do then.** No example of an unsuitable pair, no list
   of reasons. I threw the reason as an error, which is probably wrong for a UI; but is
   "category on node.size" unsuitable, or "id on node.color", or a 14-category column past the
   8-color palette?
5. **Whether I need `defaultBinding` at all.** Section 2 says a binding with no scale "takes"
   the default. Then `defaultBinding` is only a preview, and the example works identically
   without it. The docs should say it is optional, so the simple path is three lines shorter.
6. **What `declare` does without awaiting the repaint.** A layer already bound to that column:
   does declaring repaint it? The section says "one undoable step" but not whether the picture
   changes.
7. **How a numeric code is inferred.** "Level is inferred from type and distinct values" gives no
   threshold. I cannot predict whether 14 distinct integers infer as category or quantity, so I
   declared defensively. That means every careful user will always declare, and the inference
   buys them nothing.
8. **What `"time"`, `"text"` and `"id"` default to.** The binding's scale list
   (`types.d.ts:312`) has no time scale; section 2 lists defaults only for category, quantity and
   `node.size`.
9. **`DefaultBinding.scale` is a bare `string`**, not the binding's scale union, so it gives no
   autocomplete and no hint which scales are possible.

## Names that misled me

- **`encode` in two places.** `session.styles.encode()` binds a run's field and its guide page
  says it "binds one run's field to one channel. It is the whole API"
  (`docs/guide/style-helpers.md:19`), but the key `encode:` inside `styles.add()` binds a plain
  data column. To color by an imported column I had to drop to `styles.add` with a name, target,
  selector and encode map. Section 2's example only shows the run path, so the commonest case --
  an imported column -- has no one-call form.
- **`run: "louvain"`** in section 2's example. The guide shows a run as the object `run()`
  returns, with its own id (`algorithms.md:270-299`); `"louvain"` reads like the algorithm name.
  The spec type (`RunRef`, "the run, its awaited result, or its bare id") accepts it, but a
  newcomer will think any algorithm name works and break on the second louvain run.
- **The same thing spelled two ways in one snippet.** `defaultBinding("results.louvain.group", ...)`
  then `encode({ run: "louvain", field: "group", ... })`. Two spellings for one column, in
  consecutive lines of the canonical example.
- **`level`.** Not a word a newcomer associates with "is this a category or a number". `kind` or
  `measure` would read faster, and `type` is taken by the existing field above.
- **`maxCategories`** sounds like it limits the categories painted, not the legend rows.

## Internal concepts I had to name

Layer (`name`, `target`, `selector`), the `match: "has"` selector kind, the `data.` path prefix,
the binding `by` key, a `Run` (to know to await `declare`), a legend block. Six concepts in a task
whose plain statement is "color by department". Only the first four come from the existing
styling surface; section 2 adds `level`, `suitable` and the `other` row on top.

## Verdict on "easy things easy"

The capability makes the common task correct but not short: the example is 21 lines and names six
concepts. The shortest honest version, if `defaultBinding` is optional and inference were trusted,
is still a full `styles.add` layer, because `styles.encode()` cannot bind an imported column. The
fix that most reduces the canonical example is outside section 2's surface: let `encode()` take a
data column (`encode({ field: "data.department", channel: "node.color" })`) so the default
binding is reached in one call, and make section 2's own example use an imported column rather
than a run.

Scratch: `tmp/api-review/blind-2/` (stub, tsconfig, probe).
