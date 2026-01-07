/**
 * Prim's MST Algorithm Stories
 *
 * Demonstrates Prim's minimum spanning tree algorithm with step-by-step animation
 * showing edges being added from a growing tree.
 *
 * IMPORTANT: This story uses the actual primMST implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { Graph, primMST } from "@graphty/algorithms";
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
interface PrimArgs {
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
 * Animation step for Prim visualization.
 */
interface PrimStep {
    type: "start" | "consider" | "add" | "complete";
    nodeId?: number;
    source?: number;
    target?: number;
    weight?: number;
    description: string;
}

/**
 * Run Prim's algorithm and create animation steps.
 */
function runPrimAndCreateSteps(generatedGraph: GeneratedGraph, startNode: number): PrimStep[] {
    const graph = toAlgorithmGraph(generatedGraph);
    const steps: PrimStep[] = [];

    // Run actual Prim's algorithm
    const result = primMST(graph, startNode);

    // Track which edges are in the MST result
    const mstEdges = new Set<string>();
    for (const edge of result.edges) {
        const key1 = `${edge.source}-${edge.target}`;
        const key2 = `${edge.target}-${edge.source}`;
        mstEdges.add(key1);
        mstEdges.add(key2);
    }

    // Build adjacency list for simulation
    const adjacency = new Map<number, Array<{ target: number; weight: number }>>();
    for (const node of generatedGraph.nodes) {
        adjacency.set(node.id, []);
    }
    for (const edge of generatedGraph.edges) {
        adjacency.get(edge.source)?.push({ target: edge.target, weight: edge.weight ?? 1 });
        adjacency.get(edge.target)?.push({ target: edge.source, weight: edge.weight ?? 1 });
    }

    // Simulate Prim's algorithm for animation
    const inMST = new Set<number>();
    const edgeCandidates: Array<{ source: number; target: number; weight: number }> = [];

    steps.push({
        type: "start",
        nodeId: startNode,
        description: `Starting Prim's algorithm from node ${startNode}`,
    });

    inMST.add(startNode);

    // Add initial edges from start node
    for (const { target, weight } of adjacency.get(startNode) ?? []) {
        edgeCandidates.push({ source: startNode, target, weight });
    }

    while (inMST.size < generatedGraph.nodes.length && edgeCandidates.length > 0) {
        // Sort candidates by weight
        edgeCandidates.sort((a, b) => a.weight - b.weight);

        // Find next valid edge (to a node not yet in MST)
        let nextEdge: { source: number; target: number; weight: number } | null = null;
        let edgeIndex = -1;

        for (let i = 0; i < edgeCandidates.length; i++) {
            const candidate = edgeCandidates[i];
            if (!inMST.has(candidate.target)) {
                nextEdge = candidate;
                edgeIndex = i;
                break;
            }
        }

        if (!nextEdge || edgeIndex === -1) {
            break;
        }

        // Remove selected edge from candidates
        edgeCandidates.splice(edgeIndex, 1);

        steps.push({
            type: "consider",
            source: nextEdge.source,
            target: nextEdge.target,
            weight: nextEdge.weight,
            description: `Considering edge ${nextEdge.source}—${nextEdge.target} (weight: ${nextEdge.weight})`,
        });

        // Check if this edge is in the actual MST result
        const key = `${nextEdge.source}-${nextEdge.target}`;
        if (mstEdges.has(key)) {
            steps.push({
                type: "add",
                source: nextEdge.source,
                target: nextEdge.target,
                weight: nextEdge.weight,
                description: `Added edge ${nextEdge.source}—${nextEdge.target} to MST (weight: ${nextEdge.weight})`,
            });

            inMST.add(nextEdge.target);

            // Add edges from newly added node
            for (const { target, weight } of adjacency.get(nextEdge.target) ?? []) {
                if (!inMST.has(target)) {
                    edgeCandidates.push({ source: nextEdge.target, target, weight });
                }
            }
        }
    }

    steps.push({
        type: "complete",
        description: `MST complete! Total weight: ${result.totalWeight}`,
    });

    return steps;
}

