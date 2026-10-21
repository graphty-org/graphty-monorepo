# Drawing nodes as 3D models

Status: design, revised after developer, architecture, security, performance and user reviews
(section 11 records what was taken and what was not). A prototype is planned (section 10).
Package: graphty-element, plus the graphty app's controls for it (section 9). One part, how a
project file stores a model, is a published file format; the owner decided it (7.3).

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
7. Storing models in a project file (decided: embedded)
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
    column: { kind: "node", name: "kind" },
    channel: "node.model",
    values: { server: "asset:sample/server", person: "asset:sample/person" },
});
```

This uses the existing `styles.encode` with a value map (`values`, written as the binding's `map`
with `unmapped: "skip"`, so a kind the map does not list keeps `node.shape`). Encoded and computed
values of `node.model` -- a value map, a column of URLs, a template -- may name asset ids and
`http`/`https` URLs (owner, 2026-10-20: "why not allow loading models via URL?"). A URL read from
the data is fetched only on a host the page's code or the reader allowed (2.6): until then it
waits in `session.network`, so a file cannot make the reader's browser contact a host nobody
chose, and an expression that builds a URL out of node data leaks nothing before the reader
answers. Each distinct URL is fetched once and shared by every node that names it, never once per
node. A listed value that is neither an asset id nor an `http`/`https` URL is refused with
`E_MODEL_URL_BLOCKED`.

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

A `node.model` URL is fetched at once when the layer was added by a direct call to
`session.styles.add` (or `update`) from the page's code, or when its host is allowed. Any other
URL waits for the reader:

- a layer opened from a project file or imported from a style file, or applied from a template;
- a layer written by the AI style commands (`src/ai/commands/StyleCommands.ts`) or suggested styles;
- a value produced by an encoding or an expression (2.2).

**One gate for every such fetch: `session.network`.** It is the same mechanism a reopened project's
network-source loads wait in (`data.pendingSourceLoads`), so the application has one question to
answer, not two. Each waiting fetch is a fact, `{ code: "W_URL_NEEDS_APPROVAL", params: { id, url,
host, kind, by, layerIds } }` -- `url` without its query or credentials, `kind` `"model"`,
`"texture"` or `"source"`, `by` what asked (`"file"`, `"ai"`, `"data"`, `"source"`) -- listed by
`session.network.pending()` and published once per URL as `network:pending`. While it waits the
node draws `node.shape` and the model is `pending`.

- `network.allow(id)` makes the fetch and allows its host for the rest of the session, so a reader
  is asked once per host. A source load runs as `runPendingSourceLoad` would run it.
- `network.deny(id)` refuses it: the model is `E_MODEL_URL_BLOCKED { hosts, layerIds, denied: true }`
  and keeps its shape; a source load stays unloaded and is not listed again.
- `network.setProjectHosts(lookup)` hands back what a reader chose not to be asked about again for
  one project. graphty-element calls `lookup(session.project.id)` now and as each project opens,
  before anything is fetched, and allows the hosts it returns until another project opens. The
  page keeps those choices in its own storage on the reader's machine; graphty-element saves none.
- `network.setPolicy("allow")` stops the page asking at all: the reader's own preference, set by the
  page's code, never saved.
- `session.assets.allowHosts([...])` (code) allows hosts for the session without asking.

**A file cannot approve its own fetches (owner, 2026-10-20).** "Don't ask again for this project"
is stored on the reader's machine, not in the project file, so a project file someone sends cannot
open web addresses without asking. graphty-element neither writes nor honors a network approval in
a file: a file an earlier build wrote with `graphty-session` `network: { policy: "allow" }` opens
without error, the field is ignored and not written back, and the open's problems carry
`{ code: "W_NETWORK_POLICY_IGNORED", params: { kind: "graphty-session" } }`.

`session.project.id` is what a page keys a remembered choice by: an opaque string (128 random bits
in hex) written in the `graphty-session` member as `id` and read back on open, so a copy of the
file is the same project. A new session, and a file without one, get a fresh id. It carries no
permission: the same file on another machine, whose page remembers nothing for it, asks. A file
claiming the id of a project the reader approved gets only the hosts the reader approved for that
project.

Whatever the answers, private, loopback and link-local addresses are refused for anything that did
not come from the page's code, and previews and thumbnails never fetch. An embedded copy in a
project file (7.3) wins over its URL: naming the URL draws the copy and asks nothing. Every model
fetch is `credentials: "omit"`, `referrerPolicy: "no-referrer"`, has a time limit, and refuses URLs
holding a user name and password. In problems and events a URL appears without its query string.

**The general warning (owner, 2026-10-20).** Before a project opens any web address -- a model, a
picture, a network source -- the reader is asked, and nothing is fetched until the application
answers. graphty-element reports each waiting fetch as the fact above and never words it; the
graphty app asks "This project wants to open <url>. Continue?" with Continue, Cancel, "Don't ask
again for this project" and "Don't ask again". Recorded interpretation: "don't ask" means stop
asking and continue (open what waits, and open without asking from then on). "For this project"
is the application's record, on the reader's machine, of the host for `session.project.id`, handed
back with `setProjectHosts`; "Don't ask again" is the reader's own preference, which the application
stores and hands to every session with `setPolicy("allow")`. A waiting source load on an allowed host runs as soon as it is
allowed when it needs no credential; one that needs a login waits for the application, which holds
it. Private network addresses stay refused regardless.

### 2.8 Pictures on nodes: `node.texture`

| Channel        | Value                        | Default | Meaning                                                                                                                                              |
| -------------- | ---------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node.texture` | string: an asset id or a URL | unset   | A PNG, JPEG or WebP drawn on the node: on a model, every material's base color texture; on a built-in shape, its surface. Style path `texture.image` |

**Decision (owner, 2026-10-20): replace by default, tint on top.** The picture replaces the base
color (a PBR material's `albedoTexture` with its `albedoColor` set to white; a standard material's
`diffuseTexture`), so it shows its own colors. `node.modelTint` stays its own channel and multiplies
the node's color into the picture, on a model and on a built-in shape alike.

A picture is an asset of kind `"image"` in `session.assets`: added as a file, bytes or a URL like a
model, checked from its header (its size readable, its decoded bytes under `maxTextureBytes`, one
over `maxTextureSize` drawn smaller with `W_MODEL_TEXTURES_REDUCED`), fetched through the same gate
(2.6), embedded in or kept by URL in a project file like a model (7.3), and reported as
`model:changed` under the ref the layer named. A model file named as a picture is
`E_MODEL_FORMAT_UNSUPPORTED`. One texture is made per picture and shared by every node and
template that names it; a model with a picture is its own template, so a model drawn with two
pictures is two templates.

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

**A model fetched by URL brings the files beside it.** When the main file names a file the set
does not hold (a `.gltf`'s `.bin` and images, an `.obj`'s `.mtl` and the images the `.mtl` names),
the element fetches it relative to the main file's URL -- the reference has already passed the
allowlist, so the request is on the same origin and in the main file's folder or below -- adds it
to the set and checks again. The files together are held to `maxBytes`, at most 64 files are added
(`E_MODEL_TOO_LARGE { what: "count" }`), each request is made like the main one, and a file that
does not answer is `E_MODEL_FETCH`. A reference to another host, or above the folder, stays
`E_MODEL_EXTERNAL_URL` and is never requested. Sites laid out differently -- other folders, other cases, signed
URLs, parts on other hosts, web pages, zips -- are handled by section 12.

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

