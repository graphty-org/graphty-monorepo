# Shader styles: the working prototype

Shaders are graphty-element style values. A style layer lists the shaders it uses, and each use
says where the shader draws: on the node, instead of it, around it, behind it, around a group, or
along a line. The graphty app has one Shaders section on the Node tab and one on the Edge tab, and
one gallery for picking a shader. This page is what to look at, what changed for each point of
your two reviews, how to add your own shader, what you still need to decide, and what is not done.

The binding design is `design/rendering/shader-studio/decisions-v2.md` (after your second
review), which replaces `decisions.md` (after your first) where they differ. The author's guide
is `graphty-element/docs/guide/shaders.md`.

## Where to look

The app, built from branch `feat/shader-studio`, is served in two places on this machine:

- https://dev.ato.ms:9187 -- a production build (this is the one to use on the iPad).
- https://dev.ato.ms:9587 -- the Vite dev server for the same branch (the old link from the first
  prototype; it now serves this branch, not `feat/shader-styles`).

The Storybook at http://dev.ato.ms:9253 still shows the first prototype's branch.

## What to try first

1. Open the Zachary's karate club sample and select the Everything layer. On the Node tab, press
   the Shaders section's **+**. The gallery opens with focus in its search field. Pick Pearl: a
   row appears, and the nodes keep their fill color under the pearl finish.
2. Type "glow" in the gallery's search. The hit is the Shape option Glow, not a shader; picking
   it adds a Glow row to the Shape section.
3. On the Selected layer, add Reticle. Its row has a Place dropdown (Around, Behind, On the node,
   Instead of the node), each with a small diagram. Click a node; zoom far out and the reticle
   stays at least 40 pixels across.
4. Add Sticker on Everything. It draws instead of the node, and the Shape row says "Hidden:
   Sticker draws instead of the node". Move Sticker to another place and the shape comes back.
5. Run Analyze, Louvain; then on a layer add Soap bubble or Hull (filter: Around the group) and
   set Group by to the Louvain community. Each community gets one outline around all its members.
6. Shape **+**, Wireframe: the nodes draw as a light wireframe (a low-detail mesh), not the dense
   triangle mesh.
7. Graph settings, Style, Background **+**: Color, Image and Shader stack bottom to top; Shader
   opens the same gallery, showing background shaders (Nebula).
8. Gallery, last tile **New shader...**: choose a place, edit or replace the template, and Add.
   Break it and the dialog names the line and keeps Add off.
9. Main menu, Save local copy, then open the file again: every shader comes back. A project from
   someone else holds its pasted shaders until you choose to run them.

## Your second review, point by point

1. **"Why is wireframe a shader? It's already built in to Babylon.js."** It is not a shader any
   more. Wireframe is the existing wireframe option (Babylon.js's own wireframe mode), offered in
   the Shape section's **+** as an on/off row. It looked dense because the sphere mesh is finely
   tessellated, so graphty-element gains a mesh detail option, and the app's Wireframe row turns
   on wireframe and low mesh detail together. Babylon.js's edges renderer was drawn and compared
   too: on the low-detail mesh it draws the same 30 lines, only thicker, so it was not added. The
   low-detail sphere reads as a twenty-sided die; if you want a rounder globe, "low" can use 80
   faces instead of 20 with no new option.
2. **"Should minimum size be a configuration option? Would you want it on Freeze?"** No, it is not
   universal. A shader's author opts in by declaring a minimum size, and only then does the
   shader's settings show a Minimum size field, which you can change or set to 0. Reticle declares
   40 pixels; Frost, Glass, Pearl and the other surface finishes do not, so they show no such field
   and scale with the node.
3. **"Imagine an 'Add shader' button with features like 'replace node'."** That is the model now:
   one Shaders section with one **+** per tab, one gallery, and the place as a setting on each row.
   The Effects section, the Rendering section's Material row, Shape > Shader and the Group outline
   section are gone; a group outline is a shader at the place "Around the group". The gallery
   filters by place, phrased as what you want ("Instead of the node", "Around"), and each tile
   shows its picture, its place and whether it animates, how costly it is, and whether it reacts
   to the light.
4. **"Can 'on enter' and 'on change' be replaced with calculated values?"** Yes, and the On enter
   and On change chips are gone. When a shader draws is the layer's condition (Hovered, Selected,
   a data rule). How it animates is a parameter bound to a clock, the seconds since a moment such
   as "this layer started applying", which the shader's author sets as the parameter's default.
   So Reticle on the Hovered layer plays in and out with nothing set by you, and the built-in
   shaders that animate on a moment (Reticle, Shockwave, Frost, Hologram, Change flash, Edge
   change) all do it this way. The rest of this point is not built yet: see "Not done".

Also from the second redesign: presets named after style options were renamed (Edge glow is now
Neon line, Lantern glow is Lantern, Toon outline is Cel shade); shader rows reorder by drag, by
Alt+Up and Alt+Down, and by Move up and Move down in their right-click or long-press menu; adding a
shader with several layers selected adds it to each in one undo step; and the gallery and rows
work with a keyboard and a screen reader.

## Your first review, point by point

1. **"Select layers" under +.** Removed. Ctrl/Cmd-click and Shift-click select several layers;
   on touch, Select more in a layer's menu.
2. **Holographic dots.** Sticker's holographic finish now comes from the scene's light, with no
   animation and no sparkles.
3. **The shape list ran off the iPad screen.** Every dropdown and gallery is capped to the
   screen's height (in compact-mantine, so every list gets it).
4. **The shape still showed above a shader.** A shader placed "Instead of the node" hides the
   shape; the Shape row stays, captioned as hidden, so nothing is deleted.
