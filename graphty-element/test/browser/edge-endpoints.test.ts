/**
 * @file Every registered format produces edges, in a real element, and says which keys it read.
 *
 * WHY THESE LOAD THROUGH AN ELEMENT AND NOT THROUGH A DATA SOURCE. The corpus test sums
 * `chunk.nodes.length` and `chunk.edges.length` straight off the parser and compares them with a
 * manifest, so it passes for a file that produces a graph with zero edges: it stops at the parser
 * boundary, and the defect was on the other side of it. `d3-format.json`, `karate-d3.json`,
 * `miserables.json`, `networkx-format.json` and `sigma-format.json` all passed that test while
 * producing no edges at all in a running element, because the element resolved its endpoints
 * against two configured paths that defaulted to `src` and `dst` while every one of its own guides
 * taught `source` and `target`.
 *
 * The shipped symptom was the application's node inspector reporting "Expand 0 neighbors" for
 * every node of the Karate Club graph loaded from `karate.gml`, while the same node's result card
 * said 17 links. The last case in this file is that report, reproduced and then asserted.
 */
import "../../src/graphty-element";

import { assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";
import type { EndpointSpelling } from "../../src/data/endpoints";
import { isGraphtyError } from "../../src/errors";
import type { DataLoadingCompleteEvent } from "../../src/events";
import type { Graph } from "../../src/Graph";
import simpleEdgesCsv from "../helpers/corpus/csv/simple-edges.csv?raw";
import unnamedEndpointsCsv from "../helpers/corpus/csv/unnamed-endpoints.csv?raw";
import fsmDot from "../helpers/corpus/dot/fsm.gv?raw";
import lesMiserablesGexf from "../helpers/corpus/gexf/lesmiserables.gexf?raw";
import karateGml from "../helpers/corpus/gml/karate.gml?raw";
import simpleGraphml from "../helpers/corpus/graphml/simple.graphml?raw";
import karateD3Json from "../helpers/corpus/json/karate-d3.json?raw";
import unnamedEndpointsJson from "../helpers/corpus/json/unnamed-endpoints.json?raw";
import visjsJson from "../helpers/corpus/json/visjs-format.json?raw";
import simpleNet from "../helpers/corpus/pajek/simple.net?raw";

/**
 * A graph over a fresh canvas, torn down by the caller.
 * @returns the graph
 */
async function makeGraph(): Promise<Graph> {
    document.body.innerHTML = '<canvas id="endpoint-canvas"></canvas>';
    const { Graph: GraphClass } = await import("../../src/Graph.js");
    return new GraphClass(document.getElementById("endpoint-canvas") as HTMLCanvasElement);
}

/** One format's fixture: how to read it, what it should produce, and which keys it should use. */
interface FormatCase {
    /** The registered data source name. */
    readonly format: string;
    /** The file's text. */
    readonly data: string;
    /** Extra data source options; only the JSON source needs any. */
    readonly options?: Record<string, unknown>;
    /** How many edges the graph must hold afterwards. */
    readonly edges: number;
    /** Which spelling the element must report having read. */
    readonly resolvedFrom: EndpointSpelling;
}

const FORMATS: readonly FormatCase[] = [
    { format: "json", data: karateD3Json, options: { node: { path: "nodes" }, edge: { path: "links" } }, edges: 78, resolvedFrom: "source/target" },
    { format: "json", data: visjsJson, options: { node: { path: "nodes" }, edge: { path: "edges" } }, edges: 5, resolvedFrom: "from/to" },
    { format: "csv", data: simpleEdgesCsv, edges: 5, resolvedFrom: "source/target" },
    { format: "graphml", data: simpleGraphml, edges: 5, resolvedFrom: "source/target" },
    { format: "gexf", data: lesMiserablesGexf, edges: 254, resolvedFrom: "source/target" },
    { format: "gml", data: karateGml, edges: 78, resolvedFrom: "source/target" },
    { format: "dot", data: fsmDot, edges: 14, resolvedFrom: "source/target" },
    { format: "pajek", data: simpleNet, edges: 5, resolvedFrom: "source/target" },
];

describe("every registered format produces edges in a running element", () => {
    for (const fixture of FORMATS) {
        test(`${fixture.format} loads ${String(fixture.edges)} edges and says which keys named them`, async () => {
            const graph = await makeGraph();
            await graph.addDataFromSource(fixture.format, { data: fixture.data, ...fixture.options });

            const session = graph.getSession();
            assert.strictEqual(
                session.status.counts.edges,
                fixture.edges,
                `${fixture.format} produced a graph with the edges the file describes`,
            );

            const report = session.data.lastImport();
            assert.isNotNull(report);
            assert.strictEqual(report?.endpoints.resolvedFrom, fixture.resolvedFrom);
            assert.strictEqual(report?.counts.edges, fixture.edges, "the report agrees with the graph");
            graph.dispose();
        });
    }
});

describe("a file whose endpoint columns the element cannot name", () => {
    test("refuses the load and says which columns the file does carry", async () => {
        const graph = await makeGraph();

        let thrown: unknown;
        try {
            await graph.addDataFromSource("json", {
                data: unnamedEndpointsJson,
                node: { path: "nodes" },
                edge: { path: "edges" },
            });
        } catch (error) {
            thrown = error;
        }

        assert.isTrue(isGraphtyError(thrown), "an edgeless graph is a failure, not a quiet success");
        if (isGraphtyError(thrown)) {
            assert.strictEqual(thrown.code, "E_EDGE_ENDPOINTS_UNRESOLVED");
            const columns = thrown.details?.columns;
            assert.isArray(columns);
            assert.includeMembers(columns as string[], ["a", "b"], "the columns the file does have are named");
        }

        graph.dispose();
    });

    // The defect this whole release exists to end passed on one format and failed on another, so
    // the refusal is asserted on two formats too. This one needed the CSV variant detector fixed
    // first: it used to classify any header row without a source/target column as an adjacency
    // list with no header row, so `a,b,weight` never reached the element as edge records at all
    // and its header line became data.
    test("refuses a CSV whose endpoint columns are named a and b", async () => {
        const graph = await makeGraph();

        let thrown: unknown;
        try {
            await graph.addDataFromSource("csv", { data: unnamedEndpointsCsv });
        } catch (error) {
            thrown = error;
        }

        assert.isTrue(isGraphtyError(thrown), "an edgeless graph is a failure, not a quiet success");
        if (isGraphtyError(thrown)) {
            assert.strictEqual(thrown.code, "E_EDGE_ENDPOINTS_UNRESOLVED");
            const columns = thrown.details?.columns;
            assert.isArray(columns);
            assert.includeMembers(columns as string[], ["a", "b"], "the columns the file does have are named");
        }

        graph.dispose();
    });
});

describe("the rules the resolution follows, seen from outside", () => {
    test("decides once for a whole batch, and counts the records that answer a different spelling as rejected", async () => {
        const graph = await makeGraph();
        await graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }], undefined, { skipQueue: true });
        await graph.addEdges(
            [
                { source: "a", target: "b" },
                { from: "c", to: "d" },
            ],
            { skipQueue: true },
        );

        const session = graph.getSession();
        const report = session.data.lastImport();
        assert.strictEqual(report?.endpoints.resolvedFrom, "source/target", "one answer for the batch");
        assert.strictEqual(session.status.counts.edges, 1, "the from/to record is not read with a second spelling");
        assert.strictEqual(report?.counts.rejected, 1, "it is rejected, and counted");
        assert.strictEqual(report?.counts.edgeRecords, 2, "while the record count still says two arrived");
        graph.dispose();
    });

    test("does not fall back to probing when the caller named the columns itself", async () => {
        const graph = await makeGraph();
        await graph.addNodes([{ id: "a" }, { id: "b" }], undefined, { skipQueue: true });
        // Every record answers `source`/`target` perfectly well. The caller named other columns,
        // and that settles it: naming a column that is not there is a mistake the element reports
        // rather than one it quietly works around.
        await graph.addEdges([{ source: "a", target: "b" }], { source: "start", target: "end", skipQueue: true });

        const session = graph.getSession();
        assert.strictEqual(session.status.counts.edges, 0);
        assert.strictEqual(session.data.lastImport()?.counts.rejected, 1);
        assert.strictEqual(session.data.lastImport()?.endpoints.resolvedFrom, "declared");
        graph.dispose();
    });
});

