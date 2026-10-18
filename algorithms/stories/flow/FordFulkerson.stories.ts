/**
 * Ford-Fulkerson Max Flow Algorithm Stories
 *
 * Demonstrates Ford-Fulkerson max flow algorithm with step-by-step animation
 * showing augmenting paths being found and flow being increased.
 *
 * IMPORTANT: This story uses the actual maxFlow implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { maxFlow } from "@graphty/algorithms";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import { type GeneratedGraph, type GraphNode, SeededRandom } from "../utils/graph-generators.js";
import { toSnapshot } from "../utils/snapshot.js";
import {
    callSource,
    COLORS,
    createAnimationControls,
    createCallPanel,
    createStatusPanel,
    createStoryContainer,
    highlightEdge,
    renderGraph,
    resetHighlights,
    updateStatus,
} from "../utils/visualization.js";
import { storyWaitOptions } from "../utils/wait.js";

/**
 * Story arguments interface.
 */
interface FordFulkersonArgs {
    nodeCount: number;
    animationSpeed: number;
    seed: number;
}

/**
 * Generate a flow network graph with source and sink.
 */
function generateFlowNetwork(
    nodeCount: number,
    seed: number,
    width: number = 500,
    height: number = 500,
): GeneratedGraph {
    const rng = new SeededRandom(seed);
    const nodes: GraphNode[] = [];
    const edges: GeneratedGraph["edges"] = [];

    // Ensure at least 4 nodes for meaningful flow network
    const actualNodeCount = Math.max(nodeCount, 4);

    // Create nodes in layers for better flow network visualization
    const layers = 3;
    const nodesPerLayer = Math.floor((actualNodeCount - 2) / layers);

    // Source node (left)
    nodes.push({
        id: 0,
        label: "S",
        x: 50,
        y: height / 2,
    });

    // Middle layer nodes
    let nodeId = 1;
    for (let layer = 0; layer < layers; layer++) {
        const x = 50 + ((layer + 1) * (width - 100)) / (layers + 1);
        // The last layer takes every node left before the sink, whose id is actualNodeCount - 1
        const layerNodes = layer === layers - 1 ? actualNodeCount - 1 - nodeId : nodesPerLayer;

        for (let i = 0; i < layerNodes && nodeId < actualNodeCount - 1; i++) {
            const y = 50 + ((i + 1) * (height - 100)) / (layerNodes + 1);
            nodes.push({
                id: nodeId,
                label: String(nodeId),
                x,
                y,
            });
            nodeId++;
        }
    }

    // Sink node (right)
    nodes.push({
        id: actualNodeCount - 1,
        label: "T",
        x: width - 50,
        y: height / 2,
    });

    // Create edges with capacities (ensuring flow from source to sink)
    // Connect source to first layer
    for (let i = 1; i < Math.min(nodesPerLayer + 1, actualNodeCount - 1); i++) {
        edges.push({
            source: 0,
            target: i,
            weight: rng.nextInt(5, 15),
        });
    }

    // Connect middle layers
    for (let i = 1; i < actualNodeCount - 1; i++) {
        for (let j = i + 1; j < actualNodeCount; j++) {
            if (rng.next() < 0.4 && nodes[i].x < nodes[j].x) {
                edges.push({
                    source: i,
                    target: j,
                    weight: rng.nextInt(3, 12),
                });
            }
        }
    }

    // Ensure at least some edges to sink
    const lastLayerStart = actualNodeCount - 1 - nodesPerLayer;
    for (let i = Math.max(1, lastLayerStart); i < actualNodeCount - 1; i++) {
        if (rng.next() < 0.6) {
            edges.push({
                source: i,
                target: actualNodeCount - 1,
                weight: rng.nextInt(5, 15),
            });
        }
    }

    return { nodes, edges };
}

/**
 * Animation step for the maximum flow visualization.
 */
interface FlowStep {
    type: "start" | "complete";
    totalFlow?: number;
    description: string;
}

