/**
 * Common Neighbors Link Prediction Algorithm Stories
 *
 * Demonstrates common neighbors link prediction with a before/after visualization.
 * Shows predicted edges as dashed lines with their scores.
 *
 * IMPORTANT: This story uses the actual commonNeighborsPrediction implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { commonNeighborsPrediction, Graph } from "@graphty/algorithms";
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
interface CommonNeighborsArgs {
    nodeCount: number;
    graphType: GraphType;
    topK: number;
    seed: number;
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
 * Create the Common Neighbors visualization story.
 */
function createCommonNeighborsStory(args: CommonNeighborsArgs): HTMLElement {
    const { nodeCount, graphType, topK, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);
    const graph = toAlgorithmGraph(generatedGraph);

    // Run common neighbors prediction
    const predictions = commonNeighborsPrediction(graph, { topK, includeExisting: false });

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph (initial state)
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
        <span style="color: #64748b;">Edges:</span>
        <span style="display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 20px; height: 2px; background: #94a3b8;"></span>
            <span style="color: #475569;">Existing</span>
        </span>
        <span style="display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 20px; height: 2px; background: #22c55e; border-style: dashed;"></span>
            <span style="color: #475569;">Predicted</span>
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
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">Common Neighbors Predictions</div>
        <div data-predictions style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
    `;
    container.appendChild(infoPanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Click 'Predict Links' to find potential connections");

    let isApplied = false;

    /**
     * Update predictions display.
     */
    function updatePredictionsDisplay(): void {
        const predictionsEl = infoPanel.querySelector("[data-predictions]");
        if (!predictionsEl) {
            return;
        }

        predictionsEl.innerHTML = "";

        if (predictions.length === 0) {
            predictionsEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">No predictions found</span>';
            return;
        }

        for (const pred of predictions) {
            const badge = document.createElement("span");
            badge.style.cssText = `
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 4px 8px;
                background: #22c55e;
                color: white;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
            `;
            badge.textContent = `${pred.source}↔${pred.target} (${pred.score})`;
            predictionsEl.appendChild(badge);
        }
    }

    /**
     * Apply link prediction visualization.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        // Add predicted edges as dashed lines
        const edgeGroup = svg.querySelector(".edges");
        if (edgeGroup) {
            for (const pred of predictions) {
                const sourceNode = generatedGraph.nodes.find((n) => n.id === pred.source);
                const targetNode = generatedGraph.nodes.find((n) => n.id === pred.target);

                if (sourceNode && targetNode) {
                    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    line.setAttribute("x1", String(sourceNode.x));
                    line.setAttribute("y1", String(sourceNode.y));
                    line.setAttribute("x2", String(targetNode.x));
                    line.setAttribute("y2", String(targetNode.y));
                    line.setAttribute("stroke", "#22c55e");
                    line.setAttribute("stroke-width", "2");
                    line.setAttribute("stroke-dasharray", "5,5");
                    line.setAttribute("data-predicted", "true");
                    edgeGroup.appendChild(line);

                    // Add score label
                    const midX = (sourceNode.x + targetNode.x) / 2;
                    const midY = (sourceNode.y + targetNode.y) / 2;
                    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                    text.setAttribute("x", String(midX));
                    text.setAttribute("y", String(midY - 5));
                    text.setAttribute("text-anchor", "middle");
                    text.setAttribute("fill", "#22c55e");
                    text.setAttribute("font-size", "10");
                    text.setAttribute("font-weight", "bold");
                    text.setAttribute("font-family", "system-ui, sans-serif");
                    text.setAttribute("data-predicted-label", "true");
                    text.textContent = String(pred.score);
                    edgeGroup.appendChild(text);
                }
            }
        }

        // Highlight nodes involved in predictions
        const involvedNodes = new Set<number>();
        for (const pred of predictions) {
            involvedNodes.add(pred.source as number);
            involvedNodes.add(pred.target as number);
        }

        const nodes = svg.querySelectorAll("[data-node-id]");
        nodes.forEach((node) => {
            const nodeId = parseInt(node.getAttribute("data-node-id") ?? "0");
            if (involvedNodes.has(nodeId)) {
                (node as SVGCircleElement).setAttribute("stroke", "#22c55e");
                (node as SVGCircleElement).setAttribute("stroke-width", "3");
            }
        });

        updatePredictionsDisplay();
        updateStatus(statusPanel, `Found ${predictions.length} potential link${predictions.length !== 1 ? "s" : ""}`);
    }

    /**
     * Reset visualization.
     */
    function reset(): void {
        isApplied = false;

        // Remove predicted edges
        const predictedEdges = svg.querySelectorAll("[data-predicted]");
        predictedEdges.forEach((edge) => { edge.remove(); });

        const predictedLabels = svg.querySelectorAll("[data-predicted-label]");
        predictedLabels.forEach((label) => { label.remove(); });

        // Reset node styling
        const nodes = svg.querySelectorAll("[data-node-id]");
        nodes.forEach((node) => {
            (node as SVGCircleElement).setAttribute("stroke", "#4338ca");
            (node as SVGCircleElement).setAttribute("stroke-width", "2");
        });

        const predictionsEl = infoPanel.querySelector("[data-predictions]");
        if (predictionsEl) {
            predictionsEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Not computed yet</span>';
        }

        updateStatus(statusPanel, "Click 'Predict Links' to find potential connections");
    }

    // Initialize display
    const predictionsEl = infoPanel.querySelector("[data-predictions]");
    if (predictionsEl) {
        predictionsEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">Not computed yet</span>';
    }

    // Add controls
    const controls = createSimpleAnimationControls(apply, reset, "Predict Links");
    container.appendChild(controls);

    return container;
}

const meta: Meta<CommonNeighborsArgs> = {
    title: "LinkPrediction",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 6, max: 15, step: 1 },
            description: "Number of nodes in the graph",
        },
        graphType: {
            control: { type: "select" },
            options: ["random", "grid", "cycle"] as GraphType[],
            description: "Type of graph to generate",
        },
        topK: {
            control: { type: "range", min: 1, max: 10, step: 1 },
            description: "Number of top predictions to show",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        nodeCount: 8,
        graphType: "random",
        topK: 5,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<CommonNeighborsArgs>;

/**
 * Common Neighbors link prediction story with before/after visualization.
 *
 * This story uses the actual `commonNeighborsPrediction()` function from @graphty/algorithms.
 * Predicted edges are shown as dashed green lines with their scores.
 */
export const CommonNeighbors: Story = {
    render: (args) => createCommonNeighborsStory(args),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        const predictButton = canvas.getByRole("button", { name: /predict links/i });
        await userEvent.click(predictButton);

        await waitFor(
            async () => {
                const statusText = canvasElement.querySelector("[data-status]")?.textContent ?? "";
                await expect(statusText).toContain("potential");
            },
            { timeout: 5000 },
        );
    },
};
