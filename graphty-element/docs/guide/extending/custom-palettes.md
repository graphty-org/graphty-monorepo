# Custom palettes

Available from graphty-element 3.0.

A palette is a named list of colours that a style layer paints with. The element ships eighteen
(viridis, okabe-ito and the rest); `definePalette` adds yours, and from then on it is offered and
used everywhere a built-in one is.

## Your first palette

Brand colours for groups, and a brand ramp for amounts:

```ts
import { definePalette } from "@graphty/graphty-element/extend";

definePalette({
    id: "acme-brand",
    kind: "categorical",
    colors: ["#0B1D51", "#1B7F79", "#F2A65A", "#E07A1F", "#7A3E9D"],
});
definePalette({ id: "acme-brand-ramp", kind: "sequential", colors: ["#E8F1FA", "#1B7F79", "#0B1D51"] });
```

**Use it** -- make them the colours every colour binding uses when it names none:

```ts
element.setDefaultPalettes({ categorical: "acme-brand", sequential: "acme-brand-ramp" });
```

Call it before you load data or add style layers: a default is looked up when a layer is written,
so the layer records `acme-brand` by name and a saved document keeps its meaning. A layer that
names its own palette is never touched.

That is all: no capacity, no plain name, nothing else is needed. `kind` is `"categorical"` (one
colour per group), `"sequential"` (a ramp for an amount, low to high) or `"diverging"` (a ramp
through a middle value); give a ramp at least two colours. Colours are anything CSS understands --
hex, `rgb()`, `hsl()`, `oklch()`, a colour name. Palettes are opaque: an alpha channel
(`#0B1D5180`, `rgb(27 127 121 / 50%)`) is discarded.

A helper function that sets the defaults takes the element as `DefaultPaletteControls` (from
`@graphty/graphty-element/extend`), the part of it that chooses palettes, so the helper's module
needs no renderer types.

### What the element does for you

- **Lists it.** The palette appears in the catalogue beside the built-ins
  (`element.session.catalog.palettes()`), named from its id -- `acme-brand` reads "Acme brand" --
  so every palette picker offers it. Pass `name` to choose the name yourself.
- **Paints with it.** Any colour binding may name it (`palette: "acme-brand"`), exactly as it
  names `viridis`; the legend shows your swatches, and `reverse: true` turns a ramp round.
- **Normalises your colours** to six-digit hex once, so the renderer, the legend and a saved
  document all read the same values.
- **Colours groups in a fixed order.** Groups take the palette's colours in order, largest group
  first, ties broken by name: the most common department gets your first colour. Order the colours
  by how much you want each one seen.
- **Never wraps a categorical palette.** Five colours name five groups. A sixth group is not given
  the first colour again: the layer paints nothing and the console says why, with the code
  `E_CAP_EXCEEDED` ("more groups than colours"). Give
  a brand palette as many colours as the groupings it will colour.
- **Makes no colour-blindness claim for you.** Add `colorblindSafe: ["deuteranopia"]` only when you
  have checked it; the element takes the claim on trust.

### How to run it

With a bundler, import `definePalette` from `@graphty/graphty-element/extend` as above. On a page
with no build step, import it from the bundle:

```html
<graphty-element id="graph"></graphty-element>
<script type="module">
    import { definePalette } from "https://cdn.jsdelivr.net/npm/@graphty/graphty-element@3/dist/graphty.bundle.js";

    definePalette({ id: "acme-brand", kind: "categorical", colors: ["#0B1D51", "#1B7F79", "#F2A65A"] });
    document.getElementById("graph").setDefaultPalettes({ categorical: "acme-brand" });
</script>
```

The same call exists on a headless session as `session.styles.setDefaultPalettes(...)`.

### Mistakes, and what they say

Every mistake is refused by the `definePalette` call itself, as a `GraphtyError` with the code
`E_BAD_COMMAND` ("invalid definition") and `details.field` naming the member at fault. The message
starts with the call and your id:

