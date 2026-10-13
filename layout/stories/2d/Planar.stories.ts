/**
 * Planar Layout Algorithm Story
 *
 * A planar graph that a force layout tangles -- a seeded random Apollonian network (a planar triangulation) -- drawn
 * by planar layout beside a seeded Fruchterman-Reingold force layout, with each drawing's edge-crossing count, so the
 * reader sees what planar layout guarantees. Below them, two non-planar graphs (K5 and the Petersen graph) that
 * planar layout refuses, with the reason it gives.
 *
 * IMPORTANT: This story uses the actual planar and fruchtermanReingold implementations
 * from @graphty/layout to demonstrate real package behavior.
 */

import type { SampleGraph } from "@graphty/graph-samples";
import { completeGraph, petersenGraph, randomApollonianGraph } from "@graphty/graph-samples/generators";
import { fruchtermanReingold, planar, type PositionMap, toPositionMap } from "@graphty/layout";
import type { Meta, StoryObj } from "@storybook/html-vite";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import { countCrossings } from "../utils/crossings.js";
import { type GeneratedGraph, generateRandomPositions, toSnapshot } from "../utils/graph-generators.js";
import {
    createAnimationControls,
    createInfoPanel,
    createStatusPanel,
    createStoryContainer,
    renderGraph,
    updateInfoPanel,
    updatePositions,
    updateStatus,
} from "../utils/visualization.js";

/**
 * Story arguments interface.
 */
interface PlanarArgs {
    nodeCount: number;
    seed: number;
}

/**
 * A graph-samples graph in the shape the story renderer draws.
 * @param g - the generated graph
 * @returns its nodes and edges
 */
function toGenerated(g: SampleGraph): GeneratedGraph {
    return {
        nodes: Array.from({ length: g.nodeCount }, (_, i) => ({ id: i, label: String(i), x: 0, y: 0 })),
        edges: Array.from(g.src, (s, e) => ({ source: s, target: g.dst[e] })),
    };
}

/**
 * How many edge pairs cross in a drawing.
 * @param graph - the graph
 * @param positions - where each node is drawn
 * @returns the count
 */
function crossingsOf(graph: GeneratedGraph, positions: PositionMap): number {
    const edges = graph.edges.map((e) => [e.source, e.target] as const);
    return countCrossings(edges, (n) => [positions[n][0], positions[n][1]]);
}

/**
 * One drawing with a heading and a line under it.
 * @param heading - what draws it
 * @returns the panel, its SVG and its caption line
 */
function createPanel(heading: string): { panel: HTMLDivElement; svg: SVGSVGElement; caption: HTMLDivElement } {
    const { container, svg } = createStoryContainer(500, 420);
    container.style.padding = "8px";
    const title = document.createElement("div");
    title.style.cssText = "font-weight:600;color:#1e293b;margin-bottom:6px;";
    title.textContent = heading;
    container.prepend(title);
    const caption = document.createElement("div");
    caption.setAttribute("data-crossings", "");
    caption.style.cssText = "margin-top:6px;font-size:14px;color:#475569;min-height:20px;";
    container.append(caption);
    return { panel: container, svg, caption };
}

/**
 * What planar layout says about a graph it cannot draw.
 * @param name - the graph's name
 * @param g - the graph
 * @returns one line: the graph and the layout's reason
 */
function refusal(name: string, g: SampleGraph): string {
    const words = `${name} (${g.nodeCount} nodes, ${g.src.length} edges)`;
    try {
        planar(toSnapshot(toGenerated(g)));
        return `${words}: drawn, which it should not be.`;
    } catch (e) {
        return `${words}: planar layout refuses it -- "${(e as Error).message}"`;
    }
}

/**
 * Create the Planar layout visualization story.
 */
