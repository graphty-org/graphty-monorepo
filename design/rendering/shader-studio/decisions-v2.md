# Shaders, second redesign: one "Add shader", a place, and no timing tags

These are the design studio's binding decisions after the owner's second review of the shader work
on branch `feat/shader-studio`. They replace `decisions.md` (the first redesign), which stays as
history. Where this file is silent, a decision of `decisions.md` that the owner did not overturn
still holds; section 10 lists which ones.

**Why reshaping is still free.** No part of the shader API has been released: graphty-element 3.30.0
is the newest release, every shader type is marked `@since 3.36.0`, and none of the shader channels,
`LayerBoundary` or the shader catalog is on origin/master. So every change below to shader API is
an edit, not a breaking change. The only released piece involved is the `node.wireframe` channel,
and it stays exactly as it is. Two released types gain optional members (section 9); both are
additive.

---

## 1. The model a user learns

A user who wants a shader thinks "I want _this look_ on _these nodes_", and then "should it paint
the node, replace it, or sit around it?" So there are three parts, and only three:

1. **Which elements, and when**: the layer's ordinary condition (Everything, Hovered, Selected,
   `score > 5`, changed in the last second). Shaders have no timing tags of their own (section 4).
2. **Which shader**: picked from one gallery that shows a picture of each.
3. **Where it draws**: the _place_. This is an option on the use of a shader, not a kind of
   shader. Every shader has a default place, and the user may move it to any place it allows.

| Place (API) | Words the app shows | On         | What it does                                                                   | Per element           |
| ----------- | ------------------- | ---------- | ------------------------------------------------------------------------------ | --------------------- |
| `paint`     | On the node / line  | node, edge | Paints the node's or line's own surface: Pearl, Glass, Fiber                   | one; the topmost wins |
| `replace`   | Instead of the node | node       | The node's shape is not drawn; the shader draws in its place: Sticker, Mandala | one; the topmost wins |
| `over`      | On the node         | node       | Drawn over the node's paint, inside its outline: Frost, Halftone               | they stack            |
| `around`    | Around              | node       | Drawn outside the node's outline, reaching past it: Aura, Reticle, Shockwave   | they stack            |
| `behind`    | Behind              | node       | Drawn before the node, so the node covers its middle: a shadow, a soft disc    | they stack            |
| `along`     | Along the line      | edge       | A strip that follows the edge over the line: Comets, Light packets, Neon line  | they stack            |
| `group`     | Around the group    | node       | One outline around the nodes the layer matches: Soap bubble, Hull              | they stack            |

**`paint` and `over` share the words "On the node".** No shader can choose between them (`paint`
is fixed, `over` is one of the four square-drawn places), so the user never needs the difference;
the API keeps it because one replaces the surface and the other composites over it. So the app shows
six places on the Node tab, not seven.

**No built-in shader is named after a style option.** Outline, Glow, Halo, Wireframe and Band are
options in the Shape and Line + menus; no preset's name contains one of those words, so a user
never sees two things called "glow". Renamed: Edge glow to Neon line (`neon-line`), Lantern glow to
Lantern (`lantern`), Toon outline to Cel shade (`cel-shade`).

The background is not on a layer, so it keeps its own list (section 2.3) and has no place.

