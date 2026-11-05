# Shader styles: shaders as graphty-element style features

Status: design, revised 2026-10-20 after five reviews (developer experience, architecture, GPU
safety and security, Style panel and first-time user, performance). Builds on the tier 3 Style
panel (`design/ui/studio/tier3/design.md`, the settled behaviors in
`design/ui/studio/tier3/decided.md`, both on branch design/studio-tier3).

A shader is a small GPU program that decides the color of each pixel of something drawn. This
document turns shaders into ordinary graphty-element styles: a style layer can draw its nodes as
glass marbles, put light running along its edges, or draw an outline around each group, and the
graphty app sets them in the Style panel the way it sets a color. Readers pick from presets the
element ships, or paste the text of their own shader.

It covers, in order: the kinds of shader and what is not a shader (section 1), how a shader
combines with the style layers beneath it (section 2), the graphty-element API (section 3), the
text format for pasted shaders (section 4), performance and iPad safety (section 5), the app
(section 6), the presets to ship with their parameters (section 7), and the build packages
(section 8). Decisions only the owner can make are in section 9; how each review finding was
handled is in section 10.

The rules this design obeys come from the repository's `CLAUDE.md`: graphty-element owns every
graph capability and the app only presents it; appearance changes only through style layers; the
element returns facts and codes (`{ code, params }`), never sentences; the simplest example fits in
about 15 lines and names no internal concept; the advanced path can do everything the element's own
presets do; the entry points `./session`, `./schema`, `./catalog`, `./extend` and `./format` stay
free of Babylon.js, Lit and the DOM; an algorithm's suggested style paints only its own result; a
default is the neutral behavior underneath, so **a graph that names no shader renders exactly as it
does today**.

---

## 1. The kinds of shader, and what is not a shader

A shader's kind says what it draws on and what it does to the drawing beneath it. The kind is a
fact in the shader's catalog entry (`ShaderDescriptor.kind`).

| Kind (code)                   | What it draws                                                        | Owner picks of this kind                                                                                                                                                                                                                            |
| ----------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node surface (`node-surface`) | The pixels of the node's own shape, lit by the scene                 | matcap Ink, Clear glass and Pearl; toon outline; halftone; glass marble; gemstone; disco ball; lantern glow; dew drop (the dew-on-silk nodes); colorblind patterns; foil shimmer; hologram; frost; plus frosted glass, liquid metal, anodized steel |
| Node sprite (`node-sprite`)   | A flat picture facing the camera, in place of the shape              | icon sticker; kaleidoscope mandala                                                                                                                                                                                                                  |
| Node effect (`node-effect`)   | A second drawing around or over the node                             | uncertainty aura; lock-on reticle; orbiting satellites; shockwave (small and fast); change flash                                                                                                                                                    |
| Edge surface (`edge-surface`) | The pixels of the edge's line                                        | fiber optic (the fiber body)                                                                                                                                                                                                                        |
| Edge effect (`edge-effect`)   | Light that travels along an edge of any route                        | comet tracers; edge glow (from bezier glow, for any edge); fiber packets; edge change (the edge half of change flash)                                                                                                                               |
| Background (`background`)     | The whole canvas behind the graph                                    | nebula backdrop                                                                                                                                                                                                                                     |
| Group boundary (`boundary`)   | One shape around each group of a layer's nodes, nested for subgroups | soap bubble; metaball hulls (goo, membrane, outline)                                                                                                                                                                                                |

The kind is named `node-sprite`, not "glyph", because `node.glyph` is already a text-glyph
channel.

**Triggered effects are ordinary effects.** Lock-on reticle, the shockwave and change flash are
node or edge effects whose motion has an entrance or a change animation (`ShaderMotion`, section
3.3). They play when an element starts carrying the effect: a reticle on a layer that matches
selected nodes plays when a node is selected (by a click, a keyboard walk or Select all). There is
no separate trigger vocabulary; the layer's selector is the trigger.

**Surface versus sprite.** A surface keeps the shape the layers beneath chose and shades its
pixels, so a gemstone on a box node is a faceted box. A sprite draws its own flat outline (a
sticker, a mandala) and the shape is not drawn. The difference decides what the panel marks as
covered (section 2).

**Not shaders.** Five of the owner's picks change geometry or motion, not pixels, so they are
channels or a registry, and they combine freely with any shader:

| Pick                                     | Becomes                                                                                                                                                          | Why not a shader                                                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| tapered edges                            | channel `edge.taper`: the width at the target as a multiple of the width at the source (default 1)                                                               | it changes the line's outline, which arrowheads and picking follow; a tapered fiber edge must be possible          |
| weight arcs (2D layout in 3D only)       | channel `edge.lift`: how far the edge's route rises out of the layout plane, in world units, bindable to data (`encode`)                                         | it changes the route, which labels, arrowheads and picking follow; the route is built on the CPU (`edgeRoute.ts`)  |
| gradient edges                           | the existing `edge.gradientColors` channel (branch feat/style-specimens) accepting the color words `source` and `target`, meaning the end nodes' resolved colors | a gradient is a color, and the channel already exists; a second gradient in a shader would be two sources of truth |
| pie and donut                            | the existing `node.pie*` channels (feat/style-specimens), drawn by a GPU renderer instead of CPU geometry (section 7.2)                                          | the channels are already the pie schema graph-io imports into                                                      |
| particle morph and the other transitions | a transition registry with JavaScript easing (`registerTransition`, section 3.7); particle morph also draws a particle drawable while it runs                    | positions are written on the CPU in `Node.update`; edges, labels, arrowheads, effects and picking read them there  |

`edge.lift` on a layout that is not flat in 3D draws no lift and is reported through the existing
"draws nothing" call with code `edge.lift-needs-flat-layout`.

**Not picked, still needed.** A bloom pass (lantern glow, comets, fiber, dew) is one shared scene
pass, allocated while any layer names a shader that declares `bloom`; it is not a kind and not a
preset. The lab's color-vision preview is a whole-canvas preview, out of scope.

---

## 2. Composition with lower style layers

Style layers stack bottom to top, and for each style value ("channel", such as `node.color`) the
highest layer that writes it wins for each element. Shaders follow that rule. Effects add one
rule: **effects stack instead of replacing each other.** Boundaries belong to their layer and
stack because layers do.

### 2.1 Per kind

| Kind         | Replaces (counts as covering)                                                                                                                                                                                                                                        | Reads from the layers beneath, as inputs                           | Keeps drawing as before                                                   | How the result combines                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Node surface | the material look: `node.flat`, `node.unlit`, `node.wireframe`, and the lighting preset's shading on these nodes                                                                                                                                                     | resolved color (with any gradient), size, opacity, shape           | shape, size, border, outline, glow, halo, label, badges, selection, hover | replaces the material's output; the author reads `n.color` to ride on the color beneath                    |
| Node sprite  | everything drawn on or as the shape: `node.shape` and its part channels, `node.image*`, `node.glyph*`, `node.stripe*`, `node.border*`, `node.cornerRadius`, `node.marker`, `node.gradient*`, `node.pie*`, `node.chart*`, `node.flat`, `node.unlit`, `node.wireframe` | resolved color, size, opacity                                      | label, outline ring, glow, halo (drawn from the radius), selection, hover | replaces; alpha 0 is outside the sprite (not drawn)                                                        |
| Node effect  | nothing                                                                                                                                                                                                                                                              | resolved color, size, element state and its times                  | everything                                                                | premultiplied alpha over (`blend: "over"`, the default) or additive (`blend: "add"`), no depth writes      |
| Edge surface | the line pattern (`edge.style`, `edge.patternCount`, `edge.waveAmplitude`, `edge.wavePeriod`)                                                                                                                                                                        | width, both end colors (with any gradient), opacity, route         | width, taper, route, arrowheads, band, labels, selection band             | replaces the line's color; the author reads `e.color` to ride on it; alpha 0 leaves that pixel transparent |
| Edge effect  | nothing                                                                                                                                                                                                                                                              | route, width, end colors, element state                            | everything                                                                | as node effects                                                                                            |
| Background   | the background color or image                                                                                                                                                                                                                                        | the scene camera                                                   | the graph                                                                 | replaces                                                                                                   |
| Boundary     | nothing                                                                                                                                                                                                                                                              | its layer's matched nodes: positions, drawn sizes, resolved colors | every node and edge                                                       | drawn behind the nodes, premultiplied alpha over                                                           |

The covering sets are one exported constant, `SHADER_KIND_COVERS` in `./catalog`, read by
`styles.agreement` and `styles.explain`, so the app never lists channels itself. On top of the
kind's set, a surface or sprite whose `reads` lacks `"color"` also covers `node.color` and the
`node.gradient*` channels on the elements it draws (the mandala takes its colors from its own
parameters, so a Fill color beneath it is reported covered rather than silently ignored); one whose
`reads` lacks `"opacity"` covers `node.opacity` the same way. Edge surfaces follow the same rule
for `edge.color`.

Picking is by the node's drawn radius on the CPU for sprites and impostor-drawn surfaces (section
5), never by a shader's alpha. A pixel of a sprite with alpha 0 is simply not drawn.

Three consequences, stated once:

- **A surface that reads color rides on the color layers.** A Degree layer colors nodes by degree,
  a Marbles layer above it sets only the glass marble surface: every marble takes its degree
  color. The Marbles layer covers nothing in Fill.
- **A sprite covers the Shape rows.** `node.shape` written beneath a sprite is not drawn on those
  nodes. The element counts it as covered, so the existing caption "Covered by Sticker on 11 of
  77" appears on the Shape row with no new mechanism. `node.size` is not covered.
- **A shader that does not draw leaves the picture beneath.** While a shader compiles, while it is
  held for approval, when it fails to compile on this device, or when the frame guard turns it
  off, the element draws exactly what the layers beneath draw, never a blank node and never
  magenta, and reports why (sections 4.4 and 5).

### 2.2 Two shaders on one element

- **Surface and sprite: last writer wins.** `node.shader` is one channel. A higher layer that sets
  it replaces a lower layer's surface or sprite on the elements both match. `"none"` is a value:
  it covers a lower shader and draws the shape plainly (as "No label" covers a label).
- **Parameters belong to their shader.** `node.shaderParams` is a map from shader id to that
  shader's parameters (`{ "glass-marble": { twist: 2 } }`), the same shape as `node.effects`. It
  merges by shader id, then by parameter, the higher layer winning per parameter. Only the set for
  the shader actually drawn applies, so a `speed` set for a lantern on a lower layer never reaches a
  liquid metal surface a higher layer switches to. A set for a shader not drawn on that element is
  reported as not in effect (`shader.param-unused`, with `shader` and `param`).
- **Effects stack in layer order, with a cap.** `node.effects` and `edge.effects` map an effect id
  to `true` (on, with its defaults), `false` (off) or its parameters. They merge by id: two layers
  that add different effects both draw; two that add the same effect merge its parameters, the
  higher layer winning per parameter; a higher layer writing `false` switches it off. Effects draw
  in the order their ids first appear, bottom layer first. An effect's height is the highest layer
  that writes it with a value other than `false`; the cap is 4 effects per element, and past it the
  4 with the highest heights draw and the rest are reported (`shader.effect-cap`, with `left` and
  `limit`). This is CSS box-shadow's list with an id per entry.
- **Boundaries stack because layers do.** A boundary is a member of its layer
  (`LayerSpec.boundary`, section 3.2): the layer's matched nodes are its members, grouped by
  `groupBy`. A community layer and a subcommunity layer above it give nested outlines. A node
  leaves a layer's outline only by leaving that layer's selector. Capped at 32 groups per graph
  (`shader.boundary-cap`, with `left` and `limit`).
- **Per-element data reaches a shader through its parameters.** A parameter declared `varies` can
  be bound per element with the existing `encode`, addressed by shader and parameter
  (`encode: { "node.effects.uncertainty-aura.intensity": { by: "data.uncertainty" } }`). Each
  effect on a node therefore has its own binding: an aura reading uncertainty and satellites
  reading degree never share a value.
- **The algorithm-style rule still holds.** A suggested style may set a shader or an effect only on
  the elements that carry its result: foil shimmer on search hits only; nothing on "everything
  else". Dimming the rest is the reader's layer, not the algorithm's.

---

