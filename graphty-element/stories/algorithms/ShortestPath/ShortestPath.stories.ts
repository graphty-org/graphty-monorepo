import { algorithmMetaBase, CAT_NETWORK, createAlgorithmStory, documented, onLoadSource, type Story } from "../helpers";

/**
 * Algorithms / Paths holds two files: this one (shortest routes) and the traversals in
 * Traversal/Traversal.stories.ts. Both keep their old component ids, so their story ids and
 * screenshots do not change; only this one declares the Docs page.
 */
const meta = {
    ...algorithmMetaBase,
    title: "Algorithms/Paths",
    id: "algorithms-shortest-path",
    tags: ["autodocs"],
    parameters: {
        ...algorithmMetaBase.parameters,
        docs: {
            description: {
                component:
                    `Path algorithms find routes through the graph. A shortest-route algorithm (Dijkstra, ` +
                    `Bellman-Ford) paints the nodes and edges on the route and leaves every other element as it ` +
                    `was. Floyd-Warshall measures every pair at once and colors each node by how far it is from ` +
                    `the node furthest from it. The traversals (breadth-first and depth-first search) color each ` +
                    `node by the order in which the search reached it. Each story draws ${CAT_NETWORK}.`,
            },
        },
    },
};
export default meta;

/** Dijkstra: the cheapest route between two nodes, highlighted along its whole length. */
export const Dijkstra: Story = documented(createAlgorithmStory("graphty:dijkstra"), {
    caption:
        "The shortest route between the first and the last cat is painted orange, nodes and edges; nothing " +
        'else changes. Set algorithmsOnLoad = ["dijkstra"].',
    code: onLoadSource('["dijkstra"]'),
});

/**
 * Bellman-Ford: the same route, found a different way that also allows negative edge weights.
 *
 * It draws the same picture as Dijkstra, and that is the right answer: both ask for the cheapest
 * route between the same two nodes of the same graph, so a different picture would mean one of
 * them had the route wrong.
 */
export const BellmanFord: Story = {
    name: "Bellman-Ford",
    ...documented(createAlgorithmStory("graphty:bellman-ford", { distinct: false }), {
        caption:
            "The same shortest route as Dijkstra, found by Bellman-Ford, which also accepts negative edge weights. " +
            'Set algorithmsOnLoad = ["bellman-ford"].',
        code: onLoadSource('["bellman-ford"]'),
    }),
};

/** Floyd-Warshall: every shortest route at once, drawn as each node's distance to the furthest node. */
export const FloydWarshall: Story = {
    name: "Floyd-Warshall",
    ...documented(createAlgorithmStory("graphty:floyd-warshall", { varies: "hex", atLeast: 2 }), {
        caption:
            "Floyd-Warshall measures the shortest route between every pair of cats; each node is colored by its " +
            'distance to the cat furthest from it, darker for the outskirts. Set algorithmsOnLoad = ["floyd-warshall"].',
        code: onLoadSource('["floyd-warshall"]'),
    }),
};
