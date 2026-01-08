/**
 * Bellman-Ford Algorithm Stories
 *
 * Demonstrates Bellman-Ford's shortest path algorithm with step-by-step animation
 * showing edge relaxation across iterations.
 *
 * IMPORTANT: This story uses the actual bellmanFord implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { bellmanFord, Graph } from "@graphty/algorithms";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import {
    type GeneratedGraph,
    generateGraph,
    type GraphType,
} from "../utils/graph-generators.js";
import {
    COLORS,
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
interface BellmanFordArgs {
    nodeCount: number;
    graphType: GraphType;
    startNode: number;
    animationSpeed: number;
    seed: number;
}

/**
 * Convert GeneratedGraph to @graphty/algorithms Graph with weights.
 */
function toAlgorithmGraph(generatedGraph: GeneratedGraph): Graph {
    // Use directed graph for Bellman-Ford
    const graph = new Graph({ directed: true });

    for (const node of generatedGraph.nodes) {
        graph.addNode(node.id);
    }

    // Add edges in both directions for undirected behavior
    for (const edge of generatedGraph.edges) {
        graph.addEdge(edge.source, edge.target, edge.weight ?? 1);
        graph.addEdge(edge.target, edge.source, edge.weight ?? 1);
    }

    return graph;
}

/**
 * Animation step for Bellman-Ford visualization.
 */
interface BellmanFordStep {
    type: "iteration" | "relax" | "update" | "complete" | "path";
    nodeId: number;
    sourceNode?: number;
    distance?: number;
    iteration?: number;
    description: string;
}

/**
 * Run Bellman-Ford and create animation steps.
 */
function runBellmanFordAndCreateSteps(
    generatedGraph: GeneratedGraph,
    startNode: number,
): BellmanFordStep[] {
    const graph = toAlgorithmGraph(generatedGraph);
    const steps: BellmanFordStep[] = [];

    // Run actual algorithm
    const result = bellmanFord(graph, startNode);

    // Simulate the algorithm for animation
    const distances = new Map<number, number>();
    const predecessors = new Map<number, number | null>();
    const nodeIds = generatedGraph.nodes.map((n) => n.id);

    // Get all directed edges (both directions)
    const edges: Array<{ source: number; target: number; weight: number }> = [];
    for (const edge of generatedGraph.edges) {
        edges.push({ source: edge.source, target: edge.target, weight: edge.weight ?? 1 });
        edges.push({ source: edge.target, target: edge.source, weight: edge.weight ?? 1 });
    }

    // Initialize
    for (const nodeId of nodeIds) {
        distances.set(nodeId, nodeId === startNode ? 0 : Infinity);
        predecessors.set(nodeId, null);
    }

    steps.push({
        type: "iteration",
        nodeId: startNode,
        distance: 0,
        iteration: 0,
        description: `Initialize: source node ${startNode} has distance 0, all others have ∞`,
    });

    // Relax edges |V| - 1 times
    for (let i = 0; i < nodeIds.length - 1; i++) {
        let updated = false;

        steps.push({
            type: "iteration",
            nodeId: -1,
            iteration: i + 1,
            description: `Iteration ${i + 1}: relaxing all edges`,
        });

        for (const edge of edges) {
            const distU = distances.get(edge.source) ?? Infinity;
            const distV = distances.get(edge.target) ?? Infinity;

            if (distU !== Infinity) {
                const newDist = distU + edge.weight;

                steps.push({
                    type: "relax",
                    nodeId: edge.target,
                    sourceNode: edge.source,
                    distance: newDist,
                    description: `Relax edge ${edge.source} → ${edge.target}: ${distU} + ${edge.weight} = ${newDist}`,
                });

                if (newDist < distV) {
                    distances.set(edge.target, newDist);
                    predecessors.set(edge.target, edge.source);
                    updated = true;

                    steps.push({
                        type: "update",
                        nodeId: edge.target,
                        sourceNode: edge.source,
                        distance: newDist,
                        description: `Update node ${edge.target}: new shortest distance = ${newDist} (via ${edge.source})`,
                    });
                }
            }
        }

        // Early termination if no updates
        if (!updated) {
            steps.push({
                type: "iteration",
                nodeId: -1,
                iteration: i + 1,
                description: `No updates in iteration ${i + 1}, algorithm converged early`,
            });
            break;
        }
    }

    // Show final shortest path tree
    for (const nodeId of nodeIds) {
        if (nodeId !== startNode) {
            const pred = result.predecessors.get(nodeId);
            if (pred !== null && pred !== undefined) {
                steps.push({
                    type: "path",
                    nodeId: nodeId,
                    sourceNode: pred as number,
                    distance: result.distances.get(nodeId),
                    description: `Shortest path to ${nodeId}: distance = ${result.distances.get(nodeId) ?? "∞"}`,
                });
            }
        }
    }

    steps.push({
        type: "complete",
        nodeId: -1,
        description: `Bellman-Ford complete! ${result.hasNegativeCycle ? "Warning: Negative cycle detected!" : "No negative cycles."}`,
    });

    return steps;
}

/**
 * Create the Bellman-Ford visualization story.
 */
