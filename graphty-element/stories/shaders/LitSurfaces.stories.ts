/**
 * The lit-surface presets (design/rendering/shader-styles.md section 7.1): Ink, Clear glass,
 * Pearl, Toon outline, Halftone, Frosted glass, Liquid metal and Anodized steel.
 *
 * Each story sets its surface the way a consumer does, with one style layer naming the preset,
 * over a palette layer that colors the nodes by group: every surface reads the color beneath it,
 * so each group keeps its palette color in the new material. The middle node is a box, so the
 * same surface is shown on the mesh path beside the spheres of the impostor path. The controls
 * are the preset's parameters.
 *
 * Liquid metal moves; in a visual capture its motion is switched off with the reader's own
 * setting (`shaderSettings.motion`), so the picture is the same on every run.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";
import type { InputType } from "storybook/internal/types";

import type { ShaderParams } from "../../src/catalog/shaders";
import type { Graphty } from "../../src/graphty-element";
import { assertGraphLoaded, drawn, holds } from "../assertions";
import { eventWaitingDecorator, isVisualCapture, waitForGraphSettled } from "../helpers";
import { LIT_SURFACE_PRESETS, presetId } from "./litSurfacePresets";

/** A 3 x 3 grid in three groups; the middle node is a box. */
const NODES = Array.from({ length: 9 }, (_, i) => ({
    id: `n${String(i)}`,
    group: ["north", "east", "south"][(i + Math.floor(i / 3)) % 3],
    position: { x: ((i % 3) - 1) * 4, y: (1 - Math.floor(i / 3)) * 4, z: 0 },
}));

const EDGES = [
    { src: "n0", dst: "n1" },
    { src: "n1", dst: "n2" },
    { src: "n3", dst: "n4" },
    { src: "n4", dst: "n5" },
    { src: "n6", dst: "n7" },
    { src: "n7", dst: "n8" },
    { src: "n0", dst: "n3" },
    { src: "n4", dst: "n7" },
    { src: "n2", dst: "n5" },
];

/**
 * Build the element: the palette layer, the box, then the surface over everything.
 * @param id - The preset.
 * @param params - Its parameters, from the story's controls.
 * @returns The element.
 */
function render(id: string, params: ShaderParams): Element {
    const shader = presetId(id);
    const element: Graphty = document.createElement("graphty-element");
    if (isVisualCapture()) {
        element.shaderSettings = { motion: "off" };
    }

    const add = (layer: Parameters<Graphty["session"]["styles"]["add"]>[0]): void => {
        Promise.resolve(element.session.styles.add(layer)).catch((error: unknown) => {
            console.error("lit surfaces: a layer was refused", error);
        });
    };
    add({
        name: "Groups",
        target: "node",
        selector: { match: "everything" },
        set: { "node.size": 2.4 },
        encode: { "node.color": { by: "data.group", scale: "ordinal", palette: "okabe-ito" } },
    });
    add({ name: "Box", target: "node", selector: { match: "ids", nodes: ["n4"] }, set: { "node.shape": "box" } });
    add({
        name: "Surface",
        target: "node",
        selector: { match: "everything" },
        set: { "node.shader": shader, "node.shaderParams": { [shader]: params } },
    });
    element.nodeData = NODES.map((node) => ({ ...node }));
    element.edgeData = EDGES.map((edge) => ({ ...edge }));
    element.layout = "fixed";
    element.layoutConfig = { dim: 3 };
    return element;
}

const meta: Meta = {
    title: "Shaders/Lit Surfaces",
    component: "graphty-element",
    decorators: [eventWaitingDecorator],
};
export default meta;

type Story = StoryObj<ShaderParams>;

/**
 * One preset's story: its parameters as controls, at their defaults.
 * @param id - The preset.
 * @returns The story.
 */
function surfaceStory(id: string): Story {
    const preset = LIT_SURFACE_PRESETS.find((candidate) => candidate.descriptor.id === id);
    if (preset === undefined) {
        throw new Error(`"${id}" is not a lit-surface preset`);
    }

    const { descriptor } = preset;
    const args: Record<string, number | string | boolean> = {};
    const argTypes: Record<string, InputType> = {};
    for (const param of descriptor.params) {
        args[param.name] = param.default as number | string;
        argTypes[param.name] =
            param.type === "color"
                ? { name: param.plainName, control: "color" }
                : {
                      name: param.plainName,
                      control: {
                          type: "range",
                          min: param.min as number,
                          max: param.max as number,
                          step: param.type === "integer" ? 1 : 0.01,
                      },
                  };
    }

    return {
        name: descriptor.plainName,
        args,
        argTypes,
        // Storybook hands a story every global arg too (the element's event actions): only the
        // preset's own parameters go to the layer.
        render: (storyArgs) =>
            render(id, Object.fromEntries(descriptor.params.map((param) => [param.name, storyArgs[param.name]]))),
        play: async ({ canvasElement }) => {
            await waitForGraphSettled(canvasElement);
            const scene = await drawn(canvasElement, `Shaders/Lit Surfaces ${descriptor.plainName}`);
            await assertGraphLoaded(scene, { nodes: NODES.length, edges: EDGES.length });
            await holds(
                new Set(scene.nodes.map((node) => node.hex)).size === 3,
                "the palette layer beneath gives each of the three groups its own color",
            );
        },
    };
}

/** Flat tones, a crisp highlight and a dark ink rim. */
export const MatcapInk = surfaceStory("matcap-ink");

/** A clear ball: the room bent through it, its reflection at the rim, a bright rim. */
export const ClearGlass = surfaceStory("clear-glass");

/** Iridescent nacre with a satin highlight. */
export const Pearl = surfaceStory("pearl");

/** Hard light bands and a still ink outline, on the spheres and along the box's edges. */
export const ToonOutline = surfaceStory("toon-outline");

/** The node printed on paper with a rotated dot screen. */
export const Halftone = surfaceStory("halftone");

/** A milky translucent body, fine grain, a soft rim and a blurred highlight. */
export const FrostedGlass = surfaceStory("frosted-glass");

/** Chrome whose reflection flows slowly. */
export const LiquidMetal = surfaceStory("liquid-metal");

/** Brushed steel colored by a thin oxide film. */
export const AnodizedSteel = surfaceStory("anodized-steel");
