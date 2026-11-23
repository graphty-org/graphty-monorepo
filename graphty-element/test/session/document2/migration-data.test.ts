/**
 * @file The data part of the version 1 migration (spec 9.1), behind the `save-files-v2` experiment:
 * version 1 files with kinds, column types, recorded issues, undirected and odd-shaped graphs and
 * base64 result columns, opened with `migrate` and saved again as version 2, and what a reader of
 * the session or of the saved file finds.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../session";
import { migrateDocument1 } from "../../../src/session/document2/migration";
import type { DocumentProblem, JsonObject } from "../../../src/session/document2/types";

const ON = { features: ["save-files-v2"] };

/**
 * A version 1 project file of a node-link graph and an optional session member.
 * @param graph - The `graphty-data` member's graph.
 * @param session - The `graphty-session` member's members besides its kind and version.
 * @param more - Further members.
 * @returns The file.
 */
function v1File(graph: unknown, session?: JsonObject, more: JsonObject[] = []): JsonObject {
    return {
        kind: "graphty-document",
        version: 1,
        generator: { name: "graphty-element", version: "3.0.0" },
        members: [
            { kind: "graphty-data", version: 1, format: "json", dialect: "node-link", graph },
            ...(session === undefined ? [] : [{ kind: "graphty-session", version: 1, ...session }]),
            ...more,
        ],
    };
}

/**
 * Open a version 1 file through its migration in a new session.
 * @param file - The file.
 * @returns The session and what the open reported.
 */
async function opened(file: JsonObject): Promise<{ session: GraphSession; problems: readonly DocumentProblem[] }> {
    const session = createGraphSession(ON);
    const report = await session.project.open(JSON.stringify(file), { migrate: true });
    assert.strictEqual(report.opened, "project");
    return { session, problems: report.problems as readonly DocumentProblem[] };
}

/**
 * The data section a session saves as version 2.
 * @param session - The session.
 * @returns The section.
 */
async function savedData(session: GraphSession): Promise<JsonObject> {
    const file = JSON.parse((await session.project.save({ format: 2, markSaved: false })).text) as JsonObject;
    return (file.sections as Record<string, JsonObject>).data;
}

/**
 * The migrated source of a saved data section: the one that is not the reader.
 * @param data - The section.
 * @returns The source record.
 */
const sourceOf = (data: JsonObject): JsonObject =>
    (data.sources as JsonObject[]).find((source) => source.kind !== "reader") as JsonObject;

/**
 * The `W_MEMBER_LEFT_OUT` pointers of a report.
 * @param problems - The report.
 * @returns `<kind><pointer>` per problem.
 */
const leftOut = (problems: readonly DocumentProblem[]): string[] =>
    problems
        .filter((problem) => problem.code === "W_MEMBER_LEFT_OUT")
        .map((problem) => `${String(problem.params.kind)}${String(problem.params.pointer)}`);

