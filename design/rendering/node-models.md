# Drawing nodes as 3D models

Status: design, revised after developer, architecture, security, performance and user reviews
(section 11 records what was taken and what was not). A prototype is planned (section 10).
Package: graphty-element, plus the graphty app's controls for it (section 9). One part, how a
project file stores a model, is a published file format and is marked OWNER DECISION.

Today every node in graphty-element is one of its built-in shapes: a sphere, a box, a cone, a
polyhedron. This design lets a style layer draw the nodes it matches as a 3D model loaded from a
file instead -- a robot, a server rack, a molecule, a building -- and makes that work for someone
who knows nothing about 3D file formats. The element detects, checks, loads, sizes, lights, caches
and reports on the model; the person only says which nodes and which file.

Contents:

1. What a 3D model file is (the background questions)
2. The graphty-element API
3. The loading pipeline inside the element
4. Errors and warnings
5. What is detected automatically
6. Limits the page sets
7. Storing models in a project file (OWNER DECISION)
8. Security and performance budgets
9. The graphty app's interface
10. Work packages and sample models
11. Review decisions

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

graphty-element version 1 reads **GLB, glTF, OBJ, STL and PLY (triangle meshes)**. Splats are not
triangle meshes, so they cannot be merged, instanced or fitted like the rest; `.babylon` can name
remote node materials, sounds, procedural textures and arbitrary classes, and every tool that
writes it also writes GLB. Both are left out; FBX, USDZ, DAE, 3MF and `.blend` are recognized and
answered with `E_MODEL_FORMAT_UNSUPPORTED`, which tells the reader to export GLB.

### 1.3 Is there one standard package that holds everything?

Yes: **GLB**. It is one binary file holding the glTF 2.0 scene and every buffer and image it
needs. glTF is an open, royalty-free Khronos standard (and ISO/IEC 12113). Its units (meters) and
up axis (+Y) are fixed by the specification, so they never need guessing. It carries geometry, PBR
materials, embedded textures, hierarchy, skeletons, morph targets, animations, cameras and lights,
plus free-form `extras` and license data (`asset.copyright`, or the `KHR_xmp_json_ld` extension).
Every model library listed below offers GLB downloads, and every 3D tool exports it.

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

| Problem                                                  | Why it happens                                                      | What the element does                                                                                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The model is huge or tiny                                | Files mix centimeters, millimeters and meters                       | Fits every model into the same cube a box node of the same `node.size` fills, so units never matter (3.4)                                                 |
| The model sits off to one side of the node               | Its origin is far from its center                                   | Centers the bounding box on the node (3.4)                                                                                                                |
| The model lies on its back                               | Z-up formats (STL, many CAD exports)                                | glTF is converted by the loader; STL is assumed Z up; `node.modelSourceUp` and the app's "Turn upright" control fix the rest                              |
| The model is gray, textures missing                      | A `.gltf` or `.obj` was loaded without its `.bin`, `.mtl` or images | Accepts a `.zip`, a folder or several files together; checks every reference before loading and names the missing file (`E_MODEL_MISSING_FILE`)           |
| The model is black                                       | PBR metal needs an environment light, and the scene has none        | Uses the scene's environment when one is set, else a small bundled neutral one, for model materials only (3.5)                                            |
| The model starts moving on load                          | Babylon plays the first clip by default                             | Animation is off unless asked for (3.6)                                                                                                                   |
| A loading screen covers the graph                        | Babylon's default for every load                                    | Turned off                                                                                                                                                |
| Thousands of nodes load the same file thousands of times | One load per node                                                   | One load per model, every node an instance (3.10)                                                                                                         |
| The frame rate collapses at scale                        | Heavy models times many nodes                                       | Instancing, merged templates, `W_MODEL_HEAVY` and `W_MODEL_BUDGET` (8.2)                                                                                  |
| Edges stop inside or far from the model                  | Edge ends are trimmed for spheres                                   | Model nodes report the radius of their fitted bounding sphere (3.8)                                                                                       |
| A compressed model fails in Safari or offline            | Decoders are fetched from Babylon's CDN                             | Never fetched from a CDN. Version 1 refuses Draco, meshopt and KTX2 files with `E_MODEL_DECODER_UNAVAILABLE`; a later package adds bundled decoders (3.3) |
| `color` does nothing on a textured model                 | The texture is the color                                            | `node.color` applies only with `node.modelTint`, and the element reports `W_MODEL_COLOR_IGNORED` when a color is set and not applied (3.5)                |
| A user's file is hostile                                 | Size, allocation and decompression bombs, external fetches          | Structural checks before decoding, an allowlist of references, and a guard on every request during a load (8.1)                                           |

---

## 2. The graphty-element API

Everything here is additive: new style channels, a new session namespace, new codes, a new event,
new catalog entries. Nothing existing changes meaning, and `ChannelValue` keeps its current type
because every new channel holds a string, number or boolean.

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

`styles.add` resolves when the layer is added, not when the model has loaded. To know when it is
drawn, or why not:

```ts
const record = await graph.session.assets.ready("https://example.com/models/rack.glb");
if (record.state === "rejected") console.warn(record.problems); // [{ code: "E_MODEL_FETCH", params: { url, status: 404 } }]
```

`assets.ready(ref)` takes the same string the layer named (a URL or an asset id). The element also
fires `graphty-model-change` (2.4), whose detail names that string and the layers that use it, and
logs one `console.warn` per failed model carrying its code.

A file the reader chooses or drops works the same way, through one more call:

```ts
const input = document.querySelector("input[type=file]");
const asset = await graph.session.assets.add(input.files); // one .glb, a .gltf with its files, a folder, or a .zip
await graph.session.styles.add({
    name: "My model",
    target: "node",
    selector: { match: "everything" },
    set: { "node.model": asset.id }, // "asset:<sha256>"
});
```

**Color.** A model keeps its own colors. To color it by data, add `"node.modelTint": true` and the
existing `node.color` multiplies the model's base color. When a layer sets a color on a model node
and tint is off, the element reports `W_MODEL_COLOR_IGNORED`, so the color never disappears in
silence.

### 2.2 Per-node models from a data column

Most graphs have a type column: hosts, users and processes; supplier, factory and port. One
encoding draws each kind as its own model:

```ts
await graph.session.styles.encode({
    column: "kind",
    channel: "node.model",
    values: { server: "asset:sample/server", person: "asset:sample/person" },
});
```

This uses the existing `styles.encode` with a value map. Encoded and computed values of
`node.model` may name **asset ids only**, never URLs: a column of URLs would make one request per
node to any host, and an expression could build a URL out of node data and leak it. A URL there
is refused with `E_MODEL_URL_BLOCKED`.

### 2.3 The new style channels

