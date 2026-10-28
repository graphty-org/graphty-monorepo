# Writing Shaders

A shader is a small program that decides the color of each pixel of something the graph draws. You
write its body in GLSL, give it an id and its parameters, and a style layer names it like any other
style value. This is the whole of it:

```ts
import { defineShader, type Graphty } from "@graphty/graphty-element";

export async function heat(element: Graphty): Promise<void> {
    defineShader({
        id: "acme/heat",
        params: { hot: "#ff5500", cold: "#2255ff" },
        glsl: `vec4 shade(NodeInput n) {
            float lit = 0.4 + 0.6 * max(dot(n.normal, lightDir), 0.0);
            return vec4(mix(cold, hot, n.uv.y * 0.5 + 0.5) * lit, 1.0);
        }`,
    });

    await element.session.styles.add({
        name: "Heat",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shaders": [{ shader: "acme/heat", params: { hot: "#ff0000" } }] },
    });
}
```

`defineShader` registers the shader; the layer draws it on every node and sets one of its
parameters. Every other parameter keeps its default.

## Where a shader goes: a target and a place

A shader draws on one **target**, read from its entry function:

| Entry function                  | Target       | Where a layer sets it                                                      |
| ------------------------------- | ------------ | -------------------------------------------------------------------------- |
| `vec4 shade(NodeInput n)`       | `node`       | `node.shaders`: `[{ shader: "<id>", place? }]`                             |
| `vec4 shade(EdgeInput e)`       | `edge`       | `edge.shaders`: `[{ shader: "<id>" }]`                                     |
| `vec4 shade(GroupInput g)`      | `group`      | `node.shaders`, at the place `group`: `[{ shader: "<id>", groupBy? }]`     |
| `vec4 shade(BackgroundInput b)` | `background` | `element.background = { backgroundType: "color", shader: { id: "<id>" } }` |

Each shader also has a **place**, where it draws. It is `"paint"` unless the shader gives `place`,
and `"group"` for a group outline; the background has none.

| Place     | On         | What it does                                                 | Per element           |
| --------- | ---------- | ------------------------------------------------------------ | --------------------- |
| `paint`   | node, edge | Paints the node's or line's own surface                      | one; the topmost wins |
| `replace` | node       | The node's shape is not drawn; the shader draws in its place | one; the topmost wins |
| `over`    | node       | Drawn over the node's paint, inside its outline              | they stack            |
| `around`  | node       | Drawn outside the node's outline, reaching past it           | they stack            |
| `behind`  | node       | Drawn before the node, so the node covers its middle         | they stack            |
| `along`   | edge       | A strip that follows the edge over the line                  | they stack            |
| `group`   | group      | One outline around a group of nodes                          | they stack            |

`replace`, `over`, `around` and `behind` are one drawing, a square facing the camera, so a shader
written for one may be used at any of the four. `places` narrows that list, for a shader that looks
wrong somewhere (an `around` ring with an empty middle declares `places: ["around", "behind"]`).
`paint`, `along` and `group` stay where they are.

A layer lists its shaders, each a use `{ shader, place?, params?, groupBy?, off? }`; `place`
defaults to the shader's own. Layers stack bottom to top, and a layer's list keeps its order. At
`paint` and `replace` the last use wins and covers the other place's beneath it; every other place
stacks (at most four per element). `{ shader: "acme/ring", off: true }` removes that shader from
the elements the layer matches, wherever the layers beneath put it. The same shader may be listed
twice with different parameters.

A `replace` shader covers the shape, size-of-shape and border channels of the layers beneath it. It
and a shape follow "the topmost layer wins": a `node.shape` on a layer above the shader's layer
draws the shape on those nodes, and the shader is not drawn there. `styles.explain()` names a
channel a drawn shader hides with `coveredBy`, and `styles.agreement()` counts them as `covered`.

A use at a place its shader does not allow is refused by `styles.add` with
`shader.place-unsupported` `{ shader, place, allowed }` in the refusal's `errors[].fact`.

