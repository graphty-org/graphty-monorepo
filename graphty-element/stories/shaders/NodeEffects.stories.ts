/**
 * The node-effect presets (design/rendering/shader-styles.md section 7.3): Aura, Reticle,
 * Satellites, Shockwave and Change flash.
 *
 * Each story sets its effect the way a consumer does, with one style layer naming the preset in
 * `node.shaders`, over a palette layer that colors the nodes by group, on a dark canvas like the
 * shader lab's. An effect draws around its node and never replaces it, so every node keeps its
 * palette color.
 *
 * - **Aura**: on every node, its intensity bound per node to the node's `uncertainty`.
 * - **Reticle**: on a Selected layer. The play function selects a node with a real click and the
 *   reticle snaps in; **Reticle at rest** adds the layer over a node already selected, which shows
 *   the reticle at rest, with no entrance.
 * - **Satellites**: on every node, the number of moons bound per node to the node's `degree`.
 *   **Aura and satellites** puts both on one layer, each with its own binding.
 * - **Shockwave**: on a Selected layer; the play function's click sets it off.
 * - **Change flash**: on every node; the play function changes one node's data and it flashes.
 * - **Aura over the cap**: medium quality, and the middle node big enough that its aura's square
 *   is wider than the 256 px an effect may draw on there: the aura is squeezed into the square,
 *   its haze still fading out before the square's edge, never cut off square.
 *
 * In a visual capture, motion is switched off with the reader's own setting
 * (`shaderSettings.motion`), so the picture is the same on every run: loops are drawn still and
 * the timed effects (the shockwave, the flash) are at their end, which draws nothing.
 */

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import type { ShaderParams } from "../../src/catalog/shaders";
import type { LayerSpec } from "../../src/catalog/types";
import type { Graphty } from "../../src/graphty-element";
import { everyFrameAnimationsOn } from "../../src/managers/everyFrameAnimations";
import { NodeShaderDrawing } from "../../src/meshes/NodeShaderDrawing";
import { assertGraphLoaded, assertNodesInFromEdges, type Drawn, drawn } from "../assertions";
import { eventWaitingDecorator, isVisualCapture, realInput, waitForGraphSettled } from "../helpers";
import { NODE_EFFECT_PRESETS, presetId } from "./nodeEffectPresets";

