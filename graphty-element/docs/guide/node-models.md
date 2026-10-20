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

| You have                                        | What happens                                                                                                                                         |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| One `.glb` file                                 | Loads. This is the best format to use: one file holding the shape, colors and pictures                                                               |
| A `.gltf` file with its `.bin` and pictures     | Loads when every file it names is given too: select them all, drop the folder, or zip them. A missing one is `E_MODEL_MISSING_FILE`, naming the file |
| An `.obj` file, with its `.mtl` and pictures    | Loads, the same way as `.gltf`                                                                                                                       |
| An `.stl` file                                  | Loads with no colors of its own (one gray). Its up direction is a guess; see [Turning a model upright](#turning-a-model-upright)                     |
| A `.zip` holding any of the above               | Loads                                                                                                                                                |
| `.ply`                                          | Checked, but not drawn yet (`E_MODEL_FORMAT_UNSUPPORTED`)                                                                                            |
| `.fbx`, `.usdz`, `.dae`, `.blend`, `.3mf`       | Not loaded (`E_MODEL_FORMAT_UNSUPPORTED`). Open it in a 3D program such as Blender and export it as `.glb`                                           |
| A `.glb` compressed with Draco, meshopt or KTX2 | Not loaded yet (`E_MODEL_DECODER_UNAVAILABLE`). Export it again without compression                                                                  |

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

`"node.modelTint": "replace"` paints the whole model in `node.color`, a flat silhouette. When a
layer colors a model node and tint is off, the color is not drawn and the element reports
`W_MODEL_COLOR_IGNORED` with the layers that set it, so the color never disappears in silence.

## Size, turning and fitting

A model node is sized like any other node: `node.size` (and `node.width`, `node.height`,
`node.depth`) applies to it, and its largest side is as long as a built-in shape of the same
size. The model's own units do not matter. These channels adjust how it sits:

| Channel              | Values                                                      | Default      | What it does                                                                        |
| -------------------- | ----------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| `node.model`         | a model id or a URL                                         | unset        | Draw the node as this model. Unset: draw `node.shape`                               |
| `node.modelTint`     | `true`, `false` or `"replace"`                              | `false`      | Multiply the model's colors by `node.color`, or paint it in `node.color`            |
| `node.modelSourceUp` | `"y"`, `"z"`, `"-y"`, `"-z"`, `"x"`, `"-x"` or `"detected"` | `"detected"` | Which direction is up in the file; the element turns that direction up on screen    |
| `node.modelTurn`     | degrees, -360 to 360                                        | `0`          | Turn the model about its up direction; at `0` its front faces the starting camera   |
| `node.modelFit`      | `"contain"` or `"stretch"`                                  | `"contain"`  | Keep its proportions, or stretch it to `node.width`, `node.height` and `node.depth` |
| `node.modelCenter`   | `"bounds"` or `"origin"`                                    | `"bounds"`   | Center the model on the node, or keep the file's own pivot point                    |

Each is an ordinary style channel: a higher layer that sets one keeps what lower layers set for
the others.

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
late. A reader who does not want to be asked again for this project:
`network.allow(id, { remember: "project" })`, saved with the project. One who does not want to be
asked at all: your page calls `network.setPolicy("allow")` (it is never saved; keep that preference
yourself). To trust hosts from your page's code instead, name them:

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
`"node.modelTint": true`, which multiplies the node's color in. A picture by address is fetched
like a model's (your code's own addresses at once; anyone else's after the reader agrees), and a
project saves it like a model.

## Saving a project with its models

A saved project carries its models. `session.project.save()` (and the element's autosave) writes
the files of every model a layer names into the project file, exactly as they were added, so the
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

A project file holds at most 64 MB of model files. When it opens, each model is checked against
the fingerprint the file recorded for it, then by every check a dropped file gets; a model that
fails is left out (its nodes keep their ordinary shape), and the open's `problems` name it with its
code, such as `E_MODEL_DIGEST_MISMATCH` for a file whose bytes were changed.

## Limits

To protect the tab, a model is refused (`E_MODEL_TOO_LARGE`) past a set of limits: 32 MB per
model, 1,000,000 triangles, 64 MB of decoded pictures, and 256 MB held by the session in all,
among others. Only your page's code can change them; a project file never can:

```ts
element.session.assets.setLimits({ maxTriangles: 2_000_000 });
```

## Problems and their codes

Each problem is `{ code, params }`. A code starting `E_` means the model is not drawn (the node
keeps its ordinary shape); `W_` means it is drawn and something is worth telling the reader.

| Code                          | params                            | When                                                                                                                                       |
| ----------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `E_MODEL_FETCH`               | `url`, `status`, `offline`        | The address answered with an error, or not at all. `status` is `null` when nothing answered (offline, CORS and an unknown host look alike) |
| `E_MODEL_URL_BLOCKED`         | `hosts`, `denied`                 | The address may not be fetched: the reader said no, an address on the local network not from your code, or not `http`/`https`              |
| `E_MODEL_TOO_LARGE`           | `what`, `found`, `limit`          | Over a limit; `what` says which one                                                                                                        |
| `E_MODEL_STRUCTURE`           | `rule`                            | The file is damaged or unsafe to read                                                                                                      |
| `E_MODEL_FORMAT_UNSUPPORTED`  | `format`, `fileName`              | A 3D format graphty-element recognizes but does not load (FBX, USDZ, DAE, .blend, 3MF, PLY)                                                |
| `E_MODEL_FORMAT_UNKNOWN`      | `fileName`                        | Not a 3D model file graphty-element knows                                                                                                  |
| `E_MODEL_AMBIGUOUS`           | `candidates`                      | Several files could be the model; pass `{ main: "<name>" }` to `assets.add`                                                                |
| `E_MODEL_MISSING_FILE`        | `name`, `referencedBy`            | A file the model needs (a `.bin`, a picture, an `.mtl`) was not given                                                                      |
| `E_MODEL_EXTERNAL_URL`        | `url`                             | The model loads parts from somewhere outside its own files, which is not allowed. Export it as `.glb`                                      |
| `E_MODEL_DECODER_UNAVAILABLE` | `extension`, `package`            | The model is compressed in a way this version cannot read                                                                                  |
| `E_MODEL_PARSE`               | `format`                          | The file passed every check but could not be read                                                                                          |
| `E_MODEL_ZIP`                 | `reason`                          | The `.zip` cannot be opened safely                                                                                                         |
| `E_MODEL_NAME_TAKEN`          | `id`                              | The name given to `assets.add` already belongs to different files, or starts with `asset:sample/`                                          |
| `E_MODEL_UNKNOWN_ASSET`       | `id`                              | A layer names a model id the session does not hold                                                                                         |
| `E_MODEL_DIGEST_MISMATCH`     | `id`                              | A model saved in a project file does not match the fingerprint the file recorded: the file was changed or damaged                          |
| `W_MODEL_COLOR_IGNORED`       | `layerIds`                        | A layer colors model nodes whose `node.modelTint` is off                                                                                   |
| `W_MODEL_UP_GUESSED`          | `format`, `up`                    | The file does not say which way is up, so it was guessed                                                                                   |
| `W_MODEL_HAS_ANIMATIONS`      | `clips`                           | The model has animations; it is drawn standing still                                                                                       |
| `W_MODEL_HEAVY`               | `triangles`, `materials`, `nodes` | A detailed model on many nodes may make the graph slow                                                                                     |
| `W_MODEL_BUDGET`              | `nodes`, `triangles`, `budget`    | Models across the graph draw more triangles than the budget                                                                                |
| `W_MODEL_TRANSPARENT`         | `nodes`                           | Many nodes draw a see-through model, which may look wrong where they overlap                                                               |
| `W_MODEL_TEXTURES_REDUCED`    | `from`, `to`                      | Pictures larger than the limit were drawn smaller                                                                                          |
| `W_MODEL_NOT_EMBEDDED`        | `ref`, `layerIds`                 | A project was saved without a model its layers name, because the session does not hold it                                                  |
| `W_MODEL_CHANGED`             | `url`, `expected`, `found`        | A model or picture a project keeps by address loaded, and is not the file the project was saved with                                       |
| `W_URL_NEEDS_APPROVAL`        | `id`, `url`, `host`, `kind`, `by` | An address waits for the reader in `session.network` (not a model's own event: `network:pending`)                                          |
