/**
 * The edge presets (design/rendering/shader-styles.md section 7.4): Fiber, Light packets, Comets,
 * Neon line and Edge change.
 *
 * Each story sets its look the way a consumer does, with one style layer naming the preset in
 * a use on `edge.shaders` (at `paint` or `along`), over a palette layer that colors the
 * nodes and edges by group, on a dark canvas like the shader lab's. The graph's edges take every
 * route the element draws -- straight, curved and bent -- and each preset follows the route.
 *
 * - **Fiber**: the fiber surface alone: dark glass rods with a bright rim in each edge's color.
 * - **Light packets**: the fiber surface with the packets effect over it, as the lab paired them.
 * - **Comets**: comets on every edge, their speed bound per edge to the edge's `weight`.
 * - **Neon line**: a core, a halo and a glint toward the target on every edge.
 * - **Edge change**: the play function adds an edge, changes another's data and removes a third;
 *   the added and changed edges light up from their source, the removed one shrinks out.
 *
 * In a visual capture, motion is switched off with the reader's own setting
 * (`shaderSettings.motion`), so the picture is the same on every run: loops are drawn still and
 * the timed effects are at their end, which for Edge change draws nothing.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { ShaderParams } from "../../src/catalog/shaders";
import type { LayerSpec } from "../../src/catalog/types";
import type { Graphty } from "../../src/graphty-element";
import { everyFrameAnimationsOn } from "../../src/managers/everyFrameAnimations";
import { EdgeShaderDrawing } from "../../src/meshes/EdgeShaderDrawing";
import { assertGraphLoaded, type Drawn, drawn } from "../assertions";
import { eventWaitingDecorator, isVisualCapture, waitForGraphSettled } from "../helpers";
import { EDGE_PRESETS, presetId } from "./edgePresets";

/** Eight nodes on a ring in two groups. */
const NODES = Array.from({ length: 8 }, (_, i) => ({
    id: `n${String(i)}`,
    group: i % 2 === 0 ? "east" : "west",
    position: { x: 8 * Math.cos((i / 8) * Math.PI * 2), y: 6 * Math.sin((i / 8) * Math.PI * 2), z: 0 },
}));

/** Straight, curved and bent edges, each with a group and a weight. */
const EDGES = [
    { src: "n0", dst: "n1", group: "east", weight: 0.2 },
    { src: "n1", dst: "n2", group: "west", weight: 0.9, curved: true },
    { src: "n2", dst: "n3", group: "east", weight: 0.5 },
    { src: "n3", dst: "n4", group: "west", weight: 0.1, bent: true },
    { src: "n4", dst: "n5", group: "east", weight: 0.7 },
    { src: "n5", dst: "n6", group: "west", weight: 0.4, curved: true },
    { src: "n6", dst: "n7", group: "east", weight: 1 },
    { src: "n7", dst: "n0", group: "west", weight: 0.3, bent: true },
    { src: "n0", dst: "n4", group: "east", weight: 0.8 },
    { src: "n2", dst: "n6", group: "west", weight: 0.6, curved: true },
];

/**
 * Build the element: the palette and route layers, then the preset's layer above them.
 * @param layer - The preset's layer.
 * @param width - The edges' width.
 * @returns The element.
 */
function render(layer: LayerSpec, width = 8): Element {
    const element: Graphty = document.createElement("graphty-element");
    if (isVisualCapture()) {
        element.shaderSettings = { motion: "off", guard: false };
    }

    element.background = { backgroundType: "color", color: "#05060b" };
    element.nodeData = NODES.map((node) => ({ ...node }));
    element.edgeData = EDGES.map((edge) => ({ ...edge }));
    element.layout = "fixed";
    element.layoutConfig = { dim: 3 };
    void (async () => {
        await element.session.styles.add({
            name: "Groups",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 1.1 },
            encode: { "node.color": { by: "data.group", palette: "okabe-ito", scale: "ordinal" } },
        });
        await element.session.styles.add({
            name: "Edge groups",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.width": width },
            encode: { "edge.color": { by: "data.group", palette: "okabe-ito", scale: "ordinal" } },
        });
        await element.session.styles.add({
            name: "Curved",
            target: "edge",
            selector: { match: "has", path: "data.curved" },
            set: { "edge.curvature": true },
        });
        await element.session.styles.add({
            name: "Bent",
            target: "edge",
            selector: { match: "has", path: "data.bent" },
            set: { "edge.bends": "0.5,0.3" },
        });
        await element.session.styles.add(layer);
    })();
    return element;
}

