# Palette extension point

Status: draft specification against graphty-element 2.6.1. Shared rules (registration policy,
identifiers, versioning, options, parity, isolation, conformance kit) are in `README.md`; this
document adds what is specific to palettes.

Normative files: `palette.d.ts` (shapes), `descriptors.schema.json#/$defs/PaletteDescriptor` and
`#/$defs/PublishedPaletteDescriptor` (serialised form), and this document (behaviour).

## 1. What a palette is

A palette is a named, ordered list of colour anchors that a style layer's colour binding ramps
through. A third party brings a palette so that a style layer, a legend, a picker and a saved style
document can all name it -- for example a lab's house colours, a journal's required scheme, or a
diverging ramp built for fold-change data.

A palette is DATA. Nothing in the element ever asks a palette for behaviour: the categorical index
path, the continuous interpolation, the step table, the over-subscription refusal, the legend and
the reversal are all element code that reads the descriptor. The whole extension is one
`PaletteDescriptor`. A palette therefore never executes code, and loading one from a file is safe
(README section 9.2).

Grounding: the owner's list of official points (2026-09-21); `design/graphty-element/extension-points.md`
section "Palette" (kept); the design studio's need for shareable lab styles and a
colour-blind-safe preset (`design/designloom/workflows/W20.yaml`, `W21.yaml`,
`design/designloom/capabilities/style-presets.yaml`).

## 2. Data model

`PaletteDescriptor` (`palette.d.ts`) -- kind: implemented by extensions.

| Member           | Required when authored | Rule                                                                                                   |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `id`             | yes                    | Non-empty string; not a built-in id (`KNOWN_PALETTE_IDS`); permanent                                   |
| `plainName`      | yes                    | Non-empty string                                                                                       |
| `kind`           | yes                    | `"sequential"`, `"diverging"` or `"categorical"`                                                       |
| `colors`         | yes                    | Non-empty array; every entry a colour the element can parse                                            |
| `capacity`       | no                     | Derived: `colors.length` for categorical, `null` otherwise. If present it MUST equal the derived value |
| `colorblindSafe` | no                     | Subset of `"deuteranopia"`, `"protanopia"`, `"tritanopia"`; absent means `[]` (no claim)               |

Normalisation at registration (the element MUST do all of these before publishing):

1. Every anchor is converted to six-digit upper-case hex (`#RRGGBB`). An author MAY write
   `oklch(...)`, `rgb(...)`, `hsl(...)`, a named CSS colour or hex. Alpha is discarded.
2. `capacity` is set to its derived value.
3. `colorblindSafe` is set to `[]` when absent.
4. The published descriptor and its arrays are frozen.

The element's own palettes are not normalised the same way: some are written in upper case
(`okabe-ito`) and some in lower case (`viridis`, `red-blue`). A reader of a descriptor (a legend,
a document comparison, a conformance check) MUST therefore compare anchors case-insensitively.

Authoring guidance (SHOULD, not enforced):

- A sequential palette SHOULD have at least two anchors and SHOULD be monotonic in lightness.
- A diverging palette SHOULD have an odd number of anchors, at least three, with the neutral colour
  in the middle, because a binding's `midpoint` places the middle of the ramp at that value. With
  an EVEN number of anchors (a 10-colour `RdBu` copied from R) the midpoint falls BETWEEN the two
  central anchors, so a value exactly at the midpoint (a fold change of 0) is painted as a mix of
  them and reads as faintly up- or down-regulated. Registration accepts it; the conformance kit
  warns, and the element MAY publish a derived flag so a picker can warn too.
- A categorical palette SHOULD have anchors that are distinguishable from each other and from the
  canvas background in both the light and dark themes.
- A `colorblindSafe` claim SHOULD be checked with the element's `isPaletteSafe` (published on
  `./schema`) before it is published. The element takes the claim on trust and does not verify
  it at registration: refusing an author's palette over a claim would be the element overruling
  the author, and a picker that wants a verified answer computes it.

## 3. Registration

```ts
registerPalette(descriptor: PaletteDescriptor, options?: RegisterOptions): void
```