### An edge's paint

```ts
import { defineShader, type Graphty } from "@graphty/graphty-element";

export async function flow(element: Graphty): Promise<void> {
    defineShader({
        id: "acme/flow",
        params: { glow: "#66ccff", speed: 1 },
        glsl: `vec4 shade(EdgeInput e) {
            float dash = step(0.5, fract(e.t * e.lengthPx / 16.0 - e.time * speed));
            return vec4(mix(e.color.rgb, glow, dash), e.color.a);
        }`,
    });

    await element.session.styles.add({
        name: "Flow",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.shaders": [{ shader: "acme/flow", params: { speed: 2 } }] },
    });
}
```

`e.t` runs along the edge and `e.lengthPx` is its length on screen, so the dashes keep their size
in pixels however long the edge is.

### One example per target

A ring around the node: `place: "around"`, drawn on a square `reach` times the node's radius.

```glsl
/* graphty-shader 1
{ "id": "acme/ring", "place": "around", "reach": 2, "params": [{ "name": "tint", "type": "color", "default": "#ffaa00" }] }
*/
vec4 shade(NodeInput n) {
    float ring = smoothstep(0.15, 0.0, abs(length(n.uv) - 1.5));
    return vec4(tint * ring, ring);
}
```

A group outline: a soft fill with a bright rim around each group of nodes, written to a layer as
`"node.shaders": [{ shader: "acme/hull", groupBy: "data.community" }]`. A node is a member while it
carries the use; a higher layer's `{ shader: "acme/hull", off: true }` takes the nodes it matches
out, and the outline is drawn again around the rest.

```glsl
/* graphty-shader 1
{ "id": "acme/hull", "params": [{ "name": "tint", "type": "color", "default": "#3388ff" }] }
*/
vec4 shade(GroupInput g) {
    float inside = smoothstep(0.45, 0.55, g.field);
    float rim = inside - smoothstep(0.55, 0.7, g.field);
    float a = 0.2 * inside + 0.8 * rim;
    return vec4(tint, a);
}
```

A background: a gradient from the canvas color, set with
`element.background = { backgroundType: "color", color: "#ffffff", shader: { id: "acme/sky" } }`. The
background is drawn bottom to top: the color, the image of a skybox background
(`{ backgroundType: "skybox", data, shader }`), then the shader. Where the shader's alpha is below 1,
what is beneath it shows; the color also shows until the shader draws, and whenever it cannot.

```glsl
/* graphty-shader 1
{ "id": "acme/sky", "params": [{ "name": "tint", "type": "color", "default": "#88aaff" }] }
*/
vec4 shade(BackgroundInput b) {
    return vec4(mix(canvasColor, tint, b.uv.y * 0.6), 1.0);
}
```

`shaderTemplate({ target, place })` returns a working shader like these for any place, as shader
text, ready to edit.

## Three ways to write one shader

One shader can be written three ways, and each is a lossless copy of the others:

- `defineShader({ ... })`, the simple path, with parameters in short form.
- `registerShader({ descriptor, glsl })`, the advanced path: the full descriptor, and a `wgsl` body
  for native WebGPU.
- Shader text: a `/* graphty-shader 1 { header } */` comment followed by the GLSL. This is the form a
  shader is pasted, copied and saved in. `parseShaderText` reads it and `formatShaderText` writes
  it; `session.shaders.add(text)` adds it to the open project.

The header holds the same keys as `defineShader`, spelled the same, except `glsl` (the text after
the header is the body) and `target` (read from the entry function). Its parameters are a list of
long-form entries, each with a `name`.

`defineShader` and `registerShader` are imported from `@graphty/graphty-element`, and from
`@graphty/graphty-element/extend`, which is free of the renderer and runs in Node.
`parseShaderText`, `formatShaderText` and `shaderTemplate` are in `@graphty/graphty-element/catalog`.

