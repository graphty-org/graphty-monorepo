/**
 * Minimum Cut Algorithm Stories
 *
 * Demonstrates minimum cut algorithm with a before/after visualization.
 * Shows how the graph is partitioned into two sets with minimum edge weight cut.
 *
 * IMPORTANT: This story uses the actual stoerWagner implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { Graph, stoerWagner } from "@graphty/algorithms";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import {
    type GeneratedGraph,
    generateGraph,
    type GraphType,
} from "../utils/graph-generators.js";
import {
    createSimpleAnimationControls,
    createStatusPanel,
    createStoryContainer,
    renderGraph,
    updateStatus,
} from "../utils/visualization.js";

/**
 * Story arguments interface.
 */
interface MinCutArgs {
    nodeCount: number;
    graphType: GraphType;
    seed: number;
}

/**
 * Convert GeneratedGraph to @graphty/algorithms Graph with string node IDs.
 */
function toAlgorithmGraph(generatedGraph: GeneratedGraph): Graph {
    const graph = new Graph({ directed: false });

    for (const node of generatedGraph.nodes) {
        graph.addNode(String(node.id));
    }

    for (const edge of generatedGraph.edges) {
        graph.addEdge(String(edge.source), String(edge.target), edge.weight ?? 1);
    }

    return graph;
}

/**
 * Color palette for partitions.
 */
const PARTITION_COLORS = {
    partition1: "#3b82f6", // blue
    partition2: "#f59e0b", // amber
    cutEdge: "#ef4444", // red
};

/**
 * Create the Min Cut visualization story.
 */