5. **Under Shape?** Superseded by your second review: shaders have their own section.
6. **A generic way to handle shaders.** One extension point. Built-in, registered and pasted
   shaders all go through the same definition (see "Custom shaders are first class" below).
7. **The app started over on the iPad.** A discarded tab reopens its own autosave.
8. **"On enter" on Hovered.** Removed (see second review, point 4).
9. **A tiny reticle.** Reticle keeps a 40-pixel minimum, and as it shrinks it drops detail in
   order (scan, inner circle and pips, ticked ring), keeping the four brackets.
10. **Icons for added shaders.** A shader with no picture gets one drawn from its own code.
11. **Clear glass vs dew drop.** Clear glass is removed; Dew drop is now Glass; Frosted glass is
    translucent.
12. **Dense wireframe.** See second review, point 1.
13. **The hull missed members.** Group outlines now enclose every member of the group.
14. **Groups under one layer?** One outline per group value, set by Group by on the row.
15. **Paste, targets, inputs, surface vs effect.** The shader's code says what it draws on (node,
    edge, group or background); the place says where; the template shows how to add parameters.
16. **Background +.** Color, Image and Shader as stacked rows.

## How to add your own shader

### In the app

In the Node or Edge tab's Shaders section, press **+**, then the last tile, **New shader...**. Pick
the place first; the code box fills with a working template for that place. Edit it, or paste
shader text over it, and press Add. A place written in the pasted text's header wins over the
field. The shader is saved with the project, appears in the gallery under "This project", and its
tile menu offers Edit code, Duplicate, Copy text and Delete.

Shader text is a header comment followed by GLSL:

```glsl
/* graphty-shader 1
{ "id": "acme/ring", "place": "around", "params": [{ "name": "color", "type": "color", "default": "#ffcc00" }] }
*/
vec4 shade(NodeInput n) {
    float ring = 1.0 - smoothstep(0.0, 2.0 / n.pixelSize, abs(length(n.uv) - 1.2));
    return vec4(color, ring);
}
```

### With graphty-element

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

The ring fades in over 0.3 seconds whenever a node is hovered, and the element stops drawing
frames for it once the fade is done. The advanced path adds one line each: `minSize: 40` for a
minimum on-screen size, `places: [...]` to narrow where it may be moved, `reach` for how far past
the node it draws, a low-detail body for far nodes, and `registerShader` with a WGSL body.
`session.shaders.add(text)` adds shader text to the open project, as the app's paste does.

### Custom shaders are first class

A registered or pasted shader appears in the same gallery as the built-in ones, with a picture
drawn from its own code when it supplies none; gets the same settings form, built from its
parameters; is checked by the same checker, given the same cost rating and frame guard, and
reports the same problem codes; and is saved and reopened the same way. The built-in shaders are
registered through the same public definition. Two differences remain on purpose: shader text that
arrives in someone else's project is held until the reader runs it, and WGSL bodies can only be
registered in code, not pasted.

## Decisions for you

These are one-way doors: each publishes a file format or a public type that cannot be reshaped
after release without a major version.

1. **The shader text format becomes a published format**: its header keys (`id`, `name`, `place`,
   `places`, `params`, `minSize`, `reach`, `categories`, `preview`, `motion`), the namespaced ids
   (bare ids are reserved for the element's own shaders), the four entry functions, the input
   fields and the helper functions. Pasted shaders are GLSL only. Recommended as written.
2. **Pasted shader text is saved in the project's style document**, beside palettes, and the saved
   background gains a shader member. Both change a published file format. Recommended.
3. **The places are a published list**: `paint`, `replace`, `over`, `around`, `behind`, `along`,
   `group`, marked as one that may grow. Recommended.
4. **A project from someone else holds its pasted shaders** until the reader runs them.
   Recommended.
5. **The whole shader API must land in one piece from this branch.** None of it is released yet,
   so it can still be reshaped freely; once any of it is, a reshape is a breaking major.

Nothing on this branch changes an API that is already released: the wireframe option, Outline,
Glow, Halo and the starting layers are unchanged, and mesh detail and the background shader are
additions.

## Not done

- **Clocks in conditions and calculated values (the rest of your fourth point).** The design adds
  the clocks (seconds since selected, hovered, pinned, added, changed, and their opposites) as
  values any condition or calculated value can read, a "Changed recently" condition in the
  condition picker, "Keep shaders for N seconds after" on a layer, rebinding a parameter to a
  clock from its settings, and refusing a clock the element cannot bound. None of it is built.
  Today a clock can only be a shader author's parameter default, which the settings show but do
  not let you change; a layer that rebinds a parameter to another clock is not drawn that way.
- **The clock fields keep their old names** inside shader code (`sinceEntered`, `sinceExited`),
  while parameter bindings use the new spellings (`since.matched`, `since.unmatched`). The rename
  and the new fields (`sinceAdded`, `sinceDeselected`, `sinceUnhovered`, `sinceUnpinned`) are
  still to do, and must happen before release (it is part of decision 1).
- **The review by an author who sees only the guide.** The guide's examples are compiled against
  the published types, and a test holds the page to them, but no author working from the page
  alone has yet written the ring example and an edge shader. The guide's opening example also
  imports `defineShader` from the root entry, which loads the renderer, where the design says
  `/extend`.
- **On a node that is not round**, "the node's outline" is its bounding circle.
- **Sticker's gallery picture** still shows the old look.
- **Pie and donut nodes and gradient edges** wait on the style-specimens work landing.
- **A pasted shader that fails to compile** also prints Babylon.js's own error lines in the
  browser console.
- **The Transition setting in the Layout popover** is a plain dropdown, not a property row.
