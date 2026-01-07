/**
 * Bipartite Matching Algorithm Stories
 *
 * Demonstrates bipartite matching with a before/after visualization.
 * Shows the bipartite partition and matched edges.
 *
 * IMPORTANT: This story uses the actual maximumBipartiteMatching implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { bipartitePartition, Graph, maximumBipartiteMatching } from "@graphty/algorithms";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import {
    type GeneratedGraph,
    type GraphNode,
    SeededRandom,
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
interface BipartiteArgs {
    leftNodes: number;
    rightNodes: number;
    edgeProbability: number;
    seed: number;
}

/**
 * Generate a bipartite graph.
 */
function generateBipartiteGraph(
    leftNodes: number,
    rightNodes: number,
    edgeProbability: number,
    seed: number,
    width: number = 500,
    height: number = 500,
): GeneratedGraph {
    const rng = new SeededRandom(seed);
    const nodes: GraphNode[] = [];
    const edges: GeneratedGraph["edges"] = [];

    // Left partition (left side of canvas)
    for (let i = 0; i < leftNodes; i++) {
        nodes.push({
            id: i,
            label: `L${i}`,
            x: 100,
            y: 50 + ((i + 0.5) * (height - 100)) / leftNodes,
        });
    }

    // Right partition (right side of canvas)
    for (let i = 0; i < rightNodes; i++) {
        nodes.push({
            id: leftNodes + i,
            label: `R${i}`,
            x: width - 100,
            y: 50 + ((i + 0.5) * (height - 100)) / rightNodes,
        });
    }

    // Create edges between partitions
    for (let i = 0; i < leftNodes; i++) {
        for (let j = 0; j < rightNodes; j++) {
            if (rng.next() < edgeProbability) {
                edges.push({
                    source: i,
                    target: leftNodes + j,
                });
            }
        }
    }

    // Ensure at least some edges exist
    if (edges.length === 0 && leftNodes > 0 && rightNodes > 0) {
        edges.push({
            source: 0,
            target: leftNodes,
        });
    }

    return { nodes, edges };
}

/**
 * Convert GeneratedGraph to @graphty/algorithms Graph.
 */
function toAlgorithmGraph(generatedGraph: GeneratedGraph): Graph {
    const graph = new Graph({ directed: false });

    for (const node of generatedGraph.nodes) {
        graph.addNode(node.id);
    }

    for (const edge of generatedGraph.edges) {
        graph.addEdge(edge.source, edge.target);
    }

    return graph;
}

/**
 * Color palette for bipartite partitions.
 */
const PARTITION_COLORS = {
    left: "#3b82f6", // blue
    right: "#f59e0b", // amber
    matched: "#22c55e", // green
    unmatched: "#94a3b8", // gray
};

/**
 * Create the Bipartite Matching visualization story.
 */
