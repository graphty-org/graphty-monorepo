/**
 * Kruskal's MST Algorithm Stories
 *
 * Demonstrates Kruskal's minimum spanning tree algorithm with step-by-step animation
 * showing edges being added one by one based on greedy selection.
 *
 * IMPORTANT: This story uses the actual kruskalMST implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { Graph, kruskalMST } from "@graphty/algorithms";
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
interface KruskalArgs {
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
 * Animation step for Kruskal visualization.
 */
interface KruskalStep {
    type: "consider" | "add" | "reject" | "complete";
    source?: number;
    target?: number;
    weight?: number;
    description: string;
}

/**
 * Run Kruskal's algorithm and create animation steps.
 */
function runKruskalAndCreateSteps(generatedGraph: GeneratedGraph): KruskalStep[] {
    const graph = toAlgorithmGraph(generatedGraph);
    const steps: KruskalStep[] = [];

    // Run actual Kruskal's algorithm
    const result = kruskalMST(graph);

    // Sort edges by weight for animation (same order as Kruskal's)
    const sortedEdges = [...generatedGraph.edges].sort((a, b) => (a.weight ?? 1) - (b.weight ?? 1));

    // Track which edges are in the MST result
    const mstEdges = new Set<string>();
    for (const edge of result.edges) {
        // Handle both directions for undirected edges
        const key1 = `${edge.source}-${edge.target}`;
        const key2 = `${edge.target}-${edge.source}`;
        mstEdges.add(key1);
        mstEdges.add(key2);
    }

    // Track added nodes for union-find simulation
    const parent = new Map<number, number>();
    for (const node of generatedGraph.nodes) {
        parent.set(node.id, node.id);
    }

    function find(x: number): number {
        const px = parent.get(x);
        if (px !== x && px !== undefined) {
            parent.set(x, find(px));
        }
        return parent.get(x) ?? x;
    }

    function union(x: number, y: number): boolean {
        const rootX = find(x);
        const rootY = find(y);
        if (rootX === rootY) {
            return false;
        }
        parent.set(rootX, rootY);
        return true;
    }

    let addedEdges = 0;

    // Simulate Kruskal's algorithm for animation
    for (const edge of sortedEdges) {
        const {source} = edge;
        const {target} = edge;
        const weight = edge.weight ?? 1;

        steps.push({
            type: "consider",
            source,
            target,
            weight,
            description: `Considering edge ${source}—${target} (weight: ${weight})`,
        });

        const key = `${source}-${target}`;
        const isMstEdge = mstEdges.has(key);

        if (isMstEdge && union(source, target)) {
            addedEdges++;
            steps.push({
                type: "add",
                source,
                target,
                weight,
                description: `Added edge ${source}—${target} to MST (weight: ${weight})`,
            });

            if (addedEdges === generatedGraph.nodes.length - 1) {
                break;
            }
        } else if (!isMstEdge) {
            steps.push({
                type: "reject",
                source,
                target,
                weight,
                description: `Rejected edge ${source}—${target} (would create cycle)`,
            });
        }
    }

    steps.push({
        type: "complete",
        description: `MST complete! Total weight: ${result.totalWeight}`,
    });

    return steps;
}

/**
 * Create the Kruskal visualization story.
 */
function createKruskalStory(args: KruskalArgs): HTMLElement {
    const { nodeCount, graphType, animationSpeed, seed } = args;

    // Generate graph
    const generatedGraph = generateGraph(graphType, nodeCount, seed);

    // Create animation steps
    const steps = runKruskalAndCreateSteps(generatedGraph);

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
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">MST Edges</div>
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
            case "consider":
                if (step.source !== undefined && step.target !== undefined) {
                    highlightEdge(svg, step.source, step.target, "current");
                    highlightNode(svg, step.source, "queued");
                    highlightNode(svg, step.target, "queued");
                }
                break;

            case "add":
                if (step.source !== undefined && step.target !== undefined) {
                    highlightEdge(svg, step.source, step.target, "traversed");
                    highlightNode(svg, step.source, "visited");
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

            case "reject":
                if (step.source !== undefined && step.target !== undefined) {
                    // Reset the edge to default
                    highlightEdge(svg, step.source, step.target, "default");
                    // Reset nodes if not already in MST
                    const inMst = mstEdges.some(
                        (e) =>
                            (e.source === step.source || e.target === step.source) ||
                            (e.source === step.target || e.target === step.target),
                    );
                    if (!inMst) {
                        highlightNode(svg, step.source, "default");
                        highlightNode(svg, step.target, "default");
                    }
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

const meta: Meta<KruskalArgs> = {
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
        animationSpeed: 600,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<KruskalArgs>;

/**
 * Kruskal's MST algorithm story with step-by-step animation.
 *
 * This story uses the actual `kruskalMST()` function from @graphty/algorithms.
 * Watch as edges are added greedily by weight, avoiding cycles.
 */
export const Kruskal: Story = {
    render: (args) => createKruskalStory(args),
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
