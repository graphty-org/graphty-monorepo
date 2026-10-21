# Shader styles: binding decisions after the owner's first review

These are the design studio's decisions on the owner's review of the shader prototype (branch
`feat/shader-styles`, head a30fa53333). They answer every item of that review and the owner's two
top concerns:

1. How does a user know which kind of shader to use?
2. Do user-added shaders have full parity with built-in ones?

The work is built on branch `feat/shader-studio`, which starts from `feat/shader-styles`.

**Why the kind model is settled now.** No part of the shader API has been released. graphty-element
3.30.0 is the newest release, and every shader type is marked `@since 3.36.0`.
`graphty-element/src/catalog/shaders.ts` is on neither origin/master nor origin/golden. So
`ShaderKind`, the shader text format, the descriptor and `LayerBoundary` can all be changed now for
the cost of an edit. The day this branch lands and a release train publishes it, every one of these
changes becomes a breaking major. That is why the reshaping happens in this branch, before it lands.

Full design: `design/rendering/shader-styles.md`. Where the two disagree, this file wins, and that
design is updated to match it.

---

## 1. The user's model: a place, then a look or an effect

**A user never chooses a "kind".** They start from the thing they want to change, and that place
answers the question for them. The same two words hold everywhere:

- **A look** replaces how the thing is painted. Each layer sets one look per node or edge. As with
  any style value, the topmost layer that sets one wins.
- **An effect** is drawn on or around the thing. Effects stack, so a layer can add as many as it
  likes.

This is Figma's split between Fill (one paint) and Effects (a list). The UI never shows the words
"kind", "surface", "sprite", "material", "boundary" or "shader kind".

| What the user wants to change       | Where they go                               | What the gallery offers                                                                                |
| ----------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| How a node is painted               | Node tab, **Shape** section, **+ > Shader** | Every node look in one grid: Pearl, Glass, Glass marble, Wireframe, Sticker, Mandala...                |
| Something drawn on or around a node | Node tab, **Effects +**                     | One grid: Outline, Glow and Halo as tiles beside Aura, Reticle, Satellites, Shockwave, Change flash... |
| How an edge's line is painted       | Edge tab, **Line** section, **+ > Shader**  | Edge looks: Fiber...                                                                                   |
| Something drawn along an edge       | Edge tab, **Effects +**                     | One grid: Band beside Comets, Edge glow, Light packets, Edge change...                                 |
| An outline around a group           | Node tab, **Group outline +**               | Group looks: Soap bubble, Hull...                                                                      |
| The canvas                          | Graph > Style > **Background +** > Shader   | Background looks: Nebula...                                                                            |

How the user knows which to use:

- Each gallery holds only shaders that work in that place, so a wrong choice is impossible.
- Each tile shows a picture of the shader, rendered by the shader's own code (section 3).
- A tile's name says what it looks like, never how it is built.
- A node look that draws its own shape (Sticker, Mandala) has a second line on its tile, "Replaces
  shape". The app writes those words from the descriptor fact `geometry: "card"`.

### 1.1 Node tab

```
Shape                         [+]   + offers: Shape, Size, Fill, Shader
  Shape     [Icosphere v]           shapes only (51), no shaders
  Size      [5]
  Fill      [#4a90e2]               node.color
  Shader    [tile] Pearl   [-]      node.shader; its settings open from the row
Visibility ...
Text ...
Effects                       [+]   one gallery
Group outline                 [+]   one gallery
```

- **The owner's proposal is taken as written.** The Shape section's + offers Shape, Size, Fill and
  Shader. Fill is the `node.color` row. The separate "Fill" section is gone, folded into Shape.
- **The Rendering section is deleted.** The app no longer shows the Material picker or the
  Solid/Wireframe select.
    - "Plain" means the layer has no Shader row.
    - Wireframe is a real built-in shader, a tile in the node look gallery (section 5.3).
    - The element's `node.wireframe` channel is released, so it stays, unchanged. The app just stops
      writing it.
