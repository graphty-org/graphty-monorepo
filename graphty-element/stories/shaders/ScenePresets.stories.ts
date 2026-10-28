/**
 * The scene presets (design/rendering/shader-styles.md section 7.5): the Nebula background, and
 * the Soap bubble and Hull group outlines.
 *
 * Each story sets its shader the way a consumer does: the nebula as the element's background
 * (`element.background`), a group outline as a use at the place `group` on a style layer's `node.shaders`, grouped by a data path. The
 * nodes are three communities, each a hub and two separate subgroups, colored by community from a
 * layer beneath; a group outline takes its group's mean color. The controls are the preset's parameters.
 *
 * The nebula drifts and the bubbles swirl; in a visual capture their motion is switched off with
 * the reader's own setting (`shaderSettings.motion`), and the frame guard, which steps the quality
 * down after a slow frame, is switched off (`shaderSettings.guard`), so the picture is the same on
 * every run however fast the machine draws.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";
import type { InputType } from "storybook/internal/types";

import type { ShaderParamDescriptor, ShaderParams } from "../../src/catalog/shaders";
import type { Graphty } from "../../src/graphty-element";
import { assertGraphLoaded, assertNodesInFromEdges, drawn } from "../assertions";
import { eventWaitingDecorator, isVisualCapture, waitForGraphSettled } from "../helpers";
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
    // A bubble or hull reaches well past its outermost node, and the camera frames the nodes:
    // keep room at every edge so the group outlines stay on the canvas.
    element.fitInsets = { top: 110, right: 110, bottom: 110, left: 110 };
    return element;
}

/** A dark canvas for the group outlines, which glow and shimmer best on one. */
const DARK: Graphty["background"] = { backgroundType: "color", color: "#10141c" };

/**
 * One parameter's Storybook control.
 * @param param - The parameter.
 * @returns The control.
 */
function control(param: ShaderParamDescriptor): InputType {
    if (param.type === "color") {
        return { name: param.plainName, control: "color" };
    }

    if (param.type === "enum") {
        return {
            name: param.plainName,
            control: "inline-radio",
            options: (param.values ?? []).map((entry) => entry.value),
        };
    }

    return {
        name: param.plainName,
        control: {
            type: "range",
            min: param.min as number,
            max: param.max as number,
            step: param.type === "integer" ? 1 : (param.step ?? 0.01),
        },
    };
}

/**
 * A preset's parameters as story controls, at their defaults, with some overridden.
 * @param id - The preset.
 * @param overrides - Defaults this story changes.
 * @returns The args and argTypes.
 */
function controls(
    id: string,
    overrides: ShaderParams = {},
): { args: Record<string, number | string | boolean>; argTypes: Record<string, InputType> } {
    const preset = SCENE_PRESETS.find((candidate) => candidate.descriptor.id === id);
    if (preset === undefined) {
        throw new Error(`"${id}" is not a scene preset`);
    }

    const args: Record<string, number | string | boolean> = {};
    const argTypes: Record<string, InputType> = {};
    for (const param of preset.descriptor.params) {
        args[param.name] = overrides[param.name] ?? (param.default as number | string);
        argTypes[param.name] = control(param);
    }

    return { args, argTypes };
}

/**
 * Only the preset's own parameters from a story's args (Storybook adds its global args).
 * @param id - The preset.
 * @param args - The story's args.
 * @returns The parameters.
 */
function paramsOf(id: string, args: Record<string, unknown>): ShaderParams {
    const preset = SCENE_PRESETS.find((candidate) => candidate.descriptor.id === id);
    return Object.fromEntries(
        (preset?.descriptor.params ?? []).map((param) => [param.name, args[param.name] as number | string]),
    );
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
    // Room for a community's bubble, which reaches well past its outermost node.
    await assertNodesInFromEdges(scene, 110);
}

