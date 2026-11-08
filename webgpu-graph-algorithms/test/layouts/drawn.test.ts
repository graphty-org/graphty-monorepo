/**
 * The drawn ring (design/rendering/row-renderer.md 4.5): every batch's `to-drawn` writes (scene - center) * scale +
 * target, z = 0 in 2D, into its own slot; skipped rows and the w lane stay what the owner wrote; a batch in flight
 * across a load never lands as the drawn buffer; a simulation without a ring is unchanged. Run twice bitwise.
 */

import { type F32, type GraphSnapshot, makeMask, maskSet } from "@graphty/graph-format";

import { type GpuContext } from "../../src/context.js";
import { createForceAtlas2 } from "../../src/layouts/forceatlas2.js";
import { type DrawnTransform, type GpuLayoutSimulation, type LayoutStatsBase } from "../../src/types/layout.js";
import { readF32 } from "../helpers/device.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { storyGraph } from "../helpers/story-graph.js";
import { acquire, requireGpu } from "../setup/gpu.js";

type Ring = GpuLayoutSimulation<never, LayoutStatsBase> &
    Required<
        Pick<
            GpuLayoutSimulation<never, LayoutStatsBase>,
            "setDrawn" | "setDrawnTransform" | "setDrawnSkip" | "writeDrawn"
        >
    > & {
        readonly landedDrawn: GPUBuffer | null;
    };

/**
 * A ForceAtlas2 simulation with its drawn ring methods asserted present.
 * @param ctx - the context
 * @param dim - the dimension
 * @returns the simulation
 */
function ringed(ctx: GpuContext, dim: 2 | 3): Ring {
    const simulation = createForceAtlas2(ctx, { dim, scale: 100, seed: 3, maxIter: 60 });
    assert.ok(typeof simulation.setDrawn === "function", "ForceSimulation has a drawn ring");
    return simulation as Ring;
}

const TRANSFORM: DrawnTransform = { center: [3, -2, 5], scale: 0.25, target: [10, 20, 30] };

describe("the drawn ring", () => {
    let ctx: GpuContext;
    const snapshot: GraphSnapshot = storyGraph();
    const n = snapshot.nodeCount;

    beforeAll(async () => {
        ctx = await acquire({ label: "drawn" });
    });

    afterAll(() => {
        ctx.dispose();
    });

    /** A ring of 3 over a seeded run: the owner's seed rows have w = 0.5 + row / n, row 1 is skipped. */
    async function run(dim: 2 | 3): Promise<{ drawn: F32; scene: F32; seed: Float32Array; landed: number }> {
        const simulation = ringed(ctx, dim);
        const scene = new Float32Array(3 * n).fill(Number.NaN);
        simulation.load(snapshot, scene);
        const seed = new Float32Array(4 * n);
        for (let i = 0; i < n; i++) {
            seed.set([-1, -1, -1, 0.5 + i / n], 4 * i);
        }
        simulation.setDrawn({ slots: 3, rows: seed });
        simulation.setDrawnTransform(TRANSFORM);
        const skip = makeMask(n);
        maskSet(skip, 1, true);
        simulation.setDrawnSkip(skip);
        simulation.writeDrawn(1, 7, 8, 9, 1);
        const slots = new Set<GPUBuffer>();
        for (let batch = 0; batch < 5; batch++) {
            await simulation.step(2);
            await simulation.flush();
            const landed = simulation.landedDrawn;
            assert.ok(landed !== null, "a landed batch has a drawn slot");
            slots.add(landed);
        }
        const landed = simulation.landedDrawn;
        assert.ok(landed !== null);
        const drawn = await readF32(ctx, landed, 4 * n);
        simulation.dispose();
        return { drawn, scene, seed, landed: slots.size };
    }

    for (const dim of [2, 3] as const) {
        it(`equals the owner's formula over the landed positions, keeps w and skipped rows (dim ${dim})`, async (t) => {
            requireGpu(t);
            const { drawn, scene, seed, landed } = await run(dim);
            assert.strictEqual(landed, 3, "five batches use the three slots in turn");
            for (let i = 0; i < n; i++) {
                const at = 4 * i;
                if (i === 1) {
                    assert.deepStrictEqual(Array.from(drawn.subarray(at, at + 4)), [7, 8, 9, 1], "the owner's row");
                    continue;
                }
                for (let axis = 0; axis < 3; axis++) {
                    const want =
                        dim === 2 && axis === 2
                            ? 0
                            : (scene[3 * i + axis] - TRANSFORM.center[axis]) * TRANSFORM.scale + TRANSFORM.target[axis];
                    const got = drawn[at + axis];
                    assert.ok(
                        Math.abs(got - want) <= 1e-6 * Math.max(1, Math.abs(want)),
                        `row ${i} axis ${axis}: ${got} vs ${want}`,
                    );
                }
                assert.strictEqual(drawn[at + 3], seed[at + 3], `row ${i} keeps its w`);
            }
            expectBitwiseEqual(drawn, (await run(dim)).drawn, "two runs");
        });
    }

    it("a batch in flight across a load never lands as the drawn buffer", async (t) => {
        requireGpu(t);
        const simulation = ringed(ctx, 2);
        simulation.load(snapshot, new Float32Array(3 * n).fill(Number.NaN));
        simulation.setDrawn({ slots: 2, rows: new Float32Array(4 * n) });
        const stale = simulation.step(1);
        simulation.load(snapshot, new Float32Array(3 * n).fill(Number.NaN));
        await stale;
        assert.strictEqual(simulation.landedDrawn, null, "the stale batch skipped");
        simulation.dispose();
    });

    it("without a ring nothing is drawn and the positions are those of a run with one", async (t) => {
        requireGpu(t);
        const positions = async (ring: boolean): Promise<F32> => {
            const simulation = ringed(ctx, 2);
            const scene = new Float32Array(3 * n).fill(Number.NaN);
            simulation.load(snapshot, scene);
            if (ring) {
                simulation.setDrawn({ slots: 2, rows: new Float32Array(4 * n) });
            }
            await simulation.step(4);
            await simulation.flush();
            assert.strictEqual(simulation.landedDrawn !== null, ring);
            simulation.dispose();
            return scene;
        };
        expectBitwiseEqual(await positions(false), await positions(true), "the ring changes no position");
    });
});
