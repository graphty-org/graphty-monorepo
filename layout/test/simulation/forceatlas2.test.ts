import assert from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { fromEdgeArrays, type GraphSnapshot, makeMask, maskSet } from "@graphty/graph-format";
import { describe, it } from "vitest";

import { FA2_DEFAULTS } from "../../src/simulation/constants";
import { ForceAtlas2Simulation } from "../../src/simulation/forceatlas2";
import { seedPositions } from "../../src/simulation/seed";

type NodeColumns = NonNullable<Parameters<typeof fromEdgeArrays>[0]["nodeColumns"]>;

function grid(w: number, h: number, nodeColumns?: NodeColumns) {
    const src: number[] = [];
    const dst: number[] = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = y * w + x;
            if (x + 1 < w) {
                src.push(i);
                dst.push(i + 1);
            }
            if (y + 1 < h) {
                src.push(i);
                dst.push(i + w);
            }
        }
    }
    return fromEdgeArrays({
        directed: false,
        nodeCount: w * h,
        src: Uint32Array.from(src),
        dst: Uint32Array.from(dst),
        nodeColumns,
    });
}

function seeded(s: GraphSnapshot, seed: number, dim: 2 | 3 = 2) {
    const positions = new Float32Array(3 * s.nodeCount).fill(Number.NaN);
    seedPositions(s, positions, seed, dim, 1, null, "fa2");
    return positions;
}

type Options = ConstructorParameters<typeof ForceAtlas2Simulation>[0];

/** Runs a fresh simulation over `s` from seed 11 for `iterations` and returns the owner's array. */
function run(s: GraphSnapshot, options: Options, iterations = 10) {
    const positions = seeded(s, 11, options?.dim ?? 2);
    const sim = new ForceAtlas2Simulation({ settleThreshold: 0, ...options });
    sim.load(s, positions);
    sim.step(iterations);
    sim.dispose();
    return positions;
}

function assertFinite(positions: Float32Array) {
    for (const v of positions) {
        assert.ok(Number.isFinite(v));
    }
}

