# Sample models: sources and licenses

graphty-element ships four sample models that a style layer can name without adding a file:
`asset:sample/box`, `asset:sample/server`, `asset:sample/person` and `asset:sample/tree`. Each is
a GLB with a 128 x 128 PNG thumbnail beside it.

| File                       | Id                    | Source                                                                       | License                                                       |
| -------------------------- | --------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `box.glb`, `box.png`       | `asset:sample/box`    | Made for graphty-element by `scripts/make-sample-models.mjs` (a unit cube)   | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `server.glb`, `server.png` | `asset:sample/server` | Made for graphty-element by `scripts/make-sample-models.mjs` (a server rack) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `person.glb`, `person.png` | `asset:sample/person` | Made for graphty-element by `scripts/make-sample-models.mjs` (a figure)      | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `tree.glb`, `tree.png`     | `asset:sample/tree`   | Made for graphty-element by `scripts/make-sample-models.mjs` (a fir tree)    | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |

The models are built from boxes, cylinders, cones and spheres by the script, and the thumbnails are
drawn from the same triangles by it, so no third party's work is included. graphty-org dedicates
them to the public domain under CC0 1.0: copy, change and use them for anything, with no
attribution required. Each GLB says the same in its `asset.copyright`.

Every base color is a light neutral gray, so `node.modelTint` (the model's colors multiplied by
`node.color`) shows a data color close to the color asked for. To change a model, edit the script
and run `node scripts/make-sample-models.mjs`; the output is the same bytes on every run.
