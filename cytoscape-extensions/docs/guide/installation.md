# Installation

@graphty/cytoscape-extensions loads four ways: as ES modules through npm and a bundler, as ES modules from a CDN with no build step, as one classic script tag, or through `require()` in CommonJS. Its TypeScript typings come with the package.

## npm and a bundler

Install Cytoscape.js, the extension and the three graphty packages it expects you to provide:

```sh
npm install cytoscape @graphty/cytoscape-extensions @graphty/algorithms @graphty/layout @graphty/graph-format
```

Then register the extension once, before you create a core:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);
```

The package is ES modules only; Vite, webpack, esbuild and Rollup all load it as written above. Your bundler splits off the parts most pages never use, and the page fetches each one on first use. In a Vite build the chunks are:

| Chunk                               | Holds                                     | Fetched by                                                                                                    |
| ----------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `samples-*.js`, `elements-*.js`     | The graph generators and the dataset list | The first `graphtyGenerate()` or `graphtyDataset()`                                                           |
| `karate-*.js`, `football-*.js`, ... | One sample dataset each                   | `graphtyDataset()` with that name                                                                             |
| `io-*.js`                           | The file formats                          | The first `graphtyImport()` or `graphtyExport()`                                                              |
| `gpu-platform-browser-*.js`         | WebGPU support                            | The first simulation layout or `...Async` algorithm with the default `gpu: "auto"`, to probe for a GPU device |

The WebGPU chunk loads only in a browser that has `navigator.gpu`; elsewhere the CPU runs and nothing is fetched. Pass `gpu: "off"` to a layout or algorithm to keep it from loading.

The entry chunk of a Vite build that imports Cytoscape and this package is about 820 KB minified (255 KB gzipped), 434 KB (136 KB) of it Cytoscape. So `vite build` prints "Some chunks are larger than 500 kB after minification"; set `build.chunkSizeWarningLimit: 1000` in `vite.config.js` to silence it.

There is nothing extra to install for WebGPU in a browser. For WebGPU in Node, see [WebGPU](./webgpu).

## ES modules from a CDN

A page with no build step imports the ES module build from jsDelivr with `<script type="module">`. Load Cytoscape's ES module build (`cytoscape.esm.min.mjs`) the same way:

```html
<!doctype html>
<html>
    <body>
        <div id="cy" style="width: 800px; height: 600px"></div>
        <script type="module">
            import cytoscape from "https://cdn.jsdelivr.net/npm/cytoscape@3/dist/cytoscape.esm.min.mjs";
            import graphtyCytoscape from "https://cdn.jsdelivr.net/npm/@graphty/cytoscape-extensions/dist/cdn/cytoscape-extensions.js";

            cytoscape.use(graphtyCytoscape);
            const cy = cytoscape({
                container: document.getElementById("cy"),
                style: [
                    {
                        selector: "node",
                        style: { width: "mapData(rank, 0, 0.1, 10, 50)", height: "mapData(rank, 0, 0.1, 10, 50)" },
                    },
                ],
            });

            // fetches the karate dataset from the CDN on this first call
            await cy.graphtyDataset("karate");
            cy.elements().graphtyPageRank({ field: "rank" });
            cy.layout({ name: "graphty-forceatlas2", animate: true }).run();
        </script>
    </body>
</html>
```

At start the page downloads `cytoscape-extensions.js`, a 0.3 KB entry file, and the two chunks it imports, `chunks/index-*.js` and `chunks/graph-format-*.js`: about 114 KB gzipped (376 KB minified) in total. The WebGPU code, the generators, each dataset and the file formats are separate files in the same `dist/cdn/` folder, fetched from there on first use.

Three rules keep this working:

- Pin a version in production: `https://cdn.jsdelivr.net/npm/@graphty/cytoscape-extensions@X.Y.Z/dist/cdn/cytoscape-extensions.js`. Every lazy file then comes from the same version.
- Use the `dist/cdn/` path, not jsDelivr's `/+esm` URL. The files under `dist/cdn/` import each other by relative paths; `/+esm` rewrites the package and breaks those paths.
- To host the files yourself, copy the whole `dist/cdn/` folder, not only `cytoscape-extensions.js`.

## Script tag

For a page that does not use modules, `dist/cytoscape-extensions.bundle.js` is one classic script. Load it after Cytoscape's `cytoscape.min.js` and it registers itself on the global `cytoscape`, so you do not call `use()`:

