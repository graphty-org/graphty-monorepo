/**
 * The scene presets (design/rendering/shader-styles.md section 7.5): the Nebula background.
 *
 * The story sets its shader the way a consumer does: the nebula as the element's background
 * (`element.background`). The nodes are three communities, each a hub and two separate subgroups,
 * colored by community from a layer beneath. The controls are the preset's parameters.
 *
 * The nebula drifts; in a visual capture their motion is switched off with
 * the reader's own setting (`shaderSettings.motion`), and the frame guard (`shaderSettings.guard`),
 * which steps heavy shaders off on a slow software GPU at no fixed frame, is off too, so the picture
 * is the same on every run.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { ShaderDescriptor } from "../../src/catalog/shaders";
import type { Graphty } from "../../src/graphty-element";
import { assertGraphLoaded, assertNodesInFromEdges, drawn } from "../assertions";
import { eventWaitingDecorator, isVisualCapture, waitForGraphSettled } from "../helpers";
import { presetControls, presetParams } from "./presetControls";
import { presetId, SCENE_PRESETS } from "./scenePresets";

/** The communities' colors. */
const COLORS = ["#e0703a", "#2f9e8f", "#6a5acd"] as const;

/**
 * Three communities around three centers, each a hub and two subgroups of three nodes in clusters
 * of their own on either side of it, so a subgroup's group outline nests inside its community's. A
 * fixed layout spaced as a force layout spaces nodes of this size, about ten node radii apart.
 */
const NODES = COLORS.flatMap((color, community) => {
    const toward = (community / 3) * Math.PI * 2 + 0.5;
    const cx = 16 * Math.cos(toward);
    const cy = 16 * Math.sin(toward);
    const hub = { id: `c${String(community)}n0`, community, color, position: { x: cx, y: cy, z: 0 } };
    // The two subgroups sit across the line from the middle of the picture to the hub.
    const across = toward + Math.PI / 2;
    const members = Array.from({ length: 6 }, (_, k) => {
        const side = k < 3 ? 1 : -1;
        const angle = ((k % 3) / 3) * Math.PI * 2 + community;
        const sx = cx + side * 4.5 * Math.cos(across);
        const sy = cy + side * 4.5 * Math.sin(across);
        return {
            id: `c${String(community)}n${String(k + 1)}`,
            community,
            sub: `${String(community)}${side === 1 ? "a" : "b"}`,
            color,
            position: { x: sx + 1.6 * Math.cos(angle), y: sy + 1.6 * Math.sin(angle), z: 0 },
        };
    });
    return [hub, ...members];
});

/** Each community's nodes around its first node, and one edge between communities. */
const EDGES = [
    ...NODES.filter((node) => !node.id.endsWith("n0")).map((node) => ({
        src: `c${String(node.community)}n0`,
        dst: node.id,
    })),
    { src: "c0n0", dst: "c1n0" },
    { src: "c1n0", dst: "c2n0" },
];

type LayerInput = Parameters<Graphty["session"]["styles"]["add"]>[0];

/**
 * An element with the communities, colored by community, and the layers given above that.
 * @param layers - The layers.
 * @param background - The background.
 * @returns The element.
 */
function communities(layers: readonly LayerInput[], background: Graphty["background"]): Graphty {
    const element: Graphty = document.createElement("graphty-element");
    if (isVisualCapture()) {
        element.shaderSettings = { motion: "off", guard: false };
    }

    const add = (layer: LayerInput): void => {
        Promise.resolve(element.session.styles.add(layer)).catch((error: unknown) => {
            console.error("scene presets: a layer was refused", error);
        });
    };
    add({
        name: "Community colors",
        target: "node",
        selector: { match: "everything" },
        set: { "node.size": 0.9 },
        encode: { "node.color": { by: "data.color", scale: "passthrough" } },
    });
    add({
        name: "Edges",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#8a94a0", "edge.width": 1.5 },
    });
    for (const layer of layers) {
        add(layer);
    }

    element.background = background;
    element.nodeData = NODES.map((node) => ({ ...node }));
    element.edgeData = EDGES.map((edge) => ({ ...edge }));
    element.layout = "fixed";
    element.layoutConfig = { dim: 2 };
    element.viewMode = "2d";
    // Room at every edge, so the nebula shows around the graph.
    element.fitInsets = { top: 110, right: 110, bottom: 110, left: 110 };
    return element;
}

/**
 * A scene preset's catalog entry.
 * @param id - The preset.
 * @returns Its descriptor.
 */
function descriptorOf(id: string): ShaderDescriptor {
    const preset = SCENE_PRESETS.find((candidate) => candidate.descriptor.id === id);
    if (preset === undefined) {
        throw new Error(`"${id}" is not a scene preset`);
    }

    return preset.descriptor;
}

const meta: Meta = {
    title: "Shaders/Scene Presets",
    component: "graphty-element",
    decorators: [eventWaitingDecorator],
};
export default meta;

type Story = StoryObj<Record<string, number | string | boolean>>;

/**
 * Wait for a story's graph and check it loaded.
 * @param canvasElement - The story's root.
 * @param story - The story's name, for the drawn check.
 */
async function settled(canvasElement: HTMLElement, story: string): Promise<void> {
    await waitForGraphSettled(canvasElement);
    const scene = await drawn(canvasElement, story);
    await assertGraphLoaded(scene, { nodes: NODES.length, edges: EDGES.length });
    // The room the fit insets keep at every edge.
    await assertNodesInFromEdges(scene, 110);
}

/** Gas, dust lanes and stars behind the graph, still at drift 0 until the camera moves. */
export const Nebula: Story = {
    name: "Nebula",
    ...presetControls(descriptorOf("nebula")),
    render: (args) =>
        communities([], {
            backgroundType: "color",
            color: "#0b0614",
            shader: { id: presetId("nebula"), params: presetParams(descriptorOf("nebula"), args) },
        }),
    play: async ({ canvasElement }) => {
        await settled(canvasElement, "Shaders/Scene Presets Nebula");
    },
};