## 3. The graphty-element API

Everything here is additive unless section 9 says otherwise. Names are exact. `@since` is the next
minor of graphty-element. Every new string union below carries the repository's note
`OPEN UNION: members may be added in a minor release; handle unknown members.`

### 3.1 The simple path

"Draw these nodes as glass marbles":

```html
<graphty-element
    id="g"
    node-data='[{"id":"a"},{"id":"b"},{"id":"c"}]'
    edge-data='[{"source":"a","target":"b"},{"source":"b","target":"c"}]'
>
</graphty-element>
<script type="module">
    import "@graphty/graphty-element";

    const graph = document.getElementById("g");
    await graph.session.styles.add({
        name: "Marbles",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shader": "glass-marble" },
    });
</script>
```

Fourteen lines, no internal concept: a preset named by id, set like a color. More, each one line:

- Parameters, by the ids in section 7's tables:
  `set: { "node.shader": "glass-marble", "node.shaderParams": { "glass-marble": { twist: 4 } } }`.
- An effect: `set: { "node.effects": { "orbiting-satellites": true } }`.
- A per-node parameter from data:
  `encode: { "node.shaderParams.glass-marble.spin": { by: "data.activity" } }`.
- A background: `graph.background = { backgroundType: "shader", shader: "nebula" }`.

`styles.add` refuses a shader id the catalog does not list with `E_UNKNOWN_SHADER`, listing the ids
of the right kind, as palettes refuse with `E_UNKNOWN_PALETTE`; an id of the wrong kind (an effect
id in `node.shader`) with `E_SHADER_KIND`; and a parameter id the shader does not declare with
`E_UNKNOWN_SHADER_PARAM`, listing the declared ones. A loaded style document is not refused: an id
it carries in its own `shaders` list is accepted, and an unknown or mismatched id is reported as
`shader.unknown` or `shader.kind-mismatch` through the "draws nothing" call.

### 3.2 Style channels and layer members

New rows in the channel table (`session/styles/channels.ts`). They sit in the existing `effects`
channel group (no new group value); each `ChannelDescriptor` gains the fact
`shaderKinds?: readonly ShaderKind[]`, the kinds of shader the channel names, so an editor can
route the rows without knowing channel names.

| Channel             | Value type                                              | How it merges                    | What it is                            |
| ------------------- | ------------------------------------------------------- | -------------------------------- | ------------------------------------- |
| `node.shader`       | `string`: a node-surface or node-sprite id, or `"none"` | last writer                      | the node's surface or sprite          |
| `node.shaderParams` | `ShaderParamSets`                                       | by shader id, then per parameter | parameters per shader                 |
| `node.effects`      | `ShaderEffects`                                         | by effect id, then per parameter | the node's effects                    |
| `edge.shader`       | `string`: an edge-surface id, or `"none"`               | last writer                      | the edge's surface                    |
| `edge.shaderParams` | `ShaderParamSets`                                       | by shader id, then per parameter | parameters per shader                 |
| `edge.effects`      | `ShaderEffects`                                         | by effect id, then per parameter | the edge's effects                    |
| `edge.taper`        | `number`, 0 to 4, default 1                             | last writer, `encode` allowed    | target width over source width        |
| `edge.lift`         | `number`, world units, default 0                        | last writer, `encode` allowed    | the route's rise out of a flat layout |

```ts
/** One shader's fixed parameter values, keyed by the parameter ids its catalog entry declares. */
export type ShaderParams = Readonly<Record<string, number | string | boolean>>;

/** Parameter values per shader id: only the drawn shader's set applies. */
export type ShaderParamSets = Readonly<Record<string, ShaderParams>>;

/**
 * Effects by id: `true` turns one on with its defaults, `false` switches off one a layer beneath
 * adds, an object turns it on with those parameters. The reserved key `visible: false` keeps the
 * entry and its parameters but draws nothing (an editor's eye).
 */
export type ShaderEffects = Readonly<Record<string, ShaderParams | boolean>>;
```

`ChannelValue` gains `ShaderParamSets` and `ShaderEffects` (section 9, item 3). Every key in these
maps, from any source, is checked against the identifier pattern (section 4.3) and merged into
objects made with `Object.create(null)`, so a key such as `__proto__` is refused, never merged.

**Binding a parameter per element.** An `encode` key may address a parameter declared `varies`:
`"<channel>.<shader id>.<parameter id>"` for `node.shaderParams`, `node.effects`,
`edge.shaderParams` and `edge.effects`. Without a `range`, the encoded value is mapped onto the
parameter's `[min, max]`. An integer parameter (a pattern or icon index) takes the new `"index"`
scale: each distinct value gets the next integer in the order it is first seen, and keeps it for
the life of the layer, so new data never shifts an existing node's pattern. No shader reads raw
data: palettes, scales, value tables and `combine` stay the one way data turns into a picture.

**The boundary layer member.** A boundary is drawn by the layer, not per node:

```ts
interface LayerSpec {
    // ...existing members
    /** Draw a boundary around this layer's nodes. @since next minor */
    boundary?: {
        readonly shader: string; // a boundary id
        readonly params?: ShaderParams;
        readonly groupBy?: string; // a data path; one boundary per distinct value. Unset: one boundary
    };
}
```

```ts
await graph.session.styles.add({
    name: "Communities",
    target: "node",
    selector: { match: "has", path: "results.louvain.group" },
    boundary: { shader: "metaball-hull", params: { look: "membrane" }, groupBy: "results.louvain.group" },
});
```

A pick on a boundary is reported like a pick on a node, as `{ kind: "boundary", layer, group }`
(additive), so an application can select the layer.

**Element state the shaders read**, written by the element and never by a layer: selected,
hovered, pinned; the time each last changed; when the element started carrying the shader or
effect (entered), when it stopped (exited, while an exit plays), and when its data last changed.
"Entered" does not fire for the layer's own add, edit or reload: adding a reticle layer to a graph
with three selected nodes shows three reticles at rest, and the snap plays only for nodes selected
afterwards. On a layer matching everything, "entered" therefore means "a node arrived".

A once-played animation never restarts within its own duration on the same element, and at most
64 elements per effect play their entrance at once; the rest show their end state. Select all on
a large graph is one frame of work, not a burst of hundreds.

A removed edge is kept drawn only while an effect on it declares an exit (`ShaderMotion.exit`), at
most 1 s. It cannot be picked, and no selector is evaluated on it again.

**New selector state**: `{ match: "state", state: "pinned" }` beside `"selected"` and `"hovered"`.
This widens the exported `ElementState` union (section 9, item 3).

### 3.3 The shader catalog

`session.catalog.shaders()` lists every shader the element can draw: its presets, shaders
registered through the API, and pasted shaders in the open project. It is in `CatalogApi` and in
`./catalog`. Preset descriptors live in their own files, apart from the GLSL bodies (section 5), so
`./catalog` loads no GLSL.

```ts
/** OPEN UNION: members may be added in a minor release; handle unknown members. */
export type ShaderKind =
    "node-surface" | "node-sprite" | "node-effect" | "edge-surface" | "edge-effect" | "background" | "boundary";

/** What the shader takes from the layers beneath and from element state. OPEN UNION. */
export type ShaderInput =
    | "color"
    | "opacity"
    | "size"
    | "shape"
    | "width"
    | "selected"
    | "hovered"
    | "pinned"
    | "times" // entered, exited, changed
    | "members"; // boundaries

/** How a shader moves. One shape everywhere; the strings "still" and "loop" are shorthand. */
export interface ShaderMotion {
    /** Animates while on screen; still while the named parameter is 0. */
    readonly loop?: { readonly speedParam?: string };
    /** Seconds of an entrance played when an element starts carrying the shader. */
    readonly enter?: number;
    /** Seconds the element keeps drawing it after it stops carrying it. */
    readonly exit?: number;
    /** Seconds played when the element's data changes (or it is added or removed). */
    readonly change?: number;
}
export type ShaderMotionInput = ShaderMotion | "still" | "loop";

/** OPEN UNION. */
export type ShaderCost = "light" | "medium" | "heavy";

/** OPEN UNION. */
export type ShaderRequirement = "webgl2";

/**
 * A shader parameter is an ordinary option descriptor (the type every algorithm and layout uses,
 * so the app's existing option form draws it), with two shader facts. Allowed types: "number",
 * "integer", "boolean", "enum", "color" ("color" is added to OPTION_TYPES).
 */
export type ShaderParamDescriptor = OptionDescriptor & {
    /** Can be bound per element with encode (at most 4 per shader). */
    readonly varies?: boolean;
    /** Advisory catalog data from the registrant: the parameter that most changes the look. */
    readonly primary?: boolean;
    /**
     * The named values of an "integer" parameter that picks one of a set (Sticker's icon,
     * Patterns' pattern), each with a picture, so a form offers a grid of pictures instead of a
     * number box. The stored value stays the number, so the "index" scale still binds it.
     */
    readonly choices?: readonly ShaderParamChoice[];
};

/** One named value: the number, its default name, and SVG path data in a 24 x 24 box (y down),
 * filled with the even-odd rule, or stroked 2 units wide with `outline`. */
export interface ShaderParamChoice {
    readonly value: number;
    readonly plainName: string;
    readonly glyph: { readonly path: string; readonly outline?: boolean };
}

export interface ShaderDescriptor {
    readonly id: string; // presets: "glass-marble"; everyone else: "<namespace>/<name>"
    readonly plainName: string; // catalog data, the default name
    readonly kind: ShaderKind;
    readonly params: readonly ShaderParamDescriptor[];
    readonly reads: readonly ShaderInput[];
    readonly motion: ShaderMotion;
    readonly cost: ShaderCost;
    readonly origin: "element" | "registered" | "pasted";
    readonly webgpu: "translate" | "native" | "none";
    readonly thumbnail?: string; // an image URL; presets ship one
    readonly requires?: readonly ShaderRequirement[];
    readonly bloom?: boolean; // contributes to the shared bloom pass
    readonly reach?: number; // effects: the drawn square is reach x the radius, 1 to 6, default 1
    readonly blend?: "over" | "add"; // effects and boundaries, default "over"
    readonly form?: "field" | "sphere"; // boundaries, default "field" (section 4.2)
    readonly reachParam?: string; // field boundaries: the number parameter that is the kernel radius, in member radii
    readonly hash?: string; // pasted shaders: SHA-256 of the text
}

interface CatalogApi {
    // ...existing methods
    /** Every shader the element can draw, presets first. @since next minor */
    shaders(): readonly ShaderDescriptor[];
}

/** The channels a shader of each kind covers (section 2.1). */
export const SHADER_KIND_COVERS: Readonly<Record<ShaderKind, readonly Channel[]>>;
```

Whether a shader can draw in this view is answered by
`session.shaders.availability(id)` (section 3.5), so an app never decides it.

### 3.4 Defining and registering a shader

The two tiers follow `definePalette` / `registerPalette`. The simple tier reuses the simple-tier
option short form of `src/simple/options.ts` (a bare value, or `{ type, default, min, max, ... }`),
plus the type `"color"` and the two shader facts.

```ts
// Simple tier, from "@graphty/graphty-element".
import { defineShader } from "@graphty/graphty-element";

defineShader({
    id: "acme/pulse-ring",
    kind: "node-effect",
    reach: 2,
    params: {
        tint: { type: "color", default: "#FFAA00", primary: true },
        speed: { type: "number", default: 1, min: 0, max: 4, varies: true },
    },
    motion: "loop",
    // Each parameter is a global of its GLSL type in the body: tint is a vec3, speed a float.
    glsl: `
        vec4 shade(NodeInput n) {
            float ring = smoothstep(0.04, 0.0, abs(length(n.uv) - fract(n.time * speed)));
            return vec4(tint * ring, ring); // premultiplied
        }`,
});
```

```ts
/** What defineShader takes. @since next minor */
export interface ShaderDefinition {
    readonly id: string; // "<namespace>/<name>": lowercase letters, digits, hyphens, one slash
    readonly kind: ShaderKind;
    readonly glsl: string; // the body, section 4.2
    readonly plainName?: string; // default: the name part of the id, sentence case
    readonly params?: Readonly<Record<string, ShortOption>>; // the simple-tier short form
    readonly motion?: ShaderMotionInput; // default "still"
    readonly reach?: number;
    readonly blend?: "over" | "add";
    readonly bloom?: boolean;
    readonly form?: "field" | "sphere";
}
/** Returns nothing, as definePalette. */
export function defineShader(definition: ShaderDefinition, options?: RegisterOptions): void;
```