/** A 3 x 3 grid in three groups, each node with an uncertainty and a degree to bind. */
const NODES = Array.from({ length: 9 }, (_, i) => ({
    id: `n${String(i)}`,
    group: ["north", "east", "south"][(i + Math.floor(i / 3)) % 3],
    uncertainty: i / 8,
    degree: 1 + ((i * 5) % 9),
    position: { x: ((i % 3) - 1) * 5, y: (1 - Math.floor(i / 3)) * 5, z: 0 },
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

/** How far in from the canvas's edges every node's center is drawn: room for its effect. */
const EFFECT_ROOM_PX = 100;

/** The middle node, which the interaction stories click. */
const TARGET = "n4";

/** How the effect layer is built from the preset's id and the story's controls. */
type EffectLayer = (shader: string, params: ShaderParams) => LayerSpec;

/**
 * Build the element: the palette layer, then the effect layers above it.
 * @param layers - The effect layers.
 * @param options - Options.
 * @param options.selected - Nodes selected before the effect layers are added.
 * @param options.quality - The shader quality, when the story pins one.
 * @returns The element.
 */
function render(
    layers: readonly LayerSpec[],
    options: { selected?: readonly string[]; quality?: "low" | "medium" | "high" } = {},
): Element {
    const element: Graphty = document.createElement("graphty-element");
    if (isVisualCapture() || options.quality !== undefined) {
        element.shaderSettings = {
            ...(isVisualCapture() ? { motion: "off" as const, guard: false } : {}),
            ...(options.quality === undefined ? {} : { quality: options.quality }),
        };
    }

    element.background = { backgroundType: "color", color: "#0d1117" };
    // The camera frames the nodes; an aura or a moon's orbit reaches well past its node, so keep
    // room at every edge.
    element.fitInsets = { top: 70, right: 70, bottom: 70, left: 70 };
    element.nodeData = NODES.map((node) => ({ ...node }));
    element.edgeData = EDGES.map((edge) => ({ ...edge }));
    element.layout = "fixed";
    element.layoutConfig = { dim: 3 };
    void (async () => {
        await element.session.styles.add({
            name: "Groups",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 1.2 },
            encode: { "node.color": { by: "data.group", palette: "okabe-ito", scale: "ordinal" } },
        });
        const { selected } = options;
        if (selected !== undefined) {
            await untilFrames("the nodes arrive", () =>
                selected.every((id) => element.graph.getNode(id) !== undefined),
            );
            await element.session.selection.apply({ nodes: [...selected] });
            // Already selected means drawn selected: the element applies a selection to its
            // nodes on its next update.
            await untilFrames("the selection reaches the nodes", () =>
                selected.every((id) => element.graph.getNode(id)?.isSelected() === true),
            );
        }

        for (const layer of layers) {
            await element.session.styles.add(layer);
        }
    })();
    return element;
}

/**
 * A layer adding one effect, with the story's parameters, to the nodes a selector matches.
 * @param name - The layer's name.
 * @param selector - Which nodes.
 * @param extra - More of the layer (an `encode`).
 * @returns How to build it.
 */
function effectLayer(
    name: string,
    selector: LayerSpec["selector"],
    extra: (shader: string) => Partial<LayerSpec> = () => ({}),
): EffectLayer {
    return (shader, params) => ({
        name,
        target: "node",
        selector,
        set: { "node.shaders": [{ shader: shader, params: params }] },
        ...extra(shader),
    });
}

/**
 * The drawing of a story's scene, once a node names a shader.
 * @param scene - The story's scene.
 * @returns The drawing's counts.
 */
function statsOf(scene: Drawn): ReturnType<NodeShaderDrawing["stats"]> | undefined {
    return NodeShaderDrawing.peek(scene.graph.getScene())?.stats();
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
 * Whether some batch of the drawing holds exactly this many live slots.
 * @param scene - The story's scene.
 * @param count - The count.
 * @returns True when one does.
 */
function batchHolds(scene: Drawn, count: number): boolean {
    return [...(statsOf(scene)?.slots.values() ?? [])].includes(count);
}

/**
 * Select the target node the way a reader does: a real click on it when the test runner supplies
 * real input, else (in Storybook's own UI, where a page script cannot make trusted input) through
 * the session.
 * @param scene - The story's scene.
 * @param parameters - The story's parameters.
 */
async function clickTarget(scene: Drawn, parameters: Record<string, unknown>): Promise<void> {
    const node = scene.graph.getNode(TARGET);
    if (node === undefined) {
        throw new Error(`the story has no node ${TARGET}`);
    }

    const real = realInput(parameters);
    if (real === undefined) {
        await scene.session.selection.apply({ nodes: [TARGET] });
        return;
    }

    await real.click(scene.graph.canvas, scene.element.worldToScreen(node.mesh.getAbsolutePosition()));
    await untilFrames("the click selects the node", () => scene.element.getSelectedNode()?.id === TARGET);
}

/**
 * The preset's parameters as Storybook controls, at their defaults.
 * @param id - The preset.
 * @returns The args and their controls.
 */
function controlsOf(id: string): { args: Record<string, number | string>; argTypes: NonNullable<Story["argTypes"]> } {
    const preset = NODE_EFFECT_PRESETS.find((candidate) => candidate.descriptor.id === id);
    if (preset === undefined) {
        throw new Error(`"${id}" is not a node-effect preset`);
    }

    const args: Record<string, number | string> = {};
    const argTypes: Record<string, NonNullable<Story["argTypes"]>[string]> = {};
    for (const param of preset.descriptor.params) {
        args[param.name] = param.default as number | string;
        argTypes[param.name] =
            param.type === "color"
                ? { name: param.plainName, control: "color" }
                : {
                      name: param.plainName,
                      control: {
                          type: "range",
                          min: param.min,
                          max: param.max,
                          step: param.type === "integer" ? 1 : 0.01,
                      },
                  };
    }

    return { args, argTypes };
}

/**
 * The preset's own parameters out of a story's args, which Storybook also fills with the
 * element's event handlers.
 * @param id - The preset.
 * @param storyArgs - The args.
 * @returns The parameters.
 */
function paramsOf(id: string, storyArgs: ShaderParams): ShaderParams {
    const names = new Set(
        NODE_EFFECT_PRESETS.find((each) => each.descriptor.id === id)?.descriptor.params.map((param) => param.name),
    );
    return Object.fromEntries(Object.entries(storyArgs).filter(([name]) => names.has(name)));
}

const meta: Meta = {
    title: "Shaders/Node Effects",
    component: "graphty-element",
    decorators: [eventWaitingDecorator],
};
export default meta;

type Story = StoryObj<ShaderParams>;

/**
 * A preset's story.
 * @param id - The preset.
 * @param layer - Its layer.
 * @param options - Options.
 * @param options.name - The story's name.
 * @param options.selected - Nodes selected before the layer is added.
 * @param options.play - What the play function does once the graph is drawn and the effect is on screen.
 * @param options.slots - How many nodes carry the effect once drawn, before the play acts.
 * @returns The story.
 */
function effectStory(
    id: string,
    layer: EffectLayer,
    options: {
        name: string;
        selected?: readonly string[];
        slots?: number;
        play?: (scene: Drawn, parameters: Record<string, unknown>, shader: string) => Promise<void>;
    },
): Story {
    return {
        name: options.name,
        ...controlsOf(id),
        render: (storyArgs) => render([layer(presetId(id), paramsOf(id, storyArgs))], { selected: options.selected }),
        play: async ({ canvasElement, parameters }) => {
            await waitForGraphSettled(canvasElement);
            const scene = await drawn(canvasElement, `Shaders/Node Effects ${options.name}`);
            await assertGraphLoaded(scene, { nodes: NODES.length, edges: EDGES.length });
            await assertNodesInFromEdges(scene, EFFECT_ROOM_PX);
            const { slots } = options;
            if (slots !== undefined) {
                await untilFrames(`${options.name}: ${String(slots)} nodes carry the effect`, () =>
                    batchHolds(scene, slots),
                );
            }

            await options.play?.(scene, parameters, presetId(id));
        },
    };
}

/** A haze round every node that spreads, churns and flickers with the node's uncertainty. */
export const Aura = effectStory(
    "uncertainty-aura",
    effectLayer("Aura", { match: "everything" }, (shader) => ({
        encode: { [`node.shaders.${shader}.intensity`]: { by: "data.uncertainty" } },
    })),
    { name: "Aura", slots: NODES.length },
);

/** A real click selects the middle node, and the reticle snaps in round it. */
export const Reticle = effectStory("lock-on-reticle", effectLayer("Reticle", { match: "state", state: "selected" }), {
    name: "Reticle",
    play: async (scene, parameters, shader) => {
        await clickTarget(scene, parameters);
        await untilFrames("the selected node carries the reticle", () => batchHolds(scene, 1));
        if (!isVisualCapture() && (statsOf(scene)?.entrances.get(shader) ?? 0) !== 1) {
            throw new Error("Reticle: the click that selected the node did not play the snap");
        }

        // Rest once the snap is over, so the picture is the reticle locked on.
        await untilFrames("the snap ends", () => (statsOf(scene)?.entrances.get(shader) ?? 0) === 0);
    },
});

/** The reticle layer added over a node already selected: the reticle is there, at rest, with no snap. */
export const ReticleAtRest = effectStory(
    "lock-on-reticle",
    effectLayer("Reticle", { match: "state", state: "selected" }),
    {
        name: "Reticle at rest",
        selected: [TARGET],
        slots: 1,
        play: (scene, _parameters, shader) => {
            const played = statsOf(scene)?.entrances.get(shader) ?? 0;
            if (played !== 0) {
                throw new Error(`Reticle at rest: adding the layer played ${String(played)} snap(s)`);
            }

            return Promise.resolve();
        },
    },
);

/** Moons round every node, as many as the node's degree. */
export const Satellites = effectStory(
    "orbiting-satellites",
    effectLayer("Satellites", { match: "everything" }, (shader) => ({
        encode: { [`node.shaders.${shader}.moons`]: { by: "data.degree" } },
    })),
    { name: "Satellites", slots: NODES.length },
);

/** One layer, two effects, two bindings: the aura reads uncertainty, the moons read degree. */
export const AuraAndSatellites: Story = {
    name: "Aura and satellites",
    render: () => {
        const aura = presetId("uncertainty-aura");
        const moons = presetId("orbiting-satellites");
        return render([
            {
                name: "Aura and moons",
                target: "node",
                selector: { match: "everything" },
                set: { "node.shaders": [{ shader: aura }, { shader: moons, params: { moonColor: "#ffd38a" } }] },
                encode: {
                    [`node.shaders.${aura}.intensity`]: { by: "data.uncertainty" },
                    [`node.shaders.${moons}.moons`]: { by: "data.degree" },
                },
            },
        ]);
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
        const scene = await drawn(canvasElement, "Shaders/Node Effects Aura and satellites");
        await assertGraphLoaded(scene, { nodes: NODES.length, edges: EDGES.length });
        await assertNodesInFromEdges(scene, EFFECT_ROOM_PX);
        await untilFrames("both effects are drawn on every node", () => {
            const slots = [...(statsOf(scene)?.slots.values() ?? [])];
            return slots.filter((count) => count === NODES.length).length >= 2;
        });
    },
};

/** A real click selects the middle node, and a small, fast ring runs out from it once. */
export const Shockwave = effectStory("shockwave", effectLayer("Shockwave", { match: "state", state: "selected" }), {
    name: "Shockwave",
    play: async (scene, parameters, shader) => {
        await clickTarget(scene, parameters);
        await untilFrames("the selected node carries the shockwave", () => batchHolds(scene, 1));
        if (!isVisualCapture() && (statsOf(scene)?.entrances.get(shader) ?? 0) !== 1) {
            throw new Error("Shockwave: the click that selected the node did not set it off");
        }

        await untilFrames("the ring runs out", () => (statsOf(scene)?.entrances.get(shader) ?? 0) === 0);
    },
});

/** The middle node's data changes, and it flashes once. */
export const ChangeFlash = effectStory("change-flash", effectLayer("Change flash", { match: "everything" }), {
    name: "Change flash",
    slots: NODES.length,
    play: async (scene) => {
        const frames = scene.graph.getScene();
        await untilFrames("the graph comes to rest", () => everyFrameAnimationsOn(frames) === 0);
        await scene.session.data.updateNodes([{ id: TARGET, values: { uncertainty: 0.99 } }]);
        if (!isVisualCapture()) {
            await untilFrames("the change plays", () => everyFrameAnimationsOn(frames) > 0);
        }

        await untilFrames("the flash ends and the graph rests", () => everyFrameAnimationsOn(frames) === 0);
    },
});

/**
 * Medium quality caps an effect's square at 256 px. The middle node is drawn big enough that its
 * aura (three radii out) would need far more: the aura is squeezed to fit, still fading to nothing
 * before the square's edge rather than cut into a square tile.
 */
export const AuraOverTheCap: Story = {
    name: "Aura over the cap",
    render: () => {
        const aura = presetId("uncertainty-aura");
        return render(
            [
                {
                    name: "Big",
                    target: "node",
                    selector: { match: "ids", nodes: [TARGET] },
                    set: { "node.size": 4.5 },
                },
                {
                    name: "Aura",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.shaders": [{ shader: aura, params: { intensity: 1.6 } }] },
                },
            ],
            { quality: "medium" },
        );
    },
    play: async ({ canvasElement }) => {
        await waitForGraphSettled(canvasElement);
        const scene = await drawn(canvasElement, "Shaders/Node Effects Aura over the cap");
        await assertGraphLoaded(scene, { nodes: NODES.length, edges: EDGES.length });
        await assertNodesInFromEdges(scene, EFFECT_ROOM_PX);
        await untilFrames("every node carries the aura", () => batchHolds(scene, NODES.length));
    },
};
