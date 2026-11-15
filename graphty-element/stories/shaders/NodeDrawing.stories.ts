/**
 * The three paths a node shader is drawn on (design/rendering/shader-styles.md section 5), each
 * set the way a consumer sets any look: a style layer naming a shader.
 *
 * - The two spheres carry a surface: a round node is drawn as a camera-facing square that
 *   ray-casts the exact sphere (the impostor batch), and its mesh stays as the pick proxy.
 * - The box carries the same surface on its own mesh (the mesh path): the box keeps its shape.
 * - The star is a sprite: a flat picture in place of the shape, picked by its radius.
 * - The middle sphere carries an effect too: a ring drawn around it, over what lies beneath.
 *
 * Each node keeps the color the color layer beneath gave it: the surface reads `n.color`. The
 * demonstration shaders here are defined in this file with `defineShader`; the element's own
 * presets have stories of their own.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { isGraphtyError } from "../../src/errors/GraphtyError";
import type { Graphty } from "../../src/graphty-element";
import { defineShader } from "../../src/simple/defineShader";
import type { ShaderDefinition } from "../../src/simple/types";
import { assertGraphLoaded, drawn } from "../assertions";
import { eventWaitingDecorator, waitForGraphSettled } from "../helpers";

/** A lit sphere with a bright rim, over the node's color. */
const LIT: ShaderDefinition = {
    id: "demo/lit",
    params: { rim: { type: "number", default: 0.6, min: 0, max: 1 } },
    glsl: `vec4 shade(NodeInput n) {
        float diffuse = max(dot(n.normal, lightDir), 0.0);
        float edge = pow(1.0 - max(dot(n.normal, -n.viewDir), 0.0), 3.0);
        vec3 rgb = n.color.rgb * (ambient + diffuse * lightColor) + vec3(edge * rim);
        return vec4(rgb, 1.0);
    }`,
};

/** A five-pointed star sticker with a white border. */
const STAR: ShaderDefinition = {
    id: "demo/star",
    place: "replace",
    glsl: `vec4 shade(NodeInput n) {
        float d = sdStar5(n.uv * vec2(1.0, -1.0), 0.9, 0.45);
        float fill = fillAA(d);
        float border = fillAA(d - 0.08) - fill;
        return vec4(n.color.rgb * fill + vec3(border), fill + border);
    }`,
};

/** A dashed ring around the node, still. */
const RING: ShaderDefinition = {
    id: "demo/ring",
    place: "around",
    reach: 1.8,
    glsl: `vec4 shade(NodeInput n) {
        float r = length(n.uv);
        float a = atan(n.uv.y, n.uv.x);
        float dash = step(0.5, fract(a * 12.0 / 6.28318));
        float ring = strokeAA(r - 1.45, 0.06) * dash;
        return vec4(vec3(0.15, 0.2, 0.3) * ring, ring);
    }`,
};

/**
 * Define the demonstration shaders, once per page: a story reloaded in place defines them again.
 */
function defineDemoShaders(): void {
    for (const definition of [LIT, STAR, RING]) {
        try {
            defineShader(definition);
        } catch (error) {
            if (!isGraphtyError(error) || error.code !== "E_DUPLICATE_PLUGIN") {
                throw error;
            }
        }
    }
}

/** Five nodes in a row. */
const NODES = [
    { id: "sphere", position: { x: -8, y: 0, z: 0 } },
    { id: "ringed", position: { x: -4, y: 0, z: 0 } },
    { id: "box", position: { x: 0, y: 0, z: 0 } },
    { id: "star", position: { x: 4, y: 0, z: 0 } },
    { id: "plain", position: { x: 8, y: 0, z: 0 } },
];

const EDGES = [
    { src: "sphere", dst: "ringed" },
    { src: "ringed", dst: "box" },
    { src: "box", dst: "star" },
    { src: "star", dst: "plain" },
];

/**
 * Build the element: a color layer, then the shader layers above it.
 * @returns The element.
 */
function render(): Element {
    defineDemoShaders();
    const element: Graphty = document.createElement("graphty-element");
    const add = (layer: Parameters<Graphty["session"]["styles"]["add"]>[0]): void => {
        void element.session.styles.add(layer);
    };
    add({ name: "Colors", target: "node", selector: { match: "everything" }, set: { "node.color": "#3b82c4" } });
    add({
        name: "Warm",
        target: "node",
        selector: { match: "ids", nodes: ["ringed", "star"] },
        set: { "node.color": "#e0703a" },
    });
    add({ name: "Box", target: "node", selector: { match: "ids", nodes: ["box"] }, set: { "node.shape": "box" } });
    add({
        name: "Lit",
        target: "node",
        selector: { match: "ids", nodes: ["sphere", "ringed", "box"] },
        set: { "node.shaders": [{ shader: "demo/lit" }] },
    });
    add({
        name: "Star",
        target: "node",
        selector: { match: "ids", nodes: ["star"] },
        set: { "node.shaders": [{ shader: "demo/star" }] },
    });
    add({
        name: "Ring",
        target: "node",
        selector: { match: "ids", nodes: ["ringed"] },
        set: { "node.shaders": [{ shader: "demo/ring" }] },
    });
    element.nodeData = NODES;
    element.edgeData = EDGES;
    element.layout = "fixed";
    element.layoutConfig = { dim: 3 };
    return element;
}

const meta: Meta = {
    title: "Shaders/Node Drawing",
    component: "graphty-element",
    render,
    decorators: [eventWaitingDecorator],
};
export default meta;

type Story = StoryObj;

/** A surface on round nodes and on a box, a sprite, and an effect, over a color layer. */
export const ThreePaths: Story = {
    name: "Three paths",
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
        const scene = await drawn(canvasElement, "Shaders/Node Drawing ThreePaths");
        await assertGraphLoaded(scene, { nodes: NODES.length, edges: EDGES.length });
    },
};