/**
 * Run maxFlow() and read its result: the steps to show, and the flow on each edge.
 * @param generatedGraph - The flow network; node 0 is the source, the last node the sink
 * @returns The steps and the flow per edge, keyed "source-target" by node id
 */
function runMaxFlow(generatedGraph: GeneratedGraph): { steps: FlowStep[]; edgeFlow: Map<string, number> } {
    const graph = toSnapshot(generatedGraph, { directed: true, weighted: true });

    const source = graph.ids.requireIndex(0);
    const sink = graph.ids.requireIndex(generatedGraph.nodes[generatedGraph.nodes.length - 1].id);

    // Run the actual maximum flow algorithm
    const result = maxFlow(graph, source, sink);

    const { src, dst } = graph.edgeList();
    const edgeFlow = new Map<string, number>();
    for (let e = 0; e < result.flow.length; e++) {
        edgeFlow.set(`${String(graph.ids.idOf(src[e]))}-${String(graph.ids.idOf(dst[e]))}`, result.flow[e]);
    }

    const steps: FlowStep[] = [
        { type: "start", description: "Finding the maximum flow from the source (S) to the sink (T)" },
        {
            type: "complete",
            totalFlow: result.maxFlow,
            description: `Maximum flow: ${result.maxFlow}. Each edge shows flow / capacity; green edges carry flow.`,
        },
    ];
    return { steps, edgeFlow };
}

/**
 * Create the Ford-Fulkerson visualization story.
 */
function createFordFulkersonStory(args: FordFulkersonArgs): HTMLElement {
    const { nodeCount, animationSpeed, seed } = args;

    // Generate flow network
    const generatedGraph = generateFlowNetwork(nodeCount, seed);

    // Run the algorithm
    const { steps, edgeFlow } = runMaxFlow(generatedGraph);
    const sinkId = generatedGraph.nodes[generatedGraph.nodes.length - 1].id;

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph
    renderGraph(svg, generatedGraph, 20, { arrows: () => "end" });

    // Add capacity labels to edges
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
                text.setAttribute("font-size", "12");
                text.setAttribute("data-capacity", `${edge.source}-${edge.target}`);
                text.setAttribute("font-family", "system-ui, sans-serif");
                text.textContent = String(edge.weight);
                edgeGroup.appendChild(text);
            }
        }
    }

    // Mark source and sink with special styling
    const sourceCircle = svg.querySelector(`[data-node-id="0"]`);
    const sinkCircle = svg.querySelector(`[data-node-id="${sinkId}"]`);
    if (sourceCircle) {
        sourceCircle.setAttribute("fill", "#22c55e");
    }
    if (sinkCircle) {
        sinkCircle.setAttribute("fill", "#ef4444");
    }

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
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">Maximum flow</div>
        <div style="display: flex; gap: 16px; margin-bottom: 8px; color: #1e293b;">
            <span><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #22c55e;"></span> Source (S)</span>
            <span><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #ef4444;"></span> Sink (T)</span>
            <span><span style="display: inline-block; width: 16px; height: 3px; vertical-align: middle; background: ${COLORS.edge.traversed};"></span> Carries flow</span>
        </div>
        <div data-flow style="color: #475569;">Total flow: 0</div>
    `;
    container.appendChild(infoPanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Ready to find maximum flow");

    // Animation state
    let currentStep = 0;
    let isPlaying = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let currentFlow = 0;

    /**
     * Update flow display.
     */
    function updateFlowDisplay(): void {
        const flowEl = infoPanel.querySelector("[data-flow]");
        if (flowEl) {
            flowEl.textContent = `Total flow: ${currentFlow}`;
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
                // Source and sink keep their legend colors
                break;

            case "complete":
                if (step.totalFlow !== undefined) {
                    currentFlow = step.totalFlow;
                    updateFlowDisplay();
                }
                showEdgeFlows(true);
                break;

            default:
                break;
        }

        updateStatus(statusPanel, step.description);
        currentStep++;
        return currentStep < steps.length;
    }

    /**
     * Show each edge's flow and capacity, or only its capacity.
     * @param show - Whether to show the flows
     */
    function showEdgeFlows(show: boolean): void {
        for (const edge of generatedGraph.edges) {
            const key = `${edge.source}-${edge.target}`;
            const flow = edgeFlow.get(key) ?? 0;
            const label = svg.querySelector(`[data-capacity="${key}"]`);
            if (label) {
                label.textContent = show ? `${flow} / ${edge.weight}` : String(edge.weight);
            }
            highlightEdge(svg, edge.source, edge.target, show && flow > 0 ? "traversed" : "default");
        }
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
        currentFlow = 0;
        resetHighlights(svg);
        showEdgeFlows(false);

        // Restore source/sink colors
        if (sourceCircle) {
            sourceCircle.setAttribute("fill", "#22c55e");
        }
        if (sinkCircle) {
            sinkCircle.setAttribute("fill", "#ef4444");
        }

        updateFlowDisplay();
        updateStatus(statusPanel, "Ready to find maximum flow");
    }

    // Add controls
    const controls = createAnimationControls(play, pause, executeStep, reset);
    container.appendChild(controls);

    container.appendChild(createCallPanel(callCode(args)));

    return container;
}

/**
 * The consumer code this story runs, shown in the call panel and the Code panel.
 * @param args - The story's arguments
 * @returns The code
 */
function callCode(args: FordFulkersonArgs): string {
    return `import { maxFlow } from "@graphty/algorithms";