function createMinCutStory(args: MinCutArgs): HTMLElement {
    const { nodeCount, graphType, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);
    const graph = toAlgorithmGraph(generatedGraph);

    // Run Stoer-Wagner minimum cut algorithm
    const result = stoerWagner(graph);

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph (initial state - uniform coloring)
    renderGraph(svg, generatedGraph);

    // Create legend
    const legend = document.createElement("div");
    legend.style.cssText = `
        display: flex;
        align-items: center;
        gap: 16px;
        margin-top: 8px;
        font-family: system-ui, sans-serif;
        font-size: 12px;
        flex-wrap: wrap;
    `;
    legend.innerHTML = `
        <span style="color: #64748b;">Partitions:</span>
        <span style="display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 12px; height: 12px; background: ${PARTITION_COLORS.partition1}; border-radius: 50%;"></span>
            <span style="color: #475569;">Partition 1</span>
        </span>
        <span style="display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 12px; height: 12px; background: ${PARTITION_COLORS.partition2}; border-radius: 50%;"></span>
            <span style="color: #475569;">Partition 2</span>
        </span>
        <span style="display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 12px; height: 3px; background: ${PARTITION_COLORS.cutEdge};"></span>
            <span style="color: #475569;">Cut Edges</span>
        </span>
    `;
    container.appendChild(legend);

    // Create info panel
    const infoPanel = document.createElement("div");
    infoPanel.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background: #f1f5f9;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
    `;
    infoPanel.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">Minimum Cut (Stoer-Wagner)</div>
        <div data-cut-value style="margin-bottom: 8px; color: #475569;">Cut value: —</div>
        <div data-partitions style="display: flex; gap: 16px; flex-wrap: wrap;"></div>
    `;
    container.appendChild(infoPanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Click 'Find Min Cut' to compute minimum cut");

    let isApplied = false;

    /**
     * Update partitions display.
     */
    function updatePartitionsDisplay(): void {
        const cutValueEl = infoPanel.querySelector("[data-cut-value]");
        const partitionsEl = infoPanel.querySelector("[data-partitions]");

        if (cutValueEl) {
            cutValueEl.textContent = `Cut value: ${result.cutValue}`;
        }

        if (!partitionsEl) {
            return;
        }

        partitionsEl.innerHTML = "";

        // Partition 1
        const p1Container = document.createElement("div");
        p1Container.innerHTML = `<div style="font-weight: 500; margin-bottom: 4px; color: ${PARTITION_COLORS.partition1};">Partition 1:</div>`;
        const p1Badges = document.createElement("div");
        p1Badges.style.cssText = "display: flex; gap: 4px; flex-wrap: wrap;";
        for (const nodeId of result.partition1) {
            const badge = document.createElement("span");
            badge.style.cssText = `
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 28px;
                padding: 4px 6px;
                background: ${PARTITION_COLORS.partition1};
                color: white;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
            `;
            badge.textContent = nodeId;
            p1Badges.appendChild(badge);
        }
        p1Container.appendChild(p1Badges);
        partitionsEl.appendChild(p1Container);

        // Partition 2
        const p2Container = document.createElement("div");
        p2Container.innerHTML = `<div style="font-weight: 500; margin-bottom: 4px; color: ${PARTITION_COLORS.partition2};">Partition 2:</div>`;
        const p2Badges = document.createElement("div");
        p2Badges.style.cssText = "display: flex; gap: 4px; flex-wrap: wrap;";
        for (const nodeId of result.partition2) {
            const badge = document.createElement("span");
            badge.style.cssText = `
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 28px;
                padding: 4px 6px;
                background: ${PARTITION_COLORS.partition2};
                color: white;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
            `;
            badge.textContent = nodeId;
            p2Badges.appendChild(badge);
        }
        p2Container.appendChild(p2Badges);
        partitionsEl.appendChild(p2Container);
    }

    /**
     * Apply min cut visualization.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        // Apply colors to nodes based on partition
        const nodes = svg.querySelectorAll("[data-node-id]");
        nodes.forEach((node) => {
            const nodeId = node.getAttribute("data-node-id") ?? "";
            if (result.partition1.has(nodeId)) {
                (node as SVGCircleElement).setAttribute("fill", PARTITION_COLORS.partition1);
            } else if (result.partition2.has(nodeId)) {
                (node as SVGCircleElement).setAttribute("fill", PARTITION_COLORS.partition2);
            }
        });

        // Apply colors to edges - highlight cut edges
        const cutEdgeSet = new Set<string>();
        for (const cutEdge of result.cutEdges) {
            cutEdgeSet.add(`${cutEdge.from}-${cutEdge.to}`);
            cutEdgeSet.add(`${cutEdge.to}-${cutEdge.from}`);
        }

        const edges = svg.querySelectorAll("[data-source]");
        edges.forEach((edge) => {
            const source = edge.getAttribute("data-source") ?? "";
            const target = edge.getAttribute("data-target") ?? "";
            const edgeKey = `${source}-${target}`;

            if (cutEdgeSet.has(edgeKey)) {
                (edge as SVGLineElement).setAttribute("stroke", PARTITION_COLORS.cutEdge);
                (edge as SVGLineElement).setAttribute("stroke-width", "4");
                (edge as SVGLineElement).setAttribute("stroke-dasharray", "5,5");
            } else {
                // Color by partition
                if (result.partition1.has(source) && result.partition1.has(target)) {
                    (edge as SVGLineElement).setAttribute("stroke", PARTITION_COLORS.partition1);
                } else if (result.partition2.has(source) && result.partition2.has(target)) {
                    (edge as SVGLineElement).setAttribute("stroke", PARTITION_COLORS.partition2);
                }
            }
        });

        updatePartitionsDisplay();
        updateStatus(statusPanel, `Minimum cut found! Cut value: ${result.cutValue} (${result.cutEdges.length} edges)`);
    }

    /**
     * Reset visualization.
     */
    function reset(): void {
        isApplied = false;

        const nodes = svg.querySelectorAll("[data-node-id]");
        nodes.forEach((node) => {
            (node as SVGCircleElement).setAttribute("fill", "#6366f1");
        });

        const edges = svg.querySelectorAll("[data-source]");
        edges.forEach((edge) => {
            (edge as SVGLineElement).setAttribute("stroke", "#94a3b8");
            (edge as SVGLineElement).setAttribute("stroke-width", "2");
            (edge as SVGLineElement).removeAttribute("stroke-dasharray");
        });

        const cutValueEl = infoPanel.querySelector("[data-cut-value]");
        if (cutValueEl) {
            cutValueEl.textContent = "Cut value: —";
        }

        const partitionsEl = infoPanel.querySelector("[data-partitions]");
        if (partitionsEl) {
            partitionsEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Not computed yet</span>';
        }

        updateStatus(statusPanel, "Click 'Find Min Cut' to compute minimum cut");
    }

    // Initialize display
    const partitionsEl = infoPanel.querySelector("[data-partitions]");
    if (partitionsEl) {
        partitionsEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Not computed yet</span>';
    }

    // Add controls
    const controls = createSimpleAnimationControls(apply, reset, "Find Min Cut");
    container.appendChild(controls);

    return container;
}

const meta: Meta<MinCutArgs> = {
    title: "Flow",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 4, max: 12, step: 1 },
            description: "Number of nodes in the graph",
        },
        graphType: {
            control: { type: "select" },
            options: ["random", "grid"] as GraphType[],
            description: "Type of graph to generate",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        nodeCount: 8,
        graphType: "random",
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<MinCutArgs>;

/**
 * Minimum cut story with before/after visualization.
 *
 * This story uses the actual `stoerWagner()` function from @graphty/algorithms.
 * Nodes are colored by partition, and cut edges are highlighted.
 */
export const MinCut: Story = {
    render: (args) => createMinCutStory(args),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        const findButton = canvas.getByRole("button", { name: /find min cut/i });
        await userEvent.click(findButton);

        await waitFor(
            async () => {
                const statusText = canvasElement.querySelector("[data-status]")?.textContent ?? "";
                await expect(statusText).toContain("Minimum cut found");
            },
            { timeout: 5000 },
        );
    },
};
