// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import { InstancedMesh, Vector3 } from "@babylonjs/core";
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

/** Pajek's vertex shapes, shown in a story of their own. */
const PAJEK_SHAPES: readonly string[] = ["cross", "house", "man", "woman", "none"];

/** The flat shapes of Cytoscape, yEd, Graphviz and Gephi. */
const TOOL_SHAPES = FLAT_NODE_SHAPES.filter((shape) => !PAJEK_SHAPES.includes(shape));

/** Each flat shape as a node named after it. */
const SHAPE_NODES = grid(
    TOOL_SHAPES.map((shape) => ({ id: shape, shape })),
    4,
    4,
);

/** Each flat shape joined to the next, so every edge ends at a flat outline. */
const SHAPE_EDGES = TOOL_SHAPES.slice(1).map((shape, index) => ({ src: TOOL_SHAPES[index], dst: shape }));

/**
 * The flat shapes graph files name -- rectangle, rounded rectangle, ellipse, diamond, triangle,
 * the polygons, parallelogram, trapezoid, star and vee -- drawn flat in a 2D view, with each edge
 * ending at the outline it meets. Each node's shape is read from its own `shape` field.
 */
export const ShapesIn2D: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Node ShapesIn2D");

        await assertViewMode(scene, "2d");
        await assertGraphLoaded(scene, { nodes: TOOL_SHAPES.length, edges: SHAPE_EDGES.length });
        await assertShapeVariety(scene, TOOL_SHAPES.length);
    },
    args: {
        setup: storySetup({
            viewMode: "2d",
            node: { "node.color": "#5A67D8", "node.labelStyle": { sizePx: 20, color: "#000000" } },
            nodeEncode: {
                "node.shape": { by: "data.shape", scale: "passthrough" },
                "node.label": { by: "data.id", scale: "passthrough" },
            },
            // WITHOUT CORNERS A "polygon" IS A RECTANGLE, by the element's contract
            // (`node.shapePoints` unset falls back to the rectangle's outline), so the polygon
            // would draw the rectangle's exact geometry and the grid would show one shape twice.
            // An irregular four-cornered outline is what makes it a shape of its own.
            layers: [
                {
                    name: "Polygon corners",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'polygon'" },
                    set: { "node.shapePoints": "-1,-1 1,-0.6 0.6,1 -0.6,0.6" },
                },
            ],
        }),
        nodeData: SHAPE_NODES,
        edgeData: SHAPE_EDGES,
    },
};

/** Pajek's shapes on a row, each pointing at the next, and a man and a woman joined below. */
const PAJEK_NODES = grid(
    PAJEK_SHAPES.map((shape) => ({ id: shape, shape })),
    PAJEK_SHAPES.length,
    6,
);

/** Each Pajek shape's arc to the next. */
const PAJEK_EDGES = PAJEK_SHAPES.slice(1).map((shape, index) => ({ src: PAJEK_SHAPES[index], dst: shape }));

/**
 * Pajek's vertex shapes -- a plus-shaped cross, a house, the man and woman figures of its
 * genealogies, and `none`, a node with no body that draws only its label (Pajek's `empty`) --
 * joined by arcs whose arrowheads sit half-way along the line (`edge.arrowHeadPosition` 0.5, Pajek's
 * `ap 0.5`) rather than at the node.
 */