describe("ForceAtlas2Simulation", () => {
    it("steps the owner's array in place and settles within maxIter", () => {
        const s = grid(6, 6);
        const positions = seeded(s, 7);
        const sim = new ForceAtlas2Simulation({ maxIter: 200 });
        sim.load(s, positions);
        assert.equal(sim.settled, false);
        const before = Float32Array.from(positions);
        sim.step();
        assert.equal(sim.iterationsDone, 1);
        assert.notDeepEqual(Array.from(positions), Array.from(before), "positions moved");
        while (!sim.settled) {
            sim.step(10);
        }
        assert.ok(sim.iterationsDone <= 200);
        for (const v of positions) {
            assert.ok(Number.isFinite(v));
        }
    });

    it("is deterministic for a seed and independent of the step batching", () => {
        const s = grid(5, 5);
        const a = seeded(s, 42);
        const b = seeded(s, 42);
        const simA = new ForceAtlas2Simulation();
        const simB = new ForceAtlas2Simulation();
        simA.load(s, a);
        simB.load(s, b);
        for (let k = 0; k < 20; k++) {
            simA.step();
        }
        simB.step(20);
        assert.deepEqual(Array.from(a), Array.from(b));
    });

    it("a fixed node never moves; unpinning reheats", () => {
        const s = grid(4, 4);
        const positions = seeded(s, 3);
        const sim = new ForceAtlas2Simulation({ maxIter: 50 });
        sim.load(s, positions);
        const mask = makeMask(s.nodeCount);
        maskSet(mask, 5, true);
        sim.setFixed(mask);
        const x = positions[15];
        const y = positions[16];
        sim.step(30);
        assert.equal(positions[15], x);
        assert.equal(positions[16], y);
        while (!sim.settled) {
            sim.step();
        }
        maskSet(mask, 5, false);
        sim.setFixed(mask);
        assert.equal(sim.settled, false, "unpinning reheats (design 7.12)");
    });

    it("setPosition writes the scene position immediately and reheats without resetting the speed controller", () => {
        const s = grid(3, 3);
        const positions = seeded(s, 9);
        const sim = new ForceAtlas2Simulation({ maxIter: 20 });
        sim.load(s, positions);
        while (!sim.settled) {
            sim.step();
        }
        sim.setPosition(4, 100, -100, 0);
        assert.deepEqual(Array.from(positions.subarray(12, 15)), [100, -100, 0]);
        assert.equal(sim.settled, false);
    });

    it("2D keeps z at center.z; 3D moves z", () => {
        const s = grid(4, 3);
        const p2 = seeded(s, 5, 2);
        const sim2 = new ForceAtlas2Simulation({ dim: 2, center: [0, 0, 7] });
        sim2.load(s, p2);
        sim2.step(5);
        for (let i = 0; i < s.nodeCount; i++) {
            assert.equal(p2[3 * i + 2], 7);
        }
        const p3 = seeded(s, 5, 3);
        const sim3 = new ForceAtlas2Simulation({ dim: 3 });
        sim3.load(s, p3);
        sim3.step(5);
        assert.ok(Array.from(p3).some((_, k) => k % 3 === 2 && p3[k] !== 0));
    });

    it("matches the NetworkX trajectories the GPU package pins, in networkx compat (design 11.4 oracle independence)", () => {
        // The fixture format is the GPU package's (test/fixtures/networkx/generate.py, NetworkX 3.4.2, seed 7):
        // { graph: { name, directed, nodeCount, src, dst, weights }, options: { max_iter, jitter_tolerance,
        //   scaling_ratio, gravity, distributed_action, strong_gravity, linlog, dissuade_hubs, weight, dim },
        //   initialPositions: number[n][dim], positions: number[n][dim] (after max_iter iterations), rescaled: false }
        for (const name of ["karate-base-iter1", "karate-base-iter5", "gnm200-base-iter1", "gnm200-base-iter5"]) {
            // layout's vitest environment is happy-dom, which rewrites import.meta.url, so the fixtures are located
            // from the package root like every other file-reading test of this package (test/package-structure.test.ts)
            const file = resolve(process.cwd(), "test/simulation/fixtures/networkx", `${name}.json`);
            const f = JSON.parse(readFileSync(file, "utf8"));
            assert.equal(f.rescaled, false);
            assert.equal(f.graph.directed, false);
            const s = fromEdgeArrays({
                directed: false,
                nodeCount: f.graph.nodeCount,
                src: Uint32Array.from(f.graph.src),
                dst: Uint32Array.from(f.graph.dst),
            });
            const n = s.nodeCount;
            const dim: 2 | 3 = f.options.dim === 3 ? 3 : 2;
            const positions = new Float32Array(3 * n);
            for (let i = 0; i < n; i++) {
                for (let a = 0; a < dim; a++) {
                    positions[3 * i + a] = f.initialPositions[i][a];
                }
            }
            const sim = new ForceAtlas2Simulation({
                maxIter: f.options.max_iter,
                jitterTolerance: f.options.jitter_tolerance,
                scalingRatio: f.options.scaling_ratio,
                gravity: f.options.gravity,
                distributedAction: f.options.distributed_action,
                strongGravity: f.options.strong_gravity,
                linlog: f.options.linlog,
                dissuadeHubs: f.options.dissuade_hubs,
                weight: f.options.weight === null ? false : true,
                dim,
                settleThreshold: 0,
                compat: "networkx",
            });
            sim.load(s, positions);
            sim.step(f.options.max_iter);
            assert.equal(sim.iterationsDone, f.options.max_iter);
            assert.equal(sim.settled, true, `${name}: settled at maxIter`);
            // the GPU package's oracle matches these fixtures within 1e-9 at 1 and 5 iterations from an f64 start; the
            // simulation starts from the f32-rounded positions of the owner's array and writes f32 back, which the
            // oracle itself measured at 8.0e-5 relative on gnm200-base-iter5 (7.3e-7 karate-iter1, 1.3e-5 karate-iter5,
            // 2.0e-6 gnm200-iter1) -- so 3e-4 is the bound: a real port bug is orders of magnitude larger
            for (let i = 0; i < n; i++) {
                for (let a = 0; a < dim; a++) {
                    const expected = f.positions[i][a];
                    assert.ok(
                        Math.abs(positions[3 * i + a] - expected) <= 3e-4 * Math.max(1, Math.abs(expected)),
                        `${name} node ${i} axis ${a}: ${positions[3 * i + a]} vs ${expected}`,
                    );
                }
            }
        }
    });

    it("rejects a directed snapshot and a wrong array length; dispose() ends stepping", () => {
        const s = grid(2, 2);
        const sim = new ForceAtlas2Simulation();
        const directed = fromEdgeArrays({
            directed: true,
            nodeCount: 2,
            src: Uint32Array.from([0]),
            dst: Uint32Array.from([1]),
        });
        assert.throws(() => sim.load(directed, new Float32Array(6)), /undirected/);
        assert.throws(() => sim.load(s, new Float32Array(5)), /positions/);
        sim.load(s, seeded(s, 1));
        sim.dispose();
        assert.throws(() => sim.step(), /disposed/);
    });
});

