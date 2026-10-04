# Getting started

graphty is a family of graph libraries, including @graphty/algorithms and @graphty/layout. @graphty/cytoscape-extensions adds their layouts and algorithms to Cytoscape.js with one `cytoscape.use()` call.

`@graphty/cytoscape-extensions` has not had its first release yet. Until it does, `npm install` fetches `0.0.0-placeholder.0`, a package that holds only a README, so the imports below fail to resolve, and the jsDelivr URLs used on other pages return 404. Everything on this page describes the package as it will be released.

## Install

```sh
npm install cytoscape @graphty/cytoscape-extensions @graphty/algorithms @graphty/layout @graphty/graph-format
```

@graphty/algorithms, @graphty/layout and @graphty/graph-format are peer dependencies, so you install them yourself. Cytoscape.js 3.31.0 or later is required.

## A first page

The page below generates a 300-node graph, computes PageRank for every node, sizes each node by its rank, and animates a ForceAtlas2 layout. It assumes a bundler such as Vite, which resolves the bare `import` names.

`index.html`:

```html
<!doctype html>
<html>
    <head>
        <meta charset="utf-8" />
        <title>First graph</title>
    </head>
    <body>
        <div id="cy" style="width: 800px; height: 600px"></div>
        <script type="module" src="./main.js"></script>
    </body>
</html>
```

`main.js`:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({
    container: document.getElementById("cy"),
    style: [
        {
            selector: "node[rank]",
            style: {
                width: "mapData(rank, 0, 0.035, 8, 48)",
                height: "mapData(rank, 0, 0.035, 8, 48)",
            },
        },
        { selector: "edge", style: { width: 1, "line-color": "#ccc" } },
    ],
});

async function draw() {
    await cy.graphtyGenerate("barabasi-albert", { n: 300, m: 2, seed: 1 });
    cy.elements().graphtyPageRank({ field: "rank" });
    const layout = cy.layout({ name: "graphty-forceatlas2", animate: true });
    layout.run();
}

draw();
```

Run `npx vite` in that folder and open the page. Nodes start in a random arrangement and spread out over up to 100 frames. A few large hubs end up near the middle.

### What each step does

`cytoscape.use(graphtyCytoscape)` registers everything: the layouts, the algorithm methods, and the graph generators. Call it once per page, before you create a core; a second call with the same `cytoscape` does nothing.

The container needs an explicit width and height. Cytoscape draws into the size the `div` has, and a `div` with no height has a height of 0.

`cy.graphtyGenerate("barabasi-albert", { n: 300, m: 2, seed: 1 })` adds a preferential-attachment graph: 300 nodes, each new node linked to 2 existing ones, so a few nodes collect many edges. The same `seed` gives the same graph every time. It returns a promise because the generator code is downloaded the first time you call it. Node ids are `"0"`, `"1"`, and so on, and every node starts at the origin until a layout runs.

To use your own graph instead, add elements the usual Cytoscape way and drop the `await`. The sizing rule's `node[rank]` selector skips nodes that have no `rank` yet, so they keep Cytoscape's default size until PageRank runs:

```js
cy.add([
    { data: { id: "a" } },
    { data: { id: "b" } },
    { data: { id: "c" } },
    { data: { id: "ab", source: "a", target: "b" } },
    { data: { id: "bc", source: "b", target: "c" } },
]);
```

`graphtyGenerate` adds to whatever the core already holds. If one of its node ids is already there, the promise rejects and nothing is added, so a second call with the same generator fails. To replace the graph, call `cy.elements().remove()` first. If a simulation is still running, keep its layout object where your code can reach it and call `layout.stop()` before you remove anything, or its remaining frames keep fitting the viewport to the removed nodes and emit a late `layoutstop`. [Layouts](./layouts#animating-a-simulation) covers `stop()`.

`cy.elements().graphtyPageRank({ field: "rank" })` runs PageRank over the collection it is called on. The `field` option writes each node's score into `data("rank")`. It also returns the result: `rank(node)` gives one node's score, and `iterations` and `converged` say how the run went. On this graph the scores run from about 0.002 to 0.034, which is why the stylesheet maps `rank` from 0 to 0.035 onto a size of 8 to 48 pixels. Cytoscape restyles the nodes as soon as the data changes.

`cy.layout({ name: "graphty-forceatlas2", animate: true })` creates a ForceAtlas2 layout and `layout.run()` starts it. ForceAtlas2 is a force simulation. With `animate: true` it draws one iteration per frame (the `refresh` option, default 1) for up to 100 iterations (the `maxIter` option, default 100), and fits the viewport to the graph on every frame. Listen for `layoutstop` to know when it has finished.

A static layout such as `graphty-circular` computes its positions in one step. With `animate: "end"` (or `true`) it tweens the nodes from where they are to where they go, over `animationDuration` milliseconds (default 500). On a simulation, `animate: "end"` runs every iteration first and then tweens once:

```js
cy.layout({ name: "graphty-circular", animate: "end", animationDuration: 800 }).run();
```

[Layouts](./layouts) covers the other layout options and events.

### Keep `await` out of the top level

Do not `await` a graphty promise at the top level of a module your bundler builds. In a Vite 6 or 7 production build that `await` never finishes. Put the code in an `async` function and call it, as `draw()` does above. [Troubleshooting](./troubleshooting#a-top-level-await-never-finishes) lists the affected calls and setups.

## The names

Every graphty layout is registered as `graphty-` plus its name: `graphty-forceatlas2`, `graphty-circular`, `graphty-kamada-kawai`. Every algorithm is a method named `graphty` plus the algorithm name: `graphtyPageRank`, `graphtyLouvain`, `graphtyDijkstra`. The prefix keeps them apart from Cytoscape's own `cose` layout and `pageRank()` method, so the built-ins keep working exactly as before and you can compare the two side by side.

The algorithms that have a GPU implementation also have an `...Async` twin, such as `graphtyPageRankAsync`, which returns a promise, runs on WebGPU when the browser has a usable device and on the CPU when it does not, and reports which one ran in `result.backend.ran`.

## Try it

- [Force simulations demo](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-layouts--force-simulations): run ForceAtlas2 and the other simulations on graphs from 100 to 50,000 nodes.
- [Layout gallery](https://graphty.app/storybook/cytoscape-extensions/?path=/story/gallery--layouts): every layout side by side on small graphs.

## Next

- [Installation](./installation): load the package from a CDN, with a script tag, from CommonJS, or with TypeScript.
- [Layouts](./layouts): choose a layout, static or simulated, and react to its events.
- [Algorithms](./algorithms): call an algorithm, read its result, and write it onto elements for styling.
