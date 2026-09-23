# Palettes & Scales

How a measurement becomes a colour, a size or a width, and which colours the element ships.

::: warning What changed in 2.0
This page used to teach a `StyleHelpers` namespace -- `StyleHelpers.color.sequential.viridis(0.7)`
and some forty more functions -- imported from `@graphty/graphty-element`. **That namespace is not
exported and never resolves.** It existed to be in scope for a 1.x `calculatedStyle` expression,
the expression evaluator is gone, and every code block on this page threw before you saw a colour.

The colours themselves are all still here, and there are more of them. What changed is who does
the arithmetic: you used to normalise a value and call a ramp; now you name a run, a channel and a
palette, and the element reads the extent, applies the scale and paints -- in one call, on the
GPU-side paint path, with a legend that can be read back.
:::

## One call, from a measurement to a picture

`styles.encode()` binds one run's field to one channel. It is the whole API.

```typescript
const run = await element.session.runs.start("degree");

await element.session.styles.encode({
    run,
    channel: "node.color",
    palette: "viridis",
});
```

Everything except `run` and `channel` has a default the element works out: the field is the one
the run's shape declares primary, the scale is one that suits that field, the palette is
categorical for groups and continuous for measures, and the extent is the one the run actually
measured -- so a centrality between 0.01 and 0.04 uses the whole ramp rather than the bottom 4% of
it.

Name the rest when you want to overrule it:

```typescript
await element.session.styles.encode({
    run,
    field: "score",
    channel: "node.size",
    scale: "log", // power-law data
    clamp: [0.02, 0.98], // do not let two outliers flatten everything else
    missing: "skip", // leave an element the run had nothing to say about alone
    reverse: true, // smallest value at the far end of the range
});
```

Each `encode()` makes ONE layer, so a second call for the same run and channel replaces the first
rather than stacking on it. Encoding `node.color` and `node.size` from the same run gives two
layers, which is what lets a reader turn one off.

## Reading the picture back

```typescript
// What the layers add up to, as blocks and swatches: the thing to draw a legend from.
const blocks = element.session.styles.legend();

// Why one element looks the way it does, channel by channel and layer by layer.
const why = element.session.styles.explain({ node: "alice" });
```

## The palettes

Every palette is data, not a function. The catalogue is importable on its own, with no renderer
and no 3D engine behind it, so a palette picker is built from it directly:

```typescript
import { PALETTE_DESCRIPTORS, palettesOfKind, paletteDescriptor } from "@graphty/graphty-element/catalog";

palettesOfKind("sequential"); // what to offer for a measurement
paletteDescriptor("okabe-ito").colors; // the hex strings themselves
```

Each descriptor carries `id`, `plainName`, `kind`, `colors`, `capacity` (how many distinct values
it can carry, `null` when continuous) and `colorblindSafe` -- the list of colour vision
deficiencies it has been checked against, which is the fact a picker should be filtering on rather
than a footnote a reader has to remember.

### Sequential -- a measurement, low to high

| Id        | Plain name       | Safe for                             |
| --------- | ---------------- | ------------------------------------ |
| `viridis` | Purple to Yellow | deuteranopia, protanopia, tritanopia |
| `ylorbr`  | Orange to Brown  | deuteranopia, protanopia, tritanopia |
| `plasma`  | Blue to Yellow   | deuteranopia, protanopia, tritanopia |
| `inferno` | Black to Yellow  | deuteranopia, protanopia, tritanopia |
| `blues`   | Shades of Blue   | deuteranopia, protanopia, tritanopia |
| `greens`  | Shades of Green  | not checked safe                     |
| `oranges` | Shades of Orange | not checked safe                     |

`ylorbr` is the default for a measure: Paul Tol's YlOrBr ("Colour Schemes", 2021), trimmed to the
five steps that stand off the element's light background, so the palest node is still visible. It
stays inside one hue family, from orange for the lowest value to dark brown for the highest, which
reads as "how much"; a ramp that sweeps through several hues makes a sparse set of nodes read as
separate groups. `viridis`, `plasma` and `inferno` are perceptually uniform: equal steps in the
number look like equal steps in the colour, which a rainbow ramp does not.

### Categorical -- groups with no order