describe("ForceAtlas2Simulation: the force-law variants (design 7.2)", () => {
    const s = grid(5, 4);

    it("linlog, strongGravity, distributedAction and networkx compat each change the trajectory and stay finite", () => {
        const base = run(s, {});
        for (const options of [
            { linlog: true },
            { strongGravity: true },
            { distributedAction: true },
            { compat: "networkx" as const },
            { gravity: 0 },
            { scalingRatio: 5 },
        ]) {
            const variant = run(s, options);
            assertFinite(variant);
            assert.notDeepEqual(Array.from(variant), Array.from(base), JSON.stringify(options));
        }
    });

    it("accepts and ignores dissuadeHubs, nodeSize, seed and maxInFlight", () => {
        const base = run(s, {});
        const same = run(s, { dissuadeHubs: true, nodeSize: { a: 3 }, seed: 99, maxInFlight: 4 });
        assert.deepEqual(Array.from(same), Array.from(base));
        assert.deepEqual(Array.from(run(s, { compat: "paper" })), Array.from(base), "paper is the default (D5)");
    });

    it("weights: the snapshot's arc weights (weight: true), an edge column by name, or none", () => {
        const ws = fromEdgeArrays({
            directed: false,
            nodeCount: 6,
            src: Uint32Array.from([0, 1, 2, 3, 4, 5]),
            dst: Uint32Array.from([1, 2, 3, 4, 5, 0]),
            weights: Float32Array.from([1, 8, 1, 8, 1, 8]),
            edgeColumns: { cost: Float32Array.from([2, 2, 2, 2, 2, 2]) },
        });
        assert.ok(ws.weights !== null);
        const unweighted = run(ws, { weight: false });
        const weighted = run(ws, { weight: true });
        const byColumn = run(ws, { weight: "cost" });
        assertFinite(weighted);
        assertFinite(byColumn);
        assert.notDeepEqual(Array.from(weighted), Array.from(unweighted), "the arc weights reach the attraction");
        assert.notDeepEqual(Array.from(byColumn), Array.from(unweighted), "the column reaches the attraction");
        assert.notDeepEqual(Array.from(byColumn), Array.from(weighted));
        // the strongly bound pairs (weight 8) end closer than the weakly bound ones (weight 1)
        const d = (p: Float32Array, i: number, j: number) =>
            Math.hypot(p[3 * i] - p[3 * j], p[3 * i + 1] - p[3 * j + 1]);
        const strong = (d(weighted, 1, 2) + d(weighted, 3, 4) + d(weighted, 5, 0)) / 3;
        const weak = (d(weighted, 0, 1) + d(weighted, 2, 3) + d(weighted, 4, 5)) / 3;
        assert.ok(strong < weak, `strong ${strong} < weak ${weak}`);
    });

    it("mass: a Float32Array, the legacy record, a role-mass column, else outDegree + 1", () => {
        const base = run(s, {});
        const heavy = run(s, { nodeMass: new Float32Array(s.nodeCount).fill(5) });
        assertFinite(heavy);
        assert.notDeepEqual(Array.from(heavy), Array.from(base));
        const record: Record<string, number> = {};
        for (let i = 0; i < s.nodeCount; i++) {
            record[String(i)] = 5;
        }
        const viaRecord = run(s, { nodeMass: record });
        assert.deepEqual(Array.from(viaRecord), Array.from(heavy), "the record resolves through the id map");
        // the default is outDegree + 1 per node (design 7.14, D28): the same run as that vector given explicitly
        const degree = s.outDegree();
        const defaults = new Float32Array(s.nodeCount);
        for (let i = 0; i < s.nodeCount; i++) {
            defaults[i] = degree[i] + 1;
        }
        const explicit = run(s, { nodeMass: defaults });
        assert.deepEqual(Array.from(explicit), Array.from(base), "the default mass is outDegree + 1");
        // a role-mass node column is the default when the option is absent: the run differs from outDegree + 1
        const heft = new Float32Array(s.nodeCount);
        for (let i = 0; i < s.nodeCount; i++) {
            heft[i] = 1 + (i % 4);
        }
        const withRole = grid(5, 4, { heft: { data: heft, decl: { dtype: "f32", role: "mass" } } });
        const viaRole = run(withRole, {});
        assertFinite(viaRole);
        assert.notDeepEqual(Array.from(viaRole), Array.from(base), "the role-mass column reaches the layout");
        assert.deepEqual(
            Array.from(run(withRole, { nodeMass: heft })),
            Array.from(viaRole),
            "the role column is the same vector given explicitly",
        );
        assert.throws(() => run(s, { nodeMass: new Float32Array(s.nodeCount) }), /mass\[0\] must be positive/);
        assert.throws(() => run(s, { nodeMass: "absent" }), /node column "absent"/);
    });

    it("self-loops exert no attraction and parallel arcs sum", () => {
        // a triangle plus a self-loop on node 0: the loop contributes nothing to node 0's attraction
        const loops = fromEdgeArrays(
            {
                directed: false,
                nodeCount: 3,
                src: Uint32Array.from([0, 1, 2, 0]),
                dst: Uint32Array.from([1, 2, 0, 0]),
            },
            { selfLoops: "keep" },
        );
        const plain = fromEdgeArrays({
            directed: false,
            nodeCount: 3,
            src: Uint32Array.from([0, 1, 2]),
            dst: Uint32Array.from([1, 2, 0]),
        });
        assert.ok(loops.arcCount > plain.arcCount, "the self-loop is present as an arc");
        const mass = new Float32Array([3, 3, 3]);
        const a = run(loops, { nodeMass: mass }, 5);
        const b = run(plain, { nodeMass: mass }, 5);
        assert.deepEqual(Array.from(a), Array.from(b));
        // parallel arcs sum: a doubled undirected arc between 0 and 1 (kept by the default duplicateEdges policy,
        // every weight 1) is a single weight-2 arc under weight: true -- w * d + w * d is exactly 2 w * d in f64;
        // the mass is explicit because the doubled arc also changes outDegree
        const doubled = fromEdgeArrays({
            directed: false,
            nodeCount: 3,
            src: Uint32Array.from([0, 0, 1]),
            dst: Uint32Array.from([1, 1, 2]),
        });
        assert.equal(doubled.arcCount, 6, "both parallel arcs are kept");
        const single = fromEdgeArrays({
            directed: false,
            nodeCount: 3,
            src: Uint32Array.from([0, 1]),
            dst: Uint32Array.from([1, 2]),
            weights: Float32Array.from([2, 1]),
        });
        const summed = run(doubled, { nodeMass: mass, weight: true }, 5);
        const weighted = run(single, { nodeMass: mass, weight: true }, 5);
        assertFinite(summed);
        assert.deepEqual(Array.from(summed), Array.from(weighted), "two weight-1 arcs equal one weight-2 arc");
        assert.notDeepEqual(
            Array.from(run(single, { nodeMass: mass, weight: false }, 5)),
            Array.from(weighted),
            "the weight-2 arc differs from a weight-1 one",
        );
    });

    it("coincident nodes are kicked apart by the deterministic antisymmetric direction (2D and 3D)", () => {
        for (const dim of [2, 3] as const) {
            const pair = fromEdgeArrays({
                directed: false,
                nodeCount: 4,
                src: Uint32Array.from([0, 1, 2]),
                dst: Uint32Array.from([1, 2, 3]),
            });
            const positions = new Float32Array(12);
            positions.set([0.5, 0.5, dim === 3 ? 0.5 : 0, 0.5, 0.5, dim === 3 ? 0.5 : 0, -0.5, 0.2, 0, 0.1, -0.7, 0]);
            const sim = new ForceAtlas2Simulation({ dim, settleThreshold: 0 });
            sim.load(pair, positions);
            sim.step();
            assertFinite(positions);
            const dx = positions[0] - positions[3];
            const dy = positions[1] - positions[4];
            const dz = positions[2] - positions[5];
            assert.ok(Math.hypot(dx, dy, dz) > 0.01, `dim ${dim}: the coincident pair separated`);
            if (dim === 2) {
                assert.equal(positions[2], 0);
                assert.equal(positions[5], 0);
            }
        }
    });

    it("scale and center: the layout runs in layout units and the array holds scene units", () => {
        const plain = run(s, {}, 5);
        // scale 4, center 0: v * 4 is exact in f32, so the scene trajectory is exactly 4 x the layout-unit one
        const scaled = seeded(s, 11, 2);
        for (let i = 0; i < scaled.length; i++) {
            scaled[i] *= 4;
        }
        const exact = new ForceAtlas2Simulation({ settleThreshold: 0, scale: 4 });
        exact.load(s, scaled);
        exact.step(5);
        for (let i = 0; i < scaled.length; i++) {
            assert.equal(scaled[i], plain[i] * 4, `component ${i}`);
        }
        // a general scale and centre: the same trajectory up to the f32 rounding of the scene start
        const positions = seeded(s, 11, 2);
        for (let i = 0; i < positions.length; i++) {
            positions[i] = positions[i] * 100 + [10, -20, 3][i % 3];
        }
        const sim = new ForceAtlas2Simulation({ settleThreshold: 0, scale: 100, center: [10, -20, 3] });
        sim.load(s, positions);
        sim.step(5);
        for (let i = 0; i < s.nodeCount; i++) {
            assert.ok(Math.abs(positions[3 * i] - (plain[3 * i] * 100 + 10)) <= 0.1, `x of ${i}`);
            assert.ok(Math.abs(positions[3 * i + 1] - (plain[3 * i + 1] * 100 - 20)) <= 0.1, `y of ${i}`);
            assert.equal(positions[3 * i + 2], 3, "2D writes z = center.z");
        }
        assert.throws(() => new ForceAtlas2Simulation({ center: [0, Number.NaN] }), /center\[1\]/);
        assert.throws(() => new ForceAtlas2Simulation({ center: [1, 2, 3, 4] }), /center/);
    });
});

