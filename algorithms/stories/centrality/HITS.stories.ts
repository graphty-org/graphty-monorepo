/**
 * HITS (Hyperlink-Induced Topic Search) Algorithm Stories
 *
 * Demonstrates HITS algorithm with a before/after dual heat map visualization.
 * Shows both hub scores (nodes pointing to authorities) and authority scores
 * (nodes pointed to by hubs).
 *
 * IMPORTANT: This story uses the actual hits implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { hits } from "@graphty/algorithms";
import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import { type GeneratedGraph, generateGraph, type GraphType } from "../utils/graph-generators.js";
import { byId } from "../utils/snapshot.js";
import {
    callSource,
    createCallPanel,
    createHeatMapLegend,
    createSimpleAnimationControls,
    createStatusPanel,
    createStoryContainer,
    getHeatMapColor,
    renderGraph,
    updateStatus,
} from "../utils/visualization.js";
import { storyWaitOptions } from "../utils/wait.js";

/**
 * Story arguments interface.
 */
interface HITSArgs {
    nodeCount: number;
    graphType: GraphType;
    maxIterations: number;
    displayMode: "hubs" | "authorities" | "combined";
    seed: number;
}

/**
 * Freeze GeneratedGraph as a directed snapshot.
 */
function toDirectedGraph(generatedGraph: GeneratedGraph): GraphSnapshot {
    const graph = new GraphBuilder({ directed: true });

    for (const node of generatedGraph.nodes) {
        graph.addNode(node.id);
    }

    // Create directed edges based on source < target
    for (const edge of generatedGraph.edges) {
        graph.addEdge(edge.source, edge.target);
        // Add some reverse edges for interesting HITS dynamics
        if (edge.source > edge.target) {
            graph.addEdge(edge.target, edge.source);
        }
    }

    return graph.freeze();
}

/**
 * Create the HITS visualization story.
 */
