import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { Graphty } from "../src/graphty-element";
import { eventWaitingDecorator, renderFn, type StoryArgs, storySetup } from "./helpers";

// Simple test data: 5 nodes, 6 edges - positioned close together in 3D space
const simpleNodeData = [
    { id: "A", type: "primary", position: { x: 0, y: 2, z: 0 } },
    { id: "B", type: "secondary", position: { x: -2, y: 0, z: 0 } },
    { id: "C", type: "primary", position: { x: 2, y: 0, z: 0 } },
    { id: "D", type: "secondary", position: { x: 0, y: -2, z: 0 } },
    { id: "E", type: "tertiary", position: { x: 0, y: 0, z: 2 } },
];

const simpleEdgeData = [
    { src: "A", dst: "B", weight: 1 },
    { src: "A", dst: "C", weight: 2 },
    { src: "B", dst: "D", weight: 1 },
    { src: "C", dst: "D", weight: 2 },
    { src: "D", dst: "E", weight: 1 },
    { src: "E", dst: "A", weight: 2 },
];

const meta: Meta = {
    title: "Styles/Layered",
    component: "graphty-element",
    render: renderFn,
    decorators: [eventWaitingDecorator],
    parameters: {
        chromatic: {
            delay: 500,
        },
    },
    args: {
        nodeData: simpleNodeData,
        edgeData: simpleEdgeData,
        layout: "fixed",
        layoutConfig: {
            dim: 3,
        },
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/**
 * Two layers setting different node colors based on node type.
 * Layer 1: primary nodes -> red
 * Layer 2: secondary nodes -> blue
 */
export const TwoLayerNodeColors: Story = {
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "nodes where data.type == 'primary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'primary'" },
                    set: { "node.color": "red" },
                },
                {
                    name: "nodes where data.type == 'secondary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'secondary'" },
                    set: { "node.color": "blue" },
                },
            ],
        }),
    },
};

/**
 * Two layers: one sets shape, another sets color.
 * Layer 1: primary nodes -> box shape
 * Layer 2: secondary nodes -> green color
 */
export const ShapeAndColorLayers: Story = {
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "nodes where data.type == 'primary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'primary'" },
                    set: { "node.shape": "box" },
                },
                {
                    name: "nodes where data.type == 'secondary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'secondary'" },
                    set: { "node.color": "green" },
                },
            ],
        }),
    },
};

/**
 * Three layers setting different node sizes.
 * Layer 1: node A -> large (size 2)
 * Layer 2: node B and C -> medium (size 1.5)
 * Layer 3: node E -> small (size 0.5)
 */
export const ThreeLayerSizes: Story = {
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "nodes where data.id == 'A'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'A'" },
                    set: { "node.size": 2 },
                },
                {
                    name: "nodes where data.id == 'B' || data.id == 'C'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'B' || data.id == 'C'" },
                    set: { "node.size": 1.5 },
                },
                {
                    name: "nodes where data.id == 'E'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'E'" },
                    set: { "node.size": 0.5 },
                },
            ],
        }),
    },
};

/**
 * Two layers setting different edge widths based on weight.
 * Layer 1: weight == 1 -> thin (0.1)
 * Layer 2: weight == 2 -> thick (0.5)
 */
export const EdgeWidthLayers: Story = {
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "edges where data.weight == `1`",
                    target: "edge",
                    selector: { match: "expression", where: "data.weight == `1`" },
                    set: { "edge.width": 0.1 },
                },
                {
                    name: "edges where data.weight == `2`",
                    target: "edge",
                    selector: { match: "expression", where: "data.weight == `2`" },
                    set: { "edge.width": 0.5 },
                },
            ],
        }),
    },
};

/**
 * Three layers setting different arrow head types.
 * Layer 1: weight == 1 -> sphere-dot arrows
 * Layer 2: weight == 2 -> diamond arrows
 * Layer 3: all edges -> specific arrow color
 */
