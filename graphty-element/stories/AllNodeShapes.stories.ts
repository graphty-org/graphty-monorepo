// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { LayerSpec } from "../src/catalog/types";
import { assertGraphLoaded, assertLabelsDrawn, assertLayerPainted, assertShapeVariety, drawn } from "./assertions";
import { eventWaitingDecorator, nodeShapes, renderFn, type StoryArgs, storySetup } from "./helpers";

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

// Generate node data for all shapes in a 5x5 grid with 3D depth
const generateNodeData = (): { id: string; position: { x: number; y: number; z: number } }[] => {
    const nodes: { id: string; position: { x: number; y: number; z: number } }[] = [];
    const spacing = 4;
    const cols = 5;

    nodeShapes.forEach((shape, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        nodes.push({
            id: shape,
            position: {
                x: (col - 2) * spacing, // Center around origin (-8 to 8)
                y: (2 - row) * spacing, // Top to bottom (8 to -8)
                z: (2 - row) * 2, // Add depth for 3D effect
            },
        });
    });

    return nodes;
};

/**
 * One layer per shape: the node with that id is drawn in that shape and named by its own label.
 *
 * WHERE THE LABEL SITS is no longer part of this. The 1.x version of these layers put the name
 * above the node with a half-node offset; a style layer can say what a label SAYS and how it is
 * lettered, and nothing about where it is placed, so each name is now drawn wherever the label
 * renderer puts it.
 * @returns One layer per shape, in the order the shapes are listed.
 */
const generateLayers = (): LayerSpec[] => {
    return nodeShapes.map((shape) => ({
        name: `Shape - ${shape}`,
        target: "node" as const,
        selector: { match: "expression" as const, where: `data.id == '${shape}'` },
        set: {
            "node.shape": shape,
            "node.label": shape,
            "node.labelStyle": { sizePx: 24, color: "#000000" },
        },
    }));
};

/**
 * All Node Shapes - Comprehensive showcase of all 24 available node shapes.
 * Each node is labeled with its configuration name.
 * Arranged in a 5x5 grid for easy visual comparison.
 */
export const AllNodeShapes: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Node AllNodeShapes");

        await assertGraphLoaded(scene, { nodes: nodeShapes.length, edges: 0 });

        // ONE SOURCE MESH PER SHAPE, read off the scene. Two nodes are the same shape when and
        // only when they are instanced from the same mesh, so a grid that promises 24 shapes and
        // draws one sphere 24 times reads back here as one -- whatever the style model reports.
        await assertShapeVariety(scene, nodeShapes.length);

        // Each shape's layer names exactly one node, and each node is captioned with its shape.
        for (const shape of nodeShapes) {
            await assertLayerPainted(scene, `Shape - ${shape}`, { nodes: 1 });
        }

        await assertLabelsDrawn(scene);
    },
    args: {
        setup: storySetup({
            viewMode: "3d",
            startingCameraDistance: 30,
            node: { "node.color": "#5A67D8" },
            layers: generateLayers(),
        }),
        nodeData: generateNodeData(),
        edgeData: [],
    },
    parameters: {
        chromatic: {
            delay: 1000,
        },
    },
};
