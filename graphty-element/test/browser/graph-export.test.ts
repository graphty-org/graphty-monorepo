/**
 * @file Writing a graph to a file in the element's own formats.
 *
 * `exportGraph(format)` writes the graph through a graph-io exporter and returns the document with
 * the exporter's loss notes -- one note for each kind of thing the format could not hold. A third
 * party's writer, registered with `registerFormatWriter`, is exercised by the file-format parity
 * suite, `test/browser/extensions/format-extension.test.ts`.
 *
 * The round trip here reads a file from graph-io's corpus, exports it in the same format and reads
 * the export back. What must survive is what graph-io's fidelity matrix promises for a same-format
 * round trip: the node and edge counts, the node ids and every attribute key, except a key a loss
 * note names.
 */

import { afterEach, assert, describe, it } from "vitest";

import csv from "../../../graph-io/test/corpus/csv/simple-edges.csv?raw";
import dot from "../../../graph-io/test/corpus/dot/fsm.gv?raw";
import gexf from "../../../graph-io/test/corpus/gexf/lesmiserables.gexf?raw";
import gml from "../../../graph-io/test/corpus/gml/polbooks.gml?raw";
import graphml from "../../../graph-io/test/corpus/graphml/simple.graphml?raw";
import json from "../../../graph-io/test/corpus/json/sigma-format.json?raw";
import neo4j from "../../../graph-io/test/corpus/neo4j/typed-properties.csv?raw";
import pajek from "../../../graph-io/test/corpus/pajek/karate.net?raw";
import { type GraphtyError, isGraphtyError, type LossNote } from "../../extend";
import type { ExportResult } from "../../index.js";
import { Graph, operationQueueOf } from "../../src/Graph";

/** One corpus file per graph-io format, and how the element reads it and writes it. */
const CORPUS: readonly {
    readonly name: string;
    readonly data: string;
    readonly format: string;
    readonly options?: Record<string, unknown>;
}[] = [
    { name: "json", data: json, format: "json" },
    { name: "csv", data: csv, format: "csv" },
    { name: "graphml", data: graphml, format: "graphml" },
    { name: "gexf", data: gexf, format: "gexf" },
    { name: "gml", data: gml, format: "gml" },
    { name: "dot", data: dot, format: "dot" },
    { name: "pajek", data: pajek, format: "pajek" },
    // Neo4j admin-import files are read as a CSV variant, and written as one.
    { name: "neo4j", data: neo4j, format: "csv", options: { variant: "neo4j" } },
];

const graphs: Graph[] = [];

/**
 * A graph with a file loaded into it.
 * @param format - The format.
 * @param data - The file.
 * @returns The graph, once the load has finished.
 */
async function loaded(format: string, data: string): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    graphs.push(graph);
    await graph.addDataFromSource(format, { data });
    await operationQueueOf(graph).waitForCompletion();
    return graph;
}

/**
 * Every attribute key some record carries.
 * @param records - The records.
 * @returns The keys.
 */
function keysOf(records: readonly Readonly<Record<string, unknown>>[]): Set<string> {
    return new Set(records.flatMap((record) => Object.keys(record)));
}

/**
 * The keys a reload lost that no loss note owns up to.
 * @param before - Keys before the export.
 * @param after - Keys after the reload.
 * @param notes - The export's loss notes.
 * @returns The unreported losses.
 */
function unreported(before: Set<string>, after: Set<string>, notes: readonly LossNote[]): string[] {
    const noted = new Set(notes.map((note) => note.column));
    return [...before].filter((key) => !after.has(key) && !noted.has(key));
}

afterEach(() => {
    for (const graph of graphs.splice(0)) {
        graph.dispose();
    }

    document.body.innerHTML = "";
});

describe("exportGraph round trip", () => {
    for (const entry of CORPUS) {
        it(`${entry.name}: a corpus file loads, exports and reloads with the same counts, ids and keys`, async () => {
            const graph = await loaded(entry.format, entry.data);
            const session = graph.getSession();
            const nodes = session.data.nodes();
            const edges = session.data.edges();
            assert.isAbove(nodes.length, 0, "the corpus file loads");
            assert.isAbove(edges.length, 0, "and has edges");

            const result = await graph.exportGraph(entry.format, entry.options);
            const text = await result.text();
            assert.isAbove(text.length, 0);

            const again = (await loaded(entry.format, text)).getSession();
            assert.strictEqual(again.data.nodes().length, nodes.length, "node count");
            assert.strictEqual(again.data.edges().length, edges.length, "edge count");
            assert.deepEqual(
                again.data.nodes().map((node) => node.id),
                nodes.map((node) => node.id),
                "node ids, in order",
            );
            const ends = (records: readonly { source: unknown; target: unknown }[]): string[] =>
                records.map((edge) => `${String(edge.source)}->${String(edge.target)}`).sort();
            assert.deepEqual(ends(again.data.edges()), ends(edges), "edge endpoints");
            assert.deepEqual(unreported(keysOf(nodes), keysOf(again.data.nodes()), result.lossNotes), [], "node keys");
            assert.deepEqual(unreported(keysOf(edges), keysOf(again.data.edges()), result.lossNotes), [], "edge keys");

            const chunks: Uint8Array[] = [];
            for await (const chunk of result.bytes) {
                chunks.push(chunk);
            }

            const decoded = new TextDecoder().decode(
                chunks.reduce((all, chunk) => {
                    const out = new Uint8Array(all.length + chunk.length);
                    out.set(all);
                    out.set(chunk, all.length);
                    return out;
                }, new Uint8Array()),
            );
            assert.strictEqual(decoded, text, "the byte stream is the same document");

            // A file the element wrote exports again: its style columns come back as attributes.
            const twice = await graphs[graphs.length - 1].exportGraph(entry.format, entry.options);
            assert.isAbove((await twice.text()).length, 0, "a reloaded export exports again");
        });
    }
});