function createBellmanFordStory(args: BellmanFordArgs): HTMLElement {
    const { nodeCount, graphType, startNode, animationSpeed, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);

    // Validate start node
    const validStartNode = Math.min(Math.max(startNode, 0), nodeCount - 1);

    // Create animation steps
    const steps = runBellmanFordAndCreateSteps(generatedGraph, validStartNode);

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph with edge weights
    renderGraph(svg, generatedGraph);

    // Add edge weight labels
    const edgeGroup = svg.querySelector(".edges");
    if (edgeGroup) {
        for (const edge of generatedGraph.edges) {
            const sourceNode = generatedGraph.nodes.find((n) => n.id === edge.source);
            const targetNode = generatedGraph.nodes.find((n) => n.id === edge.target);
            if (sourceNode && targetNode && edge.weight !== undefined) {
                const midX = (sourceNode.x + targetNode.x) / 2;
                const midY = (sourceNode.y + targetNode.y) / 2;

                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", String(midX));
                text.setAttribute("y", String(midY - 5));
                text.setAttribute("text-anchor", "middle");
                text.setAttribute("fill", COLORS.text.edge);
                text.setAttribute("font-size", "10");
                text.setAttribute("font-family", "system-ui, sans-serif");
                text.textContent = String(edge.weight);
                edgeGroup.appendChild(text);
            }
        }
    }

    // Create iteration and distance panel
    const infoPanel = document.createElement("div");
    infoPanel.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background: #f1f5f9;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
    `;
    infoPanel.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">
            <span data-iteration>Iteration: 0</span>
        </div>
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">Distances from Node ${validStartNode}</div>
        <div data-distances style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
    `;
    container.appendChild(infoPanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);

    // Animation state
    let currentStep = 0;
    let isPlaying = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const nodeDistances = new Map<number, number>();
    let currentIteration = 0;

    /**
     * Update distance display.
     */
    function updateDistanceDisplay(): void {
        const distancesEl = infoPanel.querySelector("[data-distances]");
        const iterationEl = infoPanel.querySelector("[data-iteration]");

        if (iterationEl) {
            iterationEl.textContent = `Iteration: ${currentIteration}`;
        }

        if (!distancesEl) {return;}

        distancesEl.innerHTML = "";
        for (const node of generatedGraph.nodes) {
            const dist = nodeDistances.get(node.id);
            const badge = document.createElement("span");
            badge.style.cssText = `
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 40px;
                padding: 4px 8px;
                background: ${dist !== undefined && dist !== Infinity ? "#6366f1" : "#94a3b8"};
                color: white;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
            `;
            badge.textContent = `${node.id}: ${dist !== undefined && dist !== Infinity ? dist : "∞"}`;
            distancesEl.appendChild(badge);
        }
    }

    /**
     * Execute a single step.
     */
    function executeStep(): boolean {
        if (currentStep >= steps.length) {
            return false;
        }

        const step = steps[currentStep];

        switch (step.type) {
            case "iteration":
                if (step.iteration !== undefined) {
                    currentIteration = step.iteration;
                }
                if (step.nodeId === validStartNode && step.iteration === 0) {
                    nodeDistances.set(step.nodeId, 0);
                    highlightNode(svg, step.nodeId, "current");
                }
                updateDistanceDisplay();
                break;

            case "relax":
                if (step.sourceNode !== undefined) {
                    highlightEdge(svg, step.sourceNode, step.nodeId, "current");
                }
                highlightNode(svg, step.nodeId, "queued");
                break;

            case "update":
                if (step.distance !== undefined) {
                    nodeDistances.set(step.nodeId, step.distance);
                }
                highlightNode(svg, step.nodeId, "visited");
                if (step.sourceNode !== undefined) {
                    highlightEdge(svg, step.sourceNode, step.nodeId, "traversed");
                }
                updateDistanceDisplay();
                break;

            case "path":
                highlightNode(svg, step.nodeId, "visited");
                if (step.sourceNode !== undefined) {
                    highlightEdge(svg, step.sourceNode, step.nodeId, "traversed");
                }
                break;

            case "complete":
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
        currentIteration = 0;
        nodeDistances.clear();
        resetHighlights(svg);
        updateDistanceDisplay();
        updateStatus(statusPanel, "Ready to find shortest paths");
    }

    // Initialize
    updateDistanceDisplay();

    // Add controls
    const controls = createAnimationControls(play, pause, executeStep, reset);
    container.appendChild(controls);

    return container;
}

const meta: Meta<BellmanFordArgs> = {
    title: "ShortestPath",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 4, max: 10, step: 1 },
            description: "Number of nodes in the graph",
        },
        graphType: {
            control: { type: "select" },
            options: ["tree", "random", "grid", "cycle", "path"] as GraphType[],
            description: "Type of graph to generate",
        },
        startNode: {
            control: { type: "number", min: 0 },
            description: "Starting node for shortest path",
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
        nodeCount: 5,
        graphType: "random",
        startNode: 0,
        animationSpeed: 400,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<BellmanFordArgs>;

/**
 * Bellman-Ford shortest path algorithm story with interactive controls.
 *
 * This story uses the actual `bellmanFord()` function from @graphty/algorithms.
 * Watch as the algorithm relaxes edges in each iteration to find shortest paths.
 */
export const BellmanFord: Story = {
    render: (args) => createBellmanFordStory(args),
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
            { timeout: (args.nodeCount * args.nodeCount * 4 + 20) * args.animationSpeed },
        );
    },
};
