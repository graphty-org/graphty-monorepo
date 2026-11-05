/**
 * Runs the collision stage alone over a scene, for test/layouts/collision.test.ts and the sabotage rows: a scene holds
 * every case of the pair law, overlapping pairs of different sizes, a coincident pair, a fixed partner, an inert row and
 * nodes far enough apart to be left alone.
 */

import { makeMask, maskSet } from "@graphty/graph-format";

import { type GpuContext } from "../../src/context.js";
import { BufferUsage } from "../../src/device/webgpu-constants.js";
import { CommandBatch } from "../../src/kernel/batch.js";
import { CollisionStage } from "../../src/layouts/collision.js";
import { type ModelResources } from "../../src/layouts/force-simulation.js";
import { type Binding } from "../../src/types/memory.js";
import { collideSweep } from "../oracle/collide.js";
import { type CheckReport, ratioOf } from "./check-report.js";

/** The f32 kernel against the f64 oracle, relative to the largest radius. */
const TOLERANCE = 1e-4;

/**
 * A scene: stride-4 rows, the radii in the rows' units, and the fixed rows.
 * @public
 */
export interface CollideScene {
    readonly positions: Float32Array<ArrayBuffer>;
    readonly radii: Float32Array<ArrayBuffer>;
    readonly fixed: readonly number[];
    readonly dim: 2 | 3;
    readonly flat: boolean;
}

/**
 * A seeded scene of `n` nodes spread so about half of them overlap a neighbour; rows 0 and 1 coincide, row 2 is fixed
 * on top of row 3, row 4 is inert in the middle of row 5.
 * @param n - the node count (>= 8)
 * @param dim - the simulation's dimension
 * @param flat - whether a 3D collision compares x and y only
 * @returns the scene
 */
export function collideScene(n: number, dim: 2 | 3, flat = false): CollideScene {
    const positions = new Float32Array(4 * n);
    const radii = new Float32Array(n);
    let state = 12345;
    const random = (): number => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
    const side = Math.sqrt(n) * 2.2;
    for (let i = 0; i < n; i++) {
        positions[4 * i] = random() * side;
        positions[4 * i + 1] = random() * side;
        positions[4 * i + 2] = dim === 3 ? random() * side : 0;
        positions[4 * i + 3] = 1;
        radii[i] = 0.5 + 0.5 * random();
    }
    positions.copyWithin(4, 0, 3);
    positions.copyWithin(8, 12, 15);
    positions[8] += 0.2;
    positions.copyWithin(16, 20, 23);
    positions[19] = 0;
    return { positions, radii, fixed: [2], dim, flat };
}

/**
 * Runs `sweeps` sweeps on the device.
 * @param ctx - the context
 * @param scene - the scene
 * @param sweeps - 1, or the settling sweeps when more
 * @returns the rows after them
 */
export async function runCollide(ctx: GpuContext, scene: CollideScene, sweeps = 1): Promise<Float32Array<ArrayBuffer>> {
    const { device } = ctx;
    const n = scene.radii.length;
    const usage = BufferUsage.STORAGE | BufferUsage.COPY_SRC | BufferUsage.COPY_DST;
    const whole = (buffer: GPUBuffer, size: number): Binding => ({ buffer, offset: 0, size, window: null });
    const pos = device.createBuffer({ label: "collide-test/pos", size: 16 * n, usage });
    const fixedWords = makeMask(n);
    for (const row of scene.fixed) {
        maskSet(fixedWords, row, true);
    }
    const fixed = device.createBuffer({ label: "collide-test/fixed", size: fixedWords.byteLength, usage });
    device.queue.writeBuffer(pos, 0, scene.positions);
    device.queue.writeBuffer(fixed, 0, fixedWords);
    const bindings = new Map([
        ["positions", whole(pos, 16 * n)],
        ["fixed", whole(fixed, fixedWords.byteLength)],
    ]);
    const resources = {
        device,
        caps: ctx.caps,
        pipelines: ctx.pipelines,
        pool: ctx.pool,
        n,
        dim: scene.dim,
        buffer: (name: string): Binding => bindings.get(name) as Binding,
    } as unknown as ModelResources;
    const stage = await CollisionStage.create(resources);
    stage.update({ radii: scene.radii, radiusScale: 1, flat: scene.flat }, true);
    stage.settling(sweeps > 1);
    const batch = new CommandBatch(ctx, "collide-test", 0);
    stage.record(batch.pass("collide"));
    batch.endPass();
    batch.readback(pos, 0, 16 * n);
    const bytes = await batch.submit().readback;
    stage.dispose();
    pos.destroy();
    fixed.destroy();
    return new Float32Array(bytes.slice(0, 16 * n));
}

/**
 * One sweep on the device against the f64 oracle, per row and axis.
 * @param ctx - the context
 * @param scene - the scene
 * @returns the report
 */
export async function collideReport(ctx: GpuContext, scene: CollideScene): Promise<CheckReport> {
    const got = await runCollide(ctx, scene);
    const inert = new Float64Array(scene.positions);
    const fixed = new Set(scene.fixed);
    const want = collideSweep(inert, scene.radii, scene.flat ? 2 : scene.dim, (row) => fixed.has(row));
    let worst = 0;
    let worstLabel = "none";
    for (let k = 0; k < got.length; k++) {
        const ratio = ratioOf(Math.abs(got[k] - want[k]), TOLERANCE);
        if (!(ratio <= worst)) {
            worst = ratio;
            worstLabel = `row ${Math.floor(k / 4)} component ${k % 4}`;
        }
    }
    return { worst, worstLabel, samples: got.length };
}