1. Synchronous; the palette is usable by the next repaint.
2. Validation, in order, each failure an `E_BAD_COMMAND` with `source: "registry"` and
   `details = { kind: "palette", name: <id>, field: <member> }`:
    - descriptor is not an object, or is `null` -> `field: "descriptor"` **(not yet met:** 2.6.1
      tests `typeof descriptor !== "object"`, which lets `null` through, and then throws an uncoded
      `TypeError` reading `plainName`**)**
    - `plainName` missing, empty or not a string -> `"plainName"` **(not yet met:** 2.6.1 checks
      only for `undefined` and `""`, so a number or an object is published into every picker**)**
    - `kind` not one of the three -> `"kind"`
    - `colors` not a non-empty array -> `"colors"`
    - an anchor that does not parse as a colour -> `"colors"`, message names the anchor
    - `capacity` present and not the derived value -> `"capacity"`
    - `id` missing or empty -> `"id"` (from the shared policy)
3. A built-in id -> `E_DUPLICATE_PLUGIN`, `details.builtIn: true`.
4. **Sameness is by content.** Two registrations are the same palette when their normalised
   descriptors are equal (compared as JSON), not when they are the same object. Re-registering an
   equal palette is a no-op. This differs from the class-shaped points on purpose: a palette is
   usually written as an object literal that is rebuilt on every module evaluation. **(not yet
   met)** 2.6.1's content key covers `id`, `kind`, `colors`, `capacity` and `colorblindSafe` but
   not `plainName`, so re-registering a palette with a corrected name is a silent no-op and the
   old name stays in the catalogue.
5. A different palette under a taken id replaces it with one warning, or throws
   `E_DUPLICATE_PLUGIN` under `{ strict: true }`.

## 4. What the built-in palettes do, and parity

Each row is something a built-in palette can do. A registered palette MUST be able to do the same,
by the same route. The "pinned by" column names the test in
`graphty-element/test/browser/extensions/palette-extension.test.ts` that holds the element to it.

| Capability                                                       | Route                                                                                           | Pinned by                                                        |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Listed beside the built-ins, with its plain name, kind and claim | `session.catalog.palettes()`                                                                    | "is offered by the session beside the element's own..."          |
| Offered to a picker filtered by kind                             | catalogue, filtered on `kind`                                                                   | "is offered to a picker that has already decided what kind..."   |
| Named by a colour binding                                        | `encode: { "node.color": { by, palette: "<id>" } }`                                             | "ramps a measurement onto its anchors..."                        |
| Named when encoding a run                                        | `session.styles.encode({ run, channel, palette })`                                              | "is the palette an analysis layer paints with..."                |
| Continuous interpolation between anchors                         | sequential and diverging kinds                                                                  | "mixes a colour between two anchors..."                          |
| One anchor per group, never interpolated                         | categorical kind                                                                                | "names each group with one anchor..."                            |
| Reversal                                                         | binding `reverse: true`                                                                         | "sends the smallest value to the far end..."                     |
| A named colour for missing values                                | binding `missing: { value }`                                                                    | "paints a missing value a named colour..."                       |
| Refusing to wrap a categorical palette past its capacity         | `E_CAP_EXCEEDED`, or binding `overflow`                                                         | "never wraps a fifth group round onto its first colour"          |
| Unknown name refused before painting                             | `E_UNKNOWN_PALETTE` with `details.available` and `details.candidates`                           | "is refused before anything is painted..."                       |
| A legend: swatches per group, or a ramp with its direction       | legend API                                                                                      | the two "tells the legend..." tests                              |
| Travelling in a saved style document                             | `session.styles.toDocument()` writes the descriptor of every non-built-in palette a layer names | "paints the same colours again when the document... is reopened" |
| Passing the form check before Apply                              | the style form's validation                                                                     | "passes the check a form runs..."                                |

**Not specified: which anchor a category or group gets.** "One anchor per group" does not say
which group gets which anchor. Group numbers are whatever the algorithm chose, and categories take
an order the contract does not state, so a lab style mapping Up, Down and Unchanged shifts colours on
a dataset with no Unchanged genes, and one module can be two colours in two conditions. A canonical
group order, a documented category order and an explicit value-to-anchor map on a categorical
binding are README open decision 32.

