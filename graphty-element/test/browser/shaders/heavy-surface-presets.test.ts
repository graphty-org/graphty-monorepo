/**
 * @file The heavy and glowing surface presets drawn by the element (design/rendering/shader-styles.md
 * sections 5, 7.1 and 8, package P2): glass marble, gemstone, disco ball, lantern glow and glass.
 *
 * Each parameter at each end of its range draws without a NaN, in the full program and in the
 * small-size program; each preset draws on a real graph in place of the plain look; a still
 * preset and a loop at speed 0 claim no frame while a loop at speed does; the lanterns and the
 * glass allocate the shared bloom; and a heavy preset draws its small-size program for the
 * whole batch while the median node on screen is under 12 px, and its full program when the nodes
 * are large.
 */

import "../../../src/graphty-element";

import { Vector3 } from "@babylonjs/core";
import { afterAll, afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { clearRegisteredShadersForTesting, registerShader } from "../../../src/catalog/shaderRegistry";
import type { ShaderDescriptor, ShaderParamDescriptor, ShaderParams } from "../../../src/catalog/shaders";
import type { LayerSpec } from "../../../src/catalog/types";
import { operationQueueOf } from "../../../src/Graph";
import { everyFrameAnimationsOn } from "../../../src/managers/everyFrameAnimations";
import { BLOOM_LAYER } from "../../../src/meshes/BloomPass";
import { NodeShaderDrawing } from "../../../src/meshes/NodeShaderDrawing";
import { BODY as DISCO_BALL_BODY, LOW_DETAIL as DISCO_BALL_LOW } from "../../../src/shaders/presets/disco-ball/body";
import { DISCO_BALL } from "../../../src/shaders/presets/disco-ball/descriptor";
import { BODY as GEMSTONE_BODY, LOW_DETAIL as GEMSTONE_LOW } from "../../../src/shaders/presets/gemstone/body";
import { GEMSTONE } from "../../../src/shaders/presets/gemstone/descriptor";
import { BODY as GLASS_BODY } from "../../../src/shaders/presets/glass/body";
import { GLASS } from "../../../src/shaders/presets/glass/descriptor";
import {
    BODY as GLASS_MARBLE_BODY,
    LOW_DETAIL as GLASS_MARBLE_LOW,
} from "../../../src/shaders/presets/glass-marble/body";
import { GLASS_MARBLE } from "../../../src/shaders/presets/glass-marble/descriptor";
import { BODY as LANTERN_BODY, LOW_DETAIL as LANTERN_LOW } from "../../../src/shaders/presets/lantern/body";
import { LANTERN } from "../../../src/shaders/presets/lantern/descriptor";
import { drawnFrames } from "../../helpers/drawn-frames";
import type { Point } from "../../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

/** The five presets: catalog entry, full body and small-size body. */
const PRESETS: readonly { descriptor: ShaderDescriptor; body: string; low?: string }[] = [
    { descriptor: GLASS_MARBLE, body: GLASS_MARBLE_BODY, low: GLASS_MARBLE_LOW },
    { descriptor: GEMSTONE, body: GEMSTONE_BODY, low: GEMSTONE_LOW },
    { descriptor: DISCO_BALL, body: DISCO_BALL_BODY, low: DISCO_BALL_LOW },
    { descriptor: LANTERN, body: LANTERN_BODY, low: LANTERN_LOW },
    { descriptor: GLASS, body: GLASS_BODY },
];

const HEAVY = PRESETS.filter((preset) => preset.low !== undefined).map((preset) => preset.descriptor.id);

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

afterAll(() => {
    clearRegisteredShadersForTesting();
});

/**
 * A mounted element drawing in 2D, with nodes at fixed places.
 * @param nodes - The nodes.
 * @param layers - Layers added before the first frame is waited for.
 * @returns The element.
 */
async function mounted(
    nodes: readonly { id: string; x: number; y: number }[],
    layers: readonly LayerSpec[],
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
    element.shaderSettings = { quality: "high", ...element.shaderSettings };
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(nodes.map(({ id, x, y }) => ({ id, position: { x, y, z: 0 } })));
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
 * The impostor batch's mesh, once the element built one.
 * @param element - The element.
 * @returns The mesh, or undefined.
 */
function impostor(element: Graphty): ReturnType<ReturnType<Graphty["graph"]["getScene"]>["getMeshByName"]> | undefined {
    return element.graph
        .getScene()
        .meshes.find((mesh) => mesh.name.startsWith("graphtyNodeimpostor") && !mesh.isDisposed());
}

/**
 * Whether the impostor batch draws all its nodes with a compiled program.
 * @param element - The element.
 * @param count - How many nodes it should hold.
 * @returns True when it does.
 */
function drawsReady(element: Graphty, count: number): boolean {
    const drawing = NodeShaderDrawing.peek(element.graph.getScene());
    const mesh = impostor(element);
    return (
        drawing !== undefined &&
        [...drawing.stats().slots.values()].includes(count) &&
        mesh?.material?.isReady(mesh) === true
    );
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
 * A point a multiple of a node's radius up and to the right of its center, on screen.
 * @param element - The element.
 * @param id - The node.
 * @param radii - How far out; 0 for the center.
 * @returns The point.
 */
function pointOf(element: Graphty, id: string, radii: number): Point {
    const node = element.graph.getNode(id);
    assert.isDefined(node, `the graph holds ${id}`);
    const at = node.mesh.getAbsolutePosition();
    const radius = node.roundRadius ?? node.size / 2;
    return element.worldToScreen(at.add(new Vector3(radius * radii, radius * radii * 0.5, 0)));
}

/**
 * The pixels of the square a node covers on the canvas, after the next frames.
 * @param element - The element.
 * @param id - The node.
 * @returns RGBA rows.
 */
async function nodePixels(element: Graphty, id: string): Promise<Uint8Array> {
    const { engine } = element.graph;
    await drawnFrames(element.graph.getScene(), 2);
    const center = pointOf(element, id, 0);
    const edge = pointOf(element, id, 1);
    const scale = engine.getRenderWidth() / WIDTH;
    const half = Math.max(1, Math.round(Math.abs(edge.x - center.x) * scale));
    const x = Math.round(center.x * scale) - half;
    const y = Math.round(engine.getRenderHeight() - center.y * scale) - half;
    return (await engine.readPixels(x, y, 2 * half, 2 * half)) as unknown as Uint8Array;
}

/**
 * The values to try a parameter at: each end of its range, black and white for a color.
 * @param param - The parameter.
 * @returns The values.
 */
function endsOf(param: ShaderParamDescriptor): readonly (number | string)[] {
    return param.type === "color" ? ["#000000", "#ffffff"] : [param.min as number, param.max as number];
}

/**
 * Register a probe of one body: the same descriptor, with `shade` wrapped to draw pure magenta
 * where the body's own result is not a number or is infinite. The element's wrapper would
 * otherwise replace such a pixel with the color beneath, which hides it.
 * @param descriptor - The preset.
 * @param body - The body to probe.
 * @param tag - Which body, for the id.
 * @returns The probe's id.
 */
function probeOf(descriptor: ShaderDescriptor, body: string, tag: string): string {
    const id = `probe/${descriptor.id}-${tag}`;
    const wrapped = `${body.replace(/\bvec4 shade\s*\(/, "vec4 presetShade(")}
vec4 shade(NodeInput n) {
    vec4 c = presetShade(n);
    bool bad = any(isnan(c)) || any(isinf(c));
    return bad ? vec4(1.0, 0.0, 1.0, 1.0) : c;
}
`;
    const { origin: _origin, ...facts } = descriptor;
    registerShader({ descriptor: { ...facts, id }, glsl: wrapped });
    return id;
}

describe("the heavy and glowing surface presets, every parameter at each end of its range", () => {
    it.each(
        PRESETS.flatMap(({ descriptor, body, low }) => [
            [descriptor.id, "full", descriptor, body] as const,
            ...(low === undefined ? [] : [[descriptor.id, "small", descriptor, low] as const]),
        ]),
    )("%s (%s program) draws without a NaN on a graph", async (_id, tag, descriptor, body) => {
        const probe = probeOf(descriptor, body, tag);
        const element = await mounted(
            [{ id: "a", x: 0, y: 0 }],
            [
                {
                    name: "Probe",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.color": "#3366cc", "node.size": 3, "node.shaders": [{ shader: probe }] },
                },
            ],
        );
        await until(element, "the probe draws with a compiled program", () => drawsReady(element, 1));
        const layer = element.session.styles.list().find((each) => each.name === "Probe");
        assert.isDefined(layer);
        const sets: ShaderParams[] = [{}];
        for (const param of descriptor.params) {
            for (const value of endsOf(param)) {
                sets.push({ [param.name]: value });
            }
        }

        for (const set of sets) {
            await element.session.styles.update(layer.id, {
                set: {
                    "node.color": "#3366cc",
                    "node.size": 3,
                    "node.shaders": [{ shader: probe, params: set }],
                },
            });
            await operationQueueOf(element.graph).waitForCompletion();
            const pixels = await nodePixels(element, "a");
            let marked = 0;
            for (let at = 0; at < pixels.length; at += 4) {
                marked += pixels[at] === 255 && pixels[at + 1] === 0 && pixels[at + 2] === 255 ? 1 : 0;
            }

            assert.strictEqual(
                marked,
                0,
                `${JSON.stringify(set)} draws ${String(marked)} pixels that are not a number`,
            );
        }
    });
});

describe("the heavy and glowing surface presets on a graph", () => {
    it.each(PRESETS.map(({ descriptor }) => [descriptor.id] as const))(
        "%s draws in place of the plain look over a color layer",
        async (id) => {
            const color: LayerSpec = {
                name: "Color",
                target: "node",
                selector: { match: "everything" },
                set: { "node.color": "#3366cc", "node.size": 3 },
            };
            const nodes = [{ id: "a", x: 0, y: 0 }];
            const plain = await mounted(nodes, [color]);
            await plain.waitForStableFrame();
            const before = await pixelAt(plain, pointOf(plain, "a", 0.3));
            plain.remove();

            const element = await mounted(nodes, [
                color,
                {
                    name: "Surface",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.shaders": [{ shader: id }] },
                },
            ]);
            await until(element, "the preset's batch draws with a compiled program", () => drawsReady(element, 1));
            const after = await pixelAt(element, pointOf(element, "a", 0.3));
            const change =
                Math.abs(after[0] - before[0]) + Math.abs(after[1] - before[1]) + Math.abs(after[2] - before[2]);
            assert.isAbove(change, 30, `the preset changes the node's look: ${before.join(",")} -> ${after.join(",")}`);
        },
    );
});

describe("motion", () => {
    it("a still preset claims no frame", async () => {
        const element = await mounted(
            [{ id: "a", x: 0, y: 0 }],
            [
                {
                    name: "Dew",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.shaders": [{ shader: "glass" }] },
                },
            ],
        );
        await until(element, "the glass draws", () => drawsReady(element, 1));
        await drawnFrames(element.graph.getScene(), 3);
        assert.strictEqual(everyFrameAnimationsOn(element.graph.getScene()), 0);
    });

    it.each([
        ["glass-marble", "spin"],
        ["gemstone", "turn"],
        ["disco-ball", "turn"],
        ["lantern", "flicker"],
    ])("%s claims frames while %s is above 0 and rests at 0", async (id, speed) => {
        const element = await mounted(
            [{ id: "a", x: 0, y: 0 }],
            [
                {
                    name: "Surface",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.shaders": [{ shader: id }] },
                },
            ],
        );
        const scene = element.graph.getScene();
        await until(element, "the preset draws", () => drawsReady(element, 1));
        await until(element, "a loop on screen keeps the frames coming", () => everyFrameAnimationsOn(scene) > 0);

        const layer = element.session.styles.list().find((each) => each.name === "Surface");
        assert.isDefined(layer);
        await element.session.styles.update(layer.id, {
            set: { "node.shaders": [{ shader: id, params: { [speed]: 0 } }] },
        });
        await until(element, "at speed 0 the loop rests", () => everyFrameAnimationsOn(scene) === 0);
    });
});

describe("the shared bloom", () => {
    it.each([["lantern"], ["glass"]])("%s allocates the bloom pass", async (id) => {
        const element = await mounted(
            [{ id: "a", x: 0, y: 0 }],
            [
                {
                    name: "Surface",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.shaders": [{ shader: id }] },
                },
            ],
        );
        const scene = element.graph.getScene();
        await until(element, "the bloom pass is allocated", () =>
            scene.effectLayers.some((layer) => layer.name === BLOOM_LAYER),
        );
    });

    it("a glass marble allocates none", async () => {
        const element = await mounted(
            [{ id: "a", x: 0, y: 0 }],
            [
                {
                    name: "Surface",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.shaders": [{ shader: "glass-marble" }] },
                },
            ],
        );
        await until(element, "the marble draws", () => drawsReady(element, 1));
        assert.isFalse(element.graph.getScene().effectLayers.some((layer) => layer.name === BLOOM_LAYER));
    });
});

describe("the small-size program", () => {
    /** 400 nodes in a grid filling the canvas: each is a few pixels across. */
    const GRID = Array.from({ length: 400 }, (_, i) => ({
        id: `s${String(i)}`,
        x: ((i % 20) - 9.5) * 2,
        y: (Math.floor(i / 20) - 9.5) * 2,
    }));

    it.each(HEAVY.map((id) => [id] as const))(
        "%s draws its small-size program while the median node is under 12 px, at rest",
        async (id) => {
            const element = await mounted(GRID, [
                {
                    name: "Surface",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.shaders": [{ shader: id }] },
                },
            ]);
            await until(
                element,
                "the batch draws its small-size program",
                () => impostor(element)?.material?.name.endsWith("low") === true,
            );
        },
    );

    it.each(HEAVY.map((id) => [id] as const))("%s keeps its full program when its nodes are large", async (id) => {
        const element = await mounted(
            [{ id: "a", x: 0, y: 0 }],
            [
                {
                    name: "Surface",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.shaders": [{ shader: id }] },
                },
            ],
        );
        await until(element, "the batch draws", () => drawsReady(element, 1));
        await element.waitForStableFrame();
        assert.isFalse(impostor(element)?.material?.name.endsWith("low"));
    });
});
