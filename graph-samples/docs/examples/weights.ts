import { fromEdgeArrays } from "@graphty/graph-format";
import { gridGraph, withWeights } from "@graphty/graph-samples/generators";

// A 20 x 20 street grid with a fifth of the crossings blocked, positions, and travel times 1 to 9.
const roads = gridGraph({
    rows: 20,
    cols: 20,
    obstacles: 0.2,
    positions: true,
    weights: { kind: "integer", min: 1, max: 9 },
    seed: 1,
});
const snapshot = fromEdgeArrays(roads);
console.log(snapshot.flags.weighted, snapshot.nodes.has("x"), snapshot.nodes.has("blocked")); // true true true

// Any graph can be weighted afterwards; "euclidean" uses the x and y columns.
const byDistance = withWeights(gridGraph({ rows: 3, cols: 3, positions: true }), { kind: "euclidean" });
console.log(byDistance.weights?.[0]); // 1
