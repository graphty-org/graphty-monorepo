import { algorithmMetaBase, createAlgorithmStory, type Story } from "../helpers";

const meta = {
    ...algorithmMetaBase,
    title: "Algorithms/Centrality",
};
export default meta;

/**
 * Degree centrality - colors nodes by connection count
 * Uses a red-to-yellow gradient where red = low degree, yellow = high degree
 */
export const Degree: Story = createAlgorithmStory("graphty:degree", { varies: "hex", atLeast: 3 });

/**
 * PageRank - colours nodes by importance.
 *
 * WHAT THIS DRAWS, which is not what this comment used to claim. The element derives one
 * suggestion for every algorithm rather than a block per algorithm, and a node metric suggests a
 * SEQUENTIAL COLOUR over the nodes it measured. Nothing suggests a size. The "scaled from 1 to 5"
 * this story used to describe was a 1.x style template and went with it; every node is drawn at
 * the same size, and the story's own assertion says so.
 */
export const PageRank: Story = createAlgorithmStory("graphty:pagerank", { varies: "hex", atLeast: 3 });

/**
 * Betweenness centrality - colors bridge nodes
 * Uses plasma gradient (blue → pink → yellow) where yellow = high betweenness
 */
export const Betweenness: Story = createAlgorithmStory("graphty:betweenness", { varies: "hex", atLeast: 3 });

/**
 * Closeness centrality - colors by average distance to others
 * Uses greens gradient (light → dark) where dark = high closeness
 */
export const Closeness: Story = createAlgorithmStory("graphty:closeness", { varies: "hex", atLeast: 3 });

/**
 * Eigenvector centrality - colors by influence
 * Uses oranges gradient (light → dark) where dark = high influence
 */
export const Eigenvector: Story = createAlgorithmStory("graphty:eigenvector", { varies: "hex", atLeast: 3 });

/**
 * HITS - hub and authority scores
 * Uses viridis gradient with size for combined hub/authority importance
 */
export const HITS: Story = createAlgorithmStory("graphty:hits", { varies: "hex", atLeast: 3 });

/**
 * Katz centrality - colors by attenuated paths
 * Uses blues gradient (light → dark) where dark = high Katz centrality
 */
export const Katz: Story = createAlgorithmStory("graphty:katz", { varies: "hex", atLeast: 3 });
