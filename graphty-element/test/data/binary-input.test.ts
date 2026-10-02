/**
 * @file Loading bytes, and choosing one graph of a file that holds several.
 *
 * WHAT THIS PROTECTS. A file is bytes. Reading it as text before the importer sees it decides its
 * encoding in the wrong place: a Latin-1 GraphML file loses every accented letter, and a zip
 * (a Cytoscape session) is corrupted beyond reading. So `data` may be a `Uint8Array` or an
 * `ArrayBuffer`, a `File` and a URL are read as bytes, and graph-io -- which reads a BOM and an
 * XML or DOT encoding declaration -- does the decoding. A format whose file can hold several
 * graphs publishes `listGraphs`, the catalogue's `listGraphs(source)` asks it, and the load
 * options `graphName` / `graphIndex` pick one.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, assert, describe, it, vi } from "vitest";

import { listGraphs } from "../../catalog";
import {
    DataSource,
    type DataSourceChunk,
    type FormatDescriptor,
    type GraphImporter,
    type ImporterReport,
    isGraphtyError,
} from "../../extend";
import { createGraphSession } from "../../session";

/** An accented word, built from its code point so the source stays ASCII. */
const CAFE = `Caf${String.fromCharCode(0xe9)}`;

const encode = (text: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(text);

/** Latin-1 bytes: one byte per code point below 256. */
const latin1 = (text: string): Uint8Array<ArrayBuffer> => Uint8Array.from(text, (char) => char.charCodeAt(0));

const GRAPHML =
    '<?xml version="1.0"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns">' +
    '<key id="l" for="node" attr.name="label" attr.type="string"/>' +
    `<graph edgedefault="directed"><node id="a"><data key="l">${CAFE}</data></node><node id="b"/>` +
    '<edge source="a" target="b"/></graph></graphml>';

const LATIN1_GRAPHML = GRAPHML.replace('<?xml version="1.0"?>', '<?xml version="1.0" encoding="ISO-8859-1"?>');

const DOCUMENTS: Record<string, string> = {
    graphml: GRAPHML,
    gexf:
        '<?xml version="1.0"?><gexf xmlns="http://gexf.net/1.3" version="1.3"><graph defaultedgetype="directed">' +
        `<nodes><node id="a" label="${CAFE}"/><node id="b"/></nodes><edges><edge id="0" source="a" target="b"/></edges>` +
        "</graph></gexf>",
    gml: `graph [ directed 1 node [ id 1 label "${CAFE}" ] node [ id 2 ] edge [ source 1 target 2 ] ]`,
    dot: `digraph { a [label="${CAFE}"]; a -> b }`,
    pajek: `*Vertices 2\n1 "${CAFE}"\n2 "b"\n*Arcs\n1 2\n`,
    csv: `source,target,label\na,b,${CAFE}\n`,
    json: `{"nodes":[{"id":"a","label":"${CAFE}"},{"id":"b"}],"edges":[{"source":"a","target":"b"}]}`,
};

/**
 * Everything one data source hands the element.
 * @param type - the registered source
 * @param config - its configuration
 * @returns the records and the errors
 */
async function read(type: string, config: object): Promise<{ chunks: DataSourceChunk[]; errors: unknown[] }> {
    const source = DataSource.get(type, config);
    assert.isNotNull(source, `"${type}" is registered`);
    const chunks: DataSourceChunk[] = [];
    for await (const chunk of source.getData()) {
        chunks.push(chunk);
    }

    return { chunks, errors: source.getErrorAggregator().getErrors() };
}

/** The graphs the lister below holds. */
const SHELF = [
    { index: 0, name: "first", nodes: 1, edges: 0 },
    { index: 1, name: "second", nodes: 2, edges: 1 },
] as const;

/** What the shelf importer was last handed. */
let handed: { input: unknown; options: Record<string, unknown> } = { input: null, options: {} };

/**
 * An importer whose files hold two graphs: "SHELF" then anything. It reads the graph
 * `graphIndex` or `graphName` names, the way graph-io's `chooseGraph` resolves them.
 */
const shelfImporter: GraphImporter = {
    format: "shelf",
    extensions: [".shelf"],
    mimeTypes: ["text/vnd.acme.shelf"],
    sniff: (head) => (new TextDecoder().decode(head).startsWith("SHELF") ? 1 : 0),
    listGraphs(input) {
        handed = { input, options: {} };
        return Promise.resolve(SHELF);
    },
    import(input, sink, options) {
        handed = { input, options: { ...options } };
        const choice = options as { graphIndex?: number; graphName?: string };
        const named = choice.graphName === "first" ? 0 : 1;
        const index = choice.graphName === undefined ? (choice.graphIndex ?? 0) : named;
        sink.addNodeRecord(index === 0 ? "only" : "x", {});
        if (index === 1) {
            sink.addEdgeRecord("x", "y", {});
        }

        const report: ImporterReport = {
            format: "shelf",
            counts: { nodes: index + 1, edges: index, skippedNodes: 0, skippedEdges: 0, expandedMixed: 0 },
            issues: [],
            errorCount: 0,
            warningCount: 0,
            truncated: false,
            lossy: [],
            durationMs: 0,
        };
        return Promise.resolve(report);
    },
};

const SHELF_DESCRIPTOR: FormatDescriptor = {
    id: "acme-shelf",
    plainName: "Acme Shelf",
    extensions: [".shelf"],
    mimeTypes: ["text/vnd.acme.shelf"],
    canImport: true,
    canExport: false,
    options: [],
};

DataSource.register(DataSource.fromImporter(shelfImporter, SHELF_DESCRIPTOR));

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("bytes in, graph-io decodes", () => {
    for (const [type, text] of Object.entries(DOCUMENTS)) {
        it(`${type}: a Uint8Array and an ArrayBuffer read exactly as the text does`, async () => {
            const asText = await read(type, { data: text });
            const bytes = encode(text);
            const asBytes = await read(type, { data: bytes });
            const asBuffer = await read(type, { data: bytes.slice().buffer });

            assert.deepEqual(asBytes, asText);
            assert.deepEqual(asBuffer, asText);
            assert.include(JSON.stringify(asText.chunks), CAFE);
        });
    }

    it("a UTF-8 byte-order mark is not part of the first value", async () => {
        const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...encode(DOCUMENTS.json)]);
        assert.deepEqual(await read("json", { data: withBom }), await read("json", { data: DOCUMENTS.json }));
    });

    it("a Latin-1 GraphML file keeps its accents, because the XML declaration is read", async () => {
        const { chunks } = await read("graphml", { data: latin1(LATIN1_GRAPHML) });
        assert.include(JSON.stringify(chunks), CAFE);
    });

    it("a Latin-1 GraphML File is read as bytes, not as UTF-8 text", async () => {
        const file = new File([latin1(LATIN1_GRAPHML)], "cafe.graphml");
        const { chunks } = await read("graphml", { file });
        assert.include(JSON.stringify(chunks), CAFE);
    });

    it("a URL is read as bytes", async () => {
        const fetch = vi.fn(() => Promise.resolve(new Response(latin1(LATIN1_GRAPHML))));
        vi.stubGlobal("fetch", fetch);
        const { chunks } = await read("graphml", { url: "https://example.org/cafe.graphml" });
        assert.include(JSON.stringify(chunks), CAFE);
        assert.strictEqual(fetch.mock.calls.length, 1);
    });

    it("an importer wrapped by fromImporter is handed the bytes, and inline text as text", async () => {
        await read("acme-shelf", { data: encode("SHELF") });
        assert.instanceOf(handed.input, Uint8Array);
        assert.strictEqual(new TextDecoder().decode(handed.input as Uint8Array), "SHELF");

        await read("acme-shelf", { data: "SHELF" });
        assert.strictEqual(handed.input as unknown, "SHELF");
    });

    it("a hand-written reader still gets text from bytes through getContent", async () => {
        class Echo extends DataSource {
            static override readonly type = "acme-echo";
            static override descriptor: FormatDescriptor = {
                ...SHELF_DESCRIPTOR,
                id: "acme-echo",
                extensions: [".echo"],
            };
            text = "";
            constructor(private readonly config: { data: Uint8Array }) {
                super();
            }

            protected getConfig(): { data: Uint8Array } {
                return this.config;
            }

            async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
                this.text = await this.getContent();
                yield* this.chunkData([], []);
            }
        }

        const echo = new Echo({ data: new Uint8Array([0xef, 0xbb, 0xbf, ...encode(CAFE)]) });
        for await (const chunk of echo.getData()) {
            assert.isDefined(chunk);
        }

        assert.strictEqual(echo.text, CAFE);
    });

    it("getBytes hands a hand-written reader the bytes undecoded, and text as UTF-8", async () => {
        const seen: Uint8Array[] = [];
        class Raw extends DataSource {
            static override readonly type = "acme-raw";
            constructor(private readonly config: { data: string | Uint8Array }) {
                super();
            }

            protected getConfig(): { data: string | Uint8Array } {
                return this.config;
            }

            async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
                seen.push(await this.getBytes());
                yield* this.chunkData([], []);
            }
        }

        const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xff, 0x00]);
        for (const data of [zip, CAFE]) {
            for await (const chunk of new Raw({ data }).getData()) {
                assert.isDefined(chunk);
            }
        }

        assert.deepEqual(seen, [zip, encode(CAFE)]);
    });

    it("a reader class whose listGraphs is not a function is refused at registration", () => {
        class Bad extends DataSource {
            static override readonly type = "acme-bad-lister";
            static override descriptor: FormatDescriptor = {
                ...SHELF_DESCRIPTOR,
                id: "acme-bad-lister",
                extensions: [".bad"],
            };
            static override listGraphs = "yes" as unknown as undefined;
            constructor(_config: object) {
                super();
            }

            protected getConfig(): object {
                return {};
            }

            async *sourceFetchData(): AsyncGenerator<DataSourceChunk, void, unknown> {
                yield* await Promise.resolve([]);
            }
        }

        try {
            DataSource.register(Bad);
            assert.fail("expected a refusal");
        } catch (error) {
            assert.strictEqual((error as { code?: string }).code, "E_BAD_COMMAND");
            assert.strictEqual((error as { details?: { field?: string } }).details?.field, "listGraphs");
        }
    });

    it("session.data.import detects the format of bytes with no type and no name", async () => {
        const session = createGraphSession();
        await session.data.import({ config: { data: latin1(LATIN1_GRAPHML) } });
        assert.strictEqual(session.data.source()?.type, "graphml");
        assert.include(JSON.stringify(session.data.nodes()), CAFE);
        session.dispose();
    });

    it("session.data.import reads a URL whose name says nothing as bytes, once", async () => {
        const fetch = vi.fn(() => Promise.resolve(new Response(latin1(LATIN1_GRAPHML))));
        vi.stubGlobal("fetch", fetch);
        const session = createGraphSession();
        await session.data.import({ config: { url: "https://example.org/download?id=7" } });
        assert.strictEqual(session.data.source()?.type, "graphml");
        assert.include(JSON.stringify(session.data.nodes()), CAFE);
        assert.strictEqual(fetch.mock.calls.length, 1);
        session.dispose();
    });

    it("the bytes are not kept with the graph's source", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "json", config: { data: encode(DOCUMENTS.json) } });
        assert.notProperty(session.data.source()?.config ?? {}, "data");
        session.dispose();
    });
});

