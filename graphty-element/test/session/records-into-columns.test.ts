/**
 * @file Record arrays through the column door (design/rendering/row-renderer.md 4.6, stage 29,
 * second pull request). Under the "batched" render path an eligible `addNodes` or `addEdges` is
 * read once into columns and the graph slice keeps no record of it; an ineligible one takes the
 * records path whole; `columnsEligible` decides which; and the load report names the path. Under
 * "objects" nothing changes and the report carries no path.
 */

import { assert, describe, it } from "vitest";

import type { LoadPathReason } from "../../src/data/report";
import type { GraphSession } from "../../src/session";
import { createElementSession, dispatcherOf } from "../../src/session/GraphSession";
import { dataDigest } from "../../src/session/project/digest";
import { columnsEligible } from "../../src/session/project/ingest";
import type { RecordMap } from "../../src/session/project/recordMap";

const NODES = ["a", "b", "c", "d"].map((id, row) => ({ id, group: row % 2, tags: [id] }));
const EDGES = [
    { source: "a", target: "b", weight: 2 },
    { source: "b", target: "c", weight: 3, kind: "x" },
    { source: "c", target: "d" },
];

/**
 * The digest of the session's graph slice and snapshot.
 * @param session - The session.
 * @returns The digest.
 */
function digest(session: GraphSession): string {
    return dataDigest(dispatcherOf(session).state.graph, () => session.data.snapshot());
}

/**
 * How many records the graph slice keeps as objects, nodes and edges.
 * @param session - The session.
 * @returns The two counts.
 */
function kept(session: GraphSession): [number, number] {
    const { nodes, edges } = dispatcherOf(session).state.graph;
    return [(nodes as RecordMap<unknown>).heldRecords(), (edges as RecordMap<unknown>).heldRecords()];
}

/** A node record that is a class instance, not a plain object. */
class Row {
    readonly [key: string]: unknown;
    readonly id: string;
    /**
     * @param id - The id.
     */
    constructor(id: string) {
        this.id = id;
    }
}

describe("columnsEligible", () => {
    const rows: [string, Parameters<typeof columnsEligible>[0], LoadPathReason | null][] = [
        ["objects path", { batched: false, records: NODES }, "objects"],
        ["plain nodes", { batched: true, records: NODES }, null],
        ["plain edges", { batched: true, records: EDGES, edges: { repeated: "keep", weight: "weight" } }, null],
        ["summed repeats", { batched: true, records: EDGES, edges: { repeated: "sum", weight: "weight" } }, null],
        ["refused duplicate ids", { batched: true, records: NODES, duplicateIds: "refuse" }, null],
        ["merged duplicate ids", { batched: true, records: NODES, duplicateIds: "merge" }, "duplicateIds"],
        [
            "first repeat kept",
            { batched: true, records: EDGES, edges: { repeated: "first", weight: "weight" } },
            "repeatedEdges",
        ],
        [
            "two endpoint spellings",
            {
                batched: true,
                records: [...EDGES, { src: "a", dst: "d" }],
                edges: { repeated: "keep", weight: "weight" },
            },
            "endpoints",
        ],
        [
            "weights from two keys",
            {
                batched: true,
                records: [...EDGES, { source: "a", target: "d", value: 1 }],
                edges: { repeated: "keep", weight: "weight" },
            },
            "weights",
        ],
        ["a class instance", { batched: true, records: [...NODES, new Row("e")] }, "records"],
    ];
    for (const [name, load, reason] of rows) {
        it(`answers ${reason ?? "columns"} for ${name}`, () => {
            assert.deepStrictEqual(
                columnsEligible(load),
                reason === null ? { code: "PATH_COLUMNS", params: {} } : { code: "PATH_RECORDS", params: { reason } },
            );
        });
    }
});

describe("record arrays through the column door", () => {
    it("keeps no record of an eligible batched addNodes and addEdges, and the graph the objects path makes", async () => {
        const objects = createElementSession({}, { batched: () => false });
        const batched = createElementSession({}, { batched: () => true });
        for (const session of [objects, batched]) {
            await session.data.addNodes(NODES);
            await session.data.addEdges(EDGES);
        }

        assert.strictEqual(digest(batched), digest(objects));
        assert.deepStrictEqual(kept(objects), [NODES.length, EDGES.length]);
        assert.deepStrictEqual(kept(batched), [0, 0]);
        assert.deepStrictEqual(batched.data.lastImport()?.path, { code: "PATH_COLUMNS", params: {} });
        assert.isUndefined(objects.data.lastImport()?.path);
        // A record read back is the record the objects path holds, and undo and redo keep the graph.
        assert.deepStrictEqual(dispatcherOf(batched).state.graph.nodes.get("b"), { id: "b", group: 1, tags: ["b"] });
        const loaded = digest(batched);
        await batched.undo();
        await batched.redo();
        assert.strictEqual(digest(batched), loaded);
    });

    it("takes an ineligible batched load through the records path whole, counted, and says why", async () => {
        const session = createElementSession({}, { batched: () => true });
        await session.data.addNodes([...NODES, new Row("e")]);
        await session.data.addEdges([...EDGES, { src: "a", dst: "d" }]);
        // Every row of both loads is a record the slice keeps, not just the rows that failed.
        assert.deepStrictEqual(kept(session), [NODES.length + 1, session.data.count().edges]);
        assert.deepStrictEqual(session.data.lastImport()?.path, {
            code: "PATH_RECORDS",
            params: { reason: "endpoints" },
        });
    });

    for (const batched of [false, true]) {
        it(`resolves importColumns to the report the record doors give, on the ${batched ? "batched" : "objects"} path`, async () => {
            const records = createElementSession({}, { batched: () => batched });
            await records.data.addNodes(NODES.map(({ id }) => ({ id })));
            await records.data.addEdges(EDGES.map(({ source, target }, at) => ({ source, target, weight: at + 1 })));
            const columns = createElementSession({}, { batched: () => batched });
            const report = await columns.data.importColumns({
                nodeCount: NODES.length,
                ids: NODES.map(({ id }) => id),
                sources: [0, 1, 2],
                targets: [1, 2, 3],
                weights: [1, 2, 3],
            });
            assert.strictEqual(report, columns.data.lastImport());
            const expected = records.data.lastImport();
            assert.isNotNull(expected);
            // importColumns names its own endpoint keys, so they are declared, not found by probing;
            // every other fact is the record doors'.
            assert.strictEqual(report.endpoints.resolvedFrom, "declared");
            assert.deepStrictEqual(
                { ...report, endpoints: { ...report.endpoints, resolvedFrom: "source/target" } },
                expected,
            );
        });
    }
});