```ts
// Advanced tier, from "@graphty/graphty-element/extend".
export interface ShaderRegistration {
    readonly descriptor: Omit<ShaderDescriptor, "origin" | "cost" | "reads" | "webgpu" | "motion" | "hash"> & {
        readonly cost?: ShaderCost; // default: the checker's static class
        readonly reads?: readonly ShaderInput[]; // default: inferred from the body
        readonly webgpu?: "translate" | "native" | "none"; // default "translate"
        readonly motion?: ShaderMotionInput; // default "still"
    };
    readonly glsl: string;
    readonly wgsl?: string; // optional native WebGPU body (webgpu "native")
}
export function registerShader(registration: ShaderRegistration, options?: RegisterOptions): void;

// From "@graphty/graphty-element/catalog" (no DOM): read and check shader text.
export function parseShaderText(text: string): ShaderTextResult;
export type ShaderTextResult =
    | { readonly ok: true; readonly registration: ShaderRegistration }
    | { readonly ok: false; readonly problems: readonly ShaderProblem[] };
export interface ShaderProblem {
    readonly code: ShaderProblemCode; // section 4.4, OPEN UNION
    readonly params: Readonly<Record<string, string | number>>;
}
/** The inverse of parseShaderText. Refuses (E_BAD_COMMAND) a registration with a wgsl body, which the text cannot carry. */
export function formatShaderText(registration: ShaderRegistration): string;
```

`defineShader` and `registerShader` refuse with `E_BAD_COMMAND` naming the member at fault, and
with `E_DUPLICATE_PLUGIN` for an id already registered. An id without a namespace is refused: bare
ids are reserved for the element's presets, so a future preset can never collide with a consumer's
shader. Both run the static checks of section 4.3. Registered shaders are trusted code (the page's
author wrote them) and are never held for approval, but they obey the same body rules, so a
registered shader can do exactly what a preset does: every preset is written against the same
inputs and helpers (section 4.2), with no textures.

### 3.5 Shaders in a session

`session.shaders` manages shaders that belong to the open project (pasted, or arrived in a file):

```ts
export interface SessionShaders {
    /**
     * Check and add shader text to the project. With `apply`, also write it to that layer, in the
     * same undoable step. Compiles on the canvas when one is attached.
     */
    add(text: string, options?: ShaderAddOptions): Promise<ShaderAddResult>;
    /** Check text without writing anything; compile and test only when asked. */
    check(text: string, options?: { readonly kind?: ShaderKind; readonly compile?: boolean }): Promise<ShaderAddResult>;
    /** Replace a pasted shader's text, keeping its id; layers using it redraw. One undoable step. */
    replace(id: string, text: string): Promise<ShaderAddResult>;
    /** Remove a pasted shader; layers naming it draw what lies beneath and report shader.unknown. Undoable. */
    remove(id: string): Promise<void>;
    /** The shader's text in the format of section 4, presets too, with the id given the "user/" namespace. */
    source(id: string): Promise<string>;
    /** The project's shaders, with their state and how many layers and settings name them. */
    list(): readonly ProjectShader[];
    /** Whether a shader draws now, and if not, why. */
    status(id: string): ShaderStatus;
    /** Whether a shader can draw in this view and on this device, before anyone picks it. */
    availability(id: string): { readonly ok: true } | { readonly ok: false; readonly problem: ShaderProblem };
    /** Run a held shader: runs the full checks (static, compile, test frame) first. */
    approve(id: string): Promise<ShaderAddResult>;
    /** A still picture of the shader on a sample node, edge or patch, drawn in this element's engine. */
    thumbnail(id: string, params?: ShaderParams): Promise<Blob>;
}

export interface ShaderAddOptions {
    /** Who supplied the text. "content" (a file, an AI command, a URL) is held per the trust setting. Default "reader". */
    readonly source?: "reader" | "content";
    /** The kind, for text whose header does not say (a Shadertoy shader, a header-less body). */
    readonly kind?: ShaderKind;
    /** When the header's id is taken: refuse (default) or add under the next free id. */
    readonly onTaken?: "refuse" | "rename";
    /** Also write the shader to this layer (by layer id), as the drawn surface or an added effect. */
    readonly apply?: { readonly layer: string };
}

export type ShaderAddResult =
    | {
          readonly ok: true;
          readonly descriptor: ShaderDescriptor;
          /** The body equals a known shader's body: that id, and the parameter values the text's defaults differ by. */
          readonly sameAs?: { readonly id: string; readonly params: ShaderParams };
      }
    | { readonly ok: false; readonly problems: readonly ShaderProblem[] };

export interface ProjectShader {
    readonly id: string;
    readonly plainName: string;
    readonly kind: ShaderKind;
    readonly hash: string;
    readonly state: ShaderState;
    readonly usedBy: number;
}

/** OPEN UNION. */
export type ShaderState = "ready" | "compiling" | "failed" | "held" | "off" | "still" | "not-checked";

export interface ShaderStatus {
    readonly state: ShaderState;
    readonly problem?: ShaderProblem; // why it is failed, held, off or still
}
```

`add` runs the static checks, then (with a canvas attached) compiles asynchronously in the
element's own engine and runs the test frame (section 4.3). Headless, in Node, it stops after the
static checks and the state is `"not-checked"`; `thumbnail` refuses there with `E_NO_CANVAS`.
Nothing is written to the project until the result is `ok`. An `add` with source `"reader"`
records the text's hash as approved, so the reader's own shader is not held after a reload. The
element's AI commands always call `add` with source `"content"`, and `approve` is never an AI tool.

Events, on the element and on `session.events`: `shader-status` (`{ id, state, problem? }`),
`shader-held` (`{ ids }`, after a load), `shader-approved` (`{ id, hash }`, so an application can
remember the approval), `render-quality` (`{ from, to, code }`, section 5). The load report of
`styles.load` and of a project open lists held shader ids as a code (`shader.held`, with `ids`).

### 3.6 Graph-level settings

```ts
// GraphBackground gains a member (section 9, item 2):
{ backgroundType: "shader"; shader: string; params?: ShaderParams; color?: string /* drawn until the shader draws */ }
```

**Device and trust settings are element properties, never saved.** They are the reader's or the
consumer's, not the project's, so they are not in `GraphStyle`, not in a project file or style
document, and never read from loaded content, an AI command or a URL:

```ts
graph.shaderSettings = {
    quality?: "auto" | "low" | "medium" | "high"; // default "auto"
    motion?: "system" | "on" | "off";             // default "system": follows prefers-reduced-motion
    guard?: boolean;                              // default true: the frame guard (section 5)
    untrusted?: "hold" | "run" | "refuse";        // default "hold" (section 4.6, owner decision)
    trustedHashes?: readonly string[];            // approvals the application remembered
};
graph.renderQuality; // readonly { level: "low" | "medium" | "high"; code?: "guard.slow-gpu" | "guard.paused" | ... }
```

`styles.load(doc, { shaders?: "run" | "hold" | "refuse" })` and a project open take the trust for
that call; without it, `untrusted` applies. A project file or style document that carries a
`shaderSettings` member has it stripped on load (a test opens a file carrying `untrusted: "run"`
and finds its shaders held).

**Groups need no new layer kind** (the `boundary` layer member, section 3.2). A layer without
`groupBy` draws one boundary around all its nodes, which is how a folder of one layer per community
gets one outline per layer.

### 3.7 Layout transitions

Transitions are a registry, not shaders:

```ts
// From "@graphty/graphty-element/extend".
export interface TransitionRegistration {
    readonly descriptor: { readonly id: string; readonly plainName: string; readonly params: readonly OptionDescriptor[] };
    /** Where a node is at progress t (0..1), on the CPU; every edge, label and effect follows. */
    move(t: number, from: Vec3, to: Vec3, node: TransitionNode, params: Readonly<Record<string, unknown>>): Vec3;
    /** Optional: a drawable shown while the transition runs (particle morph). */
    drawable?: "particles";
}
export function registerTransition(registration: TransitionRegistration, options?: RegisterOptions): void;

// GraphStyle gains (saved with the project; absent: positions jump, as today):
layoutTransition?: { transition: string; seconds?: number; params?: Readonly<Record<string, unknown>> };
```

`TransitionNode` gives `index`, `seed`, `hopFromSelection` and `distanceFromCenter`. Picking and
saved positions read the layout's answer at once, not the moving picture. `catalog.transitions()`
lists them.

---

## 4. The pasted shader format

### 4.1 The document

One text form, used for paste, copy, style documents and docs: GLSL with a JSON header in its
first comment, the shape of ISF (the Interactive Shader Format), so the header generates the
parameter rows and the text survives a clipboard, a chat or a forum post.

```glsl
/* graphty-shader 1
{
    "id": "user/pulse-ring",
    "name": "Pulse ring",
    "kind": "node-effect",
    "reach": 2,
    "motion": "loop",
    "params": [
        { "name": "tint",  "type": "color",  "default": "#FFAA00", "primary": true },
        { "name": "speed", "type": "number", "default": 1, "min": 0, "max": 4, "varies": true, "plainName": "Speed" }
    ]
}
*/
vec4 shade(NodeInput n) {
    float ring = smoothstep(0.04, 0.0, abs(length(n.uv) - fract(n.time * speed)));
    return vec4(tint * ring, ring);
}
```

Header keys: `id` (`<namespace>/<name>`, lowercase letters, digits and hyphens, at most 40 in
all), `name` (the plain name), `kind`, `motion` (`ShaderMotion` or `"still"` / `"loop"`), `params`
(the fields of `ShaderParamDescriptor`, as JSON), `reach`, `reachParam`, `blend`, `form`, `bloom`, `requires`,
`reads` (optional; inferred from the body), and `webgpu`:

- `"translate"` (the default): the GLSL runs on the WebGPU renderer through the translation the
  element already loads for its own GLSL (glslang and twgsl).
- `"none"`: WebGL only. On WebGPU the element draws what lies beneath and reports
  `shader.webgpu-unsupported`.

The header ends at the first `*/` after `/* graphty-shader 1`; a `*/` inside a JSON string is a
header error (`shader.header-json`), never the start of the body. The header is checked with a
strict schema (unknown keys refused). Pasted shaders are GLSL only.

**Also accepted on paste**, recognized from the text:

- A Shadertoy shader (`void mainImage(out vec4 fragColor, in vec2 fragCoord)` with `iTime`,
  `iResolution`, `iMouse`, no header). Its kind comes from `add`'s `kind` option (default
  `background`); `fragCoord` maps onto the node's square for a node kind. It gets id
  `user/shadertoy` (renamed when taken), no parameters, and runs at half the quality's background
  resolution. Most Shadertoy shaders use `#define` or `iChannel` and are refused with
  `shader.preprocessor` or `shader.texture-unsupported`, each with its line.
- GLSL with no header that defines one of the entry functions below: no parameters, kind from the
  function's input type or `add`'s `kind`.

### 4.2 The fixed signature per kind

The reader writes only `shade` and helper functions or structs. The element writes the version,
`precision highp float`, the uniforms, the varyings, `main`, and how the result combines (the table
in section 2.1). Each declared parameter is a global name of its GLSL type in the body (`float`,
`int` for an integer or an enum index, `bool`, `vec3` for a color); a `varies` parameter takes the
element's value. The element prefixes every top-level name the body declares when it wraps it, so
a helper the reader names `world` never collides with a name Babylon.js declares.

| Kind         | Entry function                  | Return                                                             |
| ------------ | ------------------------------- | ------------------------------------------------------------------ |
| node-surface | `vec4 shade(NodeInput n)`       | the pixel's color and alpha (replaces the material's output)       |
| node-sprite  | `vec4 shade(NodeInput n)`       | color and alpha; alpha 0 is outside the sprite                     |
| node-effect  | `vec4 shade(NodeInput n)`       | premultiplied color and alpha on a square `reach` times the radius |
| edge-surface | `vec4 shade(EdgeInput e)`       | the line pixel's color and alpha (replaces the line's color)       |
| edge-effect  | `vec4 shade(EdgeInput e)`       | premultiplied color and alpha over the line                        |
| background   | `vec4 shade(BackgroundInput b)` | the canvas pixel                                                   |
| boundary     | `vec4 shade(BoundaryInput g)`   | premultiplied color and alpha of the boundary at this pixel        |