describe("the two places a consumer can read what one load produced", () => {
    // The report exists because the element used to publish two numbers about one load that
    // differed by the whole file. Publishing a THIRD number that disagrees with the session's own
    // counts would be the same defect one level down, and an edge endpoint the file never declared
    // as a node is where they come apart: the builder creates that node, so the graph and
    // `session.status.counts` hold it while no render object was ever built for it.
    test("agree about how many nodes and edges the graph holds, including an endpoint the file never declared", async () => {
        const graph = await makeGraph();
        const data = JSON.stringify({
            nodes: [{ id: "a" }, { id: "b" }],
            links: [
                { source: "a", target: "b" },
                { source: "b", target: "c" },
            ],
        });

        await graph.addDataFromSource("json", { data, node: { path: "nodes" }, edge: { path: "links" } });

        const session = graph.getSession();
        const report = session.data.lastImport();
        assert.strictEqual(session.status.counts.nodes, 3, "the undeclared endpoint is a node of the graph");
        assert.strictEqual(report?.counts.nodes, session.status.counts.nodes, "and the report says so too");
        assert.strictEqual(report?.counts.edges, session.status.counts.edges, "as it does for the edges");

        // The record counts are published too, and the whole point of the two pairs of names is
        // that they are allowed to differ: the file declared two nodes and the graph holds three.
        assert.strictEqual(report?.counts.nodeRecords, 2, "the file handed over two node records");
        assert.strictEqual(report?.counts.edgeRecords, 2);
        graph.dispose();
    });

    test("tells a consumer how many nodes and edges the graph HOLDS when the load finishes", async () => {
        const graph = await makeGraph();
        const events: DataLoadingCompleteEvent[] = [];
        graph.eventManager.addListener("data-loading-complete", (event) => {
            events.push(event as DataLoadingCompleteEvent);
        });

        const data = JSON.stringify({
            nodes: [{ id: "a" }, { id: "b" }],
            links: [
                { source: "a", target: "b" },
                { source: "b", target: "c" },
            ],
        });
        await graph.addDataFromSource("json", { data, node: { path: "nodes" }, edge: { path: "links" } });

        assert.strictEqual(events.length, 1, "one completion per load");
        // Both counters on this event mean the same thing as each other and as the session's --
        // what the graph holds. `nodesLoaded` used to count the records the source handed over, so
        // a file whose edges name an undeclared node reported one fewer node than the graph had.
        assert.strictEqual(events[0].nodesLoaded, 3, "including the endpoint the file never declared");
        assert.strictEqual(events[0].edgesLoaded, 2);
        assert.strictEqual(events[0].nodesLoaded, graph.getSession().status.counts.nodes);
        graph.dispose();
    });
});