Properties that belong to the BINDING, not the palette -- scale, domain, clamp, midpoint, reverse,
missing, bins, overflow -- apply to a registered palette exactly as to a built-in one. That is why
a palette takes no options (section 6).

## 5. Addressing and persistence

1. A palette is addressed by its `id` everywhere: in a binding's `palette`, in `encode`, in a
   `StyleDocument`, in a legend.
2. `toDocument()` MUST write, in `StyleDocument.palettes`, the full published descriptor of every
   registered (non-built-in) palette that any layer in the document names, and MUST NOT write
   built-in palettes. A document is thereby self-describing: it carries everything needed to paint
   it again except the element itself.
3. Applying a document (today): every palette it carries MUST already be registered with equal
   COLOURS, or the document is refused as a whole with `E_UNKNOWN_PALETTE` -- never half-applied.
   A document that carries a palette whose id is registered with different colours MUST be refused
   too. "Equal colours" means the same `kind` and the same normalised anchors in the same order,
   compared case-insensitively, and nothing else: a different `plainName`, `version`,
   `colorblindSafe` claim or an unknown member is reported as a difference (so a legend can say
   the page names the palette differently) but never refuses the document, because none of them
   changes what is painted. (This is deliberately narrower than registration sameness in section
   3 item 4, which includes `plainName` so that re-registering a corrected name takes effect.)
   **(not yet met)** 2.6.1 checks only that each carried id is registered
   (`graphty-element/src/session/styles/StylesApi.ts`, `checkDocument`), so a document is applied
   with whatever colours the page registered under that id and a shared file can paint different
   colours on different pages -- a fold-change figure can come out with its direction inverted.
   Today, therefore, the lab's core habit -- one lab style, sent as a file to each member -- works
   only where each member first registers the lab's palettes by code.
4. Applying a document (proposed, open decision 10 in `README.md`): the carried palettes resolve
   in a scope OWNED BY THE DOCUMENT (`palette.d.ts`, `DocumentPalettePolicy` `"document-scope"`).
   They paint that document's layers and shadow no palette registered by code; within the
   document its own anchors win, so it always paints the colours it was saved with. The
   recommendation also defines the document's lifetime, which the first draft left open:
    - a style document is OPEN from the moment it is applied until every layer it added has been
      removed; loading new data, including a load with `replace: true`, does not close it, so a lab
      style keeps painting the next network it is applied to (the W20 "down-regulated list" case);
    - while it is open, the palette picker lists its carried palettes, marked as coming from that
      document, so a reader can use the lab ramp for a NEW layer; such a layer joins the document;
    - a carried palette whose id is a BUILT-IN id is refused with `E_DUPLICATE_PLUGIN`
      (`details.builtIn: true`), under every policy, so a file cannot paint its own colours under
      the name `viridis` and borrow that palette's reviewed claims;
    - a carried palette whose id is registered BY CODE with different colours is either refused or
      shown under a document-local name (for example "acmelab-fold-change (from lab-style.json)"),
      never under the registered palette's name, `plainName` or `colorblindSafe` claim. The motivating case is the
      owner's "load style" / "load recipe" task (2026-09-27): a community shares a starting point
      without sharing its data, and the receiving reader should not have to register anything first.
      Registering a document's palettes into the page-global, permanent registry was considered and
      is not recommended: a shared file would then be untrusted data writing into every picker,
      squatting on ids (every later genuine document is refused, and a plugin registering the id
      later throws under `strict`), carrying false colour-blind-safety claims beside reviewed
      palettes, and holding memory for the page's lifetime.
5. A palette gains an optional `version` (open decision 3), carried with the palette in a
   document, so two revisions of a lab palette under one id can be told apart. Under document
   scope two revisions never meet: each document paints its own. A plugin that changes the
   colours of a palette it ships under the same id makes a breaking change of that plugin.

## 6. Options

A palette takes none, and `PaletteDescriptor` is the only descriptor with no `options` member.
Every knob a reader might want -- scale, domain, clamp, midpoint, reverse, missing colour, bins --
belongs to the binding, and no built-in palette takes configuration either, so an options surface
would create a parity gap rather than close one. A variant (a darker version, a reversed version)
is a second palette with its own id.

