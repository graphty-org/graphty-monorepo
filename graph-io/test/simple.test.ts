import { GraphBuilder, GraphFormatError, type GraphSnapshot } from "@graphty/graph-format";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FETCH_CODE } from "../src/common/codes.js";
import { DirectionResolver } from "../src/common/direction.js";
import { ImportReportBuilder } from "../src/common/report.js";
import { decodeChunks } from "../src/common/writer.js";
import { gexfExporter } from "../src/formats/gexf/exporter.js";
import {
    checkExport,
    createRegistry,
    downloadGraph,
    exportGraph,
    exportGraphToBlob,
    exportGraphToBytes,
    exportGraphToString,
    importGraph,
    listFormats,
    loadFromFile,
    loadFromUrl,
    registry,
    UNKNOWN_FORMAT_CODE,
} from "../src/registry.js";
import { GRAPH_FORMATS } from "../src/sniff.js";
import { type GraphExporter, ImportError } from "../src/types.js";

const CSV = "source,target\na,b\nb,c\n";
const GRAPHML =
    '<?xml version="1.0"?>\n<graphml xmlns="http://graphml.graphdrawing.org/xmlns">' +
    '<graph edgedefault="directed"><node id="a"/><node id="b"/><edge source="a" target="b"/></graph></graphml>\n';
const GML = "graph [\n  directed 0\n  node [ id 1 ]\n  node [ id 2 ]\n  edge [ source 1 target 2 ]\n]\n";

/**
 * A small directed graph.
 * @returns the snapshot
 */
function sample(): GraphSnapshot {
    const b = new GraphBuilder({ directed: true, weightDtype: "f64" });
    b.addEdge("a", "b");
    b.addEdge("b", "c");
    return b.freeze();
}

/**
 * A Response whose body is bytes, so fetch adds no Content-Type of its own.
 * @param text - the body
 * @param init - status and headers
 * @returns the response
 */
function bytesResponse(text: string, init?: ResponseInit): Response {
    return new Response(new TextEncoder().encode(text), init);
}

/**
 * Stub globalThis.fetch with a function returning the given response.
 * @param impl - the stub
 * @returns the mock, to inspect calls
 */
function stubFetch(impl: (url: string | URL, init?: RequestInit) => Promise<Response>): ReturnType<typeof vi.fn> {
    const mock = vi.fn(impl);
    vi.stubGlobal("fetch", mock);
    return mock;
}

/**
 * Run a promise that must reject and return what it rejected with.
 * @param promise - the promise
 * @returns the rejection reason
 */
