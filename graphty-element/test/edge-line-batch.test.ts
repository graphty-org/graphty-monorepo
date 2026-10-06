import { ArcRotateCamera, Matrix, Mesh, NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { assert, beforeEach, describe, test } from "vitest";

import { EdgeLineBatch, segmentMatrixToRef } from "../src/meshes/EdgeLineBatch";
import { EdgeMesh } from "../src/meshes/EdgeMesh";

describe("EdgeLineBatch", () => {
    let scene: Scene;

    beforeEach(() => {
        const engine = new NullEngine();
        scene = new Scene(engine);
        // A scene with no camera refuses to render, and rendering is what uploads.
        scene.activeCamera = new ArcRotateCamera("camera", 0, 0, 10, Vector3.Zero(), scene);
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
});