Shader text is also how a shader goes into the graphty app. In a layer's Style tab, the Shaders
section's **+** opens the gallery, and its last tile, **New shader...**, opens a code box: paste the
text there and press Add. A `place` in the header is where the shader draws, and the dialog's Place
field follows it; text with no `place` draws at the place the field shows.

### The name and the id

- `name` is what pickers show. It is optional and defaults to the id's last segment in sentence
  case (`acme/heat-map` is "Heat map"). In `registerShader`'s descriptor the same fact is spelled
  `plainName`; this is the one key spelled differently.
- An id is `"<namespace>/<name>"`: lowercase letters, digits and hyphens, one slash, at most 40
  characters. A bare id (`"heat"`) is refused with `E_BAD_COMMAND`: bare ids belong to the shaders
  the element ships.
- Registering an id the element ships (`"pearl"`) throws `E_DUPLICATE_PLUGIN`, so a saved project
  that names it always means the same shader.
- Defining the same id again replaces the shader, which is how hot reload works. Pass
  `{ strict: true }` as the second argument to throw `E_DUPLICATE_PLUGIN` instead.

## Parameters

Each parameter is a global in the body, named as declared, of its GLSL type.

| Short form         | Long form `type` | GLSL type in the body                |
| ------------------ | ---------------- | ------------------------------------ |
| `1.5` (a number)   | `"number"`       | `float`                              |
| (none)             | `"integer"`      | `int`                                |
| `true` (a boolean) | `"boolean"`      | `bool`                               |
| `"#ff8800"`        | `"color"`        | `vec3`, each channel from 0 to 1     |
| (none)             | `"enum"`         | `int`: the index of the chosen value |

The long form is `{ type, default, min, max, step, varies, primary }`, plus `values` for an enum
(`[{ value: "dots", label: "Dots" }, ...]`) and `plainName` and `description` for a form. A shader
takes at most 16 parameters.

A parameter may not take a name GLSL reserves, the name of a helper or a global below, or the name
of an input struct or one of its fields: that is refused with `shader.reserved`. A name in the
body that starts with `gl_` or `graphty_`, or holds `__`, is refused with `shader.reserved` too.

### Setting parameters on a layer

A use's `params` hold its values over the shader's defaults: `{ shader: "acme/heat", params: { hot:
"#ff0000" } }`.

A parameter declared `varies: true` (a number, an integer or a color; at most 4 per shader) can take
a value per node from your data, with `encode` and the address
`"node.shaders.<shader id>.<parameter>"`, which sets it on the layer's own uses of that shader:

```js
encode: { "node.shaders.acme/heat.hot": { by: "data.score", scale: "linear" } }
```

## The inputs

### NodeInput