function createBipartiteStory(args: BipartiteArgs): HTMLElement {
    const { leftNodes, rightNodes, edgeProbability, seed } = args;

    // Generate bipartite graph
    const generatedGraph = generateBipartiteGraph(leftNodes, rightNodes, edgeProbability, seed);
    const graph = toAlgorithmGraph(generatedGraph);

    // Get bipartite partition and matching
    const partition = bipartitePartition(graph);
    const matching = maximumBipartiteMatching(graph);

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph (initial state)
    renderGraph(svg, generatedGraph);

    // Color nodes by initial partition (left/right based on position)
    const nodes = svg.querySelectorAll("[data-node-id]");
    nodes.forEach((node) => {
        const nodeId = parseInt(node.getAttribute("data-node-id") ?? "0");
        if (nodeId < leftNodes) {
            (node as SVGCircleElement).setAttribute("fill", PARTITION_COLORS.left);
        } else {
            (node as SVGCircleElement).setAttribute("fill", PARTITION_COLORS.right);
        }
    });

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
            <span style="width: 12px; height: 12px; background: ${PARTITION_COLORS.left}; border-radius: 50%;"></span>
            <span style="color: #475569;">Left (${leftNodes})</span>
        </span>
        <span style="display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 12px; height: 12px; background: ${PARTITION_COLORS.right}; border-radius: 50%;"></span>
            <span style="color: #475569;">Right (${rightNodes})</span>
        </span>
        <span style="display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 20px; height: 3px; background: ${PARTITION_COLORS.matched};"></span>
            <span style="color: #475569;">Matched</span>
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
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">Maximum Bipartite Matching</div>
        <div data-is-bipartite style="margin-bottom: 8px; color: #475569;">Bipartite: —</div>
        <div data-matching style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
    `;
    container.appendChild(infoPanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Click 'Find Matching' to compute maximum matching");

    let isApplied = false;

    /**
     * Update matching display.
     */
    function updateMatchingDisplay(): void {
        const bipartiteEl = infoPanel.querySelector("[data-is-bipartite]");
        const matchingEl = infoPanel.querySelector("[data-matching]");

        if (bipartiteEl) {
            bipartiteEl.textContent = `Bipartite: ${partition !== null ? "Yes ✓" : "No ✗"}`;
            (bipartiteEl as HTMLElement).style.color = partition !== null ? "#22c55e" : "#ef4444";
        }

        if (!matchingEl) {
            return;
        }

        matchingEl.innerHTML = "";

        if (matching.size === 0) {
            matchingEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">No matching found</span>';
            return;
        }

        for (const [source, target] of matching.matching) {
            const badge = document.createElement("span");
            badge.style.cssText = `
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 4px 8px;
                background: ${PARTITION_COLORS.matched};
                color: white;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
            `;
            const sourceLabel = generatedGraph.nodes.find((n) => n.id === source)?.label ?? source;
            const targetLabel = generatedGraph.nodes.find((n) => n.id === target)?.label ?? target;
            badge.textContent = `${sourceLabel}↔${targetLabel}`;
            matchingEl.appendChild(badge);
        }
    }

    /**
     * Apply matching visualization.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        // Create set of matched edges for quick lookup
        const matchedEdgeSet = new Set<string>();
        for (const [source, target] of matching.matching) {
            matchedEdgeSet.add(`${source}-${target}`);
            matchedEdgeSet.add(`${target}-${source}`);
        }

        // Highlight matched edges
        const edges = svg.querySelectorAll("[data-source]");
        edges.forEach((edge) => {
            const source = edge.getAttribute("data-source") ?? "";
            const target = edge.getAttribute("data-target") ?? "";
            const edgeKey = `${source}-${target}`;

            if (matchedEdgeSet.has(edgeKey)) {
                (edge as SVGLineElement).setAttribute("stroke", PARTITION_COLORS.matched);
                (edge as SVGLineElement).setAttribute("stroke-width", "4");
            } else {
                (edge as SVGLineElement).setAttribute("stroke", PARTITION_COLORS.unmatched);
                (edge as SVGLineElement).setAttribute("stroke-width", "1");
            }
        });

        // Highlight matched nodes
        const matchedNodes = new Set<string>();
        for (const [source, target] of matching.matching) {
            matchedNodes.add(String(source));
            matchedNodes.add(String(target));
        }

        const nodeElements = svg.querySelectorAll("[data-node-id]");
        nodeElements.forEach((node) => {
            const nodeId = node.getAttribute("data-node-id") ?? "0";
            if (matchedNodes.has(nodeId)) {
                (node as SVGCircleElement).setAttribute("stroke", PARTITION_COLORS.matched);
                (node as SVGCircleElement).setAttribute("stroke-width", "3");
            }
        });

        updateMatchingDisplay();
        updateStatus(statusPanel, `Maximum matching: ${matching.size} edges (${matchedNodes.size} nodes)`);
    }

    /**
     * Reset visualization.
     */
    function reset(): void {
        isApplied = false;

        // Reset node colors to partition colors
        const nodeElements = svg.querySelectorAll("[data-node-id]");
        nodeElements.forEach((node) => {
            const nodeId = parseInt(node.getAttribute("data-node-id") ?? "0");
            if (nodeId < leftNodes) {
                (node as SVGCircleElement).setAttribute("fill", PARTITION_COLORS.left);
            } else {
                (node as SVGCircleElement).setAttribute("fill", PARTITION_COLORS.right);
            }
            (node as SVGCircleElement).setAttribute("stroke", "#4338ca");
            (node as SVGCircleElement).setAttribute("stroke-width", "2");
        });

        // Reset edge colors
        const edges = svg.querySelectorAll("[data-source]");
        edges.forEach((edge) => {
            (edge as SVGLineElement).setAttribute("stroke", "#94a3b8");
            (edge as SVGLineElement).setAttribute("stroke-width", "2");
        });

        const bipartiteEl = infoPanel.querySelector("[data-is-bipartite]");
        if (bipartiteEl) {
            bipartiteEl.textContent = "Bipartite: —";
            (bipartiteEl as HTMLElement).style.color = "#475569";
        }

        const matchingEl = infoPanel.querySelector("[data-matching]");
        if (matchingEl) {
            matchingEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Not computed yet</span>';
        }

        updateStatus(statusPanel, "Click 'Find Matching' to compute maximum matching");
    }

    // Initialize display
    const matchingEl = infoPanel.querySelector("[data-matching]");
    if (matchingEl) {
        matchingEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Not computed yet</span>';
    }

    // Add controls
    const controls = createSimpleAnimationControls(apply, reset, "Find Matching");
    container.appendChild(controls);

    return container;
}

const meta: Meta<BipartiteArgs> = {
    title: "Matching",
    argTypes: {
        leftNodes: {
            control: { type: "range", min: 2, max: 8, step: 1 },
            description: "Number of nodes in left partition",
        },
        rightNodes: {
            control: { type: "range", min: 2, max: 8, step: 1 },
            description: "Number of nodes in right partition",
        },
        edgeProbability: {
            control: { type: "range", min: 0.2, max: 0.8, step: 0.1 },
            description: "Probability of edge between partitions",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        leftNodes: 4,
        rightNodes: 4,
        edgeProbability: 0.5,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<BipartiteArgs>;

/**
 * Bipartite matching story with before/after visualization.
 *
 * This story uses the actual `maximumBipartiteMatching()` function from @graphty/algorithms.
 * Matched edges are highlighted in green.
 */
export const Bipartite: Story = {
    render: (args) => createBipartiteStory(args),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        const findButton = canvas.getByRole("button", { name: /find matching/i });
        await userEvent.click(findButton);

        await waitFor(
            async () => {
                const statusText = canvasElement.querySelector("[data-status]")?.textContent ?? "";
                await expect(statusText).toContain("Maximum matching");
            },
            { timeout: 5000 },
        );
    },
};