**`replace`, `over`, `around` and `behind` are one drawing.** All four draw a square that faces the
camera; they differ only in draw order, a mask (inside or outside the node's outline) and whether
the node's shape is hidden. So a shader written for one of them can be moved to any of the four,
unless its author narrows the list (section 6). `paint`, `along` and `group` are separate drawings,
so a shader written for one of those stays there.

On a node whose shape is not round, "the node's outline" is its bounding circle for now; the exact
silhouette is the known ceiling.

The words "look", "effect", "card", "sprite", "role", "geometry" and "kind" never appear in the UI,
and `role` and `geometry` leave the element too.

**Resolution across layers.** Layers stack bottom to top, and within a layer the entries keep their
list order.

- For `paint` and `replace`, the last one wins. They also exclude each other: a `replace` covers
  the `paint` beneath it. Whatever is covered is reported through the element's existing coverage
  fact (`styles.agreement`), never dropped silently.
- Every other place stacks in that order.
- An entry `{ shader: "aura", off: true }` removes that shader, wherever lower layers put it, from
  the elements this layer matches.
- **`group` in a per-node list.** A `group` use on a node means "this node is a member of an
  outline". The element draws one outline per (layer, use, `groupBy` value), around the nodes that
  carry that use after resolution. Outlines stack in layer then list order. `off` on a higher layer
  takes the nodes it matches out of every outline of that shader beneath it, so the outline is
  redrawn around the remaining members. A shader whose entry is `shade(GroupInput g)` is allowed
  only at `group`, and only in `node.shaders`.

This is the tool survey's common answer, and the reason for the model. Figma, Spline, Blender,
Unity, Rive and TouchDesigner all attach an effect with one "+" per object into an ordered stack.
In all of them, placement belongs to the attachment, not to the effect's type, and when an effect
runs is decided outside it (states, conditions, or clocks wired in as plain values). Every one of
them treats wireframe as a display mode of the geometry, never as a material.

---

## 2. The panel

### 2.1 Node tab and Edge tab: one Shaders section each

```
Node tab
  Shape                        [+]   + : Shape, Size, Color, Wireframe, Outline, Glow, Halo
    Shape      [Icosphere v]
    Color      [#4a90e2]
    Wireframe  [on]
  Shaders                      [+]   opens the gallery (2.2)
    = [pic] Pearl      On the node           [settings] [-]
    = [pic] Reticle    [Around v]            [settings] [-]
    = [pic] Hull       Around the group      [settings] [-]
  Visibility ...   Text ...

Edge tab
  Line                         [+]   + : Width, Color, Pattern, Band
  Shaders                      [+]
    = [pic] Comets     Along the line        [settings] [-]
```

- **One section and one + per tab.** The Effects section, the Rendering section with its Material
  row, Shape > Shader and the separate Group outline section are all removed. A group outline is a
  shader at the place "Around the group", so it has no section of its own. That is the owner's
  third point taken as written: no sections, galleries or kinds per target.
- **Outline, Glow, Halo, Band and Wireframe are ordinary style options** in their section's +
  menu, not shaders. Outline, Glow, Halo and Wireframe are released channels. Band
  (`edge.bandColor`, `bandWidth`, `bandOpacity`) is unreleased (it exists only on this branch) and
  stays an option on purpose: a flat stripe under the line is a line attribute like Pattern, with
  no code to write, and a GPU program for a flat color buys nothing.
- **The row** shows a drag handle, the picture, the name, the place, a settings button and a minus.
    - The place is a **Place** dropdown only when the shader allows more than one place; otherwise
      it is a static label. The dropdown lists only the allowed places, each with a small diagram
      of where it draws, so a wrong choice is impossible and the diagram explains the words.
    - Rows reorder by drag, and by Alt+Up / Alt+Down from the keyboard. The order is the draw order
      inside one place (section 1).
- **The settings popover** holds:
    - the shader's parameters, made from its descriptor, each with the same "calculated" toggle as
      every other style row;
    - parameters bound to a clock (section 4.3) are ordinary parameter rows whose value shows the
      binding;
    - **Minimum size**, only if the shader declares one (section 5);
    - one cost line, written from the same cost fact the gallery tile shows (2.2), so the words come
      from one place.

    It has no trigger chips and no Motion words.

- **"Instead of the node" keeps the Shape row.** The row keeps its value and gets the caption
  "Hidden: Sticker draws instead of the node", which the app writes from the element's coverage
  fact. Nothing is deleted, and moving the shader to another place brings the shape back. This
  replaces the first redesign's rule that a card deleted the layer's Shape entry.
- **Several layers selected** (Ctrl/Cmd-click, Shift-click, or Select more): + adds the same shader
  to each layer in one undo step, through the existing bulk path.

### 2.2 The gallery: one component everywhere

The same gallery opens from the Node tab's +, the Edge tab's + and the Background's Shader item.

- **Top.** A search field, which has focus when the gallery opens. Under it, a place filter phrased
  as what the user wants: Node tab **All | On the node | Instead of the node | Around | Behind |
  Around the group**; Edge tab **All | On the line | Along the line**. Under that, the origin filter
  **All | Built in | This project**. The chip rows wrap; they are checked at 768 px wide through the
  browser gate.
- **Search also finds the style options** of the tab it opened from (Outline, Glow, Halo,
  Wireframe on the Node tab; Band on the Edge tab). Such a hit is a tile marked as a Shape (or Line)
  option, and picking it adds that option row instead of a shader. That is how a user who types
  "glow" learns that glow is an option, not a shader.
- **Tiles.** Each tile shows:
    - the picture, drawn by the shader's own code at its default place (supplied pictures of the
      presets stay, as decided in the first redesign);
    - the name;
    - a place badge with its diagram;
    - three neutral facts as small icons with text alternatives: whether it animates, its cost, and
      whether it reacts to the scene's light;
    - for a shader that is not built in, its origin ("This project", or the registrant's
      namespace);
    - its menu: Edit code, Duplicate, Copy text, Delete, on the shaders that allow them.
- **Picking a tile** adds the row at the shader's default place and moves focus to that row's Place
  dropdown, so the second decision comes right after the first, with no extra dialog step.
- **"New shader..."** is the last tile. It opens the code dialog, whose first field is the place
  (the same words and diagrams as the filter), preset from the filter or the tab's first place
  under All, so nothing depends on hidden state. The template follows that field ("On the node"
  gives the `paint` template; an author who wants `over` changes the header). No Look/Effect
  question, no Kind select, and pasting replaces the template.
- Keyboard and screen-reader behavior (radiogroup of tiles, arrows, type-ahead), the viewport cap
  and the `categories` headings carry over from the current gallery unchanged.

**How a user tells which shader to use.** They filter by what they want it to do (the place), then
choose by picture, with the animates, cost and light facts to tell close ones apart.

### 2.3 Graph > Style > Background

Background **+** offers Color, Image and Shader, stacked bottom to top, as built on the
`shader-studio-background-stack` branch. Its Shader item opens the same gallery component, showing
background shaders. It stays a separate list because the background is not on a layer.

---

## 3. The owner's second review, answered