/**
 * Create the Prim visualization story.
 */
function createPrimStory(args: PrimArgs): HTMLElement {
    const { nodeCount, graphType, startNode, animationSpeed, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);

    // Validate start node
    const validStartNode = Math.min(Math.max(startNode, 0), nodeCount - 1);

    // Create animation steps
    const steps = runPrimAndCreateSteps(generatedGraph, validStartNode);

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

    // Create MST info panel
    const mstPanel = document.createElement("div");
    mstPanel.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background: #f1f5f9;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
    `;
    mstPanel.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">MST Edges (from node ${validStartNode})</div>
        <div data-mst-edges style="display: flex; gap: 8px; flex-wrap: wrap;"></div>
        <div data-total-weight style="margin-top: 8px; font-weight: 500; color: #475569;">Total weight: 0</div>
    `;
    container.appendChild(mstPanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Ready to find minimum spanning tree");

    // Animation state
    let currentStep = 0;
    let isPlaying = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const mstEdges: Array<{ source: number; target: number; weight: number }> = [];
    let totalWeight = 0;

    /**
     * Update MST display.
     */
    function updateMstDisplay(): void {
        const edgesEl = mstPanel.querySelector("[data-mst-edges]");
        const weightEl = mstPanel.querySelector("[data-total-weight]");

        if (edgesEl) {
            edgesEl.innerHTML = "";
            if (mstEdges.length === 0) {
                edgesEl.innerHTML = '<span style="color: #94a3b8; font-style: italic;">No edges added yet</span>';
            } else {
                for (const edge of mstEdges) {
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
                    badge.textContent = `${edge.source}—${edge.target} (${edge.weight})`;
                    edgesEl.appendChild(badge);
                }
            }
        }

        if (weightEl) {
            weightEl.textContent = `Total weight: ${totalWeight}`;
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
            case "start":
                if (step.nodeId !== undefined) {
                    highlightNode(svg, step.nodeId, "visited");
                }
                break;

            case "consider":
                if (step.source !== undefined && step.target !== undefined) {
                    highlightEdge(svg, step.source, step.target, "current");
                    highlightNode(svg, step.target, "queued");
                }
                break;

            case "add":
                if (step.source !== undefined && step.target !== undefined) {
                    highlightEdge(svg, step.source, step.target, "traversed");
                    highlightNode(svg, step.target, "visited");
                    mstEdges.push({
                        source: step.source,
                        target: step.target,
                        weight: step.weight ?? 0,
                    });
                    totalWeight += step.weight ?? 0;
                    updateMstDisplay();
                }
                break;

            case "complete":
                break;

            default:
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
        mstEdges.length = 0;
        totalWeight = 0;
        resetHighlights(svg);
        updateMstDisplay();
        updateStatus(statusPanel, "Ready to find minimum spanning tree");
    }

    // Initialize display
    updateMstDisplay();

    // Add controls
    const controls = createAnimationControls(play, pause, executeStep, reset);
    container.appendChild(controls);

    return container;
}

const meta: Meta<PrimArgs> = {
    title: "MST",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 4, max: 12, step: 1 },
            description: "Number of nodes in the graph",
        },
        graphType: {
            control: { type: "select" },
            options: ["random", "grid", "complete"] as GraphType[],
            description: "Type of graph to generate",
        },
        startNode: {
            control: { type: "number", min: 0 },
            description: "Starting node for Prim's algorithm",
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
        nodeCount: 7,
        graphType: "random",
        startNode: 0,
        animationSpeed: 600,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<PrimArgs>;

/**
 * Prim's MST algorithm story with step-by-step animation.
 *
 * This story uses the actual `primMST()` function from @graphty/algorithms.
 * Watch as the tree grows from the start node by adding minimum weight edges.
 */
export const Prim: Story = {
    render: (args) => createPrimStory(args),
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
            { timeout: (args.nodeCount * 3 + 10) * args.animationSpeed },
        );
    },
};