- **One row for one decision (owner item 4).** Choosing a shader whose descriptor says
  `geometry: "card"` does two things in one undo step: it writes `node.shader`, and it removes this
  layer's own Shape entry, if it has one. While the card is set, the + menu's Shape item is
  disabled, and its reason reads "Sticker draws its own shape". The Shader row's minus is named
  "Remove Sticker". Undo brings the Shape entry back.
    - A layer lists only its own entries (a decided rule), so a card set on a lower layer shows no
      Shape row here at all. The "Covered by ..." caption is deleted for this case.
- **A look that paints the shape** (`geometry: "shape"`, such as Pearl or Glass) keeps the Shape
  and Fill rows. When the shader reads the color, the Fill row is its tint. When it does not read
  the color, the Fill row carries the existing covered caption.
- **Effects + is one gallery.** Outline, Glow and Halo appear as tiles beside the shader effects.
  The "Effect..." second level is deleted.
    - Glow strength, Halo size and Halo opacity stop being menu items. They become fields in the
      Glow or Halo row's settings popover.
    - The app builds this grid from two element catalogs: its channel catalog and its shader catalog.
      Arranging both into one grid is presentation, so it is the app's job, and it is not a
      workaround.

### 1.2 Edge tab

- **Line section.** + adds Shader alongside the existing rows. The Pattern row lists patterns only;
  Fiber leaves the tail of that list.
- **Effects +** is one gallery: Band beside the edge shader effects.

### 1.3 Galleries (one component everywhere)

- **Layout.**
    - A search field is pinned at the top and has focus when the gallery opens.
    - Below it, one grid of tiles. Headings come from each shader's `categories`, and the app
      orders them.
    - "New shader..." is the last tile (section 4).
    - A filter row reads **All | Built in | This project**. It replaces the separate "In this
      project" section, which is deleted.
- **Tiles.**
    - Each tile is 64 px, with the picture and the name.
    - A shader that is not built in carries a small origin line: "This project", or the registrant's
      namespace.
    - Edit code, Duplicate, Copy text and Delete from project are in the tile's own menu, on the
      shaders that allow them.
- **Accessibility.**
    - The tiles form a `role="radiogroup"`. Each tile is a `role="radio"` with `aria-checked`, so a
      screen reader says "Glass, radio button, checked, 3 of 18".
    - Arrow keys move between tiles, and type-ahead jumps to a tile by name.
    - "New shader..." is an ordinary button outside the radiogroup.
- **The "Heavy" tag is removed from tiles.** The settings popover keeps it as a fact worded "Slower
  on large graphs".
- **Size limit.** Every gallery and picker popover is capped at the visual viewport's height minus
  16 px, with its contents scrolling inside (section 6.2).

---

## 2. The element's shader model: four targets and one role

**The seven kinds collapse.** The code shows only two real differences between them:

- **The input struct**, which says what the shader draws on: a node, an edge, a group or the
  background.
- **Replace or stack**, which decides the blend and what the shader covers.

Edge surface and edge effect already share the body, the struct, the program builder and the mesh.
Node surface and node sprite share `NodeInput` and the `node.shader` channel; they differ only in
geometry.

```ts
/** What a shader draws on. OPEN UNION. */
type ShaderTarget = "node" | "edge" | "group" | "background";
/** Whether it replaces how its target is painted ("look") or is drawn on or around it ("effect"). OPEN UNION. */
type ShaderRole = "look" | "effect";

interface ShaderDescriptor {
    id: string;
    plainName: string;
    target: ShaderTarget; // replaces `kind`
    role: ShaderRole; // node and edge only; group and background are always "look"
    geometry?: "shape" | "card"; // node looks: paint the node's shape (default), or a card in its place
    minPixels?: number; // effects: the smallest on-screen radius they are drawn at (section 5.4)
    categories?: readonly string[]; // catalog data: where a gallery may file it
    preview?: { params?: ShaderParams; time?: number }; // the frame its thumbnail is drawn from
    // unchanged: params, reads, motion, cost, origin, webgpu, thumbnail?, requires?, bloom?,
    // reach?, blend?, form?, reachParam?, hash?
}
```

