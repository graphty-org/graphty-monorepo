import { algorithmMetaBase, createAlgorithmStory, type Story } from "../helpers";

const meta = {
    ...algorithmMetaBase,
    title: "Algorithms/Shortest Path",
};
export default meta;

/**
 * Dijkstra - the cheapest route between two nodes, highlighted along its whole length.
 *
 * The nodes and the edges ON the route are painted; everything else is left exactly as the
 * layers beneath it drew it, because a node the route does not run through is not the route's
 * to paint.
 */
export const Dijkstra: Story = createAlgorithmStory("graphty:dijkstra");

/**
 * Bellman-Ford - the same route, found a different way: it allows negative edge weights.
 *
 * IT DRAWS THE SAME PICTURE AS DIJKSTRA, AND THAT IS THE RIGHT ANSWER. Both stories ask for the
 * cheapest route between the same two nodes of the same graph -- each algorithm defaults to the
 * first node and the last -- so a picture that differed would mean one of them had the route
 * wrong. It is the same case as Kruskal and Prim, which find the same minimum spanning tree and
 * are marked the same way in the spanning tree stories.
 *
 * This was invisible until the renderer stopped losing paint: while the two stories were each
 * dropping a different arbitrary part of the graph's repaint, they differed by the parts they
 * happened to lose, and "these two stories draw different pictures" passed for the wrong reason.
 */
export const BellmanFord: Story = createAlgorithmStory("graphty:bellman-ford", { distinct: false });

/**
 * Floyd-Warshall - all-pairs shortest paths
 * Colors nodes by eccentricity using inferno gradient
 * Central nodes (eccentricity = radius) are highlighted with glow
 * Peripheral nodes (eccentricity = diameter) are dimmed
 */
export const FloydWarshall: Story = createAlgorithmStory("graphty:floyd-warshall", { varies: "hex", atLeast: 2 });
