# API reference

babylonjs-models has three entry points, and the generated reference has a module for each:

| Module   | Import from               | Holds                                                                                  |
| -------- | ------------------------- | -------------------------------------------------------------------------------------- |
| `index`  | `babylonjs-models`        | `loadModel`, `loadModelFiles`, `configureDecoders`, and every `files` export           |
| `files`  | `babylonjs-models/files`  | `readModelFiles`, `checkModelFiles`, `listParts`, `listModels`, `DEFAULT_MODEL_LIMITS` |
| `detect` | `babylonjs-models/detect` | `detectModelFormat`, `ModelError` and the format and code types                        |

The main entry needs `@babylonjs/core` and `@babylonjs/loaders` 8; `files` and `detect` never load
them.

The pages are generated from the source's documentation comments, and are listed in the sidebar
under "Generated TypeDoc".
