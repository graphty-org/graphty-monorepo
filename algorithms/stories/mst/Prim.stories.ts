/**
 * Prim's MST Algorithm Stories
 *
 * Demonstrates Prim's minimum spanning tree algorithm with step-by-step animation
 * showing edges being added from a growing tree.
 *
 * IMPORTANT: This story uses the actual primMST implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { kruskalMST, primMST } from "@graphty/algorithms";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import { type GeneratedGraph, generateGraph, type GraphType } from "../utils/graph-generators.js";
import { edgeEnds, toSnapshot } from "../utils/snapshot.js";
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

const SVG_NS = "http://www.w3.org/2000/svg";

/** Fill and ring of the node Prim grows the tree from. */
const START_FILL = "#f59e0b";
const START_RING = "#92400e";

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
 * A tree edge, oriented from the tree to the node it brought in.
 */
interface TreeEdge {
    source: number;
    target: number;
    weight: number;
}

/**
 * Animation step for Prim visualization.
 */
interface PrimStep {
    type: "start" | "consider" | "add" | "complete";
    edge?: TreeEdge;
    description: string;
}

/**
 * Run primMST() and read its result as the tree edges in the order Prim added them.
 * `edges` lists the logical edges in acceptance order, so the end not yet in the tree is the
 * node each edge brought in.
 * @param generatedGraph - The generated graph
 * @param startNode - The node id the tree grows from
 * @returns The tree edges in order and their total weight
 */
function runPrim(generatedGraph: GeneratedGraph, startNode: number): { edges: TreeEdge[]; totalWeight: number } {
    const graph = toSnapshot(generatedGraph, { weighted: true });
    const mst = primMST(graph, { start: graph.ids.requireIndex(startNode) });
    const { weights } = graph.edgeList();
    const inTree = new Set([startNode]);
    const edges = edgeEnds(graph, mst.edges).map(({ source, target }, i) => {
        const fromTree = inTree.has(source);
        const joined = fromTree ? target : source;
        inTree.add(joined);
        return { source: fromTree ? source : target, target: joined, weight: weights?.[mst.edges[i]] ?? 1 };
    });
    return { edges, totalWeight: mst.totalWeight };
}

/**
 * Turn Prim's result into animation steps: each edge is shown as the cheapest crossing edge,
 * then added.
 */
function createSteps(startNode: number, edges: TreeEdge[], totalWeight: number): PrimStep[] {
    const steps: PrimStep[] = [{ type: "start", description: `Starting Prim's algorithm from node ${startNode}` }];
    edges.forEach((edge, i) => {
        const name = `${edge.source}-${edge.target} (weight: ${edge.weight})`;
        steps.push({ type: "consider", edge, description: `Cheapest edge leaving the tree: ${name}` });
        steps.push({ type: "add", edge, description: `Added edge ${i + 1}: ${name}` });
    });
    steps.push({ type: "complete", description: `MST complete! Total weight: ${totalWeight}` });
    return steps;
}

/**
 * The line drawn for an undirected edge.
 */
