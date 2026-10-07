# Color nodes by PageRank

Run `graphtyPageRank` with a `field` option and every node gets its score in `data(field)`. A
`mapData()` style then shades each node from pale (low rank) to dark (high rank).

`@graphty/cytoscape-extensions` has not had its first release yet, so the jsDelivr URL below returns 404 until it does.

## The page

This page colors Zachary's karate club (34 nodes) and recolors it when you remove the top node.

```html
<button id="remove">Remove the top-ranked node</button>
<div id="cy" style="width: 800px; height: 600px"></div>
<script type="module">
    import cytoscape from "https://cdn.jsdelivr.net/npm/cytoscape@3/dist/cytoscape.esm.min.mjs";
    import graphtyCytoscape from "https://cdn.jsdelivr.net/npm/@graphty/cytoscape-extensions/dist/cdn/cytoscape-extensions.js";

    cytoscape.use(graphtyCytoscape);
    const cy = cytoscape({ container: document.getElementById("cy") });

    function colorByRank(directed) {
        cy.elements().graphtyPageRank({ field: "rank", directed });
        const ranks = cy.nodes().map((node) => node.data("rank"));
        const min = Math.min(...ranks);
        const max = Math.max(...ranks);
        cy.style([
            {
                selector: "node",
                style: {
                    "background-color": `mapData(rank, ${min}, ${max}, #dbeafe, #1e3a8a)`,
                    "border-width": 1,
                    "border-color": "#1e3a8a",
                },
            },
            { selector: "edge", style: { "line-color": "#cbd5e1", width: 1 } },
        ]);
    }

    cy.graphtyDataset("karate").then(({ directed }) => {
        colorByRank(directed);
        cy.layout({ name: "graphty-forceatlas2" }).run();

        document.getElementById("remove").addEventListener("click", () => {
            cy.nodes()
                .max((node) => node.data("rank"))
                .ele.remove();
            colorByRank(directed);
        });
    });
</script>
```

In a bundled app, import from `"cytoscape"` and `"@graphty/cytoscape-extensions"` instead.

Nodes 33 and 0, the club's two leaders, come out darkest (about 0.101 and 0.097); the least
connected members score about 0.010.

## Direction

`graphtyPageRank` reads every edge both ways unless you pass `directed: true`; then rank flows
only along edge direction. `cy.graphtyDataset()` returns `directed` for the graph it added, so
pass it through as the page does.

## Use the observed range

`mapData(rank, min, max, color1, color2)` maps `min` to the first color and `max` to the second.
PageRank scores sum to 1, so the average is 1 / n and a fixed range such as `0, 1` paints almost
every node pale. Build the style from the smallest and largest score of each run.

## Rerun after the graph changes

`data("rank")` describes the graph as it was when PageRank ran. Removing a node changes every
other rank, and a node you add has no `rank`, so Cytoscape skips the mapping and draws it in the
default color. Call `colorByRank(directed)` again after the change. After the page removes node 33, node
0 rises to about 0.112.

Rerun once after the whole change, not from a `remove` handler: Cytoscape fires one event per
element, 18 for node 33 and its 17 edges.

## Try it

The [Centrality demo](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-algorithms--centrality)
runs PageRank and the other centrality measures on generated graphs.

## See also

- [Algorithms](../algorithms): reading results and writing them onto elements.
- [Size nodes by degree](./size-by-degree): the same pattern with node size.
- [Algorithm reference](../../reference/algorithms): every `graphtyPageRank` option.