| Field           | Type    | Meaning                                                                                                                                              |
| --------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uv`            | `vec2`  | Across the node, in node radii (y up): the node's outline is at length 1 in every place; a square-drawn place reaches out to `reach`.                |
| `local`         | `vec3`  | The point on the node in the node's own orientation, so a camera turning round the node sees another side of a pattern.                              |
| `normal`        | `vec3`  | The surface normal in view space: x right, y up, and a point facing the camera has negative z. A card's normal faces the camera.                     |
| `viewDir`       | `vec3`  | The direction from the camera to the point, in view space.                                                                                           |
| `color`         | `vec4`  | The color and opacity the layers beneath paint (`node.color`, `node.opacity`).                                                                       |
| `size`          | `float` | The node's radius in world units.                                                                                                                    |
| `pixelSize`     | `float` | The node's radius on screen, in drawing-buffer pixels.                                                                                               |
| `seed`          | `float` | A number from 0 to 1, fixed per node.                                                                                                                |
| `selected`      | `float` | 1 while the node is selected, else 0.                                                                                                                |
| `hovered`       | `float` | 1 while the pointer is over the node, else 0.                                                                                                        |
| `pinned`        | `float` | 1 while the node is pinned, else 0.                                                                                                                  |
| `sinceSelected` | `float` | Seconds since the node was selected; -1 when it is not.                                                                                              |
| `sinceHovered`  | `float` | Seconds since the pointer came over the node; -1 when it is not over it.                                                                             |
| `sincePinned`   | `float` | Seconds since the node was pinned; -1 when it is not.                                                                                                |
| `sinceEntered`  | `float` | Seconds since this look or effect began to apply to this node, that is, since its layer's condition began to match it; 10000 when that was long ago. |
| `sinceExited`   | `float` | Seconds since it stopped applying, while its exit plays; -1 otherwise.                                                                               |
| `sinceChanged`  | `float` | Seconds since the node's data changed; -1 when it has not.                                                                                           |
| `time`          | `float` | Seconds on the scene's clock, wrapping every 1024 seconds.                                                                                           |

### EdgeInput

| Field            | Type    | Meaning                                                                                      |
| ---------------- | ------- | -------------------------------------------------------------------------------------------- |
| `t`              | `float` | Along the edge, from 0 at the source to 1 at the target.                                     |
| `side`           | `float` | Across the line, from -1 to 1 at its edges; on an effect, out to `reach`.                    |
| `lengthPx`       | `float` | The edge's length on screen, in pixels.                                                      |
| `widthPx`        | `float` | The line's width on screen, in pixels.                                                       |
| `color`          | `vec4`  | The line's color and opacity at this point, blended from the source end to the target end.   |
| `sourceColor`    | `vec4`  | The color at the source end.                                                                 |
| `targetColor`    | `vec4`  | The color at the target end.                                                                 |
| `seed`           | `float` | A number from 0 to 1, fixed per edge.                                                        |
| `selected`       | `float` | 1 while the edge is selected, else 0.                                                        |
| `hovered`        | `float` | 1 while the pointer is over the edge, else 0.                                                |
| `sourceSelected` | `float` | 1 while the source node is selected, else 0.                                                 |
| `targetSelected` | `float` | 1 while the target node is selected, else 0.                                                 |
| `sinceEntered`   | `float` | Seconds since this look or effect began to apply to this edge; 10000 when that was long ago. |
| `sinceExited`    | `float` | Seconds since it stopped applying, while its exit plays; -1 otherwise.                       |
| `sinceChanged`   | `float` | Seconds since the edge's data changed; -1 when it has not.                                   |
| `time`           | `float` | Seconds on the scene's clock, wrapping every 1024 seconds.                                   |

### GroupInput

| Field           | Type    | Meaning                                                                                                                                                                   |
| --------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uv`            | `vec2`  | The pixel's place on the canvas, from 0 to 1 across and up.                                                                                                               |
| `field`         | `float` | The group's members' summed influence at this pixel: highest near the members, 0 far from them. Pick the level the outline sits at (0.5 is a good start).                 |
| `fieldGradient` | `vec2`  | The direction and rate `field` changes at this pixel: `(0.5 - field) / length(fieldGradient)` is roughly the signed distance to the level 0.5, for an edge of even width. |
| `normal`        | `vec3`  | With `form: "sphere"`, the normal of one sphere around the group; else 0.                                                                                                 |
| `viewDir`       | `vec3`  | Always `(0, 0, 1)`.                                                                                                                                                       |
| `color`         | `vec4`  | The group's color: its layer's fill.                                                                                                                                      |
| `group`         | `float` | Which group of the layer this is, as a number.                                                                                                                            |
| `depth`         | `float` | How deep the layer is among the layers that draw group outlines, counted from the bottom.                                                                                 |
| `time`          | `float` | Seconds on the scene's clock, wrapping every 1024 seconds.                                                                                                                |

### BackgroundInput

