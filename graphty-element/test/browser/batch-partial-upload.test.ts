/**
 * Ranged uploads against a real GPU buffer: whatever a batch was asked to do, what WebGL2 holds is
 * what the batch's own arrays hold. test/mesh-testing/batch-partial-upload.test.ts counts the floats
 * of the same uploads at a larger size.
 */
import "../../src/graphty-element";

import { ArcRotateCamera, Buffer, Engine, Mesh, MeshBuilder, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { setDefaultFeatures } from "../../src/features/resolve";
import { ArrowCapBatch } from "../../src/meshes/ArrowCapBatch";
import { CustomLineRenderer } from "../../src/meshes/CustomLineRenderer";
import { EDGE_STATIC_FLOATS, JOIN_TEMPLATE_POSITIONS } from "../../src/meshes/edgeJoinShader";
import { EdgeLineBatch, forceExpandedLines, isEdgeLineBatchMesh } from "../../src/meshes/EdgeLineBatch";
import { batchUploadFrames } from "../../src/meshes/FrameRoster";
import { drawnFrames } from "../helpers/drawn-frames";

// The timeline is an experiment: the element tests below switch it on or off themselves.
beforeAll(() => {
    setDefaultFeatures(["timeline"]);
});

const SLOTS = 512;
const VERTICES = JOIN_TEMPLATE_POSITIONS.length / 3;

/** One GPU buffer and the array it must equal. */
interface Mirror {
    readonly name: string;
    readonly buffer: Buffer;
    /** One row per slot. */
    readonly rows: Float32Array;
    readonly width: number;
    /** How many times the GPU buffer repeats a row. */
    readonly spread: number;
}

/** A batch's writes, the same few for lines and caps. */
interface Writes {
    readonly mesh: Mesh;
    readonly drawnCount: number;
    place(slot: number, seed: number): void;
    hide(slot: number): void;
    release(slot: number): void;
    acquire(): number;
    mirrors(): readonly Mirror[];
}

const cleanups: (() => void)[] = [];
let mounted: Graphty | null = null;

afterEach(() => {
    forceExpandedLines(null);
    vi.restoreAllMocks();
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }

    mounted?.remove();
    mounted = null;
});

/**
 * A scene on a real WebGL2 engine.
 * @returns The scene.
 */
function webgl2Scene(): Scene {
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    const engine = new Engine(canvas, false);
    assert.strictEqual(engine.webGLVersion, 2);
    const scene = new Scene(engine);
    scene.activeCamera = new ArcRotateCamera("camera", 0, 0, 10, Vector3.Zero(), scene);
    cleanups.push(() => {
        engine.dispose();
        canvas.remove();
    });
    return scene;
}

/**
 * What a GPU buffer holds.
 * @param scene - Its scene.
 * @param buffer - The buffer.
 * @param floats - How many floats to read.
 * @returns The floats.
 */
function gpuFloats(scene: Scene, buffer: Buffer, floats: number): Float32Array {
    const engine = scene.getEngine() as Engine;
    const gl = engine._gl;
    engine.bindArrayBuffer(buffer.getBuffer());
    const out = new Float32Array(floats);
    gl.getBufferSubData(gl.ARRAY_BUFFER, 0, out);
    return out;
}

/**
 * Assert each GPU buffer holds what the batch's arrays hold.
 * @param scene - The scene.
 * @param batch - The batch.
 * @param when - What just happened, for the message.
 */
function assertGpuEqualsArrays(scene: Scene, batch: Writes, when: string): void {
    assert.strictEqual((scene.getEngine() as Engine)._gl.getError(), 0, `${when}: no GL error`);
    for (const { name, buffer, rows, width, spread } of batch.mirrors()) {
        const gpu = gpuFloats(scene, buffer, batch.drawnCount * spread * width);
        let wrong = 0;
        for (let at = 0; at < gpu.length; at++) {
            const row = Math.floor(at / (width * spread));
            wrong += Number(gpu[at] !== rows[row * width + (at % width)]);
        }

        assert.strictEqual(wrong, 0, `${when}: floats of ${name} that differ from the array`);
    }
}