## 7. Errors

| Code                 | When                                                                                      | Raised by         |
| -------------------- | ----------------------------------------------------------------------------------------- | ----------------- |
| `E_BAD_COMMAND`      | malformed registration (section 3)                                                        | `registerPalette` |
| `E_DUPLICATE_PLUGIN` | built-in id; different palette under a taken id with `strict`                             | `registerPalette` |
| `E_UNKNOWN_PALETTE`  | a binding, `encode` call or document names an unregistered palette                        | styles API        |
| `E_CAP_EXCEEDED`     | a categorical binding has more groups than the named palette's capacity and no `overflow` | repaint           |

`E_CAP_EXCEEDED` MUST reach the consumer, with the layer id, the group count and the palette's
capacity, through a style-problem event or a published problem list on `./session`, so a legend can
mark the unpainted groups and an application can offer a larger palette or an overflow. Clustering
routinely yields more groups than a categorical palette holds, and groups that silently keep the
base colour read as "unclustered" in a figure. **(not yet met)** It is reported through the repaint
engine's problem list, which `./session` does not publish, so a consumer cannot observe it; only
its consequence is visible. This is true of built-in palettes too.

## 8. Versioning and compatibility

- `PaletteDescriptor` is implemented by extensions: adding a required member is a major release.
- `ColorVisionDeficiency` is a closed union of the three dichromacies. A grayscale or print-safety
  claim (which journals and `design/designloom/capabilities/style-presets.yaml` ask for) cannot be
  recorded, and adding a value later is a closed-union change; whether to add `"achromatopsia"` or
  `"grayscale"` now, or to open the union for readers, is README open decision 30.
- The anchor normalisation rule (six-digit hex) is part of the contract; a document written by one
  version MUST paint the same colours in a later version of the same major.
- A reader of a `StyleDocument` that meets a palette descriptor member it does not know MUST ignore
  it (README section 6.3).
- The built-in ids and their colours are part of the contract. Changing the colours of a built-in
  id is a breaking change because saved documents name it; a new default palette gets a new id.

## 9. Security

A palette is data. Registering one, and applying a document that carries one, MUST NOT execute
code, fetch a resource or read anything outside the descriptor. Anchor strings are parsed as
colours only; a string that is not a colour is refused, never evaluated.

A palette carried by a document is untrusted data from whoever wrote the file. Its `plainName` is
plain text a consumer MUST render as text (README section 5 item 6); its `colorblindSafe` claim is
the file author's, not a reviewed plugin's, and a picker that shows it SHOULD say so; and the
element MUST bound what a document can carry (palettes per document, anchors per palette, string
lengths) so a hostile file cannot exhaust memory. The bounds are part of open decision 10.

## 10. Conformance checks

Run by `checkPalette(descriptor)` in the proposed kit (README section 11.2). All run in Node except
the last two, which need the kit's browser configuration.