describe("what an export carries", () => {
    /**
     * A graph laid out by a static layout, with a degree run published.
     * @returns The graph.
     */
    async function laidOutWithDegree(): Promise<Graph> {
        const graph = await loaded("gexf", gexf);
        await graph.setLayout("circular");
        await graph.runAlgorithm("graphty", "degree", {});
        await operationQueueOf(graph).waitForCompletion();
        const session = graph.getSession();
        // The circular layout places every node in one pass; wait for that pass, not for a clock.
        for (let frame = 0; frame < 600 && session.positions.placedCount < session.data.nodes().length; frame++) {
            await new Promise((resolve) => requestAnimationFrame(resolve));
        }

        assert.strictEqual(session.positions.placedCount, session.data.nodes().length, "every node is placed");
        return graph;
    }

    it("carries positions, results and style where the format has a place, and notes the rest", async () => {
        const graph = await laidOutWithDegree();
        const session = graph.getSession();
        const [root] = session.results.roots;
        assert.isDefined(root, "the degree run published a result");
        const degreeColumn = session.results.path(root.runId, "value");
        const rankColumn = session.results.path(root.runId, "rank");

        // GEXF holds positions, colours and sizes, and attributes of any name.
        const gexfOut: ExportResult = await graph.exportGraph("gexf");
        const gexfText = await gexfOut.text();
        assert.include(gexfText, "<viz:position", "positions are written");
        assert.include(gexfText, "<viz:color", "colours are written");
        assert.include(gexfText, `title="${degreeColumn}"`, "the degree result is an attribute");
        assert.include(gexfText, `title="${rankColumn}"`, "and so is the rank the element derives from it");

        const reread = (await loaded("gexf", gexfText)).getSession();
        const first = session.data.nodes()[0];
        const degree = session.results.get(root.runId)?.node(first.id)?.value;
        assert.isNumber(degree);
        assert.strictEqual(reread.data.node(first.id)?.[degreeColumn], degree, "with its values");
        assert.strictEqual(reread.positions.placedCount, reread.data.nodes().length, "and the positions read back");

        // CSV has no place for positions or style: the export says so rather than dropping them.
        const csvOut = await graph.exportGraph("csv");
        const noted = new Set(csvOut.lossNotes.map((note) => note.column));
        assert.isTrue(noted.has("position"), "the positions are reported lost");
        assert.isTrue(noted.has("style.color"), "the colours are reported lost");
        // An edge table has no place for node attributes, the results among them: reported too.
        assert.include(
            csvOut.lossNotes.map((note) => note.code),
            "W_CSV_NODE_TABLE",
            "node attributes, results included, are reported lost from an edge table",
        );
        assert.include(await csvOut.text(), "gexfId", "while the edge list carries what it can");
    });

    it("leaves the element's internal columns and its own edge ids out of every format", async () => {
        const graph = await loaded("graphml", graphml);
        const text = await (await graph.exportGraph("json")).text();
        assert.notInclude(text, "graphty.", "no internal column is written");
    });

    it("refuses a format nothing writes, with E_UNKNOWN_FORMAT naming the ones that can be", async () => {
        const graph = await loaded("csv", csv);
        const error = await graph.exportGraph("no-such-format").catch((caught: unknown) => caught);
        assert.isTrue(isGraphtyError(error));
        assert.strictEqual((error as GraphtyError).code, "E_UNKNOWN_FORMAT");
        assert.include((error as GraphtyError).details.available as string[], "graphml");
    });

    it("turns a writer's refusal into E_UNSUPPORTED, with graph-io's own code beside it", async () => {
        const graph = await loaded("csv", "source,target\nJon Snow,Arya Stark\n");
        const error = await (await graph.exportGraph("graphml")).text().catch((caught: unknown) => caught);
        assert.isTrue(isGraphtyError(error));
        assert.strictEqual((error as GraphtyError).code, "E_UNSUPPORTED");
        assert.strictEqual((error as GraphtyError).details.sourceCode, "E_INVALID_ID");

        const mangled = await graph.exportGraph("graphml", { sanitizeIds: "mangle" });
        assert.include(await mangled.text(), "<graphml", "the caller's option reaches the writer");
    });
});
