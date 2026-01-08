/**
 * Floyd-Warshall Algorithm Stories
 *
 * Demonstrates Floyd-Warshall's all-pairs shortest path algorithm with
 * step-by-step animation showing distance matrix updates.
 *
 * IMPORTANT: This story uses the actual floydWarshall implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { floydWarshall, Graph } from "@graphty/algorithms";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import {
    type GeneratedGraph,
    generateGraph,
    type GraphType,
} from "../utils/graph-generators.js";
import {
    createAnimationControls,
    createStatusPanel,
    createStoryContainer,
    highlightEdge,
    highlightNode,
    renderGraph,
    resetHighlights,
    updateStatus,
} from "../utils/visualization.js";

/**
 * Story arguments interface.
 */
interface FloydWarshallArgs {
    nodeCount: number;
    graphType: GraphType;
    animationSpeed: number;
    seed: number;
}

/**
 * Convert GeneratedGraph to @graphty/algorithms Graph with weights.
 */
function toAlgorithmGraph(generatedGraph: GeneratedGraph): Graph {
    const graph = new Graph({ directed: false });

    for (const node of generatedGraph.nodes) {
        graph.addNode(node.id);
    }

    for (const edge of generatedGraph.edges) {
        graph.addEdge(edge.source, edge.target, edge.weight ?? 1);
    }

    return graph;
}

/**
 * Animation step for Floyd-Warshall visualization.
 */
interface FloydWarshallStep {
    type: "init" | "intermediate" | "check" | "update" | "complete";
    i?: number;
    j?: number;
    k?: number;
    oldDistance?: number;
    newDistance?: number;
    description: string;
}

/**
 * Run Floyd-Warshall and create animation steps.
 */
function runFloydWarshallAndCreateSteps(generatedGraph: GeneratedGraph): {
    steps: FloydWarshallStep[];
    finalDistances: Map<unknown, Map<unknown, number>>;
} {
    const graph = toAlgorithmGraph(generatedGraph);
    const steps: FloydWarshallStep[] = [];

    // Run actual algorithm - use result for final distances
    const algorithmResult = floydWarshall(graph);

    const nodeIds = generatedGraph.nodes.map((n) => n.id);
    const n = nodeIds.length;

    // Initialize distance matrix
    const dist: number[][] = Array(n)
        .fill(null)
        .map(() => Array(n).fill(Infinity));

    for (let i = 0; i < n; i++) {
        dist[i][i] = 0;
    }

    for (const edge of generatedGraph.edges) {
        const i = nodeIds.indexOf(edge.source);
        const j = nodeIds.indexOf(edge.target);
        const weight = edge.weight ?? 1;
        dist[i][j] = weight;
        dist[j][i] = weight; // Undirected
    }

    steps.push({
        type: "init",
        description: "Initialize distance matrix: 0 for self, edge weights for neighbors, ∞ otherwise",
    });

    // Floyd-Warshall algorithm simulation
    for (let k = 0; k < n; k++) {
        steps.push({
            type: "intermediate",
            k,
            description: `Using node ${nodeIds[k]} as intermediate vertex`,
        });

        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i === j || i === k || j === k) {continue;}

                const throughK = dist[i][k] + dist[k][j];
                const direct = dist[i][j];

                // Only show check step if there's a potential path through k
                if (dist[i][k] !== Infinity && dist[k][j] !== Infinity) {
                    steps.push({
                        type: "check",
                        i: nodeIds[i],
                        j: nodeIds[j],
                        k: nodeIds[k],
                        oldDistance: direct,
                        newDistance: throughK,
                        description: `Check: dist[${nodeIds[i]}][${nodeIds[j]}] = ${direct === Infinity ? "∞" : direct} vs ${nodeIds[i]}→${nodeIds[k]}→${nodeIds[j]} = ${throughK}`,
                    });

                    if (throughK < direct) {
                        dist[i][j] = throughK;
                        steps.push({
                            type: "update",
                            i: nodeIds[i],
                            j: nodeIds[j],
                            k: nodeIds[k],
                            oldDistance: direct,
                            newDistance: throughK,
                            description: `Update: dist[${nodeIds[i]}][${nodeIds[j]}] = ${throughK} (via ${nodeIds[k]})`,
                        });
                    }
                }
            }
        }
    }

    steps.push({
        type: "complete",
        description: "Floyd-Warshall complete! All shortest paths computed.",
    });

    return { steps, finalDistances: algorithmResult.distances };
}

