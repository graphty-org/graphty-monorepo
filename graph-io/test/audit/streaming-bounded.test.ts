/**
 * Streaming audit, boundedness lens (design section 8.4: line- and record-oriented importers read a byte stream and
 * never buffer the whole input; GEXF and GraphML are single-pass; an export is a stream of bounded chunks, never one
 * document string).
 *
 * The checks count, they do not measure: how many chunks of the input an importer has pulled when its first edge
 * reaches the builder, and how many chunks an export yields and how large the largest is. A reader that buffers the
 * whole input pulls every chunk before its first edge; a streaming one pulls the chunk that holds the edge and at most
 * one more. The heap and wall-time numbers of the same pipelines are a measurement, in benchmarks/import.bench.ts
 * (`npm run benchmark`).
 */

import { readFileSync } from "node:fs";

import { GraphBuilder, type GraphSnapshot, type NodeId } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    csvEdgeList,
    gexfDocument,
    graphmlDocument,
    neo4jNodes,
    neo4jRelationships,
    pajekNetwork,
} from "../../benchmarks/fixtures.js";
import { csvExporter, csvImporter } from "../../src/formats/csv/index.js";
import { gexfExporter, gexfImporter } from "../../src/formats/gexf/index.js";
import { graphmlExporter, graphmlImporter } from "../../src/formats/graphml/index.js";
import { jsonExporter } from "../../src/formats/json/index.js";
import { neo4jImporter } from "../../src/formats/neo4j/index.js";
import { pajekExporter, pajekImporter } from "../../src/formats/pajek/index.js";
import type { GraphExporter, GraphImporter } from "../../src/types.js";

const CHUNK = 16 * 1024;
/** The size an export's chunks are coalesced to (about 64 KiB); a chunk four times that is a buffered document. */
const EXPORT_CHUNK = 64 * 1024;

/** A builder that records how many input chunks had been pulled when its first edge arrived. */
class FirstEdgeProbe extends GraphBuilder {
    pulledAtFirstEdge = -1;

    constructor(private readonly pulled: () => number) {
        super({ directed: true, weightDtype: "f64" });
    }

    override addEdge(source: NodeId, target: NodeId, weight?: number): number {
        if (this.pulledAtFirstEdge < 0) {
            this.pulledAtFirstEdge = this.pulled();
        }
        return super.addEdge(source, target, weight);
    }
}

/** A file's bytes as CHUNK-byte chunks, and how many of them the reader has pulled so far. */
function countedChunks(bytes: Uint8Array): { chunks: AsyncIterable<Uint8Array>; pulled: () => number } {
    let pulled = 0;
    async function* chunks(): AsyncGenerator<Uint8Array, void, undefined> {
        for (let offset = 0; offset < bytes.byteLength; offset += CHUNK) {
            pulled++;
            yield bytes.subarray(offset, offset + CHUNK);
            await Promise.resolve();
        }
    }
    return { chunks: chunks(), pulled: () => pulled };
}

/**
 * Imports a file through counted chunks and checks the first edge arrived with the chunk that holds it, or the next.
 * @param importer - the importer
 * @param path - the fixture
 * @param firstEdge - the text the file's first edge starts with
 * @param edges - the file's edge count
 * @param before - reads what an earlier file gives into the builder first (Neo4j's nodes)
 */
async function expectFirstEdgeEarly(
    importer: GraphImporter,
    path: string,
    firstEdge: string,
    edges: number,
    before?: (sink: GraphBuilder) => Promise<void>,
): Promise<void> {
    const bytes = new Uint8Array(readFileSync(path));
    const offset = new TextDecoder().decode(bytes).indexOf(firstEdge);
    expect(offset).toBeGreaterThan(-1);
    const total = Math.ceil(bytes.byteLength / CHUNK);
    const holding = Math.floor(offset / CHUNK) + 1;
    // the input is many times larger than what the first edge needs, so a whole-input buffer cannot pass
    expect(total).toBeGreaterThan(holding + 20);
    const { chunks, pulled } = countedChunks(bytes);
    const probe = new FirstEdgeProbe(pulled);
    await before?.(probe);
    await importer.import(chunks, probe);
    expect(probe.edgeCount).toBe(edges);
    expect(probe.pulledAtFirstEdge, "chunks pulled when the first edge arrived").toBeLessThanOrEqual(holding + 1);
    expect(pulled()).toBe(total);
}

describe("streaming audit: an import delivers edges as their chunks arrive", () => {
    it("CSV", async () => {
        await expectFirstEdgeEarly(csvImporter, csvEdgeList(100_000, 10_000), "\n", 100_000);
    });

    it("Pajek", async () => {
        await expectFirstEdgeEarly(pajekImporter, pajekNetwork(100_000, 10_000), "*Arcs", 100_000);
    });

    it("Neo4j relationships, after their nodes", async () => {
        await expectFirstEdgeEarly(neo4jImporter, neo4jRelationships(100_000, 10_000), "\n", 100_000, async (sink) => {
            await neo4jImporter.import(readFileSync(neo4jNodes(10_000), "utf8"), sink);
            expect(sink.nodeCount).toBe(10_000);
        });
    });

    it("GraphML", async () => {
        await expectFirstEdgeEarly(graphmlImporter, graphmlDocument(20_000, 2_000), "<edge ", 20_000);
    });

    it("GEXF", async () => {
        await expectFirstEdgeEarly(gexfImporter, gexfDocument(20_000, 2_000), "<edge ", 20_000);
    });
});

describe("streaming audit: an export is a stream of bounded chunks", () => {
    let snapshot: GraphSnapshot | null = null;
    const graph = async (): Promise<GraphSnapshot> => {
        if (snapshot === null) {
            const sink = new GraphBuilder({ directed: true, weightDtype: "f64" });
            await csvImporter.import(readFileSync(csvEdgeList(100_000, 10_000), "utf8"), sink);
            snapshot = sink.freeze();
        }
        return snapshot;
    };

    it.each([
        ["csv", csvExporter],
        ["pajek", pajekExporter],
        ["graphml", graphmlExporter],
        ["gexf", gexfExporter],
        ["json", jsonExporter],
    ] as const)("%s", async (_name, exporter: GraphExporter) => {
        let bytes = 0;
        let chunks = 0;
        let largest = 0;
        for await (const chunk of exporter.export(await graph())) {
            bytes += chunk.byteLength;
            chunks++;
            largest = Math.max(largest, chunk.byteLength);
        }
        expect(bytes).toBeGreaterThan(20 * EXPORT_CHUNK);
        expect(chunks, "chunk count").toBeGreaterThanOrEqual(Math.floor(bytes / (4 * EXPORT_CHUNK)));
        expect(largest, "largest chunk").toBeLessThan(4 * EXPORT_CHUNK);
    });
});
