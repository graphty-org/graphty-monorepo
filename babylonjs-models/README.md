# babylonjs-models

[![CI](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/graphty-org/graphty-monorepo/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/graphty-org/graphty-monorepo/badge.svg?branch=master)](https://coveralls.io/github/graphty-org/graphty-monorepo?branch=master)
[![npm version](https://img.shields.io/npm/v/babylonjs-models.svg)](https://www.npmjs.com/package/babylonjs-models)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Load 3D models into [Babylon.js](https://www.babylonjs.com/) scenes from a URL, a File, a folder, a
`.zip` or bytes. Every file is checked before Babylon reads it, a model reads only its own files, and
nothing is fetched from a CDN: the Draco decoder, the KTX2 transcoders and the OpenUSD importer ship
inside the package.

| Format           | Files                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| glTF 2.0 and 1.0 | `.glb`, `.gltf` with its `.bin` and pictures; Draco, meshopt and KTX2 compression; WebP and AVIF pictures                         |
| OBJ              | `.obj` with its `.mtl` and the pictures the `.mtl` names (PNG, JPEG, TGA, DDS, BMP, GIF), vertex colors                           |
| STL              | ASCII and binary, with VisCAM and Materialise colors                                                                              |
| PLY              | ASCII and binary meshes and point clouds                                                                                          |
| Babylon.js       | `.babylon` (geometry and diffuse materials)                                                                                       |
| FBX              | binary and ASCII (6 and 7), with its pictures beside it or embedded; skins, blend shapes, clips, curves                           |
| USD              | `.usda`, `.usdc`, `.usd` with the layers and pictures it references; `.usdz` packages; skins, clips                               |
| BVH              | motion capture (a skeleton and its motion, no shape): drawn as a figure of one box per bone, its motion one clip, `BVH Animation` |

Gaussian splats (`.splat`, `.spz`, `.sog`, a splat PLY, a glTF or GLB that uses
`KHR_gaussian_splatting`, required or not) are recognized and refused with
`E_MODEL_FORMAT_UNSUPPORTED`: `params.format` is `splat`, `spz`, `sog` or `splat-ply`, and a glTF
names the extension in `params.extension`. `detectModelFormat` answers `supported: false` for such a
glTF or GLB when its first 4 KB name the extension.

```bash
npm install babylonjs-models @babylonjs/core @babylonjs/loaders
```

`@babylonjs/core` and `@babylonjs/loaders` 9.37 or a later 9.x are optional peer dependencies (the
FBX loader first ships in 9.13 and the USD loader in 9.26; this package is built and tested against
9.37): the main `babylonjs-models` entry needs them. `babylonjs-models/files` and `babylonjs-models/detect` never
load Babylon.js, so they work in Node, a Web Worker or a server with only `npm install babylonjs-models`.

## Load a model

```ts
import { ArcRotateCamera, Engine, HemisphericLight, Scene, Vector3 } from "@babylonjs/core";
import { loadModel, ModelError } from "babylonjs-models";

const engine = new Engine(canvas);
const scene = new Scene(engine);
new ArcRotateCamera("camera", 1, 1, 10, Vector3.Zero(), scene).attachControl();
new HemisphericLight("light", new Vector3(0, 1, 0), scene);

try {
    const { container } = await loadModel(scene, "https://example.com/models/car.glb");
    container.addAllToScene();
} catch (error) {
    if (error instanceof ModelError) console.warn(error.code, error.fact.params);
}
engine.runRenderLoop(() => scene.render());
```

The source can be a URL, a `File`, an array of Files or a `FileList` (a model with its parts, or a
whole folder from `<input type="file" webkitdirectory>`), a `.zip`, bytes, or `{ files, main }`, a
map of path to bytes. A URL is fetched with no credentials, and the files it names beside it (a
`.gltf`'s `.bin` and pictures, an `.obj`'s `.mtl`) are fetched from the same folder.

`loadModel` returns the container, which is not yet in the scene, with what the checks found:

```ts
const { container, summary, warnings } = await loadModel(scene, fileInput.files);
console.log(summary.format, summary.triangles, summary.animations, summary.upAxis);
for (const warning of warnings) console.log(warning.code, warning.params); // W_MODEL_*
```

Options: `main` (which file is the model, when a set holds several), `format`, `skipped` (pictures
or `.mtl` files to load without), `limits`, `signal`, `pluginOptions` (Babylon's loader options by
plugin, such as `{ gltf: { animationStartMode: 0 } }`) and `keepCamerasAndLights` (default true).

A material that drew its color from a picture loaded without (`skipped` or `withoutPictures`) has
no look of its own left; `drawsWithoutPicture(material)` says so, so you can draw that part in a
color of your own.

## Check files without Babylon.js

```ts
import { checkModelFiles, DEFAULT_MODEL_LIMITS, detectModelFormat, readModelFiles } from "babylonjs-models/files";

detectModelFormat({ filename: "car.glb", head: firstBytes }); // { format: "glb", supported: true }

const { given, main } = await readModelFiles(files, DEFAULT_MODEL_LIMITS);
const checked = await checkModelFiles(given, { main }, DEFAULT_MODEL_LIMITS);
console.log(checked.format, checked.summary.triangles, checked.warnings);
```

A refused set throws a `ModelError`. Its `facts` lists every problem found at once, such as each
missing part of a model: `listParts(files, {}, DEFAULT_MODEL_LIMITS)` names every file a model needs
and whether the set holds it, and `listModels(files, DEFAULT_MODEL_LIMITS)` lists every model a set
holds (each `{ main, format, files }`) when a folder or `.zip` carries more than one.
`loadModelFiles(scene, checked.files, checked.main, checked.format)`
then loads a checked set.

## Codes

Every problem is a code with plain-value params, never a sentence, so an application words it in
its own language.

| Code                                                                      | When                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `E_MODEL_FORMAT_UNKNOWN`                                                  | No file of the set is a model                                                                                                                                                                                                  |
| `E_MODEL_FORMAT_UNSUPPORTED`                                              | A recognized format this package does not load (COLLADA, 3MF, .blend, Gaussian splats)                                                                                                                                         |
| `E_MODEL_AMBIGUOUS`                                                       | Several files could be the model: pass `main`                                                                                                                                                                                  |
| `E_MODEL_MISSING_FILE`                                                    | A file the model names is not in the set (`name`, `role`)                                                                                                                                                                      |
| `E_MODEL_PART_AMBIGUOUS`                                                  | Several files of the set match a name the model uses                                                                                                                                                                           |
| `E_MODEL_EXTERNAL_URL`                                                    | A reference to a `blob:`, `javascript:` or other non-web address                                                                                                                                                               |
| `E_MODEL_TOO_LARGE`                                                       | Over a limit (`what`, `found`, `limit`)                                                                                                                                                                                        |
| `E_MODEL_STRUCTURE`                                                       | A damaged file (`rule`)                                                                                                                                                                                                        |
| `E_MODEL_PARSE`                                                           | Babylon could not read the file                                                                                                                                                                                                |
| `E_MODEL_DECODER_UNAVAILABLE`                                             | A decoder is off, left out of a build, or failed to load (`extension`, or `format: "usd"` for the OpenUSD importer; `reason`)                                                                                                  |
| `E_MODEL_FETCH`, `E_MODEL_URL_BLOCKED`, `E_MODEL_WEB_PAGE`, `E_MODEL_ZIP` | A URL or zip could not be read                                                                                                                                                                                                 |
| `W_MODEL_*`                                                               | Worth knowing about an accepted model: a part substituted or skipped, pictures reduced, points drawn as solids, an extension drawn without (`W_MODEL_EXTENSION_IGNORED`, `extension`: the transmission family is drawn opaque) |

## Decoders

The Draco decoder, the KTX2 transcoders and the OpenUSD importer are in `dist/wasm/`, found with
`new URL("../wasm/<file>", import.meta.url)`, which Vite, webpack and Parcel copy into a build. Each
loads only for a model that uses it: Draco, meshopt and KTX2 for a glTF that names them, OpenUSD
(a module worker and 10 MB of WebAssembly and data, 2.5 MB compressed) for a USD or USDZ model.

- With Vite, keep the package out of dependency pre-bundling, which moves modules away from their
  files: `optimizeDeps: { exclude: ["babylonjs-models"] }`.
- To serve the files yourself, copy `dist/wasm/` and say where, before the first model loads:

```ts
import { configureDecoders } from "babylonjs-models";

configureDecoders({ baseUrl: "/static/model-decoders/" });
configureDecoders({ ktx2: false }); // or turn one off: a model that needs it reports E_MODEL_DECODER_UNAVAILABLE
configureDecoders({ usd: false }); // a USD or USDZ model is then refused the same way
```

The decoders' licenses are in `licenses/`: OpenUSD's (the Tomorrow Open Source Technology License,
Apache 2.0 with its own trademark section, and the notices of the code it bundles), oneTBB's and
zlib's are in `licenses/openusd/`.

### What each format's summary says

FBX and USD summaries count meshes, triangles, materials, pictures, clips, skins and blend shapes
from the files without drawing them, give the bounds of the vertices as written, and say
`metersPerUnit` (FBX: its `UnitScaleFactor` / 100; USD: the stage's `metersPerUnit`). Their
`upAxis` is `"y"`: Babylon's loaders turn a Z-up file upright. A USD stage's counts add up each
layer it references once, not once per use, and its one clip is `USD Animation 1`, as Babylon's
loader names it. An FBX file's curves (NURBS curves, lines) are drawn as thin tubes. A BVH file's
summary describes the figure it is drawn as: one box (12 triangles) per bone, skinned.

## License

MIT
