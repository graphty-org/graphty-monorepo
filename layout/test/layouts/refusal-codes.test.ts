/**
 * @file Every refusal of a layout about the data or the options it was given carries a `code` and `params`, so a
 * caller switches on the code instead of reading the message.
 */
import assert from "node:assert";

import { fromEdgeArrays, GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, it } from "vitest";

import * as layout from "../../src";

/** A path 0 - 1 - 2 - 3 with a bool, a u32 and an f32 node column. */
const s: GraphSnapshot = fromEdgeArrays({
    directed: false,
    nodeCount: 4,
    src: Uint32Array.of(0, 1, 2),
    dst: Uint32Array.of(1, 2, 3),
    nodeColumns: {
        top: { data: Uint32Array.of(0b0101), decl: { dtype: "bool" } },
        level: { data: [0, 0, 1, 1], decl: { dtype: "u32" } },
        weight: Float32Array.of(1, 2, 3, 4),
    },
});

/**
 * Two nodes joined by an edge of weight -1.
 * @returns the snapshot
 */
function negative(): GraphSnapshot {
    const b = new GraphBuilder({ directed: false, weighted: true });
    b.addNodes([0, 1]);
    b.addEdge(0, 1, -1);
    return b.freeze();
}

/**
 * What a call threw, as an Error with its code and params.
 * @param call - the call
 * @returns the error
 */
function refusalOf(call: () => unknown): Error & { code?: unknown; params?: unknown } {
    let caught: unknown = null;
    try {
        call();
    } catch (thrown) {
        caught = thrown;
    }
    assert.ok(caught instanceof Error, "the call threw an Error");
    return caught;
}

