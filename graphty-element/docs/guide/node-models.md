# Drawing Nodes as Models

A node can be drawn as a 3D model -- a server rack, a person, a tree, a building -- instead of a
sphere or a box. A style layer says which nodes and which model file; graphty-element fetches the
file, checks it, sizes it to the node, centers it, lights it, and draws every matching node with
one shared copy. You do not need to know anything about 3D file formats to use it.

## Quick start

```ts
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
element.nodeData = [
    { id: "web", kind: "server" },
    { id: "db", kind: "server" },
    { id: "alice", kind: "person" },
];
element.edgeData = [
    { source: "alice", target: "web" },
    { source: "web", target: "db" },
];

await element.session.styles.add({
    name: "Servers as racks",
    target: "node",
    selector: { match: "expression", where: "data.kind == 'server'" },
    set: { "node.model": "https://example.com/models/rack.glb" },
});
```

Both server nodes are drawn as the model; `alice` keeps her ordinary shape. While the model
downloads, and if it cannot be drawn, each server node keeps drawing its ordinary shape
(`node.shape`), so a node is never missing from the picture.

The server that hosts the file must allow other sites to read it (CORS). If yours does not,
download the file and give it to the element as a file instead (see
[Files the reader chooses or drops](#files-the-reader-chooses-or-drops)).

## Knowing when it is drawn, or why not

`styles.add` resolves when the layer is added, not when the model has arrived. To wait for the
model, ask for the same string the layer names:

```ts
const record = await element.session.assets.ready("https://example.com/models/rack.glb");
if (record.state === "rejected") {
    for (const problem of record.problems) console.warn(problem.code, problem.params);
}
```

The element also fires a `graphty-model-change` event as each model moves through its states:
`pending`, `accepted` (the files passed every check), `drawn`, or `rejected` (the files were
refused) and `failed` (the files were fine but could not be drawn). The event fires once per model,
not once per node, and `detail.ref` is exactly what your layer wrote:

```ts
element.addEventListener("graphty-model-change", (event) => {
    const { ref, state, problems, layerIds } = event.detail;
    if (state === "rejected" || state === "failed") {
        console.warn(
            ref,
            layerIds,
            problems.map((p) => p.code),
        );
    }
});
```

A page that starts listening late reads the same facts at any time: `element.session.assets.states()`
lists the latest change of every model a layer has named, so
`states().find((m) => m.ref === ref)?.state` says where one stands now, warnings included.

Problems are codes with parameters, never sentences, so your page decides the words. Every code is
in [Problems and their codes](#problems-and-their-codes).

## The sample models

graphty-element ships four models that need no file and no network: a box, a server, a person and
a tree. Name one by its id:

```ts
await element.session.styles.add({
    name: "People",
    target: "node",
    selector: { match: "expression", where: "data.kind == 'person'" },
    set: { "node.model": "asset:sample/person" },
});
```

`session.catalog.models()` lists them, each with a `plainName` and a `thumbnail` (the URL of a
128 x 128 PNG with a transparent background), so a picker can show them:

```ts
for (const model of element.session.catalog.models()) {
    const button = document.createElement("button");
    button.innerHTML = `<img src="${model.thumbnail}" alt=""> ${model.plainName}`;
    button.onclick = () =>
        element.session.styles.add({
            name: model.plainName,
            target: "node",
            selector: { match: "everything" },
            set: { "node.model": model.id },
        });
    picker.append(button);
}
```

The same list is `MODEL_DESCRIPTORS` in `@graphty/graphty-element/catalog`, for a page that builds
its picker before any graph exists. The samples are light gray, so they color well (see
[Color](#color)), and they are free to use for anything (CC0). They are read from the package when
a layer first names them; they are never copied into a saved project.

## A model for each kind of node

Most graphs have a column that says what each node is: hosts, users and processes; suppliers,
factories and ports. One encoding draws each kind as its own model:

```ts
await element.session.styles.encode({
    column: { kind: "node", name: "kind" },
    channel: "node.model",
    values: { server: "asset:sample/server", person: "asset:sample/person" },
});
```

A kind the map does not list, and a node with no value, keeps its ordinary shape. Each model is
prepared once and shared by every node of its kind.

The values here are model ids (`asset:...`): the samples, or models added with
`session.assets.add` (below). They may also be web addresses, and a column of addresses works too
(`encode: { "node.model": { by: "data.model", scale: "passthrough" } }`); an address in an encoding
is fetched only once the reader allows its site (see
[Who may make the page fetch a model](#who-may-make-the-page-fetch-a-model)), once per address. To
use a model from the web per kind without asking, add it from your code first and use its id:

```ts
const rack = await element.session.assets.add("https://example.com/models/rack.glb", { name: "asset:rack" });
// rack.id is "asset:rack"; name it in the encoding's values.
```

## Files the reader chooses or drops

A file the reader picks or drops goes through `session.assets.add`, which takes a `FileList`, one
file, several files, a folder or a `.zip`. It resolves once the files are checked:

```ts
const input = document.querySelector<HTMLInputElement>("input[type=file]")!;
input.addEventListener("change", async () => {
    const asset = await element.session.assets.add(input.files!);
    if (asset.state === "rejected") {
        for (const problem of asset.problems) console.warn(problem.code, problem.params);
        return;
    }
    await element.session.styles.add({
        name: "My model",
        target: "node",
        selector: { match: "everything" },
        set: { "node.model": asset.id },
    });
});
```

A folder, a `.zip` or a drop may hold several models. `session.assets.addEach` adds each one as its
own record, holding only the files that model uses, and gives one record for a source of one model,
just as `add` does:

```ts
const models = await element.session.assets.addEach(input.files!);
const ids = models.filter((m) => m.state === "accepted").map((m) => m.id);
```

The same files always get the same id, so adding a file twice is harmless. A drop target that
accepts both graph data and models asks `detectModelFormat` which one a file is, instead of
guessing from the name:

```ts
import { detectModelFormat } from "@graphty/graphty-element/catalog";

canvas.addEventListener("drop", async (event) => {
    event.preventDefault();
    const files = [...(event.dataTransfer?.files ?? [])];
    const first = files[0];
    if (!first) return;
    const head = new Uint8Array(await first.slice(0, 1024).arrayBuffer());
    const model = detectModelFormat({ filename: first.name, head });
    if (model === undefined) {
        await element.loadFromFile(first); // graph data
    } else if (!model.supported) {
        console.warn("A model format graphty-element cannot load:", model.format);
    } else {
        const asset = await element.session.assets.add(files);
        // ... name asset.id in a layer, as above
    }
});
```

What the element loads, and what to do with anything else:

| You have                                                                                        | What happens                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One `.glb` file                                                                                 | Loads. This is the best format to use: one file holding the shape, colors and pictures                                                                         |
| A `.gltf` file with its `.bin` and pictures                                                     | Loads when every file it names is given too: select them all, drop the folder, or zip them. A missing one is `E_MODEL_MISSING_FILE`, naming the file           |
| A glTF compressed with Draco or meshopt (`EXT_` or `KHR_meshopt_compression`)                   | Loads. The decoders come with graphty-element                                                                                                                  |
| A glTF with WebP or AVIF pictures                                                               | Loads                                                                                                                                                          |
| A glTF with KTX2 / Basis Universal pictures (`KHR_texture_basisu`)                              | Loads. The transcoders come with graphty-element                                                                                                               |
| A glTF with GPU instances (`EXT_mesh_gpu_instancing`, as `gltfpack -i` and Blender write)       | Loads, each instance drawn as its own copy. Every copy counts toward the triangle limit                                                                        |
| A glTF 1.0 file (`.gltf`, or a version 1 `.glb`)                                                | Loads, drawn with each material's diffuse color or picture. Its shaders are never read, so its `.glsl` files are not needed                                    |
| An `.obj` file, with its `.mtl` and pictures                                                    | Loads, the same way as `.gltf`. Colors on `v` lines are drawn. Pictures may be PNG, JPEG, WebP, TGA, BMP, GIF or DDS                                           |
| An `.stl` file, ASCII or binary                                                                 | Loads. Face colors (VisCAM or Materialise) are drawn; otherwise one gray. Its up direction is a guess; see [Turning a model upright](#turning-a-model-upright) |
| A `.ply` mesh: ASCII, binary or big-endian binary                                               | Loads, with its vertex colors, and its picture when a `comment TextureFile` line names one                                                                     |
| A `.ply` point cloud, a Gaussian splat `.ply` (plain or compressed), `.splat`, `.spz` or `.sog` | Loads, each point or splat drawn as a small solid in its color (`W_MODEL_POINTS_APPROXIMATED`). At most 50,000 are drawn; more are thinned evenly              |
| A `.babylon` file                                                                               | Loads its meshes and their diffuse colors and pictures                                                                                                         |
| A `.zip` holding any of the above                                                               | Loads                                                                                                                                                          |
| `.fbx`, `.usd`, `.usdz`, `.dae`, `.blend`, `.3mf`, `.bvh`                                       | Not loaded (`E_MODEL_FORMAT_UNSUPPORTED`). Open it in a 3D program such as Blender and export it as `.glb`                                                     |

Nothing is fetched from a CDN to read a model: graphty-element reads models through its
`babylonjs-models` dependency, whose package holds the Draco decoder and the KTX2 transcoders, and
meshopt's decoder is the `meshoptimizer` dependency. A bundler copies them with the code that loads
them, so a page that never loads a compressed model ships none of them. With Vite, keep the package
out of dependency pre-bundling, which moves its modules away from those files:
`optimizeDeps: { exclude: ["babylonjs-models"] }`. A file whose compressed data is damaged fails to
draw with `E_MODEL_DECODER_UNAVAILABLE` and `reason: "decode"`.

`./bundle`, the single file for a page without a bundler, carries no WebAssembly beside it, so it
leaves the Draco decoder and the KTX2 transcoders out: a glTF compressed with Draco, or one that
requires KTX2 pictures, fails with `E_MODEL_DECODER_UNAVAILABLE`, `reason: "missing"` and the
`extension`; a glTF that only uses KTX2 and also gives PNG or JPEG pictures draws those. meshopt
works in `./bundle` too. To draw Draco or KTX2 models, load graphty-element through a bundler.

`node.modelTint: true` does not yet tint the parts of a model that carry their own vertex colors;
`"replace"` paints them flat.

## A model missing a file

Some models arrive without a file they name. Kenney's kits, for one, ship each `.glb` beside a
`Textures/colormap.png` it reads. A model missing a file is rejected with one
`E_MODEL_MISSING_FILE` per missing file, and the session holds on to it, so your page can hand the
file over afterwards with `assets.supply` and the model loads from where it stopped. Every layer
that names the model draws it then, with no new call:

```ts
const car = await element.session.assets.add(policeGlb); // rejected: Textures/colormap.png is missing
await element.session.styles.add({
    name: "Car",
    target: "node",
    selector: { match: "everything" },
    set: { "node.model": car.id },
});

// Later, when the reader picks the picture. With no name, it is matched by its file name.
const ready = await element.session.assets.supply(car.id, { file: colormapFile });
// ready.state === "accepted"; the layer's model event goes pending, accepted, drawn
```

Each problem's `params.name` names the missing file, `role` says what it is for (`geometry`,
`materials` or `texture`) and `optional` whether the model can be drawn without it. The answers:

| Answer                         | What it does                                                                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{ file }` or `{ name, file }` | This file is the missing one. With no `name`, it is matched by its folder path, then by its file name, in any case                                             |
| `{ name, url }`                | Fetch it from this address. On the model's own site it is fetched at once; on another site the reader is asked first (`network:pending` with `by: "supplied"`) |
| `{ name, skip: true }`         | Draw without it: a picture or an `.mtl` only. A picture is drawn plain white, so the material's own color still shows                                          |
| `{ name, use }`                | Which file of the set is the one meant: one of an `E_MODEL_PART_AMBIGUOUS` part's candidates, or any file for a missing part whose name differs                |
| `{ main }`                     | For `E_MODEL_AMBIGUOUS`: which file of a `.zip` or folder is the model                                                                                         |

`supply` resolves with the new record: accepted, or still rejected with what is left (an `.mtl`,
once given, may name pictures of its own). A file that matches nothing missing adds
`W_MODEL_PART_UNUSED` and changes nothing; asking to skip a `.bin` or other geometry throws
`E_MODEL_PART_REQUIRED`. The accepted model's id covers every file it holds, so the same files
added as a folder, as a `.zip` or one by one get the same id. A model drawn without a file lists
it in `record.skipped`, and a saved project remembers the skip, so reopening it asks for nothing.
An address on this machine or the local network is never fetched as a missing file unless it is
the model's own site, and an address's query is used for the request and never shown or saved.

To take a model without the pictures and `.mtl` files that did not come (an "add it anyway"
button), `assets.accept(ref, { without: "missing" })` skips every one of them at once and resolves
with the accepted record, its skips in `record.skipped`. A model missing its geometry throws
`E_MODEL_PART_REQUIRED` with `details.name`, and nothing is skipped:

```ts
const waiting = await element.session.assets.add(droppedFiles); // rejected: wood.png is missing
const car = await element.session.assets.accept(waiting.id, { without: "missing" });
// car.state === "accepted"; car.skipped lists wood.png; find(waiting.id) finds it too
```

A model refused for anything other than a missing part (over a limit, unreadable) is never
accepted: `accept` throws that problem's code, such as `E_MODEL_TOO_LARGE`, with its params in
`details`.

A part that drew in the model's own color picture and was left out takes the node's color
(`node.color`) instead, in every format, so a model added without its textures can be colored by a
style layer. Once every picture that colored the model is gone, the whole model takes the node's
color, its parts colored only by a plain material color included; see-through parts (a watch's
glass) take it too and stay see-through, and a layer that sets `node.modelTint: false` keeps every
plain color.

### A second model of the same file

`assets.add` hands back the model the session already holds for the same files or address, with
its settings. To set the same file up twice -- walking on one layer, standing still on another --
add a second model of it with `assets.copy(ref)`: it has an id of its own (name it by that id, not
by the address, which still names the first) and none of the first one's settings or name.

```ts
const walking = await element.session.assets.add("https://example.com/fox.glb");
const still = await element.session.assets.copy(walking.id);
await element.session.assets.setDefaults(still.id, { style: { "node.modelAnimationSpeed": 0 } });
```

### Taking a part back out

A file handed over by mistake (the wrong picture, an `.mtl` the reader does not want) comes back
out with `assets.dropPart(ref, name)`: the model is read again from its other files, so that part
is missing again, and asked for or drawn without as any missing part. A model still waiting keeps
its id; an accepted one gives a new record, and the model as it was stays until you `remove` it
(by its id or by the address it was loaded from: either lets go of it under every name).
The model's own file cannot be dropped (`E_BAD_COMMAND`):

```ts
const again = await element.session.assets.dropPart(car.id, "Textures/wrong.png");
// again.parts lists Textures/wrong.png as "missing"
element.session.assets.remove(car.id); // let go of the model as it was
```

### Listing a model's files

`record.parts` lists a model's files, accepted or waiting: the main file (`role: "model"`), each
file it names (`geometry`, `materials` or `texture`), then the files of the set it never names
(`role: "other"`, `state: "unused"`). Each part's `state` is `found`, `substituted` (found by
another case or folder), `missing`, `ambiguous`, `skipped` or `unused`, and `file` names the file
used. A reader whose picture is named `paint.png` while the model names `Textures/colormap.png`
answers the missing part with that file:

```ts
const car = await element.session.assets.add(folderFiles);
const unused = car.parts?.filter((part) => part.state === "unused") ?? [];
await element.session.assets.supply(car.id, { name: "Textures/colormap.png", use: unused[0].name });
```

### A preview and a name

`element.modelThumbnail(ref, { size, style })` draws one node as the model, alone, exactly as the
graph draws it, and resolves with a PNG data URL: a preview for a picker before any layer names
the model. `style` takes a layer's values (`node.color` and the `node.model*` settings), so the
preview shows the tint and the up axis the layer would use. A model that cannot be drawn rejects
with its first problem's code, such as `E_MODEL_MISSING_FILE`.

```ts
img.src = await element.modelThumbnail(car.id, { size: 160, style: { "node.modelSourceUp": "z" } });
element.session.assets.rename(car.id, "Cruiser"); // record.plainName, saved with the project
```

For a preview the reader can turn, `element.modelPreview(ref, box, { style })` draws the model
live in a canvas that fills `box` (any sized element): dragging turns it, the wheel or a pinch
zooms, and the arrow keys turn it while the canvas has focus. A clip named by
`node.modelAnimation` plays at `node.modelAnimationSpeed` (Speed 0 holds the pose at
`node.modelAnimationOffset`), and `node.unlit` and `node.wireframe` are drawn too.
`preview.update(style)` redraws it with other values and keeps the reader's view;
`preview.resetView()` goes back to the first view; `preview.dispose()` removes the canvas. It
rejects with the same codes as `modelThumbnail`.

To mark the models of a set that cannot be drawn before the reader looks at each one,
`element.checkModel(ref)` builds the model once, as a node would draw it, without drawing it on
screen, and resolves with `{ drawable: true }`, or `{ drawable: false, failure }` with the code
`modelThumbnail` would reject with (`E_MODEL_PARSE`, `E_MODEL_STRUCTURE`, a missing file's code,
...). It answers `{ drawable: null }` when nothing is drawn on this page (no WebGL), which is not
the model's fault. The answer is kept by the model's files, so asking again costs nothing:

```ts
for (const record of records) {
    const check = await element.checkModel(record.id);
    if (check.drawable === false) markUndrawable(record, check.failure);
}
```

```ts
const preview = await element.modelPreview(car.id, box, { style: { "node.modelAnimation": "Drive" } });
preview.canvas.setAttribute("aria-label", "Cruiser preview, drag to turn");
await preview.update({ "node.modelAnimation": "Drive", "node.color": "#e63946", "node.modelTint": "replace" });
preview.dispose(); // when the picker closes
```

### Dropped files go to the model that waits for them

A page usually has one place to drop files, and a reader who was told a model needs
`colormap.png` drops it there. Hand every dropped file to `assets.offer` first: each file exactly
one waiting model is missing (by its folder path, then by its file name, in any case) is supplied
to that model, and what is left comes back in `rest` for the page to treat as new files.
`assets.waiting()` lists the models held for a missing file, so a drop target can show whether
any model waits.

```ts
import { detectAssetKind } from "@graphty/graphty-element/catalog";

const { supplied, rest } = await element.session.assets.offer([...files]);
for (const file of rest) {
    const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
    const kind = detectAssetKind({ filename: file.name, head }); // "model", "image" or undefined
    if (kind !== undefined) {
        const asset = await element.session.assets.add(file);
        // a model: name asset.id in node.model; a picture: in node.texture
    }
}
```

A file two waiting models both miss is never guessed: it stays in `rest`, and the page asks the
reader which model it is for and calls `supply` itself. `detectAssetKind` reads the bytes, so a
PNG named `car.glb` is a picture; it falls back to the name only when no bytes are given.

## Color

A model keeps its own colors. To color it from your data, turn on `node.modelTint`: the model's
colors are multiplied by `node.color`, so shading and detail stay and the hue follows the data.
That is why the samples are light gray: gray times a color is that color.

```ts
await element.session.styles.add({
    name: "Tinted racks",
    target: "node",
    selector: { match: "expression", where: "data.kind == 'server'" },
    set: { "node.modelTint": true, "node.color": "#e4572e" },
});
```

`"node.modelTint": "replace"` paints the whole model in `node.color`, a flat silhouette.
`"node.modelTint": "untextured"` paints only the parts with no picture and no vertex colors in
`node.color` and leaves the rest as the file draws them: an OBJ's plain colors follow your data
while its labels and decals keep their pictures. To draw a model with your styles instead of its
own materials -- its embedded pictures dropped too -- use `"replace"`.

A part the file gives no material, no picture and no vertex colors -- an OBJ loaded with no `.mtl`
(or with its `.mtl` skipped), most STL and PLY files, a glTF primitive with no material, or a
material left at its defaults (white, with no picture, map or glow) -- states no color of its own, so it is drawn in `node.color` whatever `node.modelTint`
says. A model whose materials are all plain, opaque, non-metallic grays (white and black included)
with no picture -- such as Blender's default material -- is shaded, not colored, so it too is drawn
in `node.color` while `node.modelTint` is unset; a layer that sets `node.modelTint: false` keeps
its grays. When a layer colors a model node and some part keeps the file's own color, the color is not
drawn there and the element reports `W_MODEL_COLOR_IGNORED` with the layers that set it, so the
color never disappears in silence.

## Size, turning and fitting

A model node is sized like any other node: `node.size` (and `node.width`, `node.height`,
`node.depth`) applies to it, and its largest side is as long as a built-in shape of the same
size. The model's own units do not matter. These channels adjust how it sits:

| Channel                        | Values                                                      | Default      | What it does                                                                                                                    |
| ------------------------------ | ----------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `node.model`                   | a model id or a URL                                         | unset        | Draw the node as this model. Unset: draw `node.shape`                                                                           |
| `node.modelTint`               | `true`, `false`, `"untextured"` or `"replace"`              | `false`      | Multiply the model's colors by `node.color`, or paint it (or its plain parts) in `node.color`                                   |
| `node.modelSourceUp`           | `"y"`, `"z"`, `"-y"`, `"-z"`, `"x"`, `"-x"` or `"detected"` | `"detected"` | Which direction is up in the file; the element turns that direction up on screen                                                |
| `node.modelTurn`               | degrees, -360 to 360                                        | `0`          | Turn the model about its up direction; at `0` its front faces the starting camera                                               |
| `node.modelFit`                | `"contain"` or `"stretch"`                                  | `"contain"`  | Keep its proportions, or stretch it to `node.width`, `node.height` and `node.depth`                                             |
| `node.modelCenter`             | `"bounds"` or `"origin"`                                    | `"bounds"`   | Center the model on the node, or keep the file's own pivot point                                                                |
| `node.modelDoubleSided`        | `"file"`, `true` or `false`                                 | `"file"`     | Draw the back of every triangle (an OBJ or STL whose inside shows where faces are missing), only the front, or as the file says |
| `node.modelAnimation`          | a clip's name, or `""`                                      | `""`         | Play the clip; `""` draws the model still                                                                                       |
| `node.modelAnimationSpeed`     | 0 to 16                                                     | `1`          | How fast the clip plays; `0` holds the pose at `node.modelAnimationOffset`                                                      |
| `node.modelAnimationOffset`    | seconds                                                     | `0`          | Where in the clip a node starts, or the pose it holds at speed 0                                                                |
| `node.unlit`, `node.wireframe` | `true` or `false`                                           | `false`      | Draw the model's own colors with no light, or as wires                                                                          |

Each is an ordinary style channel: a higher layer that sets one keeps what lower layers set for
the others.

### Playing an animation

A model whose file holds animation clips (a walking figure, a watch's hands) is drawn still until a
layer, or the model's own settings, names one in `node.modelAnimation`. The asset's summary lists
the clips by the names that play them; a glTF clip with no name of its own is `animation0`,
`animation1`, ... by its place in the file:

```ts
const robot = await element.session.assets.add(file);
const [walk] = element.session.assets.inspect(robot.id).animations;
await element.session.styles.add({
    name: "Walking",
    target: "node",
    selector: { match: "everything" },
    set: { "node.model": robot.id, "node.modelAnimation": walk.name, "node.modelAnimationOffset": 0.5 },
});
```

Every node plays the clip on the GPU from one texture the element bakes when the model loads, so
a thousand walking nodes cost about what one does. A pose is a clip held still:
`"node.modelAnimationSpeed": 0` with the moment in `node.modelAnimationOffset`. A skinned model's
shape keys (morph targets) are not played (`W_MODEL_ANIMATION_PARTIAL`), and a clip name the file
does not have holds the first frame (`W_MODEL_ANIMATION_UNKNOWN`). While any node plays, the
element draws every frame; once all are still or gone, it rests.

### A model's own settings

A model can carry its own `node.model*` settings, so every node that draws it starts from them,
whichever layer names it: its up axis, turn, tint, clip and pose, fit, center and sides.
`assets.setDefaults(ref, patch)` changes them as one step the reader can undo, and they are saved
with the project. A layer's own value wins over the model's, and the model's over the channel's
default. `undefined` (or `null`) takes a value out:

```ts
await element.session.assets.setDefaults(robot.id, {
    style: { "node.modelAnimation": "Walk", "node.modelTurn": 90 },
});
element.session.assets.find(robot.id)?.defaults; // { style: { ... }, hiddenTextures: [] }
```

`hiddenTextures` draws the model without some of its pictures, by the names
`assets.inspect(id).pictures` lists (each with the materials that draw it): those parts take the
node's color. Hiding every picture draws the whole model in the node's color, as adding it without
them does. glTF, OBJ, `.babylon` and PLY models list their pictures: a picture in a file of its own
by its path in the set, an embedded one (glTF, `.babylon`) by its image name or `image<index>`.
`modelThumbnail` and `modelPreview` draw with the model's settings under the `style` they are
given, and take `hiddenTextures` of their own for a picker that tries some out before keeping them.
Inside `session.transaction`, call `tx.assets.setDefaults` so the change joins the transaction's
one step.

```ts
const [picture] = element.session.assets.inspect(robot.id).pictures;
await element.session.assets.setDefaults(robot.id, { hiddenTextures: [picture.name] });
```

### Selecting, outlining and glowing a model

A selected model node, and one a layer gives a halo, an outline or a glow, is marked with a band
around its outline on screen, in the look's color: about `(scale - 1) x 20` pixels wide for a
halo (9 at the default 1.45), the outline width times 4, or the glow strength times 8, between 2
and 16. Only the node that is marked shows the band, however many nodes draw the same model. A
node with more than one of these shows its halo, else its outline, else its glow.

### Turning a model upright

`.glb`, `.gltf` and `.obj` files say which way is up, so they stand up by themselves. An `.stl`
file does not: the element takes it as made with Z pointing up, the usual choice of the programs
that make STL files, and reports `W_MODEL_UP_GUESSED` so a page can offer a "turn upright"
control. If the guess is wrong, say which way is up in the file:

```ts
await element.session.styles.add({
    name: "Upright part",
    target: "node",
    selector: { match: "expression", where: "data.kind == 'part'" },
    set: { "node.model": part.id, "node.modelSourceUp": "y" },
});
```

### Rotate buttons

`turnModelOrientation` from `@graphty/graphty-element/catalog` turns an orientation a quarter turn
(`"left"`, `"right"`, `"forward"` or `"back"`) and returns the `node.modelSourceUp` and
`node.modelTurn` to write, so a page's rotate buttons do no rotation math:

```ts
import { turnModelOrientation } from "@graphty/graphty-element/catalog";

const next = turnModelOrientation({ up: "detected", turn: 0 }, "forward", record.summary?.upAxis);
// { up: "-z", turn: 0 } for a Y-up file: write both into the layer.
```

### Loading progress

`assets.add` reports the bytes of a large file as they arrive, and stops a download when its
signal aborts (once no other caller waits for the same URL). A download fails only when it
receives nothing for `fetchTimeoutMs` (30 seconds), however long it takes in all:

```ts
const stop = new AbortController();
const record = await element.session.assets.add(url, {
    signal: stop.signal,
    onProgress: (change) => {
        // change.asset.stage: "downloading", "reading" or "unpacking"; change.fraction is null when the size is not known.
        bar.value = change.fraction ?? 0;
    },
});
```

A model by address can be shown before its pictures arrive. `onWaiting` hears the model once
everything but its pictures is in: its record waits for them (each picture an
`E_MODEL_MISSING_FILE` with `downloading: true`), and `modelPreview` or `checkModel` with
`standInMissing` draw it at once. `stopPictures` stops only those downloads: the model stays,
waiting for the pictures as if they had not come, so the reader can hand them over with `supply` or
take the model without them with `accept`. `signal` still stops everything:

```ts
const stopPictures = new AbortController();
const record = await element.session.assets.add(url, {
    onWaiting: (waiting) => showPreview(waiting.id), // shown while its pictures download
    stopPictures: stopPictures.signal, // stopPictures.abort() keeps the model, without them
});
```

## Who may make the page fetch a model

A web address in `node.model` is fetched at once when your page's code added the layer with
`styles.add` or `styles.update`. A model loaded from an address brings the files it names from
beside it -- a `.gltf`'s `.bin` and pictures, an `.obj`'s `.mtl` and images -- from the same site
and folder, so a multi-file model works by its main file's address alone. A reference to another
site inside the model is refused (`E_MODEL_EXTERNAL_URL`).

An address that came from anywhere else -- a saved project, a style file, an AI command, a column
of addresses in your data -- is not fetched until the reader agrees. It waits in
`session.network`, the same place a reopened project's network-source loads wait, and the node
keeps its ordinary shape meanwhile:

```ts
element.session.on("network:pending", (request) => {
    // request.params: { id, url, host, kind: "model" | "texture" | "source", by, layerIds }
    if (confirm(`This project wants to open ${request.params.url}. Continue?`)) {
        void element.session.network.allow(request.params.id); // and the rest of that site, this session
    } else {
        element.session.network.deny(request.params.id); // E_MODEL_URL_BLOCKED, the shape stays
    }
});
```

`element.session.network.pending()` lists what is waiting now, for a page that starts listening
late.

Nothing saved in a project file can skip the question, so a project someone sends you always asks.
A reader who does not want to be asked again for this project: keep that choice yourself, on the
reader's machine, keyed by `session.project.id` (a project's identity, saved in its file, the same
in every copy), and hand it back with `network.setProjectHosts`. graphty-element asks your lookup
as each project opens, before anything is fetched, and allows the hosts it returns for that project
only:

```ts
const key = "my-app.projectHosts";
const remembered = (): Record<string, string[]> => JSON.parse(localStorage.getItem(key) ?? "{}");
element.session.network.setProjectHosts((projectId) => remembered()[projectId] ?? []);

// The reader's "Don't ask again for this project" on a waiting request:
const all = remembered();
all[element.session.project.id] = [...(all[element.session.project.id] ?? []), request.params.host];
localStorage.setItem(key, JSON.stringify(all));
void element.session.network.allow(request.params.id);
```

One who does not want to be asked at all: your page calls `network.setPolicy("allow")` (it is never
saved; keep that preference yourself). To trust hosts from your page's code instead, name them:

```ts
element.session.assets.allowHosts(["models.example.com"]);
```

Addresses on this machine or the local network (`localhost`, `192.168.x.x`, ...) are never fetched
for anything that did not come from your code. Every model request is made with no cookies and no
referrer, and has a time limit. A column of addresses fetches each distinct address once, however
many nodes name it.

## Pictures on nodes

`node.texture` draws a picture (PNG, JPEG or WebP) on nodes: on a model it replaces the model's
own base color picture, on an ordinary shape it covers the surface. Name a picture by web address,
or add one from a file and name its id:

```ts
await element.session.styles.add({
    name: "Striped people",
    target: "node",
    selector: { match: "expression", where: "data.kind == 'person'" },
    set: { "node.texture": "https://example.com/pictures/stripes.png" },
});
```

The picture shows its own colors. To color it by the node's color as well, add
`"node.modelTint": true`, which multiplies the node's color in. Where a picture is transparent, a
flat node (a 2D drawing, or a flat shape such as `ellipse`) is cut out, so an icon draws as just the
icon; a solid shape shows white there. A picture by address is fetched
like a model's (your code's own addresses at once; anyone else's after the reader agrees), and a
project saves it like a model.

## Saving a project with its models

A saved project carries its models. `session.project.save()` (and the element's autosave) writes
the files of every model a layer names, and of every other accepted model the session holds (one
added for later, or no longer named), into the project file, exactly as they were added; call
`session.assets.remove(id)` to leave one out. So the
project opens anywhere -- offline, on another machine, with no request for the model -- and draws
the same models:

```ts
const { text, report } = await element.session.project.save();
// later, in any page
await otherElement.session.project.open(text);
```

A model your page loaded from a web address is saved too, under that address: opening the file,
the layer draws the saved copy and fetches nothing. The sample models are never copied into a
file, because every page has them. A layer naming a model the session does not hold (an address
that never loaded) is saved without it, and `report.leftOut` says so with `W_MODEL_NOT_EMBEDDED`.

To keep a model or picture from the web by its address alone, so the file stays small and always
shows what the site serves now, say so per address when saving (each record's `url` in
`session.assets.list()` is the address):

```ts
await element.session.project.save({ assets: { "https://example.com/models/rack.glb": "url" } });
```

The file then records the address and a fingerprint of the file. When the project opens, the
address is fetched (after the reader agrees), and if the site now serves a different file it is
drawn and reported with `W_MODEL_CHANGED`.

A save with no choice for an address embeds it. With the `node-models` experiment switched on
(`features="node-models"`), a project keeps each address the way it was last kept instead: a file
opened with an address kept that way saves it that way again, and so does a later save after a
written one that was told (a `markSaved: false` copy counts once it is marked saved). Opening
another project starts over. Autosave always embeds.

### Asking before a save

`session.project.assetChoices()` lists what there is to ask about: each model or picture a layer
names by address, with its `kind`, its size in `byteLength`, the `layerIds` naming it and the
`storage` a save without a choice would use. `urlRefused` is set when it cannot be kept by
address (its parts came from several places), and a save embeds it whatever you pass:

```ts
const { project } = element.session;
const assets: Record<string, "embed" | "url"> = {};
for (const choice of project.assetChoices()) {
    const mb = (choice.byteLength / 1e6).toFixed(1);
    const byAddress = !choice.urlRefused && confirm(`Keep ${choice.url} by address, not ${mb} MB?`);
    assets[choice.url] = byAddress ? "url" : "embed";
}
await element.downloadProject({ assets });
```

An empty list means there is nothing to ask. `element.downloadProject({ assets, markSaved: false })`
downloads a copy and leaves `project.dirty` as it was.

A project file holds at most 64 MB of model files. When it opens, each model is checked against
the fingerprint the file recorded for it, then by every check a dropped file gets; a model that
fails is left out (its nodes keep their ordinary shape), and the open's `problems` name it with its
code, such as `E_MODEL_DIGEST_MISMATCH` for a file whose bytes were changed.

## Limits

To protect the tab, a model is refused (`E_MODEL_TOO_LARGE`) past a set of limits: 32 MB per
model, 1,000,000 triangles, 128 MB of decoded pictures (a KTX2 picture counts a quarter of a PNG or JPEG of the same size), and 256 MB held by the session in all,
among others. Only your page's code can change them; a project file never can:

```ts
element.session.assets.setLimits({ maxTriangles: 2_000_000 });
```

## Problems and their codes

Each problem is `{ code, params }`. A code starting `E_` means the model is not drawn (the node
keeps its ordinary shape); `W_` means it is drawn and something is worth telling the reader.

| Code                          | params                                              | When                                                                                                                                                                                                                                     |
| ----------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_MODEL_FETCH`               | `url`, `status`, `offline`                          | The address answered with an error, or not at all. `status` is `null` when nothing answered (offline, CORS and an unknown host look alike)                                                                                               |
| `E_MODEL_URL_BLOCKED`         | `hosts`, `denied`, `part`                           | The address may not be fetched: the reader said no, an address on the local network not from your code, or not `http`/`https`. `part` names the missing file, for an address given to `assets.supply`                                    |
| `E_MODEL_TOO_LARGE`           | `what`, `found`, `limit`                            | Over a limit; `what` says which one                                                                                                                                                                                                      |
| `E_MODEL_STRUCTURE`           | `rule`                                              | The file is damaged or unsafe to read                                                                                                                                                                                                    |
| `E_MODEL_FORMAT_UNSUPPORTED`  | `format`, `fileName`, `assetKind`                   | A 3D format graphty-element recognizes but does not load (FBX, USD, USDZ, DAE, .blend, 3MF, BVH). `assetKind` is `"image"` when `node.model` names a picture and `"model"` when `node.texture` names a model                             |
| `E_MODEL_FORMAT_UNKNOWN`      | `fileName`                                          | Not a 3D model file graphty-element knows                                                                                                                                                                                                |
| `E_MODEL_AMBIGUOUS`           | `candidates`                                        | Several files could be the model; pass `{ main: "<name>" }` to `assets.add`                                                                                                                                                              |
| `E_MODEL_MISSING_FILE`        | `name`, `referencedBy`, `role`, `optional`, `tried` | A file the model needs (a `.bin`, a picture, an `.mtl`) was not found. One per missing file, all at once; `optional` is true for a picture or an `.mtl`, and `tried` lists the addresses tried for a model fetched by URL                |
| `E_MODEL_PART_AMBIGUOUS`      | `name`, `referencedBy`, `candidates`                | A file the model names matched more than one of the files given (by case or by name alone), so none was used                                                                                                                             |
| `E_MODEL_WEB_PAGE`            | `url`, `host`, `part`, `suggested`                  | An address answered with a web page, not a model or a picture. `suggested` is the file's own address, for a GitHub or GitLab file page                                                                                                   |
| `E_MODEL_PART_REQUIRED`       | `name`, `role`                                      | A file the model cannot be drawn without (its geometry) was asked to be left out                                                                                                                                                         |
| `E_MODEL_EXTERNAL_URL`        | `url`                                               | The model loads parts from somewhere outside its own files, which is not allowed. Export it as `.glb`                                                                                                                                    |
| `E_MODEL_DECODER_UNAVAILABLE` | `reason`, `extension`                               | Compressed data could not be decoded: `reason` is `missing` (the single-file `./bundle` has no Draco or KTX2 decoder), `load` (the decoder files did not load) or `decode` (damaged data)                                                |
| `E_MODEL_PARSE`               | `format`                                            | The file passed every check but could not be read                                                                                                                                                                                        |
| `E_MODEL_ZIP`                 | `reason`                                            | The `.zip` cannot be opened safely                                                                                                                                                                                                       |
| `E_MODEL_NAME_TAKEN`          | `id`                                                | The name given to `assets.add` already belongs to different files, or starts with `asset:sample/`                                                                                                                                        |
| `E_MODEL_UNKNOWN_ASSET`       | `id`                                                | A layer names a model id the session does not hold                                                                                                                                                                                       |
| `E_MODEL_DIGEST_MISMATCH`     | `id`                                                | A model saved in a project file does not match the fingerprint the file recorded: the file was changed or damaged                                                                                                                        |
| `W_MODEL_COLOR_IGNORED`       | `layerIds`                                          | A layer colors model nodes whose `node.modelTint` is off                                                                                                                                                                                 |
| `W_MODEL_UP_GUESSED`          | `format`, `up`                                      | The file does not say which way is up, so it was guessed                                                                                                                                                                                 |
| `W_MODEL_HAS_ANIMATIONS`      | `clips`                                             | The model has animations; it is drawn still unless `node.modelAnimation` names one                                                                                                                                                       |
| `W_MODEL_ANIMATION_UNKNOWN`   | `name`, `available`                                 | `node.modelAnimation` names a clip the model does not have; its nodes hold the first frame                                                                                                                                               |
| `W_MODEL_ANIMATION_REDUCED`   | `fps`, `clips`                                      | The clips were sampled at fewer frames a second to keep their texture within 16 MB                                                                                                                                                       |
| `W_MODEL_ANIMATION_PARTIAL`   | `reason`                                            | Part of the animation is not played (`morph`: shape keys keep their rest shape)                                                                                                                                                          |
| `W_MODEL_EXTENSION_IGNORED`   | `extension`                                         | The glTF uses an extension that is drawn without: see-through glass (`KHR_materials_transmission`) is drawn alpha blended, as clear as its transmission factor (at least 20% opaque); volume and the rest of its family are drawn opaque |
| `W_MODEL_POINTS_APPROXIMATED` | `points`, `drawn`                                   | A point cloud or Gaussian splat is drawn as small solids, one per point; at most `drawn` of its `points`                                                                                                                                 |
| `W_MODEL_HEAVY`               | `triangles`, `materials`, `nodes`                   | A detailed model on many nodes may make the graph slow                                                                                                                                                                                   |
| `W_MODEL_BUDGET`              | `nodes`, `triangles`, `budget`                      | Models across the graph draw more triangles than the budget                                                                                                                                                                              |
| `W_MODEL_TRANSPARENT`         | `nodes`                                             | Many nodes draw a see-through model, which may look wrong where they overlap                                                                                                                                                             |
| `W_MODEL_TEXTURES_REDUCED`    | `from`, `to`                                        | Pictures larger than the limit were drawn smaller                                                                                                                                                                                        |
| `W_MODEL_NOT_EMBEDDED`        | `ref`, `layerIds`                                   | A project was saved without a model its layers name, because the session does not hold it                                                                                                                                                |
| `W_MODEL_CHANGED`             | `url`, `expected`, `found`                          | A model or picture a project keeps by address loaded, and is not the file the project was saved with                                                                                                                                     |
| `W_MODEL_PART_SUBSTITUTED`    | `name`, `used`, `referencedBy`                      | A file the model names was found under another case or folder; `used` is the file drawn                                                                                                                                                  |
| `W_MODEL_PART_SKIPPED`        | `name`, `role`                                      | The model is drawn without a picture or `.mtl` that was left out                                                                                                                                                                         |
| `W_MODEL_PART_UNUSED`         | `fileName`                                          | A file given for a model matched none of the files it is missing, and was not used                                                                                                                                                       |
| `W_MODEL_NOT_KEPT_BY_URL`     | `url`, `reason`                                     | A model asked to be kept by its address was saved with its files, because its missing files came from elsewhere (`reason: "parts"`)                                                                                                      |
| `W_URL_NEEDS_APPROVAL`        | `id`, `url`, `host`, `kind`, `by`                   | An address waits for the reader in `session.network` (not a model's own event: `network:pending`)                                                                                                                                        |
| `W_NETWORK_POLICY_IGNORED`    | `kind`                                              | In `project.open`'s problems: the file carries a network approval an earlier release wrote, which is ignored; its addresses still wait for the reader                                                                                    |
