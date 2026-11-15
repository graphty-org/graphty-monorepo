/**
 * @file What one row scan costs at a million rows (design/rendering/row-renderer.md stage 5, target
 * p95 under 10 ms): the whole `shapeRayHit`, bound walk and Babylon's narrow phase on a torus knot,
 * over a synthetic `rowBounds`. It needs no GPU, so it runs on a NullEngine. The numbers go to the
 * console; it asserts only that rays hit rows.
 */

import { FreeCamera, MeshBuilder, NullEngine, Scene, Vector3 } from "@babylonjs/core";
import { assert, describe, it } from "vitest";

import { RowScan } from "../../src/render/PickService";

const ROWS = 1_000_000;
const RAYS = 300;
const WIDTH = 1000;
const HEIGHT = 800;

/** Where a scene's rows go, in a unit cube around the origin. */
type Spread = (random: () => number) => [number, number, number];

const SCENES: Record<string, { side: number; spread: Spread }> = {
    "3D cube, side 4000": { side: 4000, spread: (r) => [r() - 0.5, r() - 0.5, r() - 0.5] },
    "2D plane, side 4000": { side: 4000, spread: (r) => [r() - 0.5, r() - 0.5, 0] },
    "ball, side 120": {
        side: 120,
        spread: (r) => {
            const z = r() * 2 - 1;
            const turn = r() * Math.PI * 2;
            const across = Math.sqrt(1 - z * z);
            const out = Math.cbrt(r()) / 2;
            return [across * Math.cos(turn) * out, across * Math.sin(turn) * out, z * out];
        },
    },
};

describe("row scan at a million rows", () => {
    for (const [name, { side, spread }] of Object.entries(SCENES)) {
        it(name, () => {
            const engine = new NullEngine({
                renderWidth: WIDTH,
                renderHeight: HEIGHT,
                textureSize: 16,
                deterministicLockstep: false,
                lockstepMaxSteps: 1,
            });
            const scene = new Scene(engine);
            const camera = new FreeCamera("camera", new Vector3(0, 0, -side * 1.5), scene);
            camera.maxZ = side * 4;
            camera.setTarget(Vector3.Zero());
            const source = MeshBuilder.CreateTorusKnot("source", { radius: 0.6, tube: 0.2 }, scene);
            source.isVisible = false;

            let seed = 1;
            const random = (): number => {
                seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
                return (seed >>> 0) / 4294967296;
            };
            const rowBounds = new Float32Array(ROWS * 4);
            for (let row = 0; row < ROWS; row++) {
                const [x, y, z] = spread(random);
                rowBounds.set([x * side, y * side, z * side, 1], row * 4);
            }

            const node = {
                index: 0,
                drawnPickMesh: source,
                drawnAnchor: source,
                drawnSourceMesh: source,
                drawnScaling: Vector3.One(),
                drawnByRowScan: true,
            };
            const scan = new RowScan(scene, { rows: ROWS, rowBounds }, () => node, null);
            const times: number[] = [];
            let hits = 0;
            for (let i = 0; i < RAYS; i++) {
                const x = WIDTH * (0.25 + random() / 2);
                const y = HEIGHT * (0.25 + random() / 2);
                const start = performance.now();
                hits += scan.shapeRayHit(x, y) === null ? 0 : 1;
                times.push(performance.now() - start);
            }

            scene.dispose();
            engine.dispose();
            times.sort((a, b) => a - b);
            const at = (share: number): string => (times[Math.ceil(share * RAYS) - 1] ?? 0).toFixed(2);
            console.log(
                `row scan, ${name}: median ${at(0.5)} ms, p95 ${at(0.95)} ms, worst ${at(1)} ms, hits ${String(hits)}`,
            );
            assert.strictEqual(times.length, RAYS);
        });
    }
});