| Channel                    | Value                                                     | Default      | Meaning                                                                                                                       |
| -------------------------- | --------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `node.model`               | string: an asset id or a URL                              | unset        | Draw the node as this model. Unset: draw `node.shape`                                                                         |
| `node.modelSourceUp`       | `"y" \| "z" \| "-y" \| "-z" \| "x" \| "-x" \| "detected"` | `"detected"` | The axis that points up **in the file**. The element turns the model so that axis points up on screen                         |
| `node.modelTurn`           | number, degrees                                           | 0            | A turn about the up axis after `modelSourceUp`, to face the model another way                                                 |
| `node.modelTint`           | `boolean \| "replace"`                                    | false        | true multiplies the model's base color by `node.color`; `"replace"` paints every material in `node.color` (a flat silhouette) |
| `node.modelFit`            | `"contain" \| "stretch"`                                  | `"contain"`  | `"contain"` keeps proportions; `"stretch"` fills `node.width`, `node.height` and `node.depth` separately                      |
| `node.modelCenter`         | `"bounds" \| "origin"`                                    | `"bounds"`   | `"bounds"` centers the bounding box on the node; `"origin"` keeps the file's own pivot                                        |
| `node.modelAnimation`      | `boolean \| string`                                       | false        | false draws the rest pose; true plays the first clip, looped; a string plays that clip (later work package, 3.6)              |
| `node.modelAnimationSpeed` | number                                                    | 1            | Playback speed (later work package)                                                                                           |

Each is an ordinary channel: last writer wins per channel, so a higher layer that turns on tint
keeps a lower layer's up axis, and `encode`, explain and the legend can target each one. Numbers
are range-checked like every other channel (finite, `modelTurn` in -360..360, speed in 0..16), so
a bad value fails that layer's value, not the file it came from.

`node.shape` keeps its meaning and becomes the placeholder while a model loads, the fallback when
it fails, and what a reader older than this feature draws. A separate channel is used rather than
a new `NodeShapes` member because a shape value has nowhere to say which model.

`node.size`, `node.sizeMode`, `node.width`, `node.height` and `node.depth` apply to a model
exactly as to a built-in shape. **Fit, in one sentence:** the model's bounding box is scaled so its
largest extent equals the extent a box node of the same `node.size` and `node.sizeMode` would have
(so under the default `"scale"` mode a size of 1 is 1.5 units across, as for every built-in shape).

The other node channels on a model node:

| Channel                                        | On a model node                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| `node.color`                                   | Applies only with `node.modelTint`; otherwise `W_MODEL_COLOR_IGNORED`          |
| `node.opacity`                                 | Applies to every material (makes the model transparent, with the sorting cost) |
| `node.unlit`                                   | Makes every material of the model unlit                                        |
| `node.wireframe`                               | Applies to every material                                                      |
| `node.label*`, `node.tooltip*`, `node.marker`  | As on any node, placed against the fitted bounds                               |
| `node.halo*`, `node.glow*`, `node.outline`     | As on any node; halos use the fitted bounding sphere                           |
| `node.border*`, `node.cornerRadius`            | Ignored: they describe a built-in shape's geometry                             |
| `node.flat`, `node.planar`                     | `node.planar` flattens the model like a planar node; `node.flat` is ignored    |
| `node.drawOrder`, `node.zIndex`, `node.groups` | As on any node                                                                 |

```ts
/** An asset id: "asset:<sha256>", "asset:<name>" or "asset:sample/<name>". */
export type AssetId = `asset:${string}`;
export function isAssetId(value: string): value is AssetId;
```

`node.model` holds an `AssetId` or a URL. Who may use a URL is in 2.6.

### 2.4 The advanced path: `session.assets`

`session.assets` is the session's library of binary assets -- models now, node images (#295)
later. It lives in `./session` and is free of Babylon.js and the DOM: intake, checks and the
summary all read bytes and JSON. Only drawing needs Babylon.

```ts
export interface AssetsApi {
    /** Add one model. Resolves once the files are checked: state "accepted" or "rejected". */
    add(source: AssetSource, options?: AddAssetOptions): Promise<AssetRecord>;
    /** Resolve when the asset a layer names (an id or a URL) has settled; fetches a URL if needed. */
    ready(ref: string, options?: { signal?: AbortSignal }): Promise<AssetRecord>;
    get(id: AssetId): AssetRecord | undefined;
    list(): readonly AssetRecord[];
    /** What the model holds, read from its files without drawing it. */
    inspect(id: AssetId): ModelSummary;
    /** Remove an asset; layers that name it fall back to node.shape and report W_MODEL_REMOVED. */
    remove(id: AssetId): void;
    /** The stored files, exactly as given. */
    files(id: AssetId): ReadonlyMap<string, Uint8Array>;
    /** Lower or raise the limits of section 6. Code only; a document never calls this. */
    setLimits(limits: Partial<ModelLimits>): void;
    /** Let layers that did not come from code fetch models from these hosts (2.6). Code only. */
    allowHosts(hosts: readonly string[]): void;
}

type NamedBlob = Blob & { readonly name: string; readonly webkitRelativePath?: string };

export type AssetSource =
    | string // a URL
    | NamedBlob // a File
    | Iterable<NamedBlob>
    | ArrayLike<NamedBlob> // a FileList, structurally; no DOM type in ./session
    | ArrayBuffer
    | Uint8Array
    | { files: ReadonlyMap<string, Blob | Uint8Array>; main?: string };

export interface AddAssetOptions {
    /** A friendly id: "asset:rack". Default: "asset:" + the digest of the file set. */
    name?: AssetId;
    /** The main file of a set, when the element cannot tell (E_MODEL_AMBIGUOUS). */
    main?: string;
    /** Force a format when bytes are ambiguous. Default: detected (section 5). */
    format?: ModelFormat;
    signal?: AbortSignal;
}

/** A loader id from the catalog. The element's own are BuiltInModelFormat; extensions add more. */
export type ModelFormat = string;
export type BuiltInModelFormat = "glb" | "gltf" | "obj" | "stl" | "ply";

export interface AssetRecord {
    readonly id: AssetId;
    readonly kind: "model";
    readonly sha256: string; // digest of the file set (3.1)
    readonly byteLength: number;
    readonly format: ModelFormat;
    readonly fileName?: string; // the main file's name, cut to 256 characters
    /** What the file claims (asset.copyright); never verified, never guessed. */
    readonly claimedLicense?: { copyright?: string };
    readonly state: "pending" | "accepted" | "rejected";
    readonly problems: readonly CodedFact[]; // section 4
}

export interface ModelSummary {
    readonly format: ModelFormat;
    readonly triangles: number; // counted per use: a mesh used by 3 scene nodes counts 3 times
    readonly meshes: number;
    readonly materials: readonly string[]; // material names, cut to 256 characters
    readonly textures: number;
    readonly textureBytes: number; // decoded, as w * h * 4 * 4/3 (RGBA with mipmaps)
    readonly bounds?: { min: [number, number, number]; max: [number, number, number] }; // as authored
    readonly upAxis: "y" | "z" | "unknown";
    readonly animations: readonly { name: string; seconds: number }[];
    readonly skinned: boolean;
    readonly morphTargets: number;
    readonly transparent: boolean;
    readonly extensionsRequired: readonly string[]; // glTF only
}
```

Rules that matter to a caller:

- **Ids.** An unnamed asset's id is `"asset:" + sha256`, where the digest covers the sorted file
  names and contents of the set as given. The same files always get the same id, in any version.
  Adding a name already held by different files is rejected with `E_MODEL_NAME_TAKEN`; the
  prefix `asset:sample/` is reserved for the element's samples.
