/**
 * @file Previewing a load before committing it, loading with the reader's column roles, and load
 * progress as a session event.
 *
 * `session.data.preview(source)` reads the source the way `import` would and answers what the
 * load would hold -- the format, each table with its columns and a few rows, the key and weight
 * columns, and the import report -- without touching the graph or its history. `import(source,
 * { mapping })` applies the same role edits, so the counts match what the preview said.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";
import type { GraphSession, LoadPreview } from "../../src/session/types";

const PEOPLE = "id,name,team\na,Ann,red\nb,Bo,blue\nc,Cy,red\n";
const TIES = "source,target,weight\na,b,2\nb,c,5\n";

const GRAPHML = `<?xml version="1.0"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="n" for="node" attr.name="name" attr.type="string"/>
  <key id="w" for="edge" attr.name="weight" attr.type="double"/>
  <graph edgedefault="undirected">
    <node id="a"><data key="n">Ann</data></node>
    <node id="b"><data key="n">Bo</data></node>
    <node id="c"><data key="n">Cy</data></node>
    <edge source="a" target="b"><data key="w">3</data></edge>
    <edge source="b" target="c"><data key="w">1</data></edge>
  </graph>
</graphml>`;

const GML = `graph [
  directed 0
  node [ id 1 label "A" ]
  node [ id 2 label "B" ]
  edge [ source 1 target 2 value 4 ]
]`;

/** Trips between stations, under endpoint columns no probe recognizes. */
const TRIPS = "from_station,to_station,trips\nx,y,10\ny,z,3\nz,x,7\n";

/**
 * A table of a preview by role.
 * @param preview - the preview
 * @param role - which table
 * @returns the table
 */
function table(preview: LoadPreview, role: "nodes" | "edges"): LoadPreview["tables"][number] {
    const found = preview.tables.find((each) => each.role === role);
    assert.isDefined(found, `no ${role} table`);
    return found;
}

/**
 * The role of each column of a table, by name.
 * @param preview - the preview
 * @param role - which table
 * @returns name to role
 */
function roles(preview: LoadPreview, role: "nodes" | "edges"): Record<string, string> {
    return Object.fromEntries(table(preview, role).columns.map((column) => [column.name, column.role]));
}

/**
 * Assert the session holds nothing and has recorded nothing.
 * @param session - the session
 */
function assertUntouched(session: GraphSession): void {
    assert.strictEqual(session.data.statistics().nodeCount, 0);
    assert.strictEqual(session.history.steps.length, 0);
    assert.isNull(session.data.lastImport());
    assert.isNull(session.data.source());
}

describe("session.data.preview", () => {
    it("previews a CSV pair without loading it", async () => {
        const session = createGraphSession();
        const preview = await session.data.preview({
            config: { nodeFile: new File([PEOPLE], "people.csv"), edgeFile: new File([TIES], "ties.csv") },
        });

        assert.strictEqual(preview.format, "csv");
        const nodes = table(preview, "nodes");
        assert.strictEqual(nodes.name, "people.csv");
        assert.strictEqual(nodes.rowCount, 3);
        assert.strictEqual(nodes.sample.length, 3);
        assert.deepInclude(roles(preview, "nodes"), { id: "id", name: "attribute", team: "attribute" });
        assert.strictEqual(nodes.columns.find((column) => column.name === "name")?.level, "text");
        const team = nodes.columns.find((column) => column.name === "team");
        assert.strictEqual(team?.type, "category");
        assert.strictEqual(team?.level, "category");
        assert.strictEqual(nodes.columns.find((column) => column.name === "id")?.level, "id");

        const edges = table(preview, "edges");
        assert.strictEqual(edges.name, "ties.csv");
        assert.strictEqual(edges.rowCount, 2);
        assert.deepInclude(roles(preview, "edges"), { source: "source", target: "target", weight: "weight" });
        assert.strictEqual(edges.columns.find((column) => column.name === "weight")?.level, "quantity");

        assert.deepEqual(preview.keys, { node: "id", source: "source", target: "target" });
        assert.strictEqual(preview.weight, "weight");
        assert.strictEqual(preview.report.counts.nodes, 3);
        assert.strictEqual(preview.report.counts.edges, 2);
        for (const column of [...nodes.columns, ...edges.columns]) {
            assert.strictEqual(column.suggested, column.role);
        }

        assertUntouched(session);
        session.dispose();
    });

    it("previews a GraphML file", async () => {
        const session = createGraphSession();
        const preview = await session.data.preview({ config: { data: GRAPHML } });

        assert.strictEqual(preview.format, "graphml");
        assert.strictEqual(table(preview, "nodes").rowCount, 3);
        assert.strictEqual(table(preview, "edges").rowCount, 2);
        assert.deepInclude(roles(preview, "nodes"), { id: "id", name: "attribute" });
        assert.deepInclude(roles(preview, "edges"), { source: "source", target: "target", weight: "weight" });
        assert.strictEqual(preview.weight, "weight");
        assert.strictEqual(table(preview, "nodes").sample[0]?.name, "Ann");
        assertUntouched(session);
        session.dispose();
    });

    it("previews a GML file", async () => {
        const session = createGraphSession();
        const preview = await session.data.preview({ config: { data: GML } });

        assert.strictEqual(preview.format, "gml");
        assert.strictEqual(table(preview, "nodes").rowCount, 2);
        assert.strictEqual(table(preview, "edges").rowCount, 1);
        assert.strictEqual(preview.report.counts.edges, 1);
        assert.deepEqual(preview.keys, { node: "id", source: "source", target: "target" });
        assert.isAbove(table(preview, "edges").sample.length, 0);
        assertUntouched(session);
        session.dispose();
    });

    it("refuses a file it will not read with the import's own error code, and loads nothing", async () => {
        const session = createGraphSession();
        const refused = await session.data.preview({ name: "trips.csv", config: { data: TRIPS } }).then(
            () => null,
            (error: unknown) => error as { code?: string; details?: { columns?: unknown } },
        );

        assert.strictEqual(refused?.code, "E_EDGE_ENDPOINTS_UNRESOLVED");
        assertUntouched(session);
        session.dispose();
    });

    it("previews and imports with the reader's column roles, and the counts agree", async () => {
        const session = createGraphSession();
        const source = { name: "trips.csv", config: { data: TRIPS } };
        const mapping = { source: "from_station", target: "to_station", weight: "trips" };

        const preview = await session.data.preview(source, { mapping });
        assert.deepEqual(preview.keys, { node: null, source: "from_station", target: "to_station" });
        assert.strictEqual(preview.weight, "trips");
        assert.deepInclude(roles(preview, "edges"), {
            "from_station": "source",
            "to_station": "target",
            "trips": "weight",
        });
        // The element could not tell these columns' roles by itself.
        const suggested = Object.fromEntries(table(preview, "edges").columns.map((c) => [c.name, c.suggested]));
        assert.deepInclude(suggested, { "from_station": "attribute", "to_station": "attribute" });
        assertUntouched(session);

        await session.data.import(source, { mapping });
        const report = session.data.lastImport();
        assert.deepEqual(report?.counts, preview.report.counts);
        assert.strictEqual(report?.counts.edges, 3);
        assert.strictEqual(report?.weights.attribute, "trips");
        assert.strictEqual(session.history.steps.length, 1);
        session.dispose();
    });

    it("reads a CSV pair handed over the wrong way round when the mapping names the tables' roles", async () => {
        const session = createGraphSession();
        const swapped = {
            config: { nodeFile: new File([TIES], "ties.csv"), edgeFile: new File([PEOPLE], "people.csv") },
        };
        const preview = await session.data.preview(swapped, {
            mapping: { tables: { "people.csv": "nodes", "ties.csv": "edges" } },
        });

        assert.strictEqual(table(preview, "nodes").name, "people.csv");
        assert.strictEqual(table(preview, "edges").name, "ties.csv");
        assert.strictEqual(preview.report.counts.nodes, 3);
        assert.strictEqual(preview.report.counts.edges, 2);
        session.dispose();
    });
});