| Code                          | params                                                                                                                               | When                                                                                               | What the graphty app says (example)                                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_MODEL_FETCH`               | `url` (no query), `status: number \| null`, `offline: boolean`                                                                       | The URL answered with an error, or not at all (offline, CORS, DNS look alike)                      | "Could not download rack.glb (404)." / with no status: "The server did not answer or does not share its files with other sites. Download the model and drop it here." |
| `E_MODEL_URL_BLOCKED`         | `hosts`, `layerIds`, `denied?`                                                                                                       | A private address not from code, a scheme other than http(s), or the reader denied the fetch (2.6) | "This style loads a model from models.example.com, which is not allowed."                                                                                             |
| `W_URL_NEEDS_APPROVAL`        | `id`, `url`, `host`, `kind`, `by`, `layerIds`                                                                                        | A fetch not from code waits in `session.network` (2.6)                                             | "This project wants to open models.example.com/rack.glb. Continue?"                                                                                                   |
| `W_NETWORK_POLICY_IGNORED`    | `kind`                                                                                                                               | A project file carries a network approval an earlier build wrote; it is ignored (2.6)              | "This project asked to open web addresses without asking. It will ask."                                                                                               |
| `E_MODEL_TOO_LARGE`           | `what: "bytes" \| "unzipped" \| "triangles" \| "textureBytes" \| "decodedBytes" \| "sceneTextureBytes" \| "count"`, `found`, `limit` | Over a limit in section 6                                                                          | "This model has 4.2 million triangles; the limit is 1 million. Pick a lighter one."                                                                                   |
| `E_MODEL_STRUCTURE`           | `rule: "index" \| "cycle" \| "depth" \| "accessor" \| "json" \| "instancing"`                                                        | The glTF's structure is unsafe or broken                                                           | "The file is damaged."                                                                                                                                                |
| `E_MODEL_FORMAT_UNSUPPORTED`  | `format`, `fileName`                                                                                                                 | Recognized but not loadable (FBX, USDZ, DAE, .blend, 3MF, splats, .babylon)                        | "FBX files cannot be loaded yet. Export as GLB from your 3D program."                                                                                                 |
| `E_MODEL_FORMAT_UNKNOWN`      | `fileName`                                                                                                                           | No format matches the bytes                                                                        | "This is not a 3D model file graphty knows."                                                                                                                          |
| `E_MODEL_AMBIGUOUS`           | `candidates`                                                                                                                         | Two different main files in one set                                                                | "Which one is the model?" with the list                                                                                                                               |
| `E_MODEL_MISSING_FILE`        | `name`, `referencedBy`                                                                                                               | A `.bin`, texture or `.mtl` is not in the set                                                      | "robot.gltf needs robot.bin. Drop the whole folder or a .zip, or export as .glb."                                                                                     |
| `E_MODEL_EXTERNAL_URL`        | `url`                                                                                                                                | A reference outside the file set                                                                   | "This model loads parts from somewhere else, which is not allowed. Export it as .glb."                                                                                |
| `E_MODEL_DECODER_UNAVAILABLE` | `extension`, `package`                                                                                                               | Draco, meshopt or KTX2 compression, and no decoder                                                 | "This model is compressed in a way this page cannot read yet."                                                                                                        |
| `E_MODEL_PARSE`               | `format`                                                                                                                             | Babylon could not read a file that passed the checks                                               | "The file is damaged or not a valid GLB."                                                                                                                             |
| `E_MODEL_ZIP`                 | `reason: "corrupt" \| "encrypted" \| "empty" \| "duplicate" \| "ratio" \| "entries" \| "nested"`                                     | The zip cannot be read safely                                                                      | "The .zip could not be opened."                                                                                                                                       |
| `E_MODEL_NAME_TAKEN`          | `id`                                                                                                                                 | A name already held by different files, or a reserved `asset:sample/` name                         | "A different model is already called rack."                                                                                                                           |
| `E_MODEL_DIGEST_MISMATCH`     | `id`                                                                                                                                 | Stored bytes do not match their digest (project files, 7.3)                                        | "The model in this file is damaged."                                                                                                                                  |
| `E_MODEL_UNKNOWN_ASSET`       | `id`                                                                                                                                 | A layer names an asset the session does not hold, after loading has settled                        | "This style needs a model that is not here. Find rack.glb..." (adding the same file gives the same id and fixes it)                                                   |
| `W_MODEL_COLOR_IGNORED`       | `layerIds`                                                                                                                           | A color reaches a model node with tint off                                                         | Show "Use node color" next to the model choice                                                                                                                        |
| `W_MODEL_HEAVY`               | `triangles`, `materials`, `nodes`                                                                                                    | Over the comfortable size (8.2)                                                                    | "This model is detailed; with 800 nodes the graph may be slow."                                                                                                       |
| `W_MODEL_BUDGET`              | `nodes`, `triangles`, `budget`                                                                                                       | Triangles across the scene pass the budget                                                         | "The graph draws 3 million triangles and may be slow."                                                                                                                |
| `W_MODEL_TEXTURES_REDUCED`    | `from`, `to`                                                                                                                         | Textures above `maxTextureSize` were drawn smaller                                                 | (usually nothing)                                                                                                                                                     |
| `W_MODEL_TRANSPARENT`         | `nodes`                                                                                                                              | Many blended instances may sort wrongly                                                            | "See-through parts may look wrong where models overlap."                                                                                                              |
| `W_MODEL_HAS_ANIMATIONS`      | `clips`                                                                                                                              | Clips exist and animation is off                                                                   | Offer a "Play animation" control (later)                                                                                                                              |
| `W_MODEL_TEXTURE_FAILED`      | `name`                                                                                                                               | One texture could not be decoded; the rest of the model is drawn                                   | "One texture (bark.png) could not be read; the model shows without it."                                                                                               |
| `W_MODEL_UP_GUESSED`          | `format`, `up`                                                                                                                       | STL or PLY: the up axis is a guess                                                                 | Show the "Turn upright" control near the model                                                                                                                        |
| `W_MODEL_REMOVED`             | `id`, `layerIds`                                                                                                                     | An asset in use was removed                                                                        | "Layers that used this model now show the plain shape."                                                                                                               |
| `W_MODEL_NOT_EMBEDDED`        | `ref`, `layerIds`                                                                                                                    | A project was saved naming a model it does not hold (7.3)                                          | "This project names a model on the web; others may not be able to open it."                                                                                           |
| `E_MODEL_WEB_PAGE`            | `url`, `host`, `part?`, `suggested?`                                                                                                 | The URL answered with a web page, not a model (12.6)                                               | "That address is a web page, not the model file."                                                                                                                     |
| `E_MODEL_PART_AMBIGUOUS`      | `name`, `referencedBy`, `candidates`                                                                                                 | More than one file could be the part (12.5)                                                        | A select of the candidates on the part's row                                                                                                                          |
| `E_MODEL_PART_REQUIRED`       | `name`, `role`                                                                                                                       | Thrown by `assets.supply` for a skip of geometry (12.4)                                            | (a programming error; the app never offers it)                                                                                                                        |
| `W_MODEL_PART_SUBSTITUTED`    | `name`, `used`, `referencedBy`                                                                                                       | A reference matched one file by case or base name (12.5)                                           | "Used maps/wood.png for wood.PNG."                                                                                                                                    |
| `W_MODEL_PART_SKIPPED`        | `name`, `role`                                                                                                                       | Drawn without a picture or `.mtl` the reader skipped (12.4)                                        | "Drawn without wood.png."                                                                                                                                             |
| `W_MODEL_PART_UNUSED`         | `fileName`                                                                                                                           | A supplied file matched no missing part (12.4)                                                     | "notes.txt is not a part of this model."                                                                                                                              |

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

### 7.3 The member: `graphty-assets` (decided)

**Owner decision (2026-10-20): models are embedded in project files.** A project file carries the
source file set of every model its layers name, as given, de-duplicated by digest, in a new member
kind `graphty-assets`; the zip container and session-only storage were not chosen. The member's
specification is `design/documents/assets.md` (schema `assets.schema.json`, conformance rows
"Assets"). It is built: `session.project.save()` and autosave write it, `session.project.open()`
and the autosave restore read it.

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
   conversion. Every format the intake accepts is embedded (GLB, glTF with its files, OBJ with its
   MTL and images, STL, PLY, a zip of any of them).
2. One entry per distinct digest; samples (`asset:sample/*`) are never embedded, since every
   reader ships them.
3. Size: 64 MB of assets per document. A project file may be up to 256 MiB (`projectFile.ts`); the
   64 MB in the documents README holds for every other document. The member's total base64 length
   and each asset's declared length are checked before decoding, and assets are decoded one at a
   time. Every embedded file set then goes through `session.assets.add`, the same checks and limits
   as a dropped file, after its digest is verified (`E_MODEL_DIGEST_MISMATCH`).
4. The assets member is applied first, whatever its position in `members`; a layer naming an id
   not yet held is `pending`, and `E_MODEL_UNKNOWN_ASSET` is reported only once loading settles.
5. Saving embeds the bytes the session already holds; a layer that named a URL keeps it, and the
   entry's `source` lets a reader resolve the URL with no fetch. Only a URL that never loaded is
   written bare, with `W_MODEL_NOT_EMBEDDED`. On open, such a URL is blocked (2.6) until the page
   allows its host; private addresses stay blocked.
6. Same id with a different digest on open is `E_MODEL_NAME_TAKEN` for the incoming asset; it is
   never a silent replacement.
7. Not built yet: autosave writes a "loading" marker before decoding a stored asset; if the marker
   is still there at the next start, that asset is not drawn automatically and reports
   `E_MODEL_CRASHED_LAST_TIME`, so a model that crashes the tab cannot lock the reader out.
8. `graphty-assets` is listed in `requires` whenever it is written, so an older element refuses the
   file (`E_UNSUPPORTED`) instead of opening it and dropping the models when it saves it back.
9. Autosave keeps each model's files in their own part, named by digest, so a style change rewrites
   no model bytes.
10. **Embed or use the URL (owner, 2026-10-20).** Saving a project with a model or picture loaded
    from a URL offers "Embed model" or "Use URL" per asset, embed by default:
    `session.project.save({ assets: { [url]: "embed" | "url" } })`. Kept by URL, the entry records
    the URL and the file's digest with `"stored": "url"` and no files; when the project opens, the
    URL waits for the reader like any other (2.6), and a file whose digest is not the recorded one
    is drawn and reported with `W_MODEL_CHANGED { url, expected, found }`. Autosave always embeds.

The alternatives the owner did not choose: a zip project container (assets as raw files beside the
JSON, no base64 and no giant string -- a larger change to the container, and kinder to iOS memory),
or models that live only in the running session and autosave.

---

## 8. Security and performance budgets

### 8.1 Untrusted files

Every model is hostile input, whether a user dropped it or a project file embedded it.

- **No code.** Only glTF, OBJ, STL and PLY are read; none carries scripts or shaders.
- **No network from inside a model.** An allowlist of references, a request guard during the load,
  and a root URL that cannot resolve against the page (3.3).
- **No network from a document, data or the AI without the reader.** Only layers added by code, or
  hosts the page or the reader allowed, fetch URLs; everything else waits in `session.network`
  (2.6). A model's own references reach only its own folder on its own origin (3.3); a part on another host is fetched only when the reader supplies its URL, through the same gate (12.7).
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
6. **The question before a web address** (2.6): a dialog per waiting fetch with Continue, Cancel,
   "Don't ask again for this project" and "Don't ask again", both kept in the app's preferences on
   the reader's machine, never in the project file: the site per project id in
   `graphty.projectHosts.v1`, and the always choice in `graphty.openProjectUrls.v1`.
7. **Pasting a URL.** The Model picker and the picture picker (the texture line, in Fill) take a
   pasted URL as well as a file or a drop; the layer names the URL itself, so a save can keep it by
   URL.
8. **Embed or use the URL** on save (7.3 rule 10): a dialog listing each model and picture the
   layers name by URL, with Embed (the default) or Use URL.
9. The app installs `@babylonjs/ktx2decoder` once the decoder package lands, so app readers never
   see `E_MODEL_DECODER_UNAVAILABLE` for KTX2.

---

## 10. Work packages

Packages 1 to 6 are the prototype; 1 to 5 are graphty-element.

| #     | Package                                  | Contents                                                                                                                                                                                                                                                                                                                                                             |
| ----- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Dependency and model chunk               | `@babylonjs/loaders@8.56.2` and `fflate`; one lazily imported chunk registering only the glTF, OBJ, STL and PLY plugins; PBR shaders and the neutral `.env` bundled; every CDN-defaulted Babylon URL off; the chunk's own budget and the `./bundle` budget raised by the measured amount; a request-guard test in Chromium and WebKit                                |
| 2     | Asset intake (`./session`, Babylon-free) | `session.assets` (`add`, `ready`, `get`, `list`, `inspect`, `remove`, `files`, `setLimits`, `allowHosts`); every source shape; streaming unzip; detection and `detectModelFormat`; main-file choice; reference allowlist; glTF structure and count checks; OBJ, STL and PLY scans; digests and names; limits; the intake codes                                       |
| 3     | Channels and drawing                     | The `node.model*` channels in schema, interner and catalog; URL provenance (2.6); `ModelCache` with reference counts; guarded `LoadAssetContainerAsync`; rest-pose bake, grouped merge, fit with `sizeMode`, up axis, center; environment; compile and freeze; tint gating; bounding-box picking; sphere radius for edges; coalesced swap-in; the event and warnings |
| 4     | Per-node models from data                | `styles.encode` with a value map to `node.model`, asset ids only                                                                                                                                                                                                                                                                                                     |
| 5     | Samples, catalog, docs, stories          | The CC0 samples with PNG thumbnails, `session.catalog.models()`; the guide page "Drawing nodes as models" (first example 2.1, then 2.2); Storybook stories                                                                                                                                                                                                           |
| 6     | App, minimal                             | "Model..." in the shape control with samples, file choice and drop; drop on canvas; "Turn upright" and "Use node color"; error text for every code                                                                                                                                                                                                                   |
| 7     | Project storage                          | The `graphty-assets` member and its rules (7.3; built)                                                                                                                                                                                                                                                                                                               |
| 8     | Decoders                                 | Draco and meshopt as lazy chunks with output checks; KTX2 as an optional peer; `./bundle` behavior stated                                                                                                                                                                                                                                                            |
| 9     | Level of detail                          | Opt-in LOD channel, budget-derived distance with hysteresis, `MSFT_lod`                                                                                                                                                                                                                                                                                              |
| 10    | Extension point                          | `registerModelLoader` with `convert`, then `load`                                                                                                                                                                                                                                                                                                                    |
| 11    | Animation                                | Clips on clones up to `maxAnimatedNodes`, then baked vertex animation                                                                                                                                                                                                                                                                                                |
| 12    | Polish                                   | Live thumbnails of dropped models, 2D impostors, `assets.addAll` for model kits, the app's asset list and advanced panel, intake parsing in a worker                                                                                                                                                                                                                 |
| 13-15 | Sites laid out differently               | Section 12.11                                                                                                                                                                                                                                                                                                                                                        |

### Sample models to bundle (all CC0, a few hundred KB in total)

Samples are chosen with light, neutral base colors, so `node.modelTint` reproduces a data color
faithfully.

| Name                                   | Source                                                                                                     | Why                                   | Approximate size |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------- |
| `asset:sample/box`                     | Made by `graphty-element/scripts/make-sample-models.mjs` (CC0, graphty-org)                                | Smallest valid GLB; tests             | 2 KB             |
| `asset:sample/server`                  | Made by `graphty-element/scripts/make-sample-models.mjs` (CC0, graphty-org)                                | A server-like prop for network graphs | 15 KB            |
| `asset:sample/person`                  | Made by `graphty-element/scripts/make-sample-models.mjs` (CC0, graphty-org)                                | People nodes; no clips yet            | 33 KB            |
| `asset:sample/tree`                    | Made by `graphty-element/scripts/make-sample-models.mjs` (CC0, graphty-org)                                | Non-tech example                      | 10 KB            |
| `test/fixtures/models/*` (not shipped) | Hand-made: a `.gltf` + `.bin` pair, an OBJ + MTL + PNG, binary and ASCII STL, a PLY; hostile files (below) | Tests of sections 3 and 4             | --               |

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
| Asking the owner now about 7.3 storage                           | Asked once the prototype worked; the owner chose embedding (2026-10-20)                                                                   |

## 12. Loading models from sites with different layouts

**Owner request (2026-10-20):** "auto-detect where we can but allow users to manually enter all
the URLs for models where needed." Sites do not lay out a model's files the same way, so a URL
that names only the main file is not always enough. This section adds an automatic second try
for the common layouts, a `.zip` URL as a first-class source, and a way to hand the element each
part it could not find, by URL or by file, after which the load carries on. Everything here is
additive: no existing name, type, default or code changes meaning.

### 12.1 How real sources lay out their files (surveyed 2026-10-20)

| Source                                                         | What a URL gives                                                                                                                                                                                                                        | CORS                   | What happens today, and with this section                                                                                                                                   |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Khronos glTF-Sample-Assets, `raw.githubusercontent.com`        | A `.gltf` whose `.bin` and PNGs sit beside it (`FlightHelmet.gltf` names `FlightHelmet.bin` and bare PNG names). Served as `text/plain`, so the type header cannot be trusted                                                           | `*`                    | Loads today: same folder. Detection stays by bytes                                                                                                                          |
| The same file's `github.com/.../blob/...` page                 | An HTML page                                                                                                                                                                                                                            | none                   | Today `E_MODEL_FORMAT_UNKNOWN`; now `E_MODEL_WEB_PAGE` with `suggested` naming the `raw.githubusercontent.com` URL (12.6)                                                   |
| `github.com/.../raw/...`                                       | A 302 to `raw.githubusercontent.com`, then the file                                                                                                                                                                                     | `*` after the redirect | Loads today                                                                                                                                                                 |
| jsDelivr (`cdn.jsdelivr.net/gh/...`)                           | The file, with a correct `model/gltf+json` type                                                                                                                                                                                         | `*`                    | Loads today                                                                                                                                                                 |
| GitHub release assets, repository archive zips (`codeload`)    | A 302 to a signed blob URL (`release-assets.githubusercontent.com/...?sp=r&sv=...`); the archive sends `Access-Control-Allow-Origin: https://render.githubusercontent.com` only                                                         | none for other sites   | `E_MODEL_FETCH { status: null }`: a browser cannot read them. The reader downloads and drops the file (the app's words already say so)                                      |
| Poly Pizza (`static.poly.pizza/<uuid>.glb`)                    | One self-contained GLB (type header `gltf-binary`, not a real media type). The model page `poly.pizza/m/<id>` is HTML                                                                                                                   | `*` on the GLB         | The GLB loads today; the page is `E_MODEL_WEB_PAGE`                                                                                                                         |
| Kenney (`kenney.nl/media/.../kenney_<kit>.zip`)                | One zip per kit: 1,557 entries for the furniture kit, the same 141 models in `Models/GLTF format/`, `OBJ format/`, `STL format/`, `FBX format/`, `DAE format/`; the MTL files carry colors only                                         | none                   | A browser cannot fetch it (`E_MODEL_FETCH`); dropped, the kit is over the 1,024-entry cap (`E_MODEL_ZIP { reason: "entries" }`). The reader drops one model's files instead |
| Sketchfab                                                      | The model page is HTML. A download needs a signed-in reader and yields a time-limited signed storage URL to a zip holding `scene.gltf`, `scene.bin`, `textures/` (PNG and JPEG) and `license.txt`                                       | the page: none         | The page is `E_MODEL_WEB_PAGE`; the downloaded zip, dropped or pasted while its signed URL is fresh, loads as a zip (12.3)                                                  |
| S3, GCS and Azure signed URLs                                  | The object, authorized by the query string (`X-Amz-Signature`, `X-Goog-Signature`, `sig=`). One signature covers one object, except an Azure container SAS (`sr=c`), which covers every object in the container                         | per bucket             | Today a companion is requested with no query and fails (403). Now: the main URL's query is kept, a 401 or 403 companion is retried once with it (12.2), else it is a row    |
| OBJ packs from asset stores and exporters                      | `model.obj` + `model.mtl`, textures in `textures/`, `Textures/` or `maps/`; MTL lines name `Wood.JPG` for `wood.jpg`, `textures\wood.png` with backslashes, or an absolute path from the author's disk (`C:\Users\me\Desktop\wood.png`) | varies                 | Today a case or folder mismatch is `E_MODEL_MISSING_FILE` and an absolute path `E_MODEL_EXTERNAL_URL`; now tolerant matching (12.5) finds the one file meant                |
| Static hosts with a single-page-app fallback (Netlify, Vercel) | A missing file answers `200` with the site's `index.html`                                                                                                                                                                               | varies                 | Today the HTML is stored as the part and fails later; now a companion that answers with a web page is missing (12.2)                                                        |

What follows from the survey: most URLs that load at all are same-folder layouts, which the first
try already covers; the rest break in five ways -- a case or folder mismatch, a signed query, a
part on another host, a web page instead of a file, and a zip -- and each gets one rule below.
Hosts that send no CORS header cannot be fixed by any rule in a browser: their files are dropped.

### 12.2 The automatic tries, in order

For each reference the main file names, after the allowlist (3.3) and tolerant matching (12.5)
find nothing in the set, a model fetched by URL tries, in this order, stopping at the first file:

1. **Beside the main file** -- the reference resolved against the main file's URL, as today.
2. **With the main URL's query** -- only when the main URL has a query and try 1 answered 401 or
   403: the same URL once more, carrying the main URL's query. Same origin and same folder tree,
   so the query goes back to the server that issued it.
3. **By base name in the usual texture folders** -- only for a texture whose reference has no
   folder or whose folder was not found: `<folder of main>/<base>`, then `textures/<base>` and
   `Textures/<base>` below the main file's folder. Never above it, never another host.

Every try counts toward the set's `maxBytes` and toward a new cap of **16 requests per part**
beyond the first; the set's 64-file cap is unchanged. A try that answers with a web page (12.6
detection) is a miss, not a file. The first part not found after the tries is not the end of the
load: the element finishes trying every reference it can see, then reports every part still
missing at once (12.4).

### 12.3 A `.zip` URL

A URL whose bytes start `PK\x03\x04` is unpacked exactly as a dropped zip (3.1): fflate's
streaming `Unzip`, real byte counts, at most 1,024 entries, names of at most 512 characters, a
ratio cap of 100 per entry, `__MACOSX/` skipped, no zip inside a zip, the common top folder
stripped. The main file is picked as for a drop (3.2), and a zip never triggers the automatic
tries of 12.2: what is not inside it is a row (12.4). This already works for a URL a layer or
`assets.add` names; this section fixes it as a contract with its own tests.

When the zip holds several models (`E_MODEL_AMBIGUOUS { candidates }`), the caller picks one with
`assets.supply(ref, { main })` (12.4) instead of re-adding the URL. `candidates` is cut to its
first 64 paths, sorted, with `more: number` giving how many were left out.

### 12.4 Supplying a part afterwards: `assets.supply`

A model that is missing parts is held by the session instead of thrown away, so the reader can
hand over the parts and the load carries on from where it stopped.

```ts
export interface AssetsApi {
    // ...section 2.4, unchanged...
    /**
     * Answer what a rejected model is missing, then check it again. Resolves with the new record:
     * accepted, or rejected with what is still missing (an .mtl, once given, may name pictures).
     * @param ref - What a layer named (a URL or an asset id), or the record's id.
     */
    supply(ref: string, answer: PartAnswer, options?: { signal?: AbortSignal }): Promise<AssetRecord>;
}