/**
 * Create the Floyd-Warshall visualization story.
 */
function createFloydWarshallStory(args: FloydWarshallArgs): HTMLElement {
    const { nodeCount, graphType, animationSpeed, seed } = args;

    // Generate graph (use smaller nodeCount to avoid long animations)
    const generatedGraph = generateGraph(graphType, Math.min(nodeCount, 6), seed);

    // Create animation steps and get final distances from actual algorithm
    const { steps, finalDistances } = runFloydWarshallAndCreateSteps(generatedGraph);

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph
    renderGraph(svg, generatedGraph);

    // Create distance matrix display
    const matrixPanel = document.createElement("div");
    matrixPanel.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background: #f1f5f9;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
        overflow-x: auto;
    `;

    const nodeIds = generatedGraph.nodes.map((n) => n.id);
    const n = nodeIds.length;

    // Initialize display matrix
    const displayMatrix: number[][] = Array(n)
        .fill(null)
        .map(() => Array(n).fill(Infinity));
    for (let i = 0; i < n; i++) {
        displayMatrix[i][i] = 0;
    }
    for (const edge of generatedGraph.edges) {
        const i = nodeIds.indexOf(edge.source);
        const j = nodeIds.indexOf(edge.target);
        const weight = edge.weight ?? 1;
        displayMatrix[i][j] = weight;
        displayMatrix[j][i] = weight;
    }

    function renderMatrix(highlightI?: number, highlightJ?: number, highlightK?: number): void {
        let html = `
            <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">
                Distance Matrix ${highlightK !== undefined ? `(intermediate: ${highlightK})` : ""}
            </div>
            <table style="border-collapse: collapse; font-size: 12px;">
                <tr>
                    <th style="padding: 4px 8px; border: 1px solid #cbd5e1;"></th>
        `;

        for (const id of nodeIds) {
            const isK = id === highlightK;
            html += `<th style="padding: 4px 8px; border: 1px solid #cbd5e1; background: ${isK ? "#fef3c7" : "#e2e8f0"};">${id}</th>`;
        }
        html += "</tr>";

        for (let i = 0; i < n; i++) {
            const isKRow = nodeIds[i] === highlightK;
            html += `<tr>
                <th style="padding: 4px 8px; border: 1px solid #cbd5e1; background: ${isKRow ? "#fef3c7" : "#e2e8f0"};">${nodeIds[i]}</th>
            `;

            for (let j = 0; j < n; j++) {
                const isHighlight = nodeIds[i] === highlightI && nodeIds[j] === highlightJ;
                const isKCol = nodeIds[j] === highlightK;
                const dist = displayMatrix[i][j];
                let bgColor = "white";
                if (isHighlight) {
                    bgColor = "#86efac";
                } else if (isKRow || isKCol) {
                    bgColor = "#fef3c7";
                }

                html += `<td style="padding: 4px 8px; border: 1px solid #cbd5e1; text-align: center; background: ${bgColor};">
                    ${dist === Infinity ? "∞" : dist}
                </td>`;
            }
            html += "</tr>";
        }
        html += "</table>";

        matrixPanel.innerHTML = html;
    }

    renderMatrix();
    container.appendChild(matrixPanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);

    // Animation state
    let currentStep = 0;
    let isPlaying = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    /**
     * Execute a single step.
     */
    function executeStep(): boolean {
        if (currentStep >= steps.length) {
            return false;
        }

        const step = steps[currentStep];

        // Reset all highlights first
        resetHighlights(svg);

        switch (step.type) {
            case "init":
                renderMatrix();
                break;

            case "intermediate":
                if (step.k !== undefined) {
                    highlightNode(svg, step.k, "current");
                    renderMatrix(undefined, undefined, step.k);
                }
                break;

            case "check":
                if (step.i !== undefined && step.j !== undefined && step.k !== undefined) {
                    highlightNode(svg, step.i, "queued");
                    highlightNode(svg, step.j, "queued");
                    highlightNode(svg, step.k, "current");
                    renderMatrix(step.i, step.j, step.k);
                }
                break;

            case "update":
                if (step.i !== undefined && step.j !== undefined && step.k !== undefined) {
                    // Update display matrix
                    const ii = nodeIds.indexOf(step.i);
                    const jj = nodeIds.indexOf(step.j);
                    if (step.newDistance !== undefined) {
                        displayMatrix[ii][jj] = step.newDistance;
                    }

                    highlightNode(svg, step.i, "visited");
                    highlightNode(svg, step.j, "visited");
                    highlightNode(svg, step.k, "current");
                    highlightEdge(svg, step.i, step.k, "traversed");
                    highlightEdge(svg, step.k, step.j, "traversed");
                    renderMatrix(step.i, step.j, step.k);
                }
                break;

            case "complete":
                // Use actual algorithm results for final display
                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < n; j++) {
                        const dist = finalDistances.get(nodeIds[i])?.get(nodeIds[j]);
                        displayMatrix[i][j] = dist ?? Infinity;
                    }
                }
                renderMatrix();
                // Highlight all nodes as visited
                for (const node of generatedGraph.nodes) {
                    highlightNode(svg, node.id, "visited");
                }
                break;

            default:
                // Handle any unexpected step types
                break;
        }

        updateStatus(statusPanel, step.description);
        currentStep++;
        return currentStep < steps.length;
    }

    /**
     * Play animation continuously.
     */
    function play(): void {
        if (isPlaying) {return;}
        isPlaying = true;

        function tick(): void {
            if (!isPlaying) {return;}

            const hasMore = executeStep();
            if (hasMore) {
                timeoutId = setTimeout(tick, animationSpeed);
            } else {
                isPlaying = false;
            }
        }

        tick();
    }

    /**
     * Pause animation.
     */
    function pause(): void {
        isPlaying = false;
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    }

    /**
     * Reset animation.
     */
    function reset(): void {
        pause();
        currentStep = 0;

        // Reset display matrix
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                displayMatrix[i][j] = Infinity;
            }
            displayMatrix[i][i] = 0;
        }
        for (const edge of generatedGraph.edges) {
            const i = nodeIds.indexOf(edge.source);
            const j = nodeIds.indexOf(edge.target);
            const weight = edge.weight ?? 1;
            displayMatrix[i][j] = weight;
            displayMatrix[j][i] = weight;
        }

        resetHighlights(svg);
        renderMatrix();
        updateStatus(statusPanel, "Ready to compute all-pairs shortest paths");
    }

    // Add controls
    const controls = createAnimationControls(play, pause, executeStep, reset);
    container.appendChild(controls);

    return container;
}