1. **"Why is wireframe a shader? It's already built in to Babylon.js."** It is not a shader. The
   Wireframe shader preset of the first redesign is cancelled (it was never built). Wireframe is the
   released `node.wireframe` channel, drawn by Babylon.js's own wireframe mode, and the Shape
   section's + offers it as an on/off row. The sphere looked too dense because wireframe draws every
   triangle of a finely tessellated mesh. So a new optional channel, `node.meshDetail`, draws a
   lower-detail mesh, and the app's Wireframe row turns it to "low" together with the switch. The
   released channel draws exactly as before (section 7).
2. **"Should minimum size be a configuration option? Would you really want it on Freeze?"** No, it
   is not universal. A shader's author opts in by declaring `minSize`, and only then does the user
   see a Minimum size setting, which they can change, set to 0 or bind. Reticle declares it; Frost
   and every surface paint do not, so they show no such setting and scale with the node (section 5).
3. **"Imagine an 'Add shader' button with features like 'replace node'."** That is the model now:
   one Shaders section with one + per tab, one gallery, and the place (on the node, instead of it,
   around, behind, around the group, along the line) as an option on the row, not a kind of
   shader (sections 1 and 2). Node looks, node effects, edge looks, edge effects and group outlines
   are no longer separate galleries, sections or element roles.
4. **"Can 'on enter' and 'on change' be replaced with calculated values?"** Yes. Every timing tag is
   removed: On enter, On change, the exit linger and the descriptor's `motion.enter`, `motion.exit`
   and `motion.change`. When a shader draws is the layer's condition. How it animates is a clock,
   that is, the seconds since a moment (selected, hovered, matched, changed), which is an ordinary
   value that conditions and calculated values can read like any other (section 4).

---

## 4. Timing: conditions and clocks, never tags

### 4.1 When a shader draws

Only the layer's condition decides. A shader on the Selected layer draws while a node is selected;
a hover effect is a shader on a Hovered layer. That is the earlier decision that hover is a
calculated value, now applied to every timing.

**A layer's shaders may keep drawing for a short time after its condition stops matching**, so an
exit animation can play. Only the layer's `node.shaders` and `edge.shaders` uses are held; every
other channel the layer sets (color, size, outline) reverts at once, exactly as today. So no
released behavior changes, and no CPU-painted channel needs a timed repaint.

