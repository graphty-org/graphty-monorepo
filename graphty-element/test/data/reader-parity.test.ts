/**
 * @file The element's own readers load what graph-io loads.
 *
 * Every file of graph-io's committed style corpus is loaded through `session.data.import`, as the
 * app loads it, and through graph-io's `importGraph`: the two must hold the same nodes and edges.
 * Each reader also says where every column of its import landed on its records (`readerImport`),
 * and the value there must be the value graph-io read, element by element. The record keys each
 * reader produces are pinned in `reader-parity.keys.json`, because layers, filters and saved
 * projects read them: a changed key fails here. Run with `UPDATE_READER_KEYS=1` to rewrite it.
 */

import "../../src/data/index";

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { gunzipSync } from "node:zlib";

import type { GraphSnapshot } from "@graphty/graph-format";
import { importGraph } from "@graphty/graph-io";
import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";
import { DataSource } from "../../src/data/DataSource";
import { cell, components, readerImport } from "../../src/data/graph-io-import";

const CORPUS = join(__dirname, "..", "..", "..", "graph-io", "test", "corpus", "styles");
const KEYS_FILE = join(__dirname, "reader-parity.keys.json");

/** High enough that no corpus file stops early on either side, so the two read the same elements. */
const ERROR_LIMIT = 1_000_000;

/** The element's reader for each corpus directory. */
const READERS: Readonly<Record<string, string>> = {
    cx: "cx",
    cx2: "cx2",
    cys: "cys",
    dot: "dot",
    gexf: "gexf",
    gml: "gml",
    graphml: "graphml",
    json: "json",
    pajek: "pajek",
    xgmml: "xgmml",
};

/**
 * graph-io options the element's reader sets differently from graph-io's defaults, where that
 * changes what the graph holds: the GEXF reader keeps an edge to an undeclared node and creates
 * the node, as Gephi does.
 */
const IO_OPTIONS: Readonly<Record<string, object>> = { gexf: { addMissingNodes: true } };

/**
 * Every graph file under a directory: not its SOURCES.md, and not a Cytoscape.js stylesheet
 * (`.cycss`), which holds no graph.
 * @param dir - the directory
 * @returns the paths, sorted
 */
function graphFiles(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir).sort()) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
            out.push(...graphFiles(path));
        } else if (!name.endsWith(".md") && !name.endsWith(".cycss")) {
            out.push(path);
        }
    }

    return out;
}

/**
 * A corpus file's bytes, decompressed when it is stored as `.gz`.
 * @param path - the file
 * @returns the bytes
 */
function bytesOf(path: string): Uint8Array {
    const raw = readFileSync(path);
    return new Uint8Array(path.endsWith(".gz") ? gunzipSync(raw) : raw);
}

/**
 * The edges of a snapshot one per edge of the file: a mixed-direction edge graph-io expanded into
 * two halves is one edge.
 * @param snapshot - the graph
 * @returns the edge rows, in order
 */
function logicalEdges(snapshot: GraphSnapshot): number[] {
    const pair = snapshot.edges.byRole("pair");
    const rows: number[] = [];
    for (let row = 0; row < snapshot.edgeCount; row++) {
        if (!(pair?.isSet(row) && (pair.value(row) as number) < row)) {
            rows.push(row);
        }
    }

    return rows;
}

/**
 * The value at a path of keys into a record.
 * @param record - the record
 * @param path - the keys
 * @returns the value, or undefined
 */
function at(record: unknown, path: readonly string[]): unknown {
    let value = record;
    for (const key of path) {
        if (typeof value !== "object" || value === null) {
            return undefined;
        }

        value = (value as Record<string, unknown>)[key];
    }

    return value;
}

/** What one reader yields, read directly. */
interface ReaderOutput {
    readonly source: DataSource;
    readonly nodes: Record<string, unknown>[];
    readonly edges: Record<string, unknown>[];
}

/**
 * Run a reader over a file and collect what it yields.
 * @param type - the reader
 * @param config - its configuration
 * @returns the reader and its records
 */
async function read(type: string, config: object): Promise<ReaderOutput> {
    const source = DataSource.get(type, config);
    if (source === null) {
        assert.fail(`no ${type} reader`);
    }

    const nodes: Record<string, unknown>[] = [];
    const edges: Record<string, unknown>[] = [];
    for await (const chunk of source.getData()) {
        nodes.push(...(chunk.nodes as Record<string, unknown>[]));
        edges.push(...(chunk.edges as Record<string, unknown>[]));
    }

    return { source, nodes, edges };
}

/**
 * Check that every column the reader says it kept holds graph-io's value on each record.
 * @param output - what the reader yielded
 * @returns how many values were compared
 */
