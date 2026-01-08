/**
 * Dijkstra's Algorithm Stories
 *
 * Demonstrates Dijkstra's shortest path algorithm with step-by-step animation
 * showing path discovery from source to all reachable nodes.
 *
 * IMPORTANT: This story uses the actual dijkstra implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { dijkstra, Graph } from "@graphty/algorithms";
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
interface DijkstraArgs {
    nodeCount: number;
    graphType: GraphType;
    startNode: number;
    targetNode: number;
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
 * Animation step for Dijkstra visualization.
 */
interface DijkstraStep {
    type: "explore" | "update" | "finalize" | "path" | "complete";
    nodeId: number;
    distance?: number;
    previousNode?: number;
    description: string;
}

/**
 * Run Dijkstra and create animation steps.
 */
function runDijkstraAndCreateSteps(
    generatedGraph: GeneratedGraph,
    startNode: number,
    targetNode: number,
): DijkstraStep[] {
    const graph = toAlgorithmGraph(generatedGraph);
    const steps: DijkstraStep[] = [];

    // Run actual Dijkstra algorithm
    const result = dijkstra(graph, startNode);

    // Build adjacency for simulation
    const adjacency = new Map<number, Array<{ target: number; weight: number }>>();
    for (const node of generatedGraph.nodes) {
        adjacency.set(node.id, []);
    }
    for (const edge of generatedGraph.edges) {
        adjacency.get(edge.source)?.push({ target: edge.target, weight: edge.weight ?? 1 });
        adjacency.get(edge.target)?.push({ target: edge.source, weight: edge.weight ?? 1 });
    }

    // Simulate Dijkstra's algorithm for animation
    const distances = new Map<number, number>();
    const previous = new Map<number, number | null>();
    const visited = new Set<number>();
    const pq: Array<{ node: number; distance: number }> = [];

    // Initialize
    for (const node of generatedGraph.nodes) {
        distances.set(node.id, node.id === startNode ? 0 : Infinity);
        previous.set(node.id, null);
    }
    pq.push({ node: startNode, distance: 0 });

    steps.push({
        type: "explore",
        nodeId: startNode,
        distance: 0,
        description: `Start at node ${startNode} with distance 0`,
    });

    while (pq.length > 0) {
        // Get node with minimum distance
        pq.sort((a, b) => a.distance - b.distance);
        const current = pq.shift();
        if (!current || visited.has(current.node)) {
            continue;
        }

        const { node: currentNode, distance: currentDistance } = current;

        if (currentDistance === Infinity) {
            break;
        }

        visited.add(currentNode);

        steps.push({
            type: "finalize",
            nodeId: currentNode,
            distance: currentDistance,
            previousNode: previous.get(currentNode) ?? undefined,
            description: `Finalize node ${currentNode} with shortest distance ${currentDistance}`,
        });

        // Check neighbors
        const neighbors = adjacency.get(currentNode) ?? [];
        for (const { target: neighbor, weight } of neighbors) {
            if (visited.has(neighbor)) {
                continue;
            }

            const tentativeDistance = currentDistance + weight;
            const currentBest = distances.get(neighbor) ?? Infinity;

            steps.push({
                type: "explore",
                nodeId: neighbor,
                distance: tentativeDistance,
                previousNode: currentNode,
                description: `Explore edge ${currentNode} → ${neighbor} (distance: ${currentDistance} + ${weight} = ${tentativeDistance})`,
            });

            if (tentativeDistance < currentBest) {
                distances.set(neighbor, tentativeDistance);
                previous.set(neighbor, currentNode);
                pq.push({ node: neighbor, distance: tentativeDistance });

                steps.push({
                    type: "update",
                    nodeId: neighbor,
                    distance: tentativeDistance,
                    previousNode: currentNode,
                    description: `Update node ${neighbor}: new shortest distance = ${tentativeDistance}`,
                });
            }
        }
    }

    // Highlight the shortest path to target if it exists
    const targetResult = result.get(targetNode);
    if (targetResult && targetResult.path) {
        for (let i = 0; i < targetResult.path.length; i++) {
            const nodeId = targetResult.path[i] as number;
            steps.push({
                type: "path",
                nodeId,
                distance: i === targetResult.path.length - 1 ? targetResult.distance : undefined,
                description: `Shortest path includes node ${nodeId}`,
            });
        }
    }

    steps.push({
        type: "complete",
        nodeId: -1,
        description: `Dijkstra complete! Shortest path to node ${targetNode}: ${targetResult ? targetResult.distance : "unreachable"}`,
    });

    return steps;
}

