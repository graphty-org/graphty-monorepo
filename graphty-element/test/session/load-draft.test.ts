/**
 * @file `session.data.prepare()`: a source read once and held as a `LoadDraft`, its tables and
 * the element's own reading of their roles, the counts a load would produce, the rows the reader
 * may want to look at, and the load itself -- plus `import(source, { mapping })`, which is the
 * same path in one call.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, LOAD_ROLES } from "../../src/session";
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
    afterEach(() => {
        vi.unstubAllGlobals();
    });

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
        assert.strictEqual((await draft.rows("edges", { only: "unmatched", choices: { mode: "merge" } })).total, 0);
        session.dispose();
    });

    it("reports a merge of an edge table alone as the load does it (#935)", async () => {
        for (const unmatched of ["leave-out", "add"] as const) {
            const session = createGraphSession();
            await session.data.addNodes([{ id: "a" }, { id: "b" }]);
            const draft = await session.data.prepare({ type: "csv", config: { data: TIES } });
            const choices = { mode: "merge", unmatched } as const;

            const report = await draft.report(choices);
            const unmatchedRows = await draft.rows("rows", { only: "unmatched", choices });
            await draft.load(choices);
            const loaded = session.data.lastImport();

            assert.deepEqual(report.unmatched, { rows: 2, values: 2 }, unmatched);
            assert.deepEqual(report.counts, loaded?.counts, unmatched);
            assert.deepEqual(report.unmatched, loaded?.unmatched, unmatched);
            assert.deepEqual(
                unmatchedRows.records.map((row) => row.line),
                [3, 4],
            );
            session.dispose();
        }
    });

    it("reads rows under the choices it is given, not the last report's (#927)", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: "id\nz\n" } });
        const draft = await pair(session);
        const flipped = { mapping: { tables: { edges: { source: "target", target: "source" } } } };

        // No report() first: the rows follow the choices passed in.
        const before = await draft.rows("edges", { only: "unmatched", choices: flipped });
        await draft.report({ mode: "merge" });
        const own = await draft.rows("edges", { only: "unmatched" });
        const merged = await draft.rows("edges", { only: "unmatched", choices: { mode: "merge" } });

        assert.deepEqual(
            before.records.map((row) => row.values.target),
            ["z"],
        );
        assert.strictEqual(own.total, 1, "an earlier report's merge is not reused");
        assert.strictEqual(merged.total, 0, "the graph holds z");
        session.dispose();
    });

    it("lists the rows a load makes into nodes and edges (#927)", async () => {
        const session = createGraphSession();
        const draft = await pair(session);
        const choices = { unmatched: "leave-out" } as const;

        const report = await draft.report(choices);
        const edges = await draft.rows("edges", { only: "loaded", choices, limit: Infinity });
        const nodes = await draft.rows("nodes", { only: "loaded", choices, limit: Infinity });

        assert.strictEqual(edges.total, report.counts.edges);
        assert.deepEqual(
            edges.records.map((row) => row.values.target),
            ["b", "c"],
        );
        assert.strictEqual(nodes.total, report.counts.nodes);
        session.dispose();
    });

    it("counts a node row with no id as rejected and lists it (#929)", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({ type: "csv", config: { data: "id,name\n,A\nb,B\n" } });

        const report = await draft.report();
        const rejected = await draft.rows("rows", { only: "rejected" });
        await draft.load();

        assert.strictEqual(report.counts.nodes, 1);
        assert.strictEqual(report.counts.rejected, 1);
        assert.deepEqual(
            rejected.records.map((row) => row.line),
            [2],
        );
        assert.strictEqual(session.data.lastImport()?.counts.rejected, 1);
        session.dispose();
    });

    it("reports duplicate node ids, and keeps, merges or refuses them as asked (#929)", async () => {
        const data = "id,name,team\na,A,red\na,B,\nb,C,blue\n";
        for (const duplicateIds of [undefined, "first", "merge", "refuse"] as const) {
            const session = createGraphSession();
            const draft = await session.data.prepare({ type: "csv", config: { data } });
            const choices = duplicateIds === undefined ? {} : { duplicateIds };

            const report = await draft.report(choices);
            const loaded = await draft.rows("rows", { only: "loaded", choices });
            const outcome = await refusal(draft.load(choices));

            assert.deepEqual(report.duplicates, { rows: 1, ids: ["a"] }, duplicateIds);
            assert.strictEqual(report.counts.nodes, 2, duplicateIds);
            assert.strictEqual(loaded.total, 2, duplicateIds);
            if (duplicateIds === "refuse") {
                assert.strictEqual(outcome?.code, "E_DUPLICATE_ID");
                assert.strictEqual(outcome?.details?.id, "a");
                assertUntouched(session);
            } else {
                assert.isNull(outcome, duplicateIds);
                const node = session.data.node("a");
                assert.strictEqual(node?.name, duplicateIds === "merge" ? "B" : "A", duplicateIds);
                assert.strictEqual(node?.team, "red", duplicateIds);
                assert.deepEqual(session.data.lastImport()?.duplicates, { rows: 1, ids: ["a"] });
            }

            session.dispose();
        }
    });

    it("counts a JSON node with no id and a repeated JSON id, as it does a CSV row's (#929)", async () => {
        const data = JSON.stringify({ nodes: [{ id: "a", n: 1 }, { id: "a", n: 2 }, { name: "x" }], edges: [] });
        const session = createGraphSession();

        await session.data.import({ type: "json", config: { data } });
        const refused = await refusal(
            session.data.import({ type: "json", config: { data } }, { duplicateIds: "refuse" }),
        );

        const last = session.data.lastImport();
        assert.deepInclude(last?.counts, { nodes: 1, nodeRecords: 3, rejected: 1 });
        assert.deepEqual(last?.duplicates, { rows: 1, ids: ["a"] });
        assert.strictEqual(session.data.node("a")?.n, 1, "the first record is kept");
        assert.strictEqual(refused?.code, "E_DUPLICATE_ID");
        session.dispose();
    });

    it("publishes the roles each table kind takes and requires (#926)", () => {
        assert.deepEqual(LOAD_ROLES.nodes, { takes: ["key", "label", "time"], requires: [] });
        assert.deepEqual(LOAD_ROLES.edges, {
            takes: ["source", "target", "weight", "time", "edgeId"],
            requires: ["source", "target"],
        });
        assert.isTrue(Object.isFrozen(LOAD_ROLES.edges.takes));
    });

    it("says which table is not ready and which role it lacks (#926)", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({ type: "csv", config: { data: TRIPS } });
        const onlySource = { mapping: { source: "from_station" } };

        assert.deepEqual(draft.missing(), { rows: ["source", "target"] });
        assert.deepEqual(draft.missing(onlySource), { rows: ["target"] });
        assert.deepEqual(draft.missing({ mapping: { rowsAre: "nodes" } }), { rows: [] });
        const refused = await refusal(draft.report(onlySource));
        assert.strictEqual(refused?.code, "E_EDGE_ENDPOINTS_UNRESOLVED");
        assert.deepInclude(refused?.details, { table: "rows", missing: ["target"] });
        assert.strictEqual((await refusal(draft.load(onlySource)))?.code, "E_EDGE_ENDPOINTS_UNRESOLVED");
        assertUntouched(session);
        session.dispose();
    });

    it("offers a number column as the weight without applying it (#926)", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({ type: "csv", config: { data: TRIPS } });

        const table = draft.tables[0];
        assert.strictEqual(table.weightCandidate, "trips");
        assert.isUndefined(table.columns.find((column) => column.name === "trips")?.suggested);
        assert.isNull(draft.mapping.tables.rows.weight ?? null);
        const tied = await pair(session);
        assert.isUndefined(tied.tables[1].weightCandidate, "a table with a weight needs no offer");
        session.dispose();
    });

    it("recognizes which file of a pair holds the edges, in either order (#911)", async () => {
        const session = createGraphSession();
        const swapped = await session.data.prepare({
            config: { nodeFile: new File([TIES], "ties.csv"), edgeFile: new File([PEOPLE], "people.csv") },
        });

        assert.strictEqual(swapped.mapping.tables.nodes.rowsAre, "edges");
        assert.strictEqual(swapped.mapping.tables.edges.rowsAre, "nodes");
        assert.strictEqual(swapped.mapping.tables.edges.key, "id");
        const report = await swapped.report();
        assert.strictEqual(report.counts.nodes, 4);
        assert.strictEqual(report.counts.edges, 3);

        const twoNodeLists = await session.data.prepare({
            config: { nodeFile: new File([PEOPLE], "a.csv"), edgeFile: new File([PEOPLE], "b.csv") },
        });
        assert.deepEqual(
            Object.values(twoNodeLists.mapping.tables).map((table) => table.rowsAre),
            ["nodes", "edges"],
            "files whose columns say the same thing are read in the order handed over",
        );
        session.dispose();
    });

    it("resolves the roles a set of choices reads, without loading (#911)", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({ type: "csv", config: { data: PEOPLE } });

        const asEdges = draft.resolve({ mapping: { rowsAre: "edges", source: "id", target: "team" } });
        assert.deepInclude(asEdges.tables.rows, {
            rowsAre: "edges",
            source: { column: "id" },
            target: { column: "team" },
        });
        assert.deepEqual(draft.resolve(), draft.mapping);
        assertUntouched(session);
        session.dispose();
    });

    it("says which separator a CSV file was read with, and whether it was detected (#911)", async () => {
        const session = createGraphSession();
        const detected = await session.data.prepare({ type: "csv", config: { data: "id;name\na;A\n" } });
        assert.deepEqual(detected.tables[0].delimiter, { value: ";", detected: true });
        assert.strictEqual(detected.tables[0].columns.length, 2);

        const given = await session.data.prepare({ type: "csv", config: { data: "id|name\na|A\n", delimiter: "|" } });
        assert.deepEqual(given.tables[0].delimiter, { value: "|", detected: false });

        const graph = await session.data.prepare({ type: "graphml", config: { data: GRAPHML } });
        assert.isUndefined(graph.tables[0].delimiter);
        session.dispose();
    });

    it("names a graph file's label column, and the load labels the nodes with it (#911)", async () => {
        const session = createGraphSession();
        const gml = 'graph [ node [ id 1 label "Ann" ] node [ id 2 label "Bo" ] edge [ source 1 target 2 ] ]';
        const draft = await session.data.prepare({ type: "gml", config: { data: gml } });

        assert.strictEqual(draft.mapping.tables.nodes.label, "label");
        assert.strictEqual(draft.tables[0].columns.find((column) => column.name === "label")?.suggested, "label");
        await draft.load();
        assert.strictEqual(session.config.data.knownFields.nodeLabelPath, "label");
        session.dispose();
    });

    it("pairs a file with a URL, and pasted text with a file (#930)", async () => {
        vi.stubGlobal("fetch", (url: string) =>
            Promise.resolve(new Response(url.endsWith("ties.csv") ? TIES : PEOPLE, { status: 200 })),
        );
        const session = createGraphSession();

        const fileAndUrl = await session.data.prepare({
            config: { nodeFile: new File([PEOPLE], "people.csv"), edgeURL: "https://example.org/data/ties.csv" },
        });
        assert.deepEqual(
            fileAndUrl.tables.map(({ id, name, rowCount }) => ({ id, name, rowCount })),
            [
                { id: "nodes", name: "people.csv", rowCount: 3 },
                { id: "edges", name: "ties.csv", rowCount: 3 },
            ],
        );
        assert.strictEqual((await fileAndUrl.report()).counts.edges, 3);

        const textAndFile = await session.data.prepare({
            config: { nodeData: PEOPLE, edgeFile: new File([TIES], "ties.csv") },
        });
        assert.strictEqual(textAndFile.type, "csv");
        await textAndFile.load();
        assert.strictEqual(session.data.statistics().edgeCount, 3);
        session.dispose();
    });

    it("refuses a graph file handed over as one table of a pair (#930)", async () => {
        const session = createGraphSession();
        const gml = "graph [ node [ id 1 ] node [ id 2 ] edge [ source 1 target 2 ] ]";
        const source = {
            config: { nodeFile: new File([PEOPLE], "accounts.csv"), edgeFile: new File([gml], "ring.gml") },
        };

        const refused = await refusal(session.data.prepare(source));
        assert.strictEqual(refused?.code, "E_BAD_COMMAND");
        assert.deepEqual(refused?.details, { reason: "not-a-table", table: "edges", format: "gml", name: "ring.gml" });
        assert.strictEqual((await refusal(session.data.import(source)))?.code, "E_BAD_COMMAND");
        assertUntouched(session);
        session.dispose();
    });

    it("refuses a pair with one half missing with a code, naming the half (#930)", async () => {
        const session = createGraphSession();
        const source = { type: "csv", config: { nodeData: "id\na\n" } };

        for (const promise of [session.data.prepare(source), session.data.import(source)]) {
            const refused = await refusal(promise);
            assert.strictEqual(refused?.code, "E_BAD_COMMAND");
            assert.deepEqual(refused?.details, { reason: "missing-half", table: "edges" });
        }

        assertUntouched(session);
        session.dispose();
    });

    it("refuses a pair whose edge table has no endpoints as the report does, not as unreadable (#928)", async () => {
        const session = createGraphSession();
        const source = { type: "csv", config: { nodeData: "name,group\nA,1\n", edgeData: "a,b\nA,B\n" } };
        const expected = { table: "edges", missing: ["source", "target"] };

        const reported = await refusal((await session.data.prepare(source)).report());
        const imported = await refusal(session.data.import(source));

        assert.strictEqual(reported?.code, "E_EDGE_ENDPOINTS_UNRESOLVED");
        assert.deepInclude(reported?.details, expected);
        assert.strictEqual(imported?.code, "E_EDGE_ENDPOINTS_UNRESOLVED");
        assert.deepInclude(imported?.details, expected);
        assertUntouched(session);
        session.dispose();
    });

    it("lists a ready table's rows while another table is not ready (#926)", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({
            config: { nodeFile: new File([PEOPLE], "people.csv"), edgeFile: new File([TRIPS], "trips.csv") },
        });
        const edges = draft.tables.find((table) => draft.mapping.tables[table.id].rowsAre === "edges")?.id ?? "";
        const nodes = draft.tables.find((table) => table.id !== edges)?.id ?? "";

        assert.deepEqual(draft.missing()[edges], ["source", "target"]);
        assert.strictEqual((await draft.rows(nodes, { only: "loaded" })).total, 3);
        assert.strictEqual((await draft.rows(nodes, { only: "rejected" })).total, 0);
        assert.strictEqual((await refusal(draft.rows(edges, { only: "loaded" })))?.code, "E_EDGE_ENDPOINTS_UNRESOLVED");
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

    it("refuses a file its parser cannot read as unreadable, not as empty (#928)", async () => {
        for (const [type, data] of [
            ["graphml", "<graphml"],
            ["json", "{"],
            ["gml", "graph ["],
        ]) {
            const session = createGraphSession();
            const source = { type, config: { data } };
            const prepared = await refusal(session.data.prepare(source));
            const imported = await refusal(session.data.import(source));

            assert.strictEqual(prepared?.code, "E_PARSE_FAILED", type);
            assert.strictEqual(imported?.code, "E_PARSE_FAILED", type);
            assert.strictEqual(prepared?.details?.format, type);
            assertUntouched(session);
            session.dispose();
        }
    });

    it("refuses a file that parsed and holds nothing as empty (#928)", async () => {
        for (const [type, data] of [
            ["csv", ""],
            ["csv", "id,name\n"],
            ["json", '{"nodes":[],"edges":[]}'],
        ]) {
            const session = createGraphSession();
            const source = { type, config: { data } };
            const draft = await session.data.prepare(source);

            assert.strictEqual((await refusal(draft.report()))?.code, "E_EMPTY_LOAD", data);
            assert.strictEqual((await refusal(session.data.import(source)))?.code, "E_EMPTY_LOAD", data);
            assertUntouched(session);
            session.dispose();
        }
    });
});