| Id            | Plain name             | Capacity | Safe for                             |
| ------------- | ---------------------- | -------- | ------------------------------------ |
| `okabe-ito`   | Eight Distinct Colours | 8        | deuteranopia, protanopia, tritanopia |
| `tol-vibrant` | Seven Bright Colours   | 7        | deuteranopia, protanopia, tritanopia |
| `tol-muted`   | Nine Soft Colours      | 9        | deuteranopia, protanopia, tritanopia |
| `pastel`      | Eight Pale Colours     | 8        | deuteranopia, protanopia, tritanopia |
| `carbon`      | Five Enterprise Colours| 5        | not checked safe                     |

`okabe-ito` is the default for groups: the eight colours Okabe and Ito published in 2008, black
included, with yellow in the last slot because it barely shows on a light background. Capacity is a real limit: a community detection that finds
thirty communities has more groups than any of these has colours, and the honest answers are to
colour the largest few and leave the rest alone, or to pick a different channel.

### Diverging -- values around a meaningful middle

| Id             | Plain name      | Safe for                             |
| -------------- | --------------- | ------------------------------------ |
| `purple-green` | Purple to Green | deuteranopia, protanopia, tritanopia |
| `blue-orange`  | Blue to Orange  | deuteranopia, protanopia, tritanopia |
| `red-blue`     | Red to Blue     | not checked safe                     |

Use one only when zero -- or some other midpoint -- means something. `red-blue` is in the list
because temperature data conventionally uses it, and it is the one palette here that a
red-green colour blind reader cannot separate.

### Highlight -- two states

`blue-highlight`, `green-highlight` and `orange-highlight` each carry a marked colour and a
neutral one, for "this element is in the result, that one is not".

## The scales

A scale decides how a number travels from the data's extent to the channel's range.

| Name          | Plain name            | For                                            |
| ------------- | --------------------- | ---------------------------------------------- |
| `linear`      | Even Steps            | the default for a measure                       |
| `log`         | By Order of Magnitude | power-law data: degree, followers, file sizes   |
| `sqrt`        | By Area               | sizes, where area rather than radius is read    |
| `pow`         | Curved                | when neither end needs the resolution           |
| `neglog10`    | By Significance       | p-values and similar                            |
| `quantile`    | Equal Counts          | equal numbers of elements per band              |
| `bins`        | Equal Ranges          | explicit thresholds                             |
| `ordinal`     | One Colour per Value  | groups, which have no distance between them     |
| `passthrough` | Use the Value As It Is| values already in the channel's own units       |

```typescript
import { SCALE_DESCRIPTORS, scalesForDomain } from "@graphty/graphty-element/catalog";

scalesForDomain("numeric"); // what to offer for a measurement
```

## Adding your own palette

```typescript
import { registerPalette } from "@graphty/graphty-element/extend";

registerPalette({
    id: "house-style",
    plainName: "House Style",
    kind: "categorical",
    colors: ["#1b3a5c", "#c9622b", "#4f8a6b", "#8b5fa8"],
    capacity: 4,
    colorblindSafe: [],
});
```

It then appears in `PALETTE_DESCRIPTORS`, in `palettesOfKind`, and can be named by `encode()` like
any built-in. Declare `colorblindSafe` honestly: an empty array means "not checked", which is what
a picker should show rather than an unearned tick.

See [Custom Palettes](./extending/custom-palettes) for the full contract.

## Choosing colours

**Do**

- Match the palette's kind to the data: a measurement is sequential, groups are categorical, and
  something with a meaningful middle is diverging.
- Filter a picker on `colorblindSafe` rather than trusting a memory of which palette was fine.
- Stay inside a categorical palette's `capacity`.
- Encode the same thing twice when it matters -- colour and size together survives a reader who
  cannot separate two of the colours.

**Don't**

- Use red and green for opposite meanings.
- Offer more categorical colours than a reader can hold apart -- seven to nine is the practical
  ceiling, which is why none of the built-ins goes past nine.
- Rely on colour alone to carry the finding. The legend and the labels are part of the answer.

## Interactive examples

- [Palette Picker](https://graphty.app/storybook/element/?path=/story/algorithms-palette-picker--palette-picker)
- [Centrality with Colors](https://graphty.app/storybook/element/?path=/story/algorithms-centrality--degree-centrality)
- [Community Detection](https://graphty.app/storybook/element/?path=/story/algorithms-community--louvain-community-detection)