**What is deleted** (unreleased, so the deletion is not breaking): `ShaderKind`, `SHADER_KINDS`,
`SHADER_KIND_COVERS`, the `shader.kind-unknown` and `shader.kind-mismatch` problem codes, and the
`kind` option of `parseShaderText`.

**What replaces them:**

- `shaderCovers(descriptor)` works from `target`, `role` and `geometry`:
    - A card covers every shape channel.
    - A node look covers flat, unlit and wireframe.
    - An edge look covers `edge.style` and `edge.patternCount`.
    - A look that does not read color or opacity also covers those.
    - Effects cover nothing.
- A new problem code, `shader.target-mismatch` with params `{ expected, found }`, is returned when
  text is added to a place for a different target or role.

**How the target is decided.** It is inferred from the entry signature:

- `shade(NodeInput n)` targets nodes.
- `shade(EdgeInput e)` targets edges.
- `shade(GroupInput g)` targets groups. `BoundaryInput` is renamed `GroupInput`, which is free
  because it is unreleased.
- `shade(BackgroundInput b)` targets the background.

No header key names the target, so the code cannot disagree with itself.

**How the role is decided.** It defaults to `"look"`. An effect says `role: "effect"`; the starter
template for an Effects gallery already says so (section 4).

**Channels are unchanged:**

- `node.shader` / `node.shaderParams` hold the node look.
- `node.effects` holds node effects.
- `edge.shader` / `edge.shaderParams` hold the edge look.
- `edge.effects` holds edge effects.
- The layer's `boundary` holds the group look.
- `background.shader` holds the background look (section 5.7).

**Placement facts that are internal.** The sprite's camera-facing card and the effect pass's
`discard` inside the node's own disc are internal to `geometry` and `role`. Nothing in the public
API names them.

**Rejected: a card shader as a value of `node.shape`.** The owner asked for shaders to leave the
shape list, and two channels for one look is what made "Covered by Sticker" necessary. One Shader
row holds every node look.

---

## 3. One extension point, with full parity

**There is one definition of a shader, written in three ways, and all three are lossless round
trips of the same object:**

1. `defineShader({...})`, the simple path, with short-form parameters.
2. `registerShader({ descriptor, glsl })`, the advanced path.
3. Shader text: `/* graphty-shader 1 {header} */` followed by GLSL. This is the form a shader is
   pasted, copied and saved in. Its header holds exactly `defineShader`'s keys, minus `glsl`.

### 3.1 Built-ins use the public path

- **Registration.** Every preset is registered at catalog load through the same `registerShader`
  call a third party uses.
- **Lazy bodies, open to everyone.** To keep bodies lazy, `registerShader`, `defineShader` and the
  `lowDetail` member each accept either a string or a loader: `glsl: string | (() => Promise<string>)`.
  This is additive, and a third party with a large body can use it too.
- **What still differs for presets.** Only two facts:
    - their `origin` is `"element"`;
    - their ids are bare (`"pearl"`). Every other id stays `"<namespace>/<name>"`, so a future preset
      can never collide with a user's shader.
- **The ids the element ships cannot be replaced.** That protects saved projects; it is not a
  privilege in drawing.
- **A test keeps the text format complete.** It round-trips every preset through `formatShaderText`
  and back through `parseShaderText` and asserts an equal descriptor. Any field a preset needs that
  text cannot carry then fails the build.
- **No preset uses `wgsl` today.** WGSL stays registration-only, because pasted text must go through
  the GLSL safety checker. This is the one documented exception.

### 3.2 Parity table after this work