export const PajekShapesAndMidLineArrows: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Node PajekShapesAndMidLineArrows");

        await assertViewMode(scene, "2d");
        await assertGraphLoaded(scene, { nodes: PAJEK_SHAPES.length, edges: PAJEK_EDGES.length });
        await assertShapeVariety(scene, PAJEK_SHAPES.length);

        const bodiless = scene.graph.getNode("none")?.mesh;
        const sourceOf = bodiless instanceof InstancedMesh ? bodiless.sourceMesh : bodiless;
        await holds(
            sourceOf?.getTotalIndices() === 0,
            `Styles/Node PajekShapesAndMidLineArrows: the node of shape "none" draws ${String(sourceOf?.getTotalIndices())} indices`,
        );

        // Every line meets both its nodes' outlines -- a node with no body included, at its box.
        const unmet = [...scene.graph.getDataManager().edges.values()].filter((edge) => {
            const { srcPoint, dstPoint } = edge.getInterceptPoints();
            return srcPoint === null || dstPoint === null;
        });
        await holds(
            unmet.length === 0,
            `Styles/Node PajekShapesAndMidLineArrows: ${String(unmet.length)} lines do not meet both their nodes`,
        );

        // Every arrowhead sits near the middle of its line, not at the target node.
        const offMiddle = [...scene.graph.getDataManager().edges.values()].filter((edge) => {
            const cap = edge.arrowCap?.position;
            const src = edge.srcNode.mesh.position;
            const dst = edge.dstNode.mesh.position;
            const middle = src.add(dst).scale(0.5);
            return cap === undefined || Vector3.Distance(cap, middle) > Vector3.Distance(src, dst) / 4;
        });
        await holds(
            offMiddle.length === 0,
            `Styles/Node PajekShapesAndMidLineArrows: ${String(offMiddle.length)} arrowheads are not near the middle of their line`,
        );
    },
    args: {
        setup: storySetup({
            viewMode: "2d",
            node: {
                "node.color": "#5A67D8",
                "node.size": 2,
                "node.labelStyle": { sizePx: 20, color: "#000000", location: "bottom" },
            },
            nodeEncode: {
                "node.shape": { by: "data.shape", scale: "passthrough" },
                "node.label": { by: "data.id", scale: "passthrough" },
            },
            edge: { "edge.arrowHeadPosition": 0.5, "edge.color": "#333333" },
        }),
        nodeData: PAJEK_NODES,
        edgeData: PAJEK_EDGES,
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

/**
 * Nodes that grow to hold their labels, as Graphviz and vis-network draw them: one row per way of
 * fitting, each with a short, a middling and a long label.
 */
const LABEL_FIT_NODES = grid(
    [
        ["ellipse", "inside", false],
        ["rectangle", "inside", false],
        ["diamond", "inside", false],
        ["round-rectangle", "bounds", false],
        ["ellipse", "bounds", true],
    ].flatMap(([shape, fit, square]) =>
        ["A", "Middling", "A much longer label"].map((text) => ({
            id: `${String(shape)} ${String(fit)}${square === true ? " square" : ""}: ${text}`,
            label: text,
            shape,
            fit,
            square,
        })),
    ),
    3,
    5,
);

/**
 * `node.labelFit` grows a node to hold its label: its size is the least it is drawn at, and its
 * label's box, padded by `node.labelPaddingX` and `node.labelPaddingY`, decides the rest. "inside"
 * fits the box inside the outline, as Graphviz does, so the ellipse and the diamond reach past its
 * corners; "bounds" makes the padded box the node's width and height, as vis-network does; and
 * `node.labelFitSquare` keeps the last row round.
 */
export const LabelFit: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Node LabelFit");

        await assertGraphLoaded(scene, { nodes: LABEL_FIT_NODES.length, edges: 0 });

        const width = (id: string): number =>
            scene.graph.getNode(id)?.mesh.getBoundingInfo().boundingBox.extendSize.x ?? 0;
        const rows = LABEL_FIT_NODES.filter((_node, index) => index % 3 === 0);
        const narrow = rows.filter((row, index) => {
            const longer = LABEL_FIT_NODES[index * 3 + 2];
            return !(width(longer.id) > 2 * width(row.id));
        });

        await holds(
            narrow.length === 0,
            `Styles/Node LabelFit: a long label's node is not twice as wide as its row's shortest: ${narrow.map((row) => row.id).join(", ")}`,
        );
    },
    args: {
        setup: storySetup({
            viewMode: "2d",
            node: {
                "node.color": "#FBD38D",
                "node.borderWidth": 0.05,
                "node.borderColor": "#7B341E",
                "node.size": 0.6,
                "node.labelPaddingX": 0.2,
                "node.labelPaddingY": 0.1,
                "node.labelStyle": { location: "center", sizePx: 24, color: "#000000" },
            },
            nodeEncode: {
                "node.shape": { by: "data.shape", scale: "passthrough" },
                "node.labelFit": { by: "data.fit", scale: "passthrough" },
                "node.labelFitSquare": { by: "data.square", scale: "passthrough" },
                "node.label": { by: "data.label", scale: "passthrough" },
            },
        }),
        nodeData: LABEL_FIT_NODES,
        edgeData: [],
    },
};
