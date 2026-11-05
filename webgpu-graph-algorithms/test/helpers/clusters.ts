/**
 * Runs the cluster stage alone over a scene, for test/layouts/clusters.test.ts and the sabotage rows: communities of
 * different sizes and masses, a row in no community, an inert row inside a community, and force already in the buffer.
 */

import { NO_CLUSTER } from "../../src/constants.js";
import { type GpuContext } from "../../src/context.js";
import { BufferUsage } from "../../src/device/webgpu-constants.js";
import { CommandBatch } from "../../src/kernel/batch.js";
import { FA2_PARAMS } from "../../src/kernels.js";
import { ClusterStage } from "../../src/layouts/clusters.js";
import { type ModelResources } from "../../src/layouts/force-simulation.js";
import { type Binding } from "../../src/types/memory.js";
import { type CheckReport, ratioOf } from "./check-report.js";

/** The f32 kernels against the f64 sum, relative to a force of 1. */
const TOLERANCE = 1e-3;

/** What the pull is computed with. */
const STRENGTH = 0.7;
const FR_K = 2.5;
const SPRING = 0.3;

/**
 * A scene: stride-4 rows with the mass in w, the force K2 left, and the communities.
 * @public
 */
export interface ClusterScene {
    readonly positions: Float32Array<ArrayBuffer>;
    readonly force: Float32Array<ArrayBuffer>;
    readonly communities: Uint32Array<ArrayBuffer>;
    readonly law: 0 | 1 | 2;
}

/**
 * A seeded scene of `n` rows: communities of about i % 7 with one of them far larger than a workgroup, row 0 in none,
 * row 1 inert.
 * @param n - the node count (>= 8)
 * @param law - the model's law
 * @returns the scene
 */
export function clusterScene(n: number, law: 0 | 1 | 2): ClusterScene {
    const positions = new Float32Array(4 * n);
    const force = new Float32Array(3 * n);
    const communities = new Uint32Array(n);
    let state = 4242;
    const random = (): number => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
    for (let i = 0; i < n; i++) {
        positions.set([random() * 20, random() * 20, random() * 20, 1 + Math.floor(random() * 5)], 4 * i);
        force.set([random(), random(), random()], 3 * i);
        communities[i] = i % 2 === 0 ? 0 : 1 + (i % 7);
    }
    communities[0] = NO_CLUSTER;
    positions[7] = 0;
    return { positions, force, communities, law };
}

/**
 * The stage's pull on the device, added to the scene's force.
 * @param ctx - the context
 * @param scene - the scene
 * @returns the force after the stage
 */
export async function runClusters(ctx: GpuContext, scene: ClusterScene): Promise<Float32Array<ArrayBuffer>> {
    const { device } = ctx;
    const n = scene.communities.length;
    const usage = BufferUsage.STORAGE | BufferUsage.COPY_SRC | BufferUsage.COPY_DST;
    const whole = (buffer: GPUBuffer, size: number): Binding => ({ buffer, offset: 0, size, window: null });
    const pos = device.createBuffer({ label: "cluster-test/pos", size: 16 * n, usage });
    const force = device.createBuffer({ label: "cluster-test/force", size: 12 * n, usage });
    const params = device.createBuffer({
        label: "cluster-test/params",
        size: FA2_PARAMS.byteLength,
        usage: BufferUsage.UNIFORM | BufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(pos, 0, scene.positions);
    device.queue.writeBuffer(force, 0, scene.force);
    const bindings = new Map([
        ["positions", whole(pos, 16 * n)],
        ["force", whole(force, 12 * n)],
    ]);
    const resources = {
        device,
        caps: ctx.caps,
        pipelines: ctx.pipelines,
        pool: ctx.pool,
        n,
        ring: { binding: (): Binding => whole(params, FA2_PARAMS.byteLength) },
        buffer: (name: string): Binding => bindings.get(name) as Binding,
    } as unknown as ModelResources;
    const stage = await ClusterStage.create(resources, scene.law);
    stage.update(scene.communities);
    const bytes = new ArrayBuffer(FA2_PARAMS.byteLength);
    const view = new DataView(bytes);
    FA2_PARAMS.write(view, {
        ...Object.fromEntries(FA2_PARAMS.fields.map(([name, type]) => [name, type === "vec4f" ? [0, 0, 0, 0] : 0])),
        n,
        frK: FR_K,
        springCoefficient: SPRING,
        clusterStrength: STRENGTH,
        clusterCount: stage.count,
    });
    device.queue.writeBuffer(params, 0, bytes);
    const batch = new CommandBatch(ctx, "cluster-test", 0);
    stage.record(batch.pass("cluster"), 0);
    batch.endPass();
    batch.readback(force, 0, 12 * n);
    const out = await batch.submit().readback;
    stage.dispose();
    pos.destroy();
    force.destroy();
    params.destroy();
    return new Float32Array(out.slice(0, 12 * n));
}

/**
 * The scene's force with the pull added, in f64.
 * @param scene - the scene
 * @returns the force
 */
function expectedForce(scene: ClusterScene): Float64Array {
    const { positions, communities, law } = scene;
    const out = Float64Array.from(scene.force);
    const sums = new Map<number, [number, number, number, number]>();
    communities.forEach((community, i) => {
        if (community !== NO_CLUSTER) {
            const sum = sums.get(community) ?? [0, 0, 0, 0];
            const m = positions[4 * i + 3];
            sum[0] += m * positions[4 * i];
            sum[1] += m * positions[4 * i + 1];
            sum[2] += m * positions[4 * i + 2];
            sum[3] += m;
            sums.set(community, sum);
        }
    });
    communities.forEach((community, i) => {
        const m = positions[4 * i + 3];
        const sum = sums.get(community);
        if (sum !== undefined && m > 0) {
            const d = [0, 1, 2].map((axis) => sum[axis] / sum[3] - positions[4 * i + axis]);
            const pull = [STRENGTH * m, (STRENGTH * Math.hypot(...d)) / FR_K, STRENGTH * m * SPRING][law];
            d.forEach((v, axis) => {
                out[3 * i + axis] += pull * v;
            });
        }
    });
    return out;
}

/**
 * The stage on the device against the f64 sum, per row and axis.
 * @param ctx - the context
 * @param scene - the scene
 * @returns the report
 */
export async function clusterReport(ctx: GpuContext, scene: ClusterScene): Promise<CheckReport> {
    const got = await runClusters(ctx, scene);
    const want = expectedForce(scene);
    let worst = 0;
    let worstLabel = "none";
    for (let k = 0; k < got.length; k++) {
        const ratio = ratioOf(Math.abs(got[k] - want[k]) / Math.max(1, Math.abs(want[k])), TOLERANCE);
        if (!(ratio <= worst)) {
            worst = ratio;
            worstLabel = `row ${Math.floor(k / 3)} axis ${k % 3}`;
        }
    }
    return { worst, worstLabel, samples: got.length };
}
