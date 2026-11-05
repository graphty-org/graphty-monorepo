/**
 * @file The node-effect presets drawn on a real graph (design/rendering/shader-styles.md section
 * 7.3, package P4): the reticle snaps in on a real click selection -- the very first click on a
 * fresh graph included -- and not when its layer is added over a node already selected; the
 * shockwave plays once on a click and draws nothing at rest; the change flash plays when a node's
 * data changes and then lets the graph rest; the aura and the satellites draw together on one
 * node, each from its own binding; and every preset compiles and draws with every parameter at
 * either end of its range. Clicks are real mouse input (test/helpers/real-input.ts).
 */

import "../../../../src/graphty-element";

import { afterAll, afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../../index.js";
import { clearRegisteredShadersForTesting } from "../../../../src/catalog/shaderRegistry";
import type { ShaderParams } from "../../../../src/catalog/shaders";
import type { LayerSpec } from "../../../../src/catalog/types";
import { operationQueueOf } from "../../../../src/Graph";
import { everyFrameAnimationsOn } from "../../../../src/managers/everyFrameAnimations";
import { NodeShaderDrawing } from "../../../../src/meshes/NodeShaderDrawing";
import { NODE_EFFECT_PRESETS, presetId } from "../../../../stories/shaders/nodeEffectPresets";
import { drawnFrames } from "../../../helpers/drawn-frames";
import { click } from "../../../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

afterAll(clearRegisteredShadersForTesting);

/** Three nodes in a row, with a value to bind. */
const NODES = [
    { id: "a", x: -4, uncertainty: 0, degree: 1 },
    { id: "b", x: 0, uncertainty: 0.5, degree: 4 },
    { id: "c", x: 4, uncertainty: 1, degree: 9 },
];

/**
 * A mounted element drawing the three nodes in 2D, with layers added after them.
 * @param layers - The layers.
 * @returns The element.
 */
async function mounted(layers: readonly LayerSpec[]): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    element.renderOnDemand = true;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(
        NODES.map(({ id, x, uncertainty, degree }) => ({ id, uncertainty, degree, position: { x, y: 0, z: 0 } })),
    );
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    for (const layer of layers) {
        await element.session.styles.add(layer);
    }

    await operationQueueOf(element.graph).waitForCompletion();
    return element;
}

/**
 * Wait until a condition holds, counting drawn frames; fail after a bound.
 * @param element - The element.
 * @param what - What is awaited, for the failure.
 * @param holds - The condition.
 */
async function until(element: Graphty, what: string, holds: () => boolean): Promise<void> {
    const scene = element.graph.getScene();
    for (let i = 0; i < 600 && !holds(); i++) {
        await drawnFrames(scene, 1);
    }

    assert.isTrue(holds(), what);
}

/**
 * The drawing's counts, once a node names a shader.
 * @param element - The element.
 * @returns The counts.
 */
function statsOf(element: Graphty): ReturnType<NodeShaderDrawing["stats"]> | undefined {
    return NodeShaderDrawing.peek(element.graph.getScene())?.stats();
}

/**
 * How many batches of the drawing hold exactly this many live slots.
 * @param element - The element.
 * @param count - The count.
 * @returns The number of such batches.
 */
function batchesHolding(element: Graphty, count: number): number {
    return [...(statsOf(element)?.slots.values() ?? [])].filter((live) => live === count).length;
}

/**
 * Click a node with the real mouse.
 * @param element - The element.
 * @param id - The node.
 */
async function clickNode(element: Graphty, id: string): Promise<void> {
    const node = element.graph.getNode(id);
    assert.isDefined(node);
    // The camera's matrices are those of a drawn frame.
    await drawnFrames(element.graph.getScene(), 2);
    await click(element, element.worldToScreen(node.mesh.getAbsolutePosition()));
    await until(element, `the click selects ${id}`, () => element.getSelectedNode()?.id === id);
}

/**
 * A layer adding one effect to the selected nodes.
 * @param id - The preset.
 * @returns The layer.
 */
function onSelected(id: string): LayerSpec {
    return {
        name: id,
        target: "node",
        selector: { match: "state", state: "selected" },
        set: { "node.shaders": [{ shader: presetId(id) }] },
    };
}

describe("the reticle", () => {
    it("snaps in on the first real click on a fresh graph", async () => {
        const element = await mounted([onSelected("lock-on-reticle")]);
        await clickNode(element, "b");
        await until(element, "the reticle is drawn on the clicked node", () => batchesHolding(element, 1) === 1);
        assert.strictEqual(statsOf(element)?.entrances.get(presetId("lock-on-reticle")), 1, "the snap plays");
    });

    it("snaps in on a later click too, on a node that never carried it", async () => {
        const element = await mounted([onSelected("lock-on-reticle")]);
        await clickNode(element, "a");
        await until(element, "the reticle is drawn", () => batchesHolding(element, 1) === 1);
        await clickNode(element, "c");
        await until(element, "the reticle moved to c", () => {
            const node = element.graph.getNode("c");
            return (
                node?.isSelected() === true && (statsOf(element)?.entrances.get(presetId("lock-on-reticle")) ?? 0) > 0
            );
        });
    });

    it("shows at rest, with no snap, when its layer is added over a node already selected", async () => {
        const element = await mounted([]);
        await clickNode(element, "b");
        await element.session.styles.add(onSelected("lock-on-reticle"));
        await until(element, "the reticle is drawn", () => batchesHolding(element, 1) === 1);
        assert.strictEqual(statsOf(element)?.entrances.get(presetId("lock-on-reticle")) ?? 0, 0, "no snap plays");
    });
});

