import { assert, describe, it } from "vitest";

import type { FieldDescriptor, ResultShape } from "../../../src/catalog/types";
import { GraphtyError } from "../../../src/errors/GraphtyError";
import { createResultsApi, type ResultsRunEntry } from "../../../src/session/results/ResultsApi";
import { createRunResult } from "../../../src/session/results/RunResult";
import type { RunResult } from "../../../src/session/results/types";

/**
 * A finished result over nodes, one field per element.
 * @param runId - The run.
 * @param shape - Its shape.
 * @param values - Each node's value of the shape's primary field.
 * @returns The result.
 */
function resultOf(runId: string, shape: ResultShape, values: Record<string, number>): RunResult {
    const name = shape === "community" ? "group" : "value";
    const field: FieldDescriptor = {
        name,
        plainName: name,
        technicalName: name,
        kind: "node",
        type: shape === "community" ? "integer" : "number",
        path: `results.${runId}.${name}`,
    };
    const ids = Object.keys(values);

    return createRunResult({
        runId,
        shape,
        fields: [field],
        measured: { nodes: ids.length, edges: 0 },
        nodes: ids.map((id) => ({ id, values: { [name]: values[id] } })),
        caveats: { exact: true, direction: "undirected", precision: "f64", method: runId, facts: [], notes: [] },
        durationMs: 1,
    });
}

/**
 * A results API holding these results.
 * @param results - The results.
 * @returns The API.
 */
function apiOf(...results: RunResult[]): ReturnType<typeof createResultsApi> {
    const entries: ResultsRunEntry[] = results.map((result) => ({
        id: result.runId,
        label: result.runId,
        distinguishedBy: null,
        siblingsDifferBy: null,
        shape: result.shape,
        result,
    }));

    return createResultsApi({
        entry: (id) => entries.find((entry) => entry.id === id),
        entries: () => entries,
    });
}

describe("results.compare: two rankings", () => {
    const before = resultOf("before", "node-metric", { a: 4, b: 3, c: 3, d: 1, x: 9 });
    const after = resultOf("after", "node-metric", { a: 1, b: 5, c: 4, d: 3, y: 0 });
    const results = apiOf(before, after);

    it("names the movers, largest move first, and who kept their place", () => {
        const c = results.compare("before", "after");
        assert.strictEqual(c.kind, "ranking");
        if (c.kind !== "ranking") {
            return;
        }

        assert.strictEqual(c.shared, 4);
        assert.deepEqual(c.onlyA, ["x"]);
        assert.deepEqual(c.onlyB, ["y"]);
        // before: x1 a2 b3 c3 d5; after: b1 c2 d3 a4 y5
        const byId = new Map(c.changes.map((change) => [change.id, change]));
        assert.deepEqual(byId.get("a"), { id: "a", rankA: 2, rankB: 4, move: -2, tiedA: 1, tiedB: 1 });
        assert.deepEqual(byId.get("b"), { id: "b", rankA: 3, rankB: 1, move: 2, tiedA: 2, tiedB: 1 });
        assert.deepEqual(byId.get("c"), { id: "c", rankA: 3, rankB: 2, move: 1, tiedA: 2, tiedB: 1 });
        assert.deepEqual(byId.get("d"), { id: "d", rankA: 5, rankB: 3, move: 2, tiedA: 1, tiedB: 1 });
        assert.deepEqual(
            c.changes.map((change) => Math.abs(change.move)),
            [2, 2, 2, 1],
        );
        assert.strictEqual(c.moved, 4);
    });

    it("reports Spearman's correlation, ties averaged", () => {
        const same = results.compare("before", "before");
        assert.strictEqual(same.kind === "ranking" ? same.correlation : NaN, 1);
        assert.strictEqual(same.kind === "ranking" ? same.moved : NaN, 0);

        const c = results.compare(before, after);
        // shared a,b,c,d: before ranks 1, 2.5, 2.5, 4; after 4, 1, 2, 3
        assert.closeTo(c.kind === "ranking" ? (c.correlation ?? NaN) : NaN, -1.5 / Math.sqrt(4.5 * 5), 1e-12);
    });
});

describe("results.compare: two groupings", () => {
    const louvain = resultOf("louvain", "community", { a: 0, b: 0, c: 0, d: 1, e: 1, f: 1 });
    const relabelled = resultOf("relabelled", "community", { a: 7, b: 7, c: 7, d: 3, e: 3, f: 3 });
    const moved = resultOf("moved", "community", { a: 5, b: 5, c: 6, d: 6, e: 6, f: 6 });
    const results = apiOf(louvain, relabelled, moved);

    it("agrees fully with the same grouping under other names", () => {
        const c = results.compare("louvain", "relabelled");
        assert.ok(c.kind === "partition");
        if (c.kind !== "partition") {
            return;
        }
        assert.strictEqual(c.agreement, 1);
        assert.deepEqual(c.moves, []);
        assert.deepEqual(c.groups, { a: 2, b: 2 });
        assert.deepEqual(c.overlaps, [
            { a: 0, b: 7, count: 3 },
            { a: 1, b: 3, count: 3 },
        ]);
    });

    it("reports the member that left the rest of its group", () => {
        const c = results.compare({ run: "louvain", field: "group" }, "moved");
        assert.ok(c.kind === "partition");
        if (c.kind !== "partition") {
            return;
        }
        assert.deepEqual(c.moves, [{ id: "c", a: 0, b: 6, mostOfGroup: 5 }]);
        assert.ok((c.agreement ?? 1) < 1 && (c.agreement ?? -1) > 0);
    });

    it("refuses a grouping against a measurement, and an unknown run", () => {
        const both = apiOf(louvain, resultOf("degree", "node-metric", { a: 1 }));
        assert.throws(() => both.compare("louvain", "degree"), GraphtyError, /grouping/);
        try {
            both.compare("louvain", "nope");
            assert.fail("expected a refusal");
        } catch (error) {
            assert.ok(error instanceof GraphtyError);
            assert.strictEqual(error.code, "E_UNKNOWN_RUN");
        }
    });
});