```glsl
struct NodeInput {
    vec2 uv;             // -1..1 across the node's camera-facing square: the pixel's offset from the
                         //   node's center in view space, divided by the drawn radius. Same for every shape.
    vec3 local;          // surfaces: the pixel's point on the shape in the node's own space, divided by its radius
    vec3 normal;         // surfaces: view-space normal at this pixel (for a sphere, of the exact sphere)
    vec3 viewDir;        // view direction, view space
    vec4 color;          // the resolved node.color (with any gradient), alpha = node.opacity
    float size;          // drawn radius, world units
    float pixelSize;     // drawn radius, screen pixels
    float seed;          // a stable 0..1 random per node
    float selected;      // 1 or 0
    float hovered;       // 1 or 0
    float pinned;        // 1 or 0
    float sinceSelected; // seconds since `selected` last changed; -1 if it never did
    float sinceHovered;  // as above, for hovered
    float sincePinned;   // as above, for pinned
    float sinceEntered;  // seconds since the node started carrying this shader or effect
    float sinceExited;   // seconds since it stopped (while an exit plays); -1 otherwise
    float sinceChanged;  // seconds since its data changed or it was added; -1 if never
    float time;          // seconds, wrapped to a period; 0 for a still shader
};
struct EdgeInput {
    float t;             // 0 at the source, 1 at the target
    float side;          // -1..1 across the line
    float lengthPx;      // the edge's length on screen
    float widthPx;       // its drawn width on screen at this t
    vec4 color;          // the resolved line color at this t (edge.color, or its gradient)
    vec4 sourceColor;    // the resolved line color at t = 0
    vec4 targetColor;    // the resolved line color at t = 1
    float seed;
    float selected;      // the edge itself is selected
    float hovered;       // the edge itself is hovered
    float sourceSelected;
    float targetSelected;
    float sinceEntered;
    float sinceExited;
    float sinceChanged;
    float time;
};
struct BackgroundInput {
    vec2 uv; vec3 viewDir; vec2 resolution; float time;
    vec4 groupTint;      // the color of the largest boundary groups near this pixel (soft discs around
                         //   the 4 largest groups on screen), alpha its weight; 0 with no boundary layer
};
struct BoundaryInput {
    vec2 uv;             // the pixel, 0..1 across the canvas
    float field;         // form "field": the members' summed density here (the element splats it)
    vec2 fieldGradient;  // its screen-space gradient, for outlines and lighting
    vec3 normal;         // form "sphere": the group sphere's view-space normal; 0 outside
    vec3 viewDir;
    vec4 color;          // the mean resolved color of the group's members
    float group;         // the group's index within its layer
    float depth;         // nesting depth: 0 for the lowest boundary layer, 1 above it, ...
    float time;
};
```

Built-in helpers available to every body, presets and registered shaders included:
`hash11`..`hash33`, `noise`, `fbm` (octaves follow quality), `voronoi`, `palette`, `rainbow`,
`hsv2rgb`, `oklabMix`, `blackbody`, `luminance`, the 2D distance functions (`sdCircle`, `sdBox`,
`sdRoundBox`, `sdSegment`, `sdTriangle`, `sdHexagon`, `sdStar5`), `iconSdf(int icon, vec2 p)` (the
twelve icons of the sticker preset as distance functions), `fillAA`, `strokeAA`, and the light:
`lightDir`, `lightColor`, `ambient`, matching the scene's lighting preset, and `canvasColor`, the
canvas's background color (so a surface can keep its contrast on a light or a dark canvas). `Q(lo, med, hi)` returns
the value for the current quality level at run time (a uniform, not a compile-time choice), so a
quality change never recompiles; a loop written `for (int i = 0; i < 64; i++) { if (i >= Q(16, 32, 64)) break; ... }`
keeps its constant bound.

These struct fields and helper names are the published contract once projects save shader text
(section 9, item 1). No texture inputs exist: the lab's matcaps are functions of the normal and its
icons are distance functions, so no preset needs one.

### 4.3 Validation

On a real tokenizer over ASCII text (anything else is refused), in order, each step stopping at its
first problems:

1. **Header** (`./catalog`, no DOM): valid JSON under a strict schema; a known kind; an id with a
   namespace that is free (`onTaken` decides); parameter names that are GLSL identifiers, contain
   no `__`, and are not a helper name, a struct or field name, a GLSL keyword or built-in, `visible`,
   or a name starting `gl_` or `graphty_`; numbers finite and inside float32 range; defaults inside
   their ranges; at most 16 parameters, at most 4 `varies`; `name`, `plainName` and choice labels at
   most 40 characters, with control and bidirectional-override characters removed.
2. **Static checks** (`./catalog`, no DOM), the rules of GLSL ES 1.00 Appendix A, applied to the
   body:
    - at most 16 KB of text; arrays of at most 256 elements; expression and bracket nesting at most
      64 deep;
    - no preprocessor lines, however spaced or continued (`#define`, `#extension`, `#version`,
      `#include`);
    - no `uniform`, `attribute`, `in`, `out`, `varying`, `layout`, `precision` declarations, no
      `main`, no names starting `gl_` or `graphty_` or containing `__`;
    - loops only `for` in the Appendix A form: one integer index, initialized, tested against and
      stepped by constant expressions, never written in the body; the exact iteration count at most
      128 per loop; no `while` or `do`; no recursion;
    - **the cost bound is the gate**: the product of iteration counts along every path of the call
      graph, built-in helpers included at fixed costs (`fbm` 5 octaves, `voronoi` 27 cells), times
      the body's operation count, at most a fixed budget per kind; the unrolled size (iterations
      times body tokens) at most a fixed budget, so no compiler unrolls itself into a hang;
    - no texture sampling;
    - the entry function exists with its kind's signature;
    - the static cost class (light, medium, heavy) from the same bound.
3. **Compile** (in the element, asynchronously, one compile at a time, with
   `KHR_parallel_shader_compile` where present): in the element's own engine, never a throwaway
   context. The lower layers' look draws until it is ready. A failed compile removes the material
   from its mesh and disposes the effect before reporting `shader.compile`, so the render loop
   rests again (an effect that never compiles otherwise keeps `areAllEffectsReady` false and the
   loop drawing every frame).
4. **Test frame** (advisory: it catches runaway loops the bound missed, it does not bound cost):
   drawn first on a 4 x 4 scissor, then 64 x 64, then 256 x 256, stopping on growth faster than
   the pixel count; at each parameter's minimum and maximum and at several `time` values. Over the
   per-pixel budget scaled to the largest area the kind can cover at this quality, the shader is
   refused with `shader.over-budget`.

At draw time the wrapper clamps every parameter to its declared range (varying ones too),
replaces a NaN or infinite result, tested on the exponent bits with `floatBitsToUint` so fast-math
compilers cannot remove the test, with the color beneath, and wraps `time` so precision holds.

Limits per project: at most 64 pasted shaders and 256 KB of shader text per style document
(`shader.too-many`, `shader.too-large`); at most 16 distinct compiled shader programs at a time (8
at low quality), past which further shaders wait as `"off"` with `shader.program-cap`.

### 4.4 Problem codes

Each is `{ code, params }`; the application writes the words. `message` params carry the JSON
parser's or the driver's own text as data; a structured `reason` accompanies it where one can be
derived (`"unexpected-token"`, `"undeclared-name"`, `"type-mismatch"`).

| Code                                              | Params                                  | When                                                           |
| ------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------- |
| `shader.header-missing`                           |                                         | no header and no recognized entry function                     |
| `shader.header-json`                              | `line`, `column`, `message`, `reason?`  | the header is not JSON, or does not end where it should        |
| `shader.header-key`                               | `key`                                   | an unknown or missing header key                               |
| `shader.kind-unknown`                             | `kind`                                  |                                                                |
| `shader.id-invalid` / `shader.id-taken`           | `id`, `free?` (a free id)               |                                                                |
| `shader.param-invalid`                            | `param`, `field`                        | a bad type, name, range or default                             |
| `shader.too-many-params`                          | `count`, `limit`                        |                                                                |
| `shader.too-large` / `shader.too-many`            | `bytes` or `count`, `limit`             |                                                                |
| `shader.not-ascii`                                | `line`, `column`                        |                                                                |
| `shader.preprocessor`                             | `line`, `column`                        |                                                                |
| `shader.reserved`                                 | `line`, `column`, `name`                | a declaration or name the element writes                       |
| `shader.loop-unbounded`                           | `line`, `column`                        | `while`, `do`, recursion, or a loop not in the Appendix A form |
| `shader.loop-too-long`                            | `line`, `column`, `iterations`, `limit` |                                                                |
| `shader.too-costly`                               | `cost`, `limit`                         | the static cost or unrolled size bound                         |
| `shader.too-deep`                                 | `line`, `column`, `limit`               | an array or nesting limit                                      |
| `shader.texture-unsupported`                      | `line`, `column`                        |                                                                |
| `shader.entry-missing` / `shader.entry-signature` | `kind`, `expected`                      |                                                                |
| `shader.compile`                                  | `line`, `column`, `message`, `reason?`  | the driver's error                                             |
| `shader.over-budget`                              | `ms`, `limit`, `pixels`                 | the test frame grew too fast or ran too long                   |
| `shader.webgpu-unsupported`                       |                                         | `webgpu: "none"` on the WebGPU renderer                        |
| `shader.unknown`                                  | `id`                                    | a loaded layer names a shader the catalog does not list        |
| `shader.kind-mismatch`                            | `id`, `expected`, `kind`                | a loaded layer names a shader of the wrong kind                |
| `shader.held`                                     | `id` (or `ids`)                         | waiting for approval                                           |
| `shader.quarantined`                              | `id`                                    | it was drawing when the GPU context or device was lost         |
| `shader.flashing`                                 | `id`                                    | its output flashed more than 3 times a second; time is frozen  |
| `shader.guard-off`                                | `level`                                 | the frame guard turned it off                                  |
| `shader.still`                                    | `reason`: `"guard"` or `"system"`       | drawn, but without motion                                      |
| `shader.program-cap`                              | `limit`                                 | too many distinct shader programs at once                      |
| `shader.param-unused`                             | `param`, `shader`                       | a parameter set for a shader not drawn here                    |
| `shader.effect-cap` / `shader.boundary-cap`       | `left`, `limit`                         |                                                                |

`shader.held`, `shader.quarantined`, `shader.guard-off`, `shader.unknown`,
`shader.kind-mismatch`, `shader.program-cap` and `shader.webgpu-unsupported` are also reported per
layer through the existing "draws nothing" call; `shader.still` is reported as a status, not as
"draws nothing", because the shader still draws.

### 4.5 Storage in style documents

**OWNER DECISION (a published format).** Recommendation: a pasted shader's text travels in the
style document, beside the palettes a stack depends on:

```ts
interface StyleDocument {
    version: 1;
    layers: readonly LayerSpec[];
    palettes?: readonly PaletteDescriptor[];
    shaders?: readonly { readonly id: string; readonly text: string }[]; // section 4.1 text, verbatim
}
```

Layers name a shader by id in `node.shader`, `node.effects`, `boundary.shader` and so on, exactly
as they name a preset. A background that names a pasted shader finds it in the same list, so a
project file needs no new member. When two style members of one project carry the same id with
different text, the first loaded wins and the other is reported `shader.id-taken` with its text's
`free` id. Compiled programs are keyed by text hash, not id, so two graphs on one page with the
same id and different text never share a program. Rejected: a new project member (a style
document copied alone would lose its shaders); the code as an escaped string inside each layer
(repeated and unreadable).

Older builds refuse a style part that names an unknown channel, so a project using any shader
channel will not open its look in a build from before this feature, whatever the storage choice.

### 4.6 Shaders from someone else

A pasted shader cannot read the page, other sites or the network, has no textures and no script,
so the risk is not secrets. It is availability: a shader that runs too long trips the GPU watchdog,
every context in the browser is lost, and on an iPad the tab can die with the reader's unsaved
work. And nuisance: fast flashing, or deceptive text drawn in the canvas.

