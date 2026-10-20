# Shader styles: shaders as graphty-element style features

Status: design, 2026-10-20. Builds on the tier 3 Style panel (`design/ui/studio/tier3/design.md`,
the settled behaviors in `design/ui/studio/tier3/decided.md`).

A shader is a small GPU program that decides the color of each pixel of something drawn. This
document turns shaders into ordinary graphty-element styles: a style layer can draw its nodes as
glass marbles, put light running along its edges, or draw a boundary around a group, and the
graphty app sets them in the Style panel the way it sets a color. Readers can pick from presets
the element ships, or paste the text of their own shader.

It covers, in order: the kinds of shader (section 1), how a shader combines with the style layers
beneath it (section 2), the graphty-element API (section 3), the text format for pasted shaders
(section 4), performance and iPad safety (section 5), the app (section 6), the presets to ship
(section 7), and the build packages (section 8). Decisions that only the owner can make are
collected in section 9.

The rules this design obeys come from the repository's `CLAUDE.md`: graphty-element owns every
graph capability and the app only presents it; appearance changes only through style layers; the
element returns facts and codes (`{ code, params }`), never sentences; the simplest example fits
in about 15 lines; the entry points `./session`, `./schema`, `./catalog`, `./extend` and
`./format` stay free of Babylon.js, Lit and the DOM; an algorithm's suggested style paints only
its own result.

---

## 1. The kinds of shader

A shader's kind says what it draws on and what it does to the drawing beneath it. The kind is a
fact in the shader's catalog entry (`ShaderDescriptor.kind`), so the app can sort, filter and mark
shaders without knowing any one of them.

| Kind (code)                                               | What it draws                                                                                                 | Replaces or on top                                        | Owner picks of this kind                                                                                                                                                                                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node surface (`node-surface`)                             | The pixels of the node's own shape, lit by the scene                                                          | Replaces the node's material look; keeps its shape        | matcap Ink, Glass and Pearl; toon outline; halftone; glass marble; gemstone; disco ball; lantern glow; dew drop (the dew-on-silk nodes); colorblind patterns; foil shimmer; hologram ghost; frost (pinned); plus frosted glass, liquid metal, rainbow anodized steel |
| Node glyph (`node-glyph`)                                 | A flat picture facing the camera, in place of the shape                                                       | Replaces the shape                                        | pie and donut; icon sticker; kaleidoscope mandala                                                                                                                                                                                                                    |
| Node effect (`node-effect`)                               | A second drawing around or over the node                                                                      | On top; changes nothing beneath                           | uncertainty aura; and every interaction effect below                                                                                                                                                                                                                 |
| Interaction effect (a node or edge effect with a trigger) | A node or edge effect that plays when an element is selected, hovered, clicked, pinned or changed, then rests | On top                                                    | lock-on reticle (selected); orbiting satellites (hovered or selected); shockwave, small and fast (click); change flash (data change)                                                                                                                                 |
| Edge surface (`edge-surface`)                             | The pixels of the edge's line, or the line's path                                                             | Replaces the line's pattern; keeps width, color and route | gradient; tapered; fiber optic (the fiber body); weight arcs (2D layout in 3D only)                                                                                                                                                                                  |
| Edge effect (`edge-effect`)                               | Light that travels along an edge of any shape                                                                 | On top                                                    | comet tracers; glow and glint (from bezier glow, for any edge); fiber packets                                                                                                                                                                                        |
| Background (`background`)                                 | The whole canvas behind the graph                                                                             | Replaces the background color or image                    | nebula backdrop                                                                                                                                                                                                                                                      |
| Group boundary (`boundary`)                               | One shape around a set of nodes, nested for subgroups                                                         | Behind the nodes; changes nothing on them                 | soap bubble; metaball hulls (goo, membrane, outline)                                                                                                                                                                                                                 |
| Layout transition (`transition`)                          | How nodes move from one layout's positions to the next                                                        | Animates positions only; looks unchanged                  | particle morph; glide; staggered glide; arc; swirl; fade through; collapse and bloom                                                                                                                                                                                 |

Interaction effects are not a kind of their own in the API: they are node or edge effects whose
catalog entry declares a trigger (`motion: { kind: "once", on: ... }`, section 3.3). A trigger is
the only thing that makes them different, so they share the effect machinery, the cap and the
app's rows.

**Surface versus glyph.** A surface keeps the shape the layers beneath chose and shades its pixels,
so a gemstone on a box node is a faceted box. A glyph draws its own flat outline (a pie, a sticker,
a mandala) and the shape is not drawn. The difference decides what still works and what the panel
marks as covered (section 2).

**Not picked, still needed.** A bloom pass (lantern glow, comets, fiber, dew) is one shared scene
pass the element turns on when a shader that asks for it is on screen; it is not a kind and not a
preset. The color-vision preview in the lab's patterns story is a whole-canvas preview, out of
scope here.

---

## 2. Composition with lower style layers

Style layers stack bottom to top, and for each style value ("channel", such as `node.color`) the
highest layer that writes it wins for each element. Shaders follow that rule and add one more:
**effects and boundaries stack instead of replacing each other.**

### 2.1 Per kind