describe("the shockwave", () => {
    it("plays once on a real click, holds frames only while it runs, then rests", async () => {
        const element = await mounted([onSelected("shockwave")]);
        const scene = element.graph.getScene();
        await clickNode(element, "a");
        await until(element, "the shockwave is drawn", () => batchesHolding(element, 1) === 1);
        assert.strictEqual(statsOf(element)?.entrances.get(presetId("shockwave")), 1, "the ring runs out");
        assert.isAbove(everyFrameAnimationsOn(scene), 0, "it claims frames while it runs");
        await until(element, "the ring ends and the graph rests", () => everyFrameAnimationsOn(scene) === 0);
    });
});

describe("element.drawnShaders()", () => {
    it("reports a node effect drawn and its entrance playing, and each group a group outline outlines", async () => {
        const element = await mounted([
            onSelected("shockwave"),
            {
                name: "Groups",
                set: { "node.shaders": [{ shader: "metaball-hull", groupBy: "data.degree" }] },
                target: "node",
                selector: { match: "everything" },
            },
        ]);
        assert.isUndefined(element.drawnShaders().nodes.get(presetId("shockwave")), "nothing selected, nothing drawn");
        await clickNode(element, "a");
        await until(element, "the ring plays on the clicked node", () => {
            const drawn = element.drawnShaders().nodes.get(presetId("shockwave"));
            return drawn?.drawn === 1 && drawn.entering === 1;
        });
        await until(element, "the ring ends, the node still carries it", () => {
            const drawn = element.drawnShaders().nodes.get(presetId("shockwave"));
            return drawn?.drawn === 1 && drawn.entering === 0;
        });
        const layer = element.session.styles.list().find((each) => each.name === "Groups")?.id;
        const outlined = (): readonly unknown[] =>
            element.drawnShaders().groupOutlines.find((each) => each.layer === layer)?.groups ?? [];
        await until(element, "one outline per degree", () => outlined().length === NODES.length);
        assert.sameMembers(
            [...outlined()],
            NODES.map((node) => node.degree),
        );
    });
});

describe("the change flash", () => {
    it("plays when a node's data changes, and lets the graph rest after", async () => {
        const element = await mounted([
            {
                name: "Flash",
                target: "node",
                selector: { match: "everything" },
                set: { "node.shaders": [{ shader: presetId("change-flash") }] },
            },
        ]);
        const scene = element.graph.getScene();
        await until(element, "every node carries the flash", () => batchesHolding(element, NODES.length) === 1);
        await until(element, "the graph rests", () => everyFrameAnimationsOn(scene) === 0);

        await element.session.data.updateNodes([{ id: "b", values: { uncertainty: 0.9 } }]);
        await until(element, "the change plays", () => everyFrameAnimationsOn(scene) > 0);
        await until(element, "the flash ends and the graph rests", () => everyFrameAnimationsOn(scene) === 0);
    });
});

describe("the aura and the satellites", () => {
    it("draw together on every node, each from its own binding", async () => {
        const aura = presetId("uncertainty-aura");
        const moons = presetId("orbiting-satellites");
        const element = await mounted([
            {
                name: "Aura and moons",
                target: "node",
                selector: { match: "everything" },
                set: { "node.shaders": [{ shader: aura }, { shader: moons }] },
                encode: {
                    [`node.shaders.${aura}.intensity`]: { by: "data.uncertainty" },
                    [`node.shaders.${moons}.moons`]: { by: "data.degree" },
                },
            },
        ]);
        await until(element, "both effects draw on every node", () => batchesHolding(element, NODES.length) === 2);
        const merged = element.session.styles.explain({ node: "c" }).merged["node.shaders"] ?? [];
        const auraParams = merged.find((use) => use.shader === aura)?.params;
        const moonParams = merged.find((use) => use.shader === moons)?.params;
        assert.deepInclude(auraParams, { intensity: 2 });
        assert.deepInclude(moonParams, { moons: 12 });
        assert.notProperty(auraParams, "moons");
        assert.notProperty(moonParams, "intensity");
    });
});

describe("every node-effect preset", () => {
    it.each(NODE_EFFECT_PRESETS.map((preset) => [preset.descriptor.id, preset] as const))(
        "%s compiles and draws with every parameter at either end of its range",
        async (id, { descriptor }) => {
            const ends = (which: "min" | "max"): ShaderParams =>
                Object.fromEntries(
                    descriptor.params
                        .filter((param) => typeof param[which] === "number")
                        .map((param) => [param.name, param[which] as number]),
                );
            const shader = presetId(id);
            const element = await mounted([
                {
                    name: "Low",
                    target: "node",
                    selector: { match: "ids", nodes: ["a"] },
                    set: { "node.shaders": [{ shader: shader, params: ends("min") }] },
                },
                {
                    name: "High",
                    target: "node",
                    selector: { match: "ids", nodes: ["b", "c"] },
                    set: { "node.shaders": [{ shader: shader, params: ends("max") }] },
                },
            ]);
            await until(element, `${id} draws on every node`, () => batchesHolding(element, NODES.length) === 1);
        },
    );
});
