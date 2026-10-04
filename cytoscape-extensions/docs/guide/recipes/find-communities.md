# Find communities

`graphtyLouvain` splits a graph into communities: groups of nodes linked more to each other than
to the rest. Write each node's community number into its data and a stylesheet colors each group.

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

In a Vite production build, a top-level `await` on `graphtyDataset()` hangs the page with no
error, so the page uses `.then()`.

The page prints `Louvain: 4 communities, modularity 0.419. Club split: 2 factions, modularity
0.358.` Louvain cuts each faction in two; only members 8 and 9 land across the real split.

## The result

`graphtyLouvain` returns an array of node collections, one per community, numbered from 0, plus
`cluster(node)` (a node's number; pass a collection or a selector such as `"#5"`), `modularity` and
`iterations`. `field: "community"` also writes each number into `data("community")`, which the
palette index reads. `n % palette.length` keeps every node colored when there are more
communities than colors.

`graphtyModularity` scores any partition of the same graph. Its `clusters` option takes a
partition result, an array of node selections, or a node data field name such as `"club"`. Higher
means more edges inside groups than chance predicts, so Louvain's 0.419 beats the 0.358 of the
split the members chose.

## Resolution and seeds

`resolution` (default `1`) sets group size: below 1 gives fewer, larger communities. On karate,
`resolution: 0.5` gives 2 communities and only member 8 sits across the club split. Add this inside the page's `.then()`
callback to check:

```js
const two = cy.graphtyLouvain({ field: "community", resolution: 0.5 });
const hiSide = two.cluster("#0");
const misplaced = cy.nodes().filter((n) => (n.data("community") === hiSide) !== (n.data("club") === "Mr. Hi"));
console.log(
    two.length,
    misplaced.map((n) => n.id()),
); // 2 [ '8' ]
```

Louvain counts every edge as weight 1 unless you pass `weight: "weight"`. It has no `randomSeed`
option, and passing one throws `unknown option randomSeed`: Louvain visits nodes in a fixed order,
so the same graph always gives the same communities. `graphtyLeiden` takes `resolution` and `randomSeed` (default
`42`).

## Try it

The [Communities demo](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-algorithms--communities)
runs the community algorithms on graphs of up to 50,000 nodes.

## See also

- [Algorithms](../algorithms): call any graphty algorithm and write its result onto elements
- [Algorithm reference](../../reference/algorithms): every option of `graphtyLouvain`