- **Files.** A folder's files are keyed by `webkitRelativePath` (or the keys of the `files` map),
  relative to the folder holding the main file; references inside the model resolve against those
  paths. Two entries that differ only in case are `E_MODEL_ZIP { reason: "duplicate" }` for a zip
  and `E_MODEL_AMBIGUOUS` for a folder.
- **A URL in `node.model`** is shorthand for `assets.ready(url)` plus naming the result: the
  element fetches it once and keeps the bytes under the URL, so the same URL in two layers loads
  once.
- **Assets are not commands.** Adding or removing one is not journaled, undone or recorded in a
  recipe; undoing a layer leaves its asset in place. That keeps megabytes out of the history.
- **Samples** are listed by `session.catalog.models()`: `{ id: "asset:sample/server", plainName,
thumbnail }` per sample, where `thumbnail` is a URL of a PNG shipped beside the model. They are
  resolved from the package, never stored in the session.

`detectModelFormat({ filename?, head? })` in `./catalog`, beside the existing `detectFormat`,
answers "is this a model file, and which kind" from a name and the first bytes. Every drop target
in an application calls it before treating a file as graph data, instead of sniffing bytes itself.

### 2.5 Events

One event on the element, with a typed detail exported as `GraphtyModelChangeDetail`, in the
element's event map and mirrored as `"model:changed"` in `SessionEventMap` for code that uses
`./session` without the element:

| Event                  | `detail`                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `graphty-model-change` | `{ ref: string, id?: AssetId, layerIds: LayerId[], state: "pending" \| "accepted" \| "drawn" \| "rejected" \| "failed", problems: CodedFact[] }` |

`ref` is what the layer named (the URL or the id), so a failure maps back to what the developer
wrote. `accepted` means the files passed intake; `drawn` means the scene shows it; `rejected` is an
intake failure and `failed` a drawing failure. The event fires once per asset, never once per node.

### 2.6 Who may make the element fetch a URL

A `node.model` URL is fetched only when the layer was added by a direct call to
`session.styles.add` (or `update`) from the page's code. The element records that on the layer
internally; a layer from any other origin carries a URL but does not fetch it, draws `node.shape`
and reports `E_MODEL_URL_BLOCKED { hosts }`:

- a layer opened from a project file or imported from a style file;
- a layer written by the AI style commands (`src/ai/commands/StyleCommands.ts`), a template or
  suggested styles;
- a value produced by an encoding or an expression (2.2).

The page's code may lift the block per host: `session.assets.allowHosts(["models.example.com"])`.
Even then, private, loopback and link-local addresses are refused for a layer that did not come
from code, and previews and thumbnails never fetch. Every model fetch is `credentials: "omit"`,
`referrerPolicy: "no-referrer"`, has a time limit, follows at most 5 redirects, and refuses URLs
holding a user name and password. In problems and events a URL appears without its query string.

### 2.7 The extension point: `registerModelLoader` (later work package)

For a format graphty does not read (FBX through a converter, a molecule drawn as balls and sticks,
a CAD format), an author registers a loader from `./extend`:

```ts
import { registerModelLoader } from "@graphty/graphty-element/extend";

registerModelLoader({
    descriptor: { id: "pdb-ball-and-stick", plainName: "PDB molecule", extensions: [".pdb"] },
    // Return plain triangles; the element builds, checks, fits, caches and instances them.
    convert: async (files: ModelFiles, { signal }) => {
        const atoms = parsePdb(await files.main.text());
        return { positions: atomSpheres(atoms), indices: sphereIndices(atoms) }; // Float32Array, Uint32Array
    },
});

interface ModelFiles {
    readonly main: { name: string; bytes: Uint8Array; text(): Promise<string> };
    readonly all: ReadonlyMap<string, Uint8Array>;
}
```

`convert` returns a plain mesh `{ positions, indices, normals?, colors? }` (no GLB encoder to write)
or GLB bytes; either goes through the same reference, limit and structure checks as any file. An
optional `sniff(head)` receives a copy of the first 1 KB. Registration is global, like every other
`./extend` registry, because a format is a fact about files, not about one graph. Registering an
id or extension the element reads itself is refused. A `load(files, scene)` path for formats that
lose something in conversion comes later; until it exists, the built-in formats do not go through
this function and there is no parity claim.

---

## 3. The loading pipeline inside the element

```
source (URL | File | files | bytes)
  -> read bytes (fetch / Blob.arrayBuffer), limits while streaming  -> E_MODEL_FETCH, E_MODEL_TOO_LARGE
  -> unpack (.zip -> named files, streaming)                         -> E_MODEL_ZIP
  -> pick the main file, detect its format by bytes                  -> E_MODEL_FORMAT_*, E_MODEL_AMBIGUOUS
  -> check references against the file set (allowlist)               -> E_MODEL_MISSING_FILE, E_MODEL_EXTERNAL_URL
  -> check structure and counts (glTF JSON, OBJ/STL/PLY scan)        -> E_MODEL_STRUCTURE, E_MODEL_TOO_LARGE
  -> check required decoders                                         -> E_MODEL_DECODER_UNAVAILABLE
  -> digest, store, summary (AssetRecord "accepted")                 [Babylon-free up to here: ./session]
  -> lazy import of the model chunk                                  [Babylon from here on]
  -> LoadAssetContainerAsync with every request guarded              -> E_MODEL_PARSE, E_MODEL_EXTERNAL_URL
  -> prepare the template (bake, group, fit, materials, compile)
  -> ModelCache entry; one coalesced repaint per frame ("drawn")
```

### 3.1 Read

- A URL (allowed by 2.6) is fetched with `{ mode: "cors", credentials: "omit", referrerPolicy:
"no-referrer", signal }` plus `AbortSignal.timeout` (default 30 s). A response over the byte
  limit is cut off as it streams.
- A `File` or `Blob` is read with `arrayBuffer()`.
- A `.zip` (bytes `PK\x03\x04`) is unpacked with fflate's streaming `Unzip`, counting the real
  output bytes rather than trusting the sizes the header declares, with at most 1,024 entries,
  names of at most 512 characters, a per-entry compression ratio cap of 100, `__MACOSX/` skipped
  and no zip inside a zip.
- Several files become one map of path to bytes (2.4, "Files"). The digest is sha256 over the
  sorted `(path, bytes)` pairs. `crypto.subtle` exists only on secure pages; elsewhere a bundled
  SHA-256 is used, never skipped.
- Every `blob:` URL made for a load is revoked when the load finishes.

### 3.2 Pick the main file and detect the format

Detection reads bytes first and uses the extension only to break ties (section 5). In a set of
files, candidates are ranked `.glb`, `.gltf`, `.obj`, `.stl`, `.ply`, then registered formats.
When the same base name appears in several formats (a kit with `rack.glb`, `rack.obj`,
`rack.fbx`), only the best-ranked one is a candidate. Two different candidates of the same rank is
`E_MODEL_AMBIGUOUS { candidates }`, which the caller settles with `main`.

### 3.3 References, structure and decoders, before anything is decoded