async function checkValues(output: ReaderOutput): Promise<number> {
    const reader = await readerImport(output.source);
    if (reader === null) {
        assert.fail("the reader remembers its import");
    }

    const { snapshot } = reader.imported;
    const byId = new Map<unknown, Record<string, unknown>>();
    for (const node of output.nodes) {
        if (!byId.has(node.id)) {
            byId.set(node.id, node);
        }
    }

    const edgeRows = logicalEdges(snapshot);
    let compared = 0;
    for (const kind of ["node", "edge"] as const) {
        for (const column of kind === "node" ? snapshot.nodes : snapshot.edges) {
            const path = reader.path(kind, column.meta.name);
            if (path === null) {
                continue;
            }

            const rows = kind === "node" ? snapshot.nodeCount : edgeRows.length;
            for (let i = 0; i < rows; i++) {
                const row = kind === "node" ? i : edgeRows[i];
                const record = kind === "node" ? byId.get(snapshot.ids.idOf(row)) : output.edges[i];
                if (record === undefined || !column.isSet(row)) {
                    continue;
                }

                const expected = ArrayBuffer.isView(column.value(row)) ? components(column, row) : cell(column, row);
                assert.deepStrictEqual(
                    at(record, path),
                    expected,
                    `${kind} ${String(snapshot.ids.idOf(kind === "node" ? row : snapshot.edgeSource(row)))} column ${column.meta.name} at ${path.join(".")}`,
                );
                compared++;
            }
        }
    }

    return compared;
}

/**
 * The sorted keys every record of a kind carries.
 * @param records - the records
 * @returns the keys
 */
function keysOf(records: readonly Record<string, unknown>[]): string[] {
    const keys = new Set<string>();
    for (const record of records) {
        for (const key of Object.keys(record)) {
            keys.add(key);
        }
    }

    return [...keys].sort();
}

const FILES = Object.entries(READERS).flatMap(([dir, type]) =>
    graphFiles(join(CORPUS, dir)).map((path) => ({ type, path, name: relative(CORPUS, path) })),
);

/**
 * Load a document through the session and through graph-io, and return both counts.
 * @param type - the reader
 * @param data - the document
 * @param config - more reader configuration
 * @param io - more graph-io options
 * @returns the two counts
 */
async function bothCounts(
    type: string,
    data: string | Uint8Array,
    config: object = {},
    io: object = {},
): Promise<{ element: { nodes: number; edges: number }; graphIo: { nodes: number; edges: number } }> {
    const session = createGraphSession();
    await session.data.import({ type, config: { data, ...config } });
    const element = { nodes: session.data.nodes().length, edges: session.data.edges().length };
    session.dispose();
    const { snapshot } = await importGraph(data, { format: type, ...IO_OPTIONS[type], ...io });
    return { element, graphIo: { nodes: snapshot.nodeCount, edges: logicalEdges(snapshot).length } };
}

