/**
 * Graph Isomorphism Algorithm Stories
 *
 * Demonstrates graph isomorphism detection with a before/after visualization.
 * Shows two graphs and whether they are isomorphic, highlighting the mapping.
 *
 * IMPORTANT: This story uses the actual isGraphIsomorphic implementation
 * from @graphty/algorithms to demonstrate real package behavior.
 */

import { Graph, isGraphIsomorphic } from "@graphty/algorithms";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import {
    type GeneratedGraph,
    SeededRandom,
} from "../utils/graph-generators.js";
import {
    createSimpleAnimationControls,
    createStatusPanel,
    renderGraph,
    updateStatus,
} from "../utils/visualization.js";

/**
 * Story arguments interface.
 */
interface IsomorphismArgs {
    nodeCount: number;
    isIsomorphic: boolean;
    seed: number;
}

/**
 * Generate two graphs for isomorphism comparison.
 */
function generateGraphPair(
    nodeCount: number,
    isIsomorphic: boolean,
    seed: number,
    width: number = 220,
    height: number = 220,
): { graph1: GeneratedGraph; graph2: GeneratedGraph } {
    const rng = new SeededRandom(seed);

    // Generate first graph (cycle-like for visual clarity)
    const graph1: GeneratedGraph = {
        nodes: [],
        edges: [],
    };

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40;

    for (let i = 0; i < nodeCount; i++) {
        const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
        graph1.nodes.push({
            id: i,
            label: String(i),
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
        });

        // Create edges (cycle + some extra edges)
        graph1.edges.push({
            source: i,
            target: (i + 1) % nodeCount,
        });
    }

    // Add a few chord edges for more interesting structure
    if (nodeCount > 3) {
        graph1.edges.push({
            source: 0,
            target: Math.floor(nodeCount / 2),
        });
    }

    // Generate second graph
    const graph2: GeneratedGraph = {
        nodes: [],
        edges: [],
    };

    if (isIsomorphic) {
        // Create isomorphic graph with shuffled node positions and labels
        const mapping = Array.from({ length: nodeCount }, (_, i) => i);
        // Shuffle the mapping
        for (let i = nodeCount - 1; i > 0; i--) {
            const j = Math.floor(rng.next() * (i + 1));
            [mapping[i], mapping[j]] = [mapping[j], mapping[i]];
        }

        // Create nodes with different positions
        for (let i = 0; i < nodeCount; i++) {
            const originalIdx = mapping.indexOf(i);
            // Offset angle for visual distinction
            const angle = (2 * Math.PI * originalIdx) / nodeCount - Math.PI / 2 + Math.PI / nodeCount;
            graph2.nodes.push({
                id: i,
                label: String.fromCharCode(65 + i), // A, B, C, ...
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
            });
        }

        // Create edges using the mapping
        for (const edge of graph1.edges) {
            graph2.edges.push({
                source: mapping[edge.source],
                target: mapping[edge.target],
            });
        }
    } else {
        // Create non-isomorphic graph (different structure)
        for (let i = 0; i < nodeCount; i++) {
            const angle = (2 * Math.PI * i) / nodeCount - Math.PI / 2;
            graph2.nodes.push({
                id: i,
                label: String.fromCharCode(65 + i),
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
            });

            // Create different edge pattern (path instead of cycle)
            if (i < nodeCount - 1) {
                graph2.edges.push({
                    source: i,
                    target: i + 1,
                });
            }
        }

        // Add different chord edges
        if (nodeCount > 4) {
            graph2.edges.push({
                source: 0,
                target: nodeCount - 1,
            });
            graph2.edges.push({
                source: 1,
                target: nodeCount - 2,
            });
        }
    }

    return { graph1, graph2 };
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
 * Create SVG container for a graph.
 */
function createSvgContainer(width: number = 220, height: number = 220): SVGSVGElement {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.style.backgroundColor = "#f8fafc";
    svg.style.borderRadius = "8px";
    svg.style.display = "block";

    const defsGroup = document.createElementNS(SVG_NS, "defs");
    const edgeGroup = document.createElementNS(SVG_NS, "g");
    const nodeGroup = document.createElementNS(SVG_NS, "g");
    const labelGroup = document.createElementNS(SVG_NS, "g");

    edgeGroup.setAttribute("class", "edges");
    nodeGroup.setAttribute("class", "nodes");
    labelGroup.setAttribute("class", "labels");

    svg.appendChild(defsGroup);
    svg.appendChild(edgeGroup);
    svg.appendChild(nodeGroup);
    svg.appendChild(labelGroup);

    return svg;
}

/**
 * Create the Isomorphism visualization story.
 */
function createIsomorphismStory(args: IsomorphismArgs): HTMLElement {
    const { nodeCount, isIsomorphic, seed } = args;

    // Generate graph pair
    const { graph1, graph2 } = generateGraphPair(nodeCount, isIsomorphic, seed);
    const algoGraph1 = toAlgorithmGraph(graph1);
    const algoGraph2 = toAlgorithmGraph(graph2);

    // Check isomorphism using actual algorithm
    const result = isGraphIsomorphic(algoGraph1, algoGraph2);

    // Create main container
    const container = document.createElement("div");
    container.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 24px;
        font-family: system-ui, sans-serif;
    `;

    // Create graphs container (side by side)
    const graphsContainer = document.createElement("div");
    graphsContainer.style.cssText = `
        display: flex;
        gap: 24px;
        align-items: flex-start;
    `;

    // Graph 1
    const graph1Container = document.createElement("div");
    graph1Container.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
    `;
    const graph1Title = document.createElement("div");
    graph1Title.style.cssText = `
        font-weight: 600;
        margin-bottom: 8px;
        color: #3b82f6;
    `;
    graph1Title.textContent = "Graph G₁";
    const svg1 = createSvgContainer();
    renderGraph(svg1, graph1, 15);
    graph1Container.appendChild(graph1Title);
    graph1Container.appendChild(svg1);

    // Graph 2
    const graph2Container = document.createElement("div");
    graph2Container.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
    `;
    const graph2Title = document.createElement("div");
    graph2Title.style.cssText = `
        font-weight: 600;
        margin-bottom: 8px;
        color: #f59e0b;
    `;
    graph2Title.textContent = "Graph G₂";
    const svg2 = createSvgContainer();
    renderGraph(svg2, graph2, 15);

    // Color second graph differently
    const nodes2 = svg2.querySelectorAll("[data-node-id]");
    nodes2.forEach((node) => {
        (node as SVGCircleElement).setAttribute("fill", "#f59e0b");
        (node as SVGCircleElement).setAttribute("stroke", "#d97706");
    });

    graph2Container.appendChild(graph2Title);
    graph2Container.appendChild(svg2);

    graphsContainer.appendChild(graph1Container);
    graphsContainer.appendChild(graph2Container);
    container.appendChild(graphsContainer);

    // Create info panel
    const infoPanel = document.createElement("div");
    infoPanel.style.cssText = `
        margin-top: 16px;
        padding: 12px;
        background: #f1f5f9;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
        width: 100%;
        max-width: 480px;
    `;
    infoPanel.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">Graph Isomorphism</div>
        <div data-result style="margin-bottom: 8px; color: #475569; font-size: 14px;">Result: —</div>
        <div data-mapping style="font-size: 12px; color: #64748b;"></div>
    `;
    container.appendChild(infoPanel);

    // Create status panel
    const statusPanel = createStatusPanel();
    container.appendChild(statusPanel);
    updateStatus(statusPanel, "Click 'Check Isomorphism' to compare graphs");

    let isApplied = false;

    /**
     * Apply isomorphism check visualization.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;

        const resultEl = infoPanel.querySelector("[data-result]");
        const mappingEl = infoPanel.querySelector("[data-mapping]");

        if (resultEl) {
            if (result.isIsomorphic) {
                resultEl.innerHTML = `<span style="color: #22c55e; font-weight: 600;">✓ Graphs are isomorphic!</span>`;

                // Highlight nodes with matching colors based on mapping
                if (result.mapping) {
                    const colors = [
                        "#ef4444", "#f59e0b", "#22c55e", "#3b82f6",
                        "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
                    ];

                    let idx = 0;
                    for (const [node1, node2] of result.mapping) {
                        const color = colors[idx % colors.length];

                        const node1El = svg1.querySelector(`[data-node-id="${node1}"]`);
                        const node2El = svg2.querySelector(`[data-node-id="${node2}"]`);

                        if (node1El) {
                            (node1El as SVGCircleElement).setAttribute("fill", color);
                        }
                        if (node2El) {
                            (node2El as SVGCircleElement).setAttribute("fill", color);
                        }

                        idx++;
                    }

                    if (mappingEl) {
                        const mappingStr = Array.from(result.mapping.entries())
                            .map(([a, b]) => `${a}↔${String.fromCharCode(65 + (b as number))}`)
                            .join(", ");
                        mappingEl.textContent = `Mapping: ${mappingStr}`;
                    }
                }
            } else {
                resultEl.innerHTML = `<span style="color: #ef4444; font-weight: 600;">✗ Graphs are NOT isomorphic</span>`;

                if (mappingEl) {
                    mappingEl.textContent = "The graphs have different structures.";
                }
            }
        }

        updateStatus(statusPanel, result.isIsomorphic
            ? "Graphs are isomorphic - matching nodes are highlighted"
            : "Graphs are not isomorphic");
    }

    /**
     * Reset visualization.
     */
    function reset(): void {
        isApplied = false;

        // Reset graph 1 colors
        const nodes1 = svg1.querySelectorAll("[data-node-id]");
        nodes1.forEach((node) => {
            (node as SVGCircleElement).setAttribute("fill", "#6366f1");
            (node as SVGCircleElement).setAttribute("stroke", "#4338ca");
        });

        // Reset graph 2 colors
        const nodes2Reset = svg2.querySelectorAll("[data-node-id]");
        nodes2Reset.forEach((node) => {
            (node as SVGCircleElement).setAttribute("fill", "#f59e0b");
            (node as SVGCircleElement).setAttribute("stroke", "#d97706");
        });

        const resultEl = infoPanel.querySelector("[data-result]");
        if (resultEl) {
            resultEl.textContent = "Result: —";
            (resultEl as HTMLElement).style.color = "#475569";
        }

        const mappingEl = infoPanel.querySelector("[data-mapping]");
        if (mappingEl) {
            mappingEl.textContent = "";
        }

        updateStatus(statusPanel, "Click 'Check Isomorphism' to compare graphs");
    }

    // Add controls
    const controls = createSimpleAnimationControls(apply, reset, "Check Isomorphism");
    container.appendChild(controls);

    return container;
}

const meta: Meta<IsomorphismArgs> = {
    title: "Matching",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 3, max: 8, step: 1 },
            description: "Number of nodes in each graph",
        },
        isIsomorphic: {
            control: { type: "boolean" },
            description: "Generate isomorphic graphs",
        },
        seed: {
            control: { type: "number" },
            description: "Random seed for reproducible graphs",
        },
    },
    args: {
        nodeCount: 5,
        isIsomorphic: true,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<IsomorphismArgs>;

/**
 * Graph isomorphism story with before/after visualization.
 *
 * This story uses the actual `isGraphIsomorphic()` function from @graphty/algorithms.
 * Matching nodes are highlighted with the same color when graphs are isomorphic.
 */
export const Isomorphism: Story = {
    render: (args) => createIsomorphismStory(args),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        const checkButton = canvas.getByRole("button", { name: /check isomorphism/i });
        await userEvent.click(checkButton);

        await waitFor(
            async () => {
                const statusText = canvasElement.querySelector("[data-status]")?.textContent ?? "";
                await expect(statusText.toLowerCase()).toMatch(/isomorphic/);
            },
            { timeout: 5000 },
        );
    },
};