function createPlanarStory(args: PlanarArgs): HTMLElement {
    const { nodeCount, seed } = args;

    const graph = toGenerated(randomApollonianGraph({ n: nodeCount, seed }));
    const snapshot = toSnapshot(graph);
    const randomPositions = generateRandomPositions(graph, 500, 420, seed);

    const planarPositions = toPositionMap(planar(snapshot, { center: [0, 0] }), snapshot.ids);
    const forcePositions = toPositionMap(fruchtermanReingold(snapshot, { center: [0, 0], dim: 2, seed }), snapshot.ids);

    const root = document.createElement("div");
    root.style.cssText =
        "display:flex;flex-direction:column;align-items:center;padding:16px;font-family:system-ui,sans-serif;";

    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:16px;";
    const left = createPanel("Planar layout");
    const right = createPanel(`Force layout (Fruchterman-Reingold, seed ${seed})`);
    row.append(left.panel, right.panel);
    root.append(row);

    const infoPanel = createInfoPanel("Planar Layout");
    infoPanel.style.maxWidth = "1000px";
    updateInfoPanel(
        infoPanel,
        `A ${nodeCount}-node random Apollonian network (seed ${seed}): a planar triangulation, so it can be drawn with ` +
            "no two edges crossing. Planar layout guarantees that drawing: no crossings, straight edges, nodes on a " +
            "grid. It does not space the nodes evenly: some crowd together and some edges run long. Use " +
            "it where crossings mislead the reader (circuits, maps, floor plans, meshes) or as a crossing-free " +
            "starting point for another layout. A graph that cannot be drawn without crossings is refused:",
    );
    const refusals = document.createElement("ul");
    refusals.setAttribute("data-refusals", "");
    refusals.style.cssText = "margin:8px 0 0;padding-left:20px;font-size:12px;color:#64748b;";
    for (const line of [refusal("K5", completeGraph({ n: 5 })), refusal("The Petersen graph", petersenGraph())]) {
        const item = document.createElement("li");
        item.textContent = line;
        refusals.append(item);
    }
    infoPanel.append(refusals);
    root.append(infoPanel);

    const statusPanel = createStatusPanel();
    root.append(statusPanel);

    let isApplied = false;

    /**
     * Draw both graphs at the same random positions.
     * @param message - the status line
     */
    function showRandom(message: string): void {
        for (const p of [left, right]) {
            renderGraph(p.svg, graph, randomPositions, 12, 1, 0, 0);
            p.caption.textContent = "";
        }
        updateStatus(statusPanel, message);
    }

    /**
     * Apply both layouts with animation, then show each drawing's crossing count.
     */
    function apply(): void {
        if (isApplied) {
            return;
        }
        isApplied = true;
        void Promise.all([
            updatePositions(left.svg, graph, planarPositions),
            updatePositions(right.svg, graph, forcePositions),
        ]).then(() => {
            const planarCount = crossingsOf(graph, planarPositions);
            const forceCount = crossingsOf(graph, forcePositions);
            left.caption.textContent = `${planarCount} edge crossings`;
            right.caption.textContent = `${forceCount} edge crossings`;
            updateStatus(
                statusPanel,
                `Layouts applied: planar draws ${planarCount} crossings, the force layout ${forceCount}.`,
            );
        });
    }

    /**
     * Reset to random positions.
     */
    function reset(): void {
        isApplied = false;
        showRandom("Reset to random positions. Click 'Apply Layout' to compare the two layouts.");
    }

    showRandom("Showing random initial positions. Click 'Apply Layout' to compare the two layouts.");
    root.append(createAnimationControls(apply, reset));

    return root;
}

const meta: Meta<PlanarArgs> = {
    title: "Layout2D",
    argTypes: {
        nodeCount: {
            control: { type: "range", min: 4, max: 40, step: 1 },
            description: "Number of nodes in the random Apollonian network",
        },
        seed: {
            control: { type: "number" },
            description: "Seed of the network and of the force layout",
        },
    },
    args: {
        nodeCount: 20,
        seed: 42,
    },
};

export default meta;

type Story = StoryObj<PlanarArgs>;

/**
 * Planar layout beside a force layout of the same planar graph, with their edge-crossing counts, and the non-planar
 * graphs planar layout refuses.
 *
 * This story uses the actual `planar()` and `fruchtermanReingold()` functions from @graphty/layout.
 * The play function animates from random positions to both arrangements.
 */
export const Planar: Story = {
    render: (args) => createPlanarStory(args),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await userEvent.click(canvas.getByRole("button", { name: /apply layout/i }));

        await waitFor(
            async () => {
                const statusText = canvasElement.querySelector("[data-status]")?.textContent ?? "";
                await expect(statusText).toContain("applied");
            },
            { timeout: 5000 },
        );

        const [planarCaption, forceCaption] = [...canvasElement.querySelectorAll("[data-crossings]")].map(
            (c) => c.textContent ?? "",
        );
        await expect(planarCaption).toBe("0 edge crossings");
        await expect(forceCaption).not.toBe("0 edge crossings");
        await expect(canvasElement.querySelector("[data-refusals]")?.textContent).toContain("G is not planar.");
    },
};