describe("ForceAtlas2Simulation: settlement, pins and drags (design 7.12, 7.17, D8)", () => {
    it("settles by the window when nothing moves: an all-fixed layout is settled after settleWindow iterations", () => {
        const s = grid(3, 3);
        const positions = seeded(s, 2);
        const sim = new ForceAtlas2Simulation({ maxIter: 100, settleWindow: 4 });
        sim.load(s, positions);
        sim.setFixed(makeMask(s.nodeCount, true));
        const before = Float32Array.from(positions);
        while (!sim.settled) {
            sim.step();
        }
        // K1 folds the previous integrate: the window fills one iteration after the displacements stop
        assert.equal(sim.iterationsDone, 5);
        assert.deepEqual(Array.from(positions), Array.from(before), "no row is written while every node is fixed");
    });

    it("a single node feels no force: it stays put, the speed grows to its cap and the window settles it", () => {
        const one = fromEdgeArrays({ directed: false, nodeCount: 1, src: new Uint32Array(0), dst: new Uint32Array(0) });
        const positions = Float32Array.from([0.25, -0.5, 0]);
        const sim = new ForceAtlas2Simulation({ maxIter: 60, settleWindow: 100, settleThreshold: 0 });
        sim.load(one, positions);
        sim.step(60); // swing 0: the target speed is 1e30 and the speed rises 1.5 x per iteration past 1000
        assert.deepEqual(Array.from(positions), [0.25, -0.5, 0]);
        assert.equal(sim.iterationsDone, 60);
        const windowed = new ForceAtlas2Simulation({ maxIter: 60, settleWindow: 3 });
        windowed.load(one, positions);
        while (!windowed.settled) {
            windowed.step();
        }
        assert.equal(
            windowed.iterationsDone,
            4,
            "the window fills one iteration late (K1 folds the previous integrate)",
        );
        // networkx compat: origin gravity vanishes inside the 0.01 floor (7.2 row "Gravity law")
        const origin = Float32Array.from([0, 0, 0]);
        const nx = new ForceAtlas2Simulation({ compat: "networkx", settleThreshold: 0 });
        nx.load(one, origin);
        nx.step(3);
        assert.deepEqual(Array.from(origin), [0, 0, 0]);
    });

    it("an empty graph is settled at once and steps do nothing", () => {
        const empty = fromEdgeArrays({
            directed: false,
            nodeCount: 0,
            src: new Uint32Array(0),
            dst: new Uint32Array(0),
        });
        const sim = new ForceAtlas2Simulation();
        assert.equal(sim.settled, false, "not loaded: not settled");
        sim.load(empty, new Float32Array(0));
        assert.equal(sim.settled, true);
        sim.step(5);
        assert.equal(sim.iterationsDone, 0);
    });

    it("step() stops at the iteration budget mid-batch and reheat() restores it", () => {
        const s = grid(3, 3);
        const positions = seeded(s, 4);
        const sim = new ForceAtlas2Simulation({ maxIter: 7, settleThreshold: 0 });
        sim.load(s, positions);
        sim.step(5);
        assert.equal(sim.iterationsDone, 5);
        sim.step(5);
        assert.equal(sim.iterationsDone, 7);
        assert.equal(sim.settled, true);
        const frozen = Float32Array.from(positions);
        sim.step(5);
        assert.deepEqual(Array.from(positions), Array.from(frozen), "settled: step() returns at once");
        sim.reheat();
        assert.equal(sim.iterationsDone, 0);
        assert.equal(sim.settled, false);
        sim.step(2);
        assert.equal(sim.iterationsDone, 2);
        assert.notDeepEqual(Array.from(positions), Array.from(frozen));
    });

    it("reheat() works before load() and the networkx accumulators restart from 1", () => {
        const sim = new ForceAtlas2Simulation({ compat: "networkx", settleThreshold: 0 });
        sim.reheat();
        const s = grid(3, 3);
        const a = seeded(s, 6);
        sim.load(s, a);
        sim.step(3);
        sim.reheat();
        sim.step(3);
        // a fresh simulation stepped 3 times from the same start as the reheated one after its reset
        const b = seeded(s, 6);
        const fresh = new ForceAtlas2Simulation({ compat: "networkx", settleThreshold: 0 });
        fresh.load(s, b);
        fresh.step(6);
        assert.notDeepEqual(Array.from(a), Array.from(b), "the accumulated swing / traction were reset by reheat()");
        assertFinite(a);
        // paper mode: reheat() touches only the budget and the window (D8), so 3 + reheat + 3 equals 6 exactly
        const c = seeded(s, 6);
        const paper = new ForceAtlas2Simulation({ settleThreshold: 0 });
        paper.load(s, c);
        paper.step(3);
        paper.reheat();
        paper.step(3);
        const d = seeded(s, 6);
        const straight = new ForceAtlas2Simulation({ settleThreshold: 0 });
        straight.load(s, d);
        straight.step(6);
        assert.deepEqual(Array.from(c), Array.from(d), "the speed controller is untouched by reheat()");
    });

    it("pinning does not reheat, unpinning a node above the first word does, a short mask throws", () => {
        const s = grid(8, 5); // 40 nodes: two mask words
        const positions = seeded(s, 8);
        const sim = new ForceAtlas2Simulation({ maxIter: 5, settleThreshold: 0 });
        sim.load(s, positions);
        while (!sim.settled) {
            sim.step();
        }
        const mask = makeMask(s.nodeCount);
        maskSet(mask, 37, true);
        sim.setFixed(mask);
        assert.equal(sim.settled, true, "a pin never reheats (design 7.12)");
        sim.setFixed(mask);
        assert.equal(sim.settled, true, "an identical mask never reheats");
        maskSet(mask, 3, true);
        sim.setFixed(mask);
        assert.equal(sim.settled, true);
        maskSet(mask, 37, false);
        sim.setFixed(mask);
        assert.equal(sim.settled, false, "an unpin reheats");
        assert.throws(() => sim.setFixed(new Uint32Array(1)), /mask/);
        // bits at or above n never count as an unpin
        sim.step(5);
        assert.equal(sim.settled, true);
        const wide = makeMask(64);
        maskSet(wide, 3, true);
        maskSet(wide, 63, true);
        sim.setFixed(wide);
        maskSet(wide, 63, false);
        sim.setFixed(wide);
        assert.equal(sim.settled, true, "bit 63 is above n");
    });

    it("load() keeps the mask for the same n and clears it when n changes", () => {
        const s = grid(3, 3);
        const sim = new ForceAtlas2Simulation({ settleThreshold: 0 });
        const p1 = seeded(s, 1);
        sim.load(s, p1);
        const mask = makeMask(s.nodeCount);
        maskSet(mask, 0, true);
        sim.setFixed(mask);
        const p2 = seeded(s, 2);
        sim.load(s, p2);
        const x = p2[0];
        sim.step(3);
        assert.equal(p2[0], x, "the pin survives a same-size load");
        const t = grid(4, 4);
        const p3 = seeded(t, 3);
        sim.load(t, p3);
        const y = p3[0];
        sim.step(3);
        assert.notEqual(p3[0], y, "a load that changes n clears the pins");
    });

    it("setPosition validates the index and the coordinates and converts into layout units", () => {
        const s = grid(3, 3);
        const positions = seeded(s, 9);
        const sim = new ForceAtlas2Simulation({ settleThreshold: 0, scale: 10, center: [1, 2, 3], maxIter: 3 });
        sim.load(s, positions);
        assert.throws(() => sim.setPosition(9, 0, 0, 0), /index/);
        assert.throws(() => sim.setPosition(-1, 0, 0, 0), /index/);
        assert.throws(() => sim.setPosition(1.5, 0, 0, 0), /index/);
        assert.throws(() => sim.setPosition(0, Number.NaN, 0, 0), /finite/);
        assert.throws(() => sim.setPosition(0, 0, Number.POSITIVE_INFINITY, 0), /finite/);
        const mask = makeMask(s.nodeCount);
        maskSet(mask, 4, true);
        sim.setFixed(mask);
        sim.setPosition(4, 11, -18, 9);
        assert.deepEqual(Array.from(positions.subarray(12, 15)), [11, -18, 9], "written as given, z included");
        sim.step(3);
        assert.deepEqual(Array.from(positions.subarray(12, 15)), [11, -18, 9], "a fixed row is never written back");
        // a free node dragged far away pulls its neighbours towards it: the internal position took the drag
        const before = Float32Array.from(positions);
        maskSet(mask, 4, false);
        sim.setFixed(mask);
        sim.setPosition(4, 1001, 2, 3);
        sim.step();
        assert.ok(positions[3 * 3] > before[3 * 3], "node 3 (a neighbour of 4) moved towards +x");
        assert.equal(positions[3 * 4 + 2], 3, "the write-back puts z = center.z in 2D");
        // 3D: the dragged z reaches the layout too -- a free node dragged to z = 50 is written back near 50 after
        // one iteration (its neighbours pull it back by a few units at most), not near its seeded z in [-1, 1)
        const p3 = seeded(s, 9, 3);
        const sim3 = new ForceAtlas2Simulation({ dim: 3, settleThreshold: 0 });
        sim3.load(s, p3);
        sim3.setPosition(4, 0, 0, 50);
        assert.deepEqual(Array.from(p3.subarray(12, 15)), [0, 0, 50]);
        sim3.step();
        assertFinite(p3);
        assert.ok(p3[3 * 4 + 2] > 25, `node 4 kept most of its dragged z: ${p3[3 * 4 + 2]}`);
        assert.ok(Math.abs(p3[3 * 4]) < 10 && Math.abs(p3[3 * 4 + 1]) < 10, "and its dragged x / y");
    });

    it("step() and the pin / drag methods reject use before load() and after dispose()", () => {
        const sim = new ForceAtlas2Simulation();
        assert.throws(() => sim.step(), /not loaded/);
        assert.throws(() => sim.setFixed(makeMask(4)), /not loaded/);
        assert.throws(() => sim.setPosition(0, 0, 0, 0), /not loaded/);
        const s = grid(2, 2);
        sim.load(s, seeded(s, 1));
        assert.throws(() => sim.step(0), /iterations/);
        assert.throws(() => sim.step(1.5), /iterations/);
        sim.dispose();
        sim.dispose();
        assert.equal(sim.settled, false);
        assert.throws(() => sim.step(), /disposed/);
        assert.throws(() => sim.load(s, seeded(s, 1)), /disposed/);
        assert.throws(() => sim.setFixed(makeMask(4)), /disposed/);
        assert.throws(() => sim.setPosition(0, 0, 0, 0), /disposed/);
        assert.throws(() => sim.reheat(), /disposed/);
    });
});

