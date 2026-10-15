// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { FLAT_NODE_SHAPES, NodeBorderStyles } from "../src/config/NodeStyle";
import { assertGraphLoaded, assertShapeVariety, assertViewMode, drawn, holds, pixelsOfColour } from "./assertions";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup } from "./helpers";

const meta: Meta = {
    title: "Styles/Node",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator],
    parameters: {
        chromatic: {
            delay: 500,
        },
    },
    args: {
        setup: storySetup({}),
        layout: "fixed",
        layoutConfig: {},
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/** A node at a fixed place: a record, so the element takes it as node data. */
type Placed = Record<string, unknown> & { id: string; position: { x: number; y: number; z: number } };

/**
 * Nodes on a grid, left to right and top to bottom, each carrying its own fields.
 * @param rows - The nodes' data, in reading order; each needs an id.
 * @param columns - How many to a row.
 * @param spacing - How far apart they are.
 * @returns The nodes with their places.
 */
function grid(rows: readonly Record<string, unknown>[], columns: number, spacing: number): Placed[] {
    return rows.map((row, index) => ({
        ...row,
        id: String(row.id),
        position: {
            x: ((index % columns) - (columns - 1) / 2) * spacing,
            y: -Math.floor(index / columns) * spacing,
            z: 0,
        },
    }));
}

/** Each flat shape as a node named after it. */
const SHAPE_NODES = grid(
    FLAT_NODE_SHAPES.map((shape) => ({ id: shape, shape })),
    4,
    4,
);

/** Each flat shape joined to the next, so every edge ends at a flat outline. */
const SHAPE_EDGES = FLAT_NODE_SHAPES.slice(1).map((shape, index) => ({ src: FLAT_NODE_SHAPES[index], dst: shape }));

/**
 * The flat shapes graph files name -- rectangle, rounded rectangle, ellipse, diamond, triangle,
 * the polygons, parallelogram, trapezoid, star and vee -- drawn flat in a 2D view, with each edge
 * ending at the outline it meets. Each node's shape is read from its own `shape` field.
 */
export const ShapesIn2D: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Node ShapesIn2D");

        await assertViewMode(scene, "2d");
        await assertGraphLoaded(scene, { nodes: FLAT_NODE_SHAPES.length, edges: SHAPE_EDGES.length });
        await assertShapeVariety(scene, FLAT_NODE_SHAPES.length);
    },
    args: {
        setup: storySetup({
            viewMode: "2d",
            node: { "node.color": "#5A67D8", "node.labelStyle": { sizePx: 20, color: "#000000" } },
            nodeEncode: {
                "node.shape": { by: "data.shape", scale: "passthrough" },
                "node.label": { by: "data.id", scale: "passthrough" },
            },
        }),
        nodeData: SHAPE_NODES,
        edgeData: SHAPE_EDGES,
    },
};

/**
 * The same flat shapes in a 3D view with `node.planar` set, so each is drawn as a thin card
 * rather than a solid as deep as it is wide.
 */
export const PlanarShapes: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Node PlanarShapes");

        await assertViewMode(scene, "3d");
        await assertGraphLoaded(scene, { nodes: FLAT_NODE_SHAPES.length, edges: SHAPE_EDGES.length });
        await assertShapeVariety(scene, FLAT_NODE_SHAPES.length);
    },
    args: {
        setup: storySetup({
            viewMode: "3d",
            node: { "node.color": "#5A67D8", "node.planar": true },
            nodeEncode: { "node.shape": { by: "data.shape", scale: "passthrough" } },
        }),
        nodeData: SHAPE_NODES,
        edgeData: SHAPE_EDGES,
    },
};

/** The border widths shown, in the units of node size, one column each. */
const BORDER_WIDTHS = [0.05, 0.1, 0.2, 0.4] as const;

/** One node per border style and width: a row per style, a column per width. */
const BORDER_NODES = grid(
    NodeBorderStyles.options.flatMap((style) =>
        BORDER_WIDTHS.map((width) => ({ id: `${style}-${String(width)}`, style, width })),
    ),
    BORDER_WIDTHS.length,
    5,
);

/**
 * Node borders in every line style -- solid, dashed, dotted and double -- at four widths, drawn
 * outside each node's fill. The widths are in the units of node size, so a border scales with its
 * node.
 */
export const BorderWidthsAndStyles: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Node BorderWidthsAndStyles");

        await assertGraphLoaded(scene, { nodes: BORDER_NODES.length, edges: 0 });

        const bordered = scene.nodes.filter((node) => (scene.graph.getNode(node.id)?.borderReach ?? 0) > 0);

        await holds(
            bordered.length === BORDER_NODES.length,
            `Styles/Node BorderWidthsAndStyles: ${String(bordered.length)} of ${String(BORDER_NODES.length)} nodes have a border`,
        );
        await holds(
            (await pixelsOfColour(scene, "#1a202c")) > 500,
            "Styles/Node BorderWidthsAndStyles: borders are drawn",
        );
    },
    args: {
        setup: storySetup({
            viewMode: "2d",
            node: {
                "node.shape": "round-rectangle",
                "node.size": 2,
                "node.color": "#90CDF4",
                "node.borderColor": "#1A202C",
            },
            nodeEncode: {
                "node.borderStyle": { by: "data.style", scale: "passthrough" },
                "node.borderWidth": { by: "data.width", scale: "passthrough" },
            },
        }),
        nodeData: BORDER_NODES,
        edgeData: [],
    },
};

/** Nodes whose width and height differ, as diagram files size them to their labels. */
const EXTENT_NODES = grid(
    [
        { id: "wide", shape: "round-rectangle", width: 5, height: 1 },
        { id: "label-sized", shape: "round-rectangle", width: 2.6, height: 1 },
        { id: "tall", shape: "rectangle", width: 0.8, height: 3 },
        { id: "oval", shape: "ellipse", width: 3, height: 1.2 },
        { id: "bar", shape: "rectangle", width: 6, height: 0.4 },
        { id: "lozenge", shape: "diamond", width: 3, height: 1.5 },
    ],
    2,
    9,
);

/**
 * Nodes wider than they are tall and taller than they are wide, set with `node.width` and
 * `node.height`, with edges ending at their sides.
 */
export const WidthAndHeight: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Node WidthAndHeight");

        await assertGraphLoaded(scene, { nodes: EXTENT_NODES.length, edges: EXTENT_NODES.length - 1 });

        const square = scene.nodes.filter((node) => {
            const mesh = scene.graph.getNode(node.id)?.mesh;
            const extent = mesh?.getBoundingInfo().boundingBox.extendSize;

            return extent === undefined || Math.abs(extent.x - extent.y) < 1e-6;
        });

        await holds(
            square.length === 0,
            `Styles/Node WidthAndHeight: every node is wider or taller than it is square, and these are not: ${square.map((node) => node.id).join(", ")}`,
        );
    },
    args: {
        setup: storySetup({
            viewMode: "2d",
            node: { "node.color": "#68D391", "node.borderWidth": 0.05, "node.borderColor": "#22543D" },
            nodeEncode: {
                "node.shape": { by: "data.shape", scale: "passthrough" },
                "node.width": { by: "data.width", scale: "passthrough" },
                "node.height": { by: "data.height", scale: "passthrough" },
                "node.label": { by: "data.id", scale: "passthrough" },
            },
        }),
        nodeData: EXTENT_NODES,
        edgeData: EXTENT_NODES.slice(1).map(({ id }, index) => ({ src: EXTENT_NODES[index].id, dst: id })),
    },
};