describe("a version 1 file's data, migrated and opened", () => {
    it("gives each kind its node type when the loads used kinds, its schema the declared columns", async () => {
        const file = v1File(
            {
                nodes: [
                    { id: "a", kind: "person", age: 30 },
                    { id: "b", kind: "person", age: 40 },
                    { id: "c", kind: "dog" },
                    // No type: an empty kind, a kind holding a colon, a kind that is not text.
                    { id: "d", kind: "" },
                    { id: "e", kind: "x:y" },
                    { id: "f", kind: 3 },
                ],
                links: [],
            },
            {
                declarations: {
                    columns: [
                        { kind: "node", name: "age", measurement: "ratio", unit: "years", order: [30, 40] },
                        { kind: "node", name: "kind" },
                        // An edge column, and a node column no typed node carries, have nowhere to go.
                        { kind: "edge", name: "weight", measurement: "ratio" },
                        { kind: "node", name: "nobody" },
                    ],
                },
            },
        );
        (file.members as JsonObject[])[0].sources = [{ mapping: { nodes: { kind: "kind" } } }];
        const { session, problems } = await opened(file);
        assert.deepStrictEqual(leftOut(problems), [
            "graphty-session/declarations/columns/2",
            "graphty-session/declarations/columns/3",
        ]);
        assert.strictEqual(session.status.counts.nodes, 6);

        const data = await savedData(session);
        const source = String(sourceOf(data).id);
        assert.deepStrictEqual(data.types, [
            {
                name: "person",
                kind: "node",
                rules: [{ source, column: "kind", values: ["person"] }],
                schema: {
                    type: "object",
                    properties: { age: { measurement: "ratio", unit: "years", enum: [30, 40] }, kind: {} },
                },
            },
            {
                name: "dog",
                kind: "node",
                rules: [{ source, column: "kind", values: ["dog"] }],
                schema: { type: "object", properties: { kind: {} } },
            },
        ]);
        const types = new Map(
            ((data.graph as JsonObject).nodes as JsonObject[]).map((node) => [
                node["graphty.key"],
                node["graphty.types"],
            ]),
        );
        assert.deepStrictEqual(Object.fromEntries(types), {
            a: ["person"],
            b: ["person"],
            c: ["dog"],
            d: [],
            e: [],
            f: [],
        });
        session.dispose();
    });

    it("gives no node a type when no load used kinds, though the rows carry a kind column", async () => {
        const { session } = await opened(v1File({ nodes: [{ id: "a", kind: "person" }], links: [] }, {}));
        const data = await savedData(session);
        assert.deepStrictEqual(data.types, []);
        session.dispose();
    });

    it("converts the columns version 1 typed, as the session reads them back", async () => {
        const file = v1File(
            {
                nodes: [
                    { id: "a", n: "3.5", flag: "yes", label: 7, when: "2020-01-02" },
                    { id: "b", n: "", flag: "No", label: true },
                    { id: "c", n: "many", flag: "1", label: "C" },
                    { id: "d", n: true, flag: "maybe", label: null },
                    { id: "e", n: 4, flag: 0 },
                ],
                links: [{ source: "a", target: "b", w: "2" }],
            },
            {
                columns: {
                    types: {
                        "node:n": "number",
                        "node:flag": "boolean",
                        "node:label": "string",
                        "node:when": "date",
                        "edge:w": "number",
                        // Not a node or edge column, and a type version 1 never had: not converted.
                        "graph:title": "text",
                        "node:odd": "colour",
                    },
                },
            },
        );
        const { session } = await opened(file);
        const values = (name: string): unknown[] => session.data.nodes().map((node) => node[name]);
        assert.deepStrictEqual(values("n"), [3.5, null, null, null, 4]);
        assert.deepStrictEqual(values("flag"), [true, false, true, null, false]);
        assert.deepStrictEqual(values("label"), ["7", "true", "C", null, undefined]);
        assert.strictEqual(session.data.edges()[0].w, 2);

        const data = await savedData(session);
        assert.deepStrictEqual(data.conversions, [
            { kind: "node", name: "n", type: "number" },
            { kind: "node", name: "flag", type: "boolean" },
            { kind: "node", name: "label", type: "text" },
            { kind: "node", name: "when", type: "date" },
            { kind: "edge", name: "w", type: "number" },
        ]);
        session.dispose();
    });

    it("keeps the ignored issues and kept pairs it can read, and reports the fixes", async () => {
        const file = v1File(
            { nodes: [{ id: "a" }, { id: 2 }, { id: "c" }], links: [] },
            {
                issues: {
                    ignored: [
                        "W_SELF_LOOP:node:a:b",
                        "W_ORPHAN:edge",
                        // Not a node or edge issue, no code, not text: left out.
                        "W_X:graph:a",
                        ":node:a",
                        5,
                    ],
                    kept: [JSON.stringify(["a", 2]), "a\u0000c", "[not json", JSON.stringify({ a: 1 }), 7],
                    fixed: [{ code: "W_SELF_LOOP" }],
                    facts: { checked: 3 },
                },
            },
        );
        const { session, problems } = await opened(file);
        assert.include(leftOut(problems), "graphty-session/issues/fixed");
        const data = await savedData(session);
        const space = `source:${String(sourceOf(data).id)}`;
        assert.deepStrictEqual(data.issues, {
            ignored: [
                { code: "W_SELF_LOOP", kind: "node", name: "a:b" },
                { code: "W_ORPHAN", kind: "edge" },
            ],
            kept: [
                { from: { space, key: "a" }, to: { space, key: "2" } },
                { from: { space, key: "a" }, to: { space, key: "c" } },
            ],
        });
        assert.deepStrictEqual((sourceOf(data).metadata as JsonObject)["version-1"], { facts: { checked: 3 } });
        session.dispose();
    });

    it("writes no issues for a file whose issues it cannot read", async () => {
        for (const issues of ["none", { ignored: "x", kept: {} }]) {
            const { session } = await opened(v1File({ nodes: [{ id: "a" }], links: [] }, { issues }));
            assert.notProperty(await savedData(session), "issues");
            session.dispose();
        }
    });

    it("migrates an undirected multigraph keyed by its ends in either order, its odd ids as key text", async () => {
        const file = v1File({
            directed: false,
            graph: { title: "pairs" },
            nodes: [{ id: "b" }, { id: "a" }, { id: true }, { id: 10 }, "not a node", { id: { x: 1 } }],
            links: [
                { source: "b", target: "a", big: 2 ** 60 },
                { source: "a", target: "b", ratio: 0.5, on: true },
                { source: true, target: 10, on: false },
                { source: "a", target: "ghost" },
                42,
            ],
        });
        const { data } = migrateDocument1(file, [])?.sections as Record<string, JsonObject>;
        const graph = data.graph as JsonObject;
        assert.isFalse(graph.directed);
        assert.isTrue(graph.multigraph, "a to b twice, in either order, is one pair");
        assert.deepStrictEqual(graph.graph, { title: "pairs" });
        assert.deepStrictEqual(
            (graph.nodes as JsonObject[]).map((node) => node["graphty.key"]),
            ["b", "a", "true", "10", '{"x":1}'],
        );
        // An edge names a node by its handle in the file, or by its key when the file holds no such node.
        assert.deepStrictEqual(
            (graph.links as JsonObject[]).map((link) => [link.source, link.target]),
            [
                [0, 1],
                [1, 0],
                [2, 3],
                [1, "ghost"],
            ],
        );
        const edges = (sourceOf(data).columns as JsonObject).edges as Record<string, JsonObject>;
        assert.deepStrictEqual(edges.on, { name: "on", dtype: "bool" });
        assert.deepStrictEqual(edges.ratio, { name: "ratio", dtype: "f64" });

        // Opened, a true or an object id names no node, as a version 1 open reads it too.
        const { session } = await opened(file);
        assert.isFalse(session.status.directed);
        assert.deepStrictEqual(
            session.data.nodes().map((node) => node.id),
            ["b", "a", 10, "ghost"],
        );
        assert.strictEqual(session.status.counts.edges, 3);
        session.dispose();
    });

    it("declares an integer column beyond 32 bits f64, and writes an integer beyond 2^53 as its string", () => {
        const problems: DocumentProblem[] = [];
        const v2 = migrateDocument1(
            v1File({
                nodes: [
                    { id: "a", big: 2 ** 40, huge: 2 ** 60 },
                    { id: "b", big: 1, huge: 1 },
                ],
                links: [],
            }),
            problems,
        );
        const source = sourceOf((v2?.sections as Record<string, JsonObject>).data);
        const nodes = (source.columns as JsonObject).nodes as Record<string, JsonObject>;
        assert.strictEqual(nodes.big.dtype, "f64");
        assert.deepStrictEqual(((source.copy as JsonObject).nodes as JsonObject).huge, [BigInt(2 ** 60).toString(), 1]);
    });

    it("opens a file whose data member holds no graph as empty data", async () => {
        for (const graph of [undefined, "none", { nodes: "x", links: null }]) {
            const { session } = await opened(v1File(graph));
            assert.strictEqual(session.status.counts.nodes, 0);
            session.dispose();
        }
    });

    it("refuses a graph with more distinct columns than it migrates, and opens nothing", async () => {
        const wide = Object.fromEntries(Array.from({ length: 4097 }, (_, at) => [`c${String(at)}`, at]));
        const session = createGraphSession(ON);
        await session.data.addNodes([{ id: "kept" }]);
        let code: unknown;
        try {
            await session.project.open(JSON.stringify(v1File({ nodes: [{ id: "a", ...wide }], links: [] })), {
                migrate: true,
            });
        } catch (error) {
            ({ code } = error as { code?: unknown });
        }

        assert.strictEqual(code, "E_TOO_LARGE");
        assert.deepStrictEqual(
            session.data.nodes().map((node) => node.id),
            ["kept"],
        );
        session.dispose();
    });

    it("writes an edge-id column and the roles its known fields name only where the rows hold them", async () => {
        const file = v1File(
            {
                nodes: [{ id: "a" }, { id: "b" }],
                links: [
                    { source: "a", target: "b", eid: "e1", w: 2 },
                    { source: "a", target: "b", eid: "e2", w: 3 },
                ],
            },
            {
                config: { data: { knownFields: { edgeIdPath: "eid", edgeWeightPath: "w", nodeLabelPath: "name" } } },
            },
        );
        const { session } = await opened(file);
        const data = await savedData(session);
        const edges = (sourceOf(data).mapping as JsonObject).edges as JsonObject;
        assert.strictEqual(edges.edgeId, "eid");
        assert.strictEqual(edges.weight, "w");
        assert.notProperty((sourceOf(data).mapping as JsonObject).nodes as JsonObject, "label");
        const links = (data.graph as JsonObject).links as JsonObject[];
        assert.deepStrictEqual(
            links.map((link) => link["graphty.key"]),
            ["e1", "e2"],
        );
        session.dispose();
    });
});

