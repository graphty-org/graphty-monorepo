# Custom palettes

A palette is a named, ordered list of colour anchors that a style layer ramps a value through. The
element ships seventeen; `registerPalette` adds yours, and from that moment it is reachable
everywhere a built-in name is.

A company with a brand does not have viridis. Without a palette seam, the only way to paint a
graph in brand colours is to stop using the styling system and paint meshes by hand -- which loses
the legend, the saved document and the layer stack all at once.

## The whole of it

A palette is plain data. Nothing in the element ever asks a palette for behaviour: the categorical
index path, the continuous interpolation, the step table, the over-subscription refusal, the
legend and the reversal flag are all implemented by code that reads six fields. So the unit you
register is those six fields.

```ts
import { type PaletteDescriptor, registerPalette } from "@graphty/graphty-element/extend";

const ACME_HEAT: PaletteDescriptor = {
    id: "acme-heat",
    plainName: "Acme Deep Sea to Sunrise",
    kind: "sequential",
    // Write anchors however your design system exports them: six-digit hex, three- or
    // eight-digit hex, a CSS colour name, rgb(), hsl() or oklch(). They are normalised to
    // six-digit hex once, at registration.
    colors: ["#0B1D51", "#1B7F79", "oklch(0.7 0.15 30)", "#F2A65A", "#F7F056"],
    // null for sequential and diverging; the number of colours for categorical.
    capacity: null,
    // A claim about your own palette, taken on trust and reported unedited to a reader.
    colorblindSafe: ["deuteranopia", "tritanopia"],
};

registerPalette(ACME_HEAT);
```

A categorical palette declares its capacity, and the two must agree:

```ts
const ACME_TEAMS: PaletteDescriptor = {
    id: "acme-teams",
    plainName: "Acme Four Teams",
    kind: "categorical",
    colors: ["#1B6CA8", "#E07A1F", "rebeccapurple", "#3F8F5B"],
    capacity: 4,
    colorblindSafe: ["deuteranopia"],
};

registerPalette(ACME_TEAMS);
```

## Painting with it

Name the palette in a colour binding, exactly as you would name `viridis`:

```ts
import type { LayerSpec } from "@graphty/graphty-element/session";

const byHeat: LayerSpec = {
    name: "Heat",
    target: "node",
    selector: { match: "everything" },
    encode: {
        "node.color": { by: "data.heat", scale: "linear", domain: [0, 100], palette: "acme-heat" },
    },
};

await session.styles.add(byHeat);
```

Or let `encode()` derive the layer from a run's result:

```ts
await session.styles.encode({ run: runId, channel: "node.color", palette: "acme-heat" });
```

Either way the palette is yours from there on: the ramp interpolates between your anchors, the
legend names your palette and shows your swatches, `reverse: true` sends the smallest value to the
far end, and a saved document records the name.

## What a registered palette inherits

Everything, because all of it is palette-agnostic once a descriptor resolves:

- the categorical index path and the continuous interpolation path;
- the lazily built ramp table, so a layer that paints six elements builds six colours;
- the `E_CAP_EXCEEDED` refusal when a categorical palette is asked to name more groups than it has
  colours -- it never wraps group eight round onto group zero's colour;
- the legend's block kind, palette name, reversal note and swatches;
- the missing-value policy: `missing: "skip"` leaves an unmeasured element whatever the layers
  below it painted, and `missing: { value: "#cccccc" }` paints it that colour;
- a round trip through `styles.toDocument()` and `styles.applyTemplate()`.

## Finding it again

```ts
import { paletteDescriptor, palettesOfKind } from "@graphty/graphty-element/catalog";

paletteDescriptor("acme-heat")?.plainName;   // "Acme Deep Sea to Sunrise"
palettesOfKind("categorical");               // the element's own, then yours
session.catalog.palettes();                  // every palette a picker may offer
```

## Saved documents carry your palette

`styles.toDocument()` writes the descriptor of every palette its layers name that the element does
not itself ship, so a saved look is self-describing: whoever opens it can see exactly which
palettes it needs.

Applying a document that names a palette nothing has registered is refused with
`E_UNKNOWN_PALETTE`, and the message says to register it first. Register the palette, then apply
the document.

## How it is refused

Registration validates at the door, and every refusal is a `GraphtyError` naming the field:

| What is wrong | Code |
| --- | --- |
| An anchor that is not a colour | `E_BAD_COMMAND`, `details.field` is `colors` |
| A `capacity` that contradicts the `kind` | `E_BAD_COMMAND`, `details.field` is `capacity` |
| No id, or no colours | `E_BAD_COMMAND` |
| An id the element itself ships | `E_DUPLICATE_PLUGIN` |

And afterwards:

| What is wrong | Code |
| --- | --- |
| A layer, an `encode()` call or a document names a palette nothing registered | `E_UNKNOWN_PALETTE`, with `details.available` |
| A categorical palette is asked to name more groups than it has colours | `E_CAP_EXCEEDED` |

```ts
import { isGraphtyError } from "@graphty/graphty-element/extend";

try {
    registerPalette({ ...ACME_HEAT, colors: ["not a colour"] });
} catch (error) {
    if (isGraphtyError(error) && error.code === "E_BAD_COMMAND") {
        console.error(error.details.field, error.message);
    }
}
```

## Deliberate limits

**A palette takes no options.** `PaletteDescriptor` is the only catalogue descriptor with no
`options` field, because every knob -- scale, domain, clamp, midpoint, reverse, missing, bins --
belongs to the binding rather than to the palette. No built-in palette takes configuration either.

**The element's default palettes are fixed.** `viridis` for a continuous encoding, `okabe-ito` for
a categorical one, `blue-highlight` for a highlight: these are what `encode()` writes when no
palette is named, and there is no hook to change them. Changing them would change what every
already-saved document means. Name your palette in the call.

**The colour-blindness claim is taken on trust**, exactly as the element takes its own palettes'.
Computing the answer for you would have the element overrule you about your own palette. A picker
that wants to verify can compute it itself.

**The function-style helpers are not a seam.** `sequential.viridis(v)` and its siblings are an
older palette vocabulary with no link to the catalogue, and they wrap a categorical value by
modulo where a registered palette refuses. Use `catalog.palettes()`.