describe("ForceAtlas2Simulation: option validation (design 7.14)", () => {
    it("applies FA2_DEFAULTS and rejects out-of-range values", () => {
        assert.equal(FA2_DEFAULTS.maxIter, 100);
        assert.equal(FA2_DEFAULTS.settleWindow, 10);
        const s = grid(2, 2);
        const sim = new ForceAtlas2Simulation({});
        sim.load(s, seeded(s, 1));
        sim.step();
        assert.equal(sim.iterationsDone, 1, "iterationsPerStep defaults to 1");
        const perStep = new ForceAtlas2Simulation({ iterationsPerStep: 3 });
        perStep.load(s, seeded(s, 1));
        perStep.step();
        assert.equal(perStep.iterationsDone, 3);
        const bad: Options[] = [
            { maxIter: 0 },
            { maxIter: 1.5 },
            { maxIter: "5" as unknown as number },
            { jitterTolerance: 0 },
            { scalingRatio: -1 },
            { gravity: -0.5 },
            { gravity: Number.NaN },
            { dim: 4 as unknown as 2 },
            { scale: 0 },
            { scale: Number.POSITIVE_INFINITY },
            { settleThreshold: -1 },
            { settleWindow: 0 },
            { iterationsPerStep: 0 },
            { compat: "gephi" as unknown as "paper" },
            { linlog: 1 as unknown as boolean },
            { center: ["a"] as unknown as number[] },
        ];
        for (const options of bad) {
            assert.throws(() => new ForceAtlas2Simulation(options), /ForceAtlas2Simulation/, JSON.stringify(options));
        }
    });
});
