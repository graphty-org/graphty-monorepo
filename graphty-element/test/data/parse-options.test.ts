/**
 * @file The parse options of a data source (spec/README.md 4.1.2 rule 9): `pointer`, the part of a
 * JSON file read (an array as one table of rows, an object as a whole graph), and `missing`, the
 * cell texts a CSV or JSON source reads as unset. Both go through `data.import` and through a draft.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";
import { GraphtyError } from "../../src/errors";

/** A JSON file holding two collections: people and who knows whom. */
const ORG = JSON.stringify({
    graph: {
        people: [
            { id: "ava", team: "core" },
            { id: "ben", team: "N/A" },
            { id: "cy", age: 40 },
        ],
        knows: [
            { source: "ava", target: "ben" },
            { source: "ben", target: "cy" },
        ],
        other: { nodes: [{ id: "x" }, { id: "y" }], edges: [{ source: "x", target: "y" }] },
        "a/b~c": [{ id: "escaped" }],
        count: 3,
    },
});

describe("pointer: the part of a JSON file read", () => {
    it("reads nodes under /graph/people as a node table, and the edges beside them", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: ORG, pointer: "/graph/people" } });
        assert.deepStrictEqual(
            session.data.nodes().map((node) => node.id),
            ["ava", "ben", "cy"],
        );
        assert.strictEqual(session.data.node("ava")?.team, "core");
        await session.data.import({ type: "json", config: { data: ORG, pointer: "/graph/knows" } }, { mode: "merge" });
        assert.strictEqual(session.data.edges().length, 2);
        assert.strictEqual(session.data.nodes().length, 3);
        session.dispose();
    });

    it("holds a collection as one rows table in a draft, mapped like a CSV table", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({ type: "json", config: { data: ORG, pointer: "/graph/knows" } });
        const [table] = draft.tables;
        assert.strictEqual(draft.tables.length, 1);
        assert.strictEqual(table.id, "rows");
        assert.isFalse(table.fixed);
        assert.deepStrictEqual(
            table.columns.map((column) => column.name),
            ["source", "target"],
        );
        await draft.load({ mapping: { rowsAre: "edges", source: "source", target: "target" } });
        assert.strictEqual(session.data.edges().length, 2);
        session.dispose();
    });

    it("reads an object whole as a graph, and follows escaped tokens", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: ORG, pointer: "/graph/other" } });
        assert.deepStrictEqual(
            session.data.nodes().map((node) => node.id),
            ["x", "y"],
        );
        assert.strictEqual(session.data.edges().length, 1);
        const escaped = createGraphSession();
        await escaped.data.import({ type: "json", config: { data: ORG, pointer: "/graph/a~1b~0c" } });
        assert.deepStrictEqual(
            escaped.data.nodes().map((node) => node.id),
            ["escaped"],
        );
        session.dispose();
        escaped.dispose();
    });

    it("refuses a pointer that names nothing, or a value that is no array or object", async () => {
        for (const pointer of ["/graph/none", "/graph/count", "graph", "/graph/people/01"]) {
            const session = createGraphSession();
            const error = await session.data
                .import({ type: "json", config: { data: ORG, pointer } })
                .then(() => null)
                .catch((caught: unknown) => caught);
            assert.instanceOf(error, GraphtyError, pointer);
            assert.strictEqual(error.code, "E_OPTION_RANGE", pointer);
            assert.deepInclude(error.details, { option: "pointer", value: pointer }, pointer);
            session.dispose();
        }
    });
});

describe("pointer left unset: an array at the root is a document", () => {
    it("reads a Cytoscape elements array whole", async () => {
        const session = createGraphSession();
        const data = JSON.stringify([
            { data: { id: "a" } },
            { data: { id: "b" } },
            { data: { source: "a", target: "b" } },
        ]);
        await session.data.import({ type: "json", config: { data } });
        assert.deepStrictEqual(
            session.data.nodes().map((node) => node.id),
            ["a", "b"],
        );
        assert.strictEqual(session.data.edges().length, 1);
        session.dispose();
    });

    it("selects the root array's nodes and edges by the node and edge paths", async () => {
        const session = createGraphSession();
        const data = JSON.stringify([
            { kind: "n", id: "a", team: "x" },
            { kind: "n", id: "b" },
            { kind: "e", source: "a", target: "b" },
        ]);
        await session.data.import({
            type: "json",
            config: { data, node: { path: "[?kind=='n']" }, edge: { path: "[?kind=='e']" } },
        });
        assert.strictEqual(session.data.node("a")?.team, "x");
        assert.strictEqual(session.data.nodes().length, 2);
        assert.strictEqual(session.data.edges().length, 1);
        session.dispose();
    });
});