const meta: Meta<FloydWarshallArgs> = {
    title: "ShortestPath",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 3, max: 6, step: 1 },
            description: "Number of nodes in the graph (limited to 6 for readability)",
        },
        graphType: {
            control: { type: "select" },
            options: ["tree", "random", "cycle", "path"] as GraphType[],
            description: "Type of graph to generate",
        },
        animationSpeed: {
            control: { type: "range", min: 100, max: 2000, step: 100 },
            description: "Animation speed in milliseconds",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        nodeCount: 4,
        graphType: "random",
        animationSpeed: 600,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<FloydWarshallArgs>;

/**
 * Floyd-Warshall all-pairs shortest path algorithm story with interactive controls.
 *
 * This story uses the actual `floydWarshall()` function from @graphty/algorithms.
 * Watch as the algorithm updates the distance matrix using intermediate vertices.
 */
export const FloydWarshall: Story = {
    render: (args) => createFloydWarshallStory(args),
    parameters: {
        // Disable Chromatic snapshot for this story - the play function has long animations
        // that exceed Chromatic's 30-second timeout (15s render + 15s interaction)
        chromatic: { disableSnapshot: true },
    },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);

        // Click play button to start animation
        const playButton = canvas.getByRole("button", { name: /play/i });
        await userEvent.click(playButton);

        // Wait for animation to complete
        await waitFor(
            async () => {
                const statusText = canvasElement.querySelector("[data-status]")?.textContent ?? "";
                await expect(statusText).toContain("complete");
            },
            { timeout: (args.nodeCount ** 3 * 2 + 20) * args.animationSpeed },
        );
    },
};
