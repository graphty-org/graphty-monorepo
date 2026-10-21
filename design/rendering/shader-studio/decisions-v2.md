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
| `over`      | On top              | node       | Drawn over the node's paint, inside its outline: Frost, Halftone               | they stack            |
| `around`    | Around              | node       | Drawn outside the node's outline, reaching past it: Aura, Reticle, Shockwave   | they stack            |
| `behind`    | Behind              | node       | Drawn before the node, so the node covers its middle: a glow, a shadow         | they stack            |
| `along`     | Along the line      | edge       | A strip that follows the edge over the line: Comets, Light packets, Edge glow  | they stack            |
| `group`     | Around the group    | node       | One outline around the nodes the layer matches: Soap bubble, Hull              | they stack            |

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
- An entry `{ shader: "halo", off: true }` removes that shader, wherever lower layers put it, from
  the elements this layer matches.

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
    = [pic] Pearl      [On the node v]       [settings] [-]
    = [pic] Reticle    [Around v]            [settings] [-]
    = [pic] Hull       [Around the group v]  [settings] [-]
  Visibility ...   Text ...

Edge tab
  Line                         [+]   + : Width, Color, Pattern, Band
  Shaders                      [+]
    = [pic] Comets     [Along the line v]    [settings] [-]
```

- **One section and one + per tab.** The Effects section, the Rendering section with its Material
  row, Shape > Shader and the separate Group outline section are all removed. A group outline is a
  shader at the place "Around the group", so it has no section of its own. That is the owner's
  third point taken as written: no sections, galleries or kinds per target.
- **Outline, Glow, Halo, Band and Wireframe are ordinary style options** in their section's +
  menu. They are released channels, not shaders, and they never appear in the shader gallery.
- **The row** shows a drag handle, the picture, the name, a **Place** dropdown, a settings button
  and a minus.
    - The Place dropdown lists only the places that shader allows, each option with a small diagram
      of where it draws, so a wrong choice is impossible and the diagram explains the words.
    - Rows reorder by drag, and by Alt+Up / Alt+Down from the keyboard. The order is the draw order
      inside one place (section 1).
- **The settings popover** holds:
    - the shader's parameters, made from its descriptor, each with the same "calculated" toggle as
      every other style row;
    - its clock parameters, if any (section 4.3), as ordinary rows;
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
  as what the user wants: Node tab **All | On the node | Instead of | On top | Around | Behind |
  Around the group**; Edge tab **All | On the line | Along the line**. Under that, the origin filter
  **All | Built in | This project**.
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
- **"New shader..."** is the last tile. It opens the code dialog with a working template for the
  place selected in the filter (or the tab's first place under All). No Look/Effect question, no
  Kind select: the template's header already says its place, and pasting replaces the template.
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
   on top, around, behind, around the group, along the line) as an option on the row, not a kind of
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

**A layer may keep applying for a short time after its condition stops matching**, so an exit
animation can play: the layer's optional `keep` (seconds, default 0). This is part of the
condition (in the app, "Keep for [0.3] s after" in the condition picker), not a property of any
shader, and it works for every condition, including ones like `score > 5`. The judges' alternative,
writing `hovered || since.unhovered < 0.3` into the condition, only works for the three view
states; `keep` is the general form, and the expression form still works for anyone who writes it.

### 4.2 The clocks the element provides

All are seconds, as neutral numbers. A moment that never happened reads as -1.

| Value                                   | Meaning                                                                                             | In conditions and calculated values | In the shader input                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------- |
| `state.selected`, `.hovered`, `.pinned` | the state now, 0 or 1                                                                               | new path                            | `selected`, `hovered`, `pinned` (exist)               |
| `since.selected`, `since.deselected`    | since selection began / ended                                                                       | new path                            | `sinceSelected` (exists), `sinceDeselected` (new)     |
| `since.hovered`, `since.unhovered`      | the same for hover                                                                                  | new path                            | `sinceHovered` (exists), `sinceUnhovered` (new)       |
| `since.pinned`, `since.unpinned`        | the same for pinning                                                                                | new path                            | `sincePinned` (exists), `sinceUnpinned` (new)         |
| `since.added`                           | since the element entered the graph                                                                 | new path                            | `sinceAdded` (new)                                    |
| `since.changed`                         | since this element's data last changed                                                              | new path                            | `sinceChanged` (exists; now fed on every data change) |
| `changedFields`                         | the data paths that changed in that update                                                          | new path                            | --                                                    |
| `since.matched`                         | since this layer began to apply to this element                                                     | clock parameters only               | `sinceMatched` (renames `sinceEntered`)               |
| `since.unmatched`                       | since this layer's condition stopped matching (-1 while it matches); only nonnegative during `keep` | clock parameters only               | `sinceUnmatched` (renames `sinceExited`)              |

- **Adding or editing a layer is not a moment.** The elements a new or edited layer matches at that
  instant read `since.matched` as 1e6 ("long ago"), so they show the end state instead of all
  playing an entrance. This keeps the existing entrance rules (no restart within its own length, a
  cap on how many elements play at once), now keyed on clock parameters.
- **Time conditions are the element's job.** A condition that compares a clock with a constant
  (`since.changed < 1.5`) is re-evaluated by the element exactly at the moment it flips, so a
  "changed recently" layer ends on its own, with no polling by the consumer.
- **Clocks the element cannot schedule are refused, not polled.** A clock compared with anything
  other than a constant, or a clock in a calculated value of a channel the CPU paints (such as
  `node.size`), returns the problem `{ code: "style.clock-unsupported", params: { layer, path,
where } }`, where `where` is `"condition"` or `"value"`. It is never quietly checked every frame.
- **"Score changed"** is a condition: `since.changed < 0.6` and `changedFields` contains
  `data.score`. If the rule language cannot test a list today, the element adds that test (additive).

### 4.3 How a shader animates

- **Simple path:** the body reads the input struct's clocks directly, for example
  `n.sinceMatched` for an entrance and `n.sinceUnmatched` for an exit. Nothing to declare.
- **Advanced path: a `clock` parameter.** `start: { type: "clock", default: "since.matched", max:
0.55 }`.
    - The user can rebind it in the settings popover, through the same value picker as any
      calculated value. The app writes the words, for example "Starts: When this layer starts
      applying"; the element returns only the bound path.
    - `max` is the clock's range, like a number parameter's max: the element clamps the clock to
      it and stops drawing new frames for that element once every clock has passed its max. A
      shader that reads clocks without declaring a max is treated as animating while it draws.
- **Any number or color parameter can be bound to a clock** with a linear, pow or bins scale, for
  example a Hovered layer's Glow with `strength: { by: "since.hovered", domain: [0, 0.25], range:
[0, 1], clamp: true }`. This is how a shader that knows nothing about time still eases in.
    - The scale is evaluated on the GPU from timestamps the element already keeps, so it costs no
      CPU work per frame and no frames once the clock leaves the domain.
    - It counts against the existing limit of four bound parameters per shader.
- **Looping** is inferred from the body (it reads the input's `time` field); `motion` keeps only
  `"still" | "loop"` (and `loop.speedParam`), as a declared override. It is a fact the element uses
  for the reduced-motion and quality settings, and it is never shown as a trigger.

### 4.4 What the app does with it

- The condition picker gains "Changed recently" beside Hovered and Selected. It writes
  `since.changed < 1.5`, so a change flash is "pick that condition, then add Change flash", with
  nothing typed. No new starting layer is added, because starting rows are released element
  behavior.
- The condition picker gains "Keep for [ ] s after", writing the layer's `keep`.
- The app sets `keep: 0.3` on its own Hovered and Selected starting layers after the element
  creates them. This is the app's choice through an element option; the element's default stays 0.
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
- Every square-drawn shader still skips a node smaller than 3 px on screen, whatever its minimum
  size, so an overview of a large graph is never covered in squares.

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

- **The target** (node, edge, group, background) is still read from the entry function's input,
  `shade(NodeInput n)` and so on, so the code cannot disagree with a header.
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

They replace `node.shader`, `node.shaderParams`, `node.effects`, `edge.shader`,
`edge.shaderParams`, `edge.effects` and the layer's `boundary` (`LayerBoundary`), all unreleased.
A list rather than a record keyed by id, so the same shader can be used twice with different
settings (two rings) and the order is explicit.

### 6.3 The canonical example (15 lines)

```ts
import { defineShader } from "@graphty/graphty-element/extend";