const cases: readonly (readonly [string, () => unknown, string, Record<string, unknown>])[] = [
    [
        "multipartite with no subset column",
        () => layout.multipartite(s),
        "E_UNKNOWN_COLUMN",
        { option: "subsets", column: "subset" },
    ],
    [
        "multipartite over a column that is not u32 or dict",
        () => layout.multipartite(s, { subsets: "weight" }),
        "E_COLUMN_TYPE",
        { option: "subsets", column: "weight", dtype: "f32", expected: ["u32", "dict"] },
    ],
    [
        "multipartite with a layer index that is not a node",
        () => layout.multipartite(s, { subsets: [[0, 9]] }),
        "E_BAD_NODE",
        { option: "subsets", index: 9 },
    ],
    [
        "multipartite with an unknown align",
        () => layout.multipartite(s, { subsets: "level", align: "diagonal" as "vertical" }),
        "E_BAD_OPTION",
        { option: "align", value: "diagonal" },
    ],
    [
        "bipartite with a top column that is not bool",
        () => layout.bipartite(s, { top: "weight" }),
        "E_COLUMN_TYPE",
        { option: "top", column: "weight", dtype: "f32", expected: ["bool"] },
    ],
    [
        "bipartite with a top column the snapshot does not hold",
        () => layout.bipartite(s, { top: "side" }),
        "E_UNKNOWN_COLUMN",
        { option: "top", column: "side" },
    ],
    [
        "bipartite with a mask too short for the graph",
        () =>
            layout.bipartite(
                fromEdgeArrays({ directed: false, nodeCount: 40, src: new Uint32Array(0), dst: new Uint32Array(0) }),
                { top: Uint32Array.of(1) },
            ),
        "E_BAD_OPTION",
        { option: "top", length: 1, expected: 2 },
    ],
    [
        "bfs from a start that is not a node",
        () => layout.bfs(s, { start: 4 }),
        "E_BAD_NODE",
        { option: "start", index: 4 },
    ],
    [
        "radial around a root that is not a node",
        () => layout.radial(s, { root: 7 }),
        "E_BAD_NODE",
        { option: "root", index: 7 },
    ],
    [
        "radial with an unknown arrangement",
        () => layout.radial(s, { arrangement: "spokes" as "rings" }),
        "E_BAD_OPTION",
        { option: "arrangement", value: "spokes" },
    ],
    [
        "radial turning the rings of a sectors arrangement",
        () => layout.radial(s, { arrangement: "sectors", rotate: 1 }),
        "E_BAD_OPTION",
        { option: "rotate", value: 1 },
    ],
    [
        "shell with an index that is not a node",
        () => layout.shell(s, { nlist: [[0], [1, 5]] }),
        "E_BAD_NODE",
        { option: "nlist", index: 5 },
    ],
    [
        "shell over a column the snapshot does not hold",
        () => layout.shell(s, { nlist: "ring" }),
        "E_UNKNOWN_COLUMN",
        { option: "nlist", column: "ring" },
    ],
    [
        "shell turned by a rotate that is not finite",
        () => layout.shell(s, { nlist: [[0], [1, 2, 3]], rotate: Number.NaN }),
        "E_BAD_OPTION",
        { option: "rotate", value: Number.NaN },
    ],
    [
        "grid with a columns that is not a positive integer",
        () => layout.grid(s, { columns: 0 }),
        "E_BAD_OPTION",
        { option: "columns", value: 0 },
    ],
    [
        "a dim that is not 2 or 3",
        () => layout.circular(s, { dim: 4 as 2 }),
        "E_BAD_OPTION",
        { option: "dim", value: 4 },
    ],
    ["arf with an a of at most 1", () => layout.arf(s, { a: 1 }), "E_BAD_OPTION", { option: "a", value: 1 }],
    [
        "arf with a pos of the wrong length",
        () => layout.arf(s, { pos: new Float32Array(3) }),
        "E_BAD_OPTION",
        { option: "pos", length: 3, expected: 8 },
    ],
    [
        "kamadaKawai with a dist of the wrong length",
        () => layout.kamadaKawai(s, { dist: new Float64Array(3) }),
        "E_BAD_OPTION",
        { option: "dist", length: 3, expected: 16 },
    ],
    ["kamadaKawai with a negative weight", () => layout.kamadaKawai(negative()), "E_BAD_WEIGHT", { weight: -1 }],
    [
        "random with a negative seed",
        () => layout.random(s, { seed: -1 }),
        "E_BAD_OPTION",
        { option: "seed", value: -1 },
    ],
    [
        "spectral with a fractional seed",
        () => layout.spectral(s, { seed: 1.5 }),
        "E_BAD_OPTION",
        { option: "seed", value: 1.5 },
    ],
    [
        "forceAtlas2 with a NaN seed",
        () => layout.forceAtlas2(s, { seed: Number.NaN }),
        "E_BAD_OPTION",
        { option: "seed", value: Number.NaN },
    ],
    [
        "circular with a NaN scale",
        () => layout.circular(s, { scale: Number.NaN }),
        "E_BAD_OPTION",
        { option: "scale", value: Number.NaN },
    ],
    ["random with a scale of 0", () => layout.random(s, { scale: 0 }), "E_BAD_OPTION", { option: "scale", value: 0 }],
    [
        "circular with a NaN center",
        () => layout.circular(s, { center: [0, Number.NaN] }),
        "E_BAD_OPTION",
        { option: "center", value: Number.NaN },
    ],
    [
        "forceAtlas2 with a NaN scale",
        () => layout.forceAtlas2(s, { scale: Number.NaN }),
        "E_BAD_OPTION",
        { option: "scale", value: Number.NaN },
    ],
    [
        "fruchtermanReingold with an infinite center",
        () => layout.fruchtermanReingold(s, { center: [Infinity, 0] }),
        "E_BAD_OPTION",
        { option: "center", value: Infinity },
    ],
    [
        "kamadaKawai with a negative scale",
        () => layout.kamadaKawai(s, { scale: -1 }),
        "E_BAD_OPTION",
        { option: "scale", value: -1 },
    ],
    [
        "arf with a NaN scale",
        () => layout.arf(s, { scale: Number.NaN }),
        "E_BAD_OPTION",
        { option: "scale", value: Number.NaN },
    ],
    [
        "forceAtlas2 with a negative gravity",
        () => layout.forceAtlas2(s, { gravity: -1 }),
        "E_BAD_OPTION",
        { option: "gravity", value: -1 },
    ],
    [
        "forceAtlas2 with an unknown weight column",
        () => layout.forceAtlas2(s, { weight: "missing" }),
        "E_UNKNOWN_COLUMN",
        { option: "weight", column: "missing" },
    ],
    [
        "forceAtlas2 with an unknown nodeMass column",
        () => layout.forceAtlas2(s, { nodeMass: "missing" }),
        "E_UNKNOWN_COLUMN",
        { option: "nodeMass", column: "missing" },
    ],
    [
        "forceAtlas2 with a bool nodeMass column",
        () => layout.forceAtlas2(s, { nodeMass: "top" }),
        "E_COLUMN_TYPE",
        { option: "nodeMass", column: "top", dtype: "bool", expected: "f32, f64, u32, i32 or u8" },
    ],
    [
        "forceAtlas2 with a zero nodeMass",
        () => layout.forceAtlas2(s, { nodeMass: new Float32Array(4) }),
        "E_BAD_OPTION",
        { option: "nodeMass", index: 0, value: 0 },
    ],
    [
        "forceAtlas2 with a nodeMass of the wrong length",
        () => layout.forceAtlas2(s, { nodeMass: new Float32Array(3) }),
        "E_BAD_OPTION",
        { option: "nodeMass", length: 3, expected: 4 },
    ],
    [
        "fruchtermanReingold with a negative k",
        () => layout.fruchtermanReingold(s, { k: -1 }),
        "E_BAD_OPTION",
        { option: "k", value: -1 },
    ],
    [
        "fruchtermanReingold with an unknown fixed column",
        () => layout.fruchtermanReingold(s, { fixed: "missing" }),
        "E_UNKNOWN_COLUMN",
        { option: "fixed", column: "missing" },
    ],
    [
        "fruchtermanReingold with a fixed column that is not bool",
        () => layout.fruchtermanReingold(s, { fixed: "level" }),
        "E_COLUMN_TYPE",
        { option: "fixed", column: "level", dtype: "u32", expected: "bool" },
    ],
];

describe("a layout's refusal carries a code and params", () => {
    for (const [name, call, code, params] of cases) {
        it(name, () => {
            const error = refusalOf(call);
            assert.equal(error.code, code);
            assert.deepEqual(error.params, params);
        });
    }
});