export const ArrowHeadStyles: Story = {
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "edges where data.weight == `1`",
                    target: "edge",
                    selector: { match: "expression", where: "data.weight == `1`" },
                    set: { "edge.arrowHead": "sphere-dot" },
                },
                {
                    name: "edges where data.weight == `2`",
                    target: "edge",
                    selector: { match: "expression", where: "data.weight == `2`" },
                    set: { "edge.arrowHead": "diamond" },
                },
                {
                    name: "every edge",
                    target: "edge",
                    selector: { match: "everything" },
                    set: { "edge.arrowHead": "normal" },
                },
            ],
        }),
    },
};

/**
 * Four layers combining node shape, size, and color.
 * Layer 1: primary -> red
 * Layer 2: secondary -> blue
 * Layer 3: tertiary -> yellow + cylinder shape
 * Layer 4: node A -> extra large
 */
export const MixedNodeProperties: Story = {
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "nodes where data.type == 'primary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'primary'" },
                    set: { "node.color": "red" },
                },
                {
                    name: "nodes where data.type == 'secondary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'secondary'" },
                    set: { "node.color": "blue" },
                },
                {
                    name: "nodes where data.type == 'tertiary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'tertiary'" },
                    set: { "node.color": "yellow", "node.shape": "cylinder" },
                },
                {
                    name: "nodes where data.id == 'A'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'A'" },
                    set: { "node.size": 2.5 },
                },
            ],
        }),
    },
};

/**
 * Two layers setting edge colors based on weight.
 * Layer 1: weight == 1 -> green edges
 * Layer 2: weight == 2 -> red edges
 */
export const EdgeColorVariations: Story = {
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "edges where data.weight == `1`",
                    target: "edge",
                    selector: { match: "expression", where: "data.weight == `1`" },
                    set: { "edge.color": "green", "edge.arrowHead": "normal" },
                },
                {
                    name: "edges where data.weight == `2`",
                    target: "edge",
                    selector: { match: "expression", where: "data.weight == `2`" },
                    set: { "edge.color": "red", "edge.arrowHead": "normal" },
                },
            ],
        }),
    },
};

/**
 * Three layers setting different opacity levels.
 * Layer 1: node A -> 30% opacity
 * Layer 2: nodes B and C -> 60% opacity
 * Layer 3: nodes D and E -> 90% opacity
 */
export const OpacityLayers: Story = {
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "nodes where data.id == 'A'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'A'" },
                    set: { "node.color": "#FF0000", "node.opacity": 0.3 },
                },
                {
                    name: "nodes where data.id == 'B' || data.id == 'C'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'B' || data.id == 'C'" },
                    set: { "node.color": "#00FF00", "node.opacity": 0.6 },
                },
                {
                    name: "nodes where data.id == 'D' || data.id == 'E'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'D' || data.id == 'E'" },
                    set: { "node.color": "#0000FF", "node.opacity": 0.9 },
                },
            ],
        }),
    },
};

/**
 * Two layers with wireframe effect on some nodes.
 * Layer 1: primary nodes -> wireframe enabled + red
 * Layer 2: secondary nodes -> solid blue
 */
export const WireframeEffectLayers: Story = {
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "nodes where data.type == 'primary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'primary'" },
                    set: { "node.color": "red", "node.wireframe": true },
                },
                {
                    name: "nodes where data.type == 'secondary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'secondary'" },
                    set: { "node.color": "blue" },
                },
            ],
        }),
    },
};

/**
 * Complex multi-property layers testing precedence.
 * Layer 1: All nodes -> green, size 1
 * Layer 2: primary -> red (overrides green)
 * Layer 3: node A -> box shape + size 2 (overrides size 1)
 * Layer 4: secondary -> sphere shape
 */
export const ComplexMultiProperty: Story = {
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "every node",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.color": "green", "node.size": 1 },
                },
                {
                    name: "nodes where data.type == 'primary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'primary'" },
                    set: { "node.color": "red" },
                },
                {
                    name: "nodes where data.id == 'A'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'A'" },
                    set: { "node.shape": "box", "node.size": 2 },
                },
                {
                    name: "nodes where data.type == 'secondary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'secondary'" },
                    set: { "node.shape": "sphere" },
                },
            ],
        }),
    },
};

