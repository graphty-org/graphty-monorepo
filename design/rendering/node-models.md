# Drawing nodes as 3D models

Status: design, with a prototype planned (section 10). Package: graphty-element, plus the
graphty app's controls for it (section 9). One part, how a project file stores a model, is a
published file format and is marked OWNER DECISION.

Today every node in graphty-element is one of its built-in shapes: a sphere, a box, a cone, a
polyhedron. This design lets a style layer draw the nodes it matches as a 3D model loaded from a
file instead -- a robot, a server rack, a molecule, a building -- and makes that work for someone
who knows nothing about 3D file formats. The element detects, loads, sizes, lights, caches and
reports on the model; the person only says which nodes and which file.

Contents:

1. What a 3D model file is (the background questions)
2. The graphty-element API
3. The loading pipeline inside the element
4. Errors and warnings
5. What is detected automatically
6. Options
7. Storing models in a project file (OWNER DECISION)
8. Security and performance budgets
9. The graphty app's interface
10. Work packages and sample models

---

## 1. What a 3D model file is

### 1.1 What a model file holds

A 3D model file can hold any of these, and most formats hold only some of them:

| Part              | What it is                                                                    |
| ----------------- | ----------------------------------------------------------------------------- |
| Geometry          | The triangles (vertices, normals, texture coordinates)                        |
| Materials         | How a surface reacts to light: base color, metal, roughness, transparency     |
| Textures          | Images painted onto the surface (color, normal, roughness maps)               |
| Hierarchy         | Parts inside parts (a car body with four wheels), each with its own transform |
| Skeleton          | Bones that bend the mesh (a character's arm), also called skinning            |
| Morph targets     | Alternative vertex positions blended in (a face smiling)                      |
| Animations        | Named clips that move bones, parts or morph weights over time                 |
| Cameras, lights   | Scene setup from the authoring tool; a node has no use for them               |
| Units and up axis | Whether 1 means a meter or a millimeter, and which way is up                  |
| Metadata          | Author, license, custom fields                                                |

**Shaders.** No common interchange format carries shader code. glTF, the format this design
centers on, describes materials with one fixed, physically based model (PBR: base color,
metallic, roughness, plus documented extensions such as clear coat or transmission). That is why a
glTF model looks the same in every engine, and it means there is no shader to load, sandbox or
compile per file.

### 1.2 The formats

| Format                                     | Files               | Geometry              | Materials      | Textures                          | Hierarchy   | Skeleton | Morphs | Animation                 | Units / up axis in file                | Babylon 8.56 (our version) loads it                                         |
| ------------------------------------------ | ------------------- | --------------------- | -------------- | --------------------------------- | ----------- | -------- | ------ | ------------------------- | -------------------------------------- | --------------------------------------------------------------------------- |
| **GLB** (binary glTF 2.0)                  | 1                   | yes                   | PBR            | embedded                          | yes         | yes      | yes    | yes                       | yes: meters, +Y up (fixed by the spec) | yes, `@babylonjs/loaders`                                                   |
| glTF 2.0 (`.gltf`)                         | 1 + `.bin` + images | yes                   | PBR            | separate files (or base64 inside) | yes         | yes      | yes    | yes                       | yes, as GLB                            | yes                                                                         |
| OBJ + MTL                                  | 1 + `.mtl` + images | yes                   | simple (Phong) | separate files                    | groups only | no       | no     | no                        | no                                     | yes                                                                         |
| STL                                        | 1                   | yes                   | no             | no                                | no          | no       | no     | no                        | no (usually millimeters, Z up)         | yes                                                                         |
| PLY                                        | 1                   | yes, or points        | vertex colors  | no                                | no          | no       | no     | no                        | no                                     | yes (also Gaussian splats)                                                  |
| Gaussian splats (`.splat`, `.spz`, `.sog`) | 1                   | points, not triangles | n/a            | n/a                               | no          | no       | no     | no                        | no                                     | yes                                                                         |
| BVH                                        | 1                   | no                    | no             | no                                | skeleton    | yes      | no     | yes (motion capture only) | no                                     | yes                                                                         |
| `.babylon`                                 | 1 (+ images)        | yes                   | yes            | separate                          | yes         | yes      | yes    | yes                       | Babylon's own                          | yes, in core                                                                |
| FBX                                        | 1 (+ images)        | yes                   | yes            | embedded or separate              | yes         | yes      | yes    | yes                       | yes                                    | no: Babylon 9 only                                                          |
| USD / USDZ                                 | 1 (USDZ zip)        | yes                   | PBR            | embedded (USDZ)                   | yes         | yes      | yes    | yes                       | yes                                    | no: Babylon 9 only, and it downloads a WebAssembly build from Babylon's CDN |
| Collada (`.dae`)                           | 1 + images          | yes                   | yes            | separate                          | yes         | yes      | yes    | yes                       | yes                                    | no                                                                          |
| 3MF                                        | 1 (zip)             | yes                   | colors         | embedded                          | yes         | no       | no     | no                        | yes                                    | no                                                                          |
| `.blend` (Blender)                         | 1                   | everything            | Blender's own  | either                            | yes         | yes      | yes    | yes                       | yes                                    | no: export GLB from Blender                                                 |
| PDB / mmCIF (molecules)                    | 1                   | no: atoms and bonds   | no             | no                                | no          | no       | no     | no                        | angstroms                              | no: convert to GLB (ChimeraX), or import as a graph                         |

### 1.3 Is there one standard package that holds everything?

Yes: **GLB**. It is one binary file holding the glTF 2.0 scene and every buffer and image it
needs. glTF is an open, royalty-free Khronos standard (and ISO/IEC 12113). Its units (meters) and
up axis (+Y) are fixed by the specification, so they never need guessing. It carries geometry, PBR
materials, embedded textures, hierarchy, skeletons, morph targets, animations, cameras and lights,
plus free-form `extras` (which Babylon exposes as `metadata`) and license data (`asset.copyright`,
or the `KHR_xmp_json_ld` extension). Every model library listed below offers GLB downloads, and
every 3D tool exports it.

USDZ is the other one-file package, Apple's choice for AR, but on the web it needs Babylon 9 and a
WebAssembly download from Babylon's CDN.

### 1.4 Where to get models

| Source                                                                           | License                               | Fit for graphty                                          |
| -------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------- |
| [Kenney](https://kenney.nl/assets)                                               | CC0                                   | Ship as samples. Small, low-poly, GLB                    |
| [Quaternius](https://quaternius.com/)                                            | CC0                                   | Ship as samples, including animated characters           |
| [Poly Haven](https://polyhaven.com/models)                                       | CC0                                   | Ship at 1K textures (larger ones are many MB)            |
| [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets) | per model; some CC0                   | Test fixtures; check each model's README before shipping |
| [Smithsonian Open Access 3D](https://3d.si.edu/)                                 | CC0 items                             | Ship the CC0 ones                                        |
| [Poly Pizza](https://poly.pizza/)                                                | CC0 and CC-BY mixed                   | Ship only the CC0 ones                                   |
| [NASA 3D Resources](https://science.nasa.gov/3d-resources/)                      | NASA media guidelines                 | Users may use them; do not bundle                        |
| Sketchfab                                                                        | per model; download needs a login     | Users bring their own; not samples                       |
| Mixamo                                                                           | raw files may not be redistributed    | Users only                                               |
| Thingiverse, Printables                                                          | mostly attribution or non-commercial  | Users only                                               |
| NIH 3D, VRoid Hub, AI model generators                                           | varies per model or per service terms | Users only                                               |

### 1.5 Common problems, and how the element removes each one

| Problem                                                  | Why it happens                                                      | What the element does                                                                                                                           |
| -------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| The model is huge or tiny                                | Files mix centimeters, millimeters and meters                       | Fits every model to the node's size by its bounding box, so units never matter (3.4)                                                            |
| The model sits off to one side of the node               | Its origin is far from its center                                   | Centers the bounding box on the node (3.4)                                                                                                      |
| The model lies on its back                               | Z-up formats (STL, many OBJ files)                                  | glTF is converted by the loader; for OBJ and STL an `up` option, and the app's "Turn upright" control                                           |
| The model is gray, textures missing                      | A `.gltf` or `.obj` was loaded without its `.bin`, `.mtl` or images | Accepts a `.zip`, a folder or several files together; checks every reference before loading and names the missing file (`E_MODEL_MISSING_FILE`) |
| The model is black                                       | PBR metal needs an environment light, and the scene has none        | Bundles a small neutral environment and uses it for model nodes (3.5)                                                                           |
| The model starts moving on load                          | Babylon plays the first clip by default                             | Animation is off unless asked for (3.6)                                                                                                         |
| A loading screen covers the graph                        | Babylon's default for every load                                    | Turned off                                                                                                                                      |
| Thousands of nodes load the same file thousands of times | One load per node                                                   | One load per model, every node an instance (3.10)                                                                                               |
| The frame rate collapses at scale                        | Heavy models times many nodes                                       | Triangle budget, instancing, level of detail, `W_MODEL_HEAVY` (8.2)                                                                             |
| Edges stop inside or far from the model                  | Edge ends are trimmed for spheres                                   | Model nodes report a round radius from their bounds (3.8)                                                                                       |
| A compressed model fails in Safari or offline            | Decoders are fetched from Babylon's CDN                             | Decoders are bundled and loaded only when a file needs them (3.3)                                                                               |
| `color` does nothing on a textured model                 | The texture is the color                                            | `node.color` tints only when `tint` is on (3.5)                                                                                                 |
| A user's file is hostile                                 | Size and triangle bombs, external fetches                           | Limits and a no-network rule for a model's own references (8.1)                                                                                 |

---

## 2. The graphty-element API

Everything here is additive: a new style channel, a new session namespace, new codes, new
extension registrations. Nothing existing changes meaning.

### 2.1 The simple path: one style layer

```html
<graphty-element id="graph" style="display:block;width:100vw;height:100vh"></graphty-element>
<script type="module">
    import "@graphty/graphty-element";

    const graph = document.getElementById("graph");
    graph.nodeData = [
        { id: "web", kind: "server" },
        { id: "db", kind: "server" },
        { id: "alice", kind: "person" },
    ];
    graph.edgeData = [
        { source: "alice", target: "web" },
        { source: "web", target: "db" },
    ];

    await graph.session.styles.add({
        name: "Servers as racks",
        target: "node",
        selector: { match: "expression", where: "data.kind == 'server'" },
        set: { "node.model": "https://example.com/models/rack.glb" },
    });
</script>
```

That is the whole first example. The model is fetched, sized to the node, centered, lit, cached
once and drawn on both server nodes. While it loads, and if it fails, each node keeps drawing its
ordinary shape (`node.shape`), so a node is never missing.

A file the reader chooses or drops works the same way, through one more call:

```ts
const input = document.querySelector("input[type=file]");
const asset = await graph.session.assets.add(input.files); // one .glb, or a .gltf with its files, or a .zip
await graph.session.styles.add({
    name: "My model",
    target: "node",
    selector: { match: "everything" },
    set: { "node.model": asset.id }, // "asset:<sha256>"
});
```

### 2.2 The new style channels

| Channel             | Value                   | Role in the instancer | Meaning                                                   |
| ------------------- | ----------------------- | --------------------- | --------------------------------------------------------- |
| `node.model`        | `ModelRef` (string)     | `mesh`                | Draw the node as this model. Unset: draw `node.shape`     |
| `node.modelOptions` | `ModelOptions` (object) | `mesh`                | Per-layer overrides of how the model is drawn (section 6) |

`node.shape` keeps its meaning and becomes the placeholder while a model loads, the fallback when
it fails, and what a reader older than this feature draws. A separate channel was chosen over a
new `NodeShapes` member `"model"` for exactly that reason: a shape enum value has nowhere to say
which model, and an older reader would refuse the unknown enum value instead of drawing a sphere.

`node.size`, `node.sizeMode`, `node.width`, `node.height` and `node.depth` apply to a model
exactly as to a built-in shape: the model's bounding box is fitted to them (3.4).

```ts
/** A model, named by a registered asset id or a URL. */
export type ModelRef =
    | `asset:${string}` // an asset in session.assets, by its sha256 or a registered name
    | string; // an absolute or page-relative URL; only code may use one (see 7.3)
```

Per-node models from a data column (each node's own `data.modelUrl`) come later, through
`session.styles.encode({ column, channel: "node.model" })` with a value map (work package 9).
The first version uses one layer per model, as above.

### 2.3 The advanced path: `session.assets`

`session.assets` is the session's library of binary assets -- models now, node images (#295)
later. It lives in `./session`, so it is free of Babylon.js and runs in Node; only the drawing of
a model needs Babylon.

```ts
export interface AssetsApi {
    /** Add one model from a URL, a File, a FileList, a Blob, bytes, or a set of named files. */
    add(source: AssetSource, options?: AddAssetOptions): Run<AssetRecord>;
    /** Read what is known without loading anything. */
    get(id: AssetId): AssetRecord | undefined;
    list(): readonly AssetRecord[];
    /** Inspect a model fully: loads it (not into the graph) and reports what it holds. */
    inspect(id: AssetId): Run<ModelSummary>;
    /** Remove an asset; layers that name it fall back to node.shape and report W_MODEL_REMOVED. */
    remove(id: AssetId): Run<void>;
    /** The asset's bytes, as stored (GLB for a model). */
    bytes(id: AssetId): Promise<Uint8Array>;
}

export type AssetId = `asset:${string}`;

export type AssetSource =
    | string // a URL
    | File
    | Blob
    | FileList
    | readonly File[] // a .gltf with its .bin and images, an .obj with its .mtl, or a folder's files
    | ArrayBuffer
    | Uint8Array
    | { files: ReadonlyMap<string, Blob | Uint8Array>; main?: string };

export interface AddAssetOptions {
    /** A friendly id: "asset:rack". Default: "asset:" + the sha256 of the stored bytes. */
    name?: string;
    /** Force a format when bytes are ambiguous. Default: detected (section 5). */
    format?: ModelFormat;
    /** Default draw options for every layer that names this asset (section 6). */
    defaults?: ModelOptions;
    signal?: AbortSignal;
}

export type ModelFormat = "glb" | "gltf" | "obj" | "stl" | "ply" | "splat" | "babylon";

export interface AssetRecord {
    readonly id: AssetId;
    readonly kind: "model";
    readonly sha256: string;
    readonly byteLength: number;
    readonly format: ModelFormat; // the format it was added in
    readonly stored: "glb" | "source"; // see 7.2
    readonly fileName?: string;
    readonly license?: { copyright?: string; source?: string }; // read from the file, never guessed
    readonly defaults?: ModelOptions;
    readonly state: "pending" | "ready" | "failed";
    readonly problems: readonly CodedFact[]; // section 4
}

export interface ModelSummary {
    readonly format: ModelFormat;
    readonly triangles: number;
    readonly meshes: number;
    readonly materials: number;
    readonly textures: number;
    readonly textureBytes: number;
    readonly bounds: { min: [number, number, number]; max: [number, number, number] }; // as authored
    readonly upAxis: "y" | "z" | "unknown";
    readonly units: "meters" | "unknown";
    readonly animations: readonly { name: string; seconds: number }[];
    readonly skinned: boolean;
    readonly morphTargets: number;
    readonly transparent: boolean;
    readonly extensionsRequired: readonly string[]; // glTF only
    readonly license?: { copyright?: string; source?: string };
}
```

A URL in `add` is fetched once and its bytes become a stored asset, so `"node.model":
"https://..."` and `assets.add("https://...")` meet in the same cache: setting a URL directly is
shorthand for adding it and naming the result.

### 2.4 Events

Two events on the element, with the same facts the session reports:

| Event                  | `detail`                                                                          |
| ---------------------- | --------------------------------------------------------------------------------- |
| `graphty-model-change` | `{ id: AssetId, state: "pending" \| "ready" \| "failed", problems: CodedFact[] }` |

One event name, matching the element's other `graphty-*-change` events. A failed model also
appears once in the session's problem list, under the layer that names it.

### 2.5 The extension point: `registerModelLoader`

For a format graphty does not read (FBX through a converter, a molecule file drawn as balls and
sticks, a CAD format), an author registers a loader from `./extend`:

```ts
import { registerModelLoader } from "@graphty/graphty-element/extend";

registerModelLoader({
    descriptor: {
        id: "pdb-ball-and-stick",
        plainName: "PDB molecule",
        extensions: [".pdb"],
        // Optional: claim a file by its first bytes. Called with at most 1 KB.
        sniff: (head) => new TextDecoder().decode(head).startsWith("HEADER"),
    },
    // Return GLB bytes. The element does everything else: storage, fitting, caching, instancing.
    convert: async (files, { signal }) => toGlb(parsePdb(await files.main.text())),
});
```

Simple path: return GLB bytes from `convert`, and the converted model is stored, saved and drawn
like any other. Advanced path (later, work package 10): a `load(files, scene)` returning a Babylon
`AssetContainer`, for formats where converting first loses something. The built-in formats are
registered through the same function, so an extension has the same powers as the built-in ones.

---

## 3. The loading pipeline inside the element

```
source (URL | File | files | bytes)
  -> read bytes (fetch with CORS / File.arrayBuffer)      -> E_MODEL_FETCH, E_MODEL_CORS, E_MODEL_TOO_LARGE
  -> unpack (.zip -> named files)                         -> E_MODEL_ZIP
  -> pick the main file, detect its format by bytes       -> E_MODEL_FORMAT_UNSUPPORTED
  -> check references (every uri / mtllib / map_* exists) -> E_MODEL_MISSING_FILE, E_MODEL_EXTERNAL_URL
  -> check required decoders                              -> E_MODEL_DECODER_UNAVAILABLE
  -> store (sha256, AssetRecord)                          [Babylon-free up to here: ./session]
  -> lazy import the loader chunk                         [Babylon from here on]
  -> LoadAssetContainerAsync (not into the scene)         -> E_MODEL_PARSE
  -> measure (triangles, textures, clips, bounds)         -> E_MODEL_TOO_LARGE, W_MODEL_HEAVY, ...
  -> prepare the template (merge, normalize, materials)
  -> ModelCache entry, repaint matching nodes
```

### 3.1 Read

- A URL is fetched with `fetch(url, { mode: "cors", credentials: "omit", signal })`. A response
  over the size limit (8.1) is cut off as it streams, not after it arrives.
- A `File` or `Blob` is read with `arrayBuffer()`.
- A `.zip` (detected by its `PK\x03\x04` bytes) is unpacked in memory with a small bundled
  unzipper (fflate, about 8 KB gzipped, already the library Babylon itself asks for), with the
  same size limit applied to the unpacked total.
- Several files (a `FileList`, a folder from a drop, a zip's entries) become one map of
  name to bytes, keyed by path relative to the main file, compared case-insensitively.

### 3.2 Pick the main file and detect the format

Detection reads bytes first and uses the extension only to break ties (section 5 lists the
signatures). In a set of files, the main file is the first match in this order: `.glb`, `.gltf`,
`.obj`, `.stl`, `.ply`, then any registered extension's. Two candidates of the same rank is
`E_MODEL_AMBIGUOUS { candidates }`, which the caller settles with `main`.

### 3.3 References and decoders, before anything is decoded

- **glTF:** every `buffers[].uri` and `images[].uri` must be either a `data:` URI or a relative
  path present in the file set. A missing one is `E_MODEL_MISSING_FILE { name }`. An absolute
  `http(s):` URI is refused, `E_MODEL_EXTERNAL_URL { url }` (8.1). The load then resolves every
  reference through the loader's `preprocessUrlAsync` hook to a `blob:` URL made from the set, so
  Babylon's global `FilesInputStore` is never used and two models with a texture of the same
  name never collide.
- **OBJ:** the `mtllib` lines and the MTL's `map_*` lines are checked the same way, and rewritten
  to `blob:` URLs before loading (the OBJ loader has no hook). `OBJFileLoader.MATERIAL_LOADING_FAILS_SILENTLY`
  stays true, but a missing `.mtl` is already reported by this step.
- **Decoders:** a glTF's `extensionsRequired` names the decoders it needs:

| Extension                    | Decoder      | Where it comes from                                                                                                           |
| ---------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `KHR_draco_mesh_compression` | Draco        | Bundled: the copy in `@babylonjs/core/assets/`, served from the element's own chunk via `DracoDecoder.DefaultConfiguration`   |
| `EXT_meshopt_compression`    | meshopt      | Bundled: core's copy, via `MeshoptCompression.Configuration.decoder.url`                                                      |
| `KHR_texture_basisu`         | KTX2 / Basis | Optional: the package `@babylonjs/ktx2decoder`, an optional peer dependency, set through `KhronosTextureContainer2.URLConfig` |

Each decoder is loaded only when a file names it. One that is not installed is
`E_MODEL_DECODER_UNAVAILABLE { extension, package }`, never a silent fetch from
cdn.babylonjs.com. The element sets every Babylon CDN-defaulted URL (decoders, the glTF validator,
the loading screen images) to its own copy or to nothing at import time, and a test fails if a
model load makes any request to a host the page did not name.

### 3.4 Load and normalize

- The loader code (`@babylonjs/loaders` 8.56.2, matching core) is behind one dynamic `import()`,
  so the main entry's size budget does not change and a page that never draws a model never
  downloads it. Vite builds those chunks into the element's own files; nothing comes from a CDN.
  Only the glTF, OBJ, STL and PLY/splat plugins are registered, from their own modules, not
  through `registerBuiltInLoaders()`, so the bundle holds exactly what is supported.
- `LoadAssetContainerAsync(url, scene, { pluginExtension, pluginOptions })` loads the model
  without adding it to the scene, with: `SceneLoaderFlags.ShowLoadingScreen = false`,
  `gltf.animationStartMode = NONE`, `gltf.validate = false` (the validator is a CDN fetch),
  `gltf.alwaysComputeBoundingBox = true`, `gltf.loadAllMaterials = false`. The file's cameras and
  lights are discarded.
- **Up axis:** glTF and GLB need nothing: the loader's `__root__` node already converts glTF's
  right-handed +Y up to Babylon's frame, and the element never resets it. OBJ, STL and PLY carry
  no axis; the element leaves them as authored unless `up: "z"` is set (section 6). STL defaults
  to `up: "z"`, because nearly every STL comes from a CAD or 3D-printing tool that is Z up.
- **Fit:** the prepared template is measured with `getHierarchyBoundingVectors` (after
  `applySkeleton` for a skinned model, so bounds match the rest pose), recentered so the
  bounding-box center is at the origin, and scaled so its largest extent is 1. The node's size
  then scales the instance (3.10), with the same meaning as for a built-in shape in `"diameter"`
  mode: `node.size: 2` draws the model 2 units across its largest side. `fit: "contain"` (the
  default) keeps proportions; `fit: "stretch"` fills `width`, `height` and `depth` separately,
  as the existing `fitNodeMesh` does. Units are therefore irrelevant: a millimeter STL and a
  meter GLB come out the same size.
- `center: "bounds"` is the default; `center: "origin"` keeps the file's own pivot (a character
  standing on its origin, for example).

### 3.5 Materials and lighting

- glTF materials load as Babylon `PBRMaterial`. PBR surfaces need an environment to reflect, and
  the scene has only a `HemisphericLight` today, so metal renders black. The element bundles one
  small neutral prefiltered environment (`.env`, about 100 to 150 KB) in the model chunk and
  assigns it as the reflection texture of model materials only -- the scene's own
  `environmentTexture` and the built-in shapes stay exactly as they are, so existing graphs do not
  change appearance. Never `createDefaultEnvironment()`, which fetches from assets.babylonjs.com.
- PBR shaders are bundled into the model chunk the same way `bundledStandardShaders` bundles the
  StandardMaterial shaders, because Safari has failed Babylon's lazy shader fetch before.
- `unlit: true` (an option, never automatic) switches every material of the model to unlit, for
  diagrams where shading is noise. The existing `node.unlit` channel sets it.
- **Color.** By default the model keeps its own materials and `node.color` is ignored, because on
  a textured model "color" has no single meaning. `tint: true` multiplies the model's base color by
  `node.color`, per instance, which is how a data-driven color still works on models.
  `tint: "replace"` paints every material in `node.color` (a flat-colored silhouette).
- Transparent materials (`alphaMode: BLEND`) are reported in the summary; they cost sorting and are
  drawn after opaque nodes.
- Highlight, selection outline, glow and halo work as on any node, against the merged mesh
  (3.10) or the model's bounding sphere, whichever the effect already uses for a polyhedron.

### 3.6 Animations

Off by default. Options:

- `animation: false` (default): the model is drawn in its rest pose.
- `animation: true`: play the first clip, looped.
- `animation: "Walk"`: play the named clip, looped. An unknown name is
  `W_MODEL_ANIMATION_UNKNOWN { name, available }` and nothing plays.
- `animationSpeed: number` (default 1) and `animationPaused: boolean` (default false).

Clips are listed in `ModelSummary.animations` so an application can offer them by name.

### 3.7 Skeletons and morph targets, and how instancing handles them

Instancing shares one mesh among many nodes, and a skinned mesh or one with morph targets cannot
be shared that way: Babylon clones its skeleton per copy (`instantiateModelsToScene` always clones
skinned meshes). So:

| Model                                             | How it is drawn on N nodes                                                                                                                                      |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static (no skeleton, no morphs, or animation off) | One merged mesh, N instances. Fast at thousands of nodes                                                                                                        |
| Animated by node transforms only (a spinning fan) | One clone per node up to `maxAnimatedNodes` (default 64), sharing geometry and materials; past that, rest pose and `W_MODEL_ANIMATION_LIMITED { limit, nodes }` |
| Skinned or morphed, animation on                  | Same as above; later, baked vertex animation (Babylon's `BakedVertexAnimationManager`) lets every node be an instance again (work package 11)                   |

With animation off -- the default -- every model is static, so the fast path is the normal path.
The prototype draws only the rest pose and reports `W_MODEL_HAS_ANIMATIONS` when clips exist.

### 3.8 Picking, edges, labels and halos

- **Picking** uses the instance's bounding box, as for every node; a click on empty space inside
  the box of a hollow model still picks the node. Triangle-exact picking is an option later, not a
  default, because it is costly at scale.
- **Edges** stop at a sphere around the model: the model node returns a radius from
  `measureRoundRadius`: half the fitted model's mean extent, so the edge ends near the visible
  surface for compact models (a long thin model gets a gap or overlap at its ends; exact trimming
  against the model's own triangles is a later option). This keeps edges off the
  per-frame triangle hit test that costs 137 ms of a 151 ms frame at 2,000 low-poly nodes.
- **Labels** are placed against the fitted bounds, as for a built-in shape of the same size.
- **Halos and selection rings** use the fitted bounding sphere.

### 3.9 2D mode

In a 2D view the model is drawn as it is in 3D, from the 2D camera (front view), fitted the same
way, and flattened like a planar node only if `node.planar` is set. A later option renders each
model once to a sprite (an impostor) for 2D and for distant level of detail (work package 12).

### 3.10 Caching and instancing

- A per-scene `ModelCache`, separate from `MeshCache`, keyed by `AssetId` plus the options that
  change geometry (`up`, `fit`, `center`, `unlit`, `tint`). It survives what `MeshCache` disposes
  (a 2D/3D switch, a dataset clear, a prune), because reloading a model is expensive. An entry is
  dropped when no layer has named its asset for one full repaint and the asset is removed, or when
  the scene is disposed.
- A static template is prepared once: every part's transform baked, the parts merged with
  `Mesh.MergeMeshes(parts, true, true, undefined, false, true)` into one mesh with a multi-material.
  One mesh is what instancing, outlines, glow, halos and labels all need.
- Every node is an `InstancedMesh` of that template, with its size as the instance's scale (not
  baked into a copy), so a size driven by data makes no extra copies. Per-node `tint` uses an
  instanced color buffer (`registerInstancedBuffer`), as node colors do today.
- **Swap-in.** Until the model is ready the node draws `node.shape`. When the load finishes the
  element marks the affected source meshes stale and repaints; the rebuild draws the model. A
  failed load leaves the placeholder and reports once per asset, not once per node.

### 3.11 Level of detail and caps

- A per-model triangle limit (8.2) refuses absurd files outright.
- A per-scene drawn-triangle budget (default 2 million): when `triangles x nodes` would exceed it,
  the element draws the model only on the nodes nearest the camera that fit the budget and the
  placeholder shape on the rest, and reports `W_MODEL_BUDGET { drawn, nodes, triangles, budget }`.
- Babylon's mesh LOD (`addLODLevel`) swaps a model for its placeholder shape beyond a screen-size
  threshold (`lodScreenSize`, default: model below 8 pixels across draws the shape). glTF files
  with `MSFT_lod` levels use them.

---

## 4. Errors and warnings

Every problem is a `CodedFact` `{ code, params }`, never a sentence. `E_` means the model is not
drawn (the node keeps its placeholder); `W_` means it is drawn but something is worth saying.

| Code                          | params                                                                           | When                                                             | What the graphty app says (example)                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `E_MODEL_FETCH`               | `url`, `status`                                                                  | The URL answered with an error or not at all                     | "Could not download rack.glb (404). Check the address."                                                                              |
| `E_MODEL_CORS`                | `url`                                                                            | The server does not allow other sites to read the file           | "That server does not let other sites load its files. Download the model and drop it here instead."                                  |
| `E_MODEL_TOO_LARGE`           | `what: "bytes" \| "triangles" \| "textureBytes" \| "unzipped"`, `found`, `limit` | Over a limit in 8.1                                              | "This model has 4.2 million triangles; the limit is 1 million. Simplify it (for example, Blender's Decimate) or pick a lighter one." |
| `E_MODEL_FORMAT_UNSUPPORTED`  | `format`, `fileName`                                                             | Recognized but not loadable (FBX, USDZ, DAE, .blend, 3MF)        | "FBX files cannot be loaded yet. Export as GLB from your 3D program."                                                                |
| `E_MODEL_FORMAT_UNKNOWN`      | `fileName`                                                                       | No format matches the bytes                                      | "This is not a 3D model file graphty knows."                                                                                         |
| `E_MODEL_AMBIGUOUS`           | `candidates`                                                                     | Two main files in one set                                        | "Which one is the model?" with the list                                                                                              |
| `E_MODEL_MISSING_FILE`        | `name`, `referencedBy`                                                           | A `.bin`, texture or `.mtl` is not in the set                    | "robot.gltf needs robot.bin. Drop the whole folder or a .zip, or export as .glb."                                                    |
| `E_MODEL_EXTERNAL_URL`        | `url`                                                                            | A glTF points at an absolute web address                         | "This model loads parts from another website, which is not allowed. Export it as .glb."                                              |
| `E_MODEL_DECODER_UNAVAILABLE` | `extension`, `package`                                                           | Compressed with KTX2 and the decoder package is not installed    | "This model uses compressed textures, which this page cannot read." (a developer sees the package name)                              |
| `E_MODEL_PARSE`               | `format`, `detail` (Babylon's code where it has one)                             | The file is broken                                               | "The file is damaged or not a valid GLB."                                                                                            |
| `E_MODEL_ZIP`                 | `reason: "corrupt" \| "encrypted" \| "empty"`                                    | The zip cannot be read                                           | "The .zip could not be opened."                                                                                                      |
| `E_MODEL_UNKNOWN_ASSET`       | `id`                                                                             | A layer names an asset the session does not hold                 | "This style names a model that is not in the project."                                                                               |
| `W_MODEL_HEAVY`               | `triangles`, `nodes`                                                             | Over the comfortable per-model size (8.2)                        | "This model is detailed; with 800 nodes the graph may be slow."                                                                      |
| `W_MODEL_BUDGET`              | `drawn`, `nodes`, `triangles`, `budget`                                          | The scene budget limited how many nodes show the model           | "The model is shown on the 200 nearest nodes; the rest show the placeholder."                                                        |
| `W_MODEL_HAS_ANIMATIONS`      | `clips`                                                                          | Clips exist and animation is off                                 | Offer a "Play animation" control                                                                                                     |
| `W_MODEL_ANIMATION_UNKNOWN`   | `name`, `available`                                                              | The named clip is not in the file                                | "No clip named Run. This model has: Idle, Walk."                                                                                     |
| `W_MODEL_ANIMATION_LIMITED`   | `limit`, `nodes`                                                                 | More animated nodes than `maxAnimatedNodes`                      | "Only 64 nodes animate; the rest stand still."                                                                                       |
| `W_MODEL_TEXTURE_FAILED`      | `name`                                                                           | One texture could not be decoded; the rest of the model is drawn | "One texture (bark.png) could not be read; the model shows without it."                                                              |
| `W_MODEL_UP_GUESSED`          | `format`, `up`                                                                   | OBJ, STL or PLY: the up axis is a guess                          | Show the "Turn upright" control near the model                                                                                       |
| `W_MODEL_NOT_EMBEDDED`        | `id`, `url`, `reason`                                                            | A project was saved naming a URL it could not embed (7.3)        | "This project names a model on the web; others may not be able to open it."                                                          |
| `W_MODEL_REMOVED`             | `id`, `layerIds`                                                                 | An asset in use was removed                                      | "Layers that used this model now show the plain shape."                                                                              |

`E_MODEL_FETCH` and `E_MODEL_CORS` cannot always be told apart in a browser (a CORS refusal is a
plain network error to script). The element reports `E_MODEL_CORS` when the request failed with
no status and a same-origin probe is not possible, and `E_MODEL_FETCH` otherwise; the app's text
covers both.

---

## 5. What is detected automatically

Nothing in this table is ever asked of the user.

| What                         | How                                                                                                                                                                                                                                                                                                                                                                                                                                             | Fallback when it cannot be told                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Format                       | First bytes: GLB starts `glTF` (0x46546C67) with version 2; glTF is JSON with an `asset.version`; binary STL has length `84 + 50 * triangleCount` read from bytes 80-83; ASCII STL starts `solid` and contains `facet`; PLY starts `ply\n`; OBJ has lines starting `v ` and `f `; zip starts `PK\x03\x04`; FBX starts `Kaydara FBX Binary`; USDZ is a zip holding a `.usdc`/`.usda`; `.babylon` is JSON with `meshes`. Then registered sniffers | The extension; then `E_MODEL_FORMAT_UNKNOWN`             |
| The main file in a set       | Rank order in 3.2                                                                                                                                                                                                                                                                                                                                                                                                                               | `E_MODEL_AMBIGUOUS`                                      |
| Missing companion files      | Diff of references against the set                                                                                                                                                                                                                                                                                                                                                                                                              | `E_MODEL_MISSING_FILE`                                   |
| Decoders needed              | glTF `extensionsRequired` / `extensionsUsed`                                                                                                                                                                                                                                                                                                                                                                                                    | Load only those; `E_MODEL_DECODER_UNAVAILABLE`           |
| Units                        | Irrelevant: every model is fitted to the node                                                                                                                                                                                                                                                                                                                                                                                                   | --                                                       |
| Up axis                      | glTF, GLB: fixed by the spec; STL: Z                                                                                                                                                                                                                                                                                                                                                                                                            | OBJ, PLY: as authored, `W_MODEL_UP_GUESSED`, `up` option |
| Center                       | Bounding box                                                                                                                                                                                                                                                                                                                                                                                                                                    | `center: "origin"`                                       |
| Size                         | Bounding box, fitted to `node.size`                                                                                                                                                                                                                                                                                                                                                                                                             | --                                                       |
| Lighting                     | PBR materials get the bundled environment                                                                                                                                                                                                                                                                                                                                                                                                       | `unlit` option                                           |
| Animations, skeleton, morphs | The loaded container                                                                                                                                                                                                                                                                                                                                                                                                                            | Static rest pose                                         |
| Transparency                 | Material alpha modes                                                                                                                                                                                                                                                                                                                                                                                                                            | --                                                       |
| Cost                         | Triangle count, texture bytes                                                                                                                                                                                                                                                                                                                                                                                                                   | Budget and warnings (8.2)                                |
| License                      | `asset.copyright`, `KHR_xmp_json_ld`                                                                                                                                                                                                                                                                                                                                                                                                            | Recorded as unknown; never invented                      |

---

## 6. Options

`ModelOptions` is set on an asset (`assets.add(..., { defaults })`) or per layer
(`"node.modelOptions"`); a layer's value wins over the asset's default, which wins over the
element's.

```ts
export interface ModelOptions {
    // First layer: what the app shows as plain controls.
    /** Turn the model upright. "y" leaves glTF as is; "z" rotates a Z-up file. Default: detected. */
    up?: "y" | "z" | "-y" | "-z" | "x" | "-x";
    /** Play an animation: false (default), true (the first clip), or a clip name. */
    animation?: boolean | string;
    /** Multiply (true) or replace ("replace") the model's colors with node.color. Default false. */
    tint?: boolean | "replace";

    // Advanced.
    /** Extra rotation after `up`, in degrees about x, y, z. Default [0, 0, 0]. */
    rotation?: [number, number, number];
    /** "contain" (default) keeps proportions; "stretch" fills width, height and depth. */
    fit?: "contain" | "stretch";
    /** "bounds" (default) centers the bounding box on the node; "origin" keeps the file's pivot. */
    center?: "bounds" | "origin";
    animationSpeed?: number; // default 1
    animationPaused?: boolean; // default false
    /** Below this many pixels across, draw node.shape instead. Default 8; 0 never swaps. */
    lodScreenSize?: number;
}
```

`node.unlit` (an existing channel) makes model materials unlit. Element-wide limits and decoder
settings are element configuration, not per-model options:

```ts
graph.config = {
    models: {
        maxBytes: 32 * 1024 * 1024, // per model file or unzipped set
        maxTriangles: 1_000_000, // per model
        maxTextureBytes: 64 * 1024 * 1024, // decoded, per model
        sceneTriangleBudget: 2_000_000,
        maxAnimatedNodes: 64,
        ktx2DecoderUrl: undefined, // where @babylonjs/ktx2decoder is served from, if not bundled
    },
};
```

---

## 7. Storing models in a project file

### 7.1 What exists today

A graphty project file is a JSON container (`kind: "graphty-document"`, see
`design/documents/container.md`) holding up to 64 members of known kinds: style, recipe, data,
notes. It has no member for binary assets; extensions are capped at 64 KB, too small for a model.
The container's trust rule says a document names no address the reader fetches and applying a
style fetches nothing -- so a model a saved style names cannot simply be a URL that opening the
file downloads. Autosave already stores raw bytes and de-duplicates large parts by SHA-256, so
assets fit it as they are.

### 7.2 The three ways to keep a model, compared

| Way                                            | Pros                                                       | Cons                                                                                            |
| ---------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Embed the bytes in the project file            | Opens anywhere, offline, forever; honors the no-fetch rule | Base64 adds a third; a 10 MB model makes a 13 MB file                                           |
| Reference a URL                                | Small file                                                 | Breaks when the site moves; a fetch on open, which the trust rule forbids without consent; CORS |
| A separate asset library (the app's own store) | Shared between projects                                    | The file alone is incomplete; another reader cannot open it                                     |

Recommendation: **embed by default, de-duplicated by hash**, with URL references allowed only
behind an explicit consent on open.

### 7.3 Proposed member: `graphty-assets` (OWNER DECISION: a published format)

```jsonc
{
    "kind": "graphty-assets",
    "version": 1,
    "assets": [
        {
            "id": "asset:rack", // what styles name in "node.model"
            "sha256": "9f2c...e1", // of the decoded bytes; the reader verifies it
            "mediaType": "model/gltf-binary", // version 1: GLB only
            "byteLength": 182344,
            "fileName": "rack.glb", // for display
            "license": { "copyright": "Kenney (CC0)" }, // optional, as read from the file
            "defaults": { "up": "y" }, // optional ModelOptions
            "data": "Z2xURgIAAAA...", // base64 of the GLB
        },
    ],
}
```

Rules:

1. Version 1 stores **GLB only**. A model added as `.gltf` + files, OBJ, STL or PLY is converted
   to GLB when added (Babylon's `GLTF2Export`, bundled in the model chunk), so a reader needs one
   loader and a file never holds a half-set of companion files. The source file is not kept.
   Splats stay out of version 1.
2. One entry per distinct `sha256`; two layers naming the same model share it.
3. Size limits: 32 MB per asset (decoded), 64 MB of assets per document, matching the README's
   64 MB document limit. (The README says 64 MB and `projectFile.ts` defaults to 256 MiB; this
   disagreement should be settled with this decision.)
4. A style naming `asset:<id>` lists `graphty-assets` in the document's `requires` only when the
   model is the style's point; otherwise an older reader skips the member with `W_UNKNOWN_KIND`
   and draws `node.shape`, which is the intended degradation. Recommendation: do not list it.
5. A style naming a URL is saved by fetching the URL and embedding it, so a saved project never
   holds a URL by default. When that fails (CORS, too large), the URL is written and the save
   reports `W_MODEL_NOT_EMBEDDED`. On open, a URL-named model is not fetched unless the caller
   passes `project.open(file, { allowModelUrls: true })`; otherwise the layer draws `node.shape`
   and reports `E_MODEL_URL_BLOCKED { url }`, which the app turns into a "Load models from the web?"
   prompt.
6. Must be checked before release: container.md says a reader keeps members it does not know when
   it saves, but `projectFile.ts` appears only to warn (`W_UNKNOWN_KIND`) and not to write them
   back. If so, an older element opening and saving a file would drop its embedded models.

The alternatives the owner can choose instead: a zip project container (assets as raw files
beside the JSON, no base64 overhead -- a larger change to the container), or no project storage at
all in the first version (models live only in the running session and autosave).

---

## 8. Security and performance budgets

### 8.1 Untrusted files

Every model is treated as hostile input, whether a user dropped it or a project file embedded it.

- **No code.** glTF, OBJ, STL and PLY carry no scripts. Formats that can (`.babylon` scenes may
  name custom shader code, and some loaders run code for extensions) are limited: `.babylon` is
  accepted only through `assets.add` from code, never from a project file, and its
  `ShaderMaterial`s are refused.
- **No network from inside a model.** A model's own references resolve only within its file set
  or `data:` URIs; an absolute URL is `E_MODEL_EXTERNAL_URL`. The only fetch is the one the caller
  asked for.
- **Size bombs.** Byte limits on the download (streamed, cut off), on the unzipped total (checked
  from the zip directory before inflating, and again while inflating), on decoded texture bytes
  (from image headers before decoding), and on triangles (from accessor counts before building
  meshes).
- **Hash.** An embedded asset's bytes are checked against its `sha256` on open; a mismatch is
  `E_MODEL_PARSE { detail: "hash" }`.
- **Decoders** run only from the element's own files, in Babylon's workers.
- **Strings** from the file (names, copyright, clip names) are data; the app escapes them.

### 8.2 Performance budgets

| Measure                      | Comfortable | Warning (`W_MODEL_HEAVY`)             | Refused (`E_MODEL_TOO_LARGE`) |
| ---------------------------- | ----------- | ------------------------------------- | ----------------------------- |
| Triangles per model          | up to 5,000 | over 50,000                           | over 1,000,000                |
| File bytes per model         | up to 1 MB  | over 8 MB                             | over 32 MB                    |
| Decoded texture bytes        | up to 16 MB | over 32 MB                            | over 64 MB                    |
| Drawn triangles in the scene | --          | over 2,000,000 (`W_MODEL_BUDGET`)     | --                            |
| Animated nodes               | --          | over 64 (`W_MODEL_ANIMATION_LIMITED`) | --                            |

Targets for the prototype: a 1,000-node graph of one 2,000-triangle static model holds 60 frames a
second where the same graph of icospheres does; the first model appears within 500 ms of a local
file being dropped; the model chunk is under 400 KB gzipped without the KTX2 decoder.

---

## 9. The graphty app's interface

The app writes words and arranges controls; every fact comes from the element.

1. **Choosing a model for a style layer.** The style layer's shape control (in the Style tab's set
   lines) gains a "Model..." entry beside the built-in shapes. It opens a picker with the
   project's models as thumbnails, the bundled samples, a "Choose file..." button and a drop zone
   that accepts `.glb`, `.gltf` (with its files), `.obj` (with `.mtl` and images), `.stl`, `.ply`,
   `.zip` and a folder. The app hands what was chosen to `session.assets.add` and sets
   `node.model` on the layer.
2. **Dropping on the canvas.** A model file dropped on the canvas with nodes selected adds a layer
   for those nodes (`{ match: "ids" }`); with nothing selected it asks which nodes, offering "all
   nodes" and the layer under the drop.
3. **Three plain controls** under the model choice, shown only when they apply: "Turn upright"
   (cycles `up`; prominent when `W_MODEL_UP_GUESSED`), "Play animation" with a clip menu (when the
   summary lists clips), and "Use node color" (`tint`).
4. **Advanced** (collapsed): rotation, fit, center, animation speed, level of detail, and the
   model summary from `assets.inspect` -- triangles, textures, clips, license.
5. **The asset list** (a Models section of the project panel): every asset with its thumbnail, file
   name, size, license and which layers use it; rename and remove.
6. **Previews.** Thumbnails are rendered by the element on request (`assets.thumbnail(id, { size })`,
   a later work package returning a PNG Blob), so the app never builds its own 3D view.
7. **Errors** are written by the app from section 4's codes, next to the control that caused them,
   with the fix. A layer whose model failed shows a warning badge in the layer list; the graph
   still draws the placeholder shape.

---

## 10. Work packages

In order. Packages 1 to 6 are the prototype.

| #   | Package                                  | Contents                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Dependency and bundling                  | Add `@babylonjs/loaders@8.56.2` and `fflate`; a lazily imported model chunk registering only the glTF, OBJ, STL and PLY plugins; set every CDN-defaulted Babylon URL (Draco, meshopt, validator, loading screen) to the bundled copy or off; bundle PBR shaders; size-budget check; a test that a model load makes no request to an unnamed host                                                                   |
| 2   | Asset intake (`./session`, Babylon-free) | `session.assets` with `add`, `get`, `list`, `remove`, `bytes`; reading URLs, Files, file lists, zips; byte-signature detection; main-file choice; reference and decoder checks; sha256; limits; every `E_` code that can be raised before decoding; Node tests over the sample files and hand-made broken ones                                                                                                     |
| 3   | `node.model` channel and drawing         | The `node.model` and `node.modelOptions` channels in the schema, interner (`mesh` role) and catalog; `ModelCache`; `LoadAssetContainerAsync` with the overridden defaults; merge, fit, center, `up`; placeholder and swap-in; instancing with size as instance scale; bundled environment for model materials; `tint`; picking by bounds; edges by radius; the simple-path example as a test and a Storybook story |
| 4   | Summary and warnings                     | `assets.inspect`, `ModelSummary`, `W_MODEL_HEAVY`, `W_MODEL_HAS_ANIMATIONS`, `W_MODEL_UP_GUESSED`, `W_MODEL_TEXTURE_FAILED`, the `graphty-model-change` event, problems on the layer                                                                                                                                                                                                                               |
| 5   | Samples and docs                         | The bundled CC0 samples below in `graphty-element/assets/models/`, registered as `asset:sample/<name>`; a guide page, "Drawing nodes as models", whose first example is 2.1; visual baselines                                                                                                                                                                                                                      |
| 6   | App, minimal                             | "Model..." in the shape control with samples, file choice and drop; the three plain controls; error text for every code                                                                                                                                                                                                                                                                                            |
| 7   | Project storage                          | `graphty-assets` member, conversion to GLB on add, save and open, URL consent -- only after the OWNER DECISION in 7.3                                                                                                                                                                                                                                                                                              |
| 8   | Budgets and LOD                          | Scene triangle budget, `W_MODEL_BUDGET`, `lodScreenSize`, `MSFT_lod`                                                                                                                                                                                                                                                                                                                                               |
| 9   | Per-node models from data                | `styles.encode({ column, channel: "node.model" })` with a value map                                                                                                                                                                                                                                                                                                                                                |
| 10  | Extension point                          | `registerModelLoader` with `convert`, then `load`                                                                                                                                                                                                                                                                                                                                                                  |
| 11  | Animation                                | Clips on clones up to `maxAnimatedNodes`, then baked vertex animation for instanced skinned models                                                                                                                                                                                                                                                                                                                 |
| 12  | Polish                                   | Thumbnails, 2D impostors, KTX2 as an optional peer, the app's asset list and advanced panel                                                                                                                                                                                                                                                                                                                        |

### Sample models to bundle (all CC0, a few hundred KB in total)

| Name                                   | Source                                                                                                                                | Why                                    | Approximate size |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------- |
| `asset:sample/box`                     | Khronos glTF Sample Assets "Box" (CC0 per its README; confirm)                                                                        | Smallest valid GLB; tests              | 2 KB             |
| `asset:sample/duck`                    | Khronos "Duck" (check its README: older Sony license, use only if CC0-equivalent; else a Kenney animal)                               | Textured, classic test model           | 120 KB           |
| `asset:sample/server`                  | Kenney "Furniture Kit" or "Building Kit" (CC0)                                                                                        | A server-like prop for network graphs  | 20-60 KB         |
| `asset:sample/person`                  | Kenney "Mini Characters" or Quaternius "Ultimate Modular Characters" low-poly (CC0)                                                   | People nodes; has clips for package 11 | 100-200 KB       |
| `asset:sample/tree`                    | Kenney "Nature Kit" (CC0)                                                                                                             | Non-tech example                       | 10-30 KB         |
| `test/fixtures/models/*` (not shipped) | Hand-made: a `.gltf` + `.bin` pair, an OBJ + MTL + PNG, a binary and an ASCII STL, a Draco-compressed GLB, broken and oversized files | Tests of section 4                     | --               |

Each sample's license and source URL go in a `LICENSES.md` beside it, and in its GLB's
`asset.copyright`.

See also: `design/documents/container.md` for the project file container this design extends.