| Kind              | Replaces                                                                                          | Reads from the layers beneath, as inputs                                                                                   | Keeps drawing as before                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Node surface      | the material look: flat shading, wireframe, the lighting preset's shading for these nodes         | resolved color (with any gradient), size, opacity, shape (its normal and outline), the surface's value and category inputs | shape, size, border, outline, glow, halo, label, badges, picking, selection, hover                        |
| Node glyph        | the drawn shape, border, wireframe, flat and unlit                                                | resolved color, size, opacity, the value and category inputs, and the pie or icon data when the glyph draws one            | label, outline ring, glow, halo (drawn as a disc), picking (by the node's drawn radius), selection, hover |
| Node effect       | nothing                                                                                           | resolved color, size, the effect's value input, element state and its times                                                | everything                                                                                                |
| Edge surface      | the line pattern (`edge.style`, `edge.patternCount`); weight arcs also replace the route's height | width, color at each end, opacity, curvature and bends, the edge's value input                                             | width, color source, route, arrowheads, band, labels, selection band                                      |
| Edge effect       | nothing                                                                                           | the line's route, width, end colors, the effect's value input                                                              | everything                                                                                                |
| Background        | the background color or image                                                                     | the scene camera; the largest groups' screen positions when the shader asks                                                | the graph                                                                                                 |
| Group boundary    | nothing                                                                                           | member positions and drawn sizes, members' resolved colors                                                                 | every node and edge                                                                                       |
| Layout transition | the jump from old to new positions                                                                | both position sets                                                                                                         | every look; picking and saved positions read the layout's answer, not the moving picture                  |

Three consequences, stated once so nobody re-derives them:

- **A surface that reads color rides on the color layers.** A Degree layer colors nodes by degree,
  a Marbles layer above it sets only the glass marble surface: every marble takes its degree
  color. The Marbles layer covers nothing in Fill.
- **A glyph covers the Shape rows.** `node.shape` written beneath a glyph is not drawn on those
  nodes. The element counts it as covered (`styles.agreement`, `over`), so the existing caption
  "Covered by Pie on 11 of 77" appears on the Shape row with no new mechanism. `node.size` is not
  covered: the glyph is drawn at the node's size.
- **A shader that does not draw leaves the picture beneath.** While a shader compiles, while it is
  held for approval, when it fails to compile on this device, or when the frame guard turns it
  off, the element draws exactly what the layers beneath draw, never a blank node and never
  magenta, and reports why (section 5).

### 2.2 Two shaders on one element

- **Surface and glyph: last writer wins.** `node.shader` is one channel. A higher layer that sets
  it replaces a lower layer's surface or glyph on the elements both match. `"none"` is a value: it
  covers a lower shader and draws the shape plainly (as "No label" covers a label).
- **Shader parameters merge by parameter.** `node.shaderParams` merges field by field, the way
  label settings already merge (`mergeLabelStyle`): a higher layer can change one parameter of the
  glass marble a lower layer chose and keep the rest. A parameter that names a shader the element
  is not drawing is ignored and reported as not in effect (`shader.param-unused`).
- **Effects stack in layer order, with a cap.** `node.effects` and `edge.effects` hold a map from
  effect id to its parameters. They merge by id: two layers that add different effects both draw;
  two that add the same effect merge its parameters, the higher layer winning per parameter; a
  higher layer writing `false` for an id switches that effect off. Effects draw in the order their
  ids first appear, bottom layer first, so the top layer's effect is drawn last, on top. The cap
  is 4 effects per element; past it, the 4 from the highest layers draw and the rest are reported
  (`shader.effect-cap`, with the effect ids left out). This is CSS box-shadow's list with an id per
  entry, so an entry can be switched off from above.
- **Boundaries stack.** Every layer that writes `node.boundary` draws its own boundaries, so a
  community layer and a subcommunity layer above it give nested hulls. A higher layer writing
  `"none"` on some nodes leaves them out of the lower layer's hull. Capped at 32 boundaries per
  graph (the metaball pass handles 8 per pass; more cost one pass per 8); past the cap,
  `shader.boundary-cap`.
- **The algorithm-style rule still holds.** A suggested style may set a shader or an effect only on
  the elements that carry its result: foil shimmer on search hits only; no surface or effect on
  "everything else". Dimming the rest is the reader's layer, not the algorithm's.

### 2.3 Making the rule visible

Every Shader row in the app carries a chip that says what the shader does to the layers beneath:
**Replaces** (surface, glyph, edge surface, background) or **On top** (effects), and **Around**
for a boundary. The chip is the catalog's kind, worded by the app; its tooltip and the row's
accessible name say the same words ("Glass marble, replaces"). What a surface still reads from
beneath shows as **Uses** chips in its settings popover (Color, Size), so a reader can see why the
Fill row beneath is not covered. Section 6 has the rows.

---

## 3. The graphty-element API

Everything here is additive unless section 9 says otherwise. Names are exact. `@since` is the next
minor of graphty-element.

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

Fourteen lines, no internal concept: a preset named by id, set like a color. Parameters are plain
keys (`set: { "node.shader": "glass-marble", "node.shaderParams": { twist: 2 } }`), an effect is
`set: { "node.effects": { "orbiting-satellites": {} } }`, a background is
`graph.background = { backgroundType: "shader", shader: "nebula" }`.

### 3.2 Style channels

New rows in the channel table (`session/styles/channels.ts`), each in the existing `effects`
channel group (a new group value would widen an exhaustive union consumers may switch on):

| Channel               | Value type                                              | How it merges                    | Role (internal) | What it is                                                                                                                         |
| --------------------- | ------------------------------------------------------- | -------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `node.shader`         | `string` (a node-surface or node-glyph id, or `"none"`) | last writer                      | mesh            | The node's surface or glyph                                                                                                        |
| `node.shaderParams`   | `ShaderParams`                                          | per parameter                    | instance        | Fixed parameter values                                                                                                             |
| `node.shaderValue`    | `number`, 0 to 1                                        | last writer, `combine` allowed   | instance        | The per-node number the shader's varying parameter reads                                                                           |
| `node.shaderCategory` | `number`, an integer from 0                             | last writer                      | instance        | The per-node group index the shader's category parameter reads                                                                     |
| `node.effects`        | `ShaderEffects`                                         | by effect id, then per parameter | content         | The node's effects, interaction effects included                                                                                   |
| `node.effectValue`    | `number`, 0 to 1                                        | last writer, `combine` allowed   | instance        | The per-node number effects read (kept apart from `node.shaderValue` so an aura can read uncertainty while a lantern reads degree) |
| `node.boundary`       | `string` (a boundary id, or `"none"`)                   | stacks per layer                 | group (new)     | Draw a boundary around these nodes                                                                                                 |
| `node.boundaryParams` | `ShaderParams`                                          | per parameter, within one layer  | group           | The boundary's parameters                                                                                                          |
| `node.boundaryGroup`  | `string \| number`                                      | last writer                      | group           | Which boundary within the layer a node belongs to: one boundary per distinct value                                                 |
| `edge.shader`         | `string` (an edge-surface id, or `"none"`)              | last writer                      | mesh            | The edge's surface                                                                                                                 |
| `edge.shaderParams`   | `ShaderParams`                                          | per parameter                    | instance        | Fixed parameter values                                                                                                             |
| `edge.shaderValue`    | `number`, 0 to 1                                        | last writer, `combine` allowed   | instance        | The per-edge number (weight, for example)                                                                                          |
| `edge.effects`        | `ShaderEffects`                                         | by effect id, then per parameter | content         | The edge's effects                                                                                                                 |
| `edge.effectValue`    | `number`, 0 to 1                                        | last writer, `combine` allowed   | instance        | The per-edge number effects read                                                                                                   |

```ts
/** A shader's fixed parameter values, keyed by the parameter ids its catalog entry declares. */
export type ShaderParams = Readonly<Record<string, number | string | boolean>>;

/** Effects by id; `false` switches off an effect a layer beneath adds. */
export type ShaderEffects = Readonly<Record<string, ShaderParams | false>>;
```

`ChannelValue` gains `ShaderParams` and `ShaderEffects` (see section 9, item 3).

**Data reaches a shader only through channels.** A layer binds `node.shaderValue` with the
existing `encode` (`{ by: "data.uncertainty", scale: "linear", range: [0, 1] }`) and
`node.shaderCategory` with the new `"index"` scale (each distinct value its 0-based place in the
order `styles.categories()` lists it; the `scale` field already accepts any string). A shader
declares which of its parameters these feed (`varies: "value" | "category"` in section 3.3): the
parameter then takes `min + v * (max - min)` per element instead of its fixed value. No shader
reads raw data, so palettes, scales, value tables and `combine` stay the one way data turns into
a picture.

**Roles, for the 16 ms repaint budget.** Only the shader id keys a source mesh (one mesh and
material per distinct id, as a shape does). Parameters, values and categories are packed into one
new per-instance buffer beside `color` (written in `applyInstancePaint`), so a value bound to data
never makes a mesh per node. Effects and boundaries are drawables beside the mesh (the `content`
role, and a new internal `group` role that the repaint collects per layer).

**Element state the shaders read**, written by the element and never by a layer: selected,
hovered, pinned, and the time each last changed; `enteredAt` per effect (the moment the element
started carrying it, which is what plays a reticle's snap-in when a node is selected); `changedAt`
(set when an element is added or its data changes; a removed edge is kept drawn for its exit
animation, at most 1 s); hop distance from the selection (one hop today; more hops come with the
change-flash batch only if a preset needs them).

**New selector state**: `{ match: "state", state: "pinned" }` beside `"selected"` and `"hovered"`,
so a layer can put frost or any look on pinned nodes.

### 3.3 The shader catalog

`session.catalog.shaders()` lists every shader the element can draw: its presets, shaders
registered through the API, and pasted shaders in the open project. It is in `CatalogApi` and in
`./catalog` (no Babylon, Lit or DOM).

```ts
export type ShaderKind =
    | "node-surface"
    | "node-glyph"
    | "node-effect"
    | "edge-surface"
    | "edge-effect"
    | "background"
    | "boundary"
    | "transition";

/** What the shader takes from the layers beneath and from element state. */
export type ShaderInput =
    | "color"
    | "size"
    | "opacity"
    | "shape" // nodes
    | "width"
    | "end-colors" // edges
    | "value"
    | "category" // shaderValue / shaderCategory, effectValue
    | "pie"
    | "icon" // node.pie* channels, the icon atlas
    | "selected"
    | "hovered"
    | "pinned"
    | "changed" // element state and its times
    | "members"; // boundaries: member positions and colors

export type ShaderMotion =
    | { kind: "still" } // never asks for frames
    | { kind: "loop"; speedParam?: string } // animates while on screen; still when that param is 0
    | { kind: "once"; on: "enter" | "change" | "pin"; seconds: number }; // plays, then rests

export type ShaderCost = "light" | "medium" | "heavy";

export interface ShaderParamDescriptor {
    readonly id: string; // the key in ShaderParams, and the name in the shader text
    readonly plainName: string; // catalog data, default name; the app may replace it by id
    readonly type: "number" | "color" | "choice" | "boolean";
    readonly default: number | string | boolean;
    readonly min?: number; // number: the element clamps every value to [min, max]
    readonly max?: number;
    readonly step?: number;
    readonly choices?: readonly { readonly id: string; readonly plainName: string }[];
    readonly main?: boolean; // the one value the app shows on the row
    readonly varies?: "value" | "category"; // fed per element by shaderValue / shaderCategory
}

export interface ShaderDescriptor {
    readonly id: string; // "glass-marble"; pasted shaders: their header id
    readonly plainName: string; // "Glass marble"
    readonly kind: ShaderKind;
    readonly params: readonly ShaderParamDescriptor[];
    readonly reads: readonly ShaderInput[];
    readonly motion: ShaderMotion;
    readonly cost: ShaderCost;
    readonly thumbnail?: string; // an image URL; presets ship one, pasted shaders have none
    readonly origin: "element" | "registered" | "pasted";
    readonly requires?: readonly ShaderRequirement[];
    readonly webgpu: "translate" | "native" | "none";
    readonly bloom?: boolean; // turns the shared bloom pass on while drawn
}

/** When the shader can draw. The element reports unmet ones as not in effect, with this code. */
export type ShaderRequirement = "webgl2" | "flat-layout-in-3d";

interface CatalogApi {
    // ...existing methods
    /** Every shader the element can draw, presets first. @since next minor */
    shaders(): readonly ShaderDescriptor[];
}
```

`plainName` and parameter `plainName`s are catalog data, as the root `CLAUDE.md` allows; there is
no description sentence. Cost is a static class from the checker (section 4.3) for pasted shaders
and the lab's measured class for presets.

### 3.4 Defining and registering a shader

The two tiers follow `definePalette` / `registerPalette`.

```ts
// Simple tier, from "@graphty/graphty-element": write the function body, declare the parameters.
import { defineShader } from "@graphty/graphty-element";

defineShader({
    id: "pulse-ring",
    kind: "node-effect",
    params: { tint: { color: "#FFAA00", main: true }, speed: { number: 1, min: 0, max: 4 } },
    motion: "loop",
    glsl: `
        vec4 shade(NodeInput n) {
            float ring = smoothstep(0.04, 0.0, abs(length(n.uv) - fract(n.time * speed)));
            return vec4(tint, ring);
        }`,
});
```

```ts
// Advanced tier, from "@graphty/graphty-element/extend": the full descriptor and the text format.
export interface ShaderRegistration {
    readonly descriptor: Omit<ShaderDescriptor, "origin" | "cost"> & { cost?: ShaderCost };
    readonly glsl: string; // the body, as in section 4.2
    readonly wgsl?: string; // optional native WebGPU body (descriptor.webgpu "native")
}
export function registerShader(registration: ShaderRegistration, options?: RegisterOptions): void;

// From "@graphty/graphty-element/catalog" (no DOM): read and check shader text.
export function parseShaderText(text: string): ShaderTextResult;
export type ShaderTextResult =
    | { readonly ok: true; readonly registration: ShaderRegistration }
    | { readonly ok: false; readonly problems: readonly ShaderProblem[] };
export interface ShaderProblem {
    readonly code: ShaderProblemCode; // section 4.4
    readonly params: Readonly<Record<string, string | number>>; // line, column, limit, ...
}
export function formatShaderText(registration: ShaderRegistration): string; // the inverse
```

`defineShader` and `registerShader` refuse with `E_BAD_COMMAND` naming the member at fault, and
with `E_DUPLICATE_PLUGIN` for a preset id, as `definePalette` does. Both run the static checks of
section 4.3. Registered shaders are trusted code (the page's author wrote them) and are never held
for approval.

### 3.5 Pasted shaders in a session

`session.shaders` manages shaders that belong to the open project (pasted, or arrived in a file):

```ts
export interface SessionShaders {
    /** Check and add shader text to the project, one undoable step. Compiles on the canvas when one is attached. */
    add(text: string): Promise<ShaderAddResult>;
    /** Replace a pasted shader's text, keeping its id; layers using it redraw. One undoable step. */
    replace(id: string, text: string): Promise<ShaderAddResult>;
    /** Remove a pasted shader; layers naming it draw what lies beneath and report shader.unknown. */
    remove(id: string): Promise<void>;
    /** The shader's text in the format of section 4, for presets too (what "Copy shader" copies). */
    source(id: string): string;
    /** Whether a shader draws now, and if not, why. */
    status(id: string): ShaderStatus;
    /** Shaders that arrived in loaded content and wait for the reader's approval. */
    held(): readonly HeldShader[];
    /** Run a held shader; remembered for this text (by hash) on this device. */
    approve(id: string): void;
}

export type ShaderAddResult =
    | { readonly ok: true; readonly descriptor: ShaderDescriptor }
    | { readonly ok: false; readonly problems: readonly ShaderProblem[] };

export interface ShaderStatus {
    readonly state: "ready" | "compiling" | "failed" | "held" | "off" | "not-checked";
    readonly problem?: ShaderProblem; // why it is failed, held or off
}

export interface HeldShader {
    readonly id: string;
    readonly plainName: string;
    readonly kind: ShaderKind;
    readonly hash: string;
    readonly usedBy: number; // layers and settings that name it
}
```

`add` runs the static checks, then (when a canvas is attached) compiles asynchronously in the
element's own engine and draws one test frame (section 4.3). Headless, in Node, it stops after the
static checks and the status is `"not-checked"`. Nothing is written to the project until the
result is `ok`.

Events, on the element and on `session.events`: `shader-status` (`{ id, state, problem? }`),
`shader-held` (`{ ids }`, after a load), `render-quality` (`{ from, to, code }`, section 5).

### 3.6 Graph-level settings

These are configuration, beside the background and the selection look, because each is one per
graph:

```ts
// GraphBackground gains a member (section 9, item 2):
{ backgroundType: "shader"; shader: string; params?: ShaderParams; color?: string /* drawn until the shader draws */ }

// GraphStyle gains:
layoutTransition?: { transition: string; seconds?: number; params?: ShaderParams };  // absent: positions jump, as today
shaderSettings?: {
    quality?: "auto" | "low" | "medium" | "high";   // default "auto"
    motion?: "system" | "on" | "off";               // default "system": follows prefers-reduced-motion
    untrusted?: "hold" | "run" | "refuse";          // default "hold" (section 4.6)
    maxAnimated?: number;                           // default from quality (section 5)
};
```

Element properties mirror them: `graph.background` (exists), `graph.layoutTransition`,
`graph.shaderSettings`. Each default is the neutral behavior underneath: no transition, quality
chosen from the device, motion following the platform's setting. A consumer that wants a spectacle
sets it.

**Interaction effects need no new setting.** A layer that matches selected nodes
(`{ match: "state", state: "selected" }`, the app's Selected starting row) and adds
`"shockwave-click"` to `node.effects` plays the shockwave once each time a node is selected,
because the shockwave's motion is `once` on `enter`. Hover works the same with the Hovered row.
Change flash is `once` on `change`, so a layer adds it to any nodes that should flash.

**Groups need no new layer kind.** One layer draws one boundary per distinct `node.boundaryGroup`
value among the nodes it paints:

```ts
await graph.session.styles.add({
    name: "Communities",
    target: "node",
    selector: { match: "has", path: "results.louvain.group" },
    set: { "node.boundary": "metaball-hull", "node.boundaryParams": { look: "membrane" } },
    encode: { "node.boundaryGroup": { by: "results.louvain.group", scale: "passthrough" } },
});
```

A layer with no `node.boundaryGroup` draws one boundary around all its nodes, which is how the
app's community folder (one layer per group) gets one hull per layer. The data's own groups
(compound nodes) keep drawing as today; a node surface on a group node (soap bubble) already
shades the group's box.

---

## 4. The pasted shader format

### 4.1 The document

One text form, used for paste, copy, project files and docs. It is GLSL with a JSON header in its
first comment, the shape of ISF (the Interactive Shader Format VDMX and others use), so the header
generates the parameter rows and the text survives a clipboard, a chat or a forum post.

```glsl
/* graphty-shader 1
{
    "id": "pulse-ring",
    "name": "Pulse ring",
    "kind": "node-effect",
    "motion": "loop",
    "params": [
        { "id": "tint",  "type": "color",  "default": "#FFAA00", "main": true },
        { "id": "speed", "type": "number", "default": 1, "min": 0, "max": 4, "name": "Speed" }
    ],
    "webgpu": "translate"
}
*/
vec4 shade(NodeInput n) {
    float ring = smoothstep(0.04, 0.0, abs(length(n.uv) - fract(n.time * speed)));
    return vec4(tint, ring);
}
```

Header keys: `id` (lowercase letters, digits and hyphens, at most 40), `name`, `kind` (section 1
codes), `motion` (`"still"`, `"loop"`, or `{ "once": "enter" | "change" | "pin", "seconds": n }`),
`params` (the fields of `ShaderParamDescriptor`, `name` for `plainName`), `reads` (optional; the
checker infers it from the fields the body uses), `requires`, `bloom`, and `webgpu`:

- `"translate"` (the default): the GLSL runs on the WebGPU renderer through the translation the
  element already loads for its own GLSL (glslang and twgsl).
- `"none"`: WebGL only. On WebGPU the element draws what lies beneath and reports
  `shader.webgpu-unsupported`. For bodies that use something the translation cannot take
  (derivatives such as `fwidth` inside branches are the known case).

Pasted shaders are GLSL only. A native WGSL body is for registered shaders (`ShaderRegistration.wgsl`)
and the element's presets once issue #615 ports the element's shaders.

**Also accepted on paste**, recognised from the text:

- A Shadertoy shader (`void mainImage(out vec4 fragColor, in vec2 fragCoord)` with `iTime`,
  `iResolution`, `iMouse`, no header). It becomes a background, or a node surface with `fragCoord`
  mapped onto the node's square, with no parameter rows; `parseShaderText` returns it with
  `kind: "background"` and the app lets the reader change the kind. `iChannel` textures are
  refused (`shader.texture-unsupported`).
- GLSL with no header that defines one of the entry functions below: no parameters, kind from
  the function's input type.

### 4.2 The fixed signature per kind

The reader writes only `shade` and helper functions or structs. The element writes the version,
`precision highp float`, the uniforms, the varyings, `main`, the quality defines and how the result
combines with what lies beneath. Each declared parameter is a global constant-like name of its
GLSL type (`float`, `vec3` for a color, `int` for a choice index, `bool`).

| Kind         | Entry function                                                   | Return                                                                                                           |
| ------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| node-surface | `vec4 shade(NodeInput n)`                                        | the pixel's color and alpha                                                                                      |
| node-glyph   | `vec4 shade(NodeInput n)`                                        | color and alpha; alpha 0 is outside the glyph (not picked, not drawn)                                            |
| node-effect  | `vec4 shade(NodeInput n)`                                        | color and alpha, drawn over the node on a square `n.reach` times its radius (declared as header `reach`, 1 to 6) |
| edge-surface | `vec4 shade(EdgeInput e)`                                        | the line pixel's color and alpha                                                                                 |
| edge-effect  | `vec4 shade(EdgeInput e)`                                        | color and alpha added over the line                                                                              |
| background   | `vec4 shade(BackgroundInput b)`                                  | the canvas pixel                                                                                                 |
| boundary     | `float field(BoundaryInput g)` and `vec4 shade(BoundaryInput g)` | the field value at a pixel, then its color                                                                       |
| transition   | `vec3 move(TransitionInput t)`                                   | the node's drawn position at progress `t.progress`                                                               |

```glsl
struct NodeInput {
    vec2 uv;          // -1..1 across the node's square (glyphs, effects) or its surface coordinates
    vec3 normal;      // view-space normal of the shape at this pixel (surfaces)
    vec3 viewDir;     // view direction, view space
    vec4 color;       // the resolved node.color, alpha = node.opacity
    float size;       // drawn radius, world units
    float pixelSize;  // drawn radius, screen pixels
    float value;      // node.shaderValue (surfaces) or node.effectValue (effects), 0 if unset
    float category;   // node.shaderCategory, -1 if unset
    float seed;       // a stable 0..1 random per node
    vec4 state;       // selected, hovered, pinned, changed (0 or 1)
    vec4 since;       // seconds since selected, hovered, pinned or unpinned, changed / entered
    float time;       // seconds, wrapped to a period; 0 for a still shader
};
struct EdgeInput {
    float t;          // 0 at the source, 1 at the target
    float side;       // -1..1 across the line
    float lengthPx;   // the edge's length on screen
    float widthPx;    // its drawn width on screen
    vec4 sourceColor; // edge color at each end; both equal the edge color unless a layer
    vec4 targetColor; //   gives the ends their own (the gradient preset reads the nodes' colors)
    float value;      // edge.shaderValue or edge.effectValue
    float seed;
    vec4 state;       // either end selected, either end hovered, 0, changed
    float time;
};
struct BackgroundInput { vec2 uv; vec3 viewDir; vec2 resolution; float time; };
```

Built-in helpers available to every body (from the lab's library): `hash11`..`hash33`, `noise`,
`fbm` (octaves set by quality), `voronoi`, `palette`, `rainbow`, `hsv2rgb`, `oklabMix`,
`blackbody`, `luminance`, the 2D distance functions (`sdCircle`, `sdBox`, `sdRoundBox`,
`sdSegment`, `sdTriangle`, `sdHexagon`, `sdStar5`), `fillAA` and `strokeAA`, and the light:
`lightDir`, `lightColor`, `ambient`, matching the scene's lighting preset. Quality reaches the body
as `Q(lo, med, hi)`, a compile-time choice of loop counts and detail.

These struct fields and helper names are the published contract once projects save shader text
(section 9, item 1).

### 4.3 Validation

In order, each step stopping at its first problems:

1. **Header** (`./catalog`, no DOM): valid JSON, known keys, a known kind, an id that is free (not
   a preset, not another shader in the project), parameter ids that are GLSL identifiers and not
   reserved, defaults inside their ranges, at most 16 parameters, at most one `varies: "value"` and
   one `varies: "category"`.
2. **Static checks** (`./catalog`, no DOM), the rules GLSL ES 1.00 required, applied to the body:
    - at most 16 KB of text;
    - no preprocessor lines (`#define`, `#extension`, `#version`, `#include`);
    - no `uniform`, `attribute`, `in`, `out`, `varying`, `layout`, `precision` declarations, no
      `main`, no names starting `gl_` or `graphty_`;
    - loops only `for` with a constant bound: at most 128 iterations per loop and 1024 for nested
      loops multiplied together; no `while` or `do` (all 90 lab shaders pass; the largest bound is
      96);
    - no texture sampling (no texture inputs are offered in format 1);
    - the entry function exists with its kind's signature;
    - a static cost class: the loop product times the number of noise calls, bucketed light,
      medium, heavy.
3. **Compile** (in the element, asynchronously, with `KHR_parallel_shader_compile` through
   Babylon): in the element's own engine, never a throwaway context (a GPU reset loses every
   context anyway, and iPad Safari refuses new contexts after a few). The lower layers' look draws
   until it is ready.
4. **Test frame**: one frame drawn on a 64 x 64 target at the shader's quality; over 50 ms, the
   shader is refused with `shader.over-budget`.

The element clamps every parameter to its declared range at draw time, replaces a NaN or infinite
result with the color beneath, and wraps `time` so precision holds on 16-bit-float GPUs.

### 4.4 Problem codes

Each is `{ code, params }`; the app writes the words.

| Code                                              | Params                                  | When                                                               |
| ------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| `shader.header-missing`                           |                                         | no header and no recognised entry function                         |
| `shader.header-json`                              | `line`, `column`, `message`             | the header is not JSON                                             |
| `shader.header-key`                               | `key`                                   | an unknown or missing header key                                   |
| `shader.kind-unknown`                             | `kind`                                  |                                                                    |
| `shader.id-invalid` / `shader.id-taken`           | `id`                                    |                                                                    |
| `shader.param-invalid`                            | `param`, `field`                        | a bad type, range or default                                       |
| `shader.too-many-params`                          | `count`, `limit`                        |                                                                    |
| `shader.too-large`                                | `bytes`, `limit`                        |                                                                    |
| `shader.preprocessor`                             | `line`, `column`                        |                                                                    |
| `shader.reserved`                                 | `line`, `column`, `name`                | a declaration or name the element writes                           |
| `shader.loop-unbounded`                           | `line`, `column`                        | `while`, `do`, or a loop bound that is not constant                |
| `shader.loop-too-long`                            | `line`, `column`, `iterations`, `limit` |                                                                    |
| `shader.texture-unsupported`                      | `line`, `column`                        |                                                                    |
| `shader.entry-missing` / `shader.entry-signature` | `kind`, `expected`                      |                                                                    |
| `shader.compile`                                  | `line`, `column`, `message`             | the driver's error, its message as data                            |
| `shader.over-budget`                              | `ms`, `limit`                           | the test frame was too slow                                        |
| `shader.webgpu-unsupported`                       |                                         | `webgpu: "none"` on the WebGPU renderer                            |
| `shader.needs`                                    | `requirement`                           | an unmet `requires` (weight arcs outside a 2D layout in 3D)        |
| `shader.unknown`                                  | `id`                                    | a layer names a shader the catalog does not list                   |
| `shader.held`                                     | `id`                                    | waiting for approval                                               |
| `shader.quarantined`                              | `id`                                    | it was running when the GPU context was lost; off for this session |
| `shader.guard-off`                                | `level`                                 | the frame guard turned it off                                      |
| `shader.param-unused`                             | `param`, `shader`                       | a parameter for a shader not drawn here                            |
| `shader.effect-cap` / `shader.boundary-cap`       | `left`, `limit`                         |                                                                    |

`shader.needs`, `shader.held`, `shader.quarantined`, `shader.guard-off`, `shader.unknown` and
`shader.webgpu-unsupported` are also reported per layer through the existing "draws nothing" call,
so the app's existing caption form shows them on the row.

### 4.5 Storage in project and style files

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

Layers name a shader by id in `node.shader`, `node.effects` and so on, exactly as they name a
preset. A background or transition that names a pasted shader finds it in the same list, so a
project file needs no new member. Why here: a style exported from one project and imported into
another carries the shaders its layers use, as it carries their palettes; the text stays readable
and editable in the saved file. Rejected: a new project member (as `graphty-assets` did for model
files): a style document copied alone would lose its shaders. Rejected: the code as an escaped JSON
string inside each layer: repeated per layer and unreadable.

Note that older builds refuse a style part that names an unknown channel, so a project using any
shader channel will not open its look in a build from before this feature, whatever the storage
choice.

### 4.6 Shaders from someone else

A pasted shader cannot read the page, other sites or the network, and the author has no script to
time anything, so the risk is not secrets. It is availability: a shader that runs too long trips
the GPU watchdog, every WebGL context in the browser is lost, and on iPad the tab can die with the
reader's unsaved work. And nuisance: fast flashing, or deceptive text drawn in the canvas.

- Presets and shaders registered through the API run without asking.
- A shader the reader pastes runs (they chose it, and it passed the test frame).
- **A shader that arrives in loaded content** (a project or style file, an AI command, a URL) is
  held: layers naming it draw what lies beneath, `shader-held` fires, and `session.shaders.held()`
  lists it until `approve`. Approval is remembered per text hash on this device. The setting
  `shaderSettings.untrusted` is `"hold"` by default; `"run"` and `"refuse"` are there for consumers
  that vouch for, or never want, outside shaders. **OWNER DECISION** on the default, because it
  decides what opening a shared project does (section 9, item 4).
- The gate is built as a general "content from outside asks first" mechanism, so the skybox URL
  that is fetched today as soon as a style names it can use it later.
- Flashing: an animated shader whose output luminance swings over half its range more than 3 times
  a second is held to 3 flashes a second by the element (WCAG 2.3.1), whatever its source.

---

## 5. Performance and iPad safety

The lab proved these on an iPad; the element takes them over whole.

**Quality levels** (`shaderSettings.quality`; `"auto"` is high on a desktop, medium on an iPad,
low on a phone; an iPad is a "Macintosh" user agent with more than one touch point):

| Level  | Drawing size cap (x CSS pixels) | Post pass input | `fbm` octaves | Edge pieces | Animated elements |
| ------ | ------------------------------- | --------------- | ------------- | ----------- | ----------------- |
| low    | 0.75                            | 0.5             | 3             | 0.5         | 500               |
| medium | 1.25                            | 0.75            | 4             | 0.75        | 2,000             |
| high   | 1.5                             | 1.0             | 5             | 1.0         | 10,000            |

`Q(lo, med, hi)` in a body picks loop counts and detail per level. Heavy surfaces also have a
level of detail: below 12 px on screen a node draws the preset's cheap form (glass marble: a flat
fresnel glass; gemstone: 8 facets), declared by the preset.

**The frame guard**, in `RenderManager`: frames averaging over 50 ms for one second drop one
quality level. At low, pasted shaders turn off first, then animated presets go still. Frames still
over 200 ms at the floor pause all shader motion. Each step fires `render-quality` with its code
(`guard.slow-frames`, `guard.paused`) and puts `shader.guard-off` on the shaders it stopped. It
measures time between frames, because Safari has no GPU timer query. The guard never raises the
level again by itself in a session; the reader's quality setting does.

**The cap on animated elements**: past the level's number, the elements furthest from the camera
are drawn still (time frozen), reported once per shader as `shader.guard-off` with
`level: "animated-cap"`. `shaderSettings.maxAnimated` overrides the number.

**Render on demand stays.** The element draws a frame only when something changed. A `still`
shader costs nothing at rest. A `loop` shader holds an `animatesEveryFrame` claim only while at
least one element using it is on screen and its speed parameter is not 0, and releases it when
none is. A `once` effect holds the claim for its seconds, then releases it. A layout transition
holds it for its duration. A scene `time` uniform exists only while a claim is held. With
`motion: "system"` and the platform asking for reduced motion, every `loop` shader is drawn still
and `once` effects jump to their end state.

**Context loss.** Kept: a disposed graph loses its WebGL context after a fence
(`releaseWhenIdle`), because Safari refuses new contexts after a few. Added:

- A pasted shader running when the context is lost is quarantined by its text hash for the session
  (`shader.quarantined`) and the graph redraws without it on restore.
- A crash marker in `localStorage` (wrapped, so a blocked storage only skips it) names the pasted
  shaders drawn in the last second; one still marked on the next load (the tab died, which fires
  no event) is held as if it came from a file.

**Precision and limits.** The element forces `highp`, keeps custom code under the WebGL2 minimums
(16 texture units, 224 fragment uniform vectors, 15 varying vectors), and ships every shader's
source inline in Babylon's shader store, as `useBundledStandardShaders` does for the standard
material, so iPad Safari never lazily imports a shader chunk.

**Where the code lives.** Channel rows, descriptors, the text parser, the checker and the codes are
in the Babylon-free `session` and `catalog` code. The GLSL presets and the materials are in a
lazily loaded renderer chunk (as `src/models/chunk.ts` loads model support), fetched the first time
a layer names a shader.

---

## 6. The app

The app reads the catalog and writes channels; it decides nothing about a graph. Everything here
follows Figma's right sidebar as the tier 3 panel does (sections with "+", property rows, popovers
240 px wide beside the panel, chips, no sentences at rest) and every entry of `decided.md`.

### 6.1 A Shader section on the Node and Edge tabs

The Node tab's sections become Shape, Visibility, Text, Fill, Effects, **Shader**, Rendering. The
Edge tab's become Visibility, Text, Line, Arrowheads, Effects, **Shader**. The section lists:

- at most one **surface row** (a surface or a glyph on the Node tab, an edge surface on the Edge
  tab), because `node.shader` is one value;
- one **effect row** per effect the layer adds (`node.effects` entries), interaction effects
  included;
- on the Node tab, one **boundary row** when the layer writes `node.boundary`.

```
 Shader                                               [+]
  [thumb] Glass marble  [Replaces]       (set) (-)
  [thumb] Satellites    [On top] [#D55E00] (=) (set) (-)
  [thumb] Membrane      [Around] Group by Community  (set) (-)
          Covered by Gems on 11 of 77                         existing caption
```

A row is Figma's effect row: the thumbnail (it opens the gallery to swap the shader, as Figma's
effect type select does), the name, the chip, the shader's `main` parameter inline when it declares
one (a color or a number, with the vary glyph when the parameter `varies`), the settings button
that opens the parameters popover, and the minus. The minus removes the row so what is beneath
shows through; on an effect inherited from beneath, the row's menu offers "Turn off here", which
writes `false` for that id. Delete or Backspace on the thumbnail removes it as the minus does.

**The chip** is Replaces, On top or Around, from the catalog kind. Its tooltip and the row's
accessible name use the same word. A trigger adds a second chip naming it: **Select**, **Hover**,
**Change**, **Pin** ("Shockwave [On top] [Select]"), from `motion.on` and the layer's own state
rule.

**Coverage reads as today.** A glyph covers the Shape rows beneath it: they carry "Covered by Pie
on 11 of 77". A surface covers nothing (it reads color and shape). An edge surface covers the Line
section's Pattern row. Effects cover nothing. The Values tab's "Where its look shows" lists the
shader channels like any property.

**A shader that draws nothing keeps its row** with the existing "Draws nothing" caption. The app
words its cause from the element's code (`shader.needs` with `flat-layout-in-3d`, `shader.held`,
`shader.webgpu-unsupported`, `shader.guard-off` and the others); the element supplies no words.

