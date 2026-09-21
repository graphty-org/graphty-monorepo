import assert from "node:assert";
import { fromEdgeArrays, makeMask, maskSet } from "@graphty/graph-format";
import { describe, it } from "vitest";

import { fruchtermanReingoldLayout } from "../../src/layouts/force-directed/fruchterman-reingold";
import { FruchtermanReingoldSimulation } from "../../src/simulation/fruchterman-reingold";
import { seedPositions } from "../../src/simulation/seed";
import type { Edge, Graph, Node, PositionMap } from "../../src/types";

/** The edge arrays of a w x h grid (index i = y * w + x), the same edge order for the snapshot and the legacy Graph. */
function gridEdges(w: number, h: number): { src: number[]; dst: number[] } {
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
    return { src, dst };
}

function grid(w: number, h: number) {
    const { src, dst } = gridEdges(w, h);
    return fromEdgeArrays({
        directed: false,
        nodeCount: w * h,
        src: Uint32Array.from(src),
        dst: Uint32Array.from(dst),
    });
}

/** The legacy Graph of the same grid: nodes in index order, edges in the same order as gridEdges. */
function legacyGrid(w: number, h: number): Graph {
    const { src, dst } = gridEdges(w, h);
    const nodes: Node[] = [];
    for (let i = 0; i < w * h; i++) {
        nodes.push(i);
    }
    const edges: Edge[] = src.map((s, e) => [s, dst[e]]);
    return { nodes: () => nodes, edges: () => edges };
}

function seeded(s: ReturnType<typeof grid>, seed: number, dim: 2 | 3 = 2) {
    const positions = new Float32Array(3 * s.nodeCount).fill(Number.NaN);
    seedPositions(s, positions, seed, dim, 1, null, "fr");
    return positions;
}

/** |got - want| <= tol * max(1, |want|): a relative bound that is absolute below 1 (layout units). */
function assertCloseRel(got: number, want: number, tol: number, what: string): void {
    assert.ok(
        Math.abs(got - want) <= tol * Math.max(1, Math.abs(want)),
        `${what}: got ${got}, expected ${want} (tolerance ${tol} relative)`,
    );
}

