/**
 * @file `session.data.prepare()`: a source read once and held as a `LoadDraft`, its tables and
 * the element's own reading of their roles, the counts a load would produce, the rows the reader
 * may want to look at, and the load itself -- plus `import(source, { mapping })`, which is the
 * same path in one call.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";
import type { GraphSession, LoadDraft } from "../../src/session/types";

const PEOPLE = "id,name,team\na,Ann,red\nb,Bo,blue\nc,Cy,red\n";
/** One edge names `z`, which the node file does not hold. */
const TIES = "source,target,weight\na,b,2\nb,c,5\nc,z,1\n";

const GRAPHML = `<?xml version="1.0"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="n" for="node" attr.name="name" attr.type="string"/>
  <key id="w" for="edge" attr.name="weight" attr.type="double"/>
  <graph edgedefault="undirected">
    <node id="a"><data key="n">Ann</data></node>
    <node id="b"><data key="n">Bo</data></node>
    <edge source="a" target="b"><data key="w">3</data></edge>
  </graph>
</graphml>`;

/** Trips between stations, under endpoint columns no probe recognizes. */
const TRIPS = "from_station,to_station,trips\nx,y,10\ny,z,3\nz,x,7\n";

/**
 * The error a promise rejects with.
 * @param promise - The promise.
 * @returns The error, or null when it resolved.
 */
async function refusal(
    promise: Promise<unknown>,
): Promise<{ code?: string; details?: Record<string, unknown> } | null> {
    return promise.then(
        () => null,
        (error: unknown) => error as { code?: string; details?: Record<string, unknown> },
    );
}

/**
 * Assert the session holds nothing and has recorded nothing.
 * @param session - The session.
 */
function assertUntouched(session: GraphSession): void {
    assert.strictEqual(session.data.statistics().nodeCount, 0);
    assert.strictEqual(session.history.steps.length, 0);
    assert.isNull(session.data.lastImport());
}

/**
 * A paired-file draft of the people and their ties.
 * @param session - The session.
 * @returns The draft.
 */
async function pair(session: GraphSession): Promise<LoadDraft> {
    return session.data.prepare({
        config: { nodeFile: new File([PEOPLE], "people.csv"), edgeFile: new File([TIES], "ties.csv") },
    });
}

