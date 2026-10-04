# Size nodes by degree

`cy.graphtyDegreeCentrality({ field: "degree" })` writes each node's neighbor count into `data("degree")`. A `mapData()` style turns that number into a width and height.

## The whole page

This page loads the Les Miserables character network (77 nodes, 254 edges) and sizes each character by how many others they share a scene with. Save it as an HTML file and open it in a browser.

```html
<!doctype html>
<html>
    <body style="margin: 0">
        <div id="cy" style="width: 100vw; height: 100vh"></div>
        <script type="module">
            import cytoscape from "https://cdn.jsdelivr.net/npm/cytoscape@3/dist/cytoscape.esm.min.mjs";
            import graphtyCytoscape from "https://cdn.jsdelivr.net/npm/@graphty/cytoscape-extensions/dist/cdn/cytoscape-extensions.js";

            cytoscape.use(graphtyCytoscape);
            const cy = cytoscape({ container: document.getElementById("cy") });

            cy.graphtyDataset("les-miserables").then(() => {
                cy.graphtyDegreeCentrality({ field: "degree" });
                // mapData() needs the range written into the style string.
                const maxDegree = cy.nodes().max((n) => n.data("degree")).value;
                const size = `mapData(degree, 1, ${maxDegree}, 12, 60)`;

                cy.style([
                    { selector: "node", style: { width: size, height: size, label: "data(id)", "font-size": 8 } },
                    { selector: "edge", style: { width: 1, "line-color": "#ccc" } },
                ]);
                cy.layout({ name: "graphty-forceatlas2" }).run();
            });
        </script>
    </body>
</html>
```

The page uses `.then()` rather than a top-level `await`, because a top-level `await` on a dataset in a bundled entry module can hang the page or fail the build; [Getting started](../getting-started) explains which Vite versions do which.

Valjean, with 36 neighbors, is drawn at 60 pixels; characters with one neighbor at 12. Cytoscape's `mapData(field, low, high, from, to)` maps `low` to `from` and `high` to `to`, and clamps values outside the range.

The method also returns the values: `cy.graphtyDegreeCentrality().degree(cy.$id("Valjean"))` is `36`. It counts distinct neighbors: for two nodes joined by two parallel edges, it gives each a degree of 1, while Cytoscape's own `node.degree()` counts edges and gives 2. Les Miserables has no parallel edges, so both give Valjean 36.

## A fixed scale with normalized: true

`normalized: true` divides each count by `n - 1`, the most neighbors a node can have, so every value falls between 0 and 1. Valjean's becomes 36 / 76 = 0.47. The range in the style no longer depends on the graph:

```js
cy.graphtyDegreeCentrality({ field: "degree", normalized: true });
const size = "mapData(degree, 0, 1, 12, 60)";
```

On a sparse graph this uses only the small end of the range.

## In-degree and out-degree

A Cytoscape graph has no direction of its own. With `directed: true`, each edge points from `source` to `target`, and `graphtyDegrees` returns `indegree(node)` and `outdegree(node)`. These count edges, parallel ones included. Without `directed: true`, each edge counts both ways and both accessors return the degree. `graphtyDegrees` takes no `field` option, since each node has two values, so write them yourself:

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const cy = cytoscape({
    headless: true,
    elements: [
        { data: { id: "a" } },
        { data: { id: "b" } },
        { data: { id: "c" } },
        { data: { source: "a", target: "b" } },
        { data: { source: "a", target: "c" } },
        { data: { source: "b", target: "c" } },
    ],
});

const { indegree, outdegree } = cy.graphtyDegrees({ directed: true });
cy.nodes().forEach((n) => n.data({ in: indegree(n), out: outdegree(n) }));
console.log(cy.$id("c").data()); // { id: "c", in: 2, out: 0 }
```

Then size by `mapData(in, ...)` to make the most-linked-to nodes biggest. For one directed count written straight to a field, use `graphtyDegreeCentrality({ directed: true, mode: "in", field: "in" })`; `mode` is `"in"`, `"out"` or `"total"` (the default).

## Try it

The [centrality gallery](https://graphty.app/storybook/cytoscape-extensions/?path=/story/gallery--centrality) runs degree centrality next to the other centrality measures.

## See also

- [Color nodes by PageRank](./color-by-pagerank) shades nodes by importance instead.
- [Algorithms](../algorithms) explains `field`, `directed` and reading results.
