import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { arf, kamadaKawai, type LayoutResult } from "../../src";

/*
 * ARF and the 3D Kamada-Kawai start from seeded random positions, and both carry a change of 3e-8 in that start
 * to a visibly different drawing (ARF is chaotic at 1000 iterations; Kamada-Kawai settles in another local
 * minimum). A float32 start did exactly that to the layout stories. The expected rows are, for ARF, NetworkX's
 * `arf_layout` iteration run in NumPy (float64) from the same seeded start (layout 1.x's `arfLayout` had the spring
 * and the repulsion swapped, which pulled every node into one spot), and for Kamada-Kawai layout 1.x's
 * `kamadaKawaiLayout`, on the stories' default graph (random, 10 nodes, seed 42); the snapshot layouts must reproduce
 * them to their float32 output.
 */

/** The layout stories' default graph: generateGraph("random", 10, 42). */
const EDGES: [number, number][] = [
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 7],
    [1, 5],
    [1, 8],
    [1, 9],
    [2, 6],
    [2, 7],
    [3, 6],
    [3, 9],
    [4, 5],
    [4, 9],
    [5, 7],
    [5, 8],
    [6, 7],
    [0, 1],
    [1, 2],
    [1, 3],
    [2, 4],
    [3, 7],
    [0, 8],
    [2, 9],
];

const ARF_STORY = [
    [-1.242352848, -0.5199519723],
    [2.392504193, 0.599397014],
    [1.26602283, -1.379788714],
    [0.4448073395, 2.567777745],
    [-1.244880714, 1.650431679],
    [0.840870997, 1.155508554],
    [2.230213354, 2.072512913],
    [2.383897285, -0.611964005],
    [-0.04223848936, -1.47464221],
    [-0.5650203488, 0.4818053876],
];

const KAMADA_KAWAI_3D_1X = [
    [-0.1329174564, 0.2318216631, -0.2142211709],
    [-0.4914959907, -0.1755632317, -0.02506527479],
    [0.3609680286, -0.1915251505, 0.2222262589],
    [0.1217609617, -0.4180172431, -0.4627446043],
    [-0.05263507715, 0.07159945212, 0.7022449825],
    [-0.2138945094, 0.649130103, 0.2225614149],
    [0.8952193171, -0.3022180271, -0.3274853255],
    [0.5007702679, 0.3329087403, -0.2908790176],
    [-0.8552401752, 0.4879284269, -0.1634396665],
    [-0.1325353665, -0.6860647329, 0.3368024033],
];

function storyGraph(): GraphSnapshot {
    return fromEdgeArrays({
        directed: false,
        nodeCount: 10,
        src: Uint32Array.from(EDGES, ([u]) => u),
        dst: Uint32Array.from(EDGES, ([, v]) => v),
    });
}

function assertRows(actual: LayoutResult, expected: number[][]): void {
    assert.equal(actual.n, expected.length);
    expected.forEach((row, i) => {
        row.forEach((v, k) => {
            assert.closeTo(actual.positions[actual.dim * i + k], v, 1e-6, `node ${i} component ${k}`);
        });
    });
}

describe("layout 1.x drawings of the seeded layouts", () => {
    it("arf draws the story graph as NetworkX's arf_layout does", () => {
        assertRows(arf(storyGraph(), { scaling: 1, a: 1.1, maxIter: 1000, seed: 42 }), ARF_STORY);
    });

    it("kamadaKawai in 3D draws the story graph as kamadaKawaiLayout did", () => {
        assertRows(kamadaKawai(storyGraph(), { scale: 1, center: [0, 0, 0], dim: 3 }), KAMADA_KAWAI_3D_1X);
    });
});