describe("a version 1 run's saved result columns, migrated", () => {
    /**
     * A version 1 file of three nodes and one run whose node values are the given columns.
     * @param columns - The run's node columns.
     * @returns The run's node output as the migrated results section holds it.
     */
    function nodeOutput(columns: JsonObject): JsonObject {
        const run = {
            id: "reader:links",
            algorithm: "degree",
            fields: [{ name: "value", kind: "node", type: "number" }],
            nodes: { ids: ["a", "b", "c"], columns },
        };
        const file = v1File({ nodes: [{ id: "a" }, { id: "b" }, { id: "c" }], links: [] }, {}, [
            { kind: "graphty-results", version: 1, runs: [run] },
        ]);
        const v2 = migrateDocument1(file, []);
        const runs = (v2?.sections as Record<string, JsonObject>).results.runs as Record<string, JsonObject>;
        return Object.values(runs)[0].nodes as JsonObject;
    }

    /**
     * Little-endian numbers as base64.
     * @param values - The numbers.
     * @param width - 8 for f64, 4 for i32.
     * @returns The text.
     */
    function base64(values: number[], width: 4 | 8): string {
        const view = new DataView(new ArrayBuffer(values.length * width));
        values.forEach((value, at) =>
            width === 8 ? view.setFloat64(at * 8, value, true) : view.setInt32(at * 4, value, true),
        );
        return btoa(String.fromCodePoint(...new Uint8Array(view.buffer)));
    }

    it("decodes base64 numbers, the absent rows null, an absent index outside the column ignored", () => {
        const output = nodeOutput({
            value: { dtype: "f64", data: base64([1, 2, 3], 8), absent: [1, 7, -1, 0.5] },
            count: { dtype: "i32", data: base64([4, 5, 6], 4) },
            plain: [7, 8, 9],
        });
        const columns = output.columns as JsonObject;
        assert.deepStrictEqual(columns.value, [1, null, 3], "b is absent; 7, -1 and 0.5 name no row");
        assert.deepStrictEqual(columns.count, [4, 5, 6]);
        assert.deepStrictEqual(columns.plain, [7, 8, 9]);
        assert.lengthOf(output.refs as unknown[], 3);
    });

    it("leaves out a column of the wrong shape, dtype, encoding or length", () => {
        const output = nodeOutput({
            good: [1, 2, 3],
            short: [1, 2],
            text: "1,2,3",
            unknown: { dtype: "f16", data: base64([1, 2, 3], 4) },
            noData: { dtype: "f64" },
            notBase64: { dtype: "f64", data: "!!!" },
            ragged: { dtype: "f64", data: btoa("abcde") },
            long: { dtype: "f64", data: base64([1, 2, 3, 4], 8) },
        });
        assert.deepStrictEqual(Object.keys(output.columns as JsonObject), ["good"]);
    });
});
