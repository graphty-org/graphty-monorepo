import assert from "node:assert";

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, it } from "vitest";

import { resolveNodeVector, resolveWeights } from "../../src/simulation/inputs";

function triangle(weighted: boolean, directed = false): GraphSnapshot {
    const b = new GraphBuilder({ directed, weighted: weighted ? true : "auto" });
    b.addNode("a");
    b.addNode("b");
    b.addNode("c");
    b.addEdge("a", "b", weighted ? 2 : undefined);
    b.addEdge("b", "c", weighted ? 3 : undefined);
    b.addEdge("c", "a", weighted ? 4 : undefined);
    return b.freeze();
}

/** Every arc of `s` carries the value of its logical edge in `perEdge`. */
function assertExpanded(w: Float32Array | null, s: GraphSnapshot, perEdge: readonly number[]): void {
    assert.ok(w instanceof Float32Array);
    assert.equal(w.length, s.arcCount);
    for (let a = 0; a < s.arcCount; a++) {
        assert.equal(w[a], perEdge[s.arcToEdge[a]]);
    }
}

describe("resolveNodeVector", () => {
    it("null: the fallback per index (outDegree + 1 for ForceAtlas2)", () => {
        const s = triangle(false);
        const deg = s.outDegree();
        const v = resolveNodeVector(null, s, (i) => deg[i] + 1);
        assert.deepEqual(Array.from(v), [3, 3, 3]);
    });
    it("null: the role-mass node column when present (u8 through column.data, not the packed gpuView)", () => {
        const s = triangle(false);
        s.nodes.set("m", new Uint8Array([5, 6, 7]), { role: "mass" });
        const v = resolveNodeVector(null, s, () => 1);
        assert.ok(v instanceof Float32Array);
        assert.deepEqual(Array.from(v), [5, 6, 7]);
        // undefined takes the same path as null
        assert.deepEqual(Array.from(resolveNodeVector(undefined, s, () => 1)), [5, 6, 7]);
    });
    it("a Float32Array of length n is returned as given; a wrong length throws", () => {
        const s = triangle(false);
        const given = new Float32Array([1, 2, 3]);
        assert.equal(
            resolveNodeVector(given, s, () => 1),
            given,
        );
        assert.throws(() => resolveNodeVector(new Float32Array(2), s, () => 1), /2 values, expected 3/);
    });
    it("the legacy id-keyed record resolves through the id map; missing ids take the fallback", () => {
        const s = triangle(false);
        const v = resolveNodeVector({ b: 7 }, s, (i) => i + 10);
        assert.deepEqual(Array.from(v), [10, 7, 12]);
    });
    it("a column name resolves an existing node column of each numeric dtype", () => {
        const s = triangle(false);
        const f32 = new Float32Array([1.5, 2.5, 3.5]);
        s.nodes.set("f32", f32);
        s.nodes.set("f64", new Float64Array([1.5, 2.5, 3.5]));
        s.nodes.set("u32", new Uint32Array([7, 8, 9]));
        s.nodes.set("i32", new Int32Array([-1, 0, 1]));
        s.nodes.set("u8", new Uint8Array([2, 4, 6]));
        const expected: Record<string, number[]> = {
            f32: [1.5, 2.5, 3.5],
            f64: [1.5, 2.5, 3.5],
            u32: [7, 8, 9],
            i32: [-1, 0, 1],
            u8: [2, 4, 6],
        };
        for (const [name, values] of Object.entries(expected)) {
            const v = resolveNodeVector(name, s, () => 1);
            assert.ok(v instanceof Float32Array, `${name} resolves to a Float32Array`);
            assert.deepEqual(Array.from(v), values, name);
        }
        // the f32 column's own array is returned, not a copy
        assert.equal(
            resolveNodeVector("f32", s, () => 1),
            f32,
        );
    });
    it("an unknown column name throws", () => {
        assert.throws(() => resolveNodeVector("mass", triangle(false), () => 1), /node column "mass"/);
    });
    it("a bool, dict or string node column is rejected as non-numeric, naming the column and its dtype", () => {
        const s = triangle(false);
        s.nodes.set("flag", [true, false, true]);
        assert.throws(() => resolveNodeVector("flag", s, () => 1), {
            name: "TypeError",
            message: /node column "flag" is bool/,
        });
        s.nodes.set("kind", ["x", "y", "x"], { dtype: "dict" });
        assert.throws(() => resolveNodeVector("kind", s, () => 1), {
            name: "TypeError",
            message: /node column "kind" is dict/,
        });
        s.nodes.set("label", ["a", "b", "c"]);
        assert.throws(() => resolveNodeVector("label", s, () => 1), {
            name: "TypeError",
            message: /node column "label" is string/,
        });
    });
    it("a multi-component node column is rejected", () => {
        const s = triangle(false);
        s.nodes.set("pos", new Float32Array(9), { components: 3 });
        assert.throws(() => resolveNodeVector("pos", s, () => 1), {
            name: "RangeError",
            message: /node column "pos" has 3 components/,
        });
        // the role path applies the same check
        s.nodes.set("m3", new Float32Array(9), { components: 3, role: "mass" });
        assert.throws(() => resolveNodeVector(null, s, () => 1), /node column "m3" has 3 components/);
    });
});