/**
 * The GPU-side view of a line batch.
 * @param batch - The batch.
 * @returns Its mirrors.
 */
function lineMirrors(batch: EdgeLineBatch): readonly Mirror[] {
    const { slots, statics, matrices, expanded, stride } = batch as unknown as {
        slots: Float32Array;
        statics: Float32Array | null;
        matrices: Float32Array | null;
        expanded: object | null;
        stride: number;
    };
    const spread = expanded === null ? 1 : VERTICES;
    const wrapper = (kind: string): Buffer => {
        const buffer = batch.mesh.getVertexBuffer(kind)?.getWrapperBuffer();
        assert.exists(buffer, kind);
        return buffer;
    };

    if (matrices !== null) {
        return [{ name: "world0", buffer: wrapper("world0"), rows: matrices, width: 16, spread: 1 }];
    }

    return [
        { name: "slots", buffer: wrapper("pA"), rows: slots, width: stride, spread },
        ...(statics === null
            ? []
            : [{ name: "statics", buffer: wrapper("edgeColorA"), rows: statics, width: EDGE_STATIC_FLOATS, spread }]),
    ];
}

/**
 * Writes on a line batch.
 * @param batch - The batch.
 * @returns Them.
 */
function lineWrites(batch: EdgeLineBatch): Writes {
    return {
        mesh: batch.mesh,
        get drawnCount() {
            return batch.drawnCount;
        },
        place: (slot, seed) => {
            batch.place(slot, new Vector3(seed, 1, 2), new Vector3(3, seed, 5));
            batch.writeStatic(slot, new Float32Array(EDGE_STATIC_FLOATS).fill(seed));
        },
        hide: (slot) => {
            batch.setDrawn(slot, false);
        },
        release: (slot) => {
            batch.release(slot);
        },
        acquire: () => batch.acquire(),
        mirrors: () => lineMirrors(batch),
    };
}

/**
 * Writes on a cap batch.
 * @param batch - The batch.
 * @returns Them.
 */
function capWrites(batch: ArrowCapBatch): Writes {
    const held = batch as unknown as {
        matrices: Float32Array;
        billboard: Record<string, Float32Array>;
        highWater: number;
    };
    const wrapper = (kind: string): Buffer => {
        const buffer = batch.mesh.getVertexBuffer(kind)?.getWrapperBuffer();
        assert.exists(buffer, kind);
        return buffer;
    };

    return {
        mesh: batch.mesh,
        get drawnCount() {
            return held.highWater;
        },
        place: (slot, seed) => {
            batch.placeAt(slot, new Vector3(seed, 1, 2), new Vector3(0, seed, 1));
            batch.setAppearance(slot, seed + 1, "#ff8000");
            batch.setClip(slot, seed / 2);
        },
        hide: (slot) => {
            batch.setDrawn(slot, false);
        },
        release: (slot) => {
            batch.release(slot);
        },
        acquire: () => batch.acquire(),
        mirrors: () => [
            { name: "world0", buffer: wrapper("world0"), rows: held.matrices, width: 16, spread: 1 },
            ...[
                ["arrowDirection", 3],
                ["arrowSize", 1],
                ["arrowColor", 3],
                ["arrowClip", 1],
            ].map(([kind, width]) => ({
                name: kind as string,
                buffer: wrapper(kind as string),
                rows: held.billboard[kind],
                width: width as number,
                spread: 1,
            })),
        ],
    };
}