describe("import with a mapping", () => {
    it("reads columns whose names are not bare identifiers", async () => {
        const session = createGraphSession();
        const csv = "from station,to station,trip count\nx,y,10\ny,z,3\n";
        await session.data.import(
            { name: "trips.csv", config: { data: csv } },
            { mapping: { source: "from station", target: "to station", weight: "trip count" } },
        );

        assert.strictEqual(session.data.lastImport()?.counts.edges, 2);
        assert.strictEqual(session.data.lastImport()?.weights.attribute, "trip count");
        session.dispose();
    });

    it("reads the node id from the column the mapping names", async () => {
        const session = createGraphSession();
        await session.data.import(
            { name: "people.csv", config: { data: "key,name\nk1,Ann\nk2,Bo\n", variant: "node-list" } },
            { mapping: { nodeId: "key" } },
        );

        const ids = session.data.nodePage({ limit: 5 }).records.map((record) => record.id);
        assert.deepEqual(ids, ["k1", "k2"]);
        session.dispose();
    });

    it("keeps edgeSource and edgeTarget as expressions, so a nested path still reads", async () => {
        const session = createGraphSession();
        const json = JSON.stringify({
            nodes: [{ id: "a" }, { id: "b" }],
            edges: [{ rel: { from: "a", to: "b" } }],
        });
        await session.data.import({ type: "json", config: { data: json, edgeSource: "rel.from", edgeTarget: "rel.to" } });

        assert.strictEqual(session.data.lastImport()?.counts.edges, 1);
        session.dispose();
    });
});

describe("session.data.preview of one CSV file", () => {
    it("reads an edge list as a node list when the mapping names its table nodes", async () => {
        const session = createGraphSession();
        const source = { name: "ties.csv", config: { data: TIES } };

        const asRead = await session.data.preview(source);
        assert.deepEqual(
            asRead.tables.map((each) => each.role),
            ["nodes", "edges"],
        );

        const asNodes = await session.data.preview(source, { mapping: { tables: { edges: "nodes" } } });
        assert.deepEqual(
            asNodes.tables.map((each) => [each.role, each.rowCount]),
            [["nodes", 2]],
        );
        session.dispose();
    });
});

describe("data:progress", () => {
    it("publishes the running record count of a load as a session event", async () => {
        const session = createGraphSession();
        const seen: { format: string; read: number }[] = [];
        const stop = session.on("data:progress", ({ format, read, nodeRecords, edgeRecords }) => {
            assert.strictEqual(read, nodeRecords + edgeRecords);
            seen.push({ format, read });
        });

        await session.data.import({ config: { data: GRAPHML } });
        stop();

        assert.isAbove(seen.length, 0);
        assert.deepEqual(seen.at(-1), { format: "graphml", read: 5 });
        session.dispose();
    });

    it("publishes nothing for a preview", async () => {
        const session = createGraphSession();
        let heard = 0;
        session.on("data:progress", () => {
            heard++;
        });

        await session.data.preview({ config: { data: GRAPHML } });
        assert.strictEqual(heard, 0);
        session.dispose();
    });
});