### 6.2 The gallery ("+")

"+" opens the gallery popover beside the panel: search first, with focus; then a two-column grid
of thumbnails with names; then **Paste shader...** as the last item. The app groups the tiles
(Surfaces, Glyphs, Effects, Boundaries on the Node tab; Surfaces, Effects on the Edge tab; "In
this project" for pasted ones); the grouping and its headings are the app's, the kind is the
element's.

- Thumbnails are the catalog's static images. A tile plays no live preview, and hovering it does
  not change the canvas ("A '+' never changes the drawing", 2026-10-18). A tile may cross-fade to
  a second still on hover or focus.
- A tile for a shader already on the layer is marked and picking it opens its row's popover.
- Picking a surface writes `node.shader` with no parameters (the declared defaults draw), adds the
  row, and opens its parameters popover with focus in the first field, as picking Glow does. An
  effect writes its id with `{}`. Escape in the gallery leaves nothing behind.
- Cost shows as a second line on Heavy tiles ("Heavy"); no tile is ever disabled for cost. A tile
  whose `requires` is not met by the view ("flat-layout-in-3d" in 2D) is disabled with its reason
  on a second line, as the "+" menus do; per `decided.md` it is not a Tab stop and keeps the
  reason on hover.

### 6.3 The parameters popover

240 px, beside the panel, one property row per declared parameter in declared order, generated
from the descriptor: number (scrub on the name, Up and Down step, Shift by ten, no spinner),
color (the one Figma color picker), choice (a select), yes or no (a two-word select). A parameter
that `varies` has the vary glyph; binding it writes `encode` on `node.shaderValue` (or
`node.effectValue`, `node.shaderCategory`) with the existing vary picker. Each row has its minus,
which clears the parameter back to the shader's default (and its placeholder-free empty state, per
decision 1.1). Below the parameters, captioned rows: **Uses** (chips for `reads`: Color, Size,
Shape, Pie, Icon), **Motion** (the speed parameter, or "Still"), and for a pasted shader **Edit
code** and **Copy shader**; for a preset, **Copy shader** only (the reader can paste it back,
edited, as their own). Escape in a field follows `decided.md` (reverts what was typed, keeps
focus, says so).

