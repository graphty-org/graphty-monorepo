import type { Graphty } from "../../../src/graphty-element";
import { algorithmMetaBase, type Story, storySetup, waitForGraphSettled } from "../helpers";

const meta = {
    ...algorithmMetaBase,
    title: "Algorithms/Combined",
};
export default meta;

/**
 * Multiple algorithms coexisting - Degree and PageRank
 * - Degree colors nodes (red to yellow) based on connection count
 * - PageRank sizes nodes (1-5) based on importance
 */
export const DegreeAndPageRank: Story = {
    args: {
        setup: storySetup({
            algorithms: ["graphty:degree", "graphty:pagerank"],
        }),
        runAlgorithmsOnLoad: true,
    },
    play: async ({ canvasElement }) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const element = canvasElement.querySelector("graphty-element");
        if (!element) {
            return;
        }

        const graphtyElement = element as Graphty;
        const { graph } = graphtyElement;

        graph.applySuggestedStyles(["graphty:degree", "graphty:pagerank"]);
    },
};

/**
 * Centrality vs Community - compares centrality-based and community-based visualization
 *
 * Demonstrates the difference between centrality-based (PageRank) and
 * community-based (Louvain) visualization approaches:
 * - Nodes are colored by community membership (Louvain)
 * - Node size indicates PageRank importance within each community
 *
 * This combination is particularly useful for identifying influential
 * nodes within each community group.
 */
export const CentralityVsCommunity: Story = {
    args: {
        setup: storySetup({
            algorithms: ["graphty:louvain", "graphty:pagerank"],
        }),
        runAlgorithmsOnLoad: true,
    },
    play: async ({ canvasElement }) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const element = canvasElement.querySelector("graphty-element");
        if (!element) {
            return;
        }

        const graphtyElement = element as Graphty;
        const { graph } = graphtyElement;

        graph.applySuggestedStyles(["graphty:pagerank", "graphty:louvain"]);
    },
};

/**
 * Community Structure with Path Highlighting
 * Combines multiple visualization techniques:
 * - Louvain: Colors nodes by community membership
 * - PageRank: Sizes nodes by importance within the network
 * - Dijkstra: Highlights the shortest path between default nodes
 */
export const CommunityStructureWithPath: Story = {
    args: {
        setup: storySetup({
            algorithms: ["graphty:degree", "graphty:pagerank", "graphty:louvain", "graphty:dijkstra"],
        }),
        runAlgorithmsOnLoad: true,
    },
    play: async ({ canvasElement }) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const element = canvasElement.querySelector("graphty-element");
        if (!element) {
            return;
        }

        const graphtyElement = element as Graphty;
        const { graph } = graphtyElement;

        // Order matters: later algorithms can override earlier ones
        graph.applySuggestedStyles([
            "graphty:degree", // Color by degree (will be overridden by louvain)
            "graphty:pagerank", // Size by PageRank importance
            "graphty:louvain", // Color by community (overrides degree color)
            "graphty:dijkstra", // Highlight shortest path
        ]);
    },
};

/**
 * Combined Edge Flow - edge color and width based on relationship strength
 * Demonstrates multi-dimensional edge styling where:
 * - Edge color intensity reflects the value (blues gradient)
 * - Edge width scales with the value
 *
 * Both channels read the same field, `data.value`, which every edge in this dataset carries with
 * a strength from 1 to 10. The arrow head is left alone: its colour is not a channel a layer can
 * bind, so nothing here can make it follow the line.
 */
export const CombinedEdgeFlow: Story = {
    args: {
        setup: storySetup({
            algorithms: [],
        }),
        runAlgorithmsOnLoad: false,
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);

        const element = canvasElement.querySelector("graphty-element");
        if (!element) {
            return;
        }

        const { session } = element as Graphty;

        await session.styles.add({
            name: "Relationship strength",
            target: "edge",
            selector: { match: "has", path: "data.value" },
            encode: {
                "edge.color": { by: "data.value", scale: "linear", palette: "blues", domain: [1, 10] },
                "edge.width": { by: "data.value", scale: "linear", domain: [1, 10], range: [2, 12] },
            },
        });
    },
};
