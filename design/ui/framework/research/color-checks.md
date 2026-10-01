# Colour checks for the graph surface

Measurements behind `visual-language.md` Part B: the selection ring, the unstyled greys, the
default palettes on both canvas backgrounds, and the menu surface over a dark canvas. It is
evidence, not authority. The scripts that produced the numbers are reproduced in full in section
8, so every table here can be regenerated.

Status of each question, in one place:

| Question | Status |
|---|---|
| Method and results of the first round of checks | recorded (sections 1 to 3) |
| A default ramp and a default group palette that work on both canvases | measured; recommendation in section 4 |
| Does the #1e1e1e dark canvas stay, or move one step from the menu surface | contrast measured (section 5); the review of a dark bare embed with a menu open over a dense graph has NOT been run |
| The two-tone ring in 3D, in XR and over passthrough | worst case derived (section 6); the calibration in a running 3D scene and in the element's `xr` test project has NOT been run |
| Does the size channel default to a square-root scale | answered from the source: no, it defaults to linear (section 7) |
| Timed table tasks at the size where the table takes over | not run; conditional (section 7) |
| Does a reader who hides the legend still need the drawn count | not run; the task is written (section 7) |
| The ring against all 18 palettes (116 colours, ramps included), band order, an accent outer band | measured (section 9): the neutral pair holds, but only with the band order set by the canvas, or a third band |
| Every palette colour against both canvases at 3:1 | measured (section 9): 67 slots fail on light, 33 on dark |
| First-click ring study, set-kind glyph recognition, menu review, XR calibration, table timing | protocols written, none run (section 10): each needs people or a running scene |
| A highlight and the selection ring on one node; a width-only or recoloured highlight in a coloured edge set | measured (section 9.5): two neutral pairs in the same order pass everywhere; a colour outline under the ring and a width-only edge highlight do not |

## 1. Inputs

- **Canvas backgrounds.** Light `#F5F5F5` (whitesmoke, the element's default background,
  `graphty-element/src/config/GraphStyle.ts`). Dark `#1E1E1E`, which is not in the element's code
  today: it is the earlier round's proposed dark default (`design/ui/object-first-ux/visual-language.md`
  4.6) and is also Figma's menu and tooltip surface (`--color-bg-menu`, `--color-bg-tooltip`,
  `design/ui/figma/right-sidebar-selection/README.md`; compact-mantine's `design/figma-spec.md`
  on the Figma branch, `--cm-bg-menu`, same in both themes).
- **Palette colours.** Every categorical and binary palette the element ships
  (`graphty-element/src/config/palettes/categorical.ts` and `binary.ts`: okabe-ito, tol-vibrant,
  tol-muted, pastel, carbon, and the blue, green and orange highlight pairs) plus the overflow
  grey `OTHER_GROUP_COLOR` `#505050`: 39 distinct colours. Ramps from `sequential.ts` and
  `diverging.ts`.
- **Accent.** Figma's brand blue, `#0D99FF` in the light theme and `#0C8CE9` in the dark
  (compact-mantine `figma-spec.md`, `--cm-bg-brand`).
