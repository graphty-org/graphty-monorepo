# Nodes as 3D models: the prototype

graphty-element can now draw a node as a loaded 3D model (a server rack, a person, a tree, your
own `.glb`) instead of a sphere or a box. A style layer names the model; the element fetches or
receives the file, checks it, sizes and centers it to the node, lights it and draws every matching
node from one shared copy. The full design is `design/rendering/node-models.md`; the reader's guide
is `graphty-element/docs/guide/node-models.md`. Everything is on branch `feat/node-models`, not
landed.

## Try it

Storybook (this branch): http://dev.ato.ms:9818/?path=/story/styles-node-models--servers-as-racks

| Story                    | What to look at                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Servers As Racks         | The guide's first example: one layer turns the three server nodes into racks; the two people stay spheres                            |
| Model By Kind            | One encoding of the `kind` column: server, person, tree and crate each get their own sample model; the unlisted robot keeps a sphere |
| Tint On And Off          | `node.modelTint` on (left, orange with shading kept) and off (right, the model's own gray, reported as `W_MODEL_COLOR_IGNORED`)      |
| Stl Turned Upright       | An STL made with Y up: drawn as guessed it lies on its side (`W_MODEL_UP_GUESSED`); with `node.modelSourceUp: "y"` it stands         |
| Failed Model Placeholder | A truncated GLB is refused (`E_MODEL_STRUCTURE`) and its nodes keep their box; the racks beside it draw normally                     |

To try your own file in the graphty app on this branch: Style tab, the shape line, "Model...", then
a sample, "Choose file..." or a drop; or drop a model file on the canvas or the start screen.

## What works (checked in the Storybook and by the tests)

- **Formats:** `.glb`; `.gltf` with its `.bin` and pictures; `.obj` with its `.mtl`; `.stl`; any of
  these in a `.zip`. Loaded by URL (the stories) and as dropped `File`s through
  `session.assets.add` (an OBJ with its MTL and a glTF with its BIN, both drawn).
- **Refusals with codes:** a glTF missing its `.bin` is `E_MODEL_MISSING_FILE`, an `.fbx` is
  `E_MODEL_FORMAT_UNSUPPORTED`, a text file is `E_MODEL_FORMAT_UNKNOWN`, a cut-short GLB is
  `E_MODEL_STRUCTURE`. The node keeps its ordinary shape; nothing goes missing from the picture.
- **Fit:** each model is scaled so its largest side matches the node size, centered on the node,
  stood upright from the file's up axis, and turned so its front faces the starting camera.
- **Lighting, picking, labels:** shaded under the scene's light; a click picks the node (by its
  box); labels sit above the model; edges stop at its edge.
- **Sharing:** three racks are three instances of one template (one load, one set of meshes).
- **Tests:** lint, build, the `graphty-element-default` shard, the model browser tests (23) and the
  five stories as tests pass, and the public API report matches.

## Fixed during this check

- Light gray models washed out to flat white: the bundled environment added too much light on top
  of the scene's own. Now about a quarter as bright; the racks show their bays and faces shade.
- Every model showed its back to the starting camera. A turn of 0 now shows its front.
- The guide called the element `graph`, which failed the guide-name test; it is `element` now.

## Not yet

- **Animations** do not play: a model with clips draws its rest pose and reports
  `W_MODEL_HAS_ANIMATIONS`. Skeletons and morph targets are baked into that pose.
- **Compressed models** (Draco, meshopt, KTX2 pictures) are refused with
  `E_MODEL_DECODER_UNAVAILABLE`; PLY is recognized but not drawn; FBX, USDZ, DAE, BLEND and 3MF are
  refused with a hint to export `.glb`.
- **No story drops a file:** dropping is checked by hand and by the graphty app's tests, not by a
  graphty-element story.
- **WebKit** request-guard tests could not run on this machine (missing system libraries); CI's
  lifecycle shard runs them.
- The sample stories warn `W_MODEL_COLOR_IGNORED` because the stories color every node; that is
  correct, but noisy.
- No level of detail, no 2D impostors, no `registerModelLoader` extension point yet.

## Decided: a project file embeds its models

The owner chose (2026-10-20) to embed each model's files in the project file, in a new
`graphty-assets` member (`design/documents/assets.md`): as given, base64, one copy per digest, at
most 64 MB per document, checked against the digest and then by the same checks as a dropped file
when the file opens. Saving, autosave and reopening with the network blocked all draw the models
again.

## Next steps

1. Owner review of the five new stories' screenshots when the branch lands.
2. Draco and meshopt decoders as lazily loaded chunks; then animation on a capped number of nodes.
