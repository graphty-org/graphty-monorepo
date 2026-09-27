/**
 * @file A run result keeps each published field as a column, not an object per element, so what
 * one result retains is close to the bytes of its columns and a million-node run fits the undo
 * history's byte budget. Records and rankings are built on demand and read the same as before.
 */

import { assert, describe, it } from "vitest";

import type { FieldDescriptor, NodeId } from "../../../src/catalog/types";
import { createRunResult, retentionOf, shareNodeIndex } from "../../../src/session/results/RunResult";
import { rankEntries, topOfRanking } from "../../../src/session/results/statistics";
import type { RunResult } from "../../../src/session/results/types";
import type { Caveats } from "../../../src/session/runs/types";
import { fixtureSession } from "../history/fixture-session";

const CAVEATS: Caveats = { exact: true, direction: "undirected", precision: "f64", method: "degree", notes: [] };

/**
 * A per-element field descriptor.
 * @param name - The field.
 * @param type - Its type.
 * @param kind - Which half.
 * @returns The descriptor.
 */
function field(name: string, type: FieldDescriptor["type"], kind: "node" | "edge" = "node"): FieldDescriptor {
    return { name, plainName: name, technicalName: name, kind, type, path: `results.degree.${name}` };
}

/**
 * A degree result over the given ids and values.
 * @param ids - The node ids, in column order.
 * @param valueAt - The value of each position.
 * @returns The result.
 */
function degreeResult(ids: readonly NodeId[], valueAt: (position: number) => number): RunResult {
    return createRunResult({
        runId: "degree",
        shape: "node-metric",
        fields: [field("value", "integer"), field("rank", "integer"), field("percentile", "number")],
        measured: { nodes: ids.length, edges: 0 },
        nodes: ids.map((id, position) => ({ id, values: { value: valueAt(position) } })),
        caveats: CAVEATS,
        durationMs: 1,
    });
}

describe("a columnar run result", () => {
    it("retains about the bytes of its columns at 100,000 nodes", () => {
        const count = 100_000;
        const ids = Array.from({ length: count }, (_, position) => `n${String(position)}`);
        const result = degreeResult(ids, (position) => position % 97);
        // value, rank and percentile: three Float64 columns.
        const columns = 3 * Float64Array.BYTES_PER_ELEMENT * count;
        const { bytes } = retentionOf(result);

        assert.isAtLeast(bytes, columns);
        assert.isAtMost(bytes, columns * 1.1);

        // A ranking is cached as a permutation: four bytes per ranked element.
        result.ranking("value", 5);
        assert.strictEqual(retentionOf(result).bytes - bytes, 4 * count);
    });

    it("builds equal records on demand, frozen, and none for an id it does not hold", () => {
        const result = createRunResult({
            runId: "path",
            shape: "path",
            fields: [field("onPath", "boolean"), field("hop", "integer"), field("onPath", "boolean", "edge")],
            measured: { nodes: 3, edges: 1 },
            nodes: [
                { id: "a", values: { onPath: true, hop: 0 } },
                { id: 2, values: { onPath: true } },
                { id: "c", values: { onPath: false, hop: 2, note: "end" } },
                { id: "a", values: { hop: 1 } },
            ],
            edges: [{ id: "7", values: { onPath: true } }],
            caveats: CAVEATS,
            durationMs: 1,
        });

        assert.deepStrictEqual(result.node("a"), { onPath: true, hop: 1 });
        assert.deepStrictEqual(result.node(2), { onPath: true });
        assert.deepStrictEqual(result.node("c"), { onPath: false, hop: 2, note: "end" });
        assert.deepStrictEqual(result.edge("7"), { onPath: true });
        assert.notStrictEqual(result.node("a"), result.node("a"));
        assert.deepStrictEqual(result.node("a"), result.node("a"));
        assert.isTrue(Object.isFrozen(result.node("c")));
        assert.strictEqual(result.node("2"), undefined);
        assert.strictEqual(result.node("zz"), undefined);
        assert.strictEqual(result.graph.length, 2);
    });

    it("ranks exactly as ranking plain entries does, ties, gaps and mixed ids included", () => {
        const ids: NodeId[] = Array.from({ length: 400 }, (_, position) => (position % 3 === 0 ? position : `v${String(position)}`));
        const valueAt = (position: number): number => {
            if (position % 17 === 0) {
                return Number.NaN;
            }

            return position % 29 === 0 ? Number.POSITIVE_INFINITY : (position * 7919) % 23;
        };
        const result = degreeResult(ids, valueAt);
        const reference = rankEntries(ids.map((id, position) => ({ id, value: valueAt(position) })));

        assert.deepStrictEqual(result.ranking("value"), reference);
        assert.deepStrictEqual(result.ranking("value", 25), reference.slice(0, 25));
        for (const n of [0, 1, 5, 17, 18, 40, 399, 400, 1000]) {
            assert.deepStrictEqual(result.top("value", n), topOfRanking(reference, n), `top ${String(n)}`);
        }

        for (const entry of reference) {
            assert.strictEqual(result.node(entry.id)?.rank, entry.rank);
            assert.strictEqual(result.node(entry.id)?.percentile, entry.percentile);
        }
    });

    it("shares the snapshot's id index when its order matches, and keeps its own otherwise", () => {
        const ids = ["a", "b", "c"];
        const snapshotIds = { size: 3, idOf: (position: number): NodeId => ids[position], indexOf: (id: NodeId) => ids.indexOf(String(id)) };
        const shared = degreeResult(ids, (position) => position);
        shareNodeIndex(shared, snapshotIds, 7);
        const [nodeIndex] = retentionOf(shared).indexes;
        assert.strictEqual(nodeIndex.index, snapshotIds);
        assert.strictEqual(nodeIndex.token, 7);
        assert.deepStrictEqual(shared.node("b"), { value: 1, rank: 2, percentile: 2 / 3 });

        const reordered = degreeResult(["b", "a", "c"], (position) => position);
        shareNodeIndex(reordered, snapshotIds, 7);
        const [own] = retentionOf(reordered).indexes;
        assert.notStrictEqual(own.index, snapshotIds);
        assert.isNull(own.token);
        assert.isAbove(own.bytes, 0);
    });

    it("is counted by the history once, and its node index only while the snapshot it shares is not resident", async () => {
        const session = await fixtureSession();
        const result = await session.runs.start("degree", {}, { as: "deg" });
        const [index] = retentionOf(result).indexes;
        assert.isNotNull(index.token, "the run read the resident snapshot, so it shares its index");
        const runStep = (): number => session.history.steps[0].bytes;
        const shared = runStep();
        assert.isAtLeast(shared, 512 + retentionOf(result).bytes);

        await session.data.updateNodes([{ id: "n1", values: { name: "one" } }]);
        assert.strictEqual(runStep() - shared, index.bytes, "the edit left the index to the result alone");

        await session.undo();
        assert.strictEqual(runStep(), shared, "undoing the edit made its snapshot resident again");
        session.dispose();
    });
});
