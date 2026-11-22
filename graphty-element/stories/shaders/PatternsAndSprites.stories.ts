/**
 * The pattern, state and sprite presets (design/rendering/shader-styles.md sections 7.1 and 7.2):
 * Patterns, Foil shimmer, Hologram, Frost, Sticker and Mandala.
 *
 * Each story sets its shader the way a consumer does, with style layers, over a palette layer
 * that colors the nodes by group:
 *
 * - **Patterns** gives each of eight groups its own pattern, bound with the `"index"` scale, so the
 *   groups read apart without telling the colors apart.
 * - **Foil shimmer** puts foil on three search hits and leaves every other node as the layers
 *   beneath painted it.
 * - **Hologram** draws three nodes as holograms; on a Hovered layer the same preset prints in on
 *   hover and fades on leave.
 * - **Frost** sits on a pinned-state layer: the three pinned nodes are frosted, and pinning or
 *   unpinning another grows or thaws its frost.
 * - **Sticker** draws every node as a die-cut sticker whose icon follows its group (the `"index"`
 *   scale), one row per finish: none, shiny, holographic.
 * - **Mandala** draws every node as a mandala, its folds bound to the node's rank and its hue to
 *   its group's place.
 *
 * The controls are the preset's fixed parameters. Shaders that move are drawn still in a visual
 * capture, with the reader's own setting (`shaderSettings.motion`), so the picture is the same on
 * every run; frost's growth then jumps to its end.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { ShaderDescriptor, ShaderParams } from "../../src/catalog/shaders";
import type { LayerSpec } from "../../src/catalog/types";
import type { Graphty } from "../../src/graphty-element";
import { assertGraphLoaded, drawn, holds } from "../assertions";
import { eventWaitingDecorator, isVisualCapture, waitForGraphSettled } from "../helpers";
import { PATTERN_SPRITE_PRESETS, patternPresetId } from "./patternSpritePresets";
import { presetControls, presetParams } from "./presetControls";

/** The eight groups, in the order the palette and the index scale number them. */
const GROUPS = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta"];

/** A 4 x 3 grid: twelve nodes in eight groups, each with a rank. */
const NODES = Array.from({ length: 12 }, (_, i) => ({
    id: `n${String(i)}`,
    group: GROUPS[i % GROUPS.length],
    rank: (i * 5) % 12,
    hue: (i % GROUPS.length) / GROUPS.length,
    position: { x: ((i % 4) - 1.5) * 4, y: (1 - Math.floor(i / 4)) * 4, z: 0 },
}));

const EDGES = [
    { src: "n0", dst: "n1" },
    { src: "n1", dst: "n2" },
    { src: "n2", dst: "n3" },
    { src: "n4", dst: "n5" },
    { src: "n5", dst: "n6" },
    { src: "n6", dst: "n7" },
    { src: "n8", dst: "n9" },
    { src: "n9", dst: "n10" },
    { src: "n10", dst: "n11" },
    { src: "n0", dst: "n4" },
    { src: "n5", dst: "n9" },
    { src: "n3", dst: "n7" },
];

/** The nodes a story picks out: search hits, holograms, pinned nodes. */
const PICKED = ["n1", "n6", "n8"];

/**
 * Build the element: the palette layer, then the story's own layers.
 * @param layers - The story's layers, given the preset ids to name.
 * @param pins - Nodes to pin once they are loaded.
 * @returns The element.
 */
function render(layers: readonly LayerSpec[], pins: readonly string[] = []): Element {
    const element: Graphty = document.createElement("graphty-element");
    if (isVisualCapture()) {
        element.shaderSettings = { motion: "off", guard: false };
    }

    const add = (layer: LayerSpec): void => {
        // `add` answers with a thenable, not a full Promise.
        Promise.resolve(element.session.styles.add(layer)).catch((error: unknown) => {
            console.error("patterns and sprites: a layer was refused", error);
        });
    };
    add({
        name: "Groups",
        target: "node",
        selector: { match: "everything" },
        set: { "node.size": 2.4 },
        encode: { "node.color": { by: "data.group", scale: "ordinal", palette: "okabe-ito" } },
    });
    for (const layer of layers) {
        add(layer);
    }

    element.layout = "fixed";
    element.layoutConfig = { dim: 3 };
    void element.session.data
        .addNodes(NODES.map((node) => ({ ...node })))
        .then(async () => {
            await element.session.data.addEdges(EDGES.map(({ src, dst }) => ({ source: src, target: dst })));
            if (pins.length > 0) {
                await element.session.positions.pin(pins);
            }
        })
        .catch((error: unknown) => {
            console.error("patterns and sprites: the graph did not load", error);
        });
    return element;
}

/**
 * A pattern, state or sprite preset's catalog entry.
 * @param id - The preset.
 * @returns Its descriptor.
 */
function descriptorOf(id: string): ShaderDescriptor {
    const preset = PATTERN_SPRITE_PRESETS.find((candidate) => candidate.descriptor.id === id);
    if (preset === undefined) {
        throw new Error(`"${id}" is not a pattern, state or sprite preset`);
    }

    return preset.descriptor;
}

