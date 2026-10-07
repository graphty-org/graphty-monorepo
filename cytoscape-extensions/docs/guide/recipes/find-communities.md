# Find communities

`graphtyLouvain` splits a graph into communities: groups of nodes linked more to each other than
to the rest. Write each node's community number into its data and a stylesheet colors each group.

The package has not had its first release yet, so the jsDelivr URL below returns 404 until it does; see [Installation](../installation).

## Color Louvain communities on the karate club

The `karate` sample dataset is the 34 members of a club that split in two. Each node's
`data("club")` holds the faction it joined, `"Mr. Hi"` or `"Officer"`. This page fills nodes by
Louvain community and draws the Officer's faction as squares.

```html
<!doctype html>
<html>
    <body>
        <p id="score"></p>
        <div id="cy" style="width: 800px; height: 600px"></div>
        <script type="module">
            import cytoscape from "https://cdn.jsdelivr.net/npm/cytoscape@3/dist/cytoscape.esm.min.mjs";
            import graphtyCytoscape from "https://cdn.jsdelivr.net/npm/@graphty/cytoscape-extensions/dist/cdn/cytoscape-extensions.js";

            cytoscape.use(graphtyCytoscape);

            const palette = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#b07aa1"];

            const cy = cytoscape({
                container: document.getElementById("cy"),
                style: [
                    { selector: "node", style: { label: "data(id)" } },
                    // fill shows the detected community, shape shows the faction each member really joined
                    {
                        selector: "node[community]",
                        style: { "background-color": (node) => palette[node.data("community") % palette.length] },
                    },
                    { selector: 'node[club = "Officer"]', style: { shape: "square" } },
                ],
            });

            cy.graphtyDataset("karate").then(() => {
                const communities = cy.graphtyLouvain({ field: "community", resolution: 1 });

                const found = cy.graphtyModularity({ clusters: communities });
                const club = cy.graphtyModularity({ clusters: "club" });
                document.getElementById("score").textContent =
                    `Louvain: ${communities.length} communities, modularity ${found.toFixed(3)}. ` +
                    `Club split: 2 factions, modularity ${club.toFixed(3)}.`;

                cy.layout({ name: "graphty-kamada-kawai" }).run();
            });
        </script>
    </body>
</html>
```

The page prints `Louvain: 4 communities, modularity 0.419. Club split: 2 factions, modularity
0.358.` Louvain cuts each faction in two; only members 8 and 9 land across the real split.

## The result

`graphtyLouvain` returns an array of node collections, one per community, numbered from 0, plus
`cluster(node)`, `modularity` and `iterations`. `field: "community"` also writes each number into
`data("community")`, which the palette index reads.

`graphtyModularity` scores any partition of the same graph; `clusters: "club"` reads each node's
group from that data field. Higher means more edges inside groups than chance predicts, so
Louvain's 0.419 beats the 0.358 of the split the members chose.

## Resolution and seeds

`resolution` (default `1`) sets group size: below 1 gives fewer, larger communities. On karate,
`resolution: 0.5` gives 2 communities, and only member 8 sits across the club split.

Louvain visits nodes in a fixed order, so the same graph always gives the same communities. It has
no `randomSeed` option and throws if you pass one. `graphtyLeiden` takes `resolution` and
`randomSeed` (default `42`).

## See also

- [Algorithms](../algorithms): call any graphty algorithm and write its result onto elements
- [Algorithm reference](../../reference/algorithms): every option of `graphtyLouvain`