- **Tol's YlOrBr**, nine colours `#FFFFE5 #FFF7BC #FEE391 #FEC44F #FB9A29 #EC7014 #CC4C02
  #993404 #662506`. Tol's guidance: for other counts, interpolate the continuous version and pick
  equidistant points (Paul Tol's colour schemes, as reproduced in the khroma package documentation).

## 2. Formulas

The colour science is the same as in `graphty-element/test/catalog/default-palette-quality.test.ts`,
so a number here and a number in that test mean the same thing.

- **sRGB to linear.** `c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ^ 2.4`, per channel in 0..1.
- **OKLab** (Ottosson 2020). Linear RGB to LMS by the published matrix, cube root, then the second
  matrix to L, a, b. The coefficients are in the script.
- **Delta E.** Euclidean distance in OKLab, times 100. On this scale the element's test treats 15
  as "apart for normal vision" and 6 as "apart under colour blindness, given a second cue" (in a
  graph the second cue is position: a group's nodes sit together).
- **Colour-blindness simulation.** Machado, Oliveira and Fernandes (2009), severity 1.0,
  protanopia and deuteranopia, applied as a 3x3 matrix in linear RGB with each channel clamped to
  0..1, before the conversion to OKLab. "CVD Delta E" below is the smaller of the protan and the
  deutan distance.
- **Contrast.** WCAG 2 relative luminance `Y = 0.2126 R + 0.7152 G + 0.0722 B` on linear channels,
  and the ratio `(Y_light + 0.05) / (Y_dark + 0.05)`. WCAG 1.4.11 asks 3:1 for the parts of a
  graphic needed to understand it.
- **Two-colour indicators.** WCAG technique C40: if the two bands of an indicator have at least 9:1
  contrast with each other, at least one band has 3:1 against any solid background, provided each
  band is at least 2 CSS pixels thick. The worst case against any solid colour is the square root of
  the band-to-band ratio (the background whose luminance sits at the geometric middle of the two).

## 3. First round: results

### 3.1 The selection ring

Accent-based two-tone rings, checked against the canvas and against each of the 39 palette colours.
"Fails" counts palette colours where neither band reaches 3:1.

| Canvas | Outer / inner | Band ratio | Best band vs canvas | Palette colours failing |
|---|---|---|---|---|
| light | accent `#0D99FF` / white | 2.99:1 | 2.74:1 | 18 of 39, worst 1.76:1 |
| light | accent / black | 7.02:1 | 19.26:1 | 5 of 39, worst 2.69:1 |
| light | accent / `#1A1A1A` | 5.82:1 | 15.96:1 | 5 of 39, worst 2.57:1 |
| dark | accent `#0C8CE9` / white | 3.53:1 | 16.67:1 | 17 of 39, worst 1.92:1 |
| dark | accent / black | 5.94:1 | 4.72:1 | 5 of 39, worst 2.47:1 |
| dark | accent / `#1A1A1A` | 4.93:1 | 4.72:1 | 5 of 39, worst 2.25:1 |

The five colours an accent-and-black ring cannot separate are the dark ones: `#882255`, `#6929C4`,
`#005D5D`, `#9F1853` and `#505050`. No accent-based pair reaches C40's 9:1. Black and white
(21:1) and `#1A1A1A` and white (17.4:1) do, and pass against all 39 colours on both canvases
(weakest 4.82:1 against `#0077BB` with a black outer band; `research/document-set-trials.md`
section 2 has the full comparison with today's gold halo).

A search of 4,096 colours (every sRGB channel in steps of 17) for a single reserved hue that clears
3:1 on both canvases and stays Delta E 15 from all 39 palette colours and 6 under colour blindness
found three, all violet (`#AA33FF`, `#BB00FF`, `#BB11FF`), each barely over the floors. Against
Okabe-Ito alone, 139 pass. A single-colour selection mark is therefore possible only if the
reserved colour is checked against every palette a reader can pick, and it would still fail 3:1
against some node fills; the two-tone ring does not have that dependency.

### 3.2 Greys for unstyled nodes and edges

3:1 against both canvases needs a luminance between 0.14 and 0.27, which is the greys `#6A6A6A` to
`#8E8E8E`.

| Grey | Light | Dark | Delta E from `#505050` | Nearest categorical colour (Delta E) | CVD Delta E to nearest |
|---|---|---|---|---|---|
| `#6366F1` (today's unstyled node, not a grey) | 4.10 | 3.73 | 25.6 | 11.8 (`#1192E8`) | 7.0 |
| `#FFFFFF` (today's unstyled edge) | 1.09 | 16.67 | 56.9 | 12.0 (`#FFF099`) | 11.7 |
| `#8A8A8A` | 3.17 | 4.83 | 20.2 | 10.6 (`#44AA99`) | 2.0 |
| `#808080` | 3.62 | 4.22 | 16.9 | 11.1 (`#009988`) | 1.4 |
| `#767676` | 4.17 | 3.67 | 13.5 | 12.0 (`#009988`) | 1.1 |
| `#707070` | 4.54 | 3.37 | 11.4 | 12.9 (`#009988`) | 3.2 |
| `#6B6B6B` | 4.89 | 3.13 | 9.7 | 12.0 (`#005D5D`) | 2.5 |

Every grey tested that clears 3:1 on both canvases is under Delta E 13 from some shipped categorical colour
and under 3.2 under colour blindness. An unstyled grey node will read as "a desaturated group"
next to some palette. That is acceptable only because an unstyled node and a coloured group are
never meant to be the same thing; the legend must list the unstyled grey when a colour encoding
leaves nodes unmatched. `#7C7C7C` to `#808080` sits closest to equal contrast on both canvases
(3.6 to 4.2).

### 3.3 Palettes on each canvas

Categorical: the lowest contrast any colour of the palette has against the canvas, and the colours
under 1.5:1 (the element's test floor, which exempts a palette's last slot).

| Palette | Light: lowest | Under 1.5:1 on light | Dark: lowest | Under 1.5:1 on dark |
|---|---|---|---|---|
| okabe-ito (default) | 1.21 | yellow `#F0E442` (last slot, exempt) | 1.26 | **black `#000000` (slot 7 of 8, not exempt)** |
| tol-vibrant | 1.76 | none | 3.21 | none |
| tol-muted | 1.48 | `#DDCC77` | 1.37 | `#332288` |
| pastel | 1.06 | four colours | 5.84 | none |
| carbon | 3.06 | none | 2.16 | none |

Ramps: contrast of the step closest to the canvas, and anchors under 2:1 (the element's floor for
the palest step of the default ramp).

| Ramp | Light: closest | Anchors under 2:1 on light | Dark: closest | Anchors under 2:1 on dark |
|---|---|---|---|---|
| ylorbr (default) | 2.61 | none | 1.45 | `#662506` (the top value) |
| viridis | 1.16 | three (the yellow end) | 1.09 | three (the purple end) |
| plasma | 1.05 | two | 1.11 | two |
| inferno | 1.36 | two | 1.07 | four |
| blues, greens, oranges | 1.01 to 1.05 | four or five (the pale end) | 1.31 to 1.74 | one (the dark end) |
| purple-green, blue-orange, red-blue | 1.02 | four or five (the pale middle) | 1.27 to 2.43 | none or one |

No shipped ramp keeps every step at 2:1 on both canvases. Both of the element's defaults fail the
dark canvas: Okabe-Ito through its black, YlOrBr through its darkest step, which is the highest
value.

## 4. Re-run: default palettes for both canvases

### 4.1 YlOrBr trimmed for both canvases

Tol's nine colours were interpolated linearly in OKLab (1,001 samples), the stretch where every
sample clears a floor on both canvases was kept, and five equidistant anchors were taken from it.

| Version | Anchors, low to high | Light | Dark | Adjacent Delta E (normal / protan / deutan) | Hue spread |
|---|---|---|---|---|---|
| today | `#EF7818 #D85A09 #B84203 #8E3104 #662506` | 2.61 to 10.51 | 5.85 to **1.45** | 8.0-9.8 / 7.2-8.7 / 7.8-9.8 | 11 deg |
| **2:1 on both** | `#FA9828 #EE7718 #D75908 #B44103 #8B3005` | 2.01 to 7.64 | 7.61 to 2.00 | 7.8-9.6 / 8.1-8.7 / 6.9-9.6 | 22 deg |
| 2.5:1 on both | `#F17D1B #E56810 #D45606 #BE4603 #A43904` | 2.50 to 6.08 | 6.10 to 2.51 | 5.2-6.2 / 5.5-5.8 / 4.9-6.3 | 13 deg |
| 3:1 on both | `#E66911 #DC5F0B #D35305 #C74902 #B74203` | 3.01 to 5.08 | 5.08 to 3.01 | 3.0-3.7 / 3.1-3.4 / 3.0-3.7 | 6 deg |

**Choice: the 2:1 trim.** It passes every rule the element's test applies to the default ramp
(palest step at least 2:1 and darkest at most 12:1 on the light canvas, lightness falling
monotonically, hue spread under 40 degrees) and adds the same 2:1 floor on the dark canvas. Adjacent
steps stay about as far apart as today's, including under colour blindness, because the ramp is
carried by lightness. The stricter floors squeeze the ramp: at 3:1 on both, neighbouring steps are
3 to 4 Delta E apart and the scale stops reading as "how much".

**What the trim does not fix.** The ramp darkens as the value grows. On the light canvas the top
value stands out most; on the dark canvas it stands out least (2.00:1, against 7.61:1 for the
lowest). "More" reads as "less" on a dark canvas. The options are a ramp that reverses its
lightness per background (which breaks "the app theme never changes a data colour" unless the
background belongs to the saved Look rather than the app theme, as `document-architecture.md` 7.3
recommends), or accepting the inversion and relying on the legend. This needs the dark bare-embed
review in section 5 before it is settled.

### 4.2 A replacement for Okabe-Ito's black

The black slot is 1.26:1 on the dark canvas and is not the exempt last slot. Candidates were checked
against the other seven Okabe-Ito colours, the overflow grey `#505050` and the accent, with the
element test's floors (Delta E 15 normal, 6 under colour blindness) and 2:1 on both canvases.

| Candidate | Light | Dark | Delta E to other seven (normal / CVD) | To `#505050` (normal / CVD) | To accent | To trimmed ramp (normal / CVD) | Result |
|---|---|---|---|---|---|---|---|
| `#000000` (today) | 19.26 | 1.26 | 54.8 / 53.4 | 43.1 / 43.1 | 65.0 | -- | fails dark |
| `#999999` (an older copy) | 2.61 | 5.85 | 11.8 / 1.9 | 25.2 / 25.2 | 17.9 | -- | fails |
| `#882255` wine | 8.00 | 1.91 | 23.7 / 14.9 | 14.5 / 0.7 | 31.8 | -- | fails |
| `#7B61FF` violet | 3.86 | 3.97 | 16.9 / 11.7 | 28.4 / 27.1 | 13.4 | -- | too near the accent |
| `#BBBBBB` light grey | 1.76 | 8.68 | 13.1 / 8.9 | 36.1 / 36.1 | 22.0 | -- | fails |
| `#AA0000` dark red | 7.11 | 2.15 | 16.9 / 15.8 | 19.3 / 10.5 | 37.6 | 7.0 / 1.7 | passes, but collides with the default ramp |
| `#992200` brick | 7.46 | 2.05 | 17.8 / 17.3 | 16.0 / 10.1 | 36.2 | 3.2 / 0.9 | passes, but collides with the default ramp |
| `#5E35B1` deep purple | 7.35 | 2.08 | 16.0 / 8.3 | 18.6 / 16.9 | 21.9 | 25.9 / 25.7 | passes |
| **`#6929C4` purple** | 7.09 | 2.16 | 18.2 / 8.0 | 22.2 / 19.3 | 22.5 | 28.6 / 28.0 | **passes** |

Of the 4,096-colour grid, 287 colours pass every floor. The ones with the largest colour-blind
margin are dark reds, but a dark red category is under 2 Delta E from the default ramp's upper
steps under colour blindness, so a graph that colours groups on nodes and a measurement on edges
would show the two as one. **Choice: `#6929C4`**, which is already a shipped colour (the first
colour of the element's carbon palette), has the largest normal-vision margin among the passing
purples, and is a hue no other Okabe-Ito colour takes (reddish purple `#CC79A7` reads as pink, 18.2
apart). Its colour-blind margin (8.0) is the smallest in the palette but clears the element's
floor. The palette would no longer be "Okabe-Ito as published", so it needs a new id or a documented
departure (see `one-way-doors.md`, the default palette colours).

The overflow grey `#505050` is 2.07:1 on the dark canvas: over a 2:1 floor, but only just.

## 5. The dark canvas against the menu surface

Figma's menus are `#1E1E1E` in both themes, the same colour as the proposed dark canvas, so a menu
open over the canvas has no background step at all. What separates it is the dark theme's elevation
(`--cm-elevation-400`, dark column: two black drop shadows, which do not show on a near-black
canvas, and an inset 1 px white hairline at 35% opacity with a 1 px blur).

The hairline composites to about `#6D6D6D` over `#1E1E1E`.

| Canvas | vs menu `#1E1E1E` | Hairline vs canvas | White text on canvas |
|---|---|---|---|
| `#1E1E1E` (proposed) | 1.00 | 3.22 | 16.67 |
| `#181818` (one step darker) | 1.07 | 3.43 | 17.76 |
| `#141414` | 1.11 | 3.56 | 18.42 |
| `#232323` (one step lighter) | 1.06 | 3.04 | 15.72 |
| `#2C2C2C` (Figma's dark panel) | 1.19 | 2.70 | 13.97 |

No single step gives the menu body a visible contrast from the canvas (every value is under 1.2:1).
The edge carries the separation, and the edge is best on a darker canvas: moving LIGHTER, towards
`#2C2C2C`, drops the hairline under 3:1 and makes the canvas the same colour as the side panels.
If the review shows a menu merging into the canvas, the step to take is darker (`#181818` or
`#141414`), and every dark-canvas number in sections 3 and 4 must be re-run, because the ramp's top
value and the palette's darkest colour get closer to the background.

**Not run.** The review this table cannot replace: a bare graphty-element embed in the dark theme,
a dense graph (several thousand nodes, edges crossing behind the menu's edge, the default group
palette), a menu open over it, shown to a person who is asked, without being told what is being
tested: "Where does the menu end?" and "Is anything behind the menu part of the menu?". Build it as
a Storybook story in graphty-element and run the review twice, with the canvas at `#1E1E1E` and at
`#181818`. It was not run because the browser automation server did not connect in this session.

## 6. The two-tone ring in 3D, XR and passthrough

**Derived.** By C40, a black and white ring keeps at least 4.58:1 (the square root of 21) against
ANY solid colour behind it, and a `#1A1A1A` and white ring at least 4.17:1. An accent-and-black
ring guarantees only 2.65:1 (light accent) or 2.44:1 (dark accent), under 3:1. So over an AR
passthrough background, which can be any colour, only the black and white pair (or `#1A1A1A` and
white) holds 3:1 without knowing the background.

**What the derivation does not cover, and what the calibration must measure.**

- **Band thickness on screen.** C40's guarantee needs each band at least 2 CSS pixels thick. In 3D
  a ring drawn at a fixed world size thins with distance; a node far from the camera gets bands
  under 2 px, and at 1 px or less anti-aliasing mixes the two bands into a mid-grey that fails.
  Measure, in a 3D scene, the camera distance at which each band reaches 2 px, and whether the ring
  needs a screen-space minimum width.
- **Passthrough is not solid.** A camera image has texture and edges under the ring, so "against
  any solid colour" is the best case. Measure over photographs with high-frequency texture
  (foliage, text, a patterned floor) as well as flat walls.
- **XR headsets.** Pixels per degree are lower than a desktop monitor's, so 2 CSS pixels is not the
  right unit; the band should be stated in angular size (arc-minutes) and measured in the
  element's `xr` test project on the emulated headset.
- **The combined three-ring story.** When one node carries three marks at once (for example its
  own selection ring, the fainter outline of a selected set's members, and a highlight), the rings
  nest.
  Each must keep its own two bands at 2 px or wider, and adjacent marks must not merge into one
  band. Measure the smallest node radius at which three rings still separate.

**Not run.** The calibration needs a running 3D scene and the `xr` test project; the browser
automation server did not connect in this session. Until it runs, the ring's thickness and scale are
unmeasured, and only its colours (black and white, or `#1A1A1A` and white) are supported by numbers.

## 7. Other open questions

**Does the size channel default to a square-root scale? No.** When a caller binds `node.size` to a
number and names no scale, the element uses a linear scale: `defaultScaleFor` returns `"linear"` for
any number or colour channel (`graphty-element/src/session/styles/encoding.ts`, line 942), and
`defaultScale` returns `"linear"` for a numeric field unless the result shape makes it a group
(`session/styles/EncodingSpec.ts`, line 187). A square-root scale exists (`"sqrt"`, labelled "By
Area" in `catalog/scales.ts`) but is used only when named. Node size is a length, so a linear default
makes a node with twice the value cover four times the area on screen (and eight times the volume
in 3D). Whether the default
should become square root is a published default behaviour (`one-way-doors.md`, the size default).

**Timed table tasks at the size where the table takes over from the canvas.** Not run, and run
only if a compact row density is reopened for the data table. If it is, time a
reader finding the node with the highest value of an attribute, and counting the members of a
group, in the table and on the canvas, at the graph size where the state matrix hands the lead to
the table, in both densities.

**Does a reader who hides the legend still need the drawn count?** Not run. One first-click task on a rendered legend story: the
reader is shown a filtered graph drawn with level of detail (fewer nodes drawn than the filter
keeps), with the legend hidden, and asked "How many nodes does this view include, and are all of
them drawn?". Success is finding both numbers without reopening the legend. If readers cannot, the
drawn count must live somewhere other than the legend (the canvas status line), because "the
drawing budget is never silent" (`visual-language.md`) has to hold with the legend closed.

**How many highlights can be told apart at once? About four, unverified.** An earlier draft of the
state matrix reported the smallest CIEDE2000 difference between any two of the first colours of
graphty's categorical palettes (`graphty-element/src/config/palettes/categorical.ts`) under
Machado 2009 simulation at full severity: Okabe-Ito falls to 13 at five colours under
deuteranopia, and Tol vibrant to 9 at three colours under tritanopia, below the usual comfort
level of about 10. It also reported Okabe-Ito black against the dark canvas at a difference of 7,
and the gold halo default beside Okabe-Ito orange and yellow as too close. The script was not kept,
and these checks use OKLab, not CIEDE2000, so the figures are unverified until a script in section
8 reproduces them. The neutral highlight mark (`canvas-drawing.md` 6) no longer depends on them; the palette floor in B4 does.

## 8. The scripts

All three run from `graphty-element/` with `npx tsx <file>`. The first imports the palette files, so it
follows them if they change; the others copy the colours they test.

### 8.1 First round

```ts
// Colour measurements for design/ui/framework/visual-language.md. Maths copied from
// graphty-element/test/catalog/default-palette-quality.test.ts (OKLab dE x100, Machado 2009, WCAG 2).
import * as cat from "/home/apowers/Projects/graphty-monorepo/graphty-element/src/config/palettes/categorical";
import * as bin from "/home/apowers/Projects/graphty-monorepo/graphty-element/src/config/palettes/binary";
import * as seq from "/home/apowers/Projects/graphty-monorepo/graphty-element/src/config/palettes/sequential";
import * as div from "/home/apowers/Projects/graphty-monorepo/graphty-element/src/config/palettes/diverging";

type Rgb = [number, number, number];
const M: Record<string, Rgb[]> = {
    protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
};
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const rgb = (h: string): Rgb => [0, 2, 4].map((i) => lin(parseInt(h.replace("#", "").slice(i, i + 2), 16) / 255)) as Rgb;
function oklab([r, g, b]: Rgb): Rgb {
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const sim = (c: Rgb, mx: Rgb[]) => mx.map((r) => Math.max(0, Math.min(1, r[0] * c[0] + r[1] * c[1] + r[2] * c[2]))) as Rgb;
const dE = (a: string, b: string, v?: string) => {
    const f = (h: string) => oklab(v ? sim(rgb(h), M[v]) : rgb(h));
    const [x, y] = [f(a), f(b)];
    return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};
const Y = (h: string) => { const [r, g, b] = rgb(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a: string, b: string) => { const [h, l] = [Y(a), Y(b)].sort((x, y) => y - x); return (h + 0.05) / (l + 0.05); };
const f2 = (n: number) => n.toFixed(2);
const hex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

const LIGHT = "#F5F5F5", DARK = "#1E1E1E", CANVASES = { light: LIGHT, dark: DARK };
const CATS: Record<string, readonly string[]> = {
    "okabe-ito": cat.OKABE_ITO_COLORS, "tol-vibrant": cat.TOL_VIBRANT_COLORS, "tol-muted": cat.TOL_MUTED_COLORS,
    pastel: cat.PASTEL_COLORS, carbon: cat.CARBON_COLORS,
    "blue-highlight": [bin.BLUE_HIGHLIGHT.highlighted, bin.BLUE_HIGHLIGHT.muted],
    "green-highlight": [bin.GREEN_SUCCESS.highlighted, bin.GREEN_SUCCESS.muted],
    "orange-highlight": [bin.ORANGE_WARNING.highlighted, bin.ORANGE_WARNING.muted],
};
const ALL = [...new Set([...Object.values(CATS).flat(), cat.OTHER_GROUP_COLOR].map((h) => h.toUpperCase()))];
console.log(`palette colours: ${ALL.length}`);

// ---- 1. two-tone ring with the accent ----
console.log("\n== 1. accent two-tone ring ==");
const ACCENTS = { light: "#0D99FF", dark: "#0C8CE9" } as const;
const PARTNERS = ["#FFFFFF", "#000000", "#1A1A1A"];
for (const [canvas, bg] of Object.entries(CANVASES)) {
    const acc = ACCENTS[canvas as "light" | "dark"];
    for (const p of PARTNERS) {
        for (const [outer, inner] of [[acc, p], [p, acc]]) {
            const between = cr(outer, inner);
            // C40 as written: 9:1 between the bands. Per-neighbour reading (as in trials section 2):
            // for the canvas and for each node colour, at least one band clears 3:1.
            const bgOk = Math.max(cr(outer, bg), cr(inner, bg));
            const fails = ALL.filter((c) => Math.max(cr(outer, c), cr(inner, c)) < 3);
            const adjFails = ALL.filter((c) => cr(inner, c) < 3);
            const worst = ALL.reduce((w, c) => Math.min(w, Math.max(cr(outer, c), cr(inner, c))), 99);
            console.log(`${canvas} outer ${outer} inner ${inner}: bands ${f2(between)}:1 (C40 needs 9) | vs canvas best ${f2(bgOk)} outer-alone ${f2(cr(outer, bg))} | node fails either-band ${fails.length}/39 worst ${f2(worst)} [${fails.join(" ")}] | inner-alone fails ${adjFails.length}/39`);
        }
    }
}
console.log("reference black/white", f2(cr("#000000", "#FFFFFF")), "#1A1A1A/white", f2(cr("#1A1A1A", "#FFFFFF")));
console.log("accent vs white", f2(cr(ACCENTS.light, "#FFFFFF")), f2(cr(ACCENTS.dark, "#FFFFFF")), "accent vs black", f2(cr(ACCENTS.light, "#000000")), f2(cr(ACCENTS.dark, "#000000")));

// ---- 2. unstyled greys ----
console.log("\n== 2. unstyled greys ==");
const GREYS = ["#6366F1(today)", "#FFFFFF(edge today)", "#9E9E9E", "#8A8A8A", "#808080", "#767676", "#757575", "#707070", "#6B6B6B", "#666666", "#5A5A5A", "#A0A0A0", "#B0B0B0"];
const cats37 = [...new Set(Object.entries(CATS).filter(([k]) => !k.includes("highlight")).flatMap(([, v]) => v).map((h) => h.toUpperCase()))];
for (const g0 of GREYS) {
    const g = g0.slice(0, 7);
    const minCat = cats37.reduce((m, c) => (dE(g, c) < m[0] ? [dE(g, c), c] : m), [99, ""] as [number, string]);
    const minCvd = cats37.reduce((m, c) => Math.min(m, dE(g, c, "protan"), dE(g, c, "deutan")), 99);
    console.log(`${g0.padEnd(20)} light ${f2(cr(g, LIGHT))} dark ${f2(cr(g, DARK))} | dE other#505050 ${f2(dE(g, "#505050"))} | min dE to categorical ${f2(minCat[0])} (${minCat[1]}) | min CVD dE ${f2(minCvd)} | 3:1 both ${cr(g, LIGHT) >= 3 && cr(g, DARK) >= 3}`);
}
// Band of luminance clearing 3:1 on both canvases
console.log(`3:1 on both needs Y in [${f2(3 * (Y(DARK) + 0.05) - 0.05)}, ${f2((Y(LIGHT) + 0.05) / 3 - 0.05)}]`);
for (let v = 0x50; v <= 0xa0; v += 2) {
    const g = hex(v, v, v);
    if (cr(g, LIGHT) >= 3 && cr(g, DARK) >= 3) console.log(`  grey ${g} passes both: ${f2(cr(g, LIGHT))} / ${f2(cr(g, DARK))}, dE other ${f2(dE(g, "#505050"))}`);
}

// ---- 3. highlight hues ----
console.log("\n== 3. highlight hues ==");
const hueCheck = (h: string) => {
    const minN = ALL.reduce((m, c) => Math.min(m, dE(h, c)), 99);
    const minC = ALL.reduce((m, c) => Math.min(m, dE(h, c, "protan"), dE(h, c, "deutan")), 99);
    return { minN, minC, l: cr(h, LIGHT), d: cr(h, DARK) };
};
for (const h of ["#0072B2", "#009E73", "#E69F00", "#FFD700", "#FF00FF", "#00E5FF", "#C6FF00", "#FF1493", "#7B61FF", "#00C853"]) {
    const r = hueCheck(h);
    console.log(`${h}: light ${f2(r.l)} dark ${f2(r.d)} | min dE ${f2(r.minN)} | min CVD dE ${f2(r.minC)}`);
}
// exhaustive sRGB grid, step 17 (16 levels per channel = 4096 colours)
let found = 0, bestDE: [number, string] = [0, ""];
const step = 17;
for (let r = 0; r <= 255; r += step) for (let g = 0; g <= 255; g += step) for (let b = 0; b <= 255; b += step) {
    const h = hex(r, g, b);
    const x = hueCheck(h);
    if (x.l >= 3 && x.d >= 3) {
        if (x.minN > bestDE[0]) bestDE = [x.minN, h + ` cvd ${f2(x.minC)}`];
        if (x.minN >= 15 && x.minC >= 6) { found++; if (found <= 10) console.log(`  PASS ${h} dE ${f2(x.minN)} cvd ${f2(x.minC)} light ${f2(x.l)} dark ${f2(x.d)}`); }
    }
}
console.log(`grid colours clearing 3:1 on both canvases, dE>=15 and CVD dE>=6 from all 39: ${found}; best dE among 3:1-both: ${f2(bestDE[0])} ${bestDE[1]}`);
// relaxed: dE >= 15 only against okabe-ito (the default)
let foundOk = 0;
for (let r = 0; r <= 255; r += step) for (let g = 0; g <= 255; g += step) for (let b = 0; b <= 255; b += step) {
    const h = hex(r, g, b);
    if (cr(h, LIGHT) >= 3 && cr(h, DARK) >= 3 && cat.OKABE_ITO_COLORS.every((c) => dE(h, c) >= 15 && dE(h, c, "protan") >= 6 && dE(h, c, "deutan") >= 6)) foundOk++;
}
console.log(`same test against okabe-ito only: ${foundOk}`);

// ---- 4. palette quality on each canvas ----
console.log("\n== 4. palette legibility per canvas ==");
const SEQ: Record<string, readonly string[]> = {
    viridis: seq.VIRIDIS_COLORS, ylorbr: seq.YLORBR_COLORS, plasma: seq.PLASMA_COLORS, inferno: seq.INFERNO_COLORS,
    blues: seq.BLUES_COLORS, greens: seq.GREENS_COLORS, oranges: seq.ORANGES_COLORS,
    "purple-green": div.PURPLE_GREEN_COLORS, "blue-orange": div.BLUE_ORANGE_COLORS, "red-blue": div.RED_BLUE_COLORS,
};
for (const [id, cols] of Object.entries(CATS)) for (const [cv, bg] of Object.entries(CANVASES)) {
    const bad = cols.filter((c) => cr(c, bg) < 1.5);
    const badNotLast = cols.slice(0, -1).filter((c) => cr(c, bg) < 1.5);
    const min = Math.min(...cols.map((c) => cr(c, bg)));
    console.log(`categorical ${id.padEnd(17)} ${cv.padEnd(5)} min ${f2(min)} | under 1.5:1: ${bad.length ? bad.map((c) => `${c}(${f2(cr(c, bg))})`).join(" ") : "none"}${badNotLast.length !== bad.length ? " [last slot exempt in test]" : ""}`);
}
for (const [id, cols] of Object.entries(SEQ)) for (const [cv, bg] of Object.entries(CANVASES)) {
    const rs = cols.map((c) => cr(c, bg));
    const min = Math.min(...rs), max = Math.max(...rs);
    const faint = cols.filter((c) => cr(c, bg) < 2);
    console.log(`ramp ${id.padEnd(13)} ${cv.padEnd(5)} closest end ${f2(min)} farthest ${f2(max)} | anchors under 2:1: ${faint.length ? faint.join(" ") : "none"}${max > 12 ? " | ends past 12:1" : ""}`);
}
```

### 8.2 Re-run: both canvases

```ts
// Re-run: a YlOrBr trimmed for both canvases, and a replacement for Okabe-Ito's black slot.
// Maths as in graphty-element/test/catalog/default-palette-quality.test.ts.
type Rgb = [number, number, number];
const M: Record<string, Rgb[]> = {
    protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
};
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const rgb = (h: string): Rgb => [0, 2, 4].map((i) => lin(parseInt(h.replace("#", "").slice(i, i + 2), 16) / 255)) as Rgb;
const oklab = ([r, g, b]: Rgb): Rgb => {
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const fromOklab = ([L, a, b]: Rgb): string => {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const lr = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
    return "#" + lr.map((c) => Math.round(Math.max(0, Math.min(1, gam(c))) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
};
const sim = (c: Rgb, mx: Rgb[]) => mx.map((r) => Math.max(0, Math.min(1, r[0] * c[0] + r[1] * c[1] + r[2] * c[2]))) as Rgb;
const dE = (a: string, b: string, v?: string) => {
    const f = (h: string) => oklab(v ? sim(rgb(h), M[v]) : rgb(h));
    const [x, y] = [f(a), f(b)];
    return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};
const dEall = (a: string, b: string) => Math.min(dE(a, b, "protan"), dE(a, b, "deutan"));
const Y = (h: string) => { const [r, g, b] = rgb(h); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const cr = (a: string, b: string) => { const [h, l] = [Y(a), Y(b)].sort((x, y) => y - x); return (h + 0.05) / (l + 0.05); };
const hue = (h: string) => { const [, a, b] = oklab(rgb(h)); return ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360; };
const f1 = (n: number) => n.toFixed(1), f2 = (n: number) => n.toFixed(2);
const LIGHT = "#F5F5F5", DARK = "#1E1E1E";
const hex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

// ---- A. YlOrBr trimmed for both canvases ----
const TOL_YLORBR = ["#FFFFE5", "#FFF7BC", "#FEE391", "#FEC44F", "#FB9A29", "#EC7014", "#CC4C02", "#993404", "#662506"];
const TODAY = ["#EF7818", "#D85A09", "#B84203", "#8E3104", "#662506"];
const labs = TOL_YLORBR.map((h) => oklab(rgb(h)));
const at = (t: number): string => { // continuous scheme, linear in OKLab between Tol's nine anchors
    const x = t * 8, i = Math.min(7, Math.floor(x)), u = x - i;
    return fromOklab(labs[i].map((v, k) => v + (labs[i + 1][k] - v) * u) as Rgb);
};
const report = (name: string, cols: string[]) => {
    console.log(`\n${name}: ${cols.join(" ")}`);
    console.log("  light " + cols.map((c) => f2(cr(c, LIGHT))).join(" ") + " | dark " + cols.map((c) => f2(cr(c, DARK))).join(" "));
    const adj = cols.slice(1).map((c, i) => [dE(cols[i], c), dE(cols[i], c, "protan"), dE(cols[i], c, "deutan")]);
    console.log("  adjacent dE normal " + adj.map((a) => f1(a[0])).join(" ") + " | protan " + adj.map((a) => f1(a[1])).join(" ") + " | deutan " + adj.map((a) => f1(a[2])).join(" "));
    const hs = cols.map(hue); console.log(`  hue spread ${f1(Math.max(...hs) - Math.min(...hs))} deg; OKLab L ${cols.map((c) => f2(oklab(rgb(c))[0])).join(" ")}`);
};
report("YlOrBr today", TODAY);
for (const floor of [2, 2.5, 3]) {
    const ok: number[] = [];
    for (let i = 0; i <= 1000; i++) { const c = at(i / 1000); if (cr(c, LIGHT) >= floor && cr(c, DARK) >= floor) ok.push(i / 1000); }
    if (!ok.length) { console.log(`\nfloor ${floor}: no step of YlOrBr clears it on both`); continue; }
    const [t0, t1] = [ok[0], ok[ok.length - 1]];
    report(`YlOrBr, every step >= ${floor}:1 on both canvases (t ${f2(t0)}..${f2(t1)})`, [0, 1, 2, 3, 4].map((k) => at(t0 + ((t1 - t0) * k) / 4)));
}

// ---- B. a replacement for Okabe-Ito black ----
const OI7 = ["#E69F00", "#56B4E9", "#009E73", "#0072B2", "#D55E00", "#CC79A7", "#F0E442"];
const OTHER = "#505050", ACC = ["#0D99FF", "#0C8CE9"];
const score = (c: string) => ({
    c, l: cr(c, LIGHT), d: cr(c, DARK),
    n: Math.min(...OI7.map((o) => dE(c, o))), cvd: Math.min(...OI7.map((o) => dEall(c, o))),
    other: dE(c, OTHER), otherCvd: dEall(c, OTHER), acc: Math.min(...ACC.map((a) => dE(c, a))),
});
const line = (s: ReturnType<typeof score>) => `${s.c}  light ${f2(s.l)} dark ${f2(s.d)} | min dE to other 7 ${f1(s.n)} cvd ${f1(s.cvd)} | vs #505050 ${f1(s.other)} cvd ${f1(s.otherCvd)} | vs accent ${f1(s.acc)}`;
console.log("\n== B. Okabe-Ito slot 6 candidates ==");
for (const c of ["#000000", "#999999", "#505050", "#882255", "#AA3377", "#6929C4", "#7B61FF", "#8C564B", "#A6761D", "#BBBBBB", "#FFFFFF"]) console.log(line(score(c)));
const pass: ReturnType<typeof score>[] = [];
for (let r = 0; r <= 255; r += 17) for (let g = 0; g <= 255; g += 17) for (let b = 0; b <= 255; b += 17) {
    const s = score(hex(r, g, b));
    if (s.l >= 2 && s.d >= 2 && s.n >= 15 && s.cvd >= 6 && s.other >= 15 && s.otherCvd >= 6 && s.acc >= 15) pass.push(s);
}
pass.sort((a, b) => b.cvd - a.cvd);
console.log(`grid (4096 colours) passing: 2:1 both canvases, dE>=15 / CVD>=6 from the other seven, from #505050 and from the accent: ${pass.length}`);
for (const s of pass.slice(0, 12)) console.log("  " + line(s));
// Other checks on the dark canvas
console.log(`\n#505050 on dark ${f2(cr(OTHER, DARK))}; yellow #F0E442 on dark ${f2(cr("#F0E442", DARK))}`);

// ---- C. shortlist: violets against the grid's reds, and against the trimmed ramp ----
console.log("\n== C. shortlist ==");
const RAMP2 = ["#FA9828", "#EE7718", "#D75908", "#B44103", "#8B3005"];
for (const c of ["#6929C4", "#5E35B1", "#6A3D9A", "#7040C0", "#663399", "#5B2A86", "#AA0000", "#992200"]) {
    const s = score(c);
    const ramp = Math.min(...RAMP2.map((r) => dE(c, r))), rampCvd = Math.min(...RAMP2.map((r) => dEall(c, r)));
    const pass = s.l >= 2 && s.d >= 2 && s.n >= 15 && s.cvd >= 6 && s.other >= 15 && s.otherCvd >= 6 && s.acc >= 15;
    console.log(`${line(s)} | vs trimmed ramp ${f1(ramp)} cvd ${f1(rampCvd)} | hue ${f1(hue(c))} | ${pass ? "PASS" : "fail"}`);
}
```

### 8.3 Menu step and ring worst cases

```ts
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const Y = (h: string) => { const v = [0, 2, 4].map((i) => lin(parseInt(h.slice(1).slice(i, i + 2), 16) / 255)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const cr = (a: string, b: string) => { const [h, l] = [Y(a), Y(b)].sort((x, y) => y - x); return ((h + 0.05) / (l + 0.05)).toFixed(2); };
for (const c of ["#1E1E1E", "#181818", "#141414", "#111111", "#232323", "#2C2C2C", "#383838"]) console.log(c, "vs menu #1E1E1E", cr(c, "#1E1E1E"), "| hairline #6D6D6D vs canvas", cr("#6D6D6D", c), "| white text", cr("#FFFFFF", c));
for (const [a, b] of [["#000000", "#FFFFFF"], ["#1A1A1A", "#FFFFFF"], ["#0D99FF", "#000000"], ["#0C8CE9", "#000000"]]) { const r = Number(cr(a, b)); console.log(a, b, "bands", r.toFixed(2), "worst case vs any solid colour", Math.sqrt(r).toFixed(2)); }
```

## Sources

- `graphty-element/test/catalog/default-palette-quality.test.ts` (formulas and floors)
- `graphty-element/src/config/palettes/*.ts`, `src/config/GraphStyle.ts`
- `graphty-element/src/session/styles/encoding.ts`, `EncodingSpec.ts`, `scales.ts`; `src/catalog/scales.ts`
- compact-mantine `design/figma-spec.md` on the Figma branch (surfaces, accent, elevation)
- `design/ui/figma/right-sidebar-selection/README.md`, `header-and-modes/README.md` (menu surface)
- `design/ui/object-first-ux/visual-language.md` 4.5 and 4.6 (the proposed canvases)
- `research/document-set-trials.md` section 2 (today's halo), `research/graphty-today.md` 7.17
- W3C, WCAG 2.2 Technique C40, https://www.w3.org/WAI/WCAG22/Techniques/css/C40
- Paul Tol's colour schemes (YlOrBr), as reproduced at https://cran.r-project.org/web/packages/khroma/vignettes/tol.html
- Ottosson, "A perceptual color space for image processing" (2020), and Machado, Oliveira and Fernandes, "A Physiologically-based Model for Simulation of Color Vision Deficiency" (2009), as implemented in the element's test

## 9. Second round: every shipped palette

The first round checked 39 colours (the categorical and binary palettes). This round reads all 18
palettes through `PALETTE_DESCRIPTORS` in `graphty-element/src/catalog/palettes.ts`, ramps and
diverging schemes included, plus the overflow grey: 116 distinct colours. Script:
`research/scripts/ring-and-canvas-contrast.ts` (run from `graphty-element/` with `npx tsx`); it
imports the catalogue, so it follows the palettes if they change.

### 9.1 The ring, band by band

"Any band" is the first round's measure: the better of the two bands against a colour, which is the
right measure when the colour could sit behind either band (an overlapping node). The C40 floor is
the worst case against any solid colour.

| Ring (outer / inner) | Canvas | Band ratio | C40 floor | Colours where neither band reaches 3:1 | Weakest |
|---|---|---|---|---|---|
| black / white | both | 21.00 | 4.58 | 0 of 116 | 4.60 (`#CF4446`) |
| `#1A1A1A` / white | both | 17.40 | 4.17 | 0 of 116 | 4.31 (`#D94801`) |
| accent / white | light | 2.99 | 1.73 | 54 | 1.75 (`#9ECAE1`) |
| accent / white | dark | 3.53 | 1.88 | 47 | 1.90 (`#92C5DE`) |
| accent / black | light | 7.02 | 2.65 | 10 | 2.67 (`#08519C`) |
| accent / black | dark | 5.94 | 2.44 | 12 | 2.45 (`#762A83`) |
| accent / `#1A1A1A` | light / dark | 5.82 / 4.93 | 2.41 / 2.22 | 16 / 18 | 2.53 / 2.22 |

Okabe-Ito's two blues, the ones most likely to be confused with a blue accent: the accent outer band
measures 1.73:1 (light) and 1.47:1 (dark) against `#0072B2`, and 1.30:1 and 1.53:1 against
`#56B4E9`. On a node of either colour an accent band is carried entirely by its partner band. The
ramps widen the first round's result: the accent-and-black failures now include the dark ends of
blues, plasma, viridis, purple-green and the default ramp (`#08519C`, `#8B0AA5`, `#3E4989`,
`#762A83`, `#8E3104`).

### 9.2 The ring as a mark apart from its node

"Any band" hides a real failure. A band marks the node only if it has 3:1 against BOTH of its
neighbours: the inner band against the node fill and the outer band, the outer band against the
inner band and the canvas. If neither band is outlined that way, the inner band merges with the fill
and the outer band merges with the canvas, and the selected node just looks larger.

| Bands, inside to outside | Light canvas: colours failing | Dark canvas: colours failing |
|---|---|---|
| white, black (the ring as `canvas-drawing.md` 2 states it) | 0 | **54 of 116**, `#56B4E9` among them |
| white, `#1A1A1A` | 0 | 54 |
| black, white | 25 | 0 |
| **dark band outermost on light, light band outermost on dark** | **0** | **0** |
| white, black, white | 0 | 0 |
| black, white, black | 0 | 0 |
| white, accent | 116 | 0 |
| black, accent | 25 | 0 |
| **white, black, accent** (a neutral pair inside an accent outer band) | **0** | **0** |
| black, white, accent | 25 | 0 |

The mechanism: on the dark canvas a black outer band is 1.26:1 against `#1E1E1E` and disappears, so
the ring rests on white against the fill, and white is under 3:1 against the 54 light colours (every
pastel, the pale half of each ramp, Okabe-Ito's sky blue, orange and yellow). On the light canvas
the mirror case fails the dark colours.

**Recommendation for B2.** Keep the neutral pair and set the band order by the canvas: the dark band
outermost on a light canvas, the light band outermost on a dark one. "Light" and "dark" canvas
means the canvas's own luminance, not the app theme, so a custom background picks its order by
contrast (whichever band has more contrast against it goes outside). A three-band ring passes
without that rule but costs a third band's width on every node. An accent outer band is possible
only outside a white-then-black pair (white, black, accent): the black band is then outlined by
white (21:1) and the accent (7.02 and 5.94:1). The accent adds nothing to the contrast; it only
ties the mark to the chrome's accent, at the cost of a third band, and on a blue node (`#0072B2`,
`#56B4E9`, the blues ramp) it reads as part of the fill. The existing C40 argument in B2 is correct about solid
backgrounds of one colour, not about a band between two different colours.

### 9.3 Every palette colour against each canvas at 3:1

| Palette | Under 3:1 on light `#F5F5F5` | Under 3:1 on dark `#1E1E1E` |
|---|---|---|
| viridis | 4 of 10 (yellow-green end, to 1.16) | 4 of 10 (purple end, to 1.09) |
| ylorbr (default ramp) | 1 of 5 (`#EF7818` 2.61) | 2 of 5 (`#8E3104` 2.06, `#662506` 1.45) |
| plasma | 3 of 8 | 3 of 8 |
| inferno | 3 of 9 | 5 of 9 |
| blues | 5 of 9 | 2 of 9 |
| greens | 6 of 9 | 2 of 9 |
| oranges | 6 of 9 | 2 of 9 |
| okabe-ito (default groups) | 4 of 8 (`#E69F00` 2.07, `#56B4E9` 2.12, `#CC79A7` 2.81, `#F0E442` 1.21) | 1 of 8 (`#000000` 1.26) |
| tol-vibrant | 3 of 7 | 0 |
| tol-muted | 4 of 9 | 3 of 9 |
| pastel | **8 of 8** (1.06 to 2.62) | 0 |
| carbon | 0 | 3 of 5 (2.16 to 2.17) |
| purple-green | 6 of 9 | 1 of 9 |
| blue-orange | 5 of 9 | 2 of 9 |
| red-blue | 5 of 10 | 3 of 10 |
| blue-highlight | 1 of 2 (`#CCCCCC` 1.47) | 0 |
| green-highlight | 1 of 2 (`#999999` 2.61) | 0 |
| orange-highlight | 2 of 2 | 0 |

67 slots fail on the light canvas and 33 on the dark. Only 26 of the 116 colours reach 3:1 on both.
The expected failures hold -- pastel fails the light canvas entirely and Okabe-Ito's black is the
default group palette's only failure on dark -- but they are not the only ones: Okabe-Ito also has
four colours under 3:1 on light, carbon fails dark three times, and every sequential and diverging
scheme fails one canvas or the other at its pale or dark end, which is inherent in a ramp that
spans lightness. 3:1 is therefore a floor for marks that must be found (the selection ring, the
unstyled grey), not for data fills; the element's test keeps its 1.5:1 and 2:1 floors for fills,
and a palette's picker entry should say which canvas it suits.

### 9.4 Checks to add to the element's palette-quality test

`graphty-element/test/catalog/default-palette-quality.test.ts` checks only the defaults on the
light background. Proposed additions, using its existing `contrast` helper (not written here: this
folder does not change code):

```ts
import { PALETTE_DESCRIPTORS } from "../../src/catalog/palettes";

const CANVASES = { light: "#f5f5f5", dark: "#1e1e1e" } as const;
const allColours = [...new Set([...PALETTE_DESCRIPTORS.flatMap((p) => p.colors), OTHER_GROUP_COLOR].map((c) => c.toLowerCase()))];

/** A band marks its node only if it has 3:1 against both neighbours. Bands inside to outside. */
function outlined(fill: string, bands: readonly string[], canvas: string): boolean {
    const seq = [fill, ...bands, canvas];
    return bands.some((_, k) => contrast(seq[k + 1], seq[k]) >= 3 && contrast(seq[k + 1], seq[k + 2]) >= 3);
}

describe("the selection ring", () => {
    for (const [name, canvas] of Object.entries(CANVASES)) {
        // replace with the element's ring colours once they are exported
        const bands = name === "light" ? ["#ffffff", "#000000"] : ["#000000", "#ffffff"];
        it(`stands apart from every shipped palette colour on the ${name} canvas`, () => {
            const failing = allColours.filter((c) => !outlined(c, bands, canvas));
            assert.deepEqual(failing, [], `ring ${bands.join("/")} on ${canvas}`);
        });
    }
});

describe("the default group palette on the dark canvas", () => {
    it("keeps every colour but the last visible (>= 1.5:1)", () => {
        // fails today on Okabe-Ito black (1.26:1) until the slot is replaced
    });
});
```

A second block checks two marks on one element: every mark must have a band outlined by both of
its neighbours, and the two bands where one mark meets the next must be 3:1 apart, or they fuse
into one wider band and two marks read as one.

```ts
type Verdict = "ok" | "unoutlined" | "fused";
/** Marks listed inside to outside, each a list of bands. */
function twoMarks(fill: string, marks: readonly (readonly string[])[], canvas: string): Verdict {
    const seq = [fill, ...marks.flat(), canvas];
    let at = 1;
    for (let k = 0; k < marks.length; k++) {
        const idx = marks[k].map((_, j) => at + j);
        if (!idx.some((i) => contrast(seq[i], seq[i - 1]) >= 3 && contrast(seq[i], seq[i + 1]) >= 3)) return "unoutlined";
        at += marks[k].length;
        if (k < marks.length - 1 && contrast(seq[at - 1], seq[at]) < 3) return "fused";
    }
    return "ok";
}

describe("a highlight and the selection ring on the same node", () => {
    for (const [name, canvas] of Object.entries(CANVASES)) {
        const pair = name === "light" ? ["#ffffff", "#000000"] : ["#000000", "#ffffff"];
        it(`keeps both marks apart on every shipped colour, ${name} canvas`, () => {
            const failing = allColours.filter((c) => twoMarks(c, [pair, pair], canvas) !== "ok");
            assert.deepEqual(failing, []);
        });
    }
});

describe("a highlighted edge in a coloured edge set", () => {
    it("is not carried by edge.width alone", () => {
        // documents the known failure: a width-only highlight is unseen on every edge colour under
        // 3:1 against the canvas (58 on light, 32 on dark), so the highlight must be a casing
    });
    it("is not a recolour that lands within 15 (OKLab x100) of a shipped colour", () => {
        // fails today: the default highlight #0072B2 is within 15 of 11 shipped colours
    });
});
```

The ring test should read its colours from the element once the marks are published (door 47);
until then the hex values are the proposal, and the dark-canvas test documents the known
Okabe-Ito failure rather than skipping it.

### 9.5 Two marks on one element

Script: section 5 of `research/scripts/ring-and-canvas-contrast.ts`, over the same 116 colours. A
combination fails for a colour when a mark has no band with 3:1 against both neighbours
("unoutlined"), or when the bands where two marks meet are under 3:1 apart ("fused": the two marks
merge into one wider band). The selection pair uses the canvas-set order from 9.2 (white then
black on light, black then white on dark). `#0072B2` is the element's highlight colour today
(the first colour of `blue-highlight`, read by `StylesApi.ts`).

| Node, marks inside to outside | Light: unoutlined / fused | Dark: unoutlined / fused |
|---|---|---|
| highlight as a `#0072B2` outline, then the selection pair | 85 / 0 | 85 / 0 |
| **selection pair, then a highlight pair in the same order** | **0 / 0** | **0 / 0** |
| selection pair, then a highlight pair in reverse order | 54 / 62 | 25 / 91 |
| selection pair, then a one-band `#0072B2` outline outside it | 0 / 0 | 0 / 0 |
| selection pair, then a white, black, white highlight | 0 / 0 | 25 / 91 |

| Edge in a coloured set | Light | Dark |
|---|---|---|
| highlight by `edge.width` only: edge colours under 3:1 against the canvas, where the added width is not seen | 58 of 116 | 32 of 116 |
| highlight by recolouring to `#0072B2`: shipped colours within 15 of it | 11 of 115 (both canvases; `#2171B5` at 1.2, `#0077BB` at 1.9, `#2166AC` at 3.3) | same |
| two-tone casing around the coloured edge; selection casing plus highlight casing | 0; 0 | 0; 0 |

What it means. A highlight drawn as a colour outline at the silhouette disappears as soon as the
node is also selected: the ring's inner band sits against it, and blue against white or black is
not a band with 3:1 on both sides for most fills. Two neutral pairs nest safely only when the
highlight repeats the selection's order, so the neutral dark and light bands alternate; reversing
the order fuses the two middle bands, and a three-band highlight must start with the band opposite
the selection's outer band. A single `#0072B2` band outside the selection pair passes, because the
pair outlines it on the inside and it clears 3:1 against both canvases (4.76 and 3.21); this is
the only colour result here, and it holds only while the neutral pair sits inside it.
For edges, width alone is not a highlight in a coloured set: half the shipped colours cannot show
their own width on the light canvas. Recolouring to the element's blue collides with the blues,
viridis and carbon slots and overwrites the analyst's colour, which is the collision B5 forbids.
A two-tone casing passes on every colour, alone or nested with the selection casing. Contrast
cannot say whether readers see a width step or a dash as a second mark: that is the timed
discrimination task in section 10.

## 10. Studies that need a person

None of these can be settled by a script or by an image model (which transcribes but does not judge
visibility). Each is written so it can be run as soon as the named fixture exists.

**Dark bare embed with a menu open.** Fixture: a graphty-element Storybook story, dark theme, bare
embed (no app chrome), 3,000 to 5,000 nodes with the default group palette, a menu at elevation 400
(`--cm-elevation-400`, dark: two black shadows and a 35% white inset hairline, about 3.22:1 against
the canvas) open over a region where edges cross its border. Two variants, canvas `#1E1E1E` and
`#181818`, between subjects, five people each. Ask, without saying what is tested: "Where does the
menu end?" (trace the edge with the pointer) and "Is anything behind the menu part of the menu?".
Pass: at least 4 of 5 trace the edge within the hairline and answer no. If `#1E1E1E` fails and
`#181818` passes, re-run sections 3, 4 and 9 at `#181818`.

**First-click: find the selected node.** Fixtures: the same 300-node layout drawn twice, once with
the blues ramp and once with Okabe-Ito, on each canvas; one node selected, placed at a random
position per trial, on a fill chosen to be hard (`#56B4E9` and `#0072B2` for Okabe-Ito; the pale
and dark ends of blues). Conditions, within subjects and counterbalanced: the neutral ring with the
canvas-set band order, and the accent ring (accent outer, white inner). Task: "Click the selected
node." Record first-click correctness and time to click. Eight people, eight trials per condition.
Pass for a ring: 90% correct and a median under 3 seconds on both palettes and both canvases.
Section 9 predicts the accent ring fails on the light canvas and on `#56B4E9`; the study checks
that the prediction matches what readers do, and whether the canvas-set order is enough.

**Recognition of the set-kind glyph.** Fixture: a Sets list of eight rows, half fixed sets and half
rule sets, in two variants between subjects: the kind shown by a glyph modifier (the set glyph with
a rule mark) and the kind shown only by a state word in secondary text ("rule", "fixed"). Tasks:
"Which of these sets will change if the graph changes?" and "Freeze this set so it stops
changing" (checks that the reader finds the freeze action from the kind). Pass: 80% correct on the
first task with no hover. If the modifier alone scores under the word, keep the word and drop the
modifier (`visual-language.md` already declines a second glyph family for rarely needed information); if
both pass, keep the one with the lower error rate.

**Ring calibration in 3D, XR and passthrough.** In graphty-element's `xr` test project (IWER
emulated headset) and a desktop 3D scene: step the camera distance and record where each band
drops under 2 CSS pixels on desktop and under the equivalent angular size in the headset; record
the node radius below which three nested rings (selected, member, highlight) stop separating; then
render the ring over photographs with high-frequency texture (foliage, text, a patterned floor) as
the passthrough background and re-check that at least one band reads. Output: a minimum band width
in screen space (px on desktop, arc-minutes in XR) and a node-size cut-off below which rings are
dropped, both fed back into B6.

**Table timing before any density change.** Fixture: the data table with 5,000 rows at today's
32 px row pitch. Tasks: find the node with the highest value of an attribute, count the members of
a group, and find a named node. Five people, three trials each, time and errors. Record this
baseline first; a compact density is considered only if a second run at the compact pitch beats the
baseline by 20% on time with no rise in errors.

### 10.1 What each pass mark can and cannot show

- **Menu review, 4 of 5.** With five people this is a screening test, not an estimate: 4 of 5 is
  consistent with a true rate anywhere from about 38% to 96% (Wilson 95% interval). Its value is the
  failure it catches: if two of five cannot trace the menu's edge at `#1E1E1E`, the canvas moves.
  Show each person only one canvas, as written, since a second viewing teaches where to look.
- **First-click ring study, 90% and a median under 3 s.** Eight people by eight trials is 64 trials
  per condition. 58 of 64 correct (90.6%) has a Wilson 95% lower bound of about 81%, so a ring
  that passes is shown to be at least roughly four in five, not nine in ten. Compare the two rings
  per person (within subjects), not pooled, since the trials of one person are not independent.
  Section 9.5 adds a case the study should include: a selected node that also carries a highlight,
  so the task is "find the selected node" with the second mark present.
- **Set-kind glyph, 80% with no hover.** 80% sits between the two standard comprehension
  criteria for symbols: ISO 9186 suggests 66.7% and ANSI Z535.3 requires 85%. The framework's
  80% is a reasonable middle for an in-product glyph that also has a text form. Section 10 does not
  set a sample size; with ten people per variant, 8 of 10 has a lower bound near 49%, so run at
  least 20 per variant if the result is to decide between the glyph and the word rather than only
  to catch a glyph nobody reads.
- **Ring calibration in XR.** The desktop floor is 2 CSS pixels per band (C40). At 96 CSS px per
  inch viewed from 60 cm, one CSS pixel subtends about 1.5 arc-minutes, so 2 CSS px is about
  3 arc-minutes. A Meta Quest 3 resolves about 25 pixels per degree in VR (2.4 arc-minutes per
  pixel) and about 18 in passthrough (3.3 arc-minutes). A band must span at least two device pixels
  to survive anti-aliasing, which means about 5 arc-minutes in VR and about 7 in passthrough: more
  than twice the desktop angle. The calibration should state the minimum band in arc-minutes and
  check it at those two figures. For a ring drawn at a fixed world width `w` under a perspective
  camera, the band is `w * f / d` pixels, with `f` the focal length in pixels
  (`(viewport height / 2) / tan(vertical fov / 2)`) and `d` the camera distance, so the distance at
  which a band falls to 2 px is `w * f / 2`; the calibration measures whether a screen-space
  minimum is needed beyond that distance. Three nested marks cost at least six bands, so the node
  cut-off in B6 is at least six band widths across the ring's radius beyond the silhouette.
- **Table timing, 20% faster with no more errors.** At a 32 px pitch a 720 px viewport shows 22
  rows; at a 24 px pitch it shows 30, 36% more, so the denser layout's plausible gain is in the
  scanning tasks, not in "find a named node", which search answers at any pitch. Five people by
  three trials cannot resolve a 20% difference unless it is large and consistent; run the two
  pitches within subjects, counterbalanced, and compare each person's median time.

Sources for this section: WCAG 2.2 Technique C40 (above); Meta Quest 3 at 25 pixels per degree in
VR and 18 in passthrough, https://en.wikipedia.org/wiki/Meta_Quest_3 and
https://vr-compare.com/headset/metaquest3; ISO 9186:2001, test methods for comprehension,
https://webstore.ansi.org/standards/iso/iso91862001, and ANSI Z535.3's 85% criterion,
https://incompliancemag.com/ansi-z535-3-safety-symbols-in-focus/.
