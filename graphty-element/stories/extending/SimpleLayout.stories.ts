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

/** Where the guide's layout puts each node at spacing 3: one row per tier, columns in id order. */
const EXPECTED: Readonly<Record<string, readonly [number, number]>> = {
    a: [0, 0],
    b: [0, 3],
    c: [3, 3],
    d: [6, 3],
    e: [0, 6],
    f: [3, 6],
    g: [6, 6],
    h: [9, 6],
    i: [12, 6],
};

const meta: Meta<StoryArgs> = {
    title: "Extending/Simple tier/Layout",
    component: "graphty-element",
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
    args: {
        setup: storySetup({ viewMode: "2d" }),
        nodeData: NODES,
        edgeData: EDGES,
        layout: "acme-tiers",
        layoutConfig: { spacing: 3 },
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