export type PartAnswer =
    /** Fetch this URL as the part. Another host is allowed, through session.network (12.7). */
    | { readonly name: string; readonly url: string }
    /** This file is the part. With no name, it is matched to a missing part by path, then by base name. */
    | { readonly name?: string; readonly file: NamedBlob | Uint8Array }
    /** Use a file the set already holds for an ambiguous reference (E_MODEL_PART_AMBIGUOUS). */
    | { readonly name: string; readonly use: string }
    /** Draw without this part. Pictures and .mtl files only; never a .bin or other geometry. */
    | { readonly name: string; readonly skip: true }
    /** Which file of the set is the model (E_MODEL_AMBIGUOUS). */
    | { readonly main: string };
```

The simple path, for a page with no interface of its own:

```ts
const rack = await graph.session.assets.ready("https://example.com/rack.gltf");
for (const problem of rack.problems) {
    if (problem.code === "E_MODEL_MISSING_FILE") {
        const url = prompt(`URL of ${problem.params.name}?`);
        if (url) await graph.session.assets.supply(rack.url ?? rack.id, { name: String(problem.params.name), url });
    }
}
```

Rules:

- **What is reported.** A rejected record lists one `E_MODEL_MISSING_FILE` per part still
  missing, all at once, each with the new params `role` and `optional` (12.8), in the order the
  main file names them. `E_MODEL_PART_AMBIGUOUS` (12.5) is listed the same way. The reader sees
  every row in one go, except the pictures an `.mtl` names, which appear once the `.mtl` is in.
- **Matching a name.** `name` is matched against the missing parts' `name` exactly, then after
  normalizing the path (3.3) and case. A file with no `name` is matched by its
  `webkitRelativePath` (normalized), then by its base name, case-insensitively; it must match
  exactly one missing part, else the call settles with `W_MODEL_PART_UNUSED { fileName }` added
  and nothing else changed. A name no part is missing is the same warning, not an error: a
  reader who drops a folder on one row loses nothing.
- **Resume.** The part is checked with the same checks as any file in the set (an image must
  read as PNG, JPEG or WebP; sizes, counts and structure as in 3.3), added under the missing
  part's name, and the whole set is checked again from the main file. Calls for one ref run one
  at a time in the order made. The record keeps its provisional id while rejected and takes its
  digest id when accepted; `model:changed` fires `pending`, then `accepted` and `drawn` (or
  `rejected` with what is still missing), under the ref the layers named, so every layer naming it
  redraws with no new call.
- **What is held.** A rejected model's set stays in the session until it is accepted, removed
  (`assets.remove(ref)` also takes a URL or provisional id), or the session ends. Held bytes count
  toward `sessionBytes` like stored ones; no time limit ends a hold.
- **Ids.** The digest covers the files as given, supplied parts included, under the names the
  model uses. Skipped parts are listed on the record (`skipped`, below) and are not in the
  digest. The same files with the same skips are the same asset however they arrived.
- **Errors in the call itself** are thrown as `GraphtyError`: `E_MODEL_UNKNOWN_ASSET` for a ref
  the session does not hold; `E_BAD_COMMAND` for a record that is not rejected for a missing,
  ambiguous or unchosen part; `E_MODEL_PART_REQUIRED { name, role }` for a skip of a geometry part.
- **AssetRecord** gains `readonly skipped?: readonly string[]` (the parts drawn without) and
  `ModelChange` is unchanged.

Skipping a picture draws the material without that map (a glTF image whose name was skipped is
replaced at load by a 1 x 1 white PNG made by the element, so `baseColorFactor` still applies; an
OBJ `map_*` line naming it is dropped before loading) and adds `W_MODEL_PART_SKIPPED { name,
role }` to the accepted record. Skipping an `.mtl` draws the OBJ with the default material. A
skip is remembered: saving embeds the set with `skipped` (12.9), so reopening asks nothing.

### 12.5 Tolerant matching

A reference that is not a key of the set as written is matched, in order:

1. **Path, normalized.** Backslashes become slashes, `./` is dropped, percent-escapes decoded
   once (3.3). `textures\wood.png` finds `textures/wood.png`.
2. **Path, any case.** `Textures/Wood.JPG` finds `textures/wood.jpg`.
3. **Base name, any case, anywhere in the set.** `wood.png` finds `maps/wood.png`.

A local absolute path an author's exporter wrote (`C:\Users\me\wood.png`, `/home/me/wood.png`,
`file:///C:/wood.png`) is treated as its base name and matched by step 3 only; it is never
fetched as written. `http(s):`, `//host`, `blob:` and `..` leaving the set stay
`E_MODEL_EXTERNAL_URL` (3.3). Steps 2 and 3 apply only when exactly one file matches; that use is
reported as `W_MODEL_PART_SUBSTITUTED { name, used, referencedBy }` on the accepted record. Two or
more matches are `E_MODEL_PART_AMBIGUOUS { name, referencedBy, candidates }`, which a caller
settles with `supply(ref, { name, use })`; the element never guesses. For a model fetched by URL,
tolerant matching runs over the set before any try of 12.2, so a file already fetched is never
requested twice. The loader sees only the matched paths: the request guard's map (3.3) and the
OBJ rewrite use the resolution, so a substituted file is the only one Babylon can reach.