### 6.4 Paste shader

**Paste shader...** (the gallery's last item, or Control+V with focus in a Shader section) opens a
dialog, because code does not fit a popover: the code box, a Kind select (filled from the header,
editable when there is none), and **Add**. The element checks on Add and when typing pauses.

- Problems are rows: "Line 12:8" and the problem, each a button that puts the cursor on that line.
  The words come from the code (`shader.loop-too-long` with `iterations` 400, `limit` 128); the
  driver's own message is shown as data.
- Add stays disabled with its reason on hover until `session.shaders.add` returns `ok`. Nothing is
  written before that, so a failed paste never changes the canvas.
- On success the shader joins the gallery's "In this project" group and is written to the layer
  as if its tile were picked.
- Escape closes the dialog from any control in it (`decided.md`); its text is kept as an unsent
  draft for the session.

### 6.5 Background, interaction effects, boundaries, transitions, quality

- **Background** (Graph settings, no row selected): Background becomes a section with a paint
  type select, **Color / Image / Shader**, as Figma's page fill. Shader shows the gallery filtered
  to backgrounds, and its row is the same as a Shader row (thumbnail, name, Replaces chip, main
  parameter, settings). A background has no elements, so its parameters have no vary glyph.
- **Interaction effects** live on the Selected and Hovered starting rows, in their Shader section,
  like Selected's Halo and Glow in Effects. "+" on Selected offers every effect; the gallery marks
  triggered effects with their trigger chip. Lock-on reticle and the click shockwave sit on
  Selected; orbiting satellites on Hovered or Selected. Change flash goes on any layer.
- **Boundaries**: a Boundary tile in the Node tab's gallery writes `node.boundary` on the layer.
  The boundary row's main value is **Group by**, a vary picker over category values (it writes
  `node.boundaryGroup`); unset, the layer's nodes are one group. On a community folder, the folder's
  bulk edit (tier 3, several layers) gives each layer its own hull in one undo step. Nested folders
  give nested hulls with no further UI.