/**
 * Count one node's neighbours by hand, the way a consumer has to.
 *
 * `SessionDataApi` has no neighbour verb and deliberately none -- neighbour pages are
 * asynchronous by construction -- so the only neighbour walk in this repository is the
 * application's, which is the code the shipped bug was found in. Counting by hand here is the
 * point: it is the consumer's experience, reproduced.
 * @param graph - the loaded graph
 * @param nodeId - the node to count around
 * @returns how many distinct nodes it is joined to
 */
async function neighbourCount(graph: Graph, nodeId: string | number): Promise<number> {
    const session = graph.getSession();
    const neighbours = new Set<string | number>();

    for (const edgeId of (await session.scope.resolve("graph")).edges) {
        const edge = session.data.edge(edgeId);
        if (edge === undefined) {
            continue;
        }

        if (String(edge.source) === String(nodeId)) {
            neighbours.add(String(edge.target));
        } else if (String(edge.target) === String(nodeId)) {
            neighbours.add(String(edge.source));
        }
    }

    return neighbours.size;
}

describe("Karate Club node 34, which is the graph the shipped bug was found on", () => {
    test("has 17 neighbours when loaded from karate.gml", async () => {
        const graph = await makeGraph();
        await graph.addDataFromSource("gml", { data: karateGml });

        assert.strictEqual(await neighbourCount(graph, 34), 17, "the node inspector used to report 0 here");
        graph.dispose();
    });

    test("has 17 neighbours when loaded from karate-d3.json, the same graph in the other spelling", async () => {
        const graph = await makeGraph();
        await graph.addDataFromSource("json", {
            data: karateD3Json,
            node: { path: "nodes" },
            edge: { path: "links" },
        });

        assert.strictEqual(await neighbourCount(graph, "34"), 17);
        graph.dispose();
    });
});