### 12.6 A URL that is a web page

A response whose first non-whitespace bytes (after a UTF-8 byte order mark, within the first
1,024 bytes) are `<!doctype html`, `<html`, `<head` or `<body`, case-insensitively, and that
matches no model or picture format by its bytes (section 5), is a web page. Detection is by bytes
only: hosts send `text/plain` and `gltf-binary` for real models, so the type header decides
nothing.

- As the main file, or as a part someone supplied by URL: `E_MODEL_WEB_PAGE { url, host, part?,
suggested? }`. `url` is shown without its query. `part` is the part's name when it was a
  supplied part. `suggested` is set only when the element knows the address of the file behind a
  page by its pattern, with no fetch: `github.com/<o>/<r>/blob/<ref>/<path>` gives
  `https://raw.githubusercontent.com/<o>/<r>/<ref>/<path>`, and `<gitlab host>/<p>/-/blob/<ref>/<path>`
  gives the same with `/-/raw/`. The element does not follow it: it is another address, which the
  application offers to the reader and which then passes the gate like any other.
- As an automatic try (12.2): a miss, so the part becomes a row instead of a web page stored as a
  `.bin`.

### 12.7 Security

Nothing in this section raises a limit or opens a path the design closed.

- **Parts by URL go through the gate.** A supplied part URL on the main file's own origin is
  fetched as an automatic try is. On any other host it is a question in `session.network` (2.6),
  `W_URL_NEEDS_APPROVAL` with `kind` the part's kind (`"model"` for geometry and `.mtl`,
  `"texture"` for a picture) and the new `by: "supplied"` (`NetworkRequestAsker` is an open union),
  unless the host is already allowed by the page, the reader or the project. A denied part is
  `E_MODEL_URL_BLOCKED { hosts, denied: true, part }` on the record and stays a row.
