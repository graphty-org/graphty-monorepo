/**
 * BFS (Breadth-First Search) Algorithm Stories
 *
 * Demonstrates the BFS traversal algorithm with step-by-step animation
 * and queue visualization.
 *
 * IMPORTANT: This story uses the actual breadthFirstSearch implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { breadthFirstSearch, Graph } from "@graphty/algorithms";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import {
    type GeneratedGraph,
    generateGraph,
    type GraphType,
} from "../utils/graph-generators.js";
import {
    createAnimationControls,
    createDataStructurePanel,
    createStatusPanel,
    createStoryContainer,
    highlightEdge,
    highlightNode,
    renderGraph,
    resetHighlights,
    type TraversalStep,
    updateDataStructure,
    updateStatus,
} from "../utils/visualization.js";

/**
 * Story arguments interface.
 */
interface BFSArgs {
    nodeCount: number;
    graphType: GraphType;
    startNode: number;
    animationSpeed: number;
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
 * Captured step during BFS traversal.
 */
interface CapturedStep {
    node: number;
    level: number;
    parent: number | null;
}

/**
 * Run BFS using the actual algorithm and capture steps via visitCallback.
 */
function runBFSAndCaptureSteps(
    generatedGraph: GeneratedGraph,
    startNode: number,
): { steps: CapturedStep[]; tree: Map<number | string, number | string | null> } {
    const graph = toAlgorithmGraph(generatedGraph);
    const capturedSteps: CapturedStep[] = [];

    // Run the actual BFS algorithm with visitCallback to capture each step
    const result = breadthFirstSearch(graph, startNode, {
        visitCallback: (node, level) => {
            capturedSteps.push({
                node: node as number,
                level,
                parent: null, // Will be filled from tree
            });
        },
    });

    // Fill in parent information from the tree
    for (const step of capturedSteps) {
        const parent = result.tree?.get(step.node);
        step.parent = parent === null || parent === undefined ? null : (parent as number);
    }

    return {
        steps: capturedSteps,
        tree: result.tree ?? new Map(),
    };
}

/**
 * Convert captured BFS steps to animation steps.
 * Simulates queue state based on BFS level-order traversal.
 */
function convertToAnimationSteps(
    capturedSteps: CapturedStep[],
    generatedGraph: GeneratedGraph,
): TraversalStep[] {
    const animationSteps: TraversalStep[] = [];

    // Build adjacency list for neighbor lookup
    const adjacency = new Map<number, number[]>();
    for (const node of generatedGraph.nodes) {
        adjacency.set(node.id, []);
    }
    for (const edge of generatedGraph.edges) {
        adjacency.get(edge.source)?.push(edge.target);
        adjacency.get(edge.target)?.push(edge.source);
    }

    // Track which nodes have been queued
    const queued = new Set<number>();

    for (let i = 0; i < capturedSteps.length; i++) {
        const step = capturedSteps[i];

        // First node: add to queue
        if (i === 0) {
            animationSteps.push({
                type: "queue",
                nodeId: step.node,
                description: `Add node ${step.node} to queue (starting node)`,
            });
            queued.add(step.node);
        }

        // Dequeue this node
        animationSteps.push({
            type: "dequeue",
            nodeId: step.node,
            parentId: step.parent ?? undefined,
            description: `Dequeue node ${step.node}`,
        });

        // Visit this node
        animationSteps.push({
            type: "visit",
            nodeId: step.node,
            parentId: step.parent ?? undefined,
            description: `Visit node ${step.node}${step.parent !== null ? ` (from ${step.parent})` : ""}`,
        });

        // Queue neighbors that will be visited next (at level + 1)
        // We look ahead in capturedSteps to find which neighbors get visited
        const futureVisits = new Set(
            capturedSteps
                .slice(i + 1)
                .filter((s) => s.parent === step.node)
                .map((s) => s.node),
        );

        const neighbors = adjacency.get(step.node) ?? [];
        for (const neighbor of neighbors.sort((a, b) => a - b)) {
            if (futureVisits.has(neighbor) && !queued.has(neighbor)) {
                queued.add(neighbor);
                animationSteps.push({
                    type: "queue",
                    nodeId: neighbor,
                    parentId: step.node,
                    description: `Add node ${neighbor} to queue`,
                });
            }
        }
    }

    // Complete step
    animationSteps.push({
        type: "complete",
        nodeId: -1,
        description: "BFS traversal complete!",
    });

    return animationSteps;
}

/**
 * Create the BFS visualization story.
 */
function createBFSStory(args: BFSArgs): HTMLElement {
    const { nodeCount, graphType, startNode, animationSpeed, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);

    // Validate start node
    const validStartNode = Math.min(startNode, nodeCount - 1);

    // Run actual BFS algorithm and capture steps
    const { steps: capturedSteps } = runBFSAndCaptureSteps(generatedGraph, validStartNode);

    // Convert to animation steps
    const steps = convertToAnimationSteps(capturedSteps, generatedGraph);

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph
    renderGraph(svg, generatedGraph);

    // Create queue panel
    const queuePanel = createDataStructurePanel("queue", "Queue");
    container.appendChild(queuePanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);

    // Animation state
    let currentStep = 0;
    let isPlaying = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const queueState: number[] = [];
    const visitedNodes = new Set<number>();

    /**
     * Execute a single step.
     */
    function executeStep(): boolean {
        if (currentStep >= steps.length) {
            return false;
        }

        const step = steps[currentStep];

        switch (step.type) {
            case "queue":
                queueState.push(step.nodeId);
                highlightNode(svg, step.nodeId, "queued");
                break;

            case "dequeue":
                queueState.shift();
                highlightNode(svg, step.nodeId, "current");
                break;

            case "visit":
                visitedNodes.add(step.nodeId);
                highlightNode(svg, step.nodeId, "visited");
                if (step.parentId !== undefined) {
                    highlightEdge(svg, step.parentId, step.nodeId, "traversed");
                }
                break;

            case "complete":
                // All done
                break;

            default:
                // Handle any unexpected step types
                break;
        }

        updateDataStructure(queuePanel, queueState);
        updateStatus(statusPanel, step.description);

        currentStep++;
        return currentStep < steps.length;
    }

    /**
     * Play animation continuously.
     */
    function play(): void {
        if (isPlaying) {
            return;
        }
        isPlaying = true;

        function tick(): void {
            if (!isPlaying) {
                return;
            }

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
        queueState.length = 0;
        visitedNodes.clear();
        resetHighlights(svg);
        updateDataStructure(queuePanel, []);
        updateStatus(statusPanel, "Ready to start traversal");
    }

    // Add controls
    const controls = createAnimationControls(play, pause, executeStep, reset);
    container.appendChild(controls);

    return container;
}

const meta: Meta<BFSArgs> = {
    title: "Traversal",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 4, max: 15, step: 1 },
            description: "Number of nodes in the graph",
        },
        graphType: {
            control: { type: "select" },
            options: ["tree", "random", "grid", "cycle", "complete", "star", "path"] as GraphType[],
            description: "Type of graph to generate",
        },
        startNode: {
            control: { type: "number", min: 0 },
            description: "Starting node for BFS traversal",
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
        nodeCount: 8,
        graphType: "tree",
        startNode: 0,
        animationSpeed: 500,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<BFSArgs>;

/**
 * BFS (Breadth-First Search) story with interactive controls.
 * Use the controls to play, pause, step through, or reset the animation.
 *
 * This story uses the actual `breadthFirstSearch()` function from @graphty/algorithms.
 *
 * The play function runs the animation to completion for Chromatic visual testing.
 */
export const BFS: Story = {
    render: (args) => createBFSStory(args),
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);

        // Click play button to start animation
        const playButton = canvas.getByRole("button", { name: /play/i });
        await userEvent.click(playButton);

        // Wait for animation to complete (status shows "complete")
        await waitFor(
            async () => {
                const statusText = canvasElement.querySelector("[data-status]")?.textContent ?? "";
                await expect(statusText).toContain("complete");
            },
            { timeout: (args.nodeCount * 3 + 5) * args.animationSpeed },
        );
    },
};