| Field        | Type    | Meaning                                                                                           |
| ------------ | ------- | ------------------------------------------------------------------------------------------------- |
| `uv`         | `vec2`  | The pixel's place on the canvas, from 0 to 1 across and up.                                       |
| `viewDir`    | `vec3`  | The direction from the camera through the pixel, in world space.                                  |
| `resolution` | `vec2`  | The canvas's size in drawing-buffer pixels.                                                       |
| `time`       | `float` | Seconds on the scene's clock, wrapping every 1024 seconds.                                        |
| `groupTint`  | `vec4`  | The color of the largest group outlines near this pixel; its alpha is how strongly they are near. |

## Globals and helpers

| Name                                           | Signature                                                                                                                                                                                        |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lightDir`                                     | `vec3`: toward the key light, in view space (up, left, toward you)                                                                                                                               |
| `lightColor`                                   | `vec3`: the key light's color                                                                                                                                                                    |
| `ambient`                                      | `vec3`: the ambient light                                                                                                                                                                        |
| `canvasColor`                                  | `vec3`: the canvas's own color                                                                                                                                                                   |
| `Q`                                            | `float Q(float low, float medium, float high)`, `int Q(int, int, int)`: the value for the quality level                                                                                          |
| `hash11`, `hash12`, `hash13`                   | `float hash11(float)`, `float hash12(vec2)`, `float hash13(vec3)`: a number from 0 to 1                                                                                                          |
| `hash21`, `hash22`, `hash33`                   | `vec2 hash21(float)`, `vec2 hash22(vec2)`, `vec3 hash33(vec3)`                                                                                                                                   |
| `noise`                                        | `float noise(vec2)`, `float noise(vec3)`: smooth value noise, 0 to 1                                                                                                                             |
| `fbm`                                          | `float fbm(vec2)`, `float fbm(vec3)`: layered noise; fewer layers at a lower quality                                                                                                             |
| `voronoi`                                      | `vec2 voronoi(vec2)`: the distances to the nearest and second-nearest cell centers                                                                                                               |
| `palette`                                      | `vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d)`: `a + b * cos(6.28318 * (c * t + d))`                                                                                                    |
| `rainbow`                                      | `vec3 rainbow(float t)`                                                                                                                                                                          |
| `hsv2rgb`                                      | `vec3 hsv2rgb(vec3 hsv)`                                                                                                                                                                         |
| `oklabMix`                                     | `vec3 oklabMix(vec3 a, vec3 b, float t)`: an even blend of two colors                                                                                                                            |
| `blackbody`                                    | `vec3 blackbody(float t)`: from dark red through white                                                                                                                                           |
| `luminance`                                    | `float luminance(vec3)`                                                                                                                                                                          |
| `sdCircle`, `sdBox`, `sdRoundBox`, `sdSegment` | `float sdCircle(vec2 p, float r)`, `float sdBox(vec2 p, vec2 half)`, `float sdRoundBox(vec2 p, vec2 half, float r)`, `float sdSegment(vec2 p, vec2 a, vec2 b)`: signed distance, negative inside |
| `sdTriangle`, `sdHexagon`, `sdStar5`           | `float sdTriangle(vec2 p, float r)`, `float sdHexagon(vec2 p, float r)`, `float sdStar5(vec2 p, float r, float inner)`                                                                           |
| `iconSdf`                                      | `float iconSdf(int icon, vec2 p)`: one of 12 small icons as a signed distance                                                                                                                    |
| `fillAA`, `strokeAA`                           | `float fillAA(float d)`, `float strokeAA(float d, float halfWidth)`: an antialiased fill or stroke of a signed distance                                                                          |
| `rot2`                                         | `mat2 rot2(float angle)`                                                                                                                                                                         |

## What shade() returns

`shade()` returns a `vec4`, color and alpha. Colors are the page's sRGB values from 0 to 1, as
written (`#ff8000` is `vec3(1.0, 0.5, 0.0)`), and what `shade()` returns is written in the same
space, with no conversion.

- Every place returns straight alpha: the color, and how opaque it is, `vec4(tint, a)`. The element
  premultiplies before it blends. Pixels it leaves at alpha 0 show what is beneath.