/**
 * A story of a group outline preset over the communities, with a second layer for the subgroups.
 * @param id - The preset.
 * @param name - The story's name.
 * @param overrides - Defaults this story changes.
 * @returns The story.
 */
function outlineStory(id: string, name: string, overrides: ShaderParams = {}): Story {
    return {
        name,
        ...controls(id, overrides),
        render: (args) => {
            const shader = presetId(id);
            const params = paramsOf(id, args);
            return communities(
                [
                    {
                        name: "Communities",
                        set: { "node.shaders": [{ shader, params, groupBy: "data.community" }] },
                        target: "node",
                        selector: { match: "has", path: "data.community" },
                    },
                    {
                        name: "Subgroups",
                        set: { "node.shaders": [{ shader, params, groupBy: "data.sub" }] },
                        target: "node",
                        selector: { match: "has", path: "data.sub" },
                    },
                ],
                DARK,
            );
        },
        play: async ({ canvasElement }) => {
            await settled(canvasElement, `Shaders/Scene Presets ${name}`);
        },
    };
}

/** Gas, dust lanes and stars behind the graph, still at drift 0 until the camera moves. */
export const Nebula: Story = {
    name: "Nebula",
    ...controls("nebula"),
    render: (args) =>
        communities([], {
            backgroundType: "color",
            color: "#0b0614",
            shader: { id: presetId("nebula"), params: paramsOf("nebula", args) },
        }),
    play: async ({ canvasElement }) => {
        await settled(canvasElement, "Shaders/Scene Presets Nebula");
    },
};

/** The nebula tinted by the groups of an outline layer: the gas takes each community's color. */
export const NebulaTintedByGroups: Story = {
    name: "Nebula tinted by groups",
    ...controls("nebula", { tintBy: "groups" }),
    render: (args) =>
        communities(
            [
                {
                    name: "Communities",
                    set: {
                        "node.shaders": [
                            {
                                shader: presetId("metaball-hull"),
                                params: { look: "outline", outline: 1.5, fillOpacity: 0 },
                                groupBy: "data.community",
                            },
                        ],
                    },
                    target: "node",
                    selector: { match: "has", path: "data.community" },
                },
            ],
            {
                backgroundType: "color",
                color: "#0b0614",
                shader: { id: presetId("nebula"), params: paramsOf("nebula", args) },
            },
        ),
    play: async ({ canvasElement }) => {
        await settled(canvasElement, "Shaders/Scene Presets NebulaTintedByGroups");
    },
};

/** A thin-film bubble around each community, and smaller ones around its subgroups inside it. */
export const SoapBubble = outlineStory("soap-bubble", "Soap bubble");

/** The hull as translucent goo with a bright rim (the default look). */
export const HullGoo = outlineStory("metaball-hull", "Hull goo");

/** The hull as an iridescent soap-film membrane. */
export const HullMembrane = outlineStory("metaball-hull", "Hull membrane", { look: "membrane" });

/** The hull as a clean contour, nested like an Euler diagram. */
export const HullOutline = outlineStory("metaball-hull", "Hull outline", { look: "outline" });

/**
 * One Hull layer per community, as a folder of community layers draws them: sibling layers of one
 * shader share a level, so each outline is drawn at one size around its whole community, as one
 * layer grouping by community would draw it.
 */
export const HullPerCommunityLayer: Story = {
    name: "Hull per community layer",
    ...controls("metaball-hull", { look: "outline" }),
    render: (args) =>
        communities(
            COLORS.map((_, community) => ({
                name: `Community ${String(community)}`,
                set: {
                    "node.shaders": [{ shader: presetId("metaball-hull"), params: paramsOf("metaball-hull", args) }],
                },
                target: "node" as const,
                selector: { match: "expression" as const, where: `data.community == \`${String(community)}\`` },
            })),
            DARK,
        ),
    play: async ({ canvasElement }) => {
        await settled(canvasElement, "Shaders/Scene Presets HullPerCommunityLayer");
    },
};
