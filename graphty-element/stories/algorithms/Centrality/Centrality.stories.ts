import { algorithmMetaBase, createAlgorithmStory, type Story } from "../helpers";

const meta = {
    ...algorithmMetaBase,
    title: "Algorithms/Centrality",
};
export default meta;

/**
 * Degree centrality - colours nodes by connection count.
 *
 * Every centrality below draws the same way, because the element derives one suggestion for every
 * node metric rather than one per algorithm: the default orange-to-brown ramp (Paul Tol's YlOrBr;
 * orange = lowest, dark brown = highest) over the extent the run measured, and no size. The per-algorithm palettes of 1.x
 * (plasma, greens, oranges, blues) and its value-over-maximum scaling went with the hand-written
 * blocks; see the `suggestedStyles` rows of design/element-api/element-api-migration.md.
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
 * Betweenness centrality - colours bridge nodes; dark brown = high betweenness.
 */
export const Betweenness: Story = createAlgorithmStory("graphty:betweenness", { varies: "hex", atLeast: 3 });

/**
 * Closeness centrality - colours by average distance to others; dark brown = high closeness.
 */
export const Closeness: Story = createAlgorithmStory("graphty:closeness", { varies: "hex", atLeast: 3 });

/**
 * Eigenvector centrality - colours by influence; dark brown = high influence.
 */
export const Eigenvector: Story = createAlgorithmStory("graphty:eigenvector", { varies: "hex", atLeast: 3 });

/**
 * HITS - hub and authority scores, coloured by the combined score; dark brown = most important.
 * 1.x also sized the nodes by it; no metric suggests a size in 2.0, and a reader who wants one
 * asks for it with `encode({ run, channel: "node.size", range: [1, 4] })`.
 */
export const HITS: Story = createAlgorithmStory("graphty:hits", { varies: "hex", atLeast: 3 });

/**
 * Katz centrality - colours by attenuated paths; dark brown = high Katz centrality.
 */
export const Katz: Story = createAlgorithmStory("graphty:katz", { varies: "hex", atLeast: 3 });