/**
 * The play function every story shares: the graph loads, and the palette beneath still tells the
 * groups apart.
 * @param story - The story's name, for failures.
 * @returns The play function.
 */
function playOf(story: string): Story["play"] {
    return async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
        const scene = await drawn(canvasElement, `Shaders/Patterns and Sprites ${story}`);
        await assertGraphLoaded(scene, { nodes: NODES.length, edges: EDGES.length });
        await holds(
            new Set(scene.nodes.map((node) => node.hex)).size === GROUPS.length,
            "the palette layer beneath gives each of the eight groups its own color",
        );
    };
}

const meta: Meta = {
    title: "Shaders/Patterns and Sprites",
    component: "graphty-element",
    decorators: [eventWaitingDecorator],
};
export default meta;

type Story = StoryObj<ShaderParams>;

/** Eight patterns over the palette, one per group, bound with the index scale. */
export const Patterns: Story = {
    ...presetControls(descriptorOf("colorblind-patterns"), { skip: ["pattern"] }),
    render: (args) => {
        const shader = patternPresetId("colorblind-patterns");
        const params = presetParams(descriptorOf("colorblind-patterns"), args);
        return render([
            {
                name: "Patterns",
                target: "node",
                selector: { match: "everything" },
                set: { "node.shaders": [{ shader: shader, params: params }] },
                encode: { [`node.shaders.${shader}.pattern`]: { by: "data.group", scale: "index" } },
            },
        ]);
    },
    play: playOf("Patterns"),
};

/** Foil on three search hits; every other node stays as the palette painted it. */
export const FoilShimmer: Story = {
    ...presetControls(descriptorOf("foil-shimmer")),
    render: (args) => {
        const shader = patternPresetId("foil-shimmer");
        const params = presetParams(descriptorOf("foil-shimmer"), args);
        return render([
            {
                name: "Search hits",
                target: "node",
                selector: { match: "ids", nodes: PICKED },
                set: { "node.shaders": [{ shader: shader, params: params }] },
            },
        ]);
    },
    play: playOf("FoilShimmer"),
};

/** Three holograms among the plain nodes. */
export const Hologram: Story = {
    ...presetControls(descriptorOf("hologram")),
    render: (args) => {
        const shader = patternPresetId("hologram");
        const params = presetParams(descriptorOf("hologram"), args);
        return render([
            {
                name: "Ghosts",
                target: "node",
                selector: { match: "ids", nodes: PICKED },
                set: { "node.shaders": [{ shader: shader, params: params }] },
            },
            {
                name: "Hovered",
                target: "node",
                selector: { match: "state", state: "hovered" },
                set: { "node.shaders": [{ shader: shader, params: params }] },
            },
        ]);
    },
    play: playOf("Hologram"),
};

/** Frost on a pinned-state layer: the three pinned nodes are frosted. */
export const Frost: Story = {
    ...presetControls(descriptorOf("frost")),
    render: (args) => {
        const shader = patternPresetId("frost");
        const params = presetParams(descriptorOf("frost"), args);
        return render(
            [
                {
                    name: "Pinned",
                    target: "node",
                    selector: { match: "state", state: "pinned" },
                    set: { "node.shaders": [{ shader: shader, params: params }] },
                },
            ],
            PICKED,
        );
    },
    play: playOf("Frost"),
};

/** Stickers whose icon follows the group, one row per finish. */
export const Sticker: Story = {
    ...presetControls(descriptorOf("icon-sticker"), { skip: ["icon", "finish"] }),
    render: (args) => {
        const shader = patternPresetId("icon-sticker");
        const params = presetParams(descriptorOf("icon-sticker"), args);
        const rows = ["none", "shiny", "holographic"].map((finish, row): LayerSpec => ({
            name: `Stickers, ${finish}`,
            target: "node",
            selector: { match: "ids", nodes: [0, 1, 2, 3].map((column) => `n${String(row * 4 + column)}`) },
            set: { "node.shaders": [{ shader: shader, params: { ...params, finish } }] },
            encode: { [`node.shaders.${shader}.icon`]: { by: "data.group", scale: "index" } },
        }));
        return render(rows);
    },
    play: playOf("Sticker"),
};

/** Mandalas: folds from each node's rank, hue from its group's place. */
export const Mandala: Story = {
    ...presetControls(descriptorOf("mandala"), { skip: ["folds", "hueShift"] }),
    render: (args) => {
        const shader = patternPresetId("mandala");
        const params = presetParams(descriptorOf("mandala"), args);
        return render([
            {
                name: "Mandalas",
                target: "node",
                selector: { match: "everything" },
                set: { "node.shaders": [{ shader: shader, params: params }] },
                encode: {
                    [`node.shaders.${shader}.folds`]: { by: "data.rank" },
                    [`node.shaders.${shader}.hueShift`]: { by: "data.hue" },
                },
            },
        ]);
    },
    play: playOf("Mandala"),
};
