/**
 * The collision force on the device (issue #3256): one sweep against the f64 oracle over every case of the pair law,
 * twice bitwise; then whole runs of the three models on both repulsion tiers, in 2D and 3D, ending with no two nodes
 * overlapping; and a run without a collision, or with it taken off, left exactly as it was.
 */

import { type F32, type GraphSnapshot } from "@graphty/graph-format";

import { type GpuContext } from "../../src/context.js";
import { createForceAtlas2 } from "../../src/layouts/forceatlas2.js";
import { createFruchtermanReingold } from "../../src/layouts/fruchterman-reingold.js";
import { createSpringElectrical } from "../../src/layouts/spring-electrical.js";
import { type GpuLayoutSimulation, type GpuLayoutTuning, type LayoutStatsBase } from "../../src/types/layout.js";
import { collideReport, collideScene, runCollide } from "../helpers/collide.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";
import { assertCheckPasses } from "../helpers/sabotage.js";
import { storyGraph } from "../helpers/story-graph.js";
import { acquire, gpuScale, requireGpu } from "../setup/gpu.js";

/** What the three models have in common here. */
type Simulation = Pick<
    GpuLayoutSimulation<never, LayoutStatsBase>,
    "load" | "step" | "flush" | "settled" | "setCollision" | "dispose"
>;

const TIERS = [
    ["exact", { repulsion: "exact" }],
    ["grid", { repulsion: "grid" }],
] as const;

const MODELS: readonly (readonly [string, (ctx: GpuContext, dim: 2 | 3, tier: GpuLayoutTuning) => Simulation])[] = [
    ["forceatlas2", (ctx, dim, tier) => createForceAtlas2(ctx, { dim, scale: 100, seed: 3, maxIter: 60, ...tier })],
    [
        "fruchtermanReingold",
        (ctx, dim, tier) => createFruchtermanReingold(ctx, { dim, scale: 100, seed: 3, iterations: 60, ...tier }),
    ],
    [
        "springElectrical",
        (ctx, dim, tier) => createSpringElectrical(ctx, { dim, scale: 100, seed: 3, maxIter: 60, ...tier }),
    ],
];

/** The worst shortfall of any pair, as a share of the distance it should keep. */
function worstOverlap(positions: F32, radii: F32): number {
    let worst = 0;
    for (let i = 0; i < radii.length; i++) {
        for (let j = i + 1; j < radii.length; j++) {
            const d = Math.hypot(
                positions[3 * i] - positions[3 * j],
                positions[3 * i + 1] - positions[3 * j + 1],
                positions[3 * i + 2] - positions[3 * j + 2],
            );
            worst = Math.max(worst, 1 - d / (radii[i] + radii[j]));
        }
    }
    return worst;
}

/** Steps a loaded simulation until it settles. */
async function run(simulation: Simulation): Promise<void> {
    while (!simulation.settled) {
        await simulation.step(4);
        await simulation.flush();
    }
}

describe("the collision force on the device (issue #3256)", () => {
    let ctx: GpuContext;
    const snapshot: GraphSnapshot = storyGraph();
    const n = snapshot.nodeCount;

    beforeAll(async () => {
        ctx = await acquire({ label: "collision" });
    });

    afterAll(() => {
        ctx.dispose();
    });

    for (const [dim, flat] of [
        [2, false],
        [3, false],
        [3, true],
    ] as const) {
        it(`one sweep matches the f64 oracle, twice bitwise (dim ${dim}, flat ${flat})`, async (t) => {
            requireGpu(t);
            const scene = collideScene(Math.max(64, Math.round(2000 * gpuScale())), dim, flat);
            assertCheckPasses(await collideReport(ctx, scene));
            expectBitwiseEqual(await runCollide(ctx, scene), await runCollide(ctx, scene), "two sweeps");
        });
    }

    it("the settling sweeps part a pile of coincident nodes", async (t) => {
        requireGpu(t);
        const scene = collideScene(64, 2);
        const pile = { ...scene, positions: scene.positions.slice(), fixed: [] };
        for (let i = 0; i < 64; i++) {
            pile.positions.set([1, 1, 0, 1], 4 * i);
        }
        const rows = await runCollide(ctx, pile, 2);
        const stride3 = new Float32Array(3 * 64);
        for (let i = 0; i < 64; i++) {
            stride3.set(rows.subarray(4 * i, 4 * i + 3), 3 * i);
        }
        expect(worstOverlap(stride3, pile.radii)).toBeLessThan(1e-3);
    });

    for (const [name, create] of MODELS) {
        for (const [tierName, tier] of TIERS) {
            for (const dim of [2, 3] as const) {
                it(`${name} leaves no two nodes overlapping (${tierName}, dim ${dim})`, async (t) => {
                    requireGpu(t);
                    const positions = new Float32Array(3 * n).fill(Number.NaN);
                    const radii = Float32Array.from({ length: n }, (_, i) => 2 + (i % 4));
                    const simulation = create(ctx, dim, tier);
                    simulation.load(snapshot, positions);
                    simulation.setCollision?.({ radii, scale: 10 });
                    await run(simulation);
                    expect(
                        worstOverlap(
                            positions,
                            radii.map((radius) => radius * 10),
                        ),
                    ).toBeLessThan(1e-3);
                    simulation.dispose();
                });
            }
        }

        it(`${name} taken off leaves the run as it was without a collision`, async (t) => {
            requireGpu(t);
            const plain = new Float32Array(3 * n).fill(Number.NaN);
            const simulation = create(ctx, 2, { repulsion: "exact" });
            simulation.load(snapshot, plain);
            await run(simulation);
            simulation.dispose();

            const off = new Float32Array(3 * n).fill(Number.NaN);
            const other = create(ctx, 2, { repulsion: "exact" });
            other.load(snapshot, off);
            other.setCollision?.({ radii: new Float32Array(n).fill(5) });
            other.setCollision?.(null);
            await run(other);
            other.dispose();

            expectBitwiseEqual(off, plain, "off");
        });
    }

    it("refuses radii of the wrong length, and negative or infinite values", (t) => {
        requireGpu(t);
        const simulation = createFruchtermanReingold(ctx, { dim: 2, seed: 1 });
        simulation.load(snapshot, new Float32Array(3 * n).fill(Number.NaN));
        expect(() => {
            simulation.setCollision?.({ radii: new Float32Array(1) });
        }).toThrow(/one radius per node/);
        expect(() => {
            simulation.setCollision?.({ radii: new Float32Array(n).fill(-1) });
        }).toThrow(/finite and >= 0/);
        expect(() => {
            simulation.setCollision?.({ radii: new Float32Array(n), scale: 0 });
        }).toThrow(/scale/);
        simulation.dispose();
    });
});
