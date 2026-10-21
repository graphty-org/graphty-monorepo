# Shader styles: the working prototype

Shaders are now graphty-element style features: a style layer sets a node material, a node effect,
an edge surface or effect, a group outline, or the canvas background, and the graphty app sets each
one in the Style panel section that already owns what it changes. The full design is
`design/rendering/shader-styles.md`; this page is what to look at and what is still open.

## Where to look

- The app (branch `feat/shader-styles`): https://dev.ato.ms:9587
- graphty-element's Storybook, stories under "Shaders": http://dev.ato.ms:9253

Both run on this machine under servherd and reload when the branch changes.

## What to try first

1. Open the Zachary's karate club sample, select the Everything layer, and on its Node tab press
   Rendering + and pick Pearl or Glass marble. The nodes keep their fill color: the material rides
   on the Fill row beneath it.
2. On the Edge tab, open the Pattern row and pick Fiber, then change the line color.
3. Graph settings, Background: Shader, and pick Nebula.
4. Select the Selected layer, Effects +, Effect..., pick Reticle, then click a node.
5. Run Analyze, Louvain; then on Everything press Group outline +, pick Hull or Soap bubble, and
   group by Louvain.
6. Layout, Circle, Transition: Particle morph, Apply.
7. Effects +, Effect..., Paste shader..., and paste the example from section 4.1 of the design.
   Break it (`return ring;`) and the dialog names the line and keeps Add off.
8. Main menu, Save local copy, then open that file again: every shader comes back.

## How shaders combine with the layers beneath

A shader is a style value like any other, so the highest layer that sets it wins, and a material or
edge surface that reads the color beneath rides on it rather than replacing it. Effects and group
outlines stack instead of replacing each other, and a shader that cannot draw (compiling, held,
failed, or turned off by the frame guard) leaves exactly what the layers beneath draw.

## Presets

- Node materials: Anodized steel, Clear glass, Dew drop, Disco ball, Foil shimmer, Frost, Frosted
  glass, Gemstone, Glass marble, Halftone, Hologram, Ink, Lantern glow, Liquid metal, Patterns,
  Pearl, Toon outline (plus Plain and Wireframe, which are not shaders).
- Node sprites (they replace the shape): Mandala, Sticker.
- Node effects: Aura, Change flash, Reticle, Satellites, Shockwave.
- Edge surface: Fiber. Edge effects: Comets, Edge change, Edge glow, Light packets. Tapered edges
  and weight arcs are the Taper and Lift rows of the Line section, not shaders.
- Group outlines: Hull, Soap bubble. Background: Nebula.
- Layout transitions: Glide, Staggered glide, Arc move, Swirl, Fade through, Collapse and bloom,
  Particle morph.

## Not done

- Pie and donut nodes and gradient edges (two of your picks): they wait on the style-specimens
  branch landing, whose merge here still has a conflict in the catalog API report.
- Hull and Soap bubble outline only nodes that sit near each other. A group spread across the
  drawing gets several small outlines, or none.
- Reopening a saved project that has algorithm results adds that algorithm's layers a second time
  (two Louvain folders). That is the project-file code, not shaders, and is not fixed here.
- A pasted shader that fails to compile also prints Babylon.js's own error lines in the browser
  console.
- The Transition setting in the Layout popover is a plain dropdown, not a property row.
- Unsaved-work banner after Save, a recovered draft losing its name, and the camera not restored
  on reopen: autosave and project-file issues, left for their own work.

## Decisions for you

These are one-way doors: each publishes a file format or changes an exported type.

1. **The shader text format becomes a published format**: its header keys, kind codes, namespaced
   ids (bare ids are reserved for the element's presets), entry functions, and the input struct
   fields and helper names. Pasted shaders are GLSL only, with no textures, and transitions are
   not in the format. Recommended as written.
2. **Pasted shader text is stored as `StyleDocument.shaders`**, beside palettes, and the saved
   graph config gains `backgroundType: "shader"`. Both change a published file format.
   Recommended.
3. **Several exported unions widen**: `ChannelValue` (adds `ShaderParamSets` and
   `ShaderEffects`), `ChannelValueKind`, `ElementState` (adds `"pinned"`), `GraphBackground` (adds
   the shader member), `OptionType` / `OPTION_TYPES` (adds `"color"`), and the keys
   `LayerSpec.encode` can hold (parameter addresses). Recommended: widen them in the next grouped
   major, and in that same major mark `ChannelValue`, `ChannelValueKind`, `ChannelGroup`,
   `ElementState` and `OptionType` as open unions.
4. **A project from someone else holds its pasted shaders** until the reader runs them (the
   untrusted setting defaults to "hold"). Recommended.

## Review findings

Fixed: the GLSL checker bypasses (a lone carriage return, a backslash line continuation); Fiber
vanishing or drawing differently after a line change, an undo or a reload; the frame guard missing
a slow GPU and the flash check sampling too slowly; bloom and background cost, frozen looping
effects, cropped node effects, and effects drawn under edges; preset looks on the light canvas
(Pearl, Nebula stars, Glass marble, Disco ball, Liquid metal, Dew drop, Clear glass, Soap bubble,
Reticle, Hull, Comets) and named pictures for Sticker icons and Patterns; the paste check matching
Add, copies keeping their values and ids; Particle morph holding the camera; preset stories
framing; and in the app, the shader rows, gallery, paste dialog, parameter pop-over, motion menu,
undo words, group outline and legend. A shader row now also says why its shader draws nothing
(for example "Off: the graphics card is slow").

Left, by decision: no kind chip on shader rows and no hover preview on gallery tiles (both against
the panel's decided rules), no extra background presets beyond your Nebula pick, and dependent
parameter fields (Twinkle with no stars) for later.