describe("pointer with edgeSource and edgeTarget", () => {
    it("reads the collection as edges by the named end keys", async () => {
        const session = createGraphSession();
        const data = JSON.stringify({ k: [{ s: "a", t: "b" }] });
        await session.data.import({
            type: "json",
            config: { data, pointer: "/k", edgeSource: "s", edgeTarget: "t" },
        });
        const [edge] = session.data.edges();
        assert.strictEqual(session.data.edges().length, 1);
        assert.strictEqual(edge.source, "a");
        assert.strictEqual(edge.target, "b");
        session.dispose();
    });

    it("reads the collection as edges by the session's configured end keys", async () => {
        const session = createGraphSession();
        await session.config.set({ data: { knownFields: { edgeSrcIdPath: "s", edgeDstIdPath: "t" } } });
        const data = JSON.stringify({ k: [{ s: "a", t: "b" }], people: [{ id: "c" }] });
        await session.data.import({ type: "json", config: { data, pointer: "/k" } });
        assert.strictEqual(session.data.edges().length, 1);
        assert.deepStrictEqual(
            session.data
                .nodes()
                .map((node) => node.id)
                .sort(),
            ["a", "b"],
        );
        // records that carry neither key are still a node table
        await session.data.import({ type: "json", config: { data, pointer: "/people" } }, { mode: "merge" });
        assert.isDefined(session.data.node("c"));
        assert.strictEqual(session.data.edges().length, 1);
        session.dispose();
    });
});

describe("the format catalog lists the parse options", () => {
    it("offers missing for csv and json, and pointer for json", () => {
        const session = createGraphSession();
        const optionsOf = (id: string): string[] =>
            session.catalog
                .formats()
                .find((format) => format.id === id)
                ?.options?.map((option) => option.name) ?? [];
        assert.include(optionsOf("csv"), "missing");
        assert.include(optionsOf("json"), "missing");
        assert.include(optionsOf("json"), "pointer");
        session.dispose();
    });
});

describe("missing: cell texts read as unset", () => {
    const CSV = "id,team,age\nava,core,30\nben,N/A,N/A\n";

    it("reads N/A as unset with missing [N/A], and as text without it", async () => {
        const plain = createGraphSession();
        await plain.data.import({ type: "csv", config: { data: CSV } });
        assert.strictEqual(plain.data.node("ben")?.team, "N/A");
        const unset = createGraphSession();
        await unset.data.import({ type: "csv", config: { data: CSV, missing: ["N/A"] } });
        assert.isUndefined(unset.data.node("ben")?.team);
        assert.isUndefined(unset.data.node("ben")?.age);
        assert.strictEqual(unset.data.node("ava")?.age, 30, "the column stays numeric");
        plain.dispose();
        unset.dispose();
    });

    it("reads N/A as unset through a draft", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({ type: "csv", config: { data: CSV, missing: ["N/A"] } });
        await draft.load({ mapping: { rowsAre: "nodes", key: "id" } });
        assert.isUndefined(session.data.node("ben")?.team);
        assert.strictEqual(session.data.node("ava")?.team, "core");
        session.dispose();
    });

    it("unsets a JSON record's matching string values only", async () => {
        const session = createGraphSession();
        await session.data.import({
            type: "json",
            config: {
                data: JSON.stringify({ nodes: [{ id: "a", note: "N/A", n: 1, nested: { v: "N/A" } }], edges: [] }),
                missing: ["N/A"],
            },
        });
        const node = session.data.node("a");
        assert.isUndefined(node?.note);
        assert.strictEqual(node?.n, 1);
        assert.deepStrictEqual(node?.nested, { v: "N/A" });
        session.dispose();
    });

    it("leaves out an edge whose end missing unsets, as a CSV row, and loads the rest", async () => {
        const session = createGraphSession();
        await session.data.import({
            type: "json",
            config: {
                data: JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }], edges: [{ source: "a", target: "N/A" }] }),
                missing: ["N/A"],
            },
        });
        assert.deepStrictEqual(
            session.data
                .nodes()
                .map((node) => node.id)
                .sort(),
            ["a", "b"],
        );
        assert.strictEqual(session.data.edges().length, 0);
        session.dispose();
    });

    it("unsets a collection's matching values, in a draft too", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({
            type: "json",
            config: { data: ORG, pointer: "/graph/people", missing: ["N/A"] },
        });
        await draft.load({ mapping: { rowsAre: "nodes", key: "id" } });
        assert.isUndefined(session.data.node("ben")?.team);
        session.dispose();
    });
});
