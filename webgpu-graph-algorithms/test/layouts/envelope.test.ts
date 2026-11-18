/**
 * The envelope a batch measures on the device (issue #8801): with a drawn ring, every landing carries the count, sums,
 * box and furthest squared distance from the mean of the finite scene rows it wrote into the owner's array, against
 * an index-based f64 walk of that array (the box exactly, the sums and the distance to f32 rounding); a setPosition
 * or a load clears it, and a simulation without a ring measures nothing. Run twice bitwise.
 */

import { type F32, type GraphSnapshot } from "@graphty/graph-format";

import { type GpuContext } from "../../src/context.js";
import { createForceAtlas2 } from "../../src/layouts/forceatlas2.js";
import { type LandedEnvelope } from "../../src/types/layout.js";
import { randomEdges, snapshotOf } from "../helpers/graphs.js";
import { storyGraph } from "../helpers/story-graph.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

/** The f64 oracle: what a walk of the owner's rows measures. */
function oracle(scene: F32, n: number): LandedEnvelope {
    let placed = 0;
    const sum = [0, 0, 0];
    const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) {
        const p = [scene[3 * i], scene[3 * i + 1], scene[3 * i + 2]];
        if (!p.every(Number.isFinite)) {
            continue;
        }
        placed++;
        for (let axis = 0; axis < 3; axis++) {
            sum[axis] += p[axis];
            box[axis] = Math.min(box[axis], p[axis]);
            box[axis + 3] = Math.max(box[axis + 3], p[axis]);
        }
    }
    let furthestSquared = 0;
    for (let i = 0; i < n; i++) {
        let q = 0;
        for (let axis = 0; axis < 3; axis++) {
            q += (scene[3 * i + axis] - sum[axis] / placed) ** 2;
        }
        if (Number.isFinite(q)) {
            furthestSquared = Math.max(furthestSquared, q);
        }
    }
    return {
        placed,
        sum: [sum[0], sum[1], sum[2]],
        box: [box[0], box[1], box[2], box[3], box[4], box[5]],
        furthestSquared,
    };
}

describe("the envelope measured on the device", () => {
    let ctx: GpuContext;

    beforeAll(async () => {
        ctx = await acquire({ label: "envelope" });
    });

    afterAll(() => {
        ctx.dispose();
    });

    /**
     * Four batches over a ring; the envelope of the last landing and the owner's rows it measured.
     * @param snapshot - the graph
     * @param dim - the dimension
     * @returns the envelope and the rows
     */
    async function run(
        snapshot: GraphSnapshot,
        dim: 2 | 3,
    ): Promise<{ envelope: LandedEnvelope | null; scene: F32; envelopes: number }> {
        const n = snapshot.nodeCount;
        const simulation = createForceAtlas2(ctx, { dim, scale: 100, seed: 5, maxIter: 60 });
        const scene = new Float32Array(3 * n).fill(Number.NaN);
        simulation.load(snapshot, scene);
        assert.ok(typeof simulation.setDrawn === "function");
        simulation.setDrawn({ slots: 2, rows: new Float32Array(4 * n) });
        let envelopes = 0;
        for (let batch = 0; batch < 4; batch++) {
            await simulation.step(3);
            await simulation.flush();
            if (simulation.landedEnvelope !== null && simulation.landedEnvelope !== undefined) {
                envelopes++;
            }
        }
        const envelope = simulation.landedEnvelope ?? null;
        simulation.dispose();
        return { envelope, scene, envelopes };
    }

    const graphs: readonly (readonly [string, () => GraphSnapshot])[] = [
        ["the story graph", storyGraph],
        // more rows than one workgroup, so the partials and their fold run over several groups
        ["a random graph", () => snapshotOf(randomEdges(Math.max(600, Math.round(20000 * gpuScale())), 3000, 11))],
    ];
    for (const [name, graph] of graphs) {
        for (const dim of [2, 3] as const) {
            it(`equals an f64 walk of the landed rows: ${name}, dim ${dim}`, async (t) => {
                requireGpu(t);
                const snapshot = graph();
                const { envelope, scene, envelopes } = await run(snapshot, dim);
                assert.strictEqual(envelopes, 4, "every landing carries an envelope");
                assert.ok(envelope !== null);
                const want = oracle(scene, snapshot.nodeCount);
                assert.strictEqual(envelope.placed, want.placed);
                assert.deepStrictEqual([...envelope.box], [...want.box], "the box is exact");
                let spread = 0;
                for (let i = 0; i < 3 * snapshot.nodeCount; i++) {
                    spread += Math.abs(scene[i]);
                }
                for (let axis = 0; axis < 3; axis++) {
                    assert.ok(
                        Math.abs(envelope.sum[axis] - want.sum[axis]) <= 1e-5 * spread,
                        `sum ${axis}: ${envelope.sum[axis]} vs ${want.sum[axis]}`,
                    );
                }
                assert.ok(want.furthestSquared > 0);
                assert.ok(
                    Math.abs(envelope.furthestSquared - want.furthestSquared) <= 1e-4 * want.furthestSquared,
                    `furthest: ${envelope.furthestSquared} vs ${want.furthestSquared}`,
                );
                const again = (await run(snapshot, dim)).envelope;
                assert.deepStrictEqual(again, envelope, "two runs");
            });
        }
    }

    it("a setPosition, a load and a missing ring leave no envelope", async (t) => {
        requireGpu(t);
        const snapshot = storyGraph();
        const n = snapshot.nodeCount;
        const simulation = createForceAtlas2(ctx, { dim: 2, scale: 100, seed: 5, maxIter: 60 });
        simulation.load(snapshot, new Float32Array(3 * n).fill(Number.NaN));
        await simulation.step(2);
        await simulation.flush();
        assert.strictEqual(simulation.landedEnvelope, null, "no ring, no envelope");
        simulation.setDrawn?.({ slots: 2, rows: new Float32Array(4 * n) });
        await simulation.step(2);
        await simulation.flush();
        assert.notStrictEqual(simulation.landedEnvelope, null);
        simulation.setPosition(0, 1, 2, 0);
        assert.strictEqual(simulation.landedEnvelope, null, "the owner's row is no longer the measured one");
        // the batch submitted before the write would land over it: its envelope does not stand either
        await simulation.step(2);
        await simulation.flush();
        assert.notStrictEqual(simulation.landedEnvelope, null, "a batch submitted after the write measures again");
        simulation.load(snapshot, new Float32Array(3 * n).fill(Number.NaN));
        assert.strictEqual(simulation.landedEnvelope, null, "a load clears it");
        simulation.dispose();
    });
});