```html
<!doctype html>
<html>
    <body>
        <div id="cy" style="width: 800px; height: 600px"></div>
        <script src="https://cdn.jsdelivr.net/npm/cytoscape@3/dist/cytoscape.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/@graphty/cytoscape-extensions/dist/cytoscape-extensions.bundle.js"></script>
        <script>
            const cy = cytoscape({
                container: document.getElementById("cy"),
                elements: [
                    { data: { id: "a" } },
                    { data: { id: "b" } },
                    { data: { id: "c" } },
                    { data: { source: "a", target: "b" } },
                    { data: { source: "b", target: "c" } },
                    { data: { source: "c", target: "a" } },
                ],
            });
            cy.layout({ name: "graphty-circular" }).run();
        </script>
    </body>
</html>
```

The script also sets the global `graphtyCytoscape`, the extension function. A classic script cannot import, so the package's named exports are properties of that global: call `graphtyCytoscape.configureWebGpu({ acceptSoftware: true })` where the other pages import `configureWebGpu`, and likewise `toSnapshot`, `writeData`, `LAYOUT_NAMES`, `ALGORITHM_NAMES`, `ASYNC_ALGORITHM_NAMES` and `GPU_SIZE_FLOOR`. A page that loads Cytoscape after the bundle calls `cytoscape.use(graphtyCytoscape)` itself.

The bundle is about 239 KB gzipped (833 KB minified) and holds every layout, every algorithm, the generators and WebGPU detection, all downloaded at start. The file formats and the datasets are not in it. The first `graphtyImport()`, `graphtyExport()` or `graphtyDataset()` call fetches them from the `cdn/` folder next to the script, at the same URL prefix and so the same version. Browsers do not load those ES modules from `file://` URLs, so serve the page and `dist/` from a web server, even a local one. Opened by double-click, the page draws its graph, but those three calls reject with "Failed to fetch dynamically imported module".

To find that folder, the bundle reads its own URL, so it must be loaded by a `<script src>` tag. Loaded any other way (pasted inline, or evaluated from a string), those three calls reject with an error that points you to the ES module build at `dist/cdn/cytoscape-extensions.js`.

## CommonJS

There is no CommonJS build. On Node 20.19 or later, or 22.12 or later on the 22 line, `require()` loads the ES module build directly. The extension is its `default` export:

```js
const cytoscape = require("cytoscape");
const graphtyCytoscape = require("@graphty/cytoscape-extensions").default;

cytoscape.use(graphtyCytoscape);
const cy = cytoscape({
    headless: true,
    elements: [{ data: { id: "a" } }, { data: { id: "b" } }, { data: { source: "a", target: "b" } }],
});
console.log(cy.elements().graphtyPageRank().rank("#a"));
```

On an older Node, load it with `const { default: graphtyCytoscape } = await import("@graphty/cytoscape-extensions");` inside an async function. The package declares `"engines": { "node": ">=18.19.0" }`.

## TypeScript

The typings come with the package. Importing it adds every `graphty...` method to Cytoscape's `Core` and `Collection` types by module augmentation. It also gives `cy.layout()` one extra overload: options whose `name` has the literal type `` `graphty-${string}` `` are typed as `GraphtyLayoutOptions` and return `GraphtyLayouts`. Neither the layout name nor the layout's own options are checked: `GraphtyLayoutOptions` has an index signature (`[option: string]: unknown`), so `cy.layout({ name: "graphty-kamada-kawaii" })` and `cy.layout({ name: "graphty-kamada-kawai", dsit: 1 })` both compile. At run time the misspelled name throws Cytoscape's "No such layout" error, and the misspelled option is silently ignored. Check names against the [layout reference](../reference/layouts).

The package exports these types, all from `"@graphty/cytoscape-extensions"`:

| Type                                                                                                       | What it describes                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `GraphtyLayoutOptions`                                                                                     | The options of a `graphty-*` layout                                                                                                      |
| `GraphtyLayouts`                                                                                           | What `cy.layout()` returns for a literal `graphty-*` name; `layout.backend` says whether a simulation ran on GPU or CPU                  |
| `AlgorithmOptions`                                                                                         | `directed`, `weight`, `field` and `gpu`, which every `graphty*` algorithm takes                                                          |
| `ElementRef`, `NodeSelection`, `NodePair`                                                                  | What result accessors and node options accept: a selector string or a collection (`NodePair` is two of them)                             |
| `ScoreResult`, `Partition`, `PathsResult`, `PointPathResult`, `CutResult`, `SearchResult`, `PredictedLink` | Algorithm results                                                                                                                        |
| `GraphtyAlgorithms`, `GraphtyGraphData`                                                                    | The method signatures added to Cytoscape's types                                                                                         |
| `GeneratorName`, `GeneratorOptions<N>`                                                                     | A generator's name, and the options of generator `N`                                                                                     |
| `ImportFormat`, `ImportOptions`, `ExportFormat`, `ExportOptions`                                           | The `format` and options of `graphtyImport()` and `graphtyExport()`                                                                      |
| `AddedGraph`, `ImportedGraph`                                                                              | `{ elements, directed }` from `graphtyGenerate()` and `graphtyDataset()`; `graphtyImport()` adds `format` and `report`                   |
| `Backend`, `GpuMode`, `WebGpuOptions`                                                                      | `{ ran, reason, device }` on `...Async` results and `layout.backend`; `"auto" \| "off" \| "require"`; the options of `configureWebGpu()` |
| `CytoscapeSnapshot`, `SnapshotOptions`                                                                     | The result and options of `toSnapshot()`                                                                                                 |

The [API reference](../api/generated/) defines each one.

Compile with these settings:

```json
{
    "compilerOptions": {
        "strict": true,
        "skipLibCheck": false,
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "lib": ["ES2022", "DOM"]
    }
}
```

Two of them matter:

- Include the `DOM` lib, even in a Node project. Cytoscape's own typings refer to `HTMLElement` and `MouseEvent`.
- Use `"moduleResolution": "bundler"`. Under `node16` or `nodenext`, the typings of @graphty/layout do not resolve, and with `skipLibCheck` off that is a compile error.

This snippet runs under those settings. It types a layout's options, then reads which backend the layout and an `...Async` algorithm ran on:

```ts
import cytoscape from "cytoscape";
import graphtyCytoscape, { type GraphtyLayoutOptions } from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);
const cy = cytoscape({ headless: true });
await cy.graphtyGenerate("barabasi-albert", { n: 200, m: 2, seed: 1 });

const options = {
    name: "graphty-forceatlas2",
    maxIter: 200,
    gpu: "off",
    boundingBox: { x1: 0, y1: 0, w: 800, h: 600 },
} as const satisfies GraphtyLayoutOptions;
const layout = cy.layout(options);
layout.run();
console.log(layout.backend?.ran); // "cpu", because of gpu: "off"

const result = await cy.elements().graphtyPageRankAsync();
console.log(result.backend.ran, result.backend.reason); // "cpu" and why, on a machine with no GPU
```

`as const satisfies` keeps `name` a literal, so `cy.layout(options)` returns `GraphtyLayouts`. Declared as `const options: GraphtyLayoutOptions`, `name` widens to `string`, the call falls through to Cytoscape's own signature, and `layout.backend` is a compile error.

In Node, `graphtyPageRankAsync()` first checks for a GPU, so `await` it before you read the result.

## Supported versions

| Package                 | Range            | Why                                                                                           |
| ----------------------- | ---------------- | --------------------------------------------------------------------------------------------- |
| `cytoscape`             | `^3.31.0`        | 3.31.0 is the first release that ships its own TypeScript typings, which this package extends |
| `@graphty/algorithms`   | `^3.0.0`         | Peer dependency                                                                               |
| `@graphty/layout`       | `^2.0.0`         | Peer dependency                                                                               |
| `@graphty/graph-format` | `^1.0.0`         | Peer dependency                                                                               |
| `webgpu`                | `>=0.4.0 <1.0.0` | Optional; only for WebGPU in Node                                                             |
| Node                    | `>=18.19.0`      | `require()` needs 20.19+ or 22.12+                                                            |

You install the peers yourself, as in the `npm install` line above. Install `webgpu` only to run on the GPU in Node; [WebGPU](./webgpu) covers how the package finds it.

## Next

- [Getting started](./getting-started): draw a first graph with a graphty layout and an algorithm result.
- [WebGPU](./webgpu): what runs on the GPU and how to tell which backend ran.
- [Troubleshooting](./troubleshooting): error messages and their fixes.