describe("FruchtermanReingoldSimulation", () => {
    it("steps the owner's array in place and settles within iterations", () => {
        const s = grid(6, 6);
        const positions = seeded(s, 7);
        const sim = new FruchtermanReingoldSimulation({ iterations: 200 });
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
        const simA = new FruchtermanReingoldSimulation();
        const simB = new FruchtermanReingoldSimulation();
        simA.load(s, a);
        simB.load(s, b);
        for (let k = 0; k < 20; k++) {
            simA.step();
        }
        simB.step(20);
        assert.equal(simA.iterationsDone, 20);
        assert.equal(simB.iterationsDone, 20);
        assert.deepEqual(Array.from(a), Array.from(b));
    });

    it("a fixed node never moves; unpinning reheats", () => {
        const s = grid(4, 4);
        const positions = seeded(s, 3);
        const sim = new FruchtermanReingoldSimulation({ iterations: 50 });
        sim.load(s, positions);
        const mask = makeMask(s.nodeCount);
        maskSet(mask, 5, true);
        sim.setFixed(mask);
        const x = positions[15];
        const y = positions[16];
        sim.step(30);
        assert.equal(positions[15], x);
        assert.equal(positions[16], y);
        // adding a pin does not reheat (design 7.12)
        const more = Uint32Array.from(mask);
        maskSet(more, 7, true);
        while (!sim.settled) {
            sim.step();
        }
        sim.setFixed(more);
        assert.equal(sim.settled, true, "pinning does not reheat");
        maskSet(more, 5, false);
        sim.setFixed(more);
        assert.equal(sim.settled, false, "unpinning reheats (design 7.12)");
        assert.equal(sim.iterationsDone, Math.floor(0.7 * 50), "a reheat restarts at 70% of the budget (design 7.20)");
        while (!sim.settled) {
            sim.step();
        }
        assert.equal(sim.iterationsDone, 50);
    });

    it("setPosition writes the scene position immediately and reheats", () => {
        const s = grid(3, 3);
        const positions = seeded(s, 9);
        const sim = new FruchtermanReingoldSimulation({ iterations: 20 });
        sim.load(s, positions);
        while (!sim.settled) {
            sim.step();
        }
        sim.setPosition(4, 100, -100, 0);
        assert.deepEqual(Array.from(positions.subarray(12, 15)), [100, -100, 0]);
        assert.equal(sim.settled, false);
        sim.step();
        // the simulation took the drag as its own: the next iteration starts from the dragged position and moves
        // the node by at most the temperature cap 0.1 (layout units, scale 1), not from where it was before the drag
        const moved = Math.hypot(positions[12] - 100, positions[13] + 100);
        assert.ok(moved > 0 && moved <= 0.1, `node 4 moved ${moved} from the dragged position`);
        assert.equal(positions[14], 0, "2D keeps z at center.z");
        assert.throws(() => sim.setPosition(9, 0, 0, 0), /index/);
        assert.throws(() => sim.setPosition(0, Number.NaN, 0, 0), /finite/);
    });

    it("one step equals one iteration of fruchtermanReingoldLayout's loop on the same start", () => {
        const w = 4;
        const h = 3;
        const s = grid(w, h);
        const n = s.nodeCount;
        for (const k of [1, 5, 20]) {
            const positions = seeded(s, 11);
            const pos: PositionMap = {};
            for (let i = 0; i < n; i++) {
                pos[i] = [positions[3 * i], positions[3 * i + 1]];
            }
            // the legacy function rescales at the end only when `fixed` is null: one fixed node on both sides
            // disables it, and the same node is pinned in the simulation
            const expected = fruchtermanReingoldLayout(legacyGrid(w, h), null, pos, [0], k);
            const mask = makeMask(n);
            maskSet(mask, 0, true);
            const sim = new FruchtermanReingoldSimulation({ iterations: k, fixed: mask, settleThreshold: 0 });
            sim.load(s, positions);
            sim.step(k);
            assert.equal(sim.iterationsDone, k);
            assert.equal(sim.settled, true);
            for (let i = 0; i < n; i++) {
                assertCloseRel(positions[3 * i], expected[i][0], 1e-6, `k ${k} node ${i} x`);
                assertCloseRel(positions[3 * i + 1], expected[i][1], 1e-6, `k ${k} node ${i} y`);
                assert.equal(positions[3 * i + 2], 0);
            }
        }
    });

    it("the same loop on a graph with a self-loop, a parallel edge and an isolate", () => {
        // the CSR visits a self-loop once and a parallel edge twice per endpoint; the legacy loop sees the edge list
        const src = [0, 0, 1, 1, 2];
        const dst = [1, 1, 2, 1, 0];
        const n = 5;
        const s = fromEdgeArrays({
            directed: false,
            nodeCount: n,
            src: Uint32Array.from(src),
            dst: Uint32Array.from(dst),
        });
        const nodes: Node[] = [0, 1, 2, 3, 4];
        const edges: Edge[] = src.map((a, e) => [a, dst[e]]);
        const positions = seeded(s, 5);
        const pos: PositionMap = {};
        for (let i = 0; i < n; i++) {
            pos[i] = [positions[3 * i], positions[3 * i + 1]];
        }
        const expected = fruchtermanReingoldLayout({ nodes: () => nodes, edges: () => edges }, null, pos, [3], 7);
        const mask = makeMask(n);
        maskSet(mask, 3, true);
        const sim = new FruchtermanReingoldSimulation({ iterations: 7, fixed: mask, settleThreshold: 0 });
        sim.load(s, positions);
        sim.step(7);
        for (let i = 0; i < n; i++) {
            assertCloseRel(positions[3 * i], expected[i][0], 1e-6, `node ${i} x`);
            assertCloseRel(positions[3 * i + 1], expected[i][1], 1e-6, `node ${i} y`);
        }
    });

    it("honours k, scale and center: the layout runs in layout units and writes scene units back", () => {
        const s = grid(3, 2);
        const n = s.nodeCount;
        const base = seeded(s, 21);
        const scene = new Float32Array(3 * n);
        for (let i = 0; i < n; i++) {
            scene[3 * i] = base[3 * i] * 10 + 100;
            scene[3 * i + 1] = base[3 * i + 1] * 10 - 50;
            scene[3 * i + 2] = 7;
        }
        const pos: PositionMap = {};
        for (let i = 0; i < n; i++) {
            pos[i] = [base[3 * i], base[3 * i + 1]];
        }
        const legacy: Graph = legacyGrid(3, 2);
        const expected = fruchtermanReingoldLayout(legacy, 0.5, pos, [0], 6);
        const mask = makeMask(n);
        maskSet(mask, 0, true);
        const sim = new FruchtermanReingoldSimulation({
            iterations: 6,
            k: 0.5,
            fixed: mask,
            scale: 10,
            center: [100, -50, 7],
            settleThreshold: 0,
        });
        sim.load(s, scene);
        sim.step(6);
        for (let i = 0; i < n; i++) {
            assertCloseRel(scene[3 * i], expected[i][0] * 10 + 100, 1e-5, `node ${i} x`);
            assertCloseRel(scene[3 * i + 1], expected[i][1] * 10 - 50, 1e-5, `node ${i} y`);
            assert.equal(scene[3 * i + 2], 7, "2D keeps z at center.z");
        }
        // k of 0 or NaN is the auto default 1 / sqrt(n), the legacy loop's `if (!k)`: the same run as k omitted
        const auto = seeded(s, 21);
        const plain = new FruchtermanReingoldSimulation({ iterations: 6, settleThreshold: 0 });
        plain.load(s, auto);
        plain.step(6);
        for (const k of [0, Number.NaN]) {
            const positions = seeded(s, 21);
            const sim = new FruchtermanReingoldSimulation({ iterations: 6, k, settleThreshold: 0 });
            sim.load(s, positions);
            sim.step(6);
            assert.deepEqual(Array.from(positions), Array.from(auto), `k ${k} is the auto default`);
        }
    });

    it("3D moves z; 2D never writes z away from center.z", () => {
        const s = grid(4, 3);
        const p3 = seeded(s, 5, 3);
        const sim3 = new FruchtermanReingoldSimulation({ dim: 3 });
        sim3.load(s, p3);
        sim3.step(5);
        assert.ok(Array.from(p3).some((_, i) => i % 3 === 2 && p3[i] !== 0));
        const p2 = seeded(s, 5, 2);
        const sim2 = new FruchtermanReingoldSimulation({ dim: 2, center: [0, 0, 7] });
        sim2.load(s, p2);
        sim2.step(5);
        for (let i = 0; i < s.nodeCount; i++) {
            assert.equal(p2[3 * i + 2], 7);
        }
    });

    it("seeds the NaN rows of the owner's array at load() in [0, 1) (design 7.20) and keeps the finite ones", () => {
        const s = grid(3, 3);
        const positions = new Float32Array(3 * s.nodeCount).fill(Number.NaN);
        positions[0] = 0.25;
        positions[1] = 0.75;
        positions[2] = 0;
        const sim = new FruchtermanReingoldSimulation({ seed: 4 });
        sim.load(s, positions);
        const reference = new Float32Array(3 * s.nodeCount).fill(Number.NaN);
        reference[0] = 0.25;
        reference[1] = 0.75;
        reference[2] = 0;
        seedPositions(s, reference, 4, 2, 1, null, "fr");
        assert.deepEqual(Array.from(positions), Array.from(reference));
        for (const v of positions) {
            assert.ok(v >= 0 && v < 1);
        }
    });

    it("takes the fixed option from a bool column by name or from the role-fixed column, and iterationsPerStep", () => {
        const { src, dst } = gridEdges(3, 3);
        const n = 9;
        const fixed = makeMask(n);
        maskSet(fixed, 2, true);
        const s = fromEdgeArrays({
            directed: false,
            nodeCount: n,
            src: Uint32Array.from(src),
            dst: Uint32Array.from(dst),
            nodeColumns: {
                pinned: { data: fixed, decl: { dtype: "bool", role: "fixed" } },
                score: new Float32Array(n),
            },
        });
        for (const spec of ["pinned", null, undefined] as const) {
            const positions = seeded(s, 8);
            const sim = new FruchtermanReingoldSimulation({ fixed: spec, iterationsPerStep: 4 });
            sim.load(s, positions);
            const x = positions[6];
            const y = positions[7];
            sim.step();
            assert.equal(sim.iterationsDone, 4, "iterationsPerStep is the default batch");
            assert.equal(positions[6], x, `fixed ${String(spec)}`);
            assert.equal(positions[7], y, `fixed ${String(spec)}`);
            assert.notEqual(positions[0], seeded(s, 8)[0], "a free node moved");
        }
        assert.throws(() => new FruchtermanReingoldSimulation({ fixed: "absent" }).load(s, seeded(s, 8)), /absent/);
        assert.throws(() => new FruchtermanReingoldSimulation({ fixed: "score" }).load(s, seeded(s, 8)), /bool/);
        // no role-fixed column and no option: nothing is fixed
        const plain = grid(3, 3);
        const positions = seeded(plain, 8);
        const sim = new FruchtermanReingoldSimulation({ fixed: null });
        sim.load(plain, positions);
        const x = positions[6];
        sim.step();
        assert.notEqual(positions[6], x);
    });

    it("settles by the movement window when the threshold is loose, and by the budget when it is 0", () => {
        const s = grid(4, 4);
        const loose = new FruchtermanReingoldSimulation({ iterations: 1000, settleThreshold: 1e9, settleWindow: 3 });
        loose.load(s, seeded(s, 2));
        loose.step(100);
        assert.equal(loose.settled, true);
        assert.equal(loose.iterationsDone, 3, "a batch stops at the window");
        const strict = new FruchtermanReingoldSimulation({ iterations: 12, settleThreshold: 0 });
        strict.load(s, seeded(s, 2));
        strict.step(100);
        assert.equal(strict.settled, true);
        assert.equal(strict.iterationsDone, 12, "a batch stops at the budget");
        // an all-fixed layout settles by the window (design 7.17: meanDisplacement is 0, never NaN)
        const allFixed = new FruchtermanReingoldSimulation({ iterations: 1000, settleWindow: 2 });
        const positions = seeded(s, 2);
        allFixed.load(s, positions);
        allFixed.setFixed(makeMask(s.nodeCount, true));
        const before = Array.from(positions);
        allFixed.step(50);
        assert.equal(allFixed.settled, true);
        assert.equal(allFixed.iterationsDone, 2);
        assert.deepEqual(Array.from(positions), before);
        // a settled simulation ignores step(); reheat() gives it its 70% budget back
        allFixed.step();
        assert.equal(allFixed.iterationsDone, 2);
        allFixed.reheat();
        assert.equal(allFixed.settled, false);
        assert.equal(allFixed.iterationsDone, 700);
    });

    it("handles an empty and a single-node graph", () => {
        const empty = fromEdgeArrays({
            directed: false,
            nodeCount: 0,
            src: new Uint32Array(0),
            dst: new Uint32Array(0),
        });
        const sim = new FruchtermanReingoldSimulation();
        sim.load(empty, new Float32Array(0));
        assert.equal(sim.settled, true);
        sim.step();
        assert.equal(sim.iterationsDone, 0);
        const single = fromEdgeArrays({
            directed: false,
            nodeCount: 1,
            src: new Uint32Array(0),
            dst: new Uint32Array(0),
        });
        const positions = new Float32Array([3, 4, 0]);
        const one = new FruchtermanReingoldSimulation({ iterations: 5 });
        one.load(single, positions);
        assert.equal(one.settled, false);
        one.step(5);
        assert.deepEqual(Array.from(positions), [3, 4, 0]);
        assert.equal(one.settled, true);
    });

    it("a reload with another node count clears the pins; the same node count keeps them", () => {
        const a = grid(3, 3);
        const sim = new FruchtermanReingoldSimulation({ iterations: 30 });
        const pa = seeded(a, 1);
        sim.load(a, pa);
        const mask = makeMask(a.nodeCount);
        maskSet(mask, 4, true);
        sim.setFixed(mask);
        const pb = seeded(a, 2);
        sim.load(a, pb);
        const x = pb[12];
        sim.step(5);
        assert.equal(pb[12], x, "a same-size reload keeps the pins");
        const c = grid(2, 2);
        const pc = seeded(c, 3);
        sim.load(c, pc);
        const y = pc[0];
        sim.step(5);
        assert.notEqual(pc[0], y, "a reload of another size clears the pins");
        assert.throws(() => sim.setFixed(new Uint32Array(0)), /mask/);
    });

    it("rejects bad options, a directed snapshot and a wrong array length; dispose() ends stepping", () => {
        assert.throws(() => new FruchtermanReingoldSimulation({ dim: 4 as 2 }), /dim/);
        assert.throws(() => new FruchtermanReingoldSimulation({ scale: 0 }), /scale/);
        assert.throws(() => new FruchtermanReingoldSimulation({ center: [Number.NaN] }), /center\[0\]/);
        assert.throws(() => new FruchtermanReingoldSimulation({ k: -1 }), /k/);
        assert.throws(() => new FruchtermanReingoldSimulation({ k: Number.POSITIVE_INFINITY }), /k/);
        assert.throws(() => new FruchtermanReingoldSimulation({ iterations: -1 }), /iterations/);
        assert.throws(() => new FruchtermanReingoldSimulation({ iterations: 1.5 }), /iterations/);
        assert.throws(() => new FruchtermanReingoldSimulation({ settleThreshold: -1 }), /settleThreshold/);
        assert.throws(() => new FruchtermanReingoldSimulation({ settleWindow: 0 }), /settleWindow/);
        assert.throws(() => new FruchtermanReingoldSimulation({ iterationsPerStep: 0 }), /iterationsPerStep/);
        const s = grid(2, 2);
        const sim = new FruchtermanReingoldSimulation();
        assert.throws(() => sim.step(), /not loaded/);
        assert.throws(() => sim.setFixed(makeMask(4)), /not loaded/);
        assert.throws(() => sim.setPosition(0, 0, 0, 0), /not loaded/);
        const directed = fromEdgeArrays({
            directed: true,
            nodeCount: 2,
            src: Uint32Array.from([0]),
            dst: Uint32Array.from([1]),
        });
        assert.throws(() => sim.load(directed, new Float32Array(6)), /undirected/);
        assert.throws(() => sim.load(s, new Float32Array(5)), /positions/);
        sim.load(s, seeded(s, 1));
        assert.throws(() => sim.step(0), /step/);
        assert.throws(() => sim.step(2.5), /step/);
        sim.dispose();
        assert.throws(() => sim.step(), /disposed/);
        assert.throws(() => sim.load(s, seeded(s, 1)), /disposed/);
        sim.dispose();
    });
});
