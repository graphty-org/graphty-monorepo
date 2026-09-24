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
 * orange = lowest, dark brown = highest) over the extent the run measured, and no size
 * unless the run asks for one (PageRank and HITS below do). The per-algorithm palettes of 1.x
 * (plasma, greens, oranges, blues) and its value-over-maximum scaling went with the hand-written
 * blocks; see the `suggestedStyles` rows of design/element-api/element-api-migration.md.
 */
export const Degree: Story = createAlgorithmStory("graphty:degree", { varies: "hex", atLeast: 3 });

/**
 * PageRank - colours AND sizes nodes by importance; the most important node is the largest and
 * darkest.
 *
 * A node metric suggests a colour and no size, so the size is asked for in the load-time list:
 * `algorithmsOnLoad = [{ algorithm: "graphty:pagerank", style: { size: [1, 5] } }]`, the 1 to 5
 * range 1.x drew.
 * The colour is kept alongside it: the two channels say the same thing, which makes the ranking
 * easier to read rather than harder.
 */
export const PageRank: Story = createAlgorithmStory("graphty:pagerank", { varies: "hex", atLeast: 3, size: [1, 5] });

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
 * HITS - hub and authority scores, coloured and sized by the combined score, as 1.x drew it (size
 * 1 to 4); dark brown and large = most important.
 *
 * The size is asked for in the load-time list:
 * `algorithmsOnLoad = [{ algorithm: "graphty:hits", style: { size: [1, 4] } }]`.
 */
export const HITS: Story = createAlgorithmStory("graphty:hits", { varies: "hex", atLeast: 3, size: [1, 4] });

/**
 * Katz centrality - colours by attenuated paths; dark brown = high Katz centrality.
 */
export const Katz: Story = createAlgorithmStory("graphty:katz", { varies: "hex", atLeast: 3 });