function edgeLine(svg: SVGSVGElement, a: number, b: number): SVGLineElement | null {
    return (svg.querySelector(`line[data-source="${a}"][data-target="${b}"]`) ??
        svg.querySelector(`line[data-source="${b}"][data-target="${a}"]`)) as SVGLineElement | null;
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

    // Run Prim and create animation steps
    const result = runPrim(generatedGraph, validStartNode);
    const steps = createSteps(validStartNode, result.edges, result.totalWeight);

    // Create container
    const { container, svg } = createStoryContainer();

    // Render graph with edge weights
    renderGraph(svg, generatedGraph);

    // Edge weight labels, set off to one side of each edge so the order badge can sit on it
    const edgeGroup = svg.querySelector(".edges");
    const badgeGroup = document.createElementNS(SVG_NS, "g");
    svg.querySelector(".nodes")?.before(badgeGroup);
    const nodeById = new Map(generatedGraph.nodes.map((n) => [n.id, n]));
    for (const edge of generatedGraph.edges) {
        const sourceNode = nodeById.get(edge.source);
        const targetNode = nodeById.get(edge.target);
        if (edgeGroup && sourceNode && targetNode && edge.weight !== undefined) {
            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const len = Math.hypot(dx, dy) || 1;
            const text = document.createElementNS(SVG_NS, "text");
            text.setAttribute("x", String((sourceNode.x + targetNode.x) / 2 - (dy / len) * 14));
            text.setAttribute("y", String((sourceNode.y + targetNode.y) / 2 + (dx / len) * 14));
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("dominant-baseline", "central");
            text.setAttribute("fill", COLORS.text.edge);
            text.setAttribute("font-size", "11");
            text.setAttribute("font-family", "system-ui, sans-serif");
            text.setAttribute("data-weight-of", `${edge.source}-${edge.target}`);
            text.textContent = String(edge.weight);
            edgeGroup.appendChild(text);
        }
    }

    // Legend: what the final picture's marks mean
    const legend = document.createElement("div");
    legend.style.cssText = `
        display: flex; gap: 16px; margin-top: 12px; font-size: 12px; color: #475569;
        font-family: system-ui, sans-serif; align-items: center; flex-wrap: wrap; justify-content: center;
    `;
    legend.innerHTML = `
        <span style="display: inline-flex; align-items: center; gap: 6px;">
            <svg width="18" height="18"><circle cx="9" cy="9" r="7" fill="${START_FILL}" stroke="${START_RING}" stroke-width="3"/></svg>Start node</span>
        <span style="display: inline-flex; align-items: center; gap: 6px;">
            <svg width="34" height="18"><line x1="0" y1="9" x2="34" y2="9" stroke="${COLORS.edge.traversed}" stroke-width="5"/>
            <circle cx="17" cy="9" r="7" fill="#ffffff" stroke="${COLORS.edge.traversed}" stroke-width="2"/>
            <text x="17" y="9" text-anchor="middle" dominant-baseline="central" font-size="9" font-weight="700" fill="#166534">1</text></svg>
            Tree edge, numbered in the order Prim added it</span>
        <span style="display: inline-flex; align-items: center; gap: 6px;">
            <svg width="34" height="18"><line x1="0" y1="9" x2="34" y2="9" stroke="${COLORS.edge.default}" stroke-width="2" stroke-dasharray="4 4" opacity="0.4"/></svg>
            Not in the tree</span>
    `;
    container.appendChild(legend);

    // Create MST info panel
    const mstPanel = document.createElement("div");
    mstPanel.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background: #f1f5f9;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
        max-width: 476px;
    `;
    mstPanel.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">MST Edges in the order added (from node ${validStartNode})</div>
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
    const mstEdges: TreeEdge[] = [];
    let totalWeight = 0;

    /**
     * Mark the start node: its own fill and a heavy ring, so it reads apart from the other tree nodes.
     */
    function markStart(on: boolean): void {
        const circle = svg.querySelector(`[data-node-id="${validStartNode}"]`);
        circle?.setAttribute("stroke", on ? START_RING : "#4338ca");
        circle?.setAttribute("stroke-width", on ? "5" : "2");
        if (on) {
            circle?.setAttribute("fill", START_FILL);
        }
    }

    /**
     * Draw a tree edge heavy, with a badge holding its order of addition.
     */
    function drawTreeEdge(edge: TreeEdge, order: number): void {
        const line = edgeLine(svg, edge.source, edge.target);
        if (!line) {
            return;
        }
        line.setAttribute("stroke", COLORS.edge.traversed);
        line.setAttribute("stroke-width", "5");
        line.setAttribute("data-tree-order", String(order));
        const cx = (Number(line.getAttribute("x1")) + Number(line.getAttribute("x2"))) / 2;
        const cy = (Number(line.getAttribute("y1")) + Number(line.getAttribute("y2"))) / 2;
        const badge = document.createElementNS(SVG_NS, "g");
        badge.setAttribute("data-order-badge", String(order));
        badge.innerHTML = `
            <circle cx="${cx}" cy="${cy}" r="10" fill="#ffffff" stroke="${COLORS.edge.traversed}" stroke-width="2"/>
            <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="11"
                font-weight="700" font-family="system-ui, sans-serif" fill="#166534">${order}</text>`;
        badgeGroup.appendChild(badge);
    }

    /**
     * Dim (or restore) every edge that is not in the tree, with its weight label.
     */
    function dimNonTreeEdges(on: boolean): void {
        for (const line of svg.querySelectorAll<SVGLineElement>("line[data-source]")) {
            const dim = on && !line.hasAttribute("data-tree-order");
            line.setAttribute("stroke-dasharray", dim ? "4 4" : "");
            line.setAttribute("opacity", dim ? "0.4" : "1");
            const label = svg.querySelector(
                `[data-weight-of="${line.getAttribute("data-source")}-${line.getAttribute("data-target")}"]`,
            );
            label?.setAttribute("opacity", dim ? "0.35" : "1");
        }
    }

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
                mstEdges.forEach((edge, i) => {
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
                    badge.setAttribute("data-mst-edge", "");
                    badge.textContent = `${i + 1}. ${edge.source}-${edge.target} (${edge.weight})`;
                    edgesEl.appendChild(badge);
                });
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
        const { edge } = step;

        switch (step.type) {
            case "start":
                markStart(true);
                break;

            case "consider":
                if (edge) {
                    highlightEdge(svg, edge.source, edge.target, "current");
                    highlightNode(svg, edge.target, "queued");
                }
                break;

            case "add":
                if (edge) {
                    mstEdges.push(edge);
                    totalWeight += edge.weight;
                    drawTreeEdge(edge, mstEdges.length);
                    highlightNode(svg, edge.target, "visited");
                    updateMstDisplay();
                }
                break;

            case "complete":
                dimNonTreeEdges(true);
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
        markStart(false);
        dimNonTreeEdges(false);
        for (const line of svg.querySelectorAll("line[data-tree-order]")) {
            line.removeAttribute("data-tree-order");
        }
        badgeGroup.innerHTML = "";
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

        // The finished picture must hold a spanning tree of minimum weight: n - 1 tree edges drawn
        // and listed, whose weights add up to primMST()'s total, which Kruskal's must equal too.
        const graph = toSnapshot(generateGraph(args.graphType, args.nodeCount, args.seed), { weighted: true });
        const start = Math.min(Math.max(args.startNode, 0), args.nodeCount - 1);
        const expected = primMST(graph, { start: graph.ids.requireIndex(start) }).totalWeight;
        await expect(kruskalMST(graph).totalWeight).toBe(expected);

        const treeLines = canvasElement.querySelectorAll("line[data-tree-order]");
        await expect(treeLines.length).toBe(args.nodeCount - 1);
        await expect(canvasElement.querySelectorAll("[data-order-badge]").length).toBe(args.nodeCount - 1);
        await expect(canvasElement.querySelectorAll("[data-mst-edge]").length).toBe(args.nodeCount - 1);

        // The drawn tree edges connect every node to the start node: with n - 1 edges, that makes
        // them a spanning tree (n - 1 edges merely touching every node could hold a cycle).
        const ends = Array.from(treeLines, (l) => [l.getAttribute("data-source"), l.getAttribute("data-target")]);
        const reached = new Set([String(start)]);
        for (let grew = true; grew; ) {
            grew = false;
            for (const [a, b] of ends) {
                if (a !== null && b !== null && reached.has(a) !== reached.has(b)) {
                    reached.add(a).add(b);
                    grew = true;
                }
            }
        }
        await expect(reached.size).toBe(args.nodeCount);

        const totalText = canvasElement.querySelector("[data-total-weight]")?.textContent ?? "";
        await expect(totalText).toBe(`Total weight: ${expected}`);
    },
};
