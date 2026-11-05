/**
 * The heavy and glowing node surface presets (design/rendering/shader-styles.md section 7.1):
 * glass marble, gemstone, disco ball, lantern glow and glass, each set the way a consumer sets
 * any look -- a style layer naming the preset by id -- over a palette layer that colors the nodes
 * by group. Every surface reads the color beneath, so each node keeps its group's color.
 *
 * The last story draws 400 small nodes, so the median node on screen is under 12 px and the
 * element draws the glass marble's small-size program once the camera rests.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { ShaderParams } from "../../src/catalog/shaders";
import type { Graphty } from "../../src/graphty-element";
import { assertGraphLoaded, assertNodesInFromEdges, drawn } from "../assertions";
import { eventWaitingDecorator, waitForGraphSettled } from "../helpers";

type LayerInput = Parameters<Graphty["session"]["styles"]["add"]>[0];

/** Twelve nodes in four groups, in a 4 x 3 grid, with a ring of edges. */
const NODES = Array.from({ length: 12 }, (_, i) => ({
    id: `n${String(i)}`,
    group: `g${String(i % 4)}`,
    value: ((i * 5) % 12) / 11,
    position: { x: ((i % 4) - 1.5) * 3.2, y: (1 - Math.floor(i / 4)) * 3.2, z: 0 },
}));

const EDGES = NODES.map((node, i) => ({ src: node.id, dst: NODES[(i + 1) % NODES.length].id }));

/**
 * An element with the grid colored by group and one shader layer over every node.
 * @param shader - The preset id.
 * @param options - Options.
 * @param options.params - The preset's parameters.
 * @param options.background - The canvas color.
 * @param options.nodes - The nodes, the grid by default.
 * @param options.size - The node size.
 * @returns The element.
 */
function surfaceScene(
    shader: string,
    options: {
        params?: ShaderParams;
        encode?: LayerInput["encode"];
        background?: string;
        nodes?: readonly { id: string; group: string; position: { x: number; y: number; z: number } }[];
        size?: number;
    } = {},
): Graphty {
    const element: Graphty = document.createElement("graphty-element");
    const add = (layer: LayerInput): void => {
        void element.session.styles.add(layer);
    };
    add({
        name: "Groups",
        target: "node",
        selector: { match: "everything" },
        set: { "node.size": options.size ?? 1.6 },
        encode: { "node.color": { by: "data.group", scale: "ordinal" } },
    });
    add({
        name: "Edges",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#6b7480", "edge.width": 1 },
    });
    add({
        name: "Surface",
        target: "node",
        selector: { match: "everything" },
        set: {
            "node.shaders": [{ shader: shader }],
            ...(options.params === undefined ? {} : { "node.shaders": /* TODO params */ { [shader]: options.params } }),
        },
        ...(options.encode === undefined ? {} : { encode: options.encode }),
    });
    const nodes = [...(options.nodes ?? NODES)];
    element.nodeData = nodes;
    element.edgeData = options.nodes === undefined ? EDGES : [];
    element.layout = "fixed";
    element.layoutConfig = { dim: 3 };
    element.viewMode = "2d";
    element.background = { backgroundType: "color", color: options.background ?? "#10131a" };
    // The camera frames the nodes' centers; a marble's rim and a lantern's glow reach past them,
    // so keep room at every edge.
    element.fitInsets = { top: 60, right: 60, bottom: 60, left: 60 };
    return element;
}

const meta: Meta = {
    title: "Shaders/Heavy Surfaces",
    component: "graphty-element",
    decorators: [eventWaitingDecorator],
};
export default meta;

type Story = StoryObj;

/**
 * The play function every story shares: the graph settles and draws.
 * @param name - The story's name, for the drawn check.
 * @param counts - The nodes and edges it holds.
 * @param counts.nodes - The node count.
 * @param counts.edges - The edge count.
 * @param marginPx - How far in from the canvas's edges every node's center is drawn, room for its
 *   surface's rim or glow.
 * @returns The play function.
 */
function played(name: string, counts = { nodes: NODES.length, edges: EDGES.length }, marginPx = 100): Story["play"] {
    return async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
        const scene = await drawn(canvasElement, `Shaders/Heavy Surfaces ${name}`);
        await assertGraphLoaded(scene, counts);
        await assertNodesInFromEdges(scene, marginPx);
    };
}

/** Glass marbles with twisted ribbons in each group's color. Spin 0 keeps the capture still. */
export const GlassMarble: Story = {
    name: "Glass marble",
    render: () => surfaceScene("glass-marble", { params: { spin: 0 } }),
    play: played("GlassMarble"),
};

/** Faceted gems throwing rainbow fire, one jewel color per group. */
export const Gemstone: Story = {
    render: () => surfaceScene("gemstone", { params: { turn: 0 } }),
    play: played("Gemstone"),
};

/** Mirror-tiled disco balls, lightly tinted by group. */
export const DiscoBall: Story = {
    name: "Disco ball",
    render: () => surfaceScene("disco-ball", { params: { turn: 0 } }),
    play: played("DiscoBall"),
};

/**
 * Paper lanterns lit from inside on a night canvas; the shared bloom spreads their light. Each
 * lantern's brightness is bound to its node's value, so the hue stays its group's.
 */
export const Lantern: Story = {
    name: "Lantern",
    render: () =>
        surfaceScene("lantern", {
            params: { flicker: 0 },
            encode: { "node.shaders.lantern.intensity": { by: "data.value", range: [0.15, 1.6] } },
            background: "#04050a",
        }),
    play: played("Lantern"),
};

/** Glasss: see-through water with a caustic crescent and a glint. */
export const Glass: Story = {
    name: "Glass",
    render: () => surfaceScene("glass", { background: "#0b1410" }),
    play: played("Glass"),
};

/** 400 nodes in a 20 x 20 grid, colored by group, each under 12 px across in radius. */
const SMALL_NODES = Array.from({ length: 400 }, (_, i) => ({
    id: `s${String(i)}`,
    group: `g${String(i % 5)}`,
    position: { x: (i % 20) - 9.5, y: Math.floor(i / 20) - 9.5, z: 0 },
}));

/** Glass marbles too small to show their ribbons: the element draws the small-size program. */
export const SmallMarbles: Story = {
    name: "Small marbles",
    render: () => surfaceScene("glass-marble", { params: { spin: 0 }, nodes: SMALL_NODES, size: 0.5 }),
    play: played("SmallMarbles", { nodes: SMALL_NODES.length, edges: 0 }, 60),
};
