/**
 * DFS (Depth-First Search) Algorithm Stories
 *
 * Demonstrates the DFS traversal algorithm with step-by-step animation
 * and stack visualization.
 *
 * IMPORTANT: This story uses the actual depthFirstSearch implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { depthFirstSearch, Graph } from "@graphty/algorithms";
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
interface DFSArgs {
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
 * Captured step during DFS traversal.
 */
interface CapturedStep {
    node: number;
    depth: number;
    parent: number | null;
}

/**
 * Run DFS using the actual algorithm and capture steps via visitCallback.
 */
function runDFSAndCaptureSteps(
    generatedGraph: GeneratedGraph,
    startNode: number,
): { steps: CapturedStep[]; tree: Map<number | string, number | string | null> } {
    const graph = toAlgorithmGraph(generatedGraph);
    const capturedSteps: CapturedStep[] = [];

    // Run the actual DFS algorithm with visitCallback to capture each step
    const result = depthFirstSearch(graph, startNode, {
        visitCallback: (node, depth) => {
            capturedSteps.push({
                node: node as number,
                depth,
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
 * Convert captured DFS steps to animation steps.
 * Simulates stack state based on DFS depth-first traversal.
 */
function convertToAnimationSteps(capturedSteps: CapturedStep[]): TraversalStep[] {
    const animationSteps: TraversalStep[] = [];

    // Track stack state - we push when going deeper, pop when backtracking
    const stackState: number[] = [];
    let lastDepth = -1;

    for (let i = 0; i < capturedSteps.length; i++) {
        const step = capturedSteps[i];

        // First node: push to stack
        if (i === 0) {
            animationSteps.push({
                type: "push",
                nodeId: step.node,
                description: `Push node ${step.node} to stack (starting node)`,
            });
            stackState.push(step.node);
            lastDepth = step.depth;
        } else {
            // If we're going deeper, push to stack
            if (step.depth > lastDepth) {
                animationSteps.push({
                    type: "push",
                    nodeId: step.node,
                    parentId: step.parent ?? undefined,
                    description: `Push node ${step.node} to stack`,
                });
                stackState.push(step.node);
            } else {
                // If we're backtracking or at same level, we need to pop first
                // Pop nodes until we're at the right depth
                while (stackState.length > step.depth + 1) {
                    stackState.pop();
                }

                // Pop the previous node at this depth if any
                if (stackState.length > step.depth) {
                    stackState.pop();
                }

                // Push the new node
                animationSteps.push({
                    type: "push",
                    nodeId: step.node,
                    parentId: step.parent ?? undefined,
                    description: `Push node ${step.node} to stack`,
                });
                stackState.push(step.node);
            }
            lastDepth = step.depth;
        }

        // Pop this node (it's being visited)
        animationSteps.push({
            type: "pop",
            nodeId: step.node,
            parentId: step.parent ?? undefined,
            description: `Pop node ${step.node} from stack`,
        });

        // Visit this node
        animationSteps.push({
            type: "visit",
            nodeId: step.node,
            parentId: step.parent ?? undefined,
            description: `Visit node ${step.node}${step.parent !== null ? ` (from ${step.parent})` : ""}`,
        });
    }

    // Complete step
    animationSteps.push({
        type: "complete",
        nodeId: -1,
        description: "DFS traversal complete!",
    });

    return animationSteps;
}

/**
 * Create the DFS visualization story.
 */
function createDFSStory(args: DFSArgs): HTMLElement {
    const { nodeCount, graphType, startNode, animationSpeed, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);

    // Validate start node
    const validStartNode = Math.min(startNode, nodeCount - 1);

    // Run actual DFS algorithm and capture steps
    const { steps: capturedSteps } = runDFSAndCaptureSteps(generatedGraph, validStartNode);

    // Convert to animation steps
    const steps = convertToAnimationSteps(capturedSteps);

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph
    renderGraph(svg, generatedGraph);

    // Create stack panel
    const stackPanel = createDataStructurePanel("stack", "Stack");
    container.appendChild(stackPanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);

    // Animation state
    let currentStep = 0;
    let isPlaying = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const stackState: number[] = [];
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
            case "push":
                stackState.push(step.nodeId);
                highlightNode(svg, step.nodeId, "stacked");
                break;

            case "pop": {
                // Remove the node from stack visualization
                const idx = stackState.lastIndexOf(step.nodeId);
                if (idx !== -1) {
                    stackState.splice(idx, 1);
                }
                highlightNode(svg, step.nodeId, "current");
                break;
            }

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

        updateDataStructure(stackPanel, [...stackState].reverse()); // Show stack top-to-bottom
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
        stackState.length = 0;
        visitedNodes.clear();
        resetHighlights(svg);
        updateDataStructure(stackPanel, []);
        updateStatus(statusPanel, "Ready to start traversal");
    }

    // Add controls
    const controls = createAnimationControls(play, pause, executeStep, reset);
    container.appendChild(controls);

    return container;
}

const meta: Meta<DFSArgs> = {
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
            description: "Starting node for DFS traversal",
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

type Story = StoryObj<DFSArgs>;

/**
 * DFS (Depth-First Search) story with interactive controls.
 * Use the controls to play, pause, step through, or reset the animation.
 *
 * This story uses the actual `depthFirstSearch()` function from @graphty/algorithms.
 *
 * The play function runs the animation to completion for Chromatic visual testing.
 */
export const DFS: Story = {
    render: (args) => createDFSStory(args),
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