| Check                              | Passes when                                                                                                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| descriptor is valid                | the descriptor validates against `#/$defs/PaletteDescriptor` and `registerPalette` accepts it                                                                          |
| id is not reserved                 | the id is not in `KNOWN_PALETTE_IDS`                                                                                                                                   |
| id follows the recommended grammar | the id matches README section 4.3's pattern (a warning, not a failure, until open decision 4)                                                                          |
| anchors normalise                  | every published anchor of the registered palette matches `^#[0-9A-F]{6}$` and the count is unchanged                                                                   |
| capacity is derived                | published `capacity` equals the derived value                                                                                                                          |
| re-registration is idempotent      | registering an equal descriptor object again changes nothing and warns nothing                                                                                         |
| catalogue lists it                 | `registeredPaletteDescriptors()` contains the published descriptor                                                                                                     |
| safety claim holds                 | every deficiency in `colorblindSafe` passes `isPaletteSafe` (a warning, not a failure: the claim is the author's)                                                      |
| diverging has a neutral middle     | a diverging palette has an odd number of anchors (a warning, naming the two anchors the midpoint falls between)                                                        |
| odd descriptors are refused        | `null`, and a descriptor whose `plainName` is a number or an object, are refused with `E_BAD_COMMAND` (fails until section 3 item 2 is met)                            |
| paints a ramp                      | a sequential or diverging palette bound to a numeric attribute paints the lowest value with the first anchor and the highest with the last (browser)                   |
| survives a document round trip     | `toDocument()` carries the descriptor, and applying it to a fresh element with the palette registered paints the same colours (browser)                                |
| a renamed palette still applies    | a document carrying the palette with a different `plainName` and an unknown extra member applies, reporting the difference (Node; fails until section 5 item 3 is met) |
| overflow is observable             | a categorical binding with more groups than the capacity and no `overflow` reports `E_CAP_EXCEEDED` to the consumer (browser; fails until section 7 is met)            |

## 11. Worked examples

A diverging fold-change palette for gene expression, with grey for missing values supplied by the
binding (the need in `design/designloom/workflows/W20.yaml`). `capacity: null` is written out
because 2.6.1 types the parameter as `PaletteDescriptor`, which requires it, although the run time
derives it (section 12):

```ts
import { registerPalette } from "@graphty/graphty-element/extend";

registerPalette({
    id: "acmelab-fold-change",
    plainName: "Fold change (blue - white - red)",
    kind: "diverging",
    colors: ["#2166ac", "#67a9cf", "#f7f7f7", "#ef8a62", "#b2182b"],
    capacity: null, // derived; required by the 2.6.1 type
    colorblindSafe: ["deuteranopia", "protanopia"],
});

await session.styles.add({
    name: "Fold change",
    target: "node",
    selector: { match: "everything" },
    encode: {
        "node.color": {
            by: "data.log2fc",
            palette: "acmelab-fold-change",
            midpoint: 0, // the neutral anchor sits at zero
            domain: [-4, 4],
            clamp: [-4, 4], // skewed values do not stretch the ramp
            missing: { value: "#bdbdbd" }, // genes with no measurement
        },
    },
});
```

A malformed registration and what the author sees:

```ts
import { registerPalette } from "@graphty/graphty-element/extend";

registerPalette({
    id: "acme-bad",
    plainName: "Bad",
    kind: "categorical",
    colors: ["#fff", "nope"],
    capacity: 2,
    colorblindSafe: [],
});
// throws GraphtyError { code: "E_BAD_COMMAND", source: "registry",
//   details: { kind: "palette", name: "acme-bad", field: "colors" },
//   message: '"nope" in the palette "acme-bad" is not a colour' }
```

## 12. Known gaps

- `E_CAP_EXCEEDED` is unobservable to a consumer (section 7).
- A palette carried by a document is refused unless registered first (open decision 10), and a
  document whose palette id is registered with different content is applied with the page's
  colours instead of refused (section 5 item 3).
- A registered palette is global, not scoped to the document that carried it.
- A document's palette comparison, once built, must compare colours only (section 5 item 3).
- Nothing stops a document from carrying a palette under a built-in id or a code-registered id
  (section 5 item 4).
- The content key that decides sameness leaves out `plainName` (section 3 item 4).
- `null` and a non-string `plainName` are not refused with a code (section 3 item 2).
- Which anchor a category or community group gets is unspecified (section 4; open decision 32).
- The published parameter type of `registerPalette` requires `capacity` and `colorblindSafe`
  although the run time derives or defaults them; `PaletteRegistration` in `palette.d.ts` is the
  accurate shape.
- Unknown descriptor members are republished rather than dropped (README section 6.3 item 3).
- Built-in anchors mix upper- and lower-case hex while registered anchors are upper case; the
  built-in tables should be normalised the same way.

## 13. Who this serves

| Need                                                                              | Source                                                                                            |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A lab style with its own palettes, rebuilt by each member today, shared as a file | `design/designloom/workflows/W20.yaml`, `design/designloom/personas/genomics-cytoscape-user.yaml` |
| Cluster colours exported with a legend                                            | `design/designloom/workflows/W21.yaml`                                                            |
| Colour-blind-safe, print and high-contrast presets                                | `design/designloom/capabilities/style-presets.yaml`                                               |
| Sharing a starting point without sharing data                                     | owner, 2026-09-27, notes on top tasks                                                             |
