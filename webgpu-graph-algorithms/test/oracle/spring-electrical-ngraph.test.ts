/**
 * The spring-electrical oracle checked against ngraph.forcelayout itself (spec 11.4 oracle independence, lines
 * 3508-3528; P5-T5 Step 2, PD-13 / PD-14a): ngraph run with `theta: 0` (the quadtree walks to every leaf, so the
 * force is the exact all-pairs sum) from the SAME positions, so the two f64 implementations differ only by
 * summation order and the bound is analytic (1e-9 relative, floored at 1e-12 absolute) -- no noise floor. A second
 * case pins the numbers ngraph produces on a three-node path against hand-computed forces, so a silently different
 * ngraph version is caught. ngraph is a devDependency of the TEST tree only (design 13 row P5). No device.
 */

import type { GraphSnapshot } from "@graphty/graph-format";
import createLayout from "ngraph.forcelayout";
import createGraph from "ngraph.graph";

import { seedPositions } from "../../src/layouts/seed.js";
import { KARATE_EDGES, pathEdges, snapshotOf } from "../helpers/graphs.js";
import { storyGraph } from "../helpers/story-graph.js";
import { type SeOracleOptions, SpringElectricalOracle } from "./spring-electrical.js";

/** ngraph.forcelayout 3.3.1's defaults (lib/createPhysicsSimulator.js:29,34,40,54,59), theta 0 for the exact sum. */
const NGRAPH_EXACT = {
    dimensions: 2,
    theta: 0,
    springLength: 10,
    springCoefficient: 0.8,
    gravity: -12,
    dragCoefficient: 0.9,
    timeStep: 0.5,
};

const ORACLE: SeOracleOptions = {
    precision: "f64",
    dim: 2,
    springLength: 10,
    springCoefficient: 0.8,
    gravity: -12,
    dragCoefficient: 0.9,
    timeStep: 0.5,
    settleThreshold: 0,
};

const REL = 1e-9;
const ABS = 1e-12;

/**
 * ngraph's graph of an undirected snapshot: one node per index, one link per undirected edge (u < v), so
 * `graph.getLinks(id).size` is the CSR degree and the masses agree.
 * @param s - the undirected snapshot
 * @returns the ngraph graph
 */
function ngraphOf(s: GraphSnapshot): ReturnType<typeof createGraph> {
    const graph = createGraph();
    for (let i = 0; i < s.nodeCount; i++) {
        graph.addNode(i);
    }
    for (let u = 0; u < s.nodeCount; u++) {
        for (let a = s.rowPtr[u]; a < s.rowPtr[u + 1]; a++) {
            const v = s.colIdx[a];
            if (v > u) {
                graph.addLink(u, v);
            }
        }
    }
    return graph;
}

/** Layout-unit positions seeded by the package's own LCG (distinct, so no coincident pair). */
function seededStart(s: GraphSnapshot, seed: number): Float32Array {
    const positions = new Float32Array(3 * s.nodeCount).fill(Number.NaN);
    seedPositions(s, positions, seed, 2, 1, null, "fa2");
    return positions;
}

function expectClose(actual: number, expected: number, label: string): void {
    const error = Math.abs(actual - expected);
    const bound = Math.max(ABS, REL * Math.abs(expected));
    if (!(error <= bound)) {
        throw new Error(`${label}: ${actual} vs ${expected} (error ${error} > ${bound})`);
    }
}

/**
 * Runs ngraph and the oracle for `steps` from the same start and compares every position and the kinetic energy.
 * @param s - the snapshot
 * @param seed - the LCG seed of the start
 * @param steps - iterations on both sides
 * @returns the stability flag ngraph returned on its last step
 */
