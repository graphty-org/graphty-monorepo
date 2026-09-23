import { algorithmMetaBase, createAlgorithmStory, type Story } from "../helpers";

const meta = {
    ...algorithmMetaBase,
    title: "Algorithms/Community",
};
export default meta;

/**
 * Louvain - categorical colors by detected community
 * Uses the default categorical palette, Okabe-Ito, for community membership
 */
export const Louvain: Story = createAlgorithmStory("graphty:louvain", { varies: "hex", atLeast: 2 });

/**
 * Girvan-Newman - community detection via edge betweenness removal
 * Draws with the default categorical palette, Okabe-Ito, like every community story here
 */
export const GirvanNewman: Story = createAlgorithmStory("graphty:girvan-newman", { varies: "hex", atLeast: 2 });

/**
 * Leiden - improved community detection (guarantees connected communities)
 * Draws with the default categorical palette, Okabe-Ito, like every community story here
 */
export const Leiden: Story = createAlgorithmStory("graphty:leiden", { varies: "hex", atLeast: 2 });

/**
 * Label Propagation - fast community detection via label spreading
 * Draws with the default categorical palette, Okabe-Ito, like every community story here
 */
export const LabelPropagation: Story = createAlgorithmStory("graphty:label-propagation", { varies: "hex", atLeast: 2 });