- **Private addresses stay refused** for a supplied part URL, whoever calls `supply`: private,
  loopback and link-local hosts (`isPrivateHost`) are `E_MODEL_URL_BLOCKED`. A developer with a
  part on their own machine passes it as a file.
- **The query is kept for the fetch** (signed cloud URLs need it) and removed everywhere it could
  be shown or kept: problems, events, `network.pending()` and saved projects (12.9).
- **No credentials.** Every request is made as in 3.1: `credentials: "omit"`, `referrerPolicy:
"no-referrer"`, the time limit, a URL holding a user name and password refused.
- **Limits.** Supplied and fetched parts count toward the set's `maxBytes` (text files toward
  `maxTextBytes`), the 64-file cap, `maxTextureBytes` and every structure check; the automatic
  tries toward 16 requests per part. A zip by URL has every limit of a dropped zip.
- **Tolerant matching stays inside the set.** It only picks among files the set already holds;
  it never builds a request from a local absolute path.
- **The request guard is unchanged:** Babylon reaches only the `blob:` URLs made for the load.

### 12.8 Codes

New codes (graphty-element `codes.ts`), all `{ code, params }`, params from files cut to 256
characters, URLs without their query:

| Code                       | params                               | When                                                                           |
| -------------------------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| `E_MODEL_WEB_PAGE`         | `url`, `host`, `part?`, `suggested?` | The URL answered with an HTML page, not a model or picture (12.6)              |
| `E_MODEL_PART_AMBIGUOUS`   | `name`, `referencedBy`, `candidates` | Tolerant matching found more than one file (12.5)                              |
| `E_MODEL_PART_REQUIRED`    | `name`, `role`                       | Thrown by `supply` for a skip of a geometry part (12.4)                        |
| `W_MODEL_PART_SUBSTITUTED` | `name`, `used`, `referencedBy`       | A reference resolved by case or base name to the one file that matched (12.5)  |
| `W_MODEL_PART_SKIPPED`     | `name`, `role`                       | The model is drawn without a picture or `.mtl` the reader chose to skip (12.4) |
| `W_MODEL_PART_UNUSED`      | `fileName`                           | A supplied file matched no missing part (12.4)                                 |

New params on existing codes (additive):

| Code                   | New params                                                                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_MODEL_MISSING_FILE` | `role: "geometry" \| "materials" \| "texture"` (OPEN UNION), `optional: boolean` (true for a skippable part), `tried?: string[]` (the addresses tried, without queries, at most 4) |
| `E_MODEL_URL_BLOCKED`  | `part?` (the part's name, for a supplied part)                                                                                                                                     |
| `E_MODEL_AMBIGUOUS`    | `more?: number` (12.3)                                                                                                                                                             |

`role` is `"geometry"` for glTF `buffers[].uri` and anything an OBJ needs to have faces,
`"materials"` for an `.mtl`, `"texture"` for glTF `images[].uri` and `map_*` lines.

### 12.9 Saving

A model with supplied or skipped parts is always embedded: its parts came from several places,
some by signed URLs that expire, so no single URL can bring it back. `save({ assets: { [url]:
"url" } })` for such a model embeds it and reports `W_MODEL_NOT_KEPT_BY_URL { url, reason:
"parts" }` in the save result. The `graphty-assets` entry gains `skipped?: string[]` (schema and
`design/documents/assets.md` updated, a conformance row added); reading an entry with `skipped`
applies the same skips before checking, so the reopened model is the same asset with the same
id. A part's URL is never written to a project file.

### 12.10 The graphty app: missing-part rows

The app shows facts the element reports; it decides nothing. Where: under the model choice in
the Model picker (`ModelPicker.tsx`) after a paste or drop, and under the layer's model line when
its model was rejected for missing parts (the warning badge opens the same rows).

- **One row per `E_MODEL_MISSING_FILE` and `E_MODEL_PART_AMBIGUOUS`**, in the record's order, as
  Figma property rows: the label column is the part's file name (`params.name`, truncated in the
  middle, full name in the tooltip) with a small role tag the app words from `role` ("Mesh",
  "Materials", "Texture"); the value column holds the controls. No sentences in the rows.
- **Controls per row:** a "Paste URL" text field (Enter submits `supply(ref, { name, url })`), a
  "Drop file" target that is also a button opening the file chooser (`supply(ref, { name, file
})`), and, only when `params.optional` is true, "Load without it" (`supply(ref, { name, skip:
true })`). An ambiguous row shows a select of `params.candidates` instead (`supply(ref, { name,
use })`). A row shows a spinner while its call runs and disappears when the part is in; a new
  row appearing (pictures an `.mtl` names) is announced to screen readers.
- **Dropping several files on the rows block** (not one row) sends each with no `name`, so the
  element matches them; `W_MODEL_PART_UNUSED` shows as an inline note under the block.
- **A row's error** is written next to its field from the codes: `E_MODEL_FETCH`,
  `E_MODEL_URL_BLOCKED`, `E_MODEL_WEB_PAGE` ("That address is a web page, not the file." and, with
  `suggested`, a "Use the file's address" button that pastes it), `E_MODEL_TOO_LARGE`.
- **A pasted URL on another site** raises the app's existing web-address question (2.6) through
  `network:pending`; the app words `by: "supplied"` as "Load a part of this model from <host>?".
- **Several models in a zip** (`E_MODEL_AMBIGUOUS`): one row labeled "Model" with a select of
  `candidates` (and "+N more" from `more`), answered with `supply(ref, { main })`.
- **Warnings** on the accepted model, worded from codes: `W_MODEL_PART_SUBSTITUTED` ("Used
  maps/wood.png for wood.PNG"), `W_MODEL_PART_SKIPPED` ("Drawn without wood.png").

### 12.11 Work packages

| #   | Package                                                       | Contents                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13  | Element: resolution and detection (`./session`, Babylon-free) | Tolerant matching (12.5); every missing part reported at once with `role`, `optional`, `tried`; the automatic tries of 12.2; web-page detection and `suggested` (12.6); zip URL contract and `more` (12.3); new codes |
| 14  | Element: `assets.supply` and resume                           | `supply` with every `PartAnswer`; held sets; the gate for part URLs (`by: "supplied"`); skips drawn as described; redraw of every layer naming the ref; `skipped` on the record and in the assets member (12.9)       |
| 15  | App: missing-part rows                                        | 12.10                                                                                                                                                                                                                 |

Section 13 replaces package 15 and the placement in 9.1, 9.3 and 12.10 for the tier 3 Style
panel.

## 13. Models and pictures in the tier 3 Style panel

**Owner request (2026-10-20):** build model loading on the tier 3 Style panel (branch
`design/studio-tier3`, `design/ui/studio/tier3/design.md`), following its Figma interaction
patterns, with pop-overs where needed. Three reports drive the changes beyond the move:

- `police.glb` from the Kenney car kit (`https://kenney.nl/assets/car-kit`) was refused with
  "police.glb needs Textures/colormap.png", and there was no way to hand over `colormap.png` alone.
