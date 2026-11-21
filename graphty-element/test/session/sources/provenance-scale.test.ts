/**
 * @file What each load supplied (the `provenance` graph value) is read without work that grows
 * with every id of every load: a load of a million edges makes no list per edge, a reader of node
 * loads never walks the edges, and `data.sources()` recounts what each load still holds without
 * one edge-id lookup per edge. Counted work, never a stopwatch; the timings at 100,000 nodes and
 * 1,000,000 edges are in multi-source-scale.bench.test.ts.
 */

import { GraphSnapshot } from "@graphty/graph-format";
import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { type Provenance, provenanceIndex } from "../../../src/session/sources/provenance";

/**
 * A list that counts how many of its items were read through iteration.
 * @param items - The items.
 * @returns The list and a read of the count.
 */
function counted<T>(items: T[]): { list: readonly T[]; reads: () => number } {
    let reads = 0;
    const list = new Proxy(items, {
        get(target, key, receiver) {
            if (key === Symbol.iterator) {
                return function* iterate(): Generator<T> {
                    for (const item of target) {
                        reads++;
                        yield item;
                    }
                };
            }

            return Reflect.get(target, key, receiver) as unknown;
        },
    });
    return { list, reads: () => reads };
}

/**
 * A CSV edge list of `count` edges among `nodes` nodes named with a prefix.
 * @param prefix - The node-name prefix.
 * @param nodes - How many nodes.
 * @param count - How many edges.
 * @returns The text.
 */
function edgeList(prefix: string, nodes: number, count: number): string {
    const lines = ["source,target"];
    for (let at = 0; at < count; at++) {
        lines.push(`${prefix}${String(at % nodes)},${prefix}${String((at * 7 + 1) % nodes)}`);
    }

    return lines.join("\n");
}

let session: GraphSession | undefined;
afterEach(() => {
    session?.dispose();
    session = undefined;
    vi.restoreAllMocks();
});

describe("provenance at scale", () => {
    it("reads the node loads without walking any edge, and shares one list per load", () => {
        const edges = counted(Array.from({ length: 500 }, (_, at) => String(at)));
        const provenance: Provenance = {
            s1: { nodes: ["a", "b", "c"], edges: edges.list },
            s2: { nodes: ["c", "d"], edges: [] },
        };
        const index = provenanceIndex(provenance);
        assert.deepStrictEqual(index.nodes.get("c"), ["s1", "s2"]);
        assert.deepStrictEqual(index.nodes.get("a"), ["s1"]);
        assert.strictEqual(edges.reads(), 0, "reading node loads walked the edges");
        // Every id only one load supplied answers with that load's one list.
        assert.strictEqual(index.nodes.get("a"), index.nodes.get("b"));
        assert.strictEqual(index.edges.get("0"), index.edges.get("499"));
        assert.deepStrictEqual(index.edges.get("7"), ["s1"]);
    });

    it("answers sourcesOf with one shared list per load, and recounts sources() with no edge-id lookup", async () => {
        session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: edgeList("a", 40, 200) }, name: "a.csv" });
        await session.data.import(
            { type: "csv", config: { data: edgeList("b", 10, 30) }, name: "b.csv" },
            { mode: "merge" },
        );
        const ids = session.data.edges().map((edge) => edge.id);
        assert.strictEqual(
            session.data.sourcesOf(ids[0], { kind: "edge" }),
            session.data.sourcesOf(ids[1], { kind: "edge" }),
            "each edge of one load got its own list",
        );

        // A new snapshot, with nodes of the first load gone, so the counts must be recounted.
        await session.data.removeNodes(["a0", "a1"]);
        const lookups = vi.spyOn(GraphSnapshot.prototype, "edgeIndexOf");
        const counts = session.data.sources().map((each) => each.counts);
        const left = session.data.edges().filter((edge) => String(edge.source).startsWith("a")).length;
        assert.deepStrictEqual(counts, [
            { nodes: 38, edges: left },
            { nodes: 10, edges: 30 },
        ]);
        assert.isBelow(left, 200);
        assert.strictEqual(lookups.mock.calls.length, 0, "sources() looked edges up one id at a time");
    });

    it("recounts sources() after an edit with no allocation sized by a large saved edge id", async () => {
        const first = createGraphSession({ features: ["save-files-v2"] });
        await first.data.import({ type: "csv", config: { data: "source,target\na,b\nb,c" }, name: "a.csv" });
        const file = JSON.parse((await first.project.save({ format: 2, results: true })).text) as {
            sections: { data: { edgeIds: Record<string, Record<string, string>> } };
        };
        first.dispose();
        // A save file may name any edge id below 2^31; the session's counter then runs on past it.
        const [keys] = Object.values(file.sections.data.edgeIds);
        keys[Object.keys(keys)[0]] = "2000000000";
        session = createGraphSession({ features: ["save-files-v2"] });
        await session.project.open(JSON.stringify(file), { rerun: false, discard: true });
        await session.data.addEdges([{ source: "a", target: "c" }]);
        assert.include(
            session.data.edges().map((edge) => edge.id),
            "2000000000",
        );

        const before = process.memoryUsage().arrayBuffers;
        const counts = session.data.sources().map((each) => each.counts);
        const grown = process.memoryUsage().arrayBuffers - before;
        assert.deepStrictEqual(counts, [{ nodes: 3, edges: 2 }]);
        assert.isBelow(grown, 1_000_000, "the recount allocated by the highest edge id, not by the edges held");
    });
});
