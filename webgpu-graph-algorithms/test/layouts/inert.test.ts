/**
 * setInert on the GPU simulations (issue #3075): a row taken out of the forces -- a group node the owner draws round
 * its members -- never moves and leaves every other row where a run without it puts them. Each model runs the same
 * members twice on the exact tier, once alone and once with one more row (no edges, at the members' centroid)
 * marked inert, and the members must match bit for bit. The control run only pins that row, which is what
 * graphty-element did before, and the members must differ: a pinned row still repels.
 */

import { type F32, type GraphSnapshot, makeMask, maskSet } from "@graphty/graph-format";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type GpuContext } from "../../src/context.js";
import { createForceAtlas2 } from "../../src/layouts/forceatlas2.js";
import { createFruchtermanReingold } from "../../src/layouts/fruchterman-reingold.js";
import { createSpringElectrical } from "../../src/layouts/spring-electrical.js";
import { type GpuLayoutSimulation, type LayoutStatsBase } from "../../src/types/layout.js";
import { snapshotOf } from "../helpers/graphs.js";
import { seededScenePositions } from "../oracle/forceatlas2.js";
import { acquire, requireGpu } from "../setup/gpu.js";

type Sim = GpuLayoutSimulation<unknown, LayoutStatsBase>;

/** A ring of 12 members with two chords. */
const EDGES: readonly (readonly [number, number])[] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 9],
    [9, 10],
    [10, 11],
    [11, 0],
    [0, 6],
    [3, 9],
];

const ITERATIONS = 40;

/** The seeded members, and with the group, row 12 at their centroid. */
function start(alone: GraphSnapshot, withGroup: boolean): F32 {
    const seeded = seededScenePositions(alone, 5, 2, 1, null);
    if (!withGroup) {
        return seeded;
    }
    const out = new Float32Array(39);
    out.set(seeded);
    for (let a = 0; a < 3; a++) {
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += seeded[3 * i + a];
        }
        out[36 + a] = sum / 12;
    }
    return out;
}

/** The largest coordinate difference over the 12 members. */
function memberDrift(a: F32, b: F32): number {
    let worst = 0;
    for (let k = 0; k < 36; k++) {
        worst = Math.max(worst, Math.abs(a[k] - b[k]));
    }
    return worst;
}

const COMMON = { dim: 2, scale: 1, center: [0, 0, 0], seed: 5, settleThreshold: 0, repulsion: "exact" } as const;

const MODELS: readonly (readonly [string, (ctx: GpuContext) => Sim])[] = [
    ["forceAtlas2", (ctx) => createForceAtlas2(ctx, { ...COMMON, maxIter: 1000 })],
    ["fruchtermanReingold", (ctx) => createFruchtermanReingold(ctx, { ...COMMON, k: 0.3, iterations: 1000 })],
    ["springElectrical", (ctx) => createSpringElectrical(ctx, { ...COMMON })],
];

describe("setInert (issue #3075)", () => {
    let ctx: GpuContext;
    let alone: GraphSnapshot;
    let grouped: GraphSnapshot;

    beforeAll(async () => {
        ctx = await acquire({ label: "inert" });
        alone = snapshotOf(EDGES, { nodeCount: 12, label: "members" });
        grouped = snapshotOf(EDGES, { nodeCount: 13, label: "members and group" });
    });

    afterAll(() => {
        ctx.release(alone);
        ctx.release(grouped);
    });

    async function run(make: (ctx: GpuContext) => Sim, group: "none" | "inert" | "fixed"): Promise<F32> {
        const withGroup = group !== "none";
        const positions = start(alone, withGroup);
        const sim = make(ctx);
        try {
            sim.load(withGroup ? grouped : alone, positions);
            if (withGroup) {
                const mask = makeMask(13);
                maskSet(mask, 12, true);
                if (group === "inert") {
                    sim.setInert?.(mask);
                } else {
                    sim.setFixed(mask);
                }
            }
            await sim.run({ maxIter: ITERATIONS, batch: 10 });
            expect(sim.iterationsDone).toBe(ITERATIONS);
        } finally {
            sim.dispose();
        }
        return positions;
    }

    for (const [name, make] of MODELS) {
        it(`${name}: an inert group never moves and its members lay out as they do without it`, async (t) => {
            requireGpu(t);
            const groupStart = start(alone, true).slice(36, 39);
            const without = await run(make, "none");
            const inert = await run(make, "inert");
            const pinnedOnly = await run(make, "fixed");
            expect([...inert.subarray(36, 39)]).toEqual([...groupStart]);
            expect(memberDrift(without, inert)).toBe(0);
            expect(memberDrift(without, pinnedOnly)).toBeGreaterThan(1e-3);
            expect(inert.every((v) => Number.isFinite(v))).toBe(true);
        });
    }

    it("forceAtlas2 with distributed action stays finite with an inert row", async (t) => {
        requireGpu(t);
        const make = (c: GpuContext): Sim =>
            createForceAtlas2(c, { ...COMMON, maxIter: 1000, distributedAction: true });
        const without = await run(make, "none");
        const inert = await run(make, "inert");
        expect(memberDrift(without, inert)).toBe(0);
    });

    it("the grid tier holds an inert group still and stays finite (its near field skips the row as the exact tier does)", async (t) => {
        requireGpu(t);
        for (const make of [
            (c: GpuContext): Sim =>
                createFruchtermanReingold(c, { ...COMMON, repulsion: "grid", k: 0.3, iterations: 1000 }),
            (c: GpuContext): Sim => createForceAtlas2(c, { ...COMMON, repulsion: "grid", maxIter: 1000 }),
        ]) {
            const inert = await run(make, "inert");
            expect([...inert.subarray(36, 39)]).toEqual([...start(alone, true).subarray(36, 39)]);
            expect(inert.every((v) => Number.isFinite(v))).toBe(true);
        }
    });

    it("rejects a mask too short for the graph", (t) => {
        requireGpu(t);
        const sim = MODELS[0][1](ctx);
        try {
            sim.load(grouped, start(alone, true));
            expect(() => {
                sim.setInert?.(new Uint32Array(0));
            }).toThrow(/setInert/);
        } finally {
            sim.dispose();
        }
    });
});
