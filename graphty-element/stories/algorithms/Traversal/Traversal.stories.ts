import { algorithmMetaBase, createAlgorithmStory, type Story } from "../helpers";

const meta = {
    ...algorithmMetaBase,
    title: "Algorithms/Traversal",
};
export default meta;

/**
 * BFS - Breadth-First Search
 * Colors nodes by BFS level from source (the default orange-to-brown ramp)
 * Nodes closer to source are larger
 */
export const BFS: Story = createAlgorithmStory("graphty:bfs", { varies: "hex", atLeast: 3 });

/**
 * DFS - Depth-First Search
 * Colors nodes by DFS discovery time (the default ramp: orange = earliest, dark brown = latest)
 * Nodes discovered earlier are larger
 */
export const DFS: Story = createAlgorithmStory("graphty:dfs", { varies: "hex", atLeast: 3 });