function compare(s: GraphSnapshot, seed: number, steps: number): boolean {
    const start = seededStart(s, seed);
    const layout = createLayout(ngraphOf(s), NGRAPH_EXACT);
    for (let i = 0; i < s.nodeCount; i++) {
        layout.setNodePosition(i, start[3 * i], start[3 * i + 1]);
    }
    const oracle = new SpringElectricalOracle(s, start, ORACLE);
    let stable = false;
    for (let k = 0; k < steps; k++) {
        stable = layout.step();
        oracle.step();
    }
    for (let i = 0; i < s.nodeCount; i++) {
        const p = layout.getNodePosition(i);
        expectClose(oracle.positions[3 * i], p.x, `node ${i} x after ${steps} step(s)`);
        expectClose(oracle.positions[3 * i + 1], p.y, `node ${i} y after ${steps} step(s)`);
    }
    let kinetic = 0;
    layout.forEachBody((body) => {
        if (!body.isPinned) {
            kinetic += 0.5 * body.mass * (body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y);
        }
    });
    expectClose(oracle.stats.kineticEnergy, kinetic, `kinetic energy after ${steps} step(s)`);
    return stable;
}

describe("SpringElectricalOracle vs ngraph.forcelayout (theta 0, the same start; PD-14a)", () => {
    it("karate: one step agrees on every position and on the kinetic energy within 1e-9 relative; ngraph is not yet stable", () => {
        const s = snapshotOf(KARATE_EDGES, { label: "karate" });
        expect(compare(s, 7, 1)).toBe(false);
    });

    it("karate: five steps agree likewise", () => {
        const s = snapshotOf(KARATE_EDGES, { label: "karate" });
        compare(s, 7, 5);
    });

    it("the 150 / 249 story graph: one and five steps agree likewise", () => {
        const s = storyGraph();
        compare(s, 42, 1);
        compare(s, 42, 5);
    });

    it("pins ngraph's own numbers on a three-node path against hand-computed forces (a different ngraph version is caught)", () => {
        // path 0 - 1 - 2 at x = 0, 10, 20: every spring is at its rest length (10), so only Coulomb acts;
        // masses 1 + degree / 3 = 4/3, 5/3, 4/3; dt 0.5; no velocity yet, so no drag on the first step
        const s = snapshotOf(pathEdges(3), { label: "path3" });
        const m0 = 1 + 1 / 3;
        const m1 = 1 + 2 / 3;
        const f0 = (-12 * m0 * m1 * 10) / 1000 + (-12 * m0 * m0 * 20) / 8000; // toward -x: -0.32
        expect(f0).toBeCloseTo(-0.32, 12);
        const v0 = (0.5 / m0) * f0; // -0.12, below the unit clamp
        const x0 = 0 + 0.5 * v0; // -0.06
        const layout = createLayout(ngraphOf(s), NGRAPH_EXACT);
        layout.setNodePosition(0, 0, 0);
        layout.setNodePosition(1, 10, 0);
        layout.setNodePosition(2, 20, 0);
        expect(layout.getBody(1)?.mass).toBe(m1);
        expect(layout.getBody(0)?.mass).toBe(m0);
        layout.step();
        expectClose(layout.getNodePosition(0).x, x0, "ngraph x0 after one step");
        expectClose(layout.getNodePosition(1).x, 10, "ngraph x1 (balanced) after one step");
        expectClose(layout.getNodePosition(2).x, 20 - x0, "ngraph x2 after one step");
        expectClose(layout.getNodePosition(0).y, 0, "ngraph y0");
        const oracle = new SpringElectricalOracle(s, [0, 0, 0, 10, 0, 0, 20, 0, 0], ORACLE);
        const record = oracle.step();
        expectClose(oracle.positions[0], x0, "oracle x0 after one step");
        expectClose(oracle.positions[3], 10, "oracle x1 after one step");
        expectClose(oracle.positions[6], 20 - x0, "oracle x2 after one step");
        expectClose(record.kineticEnergy, 2 * 0.5 * m0 * v0 * v0, "oracle kinetic energy: two moving ends");

        // the second step exercises the drag: F0' = coulomb at the new spacing + spring (compressed by 0.06) - drag v0
        const d01 = 10 - x0; // 10.06
        const d02 = 20 - 2 * x0; // 20.12
        const coulomb0 = (-12 * m0 * m1) / (d01 * d01) + (-12 * m0 * m0) / (d02 * d02); // toward -x
        const spring0 = ((0.8 * (d01 - 10)) / d01) * d01; // k (r - L) / r * dx, dx = +d01: pushes toward +x
        const f0b = coulomb0 + spring0 - 0.9 * v0;
        const v0b = v0 + (0.5 / m0) * f0b;
        const x0b = x0 + 0.5 * v0b;
        layout.step();
        oracle.step();
        expectClose(layout.getNodePosition(0).x, x0b, "ngraph x0 after two steps (drag applied)");
        expectClose(oracle.positions[0], x0b, "oracle x0 after two steps (drag applied)");

        // a compressed pair clamps: nodes at distance 1 repel by 12 m0 m1 and the spring pushes 7.2 more, so
        // |v| > 1 and both move by exactly dt = 0.5 along +-x (generateIntegrator.js:33-41)
        const pair = snapshotOf(pathEdges(2), { label: "path2" });
        const close = createLayout(ngraphOf(pair), NGRAPH_EXACT);
        close.setNodePosition(0, 0, 0);
        close.setNodePosition(1, 1, 0);
        close.step();
        expectClose(close.getNodePosition(0).x, -0.5, "ngraph clamp: node 0");
        expectClose(close.getNodePosition(1).x, 1.5, "ngraph clamp: node 1");
        const pairOracle = new SpringElectricalOracle(pair, [0, 0, 0, 1, 0, 0], ORACLE);
        pairOracle.step();
        expectClose(pairOracle.positions[0], -0.5, "oracle clamp: node 0");
        expectClose(pairOracle.positions[3], 1.5, "oracle clamp: node 1");
        // the force that produced the clamp, hand-computed: spring k (r - L) / r * (p_1 - p_0) = 0.8 * -9 = -7.2 on
        // node 0, Coulomb -12 m0 m0 / 1 = -21.33 on node 0: |F| = 28.53 > m0 / dt, so the clamp fires
        const f0c = 0.8 * (1 - 10) + -12 * m0 * m0;
        expectClose(pairOracle.stages.force[0], f0c, "oracle force on node 0 (spring + Coulomb)");
        expectClose(pairOracle.stages.attraction[0], 0.8 * (1 - 10), "oracle spring on node 0");
        expectClose(pairOracle.stages.repulsion[0], -12 * m0 * m0, "oracle Coulomb on node 0");
    });

    it("a pinned body keeps its position and its velocity on both sides", () => {
        const s = snapshotOf(KARATE_EDGES, { label: "karate" });
        const start = seededStart(s, 3);
        const graph = ngraphOf(s);
        const layout = createLayout(graph, NGRAPH_EXACT);
        for (let i = 0; i < s.nodeCount; i++) {
            layout.setNodePosition(i, start[3 * i], start[3 * i + 1]);
        }
        const pinned = graph.getNode(5);
        if (pinned === undefined) {
            throw new Error("node 5 missing");
        }
        layout.pinNode(pinned, true);
        const mask = new Uint32Array(Math.ceil(s.nodeCount / 32));
        mask[0] = 1 << 5;
        const oracle = new SpringElectricalOracle(s, start, { ...ORACLE, fixed: mask });
        for (let k = 0; k < 3; k++) {
            layout.step();
            oracle.step();
        }
        expect(oracle.positions[15]).toBe(start[15]);
        expect(oracle.positions[16]).toBe(start[16]);
        expect(layout.getNodePosition(5).x).toBe(start[15]);
        expect(oracle.stages.velocity[15]).toBe(0);
        expect(layout.getBody(5)?.velocity.x).toBe(0);
        for (let i = 0; i < s.nodeCount; i++) {
            const p = layout.getNodePosition(i);
            expectClose(oracle.positions[3 * i], p.x, `pinned run: node ${i} x`);
            expectClose(oracle.positions[3 * i + 1], p.y, `pinned run: node ${i} y`);
        }
    });
});
