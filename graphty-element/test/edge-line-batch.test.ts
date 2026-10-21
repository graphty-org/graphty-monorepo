import { ArcRotateCamera, Buffer, Matrix, Mesh, NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

import { CustomLineRenderer } from "../src/meshes/CustomLineRenderer";
import { EdgeLineBatch, segmentMatrixToRef } from "../src/meshes/EdgeLineBatch";
import { EdgeMesh } from "../src/meshes/EdgeMesh";
import { assertScalesLinearly } from "./helpers/cost";

describe("EdgeLineBatch", () => {
    let scene: Scene;

    beforeEach(() => {
        const engine = new NullEngine();
        scene = new Scene(engine);
        // A scene with no camera refuses to render, and rendering is what uploads.
        scene.activeCamera = new ArcRotateCamera("camera", 0, 0, 10, Vector3.Zero(), scene);
    });

    afterEach(() => {
        scene.getEngine().dispose();
    });

    function batch(): EdgeLineBatch {
        return new EdgeLineBatch(new Mesh("edge-style-test", scene), scene);
    }

    describe("slots", () => {
        test("hands out a fresh slot each time and counts them", () => {
            const drawn = batch();

            assert.equal(drawn.acquire(), 0);
            assert.equal(drawn.acquire(), 1);
            assert.equal(drawn.acquire(), 2);
            assert.equal(drawn.mesh.thinInstanceCount, 3);
        });

        test("hands a released slot out again rather than growing", () => {
            const drawn = batch();

            drawn.acquire();
            const second = drawn.acquire();
            drawn.release(second);

            assert.equal(drawn.acquire(), second, "the released slot comes back");
            assert.equal(drawn.mesh.thinInstanceCount, 2, "and no new slot was taken");
        });

        test("a released slot draws nothing", () => {
            const drawn = batch();
            const slot = drawn.acquire();

            drawn.place(slot, new Vector3(0, 0, 0), new Vector3(3, 0, 0));
            assert.isAbove(drawn.lengthOf(slot), 0);

            drawn.release(slot);
            assert.equal(drawn.lengthOf(slot), 0, "a zero matrix collapses the segment to a point");
        });

        test("hiding a slot draws nothing and leaves its neighbours alone", () => {
            const drawn = batch();
            const first = drawn.acquire();
            const second = drawn.acquire();

            drawn.place(first, new Vector3(0, 0, 0), new Vector3(2, 0, 0));
            drawn.place(second, new Vector3(0, 0, 0), new Vector3(5, 0, 0));
            drawn.setDrawn(first, false);

            assert.equal(drawn.lengthOf(first), 0);
            assert.equal(drawn.lengthOf(second), 5);
        });

        test("growing past the initial capacity keeps every slot where it was", () => {
            const drawn = batch();
            const slots: number[] = [];

            // Past 32, which is what a new batch starts with, so the buffer has to double.
            for (let i = 0; i < 40; i++) {
                const slot = drawn.acquire();
                slots.push(slot);
                drawn.place(slot, new Vector3(0, 0, 0), new Vector3(i + 1, 0, 0));
            }

            assert.equal(drawn.mesh.thinInstanceCount, 40);

            for (const [i, slot] of slots.entries()) {
                assert.approximately(drawn.lengthOf(slot), i + 1, 1e-4, `slot ${String(slot)} survived the doubling`);
            }
        });
    });

    describe("uploads", () => {
        /**
         * ONE UPLOAD A FRAME IS THE WHOLE POINT. `thinInstanceSetMatrixAt` uploads the entire
         * buffer per call, which is the O(n^2) that measured 42 seconds a frame at 20,000 edges
         * and got thin instances written off in this package for two years. This test fails if
         * anything ever puts an upload back on the per-edge path.
         */
        test("upload once for a frame however many slots moved", () => {
            const drawn = batch();
            let uploads = 0;
            const { mesh } = drawn;
            mesh.thinInstanceBufferUpdated = (): void => {
                uploads++;
            };

            for (let i = 0; i < 10; i++) {
                drawn.place(drawn.acquire(), new Vector3(0, 0, 0), new Vector3(i, 0, 0));
            }

            assert.equal(uploads, 0, "writing a slot uploads nothing");

            scene.render();
            assert.equal(uploads, 1, "the frame uploads once");

            scene.render();
            assert.equal(uploads, 1, "and a frame that moved nothing uploads nothing");
        });

        test("stops uploading once disposed", () => {
            const drawn = batch();
            const slot = drawn.acquire();
            drawn.place(slot, new Vector3(0, 0, 0), new Vector3(1, 0, 0));

            drawn.dispose();
            assert.isTrue(drawn.disposed);

            // Nothing below may throw: an edge that has not noticed its batch is gone keeps
            // calling these until the next repaint rebuilds it.
            drawn.place(slot, new Vector3(0, 0, 0), new Vector3(2, 0, 0));
            drawn.release(slot);
            scene.render();
        });
    });

    describe("segmentMatrixToRef", () => {
        /**
         * THE TWO SPELLINGS OF ONE PLACEMENT, held against each other. `EdgeMesh.transformMesh`
         * places a line by writing a position, a `lookAt` and a z scale on a mesh, and Babylon
         * composes those into a world matrix; a batched line composes the same matrix directly.
         * A basis that drifted would show up as a line that is the right length in the wrong
         * direction, or a width that no longer holds, and nothing else in the suite would see it.
         */
        test("composes the matrix Babylon composes from position, lookAt and scale", () => {
            const reference = new Mesh("reference", scene);
            const composed = new Matrix();

            // A fixed sequence rather than a random one, so a failure is the same failure twice.
            let seed = 12345;
            const next = (): number => {
                seed = (seed * 1103515245 + 12345) % 2147483648;
                return (seed / 2147483648) * 20 - 10;
            };

            const pairs: [Vector3, Vector3][] = [
                // Coincident: a zero-length line, which is what a self-loop hands in.
                [new Vector3(1, 2, 3), new Vector3(1, 2, 3)],
                // Straight up the axis `lookAt` derives its yaw from, where the flat length is 0.
                [new Vector3(0, 0, 0), new Vector3(0, 5, 0)],
                [new Vector3(0, 5, 0), new Vector3(0, 0, 0)],
                [new Vector3(0, 0, 0), new Vector3(0, 0, 4)],
            ];

            for (let i = 0; i < 200; i++) {
                pairs.push([new Vector3(next(), next(), next()), new Vector3(next(), next(), next())]);
            }

            for (const [src, dst] of pairs) {
                reference.rotationQuaternion = null;
                reference.scaling.set(1, 1, 1);
                EdgeMesh.transformMesh(reference, src, dst);
                reference.computeWorldMatrix(true);

                segmentMatrixToRef(src, dst, composed);

                const expected = reference.getWorldMatrix().m;
                const actual = composed.m;

                for (let element = 0; element < 16; element++) {
                    assert.approximately(
                        actual[element],
                        expected[element],
                        1e-4,
                        `element ${String(element)} of the matrix for ${src.toString()} -> ${dst.toString()}`,
                    );
                }
            }
        });
    });

    describe("joined lines", () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        function joined(pattern?: { kind: "dash" | "dot"; elementLength: number }): EdgeLineBatch {
            const mesh = CustomLineRenderer.createJoinedLineMesh(
                { width: 0.2, color: "#336699", worldWidth: true, pattern },
                scene,
            );
            return new EdgeLineBatch(mesh, scene);
        }

        /** One slot's fourteen floats, read back through the GPU buffer the batch uploads. */
        function slotOf(drawn: EdgeLineBatch, slot: number): number[] {
            const data = (drawn as unknown as { slots: Float32Array }).slots;
            return [...data.subarray(slot * 14, slot * 14 + 14)];
        }

        test("draws instances of the join template, not thin instances", () => {
            const drawn = joined();
            drawn.acquire();
            drawn.acquire();

            assert.strictEqual(drawn.mesh.forcedInstanceCount, 2);
            assert.strictEqual(drawn.mesh.thinInstanceCount, 0);
            assert.isNotNull(drawn.mesh.getVertexBuffer("pPrev"), "the previous corner is an instanced attribute");
            assert.isNotNull(drawn.mesh.getVertexBuffer("pNext"), "and so is the next");
        });

        test("a straight line is its own neighbours, so it draws square ends", () => {
            const drawn = joined();
            const slot = drawn.acquire();
            drawn.place(slot, new Vector3(1, 2, 0), new Vector3(4, 6, 0));

            assert.deepEqual(slotOf(drawn, slot), [1, 2, 0, 1, 2, 0, 4, 6, 0, 4, 6, 0, 0, 0]);
        });

        test("a run writes each piece with the corners either side and the distance along the edge", () => {
            const drawn = joined();
            const slots = [drawn.acquire(), drawn.acquire(), drawn.acquire()];
            // 3 + 4 + 5 long, turning at (3, 0) and (3, 4).
            drawn.placeRun(slots, [0, 0, 0, 3, 0, 0, 3, 4, 0, 6, 0, 0]);

            assert.deepEqual(slotOf(drawn, slots[0]), [0, 0, 0, 0, 0, 0, 3, 0, 0, 3, 4, 0, 0, 0]);
            assert.deepEqual(slotOf(drawn, slots[1]), [0, 0, 0, 3, 0, 0, 3, 4, 0, 6, 0, 0, 3, 0]);
            assert.deepEqual(slotOf(drawn, slots[2]), [3, 0, 0, 3, 4, 0, 6, 0, 0, 6, 0, 0, 7, 0]);
        });

        test("a run shorter than its slots hides the slots it does not use", () => {
            const drawn = joined();
            const slots = [drawn.acquire(), drawn.acquire()];
            drawn.placeRun(slots, [0, 0, 0, 1, 0, 0, 2, 1, 0]);
            drawn.placeRun(slots, [0, 0, 0, 5, 0, 0]);

            assert.strictEqual(drawn.lengthOf(slots[0]), 5);
            assert.strictEqual(drawn.lengthOf(slots[1]), 0, "a zero slot draws nothing");
        });

        test("a dashed run spaces its dashes over the whole edge, the same spacing on every piece", () => {
            const drawn = joined({ kind: "dash", elementLength: 0.6 });
            const slots = [drawn.acquire(), drawn.acquire()];
            drawn.placeRun(slots, [0, 0, 0, 3, 0, 0, 3, 4, 0]);

            const spacing = slotOf(drawn, slots[0])[13];
            assert.strictEqual(slotOf(drawn, slots[1])[13], spacing);
            // The first dash starts the edge and the last one ends it, as PatternedLineMesh lays
            // dashes along a straight line: centres from 0.3 to 6.7 in equal steps.
            const steps = (7 - 0.6) / spacing;
            assert.closeTo(steps, Math.round(steps), 1e-4);
            assert.isAbove(spacing, 0.6, "dashes are apart, not touching");
        });

        test("upload once for a frame however many pieces moved", () => {
            const drawn = joined();
            const update = vi.spyOn(Buffer.prototype, "update");
            for (let i = 0; i < 10; i++) {
                drawn.placeRun([drawn.acquire(), drawn.acquire()], [0, 0, 0, i, 0, 0, i, 1, 0]);
            }

            assert.strictEqual(update.mock.calls.length, 0, "writing a slot uploads nothing");
            scene.render();
            assert.strictEqual(update.mock.calls.length, 1, "the frame uploads once");
            scene.render();
            assert.strictEqual(update.mock.calls.length, 1, "and a frame that moved nothing uploads nothing");
        });

        /**
         * Placing every bent edge of a settling layout is the hot path. The work is one slot write
         * per piece; a cost per edge that grew with the batch (an upload per edge, a search of the
         * slots) shows up as the square.
         */
        test("placing n bent edges writes n runs of slots and uploads once", async () => {
            const writes = vi.spyOn(EdgeLineBatch.prototype as unknown as { writeFlat: () => void }, "writeFlat");
            const update = vi.spyOn(Buffer.prototype, "update");
            await assertScalesLinearly(
                (n) => {
                    writes.mockClear();
                    update.mockClear();
                    const drawn = joined();
                    const runs = Array.from({ length: n }, () => [drawn.acquire(), drawn.acquire(), drawn.acquire()]);
                    for (const [i, run] of runs.entries()) {
                        drawn.placeRun(run, [i, 0, 0, i + 1, 0, 0, i + 1, 1, 0, i + 2, 1, 0]);
                    }

                    scene.render();
                    assert.strictEqual(update.mock.calls.length, 1, "one upload for the frame");
                    return writes.mock.calls.length + update.mock.calls.length;
                },
                { sizes: [250, 1000], counter: "slot writes and uploads" },
            );
        });
    });

    describe("widened lines (a shader or a taper)", () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        function widened(): EdgeLineBatch {
            const mesh = CustomLineRenderer.createJoinedLineMesh(
                { width: 0.2, color: "#336699", worldWidth: true, widened: true },
                scene,
            );
            return new EdgeLineBatch(mesh, scene);
        }

        test("a widened slot carries the whole edge's length beside the plain fourteen floats", () => {
            const drawn = widened();
            const slots = [drawn.acquire(), drawn.acquire()];
            drawn.placeRun(slots, [0, 0, 0, 3, 0, 0, 3, 4, 0]);
            const data = (drawn as unknown as { slots: Float32Array }).slots;

            assert.isTrue(drawn.widened);
            assert.strictEqual(data[14], 7, "the first piece knows the edge is 7 long");
            assert.strictEqual(data[16 + 14], 7, "and so does the second");
            assert.isNotNull(drawn.mesh.getVertexBuffer("runTotal"));
            assert.isNotNull(drawn.mesh.getVertexBuffer("edgeMeta"), "the static values are instanced attributes");
        });

        test("static values upload with the next frame and not again when the edge only moves", () => {
            const drawn = widened();
            const slot = drawn.acquire();
            drawn.place(slot, new Vector3(0, 0, 0), new Vector3(1, 0, 0));
            const values = Float32Array.from({ length: 20 }, (_, i) => i);
            drawn.writeStatic(slot, values);
            const uploaded: number[] = [];
            vi.spyOn(Buffer.prototype, "update").mockImplementation(function (this: Buffer, data) {
                uploaded.push((data as Float32Array).length);
            });

            scene.render();
            assert.lengthOf(uploaded, 2, "the frame uploads the positions and the static values");
            assert.deepEqual([...(drawn.staticOf(slot) ?? [])], [...values]);

            uploaded.length = 0;
            drawn.place(slot, new Vector3(0, 0, 0), new Vector3(5, 0, 0));
            scene.render();
            assert.lengthOf(uploaded, 1, "a moved edge uploads its positions only");
        });

        /**
         * 10,000 PLAIN EDGES UPLOAD THE SAME BYTES PER FRAME AS BEFORE (design/rendering/
         * shader-styles.md, package E5). A plain line batch must not grow a float or a buffer for
         * the shaders other batches draw: its slot stays fourteen floats and a frame uploads one
         * buffer of them.
         */
        test("10,000 plain edges upload fourteen floats a slot in one buffer, as before", () => {
            const drawn = joined();
            const uploaded: number[] = [];
            vi.spyOn(Buffer.prototype, "update").mockImplementation(function (this: Buffer, data) {
                uploaded.push((data as Float32Array).byteLength);
            });
            for (let i = 0; i < 10_000; i++) {
                drawn.place(drawn.acquire(), new Vector3(i, 0, 0), new Vector3(i, 1, 0));
            }

            drawn.writeStatic(0, new Float32Array(20));
            scene.render();
            assert.isFalse(drawn.widened);
            assert.isNull(drawn.staticOf(0), "a plain batch keeps no static values");
            assert.notExists(drawn.mesh.getVertexBuffer("runTotal"));
            assert.lengthOf(uploaded, 1, "one buffer a frame");
            // The slots double from 32, so 10,000 edges sit in 16,384 slots of 14 floats.
            assert.strictEqual(uploaded[0], 16_384 * 14 * 4);
        });

        function joined(): EdgeLineBatch {
            return new EdgeLineBatch(
                CustomLineRenderer.createJoinedLineMesh({ width: 0.2, color: "#336699", worldWidth: true }, scene),
                scene,
            );
        }
    });
});