- **Layout transition**: the toolbar's layout form gains **Transition** (a select of the
  catalog's transitions with None first, and a settings button for duration and the transition's
  parameters). It writes `layoutTransition`; the app's own wish for a default (if any) is a value
  it sets, never the element's default.
- **Quality and motion**: Graph settings gains **Quality** (Auto, Low, Medium, High) and **Motion**
  (System, On, Off). When the frame guard steps down, the graph's Values tab shows the level and
  its cause; no toast.
- **Held shaders**: after opening a project with held shaders, each affected row carries the
  **Held** chip and the "Draws nothing" caption from `shader.held`; Graph settings shows a row
  "Held shaders 2" with **Run** (approves all) and the list in its popover (name, kind, used by N),
  each with Run and **Copy shader** so the reader can read the code first.

---

## 7. Presets to ship

Every owner pick with the owner's changes, plus the three suggestions. Ids are published (they are
saved in projects). Lab sources are in `.worktrees/shader-lab/graphty-element/stories/shader-lab/`
on branch feat/shader-lab; thumbnails start from its `thumbs/`.

### 7.1 Node surfaces

| Id                    | Name           | From the lab                              | Owner change and notes                                                                                             | Reads                     | Motion                    | Cost   |
| --------------------- | -------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------- | ------------------------- | ------ |
| `matcap-ink`          | Ink            | matcap-sampler, toon material             | The owner's "ink": dark ink rim, flat tones                                                                        | color                     | still                     | light  |
| `matcap-glass`        | Glass          | matcap-sampler, jade and chrome materials | The owner's "glass": clear body, bright rim; confirm the tile with the owner (the lab has no material named glass) | color                     | still                     | light  |
| `matcap-pearl`        | Pearl          | matcap-sampler, pearl                     |                                                                                                                    | color                     | still                     | light  |
| `toon-outline`        | Toon outline   | toon-ink                                  | Bands and ink outline, boil 0: no animation, the wobble stays still                                                | color, shape              | still                     | medium |
| `halftone`            | Halftone       | toon-ink                                  | The dot-screen shading only, its own preset                                                                        | color                     | still                     | medium |
| `glass-marble`        | Glass marble   | glass-marble                              | None. Level of detail: flat fresnel glass under 12 px                                                              | color, value (spin)       | loop (speed 0 is still)   | heavy  |
| `gemstone`            | Gemstone       | gemstone, brilliant cut                   | Split from disco ball; no rank threshold built in: the layer's selector decides                                    | color                     | loop (twinkle 0 is still) | heavy  |
| `disco-ball`          | Disco ball     | gemstone, geodesic cut                    | Its own preset; no degree threshold built in                                                                       | color                     | loop                      | heavy  |
| `lantern-glow`        | Lantern glow   | lantern-glow                              | Bloom is the shared scene pass                                                                                     | color, value (brightness) | loop (flicker 0 is still) | heavy  |
| `dew-drop`            | Dew drop       | dew-on-silk, nodes only                   | The beaded edges are dropped                                                                                       | color                     | still                     | medium |
| `colorblind-patterns` | Patterns       | colorblind-patterns                       | Eight patterns by category over the fill color, density by screen size                                             | color, category           | still                     | light  |
| `foil-shimmer`        | Foil shimmer   | foil-shimmer-search                       | Foil only on the nodes the layer matches (search hits); no dimming of others                                       | color                     | loop                      | light  |
| `hologram-ghost`      | Hologram       | hologram-ghost                            | The surface and scan lines in one; materializes on hover                                                           | color, hovered            | loop                      | light  |
| `frost`               | Frost          | frost-pinned                              | Grows on pin, thaws on unpin; reads the element's real pin state and time                                          | color, pinned             | once on pin, 2 s          | medium |
| `frosted-glass`       | Frosted glass  | new                                       | Owner suggestion: diffuse translucent glass, soft rim                                                              | color                     | still                     | medium |
| `liquid-metal`        | Liquid metal   | new                                       | Owner suggestion: chrome with a slow flowing environment                                                           | color                     | loop (speed 0 is still)   | medium |
| `anodized-steel`      | Anodized steel | new                                       | Owner suggestion: brushed steel with thin-film rainbow color (the soap bubble's thin-film math)                    | color                     | still                     | medium |

### 7.2 Node glyphs

| Id             | Name    | Owner change and notes                                                                                                                                                                 | Reads                  | Motion                                            | Cost   |
| -------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------- | ------ |
| `pie`          | Pie     | Draws the `node.pie*` channels from graph-io style imports (branch feat/style-specimens, commit 9afba35ee3); see below                                                                 | color, size, pie       | still, or once on enter with the `open` parameter | light  |
| `donut`        | Donut   | The same renderer with `hole` defaulting to 0.5                                                                                                                                        | color, size, pie       | as pie                                            | light  |
| `icon-sticker` | Sticker | No peel and no corner flip; the background band is replaced by `finish`: none, shiny (a moving highlight sweep), holographic (the foil); icons from the element's icon set by category | color, category, icon  | still, loop for shiny and holographic             | light  |
| `mandala`      | Mandala | Folds from the value, palette by category                                                                                                                                              | color, value, category | loop (spin and flow 0 is still)                   | medium |

**Pie, one implementation.** graph-io maps Cytoscape pies to the `node.pie*` channels, and the
style-specimens branch draws them as CPU geometry (`NodeDecorationMesh`), one source mesh per
distinct pie. This design replaces that geometry with the pie shader for every pie, imported or
styled: the channels stay the only pie schema, the shader packs up to 16 slices per node into the
per-instance buffer (a documented cap; past it, `shader.pie-cap` and the smallest slices fold into
the last), and the import path does not change. Without `node.shader` set, a node with pie
channels draws its shape with the pie on its face, as Cytoscape does; with `node.shader: "pie"` or
`"donut"` the pie is the whole node (the glyph) and gets the lab's opening and hover explode as
parameters. The pie batch therefore depends on feat/style-specimens landing first.

### 7.3 Node effects and interaction effects

| Id                    | Name         | Owner change and notes                                                                                                            | Trigger                                        | Cost   |
| --------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------ |
| `uncertainty-aura`    | Aura         | Reach, turbulence and flicker grow with `node.effectValue`                                                                        | loop (churn 0 is still)                        | medium |
| `lock-on-reticle`     | Reticle      | For the Selected row; snaps in on select, spin 0 rests                                                                            | once on enter, 0.5 s, then loop while spin > 0 | light  |
| `orbiting-satellites` | Satellites   | Only as a hover or selection effect: shipped for the Hovered and Selected rows; moon count from `node.effectValue`                | loop                                           | medium |
| `shockwave-click`     | Shockwave    | Small and fast: a ring of about 4 node radii over 0.7 s, a small ripple, no push on node positions (moving nodes confuse picking) | once on enter (the Selected row: a click)      | medium |
| `change-flash`        | Change flash | Tint and glint on added or changed nodes; edges draw in from their source and shrink out when removed                             | once on change, 1.5 s                          | light  |

### 7.4 Edges

| Id              | Kind         | Name          | Owner change and notes                                                                                                                                                   | Reads             | Cost   |
| --------------- | ------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ------ |
| `gradient`      | edge-surface | Gradient      | OKLab blend from source to target color; shimmer 0 is still. Its `ends` parameter takes the end nodes' colors (default) or the edge color                                | end-colors        | light  |
| `tapered`       | edge-surface | Tapered       | Width from `edge.width` at the source to `endWidth` x it at the target; the sliding ring is a parameter, off by default                                                  | width             | light  |
| `fiber-optic`   | edge-surface | Fiber         | The dark fiber body                                                                                                                                                      | color, width      | medium |
| `weight-arcs`   | edge-surface | Arcs          | Only for a 2D layout shown in 3D (`requires: ["flat-layout-in-3d"]`); height from `edge.shaderValue`; the outward-bowing 3D branch is dropped                            | value             | light  |
| `comet-tracers` | edge-effect  | Comets        | Speed from `edge.effectValue` (weight)                                                                                                                                   | end-colors, value | medium |
| `edge-glow`     | edge-effect  | Glow          | From bezier glow, generalized: core, halo and a glint toward the target on any route, straight, curved or bent; the curve itself stays `edge.curvature` and `edge.bends` | color, width      | medium |
| `fiber-packets` | edge-effect  | Light packets | Up to 6 packets that flare on arrival; pairs with the fiber surface                                                                                                      | color             | medium |

### 7.5 Scene

| Id                | Kind       | Name               | Owner change and notes                                                                                                                                                               | Cost   |
| ----------------- | ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `nebula`          | background | Nebula             | Drawn at half resolution (a quarter at low); drift 0 redraws only when the camera moves; the community tint reads the 4 largest `node.boundaryGroup` or category groups when present | heavy  |
| `soap-bubble`     | boundary   | Soap bubble        | One thin-film sphere per group, centered on its members, nested for subgroups                                                                                                        | heavy  |
| `metaball-hull`   | boundary   | Hull               | `look`: goo, membrane, outline; breathe defaults to 0 (less animation)                                                                                                               | medium |
| `glide`           | transition | Glide              | Eased straight move; the plain choice                                                                                                                                                | light  |
| `staggered-glide` | transition | Staggered glide    | Delayed by distance from the center or by hop from the selection                                                                                                                     | light  |
| `arc`             | transition | Arc                | Along a raised curve                                                                                                                                                                 | light  |
| `swirl`           | transition | Swirl              | Turning about the graph's center while moving                                                                                                                                        | light  |
| `fade-through`    | transition | Fade through       | Fade out, move, fade in                                                                                                                                                              | light  |
| `particle-morph`  | transition | Particle morph     | Nodes dissolve into curl-noise particles and reform; particles capped at 60,000 / node count per node, and by quality                                                                | medium |
| `collapse-bloom`  | transition | Collapse and bloom | Everything to the centroid, then out                                                                                                                                                 | light  |

---

## 8. Build packages

Each package is one branch, committed and landed on its own, owning the files it lists. Tests
follow the root rules: UI tests drive real input; tests wait on conditions; each preset gets a
story that visual review captures.

### Element foundation (in order)

**E1. Catalog, channels and checker (no Babylon).**
Files: `src/catalog/shaders.ts` (types of section 3.3), `src/catalog/shaderRegistry.ts`
(`registerShader`), `src/catalog/shaderText.ts` (`parseShaderText`, `formatShaderText`, the static
checks of 4.3 and the codes of 4.4), `src/simple/defineShader.ts`, channel rows in
`src/session/styles/channels.ts`, the merges for `ShaderParams` and `ShaderEffects` and the
per-layer boundary collection in `src/session/styles/repaint.ts`, the `"index"` scale, the
`pinned` selector state, `styles.agreement` counting a glyph as covering `node.shape` and an edge
surface as covering `edge.style`, `StyleDocument.shaders` (behind the owner's answer, section 9),
`api/*.api.md`. Acceptance: every lab shader body passes the checker after its header is added
(a fixture of all 28 picks); a `while`, a 129-iteration loop, a `#define` and a 17 KB body each
return their code with line and column; `formatShaderText(parseShaderText(x))` round-trips; two
layers adding different effects both appear in the repaint column and a higher `false` removes
one; a fifth effect reports `shader.effect-cap`; `node.shaderParams` merges per field; the
`./catalog` and `./session` entry points still pass the "no Babylon, Lit or DOM" test; binding
`node.shaderValue` to a continuous column on 10,000 nodes keeps the source mesh count at 1.

**E2. Node renderer, safety and render hooks.**
Files: `src/shaders/runtime/` (the wrapper that writes version, precision, uniforms, `main`,
helpers and `Q`; the inline shader store registration), `src/meshes/NodeShaderPlugin.ts` (surface,
a `MaterialPluginBase` attached before the freeze, as `InstanceColorShading`), a glyph branch in
`Node.buildMesh` (camera-facing square, bounding-radius picking, disc halo),
`src/meshes/NodeEffectBatch.ts` (effects as thin-instanced squares sharing the per-node buffer),
the per-instance parameter buffer in `Node.applyInstancePaint`, state stamps in `Node.setSelected`,
the hover roster, pin and data change, `src/managers/ShaderGuard.ts` (quality, frame guard,
animated cap, quarantine, crash marker), `animatesEveryFrame` claims, the time uniform, async
compile with the lower look drawn meanwhile, the test frame, `session.shaders`, the approval gate,
the lazy renderer chunk, two reference shaders used only by tests (a flat surface and a pulse
effect). Acceptance (browser): a surface over a Degree layer takes each node's degree color; a
glyph's node is picked by a real click inside its radius and not outside it; the halo and label
still draw on a selected glyph node; a broken pasted shader leaves the shape drawn and reports
`shader.compile` with a line; with only still shaders the render loop rests (no frame for 2 s); a
loop effect on an off-screen node releases its claim; forcing 80 ms frames steps quality down
and fires `render-quality`; a lost context quarantines the pasted shader and the graph redraws
without it; a style file with a pasted shader opens held, draws the shape, and draws the shader
after `approve`; reduced motion draws loop shaders still; disposing four graphs in a row on WebKit
leaves a fifth able to start.

**E3. Edge renderer.**
Files: `src/meshes/edgeJoinShader.ts` and `EdgeLineBatch.ts` widened with t, total length, both end
colors and the value (per-edge color leaves the edge mesh key), the edge-surface hook,
`src/meshes/EdgeEffectBatch.ts`, the weight-arc route in `src/meshes/edgeRoute.ts`.
Acceptance: a gradient edge's source pixel matches the source node's color and its target pixel
the target's; an edge surface keeps `edge.width` and its arrowheads; an edge effect draws the same
on straight, curved and bent edges; 10,000 edges with two colors bound per edge stay one batch
per surface; weight arcs in a 2D view report `shader.needs`.

**E4. Scene: background, boundaries, transitions.**
Files: the `shader` member of `GraphBackground` drawn in `RenderManager.applyBackground` as a
back-most layer (behind the owner's answer), `src/meshes/BoundaryPass.ts` (the half-resolution
field targets, 8 groups per pass, and the per-group sphere for bubble boundaries; recomputed as
members move), `layoutTransition` in `Node.update` before `setMeshPosition` (the one position
writer) with the particle drawable. Acceptance: a background shader draws behind every node and
never over a label; two layers of boundaries draw nested hulls and a `"none"` node drops out of its
hull; boundaries follow a running force layout; a layout change with `glide` moves nodes over its
duration while picking and saved positions read the new layout at once; no transition set means
positions still jump in one frame.

### Preset batches (each after E1 and E2; each owns `src/shaders/presets/<id>.ts`, its thumbnail

in `src/shaders/presets/thumbs/`, its story in `stories/shaders/`, and its test)

- **P1, lit surfaces**: matcap Ink, Glass, Pearl, toon outline, halftone, frosted glass, liquid
  metal, anodized steel, lantern glow (with the shared bloom pass).
- **P2, heavy surfaces**: glass marble, gemstone, disco ball, dew drop, each with its small-size
  form.
- **P3, glyphs and state looks**: pie and donut (replacing `NodeDecorationMesh`'s pie geometry;
  after feat/style-specimens lands), sticker with the icon atlas, mandala, patterns, foil shimmer,
  hologram, frost.
- **P4, node effects**: aura, reticle, satellites, click shockwave, change flash (with the removed
  edge's exit).
- **P5, edges** (after E3): gradient, tapered, fiber and packets, comets, glow, arcs.
- **P6, scene** (after E4): nebula, soap bubble, hull, the seven transitions.

Acceptance for every preset: its catalog entry lists every parameter with a range and default; its
story renders the preset over a palette layer and is captured by visual review; a parameter at
each end of its range draws without NaN; its `motion` is honored (a still preset asks for no
frame; a speed-0 loop preset rests); its cost class matches a measured frame on the reference
graph at each quality; it compiles on the WebGPU renderer or declares `webgpu: "none"`. P3's pie
test: a graph-io Cytoscape session with pies draws the same slices, angles and colors as before
(pixel comparison against the style-specimens rendering) with one source mesh instead of one per
pie.

### App packages (after E1 and E2; each after the element pieces it shows)

- **A1, the Shader section** (`graphty/src/workspace/style/words.ts` SECTIONS, a `ShaderRow`, the
  gallery popover, the parameters popover generated from descriptors, the chips, coverage
  captions, "Turn off here"). Acceptance (`*.real-element.test.tsx`, real input): picking Glass
  marble from the gallery by click writes `node.shader` and opens the popover with focus in its
  first field; hovering tiles leaves the canvas unchanged; the row shows Replaces, and an effect
  row On top; a glyph above a Shape row puts "Covered by" on the Shape row; minus removes and focus
  goes to the section's "+"; binding a `varies` parameter writes `encode` on `node.shaderValue`;
  undo restores in one step.
- **A2, paste and copy** (the dialog, problem rows, Copy shader, Control+V in the section).
  Acceptance: pasting a shader with a `while` loop shows one problem row on its line and Add
  disabled, and the canvas is unchanged; fixing it and pressing Add puts it in "In this project"
  and on the layer; Copy shader on a preset then Paste gives an equal shader under a new id;
  Escape closes the dialog from the code box.
- **A3, graph settings** (Background paint type, Quality, Motion, Held shaders).
  Acceptance: choosing Shader and Nebula writes the background config; opening a project with a
  pasted shader shows Held on its rows and Run draws it; a forced slow frame shows the level on
  the graph's Values tab.
- **A4, interaction effects, boundaries, transitions** (the Selected and Hovered rows' Shader
  section, Group by on the boundary row, folder bulk edit, Transition in the layout form).
  Acceptance: adding the shockwave on Selected and clicking a node plays it once; satellites on
  Hovered appear on pointer hover only; Hull with Group by Community on a Louvain layer draws one
  hull per community; choosing Glide and switching layout animates and Undo returns the layout.

**D1, docs**: a graphty-element guide page "Shaders" (the 15-line example first, presets with
thumbnails, the text format, safety settings), written for a reader who never saw this repository.

---

## 9. For the owner

One-way doors only; everything else above is the team's call and can change with an edit.

1. **The shader text format** (section 4.1 and 4.2): the header keys, `kind` codes, entry
   function names, the `NodeInput` / `EdgeInput` / `BackgroundInput` fields and the helper names
   become a published format once projects save shader text. Also: pasted shaders are GLSL only,
   with `webgpu: "none"` as the explicit WebGL-only flag. Recommended as written.
2. **Where pasted shaders are stored, and the background member** (section 4.5, 3.6): recommended
   `StyleDocument.shaders` (beside `palettes`), and `backgroundType: "shader"` in the saved graph
   config. Either changes a published file format; any shader channel in a saved style already
   makes the style unreadable to older builds.
3. **Widening `ChannelValue`** with `ShaderParams` and `ShaderEffects` (section 3.2). It is an
   exported union, so a consumer that switches on it exhaustively would stop compiling: treated as
   possibly breaking under the rule "when unsure, it is breaking". The alternative keeps it
   additive but is clumsier: parameters as one channel per parameter slot (`node.shaderParam1` to
   `8`) with the descriptor naming the slots. Recommended: widen it, in the next grouped major if
   the owner rules it breaking.
4. **Holding shaders from loaded content by default** (section 4.6): a project from someone else
   opens with its pasted shaders held until the reader runs them. Recommended `"hold"`.