/**
 * Two layers enabling labels on specific nodes.
 * Layer 1: primary nodes -> labels enabled showing node ID
 * Layer 2: node E -> label enabled showing "E" in RED color
 */
export const LabelEnabledLayers: Story = {
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "nodes where data.type == 'primary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'primary'" },
                    encode: { "node.label": { by: "data.id", scale: "passthrough" } },
                },
                {
                    name: "nodes where data.id == 'E'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'E'" },
                    set: { "node.labelStyle": { color: "red" } },
                    encode: { "node.label": { by: "data.id", scale: "passthrough" } },
                },
            ],
        }),
    },
};

/**
 * Three layers with different arrow sizes and edge styling.
 * Layer 1: weight == 1 -> small arrows (0.5)
 * Layer 2: weight == 2 -> large arrows (2.0)
 * Layer 3: edges from A -> special color
 */
export const ArrowSizeVariations: Story = {
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "edges where data.weight == `1`",
                    target: "edge",
                    selector: { match: "expression", where: "data.weight == `1`" },
                    set: { "edge.arrowHead": "normal" },
                },
                {
                    name: "edges where data.weight == `2`",
                    target: "edge",
                    selector: { match: "expression", where: "data.weight == `2`" },
                    set: { "edge.arrowHead": "normal" },
                },
                {
                    name: "edges where data.src == 'A'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'A'" },
                    set: { "edge.color": "purple", "edge.arrowHead": "normal" },
                },
            ],
        }),
    },
};

/**
 * Two layers combining node shapes with multiple properties.
 * Layer 1: primary -> tetrahedron + red
 * Layer 2: secondary -> octahedron + blue
 */
export const ShapeVariationsWithColor: Story = {
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "nodes where data.type == 'primary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'primary'" },
                    set: { "node.color": "red", "node.shape": "tetrahedron" },
                },
                {
                    name: "nodes where data.type == 'secondary'",
                    target: "node",
                    selector: { match: "expression", where: "data.type == 'secondary'" },
                    set: { "node.color": "blue", "node.shape": "octahedron" },
                },
            ],
        }),
    },
};

/**
 * Axis-aligned colored spheres demonstrating 3D coordinate system.
 * This is useful for debugging 3D positioning and camera angles.
 * - Origin (0,0,0): Tiny black sphere
 * - X-axis (5,0,0): Large red sphere
 * - Y-axis (0,5,0): Large green sphere
 * - Z-axis (0,0,5): Large blue sphere
 *
 * Edges connect origin to each axis node.
 * Colors match BabylonJS AxesViewer convention (Red=X, Green=Y, Blue=Z).
 */
export const AxisAlignedColoredSpheres: Story = {
    args: {
        nodeData: [
            { id: "origin", position: { x: 0, y: 0, z: 0 } },
            { id: "x-axis", position: { x: 5, y: 0, z: 0 } },
            { id: "y-axis", position: { x: 0, y: 5, z: 0 } },
            { id: "z-axis", position: { x: 0, y: 0, z: 5 } },
        ],
        edgeData: [
            { src: "origin", dst: "x-axis" },
            { src: "origin", dst: "y-axis" },
            { src: "origin", dst: "z-axis" },
        ],
        layout: "fixed",
        layoutConfig: {
            dim: 3,
        },
        setup: storySetup({
            layers: [
                {
                    name: "nodes where data.id == 'origin'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'origin'" },
                    set: { "node.color": "black", "node.size": 0.5 },
                },
                {
                    name: "nodes where data.id == 'x-axis'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'x-axis'" },
                    set: { "node.color": "red", "node.size": 1.5 },
                },
                {
                    name: "nodes where data.id == 'y-axis'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'y-axis'" },
                    set: { "node.color": "green", "node.size": 1.5 },
                },
                {
                    name: "nodes where data.id == 'z-axis'",
                    target: "node",
                    selector: { match: "expression", where: "data.id == 'z-axis'" },
                    set: { "node.color": "blue", "node.size": 1.5 },
                },
            ],
        }),
    },
};