async function rejection(promise: Promise<unknown>): Promise<unknown> {
    try {
        await promise;
    } catch (err) {
        return err;
    }
    throw new Error("expected a rejection");
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe("loadFromUrl", () => {
    it("detects the format from the URL's file name and passes the request settings to fetch", async () => {
        const fetchMock = stubFetch(() => Promise.resolve(bytesResponse(GML)));
        const result = await loadFromUrl("https://example.com/data/karate.gml?x=1", {
            request: { headers: { Authorization: "token" } },
        });
        expect(result.format).toBe("gml");
        expect(result.sniff?.extension).toBe(true);
        expect(result.snapshot.nodeCount).toBe(2);
        const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(init.headers).toEqual({ Authorization: "token" });
    });

    it("detects the format from the Content-Type when the URL has no extension", async () => {
        stubFetch(() =>
            Promise.resolve(bytesResponse(CSV, { headers: { "content-type": "text/csv; charset=utf-8" } })),
        );
        const result = await loadFromUrl(new URL("https://example.com/api/graph"));
        expect(result.format).toBe("csv");
        expect(result.sniff?.mimeType).toBe(true);
        expect(result.snapshot.edgeCount).toBe(2);
    });

    it("detects the format from the content alone, and accepts a relative URL", async () => {
        stubFetch(() => Promise.resolve(bytesResponse(GRAPHML)));
        const result = await loadFromUrl("/api/graph/");
        expect(result.format).toBe("graphml");
        expect(result.sniff?.extension).toBe(false);
        expect(result.sniff?.mimeType).toBe(false);
    });

    it("lets the caller's filename, mimeType and format override the response's hints", async () => {
        stubFetch(() => Promise.resolve(bytesResponse(CSV, { headers: { "content-type": "application/xml" } })));
        const named = await loadFromUrl("https://example.com/g.xml", { filename: "g.csv", mimeType: "text/csv" });
        expect(named.format).toBe("csv");
        const forced = await loadFromUrl("https://example.com/g.xml", { format: "csv" });
        expect(forced.format).toBe("csv");
        expect(forced.sniff).toBeNull();
    });

    it("passes format-specific options through to the importer", async () => {
        stubFetch(() => Promise.resolve(bytesResponse("source;target\na;b\n")));
        const result = await loadFromUrl("https://example.com/g.csv", { delimiter: ";" });
        expect(result.snapshot.edgeCount).toBe(1);
    });

    it("loads an empty body as an empty input", async () => {
        stubFetch(() => Promise.resolve(new Response(null, { status: 204 })));
        const err = await rejection(loadFromUrl("https://example.com/g.csv"));
        expect(err).toBeInstanceOf(ImportError);
    });

    it("throws E_FETCH with the status for a response outside 200-299", async () => {
        stubFetch(() => Promise.resolve(bytesResponse("missing", { status: 404, statusText: "Not Found" })));
        const err = await rejection(loadFromUrl("https://example.com/g.gml"));
        expect(err).toBeInstanceOf(ImportError);
        const importError = err as ImportError;
        expect(importError.code).toBe("E_IMPORT");
        expect(importError.issue?.code).toBe(FETCH_CODE);
        expect(importError.details.status).toBe(404);
        expect(importError.details.url).toBe("https://example.com/g.gml");
        expect(importError.message).toBe("GET https://example.com/g.gml failed: 404 Not Found");
    });

    it("throws E_FETCH with a null status and the cause for a network failure", async () => {
        const cause = new TypeError("fetch failed");
        stubFetch(() => Promise.reject(cause));
        const err = await rejection(
            loadFromUrl("https://example.com/g.gml", { format: "gml", request: { method: "POST" } }),
        );
        expect(err).toBeInstanceOf(ImportError);
        const importError = err as ImportError;
        expect(importError.issue?.code).toBe(FETCH_CODE);
        expect(importError.details.status).toBeNull();
        expect(importError.details.cause).toBe(cause);
        expect(importError.report.format).toBe("gml");
        expect(importError.message).toContain("POST https://example.com/g.gml failed: the server could not be reached");
    });

    it("names the cause of a network failure when fetch gives one", async () => {
        stubFetch(() =>
            Promise.reject(Object.assign(new TypeError("fetch failed"), { cause: new Error("getaddrinfo ENOTFOUND") })),
        );
        const err = await rejection(loadFromUrl("https://nowhere.example/g.gml"));
        expect((err as ImportError).message).toContain("(getaddrinfo ENOTFOUND)");
    });

    it("explains a relative URL outside a browser and a file: URL instead of blaming the network", async () => {
        stubFetch(() => Promise.reject(new TypeError("Failed to parse URL")));
        const relative = await rejection(loadFromUrl("got.gml"));
        expect((relative as ImportError).issue?.code).toBe(FETCH_CODE);
        expect((relative as ImportError).message).toContain("a relative URL needs a web page to resolve against");
        const file = await rejection(loadFromUrl("file:///tmp/got.gml"));
        expect((file as ImportError).message).toContain("fetch() cannot read file: URLs");
    });

    it("rethrows the abort reason unchanged and passes the import signal to fetch", async () => {
        const controller = new AbortController();
        const fetchMock = stubFetch((_url, init) => {
            controller.abort();
            return Promise.reject(init?.signal?.reason as Error);
        });
        const err = await rejection(loadFromUrl("https://example.com/g.gml", { signal: controller.signal }));
        expect(err).toBe(controller.signal.reason);
        expect((err as Error).name).toBe("AbortError");
        const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(init.signal).toBe(controller.signal);
    });

    it("rethrows the TimeoutError of AbortSignal.timeout()", async () => {
        stubFetch(
            (_url, init) =>
                new Promise((_resolve, reject) => {
                    init?.signal?.addEventListener("abort", () => {
                        reject(init.signal?.reason as Error);
                    });
                }),
        );
        const err = await rejection(loadFromUrl("https://example.com/g.gml", { signal: AbortSignal.timeout(5) }));
        expect((err as Error).name).toBe("TimeoutError");
    });

    it("rethrows an AbortError even when no signal was passed", async () => {
        const abort = new DOMException("stopped", "AbortError");
        stubFetch(() => Promise.reject(abort));
        await expect(loadFromUrl("https://example.com/g.gml")).rejects.toBe(abort);
    });

    it("throws E_UNSUPPORTED for a format that names no importer", async () => {
        stubFetch(() => Promise.resolve(bytesResponse(CSV)));
        const err = await rejection(loadFromUrl("https://example.com/g.csv", { format: "nope" }));
        expect(err).toBeInstanceOf(GraphFormatError);
        expect(err).not.toBeInstanceOf(ImportError);
        expect((err as GraphFormatError).code).toBe("E_UNSUPPORTED");
    });
});

describe("loadFromFile", () => {
    it("reads a File, using its name as the format hint", async () => {
        const file = new File([GML], "karate.gml");
        const result = await loadFromFile(file);
        expect(result.format).toBe("gml");
        expect(result.sniff?.extension).toBe(true);
    });

    it("reads a bare Blob, using its type as the format hint", async () => {
        const result = await loadFromFile(new Blob([CSV], { type: "text/csv" }));
        expect(result.format).toBe("csv");
        expect(result.sniff?.mimeType).toBe(true);
        expect(result.sniff?.extension).toBe(false);
    });

    it("reads an untyped Blob from its content, and the caller's hints win", async () => {
        expect((await loadFromFile(new Blob([GRAPHML]))).format).toBe("graphml");
        const hinted = await loadFromFile(new File([CSV], "graph.txt", { type: "text/plain" }), {
            filename: "graph.csv",
            mimeType: "text/csv",
        });
        expect(hinted.sniff?.extension).toBe(true);
        expect(hinted.sniff?.mimeType).toBe(true);
    });

    it("throws ImportError E_UNKNOWN_FORMAT when nothing recognizes the file", async () => {
        const err = await rejection(loadFromFile(new Blob(["\u0001\u0002"])));
        expect(err).toBeInstanceOf(ImportError);
        expect((err as ImportError).issue?.code).toBe(UNKNOWN_FORMAT_CODE);
    });
});

describe("exportGraphToBytes / exportGraphToBlob", () => {
    it("write the same bytes as exportGraph() and exportGraphToString()", async () => {
        const snapshot = sample();
        for (const format of ["graphml", "csv", "gexf", "json"]) {
            const bytes = await exportGraphToBytes(snapshot, format);
            const blob = await exportGraphToBlob(snapshot, format);
            const text = await exportGraphToString(snapshot, format);
            expect(new TextDecoder().decode(bytes)).toBe(text);
            expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes);
            expect(await decodeChunks(exportGraph(snapshot, format))).toBe(text);
        }
    });

    it("type the Blob with the format's first MIME type", async () => {
        const graphml = listFormats().find((f) => f.format === "graphml");
        const blob = await exportGraphToBlob(sample(), "graphml");
        expect(blob.type).toBe(graphml?.mimeTypes[0]);
        expect(blob.type).not.toBe("");
    });

    it("type the Blob application/octet-stream when the format lists no MIME type", async () => {
        const custom = createRegistry().registerExporter({ ...gexfExporter, format: "bare" });
        const blob = await custom.exportGraphToBlob(sample(), "bare");
        expect(blob.type).toBe("application/octet-stream");
    });

    it("pass the format's options through and throw E_ codes checkExport() predicts", async () => {
        const nodes = await exportGraphToString(sample(), "csv", { table: "nodes" });
        expect(new TextDecoder().decode(await exportGraphToBytes(sample(), "csv", { table: "nodes" }))).toBe(nodes);
        const b = new GraphBuilder({ directed: true });
        const direction = new DirectionResolver(b, new ImportReportBuilder("test", 10), "expand");
        direction.setHeader(true);
        direction.addEdge("a", "b", "directed");
        direction.addEdge("b", "c", "undirected");
        const mixed = b.freeze();
        const refused = checkExport(mixed, "gml").filter((n) => n.code.startsWith("E_"));
        expect(refused.length).toBeGreaterThan(0);
        const err = await rejection(exportGraphToBytes(mixed, "gml"));
        expect(err).toBeInstanceOf(GraphFormatError);
        const options = { onMixedDirection: "directed", sanitizeIds: "mangle" } as const;
        expect(checkExport(mixed, "gml", options).filter((n) => n.code.startsWith("E_"))).toEqual([]);
        expect((await exportGraphToBytes(mixed, "gml", options)).byteLength).toBeGreaterThan(0);
    });

    it("throw E_UNSUPPORTED for a format with no exporter", async () => {
        const err = await rejection(exportGraphToBlob(sample(), "nope"));
        expect((err as GraphFormatError).code).toBe("E_UNSUPPORTED");
    });
});