- Dropping the picture on the model's drop zone was not an obvious way to add it.
- Dropping `colormap.png` there gave "PNG files cannot be loaded yet". The cause: the old
  ModelPicker accepted the lone PNG as a picture asset (`kind: "image"`) and wrote its id to
  `node.model`; the model loader then refused a picture (`loadModel.ts`,
  `E_MODEL_FORMAT_UNSUPPORTED { format: "png" }`), and the app worded that code as "cannot be
  loaded yet".

So: a model is a choice in the Shape field; a picture has a target of its own; a model missing
parts says so with a chip whose pop-over takes each part; and a picture dropped where a model is
expected is either the part a waiting model needs or an offer to use it as the layer's picture.

What stays as built: the element's loading, checks, limits and codes (sections 3 to 8, 12); the
web-address question (2.6); the project storage (7.3). Tier 3's `decided.md` is binding on
keyboard, Escape, focus and words; nothing here reverses an entry in it.

### 13.1 Where models and pictures sit

| Thing                                                                     | Where                                                                    | Why there                                                                                                                          |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `node.model`                                                              | Nodes, Shape, the Shape field: a Model tile at the end of the shape grid | A model is what the node is drawn as, so it is a shape choice (Figma: one field, one question). `node.shape` stays the placeholder |
| `node.modelSourceUp`, `modelTurn`, `modelTint`, `modelFit`, `modelCenter` | Shape's settings pop-over, only while the Shape field holds a model      | Round 6: "one '+' item per thing drawn, sub-settings in the part's pop-over". They mean nothing on a built-in shape                |
| `node.texture`                                                            | Nodes, Fill, a Picture row (Fill's "+" lists Color and Picture)          | Figma's Fill section takes an image as well as a color. A picture covers a model or a built-in shape, so it is not a model setting |
| Missing parts of a model                                                  | A warning chip in the Shape field; its pop-over lists each part as a row | The problem belongs to the field that named the model; the rows replace the sentence                                               |

Solid / Wireframe and Shown / Hidden stay where the current build puts them (Rendering and
Visibility, design.md 1.1 as built); section 6 of the tier 3 design places them in Shape's
settings, and when that lands they sit under the model rows in the same pop-over (13.3).

`node.modelAnimation` has no row: the channel is a later work package (3.6). Its row ("Motion:
Still | Play") joins Shape's settings when the channel exists. Pictures have no Fit row: no
channel scales or repeats a picture on a node (2.8); one is added only with such a channel.

### 13.2 Choosing a model

The Shape field opens the glyph grid tier 3 already has (25 catalog glyphs with names). The grid
gains one tile at its end, Model, drawn as a cube with a corner arrow:

```
 NODES
  Shape                                            [+]
   [(o) Sphere      v]  [ 1.0    ]   (=) (-)          Shape | Size
        |
        v  (the grid pop-over, 240 px, left of the panel)
   +----------------------------------------+
   | Shape                                  |
   | [o] [#] [^] [<>] [*] [+] [()] [=] ...   |   25 catalog glyphs, arrows walk the grid
   | ...                                    |
   | -------------------------------------- |
   | [cube->] Model...                      |   last tile, full width: opens Models
   +----------------------------------------+
```

Model... replaces the grid with the Models pop-over in the same place (one pop-over at a time,
decision 1.13). Its header has a back arrow to the grid.

```
   +----------------------------------------+
   | (<) Models                         (x) |
   | Samples                                |
   |  [img]   [img]   [img]   [img]         |   catalog.models(): thumbnail + plainName
   |  Box     Server  Person  Tree          |
   | In this project                        |
   |  [cube] police          [cube] rack    |   assets.list(), kind "model", newest first
   | -------------------------------------- |
   |  [ Paste URL                    ] (->) |   Enter adds
   |  +----------------------------------+  |
   |  |  (up) Choose files   (dir) Folder |  |   drop zone: files, a folder or a .zip
   |  +----------------------------------+  |
   |  (chip!) Not a model  [Use as picture] |   only after a lone picture arrived (13.5)
   +----------------------------------------+
```

- **Picking** a sample or a project model writes `node.model` on the layer and closes the
  pop-over; the Shape field then shows the model's thumbnail (a sample's catalog thumbnail, else
  the cube glyph) and its name (`modelName`: a sample's plainName, else the main file's name
  without extension):

    ```
     Shape                                            [+]
      (gear) [(img) police   v]  [ 1.0    ]   (=) (-)
    ```

- **Paste URL, Choose files, Folder and a drop** add through `session.assets.add`. Accepted: the
  same as picking. Rejected for missing parts: `node.model` is still written (the node draws its
  shape meanwhile, as for any pending model) and the field carries the parts chip (13.4), so the
  reader finishes the model where it is named, with the pop-over open on the parts. Any other
  rejection: an error chip under the URL field or drop zone (13.6); nothing is written.
- **"In this project"** is the session's own list, not a history across projects: a model's bytes
  live in the project file (7.3), so a recent list across projects would hold models that cannot
  be loaded.
- **Choosing a built-in shape** in the grid while the field holds a model removes `node.model`
  from the layer and writes `node.shape`, one undo step. The model stays in "In this project".
- **The settings button** ("gear", Figma's settings button at the start of a row) appears on the
  Shape row while it holds a model. Without a model there is nothing in it, so there is no button.

### 13.3 The model's settings

```
   +----------------------------------------+
   | Model settings                     (x) |
   | Up        [ Detected (Y)        v]     |   node.modelSourceUp; Y, Z, -Y, -Z, X, -X
   | Turn      [ 0       ] deg       (=)    |   node.modelTurn, scrub on the name
   | Color     [ Model's own         v]     |   node.modelTint: Model's own | Node color on top | Node color only
   | Fit       [ Keep proportions    v]     |   node.modelFit: Keep proportions | Stretch
   | Center    [ Middle              v]     |   node.modelCenter: Middle | File's origin
   | (Solid | Wireframe and Shown | Hidden   |
   |  join here when design 6 lands)        |
   +----------------------------------------+
```

- Compact property rows; each field unset shows the element's default as its placeholder, the
  same rule as every tier 3 select; a set field has its minus.
- `W_MODEL_UP_GUESSED` marks Up with a warning chip ("Guessed"), hover: "up axis guessed from the
  file"; `W_MODEL_COLOR_IGNORED` marks Color the same way ("Color unused"). The chips replace
  9.3's prominent "Turn upright" and "Use node color" buttons; Up's list is the turn-upright
  control.
- Every row writes one channel through `styles.update`; Turn varies like any number (vary glyph).

### 13.4 Missing parts

When the model a layer names is rejected with `E_MODEL_MISSING_FILE` or `E_MODEL_PART_AMBIGUOUS`,
or the session holds it waiting for parts, the Shape field carries a chip after the name:

```
   Shape                                            [+]
    (gear) [(img) police  (!1)  v]  [ 1.0  ]   (=) (-)
                          ^ chip: "1 missing", hover: "Textures/colormap.png"
```

The chip is a button (named "police: 1 file missing"). It opens the Parts pop-over:

```
   +----------------------------------------------+
   | police.glb                               (x) |
   |                                              |
   | (pic) colormap.png   Texture                 |   label column: name (middle-cut),
   |   [ Paste URL                       ] (->)   |     kind icon + role word
   |   [(up) Choose]  [Load without it]           |   "Load without it" only when optional
   | (mesh) police.bin    Mesh                    |
   |   [ Paste URL                       ] (->)   |
   |   [(up) Choose]                              |
   |                                              |
   |  Drop files anywhere here                    |   the whole pop-over is a drop target
   +----------------------------------------------+
```

- **One row per missing part**, in the record's order, from `problems`: label `params.name`
  (truncated in the middle, full path in the tooltip), the role as an icon and one word ("Mesh",
  "Materials", "Texture" from `role`). An ambiguous part's row has a select of
  `params.candidates` instead of the URL field.
- **Paste URL** (Enter or the arrow) calls `assets.supply(ref, { name, url })`. A URL on another
  host raises the existing web-address question (2.6), worded for `by: "supplied"`.
- **Choose** opens the file chooser for that row (`supply(ref, { name, file })`).
- **Drop on a row** supplies to that row; **drop anywhere else in the pop-over** (or on the Models
  pop-over's drop zone while a model waits) calls `supply(ref, { file })` with no name per file,
  so the element matches by path, then base name. Dropping `colormap.png` from the kit's
  `Textures` folder supplies `Textures/colormap.png`. A folder or zip drop supplies every part it
  holds.
- **Load without it** (`params.optional`, pictures and `.mtl` only) calls `supply(ref, { name,
skip: true })`.
- A row shows a spinner while its call runs and leaves when the part is in; a new row (pictures
  an `.mtl` names) is announced. When the last row leaves, the pop-over closes, the chip goes,
  focus returns to the Shape field, and the model draws (`model:changed` redraws every layer
  naming the ref; nothing in the app re-applies anything).
- **Several models in a zip** (`E_MODEL_AMBIGUOUS`): one row labeled Model with a select of
  `candidates` ("+N more" from `more`), answered with `supply(ref, { main })`.
- A pop-over row never holds a sentence: a failed supply puts an error chip on that row (13.6).

### 13.5 A picture where a model was expected

A PNG, JPEG or WebP never gets "cannot be loaded". Wherever models are taken -- the Models
pop-over, the Parts pop-over, the canvas, the start screen -- files go first to
`session.assets.offer(files)` (13.8), which supplies each file a waiting model is missing (by path,
then base name, exactly one match). What is left:

- **In the Models pop-over:** a lone picture becomes an image asset, and the pop-over shows the
  chip "Not a model" with the button "Use as picture", which writes `node.texture` on the layer
  (one click, one undo step) and closes the pop-over. Nothing is written to `node.model`.
- **On the canvas or the start screen:** a picture is drawn on the selected nodes, or on every
  node when none is selected, as one undoable layer, the same gesture as a dropped model (9.2);
  the notice names it ("Nodes drawn with colormap") with Undo.
- **A picture named by `node.model` anyway** (an old project, code) is refused by the element with
  `E_MODEL_FORMAT_UNSUPPORTED` carrying the new param `assetKind: "image"`; the app shows the
  chip "Picture, not a model" with the button "Use as picture", which moves the id from
  `node.model` to `node.texture` in one undo step.

### 13.6 Errors and warnings as chips

Every problem the element reports on a model or picture is a chip next to the control that
caused it, worded by the app from the code; the hover tooltip holds the detail (file name, host,
limit), one line. No sentence sits in the panel.

| Code                                             | Chip           | Tooltip                              | Action on the chip                      |
| ------------------------------------------------ | -------------- | ------------------------------------ | --------------------------------------- |
| `E_MODEL_MISSING_FILE`, `E_MODEL_PART_AMBIGUOUS` | "N missing"    | the part names                       | opens the Parts pop-over                |
| `E_MODEL_FORMAT_UNSUPPORTED`                     | "FBX not read" | "Export as GLB" (format from params) | --                                      |
| ... with `assetKind: "image"`                    | "Picture"      | "this file is a picture"             | Use as picture                          |
| `E_MODEL_WEB_PAGE`                               | "Web page"     | the host                             | "Use file address" when `suggested`     |
| `E_MODEL_FETCH`                                  | "Not reached"  | host and status                      | Retry                                   |
| `E_MODEL_URL_BLOCKED`                            | "Blocked"      | the host                             | --                                      |
| `E_MODEL_TOO_LARGE`                              | "Too large"    | what and the limit                   | --                                      |
| other `E_MODEL_*`                                | "Not loaded"   | the code's words                     | --                                      |
| `W_MODEL_PART_SUBSTITUTED`                       | "Substituted"  | "used maps/wood.png for wood.PNG"    | --                                      |
| `W_MODEL_PART_SKIPPED`                           | "Without N"    | the skipped names                    | opens the Parts pop-over to supply them |
| `W_MODEL_PART_UNUSED`                            | "Not needed"   | the file name                        | --                                      |

A layer whose model is rejected keeps its warning badge in the layer tree (9.5). The web-address
question stays the dialog it is today (2.6).

### 13.7 Pictures (textures)

Fill's "+" lists Color and Picture. Picture adds the row and opens its pop-over at once (round 6:
picking a part opens its pop-over):

```
  Fill                                             [+]
   Color    [# D55E00      ]                (=) (-)
   Picture  [(thumb) colormap  v]               (-)
        |
        v
   +----------------------------------------+
   | (<) Picture                        (x) |
   | In this project                        |
   |  [thumb] colormap   [thumb] wood       |   assets.list(), kind "image"
   | -------------------------------------- |
   |  [ Paste URL                    ] (->) |
   |  +----------------------------------+  |
   |  |  (up) Choose picture             |  |   drop zone: PNG, JPEG, WebP
   |  +----------------------------------+  |
   +----------------------------------------+
```

- The thumbnail is the picture itself (an object URL of `assets.files(id)`'s one file).
- Works on a model (every material's base color) or a built-in shape (2.8). With a model and
  Color "Model's own" the picture shows its own colors; "Node color on top" tints it.
- A model file dropped here is refused by the element (`E_MODEL_FORMAT_UNSUPPORTED`,
  `assetKind: "model"`); the chip offers "Use as model", which writes `node.model` instead.
- Picture does not vary yet (no vary glyph): a value table of pictures is a later step.

### 13.8 What graphty-element adds for this

All additive (new method, new optional param, new codes, new export); nothing changes meaning.

1. **Finish 12.4 and 12.7:** `assets.supply`, held sets, resume, the `by: "supplied"` question,
   skips, `skipped` on the record and in the assets member (12.9), and raising the declared
   `E_MODEL_PART_REQUIRED`, `W_MODEL_PART_SKIPPED`, `W_MODEL_PART_UNUSED`.
2. **`assets.offer(files, options?)`:** hands files to the session; every file that exactly one
   held model is missing (path, then base name, case-insensitive) is supplied to it. Resolves
   `{ supplied: { ref, name, fileName }[], rest: NamedBlob[] }`. A drop target calls it first so
   a picture reaches the model that needs it without the application matching names itself.
3. **`assets.waiting()`:** the held records, so a drop target can say whether any model waits.
4. **`E_MODEL_FORMAT_UNSUPPORTED` params `assetKind: "image" | "model"`** when `node.model` names
   a picture or `node.texture` names a model.
5. **`detectAssetKind({ filename, head })` in `./catalog`:** `"model" | "image" | undefined`,
   beside `detectModelFormat`, so drop targets classify a picture without reading formats
   themselves.

### 13.9 Keyboard and names

| Control               | Accessible name (= tooltip)                  | Keys                                                                                                                            |
| --------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Shape field           | "Node shape, police" / "Node shape, Sphere"  | Enter, Space or ArrowDown opens the grid                                                                                        |
| Shape grid            | "Node shapes"                                | One Tab stop; arrows walk, stop at edges; Enter takes; Home / End; End reaches Model...                                         |
| Model... tile         | "Model..."                                   | Enter opens Models with focus on the first sample                                                                               |
| Models pop-over       | "Models"                                     | Tab: samples (one grid stop), project models (one grid stop), Paste URL, Choose files, Folder; Escape closes to the Shape field |
| Back arrow            | "Back to shapes"                             | Enter; Alt+ArrowLeft anywhere in the pop-over                                                                                   |
| Paste URL             | "Model address"                              | Enter adds; Escape reverts typed text (decided.md, 2026-10-19)                                                                  |
| Choose files / Folder | "Choose model files" / "Choose model folder" | Enter opens the chooser                                                                                                         |
| Settings button       | "Model settings"                             | Enter opens; Escape closes to the button                                                                                        |
| Parts chip            | "police: 1 file missing"                     | Enter opens Parts with focus in the first row's URL field                                                                       |
| Part row URL          | "colormap.png address"                       | Enter supplies                                                                                                                  |
| Part row Choose       | "Choose colormap.png"                        | Enter opens the chooser                                                                                                         |
| Load without it       | "Load without colormap.png"                  | Enter                                                                                                                           |
| Use as picture        | "Use colormap as picture"                    | Enter                                                                                                                           |
| Picture row           | "Node picture, colormap"                     | Enter opens the Picture pop-over; Delete removes the row (decision 1.1)                                                         |

Drop is never the only way: every drop target is also a Choose button. A part arriving, a row
leaving and a chip appearing are announced in the panel's live region ("colormap.png added",
"police drawn").

### 13.10 Build packages

In order; each owns the files it lists. Element packages land first; app packages consume only
the published element API.

**P1. graphty-element: supply and resume** (finishes 12.4, 12.7, 12.9)

- Files: `graphty-element/src/session/assets/AssetsApi.ts`, `intake.ts`, `references.ts`,
  `gltfChecks.ts`, `textFormats.ts`, `projectMember.ts`; `src/session/network/*` (the
  `by: "supplied"` asker); `src/models/loadModel.ts` (skipped picture as 1 x 1 white,
  dropped `map_*` line); `src/errors/codes.ts`; `api/*.api.md`; `docs/guide/node-models.md`;
  tests `test/session/assets-supply.test.ts`, `test/session/network.test.ts`, a browser test
  `test/browser/model-supply.test.ts`; fixtures `test/fixtures/models/police.glb` (a small GLB
  whose `images[0].uri` is `Textures/colormap.png`) and `Textures/colormap.png`, made by
  `scripts/make-sample-models.mjs`.
- Acceptance:
    - police.glb alone is rejected with one `E_MODEL_MISSING_FILE { name: "Textures/colormap.png",
role: "texture", optional: true }` and held; `supply(ref, { file: colormap.png })` with no
      name matches by base name, the record is accepted with its digest id, and `model:changed`
      fires pending, accepted, drawn under the same ref.
    - The same with `{ name, url }` on the main file's origin; on another host it waits as
      `W_URL_NEEDS_APPROVAL { by: "supplied", kind: "texture" }` and `deny` gives
      `E_MODEL_URL_BLOCKED { part }`; a private host is refused whoever asks.
    - `{ name, skip: true }` draws without the picture with `W_MODEL_PART_SKIPPED`; a skip of
      `police.bin` throws `E_MODEL_PART_REQUIRED`; a saved project reopens with the skip and asks
      nothing; a part's URL never appears in a saved file or a problem's params with its query.
    - The same files reached by folder, by zip and by supply give the same asset id.

**P2. graphty-element: picture routing**

- Files: `src/session/assets/AssetsApi.ts` (`offer`, `waiting`), `src/catalog/detectModel.ts`
  (`detectAssetKind`), `src/models/loadModel.ts` and `src/models/TextureCache.ts` (the
  `assetKind` param), `api/*.api.md`, the guide; tests `test/session/assets-offer.test.ts`,
  `test/catalog/detect-asset-kind.test.ts`.
- Acceptance: `offer([colormap.png])` while police waits supplies it and returns it in
  `supplied`; with nothing waiting it returns it in `rest`; two waiting models that both miss
  `colormap.png` leave it in `rest` (never a guess); `node.model` naming a picture asset gives
  `E_MODEL_FORMAT_UNSUPPORTED { assetKind: "image" }` and `node.texture` naming a model gives
  `{ assetKind: "model" }`; `detectAssetKind` reads PNG, JPEG, WebP and every model format by
  bytes, not by extension.

**P3. compact-mantine: a grid's trailing action and a file drop zone**

- Files: `compact-mantine/src/components/inputs/listbox.tsx` (an optional `footerAction` tile in
  a glyph grid, reached by End and the arrows), a new
  `compact-mantine/src/components/inputs/FileDrop.tsx` (a button that opens a chooser, optional
  folder button, a drop zone, `accept`, a hover state, named by its label), their stories and
  tests.
- Acceptance: real keyboard reaches the footer tile from the grid with End and ArrowDown from the
  last row and takes it with Enter; FileDrop opens the chooser on Enter and Space, hands over
  files from a real drop and from the chooser, and a folder pick keeps `webkitRelativePath`.

**P4. graphty app: the Shape field's models and Model settings**

- Files: `graphty/src/workspace/style/ModelsPopover.tsx` (replaces `ModelPicker.tsx`, deleted),
  `ModelSettings.tsx` (new), `ValueField.tsx` (Model tile, thumbnail and name in the Shape
  field), `PropertyRow.tsx` (settings button on the Shape row while it holds a model),
  `words.ts` (Model words, Fill section gains `node.texture`, the model channels' choice words),
  `coverage.ts` (homes for `node.model*` and `node.texture`), `canvas/models.ts` (helpers kept for
  the canvas, `offer` first), stories in `StylePanel.stories.tsx` ("Model on a layer", "Model
  settings"), test `style/__tests__/ModelsPopover.real-element.test.tsx` (replaces
  `ModelPicker.real-element.test.tsx`).
- Acceptance (real input, real element): open the Shape grid by keyboard, End, Enter on
  Model..., pick the Box sample: `node.model` is `asset:sample/box` on the layer and the field
  reads "Box"; choose `quad.glb` by the file button: drawn; pick Sphere: `node.model` removed,
  one Undo brings the model back; Up set to Z writes `node.modelSourceUp: "z"`; the coverage test
  passes with no `NOT_PLACED` model channel.

**P5. graphty app: missing parts and chips**

- Files: `graphty/src/workspace/style/PartsPopover.tsx` (new), `ModelChip.tsx` (new: every chip
  of 13.6, words from codes), `modelWords.ts` (new: moves `modelWords` out of `words.ts` and
  rewrites it as chip and tooltip words, no sentences), the Parts story, test
  `style/__tests__/ModelParts.real-element.test.tsx`.
- Acceptance, the Kenney car kit case, each by real input in the app with the real element:
    - **By folder:** the Folder button with `police.glb` and `Textures/colormap.png` draws police
      with no chip.
    - **By zip:** the same two files zipped, dropped on the drop zone: drawn, no chip.
    - **By the row:** `police.glb` alone shows the "1 missing" chip; Enter opens Parts; dropping
      `colormap.png` on its row (and, in a second run, anywhere in the pop-over, and in a third the
      Choose button) draws police; the chip and pop-over go; focus is on the Shape field.
    - **By URL:** police.glb by URL with colormap.png served elsewhere on the same origin; pasting
      that address in the row draws police; an address on another host shows the web-address
      question first.
    - Load without it gives "Without 1"; a GitHub blob page address gives "Web page" with Use file
      address, which fills the field with the raw address.

**P6. graphty app: Picture row and picture routing**

- Files: `graphty/src/workspace/style/PicturePopover.tsx` (new), the Picture row's entry in
  `PropertyRow.tsx` (after P4), `canvas/models.ts` and `canvas/useCanvasDrop.ts` (pictures on the
  canvas through `offer`, then one undoable layer with `node.texture`), `start/open.ts` (the same
  on the start screen), the Picture story, test
  `style/__tests__/Picture.real-element.test.tsx`.
- Acceptance: Fill's "+" > Picture opens the pop-over; choosing `colormap.png` writes
  `node.texture` on a sphere layer and on a model layer; dropping `colormap.png` in the Models
  pop-over with nothing waiting shows "Not a model" and Use as picture writes `node.texture`, not
  `node.model`, and the words "cannot be loaded" appear nowhere; dropping it on the canvas with
  police waiting supplies police instead of making a layer.

---

See also: `design/documents/container.md` for the project file container this design extends.
