/**
 * Scene-level shaders (design/rendering/shader-styles.md, package E6), each set the way a
 * consumer sets any look:
 *
 * - **Background**: a background shader, set like a color (`element.background`), drawn behind
 *   every node and label at 30 frames a second or fewer.
 * - **Bloom**: a node surface that declares `bloom` glows; the scene allocates one shared bloom
 *   pass while a layer names such a shader.
 *
 * The demonstration shaders are defined in this file with `defineShader`, ported from the shader
 * lab (nebula backdrop, lantern glow); the element's own presets
 * have stories of their own.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { isGraphtyError } from "../../src/errors/GraphtyError";
import type { Graphty } from "../../src/graphty-element";
import { defineShader } from "../../src/simple/defineShader";
import type { ShaderDefinition } from "../../src/simple/types";
import { assertGraphLoaded, drawn } from "../assertions";
import { eventWaitingDecorator, waitForGraphSettled } from "../helpers";

/** Domain-warped gas in three colors with dust lanes and two layers of stars, from the view direction. */
const NEBULA: ShaderDefinition = {
    id: "demo/nebula",
    motion: { loop: { speedParam: "drift" } },
    params: {
        gasA: { type: "color", default: "#2a0f4a" },
        gasB: { type: "color", default: "#d0407a", primary: true },
        gasC: { type: "color", default: "#1f6fa8" },
        density: { type: "number", default: 0.8, min: 0, max: 2 },
        warp: { type: "number", default: 1, min: 0, max: 2 },
        drift: { type: "number", default: 0, min: 0, max: 5 },
        stars: { type: "number", default: 0.6, min: 0, max: 1 },
    },
    glsl: `
float starLayer(vec3 dir, float cells, float seed) {
    vec3 p = dir * cells;
    vec3 id = floor(p);
    vec3 h = hash33(id + seed);
    vec3 f = fract(p) - (0.15 + 0.7 * h);
    float present = step(1.0 - 0.35 * stars, h.x);
    float size = 0.06 * (0.8 + 1.8 * h.y * h.y);
    return present * exp(-dot(f, f) / (size * size)) * (0.4 + 1.6 * h.y * h.y);
}

vec4 shade(BackgroundInput b) {
    vec3 p = b.viewDir * 2.2;
    float t = b.time * drift * 0.05;
    vec3 q = vec3(fbm(p + vec3(0.0, t, 0.0)), fbm(p + vec3(5.2, 1.3, 2.8 - t)), 0.0);
    float f = fbm(p + warp * 4.0 * q + t);
    vec3 gas = mix(gasA, gasB, clamp(f * f * 3.0, 0.0, 1.0));
    gas = mix(gas, gasC, clamp(length(q) * 0.9 - 0.3, 0.0, 1.0));
    float body = smoothstep(0.25, 0.85, f * 0.6 + q.y * 0.6);
    float dust = smoothstep(0.45, 0.75, fbm(p * 2.7 + 3.0 * q));
    vec3 c = gas * body * density * (1.0 - 0.7 * dust) + gas * 0.08 * density;
    float s = starLayer(b.viewDir, 90.0, 1.0) + starLayer(b.viewDir, 40.0, 7.0) * 1.3;
    c += mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.9, 0.75), hash13(floor(b.viewDir * 40.0))) * s * (1.0 - 0.6 * dust * body);
    return vec4(c, 1.0);
}`,
};

/** A paper lantern: a warm glowing core lit from inside, which the shared bloom spreads. */
const LANTERN: ShaderDefinition = {
    id: "demo/lantern",
    bloom: true,
    params: { warmth: { type: "number", default: 0.7, min: 0, max: 1, primary: true } },
    glsl: `vec4 shade(NodeInput n) {
    float facing = clamp(-n.normal.z, 0.0, 1.0);
    vec3 glow = mix(n.color.rgb, vec3(1.0, 0.78, 0.42), warmth);
    float ribs = 0.85 + 0.15 * cos(n.local.y * 18.0);
    vec3 rgb = glow * (0.4 + 0.6 * pow(facing, 1.5)) * ribs;
    return vec4(rgb, 1.0);
}`,
};

