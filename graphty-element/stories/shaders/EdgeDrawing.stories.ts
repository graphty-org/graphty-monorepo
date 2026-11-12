/**
 * Edge shaders and the two edge channels that change a line's geometry
 * (design/rendering/shader-styles.md, package E5), each set the way a consumer sets any look: a
 * style layer.
 *
 * - **Surfaces and effects**: an edge surface replaces the color of the line's own pixels and
 *   keeps its width, its taper and its arrowhead; an edge effect draws light over the line along
 *   its route, the same on a straight, a curved and a bent edge; `edge.taper` narrows a line
 *   toward its target, where its arrowhead sits.
 * - **Lift**: `edge.lift` raises each edge's route out of a flat layout's plane as an arc, in the
 *   3D view; arrowheads, labels and picking follow the arc.
 *
 * Each line keeps the color the layer beneath gave it: the surface and the effect read `e.color`.
 * The demonstration shaders here are defined in this file with `defineShader`; the element's own
 * presets have stories of their own.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { isGraphtyError } from "../../src/errors/GraphtyError";
import type { Graphty } from "../../src/graphty-element";
import { defineShader } from "../../src/simple/defineShader";
import type { ShaderDefinition } from "../../src/simple/types";
import { assertGraphLoaded, drawn } from "../assertions";
import { eventWaitingDecorator, waitForGraphSettled } from "../helpers";

/** A glass fiber: a bright core over the line's color, darker toward its sides, faint bands along it. */
const FIBER: ShaderDefinition = {
    id: "demo/fiber",
    params: { bands: { type: "number", default: 9, min: 0, max: 40 } },
    glsl: `vec4 shade(EdgeInput e) {
        float across = abs(e.side);
        float core = exp(-across * across * 6.0);
        float band = 0.5 + 0.5 * cos(e.t * bands * 6.28318);
        vec3 rgb = e.color.rgb * mix(0.45, 1.0, core) + vec3(core * 0.55) + e.color.rgb * band * 0.12;
        return vec4(rgb, e.color.a);
    }`,
};

/** A soft glow three times the line's width, brightest at the line, with a glint near the target. */
const GLOW: ShaderDefinition = {
    id: "demo/glow",
    place: "along",
    reach: 3,
    params: { glow: { type: "number", default: 0.7, min: 0, max: 2 } },
    glsl: `vec4 shade(EdgeInput e) {
        float across = abs(e.side);
        float halo = smoothstep(3.0, 1.0, across) * glow;
        float glint = exp(-pow((e.t - 0.8) * e.lengthPx / (3.0 * e.widthPx + 1.0), 2.0)) * smoothstep(1.0, 0.0, across);
        vec3 rgb = mix(e.color.rgb, vec3(1.0), 0.5 + 0.5 * glint);
        float a = clamp(halo * 0.6 + glint, 0.0, 1.0);
        return vec4(rgb * a, a);
    }`,
};

/**
 * Define the demonstration shaders, once per page: a story reloaded in place defines them again.
 */
function defineDemoShaders(): void {
    for (const definition of [FIBER, GLOW]) {
        try {
            defineShader(definition);
        } catch (error) {
            if (!isGraphtyError(error) || error.code !== "E_DUPLICATE_PLUGIN") {
                throw error;
            }
        }
    }
}

/** Four rows of two nodes: a plain line, a surface, a taper, and effects on a curve and a bend. */
const ROW_NODES = [
    { id: "plain-a", position: { x: -8, y: 6, z: 0 } },
    { id: "plain-b", position: { x: 8, y: 6, z: 0 } },
    { id: "fiber-a", position: { x: -8, y: 2, z: 0 } },
    { id: "fiber-b", position: { x: 8, y: 2, z: 0 } },
    { id: "taper-a", position: { x: -8, y: -2, z: 0 } },
    { id: "taper-b", position: { x: 8, y: -2, z: 0 } },
    { id: "glow-a", position: { x: -8, y: -6, z: 0 } },
    { id: "glow-b", position: { x: 0, y: -6, z: 0 } },
    { id: "glow-c", position: { x: 8, y: -6, z: 0 } },
];

const ROW_EDGES = [
    { src: "plain-a", dst: "plain-b" },
    { src: "fiber-a", dst: "fiber-b", fiber: true },
    { src: "taper-a", dst: "taper-b", taper: true },
    { src: "glow-a", dst: "glow-b", curved: true },
    { src: "glow-b", dst: "glow-c", bent: true },
];