describe("listFormats", () => {
    it("lists every built-in format in GRAPH_FORMATS order with the registry's importer and exporter facts", () => {
        const formats = listFormats();
        expect(formats.map((f) => f.format)).toEqual([...GRAPH_FORMATS]);
        for (const info of formats) {
            expect(info.canImport).toBe(registry.hasImporter(info.format));
            expect(info.canExport).toBe(registry.hasExporter(info.format));
            expect(info.extensions).toEqual(registry.importer(info.format).extensions);
            expect(info.mimeTypes).toEqual(registry.importer(info.format).mimeTypes);
            expect(info.extensions.length).toBeGreaterThan(0);
            expect(info.capabilities).toBe(info.canExport ? registry.exporter(info.format).capabilities : null);
        }
        expect(formats.find((f) => f.format === "pajek")?.extensions).toContain(".net");
        expect(formats.find((f) => f.format === "cys")?.canExport).toBe(true);
    });

    it("takes an export-only format's extensions and MIME types from its exporter", () => {
        const exporter: GraphExporter = {
            ...gexfExporter,
            format: "mine",
            extensions: [".mine"],
            mimeTypes: ["application/x-mine"],
        };
        const bare: GraphExporter = { ...gexfExporter, format: "bare" };
        const custom = createRegistry().registerExporter(exporter).registerExporter(bare);
        const formats = custom.listFormats();
        expect(formats.slice(-2)).toEqual([
            {
                format: "mine",
                extensions: [".mine"],
                mimeTypes: ["application/x-mine"],
                canImport: false,
                canExport: true,
                capabilities: gexfExporter.capabilities,
            },
            {
                format: "bare",
                extensions: [],
                mimeTypes: [],
                canImport: false,
                canExport: true,
                capabilities: gexfExporter.capabilities,
            },
        ]);
    });
});