describe("resolveWeights", () => {
    it("true returns the snapshot's arc weights, or null when unweighted", () => {
        assert.equal(resolveWeights(true, triangle(false)), null);
        const w = resolveWeights(true, triangle(true));
        assert.ok(w instanceof Float32Array && w.length === 6);
    });
    it("false, null and undefined mean unweighted", () => {
        const s = triangle(true);
        assert.equal(resolveWeights(false, s), null);
        assert.equal(resolveWeights(null, s), null);
        assert.equal(resolveWeights(undefined, s), null);
    });
    it("an existing f32 edge column expands to arcs: both arcs of an undirected edge carry its value", () => {
        const s = triangle(false);
        assert.equal(s.arcCount, 6);
        s.edges.set("w", new Float32Array([10, 20, 30]));
        const w = resolveWeights("w", s);
        assertExpanded(w, s, [10, 20, 30]);
        // rows sorted by target: a: [ab, ca], b: [ab, bc], c: [ca, bc]
        assert.deepEqual(Array.from(w ?? []), [10, 30, 10, 20, 30, 20]);
    });
    it("an existing f32 edge column on a directed graph expands to one arc per edge in CSR order", () => {
        const s = triangle(false, true);
        assert.equal(s.arcCount, 3);
        s.edges.set("w", new Float32Array([10, 20, 30]));
        const w = resolveWeights("w", s);
        assertExpanded(w, s, [10, 20, 30]);
        assert.deepEqual(Array.from(w ?? []), [10, 20, 30]);
    });
    it("f64, u32 and i32 edge columns arrive as f32 values", () => {
        for (const directed of [false, true]) {
            const s = triangle(false, directed);
            s.edges.set("w64", new Float64Array([1.5, 2.5, 3.5]));
            assertExpanded(resolveWeights("w64", s), s, [1.5, 2.5, 3.5]);
            s.edges.set("wu32", new Uint32Array([1, 2, 3]));
            assertExpanded(resolveWeights("wu32", s), s, [1, 2, 3]);
            s.edges.set("wi32", new Int32Array([-1, 0, 1]));
            assertExpanded(resolveWeights("wi32", s), s, [-1, 0, 1]);
        }
    });
    it("a missing edge column name throws", () => {
        assert.throws(() => resolveWeights("capacity", triangle(true)), /edge column "capacity"/);
    });
    it("a multi-component edge column is rejected", () => {
        const s = triangle(false);
        s.edges.set("v3", new Float32Array(9), { components: 3 });
        assert.throws(() => resolveWeights("v3", s), {
            name: "RangeError",
            message: /edge column "v3" has 3 components/,
        });
    });
    it("a dict, u8, bool or string edge column is rejected, naming the column and its dtype", () => {
        const s = triangle(false);
        // dict: gpuView would be the dictionary codes, never a weight
        s.edges.set("kind", ["x", "y", "x"], { dtype: "dict" });
        assert.throws(() => resolveWeights("kind", s), { name: "TypeError", message: /edge column "kind" is dict/ });
        // u8 and bool: gpuView would be packed words, not per-edge values
        s.edges.set("small", new Uint8Array([1, 2, 3]));
        assert.throws(() => resolveWeights("small", s), { name: "TypeError", message: /edge column "small" is u8/ });
        s.edges.set("flag", [true, false, true]);
        assert.throws(() => resolveWeights("flag", s), { name: "TypeError", message: /edge column "flag" is bool/ });
        // string: rejected here, before gpuView's E_GPU_INELIGIBLE
        s.edges.set("name", ["a", "b", "c"]);
        assert.throws(() => resolveWeights("name", s), { name: "TypeError", message: /edge column "name" is string/ });
    });
});