describe("choosing one graph", () => {
    it("graphIndex and graphName reach the importer", async () => {
        await read("acme-shelf", { data: "SHELF", graphIndex: 1 });
        assert.strictEqual(handed.options.graphIndex, 1);
        assert.notProperty(handed.options, "graphName");

        await read("acme-shelf", { data: "SHELF", graphName: "second" });
        assert.strictEqual(handed.options.graphName, "second");
    });

    it("the chosen graph is the one loaded", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "acme-shelf", config: { data: "SHELF", graphName: "second" } });
        assert.lengthOf(session.data.edges(), 1);
        session.dispose();
    });

    const refuses = async (config: object, code: string): Promise<void> => {
        try {
            await read("acme-shelf", config);
        } catch (error) {
            assert.isTrue(isGraphtyError(error), String(error));
            assert.strictEqual((error as { code: string }).code, code);
            return;
        }

        assert.fail(`expected ${code}`);
    };

    it("a graphIndex that is not a non-negative integer is refused", async () => {
        await refuses({ data: "SHELF", graphIndex: -1 }, "E_OPTION_RANGE");
        await refuses({ data: "SHELF", graphIndex: 1.5 }, "E_OPTION_RANGE");
        await refuses({ data: "SHELF", graphIndex: "1" }, "E_OPTION_RANGE");
    });

    it("a graphName that is not a string is refused", async () => {
        await refuses({ data: "SHELF", graphName: 3 }, "E_OPTION_RANGE");
    });

    it("both at once are refused", async () => {
        await refuses({ data: "SHELF", graphIndex: 0, graphName: "first" }, "E_OPTION_RANGE");
    });

    it("a format whose file holds one graph refuses a choice of another, and accepts index 0", async () => {
        const graph = DataSource.get("graphml", { data: GRAPHML, graphIndex: 1 });
        assert.isNotNull(graph);
        try {
            for await (const chunk of graph.getData()) {
                assert.isDefined(chunk);
            }

            assert.fail("expected a refusal");
        } catch (error) {
            assert.strictEqual((error as { code?: string }).code, "E_OPTION_RANGE");
        }

        const { chunks } = await read("graphml", { data: GRAPHML, graphIndex: 0 });
        assert.isAbove(chunks.length, 0);
    });
});