describe("downloadGraph", () => {
    it("throws E_UNSUPPORTED where there is no document", async () => {
        const err = await rejection(downloadGraph(sample(), "graphml"));
        expect(err).toBeInstanceOf(GraphFormatError);
        expect((err as GraphFormatError).code).toBe("E_UNSUPPORTED");
        expect((err as GraphFormatError).message).toContain("exportGraphToBytes()");
    });

    /**
     * Stub a document whose anchors record their clicks, and the object URL functions.
     * @returns the anchors created and the revoke mock
     */
    function stubDocument(): {
        anchors: { href: string; download: string; clicked: number }[];
        revoke: ReturnType<typeof vi.fn>;
    } {
        const anchors: { href: string; download: string; clicked: number }[] = [];
        vi.stubGlobal("document", {
            createElement: (tag: string) => {
                expect(tag).toBe("a");
                const anchor = {
                    href: "",
                    download: "",
                    clicked: 0,
                    click(): void {
                        anchor.clicked++;
                    },
                };
                anchors.push(anchor);
                return anchor;
            },
        });
        const revoke = vi.fn();
        vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:graph");
        vi.spyOn(URL, "revokeObjectURL").mockImplementation(revoke);
        return { anchors, revoke };
    }

    it("clicks a download link named after the format's extension and revokes the URL afterwards", async () => {
        vi.useFakeTimers();
        const { anchors, revoke } = stubDocument();
        await downloadGraph(sample(), "graphml");
        expect(anchors).toHaveLength(1);
        expect(anchors[0]).toMatchObject({ href: "blob:graph", download: "graph.graphml", clicked: 1 });
        expect(revoke).not.toHaveBeenCalled();
        vi.runAllTimers();
        expect(revoke).toHaveBeenCalledWith("blob:graph");
    });

    it("uses the caller's filename and passes the other options to the exporter", async () => {
        const { anchors } = stubDocument();
        const createSpy = vi.mocked(URL.createObjectURL);
        await downloadGraph(sample(), "csv", { filename: "nodes.csv", table: "nodes" });
        expect(anchors[0].download).toBe("nodes.csv");
        const blob = createSpy.mock.calls[0][0] as Blob;
        expect(await blob.text()).toBe(await exportGraphToString(sample(), "csv", { table: "nodes" }));
    });

    it("downloads through a registry of its own, which knows only the formats it holds", async () => {
        const { anchors } = stubDocument();
        const { FormatRegistry } = await import("../src/index.js");
        const { csvExporter } = await import("../src/formats/csv/index.js");
        const small = new FormatRegistry().registerExporter(csvExporter);
        await small.downloadGraph(sample(), "csv", { filename: "edges.csv" });
        expect(anchors[0].download).toBe("edges.csv");
        await expect(small.downloadGraph(sample(), "graphml")).rejects.toMatchObject({ code: "E_UNSUPPORTED" });
    });

    it("names the file graph.<format> when a registered format lists no extension", async () => {
        const { anchors } = stubDocument();
        registry.registerExporter({ ...gexfExporter, format: "bare-download" });
        await downloadGraph(sample(), "bare-download");
        expect(anchors[0].download).toBe("graph.bare-download");
    });
});

