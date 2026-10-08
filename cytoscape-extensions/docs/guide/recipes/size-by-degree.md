# Size nodes by degree

`cy.graphtyDegreeCentrality({ field: "degree" })` writes each node's neighbor count into `data("degree")`. A `mapData()` style turns that number into a width and height.

## The whole page

This page loads the Les Miserables character network (77 nodes, 254 edges) and sizes each character by how many others they share a scene with. Open it as an HTML file. Until the package's first release, its jsDelivr URL returns 404.

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

Valjean, with 36 neighbors, is drawn at 60 pixels; characters with one neighbor at 12. `mapData(field, low, high, from, to)` clamps values outside the range.

The method counts distinct neighbors, so two nodes joined by two parallel edges each get 1, where Cytoscape's `node.degree()` gives 2.

## A fixed scale with normalized: true

`normalized: true` divides each count by `n - 1`, the most neighbors a node can have, so the style range no longer depends on the graph. Valjean's becomes 36 / 76 = 0.47.

```js
cy.graphtyDegreeCentrality({ field: "degree", normalized: true });
const size = "mapData(degree, 0, 1, 12, 60)";
```

## In-degree and out-degree

For one directed count written to a field, pass `directed: true` (each edge points from `source` to `target`) and `mode`, which is `"in"`, `"out"` or `"total"` (the default): `graphtyDegreeCentrality({ directed: true, mode: "in", field: "in" })`.

For both counts, `graphtyDegrees({ directed: true })` returns `indegree(node)` and `outdegree(node)`, which count edges, parallel ones included. It takes no `field` option, so write the values yourself:

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

## Try it

The [centrality gallery](https://graphty.app/storybook/cytoscape-extensions/?path=/story/gallery--centrality) runs degree centrality beside other measures.

## See also

- [Color nodes by PageRank](./color-by-pagerank) shades nodes by importance.
- [Algorithms](../algorithms) explains `field`, `directed` and reading results.
