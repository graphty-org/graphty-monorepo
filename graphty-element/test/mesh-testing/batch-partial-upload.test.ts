/**
 * What a batch sends to the GPU while ranged uploads are on: the slots written, in runs, and the
 * whole buffer in every case a run cannot answer for. The engine counts the floats it is handed;
 * test/browser/batch-partial-upload.test.ts reads the same uploads back out of a real GPU buffer.
 */
import { ArcRotateCamera, Buffer, Mesh, MeshBuilder, NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { ArrowCapBatch } from "../../src/meshes/ArrowCapBatch";
import { CustomLineRenderer } from "../../src/meshes/CustomLineRenderer";
import { MAX_RUNS } from "../../src/meshes/DirtyRuns";
import { EDGE_STATIC_FLOATS, JOIN_FLOATS_PER_PIECE, WIDENED_FLOATS_PER_PIECE } from "../../src/meshes/edgeJoinShader";
import { EdgeLineBatch } from "../../src/meshes/EdgeLineBatch";
import { batchUploadFrames } from "../../src/meshes/FrameRoster";

const SLOTS = 100_000;
const MATRIX_FLOATS = 16;
/** Ten slots with gaps between them, none of them slot 0. */
const TEN_SLOTS = Array.from({ length: 10 }, (_, i) => (i + 1) * 9_000);
const SRC = new Vector3(0, 0, 0);
const DST = new Vector3(1, 2, 3);

describe("partial uploads", () => {
    let scene: Scene;
    /** Every upload the engine was handed, in floats. */
    let uploads: number[];

    beforeEach(() => {
        scene = new Scene(new NullEngine());
        // A scene with no camera refuses to render, and rendering is what uploads.
        scene.activeCamera = new ArcRotateCamera("camera", 0, 0, 10, Vector3.Zero(), scene);
        uploads = [];
        vi.spyOn(scene.getEngine(), "updateDynamicVertexBuffer").mockImplementation((_buffer, data, _at, length) => {
            uploads.push((length ?? (data as Float32Array).byteLength) / Float32Array.BYTES_PER_ELEMENT);
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        scene.dispose();
    });

    /** Start counting from a frame with nothing left to upload, with the switch on. */
    function settle(on = true): void {
        scene.render();
        batchUploadFrames.rangedUploads(scene).on = on;
        uploads.length = 0;
    }

    /**
     * What one frame uploaded.
     * @returns Each upload's floats.
     */
    function frame(): number[] {
        scene.render();
        return uploads.splice(0);
    }

    function sum(values: readonly number[]): number {
        return values.reduce((total, value) => total + value, 0);
    }

    /**
     * A batch of joined lines with every slot placed.
     * @param shape - How it is drawn.
     * @param shape.widened - With a static buffer.
     * @param slots - How many slots.
     * @returns The batch.
     */
    function lines({ widened = false }, slots = SLOTS): EdgeLineBatch {
        const mesh = CustomLineRenderer.createJoinedLineMesh({ width: 0.2, color: "#336699", widened }, scene);
        return filled(new EdgeLineBatch(mesh, scene), slots);
    }

    /**
     * A batch drawn from a thin-instance matrix per slot, with every slot placed.
     * @param slots - How many slots.
     * @returns The batch.
     */
    function matrixLines(slots = SLOTS): EdgeLineBatch {
        return filled(new EdgeLineBatch(new Mesh("edge-style-test", scene), scene), slots);
    }

    function filled(batch: EdgeLineBatch, slots: number): EdgeLineBatch {
        for (let i = 0; i < slots; i++) {
            batch.place(batch.acquire(), SRC, DST);
        }

        return batch;
    }

    /**
     * A batch of caps with every slot placed.
     * @param billboard - Whether it reads direction, size and color per slot.
     * @param slots - How many slots.
     * @returns The batch.
     */
    function caps(billboard: boolean, slots = SLOTS): ArrowCapBatch {
        const mesh = MeshBuilder.CreateBox("cap", {}, scene);
        const batch = new ArrowCapBatch(mesh, "3d|test", scene, billboard);
        for (let i = 0; i < slots; i++) {
            batch.placeAt(batch.acquire(), SRC, DST);
        }

        return batch;
    }

    describe("ten hides in a large batch upload ten slots", () => {
        const cases = [
            { name: "plain", make: () => lines({}), floats: JOIN_FLOATS_PER_PIECE },
            { name: "widened", make: () => lines({ widened: true }), floats: WIDENED_FLOATS_PER_PIECE },
            { name: "matrix", make: () => matrixLines(), floats: MATRIX_FLOATS },
            { name: "caps", make: () => caps(false), floats: MATRIX_FLOATS },
        ];

        for (const { name, make, floats } of cases) {
            it(name, () => {
                const batch = make();
                settle();

                for (const slot of TEN_SLOTS) {
                    batch.setDrawn(slot, false);
                }

                assert.deepEqual(
                    frame(),
                    TEN_SLOTS.map(() => floats),
                );
            });
        }

        // The visibility mask hides with park: a joined line writes its one hidden flag, a batch
        // without one zeroes the slot as setDrawn does (issue #6025).
        const parks = [
            { name: "plain", make: () => lines({}), floats: 1 },
            { name: "widened", make: () => lines({ widened: true }), floats: 1 },
            { name: "matrix", make: () => matrixLines(), floats: MATRIX_FLOATS },
            { name: "billboarded caps", make: () => caps(true), floats: 1 },
            { name: "standard caps", make: () => caps(false), floats: MATRIX_FLOATS },
        ];

        for (const { name, make, floats } of parks) {
            it(`${name}, parked by the visibility mask, and shown again`, () => {
                const batch = make();
                settle();

                for (const slot of TEN_SLOTS) {
                    batch.park(slot);
                }

                const expected = TEN_SLOTS.map(() => floats);
                assert.deepEqual(frame(), expected);
                for (const slot of TEN_SLOTS) {
                    assert.isTrue(batch.unpark(slot));
                }

                assert.deepEqual(frame(), expected);
            });
        }

        it("widened, with static values", () => {
            const batch = lines({ widened: true });
            settle();

            for (const slot of TEN_SLOTS) {
                batch.setDrawn(slot, false);
                batch.writeStatic(slot, new Float32Array(EDGE_STATIC_FLOATS).fill(slot));
            }

            assert.strictEqual(sum(frame()), 10 * (WIDENED_FLOATS_PER_PIECE + EDGE_STATIC_FLOATS));
            assert.deepEqual([...(batch.staticOf(TEN_SLOTS[3]) ?? [])].slice(0, 1), [TEN_SLOTS[3]]);
        });

        it("caps with billboard buffers", () => {
            const batch = caps(true);
            settle();

            for (const slot of TEN_SLOTS) {
                batch.placeAt(slot, DST, SRC);
                batch.setAppearance(slot, 2, "#ff0000");
                batch.setClip(slot, 0.5);
            }

            // A matrix, a direction, a size, a color and a clip.
            assert.strictEqual(sum(frame()), 10 * (MATRIX_FLOATS + 3 + 1 + 3 + 1));
        });
    });

    describe("runs", () => {
        it("merges neighbors however they arrive", () => {
            const batch = lines({});
            settle();

            for (const slot of [502, 500, 501, 502, 700]) {
                batch.setDrawn(slot, false);
            }

            assert.deepEqual(frame(), [3 * JOIN_FLOATS_PER_PIECE, JOIN_FLOATS_PER_PIECE]);
        });

        it("keeps the limit's worth of runs, and past it joins the runs nearest each other", () => {
            const batch = lines({});
            settle();
            const spaced = (count: number): void => {
                for (let i = 1; i <= count; i++) {
                    batch.setDrawn(i * 10, false);
                }
            };

            spaced(MAX_RUNS);
            assert.lengthOf(frame(), MAX_RUNS);

            // Slot 12 sits one slot from slot 10's run and seven from slot 20's: it joins 10's.
            spaced(MAX_RUNS);
            batch.setDrawn(12, false);
            const runs = frame();
            assert.lengthOf(runs, MAX_RUNS);
            assert.strictEqual(runs[0], 3 * JOIN_FLOATS_PER_PIECE);
            assert.strictEqual(sum(runs), (MAX_RUNS + 2) * JOIN_FLOATS_PER_PIECE);

            // Every gap the same: the first ones close.
            for (let i = 1; i <= MAX_RUNS + 1; i++) {
                batch.setDrawn(i * 2, false);
            }

            const even = frame();
            assert.lengthOf(even, MAX_RUNS);
            assert.strictEqual(even[0], 3 * JOIN_FLOATS_PER_PIECE);
        });

        it("uploads whole past half the slots", () => {
            const batch = lines({}, 100);
            settle();

            for (let i = 1; i <= 51; i++) {
                batch.setDrawn(i * 1, false);
            }

            assert.deepEqual(frame(), [100 * JOIN_FLOATS_PER_PIECE]);
        });

        it("a layout pass is a whole upload", () => {
            const batch = lines({}, 1_000);
            settle();

            for (let slot = 0; slot < 1_000; slot++) {
                batch.place(slot, DST, SRC);
            }

            assert.deepEqual(frame(), [1_000 * JOIN_FLOATS_PER_PIECE]);
        });

        it("does nothing on a frame with nothing written", () => {
            lines({}, 100);
            settle();

            assert.deepEqual(frame(), []);
        });
    });

    describe("slot 0", () => {
        it("a line batch gives a run at slot 0 its count", () => {
            const batch = lines({});
            settle();
            const update = vi.spyOn(Buffer.prototype, "updateDirectly");

            batch.setDrawn(0, false);
            frame();

            const [data, at, count] = update.mock.calls[0];
            assert.strictEqual((data as Float32Array).length, JOIN_FLOATS_PER_PIECE);
            assert.strictEqual(at, 0);
            assert.strictEqual(count, 1, "with no count Babylon would keep this short view as the buffer's data");
        });

        for (const [name, make] of [
            ["a matrix batch", () => matrixLines()],
            ["a cap batch", () => caps(false)],
        ] as const) {
            it(`${name} uploads whole, because a thin-instance partial update takes no count`, () => {
                const batch = make();
                settle();
                const partial = vi.spyOn(batch.mesh, "thinInstancePartialBufferUpdate");

                batch.setDrawn(0, false);
                batch.setDrawn(50, false);

                assert.deepEqual(frame(), [SLOTS * MATRIX_FLOATS]);
                assert.strictEqual(partial.mock.calls.length, 0);
            });
        }

        it("a cap's billboard buffer still uploads only the run, with its count", () => {
            const batch = caps(true);
            settle();

            batch.setClip(0, 0.25);

            assert.deepEqual(frame(), [1]);
        });
    });

    describe("a write the runs cannot answer for", () => {
        for (const [name, make, floats] of [
            ["lines", () => lines({}), JOIN_FLOATS_PER_PIECE],
            ["caps", () => caps(false), MATRIX_FLOATS],
        ] as const) {
            it(`the switch turning on after a write in the same frame uploads ${name} whole`, () => {
                const batch = make();
                settle(false);

                batch.setDrawn(10, false);
                batchUploadFrames.rangedUploads(scene).on = true;
                batch.setDrawn(20, false);

                assert.deepEqual(frame(), [SLOTS * floats]);
                batch.setDrawn(30, false);
                assert.deepEqual(frame(), [floats], "the next frame is ranged");
            });

            it(`the switch turning off before the upload uploads ${name} whole`, () => {
                const batch = make();
                settle();

                batch.setDrawn(10, false);
                batchUploadFrames.rangedUploads(scene).on = false;

                assert.deepEqual(frame(), [SLOTS * floats]);
            });

            it(`a restored context uploads ${name} whole`, () => {
                const batch = make();
                settle();

                batch.setDrawn(10, false);
                batchUploadFrames.contextRestored(scene);

                // A line batch's hidden flags (one float a slot) go up whole with its slots.
                const flags = name === "lines" ? [SLOTS] : [];
                assert.deepEqual(frame(), [...flags, SLOTS * floats]);
            });
        }

        it("a batch that grows keeps its runs, since the new buffer starts from the array", () => {
            const batch = lines({}, 32);
            settle();

            batch.setDrawn(3, false);
            batch.place(batch.acquire(), SRC, DST);

            assert.deepEqual(frame(), [JOIN_FLOATS_PER_PIECE, JOIN_FLOATS_PER_PIECE]);
        });
    });

    describe("with the switch off", () => {
        it("a line batch makes today's one call", () => {
            const batch = lines({}, 100);
            settle(false);
            const update = vi.spyOn(Buffer.prototype, "updateDirectly");

            for (const slot of [10, 20, 30]) {
                batch.setDrawn(slot, false);
            }

            frame();
            assert.strictEqual(update.mock.calls.length, 1);
            const [data, at, count] = update.mock.calls[0];
            assert.isAbove((data as Float32Array).length, 100 * JOIN_FLOATS_PER_PIECE - 1);
            assert.strictEqual((data as Float32Array).byteOffset, 0);
            assert.strictEqual(at, 0);
            assert.strictEqual(count, 100);
        });

        it("a matrix batch and a cap batch make today's one call", () => {
            for (const batch of [matrixLines(100), caps(false, 100)]) {
                settle(false);
                const updated = vi.spyOn(batch.mesh, "thinInstanceBufferUpdated");
                const partial = vi.spyOn(batch.mesh, "thinInstancePartialBufferUpdate");

                batch.setDrawn(10, false);
                batch.setDrawn(20, false);
                frame();

                assert.deepEqual(updated.mock.calls, [["matrix"]]);
                assert.strictEqual(partial.mock.calls.length, 0);
            }
        });

        it("a billboard buffer makes today's one call for each buffer written", () => {
            const batch = caps(true, 100);
            settle(false);

            batch.setClip(10, 0.5);
            batch.setClip(20, 0.5);

            assert.deepEqual(frame(), [100]);
        });
    });
});