describe("session.data.prepare", () => {
    it("reads a CSV pair into two tables without loading anything", async () => {
        const session = createGraphSession();
        const draft = await pair(session);

        assert.strictEqual(draft.type, "csv");
        assert.deepEqual(
            draft.tables.map(({ id, name, rowCount, fixed }) => ({ id, name, rowCount, fixed })),
            [
                { id: "nodes", name: "people.csv", rowCount: 3, fixed: false },
                { id: "edges", name: "ties.csv", rowCount: 3, fixed: false },
            ],
        );
        const people = draft.tables[0].columns;
        assert.deepEqual(
            people.map((column) => column.name),
            ["id", "name", "team"],
        );
        assert.strictEqual(people[0].suggested, "key");
        assert.isUndefined(people[1].suggested);
        assert.strictEqual(people[2].type, "category");
        assert.strictEqual(people[2].uniqueCount, 2);
        assert.strictEqual(people[2].completeness, 1);
        assert.deepEqual(draft.mapping.tables.edges, {
            rowsAre: "edges",
            source: { column: "source" },
            target: { column: "target" },
            weight: "weight",
            time: null,
            edgeId: null,
        });
        assert.strictEqual(draft.mapping.tables.nodes.key, "id");
        for (const table of draft.tables) {
            const read: Record<string, unknown> = { ...draft.mapping.tables[table.id] };
            for (const column of table.columns.filter((each) => each.suggested !== undefined)) {
                const role = read[column.suggested ?? ""];
                assert.strictEqual(typeof role === "object" ? (role as { column: string }).column : role, column.name);
            }
        }
        assertUntouched(session);
        session.dispose();
    });

    it("reports what the load would do, and the load does exactly that, as one undoable step", async () => {
        const session = createGraphSession();
        const draft = await pair(session);

        const report = await draft.report();
        assert.strictEqual(report.counts.nodes, 4);
        assert.strictEqual(report.counts.edges, 3);
        assert.deepEqual(report.unmatched, { rows: 1, values: 1 });
        assert.isNull(report.tooLarge);
        assertUntouched(session);

        await draft.load();
        const loaded = session.data.lastImport();
        assert.strictEqual(loaded?.counts.nodes, 4);
        assert.strictEqual(loaded?.counts.edges, 3);
        assert.deepEqual(loaded?.unmatched, { rows: 1, values: 1 });
        assert.isNull(loaded?.tooLarge);
        assert.strictEqual(session.data.node("a")?.name, "Ann");
        assert.strictEqual(session.history.steps.length, 1);

        await session.undo();
        assert.strictEqual(session.data.statistics().nodeCount, 0);
        session.dispose();
    });

    it("lists the unmatched rows with their lines, and leaves them out on request", async () => {
        const session = createGraphSession();
        const draft = await pair(session);

        const unmatched = await draft.rows("edges", { only: "unmatched" });
        assert.strictEqual(unmatched.total, 1);
        assert.deepEqual(unmatched.records[0], { line: 4, values: { source: "c", target: "z", weight: 1 } });

        const report = await draft.report({ unmatched: "leave-out" });
        assert.strictEqual(report.counts.edges, 2);
        assert.strictEqual(report.counts.nodes, 3);

        await draft.load({ unmatched: "leave-out" });
        assert.strictEqual(session.data.statistics().edgeCount, 2);
        assert.isUndefined(session.data.node("z"));
        session.dispose();
    });

    it("pages rows and counts a quoted line break inside its row", async () => {
        const session = createGraphSession();
        const text = 'id,note\na,"two\nlines"\nb,plain\nc,last\n';
        const draft = await session.data.prepare({ type: "csv", config: { data: text } });

        assert.strictEqual(draft.tables[0].id, "rows");
        assert.strictEqual(draft.mapping.tables.rows.rowsAre, "nodes");
        const page = await draft.rows("rows", { offset: 1, limit: 1 });
        assert.strictEqual(page.total, 3);
        assert.strictEqual(page.offset, 1);
        assert.deepEqual(page.records, [{ line: 4, values: { id: "b", note: "plain" } }]);
        session.dispose();
    });

    it("loads named endpoint and weight columns, which the CSV options alone could not", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({ type: "csv", config: { data: TRIPS } });
        assert.isUndefined(draft.mapping.tables.rows.source);

        await draft.load({ mapping: { source: "from_station", target: "to_station", weight: "trips" } });
        const report = session.data.lastImport();
        assert.strictEqual(report?.counts.edges, 3);
        assert.strictEqual(report?.weights.attribute, "trips");
        assert.strictEqual(session.config.data.knownFields.edgeWeightPath, "trips");
        session.dispose();
    });

    it("loads the edges a CSV source's own endpoint options name", async () => {
        const session = createGraphSession();
        await session.data.import({
            type: "csv",
            config: { data: TRIPS, edgeSource: "from_station", edgeTarget: "to_station" },
        });

        assert.strictEqual(session.data.statistics().edgeCount, 3);
        session.dispose();
    });

    it("reads column names with spaces, dots and quotes as themselves", async () => {
        const session = createGraphSession();
        const text = 'from station,to.station,"shared ""chapters"""\nx,y,4\ny,z,2\n';
        await session.data.import(
            { type: "csv", config: { data: text } },
            { mapping: { source: "from station", target: "to.station", weight: 'shared "chapters"' } },
        );

        assert.strictEqual(session.data.statistics().edgeCount, 2);
        assert.strictEqual(session.data.statistics().nodeCount, 3);
        assert.strictEqual(session.data.lastImport()?.weights.attribute, 'shared "chapters"');
        session.dispose();
    });

    it("weighs every edge 1 when the weight is null, without the legacy value column", async () => {
        const session = createGraphSession();
        const text = "source,target,value\na,b,9\n";
        const draft = await session.data.prepare({ type: "csv", config: { data: text } });
        assert.strictEqual(draft.mapping.tables.rows.weight, "value");

        await draft.load({ mapping: { weight: null } });
        assert.strictEqual(session.data.lastImport()?.weights.resolvedFrom, "none");
        session.dispose();
    });

    it("reads one edge list as a node list when the reader says its rows are nodes", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({ type: "csv", config: { data: TRIPS } });

        await draft.load({ mapping: { rowsAre: "nodes", key: "from_station", label: "to_station" } });
        assert.strictEqual(session.data.statistics().nodeCount, 3);
        assert.strictEqual(session.data.statistics().edgeCount, 0);
        assert.strictEqual(session.config.data.knownFields.nodeLabelPath, "to_station");
        session.dispose();
    });

    it("loads a pair handed over the wrong way round when each table's rows are named", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({
            config: { nodeFile: new File([TIES], "ties.csv"), edgeFile: new File([PEOPLE], "people.csv") },
        });

        await draft.load({
            mapping: { tables: { nodes: { rowsAre: "edges" }, edges: { rowsAre: "nodes", key: "id" } } },
        });
        assert.strictEqual(session.data.statistics().edgeCount, 3);
        assert.strictEqual(session.data.node("a")?.team, "red");
        session.dispose();
    });

    it("writes the direction in the same step as the load", async () => {
        const session = createGraphSession();
        const draft = await pair(session);

        await draft.load({ directed: false });
        assert.strictEqual(session.config.data.directed, false);
        assert.strictEqual(session.history.steps.length, 1);
        session.dispose();
    });

    it("counts a merge against the graph already there", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: "id\nz\nq\n" } });
        const draft = await pair(session);

        const report = await draft.report({ mode: "merge" });
        assert.strictEqual(report.counts.nodes, 5);
        assert.deepEqual(report.unmatched, { rows: 0, values: 0 });
        assert.strictEqual((await draft.rows("edges", { only: "unmatched" })).total, 0);
        session.dispose();
    });

    it("reads a graph file as two tables whose roles the format sets", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({ type: "graphml", config: { data: GRAPHML } });

        assert.deepEqual(
            draft.tables.map(({ id, rowCount, fixed }) => ({ id, rowCount, fixed })),
            [
                { id: "nodes", rowCount: 2, fixed: true },
                { id: "edges", rowCount: 1, fixed: true },
            ],
        );
        assert.deepEqual(draft.mapping.tables.edges.source, { column: "source" });
        const refused = await refusal(draft.load({ mapping: { tables: { edges: { weight: null } } } }));
        assert.strictEqual(refused?.code, "E_BAD_COMMAND");

        await draft.load();
        assert.strictEqual(session.data.lastImport()?.counts.edges, 1);
        session.dispose();
    });

    it("refuses a mapping it cannot carry out, naming what is wrong", async () => {
        const session = createGraphSession();
        const draft = await pair(session);

        const bare = await refusal(draft.report({ mapping: { weight: "weight" } }));
        assert.strictEqual(bare?.code, "E_BAD_COMMAND");

        const unknown = await refusal(draft.report({ mapping: { tables: { edges: { weight: "wieght" } } } }));
        assert.strictEqual(unknown?.code, "E_UNKNOWN_ATTRIBUTE");
        assert.include(unknown?.details?.candidates as string[], "weight");

        const role = await refusal(draft.report({ mapping: { tables: { nodes: { weight: "team" } } } }));
        assert.strictEqual(role?.code, "E_BAD_COMMAND");

        const table = await refusal(draft.report({ mapping: { tables: { people: {} } } }));
        assert.strictEqual(table?.code, "E_BAD_COMMAND");
        session.dispose();
    });

    it("is gone once loaded, disposed, or replaced by the next prepare", async () => {
        const session = createGraphSession();
        const first = await pair(session);
        const second = await pair(session);

        assert.strictEqual((await refusal(first.report()))?.code, "E_DISPOSED");
        second.dispose();
        assert.strictEqual((await refusal(second.rows("nodes")))?.code, "E_DISPOSED");

        const third = await pair(session);
        await third.load();
        assert.strictEqual((await refusal(third.load()))?.code, "E_DISPOSED");
        assert.strictEqual(third.type, "csv");
        assert.deepEqual(
            third.tables.map((table) => table.id),
            ["nodes", "edges"],
        );
        assert.strictEqual(third.mapping.tables.edges?.source?.column, "source");
        session.dispose();
    });

    it("refuses a file with nothing readable with the code import refuses it with", async () => {
        const session = createGraphSession();
        // a well-formed file that holds no node and no edge (a cut-off file is a syntax error instead)
        const source = { type: "graphml", config: { data: '<graphml><graph edgedefault="directed"/></graphml>' } };
        const draft = await session.data.prepare(source);

        assert.deepEqual(
            draft.tables.map((table) => table.rowCount),
            [0, 0],
        );
        assert.strictEqual((await refusal(draft.report()))?.code, "E_EMPTY_LOAD");
        assert.strictEqual((await refusal(session.data.import(source)))?.code, "E_EMPTY_LOAD");
        assertUntouched(session);
        session.dispose();
    });
});
