/**
 * @file Building a run's result does no work a reader has not asked for: it reads its nodes
 * through the snapshot's id index rather than building a Map of its own, and it sorts for the
 * `rank` and `percentile` fields only when one is first read, once however often it is read.
 */

import { fromEdgeArrays } from "@graphty/graph-format";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import type { FieldDescriptor } from "../../../src/catalog/types";
import { createRunResult, retentionOf } from "../../../src/session/results/RunResult";
import { rankOrder } from "../../../src/session/results/statistics";
import type { Caveats } from "../../../src/session/runs/types";

vi.mock("../../../src/session/results/statistics", async (actual) => {
    const real = await actual<typeof import("../../../src/session/results/statistics")>();
    return { ...real, rankOrder: vi.fn(real.rankOrder) };
});

const CAVEATS: Caveats = { exact: true, direction: "undirected", precision: "f64", method: "degree", notes: [] };
const COUNT = 1_000;

/**
 * A per-node field descriptor.
 * @param name - The field.
 * @param type - Its type.
 * @returns The descriptor.
 */
function field(name: string, type: FieldDescriptor["type"]): FieldDescriptor {
    return { name, plainName: name, technicalName: name, kind: "node", type, path: `results.degree.${name}` };
}

/**
 * A degree result over a snapshot's nodes, published as columns as the degree adapter does.
 * @returns The result and the snapshot's id index.
 */
function degreeOverSnapshot(): {
    result: ReturnType<typeof createRunResult>;
    ids: ReturnType<typeof fromEdgeArrays>["ids"];
} {
    const snapshot = fromEdgeArrays({
        src: new Uint32Array(0),
        dst: new Uint32Array(0),
        nodeCount: COUNT,
        directed: false,
    });
    const published = Array.from({ length: COUNT }, (_, row) => snapshot.ids.idOf(row));
    const value = Float64Array.from(published, (_, row) => row % 7);
    const result = createRunResult({
        runId: "degree",
        shape: "node-metric",
        fields: [field("value", "integer"), field("rank", "integer"), field("percentile", "number")],
        measured: { nodes: COUNT, edges: 0 },
        nodes: { ids: published, columns: { value } },
        snapshotIds: snapshot.ids,
        caveats: CAVEATS,
        durationMs: 1,
    });

    return { result, ids: snapshot.ids };
}

describe("building a run result", () => {
    let mapSets: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.mocked(rankOrder).mockClear();
        mapSets = vi.spyOn(Map.prototype, "set");
    });

    afterEach(() => {
        mapSets.mockRestore();
    });

    it("reads through the snapshot's id index and builds no Map of ids", () => {
        const { result, ids } = degreeOverSnapshot();

        // A handful of bookkeeping entries (the columns by name), never one per node.
        assert.isBelow(mapSets.mock.calls.length, 20);
        assert.strictEqual(retentionOf(result).indexes[0].index, ids);
        assert.strictEqual(result.node(ids.idOf(3))?.value, 3);
    });

    it("sorts nothing until a rank is read, and sorts once however often ranks are read", () => {
        const { result, ids } = degreeOverSnapshot();
        assert.strictEqual(vi.mocked(rankOrder).mock.calls.length, 0, "built");

        // The value and the range need no ranking; neither does a record whose rank is not read.
        const record = result.node(ids.idOf(6));
        assert.strictEqual(record?.value, 6);
        assert.strictEqual(result.graph.max, 6);
        assert.strictEqual(result.column("value").max, 6);
        assert.strictEqual(vi.mocked(rankOrder).mock.calls.length, 0, "values read");

        assert.strictEqual(record?.rank, 1);
        assert.strictEqual(vi.mocked(rankOrder).mock.calls.length, 1, "first rank read");

        assert.deepStrictEqual(Object.keys(result.node(ids.idOf(0)) ?? {}), ["value", "rank", "percentile"]);
        result.ranking("value", 5);
        result.top("value", 10);
        result.summary();
        result.column("rank");
        assert.strictEqual(vi.mocked(rankOrder).mock.calls.length, 1, "every later read");
    });
});
