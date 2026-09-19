/**
 * The W1b cross-test of the two seedPositions copies (integration plan Task M5b-T3 step 1; design 9.3
 * seedPositions): the GPU package keeps its OWN copy of the LCG and of the NaN-row seeding for its whole life
 * (D27: src/ may not import @graphty/layout), and layout/src/simulation/seed.ts:4-6 says the layout copy is
 * CANONICAL and "cross-tested against this one at W1b" -- this file is that cross-test. layout's own
 * test/simulation/seed.test.ts compares ITS copy with the package's RandomNumberGenerator; nothing until now
 * compared the two seedPositions implementations, and the only thing that keeps a CPU-seeded and a GPU-seeded
 * layout on the same start is that the two write the same f32 values in the same order.
 *
 * The matrix of the plan: seeds 1 / 7 / 42 / 123456, dim 2 and 3, scale 1 and 5, a null and a non-null centre,
 * an all-NaN array (a fresh layout: the range box) and a half-finite array (a topology change: fully finite rows,
 * PARTIAL rows and all-NaN rows in ONE array, which is what exercises the bounding box of PLAN DECISION 12 and the
 * 2D `z = center.z` rule of PLAN DECISION 13). Both draw ranges are covered because seedPositions takes one and
 * P5's Fruchterman-Reingold will use "fr". The comparison is expectBitwiseEqual, the byte-for-byte matcher, so
 * -0 / 0 and any surviving NaN count.
 *
 * Node-only: no GPU context, no requireGpu(t). The two copies are line for line identical EXCEPT four
 * argument-validation throw sites, where the GPU throws WebGpuGraphError("E_INVALID_ARGUMENT") and layout a
 * RangeError (src/layouts/seed.ts:62 / :105 / :112 / :123 against layout/src/simulation/seed.ts:62 / :101 / :104 /
 * :107). The last case pins that asymmetry -- both reject the SAME arguments and leave the array untouched -- so
 * nobody "fixes" one side into agreement with the other.
 */

import type { F32, GraphSnapshot } from "@graphty/graph-format";
import { Lcg as LayoutLcg, seedPositions as layoutSeedPositions } from "@graphty/layout";

import { isWebGpuGraphError } from "../../src/errors.js";
import { Lcg as GpuLcg, seedPositions as gpuSeedPositions } from "../../src/layouts/seed.js";
import { pathEdges, snapshotOf } from "../helpers/graphs.js";
import { expectBitwiseEqual } from "../helpers/matchers.js";

/** The signature both copies have, parameter for parameter (design 9.3 seedPositions). */
type SeedFn = (
    s: GraphSnapshot,
    positions: F32,
    seed: number | null,
    dim: 2 | 3,
    scale: number,
    center: ArrayLike<number> | null,
    range: "fa2" | "fr",
) => void;

/**
 * The seeds of the plan's matrix. NEVER 0, -0, NaN or null: src/layouts/seed.ts:35 (and its layout twin) turn
 * those into `Math.floor(Math.random() * 1000000)`, so the two copies would legitimately draw different streams
 * and a bit-identical assertion over them would be non-deterministic.
 */
const SEEDS: readonly number[] = [1, 7, 42, 123456];
/** Both dimensionalities. */
const DIMS: readonly (2 | 3)[] = [2, 3];
/** Scene scale 1 (layout units = scene units) and 5. */
const SCALES: readonly number[] = [1, 5];
/** A null centre (the origin) and a non-null one with three distinct components. */
const CENTERS: readonly (readonly number[] | null)[] = [null, [10, -20, 5]];
/** Both draw ranges: "fa2" is [-1, 1), "fr" is [0, 1). */
const RANGES: readonly ("fa2" | "fr")[] = ["fa2", "fr"];
/** The node count of both start arrays: a multiple of 3, so halfFinite() carries three rows of each kind. */
const NODES = 9;
/** Draws compared per seed in the Lcg case. */
const DRAWS = 1000;

/**
 * A path snapshot (undirected, no columns), the shape every case seeds.
 * @param n - the node count
 * @returns the snapshot
 */
function graph(n: number): GraphSnapshot {
    return snapshotOf(pathEdges(n), { nodeCount: n, label: "seed-cross" });
}

/**
 * A fresh layout: every component unseeded.
 * @param n - the node count
 * @returns a stride-3 all-NaN array
 */
function allNaN(n: number): F32 {
    return new Float32Array(3 * n).fill(Number.NaN);
}

/**
 * A topology change: row i % 3 === 0 fully finite (it fixes the bounding box), row i % 3 === 1 finite in x only
 * (a PARTIAL row, whose finite x widens the box -- PLAN DECISION 12), row i % 3 === 2 all NaN.
 * @param n - the node count
 * @returns the stride-3 array
 */
