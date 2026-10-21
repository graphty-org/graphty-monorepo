# Nodes as 3D models: the prototype

graphty-element can draw a node as a loaded 3D model (a server rack, a car, your own `.glb`)
instead of a sphere or a box, and can draw a picture on a node (`node.texture`). The element
loads, checks, sizes, centers and lights the model and finds its missing parts; the graphty app
only presents it. The full design is `design/rendering/node-models.md`; the reader's guide is
`graphty-element/docs/guide/node-models.md`. Everything is on branch `feat/node-models-tier3`,
built on the tier 3 Style panel, not landed.

## Try it in the app

Start the app from `.worktrees/node-models-tier3/graphty` through servherd (server name
`node-models-tier3-app`, HTTPS). Open the Florentine families sample, click the Everything layer,
and use the Style tab on the right.

### A model

1. In the Shape section, click the Shape field (it shows "Icosphere"). A grid of shape pictures
   opens; the last tile is **Model...**.
2. Model... opens the **Models** pop-over:
    - **Samples**: Box, Server, Person, Tree. One click draws every node in the layer as that model.
    - **Paste URL** and the arrow: a `.glb`, `.gltf`, `.obj`, `.stl` or `.zip` on the web.
    - **Choose files**: one or more files, or a `.zip`.
    - **Folder**: a whole folder (for a model that keeps its pictures in a `Textures/` folder).
    - Dropping files on the pop-over does the same as Choose files.
3. The Shape field then shows the model's name, and a gear beside it opens **Model settings**
   (Up, Turn, Color, Fit, Center). Choosing a built-in shape in the grid takes the model off.
4. If the model needs a part it did not get, a **1 missing** chip appears under the Shape field and
   the **Parts** pop-over opens on its own: one row per missing part, named as the model names it
   (`Textures/colormap.png`), with **Paste URL**, **Choose** and **Load without it** (a picture
   only). A picture dropped on that pop-over, chosen in the Models pop-over, or dropped on the
   canvas goes to the model waiting for it. A part URL on another site asks first ("Open a web
   address?"), the same per-host approval as the project's other web loads.

### A picture

In the Fill section, click "+" and choose **Picture**. The Picture row opens the **Picture**
pop-over: the project's pictures, **Paste URL**, **Choose picture** and a drop zone. The picture is
drawn on the built-in shape or on the model. A picture chosen where a model was expected shows
"Picture" with **Use as picture**, which puts it in Fill, never in Shape. A picture dropped on the
canvas with no model waiting is drawn on the selected nodes (or every node) as a new layer.

## Checked on 2026-10-20 (real input in Chromium, swiftshader)

Kenney's Car Kit `police.glb`, which names `Textures/colormap.png` outside the file:

| Route                                                         | Result                                |
| ------------------------------------------------------------- | ------------------------------------- |
| Folder (police.glb plus Textures/colormap.png)                | Drawn with its colors                 |
| `.zip` of the same folder, by Choose files                    | Drawn with its colors                 |
| police.glb alone, then colormap.png by the part row's Choose  | 1 missing, Parts pop-over, then drawn |
| police.glb alone, then colormap.png chosen in Models pop-over | Drawn (the picture goes to the model) |
| police.glb alone, then colormap.png by part URL on a 2nd host | Approval asked, then drawn            |
| URL of police.glb next to its Textures folder                 | Drawn with its colors                 |
| police.glb dropped on the canvas, then colormap.png dropped   | New "police" layer, then drawn        |

Other models: Khronos `Duck.gltf` by URL (from raw.githubusercontent.com, with its `.bin` and
picture) and Kenney's `police.obj` with its `.mtl` and texture by Folder are both drawn. A PNG on
the Box shape through Fill's Picture is drawn.

## Not yet

- **Canvas drop shows its state only in a toast.** A model dropped on the canvas makes a new layer
  while the panel stays on the layer you had open, so the "1 missing" chip is not in view; the
  legend card names the model by its asset id ("police Asset:6a92...").
- **The Shape field shows a generic cube icon** for a loaded model, not its thumbnail.
- **A picture on a box** also stretches across the box's narrow sides (thin dark slivers).
- **Animations** do not play (`W_MODEL_HAS_ANIMATIONS`); compressed models (Draco, meshopt, KTX2)
  are refused with `E_MODEL_DECODER_UNAVAILABLE`; FBX, USDZ, DAE, BLEND and 3MF are refused with a
  hint to export `.glb`.
- No level of detail, no 2D impostors, no `registerModelLoader` extension point.

## Decided: a project file embeds its models

The owner chose (2026-10-20) to embed each model's files in the project file, in a
`graphty-assets` member (`design/documents/assets.md`): one copy per digest, at most 64 MB per
document, checked again when the file opens. Saving, autosave and reopening with the network
blocked all draw the models again.
