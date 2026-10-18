/**
 * @file The simple tier's layout verb, live: the custom layouts guide's first example
 * (docs/examples/simple-tier/layout-tiers.ts, rows by a tier attribute) registered on the page with
 * `defineLayout` and then chosen by name through the element's `layout` property, exactly as a
 * built-in layout is chosen.
 */

import "../../index.ts";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { assertGraphLoaded, drawn, holds } from "../assertions";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup, waitForGraphSettled } from "../helpers";

/** A small org chart: one lead, three managers, five staff. */
const NODES = [
    { id: "a", tier: 0 },
    { id: "b", tier: 1 },
    { id: "c", tier: 1 },
    { id: "d", tier: 1 },
    { id: "e", tier: 2 },
    { id: "f", tier: 2 },
    { id: "g", tier: 2 },
    { id: "h", tier: 2 },
    { id: "i", tier: 2 },
];

const EDGES = [
    { src: "a", dst: "b" },
    { src: "a", dst: "c" },
    { src: "a", dst: "d" },
    { src: "b", dst: "e" },
    { src: "b", dst: "f" },
    { src: "c", dst: "g" },
    { src: "d", dst: "h" },
    { src: "d", dst: "i" },
];

/**
 * The gap between rows and columns. At the guide's 3, unit-sized nodes fill a third of each gap
 * and the framed graph is mostly node; at 8 it reads as rows of nodes like every other story.
 */
const SPACING = 8;

/** Where the guide's layout puts each node, in gaps: one row per tier, columns in id order. */
const EXPECTED: Readonly<Record<string, readonly [number, number]>> = {
    a: [0, 0],
    b: [0, SPACING],
    c: [SPACING, SPACING],
    d: [2 * SPACING, SPACING],
    e: [0, 2 * SPACING],
    f: [SPACING, 2 * SPACING],
    g: [2 * SPACING, 2 * SPACING],
    h: [3 * SPACING, 2 * SPACING],
    i: [4 * SPACING, 2 * SPACING],
};

const meta: Meta<StoryArgs> = {
    title: "Extending/Custom layout",
    // The component id from before the section was retitled, so every story id (and its
    // approved screenshot) stays the same.
    id: "extending-simple-tier-layout",
    component: "graphty-element",
    tags: ["autodocs"],
    parameters: {
        docs: {
            description: {
                component:
                    "A layout of your own: `defineLayout({ id, place })` from `@graphty/graphty-element/extend` " +
                    "registers a function that answers with a position for each node, and the element's `layout` " +
                    "property chooses it by name, like a built-in layout. Here a small org chart is placed in rows " +
                    "by each node's `tier` attribute. For a simulation the element steps frame by frame, see " +
                    "Extending / Advanced / Iterative layout engine and " +
                    "[Custom layouts](https://graphty.app/docs/graphty-element/guide/extending/custom-layouts).",
            },
            source: {
                language: "html",
                code: `<graphty-element id="graph" layout="acme-tiers" layout-config='{"spacing": 8}' view-mode="2d"></graphty-element>

<script type="module">
    import { defineLayout } from "@graphty/graphty-element/extend";

    defineLayout({
        id: "acme-tiers",
        dimensions: 2,
        options: { tier: { type: "attribute", default: "tier" }, spacing: 2 },
        place(graph, { options }) {
            const positions = new Map();
            const used = new Map();
            for (const node of graph.nodes()) {
                const tier = node.number(options.tier);
                if (tier === undefined) continue; // no tier: left unplaced
                const column = used.get(tier) ?? 0;
                used.set(tier, column + 1);
                positions.set(node.id, [column * options.spacing, tier * options.spacing]);
            }
            return positions;
        },
    });

    const graph = document.getElementById("graph");
    graph.nodeData = [{ id: "a", tier: 0 }, { id: "b", tier: 1 }, { id: "c", tier: 1 }, { id: "d", tier: 1 },
        { id: "e", tier: 2 }, { id: "f", tier: 2 }, { id: "g", tier: 2 }, { id: "h", tier: 2 }, { id: "i", tier: 2 }];
    graph.edgeData = [["a", "b"], ["a", "c"], ["a", "d"], ["b", "e"], ["b", "f"], ["c", "g"], ["d", "h"], ["d", "i"]]
        .map(([source, target]) => ({ source, target }));
</script>`,
            },
        },
    },
    render: renderFn,
    decorators: [eventWaitingDecorator],
    // The guide's example registers itself when it is imported: this is the plugin running live.
    loaders: [
        async () => {
            await import("../../docs/examples/simple-tier/layout-tiers");
            return {};
        },
    ],
};
export default meta;

type Story = StoryObj<StoryArgs>;

export const RowsByTier: Story = {
    name: "Rows by tier",
    args: {
        setup: storySetup({ viewMode: "2d" }),
        nodeData: NODES,
        edgeData: EDGES,
        layout: "acme-tiers",
        layoutConfig: { spacing: SPACING },
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
        const scene = await drawn(canvasElement, "Extending/Simple tier/Layout RowsByTier");
        await assertGraphLoaded(scene, { nodes: NODES.length, edges: EDGES.length });

        const misplaced = scene.nodes
            .filter((node) => {
                const [x, y] = EXPECTED[node.id] ?? [Number.NaN, Number.NaN];
                const [px, py, pz] = node.position;
                return Math.abs(px - x) > 1e-3 || Math.abs(py - y) > 1e-3 || Math.abs(pz) > 1e-3;
            })
            .map((node) => `${node.id} at (${node.position.join(", ")})`);
        await holds(
            misplaced.length === 0,
            `every node sits on its tier's row, where place() put it; misplaced: ${misplaced.join("; ")}`,
        );
    },
};