- The hold of a use is the larger of the layer's optional `keep` (seconds, default 0) and the end
  of the domain of any of its parameters bound to `since.unmatched`. So a shader with an exit
  animation (Reticle's brackets fold away over 0.25 s) plays it out with nothing set by the user,
  and the app sets no `keep` of its own.
- `keep` works for every condition, including `score > 5`; in the app it is "Keep shaders for [ ]
  s after" in the condition picker. The judges' alternative, `hovered || since.unhovered < 0.3` in
  the condition, only works for the three view states and holds every channel; it still works for
  anyone who writes it.

### 4.2 The clocks the element provides

All are seconds, as neutral numbers. A moment that never happened reads as -1.

| Value                                   | Meaning                                                                                               | In conditions and calculated values | In the shader input                                   |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------- |
| `state.selected`, `.hovered`, `.pinned` | the state now, 0 or 1                                                                                 | new path                            | `selected`, `hovered`, `pinned` (exist)               |
| `since.selected`, `since.deselected`    | since selection began / ended                                                                         | new path                            | `sinceSelected` (exists), `sinceDeselected` (new)     |
| `since.hovered`, `since.unhovered`      | the same for hover                                                                                    | new path                            | `sinceHovered` (exists), `sinceUnhovered` (new)       |
| `since.pinned`, `since.unpinned`        | the same for pinning                                                                                  | new path                            | `sincePinned` (exists), `sinceUnpinned` (new)         |
| `since.added`                           | since the element entered the graph                                                                   | new path                            | `sinceAdded` (new)                                    |
| `since.changed`                         | since this element's data last changed                                                                | new path                            | `sinceChanged` (exists; now fed on every data change) |
| `changedFields`                         | the data paths that changed in that update                                                            | new path                            | --                                                    |
| `since.matched`                         | since this layer began to apply to this element                                                       | values only                         | `sinceMatched` (renames `sinceEntered`)               |
| `since.unmatched`                       | since this layer's condition stopped matching (-1 while it matches); only nonnegative during the hold | values only                         | `sinceUnmatched` (renames `sinceExited`)              |

- **One spelling rule.** A path `since.x` is the struct field `sinceX` (GLSL has no dots). The
  page states the rule once instead of two tables.
- **Why `since.matched` cannot be read in a condition.** It is the clock of the layer's own
  condition, so a condition reading it would decide its own start. It is readable in that layer's
  values and shaders only.

- **Adding or editing a layer is not a moment.** The elements a new or edited layer matches at that
  instant read `since.matched` as 1e6 ("long ago"), so they show the end state instead of all
  playing an entrance. This keeps the existing entrance rules (no restart within its own length, a
  cap on how many elements play at once), now keyed on clock-bound parameters.
- **Time conditions are the element's job.** A condition that compares a clock with a constant
  (`since.changed < 1.5`) is re-evaluated by the element exactly at the moment it flips, so a
  "changed recently" layer ends on its own, with no polling by the consumer.
- **A clock in a CPU-painted value is evaluated while it moves, then stops.** "Grow when hovered"
  (`node.size` bound `{ by: "since.hovered", domain: [0, 0.25], range: [1, 1.5] }`) is a style row,
  not a shader. The element repaints that channel each frame only for the elements whose clock is
  inside the binding's domain (a bounded, countable set), and requests no frames once every such
  clock has left it. It is the same stop rule the GPU path uses.
- **Clocks the element cannot bound are refused, not polled.** A clock compared with anything
  other than a constant, or a clock binding with no domain, returns the problem `{ code:
"style.clock-unsupported", params: { layer, path, where } }`, where `where` is `"condition"` or
  `"value"`. It is never quietly checked every frame.
- **"Score changed"** is a condition: `since.changed < 0.6` and `changedFields` contains
  `data.score`. If the rule language cannot test a list today, the element adds that test (additive).

### 4.3 How a shader animates

There is one mechanism: **a number or color parameter bound to a clock** with a linear, pow or
bins scale. There is no `clock` parameter type.

- **An author** gives the binding as the parameter's default: `fade: { by: "since.matched",
domain: [0, 0.3] }` (range defaults to [0, 1], clamped). The body reads `fade` like any
  parameter.
- **A user** binds or rebinds any number or color parameter the same way in the settings popover,
  through the same value picker as any calculated value, for example a Hovered layer's shader with
  `strength` bound to `since.hovered` over [0, 0.25]. The app writes the words ("Starts: When this
  layer starts applying"); the element returns only the bound path.
- **The end of the domain is the stop.** The element evaluates the scale on the GPU from
  timestamps it already keeps, so it costs no CPU work per frame, and it requests no frames for an
  element once every clock binding of its uses has left its domain.
- **Clock bindings do not count** against the limit of four data-bound parameters per shader: that
  limit is per-element data columns, and a clock binding reads only timestamps the element already
  stores and a few uniforms.
- **Reading a clock field directly in the body** (`n.sinceMatched`) still works, as a shortcut.
  The element cannot know when such a body is done, so it treats it as animating while it draws,
  and the gallery's "animates" fact says so. The docs teach the bound form first.
- **Looping** is inferred from the body (it reads the input's `time` field); `motion` keeps only
  `"still" | "loop"` (and `loop.speedParam`), as a declared override. It is a fact the element uses
  for the reduced-motion and quality settings, and it is never shown as a trigger.

### 4.4 What the app does with it

- The condition picker gains "Changed recently" beside Hovered and Selected. It writes
  `since.changed < 1.5`, so a change flash is "pick that condition, then add Change flash", with
  nothing typed. No new starting layer is added, because starting rows are released element
  behavior.
- The condition picker gains "Keep shaders for [ ] s after", writing the layer's `keep`.
- The app does not change its starting layers: an exit animation comes from the shader's own
  `since.unmatched` binding (4.1), so hover and selection feel exactly as they do today.
- The value picker lists the clocks of 4.2 as values, with the app's own words.

---

## 5. Minimum on-screen size: a shader's own option

- **A shader opts in** by declaring `minSize: 40` (CSS pixels). The element then adds a standard
  parameter, `minSize`, with that default. The user can change it, set it to 0 (off) or bind it like
  any other parameter.
- **A shader without `minSize`** has no such parameter, shows no field, and scales with its node.
- **What it does:** the drawn square is `max(reach x node radius on screen, minSize)`.
- **Where it applies:** `replace`, `around` and `behind`. It cannot apply to `paint` or `over`,
  which draw inside the node. A shader that declares `minSize` but allows no place where it applies
  is refused with `shader.min-size-place` `{ shader, places }`.
- **Presets:** Reticle declares 40, with its detail fading scan first, then the inner circle and
  pips, then the ticked ring, and the four brackets last (as in the first redesign). Satellites may
  declare it if its own review asks. Frost, Glass, Pearl and every other surface paint do not.
- **The 3 px skip applies only when the use's `minSize` is 0 or not declared.** A minimum size
  exists to find a tiny node in a zoomed-out graph, so a Reticle with `minSize: 40` on a 2 px
  selected node draws a 40 px square. What keeps an overview from filling with squares is the
  layer's condition (Selected, Hovered); a user who puts a minimum-size shader on Everything sees
  exactly what they asked for, and the cost line says so.

---

## 6. The extension point

Built-in, registered and pasted shaders all go through one definition and share everything the
parity work already merged on this branch: the gallery, the parameter form, the generated picture
when none is supplied, the checker, the cost class, the problem codes and saving. The one intended
difference stays: pasted text must be approved before it runs. WGSL stays registration-only.

### 6.1 The definition

```ts
type ShaderPlace = "paint" | "replace" | "over" | "around" | "behind" | "along" | "group"; // OPEN UNION