function halfFinite(n: number): F32 {
    const positions = allNaN(n);
    for (let i = 0; i < n; i++) {
        if (i % 3 === 0) {
            positions[3 * i] = i - 2;
            positions[3 * i + 1] = 0.5 * i;
            positions[3 * i + 2] = 0.25 * i;
        } else if (i % 3 === 1) {
            positions[3 * i] = 3 - 0.5 * i;
        }
    }
    return positions;
}

/** The two start shapes of the plan. */
const STARTS: readonly { readonly name: string; readonly make: (n: number) => F32 }[] = [
    { name: "all-NaN", make: allNaN },
    { name: "half-finite", make: halfFinite },
];

/**
 * The value a call threw (the shape of test/layouts/seed.test.ts:36 errorOf, widened because the two copies throw
 * DIFFERENT error types by design).
 * @param fn - the call
 * @returns the thrown value
 */
function thrownBy(fn: () => void): unknown {
    try {
        fn();
    } catch (err) {
        return err;
    }
    throw new Error("expected the call to throw");
}

describe("seedPositions: the GPU copy and @graphty/layout's write the same f32 values (W1b, Task M5b-T3)", () => {
    const s = graph(NODES);

    for (const seed of SEEDS) {
        for (const dim of DIMS) {
            it(`seed ${seed}, ${dim}D: bit-identical over scale, centre, range and both start shapes`, () => {
                for (const scale of SCALES) {
                    for (const center of CENTERS) {
                        for (const range of RANGES) {
                            for (const start of STARTS) {
                                const where = center === null ? "null" : `[${center.join(", ")}]`;
                                const label =
                                    `seed ${seed}, ${dim}D, scale ${scale}, center ${where}, ` +
                                    `range ${range}, ${start.name}`;
                                const gpu = start.make(NODES);
                                const cpu = start.make(NODES);
                                expectBitwiseEqual(gpu, cpu, `${label}: the two inputs`);
                                gpuSeedPositions(s, gpu, seed, dim, scale, center, range);
                                layoutSeedPositions(s, cpu, seed, dim, scale, center, range);
                                expectBitwiseEqual(gpu, cpu, label);
                                // never vacuous: after seeding every component of every row is finite
                                expect(
                                    Array.from(gpu).every((v) => Number.isFinite(v)),
                                    `${label}: every component seeded`,
                                ).toBe(true);
                            }
                        }
                    }
                }
            });
        }
    }

    it(`the two Lcg copies draw the same ${DRAWS} values for every seed of the matrix`, () => {
        for (const seed of SEEDS) {
            const gpu = new GpuLcg(seed);
            const cpu = new LayoutLcg(seed);
            expect(gpu.seed, `seed ${seed}: the seed actually used`).toBe(cpu.seed);
            const a = Float64Array.from({ length: DRAWS }, () => gpu.next());
            const b = Float64Array.from({ length: DRAWS }, () => cpu.next());
            expectBitwiseEqual(a, b, `Lcg seed ${seed}`);
        }
    });

    it("both copies reject the same arguments and leave the array untouched (only the error TYPE differs, D27)", () => {
        const cases: readonly { readonly name: string; readonly call: (fn: SeedFn) => void }[] = [
            { name: "dim 4", call: (fn) => fn(s, allNaN(NODES), 1, 4 as unknown as 2, 1, null, "fa2") },
            { name: "a wrong positions length", call: (fn) => fn(s, new Float32Array(5), 1, 2, 1, null, "fa2") },
            { name: "scale 0", call: (fn) => fn(s, allNaN(NODES), 1, 2, 0, null, "fa2") },
            { name: "a non-finite scale", call: (fn) => fn(s, allNaN(NODES), 1, 2, Number.NaN, null, "fa2") },
            { name: "a non-finite center", call: (fn) => fn(s, allNaN(NODES), 1, 2, 1, [Number.NaN, 0], "fa2") },
        ];
        for (const c of cases) {
            const gpuError = thrownBy(() => c.call(gpuSeedPositions));
            const cpuError = thrownBy(() => c.call(layoutSeedPositions));
            if (!isWebGpuGraphError(gpuError)) {
                expect.fail(`${c.name}: the GPU copy threw ${String(gpuError)}, expected a WebGpuGraphError`);
            }
            expect(gpuError.code, `${c.name}: the GPU error code`).toBe("E_INVALID_ARGUMENT");
            expect(cpuError, `${c.name}: layout throws a RangeError`).toBeInstanceOf(RangeError);
        }
        // a rejected call writes nothing on either side
        const gpu = allNaN(NODES);
        const cpu = allNaN(NODES);
        expect(() => gpuSeedPositions(s, gpu, 1, 2, 0, null, "fa2")).toThrow();
        expect(() => layoutSeedPositions(s, cpu, 1, 2, 0, null, "fa2")).toThrow();
        expectBitwiseEqual(gpu, cpu, "both arrays untouched after a rejected call");
        expect(
            Array.from(gpu).every((v) => Number.isNaN(v)),
            "the GPU array is still all NaN",
        ).toBe(true);
    });
});