defineShader({
    id: "acme/ring",
    place: "around",
    params: { color: "#ffcc00", width: { default: 2, min: 0.5, max: 8 } },
    glsl: `vec4 shade(NodeInput n) {
        float d = abs(length(n.uv) - 1.2);
        float ring = 1.0 - smoothstep(0.0, width / n.pixelSize, d);
        return vec4(color, ring * clamp(n.sinceMatched / 0.3, 0.0, 1.0));
    }`,
});

await element.session.styles.add({
    target: "node",
    selector: { match: "state", state: "selected" },
    set: { "node.shaders": [{ shader: "acme/ring", params: { color: "#00ff88" } }] },
});
```

It names no kind, role, card or trigger. The ring fades in over 0.3 s whenever a node becomes
selected, because the layer's condition is "selected" and the body reads `sinceMatched`. The one
spelling for adding a layer everywhere in docs and examples is `element.session.styles.add`, and
`defineShader` is always imported from `/extend`, never the root entry (which pulls in Babylon.js).

**The advanced path** adds one line each: `minSize: 40`; `places: [...]`; `reach: 2`; a `clock`
parameter with `max`; `lowDetail`; `registerShader` with `wgsl`.

**The published shader page** must state, checked against the code: the parameter short and long
forms and their GLSL types; every field of the four input structs, including the clocks and their
-1 and 1e6 readings; the GLSL prelude a body may call (`lightDir`, `palette()`, the hash helpers,
the anti-aliasing helpers) with signatures; straight or premultiplied alpha; the place table of
section 1 with a picture of each place; ids, failure and the entry point.

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
- **Babylon's edges rendering was considered and not used:** a smooth sphere has no hard edges, so
  it draws either almost nothing or every triangle. It can become an option if someone asks for
  "edges only" on faceted shapes.
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
| `ShaderPlace`, `place`, `places`, `minSize`, the `clock` parameter type, `reads: "light"` added                                                                   | Unreleased: free    |
| `node.shaders`, `edge.shaders` (`ShaderUse`) replace the six single shader channels and `LayerBoundary`                                                           | Unreleased: free    |
| `sinceEntered` / `sinceExited` renamed `sinceMatched` / `sinceUnmatched`; `sinceAdded`, `sinceDeselected`, `sinceUnhovered`, `sinceUnpinned` added to the structs | Unreleased: free    |
| `shaderTemplate({ target, place })`; problem codes `shader.place-unsupported`, `shader.min-size-place`                                                            | Unreleased: free    |
| `node.meshDetail` channel                                                                                                                                         | Additive            |
| Readable paths `state.*`, `since.*`, `changedFields` in conditions and calculated values; problem code `style.clock-unsupported`                                  | Additive            |
| The layer's optional `keep` (seconds)                                                                                                                             | Additive            |
| `node.wireframe`, Outline, Glow, Halo, Band, the starting rows                                                                                                    | Released: unchanged |

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
  The exit window is the layer's `keep` (a condition), and the end of an animation is a clock
  parameter's `max` (a range on an input).
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

## 13. Watch at the owner's next review

- Asked to "outline each group", does a newcomer find "Around the group" in the Shaders gallery,
  with no section named for it?
- Do the place diagrams make "On the node", "On top", "Around" and "Behind" clear without reading?
- Does "Hidden: Sticker draws instead of the node" answer "where did my node go?"
- Does a Hovered layer with Reticle play in and out with nothing set by the user?
- Does a wireframed sphere at `meshDetail: "low"` read as a clean globe?