- Presets and shaders registered through the API run without asking.
- Text added with source `"reader"` runs once it passes the checks, and its hash is approved.
- **Text that arrives in content** (a project or style file, an AI command, a URL, `add` with
  source `"content"`) is held unless its SHA-256 hash is in `shaderSettings.trustedHashes` or the
  call's trust says `"run"`: layers naming it draw what lies beneath, `shader-held` fires, and
  `list()` shows it `"held"` until `approve`, which runs the full checks. `untrusted` defaults to
  `"hold"` (**OWNER DECISION**, section 9 item 4). Hashes are SHA-256 from `crypto.subtle`; where
  it is missing (an insecure context), nothing is trusted by hash and content is held every time.
- The element writes no approval to storage. It fires `shader-approved`; an application that wants
  approvals remembered stores the hashes as the reader's preference and passes them back.
- Flashing: for animated pasted shaders, the element reads back a 16 x 16 downsample of the canvas
  asynchronously (a WebGL2 buffer and a fence, never a stall, up to 3 in flight) on every frame
  drawn -- sampled 10 times a second, a 10 or 20 Hz strobe aliased to a steady canvas -- counts
  luminance swings over a WCAG-sized area, and past 3 flashes a second freezes that shader's time
  and reports `shader.flashing` (WCAG 2.3.1). Presets are checked for flashing at design time
  instead, in each preset's acceptance (section 8).
- The gate is a general "content from outside asks first" mechanism, so the skybox URL fetched
  today as soon as a style names it can use it later.

---

## 5. Performance and iPad safety

**A graph that names no shader renders identically to today.** Quality levels, the frame guard and
every cap below apply only to shader work: shader programs, their render targets, the bloom pass,
effect squares, boundaries and backgrounds. The main drawing buffer, the public `pixelRatio`
property, edge tessellation and the engine's hardware scaling are never touched.

**Quality levels** (`shaderSettings.quality`; `"auto"` chooses from the device and is refined by
the guard):

| Level  | Shader render targets (x the canvas) | Render-target memory budget, format | `Q()` and `fbm` octaves | Effect square cap (screen px) |
| ------ | ------------------------------------ | ----------------------------------- | ----------------------- | ----------------------------- |
| low    | 0.5                                  | 24 MB, 8-bit                        | low, 3                  | 128                           |
| medium | 0.75                                 | 64 MB, 8-bit or 16-bit float        | medium, 4               | 256                           |
| high   | 1.0                                  | 160 MB                              | high, 5                 | 512                           |

The render-target scale never exceeds the main buffer's own size. Effects on nodes under 3 px
on screen are not drawn. Heavy surfaces have a level of detail: a second, cheaper program per
heavy preset (glass marble: flat fresnel glass; gemstone: 8 facets), chosen for the whole batch
when the camera comes to rest, from the median node size on screen (below 12 px: the cheap form).

**Drawing paths.** Three, chosen by the element:

- **Impostor batch**: a sphere-shaped node (and every node in a 2D view) whose surface is a
  sphere material (glass marble, gemstone, disco ball, lantern, dew drop, the matcaps, soap-like
  looks) is drawn as a thin-instanced camera-facing square that ray-casts the exact sphere, the
  lab's measured path. Sprites use the same batch. The batch draws the outline ring, glow and halo
  from the radius itself (the highlight layer's shaders would otherwise outline the square), and
  picking stays on the node's existing mesh, kept as an invisible pick proxy.
- **Mesh path**: a surface on any other shape is a `MaterialPluginBase` on the node's instanced
  mesh, attached before the material freeze.
- **Effect batch**: effects are thin-instanced squares in their own packed buffer (center, radius,
  color, parameter row, state), written through a dirty flag and uploaded once per frame, as
  `EdgeLineBatch.flush` does. It never indexes the node meshes' instance buffers, which Babylon
  repacks per frame.

**Per-element data.** A node carries two new instanced `vec4` attributes: the four varying
parameters, and (seed, parameter-set row, state bits, stamp row). Fixed parameter sets live in a
float data texture, one row per distinct resolved set; state times (selected, hovered, pinned,
entered, exited, changed) live in another, one row per node, written only when a state changes and
batched into one write per frame. Times are stored relative to a session epoch that resets when no
timed animation runs, so float32 precision holds. This stays inside WebGL2's 16 vertex attributes
on iPad Safari. Edge slots in `EdgeLineBatch` widen only in batches whose key names an edge shader,
with the static attributes in their own buffer uploaded on repaint and positions the only buffer
uploaded per frame.

**Render on demand stays.** The element draws a frame only when something changed. A still shader
costs nothing at rest. A loop shader holds an `animatesEveryFrame` claim only while an element
using it is on screen and its speed parameter is not 0. A timed animation holds the claim for its
seconds. `time` is a scene-level uniform buffer updated once per frame, so frozen materials see it;
a frame that changes only `time` keeps the active-mesh freeze (`settleActiveMeshFreeze`). With
`motion: "system"` and the platform asking for reduced motion, loops are drawn still and timed
animations jump to their end state, reported as `shader.still` with `reason: "system"`. The
background renders into its own target at most 30 fps (15 at low) and is composited every frame;
with drift 0 it renders only when the camera moves. The bloom pass stays allocated while any layer
names a bloom shader, runs at the render-target scale, and shares its blur with the glow layer
where the two are on together. Boundaries splat each member's kernel additively into a one- or
two-channel field target at the render-target scale (cost: members times kernel area, never pixels
times members), then shade it.

**The frame guard** (`shaderSettings.guard`, default true), in `RenderManager`, measures only while
a continuous frame claim is held, and ignores frames after a visibility change, a resize, a compile
or a context restore. It separates CPU time (measured around update and render submission) from
GPU backlog, and steps down only when the GPU is behind. A frame is GPU-bound when the loop waited
over the limit between the end of its own work and the next tick, or when the existing
`fenceFrame` / `gpuBehind` fence held it. The wait is the main signal: Chromium does not run the
next animation frame until the GPU has caught up, so on a slow GPU the fence has always signalled
by the next tick (measured on SwiftShader: the fence alone flagged no frame). After a second of
GPU-bound frames over 50 ms, one quality level; at low, loops run at half rate, then heavy shaders
turn off, then all shader motion pauses. A GPU-bound frame over 250 ms while a heavy shader is on
screen turns heavy shaders off at once (decided by cost and motion, not origin: a heavy preset
turns off as a heavy pasted shader does, and the flashing check and GPU-loss quarantine cover
every shader too): one the fence held, or two such waits in a row, because a
single long wait can be the page's own script. After a sustained run of fast frames
the level steps back up, never above the setting. Each step updates `graph.renderQuality`, fires
`render-quality` (`guard.slow-gpu`, `guard.paused`, `guard.recovered`) and reports
`shader.guard-off` or `shader.still` with `reason: "guard"` on the shaders it changed.

**Context loss.** Kept: a disposed graph loses its WebGL context after a fence
(`releaseWhenIdle`). Added:

- A pasted shader is quarantined by its text hash for the session (`shader.quarantined`) when the
  WebGL context or the WebGPU device (`device.lost`) is lost while the page was visible and the
  shader's frame was submitted in the last 2 s. A context lost in a background tab quarantines
  nothing. On restore, shaders recompile, bypassing any cached Babylon effect.
- A crash marker in `localStorage` (wrapped, so blocked storage only skips it) names the pasted
  shaders being compiled, tested or drawn. It is written before compile and test frame, and when
  the set of drawn pasted shaders changes, never per frame; it is cleared after a few calm frames
  or on `pagehide`. On the next load it is read before autosave restores any layer: a marked
  shader is held whatever `trustedHashes` says. Autosave is flushed before compiling or testing a
  held shader.

**Precision and limits.** `highp` everywhere; custom code within the WebGL2 minimums (16 vertex
attributes, 16 texture units, 224 fragment uniform vectors, 15 varying vectors); every shader's
source inline in Babylon's shader store, so iPad Safari never lazily imports a shader chunk; when a
program is replaced (a parameter that needs a different program, the level-of-detail switch), the
old one keeps drawing until the new one is ready. Presets are translated to WGSL at build time, so
runtime translation runs only for pasted shaders.

**Where the code lives.** Channel rows, descriptors, the text parser, the checker and the codes are
in the Babylon-free `session` and `catalog` code; each preset's descriptor is its own file there.
Preset GLSL bodies, the runtime and the batches are in a lazily loaded renderer chunk (as
`src/models/chunk.ts` loads model support), fetched the first time a layer names a shader; hence
`source()` is async.

---

## 6. The app

The app reads the catalog and writes channels; it decides nothing about a graph. Everything here
follows Figma's right sidebar as the tier 3 panel does (sections with "+", property rows, popovers
240 px wide beside the panel, chips, eye per list entry, context menus, no sentences at rest) and
every entry of `decided.md`. Graph parts are called nodes and edges.

### 6.1 Where shaders live: one home per capability

The owner asked for shaders on nodes, edges and backgrounds, each set in its own styling section.
Each kind goes in the section that already owns what it changes, so a reader has one place to look:

| Kind         | Section and row                                                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Node sprite  | Node tab, Shape: the Shape row's picker gains the sprites (Sticker, Mandala) after the shapes                                     |
| Node surface | Node tab, Rendering: a **Material** row whose choices are Plain, Wireframe, then the surfaces (it absorbs Solid / Wireframe)      |
| Node effect  | Node tab, Effects: shader effects join Outline, Glow and Halo in one effect list                                                  |
| Pie          | Node tab, Shape: a **Pie** row when the layer writes `node.pie*`, with its settings and minus                                     |
| Edge surface | Edge tab, Line: the Pattern row's choices gain the edge surfaces (Fiber)                                                          |
| Edge effect  | Edge tab, Effects: beside the animated band                                                                                       |
| Taper, lift  | Edge tab, Line: **Taper** and **Lift** property rows (Lift only offered when the view is a flat layout in 3D, per `availability`) |
| Boundary     | Node tab, a new **Group outline** section (the only new section)                                                                  |
| Background   | Graph settings, Background: paint type **Color / Image / Shader**, as Figma's fill                                                |

A shader row is Figma's effect row: the thumbnail (it opens the gallery to swap the shader), the
name, the `primary` parameter inline when the shader declares one and the row has room (with the
vary glyph when it `varies`), the trigger chip when the motion has an entrance or change animation
(**Enter** or **Change**, from `ShaderMotion`), the settings button, the eye (effects: writes
`visible: false` in the entry), and the minus. No kind chip: the section says what the shader does
to the layers beneath, and "Covered by" captions say the rest.

**Covering a lower layer's shader.** A layer lists only its own entries (tier 3). Its Effects "+"
menu lists, after the gallery, "<effect> off" for each effect a layer beneath adds, which writes
`false`; the Material row's **Plain** and the Shape row's shapes write `node.shader: "none"` when a
layer beneath sets a surface or sprite.

**Coverage reads as today.** The element's `styles.agreement` reports what each kind covers
(`SHADER_KIND_COVERS`, plus `node.color` under a shader that does not read color); the app shows
the existing "Covered by Sticker on 11 of 77" captions.

**A shader that draws nothing keeps its row** with the existing "Draws nothing" caption, worded
from the element's code. A shader drawn without motion shows its cause in the settings popover's
Motion row (from `shader.still`), not as "Draws nothing".

