# Installation

Load @graphty/cytoscape-extensions through npm and a bundler, from a CDN with no build step, with a classic script tag, or with `require()`. TypeScript typings come with the package.

The package has not had its first release yet. Until it does, `npm install` fetches `0.0.0-placeholder.0`, which holds only a README, so the imports on this page fail to resolve and its jsDelivr URLs return 404.

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

The package is ES modules only; Vite, webpack, esbuild and Rollup load it as written. Your bundler splits off the parts most pages never use and fetches each on first use: the generators and the dataset list on the first `graphtyGenerate()` or `graphtyDataset()`, each sample dataset when you ask for it by name, the file formats on the first `graphtyImport()` or `graphtyExport()`, and the WebGPU code on the first simulation layout or `...Async` algorithm with the default `gpu: "auto"`. The WebGPU chunk loads only in a browser that has `navigator.gpu`, and never with `gpu: "off"`.

The entry chunk of a Vite build that imports Cytoscape and this package is about 820 KB minified (255 KB gzipped), 434 KB of it Cytoscape. `vite build` then prints "Some chunks are larger than 500 kB after minification"; set `build.chunkSizeWarningLimit: 1000` in `vite.config.js` to silence it.

WebGPU in a browser needs no extra install. For Node, see [WebGPU](./webgpu).

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
                        selector: "node[rank]",
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

That URL also has every named export of the main entry, such as `configureWebGpu`. At start the page downloads about 114 KB gzipped; the WebGPU code, the generators, each dataset and the file formats are separate files in the same `dist/cdn/` folder, fetched on first use.

Pin a version in production (`https://cdn.jsdelivr.net/npm/@graphty/cytoscape-extensions@X.Y.Z/dist/cdn/cytoscape-extensions.js`) so every lazy file comes from the same version. Use the `dist/cdn/` path, not jsDelivr's `/+esm` URL: the files under `dist/cdn/` import each other by relative paths, and `/+esm` rewrites the package and breaks them. To host the files yourself, copy the whole `dist/cdn/` folder, not only `cytoscape-extensions.js`.

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

The bundle is about 249 KB gzipped and holds every layout, every algorithm, the generators and WebGPU detection. The file formats and the datasets are not in it: the first `graphtyImport()`, `graphtyExport()` or `graphtyDataset()` call fetches them from the `cdn/` folder next to the script, which the bundle finds from its own URL. So load it with `<script src>`, not pasted inline. Loaded from a CDN, as above, it works even in a page opened from `file://`. A copy of the bundle on your own disk must be served over HTTP: from a `file://` script URL those three calls reject with "Failed to fetch dynamically imported module".

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

Importing the package adds every `graphty...` method to Cytoscape's `Core` and `Collection` types, and gives `cy.layout()` an overload that takes `GraphtyLayoutOptions` and returns `GraphtyLayouts`. `GraphtyLayoutOptions` has one member per layout, keyed by `name`, listing only that layout's options. So `cy.layout({ name: "graphty-kamada-kawai", dsit: 1 })` does not compile. A misspelled name such as `"graphty-kamada-kawaii"` with no layout-specific options still matches Cytoscape's own signature and throws "No such layout" at run time. In JavaScript an option the layout does not take is ignored.

The package has four entry points:

- `@graphty/cytoscape-extensions`: the extension (default export), `configureWebGpu`, `toSnapshot`, `writeData`, `LAYOUT_NAMES`, `ALGORITHM_NAMES`, `ASYNC_ALGORITHM_NAMES`, `GPU_SIZE_FLOOR` and the types of the methods and options, such as `GraphtyLayoutOptions`, `AlgorithmOptions` and `Backend`.
- `@graphty/cytoscape-extensions/samples`: `generateElements`, which returns `{ elements, directed }`, and `datasetElements`, which resolves to the same shape; `GENERATORS`, an object keyed by the 59 generator names; `NAMED_GRAPH_NAMES`, the 21 graphs the `"named"` generator builds; and `BUNDLED_DATASET_NAMES`, the 12 datasets inside the package. The three hosted datasets, `road-ny`, `ogbn-arxiv` and `com-dblp`, are not in that list.
- `@graphty/cytoscape-extensions/io`: `importElements`, which resolves to `{ elements, directed, format, report }`, and `exportElements`.
- `@graphty/cytoscape-extensions/bundle`: the script-tag build.

The [API reference](../api/generated/) defines each export and type.

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
- Use `"moduleResolution": "bundler"`. Under `node16` or `nodenext`, the typings of @graphty/layout do not resolve. With `skipLibCheck` off that is a compile error. With `skipLibCheck` on, the project compiles, but no layout's options are checked any more, so a misspelled option such as `dsit` compiles too.

This snippet runs under those settings. It types a layout's options, then reads which backend the layout and an `...Async` algorithm ran on:

```ts
import cytoscape from "cytoscape";
import graphtyCytoscape, { type GraphtyLayoutOptions } from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);
const cy = cytoscape({ headless: true });
await cy.graphtyGenerate("barabasi-albert", { n: 200, m: 2, seed: 1 });

const options: GraphtyLayoutOptions = {
    name: "graphty-forceatlas2",
    maxIter: 200,
    gpu: "off",
    boundingBox: { x1: 0, y1: 0, w: 800, h: 600 },
};
const layout = cy.layout(options);
layout.run();
console.log(layout.backend?.ran); // "cpu", because of gpu: "off"

const result = await cy.elements().graphtyPageRankAsync();
console.log(result.backend.ran, result.backend.reason); // "cpu" and why, on a machine with no GPU
```

## Supported versions

| Package                 | Range            | Why                                               |
| ----------------------- | ---------------- | ------------------------------------------------- |
| `cytoscape`             | `^3.31.0`        | The first release with its own TypeScript typings |
| `@graphty/algorithms`   | `^3.0.0`         | Peer dependency                                   |
| `@graphty/layout`       | `^2.0.0`         | Peer dependency                                   |
| `@graphty/graph-format` | `^1.0.0`         | Peer dependency                                   |
| `webgpu`                | `>=0.4.0 <1.0.0` | Optional; only for WebGPU in Node                 |
| Node                    | `>=18.19.0`      | `require()` needs 20.19+ or 22.12+                |

## Next

- [Getting started](./getting-started): draw a first graph with a graphty layout and an algorithm result.
- [WebGPU](./webgpu): what runs on the GPU and how to tell which backend ran.
- [Troubleshooting](./troubleshooting): error messages and their fixes.
