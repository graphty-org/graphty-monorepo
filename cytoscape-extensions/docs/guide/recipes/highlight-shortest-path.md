# Highlight a shortest path

Click one city, then another, and the page paints the shortest road route between them with `graphtyDijkstra`, `pathTo` and a `.path` class.

The `knuth-miles` dataset holds 128 North American cities, with the road miles between every pair in each edge's `weight`. The page drops edges over 300 miles, so a trip crosses several cities and some pairs have no route. It needs a `<div id="cy">` with a height, a `<p id="status">` and a bundler such as Vite. The dataset loads in `.then()` rather than with a top-level `await`, because a top-level `await` in a bundled entry module can hang the page; [Getting started](../getting-started) explains when.

```js
import cytoscape from "cytoscape";
import graphtyCytoscape from "@graphty/cytoscape-extensions";

cytoscape.use(graphtyCytoscape);

const status = document.getElementById("status");
const cy = cytoscape({
    container: document.getElementById("cy"),
    style: [
        { selector: "node", style: { width: 6, height: 6, "background-color": "#999" } },
        { selector: "edge", style: { width: 1, "line-color": "#ddd" } },
        { selector: "node.path", style: { width: 10, height: 10, "background-color": "#d22" } },
        { selector: "edge.path", style: { width: 4, "line-color": "#d22", "z-index": 1 } },
    ],
});

cy.graphtyDataset("knuth-miles").then(() => {
    cy.edges("[weight > 300]").remove();
    cy.nodes().positions((n) => ({ x: n.data("longitude") * 20, y: -n.data("latitude") * 20 }));
    cy.fit();
    status.textContent = "Click a city to start.";
});

let root = null;
cy.on("tap", "node", (event) => {
    const node = event.target;
    if (root === null) {
        cy.elements().removeClass("path");
        root = node.addClass("path");
        status.textContent = `From ${root.id()}: click a second city.`;
        return;
    }
    const paths = cy.elements().graphtyDijkstra({ root, weight: "weight" });
    const miles = paths.distanceTo(node);
    if (miles === Infinity) {
        status.textContent = `No chain of short roads joins ${root.id()} and ${node.id()}.`;
    } else {
        const path = paths.pathTo(node).addClass("path");
        status.textContent = `${root.id()} to ${node.id()}: ${miles} miles, ${path.edges().length} legs.`;
    }
    root = null;
});
```

Youngstown, OH to Savannah, GA prints "829 miles, 4 legs". Seattle, WA to Tampa, FL has no route.

## Reading the result

`graphtyDijkstra` runs once from `root` and answers for every goal. `distanceTo(goal)` is the summed weight of the shortest route, or `Infinity` when there is none. `pathTo(goal)` is a collection of node, edge, node in route order, empty when there is no route.

`weight` names the edge data field that holds the cost; without it every edge weighs 1 and you get the fewest hops. `root` takes a node, a collection or a selector. Edges are undirected unless you pass `directed: true`.

## One route at a time with A\*

`graphtyAStar({ root, goal, weight, heuristic })` returns `{ found, distance, path }` for one goal. `heuristic` estimates the distance left from a node to `goal` and must never overestimate it. Straight-line miles qualify, since no road is shorter:

```js
const goal = cy.getElementById("Savannah, GA");
const rad = Math.PI / 180;
function crowMiles(a, b) {
    const dLat = (b.data("latitude") - a.data("latitude")) * rad;
    const dLon = (b.data("longitude") - a.data("longitude")) * rad;
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(a.data("latitude") * rad) * Math.cos(b.data("latitude") * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * 3959 * Math.asin(Math.sqrt(h));
}
const route = cy.elements().graphtyAStar({
    root: cy.getElementById("Youngstown, OH"),
    goal,
    weight: "weight",
    heuristic: (node) => crowMiles(node, goal),
});
if (route.found) {
    route.path.addClass("path");
}
```

With no route, `found` is `false`, `distance` is `Infinity` and `path` is empty. Without a `heuristic`, A\* searches like Dijkstra.

## Try it

[Paths and trees demo](https://graphty.app/storybook/cytoscape-extensions/?path=/story/demo-algorithms--paths-and-trees)

## See also

- [Algorithms](../algorithms)
- [Algorithm reference](../../reference/algorithms)