interface ShaderDefinition {
    id: string; // "<namespace>/<name>"; presets are bare
    name?: string; // catalog plainName; default: the id's last segment
    place?: ShaderPlace; // the default place; default "paint" (node, edge), "group" (group)
    places?: readonly ShaderPlace[]; // advanced: where a user may move it (see below)
    params?: Record<string, ParamShorthand | ShaderParamInput>; // "#f00", 2, true, or the long form
    minSize?: number; // CSS px; declaring it adds the minSize parameter
    reach?: number; // square-drawn places: size in node radii, 1 to 6
    categories?: readonly string[]; // catalog data
    preview?: { params?: ShaderParams; time?: number };
    thumbnail?: string; // generated from the shader itself when absent
    glsl: string | (() => Promise<string>);
    lowDetail?: string | (() => Promise<string>); // `shadeFar` in shader text
    // advanced, unchanged: motion ("still" | "loop" override), blend, bloom, form, reachParam, requires
}
```

- **Required:** `id` and `glsl`. Everything else is optional with the default shown. `categories`
  is a list of plain strings; `lowDetail` has the same form as `glsl`.
- **`defineShader` registers** the shader (it returns nothing). A use names it by id:
  `ShaderUse.shader` is always the id string.
- **The target** (node, edge, group, background) is still read from the entry function's input,
  so the code cannot disagree with a header. The four entries are `vec4 shade(NodeInput n)`,
  `vec4 shade(EdgeInput e)`, `vec4 shade(GroupInput g)` and `vec4 shade(BackgroundInput b)`.
- **Parameters are bare names** in the body (`color`, `width`), with the GLSL type from the
  parameter's type.
- **Coordinates.** On a node, `n.uv` is centered on the node, -1 to 1, with the node's outline at
  `length(n.uv) == 1` in every place; a square-drawn place extends it out to `reach`. So a body
  never needs `reach` to find the outline. On an edge, `e.t` runs 0 to 1 from source to target and
  `e.side` -1 to 1 across.
- **Alpha is straight (not premultiplied) in every place.** Today paint returns straight alpha and
  effects, along and group return premultiplied; since a shader may now move between places, one
  convention is required, and the element premultiplies before it blends. Presets that premultiply
  are ported.
- **How problems reach the author.** A problem with the definition (`shader.min-size-place`, a body
  the checker refuses) throws from `defineShader` as a `GraphtyError` whose details carry `{ code,
params }`. A problem with a use (`shader.place-unsupported`, `shader.target-mismatch`,
  `style.clock-unsupported`) rejects the run `styles.add` returns, the same way other refused layer
  specs do.
- **Looping** is inferred from reading the input's `time` field (`n.time`, `e.time`, `g.time`,
  `b.time`); nothing else makes a shader loop.
- **`places`**, when absent: a shader whose place is one of the four square-drawn places may be
  moved among all four; `paint`, `along` and `group` stay where they are. An author narrows it, for
  example an "around" shader that leaves the node's middle empty and would look broken in
  `replace` declares `places: ["around", "behind"]`. The first entry is not special: `place` is the
  default, and it must be in `places`.
- **Problem codes:** `shader.place-unsupported` `{ shader, place, allowed }` for a use at a place
  the shader does not allow; `shader.target-mismatch` `{ expected, found }` stays for a use on the
  wrong target (an edge shader on a node layer); `shader.min-size-place` (section 5).
- **Shader text** keeps its form, `/* graphty-shader 1 {header} */` followed by GLSL, with exactly
  the keys above minus `glsl`. The round-trip test over every preset stays.
- **`shaderTemplate({ target, place })`** returns the working template for a place, replacing
  `shaderTemplate({ target, role, geometry })`.
- **`reads`** gains `"light"` when the body reads `lightDir`, so the gallery can show "reacts to
  light" as a fact.

### 6.2 The channels

```ts
interface ShaderUse {
    shader: string;
    place?: ShaderPlace;                                 // default: the shader's own place
    params?: Record<string, ShaderParamValue | Encoding>; // includes minSize, clock bindings
    groupBy?: string;                                    // place "group" only: one outline per value
    off?: true;                                          // remove this shader from lower layers
}
"node.shaders": readonly ShaderUse[];
"edge.shaders": readonly ShaderUse[];
```

A layer is `{ target, selector, set, keep? }`: `keep` sits on the layer beside `selector`, and the
shader lists sit in `set` like every other channel. `place` on a use is optional and falls back to
the shader's own `place`.

They replace `node.shader`, `node.shaderParams`, `node.effects`, `edge.shader`,
`edge.shaderParams`, `edge.effects` and the layer's `boundary` (`LayerBoundary`), all unreleased.
A list rather than a record keyed by id, so the same shader can be used twice with different
settings (two rings) and the order is explicit.

### 6.3 The canonical example (16 lines)

```ts
import { defineShader } from "@graphty/graphty-element/extend";

defineShader({
    id: "acme/ring",
    place: "around",
    params: {
        color: "#ffcc00",
        width: { default: 2, min: 0.5, max: 8 },
        fade: { by: "since.matched", domain: [0, 0.3] },
    },
    glsl: `vec4 shade(NodeInput n) {
        float ring = 1.0 - smoothstep(0.0, width / n.pixelSize, abs(length(n.uv) - 1.2));
        return vec4(color, ring * fade);
    }`,
});