/**
 * Define the demonstration shaders, once per page: a story reloaded in place defines them again.
 */
function defineDemoShaders(): void {
    for (const definition of [NEBULA, LANTERN]) {
        try {
            defineShader(definition);
        } catch (error) {
            if (!isGraphtyError(error) || error.code !== "E_DUPLICATE_PLUGIN") {
                throw error;
            }
        }
    }
}

/** The communities' colors. */
const COLORS = ["#e0703a", "#2f9e8f", "#6a5acd"] as const;

/** Three communities around three centers, each split in two subgroups; a seeded, fixed layout. */
const NODES = COLORS.flatMap((color, community) => {
    const cx = 9 * Math.cos((community / 3) * Math.PI * 2 + 0.5);
    const cy = 9 * Math.sin((community / 3) * Math.PI * 2 + 0.5);
    return Array.from({ length: 7 }, (_, i) => {
        const angle = (i / 7) * Math.PI * 2 + community;
        const r = i === 0 ? 0 : 2.4 + (i % 2) * 0.9;
        return {
            id: `c${String(community)}n${String(i)}`,
            community,
            sub: `${String(community)}${i % 2 === 0 ? "a" : "b"}`,
            color,
            position: { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), z: 0 },
        };
    });
});

/** Each community's nodes in a ring around its first node, and one edge between communities. */
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
 * @returns The element.
 */
function communities(layers: readonly LayerInput[]): Graphty {
    defineDemoShaders();
    const element: Graphty = document.createElement("graphty-element");
    const add = (layer: LayerInput): void => {
        void element.session.styles.add(layer);
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

    element.nodeData = NODES;
    element.edgeData = EDGES;
    element.layout = "fixed";
    element.layoutConfig = { dim: 2 };
    element.viewMode = "2d";
    return element;
}

const meta: Meta = {
    title: "Shaders/Scene",
    component: "graphty-element",
    decorators: [eventWaitingDecorator],
};
export default meta;

type Story = StoryObj;

/**
 * Wait for a story's graph and check it loaded.
 * @param canvasElement - The story's root.
 * @param story - The story's name, for the drawn check.
 */
async function settled(canvasElement: HTMLElement, story: string): Promise<void> {
    await waitForGraphSettled(canvasElement);
    const scene = await drawn(canvasElement, story);
    await assertGraphLoaded(scene, { nodes: NODES.length, edges: EDGES.length });
}

/** A nebula behind the graph: the shader draws behind every node, edge and label. */
export const Background: Story = {
    render: () => {
        const element = communities([
            {
                name: "Labels",
                target: "node",
                selector: { match: "has", path: "data.community" },
                set: { "node.labelStyle": { sizePx: 12, color: "#ffffff" } },
                encode: { "node.label": { by: "data.sub", scale: "passthrough" } },
            },
        ]);
        element.background = { backgroundType: "color", color: "#0b0614", shader: { id: "demo/nebula" } };
        return element;
    },
    play: async ({ canvasElement }) => {
        await settled(canvasElement, "Shaders/Scene Background");
    },
};

/** Lanterns on a dark canvas: the bloom shader on every hub spreads its light. */
export const Bloom: Story = {
    render: () => {
        const element = communities([
            {
                name: "Lanterns",
                target: "node",
                selector: { match: "ids", nodes: ["c0n0", "c1n0", "c2n0"] },
                set: { "node.shaders": [{ shader: "demo/lantern" }], "node.size": 1.6 },
            },
        ]);
        element.background = { backgroundType: "color", color: "#0d1117" };
        return element;
    },
    play: async ({ canvasElement }) => {
        await settled(canvasElement, "Shaders/Scene Bloom");
    },
};