/**
 * Create the Dijkstra visualization story.
 */
function createDijkstraStory(args: DijkstraArgs): HTMLElement {
    const { nodeCount, graphType, startNode, targetNode, animationSpeed, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);

    // Validate nodes
    const validStartNode = Math.min(Math.max(startNode, 0), nodeCount - 1);
    const validTargetNode = Math.min(Math.max(targetNode, 0), nodeCount - 1);

    // Create animation steps
    const steps = runDijkstraAndCreateSteps(generatedGraph, validStartNode, validTargetNode);

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

    // Create distance display panel
    const distancePanel = document.createElement("div");
    distancePanel.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background: #f1f5f9;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
    `;
    distancePanel.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">Distances from Node ${validStartNode}</div>
        <div data-distances style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
    `;
    container.appendChild(distancePanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);

    // Animation state
    let currentStep = 0;
    let isPlaying = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const nodeDistances = new Map<number, number>();
    const pathNodes = new Set<number>();

    /**
     * Update distance display.
     */
    function updateDistanceDisplay(): void {
        const distancesEl = distancePanel.querySelector("[data-distances]");
        if (!distancesEl) {return;}

        distancesEl.innerHTML = "";
        for (const node of generatedGraph.nodes) {
            const dist = nodeDistances.get(node.id);
            const isPath = pathNodes.has(node.id);
            const badge = document.createElement("span");
            let bgColor = "#94a3b8";
            if (isPath) {
                bgColor = "#22c55e";
            } else if (dist !== undefined) {
                bgColor = "#6366f1";
            }
            badge.style.cssText = `
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 40px;
                padding: 4px 8px;
                background: ${bgColor};
                color: white;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
            `;
            badge.textContent = `${node.id}: ${dist !== undefined ? dist : "∞"}`;
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
            case "explore":
                highlightNode(svg, step.nodeId, "queued");
                if (step.previousNode !== undefined) {
                    highlightEdge(svg, step.previousNode, step.nodeId, "current");
                }
                break;

            case "update":
                if (step.distance !== undefined) {
                    nodeDistances.set(step.nodeId, step.distance);
                }
                highlightNode(svg, step.nodeId, "queued");
                updateDistanceDisplay();
                break;

            case "finalize":
                if (step.distance !== undefined) {
                    nodeDistances.set(step.nodeId, step.distance);
                }
                highlightNode(svg, step.nodeId, "visited");
                if (step.previousNode !== undefined) {
                    highlightEdge(svg, step.previousNode, step.nodeId, "traversed");
                }
                updateDistanceDisplay();
                break;

            case "path":
                pathNodes.add(step.nodeId);
                highlightNode(svg, step.nodeId, "current");
                updateDistanceDisplay();
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
        nodeDistances.clear();
        pathNodes.clear();
        resetHighlights(svg);
        updateDistanceDisplay();
        updateStatus(statusPanel, "Ready to find shortest paths");
    }

    // Initialize distance display
    updateDistanceDisplay();

    // Add controls
    const controls = createAnimationControls(play, pause, executeStep, reset);
    container.appendChild(controls);

    return container;
}

const meta: Meta<DijkstraArgs> = {
    title: "ShortestPath",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 4, max: 12, step: 1 },
            description: "Number of nodes in the graph",
        },
        graphType: {
            control: { type: "select" },
            options: ["tree", "random", "grid", "cycle", "complete", "path"] as GraphType[],
            description: "Type of graph to generate",
        },
        startNode: {
            control: { type: "number", min: 0 },
            description: "Starting node for shortest path",
        },
        targetNode: {
            control: { type: "number", min: 0 },
            description: "Target node for shortest path",
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
        nodeCount: 6,
        graphType: "random",
        startNode: 0,
        targetNode: 5,
        animationSpeed: 500,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<DijkstraArgs>;

/**
 * Dijkstra's shortest path algorithm story with interactive controls.
 *
 * This story uses the actual `dijkstra()` function from @graphty/algorithms.
 * Watch as the algorithm discovers shortest paths from the source to all nodes.
 */
export const Dijkstra: Story = {
    render: (args) => createDijkstraStory(args),
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
            { timeout: (args.nodeCount * 5 + 10) * args.animationSpeed },
        );
    },
};