describe("the declarative load path, which is how a page without any script loads a file", () => {
    /** How long the element needs to connect and finish its first update. */
    const ELEMENT_READY_MS = 300;
    /** How long a data-source assignment needs to reach the data manager and fail. */
    const LOAD_SETTLE_MS = 500;

    test("reports the refusal on its own event channel and leaves no unhandled rejection behind", async () => {
        const container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);

        const element = document.createElement("graphty-element") as Graphty;
        element.style.width = "100%";
        element.style.height = "100%";
        element.style.display = "block";
        container.appendChild(element);

        await new Promise((resolve) => setTimeout(resolve, ELEMENT_READY_MS));

        const reported: string[] = [];
        element.addEventListener("data-loading-error", (event) => {
            const { detail } = event as CustomEvent<{ error: Error & { code?: string } }>;
            reported.push(detail.error.code ?? detail.error.message);
        });

        element.dataSource = "json";
        element.dataSourceConfig = {
            data: unnamedEndpointsJson,
            node: { path: "nodes" },
            edge: { path: "edges" },
        };
        await new Promise((resolve) => setTimeout(resolve, LOAD_SETTLE_MS));

        // Setting a property hands the caller no promise to catch, so the throw the refusal
        // is made of used to escape as an unhandled rejection -- which trips a host page's
        // global error handler and a dev server's error overlay over a file the element has
        // already reported. This test fails on the REPORT if the event stops arriving, and on
        // the RUN if the rejection comes back, because an unhandled rejection fails the file.
        assert.include(reported, "E_EDGE_ENDPOINTS_UNRESOLVED", "the refusal reaches the DOM event channel");
        assert.strictEqual(element.session.status.counts.edges, 0);

        container.remove();
    });

    test("says the same thing when the records arrive through the edge-data property", async () => {
        const container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);

        const element = document.createElement("graphty-element") as Graphty;
        element.style.width = "100%";
        element.style.height = "100%";
        element.style.display = "block";
        container.appendChild(element);

        await new Promise((resolve) => setTimeout(resolve, ELEMENT_READY_MS));

        const reported: string[] = [];
        element.addEventListener("data-loading-error", (event) => {
            const { detail } = event as CustomEvent<{ error: Error & { code?: string } }>;
            reported.push(detail.error.code ?? detail.error.message);
        });

        element.nodeData = [{ id: "a" }, { id: "b" }];
        element.edgeData = [{ a: "a", b: "b" }];
        await new Promise((resolve) => setTimeout(resolve, LOAD_SETTLE_MS));

        // This path reported NOTHING: the records go straight to the data manager rather than
        // through a data source, so no error aggregator sees them, and the refusal was
        // observable only as an unhandled rejection in the page.
        assert.deepStrictEqual(
            reported,
            ["E_EDGE_ENDPOINTS_UNRESOLVED"],
            "a property assignment reports on the same channel a file load does",
        );
        assert.strictEqual(element.session.status.counts.edges, 0);

        container.remove();
    });
});
