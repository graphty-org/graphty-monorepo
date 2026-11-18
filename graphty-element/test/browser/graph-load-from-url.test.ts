import { afterEach, assert, beforeEach, describe, test, vi } from "vitest";

import { type GraphtyError, isGraphtyError } from "../../extend";
import { Graph } from "../../src/Graph.js";

/** The graphs the running test made, disposed after it. */
const graphs: Graph[] = [];

afterEach(() => {
    for (const graph of graphs.splice(0)) {
        graph.dispose();
    }
});

describe("Graph.loadFromUrl", () => {
    beforeEach(() => {
        // Create a fresh canvas for each test
        document.body.innerHTML = '<canvas id="test-canvas"></canvas>';
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("loads GraphML URL with extension-based detection", async () => {
        const xml =
            '<?xml version="1.0"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns"><graph><node id="n1"/></graph></graphml>';

        // Mock fetch to return GraphML content
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(xml, { status: 200 }));

        const canvas = document.getElementById("test-canvas") as HTMLCanvasElement;
        const graph = new Graph(canvas);
        graphs.push(graph);

        await graph.loadFromUrl("https://example.com/test.graphml");

        assert.strictEqual(graph.getDataManager().nodes.size, 1);
        // Verify fetch was called with the URL
        assert.strictEqual(vi.mocked(globalThis.fetch).mock.calls.length, 1);
    });

    test("loads URL with content-based detection when extension unknown", async () => {
        const xml =
            '<?xml version="1.0"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns"><graph><node id="n1"/><node id="n2"/></graph></graphml>';

        // Mock fetch to return GraphML content
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(xml, { status: 200 }));

        const canvas = document.getElementById("test-canvas") as HTMLCanvasElement;
        const graph = new Graph(canvas);
        graphs.push(graph);

        // Use .txt extension - should trigger content-based detection
        await graph.loadFromUrl("https://example.com/data.txt");

        assert.strictEqual(graph.getDataManager().nodes.size, 2);
        // Fetch should be called only once (content reused for loading)
        assert.strictEqual(vi.mocked(globalThis.fetch).mock.calls.length, 1);
    });

    test("loads JSON URL with auto-detection from content", async () => {
        const json = JSON.stringify({
            nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
            edges: [{ src: "a", dst: "b" }],
        });

        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(json, { status: 200 }));

        const canvas = document.getElementById("test-canvas") as HTMLCanvasElement;
        const graph = new Graph(canvas);
        graphs.push(graph);

        // Unknown extension - should detect JSON from content
        await graph.loadFromUrl("https://example.com/graph");

        assert.strictEqual(graph.getDataManager().nodes.size, 3);
        assert.strictEqual(graph.getDataManager().edges.size, 1);
    });

    test("supports explicit format override", async () => {
        const csv = "source,target\nn1,n2\nn2,n3";

        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(csv, { status: 200 }));

        const canvas = document.getElementById("test-canvas") as HTMLCanvasElement;
        const graph = new Graph(canvas);
        graphs.push(graph);

        // Explicitly specify CSV format even though extension is .txt
        await graph.loadFromUrl("https://example.com/data.txt", { format: "csv" });

        assert.strictEqual(graph.getDataManager().edges.size, 2);
    });

    test("throws error for unknown format", async () => {
        const unknownContent = "this is not a recognized graph format ~~~!!!";

        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(unknownContent, { status: 200 }));

        const canvas = document.getElementById("test-canvas") as HTMLCanvasElement;
        const graph = new Graph(canvas);
        graphs.push(graph);

        let errorThrown = false;
        try {
            await graph.loadFromUrl("https://example.com/data.xyz");
        } catch (error) {
            errorThrown = true;

            // See the same test in graph-load-from-file.test.ts: the refusal carries a code and a
            // list read from the catalogue rather than a sentence naming seven hard-coded names.
            assert.isTrue(isGraphtyError(error), "a failure the element reports carries a code");
            assert.strictEqual((error as GraphtyError).code, "E_UNKNOWN_FORMAT");
            assert.include(
                (error as GraphtyError).details.available as string[],
                "graphml",
                "and says what it could have read instead",
            );
        }

        assert.isTrue(errorThrown, "Should throw error for unknown format");
    });

    test("throws error for HTTP failure", async () => {
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
            new Response("Not Found", { status: 404, statusText: "Not Found" }),
        );

        const canvas = document.getElementById("test-canvas") as HTMLCanvasElement;
        const graph = new Graph(canvas);
        graphs.push(graph);

        let errorThrown = false;
        try {
            // Unknown extension forces fetch for content detection
            await graph.loadFromUrl("https://example.com/missing.txt");
        } catch (error) {
            errorThrown = true;
            assert.isTrue(isGraphtyError(error));
            assert.strictEqual((error as GraphtyError).code, "E_FETCH_FAILED");
            assert.strictEqual((error as GraphtyError).details.status, 404);
        }

        assert.isTrue(errorThrown, "Should throw error for HTTP failure");
    });

    test("does not fetch when extension is recognized", async () => {
        const xml =
            '<?xml version="1.0"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns"><graph><node id="n1"/></graph></graphml>';

        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(xml, { status: 200 }));

        const canvas = document.getElementById("test-canvas") as HTMLCanvasElement;
        const graph = new Graph(canvas);
        graphs.push(graph);

        // Use recognized extension - should pass URL to DataSource
        await graph.loadFromUrl("https://example.com/test.graphml");

        // Fetch is called once by DataSource (not twice - once for detection, once for loading)
        assert.strictEqual(fetchSpy.mock.calls.length, 1);
    });

    test("avoids double-fetch when content detection is needed", async () => {
        const xml =
            '<?xml version="1.0"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns"><graph><node id="n1"/></graph></graphml>';

        const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(xml, { status: 200 }));

        const canvas = document.getElementById("test-canvas") as HTMLCanvasElement;
        const graph = new Graph(canvas);
        graphs.push(graph);

        // Unrecognized extension - must fetch for content detection
        // But should NOT fetch again for loading (content passed as data)
        await graph.loadFromUrl("https://example.com/data.txt");

        // Should only fetch once total
        assert.strictEqual(fetchSpy.mock.calls.length, 1);
    });

    test("works with graph that has custom nodeIdPath configured", async () => {
        const json = JSON.stringify({
            nodes: [{ nodeId: "x" }, { nodeId: "y" }],
            edges: [{ src: "x", dst: "y" }],
        });

        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(json, { status: 200 }));

        const canvas = document.getElementById("test-canvas") as HTMLCanvasElement;
        const graph = new Graph(canvas);
        graphs.push(graph);

        // Configure nodeIdPath on the graph config before loading
        await graph.getSession().config.set({ data: { knownFields: { nodeIdPath: "nodeId" } } });

        await graph.loadFromUrl("https://example.com/data.json");

        // Nodes should be loaded with custom ID path
        assert.strictEqual(graph.getDataManager().nodes.size, 2);
        assert.isTrue(graph.getDataManager().nodes.has("x"));
        assert.isTrue(graph.getDataManager().nodes.has("y"));
    });
});

