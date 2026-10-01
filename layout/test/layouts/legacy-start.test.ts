import { fromEdgeArrays, type GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { arf, kamadaKawai, type LayoutResult } from "../../src";

/*
 * ARF and the 3D Kamada-Kawai start from seeded random positions, and both carry a change of 3e-8 in that start
 * to a visibly different drawing (ARF is chaotic at 1000 iterations; Kamada-Kawai settles in another local
 * minimum). A float32 start did exactly that to the layout stories. The expected rows are layout 1.x's
 * `arfLayout` and `kamadaKawaiLayout` on the stories' default graph (random, 10 nodes, seed 42); the snapshot
 * layouts must reproduce them to their float32 output.
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

const ARF_1X = [
    [0.6464063457, 0.4541222688],
    [0.6360273771, 0.4689170904],
    [0.6611746093, 0.4437165508],
    [0.651034054, 0.4366326334],
    [0.6591867236, 0.4668832677],
    [0.62998736, 0.4464895383],
    [0.6289089196, 0.4587998294],
    [0.6387133889, 0.4377208765],
    [0.6479665893, 0.4721439211],
    [0.6644182183, 0.4556604238],
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
    it("arf draws the story graph as arfLayout did", () => {
        assertRows(arf(storyGraph(), { scaling: 1, a: 1.1, maxIter: 1000, seed: 42 }), ARF_1X);
    });

    it("kamadaKawai in 3D draws the story graph as kamadaKawaiLayout did", () => {
        assertRows(kamadaKawai(storyGraph(), { scale: 1, center: [0, 0, 0], dim: 3 }), KAMADA_KAWAI_3D_1X);
    });
});