/**
 * A layer for the edges whose data carries one flag.
 * @param look - The flag.
 * @param set - What the layer writes.
 * @returns The layer.
 */
function lookLayer(look: string, set: Record<string, unknown>): Parameters<Graphty["session"]["styles"]["add"]>[0] {
    return { name: look, target: "edge", selector: { match: "has", path: `data.${look}` }, set };
}

/**
 * Build the surfaces-and-effects element: a color layer, then a layer per look above it.
 * @returns The element.
 */
function renderSurfaces(): Element {
    defineDemoShaders();
    const element: Graphty = document.createElement("graphty-element");
    const add = (layer: Parameters<Graphty["session"]["styles"]["add"]>[0]): void => {
        void element.session.styles.add(layer);
    };
    add({
        name: "Lines",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#2f7fbf", "edge.width": 16, "edge.arrowHead": "normal" },
    });
    add({ name: "Nodes", target: "node", selector: { match: "everything" }, set: { "node.color": "#5b6b7a" } });
    add(lookLayer("fiber", { "edge.shaders": [{ shader: "demo/fiber" }], "edge.color": "#e0703a" }));
    add(lookLayer("taper", { "edge.taper": 0.2 }));
    add(lookLayer("curved", { "edge.curvature": true, "edge.shaders": [{ shader: "demo/glow" }] }));
    add(lookLayer("bent", { "edge.bends": "0.5,0.25", "edge.shaders": [{ shader: "demo/glow" }] }));
    element.nodeData = ROW_NODES;
    element.edgeData = ROW_EDGES;
    element.layout = "fixed";
    element.layoutConfig = { dim: 3 };
    return element;
}

/** A ring of nodes on a flat layout, every edge lifted, the heavier ones higher. */
const RING = Array.from({ length: 8 }, (_, i) => ({
    id: `r${String(i)}`,
    position: { x: 7 * Math.cos((i / 8) * Math.PI * 2), y: 7 * Math.sin((i / 8) * Math.PI * 2), z: 0 },
}));

const RING_EDGES = [
    { src: "r0", dst: "r4", heavy: true },
    { src: "r1", dst: "r5" },
    { src: "r2", dst: "r6", heavy: true },
    { src: "r3", dst: "r7" },
    { src: "r0", dst: "r1" },
    { src: "r2", dst: "r3" },
    { src: "r4", dst: "r5" },
    { src: "r6", dst: "r7" },
];

/**
 * Build the lift element: a flat layout in the 3D view, every edge lifted, heavy ones higher.
 * @returns The element.
 */
function renderLift(): Element {
    const element: Graphty = document.createElement("graphty-element");
    const add = (layer: Parameters<Graphty["session"]["styles"]["add"]>[0]): void => {
        void element.session.styles.add(layer);
    };
    add({
        name: "Arcs",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.lift": 2, "edge.color": "#2f7fbf", "edge.width": 3, "edge.arrowHead": "normal" },
    });
    add({ name: "Heavy", target: "edge", selector: { match: "has", path: "data.heavy" }, set: { "edge.lift": 5 } });
    element.nodeData = RING;
    element.edgeData = RING_EDGES;
    element.layout = "fixed";
    element.layoutConfig = { dim: 2 };
    return element;
}

const meta: Meta = {
    title: "Shaders/Edge Drawing",
    component: "graphty-element",
    decorators: [eventWaitingDecorator],
};
export default meta;

type Story = StoryObj;

/** A plain line, an edge surface, a taper, and an edge effect on a curved and a bent edge. */
export const SurfacesAndEffects: Story = {
    name: "Surfaces and effects",
    render: renderSurfaces,
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
        const scene = await drawn(canvasElement, "Shaders/Edge Drawing SurfacesAndEffects");
        await assertGraphLoaded(scene, { nodes: ROW_NODES.length, edges: ROW_EDGES.length });
    },
};

/** Edges lifted out of a flat layout's plane, in the 3D view, seen from the side. */
export const Lift: Story = {
    render: renderLift,
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
        const element = canvasElement.querySelector("graphty-element");
        await element?.setCameraState({ position: { x: 0, y: -22, z: 12 }, target: { x: 0, y: 0, z: 1.5 } });
        const scene = await drawn(canvasElement, "Shaders/Edge Drawing Lift");
        await assertGraphLoaded(scene, { nodes: RING.length, edges: RING_EDGES.length });
    },
};
