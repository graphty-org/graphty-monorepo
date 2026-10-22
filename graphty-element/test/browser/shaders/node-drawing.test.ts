/**
 * @file Node shaders drawn on a real graph (design/rendering/shader-styles.md, package E3): a
 * surface on the mesh path and on the impostor batch, a sprite picked by its radius with its halo
 * and label, effects and their frame claims, the active-mesh freeze under a loop, and the entrance
 * cap. Clicks are real mouse input (test/helpers/real-input.ts).
 */

import "../../../src/graphty-element";

import { Vector3 } from "@babylonjs/core";
import { afterAll, afterEach, assert, beforeAll, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { clearRegisteredShadersForTesting } from "../../../src/catalog/shaderRegistry";
import type { LayerSpec } from "../../../src/catalog/types";
import { operationQueueOf } from "../../../src/Graph";
import { everyFrameAnimationsOn } from "../../../src/managers/everyFrameAnimations";
import { NodeShaderDrawing } from "../../../src/meshes/NodeShaderDrawing";
import type { Node } from "../../../src/Node";
import { defineShader } from "../../../src/simple/defineShader";
import { drawnFrames } from "../../helpers/drawn-frames";
import { click, type Point } from "../../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

beforeAll(() => {
    defineShader({
        id: "e3/flat",
        glsl: "vec4 shade(NodeInput n) { return vec4(n.color.rgb, 1.0); }",
    });
    defineShader({
        id: "e3/pulse",
        params: { speed: { type: "number", default: 1, min: 0, max: 4 } },
        motion: { loop: { speedParam: "speed" } },
        glsl: "vec4 shade(NodeInput n) { return vec4(vec3(fract(n.time * speed)), 1.0); }",
    });
    defineShader({
        id: "e3/sticker",
        place: "replace",
        glsl: "vec4 shade(NodeInput n) { return vec4(n.color.rgb, 1.0); }",
    });
    defineShader({
        id: "e3/spin",
        place: "around",
        reach: 2,
        params: { speed: { type: "number", default: 1, min: 0, max: 4 } },
        motion: { loop: { speedParam: "speed" } },
        glsl: `vec4 shade(NodeInput n) {
            float ring = smoothstep(0.1, 0.0, abs(length(n.uv) - 1.5 - 0.1 * sin(n.time * speed)));
            return vec4(vec3(ring), ring);
        }`,
    });
    defineShader({
        id: "e3/reticle",
        place: "around",
        reach: 1.6,
        params: { entering: { by: "since.matched", domain: [0, 0.55] } },
        glsl: `vec4 shade(NodeInput n) {
            float t = clamp(n.sinceEntered / 0.55, 0.0, 1.0);
            float ring = smoothstep(0.08, 0.0, abs(length(n.uv) - mix(1.6, 1.3, t)));
            return vec4(vec3(0.0, ring, 0.0), ring);
        }`,
    });
});

afterAll(() => {
    clearRegisteredShadersForTesting();
});

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element drawing in 2D, with nodes at fixed places.
 * @param nodes - The nodes.
 * @param layers - Layers added before the first frame is waited for.
 * @param options - Options.
 * @param options.edges - Edges to add.
 * @returns The element.
 */
async function mounted(
    nodes: readonly { id: string; x: number; y: number }[],
    layers: readonly LayerSpec[],
    options: { edges?: readonly { source: string; target: string }[] } = {},
): Promise<Graphty> {
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
    await element.session.data.addNodes(nodes.map(({ id, x, y }) => ({ id, position: { x, y, z: 0 } })));
    if (options.edges !== undefined) {
        await element.session.data.addEdges(options.edges.map((edge) => ({ ...edge })));
    }

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
 * A node of the graph.
 * @param element - The element.
 * @param id - The node id.
 * @returns The node.
 */
function nodeOf(element: Graphty, id: string): Node {
    const node = element.graph.getNode(id);
    assert.isDefined(node, `the graph holds ${id}`);
    return node;
}

/**
 * The drawing of the element's scene.
 * @param element - The element.
 * @returns The drawing.
 */
function drawingOf(element: Graphty): NodeShaderDrawing {
    const drawing = NodeShaderDrawing.peek(element.graph.getScene());
    assert.isDefined(drawing, "a node named a shader, so the scene has a drawing");
    return drawing;
}

/**
 * Whether some batch of the element's drawing holds exactly this many live slots.
 * @param element - The element.
 * @param count - The count.
 * @returns True when one does.
 */
function batchHolds(element: Graphty, count: number): boolean {
    const drawing = NodeShaderDrawing.peek(element.graph.getScene());
    return drawing !== undefined && [...drawing.stats().slots.values()].includes(count);
}

/**
 * How many nodes the element draws on the mesh path.
 * @param element - The element.
 * @returns The count.
 */
function meshPathCount(element: Graphty): number {
    return NodeShaderDrawing.peek(element.graph.getScene())?.stats().meshPath ?? 0;
}

/**
 * Read one pixel of the canvas at a point in CSS pixels, after the next frame.
 * @param element - The element.
 * @param point - The point.
 * @returns r, g, b, a.
 */
async function pixelAt(element: Graphty, point: Point): Promise<[number, number, number, number]> {
    const { engine } = element.graph;
    await drawnFrames(element.graph.getScene(), 2);
    const scale = engine.getRenderWidth() / WIDTH;
    const x = Math.round(point.x * scale);
    const y = Math.round(engine.getRenderHeight() - point.y * scale);
    const read = (await engine.readPixels(x, y, 1, 1)) as unknown as Uint8Array;
    return [read[0], read[1], read[2], read[3]];
}

/**
 * The node's center and the point a multiple of its radius to its right, on screen.
 * @param element - The element.
 * @param id - The node.
 * @param radii - How many radii out.
 * @returns The two points.
 */
function screenPoints(element: Graphty, id: string, radii: number): { center: Point; out: Point } {
    const node = nodeOf(element, id);
    const at = node.mesh.getAbsolutePosition();
    const radius = node.roundRadius ?? node.size / 2;
    const center = element.worldToScreen(at);
    const out = element.worldToScreen(at.add(new Vector3(radius * radii, 0, 0)));
    return { center, out };
}

/**
 * Whether two colors agree within a tolerance per channel.
 * @param a - One.
 * @param b - The other, as #rrggbb.
 * @returns True when they do.
 */
function sameColor(a: readonly number[], b: string): boolean {
    const want = [1, 3, 5].map((at) => Number.parseInt(b.slice(at, at + 2), 16));
    return want.every((value, i) => Math.abs(value - a[i]) <= 3);
}

describe("node surfaces", () => {
    it("a surface over a Degree layer takes each node's degree color, on the mesh path and the impostor", async () => {
        const nodes = [
            { id: "hub", x: -6, y: 0 },
            { id: "a", x: 0, y: 4 },
            { id: "b", x: 0, y: -4 },
            { id: "box", x: 6, y: 0 },
        ];
        const element = await mounted(nodes, [], {
            edges: [
                { source: "hub", target: "a" },
                { source: "hub", target: "b" },
                { source: "hub", target: "box" },
            ],
        });
        const run = element.session.runs.start("degree", {}, { as: "degree" });
        await run;
        await element.session.styles.encode({ run: run.id, channel: "node.color" });
        await element.session.styles.add({
            name: "Boxes",
            target: "node",
            selector: { match: "ids", nodes: ["box"] },
            set: { "node.shape": "box" },
        });
        await element.session.styles.add({
            name: "Flat",
            target: "node",
            selector: { match: "everything" },
            set: { "node.shaders": [{ shader: "e3/flat" }] },
        });
        await operationQueueOf(element.graph).waitForCompletion();
        await until(
            element,
            "every node is drawn by its shader path",
            () => meshPathCount(element) === 1 && batchHolds(element, 3),
        );

        const fills = new Set<string>();
        for (const { id } of nodes) {
            const fill = nodeOf(element, id).drawnFill;
            assert.isNotNull(fill);
            fills.add(fill.slice(0, 7));
            const { center } = screenPoints(element, id, 0);
            const pixel = await pixelAt(element, center);
            assert.isTrue(
                sameColor(pixel, fill),
                `${id} is drawn flat in its degree color ${fill}, read ${pixel.join(",")}`,
            );
        }

        assert.isAtLeast(fills.size, 2, "the degree layer colors nodes apart");
    });
});

describe("plain nodes beside shaded ones", () => {
    it("a plain sphere stays drawn when a sphere of the same look draws on the impostor batch", async () => {
        const element = await mounted(
            [
                { id: "shaded", x: -3, y: 0 },
                { id: "plain", x: 3, y: 0 },
            ],
            [
                { name: "Color", target: "node", selector: { match: "everything" }, set: { "node.color": "#3366cc" } },
                {
                    name: "Flat",
                    target: "node",
                    selector: { match: "ids", nodes: ["shaded"] },
                    set: { "node.shaders": [{ shader: "e3/flat" }] },
                },
            ],
        );
        await until(element, "the shaded sphere is drawn on the batch", () => batchHolds(element, 1));
        const pixel = await pixelAt(element, screenPoints(element, "plain", 0).center);
        assert.notDeepEqual(pixel.slice(0, 3), [245, 245, 245], "the plain sphere is drawn");
    });
});

describe("node sprites", () => {
    it("are picked by a real click inside their radius and not outside it", async () => {
        const element = await mounted(
            [
                { id: "a", x: -3, y: 0 },
                { id: "b", x: 3, y: 0 },
            ],
            [
                {
                    name: "Sticker",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.shaders": [{ shader: "e3/sticker" }], "node.color": "#3366cc" },
                },
            ],
        );
        await until(element, "the sprites are drawn", () => batchHolds(element, 2));

        const { center, out } = screenPoints(element, "b", 1.25);
        const pixel = await pixelAt(element, center);
        assert.isTrue(sameColor(pixel, "#3366cc"), `the sprite draws its color, read ${pixel.join(",")}`);

        await click(element, out);
        await drawnFrames(element.graph.getScene(), 3);
        assert.isNull(element.getSelectedNode(), "a click outside the radius selects nothing");

        await click(element, center);
        await drawnFrames(element.graph.getScene(), 3);
        assert.strictEqual(element.getSelectedNode()?.id, "b", "a click inside the radius selects the sprite's node");
    });

    it("draws the halo and the label on a selected sprite node", async () => {
        const element = await mounted(
            [
                { id: "a", x: -3, y: 0 },
                { id: "b", x: 3, y: 0 },
            ],
            [
                {
                    name: "Sticker",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.shaders": [{ shader: "e3/sticker" }], "node.color": "#3366cc", "node.label": "Bee" },
                },
            ],
        );
        await until(element, "the sprites are drawn", () => batchHolds(element, 2));
        const { center, out } = screenPoints(element, "b", 1.2);
        const before = await pixelAt(element, out);

        await click(element, center);
        await drawnFrames(element.graph.getScene(), 3);
        assert.strictEqual(element.getSelectedNode()?.id, "b");

        const after = await pixelAt(element, out);
        assert.notDeepEqual(after, before, "the halo is drawn round the sprite's radius");
        const label = nodeOf(element, "b").label?.labelMesh;
        assert.isOk(label, "the selected sprite node draws its label");
        assert.isTrue(label.isEnabled() && label.isVisible, "the label is drawn");
    });
});

describe("node effects", () => {
    it("a loop effect holds a frame claim on screen and releases it off screen", async () => {
        const element = await mounted(
            [{ id: "a", x: 0, y: 0 }],
            [
                {
                    name: "Spin",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.shaders": [{ shader: "e3/spin" }] },
                },
            ],
        );
        const scene = element.graph.getScene();
        await until(element, "the effect is drawn", () => batchHolds(element, 1));
        await drawnFrames(scene, 2);
        assert.isAbove(everyFrameAnimationsOn(scene), 0, "a loop on screen keeps the frames coming");

        nodeOf(element, "a").setMeshPosition(100_000, 0, 0);
        await drawnFrames(scene, 2);
        assert.strictEqual(everyFrameAnimationsOn(scene), 0, "a loop on a node off screen claims no frame");
    });

    it("select all on 500 nodes with a reticle layer plays at most 64 entrances", async () => {
        const nodes = Array.from({ length: 500 }, (_, i) => ({
            id: `n${String(i)}`,
            x: (i % 25) - 12,
            y: Math.floor(i / 25) - 10,
        }));
        const element = await mounted(nodes, [
            {
                name: "Reticle",
                target: "node",
                selector: { match: "state", state: "selected" },
                set: { "node.shaders": [{ shader: "e3/reticle" }] },
            },
        ]);
        // The effect resolves on first use; one node selected first loads it.
        await element.session.selection.apply({ nodes: ["n0"] });
        await until(element, "the reticle batch is drawn", () => batchHolds(element, 1));
        element.session.selection.clear();
        await until(
            element,
            "the reticle left",
            () => ![...drawingOf(element).stats().slots.values()].some((n) => n > 0),
        );

        await element.session.selection.apply({ nodes: nodes.map((node) => node.id) });
        await until(element, "every selected node carries the reticle", () => batchHolds(element, 500));
        const playing = drawingOf(element).stats().entrances.get("e3/reticle") ?? 0;
        assert.isAtMost(playing, 64, "at most 64 entrances play at once");
        assert.isAbove(playing, 0, "the selection's entrances play");
    });

    it("adding a reticle layer over selected nodes shows them at rest", async () => {
        const element = await mounted(
            [
                { id: "a", x: -3, y: 0 },
                { id: "b", x: 3, y: 0 },
            ],
            [],
        );
        await element.session.selection.apply({ nodes: ["a", "b"] });
        // Already selected means drawn selected: the element applies a selection to its nodes on
        // its next update, and a state change that lands with the layer is a cause like a click.
        await until(element, "the selection reaches the nodes", () =>
            ["a", "b"].every((id) => nodeOf(element, id).isSelected()),
        );
        await element.session.styles.add({
            name: "Reticle",
            target: "node",
            selector: { match: "state", state: "selected" },
            set: { "node.shaders": [{ shader: "e3/reticle" }] },
        });
        await until(element, "both reticles are drawn", () => batchHolds(element, 2));
        assert.strictEqual(
            drawingOf(element).stats().entrances.get("e3/reticle") ?? 0,
            0,
            "a layer's own add plays no entrance",
        );
    });
});

describe("loops and the active-mesh freeze", () => {
    it("pixels change between frames on a frozen mesh-path material", async () => {
        const element = await mounted(
            [{ id: "a", x: 0, y: 0 }],
            [
                {
                    name: "Pulse",
                    target: "node",
                    selector: { match: "everything" },
                    set: {
                        "node.shape": "box",
                        "node.shaders": [{ shader: "e3/pulse", params: { speed: 0.9 } }],
                    },
                },
            ],
        );
        await until(element, "the box draws on the mesh path", () => meshPathCount(element) === 1);
        const scene = element.graph.getScene();
        await until(element, "the active meshes freeze", () => scene._activeMeshesFrozen);
        const { center } = screenPoints(element, "a", 0);
        const first = await pixelAt(element, center);
        let second = first;
        for (let i = 0; i < 120 && second[0] === first[0]; i++) {
            second = await pixelAt(element, center);
        }

        assert.notStrictEqual(second[0], first[0], "the time moved the frozen material's pixels");
        assert.isTrue(scene._activeMeshesFrozen, "and the active meshes stayed frozen");
    });

    // One element for both tests below, split so neither waits on the other's half: filling the
    // batch with 10,000 nodes is one long paint, and 30 frames of 10,000 impostors on a software
    // GPU (SwiftShader, as in CI) are as long again. The second test reads the element the first
    // one filled, so they run in this order.
    describe("with 10,000 nodes and a loop shader", () => {
        let element: Graphty | undefined;
        let remove: (() => void) | undefined;

        beforeAll(async () => {
            // One node first, so the shader has loaded and compiled before the rest arrive: they
            // are then drawn on the batch from their first paint, never as 10,000 plain spheres
            // first.
            element = await mounted(
                [{ id: "n0", x: -50, y: -50 }],
                [
                    {
                        name: "Pulse",
                        target: "node",
                        selector: { match: "everything" },
                        set: { "node.shaders": [{ shader: "e3/pulse" }] },
                    },
                ],
            );
            // This element outlives one test: it is removed after the last of them, not after each.
            remove = cleanups.pop();
        });

        afterAll(() => {
            remove?.();
        });

        it("draws every node on the impostor batch", async () => {
            const filled = element;
            assert.isDefined(filled);
            await until(filled, "the first node draws on the impostor batch", () => batchHolds(filled, 1));
            // The loop must keep running for the next test to measure anything. A software GPU
            // drawing 10,000 impostors falls behind, and the frame guard would (rightly) step down
            // to half rate and then pause shader motion, which releases the claim it watches.
            filled.shaderSettings = { guard: false };
            const nodes = Array.from({ length: 10_000 }, (_, i) => ({
                id: `n${String(i)}`,
                position: { x: (i % 100) - 50, y: Math.floor(i / 100) - 50, z: 0 },
            }));
            await filled.session.data.addNodes(nodes.slice(1));
            await operationQueueOf(filled.graph).waitForCompletion();
            await until(filled, "every node draws on the impostor batch", () => batchHolds(filled, 10_000));
        });

        it("keeps the active meshes frozen across 30 frames", async () => {
            const filled = element;
            assert.isDefined(filled);
            assert.isTrue(batchHolds(filled, 10_000), "the test before filled the batch");
            const scene = filled.graph.getScene();
            await until(filled, "the active meshes freeze", () => scene._activeMeshesFrozen);
            let unfrozen = 0;
            const observer = scene.onAfterRenderObservable.add(() => {
                unfrozen += scene._activeMeshesFrozen ? 0 : 1;
            });
            try {
                // 30 frames: a software GPU (SwiftShader, as in CI) draws 10,000 impostors at about
                // 10 frames a second, so 120 frames alone outran the test's time limit.
                await drawnFrames(scene, 30);
            } finally {
                scene.onAfterRenderObservable.remove(observer);
            }

            assert.strictEqual(unfrozen, 0, "no frame of the loop unfroze the active meshes");
            assert.isAbove(everyFrameAnimationsOn(scene), 0, "the loop holds its frame claim the whole time");
        });
    });
});