describe("Graph.loadFromUrl: whole-document JSON, cancel and progress", () => {
    beforeEach(() => {
        document.body.innerHTML = '<canvas id="test-canvas"></canvas>';
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function newGraph(): Graph {
        const graph = new Graph(document.getElementById("test-canvas") as HTMLCanvasElement);
        graphs.push(graph);
        return graph;
    }

    test("loads a Cytoscape.js document under the default config (issue #7017)", async () => {
        const json = JSON.stringify({
            elements: {
                nodes: [{ data: { id: "a" } }, { data: { id: "b" } }],
                edges: [{ data: { id: "ab", source: "a", target: "b" } }],
            },
        });
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(json, { status: 200 }));
        const graph = newGraph();

        await graph.loadFromUrl("https://example.com/network.cyjs.json");

        assert.strictEqual(graph.getDataManager().nodes.size, 2);
        assert.strictEqual(graph.getDataManager().edges.size, 1);
    });

    test("loads a graphology document under the default config (issue #7017)", async () => {
        const json = JSON.stringify({
            attributes: {},
            options: { type: "directed", multi: false, allowSelfLoops: true },
            nodes: [{ key: "a" }, { key: "b" }, { key: "c" }],
            edges: [{ source: "a", target: "b" }],
        });
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(json, { status: 200 }));
        const graph = newGraph();

        await graph.loadFromUrl("https://example.com/graphology.json");

        assert.strictEqual(graph.getDataManager().nodes.size, 3);
        assert.isTrue(graph.getDataManager().nodes.has("c"));
    });

    test("a signal aborted while the source fetches rejects with AbortError and keeps the graph (issue #296)", async () => {
        const graph = newGraph();
        await graph.addDataFromSource("json", { data: JSON.stringify({ nodes: [{ id: "kept" }], edges: [] }) });

        let fetched!: () => void;
        const called = new Promise<void>((resolve) => {
            fetched = resolve;
        });
        let respond!: (response: Response) => void;
        vi.spyOn(globalThis, "fetch").mockImplementation(
            () =>
                new Promise<Response>((resolve) => {
                    respond = resolve;
                    fetched();
                }),
        );

        const controller = new AbortController();
        const load = graph.loadFromUrl("https://example.com/big.json", { replace: true, signal: controller.signal });
        await called;
        controller.abort();

        const error = await load.then(
            () => null,
            (reason: unknown) => reason,
        );
        respond(new Response(JSON.stringify({ nodes: [{ id: "late" }], edges: [] }), { status: 200 }));
        assert.instanceOf(error, DOMException);
        assert.strictEqual(error.name, "AbortError");
        assert.deepEqual([...graph.getDataManager().nodes.keys()], ["kept"]);
    });

    test("a signal aborted before the call rejects at once and loads nothing (issue #296)", async () => {
        const graph = newGraph();
        const fetchSpy = vi.spyOn(globalThis, "fetch");

        const error = await graph
            .addDataFromSource("json", { url: "https://example.com/a.json" }, { signal: AbortSignal.abort() })
            .then(
                () => null,
                (reason: unknown) => reason,
            );

        assert.strictEqual((error as DOMException).name, "AbortError");
        assert.strictEqual(fetchSpy.mock.calls.length, 0);
        assert.strictEqual(graph.getDataManager().nodes.size, 0);
    });

    test("progress counts the bytes read and reaches 100 percent for a URL (issue #296)", async () => {
        const json = JSON.stringify({ nodes: [{ id: "a" }, { id: "b" }], edges: [{ source: "a", target: "b" }] });
        vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(json, { status: 200 }));
        const graph = newGraph();
        const heard: { bytesProcessed: number; totalBytes?: number; percentage?: number }[] = [];
        graph.addListener("data-loading-progress", (event) => {
            heard.push(event);
        });

        await graph.loadFromUrl("https://example.com/small.json");

        const size = new TextEncoder().encode(json).byteLength;
        assert.deepInclude(heard.at(-1), { bytesProcessed: size, totalBytes: size, percentage: 100 });
    });
});
