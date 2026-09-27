/**
 * @file The input accessor's derivation chain (design/sets/sets-design.md section 10.1): scope
 * first, in declared space, then undirected and simplified as asked; the whole-graph shortcut; and
 * one CSR pass per derivation, counted rather than timed.
 */

import { assert, beforeEach, describe, it } from "vitest";

import { DerivedInputs } from "../../../src/algorithms/input/derivedInputs";
import {
    createScopedInput,
    type ResolvedInputScope,
    type RunInput,
    scopedInputCounters,
} from "../../../src/algorithms/input/ScopedInput";
import { edgesOf, idsOf, InputGraph } from "./harness";

/**
 * A run over a scope, with its own cache.
 * @param scope - The scope.
 * @param inputs - The cache; a fresh one by default.
 * @returns The run input.
 */
function runOver(scope: ResolvedInputScope | null, inputs = new DerivedInputs()): RunInput {
    return { inputs, holder: {}, scope: () => scope };
}

/** a -> b -> c -> d -> e, plus a -> c and an isolated f. */
function chain(): InputGraph {
    return new InputGraph(
        ["a", "b", "c", "d", "e", "f"],
        [
            ["a", "b", 1],
            ["b", "c", 2],
            ["c", "d", 3],
            ["d", "e", 4],
            ["a", "c", 5],
        ],
    );
}

beforeEach(() => {
    scopedInputCounters.derivations = 0;
});

describe("the derivation chain", () => {
    it("induces on the node bitmap and stops there when the scope's edges are the induced ones", () => {
        const graph = chain();
        const input = createScopedInput(
            graph.getDataManager(),
            "declared",
            undefined,
            runOver(graph.scope(["a", "b", "c"])),
        );

        assert.isFalse(input.whole);
        assert.deepStrictEqual(idsOf(input.subgraph()), ["a", "b", "c"]);
        assert.deepStrictEqual(edgesOf(input.subgraph()).sort(), ["a>b:1", "a>c:5", "b>c:2"]);
        assert.strictEqual(scopedInputCounters.derivations, 1, "one pass: the induce");
    });

    it("filters to the scope's edges only when they are fewer than the induced ones", () => {
        const graph = chain();
        const scope = graph.scope(["a", "b", "c"], (source, target) => !(source === "a" && target === "c"));
        const input = createScopedInput(graph.getDataManager(), "declared", undefined, runOver(scope));

        assert.deepStrictEqual(edgesOf(input.subgraph()).sort(), ["a>b:1", "b>c:2"]);
        assert.strictEqual(scopedInputCounters.derivations, 2, "the induce, then the edge filter");
        assert.strictEqual(input.edgeCount, 2);
    });

    it("undirects after the scope, when asked", () => {
        const graph = chain();
        const input = createScopedInput(
            graph.getDataManager(),
            "undirected",
            undefined,
            runOver(graph.scope(["b", "c", "d"])),
        );

        assert.isFalse(input.subgraph().directed);
        assert.deepStrictEqual(idsOf(input.subgraph()), ["b", "c", "d"]);
        assert.strictEqual(scopedInputCounters.derivations, 2, "the induce, then the undirect");
    });

    it("simplifies by the asked policy, and not at all under none", () => {
        const graph = new InputGraph(
            ["a", "b", "c"],
            [
                ["a", "b", 1],
                ["a", "b", 4],
                ["b", "c", 2],
            ],
        );
        const inputs = new DerivedInputs();
        const scope = graph.scope(["a", "b"]);
        const read = (simplify: "sum" | "min" | "max" | "none"): string[] =>
            edgesOf(
                createScopedInput(graph.getDataManager(), "declared", { simplify }, runOver(scope, inputs)).subgraph(),
            ).sort();

        assert.deepStrictEqual(read("sum"), ["a>b:5"]);
        assert.deepStrictEqual(read("min"), ["a>b:1"]);
        assert.deepStrictEqual(read("max"), ["a>b:4"]);
        assert.deepStrictEqual(read("none"), ["a>b:1", "a>b:4"]);
        assert.strictEqual(scopedInputCounters.derivations, 4, "one induce shared, one simplify per merging policy");
    });

    it("keeps a scope's isolated nodes: the input is never induced on edge endpoints", () => {
        const graph = chain();
        // Every node, and only the edges of weight below 3: e and f keep no edge.
        const scope = graph.scope(
            ["a", "b", "c", "d", "e", "f"],
            (_source, _target, index) => (graph.snapshot().edgeList().weights?.[index] ?? 1) < 3,
        );
        const input = createScopedInput(graph.getDataManager(), "declared", undefined, runOver(scope));

        assert.deepStrictEqual(idsOf(input.subgraph()), ["a", "b", "c", "d", "e", "f"]);
        assert.deepStrictEqual(edgesOf(input.subgraph()).sort(), ["a>b:1", "b>c:2"]);
    });

    it("gives the undirected input the weight of the half in scope, never the hidden half's", () => {
        const graph = new InputGraph(
            ["a", "b"],
            [
                ["a", "b", 0.1],
                ["b", "a", 0.9],
            ],
        );
        // toUndirected keeps the lower index's row, so undirecting first would keep 0.1.
        const scope = graph.scope(["a", "b"], (source) => source === "b");
        const input = createScopedInput(graph.getDataManager(), "undirected", undefined, runOver(scope));

        const { weights } = input.subgraph().edgeList();
        assert.strictEqual(input.subgraph().edgeCount, 1);
        assert.closeTo(weights?.[0] ?? Number.NaN, 0.9, 1e-6);
    });
});