**References are an allowlist.** A reference (`buffers[].uri`, `images[].uri`, `mtllib`, the file
name in a `map_*` line after its option flags) is valid only if, after percent-decoding once and
normalizing the path, it is a key in the file set, or a `data:` URL whose media type is an image
or `application/octet-stream`. Everything else -- `http(s):`, `//host`, `blob:`, `file:`, paths
that leave the set with `..` -- is `E_MODEL_EXTERNAL_URL { url }`. A missing key is
`E_MODEL_MISSING_FILE { name, referencedBy }`.

**A second guard that does not depend on parsing.** For the length of each load, every request
Babylon makes passes one hook (the glTF loader's `preprocessUrlAsync` and Babylon's global URL
preprocessing, which also catches the OBJ loader's material and image loads). Any URL that is not
one of the `blob:` URLs made for this load throws `E_MODEL_EXTERNAL_URL`. Loads use a root URL
that cannot resolve against the page, so a reference the checker missed never becomes a
same-origin request carrying the reader's cookies. OBJ `mtllib` and `map_*` lines are also
rewritten to those `blob:` URLs before loading, since the OBJ loader has no per-load hook.

**glTF structure** is checked from the JSON (the same rules the project container applies to its
own JSON: no `__proto__` key, no duplicate key, at most 64 levels deep):

- every index in range; the scene nodes form a tree (no cycle, no second parent), at most 64 deep;
- every accessor's `count x element size` fits inside its buffer view; the sum over all accessors,
  sparse ones included, is under the decoded-bytes limit;
- triangles are counted per use: each scene node that uses a mesh adds that mesh's triangles;
  `EXT_mesh_gpu_instancing` is refused in version 1;
- caps on the number of nodes (10,000), meshes (1,000), materials (64), textures (64), animations
  (64), morph targets per mesh (64) and joints (256), so a file cannot stall the main thread on
  shader compiles or hierarchy work;
- image sizes are read from PNG, JPEG and WebP headers (inside buffer views and `data:` URLs too),
  counted as `w x h x 4 x 4/3`, and refused above the GPU's `maxTextureSize`.

A failure is `E_MODEL_STRUCTURE { rule }` or `E_MODEL_TOO_LARGE { what, found, limit }`.

**OBJ, STL and PLY** are scanned cheaply: OBJ counts `f` lines against the triangle limit and
checks every face index is in range (no negative or huge ones beyond the vertex count); binary
STL's declared triangle count must match its length; a PLY header's vertex and face counts must
fit the file's length. Text formats have a lower byte limit (8 MB) because they parse on the main
thread.

**Decoders.** A glTF's `extensionsRequired` names what it needs. Version 1 bundles no decoder:
`KHR_draco_mesh_compression`, `EXT_meshopt_compression` and `KHR_texture_basisu` are
`E_MODEL_DECODER_UNAVAILABLE { extension, package }`. A later package adds them with the bounds
they need (8.1): KTX2 through `@babylonjs/ktx2decoder` as an optional peer dependency the element
imports itself, Draco and meshopt as lazily loaded chunks with their declared output checked
before decoding. No decoder is ever fetched from cdn.babylonjs.com.

### 3.4 Load and normalize

- The model chunk (`@babylonjs/loaders` 8.56.2, matching core, with only the glTF, OBJ, STL and
  PLY plugins registered from their own modules) is behind one dynamic `import()`, so the main
  entry's size does not change and a page that never draws a model never downloads it. `./bundle`
  inlines dynamic imports, so its budget grows by the chunk's size; that change is stated in work
  package 1.
- `LoadAssetContainerAsync` loads the model without adding it to the scene, with
  `SceneLoaderFlags.ShowLoadingScreen = false`, `gltf.animationStartMode = NONE`,
  `gltf.validate = false` (the validator is a CDN fetch; the structure checks above replace it),
  `gltf.alwaysComputeBoundingBox = true`. The file's cameras and lights are discarded.
- **Up axis.** glTF and GLB need nothing: the loader's `__root__` node already converts glTF's +Y
  up into Babylon's frame. For the rest, `node.modelSourceUp: "detected"` means: STL is Z up, OBJ
  and PLY are Y up (Blender's OBJ exporter writes Y up by default). STL and PLY report
  `W_MODEL_UP_GUESSED`; OBJ does not, because its guess is usually right.
- **Fit.** The template is measured with `getHierarchyBoundingVectors` in its rest pose,
  recentered on its bounding-box center (unless `node.modelCenter: "origin"`), and scaled so its
  largest extent is 1. Each instance is then scaled by `node.size x extentPerSize(sizeMode)`, the
  same factor a built-in shape uses, so a model and an icosphere of the same size are the same
  width. `node.modelFit: "stretch"` fills width, height and depth separately, as `fitNodeMesh`
  already does for shapes.

### 3.5 Materials and lighting

- glTF materials load as `PBRMaterial`, and PBR needs an environment to reflect. If the scene has
  an `environmentTexture`, model materials use it; otherwise the element assigns a small bundled
  neutral prefiltered `.env` as their reflection texture. The scene's own environment and the
  built-in shapes never change. Never `createDefaultEnvironment()`, which fetches from
  assets.babylonjs.com.
- PBR shaders are bundled in the model chunk, as `bundledStandardShaders` does for
  StandardMaterial, because Safari has failed Babylon's lazy shader fetch before.
- Before swap-in, each material is compiled with `forceCompilationAsync(template, { useInstances:
true })` (with the instanced color define when tint is on), then frozen, so neither a compile
  stall at first draw nor a per-frame readiness check hits the graph.
- **Color.** By default the model keeps its materials. `node.modelTint: true` multiplies the base
  color by the node's color through the instanced color buffer; `"replace"` uses a flat material.
  `Node.applyInstanceColor` must register and write the color buffer on a model template only
  when tint is on, or every untinted model would pick up the node color anyway. A color set on a
  model node with tint off reports `W_MODEL_COLOR_IGNORED { layerIds }`.
- **Transparency.** `alphaMode: MASK` parts draw with alpha test. `BLEND` parts are kept in their
  own group (3.10) and drawn after opaque nodes; past 100 blended instances the element reports
  `W_MODEL_TRANSPARENT { nodes }`, because Babylon sorts per source mesh, not per instance.
- Highlight, selection outline, glow and halo work as on any node, against the template groups or
  the fitted bounding sphere, whichever the effect already uses for a polyhedron.

### 3.6 Animations (later work package)

Off by default, as a static node is what a graph means and it keeps every model on the instanced
fast path; Babylon's own default is to play, which the element overrides. `node.modelAnimation:
true` plays the first clip, a string plays that clip (`W_MODEL_ANIMATION_UNKNOWN { name,
available }` when absent). Clips are listed in `ModelSummary.animations`. The prototype draws the
rest pose and reports `W_MODEL_HAS_ANIMATIONS { clips }` when clips exist.

### 3.7 Skeletons and morph targets

Instancing shares one mesh among many nodes; a skinned or morphed mesh cannot be shared while it
animates. With animation off -- the default and the only mode in the prototype -- the template
bakes the rest pose into the vertices and drops the skeleton and morph manager (`skeleton = null`,
`morphTargetManager = null`), so instances bind no bone or morph textures.

When animation lands: one unmerged, never-instanced clone per animated node up to
`maxAnimatedNodes` (default 64, counted together with its materials against a draw-call budget),
bounds padded once so culling does not pop, the rest in rest pose with
`W_MODEL_ANIMATION_LIMITED { limit, nodes }`; later, baked vertex animation lets every node be an
instance again.

### 3.8 Picking, edges, labels and halos

- **Picking** of a model instance is by its bounding box only, never by triangles: `scene.pick`
  would otherwise test every triangle of every candidate on each pointer move. A click on empty
  space inside the box of a hollow model still picks the node.
- **Edges** stop at the fitted bounding sphere (`measureRoundRadius` returns its radius). A long
  thin model shows a gap at its ends; exact trimming against the model's triangles is a later
  option.
- **Labels** are placed against the fitted bounds. **Halos and selection rings** use the fitted
  bounding sphere.
- Sizes compare reliably within one model; the guide says so for encodings that span models.

### 3.9 2D mode

In a 2D view the model is drawn from the 2D camera (front view), fitted the same way, and
flattened only if `node.planar` is set. Rendering each model once to a sprite for 2D and far
nodes is a later package.

### 3.10 Caching and instancing

- A per-scene `ModelCache`, separate from `MeshCache`, keyed by the asset id plus the options that
  change geometry (`modelSourceUp`, `modelTurn`, `modelFit`, `modelCenter`, and `modelTint` only
  when it is `"replace"`). Tint on or off is per instance and not in the key.
- Entries are reference-counted by the layers that name them. At zero, the GPU template is
  disposed after 10 repaints, whether or not the asset is still in `session.assets`; the bytes stay
  there, and preparing again is cheap next to a lost WebGL context.
- **Template.** Every part's transform is baked; parts are grouped by vertex-attribute signature
  (which of uv, uv2, color, tangent they carry), material and blend mode, and merged within each
  group, because `Mesh.MergeMeshes` needs matching attributes. A cache entry is a small array of
  meshes; every node gets one `InstancedMesh` per group, scaled by its size, so a size driven by
  data makes no copies. Draw calls grow with the number of groups, not the number of nodes.
- **Swap-in.** Until the model is drawable the node draws `node.shape`. Finished loads are
  coalesced into one repaint per frame, and only edges whose node radius changed are re-measured.
  A failure leaves the placeholder and reports once per asset.
- At most two models load at a time.

### 3.11 Scene budgets and level of detail

- The element never chooses for the reader which nodes get the model. When `triangles x nodes`
  passes the scene budget (default 2 million) it draws every node and reports `W_MODEL_BUDGET {
nodes, triangles, budget }`; an application decides what to do.
- Level of detail (a later package) is an opt-in channel, default off. When it lands, the switch
  distance is derived from the budget with hysteresis, Babylon chooses the level per instance, and
  every level mesh registers the same instanced color buffer.

---

## 4. Errors and warnings

Every problem is a `CodedFact` `{ code, params }`, never a sentence. `E_` means the model is not
drawn (the node keeps its placeholder); `W_` means it is drawn but something is worth saying. Every
string param from a file (names, clip names) is cut to 256 characters.

| Code                          | params                                                                                                                               | When                                                                          | What the graphty app says (example)                                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_MODEL_FETCH`               | `url` (no query), `status: number \| null`, `offline: boolean`                                                                       | The URL answered with an error, or not at all (offline, CORS, DNS look alike) | "Could not download rack.glb (404)." / with no status: "The server did not answer or does not share its files with other sites. Download the model and drop it here." |
| `E_MODEL_URL_BLOCKED`         | `hosts`, `layerIds`                                                                                                                  | A layer not added by code names a URL (2.6)                                   | "This style loads a model from models.example.com. Load models from that site?"                                                                                       |
| `E_MODEL_TOO_LARGE`           | `what: "bytes" \| "unzipped" \| "triangles" \| "textureBytes" \| "decodedBytes" \| "sceneTextureBytes" \| "count"`, `found`, `limit` | Over a limit in section 6                                                     | "This model has 4.2 million triangles; the limit is 1 million. Pick a lighter one."                                                                                   |
| `E_MODEL_STRUCTURE`           | `rule: "index" \| "cycle" \| "depth" \| "accessor" \| "json" \| "instancing"`                                                        | The glTF's structure is unsafe or broken                                      | "The file is damaged."                                                                                                                                                |
| `E_MODEL_FORMAT_UNSUPPORTED`  | `format`, `fileName`                                                                                                                 | Recognized but not loadable (FBX, USDZ, DAE, .blend, 3MF, splats, .babylon)   | "FBX files cannot be loaded yet. Export as GLB from your 3D program."                                                                                                 |
| `E_MODEL_FORMAT_UNKNOWN`      | `fileName`                                                                                                                           | No format matches the bytes                                                   | "This is not a 3D model file graphty knows."                                                                                                                          |
| `E_MODEL_AMBIGUOUS`           | `candidates`                                                                                                                         | Two different main files in one set                                           | "Which one is the model?" with the list                                                                                                                               |
| `E_MODEL_MISSING_FILE`        | `name`, `referencedBy`                                                                                                               | A `.bin`, texture or `.mtl` is not in the set                                 | "robot.gltf needs robot.bin. Drop the whole folder or a .zip, or export as .glb."                                                                                     |
| `E_MODEL_EXTERNAL_URL`        | `url`                                                                                                                                | A reference outside the file set                                              | "This model loads parts from somewhere else, which is not allowed. Export it as .glb."                                                                                |
| `E_MODEL_DECODER_UNAVAILABLE` | `extension`, `package`                                                                                                               | Draco, meshopt or KTX2 compression, and no decoder                            | "This model is compressed in a way this page cannot read yet."                                                                                                        |
| `E_MODEL_PARSE`               | `format`                                                                                                                             | Babylon could not read a file that passed the checks                          | "The file is damaged or not a valid GLB."                                                                                                                             |
| `E_MODEL_ZIP`                 | `reason: "corrupt" \| "encrypted" \| "empty" \| "duplicate" \| "ratio" \| "entries" \| "nested"`                                     | The zip cannot be read safely                                                 | "The .zip could not be opened."                                                                                                                                       |
| `E_MODEL_NAME_TAKEN`          | `id`                                                                                                                                 | A name already held by different files, or a reserved `asset:sample/` name    | "A different model is already called rack."                                                                                                                           |
| `E_MODEL_DIGEST_MISMATCH`     | `id`                                                                                                                                 | Stored bytes do not match their digest (project files, 7.3)                   | "The model in this file is damaged."                                                                                                                                  |
| `E_MODEL_UNKNOWN_ASSET`       | `id`                                                                                                                                 | A layer names an asset the session does not hold, after loading has settled   | "This style needs a model that is not here. Find rack.glb..." (adding the same file gives the same id and fixes it)                                                   |
| `W_MODEL_COLOR_IGNORED`       | `layerIds`                                                                                                                           | A color reaches a model node with tint off                                    | Show "Use node color" next to the model choice                                                                                                                        |
| `W_MODEL_HEAVY`               | `triangles`, `materials`, `nodes`                                                                                                    | Over the comfortable size (8.2)                                               | "This model is detailed; with 800 nodes the graph may be slow."                                                                                                       |
| `W_MODEL_BUDGET`              | `nodes`, `triangles`, `budget`                                                                                                       | Triangles across the scene pass the budget                                    | "The graph draws 3 million triangles and may be slow."                                                                                                                |
| `W_MODEL_TEXTURES_REDUCED`    | `from`, `to`                                                                                                                         | Textures above `maxTextureSize` were drawn smaller                            | (usually nothing)                                                                                                                                                     |
| `W_MODEL_TRANSPARENT`         | `nodes`                                                                                                                              | Many blended instances may sort wrongly                                       | "See-through parts may look wrong where models overlap."                                                                                                              |
| `W_MODEL_HAS_ANIMATIONS`      | `clips`                                                                                                                              | Clips exist and animation is off                                              | Offer a "Play animation" control (later)                                                                                                                              |
| `W_MODEL_TEXTURE_FAILED`      | `name`                                                                                                                               | One texture could not be decoded; the rest of the model is drawn              | "One texture (bark.png) could not be read; the model shows without it."                                                                                               |
| `W_MODEL_UP_GUESSED`          | `format`, `up`                                                                                                                       | STL or PLY: the up axis is a guess                                            | Show the "Turn upright" control near the model                                                                                                                        |
| `W_MODEL_REMOVED`             | `id`, `layerIds`                                                                                                                     | An asset in use was removed                                                   | "Layers that used this model now show the plain shape."                                                                                                               |
| `W_MODEL_NOT_EMBEDDED`        | `ref`, `layerIds`                                                                                                                    | A project was saved naming a URL that never loaded (7.3)                      | "This project names a model on the web; others may not be able to open it."                                                                                           |

Later packages add `W_MODEL_ANIMATION_UNKNOWN`, `W_MODEL_ANIMATION_LIMITED` (3.6, 3.7) and
`E_MODEL_CRASHED_LAST_TIME` (7.3).

---

## 5. What is detected automatically

Nothing in this table is ever asked of the user.

| What                    | How                                                                                                                                                                                                                                                                                                                                                                                                           | Fallback when it cannot be told                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Format                  | First bytes: GLB starts `glTF` (0x46546C67) with version 2; glTF is JSON with an `asset.version`; binary STL has length `84 + 50 * triangleCount` read from bytes 80-83; ASCII STL starts `solid` and contains `facet`; PLY starts `ply\n`; OBJ has lines starting `v ` and `f `; zip starts `PK\x03\x04`; FBX starts `Kaydara FBX Binary`; USDZ is a zip holding a `.usdc`/`.usda`. Then registered sniffers | The extension; then `E_MODEL_FORMAT_UNKNOWN`                  |
| Model or graph data     | `detectModelFormat` in `./catalog` (2.4)                                                                                                                                                                                                                                                                                                                                                                      | Treated as graph data                                         |
| The main file in a set  | Rank order and same-name de-duplication (3.2)                                                                                                                                                                                                                                                                                                                                                                 | `E_MODEL_AMBIGUOUS`                                           |
| Missing companion files | References checked against the set                                                                                                                                                                                                                                                                                                                                                                            | `E_MODEL_MISSING_FILE`                                        |
| Decoders needed         | glTF `extensionsRequired`                                                                                                                                                                                                                                                                                                                                                                                     | `E_MODEL_DECODER_UNAVAILABLE`                                 |
| Units                   | Irrelevant: every model is fitted to the node                                                                                                                                                                                                                                                                                                                                                                 | --                                                            |
| Up axis                 | glTF, GLB: fixed by the spec; STL: Z; OBJ: Y                                                                                                                                                                                                                                                                                                                                                                  | PLY and STL report `W_MODEL_UP_GUESSED`; `node.modelSourceUp` |
| Center, size            | Bounding box, fitted like a box node of the same size                                                                                                                                                                                                                                                                                                                                                         | `node.modelCenter`, `node.modelFit`                           |
| Lighting                | The scene's environment, else the bundled one                                                                                                                                                                                                                                                                                                                                                                 | `node.unlit`                                                  |
| Animations, skeleton    | The glTF JSON                                                                                                                                                                                                                                                                                                                                                                                                 | Static rest pose                                              |
| Transparency            | Material alpha modes                                                                                                                                                                                                                                                                                                                                                                                          | --                                                            |
| Cost                    | Triangles per use, materials, texture bytes                                                                                                                                                                                                                                                                                                                                                                   | Warnings (8.2)                                                |
| License                 | `asset.copyright`                                                                                                                                                                                                                                                                                                                                                                                             | Recorded as unknown; never invented                           |

---

## 6. Limits the page sets

Drawing choices are style channels (2.3). Limits are a separate thing: they protect the tab, so
only the page's code sets them, through `session.assets.setLimits(...)`. They are never part of
project config, never saved, and a document can never raise them.

```ts
export interface ModelLimits {
    maxBytes: number; // per model file or unzipped set; default 32 MB (8 MB for OBJ, STL and PLY text)
    maxTriangles: number; // per model, counted per use; default 1,000,000
    maxTextureBytes: number; // decoded, per model; default 64 MB
    maxTextureSize: number; // pixels per side; larger textures are drawn smaller; default 2048 (1024 on iOS)
    sceneTextureBytes: number; // decoded, all models together; default 256 MB (128 MB on iOS)
    sessionBytes: number; // stored asset bytes in the session; default 256 MB
    sceneTriangleBudget: number; // W_MODEL_BUDGET only; default 2,000,000
    fetchTimeoutMs: number; // default 30,000
}
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

| Way                                            | Pros                                                       | Cons                                                                                                    |
| ---------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Embed the bytes in the project file            | Opens anywhere, offline, forever; honors the no-fetch rule | Base64 adds a third; a 64 MB section is an 85 MB JSON string, which iOS parses with a peak near 3x that |
| Reference a URL                                | Small file                                                 | Breaks when the site moves; a fetch on open, which the trust rule forbids without consent; CORS         |
| A separate asset library (the app's own store) | Shared between projects                                    | The file alone is incomplete; another reader cannot open it                                             |

### 7.3 Proposed member: `graphty-assets` (OWNER DECISION: a published format)

The prototype keeps models in the running session only; nothing below is built until the owner
chooses. The recommendation is to **embed the source file set as given**, de-duplicated by digest:

```jsonc
{
    "kind": "graphty-assets",
    "version": 1,
    "assets": [
        {
            "id": "asset:rack", // what styles name in "node.model"
            "sha256": "9f2c...e1", // digest of the file set (3.1); the reader verifies it
            "format": "glb",
            "main": "rack.glb",
            "source": "https://example.com/models/rack.glb", // optional: the URL a layer named
            "files": [
                {
                    "path": "rack.glb",
                    "mediaType": "model/gltf-binary",
                    "byteLength": 182344,
                    "data": "Z2xURgIAAAA...",
                },
            ],
        },
    ],
}
```

Rules:

1. Files are stored exactly as added, so ids are stable across versions and nothing is lost to
   conversion. Version 1 may restrict itself to GLB and keep other formats session-only with a
   `W_` code, if the owner prefers one loader for readers.
2. One entry per distinct digest; samples (`asset:sample/*`) are never embedded, since every
   reader ships them.
3. Size: 64 MB of assets per document, settling the 64 MB in the README against the 256 MiB
   default in `projectFile.ts`. Each asset's base64 length is checked before decoding, and assets
   are decoded one at a time.
4. The assets member is applied first, whatever its position in `members`; a layer naming an id
   not yet held is `pending`, and `E_MODEL_UNKNOWN_ASSET` is reported only once loading settles.
5. Saving embeds the bytes the session already holds; a layer that named a URL keeps it, and the
   entry's `source` lets a reader resolve the URL with no fetch. Only a URL that never loaded is
   written bare, with `W_MODEL_NOT_EMBEDDED`. On open, such a URL is blocked (2.6) until the page
   allows its host; private addresses stay blocked.
6. Same id with a different digest on open is `E_MODEL_NAME_TAKEN` for the incoming asset; it is
   never a silent replacement.
7. Autosave writes a "loading" marker before decoding a stored asset; if the marker is still there
   at the next start, that asset is not drawn automatically and reports
   `E_MODEL_CRASHED_LAST_TIME`, so a model that crashes the tab cannot lock the reader out.
8. Must be checked before release: container.md says a reader keeps members it does not know when
   it saves, but `projectFile.ts` appears only to warn (`W_UNKNOWN_KIND`). If so, an older element
   opening and saving a file would drop its embedded models.

The alternatives: a zip project container (assets as raw files beside the JSON, no base64 and no
giant string -- a larger change to the container, and kinder to iOS memory), or models that live
only in the running session and autosave.

---

## 8. Security and performance budgets

### 8.1 Untrusted files

Every model is hostile input, whether a user dropped it or a project file embedded it.

- **No code.** Only glTF, OBJ, STL and PLY are read; none carries scripts or shaders.
- **No network from inside a model.** An allowlist of references, a request guard during the load,
  and a root URL that cannot resolve against the page (3.3).
- **No network from a document, data or the AI.** Only layers added by code fetch URLs (2.6).
- **Allocation bombs.** glTF structure, accessor and count checks before Babylon sees the file;
  per-use triangle counting; OBJ, STL and PLY scans (3.3).
- **Decompression bombs.** Streaming unzip with real byte counts and ratio caps (3.1); image
  sizes from headers; no decoders in version 1. When decoders are added: declared Draco and
  meshopt output checked against the limits before decoding and the decoded output against the
  declaration after; one Draco worker with a time limit, terminated when it runs over; KTX2 sized
  from its header levels as RGBA.
- **Memory over time.** Per-session byte cap, per-scene texture cap, reference-counted GPU
  templates, two loads at a time, `blob:` URLs revoked.
- **Strings** from the file are data, cut to 256 characters; `extras` is never exposed; a license
  is what the file claims.

### 8.2 Performance budgets

| Measure                       | Comfortable | Warning                           | Refused (`E_MODEL_TOO_LARGE`) |
| ----------------------------- | ----------- | --------------------------------- | ----------------------------- |
| Triangles per model (per use) | up to 5,000 | over 50,000 (`W_MODEL_HEAVY`)     | over 1,000,000                |
| Materials per model           | up to 4     | over 8 (`W_MODEL_HEAVY`)          | over 64                       |
| File bytes per model          | up to 1 MB  | over 8 MB (`W_MODEL_HEAVY`)       | over 32 MB (8 MB text)        |
| Decoded texture bytes         | up to 16 MB | over 32 MB (`W_MODEL_HEAVY`)      | over 64 MB                    |
| Drawn triangles in the scene  | --          | over 2,000,000 (`W_MODEL_BUDGET`) | --                            |

Targets for the prototype, each a test:

- 1,000 nodes of one 2,000-triangle static model hold 60 frames a second where the same graph of
  icospheres does; 10,000 nodes of a 500-triangle model stay interactive.
- Draw calls for model nodes equal the template's group count (plus the existing glow and outline
  passes), the same at 10 nodes and at 1,000.
- A pointer move over 1,000 model nodes spends under 1 ms in picking.
- The first model is drawn within 500 ms of a local file being dropped, measured in Chromium and
  WebKit.
- Loading 5 different models and removing 4 returns GPU memory to within 10% of the 1-model figure.
- The model chunk is under 400 KB gzipped, measured, and budgeted separately in `size-budgets.json`.

---

## 9. The graphty app's interface

The app writes words and arranges controls; every fact and every check comes from the element.

1. **Choosing a model for a style layer.** The style layer's shape control (`SetLine.tsx` in the
   Style tab) gains a "Model..." entry. It opens a picker with the bundled samples and their
   thumbnails from `session.catalog.models()`, the session's models from `session.assets.list()`,
   a "Choose file..." button and a drop zone that accepts `.glb`, `.gltf` with its files, `.obj`
   with `.mtl` and images, `.stl`, `.ply`, `.zip` and a folder. It hands the files to
   `session.assets.add` and sets `node.model` on the layer.
2. **Dropping on the canvas or the start screen.** Every drop target calls `detectModelFormat`
   first. A model dropped with nodes selected adds a layer for them (`{ match: "ids" }`); with
   nothing selected it adds one undoable layer for all nodes -- undo is the escape hatch, not a
   question asked first. A later version offers "nodes with the same <column>" on a drop onto a
   node.
3. **Three plain controls** under the model choice, shown only when they apply: "Turn upright"
   (cycles `node.modelSourceUp`; prominent on `W_MODEL_UP_GUESSED`), "Use node color"
   (`node.modelTint`; prominent on `W_MODEL_COLOR_IGNORED`), and later "Play animation".
4. **Advanced** (collapsed, later): turn, fit, center, and the summary from `assets.inspect`.
5. **Errors** are written by the app from section 4's codes, next to the control that caused them.
   A layer whose model failed shows a warning badge in the layer list; the graph still draws the
   placeholder.
6. The app installs `@babylonjs/ktx2decoder` once the decoder package lands, so app readers never
   see `E_MODEL_DECODER_UNAVAILABLE` for KTX2.

---

## 10. Work packages

Packages 1 to 6 are the prototype; 1 to 5 are graphty-element.

| #   | Package                                  | Contents                                                                                                                                                                                                                                                                                                                                                             |
| --- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Dependency and model chunk               | `@babylonjs/loaders@8.56.2` and `fflate`; one lazily imported chunk registering only the glTF, OBJ, STL and PLY plugins; PBR shaders and the neutral `.env` bundled; every CDN-defaulted Babylon URL off; the chunk's own budget and the `./bundle` budget raised by the measured amount; a request-guard test in Chromium and WebKit                                |
| 2   | Asset intake (`./session`, Babylon-free) | `session.assets` (`add`, `ready`, `get`, `list`, `inspect`, `remove`, `files`, `setLimits`, `allowHosts`); every source shape; streaming unzip; detection and `detectModelFormat`; main-file choice; reference allowlist; glTF structure and count checks; OBJ, STL and PLY scans; digests and names; limits; the intake codes                                       |
| 3   | Channels and drawing                     | The `node.model*` channels in schema, interner and catalog; URL provenance (2.6); `ModelCache` with reference counts; guarded `LoadAssetContainerAsync`; rest-pose bake, grouped merge, fit with `sizeMode`, up axis, center; environment; compile and freeze; tint gating; bounding-box picking; sphere radius for edges; coalesced swap-in; the event and warnings |
| 4   | Per-node models from data                | `styles.encode` with a value map to `node.model`, asset ids only                                                                                                                                                                                                                                                                                                     |
| 5   | Samples, catalog, docs, stories          | The CC0 samples with PNG thumbnails, `session.catalog.models()`; the guide page "Drawing nodes as models" (first example 2.1, then 2.2); Storybook stories                                                                                                                                                                                                           |
| 6   | App, minimal                             | "Model..." in the shape control with samples, file choice and drop; drop on canvas; "Turn upright" and "Use node color"; error text for every code                                                                                                                                                                                                                   |
| 7   | Project storage                          | The `graphty-assets` member and its rules -- only after the OWNER DECISION in 7.3                                                                                                                                                                                                                                                                                    |
| 8   | Decoders                                 | Draco and meshopt as lazy chunks with output checks; KTX2 as an optional peer; `./bundle` behavior stated                                                                                                                                                                                                                                                            |
| 9   | Level of detail                          | Opt-in LOD channel, budget-derived distance with hysteresis, `MSFT_lod`                                                                                                                                                                                                                                                                                              |
| 10  | Extension point                          | `registerModelLoader` with `convert`, then `load`                                                                                                                                                                                                                                                                                                                    |
| 11  | Animation                                | Clips on clones up to `maxAnimatedNodes`, then baked vertex animation                                                                                                                                                                                                                                                                                                |
| 12  | Polish                                   | Live thumbnails of dropped models, 2D impostors, `assets.addAll` for model kits, the app's asset list and advanced panel, intake parsing in a worker                                                                                                                                                                                                                 |

### Sample models to bundle (all CC0, a few hundred KB in total)

Samples are chosen with light, neutral base colors, so `node.modelTint` reproduces a data color
faithfully.

| Name                                   | Source                                                                                                     | Why                                    | Approximate size |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------- |
| `asset:sample/box`                     | Khronos glTF Sample Assets "Box" (CC0 per its README; confirm)                                             | Smallest valid GLB; tests              | 2 KB             |
| `asset:sample/server`                  | Kenney "Furniture Kit" or "Building Kit" (CC0)                                                             | A server-like prop for network graphs  | 20-60 KB         |
| `asset:sample/person`                  | Kenney "Mini Characters" or Quaternius low-poly characters (CC0)                                           | People nodes; has clips for package 11 | 100-200 KB       |
| `asset:sample/tree`                    | Kenney "Nature Kit" (CC0)                                                                                  | Non-tech example                       | 10-30 KB         |
| `test/fixtures/models/*` (not shipped) | Hand-made: a `.gltf` + `.bin` pair, an OBJ + MTL + PNG, binary and ASCII STL, a PLY; hostile files (below) | Tests of sections 3 and 4              | --               |

Hostile fixtures: references `//host/x`, `%2e%2e/x`, `../x`, `blob:`, `file:`, `http://`; an
`map_Kd -o 1 1 1 http://host/x.png` line; an accessor with `count: 2e8` and no buffer view; a
node cycle and a 100,000-deep chain; one mesh used by 100,000 nodes; a zip with two entries that
differ only in case, a 1,000:1 entry and a nested zip; an OBJ with out-of-range face indices; a
binary STL whose count does not match its length; a PNG header claiming 65,536 x 65,536.

Each sample's license and source URL go in a `LICENSES.md` beside it, and in its GLB's
`asset.copyright`.

---

## 11. Review decisions

Five reviews (developer experience, architecture, security, performance, user advocate) were
applied. Taken, in short: URL failures traced to what the layer named, with `assets.ready` and a
typed event; `Promise<AssetRecord>` instead of `Run`; flat channels instead of one object channel;
limits as code-only host settings; source file sets stored as given with stable digests; intake
and `inspect` from JSON, Babylon-free; URL fetching only from code, per-host consent, no URLs from
data, expressions or AI; a reference allowlist plus a request guard; glTF structure, accessor and
per-use triangle checks; streaming unzip; `.babylon` and splats dropped; `ModelFormat` as a string;
asset defaults deleted; neutral defaults for budget and LOD; the scene's environment respected;
grouped merging, rest-pose bake, reference-counted GPU templates, tint out of the cache key and
gated in `applyInstanceColor`; bounding-box picking; compile and freeze before swap-in; coalesced
repaints; fit that honors `sizeMode`; `W_MODEL_COLOR_IGNORED`; per-node models in the prototype;
`detectModelFormat` for drop targets; sample thumbnails; and new performance targets.

Not taken, or taken differently, with the reason:

| Suggestion                                                       | Decision                                                                                                                                  |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Bundle Draco and meshopt now, or inline them in `./bundle`       | Deferred: version 1 refuses compressed files, which removes the decoder bombs and the wasm-in-bundle problem at once                      |
| Downscale textures on intake and store the smaller GLB           | Changed: drawn smaller at prepare time; stored files stay as given so ids stay stable                                                     |
| Add `@babylonjs/serializers` for conversion to GLB               | Not needed: nothing is converted                                                                                                          |
| Simplify geometry automatically past the triangle limit          | Rejected for now: simplifier output is unpredictable and slow; the 1 million limit refuses only true outliers                             |
| `W_MODEL_SIZE_NOT_COMPARABLE` when an encoding spans models      | Rejected: noise on most graphs; the guide says sizes compare within one model                                                             |
| Bounding-sphere diameter as the fit measure                      | Rejected: fit matches a box node of the same size, which is what "same size" means beside built-in shapes; edges and halos use the sphere |
| A `modelEnvironment` option                                      | Not needed: using the scene's environment when one is set covers the case                                                                 |
| `E_MODEL_UNREACHABLE` with `likely: "cors"`                      | Changed: `E_MODEL_FETCH` with `status: null` and `offline`; "cors" cannot be known, so it is not claimed                                  |
| Relink params `fileName` and `sha256` on `E_MODEL_UNKNOWN_ASSET` | Not needed: the id is the digest, so adding the same file again restores it                                                               |
| `session.files.classify(files)`                                  | Changed: `detectModelFormat` in `./catalog`, beside the existing `detectFormat`                                                           |
| `assets.addAll` for model kits                                   | Deferred: same-name de-duplication handles the common kit; the picker can call `add` with `main` per candidate                            |
| `tintMaterials` to tint only some parts                          | Deferred: material names are in `ModelSummary` now, so it can be added without a change                                                   |
| Intake parsing in a worker, with progress events                 | Deferred: the 8 MB text-format limit bounds the main-thread cost for the prototype                                                        |
| Collapse identical materials on intake                           | Deferred: `W_MODEL_HEAVY` now reports material count, which shows whether it matters                                                      |
| Full x, y, z rotation                                            | Changed: `node.modelTurn` about the up axis covers facing; an arbitrary tuple is not a channel value                                      |
| `animationPaused`                                                | Dropped: `node.modelAnimation: false` already stops it                                                                                    |
| Asking the owner now about 7.3 storage                           | Not now: the prototype is session-only, so the storage choice blocks nothing yet                                                          |

See also: `design/documents/container.md` for the project file container this design extends.
