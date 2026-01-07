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

import { Graph, hits } from "@graphty/algorithms";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import {
    type GeneratedGraph,
    generateGraph,
    type GraphType,
} from "../utils/graph-generators.js";
import {
    createHeatMapLegend,
    createStatusPanel,
    createStoryContainer,
    getHeatMapColor,
    renderGraph,
    updateStatus,
} from "../utils/visualization.js";

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
 * Convert GeneratedGraph to @graphty/algorithms directed Graph.
 */
function toDirectedGraph(generatedGraph: GeneratedGraph): Graph {
    const graph = new Graph({ directed: true });

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

    return graph;
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
    const result = hits(graph, { maxIterations });

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph (initial state - uniform coloring)
    renderGraph(svg, generatedGraph);

    // Create legends
    const legendContainer = document.createElement("div");
    legendContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 4px;
    `;

    const hubLegend = createHeatMapLegend("Hub Score", "Low", "High");
    const authLegend = createHeatMapLegend("Authority Score", "Low", "High");
    legendContainer.appendChild(hubLegend);
    legendContainer.appendChild(authLegend);
    container.appendChild(legendContainer);

    // Create mode selector
    const modePanel = document.createElement("div");
    modePanel.style.cssText = `
        margin-top: 8px;
        display: flex;
        gap: 8px;
        justify-content: center;
    `;

    const modeButtons = ["hubs", "authorities", "combined"] as const;
    let currentMode = displayMode;

    for (const mode of modeButtons) {
        const btn = document.createElement("button");
        btn.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
        btn.dataset.mode = mode;
        btn.style.cssText = `
            padding: 4px 12px;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            background: ${mode === displayMode ? "#6366f1" : "white"};
            color: ${mode === displayMode ? "white" : "#1e293b"};
            cursor: pointer;
            font-family: system-ui, sans-serif;
            font-size: 12px;
        `;
        btn.onclick = () => {
            currentMode = mode;
            // Update button styles
            modePanel.querySelectorAll("button").forEach((b) => {
                const isActive = (b).dataset.mode === mode;
                (b).style.background = isActive ? "#6366f1" : "white";
                (b).style.color = isActive ? "white" : "#1e293b";
            });
            // Re-apply visualization if already applied
            if (isApplied) {
                applyVisualization();
            }
        };
        modePanel.appendChild(btn);
    }
    container.appendChild(modePanel);

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
            if (nodeId === null) {return;}

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
        if (isApplied) {return;}
        isApplied = true;

        applyVisualization();
        updateScoresDisplay();
        updateStatus(statusPanel, "HITS computed! Use mode buttons to view hubs, authorities, or combined.");
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
            authoritiesEl.innerHTML = '<span style="color: #94a3b8; font-style: italic; font-size: 11px;">Not computed</span>';
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
        authoritiesEl.innerHTML = '<span style="color: #94a3b8; font-style: italic; font-size: 11px;">Not computed</span>';
    }

    // Add controls
    const controls = document.createElement("div");
    controls.style.cssText = `
        display: flex;
        gap: 8px;
        margin-top: 16px;
        justify-content: center;
    `;

    const buttonStyle = `
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        font-weight: 500;
    `;

    const calcBtn = document.createElement("button");
    calcBtn.textContent = "Calculate";
    calcBtn.style.cssText = `${buttonStyle}background: #22c55e; color: white;`;
    calcBtn.onclick = apply;

    const resetBtn = document.createElement("button");
    resetBtn.textContent = "Reset";
    resetBtn.style.cssText = `${buttonStyle}background: #ef4444; color: white;`;
    resetBtn.onclick = reset;

    controls.appendChild(calcBtn);
    controls.appendChild(resetBtn);
    container.appendChild(controls);

    return container;
}

const meta: Meta<HITSArgs> = {
    title: "Centrality",
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
    render: (args) => createHITSStory(args),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Click calculate button to apply centrality
        const calcButton = canvas.getByRole("button", { name: /calculate/i });
        await userEvent.click(calcButton);

        // Wait for status to update
        await waitFor(
            async () => {
                const statusText = canvasElement.querySelector("[data-status]")?.textContent ?? "";
                await expect(statusText).toContain("computed");
            },
            { timeout: 5000 },
        );
    },
};