**Context menu** on every shader row and gallery tile: Copy, Paste (an effect onto this layer),
Edit code (pasted shaders), Duplicate and edit (presets: opens the paste dialog with
`source()`'s text under its `user/` id), Hide, Remove; on a pasted tile, Delete from project, which
names how many layers use it (`list().usedBy`), is undoable and asks no confirmation.

### 6.2 The gallery

The swap thumbnail, the Material and Shape pickers' shader choices, and the Effects "+" open the
gallery popover beside the panel: search first, with focus (aliases: glass, metal, glow, pie,
bubble, 3D, shiny); a two-column grid of thumbnails with names, filtered to the kinds the row
takes; "In this project" for pasted shaders; **Paste shader...** last. Grouping and headings are
the app's.

- Thumbnails are the catalog's still images; pasted shaders get theirs from
  `session.shaders.thumbnail`. Hovering a tile does not change the canvas ("A '+' never changes the
  drawing", 2026-10-18).
- A tile already on the layer is marked; picking it opens its row's popover.
- Picking writes the shader with no parameters (the declared defaults draw), adds the row, and
  opens its parameters popover with focus in the first field. An effect writes `true`. A swap
  removes the old shader's parameter set in the same undo step. Escape leaves nothing behind.
- Heavy tiles carry a second line, "Heavy"; no tile is disabled for cost. A tile that
  `availability` refuses is disabled with its reason on a second line, as the "+" menus do; it is
  not a Tab stop and keeps the reason on hover.

### 6.3 The parameters popover

240 px, beside the panel, generated from the descriptors by the app's existing option form:
number (scrub on the name, Up and Down step, Shift by ten), integer, color (the one color picker),
enum (a select), yes or no (a two-word select). A `varies` parameter has the vary glyph; binding it
writes `encode` on `<channel>.<shader>.<param>` with the existing vary picker. Each row's minus
clears the parameter back to its default. Below them, captioned rows: **Uses** (plain text from
`reads`: "Color, size"), **Motion** (the speed parameter, "Still", or the `shader.still` cause),
and **Copy shader**, plus **Edit code** for a pasted shader. Escape in a field follows `decided.md`.

### 6.4 Paste shader

**Paste shader...** (the gallery's last item, Control+V with focus in a shader row's section, or
the row menu's Paste) opens a dialog, because code does not fit a popover: the code box, a Kind
select that starts at the kind the opening section implies (Material: node surface; Effects: node
or edge effect; Background: background) and that the header overrides, and **Add**. While typing
pauses, the app calls `check(text)` (static checks only, no compile); Add calls
`add(text, { kind, onTaken: "rename", apply: { layer } })`, which compiles, tests and writes the
layer in one undoable step.

- Problems are rows: "Line 12:8" and the problem, each a button that puts the cursor on that line,
  worded from the code; the driver's own message is shown as data.
- Add stays disabled with its reason on hover until the checks pass. A failed paste never changes
  the canvas.
- When `add` returns `sameAs`, the app applies that known shader with those parameters instead of
  adding a near-copy.
- Escape closes the dialog from any control in it; its text is kept as an unsent draft for the
  session.

### 6.5 Selected and Hovered, group outlines, transitions, quality, held shaders

- **Selected and Hovered rows** (tier 3's starting rows) take effects in their Effects section like
  any layer. The reticle and the shockwave play on select because their entrance plays when a node
  enters the Selected row's layer.
- **Group outline**: its "+" opens the gallery of boundaries, then the **Group by** list at once
  (as the Label "+" opens its list), because on Everything an outline with no grouping is one blob.
  Group by writes `boundary.groupBy`; on a community folder, the folder's bulk edit gives each
  layer its own outline in one undo step. A click on an outline selects its layer (the element's
  boundary pick).
- **Layout transition**: the toolbar's layout form gains **Transition** (the catalog's transitions,
  None first, and a settings button). It writes `layoutTransition`.
- **Quality and Motion** (Graph settings, and Motion off in the canvas context menu, WCAG 2.2.2):
  reader preferences the app stores and writes to `graph.shaderSettings`. When the guard steps
  down, the graph's Values tab shows `graph.renderQuality`; no toast.
- **Held shaders**: the load report names them and offers **Run**; affected rows carry the "Draws
  nothing" caption from `shader.held`; Graph settings has a "Held shaders" row whose popover lists
  each (name, kind, used by N) with Run and Copy shader. Run all approves them one at a time, each
  through its checks. The app stores approved hashes (from `shader-approved`) as the reader's
  preference and passes them back in `trustedHashes`.

---

## 7. Presets to ship

Every owner pick with the owner's changes, plus the three suggestions. Ids are published (saved in
projects). Lab sources are in `.worktrees/shader-lab/graphty-element/stories/shader-lab/` on branch
feat/shader-lab; thumbnails start from its `thumbs/`. Parameter ranges come from the lab's
controls; scene-level lab knobs (node size, edge alpha, bloom radius) are dropped. In the tables,
`V` marks a `varies` parameter and `P` the `primary` one; motion lists the speed parameter.

### 7.1 Node surfaces

| Id                    | Name           | Lab source                    | Notes                                                                                 | Reads        | Motion                       | Cost   |
| --------------------- | -------------- | ----------------------------- | ------------------------------------------------------------------------------------- | ------------ | ---------------------------- | ------ |
| `matcap-ink`          | Ink            | matcap-sampler (toon)         | dark ink rim, flat tones                                                              | color        | still                        | light  |
| `clear-glass`         | Clear glass    | matcap-sampler (jade, chrome) | clear body, bright rim; confirm the tile with the owner                               | color        | still                        | light  |
| `pearl`               | Pearl          | matcap-sampler (pearl)        |                                                                                       | color        | still                        | light  |
| `toon-outline`        | Toon outline   | toon-ink                      | bands and ink outline, no boil                                                        | color, shape | still                        | medium |
| `halftone`            | Halftone       | toon-ink                      | the dot screen only                                                                   | color        | still                        | medium |
| `glass-marble`        | Glass marble   | glass-marble                  | small-size form: flat fresnel glass                                                   | color        | loop, `spin`                 | heavy  |
| `gemstone`            | Gemstone       | gemstone (brilliant)          | split from disco ball; the layer's selector decides which nodes                       | color        | loop, `turn`                 | heavy  |
| `disco-ball`          | Disco ball     | gemstone (geodesic)           | its own preset                                                                        | color        | loop, `turn`                 | heavy  |
| `lantern-glow`        | Lantern glow   | lantern-glow                  | bloom through the shared pass                                                         | color        | loop, `flicker`              | heavy  |
| `dew-drop`            | Dew drop       | dew-on-silk, nodes only       | the beaded edges are dropped                                                          | color        | still                        | medium |
| `colorblind-patterns` | Patterns       | colorblind-patterns           | 8 patterns over the fill color; bind `pattern` with the `"index"` scale               | color        | still                        | light  |
| `foil-shimmer`        | Foil shimmer   | foil-shimmer-search           | foil on the matched nodes only; no dimming of others                                  | color        | loop, `sweepSpeed`           | light  |
| `hologram`            | Hologram       | hologram-ghost                | materializes on enter (a Hovered layer: on hover), fades on exit                      | color, times | loop, `flicker`; enter, exit | light  |
| `frost`               | Frost          | frost-pinned                  | a still surface that grows on enter and thaws on exit; put it on a pinned-state layer | color, times | enter 2 s, exit 1 s          | medium |
| `frosted-glass`       | Frosted glass  | new                           | diffuse translucent glass, soft rim                                                   | color        | still                        | medium |
| `liquid-metal`        | Liquid metal   | new                           | chrome with a slowly flowing environment                                              | color        | loop, `speed`                | medium |
| `anodized-steel`      | Anodized steel | new                           | brushed steel with thin-film rainbow color (the soap bubble's film math)              | color        | still                        | medium |

Parameters (id: type, default, range):

| Id                    | Parameters                                                                                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `matcap-ink`          | `tint` P: number, 0.8, 0..1 (how much the node color tints the material)                                                                                                                                                                                |
| `clear-glass`         | `tint` P: number, 0.8, 0..1                                                                                                                                                                                                                             |
| `pearl`               | `tint` P: number, 0.8, 0..1                                                                                                                                                                                                                             |
| `toon-outline`        | `bands` P: integer, 3, 2..6; `inkWidth`: number, 0.16, 0..0.4; `inkColor`: color, `#1b1720`; `lightAngle`: number, 0.12, 0..1                                                                                                                           |
| `halftone`            | `dotScale` P: number, 5, 2..12; `inkColor`: color, `#1b1720`; `paper`: color, `#f3ead6`; `lightAngle`: number, 0.12, 0..1                                                                                                                               |
| `glass-marble`        | `twist` P: number, 2.2, 0..8; `vanes`: integer, 4, 2..10; `ior`: number, 1.5, 1..2.4; `thickness`: number, 0.12, 0.02..0.4; `spin` V: number, 0.25, 0..2; `reflection`: number, 1, 0..2; `glassTint`: color, `#cfe6ff`; `secondColor`: color, `#f2efe6` |
| `gemstone`            | `facets` P: integer, 22, 6..64; `ior`: number, 2.0, 1.2..2.6; `dispersion`: number, 0.06, 0..0.25; `sparkle` V: number, 1, 0..3; `turn`: number, 0.15, 0..2                                                                                             |
| `disco-ball`          | `facets` P: integer, 22, 6..64; `sparkle` V: number, 1, 0..3; `turn`: number, 0.15, 0..2                                                                                                                                                                |
| `lantern-glow`        | `intensity` P V: number, 1.1, 0..4; `falloff`: number, 2.2, 0..8; `ribs`: integer, 9, 0..20; `flicker`: number, 0.3, 0..1; `bloom`: number, 0.7, 0..3                                                                                                   |
| `dew-drop`            | `sparkle` P: number, 1.6, 0..3; `tint`: number, 0.75, 0..1; `bloom`: number, 0.9, 0..2                                                                                                                                                                  |
| `colorblind-patterns` | `pattern` V: integer, 0, 0..7; `density` P: number, 5, 2..8; `contrast`: number, 0.7, 0..1; `rotate`: number, 0, 0..3.14                                                                                                                                |
| `foil-shimmer`        | `foil` P: number, 0.9, 0..1; `sweepSpeed`: number, 0.35, 0..2; `bandWidth`: number, 0.18, 0.02..1; `sparkle`: number, 1.2, 0..3                                                                                                                         |
| `hologram`            | `holoColor` P: color, `#38e8ff`; `scanDensity`: number, 9, 1..30; `flicker`: number, 0.6, 0..1; `glitch`: number, 0.04, 0..0.3; `gridLines`: integer, 8, 2..16                                                                                          |
| `frost`               | `frostColor` P: color, `#d8f2ff`; `crystalScale`: number, 5, 3..24; `sparkle`: number, 0.8, 0..1                                                                                                                                                        |
| `frosted-glass`       | `frost` P: number, 0.6, 0..1; `rim`: number, 0.5, 0..1; `tint`: number, 0.5, 0..1                                                                                                                                                                       |
| `liquid-metal`        | `speed`: number, 0.3, 0..2; `ripple` P: number, 0.5, 0..1; `tint`: number, 0.5, 0..1                                                                                                                                                                    |
| `anodized-steel`      | `film` P: number, 500, 100..1200 (thin-film thickness, nm); `brush`: number, 0.5, 0..1; `tint`: number, 0.2, 0..1                                                                                                                                       |

### 7.2 Node sprites, and the pie renderer

| Id             | Name    | Notes                                                                                                                                     | Reads | Motion                                                            | Cost   |
| -------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------- | ------ |
| `icon-sticker` | Sticker | no peel and no corner flip; the background band is replaced by `finish`; the icon from `iconSdf`, bound per node with the `"index"` scale | color | still; loop for the shiny and holographic finishes, `finishSpeed` | light  |
| `mandala`      | Mandala | folds and hue per node; takes its colors from its own palette, so `node.color` beneath is covered                                         | size  | loop, `spin`                                                      | medium |

| Id             | Parameters                                                                                                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `icon-sticker` | `icon` V: integer, 0, 0..11; `finish` P (Foil): enum, `holographic`, {`none`, `shiny`, `holographic`}; `foil` (Foil strength): number, 0.85, 0..1; `borderColor`: color, `#fbfaf6`      |
| `mandala`      | `folds` V: integer, 0, 0..12 (extra folds); `hueShift` V: number, 0, 0..1; `detail` P: number, 5, 1..12; `spin`: number, 0.25, -2..2; `flow`: number, 0.3, 0..2; `rim`: number, 1, 0..1 |

**Pie, one implementation.** graph-io maps Cytoscape pies to the `node.pie*` channels, which
feat/style-specimens draws as CPU geometry (`NodeDecorationMesh`), one source mesh per distinct pie.
This design replaces that geometry with a GPU pie renderer behind the same channels, for every pie,
imported or styled; there is no `pie` or `donut` shader id. `node.pieHole` is the donut,
`node.pieRadius` and `node.pieFitBox` already make the pie the whole node, and the import path does
not change. Slices (up to 16 per node) are a per-node row of the data texture, never vertex
attributes; past 16, the smallest slices fold into the last and the channel reports
`pie.slice-cap` (`count`, `limit`). The lab's opening sweep and hover explode are dropped: the owner
asked for pie-chart nodes for imports, not animations. This package waits for feat/style-specimens
to land.

### 7.3 Node effects

| Id                    | Name         | Notes                                                                                  | Motion                                 | Blend | Reach | Cost   |
| --------------------- | ------------ | -------------------------------------------------------------------------------------- | -------------------------------------- | ----- | ----- | ------ |
| `uncertainty-aura`    | Aura         | reach, turbulence and flicker grow with `intensity`, bound per node to uncertainty     | loop, `churn`                          | add   | 3     | medium |
| `lock-on-reticle`     | Reticle      | for a Selected layer: snaps in on enter                                                | enter 0.55 s, exit 0.3 s; loop, `spin` | over  | 1.6   | light  |
| `orbiting-satellites` | Satellites   | for a Hovered or Selected layer, or anywhere; moon count per node from `moons`         | loop, `speed`                          | over  | 3.2   | medium |
| `shockwave`           | Shockwave    | small and fast: a ring of about 4 radii over 0.7 s, a small ripple, never moves a node | enter 0.7 s                            | add   | 4     | medium |
| `change-flash`        | Change flash | tint and glint on added or changed nodes                                               | change 1.5 s                           | add   | 1.4   | light  |

| Id                    | Parameters                                                                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `uncertainty-aura`    | `intensity` P V: number, 1.3, 0..2; `spread`: number, 1.4, 0.2..2.5; `turbulence`: number, 1.2, 0..3; `churn`: number, 0.8, 0..3; `auraColor`: color, `#9fb8ff`; `tint`: number, 0.55, 0..1                                    |
| `lock-on-reticle`     | `hudColor` P: color, `#5cffb0`; `spin`: number, 0.6, -3..3; `ticks`: integer, 48, 8..120; `lineWidth`: number, 1.8, 0.5..5                                                                                                     |
| `orbiting-satellites` | `moons` V: integer, 3, 1..12; `speed`: number, 1.5, 0..6; `orbit`: number, 2.1, 1.3..3.2; `tilt`: number, 1.05, 0..1.5; `moonSize`: number, 0.2, 0.05..0.5; `moonColor` P: color, `#cfe8ff`; `ringOpacity`: number, 0.35, 0..1 |
| `shockwave`           | `ringColor` P: color, `#9fd8ff`; `ringGlow`: number, 0.9, 0..1.5; `chroma`: number, 1, 0..4                                                                                                                                    |
| `change-flash`        | `flashColor` P: color, `#e8f4ff`; `glint`: number, 1, 0..3                                                                                                                                                                     |

### 7.4 Edges

| Id              | Kind         | Name          | Notes                                                                                        | Reads        | Motion                   | Cost   |
| --------------- | ------------ | ------------- | -------------------------------------------------------------------------------------------- | ------------ | ------------------------ | ------ |
| `fiber-optic`   | edge-surface | Fiber         | the dark fiber body; pairs with `fiber-packets`                                              | color, width | still                    | medium |
| `fiber-packets` | edge-effect  | Light packets | up to 6 packets that flare on arrival                                                        | color        | loop, `speed`            | medium |
| `comet-tracers` | edge-effect  | Comets        | speed per edge from `speed`, bound to weight                                                 | color        | loop, `speed`            | medium |
| `edge-glow`     | edge-effect  | Edge glow     | from bezier glow, generalized: core, halo and a glint toward the target on any route         | color, width | loop, `glintSpeed`       | medium |
| `edge-change`   | edge-effect  | Edge change   | the edge half of change flash: draws in from the source when added, shrinks out when removed | color, times | change 0.5 s, exit 0.5 s | light  |

| Id              | Parameters                                                                                                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `fiber-optic`   | `glass` P: number, 1, 0..3; `hueSpread`: number, 0.6, 0..1                                                                                                                                                                                                   |
| `fiber-packets` | `packets` P: integer, 3, 1..6; `speed` V: number, 1.2, 0..4; `tail`: number, 14, 2..150; `glint`: number, 0.8, 0..4; `bloom`: number, 0.8, 0..3                                                                                                              |
| `comet-tracers` | `speed` V: number, 1, -3..3; `spacing`: number, 180, 30..800 (px); `tail`: number, 55, 4..200 (px); `headColor` P: color, `#fff6e0`; `tailColor`: color, `#ff7a2a`; `useEdgeColor`: boolean, false; `intensity`: number, 1.2, 0..3; `bloom`: number, 1, 0..3 |
| `edge-glow`     | `glow` P: number, 0.4, 0..2; `glowWidth`: number, 3, 0.5..10; `glintSpeed`: number, 0.35, 0..2; `bloom`: number, 0.6, 0..2                                                                                                                                   |
| `edge-change`   | `flashColor` P: color, `#e8f4ff`                                                                                                                                                                                                                             |

The edge channels that replace three picks: `edge.taper` (the lab's tapered edges; the sliding ring
is dropped), `edge.lift` (weight arcs: bind it with
`encode: { "edge.lift": { by: "data.weight", range: [0, 2] } }`), and `edge.gradientColors`
accepting `source` and `target` (gradient edges:
`set: { "edge.gradientColors": "source target", "edge.gradientKind": "linear" }`).

### 7.5 Scene

| Id              | Kind       | Name        | Notes                                                                                      | Motion          | Cost   |
| --------------- | ---------- | ----------- | ------------------------------------------------------------------------------------------ | --------------- | ------ |
| `nebula`        | background | Nebula      | drawn into its own target (section 5); the community tint is a parameter, off by default   | loop, `drift`   | heavy  |
| `soap-bubble`   | boundary   | Soap bubble | `form: "sphere"`: one thin-film sphere per group, around its members, nested for subgroups | loop, `swirl`   | heavy  |
| `metaball-hull` | boundary   | Hull        | `form: "field"`; `look`: goo, membrane, outline; breathe defaults to 0                     | loop, `breathe` | medium |

| Id              | Parameters                                                                                                                                                                                                                                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nebula`        | `gasA`: color, `#2a0f4a`; `gasB` P: color, `#d0407a`; `gasC`: color, `#1f6fa8`; `density`: number, 0.8, 0..2; `warp`: number, 1, 0..2; `drift`: number, 1, 0..5; `stars`: number, 0.6, 0..1; `twinkle`: number, 0.6, 0..1; `tintBy`: enum, `none`, {`none`, `boundaries`} (the 4 largest groups of the layers' boundaries) |
| `soap-bubble`   | `thickness` P: number, 520, 100..1200; `turbulence`: number, 0.6, 0..1.5; `swirl`: number, 1, 0..4; `clarity`: number, 0.75, 0..1; `shine`: number, 1.2, 0.2..3                                                                                                                                                            |
| `metaball-hull` | `look` P: enum, `goo`, {`goo`, `membrane`, `outline`}; `blobRadius`: number, 7, 2..25; `threshold`: number, 0.5, 0.05..1.5; `breathe`: number, 0, 0..1; `fillOpacity`: number, 0.55, 0..1; `outline`: number, 2.5, 0..8                                                                                                    |

### 7.6 Transitions (registry, section 3.7)

| Id                | Name               | Parameters                                                                                                 |
| ----------------- | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `glide`           | Glide              | `easing`: enum, `ease-in-out`, {`linear`, `ease-in-out`, `spring`}                                         |
| `staggered-glide` | Staggered glide    | `from`: enum, `center`, {`center`, `selection`}; `stagger`: number, 0.5, 0..1                              |
| `arc-move`        | Arc move           | `height`: number, 0.3, 0..1 (of the move's length)                                                         |
| `swirl`           | Swirl              | `turns`: number, 0.5, -2..2                                                                                |
| `fade-through`    | Fade through       | none                                                                                                       |
| `collapse-bloom`  | Collapse and bloom | `hold`: number, 0.1, 0..0.5 (of the duration)                                                              |
| `particle-morph`  | Particle morph     | `particles`: integer, 24, 1..32 per node (capped at 60,000 in all and by quality); `curl`: number, 1, 0..3 |

Every transition's duration is `layoutTransition.seconds` (default 0.8).

---

## 8. Build packages

Each package is one branch, committed on its own, owning the files it lists. Tests follow the root
rules: UI tests drive real input; tests wait on conditions and assert counted work; each preset
gets a story that visual review captures.

Preset packages never edit shared registry files. Each preset owns a folder,
`src/shaders/presets/<id>/` holding `descriptor.ts` (catalog data, no GLSL), `body.ts` (the GLSL
string) and `thumb.webp`, plus its story file `stories/shaders/<id>.stories.ts` and its test
`test/shaders/presets/<id>.test.ts`. The integration package registers them.

### Element foundation (in order)

**E1. Catalog, text checker and channels (no Babylon).** Files: `src/catalog/shaders.ts` (the
types of 3.3, `SHADER_KIND_COVERS`), `src/catalog/shaderRegistry.ts` (`registerShader`, the preset
list read from `src/shaders/presets/index.ts`, created empty here), `src/catalog/shaderText.ts`
(tokenizer, `parseShaderText`, `formatShaderText`, the checks of 4.3, the codes of 4.4),
`src/simple/defineShader.ts`, `"color"` in `OPTION_TYPES`, channel rows in
`src/session/styles/channels.ts` (with `shaderKinds`), the merges in `src/session/styles/repaint.ts`
(by id then per parameter, `true`/`false`/`visible`, null-prototype objects), encode keys that
address a parameter, the `"index"` scale with first-seen order, `LayerSpec.boundary`, the `pinned`
state, `E_UNKNOWN_SHADER` / `E_SHADER_KIND` / `E_UNKNOWN_SHADER_PARAM` at `styles.add`, coverage in
`styles.agreement` and `explain`, `StyleDocument.shaders` (behind the owner's answer), `api/*.api.md`.
Acceptance: every lab body a preset comes from passes the checker with its header (a fixture);
`while`, a 129-step loop, a loop that writes its index, `# define`, a `#` after a line
continuation, a `*/` inside a header string, a non-ASCII byte, a 257-element array, two
128-step loops nested through a helper, and a 17 KB body each return their code with line and
column; `formatShaderText(parseShaderText(x))` round-trips; a lower layer's `speed` for one shader
never reaches another a higher layer switches to; two layers adding different effects both appear
and a higher `false` removes one; a fifth effect reports `shader.effect-cap`; `__proto__` as a
parameter key is refused; a misspelled shader id refuses at `add` listing the valid ids; the
`./catalog` and `./session` entry points pass the "no Babylon, Lit or DOM" test; binding a varying
parameter on 10,000 nodes keeps the source mesh count at 1.

**E2. Shader runtime, session and trust.** Files: `src/shaders/runtime/` (the wrapper: version,
precision, uniforms, name prefixing, helpers, `Q` as a uniform, the NaN guard; the inline shader
store keyed by text hash; the one-at-a-time compile queue; the test frame; the scene time uniform
buffer; claims), `src/shaders/chunk.ts` (the lazy renderer chunk), `src/session/shaders.ts`
(`session.shaders`), the trust gate and `shaderSettings`, the crash marker, quarantine on context
and device loss, the AI command path passing `"content"`, two reference shaders used only by tests.
Acceptance (browser): a broken pasted shader leaves the shape drawn, reports `shader.compile` with
a line, and the loop rests within 2 frames; with only still shaders the loop rests; a style file
with a pasted shader opens held, draws the shape, and draws the shader after `approve`; a file
carrying `shaderSettings.untrusted: "run"` still opens held; a marked crash holds a trusted hash on
the next load; a context lost in a hidden tab quarantines nothing; `add` with `apply` is undone by
one Undo; disposing four graphs in a row on WebKit leaves a fifth able to start; a graph with no
shader draws pixel-identical frames before and after this package.

**E3. Node drawing.** Files: `src/meshes/NodeShaderPlugin.ts` (mesh-path surfaces),
`src/meshes/NodeBillboardBatch.ts` (impostor surfaces and sprites, with ring, glow and halo from
the radius, and the pick proxy), `src/meshes/NodeEffectBatch.ts` (its own packed buffer), the two
instance attributes in `Node.applyInstancePaint`, the parameter-set and state-time data textures,
state stamps in `Node.setSelected`, the hover roster, pin and data change, entrance rate limits.
Acceptance: a surface over a Degree layer takes each node's degree color; a sprite node is picked
by a real click inside its radius and not outside; the halo and label draw on a selected sprite
node; a loop effect on an off-screen node releases its claim; with 10,000 nodes and a loop shader,
the active meshes stay frozen across 120 frames; pixels change between two frames on a frozen
material; Select all on 500 nodes with a reticle layer plays at most 64 entrances.

**E4. Quality and the guard.** Files: `src/managers/ShaderGuard.ts` (levels, the GPU-bound guard,
recovery, `renderQuality`), level-of-detail program selection, the render-target budget, the
flashing readback. Acceptance: forcing GPU-bound 80 ms frames steps quality down and fires
`render-quality`; CPU-bound slow frames (a 10,000-node layout) change nothing; a 300 ms frame with
a heavy shader on screen turns heavy shaders off at once; `guard: false` changes nothing;
reduced motion reports `shader.still`; a test shader that flashes 6 times a second is frozen with
`shader.flashing`.

**E5. Edge drawing.** Files: `src/meshes/edgeJoinShader.ts` and `EdgeLineBatch.ts` (widened slots
only in shader batches, static attributes in their own buffer), the edge-surface hook,
`src/meshes/EdgeEffectBatch.ts`, `edge.taper` and `edge.lift` in `src/meshes/edgeRoute.ts` and the
outline, the removed edge kept for an exit. Acceptance: an edge surface keeps `edge.width`, taper
and arrowheads; an edge effect draws the same on straight, curved and bent edges; a tapered edge's
arrowhead sits at the narrowed end; lifted edges are picked along the lifted route; `edge.lift` in
a 2D view reports `edge.lift-needs-flat-layout`; a removed edge with no exit effect disappears in
the same frame; 10,000 plain edges upload the same bytes per frame as before.

**E6. Scene: background, boundaries, bloom.** Files: the `shader` member of `GraphBackground` in
`RenderManager.applyBackground` (behind the owner's answer), its render target,
`src/meshes/BoundaryPass.ts` (splatted fields, group spheres, the boundary pick), the shared bloom
pass. Acceptance: a background shader draws behind every node and never over a label; two boundary
layers draw nested outlines; boundaries follow a running force layout; a click on an outline
reports `{ kind: "boundary", layer, group }`; bloom is allocated once while a lantern layer exists,
whether or not a lantern is on screen.

**E7. Transitions.** Files: `src/transitions/registry.ts` (`registerTransition`,
`catalog.transitions()`, the preset list read from `src/transitions/presets/index.ts`, created
empty), `layoutTransition` in `Node.update` before `setMeshPosition`, the particle drawable.
Acceptance: a test transition moves nodes over its duration while edges, labels and effects follow
and picking reads the new layout at once; no transition set means positions jump in one frame.

**E8. Pie renderer and gradient end colors** (after feat/style-specimens lands). Files: the GPU pie
renderer replacing `NodeDecorationMesh`'s pie geometry, `pie.slice-cap`, `source` / `target` in
`edge.gradientColors`. Acceptance: a graph-io Cytoscape session with pies draws the same slices,
angles and colors as the style-specimens rendering (pixel comparison) with one source mesh; a
`source target` gradient edge's end pixels match its end nodes' colors.

### Preset batches (each owns only its presets' folders, stories and tests)

Each after E1 to E4, plus the package named. Acceptance for every preset: its descriptor lists
every parameter with the range and default in section 7; its story renders it over a palette layer
and is captured by visual review; each parameter at each end of its range draws without NaN; its
motion is honored (a still preset asks for no frame; a speed-0 loop rests); its cost class matches a
frame measured on the element's own drawing path (not the lab's) on the reference graph at each
quality, and a full-screen zoom at every parameter's maximum stays under the frame budget on the
reference iPad; it flashes at most 3 times a second at any setting; it compiles on WebGPU or
declares `webgpu: "none"`.

- **P1, lit surfaces** (E3): `matcap-ink`, `clear-glass`, `pearl`, `toon-outline`, `halftone`,
  `frosted-glass`, `liquid-metal`, `anodized-steel`.
- **P2, heavy and glowing surfaces** (E3, E6 for bloom): `glass-marble`, `gemstone`, `disco-ball`,
  `lantern-glow`, `dew-drop`, each heavy one with its small-size program.
- **P3, pattern and state surfaces, sprites** (E3): `colorblind-patterns`, `foil-shimmer`,
  `hologram`, `frost`, `icon-sticker`, `mandala`.
- **P4, node effects** (E3): `uncertainty-aura`, `lock-on-reticle`, `orbiting-satellites`,
  `shockwave`, `change-flash`.
- **P5, edges** (E5, E6 for bloom): `fiber-optic`, `fiber-packets`, `comet-tracers`, `edge-glow`,
  `edge-change`.
- **P6, scene** (E6): `nebula`, `soap-bubble`, `metaball-hull`.
- **P7, transitions** (E7): `glide`, `staggered-glide`, `arc-move`, `swirl`, `fade-through`,
  `collapse-bloom`, `particle-morph`, each in `src/transitions/presets/<id>.ts` with its story and
  test.

**I1. Preset integration.** Files: `src/shaders/presets/index.ts` and
`src/transitions/presets/index.ts` (one import line per preset), the catalog fixture test (every
descriptor present, ids unique, every thumbnail loads), `api/*.api.md`. Acceptance:
`catalog.shaders()` lists all 32 shader presets and `catalog.transitions()` all 7.

### App packages (each after the element pieces it shows)

- **A1, shader rows in the existing sections** (after E1 to E4, I1): the Material row, the Shape
  row's sprites and Pie row, shader effects in Effects, the Line section's Pattern choices, Taper
  and Lift, the gallery popover, the parameters popover from descriptors, the "<effect> off"
  entries, context menus, the eye. Acceptance (`*.real-element.test.tsx`, real input): picking
  Glass marble in Material by click writes `node.shader` and opens the popover with focus in its
  first field; hovering tiles leaves the canvas unchanged; a sprite above a Shape row puts "Covered
  by" on the Shape row, and a mandala puts it on Fill; binding a `varies` parameter writes `encode`
  on its parameter key; Aura and Satellites on one layer bind separately; a swap leaves no old
  parameter set; minus moves focus to the section's "+"; undo restores in one step.
- **A2, paste and copy** (after E2): the dialog, problem rows, Copy shader, Duplicate and edit,
  Delete from project, Control+V. Acceptance: pasting a shader with a `while` loop shows one
  problem row on its line, Add disabled, the canvas unchanged; fixing it and pressing Add puts it in
  "In this project" and on the layer, and one Undo removes both; Duplicate and edit on a preset then
  Add gives an equal shader under a `user/` id; Escape closes the dialog from the code box.
- **A3, graph settings** (after E2, E4, E6): Background paint type, Quality and Motion as reader
  preferences, Motion off in the canvas context menu, Held shaders, the load report's Run, remembered
  approvals. Acceptance: choosing Shader and Nebula writes the background config; opening a project
  with a pasted shader names it in the load report, Run draws it, and a reload does not hold it
  again; a forced GPU-bound frame shows the level on the graph's Values tab.
- **A4, group outlines, Selected and Hovered effects, transitions** (after E6, E7, P4, P6, P7): the
  Group outline section with Group by opening at once, folder bulk edit, the boundary pick
  selecting its layer, Transition in the layout form. Acceptance: adding the shockwave on Selected
  and clicking a node plays it once; satellites on Hovered appear on pointer hover only; Hull with
  Group by Community on a Louvain layer draws one outline per community; choosing Glide and
  switching layout animates, and Undo returns the layout.

**D1. Docs** (after I1): a graphty-element guide page "Shaders": the 14-line example first, every
preset with its thumbnail and parameter table, effects and per-element binding, the text format
and its helpers, `defineShader`, trust and device settings; written for a reader who never saw this
repository, and its examples compiled against the published types.

---

## 9. For the owner

One-way doors only; everything else is the team's call and can change with an edit.

1. **The shader text format** (sections 4.1, 4.2): the header keys, `kind` codes, the namespaced
   id rule (bare ids reserved for presets), entry function names, the `NodeInput`, `EdgeInput`,
   `BackgroundInput` and `BoundaryInput` fields, and the helper names become a published format
   once projects save shader text. Pasted shaders are GLSL only, with no textures. Transitions are
   not in the format. Recommended as written.
2. **Where pasted shaders are stored, and the background member** (sections 4.5, 3.6): recommended
   `StyleDocument.shaders` beside `palettes`, and `backgroundType: "shader"` in the saved graph
   config. Either changes a published file format.
3. **Widening exported unions.** Each is exported, so a consumer that switches on it exhaustively
   would stop compiling; treated as possibly breaking under "when unsure, it is breaking":
   `ChannelValue` (gains `ShaderParamSets`, `ShaderEffects`), `ChannelValueKind` (gains kinds for
   them, so generic editors do not draw them as text), `ElementState` (gains `"pinned"`),
   `GraphBackground` (gains the shader member), `OptionType` / `OPTION_TYPES` (gains `"color"`), and
   the keys `LayerSpec.encode` may hold (parameter addresses). The style-specimens branch kept
   `ChannelValue` unchanged by encoding pie arrays as strings; that would work here only by
   encoding parameter maps as strings, which no reader could edit. Recommended: widen them in the
   next grouped major, and in the same major mark `ChannelValue`, `ChannelValueKind`,
   `ChannelGroup`, `ElementState` and `OptionType` as open unions so later additions are minor.
   Every union this design creates is marked open from the start.
4. **Holding shaders from loaded content by default** (section 4.6): a project from someone else
   opens with its pasted shaders held until the reader runs them. Recommended `"hold"`.

---

## 10. Review decisions

Five reviews of the first draft (developer experience, architecture, GPU safety and security, Style
panel and first-time user, performance). Applied as written unless listed here.

Changed in kind rather than as proposed:

- Parameter leaks between shaders: keyed `node.shaderParams` by shader id; the alternative "a
  layer writing `node.shader` resets parameters beneath" was rejected because a layer that tweaks
  one parameter without naming the shader would have no defined owner.
- Shared `shaderValue` / `effectValue` and the request for `values: 1..4` channels: replaced all
  three value channels and `shaderCategory` by binding `varies` parameters directly with `encode`
  (up to 4 per shader), which gives every effect its own binding and authors several per-element
  inputs with no new channels.
- Taper, weight arcs, gradient, pie and transitions left the shader kinds entirely (channels and a
  registry), which also answers the request for a vertex `route()` entry: routes are channels.

Rejected:

- Texture inputs or a `matcap()` helper for registered shaders: no preset samples a texture (the
  lab's matcaps are functions of the normal, its icons distance functions), so parity holds without
  them; `iconSdf` is published instead.
- New `select` / `hover` / `click` triggers: a state selector plus an entrance already says "when
  selected"; the burst on adding an effect to Everything is fixed by not playing entrances for a
  layer's own add or edit, and Select all is bounded by the entrance cap.
- Not offering triggered effects on the Everything layer: with the fix above, an entrance there
  means "a node arrived", which is useful.
- Capping the main drawing buffer by a pixel budget while shaders draw: it would change rendering
  the consumer controls through `pixelRatio`; quality scales only shader render targets.
- A `shaderSettings.maxFps` option: the guard's ladder already halves loop rates when the GPU is
  behind; add the option when a consumer asks for a fixed rate.
- An `on: "pin"` trigger, and "clicked" as a trigger: removed (a pinned-state layer with an
  entrance and exit does it).
- A per-parameter-value `reads` (for the gradient's `ends`): the gradient is no longer a shader.
- The lab's pie opening and explode animations: dropped as unrequested; the owner asked for pie
  nodes for imports.
- The gradient edge's OKLab blend and shimmer, and the tapered edge's sliding ring: dropped with
  the move to channels; the plain gradient between end colors is what was picked.
- A separate "Shader" section on each tab (the first draft's reading of "each set in its own
  styling section"): each kind now lives in the section that owns what it changes; reversible with
  an edit if the owner meant a literal section.
