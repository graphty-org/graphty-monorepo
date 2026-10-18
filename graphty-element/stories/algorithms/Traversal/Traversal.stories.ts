import { algorithmMetaBase, createAlgorithmStory, documented, onLoadSource, type Story } from "../helpers";

/**
 * The traversals sit under Algorithms / Paths with the shortest-route stories. This file keeps its
 * own component id, so its story ids do not change, and leaves the Docs page to
 * ShortestPath/ShortestPath.stories.ts, which declares it for the whole title.
 */
const meta = {
    ...algorithmMetaBase,
    title: "Algorithms/Paths",
    id: "algorithms-traversal",
    tags: ["!autodocs"],
};
export default meta;

/** Breadth-first search: nodes colored by how many steps from the start the search reached them. */
export const BFS: Story = {
    name: "Breadth-first search",
    ...documented(createAlgorithmStory("graphty:bfs", { varies: "hex", atLeast: 3 }), {
        caption:
            "Breadth-first search from the first cat: each node is colored by how many steps away it is, darker " +
            'for further. Set algorithmsOnLoad = ["bfs"].',
        code: onLoadSource('["bfs"]'),
    }),
};

/** Depth-first search: nodes colored by the order in which the search discovered them. */
export const DFS: Story = {
    name: "Depth-first search",
    ...documented(createAlgorithmStory("graphty:dfs", { varies: "hex", atLeast: 3 }), {
        caption:
            "Depth-first search from the first cat: each node is colored by when the search discovered it, light " +
            'for first and dark for last. Set algorithmsOnLoad = ["dfs"].',
        code: onLoadSource('["dfs"]'),
    }),
};