await element.session.styles.add({
    name: "Ring on hover",
    target: "node",
    selector: { match: "state", state: "hovered" },
    set: { "node.shaders": [{ shader: "acme/ring", params: { color: "#00ff88" } }] },
});
```

A layer needs a `name` (it is what a layer list shows and what its id is built from); `LayerSpec`
requires it, so leaving it out fails to compile as well as to run. It names no kind, role, card or
trigger. The ring fades in over 0.3 s whenever a node is hovered,
because the layer's condition is "hovered" and `fade` is bound to the layer's own clock; after
0.3 s the element stops drawing frames for it. The one spelling for adding a layer everywhere in
docs and examples is `element.session.styles.add`, and `defineShader` is always imported from
`/extend`, never the root entry (which pulls in Babylon.js).

The page's edge example lights the edges of the hovered node with the released selector
`{ match: "hover", reach: "neighbors" }`, which on an edge layer matches the edges that touch the
hovered node, so an edge shader needs no endpoint paths of its own.

**The advanced path** adds one line each: `minSize: 40`; `places: [...]`; `reach: 2`; `lowDetail`;
`registerShader` with `wgsl`.

**The published shader page** must state, checked against the code: the four entry signatures;
the parameter short and long forms (including the clock-bound default), their GLSL types and that
they are bare names; every field of the four input structs, including the clocks, the `since.x` to
`sinceX` rule and the -1 and 1e6 readings; the coordinates of 6.1; the GLSL prelude a body may call
(`lightDir`, `lightColor`, `ambient`, `canvasColor`, `Q()`, `palette()`, `noise`, `fbm`,
`voronoi`, the hash helpers, the anti-aliasing helpers) with signatures; straight alpha; the
layer's shape with a hovered and a neighbors example; the place table of section 1 with a picture
of each place; `minSize` in CSS pixels and when the 3 px skip applies; which fields are required;
that `defineShader` registers; how each problem code reaches the author; the limit of four
data-bound parameters and its refusal.

**Gate.** Before the branch lands, an author who sees only that page writes this example and one
edge `along` shader, and both compile against the published types (a compile-only test in
graphty-element runs the example from the docs). The plugin-author personas in
`design/designloom/personas/` are the reviewers.

---

## 7. Wireframe

- **Wireframe is the released `node.wireframe` channel,** drawn by Babylon.js's wireframe mode. It
  is unchanged. No wireframe shader exists or will.
- **New optional channel `node.meshDetail: "full" | "low" | number`** (a number is segments). The
  default, "full", draws exactly today's mesh, which is the neutral behavior of the mechanism.
  "low" draws an icosphere with one subdivision for a sphere, a sphere of 8 segments for other
  round shapes, and leaves shapes that are already low-poly as they are.
- **The detail is part of the mesh cache key,** so only the nodes that ask for low detail get the
  lower-detail mesh, and the solid nodes are unaffected.
- **The app's Wireframe row** writes `node.wireframe: true` and `node.meshDetail: "low"` in one undo
  step; turning it off removes both. This is the app's choice through an element option.
- **Babylon's edges rendering, captured: not added.** Both were drawn through the browser gate on
  2026-10-21 (one node, 600 x 600, the camera 2.6 node diameters away) and judged by eye:
    - At "low" detail, a sphere and an icosphere are both an icosphere of one subdivision (an
      icosahedron, 20 faces). No two of its faces are coplanar, so edges rendering keeps every
      triangle edge: it draws exactly the same 30 lines as `node.wireframe`, only thicker. It reads
      no better, so `node.wireframeStyle` is not added and the app's Wireframe row keeps
      `node.wireframe: true` with `node.meshDetail: "low"`.
    - Edges rendering does read better on a UV sphere (a sphere at `node.meshDetail: 8`): it drops
      the diagonals of the planar quads and draws a clean latitude and longitude globe, where the
      wireframe draws the diagonals too. But "low" never draws a UV sphere, and two costs stand
      against adding it for that case alone. Babylon's edges renderer draws one color per source
      mesh, while a node's color is per instance, so differently colored nodes sharing a mesh would
      draw in one color; and it only finds the globe at an epsilon near 1 (at its default 0.95 an
      8-segment sphere's 18-degree steps count as smooth and nothing but the poles is drawn).
      Building it on a feature-edge index drawn by the node's own material would fix both, and is
      the route if the owner wants the globe.
    - Images, in the main checkout: `tmp/shader-studio/wireframe/sphere-low-wireframe.png`,
      `sphere-low-edges.png`, `icosphere-low-wireframe.png`, `icosphere-low-edges.png`, and for the
      UV sphere `sphere-8-wireframe.png`, `sphere-8-edges.png`, with `sphere-full-wireframe.png`
      (today's default) for comparison.
    - For the owner's next review (section 13): the "low" sphere reads as a twenty-sided die, not a
      globe. If that is too coarse, "low" can become two subdivisions (80 faces) with no new option.
- Saved layers that use `node.wireframe` keep drawing exactly as they do now.

---

## 8. What happens to the work already on feat/shader-studio

**Keep as it is**

- Multi-select of layers (Ctrl/Cmd-click, Shift-click, Select more in the row menu).
- Dropdowns and galleries capped to the iPad viewport (compact-mantine).
- Restoring this tab's own autosave after an iPad tab discard, element half (`AutosaveEntry.own`).

**Keep, adapted to this design**

- **One registration path and parity** (thumbnails, saving, safety the same for every origin).
  The descriptor changes: `place`, `places` and `minSize` in; `role`, `geometry`, `minPixels`,
  `motion.enter/exit/change` out. The drawing the renderer chooses (`ShaderDrawing`, internal) is
  keyed by target and place instead of role and geometry; the runtime code for the square, the
  camera-facing card and the mask inside the node's outline stays where it is.
- **Targets read from the signature**, `shade(GroupInput g)` and `shader.target-mismatch`: kept.
- **`shaderTemplate`** takes `{ target, place }`.
- **The shader guide** (`graphty-element/docs/guide/shaders.md`) is rewritten around the place
  table and the 15-line example.
- **The app's ShaderGallery, ShaderRow, ShaderParams and the code dialog** become the one gallery,
  the one row and the place-based template described in section 2.

**Remove**

- The "On enter" / "On change" chips and their words, and the Motion line's trigger words.
- The Rendering section's Material row (Plain, Wireframe, surfaces), the Effects section, Shape >
  Shader and the Group outline section, in the app.
- `node.shader`, `node.shaderParams`, `node.effects`, `edge.shader`, `edge.shaderParams`,
  `edge.effects`, `LayerBoundary` and the layer's `boundary`, in the element.
- The first redesign's Wireframe preset (never built: do not build it).

---

## 9. Public API changes

| Change                                                                                                                                                            | Status              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `role`, `geometry`, `minPixels`, `motion.enter/exit/change` removed from the descriptor                                                                           | Unreleased: free    |
| `ShaderPlace`, `place`, `places`, `minSize`, clock-bound parameter defaults, `reads: "light"` added; straight alpha everywhere                                    | Unreleased: free    |
| Presets renamed: `edge-glow` to `neon-line`, `lantern-glow` to `lantern`, `toon-outline` to `cel-shade`                                                           | Unreleased: free    |
| Band (`edge.bandColor`, `bandWidth`, `bandOpacity`) stays an option                                                                                               | Unreleased: free    |
| `node.shaders`, `edge.shaders` (`ShaderUse`) replace the six single shader channels and `LayerBoundary`                                                           | Unreleased: free    |
| `sinceEntered` / `sinceExited` renamed `sinceMatched` / `sinceUnmatched`; `sinceAdded`, `sinceDeselected`, `sinceUnhovered`, `sinceUnpinned` added to the structs | Unreleased: free    |
| `shaderTemplate({ target, place })`; problem codes `shader.place-unsupported`, `shader.min-size-place`                                                            | Unreleased: free    |
| `node.meshDetail` channel                                                                                                                                         | Additive            |
| Readable paths `state.*`, `since.*`, `changedFields` in conditions and calculated values; problem code `style.clock-unsupported`                                  | Additive            |
| The layer's optional `keep` (seconds; holds only the shader lists)                                                                                                | Additive            |
| Clock bindings on CPU-painted channels, evaluated while inside their domain                                                                                       | Additive            |
| `node.wireframeStyle`, only if the capture in section 7 favors edges rendering                                                                                    | Additive            |
| `node.wireframe`, Outline, Glow, Halo, the starting rows                                                                                                          | Released: unchanged |

Nothing here breaks a released API, so nothing needs the owner. The one condition from the first
redesign still holds: the shader API must land in one piece from this branch, because once any of
it is released, reshaping it becomes a breaking major.

---

## 10. Still binding from the first redesign

Unchanged, from `decisions.md`: the holographic Sticker finish driven by the light with no time and
no sparkles (5.1); Glass, Frosted glass and Glass marble, with Clear glass removed and Dew drop
renamed Glass (5.2); group outlines that enclose every member, threshold first (5.5); one outline
per layer through bulk edit, now as a `group` use on each layer (5.6); Background + with Color,
Image and Shader (5.7); multi-select (6.1); the iPad caps (6.2); reopening a discarded tab (6.3);
generated thumbnails, saving, held shaders and the shader text format (3.2), with the descriptor
fields of this file.

Superseded by this file: sections 1 (look and effect, Shape > Shader, the Effects gallery), 2 (role
and geometry), 3.3 (the example), the dialog's Look or Effect question in 4, 5.3 (the Wireframe
shader), 5.4 (`minPixels`) and 5.8 (timing).

---

## 11. The branches built but not merged

- **`shader-studio-background-stack`** (uncommitted work in its worktree): fits as it is. Commit,
  merge, and then its Shader item opens the shared gallery.
- **`shader-studio-element-hull`** (commit 6b1cfbef80): fits. Merge it; its outline drawing becomes
  the drawing for the `group` place, fed from `node.shaders` instead of `boundary`.
- **`shader-studio-reopen-app`** (uncommitted work in its worktree): unrelated to this redesign.
  Commit and merge as it is.

---

## 12. Rejected, with the reason

- **A `lingers` or `settles` field on the descriptor.** Both are an exit tag under another name.
  The exit window is the hold of section 4.1, and the end of an animation is the end of a
  clock binding's domain.
- **A `{ match: "changed", within }` selector.** `since.changed < N` in an ordinary condition does
  the same with no new selector member.
- **A two-step Add dialog** (pick a tile, then a Position step, then Add). Adding at the default
  place and moving focus to the row's Place dropdown is one fewer step.
- **A record keyed by shader id for `node.shaders`.** It cannot hold the same shader twice and
  hides the order; the list with `off` keeps the record's one advantage.
- **`node.wireframeDetail`.** `node.meshDetail` is the same capability without tying it to one
  display mode.
- **A "Changed recently" starting layer.** Starting rows are released element behavior; the
  condition picker's "Changed recently" gives the same one-click path.
- **A separate Group outline section.** It is a section per target, which the owner's third point
  asks to drop; "Around the group" is a place in the one gallery.
- **A `clock` parameter type.** It was a second spelling of a clock-bound parameter; one mechanism
  serves users and authors.
- **`keep` holding the whole layer, and the app setting `keep: 0.3` on its starting layers.** It
  would make hover color, size and outline linger, a change to released interaction feel.
- **A layer target `"group"`.** The per-node membership rule in section 1 gives `group` a clear
  meaning inside `node.shaders` without a second kind of layer.

## 13. Watch at the owner's next review

- Asked to "outline each group", does a newcomer find "Around the group" in the Shaders gallery,
  with no section named for it?
- Do the place diagrams make "On the node", "Instead of the node", "Around" and "Behind" clear
  without reading?
- Does "Hidden: Sticker draws instead of the node" answer "where did my node go?"
- Does a Hovered layer with Reticle play in and out with nothing set by the user, while the hover
  color still reverts at once?
- Does a user who types "glow" in the gallery end up with the Glow option?
- Does the wireframe chosen by the section 7 capture read as a clean globe?

---

## 14. Critiques

Red team, on the first version of this file:

1. The 3 px skip defeats minimum size. **Accepted**: the skip applies only without a minimum size
   (section 5); the layer's condition is what limits squares in an overview.
2. Presets and options compete for the same words, and Band is not released. **Accepted**: no
   preset is named after an option, three presets renamed, search finds options (sections 1, 2.2);
   Band corrected to unreleased and kept an option on purpose (2.1, 9).
3. Place still hides kinds, and `group` is undefined in a per-node list. **Accepted**: the Place
   dropdown shows only when there is a choice; `group` resolution written down as per-node
   membership, not a layer target (sections 1, 2.1).
4. "On the node" and "On top" read the same, the chip row is too long, and "New shader..." reads
   hidden state. **Accepted**: paint and over share "On the node" in the app, six chips with full
   words checked at 768 px, and the code dialog asks for the place first (sections 1, 2.2).
5. Layer-wide `keep` and the app's 0.3 default change released hover feel. **Accepted**: `keep`
   holds only the shader lists, a use's hold comes from its `since.unmatched` binding, and the app
   sets nothing (4.1, 4.4).
6. Three ways to animate on a clock. **Accepted**: the `clock` type is gone; a clock is a bound
   parameter, clock bindings do not count against the four, and the reason `since.matched` is not
   readable in a condition is stated (4.2, 4.3). Direct struct reads stay as a documented shortcut.
7. Refusing clocks in CPU-painted values blocks "grow when hovered". **Accepted**: evaluated per
   frame only inside the binding's domain, refused only when unbounded (4.2).
8. The reason for rejecting edges rendering no longer holds at low detail. **Accepted**: section 7
   is open until both are captured and judged by eye.

Blind author, writing the canonical examples from this file alone:

1. The GLSL contract (entry names, parameter access, coordinates, `time`, alpha) is not stated.
   **Accepted**: stated in 6.1 and required on the page.
2. No entry signature for node or edge. **Accepted**: the four signatures are in 6.1.
3. No way for an edge to react to its node's hover. **Accepted** as a documentation gap: the
   released `{ match: "hover", reach: "neighbors" }` already does it (6.3); no new paths.
4. The condition's field and syntax are unnamed. **Accepted**: the example uses the released
   `selector` forms, and the page shows a hovered example.
5. The layer's top-level shape and where `keep` goes. **Accepted**: stated under 6.2.
6. Whether `defineShader` registers, and what `ShaderUse.shader` takes. **Accepted**: it registers;
   a use takes the id (6.1).
7. Place spellings. **Accepted**: the API values are the lowercase words of the table's first
   column; the page shows both.
8. The `params` schema. **Accepted**: short and long forms and the clock-bound default go on the
   page; the separate clock type is gone.
9. Drawing around needs the internal square and `reach`. **Accepted**: the outline is at
   `length(n.uv) == 1` in every place, so a body never needs `reach` (6.1).
10. `minSize` units, name and order with the 3 px skip. **Accepted**: CSS pixels, a parameter named
    `minSize`, no effect at `paint` and `over`, and the skip only without it (5).
11. How problems reach the author. **Accepted**: definition problems throw, use problems reject
    the `styles.add` run (6.1).
12. Required fields and the shape of `lowDetail` and `categories`. **Accepted** (6.1).
13. What makes a shader loop. **Accepted**: only reading `time` (6.1).
14. Whether a use's `place` and a definition's `places` default. **Accepted**: both default as
    stated (6.1, 6.2).

Internal concepts the author had to invent: the camera-facing square is gone from the author's
view (the outline is at 1); the limit of four is on the page with its refusal; `groupBy` and the
coverage fact are advanced and documented there, not in the canonical example.