/**
 * Wait, counting animation frames, until a condition holds; fail after a bound.
 * @param what - What is awaited, for the failure.
 * @param holds - The condition.
 */
async function untilFrames(what: string, holds: () => boolean): Promise<void> {
    for (let frame = 0; frame < 900 && !holds(); frame++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    if (!holds()) {
        throw new Error(what);
    }
}

/**
 * How many edge slots the scene's shader batches hold.
 * @param scene - The story's scene.
 * @returns The live slots, and the slots kept for an exit.
 */
function slotsOf(scene: Drawn): { live: number; exiting: number } {
    const stats = EdgeShaderDrawing.peek(scene.graph.getScene())?.stats();
    const live = [...(stats?.slots.values() ?? [])].reduce((sum, count) => sum + count, 0);
    return { live, exiting: stats?.exiting ?? 0 };
}

/**
 * The preset's parameters as Storybook controls, at their defaults.
 * @param ids - The presets.
 * @returns The args and their controls, each named `<preset>.<parameter>` when there are two.
 */
function controlsOf(ids: readonly string[]): {
    args: Record<string, number | string | boolean>;
    argTypes: NonNullable<Story["argTypes"]>;
} {
    const args: Record<string, number | string | boolean> = {};
    const argTypes: Record<string, NonNullable<Story["argTypes"]>[string]> = {};
    for (const id of ids) {
        const preset = EDGE_PRESETS.find((candidate) => candidate.descriptor.id === id);
        for (const param of preset?.descriptor.params ?? []) {
            const key = ids.length > 1 ? `${id}.${param.name}` : param.name;
            args[key] = param.default as number | string | boolean;
            if (param.type === "color") {
                argTypes[key] = { name: param.plainName, control: "color" };
            } else if (param.type === "boolean") {
                argTypes[key] = { name: param.plainName, control: "boolean" };
            } else {
                argTypes[key] = {
                    name: param.plainName,
                    control: {
                        type: "range",
                        min: param.min,
                        max: param.max,
                        step: param.type === "integer" ? 1 : 0.01,
                    },
                };
            }
        }
    }

    return { args, argTypes };
}

/**
 * One preset's parameters out of a story's args, which Storybook also fills with the element's
 * event handlers.
 * @param id - The preset.
 * @param storyArgs - The args.
 * @param prefixed - Whether the args are named `<preset>.<parameter>`.
 * @returns The parameters.
 */
function paramsOf(id: string, storyArgs: ShaderParams, prefixed = false): ShaderParams {
    const names = EDGE_PRESETS.find((each) => each.descriptor.id === id)?.descriptor.params.map((p) => p.name) ?? [];
    const out: Record<string, number | string | boolean> = {};
    for (const name of names) {
        const value = storyArgs[prefixed ? `${id}.${name}` : name];
        if (value !== undefined) {
            out[name] = value;
        }
    }

    return out;
}

/**
 * What every story's play function does first: wait until the graph is drawn and each edge
 * carries the preset.
 * @param canvasElement - The story's root.
 * @param name - The story's name.
 * @param perEdge - How many shader batches each edge is drawn in (a surface and an effect: 2).
 * @returns The drawn scene.
 */
async function drawnWithShaders(canvasElement: HTMLElement, name: string, perEdge: number): Promise<Drawn> {
    await waitForGraphSettled(canvasElement);
    const scene = await drawn(canvasElement, `Shaders/Edge Presets ${name}`);
    await assertGraphLoaded(scene, { nodes: NODES.length, edges: EDGES.length });
    await untilFrames(`${name}: every edge carries the preset`, () => slotsOf(scene).live >= EDGES.length * perEdge);
    return scene;
}

const meta: Meta = {
    title: "Shaders/Edge Presets",
    component: "graphty-element",
    decorators: [eventWaitingDecorator],
};
export default meta;

type Story = StoryObj<ShaderParams>;

/** Dark glass rods with a bright rim in each edge's color. */
export const Fiber: Story = {
    name: "Fiber",
    ...controlsOf(["fiber-optic"]),
    render: (storyArgs) => {
        const shader = presetId("fiber-optic");
        return render(
            {
                name: "Fiber",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.shaders": [{ shader: shader, params: paramsOf("fiber-optic", storyArgs) }] },
            },
            14,
        );
    },
    play: async ({ canvasElement }) => {
        await drawnWithShaders(canvasElement, "Fiber", 1);
    },
};

/** The fiber with light packets running along it, flaring at each target. */
export const LightPackets: Story = {
    name: "Light packets",
    ...controlsOf(["fiber-optic", "fiber-packets"]),
    render: (storyArgs) => {
        const fiber = presetId("fiber-optic");
        const packets = presetId("fiber-packets");
        return render(
            {
                name: "Fiber and packets",
                target: "edge",
                selector: { match: "everything" },
                set: {
                    "edge.shaders": [
                        { shader: fiber, params: paramsOf("fiber-optic", storyArgs, true) },
                        { shader: packets, params: paramsOf("fiber-packets", storyArgs, true) },
                    ],
                },
            },
            14,
        );
    },
    play: async ({ canvasElement }) => {
        await drawnWithShaders(canvasElement, "Light packets", 2);
    },
};

/** Comets on every edge; heavier edges carry faster ones. */
export const Comets: Story = {
    name: "Comets",
    ...controlsOf(["comet-tracers"]),
    render: (storyArgs) => {
        const shader = presetId("comet-tracers");
        return render({
            name: "Comets",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.shaders": [{ shader: shader, params: paramsOf("comet-tracers", storyArgs) }] },
            encode: { [`edge.shaders.${shader}.speed`]: { by: "data.weight", range: [0.4, 2] as [number, number] } },
        });
    },
    play: async ({ canvasElement }) => {
        await drawnWithShaders(canvasElement, "Comets", 1);
    },
};

/** A core, a neon halo and a glint toward the target, on straight, curved and bent edges. */
export const NeonLine: Story = {
    name: "Neon line",
    ...controlsOf(["neon-line"]),
    render: (storyArgs) => {
        const shader = presetId("neon-line");
        return render(
            {
                name: "Glow",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.shaders": [{ shader: shader, params: paramsOf("neon-line", storyArgs) }] },
            },
            4,
        );
    },
    play: async ({ canvasElement }) => {
        await drawnWithShaders(canvasElement, "Neon line", 1);
    },
};

/** An edge arrives, another changes and a third is removed: each plays its change, then rests. */
export const EdgeChange: Story = {
    name: "Edge change",
    ...controlsOf(["edge-change"]),
    render: (storyArgs) => {
        const shader = presetId("edge-change");
        return render({
            name: "Changes",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.shaders": [{ shader: shader, params: paramsOf("edge-change", storyArgs) }] },
        });
    },
    play: async ({ canvasElement }) => {
        const scene = await drawnWithShaders(canvasElement, "Edge change", 1);
        const frames = scene.graph.getScene();
        await untilFrames("the graph comes to rest", () => everyFrameAnimationsOn(frames) === 0);
        const removed = [...scene.graph.getDataManager().edges.values()].find(
            (edge) => edge.srcNode.id === "n0" && edge.dstNode.id === "n4",
        );
        await scene.session.data.addEdges([{ src: "n1", dst: "n5", group: "west", weight: 0.5 }]);
        const changed = [...scene.graph.getDataManager().edges.values()].find(
            (edge) => edge.srcNode.id === "n2" && edge.dstNode.id === "n6",
        );
        if (changed !== undefined) {
            await scene.session.data.updateEdges([{ id: changed.id, values: { weight: 0.1 } }]);
        }

        if (removed !== undefined) {
            await scene.session.data.removeEdges([removed.id]);
        }

        if (!isVisualCapture()) {
            await untilFrames("the changes play", () => everyFrameAnimationsOn(frames) > 0);
        }

        await untilFrames("the changes end and the graph rests", () => everyFrameAnimationsOn(frames) === 0);
        await untilFrames("the removed edge is gone", () => slotsOf(scene).exiting === 0);
    },
};