describe("files that used to load other elements than graph-io", () => {
    it("keeps a GEXF node's id when the file has an attribute titled id", async () => {
        const gexf = `<gexf xmlns="http://gexf.net/1.3" version="1.3"><graph defaultedgetype="directed">
            <attributes class="node"><attribute id="att1" title="id" type="integer"/></attributes>
            <nodes><node id="a"><attvalues><attvalue for="att1" value="0"/></attvalues></node>
            <node id="b"><attvalues><attvalue for="att1" value="1"/></attvalues></node></nodes>
            <edges><edge source="a" target="b"/></edges></graph></gexf>`;
        const { element, graphIo } = await bothCounts("gexf", gexf);
        assert.deepStrictEqual(element, graphIo);
        assert.deepStrictEqual(element, { nodes: 2, edges: 1 });

        const { nodes } = await read("gexf", { data: gexf });
        assert.deepStrictEqual(nodes, [
            { id: "a", "id#att1": 0 },
            { id: "b", "id#att1": 1 },
        ]);
    });

    it("keeps a GraphML node's id when the file has a key named id", async () => {
        const graphml = `<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
            <key id="d1" for="node" attr.name="id" attr.type="string"/>
            <graph edgedefault="directed"><node id="n0"><data key="d1">0</data></node>
            <node id="n1"><data key="d1">1</data></node><edge source="n0" target="n1"/></graph></graphml>`;
        const { element, graphIo } = await bothCounts("graphml", graphml);
        assert.deepStrictEqual(element, graphIo);
        assert.deepStrictEqual(element, { nodes: 2, edges: 1 });

        const { nodes } = await read("graphml", { data: graphml });
        assert.deepStrictEqual(nodes, [
            { id: "n0", "id#d1": "0" },
            { id: "n1", "id#d1": "1" },
        ]);
    });

    it("keeps a GEXF edge to a node the file never declared, and the node, as Gephi does", async () => {
        const gexf = `<gexf xmlns="http://gexf.net/1.3" version="1.3"><graph defaultedgetype="undirected">
            <nodes><node id="a"/><node id="b"/></nodes>
            <edges><edge source="a" target="b"/><edge source="a" target="ghost"/></edges></graph></gexf>`;
        const { element, graphIo } = await bothCounts("gexf", gexf);
        assert.deepStrictEqual(element, graphIo);
        assert.deepStrictEqual(element, { nodes: 3, edges: 2 });
    });

    it("loads the network of a session file graph-io loads, and the one chosen", async () => {
        const bytes = bytesOf(join(CORPUS, "cys", "cytoscape-tutorials-layout-v1.cys"));
        const first = await bothCounts("cys", bytes);
        assert.deepStrictEqual(first.element, first.graphIo);
        const second = await bothCounts("cys", bytes, { graphIndex: 1 }, { graphIndex: 1 });
        assert.deepStrictEqual(second.element, second.graphIo);
        assert.notDeepEqual(first.element, second.element);
    });

    it("keeps every DOT cluster as a node", async () => {
        const dot = 'digraph { subgraph cluster1 { label="a cluster"; anode } }';
        const { element, graphIo } = await bothCounts("dot", dot);
        assert.deepStrictEqual(element, graphIo);
        assert.deepStrictEqual(element, { nodes: 2, edges: 0 });
    });

    it("loads a Cytoscape.js document, its data keys flat on each record", async () => {
        const cyjs = JSON.stringify({
            elements: {
                nodes: [
                    { data: { id: "p" } },
                    { data: { id: "a", parent: "p", weight: 2 }, position: { x: 1, y: 2 }, classes: "big" },
                ],
                edges: [{ data: { id: "e", source: "a", target: "p", label: "x" } }],
            },
            style: [{ selector: "node", style: { "background-color": "red" } }],
        });
        const { element, graphIo } = await bothCounts("json", cyjs);
        assert.deepStrictEqual(element, graphIo);
        assert.deepStrictEqual(element, { nodes: 2, edges: 1 });

        const { nodes, edges } = await read("json", { data: cyjs });
        // Cytoscape.js's y points down; graph-io's, like the element's, points up.
        assert.deepInclude(nodes[1], { id: "a", parent: "p", weight: 2, position: { x: 1, y: -2, z: 0 } });
        assert.deepInclude(edges[0], { id: "e", source: "a", target: "p", label: "x" });
    });

    it("loads a graphology document's nodes, their attributes nested as the file wrote them", async () => {
        const graphology = JSON.stringify({
            options: { type: "undirected" },
            nodes: [{ key: "a", attributes: { size: 3 } }, { key: "b" }, { key: "lonely" }],
            edges: [{ source: "a", target: "b", attributes: { weight: 1 } }],
        });
        const { element, graphIo } = await bothCounts("json", graphology);
        assert.deepStrictEqual(element, graphIo);
        assert.deepStrictEqual(element, { nodes: 3, edges: 1 });

        const output = await read("json", { data: graphology });
        assert.deepStrictEqual(output.nodes[0], { id: "a", key: "a", attributes: { size: 3 } });
        const reader = await readerImport(output.source);
        assert.deepStrictEqual(reader?.path("node", "size"), ["attributes", "size"]);
    });
});

describe("the element's readers load what graph-io loads", () => {
    const keys: Record<string, { nodes: string[]; edges: string[] }> = {};

    for (const { type, path, name } of FILES) {
        it(name, async () => {
            const bytes = bytesOf(path);
            let io: GraphSnapshot | null = null;
            try {
                io = (await importGraph(bytes, { format: type, errorLimit: ERROR_LIMIT, ...IO_OPTIONS[type] }))
                    .snapshot;
            } catch {
                io = null;
            }

            const session = createGraphSession();
            let loaded: { nodes: number; edges: number } | null = null;
            try {
                await session.data.import({ type, config: { data: bytes, errorLimit: ERROR_LIMIT } });
                loaded = { nodes: session.data.nodes().length, edges: session.data.edges().length };
            } catch {
                loaded = null;
            } finally {
                session.dispose();
            }

            if (io === null) {
                // A file graph-io cannot read as a graph (a Cytoscape.js stylesheet on its own).
                assert.isNull(loaded, "the element refuses what graph-io refuses");
                return;
            }

            assert.deepStrictEqual(loaded, { nodes: io.nodeCount, edges: logicalEdges(io).length });

            const output = await read(type, { data: bytes, errorLimit: ERROR_LIMIT });
            await checkValues(output);
            keys[name] = { nodes: keysOf(output.nodes), edges: keysOf(output.edges) };
        });
    }

    it("produces the record keys it always has", () => {
        if (process.env.UPDATE_READER_KEYS === "1") {
            writeFileSync(KEYS_FILE, `${JSON.stringify(keys, null, 1)}\n`);
        }

        assert.deepStrictEqual(keys, JSON.parse(readFileSync(KEYS_FILE, "utf8")));
    });
});