| You wrote                                        | The element says                                                                              |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `colors: ["var(--brand-navy)"]`                  | `definePalette("acme-brand"): ...` -- a `var()` is not resolved; read the token first (below) |
| a token read before its stylesheet loaded (`""`) | refused the same way, so a too-early read fails loudly                                        |
| `colors: ["navvy"]`                              | the colour it could not read, quoted                                                          |
| `kind: "qualitative"`                            | `"kind"` must be `"categorical"`, `"sequential"` or `"diverging"`                             |
| `id: "Acme Brand"`                               | an id is lower-case words joined by hyphens, led by your own prefix                           |
| `colorblindSafe: ["deuteranomaly"]`              | a claim lists `"deuteranopia"`, `"protanopia"` or `"tritanopia"`                              |
| `id: "viridis"`                                  | `E_DUPLICATE_PLUGIN`: the element ships that one                                              |

**Colours from design tokens.** Read each token's value first, after the stylesheet that defines
it has loaded (a module script that runs after the page's stylesheets, or on `DOMContentLoaded`):

```ts
import { definePalette } from "@graphty/graphty-element/extend";

const token = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

definePalette({ id: "acme-token-brand", kind: "categorical", colors: [token("--brand-navy"), token("--brand-teal")] });
```

### When you need more

There is little the simple form cannot do: `name`, `description` and `colorblindSafe` are members
of the definition. The advanced form below registers the full descriptor object directly, for
palettes you build or load as data (a design-system export, a saved document). A palette defined
with `definePalette` IS such a descriptor once registered, so everything below applies to it too.

## Advanced: the palette descriptor

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
    // No colour-vision claim: the element takes one on trust and never checks it, so make one
    // only for a palette you have tested.
    colorblindSafe: [],
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
    colorblindSafe: [],
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

paletteDescriptor("acme-heat")?.plainName; // "Acme Deep Sea to Sunrise"
palettesOfKind("categorical"); // the element's own, then yours
session.catalog.palettes(); // every palette a picker may offer
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

| What is wrong                            | Code                                           |
| ---------------------------------------- | ---------------------------------------------- |
| An anchor that is not a colour           | `E_BAD_COMMAND`, `details.field` is `colors`   |
| A `capacity` that contradicts the `kind` | `E_BAD_COMMAND`, `details.field` is `capacity` |
| No id, or no colours                     | `E_BAD_COMMAND`                                |
| An id the element itself ships           | `E_DUPLICATE_PLUGIN`                           |

And afterwards:

| What is wrong                                                                | Code                                          |
| ---------------------------------------------------------------------------- | --------------------------------------------- |
| A layer, an `encode()` call or a document names a palette nothing registered | `E_UNKNOWN_PALETTE`, with `details.available` |
| A categorical palette is asked to name more groups than it has colours       | `E_CAP_EXCEEDED`                              |

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

**The element's own defaults are `ylorbr` and `okabe-ito`** -- `ylorbr` for a continuous encoding,
`okabe-ito` for a categorical one -- until `setDefaultPalettes` names yours. A default is looked
up when a layer is WRITTEN and the layer records the palette it got, so changing the default never
changes what an already-saved document means. `setDefaultPalettes(palettes, { reapply: true })`
re-resolves the layers that took the old default; without it, a call made after such layers exist
writes a warning naming them. A binding on groups (an `ordinal` scale) takes the `categorical`
default, a binding with a `midpoint` takes the `diverging` one, and any other binding on amounts
takes the `sequential` one. The highlight default, `blue-highlight`, has no slot and stays fixed.

**The colour-blindness claim is taken on trust**, exactly as the element takes its own palettes'.
Computing the answer for you would have the element overrule you about your own palette. A picker
that wants to verify can compute it itself.

**The function-style helpers are not a seam.** `sequential.viridis(v)` and its siblings are an
older palette vocabulary with no link to the catalogue, and they wrap a categorical value by
modulo where a registered palette refuses. Use `catalog.palettes()`.