|                                                            | Built in                        | Registered             | Pasted                           |
| ---------------------------------------------------------- | ------------------------------- | ---------------------- | -------------------------------- |
| Registry and catalog listing                               | same                            | same                   | same (the project's)             |
| Where it shows in the panel                                | by target and role              | by target and role     | by target and role               |
| Gallery                                                    | one grid                        | one grid               | one grid, plus the filter        |
| Parameters and their form                                  | same                            | same                   | same                             |
| Thumbnail                                                  | generated (stored pre-rendered) | generated, or supplied | generated                        |
| Low-detail body, motion, minimum size, categories, preview | yes                             | yes                    | yes                              |
| Saved in the project                                       | n/a                             | its text is embedded   | its text is embedded             |
| Frame guard, flashing check, GPU-loss quarantine           | yes                             | yes                    | yes                              |
| Held until approved when it arrives as content             | no                              | no                     | yes: the one intended difference |
| WGSL                                                       | allowed                         | allowed                | no: the one documented exception |

The work behind each row of that table:

- **Thumbnails.**
    - The element renders a thumbnail for any shader that does not supply one:
      `session.shaders.thumbnail(id, params)`. The element caches it, by text hash plus parameters,
      size and theme. That caching is the element's job, so the app does not keep a cache of its own.
    - The element frames each thumbnail by target:
        - a node look: one node filling 80% of the tile;
        - a card: the card;
        - an effect: a small gray node, with the frame set to the effect's reach;
        - an edge: one curved edge between two dots;
        - a group: five dots inside the outline;
        - a background: the full tile.
    - `preview` chooses the parameters and the time of the frame.
    - The app shows the generated thumbnail wherever `descriptor.thumbnail` is absent: gallery tiles,
      Shader rows, effect rows and group outline rows.
    - A build script redraws every preset's `thumb.webp` with the same call, so built-in and user
      pictures are made the same way and nobody draws icons by hand.
    - A held shader shows a neutral "not run yet" tile, because drawing it would run its code. With
      no canvas available, a tile shows its target's glyph.
- **Low detail in text.** Shader text carries the low-detail body as an optional second entry,
  `vec4 shadeFar(<Input>)`. Copy and "Duplicate and edit" of Glass marble therefore keep its
  far-away body.
- **Motion is inferred.** When `motion` is left out, a body that reads `time` is reported as
  `"loop"`. A declared value always wins. A pasted shader that animates can no longer show "Motion:
  Still".
- **Saving.** A project that uses a registered shader embeds the shader's text in
  `StyleDocument.shaders`, as it already does for a pasted one.
    - On open, if the page has registered the same id, the page's version is used.
    - Otherwise the embedded text arrives as content and is held under the same trust rule as any
      other arriving text.
- **Safety.** The frame guard's lowest step, the flashing check and GPU-loss quarantine now apply to
  every shader, decided by its cost and its motion, not by where it came from. Approval (hold and
  run, trusted hashes) stays specific to arriving text.

### 3.3 The canonical example (simple path, 15 lines)

It names no kind, no target, no struct beyond its own signature, and no internal concept. The same
body pastes into the app's "New shader...".

```ts
import { defineShader } from "@graphty/graphty-element";

defineShader({
    id: "acme/heat",
    params: { hot: "#ff5500", cold: "#2255ff" },
    glsl: `vec4 shade(NodeInput n) {
        float lit = 0.4 + 0.6 * max(dot(n.normal, lightDir), 0.0);
        return vec4(mix(cold, hot, n.uv.y * 0.5 + 0.5) * lit, 1.0);
    }`,
});

await element.session.styles.add({
    target: "node",
    selector: { match: "everything" },
    set: { "node.shader": "acme/heat" },
});
```

**The advanced path** adds one line for each of these:

- `role: "effect"` with `reach: 2`, for a halo;
- `motion: { enter: 0.4 }`, for an entrance;
- `minPixels: 24`, to keep detail at a distance;
- `lowDetail` (or `shadeFar` in text), for a cheaper far-away body;
- `geometry: "card"`, to draw in place of the shape;
- `registerShader` with `wgsl`, for native WebGPU.

**Before this ships,** an author who sees only the published docs page must write this example and
compile it against the published types. That is the blind-author check in the project's
principles.

---

## 4. Creating and pasting a shader

**Where.** "New shader..." is the last tile of every gallery: node look, node effects, edge look,
edge effects, group outline and background. It is also the + of the project's Shaders list (below).
"Paste shader..." stops being a separate command: a user who has text selects all and pastes over
the template.

**The dialog, opened from a gallery:**

- **No Kind select.** A read-only line says where the shader goes, for example "Adds a node effect".
  The app writes those words from `{ target, role }`.
- **The code box starts with a working template** for exactly that place: about 15 lines, a header
  with `id`, `name` and one color parameter, and a `shade()` that already draws something visible.
    - The element provides the code: `shaderTemplate({ target, role, geometry? })` returns shader
      text, which is neutral code, not words. This is additive.
    - A test runs every template through `parseShaderText` and the checker.
    - The template answers "how do I add inputs?" by showing one.
- **Live feedback** while the checks pass:
    - a preview tile, drawn with the same thumbnail call;
    - the parameters form, generated from the header as the user types, so declaring an input
      visibly makes a field appear.
- **The problems list** stays tied to the box. Each problem is a button that moves the caret to its
  line. The count is announced politely when typing pauses.
- **Text written for another place** gets the `shader.target-mismatch` problem. The app words it
  ("Written for edges") and offers a button, "Add to edges instead", that retargets the dialog.
- **One link,** "How to write a shader", opens the published shader authoring page: the input
  structs, the helpers, and one short example per target.
- **The code box stays a native textarea,** so Tab leaves it.
- **Closing.**
    - Add moves focus to the new row, and the status region says "Pulse ring added to Hovered".
    - Escape returns focus to the opener, and the status region says "Nothing added".

**Opened from the Shaders list,** the dialog reads the target from the signature. If the role is
missing it asks one question, Look or Effect, as a 2-option radio group.

**The project's Shaders list.** Graph > Style > Shaders keeps Quality and Motion. Under them is a
list of every shader in the project that is not built in: thumbnail, name, place and "used by N",
with Edit code, Duplicate, Copy text and Delete. Its + is "New shader...". This one place answers
"where is my shader?". The galleries are doors to it, not second homes.

---

## 5. Decisions on each look

### 5.1 Holographic sticker: driven by the light, with no time and no sparkles (owner decision)

- **The element gives every card a tilted normal.** `n.normal` on a `geometry: "card"` shader is
  the card's facing tilted by two things:
    - the node's offset from the view center;
    - a small per-card tilt from `n.seed`;

    plus a slight dome across `n.uv`. Today the normal is fixed at `(0,0,-1)`. With the change,
    `dot(n.normal, lightDir)` works on every card shader, built in or not.

- **The Sticker's holographic finish:**
    - Its hue comes from a diffraction grating: the reflected view direction against `lightDir`,
      along a grating direction set by the seed, passed through `palette()`.
    - It has a broad specular sheen where the reflection meets the light.
- **Removed:** the `n.time` phase, the `hash12` sparkle cells and the `finishSpeed` parameter. The
  sticker's motion becomes still. It changes only when the camera or the layout moves.
- **Icon grid.** The Sticker's 12-icon grid (6 icons, each filled or outlined) becomes an `icon`
  choice of 6 plus an `outline` switch.

### 5.2 Glass

- **Clear glass is removed.** It was opaque (alpha 1.0), so it read as a solid ball. Its rim
  reflection and sharp highlight are folded into Dew drop's rim term.
- **Dew drop is renamed Glass,** id `glass`. It is the one that really shows the canvas through it.
- **Frosted glass becomes translucent:** alpha about 0.55 + 0.35 x frost + rim.
- **Glass marble stays opaque.** A marble is a different object.

The result is three tiles that look different at 64 px: Glass, Frosted glass and Glass marble.
There are no aliases, because the old ids were never released.

**Not now:** true refraction of what is behind a node. That needs a scene copy each frame, so it is
recorded as the known ceiling.

### 5.3 Wireframe

- **Wireframe becomes a built-in node look shader,** registered like every other preset. On a
  sphere it is a latitude and longitude grid.
- **Parameters:** Lines (default 8 meridians), Line width (default 1.25 px), Back lines (default
  opacity 0.25). The lines take the node's color.
- **Line width is constant in screen pixels,** from `n.pixelSize`.
- **Fewer lines at small sizes:**
    - below about 24 px, half the lines;
    - below about 10 px, only the outline circle.

    A small node therefore never fills in solid.

- **Back lines** are drawn at the same uv with z flipped, at the Back lines opacity.
- **On shapes that are not round,** it draws the grid in the shape's own uv space.

### 5.4 Reticle and every effect: a minimum size

- **New descriptor fact `minPixels`,** allowed in every spelling. The effect square is drawn at
  `max(reach x node radius in px, minPixels)`.
    - The node's own disc stays at r = 1.
    - An effect with `minPixels` is drawn even on a node under 3 px. One without keeps today's skip.
- **The Reticle declares `minPixels: 40`.**
- **Its detail fades in a new order:**
    1. the scan;
    2. the inner circle and the pips;
    3. the ticked ring, below about 32 px.

    The four L brackets fade last, so they are the last thing left. That keeps it a reticle rather
    than the "red circle" the owner saw.

### 5.5 Group outlines enclose the whole group

- **Each group becomes one connected shape that contains every member,** after the Bubble Sets
  method:
    - The default `threshold` drops from 1.0 to 0.5. At 1.0, a lone member reached the threshold
      only at its exact center, so it drew almost nothing.
    - Each frame, on the CPU, the element builds a minimum spanning tree over the group's members'
      screen positions and splats a capsule kernel along every tree edge, with the same falloff and
      a peak of 1.
- **No silent drops.** The group cap (32) and the field-target cap (8 targets x 4 groups) are
  reported with the existing `shader.boundary-cap` problem, never dropped silently.
- **Rejected: a convex hull as the default.** Communities in a force layout interleave, so convex
  hulls overlap.

### 5.6 Groups: one group per layer

- **In the app, a group outline belongs to a layer,** and Group outline + writes it at once.
    - The "Group by" second pick is removed, and with it the Escape that lost the row.
    - On one layer, the outline goes around that layer's nodes.
    - With a folder or several layers selected, the existing bulk path (`targetsOf()`) writes the
      outline to each layer in one undo step. Each layer then draws its own outline.
    - This is how the Louvain folder already colors its groups, so colors and outlines now follow
      one model.
- **The outline's color defaults to the layer's own fill.**
- **The element keeps `LayerBoundary.groupBy`** as the advanced path, for code that wants many
  outlines on one layer. The app does not expose it.

### 5.7 Background: + adds a color, a shader or an image (owner decision)

**Element.** `GraphBackground` is released as a strict union of `color` and `skybox`. These changes
are additive and add no union member:

- Both members gain an optional `shader?: { id: string; params?: ShaderParams }`, drawn on top.
- The `skybox` member gains an optional `color`, which shows while the image loads.
- The unreleased `backgroundType: "shader"` member is removed. This also withdraws its entry from
  the owner's widened-unions decision.
- A shader with alpha shows the color, or the image, beneath it.

**App.** The Canvas section's segmented control (Color | Image | Shader) is replaced by a Background
section:

- **Its + offers Color, Image and Shader,** at most one of each. A kind that is already present is
  shown disabled in the menu, with its reason.
- **Rows are drawn bottom to top** in the fixed order Color, Image, Shader. Each has a minus.
- **Removing the Color row** writes a transparent color, so the page behind the element shows, as
  Figma does when a frame's fill is removed. If the element cannot clear to transparent, it gains
  that support (additive).
- **With nothing set,** the section shows the color the element reports drawing. It never shows an
  empty section over a colored canvas.
- **An animated background** obeys the Motion setting.

### 5.8 Hover and "On enter" (owner decision: a calculated value)

- **Nothing in the element is specific to hover.** The Hovered starting layer is an ordinary layer
  whose condition is a state. That condition is the calculated value. The shader also receives
  `n.hovered` and `n.sinceHovered`.
- **The "On enter" / "On change" trigger chip is removed from shader rows.** It named the shader's
  own entrance animation, but it sat where a reader reads the layer's trigger.
- **The settings popover's Motion line describes the shader,** for example "Plays in 0.55 s, out
  0.3 s" or "Loops". It never uses trigger words.
- **Rejected:** a new `when:` member on effects, and a `state.*` encode source. Both would add a
  second mechanism for something layers already do.

---

## 6. The panel and the app around the shaders

### 6.1 Selecting several layers (owner decision)

- **"Select layers..." is removed from the Style tree's +,** which goes back to Layer, Folder,
  Analyze...
- **Pointer:** Ctrl/Cmd+click toggles a row and Shift+click selects a range. Both work today.
- **Keyboard:** Shift+Arrow selects a range and Ctrl/Cmd+Enter toggles a row. Both work today.
- **Touch, and a discoverable route for everyone:** the row menu gains **Select more** as its first
  item. The row menu opens on right-click, Shift+F10, the ContextMenu key or a half-second touch
  hold, all of which the Tree already supports.
    - Select more selects that row and turns on the Tree's existing checkbox mode, with the existing
      bar reading "N selected" and a Done button.
    - Done or Escape leaves the mode and keeps the selection.
    - The polite status region says "3 layers selected" once, after the selection settles.
- **Rejected: long-press to select.** A touch hold already opens the row menu.

### 6.2 Lists on an iPad

- **The Shape picker lists shapes only.** Shaders leave the list, which is the root cause of the
  overflow.
- **Every picker and gallery popover is capped** at the visual viewport's height minus 16 px.
    - Its contents scroll inside it, with search pinned at the top and "New shader..." at the foot.
    - The cap goes in the shared component, so every long list gets it.
    - It is a defect fix: no consumer can use a popover taller than the viewport.

### 6.3 Coming back to a discarded tab (owner item 7)

**The cause.** iPad Safari discards a background tab and reloads it when the user returns. The app
mounts the element only after a project is open and passes `restore: "manual"`, so nothing reopens
by itself, and the start screen appears.

**Element** (additive to the released autosave API):

- `AutosaveEntry.own?: boolean`, true for the entry this tab was writing. It is read from the
  session-storage item the element already keeps, and `listAutosaves` fills it in.

**App:**

- **On load,** an entry under `app.graphty.workspace` with `own === true` reopens straight into the
  workspace, with no banner and no start screen. It is a reload of this tab, not recovered work.
- **The app keeps the user's place** in sessionStorage under one app key: the page, the place, the
  inspector tab and the selected layer. These are presentation state, so they are the app's to
  keep. The place is restored after the reopen.
- **After reopening,** focus moves to the workspace's main heading, and the status region says
  "Reopened Les Miserables".
- **The start-screen banner stays** for work from other tabs that were closed.
- **The project name reaches the autosave entry,** through the session's project name. The banner
  and header then never read "An untitled project" or "Recovered work" for a named project. If the
  session offers no way to set the name, the element gains one (additive).
- **The "private window" notice** is checked in normal Chromium. If its detection is wrong, the
  detection is fixed where it lives.

---

## 7. Every owner item, answered

1. **"Select layers" under +.** Removed. Ctrl/Cmd+click and Shift+click select several layers, and
   touch uses Select more in the row menu (6.1).
2. **Holographic dots.** Light-driven grating and sheen on a tilted card normal, with no time and
   no sparkles (5.1).
3. **Shape list off the iPad screen.** Shapes only, and every popover is capped to the viewport
   (6.2).
4. **The shape still shows above a shader.** A card shader removes the layer's own Shape entry in
   the same step, so there is one row (1.1).
5. **Under Shape?** Yes. Shape + offers Shape, Size, Fill and Shader (1.1).
6. **A generic way to handle shaders.** One extension point in three spellings. Presets go through
   the public `registerShader`, and there is one gallery (3, 1.3).
7. **The app starts over on iPad.** This tab's own autosave entry reopens with its place (6.3).
8. **"On enter" on Hovered.** No hover code exists. The chip is removed, and Motion describes the
   shader (5.8).
9. **A tiny reticle.** `minPixels`, plus brackets as the last detail left (5.4).
10. **Icons for added shaders.** Generated by the element for every shader, and the presets'
    pictures are redrawn the same way (3.2).
11. **Clear glass vs dew drop.** Clear glass is removed, Dew drop becomes Glass, and Frosted glass
    becomes translucent (5.2).
12. **Dense wireframe.** A sparse globe grid shader with lines of constant width (5.3).
13. **The hull misses members.** A connected shape containing every member, plus reported caps
    (5.5).
14. **Groups under one layer?** One group per layer, through bulk edit (5.6).
15. **Paste, targets, inputs, surface vs effect.**
    - The place sets the target and the role.
    - The signature confirms the target.
    - The template shows how to add inputs.
    - Surface and effect are one target with two roles (2, 4).
16. **Background +.** Color, Image and Shader as stacked rows (5.7).

**Top concern 1** (which kind to use): the user picks a place and sees only what works there
(1, 2). **Top concern 2** (parity): see the table in 3.2. The differences that remain are approval
of arriving text, the `origin` label, bare preset ids, and WGSL only through registration.

---

## 8. Public API changes

| Change                                                                                                                                                 | Status                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| `ShaderKind`, `SHADER_KINDS`, `SHADER_KIND_COVERS` and the `kind` header key removed; `ShaderTarget`, `ShaderRole`, `target`, `role`, `geometry` added | Unreleased: free now                 |
| `BoundaryInput` renamed `GroupInput`                                                                                                                   | Unreleased: free now                 |
| `minPixels`, `categories` and `preview` on the descriptor and in the text header; `shadeFar` in text; motion inferred                                  | Unreleased: free now                 |
| `registerShader` / `defineShader` accept a loader for `glsl` and `lowDetail`                                                                           | Unreleased: free now                 |
| `shaderTemplate()`                                                                                                                                     | Unreleased: free now                 |
| `shader.target-mismatch` replaces `shader.kind-mismatch` and `shader.kind-unknown`                                                                     | Unreleased: free now                 |
| Clear glass removed; Dew drop renamed Glass; Wireframe preset added                                                                                    | Unreleased: free now                 |
| `backgroundType: "shader"` member removed                                                                                                              | Unreleased: free now                 |
| `GraphBackground` members gain optional `shader`; the skybox member gains optional `color`                                                             | Released: additive                   |
| `AutosaveEntry.own`                                                                                                                                    | Released: additive                   |
| compact-mantine popover height cap                                                                                                                     | Released: a defect fix, non-breaking |

**Nothing here breaks a released API, and nothing needs the owner.** The owner's earlier decision
3, on widening unions, shrinks: `GraphBackground` no longer widens.

**The one condition:** sections 2 and 3 must land together in this branch. If any of the shader API
ships before them, they become breaking.

---

## 9. Left out, with the reason

- **Treating keyboard focus as hovered** (a `focused` node state). Additive and worth doing, but
  separate from this owner review, so it goes to the backlog.
- **True glass refraction.** It needs a scene copy each frame (5.2).
- **A bottom sheet for popovers on touch.** The viewport cap fixes the reported failure.
- **The Shape picker as an icon grid** (decided in tier 3). It stays tier 3's own item; this work
  only takes the shaders out of the list.
- **Hover-animated gallery tiles.** Thumbnails are still frames (accessibility rule).

## 10. Watch at the owner's next review

- Asked to "make these nodes glass", does the user find Shape > + > Shader on the first try?
- Does "Replaces shape" on the Sticker tile, with the Shape row gone, read as expected?
- Does "New shader..." plus the template get to a working shader without opening the docs?
- On the iPad, is Select more in the row menu found without a hint?