const SHAPES: readonly { name: string; make: (scene: Scene) => Writes }[] = [
    { name: "plain", make: (scene) => lineWrites(joined(scene, false, false)) },
    { name: "widened", make: (scene) => lineWrites(joined(scene, false, true)) },
    { name: "expanded", make: (scene) => lineWrites(joined(scene, true, false)) },
    { name: "expanded and widened", make: (scene) => lineWrites(joined(scene, true, true)) },
    { name: "matrix", make: (scene) => lineWrites(new EdgeLineBatch(new Mesh("edge-style-test", scene), scene)) },
    {
        name: "caps",
        make: (scene) => capWrites(new ArrowCapBatch(MeshBuilder.CreateBox("cap", {}, scene), "3d|test", scene, true)),
    },
];

function joined(scene: Scene, expanded: boolean, widened: boolean): EdgeLineBatch {
    forceExpandedLines(expanded);
    const mesh = CustomLineRenderer.createJoinedLineMesh({ width: 0.2, color: "#336699", widened }, scene);
    return new EdgeLineBatch(mesh, scene);
}

/**
 * A batch with every slot placed and uploaded, and ranged uploads on from here.
 * @param scene - The scene.
 * @param make - Builds the batch.
 * @returns The batch.
 */
function settled(scene: Scene, make: (scene: Scene) => Writes): Writes {
    const batch = make(scene);
    for (let i = 0; i < SLOTS; i++) {
        batch.place(batch.acquire(), i);
    }

    scene.render();
    batchUploadFrames.rangedUploads(scene).on = true;
    return batch;
}

/**
 * Lose the GL context and get it back, as Babylon and the element see it.
 * @param scene - The scene.
 */
async function loseAndRestore(scene: Scene): Promise<void> {
    const engine = scene.getEngine() as Engine;
    const canvas = engine.getRenderingCanvas();
    assert.isNotNull(canvas);
    const back = new Promise<void>((resolve) => {
        engine.onContextRestoredObservable.addOnce(() => {
            resolve();
        });
    });
    canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    canvas.dispatchEvent(new Event("webglcontextrestored"));
    await back;
    batchUploadFrames.contextRestored(scene);
}

describe("ranged uploads on a real GPU buffer", () => {
    for (const { name, make } of SHAPES) {
        describe(name, () => {
            it("holds the arrays after 200 seeded place, hide and release operations", () => {
                const scene = webgl2Scene();
                const batch = settled(scene, make);
                const update = vi.spyOn(Buffer.prototype, "updateDirectly");
                const held = Array.from({ length: SLOTS }, (_, i) => i);
                let seed = 20_261_105;
                const next = (limit: number): number => {
                    seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
                    return Math.floor((seed / 4_294_967_296) * limit);
                };

                for (let op = 0; op < 200; op++) {
                    const at = next(held.length);
                    const slot = held[at];
                    const kind = next(3);
                    if (kind === 0) {
                        batch.place(slot, op);
                    } else if (kind === 1) {
                        batch.hide(slot);
                    } else {
                        batch.release(slot);
                        held[at] = batch.acquire();
                        batch.place(held[at], op);
                    }

                    if (op % 10 === 9) {
                        scene.render();
                        assertGpuEqualsArrays(scene, batch, `after operation ${String(op)}`);
                    }
                }

                assert.isAbove(update.mock.calls.length, 0);
            });

            it("keeps every slot when the batch grows during a step", () => {
                const scene = webgl2Scene();
                const batch = settled(scene, make);

                batch.hide(100);
                const extra = batch.acquire();
                batch.place(extra, 7);
                batch.place(200, 8);
                scene.render();

                assert.strictEqual(batch.drawnCount, SLOTS + 1);
                assertGpuEqualsArrays(scene, batch, "after growing");
            });

            it("a lost context after a dirty run at slot 0 is restored at full size", async () => {
                const scene = webgl2Scene();
                const batch = settled(scene, make);

                // Alone: a later run's upload would clear what a run at slot 0 left in the buffer.
                batch.place(0, 3);
                scene.render();
                await loseAndRestore(scene);
                scene.render();

                const gl = (scene.getEngine() as Engine)._gl;
                for (const { buffer, width, spread } of batch.mirrors()) {
                    (scene.getEngine() as Engine).bindArrayBuffer(buffer.getBuffer());
                    assert.isAtLeast(
                        gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE) as number,
                        SLOTS * spread * width * 4,
                    );
                }

                assertGpuEqualsArrays(scene, batch, "after the restore");
                batch.hide(5);
                scene.render();
                assertGpuEqualsArrays(scene, batch, "on the next ranged upload");
            });
        });
    }
});