describe("the whole-graph shortcut", () => {
    it("returns the snapshot unchanged, and the store's cached undirected view, with no derivation", () => {
        const graph = chain();
        const data = graph.getDataManager();
        const declared = graph.snapshot();

        for (const run of [undefined, runOver(null), runOver(graph.everything())]) {
            assert.strictEqual(createScopedInput(data, "declared", undefined, run).subgraph(), declared);
            assert.strictEqual(
                createScopedInput(data, "undirected", undefined, run).subgraph(),
                data.undirected(declared).snapshot,
            );
            assert.isTrue(createScopedInput(data, "declared", undefined, run).whole);
        }

        assert.strictEqual(scopedInputCounters.derivations, 0);
    });

    it("merges a multigraph's parallel edges by the asked policy, as every run did before scopes", () => {
        const graph = new InputGraph(
            ["a", "b"],
            [
                ["a", "b", 1],
                ["a", "b", 2],
            ],
        );
        const data = graph.getDataManager();

        assert.deepStrictEqual(edgesOf(createScopedInput(data, "declared").subgraph()), ["a>b:3"]);
        assert.deepStrictEqual(edgesOf(createScopedInput(data, "declared", { simplify: "min" }).subgraph()), ["a>b:1"]);
        assert.strictEqual(createScopedInput(data, "declared", { simplify: "none" }).subgraph(), graph.snapshot());
    });
});

describe("work: one CSR pass per derivation", () => {
    it("derives each step once however often it is read, at two sizes", () => {
        const counts: number[] = [];
        for (const size of [8, 800]) {
            const ids = Array.from({ length: size }, (_, index) => `n${String(index)}`);
            const graph = new InputGraph(
                ids,
                ids.slice(1).map((id, index) => [ids[index], id, 1] as const),
            );
            const run = runOver(graph.scope(ids.slice(0, size / 2)));
            scopedInputCounters.derivations = 0;
            for (let read = 0; read < 3; read++) {
                createScopedInput(graph.getDataManager(), "declared", undefined, run).subgraph();
                createScopedInput(graph.getDataManager(), "undirected", undefined, run).subgraph();
            }

            counts.push(scopedInputCounters.derivations);
        }

        assert.deepStrictEqual(counts, [2, 2], "the induce and the undirect, once each, at both sizes");
    });
});