describe("ImportError.issue", () => {
    it("is the E_UNKNOWN_FORMAT issue when no format recognizes the input", async () => {
        const err = await rejection(importGraph("\u0001\u0002"));
        expect((err as ImportError).issue?.code).toBe(UNKNOWN_FORMAT_CODE);
    });

    it("is the parse error that stopped the import", async () => {
        const err = await rejection(importGraph("graph [ node [ id 1 ", { format: "gml" }));
        expect(err).toBeInstanceOf(ImportError);
        const importError = err as ImportError;
        expect(importError.issue).not.toBeNull();
        expect(importError.issue?.severity).toBe("error");
        expect(importError.issue?.code).toBe(importError.details.code);
        expect(importError.issue?.code.startsWith("E_")).toBe(true);
    });

    it("is the error that went over errorLimit", async () => {
        const err = await rejection(importGraph("source,target\na,\nb,\n", { format: "csv", errorLimit: 0 }));
        expect(err).toBeInstanceOf(ImportError);
        const importError = err as ImportError;
        expect(importError.details.limit).toBe(0);
        expect(importError.issue?.code).toBe(importError.details.code);
        expect(importError.issue).toBe(importError.report.issues[importError.report.issues.length - 1]);
    });

    it("falls back to the last error, or null, for an ImportError built by hand", () => {
        const base = {
            format: "probe",
            counts: { nodes: 0, edges: 0, skippedNodes: 0, skippedEdges: 0, expandedMixed: 0 },
            errorCount: 1,
            warningCount: 1,
            truncated: false,
            lossy: [],
            durationMs: 0,
        };
        const error = {
            category: "parse-error",
            severity: "error",
            code: "E_X",
            message: "x",
            line: 1,
            element: null,
        } as const;
        const warning = { ...error, severity: "warning", code: "W_Y" } as const;
        expect(new ImportError("m", { ...base, issues: [error, warning] }).issue).toBe(error);
        expect(new ImportError("m", { ...base, issues: [warning] }).issue).toBeNull();
    });
});