function createHITSStory(args: HITSArgs): HTMLElement {
    const { nodeCount, graphType, maxIterations, displayMode, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);
    const graph = toDirectedGraph(generatedGraph);

    // Calculate HITS using actual algorithm
    const h = hits(graph, { maxIterations });
    const result = { hubs: byId(graph, h.hubs), authorities: byId(graph, h.authorities) };

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph (initial state - uniform coloring)
    // Arrows show direction; an edge drawn source > target was added both ways (toDirectedGraph)
    renderGraph(svg, generatedGraph, 20, { arrows: (edge) => (edge.source > edge.target ? "both" : "end") });

    // Create legends
    const legendContainer = document.createElement("div");
    legendContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 4px;
    `;

    // One legend for the score the displayMode control draws
    if (displayMode === "combined") {
        const combined = document.createElement("div");
        combined.style.cssText =
            "display: flex; gap: 16px; font-family: system-ui, sans-serif; font-size: 12px; color: #1e293b;";
        combined.innerHTML = `
            <span><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: rgb(139, 0, 246);"></span> Strong hub</span>
            <span><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: rgb(0, 145, 178);"></span> Strong authority</span>
            <span>Size: the average of both scores</span>`;
        legendContainer.appendChild(combined);
    } else {
        legendContainer.appendChild(
            createHeatMapLegend(displayMode === "hubs" ? "Hub Score" : "Authority Score", "Low", "High"),
        );
    }
    container.appendChild(legendContainer);

    // Which score is drawn comes from the displayMode control
    const currentMode = displayMode;

    // Create scores panel
    const scoresPanel = document.createElement("div");
    scoresPanel.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background: #f1f5f9;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
    `;
    scoresPanel.innerHTML = `
        <div style="display: flex; gap: 24px;">
            <div>
                <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">Hub Scores</div>
                <div data-hubs style="display: flex; gap: 4px; flex-wrap: wrap;"></div>
            </div>
            <div>
                <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">Authority Scores</div>
                <div data-authorities style="display: flex; gap: 4px; flex-wrap: wrap;"></div>
            </div>
        </div>
    `;
    container.appendChild(scoresPanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Click 'Calculate' to compute HITS scores");

    let isApplied = false;

    /**
     * Update scores display.
     */
    function updateScoresDisplay(): void {
        const hubsEl = scoresPanel.querySelector("[data-hubs]");
        const authoritiesEl = scoresPanel.querySelector("[data-authorities]");

        if (hubsEl) {
            hubsEl.innerHTML = "";
            const sortedHubs = Object.entries(result.hubs).sort((a, b) => b[1] - a[1]);
            for (const [nodeId, score] of sortedHubs) {
                const badge = document.createElement("span");
                badge.style.cssText = `
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 50px;
                    padding: 2px 6px;
                    background: #8b5cf6;
                    color: white;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 600;
                `;
                badge.textContent = `${nodeId}: ${score.toFixed(2)}`;
                hubsEl.appendChild(badge);
            }
        }

        if (authoritiesEl) {
            authoritiesEl.innerHTML = "";
            const sortedAuths = Object.entries(result.authorities).sort((a, b) => b[1] - a[1]);
            for (const [nodeId, score] of sortedAuths) {
                const badge = document.createElement("span");
                badge.style.cssText = `
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 50px;
                    padding: 2px 6px;
                    background: #0891b2;
                    color: white;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 600;
                `;
                badge.textContent = `${nodeId}: ${score.toFixed(2)}`;
                authoritiesEl.appendChild(badge);
            }
        }
    }

    /**
     * Apply visualization based on current mode.
     */
    function applyVisualization(): void {
        const nodes = svg.querySelectorAll("[data-node-id]");

        // Get min/max for normalization
        const hubValues = Object.values(result.hubs);
        const authValues = Object.values(result.authorities);
        const hubMin = Math.min(...hubValues);
        const hubMax = Math.max(...hubValues);
        const authMin = Math.min(...authValues);
        const authMax = Math.max(...authValues);
        const hubRange = hubMax - hubMin || 1;
        const authRange = authMax - authMin || 1;

        nodes.forEach((node) => {
            const nodeId = node.getAttribute("data-node-id");
            if (nodeId === null) {
                return;
            }

            const hubScore = result.hubs[nodeId] ?? 0;
            const authScore = result.authorities[nodeId] ?? 0;

            const normHub = (hubScore - hubMin) / hubRange;
            const normAuth = (authScore - authMin) / authRange;

            let color: string;
            let size: number;

            switch (currentMode) {
                case "hubs":
                    color = getHeatMapColor(normHub);
                    size = 15 + normHub * 15;
                    break;
                case "authorities":
                    color = getHeatMapColor(normAuth);
                    size = 15 + normAuth * 15;
                    break;
                case "combined":
                default: {
                    // Blend hub (purple) and authority (cyan) colors
                    const r = Math.round(139 * normHub); // Purple-ish for hubs
                    const g = Math.round(145 * normAuth); // Cyan-ish for authorities
                    const b = Math.round(246 * normHub + 178 * normAuth);
                    color = `rgb(${r}, ${g}, ${Math.min(255, b)})`;
                    size = 15 + ((normHub + normAuth) / 2) * 15;
                    break;
                }
            }

            (node as SVGCircleElement).setAttribute("fill", color);
            (node as SVGCircleElement).setAttribute("r", String(size));
        });
    }

    /**
     * Apply centrality visualization.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        applyVisualization();
        updateScoresDisplay();
        updateStatus(
            statusPanel,
            "HITS computed! The displayMode control chooses hubs, authorities, or both combined.",
        );
    }

    /**
     * Reset visualization.
     */
    function reset(): void {
        isApplied = false;

        // Reset node colors and sizes
        const nodes = svg.querySelectorAll("[data-node-id]");
        nodes.forEach((node) => {
            (node as SVGCircleElement).setAttribute("fill", "#6366f1");
            (node as SVGCircleElement).setAttribute("r", "20");
        });

        // Clear scores display
        const hubsEl = scoresPanel.querySelector("[data-hubs]");
        const authoritiesEl = scoresPanel.querySelector("[data-authorities]");
        if (hubsEl) {
            hubsEl.innerHTML = '<span style="color: #94a3b8; font-style: italic; font-size: 11px;">Not computed</span>';
        }
        if (authoritiesEl) {
            authoritiesEl.innerHTML =
                '<span style="color: #94a3b8; font-style: italic; font-size: 11px;">Not computed</span>';
        }

        updateStatus(statusPanel, "Click 'Calculate' to compute HITS scores");
    }

    // Initialize scores display
    const hubsEl = scoresPanel.querySelector("[data-hubs]");
    const authoritiesEl = scoresPanel.querySelector("[data-authorities]");
    if (hubsEl) {
        hubsEl.innerHTML = '<span style="color: #94a3b8; font-style: italic; font-size: 11px;">Not computed</span>';
    }
    if (authoritiesEl) {
        authoritiesEl.innerHTML =
            '<span style="color: #94a3b8; font-style: italic; font-size: 11px;">Not computed</span>';
    }

    // Add controls
    container.appendChild(createSimpleAnimationControls(apply, reset, "Calculate"));

    container.appendChild(createCallPanel(callCode(args)));

    return container;
}

/**
 * The consumer code this story runs, shown in the call panel and the Code panel.
 * @param args - The story's arguments
 * @returns The code
 */
function callCode(args: HITSArgs): string {
    return `import { hits } from "@graphty/algorithms";

// snapshot must be directed: new GraphBuilder({ directed: true })
const { hubs, authorities, converged } = hits(snapshot, { maxIterations: ${args.maxIterations} });
// hubs, authorities: Float64Array, one score per node index`;
}

const meta: Meta<HITSArgs> = {
    title: "Centrality",
    // The component id before the move, so every story id (and its baseline) stays the same
    id: "centrality",
    parameters: {
        docs: {
            description: {
                component:
                    "HITS gives every node of a directed graph two scores: a hub score for pointing at good authorities, and an authority score for being pointed at by good hubs. Arrows show each edge's direction; a line with two arrowheads is a pair of opposite edges. Choose which score to draw with the displayMode control and press Calculate. The graph is generated in the story from a seed; the graph type, size and seed are controls.",
            },
        },
    },
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 4, max: 15, step: 1 },
            description: "Number of nodes in the graph",
        },
        graphType: {
            control: { type: "select" },
            options: ["tree", "random", "grid", "cycle", "star", "path"] as GraphType[],
            description: "Type of graph to generate",
        },
        maxIterations: {
            control: { type: "range", min: 10, max: 200, step: 10 },
            description: "Maximum iterations for convergence",
        },
        displayMode: {
            control: { type: "select" },
            options: ["hubs", "authorities", "combined"],
            description: "Which scores to visualize",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        nodeCount: 8,
        graphType: "random",
        maxIterations: 100,
        displayMode: "combined",
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<HITSArgs>;

/**
 * HITS (Hyperlink-Induced Topic Search) story with dual heat map visualization.
 *
 * This story uses the actual `hits()` function from @graphty/algorithms.
 * Nodes are colored and sized based on their hub and/or authority scores.
 */
export const HITS: Story = {
    name: "HITS (hubs and authorities)",
    parameters: callSource(callCode(meta.args as HITSArgs)),
    render: (args) => createHITSStory(args),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Click calculate button to apply centrality
        const calcButton = canvas.getByRole("button", { name: /calculate/i });
        await userEvent.click(calcButton);

        // Wait for status to update
        await waitFor(async () => {
            const statusText = canvasElement.querySelector("[data-status]")?.textContent ?? "";
            await expect(statusText).toContain("computed");
        }, storyWaitOptions(5000));
    },
};