describe("listGraphs(source)", () => {
    it("lists the graphs of inline text, bytes, an ArrayBuffer, a File and a URL", async () => {
        assert.deepEqual(await listGraphs({ type: "acme-shelf", config: { data: "SHELF" } }), SHELF);
        assert.deepEqual(await listGraphs({ config: { data: encode("SHELF") } }), SHELF);
        assert.instanceOf(handed.input, Uint8Array);
        assert.deepEqual(await listGraphs({ config: { data: encode("SHELF").buffer } }), SHELF);
        assert.deepEqual(await listGraphs({ config: { file: new File(["SHELF"], "two.shelf") } }), SHELF);

        vi.stubGlobal("fetch", () => Promise.resolve(new Response("SHELF")));
        assert.deepEqual(await listGraphs({ config: { url: "https://example.org/two.shelf" } }), SHELF);
    });

    it("answers null for a format that does not list its graphs", async () => {
        assert.isNull(await listGraphs({ config: { data: GRAPHML } }));
        assert.isNull(await listGraphs({ type: "csv", config: { data: DOCUMENTS.csv } }));
    });

    it("answers null for GML, whose file holds one graph", async () => {
        const corpus = readFileSync(join(__dirname, "..", "helpers", "corpus", "gml", "karate.gml"), "utf8");
        assert.isNull(await listGraphs({ type: "gml", config: { data: corpus } }));
    });

    it("refuses a source nothing recognises, a format nothing registered, and a source with no data", async () => {
        const codes: string[] = [];
        for (const source of [
            { config: { data: "\u0000\u0001 not a graph" } },
            { type: "no-such-format", config: { data: "x" } },
            { config: {} },
        ]) {
            try {
                await listGraphs(source);
                codes.push("resolved");
            } catch (error) {
                codes.push(isGraphtyError(error) ? error.code : String(error));
            }
        }

        assert.deepEqual(codes, ["E_UNKNOWN_FORMAT", "E_UNKNOWN_FORMAT", "E_BAD_COMMAND"]);
    });

    it("a URL that cannot be read is E_FETCH_FAILED", async () => {
        vi.stubGlobal("fetch", () => Promise.resolve(new Response("", { status: 404 })));
        try {
            await listGraphs({ config: { url: "https://example.org/missing.shelf" } });
            assert.fail("expected a refusal");
        } catch (error) {
            assert.strictEqual((error as { code?: string }).code, "E_FETCH_FAILED");
        }
    });

    it("a lister that gives up is E_PARSE_FAILED", async () => {
        const { ImportError, ImportReportBuilder } = await import("@graphty/graph-io");
        const broken: GraphImporter = {
            ...shelfImporter,
            format: "broken",
            listGraphs() {
                const report = new ImportReportBuilder("broken", 0);
                try {
                    report.fail("E_PARSE", "nothing here");
                } catch (error) {
                    return Promise.reject(error instanceof ImportError ? error : new Error(String(error)));
                }

                return Promise.resolve([]);
            },
        };
        DataSource.register(
            DataSource.fromImporter(broken, { ...SHELF_DESCRIPTOR, id: "acme-broken", extensions: [".broken"] }),
        );
        try {
            await listGraphs({ type: "acme-broken", config: { data: "x" } });
            assert.fail("expected a refusal");
        } catch (error) {
            assert.strictEqual((error as { code?: string }).code, "E_PARSE_FAILED");
        }
    });
});