- A **background** fills the canvas: its alpha is ignored.

A result that is not a number (a division by zero) is replaced with the color beneath.

## Motion, distance and the far body

- A shader loops when its body reads its input's `time` field (`n.time`, `e.time`, `g.time`,
  `b.time`); any other is still. A parameter named like a field never counts. `motion` (`"still"`,
  `"loop"`, `{ loop: { speedParam } }`) overrides that.
- A number or color parameter whose default is bound to a clock, `fade: { by: "since.matched",
domain: [0, 0.3] }`, reads the seconds since a moment mapped onto `range` (default `[0, 1]`,
  clamped). That is how a shader plays in or out: when it draws is its layer's condition.
- `minSize`: the smallest size, in CSS pixels, the square of `replace`, `around` and `behind` is
  drawn at, so a far node stays findable; the look is drawn as if the node were that large. Declaring
  it adds a number parameter `minSize` with that default. A use whose `minSize` is 0 (or a shader
  that declares none) is not drawn on a node under 3 pixels on screen; one with a minimum size is.
- `lowDetail` (in shader text, a second entry `vec4 shadeFar(NodeInput n)` beside `shade`): a
  cheaper body the element draws while nodes are small on screen.
- `preview`: the parameters and the time, in seconds, a thumbnail is drawn at.
- `categories`: where a gallery may file the shader, such as `["Glass"]`.
- `thumbnail`: an image URL of a still picture. Without one, an application can ask the element
  to draw one from the shader.

`glsl` and `lowDetail` may each be a function that loads the body, `() => import("./heat.glsl?raw")`
for example. The shader is listed at once and its body is loaded and checked the first time
something draws it; such a shader gives its `target`, since the entry function is not read until
then.

## What a body may do

Every body is checked before it runs, because a body that runs too long can lose the page's GPU:

- Plain ASCII, at most 16,384 characters, and no `#` lines.
- Every loop has a constant count of at most 128 steps; no `while` or `do`; no recursion.
- No textures.
- A cost budget per pixel, counted over loops and calls.

A problem is a code with its values, such as `{ code: "shader.loop-unbounded", params: { line: 4,
column: 5 } }`, and the application words it.

An editor can check text as the reader types, and show what it will look like before adding it:

```ts
const checked = await graph.session.shaders.check(text, { target: "node", picture: true });
if (checked.ok && checked.picture) preview.src = URL.createObjectURL(checked.picture);
else if (!checked.ok) console.log(checked.problems);
```

The picture is drawn in the element's own engine, framed by what the shader draws on, as
`session.shaders.thumbnail` draws one; nothing is added to the project and the graph is not redrawn.

## When something is wrong

- `defineShader` and `registerShader` are synchronous. A definition that is wrong throws
  `E_BAD_COMMAND`, and `error.details.field` names the member at fault (`"glsl"`,
  `"params.speed.default"`), with every problem in `error.details.problems`.
- Text whose signature draws on another target than the one it is added for is refused with
  `shader.target-mismatch`, with `{ expected, found }`. A place the shader does not allow is
  refused with `shader.place-unsupported`, with `{ shader, place, allowed }`, and a `minSize` that
  none of its places can apply with `shader.min-size-place`, with `{ shader, places }`. A definition
  problem's first code and values are also in `error.details.code` and `error.details.params`.
- A body given as a loader is checked when it loads. If it fails, the shader draws nothing and
  `session.shaders.status(id)` reports `failed` with the problem.
- `styles.add` refuses a layer that names an id the catalog does not list with
  `E_UNKNOWN_SHADER`, listing the ids that would fit there. A layer read from a saved project that
  names one draws what lies beneath until the shader is defined, and
  `session.styles.counts(layer).undrawn` reports `shader.unknown`.
- A driver that cannot compile a body that passed the checks reports `shader.compile`, with the
  driver's message.