describe("the element's switch", () => {
    /**
     * A graph of timed edges, with no window yet.
     * @param features - The element's `features` attribute.
     * @returns The element.
     */
    async function timedElement(features: string): Promise<Graphty> {
        const element = document.createElement("graphty-element");
        element.style.width = "400px";
        element.style.height = "300px";
        element.style.display = "block";
        element.viewMode = "2d";
        element.setAttribute("features", features);
        document.body.appendChild(element);
        mounted = element;
        await element.updateComplete;
        await vi.waitFor(() => {
            assert.isTrue(element.graph.initialized, "the element initialised its graph");
        });
        await element.graph.setLayout("random");
        element.dataSource = "json";
        element.dataSourceConfig = {
            data: JSON.stringify({
                nodes: Array.from({ length: 300 }, (_, at) => ({ id: `n${String(at)}` })),
                edges: Array.from({ length: 1_500 }, (_, at) => ({
                    src: `n${String(at % 300)}`,
                    dst: `n${String((at * 7 + 1 + Math.floor(at / 300)) % 300)}`,
                    t: at,
                })),
            }),
        };
        await element.waitForSettled();
        return element;
    }

    async function drawn(element: Graphty): Promise<void> {
        await element.waitForSettled();
        await element.waitForStableFrame();
        await drawnFrames(element.graph.getScene(), 2);
    }

    it("is on only while a window is in force, and a step then sends runs of the edge buffers", async () => {
        const element = await timedElement("timeline");
        element.setAttribute("edge-time-path", "t");
        const scene = element.graph.getScene();
        await element.session.time.setField({ edges: { start: "t" } });
        await element.session.time.ready;
        await drawn(element);
        const { on } = batchUploadFrames.rangedUploads(scene);
        assert.isFalse(on, "no window yet");

        await element.session.time.window({ from: 500, to: 600, step: 10, nodes: "ends" });
        await element.session.time.seek(510, { commit: false });
        await drawn(element);
        assert.isTrue(batchUploadFrames.rangedUploads(scene).on, "a window is in force");

        const lines = new Set(
            scene.meshes.filter(isEdgeLineBatchMesh).map((mesh) => mesh.getVertexBuffer("pA")?.getWrapperBuffer()),
        );
        const sent: { floats: number; whole: boolean }[] = [];
        const upload = Buffer.prototype.updateDirectly;
        vi.spyOn(Buffer.prototype, "updateDirectly").mockImplementation(function (
            this: Buffer,
            ...args: Parameters<Buffer["updateDirectly"]>
        ) {
            const [data] = args;
            if (lines.has(this) && data instanceof Float32Array) {
                sent.push({ floats: data.length, whole: data.length * 4 === data.buffer.byteLength });
            }

            upload.apply(this, args);
        });

        await element.session.time.seek(520, { commit: false });
        await drawn(element);

        assert.isAbove(sent.length, 0, "the step reached the edge buffers");
        assert.isFalse(
            sent.some(({ whole }) => whole),
            "and sent none of them whole",
        );

        await element.session.time.window(null);
        await drawn(element);
        assert.isFalse(batchUploadFrames.rangedUploads(scene).on, "the window is gone");
    });

    it("stays off with the timeline off", async () => {
        const element = await timedElement("");
        await drawn(element);

        assert.isFalse(batchUploadFrames.rangedUploads(element.graph.getScene()).on);
    });
});