// snapshot must be directed; each edge's weight is its capacity
const result = maxFlow(snapshot, snapshot.ids.requireIndex(0), snapshot.ids.requireIndex(${Math.max(args.nodeCount, 4) - 1}));
// result.maxFlow: the total; result.flow: Float64Array, the flow on each edge index
// result.cutEdges: the edges of a minimum cut`;
}

const meta: Meta<FordFulkersonArgs> = {
    title: "Flow",
    // The component id before the move, so every story id (and its baseline) stays the same
    id: "flow",
    parameters: {
        docs: {
            description: {
                component:
                    "Maximum flow finds the most that can travel from a source S to a sink T of a directed network without any edge carrying more than its capacity. Arrows show each edge's direction. Press Play: every edge is then labeled flow / capacity, edges that carry flow turn green, and the total is the maximum flow. The network is generated in the story from a seed; its size and seed are controls.",
            },
        },
    },
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 4, max: 10, step: 1 },
            description: "Number of nodes in the network",
        },
        animationSpeed: {
            control: { type: "range", min: 200, max: 2000, step: 100 },
            description: "Animation speed in milliseconds",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible networks",
        },
    },
    args: {
        nodeCount: 8,
        animationSpeed: 800,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<FordFulkersonArgs>;

/**
 * Ford-Fulkerson max flow algorithm story with step-by-step animation.
 *
 * This story uses the actual `maxFlow()` function from @graphty/algorithms.
 * Play shows the flow maxFlow() found on every edge, and its total.
 */
export const FordFulkerson: Story = {
    name: "Maximum flow (Ford-Fulkerson)",
    render: (args) => createFordFulkersonStory(args),
    parameters: {
        ...callSource(callCode(meta.args as FordFulkersonArgs)),
        // Disable the visual capture for this story - the play function has long animations
        // that are too long for one capture (15s render + 15s interaction)
        chromatic: { disableSnapshot: true },
    },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);

        const playButton = canvas.getByRole("button", { name: /play/i });
        await userEvent.click(playButton);

        await waitFor(
            async () => {
                const statusText = canvasElement.querySelector("[data-status]")?.textContent ?? "";
                await expect(statusText).toContain("Maximum flow");
            },
            storyWaitOptions(10 * args.animationSpeed),
        );
    },
};
