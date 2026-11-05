/**
 * @file The edge presets drawn by the element (design/rendering/shader-styles.md sections 7.4 and
 * 8, package P5): fiber optic, light packets, comets, edge glow and edge change.
 *
 * Each parameter at each end of its range draws without a NaN; each preset draws on a real graph;
 * the effects are placed on the line's own route and light pixels along straight, curved and bent
 * edges alike; a still preset claims no frame, a loop rests at speed 0; the glowing ones allocate
 * the shared bloom; and edge change plays when an edge arrives and keeps a removed edge drawn for
 * its 0.5 s exit and never longer.
 */

import "../../../../src/graphty-element";

import { type AbstractMesh, type ShaderMaterial, Vector3 } from "@babylonjs/core";
import { afterAll, afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../../index.js";
import { clearRegisteredShadersForTesting, registerShader } from "../../../../src/catalog/shaderRegistry";
import {
    drawingOf,
    isClockBinding,
    type ShaderDescriptor,
    type ShaderParamDescriptor,
    type ShaderParams,
    timingOf,
} from "../../../../src/catalog/shaders";
import type { LayerSpec } from "../../../../src/catalog/types";
import type { Edge } from "../../../../src/Edge";
import { operationQueueOf } from "../../../../src/Graph";
import { everyFrameAnimationsOn } from "../../../../src/managers/everyFrameAnimations";
import { BLOOM_LAYER, BloomPass } from "../../../../src/meshes/BloomPass";
import { EdgeEffectBatch } from "../../../../src/meshes/EdgeEffectBatch";
import { EdgeShaderDrawing } from "../../../../src/meshes/EdgeShaderDrawing";
import { EDGE_PRESETS, presetId } from "../../../../stories/shaders/edgePresets";
import { drawnFrames } from "../../../helpers/drawn-frames";

const WIDTH = 400;
const HEIGHT = 300;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

afterAll(() => {
    clearRegisteredShadersForTesting();
});

/** An edge to add: its ends and the data it carries. */
interface EdgeIn {
    readonly source: string;
    readonly target: string;
    readonly [key: string]: unknown;
}

/**
 * A mounted element drawing in 2D, with nodes at fixed places.
 * @param nodes - The nodes.
 * @param edges - The edges.
 * @param layers - Layers added after the data.
 * @param motion - The reader's motion setting.
 * @returns The element.
 */
async function mounted(
    nodes: readonly { id: string; x: number; y: number }[],
    edges: readonly EdgeIn[],
    layers: readonly LayerSpec[],
    motion: "on" | "off" = "on",
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
    element.shaderSettings = { quality: "high", motion };
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes(nodes.map(({ id, x, y }) => ({ id, position: { x, y, z: 0 } })));
    await element.session.data.addEdges(edges.map((edge) => ({ ...edge })));
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
 * The edges of the graph, in the order they were added.
 * @param element - The element.
 * @returns The edges.
 */
function edgesOf(element: Graphty): Edge[] {
    return [...element.graph.getDataManager().edges.values()];
}

/**
 * The live slots of every edge shader batch, and the slots kept for an exit.
 * @param element - The element.
 * @returns The counts.
 */
function slots(element: Graphty): { live: number; exiting: number } {
    const stats = EdgeShaderDrawing.peek(element.graph.getScene())?.stats();
    return {
        live: [...(stats?.slots.values() ?? [])].reduce((sum, count) => sum + count, 0),
        exiting: stats?.exiting ?? 0,
    };
}

/**
 * Whether every edge shader batch's program compiled.
 * @param element - The element.
 * @returns True once each edge surface and edge effect batch has a compiled program.
 */
function compiled(element: Graphty): boolean {
    const meshes = element.graph
        .getScene()
        .meshes.filter((mesh) => /^edge-(surface|effect)\|/.test(mesh.name) && !mesh.isDisposed());
    return (
        meshes.length > 0 &&
        meshes.every((mesh) => (mesh.material as ShaderMaterial | null)?.getEffect()?.isReady() === true)
    );
}

/**
 * The canvas pixels of a square around a world point, after the next frames.
 * @param element - The element.
 * @param at - The world point.
 * @param half - Half the square's side, in CSS pixels.
 * @returns RGBA, row by row.
 */
async function pixelsAround(
    element: Graphty,
    at: { x: number; y: number; z: number },
    half: number,
): Promise<Uint8Array> {
    const { engine } = element.graph;
    await drawnFrames(element.graph.getScene(), 2);
    const point = element.worldToScreen(at);
    const scale = engine.getRenderWidth() / WIDTH;
    const side = Math.max(1, Math.round(2 * half * scale));
    const x = Math.round((point.x - half) * scale);
    const y = Math.round(engine.getRenderHeight() - (point.y + half) * scale);
    return (await engine.readPixels(x, y, side, side)) as unknown as Uint8Array;
}

/**
 * How many pixels of a block are far from a color.
 * @param pixels - RGBA.
 * @param rgb - The color.
 * @returns The count.
 */
function differing(pixels: Uint8Array, rgb: readonly number[]): number {
    let count = 0;
    for (let at = 0; at < pixels.length; at += 4) {
        const distance =
            Math.abs(pixels[at] - rgb[0]) + Math.abs(pixels[at + 1] - rgb[1]) + Math.abs(pixels[at + 2] - rgb[2]);
        count += distance > 60 ? 1 : 0;
    }

    return count;
}

/**
 * The values to try a parameter at: each end of its range, black and white for a color, both for
 * a boolean.
 * @param param - The parameter.
 * @returns The values.
 */
function endsOf(param: ShaderParamDescriptor): readonly (number | string | boolean)[] {
    // A parameter bound to a clock: each end of what the clock maps onto.
    if (isClockBinding(param.default)) {
        return [...(param.default.range ?? [0, 1])];
    }

    if (param.type === "color") {
        return ["#000000", "#ffffff"];
    }

    return param.type === "boolean" ? [false, true] : [param.min as number, param.max as number];
}

/**
 * Register a probe of a preset: the same descriptor, with `shade` wrapped to draw pure magenta
 * where the body's own result is not a number or is infinite. The element's wrapper would
 * otherwise replace such a pixel, which hides it.
 * @param descriptor - The preset.
 * @param body - Its body.
 * @returns The probe's id.
 */
function probeOf(descriptor: ShaderDescriptor, body: string): string {
    const id = `probe/${descriptor.id}`;
    const wrapped = `${body.replace(/\bvec4 shade\s*\(/, "vec4 presetShade(")}
vec4 shade(EdgeInput e) {
    vec4 c = presetShade(e);
    bool bad = any(isnan(c)) || any(isinf(c));
    return bad ? vec4(1.0, 0.0, 1.0, 1.0) : c;
}
`;
    const { origin: _origin, ...facts } = descriptor;
    registerShader({ descriptor: { ...facts, id }, glsl: wrapped });
    return id;
}

/**
 * What a layer sets to draw a shader: one use on `edge.shaders`, at its own place.
 * @param descriptor - The shader's catalog facts.
 * @param id - The id to name it by.
 * @param params - Its parameters.
 * @returns The `set` of the layer.
 */
function setOf(descriptor: ShaderDescriptor, id: string, params: ShaderParams): Record<string, unknown> {
    return {
        "edge.shaders": [{ shader: id, place: drawingOf(descriptor) === "edge-paint" ? "paint" : "along", params }],
    };
}

const LINE: LayerSpec = {
    name: "Lines",
    target: "edge",
    selector: { match: "everything" },
    set: { "edge.width": 24, "edge.color": "#3366cc" },
};

const TWO_NODES = [
    { id: "a", x: -6, y: 0 },
    { id: "b", x: 6, y: 0 },
];

describe("the edge presets, every parameter at each end of its range", () => {
    it.each(EDGE_PRESETS.map(({ descriptor, body }) => [descriptor.id, descriptor, body] as const))(
        "%s draws without a NaN",
        async (_id, descriptor, body) => {
            const probe = probeOf(descriptor, body);
            const element = await mounted(TWO_NODES, [{ source: "a", target: "b" }], [LINE]);
            const layer = await element.session.styles.add({
                name: "Probe",
                target: "edge",
                selector: { match: "everything" },
                set: setOf(descriptor, probe, {}),
            });
            await until(
                element,
                "the probe draws with a compiled program",
                () => slots(element).live > 0 && compiled(element),
            );
            const sets: ShaderParams[] = [{}];
            for (const param of descriptor.params) {
                for (const value of endsOf(param)) {
                    sets.push({ [param.name]: value });
                }
            }

            const [edge] = edgesOf(element);
            for (const [k, set] of sets.entries()) {
                await element.session.styles.update(layer.id, { set: setOf(descriptor, probe, set) });
                await operationQueueOf(element.graph).waitForCompletion();
                // A timed preset draws only while it plays: change the edge's data to play it.
                if ((timingOf(descriptor).change ?? 0) > 0) {
                    await element.session.data.updateEdges([{ id: edge.id, values: { k } }]);
                }

                for (const x of [-4, 0, 4]) {
                    const pixels = await pixelsAround(element, { x, y: 0, z: 0 }, 8);
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
            }
        },
    );
});

describe("the edge presets on a graph", () => {
    it("fiber optic draws in place of the line's plain color", async () => {
        const element = await mounted(
            TWO_NODES,
            [{ source: "a", target: "b" }],
            [
                LINE,
                {
                    name: "Fiber",
                    target: "edge",
                    selector: { match: "everything" },
                    set: { "edge.shaders": [{ shader: presetId("fiber-optic") }] },
                },
            ],
        );
        await until(element, "the fiber draws", () => slots(element).live > 0 && compiled(element));
        const [edge] = edgesOf(element);
        assert.isTrue((edge.drawnLine?.name ?? "").startsWith("edge-surface|"), "the line is drawn by the surface");
        // The dark glass body is far from the plain blue line it replaces.
        const pixels = await pixelsAround(element, { x: 0, y: 0, z: 0 }, 1);
        assert.isAbove(differing(pixels, [0x33, 0x66, 0xcc]), 0, "the fiber replaces the plain blue");
    });

    /** A straight, a curved and a bent edge, each between its own two nodes. */
    const ROUTES = {
        nodes: [
            { id: "a", x: -6, y: 5 },
            { id: "b", x: 6, y: 5 },
            { id: "c", x: -6, y: 0 },
            { id: "d", x: 6, y: 0 },
            { id: "e", x: -6, y: -5 },
            { id: "f", x: 6, y: -5 },
        ],
        edges: [
            { source: "a", target: "b" },
            { source: "c", target: "d", curved: true },
            { source: "e", target: "f", bent: true },
        ],
        layers: [
            {
                name: "Lines",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.width": 12, "edge.color": "#222222" },
            },
            {
                name: "Curve",
                target: "edge",
                selector: { match: "has", path: "data.curved" },
                set: { "edge.curvature": true },
            },
            {
                name: "Bend",
                target: "edge",
                selector: { match: "has", path: "data.bent" },
                set: { "edge.bends": "0.5,0.2" },
            },
        ] satisfies LayerSpec[],
    };

    it.each(["fiber-packets", "comet-tracers", "neon-line"])(
        "%s is placed on the line's own route and lights it, straight, curved and bent",
        async (id) => {
            const shader = presetId(id);
            const element = await mounted(
                ROUTES.nodes,
                ROUTES.edges,
                [
                    ...ROUTES.layers,
                    {
                        name: "Effect",
                        target: "edge",
                        selector: { match: "everything" },
                        set: { "edge.shaders": [{ shader: shader }] },
                    },
                ],
                "off",
            );
            const edges = edgesOf(element);
            await until(element, "every edge draws its effect", () =>
                edges.every((edge) => edge.drawnEffects.length === 1),
            );
            await until(element, "the effect's program compiled", () => compiled(element));

            for (const [i, edge] of edges.entries()) {
                const [effect] = edge.drawnEffects;
                const line = edge.drawnCurve;
                const route = line ?? [effect.points[0], effect.points[1]];
                if (line === null) {
                    assert.lengthOf(effect.points, 2, "a straight edge's effect is one piece");
                } else {
                    assert.strictEqual(
                        effect.points.length,
                        line.length,
                        `edge ${String(i)}: one piece per piece of the line`,
                    );
                    for (const [k, point] of effect.points.entries()) {
                        assert.isTrue(
                            point.equalsWithEpsilon(line[k], 1e-4),
                            `edge ${String(i)}: point ${String(k)} on the route`,
                        );
                    }
                }

                // Light along the route: sample around points spread along it.
                let lit = 0;
                for (const f of [0.15, 0.3, 0.45, 0.6, 0.75, 0.9]) {
                    const k = f * (route.length - 1);
                    const lo = Math.floor(k);
                    const at = Vector3.Lerp(route[lo], route[Math.min(lo + 1, route.length - 1)], k - lo);
                    const world = Vector3.TransformCoordinates(at, (edge.mesh as AbstractMesh).getWorldMatrix());
                    lit += differing(await pixelsAround(element, world, 3), [0x22, 0x22, 0x22]);
                }

                assert.isAbove(lit, 0, `edge ${String(i)} (${line === null ? "straight" : "routed"}) is lit by ${id}`);
            }
        },
    );
});

describe("motion", () => {
    it("the fiber is still: it claims no frame", async () => {
        const element = await mounted(
            TWO_NODES,
            [{ source: "a", target: "b" }],
            [
                LINE,
                {
                    name: "Fiber",
                    target: "edge",
                    selector: { match: "everything" },
                    set: { "edge.shaders": [{ shader: presetId("fiber-optic") }] },
                },
            ],
        );
        await until(element, "the fiber draws", () => slots(element).live > 0 && compiled(element));
        await drawnFrames(element.graph.getScene(), 3);
        assert.strictEqual(everyFrameAnimationsOn(element.graph.getScene()), 0);
    });

    it.each([
        ["fiber-packets", "speed"],
        ["comet-tracers", "speed"],
        ["neon-line", "glintSpeed"],
    ])("%s claims frames while %s is not 0 and rests at 0", async (id, speed) => {
        const shader = presetId(id);
        const element = await mounted(TWO_NODES, [{ source: "a", target: "b" }], [LINE]);
        const layer = await element.session.styles.add({
            name: "Effect",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.shaders": [{ shader: shader }] },
        });
        const scene = element.graph.getScene();
        await until(element, "a loop on screen keeps the frames coming", () => everyFrameAnimationsOn(scene) > 0);
        await element.session.styles.update(layer.id, {
            set: { "edge.shaders": [{ shader: shader, params: { [speed]: 0 } }] },
        });
        await until(element, "at speed 0 the loop rests", () => everyFrameAnimationsOn(scene) === 0);
    });
});

describe("the shared bloom", () => {
    it.each(["fiber-packets", "comet-tracers", "neon-line"])("%s allocates the bloom pass", async (id) => {
        const element = await mounted(
            TWO_NODES,
            [{ source: "a", target: "b" }],
            [
                LINE,
                {
                    name: "Effect",
                    target: "edge",
                    selector: { match: "everything" },
                    set: { "edge.shaders": [{ shader: presetId(id) }] },
                },
            ],
        );
        const scene = element.graph.getScene();
        await until(element, "the bloom pass is allocated", () =>
            scene.effectLayers.some((layer) => layer.name === BLOOM_LAYER),
        );
    });

    it("draws only the meshes it blooms, and only on a dark canvas", async () => {
        const element = await mounted(
            TWO_NODES,
            [{ source: "a", target: "b" }],
            [
                LINE,
                {
                    name: "Effect",
                    target: "edge",
                    selector: { match: "everything" },
                    set: { "edge.shaders": [{ shader: presetId("comet-tracers") }] },
                },
            ],
        );
        const scene = element.graph.getScene();
        await until(element, "the bloom pass is allocated", () => BloomPass.peek(scene) !== undefined);
        const pass = BloomPass.peek(scene);
        assert.isDefined(pass);
        // An explicit list: without one the bloom map walks every mesh of the scene each frame.
        const list = pass.glow.mainTexture.renderList ?? [];
        await until(element, "the bloom map lists the comets", () => list.length > 0);
        assert.isTrue(
            list.every((mesh) => mesh.name.startsWith("edge-effect|")),
            "holding only the meshes drawing a bloom shader",
        );

        element.background = { backgroundType: "color", color: "#ffffff" };
        await until(element, "on a light canvas the added light is off", () => !pass.glow.isEnabled);
        element.background = { backgroundType: "color", color: "#0d1117" };
        await until(element, "on a dark canvas it is on", () => pass.glow.isEnabled);
    });
});

describe("edge change", () => {
    /**
     * A graph of two edges carrying edge change, at rest.
     * @returns The element.
     */
    async function changing(): Promise<Graphty> {
        const element = await mounted(
            [
                { id: "a", x: -6, y: 2 },
                { id: "b", x: 6, y: 2 },
                { id: "c", x: -6, y: -2 },
            ],
            [
                { source: "a", target: "b" },
                { source: "b", target: "c" },
            ],
            [
                LINE,
                {
                    name: "Changes",
                    target: "edge",
                    selector: { match: "everything" },
                    set: { "edge.shaders": [{ shader: presetId("edge-change") }] },
                },
            ],
        );
        await until(element, "both edges carry the effect", () => slots(element).live === 2);
        return element;
    }

    it("draws nothing at rest and asks for no frame once its layer is added", async () => {
        const element = await changing();
        await drawnFrames(element.graph.getScene(), 3);
        assert.strictEqual(everyFrameAnimationsOn(element.graph.getScene()), 0);
    });

    it("plays when an edge arrives, then rests", async () => {
        const element = await changing();
        const scene = element.graph.getScene();
        await element.session.data.addEdges([{ source: "a", target: "c" }]);
        await until(element, "the arriving edge carries the effect", () => slots(element).live === 3);
        assert.isAbove(everyFrameAnimationsOn(scene), 0, "the arrival plays");
        // The front lights the new edge (a to c, a vertical line at x = -6) in its hot colors while
        // the arrival plays: some frame shows it far from the plain blue.
        let lit = 0;
        while (everyFrameAnimationsOn(scene) > 0) {
            lit += differing(await pixelsAround(element, { x: -6, y: 1, z: 0 }, 1), [0x33, 0x66, 0xcc]);
        }

        assert.isAbove(lit, 0, "the arriving edge lights up from its source");
    });

    it("plays when an edge's data changes, then rests", async () => {
        const element = await changing();
        const scene = element.graph.getScene();
        const [edge] = edgesOf(element);
        await element.session.data.updateEdges([{ id: edge.id, values: { weight: 3 } }]);
        await until(element, "the change plays", () => everyFrameAnimationsOn(scene) > 0);
        await until(element, "the change ends and the graph rests", () => everyFrameAnimationsOn(scene) === 0);
    });

    it("keeps a removed edge drawn for its 0.5 s exit and never longer", async () => {
        const element = await changing();
        const deadlines: number[] = [];
        const retire = EdgeEffectBatch.prototype.retireAt;
        EdgeEffectBatch.prototype.retireAt = function (this: EdgeEffectBatch, index: number, endsMs: number): void {
            deadlines.push(endsMs - performance.now());
            retire.call(this, index, endsMs);
        };
        cleanups.push(() => {
            EdgeEffectBatch.prototype.retireAt = retire;
        });

        const [gone] = edgesOf(element);
        await element.session.data.removeEdges([gone.id]);
        await operationQueueOf(element.graph).waitForCompletion();
        assert.isTrue(gone.isDisposed());
        assert.strictEqual(slots(element).live, 2, "the removed edge is still drawn");
        assert.strictEqual(slots(element).exiting, 1, "while its exit plays");
        assert.lengthOf(deadlines, 1, "one slot kept for the exit");
        assert.isAtMost(deadlines[0], 500, "kept for at most the 0.5 s exit");
        assert.isAbove(deadlines[0], 400, "kept for the exit, not cut short");
        await until(element, "the exit ends and its slot is handed back", () => slots(element).exiting === 0);
        assert.strictEqual(slots(element).live, 1);
    });
});
